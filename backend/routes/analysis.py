from fastapi import APIRouter, Query, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import time
import urllib.parse
from turbo_engine import turbo_cache, turbo_engine

router = APIRouter()

@router.get("/stock/{symbol}/risk")
@turbo_cache(ttl_seconds=3600)
def get_stock_risk(symbol: str):
    """신용잔고 및 대차잔고 위험 스코어 분석"""
    from risk_analyzer import analyze_risk
    try:
        data = analyze_risk(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/overview")
@turbo_cache(ttl_seconds=3600)
def stock_company_overview(symbol: str):
    """기업 개요 (기본정보, 연혁, 매출구성, R&D, 임직원 현황)"""
    from korea_data import get_korean_company_overview
    try:
        data = get_korean_company_overview(symbol)
        if data:
            return {"status": "success", "data": data}
        return {"status": "error", "message": "기업 개요 데이터를 찾을 수 없습니다."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/extended-hours")
@turbo_cache(ttl_seconds=60)  # [Cache] 60초 캐시: 상업용 우회 목적으로 yfinance 호출 최소화
def stock_extended_hours(symbol: str):
    """
    [New] 해외 주식 세션별 가격 정보: 프리마켓 / 정규장 / 에프터마켓
    나스닥, S&P500 등 미국 주식 및 주요 해외 지수에 대응합니다. (yfinance 사용으로 완전 무료화)
    """
    try:
        from rank_data import get_world_stock_integration
        import yfinance as yf
        
        # 해외 종목 여부 확인
        clean_code = symbol.split('.')[0]
        is_domestic = len(clean_code) == 6 and clean_code.isdigit()
        
        if is_domestic:
            return {"status": "error", "message": "국내 종목은 extended-hours 데이터가 제공되지 않습니다."}
        
        # [우회 로직] 해외 주식은 네이버 대신 yfinance 활용
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if not info or 'regularMarketPrice' not in info:
            # yfinance 실패 시 fallback으로 네이버 API 활용
            fallback_symbols = [symbol, f"{symbol}.O", f"{symbol}.N", f"{symbol}.A"]
            raw = get_world_stock_integration(fallback_symbols)
            item = None
            for fs in fallback_symbols:
                if raw and fs in raw:
                    item = raw[fs]
                    break
                    
            if not item:
                return {"status": "error", "message": f"해외 주식 데이터를 찾을 수 없습니다: {symbol}"}
            
            # (Fallback 로직: 기존 네이버 API 활용 로직 유지)
            over = item.get("overMarketPriceInfo") or {}
            session_type = over.get("tradingSessionType", "")
            over_status = over.get("overMarketStatus", "CLOSE")
            market_status = item.get("marketStatus", "CLOSE")
            regular_price = float(item.get("currentPrice", 0))
            regular_change = float(item.get("fluctuations", 0))
            regular_change_pct = float(item.get("fluctuationsRatio", 0))
            prev_close = float(item.get("lastClosePrice", regular_price - regular_change))
            over_price = float(over.get("overPrice", 0)) if over.get("overPrice") else None
            over_change = float(over.get("fluctuations", 0)) if over.get("fluctuations") else None
            over_change_pct = float(over.get("fluctuationsRatio", 0)) if over.get("fluctuationsRatio") else None
            over_update_time = over.get("localTradedAt", "")
            currency_code = item.get("currencyType", "USD")
            name = item.get("stockName", symbol)
            open_price = float(item.get("openPrice", 0)) if item.get("openPrice") else None
            high_price = float(item.get("highPrice", 0)) if item.get("highPrice") else None
            low_price = float(item.get("lowPrice", 0)) if item.get("lowPrice") else None
            volume = int(item.get("accumulatedTradingVolume", 0)) if item.get("accumulatedTradingVolume") else None
            per = item.get("per")
            pbr = item.get("pbr")
            dividend_yield = item.get("dividendYieldRatio")
            market_cap = item.get("marketValue")
            exchange = item.get("stockExchangeType", "")
            
        else:
            # yfinance 성공 시 (우회 핵심)
            name = info.get('shortName') or info.get('longName') or symbol
            currency_code = info.get('currency', 'USD')
            market_state = info.get('marketState', 'CLOSED')
            
            market_status = "OPEN" if market_state == "REGULAR" else "CLOSE"
            regular_price = info.get('regularMarketPrice', 0)
            regular_change = info.get('regularMarketChange', 0)
            regular_change_pct = info.get('regularMarketChangePercent', 0)
            prev_close = info.get('regularMarketPreviousClose', regular_price - regular_change)
            
            # yfinance는 퍼센트 값이 소수점(예: 0.05 = 5%)이므로 100을 곱해줌
            if regular_change_pct:
                regular_change_pct = regular_change_pct * 100
            
            # 프리/에프터마켓 데이터
            session_type = ""
            over_status = "CLOSE"
            over_price = None
            over_change = None
            over_change_pct = None
            
            # PRE MARKET
            if 'preMarketPrice' in info and info['preMarketPrice'] is not None:
                session_type = "PRE_MARKET"
                over_status = "OPEN" if market_state in ["PRE", "PREPRE"] else "CLOSE"
                over_price = info['preMarketPrice']
                over_change = info.get('preMarketChange', 0)
                over_change_pct = info.get('preMarketChangePercent', 0) * 100 if info.get('preMarketChangePercent') else 0
            
            # AFTER MARKET (POST)
            elif 'postMarketPrice' in info and info['postMarketPrice'] is not None:
                session_type = "AFTER_HOURS"
                over_status = "OPEN" if market_state in ["POST", "POSTPOST"] else "CLOSE"
                over_price = info['postMarketPrice']
                over_change = info.get('postMarketChange', 0)
                over_change_pct = info.get('postMarketChangePercent', 0) * 100 if info.get('postMarketChangePercent') else 0
                
            over_update_time = ""
            open_price = info.get('regularMarketOpen')
            high_price = info.get('regularMarketDayHigh')
            low_price = info.get('regularMarketDayLow')
            volume = info.get('regularMarketVolume')
            per = info.get('trailingPE')
            pbr = info.get('priceToBook')
            dividend_yield = info.get('dividendYield')
            market_cap = info.get('marketCap')
            exchange = info.get('exchange', "")
        
        # 세션 라벨 결정
        if market_status == "OPEN":
            current_session = "장중 (Regular Hours)"
        elif session_type == "PRE_MARKET" and over_status == "OPEN":
            current_session = "프리마켓 (Pre-Market)"
        elif session_type == "AFTER_HOURS" and over_status == "OPEN":
            current_session = "에프터마켓 (After Hours)"
        else:
            current_session = "장마감 (Market Closed)"
            
        # [v2] 원화 환산용 환율 추가
        from korea_data import get_exchange_rate
        usd_krw = get_exchange_rate("USD") if currency_code == "USD" else None
        
        result = {
            "symbol": symbol,
            "name": name,
            "exchange": exchange,
            "currency": currency_code,
            "usd_krw": usd_krw,          # ← 원화 환산용 환율 (USD 종목만)
            "current_session": current_session,
            "market_status": market_status,
            
            # 정규장 (전일 기준)
            "regular": {
                "price": regular_price,
                "change": regular_change,
                "change_pct": regular_change_pct,
                "prev_close": prev_close,
                "open": open_price,
                "high": high_price,
                "low": low_price,
                "volume": volume,
                "is_active": market_status == "OPEN",
                "updated_at": "",
            },
            
            # 시외 거래 (프리마켓 or 에프터마켓)
            "extended": {
                "price": over_price,
                "change": over_change,
                "change_pct": over_change_pct,
                "session_type": session_type,   # PRE_MARKET or AFTER_HOURS
                "status": over_status,           # OPEN or CLOSE
                "is_active": over_status == "OPEN",
                "updated_at": over_update_time,
            } if over_price else None,
            
            # 추가 정보
            "per": per,
            "pbr": pbr,
            "dividend_yield": dividend_yield,
            "market_cap": market_cap,
        }
        
        return {"status": "success", "data": result}
    except Exception as e:
        print(f"[extended-hours] Error for {symbol}: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/stock/{symbol}/fast")
async def read_stock_fast(symbol: str):
    """최적의 체감 속도를 위해 AI 분석을 생략하고 핵심 주가/재무 데이터만 즉시 반환합니다."""
    import unicodedata
    symbol = urllib.parse.unquote(symbol).strip()
    symbol = unicodedata.normalize('NFC', symbol) # [Fix] Handle NFD/NFC mismatch
    from stock_data import get_stock_info
    data = await asyncio.to_thread(get_stock_info, symbol, skip_ai=True)
    if data:
        return {"status": "success", "data": data}
    return {"status": "error", "message": "Stock not found"}

@router.get("/stock/{symbol}")
async def read_stock(symbol: str, skip_ai: bool = False):
    import unicodedata
    symbol = urllib.parse.unquote(symbol).strip()
    symbol = unicodedata.normalize('NFC', symbol)
    from turbo_engine import CACHE_VERSION
    cache_key = f"{CACHE_VERSION}_stock_full_{symbol}_{skip_ai}"
    cached = turbo_engine.get_cache(cache_key)
    if cached: return {"status": "success", "data": cached, "turbo": True}
    
    # Lazy Imports
    from stock_data import get_stock_info
    from ai_analysis import analyze_stock
    from db_manager import save_analysis_result, get_cached_ai_analysis, save_ai_analysis_cache
    
    # Use to_thread to prevent blocking
    data = await asyncio.to_thread(get_stock_info, symbol)
    if data:
        if not skip_ai:
            try:
                # [★ AI Cache] 1단계: DB에 6시간 이내 캐시된 AI 결과가 있으면 즉시 사용
                db_cached = await asyncio.to_thread(get_cached_ai_analysis, data['symbol'])
                if db_cached:
                    data.update({
                        "score": db_cached.get("score", 50),
                        "metrics": db_cached.get("metrics", {"supplyDemand": 50, "financials": 50, "news": 50}),
                        "summary": db_cached.get("summary", data.get("summary", "")),
                        "rationale": db_cached.get("rationale", {}),
                        "related_stocks": db_cached.get("related_stocks", [])
                    })
                    print(f"[★ AI-Cache] DB Cache HIT for {symbol} - Skipping Gemini API call")
                else:
                    # [2단계] DB 캐시 없음 → Gemini API 호출 (최대 75초 timeout)
                    try:
                        ai_result = await asyncio.wait_for(
                            asyncio.to_thread(analyze_stock, data),
                            timeout=75
                        )
                    except asyncio.TimeoutError:
                        print(f"[TIMEOUT] AI Analysis timed out for {symbol}")
                        ai_result = {
                            "score": 50,
                            "metrics": {"supplyDemand": 50, "financials": 50, "news": 50},
                            "analysis_summary": f"{data.get('name', symbol)}에 대한 AI 분석 처리에 시간이 초과되었습니다. 기본 데이터는 정상 제공되며, AI 분석은 잠시 후 재시도해 주세요.",
                            "rationale": {},
                            "related_stocks": [],
                            "is_error": True
                        }
                    data.update({
                        "score": ai_result.get("score", 50),
                        "metrics": ai_result.get("metrics", {"supplyDemand": 50, "financials": 50, "news": 50}),
                        "summary": ai_result.get("analysis_summary", data["summary"]),
                        "rationale": ai_result.get("rationale", {}),
                        "related_stocks": ai_result.get("related_stocks", [])
                    })
                    # [3단계] DB에 AI 결과 저장 (6시간 캐시, 비동기 백그라운드) - 에러가 아닐 때만
                    is_ai_error = ai_result.get("is_error", False)
                    if not is_ai_error:
                        await asyncio.to_thread(save_analysis_result, data)
                        await asyncio.to_thread(save_ai_analysis_cache, data['symbol'], ai_result)
            except Exception as e:
                print(f"[ERROR] AI Analysis in thread failed: {e}")
                is_ai_error = True
        
        # [메모리 캐시] TTL 60분 (skip_ai=False), 10분 (skip_ai=True), 에러시 캐시 안함 (0초)
        # skip_ai=True: Fast Fetch 결과 10분 캐시 → 재검색 시 즉시 반환
        # skip_ai=False: AI 결과 포함 1시간 캐시 → Gemini 재호출 없음
        mem_ttl = 3600 if not skip_ai else 600
        if not skip_ai and locals().get('is_ai_error', False):
            mem_ttl = 10  # 에러 발생 시 10초만 캐시해서 빠른 재시도 유도
            
        turbo_engine.set_cache(cache_key, data, ttl=mem_ttl)
        return {"status": "success", "data": data, "turbo": False}
    return {"status": "error", "message": "Stock not found"}


@router.get("/pro/summary/{symbol}")
def read_pro_summary(symbol: str):
    from turbo_engine import CACHE_VERSION
    cache_key = f"{CACHE_VERSION}_pro_summary_v3_{symbol}"
    cached = turbo_engine.get_cache(cache_key)
    if cached: return {"status": "success", "data": cached, "turbo": True}
    
    # Lazy Imports
    import concurrent.futures
    from pro_analysis import get_quant_scorecard, get_financial_health
    from korea_data import get_naver_investor_data, gather_naver_stock_data, get_korean_investment_indicators
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        is_korean = symbol.isdigit() or symbol.endswith('.KS') or symbol.endswith('.KQ')
        
        f1 = executor.submit(get_quant_scorecard, symbol)
        f2 = executor.submit(get_financial_health, symbol)
        
        if is_korean:
            f3 = executor.submit(get_naver_investor_data, symbol, 20)
            f4 = executor.submit(gather_naver_stock_data, symbol)
            f5 = executor.submit(get_korean_investment_indicators, symbol, "0", "IFRSL", "1")
            q_d = f1.result()
            h_d = f2.result()
            i_r = f3.result()
            s_d = f4.result()
            ind_r = f5.result()
        else:
            q_d = f1.result()
            h_d = f2.result()
            i_r = {}
            # US stocks can get info from yfinance or just pass minimal dict
            s_d = {"name": symbol, "code": symbol, "current_price": 0} 
            ind_r = {}
    
    fin_charts = []
    if ind_r and ind_r.get("status") == "success":
        for h in ind_r.get("headers", []):
            entry = {"year": h.split('/')[0]}
            rev_row = next((r for r in ind_r.get("indicators", []) if "매출액" in r["name"]), None)
            op_row = next((r for r in ind_r.get("indicators", []) if "영업이익" in r["name"]), None)
            if rev_row: entry["매출액"] = rev_row["values"].get(h, 0)
            if op_row: entry["영업이익"] = op_row["values"].get(h, 0)
            fin_charts.append(entry)
            
    combined = {"symbol": symbol, "stock_info": s_d, "quant": q_d, "health": h_d, "financial_indicators": fin_charts, "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")}
    turbo_engine.set_cache(cache_key, combined)
    return {"status": "success", "data": combined}

@router.get("/ai/morning-brief")
async def get_morning_brief(force: bool = Query(False), x_user_id: Optional[str] = Header(None)):
    # Lazy Imports
    from utils.briefing_store import get_latest_briefing, should_generate_new_briefing
    from morning_briefing import generate_instant_briefing, generate_user_morning_briefing
    
    # [Mod] 게스트(비로그인) 사용자 배려: x_user_id가 없으면 'SYSTEM' 리포트를 보여줌
    uid = x_user_id.strip() if x_user_id else "SYSTEM"
    print(f"[API] get_morning_brief for uid='{uid}' (force={force})")
    latest = get_latest_briefing(uid)
    if force or should_generate_new_briefing(uid):
        # [Zero-Wait] 즉시 브리핑 먼저 생성 (Offload to thread to keep API responsive)
        from utils.briefing_store import save_morning_briefing
        instant = await asyncio.to_thread(generate_instant_briefing, uid)
        
        # [Fix] Save instant briefing to DB so it appears in timeline
        await asyncio.to_thread(save_morning_briefing, uid, instant)
        
        latest = instant
        # 백그라운드에서 AI 정밀 브리핑 생성
        async def run_bg():
            await asyncio.to_thread(generate_user_morning_briefing, uid)
        asyncio.create_task(run_bg())
    
    return {"status": "success", "data": latest, "updating": False}

@router.get("/ai/briefing-timeline")
async def get_briefing_timeline(x_user_id: Optional[str] = Header(None)):
    from utils.briefing_store import get_today_briefing_timeline
    # [Mod] 게스트 사용자도 타임라인 조회가 가능하도록 'SYSTEM' 계정 활용
    uid = x_user_id.strip() if x_user_id else "SYSTEM"
    print(f"[API] get_briefing_timeline for uid='{uid}'")
    timeline = get_today_briefing_timeline(uid)
    return {"status": "success", "data": timeline}

@router.get("/quant/{symbol}")
def read_quant_scorecard(symbol: str):
    from pro_analysis import get_quant_scorecard
    return {"status": "success", "data": get_quant_scorecard(symbol)}

@router.get("/risk/{symbol}")
def get_stock_risk(symbol: str):
    from risk_analyzer import analyze_stock_risk
    return {"status": "success", "data": analyze_stock_risk(symbol)}

@router.get("/theme/{keyword:path}")
@turbo_cache(ttl_seconds=3600)
async def read_theme(keyword: str):
    # Lazy Imports
    from ai_analysis import analyze_theme
    from stock_data import search_stock_code
    
    result = await asyncio.to_thread(analyze_theme, keyword)
    if not result:
        return {"status": "error", "message": "테마 분석 실패"}
        
    stocks = result.get("leaders", []) + result.get("followers", [])
    
    # [Improvement] Only resolve ticker names (AI hallucination fix), skip price fetching for speed.
    # The frontend already fetches real-time prices asynchronously in a useEffect.
    async def resolve_ticker(s):
        name = s.get("name")
        if name:
            resolved = await asyncio.to_thread(search_stock_code, name)
            if resolved:
                s["symbol"] = resolved.split('.')[0] if resolved.endswith(('.KS', '.KQ')) else resolved

    if stocks:
        await asyncio.gather(*(resolve_ticker(s) for s in stocks))
        
    return {"status": "success", "data": result}
    
@router.get("/chart/patterns/{ticker}")
async def read_chart_patterns(ticker: str, interval: str = "1d", period: str = None):
    from turbo_engine import CACHE_VERSION
    cache_key = f"{CACHE_VERSION}_chart_{ticker}_{interval}_{period}"
    cached = turbo_engine.get_cache(cache_key)
    if cached:
        return {"status": "success", "data": cached, "turbo": True}
        
    from chart_analysis import get_chart_analysis_full
    result = await asyncio.to_thread(get_chart_analysis_full, ticker, interval, period)
    if result and "history" in result and len(result["history"]) > 0:
        turbo_engine.set_cache(cache_key, result, ttl=3600)  # 1시간 동안 AI 분석 결과 재사용
        return {"status": "success", "data": result}
    return {"status": "error", "message": "No data found"}


@router.get("/stock/{symbol}/investor")
def stock_investor(symbol: str, period: int = Query(20)):
    """투자자별 매매동향 (글로벌 종목 대응: 기관 보유 현황 반환)"""
    import re
    from korea_data import get_naver_investor_data
    
    # 글로벌 종목 여부 판별
    is_global = any(c.isalpha() for c in symbol) and not symbol.endswith(('.KS', '.KQ'))
    
    if is_global:
        import yfinance as yf
        try:
            ticker_name = symbol.split('.')[0]
            t = yf.Ticker(ticker_name)
            holders = t.institutional_holders
            
            data = []
            if holders is not None and not holders.empty:
                import pandas as pd
                # yfinance column names can vary: Holder, Shares, Date Reported, % Out, Value
                for _, row in holders.iterrows():
                    def get_clean_val(row, keys, default=None):
                        for k in keys:
                            if k in row:
                                val = row[k]
                                if pd.isna(val): continue
                                return val
                        return default

                    h_name = get_clean_val(row, ['Holder', 'Entity', 'Institution'], 'Unknown')
                    h_shares = get_clean_val(row, ['Shares'], 0)
                    h_date = get_clean_val(row, ['Date Reported', 'Date'], '')
                    h_pct = get_clean_val(row, ['% Out', 'Pct Out', 'Percentage'], 0)
                    
                    data.append({
                        "name": str(h_name),
                        "shares": int(h_shares) if h_shares else 0,
                        "date": str(h_date).split(' ')[0], # Just the date
                        "percent": f"{float(h_pct)*100:.2f}%" if h_pct else "N/A"
                    })
            
            return {
                "status": "success", 
                "data": {
                    "type": "global_institutional",
                    "trend": data,
                    "message": "해외 종목은 일일 매매동향 대신 주요 기관 보유 현황을 제공합니다."
                }
            }
        except Exception as e:
            return {"status": "error", "message": f"Global holders fetch failed: {str(e)}"}

    try:
        # Domestic Stock (Naver)
        data = get_naver_investor_data(symbol, trader_day=period)
        return data # get_naver_investor_data already returns {"status": "success", "data": {...}}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/investors/live")
def stock_investors_live(symbol: str):
    from korea_data import get_live_investor_estimates
    try:
        data = get_live_investor_estimates(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/financials")
@turbo_cache(ttl_seconds=600)  # [Cache] 10분 캐싱 → 재요청 시 즉시 반환 (스크래핑 비용 절감)
def stock_financials(symbol: str):
    from korea_data import get_stock_financials
    try:
        data = get_stock_financials(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/indicators")
@turbo_cache(ttl_seconds=300)
def stock_indicators(symbol: str, freq: str = "0", finGubun: str = "IFRSL", category: str = "1"):
    from korea_data import get_korean_investment_indicators, get_global_investment_indicators
    try:
        clean_code = symbol.split('.')[0]
        if clean_code.isdigit():
            raw_data = get_korean_investment_indicators(symbol, freq=freq, fin_gubun=finGubun, rpt=category)
        else:
            raw_data = get_global_investment_indicators(symbol, freq=freq, fin_gubun=finGubun, rpt=category)
            
        if raw_data and raw_data.get("status") == "success":
            headers = raw_data.get("headers", [])
            indicators = raw_data.get("indicators", [])
            
            rows = []
            for ind in indicators:
                val_dict = ind.get("values", {})
                val_array = [val_dict.get(h, "") for h in headers]
                rows.append({
                    "label": ind.get("name", ""),
                    "values": val_array
                })
                
            transformed_data = {
                "symbol": symbol,
                "name": symbol, # fallback name
                "years": headers,
                "rows": rows
            }
            return {"status": "success", "data": transformed_data}
        return {"status": "error", "message": "지표 데이터를 찾을 수 없습니다."}
    except Exception as e:
        return {"status": "error", "message": str(e)}



@router.get("/financial-health/{symbol}")
def get_financial_health_route(symbol: str):
    from pro_analysis import get_financial_health
    try:
        data = get_financial_health(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/sector-analysis/{symbol}")
def get_sector_analysis_route(symbol: str, sector_id: str = None):
    from sector_analysis import get_sector_analysis_data
    try:
        data = get_sector_analysis_data(symbol, sector_id)
        if isinstance(data, dict) and "status" in data and "data" in data:
            return data
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/peer-compare")
def get_peer_compare_route(symbols: str):
    from pro_analysis import get_peer_comparison
    try:
        sym_list = [s.strip() for s in symbols.split(",")]
        data = get_peer_comparison(sym_list)
        return {"status": "success", **data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/dart_overhang")
@turbo_cache(ttl_seconds=300)
def stock_dart_overhang(symbol: str):
    """오버행 및 타법인 출자 현황 (국내 전용)"""
    import re
    from dart_disclosure import get_dart_overhang_and_investments
    
    # 글로벌 종목 여부 판별
    is_global = any(c.isalpha() for c in symbol) and not symbol.endswith(('.KS', '.KQ'))
    
    if is_global:
        return {
            "status": "success", 
            "data": {
                "is_global": True,
                "message": "오버행 및 타법인 출자 분석은 현재 국내 공시(DART) 데이터가 존재하는 종목에 최적화되어 있습니다."
            }
        }

    try:
        data = get_dart_overhang_and_investments(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stock/{symbol}/news")
async def stock_news_period(symbol: str, period: str = Query("1d")):
    """특정 종목의 기간별 뉴스 수집 (글로벌/국내 종목 정확 대응) - v2.0 강화버전 (20개 이상 보장)"""
    import urllib.parse
    import urllib.request
    import xml.etree.ElementTree as ET
    from stock_data import get_korean_name

    MIN_NEWS_COUNT = 20  # 최소 뉴스 보장 개수
    MAX_NEWS_COUNT = 40  # 최대 뉴스 개수

    try:
        # 1. 글로벌 종목 여부 판별
        is_global = any(c.isalpha() for c in symbol) and not symbol.endswith(('.KS', '.KQ'))
        
        # 2. 종목명 찾기 (뉴스 검색용)
        from stock_data import NAME_CACHE, GLOBAL_KOREAN_NAMES
        
        korean_name = NAME_CACHE.get(symbol)
        if not korean_name:
            if symbol in GLOBAL_KOREAN_NAMES:
                val = GLOBAL_KOREAN_NAMES[symbol]
                korean_name = val[0] if isinstance(val, list) else val
            else:
                korean_name = await asyncio.to_thread(get_korean_name, symbol)
                if not korean_name:
                    korean_name = symbol

        news = []

        # ─────────────────────────────────────────────────────────────────────
        # 3-A. 해외 종목: Google RSS로 영어 뉴스 직접 수집 (20개 이상 보장)
        # ─────────────────────────────────────────────────────────────────────
        if is_global:
            clean_symbol = symbol.split('.')[0].upper()

            # ── 영어 검색어 사전 (종목 티커 → 정확한 회사명, 복수 키워드) ──────────────
            ENGLISH_NAME_MAP = {
                # ── 빅테크 / Magnificent 7 ──
                "AAPL":  ("Apple",             ["apple", "aapl", "iphone", "ipad", "macbook", "tim cook"]),
                "MSFT":  ("Microsoft",          ["microsoft", "msft", "azure", "copilot", "satya nadella"]),
                "GOOGL": ("Alphabet Google",    ["google", "alphabet", "googl", "gemini", "waymo", "youtube"]),
                "GOOG":  ("Alphabet Google",    ["google", "alphabet", "goog", "gemini", "waymo", "youtube"]),
                "AMZN":  ("Amazon",             ["amazon", "amzn", "aws", "bezos", "jassy", "prime"]),
                "META":  ("Meta Platforms",     ["meta", "facebook", "instagram", "whatsapp", "zuckerberg", "threads"]),
                "TSLA":  ("Tesla",              ["tesla", "tsla", "elon musk", "cybertruck", "model s", "model 3", "model x", "model y"]),
                "NVDA":  ("Nvidia",             ["nvidia", "nvda", "jensen huang", "h100", "blackwell", "cuda", "geforce"]),
                # ── 반도체 ──
                "AMD":   ("AMD Advanced Micro Devices", ["amd", "advanced micro", "ryzen", "radeon", "epyc", "lisa su"]),
                "INTC":  ("Intel",              ["intel", "intc", "core ultra", "xeon", "pat gelsinger"]),
                "QCOM":  ("Qualcomm",           ["qualcomm", "qcom", "snapdragon", "cristiano amon"]),
                "AVGO":  ("Broadcom",           ["broadcom", "avgo", "hock tan"]),
                "ASML":  ("ASML",               ["asml", "euv", "lithography", "extreme ultraviolet"]),
                "TSM":   ("TSMC Taiwan Semiconductor", ["tsmc", "tsm", "taiwan semiconductor", "2nm", "3nm"]),
                "SMCI":  ("Super Micro Computer", ["super micro", "smci", "supermicro"]),
                "MU":    ("Micron Technology",  ["micron", "mu", "dram", "nand", "hbm"]),
                "TXN":   ("Texas Instruments",  ["texas instruments", "txn", "analog chips"]),
                "ON":    ("ON Semiconductor",   ["on semiconductor", "onsemi"]),
                "MCHP":  ("Microchip Technology", ["microchip technology", "mchp"]),
                "LRCX":  ("Lam Research",        ["lam research", "lrcx"]),
                "AMAT":  ("Applied Materials",   ["applied materials", "amat"]),
                "KLAC":  ("KLA Corporation",     ["kla corporation", "klac"]),
                "SWKS":  ("Skyworks Solutions",  ["skyworks", "swks"]),
                "MRVL":  ("Marvell Technology",  ["marvell", "mrvl"]),
                "NXPI":  ("NXP Semiconductors",  ["nxp", "nxpi"]),
                "ARM":   ("ARM Holdings",        ["arm holdings", "arm", "softbank arm"]),
                # ── 클라우드 / SaaS ──
                "CRM":   ("Salesforce",          ["salesforce", "crm", "marc benioff"]),
                "NOW":   ("ServiceNow",          ["servicenow", "now"]),
                "SNOW":  ("Snowflake",           ["snowflake", "snow"]),
                "DDOG":  ("Datadog",             ["datadog", "ddog"]),
                "MDB":   ("MongoDB",             ["mongodb", "mdb"]),
                "ESTC":  ("Elastic",             ["elastic", "estc", "elasticsearch"]),
                "NET":   ("Cloudflare",          ["cloudflare", "net"]),
                "OKTA":  ("Okta",               ["okta"]),
                "TEAM":  ("Atlassian",           ["atlassian", "team", "jira", "confluence"]),
                "ZS":    ("Zscaler",             ["zscaler", "zs"]),
                "ZM":    ("Zoom Video",          ["zoom", "zm"]),
                "DOCU":  ("DocuSign",            ["docusign", "docu"]),
                "HUBS":  ("HubSpot",             ["hubspot", "hubs"]),
                "WDAY":  ("Workday",             ["workday", "wday"]),
                "ADBE":  ("Adobe",               ["adobe", "adbe", "photoshop", "creative cloud", "firefly"]),
                "ORCL":  ("Oracle",              ["oracle", "orcl", "larry ellison"]),
                "SAP":   ("SAP",                 ["sap"]),
                "INTU":  ("Intuit",              ["intuit", "intu", "turbotax", "quickbooks"]),
                # ── 사이버보안 ──
                "CRWD":  ("CrowdStrike",         ["crowdstrike", "crwd", "george kurtz"]),
                "PANW":  ("Palo Alto Networks",  ["palo alto", "panw", "nikesh arora"]),
                "S":     ("SentinelOne",         ["sentinelone"]),
                "FTNT":  ("Fortinet",            ["fortinet", "ftnt"]),
                "CYBR":  ("CyberArk",            ["cyberark", "cybr"]),
                # ── AI / 머신러닝 ──
                "PLTR":  ("Palantir",            ["palantir", "pltr", "alex karp", "aip"]),
                "AI":    ("C3.ai",               ["c3.ai", "c3ai"]),
                "IONQ":  ("IonQ",               ["ionq", "quantum computing"]),
                "QUBT":  ("Quantum Computing",   ["quantum computing", "qubt"]),
                "RGTI":  ("Rigetti Computing",   ["rigetti", "rgti"]),
                "BBAI":  ("BigBear.ai",          ["bigbear", "bbai"]),
                # ── 스트리밍 / 미디어 ──
                "NFLX":  ("Netflix",             ["netflix", "nflx", "reed hastings", "ted sarandos"]),
                "DIS":   ("Disney",              ["disney", "dis", "bob iger", "espn", "hulu"]),
                "PARA":  ("Paramount",           ["paramount", "para"]),
                "WBD":   ("Warner Bros Discovery", ["warner bros", "wbd", "max streaming"]),
                "SPOT":  ("Spotify",             ["spotify", "spot", "daniel ek"]),
                # ── 전기차 / 모빌리티 ──
                "RIVN":  ("Rivian",              ["rivian", "rivn"]),
                "LCID":  ("Lucid Motors",        ["lucid", "lcid", "lucid motors"]),
                "NIO":   ("NIO",                 ["nio", "william li"]),
                "LI":    ("Li Auto",             ["li auto", "lixiang"]),
                "XPEV":  ("XPeng",               ["xpeng", "xpev"]),
                "GM":    ("General Motors",      ["general motors", "gm", "mary barra"]),
                "F":     ("Ford Motor",          ["ford", "jim farley"]),
                "UBER":  ("Uber",                ["uber", "dara khosrowshahi"]),
                "LYFT":  ("Lyft",               ["lyft"]),
                # ── 핀테크 / 금융 ──
                "V":     ("Visa",               ["visa"]),
                "MA":    ("Mastercard",          ["mastercard", "ma", "michael miebach"]),
                "PYPL":  ("PayPal",              ["paypal", "pypl", "alex chriss"]),
                "SQ":    ("Block",               ["block", "sq", "jack dorsey", "cash app", "square"]),
                "HOOD":  ("Robinhood",           ["robinhood", "hood", "vlad tenev"]),
                "COIN":  ("Coinbase",            ["coinbase", "coin", "brian armstrong"]),
                "AFRM":  ("Affirm",              ["affirm", "afrm", "max levchin"]),
                "SOFI":  ("SoFi Technologies",   ["sofi", "noto"]),
                "MSTR":  ("MicroStrategy",       ["microstrategy", "mstr", "michael saylor", "bitcoin holdings"]),
                "BAC":   ("Bank of America",     ["bank of america", "bac", "brian moynihan"]),
                "JPM":   ("JPMorgan Chase",      ["jpmorgan", "jpm", "jamie dimon"]),
                "GS":    ("Goldman Sachs",       ["goldman sachs", "gs", "david solomon"]),
                "MS":    ("Morgan Stanley",      ["morgan stanley", "ms"]),
                "WFC":   ("Wells Fargo",         ["wells fargo", "wfc", "charlie scharf"]),
                "C":     ("Citigroup",           ["citigroup", "citi", "jane fraser"]),
                "BLK":   ("BlackRock",           ["blackrock", "blk", "larry fink"]),
                # ── 이커머스 / 리테일 ──
                "SHOP":  ("Shopify",             ["shopify", "shop", "tobi lutke"]),
                "MELI":  ("MercadoLibre",        ["mercadolibre", "meli"]),
                "WMT":   ("Walmart",             ["walmart", "wmt", "doug mcmillon"]),
                "COST":  ("Costco",              ["costco", "cost", "ron vachris"]),
                "TGT":   ("Target",              ["target", "tgt", "brian cornell"]),
                "BABA":  ("Alibaba",             ["alibaba", "baba", "jack ma", "eddie wu", "taobao", "tmall"]),
                "JD":    ("JD.com",              ["jd.com", "jd", "richard liu"]),
                "PDD":   ("PDD Holdings Temu",   ["pdd", "temu", "pinduoduo"]),
                "CPNG":  ("Coupang",             ["coupang", "cpng", "bom kim"]),
                "ABNB":  ("Airbnb",              ["airbnb", "abnb", "brian chesky"]),
                # ── 소비재 / 식음료 ──
                "KO":    ("Coca-Cola",           ["coca-cola", "ko", "coke", "james quincey"]),
                "PEP":   ("PepsiCo",             ["pepsico", "pepsi", "pep", "ramon laguarta"]),
                "SBUX":  ("Starbucks",           ["starbucks", "sbux", "brian niccol"]),
                "MCD":   ("McDonald's",          ["mcdonald", "mcd", "chris kempczyk"]),
                "NKE":   ("Nike",               ["nike", "nke", "elliott hill"]),
                "LULU":  ("Lululemon",           ["lululemon", "lulu", "calvin mcdonald"]),
                # ── 헬스케어 / 바이오 ──
                "JNJ":   ("Johnson & Johnson",   ["johnson", "jnj", "joaquin duato"]),
                "PFE":   ("Pfizer",              ["pfizer", "pfe", "albert bourla"]),
                "MRNA":  ("Moderna",             ["moderna", "mrna", "stephane bancel", "mrna vaccine"]),
                "LLY":   ("Eli Lilly",           ["eli lilly", "lly", "ozempic", "mounjaro", "david ricks"]),
                "NVO":   ("Novo Nordisk",        ["novo nordisk", "nvo", "ozempic", "wegovy", "semaglutide"]),
                "ABBV":  ("AbbVie",              ["abbvie", "abbv", "humira", "skyrizi"]),
                "MRK":   ("Merck",               ["merck", "mrk", "keytruda", "robert davis"]),
                "BMY":   ("Bristol-Myers Squibb", ["bristol-myers", "bmy", "opdivo", "eliquis"]),
                "GILD":  ("Gilead Sciences",     ["gilead", "gild", "veklury"]),
                "REGN":  ("Regeneron",           ["regeneron", "regn", "eylea", "dupixent"]),
                "ISRG":  ("Intuitive Surgical",  ["intuitive surgical", "isrg", "da vinci"]),
                "TMO":   ("Thermo Fisher",       ["thermo fisher", "tmo"]),
                "DHR":   ("Danaher",             ["danaher", "dhr"]),
                "BSX":   ("Boston Scientific",   ["boston scientific", "bsx"]),
                "MDT":   ("Medtronic",           ["medtronic", "mdt", "geoff martha"]),
                "UNH":   ("UnitedHealth",        ["unitedhealth", "unh", "optum"]),
                "CVS":   ("CVS Health",          ["cvs", "karen lynch"]),
                # ── 에너지 ──
                "XOM":   ("ExxonMobil",          ["exxon", "exxonmobil", "xom", "darren woods"]),
                "CVX":   ("Chevron",             ["chevron", "cvx", "mike wirth"]),
                "SHEL":  ("Shell",               ["shell", "shel", "wael sawan"]),
                "BP":    ("BP",                  ["bp", "murray auchincloss"]),
                "TTE":   ("TotalEnergies",       ["totalenergies", "tte"]),
                # ── 항공우주 / 방산 ──
                "BA":    ("Boeing",              ["boeing", "ba", "kelly ortberg", "737", "787"]),
                "RTX":   ("RTX Raytheon",        ["raytheon", "rtx", "greg hayes", "pratt whitney"]),
                "LMT":   ("Lockheed Martin",     ["lockheed", "lmt", "james taiclet"]),
                "NOC":   ("Northrop Grumman",    ["northrop", "noc", "kathy warden"]),
                "GD":    ("General Dynamics",    ["general dynamics", "gd", "phebe novakovic"]),
                "HII":   ("Huntington Ingalls",  ["huntington ingalls", "hii"]),
                "SPCE":  ("Virgin Galactic",     ["virgin galactic", "spce"]),
                "RKT":   ("Rocket Companies",    ["rocket companies", "rkt"]),
                # ── 통신 ──
                "T":     ("AT&T",               ["at&t", "att", "john stankey"]),
                "VZ":    ("Verizon",             ["verizon", "vz", "hans vestberg"]),
                "TMUS":  ("T-Mobile",            ["t-mobile", "tmus", "mike sievert"]),
                "CMCSA": ("Comcast",             ["comcast", "cmcsa", "brian roberts"]),
                "CHTR":  ("Charter Communications", ["charter", "chtr", "chris winfrey"]),
                # ── ETF ──
                "SPY":   ("S&P 500 ETF",         ["s&p 500", "spy", "spdr", "sp500"]),
                "QQQ":   ("Nasdaq 100 ETF",       ["nasdaq", "qqq", "invesco"]),
                "SCHD":  ("Schwab Dividend ETF",  ["schd", "schwab dividend"]),
                "VOO":   ("Vanguard S&P 500 ETF", ["vanguard", "voo"]),
                "VTI":   ("Vanguard Total Market ETF", ["vanguard total", "vti"]),
                "IWM":   ("iShares Russell 2000",  ["russell 2000", "iwm", "small cap"]),
                "GLD":   ("SPDR Gold ETF",        ["gold etf", "gld", "spdr gold"]),
                "SOXL":  ("Direxion Semiconductor", ["soxl", "semiconductor etf", "soxx"]),
                "TQQQ":  ("ProShares UltraPro QQQ", ["tqqq", "triple leveraged", "ultrapro qqq"]),
                "SQQQ":  ("ProShares UltraPro Short QQQ", ["sqqq", "short nasdaq"]),
                # ── 일본 ──
                "9984.T": ("SoftBank",           ["softbank", "masayoshi son", "vision fund"]),
                "7203.T": ("Toyota",             ["toyota", "akio toyoda", "bz4x"]),
                "6758.T": ("Sony",               ["sony", "playstation", "kenichiro yoshida"]),
                "9432.T": ("NTT",                ["ntt", "nippon telegraph"]),
                "7267.T": ("Honda",              ["honda", "toshihiro mibe"]),
                "6861.T": ("Keyence",            ["keyence"]),
                "4063.T": ("Shin-Etsu Chemical", ["shin-etsu", "shinetsu"]),
                # ── 한국 ADR ──
                "055550.KS": ("Shinhan Financial", ["신한", "shinhan"]),
                # ── 기타 글로벌 주요 종목 ──
                "SONY":  ("Sony",                ["sony", "playstation", "ps5", "kenichiro yoshida"]),
                "TM":    ("Toyota",              ["toyota", "akio toyoda", "lexus"]),
                "HMC":   ("Honda",               ["honda", "toshihiro mibe"]),
                "DELL":  ("Dell Technologies",   ["dell", "michael dell", "optiplex"]),
                "HPQ":   ("HP Inc",              ["hp inc", "hpq", "enrique lores"]),
                "HPE":   ("Hewlett Packard Enterprise", ["hewlett packard", "hpe", "antonio neri"]),
                "IBM":   ("IBM",                 ["ibm", "arvind krishna", "watson"]),
                "ACN":   ("Accenture",           ["accenture", "acn", "julie sweet"]),
                "CSCO":  ("Cisco",               ["cisco", "csco", "chuck robbins"]),
                "ANET":  ("Arista Networks",     ["arista", "anet", "jayshree ullal"]),
                "RBLX":  ("Roblox",              ["roblox", "rblx", "david baszucki"]),
                "U":     ("Unity Software",      ["unity software", "unity"]),
                "SNAP":  ("Snap",                ["snap", "snapchat", "evan spiegel"]),
                "PINS":  ("Pinterest",           ["pinterest", "pins", "bill ready"]),
                "MTCH":  ("Match Group",         ["match group", "tinder", "mtch", "hinge"]),
                "SE":    ("Sea Limited",         ["sea limited", "se", "shopee", "garena", "seamoney"]),
                "GRAB":  ("Grab",               ["grab", "anthony tan"]),
                "NTES":  ("NetEase",             ["netease", "ntes", "william ding"]),
                "BIDU":  ("Baidu",               ["baidu", "bidu", "robin li", "ernie bot"]),
                "TCEHY": ("Tencent",             ["tencent", "tcehy", "wechat", "pony ma"]),
                "RACE":  ("Ferrari",             ["ferrari", "race", "benedetto vigna"]),
                "LVMUY": ("LVMH",               ["lvmh", "louis vuitton", "bernard arnault"]),
                "LVS":   ("Las Vegas Sands",     ["las vegas sands", "lvs", "rob goldstein"]),
                "MGM":   ("MGM Resorts",         ["mgm resorts", "mgm", "bill hornbuckle"]),
                "WYNN":  ("Wynn Resorts",        ["wynn", "craig billings"]),
                "DKNG":  ("DraftKings",          ["draftkings", "dkng", "jason robins"]),
                "PENN":  ("Penn Entertainment",  ["penn", "espn bet"]),
            }

            # 매핑에서 이름과 키워드 추출
            map_val = ENGLISH_NAME_MAP.get(clean_symbol)
            if isinstance(map_val, tuple):
                eng_name, filter_keywords = map_val
            else:
                # [NEW] 매핑에 없는 종목은 yfinance로 회사명 자동 조회
                eng_name = clean_symbol
                yf_long_name = ""
                try:
                    import yfinance as yf
                    ticker_obj = yf.Ticker(clean_symbol)
                    info = ticker_obj.info
                    yf_long_name = info.get("longName") or info.get("shortName") or ""
                    if yf_long_name:
                        eng_name = yf_long_name
                        print(f"[News][yf] Auto-resolved name: {clean_symbol} → {eng_name}")
                except Exception as yf_err:
                    print(f"[News][yf] Name lookup failed for {clean_symbol}: {yf_err}")

                # 키워드: 티커 + 회사명의 첫 단어
                filter_keywords = [clean_symbol.lower()]
                if yf_long_name:
                    # 회사명의 첫 2단어도 키워드로 추가
                    name_words = yf_long_name.lower().split()[:2]
                    filter_keywords.extend([w for w in name_words if len(w) > 2])

            def _fetch_google_rss(query: str, use_filter: bool = True, max_items: int = 40) -> list:
                """Google RSS 뉴스 수집 공통 함수"""
                results = []
                seen = set()
                try:
                    encoded = urllib.parse.quote(query)
                    url = f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"
                    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        root = ET.fromstring(resp.read())
                        channel = root.find("channel")
                        if channel is None:
                            return results
                        for item in channel.findall("item"):
                            if len(results) >= max_items:
                                break
                            title_el  = item.find("title")
                            link_el   = item.find("link")
                            pub_el    = item.find("pubDate")
                            source_el = item.find("source")
                            title = (title_el.text or "").strip() if title_el is not None else ""
                            if not title or title in seen:
                                continue
                            if use_filter:
                                title_lower = title.lower()
                                if not any(kw in title_lower for kw in filter_keywords):
                                    continue
                            seen.add(title)
                            results.append({
                                "title":       title,
                                "link":        link_el.text if link_el is not None else "",
                                "publisher":   source_el.text if source_el is not None else "Google News",
                                "published":   pub_el.text[:16] if pub_el is not None and pub_el.text else "",
                                "description": ""
                            })
                except Exception as rss_err:
                    print(f"[News][RSS] Error for '{query}': {rss_err}")
                return results

            # ── Step 1: 다중 쿼리로 필터링 적용 뉴스 수집 ──────────────────
            def _collect_global_news_step1():
                results = []
                seen_titles = set()
                # 검색 우선순위: (1) 티커+stock (2) 회사명+stock (3) 회사명+earnings (4) 회사명
                queries = [
                    f"{clean_symbol} stock",
                    f"{eng_name} stock",
                    f"{eng_name} earnings",
                    f"{eng_name}",
                ]
                for q in queries:
                    if len(results) >= MAX_NEWS_COUNT:
                        break
                    new_items = _fetch_google_rss(q, use_filter=True, max_items=MAX_NEWS_COUNT)
                    for item in new_items:
                        if item["title"] not in seen_titles:
                            seen_titles.add(item["title"])
                            results.append(item)
                print(f"[News][Step1] '{clean_symbol}' filtered results: {len(results)}")
                return results

            news = await asyncio.to_thread(_collect_global_news_step1)

            # ── Step 2: 20개 미달이면 필터 없이 티커 단독 검색으로 보충 ─────
            if len(news) < MIN_NEWS_COUNT:
                existing = {n["title"] for n in news}
                def _collect_global_news_step2():
                    results = []
                    # 필터 없이 티커+회사명 조합으로 보충
                    queries_nofilter = [
                        f"{clean_symbol} {eng_name} stock",
                        f"{clean_symbol} stock news",
                        f"{clean_symbol}",
                    ]
                    for q in queries_nofilter:
                        new_items = _fetch_google_rss(q, use_filter=False, max_items=30)
                        for item in new_items:
                            if item["title"] not in existing and item["title"] not in {r["title"] for r in results}:
                                results.append(item)
                        if len(results) >= (MIN_NEWS_COUNT - len(news)):
                            break
                    print(f"[News][Step2] '{clean_symbol}' nofilter supplement: +{len(results)}")
                    return results

                extra = await asyncio.to_thread(_collect_global_news_step2)
                news.extend(extra)

            # ── Step 3: 여전히 20개 미달이면 회사명 단독 필터 없이 최후 보충 ─
            if len(news) < MIN_NEWS_COUNT and eng_name != clean_symbol:
                existing = {n["title"] for n in news}
                def _collect_global_news_step3():
                    results = []
                    new_items = _fetch_google_rss(eng_name, use_filter=False, max_items=25)
                    for item in new_items:
                        if item["title"] not in existing and item["title"] not in {r["title"] for r in results}:
                            results.append(item)
                    print(f"[News][Step3] '{clean_symbol}' final supplement: +{len(results)}")
                    return results
                extra3 = await asyncio.to_thread(_collect_global_news_step3)
                news.extend(extra3)

            # 최대 MAX_NEWS_COUNT 개 제한
            news = news[:MAX_NEWS_COUNT]

        # ─────────────────────────────────────────────────────────────────────
        # 3-B. 국내 종목: 네이버 모바일 API → 네이버 검색 API → Google RSS (20개 이상 보장)
        # ─────────────────────────────────────────────────────────────────────
        else:
            from korea_data import get_integrated_stock_news
            news = await asyncio.to_thread(
                get_integrated_stock_news,
                symbol=symbol,
                name=korean_name,
                days=30
            )

            # 국내 종목도 20개 미달 시 Google RSS 한국어로 보충
            if len(news) < MIN_NEWS_COUNT and korean_name:
                existing_titles = {n["title"] for n in news}
                def _collect_korean_rss_supplement():
                    results = []
                    seen = set()
                    search_queries = []
                    # 종목 코드가 있으면 코드만으로 검색 (동음이의어 방지, 예: 남성)
                    code = symbol.split('.')[0]
                    if code and code.isdigit() and len(code) == 6:
                        search_queries.append(code)
                    else:
                        search_queries.append(korean_name)

                    for kw in search_queries:
                        if not kw:
                            continue
                        try:
                            # 코드로 검색할 때는 '주가' 키워드 없이 코드만으로 정확도 높임
                            query_str = kw if kw.isdigit() else f'"{kw}" 주가'
                            encoded = urllib.parse.quote(query_str)
                            url = f"https://news.google.com/rss/search?q={encoded}&hl=ko&gl=KR&ceid=KR:ko"
                            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                            with urllib.request.urlopen(req, timeout=8) as resp:
                                root = ET.fromstring(resp.read())
                                channel = root.find("channel")
                                if channel:
                                    for item in channel.findall("item")[:25]:
                                        title_el  = item.find("title")
                                        link_el   = item.find("link")
                                        pub_el    = item.find("pubDate")
                                        source_el = item.find("source")
                                        title = (title_el.text or "").strip() if title_el is not None else ""
                                        if not title or title in existing_titles or title in seen:
                                            continue
                                        seen.add(title)
                                        results.append({
                                            "title":       title,
                                            "link":        link_el.text if link_el is not None else "",
                                            "publisher":   source_el.text if source_el is not None else "Google News",
                                            "published":   pub_el.text[:16] if pub_el is not None and pub_el.text else "",
                                            "description": ""
                                        })
                        except Exception as e:
                            print(f"[News][KR-RSS] Error for '{kw}': {e}")
                    print(f"[News][KR-RSS] Korean supplement: +{len(results)}")
                    return results

                kr_extra = await asyncio.to_thread(_collect_korean_rss_supplement)
                news.extend(kr_extra)
                news = news[:MAX_NEWS_COUNT]

        print(f"[News] Final result: {len(news)} articles for {symbol}")
        return {"status": "success", "data": news}
    except Exception as e:
        import traceback
        print(f"[News] Endpoint error for {symbol}: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}


@router.get("/stock/{symbol}/disclosures")
@turbo_cache(ttl_seconds=300)
def stock_disclosures(symbol: str, period: str = Query("1m")):
    """기업 공시 정보 (국내 전용 - DART 연동)"""
    import re
    from dart_disclosure import get_dart_disclosures
    
    # 글로벌 종목 여부 판별
    is_global = any(c.isalpha() for c in symbol) and not symbol.endswith(('.KS', '.KQ'))
    
    if is_global:
        try:
            from sec_api_client import get_cik_by_ticker, fetch_recent_filings
            cik = get_cik_by_ticker(symbol)
            if not cik:
                return {
                    "status": "success", 
                    "data": []
                }
            data = fetch_recent_filings(cik, limit=15)
            return {"status": "success", "data": data}
        except Exception as e:
            print(f"[SEC] Disclosure error for {symbol}: {e}")
            return {"status": "error", "message": str(e)}

    try:
        data = get_dart_disclosures(symbol, period)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/supply-chain/{symbol}")
@turbo_cache(ttl_seconds=86400)
def supply_chain_route(symbol: str):
    from ai_analysis import analyze_supply_chain
    try:
        data = analyze_supply_chain(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/supply-chain/detail/{symbol}")
@turbo_cache(ttl_seconds=86400)
def supply_chain_detail_route(symbol: str, name: str = Query(None)):
    from ai_analysis import analyze_node_detail
    try:
        data = analyze_node_detail(symbol, name)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/supply-chain/scenario")
@turbo_cache(ttl_seconds=86400)
def supply_chain_scenario_route(keyword: str, target_symbol: str = Query(None)):
    from ai_analysis import analyze_supply_chain_scenario
    try:
        data = analyze_supply_chain_scenario(keyword, target_symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class PortfolioReq(BaseModel):
    portfolio: list[str] = []
    symbols: list[str] = []

@router.post("/portfolio/diagnosis")
def analyze_portfolio_route(req: PortfolioReq):
    target = req.portfolio if req.portfolio else req.symbols
    if not target:
        return {"status": "error", "message": "No symbols provided"}
    
    # [Optimize] Add caching for AI Portfolio Diagnosis to prevent budget exhaustion
    from turbo_engine import turbo_engine
    import hashlib
    
    # 정렬된 종목 심볼 리스트를 기반으로 고유 캐시 키 생성 (조합이 같으면 무조건 캐시 히트)
    sorted_target = sorted(list(set(target)))
    target_str = ",".join(sorted_target)
    cache_key = f"v15:analyze_portfolio:{hashlib.md5(target_str.encode()).hexdigest()}"
    
    cached_data = turbo_engine.get_cache(cache_key)
    if cached_data is not None:
        print(f"[AI-Cache] Portfolio cache HIT for {target_str}")
        return {"status": "success", "data": cached_data}
    
    from ai_analysis import analyze_portfolio_data
    try:
        data = analyze_portfolio_data(target)
        if data:
            turbo_engine.set_cache(cache_key, data, ttl=3600)  # 1시간 캐싱
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/portfolio/optimize")
def optimize_portfolio_route(req: PortfolioReq):
    target = req.symbols if req.symbols else req.portfolio
    if not target or len(target) < 2:
        return {"status": "error", "message": "At least 2 symbols required for optimization"}
    
    from portfolio_opt import optimize_portfolio
    try:
        data = optimize_portfolio(target)
        if isinstance(data, dict) and "error" in data:
            return {"status": "error", "message": data["error"]}
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
