
import requests
from bs4 import BeautifulSoup
import re

def inspect_naver_details(code):
    url = f"https://finance.naver.com/item/main.naver?code={code}"
    headers = { "User-Agent": "Mozilla/5.0" }
    res = requests.get(url, headers=headers)
    
    # Decoding
    try:
        html = res.content.decode('cp949')
    except:
        html = res.content.decode('euc-kr', 'ignore')
        
    soup = BeautifulSoup(html, 'html.parser')
    
    print(f"--- Inspecting {code} ---")
    
    # 1. Volume, Open, High, Low
    # Usually in div.today
    # But often in a table with class 'no_info'
    
    # Find hidden values often used by Naver
    # _quant (Volume), _high, _low, _s_high (52H), _s_low (52L)
    
    print("--- ID Selectors ---")
    ids = ["_quant", "_high", "_low", "_s_high", "_s_low", "_dvr", "_pbr", "_per", "_eps"]
    for i in ids:
        tag = soup.select_one(f"#{i}")
        if tag:
            print(f"{i}: {tag.text.strip()}")
        else:
            print(f"{i}: NOT FOUND")
            
    # 2. Forward PER/EPS (Estimate)
    # Usually in a table 'Investment Index'
    # Look for text "추정PER", "추정EPS"
    print("\n--- Searching for Estimates (Forward) ---")
    # Finding by text might be safer
    targets = ["추정PER", "추정EPS", "BPS", "주당배당금"]
    
    for t in targets:
        # Find element containing text
        temp = soup.find(string=re.compile(t))
        if temp:
             # Usually getting the value implies traversing up to tr/th then finding the next td
             # Or it's a th, next sibling td
             parent = temp.parent
             print(f"Found '{t}': {parent}")
             
             # Try to find value
             # Case 1: th -> sibling td
             if parent.name == 'th' or parent.parent.name == 'th':
                 # Traverse up to tr
                 tr = parent.find_parent("tr")
                 if tr:
                     print(f"  Row: {tr.text.strip().replace('\n', ' ')}")
             
             # Case 2: em -> dt -> dd (sometimes)
        else:
            print(f"'{t}' NOT FOUND")

inspect_naver_details("005930")
