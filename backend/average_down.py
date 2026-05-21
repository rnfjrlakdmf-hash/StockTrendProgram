"""
Average Down Calculator (물타기 계산기)
평단가 하락 계산 및 최적 물타기 전략 제공
"""

from typing import Dict, List, Optional
import math


def calculate_average_down(
    current_shares: int,
    current_avg_price: float,
    current_price: float,
    additional_amount: float
) -> Dict:
    """
    물타기 계산 (평단가 하락 시뮬레이션)
    
    Args:
        current_shares: 현재 보유 주식 수
        current_avg_price: 현재 평단가
        current_price: 현재 시장가
        additional_amount: 추가 투자 금액
    
    Returns:
        계산 결과 딕셔너리
    """
    # 입력 검증
    if current_shares <= 0 or current_avg_price <= 0 or current_price <= 0 or additional_amount <= 0:
        return {"error": "모든 값은 0보다 커야 합니다."}
    
    # 현재 총 투자금
    current_investment = current_shares * current_avg_price
    
    # 현재 손실률
    current_loss_rate = ((current_price - current_avg_price) / current_avg_price) * 100
    
    # 현재 평가금액
    current_value = current_shares * current_price
    
    # 현재 손실금액
    current_loss = current_value - current_investment
    
    # 추가 매수 가능 주식 수
    additional_shares = int(additional_amount // current_price)
    
    # 실제 사용될 금액 (단주 제외)
    actual_additional_amount = additional_shares * current_price
    
    # 새로운 평단가
    new_avg_price = (current_investment + actual_additional_amount) / (current_shares + additional_shares)
    
    # 새로운 총 투자금
    new_total_investment = current_investment + actual_additional_amount
    
    # 손익분기점까지 필요한 상승률
    breakeven_rate = ((new_avg_price - current_price) / current_price) * 100
    
    # 손익분기 가격
    breakeven_price = new_avg_price
    
    # 추가 투자 비율
    additional_ratio = (actual_additional_amount / current_investment) * 100
    
    # 평단가 하락폭
    avg_price_reduction = current_avg_price - new_avg_price
    avg_price_reduction_rate = (avg_price_reduction / current_avg_price) * 100
    
    return {
        "success": True,
        "current": {
            "shares": current_shares,
            "avg_price": round(current_avg_price, 2),
            "market_price": round(current_price, 2),
            "investment": round(current_investment, 2),
            "value": round(current_value, 2),
            "loss": round(current_loss, 2),
            "loss_rate": round(current_loss_rate, 2)
        },
        "additional": {
            "amount": round(actual_additional_amount, 2),
            "shares": additional_shares,
            "ratio": round(additional_ratio, 2)
        },
        "result": {
            "new_avg_price": round(new_avg_price, 2),
            "total_shares": current_shares + additional_shares,
            "total_investment": round(new_total_investment, 2),
            "breakeven_price": round(breakeven_price, 2),
            "breakeven_rate": round(breakeven_rate, 2),
            "avg_price_reduction": round(avg_price_reduction, 2),
            "avg_price_reduction_rate": round(avg_price_reduction_rate, 2)
        },
        "message": generate_message(breakeven_rate, avg_price_reduction_rate, additional_ratio)
    }


def generate_message(breakeven_rate: float, reduction_rate: float, additional_ratio: float) -> str:
    """결과 메시지 생성"""
    if breakeven_rate < 1:
        return f"✅ 1% 미만 상승으로 손익분기! 평단가 {reduction_rate:.1f}% 하락"
    elif breakeven_rate < 3:
        return f"✅ {breakeven_rate:.1f}% 상승 시 손익분기! 평단가 {reduction_rate:.1f}% 하락"
    elif breakeven_rate < 5:
        return f"📊 {breakeven_rate:.1f}% 상승 필요. 평단가 {reduction_rate:.1f}% 하락"
    elif breakeven_rate < 10:
        return f"⚠️ {breakeven_rate:.1f}% 상승 필요. 추가 투자 비율이 높습니다 ({additional_ratio:.0f}%)"
    else:
        return f"🚨 {breakeven_rate:.1f}% 상승 필요. 물타기보다 손절 고려 권장"


def calculate_multiple_scenarios(
    current_shares: int,
    current_avg_price: float,
    current_price: float,
    max_budget: float,
    num_scenarios: int = 5
) -> List[Dict]:
    """
    여러 시나리오 동시 계산
    
    Args:
        current_shares: 현재 보유 주식 수
        current_avg_price: 현재 평단가
        current_price: 현재 시장가
        max_budget: 최대 예산
        num_scenarios: 시나리오 개수
    
    Returns:
        시나리오 리스트
    """
    scenarios = []
    
    # 현재 투자금 계산
    current_investment = current_shares * current_avg_price
    
    for i in range(1, num_scenarios + 1):
        # 예산을 균등 분할
        additional_amount = (max_budget / num_scenarios) * i
        
        result = calculate_average_down(
            current_shares,
            current_avg_price,
            current_price,
            additional_amount
        )
        
        if result.get("success"):
            # 리스크 레벨 계산
            risk_level = calculate_risk_level(
                additional_amount,
                current_investment,
                result["result"]["breakeven_rate"]
            )
            
            scenarios.append({
                "name": f"시나리오 {i}",
                "additional_amount": round(additional_amount, 2),
                "result": result["result"],
                "risk_level": risk_level,
                "recommendation": get_recommendation(risk_level)
            })
    
    return scenarios


def calculate_risk_level(additional_amount: float, current_investment: float, breakeven_rate: float) -> str:
    """리스크 레벨 계산"""
    ratio = (additional_amount / current_investment) * 100
    
    if ratio > 200 or breakeven_rate > 15:
        return "매우 위험"
    elif ratio > 100 or breakeven_rate > 10:
        return "위험"
    elif ratio > 50 or breakeven_rate > 5:
        return "주의"
    elif ratio > 20:
        return "보통"
    else:
        return "안전"


def get_recommendation(risk_level: str) -> str:
    """리스크 레벨별 추천 메시지"""
    recommendations = {
        "안전": "✅ 안전한 물타기 비율입니다.",
        "보통": "📊 적절한 물타기 비율입니다.",
        "주의": "⚠️ 신중한 판단이 필요합니다.",
        "위험": "🚨 높은 리스크! 분할 매수 권장",
        "매우 위험": "🔴 매우 위험! 물타기보다 손절 고려"
    }
    return recommendations.get(risk_level, "")


def calculate_optimal_ratio(
    current_shares: int,
    current_avg_price: float,
    current_price: float,
    target_breakeven_rate: float = 5.0
) -> Dict:
    """
    목표 손익분기율을 달성하기 위한 최적 투자금 계산
    
    Args:
        current_shares: 현재 보유 주식 수
        current_avg_price: 현재 평단가
        current_price: 현재 시장가
        target_breakeven_rate: 목표 손익분기율 (%)
    
    Returns:
        최적 투자금 정보
    """
    # 목표 평단가 계산
    target_avg_price = current_price * (1 + target_breakeven_rate / 100)
    
    # 현재 총 투자금
    current_investment = current_shares * current_avg_price
    
    # 필요한 추가 투자금 계산
    # (current_investment + X) / (current_shares + X/current_price) = target_avg_price
    # 풀이: X = (target_avg_price * current_shares - current_investment) / (1 - target_avg_price / current_price)
    
    denominator = 1 - (target_avg_price / current_price)
    
    if denominator <= 0:
        return {
            "error": "목표 손익분기율이 너무 낮습니다. 현재 가격으로는 달성 불가능합니다."
        }
    
    optimal_amount = (target_avg_price * current_shares - current_investment) / denominator
    
    if optimal_amount < 0:
        return {
            "error": "이미 목표 손익분기율을 달성했습니다."
        }
    
    # 최적 투자금으로 계산
    result = calculate_average_down(
        current_shares,
        current_avg_price,
        current_price,
        optimal_amount
    )
    
    if result.get("success"):
        result["optimal_amount"] = round(optimal_amount, 2)
        result["target_breakeven_rate"] = target_breakeven_rate
    
    return result
