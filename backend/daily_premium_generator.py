import os
import json
import asyncio
from datetime import datetime
import pytz
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Gemini API 설정
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
def get_naver_net_buying(market_code="0", investor_code="9000", limit=10):
    """
    네이버 금융에서 순매수 데이터를 크롤링합니다.
    market_code: 0(코스피), 1(코스닥)
    investor_code: 9000(외국인), 8000(기관)
    """
    url = f"https://finance.naver.com/sise/sise_deal_rank_iframe.naver?sosok={market_code}&investor_ill={investor_code}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.encoding = 'euc-kr'
        soup = BeautifulSoup(res.text, 'html.parser')
        
        boxes = soup.find_all("div", class_="box_type_l")
        target_box = None
        for box in boxes:
            if "순매수" in box.text:
                target_box = box
                break
                
        if not target_box:
            return []
            
        table = target_box.find("table", class_="type_1")
        if not table:
            return []
            
        rows = table.find_all("tr")
        results = []
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 3:
                name_tag = cols[0].find("a")
                if not name_tag:
                    continue
                name = name_tag.text.strip()
                try:
                    vol_str = cols[1].text.strip().replace(",", "")
                    vol = int(vol_str) if vol_str.isdigit() else 0
                    if vol > 0:
                        results.append({"name": name, "volume": vol})
                except Exception:
                    pass
        return results[:limit]
    except Exception as e:
        print(f"Scraping error: {e}")
        return []

def generate_objective_report():
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d')
    
    # 1. 데이터 수집
    kospi_foreign = get_naver_net_buying(market_code="0", investor_code="9000", limit=10)
    kosdaq_foreign = get_naver_net_buying(market_code="1", investor_code="9000", limit=10)
    kospi_inst = get_naver_net_buying(market_code="0", investor_code="8000", limit=10)
    kosdaq_inst = get_naver_net_buying(market_code="1", investor_code="8000", limit=10)
    
    if not kospi_foreign and not kosdaq_foreign and not kospi_inst and not kosdaq_inst:
        print("Warning: No market data today (Naver API issue or holiday). Generating report with empty data.")
        kospi_foreign = [{"name": "데이터없음", "volume": 0}]
        kosdaq_foreign = [{"name": "데이터없음", "volume": 0}]
        kospi_inst = [{"name": "데이터없음", "volume": 0}]
        kosdaq_inst = [{"name": "데이터없음", "volume": 0}]
        
    kospi_f_names = [d['name'] for d in kospi_foreign[:5]]
    kosdaq_f_names = [d['name'] for d in kosdaq_foreign[:5]]
    kospi_i_names = [d['name'] for d in kospi_inst[:5]]
    kosdaq_i_names = [d['name'] for d in kosdaq_inst[:5]]
    
    raw_data_summary = f"""
[오늘의 수급 통계 원시 데이터]
- 코스피 외국인 순매수 상위: {', '.join(kospi_f_names) if kospi_f_names else '없음'}
- 코스닥 외국인 순매수 상위: {', '.join(kosdaq_f_names) if kosdaq_f_names else '없음'}
- 코스피 기관 순매수 상위: {', '.join(kospi_i_names) if kospi_i_names else '없음'}
- 코스닥 기관 순매수 상위: {', '.join(kosdaq_i_names) if kosdaq_i_names else '없음'}
    """
    
    prompt = f"""
당신은 대한민국 자본시장법을 엄격하게 준수하는 금융 통계 데이터 분석가입니다.
아래의 [수급 원시 데이터]를 바탕으로, 불특정 다수에게 제공하기 위한 '객관적인 통계 요약 브리핑'을 작성해 주세요.

[수급 원시 데이터]
{raw_data_summary}

[엄격한 작성 규칙 - 유사투자자문업 회피]
1. 절대로 '추천', '매수 타이밍', '공략', '목표가', '사라/팔라' 등의 방향성 제시나 종목 추천 단어를 사용하지 마세요.
2. 미래를 예측하거나 '내일 오를 것'이라는 뉘앙스를 철저히 배제하세요.
3. 오직 "오늘 시장에서 이런 종목에 매수가 몰렸다"는 과거 완료형 팩트만 건조하게 설명하세요.
4. 리포트는 다음 구조로 작성하세요 (반드시 마크다운 문법을 사용하여 가독성을 극대화하세요):

### 📊 오늘의 수급 특징 요약
(어떤 섹터에 돈이 들어갔는지 객관적 서술. 단락 사이에 줄바꿈을 넣어주세요.)

### 🌐 외국인 순매수 상위 팩트 체크
(각 종목마다 글머리 기호 `-` 를 사용하고, 종목명은 **굵게(Bold)** 처리하세요. 예: `- **삼성전자**: 설명`)

### 🏢 기관 순매수 상위 팩트 체크
(각 종목마다 글머리 기호 `-` 를 사용하고, 종목명은 **굵게(Bold)** 처리하세요.)

[출력 형식 제한]
- 미리보기용 짧은 요약(Preview, 1~2문장)과 전체 본문(Content)을 구분해서 작성합니다.
- Preview 텍스트와 본문 사이에 `|||SPLIT|||` 이라는 구분자를 반드시 넣어주세요.
    """
    
    report_title = f"[{today_str}] 장 마감 기관/외국인 순매수 데이터 요약"
    preview_text = "오늘 시장에서 발생한 외국인과 기관의 순매수 통계 데이터 및 수급 특징주 현황입니다."
    content_text = "데이터를 불러오는 데 실패했습니다."
    
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-pro")
            response = model.generate_content(prompt)
            result = response.text.strip()
            if "|||SPLIT|||" in result:
                preview_text, content_text = result.split("|||SPLIT|||", 1)
                preview_text = preview_text.strip()
                content_text = content_text.strip()
            else:
                content_text = result
        except Exception as e:
            print(f"Gemini API error: {e}")
            content_text = f"통계 요약 중 오류가 발생했습니다. 원시 데이터: \n{raw_data_summary}"
    else:
        content_text = f"API Key가 없습니다.\n\n{raw_data_summary}"

    final_report = {
        "report_date": today_str,
        "title": report_title,
        "preview": preview_text,
        "content": content_text
    }
    
    save_path = os.path.join(os.path.dirname(__file__), "premium_report_today.json")
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(final_report, f, ensure_ascii=False, indent=2)
        
    print(f"[Premium Report] generated and saved to {save_path}")

if __name__ == "__main__":
    generate_objective_report()
