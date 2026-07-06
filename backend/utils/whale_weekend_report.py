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
    url = "https://finance.naver.com/sise/sise_deal_rank.naver"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.encoding = 'euc-kr'
        soup = BeautifulSoup(res.text, 'html.parser')
        
        tables = soup.find_all('table', class_='type_r1')
        if len(tables) < 2:
            return [], []
            
        # 첫 번째 테이블: 코스피 외국인 순매수
        foreign_rows = tables[0].find_all('tr')
        foreign_top10 = []
        for row in foreign_rows:
            name_cell = row.find('a', class_='company')
            number_cell = row.find('td', class_='number')
            if name_cell and number_cell:
                foreign_top10.append({"stock": name_cell.text.strip(), "amount": number_cell.text.strip()})
                if len(foreign_top10) == 10:
                    break
                    
        # 두 번째 테이블: 코스피 기관 순매수
        inst_rows = tables[1].find_all('tr')
        inst_top10 = []
        for row in inst_rows:
            name_cell = row.find('a', class_='company')
            number_cell = row.find('td', class_='number')
            if name_cell and number_cell:
                inst_top10.append({"stock": name_cell.text.strip(), "amount": number_cell.text.strip()})
                if len(inst_top10) == 10:
                    break
                    
        return foreign_top10, inst_top10
    except Exception as e:
        print(f"[WhaleReport] Data fetch error: {e}")
        return [], []

def _generate_whale_report_sync():
    from ai_analysis import generate_with_retry, API_KEY
    
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    foreign_top10, inst_top10 = fetch_whale_top10()
    if not foreign_top10:
        foreign_top10 = [{"stock": "데이터 수집 실패", "amount": "0"}]
    if not inst_top10:
        inst_top10 = [{"stock": "데이터 수집 실패", "amount": "0"}]
        
    foreign_str = ", ".join([f"{item['stock']} ({item['amount']}주)" for item in foreign_top10])
    inst_str = ", ".join([f"{item['stock']} ({item['amount']}주)" for item in inst_top10])
    
    print(f"[WhaleReport] Foreign: {foreign_str}, Inst: {inst_str}")
    
    if not API_KEY:
        print("[WhaleReport] No Gemini API Key")
        return None
        
    prompt = f"""당신은 상위 1% 주식 투자자들에게 고급 수급 정보를 제공하는 수석 애널리스트입니다.
주말에만 열람 가능한 프리미엄 [세력/외인 매집 TOP 10 리포트]를 작성해야 합니다.

[현재 시간] {now.strftime('%Y-%m-%d %H:%M KST')}

[이번 주 금요일 마감 기준 수급 데이터 (순매수 수량)]
- 외국인 순매수 TOP 10: {foreign_str}
- 기관 순매수 TOP 10: {inst_str}

위 데이터를 바탕으로 각 종목들이 왜 매집되었는지(최근 뉴스, 실적, 테마 등)를 사실 기반으로 분석하여 월요일 장을 준비할 수 있도록 흥미로운 리포트를 작성해주세요.

[출력 형식 JSON]
{{
  "title": "주말 한정판: 세력/외인 매집 TOP 10",
  "subtitle": "이번 주 금요일, 스마트머니(외국인/기관)는 이 종목들을 쓸어담았습니다.",
  "foreign_analysis": [
    {{"stock": "종목명1", "amount": "수량(예: 76,600)", "reason": "매집 추정 이유 1~2줄"}},
    {{"stock": "종목명2", "amount": "수량", "reason": "매집 추정 이유 1~2줄"}}
    // 10개 종목 모두 작성
  ],
  "inst_analysis": [
    {{"stock": "종목명1", "amount": "수량", "reason": "매집 추정 이유 1~2줄"}}
    // 10개 종목 모두 작성
  ],
  "monday_strategy": "이 수급 데이터를 바탕으로 한 다음 주 월요일 시장 대응 전략 (3~4줄)",
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
    # Test locally
    print(asyncio.run(generate_whale_weekend_report()))
