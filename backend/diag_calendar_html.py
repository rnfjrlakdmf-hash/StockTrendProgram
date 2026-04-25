import requests
import re
from bs4 import BeautifulSoup

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}

def diag():
    url = "https://finance.naver.com/world/economy_calendar.naver"
    res = requests.get(url, headers=HEADER, timeout=10)
    html = res.content.decode('euc-kr', 'replace')
    soup = BeautifulSoup(html, 'html.parser')
    
    print(f"Status Code: {res.status_code}")
    table = soup.select_one("table.tbl_calendar")
    if table:
        print("Table found!")
        rows = table.select("tbody tr")
        print(f"Total rows: {len(rows)}")
        for i, row in enumerate(rows[:10]):
            cols = row.select("td")
            print(f"Row {i} - Cols: {len(cols)}, Content: {row.text.strip()[:50]}")
    else:
        print("Table NOT found! Check selector.")
        # Try to find any table
        print(f"Tables available: {len(soup.select('table'))}")

if __name__ == "__main__":
    diag()
