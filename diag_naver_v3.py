import requests

symbol = "005930" # Samsung
session = requests.Session()
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.37",
    "Referer": "https://finance.naver.com/",
}

print(f"--- Diagnostic v3.1.0 (Session-Aware) for {symbol} ---")

# Step 1: Visit main page to get cookies
main_url = f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
r1 = session.get(main_url, headers=headers)
print(f"Main Page Visit: {r1.status_code}")
print(f"Cookies acquired: {session.cookies.get_dict().keys()}")

# Step 2: Fetch cF1001 with session
ajax_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF1001.aspx?cmp_cd={symbol}&fin_typ=0&freq_typ=Y"
r2 = session.get(ajax_url, headers=headers)

print(f"\nAjax Response Status: {r2.status_code}")
print(f"Ajax Content Length: {len(r2.content)}")

if len(r2.content) > 1000:
    print("SUCCESS: Data retrieved successfully!")
    # Check for PER
    if "PER" in r2.text:
        print("PER Row FOUND in HTML!")
    else:
        print("PER Row NOT FOUND in HTML.")
else:
    print("FAILURE: Response is still empty or too short.")

session.close()
