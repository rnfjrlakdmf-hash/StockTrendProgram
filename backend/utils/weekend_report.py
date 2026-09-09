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
    네이버 경제 캘린더 API를 통해 다가오는 실제 예정된 주요 경제 일정(중요도 2 이상)을 수집합니다.
    - 주말 모드 (금요일 18시 이후, 토요일, 일요일): 다가오는 차주(월~금)의 경제 일정 예습
    - 주중 모드 (월요일 ~ 금요일 18시 이전): 이번 주(월~금)의 핵심 경제 지표 일정
    """
    import requests
    kst = pytz.timezone('Asia/Seoul')
    today = datetime.now(kst)
    
    weekday = today.weekday() # 0:월, 1:화, ..., 4:금, 5:토, 6:일
    is_weekend_mode = (weekday == 4 and today.hour >= 18) or weekday in [5, 6]
    
    if is_weekend_mode:
        # 주말 모드: 다음 주(차주 월~금)의 경제 일정 예습
        if weekday == 5: target_monday = today + timedelta(days=2)
        elif weekday == 6: target_monday = today + timedelta(days=1)
        else: target_monday = today + timedelta(days=3) # 금요일 저녁
        period_label = "다음 주"
    else:
        # 주중 모드 (월~금 낮): 이번 주(월~금)의 경제 일정 체크
        target_monday = today - timedelta(days=weekday)
        period_label = "이번 주"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://m.stock.naver.com"
    }
    
    events = []
    for i in range(5):
        d = target_monday + timedelta(days=i)
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
            
    return events, target_monday, period_label

def _generate_sync_impl():
    from ai_analysis import generate_with_retry, API_KEY, safe_json_loads
    from stock_data import get_market_data, get_market_news

    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    weekday_kr = ["월", "화", "수", "목", "금", "토", "일"][now.weekday()]
    today_str = f"{now.strftime('%Y년 %m월 %d일')}({weekday_kr})"
    
    print(f"[WeekendReport] Generating report at {now.strftime('%Y-%m-%d %H:%M:%S')} KST")
    
    try:
        market_data = get_market_data()
        m_news = get_market_news()[:15]
        
        index_lines = []
        for idx in market_data:
            label = idx.get('label') or idx.get('event_kr') or ''
            value = idx.get('value') or idx.get('actual') or '-'
            change = idx.get('change', '0.00%')
            if value != "-" and label:
                index_lines.append(f"{label}: {value} ({change})")
        index_summary = "\n".join(index_lines[:10]) or "코스피/코스닥 및 주요 지수 안정세"
        
        news_titles = [n.get('title', '') for n in m_news if n.get('title')]
        
        calendar_events, target_monday, period_label = get_real_next_week_calendar()
        calendar_summary = "\n".join(calendar_events) if calendar_events else f"• {period_label} 주요 경제 지표 발표 일정 대기 중"
        week_range = f"{target_monday.strftime('%m월 %d일')} ~ {(target_monday + timedelta(days=4)).strftime('%m월 %d일')}"
            
    except Exception as e:
        print(f"[WeekendReport] Data fetch error: {e}")
        index_summary = "데이터 수집 불가"
        news_titles = []
        calendar_summary = "데이터 수집 불가"
        period_label = "주요"
        week_range = "주요 일정"
        
    if not API_KEY:
        print("[WeekendReport] No API Key")
        return None
        
    prompt = f"""당신은 주식 초보자에게 시장 상황을 아주 쉽고 친절하게 설명해주는 최고의 금융 멘토입니다.
주말 및 주간 프리미엄 마켓 인사이트를 작성해야 합니다.
절대 '주도 섹터 예측', '급등 예상 종목', '매수 추천' 같은 미래 예측이나 유사투자자문성 단어를 사용하지 마세요.
오직 '최근 시장 데이터 요약'과 '{period_label}({week_range}) 주요 경제 일정'이라는 사실 기반으로만 작성하되,
**반드시 어려운 경제 용어, 전문 용어(예: 매크로, 펀더멘털 등)를 최대한 배제하고, 중학생도 이해할 수 있는 아주 쉽고 친절한 설명문 형식**으로 풀어 써주세요.

[작성 기준일 (오늘)] {today_str}
[{period_label} 대상 기간] {week_range} (월요일 ~ 금요일)

[최근 마감 시장 지표]
{index_summary}

[최근 주요 경제 뉴스]
{chr(10).join(news_titles[:10])}

[{period_label}({week_range}) 실제 예정된 주요 경제 일정 데이터]
{calendar_summary}

[⚠️ 매우 중요한 일정 작성 규칙]
- sections[1] '{period_label} 놓치면 안 될 경제 일정'에는 **반드시 위에 제공된 실제 {period_label}({week_range}) 일정 데이터에서 2~3개를 선택**하여 작성하세요.
- 만약 오늘({today_str}) 이후(오늘 포함) 남은 일정이 있다면, 지나간 일정보다는 **앞으로 발표될 중요 일정(예: CPI, PPI, 고용, 금리 등)**을 우선적으로 선택하세요.
- 반드시 형식: '• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)' 처럼 요일 뒤에 콜론(:)을 명확하게 붙여서 작성하세요.

[작성 지침]
1. 가독성 최우선: 한눈에 쏙 들어오도록 명확하고 간결한 문장으로 작성하세요.
2. 초보자 친화적 문체: 어려운 전문 용어는 쉽게 풀어서 설명하고, 깔끔한 존댓말 표준어(~습니다, ~입니다)로 브리핑하세요.
3. week_summary_bullets: 시장 핵심 요약 3개를 각각 1줄 완성형 문장으로 간결하게 작성하세요.
   - 1번: 최근 국내 증시(코스피/코스닥) 지수 흐름 및 외인/기관 수급 특징 1줄 요약
   - 2번: 글로벌 증시(미국 증시/환율/금리) 흐름이 우리 시장에 미친 영향 1줄 요약
   - 3번: 이번 주 주요 경제 지표 발표를 앞둔 시장 참여자들의 대응 분위기 1줄 요약
4. sections[0] (자금 쏠림 테마 복기):
   - title은 반드시 "최근 자금 쏠림 테마 복기"로 고정하세요.
   - 최근 증시에서 실제 자금이 유입되었거나 시장의 관심이 쏠린 실제 주식 업종/테마 2~3개(예: 반도체 & AI, 방산 & 항공, 바이오 & 제약, 2차전지 & 배터리, 금융 & 밸류업 등)를 선정하세요.
   - ⚠️ 절대 '국내 경제 상황', '글로벌 물가 흐름' 같은 거시경제 용어를 테마명으로 쓰지 말고, 실제 주식 시장의 업종 테마명을 작성하세요.
   - 형식: '• 테마명: 자금 유입 배경 및 시장 반응 요약 (1줄)' (줄바꿈 포함)
5. sections[1] (경제 일정):
   - title은 반드시 "{period_label} 놓치면 안 될 경제 일정"으로 고정하세요.
   - {period_label} 실제 핵심 일정 2~3개를 선택하세요.
   - 형식: '• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)' (줄바꿈 포함)

[출력 형식 JSON]
{{
  "title": "주간 프리미엄 마켓 인사이트: 최근 시장 데이터와 {period_label} 경제 일정",
  "subtitle": "시장 핵심 팩트 요약과 {period_label}({week_range}) 주요 경제 캘린더",
  "week_summary_bullets": [
    "국내 증시는 반도체 및 대형 기술주 중심의 외국인 수급에 힘입어 견조한 흐름을 유지했습니다.",
    "글로벌 증시는 미국의 주요 경제 지표 발표를 앞두고 환율 변동성이 다소 진정되며 관망세를 보였습니다.",
    "투자자들은 주 후반 발표될 소비자물가지수(CPI) 결과를 확인한 뒤 포트폴리오 방향을 결정하려는 신중한 태도를 취하고 있습니다."
  ],
  "sections": [
    {{
      "emoji": "🔥",
      "title": "최근 자금 쏠림 테마 복기",
      "content": "• 반도체 & AI: 글로벌 빅테크 AI 수요 지속 기대감으로 대형 반도체주 중심 매수세 유입\n• 방산 & 항공: 지정학적 긴장감 및 해외 수주 모멘텀 부각에 따른 안정적 실적주 매수세 유입\n• 금융 & 밸류업: 안정적인 배당 수익과 주주환원 정책 확대 기대감에 따른 방어적 자금 유입"
    }},
    {{
      "emoji": "📅",
      "title": "{period_label} 놓치면 안 될 경제 일정",
      "content": "• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)\n• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)\n• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)"
    }}
  ],
  "disclaimer": "본 리포트는 과거 데이터와 예정된 일정 등 객관적 사실만을 요약한 참고 자료입니다. 특정 종목에 대한 투자 권유나 추천이 아니며, 투자의 최종 책임은 본인에게 있습니다.",
  "generated_at": "{now.isoformat()}"
}}
"""

    try:
        response = generate_with_retry(prompt, json_mode=True)
        text = response.text.strip()
        
        report_data = safe_json_loads(text)
        if not report_data or not isinstance(report_data, dict):
            raise ValueError(f"Invalid JSON returned: {text[:100]}...")
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
