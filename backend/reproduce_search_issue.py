
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import quote

def search_korean_stock_symbol(keyword: str):
    """
    종목명으로 검색하여 종목코드(Symbol)를 찾습니다. (크롤링)
    """
    try:
        # euc-kr Encoding for Naver Query
        encoded_query = quote(keyword.encode('euc-kr'))
        url = f"https://finance.naver.com/search/searchList.naver?query={encoded_query}"
        
        print(f"Searching URL: {url}")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        res = requests.get(url, headers=headers)
        
        # Decode
        try:
            html = res.content.decode('euc-kr')
        except:
            html = res.text
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for direct match table
        # .tbl_search result
        results = soup.select(".tbl_search tbody tr")
        print(f"Found {len(results)} rows in .tbl_search")
        
        for i, row in enumerate(results):
            cols = row.select("td")
            if len(cols) >= 1:
                title_link = cols[0].select_one("a")
                if title_link:
                    name = title_link.text.strip()
                    href = title_link['href']
                    code_match = re.search(r'code=(\d+)', href)
                    if code_match:
                        code = code_match.group(1)
                        print(f"Match {i}: Name={name}, Code={code}")
                        return code
                        
        return None
        
    except Exception as e:
        print(f"Search Symbol Error: {e}")
        return None

if __name__ == "__main__":
    keywords = ["한화오션", "삼성전자", "에코프로"]
    for kw in keywords:
        print(f"\n--- Testing keyword: {kw} ---")
        code = search_korean_stock_symbol(kw)
        print(f"Result for {kw}: {code}")
