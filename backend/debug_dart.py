
import requests
from bs4 import BeautifulSoup
import re

def test_naver_disclosure(code):
    url = f"https://finance.naver.com/item/news_notice.naver?code={code}&page=1"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    print(f"Fetching URL: {url}")
    res = requests.get(url, headers=headers)
    print(f"Status Code: {res.status_code}")
    
    soup = BeautifulSoup(res.content.decode('euc-kr', 'replace'), 'html.parser')
    
    # Check all tables
    tables_all = soup.find_all("table")
    print(f"Found {len(tables_all)} tables total.")
    for idx, tbl in enumerate(tables_all):
        classes = tbl.get("class", [])
        print(f"Table {idx} classes: {classes}")

    rows = soup.select("table.type6 tbody tr")
    print(f"Found {len(rows)} rows")
    
    for i, row in enumerate(rows):
        if i >= 3: break
        print(f"Row {i}: {row}")
        cols = row.select("td")
        if len(cols) >= 3:
            title_tag = cols[0].select_one("a")
            if title_tag:
                print(f"  Title: {title_tag.text.strip()}")
                print(f"  Info: {cols[1].text.strip()}")
                print(f"  Date: {cols[2].text.strip()}")

if __name__ == "__main__":
    test_naver_disclosure("005930")
