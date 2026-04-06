import requests
import re

symbol = "005930" # Samsung
url = f"https://finance.naver.com/item/main.naver?code={symbol}"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.37",
    "Referer": "https://finance.naver.com/"
}

print(f"--- Diagnostic v3.2.0 (SSR-Aware) for {symbol} ---")
resp = requests.get(url, headers=headers)
html = resp.text

# Parsing logic similar to what I put in sector_analysis.py
for target in ["PER", "ROE"]:
    print(f"\nSearching for {target}...")
    row_pattern = rf'{target}.*?</tr>'
    row_match = re.search(row_pattern, html, re.S | re.I)
    if row_match:
        print(f"Row Match found!")
        # Extra cells
        vals = re.findall(r'<td[^>]*>[\s\n\t]*([\d,\.-]+)[\s\n\t]*</td>', row_match.group(), re.S)
        print(f"Extracted values: {vals}")
        if vals:
             print(f"SUCCESS: {target} data is present.")
        else:
             print(f"FAILURE: {target} values are empty.")
    else:
        print(f"FAILURE: {target} row match NOT found.")
