
import requests
import xml.etree.ElementTree as ET

url = "https://fchart.stock.naver.com/sise.nhn?symbol=005930&timeframe=day&count=30&requestType=0"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

print(f"Fetching {url}...")
try:
    res = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {res.status_code}")
    print(f"Content Length: {len(res.text)}")
    print("Head of content:")
    print(res.text[:500])
except Exception as e:
    print(f"Error: {e}")

print("-" * 20)
print("Fetching without headers...")
try:
    res = requests.get(url, timeout=10)
    print(f"Status Code: {res.status_code}")
    print(f"Content Length: {len(res.text)}")
    print("Head of content:")
    print(res.text[:500])
except Exception as e:
    print(f"Error: {e}")
