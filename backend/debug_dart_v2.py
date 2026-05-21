import requests
from bs4 import BeautifulSoup
import re

def debug_disclosure(code):
    url = f"https://finance.naver.com/item/news_notice.naver?code={code}&page=1"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    print(f"Fetching URL: {url}")
    res = requests.get(url, headers=headers)
    
    # Encoding check
    print(f"Encoding (Apparent): {res.apparent_encoding}")
    
    # Try decoding
    try:
        html = res.content.decode('euc-kr') # Naver usually uses euc-kr
    except:
        html = res.text
        
    soup = BeautifulSoup(html, 'html.parser')
    
    # Check if we got the page
    print(f"Title: {soup.title.string if soup.title else 'No Title'}")
    
    # 1. List all tables and their classes
    tables = soup.find_all('table')
    print(f"Found {len(tables)} tables.")
    for i, table in enumerate(tables):
        print(f"Table {i} Classes: {table.get('class')}")
        
    # 2. Try the current selector
    rows = soup.select("table.type5 tbody tr, table.type6 tbody tr")
    print(f"Selector 'table.type5 tbody tr, table.type6 tbody tr' found {len(rows)} rows.")
    
    # 3. Print Content of first few rows if found
    for i, row in enumerate(rows[:3]):
        cols = row.select("td")
        print(f"Row {i} - Cols count: {len(cols)}")
        print(row.prettify())
        if len(cols) > 0:
            print(f"Col 0 text: {cols[0].text.strip()}")

if __name__ == "__main__":
    debug_disclosure("005930") # Samsung Electronics
