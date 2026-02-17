from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import sys
import os
import pydantic

# [Fix] Ensure backend directory is in sys.path so strictly relative modules like 'sockets' can be imported
# even if backend is treated as a package.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sockets import manager
import concurrent.futures
from stock_data import get_simple_quote
from kis_api import KisApi
from kis_api import KisApi
from db_manager import get_db_connection
from user_session import session_manager # [NEW] User Session Manager
import sqlite3
import time

app = FastAPI(title="AI Stock Analyst", version="1.0.0")

# Force Reload Trigger 5
# CORS 설정 (Frontend인 localhost:3000 에서의 접근 허용)
origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/api/health")
def health_check():
    """
    서버 상태 확인 엔드포인트
    WebSocket 연결 문제 진단에 사용
    """
    return {
        "status": "ok",
        "service": "AI Stock Analyst Backend",
        "websocket": "available",
        "version": "1.0.0"
    }



# [NEW] Assets Endpoint (Moved to top for priority)
from stock_data import get_all_market_assets
@app.get("/api/assets")
def read_assets():
    """모든 글로벌 자산 데이터 반환"""
    data = get_all_market_assets()
    return {"status": "success", "data": data}

@app.on_event("startup")
async def startup_event():
    # Start WS Broadcast Loop
    asyncio.create_task(broadcast_stock_updates())
    
    # [KIS WebSocket Init]
    try:
        from kis_api import KisApi
        from kis_ws import KisWebSocket
        import os
        
        app_key = os.getenv("KIS_APP_KEY")
        secret = os.getenv("KIS_APP_SECRET")
        account = os.getenv("KIS_ACCOUNT")
        
        if app_key and secret:
            # 1. Get Approval Key
            temp_api = KisApi(app_key, secret, account)
            approval_key = temp_api.get_approval_key()
            
            if approval_key:
                global kis_ws_client
                kis_ws_client = KisWebSocket(approval_key)
                kis_ws_client.set_callback(handle_kis_ws_message)
                # Start connection in background so it doesn't block server startup
                asyncio.create_task(kis_ws_client.connect())
                print("[Main] KIS WebSocket Connection Initiated (Background)")
            else:
                print("[Main] Failed to get Approval Key for WS")
    except Exception as e:
        print(f"[Main] WS Init Failed: {e}")

# Global WS Client
kis_ws_client = None

# [NEW] KIS Balance Endpoint
class KisCredentials(pydantic.BaseModel):
    app_key: str
    app_secret: str
    account: str

@app.post("/api/kis/balance")
def get_kis_balance(creds: KisCredentials):
    """
    Fetch balance using user-provided credentials within the request.
    This allows multi-user support without server-side env changes.
    """
    try:
        # Create temporary instance
        api = KisApi(creds.app_key, creds.app_secret, creds.account)
        balance = api.get_balance()
        
        if balance:
            return {"status": "success", "data": balance}
        else:
            return {"status": "error", "message": "Failed to fetch balance. Check keys or account no."}
    except Exception as e:
        print(f"KIS Balance API Error: {e}")
        return {"status": "error", "message": str(e)}

async def handle_kis_ws_message(symbol, price, change_rate):
    """
    Callback from KisWebSocket.
    Broadcasts real-time data to specific symbol subscribers.
    """
    # Format data to match our frontend expectation
    # symbol from KIS might be '005930'
    # We might need to ensure it matches what frontend subscribed (e.g. '005930.KS'?)
    # KIS usually sends just raw code '005930'.
    # Our frontend maps '005930.KS' -> '005930' for display, but subscription key is '005930.KS'.
    # We need to broadcast to both '005930' and '005930.KS' to be safe.
    
    try:
        price_fmt = f"{int(price):,}" # KRW is integer usually
        change_fmt = f"{float(change_rate):.2f}%"
        
        data = {
            "symbol": symbol,
            "price": price_fmt,
            "change": change_fmt,
            "name": symbol # Optional
        }
        
        # 1. Broadcast to '005930'
        await manager.broadcast_to_symbol_public(symbol, data)
        
        # 2. Broadcast to '005930.KS' (Try adding suffix)
        await manager.broadcast_to_symbol_public(f"{symbol}.KS", data)
        # Also .KQ?
        await manager.broadcast_to_symbol_public(f"{symbol}.KQ", data)
        
    except Exception as e:
        print(f"WS Callback Error: {e}")

async def handle_user_ws_message(user_id, symbol, price, change_rate):
    """
    Callback from User-Specific KisWebSocket.
    Broadcasts real-time data to specific symbol subscribers.
    Should we broadcast to EVERYONE or just the user?
    For "Global App" feel, let's broadcast to EVERYONE watching that symbol.
    This creates a "Shared Pool" effect.
    """
    await handle_kis_ws_message(symbol, price, change_rate)

# Pro User Client Cache: user_id -> NhApi
pro_clients_cache = {}

async def broadcast_stock_updates():
    """
    Background loop to fetch and broadcast stock updates.
    [Multi-Tenant Architecture]
    [Optimized] Uses asyncio.gather and User Sessions.
    """
    global kis_ws_client  # Keep global for server-side keys (if any)

    # ThreadPool for non-blocking I/O (requests/yfinance)
    loop = asyncio.get_running_loop()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)

    while True:
        try:
            active_symbols = set(manager.subscriptions.values())
            if not active_symbols:
                await asyncio.sleep(1) 
                continue

            # [Sync User Subscriptions]
            # Ensure each user's private WS is subscribed to their symbols
            try:
                active_users = manager.get_connected_user_ids()
                for user_id in active_users:
                    if user_id in session_manager.user_websockets:
                         user_subs = manager.get_user_subscriptions(user_id)
                         for sym in user_subs:
                             # Clean symbol logic
                             target_code = None
                             if sym.isdigit() and len(sym) == 6:
                                 target_code = sym
                             elif sym.endswith('.KS') or sym.endswith('.KQ'):
                                 target_code = sym.split('.')[0]
                             
                             if target_code:
                                 await session_manager.subscribe_user_symbol(user_id, target_code)
            except Exception as e:
                print(f"[WS] User subscription sync error: {e}")

            # --- Loop A: Public Stream (Simulation / Fallback) ---
            # If a symbol is NOT being streamed by ANY KIS connection (Global or User), fetch it manually.
            # However, knowing "is it being streamed" is hard.
            # Optimization: Just fetch everything manually as fallback?
            # Or trust WS push?
            # Let's trust WS push. If we don't get WS push, frontend shows stale data?
            # Better: Fetch manually only if we suspect no one is streaming it.
            # For "Global App", let's keep the manual fetch as a "Safety Net".
            # But we must skip if we know it's being handled.
            
            # Simplified Logic:
            # 1. Check if Global KIS is connected.
            # 2. Check if ANY User KIS is connected.
            # If NO KIS connections at all, definitely fetch.
            # If KIS connections exist, assume they handle it?
            
            # Robust Logic: Always fetch "Safety Net" data at slower rate?
            # Or just fetch normally. WS updates will overwrite it with faster data.
            # This is safest.
            
            symbols_to_fetch = []
            for symbol in active_symbols:
                # Basic check: is it a Korean stock?
                is_korean = (symbol.isdigit() and len(symbol) == 6) or symbol.endswith('.KS') or symbol.endswith('.KQ')
                
                # If we have *reliable* WS (Global or User), maybe skip?
                # But "User" WS only covers that User's symbols.
                # If User A watches Samsung (WS), and User B watches Samsung (No Keys).
                # User A's WS callback broadcasts to Public. So User B gets it.
                # So if *anyone* is streaming it, we are good.
                
                # How to check if *anyone* is streaming 'symbol'?
                # Iterate all user sessions? Expensive.
                # Let's just run the manual fetch for now. It's a "Global" fetch (scraping/yahoo).
                # It won't hurt, just redundant.
                
                symbols_to_fetch.append(symbol)

            # 2. Fetch in Parallel
            if symbols_to_fetch:
                tasks = []
                for symbol in symbols_to_fetch:
                    # Run synchronously in thread pool
                    tasks.append(loop.run_in_executor(executor, get_simple_quote, symbol))
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for i, result in enumerate(results):
                    symbol = symbols_to_fetch[i]
                    if isinstance(result, Exception):
                        pass
                    elif result:
                        try:
                            await manager.broadcast_to_symbol_public(symbol, result)
                        except Exception as broadcast_error:
                            print(f"[WS] Broadcast error for {symbol}: {broadcast_error}")

            # [Optimization] 1 Second Interval for "Real-time" feel
            await asyncio.sleep(1) 
            
        except Exception as e:
            print(f"Broadcast Loop Error: {e}")
            import traceback
            traceback.print_exc()
            await asyncio.sleep(5)



@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "AI Stock Analyst API Backend is running.",
        "version": "1.0.0"
    }

from stock_data import get_stock_info, get_simple_quote, get_market_data, get_market_news, calculate_technical_sentiment, get_insider_trading, get_macro_calendar, get_all_assets, fetch_google_news
from ai_analysis import analyze_stock, generate_market_briefing, analyze_portfolio, analyze_theme, analyze_earnings_impact, analyze_supply_chain, analyze_chart_patterns, analyze_trading_log
from rank_data import get_realtime_top10
from risk_monitor import check_portfolio_risk
from backtest import run_backtest
from portfolio_opt import optimize_portfolio
from alerts import (
    add_alert, get_alerts, delete_alert, check_alerts,
    get_recent_telegram_users
)
from chatbot import chat_with_ai
from korea_data import (
    get_naver_disclosures, get_naver_market_index_data, get_ipo_data, 
    get_live_investor_estimates, get_indexing_status, search_stock_code,
    get_korean_market_indices, get_top_sectors, get_theme_heatmap_data,
    get_market_investors, get_index_chart_data
)
from db_manager import save_analysis_result, get_score_history, add_watchlist, remove_watchlist, get_watchlist, cast_vote, get_vote_stats, get_prediction_report
from pydantic import BaseModel, Field
from typing import Optional

import urllib.parse
import time
import threading

@app.get("/api/system/status")
def read_system_status():
    """시스템 상태 확인 (주식 인덱싱 진행률 등)"""
    indexing_status = get_indexing_status()
    return {
        "status": "success",
        "data": {
            "indexing": indexing_status,
            "server_time": time.time()
        }
    }

@app.get("/api/korea/indices")
def read_korea_indices():
    """국내 지수 (KOSPI, KOSDAQ, KOSPI200)"""
    data = get_korean_market_indices()
    return {"status": "success", "data": data}

@app.get("/api/korea/sectors")
def read_korea_sectors():
    """국내 업종 상위"""
    data = get_top_sectors()
    return {"status": "success", "data": data}

@app.get("/api/korea/heatmap")
def read_korea_heatmap():
    """테마 히트맵 데이터"""
    data = get_theme_heatmap_data()
    return {"status": "success", "data": data}

@app.get("/api/korea/investors")
def read_korea_investors():
    """국내 증시 투자자 동향 (지수 + 수급)"""
    # 1. Get Base Indices
    indices = get_korean_market_indices()
    
    # 2. Get Investor Breakdown (Mock/Real)
    investors = get_market_investors()
    
    # 3. Merge
    if "kospi" in indices and "kospi" in investors:
        indices["kospi"]["investors"] = investors["kospi"]
        
    if "kosdaq" in indices and "kosdaq" in investors:
        indices["kosdaq"]["investors"] = investors["kosdaq"]
        
    return {
        "status": "success",
        "data": {
            "market_summary": indices,
            "investor_items": [] # Fallback
        }
    }

@app.get("/api/korea/chart/{symbol}")
def read_korea_chart(symbol: str):
    """지수 차트 데이터"""
    data = get_index_chart_data(symbol)
    return {"status": "success", "data": data}


@app.get("/api/stock/{symbol}/investors/live")
def read_live_investors(symbol: str):
    """장중 잠정 투자자 동향 (라이브)"""
    symbol = urllib.parse.unquote(symbol)
    data = get_live_investor_estimates(symbol)
    if data:
        return {"status": "success", "data": data}
    else:
        return {"status": "error", "message": "Failed to fetch live investor data"}



@app.get("/api/report/prediction")
def read_prediction_report():
    """지난 AI 예측 적중률 리포트"""
    report = get_prediction_report()
    return {"status": "success", "data": report}

@app.get("/api/stock/{symbol}")
def read_stock(symbol: str, skip_ai: bool = False):
    import urllib.parse
    # URL 인코딩 해제 (한글 종목명 처리)
    symbol = urllib.parse.unquote(symbol).strip()
    data = get_stock_info(symbol)

    if data:
        # AI 분석 실행 (skip_ai가 False일 때만)
        if not skip_ai:
            try:
                ai_result = analyze_stock(data)
                
                # 분석 결과를 기존 데이터에 병합 (점수, 코멘트 업데이트)
                data.update({
                    "score": ai_result.get("score", 50),
                    "metrics": ai_result.get("metrics", {"supplyDemand": 50, "financials": 50, "news": 50}),
                    "summary": ai_result.get("analysis_summary", data["summary"]),
                    "strategy": ai_result.get("strategy", {}),
                    "rationale": ai_result.get("rationale", {}),
                    "related_stocks": ai_result.get("related_stocks", [])
                })
            except Exception as e:
                print(f"AI Analysis Failed: {e}")
                # AI 분석 실패해도 기본 데이터는 반환

        # 분석 결과 DB 저장 (히스토리용)
        # AI 분석을 안 했으면(skip_ai=True) 저장을 할지 말지 결정해야 하는데, 
        # 일단은 읽기 전용이므로 저장 안 하거나, 점수 없이 저장될 수 있음. 
        # 여기서는 skip_ai=False일 때만 저장하는 게 맞아 보이나, 기존 로직 유지.
        if not skip_ai:
            save_analysis_result(data)
        
        return {"status": "success", "data": data}
    else:
        return {"status": "error", "message": f"Stock not found or error fetching data for '{symbol}'"}

@app.get("/api/stock/search")
def search_stock_api(q: str):
    """Search for stock by name or code (Global Map)"""
    if not q:
        return {"status": "error", "message": "Query parameter 'q' is required"}
        
    result = search_stock_code(q)
    if result:
        return {"status": "success", "data": result}
    else:
        return {"status": "error", "message": f"No stock found for '{q}'"}

@app.get("/api/quote/{symbol}")
def read_quote(symbol: str):
    """AI 분석 없이 시세만 빠르게 조회"""
    symbol = urllib.parse.unquote(symbol)
    data = get_simple_quote(symbol)
    if data:
        return {"status": "success", "data": data}
    else:
        # 실패 시 에러보다는 빈 데이터 반환하여 UI가 죽지 않게
        return {"status": "error", "message": "Failed to fetch quote"}

@app.get("/api/stock/{symbol}/history")
def read_stock_history(symbol: str):
    """특정 종목의 AI 분석 점수 히스토리 반환"""
    history = get_score_history(symbol)
    return {"status": "success", "data": history}

@app.get("/api/stock/{symbol}/backtest")
def read_backtest(symbol: str, period: str = "1y", initial_capital: int = 10000):
    """특정 종목의 백테스팅(SMA Crossover) 실행"""
    result = run_backtest(symbol, period=period, initial_capital=initial_capital)
    
    if "error" in result:
        return {"status": "error", "message": result["error"]}
        
    return {"status": "success", "data": result}

@app.get("/api/stock/{symbol}/disclosures")
def read_disclosures(symbol: str):
    """Get DART disclosures for Korean stocks"""
    try:
        from dart_disclosure import get_dart_disclosures
        
        # Clean symbol (remove .KS, .KQ suffixes)
        clean_symbol = symbol.replace('.KS', '').replace('.KQ', '')
        
        disclosures = get_dart_disclosures(clean_symbol)
        
        if disclosures:
            return {"status": "success", "data": disclosures}
        else:
            return {"status": "success", "data": []}
            
    except Exception as e:
        print(f"Disclosure API error: {e}")
        return {"status": "error", "message": f"Failed to fetch disclosures: {str(e)}"}

class PortfolioRequest(BaseModel):
    symbols: list[str] = Field(..., min_items=2)

@app.post("/api/portfolio/optimize")
def create_portfolio_optimization(req: PortfolioRequest):
    """주어진 종목들로 최적의 포트폴리오 비중 계산"""
    result = optimize_portfolio(req.symbols)
    if "error" in result:
        return {"status": "error", "message": result["error"]}
    
    # AI 닥터 리포트 추가
    doctor_note = analyze_portfolio(result['allocation'])
    result['doctor_note'] = doctor_note
    
    return result

class AlertRequest(BaseModel):
    symbol: str
    target_price: float
    condition: str = "above" # above or below
    chat_id: str = None # [New] Optional Telegram Chat ID

@app.get("/api/alerts")
def read_alerts():
    """저장된 모든 알림 반환"""
    return {"status": "success", "data": get_alerts()}



@app.get("/api/theme/{keyword}")
async def read_theme(keyword: str):
    """테마 키워드 분석 (실시간 시세 포함)"""
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    def _analyze_theme_sync():
        """Synchronous wrapper for theme analysis"""
        result = analyze_theme(keyword)
        
        if result:
            # [New] 대장주(Leaders) 및 관련주(Followers) 실시간 시세 업데이트
            all_stocks = result.get("leaders", []) + result.get("followers", [])
            
            for stock in all_stocks:
                try:
                    sym = stock.get("symbol")
                    if sym:
                        # 기호 보정 (AI가 가끔 이상하게 줄 때 대비)
                        if sym.isdigit() and len(sym) == 6:
                            sym += ".KS"
                            
                        q = get_simple_quote(sym)
                        if q:
                            stock["price"] = q.get("price", "N/A")
                            stock["change"] = q.get("change", "0")
                            stock["change_percent"] = q.get("change_percent", "0%")
                        else:
                            stock["price"] = "-"
                            stock["change"] = "-"
                            stock["change_percent"] = "-"
                except Exception as e:
                    print(f"Theme Price Fetch Error for {stock.get('symbol')}: {e}")
                    stock["price"] = "-"
                    stock["change"] = "-"
                    stock["change_percent"] = "-"
        
        return result
    
    try:
        # Run with 30-second timeout
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _analyze_theme_sync),
                timeout=30.0
            )
        
        if result:
            return {"status": "success", "data": result}
        else:
            return {"status": "error", "message": "Failed to analyze theme"}
            
    except asyncio.TimeoutError:
        print(f"[ERROR] Theme analysis timed out for keyword: {keyword}")
        return {
            "status": "error", 
            "message": "분석 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
        }
    except Exception as e:
        print(f"[ERROR] Theme analysis failed: {e}")
        return {
            "status": "error",
            "message": f"테마 분석 중 오류가 발생했습니다: {str(e)}"
        }

class VoteRequest(BaseModel):
    symbol: str
    vote_type: str # UP or DOWN

@app.post("/api/vote")
def create_vote(req: VoteRequest):
    """사용자 투표 (Sentiment Battle)"""
    cast_vote(req.symbol, req.vote_type)
    return {"status": "success"}

@app.get("/api/vote/{symbol}")
def read_vote_stats(symbol: str):
    """투표 현황 조회"""
    stats = get_vote_stats(symbol)
    return {"status": "success", "data": stats}

@app.delete("/api/alerts/{alert_id}")
def remove_alert(alert_id: int):
    """알림 삭제"""
    delete_alert(alert_id)
    return {"status": "success"}

@app.get("/api/alerts/check")
def trigger_check_alerts():
    """알림 조건 확인 (트리거된 알림 반환)"""
    triggered = check_alerts()
    return {"status": "success", "data": triggered}

@app.get("/api/telegram/recent-users")
def read_recent_telegram_users():
    """최근 봇과 대화한 사용자 목록 반환"""
    users = get_recent_telegram_users()
    return {"status": "success", "data": users}

from auth import router as auth_router
app.include_router(auth_router, prefix="/api")

class WatchlistRequest(BaseModel):
    symbol: str

from fastapi import Header

@app.get("/api/watchlist")
def read_watchlist(x_user_id: str = Header(None)):
    """관심 종목 리스트 반환 (헤더 X-User-ID 필수)"""
    user_id = x_user_id if x_user_id else "guest"
    symbols = get_watchlist(user_id)
    
    # [New] Enrich with Names
    from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
    
    data = []
    for sym in symbols:
        name = sym # default
        
        # 1. Try Korea Data Map
        kor_name = get_korean_stock_name(sym)
        if kor_name:
            name = kor_name
        
        # 2. Try Global Map
        elif sym in GLOBAL_KOREAN_NAMES:
            name = GLOBAL_KOREAN_NAMES[sym]
            
        data.append({"symbol": sym, "name": name})
        
    return {"status": "success", "data": data}

@app.post("/api/watchlist")
def create_watchlist(req: WatchlistRequest, x_user_id: str = Header(None)):
    """관심 종목 추가"""
    user_id = x_user_id if x_user_id else "guest"
    success = add_watchlist(user_id, req.symbol)
    return {"status": "success" if success else "error"}

@app.delete("/api/watchlist/{symbol}")
def delete_watchlist(symbol: str, x_user_id: str = Header(None)):
    """관심 종목 삭제"""
    user_id = x_user_id if x_user_id else "guest"
    remove_watchlist(user_id, symbol)
    return {"status": "success"}


@app.delete("/api/watchlist")
def clear_all_watchlist(x_user_id: str = Header(None)):
    """관심 종목 전체 삭제"""
    from db_manager import clear_watchlist
    user_id = x_user_id if x_user_id else "guest"
    clear_watchlist(user_id)
    return {"status": "success"}

@app.get("/api/watchlist/closing-summary")
def read_watchlist_closing_summary(x_user_id: str = Header(None)):
    """관심 종목의 장 마감 시세 요약"""
    from stock_data import get_simple_quote, get_korean_stock_name, GLOBAL_KOREAN_NAMES
    
    user_id = x_user_id if x_user_id else "guest"
    symbols = get_watchlist(user_id)
    
    summary_data = []
    for sym in symbols:
        try:
             # 기호 보정
             enc_sym = sym
             if sym.isdigit() and len(sym) == 6:
                  enc_sym += ".KS"
             
             quote = get_simple_quote(enc_sym)
             if not quote:
                  continue
             
             # Name Logic
             name = quote.get("name", sym)
             kor_name = get_korean_stock_name(sym)
             if kor_name:
                  name = kor_name
             elif sym in GLOBAL_KOREAN_NAMES:
                  name = GLOBAL_KOREAN_NAMES[sym]
                  
             summary_data.append({
                 "symbol": sym,
                 "name": name,
                 "price": quote.get("price"),
                 "change": quote.get("change"),
                 "currency": quote.get("currency", "KRW") 
             })
        except Exception as e:
             print(f"Closing Summary Error for {sym}: {e}")
             
    return {"status": "success", "data": summary_data}

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    """AI 주식 상담 챗봇"""
    response = chat_with_ai(req.message)
    return {"status": "success", "reply": response}

@app.get("/api/korea/disclosure/{symbol}")
def read_korea_disclosure(symbol: str):
    """한국 주식 전자공시 조회 (네이버 금융)"""
    symbol = urllib.parse.unquote(symbol)
    data = get_naver_disclosures(symbol)
    return {"status": "success", "data": data}

import json
import os

# Dashboard Cache
dashboard_cache = {
    "data": None,
    "timestamp": 0
}
CACHE_DURATION = 5 # seconds
CACHE_FILE_PATH = "dashboard_cache.json"

def ranking_bg_looper():
    """Background task to keep top 10 ranking cache warm"""
    print("Starting ranking background updater...")
    while True:
        try:
            # KR, US 순차 업데이트
            get_realtime_top10("KR", refresh=True)
            time.sleep(2) # API 부하 분산
            get_realtime_top10("US", refresh=True)
        except Exception as e:
            print(f"Ranking Background Update Error: {e}")
        time.sleep(20) # 20초마다 갱신

@app.on_event("startup")
def start_background_tasks():
    # Keep only ranking background updater
    t_rank = threading.Thread(target=ranking_bg_looper, daemon=True)
    t_rank.start()

@app.get("/api/korea/chart/{symbol}")
def get_korea_chart(symbol: str):
    from korea_data import get_index_chart_data
    data = get_index_chart_data(symbol)
    return {"status": "success", "data": data}

@app.get("/api/market")
def read_market():
    """주요 지수(S&P500 등) 데이터 반환"""
    data = get_market_data()
    return {"status": "success", "data": data}

@app.get("/api/assets")
def read_all_assets():
    """모든 자산군(주식, 코인, 환율 등)의 시세 반환"""
    data = get_all_assets()
    return {"status": "success", "data": data}

@app.get("/api/market/calendar")
def read_market_calendar():
    """경제 캘린더 데이터 반환"""
    data = get_macro_calendar()
    return {"status": "success", "data": data}

@app.get("/api/earnings/{symbol}")
def read_earnings_whisper(symbol: str):
    """실적 발표 알리미 (Earnings Whisper)"""
    # 1. 뉴스 검색 (Earnings 키워드 포함)
    query = f"{symbol} earnings report analysis"
    news = fetch_google_news(query, lang='en')
    
    # 2. AI 분석
    result = analyze_earnings_impact(symbol, news)
    
    if not result:
        return {"status": "error", "message": "Failed to analyze earnings"}
        
    return {"status": "success", "data": result}

@app.get("/api/supply-chain/{symbol}")
def read_supply_chain(symbol: str):
    """글로벌 공급망 (Value Chain) 지도 데이터 반환"""
    data = analyze_supply_chain(symbol)
    if not data:
        return {"status": "error", "message": "Failed to analyze supply chain"}
    return {"status": "success", "data": data}

@app.get("/api/supply-chain/scenario/{keyword}")
def read_supply_chain_scenario(keyword: str, symbol: str = None):
    """나비효과 시뮬레이터 (Butterfly Effect)"""
    from ai_analysis import analyze_supply_chain_scenario
    import urllib.parse
    
    keyword = urllib.parse.unquote(keyword)
    data = analyze_supply_chain_scenario(keyword, target_symbol=symbol)
    
    if not data:
        return {"status": "error", "message": "Failed to analyze scenario"}
    return {"status": "success", "data": data}

@app.get("/api/chart/patterns/{symbol}")
def read_chart_patterns(symbol: str):
    """AI 차트 패턴 및 지지/저항선 분석"""
    try:
        from chart_analysis import get_chart_analysis_full
        data = get_chart_analysis_full(symbol)
        if not data:
            return {"status": "error", "message": "Failed to analyze chart patterns"}
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Chart Analysis Error: {e}")
        return {"status": "error", "message": str(e)}



@app.get("/api/rank/movers/{market}")
def read_market_movers(market: str):
    """
    실시간 급등/급락 랭킹 (Top 5 Gainers/Losers)
    market: 'KR' or 'US'
    """
    from rank_data import get_market_movers
    try:
        data = get_market_movers(market.upper())
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Movers API Error: {e}")
        return {"status": "error", "message": str(e), "data": {"gainers": [], "losers": []}}

class CoachRequest(BaseModel):
    log_text: str

@app.post("/api/coach")
def create_coach_advice(req: CoachRequest):
    """AI 매매 코치 조언 생성"""
    advice = analyze_trading_log(req.log_text)
    return {"status": "success", "data": advice}

@app.get("/api/briefing")
def read_briefing():
    """시장 브리핑 및 AI 요약 반환"""
    market_data = get_market_data()
    news_data = get_market_news()
    
    # 기술적 지표 점수 산출
    tech_score = calculate_technical_sentiment("^GSPC") # S&P500 기준
    
    # AI 요약 생성 (기술적 점수 반영)
    briefing = generate_market_briefing(market_data, news_data, tech_score)
    
    # 브리핑 데이터에 기술적 점수도 별도로 포함해서 보낼 수 있음 (디버깅용)
    briefing["tech_score"] = tech_score
    
    return {
        "status": "success", 
        "data": {
            "briefing": briefing,
            "market": market_data,
            "news": news_data
        }
    }

@app.get("/api/risk")
def read_risk():
    """포트폴리오 위험 모니터링 데이터 반환"""
    # 데모를 위해 고정된 종목 리스트 사용 (추후 사용자 설정 연동 가능)
    data = check_portfolio_risk(["TSLA", "NVDA", "AAPL", "AMZN", "GOOGL", "AMD", "PLTR"])
    return {"status": "success", "data": data}


from stock_data import get_market_status, get_all_market_assets, get_macro_calendar
from korea_data import (
    get_korean_market_indices,
    get_top_sectors,
    get_top_themes,
    get_market_investors,
    get_theme_heatmap_data,
    get_naver_disclosures,
    get_ipo_data
)
from ai_analysis import diagnose_portfolio_health


@app.get("/api/korea/indices")
def read_korea_indices():
    """국내 증시 지수 (코스피/코스닥/200)"""
    data = get_korean_market_indices()
    return {"status": "success", "data": data}

@app.get("/api/korea/sectors")
def read_korea_sectors():
    """업종 상위"""
    data = get_top_sectors()
    return {"status": "success", "data": {"top_sectors": data}}

@app.get("/api/korea/themes")
def read_korea_themes():
    """테마 상위 (사용 여부 확인 필요, 보통 heatmap이 대체)"""
    data = get_top_themes()
    return {"status": "success", "data": {"top_themes": data}}

@app.get("/api/korea/investors")
def read_korea_investors():
    """투자자별 매매동향"""
    data = get_market_investors()
    return {"status": "success", "data": data}

@app.get("/api/korea/heatmap")
def read_korea_heatmap():
    """테마 히트맵"""
    data = get_theme_heatmap_data()
    return {"status": "success", "data": data}

@app.get("/api/korea/chart/{symbol}")
def read_korea_chart(symbol: str):
    """지수/종목 미니 차트 데이터 (Mock)"""
    # Simply return mock line data for now
    import random
    mock_data = [{"date": i, "close": 2000 + random.randint(-50, 50)} for i in range(20)]
    return {"status": "success", "data": mock_data}


from rank_data import get_realtime_top10

@app.get("/api/rank/top10/{market}")
def read_rank_top10(market: str):
    """실시간 시총 상위 10 (KR/US)"""
    market = market.upper()
    data = get_realtime_top10(market)
    return {"status": "success", "data": data}




@app.get("/api/market/status")
def read_market_status():
    """시장 신호등 상태 반환"""
    status = get_market_status()
    return {"status": "success", "data": status}

@app.get("/api/korea/ipo")
def read_ipo_calendar():
    """한국 IPO 일정 조회"""
    data = get_ipo_data()
    return {"status": "success", "data": data}

class DiagnosisRequest(BaseModel):
    portfolio: list[str]

@app.post("/api/portfolio/diagnosis")
def create_portfolio_diagnosis(req: DiagnosisRequest):
    """내 계좌 건강검진 (AI 진단)"""
    result = diagnose_portfolio_health(req.portfolio)
    return {"status": "success", "data": result}


# ============================================================
# Average Down Calculator (물타기 계산기)
# ============================================================

from average_down import (
    calculate_average_down,
    calculate_multiple_scenarios,
    calculate_optimal_ratio
)

class AverageDownRequest(BaseModel):
    current_shares: int = Field(..., gt=0, description="현재 보유 주식 수")
    current_avg_price: float = Field(..., gt=0, description="현재 평단가")
    current_price: float = Field(..., gt=0, description="현재 시장가")
    additional_amount: float = Field(..., gt=0, description="추가 투자 금액")

class MultipleScenariosRequest(BaseModel):
    current_shares: int = Field(..., gt=0)
    current_avg_price: float = Field(..., gt=0)
    current_price: float = Field(..., gt=0)
    max_budget: float = Field(..., gt=0, description="최대 예산")
    num_scenarios: int = Field(default=5, ge=3, le=10, description="시나리오 개수")

class OptimalRatioRequest(BaseModel):
    current_shares: int = Field(..., gt=0)
    current_avg_price: float = Field(..., gt=0)
    current_price: float = Field(..., gt=0)
    target_breakeven_rate: float = Field(default=5.0, gt=0, le=20, description="목표 손익분기율 (%)")

@app.post("/api/calculator/average-down")
def calculate_avg_down(req: AverageDownRequest):
    """
    물타기 계산기 - 기본 계산
    추가 투자 시 평단가 변화 및 손익분기점 계산
    """
    result = calculate_average_down(
        req.current_shares,
        req.current_avg_price,
        req.current_price,
        req.additional_amount
    )
    
    if result.get("error"):
        return {"status": "error", "message": result["error"]}
    
    return {"status": "success", "data": result}

@app.post("/api/calculator/scenarios")
def calculate_scenarios(req: MultipleScenariosRequest):
    """
    물타기 계산기 - 다중 시나리오
    여러 투자 금액에 대한 시뮬레이션
    """
    scenarios = calculate_multiple_scenarios(
        req.current_shares,
        req.current_avg_price,
        req.current_price,
        req.max_budget,
        req.num_scenarios
    )
    
    return {"status": "success", "data": scenarios}

@app.post("/api/calculator/optimal")
def calculate_optimal(req: OptimalRatioRequest):
    """
    물타기 계산기 - 최적 투자금 계산
    목표 손익분기율을 달성하기 위한 최적 투자금 산출
    """
    result = calculate_optimal_ratio(
        req.current_shares,
        req.current_avg_price,
        req.current_price,
        req.target_breakeven_rate
    )
    
    if result.get("error"):
        return {"status": "error", "message": result["error"]}
    
    return {"status": "success", "data": result}


# ============================================================
# Risk Alert System (지뢰 탐지기)
# ============================================================

from risk_analyzer import (
    analyze_stock_risk,
    analyze_news_risk,
    generate_detailed_report
)

@app.get("/api/risk/{symbol}")
def get_stock_risk(symbol: str):
    """
    종목 위험도 분석 (기본)
    재무 데이터 기반 위험도 점수 및 위험 요인 제공
    """
    result = analyze_stock_risk(symbol)
    
    if not result.get("success"):
        return {"status": "error", "message": result.get("error", "분석 실패")}
    
    return {"status": "success", "data": result}

@app.get("/api/risk/{symbol}/report")
def get_detailed_risk_report(symbol: str):
    """
    종목 위험도 상세 리포트 (Premium - 광고 시청 후)
    AI 분석 + 뉴스 리스크 + 상세 진단
    """
    # 기본 위험도 분석
    risk_analysis = analyze_stock_risk(symbol)
    
    if not risk_analysis.get("success"):
        return {"status": "error", "message": risk_analysis.get("error", "분석 실패")}
    
    # 뉴스 데이터 가져오기
    try:
        from stock_data import fetch_google_news
        news_data = fetch_google_news(symbol)
    except:
        news_data = []
    
    # 뉴스 리스크 분석
    news_risk = analyze_news_risk(symbol, news_data)
    
    # 종합 위험도 계산 (기본 + 뉴스)
    total_risk_score = min(risk_analysis["risk_score"] + news_risk["score"], 100)
    
    # 상세 리포트 생성
    detailed_report = generate_detailed_report(symbol, risk_analysis, news_data)
    
    # AI 분석 추가
    try:
        from ai_analysis import generate_ai_response
        
        ai_prompt = f"""
다음은 {risk_analysis['company_name']} ({symbol})의 위험도 분석 리포트입니다:

{detailed_report}

주식 초보자를 위해 다음 내용을 쉽게 설명해주세요:
1. 이 종목의 가장 큰 위험 요인 3가지
2. 투자 시 주의해야 할 점
3. 유사한 과거 사례가 있다면 어떻게 되었는지
4. 투자 여부에 대한 최종 의견

감정적이고 공감하는 톤으로 작성해주세요.
"""
        
        ai_analysis = generate_ai_response(ai_prompt, model="gpt-4")
    except:
        ai_analysis = "AI 분석을 생성할 수 없습니다."
    
    return {
        "status": "success",
        "data": {
            "risk_analysis": risk_analysis,
            "news_risk": news_risk,
            "total_risk_score": total_risk_score,
            "detailed_report": detailed_report,
            "ai_analysis": ai_analysis,
            "recent_news": news_data[:5]  # 최근 5개 뉴스
        }
    }


# ============================================================
# Company Health Score (회사 건강도 점수)
# ============================================================

from risk_analyzer import calculate_health_score

@app.get("/api/health/{symbol}")
def get_company_health_score(symbol: str):
    """
    회사 건강도 점수 조회 (0-100)
    재무제표를 단일 점수와 캐릭터로 시각화
    """
    result = calculate_health_score(symbol)
    
    if not result.get("success"):
        return {"status": "error", "message": result.get("error", "분석 실패")}
    
    return {"status": "success", "data": result}


# ============================================================
# Stock History Storytelling (주식 위인전)
# ============================================================

from stock_events import get_chart_story

@app.get("/api/chart/story/{symbol}")
def get_stock_story(symbol: str, period: str = "1y"):
    """
    차트 스토리텔링 데이터 조회
    주요 변곡점에 역사적 이벤트 매칭
    
    Args:
        symbol: 종목 코드
        period: 기간 (1mo, 3mo, 6mo, 1y, 2y, 5y)
    """
    result = get_chart_story(symbol, period)
    
    if not result.get("success"):
        return {"status": "error", "message": result.get("error", "스토리 생성 실패")}
    
    return {"status": "success", "data": result}


# ============================================================
# Market Calendar (거시경제 일정)
# ============================================================

from stock_data import get_macro_calendar

@app.get("/api/market/calendar")
def get_market_calendar():
    """
    주요 거시경제 일정 조회
    """
    try:
        calendar_data = get_macro_calendar()
        return {"status": "success", "data": calendar_data}
    except Exception as e:
        print(f"Calendar Error: {e}")
        return {"status": "error", "message": "일정을 불러올 수 없습니다"}


# ============================================================
# Price Alert System (가격 알림 시스템)
# ============================================================

from price_alerts import (
    price_alert_monitor,
    create_price_alerts_tables,
    save_price_alert,
    get_user_alerts,
    delete_price_alert,
    get_alert_history
)

# 서버 시작 시 테이블 생성 및 모니터 시작
@app.on_event("startup")
async def startup_price_alerts():
    """가격 알림 시스템 초기화"""
    # Firebase 초기화
    from firebase_config import initialize_firebase
    from db_manager import create_fcm_tokens_table
    
    initialize_firebase()
    create_fcm_tokens_table()
    create_price_alerts_tables()
    asyncio.create_task(price_alert_monitor.start())

@app.on_event("shutdown")
async def shutdown_price_alerts():
    """가격 알림 시스템 종료"""
    price_alert_monitor.stop()

class PriceAlertRequest(BaseModel):
    symbol: str
    type: str  # 'stop_loss', 'take_profit', 'target_price'
    buy_price: Optional[float] = None
    threshold: Optional[float] = None
    target_price: Optional[float] = None
    quantity: Optional[int] = None

@app.post("/api/alerts/price")
def create_price_alert(req: PriceAlertRequest, x_user_id: str = Header(None)):
    """
    가격 알림 생성
    
    손절: type='stop_loss', buy_price=50000, threshold=3 (3% 하락 시)
    익절: type='take_profit', buy_price=50000, threshold=5 (5% 상승 시)
    목표가: type='target_price', target_price=60000
    """
    user_id = x_user_id if x_user_id else "guest"
    
    try:
        alert_id = save_price_alert(
            user_id=user_id,
            symbol=req.symbol,
            alert_type=req.type,
            buy_price=req.buy_price,
            threshold=req.threshold,
            target_price=req.target_price,
            quantity=req.quantity
        )
        
        return {
            "status": "success",
            "alert_id": alert_id,
            "message": "알림이 설정되었습니다."
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"알림 설정 실패: {str(e)}"
        }

@app.get("/api/alerts/price/list")
def list_price_alerts(active_only: bool = True, x_user_id: str = Header(None)):
    """사용자의 가격 알림 목록 조회"""
    user_id = x_user_id if x_user_id else "guest"
    
    alerts = get_user_alerts(user_id, active_only)
    return {"status": "success", "alerts": alerts}

@app.delete("/api/alerts/price/{alert_id}")
def remove_price_alert(alert_id: int, x_user_id: str = Header(None)):
    """가격 알림 삭제"""
    user_id = x_user_id if x_user_id else "guest"
    
    success = delete_price_alert(user_id, alert_id)
    
    if success:
        return {"status": "success", "message": "알림이 삭제되었습니다."}
    else:
        return {"status": "error", "message": "알림 삭제 실패"}

@app.get("/api/alerts/price/history")
def get_price_alert_history(limit: int = 50, x_user_id: str = Header(None)):
    """알림 히스토리 조회"""
    user_id = x_user_id if x_user_id else "guest"
    
    history = get_alert_history(user_id, limit)
    return {"status": "success", "history": history}


# ============================================================
# Firebase Cloud Messaging (FCM) - Push Notifications
# ============================================================

class FCMTokenRequest(BaseModel):
    token: str
    device_type: str = 'web'
    device_name: str = None

@app.post("/api/fcm/register")
def register_fcm_token(req: FCMTokenRequest, x_user_id: str = Header(None)):
    """FCM 토큰 등록"""
    from db_manager import save_fcm_token
    
    user_id = x_user_id if x_user_id else "guest"
    
    try:
        success = save_fcm_token(user_id, req.token, req.device_type, req.device_name)
        
        if success:
            return {"status": "success", "message": "푸시 알림이 활성화되었습니다."}
        else:
            return {"status": "error", "message": "토큰 등록 실패"}
    except Exception as e:
        return {"status": "error", "message": str(e)}




class SummarySubscribeRequest(BaseModel):
    chat_id: str

@app.post("/api/alerts/summary")
def subscribe_daily_summary(req: SummarySubscribeRequest, x_user_id: str = Header(None)):
    """장 마감 브리핑 구독 (하루 1회 관심종목 시황 발송)"""
    user_id = x_user_id if x_user_id else "guest"
    
    # 중복 체크
    current_alerts = get_alerts()
    for a in current_alerts:
        if a.get("type") == "WATCHLIST_SUMMARY" and a.get("user_id") == user_id:
             # 이미 존재하면 해당 알림 반환 (또는 업데이트)
             a["chat_id"] = req.chat_id # Chat ID 업데이트
             from alerts import save_alerts
             save_alerts(current_alerts)
             return {"status": "success", "message": "Updated existing subscription", "data": a}

    # 신규 생성
    alert = add_alert(symbol="WATCHLIST", alert_type="WATCHLIST_SUMMARY", chat_id=req.chat_id, user_id=user_id)
    return {"status": "success", "data": alert}

@app.delete("/api/alerts/summary")
def unsubscribe_daily_summary(x_user_id: str = Header(None)):
    """장 마감 브리핑 구독 취소"""
    user_id = x_user_id if x_user_id else "guest"
    current_alerts = get_alerts()
    
    # 해당 유저의 SUMMARY 알림 모두 삭제
    to_delete = [a for a in current_alerts if a.get("type") == "WATCHLIST_SUMMARY" and a.get("user_id") == user_id]
    
    for a in to_delete:
        delete_alert(a["id"])
        
    return {"status": "success", "deleted_count": len(to_delete)}

@app.post("/api/alerts")
def create_new_alert(req: AlertRequest, x_user_id: str = Header(None)):
    """가격 알림 추가"""
    user_id = x_user_id if x_user_id else "guest"
    # alert_type defaults to PRICE if not specified in AlertRequest (which currently lacks it, so existing logic holds)
    # If we want to support other types via API, we should update AlertRequest, but for now this handles normal price alerts.
    alert = add_alert(req.symbol, req.target_price, req.condition, chat_id=req.chat_id, user_id=user_id)
    return {"status": "success", "data": alert}

@app.get("/api/alerts")
def read_alerts():
    """알림 목록 조회"""
    return {"status": "success", "data": get_alerts()}

@app.delete("/api/alerts/{alert_id}")
def remove_alert(alert_id: int):
    """알림 삭제"""
    delete_alert(alert_id)
    return {"status": "success"}

@app.get("/api/telegram/recent-users")
def read_recent_telegram_users():
    """텔레그램 봇 최근 사용자 조회 (ID 찾기용)"""
    users = get_recent_telegram_users()
    return {"status": "success", "data": users}


@app.get("/api/watchlist/closing-summary")
def read_closing_summary():
    """장 마감 시황 및 관심종목 요약 (배너용)"""
    try:
        # Import needed for URL decoding
        import urllib.parse
        
        # [Fixed] Missing user_id argument error. Defaulting to 'guest' for banner.
        watchlist = get_watchlist("guest")
        if not watchlist:
            return {"status": "empty", "data": []}
            
        summary = []
        for symbol in watchlist:
            # urllib unquote might be needed if symbols stored with % encoded
            symbol = urllib.parse.unquote(symbol)
            q = get_simple_quote(symbol)
            if q:
                summary.append(q)
                
        return {
            "status": "success",
            "data": summary,
            "timestamp": time.time()
        }
    except Exception as e:
        print(f"[API] Closing Summary Error: {e}")
        return {"status": "error", "message": "데이터를 불러올 수 없습니다."}

@app.on_event("startup")
def startup_event():
    """서버 시작 시 백그라운드 작업 실행"""
    def run_scheduler():
        while True:
            try:
                # 30초마다 알림 체크
                check_alerts()
            except Exception as e:
                print(f"Scheduler Error: {e}")
            time.sleep(30)

    thread = threading.Thread(target=run_scheduler, daemon=True)
    thread.start()

# ============================================================
# WebSocket Real-time Price Updates
# ============================================================

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, user_id: str = Query("guest")):
    """
    WebSocket endpoint for real-time stock price updates.
    Clients subscribe to specific symbols and receive updates every 1-5 seconds.
    """
    print(f"[WS] Connection attempt from client {client_id} (user: {user_id})")
    
    # Use ConnectionManager's connect method (handles accept() internally)
    try:
        await manager.connect(websocket, user_id)
        print(f"[WS] ✅ Client {client_id} connected successfully (total: {len(manager.active_connections)})")
    except Exception as e:
        print(f"[WS] ❌ Failed to connect client {client_id}: {e}")
        import traceback
        print("[WS] Full traceback:")
        traceback.print_exc()
        return
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
            except Exception as e:
                print(f"[WS] Error receiving data from {client_id}: {e}")
                break
            
            try:
                message = json.loads(data)
                msg_type = message.get('type')
                
                # Handle ping (respond with pong)
                if msg_type == 'ping':
                    await websocket.send_json({"type": "pong", "timestamp": asyncio.get_event_loop().time()})
                    continue
                
                # Handle authentication (KIS keys)
                elif msg_type == 'auth':
                    keys = message.get('keys')
                    if keys:
                        manager.set_keys(websocket, keys)
                        # [NEW] Start User Session for KIS WS
                        success = await session_manager.start_user_session(user_id, keys, handle_user_ws_message)
                        if success:
                            print(f"[WS] KIS Session started for {user_id}")
                        else:
                            print(f"[WS] KIS Session failed for {user_id}")
                            
                        print(f"[WS] Keys registered for {client_id}")
                        await websocket.send_json({"type": "auth_success"})
                
                # Handle symbol subscription
                elif msg_type == 'subscribe':
                    symbol = message.get('symbol')
                    if symbol:
                        await manager.subscribe(websocket, symbol)
                        print(f"[WS] {client_id} subscribed to {symbol}")
                        
                        # [NEW] Sync with User Session if exists
                        # If user has a KIS session, subscribe there too
                        if user_id in session_manager.user_websockets:
                             # Clean symbol logic
                             target_code = None
                             if symbol.isdigit() and len(symbol) == 6:
                                 target_code = symbol
                             elif symbol.endswith('.KS') or symbol.endswith('.KQ'):
                                 target_code = symbol.split('.')[0]
                             
                             if target_code:
                                 await session_manager.subscribe_user_symbol(user_id, target_code)

                        # Send initial price immediately
                        try:
                            # [Optimization] Run blocking fetch in thread pool
                            loop = asyncio.get_running_loop()
                            initial_price = await loop.run_in_executor(None, get_simple_quote, symbol)
                            
                            if initial_price:
                                await websocket.send_text(json.dumps({
                                    "type": "update",
                                    "data": initial_price
                                }, ensure_ascii=False))
                                print(f"[WS] Sent initial price for {symbol}: {initial_price.get('price', 'N/A')}")
                            else:
                                print(f"[WS] No initial price available for {symbol}")
                        except Exception as e:
                            print(f"[WS] Initial price error for {symbol}: {e}")
                            import traceback
                            traceback.print_exc()
                
                # Handle unsubscribe
                elif msg_type == 'unsubscribe':
                    symbol = message.get('symbol')
                    if symbol and websocket in manager.subscriptions:
                        if manager.subscriptions[websocket] == symbol:
                            del manager.subscriptions[websocket]
                            await websocket.send_json({"type": "unsubscribed", "symbol": symbol})
                            print(f"[WS] {client_id} unsubscribed from {symbol}")
                            
                            # [NEW] Unsubscribe from User Session if needed
                            # Only if no other socket of this user is watching?
                            # Simplify: Just keep it open or unsub. 
                            # If we unsub here, it might affect other tabs of same user if we don't check carefully.
                            # But manager.subscriptions is per-socket.
                            # We should check if user has other sockets watching this symbol.
                            user_subs = manager.get_user_subscriptions(user_id)
                            # If no other socket watches this symbol (implied by get_user_subscriptions returning current state),
                            # convert symbol to code and unsub.
                            # But wait, get_user_subscriptions iterates active connections.
                            # We just deleted subscription above. So if it's not in the list, we can unsub.
                            # ... logic to convert symbol ...
                            pass
                
            except json.JSONDecodeError as e:
                print(f"[WS] Invalid JSON from {client_id}: {e}")
                print(f"[WS] Raw data: {data[:100]}...")
                try:
                    await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                except:
                    pass
            except Exception as e:
                print(f"[WS] Message handling error for {client_id}: {e}")
                import traceback
                traceback.print_exc()
                
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        print(f"[WS] Client {client_id} disconnected normally")
        
        # [NEW] Cleanup User Session if no active connections left
        remaining_sockets = [ws for ws, m in manager.active_connections.items() if m['user_id'] == user_id]
        if not remaining_sockets:
             await session_manager.stop_user_session(user_id)
             print(f"[WS] Closed KIS session for {user_id}")

    except Exception as e:
        print(f"[WS] Unexpected error for {client_id}: {e}")
        import traceback
        traceback.print_exc()
        await manager.disconnect(websocket)
        # Cleanup here too
        remaining_sockets = [ws for ws, m in manager.active_connections.items() if m['user_id'] == user_id]
        if not remaining_sockets:
             await session_manager.stop_user_session(user_id)









if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)