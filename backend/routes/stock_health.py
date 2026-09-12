# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException
from routes.seo import get_cached_stock_info, get_all_kospi_kosdaq
import urllib.parse
import logging
import re

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/stock-health/{ticker}")
def get_stock_health_check(ticker: str):
    """
    [자본시장법 준수] 초보자를 위한 5대 안전벨트 종목 건전성 자가진단 API
    공공 DART 공시 및 한국거래소 시세를 기반으로 5대 객관적 팩트를 채점합니다.
    (특정 종목의 매수/매도 권유나 투자 자문이 아닌 단순 정보제공 및 교육용 도구)
    """
    try:
        decoded_ticker = urllib.parse.unquote(ticker).strip()
        
        # 1. 기본 주식 정보 및 재무제표 획득
        info = get_cached_stock_info(decoded_ticker)
        if not info or info.get("status") == "error":
            raise HTTPException(status_code=404, detail="해당 종목의 데이터를 찾을 수 없습니다.")

        stock_name = info.get("name", decoded_ticker)
        resolved_ticker = info.get("ticker", decoded_ticker)
        price = info.get("price", 0)
        prev_close = info.get("previousClose", price)
        per = info.get("per", 0.0)
        pbr = info.get("pbr", 0.0)
        cap = info.get("marketCap", 0)
        financials = info.get("financials") or {}

        # -------------------------------------------------------------
        # 1. 실적 건전성 (영업이익 흑자 여부) - 20점 만점
        # -------------------------------------------------------------
        op_list = financials.get("operating_income", [])
        recent_op = None
        for val in reversed(op_list):
            if val is not None:
                recent_op = val
                break
        
        if recent_op is not None and recent_op > 0:
            op_score = 20
            op_status = "pass"
            op_headline = f"최근 영업이익 {recent_op:,.0f}억원 (흑자 유지)" if recent_op >= 1 else "최근 영업이익 흑자 유지"
            op_desc = "본업에서 실제로 돈을 벌고 있는 흑자 기업입니다. 적자 기업에 비해 유상증자나 감자 등 재무 악재 위험이 낮습니다."
            op_badge = "흑자 통과"
        elif recent_op is not None and recent_op <= 0:
            op_score = 0
            op_status = "fail"
            op_headline = f"최근 영업손실 {abs(recent_op):,.0f}억원 (적자 주의)" if abs(recent_op) >= 1 else "최근 영업이익 적자"
            op_desc = "본업에서 적자가 발생하고 있습니다. 초보자는 흑자 전환이 가시화될 때까지 신중한 접근이 권장됩니다."
            op_badge = "적자 주의"
        else:
            # 재무제표가 공시되지 않은 특수종목/신규상장 등
            op_score = 10
            op_status = "warn"
            op_headline = "영업이익 데이터 확인 중 (별도 공시 참조)"
            op_desc = "신규 상장사이거나 지주/금융사 특성으로 별도 재무 분석이 필요합니다."
            op_badge = "데이터 확인"

        # -------------------------------------------------------------
        # 2. 밸류에이션 거품 여부 (PER / PBR) - 20점 만점
        # -------------------------------------------------------------
        if per > 0 and per <= 35 and pbr <= 3.5:
            val_score = 20
            val_status = "pass"
            val_headline = f"PER {per:.1f}배 · PBR {pbr:.1f}배 (합리적 가치권)"
            val_desc = "기업의 주가가 실적과 자산 가치 대비 과도한 거품(버블) 없이 합리적인 가격대에 위치해 있습니다."
            val_badge = "적정 가치"
        elif per > 35 or pbr > 3.5:
            val_score = 10
            val_status = "warn"
            val_headline = f"PER {per:.1f}배 · PBR {pbr:.1f}배 (기대감 반영 고평가)"
            val_desc = "미래 성장성에 대한 기대감이 주가에 많이 선반영되어 있어, 실적이 뒷받침되지 않으면 변동성이 커질 수 있습니다."
            val_badge = "고평가 주의"
        elif per <= 0:
            val_score = 0
            val_status = "fail"
            val_headline = f"순손실로 인한 PER 산출 불가 (PBR {pbr:.1f}배)"
            val_desc = "당기순손실(적자)로 인해 PER 지표를 산출할 수 없는 구간입니다. 실적 개선 여부를 반드시 확인하세요."
            val_badge = "순손실 주의"
        else:
            val_score = 15
            val_status = "pass"
            val_headline = f"PBR {pbr:.1f}배 형성"
            val_desc = "자산 가치 기반 적정 수준을 유지하고 있습니다."
            val_badge = "가치 보통"

        # -------------------------------------------------------------
        # 3. 메이저 수급 기반 (시가총액 및 우량도) - 20점 만점
        # -------------------------------------------------------------
        # 대형/중형 우량주 기준 (시총 5000억 이상 또는 코스피/코스닥 대표 종목)
        if cap >= 1000000000000: # 1조 이상
            major_score = 20
            major_status = "pass"
            major_headline = f"시가총액 {cap // 100000000:,.0f}억원 (메이저 대형주)"
            major_desc = "기관과 외국인이 풍부한 유동성을 공급하는 대형 우량주로, 작전 세력의 시세 조작 위험이 낮습니다."
            major_badge = "대형 우량"
        elif cap >= 300000000000: # 3000억 이상
            major_score = 15
            major_status = "pass"
            major_headline = f"시가총액 {cap // 100000000:,.0f}억원 (중견 안정권)"
            major_desc = "적정 수준의 유동성과 시장의 관심을 유지하고 있어 비교적 안정적인 수급 환경입니다."
            major_badge = "중견 안정"
        elif cap > 0:
            major_score = 5
            major_status = "warn"
            major_headline = f"시가총액 {cap // 100000000:,.0f}억원 (소형주 주의)"
            major_desc = "시가총액이 작아 적은 자금으로도 주가가 출렁일 수 있으므로 급격한 호가 변동에 주의해야 합니다."
            major_badge = "소형주 주의"
        else:
            major_score = 10
            major_status = "warn"
            major_headline = "시가총액 집계 중"
            major_desc = "실시간 거래소 수급 현황을 함께 참고하세요."
            major_badge = "수급 관찰"

        # -------------------------------------------------------------
        # 4. 기술적 이격도 (과열도/상투 여부) - 20점 만점
        # -------------------------------------------------------------
        change_rate = 0.0
        if prev_close and prev_close > 0 and price > 0:
            change_rate = ((price - prev_close) / prev_close) * 100.0

        if change_rate >= 12.0:
            tech_score = 5
            tech_status = "warn"
            tech_headline = f"당일 변동폭 +{change_rate:.1f}% (단기 급등 과열)"
            tech_desc = "단기 시세가 가파르게 치솟아 차익 실현 매물이 쏟아질 수 있는 상투 주의 구간입니다. 눌림목을 기다리는 것이 안전합니다."
            tech_badge = "과열 주의"
        elif change_rate <= -10.0:
            tech_score = 10
            tech_status = "warn"
            tech_headline = f"당일 변동폭 {change_rate:.1f}% (단기 급락 추세)"
            tech_desc = "단기 하락 폭이 깊은 상태이므로 지지선 형성을 확인한 후 접근하는 것이 유리합니다."
            tech_badge = "낙폭 과대"
        else:
            tech_score = 20
            tech_status = "pass"
            tech_headline = f"단기 변동폭 {change_rate:+.1f}% (안정적 추세)"
            tech_desc = "비정상적인 단기 과열이나 투매 없이 안정적인 가격 흐름을 유지하고 있어 뇌동매매 위험이 낮습니다."
            tech_badge = "추세 안정"

        # -------------------------------------------------------------
        # 5. 재무 안정성 (부채비율) - 20점 만점
        # -------------------------------------------------------------
        debt_list = financials.get("debt_ratio", [])
        recent_debt = None
        for val in reversed(debt_list):
            if val is not None:
                recent_debt = val
                break

        if recent_debt is not None and recent_debt <= 120.0:
            debt_score = 20
            debt_status = "pass"
            debt_headline = f"부채비율 {recent_debt:.1f}% (재무 구조 매우 탄탄)"
            debt_desc = "기업의 빚(부채)이 자본 대비 매우 적어, 고금리 시기에도 금융 이자 부담 없이 든든한 안정성을 자랑합니다."
            debt_badge = "부채 건전"
        elif recent_debt is not None and recent_debt <= 200.0:
            debt_score = 15
            debt_status = "pass"
            debt_headline = f"부채비율 {recent_debt:.1f}% (적정 관리 수준)"
            debt_desc = "일반적인 제조업 및 기업 표준 범위 내에서 부채가 안정적으로 통제되고 있습니다."
            debt_badge = "부채 보통"
        elif recent_debt is not None and recent_debt > 200.0:
            debt_score = 0
            debt_status = "fail"
            debt_headline = f"부채비율 {recent_debt:.1f}% (과다 부채 주의)"
            debt_desc = "자본 대비 빚이 많아 이자 비용 부담이 큽니다. 유상증자나 전환사채(CB) 발행 등 주주가치 희석에 유의해야 합니다."
            debt_badge = "부채 주의"
        else:
            # 부채비율 미제공 (금융업 또는 신규상장)
            debt_score = 15
            debt_status = "pass"
            debt_headline = "부채비율 일반 표준 범위"
            debt_desc = "금융업 등 부채 산정 기준이 다른 업종이거나 공시 진행 중인 종목입니다."
            debt_badge = "표준 범위"

        # 총점 및 등급 계산 (100점 만점)
        total_score = op_score + val_score + major_score + tech_score + debt_score
        
        if total_score >= 85:
            grade_level = "S"
            grade_label = "최우수 5대 안전 우량군"
            grade_color = "emerald"
            grade_summary = "5대 핵심 안전벨트 기준을 모범적으로 통과한 재무 건전 최우수 기업입니다."
        elif total_score >= 70:
            grade_level = "A"
            grade_label = "양호 건전군"
            grade_color = "blue"
            grade_summary = "전반적인 건전성이 우수하나, 1개 지표의 관찰이 필요한 안정적인 종목입니다."
        elif total_score >= 50:
            grade_level = "B"
            grade_label = "주의 관찰군"
            grade_color = "amber"
            grade_summary = "수익성 또는 밸류에이션 등 일부 지표에 취약점이 있어 신중한 검토가 권장됩니다."
        else:
            grade_level = "C"
            grade_label = "고위험 경고군"
            grade_color = "rose"
            grade_summary = "적자 지속 또는 과도한 부채 등 리스크 요인이 많아 초보자에게는 높은 주의가 요구됩니다."

        return {
            "status": "success",
            "stockName": stock_name,
            "ticker": resolved_ticker,
            "currentPrice": price,
            "previousClose": prev_close,
            "totalScore": total_score,
            "grade": {
                "level": grade_level,
                "label": grade_label,
                "color": grade_color,
                "summary": grade_summary
            },
            "checklist": [
                {
                    "id": "earnings",
                    "category": "실적 건전성",
                    "question": "① 돈은 잘 벌고 있는가?",
                    "score": op_score,
                    "maxScore": 20,
                    "status": op_status,
                    "headline": op_headline,
                    "description": op_desc,
                    "badge": op_badge,
                    "icon": "Coins"
                },
                {
                    "id": "valuation",
                    "category": "가격 거품 여부",
                    "question": "② 바가지(거품)는 아닌가?",
                    "score": val_score,
                    "maxScore": 20,
                    "status": val_status,
                    "headline": val_headline,
                    "description": val_desc,
                    "badge": val_badge,
                    "icon": "Tag"
                },
                {
                    "id": "supply",
                    "category": "메이저 수급 기반",
                    "question": "③ 큰손이 함께하는 종목인가?",
                    "score": major_score,
                    "maxScore": 20,
                    "status": major_status,
                    "headline": major_headline,
                    "description": major_desc,
                    "badge": major_badge,
                    "icon": "Building2"
                },
                {
                    "id": "overheat",
                    "category": "기술적 과열도",
                    "question": "④ 꼭대기에 물릴 자리인가?",
                    "score": tech_score,
                    "maxScore": 20,
                    "status": tech_status,
                    "headline": tech_headline,
                    "description": tech_desc,
                    "badge": tech_badge,
                    "icon": "TrendingUp"
                },
                {
                    "id": "debt",
                    "category": "재무 부채 안정성",
                    "question": "⑤ 빚(부채) 폭탄 위험은 없는가?",
                    "score": debt_score,
                    "maxScore": 20,
                    "status": debt_status,
                    "headline": debt_headline,
                    "description": debt_desc,
                    "badge": debt_badge,
                    "icon": "ShieldCheck"
                }
            ],
            "disclaimer": "본 진단 결과는 금융감독원 전자공시(DART) 및 한국거래소(KRX)의 공개 팩트 데이터를 기계적으로 집계한 '투자자 자가 점검 및 금융 교육용 셀프 스캐너'입니다. 특정 종목의 매수·매도를 권유하거나 1:1 투자 자문을 제공하지 않으며, 모든 투자의 최종 판단과 손익 책임은 투자자 본인에게 있습니다."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in stock health check for {ticker}: {e}")
        return {"status": "error", "message": str(e)}
