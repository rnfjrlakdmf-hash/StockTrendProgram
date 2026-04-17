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

    # 프롬프트 구성 (네이버 금융 AI 브리핑 스타일 1:1 벤치마킹 & 글로벌 매크로 인텔리전스)
    prompt = f"""
당신은 대한민국 최고의 금융 데이터 분석가이자 AI 앵커입니다. 
네이버 금융(stock.naver.com)의 'AI 브리핑' 수준의 전문적이고 통찰력 있는 글로벌 마켓 리포트를 작성하세요.
국내외 증시, 원자재, 환율뿐만 아니라 **글로벌 거시 지표(미 국채 금리, VIX, 달러인덱스), 유럽 증시, 미국 핵심 테크주 15선**을 모두 연결하여 분석하세요.

[현재 시장 정보]
- 시간 상태: {market_status_text}
- 정규장 운영 여부: {'거래 중' if ms_info['can_trade_regular'] else '종료/대기'}

[현재 주요 실시간 지표 (글로벌 매크로 + 국내)]
{index_summary}

[주요 마켓 컨텍스트]
{json.dumps(market_context, ensure_ascii=False)}

[작성 지침 - 중요]
1. **Headline (market_title)**: 글로벌 거시 경제 흐름과 국내 증시의 연동성을 보여주는 강력한 한 줄 헤드라인으로 작성하세요.
2. **Short Summary**: 변곡점 3가지를 '·' 기호로 작성하세요. (글로벌 금리/VIX의 변화, 미국 대형주 흐름이 국내 섹터에 주는 시사점 우선 포함)
3. **Deep Intelligence Analysis (핵심)**:
   - **섹션 1: '글로벌 매크로 변동과 국내 증시 영향'**: 미 국채 금리(TY10), 달러인덱스(DXY), VIX 지수 변화가 국내 지수(KOSPI, KOSDAQ) 및 외국인 수급에 미치는 '나비효과'를 분석하세요.
   - **섹션 2: '미국 테크주 흐름과 국내 관련 섹터'**: MSFT, NVDA, AAPL 등 미국 핵심 테크주 15선의 시방향이 국내 반도체, 이차전지, 자동차 등 핵심 업종에 주는 낙수효과를 구체적으로 서술하세요. (예: "엔비디아 000$(0%)의 강세는 국내 HBM 관련주인 SK하이닉스 0원(0%)에 긍정적인 신호로...")
   - **섹션 3: '글로벌 투심 및 시장 통계'**: 유럽 증시의 분위기와 국내 등락 종목 수 비율을 엮어 오늘의 전반적인 투자 심리를 진단하세요.
4. **법적 준수 및 표현 (필수)**: ⚖️
   - **투자 권유 금지**: "사세요", "오를 것입니다" 대신 "분석됩니다", "관측되고 있습니다", "~할 가능성이 있습니다" 등 객관적이고 조심스러운 표현만 사용하세요.
   - **정보 제공 목적**: 본 브리핑은 투자 판단을 돕는 '데이터 가이드'임을 명확히 인지하여 작성하세요.
5. **표기 형식**: 모든 종목 언급 시 반드시 **'종목명 가격(등락률)'** 형식을 지키세요. (예: 삼성전자 217,000원(-0.23%)).

[출력 포맷 (JSON)]
{{
  "market_title": "헤드라인",
  "summary_bullets": ["· 포인트 1", "· 포인트 2", "· 포인트 3"],
  "simple_summary_bullets": ["· 쉬운 요약 1", ...],
  "sections": [
    {{ "emoji": "📋", "title": "**글로벌 매크로 변동성과 국내 수급 환경**", "content": "미 국채 금리가 0%대로 오르며 달러인덱스(00.0)가 강세를 보임에 따라 국내 코스피에서 외국인의 수급 부담이... 반면 VIX 지수는..." }},
    {{ "emoji": "🇺🇸", "title": "**미국 반도체·S/W 강세의 국내 낙수효과**", "content": "AMD 0$(0%)와 인텔 0$(0%)의 반등은 국내 반도체(삼성전자 0원)에... 또한 MSFT 0$(0%)의 실적 기대감은..." }},
    ...
  ],
  "simple_sections": [ {{ "emoji": "💡", "title": "**오늘의 핵심!**", "content": "..." }} ],
  "watchlist_briefs": [
    {{ "symbol": "NVDA", "name": "엔비디아", "insight": "엔비디아 130.4$(+1.5%)는..." }}
  ],
  "market_focus": "지금 바로 체크해야 할 글로벌-국내 연결 포인트",
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
