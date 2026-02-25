import requests
import pandas as pd

def probe_kind_params():
    # Target 1: Mandatory Lock-up (Try search.do pattern)
    # Common Pattern: https://kind.krx.co.kr/disclosure/market_info/MandatoryCustodyStatus.do?method=searchMandatoryCustodyStatusMain
    # Or POST to same URL with method=searchMandatoryCustodyStatusMain
    
    url_lock = "https://kind.krx.co.kr/disclosure/market_info/MandatoryCustodyStatus.do"
    
    print(f"[*] Deep Probing {url_lock} with GET...")
    
    try:
        res = requests.get(url_lock, verify=False, timeout=10)
        content = res.text
        
        # Simple parse for inputs
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content, 'html.parser')
        inputs = soup.find_all('input')
        
        print(f"    -> Found {len(inputs)} inputs:")
        for i in inputs:
            # Print name, type, and value if present
            name = i.get('name', 'N/A')
            itype = i.get('type', 'N/A')
            val = i.get('value', '')
            print(f"       [Input] Name: {name}, Type: {itype}, Value: {val}")
            
        # Also look for select options if relevant
        selects = soup.find_all('select')
        print(f"    -> Found {len(selects)} selects:")
        for s in selects:
            name = s.get('name', 'N/A')
            print(f"       [Select] Name: {name}")

    except Exception as e:
        print(f"    -> Error: {e}")



if __name__ == "__main__":
    # Suppress SSL warnings
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    probe_kind_params()
