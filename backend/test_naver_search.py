import requests
from bs4 import BeautifulSoup
import urllib.parse
import re

def search_naver_stock_html(query):
    try:
        url = f"https://finance.naver.com/search/searchList.naver?query={urllib.parse.quote(query, encoding='euc-kr')}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        res = requests.get(url, headers=headers)
        # Naver search results are usually EUC-KR
        try:
            html = res.content.decode('euc-kr')
        except:
             html = res.text

        soup = BeautifulSoup(html, 'html.parser')
        
        # Look for the result table
        # There might be multiple tables (stock, news..). We want stock.
        # Usually it's in a table with class 'tbl_search'
        
        links = soup.select(".tbl_search tbody tr td.tit a")
        
        for link in links:
            title = link.text.strip()
            href = link['href']
            # href format: /item/main.naver?code=005930
            match = re.search(r'code=(\d+)', href)
            if match:
                code = match.group(1)
                print(f"Found HTML: {title} -> {code}")
                return code
                
    except Exception as e:
        print(f"HTML Search Error: {e}")
    return None

print("Searching HTML for 삼성전자...")
search_naver_stock_html("삼성전자")

print("Searching HTML for 카카오...")
search_naver_stock_html("카카오")
