# -*- coding: utf-8 -*-
"""
AI 매매 전략 자율 연습장 & 튜너 라우터
- 국내·해외 전 종목 실시간 검색 & 시뮬레이션
- 가상매매(PAPER) / 실전매매(REAL) 완벽 분리 등록 및 실시간 감시 제어
"""

from fastapi import APIRouter, Body, Query, HTTPException
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import re
import requests

from strategy_lab_service import run_strategy_auto_tuning_loop
from korea_data import search_stock_code

router = APIRouter(prefix="/strategy-lab", tags=["StrategyLab"])
KST = timezone(timedelta(hours=9))

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
    "스파이": "SPY", "큐큐큐": "QQQ", "슈드": "SCHD",
    "코인베이스": "COIN", "마이크로스트래티지": "MSTR",
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
    "암": "ARM", "퀄컴": "QCOM", "마이크론": "MU",
    "로켓랩": "RKLB", "오클로": "OKLO", "조비": "JOBY", "아처": "ACHR",
    "리게티": "RGTI", "소파이": "SOFI", "코스트코": "COST",
}

US_TICKER_TO_KO = {v: k for k, v in US_STOCK_NAME_MAP.items() if re.search(r"[가-힣]", k)}


def _get_display_name(symbol: str, fallback: str = "") -> str:
    sym = (symbol or "").strip().upper()
    if re.match(r"^\d{6}$", sym):
        try:
            from stock_names import STOCK_MAP
            for n, c in STOCK_MAP.items():
                if c == sym:
                    return n
        except Exception:
            pass
    if sym in US_TICKER_TO_KO:
        return f"{US_TICKER_TO_KO[sym]} ({sym})"
    return fallback or sym


def resolve_stock_symbol(raw_symbol: str) -> tuple[str, str]:
    """입력한 종목명/코드/티커를 (표준 코드/티커, 표시 종목명)으로 해석"""
    s = (raw_symbol or "").strip()
    if not s:
        return "005930", "삼성전자"
    s_clean = s.replace(" ", "")
    s_upper = s_clean.upper()

    # 괄호 안 코드/티커 추출 (예: "삼성전자 (005930)" 또는 "엔비디아 (NVDA)")
    m_paren = re.search(r"\(([A-Za-z0-9.-]{1,10})\)", s)
    if m_paren:
        inner = m_paren.group(1).upper()
        if re.match(r"^\d{6}$", inner) or re.match(r"^[A-Z]{1,6}(?:-[A-Z])?$", inner):
            name_part = s.split("(")[0].strip()
            return inner, name_part or _get_display_name(inner)

    # 1. 미국 주식 한글명/인기명 매핑
    for key in (s, s_clean, s_upper):
        if key in US_STOCK_NAME_MAP:
            tick = US_STOCK_NAME_MAP[key]
            return tick, _get_display_name(tick, s)

    # 2. 6자리 한국 종목코드 직접 입력
    if re.match(r"^\d{6}$", s_upper):
        return s_upper, _get_display_name(s_upper, s_upper)

    # 3. 미국 티커 직접 입력 (예: NVDA, TSLA, BRK-B, SOXL)
    if re.match(r"^[A-Z]{1,6}(?:-[A-Z])?$", s_upper):
        return s_upper, _get_display_name(s_upper, s_upper)

    # 4. 인메모리 한국 전 종목(STOCK_MAP) 정확/부분 검색
    try:
        from stock_names import STOCK_MAP
        if s in STOCK_MAP:
            return STOCK_MAP[s], s
        for k_name, k_code in STOCK_MAP.items():
            if k_name.replace(" ", "").upper() == s_upper:
                return k_code, k_name
    except Exception:
        pass

    # 5. GLOBAL_KOREAN_NAMES 검색
    try:
        from stock_data import GLOBAL_KOREAN_NAMES
        for tick, ko_names in GLOBAL_KOREAN_NAMES.items():
            names = ko_names if isinstance(ko_names, list) else [ko_names]
            for kn in names:
                if kn.replace(" ", "").upper() == s_upper:
                    return tick.upper(), f"{names[0]} ({tick.upper()})"
    except Exception:
        pass

    # 6. korea_data / 네이버 자동완성 / Yahoo 검색 폴백
    code = search_stock_code(s)
    if code:
        return code, _get_display_name(code, s)

    try:
        r = requests.get(
            "https://ac.stock.naver.com/ac",
            params={"q": s, "target": "stock,index,marketindicator"},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=3,
        )
        if r.status_code == 200:
            items = r.json().get("items") or []
            for it in items:
                c = str(it.get("code") or "").strip()
                nm = str(it.get("name") or s).strip()
                if c and (re.match(r"^\d{6}$", c) or re.match(r"^[A-Z]{1,6}$", c.upper())):
                    return c.upper(), nm
    except Exception:
        pass

    try:
        from global_search import search_global_ticker
        g_tick = search_global_ticker(s)
        if g_tick:
            return g_tick.upper(), _get_display_name(g_tick.upper(), s)
    except Exception:
        pass

    return s_upper, s


@router.get("/search-stocks")
def api_search_all_stocks(q: str = Query("", min_length=1)):
    """
    국내(코스피·코스닥·ETF) + 해외(미국 주식·ETF) 전 종목 초고속 실시간 자동완성 검색 API
    """
    query = (q or "").strip()
    if not query:
        return {"status": "ok", "results": []}

    q_norm = query.replace(" ", "").upper()
    results: List[Dict[str, Any]] = []
    seen = set()

    def _add(code: str, name: str, market: str, display: str = ""):
        c = str(code or "").strip().upper()
        if not c or c in seen:
            return
        seen.add(c)
        results.append({
            "symbol": c,
            "name": name or c,
            "market": market,
            "label": display or f"{name} ({c})",
        })

    # 1. 직접 코드/티커 입력 매칭
    if re.match(r"^\d{6}$", q_norm):
        _add(q_norm, _get_display_name(q_norm, q_norm), "KR")
    elif re.match(r"^[A-Z]{1,6}$", q_norm) and q_norm.isascii():
        ko_n = US_TICKER_TO_KO.get(q_norm, q_norm)
        _add(q_norm, ko_n, "US")

    # 2. 미국 인기 종목 한글명 매칭
    for ko_k, tick in US_STOCK_NAME_MAP.items():
        if q_norm in ko_k.replace(" ", "").upper() or q_norm in tick:
            ko_disp = US_TICKER_TO_KO.get(tick, tick)
            _add(tick, ko_disp, "US")
            if len(results) >= 6:
                break

    try:
        from stock_data import GLOBAL_KOREAN_NAMES
        for tick, ko_names in GLOBAL_KOREAN_NAMES.items():
            names = ko_names if isinstance(ko_names, list) else [ko_names]
            if any(q_norm in n.replace(" ", "").upper() for n in names) or q_norm in tick.upper():
                _add(tick.upper(), names[0], "US")
                if len(results) >= 10:
                    break
    except Exception:
        pass

    # 3. 국내 전 종목(STOCK_MAP 2,892+ 종목) 초고속 매칭 (정확 -> 접두 -> 포함)
    try:
        from stock_names import STOCK_MAP
        exact, prefix, contain = [], [], []
        for s_name, s_code in STOCK_MAP.items():
            sn_u = s_name.replace(" ", "").upper()
            if sn_u == q_norm:
                exact.append((s_code, s_name))
            elif sn_u.startswith(q_norm):
                prefix.append((s_code, s_name))
            elif q_norm in sn_u or (q_norm.isdigit() and s_code.startswith(q_norm)):
                contain.append((s_code, s_name))
        for sc, sn in (exact + prefix + contain)[:12]:
            _add(sc, sn, "KR")
    except Exception:
        pass

    # 4. 네이버 주식 자동완성 (국내 ETF, 신규상장주, 해외종목까지 실시간 보완!)
    if len(results) < 10:
        try:
            r = requests.get(
                "https://ac.stock.naver.com/ac",
                params={"q": query, "target": "stock"},
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=2.5,
            )
            if r.status_code == 200:
                for it in (r.json().get("items") or [])[:12]:
                    c = str(it.get("code") or "").strip().upper()
                    nm = str(it.get("name") or "").strip()
                    nation = str(it.get("nationCode") or "").upper()
                    type_nm = str(it.get("typeName") or "").upper()
                    if not c or not nm:
                        continue
                    if nation == "KOR" and re.match(r"^\d{6}$", c):
                        mkt = "ETF(KR)" if "ETF" in type_nm else "KR"
                        _add(c, nm, mkt)
                    elif nation == "USA" and re.match(r"^[A-Z0-9.-]{1,8}$", c):
                        _add(c, nm, "US")
        except Exception:
            pass

    # 5. 영문 검색 시 Yahoo Finance 전 종목(미국 주식·ETF) 자동완성 보완
    if len(results) < 10 and any(ch.isalpha() and ch.isascii() for ch in query):
        try:
            yr = requests.get(
                f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=8&newsCount=0",
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=2.5,
            )
            if yr.status_code == 200:
                for qt in yr.json().get("quotes", []):
                    qtype = qt.get("quoteType", "")
                    sym = str(qt.get("symbol") or "").strip().upper()
                    nm = str(qt.get("shortname") or qt.get("longname") or sym).strip()
                    if qtype in ("EQUITY", "ETF") and sym and "." not in sym:
                        _add(sym, nm, "US" if qtype == "EQUITY" else "ETF(US)")
        except Exception:
            pass

    return {"status": "ok", "results": results[:15]}


@router.post("/tune")
def api_tune_strategy(payload: Dict[str, Any] = Body(...)):
    """
    대표님이 제안한 매매 방법을 과거 주가로 시험하고 스스로 3단계 고쳐주는 자율 학습 백테스트 API
    """
    raw_symbol = str(payload.get("symbol") or "005930").strip()
    resolved_symbol, display_name = resolve_stock_symbol(raw_symbol)

    init_buy_dip = float(payload.get("buy_dip") or payload.get("buy_dip_pct") or 3.0)
    init_tp = float(payload.get("take_profit") or payload.get("take_profit_pct") or 5.0)
    init_sl = float(payload.get("stop_loss") or payload.get("stop_loss_pct") or 5.0)
    max_dd = float(payload.get("max_dd") or payload.get("max_drawdown_pct") or 15.0)
    years = int(payload.get("years") or 5)
    prompt = str(payload.get("prompt") or "")
    strategy_type = str(payload.get("strategy_type") or "SAFE_DIP").strip().upper()
    knife_filter = bool(payload.get("knife_filter", strategy_type != "SIMPLE_DIP"))
    vol_mult = float(payload.get("vol_mult") or 1.5)

    # 자연어 프롬프트가 주어졌을 경우 숫자 추출 보조
    if prompt:
        dip_m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:넘게|이상)?\s*(?:떨|하락|빠)", prompt)
        if dip_m:
            init_buy_dip = float(dip_m.group(1))
        tp_m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:이상)?\s*(?:오르|상승|익절|수익)", prompt)
        if tp_m:
            init_tp = float(tp_m.group(1))
        sl_m = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:이상)?\s*(?:손절|팔기|털)", prompt)
        if sl_m:
            init_sl = float(sl_m.group(1))
        dd_m = re.search(r"최대\s*손실\s*(?:한도)?\s*[:\s]*(\d+(?:\.\d+)?)", prompt)
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
        strategy_type=strategy_type,
        knife_filter=knife_filter,
        vol_mult=vol_mult,
    )
    if res.get("status") != "success":
        return res

    res["searched_name"] = raw_symbol
    res["stock_name"] = display_name
    res["resolved_symbol"] = resolved_symbol
    if isinstance(res.get("strategy_config"), dict):
        res["strategy_config"]["stock_name"] = display_name

    # 프론트엔드 호환성을 위한 키 정규화
    steps = res.get("steps_table", [])
    tuning_steps = []
    for i, s in enumerate(steps):
        ret_val = float(re.sub(r"[^0-9.-]", "", s.get("return_pct", "0")) or 0)
        win_val = float(re.sub(r"[^0-9.-]", "", s.get("win_rate", "0")) or 0)
        tuning_steps.append({
            "step": i,
            "title": s.get("step", f"Step {i}"),
            "description": s.get("change", ""),
            "reason": s.get("reason", s.get("change", "")),
            "buy_dip": s.get("buy_dip", res.get("improved_rules", {}).get("buy_dip", 3.0)),
            "take_profit": s.get("tp", res.get("improved_rules", {}).get("tp", 5.0)),
            "stop_loss": s.get("sl", res.get("improved_rules", {}).get("sl", 4.0)),
            "vol_mult": s.get("vol_mult", res.get("vol_mult", 1.5)),
            "is_best": bool(s.get("is_best", False)),
            "adopted": bool(s.get("adopted", False)),
            "blocked_knives": int(s.get("blocked_knives", 0)),
            "metrics": {
                "total_return_pct": ret_val,
                "win_rate_pct": win_val,
                "total_trades": s.get("trades", 0),
                "mdd_pct": 0,
                "halted": False,
                "profit_factor": 1.0,
            },
        })
    res["tuning_steps"] = tuning_steps

    bnh_raw = steps[0].get("bnh_return", "0%") if steps else "0%"
    res["benchmark_buy_and_hold_return_pct"] = float(re.sub(r"[^0-9.-]", "", bnh_raw) or 0)

    impr_r = res.get("improved_rules", {})
    eff_type = res.get("strategy_type", "SAFE_DIP")
    eff_vol = float(impr_r.get("vol_mult", res.get("vol_mult", 1.5)))
    if eff_type == "BREAKOUT":
        buy_rule_txt = f"주가 +{impr_r.get('buy_dip', 2.5)}% 돌파 + 거래량 평균 대비 {eff_vol:.1f}배↑ + 20일선 지지 + 과열 배제 시 매수"
    elif eff_type == "SAFE_DIP":
        buy_rule_txt = f"전일 대비 -{impr_r.get('buy_dip', 3.0)}% 하락 + 🛡️ 악재 칼날 방지(60일선 지지·투매 거래량 차단·RSI·수급) 통과 시 매수"
    else:
        buy_rule_txt = f"전일 종가 대비 -{impr_r.get('buy_dip', 3.0)}% 이상 하락한 날 ➔ 필터 없이 즉시 분할 매수"
    res["rule_summary"] = {
        "buy_rule": buy_rule_txt,
        "sell_rule": f"매수가 대비 +{impr_r.get('tp', 5.0)}% 상승 시 익절, -{impr_r.get('sl', 4.5)}% 하락 시 손절 방어",
    }

    oos = res.get("recent_1year_oos", {})
    init_oos_ret = float(re.sub(r"[^0-9.-]", "", oos.get("initial_return_pct", "0")) or 0)
    impr_oos_ret = float(re.sub(r"[^0-9.-]", "", oos.get("improved_return_pct", "0")) or 0)
    res["out_of_sample_1year"] = {
        "period": oos.get("period", "최근 1년"),
        "before_tune": {
            "return_pct": init_oos_ret,
            "win_rate_pct": float(oos.get("initial_win_rate_pct") or 0),
            "trades": oos.get("initial_trades", 0),
        },
        "after_tune": {
            "return_pct": impr_oos_ret,
            "win_rate_pct": float(oos.get("improved_win_rate_pct") or 0),
            "trades": oos.get("improved_trades", 0),
        },
        "status": "OVERFITTING_WARNING" if "CAUTION" in oos.get("eval_status", "") else "STABLE_IMPROVEMENT",
        "live_readiness": oos.get("live_readiness", res.get("live_readiness", "WATCH")),
        "warning_message": oos.get("comment", ""),
    }

    return res


@router.post("/deploy")
def api_deploy_strategy_to_bot(payload: Dict[str, Any] = Body(...)):
    """
    자가 교정 완료된 최종 매매 규칙을 가상매매(PAPER) 또는 실전매매(REAL) 엔진에 분리 등록하고
    즉시 1회 실시간 시세 감시 상태를 초기화합니다.
    """
    config = dict(payload.get("strategy_config") or {})
    if not config or not config.get("symbol"):
        raise HTTPException(status_code=400, detail="strategy_config와 symbol이 필요합니다.")

    sym = str(config.get("symbol")).strip().upper()
    stock_name = str(payload.get("stock_name") or config.get("stock_name") or _get_display_name(sym, sym)).strip()
    trade_mode = str(payload.get("trade_mode") or config.get("trade_mode") or "PAPER").strip().upper()
    trade_mode = "REAL" if trade_mode in ("REAL", "KIS_REAL") else "PAPER"
    default_alloc = 500000 if trade_mode == "REAL" else 2000000
    allocation_krw = max(50000, int(payload.get("allocation_krw") or config.get("allocation_krw") or default_alloc))
    auto_enable_master = bool(payload.get("auto_enable_master", False))

    buy_dip = abs(float(config.get("buy_dip_threshold_pct", 3.0)))
    tp = abs(float(config.get("take_profit_threshold_pct", 5.0)))
    sl = abs(float(config.get("stop_loss_pct", 4.0)))
    st_type = str(payload.get("strategy_type") or config.get("strategy_type") or "SAFE_DIP").strip().upper()
    if st_type not in ("SAFE_DIP", "BREAKOUT", "SIMPLE_DIP"):
        st_type = "SAFE_DIP"
    vol_mult = max(1.1, float(payload.get("vol_mult") or config.get("vol_mult") or 1.5))
    knife_filter_enabled = st_type != "SIMPLE_DIP"
    st_name_map = {
        "SAFE_DIP": "🛡️ 칼날방지 눌림목",
        "BREAKOUT": "🚀 거래량·수급 돌파",
        "SIMPLE_DIP": "📉 단순 하락 매수",
    }
    st_name = str(config.get("strategy_name") or st_name_map[st_type])

    try:
        from auto_trader_service import load_state, save_state, execute_custom_ai_strategies

        state = load_state()
        cfg = state.get("config", {})
        kis_configured = bool(
            (cfg.get("kis_app_key") or "") and (cfg.get("kis_app_secret") or "") and (cfg.get("kis_account_no") or "")
        )

        # 동일 (symbol, trade_mode) 전략이 이미 있으면 최신 규칙으로 갱신
        custom_strategies = state.get("custom_ai_strategies", [])
        custom_strategies = [
            s for s in custom_strategies
            if not (str(s.get("symbol", "")).upper() == sym and str(s.get("trade_mode", "PAPER")).upper() == trade_mode)
        ]

        now_str = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
        strat_id = f"STRAT-{trade_mode}-{sym}-{datetime.now(KST).strftime('%m%d%H%M%S')}"
        config.update({
            "strategy_id": strat_id,
            "symbol": sym,
            "stock_name": stock_name,
            "strategy_type": st_type,
            "strategy_name": st_name,
            "knife_filter_enabled": knife_filter_enabled,
            "vol_mult": vol_mult,
            "trade_mode": trade_mode,
            "allocation_krw": allocation_krw,
            "enabled": True,
            "buy_dip_threshold_pct": buy_dip,
            "take_profit_threshold_pct": tp,
            "stop_loss_pct": sl,
            "deployed_at": now_str,
        })
        custom_strategies.insert(0, config)
        state["custom_ai_strategies"] = custom_strategies[:30]

        watched = state.get("watchlist", [])
        if sym not in watched:
            watched.append(sym)
            state["watchlist"] = watched

        # 가상매매는 기본 ON, 실전매매는 사용자가 명시적으로 켜거나 기존 ON 유지
        lab_settings = state.get("strategy_lab_settings") or {"paper_enabled": True, "real_enabled": False}
        if trade_mode == "PAPER":
            lab_settings["paper_enabled"] = True
        elif trade_mode == "REAL" and auto_enable_master:
            lab_settings["real_enabled"] = True
        state["strategy_lab_settings"] = lab_settings

        # 등록 직후 즉시 1회 실시간 시세·감시 상태 갱신
        try:
            execute_custom_ai_strategies(state)
        except Exception as _ex:
            print(f"[StrategyLab] Initial monitor refresh warning: {_ex}")

        save_state(state)

        mode_ko = "🔥 실전매매 (한국투자증권 실계좌)" if trade_mode == "REAL" else "🧪 가상매매 (모의투자 엔진)"
        if st_type == "BREAKOUT":
            buy_cond_txt = f"20일선 위 거래량 {vol_mult:.1f}배↑ · 당일 +{buy_dip:.1f}% 돌파 시 자동 진입"
        elif st_type == "SAFE_DIP":
            buy_cond_txt = f"🛡️ 칼날방지(60일선·투매차단·수급) 통과 + 당일 -{buy_dip:.1f}% 눌림목 진입"
        else:
            buy_cond_txt = f"당일 -{buy_dip:.1f}% 하락 시 자동 진입"
        return {
            "status": "success",
            "message": f"[{mode_ko}] '{stock_name}({sym})' ({st_name}) 전략이 자동매매 감시 엔진에 등록되었습니다!",
            "strategy": next((s for s in state["custom_ai_strategies"] if s.get("strategy_id") == strat_id), config),
            "strategy_lab_settings": state["strategy_lab_settings"],
            "kis_configured": kis_configured,
            "deployed_rule": {
                "symbol": sym,
                "stock_name": stock_name,
                "strategy_type": st_type,
                "strategy_name": st_name,
                "trade_mode": trade_mode,
                "allocation_krw": allocation_krw,
                "buy_condition": buy_cond_txt,
                "take_profit": f"+{tp}% 목표 달성 시 익절",
                "stop_loss": f"-{sl}% 손절선 엄수",
            },
        }
    except Exception as e:
        return {"status": "error", "message": f"자동매매 등록 실패: {str(e)}"}


@router.get("/strategies")
def api_list_deployed_strategies(refresh: bool = Query(True)):
    """
    현재 자동매매 봇이 실시간 감시 중인 모든 전략(가상매매 PAPER / 실전매매 REAL 분리),
    보유 포지션, 체결 이력, 마스터 스위치 상태를 반환합니다.
    """
    try:
        from auto_trader_service import load_state, save_state, execute_custom_ai_strategies

        state = load_state()
        if refresh and state.get("custom_ai_strategies"):
            try:
                execute_custom_ai_strategies(state)
                save_state(state)
            except Exception as _ex:
                print(f"[StrategyLab] Live refresh warning: {_ex}")

        strategies = state.get("custom_ai_strategies", [])
        paper_strategies = [s for s in strategies if str(s.get("trade_mode", "PAPER")).upper() != "REAL"]
        real_strategies = [s for s in strategies if str(s.get("trade_mode", "PAPER")).upper() == "REAL"]

        cfg = state.get("config", {})
        acct_no = str(cfg.get("kis_account_no") or "")
        kis_configured = bool(cfg.get("kis_app_key") and cfg.get("kis_app_secret") and acct_no)
        masked_acct = f"{acct_no[:4]}****{acct_no[-3:]}" if len(acct_no) >= 8 else acct_no

        return {
            "status": "ok",
            "settings": state.get("strategy_lab_settings", {"paper_enabled": True, "real_enabled": False}),
            "kis_configured": kis_configured,
            "kis_order_enabled": bool(cfg.get("kis_order_enabled", True)),
            "kis_account_masked": masked_acct,
            "strategies": strategies,
            "paper_strategies": paper_strategies,
            "real_strategies": real_strategies,
            "positions": state.get("strategy_lab_positions", []),
            "logs": state.get("strategy_lab_logs", [])[:30],
            "last_cycle_at": state.get("last_cycle_at", ""),
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "strategies": [], "paper_strategies": [], "real_strategies": []}


@router.patch("/settings")
def api_update_lab_settings(payload: Dict[str, Any] = Body(...)):
    """
    가상매매(paper_enabled) / 실전매매(real_enabled) 마스터 스위치를 각각 독립적으로 ON/OFF 설정
    """
    try:
        from auto_trader_service import load_state, save_state, execute_custom_ai_strategies

        state = load_state()
        settings = state.get("strategy_lab_settings") or {"paper_enabled": True, "real_enabled": False}
        if "paper_enabled" in payload:
            settings["paper_enabled"] = bool(payload["paper_enabled"])
        if "real_enabled" in payload:
            settings["real_enabled"] = bool(payload["real_enabled"])
        state["strategy_lab_settings"] = settings

        if state.get("custom_ai_strategies"):
            try:
                execute_custom_ai_strategies(state)
            except Exception:
                pass
        save_state(state)
        return {"status": "ok", "settings": settings}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.patch("/strategies/{strategy_id}")
def api_update_strategy(strategy_id: str, payload: Dict[str, Any] = Body(...)):
    """
    개별 등록 전략의 ON/OFF 토글, 가상(PAPER)↔실전(REAL) 모드 변경, 1회 투자금 변경
    """
    try:
        from auto_trader_service import load_state, save_state, execute_custom_ai_strategies

        state = load_state()
        strategies = state.get("custom_ai_strategies", [])
        target = None
        for s in strategies:
            if s.get("strategy_id") == strategy_id:
                if "enabled" in payload:
                    s["enabled"] = bool(payload["enabled"])
                if "trade_mode" in payload:
                    tm = str(payload["trade_mode"]).upper()
                    s["trade_mode"] = "REAL" if tm in ("REAL", "KIS_REAL") else "PAPER"
                if "allocation_krw" in payload:
                    s["allocation_krw"] = max(50000, int(payload["allocation_krw"]))
                target = s
                break

        if not target:
            raise HTTPException(status_code=404, detail="해당 전략을 찾을 수 없습니다.")

        try:
            execute_custom_ai_strategies(state)
        except Exception:
            pass
        save_state(state)
        return {"status": "ok", "strategy": target}
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.delete("/strategies/{strategy_id}")
def api_delete_strategy(strategy_id: str):
    """등록된 전략 삭제(실시간 감시 중지)"""
    try:
        from auto_trader_service import load_state, save_state

        state = load_state()
        before = len(state.get("custom_ai_strategies", []))
        state["custom_ai_strategies"] = [
            s for s in state.get("custom_ai_strategies", [])
            if s.get("strategy_id") != strategy_id
        ]
        after = len(state["custom_ai_strategies"])
        save_state(state)
        return {"status": "ok", "deleted": before - after, "remaining": after}
    except Exception as e:
        return {"status": "error", "message": str(e)}
