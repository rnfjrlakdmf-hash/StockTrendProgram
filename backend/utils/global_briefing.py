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

    # 지수 요약 텍스트 (market_data가 이제 직접 리스트를 반환함)
    index_list = []
    for idx in market_data:
        label = idx.get('label', '시장 지수')
        value = idx.get('value')
        change = idx.get('change', '0.00%')
        if value and value != "N/A":
            index_list.append(f"{label}: {value} ({change})")
    
    index_summary = ", ".join(index_list) if index_list else "현재 시장 데이터를 수집 중입니다."

    # 프롬프트 구성 (네이버 금융 AI 브리핑 스타일 1:1 벤치마킹)
    prompt = f"""
당신은 대한민국 최고의 금융 데이터 분석가이자 AI 앵커입니다. 
네이버 금융(stock.naver.com)의 'AI 브리핑' 수준의 전문적이고 통찰력 있는 리포트를 작성하세요.

[현재 시장 지표]
{index_summary}

[주요 마켓 컨텍스트]
{json.dumps(market_context, ensure_ascii=False)}

[작성 지침 - 중요]
1. **Headline (market_title)**: 시장의 핵심을 꿰뚫는 강력한 한 줄 헤드라인으로 작성하세요.
2. **Short Summary (summary_bullets)**: 현재 시장에서 가장 중요한 변곡점 3가지를 '·' 기호로 시작하여 작성하세요.
3. **Sections (상세 분석)**:
   - 각 섹션의 'title'은 반드시 **굵은 소제목**(예: ****금리 인하 기대감에 미 증시 반등****) 형태로 작성하세요.
   - 분석 본문에서 주요 종목 언급 시 반드시 **'종목명 현재가(등락률)'** 형식을 지키세요. (예: 삼성전자 74,500원(+1.2%)).
   - 전문가 버전(sections)은 논리적이고 깊이 있게, 초보자 버전(simple_sections)은 이해하기 쉬운 비유를 섞어 작성하세요.
4. **Theme Focus**: 최근 가장 뜨거운 테마와 섹터 흐름을 구체적으로 언급하세요.

[출력 포맷 (JSON)]
{{
  "market_title": "헤드라인",
  "summary_bullets": ["· 포인트 1", "· 포인트 2", "· 포인트 3"],
  "simple_summary_bullets": ["· 쉬운 요약 1", ...],
  "sections": [
    {{ "emoji": "📈", "title": "**섹션 소제목**", "content": "종목명 00원(0%)을 포함한 심층 분석..." }},
    ...
  ],
  "simple_sections": [
    {{ "emoji": "💡", "title": "**오늘의 핵심!**", "content": "..." }}
  ],
  "watchlist_briefs": [
    {{ "symbol": "NVDA", "name": "엔비디아", "insight": "엔비디아 130.4$(+1.5%)는 AI 반도체 수요 폭발로 인해..." }}
  ],
  "market_focus": "투자자가 지금 바로 체크해야 할 포인트",
  "disclaimer": "본 정보는 투자 판단의 참고용이며 최종 결과에 대한 책임을 지지 않습니다."
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
