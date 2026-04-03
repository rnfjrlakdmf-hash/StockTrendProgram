import requests
import json
import re

def inspect_sector_ajax(code):
    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    # First get the sector ID
    url = f"https://navercomp.wisereport.co.kr/v2/company/c1090001.aspx?cmp_cd={code}"
    res = session.get(url, headers=headers)
    html = res.text
    match = re.search(r'set_sect=([^"&\' ]+)', html)
    sec_cd = match.group(1) if match else "WI620"
    
    print(f"Detected Sector Code: {sec_cd}")
    
    ajax_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF9001.aspx?cmp_cd={code}&sec_cd={sec_cd}&data_typ=1"
    ajax_res = session.get(ajax_url, headers=headers)
    data = ajax_res.json()
    
    # Print dt3 items and their names if possible
    # In dt3, ITEM 1, 2, 3... are used.
    # We can try to map them by looking at what WiseReport usually provides.
    # Or we can look at the main page's JS to see the mapping.
    
    with open("tmp_sector_ajax.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("Saved AJAX response to tmp_sector_ajax.json")

if __name__ == "__main__":
    inspect_sector_ajax("005930")
