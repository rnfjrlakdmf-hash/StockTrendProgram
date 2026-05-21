
import requests
from bs4 import BeautifulSoup
import re
import sys

# Encoding fix for terminal output
sys.stdout.reconfigure(encoding='utf-8')

def check_selectors(symbol="005930"):
    url = f"https://finance.naver.com/item/main.naver?code={symbol}"
    headers = { "User-Agent": "Mozilla/5.0" }
    res = requests.get(url, headers=headers)
    
    # Use reliable decoding
    try:
        html = res.content.decode('cp949')
    except:
        html = res.content.decode('cp949', 'ignore')
        
    soup = BeautifulSoup(html, 'html.parser')
    
    print(f"--- Analyzing {symbol} ---")
    
    # 1. Rate Info Table (.no_info)
    # This table usually contains: PrevClose, High, Open, Low, Volume, Value
    print("\n[Rate Info Table .no_info]")
    no_info = soup.select_one(".no_info")
    if no_info:
        trs = no_info.select("tr")
        for i, tr in enumerate(trs):
            tds = tr.select("td")
            row_vals = []
            for td in tds:
                # Naver usually hides the number in .blind or spans
                blind = td.select_one(".blind")
                if blind:
                    row_vals.append(f"Blind: {blind.text.strip()}")
                else:
                    # extract numbers from spans
                    txt = td.text.strip().replace('\n', '').replace('\t', '')
                    row_vals.append(f"Text: {txt[:20]}...")
            print(f"Row {i}: {row_vals}")
    else:
        print("Table .no_info NOT FOUND")
        
    # 2. Investment Info (PER, EPS etc)
    print("\n[Investment Info IDs]")
    ids = ["_per", "_eps", "_pbr", "_dvr", "_bps", "_cns_per", "_cns_eps"]
    for i in ids:
        tag = soup.select_one(f"#{i}")
        print(f"#{i}: {tag.text.strip() if tag else 'Not Found'}")
        
    # 3. 52 Week High/Low
    # Often in a table with text "52주 최고"
    print("\n[52 Week High/Low]")
    # Find by text content
    # Note: Text might be split in tags
    # Usually in the table with class 'type2'?
    # Let's look for known structure
    
    wrapper = soup.select_one(".tab_con1")
    if wrapper:
        print("Found .tab_con1 wrapper")
        # Just dump some text to see if we can find 52 numbers
        print(wrapper.text.strip()[:200])
    
    # Try finding the row specifically
    rows = soup.find_all("tr")
    for tr in rows:
        if "52주" in tr.text:
            print(f"Found 52 week row: {tr.text.strip().replace('\\n', ' ')}")
            
if __name__ == "__main__":
    check_selectors()
