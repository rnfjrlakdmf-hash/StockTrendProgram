
import requests
from bs4 import BeautifulSoup

def search_text_in_main():
    url = "https://finance.naver.com/marketindex/"
    print(f"Fetching {url}...")
    headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    res = requests.get(url, headers=headers)
    text = res.content.decode('cp949', 'ignore')
    
    keywords = ["CD", "보물", "구리", "WTI", "휘발유"]
    for k in keywords:
        if k in text:
            print(f"Found keyword '{k}' in HTML!")
            # Find context
            idx = text.find(k)
            print(f"Context: {text[idx-50:idx+50]}")
        else:
            print(f"Keyword '{k}' NOT FOUND in HTML.")

if __name__ == "__main__":
    search_text_in_main()
