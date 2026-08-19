import os
import json
import asyncio
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

REPORT_FILE = os.path.join(DATA_DIR, "whale_weekend_report.json")

def fetch_whale_top10():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    def get_rank_from_iframe(market_code="01", investor_code="9000", limit=10):
        url = f"https://finance.naver.com/sise/sise_deal_rank_iframe.naver?sosok={market_code}&investor_gubun={investor_code}&type=buy"
        try:
            res = requests.get(url, headers=headers, timeout=10)
            res.encoding = 'euc-kr'
            soup = BeautifulSoup(res.text, 'html.parser')
            table = soup.find('table', class_='type_1')
            if not table:
                return []
            items = []
            for row in table.find_all('tr'):
                cols = row.find_all('td')
                if len(cols) >= 4:
                    name_tag = cols[0].find('a')
                    if name_tag:
                        name = name_tag.text.strip()
                        vol = cols[3].text.strip()
                        if name and vol:
                            items.append({"stock": name, "amount": f"{vol}주"})
            return items[:limit]
        except Exception as e:
            print(f"[WhaleReport] Scraper error ({market_code}, {investor_code}): {e}")
            return []

    foreign_top10 = get_rank_from_iframe("01", "9000", 10)
    inst_top10 = get_rank_from_iframe("01", "8000", 10)

    # Fallback to KOSDAQ if KOSPI is empty
    if not foreign_top10:
        foreign_top10 = get_rank_from_iframe("02", "9000", 10)
    if not inst_top10:
        inst_top10 = get_rank_from_iframe("02", "8000", 10)

    return foreign_top10, inst_top10

def _generate_whale_report_sync():
    from ai_analysis import generate_with_retry, API_KEY
    
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    foreign_top10, inst_top10 = fetch_whale_top10()
    if not foreign_top10:
        foreign_top10 = [{"stock": "데이터 수집 중", "amount": "0주"}]
    if not inst_top10:
        inst_top10 = [{"stock": "데이터 수집 중", "amount": "0주"}]
        
    foreign_str = ", ".join([f"{item['stock']} ({item['amount']})" for item in foreign_top10])
    inst_str = ", ".join([f"{item['stock']} ({item['amount']})" for item in inst_top10])
    
    print(f"[WhaleReport] Foreign: {foreign_str}")
    print(f"[WhaleReport] Inst: {inst_str}")
    
    if not API_KEY:
        print("[WhaleReport] No Gemini API Key")
        return None
        
    prompt = f"""당신은 상위 1% 주식 투자자들에게 고급 수급 정보를 제공하는 수석 애널리스트입니다.
주말에만 열람 가능한 프리미엄 [세력/외인 매집 TOP 10 리포트]를 작성해야 합니다.

[현재 시간] {now.strftime('%Y-%m-%d %H:%M KST')}

[이번 주 금요일 마감 기준 수급 데이터 (순매수 수량)]
- 외국인 순매수 TOP 10: {foreign_str}
- 기관 순매수 TOP 10: {inst_str}

[작성 지침]
1. 실제 제공된 종목 10개 각각에 대해 왜 매집되었는지(실적, 뉴스, 테마, 글로벌 수급) 1~2문장의 명쾌하고 가독성 높은 사실 기반 이유를 작성하세요.
2. 절대 '임시추가종목'이나 '더미 텍스트'를 넣지 마세요. 제공된 실제 종목명을 그대로 사용하세요.
3. monday_strategy: 줄글로 길게 늘어놓지 말고, 아래 3개 항목의 불릿 포인트 형식으로 한눈에 쏙 들어오게 작성하세요 (줄바꿈 포함):
   • 📌 수급 핵심 요약: (외인/기관 자금 흐름 1줄)
   • 🎯 공략 포인트: (월요일 장 초반 대응 전략 1줄)
   • 🛡️ 리스크 관리: (유의해야 할 점 1줄)

[출력 형식 JSON]
{{
  "title": "주말 한정판: 세력/외인 매집 TOP 10",
  "subtitle": "이번 주 금요일, 스마트머니(외국인/기관)는 이 종목들을 쓸어담았습니다.",
  "foreign_analysis": [
    {{"stock": "종목명", "amount": "123,456주", "reason": "매집 추정 이유 1~2줄"}}
  ],
  "inst_analysis": [
    {{"stock": "종목명", "amount": "123,456주", "reason": "매집 추정 이유 1~2줄"}}
  ],
  "monday_strategy": "• 📌 수급 핵심 요약: 외인·기관 양대 수급이 반도체 대장주와 K-수출 실적주로 집중 압축되었습니다.\n• 🎯 공략 포인트: 스마트머니가 실린 실적 우량주의 눌림목 구간을 선별적으로 공략하는 전략이 유리합니다.\n• 🛡️ 리스크 관리: 무리한 단기 테마주 추종을 지양하고 수급 연속성이 확인된 종목 위주로 포트폴리오를 압축하세요.",
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
            
        print("[WhaleReport] Saved successfully.")
        return report_data
    except Exception as e:
        print(f"[WhaleReport] Generation error: {e}")
        return None

async def generate_whale_weekend_report():
    return await asyncio.to_thread(_generate_whale_report_sync)

def get_latest_whale_report():
    if os.path.exists(REPORT_FILE):
        try:
            with open(REPORT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return None
    return None

if __name__ == "__main__":
    _generate_whale_report_sync()
