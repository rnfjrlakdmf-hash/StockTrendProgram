import requests
from bs4 import BeautifulSoup
import re

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}

def test_scrape_themes():
    url = "https://finance.naver.com/sise/theme.naver"
    res = requests.get(url, headers=HEADER, timeout=10)
    
    # Naver Finance uses EUC-KR (CP949)
    html = res.content.decode('cp949', 'ignore')
    soup = BeautifulSoup(html, 'html.parser')
    
    themes = []
    # Themes are usually in a table with class 'type_1'
    # Each row is a <tr>, and the theme name is in a <td> with class 'col_type1'
    rows = soup.select("table.type_1 tr")
    
    for row in rows:
        name_tag = row.select_one("td.col_type1 a")
        if name_tag:
            themes.append(name_tag.text.strip())
            
    return themes

if __name__ == "__main__":
    results = test_scrape_themes()
    print(f"Found {len(results)} themes.")
    for t in results[:10]:
        print(f" - {t}")
