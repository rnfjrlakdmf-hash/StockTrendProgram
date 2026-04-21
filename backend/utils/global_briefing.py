import json
import asyncio
from datetime import datetime
import pytz
from typing import Dict, Any, List, Optional


async def generate_market_wide_briefing(target_time: str = None):
    """
    시장 전체의 지수와 섹터 흐름을 요약한 '공통 브리핑'을 생성 (user_id = 'SYSTEM')
    소급 생성(Backfill) 시 target_time(UTC ISO형식)을 전달받아 해당 시점으로 저장함.
    """
    # [Lazy Imports] - 부팅 시 임포트 차단
    from ai_analysis import generate_with_retry, API_KEY
    from stock_data import get_market_data, get_market_news, get_macro_calendar
    from utils.briefing_store import save_morning_briefing

    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    user_id = "SYSTEM"

    log_msg = f"at {target_time} (Backfill)" if target_time else f"at {now.strftime('%H:%M')} KST"
    print(f"[SYSTEM-Briefing] Generating: {log_msg}")

    # 1. 시장 데이터 수집 (실패해도 계속 진행)
    try:
        market_data = get_market_data()
        m_news = get_market_news()[:5]
        macro = get_macro_calendar()[:3]

        index_lines = []
        for idx in market_data:
            label = idx.get('event_kr', '')
            value = idx.get('actual', '-')
            change = idx.get('change', '0.00%')
            if value != "-" and label:
                index_lines.append(f"{label}: {value} ({change})")
        index_summary = "\n".join(index_lines[:10]) or "시장 데이터 수집 중"
        
        news_titles = [n.get('title', '') for n in m_news if n.get('title')]
    except Exception as e:
        print(f"[SYSTEM-Briefing] Data fetch error (using fallback): {e}")
        index_summary = "시장 데이터 일시 조회 불가"
        news_titles = []

    if not API_KEY:
        print("[SYSTEM-Briefing] No API Key - saving placeholder briefing")
        _save_placeholder(user_id, now, target_time)
        return None

    # 2. 시장 상태 확인
    try:
        from stock_data import get_market_status_info
        ms_info = get_market_status_info()
        market_status_text = f"{ms_info['text']} (KST {ms_info.get('current_time_kst', now.strftime('%H:%M'))})"
    except:
        market_status_text = f"KST {now.strftime('%H:%M')}"

    # 3. AI 브리핑 생성 (네이버 스타일)
    prompt = f"""당신은 대한민국 최고의 금융 데이터 분석가입니다.
네이버 금융 'AI 브리핑' 스타일로 간결하고 전문적인 시장 리포트를 작성하세요.

[규칙]
- 'summary_bullets'의 첫 번째 항목은 반드시 현재 코스피/코스닥 지수 수치와 등락 정보를 포함해야 합니다.
- 모든 수치는 콤마(,)와 부호(+/-)를 정확히 사용하여 한눈에 들어오게 작성하세요.

[현재 시간] {market_status_text}

[주요 시장 지표]
{index_summary}

[주요 뉴스 헤드라인]
{chr(10).join(news_titles[:3])}

[출력 형식 JSON]
{{
  "market_title": "오늘의 핵심 헤드라인 (15자 내외)",
  "summary_bullets": ["· 지수 수치(필수) 포함 핵심 포인트 1", "· 핵심 포인트 2", "· 핵심 포인트 3"],
  "simple_summary_bullets": ["· 쉬운 설명 1", "· 쉬운 설명 2", "· 쉬운 설명 3"],
  "sections": [
    {{"emoji": "📊", "title": "국내외 증시 동향", "content": "상세 분석 내용"}},
    {{"emoji": "🌐", "title": "글로벌 매크로", "content": "상세 분석 내용"}},
    {{"emoji": "💡", "title": "투자자 주목 포인트", "content": "상세 분석 내용"}}
  ],
  "simple_sections": [
    {{"emoji": "💡", "title": "한 줄 요약", "content": "쉬운 설명"}}
  ],
  "watchlist_briefs": [],
  "market_focus": "지금 주목할 핵심 변수",
  "disclaimer": "본 정보는 투자 판단의 참고용이며 투자 권유가 아닙니다."
}}
"""

    try:
        response = generate_with_retry(prompt, json_mode=True)
        text = response.text.strip()

        # 마크다운 코드블록 제거
        for prefix in ["```json", "```"]:
            if text.startswith(prefix):
                text = text[len(prefix):].strip()
        if text.endswith("```"):
            text = text[:-3].strip()

        briefing_result = json.loads(text)
        briefing_result["user_id"] = user_id
        # [Precision] 정시 데이터의 일관성을 위해 분/초를 0으로 고정한 타임스탬프 생성
        fixed_now = now.replace(minute=0, second=0, microsecond=0)
        briefing_result["generated_at"] = target_time if target_time else fixed_now.isoformat()
        briefing_result["category"] = "PERIODIC"

        save_morning_briefing(user_id, briefing_result, created_at=target_time)
        print(f"[SYSTEM-Briefing] ✅ Saved successfully: {now.strftime('%H:%M')} KST")
        return briefing_result

    except Exception as e:
        print(f"[SYSTEM-Briefing] Generation error: {e}")
        # AI 실패 시 기본 브리핑으로 폴백 (히스토리 빈 슬롯 방지)
        _save_placeholder(user_id, now, target_time)
        return None


def _save_placeholder(user_id: str, now: datetime, target_time: Optional[str]):
    """AI 실패 시 빈 슬롯을 채우기 위한 기본 브리핑 저장"""
    from utils.briefing_store import save_morning_briefing
    
    placeholder = {
        "user_id": user_id,
        "market_title": f"{now.strftime('%H시')} 시장 데이터 수집 중",
        "summary_bullets": ["· 시장 데이터를 수집 중입니다.", "· 잠시 후 업데이트됩니다."],
        "simple_summary_bullets": ["· 잠시 후 업데이트됩니다."],
        "sections": [{"emoji": "⏳", "title": "데이터 수집 중", "content": "시장 데이터를 수집하고 있습니다."}],
        "simple_sections": [{"emoji": "⏳", "title": "준비 중", "content": "잠시 후 업데이트됩니다."}],
        "watchlist_briefs": [],
        "market_focus": "데이터 수집 중",
        "disclaimer": "본 정보는 투자 판단의 참고용이며 투자 권유가 아닙니다.",
        "generated_at": target_time if target_time else now.isoformat(),
        "category": "PERIODIC",
    }
    save_morning_briefing(user_id, placeholder, created_at=target_time)
    print(f"[SYSTEM-Briefing] ⚠️ Saved placeholder for {now.strftime('%H:%M')} KST")
