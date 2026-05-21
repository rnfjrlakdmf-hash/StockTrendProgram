
import requests
import json
import re
from bs4 import BeautifulSoup

def fetch_mobile_data():
    urls = [
        "https://m.stock.naver.com/marketindex/home/major/interest",
        "https://m.stock.naver.com/marketindex/home/major/material" # Guessing URL
    ]
    
    headers = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" }
    
    for url in urls:
        print(f"\nScanning {url}...")
        try:
            res = requests.get(url, headers=headers)
            if res.status_code != 200:
                print(f"Failed {res.status_code}")
                continue
                
            # Look for script tag with JSON
            soup = BeautifulSoup(res.content, 'html.parser')
            scripts = soup.find_all('script')
            
            for s in scripts:
                if s.string and "此处" in s.string: continue # Skip junk
                
                # Check for window.__INITIAL_STATE__ or similar
                if "initialState" in str(s):
                    print("Found initialState!")
                    # Try to parse or just print snippet
                    print(str(s)[:200])
                    
        except Exception as e:
            print(e)

if __name__ == "__main__":
    fetch_mobile_data()
