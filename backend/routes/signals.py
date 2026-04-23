from fastapi import APIRouter, Header, Query, BackgroundTasks
from typing import Optional, List, Dict, Any
from smart_signals import scan_watchlist_signals, scan_all_signals
from db_manager import get_recent_signals, get_watchlist

router = APIRouter()

@router.get("/signals")
def read_signals(limit: int = Query(50)):
    """최근 감지된 시그널 목록 조회"""
    signals = get_recent_signals(limit)
    return {"status": "success", "data": signals}

@router.post("/signals/scan")
async def trigger_scan(type: str = Query("all"), x_user_id: Optional[str] = Header(None)):
    """실시간 시그널 스캔 실행 (전체 시장 또는 관심 종목)"""
    if type == "watchlist":
        if not x_user_id:
            return {"status": "error", "message": "관심종목 스캔을 위해 로그인이 필요합니다."}
        
        symbols = get_watchlist(x_user_id)
        if not symbols:
            return {"status": "error", "message": "등록된 관심종목이 없습니다."}
            
        # 백그라운드 태스크 대신 프론트엔드가 결과를 기다릴 수 있도록 직접 실행 (작은 수의 경우)
        # 하지만 갯수가 많으면 타임아웃 우려되므로 일단 직접 실행 후 추후 비동기 검토
        results = await scan_watchlist_signals(symbols)
        return {"status": "success", "message": f"{len(results)}개의 관심종목 시그널이 감지되었습니다.", "data": results}
        
    else:
        # 전체 시장 스캔 (거래량 상위 100종목)
        results = await scan_all_signals(limit=100)
        return {"status": "success", "message": f"전체 시장 스캔 완료: {len(results)}개의 시그널 감지.", "data": results}

@router.get("/signals/{symbol}/briefing")
def get_signal_briefing(symbol: str):
    """특정 종목의 시그널에 대한 AI 요약 브리핑"""
    from stock_data import get_stock_info
    from ai_analysis import analyze_stock
    
    # 기본 주식 정보 가져오기
    data = get_stock_info(symbol)
    if not data:
        return {"status": "error", "message": "종목 정보를 찾을 수 없습니다."}
        
    # AI 분석 수행 (캐시 활용 가능)
    try:
        from turbo_engine import turbo_engine
        cache_key = f"signal_briefing_{symbol}"
        cached = turbo_engine.get_cache(cache_key)
        if cached:
            return {"status": "success", "data": cached}
            
        ai_result = analyze_stock(data)
        briefing_data = {
            "symbol": symbol,
            "briefing": ai_result.get("analysis_summary", "분석 결과를 생성할 수 없습니다."),
            "key_points": ai_result.get("key_points", []),
            "score": ai_result.get("score", 50),
            "price": {
                "price": data.get("price", "N/A"),
                "change_pct": data.get("change_percent", "0%")
            },
            "disclaimer": "본 분석은 AI가 제공하는 참고 정보이며 투자 권유가 아닙니다."
        }
        
        # 1시간 캐싱
        turbo_engine.set_cache(cache_key, briefing_data, ttl=3600)
        return {"status": "success", "data": briefing_data}
        
    except Exception as e:
        print(f"[API] Briefing error for {symbol}: {e}")
        return {"status": "error", "message": "AI 브리핑 생성 중 오류가 발생했습니다."}
