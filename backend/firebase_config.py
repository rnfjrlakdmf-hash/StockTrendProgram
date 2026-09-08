"""
Firebase Cloud Messaging Configuration
FCM 푸시 알림 설정 및 발송
"""

import firebase_admin
from firebase_admin import credentials, messaging, firestore
import os
from typing import Dict, List, Optional

# Firebase Admin SDK 초기화 상태
_firebase_initialized = False


import json

def initialize_firebase():
    """Firebase Admin SDK 초기화"""
    global _firebase_initialized
    
    if _firebase_initialized:
        return
    
    if firebase_admin._apps:
        _firebase_initialized = True
        return
    
    # 1. Try Environment Variable (Production)
    env_creds = os.environ.get('FIREBASE_CREDENTIALS')
    if env_creds:
        try:
            cred_dict = json.loads(env_creds)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            print("[Firebase] Admin SDK initialized via Environment Variable")
            return
        except Exception as e:
            print(f"[Firebase] Failed to load credentials from Env Var: {e}")

    # 2. Try Local File (Development)
    cred_path = os.path.join(os.path.dirname(__file__), 'firebase-adminsdk.json')
    
    if os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            print("[Firebase] Admin SDK initialized successfully from file")
        except Exception as e:
            print(f"[Firebase] Initialization failed from file: {e}")
    else:
        print("[Firebase] Warning: firebase-adminsdk.json not found and FIREBASE_CREDENTIALS not set")
        print("[Firebase] Push notifications will not work")


def is_night_time_kst() -> bool:
    """한국 표준시(KST) 기준 야간(21:00 ~ 08:00) 여부 확인"""
    from datetime import datetime
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    return now.hour >= 21 or now.hour < 8


def apply_disclosure_sentiment(title: str, body: str) -> str:
    """공시 제목을 바탕으로 비용 0원 룰 기반 호재/악재 색상 이모지를 붙입니다."""
    if any(emoji in title for emoji in ["🔴", "🔵", "⚪", "📈", "📉"]):
        return title

    good_keywords = ["단일판매", "공급계약", "무상증자", "소각", "자기주식취득", "현금ㆍ현물배당", "주식배당", "영업잠정실적"]
    bad_keywords = ["유상증자", "감자", "관리종목", "상장폐지", "부도", "소송", "불성실", "거래정지", "횡령", "배임", "파산", "회생"]
    
    search_text = (title + " " + body).replace(" ", "")
    is_good = any(k in search_text for k in good_keywords)
    is_bad = any(k in search_text for k in bad_keywords)
    
    if is_good and not is_bad:
        return f"🔴 [매출·주주환원] {title}"
    elif is_bad and not is_good:
        return f"🔵 [재무·리스크] {title}"
    else:
        return f"⚪ [일반공시] {title}"


def apply_news_sentiment(title: str, body: str) -> str:
    """뉴스 제목(body)을 바탕으로 비용 0원 룰 기반 호재/악재 색상 이모지를 타이틀에 추가합니다."""
    if any(emoji in title for emoji in ["🔴", "🔵"]):
        return title

    good_keywords = ["수주", "계약", "흑자전환", "최대실적", "어닝서프라이즈", "목표가상향", "목표가 상향", "승인", "성공", "돌파", "호실적", "수출"]
    bad_keywords = ["적자전환", "어닝쇼크", "목표가하향", "목표가 하향", "급락", "폭락", "우려", "리스크", "소송", "횡령", "배임", "하회", "쇼크"]
    
    search_text = body.replace(" ", "")
    is_good = any(k.replace(" ", "") in search_text for k in good_keywords)
    is_bad = any(k.replace(" ", "") in search_text for k in bad_keywords)
    
    if is_good and not is_bad:
        return f"🔴 {title}"
    elif is_bad and not is_good:
        return f"🔵 {title}"
    else:
        return title


def beautify_notification(title: str, body: str, data: Optional[Dict] = None) -> tuple:
    """
    모든 알림(공시, 시세 변동, 공모주, 수급, 뉴스, 시황 브리핑 등)을
    주식 초보자도 0.5초 만에 직관적으로 이해할 수 있는 친절한 3줄 구조와
    '💡 [시장해석]' 한 줄 분석으로 자동 변환합니다.
    (유사투자자문업 법적 리스크 방지: 객관적 팩트 전달 + 면책 문구 탑재)
    """
    if not title:
        title = "알림"
    if not body:
        body = ""

    alert_type = str((data or {}).get('type', '')).lower()
    clean_title = title.strip()
    clean_body = body.strip()

    # 자본시장법 준수 법적 면책 문구
    DISCLAIMER_TEXT = "※ 객관적 공시·시세 팩트 전달이며 투자 권유가 아닙니다."

    # 기존 본문에 [시장해석]이 이미 들어있는 경우 추출
    import re
    existing_interp = ""
    m_interp = re.search(r'💡\s*\[시장\s*해석\]\s*([^\n]+)', clean_body)
    if m_interp:
        existing_interp = m_interp.group(1).strip()

    # 1. DART 전자공시 속보 알림 및 임원/대주주 지분 변동
    if alert_type in ['disclosure_alert', 'dart_disclosure', 'insider_trading', 'large_holding'] or any(k in clean_title for k in ["공시", "내부자", "지분", "대량보유", "임원"]):
        company = (data or {}).get("corp") or (data or {}).get("company") or ""
        if not company:
            match = re.search(r'(?:[^\w\s]|\s)*([가-힣A-Za-z0-9]+)\s*(?:공시|SEC|속보)', clean_title)
            if match:
                company = match.group(1).strip()
            else:
                temp = re.sub(r'\[[^\]]+\]', ' ', clean_title)
                temp = re.sub(r'[🚨🔔👤🏛️📈📉⚡🔥💰⚠️📊🎉✨👥🐋]', ' ', temp).strip()
                m_comp = re.search(r'([가-힣A-Za-z0-9]{2,20})$', temp)
                if m_comp:
                    company = m_comp.group(1).strip()

        # 공시 보고서명 추출
        clean_no_interp = re.sub(r'💡\s*\[시장\s*해석\].*$', '', clean_body, flags=re.DOTALL)
        report_title = clean_no_interp.replace("📋", "").split("📅")[0].strip()

        if any(k in report_title for k in ["단일판매", "공급계약"]):
            new_title = f"💰 [공급계약 공시] {company}" if company else "💰 [대규모 공급계약 공시]"
            interp = existing_interp or "대형 수주 확보로 향후 매출 및 실적 성장 기대"
            new_body = (
                f"📌 타법인과 대규모 제품/용역 공급계약 체결 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["전환사채", "전환사채권", "CB"]):
            new_title = f"⚠️ [전환사채(CB) 발행] {company}" if company else "⚠️ [전환사채(CB) 발행 공시]"
            interp = existing_interp or "자금 조달 목적 확인 필요 · 향후 주식 희석 가능성 주의"
            new_body = (
                f"📌 자금 조달을 위한 전환사채(CB) 발행 결정 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["신주인수권부사채", "BW"]):
            new_title = f"⚠️ [신주인수권부사채(BW) 발행] {company}" if company else "⚠️ [신주인수권부사채(BW) 공시]"
            interp = existing_interp or "자금 조달 목적 확인 필요 · 향후 주식 희석 가능성 주의"
            new_body = (
                f"📌 자금 조달을 위한 신주인수권부사채(BW) 발행 결정 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["유상증자"]):
            new_title = f"⚠️ [유상증자 공시] {company}" if company else "⚠️ [유상증자 결정 공시]"
            interp = existing_interp or "자금 조달 목적 확인 필요 · 단기 신주 발행 희석 가능성 주의"
            new_body = (
                f"📌 자본 확충을 위한 유상증자(신주 발행) 결정 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["무상증자"]):
            new_title = f"🎉 [무상증자 발표] {company}" if company else "🎉 [무상증자 결정 공시]"
            interp = existing_interp or "대표적 주주친화 정책 · 유통 주식수 확대 호재"
            new_body = (
                f"📌 기존 주주에게 신주 무상 배정 결정 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["최대주주", "임원ㆍ주요주주", "소유주식변동", "임원", "지분", "보유"]) or any(k in clean_title for k in ["내부자", "지분", "주요주주", "대량보유"]):
            t_core = re.sub(r'^[👥🐋🚨🔔👤🏛️📈📉⚡🔥💰⚠️📊🎉✨\s]+', '', clean_title).strip()
            new_title = f"👤 {t_core}" if t_core else (f"👤 [임원/주요주주 지분변동] {company}" if company else "👤 [지분 변동 공시]")
            if "매수" in report_title or "취득" in report_title or "매수" in clean_title:
                interp = existing_interp or "대표/경영진의 자사주 매수 · 실적 자신감 및 책임 경영 신호"
            elif "매도" in report_title or "처분" in report_title or "매도" in clean_title:
                interp = existing_interp or "임원 지분 매도 · 차익실현 물량 여부 확인 필요"
            else:
                interp = existing_interp or "경영진/큰손 지분 구조 변화 · 세부 내역 확인 필요"
            
            raw_lines = [l.strip() for l in clean_no_interp.split('\n') if l.strip() and not any(l.strip().startswith(x) for x in ['💡', '※', '👉', '🔍'])]
            fact_line = " · ".join(raw_lines)
            if not fact_line or len(fact_line) < 3:
                fact_line = f"{company} 임원 또는 주요주주의 주식 보유상황 변동 접수" if company else "회사 임원 또는 주요주주의 주식 보유상황 변동 접수"
                
            new_body = (
                f"📌 {fact_line}\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["자기주식취득", "자사주취득"]):
            new_title = f"🔥 [자사주 취득 결정] {company}" if company else "🔥 [자사주 취득 공시]"
            interp = existing_interp or "주가 방어 및 주주가치 제고를 위한 긍정적 신호"
            new_body = (
                f"📌 회사가 자기 주식 직접 매수 결정 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["자기주식소각", "자사주소각"]):
            new_title = f"🔥 [자사주 소각 발표] {company}" if company else "🔥 [자사주 소각 공시]"
            interp = existing_interp or "발행 주식수 영구 감축 · 주당 가치 상승의 강력한 주주환원 호재"
            new_body = (
                f"📌 발행 주식수 영구 감축(소각) 결정 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["영업실적", "잠정실적", "분기보고서", "반기보고서", "사업보고서", "매출액또는손익구조"]):
            new_title = f"📊 [실적 발표 공시] {company}" if company else "📊 [경영 실적 발표 공시]"
            interp = existing_interp or "최근 경영 성적표 발표 · 시장 전망치(컨센서스) 부합 여부 확인"
            new_body = (
                f"📌 회사의 최근 경영 실적(매출/영업이익) 공시 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["배당", "현금ㆍ현물배당"]):
            new_title = f"💸 [배당 결정 발표] {company}" if company else "💸 [배당 공시]"
            interp = existing_interp or "주주 배당금 확정 · 안정적 배당 수익률 및 현금 흐름 신호"
            new_body = (
                f"📌 주주 배당금 지급 결정 공시 발표\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif any(k in report_title for k in ["소송", "고발", "횡령", "배임", "감자", "관리종목", "상장폐지", "불성실", "영업정지", "부도"]):
            new_title = f"⚠️ [투자 유의 공시] {company}" if company else "⚠️ [투자 유의 공시]"
            interp = existing_interp or "기업 신뢰도 및 경영 불확실성 발생 · 리스크 대응 주의"
            new_body = (
                f"📌 {report_title[:50]} 관련 중요 공시 접수\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        elif "sec" in clean_title.lower():
            new_title = f"🇺🇸 [美 SEC 공시 속보] {company}" if company else "🇺🇸 [美 SEC 주요 공시]"
            interp = existing_interp
            if not interp:
                if "13F" in report_title or "13F" in clean_title: interp = "월가 슈퍼 기관들의 분기별 보유 포트폴리오 공개"
                elif "Form 4" in report_title: interp = "미국 경영진/이사의 자사주 지분 변동 체크"
                elif "13D" in report_title: interp = "기관/큰손의 5%+ 대량 취득 및 경영 참여 이슈"
                elif "13G" in report_title: interp = "기관/큰손의 5%+ 대량 매집 · 단순 수급 유입"
                elif "10-Q" in report_title: interp = "미국 기업의 공식 분기 실적 발표"
                elif "10-K" in report_title: interp = "1년 종합 사업 성적표 및 감사 보고서"
                elif "8-K" in report_title: interp = "주요 계약/경영진 변경 등 중대 수시 이슈"
                else: interp = "미국 SEC 공식 제출 공시 · 원문 확인 권장"
            new_body = (
                f"📌 현지 금융당국(SEC) 주요 공시 보고서 접수\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

        else:
            new_title = f"📋 [DART 공시 속보] {company}" if company else f"📋 {clean_title}"
            safe_rep = report_title[:60] if report_title else clean_body[:60]
            interp = existing_interp or "신규 주요 공시 발생 · 세부 원문 확인 권장"
            new_body = (
                f"📌 {safe_rep}\n"
                f"💡 [시장해석] {interp}\n"
                f"{DISCLAIMER_TEXT}"
            )
            return sanitize_notification_text(new_title, new_body)

    # 2. 가격 급등 / 급락 / 52주 신고가 알림
    elif alert_type in ['auto_price_alert', 'price_alert'] or any(k in clean_title for k in ["급등", "급락", "신고가"]):
        company = ""
        m = re.search(r'\(([^)]+)\)', clean_title)
        if m:
            company = m.group(1).strip()

        # 기존 본문에서 [시장해석] 추출 또는 분리
        body_no_interp = re.sub(r'💡\s*\[시장\s*해석\].*$', '', clean_body, flags=re.DOTALL).strip()

        if "신고가" in clean_title:
            new_title = f"🏆 [52주 신고가 도달] {company}" if company else "🏆 [52주 신고가 도달]"
            interp = existing_interp or "최근 1년 최고가 돌파 · 강력한 상승 추세 지속 신호"
            new_body = f"{body_no_interp}\n💡 [시장해석] {interp}\n{DISCLAIMER_TEXT}"
            return sanitize_notification_text(new_title, new_body)
        elif "급락" in clean_title:
            new_title = f"📉 [단기 급락세 포착] {company}" if company else "📉 [단기 변동성 확대]"
            interp = existing_interp or "단기 매도세 확대로 지지선 점검 및 변동성 주의 필요"
            new_body = f"{body_no_interp}\n💡 [시장해석] {interp}\n{DISCLAIMER_TEXT}"
            return sanitize_notification_text(new_title, new_body)
        else:
            new_title = f"📈 [거래량·주가 급등] {company}" if company else "📈 [거래량·주가 급등 포착]"
            interp = existing_interp or "강한 매수세와 거래량 급증으로 단기 시장 관심 집중"
            new_body = f"{body_no_interp}\n💡 [시장해석] {interp}\n{DISCLAIMER_TEXT}"
            return sanitize_notification_text(new_title, new_body)

    # 3. 시간외 단일가 알림
    elif alert_type in ['stock_alert', 'after_hours'] or "시간외" in clean_title:
        company = ""
        match = re.search(r'(?:상한가|급등|포착|마감)*\s*([가-힣A-Za-z0-9]+)$', clean_title)
        if match:
            company = match.group(1).strip()
        body_no_interp = re.sub(r'💡\s*\[시장\s*해석\].*$', '', clean_body, flags=re.DOTALL).strip()
        new_title = f"🌙 [시간외 급등 마감] {company}" if company else clean_title
        interp = existing_interp or "장 마감 후 시간외 매수세 집중 유입 · 익일 시초가 주목"
        new_body = f"{body_no_interp}\n💡 [시장해석] {interp}\n{DISCLAIMER_TEXT}"
        return sanitize_notification_text(new_title, new_body)

    # 4. 공모주(IPO) 알림
    elif alert_type == 'ipo_alert' or "공모주" in clean_title or "IPO" in clean_title:
        if "확정" in clean_title:
            new_title = clean_title.replace("🚀", "✅")
        else:
            new_title = f"🚀 {clean_title.replace('🚀', '').strip()}"
        body_no_interp = re.sub(r'💡\s*\[시장\s*해석\].*$', '', clean_body, flags=re.DOTALL).strip()
        interp = existing_interp or "신규 공모주 상장 일정 · 공모가 및 주관사 확인"
        new_body = f"{body_no_interp}\n💡 [시장해석] {interp}\n{DISCLAIMER_TEXT}"
        return sanitize_notification_text(new_title, new_body)

    # 5. 수급 / 세력 고래 알림
    elif alert_type in ['whale_alert', 'surge'] or "수급" in clean_title or "고래" in clean_title:
        t_core = re.sub(r'^[👥🐋🚨🔔👤🏛️📈📉⚡🔥💰⚠️📊🎉✨\s]+', '', clean_title).strip()
        new_title = f"🐳 {t_core}" if t_core else clean_title
        body_no_interp = re.sub(r'💡\s*\[시장\s*해석\].*$', '', clean_body, flags=re.DOTALL).strip()
        interp = existing_interp or "오늘 장중 외국인/기관 스마트머니 집중 유입 포착"
        new_body = f"{body_no_interp}\n💡 [시장해석] {interp}\n{DISCLAIMER_TEXT}"
        return sanitize_notification_text(new_title, new_body)

    # 6. 뉴스 알림
    elif alert_type in ['news_alert', 'news_naver', 'news_google'] or "뉴스" in clean_title or "속보" in clean_title:
        new_title = apply_news_sentiment(clean_title, clean_body)
        body_no_interp = re.sub(r'💡\s*\[시장\s*해석\].*$', '', clean_body, flags=re.DOTALL).strip()
        interp = existing_interp or "주요 언론 보도 및 시장 관심 테마 이슈 포착"
        new_body = f"{body_no_interp}\n💡 [시장해석] {interp}\n{DISCLAIMER_TEXT}"
        return sanitize_notification_text(new_title, new_body)

    # 7. 장시작 / 장마감 / 브리핑 및 기타 모든 알림
    else:
        body_no_interp = re.sub(r'💡\s*\[시장\s*해석\].*$', '', clean_body, flags=re.DOTALL).strip()
        if "장시작" in clean_title:
            interp = existing_interp or "오늘 정규장 개장 · 주요 지수 및 개장 시초가 주목"
        elif "장마감" in clean_title:
            interp = existing_interp or "오늘 정규장 마감 · 일일 수급 및 종가 동향 정리"
        elif existing_interp:
            interp = existing_interp
        else:
            interp = "시장 핵심 데이터 변동 감지 · 세부 분석 확인"

        new_body = f"{body_no_interp}\n💡 [시장해석] {interp}\n{DISCLAIMER_TEXT}"
        return sanitize_notification_text(clean_title, new_body)


def sanitize_notification_text(title: str, body: str):
    """
    모바일 및 스마트워치(애플워치/갤럭시워치) 화면에서 글씨가 잘리지 않고 
    0.1초 만에 핵심 내용을 인지할 수 있도록 타이틀과 본문을 극도로 정교하게 요약하고 다듬습니다.
    스마트폰 및 스마트워치의 기본 확장 기능(Expandable Notification)을 해치지 않기 위해
    서버측 강제 자르기 한계를 대폭 완화하여 사용자가 전체 텍스트를 감상할 수 있게 합니다.
    """
    clean_title = title.strip() if title else "알림"
    clean_body = body.strip() if body else ""
    
    # 1. 스마트워치 및 모바일 공통 타이틀 슬림화
    if "장시작" in clean_title:
        market_name = "국내" if "국내" in clean_title else "미국" if "미국" in clean_title else ""
        clean_title = f"☀️ 장시작: {market_name}" if market_name else "☀️ 장시작 알림"
        
    elif "장마감" in clean_title:
        market_name = "국내" if "국내" in clean_title else "미국" if "미국" in clean_title else ""
        emoji = "📈" if "📈" in clean_title else "📉" if "📉" in clean_title else ""
        clean_title = f"🌕 장마감: {market_name} {emoji}".strip()
        
    elif "마켓 밸런스 브리핑" in clean_title:
        stock_part = clean_title.replace("⚖️", "").replace("AI", "").replace("마켓 밸런스 브리핑", "").strip()
        clean_title = f"⚖️ AI 브리핑: {stock_part}" if stock_part else "⚖️ AI 브리핑"

    # 일반 모바일 제목 길이 제한 완화 (충분히 한눈에 들어오도록 40자까지 허용)
    max_title_len = 40
    if len(clean_title) > max_title_len:
        clean_title = clean_title[:max_title_len - 2] + ".."

    # 2. 본문 다듬기 (스마트폰의 확장형 알림 지원을 위해 강제 자르기 길이 완화)
    if not clean_body:
        return clean_title, ""
        
    lines = clean_body.split("\n")
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # 뉴스 제목 및 속보의 전체 전달을 위해 한 줄 최대 길이를 150자로 대폭 완화 (워치/폰 확장 시 전체 감상 가능)
        if len(line) > 150:
            line = line[:147] + ".."
        cleaned_lines.append(line)
        
    # 스마트워치와 모바일 배너 알림 한도에 맞추어 최대 15줄까지만 허용 (기존 5줄에서 대폭 늘려 수익률과 종목이 보이게 함)
    max_lines = 15
    if len(cleaned_lines) > max_lines:
        cleaned_lines = cleaned_lines[:max_lines - 1] + ["💬 상세 내용은 앱에서 확인!"]
        
    clean_body = "\n".join(cleaned_lines)
    return clean_title, clean_body



def resolve_click_url(title: str, data: dict = None) -> str:
    """
    FCM 및 알림센터에서 알림 클릭 시 '통합 대시보드(/)'로 잘못 빠지지 않고
    공시/뉴스 원문 또는 해당 종목 분석창(/discovery?q=종목코드)으로 정확히 이동하도록 URL을 생성합니다.
    """
    if not data:
        data = {}

    import urllib.parse

    raw_url = str(data.get('url', '')).strip()
    symbol = str(data.get('symbol', '')).strip()
    clean_symbol = symbol.split('.')[0] if '.' in symbol else symbol
    dart_url = str(data.get('dart_url', '')).strip()
    news_url = str(data.get('news_url', '')).strip()
    notif_title = title.split('\n')[0] if title else ''

    # 1. DART 공시 원문 링크가 있는 경우 -> 경유 페이지(광고+카운트다운) 거쳐 원문 이동
    if dart_url:
        params = {'url': dart_url, 'type': 'disclosure'}
        if clean_symbol: params['symbol'] = clean_symbol
        if notif_title: params['title'] = notif_title
        click_url = f"/news-redirect?{urllib.parse.urlencode(params)}"
    # 2. 뉴스 기사 원문 링크가 있는 경우 -> 경유 페이지 거쳐 원문 이동
    elif news_url:
        params = {'url': news_url, 'type': 'news'}
        if clean_symbol: params['symbol'] = clean_symbol
        if notif_title: params['title'] = notif_title
        click_url = f"/news-redirect?{urllib.parse.urlencode(params)}"
    # 3. 명시적 url이 존재하고, 루트 메인('/')이 아닌 유의미한 상세 경로인 경우
    elif raw_url and raw_url not in ['/', 'https://stock-trend-program.co.kr', 'https://stock-trend-program.co.kr/', 'http://stock-trend-program.co.kr', 'http://stock-trend-program.co.kr/']:
        click_url = raw_url
    # 4. 종목 심볼이 있는 경우 -> 통합대시보드가 아닌 해당 종목 심층 분석창(/discovery?q=코드)으로 바로 진입
    elif clean_symbol:
        click_url = f"/discovery?q={clean_symbol}"
    # 5. 그 외의 경우 알림센터로 이동 (통합 대시보드로 떨어지지 않도록)
    else:
        click_url = "/alerts"

    if click_url and not click_url.startswith('http'):
        click_url = f'https://stock-trend-program.co.kr{click_url}'

    return click_url

def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict] = None,
    image_url: Optional[str] = None
) -> Dict:
    """
    FCM 푸시 알림 발송
    """
    if not _firebase_initialized:
        return {"success": False, "error": "Firebase not initialized"}

    # [Korea Compliance] 한국 정보통신망법 야간(21:00 ~ 08:00) 광고성 알림 발송 제한
    # 단, 가격 변동 알림(급등/급락/신고가/손절/익절/목표가)은 실시간 투자 정보로서 24시간 허용
    PRICE_ALERT_KEYWORDS = ["admin", "관리자", "analytics", "보고서",
                            "급등", "급락", "신고가", "목표", "손절", "익절",
                            "가격", "도달", "auto_price", "포착", "경신",
                            "장시작", "장마감", "시가", "결산", "시황",
                            "[test]", "connection verified"]
    is_price_or_admin = any(k in title.lower() for k in PRICE_ALERT_KEYWORDS)
    # [Update] 대표님 요청으로 야간 알림 제한 해제 (24시간 무조건 발송)
    # if is_night_time_kst() and not is_price_or_admin:
    #     print(f"[Firebase-NightBlock] Skipped sending notification during night time: {title}")
    #     return {"success": False, "error": "Night time restriction (21:00 - 08:00) active"}
    
    # [스마트 알림 자동 정돈] 초보자 친화 3줄 구조 + 쉬운 우리말 + 법적 면책 문구 탑재
    title, body = beautify_notification(title, body, data)
    
    try:
        # 알림 메시지 구성
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url
        )
        
        # [Fix] 클릭 시 통합대시보드(/)가 아닌 정확한 대상 링크로 이동
        click_url = resolve_click_url(title, data)
        fcm_tag = 'stock-trend-live-alert'
            
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='https://stock-trend-program.co.kr/icon.png',
                badge='https://stock-trend-program.co.kr/badge.png',
                vibrate=[200, 100, 200],
                tag=fcm_tag,
                renotify=True
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=click_url
            )
        )
        
        # Android 설정
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                color='#3B82F6',
                channel_id='price_alerts',
                priority='high',
                default_vibrate_timings=True,
                tag=fcm_tag
            )
        )
        
        # 메시지 생성 (WebPush 뱃지 정상 노출을 위해 data에 title/body 포함)
        safe_data = {k: str(v) for k, v in (data or {}).items()}
        safe_data['title'] = title
        safe_data['body'] = body
        safe_data['url'] = click_url

        message = messaging.Message(
            data=safe_data,
            token=token,
            android=android_config,
            apns=apns_config,
            webpush=webpush_config
        )
        
        # 발송
        response = messaging.send(message)
        print(f"[Firebase] Push sent successfully: {response}")
        return {"success": True, "response": response}
    
    except messaging.UnregisteredError:
        print(f"[Firebase] Token is invalid or unregistered. Deleting from DB.")
        try:
            from db_manager import delete_fcm_token
            delete_fcm_token(token)
        except Exception as e:
            print(f"[Firebase] Failed to delete invalid token from DB: {e}")
        return {"success": False, "error": "Invalid token"}
    
    except Exception as e:
        print(f"[Firebase] Push failed: {e}")
        # check if it is related to invalid/unregistered token
        err_str = str(e).lower()
        if "unregistered" in err_str or "notregistered" in err_str or "invalid" in err_str:
            try:
                from db_manager import delete_fcm_token
                delete_fcm_token(token)
            except Exception as delete_err:
                print(f"[Firebase] Failed to delete token on catch-all: {delete_err}")
        return {"success": False, "error": str(e)}


from firebase_admin import messaging, firestore

def get_db():
    try:
        return firestore.client()
    except Exception:
        return None

db = get_db()

def send_multicast_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict] = None,
    image_url: Optional[str] = None,
    target_users: Optional[List[str]] = None,
    skip_db_save: bool = False
) -> Dict:
    """여러 디바이스로 푸시 알림 전송 및 알림 센터 DB 저장"""
    if not _firebase_initialized:
        return {"success": False, "error": "Firebase not initialized"}

    if not tokens:
        print("[Firebase] No tokens provided for multicast")
        return {"success": False, "error": "No tokens provided"}

    # [스마트 알림 자동 정돈] 초보자 친화 3줄 구조 + 쉬운 우리말 + 법적 면책 문구 탑재
    title, body = beautify_notification(title, body, data)

    # 1. Firestore 알림 센터 저장 (skip_db_save 플래그 및 3분 중복 방지 캐시 지원)
    should_skip = skip_db_save or (data and str(data.get("skip_db_save", "")).lower() == "true")
    
    # 3분 이내 동일 제목/본문 중복 DB 저장 방지
    if not hasattr(send_multicast_notification, "_recent_saved_cache"):
        send_multicast_notification._recent_saved_cache = {}
    
    import time as _time
    _now = _time.time()
    # 공백 정규화 후 디듀프 키 생성
    import re
    _norm_body = re.sub(r'\s+', ' ', str(body).strip())[:50]
    _dedupe_key = f"{str(title).strip()}::{_norm_body}"
    if _now - send_multicast_notification._recent_saved_cache.get(_dedupe_key, 0) < 180:
        should_skip = True
        print(f"[Firebase-Dedupe] Suppressed duplicate Firestore save within 3m: {title}")
    else:
        send_multicast_notification._recent_saved_cache[_dedupe_key] = _now

    if not should_skip:
        try:
            db = firestore.client()
            alert_type_save = data.get("type", "system_alert") if data else "system_alert"
            if data and "is_global" in data:
                val = data["is_global"]
                is_global = str(val).lower() == "true" if isinstance(val, str) else bool(val)
            else:
                is_global = False if target_users else True
            
            # Firestore에 알림 데이터 저장 (정확한 click_url 사전 계산 저장)
            resolved_url = resolve_click_url(title, data)
            alert_doc = {
                "title": title,
                "body": body,
                "type": alert_type_save,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "is_global": is_global,
                "target_users": target_users or [],
                "url": resolved_url
            }
            
            if data:
                if "news_url" in data:
                    alert_doc["news_url"] = data["news_url"]
                if "symbol" in data:
                    alert_doc["symbol"] = data["symbol"]
                if "dart_url" in data:
                    alert_doc["dart_url"] = data["dart_url"]
                    
            db.collection("alerts").add(alert_doc)
            print(f"[Firestore] Alert saved to center: {title}")
        except Exception as e:
            print(f"[Firestore] Failed to save alert to center: {e}")

    # 중복 토큰 제거 (동일 기기 중복 발송 방지)
    if tokens:
        tokens = list(set(tokens))

    # [Korea Compliance] 한국 정보통신망법 야간(21:00 ~ 08:00) 광고성 알림 발송 제한
    # 단, 가격 변동 알림은 실시간 투자 정보로서 24시간 허용
    PRICE_ALERT_KEYWORDS = ["admin", "관리자", "analytics", "보고서",
                            "급등", "급락", "신고가", "목표", "손절", "익절",
                            "가격", "도달", "auto_price", "포착", "경신",
                            "장시작", "장마감", "시가", "결산", "시황",
                            "[test]", "connection verified"]
    is_price_or_admin = any(k in title.lower() for k in PRICE_ALERT_KEYWORDS)
    # [Update] 대표님 요청으로 야간 알림 제한 해제 (24시간 무조건 발송)
    # if is_night_time_kst() and not is_price_or_admin:
    #     print(f"[Firebase-NightBlock] Skipped multicast notification during night time: {title}")
    #     return {"success": False, "error": "Night time restriction (21:00 - 08:00) active"}
    
    if not tokens:
        return {"success": False, "error": "No tokens provided"}
    
    try:
        # data의 모든 값을 문자열로 강제 변환 (FCM 정책)
        safe_data = {}
        if data:
            for k, v in data.items():
                safe_data[k] = str(v)
                
        # 알림 메시지 구성
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url
        )
        
        # [Fix] 클릭 시 통합대시보드(/)가 아닌 정확한 대상 링크로 이동
        click_url = resolve_click_url(title, data)
        fcm_tag = 'stock-trend-live-alert'
            
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='https://stock-trend-program.co.kr/icon.png',
                badge='https://stock-trend-program.co.kr/badge.png',
                vibrate=[200, 100, 200],
                tag=fcm_tag,
                renotify=True
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=click_url
            )
        )
        
        # Android 설정 (네이티브 앱용 태그 및 뱃지/아이콘 추가)
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                color='#3B82F6',
                icon='ic_stat_notification',
                channel_id='price_alerts',
                priority='high',
                default_vibrate_timings=True,
                tag=fcm_tag
            )
        )
        
        # APNs 설정 (iOS)
        apns_config = messaging.APNSConfig(
            headers={'apns-priority': '10'},
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound='default', badge=1)
            )
        )
        
        # 개별 발송 (SDK 버전 호환성 최대화)
        success_count = 0
        failure_count = 0
        unregistered_count = 0
        
        for idx, token in enumerate(tokens):
            try:
                safe_data['title'] = title
                safe_data['body'] = body
                safe_data['url'] = click_url

                msg = messaging.Message(
                    data=safe_data,
                    token=token,
                    android=android_config,
                    apns=apns_config,
                    webpush=webpush_config
                )
                messaging.send(msg)
                success_count += 1
            except messaging.UnregisteredError:
                unregistered_count += 1
                print(f"[Firebase] Token {idx} is unregistered. Deleting from DB.")
                try:
                    from db_manager import delete_fcm_token
                    delete_fcm_token(token)
                except Exception as e:
                    print(f"[Firebase] Failed to delete unregistered token from DB: {e}")
            except Exception as token_err:
                error_msg = str(token_err)
                # invalid-registration-token, registration-token-not-registered 등 죽은 토큰 자동 삭제
                dead_token_keywords = [
                    'invalid-registration-token',
                    'registration-token-not-registered',
                    'invalid argument',
                    'requested entity was not found',
                    'senderId mismatch',
                    'invalid-recipient',
                    'not a valid fcm registration token'
                ]
                if any(kw in error_msg.lower() for kw in dead_token_keywords):
                    unregistered_count += 1
                    print(f"[Firebase] Token {idx} is invalid/dead ({error_msg[:60]}). Deleting from DB.")
                    try:
                        from db_manager import delete_fcm_token
                        delete_fcm_token(token)
                    except Exception as e:
                        print(f"[Firebase] Failed to delete dead token from DB: {e}")
                else:
                    failure_count += 1
                    print(f"[Firebase] Failed to send to token {idx}: {error_msg}")
                    try:
                        from db_manager import add_system_log
                        add_system_log(
                            level="ERROR", 
                            component="PushNotification", 
                            message=f"Failed to send alert '{title}' to a token.", 
                            details=error_msg
                        )
                    except Exception as log_err:
                        pass

        # 전체 발송 요약 로그 기록
        try:
            from db_manager import add_system_log
            if failure_count > 0:
                add_system_log(
                    level="WARNING" if success_count > 0 else "ERROR",
                    component="PushNotification",
                    message=f"Alert '{title}' sent with failures",
                    details=f"Success: {success_count}, Failure: {failure_count}, Cleaned Tokens: {unregistered_count}"
                )
            elif success_count > 0 or unregistered_count > 0:
                add_system_log(
                    level="INFO",
                    component="PushNotification",
                    message=f"Alert '{title}' sent successfully",
                    details=f"Success: {success_count}, Failure: 0, Cleaned Tokens: {unregistered_count}"
                )
        except Exception:
            pass
            
        print(f"[Firebase] Multicast completed. Success: {success_count}, Failure: {failure_count}, Unregistered: {unregistered_count}")

        return {
            "success": True if success_count > 0 else False,
            "success_count": success_count,
            "failure_count": failure_count
        }
    
    except Exception as e:
        print(f"[Firebase] Multicast failed: {e}")
        return {"success": False, "error": str(e)}


def send_price_alert_notification(
    tokens: List[str],
    symbol: str,
    alert_type: str,
    current_price: float,
    change_pct: float,
    message: str,
    user_id: Optional[str] = None
) -> Dict:
    """
    가격 알림 전용 푸시 발송 (스마트워치 완벽 대응 버전)
    """
    # 알림 타입별 이모지 및 타입명
    alert_info = {
        'stop_loss': ('🚨', '손절'),
        'take_profit': ('🎉', '익절'),
        'target_price': ('🎯', '목표')
    }
    
    emoji, type_name = alert_info.get(alert_type, ('🔔', '가격'))
    
    # 0.1초 만에 알 수 있도록 종목명을 타이틀에 포함!
    try:
        from stock_data import get_korean_stock_name, GLOBAL_KOREAN_NAMES
        stock_name = get_korean_stock_name(symbol) or GLOBAL_KOREAN_NAMES.get(symbol, symbol)
    except:
        stock_name = symbol
        
    title = f"{emoji} {type_name}: {stock_name}"
    
    # 본문의 가독성 극대화를 위해 현재가와 변동률을 본문 맨 앞줄에 배치!
    change_sign = "+" if change_pct > 0 else ""
    body_message = f"📉 {current_price:,.0f}원 ({change_sign}{change_pct:.2f}%)\n{message}"
    
    # 추가 데이터
    data = {
        "type": "price_alert",
        "symbol": symbol,
        "alert_type": alert_type,
        "current_price": str(current_price),
        "change_pct": str(change_pct),
        "url": f"/discovery?q={symbol}"
    }

    # Firestore에 목표가 알림 명시적으로 저장
    if user_id:
        try:
            db = firestore.client()
            db.collection("alerts").add({
                "title": title,
                "body": body_message,
                "type": "price_alert",
                "timestamp": firestore.SERVER_TIMESTAMP,
                "is_global": False,
                "target_users": [user_id]
            })
            print(f"[Firestore] Price Alert saved for {user_id}")
        except Exception as e:
            print(f"[Firestore] Failed to save price alert: {e}")
            




def send_topic_push(
    topic: str,
    title: str,
    body: str,
    link: str = "/"
) -> dict:
    """
    주제(Topic) 기반 푸시 알림 발송 (전체 알림 등에 사용)
    """
    if not _firebase_initialized:
        return {"success": False, "error": "Firebase not initialized"}
        
    try:
        from firebase_admin import messaging
        import urllib.parse
        
        # URL 처리
        if link and not link.startswith('http'):
            click_url = f'https://stock-trend-program.co.kr{link}'
        else:
            click_url = link
            
        title, body = sanitize_notification_text(title, body)
        
        # [고우선순위 설정] 핸드폰 꺼져있을때 깨우기
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                color='#3B82F6',
                channel_id='price_alerts'
            )
        )
        
        apns_config = messaging.APNSConfig(
            headers={'apns-priority': '10'},
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound='default', content_available=True, badge=1)
            )
        )
        
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon='https://stock-trend-program.co.kr/icon.png',
                badge='https://stock-trend-program.co.kr/badge.png',
                renotify=True
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=click_url
            )
        )
        
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            topic=topic,
            android=android_config,
            apns=apns_config,
            webpush=webpush_config
        )
        
        response = messaging.send(message)
        print(f"[Firebase] Successfully sent message to topic '{topic}': {response}")
        return {"success": True, "message_id": response}
    except Exception as e:
        print(f"[Firebase] Error sending topic message: {e}")
        return {"success": False, "error": str(e)}

def save_alert_to_firestore(title, body, alert_type="system_alert", url="/alerts", is_global=True, target_users=None):
    """
    푸시 발송 없이 Firestore 알림 센터에만 기록을 남깁니다.
    주로 텔레그램 공지사항 등을 웹앱 알림센터와 동기화할 때 사용합니다.
    """
    try:
        db = firestore.client()
        alert_doc = {
            "title": title,
            "body": body,
            "type": alert_type,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "is_global": is_global,
            "target_users": target_users or [],
            "url": url
        }
        db.collection("alerts").add(alert_doc)
        print(f"[Firestore] Alert saved to center (No push): {title}")
        return True
    except Exception as e:
        print(f"[Firestore] Failed to save alert to center: {e}")
        return False
