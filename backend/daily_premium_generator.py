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
당신은 대한민국 최상위 0.1% 패밀리오피스 및 여의도 기관 전담 VVIP 퀀트 수석 애널리스트입니다.
아래 [수급 원시 통계 데이터]를 바탕으로, VVIP 투자자들을 위한 [VIP 데일리 퀀트 인텔리전스 리포트]를 작성해 주세요.

[수급 원시 데이터]
{raw_data_summary}

[작성 지침 및 자본시장법 준수]
1. 절대로 '매수 추천', '목표가 달성 시 매도', '지금 사세요' 등의 1:1 투자 자문이나 매매 권유 표현을 쓰지 마세요.
2. 팩트 데이터(순매수 수량, 증권사 리서치 컨센서스, 이동평균선 위치, 거래대금)를 기반으로 한 고품격 객관적 분석을 제공하세요.
3. 리포트는 다음 4개 럭셔리 섹션으로 구성하세요 (마크다운 포맷):

### 💎 Section 1. 스마트머니 자금 대이동 맥락 (Market Pulse)
- 오늘 외인과 기관의 거대 자금이 어떤 섹터에서 차익실현되고, 어떤 섹터/테마로 집중 이동(로테이션)했는지 큰 흐름을 3~4문장으로 심도 있게 총평하세요.

### 🏆 Section 2. VVIP 퀀트 밸런스 알파 3선 (Quant Alpha Top 3)
- 오늘 수급 강도와 기술적 위치가 가장 돋보이는 핵심 3개 종목을 선별하여 심층 브리핑하세요:
  - **종목명 (수급 수량)**:
    - 📊 **수급 팩트**: 왜 외인/기관이 대량 매집했는지 배경 (실적 턴어라운드, 글로벌 공급망, 신사업 등)
    - 📈 **기술적 지표 위치**: 20일 이동평균선 지지 여부, 이격도 및 거래량 변화
    - 🎯 **컨센서스 참고**: 증권사 리서치 센터의 공개 목표주가 추이 및 시장 평가

### 🚀 Section 3. 내일의 주도 유망 테마 & 밸류체인 레이더 (Tomorrow Catalyst)
- 내일 및 이번 주 후반 시장에서 강력한 수급 연속성을 보일 유망 테마 1~2개와 관련 밸류체인(소부장, 대장주 등)의 핵심 연결고리를 설명하세요.

### 🛡️ Section 4. 지수 변동성 헷지 & 리스크 관리 분석 (Risk & Defense)
- 외국인의 선물/인버스 포지션 동향과 함께, 지수 단기 변동성에 대비한 리스크 관리 포인트(단기 과열 주의, 지지 라인 안착 여부)를 객관적으로 짚어주세요.

---
*※ 본 리포트는 공시 및 시장 통계 데이터를 기반으로 한 단순 정보 제공용이며, 특정 종목에 대한 매수·매도를 권유하지 않습니다. 투자 판단의 최종 책임은 투자자 본인에게 있습니다.*

[출력 형식 제한]
- 미리보기용 짧은 프리뷰(Preview, 1~2문장)와 전체 본문(Content) 사이에 `|||SPLIT|||` 구분자를 반드시 넣어주세요.
    """
    
    report_title = f"[{today_str}] VVIP 데일리 퀀트 & 주도 섹터 인텔리전스"
    preview_text = "오늘 스마트머니의 자금 대이동 맥락과 퀀트 밸런스 알파 3선, 내일의 주도 테마 밸류체인 심층 브리핑입니다."
    content_text = "데이터를 불러오는 데 실패했습니다."
    
    try:
        from ai_analysis import generate_with_retry, safe_json_loads
        response = generate_with_retry(prompt)
        if response and hasattr(response, 'text'):
            result = response.text.strip()
            # If AI returned JSON object
            parsed = safe_json_loads(result)
            if isinstance(parsed, dict) and "content" in parsed:
                content_text = parsed["content"]
                if "preview" in parsed:
                    preview_text = parsed["preview"]
            elif "|||SPLIT|||" in result:
                preview_text, content_text = result.split("|||SPLIT|||", 1)
                preview_text = preview_text.strip()
                content_text = content_text.strip()
            else:
                content_text = result
    except Exception as e:
        print(f"Generation error: {e}")
        content_text = f"통계 요약 중 오류가 발생했습니다. 원시 데이터: \n{raw_data_summary}"

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
