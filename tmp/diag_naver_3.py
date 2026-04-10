import requests
from bs4 import BeautifulSoup

def decode_safe(res):
    try:
        return res.content.decode('euc-kr')
    except:
        return res.text

headers = {"User-Agent": "Mozilla/5.0"}
# sise_quant_high.naver - 거래대금 상위
url = "https://finance.naver.com/sise/sise_quant_high.naver?sosok=0"
res = requests.get(url, headers=headers, timeout=8)
soup = BeautifulSoup(decode_safe(res), "html.parser")

table = soup.select_one("table.type_2")
if table:
    rows = table.select("tr")
    for row in rows:
        cols = row.select("td")
        if len(cols) > 5:
            for i, c in enumerate(cols):
                a = c.select_one("a")
                if a:
                    print(f"Found <a> tag at column {i}: text='{a.text.strip()}', href='{a.get('href')}'")
            print(f"Full row cols: {[c.text.strip().replace('\t', '').replace('\n', ' ') for c in cols]}")
            break # Just need first valid row
