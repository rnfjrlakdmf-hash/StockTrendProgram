import os
import json
import asyncio
from datetime import datetime
import pytz

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

REPORT_FILE = os.path.join(DATA_DIR, "weekend_report.json")

def _generate_sync_impl():
    from ai_analysis import generate_with_retry, API_KEY
    from stock_data import get_market_data, get_market_news, get_macro_calendar

    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    print(f"[WeekendReport] Generating report at {now.strftime('%Y-%m-%d %H:%M:%S')} KST")
    
    try:
        market_data = get_market_data()
        m_news = get_market_news()[:15]
        
        index_lines = []
        for idx in market_data:
            label = idx.get('event_kr', '')
            value = idx.get('actual', '-')
            change = idx.get('change', '0.00%')
            if value != "-" and label:
                index_lines.append(f"{label}: {value} ({change})")
        index_summary = "\n".join(index_lines[:10]) or "시장 데이터 수집 중"
        
        news_titles = [n.get('title', '') for n in m_news if n.get('title')]
        
        calendar_data = get_macro_calendar()
        calendar_lines = []
        for cal in calendar_data[:15]:
            time_str = cal.get('time', '')
            country = cal.get('country', '')
            event = cal.get('event_kr', '') or cal.get('event', '')
            calendar_lines.append(f"{time_str} [{country}] {event}")
        calendar_summary = "\n".join(calendar_lines) or "예정된 주요 일정 없음"
            
    except Exception as e:
        print(f"[WeekendReport] Data fetch error: {e}")
        index_summary = "데이터 수집 불가"
        news_titles = []
        calendar_summary = "데이터 수집 불가"
        
    if not API_KEY:
        print("[WeekendReport] No API Key")
        return None
        
    prompt = f"""당신은 주식 초보자에게 시장 상황을 아주 쉽고 친절하게 설명해주는 최고의 금융 멘토입니다.
주말에만 열람 가능한 프리미엄 마켓 인사이트를 작성해야 합니다.
절대 '주도 섹터 예측', '급등 예상 종목', '매수 추천' 같은 미래 예측이나 유사투자자문성 단어를 사용하지 마세요.
오직 '지난주 시장 데이터 요약'과 '다음 주 주요 경제 일정'이라는 사실 기반으로만 작성하되,
**반드시 어려운 경제 용어, 전문 용어(예: 매크로, 펀더멘털 등)를 최대한 배제하고, 중학생도 이해할 수 있는 아주 쉽고 친절한 설명문 형식**으로 풀어 써주세요.

[현재 시간] {now.strftime('%Y-%m-%d %H:%M KST')}

[금주 마감 시장 지표]
{index_summary}

[금주 주요 경제 뉴스]
{chr(10).join(news_titles[:10])}

[다음 주 주요 경제 일정 데이터]
{calendar_summary}

[작성 지침]
- week_summary_bullets: 위 지표와 뉴스를 바탕으로 이번 주 증시의 핵심 팩트 3~4개를 각각 1~2문장의 완성된 문장으로 서술하세요. 절대 더미 텍스트를 넣지 마세요.
- sections: 테마 복기와 경제 일정을 각각 3~5줄로 풍부하게 서술하세요.

[출력 형식 JSON]
{{
  "title": "주말 마켓 인사이트: 글로벌 금리 정책과 국내 주력 산업 수급 복기",
  "subtitle": "이번 주 시장 핵심 팩트 요약과 다음 주 주요 경제 캘린더",
  "week_summary_bullets": [
    "국내 증시는 주요 대형 반도체 및 테크 기업들에 대한 외국인과 기관의 선별적 수급 유입이 지수 하단을 지지했습니다.",
    "미국 연준의 통화 정책 방향성과 주요 물가 지표 발표를 앞두고 시장 전반의 관망 심리와 순환매 장세가 전개되었습니다.",
    "글로벌 환율 및 금리 변동성에 따라 수출 대형주 중심의 견조한 펀더멘털 신뢰가 유지되었습니다."
  ],
  "sections": [
    {{"emoji": "🔥", "title": "지난주 자금 쏠림 테마 복기", "content": "뉴스 및 수급 기반으로 지난주 자금이 집중되었던 테마와 배경을 사실 중심으로 3~4줄 요약 서술"}},
    {{"emoji": "📅", "title": "다음 주 놓치면 안 될 경제 일정", "content": "제공된 경제 일정 데이터를 바탕으로 다음 주 발표될 주요 경제 지표의 날짜와 중요 포인트를 3~4줄로 쉽게 설명"}}
  ],
  "disclaimer": "본 리포트는 과거 데이터와 예정된 일정 등 객관적 사실만을 요약한 참고 자료입니다. 특정 종목에 대한 투자 권유나 추천이 아니며, 투자의 최종 책임은 본인에게 있습니다.",
  "generated_at": "{now.isoformat()}"
}}
"""

    try:
        response = generate_with_retry(prompt, json_mode=True)
        text = response.text.strip()
        
        for prefix in ["```json", "```"]:
            if text.startswith(prefix):
                text = text[len(prefix):].strip()
        if text.endswith("```"):
            text = text[:-3].strip()
            
        report_data = json.loads(text)
        report_data["generated_at"] = now.isoformat()
        
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
            
        print(f"[WeekendReport] Saved successfully.")
        return report_data
    except Exception as e:
        print(f"[WeekendReport] Generation error: {e}")
        return None

async def generate_weekend_report():
    return await asyncio.to_thread(_generate_sync_impl)

def get_latest_weekend_report():
    if os.path.exists(REPORT_FILE):
        try:
            with open(REPORT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return None
