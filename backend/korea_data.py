import requests
from bs4 import BeautifulSoup
import re

def get_naver_disclosures(symbol: str):
    """
    네이버 금융에서 특정 종목의 최신 전자공시 목록을 크롤링합니다.
    symbol: '005930' (종목코드, .KS/.KQ 제거 필요)
    """
    # .KS, .KQ 제거
    code = symbol.split('.')[0]
    
    # 숫자만 남기기
    code = re.sub(r'[^0-9]', '', code)
    
    if len(code) != 6:
        return {"error": "Invalid Code"}

    url = f"https://finance.naver.com/item/news_notice.naver?code={code}&page=1"
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        res = requests.get(url, headers=headers)
        soup = BeautifulSoup(res.content.decode('euc-kr', 'replace'), 'html.parser')
        
        disclosures = []
        
        # 공시 테이블 찾기
        # 네이버 금융 구조상 iframe 내부일 수 있으나 직접 호출했으므로 table 파싱 시도
        rows = soup.select("table.type5 tbody tr")
        
        for row in rows:
            cols = row.select("td")
            if len(cols) < 3:
                continue
                
            title_tag = cols[0].select_one("a")
            if not title_tag:
                continue
                
            title = title_tag.text.strip()
            link = "https://finance.naver.com" + title_tag['href']
            info = cols[1].text.strip() # 정보제공 (DART 등)
            date = cols[2].text.strip()
            
            # 전자공시(DART)만 필터링하거나 모두 표시
            disclosures.append({
                "title": title,
                "link": link,
                "publisher": info,
                "date": date
            })
            
            if len(disclosures) >= 10:
                break
                
        return disclosures

    except Exception as e:
        print(f"Naver Disclosure Crawl Error: {e}")
        return []
