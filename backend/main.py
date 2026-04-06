from __future__ import annotations
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Header
from typing import Optional, List, Dict, Any, Union, Mapping, Callable, Type, TypeVar, Generic
import unicodedata
# [Deployment Trigger] v2.6.9-Chromium-Fix - 2026-04-06
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import sys
import os
import pydantic
import concurrent.futures
import sqlite3
import time
import urllib.parse
import threading

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# [v2.6.0-Unified] Startup Diagnostics
STOCK_MAP_PATH = os.path.join(os.path.dirname(__file__), "stock_names.py")
if os.path.exists(STOCK_MAP_PATH):
    print(f"[Startup] Found STOCK_MAP at: {STOCK_MAP_PATH}")
else:
    print(f"⚠️ [Startup] WARNING: STOCK_MAP (stock_names.py) NOT FOUND!")

from sockets import manager
from stock_data import (
    get_simple_quote, get_all_market_assets, get_stock_info, get_market_data, 
    get_market_news, calculate_technical_sentiment, get_insider_trading, 
    get_macro_calendar, fetch_google_news, get_korean_stock_name, 
    GLOBAL_KOREAN_NAMES
)
from kis_api import KisApi
from db_manager import (
    get_db_connection, save_analysis_result, get_score_history, add_watchlist, 
    remove_watchlist, get_watchlist, cast_vote, get_vote_stats, get_prediction_report, 
    save_fcm_token, delete_fcm_token, clear_watchlist,
    create_signals_table, create_votes_table,
    save_signal, get_recent_signals, get_signals_by_symbol,
    save_vote, get_vote_results, get_user_vote, get_yesterday_vote_results
)
from user_session import session_manager
from ai_analysis import (
    analyze_stock, generate_market_briefing, analyze_portfolio, analyze_theme, 
    analyze_earnings_impact, analyze_supply_chain, analyze_chart_patterns, 
    analyze_trading_log
)
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
    get_market_investors, get_index_chart_data, get_investor_history,
    get_market_summary_stats, get_live_disclosures, get_integrated_stock_news,
    get_korean_interest_rates
)
from global_search import search_global_ticker
from pydantic import BaseModel, Field
from portfolio_analysis import analyze_portfolio_risk
from auth import router as auth_router

app = FastAPI(title="AI Stock Analyst", version="2.8.0")

# Force Reload Trigger: v2.6.0-Final-CORS-Hardened
# CORS 설정 (Vercel 및 Local 개발 환경 허용)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://stock-trend-program.vercel.app",
    "https://stock-trend-program-git-main-rnfjrlakdmf-hashs-projects.vercel.app",
    "https://stock-trend-program-rnfjrlakdmf-hashs-projects.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://stock-trend-program.vercel.app",
        "https://stock-trend-program-rnfjrlakdmf-hashs-projects.vercel.app",
        "https://stocktrendprogram-production.up.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "version": "v4.6.0 (Victory-Gold)",
        "build_id": "2026-04-06-deploy-v12-gold",
        "service": "AI Stock Analyst Backend - Production Stable"
    }

@app.post("/api/admin/clear-cache")
def clear_cache():
    """[Admin] Force clear all server-side cache"""
    from turbo_engine import turbo_engine
    turbo_engine.clear_cache()
    return {"status": "ok", "message": "Cache cleared successfully"}

from fastapi import Request
from rank_data import get_etf_ranking
from etf_detail import get_etf_detail
from turbo_engine import turbo_engine, turbo_cache
from pro_analysis import get_peer_comparison
from sector_analysis import get_sector_analysis_data

@app.get("/api/rank/etf")
@turbo_cache(ttl_seconds=300)
def read_etf_rank(market: str = "KR", category: Optional[str] = None):
    """실시간 ETF 통계 데이터 반환 (참고용)"""
    data = get_etf_ranking(market, category)
    return {"status": "success", "data": data}

@app.get("/api/peer/{symbol}")
@turbo_cache(ttl_seconds=3600)
def peer_data(symbol: str):
    return get_peer_comparison(symbol)

@app.get("/api/sector-analysis-json/{symbol}")
def sector_analysis_json_debug(symbol: str, sector_id: Optional[str] = Query(None)):
    """v4.6.0 JSON 디벨로퍼 디버그 API (Gold-Spec)"""
    return get_sector_analysis_data(symbol, sector_id)

@app.get("/api/etf-detail/{symbol}")
def etf_detail(symbol: str):
    """엔드포인트: 주어진 심볼을 기반으로 ETF의 순자산총액, 총보수, 편입종목 Top 10 등을 조회합니다. (Turbo Cache 적용)"""
    cache_key = f"etf_detail_{symbol}"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return cached
        
    result = get_etf_detail(symbol)
    if result.get("status") == "success":
        turbo_engine.set_cache(cache_key, result)
        
    return result

@app.get("/api/turbo/scan")
@turbo_cache(ttl_seconds=60)
def turbo_market_scan(symbols: str = "069500,114800,122630,229200,SPY,QQQ"):
    """[Turbo Engine] 다수 ETF를 동시에 스캔하여 최적의 종목을 추천 (Beta)"""
    # For now, this is a placeholder for the parallel scanner logic
    sym_list = symbols.split(",")
    return {"status": "success", "scanning": sym_list, "mode": "turbo_active"}

@app.get("/api/rank/themes")
@turbo_cache(ttl_seconds=300)
def read_theme_rank():
    """실시간 인기 테마 키워드 목록 반환"""
    from korea_data import get_naver_theme_rank
    data = get_naver_theme_rank()
    return {"status": "success", "data": data}

@app.get("/api/pro/summary/{symbol}")
def read_pro_summary(symbol: str):
    """
    [TurboQuant Pro] 통합 요약 리포트 (퀀트 + 재무 + 수급 통합)
    병렬 처리를 통해 최상의 응답 속도 제공
    """
    cache_key = f"pro_summary_{symbol}"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {"status": "success", "data": cached, "turbo": True}

    import concurrent.futures
    import time
    
    # 헬퍼 함수: 동기 함수를 별도 스레드에서 실행
    def run_sync(func, *args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(f"Sub-task error in {func.__name__}: {e}")
            return None

    try:
        from pro_analysis import get_quant_scorecard, get_financial_health
        from korea_data import get_naver_investor_data, gather_naver_stock_data, get_korean_investment_indicators
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            # 4가지 핵심 데이터를 병렬로 요청
            future_quant = executor.submit(run_sync, get_quant_scorecard, symbol)
            future_health = executor.submit(run_sync, get_financial_health, symbol)
            future_investor = executor.submit(run_sync, get_naver_investor_data, symbol, 20) # 1개월 기준 수공
            future_stock = executor.submit(run_sync, gather_naver_stock_data, symbol)
            # [NEW] 실적 추이 데이터 (Charts용)
            future_indicators = executor.submit(run_sync, get_korean_investment_indicators, symbol, "0", "IFRSL", "1") # 연간 수익성 지표
            
            # 결과 대기
            quant_data = future_quant.result()
            health_data = future_health.result()
            inv_res = future_investor.result()
            stock_data = future_stock.result()
            indicators_res = future_indicators.result()
            
        # 실적 추이 데이터 가공 (Chart-friendly format)
        fin_charts = []
        if indicators_res and indicators_res.get("status") == "success":
            headers = indicators_res.get("headers", [])
            indicators = indicators_res.get("indicators", [])
            
            rev_row = next((row for row in indicators if "매출액" in row["name"]), None)
            op_row = next((row for row in indicators if "영업이익" in row["name"]), None)
            
            for h in headers:
                # '2023/12' -> '2023'
                year = h.split('/')[0]
                entry = {"year": year}
                if rev_row: entry["매출액"] = rev_row["values"].get(h, 0)
                if op_row: entry["영업이익"] = op_row["values"].get(h, 0)
                fin_charts.append(entry)
            
        combined_data = {
            "symbol": symbol,
            "stock_info": stock_data,
            "quant": quant_data,
            "health": health_data,
            "investor": inv_res.get("data") if inv_res and isinstance(inv_res, dict) and inv_res.get("status") == "success" else None,
            "financial_indicators": fin_charts, # NEW
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # 유효한 득점 결과가 최소 하나는 있어야 캐싱 (에러 방지)
        if quant_data or health_data:
            turbo_engine.set_cache(cache_key, combined_data)
        
        return {"status": "success", "data": combined_data, "turbo": False}
        
    except Exception as e:
        print(f"Pro Summary API Error: {e}")
        return {"status": "error", "message": str(e)}

# [NEW] Assets & Risk Alerts Endpoints
from stock_data import (
    get_all_market_assets, get_dart_risk_alerts, get_company_financials,
    get_dividend_history, get_financial_health
)

@app.get("/api/assets")
def read_assets():
    """모든 글로벌 자산 데이터 반환 (Turbo Cache 적용)"""
    cache_key = "global_assets_all"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {"status": "success", "data": cached, "turbo": True}
        
    data = get_all_market_assets()
    if data:
        turbo_engine.set_cache(cache_key, data)
    
    # [Fix] Ensure data is never None
    if not data:
        data = {
            "Indices": [], "Crypto": [], "Forex": [], 
            "Commodity": [], "Interest": []
        }
        
    return {"status": "success", "data": data, "turbo": False}

@app.get("/api/market/risk-alerts")
@turbo_cache(ttl_seconds=300)
def read_risk_alerts():
    """최근 공시 리스크 탐지 결과 반환 (유상증자 등)"""
    data = get_dart_risk_alerts()
    return {"status": "success", "data": data}

@app.get("/api/stock/{symbol}/financials")
@turbo_cache(ttl_seconds=3600)
def read_stock_financials(symbol: str):
    """특정 종목의 최근 3개년 재무 하이라이트 반환"""
    data = get_company_financials(symbol)
    return {"status": "success", "data": data}

@app.get("/api/sector-analysis/{symbol}")
def read_sector_analysis(symbol: str, sector_id: Optional[str] = Query(None)):
    """
    [통합 v4.6.5] 최신 데이터 엔진(Victory-Unified) + 캐싱 시스템
    """
    cache_key = f"sector_analysis_{symbol}_{sector_id}"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {**cached, "turbo": True}
        
    data = get_sector_analysis_data(symbol, sector_id)
    if data and data.get("status") == "success":
        turbo_engine.set_cache(cache_key, data)
        return {**data, "turbo": False}
        
    return data # Success or Error case from sector_analysis.py

@app.get("/api/stock/{symbol}/dividends")
@turbo_cache(ttl_seconds=3600)
def read_stock_dividends(symbol: str):
    """특정 종목의 최근 5개년 연간 배당 히스토리 반환"""
    data = get_dividend_history(symbol)
    return {"status": "success", "data": data}


@app.get("/api/stock/{symbol}/overview")

@turbo_cache(ttl_seconds=3600)
def read_stock_overview(symbol: str):
    """특정 종목의 상세 기업 개요(연혁, 매출구성, R&D 등) 반환"""
    from korea_data import get_korean_company_overview
    data = get_korean_company_overview(symbol)
    return {"status": "success", "data": data}

@app.get("/api/stock/{symbol}/indicators")
@turbo_cache(ttl_seconds=3600)
def read_stock_indicators(symbol: str, freq: str = "0", finGubun: str = "IFRSL", category: str = "3"):
    """특정 종목의 상세 투자지표(수익성, 성장성, 안정성, 활동성 등) 반환"""
    from korea_data import get_korean_investment_indicators
    raw_data = get_korean_investment_indicators(symbol, freq=freq, fin_gubun=finGubun, rpt=category)
    if raw_data:
        if isinstance(raw_data, dict) and raw_data.get("status") == "empty":
             return {"status": "error", "message": raw_data.get("message", "데이터가 없습니다.")}
        
        # 프론트엔드 UI(TurboQuantIndicators.tsx) 형식에 맞게 데이터 트랜스폼
        headers = raw_data.get("headers", [])
        indicators = raw_data.get("indicators", [])
        
        # 헤더 정제: 연도만 추출하고, 깨진 글자(YoY 등) 예외 처리
        years = []
        for h in headers:
            clean_h = h.split('(')[0] if '(' in h else h
            # 깨진 글자 패턴 (전년동기 YoY 등) 대응
            if "i??" in clean_h or "e?" in clean_h or "YoY" in h:
                years.append("전년동기(YoY)")
            else:
                years.append(clean_h)
        
        rows = []
        for ind in indicators:
            label = ind.get("name", "")
            vals_dict = ind.get("values", {})
            
            row_values = []
            for h in headers:
                val = vals_dict.get(h)
                if val is not None:
                    # 숫자인 경우 소수점 2자리에서 반올림하여 긴 소수점 방지
                    try:
                        if isinstance(val, (int, float)):
                            formatted_val = f"{float(val):.2f}"
                            # .00 은 제거하여 정수로 표현
                            if formatted_val.endswith(".00"):
                                formatted_val = formatted_val[:-3]
                            row_values.append(formatted_val)
                        else:
                            row_values.append(str(val))
                    except:
                        row_values.append(str(val))
                else:
                    row_values.append("")
            
            rows.append({
                "label": label,
                "values": row_values
            })
            
        transformed_data = {
            "name": "",
            "symbol": symbol,
            "years": years,
            "rows": rows
        }

        return {"status": "success", "data": transformed_data}
    else:
        return {"status": "error", "message": "Failed to fetch indicators (Network error)"}

@app.get("/api/stock/{symbol}/investor")
@turbo_cache(ttl_seconds=60)
def read_stock_investor(symbol: str, period: int = 1):
    """
    [NEW] 특정 종목의 투자자별 매매동향 및 상위 거래원 정보 반환.
    - 한국 주식: 네이버 금융 실시간 스크래핑 (당일/5/20/60일)
    - 해외 주식: 현재 데이터 부재로 빈 객체 반환
    """
    from korea_data import get_naver_investor_data
    
    # Check if Korean Stock (6 digits)
    is_kr = False
    clean_code = symbol.split('.')[0]
    if len(clean_code) == 6 and clean_code.isdigit():
        is_kr = True
        
    if not is_kr:
        return {
            "status": "success",
            "market": "US",
            "message": "해외 주식은 거래원 정보를 제공하지 않습니다.",
            "data": {"brokerage": {"sell":[], "buy":[], "foreign_estimate":None}, "trend": []}
        }
        
    data_result = get_naver_investor_data(symbol, trader_day=period)
    if data_result.get("status") == "success":
        # Ensure data structure is robust for frontend
        raw_data = data_result.get("data", {})
        robust_data = {
            "trend": raw_data.get("trend") if isinstance(raw_data.get("trend"), list) else [],
            "brokerage": raw_data.get("brokerage") if isinstance(raw_data.get("brokerage"), dict) else {"sell":[], "buy":[], "foreign_estimate":None}
        }
        # Special check for internal brokerage fields
        if not isinstance(robust_data["brokerage"].get("sell"), list): robust_data["brokerage"]["sell"] = []
        if not isinstance(robust_data["brokerage"].get("buy"), list): robust_data["brokerage"]["buy"] = []
        
        return {"status": "success", "market": "KR", "data": robust_data}
    else:
        return {"status": "error", "message": data_result.get("message", "Data fetch failed")}

@app.on_event("startup")
async def startup_event():
    # Start Ranking Background Task
    t_rank = threading.Thread(target=ranking_bg_looper, daemon=True)
    t_rank.start()
    # Start WS Broadcast Loop
    asyncio.create_task(broadcast_stock_updates())
    
    # [NEW] Start Disclosure Scheduler (KIND Scraper)
    try:
        from scheduler import disclosure_scheduler_loop
        asyncio.create_task(disclosure_scheduler_loop())
        print("[Main] Disclosure Scheduler Started")
    except Exception as e:
        print(f"[Main] Failed to start Disclosure Scheduler: {e}")
    
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
        "version": "2.7.8"
    }

class PortfolioItem(BaseModel):
    symbol: str
    weight: float

class PortfolioAnalysisRequest(BaseModel):
    allocation: List[PortfolioItem]




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

import html
import re
from datetime import datetime, timedelta

# ============================================================
# [🛡️ Compliance & Safety] 유사투자자문업 방지 AI 필터링 엔진
# ============================================================
class CommunityGuardian:
    """유사투자자문업 위반 뉘앙스를 감지하여 자동 차단하는 엔진"""
    
    # 1. 즉시 차단 키워드 (단어만 들어가도 차단)
    FORBIDDEN_KEYWORDS = [
        "매수하세요", "필승", "수익보장", "무조건상승", "원금회복", 
        "리딩방", "카톡방문의", "1:1상담", "고급정보", "세력주확정",
        "급등예정", "확신합니다", "책임집니다", "꼭사야할", "비밀공개"
    ]
    
    # 2. 문맥/뉘앙스 차단 패턴 (Regex)
    FORBIDDEN_PATTERNS = [
        r"\d+%?\s*이익\s*보장", # 00% 이익 보장
        r"무조건\s*\d+배",       # 무조건 0배
        r"손실\s*보전",          # 손실 보전
        r"텔레그램\s*아이디",    # 외부 채널 유도
        r"전화번호\s*\d{3}",     # 연락처 노출
        r"(내일|모레)\s*(상한가|폭등)" # 내일 상한가 확신 등
    ]

    @classmethod
    def is_safe(cls, text: str) -> (bool, str):
        """텍스트의 안전 여부 판단 (True = 안전, False = 위험)"""
        # 검사 전 전처리
        clean_text = html.unescape(text).replace(" ", "")
        
        # 1. 블랙리스트 키워드 검사
        for keyword in cls.FORBIDDEN_KEYWORDS:
            if keyword in clean_text:
                return False, f"부적절한 키워드 감지: {keyword}"
        
        # 2. 패턴 검사 (뉘앙스)
        for pattern in cls.FORBIDDEN_PATTERNS:
            if re.search(pattern, text):
                return False, "유사투자자문 위험 뉘앙스 감지 (수익보장/리딩유도 등)"
        
        return True, "Safe"

# ============================================================
# [Community Data Store] 
# 실무에서는 DB를 사용하지만, 빠른 구현을 위해 메모리 & 파일 기반 시스템 구축
# ============================================================
COMMUNITY_CHATS = [
    {
        "id": 1, "user_name": "AI 수사관", "symbol": "global",
        "text": "환영합니다! 이곳은 투명하고 안전한 투자 정보 공유를 위한 라운지입니다.",
        "timestamp": (datetime.now() - timedelta(hours=1)).isoformat()
    },
    {
        "id": 2, "user_name": "StockBot", "symbol": "global",
        "text": "오늘 코스피 변동성이 크네요. 다들 지표 확인 잘 하시고 성투하세요!",
        "timestamp": (datetime.now() - timedelta(minutes=45)).isoformat()
    }
] 

STRATEGY_MARKET = [
    {
        "id": 1, "user_name": "퀀트마스터", "title": "F-Score 8점 이상 저평가주",
        "description": "재무 건전성이 매우 우수하면서 PER이 업종 평균보다 낮은 종목들을 추출하는 퀀트 전략입니다.",
        "filters": {"f_score": 8, "per": {"max": 15}},
        "likes": 12, "usage_count": 85, "timestamp": datetime.now().isoformat()
    },
    {
        "id": 2, "user_name": "배당고수", "title": "고배당 + 안전 마진 필터",
        "description": "배당 수익률 4% 이상이면서 부채비율이 100% 미만인 안정적인 배당주를 찾습니다.",
        "filters": {"dividend_yield": {"min": 4.0}, "debt_ratio": {"max": 100}},
        "likes": 24, "usage_count": 142, "timestamp": datetime.now().isoformat()
    }
]

@app.get("/api/community/lounge")
def get_lounge_chats(symbol: str = "global"):
    """라운지 채팅 목록 조회 (필터링된 안전한 글만)"""
    # 최근 50개만 반환
    relevant = [c for c in COMMUNITY_CHATS if c.get('symbol') == symbol or c.get('symbol') == "global"]
    return {"status": "success", "data": relevant[-50:]}

@app.post("/api/community/lounge")
def post_lounge_chat(data: dict):
    """채팅 게시 (AI 세이프티 필터 적용)"""
    user_name = data.get("user_name", "익명")
    text = data.get("text", "").strip()
    symbol = data.get("symbol", "global")
    
    if not text:
        return {"status": "error", "message": "내용을 입력해주세요."}
    
    # 🛡️ 델리게이트 필터링
    is_safe, reason = CommunityGuardian.is_safe(text)
    if not is_safe:
        print(f"[Guardian] Blocked: {text} | Reason: {reason}")
        return {"status": "blocked", "message": "🚨 규정 위반 감지: 투자 권유, 수익 보장, 리딩 유도 등의 표현은 금지되어 자동 삭제되었습니다."}
    
    new_chat = {
        "id": len(COMMUNITY_CHATS) + 1,
        "user_name": user_name,
        "text": text,
        "symbol": symbol,
        "timestamp": datetime.now().isoformat()
    }
    COMMUNITY_CHATS.append(new_chat)
    return {"status": "success", "data": new_chat}

@app.get("/api/community/strategies")
def read_strategies():
    """전략 마켓 데이터 조회"""
    return {"status": "success", "data": STRATEGY_MARKET}

@app.post("/api/market/strategy/scan")
async def scan_strategy_endpoint(payload: Dict[str, Any]):
    """
    [Turbo Scan] 특정 전략 필터를 적용하여 실시간 종목 발굴
    """
    try:
        filters = payload.get("filters", {})
        if not filters:
            return {"status": "error", "message": "필터 조건이 필요합니다."}
        
        from turbo_engine import turbo_engine
        results = await turbo_engine.scan_with_filters(filters)
        
        return {
            "status": "success", 
            "data": results,
            "count": len(results),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        logger.error(f"❌ [Strategy Scan Error] {str(e)}")
        return {"status": "error", "message": f"스캔 중 오류가 발생했습니다: {str(e)}"}

@app.post("/api/community/strategies")
def post_strategy(data: dict):
    """발굴 필터 등록 (필터링 적용)"""
    title = data.get("title", "")
    desc = data.get("description", "")
    
    # 제목과 설명 모두 필터링
    for content in [title, desc]:
        is_safe, reason = CommunityGuardian.is_safe(content)
        if not is_safe:
            return {"status": "blocked", "message": "🚨 부적절한 설명 포함: '무조건', '수익확정' 등 과장된 수식어는 사용할 수 없습니다."}
            
    new_strat = {
        "id": len(STRATEGY_MARKET) + 1,
        "user_name": data.get("user_name", "익명"),
        "title": title,
        "description": desc,
        "filters": data.get("filters", {}),
        "likes": 0,
        "usage_count": 0,
        "timestamp": datetime.now().isoformat()
    }
    STRATEGY_MARKET.append(new_strat)
    return {"status": "success", "data": new_strat}

# ------------------------------------------------------------
# [AI Sentiment] 라운지 여론 요약 분석
# ------------------------------------------------------------
@app.get("/api/community/hot-stocks")
def get_hot_stocks():
    """실시간 인기 종목 토론 랭킹 (메시지 수 기준 상위 10개)"""
    from collections import Counter
    # 전역 라운지 제외한 종목별 메시지 집계
    symbols = [c['symbol'] for c in COMMUNITY_CHATS if c.get('symbol') and c['symbol'] != 'global']
    counter = Counter(symbols)
    hot = [{"symbol": sym, "count": cnt} for sym, cnt in counter.most_common(10)]
    return {"status": "success", "data": hot}

@app.get("/api/community/sentiment/{symbol}")
@turbo_cache(ttl_seconds=60)
def get_lounge_sentiment(symbol: str):
    """AI가 해당 종목 토론방의 분위기를 객관적인 수치로 요약"""
    chats = [c['text'] for c in COMMUNITY_CHATS if c.get('symbol') == symbol]
    if not chats:
        return {"status": "success", "data": {"score": 50, "summary": "아직 토론 데이터가 부족합니다."}}
    
    # 키워드 기반 단순 분석 (추후 LLM 연동 가능)
    positive_words = ["상승", "좋네요", "호재", "수급", "기대", "추가매수", "실적"]
    negative_words = ["하락", "어렵네", "심각", "불안", "탈출", "악재", "매도"]
    
    pos_count = sum(1 for c in chats for w in positive_words if w in c)
    neg_count = sum(1 for c in chats for w in negative_words if w in c)
    
    total = pos_count + neg_count
    if total == 0:
        score = 50
    else:
        score = (pos_count / total) * 100
        
    summary = f"현재 {len(chats)}개의 의견 중 긍정 응답이 {score:.1f}%를 차지하고 있습니다. (순수 의견 통계)"
    
    return {"status": "success", "data": {"score": score, "summary": summary}}

@app.get("/api/market/indices")
@turbo_cache(ttl_seconds=60)
def read_global_market_indices():
    """
    [FLIP TICKER] 국내 및 글로벌 주요 지수(KOSPI, KOSDAQ, S&P500, NASDAQ, 환율) 통합 반환
    """
    results = []
    
    # 1. 국내 지수 (Scraped from Naver)
    kr_indices = get_korean_market_indices()
    if kr_indices:
        results.append({"name": "KOSPI", "value": kr_indices["kospi"]["value"], "change": kr_indices["kospi"]["change"], "percent": kr_indices["kospi"]["percent"], "direction": kr_indices["kospi"]["direction"]})
        results.append({"name": "KOSDAQ", "value": kr_indices["kosdaq"]["value"], "change": kr_indices["kosdaq"]["change"], "percent": kr_indices["kosdaq"]["percent"], "direction": kr_indices["kosdaq"]["direction"]})
        
    # 2. 글로벌 지수 (YFinance - optimized background check)
    global_symbols = {
        "S&P 500": "^GSPC",
        "NASDAQ": "^IXIC",
        "USD/KRW": "KRW=X"
    }
    
    import yfinance as yf
    for name, sym in global_symbols.items():
        try:
            ticker = yf.Ticker(sym)
            info = ticker.fast_info
            curr = info.last_price
            prev = info.previous_close
            diff = curr - prev
            pct = (diff / prev * 100) if prev else 0
            
            direction = "Up" if diff > 0 else "Down" if diff < 0 else "Equal"
            
            results.append({
                "name": name,
                "value": f"{curr:,.2f}" if "KRW" not in name else f"{curr:,.1f}",
                "change": f"{diff:+,.2f}" if "KRW" not in name else f"{diff:+,.1f}",
                "percent": f"{pct:+.2f}%",
                "direction": direction
            })
        except:
            continue
            
    return {"status": "success", "data": results}

@app.get("/api/korea/indices")
def read_korea_indices():
    """국내 지수 (KOSPI, KOSDAQ, KOSPI200) (Turbo Cache 적용)"""
    cache_key = "korea_market_indices"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {"status": "success", "data": cached, "turbo": True}
        
    data = get_korean_market_indices()
    if data:
        turbo_engine.set_cache(cache_key, data)
    return {"status": "success", "data": data, "turbo": False}

@app.get("/api/korea/sectors")
@turbo_cache(ttl_seconds=300)
def read_korea_sectors():
    """국내 업종 상위 (간단 데이터)"""
    data = get_top_sectors()
    return {"status": "success", "data": data}

@app.get("/api/korea/sector_heatmap")
@turbo_cache(ttl_seconds=300)
async def read_korea_sector_heatmap():
    """업종 히트맵 실시간 상세 데이터"""
    from korea_data import get_sector_heatmap_data
    data = await get_sector_heatmap_data()
    return {"status": "success", "data": data}


@app.get("/api/korea/heatmap")
@turbo_cache(ttl_seconds=300)
async def read_korea_heatmap():
    """테마 히트맵 데이터"""
    from korea_data import get_theme_heatmap_data
    data = await get_theme_heatmap_data()
    return {"status": "success", "data": data}

@app.get("/api/korea/investors")
@turbo_cache(ttl_seconds=60)
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
@turbo_cache(ttl_seconds=60)
def read_korea_chart(symbol: str):
    """지수 차트 데이터"""
    data = get_index_chart_data(symbol)
    return {"status": "success", "data": data}


@app.get("/api/stock/{symbol}/investors/live")
@turbo_cache(ttl_seconds=60)
def read_live_investors(symbol: str):
    """장중 잠정 투자자 동향 (라이브)"""
    symbol = urllib.parse.unquote(symbol)
    data = get_live_investor_estimates(symbol)
    if data:
        return {"status": "success", "data": data}
    else:
        return {"status": "error", "message": "Failed to fetch live investor data"}


@app.get("/api/stock/{symbol}/investors/history")
@turbo_cache(ttl_seconds=3600)
def read_history_investors(symbol: str):
    """최근 투자자별 순매수 동향 (일별, 20일치)"""
    symbol = urllib.parse.unquote(symbol)
    # Default 40일치에서 20일치만 프론트엔드에 전달 (차트용 가독성)
    history = get_investor_history(symbol, days=20)
    
    if history and len(history) > 0:
        return {"status": "success", "data": history}
    else:
        return {"status": "error", "message": "Failed to fetch investor history data"}





# [v3.0.2 CRITICAL] /api/stock/search MUST be defined BEFORE /api/stock/{symbol}
# FastAPI matches routes in registration order - putting {symbol} first causes
# '/api/stock/search' to match {symbol}='search', returning wrong stock data.
@app.get("/api/stock/search")
def search_stock_api(q: str):
    """
    Search for stock by name or code (KR + Global)
    [v3.0.2] CRITICAL FIX: Moved before dynamic {symbol} route
    """
    if not q:
        return {"status": "error", "message": "Query parameter 'q' is required"}
    
    # Unicode Normalization (NFC) for robust matching
    q_norm = unicodedata.normalize('NFC', q.strip())
    
    print(f"\n[Search v3.0.2] Query: '{q}' -> Normalized: '{q_norm}'")

    # 1. If already 6-digit code, return immediately
    if q_norm.isdigit() and len(q_norm) == 6:
        print(f" -> Found direct KR code: {q_norm}")
        return {
            "status": "success", 
            "data": [{"code": q_norm, "symbol": q_norm, "name": q_norm, "market": "KR"}]
        }
    
    # 2. Try Korea (Internal Map -> Naver AC -> Yahoo KR -> Naver Search)
    kr_result = search_stock_code(q_norm)
    if kr_result and kr_result.isdigit() and len(kr_result) == 6:
        print(f" -> [SUCCESS KR] '{q_norm}' -> {kr_result}")
        return {
            "status": "success", 
            "data": [{"code": kr_result, "symbol": kr_result, "name": q_norm, "market": "KR"}]
        }

    # 3. Try Global (Yahoo Finance - Korean chars blocked inside)
    gb_result = search_global_ticker(q_norm)
    if gb_result:
        print(f" -> [SUCCESS Global] '{q_norm}' -> {gb_result}")
        return {
            "status": "success", 
            "data": [{"code": gb_result, "symbol": gb_result, "name": q_norm, "market": "Global"}]
        }

    print(f" -> [FAILED] No stock found for: '{q_norm}'")
    return {"status": "error", "message": f"해당 종목을 찾을 수 없습니다: '{q_norm}'"}


@app.get("/api/stock/{symbol}")
def read_stock(symbol: str, skip_ai: bool = False):
    import urllib.parse
    # URL 인코딩 해제 (한글 종목명 처리)
    symbol = urllib.parse.unquote(symbol).strip()
    
    # [Turbo Cache] Only cache if AI analysis is included
    cache_key = f"stock_full_{symbol}_{skip_ai}"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {"status": "success", "data": cached, "turbo": True}

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

                    "rationale": ai_result.get("rationale", {}),
                    "related_stocks": ai_result.get("related_stocks", [])
                })
            except Exception as e:
                print(f"AI Analysis Failed: {e}")
                # AI 분석 실패해도 기본 데이터는 반환

        # 분석 결과 DB 저장 (히스토리용)
        if not skip_ai:
            save_analysis_result(data)
        
        turbo_engine.set_cache(cache_key, data)
        return {"status": "success", "data": data, "turbo": False}
    else:
        return {"status": "error", "message": f"Stock not found or error fetching data for '{symbol}'"}

@app.get("/api/stock/{symbol}/news")
def read_stock_news(symbol: str, period: str = "1d"):
    """기간별 종목 뉴스/공시 수집"""
    symbol = urllib.parse.unquote(symbol)
    
    # period -> days 변환
    days_map = {
        "1d": 1,
        "1w": 7,
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365,
        "all": 3650
    }
    days = days_map.get(period, 1)
    
    news = get_integrated_stock_news(symbol=symbol, days=days)
    return {"status": "success", "data": news or []}

@app.get("/api/quote/{symbol}")
def read_quote(symbol: str):
    """AI 분석 없이 시세만 빠르게 조회 (Turbo Cache 적용)"""
    symbol = urllib.parse.unquote(symbol)
    
    cache_key = f"quote_simple_{symbol}"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {"status": "success", "data": cached, "turbo": True}
        
    data = get_simple_quote(symbol)
    if data:
        turbo_engine.set_cache(cache_key, data)
        return {"status": "success", "data": data, "turbo": False}
    else:
        # 실패 시 에러보다는 빈 데이터 반환하여 UI가 죽지 않게
        return {"status": "error", "message": "Failed to fetch quote"}

@app.get("/api/stock/{symbol}/history")
def read_stock_history(symbol: str):
    """특정 종목의 AI 분석 점수 히스토리 반환"""
    history = get_score_history(symbol)
    return {"status": "success", "data": history}

@app.get("/api/stock/{symbol}/dart_overhang")
def read_stock_dart_overhang_investments(symbol: str):
    """종목별 오버행(CB/BW/유상증자 등) 및 타법인출자 관련 트래커 API"""
    from dart_disclosure import get_dart_overhang_and_investments
    
    try:
        data = get_dart_overhang_and_investments(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Overhang API Error: {e}")
        return {"status": "error", "message": "핵심 공시 정보를 분석 중 오류가 발생했습니다"}

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
    
    # AI 분석 리포트 추가
    analysis_note = analyze_portfolio(result['allocation'])
    result['analysis_note'] = analysis_note
    
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

@app.delete("/api/alerts/{id}")
def delete_alert_endpoint(id: int):
    """알림 삭제"""
    delete_alert(id)
    return {"status": "success"}

@app.get("/api/market/scanner")
def read_market_scanner():
    """현재 증시 생존 지표 및 실시간 주요 특이 공시 조회"""
    try:
        stats = get_market_summary_stats()
        disclosures = get_live_disclosures()
        # Ensure stats and disclosures are not None
        safe_stats = stats if stats else {"kospi": {"up":0,"same":0,"down":0}, "kosdaq": {"up":0,"same":0,"down":0}}
        safe_disclosures = disclosures if disclosures is not None else []
        return {"status": "success", "data": {"stats": safe_stats, "disclosures": safe_disclosures}}
    except Exception as e:
        print(f"Market Scanner API Error: {e}")
        return {"status": "error", "message": str(e), "data": {"stats": {"kospi": {"up":0,"same":0,"down":0}, "kosdaq": {"up":0,"same":0,"down":0}}, "disclosures": []}}



@app.get("/api/theme/{keyword:path}")
@app.get("/api/theme")
async def read_theme(keyword: str = None, keyword_q: str = Query(None, alias="keyword")):
    """테마 키워드 분석 (실시간 시세 포함) - 경로 및 쿼리 파라미터 동시 지원"""
    actual_keyword = keyword or keyword_q
    if not actual_keyword:
         return {"status": "error", "message": "키워드가 필요합니다."}
    
    # keyword 변수를 actual_keyword로 덮어쓰거나 이후 로직에서 actual_keyword 사용
    keyword = actual_keyword
    
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

# ============================================================
# FCM Token Management
# ============================================================
class FCMRegisterRequest(BaseModel):
    token: str
    device_type: str = "web"
    device_name: str = None

@app.post("/api/fcm/register")
def register_fcm_token(req: FCMRegisterRequest, x_user_id: str = Header(None)):
    """FCM 토큰 등록 (알림 수신용)"""
    user_id = x_user_id if x_user_id else "guest"
    
    success = save_fcm_token(user_id, req.token, req.device_type, req.device_name)
    
    if success:
        print(f"[FCM] Registered token for user {user_id}: {req.token[:10]}...")
        return {"status": "success", "message": "FCM token registered"}
    else:
        return {"status": "error", "message": "Failed to register FCM token"}

@app.post("/api/fcm/unregister")
def unregister_fcm_token(req: FCMRegisterRequest):
    """FCM 토큰 삭제 (로그아웃 시)"""
    success = delete_fcm_token(req.token)
    if success:
        return {"status": "success", "message": "FCM token unregistered"}
    else:
        return {"status": "error", "message": "Failed to unregister FCM token"}

from auth import router as auth_router
app.include_router(auth_router, prefix="/api")

class WatchlistRequest(BaseModel):
    symbol: str



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
    # [Fix] Symbol might be URL encoded (e.g. .KS)
    decoded_symbol = urllib.parse.unquote(symbol)
    remove_watchlist(user_id, decoded_symbol)
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

@app.get("/api/watchlist/cb-alerts")
def read_watchlist_cb_alerts(x_user_id: str = Header(None)):
    """관심 종목의 최신 전환사채(CB)/오버행 공시 알림 조회"""
    from dart_disclosure import get_dart_disclosures
    from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES

    user_id = x_user_id if x_user_id else "guest"
    symbols = get_watchlist(user_id)

    # 전환사채 관련 키워드
    CB_KEYWORDS = ['전환사채', '신주인수권부사채', 'CB', 'BW', '유상증자', '전환청구권', '교환사채', '감자', '신주발행']

    results = []
    for sym in symbols[:10]:  # 최대 10개 종목 (속도 제한)
        try:
            # 한국 종목 코드만 처리 (숫자 6자리)
            code = sym.split('.')[0]
            if not (code.isdigit() and len(code) == 6):
                continue

            disclosures = get_dart_disclosures(sym)
            # CB 관련 공시만 필터링
            cb_items = [d for d in disclosures if any(kw in d.get('title', '') for kw in CB_KEYWORDS)]

            if cb_items:
                name = sym
                kor = get_korean_stock_name(sym)
                if kor:
                    name = kor
                elif sym in GLOBAL_KOREAN_NAMES:
                    name = GLOBAL_KOREAN_NAMES[sym]

                for item in cb_items[:3]:  # 종목당 최대 3건
                    results.append({
                        "symbol": sym,
                        "name": name,
                        "title": item["title"],
                        "date": item["date"],
                        "link": item["link"],
                        "type": "CB_DISCLOSURE"
                    })
        except Exception as e:
            print(f"CB Alert fetch error for {sym}: {e}")

    # 최신순 정렬
    results.sort(key=lambda x: x.get("date", ""), reverse=True)
    return {"status": "success", "data": results}


class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    """AI 데이터 분석 챗봇"""
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


@app.get("/api/market")
def read_market():
    """주요 지수(S&P500 등) 데이터 반환"""
    data = get_market_data()
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
def read_chart_patterns(symbol: str, interval: str = "1d", period: str = None):
    """AI 차트 패턴 및 지지/저항선 분석"""
    import urllib.parse
    symbol = urllib.parse.unquote(symbol).strip()
    
    try:
        from chart_analysis import get_chart_analysis_full
        data = get_chart_analysis_full(symbol, interval=interval, period=period)
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



from rank_data import get_realtime_top10

@app.get("/api/rank/top10/{market}")
@turbo_cache(ttl_seconds=60)
def read_rank_top10(market: str):
    """실시간 시총 상위 10 (KR/US)"""
    market = market.upper()
    data = get_realtime_top10(market)
    return {"status": "success", "data": data}

from rank_data import get_naver_ranking

@app.get("/api/rank/naver/{market}/{rank_type}")
@turbo_cache(ttl_seconds=60)
def read_naver_ranking(market: str, rank_type: str):
    """네이버 금융 실시간 TOP종목 반환 (NXT/KRX)"""
    market = market.lower()
    rank_type = rank_type.lower()
    
    if market not in ["krx", "nxt"]:
        return {"status": "error", "message": "Invalid market"}
    if rank_type not in ["quant", "rise", "fall", "market_sum", "popular"]:
        return {"status": "error", "message": "Invalid rank_type"}
        
    try:
        data = get_naver_ranking(market, rank_type)
        return {"status": "success", "data": data if data is not None else []}
    except Exception as e:
        print(f"Naver Ranking API Error: {e}")
        return {"status": "error", "message": str(e), "data": []}





@app.get("/api/market/status")
def read_market_status():
    """시장 상태 분석 결과 반환"""
    status = get_market_status()
    return {"status": "success", "data": status}

@app.get("/api/korea/ipo")
def read_ipo_calendar():
    """한국 IPO 일정 조회"""
    data = get_ipo_data()
    return {"status": "success", "data": data}

class AnalysisRequest(BaseModel):
    portfolio: list[str]

@app.post("/api/portfolio/analysis")
def create_portfolio_analysis(req: AnalysisRequest):
    """내 계좌 데이터 분석 (AI 분석)"""
    result = analyze_portfolio_data(req.portfolio)
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
    AI 분석 + 뉴스 리스크 + 상세 분석
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
다음은 {risk_analysis['company_name']} ({symbol})의 위험도 데이터 분석 결과입니다:

{detailed_report}

데이터 분석가의 관점에서 다음 내용을 객관적으로 요약해주세요:
1. 데이터상으로 나타나는 주요 리스크 요인 3가지
2. 재무 및 지표 측면에서 주의 깊게 살펴봐야 할 수치
3. 과거 유사한 지표 패턴을 보였던 사례의 통계적 추이

전문적이고 객관적인 톤으로 작성해주세요.
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
# Company Analysis Score (회사 데이터 분석 점수)
# ============================================================

from risk_analyzer import calculate_analysis_score

@app.get("/api/health/{symbol}")
def get_company_analysis_score(symbol: str):
    """
    회사 데이터 분석 점수 조회 (0-100)
    재무제표를 단일 점수와 캐릭터로 시각화
    """
    result = calculate_analysis_score(symbol)
    
    if not result.get("success"):
        return {"status": "error", "message": result.get("error", "분석 실패")}
    
    return {"status": "success", "data": result}


# ============================================================
# Stock History Storytelling (주식 위인전)
# ============================================================

from stock_events import get_chart_story

@app.get("/api/chart/story/{symbol}")
def get_stock_story(symbol: str, period: str = "1y", interval: str = "1d"):
    """
    차트 스토리텔링 데이터 조회
    주요 변곡점에 역사적 이벤트 매칭
    
    Args:
        symbol: 종목 코드
        period: 기간 (1mo, 3mo, 6mo, 1y, 2y, 5y)
        interval: 데이터 간격 (1d, 1wk, 1mo)
    """
    result = get_chart_story(symbol, period, interval)
    
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


@app.get("/api/market/trending-themes")
def get_trending_themes_api(limit: int = 6):
    """실시간 인기 검색 테마 (네이버 금융 기반)"""
    try:
        from korea_data import get_top_trending_themes
        themes = get_top_trending_themes(limit=limit)
        return {"status": "success", "data": [t["name"] for t in themes]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/market/calendar/korea")
def get_korea_calendar():
    """한국 경제 지표 전용 API"""
    try:
        from stock_data import get_korea_economic_indicators
        data = get_korea_economic_indicators()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Korea Calendar Error: {e}")
        return {"status": "error", "message": str(e)}


# ============================================================
# Portfolio Risk API Models
# ============================================================

from typing import List

class PortfolioItem(BaseModel):
    symbol: str
    weight: float

class PortfolioAnalysisRequest(BaseModel):
    allocation: List[PortfolioItem]

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

class FCMTestRequest(BaseModel):
    token: Optional[str] = None

@app.post("/api/fcm/test")
def test_fcm_notification(req: FCMTestRequest, x_user_id: str = Header(None)):
    """FCM 테스트 알림 발송 (직접 호출)"""
    from firebase_config import send_push_notification, send_multicast_notification
    from db_manager import get_user_fcm_tokens
    
    user_id = x_user_id if x_user_id else "guest"
    
    # 1. 대상 토큰 확보
    tokens = []
    if req.token:
        tokens = [req.token]
    else:
        user_tokens = get_user_fcm_tokens(user_id)
        tokens = [t['token'] for t in user_tokens]
    
    if not tokens:
        return {"status": "error", "message": "등록된 기기가 없습니다. (No tokens found)"}
        
    # 2. 알림 발송
    title = "🔔 [Test] Connection Verified"
    body = "System is working perfectly! (시스템이 정상 작동 중입니다)"
    
    try:
        if len(tokens) == 1:
            result = send_push_notification(tokens[0], title, body)
        else:
            result = send_multicast_notification(tokens, title, body)
            
        return {"status": "success", "count": len(tokens), "result": result}
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









@app.post("/api/portfolio/risk")
def check_portfolio_risk_api(request: PortfolioAnalysisRequest):
    """
    포트폴리오 리스크(Lock-up, CB/BW) 분석
    """
    try:
        symbols = [item.symbol for item in request.allocation]
        risks = analyze_portfolio_risk(symbols)
        return {"status": "success", "risks": risks}
    except Exception as e:
        print(f"Risk Analysis Error: {e}")
        return {"status": "error", "message": str(e)}


# ============================================================
# Smart Signal APIs (스마트 시그널)
# ============================================================

# DB 테이블 초기화
try:
    create_signals_table()
    create_votes_table()
except Exception as e:
    print(f"[Init] Signal/Vote table init error: {e}")


@app.get("/api/signals")
def get_signals_feed(limit: int = Query(30)):
    """
    최근 감지된 스마트 시그널 반환
    """
    try:
        signals = get_recent_signals(limit=limit)
        return {
            "status": "success",
            "data": signals
        }
    except Exception as e:
        print(f"[Signals Feed Error] {str(e)}")
        return {"status": "error", "message": str(e), "data": []}



@app.get("/api/signals/{symbol}")
def get_symbol_signals(symbol: str, limit: int = 20):
    """특정 종목 시그널 조회"""
    try:
        signals = get_signals_by_symbol(symbol.upper(), limit)
        return {"status": "success", "data": signals}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/signals/scan")
def scan_signals_now():
    """
    관심 종목 시그널 스캔 (수동 트리거)
    거래량 폭증, 공시, 수급 이상을 한번에 감지
    """
    try:
        from smart_signals import scan_watchlist_signals
        
        # 기본 모니터링 종목 (인기 종목)
        default_symbols = [
            "005930", "000660", "373220", "035420", "035720",
            "051910", "006400", "068270", "028260", "207940"
        ]
        
        detected = scan_watchlist_signals(default_symbols)
        
        # DB에 저장
        saved = []
        for sig in detected:
            sig_id = save_signal(
                symbol=sig["symbol"],
                signal_type=sig["signal_type"],
                title=sig["title"],
                summary=sig["summary"],
                data=sig.get("data", {})
            )
            if sig_id:
                sig["id"] = sig_id
                saved.append(sig)
        
        return {
            "status": "success",
            "detected": len(detected),
            "saved": len(saved),
            "signals": saved
        }
    except Exception as e:
        print(f"Signal scan error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/signals/scan/watchlist")
def scan_my_watchlist_signals(x_user_id: str = Header(None)):
    """
    내 관심종목 전용 실시간 시그널 스캔
    """
    try:
        user_id = x_user_id or "guest"
        from db_manager import get_watchlist
        my_watchlist = get_watchlist(user_id)
        
        if not my_watchlist:
            return {"status": "error", "message": "관심종목이 없습니다."}
            
        from smart_signals import scan_watchlist_signals
        detected = scan_watchlist_signals(my_watchlist)
        
        # DB에 저장
        saved = []
        for sig in detected:
            sig_id = save_signal(
                symbol=sig["symbol"],
                signal_type=sig["signal_type"],
                title=sig["title"],
                summary=sig["summary"],
                data=sig.get("data", {})
            )
            if sig_id:
                sig["id"] = sig_id
                saved.append(sig)
        
        return {
            "status": "success",
            "detected": len(detected),
            "saved": len(saved),
            "signals": saved
        }
    except Exception as e:
        print(f"My Watchlist Signal scan error: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/api/signals/{symbol}/briefing")
def get_ai_briefing(symbol: str):
    """
    AI 1분 브리핑 — 종목의 재무·뉴스·수급을 중립적으로 요약
    """
    try:
        from ai_analysis import generate_stock_briefing
        result = generate_stock_briefing(symbol.upper())
        return {"status": "success", "data": result}
    except Exception as e:
        print(f"AI Briefing error: {e}")
        return {"status": "error", "message": str(e)}


class VoteRequest(pydantic.BaseModel):
    direction: str  # "up" or "down"


@app.post("/api/votes/{symbol}")
def submit_vote(symbol: str, req: VoteRequest, x_user_id: str = Header(None)):
    """종목 투표 (오를것/내릴것)"""
    try:
        user_id = x_user_id or "anonymous"
        if req.direction not in ("up", "down"):
            return {"status": "error", "message": "direction must be 'up' or 'down'"}
        
        result = save_vote(symbol.upper(), user_id, req.direction)
        vote_results = get_vote_results(symbol.upper())
        
        return {
            "status": "success",
            "vote": result,
            "results": vote_results
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/votes/{symbol}")
def read_vote_results(symbol: str, x_user_id: str = Header(None)):
    """종목 투표 결과 조회"""
    try:
        results = get_vote_results(symbol.upper())
        user_vote = None
        if x_user_id:
            user_vote = get_user_vote(symbol.upper(), x_user_id)
        
        return {
            "status": "success",
            "data": results,
            "user_vote": user_vote
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/investors/top")
def read_investor_top():
    """시장 주도주 (수급 대체): KOSPI/KOSDAQ 거래량 및 상승률 상위 - 네이버 금융 스크래핑"""
    try:
        import requests
        from bs4 import BeautifulSoup
        from korea_data import decode_safe

        headers = {"User-Agent": "Mozilla/5.0"}

        def scrape_market_leaders(url: str, limit: int = 7):
            try:
                res = requests.get(url, headers=headers, timeout=8)
                soup = BeautifulSoup(decode_safe(res), "html.parser")
                results = []
                
                table = soup.select_one("table.type_2")
                if not table:
                    return results

                rows = table.select("tr")
                for row in rows:
                    if len(results) >= limit:
                        break
                    cols = row.select("td")
                    if len(cols) < 5:
                        continue
                    try:
                        name_tag = cols[1].select_one("a")
                        if not name_tag:
                            continue
                        name = name_tag.text.strip()
                        
                        price = cols[2].text.strip()
                        change = cols[4].text.strip() # 상승률의 경우
                        volume = cols[5].text.strip() # 거래량의 경우
                        
                        if "quant" in url:
                            amount_val = f"{volume}주"
                        else:
                            amount_val = change
                        
                        results.append({
                            "name": name,
                            "price": price,
                            "amount": amount_val
                        })
                    except:
                        continue
                return results
            except Exception as e:
                print(f"[MarketLeaders] scrape error {url}: {e}")
                return []

        # 기존 프론트엔드 키(foreign_top 등)를 그대로 사용하여 데이터만 교체
        quant_kospi = scrape_market_leaders("https://finance.naver.com/sise/sise_quant.naver?sosok=0")
        quant_kosdaq = scrape_market_leaders("https://finance.naver.com/sise/sise_quant.naver?sosok=1")
        rise_kospi = scrape_market_leaders("https://finance.naver.com/sise/sise_rise.naver?sosok=0")
        rise_kosdaq = scrape_market_leaders("https://finance.naver.com/sise/sise_rise.naver?sosok=1")

        return {
            "status": "success",
            "data": {
                "foreign_top": quant_kospi,
                "institution_top": quant_kosdaq,
                "foreign_sell": rise_kospi,       
                "institution_sell": rise_kosdaq   
            }
        }
    except Exception as e:
        print(f"[MarketLeaders] Error: {e}")
        return {"status": "error", "message": str(e)}


# ============================================================
# 시장 인사이트 APIs (구 공매도 대체)
# ============================================================

@app.get("/api/market-insights")
def get_market_insights():
    """실시간 검색 상위 및 거래대금 상위 종목 조회"""
    try:
        import requests
        from bs4 import BeautifulSoup
        from korea_data import decode_safe

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive"
        }

        def scrape_table(url: str, limit: int = 20, is_search: bool = False):
            try:
                res = requests.get(url, headers=headers, timeout=10)
                # Naver Finance uses EUC-KR
                res.encoding = 'euc-kr'
                soup = BeautifulSoup(res.text, "html.parser")
                results = []
                
                # 검색 상위는 table.type_5, 거래대금은 table.type_2
                table = soup.select_one("table.type_5" if is_search else "table.type_2")
                if not table:
                    return results

                rows = table.select("tr")
                for row in rows:
                    if len(results) >= limit:
                        break
                    cols = row.select("td")
                    if len(cols) < 5:
                        continue
                    try:
                        # 이름 파싱
                        name_idx = 1 if is_search else 2
                        name_tag = cols[name_idx].select_one("a")
                        if not name_tag:
                            continue
                        name = name_tag.text.strip()
                        symbol = name_tag.get("href", "").split("code=")[-1] if name_tag.get("href") else ""
                        
                        if is_search:
                            price = cols[3].text.strip() if len(cols) > 3 else ""
                            change = cols[5].text.strip() if len(cols) > 5 else ""
                            amount_val = cols[2].text.strip() if len(cols) > 2 else "" # 검색비율
                        else:
                            price = cols[3].text.strip() if len(cols) > 3 else ""
                            change = cols[5].text.strip() if len(cols) > 5 else ""
                            # 거래대금 상위 페이지의 경우 6번째 컬럼이 거래대금(단위: 백만)
                            amount_val = cols[6].text.strip() + "백만" if len(cols) > 6 else ""

                        results.append({
                            "name": name,
                            "symbol": symbol,
                            "price": price,
                            "change": change,
                            "amount": amount_val
                        })
                    except Exception as ex:
                        continue
                return results
            except Exception as e:
                print(f"[Insights] scrape error {url}: {e}")
                return []

        # 1. 실시간 검색 상위 (20개)
        search_top = scrape_table("https://finance.naver.com/sise/lastsearch2.naver", limit=20, is_search=True)
        
        # 2. 거래대금 상위 (KOSPI 10개, KOSDAQ 10개)
        val_kospi = scrape_table("https://finance.naver.com/sise/sise_quant_high.naver?sosok=0", limit=10)
        val_kosdaq = scrape_table("https://finance.naver.com/sise/sise_quant_high.naver?sosok=1", limit=10)

        return {
            "status": "success",
            "data": {
                "search_top": search_top,
                "value_top": val_kospi + val_kosdaq # 합쳐서 20개
            }
        }

    except Exception as e:
        print(f"Market insights error: {e}")
        return {"status": "error", "message": str(e)}

# ============================================================
# 투자 캘린더 APIs
# ============================================================

@app.get("/api/calendar/events")
def get_calendar_events():
    """실적/배당/IPO 일정 통합 조회"""
    try:
        events = []

        # 1. IPO 일정
        try:
            from korea_data import get_ipo_data
            import datetime
            ipo_data = get_ipo_data()
            current_year = datetime.datetime.now().year
            
            if ipo_data:
                for ipo in (ipo_data if isinstance(ipo_data, list) else []):
                    # 날짜 정제 로직 (Ex: "2025.12.02~12.03" -> "2025-12-02")
                    raw_date = ipo.get("date", "")
                    if "~" in raw_date:
                        raw_date = raw_date.split("~")[0].strip()
                        
                    parts = raw_date.split('.')
                    if len(parts) == 3:
                        formatted_date = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                    elif len(parts) == 2:
                        formatted_date = f"{current_year}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
                    else:
                        formatted_date = raw_date.replace(".", "-")

                    # 종목 코드가 비어있는 경우 대응
                    code = ipo.get("code", "")
                    if not code:
                        code = "IPO"

                    events.append({
                        "symbol": code,
                        "name": ipo.get("name", ""),
                        "type": "ipo",
                        "date": formatted_date,
                        "detail": "공모 청약"
                    })
        except Exception as e:
            print(f"IPO calendar error: {e}")

        # 2 & 3. 실적 & 배당 일정 (실제 데이터 연동)
        try:
            from stock_data import get_real_stock_events
            real_events = get_real_stock_events()
            events.extend(real_events)
        except Exception as e:
            print(f"Real stock events error: {e}")

        # 과거 일정(오늘 기준 이전 날짜) 표기 제외 필터
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        filtered_events = []
        for ev in events:
            # 날짜 형식이 YYYY-MM-DD 인지 확인 후 오늘보다 크거나 같으면 통과
            if ev.get("date") and ev.get("date") >= today_str:
                filtered_events.append(ev)

        return {"status": "success", "data": filtered_events}

    except Exception as e:
        print(f"Calendar events error: {e}")
        return {"status": "error", "message": str(e)}


# ============================================================
# 프로 분석 APIs (퀀트 / 재무 / 동종비교)
# ============================================================

@app.get("/api/quant/{symbol}")
def read_quant_scorecard(symbol: str):
    """[TurboQuant] 퀀트 스코어카드 (5축 팩터 분석 + Turbo Cache)"""
    cache_key = f"quant_score_{symbol}"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {"status": "success", "data": cached, "turbo": True}

    try:
        from pro_analysis import get_quant_scorecard
        data = get_quant_scorecard(symbol)
        if data.get("total_score", 0) > 0:
            turbo_engine.set_cache(cache_key, data)
        return {"status": "success", "data": data, "turbo": False}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/financial-health/{symbol}")
def read_financial_health(symbol: str):
    """[TurboQuant] 재무 건전성 스캐너 (Z-Score + F-Score + Turbo Cache)"""
    cache_key = f"financial_health_{symbol}"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {"status": "success", "data": cached, "turbo": True}

    try:
        from pro_analysis import get_financial_health
        data = get_financial_health(symbol)
        if data.get("health_score", 0) > 0:
            turbo_engine.set_cache(cache_key, data)
        return {"status": "success", "data": data, "turbo": False}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/peer-compare")
def read_peer_comparison(symbols: str = Query(..., description="쉼표 구분 종목코드")):
    """동종업계 비교 분석"""
    try:
        from pro_analysis import get_peer_comparison
        symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
        data = get_peer_comparison(symbol_list)
        return {"status": "success", **data}
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


@app.get("/api/votes/{symbol}/yesterday")
def get_yesterday_vote_comparison(symbol: str):
    """어제 커뮤니티 투표 예측 vs 실제 주가 비교"""
    try:
        import yfinance as yf

        sym = symbol.upper()
        yesterday_votes = get_yesterday_vote_results(sym)

        if yesterday_votes["total"] == 0:
            return {"status": "success", "data": None, "message": "어제 투표 데이터 없음"}

        yf_sym = sym
        if sym.isdigit() and len(sym) == 6:
            yf_sym = sym + ".KS"

        ticker = yf.Ticker(yf_sym)
        hist = ticker.history(period="5d")

        actual_change_pct = None
        prediction = "up" if yesterday_votes["up_pct"] >= 50 else "down"
        is_correct = None
        actual_direction = None

        if len(hist) >= 2:
            closes = hist["Close"].tolist()
            prev_close = closes[-2]
            last_close = closes[-1]
            if prev_close and prev_close > 0:
                actual_change_pct = round(((last_close - prev_close) / prev_close) * 100, 2)
                actual_direction = "up" if actual_change_pct > 0 else "down"
                is_correct = (prediction == actual_direction)

        return {
            "status": "success",
            "data": {
                "symbol": sym,
                "yesterday_votes": yesterday_votes,
                "prediction": prediction,
                "actual_change_pct": actual_change_pct,
                "actual_direction": actual_direction,
                "is_correct": is_correct,
            }
        }
    except Exception as e:
        print(f"[Vote Yesterday] Error: {e}")
        return {"status": "error", "message": str(e)}
