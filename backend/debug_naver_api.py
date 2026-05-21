
import requests
import json

def test_api(url):
    print(f"\nTesting {url}...")
    try:
        headers = { "User-Agent": "Mozilla/5.0" }
        res = requests.get(url, headers=headers)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            try:
                data = res.json()
                print("JSON Success!")
                # Print sample
                print(str(data)[:200])
            except:
                print("Not JSON")
        else:
            print("Failed")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # 1. Mobile Front API (Common)
    test_api("https://m.stock.naver.com/front-api/marketIndex/prices?category=interest&page=1")
    test_api("https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&page=1")
    test_api("https://m.stock.naver.com/front-api/marketIndex/prices?category=oil&page=1")
    
    # 2. Raw Materials categories?
    test_api("https://m.stock.naver.com/front-api/marketIndex/prices?category=metal&page=1")
    test_api("https://m.stock.naver.com/front-api/marketIndex/prices?category=agriculture&page=1")
    
    # 3. Another API style
    test_api("https://api.stock.naver.com/marketindex/domestic/interest")
