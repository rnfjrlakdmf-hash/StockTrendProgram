import requests

symbol = "005930"
url = f"https://finance.naver.com/item/main.naver?code={symbol}"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.37"
}

resp = requests.get(url, headers=headers)
print(f"Status: {resp.status_code}")
print(f"Content Length: {len(resp.content)}")

# Check for PER/ROE in the main page HTML
# Naver's main page has a summary table
if "PER" in resp.text:
    print("SUCCESS: PER found in main page HTML!")
    # Let's find the specific table row
    idx = resp.text.find("PER")
    print(f"Snippet: {resp.text[idx:idx+200]}")
else:
    print("FAILED: PER not found in main page.")
