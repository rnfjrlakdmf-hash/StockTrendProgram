import requests
import json
import binascii

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://stock.naver.com/',
    'Accept': 'application/json'
}

def check_encoding(url, label):
    print(f"--- {label} ---")
    res = requests.get(url, headers=headers)
    print(f"Apparent Encoding: {res.apparent_encoding}")
    print(f"Headers Encoding: {res.encoding}")
    
    # Try decoding with apparent_encoding
    try:
        text = res.content.decode(res.apparent_encoding)
        print(f"Decoded with {res.apparent_encoding}: {text[:200]}")
    except: pass

    # Check for specific stocks in raw content
    if b'Intel' in res.content or b'INTC.O' in res.content:
        print("Found INTC.O in raw content!")
    
    # Check domestic realtime ranking for ANY USA stocks
    if label == "Domestic Realtime Ranking":
        data = res.json()
        for i, cat in enumerate(data.get("datas", [])):
            print(f"Category {i}: {cat.get('rankingType')}")
            for stock in cat.get("stocks", [])[:3]:
                print(f"  - {stock.get('itemCode')} {stock.get('stockName')}")

check_encoding("https://stock.naver.com/api/securityService/integration/price?foreignCodes=INTC.O,NVDA.O", "US Integration Price")
check_encoding("https://stock.naver.com/api/domestic/market/realtime/ranking", "Domestic Realtime Ranking")
