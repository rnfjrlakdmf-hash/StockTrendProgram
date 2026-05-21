
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote

def inspect_naver_search(keyword):
    encoded_query = quote(keyword.encode('euc-kr'))
    url = f"https://finance.naver.com/search/searchList.naver?query={encoded_query}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    res = requests.get(url, headers=headers)
    
    # decode
    try:
        html = res.content.decode('euc-kr')
    except:
        html = res.text
        
    soup = BeautifulSoup(html, 'html.parser')
    results = soup.select(".tbl_search tbody tr")
    
    print(f"--- Search Results for '{keyword}' ---")
    for row in results:
        cols = row.select("td")
        if len(cols) >= 2: # Check columns
            # Title is in col 0
            title_link = cols[0].select_one("a")
            name = title_link.text.strip() if title_link else "Unknown"
            href = title_link['href'] if title_link else ""
            
            # Market type usually in col 1? Let's check all cols text
            col_texts = [c.text.strip() for c in cols]
            print(f"Name: {name}, Link: {href}")
            print(f"Columns: {col_texts}")

if __name__ == "__main__":
    inspect_naver_search("에코프로")
    inspect_naver_search("삼성전자")
