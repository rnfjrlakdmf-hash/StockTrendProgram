
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
            
        print(f"HTML Content Snippet: {html[:500]}...")
        if "tbl_search" in html:
            print("Found 'tbl_search' in HTML")
        else:
            print("'tbl_search' NOT found in HTML")
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for direct match table
        # .tbl_search result
        results = soup.select(".tbl_search tbody tr")
        print(f"Found {len(results)} rows")
        
        for row in results:
            cols = row.select("td")
            if len(cols) >= 1:
                title_link = cols[0].select_one("a")
                if title_link:
                    name = title_link.text.strip()
                    print(f"Checking row: {name}")
                    if keyword.replace(" ", "") in name.replace(" ", "") or name.replace(" ", "") in keyword.replace(" ", ""):
                        # href="/item/main.naver?code=005930"
                        href = title_link['href']
                        code_match = re.search(r'code=(\d+)', href)
                        if code_match:
                            code = code_match.group(1)
                            print(f"Found code: {code} for {name}")
                            return code
                        
        print("No code found")
        return None
        
    except Exception as e:
        print(f"Search Symbol Error: {e}")
        return None

if __name__ == "__main__":
    search_korean_stock_symbol("한화오션")
    search_korean_stock_symbol("삼성전자")
    search_korean_stock_symbol("에코프로")
