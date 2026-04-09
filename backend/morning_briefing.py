import json
import asyncio
from datetime import datetime
import pytz
from typing import Dict, Any, List

from ai_analysis import generate_with_retry, API_KEY
from stock_data import get_market_data, fetch_google_news, get_simple_quote
from db_manager import get_watchlist
from utils.briefing_store import save_morning_briefing

async def generate_user_morning_briefing(user_id: str):
    """
    특정 사용자의 관심종목과 시장 데이터를 결합하여 맞춤형 모닝 브리핑 생성
    """
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    # 1. 데이터 수집
    # 1.1 시장 지수 (미국 중심)
    market_data = get_market_data() # 지수, 환율 등 포함됨
    
    # 1.2 관심종목 데이터
    watchlist = get_watchlist(user_id)
    watchlist_details = []
    
    # 관심종목이 너무 많으면 상위 5개만 집중 분석 (토큰 및 시간 절약)
    target_symbols = watchlist[:5] if watchlist else []
    
    for item in target_symbols:
        symbol = item['symbol']
        try:
            quote = get_simple_quote(symbol)
            news = fetch_google_news(symbol, max_results=2)
            watchlist_details.append({
                "symbol": symbol,
                "name": item.get('name', symbol),
                "price": quote.get('price', 'N/A'),
                "change": quote.get('change', 'N/A'),
                "news": [n.get('title', '') for n in (news or [])]
            })
        except:
            continue

    # 2. AI 브리핑 생성
    if not API_KEY:
        return {
            "status": "error",
            "message": "Gemini API 키가 설정되지 않았습니다."
        }

    # 지수 요약 텍스트 생성
    indices = market_data.get('indices', [])
    index_summary = ", ".join([f"{idx['label']}: {idx['price']} ({idx['change']})" for idx in indices[:3]])

    # 프롬프트 구성
    prompt = f"""
    당신은 개인 투자자를 위한 'AI 전담 비서'입니다. 
    오늘 아침({now.strftime('%Y-%m-%d %H:%M')}) 시장 상황과 사용자의 관심종목 리서치 결과를 요약해 전달하세요.

    [입력 데이터]
    1. 시장 지수: {index_summary}
    2. 관심종목 현황: {json.dumps(watchlist_details, ensure_ascii=False)}

    [작성 가이드라인 - 필독]
    - 반드시 '객관적 사실'과 '데이터' 중심으로 서술하세요.
    - **유사투자자문업 금지 원칙**: "사세요", "파세요", "목표가 얼마" 등 강력한 추천이나 매매 리딩 질문에 대한 답변은 절대 금지합니다.
    - 대신 "데이터상 ~한 흐름이 관찰됩니다", "~한 재료가 시장의 관심을 받고 있습니다"와 같은 중립적 표현을 사용하세요.
    - 격식 있으면서도 친절한 비서 말투(~입니다, ~보입니다)를 사용하세요.

    [출력 포맷 (JSON)]
    {{
        "market_title": "오늘의 시장 주요 흐름 (이모지 포함)",
        "market_summary": "글로벌 시장의 주요 지표 및 뉴스 데이터 요약 (3문장 이내)",
        "watchlist_briefs": [
            {{
                "symbol": "종목코드",
                "name": "종목명",
                "insight": "해당 종목과 관련된 객관적 뉴스 또는 가격 데이터 요약 (1문장)"
            }},
            ...
        ],
        "market_focus": "오늘 확인해야 할 주요 공시, 실적 발표 또는 거시 지표 일정",
        "disclaimer": "본 브리핑은 AI가 공개된 데이터를 기반으로 추출한 단순 정보 요약이며, 투자 권유나 특정 종목 추천을 절대 포함하지 않습니다. 모든 투자 결정은 본인의 판단하에 이루어져야 하며, 분석 결과의 정확성을 보장하지 않습니다."
    }}
    """

    try:
        # 비동기 실행을 위해 run_in_executor 사용 고려 가능하나 여기서는 단순 호출
        response = generate_with_retry(prompt, json_mode=True)
        briefing_result = json.loads(response.text)
        
        # 메타데이터 추가
        briefing_result["user_id"] = user_id
        briefing_result["generated_at"] = now.isoformat()
        
        # DB 저장
        save_morning_briefing(user_id, briefing_result)
        
        return briefing_result
    except Exception as e:
        print(f"[MorningBrief] Generation error: {e}")
        return {
            "status": "error",
            "message": "브리핑 생성 중 오류가 발생했습니다."
        }
