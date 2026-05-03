import requests
import json

def test_holdings(symbol):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://m.stock.naver.com/"
    }
    
    # Try multiple possible endpoints
    urls = [
        f"https://m.stock.naver.com/api/stock/{symbol}/integration",
        f"https://m.stock.naver.com/api/stock/{symbol}/etfHoldings",
        f"https://m.stock.naver.com/api/stock/{symbol}/holdings"
    ]
    
    for url in urls:
        print(f"Testing URL: {url}")
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                # Check for holdings-like data in the response
                if "etfHoldings" in str(data) or "holdings" in str(data):
                    print(f"SUCCESS: Found potential holdings data in {url}")
                    # Print keys to identify structure
                    if isinstance(data, dict):
                        print(f"Keys: {data.keys()}")
                        if "etfHoldings" in data:
                            print(f"Holdings Sample: {json.dumps(data['etfHoldings'][:2], indent=2, ensure_ascii=False)}")
                    return
            else:
                print(f"Status Code: {resp.status_code}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_holdings("069500")
