from fastapi import APIRouter, Query, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import time
import urllib.parse
from turbo_engine import turbo_cache, turbo_engine

router = APIRouter()

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
    cache_key = f"stock_full_{symbol}_{skip_ai}"
    cached = turbo_engine.get_cache(cache_key)
    if cached: return {"status": "success", "data": cached, "turbo": True}
    
    # Lazy Imports
    from stock_data import get_stock_info
    from ai_analysis import analyze_stock
    from db_manager import save_analysis_result
    
    # Use to_thread to prevent blocking
    data = await asyncio.to_thread(get_stock_info, symbol)
    if data:
        if not skip_ai:
            try:
                # Run heavy AI analysis in a separate thread
                ai_result = await asyncio.to_thread(analyze_stock, data)
                data.update({
                    "score": ai_result.get("score", 50),
                    "metrics": ai_result.get("metrics", {"supplyDemand": 50, "financials": 50, "news": 50}),
                    "summary": ai_result.get("analysis_summary", data["summary"]),
                    "rationale": ai_result.get("rationale", {}),
                    "related_stocks": ai_result.get("related_stocks", [])
                })
                await asyncio.to_thread(save_analysis_result, data)
            except Exception as e:
                print(f"[ERROR] AI Analysis in thread failed: {e}")
        
        turbo_engine.set_cache(cache_key, data)
        return {"status": "success", "data": data, "turbo": False}
    return {"status": "error", "message": "Stock not found"}

@router.get("/pro/summary/{symbol}")
def read_pro_summary(symbol: str):
    cache_key = f"pro_summary_{symbol}"
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
async def read_theme(keyword: str):
    # Lazy Imports
    from ai_analysis import analyze_theme
    from stock_data import get_simple_quote
    
    result = await asyncio.to_thread(analyze_theme, keyword)
    if result:
        for s in result.get("leaders", []) + result.get("followers", []):
            q = get_simple_quote(s.get("symbol"))
            if q: s.update({"price": q.get("price"), "change": q.get("change")})
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
                # yfinance returns: Holder, Shares, Date Reported, % Out, Value
                for _, row in holders.iterrows():
                    data.append({
                        "name": str(row.get('Holder', 'Unknown')),
                        "shares": int(row.get('Shares', 0)),
                        "date": str(row.get('Date Reported', '')),
                        "percent": f"{row.get('% Out', 0)*100:.2f}%" if row.get('% Out') else "N/A"
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
        return get_naver_investor_data(symbol, trader_day=period)
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
            news = await asyncio.to_thread(fetch_google_news, search_query, lang='en', region='US', period=period)
            
            # 만약 영어 뉴스 결과가 너무 적으면 한국어 뉴스도 시도 (선택 사항)
            if not news:
                news = await asyncio.to_thread(fetch_google_news, name, lang='ko', region='KR', period=period)
        else:
            news = await asyncio.to_thread(fetch_google_news, name, lang='ko', region='KR', period=period)
            
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
