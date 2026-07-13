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
    
def get_naver_net_buying(market_code="01", investor_code="9000", limit=10):
    """
    네이버 금융에서 순매수 데이터를 크롤링합니다.
    market_code: 01(코스피), 02(코스닥)
    investor_code: 9000(외국인), 8000(기관)
    """
    url = f"https://finance.naver.com/sise/sise_deal_rank_iframe.naver?sosok={market_code}&investor_gubun={investor_code}&type=buy"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.encoding = 'euc-kr'
        soup = BeautifulSoup(res.text, 'html.parser')
        
        table = soup.find("table", class_="type_1")
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
                    vol_str = cols[2].text.strip().replace(",", "")  # 3번째 컬럼이 순매수 금액(백만) / 4번째가 순매수량
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
    kospi_foreign = get_naver_net_buying(market_code="01", investor_code="9000", limit=10)
    kosdaq_foreign = get_naver_net_buying(market_code="02", investor_code="9000", limit=10)
    kospi_inst = get_naver_net_buying(market_code="01", investor_code="8000", limit=10)
    kosdaq_inst = get_naver_net_buying(market_code="02", investor_code="8000", limit=10)
    
    if not kospi_foreign and not kosdaq_foreign and not kospi_inst and not kosdaq_inst:
        print("Warning: No market data today (Naver API issue or holiday). Generating report with empty data.")
        kospi_foreign = [{"name": "데이터없음", "volume": 0}]
        kosdaq_foreign = [{"name": "데이터없음", "volume": 0}]
        kospi_inst = [{"name": "데이터없음", "volume": 0}]
        kosdaq_inst = [{"name": "데이터없음", "volume": 0}]
        
    kospi_f_list = [f"{d['name']} ({d['volume']:,}주)" for d in kospi_foreign[:5]]
    kosdaq_f_list = [f"{d['name']} ({d['volume']:,}주)" for d in kosdaq_foreign[:5]]
    kospi_i_list = [f"{d['name']} ({d['volume']:,}주)" for d in kospi_inst[:5]]
    kosdaq_i_list = [f"{d['name']} ({d['volume']:,}주)" for d in kosdaq_inst[:5]]
    
    raw_data_summary = f"""
[오늘의 수급 통계 원시 데이터]
- 코스피 외국인 순매수 상위: {', '.join(kospi_f_list) if kospi_f_list else '없음'}
- 코스닥 외국인 순매수 상위: {', '.join(kosdaq_f_list) if kosdaq_f_list else '없음'}
- 코스피 기관 순매수 상위: {', '.join(kospi_i_list) if kospi_i_list else '없음'}
- 코스닥 기관 순매수 상위: {', '.join(kosdaq_i_list) if kosdaq_i_list else '없음'}
    """
    
    prompt = f"""
당신은 여의도 최고의 기관/외국인 수급 분석 수석 전문가입니다.
아래의 [수급 원시 데이터]를 바탕으로, VVIP 투자자들을 위한 '심층 수급 분석 리포트'를 작성해 주세요.

[수급 원시 데이터]
{raw_data_summary}

[작성 규칙 및 자본시장법 준수]
1. 절대로 '추천', '매수 타이밍', '공략', '목표가', '사라/팔라' 등의 직접적인 매수/매도 추천 단어를 사용하지 마세요. (법적 리스크 방지)
2. 단순히 "~종목에 포함되었습니다"라는 기계적이고 단조로운 문장을 절대 반복하지 마세요!
3. 원시 데이터에 제공된 **순매수 수량(주수)**을 반드시 본문에 포함하여 분석하세요. (예: "삼성전자 1,500,000주 대량 매집")
4. 각 종목별로 해당 종목이 속한 테마, 최근 시장 이슈, 그리고 외국인이나 기관이 '왜 이 엄청난 수량을 집중 매집했을까?'에 대한 전문가적인 인사이트와 분석 코멘트를 1~2줄로 깊이 있게 덧붙이세요.
5. 리포트는 다음 구조로 작성하세요 (반드시 마크다운 문법을 사용하여 가독성을 극대화하세요):

### 📊 오늘의 수급 특징 요약
(오늘 기관/외국인 수급이 어느 섹터/테마로 쏠렸는지, 시장의 전체적인 수급 흐름을 전문가의 날카로운 시선으로 총평해주세요.)

### 🌐 외국인 순매수 상위 팩트 체크
(각 종목마다 글머리 기호 `-` 를 사용하고, 종목명은 **굵게(Bold)** 처리하세요. 예: `- **삼성전자**: [1,500,000주 대량 매집] 최근 반도체 업황 턴어라운드 기대감과 함께 외국인의 저점 매수세가 강하게 유입된 것으로 분석됩니다...`)

### 🏢 기관 순매수 상위 팩트 체크
(위와 동일하게 각 종목마다 글머리 기호 `-` 와 **종목명**, **매수 수량**을 포함하고, 기관이 매집한 이유와 인사이트를 분석해 주세요.)

[출력 형식 제한]
- 미리보기용 짧은 요약(Preview, 1~2문장)과 전체 본문(Content)을 구분해서 작성합니다.
- Preview 텍스트와 본문 사이에 `|||SPLIT|||` 이라는 구분자를 반드시 넣어주세요.
    """
    
    report_title = f"[{today_str}] 장 마감 기관/외국인 순매수 데이터 요약"
    preview_text = "오늘 시장에서 발생한 외국인과 기관의 순매수 통계 데이터 및 수급 특징주 현황입니다."
    content_text = "데이터를 불러오는 데 실패했습니다."
    
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
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
