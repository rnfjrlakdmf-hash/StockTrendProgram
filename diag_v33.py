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

print(f"--- Precision Diagnostic for {symbol} ---")

# Let's find the '기업실적분석' section (Section Cop Analysis)
# This is where the annual PER/ROE is.
section = re.search(r'<div class="section cop_analysis">.*?</div>', html, re.S)
if section:
    s_html = section.group()
    print("Section found!")
    
    # Extract Years for alignment (Annual 4 + Future 3)
    years = re.findall(r'(\d{4}\.\d{2})', s_html)
    unique_years = []
    for y in years:
        if y not in unique_years: unique_years.append(y)
    print(f"Detected Years in Summary Table: {unique_years}")

    for target in ["PER", "ROE"]:
        print(f"\nSearching for {target} in cop_analysis section...")
        # Search for row label
        row_pattern = rf'<th[^>]*>.*?{target}.*?</th>(.*?)(?:</tr>)'
        row_match = re.search(row_pattern, s_html, re.S | re.I)
        if row_match:
             # Extract values from <td>...</td>
             vals = re.findall(r'<td[^>]*>(?:<span[^>]*>)?\s*([\d,\.-]+)\s*(?:</span>)?</td>', row_match.group(), re.S)
             print(f"Found {target} values: {vals}")
        else:
             print(f"FAILED to find {target} row in section.")
else:
    print("FAILURE: 'cop_analysis' section NOT found.")
