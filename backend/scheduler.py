import asyncio
import logging
import json
import os
import re
import urllib.parse
from datetime import datetime, timedelta
from holiday_checker import is_holiday
from system_watchdog import update_heartbeat

# Configure logging
logger = logging.getLogger(__name__)

# State File to track processed disclosures
# [Vercel-Fix] State file must be in /tmp
if os.environ.get("VERCEL"):
    STATE_FILE = "/tmp/disclosure_state.json"
else:
    STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disclosure_state.json")

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
    return {"processed_ids": [], "sec_processed_ids": [], "last_briefing_hour": -1, "last_briefing_date": ""}

def save_state(state):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        logger.error(f"Failed to save state: {e}")

def mark_processed_and_save(state: dict, processed_ids: dict, doc_id: str):
    """
    [핵심 중복방지] 공시 ID를 처리 완료로 즉시 표시하고 파일에 저장.
    Gemini API 호출 전에 반드시 이 함수를 먼저 호출해야 함.
    서버가 API 호출 도중 죽어도 재시작 시 같은 공시를 다시 처리하지 않음.
    """
    processed_ids[doc_id] = None
    state["processed_ids"] = list(processed_ids.keys())[-2000:]
    save_state(state)
    logger.debug(f"[Anti-Duplicate] Marked {doc_id} as processed before API call")


def format_super_ant_alert(market_tag: str, corp: str, raw_code: str, doc_id: str, flr_nm: str, rcept_dt: str = "", corp_code: str = None) -> tuple[str, str]:
    """
    🐜 슈퍼개미(5%+ 대량보유) 상세 알림 포맷터
    미국 SEC Form 4 처럼 '누가, 몇 주 샀는지/팔았는지, 금액, 지분율'을 명확하게 노출
    """
    from dart_api_client import dart_api_client
    corp_code = corp_code or dart_api_client._load_corp_code(raw_code)
    ant_details = None
    if corp_code and doc_id:
        try:
            ant_details = dart_api_client.get_super_ant_details(corp_code, doc_id, stock_code=raw_code, flr_nm=flr_nm)
        except Exception as e:
            logger.debug(f"[format_super_ant_alert] details error: {e}")

    if ant_details and (ant_details.get("irds_qty", 0) > 0 or ant_details.get("final_qty", 0) > 0):
        reporter = ant_details.get("reporter", flr_nm or "대량보유자")
        direction = ant_details.get("direction", "변동")
        trans_type = ant_details.get("trans_type", "지분 변동")
        irds_qty = ant_details.get("irds_qty", 0)
        final_qty = ant_details.get("final_qty", 0)
        final_rate = ant_details.get("final_rate", 0.0)
        rate_irds = ant_details.get("rate_irds", 0.0)
        reason = ant_details.get("reason", "")
        amt_str = ant_details.get("amount_str", "")

        prefix_title = f"🐜 [슈퍼개미 {trans_type[:2]}]"
        title = f"{prefix_title} {market_tag} {corp}".strip()

        qty_str = f" {irds_qty:,}주" if irds_qty > 0 else ""
        rate_str = f" ({rate_irds:+.2f}%p)" if rate_irds != 0 else ""
        val_str = f" ({amt_str})" if amt_str else ""
        p1 = f"{reporter} | {trans_type}{qty_str}{rate_str}{val_str}".strip()

        p2_parts = []
        if final_qty > 0:
            f_str = f"보유: {final_qty:,}주"
            if final_rate > 0:
                f_str += f" ({final_rate:.2f}%)"
            p2_parts.append(f_str)
        if reason:
            p2_parts.append(reason)
        p2 = " · ".join(p2_parts)

        lines = [p1]
        if p2:
            lines.append(p2)
        if rcept_dt and len(rcept_dt) >= 8:
            lines.append(f"📅 공시 접수: {rcept_dt[4:6]}월 {rcept_dt[6:8]}일")

        if "취득" in direction or "매수" in direction:
            lines.append("💡 [시장해석] 큰손 5%+ 집중 매집 · 수급 유입 기대")
        elif "처분" in direction or "매도" in direction:
            lines.append("💡 [시장해석] 대량보유자 지분 축소 · 차익실현 물량 주의")
        else:
            lines.append("💡 [시장해석] 큰손 지분 구조 변화 · 세부 내역 확인 필요")

        return title, "\n".join(lines)
    else:
        title = f"🐜 [슈퍼개미 포착] {market_tag} {corp}".strip()
        rep_str = f"{flr_nm} | 대량보유 지분 변동 발생" if flr_nm else "대량보유자의 지분 보유상황 변동 발생"
        lines = [rep_str]
        if rcept_dt and len(rcept_dt) >= 8:
            lines.append(f"📅 공시 접수: {rcept_dt[4:6]}월 {rcept_dt[6:8]}일")
        lines.append("💡 [시장해석] 큰손의 지분 구조 변화 · 세부 내역 확인 필요")
        return title, "\n".join(lines)


def format_insider_alert(market_tag: str, corp: str, raw_code: str, doc_id: str, flr_nm: str, rcept_dt: str = "", corp_code: str = None) -> tuple[str, str]:
    """
    🚨 임원/주요주주 내부자 거래 상세 알림 포맷터
    미국 SEC Form 4 처럼 '누가(직책), 몇 주 샀는지/팔았는지, 금액, 잔여 보유주수'를 명확하게 노출
    """
    from dart_api_client import dart_api_client
    corp_code = corp_code or dart_api_client._load_corp_code(raw_code)
    insider_details = None
    if corp_code and doc_id:
        try:
            insider_details = dart_api_client.get_insider_trading_details(corp_code, doc_id, stock_code=raw_code, flr_nm=flr_nm)
        except Exception as e:
            logger.debug(f"[format_insider_alert] details error: {e}")

    if insider_details and insider_details.get("qty", 0) > 0:
        reporter = insider_details.get("reporter", flr_nm or "임원/주요주주")
        title_pos = insider_details.get("title", "")
        trans_type = insider_details.get("trans_type", "매매")
        qty = insider_details.get("qty", 0)
        remain = insider_details.get("remain_qty", 0)
        rate = insider_details.get("hold_rate", "")
        amt_str = insider_details.get("amount_str", "")

        prefix_title = f"🚨 [내부자 {trans_type[:2]}]"
        title = f"{prefix_title} {market_tag} {corp}".strip()

        rep_info = f"{reporter} ({title_pos})" if title_pos else reporter
        val_str = f" ({amt_str})" if amt_str else ""
        p1 = f"{rep_info} | {trans_type} {qty:,}주{val_str}"

        p2_parts = []
        if remain > 0:
            r_str = f"변동 후 보유: {remain:,}주"
            if rate:
                r_str += f" ({rate}%)"
            p2_parts.append(r_str)
        p2 = " · ".join(p2_parts)

        lines = [p1]
        if p2:
            lines.append(p2)
        if rcept_dt and len(rcept_dt) >= 8:
            lines.append(f"📅 공시 접수: {rcept_dt[4:6]}월 {rcept_dt[6:8]}일")

        if "매수" in trans_type or "취득" in trans_type:
            lines.append("💡 [시장해석] 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명")
        else:
            lines.append("💡 [시장해석] 임원 지분 매도에 따른 차익실현 · 단기 주가 고점 부담 점검 권장")

        return title, "\n".join(lines)
    else:
        title = f"🚨 [내부자 거래 포착] {market_tag} {corp}".strip()
        rep_str = f"{flr_nm} (임원/주요주주) | 자사주 보유 변동" if flr_nm else "회사 임원 및 주요주주의 주식 보유상황(매수/매도) 변동 발생"
        lines = [rep_str]
        if rcept_dt and len(rcept_dt) >= 8:
            lines.append(f"📅 공시 접수: {rcept_dt[4:6]}월 {rcept_dt[6:8]}일")
        lines.append("💡 [시장해석] 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명")
        return title, "\n".join(lines)


def generate_smart_disclosure_alert(market_tag: str, corp: str, report_title: str, rcept_dt: str = "") -> tuple[str, str]:
    """
    일반 공시도 밋밋하지 않고 주식 초보자가 한눈에 직관적으로 이해할 수 있도록
    카테고리별 이모지+명확한 제목과 2~3줄 상세 팩트 + 💡 시장해석으로 변환합니다.
    """
    report_title = re.sub(r'\s{2,}', ' ', report_title).strip()
    clean = report_title.replace(" ", "")
    dt_str = f"📅 공시 접수: {rcept_dt[4:6]}월 {rcept_dt[6:8]}일" if len(rcept_dt) >= 8 else ""

    # 1. 기업설명회(IR)
    if any(k in clean for k in ["기업설명회", "IR", "코퍼릿데이"]):
        title = f"🎤 [기업설명회(IR) 개최] {market_tag} {corp}".strip()
        fact = "📌 기관투자자 및 애널리스트 대상 기업설명회(IR) 개최 발표"
        interp = "💡 [시장해석] 경영 실적 및 미래 성장 파이프라인 공개 · 기관 수급 유입 관심"

    # 2. 주주총회 (결과 or 소집)
    elif "주주총회결과" in clean or "주총결과" in clean:
        title = f"🗳️ [주주총회 결과] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 결의 완료 (이사 선임, 재무제표, 정관 변경 등)"
        interp = "💡 [시장해석] 주요 경영 안건 승인 및 경영권·지배구조 안정성 확보"
    elif "주주총회" in clean or "주총" in clean:
        title = f"🗳️ [주주총회 소집] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 공고 접수"
        interp = "💡 [시장해석] 핵심 경영진 선임 및 사업 목적 변경 등 주총 의결 사안 점검"

    # 3. 의무보유 / 보호예수 / 락업
    elif any(k in clean for k in ["의무보유", "보호예수", "의무보호"]):
        title = f"🔒 [의무보유(보호예수) 안내] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 접수"
        interp = "💡 [시장해석] 보호예수 해제 시 유통 주식수 증가 · 잠재 매도 물량(오버행) 체크 필요"

    # 4. 전환사채(CB) / 신주인수권(BW) 리픽싱 또는 행사
    elif any(k in clean for k in ["전환가액의조정", "행사가액의조정", "리픽싱"]):
        title = f"🔄 [전환가액 조정(리픽싱)] {market_tag} {corp}".strip()
        fact = "📌 주가 변동에 따른 전환사채(CB)/신주인수권 전환가액 조정(리픽싱) 공시"
        interp = "💡 [시장해석] 전환가액 하향 시 향후 주식 전환 물량 증가(잠재 희석) 점검"
    elif any(k in clean for k in ["전환청구권행사", "신주인수권행사"]):
        title = f"⚠️ [전환청구권 행사] {market_tag} {corp}".strip()
        fact = "📌 채권자의 주식 전환청구권 행사로 신주 상장 예정"
        interp = "💡 [시장해석] 신주 상장에 따른 유통 물량 증가 및 단기 차익 매물 주의"
    elif any(k in clean for k in ["전환사채", "신주인수권부사채", "교환사채"]):
        title = f"⚠️ [사채 발행 공시] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 발표"
        interp = "💡 [시장해석] 자금 조달 목적(시설투자 vs 운영자금) 및 향후 주식 희석 가능성 체크"

    # 5. 정기 보고서 (분기/반기/사업보고서)
    elif any(k in clean for k in ["사업보고서", "분기보고서", "반기보고서"]):
        rep_type = "사업보고서" if "사업보고서" in clean else "분기보고서" if "분기" in clean else "반기보고서"
        title = f"📊 [{rep_type} 제출] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 금융감독원 접수 완료"
        interp = "💡 [시장해석] 경영 성적표 공시 · 매출액, 영업이익 및 재무 건전성 점검"
    elif any(k in clean for k in ["영업(잠정)실적", "잠정실적", "매출액또는손익구조"]):
        title = f"📊 [경영 실적 발표] {market_tag} {corp}".strip()
        fact = "📌 최근 분기/연간 매출액 및 영업이익(잠정 실적) 공시 발표"
        interp = "💡 [시장해석] 시장 컨센서스(전망치) 부합 여부 및 전년 대비 성장률 체크"

    # 6. 배당
    elif "배당" in clean:
        title = f"💸 [배당 결정 발표] {market_tag} {corp}".strip()
        fact = "📌 주주 현금/주식 배당금 지급 결정 발표"
        interp = "💡 [시장해석] 주당 배당금 및 시가배당률 확인 · 대표적 주주환원 신호"

    # 7. 특허권 / R&D
    elif "특허" in clean:
        title = f"🔬 [특허권 취득] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 공시 접수"
        interp = "💡 [시장해석] 독점 기술력 확보 및 신제품 상용화를 통한 펀더멘털 강화 기대"

    # 8. 바이오 임상 / 허가
    elif any(k in clean for k in ["임상", "품목허가", "IND"]):
        title = f"🧬 [바이오 파이프라인 공시] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 공시 접수"
        interp = "💡 [시장해석] 파이프라인 가치 재평가 및 상용화 라이선스 아웃(L/O) 모멘텀"

    # 9. 상장폐지 / 관리종목 / 거래정지 / 불성실
    elif any(k in clean for k in ["상장폐지", "관리종목", "거래정지", "불성실공시", "상장적격성"]):
        title = f"🚨 [투자 유의 공시] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 관련 중요 공시 접수"
        interp = "💡 [시장해석] 경영 불확실성 및 규제 리스크 · 원문 정밀 점검 및 리스크 대응 필요"

    # 10. 소송 / 횡령 / 배임
    elif any(k in clean for k in ["소송", "횡령", "배임", "고발"]):
        title = f"🚨 [법적 리스크 공시] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 공시 접수"
        interp = "💡 [시장해석] 소송 및 법적 공방에 따른 재무적 영향 및 기업 신뢰도 점검"

    # 11. 주식담보제공 (초특급 위험)
    elif any(k in clean for k in ["주식담보제공", "주식담보", "담보제공계약"]):
        title = f"🚨 [주식담보제공 계약] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 체결"
        interp = "💡 [시장해석] 대주주 지분 담보 대출 · 주가 하락 시 반대매매(강제매도) 위험 주의"

    # 12. 채무보증 (빚보증)
    elif any(k in clean for k in ["채무보증", "보증결정"]):
        title = f"⚠️ [채무보증 결정] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 공시"
        interp = "💡 [시장해석] 계열사 등에 대출 빚보증 제공 · 보증 대상 기업의 재무 리스크 전이 점검"

    # 13. 차입금 증가 (단기차입금)
    elif any(k in clean for k in ["차입금증가", "단기차입금", "차입금"]):
        title = f"⚠️ [단기차입금 증가] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 발표"
        interp = "💡 [시장해석] 단기 대출금 증가 · 사업 운영자금 vs 자금난 유동성 악화 여부 점검"

    # 14. 증권신고서
    elif "증권신고서" in clean:
        title = f"📋 [증권신고서 제출] {market_tag} {corp}".strip()
        fact = f"📌 {report_title} 금융감독원 제출"
        interp = "💡 [시장해석] 신주 발행(유상증자/사채) 일정 및 발행 규모 · 주식 희석 비율 확인"

    # 11. 주요 경영사항 / 기타 시장안내
    elif any(k in clean for k in ["투자판단관련", "주요경영사항", "기타시장안내", "주요사항보고서"]):
        title = f"📋 [주요 경영사항] {market_tag} {corp}".strip()
        fact = f"📌 {report_title}"
        interp = "💡 [시장해석] 상장사 공식 주요 경영 안내 · 세부 원문 확인 권장"

    # 12. 일반 기본 공시 폴백
    else:
        title = f"📢 [공시 속보] {market_tag} {corp}".strip()
        fact = f"📌 {report_title}"
        interp = "💡 [시장해석] 금융감독원 DART 공식 접수 공시 · 세부 원문 확인 권장"

    body_lines = [fact]
    if dt_str:
        body_lines.append(dt_str)
    body_lines.append(interp)

    return title, "\n".join(body_lines)


def is_high_priority_disclosure(clean_title: str) -> bool:
    """
    주가 파급력이 크고 투자자에게 실질적인 리스크/기회가 되는 고중요도 공시인지 판별.
    단순 일상적 공시(IR 공지, 통상 주총, 특허, 스톡옵션 등)는 제외하고
    담보계약, CB/BW 리픽싱, 실적, 배당, 바이오 임상, 상폐/관리/투자유의, 소송, 채무보증, 차입금 증가, 증권신고서 등만 True 반환.
    """
    HIGH_PRIORITY_KEYWORDS = [
        # 1. 지분 담보 및 지배구조 리스크 (초특급 위험)
        "주식담보제공", "주식담보", "담보제공계약", "최대주주변경", "경영권분쟁",
        # 2. 전환사채(CB) / 메자닌 (오버행 및 물량 희석)
        "전환가액의조정", "행사가액의조정", "리픽싱", "전환청구권행사", "신주인수권행사", "전환사채", "신주인수권부사채", "교환사채",
        # 3. 실적 성적표 (실시간 주가 파급력이 있는 잠정실적·손익구조 변동만 포함, 단순 정기 보고서 제출 제외)
        "영업(잠정)실적", "잠정실적", "매출액또는손익구조",
        # 4. 주주환원 배당
        "배당",
        # 5. 바이오 파이프라인
        "임상", "품목허가", "IND",
        # 6. 상폐 및 규제 리스크 (초특급 위험)
        "상장폐지", "관리종목", "거래정지", "불성실공시", "상장적격성", "감자결정",
        # 7. 소송/횡령/배임
        "소송", "횡령", "배임", "고발",
        # 8. 부채 및 재무 리스크
        "채무보증", "보증결정", "차입금증가", "단기차입금",
        # 9. 대규모 신주 발행
        "증권신고서", "유상증자"
    ]
    return any(kw in clean_title for kw in HIGH_PRIORITY_KEYWORDS)


async def check_and_notify_disclosures():
    """
    DART OpenAPI 기반 국내 공시 실시간 체크 (5분마다)
    - 키워드 필터 없음: 관심종목이면 모든 신규 공시 즉시 알림
    - 알림 제목: [공시 속보] 형식으로 통일
    """
    logger.info("[공시Monitor] DART 공시 체크 시작...")

    import pytz
    import urllib.parse
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    # 1. 주말(토/일) 및 법정 공휴일은 국내 증시 휴장이므로 공시 알림 발송 스킵
    if now.weekday() >= 5:
        logger.debug("[공시Monitor] 주말(토/일)에는 DART 공시 알림을 발송하지 않습니다.")
        return

    if is_holiday("kor"):
        logger.debug("[공시Monitor] 공휴일에는 DART 공시 알림을 발송하지 않습니다.")
        return

    # 2. [소음 방지] 국내 증시 거래 준비 및 대체거래소(ATS) 시간외 거래 마감 시간 (평일 08:30 ~ 20:00)
    # - 08:30: 장전 호가 접수 및 동시호가 준비 시작
    # - 18:00: 기존 한국거래소(KRX) 시간외 단일가 마감
    # - 19:00: 금융감독원 DART 당일 공시 최종 접수 마감 (장 마감 후 주요 경영 공시 집중 접수)
    # - 20:00: 대체거래소(ATS 넥스트레이드) 애프터마켓 최종 거래 마감
    current_time_num = now.hour * 100 + now.minute
    if not (830 <= current_time_num <= 2000):
        logger.info(f"[공시Monitor] 국내 장 및 시간외 거래 운영 시간 외({now.strftime('%H:%M')})에는 DART 공시 알림을 발송하지 않습니다.")
        return

    from dart_api_client import dart_api_client
    if not dart_api_client.is_available():
        logger.warning("[공시Monitor] DART_API_KEY 없음 -> 공시 체크 생략")
        return

    from db_manager import get_user_tokens_by_watchlist_symbol
    from firebase_config import send_multicast_notification

    try:
        state = load_state()
        # dict.fromkeys를 사용하여 삽입 순서를 유지 (Python 3.7+)
        # 기존에 set()을 사용하면 순서가 랜덤해져 [-2000:] 슬라이싱 시 최근 공시가 무작위로 삭제되는 치명적 버그 발생
        processed_ids = dict.fromkeys(state.get("processed_ids", []))

        # 오늘 올라온 공시 목록 조회 (최대 100건)
        results = dart_api_client.get_realtime_disclosures(days_ago=0)
        if not results:
            logger.info("[공시Monitor] 조회된 공시 없음")
            return

        new_count = 0
        sent_count = 0
        global_whale_push_count = 0

        for item in results:
            doc_id = str(item.get('rcept_no', ''))
            if not doc_id or doc_id in processed_ids:
                continue

            # 발송/API 호출 전 즉시 읽음 처리하여 서버 재시작 시 중복 폭탄 발송 원천 차단
            mark_processed_and_save(state, processed_ids, doc_id)

            try:
                raw_code = item.get('stock_code')
                corp = item.get('corp_name', '알 수 없음')
                report_title = re.sub(r'\s{2,}', ' ', item.get('report_nm', '공시')).strip()
                dart_link = item.get('link', '')
                rcept_dt = item.get('rcept_dt', '')
                flr_nm = item.get('flr_nm', '')

                # 비상장 법인(stock_code 없음)은 즉시 스킵
                if not raw_code:
                    continue

                # [당일 접수 공시만 실시간 속보 발송]
                # 어제나 과거 일자에 접수된 공시가 아침에 지연 발송되어 혼란을 주는 문제 원천 방지
                today_kst_str = now.strftime('%Y%m%d')
                if rcept_dt and rcept_dt != today_kst_str:
                    logger.debug(f"[공시Monitor] 당일({today_kst_str}) 접수 공시가 아님 ({rcept_dt}) -> 발송 제외: {corp} ({report_title})")
                    continue

                # [대표님 요청 반영] 단순 정기 서류(분기/반기/사업/감사/검토보고서),
                # 사후 단순 행정 보고서(합병등종료보고서, 종료보고서, 결과보고서),
                # 의례적 안내 공고(주주총회, 주주명부폐쇄, 명의개서정지, 투자설명서 등)는
                # 투자 실시간 매매에 불필요한 잡음이므로 알림센터(DB) 저장 및 푸시 발송에서 100% 완전 제외!
                clean_check = report_title.replace(" ", "")
                if any(skip_kw in clean_check for skip_kw in [
                    "분기보고서", "반기보고서", "사업보고서", "감사보고서", "검토보고서",
                    "주주총회", "주총", "주주명부폐쇄", "명의개서정지", "기준일설정",
                    "증권발행실적보고서", "일괄신고", "투자설명서",
                    "종료보고서", "결과보고서", "기업설명회", "코퍼릿데이"
                ]):
                    logger.debug(f"[공시Monitor] 단순 정기/종료/의례 공시 DB 저장/알림 제외: {corp} ({report_title})")
                    continue

                new_count += 1
                from market_tag_helper import get_stock_market_tag
                market_tag = get_stock_market_tag(raw_code)
                    
                skip_whale_alert = True
                prefix_title = ""
                ok_users = []  # whale 알림을 실제로 받은 사용자 UID (중복 방지용)

                # [공시 분류 체계 개편]
                # 1. 🚨 초특급 중대 공시 (시장 전체 및 주주가치에 중대한 영향 -> 전원 글로벌 푸시)
                SUPER_GLOBAL_KEYWORDS = [
                    # 🔴 최고 수준 중대 악재 / 거래위험 / 상폐
                    "상장폐지", "정리매매", "관리종목", "횡령", "배임", "영업정지", "부도발생", "파산신청", "감자결정", "회생절차",
                    # 🟢 최고 수준 주주환원 / 경영권 분쟁 호재
                    "무상증자", "자기주식소각", "주식소각", "공개매수", "경영권변경"
                ]

                # 2. 📊 기업 개별 스마트 팩트 공시 (단일판매 공급계약, 임원 매매, 슈퍼개미, 유상증자, 자사주 취득, 소송, 실적, 배당 등)
                FACT_ALERT_KEYWORDS = [
                    "단일판매", "공급계약", "유상증자", "자기주식", "신탁계약", "전환사채", "신주인수권", "교환사채", "리픽싱",
                    "소송", "경영권분쟁", "매매거래정지", "거래정지", "불성실공시", "잠정실적", "매출액또는손익구조", "배당",
                    "합병", "분할", "타법인주식", "양수", "양도", "임상", "품목허가", "특허", "채무보증", "단기차입금", "주식담보", "주요사항보고서"
                ]
                
                clean_title = report_title.replace(" ", "")
                is_super_global = any(kw in clean_title for kw in SUPER_GLOBAL_KEYWORDS)
                is_super_ant = "대량보유" in clean_title
                is_insider = "임원" in clean_title or "주요주주" in clean_title
                is_fact_alert = any(kw in clean_title for kw in FACT_ALERT_KEYWORDS)
                is_whale = is_super_global or is_super_ant or is_insider or is_fact_alert
                
                fact_str = ""
                whale_alerted_uids = set()
                
                if is_whale:
                    skip_whale_alert = False
                    
                    if is_super_ant:
                        prefix_title = "🚨 [슈퍼개미 포착]"
                        # 기본 폴백 메시지
                        fact_str = f"대량보유자의 지분 보유상황 변동이 발생했습니다.\n💡 [시장해석] 큰손의 지분 구조 변화 · 세부 내역 확인 필요"
                        if flr_nm:
                            fact_str = f"{flr_nm} | 대량보유 지분 변동 발생\n💡 [시장해석] 큰손의 지분 구조 변화 · 세부 내역 확인 필요"

                        # ✅ [업그레이드] majorstock API + XML 폴백으로 상세 정보 추출
                        corp_code = item.get("corp_code") or dart_api_client._load_corp_code(raw_code)
                        if corp_code and doc_id:
                            try:
                                ant_details = dart_api_client.get_super_ant_details(corp_code, doc_id, stock_code=raw_code, flr_nm=flr_nm)
                                if ant_details and (ant_details.get("irds_qty", 0) > 0 or ant_details.get("final_qty", 0) > 0):
                                    reporter = ant_details.get("reporter", flr_nm or "대량보유자")
                                    direction = ant_details.get("direction", "변동")
                                    trans_type = ant_details.get("trans_type", "지분 변동")
                                    irds_qty = ant_details.get("irds_qty", 0)
                                    final_qty = ant_details.get("final_qty", 0)
                                    final_rate = ant_details.get("final_rate", 0.0)
                                    rate_irds = ant_details.get("rate_irds", 0.0)
                                    reason = ant_details.get("reason", "")
                                    amt_str = ant_details.get("amount_str", "")

                                    # 제목: 🐜 [슈퍼개미 매수] or [슈퍼개미 매도]
                                    prefix_title = f"🐜 [슈퍼개미 {trans_type[:2]}]"

                                    # 라인 1: 보고자 | 매수(취득) O주 (+O.OO%p) (약 O억원)
                                    qty_str = f" {irds_qty:,}주" if irds_qty > 0 else ""
                                    rate_str = f" ({rate_irds:+.2f}%p)" if rate_irds != 0 else ""
                                    val_str = f" ({amt_str})" if amt_str else ""
                                    p1 = f"{reporter} | {trans_type}{qty_str}{rate_str}{val_str}".strip()

                                    # 라인 2: 보유: O주 (O%) · 사유
                                    p2_parts = []
                                    if final_qty > 0:
                                        f_str = f"보유: {final_qty:,}주"
                                        if final_rate > 0:
                                            f_str += f" ({final_rate:.2f}%)"
                                        p2_parts.append(f_str)
                                    if reason:
                                        p2_parts.append(reason)
                                    p2 = " · ".join(p2_parts)

                                    lines = [p1]
                                    if p2:
                                        lines.append(p2)

                                    # 시장 해석
                                    if "취득" in direction or "매수" in direction:
                                        lines.append("💡 [시장해석] 큰손 5%+ 집중 매집 · 수급 유입 기대")
                                    elif "처분" in direction or "매도" in direction:
                                        lines.append("💡 [시장해석] 대량보유자 지분 축소 · 차익실현 물량 주의")
                                    else:
                                        lines.append("💡 [시장해석] 큰손 지분 구조 변화 · 세부 내역 확인 필요")

                                    fact_str = "\n".join(lines)
                            except Exception as ant_e:
                                logger.warning(f"[WhaleSiren] 슈퍼개미 상세조회 실패, 폴백 사용: {ant_e}")

                    elif is_insider:
                        prefix_title = "🚨 [내부자 거래 포착]"
                        fact_str = "회사 임원 및 주요주주의 주식 보유상황(매수/매도) 변동이 발생했습니다.\n💡 [시장해석] 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명"
                        if flr_nm:
                            fact_str = f"{flr_nm} (임원/주요주주) | 자사주 보유 변동\n💡 [시장해석] 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명"
                        
                        # ✅ [업그레이드] DART API + XML 폴백으로 상세 추출 (잔여 보유량 + 보유비율 + 거래금액)
                        corp_code = item.get("corp_code") or dart_api_client._load_corp_code(raw_code)
                        if corp_code and doc_id:
                            try:
                                insider_details = dart_api_client.get_insider_trading_details(corp_code, doc_id, stock_code=raw_code, flr_nm=flr_nm)
                                if insider_details and insider_details.get("qty", 0) > 0:
                                    reporter = insider_details.get("reporter", flr_nm or "임원/주요주주")
                                    title_pos = insider_details.get("title", "")
                                    trans_type = insider_details.get("trans_type", "매매")
                                    qty = insider_details.get("qty", 0)
                                    remain = insider_details.get("remain_qty", 0)
                                    rate = insider_details.get("hold_rate", "")
                                    amt_str = insider_details.get("amount_str", "")

                                    # 제목: 🚨 [내부자 매수] or [내부자 매도]
                                    prefix_title = f"🚨 [내부자 {trans_type[:2]}]"

                                    # 라인 1: 보고자 (직책) | 매수(취득) O주 (약 O원)
                                    rep_info = f"{reporter} ({title_pos})" if title_pos else reporter
                                    val_str = f" ({amt_str})" if amt_str else ""
                                    p1 = f"{rep_info} | {trans_type} {qty:,}주{val_str}"

                                    # 라인 2: 변동 후 보유: O주 (O%)
                                    p2_parts = []
                                    if remain > 0:
                                        r_str = f"변동 후 보유: {remain:,}주"
                                        if rate:
                                            r_str += f" ({rate}%)"
                                        p2_parts.append(r_str)
                                    p2 = " · ".join(p2_parts)

                                    lines = [p1]
                                    if p2:
                                        lines.append(p2)

                                    # 시장 해석 추가
                                    if "매수" in trans_type or "취득" in trans_type:
                                        lines.append("💡 [시장해석] 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명")
                                    else:
                                        lines.append("💡 [시장해석] 임원 지분 매도에 따른 차익실현 · 단기 주가 고점 부담 점검 권장")

                                    fact_str = "\n".join(lines)
                            except Exception as ins_e:
                                logger.warning(f"[WhaleSiren] 내부자 상세조회 실패, 폴백 사용: {ins_e}")

                    else:
                        prefix_title = "🔔 [공시 팩트 알림]"
                        # ✅ [업그레이드] 공시 유형별 스마트 팩트 문구 및 시장 해석
                        clean = clean_title
                        if "유상증자" in clean:
                            fact_str = f"신주 발행(유상증자) 결정 공시!\n💡 [시장해석] 자금 조달 목적 확인 필요 · 주식 희석 가능성 주의"
                        elif "무상증자" in clean:
                            fact_str = f"무상증자 결정 공시! 기존 주주에게 신주 무상 배정\n💡 [시장해석] 대표적 주주친화 정책 · 유통 주식수 확대 호재"
                        elif "자기주식취득" in clean or "신탁계약" in clean:
                            fact_str = f"자사주 매입 결정 공시! 회사가 자기 주식 직접 매수\n💡 [시장해석] 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명"
                            if doc_id:
                                try:
                                    t_det = dart_api_client.get_treasury_stock_details(doc_id)
                                    if t_det and (t_det.get("amount_str") or t_det.get("plan_shares", 0) > 0):
                                        amt_info = f" {t_det['amount_str']}" if t_det.get('amount_str') else ""
                                        stk_info = f" ({t_det['plan_shares']:,}주 취득 예정)" if t_det.get('plan_shares', 0) > 0 else ""
                                        fact_str = f"자사주 매입 결정 공시!{amt_info}{stk_info} 회사가 자기 주식 직접 매수\n💡 [시장해석] 경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명"
                                except Exception as t_e:
                                    logger.debug(f"[WhaleSiren] 자사주 취득 상세 조회 실패: {t_e}")

                        elif "자기주식소각" in clean or "주식소각" in clean:
                            fact_str = f"자사주 소각 결정 공시! 발행 주식수 영구 감축\n💡 [시장해석] 주당 가치 상승을 이끄는 가장 강력한 주주환원 호재"
                        elif "공개매수" in clean:
                            fact_str = f"공개매수 결정 공시! 프리미엄 매수 제안\n💡 [시장해석] 경영권 분쟁 또는 지분 확대를 위한 주가 부양 요인"
                        elif "경영권변경" in clean:
                            fact_str = f"경영권 변경 공시! 최대주주/경영진 구조 개편\n💡 [시장해석] 지배구조 개편 및 신사업 추진 기대감"
                        elif "감자결정" in clean:
                            fact_str = f"감자(자본감소) 결정 공시!\n💡 [시장해석] 재무구조 개선용 감자 여부 확인 · 주주가치 변동 주의"
                        elif "상장폐지" in clean:
                            fact_str = f"⚠️ 상장폐지 관련 공시!\n💡 [시장해석] 거래정지 및 정리매매 등 최고 수준 위험 대응 필요"
                        elif "관리종목" in clean:
                            fact_str = f"⚠️ 관리종목 지정/해제 공시!\n💡 [시장해석] 재무 건전성 및 투자 유의 요건 점검 필요"
                        elif "횡령" in clean or "배임" in clean:
                            fact_str = f"⚠️ 횡령·배임 혐의 발생 공시!\n💡 [시장해석] 기업 신뢰도 및 거래정지 가능성 중대 악재 주의"
                        elif "영업정지" in clean:
                            fact_str = f"⚠️ 영업정지 공시!\n💡 [시장해석] 본업 차질 발생 · 실적 타격 리스크"
                        elif "부도발생" in clean or "파산신청" in clean:
                            fact_str = f"⚠️ 부도·파산 공시!\n💡 [시장해석] 기업 존속 위험 최고 수준 위험"
                        elif "불성실공시" in clean:
                            prefix_title = "🚨 [불성실공시법인 지정]"
                            fact_str = f"한국거래소 불성실공시법인 지정 공시 접수!\n💡 [시장해석] 공시번복·번복 등에 따른 거래소 징계 처분 · 누적 벌점 초과 시 관리종목 및 매매거래정지 위험 주의!"
                        elif "주식담보" in clean or "담보제공" in clean:
                            prefix_title = "🚨 [주식담보제공 계약]"
                            fact_str = f"최대주주/오너 주식 담보 대출 계약 공시 접수!\n💡 [시장해석] 대주주 지분 담보 대출 · 주가 하락 시 사채/금융기관 반대매매(강제매도 폭탄) 및 경영권 변동 위험 주의!"
                        elif "최대주주변경" in clean:
                            prefix_title = "🚨 [최대주주 변경]"
                            fact_str = f"회사의 최대주주(오너) 변경 공시 접수!\n💡 [시장해석] 지배구조 및 실질 경영권 변동 · 신규 오너 자금 출처 및 경영 불확실성 점검 필요"
                        elif "단일판매" in clean or "공급계약" in clean:
                            fact_str = f"대규모 공급계약 체결 공시!\n💡 [시장해석] 대형 수주 확보로 향후 매출 및 실적 성장 기대"
                        else:
                            fact_str = f"[{corp}] {report_title} 공시 접수\n💡 [시장해석] 신규 주요 공시 발생 · 원문 확인 권장"

                    # 텔레그램 티저 메시지 (초특급 공시인 경우에만 발송)
                    if is_super_global and not skip_whale_alert:
                        try:
                            from telegram_service import send_telegram_teaser
                            teaser_msg = f"🚨 <b>[{corp}] 초특급 공시 포착!</b>\n\n[{prefix_title}]\n{report_title}\n\n👉 <a href='https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(dart_link)}'>원문 바로가기</a>"
                            send_telegram_teaser(teaser_msg, skip_db_save=True)
                        except Exception as e:
                            logger.error(f"[WhaleSiren] Telegram error: {e}")

                        try:
                            from firebase_admin import firestore
                            db = firestore.client()
                            event_data = {
                                "type": "WHALE_ALERT",
                                "corp": corp,
                                "title": report_title,
                                "code": raw_code,
                                "url": dart_link,
                                "timestamp": firestore.SERVER_TIMESTAMP
                            }
                            try:
                                db.collection("live_events").add(event_data)
                                logger.info(f"[WhaleSiren] Broadcasted event for {corp}")
                            except Exception as e:
                                logger.error(f"[WhaleSiren] Failed to save live_events: {e}")
                        except Exception as e:
                            logger.error(f"[WhaleSiren] Firestore error: {e}")

                    # ✅ [글로벌 푸시 발송: 우루루 폭탄 방지]
                    # 알림센터 DB에는 100% 전량 저장하되, 내 관심종목이 아닌 타 종목 글로벌 푸시는
                    # 초특급 공시(is_super_global)이거나 1분 주기당 최대 1건(global_whale_push_count < 1)만 발송하여
                    # 장 마감 직후(16시~17시) 수십 개 종목 공시가 한꺼번에 우루루 울리는 현상을 원천 차단!
                    if is_whale and not skip_whale_alert and (is_super_global or global_whale_push_count < 1):
                        try:
                            from db_manager import get_all_fcm_tokens_with_user
                            whale_users = get_all_fcm_tokens_with_user(require_whale_alert=True)
                            if whale_users:
                                w_tokens = [u[1] for u in whale_users]
                                w_uids = [u[0] for u in whale_users]
                                
                                # 관심종목 푸시에서 중복되지 않도록 UID 기록
                                whale_alerted_uids.update(w_uids)
                                
                                w_title = f"{prefix_title} {market_tag} {corp}".strip()
                                w_body = f"{fact_str}" if fact_str else f"{report_title}"
                                w_data = {
                                    "type": "disclosure_alert",
                                    "url": f"/stock/{raw_code}",
                                    "dart_url": f"https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(dart_link)}",
                                    "symbol": raw_code,
                                    "rcept_no": doc_id,
                                    "is_global": "true",
                                    "skip_db_save": "true"
                                }
                                send_multicast_notification(w_tokens, w_title, w_body, w_data, target_users=w_uids, skip_db_save=True)
                                sent_count += 1
                                global_whale_push_count += 1
                                logger.info(f"[WhaleSiren] [글로벌 핵심공시/지분변동 푸시] Sent FCM to {len(w_tokens)} users for {corp}: {w_title}")
                        except Exception as push_e:
                            logger.error(f"[WhaleSiren] Global FCM error: {push_e}")

                # 관심종목 등록 여부 확인 (KS / KQ 접미사 모두 시도)
                symbol_candidates = [f"{raw_code}.KS", f"{raw_code}.KQ", raw_code]
                tokens = []
                target_uids = []
                matched_symbol = None

                from db_manager import get_user_ids_and_tokens_by_watchlist_symbol
                for sym in symbol_candidates:
                    user_tokens = get_user_ids_and_tokens_by_watchlist_symbol(sym)
                    if user_tokens:
                        # ✅ [중복 방지] 이미 whale 알림을 받은 사용자는 관심종목 알림에서 제외
                        filtered = [ut for ut in user_tokens if ut["user_id"] not in whale_alerted_uids]
                        if filtered:
                            tokens = [ut["token"] for ut in filtered]
                            target_uids = [ut["user_id"] for ut in filtered]
                            matched_symbol = sym
                            break

                if is_whale:
                    noti_title = f"{prefix_title} {market_tag} {corp}".strip()
                    body_parts = [fact_str if fact_str else f"📌 {report_title}"]
                    if rcept_dt and len(rcept_dt) >= 8:
                        dt_fmt = f"📅 공시 접수: {rcept_dt[4:6]}월 {rcept_dt[6:8]}일"
                        if "💡 [시장해석]" in body_parts[0]:
                            lines = body_parts[0].split("\n")
                            new_lines = []
                            for l in lines:
                                if "💡 [시장해석]" in l:
                                    new_lines.append(dt_fmt)
                                new_lines.append(l)
                            noti_body = "\n".join(new_lines)
                        else:
                            body_parts.append(dt_fmt)
                            noti_body = "\n".join(body_parts)
                    else:
                        noti_body = "\n".join(body_parts)
                else:
                    noti_title, noti_body = generate_smart_disclosure_alert(market_tag, corp, report_title, rcept_dt)

                data_payload = {
                    "type": "disclosure_alert",
                    "symbol": matched_symbol or raw_code,
                    "rcept_no": doc_id,
                    "url": f"/discovery?q={raw_code}",
                    "dart_url": f"https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(dart_link)}",
                    "skip_db_save": "true"
                }

                # ✅ 1. 모든 상장사 공시(Whale 공시 + 일반 공시 100% 전량)는 예외 없이 Firestore 알림센터에 글로벌(is_global=True)로 무조건 저장!
                try:
                    from firebase_config import save_alert_to_firestore
                    save_alert_to_firestore(
                        title=noti_title,
                        body=noti_body,
                        alert_type="disclosure_alert",
                        url=data_payload["url"],
                        is_global=True,
                        target_users=target_uids,
                        symbol=data_payload["symbol"],
                        dart_url=data_payload["dart_url"],
                        rcept_no=doc_id
                    )
                    logger.info(f"[공시Monitor] 알림센터 글로벌 100% 저장 완료: {corp} ({noti_title})")
                except Exception as save_e:
                    logger.error(f"[공시Monitor] DB 저장 오류: {save_e}")

                # ✅ 2. 스마트폰/워치 FCM 푸시 발송:
                # - 핵심/세력/주요 팩트 공시(is_whale)는 위에서 이미 전량 FCM 푸시 발송 완료!
                # - 단순 일반 [공시 속보](증권사 일괄신고서 등)는 알림센터 DB에는 100% 저장하되,
                #   휴대폰 푸시 소음 방지를 위해 '내 관심종목(tokens)'에 등록된 종목일 때만 푸시 발송!
                if tokens:
                    logger.info(f"[공시Monitor] [관심종목 맞춤 FCM 발송] {corp} ({raw_code}) -> {len(tokens)}명: {report_title}")
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload, target_users=target_uids, skip_db_save=True)
                    sent_count += 1
                    await asyncio.sleep(0.3)

                # ✅ 모든 처리가 에러 없이 완료된 직후에 ID를 파일에 저장
                mark_processed_and_save(state, processed_ids, doc_id)

            except Exception as item_e:
                logger.error(f"[공시Monitor] Error processing item {doc_id}: {item_e}")
                # Continue with the next item so one failure doesn't break everything
                continue

        logger.info(f"[공시Monitor] 완료: 신규 {new_count}건, 알림 {sent_count}건 발송")
        # 참고: 각 공시 처리 전에 mark_processed_and_save()로 이미 저장됨
        # 여기서는 혹시 누락된 경우를 위해 최종 한 번 더 저장
        state["processed_ids"] = list(processed_ids.keys())[-2000:]
        save_state(state)

        # 2분마다 최근 접수된 폴백 공시들을 '몇 주, 얼마, 지분율' 세부 데이터로 자동 상세화
        if now.minute % 2 == 0:
            asyncio.create_task(asyncio.to_thread(auto_enrich_fallback_alerts))

    except Exception as e:
        logger.error(f"[공시Monitor] DART 체크 오류: {e}")


def auto_enrich_fallback_alerts():
    """
    ⚡ DART 공시 접수 직후 수십 초 간은 금감원 서버의 변환 시차로 인해
    '자사주 보유 변동' 등 폴백 문구가 나갈 수 있습니다.
    접수 후 1~2분이 지나 금감원 DART 서버 생성이 완료되면,
    최근 30분 내의 폴백 알림들을 '누가(직책), 몇 주(수량), 얼마(금액), 변동 후 보유량(지분율)'으로
    자동 업그레이드하여 Firestore 알림센터에 갱신합니다.
    """
    try:
        from firebase_config import initialize_firebase
        from firebase_admin import firestore
        from dart_api_client import dart_api_client
        from market_tag_helper import get_stock_market_tag

        initialize_firebase()
        db = firestore.client()
        docs = db.collection("alerts").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(100).stream()

        for doc in docs:
            d = doc.to_dict()
            doc_id = doc.id
            title = d.get("title", "")
            body = d.get("body", "")
            rcept_no = d.get("rcept_no")
            symbol = d.get("symbol")

            is_fallback_ant = ("슈퍼개미" in title or "대량보유" in title) and ("대량보유 지분 변동 발생" in body or "지분 보유상황 변동이 발생" in body)
            is_fallback_insider = ("내부자" in title or "임원" in title) and ("자사주 보유 변동" in body or "주식 보유상황(매수/매도) 변동이 발생" in body)
            is_fallback_treasury = ("자사주" in title or "자사주" in body) and ("회사가 자기 주식 직접 매수" in body and "약" not in body and "취득 예정" not in body)

            if is_fallback_treasury and rcept_no:
                t_det = dart_api_client.get_treasury_stock_details(str(rcept_no))
                if t_det and (t_det.get("amount_str") or t_det.get("plan_shares", 0) > 0):
                    amt_info = f" {t_det['amount_str']}" if t_det.get('amount_str') else ""
                    stk_info = f" ({t_det['plan_shares']:,}주 취득 예정)" if t_det.get('plan_shares', 0) > 0 else ""
                    new_body = body.replace(
                        "자사주 매입 결정 공시! 회사가 자기 주식 직접 매수",
                        f"자사주 매입 결정 공시!{amt_info}{stk_info} 회사가 자기 주식 직접 매수"
                    )
                    db.collection("alerts").document(doc_id).update({"body": new_body})
                    logger.info(f"[auto_enrich] 자사주 취득 공시 금액/수량 보강 완료: {doc_id}")
                    continue

            if (is_fallback_ant or is_fallback_insider) and rcept_no and symbol:
                clean_code = str(symbol).strip().split('.')[0]
                market_tag = get_stock_market_tag(clean_code)
                corp_name = title.split(']')[-1].strip()
                rcept_dt = str(rcept_no)[:8] if len(str(rcept_no)) >= 8 else ""

                if is_fallback_ant:
                    new_title, new_body = format_super_ant_alert(market_tag, corp_name, clean_code, str(rcept_no), "", rcept_dt)
                else:
                    new_title, new_body = format_insider_alert(market_tag, corp_name, clean_code, str(rcept_no), "", rcept_dt)

                if "대량보유 지분 변동 발생" not in new_body and "자사주 보유 변동" not in new_body:
                    db.collection("alerts").document(doc_id).update({
                        "title": new_title,
                        "body": new_body
                    })
                    logger.info(f"[auto_enrich] 폴백 알림 실시간 수량/금액 상세 보강 완료: {doc_id} -> {new_title}")
    except Exception as e:
        logger.debug(f"[auto_enrich] Exception: {e}")



async def check_and_notify_sec_disclosures():
    """
    SEC EDGAR RSS 기반 해외 공시 실시간 체크 (5분마다)
    - 관심 해외종목 -> CIK 변환 -> 신규 SEC Filing 알림
    - SEC 공식 RSS 사용 (무료, 인증 불필요)
    """
    logger.info("[SEC Monitor] SEC 공시 체크 시작...")

    import pytz
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    weekday = now.weekday()  # 0=월, 1=화, 2=수, 3=목, 4=금, 5=토, 6=일
    hour = now.hour

    # [미국장/SEC 운영시간 엄격 적용] 한국 주간/오후 시간대(08:31 ~ 16:59 KST)는 미국장 및 SEC 공시 접수 마감 시간이므로
    # 오후 2시·4시 등 낮 시간에 SEC 공시가 발송되는 현상을 원천 차단하고, 미국 프리장~애프터장(17:00 ~ 익일 08:30 KST)에만 감시!
    is_us_hours_kst = (hour >= 17) or (hour < 8) or (hour == 8 and now.minute <= 30)
    is_us_trading_window = ((weekday < 5) and is_us_hours_kst) or (weekday == 5 and (hour < 8 or (hour == 8 and now.minute <= 30)))
    if not is_us_trading_window:
        logger.debug(f"[SEC Monitor] 미국 휴장/주간 시간 ({now.strftime('%a %H:%M')} KST), 해외 공시 알림 스킵.")
        return

    from db_manager import get_all_users, get_watchlist, get_user_fcm_tokens
    from firebase_config import send_multicast_notification
    from sec_api_client import get_cik_by_ticker
    import requests
    import xml.etree.ElementTree as ET
    
    def translate_sec_title(title: str) -> str:
        t = title.lower()
        if "4 - " in t and "beneficial ownership" in t:
            return "내부자 주식 매수/매도 (지분 변동) 📉📈"
        elif "13g" in t:
            return "대주주 지분 신고 (단순 투자) 🐳"
        elif "13d" in t:
            return "대주주 지분 신고 (경영 참여) 🐳"
        elif "10-q" in t and "quarterly" in t:
            return "분기 실적 보고서 📊"
        elif "10-k" in t and "annual" in t:
            return "연간 실적 보고서 📊"
        elif "8-k" in t and "current report" in t:
            return "주요 경영사항 발생 (수시공시) 📢"
        elif "14a" in t:
            return "주주총회 소집 공고 🏢"
        elif "s-8" in t:
            return "임직원 스톡옵션 (주식 보상) 🎁"
        elif "3 - " in t and "initial statement" in t:
            return "신규 내부자 지분 신고 👤"
            
        try:
            from deep_translator import GoogleTranslator
            return GoogleTranslator(source='en', target='ko').translate(title)
        except Exception:
            return title

    def get_sec_market_interpretation(title: str) -> str:
        t = title.lower()
        if "13f" in t:
            return "💡 [시장해석] 월가 슈퍼 기관들의 분기별 보유 포트폴리오 공개"
        elif "4 - " in t or "form 4" in t:
            return "💡 [시장해석] 미국 경영진/이사의 자사주 지분 변동 체크"
        elif "13d" in t:
            return "💡 [시장해석] 5%+ 대량 취득 및 경영 참여 · 행동주의 개입 가능성"
        elif "13g" in t:
            return "💡 [시장해석] 기관/큰손의 5%+ 대량 매집 · 단순 수급 유입 호재"
        elif "10-q" in t:
            return "💡 [시장해석] 미국 기업의 공식 분기 실적 발표"
        elif "10-k" in t:
            return "💡 [시장해석] 1년 종합 사업 성적표 및 감사 보고서"
        elif "8-k" in t:
            return "💡 [시장해석] M&A/주요계약/경영진 변경 등 중대 수시 이슈"
        elif "14a" in t:
            return "💡 [시장해석] 주주총회 소집 및 주요 안건 의결권 공고"
        elif "s-8" in t:
            return "💡 [시장해석] 임직원 스톡옵션 및 주식 보상 발행"
        elif "3 - " in t:
            return "💡 [시장해석] 신규 임원/주요주주의 최초 지분 등록"
        else:
            return "💡 [시장해석] 미국 SEC 공식 제출 공시 · 원문 확인 권장"

    try:
        state = load_state()
        sec_processed = dict.fromkeys(state.get("sec_processed_ids", []))

        # 모든 사용자의 해외 관심종목 수집 (중복 제거)
        users = get_all_users()
        foreign_watchlist = {}  # { symbol: [user_id, ...] }

        for user in users:
            uid = user.get('user_id') or user.get('id')
            if not uid:
                continue
            wl = get_watchlist(uid)
            for wl_item in wl:
                sym = wl_item[0] if isinstance(wl_item, tuple) else wl_item.get('symbol', '')
                # 해외 종목: 6자리 숫자가 아닌 영문 티커
                clean = sym.split('.')[0]
                if clean and not clean.isdigit():
                    if sym not in foreign_watchlist:
                        foreign_watchlist[sym] = []
                    foreign_watchlist[sym].append(uid)

        # [미국장 정규시간 핵심 주도주 및 포트폴리오 상시 모니터링 풀]
        # 사용자 개인 관심종목뿐만 아니라, 미국장을 주도하는 빅테크 및 자동매매 편입 종목들을 기본 감시 대상에 포함하여
        # 미국장 운영 시간 동안 실시간 SEC Form 4(내부자 매수/매도), Form 8-K(수시공시) 등이 실시간 포착되도록 확장
        CORE_US_WATCHLIST = [
            # 🇺🇸 뉴욕증권거래소 (NYSE) / S&P500 핵심 우량주
            "BRK-B", "JPM", "LLY", "WMT", "XOM", "V", "UNH", "DIS", "BA", "IBM", "GE", "KO", "MCD", "NKE",
            # 🇺🇸 나스닥 (NASDAQ) 빅테크 & 혁신 성장주
            "NVDA", "TSLA", "AAPL", "MSFT", "AMZN", "PLTR", "GOOGL", "META", "AMD",
            "ASTS", "SOFI", "SERV", "IONQ", "COIN", "ARM", "CRWD"
        ]
        for c_tkr in CORE_US_WATCHLIST:
            if c_tkr not in foreign_watchlist:
                foreign_watchlist[c_tkr] = []

        if not foreign_watchlist:
            logger.info("[SEC Monitor] 관심 해외종목 없음")
            return

        sent_count = 0
        headers = {"User-Agent": "StockTrendProgram/1.0 (rnfjr@dummy.com)"}

        for symbol, user_ids in foreign_watchlist.items():
            ticker = symbol.split('.')[0].upper()
            cik = get_cik_by_ticker(ticker)
            if not cik:
                continue

            # SEC EDGAR Atom RSS: 해당 CIK 최신 Filing 5건
            rss_url = (
                f"https://www.sec.gov/cgi-bin/browse-edgar"
                f"?action=getcompany&CIK={cik}&type=&dateb=&owner=include"
                f"&count=5&search_text=&output=atom"
            )
            try:
                res = requests.get(rss_url, headers=headers, timeout=8)
                if res.status_code != 200:
                    continue

                root = ET.fromstring(res.content)
                ns = {"atom": "http://www.w3.org/2005/Atom"}
                entries = root.findall("atom:entry", ns)

                # [폭탄 방지 1] 해당 티커의 과거 공시 5건 중 단 1건도 sec_processed에 없다면(초기화/신규등록 상태),
                # 과거 공시 5건이 한꺼번에 폭탄 발송되지 않도록 전부 조용히 읽음 처리(베이스라인 등록)만 하고 스킵!
                entry_ids_in_feed = [
                    e.findtext("atom:id", default="", namespaces=ns)
                    for e in entries
                    if e.findtext("atom:id", default="", namespaces=ns)
                ]
                if entry_ids_in_feed and not any(eid in sec_processed for eid in entry_ids_in_feed):
                    for eid in entry_ids_in_feed:
                        sec_processed[eid] = None
                    state["sec_processed_ids"] = list(sec_processed.keys())[-2000:]
                    save_state(state)
                    logger.info(f"[SEC Monitor] Baseline registered {len(entry_ids_in_feed)} existing filings for {ticker} (no spam sent)")
                    continue

                for entry in entries:
                    try:
                        entry_id = entry.findtext("atom:id", default="", namespaces=ns)
                        if not entry_id or entry_id in sec_processed:
                            continue

                        title_el = entry.findtext("atom:title", default="New Filing", namespaces=ns)
                        link_el = entry.find("atom:link", ns)
                        filing_url = link_el.get("href", "") if link_el is not None else ""
                        updated = entry.findtext("atom:updated", default="", namespaces=ns)

                        # [폭탄 방지 2] 공시 발표 시각(updated)이 최근 3시간 이내가 아니면(과거 공시이면) 발송하지 않고 즉시 읽음 처리!
                        is_fresh_filing = False
                        if updated:
                            try:
                                from datetime import timezone
                                upd_dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                                age_hours = (datetime.now(timezone.utc) - upd_dt).total_seconds() / 3600.0
                                if age_hours <= 3.0:
                                    is_fresh_filing = True
                            except Exception:
                                is_fresh_filing = False

                        # 발송 전에 먼저 처리 완료로 저장하여 어떠한 경우에도 중복/폭탄 발송 원천 차단
                        sec_processed[entry_id] = None
                        state["sec_processed_ids"] = list(sec_processed.keys())[-2000:]
                        save_state(state)

                        if not is_fresh_filing or sent_count >= 2:
                            continue

                        is_sec_whale = False
                        is_13f = "13F" in title_el
                        is_form4 = "4 - Statement of changes in beneficial ownership of securities" in title_el or "Form 4" in title_el
                        if is_13f or is_form4:
                            is_sec_whale = True

                        # 사용자 FCM 토큰 수집
                        from db_manager import get_user_fcm_tokens, get_all_fcm_tokens_with_user
                        all_tokens = []
                        target_uids = set(user_ids)
                        
                        safe_title_el = title_el.replace("[", "").replace("]", "").replace("|", "")
                        kor_title = translate_sec_title(safe_title_el)
                        
                        if is_sec_whale:
                            try:
                                from telegram_service import send_telegram_teaser
                                teaser_msg = f"🚨 <b>[{ticker}] SEC 세력/내부자 포착!</b>\n\n[미국 SEC 공시 속보]\n{kor_title}\n\n👉 <a href='https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(filing_url)}'>원문 확인하기</a>"
                                send_telegram_teaser(teaser_msg, skip_db_save=True)
                            except Exception as e:
                                logger.error(f"[SEC WhaleSiren] Telegram error: {e}")

                            try:
                                from firebase_admin import firestore
                                db = firestore.client()
                                event_data = {
                                    "type": "WHALE_ALERT",
                                    "corp": ticker,
                                    "title": kor_title,
                                    "code": ticker,
                                    "url": filing_url,
                                    "timestamp": firestore.SERVER_TIMESTAMP
                                }
                                db.collection("live_events").add(event_data)
                            except Exception as e:
                                logger.error(f"[SEC WhaleSiren] Firestore error: {e}")
                                
                            logger.info(f"[SEC WhaleSiren] Broadcasted event for {ticker}")
                            
                            # 글로벌 FCM 푸시 발송 (세력 알림 켠 모든 유저에게)
                            try:
                                from db_manager import get_all_fcm_tokens_with_user
                                whale_users = get_all_fcm_tokens_with_user(require_whale_alert=True)
                                if whale_users:
                                    w_tokens = [u[1] for u in whale_users]
                                    w_uids = [u[0] for u in whale_users]
                                    target_uids.update(w_uids)
                                    for t in w_tokens:
                                        all_tokens.append(t)
                            except Exception as e:
                                logger.error(f"[SEC WhaleSiren] Global FCM tokens error: {e}")

                        # [사용자 요청] SEC 공시는 전체 알림으로 설정
                        # 미국 증시 핵심 공시(Form 4, Form 8-K 등)는 모든 회원 대상 '전체 알림'으로 FCM 푸시 발송!
                        try:
                            from db_manager import get_all_fcm_tokens_with_user
                            all_users = get_all_fcm_tokens_with_user()
                            for u in all_users:
                                all_tokens.append(u[1])
                        except Exception as e:
                            logger.error(f"[SEC Monitor] Global FCM tokens error: {e}")
                        
                        # 중복 토큰 제거
                        all_tokens = list(set(all_tokens))

                        from market_tag_helper import get_stock_market_tag
                        from notification_intelligence import format_sec_intelligence
                        market_tag = get_stock_market_tag(ticker)
                        noti_title, noti_body, is_sec_whale_calc = format_sec_intelligence(
                            market_tag=market_tag,
                            ticker=ticker,
                            raw_title=safe_title_el
                        )
                        if is_sec_whale_calc:
                            is_sec_whale = True
                            
                        if updated:
                            try:
                                dt = datetime.fromisoformat(updated[:10])
                                if (datetime.now() - dt).days > 7:
                                    sec_processed[entry_id] = None
                                    continue
                                noti_body += f" 📅 {dt.strftime('%m월 %d일')}"
                            except Exception:
                                pass

                        data_payload = {
                            "type": "sec_disclosure",
                            "symbol": ticker,
                            "rcept_no": entry_id,
                            "url": f"/discovery?q={ticker}",
                            "dart_url": f"https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(filing_url)}",
                        }

                        # 1. 글로벌 알림 센터 무조건 저장 (is_global=True & target_users에 관심종목 등록 유저 보존)
                        try:
                            from firebase_config import save_alert_to_firestore
                            save_alert_to_firestore(
                                title=noti_title,
                                body=noti_body,
                                alert_type="sec_disclosure",
                                url=data_payload["url"],
                                is_global=True,
                                target_users=list(target_uids),
                                symbol=data_payload["symbol"],
                                dart_url=data_payload["dart_url"],
                                rcept_no=entry_id
                            )
                        except Exception as save_e:
                            logger.error(f"[SEC Monitor] DB 저장 오류: {save_e}")

                        if all_tokens:
                            data_payload["skip_db_save"] = True
                            logger.info(f"[SEC Monitor] {ticker} -> {len(all_tokens)}명: {title_el}")
                            send_multicast_notification(all_tokens, noti_title, noti_body, data_payload, target_users=list(target_uids), skip_db_save=True)
                            sent_count += 1
                            await asyncio.sleep(0.5)

                        # ✅ 모든 저장 및 발송이 성공한 직후에만 처리 완료 기록
                        sec_processed[entry_id] = None
                        state["sec_processed_ids"] = list(sec_processed.keys())[-2000:]
                        save_state(state)
                    except Exception as entry_e:
                        logger.error(f"[SEC Monitor] Error processing entry {entry_id} for {ticker}: {entry_e}")
                        continue

                await asyncio.sleep(1)  # SEC rate limit 준수 (초당 10회)

            except Exception as e:
                logger.warning(f"[SEC Monitor] {ticker} RSS 오류: {e}")

        logger.info(f"[SEC Monitor] 완료: {sent_count}건 SEC 공시 알림 발송")

        state["sec_processed_ids"] = list(sec_processed.keys())[-2000:]
        save_state(state)

    except Exception as e:
        logger.error(f"[SEC Monitor] SEC 체크 오류: {e}")


async def hourly_briefing_scheduler_loop():
    """
    매 정각 정기 브리핑 생성 (초경량 실시간 전용 모드)
    """
    global ANALYSIS_LOCK
    ANALYSIS_LOCK = asyncio.Lock()

    logger.info("[Resource-Clean] Hourly Scheduler Active.")
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    last_cleanup_date = ""

    # ✅ [재시작 중복방지] 마지막 실행 시각을 파일(state)에서 복원하여
    # 서버 재시작 후에도 같은 시간에 브리핑이 중복 생성되지 않도록 함
    _state = load_state()
    last_run_hour = _state.get("last_briefing_hour", -1)
    last_run_date = _state.get("last_briefing_date", "")

    while True:
        try:
            update_heartbeat("Hourly_Briefing")
            now = datetime.now(kst)
            current_hour = now.hour
            current_date = now.strftime("%Y-%m-%d")

            is_weekend = is_holiday("kor")

            # 비용 절감을 위해 매시간이 아닌 핵심 시간대(장 시작, 점심, 장 마감)에만 실행
            target_hours = [9, 12, 16]
            is_target_hour = current_hour in target_hours
            already_ran = (last_run_hour == current_hour and last_run_date == current_date)

            if not is_weekend and is_target_hour and not already_ran:
                logger.info(f"[Scheduler] Starting market briefing for: {current_hour}:00")
                from utils.global_briefing import generate_market_wide_briefing

                async with ANALYSIS_LOCK:
                    await asyncio.wait_for(
                        generate_market_wide_briefing(),
                        timeout=180.0
                    )
                last_run_hour = current_hour
                last_run_date = current_date
                # ✅ 실행 직후 상태 파일에 저장 (재시작 시 중복 방지)
                _state = load_state()
                _state["last_briefing_hour"] = last_run_hour
                _state["last_briefing_date"] = last_run_date
                save_state(_state)
                logger.info(f"[Scheduler] Task completed for {current_hour}:00")

            if current_hour == 2 and current_date != last_cleanup_date:
                from utils.briefing_store import cleanup_old_briefings
                cleanup_old_briefings()
                last_cleanup_date = current_date

            await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"[Scheduler] Loop error: {e}")
            await asyncio.sleep(60)


async def check_and_notify_ipos():
    """
    KIND / DART API 기반 IPO 신규/일정확정 실시간 체크 (30분마다)
    """
    logger.info("Starting IPO Check...")

    import pytz
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    # 주말(토/일)은 공모주 알림 스킵
    if now.weekday() >= 5:
        logger.debug("[IPO Monitor] 주말(토/일)에는 공모주 청약 알림을 발송하지 않습니다.")
        return

    from dart_ipo import fetch_dart_ipo_schedule
    from db_manager import get_fcm_tokens_for_ipo
    from firebase_config import send_multicast_notification

    IPO_STATE_FILE = "/tmp/ipo_state.json" if os.environ.get("VERCEL") else os.path.join(os.path.dirname(os.path.abspath(__file__)), "ipo_state.json")

    processed_ipos = []
    ipo_states = {}
    if os.path.exists(IPO_STATE_FILE):
        try:
            with open(IPO_STATE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                processed_ipos = data.get("processed_ipos", [])
                ipo_states = data.get("ipo_states", {})
                
                # Migration: if ipo_states is empty, populate from processed_ipos
                if not ipo_states and processed_ipos:
                    for name in processed_ipos:
                        ipo_states[name] = {"status": "INITIAL", "band": "미정", "date": "미정"}
        except Exception:
            pass

    try:
        ipos = await asyncio.to_thread(fetch_dart_ipo_schedule)

        new_ipos = []
        confirmed_ipos = []
        
        for ipo in ipos:
            ipo_name = ipo.get('name')
            band = ipo.get('band', '')
            schedule = ipo.get('date', '')
            
            if not ipo_name: continue
            
            is_confirmed = "미정" not in band and "미정" not in schedule and band != "" and schedule != ""
            
            if ipo_name not in ipo_states:
                # Completely new IPO
                new_ipos.append(ipo)
                ipo_states[ipo_name] = {
                    "status": "CONFIRMED" if is_confirmed else "INITIAL",
                    "band": band,
                    "date": schedule
                }
            else:
                # Already known IPO. Check if it transitioned from INITIAL to CONFIRMED
                state = ipo_states[ipo_name]
                if state.get("status") == "INITIAL" and is_confirmed:
                    # It got confirmed!
                    confirmed_ipos.append(ipo)
                    ipo_states[ipo_name] = {
                        "status": "CONFIRMED",
                        "band": band,
                        "date": schedule
                    }

        if new_ipos or confirmed_ipos:
            logger.info(f"Found {len(new_ipos)} new IPO(s) and {len(confirmed_ipos)} confirmed IPO(s). Sending notifications.")
            tokens = get_fcm_tokens_for_ipo()
            if tokens:
                # 1. Send New IPO alerts
                for ipo in new_ipos:
                    name = ipo.get('name')
                    band = ipo.get('band', '')
                    schedule = ipo.get('date', '')
                    underwriter = ipo.get('detail', '')

                    noti_title = f"🚀 {name} 신규 공모주 청약"
                    noti_body = f"💰 희망가: {band}원\n📅 청약일: {schedule}\n🏢 주관사: {underwriter}"
                    data_payload = {
                        "type": "IPO_ALERT",
                        "url": "/signals?tab=ipo"
                    }
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)

                    await asyncio.sleep(0.5)
                    
                # 2. Send Confirmed IPO alerts
                for ipo in confirmed_ipos:
                    name = ipo.get('name')
                    band = ipo.get('band', '')
                    schedule = ipo.get('date', '')
                    underwriter = ipo.get('detail', '')

                    noti_title = f"✅ {name} 공모 일정 확정!"
                    noti_body = f"💰 확정/희망가: {band}원\n📅 청약일: {schedule}\n🏢 주관사: {underwriter}"
                    data_payload = {
                        "type": "IPO_ALERT",
                        "url": "/signals?tab=ipo"
                    }
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    
                    await asyncio.sleep(0.5)

            # Limit state size to 1000 items (keep most recent)
            if len(ipo_states) > 1000:
                keys_to_keep = list(ipo_states.keys())[-1000:]
                ipo_states = {k: ipo_states[k] for k in keys_to_keep}
                
            with open(IPO_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump({"ipo_states": ipo_states}, f, ensure_ascii=False)
        else:
            logger.info("No new or confirmed IPOs found.")

    except Exception as e:
        logger.error(f"Scheduler Error in IPO Check: {e}")


async def disclosure_scheduler_loop():
    """
    공시 실시간 감시 루프
    - DART 국내 공시: 5분마다 체크
    - SEC 해외 공시: 5분마다 체크 (DART와 동시)
    - IPO 공모주: 30분마다 체크
    """
    logger.info("[공시Monitor] 공시 실시간 감시 루프 시작 (1분 실시간 주기)")

    # 서버 시작 직후 15초 대기 후 즉시 첫 공시 체크 실행
    await asyncio.sleep(15)

    ipo_check_counter = 0  # 1분 * 30 = 30분마다 IPO 체크

    while True:
        try:
            update_heartbeat("Disclosure_Monitor")

            # 국내 DART 공시 체크 (1분 주기 실시간)
            await check_and_notify_disclosures()

            # 해외 SEC 공시 체크 (미국장/프리장/애프터장 17:00~08:30 KST 전용)
            await check_and_notify_sec_disclosures()

            # IPO는 30분마다 (1분 * 30 = 30분)
            ipo_check_counter += 1
            if ipo_check_counter >= 30:
                await check_and_notify_ipos()
                ipo_check_counter = 0

            await asyncio.sleep(60)  # 1분 간격 실시간 조회

        except asyncio.CancelledError:
            logger.info("[공시Monitor] 공시 감시 루프 종료")
            break
        except Exception as e:
            logger.error(f"[공시Monitor] 루프 오류: {e}")
            await asyncio.sleep(60)


async def auto_blog_scheduler_loop():
    """
    매일 지정된 시간에 블로그 포스팅 봇을 자동 호출
    - KOR (국내장): 16:00
    - US (미국장): 07:00
    """
    logger.info("[AutoBlog] Auto Blog Scheduler Active.")
    import pytz
    import subprocess
    import sys
    kst = pytz.timezone('Asia/Seoul')
    import json
    state_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "auto_blog_state.json")
    
    def load_state():
        if os.path.exists(state_file):
            try:
                with open(state_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                pass
        return {"last_run_date_kor": "", "last_run_date_us": ""}
        
    def save_state(state):
        try:
            with open(state_file, "w", encoding="utf-8") as f:
                json.dump(state, f)
        except:
            pass

    state = load_state()
    
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "auto_blog_bot.py")

    while True:
        try:
            update_heartbeat("Auto_Blog_Bot")
            now = datetime.now(kst)
            current_date = now.strftime("%Y-%m-%d")
            
            # 오후 16시 정각 (한국장 마감 포스팅 & 장마감 텔레그램 브리핑)
            if now.hour == 16 and state.get("last_run_date_kor") != current_date:
                if not is_holiday("kor"):
                    logger.info("[AutoBlog] Triggering KOR market blog post & Telegram Closing Summary...")
                    await asyncio.to_thread(subprocess.run, [sys.executable, script_path, "kor"])
                    try:
                        from social_bot import generate_closing_summary, send_telegram_message
                        send_telegram_message(generate_closing_summary())
                    except Exception as e:
                        logger.error(f"[Telegram] Failed to send closing summary: {e}")
                state["last_run_date_kor"] = current_date
                save_state(state)
            
            # 오전 08시 정각 (미국장 마감/한국장 시작전 포스팅 & 아침 텔레그램 브리핑)
            if now.hour == 8 and state.get("last_run_date_us") != current_date:
                if not is_holiday("us"):
                    logger.info("[AutoBlog] Triggering US market blog post & Telegram Morning Briefing...")
                    await asyncio.to_thread(subprocess.run, [sys.executable, script_path, "us"])
                    try:
                        from social_bot import generate_morning_briefing, send_telegram_message
                        send_telegram_message(generate_morning_briefing())
                    except Exception as e:
                        logger.error(f"[Telegram] Failed to send morning briefing: {e}")
                state["last_run_date_us"] = current_date
                save_state(state)

            await asyncio.sleep(60) # 1분 대기
        except Exception as e:
            logger.error(f"[AutoBlog] Loop error: {e}")
            await asyncio.sleep(60)

async def seo_blog_scheduler_loop():
    """
    SEO 최적화 자동 포스팅 봇 스케줄러 (하루 N회 실행)
    - 매일 오전 10시, 오후 2시 등에 트래픽 확보를 위해 실행
    """
    logger.info("[SEOBlog] SEO Blog Scheduler Active.")
    import pytz
    import subprocess
    import sys
    kst = pytz.timezone('Asia/Seoul')
    last_run_hour = -1
    
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seo_blog_bot.py")

    while True:
        try:
            update_heartbeat("SEO_Blog_Bot")
            now = datetime.now(kst)
            
            # 비용 절감을 위해 하루 3번(아침, 점심, 저녁) 실행하도록 변경
            target_hours = [9, 13, 18]
            if now.hour in target_hours and last_run_hour != now.hour:
                logger.info(f"[SEOBlog] Triggering SEO blog post for hour {now.hour}...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_hour = now.hour

            await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"[SEOBlog] Loop error: {e}")
            await asyncio.sleep(60)

async def watchdog_scheduler_loop():
    """10분 주기로 시스템 워치독 실행"""
    logger.info("[Watchdog] System Watchdog Active. Checking every 10 mins.")
    import system_watchdog
    while True:
        try:
            await asyncio.to_thread(system_watchdog.run_health_checks)
            await asyncio.sleep(600) # 10분 대기
        except Exception as e:
            logger.error(f"[Watchdog] Loop error: {e}")
            await asyncio.sleep(60)

async def cleanup_alerts_scheduler_loop():
    """3일 지난 알림 데이터를 주기적으로 삭제 (6시간 주기)"""
    logger.info("[CleanupAlerts] Cleanup Alerts Loop Active. Checking every 6 hours.")
    from scheduler_service import delete_old_alerts
    while True:
        try:
            await asyncio.to_thread(delete_old_alerts)
            await asyncio.sleep(21600) # 6시간 대기
        except Exception as e:
            logger.error(f"[CleanupAlerts] Loop error: {e}")
            await asyncio.sleep(60)

async def cleanup_system_logs_scheduler_loop():
    """3일 지난 시스템 로그(알림 모니터링)를 주기적으로 삭제 (6시간 주기)"""
    logger.info("[CleanupSystemLogs] System Logs Cleanup Loop Active. Checking every 6 hours.")
    while True:
        try:
            from db_manager import cleanup_old_system_logs
            deleted = await asyncio.to_thread(cleanup_old_system_logs, 3)
            if deleted > 0:
                logger.info(f"[CleanupSystemLogs] Deleted {deleted} old system log records.")
            await asyncio.sleep(21600) # 6시간 대기
        except Exception as e:
            logger.error(f"[CleanupSystemLogs] Loop error: {e}")
            await asyncio.sleep(60)

async def google_indexer_scheduler_loop():
    """매일 새벽 2시에 구글 인덱서 실행"""
    logger.info("[GoogleIndexer] Google Indexer Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "google_indexer.py")
    last_run_day = -1
    
    while True:
        try:
            now = datetime.now()
            # 매일 새벽 2시에 한 번 실행
            if now.hour == 2 and last_run_day != now.day:
                logger.info(f"[GoogleIndexer] Triggering Google Indexing for today...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_day = now.day
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크 (자주 돌 필요 없음)
        except Exception as e:
            logger.error(f"[GoogleIndexer] Loop error: {e}")
            await asyncio.sleep(60)

async def dividend_alerts_scheduler_loop():
    """매일 저녁 18:00 KST에 배당락일 D-1 푸시 알림 실행"""
    logger.info("[DividendAlerts] Dividend Alerts Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dividend_alerts.py")
    last_run_day = -1
    
    # 시간대 처리
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            # 매일 오후 18시에 1번 실행 (18:00 ~ 18:59 사이 최초 도달 시)
            if now.hour == 18 and last_run_day != now.day:
                logger.info(f"[DividendAlerts] Triggering Dividend Alerts for today...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_day = now.day
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크
        except Exception as e:
            logger.error(f"[DividendAlerts] Loop error: {e}")
            await asyncio.sleep(60)

async def weekly_blog_bot_scheduler_loop():
    """매주 토요일 오전 9시 KST에 주간 증시 결산 블로그 포스팅 실행"""
    logger.info("[WeeklyBlog] Weekly Blog Bot Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weekly_blog_bot.py")
    last_run_week = -1
    
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            # 5: 토요일 (weekday()는 월요일이 0, 토요일이 5)
            # 오전 9시에 1번 실행 (09:00 ~ 09:59 사이)
            current_week = now.isocalendar()[1]
            if now.weekday() == 5 and now.hour == 9 and last_run_week != current_week:
                logger.info(f"[WeeklyBlog] Triggering Weekly Blog Posting for week {current_week}...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_week = current_week
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크
        except Exception as e:
            logger.error(f"[WeeklyBlog] Loop error: {e}")
            await asyncio.sleep(60)

async def weekend_report_scheduler_loop():
    """매주 토요일 오전 9시 30분 주말 리포트 생성, 10시에 푸시 알림"""
    logger.info("[WeekendReport] Weekend Report Scheduler Active.")
    last_run_gen_tag = ""
    last_run_week_push = -1
    
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            current_week = now.isocalendar()[1]
            
            # 1. 리포트 자동 생성:
            # - 주말 모드: 금요일 19시~일요일 중 1회 자동 실행 (차주 경제 일정 예습)
            # - 주중 모드: 월요일 오전 8시 이후 1회 자동 실행 (이번 주 경제 일정 브리핑)
            target_tag = None
            if (now.weekday() == 4 and now.hour >= 19) or (now.weekday() == 5 and now.hour >= 9) or (now.weekday() == 6):
                target_tag = f"{current_week}_weekend"
            elif now.weekday() == 0 and now.hour >= 8:
                target_tag = f"{current_week}_weekday"
                
            if target_tag and last_run_gen_tag != target_tag:
                logger.info(f"[WeekendReport] Generating reports for {target_tag}...")
                from utils.weekend_report import generate_weekend_report
                from utils.whale_weekend_report import generate_whale_weekend_report
                await generate_weekend_report()
                await generate_whale_weekend_report()
                last_run_gen_tag = target_tag
                
            # 2. 푸시 발송 (토요일 오전 10시 00분 ~ 10시 29분 사이 1회)
            if now.weekday() == 5 and now.hour == 10 and now.minute < 30 and last_run_week_push != current_week:
                logger.info(f"[WeekendReport] Sending push notifications for week {current_week}...")
                from firebase_config import send_multicast_notification
                from db_manager import get_all_fcm_tokens_with_user
                
                all_tokens = [t[1] for t in get_all_fcm_tokens_with_user()]
                if all_tokens:
                    push_title = "🚨 [주말 한정] 마켓 인사이트 발행 완료"
                    push_body = "지난주 시장 자금 흐름과 다음 주 핵심 일정을 지금 바로 확인하세요! (일요일 자정 삭제)"
                    push_data = {
                        "type": "weekend_report",
                        "url": "/weekend-report"
                    }
                    send_multicast_notification(all_tokens, push_title, push_body, data=push_data)
                    logger.info(f"[WeekendReport] Push sent to {len(all_tokens)} devices.")
                
                last_run_week_push = current_week
                
            await asyncio.sleep(60 * 15) # 15분 주기로 체크
        except Exception as e:
            logger.error(f"[WeekendReport] Loop error: {e}")
            await asyncio.sleep(60)

async def fomo_alert_scheduler_loop():
    """매일 저녁 8시(20시) FOMO 알림 발송"""
    logger.info("[FOMO] FOMO Alert Scheduler Active.")
    last_run_date = ""
    
    import pytz
    from datetime import datetime
    import asyncio
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            date_str = now.strftime("%Y-%m-%d")
            
            if now.hour == 20 and now.minute >= 0 and last_run_date != date_str:
                logger.info(f"[FOMO] Sending FOMO alert for {date_str}...")
                from scheduler_service import send_fomo_alert
                send_fomo_alert()
                last_run_date = date_str
                
            await asyncio.sleep(60 * 15) # 15분 마다 체크
        except Exception as e:
            logger.error(f"[FOMO] Loop error: {e}")
            await asyncio.sleep(60)

async def dormant_user_scheduler_loop():
    """매일 저녁 6시(18시) 휴면 유저 깨우기 알림 발송"""
    logger.info("[Dormant] Dormant User Alert Scheduler Active.")
    last_run_date = ""
    
    import pytz
    from datetime import datetime
    import asyncio
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            date_str = now.strftime("%Y-%m-%d")
            
            if now.hour == 18 and now.minute >= 0 and last_run_date != date_str:
                logger.info(f"[Dormant] Sending Dormant User alert for {date_str}...")
                from scheduler_service import send_dormant_user_alert
                send_dormant_user_alert()
                last_run_date = date_str
                
            await asyncio.sleep(60 * 15) # 15분 마다 체크
        except Exception as e:
            logger.error(f"[Dormant] Loop error: {e}")
            await asyncio.sleep(60)


async def whale_alert_scheduler_loop():
    """
    🇰🇷 국내 고래 알림 #1 - 외국인 순매수 1위
    장중(09:00~15:30 KST 평일) 30분마다 실행
    """
    logger.info("[Whale KR] Foreign Net Buying Scheduler Active.")

    import pytz
    from datetime import datetime
    kst = pytz.timezone('Asia/Seoul')

    while True:
        try:
            now = datetime.now(kst)
            weekday = now.weekday()
            hour = now.hour
            minute = now.minute

            is_market_hours = (weekday < 5) and (
                (hour == 9 and minute >= 0) or
                (10 <= hour <= 14) or
                (hour == 15 and minute <= 30)
            )

            if is_market_hours:
                logger.info("[Whale KR] Checking foreign net buying rank & upper limits...")
                try:
                    from whale_alerts import check_whale_alerts
                    check_whale_alerts()
                except Exception as e:
                    logger.error(f"[Whale KR] check_alerts error: {e}")
            else:
                logger.debug(f"[Whale KR] Outside market hours ({hour}:{minute:02d} KST), skipping.")

            await asyncio.sleep(60 * 30)  # 30분마다 체크
        except Exception as e:
            logger.error(f"[Whale KR] Loop error: {e}")
            await asyncio.sleep(60)


async def dart_whale_scheduler_loop():
    """
    🇰🇷 국내 고래 알림 #2 - DART 대량보유/임원내부자 거래
    평일 08:00~18:00 KST (공시 접수 시간) 5분마다 실행
    """
    logger.info("[Whale DART] DART Large Holding & Insider Scheduler Active.")

    import pytz
    from datetime import datetime
    kst = pytz.timezone('Asia/Seoul')

    while True:
        try:
            now = datetime.now(kst)
            weekday = now.weekday()
            hour = now.hour

            # 평일 08:00~18:00 (DART 공시 접수 시간)
            is_disclosure_hours = (weekday < 5) and (8 <= hour < 18)

            if is_disclosure_hours:
                logger.info("[Whale DART] Checking DART large holding & insider trading...")
                try:
                    from whale_alerts import check_large_holding_alerts, check_insider_trading_alerts
                    check_large_holding_alerts()
                    check_insider_trading_alerts()
                except Exception as e:
                    logger.error(f"[Whale DART] error: {e}")
            else:
                logger.debug(f"[Whale DART] Outside disclosure hours ({hour}:xx KST), skipping.")

            await asyncio.sleep(60 * 5)  # 5분마다 체크
        except Exception as e:
            logger.error(f"[Whale DART] Loop error: {e}")
            await asyncio.sleep(60)


async def sec_whale_scheduler_loop():
    """
    🇺🇸 미국 고래 알림 - SEC Form 4 (임원 내부자) + 13F (기관)
    KST 22:30~06:00 (미국 장시간) 5분마다 실행
    """
    logger.info("[Whale SEC] SEC Form4 & 13F Scheduler Active.")

    import pytz
    from datetime import datetime
    kst = pytz.timezone('Asia/Seoul')

    while True:
        try:
            now = datetime.now(kst)
            weekday = now.weekday()  # 0=월, 1=화, 2=수, 3=목, 4=금, 5=토, 6=일
            hour = now.hour

            # [미국장/SEC 운영시간 엄격 적용] 한국 낮/오후 시간대(08:31 ~ 16:59 KST)에는 절대 실행하지 않고,
            # 미국 프리장~본장~애프터장(17:00 ~ 익일 08:30 KST)에만 SEC Form 4 / 13F를 감시!
            is_us_hours_kst = (hour >= 17) or (hour < 8) or (hour == 8 and now.minute <= 30)
            is_us_trading_window = ((weekday < 5) and is_us_hours_kst) or (weekday == 5 and (hour < 8 or (hour == 8 and now.minute <= 30)))

            if is_us_trading_window:
                logger.info("[Whale SEC] Checking SEC Form4 & 13F filings...")
                try:
                    from sec_whale_alerts import check_sec_form4_alerts, check_sec_13f_alerts
                    check_sec_form4_alerts()
                    check_sec_13f_alerts()
                except Exception as e:
                    logger.error(f"[Whale SEC] error: {e}")
            else:
                logger.debug(f"[Whale SEC] 주말/미국 휴장 시간 ({now.strftime('%a %H:%M')} KST), 고래 알림 스킵.")

            await asyncio.sleep(60)  # 1분마다 실시간 체크 (DART와 동일한 1분 주기 실시간 반영)
        except Exception as e:
            logger.error(f"[Whale SEC] Loop error: {e}")
            await asyncio.sleep(60)


async def premium_report_scheduler_loop():
    """
    VIP 프리미엄 리포트(수급 통계) 자동 생성 스케줄러
    평일 15:45 KST (장 마감 직후) 1회 실행
    """
    import pytz
    import json
    import os
    from datetime import datetime
    
    kst = pytz.timezone('Asia/Seoul')
    logger.info("[Premium Report] Scheduler Active. Runs after 15:45 KST.")
    
    state_file = os.path.join(os.path.dirname(__file__), "premium_report_state.json")
    
    def load_state():
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return {}
        
    def save_state(state):
        try:
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f)
        except:
            pass

    while True:
        try:
            now = datetime.now(kst)
            weekday = now.weekday()
            current_date = now.strftime("%Y-%m-%d")
            
            # 평일 15:45 이후 실행
            if weekday < 5 and (now.hour > 15 or (now.hour == 15 and now.minute >= 45)):
                state = load_state()
                last_run = state.get("last_run_date", "")
                
                if last_run != current_date:
                    logger.info("[Premium Report] Generating today's objective report...")
                    try:
                        from daily_premium_generator import generate_objective_report
                        generate_objective_report()
                        
                        state["last_run_date"] = current_date
                        save_state(state)
                    except Exception as e:
                        logger.error(f"[Premium Report] Generation error: {e}")
            
            # 1분 단위 체크
            await asyncio.sleep(60)
                
        except Exception as e:
            logger.error(f"[Premium Report] Loop error: {e}")
            await asyncio.sleep(60)


async def calendar_alerts_scheduler_loop():
    """
    📅 실적·배당 캘린더 D-Day(D-7, D-1, 당일 아침) 다가옴 자동 알림 스케줄러
    평일 매일 08:30 KST (정규장 개장 30분 전) 1회 자동 실행
    """
    import pytz
    import os
    import json
    from datetime import datetime

    kst = pytz.timezone('Asia/Seoul')
    logger.info("[Calendar D-Day Alert] Scheduler Active. Runs daily at 08:30 KST.")

    state_file = os.path.join(os.path.dirname(__file__), "calendar_scheduler_state.json")

    def load_state():
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return {}

    def save_state(state):
        try:
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f)
        except:
            pass

    while True:
        import asyncio
        try:
            now = datetime.now(kst)
            weekday = now.weekday()
            current_date = now.strftime("%Y-%m-%d")

            # 평일 08:30 이후 실행 (주말 제외)
            if weekday < 5 and (now.hour > 8 or (now.hour == 8 and now.minute >= 30)):
                state = load_state()
                last_run = state.get("last_run_date", "")

                if last_run != current_date:
                    logger.info("[Calendar D-Day Alert] Triggering daily D-Day schedule scan...")
                    try:
                        from calendar_alerts import check_and_send_calendar_dday_alerts
                        await asyncio.to_thread(check_and_send_calendar_dday_alerts)

                        state["last_run_date"] = current_date
                        save_state(state)
                    except Exception as e:
                        logger.error(f"[Calendar D-Day Alert] Execution error: {e}")

            # 1분 단위 체크
            await asyncio.sleep(60)

        except Exception as e:
            logger.error(f"[Calendar D-Day Alert] Loop error: {e}")
            await asyncio.sleep(60)

