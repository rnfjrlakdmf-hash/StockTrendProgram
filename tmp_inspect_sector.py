import requests
import json

# Research Script for Fallback Source (cF1001.aspx - Financial Summary)
# Goal: Get PER and ROE when cF9001.aspx fails.

symbol = "005930" # Samsung Electronics
# freq_typ=Y: Annual, fin_typ=0: Consolidated
ajax_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF1001.aspx?cmp_cd={symbol}&fin_typ=0&freq_typ=Y"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
}

try:
    response = requests.get(ajax_url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    
    # cF1001.aspx response is usually a raw HTML table string inside a JSON if called differently, 
    # but the ajax version often returns HTML or JSON depending on headers.
    # Actually, Naver's cF1001.aspx returns HTML! Let's check.
    
    print(f"Content-Type: {response.headers.get('Content-Type')}")
    print(f"Sample Content (First 200): {response.text[:200]}")
    
    # If it's HTML, we might need a different endpoint that returns JSON, or a simple regex parser.
    # Actually, cF1001.aspx is known to be an HTML table.
    # There is another one: cF1001_1.aspx? (No)
    # Let's try cF1001.aspx and see if we can find PER/ROE in the HTML.

except Exception as e:
    print(f"Error: {e}")
