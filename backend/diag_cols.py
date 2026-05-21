import requests
from bs4 import BeautifulSoup

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}

def diag_cols():
    url = "https://finance.naver.com/sise/sise_quant_high.naver?sosok=0"
    res = requests.get(url, headers=HEADER, timeout=10)
    html = res.content.decode('euc-kr', 'replace')
    soup = BeautifulSoup(html, 'html.parser')
    
    table = soup.select_one("table.type_2")
    rows = table.select("tr")
    for i, row in enumerate(rows):
        cols = row.select("td")
        if cols:
            print(f"Row {i} - Col count: {len(cols)}")
            if len(cols) > 0:
                print(f"  First cell: {cols[0].text.strip()}")
            break

if __name__ == "__main__":
    diag_cols()
