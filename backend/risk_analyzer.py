"""
Risk Analyzer (지뢰 탐지기)
위험 종목 사전 경고 시스템
"""

from typing import Dict, List, Optional
import yfinance as yf
from datetime import datetime, timedelta


def analyze_stock_risk(symbol: str) -> Dict:
    """
    종목의 위험도 분석
    
    Args:
        symbol: 종목 코드
    
    Returns:
        위험도 분석 결과
    """
    try:
        # yfinance로 데이터 가져오기
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # 위험 요인 분석
        risk_factors = []
        risk_score = 0
        
        # 1. 재무 위험도 분석
        financial_risk = analyze_financial_risk(info)
        risk_factors.extend(financial_risk["factors"])
        risk_score += financial_risk["score"]
        
        # 2. 수익성 분석
        profitability_risk = analyze_profitability(info)
        risk_factors.extend(profitability_risk["factors"])
        risk_score += profitability_risk["score"]
        
        # 3. 부채 분석
        debt_risk = analyze_debt(info)
        risk_factors.extend(debt_risk["factors"])
        risk_score += debt_risk["score"]
        
        # 4. 현금흐름 분석
        cashflow_risk = analyze_cashflow(ticker)
        risk_factors.extend(cashflow_risk["factors"])
        risk_score += cashflow_risk["score"]
        
        # 위험도 레벨 결정
        risk_level = get_risk_level(risk_score)
        
        return {
            "success": True,
            "symbol": symbol,
            "company_name": info.get("longName", symbol),
            "risk_score": min(risk_score, 100),  # 최대 100점
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "recommendation": get_recommendation(risk_level),
            "analyzed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"분석 중 오류 발생: {str(e)}"
        }


def analyze_financial_risk(info: Dict) -> Dict:
    """재무 상태 위험도 분석"""
    factors = []
    score = 0
    
    # 시가총액 체크
    market_cap = info.get("marketCap", 0)
    if market_cap < 100_000_000_000:  # 1000억 미만
        factors.append({
            "type": "재무",
            "severity": "중",
            "description": f"시가총액 {market_cap/100_000_000:.0f}억원 (소형주 리스크)"
        })
        score += 10
    
    # 자본잠식 체크
    book_value = info.get("bookValue", 0)
    if book_value < 0:
        factors.append({
            "type": "재무",
            "severity": "고",
            "description": "자본잠식 상태 (장부가치 마이너스)"
        })
        score += 30
    elif book_value < 1000:
        factors.append({
            "type": "재무",
            "severity": "중",
            "description": "낮은 장부가치 (재무 건전성 우려)"
        })
        score += 15
    
    return {"factors": factors, "score": score}


def analyze_profitability(info: Dict) -> Dict:
    """수익성 분석"""
    factors = []
    score = 0
    
    # 영업이익률
    profit_margins = info.get("profitMargins", 0)
    if profit_margins < -0.1:  # -10% 이하
        factors.append({
            "type": "수익성",
            "severity": "고",
            "description": f"영업이익률 {profit_margins*100:.1f}% (대규모 적자)"
        })
        score += 25
    elif profit_margins < 0:
        factors.append({
            "type": "수익성",
            "severity": "중",
            "description": f"영업이익률 {profit_margins*100:.1f}% (적자)"
        })
        score += 15
    
    # ROE (자기자본이익률)
    roe = info.get("returnOnEquity", 0)
    if roe < -0.2:  # -20% 이하
        factors.append({
            "type": "수익성",
            "severity": "고",
            "description": f"ROE {roe*100:.1f}% (자본 효율성 매우 낮음)"
        })
        score += 20
    
    return {"factors": factors, "score": score}


def analyze_debt(info: Dict) -> Dict:
    """부채 분석"""
    factors = []
    score = 0
    
    # 부채비율
    debt_to_equity = info.get("debtToEquity", 0)
    if debt_to_equity > 300:  # 300% 이상
        factors.append({
            "type": "부채",
            "severity": "고",
            "description": f"부채비율 {debt_to_equity:.0f}% (과도한 부채)"
        })
        score += 25
    elif debt_to_equity > 200:
        factors.append({
            "type": "부채",
            "severity": "중",
            "description": f"부채비율 {debt_to_equity:.0f}% (높은 부채)"
        })
        score += 15
    
    # 유동비율
    current_ratio = info.get("currentRatio", 0)
    if current_ratio < 1.0:  # 100% 미만
        factors.append({
            "type": "부채",
            "severity": "고",
            "description": f"유동비율 {current_ratio*100:.0f}% (단기 지급능력 부족)"
        })
        score += 20
    
    return {"factors": factors, "score": score}


def analyze_cashflow(ticker) -> Dict:
    """현금흐름 분석"""
    factors = []
    score = 0
    
    try:
        # 현금흐름표 가져오기
        cashflow = ticker.cashflow
        
        if not cashflow.empty:
            # 영업활동 현금흐름
            operating_cashflow = cashflow.loc["Operating Cash Flow"].iloc[0] if "Operating Cash Flow" in cashflow.index else 0
            
            if operating_cashflow < 0:
                factors.append({
                    "type": "현금흐름",
                    "severity": "고",
                    "description": "영업활동 현금흐름 마이너스 (현금 창출 능력 부족)"
                })
                score += 20
    except:
        pass  # 데이터 없으면 스킵
    
    return {"factors": factors, "score": score}


def get_risk_level(score: int) -> str:
    """위험도 점수를 레벨로 변환"""
    if score >= 70:
        return "매우 위험"
    elif score >= 40:
        return "위험"
    elif score >= 20:
        return "주의"
    else:
        return "안전"


def get_recommendation(risk_level: str) -> str:
    """위험도 레벨별 추천 메시지"""
    recommendations = {
        "안전": "✅ 재무적으로 안정적인 기업입니다.",
        "주의": "⚠️ 일부 위험 요인이 있으니 신중한 투자가 필요합니다.",
        "위험": "🚨 높은 위험도! 투자 전 충분한 검토가 필요합니다.",
        "매우 위험": "🔴 폭발 위험! 상장폐지 또는 대규모 손실 가능성이 있습니다."
    }
    return recommendations.get(risk_level, "")


def get_risk_emoji(risk_level: str) -> str:
    """위험도 레벨별 이모지"""
    emojis = {
        "안전": "🟢",
        "주의": "🟡",
        "위험": "🟠",
        "매우 위험": "🔴"
    }
    return emojis.get(risk_level, "⚪")


def analyze_news_risk(symbol: str, news_data: List[Dict]) -> Dict:
    """
    뉴스 기반 리스크 분석
    
    Args:
        symbol: 종목 코드
        news_data: 뉴스 데이터 리스트
    
    Returns:
        뉴스 리스크 분석 결과
    """
    risk_keywords = {
        "매우 위험": ["횡령", "배임", "분식회계", "상장폐지", "관리종목", "거래정지", "파산", "회생절차"],
        "위험": ["적자", "감사의견", "부적정", "의견거절", "유상증자", "자본잠식"],
        "주의": ["실적 악화", "영업손실", "구조조정", "감원"]
    }
    
    factors = []
    score = 0
    
    for news in news_data[:10]:  # 최근 10개 뉴스만 분석
        title = news.get("title", "").lower()
        
        for severity, keywords in risk_keywords.items():
            for keyword in keywords:
                if keyword in title:
                    factors.append({
                        "type": "뉴스",
                        "severity": severity,
                        "description": f"최근 뉴스: {keyword} 관련 보도",
                        "title": news.get("title", "")
                    })
                    
                    if severity == "매우 위험":
                        score += 30
                    elif severity == "위험":
                        score += 20
                    elif severity == "주의":
                        score += 10
                    
                    break  # 하나의 키워드만 매칭
    
    return {"factors": factors, "score": score}


def generate_detailed_report(symbol: str, risk_analysis: Dict, news_data: Optional[List[Dict]] = None) -> str:
    """
    AI용 상세 리포트 생성
    
    Args:
        symbol: 종목 코드
        risk_analysis: 위험도 분석 결과
        news_data: 뉴스 데이터 (선택)
    
    Returns:
        상세 리포트 텍스트
    """
    report = f"""
# {risk_analysis['company_name']} ({symbol}) 위험도 분석 리포트

## 종합 위험도
- **위험 점수**: {risk_analysis['risk_score']}/100
- **위험 등급**: {get_risk_emoji(risk_analysis['risk_level'])} {risk_analysis['risk_level']}
- **추천**: {risk_analysis['recommendation']}

## 위험 요인 상세

"""
    
    # 위험 요인별 그룹화
    factors_by_type = {}
    for factor in risk_analysis['risk_factors']:
        factor_type = factor['type']
        if factor_type not in factors_by_type:
            factors_by_type[factor_type] = []
        factors_by_type[factor_type].append(factor)
    
    for factor_type, factors in factors_by_type.items():
        report += f"### {factor_type}\n"
        for factor in factors:
            severity_emoji = "🔴" if factor['severity'] == "고" else "🟡" if factor['severity'] == "중" else "🟢"
            report += f"- {severity_emoji} {factor['description']}\n"
        report += "\n"
    
    # 뉴스 리스크 추가
    if news_data:
        news_risk = analyze_news_risk(symbol, news_data)
        if news_risk['factors']:
            report += "### 최근 뉴스 리스크\n"
            for factor in news_risk['factors'][:5]:  # 상위 5개만
                report += f"- 🔴 {factor['description']}\n"
                report += f"  > {factor['title']}\n"
            report += "\n"
    
    report += f"\n분석 시각: {risk_analysis['analyzed_at']}\n"
    
    return report


# ============================================================
# Company Health Score (회사 건강도 점수)
# ============================================================

def calculate_health_score(symbol: str) -> Dict:
    """
    회사 건강도 점수 계산 (0-100)
    재무제표를 단일 점수와 캐릭터로 시각화
    
    Args:
        symbol: 종목 코드
    
    Returns:
        건강도 점수 결과
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        score = 0
        details = {}
        breakdown = {}
        
        # 1. 수익성 평가 (30점)
        profitability_result = evaluate_profitability_score(info)
        score += profitability_result["score"]
        details["profitability"] = profitability_result
        
        # 2. 안정성 평가 (30점)
        stability_result = evaluate_stability_score(info)
        score += stability_result["score"]
        details["stability"] = stability_result
        
        # 3. 성장성 평가 (20점)
        growth_result = evaluate_growth_score(ticker)
        score += growth_result["score"]
        details["growth"] = growth_result
        
        # 4. 현금흐름 평가 (20점)
        cashflow_result = evaluate_cashflow_score(ticker)
        score += cashflow_result["score"]
        details["cashflow"] = cashflow_result
        
        # 건강 등급 결정
        health_grade = get_health_grade(score)
        character = get_health_character(health_grade)
        message = get_health_message(health_grade)
        color = get_health_color(health_grade)
        
        return {
            "success": True,
            "symbol": symbol,
            "company_name": info.get("longName", symbol),
            "score": round(score, 1),
            "grade": health_grade,
            "character": character,
            "message": message,
            "color": color,
            "details": details,
            "analyzed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"건강도 분석 중 오류 발생: {str(e)}"
        }


def evaluate_profitability_score(info: Dict) -> Dict:
    """수익성 평가 (30점)"""
    score = 0
    breakdown = {}
    
    # 영업이익률 (15점)
    profit_margins = info.get("profitMargins", 0)
    if profit_margins >= 0.1:  # 10% 이상
        profit_score = 15
    elif profit_margins >= 0.05:  # 5-10%
        profit_score = 10
    elif profit_margins >= 0:  # 0-5%
        profit_score = 5
    else:  # 마이너스
        profit_score = 0
    
    score += profit_score
    breakdown["profit_margin"] = {
        "value": round(profit_margins * 100, 2),
        "score": profit_score,
        "max": 15
    }
    
    # ROE (15점)
    roe = info.get("returnOnEquity", 0)
    if roe >= 0.15:  # 15% 이상
        roe_score = 15
    elif roe >= 0.1:  # 10-15%
        roe_score = 10
    elif roe >= 0.05:  # 5-10%
        roe_score = 5
    else:  # 5% 미만
        roe_score = 0
    
    score += roe_score
    breakdown["roe"] = {
        "value": round(roe * 100, 2),
        "score": roe_score,
        "max": 15
    }
    
    return {
        "score": score,
        "max": 30,
        "breakdown": breakdown,
        "label": "수익성"
    }


def evaluate_stability_score(info: Dict) -> Dict:
    """안정성 평가 (30점)"""
    score = 0
    breakdown = {}
    
    # 부채비율 (15점)
    debt_to_equity = info.get("debtToEquity", 0)
    if debt_to_equity <= 50:  # 50% 이하
        debt_score = 15
    elif debt_to_equity <= 100:  # 50-100%
        debt_score = 10
    elif debt_to_equity <= 200:  # 100-200%
        debt_score = 5
    else:  # 200% 이상
        debt_score = 0
    
    score += debt_score
    breakdown["debt_to_equity"] = {
        "value": round(debt_to_equity, 2),
        "score": debt_score,
        "max": 15
    }
    
    # 유동비율 (15점)
    current_ratio = info.get("currentRatio", 0)
    if current_ratio >= 2.0:  # 200% 이상
        current_score = 15
    elif current_ratio >= 1.5:  # 150-200%
        current_score = 10
    elif current_ratio >= 1.0:  # 100-150%
        current_score = 5
    else:  # 100% 미만
        current_score = 0
    
    score += current_score
    breakdown["current_ratio"] = {
        "value": round(current_ratio, 2),
        "score": current_score,
        "max": 15
    }
    
    return {
        "score": score,
        "max": 30,
        "breakdown": breakdown,
        "label": "안정성"
    }


def evaluate_growth_score(ticker) -> Dict:
    """성장성 평가 (20점)"""
    score = 0
    breakdown = {}
    
    try:
        # 재무제표 가져오기
        financials = ticker.financials
        
        if not financials.empty and len(financials.columns) >= 2:
            # 매출 성장률 (10점)
            if "Total Revenue" in financials.index:
                revenue_current = financials.loc["Total Revenue"].iloc[0]
                revenue_previous = financials.loc["Total Revenue"].iloc[1]
                
                if revenue_previous != 0:
                    revenue_growth = ((revenue_current - revenue_previous) / abs(revenue_previous)) * 100
                    
                    if revenue_growth >= 20:
                        revenue_score = 10
                    elif revenue_growth >= 10:
                        revenue_score = 7
                    elif revenue_growth >= 0:
                        revenue_score = 4
                    else:
                        revenue_score = 0
                    
                    score += revenue_score
                    breakdown["revenue_growth"] = {
                        "value": round(revenue_growth, 2),
                        "score": revenue_score,
                        "max": 10
                    }
            
            # 영업이익 성장률 (10점)
            if "Operating Income" in financials.index:
                income_current = financials.loc["Operating Income"].iloc[0]
                income_previous = financials.loc["Operating Income"].iloc[1]
                
                if income_previous != 0:
                    income_growth = ((income_current - income_previous) / abs(income_previous)) * 100
                    
                    if income_growth >= 20:
                        income_score = 10
                    elif income_growth >= 10:
                        income_score = 7
                    elif income_growth >= 0:
                        income_score = 4
                    else:
                        income_score = 0
                    
                    score += income_score
                    breakdown["income_growth"] = {
                        "value": round(income_growth, 2),
                        "score": income_score,
                        "max": 10
                    }
    except:
        pass  # 데이터 없으면 0점
    
    return {
        "score": score,
        "max": 20,
        "breakdown": breakdown,
        "label": "성장성"
    }


def evaluate_cashflow_score(ticker) -> Dict:
    """현금흐름 평가 (20점)"""
    score = 0
    breakdown = {}
    
    try:
        cashflow = ticker.cashflow
        
        if not cashflow.empty:
            # 영업활동 현금흐름 (10점)
            if "Operating Cash Flow" in cashflow.index:
                operating_cf = cashflow.loc["Operating Cash Flow"].iloc[0]
                
                if operating_cf > 0:
                    cf_score = 10
                    breakdown["operating_cashflow"] = {
                        "value": "플러스",
                        "score": cf_score,
                        "max": 10
                    }
                    score += cf_score
                else:
                    breakdown["operating_cashflow"] = {
                        "value": "마이너스",
                        "score": 0,
                        "max": 10
                    }
            
            # 잉여현금흐름 (10점)
            if "Free Cash Flow" in cashflow.index:
                free_cf = cashflow.loc["Free Cash Flow"].iloc[0]
                
                if free_cf > 0:
                    fcf_score = 10
                    breakdown["free_cashflow"] = {
                        "value": "플러스",
                        "score": fcf_score,
                        "max": 10
                    }
                    score += fcf_score
                else:
                    breakdown["free_cashflow"] = {
                        "value": "마이너스",
                        "score": 0,
                        "max": 10
                    }
    except:
        pass  # 데이터 없으면 0점
    
    return {
        "score": score,
        "max": 20,
        "breakdown": breakdown,
        "label": "현금흐름"
    }


def get_health_grade(score: float) -> str:
    """점수를 등급으로 변환"""
    if score >= 90:
        return "슈퍼 튼튼"
    elif score >= 70:
        return "건강함"
    elif score >= 50:
        return "보통"
    elif score >= 30:
        return "비실비실"
    else:
        return "위험"


def get_health_character(grade: str) -> str:
    """등급별 캐릭터 이모지"""
    characters = {
        "슈퍼 튼튼": "💪",
        "건강함": "😊",
        "보통": "😐",
        "비실비실": "🤒",
        "위험": "💀"
    }
    return characters.get(grade, "😐")


def get_health_message(grade: str) -> str:
    """등급별 메시지"""
    messages = {
        "슈퍼 튼튼": "이 회사는 돈도 잘 벌고 빚도 없어요! 아주 튼튼해요.",
        "건강함": "건강한 회사예요. 안정적으로 수익을 내고 있어요.",
        "보통": "그럭저럭 괜찮아요. 하지만 주의 깊게 지켜봐야 해요.",
        "비실비실": "요즘 적자가 나서 몸이 안 좋아요. 조심하세요.",
        "위험": "매우 위험해요! 투자하지 마세요."
    }
    return messages.get(grade, "")


def get_health_color(grade: str) -> str:
    """등급별 색상"""
    colors = {
        "슈퍼 튼튼": "green",
        "건강함": "blue",
        "보통": "yellow",
        "비실비실": "orange",
        "위험": "red"
    }
    return colors.get(grade, "gray")

