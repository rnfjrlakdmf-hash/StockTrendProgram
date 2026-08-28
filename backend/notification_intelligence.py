# notification_intelligence.py
# Ultra-Clean, Compact & Institutional-Grade Notification Formatter (Free, 0-cost, 100% compliant)

def format_dart_intelligence(market_tag: str, corp: str, report_title: str, flr_nm: str = "", ant_details: dict = None, insider_details: dict = None) -> tuple:
    """
    DART 공시를 모바일 화면에 가장 깔끔하고 정갈하게 들어맞는 2줄 핵심 브리핑으로 변환합니다.
    Returns: (title, body, prefix_title, is_whale)
    """
    clean = report_title.replace(" ", "")
    is_super_ant = "대량보유" in clean
    is_insider = "임원" in clean or "주요주주" in clean
    
    # 1. 슈퍼개미 / 대량보유
    if is_super_ant:
        if ant_details and ant_details.get("direction"):
            reporter = ant_details.get("reporter", flr_nm or "대량보유자")
            direction = ant_details.get("direction", "변동")
            irds_qty = ant_details.get("irds_qty", 0)
            final_rate = ant_details.get("final_rate", 0.0)
            rate_irds = ant_details.get("rate_irds", 0.0)
            
            prefix_title = f"🐜 [슈퍼개미 {direction}]"
            title = f"{prefix_title} {market_tag} {corp}"
            
            qty_str = f" {irds_qty:,}주" if irds_qty > 0 else ""
            rate_str = f" ({rate_irds:+.2f}%p · 지분 {final_rate:.2f}%)" if final_rate > 0 else ""
            
            p1 = f"▪️ 📊 수급: {reporter} | {direction}{qty_str}{rate_str}"
            
            if "취득" in direction or "매수" in direction:
                p2 = "▪️ 💡 해석: 큰손 5%+ 집중 매집으로 유통 물량 감소 및 수급 결집 기대"
            elif "처분" in direction or "매도" in direction:
                p2 = "▪️ 💡 해석: 대량보유자 차익실현 및 지분 축소에 따른 단기 매물 주의"
            else:
                p2 = "▪️ 💡 해석: 담보 계약 및 지배구조 변동에 따른 지분 변동 신고"
                
            body = f"{p1}\n{p2}"
            return title, body, prefix_title, True
        else:
            prefix_title = "🚨 [슈퍼개미 포착]"
            title = f"{prefix_title} {market_tag} {corp}"
            reporter_str = flr_nm or "대량보유자"
            body = (
                f"▪️ 📊 수급: {reporter_str} 5%+ 대량 지분 변동 신고 접수\n"
                f"▪️ 💡 해석: 큰손의 포트폴리오 비중 조절 국면 · 세부 내역 확인 권장"
            )
            return title, body, prefix_title, True

    # 2. 임원 및 내부자 거래
    elif is_insider:
        if insider_details and insider_details.get("qty", 0) > 0:
            reporter = insider_details.get("reporter", flr_nm or "임원")
            t_type = insider_details.get("trans_type", "매매")
            qty = insider_details.get("qty", 0)
            rate = insider_details.get("hold_rate", "")
            
            prefix_title = f"🚨 [내부자 {t_type}]"
            title = f"{prefix_title} {market_tag} {corp}"
            
            rate_str = f" (지분 {rate}%)" if rate else ""
            p1 = f"▪️ 📊 수급: {reporter} | 자사주 {t_type} {qty:,}주{rate_str}"
            
            if t_type == "매수":
                p2 = "▪️ 💡 해석: 경영진 직접 매수로 사업 실적 및 기업 가치에 대한 강한 자신감 표명"
            else:
                p2 = "▪️ 💡 해석: 임원 지분 매도에 따른 차익실현 · 단기 고점 부담 점검 권장"
                
            body = f"{p1}\n{p2}"
            return title, body, prefix_title, True
        else:
            prefix_title = "🚨 [내부자 거래 포착]"
            title = f"{prefix_title} {market_tag} {corp}"
            body = (
                f"▪️ 📊 수급: {flr_nm or '회사 임원'} 자사주 지분 변동 공시 접수\n"
                f"▪️ 💡 해석: 내부 경영진 지분 매매는 기업 펀더멘털 평가의 핵심 지표"
            )
            return title, body, prefix_title, True

    # 3. 주요 특수 공시 (간결하고 핵심만 집약)
    if "자기주식소각" in clean:
        title = f"🔥 [자사주 소각] {market_tag} {corp}"
        body = (
            f"▪️ 📊 팩트: 자사주 영구 소각 결정 (발행 주식수 감축)\n"
            f"▪️ 💡 해석: 주당순이익(EPS)을 높이는 가장 강력한 주주환원 호재"
        )
        return title, body, "🔥 [자사주 소각]", True

    elif "자기주식취득" in clean:
        title = f"💰 [자사주 매입] {market_tag} {corp}"
        body = (
            f"▪️ 📊 팩트: 회사 자금을 통한 자기주식 직접 취득(매입) 결정\n"
            f"▪️ 💡 해석: 주가 저평가 판단에 따른 경영진의 주가 방어 및 주주가치 제고"
        )
        return title, body, "💰 [자사주 매입]", True

    elif "무상증자" in clean:
        title = f"🎁 [무상증자 결정] {market_tag} {corp}"
        body = (
            f"▪️ 📊 팩트: 기존 주주 대상 무상 신주 배정(무상증자) 공시\n"
            f"▪️ 💡 해석: 대표적 주주친화 정책 및 유통 주식수 확대로 거래 유동성 개선"
        )
        return title, body, "🎁 [무상증자]", True

    elif "단일판매" in clean:
        title = f"🚀 [대형 수주계약] {market_tag} {corp}"
        body = (
            f"▪️ 📊 팩트: 대규모 공급계약 및 단일판매 수주 체결 공시\n"
            f"▪️ 💡 해석: 전방 수요 증가에 따른 대형 수주 확보로 향후 분기 실적 성장 가시성 확보"
        )
        return title, body, "🚀 [대형 수주]", True

    elif "유상증자" in clean:
        title = f"⚠️ [유상증자 공시] {market_tag} {corp}"
        body = (
            f"▪️ 📊 팩트: 신주 발행을 통한 자본 확충(유상증자) 결정\n"
            f"▪️ 💡 해석: 자금 조달 목적 확인 필요 및 단기 신주 발행에 따른 지분 희석 주의"
        )
        return title, body, "⚠️ [유상증자]", True

    elif "감자결정" in clean:
        title = f"⚠️ [감자 결정] {market_tag} {corp}"
        body = (
            f"▪️ 📊 팩트: 자본금 감소(감자) 결정 공시 접수\n"
            f"▪️ 💡 해석: 재무구조 개선용 감자 여부 확인 필수 · 주가 변동성 확대 주의"
        )
        return title, body, "⚠️ [감자 결정]", True

    elif "상장폐지" in clean or "관리종목" in clean:
        title = f"🚨 [투자유의·위험] {market_tag} {corp}"
        body = (
            f"▪️ ⚠️ 경보: 상장폐지 사유 발생 또는 관리종목 지정 관련 공시\n"
            f"▪️ 💡 해석: 거래정지 및 심의 절차 가능성 대비 최고 수준 리스크 관리 필수"
        )
        return title, body, "🚨 [투자 유의]", True

    elif "횡령" in clean or "배임" in clean:
        title = f"🚨 [횡령·배임 발생] {market_tag} {corp}"
        body = (
            f"▪️ ⚠️ 경보: 임직원 횡령·배임 혐의 발생 공시 접수\n"
            f"▪️ 💡 해석: 기업 신뢰도 타격 및 상장적격성 실질심사 대상 여부 점검 필요"
        )
        return title, body, "🚨 [횡령·배임]", True

    elif "공개매수" in clean:
        title = f"💎 [공개매수 결정] {market_tag} {corp}"
        body = (
            f"▪️ 📊 팩트: 프리미엄 주식 공개매수 신고 공시 접수\n"
            f"▪️ 💡 해석: 경영권 분쟁 또는 지분 확대를 위한 주가 부양 기대"
        )
        return title, body, "💎 [공개매수]", True

    elif "경영권변경" in clean:
        title = f"🏢 [경영권 변경] {market_tag} {corp}"
        body = (
            f"▪️ 📊 팩트: 최대주주 및 경영권 변경 계약 체결 공시\n"
            f"▪️ 💡 해석: 지배구조 개편 및 신규 사업 추진 기대감"
        )
        return title, body, "🏢 [경영권 변경]", True

    else:
        title = f"📢 {market_tag} {corp} 공시 속보"
        body = (
            f"▪️ 📋 공시: {report_title}\n"
            f"▪️ 💡 해석: 신규 주요 공시 발생 · 원문 확인 권장"
        )
        return title, body, "📢 [공시 팩트]", False


def format_sec_intelligence(market_tag: str, ticker: str, raw_title: str) -> tuple:
    """
    미국 SEC 공시를 모바일 화면에 가장 간결하고 핵심만 집약한 2줄 포맷으로 변환합니다.
    Returns: (title, body, is_sec_whale)
    """
    t = raw_title.lower()
    is_form4 = "form 4" in t or ("4 - " in t and "beneficial" in t)
    is_13f = "13f" in t
    is_13d = "13d" in t
    is_13g = "13g" in t
    is_8k = "8-k" in t
    is_10q = "10-q" in t
    is_10k = "10-k" in t
    
    if is_form4:
        title = f"🚨 [SEC 내부자 매수] {market_tag} {ticker}"
        body = (
            f"▪️ 📊 수급: 미국 경영진/이사의 자사주 지분 변동 보고서(Form 4) 접수\n"
            f"▪️ 💡 해석: 내부 핵심 임원의 지분 매매는 기업 미래 실적에 대한 직접적인 스마트머니 시그널"
        )
        return title, body, True
    elif is_13f:
        title = f"🐳 [SEC 월가 헤지펀드] {market_tag} {ticker}"
        body = (
            f"▪️ 📊 수급: 글로벌 탑티어 기관투자자의 13F 분기 보유 포트폴리오 공시\n"
            f"▪️ 💡 해석: 월가 슈퍼 기관들의 분기별 포트폴리오 비중 조절 및 섹터 로테이션 파악"
        )
        return title, body, True
    elif is_13d:
        title = f"👑 [SEC 경영참여 지분신고] {market_tag} {ticker}"
        body = (
            f"▪️ 📊 수급: 5%+ 대량 취득 및 경영 참여 목적 Schedule 13D 접수\n"
            f"▪️ 💡 해석: 행동주의 펀드 또는 전략적 투자자(SI)의 경영 개입 및 주주가치 제고 요구"
        )
        return title, body, True
    elif is_13g:
        title = f"💎 [SEC 5%+ 대량보유] {market_tag} {ticker}"
        body = (
            f"▪️ 📊 수급: 단순 투자 목적의 5%+ 대량 지분 취득 Schedule 13G 접수\n"
            f"▪️ 💡 해석: 글로벌 대형 기관의 장기 펀더멘털 투자 유입으로 수급 안정성 확보"
        )
        return title, body, True
    elif is_8k:
        title = f"📢 [SEC 수시공시 8-K] {market_tag} {ticker}"
        body = (
            f"▪️ 📋 공시: M&A, 주요 계약, 경영진 교체 등 중대 수시 사안 보고\n"
            f"▪️ 💡 해석: 주가에 즉각적인 영향을 미치는 실시간 경영 이벤트"
        )
        return title, body, False
    elif is_10q or is_10k:
        report_type = "분기 실적(10-Q)" if is_10q else "연간 실적(10-K)"
        title = f"📊 [SEC {report_type}] {market_tag} {ticker}"
        body = (
            f"▪️ 📊 실적: 미국 SEC 공식 {report_type} 성적표 및 재무제표 공시\n"
            f"▪️ 💡 해석: 매출, 영업이익 및 가이던스 확인을 통한 밸류에이션 재평가 국면"
        )
        return title, body, False
    else:
        title = f"📢 {market_tag} {ticker} SEC 공시"
        body = (
            f"▪️ 📋 공시: {raw_title}\n"
            f"▪️ 💡 해석: 미국 증권거래위원회 공식 공시 접수 · 원문 확인 권장"
        )
        return title, body, False
