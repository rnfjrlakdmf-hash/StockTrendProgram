
import requests
from bs4 import BeautifulSoup
import re

def search_korean_stock_symbol(keyword: str):
    """
    종목명으로 검색하여 종목코드(Symbol)를 찾습니다. (크롤링)
    """
    try:
        # euc-kr Encoding for Naver Query
        from urllib.parse import quote
        encoded_query = quote(keyword.encode('euc-kr'))
        url = f"https://finance.naver.com/search/searchList.naver?query={encoded_query}"
        
        print(f"Searching for: {keyword}")
        print(f"URL: {url}")

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
        print(f"Found {len(results)} rows")
        
        for row in results:
            cols = row.select("td")
            if len(cols) >= 1:
                title_link = cols[0].select_one("a")
                if title_link:
                    name = title_link.text.strip()
                    href = title_link['href']
                    print(f"Found: {name}, Link: {href}")
                    code_match = re.search(r'code=(\d+)', href)
                    if code_match:
                        code = code_match.group(1)
                        print(f"Code: {code}")
                        return code
                        
        print("No match found in loop.")
        return None
        
    except Exception as e:
        print(f"Search Symbol Error: {e}")
        return None

if __name__ == "__main__":
    symbol = search_korean_stock_symbol("한화오션")
    print(f"Result: {symbol}")
