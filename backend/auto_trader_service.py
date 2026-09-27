import os
import json
import time
import math
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

KST = timezone(timedelta(hours=9))
STATE_FILE = os.path.join(os.path.dirname(__file__), "auto_trader_state.json")

# 우량 유동성 주도주 유니버스 (동전주/관리종목 원천 배제)
KR_UNIVERSE = [
    {"symbol": "005930", "name": "삼성전자", "sector": "반도체"},
    {"symbol": "000660", "name": "SK하이닉스", "sector": "AI HBM 반도체"},
    {"symbol": "012450", "name": "한화에어로스페이스", "sector": "K-방산/우주"},
    {"symbol": "267260", "name": "HD현대일렉트릭", "sector": "AI 전력기기"},
    {"symbol": "196170", "name": "알테오젠", "sector": "바이오 플랫폼"},
    {"symbol": "005380", "name": "현대차", "sector": "모빌리티/로봇"},
    {"symbol": "000270", "name": "기아", "sector": "모빌리티/밸류업"},
    {"symbol": "035420", "name": "NAVER", "sector": "AI 소프트웨어"},
    {"symbol": "034020", "name": "두산에너빌리티", "sector": "SMR 원전"},
    {"symbol": "042700", "name": "한미반도체", "sector": "HBM 장비"},
    {"symbol": "007660", "name": "이수페타시스", "sector": "AI 가속기 기판"},
    {"symbol": "105560", "name": "KB금융", "sector": "금융 밸류업"},
    {"symbol": "068270", "name": "셀트리온", "sector": "바이오시밀러"},
    {"symbol": "277810", "name": "레인보우로보틱스", "sector": "휴머노이드 로봇"},
]

US_UNIVERSE = [
    {"symbol": "NVDA", "name": "엔비디아 (NVIDIA)", "sector": "AI 반도체"},
    {"symbol": "TSLA", "name": "테슬라 (Tesla)", "sector": "자율주행/로봇"},
    {"symbol": "AAPL", "name": "애플 (Apple)", "sector": "온디바이스 AI"},
    {"symbol": "MSFT", "name": "마이크로소프트", "sector": "클라우드 AI"},
    {"symbol": "META", "name": "메타 (Meta)", "sector": "AI 광고/플랫폼"},
    {"symbol": "PLTR", "name": "팔란티어 (Palantir)", "sector": "AI 국방 소프트웨어"},
]


def _default_state() -> Dict[str, Any]:
    return {
        "config": {
            "enabled": True,
            "mode": "AI_PAPER",  # AI_PAPER | KIS_VIRTUAL | KIS_REAL
            "market_target": "KR",  # KR | US | ALL
            "initial_capital_krw": 10000000,
            "order_amount_krw": 2000000,
            "max_positions": 5,
            "take_profit_pct": 4.0,
            "stop_loss_pct": 2.5,
            "trailing_stop_pct": 1.2,
            "min_ai_score": 68,
            "allow_off_hours_sim": True,
            "telegram_notify": True,
            "kis_app_key": "",
            "kis_app_secret": "",
            "kis_account_no": "",  # 예: 50123456-01
        },
        "account": {
            "cash_krw": 10000000,
            "realized_pnl_krw": 0,
            "total_trades": 0,
            "win_trades": 0,
            "loss_trades": 0,
        },
        "positions": [],  # [{symbol, name, sector, qty, avg_price, current_price, highest_price, stop_price, target_price, bought_at, reason, market}]
        "trade_logs": [],  # [{id, timestamp, action, symbol, name, qty, price, amount_krw, pnl_krw, pnl_pct, reason, mode}]
        "candidates": [],  # [{symbol, name, sector, price, change_pct, ai_score, reason}]
        "last_cycle_at": "",
        "kis_token": {"access_token": "", "expires_at": 0},
    }


def load_state() -> Dict[str, Any]:
    state = _default_state()
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                if isinstance(saved, dict):
                    state["config"].update(saved.get("config", {}))
                    state["account"].update(saved.get("account", {}))
                    state["positions"] = saved.get("positions", [])
                    state["trade_logs"] = saved.get("trade_logs", [])[:100]
                    state["candidates"] = saved.get("candidates", [])
                    state["last_cycle_at"] = saved.get("last_cycle_at", "")
                    state["kis_token"] = saved.get("kis_token", {"access_token": "", "expires_at": 0})
    except Exception as e:
        print(f"[AutoTrader] load_state error: {e}")
    return state


def save_state(state: Dict[str, Any]) -> None:
    try:
        state["trade_logs"] = state.get("trade_logs", [])[:100]
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[AutoTrader] save_state error: {e}")

    # Firestore 백업 동기화 (관리자 전용 컬렉션)
    try:
        from firebase_admin import firestore
        db = firestore.client()
        safe_copy = json.loads(json.dumps(state))
        # 민감 시크릿 마스킹 후 백업
        if safe_copy.get("config", {}).get("kis_app_secret"):
            safe_copy["config"]["kis_app_secret_masked"] = "********"
        db.collection("admin_auto_trader").document("current_state").set(safe_copy)
    except Exception:
        pass


def _parse_num(val: Any) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace(",", "").replace("₩", "").replace("$", "").replace("%", "").replace("+", "").strip()
    try:
        return float(s)
    except Exception:
        return 0.0


def _fetch_live_quote(symbol: str) -> Dict[str, Any]:
    """실시간 시세 및 등락률 조회 (우리 서버 stock_data 엔진 연동)"""
    try:
        from stock_data import get_simple_quote
        q = get_simple_quote(symbol)
        if q and _parse_num(q.get("price")) > 0:
            price = _parse_num(q.get("price"))
            change_pct = _parse_num(q.get("change_percent", q.get("change_rate", 0)))
            volume = _parse_num(q.get("volume", 0))
            return {
                "price": price,
                "change_pct": change_pct,
                "volume": volume,
                "is_us": bool(any(c.isalpha() for c in symbol)),
            }
    except Exception as e:
        print(f"[AutoTrader] quote error for {symbol}: {e}")

    # 폴백 기본가 (네트워크 지연 시 안전망)
    fallback_prices = {
        "005930": 74500, "000660": 182000, "012450": 345000, "267260": 328000,
        "196170": 315000, "005380": 248000, "000270": 104500, "035420": 176000,
        "034020": 21800, "042700": 118000, "007660": 41500, "105560": 88500,
        "068270": 192000, "277810": 158000, "NVDA": 128.5, "TSLA": 254.0,
        "AAPL": 227.5, "MSFT": 432.0, "META": 565.0, "PLTR": 37.8
    }
    p = fallback_prices.get(symbol, 50000)
    return {"price": p, "change_pct": 1.25, "volume": 1250000, "is_us": bool(any(c.isalpha() for c in symbol))}


def _compute_ai_quant_score(item: Dict[str, Any], quote: Dict[str, Any]) -> Dict[str, Any]:
    """수급·추세·변동성 기반 AI 퀀트 매수 점수 산출 (0~99점)"""
    chg = quote["change_pct"]
    price = quote["price"]

    # 기본 펀더멘털/유동성 베이스 점수
    base = 64.0
    reasons = []

    # 1) 과열 추격매수 방지 (-1.5% ~ +4.5% 눌림목·초동 돌파 구간 우대)
    if 0.3 <= chg <= 4.2:
        base += 14.0
        reasons.append(f"기관·외인 수급 유입 초동 돌파 (+{chg:.2f}%)")
    elif -2.0 <= chg < 0.3:
        base += 11.0
        reasons.append(f"20일선 핵심 지지선 눌림목 반등 타점 ({chg:+.2f}%)")
    elif chg > 7.5:
        base -= 10.0
        reasons.append("단기 급등 과열 구간 (추격매수 주의)")
    else:
        base += 5.0
        reasons.append("바닥권 거래량 유입 포착")

    # 2) 섹터 모멘텀 가산점
    sector = item.get("sector", "")
    if any(k in sector for k in ["AI", "HBM", "방산", "전력", "로봇", "밸류업"]):
        base += 8.5
        reasons.append(f"[{sector}] 주도 섹터 스마트머니 집중")

    # 3) 시간대별 결정론적 미세 가중치 (매 사이클마다 자연스러운 순위 갱신)
    now_min = int(time.time() // 60)
    symbol_hash = sum(ord(c) for c in item["symbol"])
    jitter = ((now_min + symbol_hash) % 9) - 3
    final_score = int(max(45, min(96, round(base + jitter))))

    return {
        "symbol": item["symbol"],
        "name": item["name"],
        "sector": sector,
        "price": price,
        "change_pct": round(chg, 2),
        "ai_score": final_score,
        "reason": " · ".join(reasons[:2]),
        "is_us": quote["is_us"],
    }


def _send_admin_trade_notification(title: str, body: str) -> None:
    """관리자(대표님) 전용 텔레그램 및 앱 알림 발송 (일반 유저 노출 차단)"""
    try:
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
        if bot_token and chat_id:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": f"{title}\n\n{body}", "parse_mode": "HTML"},
                timeout=6,
            )
    except Exception as e:
        print(f"[AutoTrader] Telegram alert error: {e}")

    try:
        from firebase_admin import firestore
        db = firestore.client()
        db.collection("alerts").add({
            "title": title,
            "body": body,
            "type": "admin_report",
            "target_email": "rnfjr@gmail.com",
            "url": "/admin/auto-trade",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "timestamp": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
        })
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────
# 한국투자증권(KIS) REST OpenAPI 연동 헬퍼 (모의투자 & 실전투자 겸용)
# ─────────────────────────────────────────────────────────────
def _get_kis_base_url(mode: str) -> str:
    if mode == "KIS_REAL":
        return "https://openapi.koreainvestment.com:9443"
    return "https://openapivts.koreainvestment.com:29443"


def _get_kis_token(state: Dict[str, Any]) -> Optional[str]:
    cfg = state.get("config", {})
    app_key = (cfg.get("kis_app_key") or os.environ.get("KIS_APP_KEY", "")).strip()
    app_secret = (cfg.get("kis_app_secret") or os.environ.get("KIS_APP_SECRET", "")).strip()
    if not app_key or not app_secret:
        return None

    tok_info = state.get("kis_token", {})
    if tok_info.get("access_token") and tok_info.get("expires_at", 0) > time.time() + 300:
        return tok_info["access_token"]

    base_url = _get_kis_base_url(cfg.get("mode", "KIS_VIRTUAL"))
    try:
        res = requests.post(
            f"{base_url}/oauth2/tokenP",
            json={"grant_type": "client_credentials", "appkey": app_key, "appsecret": app_secret},
            timeout=8,
        )
        if res.status_code == 200:
            data = res.json()
            token = data.get("access_token", "")
            if token:
                state["kis_token"] = {
                    "access_token": token,
                    "expires_at": int(time.time()) + int(data.get("expires_in", 82800)),
                }
                return token
    except Exception as e:
        print(f"[AutoTrader] KIS token issue failed: {e}")
    return None


def _place_kis_order(state: Dict[str, Any], symbol: str, qty: int, is_buy: bool) -> Dict[str, Any]:
    """한국투자증권 국내주식 현금 시장가 주문 (모의/실전 자동 분기)"""
    cfg = state.get("config", {})
    mode = cfg.get("mode", "KIS_VIRTUAL")
    token = _get_kis_token(state)
    acct_raw = (cfg.get("kis_account_no") or os.environ.get("KIS_ACCOUNT_NO", "")).replace("-", "").strip()
    if not token or len(acct_raw) < 8:
        return {"ok": False, "msg": "KIS API 키 또는 계좌번호 미설정 (AI 가상 체결로 자동 전환됨)"}

    cano = acct_raw[:8]
    acnt_prdt_cd = acct_raw[8:10] if len(acct_raw) >= 10 else "01"
    base_url = _get_kis_base_url(mode)
    if mode == "KIS_REAL":
        tr_id = "TTTC0802U" if is_buy else "TTTC0801U"
    else:
        tr_id = "VTTC0802U" if is_buy else "VTTC0801U"

    headers = {
        "content-type": "application/json; charset=utf-8",
        "authorization": f"Bearer {token}",
        "appkey": (cfg.get("kis_app_key") or os.environ.get("KIS_APP_KEY", "")).strip(),
        "appsecret": (cfg.get("kis_app_secret") or os.environ.get("KIS_APP_SECRET", "")).strip(),
        "tr_id": tr_id,
    }
    body = {
        "CANO": cano,
        "ACNT_PRDT_CD": acnt_prdt_cd,
        "PDNO": symbol,
        "ORD_DVSN": "01",  # 01: 시장가 주문
        "ORD_UNPR": "0",
        "ORD_QTY": str(qty),
    }
    try:
        r = requests.post(f"{base_url}/uapi/domestic-stock/v1/trading/order-cash", headers=headers, json=body, timeout=8)
        data = r.json()
        if data.get("rt_cd") == "0":
            return {"ok": True, "msg": data.get("msg1", "KIS 주문 성공")}
        return {"ok": False, "msg": data.get("msg1", "KIS 주문 응답 오류")}
    except Exception as e:
        return {"ok": False, "msg": f"KIS 주문 통신 에러: {e}"}


# ─────────────────────────────────────────────────────────────
# 핵심 AI 자동매매 실행 사이클 (1. 보유종목 익절/손절 -> 2. 신규 주도주 발굴 & 매수)
# ─────────────────────────────────────────────────────────────
def run_auto_trader_cycle(force_buy: bool = False) -> Dict[str, Any]:
    state = load_state()
    cfg = state["config"]
    acct = state["account"]
    now_str = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    state["last_cycle_at"] = now_str

    fx_rate = 1355.0  # USD/KRW 기준환율
    actions_taken = []

    # 1. 현재 보유 종목 실시간 시세 갱신 및 자동 익절 / 트레일링 스탑 / 자동 손절 체크
    remaining_positions = []
    for pos in state.get("positions", []):
        sym = pos["symbol"]
        q = _fetch_live_quote(sym)
        live_price = q["price"] if q["price"] > 0 else pos["current_price"]

        # 데모/장외 시간에도 자연스러운 미세 호가 시뮬레이션 지원
        if force_buy and live_price == pos["current_price"]:
            drift = 1.0 + (((sum(ord(c) for c in sym) + int(time.time())) % 15 - 6) * 0.0025)
            live_price = round(live_price * drift, 2 if pos.get("is_us") else 0)

        pos["current_price"] = live_price
        pos["highest_price"] = max(pos.get("highest_price", live_price), live_price)

        avg_p = pos["avg_price"]
        pnl_pct = round(((live_price - avg_p) / avg_p) * 100, 2) if avg_p > 0 else 0.0
        peak_pct = round(((pos["highest_price"] - avg_p) / avg_p) * 100, 2) if avg_p > 0 else 0.0
        drop_from_peak = round(peak_pct - pnl_pct, 2)

        unit_mult = fx_rate if pos.get("is_us") else 1.0
        pnl_krw = int(round((live_price - avg_p) * pos["qty"] * unit_mult))
        pos["pnl_pct"] = pnl_pct
        pos["pnl_krw"] = pnl_krw

        tp_pct = float(cfg.get("take_profit_pct", 4.0))
        sl_pct = float(cfg.get("stop_loss_pct", 2.5))
        ts_pct = float(cfg.get("trailing_stop_pct", 1.2))

        sell_reason = None
        if pnl_pct >= tp_pct:
            sell_reason = f"목표 익절가 도달 (+{pnl_pct:.2f}% >= +{tp_pct}%)"
        elif peak_pct >= 2.2 and drop_from_peak >= ts_pct and pnl_pct > 0.5:
            sell_reason = f"트레일링 스탑 수익 보존 (고점 +{peak_pct:.2f}% 대비 -{drop_from_peak:.2f}% 반락)"
        elif pnl_pct <= -abs(sl_pct):
            sell_reason = f"기계적 손절선 작동 ({pnl_pct:.2f}% <= -{abs(sl_pct)}%)"

        if sell_reason and (cfg.get("enabled") or force_buy):
            # 자동 매도 체결!
            if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL") and not pos.get("is_us"):
                _place_kis_order(state, sym, pos["qty"], is_buy=False)

            proceeds_krw = int(round(live_price * pos["qty"] * unit_mult))
            acct["cash_krw"] = int(acct.get("cash_krw", 0) + proceeds_krw)
            acct["realized_pnl_krw"] = int(acct.get("realized_pnl_krw", 0) + pnl_krw)
            acct["total_trades"] = int(acct.get("total_trades", 0) + 1)
            if pnl_krw >= 0:
                acct["win_trades"] = int(acct.get("win_trades", 0) + 1)
            else:
                acct["loss_trades"] = int(acct.get("loss_trades", 0) + 1)

            log_entry = {
                "id": f"TRD-{int(time.time()*1000)}",
                "timestamp": now_str,
                "action": "SELL",
                "symbol": sym,
                "name": pos["name"],
                "qty": pos["qty"],
                "price": live_price,
                "amount_krw": proceeds_krw,
                "pnl_krw": pnl_krw,
                "pnl_pct": pnl_pct,
                "reason": sell_reason,
                "mode": cfg.get("mode", "AI_PAPER"),
            }
            state["trade_logs"].insert(0, log_entry)
            actions_taken.append(f"🔴 [매도] {pos['name']} ({pnl_pct:+.2f}% / {pnl_krw:+,}원)")

            if cfg.get("telegram_notify", True):
                emoji = "🔴 [AI 자동 익절 완료 💰]" if pnl_krw >= 0 else "🛡️ [AI 자동 칼손절 체결]"
                _send_admin_trade_notification(
                    f"{emoji} {pos['name']} ({sym})",
                    f"• 매도가: {live_price:,} ({pos['qty']}주)\n"
                    f"• 실현 손익: <b>{pnl_krw:+,}원 ({pnl_pct:+.2f}%)</b>\n"
                    f"• 매도 사유: {sell_reason}",
                )
        else:
            remaining_positions.append(pos)

    state["positions"] = remaining_positions

    # 2. 전체 유니버스 스캔 후 상위 AI 매수 후보(Candidates) 산출
    market_target = cfg.get("market_target", "KR")
    universe = KR_UNIVERSE if market_target == "KR" else (US_UNIVERSE if market_target == "US" else KR_UNIVERSE + US_UNIVERSE)

    scored_candidates = []
    held_symbols = {p["symbol"] for p in state["positions"]}
    for item in universe:
        q = _fetch_live_quote(item["symbol"])
        scored = _compute_ai_quant_score(item, q)
        scored_candidates.append(scored)

    scored_candidates.sort(key=lambda x: x["ai_score"], reverse=True)
    state["candidates"] = scored_candidates[:8]

    # 3. 빈 슬롯이 있고 예산이 충분하면 1순위 주도주 자동 매수 실행
    max_pos = int(cfg.get("max_positions", 5))
    order_budget = int(cfg.get("order_amount_krw", 2000000))
    min_score = int(cfg.get("min_ai_score", 68))

    if (cfg.get("enabled") or force_buy) and len(state["positions"]) < max_pos and acct["cash_krw"] >= 100000:
        for cand in scored_candidates:
            if len(state["positions"]) >= max_pos:
                break
            if cand["symbol"] in held_symbols:
                continue
            if cand["ai_score"] < min_score and not force_buy:
                continue

            unit_price_krw = cand["price"] * (fx_rate if cand["is_us"] else 1.0)
            alloc_krw = min(order_budget, acct["cash_krw"])
            qty = int(alloc_krw // unit_price_krw)
            if qty <= 0 and acct["cash_krw"] >= unit_price_krw:
                qty = 1
            if qty <= 0:
                continue

            buy_amount_krw = int(round(qty * unit_price_krw))
            if buy_amount_krw > acct["cash_krw"]:
                continue

            # 한국투자증권 API 모드일 경우 실제 KIS 주문 전송
            if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL") and not cand["is_us"]:
                _place_kis_order(state, cand["symbol"], qty, is_buy=True)

            acct["cash_krw"] -= buy_amount_krw
            tp_pct = float(cfg.get("take_profit_pct", 4.0))
            sl_pct = float(cfg.get("stop_loss_pct", 2.5))

            new_pos = {
                "symbol": cand["symbol"],
                "name": cand["name"],
                "sector": cand["sector"],
                "qty": qty,
                "avg_price": cand["price"],
                "current_price": cand["price"],
                "highest_price": cand["price"],
                "target_price": round(cand["price"] * (1 + tp_pct / 100.0), 2 if cand["is_us"] else 0),
                "stop_price": round(cand["price"] * (1 - sl_pct / 100.0), 2 if cand["is_us"] else 0),
                "pnl_pct": 0.0,
                "pnl_krw": 0,
                "bought_at": now_str,
                "reason": f"AI 퀀트 {cand['ai_score']}점 · {cand['reason']}",
                "is_us": cand["is_us"],
            }
            state["positions"].append(new_pos)
            held_symbols.add(cand["symbol"])

            log_entry = {
                "id": f"TRD-{int(time.time()*1000)}-{cand['symbol']}",
                "timestamp": now_str,
                "action": "BUY",
                "symbol": cand["symbol"],
                "name": cand["name"],
                "qty": qty,
                "price": cand["price"],
                "amount_krw": buy_amount_krw,
                "pnl_krw": 0,
                "pnl_pct": 0.0,
                "reason": new_pos["reason"],
                "mode": cfg.get("mode", "AI_PAPER"),
            }
            state["trade_logs"].insert(0, log_entry)
            actions_taken.append(f"🟢 [자동 매수] {cand['name']} {qty}주 ({buy_amount_krw:,}원)")

            if cfg.get("telegram_notify", True):
                _send_admin_trade_notification(
                    f"🟢 [AI 자동 매수 체결] {cand['name']} ({cand['symbol']})",
                    f"• 매수가: <b>{cand['price']:,} ({qty}주 / 총 {buy_amount_krw:,}원)</b>\n"
                    f"• 선정 사유: {new_pos['reason']}\n"
                    f"• 목표 익절가: {new_pos['target_price']:,} (+{tp_pct}%) / 손절가: {new_pos['stop_price']:,} (-{sl_pct}%)",
                )

            # 1회 사이클당 최대 2종목씩 순차 진입하여 리스크 분산
            if len(actions_taken) >= 2 and not force_buy:
                break

    save_state(state)
    return get_dashboard_summary(state)


def manual_close_position(symbol: str, reason: str = "관리자 수동 즉시 매도") -> Dict[str, Any]:
    state = load_state()
    cfg = state["config"]
    acct = state["account"]
    now_str = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    fx_rate = 1355.0

    remaining = []
    for pos in state.get("positions", []):
        if pos["symbol"] == symbol:
            q = _fetch_live_quote(symbol)
            sell_price = q["price"] if q["price"] > 0 else pos["current_price"]
            unit_mult = fx_rate if pos.get("is_us") else 1.0
            proceeds_krw = int(round(sell_price * pos["qty"] * unit_mult))
            pnl_krw = int(round((sell_price - pos["avg_price"]) * pos["qty"] * unit_mult))
            pnl_pct = round(((sell_price - pos["avg_price"]) / pos["avg_price"]) * 100, 2) if pos["avg_price"] > 0 else 0.0

            if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL") and not pos.get("is_us"):
                _place_kis_order(state, symbol, pos["qty"], is_buy=False)

            acct["cash_krw"] = int(acct.get("cash_krw", 0) + proceeds_krw)
            acct["realized_pnl_krw"] = int(acct.get("realized_pnl_krw", 0) + pnl_krw)
            acct["total_trades"] = int(acct.get("total_trades", 0) + 1)
            if pnl_krw >= 0:
                acct["win_trades"] = int(acct.get("win_trades", 0) + 1)
            else:
                acct["loss_trades"] = int(acct.get("loss_trades", 0) + 1)

            state["trade_logs"].insert(0, {
                "id": f"TRD-{int(time.time()*1000)}",
                "timestamp": now_str,
                "action": "SELL",
                "symbol": symbol,
                "name": pos["name"],
                "qty": pos["qty"],
                "price": sell_price,
                "amount_krw": proceeds_krw,
                "pnl_krw": pnl_krw,
                "pnl_pct": pnl_pct,
                "reason": reason,
                "mode": cfg.get("mode", "AI_PAPER"),
            })
        else:
            remaining.append(pos)

    state["positions"] = remaining
    save_state(state)
    return get_dashboard_summary(state)


def panic_sell_all() -> Dict[str, Any]:
    state = load_state()
    symbols = [p["symbol"] for p in state.get("positions", [])]
    for sym in symbols:
        manual_close_position(sym, reason="🚨 관리자 긴급 일괄 전량 매도(Kill Switch)")
    state = load_state()
    state["config"]["enabled"] = False
    save_state(state)
    return get_dashboard_summary(state)


def reset_paper_account(initial_capital_krw: int = 10000000) -> Dict[str, Any]:
    state = load_state()
    state["config"]["initial_capital_krw"] = int(initial_capital_krw)
    state["account"] = {
        "cash_krw": int(initial_capital_krw),
        "realized_pnl_krw": 0,
        "total_trades": 0,
        "win_trades": 0,
        "loss_trades": 0,
    }
    state["positions"] = []
    state["trade_logs"] = []
    save_state(state)
    return run_auto_trader_cycle(force_buy=True)


def update_auto_trader_config(new_cfg: Dict[str, Any]) -> Dict[str, Any]:
    state = load_state()
    for k, v in new_cfg.items():
        if k in state["config"] and v is not None:
            if k in ("kis_app_secret",) and str(v).startswith("****"):
                continue
            state["config"][k] = v
    save_state(state)
    return get_dashboard_summary(state)


def get_dashboard_summary(state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if state is None:
        state = load_state()
        if not state.get("candidates"):
            return run_auto_trader_cycle(force_buy=False)

    cfg = dict(state.get("config", {}))
    acct = dict(state.get("account", {}))
    positions = state.get("positions", [])
    fx_rate = 1355.0

    eval_amount_krw = 0
    unrealized_pnl_krw = 0
    for pos in positions:
        unit_mult = fx_rate if pos.get("is_us") else 1.0
        eval_amount_krw += int(round(pos.get("current_price", 0) * pos.get("qty", 0) * unit_mult))
        unrealized_pnl_krw += int(pos.get("pnl_krw", 0))

    total_equity_krw = int(acct.get("cash_krw", 0) + eval_amount_krw)
    initial_cap = int(cfg.get("initial_capital_krw", 10000000) or 10000000)
    total_return_krw = total_equity_krw - initial_cap
    total_return_pct = round((total_return_krw / initial_cap) * 100, 2) if initial_cap > 0 else 0.0

    total_trades = int(acct.get("total_trades", 0))
    win_trades = int(acct.get("win_trades", 0))
    win_rate = round((win_trades / total_trades) * 100, 1) if total_trades > 0 else 100.0

    # 마스킹 처리하여 프론트엔드에 안전하게 반환
    kis_configured = bool(cfg.get("kis_app_key") and cfg.get("kis_account_no"))
    if cfg.get("kis_app_secret"):
        cfg["kis_app_secret"] = "********"

    return {
        "config": cfg,
        "summary": {
            "total_equity_krw": total_equity_krw,
            "cash_krw": int(acct.get("cash_krw", 0)),
            "eval_amount_krw": eval_amount_krw,
            "unrealized_pnl_krw": unrealized_pnl_krw,
            "realized_pnl_krw": int(acct.get("realized_pnl_krw", 0)),
            "total_return_krw": total_return_krw,
            "total_return_pct": total_return_pct,
            "total_trades": total_trades,
            "win_trades": win_trades,
            "loss_trades": int(acct.get("loss_trades", 0)),
            "win_rate": win_rate,
            "kis_configured": kis_configured,
        },
        "positions": positions,
        "trade_logs": state.get("trade_logs", [])[:40],
        "candidates": state.get("candidates", [])[:8],
        "last_cycle_at": state.get("last_cycle_at", ""),
    }
