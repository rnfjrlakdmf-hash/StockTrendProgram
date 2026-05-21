
import requests
from bs4 import BeautifulSoup
import re
import sys

# Force utf-8 output for console
sys.stdout.reconfigure(encoding='utf-8')

def test_korean_name_robust(code):
    url = f"https://finance.naver.com/item/main.naver?code={code}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    print(f"Fetching {url}...")
    res = requests.get(url, headers=headers)
    
    encodings = ['euc-kr', 'cp949', 'utf-8']
    
    for enc in encodings:
        print(f"\n--- Testing encoding: {enc} ---")
        try:
            html = res.content.decode(enc)
            soup = BeautifulSoup(html, 'html.parser')
            h2 = soup.select_one(".wrap_company h2 a")
            if h2:
                print(f"SUCCESS: Found name: {h2.text.strip()}")
                return
            else:
                print("FAIL: Helper element not found (decoding might be wrong or selector mismatch)")
                # Print title to verify
                print(f"Page Title: {soup.title.text if soup.title else 'No Title'}")
        except UnicodeDecodeError as e:
            print(f"FAIL: Decode error: {e}")
        except Exception as e:
            print(f"FAIL: Other error: {e}")

if __name__ == "__main__":
    test_korean_name_robust("005930")
