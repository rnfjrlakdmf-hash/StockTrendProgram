import requests
import json

url = "https://stock.naver.com/api/securityService/integration/price?domesticKrxCodes=010140,294630"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://stock.naver.com/",
    "Origin": "https://stock.naver.com"
}

res = requests.get(url, headers=headers)
if res.status_code == 200:
    print(json.dumps(res.json(), ensure_ascii=False, indent=2))
else:
    print(f"Failed with status: {res.status_code}")
