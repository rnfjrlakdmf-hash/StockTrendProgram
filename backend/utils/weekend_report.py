import os
import json
import asyncio
from datetime import datetime, timedelta
import pytz

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

REPORT_FILE = os.path.join(DATA_DIR, "weekend_report.json")

def get_real_next_week_calendar():
    """
    네이버 경제 캘린더 API를 통해 차주(월~금)의 실제 예정된 주요 경제 일정(중요도 2 이상)을 수집합니다.
    """
    import requests
    kst = pytz.timezone('Asia/Seoul')
    today = datetime.now(kst)
    
    # 다음 주 월요일 계산
    days_ahead = (0 - today.weekday()) % 7
    if days_ahead == 0: days_ahead = 7
    next_monday = today + timedelta(days=(2 if today.weekday() == 5 else (1 if today.weekday() == 6 else days_ahead)))
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://m.stock.naver.com"
    }
    
    events = []
    for i in range(5):
        d = next_monday + timedelta(days=i)
        d_str = d.strftime("%Y%m%d")
        weekday_kr = ["월", "화", "수", "목", "금", "토", "일"][d.weekday()]
        
        url = "https://stock.naver.com/api/securityService/economic/indicator/nations/releaseDate"
        params = [
            ('nationTypeList', 'USA'),
            ('nationTypeList', 'KOR'),
            ('nationTypeList', 'DEU'),
            ('nationTypeList', 'CHN'),
            ('page', '1'),
            ('pageSize', '30'),
            ('releaseDate', d_str)
        ]
        try:
            r = requests.get(url, params=params, headers=headers, timeout=5)
            if r.status_code == 200:
                data = r.json()
                for ind in data.get("indicators", []):
                    imp = ind.get("importance", 1)
                    nation = ind.get("nationType", "")
                    if imp >= 3 or (nation in ['KOR', 'USA'] and imp >= 2):
                        events.append(f"• {d.month}월 {d.day}일({weekday_kr}) [{ind.get('nationKoreanName', nation)}] {ind.get('name')} (중요도: ★{imp})")
        except Exception as e:
            print(f"[WeekendReport] Calendar fetch error for {d_str}: {e}")
            
    return events, next_monday

def _generate_sync_impl():
    from ai_analysis import generate_with_retry, API_KEY
    from stock_data import get_market_data, get_market_news

    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y년 %m월 %d일')
    
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
        
        calendar_events, next_monday = get_real_next_week_calendar()
        calendar_summary = "\n".join(calendar_events) if calendar_events else "• 차주 주요 경제 지표 발표 일정 대기 중"
        next_week_range = f"{next_monday.strftime('%m월 %d일')} ~ {(next_monday + timedelta(days=4)).strftime('%m월 %d일')}"
            
    except Exception as e:
        print(f"[WeekendReport] Data fetch error: {e}")
        index_summary = "데이터 수집 불가"
        news_titles = []
        calendar_summary = "데이터 수집 불가"
        next_week_range = "다음 주"
        
    if not API_KEY:
        print("[WeekendReport] No API Key")
        return None
        
    prompt = f"""당신은 주식 초보자에게 시장 상황을 아주 쉽고 친절하게 설명해주는 최고의 금융 멘토입니다.
주말에만 열람 가능한 프리미엄 마켓 인사이트를 작성해야 합니다.
절대 '주도 섹터 예측', '급등 예상 종목', '매수 추천' 같은 미래 예측이나 유사투자자문성 단어를 사용하지 마세요.
오직 '지난주 시장 데이터 요약'과 '다음 주({next_week_range}) 주요 경제 일정'이라는 사실 기반으로만 작성하되,
**반드시 어려운 경제 용어, 전문 용어(예: 매크로, 펀더멘털 등)를 최대한 배제하고, 중학생도 이해할 수 있는 아주 쉽고 친절한 설명문 형식**으로 풀어 써주세요.

[작성 기준일 (오늘)] {today_str} (토요일)
[다음 주 대상 기간] {next_week_range} (월요일 ~ 금요일)

[금주 마감 시장 지표]
{index_summary}

[금주 주요 경제 뉴스]
{chr(10).join(news_titles[:10])}

[다음 주({next_week_range}) 실제 예정된 주요 경제 일정 데이터]
{calendar_summary}

[⚠️ 매우 중요한 일정 작성 규칙]
- sections[1] '다음 주 놓치면 안 될 경제 일정'에는 **반드시 위에 제공된 실제 다음 주({next_week_range}) 일정 데이터에서 2~3개를 선택**하여 작성하세요.
- **절대 오늘({today_str}) 이전의 과거 날짜를 작성하지 마세요.**
- 형식: '• M월 D일(요일): 일정명 (초보자를 위한 쉬운 체크포인트 설명)' (줄바꿈 포함)

[작성 지침]
1. 가독성 최우선: 줄글로 길게 늘어놓지 말고, 핵심 포인트별로 줄바꿈과 글머리기호(•)를 사용하여 한눈에 쏙 들어오게 작성하세요.
2. 초등학생/중학생도 읽기 쉬운 정돈된 문체: 불필요한 은어나 유치한 말투(예: ~했답니다, 어른들이 등)를 배제하고, 깔끔하고 명확한 표준어로 브리핑하세요.
3. week_summary_bullets: 시장 핵심 요약 3개를 각각 1줄 완성형 문장으로 간결하게 작성하세요.
4. sections[0] (테마 복기): 자금이 몰린 핵심 테마 2~3개를 '• 테마명: 핵심 이유 요약' 형식의 불릿 텍스트로 작성하세요 (줄바꿈 포함).
5. sections[1] (경제 일정): 다음 주 실제 일정 2~3개를 친절한 해설과 함께 작성하세요 (줄바꿈 포함).

[출력 형식 JSON]
{{
  "title": "주말 마켓 인사이트: 지난주 시장 데이터와 다음 주 경제 일정",
  "subtitle": "이번 주 시장 핵심 팩트 요약과 다음 주 주요 경제 캘린더",
  "week_summary_bullets": [
    "국내 증시는 반도체 및 대형 기술주 중심의 외국인 수급에 힘입어 견조한 흐름을 유지했습니다.",
    "글로벌 주요국들의 경제 지표 발표를 앞두고 시장 참여자들의 관망세와 업종별 순환매가 전개되었습니다.",
    "환율과 유가 등 거시 경제 변수의 변동성이 진정되며 안정적인 흐름을 보였습니다."
  ],
  "sections": [
    {{
      "emoji": "🔥",
      "title": "지난주 자금 쏠림 테마 복기",
      "content": "• 반도체 & AI: 글로벌 빅테크 수요 지속 기대감으로 대형 반도체주 중심 매수세 유입\n• 금융 & 배당: 안정적인 이익을 바탕으로 주주환원 기대감이 높은 금융주로 방어적 자금 유입\n• 바이오 & 헬스케어: 신약 파이프라인 및 실적 개선 모멘텀이 부각된 기업 중심 선별적 순환매"
    }},
    {{
      "emoji": "📅",
      "title": "다음 주 놓치면 안 될 경제 일정",
      "content": "• M월 D일(요일): 일정명 (초보자를 위한 쉬운 체크포인트 설명)\n• M월 D일(요일): 일정명 (초보자를 위한 쉬운 체크포인트 설명)\n• M월 D일(요일): 일정명 (초보자를 위한 쉬운 체크포인트 설명)"
    }}
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
