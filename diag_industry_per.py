import requests
import re

symbol = "005930" # Samsung
url = f"https://finance.naver.com/item/main.naver?code={symbol}"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://finance.naver.com/"
}

resp = requests.get(url, headers=headers)
html = resp.text

print(f"--- Industry PER Search for {symbol} ---")

# Naver SSR Summary Header often has Industry PER
# Pattern: <em>업종PER</em> ... <em id="_cper">10.75</em>
patterns = [
    r'>업종PER.*?<em[^>]*>([\d,\.-]+)</em>', # Typical header
    r'id="_cper">([\d,\.-]+)</em>' # Specific ID
]

for p in patterns:
    match = re.search(p, html, re.S | re.I)
    if match:
        print(f"SUCCESS: Industry PER found! Value: {match.group(1)}")
    else:
        print(f"FAILED: Pattern '{p}' not matched.")
        
# Check for Company PER in header too for verification
per_match = re.search(r'id="_per">([\d,\.-]+)</em>', html, re.S)
if per_match:
    print(f"SUCCESS: Company PER found! Value: {per_match.group(1)}")
