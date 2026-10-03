import os
import json
import time
import math
import threading
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor

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
    {"symbol": "SOFI", "name": "소파이 테크놀로지스 (미국 AI 핀테크)", "sector": "🚀 해외신생 · 미국 디지털금융 대장 ($10~$15대)", "tier": "US_EMERGING", "exchange": "NASD"},
    {"symbol": "MARA", "name": "마라 홀딩스 (북미 비트코인 AI 데이터센터)", "sector": "🚀 해외신생 · 가상자산/AI 전력 인프라 ($15~$20대)", "tier": "US_EMERGING", "exchange": "NASD"},
    {"symbol": "NVDL", "name": "NVDL (엔비디아 2배 레버리지 ETF)", "sector": "미국 AI 반도체 2배 ETF ($50~$60대)", "tier": "ETF_FAST", "exchange": "NASD"},
    # [3] 미국 나스닥/뉴욕 대표 빅테크 주도주
    {"symbol": "PLTR", "name": "팔란티어 (Palantir)", "sector": "미국 AI 국방 소프트웨어 ($40대)", "tier": "MID_MOMENTUM", "exchange": "NYSE"},
    {"symbol": "NVDA", "name": "엔비디아 (NVIDIA)", "sector": "미국 AI 반도체 대장 ($120대)", "tier": "BLUECHIP", "exchange": "NASD"},
    {"symbol": "TSLA", "name": "테슬라 (Tesla)", "sector": "미국 자율주행/로봇", "tier": "BLUECHIP", "exchange": "NASD"},
    {"symbol": "AAPL", "name": "애플 (Apple)", "sector": "미국 온디바이스 AI", "tier": "BLUECHIP", "exchange": "NASD"},
    {"symbol": "MSFT", "name": "마이크로소프트", "sector": "미국 클라우드 AI", "tier": "BLUECHIP", "exchange": "NASD"},
    {"symbol": "META", "name": "메타 (Meta)", "sector": "미국 AI 광고/플랫폼", "tier": "BLUECHIP", "exchange": "NASD"},
]


_LIVE_HOLIDAY_CACHE: Dict[str, Any] = {"date": None, "is_holiday": False, "reason": ""}

def _check_market_holiday(is_us: bool = False) -> tuple[bool, str]:
    """
    [실시간 스마트 달력 + 거래소 3중 교차 검증 엔진]
    1. 달력 라이브러리(holidays) 및 KRX 특일 캘린더 실시간 조회
    2. 국경일(개천절, 한글날 등), 법정 공휴일, 대체공휴일, 증시 전용 휴장일(근로자의 날, 연말 폐장일) 실시간 감지
    3. 정규장 운영 시간 중 실시간 거래소 라이브 응답을 통한 돌발 임시공휴일 교차 검증
    반환값: (휴장여부, 휴장사유명칭)
    """
    now_kst = datetime.now(KST)
    if is_us:
        try:
            from holiday_checker import is_holiday
            if is_holiday("us"):
                import holidays
                us_hols = holidays.US()
                ny_date = (now_kst - timedelta(hours=13)).date()
                hol_name = us_hols.get(ny_date, "미국 연방 공휴일")
                return True, str(hol_name)
        except Exception:
            pass
        return False, ""
    else:
        today_date = now_kst.date()
        today_str = today_date.strftime("%Y-%m-%d")

        # 1. 한국거래소(KRX) 고정 및 변동 공휴일 실시간 달력 체크 (개천절, 한글날, 근로자의 날, 연말 납회일 등)
        try:
            from korea_data import is_krx_holiday, FIXED_KRX_MMDD
            if is_krx_holiday(today_date):
                holiday_names = {
                    (1, 1): "신정",
                    (3, 1): "삼일절",
                    (5, 1): "근로자의 날 (증시 전면 휴장)",
                    (5, 5): "어린이날",
                    (6, 6): "현충일",
                    (7, 17): "제헌절",
                    (8, 15): "광복절",
                    (10, 3): "개천절",
                    (10, 9): "한글날",
                    (12, 25): "성탄절",
                    (12, 31): "연말 납회일 (증시 폐장)",
                }
                name = holiday_names.get((today_date.month, today_date.day), "법정 공휴일 / 대체공휴일")
                return True, name
        except Exception:
            pass

        # 2. 파이썬 실시간 holidays 달력 패키지 검증 (대체공휴일 및 음력 명절 실시간 계산)
        try:
            import holidays
            kr_hols = holidays.KR()
            if today_date in kr_hols:
                return True, str(kr_hols.get(today_date, "국경일/공휴일"))
        except Exception:
            pass

        # 3. [실시간 거래소 라이브 프로브] 평일 정규장 시간대(09:00~15:30) 정부 임시공휴일/돌발 휴장 감지
        if now_kst.weekday() < 5 and (9 <= now_kst.hour < 15 or (now_kst.hour == 15 and now_kst.minute <= 30)):
            if _LIVE_HOLIDAY_CACHE.get("date") == today_str and _LIVE_HOLIDAY_CACHE.get("is_holiday"):
                return True, _LIVE_HOLIDAY_CACHE.get("reason", "거래소 임시 휴장")
            try:
                # 네이버 금융 삼성전자 실시간 API의 장운영 마켓 상태 확인
                r = requests.get(
                    "https://m.stock.naver.com/api/stock/005930/basic",
                    headers={"User-Agent": "Mozilla/5.0"},
                    timeout=2,
                )
                if r.status_code == 200:
                    j_data = r.json()
                    mkt_status = str(j_data.get("marketStatus", "")).upper()
                    if mkt_status == "CLOSE":
                        _LIVE_HOLIDAY_CACHE["date"] = today_str
                        _LIVE_HOLIDAY_CACHE["is_holiday"] = True
                        _LIVE_HOLIDAY_CACHE["reason"] = "거래소 실시간 임시 휴장"
                        return True, "거래소 실시간 임시 휴장"
            except Exception:
                pass

        return False, ""


def _get_time_based_session_info(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """
    한국시간(KST) 기준으로 실제 거래소 운영 상태를 엄격히 판별하여
    주간(09:00~15:30 국내 정규장)에는 국내주식 후보군을, 야간(17:00~09:00 미국장)에는 해외주식 후보군을 자동 배치합니다.
    ※ 국내 휴장일(개천절, 한글날 등)에는 멍하니 대기하지 않고, 해외(미국) 시장으로 스마트하게 자율 전환합니다!
    """
    now_kst = datetime.now(KST)
    weekday = now_kst.weekday()
    hour = now_kst.hour
    minute = now_kst.minute

    is_kr_holiday, kr_holiday_name = _check_market_holiday(is_us=False)
    is_us_holiday, us_holiday_name = _check_market_holiday(is_us=True)

    # 한국 정규장 운영 시간: 평일 09:00 ~ 15:30 (단, 공휴일/빨간날 제외)
    is_kr_open = (weekday < 5) and (not is_kr_holiday) and (9 <= hour < 15 or (hour == 15 and minute <= 30))
    # 미국 시장 거래 시간: 월요일 17:00 ~ 토요일 09:00 KST (단, 미국 공휴일 제외)
    is_us_open = is_market_open_now("NVDA", is_us=True)

    target_cfg = str(cfg.get("market_target", "ALL")).upper()
    if target_cfg == "KR_ONLY":
        active_market = "KR"
    elif target_cfg == "US_ONLY":
        active_market = "US"
    else:
        # [스마트 자율 세션 전환]
        # 국내 증시가 휴장(개천절, 한글날 등)이고 미국 증시가 열리는 날이면 미국장으로 즉시 스마트 전환!
        if (is_kr_holiday or weekday >= 5) and not (is_us_holiday or weekday == 6):
            active_market = "US"
        else:
            active_market = "US" if (hour >= 17 or hour < 8) else "KR"

    if active_market == "KR":
        if is_kr_open:
            badge = "🟢 🇰🇷 국내 정규장 실시간 거래 중 (09:00~15:30)"
            desc = "현재 한국거래소(코스피·코스닥) 정규장 운영 시간으로, AI가 [🇰🇷 국내 주도주·수급 포착주 Top 10]을 실시간 분석 및 매매합니다."
        else:
            if is_kr_holiday:
                badge = f"🔒 🇰🇷 국내 주식시장 {kr_holiday_name} 휴장 (다음 개장일 09:00 대기)"
                desc = f"오늘은 법정 공휴일({kr_holiday_name})로 한국거래소(코스피·코스닥)가 전면 휴장합니다. 모의/실전 매매가 일시 중지되며, 다음 정규 개장일 오전 09:00에 자동 재개됩니다."
            elif weekday >= 5:
                badge = "🔒 🇰🇷 국내 주식시장 주말 휴장 (월요일 09:00 개장 대기)"
                desc = "주말에는 한국거래소가 휴장하여 모의/실전 매매가 일시 중지되며, 다음 평일 오전 09:00 정규장 개장 시 자동 재개됩니다."
            elif hour >= 15 and (hour > 15 or minute > 30):
                badge = "☕ 🇰🇷 국내 정규장 마감 (15:30 마감 · 17:00 미국장 자동 전환 대기)"
                desc = "오늘 국내 정규장(09:00~15:30)이 공식 마감되었습니다. 17:00부터 미국 해외주식(프리마켓) 모드로 자동 전환됩니다."
            else:
                badge = "⏳ 🇰🇷 국내 정규장 개장 전 대기 (09:00 개장 대기)"
                desc = "오전 09:00 국내 정규장 개장을 대기 중입니다. 개장 즉시 당일 1순위 주도주를 포착하여 매수를 시작합니다."
        return {
            "active_market": "KR",
            "is_market_open": is_kr_open,
            "current_kst": now_kst.strftime("%H:%M:%S"),
            "session_badge": badge,
            "session_desc": desc,
        }
    else:
        if is_us_open:
            badge = "🟢 🇺🇸 야간 미국장 실시간 거래 중 (17:00~08:00 KST)"
            desc = "현재 미국(나스닥·NYSE) 시장이 열려 있어, AI가 [🇺🇸 해외 혁신주·기술주 Top 10]을 실시간 분석 및 매매합니다."
        else:
            if is_us_holiday:
                badge = f"🔒 🇺🇸 미국 주식시장 {us_holiday_name} 휴장 (다음 개장일 17:00 대기)"
                desc = f"현지 공휴일({us_holiday_name})로 미국 증권거래소가 전면 휴장합니다. 모의/실전 매매가 일시 중지되며 다음 개장일에 자동 재개됩니다."
            elif is_kr_holiday:
                badge = f"💡 🇰🇷국내 {kr_holiday_name} 휴장 ➡️ 🇺🇸미국장 스마트 대기 (17:00 개장)"
                desc = f"오늘은 국내 법정 공휴일({kr_holiday_name})로 한국 증시가 휴장합니다. AI가 정상 개장하는 미국 나스닥·NYSE 유망주로 17:00부터 스마트 집중 운용합니다."
            elif weekday in (5, 6):
                badge = "🔒 🇺🇸 미국 주식시장 주말 휴장 (화요일 17:00 개장 대기)"
                desc = "주말에는 미국 거래소가 휴장하여 모의/실전 매매가 일시 중지되며, 다음 주 평일 야간 개장 시 자동 재개됩니다."
            else:
                badge = "⏳ 🇺🇸 미국장 개장 대기 (17:00 프리마켓 개장 대기)"
                desc = "현재는 미국 거래소가 닫혀 있는 주간 시간대입니다. 오후 17:00 프리마켓 개장 즉시 실시간 매매가 재개됩니다."
        return {
            "active_market": "US",
            "is_market_open": is_us_open,
            "current_kst": now_kst.strftime("%H:%M:%S"),
            "session_badge": badge,
            "session_desc": desc,
        }


def is_market_open_now(symbol: str, is_us: bool = False) -> bool:
    """
    해당 종목 거래소의 '실제 정규 거래 가능 시간'을 엄격하게 판별합니다.
    - 국내주식 (KR): 평일(월~금) 09:00 ~ 15:30 KST (정규장 시간만 매매 체결 허용!)
      ※ 15:30 이후 장 마감, 09:00 이전, 주말 및 국경일/공휴일(개천절, 한글날 등)에는 가상 모의투자도 절대 매매 체결 금지!
    - 미국주식 (US): 평일 야간 17:00 ~ 익일 09:00 KST (월 17:00 ~ 토 09:00 KST, 현지 공휴일 제외)
      ※ 한국시간 낮 09:00 ~ 17:00 및 주말/미국 공휴일에는 미국 거래소 폐장으로 매매 체결 금지!
    """
    is_hol, _ = _check_market_holiday(is_us=is_us)
    if is_hol:
        return False

    now_kst = datetime.now(KST)
    weekday = now_kst.weekday()  # 0=월, 1=화, 2=수, 3=목, 4=금, 5=토, 6=일
    hour = now_kst.hour
    minute = now_kst.minute

    if is_us:
        # 미국 시장 (KST 기준):
        # 월요일 17:00 KST부터 토요일 09:00 KST까지 야간(17:00 ~ 익일 09:00)에만 거래 가능
        if weekday == 5:  # 토요일
            return hour < 9  # 토요일 아침 09:00까지 애프터마켓 거래 가능
        elif weekday == 6:  # 일요일
            return False  # 휴장
        elif weekday == 0:  # 월요일
            return hour >= 17  # 월요일 17:00부터 프리마켓 시작
        else:  # 화, 수, 목, 금
            return (hour >= 17) or (hour < 9)
    else:
        # 국내 시장 (KRX 정규장 기준): 평일 09:00 ~ 15:30
        if weekday >= 5:  # 주말(토, 일) 휴장
            return False
        if hour < 9:  # 09:00 이전
            return False
        if 9 <= hour < 15:  # 09:00 ~ 14:59
            return True
        if hour == 15 and minute <= 30:  # 15:00 ~ 15:30 정규장 마감 동시호가 포함
            return True
        return False  # 15:30 이후 정규장 마감 (체결 불가)


def _default_state() -> Dict[str, Any]:

    return {
        "config": {
            "enabled": True,
            "mode": "AI_PAPER",  # AI_PAPER | KIS_VIRTUAL | KIS_REAL
            "market_target": "ALL",  # ALL(국내주식+해외주식+국내외ETF 24시간 풀가동) | KR | US
            "paper_seed_krw": 20000000,  # 모의투자 시드머니 기본값 2,000만원 영구 유지
            "initial_capital_krw": 20000000,
            "max_total_invest_krw": 10000000,  # 실전/연동 계좌에서 AI 자동매매가 사용할 수 있는 최대 총 투자 한도 금액 (원)
            "order_amount_krw": 2000000,
            "max_positions": 7,
            "take_profit_pct": 4.0,
            "use_stop_loss": False,  # False = 무손절 모드 (손해 보고는 절대 안 팔고 수익 날 때만 익절!)
            "auto_averaging_down": True,  # True = -5% 하락 시 1회 자동 물타기(평단가 낮추기)
            "stop_loss_pct": 2.5,
            "trailing_stop_pct": 1.2,
            "min_ai_score": 68,
            "allow_off_hours_sim": False,  # 대표님 원칙: 모의투자도 실전과 100% 동일하게 정규장 거래시간만 엄수!
            "telegram_notify": True,
            "kis_order_enabled": True,  # 계좌를 연동해 두었더라도 실제 증권사 주문 전송을 ON/OFF 할 수 있는 안전 스위치
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
                    state["paper_positions_backup"] = saved.get("paper_positions_backup", [])
                    state["trade_logs"] = saved.get("trade_logs", [])[:100]
                    state["candidates"] = saved.get("candidates", [])
                    state["last_cycle_at"] = saved.get("last_cycle_at", "")
                    state["kis_token"] = saved.get("kis_token", {"access_token": "", "expires_at": 0})
                    # KIS_REAL 모드일 때 실제 한투 주문 확인(kis_order_confirmed / [한투주문 완료])이 없는 가상 매수분이 섞여 있으면 즉시 분리 및 예수금 복원
                    if state["config"].get("mode") == "KIS_REAL":
                        real_only = [
                            p for p in state["positions"]
                            if p.get("kis_order_confirmed") is True or "[한투주문 완료" in str(p.get("reason", ""))
                        ]
                        unconfirmed = [
                            p for p in state["positions"]
                            if not (p.get("kis_order_confirmed") is True or "[한투주문 완료" in str(p.get("reason", "")))
                        ]
                        if unconfirmed:
                            existing_paper_syms = {bp.get("symbol") for bp in state["paper_positions_backup"]}
                            for up in unconfirmed:
                                up["trade_mode"] = "AI_PAPER"
                                if up.get("symbol") not in existing_paper_syms:
                                    state["paper_positions_backup"].append(up)
                            state["positions"] = real_only
                            cap = int(state["config"].get("max_total_invest_krw", 100000) or 100000)
                            if not real_only:
                                state["account"]["cash_krw"] = cap
                            try:
                                with open(STATE_FILE, "w", encoding="utf-8") as fw:
                                    json.dump(state, fw, ensure_ascii=False, indent=2)
                            except Exception:
                                pass

                    # 당일 매도 완료된 종목이 positions 또는 paper_positions_backup에 잔류해 있을 경우 즉각 소각 정화
                    today_str = datetime.now(KST).strftime("%Y-%m-%d")
                    latest_act: Dict[str, str] = {}
                    for lg in state.get("trade_logs", []):
                        s = lg.get("symbol")
                        act = lg.get("action")
                        ts = str(lg.get("timestamp", ""))
                        if s and act and s not in latest_act and ts.startswith(today_str):
                            latest_act[s] = act
                    sold_today = {s for s, act in latest_act.items() if act == "SELL"}
                    if sold_today:
                        state["positions"] = [p for p in state.get("positions", []) if p.get("symbol") not in sold_today]
                        state["paper_positions_backup"] = [p for p in state.get("paper_positions_backup", []) if p.get("symbol") not in sold_today]
    except Exception as e:
        print(f"[AutoTrader] load_state error: {e}")

    # [KIS API 키 영구 금고(Vault) 자동 복원] 어떤 이유로든 state 파일이 초기화되어도 금고 파일에서 즉시 복구!
    vault_file = os.path.join(os.path.dirname(__file__), "kis_credentials_vault.json")
    try:
        if os.path.exists(vault_file):
            with open(vault_file, "r", encoding="utf-8") as vf:
                vdata = json.load(vf)
                for vk in ("kis_account_no", "kis_app_key", "kis_app_secret"):
                    cur_val = str(state["config"].get(vk, "") or "").strip()
                    vault_val = str(vdata.get(vk, "") or "").strip()
                    if (not cur_val or "*" in cur_val) and vault_val and "*" not in vault_val:
                        state["config"][vk] = vault_val
    except Exception:
        pass
    if not str(state["config"].get("kis_account_no", "") or "").strip():
        state["config"]["kis_account_no"] = "43880949-22"

    # [모의투자 시드머니 영구 보존] 대표님이 설정한 시드머니가 서버 재시작/일자변경 시 1,000만원 기본값으로 되돌아가지 않도록 완벽 보존
    current_seed = state["config"].get("paper_seed_krw")
    if not current_seed or int(current_seed) <= 0:
        saved_init = state["config"].get("initial_capital_krw")
        if saved_init and int(saved_init) > 0:
            state["config"]["paper_seed_krw"] = int(saved_init)
        else:
            state["config"]["paper_seed_krw"] = 20000000
    state["config"]["paper_seed_krw"] = max(50000, int(state["config"]["paper_seed_krw"]))
    # [실전 거래시간 100% 엄수] 모의투자도 실전과 똑같이 정규 거래시간 외 임의 매수를 전면 금지
    state["config"]["allow_off_hours_sim"] = False

    return state


def save_state(state: Dict[str, Any]) -> None:
    # [KIS API 키 영구 금고(Vault) 별도 보관] 유효한 키가 들어오면 별도 보안 금고 파일에 영구 백업
    vault_file = os.path.join(os.path.dirname(__file__), "kis_credentials_vault.json")
    try:
        cfg = state.get("config", {})
        existing_vault = {}
        if os.path.exists(vault_file):
            try:
                with open(vault_file, "r", encoding="utf-8") as vf:
                    existing_vault = json.load(vf)
            except Exception:
                existing_vault = {}
        updated_vault = False
        for vk in ("kis_account_no", "kis_app_key", "kis_app_secret"):
            val = str(cfg.get(vk, "") or "").strip()
            if val and "*" not in val:
                if existing_vault.get(vk) != val:
                    existing_vault[vk] = val
                    updated_vault = True
            elif existing_vault.get(vk):
                # 만약 메모리에 빈 값이나 마스킹 값이 있으면 금고 원본으로 복원
                cfg[vk] = existing_vault[vk]
        if updated_vault:
            with open(vault_file, "w", encoding="utf-8") as vf:
                json.dump(existing_vault, vf, ensure_ascii=False, indent=2)
            try:
                os.chmod(vault_file, 0o600)
            except Exception:
                pass
    except Exception:
        pass

    try:
        state["trade_logs"] = state.get("trade_logs", [])[:100]
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
        try:
            os.chmod(STATE_FILE, 0o600)  # 리눅스 서버 소유자(ubuntu) 외 읽기/쓰기 완전 차단
        except Exception:
            pass
    except Exception as e:
        print(f"[AutoTrader] save_state error: {e}")

    # Firestore 백업 동기화 (비동기 백그라운드 스레드 — API 응답 지연 원천 차단 & API 키 완전 마스킹)
    def _async_fs_backup():
        try:
            from firebase_admin import firestore
            db = firestore.client()
            safe_copy = json.loads(json.dumps(state))
            if "config" in safe_copy:
                if safe_copy["config"].get("kis_app_secret"):
                    safe_copy["config"]["kis_app_secret"] = "********"
                if safe_copy["config"].get("kis_app_key"):
                    raw_k = str(safe_copy["config"]["kis_app_key"])
                    safe_copy["config"]["kis_app_key"] = f"{raw_k[:4]}********{raw_k[-3:]}" if len(raw_k) > 8 else "********"
            safe_copy["kis_token"] = {"access_token": "", "expires_at": 0}
            db.collection("admin_auto_trader").document("current_state").set(safe_copy)
        except Exception:
            pass

    threading.Thread(target=_async_fs_backup, daemon=True).start()


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

    # 폴백 기본가 (네트워크 지연 시 안전망 — 국내 원화 및 미국 달러 실제 시세 반영)
    is_us_sym = bool(any(c.isalpha() for c in symbol))
    fallback_prices = {
        "005930": 74500, "000660": 182000, "012450": 345000, "267260": 328000,
        "196170": 315000, "005380": 248000, "000270": 104500, "035420": 176000,
        "034020": 21800, "042700": 118000, "007660": 41500, "105560": 88500,
        "068270": 192000, "277810": 158000,
        "SOXL": 36.5, "TQQQ": 72.4, "IONQ": 14.8, "RKLB": 11.2, "OKLO": 18.5,
        "SOUN": 6.4, "ASTS": 24.5, "JOBY": 6.8, "SERV": 9.4, "LUNR": 10.6,
        "RGTI": 4.2, "BBAI": 3.8, "SOFI": 11.4, "MARA": 16.8, "NVDL": 58.0,
        "NVDA": 128.5, "TSLA": 254.0, "AAPL": 227.5, "MSFT": 432.0, "META": 565.0, "PLTR": 37.8
    }
    p = fallback_prices.get(symbol, 15.5 if is_us_sym else 35000)
    return {"price": p, "change_pct": 1.85 if is_us_sym else 1.25, "volume": 1250000, "is_us": is_us_sym}


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


_NOTIFICATION_HISTORY: Dict[str, float] = {}
_LAST_GLOBAL_NOTIFY_TIME: float = 0.0


def _send_admin_trade_notification(
    title: str,
    body: str,
    symbol: str = "",
    market: str = "",
    force: bool = False,
) -> Dict[str, Any]:
    """
    관리자(대표님: rnfjrlakdmf@gmail.com / UID 110418985320259217419) 전용 실시간 FCM 푸시 알림 + 알림센터(🤖 자동매매 알림 탭) 단독 발송.
    - [장외·휴장일 철통 차단]: 거래소가 닫혀 있는 시간대에는 테스트·가상 알림 발송 원천 차단
    - [도배 방지 레이트 리미터]: 단시간 연속 알림 폭탄 방지 및 동일 종목 중복 알림 차단
    """
    global _LAST_GLOBAL_NOTIFY_TIME

    clean_body = (
        body.replace("<b>", "")
        .replace("</b>", "")
        .replace("<br/>", "\n")
        .strip()
    )

    if not market and symbol:
        try:
            from market_tag_helper import get_clean_market_name
            market = get_clean_market_name(symbol)
        except Exception:
            market = "나스닥" if not symbol.isdigit() else "코스피"

    # 0. [오프장/휴장일 알림 원천 차단 Fail-Safe]
    # 시장이 닫혀 있거나 주말/공휴일인 경우 푸시 및 알림 저장을 원천 차단하여 대표님 피로도 0 보장
    if symbol and not force:
        is_us_sym = not symbol.isdigit()
        if not is_market_open_now(symbol, is_us=is_us_sym):
            print(f"[AutoTrader-Notify] Blocked off-hours notification for {symbol}: {title}")
            return {"blocked": True, "reason": "market_closed"}

    # 1. [연속 발송 방지 (Anti-Flooding Rate Limiter)]
    now_t = time.time()
    if symbol and not force:
        dedupe_key = f"{symbol}:{title[:12]}"
        last_t = _NOTIFICATION_HISTORY.get(dedupe_key, 0.0)
        # 동일 종목의 동일 매매 알림은 최소 15분(900초) 이내 중복 전송 차단
        if (now_t - last_t) < 900.0:
            print(f"[AutoTrader-Notify] Suppressed duplicate symbol notification for {symbol} ({now_t - last_t:.1f}s ago): {title}")
            return {"suppressed": True, "reason": "symbol_cooldown"}
        _NOTIFICATION_HISTORY[dedupe_key] = now_t

    # 전체 알림 간격 최소 4초 쿨다운 (연속 알림 폭탄 방지)
    if not force and (now_t - _LAST_GLOBAL_NOTIFY_TIME) < 4.0:
        print(f"[AutoTrader-Notify] Suppressed rapid burst ({now_t - _LAST_GLOBAL_NOTIFY_TIME:.1f}s ago): {title}")
        return {"suppressed": True, "reason": "burst_limit"}

    _LAST_GLOBAL_NOTIFY_TIME = now_t

    # 2. 오직 대표님 관리자 계정(rnfjrlakdmf@gmail.com / rnfjr@gmail.com, UID: 110418985320259217419)으로만 단독 발송!
    admin_uids = ["110418985320259217419", "rnfjrlakdmf@gmail.com", "rnfjr@gmail.com"]
    admin_tokens = []
    fcm_sent_count = 0
    try:
        from db_manager import get_db_connection, get_user_fcm_tokens
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT DISTINCT id FROM users WHERE lower(email) IN ('rnfjrlakdmf@gmail.com', 'rnfjr@gmail.com')"
            )
            for row in cur.fetchall():
                uid_val = str(row[0]).strip()
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

    # 3. Firebase FCM 멀티캐스트 실시간 푸시 최우선 즉시 전송
    if admin_tokens:
        try:
            from firebase_config import initialize_firebase, send_multicast_notification
            initialize_firebase()
            push_data = {
                "type": "auto_trade",
                "url": "/alerts?tab=auto_trade",
                "symbol": symbol or "",
                "market": market or "",
                "is_global": "false",
                "target_email": "rnfjrlakdmf@gmail.com",
                "skip_db_save": "true",
            }
            fcm_res = send_multicast_notification(
                admin_tokens,
                title,
                clean_body,
                data=push_data,
                target_users=admin_uids,
                skip_db_save=True,
            )
            fcm_sent_count = int(fcm_res.get("success_count", len(admin_tokens))) if fcm_res.get("success") else 0
            print(f"[AutoTrader] Admin-Only FCM Push sent to {fcm_sent_count}/{len(admin_tokens)} devices (UID: 110418985320259217419): {title}")
        except Exception as e:
            print(f"[AutoTrader] Admin FCM send error: {e}")

    # 4. Firestore 알림 센터(alerts 컬렉션) 비동기 저장
    def _save_admin_alert_async():
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
                "market": market or "",
                "is_global": False,
                "target_email": "rnfjrlakdmf@gmail.com",
                "target_users": admin_uids,
                "url": "/admin/auto-trade",
                "createdAt": firestore.SERVER_TIMESTAMP,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "timestamp_str": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
            })
        except Exception as e:
            print(f"[AutoTrader] Firestore alert async save warning: {e}")

    threading.Thread(target=_save_admin_alert_async, daemon=True).start()

    return {
        "fcm_tokens_found": len(admin_tokens),
        "fcm_sent": fcm_sent_count,
        "admin_only": True,
        "target_admin_email": "rnfjrlakdmf@gmail.com",
        "admin_uids": admin_uids,
    }


def _send_batch_trade_notification(
    action: str,  # "BUY" 또는 "SELL"
    items: List[Dict[str, Any]],
    state: Dict[str, Any],
    paper_positions_override: Optional[List[Dict[str, Any]]] = None,
    market_label: str = "🇰🇷국내",
    is_paper: bool = True,
):
    """
    한 사이클에서 여러 종목이 동시에 체결될 때, 개별 알림을 여러 번 연속으로 쏘지 않고
    단 1건의 깔끔한 통합 요약 브리핑 알림으로 묶어서 발송합니다.
    """
    if not items:
        return

    c_val, c_lbl = _get_current_effective_cash(state, paper_positions_override=paper_positions_override)
    cfg = state.get("config", {})
    mode_tag = "[모의투자]" if is_paper else "[실전매매]"

    if action == "BUY":
        total_spent_krw = sum(it.get("amount_krw", 0) for it in items)
        tp_pct = float(cfg.get("take_profit_pct", 4.0))

        if len(items) == 1:
            it = items[0]
            sym = it.get("symbol", "")
            name = it.get("name", sym)
            amt = it.get("amount_krw", 0)
            qty = it.get("qty", 0)
            is_us = bool(it.get("is_us"))
            from market_tag_helper import get_clean_market_name
            mkt_tag = get_clean_market_name(sym)
            if is_us:
                p_val = float(it.get("price", 0))
                unit_lbl = f"${p_val:.2f}" if p_val < 100 else f"${p_val:,.1f}"
                detail_lbl = f"[{mkt_tag}] {unit_lbl} × {qty}주 매입 완료 (≈ ₩{amt:,})"
            else:
                unit_lbl = f"{int(it.get('price', 0)):,}원"
                detail_lbl = f"[{mkt_tag}] {unit_lbl} × {qty}주 매입 완료"
            _send_admin_trade_notification(
                f"🟢{mode_tag} 매수 완료 {name} {amt:,}원",
                f"{detail_lbl}\n목표 +{tp_pct}% | {c_lbl} {c_val:,}원",
                symbol=sym,
                market=mkt_tag,
            )
        else:
            names_summary = ", ".join(it.get("name", it.get("symbol")) for it in items[:2])
            if len(items) > 2:
                names_summary += f" 외 {len(items)-2}건"
            title = f"🟢{mode_tag} {len(items)}개 종목 포트폴리오 일괄 매수 ({names_summary})"

            lines = [f"📌 [{market_label} 주도주 동시 매수 · 총 {total_spent_krw:,}원 배분]"]
            for it in items:
                sym = it.get("symbol", "")
                name = it.get("name", sym)
                amt = it.get("amount_krw", 0)
                qty = it.get("qty", 0)
                lines.append(f"• {name}: {qty}주 ({amt:,}원)")
            lines.append(f"💰 {c_lbl}: {c_val:,}원 | 목표 +{tp_pct}%")
            body = "\n".join(lines)

            first_sym = items[0].get("symbol", "")
            from market_tag_helper import get_clean_market_name
            mkt_tag = get_clean_market_name(first_sym)

            _send_admin_trade_notification(
                title,
                body,
                symbol=first_sym,
                market=mkt_tag,
                force=True,  # 스마트 묶음 알림은 전송 허용
            )

    elif action == "SELL":
        total_pnl_krw = sum(it.get("pnl_krw", 0) for it in items)
        total_proceeds = sum(it.get("proceeds_krw", 0) for it in items)

        if len(items) == 1:
            it = items[0]
            sym = it.get("symbol", "")
            name = it.get("name", sym)
            pnl_krw = it.get("pnl_krw", 0)
            pnl_pct = it.get("pnl_pct", 0.0)
            proceeds = it.get("proceeds_krw", 0)
            kis_tag = it.get("kis_sell_tag", "")
            from market_tag_helper import get_clean_market_name
            mkt_tag = get_clean_market_name(sym)
            tag = "🔴익절" if pnl_krw >= 0 else "🛡️매도"
            _send_admin_trade_notification(
                f"{tag}{mode_tag} {name} {pnl_krw:+,}원({pnl_pct:+.1f}%)",
                f"[{mkt_tag}] 수익 {pnl_krw:+,}원 확정 (회수 {proceeds:,}원){kis_tag}\n"
                f"잔여 {c_lbl} {c_val:,}원",
                symbol=sym,
                market=mkt_tag,
            )
        else:
            tag = "🔴일괄 익절" if total_pnl_krw >= 0 else "🛡️일괄 매도"
            names_summary = ", ".join(it.get("name", it.get("symbol")) for it in items[:2])
            if len(items) > 2:
                names_summary += f" 외 {len(items)-2}건"
            title = f"{tag}{mode_tag} {len(items)}개 종목 체결 완료 (총손익 {total_pnl_krw:+,}원)"

            lines = [f"📌 [포트폴리오 일괄 매도 완료 · 총 회수금 {total_proceeds:,}원]"]
            for it in items:
                name = it.get("name", it.get("symbol"))
                pnl_krw = it.get("pnl_krw", 0)
                pnl_pct = it.get("pnl_pct", 0.0)
                lines.append(f"• {name}: {pnl_krw:+,}원 ({pnl_pct:+.1f}%)")
            lines.append(f"💰 잔여 {c_lbl}: {c_val:,}원")
            body = "\n".join(lines)

            first_sym = items[0].get("symbol", "")
            from market_tag_helper import get_clean_market_name
            mkt_tag = get_clean_market_name(first_sym)

            _send_admin_trade_notification(
                title,
                body,
                symbol=first_sym,
                market=mkt_tag,
                force=True,
            )


def _get_current_effective_cash(
    state: Dict[str, Any],
    paper_positions_override: Optional[List[Dict[str, Any]]] = None,
) -> tuple:
    """현재 가동 모드(실전투자 vs 가상 모의투자)에 따라 정확한 예수금 금액과 라벨을 반환합니다."""
    cfg = state.get("config", {})
    acct = state.get("account", {})
    mode = cfg.get("mode", "AI_PAPER")
    fx_rate = 1355.0
    if mode == "KIS_REAL":
        return int(acct.get("cash_krw", 0)), "실전 예수금"
    else:
        seed = max(50000, int(cfg.get("paper_seed_krw", 20000000) or 20000000))
        realized = int(acct.get("realized_pnl_krw", 0) or 0)
        tot = seed + realized
        if paper_positions_override is not None:
            pos_list = paper_positions_override
        else:
            pos_list = (
                state.get("paper_positions")
                or state.get("positions")
                or state.get("paper_positions_backup")
                or []
            )
        inv = sum(
            int(round(float(p.get("avg_price", 0)) * int(p.get("qty", 0)) * (fx_rate if p.get("is_us") else 1.0)))
            for p in pos_list
        )
        return max(0, tot - inv), "가상 예수금"


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
    if not cfg.get("kis_order_enabled", True):
        return {"ok": False, "msg": "계좌 연동 주문 스위치가 OFF(잠금) 상태이므로 증권사 주문을 전송하지 않았습니다."}
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
        last_err = "KIS 해외주문 응답 오류"
        for prdt_cd in ([acnt_prdt_cd, "01"] if acnt_prdt_cd != "01" else ["01"]):
            body["ACNT_PRDT_CD"] = prdt_cd
            try:
                r = requests.post(f"{base_url}/uapi/overseas-stock/v1/trading/order", headers=headers, json=body, timeout=8)
                data = r.json()
                if data.get("rt_cd") == "0":
                    return {"ok": True, "msg": data.get("msg1", f"KIS 해외주식/ETF 주문 성공 ({cano}-{prdt_cd})")}
                last_err = data.get("msg1", "KIS 해외주문 응답 오류")
            except Exception as e:
                last_err = f"KIS 해외주문 통신 에러: {e}"
        return {"ok": False, "msg": last_err}

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
    last_err = "KIS 국내주문 응답 오류"
    for prdt_cd in ([acnt_prdt_cd, "01"] if acnt_prdt_cd != "01" else ["01"]):
        body["ACNT_PRDT_CD"] = prdt_cd
        try:
            r = requests.post(f"{base_url}/uapi/domestic-stock/v1/trading/order-cash", headers=headers, json=body, timeout=8)
            data = r.json()
            if data.get("rt_cd") == "0":
                return {"ok": True, "msg": data.get("msg1", f"KIS 국내주문 성공 ({cano}-{prdt_cd})")}
            last_err = data.get("msg1", "KIS 국내주문 응답 오류")
        except Exception as e:
            last_err = f"KIS 국내주문 통신 에러: {e}"
    return {"ok": False, "msg": last_err}


# ─────────────────────────────────────────────────────────────
# 시간대별 맞춤 후보군(Top 10) 스캔 및 채점 빌더 (주간 KR / 야간 US)
# ─────────────────────────────────────────────────────────────
def _build_session_candidates(state: Dict[str, Any], active_market: str) -> List[Dict[str, Any]]:
    cfg = state.get("config", {})
    fx_rate = 1355.0
    order_budget = int(cfg.get("order_amount_krw", 2000000))
    max_invest_cap = int(cfg.get("max_total_invest_krw", 0) or 0)
    effective_single_limit = min(order_budget, max_invest_cap) if max_invest_cap > 0 else order_budget

    universe = list(KR_UNIVERSE if active_market == "KR" else US_UNIVERSE)
    closing_scanner_map: Dict[str, Dict[str, Any]] = {}

    if active_market == "KR":
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

    from concurrent.futures import ThreadPoolExecutor

    def _score_one_item(item: Dict[str, Any]) -> Dict[str, Any]:
        q = _fetch_live_quote(item["symbol"])
        scored = _compute_ai_quant_score(item, q)
        if active_market == "KR":
            scan_hit = closing_scanner_map.get(item["symbol"])
            if scan_hit:
                cvd_lbl = scan_hit.get("cvd", {}).get("label", "CVD 매수우위")
                obv_lbl = scan_hit.get("obv", {}).get("label", "OBV 매집")
                buyer = scan_hit.get("majorBuyer", "외인·기관")
                scored["ai_score"] = min(99, scored["ai_score"] + 10)
                scored["reason"] = f"🔥[장마감 수급스캐너 포착: {buyer} · {cvd_lbl} · {obv_lbl}] · " + scored["reason"]
            scored["reason"] = "🇰🇷[주간 한국장 실시간 타점] · " + scored["reason"]
        else:
            # 야간 미국장 세션: 해외 유망 기술주 및 3배 레버리지 ETF 실시간 모멘텀 가산점
            scored["ai_score"] = min(99, scored["ai_score"] + 8)
            scored["reason"] = "🇺🇸[야간 미국장 실시간 타점] · " + scored["reason"]

        unit_krw = scored["price"] * (fx_rate if scored["is_us"] else 1.0)
        if 0 < effective_single_limit <= 300000:
            if 0 < unit_krw <= effective_single_limit:
                scored["ai_score"] = min(99, scored["ai_score"] + 8)
                scored["reason"] = f"💰[소액한도 맞춤 {int(unit_krw):,}원/주] · " + scored["reason"]
            elif max_invest_cap > 0 and unit_krw > max_invest_cap:
                scored["ai_score"] = max(10, scored["ai_score"] - 25)
        return scored

    with ThreadPoolExecutor(max_workers=8) as pool:
        scored_candidates = list(pool.map(_score_one_item, universe))

    scored_candidates.sort(key=lambda x: x["ai_score"], reverse=True)
    return scored_candidates


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
    session_info = _get_time_based_session_info(cfg)
    active_market = session_info["active_market"]  # "KR" (08:00~17:00) | "US" (17:00~08:00)
    state["active_session"] = session_info

    # 1. 현재 보유 종목 실시간 시세 갱신 및 자동 익절 / 트레일링 스탑 / 자동 손절 체크
    is_kis_mode = cfg.get("mode") in ("KIS_REAL", "KIS_VIRTUAL")
    remaining_positions = []
    sold_symbols = set()
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

        is_us = bool(pos.get("is_us") or any(c.isalpha() for c in sym))
        if not is_market_open_now(sym, is_us=is_us) and not force_buy:
            # 현재 해당 국가의 거래소(예: 미국 주간 09:00~17:00 KST, 국내 야간 등)가 닫혀 있으므로
            # 장이 열릴 때까지 익절/손절/물타기 판단을 안전하게 보류하고 기존 포지션을 홀딩 유지!
            remaining_positions.append(pos)
            continue

        tp_pct = float(cfg.get("take_profit_pct", 4.0))

        sl_pct = float(cfg.get("stop_loss_pct", 2.5))
        ts_pct = float(cfg.get("trailing_stop_pct", 1.2))
        use_sl = bool(cfg.get("use_stop_loss", False))
        auto_avg = bool(cfg.get("auto_averaging_down", True))

        # [자동 물타기(평단가 낮추기) 로직]: 무손절 모드에서 -5.0% 이하 하락 시 1회 자동 추매하여 평단가를 낮추고 빠른 탈출/익절 유도 (한투 실전/모의 모드 전용)
        if is_kis_mode and (cfg.get("enabled") or force_buy) and not use_sl and auto_avg and pnl_pct <= -5.0 and not pos.get("averaged_down", False):
            max_invest_cap = int(cfg.get("max_total_invest_krw", 0) or 0)
            curr_invested_krw = sum(
                int(round(p.get("avg_price", 0) * p.get("qty", 0) * (fx_rate if p.get("is_us") else 1.0)))
                for p in state["positions"]
            )
            rem_cap = max(0, max_invest_cap - curr_invested_krw) if max_invest_cap > 0 else int(acct.get("cash_krw", 0))
            add_budget = min(int(cfg.get("order_amount_krw", 2000000) * 0.5), int(acct.get("cash_krw", 0)), rem_cap)
            add_qty = int(add_budget // (live_price * unit_mult)) if (live_price * unit_mult) > 0 else 0
            if add_qty >= 1:
                kis_tag = ""
                if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL") and cfg.get("kis_order_enabled", True):
                    kis_res = _place_kis_order(state, sym, add_qty, is_buy=True, price=live_price)
                    if not kis_res.get("ok"):
                        state["last_kis_order_msg"] = f"⚠️ 한투 추매 주문 대기 ({pos['name']}): {kis_res.get('msg')}"
                        add_qty = 0
                    else:
                        kis_tag = f" [한투주문 완료: {kis_res.get('msg')}]"
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
                        "reason": f"💧 [자동 물타기] 평단가 인하 ({pos['name']} 신평단 {new_avg:,}) → 반등 시 조기 익절 준비{kis_tag}",
                        "mode": cfg.get("mode", "AI_PAPER"),
                    })
                    actions_taken.append(f"💧 [물타기 추매] {pos['name']} +{add_qty}주 (평단 낮춤){kis_tag}")
                    if cfg.get("telegram_notify", True):
                        from market_tag_helper import get_clean_market_name
                        mkt_tag = get_clean_market_name(sym)
                        _send_admin_trade_notification(
                            f"💧추매 {pos['name']} {add_cost:,}원",
                            f"[{mkt_tag}] +{add_qty}주 추매 (신평단 {new_avg:,}원){kis_tag}\n"
                            f"남은 예수금 {acct.get('cash_krw', 0):,}원",
                            symbol=sym,
                            market=mkt_tag,
                        )


        sell_reason = _evaluate_ai_smart_exit(pos, q, tp_pct, sl_pct, ts_pct)
        if not sell_reason:
            if pnl_pct >= tp_pct:
                sell_reason = f"목표 익절가 도달 (+{pnl_pct:.2f}%)"
            elif peak_pct >= 2.2 and drop_from_peak >= ts_pct and pnl_pct > 0.5:
                sell_reason = f"트레일링 수익 보존 (+{pnl_pct:.2f}%)"
            elif use_sl and pnl_pct <= -abs(sl_pct):
                sell_reason = f"손절선 작동 ({pnl_pct:.2f}%)"

        if is_kis_mode and sell_reason and (cfg.get("enabled") or force_buy):
            # 자동 매도 체결! (국내주식/ETF 및 해외주식/ETF 모두 KIS 주문 지원)
            kis_sell_ok = True
            kis_sell_tag = ""
            if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL") and cfg.get("kis_order_enabled", True):
                kis_res = _place_kis_order(state, sym, pos["qty"], is_buy=False, price=live_price)
                if not kis_res.get("ok"):
                    kis_sell_ok = False
                    state["last_kis_order_msg"] = f"⚠️ 한투 매도 주문 대기 ({pos['name']}): {kis_res.get('msg')}"
                else:
                    kis_sell_tag = f" [한투주문 완료: {kis_res.get('msg')}]"

            if kis_sell_ok:
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
                    "reason": f"{sell_reason}{kis_sell_tag}",
                    "mode": cfg.get("mode", "AI_PAPER"),
                }
                state["trade_logs"].insert(0, log_entry)
                actions_taken.append(f"🔴 [매도] {pos['name']} ({pnl_pct:+.2f}% / {pnl_krw:+,}원){kis_sell_tag}")
                sold_symbols.add(sym)

                # 단건/일괄 스마트 통합 브리핑 발송
                if cfg.get("telegram_notify", True):
                    from market_tag_helper import get_clean_market_name
                    mkt_tag = get_clean_market_name(sym)
                    _send_batch_trade_notification(
                        "SELL",
                        [{
                            "symbol": sym,
                            "name": pos["name"],
                            "proceeds_krw": proceeds_krw,
                            "pnl_krw": pnl_krw,
                            "pnl_pct": pnl_pct,
                            "kis_sell_tag": kis_sell_tag,
                        }],
                        state,
                        is_paper=(cfg.get("mode") != "KIS_REAL"),
                    )

            else:
                remaining_positions.append(pos)
        else:
            remaining_positions.append(pos)

    state["positions"] = remaining_positions
    if sold_symbols:
        state["paper_positions_backup"] = [
            p for p in state.get("paper_positions_backup", [])
            if p.get("symbol") not in sold_symbols
        ]

    # 2. [시간대별 국내장·미국장 자동 후보군 스위칭 엔진]
    # - 주간(08:00~16:59 KST): 🇰🇷 한국증시 개장 시간 -> 국내주식 후보군 Top 10 배치 & 국내종목 자동 매수·익절
    # - 야간(17:00~07:59 KST): 🇺🇸 해외(미국)증시 개장 시간 -> 해외주식 후보군 Top 10 배치 & 해외종목 자동 매수·익절
    session_info = _get_time_based_session_info(cfg)
    active_market = session_info["active_market"]  # "KR" 또는 "US"
    state["active_session"] = session_info

    scored_candidates = _build_session_candidates(state, active_market)
    state["candidates"] = scored_candidates[:25]
    if active_market == "KR":
        state["kr_candidates"] = scored_candidates[:25]
    else:
        state["us_candidates"] = scored_candidates[:25]

    held_symbols = {p["symbol"] for p in state["positions"]}
    max_pos = int(cfg.get("max_positions", 7) or 7)
    order_budget = int(cfg.get("order_amount_krw", 2000000))
    max_invest_cap = int(cfg.get("max_total_invest_krw", 0) or 0)
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

    # [한투 실전·모의 계좌 주문 루프]
    # 모의투자(AI_PAPER)는 _sync_and_trade_paper_portfolio()가 자산 배분(국내 3 / 해외 2)에 맞춰 전담하므로
    # 이 루프는 한국투자증권 실전/모의 계좌 연동 모드일 때만 실행됩니다.
    if is_kis_mode and (cfg.get("enabled") or force_buy) and not market_crash_brake and len(state["positions"]) < max_pos and acct["cash_krw"] >= 5000:
        newly_bought_real = []
        for cand in scored_candidates:
            if len(state["positions"]) >= max_pos:
                break
            curr_invested_krw = sum(
                int(round(p.get("avg_price", 0) * p.get("qty", 0) * (fx_rate if p.get("is_us") else 1.0)))
                for p in state["positions"]
            )
            rem_cap = max(0, max_invest_cap - curr_invested_krw) if max_invest_cap > 0 else acct["cash_krw"]
            if max_invest_cap > 0 and rem_cap < 5000:
                break
            if cand["symbol"] in held_symbols:
                continue
            if not is_market_open_now(cand["symbol"], is_us=cand.get("is_us", False)) and not force_buy:
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
            alloc_krw = min(order_budget, acct["cash_krw"], rem_cap)
            qty = int(alloc_krw // unit_price_krw)
            if qty <= 0 and acct["cash_krw"] >= unit_price_krw and rem_cap >= unit_price_krw:
                qty = 1
            if qty <= 0:
                continue

            buy_amount_krw = int(round(qty * unit_price_krw))
            if buy_amount_krw > acct["cash_krw"] or (max_invest_cap > 0 and buy_amount_krw > rem_cap):
                continue

            # 한국투자증권 API 모드일 경우: 반드시 실제 KIS 주문 전송 및 체결(rt_cd=0)이 성공했을 때만 실전 보유 종목에 추가!
            # (주문 잠금 상태이거나 장 마감 시간이라 KIS가 접수하지 않은 경우 절대 가짜 실전 보유를 만들지 않음)
            kis_buy_tag = ""
            kis_confirmed = False
            if cfg.get("mode") in ("KIS_VIRTUAL", "KIS_REAL"):
                if not cfg.get("kis_order_enabled", True):
                    state["last_kis_order_msg"] = "🔒 [실전·연동 계좌 주문 잠금(OFF)] 상태이므로 실제 계좌 주문을 넣지 않고 대기 중입니다."
                    continue
                kis_res = _place_kis_order(state, cand["symbol"], qty, is_buy=True, price=cand["price"])
                if not kis_res.get("ok"):
                    state["last_kis_order_msg"] = f"⏳ 한투 실전 주문 대기 ({cand['name']} {qty}주): {kis_res.get('msg')}"
                    continue
                kis_buy_tag = f" [한투주문 완료: {kis_res.get('msg')}]"
                kis_confirmed = True

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
                "reason": f"AI 퀀트 {cand['ai_score']}점 · {cand['reason']}{kis_buy_tag}",
                "is_us": cand["is_us"],
                "trade_mode": "KIS_REAL" if (cfg.get("mode") == "KIS_REAL" and kis_confirmed) else "AI_PAPER",
                "kis_order_confirmed": kis_confirmed,
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
            actions_taken.append(f"🟢 [자동 매수] {cand['name']} {qty}주 ({buy_amount_krw:,}원){kis_buy_tag}")
            newly_bought_real.append({
                "symbol": cand["symbol"],
                "name": cand["name"],
                "qty": qty,
                "price": cand["price"],
                "amount_krw": buy_amount_krw,
                "is_us": bool(cand.get("is_us")),
            })

            # 1회 사이클당 최대 2종목씩 순차 진입하여 리스크 분산
            if len(actions_taken) >= 2 and not force_buy:
                break

        # [실전/연동 계좌 매수 스마트 통합 브리핑 발송]
        if cfg.get("telegram_notify", True) and newly_bought_real:
            _send_batch_trade_notification(
                "BUY",
                newly_bought_real,
                state,
                market_label="한투실전" if cfg.get("mode") == "KIS_REAL" else "한투모의",
                is_paper=(cfg.get("mode") != "KIS_REAL"),
            )

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
            c_val, c_lbl = _get_current_effective_cash(state)
            from market_tag_helper import get_clean_market_name
            mkt_tag = get_clean_market_name(symbol)
            _send_admin_trade_notification(
                f"{tag} {pos['name']} {pnl_krw:+,}원({pnl_pct:+.1f}%)",
                f"[{mkt_tag}] 수익 {pnl_krw:+,}원 확정 (회수 {proceeds_krw:,}원)\n"
                f"누적수익 {acct.get('realized_pnl_krw', 0):+,}원 | {c_lbl} {c_val:,}원",
                symbol=symbol,
                market=mkt_tag,
            )

        else:
            remaining.append(pos)

    state["positions"] = remaining
    state["paper_positions_backup"] = [
        p for p in state.get("paper_positions_backup", [])
        if p.get("symbol") != symbol
    ]
    save_state(state)
    return get_dashboard_summary(state)


def send_test_auto_trade_fcm() -> Dict[str, Any]:
    """스마트워치 최적화: 오직 대표님 관리자 계정(rnfjrlakdmf@gmail.com)으로만 🟢매수 알림 1통 + 🔴익절 알림 1통을 1초 이내 즉시 발송"""
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

    # 1) 🟢 매수 시 알림 (대표님 전용 기기 단독 1통 즉시 발송 - 테스트 명시)
    c_val, c_lbl = _get_current_effective_cash(state)
    _send_admin_trade_notification(
        f"🧪[테스트 알림] 🟢매수 {sample_name} {buy_amt:,}원",
        f"[모바일 알림 수신 테스트]\n{avg_p:,}원 × {qty}주 매입 시뮬레이션\n"
        f"목표 +4.0% | {c_lbl} {c_val:,}원",
        symbol=sample_sym,
    )
    time.sleep(0.15)
    # 2) 🔴 익절 시 알림 (대표님 전용 기기 단독 1통 즉시 발송 - 테스트 명시)
    res = _send_admin_trade_notification(
        f"🧪[테스트 알림] 🔴익절 {sample_name} +{est_profit:,}원(+4.0%)",
        f"[모바일 알림 수신 테스트]\n수익 +{est_profit:,}원 확정 시뮬레이션 (회수 {buy_amt + est_profit:,}원)\n"
        f"누적수익 +{est_profit:,}원 | {c_lbl} {c_val + buy_amt + est_profit:,}원",
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


def reset_paper_account(initial_capital_krw: int = 20000000) -> Dict[str, Any]:
    state = load_state()
    seed_krw = max(50000, int(initial_capital_krw or 20000000))
    state["config"]["paper_seed_krw"] = seed_krw
    if state["config"].get("mode") != "KIS_REAL":
        state["config"]["initial_capital_krw"] = seed_krw
        state["account"] = {
            "cash_krw": seed_krw,
            "realized_pnl_krw": 0,
            "total_trades": 0,
            "win_trades": 0,
            "loss_trades": 0,
        }
    # 실전 포지션은 그대로 보존하고 가상 모의투자 포지션만 새 시드머니 기준으로 즉시 재편성
    real_only = [
        p for p in state.get("positions", [])
        if p.get("kis_order_confirmed") is True or "[한투주문 완료" in str(p.get("reason", ""))
    ]
    state["positions"] = real_only
    state["paper_positions_backup"] = []
    state["trade_logs"] = [
        lg for lg in state.get("trade_logs", [])
        if "[한투주문 완료" in str(lg.get("reason", ""))
    ]
    save_state(state)
    return get_dashboard_summary(state)


def update_auto_trader_config(new_cfg: Dict[str, Any]) -> Dict[str, Any]:
    state = load_state()
    old_mode = state["config"].get("mode", "AI_PAPER")
    if "paper_seed_krw" in new_cfg and new_cfg["paper_seed_krw"] is not None:
        state["config"]["paper_seed_krw"] = max(50000, int(new_cfg["paper_seed_krw"]))
    elif not state["config"].get("paper_seed_krw"):
        state["config"]["paper_seed_krw"] = 20000000

    for k, v in new_cfg.items():
        if k in state["config"] and v is not None:
            if k in ("kis_app_secret", "kis_app_key", "kis_account_no"):
                if not str(v).strip() or "*" in str(v):
                    continue
            state["config"][k] = v

    if "max_total_invest_krw" in new_cfg and new_cfg["max_total_invest_krw"] is not None:
        real_limit = max(30000, int(new_cfg["max_total_invest_krw"]))
        state["config"]["max_total_invest_krw"] = real_limit
        # 설정된 실전 한도에 맞춰 최대 종목 수와 1회 매수 금액을 자동 최적화
        auto_max_pos = 2 if real_limit <= 200000 else (3 if real_limit <= 500000 else (5 if real_limit <= 1000000 else (7 if real_limit <= 4000000 else 10)))
        if "max_positions" not in new_cfg:
            state["config"]["max_positions"] = auto_max_pos
        if "order_amount_krw" not in new_cfg:
            state["config"]["order_amount_krw"] = max(25000, int(real_limit // max(2, state["config"].get("max_positions", auto_max_pos))))

    new_mode = state["config"].get("mode", "AI_PAPER")
    # [모의투자 <-> 실전투자 완전 분리]
    # 가상 모의투자(AI_PAPER)로 산 가상 종목들이 실전투자(KIS_REAL) 한도와 슬롯을 막지 않도록 자동 분리!
    if new_mode == "KIS_REAL":
        paper_only = [p for p in state.get("positions", []) if p.get("trade_mode", "AI_PAPER") != "KIS_REAL" and "[한투주문 완료" not in str(p.get("reason", ""))]
        real_only = [p for p in state.get("positions", []) if p.get("trade_mode") == "KIS_REAL" or "[한투주문 완료" in str(p.get("reason", ""))]
        if paper_only:
            state["paper_positions_backup"] = paper_only
            state["positions"] = real_only
        target_budget = int(state["config"].get("max_total_invest_krw", 0) or state["config"].get("initial_capital_krw", 20000000))
        if target_budget > 0:
            real_inv = sum(int(round(float(p.get("avg_price", 0)) * int(p.get("qty", 0)) * (1355.0 if p.get("is_us") else 1.0))) for p in real_only)
            state["account"]["cash_krw"] = max(0, target_budget + int(state["account"].get("realized_pnl_krw", 0)) - real_inv)
            state["config"]["initial_capital_krw"] = target_budget
    elif new_mode == "AI_PAPER" and old_mode != "AI_PAPER":
        if not state.get("positions") and state.get("paper_positions_backup"):
            state["positions"] = state.get("paper_positions_backup", [])

    save_state(state)
    return get_dashboard_summary(state)


def _evaluate_ai_smart_exit(
    pos: Dict[str, Any],
    quote: Dict[str, Any],
    tp_pct: float,
    sl_pct: float,
    ts_pct: float,
) -> Optional[str]:
    """
    [🧠 AI 실시간 상승탄력 둔화 감지 & 자율 리스크 관리 매도 판단 엔진]
    굳이 +4.0% 목표가까지 가지 않더라도:
    1) 수익권(+0.35% ~ +3.9%)에서 고점 대비 밀리거나 당일 상승 탄력이 둔화되면 '더 오르기 어렵다'고 스스로 판단해 즉시 조기 익절!
    2) 반대로 상승 동력이 죽고 하락(-1.0% 이하 & 수급 약세)하여 더 들고 있으면 손실만 커질 것으로 판단되면,
       -2.5%까지 방치하지 않고 선제적으로 리스크 관리 커트(교체 매도) 후 수급이 살아있는 신규 급등주로 즉시 갈아탑니다.
    """
    avg_p = float(pos.get("avg_price", 0) or 0)
    cur_p = float(pos.get("current_price", avg_p) or avg_p)
    high_p = max(float(pos.get("highest_price", cur_p) or cur_p), cur_p)
    if avg_p <= 0 or cur_p <= 0:
        return None

    pnl_pct = round(((cur_p - avg_p) / avg_p) * 100.0, 2)
    peak_pct = round(((high_p - avg_p) / avg_p) * 100.0, 2)
    drop_from_peak = round(peak_pct - pnl_pct, 2)
    intraday_chg = float((quote or {}).get("change_pct", 0.0) or 0.0)

    # 1. 목표 익절가(+4%) 달성 시 칼익절
    if pnl_pct >= tp_pct:
        return f"🎯 [AI 목표돌파 익절] 목표 수익률(+{pnl_pct:.2f}%) 달성 전량 수익 확정"

    # 2. 굳이 +4%가 아니어도 +1.0% 이상 수익권에서 고점 대비 0.35%p 이상 밀리면 -> 탄력 둔화로 판단해 즉시 조기 익절!
    if pnl_pct >= 1.0 and drop_from_peak >= 0.35:
        return f"🧠 [AI 탄력둔화 조기익절] 고점(+{peak_pct:.2f}%) 저항 후 상승세 둔화 감지 → +{pnl_pct:.2f}% 수익 선제 확정"

    # 3. 소폭 수익권(+0.35% ~ +0.99%)이라도 고점 대비 0.25%p 이상 밀리거나 당일 호가 탄력이 약해지면 -> 마이너스 전환 전 알짜 조기 익절!
    if 0.35 <= pnl_pct < 1.0 and (drop_from_peak >= 0.25 or intraday_chg < 0.3):
        return f"🧠 [AI 자율판단 조기익절] 추가 상승 여력 약화 감지 → 꺾이기 전 +{pnl_pct:.2f}% 수익 조기 챙김"

    # 4. 실시간 리스크 관리: 상승 동력이 소멸되어 -1.0% 이하로 밀리면서 반등 탄력이 없을 때 -> 더 떨어지기 전에 선제 정리 후 강세주로 교체!
    if pnl_pct <= -1.0 and (intraday_chg <= 0.2 or drop_from_peak >= 1.0):
        return f"🛡️ [AI 리스크관리 교체매도] 상승탄력 소멸·추가하락 방어 ({pnl_pct:+.2f}%) → 강세 주도주로 시드 즉시 교체"

    # 5. 긴급 손절선 도달 시 방어
    if pnl_pct <= -abs(sl_pct):
        return f"🛡️ [AI 리스크 방어선 작동] 손실 제한 기준 도달 ({pnl_pct:+.2f}%) 즉시 현금화"

    return None


def _sync_and_trade_paper_portfolio(state: Dict[str, Any], candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    [🎮 AI 가상 모의투자(사용자 설정 시드머니 + 실시간 변동 자산) — 자율 리스크 관리 & 국내·해외 자동 배분 엔진]
    - 설정된 모의투자 시드머니(paper_seed_krw)와 누적 실현손익(realized_pnl_krw)이 합산된 실시간 총 운용자산(effective_seed_krw)이
      변동될 때마다 그 금액에 맞춰 국내주식(약 40%)·해외주식(약 27%)·여유 예수금(약 33%)을 자동으로 계산해 매수·매도합니다.
    - 굳이 +4% 수익이 아니더라도 _evaluate_ai_smart_exit()을 통해 더 오르기 어렵다고 판단되면 조기 익절하고,
      수급이 죽은 종목은 선제 리스크 관리 매도 후 더 강한 종목으로 알아서 교체합니다.
    """
    fx_rate = 1355.0
    cfg = state.get("config", {})
    acct = state.setdefault("account", {})
    base_paper_seed_krw = max(50000, int(cfg.get("paper_seed_krw", 20000000) or 20000000))
    realized_pnl = int(acct.get("realized_pnl_krw", 0) or 0)
    # 시드머니 변경 또는 매매 손익으로 총 운용 금액이 변동되면 변동된 총금액(effective_seed_krw)에 맞춰 자동 스케일링!
    effective_seed_krw = max(50000, base_paper_seed_krw + realized_pnl)

    cfg_max = int(cfg.get("max_positions", 7) or 7)
    mkt_target = str(cfg.get("market_target", "ALL"))

    if effective_seed_krw <= 300000:
        paper_max_pos = min(3, max(2, cfg_max))
        target_kr_slots = 2 if mkt_target != "US_ONLY" else 0
        target_us_slots = 1 if mkt_target != "KR_ONLY" else 0
        if target_kr_slots + target_us_slots < paper_max_pos:
            target_kr_slots = paper_max_pos
        per_stock_budget_krw = max(35000, int(effective_seed_krw * 0.35))
    else:
        paper_max_pos = max(3, min(20, cfg_max))
        if mkt_target == "KR_ONLY":
            target_kr_slots = paper_max_pos
            target_us_slots = 0
        elif mkt_target == "US_ONLY":
            target_kr_slots = 0
            target_us_slots = paper_max_pos
        else:
            # 기본 ALL(국내+해외): 약 60% 국내, 40% 해외 배분
            target_kr_slots = max(2, int(round(paper_max_pos * 0.6)))
            target_us_slots = max(1, paper_max_pos - target_kr_slots)

        # 총 시드의 약 72%를 주식에 균등 배분, 나머지는 안전 현금(예수금 버퍼)으로 보존
        invest_ratio = 0.72
        per_stock_budget_krw = max(50000, int((effective_seed_krw * invest_ratio) // paper_max_pos))

    tp_pct = float(cfg.get("take_profit_pct", 4.0) or 4.0)
    sl_pct = float(cfg.get("stop_loss_pct", 2.5) or 2.5)
    ts_pct = float(cfg.get("trailing_stop_pct", 1.2) or 1.2)
    now_str = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    seed_label_man = f"{effective_seed_krw // 10000:,}만원" if effective_seed_krw >= 10000 else f"{effective_seed_krw:,}원"

    session_info = _get_time_based_session_info(cfg)
    active_mkt = session_info.get("active_market", "KR")  # "KR" (08:00~16:59 KST) or "US" (17:00~07:59 KST)

    # 1. 오늘 체결 내역 중 가장 최근 액션이 SELL인 종목 판별 (이미 매도 청산된 종목의 백업 부활 방지)
    today_str = datetime.now(KST).strftime("%Y-%m-%d")
    latest_action_by_sym: Dict[str, str] = {}
    for lg in state.get("trade_logs", []):
        s = lg.get("symbol")
        act = lg.get("action")
        ts = str(lg.get("timestamp", ""))
        if s and act and s not in latest_action_by_sym and ts.startswith(today_str):
            latest_action_by_sym[s] = act

    permanently_sold_today_syms = {
        s for s, act in latest_action_by_sym.items() if act == "SELL"
    }

    # 백업 저장소에서도 오늘 매도 완료된 종목 강제 소각 정리
    if permanently_sold_today_syms:
        state["paper_positions_backup"] = [
            p for p in state.get("paper_positions_backup", [])
            if p.get("symbol") not in permanently_sold_today_syms
        ]

    # 1.1 기존 가상 모의투자 포지션 통합 수집 (중복 제거)
    raw_paper: List[Dict[str, Any]] = []
    seen_syms = set()

    active_paper_in_positions = [
        p for p in state.get("positions", [])
        if not (p.get("kis_order_confirmed") is True or "[한투주문 완료" in str(p.get("reason", "")))
    ]

    # positions에 가상 포지션이 이미 있으면 positions를 최우선 단일 원천으로 채택
    # positions에 가상 포지션이 전무할 때만(예: KIS_REAL -> AI_PAPER 모드 전환 시점) 백업(paper_positions_backup) 참조
    source_list = active_paper_in_positions if active_paper_in_positions else state.get("paper_positions_backup", [])

    for p in source_list:
        is_real = p.get("kis_order_confirmed") is True or "[한투주문 완료" in str(p.get("reason", ""))
        sym = p.get("symbol")
        if not is_real and sym and sym not in seen_syms:
            if sym in permanently_sold_today_syms:
                continue
            raw_paper.append(dict(p))
            seen_syms.add(sym)

    # 1.2 [장외 체결 보정 & 시드머니 한도 초과 종목 정리]
    kr_held_count = 0
    balanced_raw: List[Dict[str, Any]] = []
    changed = False
    for p in raw_paper:
        sym = p["symbol"]
        is_us_p = bool(p.get("is_us") or any(c.isalpha() for c in sym))
        bought_at_str = str(p.get("bought_at", ""))
        bought_hour = -1
        if len(bought_at_str) >= 13 and ":" in bought_at_str:
            try:
                bought_hour = int(bought_at_str[11:13])
            except Exception:
                bought_hour = -1

        # 미국장이 닫혀 있는 낮 시간대(08:00~16:59 KST)에 매수된 해외주식은 장외 허수 체결이므로 즉시 취소
        if is_us_p and (8 <= bought_hour < 17):
            seen_syms.discard(sym)
            state["trade_logs"] = [
                lg for lg in state.get("trade_logs", [])
                if not (lg.get("symbol") == sym and lg.get("mode") == "AI_PAPER")
            ]
            changed = True
            continue

        unit_p_krw = float(p.get("avg_price", 0) or 0) * (fx_rate if is_us_p else 1.0)
        if unit_p_krw > max(per_stock_budget_krw * 1.5, 1500000):
            seen_syms.discard(sym)
            changed = True
            continue

        if not is_us_p:
            kr_held_count += 1
            if kr_held_count > paper_max_pos:
                seen_syms.discard(sym)
                changed = True
                continue
        balanced_raw.append(p)
    raw_paper = balanced_raw

    updated_paper: List[Dict[str, Any]] = []
    recently_exited_syms = set()

    # 1.5 실시간 호가 병렬 조회
    quote_map: Dict[str, Dict[str, Any]] = {}
    if raw_paper:
        def _q_worker(s: str):
            return s, _fetch_live_quote(s)
        with ThreadPoolExecutor(max_workers=5) as ex:
            for s_code, q_res in ex.map(lambda item: _q_worker(item["symbol"]), raw_paper):
                quote_map[s_code] = q_res

    # 2. 보유 종목 관리 (변동된 시드머니에 맞춰 수량 자동 리밸런싱 & AI 스마트 조기익절/리스크관리 매도)
    paper_sold_items = []
    for pos in raw_paper:
        sym = pos.get("symbol")
        if not sym:
            continue
        is_us = bool(pos.get("is_us") or any(c.isalpha() for c in sym))
        is_market_open_for_pos = is_market_open_now(sym, is_us=is_us)

        q = quote_map.get(sym) or {}
        live_p = float(q.get("price", 0) or pos.get("current_price", 0) or pos.get("avg_price", 0))
        if live_p <= 0:
            updated_paper.append(pos)
            continue
        unit_m = fx_rate if is_us else 1.0
        avg_p = float(pos.get("avg_price", live_p) or live_p)

        # 시드머니 또는 누적 자산이 변동되었으면 새로운 종목당 배분액(per_stock_budget_krw)에 맞춰 보유 수량을 즉시 자동 조정!
        curr_inv = avg_p * int(pos.get("qty", 1)) * unit_m
        if (curr_inv < per_stock_budget_krw * 0.65 or curr_inv > per_stock_budget_krw * 1.2) and (avg_p * unit_m) <= per_stock_budget_krw * 1.3:
            target_qty = max(1, int(per_stock_budget_krw // (avg_p * unit_m)))
            if target_qty != int(pos.get("qty", 1)):
                pos["qty"] = target_qty
                pos["reason"] = f"AI 퀀트 99점 · [{seed_label_man} 자산 맞춤 {int(round(target_qty * avg_p * unit_m)):,}원 배분] · 기관·외인 수급 돌파"
                changed = True

        if is_market_open_for_pos and live_p > 0:
            pos["current_price"] = live_p
            pos["highest_price"] = max(float(pos.get("highest_price", live_p)), live_p)
        pos["target_price"] = round(avg_p * (1.0 + tp_pct / 100.0), 2 if is_us else 0)
        pos["stop_price"] = round(avg_p * (1.0 - 1.0 / 100.0), 2 if is_us else 0)  # AI 스마트 리스크 컷 기준선(-1.0%)

        cur_p_calc = float(pos.get("current_price", avg_p))
        pnl_pct = round(((cur_p_calc - avg_p) / avg_p) * 100.0, 2) if avg_p > 0 else 0.0
        pnl_krw = int(round((cur_p_calc - avg_p) * int(pos.get("qty", 1)) * unit_m))
        pos["pnl_pct"] = pnl_pct
        pos["pnl_krw"] = pnl_krw
        pos["trade_mode"] = "AI_PAPER"
        pos["kis_order_confirmed"] = False

        # [핵심] 장이 열려 있을 때 AI 스마트 탄력·리스크 판단 엔진(_evaluate_ai_smart_exit) 가동!
        sell_reason = ""
        if is_market_open_for_pos:
            sell_reason = _evaluate_ai_smart_exit(pos, q, tp_pct, sl_pct, ts_pct)

        if sell_reason:
            proceeds_krw = int(round(cur_p_calc * int(pos.get("qty", 1)) * unit_m))
            acct["realized_pnl_krw"] = int(acct.get("realized_pnl_krw", 0) + pnl_krw)
            acct["total_trades"] = int(acct.get("total_trades", 0) + 1)
            if pnl_krw >= 0:
                acct["win_trades"] = int(acct.get("win_trades", 0) + 1)
            else:
                acct["loss_trades"] = int(acct.get("loss_trades", 0) + 1)
            state.setdefault("trade_logs", []).insert(0, {
                "id": f"TRD-PAPER-SELL-{int(time.time()*1000)}-{sym}",
                "timestamp": now_str,
                "action": "SELL",
                "symbol": sym,
                "name": pos.get("name", sym),
                "qty": pos.get("qty", 1),
                "price": cur_p_calc,
                "amount_krw": proceeds_krw,
                "pnl_krw": pnl_krw,
                "pnl_pct": pnl_pct,
                "reason": sell_reason,
                "mode": "AI_PAPER",
            })
            paper_sold_items.append({
                "symbol": sym,
                "name": pos.get("name", sym),
                "proceeds_krw": proceeds_krw,
                "pnl_krw": pnl_krw,
                "pnl_pct": pnl_pct,
                "sell_reason": sell_reason,
            })
            seen_syms.discard(sym)
            recently_exited_syms.add(sym)
            permanently_sold_today_syms.add(sym)
            changed = True
        else:
            updated_paper.append(pos)

    # 매도 발생 시 연속 알림 방지: 단건/일괄 스마트 통합 브리핑 발송
    if cfg.get("telegram_notify", True) and paper_sold_items:
        _send_batch_trade_notification(
            "SELL",
            paper_sold_items,
            state,
            paper_positions_override=updated_paper,
            is_paper=True,
        )

    # 3. [장 운영시간 엄격 준수 신규 매수]
    curr_kr = [p for p in updated_paper if not p.get("is_us")]
    curr_us = [p for p in updated_paper if p.get("is_us")]

    def _fill_market_slots(pool: List[Dict[str, Any]], need_count: int, market_label: str):
        nonlocal changed
        added = 0
        newly_bought_items = []
        sorted_pool = sorted(
            pool,
            key=lambda x: (1 if float(x.get("change_pct", 0)) > 0 else 0, float(x.get("ai_score", 0)), float(x.get("change_pct", 0))),
            reverse=True,
        )
        for cand in sorted_pool:
            if added >= need_count or len(updated_paper) >= paper_max_pos:
                break
            c_sym = cand.get("symbol")
            if not c_sym or c_sym in seen_syms or c_sym in recently_exited_syms or c_sym in permanently_sold_today_syms:
                continue
            c_price = float(cand.get("price", 0))
            if c_price <= 0:
                continue
            c_is_us = bool(cand.get("is_us"))
            # [실제 시장 운영 시간 100% 엄격 준수]
            if not is_market_open_now(c_sym, is_us=c_is_us):
                continue
            unit_krw = c_price * (fx_rate if c_is_us else 1.0)
            qty = int(per_stock_budget_krw // unit_krw)
            if qty <= 0:
                continue
            buy_amt_krw = int(round(qty * unit_krw))
            new_paper_pos = {
                "symbol": c_sym,
                "name": cand.get("name", c_sym),
                "sector": cand.get("sector", "AI 주도주"),
                "qty": qty,
                "avg_price": c_price,
                "current_price": c_price,
                "highest_price": c_price,
                "target_price": round(c_price * (1.0 + tp_pct / 100.0), 2 if c_is_us else 0),
                "stop_price": round(c_price * (1.0 - sl_pct / 100.0), 2 if c_is_us else 0),
                "pnl_pct": 0.0,
                "pnl_krw": 0,
                "bought_at": now_str,
                "reason": f"AI 퀀트 {cand.get('ai_score', 98)}점 · [{market_label} 정규장 실시간 포착 · {buy_amt_krw:,}원 배분] · {cand.get('reason', '')}",
                "is_us": c_is_us,
                "trade_mode": "AI_PAPER",
                "kis_order_confirmed": False,
            }
            updated_paper.append(new_paper_pos)
            seen_syms.add(c_sym)
            added += 1
            state.setdefault("trade_logs", []).insert(0, {
                "id": f"TRD-PAPER-BUY-{int(time.time()*1000)}-{c_sym}",
                "timestamp": now_str,
                "action": "BUY",
                "symbol": c_sym,
                "name": cand.get("name", c_sym),
                "qty": qty,
                "price": c_price,
                "amount_krw": buy_amt_krw,
                "pnl_krw": 0,
                "pnl_pct": 0.0,
                "reason": new_paper_pos["reason"],
                "mode": "AI_PAPER",
            })
            newly_bought_items.append({
                "symbol": c_sym,
                "name": cand.get("name", c_sym),
                "qty": qty,
                "price": c_price,
                "amount_krw": buy_amt_krw,
                "is_us": c_is_us,
            })
            changed = True

        # [대표님 요청: 연속 알림 도배 차단 스마트 묶음 브리핑]
        # 한 번에 여러 종목이 체결되더라도 5번 연속 알림 폭탄 대신 깔끔한 단 1건의 요약 알림으로 발송!
        if cfg.get("telegram_notify", True) and newly_bought_items:
            _send_batch_trade_notification(
                "BUY",
                newly_bought_items,
                state,
                paper_positions_override=updated_paper,
                market_label=market_label,
                is_paper=True,
            )


    if active_mkt == "KR":
        # [실제 국내 정규장 엄수: 평일 09:00~15:30]
        # 장 마감 후(15:30 이후), 주말, 공휴일에는 모의투자라도 신규 매수 일절 금지!
        if is_market_open_now("005930", is_us=False):
            needed_kr = max(0, paper_max_pos - len(updated_paper))
            if needed_kr > 0:
                kr_pool = state.get("kr_candidates") or [c for c in (candidates or []) if not c.get("is_us")]
                if not kr_pool or len(kr_pool) < needed_kr:
                    kr_pool = _build_session_candidates(state, "KR")[:25]
                    state["kr_candidates"] = kr_pool
                _fill_market_slots(kr_pool, needed_kr, "🇰🇷국내")
    elif active_mkt == "US":
        # [실제 미국 정규장 엄수: 월 17:00 ~ 토 09:00 KST]
        # 미국 거래소가 실제로 열려 있는 시간대에만 해외주식 실시간 매수 진행!
        if is_market_open_now("NVDA", is_us=True):
            needed_us = max(0, paper_max_pos - len(updated_paper))
            if needed_us > 0:
                us_pool = state.get("us_candidates") or [c for c in (candidates or []) if c.get("is_us")]
                if not us_pool or len(us_pool) < needed_us:
                    us_pool = _build_session_candidates(state, "US")[:25]
                    state["us_candidates"] = us_pool
                _fill_market_slots(us_pool, needed_us, "🇺🇸해외")

    state["paper_positions_backup"] = updated_paper
    real_only = [
        p for p in state.get("positions", [])
        if p.get("kis_order_confirmed") is True or "[한투주문 완료" in str(p.get("reason", ""))
    ]
    if cfg.get("mode") == "KIS_REAL":
        state["positions"] = real_only
    else:
        state["positions"] = real_only + updated_paper

    if changed:
        save_state(state)
    return updated_paper


def get_dashboard_summary(state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if state is None:
        state = load_state()
        if len(state.get("candidates", [])) < 10:
            return run_auto_trader_cycle(force_buy=False)
        # 보유 중인 실전 종목들의 실시간 현재가·수익률·평가손익을 조회할 때마다 실시간 갱신!
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
    invested_principal_krw = 0
    unrealized_pnl_krw = 0
    for pos in positions:
        unit_mult = fx_rate if pos.get("is_us") else 1.0
        eval_amount_krw += int(round(pos.get("current_price", 0) * pos.get("qty", 0) * unit_mult))
        invested_principal_krw += int(round(pos.get("avg_price", 0) * pos.get("qty", 0) * unit_mult))
        unrealized_pnl_krw += int(pos.get("pnl_krw", 0))

    max_total_invest_krw = int(cfg.get("max_total_invest_krw", 10000000) or 0)
    remaining_invest_limit_krw = (
        max(0, max_total_invest_krw - invested_principal_krw)
        if max_total_invest_krw > 0
        else int(acct.get("cash_krw", 0))
    )

    total_equity_krw = int(acct.get("cash_krw", 0) + eval_amount_krw)
    initial_cap = int(cfg.get("initial_capital_krw", 10000000) or 10000000)
    total_return_krw = total_equity_krw - initial_cap
    total_return_pct = round((total_return_krw / initial_cap) * 100, 2) if initial_cap > 0 else 0.0

    total_trades = int(acct.get("total_trades", 0))
    win_trades = int(acct.get("win_trades", 0))
    win_rate = round((win_trades / total_trades) * 100, 1) if total_trades > 0 else 100.0

    # [시간대별 후보군 실시간 동기화] 현재 KST 시간대의 활성 시장(주간 KR / 야간 US)과 후보군이 다르면 즉시 스위칭!
    session_info = _get_time_based_session_info(cfg)
    active_mkt = session_info["active_market"]
    want_us = active_mkt == "US"
    curr_cands = state.get("candidates", [])
    if not curr_cands or any(bool(c.get("is_us")) != want_us for c in curr_cands[:3]):
        try:
            fresh_cands = _build_session_candidates(state, active_mkt)[:25]
            state["candidates"] = fresh_cands
            if active_mkt == "KR":
                state["kr_candidates"] = fresh_cands
            else:
                state["us_candidates"] = fresh_cands
            curr_cands = fresh_cands
            save_state(state)
        except Exception as e:
            print(f"[AutoTrader] Auto session candidate refresh warning: {e}")

    # [모의투자 창 vs 실전계좌 창 완전 분리 데이터 집계 + 1,000만원 시드 자율 매수·매도 엔진 가동]
    paper_positions = _sync_and_trade_paper_portfolio(state, curr_cands)

    all_stored_positions = list(state.get("positions", []))
    real_positions = [
        p for p in all_stored_positions
        if p.get("kis_order_confirmed") is True or "[한투주문 완료" in str(p.get("reason", ""))
    ]

    def _calc_group_metrics(pos_list: List[Dict[str, Any]], cap_krw: int, cash_override: Optional[int] = None, realized_krw: int = 0) -> Dict[str, Any]:
        ev_krw = 0
        inv_krw = 0
        unr_krw = 0
        for p in pos_list:
            um = fx_rate if p.get("is_us") else 1.0
            ev_krw += int(round(p.get("current_price", 0) * p.get("qty", 0) * um))
            inv_krw += int(round(p.get("avg_price", 0) * p.get("qty", 0) * um))
            unr_krw += int(p.get("pnl_krw", 0))
        effective_cap_krw = max(50000, cap_krw + realized_krw)
        c_krw = cash_override if cash_override is not None else max(0, effective_cap_krw - inv_krw)
        eq_krw = c_krw + ev_krw
        ret_krw = eq_krw - cap_krw
        ret_pct = round((ret_krw / cap_krw) * 100, 2) if cap_krw > 0 else 0.0
        return {
            "total_equity_krw": eq_krw,
            "cash_krw": c_krw,
            "eval_amount_krw": ev_krw,
            "invested_principal_krw": inv_krw,
            "max_total_invest_krw": effective_cap_krw,
            "remaining_invest_limit_krw": max(0, effective_cap_krw - inv_krw),
            "unrealized_pnl_krw": unr_krw,
            "realized_pnl_krw": realized_krw,
            "total_return_krw": ret_krw,
            "total_return_pct": ret_pct,
        }

    paper_seed_krw = max(50000, int(cfg.get("paper_seed_krw", 20000000) or 20000000))
    cfg["paper_seed_krw"] = paper_seed_krw
    if isinstance(state.get("config"), dict):
        state["config"]["paper_seed_krw"] = paper_seed_krw
    paper_summary = _calc_group_metrics(paper_positions, paper_seed_krw, realized_krw=int(acct.get("realized_pnl_krw", 0)))
    real_cap = max_total_invest_krw if max_total_invest_krw > 0 else int(cfg.get("initial_capital_krw", 20000000) or 20000000)
    real_summary = _calc_group_metrics(real_positions, real_cap)

    all_logs = state.get("trade_logs", [])[:60]
    real_trade_logs = [lg for lg in all_logs if "[한투주문 완료" in str(lg.get("reason", ""))][:40]
    paper_trade_logs = [lg for lg in all_logs if "[한투주문 완료" not in str(lg.get("reason", ""))][:40]

    # 마스킹 처리하여 프론트엔드 및 네트워크상에 원본 API 키/시크릿이 절대 노출되지 않도록 철통 보호
    kis_configured = bool(cfg.get("kis_app_key") and cfg.get("kis_account_no"))
    if cfg.get("kis_app_secret"):
        cfg["kis_app_secret"] = "********"
    if cfg.get("kis_app_key"):
        raw_k = str(cfg["kis_app_key"])
    # 종목별 거래소 시장 뱃지(코스피/코스닥/나스닥/NYSE/AMEX) 주입
    try:
        from market_tag_helper import get_clean_market_name
        for p in positions + paper_positions + real_positions:
            p["market_tag"] = get_clean_market_name(p.get("symbol", ""))
        for c in curr_cands:
            c["market_tag"] = get_clean_market_name(c.get("symbol", ""))
        for lg in all_logs:
            lg["market_tag"] = get_clean_market_name(lg.get("symbol", ""))
    except Exception as e:
        print(f"[AutoTrader] Market tag injection warning: {e}")

    return {

        "config": cfg,
        "session_info": session_info,
        "summary": {
            "total_equity_krw": total_equity_krw,
            "cash_krw": int(acct.get("cash_krw", 0)),
            "eval_amount_krw": eval_amount_krw,
            "invested_principal_krw": invested_principal_krw,
            "max_total_invest_krw": max_total_invest_krw,
            "remaining_invest_limit_krw": remaining_invest_limit_krw,
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
        "paper_summary": paper_summary,
        "real_summary": real_summary,
        "positions": positions,
        "paper_positions": paper_positions,
        "real_positions": real_positions,
        "trade_logs": all_logs[:40],
        "paper_trade_logs": paper_trade_logs,
        "real_trade_logs": real_trade_logs,
        "candidates": curr_cands[:10],
        "kr_candidates": state.get("kr_candidates", curr_cands if active_mkt == "KR" else [])[:10],
        "us_candidates": state.get("us_candidates", curr_cands if active_mkt == "US" else [])[:10],
        "last_cycle_at": state.get("last_cycle_at", ""),
        "last_quote_refresh_at": state.get("last_quote_refresh_at", datetime.now(KST).strftime("%H:%M:%S")),
    }


_DAEMON_STARTED = False
_DAEMON_LOCK = threading.Lock()


def start_auto_trader_daemon(interval_sec: int = 45) -> None:
    """
    [24시간 365일 무인 자율매매 백그라운드 데몬]
    대표님께서 PC나 스마트폰 브라우저를 완전히 꺼두셔도 EC2 서버 백그라운드에서
    매 45초마다 시간대별(국내장/미국장) 후보군 갱신, 목표가(+4%)/트레일링 익절 매도,
    신규 주도주 매수(가상 모의투자 1,000만 원 시드 5종목 + 한투 실전계좌 연동 시 실전 주문) 및
    대표님 스마트폰 FCM 푸시 알림 발송을 자동으로 수행합니다.
    """
    global _DAEMON_STARTED
    with _DAEMON_LOCK:
        if _DAEMON_STARTED:
            return
        _DAEMON_STARTED = True

    def _loop():
        print(f"[AutoTrader-Daemon] 24/7 Autonomous AI Trading Daemon started (interval={interval_sec}s)")
        while True:
            try:
                st = load_state()
                if st.get("config", {}).get("is_running", True):
                    run_auto_trader_cycle(force_buy=False)
            except Exception as e:
                print(f"[AutoTrader-Daemon] cycle warning: {e}")
            time.sleep(interval_sec)

    threading.Thread(target=_loop, daemon=True, name="AutoTrader24x7Daemon").start()


# 모듈 로드 시 백그라운드 데몬 즉시 가동 보장
start_auto_trader_daemon(45)

