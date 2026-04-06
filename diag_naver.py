import requests
import re

symbol = "005930" # Samsung
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.37",
    "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
}
url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF1001.aspx?cmp_cd={symbol}&fin_typ=0&freq_typ=Y"
resp = requests.get(url, headers=headers)
html = resp.text

print(f"--- Diagnostic for {symbol} ---")
# Let's find rows containing PER and ROE
for target in ["PER", "ROE"]:
    print(f"\nSearching for {target}...")
    # Find all rows <tr>...</tr>
    rows = re.findall(r'<tr[^>]*>.*?</tr>', html, re.S | re.I)
    found = False
    for r in rows:
        if target in r:
            print(f"Found Row with {target}:")
            print(r[:200] + "...")
            # Extract values
            vals = re.findall(r'<td[^>]*>(?:<span[^>]*>)?\s*([\d,\.-]+)\s*(?:</span>)?</td>', r, re.S)
            print(f"Extracted values: {vals}")
            found = True
            # Don't break, see if there are multiple (e.g. PER(배) vs Fwd PER)
    if not found:
        print(f"FAILED to find any row containing {target}")

# Check years
years = re.findall(r'<th[^>]*>(\d{4}/\d{2})', html)
print(f"\nExtracted Years: {years}")
