
import requests
from bs4 import BeautifulSoup
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def inspect_details(symbol="005930"):
    url = f"https://finance.naver.com/item/main.naver?code={symbol}"
    headers = { "User-Agent": "Mozilla/5.0" }
    res = requests.get(url, headers=headers)
    
    html = res.content.decode('cp949', 'ignore')
    soup = BeautifulSoup(html, 'html.parser')
    
    print(f"Inspecting {symbol}...")
    
    # 1. Check for IDs
    ids_to_check = ["_quant", "_amount", "_sise_per", "_sise_eps", "_pbr", "_dvr", "_market_sum", 
                    "_open", "_high", "_low", "_val_high", "_val_low"] # Guessing
    
    print("\n--- Checking IDs ---")
    for i in ids_to_check:
        tag = soup.select_one(f"#{i}")
        if tag:
            print(f"#{i}: {tag.text.strip()}")
        else:
            print(f"#{i}: Not Found")
            
    # 2. Check Table structure for specific labels
    print("\n--- Checking Labels in Tables ---")
    labels = ["거래량", "시가", "고가", "저가", "52주 최고", "52주 최저", "추정PER", "추정EPS", "BPS", "주당배당금"]
    
    # Iterate all th/td to find these labels
    for label in labels:
        # searching in th, td, dt, span
        found = soup.find(string=re.compile(label))
        if found:
            parent = found.parent
            print(f"Found '{label}' in <{parent.name}>")
            # Try to find the value (often in next sibling or next td)
            
            # Case 1: th -> td
            if parent.name == 'th':
                # find next td
                next_td = parent.find_next_sibling('td')
                if next_td:
                    print(f"  -> Value (Next TD): {next_td.text.strip()}")
                else:
                    # check parent row's next sibling row?
                    pass
            
            # Case 2: dt -> dd
            elif parent.name == 'dt':
                next_dd = parent.find_next_sibling('dd')
                if next_dd:
                    print(f"  -> Value (Next DD): {next_dd.text.strip()}")
            
            # Case 3: span -> span/em (complex)
            elif parent.name == 'span':
                # Print parent's parent to context
                print(f"  -> Parent Context: {parent.parent}")
        else:
            print(f"Label '{label}' NOT FOUND")

    # 3. Check Specific Rate Info section (Open/High/Low usually here)
    print("\n--- Rate Info Section ---")
    rate_info = soup.select_one(".no_info")
    if rate_info:
        print(rate_info.prettify()[:500]) # First 500 chars
        
if __name__ == "__main__":
    inspect_details()
