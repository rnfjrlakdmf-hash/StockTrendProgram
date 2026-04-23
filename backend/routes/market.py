from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict, Any
import time
import urllib.parse
import unicodedata
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
        hist_desc = hist.sort_index(ascending=False)
        res = []
        for date, row in hist_desc.iterrows():
            if pd.isna(row['Close']): continue
            res.append({
                "date": date.strftime("%Y-%m-%d"),
                "close": float(row['Close']),
                "change": float(row['ChangePct']) if pd.notna(row['ChangePct']) else 0.0,
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
    symbol = urllib.parse.unquote(symbol)
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
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(symbol_list) or 1) as executor:
        future_to_symbol = {executor.submit(get_simple_quote, sym): sym for sym in symbol_list}
        for future in concurrent.futures.as_completed(future_to_symbol):
            sym = future_to_symbol[future]
            try:
                data = future.result()
                if data:
                    results[sym] = {"price": data.get("price", "확인불가"), "change": data.get("change", "0.00%"), "up": data.get("up", True)}
            except: results[sym] = {"price": "확인불가", "change": "0.00%"}
    return {"status": "success", "data": results}

@router.get("/calendar/events")
def get_calendar_events():
    from korea_data import get_ipo_data
    from stock_data import get_real_stock_events
    import datetime
    try:
        events = []
        ipo_data = get_ipo_data()
        if ipo_data:
            for ipo in (ipo_data if isinstance(ipo_data, list) else []):
                raw_date = ipo.get("date", "").split("~")[0].strip()
                parts = raw_date.split('.')
                if len(parts) == 3: formatted_date = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                else: formatted_date = raw_date.replace(".", "-")
                events.append({"symbol": ipo.get("code", "IPO"), "name": ipo.get("name", ""), "type": "ipo", "date": formatted_date, "detail": "공모 청약"})
        real_events = get_real_stock_events()
        events.extend(real_events)
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        filtered = [ev for ev in events if ev.get("date") and ev.get("date") >= today_str]
        return {"status": "success", "data": filtered}
    except Exception as e: return {"status": "error", "message": str(e)}
