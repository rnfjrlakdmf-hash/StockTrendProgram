from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Stock Analyst", version="1.0.0")

# Force Reload Trigger 4
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
from korea_data import get_naver_disclosures, get_naver_market_dashboard, get_naver_market_index_data, get_naver_sise_data, get_naver_main_data, get_ipo_data, get_live_investor_estimates, get_theme_heatmap_data, get_indexing_status, search_stock_code
from db_manager import save_analysis_result, get_score_history, add_watchlist, remove_watchlist, get_watchlist, cast_vote, get_vote_stats, get_prediction_report
from pydantic import BaseModel, Field

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


@app.get("/api/stock/{symbol}/investors/live")
def read_live_investors(symbol: str):
    """장중 잠정 투자자 동향 (라이브)"""
    symbol = urllib.parse.unquote(symbol)
    data = get_live_investor_estimates(symbol)
    if data:
        return {"status": "success", "data": data}
    else:
        return {"status": "error", "message": "Failed to fetch live investor data"}

@app.get("/api/korea/heatmap")
def read_korea_heatmap():
    """테마별 히트맵 데이터"""
    # This might be slow, so we can consider caching here too if needed
    data = get_theme_heatmap_data()
    return {"status": "success", "data": data}

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
        # AI 분석 실행 (skip_ai가 False이고, MARKET이 아닐 때만)
        if not skip_ai and data["symbol"] != "MARKET":
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
def read_theme(keyword: str):
    """테마 키워드 분석 (실시간 시세 포함)"""
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
                        # change_percent가 있다면 사용, 없으면 change 문자열에서 추출 시도
                        stock["change_percent"] = q.get("change_percent", "0%") 
                    else:
                        stock["price"] = "-"
                        stock["change"] = "-"
            except Exception as e:
                stock["price"] = "-"
                stock["change"] = "-"

        return {"status": "success", "data": result}
    else:
        return {"status": "error", "message": "Failed to analyze theme"}

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
def clear_all_watchlist():
    """관심 종목 전체 삭제"""
    from db_manager import clear_watchlist
    clear_watchlist()
    return {"status": "success"}

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

def dashboard_bg_looper():
    """Background task to keep dashboard cache warm"""
    global dashboard_cache
    print("Starting dashboard background updater...")
    while True:
        try:
            data = get_naver_market_dashboard()
            if data and len(data.get("exchange", [])) > 0:
                dashboard_cache["data"] = data
                dashboard_cache["timestamp"] = time.time()
                
                # Persist cache to file
                try:
                    with open(CACHE_FILE_PATH, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False)
                except Exception as e:
                    print(f"Failed to save cache file: {e}")
                    
        except Exception as e:
            print(f"Background Update Error: {e}")
        time.sleep(CACHE_DURATION)

def load_persistent_cache():
    """Load cached data from file on startup"""
    global dashboard_cache
    if os.path.exists(CACHE_FILE_PATH):
        try:
            with open(CACHE_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data:
                    dashboard_cache["data"] = data
                    dashboard_cache["timestamp"] = time.time() # Refresh timestamp to serve immediately
                    print("loaded dashboard cache from file")
        except Exception as e:
            print(f"Failed to load cache file: {e}")

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
    load_persistent_cache()
    
    t_dash = threading.Thread(target=dashboard_bg_looper, daemon=True)
    t_dash.start()
    
    t_rank = threading.Thread(target=ranking_bg_looper, daemon=True)
    t_rank.start()

@app.get("/api/korea/dashboard")
def read_korea_dashboard():
    """한국 증시 주요 지표 (환율, 금리, 유가, 업종, 테마) 크롤링"""
    global dashboard_cache
    current_time = time.time()
    
    # Check cache (Stale-While-Revalidate: 데이터가 있으면 즉시 반환)
    if dashboard_cache["data"]:
        return {"status": "success", "data": dashboard_cache["data"], "cached": True}
        
    try:
        data = get_naver_market_dashboard()
        # Only cache if valid (must have exchange data at least)
        if data and len(data.get("exchange", [])) > 0:
            dashboard_cache["data"] = data
            dashboard_cache["timestamp"] = current_time
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Dashboard Fetch Error: {e}")
        # Fallback to stale cache if error occurs
        if dashboard_cache["data"]:
             return {"status": "success", "data": dashboard_cache["data"], "cached": True, "stale": True}
        return {"status": "error", "message": "Failed to fetch dashboard data", "data": {}}

@app.get("/api/korea/indices")
def read_korea_indices():
    """한국 증시: 환율, 유가, 금리, 원자재 등 시장 지표만 반환"""
    global dashboard_cache
    
    # Cache hit
    if dashboard_cache["data"]:
        cached = dashboard_cache["data"]
        return {"status": "success", "data": {
            "exchange": cached.get("exchange", []),
            "world_exchange": cached.get("world_exchange", []),
            "oil": cached.get("oil", []),
            "gold": cached.get("gold", []),
            "interest": cached.get("interest", []),
            "raw_materials": cached.get("raw_materials", [])
        }, "cached": True}

    # Cache miss
    try:
        data = get_naver_market_index_data()
        return {"status": "success", "data": data}
    except Exception as e:
         print(f"Indices Fetch Error: {e}")
         return {"status": "error", "message": "Failed to fetch indices", "data": {}}



@app.get("/api/korea/sectors")
def read_korea_sectors():
    """한국 증시: 업종 및 테마 상위 데이터만 반환"""
    global dashboard_cache

    if dashboard_cache["data"]:
        cached = dashboard_cache["data"]
        return {"status": "success", "data": {
            "top_sectors": cached.get("top_sectors", []),
            "top_themes": cached.get("top_themes", [])
        }, "cached": True}

    try:
        data = get_naver_sise_data()
        return {"status": "success", "data": {"top_sectors": data.get("top_sectors", []), "top_themes": data.get("top_themes", [])}}
    except Exception as e:
        print(f"Sectors Fetch Error: {e}")
        return {"status": "error", "message": "Failed to fetch sectors", "data": {}}

@app.get("/api/korea/chart/{symbol}")
def get_korea_chart(symbol: str):
    from korea_data import get_index_chart_data
    data = get_index_chart_data(symbol)
    return {"status": "success", "data": data}

@app.get("/api/stock/chart/{symbol}")
def get_stock_chart(symbol: str):
    from stock_data import get_stock_chart_data
    # 기본은 1일치 5분봉
    data = get_stock_chart_data(symbol, period="1d", interval="5m")
    return {"status": "success", "data": data}

@app.get("/api/korea/investors")
def read_korea_investors():
    """한국 증시: 투자자별 매매동향 및 메인 요약 반환 (가장 느릴 수 있음)"""
    global dashboard_cache

    if dashboard_cache["data"]:
        cached = dashboard_cache["data"]
        return {"status": "success", "data": {
            "market_summary": cached.get("market_summary", {}),
            "investor_items": cached.get("investor_items", {})
        }, "cached": True}

    try:
        sise = get_naver_sise_data()
        main = get_naver_main_data()
        return {
            "status": "success", 
            "data": {
                "market_summary": main.get("market_summary", {}),
                "investor_items": sise.get("investor_items", {})
            }
        }
    except Exception as e:
        print(f"Investors Fetch Error: {e}")
        return {"status": "error", "message": "Failed to fetch investor data", "data": {}}

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

@app.get("/api/chart/patterns/{symbol}")
def read_chart_patterns(symbol: str):
    """AI 차트 패턴 및 지지/저항선 분석"""
    data = analyze_chart_patterns(symbol)
    if not data:
        return {"status": "error", "message": "Failed to analyze chart patterns"}
    return {"status": "success", "data": data}

@app.get("/api/rank/top10/{market}")
def read_top10(market: str):
    """실시간 시총 상위 10개 조회 (market: KR or US)"""
    try:
        data = get_realtime_top10(market.upper())
        return {"status": "success", "data": data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        # 에러 발생 시 빈 리스트 반환하여 프론트엔드 에러 방지
        return {"status": "error", "data": []}

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

from stock_data import get_market_status
from ai_analysis import diagnose_portfolio_health

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
    # 현재 시간 기준 장 마감 여부 간단 체크 (데모용: 실제로는 복잡한 휴장일 로직 필요)
    # 한국장: 평일 15:40 이후 / 미국장: 평일 06:10 이후
    # 여기서는 데이터만 주면 프론트가 판단하도록 함
    
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)