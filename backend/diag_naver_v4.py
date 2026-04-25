import requests
from bs4 import BeautifulSoup

HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def check_naver():
    code = "005930"
    url = f"https://finance.naver.com/item/main.naver?code={code}"
    res = requests.get(url, headers=HEADER, timeout=10)
    
    print(f"Final URL: {res.url}")
    print(f"Status Code: {res.status_code}")
    
    # Naver Finance is CP949
    html = res.content.decode('cp949', 'ignore')
        
    soup = BeautifulSoup(html, 'html.parser')
    print(f"Page Title: {soup.title.text if soup.title else 'No Title'}")
    
    # Try selectors
    name_tag = soup.select_one(".wrap_company h2 a")
    price_area = soup.select_one("p.no_today")
    if price_area:
        print(f"Price Area HTML: {price_area}")
        price_tag = price_area.select_one("span.blind")
    
    print(f"Name Tag Found: {name_tag is not None}")
    if name_tag:
        name = name_tag.text.strip()
        print(f"Name (hex): {name.encode('utf-8').hex()}")
        print(f"Name (repr): {repr(name)}")
    
    print(f"Price Tag Found: {price_tag is not None}")
    if price_tag:
        print(f"Price: {price_tag.text.strip()}")
        
    if not name_tag:
        print("--- FULL HTML SNIPPET AROUND COMPANY INFO ---")
        h2s = soup.find_all('h2')
        for h in h2s:
            print(f"H2: {h.text.strip()} | Classes: {h.get('class')}")

if __name__ == "__main__":
    check_naver()
