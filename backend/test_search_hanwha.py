
import requests
from bs4 import BeautifulSoup
import re
import urllib.parse

def search_korean_stock_symbol(keyword: str):
    print(f"Searching for: {keyword}")
    try:
        # euc-kr Encoding for Naver Query
        from urllib.parse import quote
        encoded_query = quote(keyword.encode('euc-kr'))
        url = f"https://finance.naver.com/search/searchList.naver?query={encoded_query}"
        print(f"URL: {url}")
        
        headers = {
            "User-Agent": "Mozilla/5.0"
        }
        res = requests.get(url, headers=headers)
        print(f"Status Code: {res.status_code}")
        
        # Decode
        try:
            html = res.content.decode('euc-kr')
        except:
            html = res.text
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for direct match table
        # .tbl_search result
        results = soup.select(".tbl_search tbody tr")
        print(f"Found {len(results)} rows in table")
        
        for row in results:
            cols = row.select("td")
            if len(cols) >= 1:
                title_link = cols[0].select_one("a")
                if title_link:
                    name = title_link.text.strip()
                    print(f"Row Name: {name}")
                    # href="/item/main.naver?code=005930"
                    href = title_link['href']
                    code_match = re.search(r'code=(\d+)', href)
                    if code_match:
                        code = code_match.group(1)
                        print(f"Found code: {code}")
                        return code
                        
        return None
        
    except Exception as e:
        print(f"Search Symbol Error: {e}")
        return None

if __name__ == "__main__":
    result = search_korean_stock_symbol("한화오션")
    print(f"Result: {result}")
