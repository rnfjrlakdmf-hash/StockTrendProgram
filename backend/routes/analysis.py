from fastapi import APIRouter, Query, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import time
import urllib.parse
from turbo_engine import turbo_cache, turbo_engine

router = APIRouter()

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
@turbo_cache(ttl_seconds=10)  # [Cache] 10초 캐시: 많은 유저가 동시 접속해도 Naver API는 10초에 1회만 호출
def stock_extended_hours(symbol: str):
    """
    [New] 해외 주식 세션별 가격 정보: 프리마켓 / 정규장 / 에프터마켓
    나스닥, S&P500 등 미국 주식 및 주요 해외 지수에 대응합니다.
    """
    import re
    try:
        from rank_data import get_world_stock_integration
        
        # 해외 종목 여부 확인
        clean_code = symbol.split('.')[0]
        is_domestic = len(clean_code) == 6 and clean_code.isdigit()
        
        if is_domestic:
            return {"status": "error", "message": "국내 종목은 extended-hours 데이터가 제공되지 않습니다."}
        
        # 네이버 해외 주식 통합 API 호출
        raw = get_world_stock_integration([symbol])
        item = raw.get(symbol) if raw else None
        
        if not item:
            return {"status": "error", "message": f"해외 주식 데이터를 찾을 수 없습니다: {symbol}"}
        
        over = item.get("overMarketPriceInfo") or {}
        
        # 세션 타입 결정
        session_type = over.get("tradingSessionType", "")  # PRE_MARKET or AFTER_HOURS
        over_status = over.get("overMarketStatus", "CLOSE")  # OPEN or CLOSE
        market_status = item.get("marketStatus", "CLOSE")    # OPEN or CLOSE
        
        # 정규장 데이터
        regular_price = float(item.get("currentPrice", 0))
        regular_change = float(item.get("fluctuations", 0))
        regular_change_pct = float(item.get("fluctuationsRatio", 0))
        prev_close = float(item.get("lastClosePrice", regular_price - regular_change))
        
        # 시외 데이터 (프리마켓 또는 에프터마켓)
        over_price = float(over.get("overPrice", 0)) if over.get("overPrice") else None
        over_change = float(over.get("fluctuations", 0)) if over.get("fluctuations") else None
        over_change_pct = float(over.get("fluctuationsRatio", 0)) if over.get("fluctuationsRatio") else None
        over_update_time = over.get("localTradedAt", "")
        
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
        currency_code = item.get("currencyType", "USD")
        usd_krw = get_exchange_rate("USD") if currency_code == "USD" else None
        
        result = {
            "symbol": item.get("symbolCode", symbol),
            "name": item.get("stockName", symbol),
            "exchange": item.get("stockExchangeType", ""),
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
                "open": float(item.get("openPrice", 0)) if item.get("openPrice") else None,
                "high": float(item.get("highPrice", 0)) if item.get("highPrice") else None,
                "low": float(item.get("lowPrice", 0)) if item.get("lowPrice") else None,
                "volume": int(item.get("accumulatedTradingVolume", 0)) if item.get("accumulatedTradingVolume") else None,
                "is_active": market_status == "OPEN",
                "updated_at": item.get("localTradedAt", ""),
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
            "per": item.get("per"),
            "pbr": item.get("pbr"),
            "dividend_yield": item.get("dividendYieldRatio"),
            "market_cap": item.get("marketValue"),
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
                    # [2단계] DB 캐시 없음 → Gemini API 호출 (3~15초)
                    ai_result = await asyncio.to_thread(analyze_stock, data)
                    data.update({
                        "score": ai_result.get("score", 50),
                        "metrics": ai_result.get("metrics", {"supplyDemand": 50, "financials": 50, "news": 50}),
                        "summary": ai_result.get("analysis_summary", data["summary"]),
                        "rationale": ai_result.get("rationale", {}),
                        "related_stocks": ai_result.get("related_stocks", [])
                    })
                    # [3단계] DB에 AI 결과 저장 (6시간 캐시, 비동기 백그라운드)
                    await asyncio.to_thread(save_analysis_result, data)
                    await asyncio.to_thread(save_ai_analysis_cache, data['symbol'], ai_result)
            except Exception as e:
                print(f"[ERROR] AI Analysis in thread failed: {e}")
        
        # [메모리 캐시] TTL 60분 (skip_ai=False), 10분 (skip_ai=True)
        # skip_ai=True: Fast Fetch 결과 10분 캐시 → 재검색 시 즉시 반환
        # skip_ai=False: AI 결과 포함 1시간 캐시 → Gemini 재호출 없음
        mem_ttl = 3600 if not skip_ai else 600
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
        f1 = executor.submit(get_quant_scorecard, symbol)
        f2 = executor.submit(get_financial_health, symbol)
        f3 = executor.submit(get_naver_investor_data, symbol, 20)
        f4 = executor.submit(gather_naver_stock_data, symbol)
        f5 = executor.submit(get_korean_investment_indicators, symbol, "0", "IFRSL", "1")
        q_d, h_d, i_r, s_d, ind_r = f1.result(), f2.result(), f3.result(), f4.result(), f5.result()
    
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
    from chart_analysis import get_chart_analysis_full
    result = await asyncio.to_thread(get_chart_analysis_full, ticker, interval, period)
    if result and "history" in result and len(result["history"]) > 0:
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
    from korea_data import get_korean_investment_indicators
    try:
        raw_data = get_korean_investment_indicators(symbol, freq=freq, fin_gubun=finGubun, rpt=category)
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
    """특정 종목의 기간별 뉴스 수집 (글로벌 종목 대응)"""
    from stock_data import fetch_google_news, get_korean_name
    try:
        # 1. 글로벌 종목 여부 판별
        is_global = any(c.isalpha() for c in symbol) and not symbol.endswith(('.KS', '.KQ'))
        
        # 2. 종목명 찾기 (뉴스 검색용)
        from stock_data import NAME_CACHE, GLOBAL_KOREAN_NAMES
        
        name = NAME_CACHE.get(symbol)
        if not name:
            # GLOBAL_KOREAN_NAMES에서 먼저 확인
            if symbol in GLOBAL_KOREAN_NAMES:
                val = GLOBAL_KOREAN_NAMES[symbol]
                name = val[0] if isinstance(val, list) else val
            else:
                name = await asyncio.to_thread(get_korean_name, symbol)
                if not name:
                    name = symbol

        # 3. 뉴스 검색 (글로벌 종목은 영어/US 검색 병행 또는 전환 고려)
        if is_global:
            # 글로벌 종목은 영어 뉴스 비중이 높으므로 언어 설정 조정 가능
            # 여기서는 우선 쿼리를 종목명 + 심볼로 강화
            search_query = f"{name} {symbol} stock"
            news = await asyncio.to_thread(fetch_google_news, search_query, lang='en', region='US', period='30d')
            
            # 만약 영어 뉴스 결과가 너무 적으면 한국어 뉴스도 시도 (선택 사항)
            if not news:
                news = await asyncio.to_thread(fetch_google_news, name, lang='ko', region='KR', period='30d')
        else:
            from korea_data import get_integrated_stock_news
            news = await asyncio.to_thread(get_integrated_stock_news, symbol=symbol, name=name, days=30)
            
        return {"status": "success", "data": news}
    except Exception as e:
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
        return {
            "status": "success", 
            "data": {
                "is_global": True,
                "message": "공시 정보는 현재 국내 상장사(DART) 기준으로 제공됩니다. 해외 종목의 경우 실시간 뉴스 탭을 참고해 주세요."
            }
        }

    try:
        data = get_dart_disclosures(symbol, period)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/supply-chain/{symbol}")
@turbo_cache(ttl_seconds=300)
def supply_chain_route(symbol: str):
    from ai_analysis import analyze_supply_chain
    try:
        data = analyze_supply_chain(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/supply-chain/detail/{symbol}")
@turbo_cache(ttl_seconds=300)
def supply_chain_detail_route(symbol: str, name: str = Query(None)):
    from ai_analysis import analyze_node_detail
    try:
        data = analyze_node_detail(symbol, name)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/supply-chain/scenario")
@turbo_cache(ttl_seconds=300)
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
    
    from ai_analysis import analyze_portfolio_data
    try:
        data = analyze_portfolio_data(target)
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
