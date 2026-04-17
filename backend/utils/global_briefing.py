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

async def generate_market_wide_briefing(target_time: str = None):
    """
    시장 전체의 지수와 섹터 흐름을 요약한 '공통 브리핑'을 생성 (user_id = 'SYSTEM')
    소급 생성(Backfill) 시 target_time(ISO형식)을 전달받아 해당 시점으로 저장함.
    """
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    user_id = "SYSTEM"
    
    # 소급 생성인 경우 로그 출력 차별화
    log_msg = f"at {target_time} (Backfill)" if target_time else f"at {now}"
    print(f"[SYSTEM-Briefing] Generating global market briefing {log_msg}")
    
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
    index_list = []
    for idx in market_data:
        label = idx.get('event_kr', '시장 지표')
        value = idx.get('actual', '-')
        change = idx.get('change', '0.00%')
        if value != "-":
            index_list.append(f"{label}: {value} ({change})")
    
    index_summary = "\n".join(index_list)
    
    from stock_data import get_market_status_info
    
    # [Market Status Check] 고도화된 시간 판별 로직 적용
    ms_info = get_market_status_info()
    market_status_text = f"{ms_info['text']} (KST {ms_info['current_time_kst']})"
    avoid_words = "마감, 마쳤습니다, 종가, 끝났습니다" if ms_info['can_trade_regular'] else ""

    # 프롬프트 구성 (네이버 금융 AI 브리핑 스타일 1:1 벤치마킹)
    prompt = f"""
당신은 대한민국 최고의 금융 데이터 분석가이자 AI 앵커입니다. 
네이버 금융(stock.naver.com)의 'AI 브리핑' 수준의 전문적이고 통찰력 있는 리포트를 작성하세요.
특히 국내 증시(KOSPI, KOSDAQ)뿐만 아니라 해외 증시(나스닥, S&P500 등)와 **원자재(유가, 금, 구리), 환율**의 흐름을 유기적으로 분석하여 투자자에게 유용한 정보를 제공하세요.

[현재 시장 정보]
- 시간 상태: {market_status_text}
- 정규장 운영 여부: {'거래 중' if ms_info['can_trade_regular'] else '종료/대기'}

[현재 주요 시장 지표]
{index_summary}

[주요 마켓 컨텍스트]
{json.dumps(market_context, ensure_ascii=False)}

[작성 지침 - 중요]
1. **Headline (market_title)**: 시장의 핵심(국내외 통합 & 원자재/매크로 흐름 반영)을 꿰뚫는 강력한 한 줄 헤드라인으로 작성하세요.
2. **Short Summary (summary_bullets)**: 현재 시장에서 가장 중요한 변곡점 3가지를 '·' 기호로 시작하여 작성하세요. (지표 등락뿐만 아니라 원자재 가격 변동이 산업에 미치는 영향을 우선 포함하세요.)
3. **Macro & Commodity Analysis (중요)**:
   - **첫 번째 섹션은 반드시 '글로벌 매크로 및 원자재 인사이트'** 테마로 작성하세요.
   - 예: "🛢️ 유가 1.7% 하락에 에너지 비용 민감 업종 수혜 기대", "💰 금 가격 상승과 안전자산 선호 심리" 등.
   - 단순히 가격을 나열하지 말고, **"유가 하락으로 인해 항공, 운수, 화학 업종의 비용 부담이 완화될 것으로 보입니다"**와 같이 실제 산업에 미치는 영향력을 구체적으로 서술하세요.
4. **Sections (상세 분석)**:
   - 각 섹션의 'title'은 반드시 **굵은 소제목** 형태로 작성하세요.
   - 분석 본문에서 주요 종목 언급 시 반드시 **'종목명 현재가(등락률)'** 형식을 지키세요. (예: 삼성전자 74,500원(+1.2%)).
   - 국내 테마와 해외 연관 테마(예: 엔비디아와 국내 반도체 등)를 연결하여 통찰을 제시하세요.
5. **전문성 강화**: "위험선호(Risk-on)", "비용 부담 완화", "밸류에이션 부담", "인플레이션 재료" 등 전문 금융 리포트 수준의 용어를 사용하세요.
6. **표현 주의**: 현재 시장 상태가 '{market_status_text}'임을 인지하세요. {"만약 장중이라면 '" + avoid_words + "'와 같은 '종료'를 의미하는 단어를 절대 사용하지 마세요." if avoid_words else ""}

[출력 포맷 (JSON)]
{{
  "market_title": "헤드라인",
  "summary_bullets": ["· 포인트 1", "· 포인트 2", "· 포인트 3"],
  "simple_summary_bullets": ["· 쉬운 요약 1", ...],
  "sections": [
    {{ "emoji": "🛢️", "title": "**유가 변동에 따른 업종별 명암**", "content": "WTI 유가가 00달러로 하락하며 항공주(OO 00원(0%)) 등의 수익성 개선이..." }},
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
        # 소급 생성인 경우 해당 타겟 시간을 generated_at으로 설정하여 타임라인 정렬 보장
        briefing_result["generated_at"] = target_time if target_time else now.isoformat()
        briefing_result["category"] = "PERIODIC" # [Naver-Style] 정기 브리핑 태그 부여
        
        # DB 저장 (target_time을 created_at으로 전달)
        save_morning_briefing(user_id, briefing_result, created_at=target_time)
        
        save_msg = f"for historical slot {target_time}" if target_time else f"for {now.strftime('%H:00')}"
        print(f"[SYSTEM-Briefing] Successfully saved hourly briefing {save_msg}")
        
        return briefing_result
    except Exception as e:
        print(f"[SYSTEM-Briefing] Generation error: {e}")
        return None
