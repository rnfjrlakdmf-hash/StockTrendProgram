import os
import re
import html
import json
import asyncio
from datetime import datetime, timedelta
import pytz

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

REPORT_FILE = os.path.join(DATA_DIR, "weekend_report.json")


def _clean_html_lines(raw_html: str):
    if not raw_html:
        return []
    text = re.sub(r'<br\s*/?>|</p>|</li>|</div>|</tr>', '\n', raw_html, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    lines = []
    for raw_line in text.splitlines():
        line = re.sub(r'^[\s•\-\*·:]+', '', raw_line).strip()
        if len(line) >= 6:
            lines.append(line)
    return lines


def _format_broker_name(name: str) -> str:
    if not name:
        return "주요 증권사"
    name = name.strip()
    if not name.endswith("증권") and not name.endswith("투자") and "금융" not in name and "경제" not in name:
        return f"{name}증권"
    if name.endswith("투자"):
        return f"{name}증권"
    return name


def get_real_securities_research():
    """
    네이버 증권 리서치 v2 API를 통해 국내 주요 증권사의 최신 리서치 리포트
    (시황/투자전략, 산업/섹터분석, 종목/목표주가 리포트)를 실시간 수집합니다.
    """
    import requests
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://stock.naver.com/research/daily"
    }

    collected = []
    category_configs = [
        ("market", "시황·투자전략", "daily", 1),
        ("invest", "시황·투자전략", "invest", 1),
        ("industry", "산업·섹터분석", "industry", 2),
        ("company", "종목·목표주가", "company", 2),
    ]

    for api_cat, cat_label, url_slug, max_pick in category_configs:
        url = f"https://stock.naver.com/api/stockSecurity/researches/v2/{api_cat}?size=8"
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code != 200:
                continue
            items = r.json().get("items", [])
            picked = 0
            for item in items:
                title = (item.get("title") or "").strip()
                if not title:
                    continue
                # 가상자산 데일리 등은 주식 리포트 우선순위를 위해 제외
                if "디지털자산" in title or "비트코인" in title:
                    continue

                nid = str(item.get("nid") or "")
                broker = _format_broker_name(item.get("brokerName") or "")
                write_date = item.get("writeDate") or ""
                lines = _clean_html_lines(item.get("content") or "")
                if not lines:
                    continue

                # 첫 줄이 제목이나 단순 반복이면 제외하고 핵심 요약 3줄 추출
                raw_points = []
                for ln in lines:
                    if ln == title:
                        continue
                    raw_points.append(ln[:160])
                    if len(raw_points) >= 3:
                        break
                if not raw_points:
                    raw_points = [lines[0][:160]]

                target = "국내 증시 시황"
                if api_cat == "company":
                    target = item.get("itemName") or "주요 종목"
                elif api_cat == "industry":
                    target = item.get("industryKoreanName") or "핵심 산업"
                elif api_cat == "invest":
                    target = "포트폴리오·투자전략"

                goal_price_raw = item.get("goalPrice")
                goal_price = None
                if goal_price_raw and str(goal_price_raw).isdigit() and int(goal_price_raw) > 0:
                    goal_price = f"{int(goal_price_raw):,}원"

                opinion_raw = (item.get("opinionText") or "").strip()
                opinion = None
                if opinion_raw:
                    if opinion_raw.lower() in ["buy", "매수", "strong buy"]:
                        opinion = "Buy (매수)"
                    elif opinion_raw.lower() in ["hold", "중립", "marketperform"]:
                        opinion = "Hold (중립)"
                    else:
                        opinion = opinion_raw

                # 기본 초보자 눈높이 해설 & 체크포인트 (LLM 보강 전/실패 시 안전망)
                if api_cat in ["market", "invest"]:
                    default_easy = f"{broker}에서 발표한 최신 시황·전략 분석입니다. 최근 증시 변동성 속에서 지수의 하방 지지선을 점검하고, 외국인·기관 수급이 유입되는 핵심 업종 위주로 차분하게 대응하라는 내용입니다."
                    default_check = "단기 지수 등락에 흔들리기보다 환율 안정 여부와 외국인 순매수 전환 시점을 함께 확인하세요."
                elif api_cat == "industry":
                    default_easy = f"{broker}의 '{target}' 업종 심층 분석 리포트입니다. 업황 데이터와 기업들의 실적 흐름을 점검하여, 단기 노이즈로 주가가 조정을 받을 때 실적 기반이 탄탄한 기업들의 매력이 부각된다는 평가입니다."
                    default_check = f"'{target}' 업종 내 대장주의 분기 영업이익 추이와 기관 투자자들의 수급 유입 여부를 체크하세요."
                else:
                    gp_txt = f" (목표주가 {goal_price})" if goal_price else ""
                    default_easy = f"{broker}에서 '{target}'{gp_txt}에 대해 발표한 기업 분석 리포트입니다. 주력 사업의 수주 및 실적 성장성을 바탕으로 중장기 기업 가치 상승 여력을 점검한 보고서입니다."
                    default_check = f"'{target}'의 다가오는 분기 실적(매출·영업이익)이 증권사 예상치(컨센서스)에 부합하는지 확인하세요."

                collected.append({
                    "id": f"{api_cat}_{nid}",
                    "category": cat_label,
                    "broker": broker,
                    "date": write_date,
                    "title": title,
                    "target": target,
                    "item_code": item.get("itemCode") or None,
                    "goal_price": goal_price,
                    "opinion": opinion,
                    "raw_points": raw_points,
                    "easy_summary": default_easy,
                    "checkpoint": default_check,
                    "naver_url": f"https://stock.naver.com/research/{url_slug}/{nid}" if nid else "https://stock.naver.com/research/daily"
                })
                picked += 1
                if picked >= max_pick:
                    break
        except Exception as e:
            print(f"[WeekendReport] Research fetch error for {api_cat}: {e}")

    return collected


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
    
    securities_research = []
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
        
        securities_research = get_real_securities_research()
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

    research_prompt_lines = []
    for idx, r_item in enumerate(securities_research):
        pts = " / ".join(r_item.get("raw_points", []))
        gp_info = f" (목표주가: {r_item['goal_price']}, 투자의견: {r_item['opinion']})" if r_item.get("goal_price") else ""
        research_prompt_lines.append(
            f"[{idx}] ID={r_item['id']} | 분류={r_item['category']} | 증권사={r_item['broker']} | 대상={r_item['target']}{gp_info} | 제목={r_item['title']}\n    원문요약: {pts}"
        )
    research_context = "\n".join(research_prompt_lines) if research_prompt_lines else "최근 증권사 리포트 데이터 없음"
        
    prompt = f"""당신은 주식 초보자에게 시장 상황과 증권사 리서치 보고서를 아주 쉽고 친절하게 설명해주는 최고의 금융 멘토입니다.
주말 및 주간 프리미엄 마켓 인사이트를 작성해야 합니다.
절대 '급등 확실', '무조건 매수 추천' 같은 자극적인 투자자문성 단어를 사용하지 마세요.
오직 '최근 시장 데이터', '실제 증권사 리서치 내용', '{period_label}({week_range}) 주요 경제 일정'이라는 객관적 사실 기반으로만 작성하되,
**중학생이나 주식 입문자도 한눈에 이해할 수 있도록 아주 쉽고 친절하고 풍부한 설명문 형식**으로 풀어 써주세요.

[작성 기준일 (오늘)] {today_str}
[{period_label} 대상 기간] {week_range} (월요일 ~ 금요일)

[최근 마감 시장 지표]
{index_summary}

[최근 주요 경제 뉴스]
{chr(10).join(news_titles[:10])}

[최근 주요 증권사 실제 발표 리서치 리포트 목록]
{research_context}

[{period_label}({week_range}) 실제 예정된 주요 경제 일정 데이터]
{calendar_summary}

[작성 지침]
1. week_summary_bullets (4개 항목 필수):
   - 한 주간의 시장 흐름을 입체적으로 파악할 수 있도록 **총 4개의 핵심 요약 문장(각 2문장 내외로 풍부하게)**을 작성하세요.
   - 1번: [국내 증시 & 수급] 최근 코스피·코스닥 지수 흐름과 외국인·기관 투자자들의 수급(매수·매도) 특징을 쉽게 설명하세요.
   - 2번: [미국 증시 & 금리·환율] 미국 빅테크(AI·반도체) 흐름과 물가지수·국채금리·원/달러 환율이 우리 시장에 미친 영향을 쉽게 설명하세요.
   - 3번: [증권사 리서치 컨센서스] 이번 주 주요 증권사 애널리스트들이 공통적으로 강조하는 시장 대응 포인트(저점 분할 접근, 실적주 선별 등)를 요약하세요.
   - 4번: [차주 핵심 관전 포인트] {period_label} 예정된 주요 경제 일정(소비자물가지수, 산업생산 등) 발표를 앞두고 초보 투자자가 기억해야 할 대응 자세를 설명하세요.
2. sections[0] (최근 자금 쏠림 테마 복기):
   - title은 반드시 "최근 자금 쏠림 테마 복기"로 고정하세요.
   - 최근 증시와 증권사 리포트에서 주목받은 실제 주식 업종/테마 4개(예: 반도체 & AI 인프라, 전력설비 & 원전(SMR), 바이오 & 헬스케어, 금융·통신 & 배당 밸류업 등)를 선정하세요.
   - 각 테마마다 단순 1줄이 아니라, **왜 자금이 몰렸는지(배경) + 어떤 분야의 기업들인지 + 다음 주에 무엇을 체크해야 하는지**를 2~3문장으로 자세하고 친절하게 작성하세요.
   - 형식: '• 테마명: 상세하고 쉬운 설명 (2~3문장)' (각 테마는 줄바꿈 \\n 으로 구분)
3. sections[1] (경제 일정):
   - title은 반드시 "{period_label} 놓치면 안 될 경제 일정"으로 고정하세요.
   - 위에 제공된 실제 {period_label}({week_range}) 일정 데이터에서 **가장 중요한 3~4개를 선택**하여 작성하세요.
   - 반드시 형식: '• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)' 처럼 요일 뒤에 콜론(:)을 명확하게 붙여서 작성하세요.
4. research_easy_guides (증권사 리포트 초보자 눈높이 해설):
   - 위에 제공된 [최근 주요 증권사 실제 발표 리서치 리포트 목록]의 각 항목(ID 기준)에 대해, 주식 초보자가 리포트 원문의 어려운 용어(PER, PBR, CapEx, 컨센서스, SMR, 가계대출 등)를 쉽게 이해할 수 있도록:
     - `id`: 리포트 ID 그대로 입력
     - `easy_summary`: "이 증권사 리포트가 쉽게 말해 무슨 뜻인가요?"에 대한 2~3문장의 친절한 해설
     - `checkpoint`: 이 리포트를 참고할 때 개인 투자자가 꼭 확인해야 할 실전 체크포인트 1문장

[출력 형식 JSON]
{{
  "title": "주간 프리미엄 마켓 인사이트: 최근 시장 데이터와 {period_label} 경제 일정",
  "subtitle": "한 주간 국내외 증시 핵심 팩트, 주요 증권사 리서치 요약 및 {period_label}({week_range}) 주요 경제 캘린더",
  "week_summary_bullets": [
    "[국내 증시 & 수급] ...",
    "[미국 증시 & 금리·환율] ...",
    "[증권사 리서치 컨센서스] ...",
    "[차주 핵심 관전 포인트] ..."
  ],
  "sections": [
    {{
      "emoji": "🔥",
      "title": "최근 자금 쏠림 테마 복기",
      "content": "• 반도체 & AI 인프라: ...\\n• 전력설비 & 원전(SMR): ...\\n• 바이오 & 헬스케어: ...\\n• 금융·통신 & 밸류업: ..."
    }},
    {{
      "emoji": "📅",
      "title": "{period_label} 놓치면 안 될 경제 일정",
      "content": "• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)\\n• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)\\n• M월 D일(요일): [일정명] (초보자를 위한 쉬운 체크포인트 설명)"
    }}
  ],
  "research_easy_guides": [
    {{
      "id": "market_37832",
      "easy_summary": "...",
      "checkpoint": "..."
    }}
  ],
  "disclaimer": "본 리포트는 과거 데이터와 주요 증권사 공개 리서치 요약, 예정된 일정 등 객관적 사실만을 정리한 참고 자료입니다. 특정 종목에 대한 투자 권유나 추천이 아니며, 투자의 최종 책임은 본인에게 있습니다.",
  "generated_at": "{now.isoformat()}"
}}
"""

    try:
        response = generate_with_retry(prompt, json_mode=True)
        text = response.text.strip()
        
        report_data = safe_json_loads(text)
        if not report_data or not isinstance(report_data, dict):
            raise ValueError(f"Invalid JSON returned: {text[:100]}...")

        # LLM이 생성한 초보자 눈높이 해설을 실제 수집된 증권사 리서치 데이터에 병합
        guide_map = {}
        for g in report_data.get("research_easy_guides", []):
            if isinstance(g, dict) and g.get("id"):
                guide_map[str(g["id"])] = g

        for r_item in securities_research:
            matched_guide = guide_map.get(r_item["id"])
            if matched_guide:
                if matched_guide.get("easy_summary"):
                    r_item["easy_summary"] = matched_guide["easy_summary"]
                if matched_guide.get("checkpoint"):
                    r_item["checkpoint"] = matched_guide["checkpoint"]

        report_data["securities_research"] = securities_research
        report_data.pop("research_easy_guides", None)
        report_data["generated_at"] = now.isoformat()
        
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
            
        print(f"[WeekendReport] Saved successfully with {len(securities_research)} securities research items.")
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
