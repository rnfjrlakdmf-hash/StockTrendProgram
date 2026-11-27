import os
import json
import time
import threading
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor

KST = timezone(timedelta(hours=9))
HISTORY_FILE = os.path.join(os.path.dirname(__file__), "sidecar_history.json")

_CACHE_LOCK = threading.Lock()
_SIDECAR_CACHE: Dict[str, Any] = {"ts": 0.0, "data": None}
_CACHE_TTL_SEC = 15.0

# 당일 중복 알림 방지 (key: "YYYY-MM-DD|EVENT_CODE")
_NOTIFIED_TODAY: set = set()

UA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Referer": "https://finance.naver.com/",
}


def _safe_float(v: Any, default: float = 0.0) -> float:
    if v is None:
        return default
    try:
        return float(str(v).replace(",", "").replace("%", "").replace("+", "").strip())
    except Exception:
        return default


def _load_history() -> List[Dict[str, Any]]:
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    cleaned: List[Dict[str, Any]] = []
                    seen = set()
                    for item in data:
                        if not isinstance(item, dict):
                            continue
                        code = str(item.get("code") or "")
                        d_str = str(item.get("date") or "")
                        t_str = str(item.get("time") or "")
                        if "SP500" not in code and len(t_str) >= 5:
                            try:
                                hhmm = int(t_str[:2]) * 100 + int(t_str[3:5])
                                if hhmm < 900 or hhmm > 1535:
                                    continue
                            except Exception:
                                pass
                        k = (d_str, code)
                        if k in seen:
                            continue
                        seen.add(k)
                        cleaned.append(item)
                        if len(cleaned) >= 50:
                            break
                    return cleaned
    except Exception:
        pass
    return []


def is_kr_regular_market_open(now_kst: Optional[datetime] = None) -> bool:
    """국내 정규장(평일 09:00 ~ 15:35 KST) 여부"""
    dt = now_kst or datetime.now(KST)
    if dt.weekday() >= 5:
        return False
    hhmm = dt.hour * 100 + dt.minute
    return 900 <= hhmm <= 1535


def _record_history_event(event: Dict[str, Any]) -> None:
    try:
        hist = _load_history()
        today_str = datetime.now(KST).strftime("%Y-%m-%d")
        code = event.get("code", "")
        # 같은 날짜 + 같은 이벤트 코드는 당일 1회만 깔끔하게 기록 (30분 반복 스팸 방지)
        for h in hist:
            if h.get("date") == today_str and h.get("code") == code:
                return
        hist.insert(0, event)
        hist = hist[:50]
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(hist, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[SidecarMonitor] history write warning: {e}")


def _fetch_kr_indices_and_futures() -> Dict[str, Dict[str, Any]]:
    """
    네이버 금융 실시간 폴링 API로 코스피(KOSPI), 코스닥(KOSDAQ), 코스피200(KPI200),
    코스피200 선물 최근월물(FUT) 4대 핵심 지표를 0.1초 내에 동시 조회합니다.
    """
    out: Dict[str, Dict[str, Any]] = {}
    url = "https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:KOSPI,KOSDAQ,KPI200,FUT"
    try:
        r = requests.get(url, headers=UA_HEADERS, timeout=4.5)
        if r.status_code == 200:
            j = r.json() or {}
            areas = (j.get("result") or {}).get("areas") or []
            for area in areas:
                for d in area.get("datas") or []:
                    cd = str(d.get("cd") or "").upper()
                    if not cd:
                        continue
                    nv = _safe_float(d.get("nv")) / 100.0
                    cv = _safe_float(d.get("cv")) / 100.0
                    cr = _safe_float(d.get("cr"))
                    rf = str(d.get("rf") or "3")
                    # rf 4/5 = 하락, 1/2 = 상승 (부호 강제 일관화)
                    if rf in ("4", "5") or cr < 0:
                        cr = -abs(cr)
                        cv = -abs(cv)
                    elif rf in ("1", "2") or cr > 0:
                        cr = abs(cr)
                        cv = abs(cv)
                    out[cd] = {
                        "code": cd,
                        "price": round(nv, 2),
                        "price_str": f"{nv:,.2f}",
                        "change_val": round(cv, 2),
                        "change_pct": round(cr, 2),
                        "market_status": str(d.get("ms") or "CLOSE"),
                        "risefall": rf,
                    }
    except Exception as e:
        print(f"[SidecarMonitor] KR polling fetch warning: {e}")

    # 개별 fallback (폴링 실패 시 모바일 basic API)
    for cd in ("KOSPI", "KOSDAQ", "KPI200"):
        if cd not in out:
            try:
                r = requests.get(f"https://m.stock.naver.com/api/index/{cd}/basic", headers=UA_HEADERS, timeout=3.5)
                if r.status_code == 200:
                    j = r.json() or {}
                    p = _safe_float(j.get("closePrice"))
                    cr = _safe_float(j.get("fluctuationsRatio"))
                    cv = _safe_float(j.get("compareToPreviousClosePrice"))
                    out[cd] = {
                        "code": cd,
                        "price": round(p, 2),
                        "price_str": f"{p:,.2f}",
                        "change_val": round(cv, 2),
                        "change_pct": round(cr, 2),
                        "market_status": str(j.get("marketStatus") or "CLOSE"),
                        "risefall": "5" if cr < 0 else ("2" if cr > 0 else "3"),
                    }
            except Exception:
                pass
    return out


def _fetch_us_indices() -> Dict[str, Dict[str, Any]]:
    """네이버 해외 지수 API로 S&P 500 (.INX) 및 나스닥 (.IXIC) 실시간 조회"""
    out: Dict[str, Dict[str, Any]] = {}
    targets = [("SP500", ".INX"), ("NASDAQ", ".IXIC")]
    for key, code in targets:
        try:
            r = requests.get(f"https://api.stock.naver.com/index/{code}/basic", headers=UA_HEADERS, timeout=4.0)
            if r.status_code == 200:
                j = r.json() or {}
                p = _safe_float(j.get("closePrice"))
                cr = _safe_float(j.get("fluctuationsRatio"))
                cv = _safe_float(j.get("compareToPreviousClosePrice"))
                if cr < 0:
                    cv = -abs(cv)
                elif cr > 0:
                    cv = abs(cv)
                out[key] = {
                    "code": key,
                    "price": round(p, 2),
                    "price_str": f"{p:,.2f}",
                    "change_val": round(cv, 2),
                    "change_pct": round(cr, 2),
                    "market_status": str(j.get("marketStatus") or "CLOSE"),
                    "risefall": "5" if cr < 0 else ("2" if cr > 0 else "3"),
                }
        except Exception as e:
            print(f"[SidecarMonitor] US {key} fetch warning: {e}")
    return out


def _classify_market_gauge(
    key: str,
    name: str,
    flag: str,
    raw: Dict[str, Any],
    sidecar_pct: Optional[float],
    cb_l1_pct: float,
    cb_l2_pct: float,
    cb_l3_pct: float,
    rule_desc: str,
) -> Dict[str, Any]:
    cr = float(raw.get("change_pct") or 0.0)
    price_str = str(raw.get("price_str") or "-")
    status_open = str(raw.get("market_status") or "CLOSE").upper() == "OPEN"

    # 경보 단계 산정
    level = "NORMAL"
    badge = "🟢 정상 장세"
    direction = "FLAT" if cr == 0 else ("DOWN" if cr < 0 else "UP")

    if cr <= -cb_l3_pct:
        level = "CIRCUIT_BREAKER_L3"
        badge = f"⛔ 서킷브레이커 3단계 (-{cb_l3_pct:.0f}% 돌파)"
    elif cr <= -cb_l2_pct:
        level = "CIRCUIT_BREAKER_L2"
        badge = f"🔴 서킷브레이커 2단계 (-{cb_l2_pct:.0f}% 돌파)"
    elif cr <= -cb_l1_pct:
        level = "CIRCUIT_BREAKER_L1"
        badge = f"🔴 서킷브레이커 1단계 (-{cb_l1_pct:.0f}% 돌파)"
    elif sidecar_pct is not None and cr <= -sidecar_pct:
        level = "SELL_SIDECAR"
        badge = f"🚨 매도 사이드카 발동 구간 (-{sidecar_pct:.0f}% 돌파)"
    elif sidecar_pct is not None and cr >= sidecar_pct:
        level = "BUY_SIDECAR"
        badge = f"🔥 매수 사이드카 발동 구간 (+{sidecar_pct:.0f}% 돌파)"
    elif sidecar_pct is not None and cr <= -(sidecar_pct * 0.7):
        level = "IMMINENT_SELL"
        badge = "⚠️ 매도 사이드카 발동 임박"
    elif sidecar_pct is not None and cr >= (sidecar_pct * 0.7):
        level = "IMMINENT_BUY"
        badge = "⚡ 매수 사이드카 발동 임박"
    elif cr <= -(cb_l1_pct * 0.65):
        level = "IMMINENT_CB"
        badge = "⚠️ 서킷브레이커 경계 진입"
    elif abs(cr) >= 2.5:
        level = "WATCH"
        badge = "🟡 변동성 확대 주의"

    # 가장 가까운 하방(또는 상방) 발동 기준 및 게이지(%) 계산
    primary_trigger = sidecar_pct if sidecar_pct is not None else cb_l1_pct
    if cr < 0:
        # 이미 사이드카 돌파했으면 다음 목표는 서킷브레이커 1단계
        if sidecar_pct is not None and cr <= -sidecar_pct:
            next_label = f"서킷브레이커 1단계 (-{cb_l1_pct:.0f}%)"
            next_target = -cb_l1_pct
            dist_pct = round(max(0.0, cr - next_target), 2)
            gauge_pct = min(100, int(round((abs(cr) / cb_l1_pct) * 100)))
        else:
            next_label = (
                f"매도 사이드카 (-{sidecar_pct:.0f}%)"
                if sidecar_pct is not None
                else f"서킷브레이커 1단계 (-{cb_l1_pct:.0f}%)"
            )
            next_target = -primary_trigger
            dist_pct = round(max(0.0, cr - next_target), 2)
            gauge_pct = min(100, int(round((abs(cr) / primary_trigger) * 100)))
    elif cr > 0 and sidecar_pct is not None:
        next_label = f"매수 사이드카 (+{sidecar_pct:.0f}%)"
        next_target = sidecar_pct
        dist_pct = round(max(0.0, next_target - cr), 2)
        gauge_pct = min(100, int(round((cr / sidecar_pct) * 100)))
    else:
        next_label = (
            f"매도 사이드카 (-{sidecar_pct:.0f}%)"
            if sidecar_pct is not None
            else f"서킷브레이커 1단계 (-{cb_l1_pct:.0f}%)"
        )
        next_target = -primary_trigger
        dist_pct = round(primary_trigger, 2)
        gauge_pct = 0

    return {
        "key": key,
        "name": name,
        "flag": flag,
        "price": raw.get("price", 0.0),
        "price_str": price_str,
        "change_val": raw.get("change_val", 0.0),
        "change_pct": cr,
        "market_open": status_open,
        "market_status": raw.get("market_status", "CLOSE"),
        "direction": direction,
        "level": level,
        "badge": badge,
        "sidecar_threshold_pct": sidecar_pct,
        "cb_levels": [cb_l1_pct, cb_l2_pct, cb_l3_pct],
        "next_trigger_label": next_label,
        "distance_to_trigger_pct": dist_pct,
        "gauge_pct": gauge_pct,
        "rule_desc": rule_desc,
    }


def get_market_sidecar_status(force_refresh: bool = False) -> Dict[str, Any]:
    """
    한·미 실시간 사이드카 & 서킷브레이커 통합 경보 상태를 반환합니다 (15초 캐시).
    """
    now = time.time()
    with _CACHE_LOCK:
        if not force_refresh and _SIDECAR_CACHE["data"] and (now - _SIDECAR_CACHE["ts"] < _CACHE_TTL_SEC):
            return _SIDECAR_CACHE["data"]

    kr_raw: Dict[str, Dict[str, Any]] = {}
    us_raw: Dict[str, Dict[str, Any]] = {}

    with ThreadPoolExecutor(max_workers=2) as ex:
        f_kr = ex.submit(_fetch_kr_indices_and_futures)
        f_us = ex.submit(_fetch_us_indices)
        try:
            kr_raw = f_kr.result(timeout=6)
        except Exception:
            kr_raw = {}
        try:
            us_raw = f_us.result(timeout=6)
        except Exception:
            us_raw = {}

    # 4대 핵심 감시 패널 구성
    fut_raw = kr_raw.get("FUT") or kr_raw.get("KPI200") or {}
    kospi_raw = kr_raw.get("KOSPI") or {}
    kosdaq_raw = kr_raw.get("KOSDAQ") or {}
    sp500_raw = us_raw.get("SP500") or {}
    nasdaq_raw = us_raw.get("NASDAQ") or {}

    markets = [
        _classify_market_gauge(
            key="KOSPI200_FUT",
            name="코스피200 선물",
            flag="🇰🇷",
            raw=fut_raw,
            sidecar_pct=5.0,
            cb_l1_pct=8.0,
            cb_l2_pct=15.0,
            cb_l3_pct=20.0,
            rule_desc="코스피200 선물(최근월물) ±5% 이상 1분 지속 시 프로그램 매매 호가 5분 정지 (매도/매수 사이드카)",
        ),
        _classify_market_gauge(
            key="KOSPI",
            name="코스피 종합",
            flag="🇰🇷",
            raw=kospi_raw,
            sidecar_pct=None,
            cb_l1_pct=8.0,
            cb_l2_pct=15.0,
            cb_l3_pct=20.0,
            rule_desc="코스피 지수 전일 대비 -8%(1단계 20분 정지) · -15%(2단계 20분 정지) · -20%(3단계 장 종료) 서킷브레이커",
        ),
        _classify_market_gauge(
            key="KOSDAQ",
            name="코스닥 종합",
            flag="🇰🇷",
            raw=kosdaq_raw,
            sidecar_pct=6.0,
            cb_l1_pct=8.0,
            cb_l2_pct=15.0,
            cb_l3_pct=20.0,
            rule_desc="코스닥150 선물 ±6% & 현물 ±3% 이상 1분 지속 시 사이드카 발동 · 지수 -8%/-15%/-20% 서킷브레이커",
        ),
        _classify_market_gauge(
            key="SP500",
            name="미국 S&P 500",
            flag="🇺🇸",
            raw=sp500_raw,
            sidecar_pct=None,
            cb_l1_pct=7.0,
            cb_l2_pct=13.0,
            cb_l3_pct=20.0,
            rule_desc="미국 NYSE/NASDAQ 전 종목 S&P 500 기준 -7%(15분 정지) · -13%(15분 정지) · -20%(당일 종료) 서킷브레이커",
        ),
    ]

    # 종합 경보 레벨 결정 (우선순위: CB > SELL_SIDECAR > BUY_SIDECAR > IMMINENT > WATCH > NORMAL)
    severity_rank = {
        "CIRCUIT_BREAKER_L3": 6,
        "CIRCUIT_BREAKER_L2": 6,
        "CIRCUIT_BREAKER_L1": 6,
        "SELL_SIDECAR": 5,
        "BUY_SIDECAR": 4,
        "IMMINENT_CB": 3,
        "IMMINENT_SELL": 3,
        "IMMINENT_BUY": 3,
        "WATCH": 2,
        "NORMAL": 1,
    }

    top_market = max(markets, key=lambda m: severity_rank.get(m["level"], 1))
    top_level = top_market["level"]

    if top_level.startswith("CIRCUIT_BREAKER"):
        overall_level = "CIRCUIT_BREAKER"
        overall_badge = "⛔ 서킷브레이커 경보"
        headline = f"{top_market['flag']} {top_market['name']} {top_market['change_pct']:+.2f}% — 서킷브레이커 발동 구간 진입!"
        sub_guide = "시장 전체 매매가 일시 중단되는 극단적 패닉 구간입니다. 공포 투매 동참과 추격 매매를 멈추고 현금을 지키며 거래 재개 후 바닥을 확인하세요."
        banner_active = True
    elif top_level == "SELL_SIDECAR":
        overall_level = "SELL_SIDECAR"
        overall_badge = "🚨 매도 사이드카 경보"
        headline = f"{top_market['flag']} {top_market['name']} {top_market['change_pct']:+.2f}% — 매도 사이드카 발동 기준(-{top_market['sidecar_threshold_pct']:.0f}%) 돌파!"
        sub_guide = "선물 급락으로 기관·외국인 프로그램 매도 호가가 5분간 일시 정지되는 구간입니다. 급락 직후 섣부른 저가 매수(칼날 잡기)나 감정적 투매를 피하고 수급 진정을 확인하세요."
        banner_active = True
    elif top_level == "BUY_SIDECAR":
        overall_level = "BUY_SIDECAR"
        overall_badge = "🔥 매수 사이드카 경보"
        headline = f"{top_market['flag']} {top_market['name']} {top_market['change_pct']:+.2f}% — 매수 사이드카 발동 기준(+{top_market['sidecar_threshold_pct']:.0f}%) 돌파!"
        sub_guide = "단기 급등 과열로 프로그램 매수 호가가 5분간 정지되는 구간입니다. 시초가·고점 추격 매수를 자제하고 분할 익절 전략을 점검하세요."
        banner_active = True
    elif top_level.startswith("IMMINENT"):
        overall_level = "IMMINENT"
        overall_badge = "⚠️ 사이드카 발동 임박"
        headline = f"{top_market['flag']} {top_market['name']} {top_market['change_pct']:+.2f}% — {top_market['next_trigger_label']}까지 {top_market['distance_to_trigger_pct']:.2f}%p 남음"
        sub_guide = "변동성이 크게 확대되어 사이드카 발동 기준에 근접했습니다. 레버리지·신규 추격 진입을 자제하고 손절 방어선을 점검하세요."
        banner_active = True
    elif top_level == "WATCH":
        overall_level = "WATCH"
        overall_badge = "🟡 변동성 확대 주의"
        headline = f"{top_market['flag']} {top_market['name']} {top_market['change_pct']:+.2f}% — 평소 대비 장중 변동성 확대"
        sub_guide = "주요 지수가 ±2.5% 이상 움직이고 있습니다. 분할 매매 원칙을 지키며 외국인·기관 수급 방향을 주시하세요."
        banner_active = False
    else:
        overall_level = "NORMAL"
        overall_badge = "🟢 시장 정상 가동"
        headline = "한·미 주요 지수 및 선물 모두 사이드카·서킷브레이커 안전 구간에서 정상 거래 중입니다."
        sub_guide = "급격한 시장 충격 없이 안정적인 변동성 범위입니다. 계획된 분할 매수 및 리스크 관리 원칙대로 운용하세요."
        banner_active = False

    now_kst = datetime.now(KST)
    kr_open_now = is_kr_regular_market_open(now_kst)
    top_is_us = top_market.get("key") == "SP500"
    top_market_live = bool(top_market.get("market_open")) or (not top_is_us and kr_open_now)
    if overall_level in ("CIRCUIT_BREAKER", "SELL_SIDECAR", "BUY_SIDECAR") and top_market_live:
        _record_history_event({
            "ts": time.time(),
            "date": now_kst.strftime("%Y-%m-%d"),
            "time": now_kst.strftime("%H:%M:%S"),
            "code": f"{overall_level}_{top_market['key']}",
            "level": overall_level,
            "badge": overall_badge,
            "market": top_market["name"],
            "change_pct": top_market["change_pct"],
            "price_str": top_market["price_str"],
            "headline": headline,
        })

    result = {
        "updated_at": now_kst.strftime("%Y-%m-%d %H:%M:%S"),
        "updated_time": now_kst.strftime("%H:%M:%S"),
        "overall_level": overall_level,
        "overall_badge": overall_badge,
        "banner_active": banner_active,
        "headline": headline,
        "sub_guide": sub_guide,
        "top_alert_market": top_market["key"],
        "markets": markets,
        "nasdaq": nasdaq_raw,
        "kpi200": kr_raw.get("KPI200") or {},
        "history": _load_history()[:10],
        "beginner_guide": [
            {
                "title": "사이드카(Sidecar)란?",
                "desc": "선물 가격이 급등락(코스피200 ±5%, 코스닥150 ±6%)해 1분 이상 지속될 때, 현물 시장으로 충격이 번지는 것을 막기 위해 프로그램 매매 호가 효력을 5분간 일시 정지하는 안전장치입니다.",
            },
            {
                "title": "서킷브레이커(Circuit Breaker)란?",
                "desc": "현물 지수 자체가 전일 대비 -8%(1단계), -15%(2단계), -20%(3단계) 폭락할 때 시장 전체의 모든 주식 매매를 20분간(3단계는 당일 종료) 완전히 중단해 투자자 패닉을 진정시키는 최상위 비상 브레이크입니다.",
            },
            {
                "title": "매도 사이드카 발동 시 초보자 3초 원칙",
                "desc": "① 공포에 휩쓸린 동반 투매 금지 ② 발동 직후 첫 반등에 몰빵 추격 금지 ③ 거래량 안정과 지지선 확인 후 3회 이상 분할 대응 원칙을 지키세요.",
            },
        ],
    }

    with _CACHE_LOCK:
        _SIDECAR_CACHE["ts"] = now
        _SIDECAR_CACHE["data"] = result

    return result


def default_sidecar_guard_config() -> Dict[str, Any]:
    return {
        "enabled": True,                     # 시장 사이드카/급락 연동 자동 매수 차단 ON/OFF
        "market_drop_threshold_pct": 3.5,    # 코스피/코스닥/코스피200 선물 -3.5% 이하 시 신규 매수 차단
        "block_on_sell_sidecar": True,       # 매도 사이드카(-5%)/서킷브레이커 발동 시 무조건 매수 잠금
        "block_strategy_lab": True,          # AI 전략랩(가상/실전) 신규 매수도 동시 차단
        "daily_loss_limit_enabled": True,    # 일일 계좌 누적 손실 한도 서킷브레이커 ON/OFF
        "daily_loss_limit_pct": 3.5,         # 당일 손실률이 시드 대비 -3.5% 초과 시 당일 매수 잠금
        "manual_lock": False,                # 대표님 원클릭 수동 비상 잠금 스위치
        "fcm_notify": True,                  # 발동 시 대표님 스마트폰 FCM 푸시 알림 발송
    }


def evaluate_account_sidecar(
    state: Dict[str, Any],
    market_status: Optional[Dict[str, Any]] = None,
    today_pnl_krw: Optional[int] = None,
) -> Dict[str, Any]:
    """
    시장 실시간 사이드카 현황 + 대표님 계좌 손실 한도 + 수동 잠금 상태를 종합해
    자동매매 신규 매수 차단(계좌 보호 사이드카) 발동 여부를 100% 실시간으로 판정합니다.
    """
    cfg_root = state.get("config") or {}
    guard_cfg = dict(default_sidecar_guard_config())
    if isinstance(cfg_root.get("sidecar_guard"), dict):
        guard_cfg.update(cfg_root["sidecar_guard"])

    m_stat = market_status or get_market_sidecar_status()
    markets = m_stat.get("markets") or []
    m_map = {m["key"]: m for m in markets}

    fut_chg = float((m_map.get("KOSPI200_FUT") or {}).get("change_pct") or 0.0)
    kospi_chg = float((m_map.get("KOSPI") or {}).get("change_pct") or 0.0)
    kosdaq_chg = float((m_map.get("KOSDAQ") or {}).get("change_pct") or 0.0)
    sp500_chg = float((m_map.get("SP500") or {}).get("change_pct") or 0.0)
    overall_lvl = str(m_stat.get("overall_level") or "NORMAL")

    now_kst = datetime.now(KST)
    kr_live_now = is_kr_regular_market_open(now_kst) or any(
        bool((m_map.get(k) or {}).get("market_open")) for k in ("KOSPI200_FUT", "KOSPI", "KOSDAQ")
    )
    us_live_now = bool((m_map.get("SP500") or {}).get("market_open"))
    top_alert_key = str(m_stat.get("top_alert_market") or "")
    top_alert_live = us_live_now if top_alert_key == "SP500" else kr_live_now

    # 일일 손실 계산 (실현 손익 + 현재 평가손익 기준)
    if today_pnl_krw is None:
        today_prefix = now_kst.strftime("%Y-%m-%d")
        realized_today = sum(
            int(lg.get("pnl_krw", 0) or 0)
            for lg in (state.get("trade_logs") or [])
            if str(lg.get("timestamp", "")).startswith(today_prefix)
            and str(lg.get("action", "")).upper() == "SELL"
        )
        unrealized_now = sum(int(p.get("pnl_krw", 0) or 0) for p in (state.get("positions") or []))
        today_pnl_krw = realized_today + unrealized_now

    mode = str(cfg_root.get("mode") or "AI_PAPER")
    seed_krw = int(
        cfg_root.get("max_total_invest_krw")
        if mode == "KIS_REAL" and int(cfg_root.get("max_total_invest_krw") or 0) > 0
        else (cfg_root.get("paper_seed_krw") or cfg_root.get("initial_capital_krw") or 10000000)
    )
    seed_krw = max(50000, seed_krw)
    today_pnl_pct = round((today_pnl_krw / seed_krw) * 100.0, 2)

    triggers: List[str] = []
    trigger_code = ""

    # 1. 대표님 수동 비상 잠금
    if bool(guard_cfg.get("manual_lock", False)):
        triggers.append("🔒 대표님 수동 매수 사이드카(비상 잠금) 활성화")
        trigger_code = "MANUAL_LOCK"

    # 2. 시장 매도 사이드카 / 서킷브레이커 연동 차단 (실제 장중일 때만 작동 — 새벽 전일 종가 오발동·이력 도배 방지)
    if bool(guard_cfg.get("enabled", True)):
        if bool(guard_cfg.get("block_on_sell_sidecar", True)) and overall_lvl in ("SELL_SIDECAR", "CIRCUIT_BREAKER") and top_alert_live:
            clean_badge = str(m_stat.get("overall_badge") or "").replace("🚨", "").strip()
            triggers.append(f"🚨 거래소 {clean_badge} 연동 발동 ({m_stat.get('headline')})")
            if not trigger_code:
                trigger_code = f"MARKET_{overall_lvl}"

        drop_th = abs(float(guard_cfg.get("market_drop_threshold_pct", 3.5) or 3.5))
        worst_kr = min(fut_chg, kospi_chg, kosdaq_chg)
        if kr_live_now and worst_kr <= -drop_th:
            triggers.append(
                f"📉 국내 시장 급락 기준(-{drop_th:.1f}%) 돌파 "
                f"(선물 {fut_chg:+.2f}% · 코스피 {kospi_chg:+.2f}% · 코스닥 {kosdaq_chg:+.2f}%)"
            )
            if not trigger_code:
                trigger_code = "KR_MARKET_DROP"
        elif us_live_now and sp500_chg <= -drop_th:
            triggers.append(f"📉 미국 S&P 500 급락 기준(-{drop_th:.1f}%) 돌파 ({sp500_chg:+.2f}%)")
            if not trigger_code:
                trigger_code = "US_MARKET_DROP"

    # 3. 일일 계좌 최대 손실 한도 서킷브레이커
    if bool(guard_cfg.get("daily_loss_limit_enabled", True)):
        loss_th = abs(float(guard_cfg.get("daily_loss_limit_pct", 3.5) or 3.5))
        if today_pnl_pct <= -loss_th:
            triggers.append(
                f"💸 일일 손실 한도(-{loss_th:.1f}%) 도달 (당일 {today_pnl_krw:+,}원 / {today_pnl_pct:+.2f}%)"
            )
            if not trigger_code:
                trigger_code = "DAILY_LOSS_CB"

    buy_blocked = len(triggers) > 0
    block_lab = buy_blocked and bool(guard_cfg.get("block_strategy_lab", True))
    is_live_session_event = kr_live_now or us_live_now or trigger_code == "MANUAL_LOCK"

    summary_text = (
        f"🚨 [계좌 보호 사이드카 발동] {' · '.join(triggers)} ➔ 신규 매수·추매 자동 잠금 (보유 익절/손절 매도는 정상 작동)"
        if buy_blocked
        else (
            f"🛡️ [계좌 보호 사이드카 정상 감시] 시장 급락 차단(-{guard_cfg['market_drop_threshold_pct']}%) · "
            f"매도 사이드카 연동 {'ON' if guard_cfg['block_on_sell_sidecar'] else 'OFF'} · "
            f"일일 손실한도(-{guard_cfg['daily_loss_limit_pct']}%, 현재 {today_pnl_pct:+.2f}%)"
        )
    )

    return {
        "buy_blocked": buy_blocked,
        "block_strategy_lab": block_lab,
        "trigger_code": trigger_code or "SAFE",
        "triggers": triggers,
        "summary_text": summary_text,
        "today_pnl_krw": today_pnl_krw,
        "today_pnl_pct": today_pnl_pct,
        "seed_krw": seed_krw,
        "kr_market_open": kr_live_now,
        "us_market_open": us_live_now,
        "is_live_session_event": is_live_session_event,
        "config": guard_cfg,
        "market_snapshot": {
            "overall_level": overall_lvl,
            "overall_badge": m_stat.get("overall_badge"),
            "kospi200_fut_pct": fut_chg,
            "kospi_pct": kospi_chg,
            "kosdaq_pct": kosdaq_chg,
            "sp500_pct": sp500_chg,
            "updated_time": m_stat.get("updated_time"),
        },
    }


def notify_sidecar_if_needed(guard_eval: Dict[str, Any], send_fn) -> bool:
    """
    계좌 보호 사이드카가 당일 처음 발동될 때 대표님께 FCM 푸시 알림을 1회만 깔끔하게 발송합니다.
    """
    if not guard_eval.get("buy_blocked"):
        return False
    cfg = guard_eval.get("config") or {}
    if not cfg.get("fcm_notify", True):
        return False
    code = str(guard_eval.get("trigger_code") or "")
    if not code or code == "MANUAL_LOCK":
        return False
    today_key = f"{datetime.now(KST).strftime('%Y-%m-%d')}|{code}"
    if today_key in _NOTIFIED_TODAY:
        return False
    _NOTIFIED_TODAY.add(today_key)
    try:
        triggers = guard_eval.get("triggers") or []
        title = "🚨 계좌 보호 사이드카 발동 (신규 매수 자동 잠금)"
        body = (
            f"{triggers[0] if triggers else '시장 급락 감지'}\n"
            f"대표님 계좌 보호를 위해 자동매매·전략랩 신규 매수를 일시 차단했습니다. (보유 종목 익절·손절 방어는 정상 작동)"
        )
        send_fn(title, body, {"type": "SIDECAR_BRAKE", "code": code})
        return True
    except Exception as e:
        print(f"[SidecarMonitor] FCM notify warning: {e}")
        return False
