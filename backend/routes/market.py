from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict, Any
import time
import urllib.parse
import unicodedata
import concurrent.futures
from turbo_engine import turbo_cache, turbo_engine

router = APIRouter()

@router.get("/market/indices")
async def market_indices():
    """실시간 시장 지수 전용 데이터 (스파크라인 포함)"""
    try:
        from stock_data import get_market_data
        data = get_market_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/market/status")
async def market_status():
    """실시간 시장 지수 및 환율 데이터 반환 (요약 형태)"""
    try:
        from stock_data import get_market_status
        data = get_market_status()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/market/risk-alerts")
def read_risk_alerts():
    """DART 공시 기반 시장 리스크 및 알림 데이터 반환"""
    try:
        from stock_data import get_dart_risk_alerts
        data = get_dart_risk_alerts()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/rank/etf")
@turbo_cache(ttl_seconds=300)
def read_etf_rank(market: str = "KR", category: Optional[str] = None):
    from rank_data import get_etf_ranking
    data = get_etf_ranking(market, category)
    return {"status": "success", "data": data}

@router.get("/etf-detail/{symbol}")
def read_etf_detail(symbol: str):
    """특정 ETF 상세 분석 데이터 반환"""
    try:
        from etf_detail import get_etf_detail
        result = get_etf_detail(symbol)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/daily-history")
@turbo_cache(ttl_seconds=300)
def stock_daily_history(symbol: str, range: str = Query("1mo")):
    """Get historical daily prices from Yahoo Finance."""
    import yfinance as yf
    import pandas as pd
    import re
    try:
        if re.match(r'^\d{6}$', symbol):
            try:
                ticker = yf.Ticker(f"{symbol}.KS")
                hist = ticker.history(period=range)
                if hist.empty:
                    ticker = yf.Ticker(f"{symbol}.KQ")
                    hist = ticker.history(period=range)
            except: pass
        else:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=range)
        if hist.empty: return {"status": "success", "data": []}
        hist['PrevClose'] = hist['Close'].shift(1)
        hist['ChangePct'] = ((hist['Close'] - hist['PrevClose']) / hist['PrevClose']) * 100
        hist['ChangeVal'] = hist['Close'] - hist['PrevClose']
        hist_desc = hist.sort_index(ascending=False)
        # Drop the oldest day since it has no PrevClose, resulting in 0 change
        if len(hist_desc) > 0:
            hist_desc = hist_desc.iloc[:-1]
            
        res = []
        for date, row in hist_desc.iterrows():
            if pd.isna(row['Close']): continue
            res.append({
                "date": date.strftime("%Y-%m-%d"),
                "close": float(row['Close']),
                "change": float(row['ChangePct']) if pd.notna(row['ChangePct']) else 0.0,
                "change_val": float(row['ChangeVal']) if pd.notna(row['ChangeVal']) else 0.0,
                "volume": int(row['Volume']) if pd.notna(row['Volume']) else 0,
                "open": float(row['Open']) if 'Open' in row and pd.notna(row['Open']) else 0.0,
                "high": float(row['High']) if 'High' in row and pd.notna(row['High']) else 0.0,
                "low": float(row['Low']) if 'Low' in row and pd.notna(row['Low']) else 0.0
            })
        return {"status": "success", "data": res}
    except Exception as e:
        return {"status": "error", "message": "Failed to fetch history"}

@router.get("/rank/themes")
@turbo_cache(ttl_seconds=300)
def read_theme_rank():
    from korea_data import get_naver_theme_rank
    data = get_naver_theme_rank()
    return {"status": "success", "data": data}

@router.get("/rank/top10/{market}")
@turbo_cache(ttl_seconds=60)
def read_rank_top10(market: str):
    from rank_data import get_realtime_top10
    market = market.upper()
    data = get_realtime_top10(market)
    return {"status": "success", "data": data}

@router.get("/rank/global")
def read_global_rank(market: str = "KOSPI", category: str = "trading_volume"):
    from rank_data import get_global_ranking
    data = get_global_ranking(market, category)
    return {"status": "success", "data": data}

@router.get("/market/major")
def read_major_indicators():
    from major_indicators import get_normalized_major_indicators
    data = get_normalized_major_indicators()
    return {"status": "success", "data": data}

@router.get("/stock/search")
def search_stock_api(q: str):
    if not q: return {"status": "error", "message": "Query parameter 'q' is required"}
    from stock_data import GLOBAL_KOREAN_NAMES
    from korea_data import search_stock_code
    from global_search import search_global_ticker
    q_norm = unicodedata.normalize('NFC', q.strip()).replace(" ", "")
    if q_norm.isdigit() and len(q_norm) == 6:
        return {"status": "success", "data": [{"code": q_norm, "symbol": q_norm, "name": q_norm, "market": "KR"}]}
    for ticker, ko_name in GLOBAL_KOREAN_NAMES.items():
        if q_norm == ko_name or q_norm in ko_name:
            return {"status": "success", "data": [{"code": ticker, "symbol": ticker, "name": ko_name, "market": "Global"}]}
    kr_result = search_stock_code(q_norm)
    if kr_result and kr_result.isdigit() and len(kr_result) == 6:
        return {"status": "success", "data": [{"code": kr_result, "symbol": kr_result, "name": q_norm, "market": "KR"}]}
    gb_result = search_global_ticker(q_norm)
    if gb_result:
        return {"status": "success", "data": [{"code": gb_result, "symbol": gb_result, "name": q_norm, "market": "Global"}]}
    return {"status": "error", "message": f"해당 종목을 찾을 수 없습니다: '{q_norm}'"}

@router.get("/quote/{symbol}")
def read_quote(symbol: str):
    symbol = urllib.parse.unquote(symbol).strip()
    
    import re
    if not re.match(r'^[A-Za-z0-9.]+$', symbol):
        import unicodedata
        from korea_data import search_stock_code
        from stock_data import GLOBAL_KOREAN_NAMES
        q_norm = unicodedata.normalize('NFC', symbol).replace(" ", "")
        resolved = None
        for t, k in GLOBAL_KOREAN_NAMES.items():
            if q_norm == k or q_norm in k:
                resolved = t
                break
        if not resolved:
            resolved = search_stock_code(q_norm)
        if resolved:
            symbol = resolved

    cache_key = f"quote_simple_{symbol}"
    cached = turbo_engine.get_cache(cache_key)
    if cached: return {"status": "success", "data": cached, "turbo": True}
    from stock_data import get_simple_quote
    data = get_simple_quote(symbol)
    if data:
        turbo_engine.set_cache(cache_key, data)
        return {"status": "success", "data": data, "turbo": False}
    return {"status": "error", "message": "Failed to fetch quote"}

@router.get("/stock/quotes/multi")
def get_multi_quotes(symbols: str = Query(...)):
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    results = {}
    from stock_data import get_simple_quote
    from korea_data import get_exchange_rate
    rate = get_exchange_rate("USD")
    
    for sym in symbol_list:
        try:
            data = get_simple_quote(sym)
            if data:
                results[sym] = {
                    "price": data.get("price", "확인불가"), 
                    "change": data.get("change", "0.00%"), 
                    "up": data.get("up", True),
                    "currency": data.get("currency", "KRW")
                }
        except Exception as e:
            print(f"[MarketAPI] Failed to get multi-quote for {sym}: {e}")
            results[sym] = {"price": "확인불가", "change": "0.00%"}
    
    return {"status": "success", "data": results, "usd_krw": rate}

@router.get("/korea/sector_heatmap")
async def read_sector_heatmap():
    """업종별 히트맵 데이터 반환"""
    from korea_data import get_sector_heatmap_data
    try:
        data = await get_sector_heatmap_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/korea/heatmap")
async def read_theme_heatmap():
    """테마별 히트맵 데이터 반환"""
    from korea_data import get_theme_heatmap_data
    try:
        data = await get_theme_heatmap_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/investors/top")
def read_investor_top():
    """수급 및 상승률 상위 데이터 반환"""
    from korea_data import get_investor_ranking_data
    try:
        data = get_investor_ranking_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/market-insights")
def read_market_insights():
    """인기 검색 및 거래대금 상위 데이터 반환"""
    from korea_data import get_market_insights_data
    try:
        data = get_market_insights_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/assets")
def get_assets():
    """통합 시장 자산 지표(환율, 원자재, 채권 등) 반환"""
    from major_indicators import get_normalized_major_indicators
    try:
        data = get_normalized_major_indicators()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/market/calendar")
def get_global_macro_calendar():
    """오늘의 글로벌 경제 일정 반환"""
    from stock_data import get_macro_calendar
    try:
        data = get_macro_calendar()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/market/calendar/korea")
def get_korea_macro_calendar():
    """오늘의 한국 경제 및 시장 일정 반환"""
    from stock_data import get_macro_calendar
    try:
        data = get_macro_calendar()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/calendar/events")
def get_calendar_events():
    """전 종목 실적 및 배당 일정 반환"""
    from stock_data import get_real_stock_events
    try:
        data = get_real_stock_events()
        # 미래 일정만 필터링 (선택 사항)
        import datetime
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        filtered = [ev for ev in data if ev.get("date") and ev.get("date") >= today_str]
        return {"status": "success", "data": filtered}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/korea/ipo")
def get_korean_ipo():
    """신규 상장 및 공모주 일정 반환"""
    from korea_data import get_ipo_data
    try:
        data = get_ipo_data()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
@router.get("/market/scanner")
def read_market_scanner():
    """오늘의 증시 스캐너 데이터 (상승/하락 종목 수 및 특이 공시)"""
    from korea_data import get_market_summary_stats, get_live_disclosures
    try:
        stats = get_market_summary_stats()
        disclosures = get_live_disclosures()
        return {
            "status": "success",
            "data": {
                "stats": stats,
                "disclosures": disclosures
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
