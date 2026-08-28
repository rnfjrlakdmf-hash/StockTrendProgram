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
        
    prompt = f"""당신은 국내외 메이저 헤지펀드와 슈퍼개미들을 위한 주간 수급 인텔리전스 수석 애널리스트입니다.
주말에만 열람 가능한 프리미엄 [주말 한정판: 슈퍼 고래(Whale) 수급 심층 엑스레이 리포트]를 작성해야 합니다.

[현재 시간] {now.strftime('%Y-%m-%d %H:%M KST')}

[이번 주 금요일 마감 기준 수급 데이터 (순매수 수량)]
- 외국인 순매수 TOP 10: {foreign_str}
- 기관 순매수 TOP 10: {inst_str}

[작성 지침 및 자본시장법 준수]
1. 절대로 '매수 추천', '목표가 달성 시 매도' 등 직접적인 매매 권유 표현을 쓰지 마세요. 객관적 수급 팩트와 시장 통계로 작성하세요.
2. 실제 제공된 실제 종목명을 기반으로 분석하세요.
3. 다음 3대 고래 수급 섹션을 반드시 완성하세요:
   - whale_sectors: 한 주간 고래 자금이 가장 집중된 상위 3대 주도 섹터(예: AI반도체, 방산/우주, 전력인프라/변압기 등)와 핵심 대장주, 자금 유입 배경
   - hidden_whales: 주가는 크게 과열되지 않았으나 외인·기관이 조용히 수량을 축적한 '은밀한 고래 매집주 3선'
   - foreign_analysis & inst_analysis: 상위 순매수 종목별 팩트 분석 (1~2줄)
   - monday_strategy: 다음 주 월요일 시초가 및 주간 대응 로드맵 (수급 핵심, 눌림목 지표 점검, 리스크 관리 3단계)

[출력 형식 JSON]
{{
  "title": "주말 한정판: 슈퍼 고래(Whale) 수급 심층 엑스레이",
  "subtitle": "한 주간 시장을 뒤흔든 슈퍼 고래들의 집중 매집 섹터와 은밀한 매집주를 해부합니다.",
  "whale_sectors": [
    {{"sector": "주도 섹터명", "leader": "대표 종목", "intensity": "초강력", "flow_reason": "거대 자금 유입 배경 1~2문장"}}
  ],
  "hidden_whales": [
    {{"stock": "종목명", "amount": "123,456주", "pattern": "주가 횡보 속 메이저 3일 연속 매집", "catalyst": "실적 및 밸류체인 모멘텀"}}
  ],
  "foreign_analysis": [
    {{"stock": "종목명", "amount": "123,456주", "reason": "매집 추정 이유 1~2줄"}}
  ],
  "inst_analysis": [
    {{"stock": "종목명", "amount": "123,456주", "reason": "매집 추정 이유 1~2줄"}}
  ],
  "monday_strategy": "• 📌 주간 수급 총평: 외국인과 기관의 자금이 반도체와 방산 등 실적 가시성이 높은 대형 수출주로 압축 유입되었습니다.\n• 🎯 월요일 시초가 체크포인트: 주말 간 발표된 글로벌 지표(환율, 필라델피아 반도체 지수)를 확인하고, 갭상승 추격보다는 20일선 지지 라인 안착 여부를 우선 확인하세요.\n• 🛡️ 리스크 관리 (종목 압축): 단기 변동성 확대를 방어하기 위해 수급 연속성이 확인된 주도 섹터 중심으로 포트폴리오를 점검하는 것이 유리합니다.",
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
