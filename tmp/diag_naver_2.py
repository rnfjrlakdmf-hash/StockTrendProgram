import requests
from bs4 import BeautifulSoup

def decode_safe(res):
    try:
        return res.content.decode('euc-kr')
    except:
        return res.text

headers = {"User-Agent": "Mozilla/5.0"}
url = "https://finance.naver.com/sise/sise_quant_high.naver?sosok=0"
res = requests.get(url, headers=headers, timeout=8)
soup = BeautifulSoup(decode_safe(res), "html.parser")

table = soup.select_one("table.type_2")
if table:
    rows = table.select("tr")
    print(f"Total rows: {len(rows)}")
    for i, row in enumerate(rows[:20]):
        cols = row.select("td")
        print(f"Row {i} - Num cols: {len(cols)}")
        if len(cols) > 0:
            print(f"  Col texts: {[c.text.strip() for c in cols]}")
else:
    print("Table type_2 not found")
