import requests
import re

symbol = "005930" # Samsung
url = f"https://finance.naver.com/item/main.naver?code={symbol}"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.37",
    "Referer": "https://finance.naver.com/"
}

resp = requests.get(url, headers=headers)
html = resp.text

print(f"--- PER Row Inspection for {symbol} ---")
row_pattern = rf'PER.*?</tr>'
row_match = re.search(row_pattern, html, re.S | re.I)
if row_match:
    print(f"Full Row HTML:\n{row_match.group()}")
else:
    print("Row match FAILED.")
