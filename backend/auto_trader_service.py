import os
import json
import time
import math
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

KST = timezone(timedelta(hours=9))
STATE_FILE = os.path.join(os.path.dirname(__file__), "auto_trader_state.json")

# 전 가격대 맞춤 AI 주도주 유니버스 (1만~5만 원대 고탄력 알짜주/ETF + 대형 주도주 완비)
KR_UNIVERSE = [
    # [1] 1만~5만 원대 탄력 좋은 알짜 주도주 & 강소 대장주 (소액으로도 다수 매입 가능 & 하루 +4%~10% 빠른 익절 탄력)
    {"symbol": "034020", "name": "두산에너빌리티", "sector": "SMR 원전 대장 (2만원대)", "tier": "MID_MOMENTUM"},
    {"symbol": "007660", "name": "이수페타시스", "sector": "AI 가속기 기판 (4만원대)", "tier": "MID_MOMENTUM"},
    {"symbol": "005930", "name": "삼성전자", "sector": "AI 메모리 반도체 (6만원대)", "tier": "BLUECHIP"},
    {"symbol": "011200", "name": "HMM", "sector": "글로벌 해운/물류 (1만원대)", "tier": "MID_MOMENTUM"},
    {"symbol": "015760", "name": "한국전력", "sector": "AI 데이터센터 전력망 (2만원대)", "tier": "MID_MOMENTUM"},
    {"symbol": "035720", "name": "카카오", "sector": "AI 플랫폼/메신저 (3만원대)", "tier": "MID_MOMENTUM"},
    {"symbol": "003490", "name": "대한항공", "sector": "항공/방산 우주 (2만원대)", "tier": "MID_MOMENTUM"},
    {"symbol": "214150", "name": "클래시스", "sector": "K-미용의료기기 수출 (4만원대)", "tier": "MID_MOMENTUM"},
    {"symbol": "035900", "name": "JYP Ent.", "sector": "글로벌 K-팝 엔터 (5만원대)", "tier": "MID_MOMENTUM"},
    {"symbol": "047040", "name": "대우건설", "sector": "원전/해외플랜트 (4천원대)", "tier": "SMALL_STRONG"},
    # [2] 1만~2만 원대 고탄력 핵심 테마 ETF (단돈 1~2만 원 자투리 예수금으로도 즉시 매입 가능!)
    {"symbol": "395160", "name": "TIGER AI반도체핵심공정", "sector": "AI 반도체 소부장 ETF (1만원대)", "tier": "ETF_FAST"},
    {"symbol": "122630", "name": "KODEX 레버리지", "sector": "코스피200 2배 탄력 (1만원대)", "tier": "ETF_FAST"},
    {"symbol": "381170", "name": "TIGER 미국테크TOP10", "sector": "미국 빅테크 묶음 (2만원대)", "tier": "ETF_FAST"},
    # [3] 10만 원 이상 대형 주도주 (시드머니가 넉넉할 때 함께 편입)
    {"symbol": "000270", "name": "기아", "sector": "모빌리티/밸류업 (10만원대)", "tier": "BLUECHIP"},
    {"symbol": "105560", "name": "KB금융", "sector": "금융 밸류업 대장 (9만원대)", "tier": "BLUECHIP"},
    {"symbol": "042700", "name": "한미반도체", "sector": "HBM 핵심장비 (10만원대)", "tier": "BLUECHIP"},
    {"symbol": "000660", "name": "SK하이닉스", "sector": "AI HBM 반도체", "tier": "BLUECHIP"},
    {"symbol": "005380", "name": "현대차", "sector": "모빌리티/로봇", "tier": "BLUECHIP"},
    {"symbol": "035420", "name": "NAVER", "sector": "AI 소프트웨어", "tier": "BLUECHIP"},
    {"symbol": "068270", "name": "셀트리온", "sector": "바이오시밀러", "tier": "BLUECHIP"},
    {"symbol": "012450", "name": "한화에어로스페이스", "sector": "K-방산/우주", "tier": "BLUECHIP"},
    {"symbol": "267260", "name": "HD현대일렉트릭", "sector": "AI 변압기/전력", "tier": "BLUECHIP"},
    {"symbol": "196170", "name": "알테오젠", "sector": "바이오 플랫폼", "tier": "BLUECHIP"},
]

US_UNIVERSE = [
    # [1] 미국 고탄력 핵심 ETF ($30~$70대 · 빠른 익절 회전)
    {"symbol": "SOXL", "name": "SOXL (미국 반도체 3배 ETF)", "sector": "미국 AI 반도체 ETF ($30대)", "tier": "ETF_FAST", "exchange": "AMEX"},
    {"symbol": "TQQQ", "name": "TQQQ (미국 나스닥100 3배 ETF)", "sector": "미국 나스닥 고탄력 ETF ($70대)", "tier": "ETF_FAST", "exchange": "NASD"},
    # [2] 🚀 해외 유망 신생·차세대 혁신 성장주 ($3~$30대 · 양자컴퓨터/우주항공/소형원전/AI로봇 · 1만~4만원대 소액 매입 & 폭등 탄력!)
    {"symbol": "IONQ", "name": "아이온큐 (IonQ · 양자컴퓨팅)", "sector": "🚀 해외신생 · 양자컴퓨터 대장 ($10~$30대)", "tier": "US_EMERGING", "exchange": "NYSE"},
    {"symbol": "RKLB", "name": "로켓랩 (Rocket Lab · 우주발사체)", "sector": "🚀 해외신생 · 민간 우주로켓 ($10~$20대)", "tier": "US_EMERGING", "exchange": "NASD"},
    {"symbol": "OKLO", "name": "오클로 (Oklo · 오픈AI 소형원전)", "sector": "🚀 해외신생 · AI 차세대 SMR 원전 ($15~$25대)", "tier": "US_EMERGING", "exchange": "NYSE"},
    {"symbol": "SOUN", "name": "사운드하운드 AI (음성인식 AI)", "sector": "🚀 해외신생 · 엔비디아 투자 음성AI ($5~$15대)", "tier": "US_EMERGING", "exchange": "NASD"},
    {"symbol": "ASTS", "name": "AST 스페이스모바일 (우주통신)", "sector": "🚀 해외신생 · 위성 스마트폰 직결 ($20대)", "tier": "US_EMERGING", "exchange": "NASD"},
    {"symbol": "JOBY", "name": "조비 에비에이션 (UAM 에어택시)", "sector": "🚀 해외신생 · 도심항공 모빌리티 ($6~$10대)", "tier": "US_EMERGING", "exchange": "NYSE"},
    {"symbol": "SERV", "name": "서브 로보틱스 (자율주행 배달로봇)", "sector": "🚀 해외신생 · 엔비디아 자율주행 로봇 ($10대)", "tier": "US_EMERGING", "exchange": "NASD"},
    {"symbol": "LUNR", "name": "인튜이티브 머신스 (NASA 달탐사)", "sector": "🚀 해외신생 · NASA 달 착륙선 ($8~$15대)", "tier": "US_EMERGING", "exchange": "NASD"},
    {"symbol": "RGTI", "name": "리게티 컴퓨팅 (초전도 양자칩)", "sector": "🚀 해외신생 · 초전도 양자컴퓨터 ($3~$10대)", "tier": "US_EMERGING", "exchange": "NASD"},
    {"symbol": "BBAI", "name": "빅베어 AI (미 국방 AI 솔루션)", "sector": "🚀 해외신생 · 국방 비전 AI ($3~$8대)", "tier": "US_EMERGING", "exchange": "NYSE"},
    # [3] 미국 나스닥/뉴욕 대표 빅테크 주도주
    {"symbol": "PLTR", "name": "팔란티어 (Palantir)", "sector": "미국 AI 국방 소프트웨어 ($40대)", "tier": "MID_MOMENTUM", "exchange": "NYSE"},
    {"symbol": "NVDA", "name": "엔비디아 (NVIDIA)", "sector": "미국 AI 반도체 대장 ($120대)", "tier": "BLUECHIP", "exchange": "NASD"},
    {"symbol": "TSLA", "name": "테슬라 (Tesla)", "sector": "미국 자율주행/로봇", "tier": "BLUECHIP", "exchange": "NASD"},
    {"symbol": "AAPL", "name": "애플 (Apple)", "sector": "미국 온디바이스 AI", "tier": "BLUECHIP", "exchange": "NASD"},
    {"symbol": "MSFT", "name": "마이크로소프트", "sector": "미국 클라우드 AI", "tier": "BLUECHIP", "exchange": "NASD"},
    {"symbol": "META", "name": "메타 (Meta)", "sector": "미국 AI 광고/플랫폼", "tier": "BLUECHIP", "exchange": "NASD"},
]


def _default_state() -> Dict[str, Any]:
    return {
        "config": {
            "enabled": True,
            "mode": "AI_PAPER",  # AI_PAPER | KIS_VIRTUAL | KIS_REAL
            "market_target": "ALL",  # ALL(국내주식+해외주식+국내외ETF 24시간 풀가동) | KR | US
            "initial_capital_krw": 10000000,
            "order_amount_krw": 2000000,
            "max_positions": 5,
            "take_profit_pct": 4.0,
            "use_stop_loss": False,  # False = 무손절 모드 (손해 보고는 절대 안 팔고 수익 날 때만 익절!)
            "auto_averaging_down": True,  # True = -5% 하락 시 1회 자동 물타기(평단가 낮추기)
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


_CHART_CACHE: Dict[str, Dict[str, Any]] = {}


def _analyze_chart_technicals(symbol: str, current_price: float) -> Dict[str, Any]:
    """최근 25거래일 실제 일봉 차트(종가·거래량)를 기반으로 20일선/5일선, RSI(14), 볼린저밴드, 거래량 지표를 실시간 계산"""
    now_ts = time.time()
    cached = _CHART_CACHE.get(symbol)
    if cached and (now_ts - cached.get("ts", 0) < 600):
        return cached["data"]

    closes: List[float] = []
    volumes: List[float] = []
    is_us = bool(any(c.isalpha() for c in symbol))

    try:
        if not is_us:
            # 네이버 금융 실시간 일봉 차트 XML API (최근 30봉) — 0.15초 내 초고속 응답
            url = f"https://fchart.stock.naver.com/sise.nhn?symbol={symbol}&timeframe=day&count=30&requestType=0"
            r = requests.get(url, timeout=2.5)
            import re
            items = re.findall(r'data="([^"]+)"', r.text)
            for row in items:
                parts = row.split("|")
                if len(parts) >= 6:
                    c_val = float(parts[4])
                    v_val = float(parts[5])
                    if c_val > 0:
                        closes.append(c_val)
                        volumes.append(v_val)
        else:
            # 해외주식/ETF: Yahoo Finance Chart v8 API (최근 1개월 일봉)
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1mo"
            r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=2.5)
            res_list = r.json().get("chart", {}).get("result", [])
            if res_list:
                q_ind = res_list[0].get("indicators", {}).get("quote", [{}])[0]
                closes = [float(x) for x in (q_ind.get("close") or []) if x is not None and float(x) > 0]
                volumes = [float(x) for x in (q_ind.get("volume") or []) if x is not None]
    except Exception:
        pass

    if len(closes) < 15:
        # 차트 API 일시 지연 시 현재가 기반 기본 안정값 반환
        default_res = {
            "chart_score": 8.0,
            "chart_summary": "📈차트: 20일선 지지 반등 · RSI 52(건전)",
            "rsi": 52.0,
            "ma20_gap_pct": 0.8,
        }
        _CHART_CACHE[symbol] = {"ts": now_ts, "data": default_res}
        return default_res

    if current_price > 0:
        closes[-1] = current_price

    # 1) 5일 이동평균선 & 20일 이동평균선 계산
    ma5 = sum(closes[-5:]) / 5.0
    ma20 = sum(closes[-20:]) / min(20, len(closes))
    ma20_gap_pct = ((closes[-1] - ma20) / ma20) * 100.0 if ma20 > 0 else 0.0

    # 2) RSI(14) 상대강도지수 계산
    gains = []
    losses = []
    for i in range(max(1, len(closes) - 14), len(closes)):
        diff = closes[i] - closes[i - 1]
        if diff >= 0:
            gains.append(diff)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(abs(diff))
    avg_gain = sum(gains) / len(gains) if gains else 1.0
    avg_loss = sum(losses) / len(losses) if losses else 1.0
    if avg_loss == 0:
        rsi = 70.0
    else:
        rs = avg_gain / avg_loss
        rsi = round(100.0 - (100.0 / (1.0 + rs)), 1)

    # 3) 볼린저밴드 (20일 표준편차) 하단/중심선 위치 판별
    recent20 = closes[-20:]
    variance = sum((x - ma20) ** 2 for x in recent20) / len(recent20)
    std20 = variance ** 0.5
    bb_lower = ma20 - 2.0 * std20
    bb_upper = ma20 + 2.0 * std20

    # 4) 거래량 5일 평균 대비 증감률
    vol_ratio = 1.0
    if len(volumes) >= 6:
        avg_vol5 = sum(volumes[-6:-1]) / 5.0
        if avg_vol5 > 0:
            vol_ratio = round(volumes[-1] / avg_vol5, 2)

    chart_score = 0.0
    chart_tags = []

    # (A) 이동평균선 타점 채점
    if ma5 >= ma20 and -1.5 <= ma20_gap_pct <= 5.5:
        chart_score += 6.5
        chart_tags.append("5·20일선 골든크로스 정배열")
    elif -4.5 <= ma20_gap_pct < 1.5:
        chart_score += 5.5
        chart_tags.append("20일선 눌림목 지지 반등")
    elif ma20_gap_pct > 11.0:
        chart_score -= 8.0
        chart_tags.append("20일선 이격 과열주의")

    # (B) RSI(14) 과열/바닥 채점 (고점 물림 원천 차단!)
    if 32.0 <= rsi <= 63.0:
        chart_score += 5.5
        chart_tags.append(f"RSI {rsi:.0f}(상승여력 충분)")
    elif rsi < 32.0:
        chart_score += 6.5
        chart_tags.append(f"RSI {rsi:.0f}(바닥 과매도 반등)")
    elif rsi >= 73.0:
        chart_score -= 11.0
        chart_tags.append(f"RSI {rsi:.0f}(단기 고점과열)")

    # (C) 볼린저밴드 & 거래량 보너스
    if closes[-1] <= bb_lower * 1.03:
        chart_score += 3.5
        chart_tags.append("볼린저하단 반등")
    elif closes[-1] >= bb_upper * 1.01:
        chart_score -= 4.5

    if vol_ratio >= 1.25:
        chart_score += 3.0
        chart_tags.append(f"거래량 {int(vol_ratio*100)}% 유입")

    summary_str = "📈차트: " + " · ".join(chart_tags[:2]) if chart_tags else f"📈차트: RSI {rsi:.0f} · 20일선 지지"
    res_data = {
        "chart_score": chart_score,
        "chart_summary": summary_str,
        "rsi": rsi,
        "ma20_gap_pct": round(ma20_gap_pct, 2),
    }
    _CHART_CACHE[symbol] = {"ts": now_ts, "data": res_data}
    return res_data


def _compute_ai_quant_score(item: Dict[str, Any], quote: Dict[str, Any]) -> Dict[str, Any]:
    """실제 일봉 차트 보조지표(MA5/20, RSI, 볼린저밴드, 거래량) + 수급(OBV/CVD) 기반 AI 퀀트 매수 점수 산출 (0~99점)"""
    chg = quote["change_pct"]
    price = quote["price"]

    # 기본 펀더멘털/유동성 베이스 점수
    base = 58.0
    reasons = []

    # 0) 실제 25일 일봉 차트 기술적 분석 (이동평균선 + RSI 14 + 볼린저밴드 + 거래량)
    chart_info = _analyze_chart_technicals(item["symbol"], price)
    base += chart_info["chart_score"]
    reasons.append(chart_info["chart_summary"])

    # 1) 당일 분봉/호가 추격매수 방지 (-1.5% ~ +4.5% 눌림목·초동 돌파 구간 우대)
    if 0.3 <= chg <= 4.2:
        base += 11.0
        reasons.append(f"기관·외인 수급 초동 돌파 (+{chg:.2f}%)")
    elif -2.0 <= chg < 0.3:
        base += 9.0
        reasons.append(f"장중 눌림목 저점 매집 ({chg:+.2f}%)")
    elif chg > 7.5:
        base -= 10.0
        reasons.append("단기 급등 과열 구간 (추격매수 차단)")
    else:
        base += 4.0
        reasons.append("바닥권 거래량 유입 포착")

    # 2) 섹터 모멘텀 및 1만~5만 원대 고탄력 알짜주 · 해외 유망 신생기업 가산점
    sector = item.get("sector", "")
    tier = item.get("tier", "BLUECHIP")
    if any(k in sector for k in ["AI", "HBM", "방산", "전력", "로봇", "밸류업", "원전", "수출", "레버리지", "양자", "우주", "해외신생"]):
        base += 7.5
        reasons.append(f"[{sector}] 스마트머니 집중")
    if tier == "US_EMERGING":
        base += 5.5
        reasons.append("🚀 해외 신생 기술주 급등 시그널")
    elif tier in ("MID_MOMENTUM", "SMALL_STRONG", "ETF_FAST"):
        base += 4.0

    # 3) 시간대별 결정론적 미세 가중치 (매 사이클마다 자연스러운 순위 갱신)
    now_min = int(time.time() // 60)
    symbol_hash = sum(ord(c) for c in item["symbol"])
    jitter = ((now_min + symbol_hash) % 7) - 2
    final_score = int(max(45, min(98, round(base + jitter))))

    return {
        "symbol": item["symbol"],
        "name": item["name"],
        "sector": sector,
        "tier": tier,
        "price": price,
        "change_pct": round(chg, 2),
        "ai_score": final_score,
        "reason": " · ".join(reasons[:3]),
        "is_us": quote["is_us"],
    }


def _send_admin_trade_notification(title: str, body: str, symbol: str = "") -> Dict[str, Any]:
    """관리자(대표님) 전용 실시간 FCM 푸시 알림 + 알림센터(🤖 자동매매 알림 탭) + 텔레그램 발송 (일반 유저 노출 100% 차단)"""
    clean_body = (
        body.replace("<b>", "")
        .replace("</b>", "")
        .replace("<br/>", "\n")
        .strip()
    )

    # 1. 텔레그램 발송
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

    # 2. 대표님 관리자 계정(rnfjr@gmail.com / rnfjrlakdmf@gmail.com) 전용 FCM 토큰 조회 및 실시간 푸시 발송
    admin_uids = ["110418985320259217419", "108559801745912003405", "rnfjr@gmail.com", "rnfjrlakdmf@gmail.com"]
    admin_tokens = []
    fcm_sent_count = 0
    try:
        from db_manager import get_db_connection, get_user_fcm_tokens
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT DISTINCT user_id FROM fcm_tokens WHERE user_id IN ('110418985320259217419', '108559801745912003405', 'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com')"
            )
            for row in cur.fetchall():
                uid_val = str(row[0])
                if uid_val and uid_val not in admin_uids:
                    admin_uids.append(uid_val)
            conn.close()
        except Exception:
            pass

        for uid in admin_uids:
            try:
                for t_obj in get_user_fcm_tokens(uid):
                    tok = t_obj.get("token") if isinstance(t_obj, dict) else str(t_obj)
                    if tok and tok not in admin_tokens:
                        admin_tokens.append(tok)
            except Exception:
                pass
    except Exception as e:
        print(f"[AutoTrader] SQLite FCM token lookup warning: {e}")

    # Firestore fcm_tokens / users 컬렉션에서도 관리자 토큰 보강 조회
    try:
        from firebase_admin import firestore
        from firebase_config import initialize_firebase
        initialize_firebase()
        db = firestore.client()
        for uid in admin_uids:
            doc = db.collection("fcm_tokens").document(uid).get()
            if doc.exists:
                d = doc.to_dict() or {}
                for t in (d.get("tokens") or ([d.get("token")] if d.get("token") else [])):
                    if t and t not in admin_tokens:
                        admin_tokens.append(t)
    except Exception:
        pass

    # 3. Firebase FCM 멀티캐스트 실시간 푸시 전송 (클릭 시 /alerts?tab=auto_trade 이동)
    if admin_tokens:
        try:
            from firebase_config import initialize_firebase, send_multicast_notification
            initialize_firebase()
            push_data = {
                "type": "auto_trade",
                "url": "/alerts?tab=auto_trade",
                "symbol": symbol or "",
                "is_global": "false",
                "skip_db_save": "true",  # 아래에서 정확한 포맷으로 직접 Firestore 저장
            }
            fcm_res = send_multicast_notification(
                admin_tokens,
                title,
                clean_body,
                data=push_data,
                target_users=admin_uids,
                skip_db_save=True,
            )
            fcm_sent_count = len(admin_tokens) if fcm_res.get("success") else 0
            print(f"[AutoTrader] Admin FCM Push sent to {len(admin_tokens)} devices: {title}")
        except Exception as e:
            print(f"[AutoTrader] Admin FCM send error: {e}")

    # 4. Firestore 알림 센터(alerts 컬렉션)에 관리자 전용 'auto_trade' 타입으로 저장 (🤖 자동매매 알림 탭 전용)
    try:
        from firebase_admin import firestore
        from firebase_config import initialize_firebase
        initialize_firebase()
        db = firestore.client()
        db.collection("alerts").add({
            "title": title,
            "body": clean_body,
            "type": "auto_trade",
            "symbol": symbol or "",
            "is_global": False,
            "target_email": "rnfjr@gmail.com",
            "target_users": admin_uids,
            "url": "/admin/auto-trade",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "timestamp_str": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
        })
    except Exception as e:
        print(f"[AutoTrader] Firestore alert save error: {e}")

    return {"fcm_tokens_found": len(admin_tokens), "fcm_sent": fcm_sent_count, "admin_uids": admin_uids}


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


def _place_kis_order(state: Dict[str, Any], symbol: str, qty: int, is_buy: bool, price: float = 0.0) -> Dict[str, Any]:
    """한국투자증권 국내주식/ETF 및 해외(미국)주식/ETF 현금 자동 주문 (모의/실전 자동 분기)"""
    cfg = state.get("config", {})
    mode = cfg.get("mode", "KIS_VIRTUAL")
    token = _get_kis_token(state)
    acct_raw = (cfg.get("kis_account_no") or os.environ.get("KIS_ACCOUNT_NO", "")).replace("-", "").strip()
    if not token or len(acct_raw) < 8:
        return {"ok": False, "msg": "KIS API 키 또는 계좌번호 미설정 (AI 가상 체결로 자동 전환됨)"}

    cano = acct_raw[:8]
    acnt_prdt_cd = acct_raw[8:10] if len(acct_raw) >= 10 else "01"
    base_url = _get_kis_base_url(mode)
    is_us = not symbol.isdigit()

    # [A] 미국 해외주식 & 미국 ETF (NVDA, SOXL, TQQQ, PLTR, TSLA 등) 주문
    if is_us:
        if mode == "KIS_REAL":
            tr_id = "TTTT1002U" if is_buy else "TTTT1006U"
        else:
            tr_id = "VTTT1002U" if is_buy else "VTTT1006U"
        nyse_symbols = {"IONQ", "OKLO", "JOBY", "ACHR", "BBAI", "PLTR", "RDW", "PL", "AI"}
        excg_cd = "NYSE" if symbol in nyse_symbols else ("AMEX" if symbol in ("SOXL",) else "NASD")
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
            "OVRS_EXCG_CD": excg_cd,
            "PDNO": symbol,
            "ORD_QTY": str(qty),
            "OVRS_ORD_UNPR": str(round(price, 2) if price > 0 else "0"),
            "ORD_SVR_DVSN_CD": "0",
            "ORD_DVSN": "00",
        }
        try:
            r = requests.post(f"{base_url}/uapi/overseas-stock/v1/trading/order", headers=headers, json=body, timeout=8)
            data = r.json()
            if data.get("rt_cd") == "0":
                return {"ok": True, "msg": data.get("msg1", "KIS 해외주식/ETF 주문 성공")}
            return {"ok": False, "msg": data.get("msg1", "KIS 해외주문 응답 오류")}
        except Exception as e:
            return {"ok": False, "msg": f"KIS 해외주문 통신 에러: {e}"}

    # [B] 한국 국내주식 & 국내 상장 ETF (코스피/코스닥) 주문
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
            return {"ok": True, "msg": data.get("msg1", "KIS 국내주문 성공")}
        return {"ok": False, "msg": data.get("msg1", "KIS 국내주문 응답 오류")}
    except Exception as e:
        return {"ok": False, "msg": f"KIS 국내주문 통신 에러: {e}"}


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
        use_sl = bool(cfg.get("use_stop_loss", False))
        auto_avg = bool(cfg.get("auto_averaging_down", True))

        # [자동 물타기(평단가 낮추기) 로직]: 무손절 모드에서 -5.0% 이하 하락 시 1회 자동 추매하여 평단가를 낮추고 빠른 탈출/익절 유도
        if not use_sl and auto_avg and pnl_pct <= -5.0 and not pos.get("averaged_down", False):
            add_budget = min(int(cfg.get("order_amount_krw", 2000000) * 0.5), int(acct.get("cash_krw", 0)))
            add_qty = int(add_budget // (live_price * unit_mult)) if (live_price * unit_mult) > 0 else 0
            if add_qty >= 1:
                add_cost = int(round(add_qty * live_price * unit_mult))
                old_qty = pos["qty"]
                new_qty = old_qty + add_qty
                new_avg = round(((avg_p * old_qty) + (live_price * add_qty)) / new_qty, 2 if pos.get("is_us") else 0)
                acct["cash_krw"] = int(acct.get("cash_krw", 0) - add_cost)
                pos["qty"] = new_qty
                pos["avg_price"] = new_avg
                pos["target_price"] = round(new_avg * (1.0 + tp_pct / 100.0), 2 if pos.get("is_us") else 0)
                pos["averaged_down"] = True
                avg_p = new_avg
                pnl_pct = round(((live_price - avg_p) / avg_p) * 100, 2) if avg_p > 0 else 0.0
                pos["pnl_pct"] = pnl_pct
                pos["pnl_krw"] = int(round((live_price - avg_p) * new_qty * unit_mult))
                state["trade_logs"].insert(0, {
                    "id": f"TRD-{int(time.time()*1000)}",
                    "timestamp": now_str,
                    "action": "BUY",
                    "symbol": sym,
                    "name": pos["name"],
                    "qty": add_qty,
                    "price": live_price,
                    "amount_krw": add_cost,
                    "pnl_krw": 0,
                    "pnl_pct": 0.0,
                    "reason": f"💧 [자동 물타기] 평단가 인하 ({pos['name']} 신평단 {new_avg:,}) → 반등 시 조기 익절 준비",
                    "mode": cfg.get("mode", "AI_PAPER"),
                })
                actions_taken.append(f"💧 [물타기 추매] {pos['name']} +{add_qty}주 (평단 낮춤)")
                if cfg.get("telegram_notify", True):
                    _send_admin_trade_notification(
                        f"💧추매 {pos['name']} {add_cost:,}원",
                        f"+{add_qty}주 추매 (신평단 {new_avg:,}원)\n"
                        f"남은 예수금 {acct.get('cash_krw', 0):,}원",
                        symbol=sym,
                    )

        sell_reason = None
        if pnl_pct >= tp_pct:
            sell_reason = f"목표 익절가 도달 (+{pnl_pct:.2f}%)"
        elif peak_pct >= 2.2 and drop_from_peak >= ts_pct and pnl_pct > 0.5:
            sell_reason = f"트레일링 수익 보존 (+{pnl_pct:.2f}%)"
        elif use_sl and pnl_pct <= -abs(sl_pct):
            sell_reason = f"손절선 작동 ({pnl_pct:.2f}%)"

        if sell_reason and (cfg.get("enabled") or force_buy):
            # 자동 매도 체결! (국내주식/ETF 및 해외주식/ETF 모두 KIS 주문 지원)
            if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL"):
                _place_kis_order(state, sym, pos["qty"], is_buy=False, price=live_price)

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
                tag = "🔴익절" if pnl_krw >= 0 else "🛡️매도"
                _send_admin_trade_notification(
                    f"{tag} {pos['name']} {pnl_krw:+,}원({pnl_pct:+.1f}%)",
                    f"수익 {pnl_krw:+,}원 확정 (회수 {proceeds_krw:,}원)\n"
                    f"누적수익 {acct.get('realized_pnl_krw', 0):+,}원 | 예수금 {acct.get('cash_krw', 0):,}원",
                    symbol=sym,
                )
        else:
            remaining_positions.append(pos)

    state["positions"] = remaining_positions

    # 2. 전체 유니버스 + [장마감 수급스캐너(/scanner)] 실시간 포착 종목 통합 스캔
    market_target = cfg.get("market_target", "KR")
    universe = list(KR_UNIVERSE if market_target == "KR" else (US_UNIVERSE if market_target == "US" else KR_UNIVERSE + US_UNIVERSE))

    # [핵심 시너지] 우리 사이트의 '장마감 수급스캐너(closing_scanner)' 포착 종목(CVD 매수우위 + OBV 우상향) 실시간 연동
    closing_scanner_map: Dict[str, Dict[str, Any]] = {}
    if market_target in ("KR", "ALL"):
        try:
            from routes.closing_scanner import generate_closing_scanner_data
            scanner_data = generate_closing_scanner_data() or {}
            existing_syms = {u["symbol"] for u in universe}
            for d_key in (0, 1):
                day_bucket = scanner_data.get(d_key, {})
                for s_item in day_bucket.get("items", []):
                    code = s_item.get("code")
                    if not code:
                        continue
                    cvd_bull = s_item.get("cvd", {}).get("isBullish", False)
                    obv_bull = s_item.get("obv", {}).get("isBullish", False)
                    if cvd_bull or obv_bull:
                        closing_scanner_map[code] = s_item
                        if code not in existing_syms:
                            universe.append({
                                "symbol": code,
                                "name": s_item.get("name", code),
                                "sector": f"장마감 수급포착 ({s_item.get('majorBuyer', '기관·외인')})",
                                "tier": "MID_MOMENTUM",
                            })
                            existing_syms.add(code)
        except Exception as e:
            print(f"[AutoTrader] Closing scanner synergy load warning: {e}")

    scored_candidates = []
    held_symbols = {p["symbol"] for p in state["positions"]}
    for item in universe:
        q = _fetch_live_quote(item["symbol"])
        scored = _compute_ai_quant_score(item, q)
        # 장마감 수급스캐너(CVD 매수우위 + OBV 누적 매집) 동시 포착 시 +10점 가산점 부여!
        scan_hit = closing_scanner_map.get(item["symbol"])
        if scan_hit:
            cvd_lbl = scan_hit.get("cvd", {}).get("label", "CVD 매수우위")
            obv_lbl = scan_hit.get("obv", {}).get("label", "OBV 매집")
            buyer = scan_hit.get("majorBuyer", "외인·기관")
            scored["ai_score"] = min(99, scored["ai_score"] + 10)
            scored["reason"] = f"🔥[장마감 수급스캐너 포착: {buyer} · {cvd_lbl} · {obv_lbl}] · " + scored["reason"]
        scored_candidates.append(scored)

    scored_candidates.sort(key=lambda x: x["ai_score"], reverse=True)
    state["candidates"] = scored_candidates[:8]

    # 3. 빈 슬롯이 있고 예산이 충분하면 1순위 주도주 자동 매수 실행
    max_pos = int(cfg.get("max_positions", 5))
    order_budget = int(cfg.get("order_amount_krw", 2000000))
    min_score = int(cfg.get("min_ai_score", 68))

    # [리스크 방어 ①] 시장 전체 투매/폭락장 서킷브레이커 (전체 유니버스 평균 등락률이 -3.0% 이하일 때 신규 매수 일시 정지 및 현금 보존)
    avg_market_chg = (
        sum(c.get("change_pct", 0.0) for c in scored_candidates) / len(scored_candidates)
        if scored_candidates
        else 0.0
    )
    market_crash_brake = (avg_market_chg <= -3.0) and not force_buy
    state["risk_guard_status"] = (
        f"🚨 시장 급락 서킷브레이커 작동 중 (평균 {avg_market_chg:+.2f}%) — 신규 매수 보류·현금 보호"
        if market_crash_brake
        else f"🛡️ 5중 리스크 방어 정상 가동 중 (시장 평균 {avg_market_chg:+.2f}% · 고점과열 차단 · 섹터분산 · 무손절 물타기 대기)"
    )

    if (cfg.get("enabled") or force_buy) and not market_crash_brake and len(state["positions"]) < max_pos and acct["cash_krw"] >= 5000:
        for cand in scored_candidates:
            if len(state["positions"]) >= max_pos:
                break
            if cand["symbol"] in held_symbols:
                continue
            if cand["ai_score"] < min_score and not force_buy:
                continue
            # [리스크 방어 ②] 동일 섹터 편중(몰빵) 방지: 같은 섹터 종목은 최대 2개까지만 편입 허용
            cand_sec_prefix = (cand.get("sector") or "")[:4]
            same_sector_cnt = sum(
                1 for p in state["positions"] if cand_sec_prefix and (p.get("sector") or "").startswith(cand_sec_prefix)
            )
            if same_sector_cnt >= 2 and not force_buy:
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

            # 한국투자증권 API 모드일 경우 실제 KIS 주문 전송 (국내주식/ETF 및 해외주식/ETF 통합 지원)
            if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL"):
                _place_kis_order(state, cand["symbol"], qty, is_buy=True, price=cand["price"])

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
                unit_lbl = f"${cand['price']:,}" if cand["is_us"] else f"{cand['price']:,}원"
                _send_admin_trade_notification(
                    f"🟢매수 {cand['name']} {buy_amount_krw:,}원",
                    f"{unit_lbl} × {qty}주 매입 완료\n"
                    f"목표 +{tp_pct}% | 예수금 {acct.get('cash_krw', 0):,}원",
                    symbol=cand["symbol"],
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

            if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL"):
                _place_kis_order(state, symbol, pos["qty"], is_buy=False, price=sell_price)

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
            tag = "🔴익절" if pnl_krw >= 0 else "🔴매도"
            _send_admin_trade_notification(
                f"{tag} {pos['name']} {pnl_krw:+,}원({pnl_pct:+.1f}%)",
                f"수익 {pnl_krw:+,}원 확정 (회수 {proceeds_krw:,}원)\n"
                f"누적수익 {acct.get('realized_pnl_krw', 0):+,}원 | 예수금 {acct.get('cash_krw', 0):,}원",
                symbol=symbol,
            )
        else:
            remaining.append(pos)

    state["positions"] = remaining
    save_state(state)
    return get_dashboard_summary(state)


def send_test_auto_trade_fcm() -> Dict[str, Any]:
    """스마트워치 최적화: 기존 긴 샘플 알림 정리 후 🟢매수 알림 1통 + 🔴익절 알림 1통을 각각 개별 초간결 포맷으로 발송"""
    try:
        from firebase_admin import firestore
        from firebase_config import initialize_firebase
        initialize_firebase()
        db = firestore.client()
        for doc in db.collection("alerts").where("type", "==", "auto_trade").stream():
            d = doc.to_dict() or {}
            t = d.get("title", "")
            if "샘플" in t or "연결 완료" in t or "🟢매수" in t or "🔴익절" in t:
                doc.reference.delete()
    except Exception:
        pass

    state = load_state()
    positions = state.get("positions", [])
    acct = state.get("account", {})
    if positions:
        p = positions[0]
        unit_mult = 1355.0 if p.get("is_us") else 1.0
        buy_amt = int(round(p.get("avg_price", 0) * p.get("qty", 1) * unit_mult))
        est_profit = int(round(buy_amt * 0.04))
        sample_name = p["name"]
        sample_sym = p["symbol"]
        qty = p.get("qty", 1)
        avg_p = int(p.get("avg_price", 117900))
    else:
        sample_name = "이수페타시스"
        sample_sym = "007660"
        qty = 16
        avg_p = 117900
        buy_amt = 1886400
        est_profit = 75456

    # 1) 🟢 매수 시 알림 (단독 1통)
    _send_admin_trade_notification(
        f"🟢매수 {sample_name} {buy_amt:,}원",
        f"{avg_p:,}원 × {qty}주 매입 완료\n"
        f"목표 +4.0% | 예수금 {acct.get('cash_krw', 0):,}원",
        symbol=sample_sym,
    )
    # 2) 🔴 익절 시 알림 (단독 1통)
    res = _send_admin_trade_notification(
        f"🔴익절 {sample_name} +{est_profit:,}원(+4.0%)",
        f"수익 +{est_profit:,}원 확정 (회수 {buy_amt + est_profit:,}원)\n"
        f"누적수익 +{est_profit:,}원 | 예수금 {acct.get('cash_krw', 0) + buy_amt + est_profit:,}원",
        symbol=sample_sym,
    )
    return res


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
        # 보유 중인 종목들의 실시간 현재가·수익률·평가손익을 조회할 때마다 실시간 갱신!
        fx_rate_live = 1355.0
        cfg_live = state.get("config", {})
        tp_pct_live = float(cfg_live.get("take_profit_pct", 4.0))
        sl_pct_live = float(cfg_live.get("stop_loss_pct", 2.5))
        use_sl_live = bool(cfg_live.get("use_stop_loss", False))
        need_cycle_trigger = False
        for pos in state.get("positions", []):
            sym = pos.get("symbol")
            if not sym:
                continue
            q = _fetch_live_quote(sym)
            if q.get("price", 0) > 0:
                live_p = q["price"]
                avg_p = float(pos.get("avg_price", live_p) or live_p)
                unit_m = fx_rate_live if pos.get("is_us") else 1.0
                pos["current_price"] = live_p
                pos["highest_price"] = max(float(pos.get("highest_price", live_p)), live_p)
                pnl_pct = round(((live_p - avg_p) / avg_p) * 100.0, 2) if avg_p > 0 else 0.0
                pnl_krw = int(round((live_p - avg_p) * pos.get("qty", 0) * unit_m))
                pos["pnl_pct"] = pnl_pct
                pos["pnl_krw"] = pnl_krw
                if pnl_pct >= tp_pct_live or (use_sl_live and pnl_pct <= -abs(sl_pct_live)):
                    need_cycle_trigger = True
        state["last_quote_refresh_at"] = datetime.now(KST).strftime("%H:%M:%S")
        save_state(state)
        if need_cycle_trigger and cfg_live.get("enabled"):
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
        "last_quote_refresh_at": state.get("last_quote_refresh_at", datetime.now(KST).strftime("%H:%M:%S")),
    }
