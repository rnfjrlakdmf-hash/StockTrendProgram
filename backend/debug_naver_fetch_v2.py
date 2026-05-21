
import requests
from bs4 import BeautifulSoup

def fetch_and_parse(name, url, selector):
    print(f"\n--- Testing {name} [{url}] ---")
    try:
        headers = { "User-Agent": "Mozilla/5.0" }
        res = requests.get(url, headers=headers)
        
        # Try finding encoding
        encoding = res.encoding
        if encoding == 'ISO-8859-1': encoding = 'cp949' # Fallback
        
        print(f"Status: {res.status_code}, Encoding: {encoding}")
        
        soup = BeautifulSoup(res.content, 'html.parser', from_encoding=encoding)
        
        items = soup.select(selector)
        print(f"Found {len(items)} items using '{selector}'")
        
        for i, li in enumerate(items[:5]):
            # Try generic selectors
            name_tag = li.select_one("h3.h_lst span.blind")
            if not name_tag: name_tag = li.select_one(".h_lst") # Fallback
            
            val = li.select_one("span.value")
            
            n_text = name_tag.get_text(strip=True) if name_tag else "NoName"
            v_text = val.get_text(strip=True) if val else "NoVal"
            print(f"[{i}] {n_text} : {v_text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # 1. Main Page - Interest List check
    fetch_and_parse("Main Page #interestList", "https://finance.naver.com/marketindex/", "#interestList li")
    
    # 2. Dedicated List URL Guessing
    fetch_and_parse("Direct InterestList", "https://finance.naver.com/marketindex/interestList.naver", "li")
    
    # 3. Main Page - Materials? (Usually not on main dashboard, but check #rawMaterialList ?)
    fetch_and_parse("Main Page #rawMaterialList", "https://finance.naver.com/marketindex/", "#rawMaterialList li")
    
    # 4. Direct Material List?
    fetch_and_parse("Direct materialList", "https://finance.naver.com/marketindex/materialList.naver", "li")

