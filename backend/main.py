from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Stock Analyst", version="1.0.0")

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
from alerts import add_alert, get_alerts, delete_alert, check_alerts
from chatbot import chat_with_ai
from korea_data import get_naver_disclosures
from db_manager import save_analysis_result, get_score_history, add_watchlist, remove_watchlist, get_watchlist, cast_vote, get_vote_stats
from pydantic import BaseModel, Field

@app.get("/api/stock/{symbol}")
def read_stock(symbol: str):
    data = get_stock_info(symbol)
    if data:
        # AI 분석 실행
        ai_result = analyze_stock(data)
        
        # 분석 결과를 기존 데이터에 병합 (점수, 코멘트 업데이트)
        data.update({
            "score": ai_result.get("score", 50),
            "metrics": ai_result.get("metrics", {"supplyDemand": 50, "financials": 50, "news": 50}),
            "summary": ai_result.get("analysis_summary", data["summary"])  # 기존 요약 덮어쓰기
        })
        
        # [New] 분석 결과 DB 저장 (히스토리용)
        save_analysis_result(data)
        
        return {"status": "success", "data": data}
    else:
        return {"status": "error", "message": "Stock not found or error fetching data"}

@app.get("/api/quote/{symbol}")
def read_quote(symbol: str):
    """AI 분석 없이 시세만 빠르게 조회"""
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

@app.get("/api/alerts")
def read_alerts():
    """저장된 모든 알림 반환"""
    return {"status": "success", "data": get_alerts()}

@app.post("/api/alerts")
def create_alert(req: AlertRequest):
    """새 알림 생성"""
    alert = add_alert(req.symbol, req.target_price, req.condition)
    return {"status": "success", "data": alert}

@app.get("/api/theme/{keyword}")
def read_theme(keyword: str):
    """테마 키워드 분석"""
    result = analyze_theme(keyword)
    if result:
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

class WatchlistRequest(BaseModel):
    symbol: str

@app.get("/api/watchlist")
def read_watchlist():
    """관심 종목 리스트 반환"""
    symbols = get_watchlist()
    # TODO: 여기에 각 종목의 현재가 등 간략 정보를 추가해서 보낼 수 있음
    return {"status": "success", "data": symbols}

@app.post("/api/watchlist")
def create_watchlist(req: WatchlistRequest):
    """관심 종목 추가"""
    success = add_watchlist(req.symbol)
    return {"status": "success" if success else "error"}

@app.delete("/api/watchlist/{symbol}")
def delete_watchlist(symbol: str):
    """관심 종목 삭제"""
    remove_watchlist(symbol)
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
    data = get_naver_disclosures(symbol)
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
