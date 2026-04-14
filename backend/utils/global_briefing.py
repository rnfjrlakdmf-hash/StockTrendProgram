import json
import asyncio
from datetime import datetime
import pytz
from typing import Dict, Any, List

from ai_analysis import generate_with_retry, API_KEY
from stock_data import (
    get_market_data, get_market_news, get_macro_calendar, 
    get_dart_risk_alerts
)
from utils.briefing_store import save_morning_briefing
from korea_data import get_ipo_data

async def generate_market_wide_briefing():
    """
    시장 전체의 지수와 섹터 흐름을 요약한 '공통 브리핑'을 생성 (user_id = 'SYSTEM')
    """
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    user_id = "SYSTEM"
    
    print(f"[SYSTEM-Briefing] Generating global market briefing at {now}")
    
    # 1. 데이터 수집
    # 1.1 시장 지수
    market_data = get_market_data()
    
    # 1.2 주요 시장 컨텍스트
    try:
        m_news = get_market_news()[:5]
        macro = get_macro_calendar()[:5]
        ipo = get_ipo_data()[:3]
        risk_alerts = get_dart_risk_alerts()[:3]
        
        market_context = {
            "top_news": [n.get('title') for n in m_news],
            "macro_schedule": [f"{m.get('event')} ({m.get('date')})" for m in macro],
            "ipo_schedule": [f"{i.get('name')} ({i.get('date')})" for i in ipo if isinstance(i, dict)] if ipo else [],
            "risk_alerts": [r.get('title') for r in risk_alerts]
        }
    except Exception as e:
        print(f"[SYSTEM-Briefing] Context fetch error: {e}")
        market_context = {}

    # 2. AI 브리핑 생성
    if not API_KEY:
        print("[SYSTEM-Briefing] API Key missing")
        return

    # 지수 요약 텍스트
    indices_raw = market_data.get('indices', [])
    index_list = []
    for idx in indices_raw:
        label = idx.get('label', '시장 지수')
        value = idx.get('value')
        change = idx.get('change', '0.00%')
        if value and value != "N/A":
            index_list.append(f"{label}: {value} ({change})")
    
    index_summary = ", ".join(index_list) if index_list else "현재 시장 데이터를 수집 중입니다."

    # 프롬프트 구성 (네이버 타임라인 스타일)
    prompt = f"""
    당신은 대한민국 최고의 'AI 금융 뉴스 앵커'입니다. 
    지금 이 시간({now.strftime('%H:00')}시)의 주식 시장 상황을 요약하여 이용자들에게 브리핑하세요.

    [입력 데이터]
    1. 시장 지표: {index_summary}
    2. 주요 뉴스 및 일정: {json.dumps(market_context, ensure_ascii=False)}

    [작성 가이드라인]
    - **네이버 AI 브리핑 스타일**: 시간대별로 변하는 시장의 활기를 담아내세요.
    - **Headline**: 현 시점의 시장 분위기를 가장 잘 나타내는 헤드라인 (15자 내외).
    - **Summary Bullets**: 지금 가장 중요한 포인트 3가지를 아주 간결하게.
    - **Sections**: 시장 흐름, 특징주/테마, 앞으로의 전망 등 3개 내외의 섹션.
    - **어조**: 신뢰감 있고 친절한 앵커 톤.
    - 전문가 버전과 초보자 버전을 모두 포함하세요.

    [출력 포맷 (JSON)]
    {{
        "market_title": "메인 헤드라인",
        "summary_bullets": ["전문가용 포인트 1", "2", "3"],
        "simple_summary_bullets": ["초보자용 요약 1", "2", "3"],
        "sections": [
            {{ "emoji": "📉", "title": "시장 총평", "content": "..." }},
            {{ "emoji": "🔥", "title": "특징 테마", "content": "..." }}
        ],
        "simple_sections": [
            {{ "emoji": "📉", "title": "지금 시장은?", "content": "..." }}
        ],
        "watchlist_briefs": [],
        "market_focus": "다음 정각까지 주목할 점",
        "disclaimer": "본 서비스는 참고용이며 투자 추천이 아닙니다."
    }}
    """

    try:
        response = generate_with_retry(prompt, json_mode=True)
        text = response.text.strip()
        
        # 마크다운 코드 블록 제거
        if text.startswith("```json"):
            text = text.replace("```json", "", 1).replace("```", "", 1).strip()
        elif text.startswith("```"):
            text = text.replace("```", "", 1).replace("```", "", 1).strip()
            
        briefing_result = json.loads(text)
        
        # 메타데이터 추가
        briefing_result["user_id"] = user_id
        briefing_result["generated_at"] = now.isoformat()
        
        # DB 저장
        save_morning_briefing(user_id, briefing_result)
        print(f"[SYSTEM-Briefing] Successfully saved hourly briefing for {now.strftime('%H:00')}")
        
        return briefing_result
    except Exception as e:
        print(f"[SYSTEM-Briefing] Generation error: {e}")
        return None
