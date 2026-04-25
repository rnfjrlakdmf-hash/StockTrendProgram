from fastapi import APIRouter, Query, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import time
import urllib.parse
from turbo_engine import turbo_cache, turbo_engine

router = APIRouter()

@router.get("/stock/{symbol}")
async def read_stock(symbol: str, skip_ai: bool = False):
    symbol = urllib.parse.unquote(symbol).strip()
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
