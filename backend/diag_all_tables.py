import requests
from bs4 import BeautifulSoup

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}

def diag_all_tables():
    url = "https://finance.naver.com/world/economy_calendar.naver"
    res = requests.get(url, headers=HEADER, timeout=10)
    html = res.content.decode('euc-kr', 'replace')
    soup = BeautifulSoup(html, 'html.parser')
    
    tables = soup.select("table")
    for i, t in enumerate(tables):
        print(f"\n--- Table {i} (Class: {t.get('class')}, ID: {t.get('id')}) ---")
        rows = t.select("tr")
        if rows:
            print(f"First row text: {rows[0].text.strip()[:100]}")
            if len(rows) > 1:
                print(f"Second row text: {rows[1].text.strip()[:100]}")

if __name__ == "__main__":
    diag_all_tables()
