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
국내외 증시, 원자재, 환율뿐만 아니라 **투자자별 수급(외인/기관), 등락 종목 수, 주요 대형주 시세**를 유기적으로 분석하세요.

[현재 시장 정보]
- 시간 상태: {market_status_text}
- 정규장 운영 여부: {'거래 중' if ms_info['can_trade_regular'] else '종료/대기'}

[현재 주요 시장 지표 (종합)]
{index_summary}

[주요 마켓 컨텍스트]
{json.dumps(market_context, ensure_ascii=False)}

[작성 지침 - 중요]
1. **Headline (market_title)**: 시장의 핵심(매크로 + 수급 + 대형주 흐름 반영)을 꿰뚫는 강력한 한 줄 헤드라인으로 작성하세요.
2. **Short Summary**: 변곡점 3가지를 '·' 기호로 작성하세요 (원자재 영향, 수급 주체의 움직임, 대형주 간 차별화 우선 포함).
3. **Deep Analysis (중요 섹션 구성)**:
   - **첫 번째 섹션: '글로벌 매크로 및 수급 인사이트'** (원자재 가격 변동과 외국인/기관의 매매 방향이 지수에 미치는 영향 분석)
   - **두 번째 섹션: '시장 질적 분석 및 대형주 흐름'** (상승/하락 종목 수 비율을 통해 체감 온도를 설명하고, 삼성전자/현대차 등 시총 상위 종목의 개별 시세를 바탕으로 업종별 명암 서술)
   - 반드시 **"외국인이 000억 원 순매도하며 지수를 압박하고 있습니다"** 혹은 **"상승 종목 대비 하락 종목이 많아 체감 지수는 낮은 편입니다"**와 같이 구체적 수치를 문맥에 녹이세요.
4. **표기 형식**: 종목 언급 시 반드시 **'종목명 가격(등락률)'** 형식을 지키세요. (예: 삼성전자 217,000원(-0.23%)).
5. **전문성**: "차익실현 매물", "수급 주체 정체", "지수 하방 경직성", "낙폭 제한" 등 전문 용어를 자연스럽게 사용하세요.
6. **표현 주의**: 현재 시장 상태가 '{market_status_text}'임을 인지하여 {"장중 문구를 사용하세요." if avoid_words else "마감 문구를 사용하세요."}

[출력 포맷 (JSON)]
{{
  "market_title": "헤드라인",
  "summary_bullets": ["· 포인트 1", "· 포인트 2", "· 포인트 3"],
  "simple_summary_bullets": ["· 쉬운 요약 1", ...],
  "sections": [
    {{ "emoji": "⚖️", "title": "**수급 주체 간 공방 속 지수 흐름**", "content": "외국인과 기관이 코스피에서 000억 원 동반 순매도를 보이며... 반면 개인은 000억 원 순매수로..." }},
    {{ "emoji": "💾", "title": "**반도체 약세 vs 자동차 강세 차별화**", "content": "삼성전자 0원(0%)은 하락세인 반면, 현대차 0원(0%)은 상승하며 낙폭을 제한하고..." }},
    ...
  ],
  "simple_sections": [ {{ "emoji": "💡", "title": "**오늘의 핵심!**", "content": "..." }} ],
  "watchlist_briefs": [
    {{ "symbol": "NVDA", "name": "엔비디아", "insight": "엔비디아 130.4$(+1.5%)는..." }}
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
