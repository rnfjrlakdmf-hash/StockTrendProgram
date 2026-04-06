import requests

symbol = "005930" # Samsung
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.37",
    "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
}
url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF1001.aspx?cmp_cd={symbol}&fin_typ=0&freq_typ=Y"
resp = requests.get(url, headers=headers)

print(f"Status: {resp.status_code}")
print(f"Content Length: {len(resp.content)}")
print(f"Content Snippet: {resp.text[:1000]}")
