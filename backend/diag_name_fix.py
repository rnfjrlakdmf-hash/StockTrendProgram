import requests
import json
import re

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://stock.naver.com/",
}

def check():
    code = "005930"
    
    # 1. Detail API
    detail_url = f"https://stock.naver.com/api/domestic/detail/{code}/detail?codeType=KRX"
    r1 = requests.get(detail_url, headers=HEADER)
    d1 = r1.json()
    print("--- Detail API ---")
    print(f"stockName: {d1.get('stockName')}")
    print(f"itemCode: {d1.get('itemCode')}")
    
    # 2. Integration Price API
    p_url = f"https://stock.naver.com/api/securityService/integration/price?domesticKrxCodes={code}"
    r2 = requests.get(p_url, headers=HEADER)
    d2 = r2.json()
    print("\n--- Price API ---")
    item = d2.get('domesticKrx', {}).get(code, {})
    print(f"stockName: {item.get('stockName')}")
    print(f"itemCode: {item.get('itemCode')}")

if __name__ == "__main__":
    check()
