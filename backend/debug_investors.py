import requests
from bs4 import BeautifulSoup
import re

def get_live_investor_estimates_debug(symbol):
    code = symbol 
    url = f"https://finance.naver.com/item/frgn.naver?code={code}"
    print(f"Fetching {url}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    res = requests.get(url, headers=headers)
    print(f"Status Code: {res.status_code}")
    
    soup = BeautifulSoup(res.content.decode('cp949', 'ignore'), 'html.parser')
    
    # Check for "잠정" text anywhere
    if "잠정" in soup.text:
        print("Found '잠정' keyword in text.")
    else:
        print("Did NOT find '잠정' keyword in text.")
        
    # Look for the table
    sections = soup.select(".sub_section")
    target_table = None
    
    for sec in sections:
        if "잠정" in sec.text:
            print("Found .sub_section with '잠정'")
            target_table = sec.select_one("table")
            print(f"Table found: {target_table is not None}")
            if target_table:
                print(target_table.prettify()[:500])
            break
            
    if not target_table:
        print("Fallback search...")
        tables = soup.select("table")
        for i, tbl in enumerate(tables):
            if "잠정" in tbl.text and "외국인" in tbl.text:
                print(f"Found match in Table index {i}")
                target_table = tbl
                print(tbl.prettify()[:500])
                break

get_live_investor_estimates_debug("005930")
