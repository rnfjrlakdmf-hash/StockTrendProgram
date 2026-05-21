
import requests
from bs4 import BeautifulSoup
import re
import sys

# Force utf-8 output for console
sys.stdout.reconfigure(encoding='utf-8')

def test_korean_name(code):
    url = f"https://finance.naver.com/item/main.naver?code={code}"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    res = requests.get(url, headers=headers)
    print(f"Encoding from headers: {res.encoding}")
    print(f"Apparent encoding: {res.apparent_encoding}")
    
    content = None
    
    # Try decoding with utf-8 first
    try:
        content = res.content.decode('utf-8')
        print("Decoded with utf-8 successfully.")
        
        soup = BeautifulSoup(content, 'html.parser')
        h2 = soup.select_one(".wrap_company h2 a")
        if h2:
            print(f"Extracted Name (utf-8): {h2.text.strip()}")
            return
        
    except UnicodeDecodeError:
        print("Failed to decode utf-8.")

    # Try decoding with cp949 (superset of euc-kr)
    try:
        content = res.content.decode('cp949')
        print("Decoded with cp949 successfully.")
        soup = BeautifulSoup(content, 'html.parser')
        h2 = soup.select_one(".wrap_company h2 a")
        if h2:
            print(f"Extracted Name (cp949): {h2.text.strip()}")
    except Exception as e:
        print(f"Failed to decode cp949: {e}")

if __name__ == "__main__":
    test_korean_name("005930") # Samsung Electronics
