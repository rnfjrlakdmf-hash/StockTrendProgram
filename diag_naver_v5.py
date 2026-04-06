import requests
import re

symbol = "005930" # Samsung
url = f"https://finance.naver.com/item/main.naver?code={symbol}"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}

print(f"--- Final Diagnostic v3.2.1 (SSR-Mashup) for {symbol} ---")
f_resp = requests.get(url, headers=headers, timeout=10)
try:
    ssr_html = f_resp.content.decode('utf-8')
except:
    ssr_html = f_resp.content.decode('cp949', errors='replace')

# Updated Regex Matcher
for target in ["PER", "ROE"]:
    print(f"\nSearching for {target}...")
    row_pattern = rf'<th[^>]*>.*?{target}.*?</th>(.*?)(?:</tr>|<th)'
    row_match = re.search(row_pattern, ssr_html, re.S | re.I)
    if row_match:
        print(f"Row Match found!")
        vals = re.findall(r'<td[^>]*>[\s\n\t]*([\d,\.-]+)[\s\n\t]*</td>', row_match.group(), re.S)
        clean_vals = [v.replace(',', '') for v in vals if v.strip()]
        print(f"Extracted values: {clean_vals}")
        if clean_vals:
             print(f"SUCCESS: {target} data is present for all years.")
        else:
             print(f"FAILURE: {target} values are empty.")
    else:
        print(f"FAILURE: {target} row match NOT found.")

# Let's check for PER(배) specifically in the label
if "PER(배)" in ssr_html:
    print("\n'PER(배)' label exists in HTML.")
else:
    print("\n'PER(배)' label NOT found.")
