# -*- coding: utf-8 -*-
"""
AI 매매 전략 자율 연습장 & 튜너 라우터
"""

from fastapi import APIRouter, Body, Query, Header, HTTPException
from typing import Optional, Dict, Any, List
from strategy_lab_service import run_strategy_auto_tuning_loop
from korea_data import search_stock_code
import re

router = APIRouter(prefix="/strategy-lab", tags=["StrategyLab"])

US_STOCK_NAME_MAP = {
    "테슬라": "TSLA", "TESLA": "TSLA",
    "애플": "AAPL", "APPLE": "AAPL",
    "엔비디아": "NVDA", "NVIDIA": "NVDA",
    "마이크로소프트": "MSFT", "MICROSOFT": "MSFT",
    "아마존": "AMZN", "AMAZON": "AMZN",
    "알파벳": "GOOGL", "구글": "GOOGL", "GOOGLE": "GOOGL",
    "메타": "META", "페이스북": "META",
    "팔란티어": "PLTR", "PALANTIR": "PLTR",
    "넷플릭스": "NFLX", "NETFLIX": "NFLX",
    "아이온큐": "IONQ", "IONQ": "IONQ",
    "브로드컴": "AVGO", "BROADCOM": "AVGO",
    "에이엠디": "AMD", "AMD": "AMD",
    "인텔": "INTC", "INTEL": "INTC",
    "코카콜라": "KO", "스타벅스": "SBUX",
    "슈퍼마이크로": "SMCI", "슈퍼마이크로컴퓨터": "SMCI",
    "티큐": "TQQQ", "속슬": "SOXL",
    "스파이": "SPY", "큐큐큐": "QQQ",
    "코인베이스": "COIN",
    "TSM": "TSM", "TSMC": "TSM", "티에스엠씨": "TSM",
    "ASML": "ASML", "에이에스엠엘": "ASML",
    "모더나": "MRNA", "화이자": "PFE",
    "노보노디스크": "NVO", "일라이릴리": "LLY",
    "버크셔": "BRK-B", "워렌버핏": "BRK-B",
    "보잉": "BA", "월마트": "WMT", "엑슨모빌": "XOM",
    "셰브론": "CVX", "유나이티드헬스": "UNH",
    "존슨앤존슨": "JNJ", "비자": "V", "마스터카드": "MA",
    "JP모건": "JPM", "골드만삭스": "GS", "디즈니": "DIS",
    "나이키": "NKE", "로블록스": "RBLX", "유니티": "U",
    "에어비앤비": "ABNB", "우버": "UBER", "스노우플레이크": "SNOW",
    "암": "ARM", "퀄컴": "QCOM", "마이크론": "MU"
}

def resolve_stock_symbol(raw_symbol: str) -> str:
    s = (raw_symbol or "").strip()
    s_clean = s.replace(" ", "")
    s_upper = s_clean.upper()
    
    # 1. 미국 주식 한글명/인기명 매핑
    if s in US_STOCK_NAME_MAP:
        return US_STOCK_NAME_MAP[s]
    if s_clean in US_STOCK_NAME_MAP:
        return US_STOCK_NAME_MAP[s_clean]
    if s_upper in US_STOCK_NAME_MAP:
        return US_STOCK_NAME_MAP[s_upper]
        
    # 2. 미국 직관적 티커 (1~5자리 알파벳, 예: TSLA, AAPL, NVDA, QQQ 등)
    if re.match(r'^[A-Za-z]{1,5}$', s_upper):
        return s_upper
        
    # 3. 한국 종목명 또는 6자리 코드 검색 (KOSPI / KOSDAQ 전 종목 2,500+)
    code = search_stock_code(s)
    if code:
        return code
        
    return s_upper


@router.post("/tune")
def api_tune_strategy(payload: Dict[str, Any] = Body(...)):
    """
    대표님이 제안한 매매 방법을 과거 주가로 시험하고 스스로 3단계 고쳐주는 자율 학습 백테스트 API
    """
    raw_symbol = str(payload.get("symbol") or "005930").strip()
    resolved_symbol = resolve_stock_symbol(raw_symbol)

    init_buy_dip = float(payload.get("buy_dip") or 3.0)
    init_tp = float(payload.get("take_profit") or 5.0)
    init_sl = float(payload.get("stop_loss") or 5.0)
    max_dd = float(payload.get("max_dd") or 15.0)
    years = int(payload.get("years") or 5)
    prompt = str(payload.get("prompt") or "")

    # 자연어 프롬프트가 주어졌을 경우 숫자 추출 보조
    if prompt:
        dip_m = re.search(r'(\d+(?:\.\d+)?)\s*%\s*(?:넘게|이상)?\s*(?:떨|하락|빠)', prompt)
        if dip_m:
            init_buy_dip = float(dip_m.group(1))
        tp_m = re.search(r'(\d+(?:\.\d+)?)\s*%\s*(?:이상)?\s*(?:오르|상승|익절|수익)', prompt)
        if tp_m:
            init_tp = float(tp_m.group(1))
        sl_m = re.search(r'(\d+(?:\.\d+)?)\s*%\s*(?:이상)?\s*(?:손절|팔기|털)', prompt)
        if sl_m:
            init_sl = float(sl_m.group(1))
        dd_m = re.search(r'최대\s*손실\s*(?:한도)?\s*[:\s]*(\d+(?:\.\d+)?)', prompt)
        if dd_m:
            max_dd = float(dd_m.group(1))

    res = run_strategy_auto_tuning_loop(
        symbol=resolved_symbol,
        user_prompt=prompt,
        init_buy_dip=init_buy_dip,
        init_tp=init_tp,
        init_sl=init_sl,
        max_dd=max_dd,
        years=years,
    )
    res["searched_name"] = raw_symbol
    res["resolved_symbol"] = resolved_symbol

    # 프론트엔드 호환성을 위한 키 정규화
    steps = res.get("steps_table", [])
    tuning_steps = []
    for i, s in enumerate(steps):
        ret_val = float(re.sub(r'[^0-9.-]', '', s.get("return_pct", "0")) or 0)
        win_val = float(re.sub(r'[^0-9.-]', '', s.get("win_rate", "0")) or 0)
        tuning_steps.append({
            "step": i,
            "title": s.get("step", f"Step {i}"),
            "description": s.get("change", ""),
            "reason": s.get("change", ""),
            "buy_dip": res.get("improved_rules", {}).get("buy_dip", 3.0),
            "take_profit": res.get("improved_rules", {}).get("tp", 5.0),
            "stop_loss": res.get("improved_rules", {}).get("sl", 4.0),
            "metrics": {
                "total_return_pct": ret_val,
                "win_rate_pct": win_val,
                "total_trades": s.get("trades", 0),
                "mdd_pct": 0,
                "halted": False,
                "profit_factor": 1.0,
            }
        })
    res["tuning_steps"] = tuning_steps

    bnh_raw = steps[0].get("bnh_return", "0%") if steps else "0%"
    res["benchmark_buy_and_hold_return_pct"] = float(re.sub(r'[^0-9.-]', '', bnh_raw) or 0)

    init_r = res.get("initial_rules", {})
    res["rule_summary"] = {
        "buy_rule": f"전일 종가 대비 -{init_r.get('buy_dip', 3.0)}% 이상 급락한 날 ➔ 익일 시초가 분할 매수",
        "sell_rule": f"매수가 대비 +{init_r.get('tp', 5.0)}% 상승 시 익절, -{init_r.get('sl', 5.0)}% 하락 시 손절",
    }

    oos = res.get("recent_1year_oos", {})
    init_oos_ret = float(re.sub(r'[^0-9.-]', '', oos.get("initial_return_pct", "0")) or 0)
    impr_oos_ret = float(re.sub(r'[^0-9.-]', '', oos.get("improved_return_pct", "0")) or 0)
    res["out_of_sample_1year"] = {
        "period": oos.get("period", "최근 1년"),
        "before_tune": {
            "return_pct": init_oos_ret,
            "win_rate_pct": 0,
            "trades": oos.get("initial_trades", 0),
        },
        "after_tune": {
            "return_pct": impr_oos_ret,
            "win_rate_pct": 0,
            "trades": oos.get("improved_trades", 0),
        },
        "status": "OVERFITTING_WARNING" if "CAUTION" in oos.get("eval_status", "") else "STABLE_IMPROVEMENT",
        "warning_message": oos.get("comment", "")
    }

    return res


@router.post("/deploy")
def api_deploy_strategy_to_bot(payload: Dict[str, Any] = Body(...)):
    """
    자가 교정 완료된 최종 매매 규칙을 대표이사 자동매매 봇(auto_trader_service)에 즉시 등록
    """
    config = payload.get("strategy_config")
    if not config:
        raise HTTPException(status_code=400, detail="strategy_config가 필요합니다.")

    sym = config.get("symbol")
    buy_dip = config.get("buy_dip_threshold_pct", 3.0)
    tp = config.get("take_profit_threshold_pct", 5.0)
    sl = config.get("stop_loss_pct", 4.0)

    try:
        from auto_trader_service import load_state, save_state
        state = load_state()
        
        # 사용자 커스텀 AI 튜닝 전략 목록에 보관
        custom_strategies = state.get("custom_ai_strategies", [])
        custom_strategies.append(config)
        state["custom_ai_strategies"] = custom_strategies[-20:] # 최근 20개 보관
        
        # 감시 타겟에 종목 추가
        watched = state.get("watchlist", [])
        if sym not in watched:
            watched.append(sym)
            state["watchlist"] = watched

        save_state(state)
        return {
            "status": "success",
            "message": f"'{sym}' AI 최적화 매매 전략이 자동매매 시스템에 성공적으로 등록되었습니다!",
            "deployed_rule": {
                "symbol": sym,
                "buy_condition": f"당일 -{buy_dip}% 급락 시 익일 시초가 분할 매수",
                "take_profit": f"+{tp}% 목표 달성 시 익절",
                "stop_loss": f"-{sl}% 손절선 엄수",
            }
        }
    except Exception as e:
        return {"status": "error", "message": f"자동매매 등록 실패: {str(e)}"}
