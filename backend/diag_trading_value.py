import requests
from bs4 import BeautifulSoup

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}

def diag_trading_value():
    url = "https://finance.naver.com/sise/sise_quant_high.naver?sosok=0"
    res = requests.get(url, headers=HEADER, timeout=10)
    html = res.content.decode('euc-kr', 'replace')
    soup = BeautifulSoup(html, 'html.parser')
    
    table = soup.select_one("table.type_2")
    if table:
        print("Table type_2 found!")
        rows = table.select("tr")
        print(f"Total rows: {len(rows)}")
    else:
        print("Table type_2 NOT found!")
        # Try to find any other table or div
        for t in soup.select("table"):
            print(f"Candidate Table: {t.get('class')}")

if __name__ == "__main__":
    diag_trading_value()
