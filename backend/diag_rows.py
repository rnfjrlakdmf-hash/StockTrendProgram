import requests
from bs4 import BeautifulSoup

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}

def diag_rows():
    url = "https://finance.naver.com/sise/sise_quant_high.naver?sosok=0"
    res = requests.get(url, headers=HEADER, timeout=10)
    html = res.content.decode('euc-kr', 'replace')
    soup = BeautifulSoup(html, 'html.parser')
    
    table = soup.select_one("table.type_2")
    rows = table.select("tr")
    for i, row in enumerate(rows[:20]):
        cols = row.select("td")
        print(f"Row {i}: {len(cols)} columns")
        if len(cols) > 1:
            print(f"  Content sample: {[c.text.strip() for c in cols[:3]]}")

if __name__ == "__main__":
    diag_rows()
