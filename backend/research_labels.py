import requests
import json

def fetch_raw_sector_data(symbol="005930"):
    url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF9001.aspx?cmp_cd={symbol}&sec_cd=&data_typ=1"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
    }
    
    try:
        res = requests.get(url, headers=headers)
        data = res.json()
        print(f"--- Raw Labels in dt3.data ---")
        seen_nms = set()
        for item in data.get("dt3", {}).get("data", []):
            nm = item.get("NM")
            if nm not in seen_nms:
                print(f"NM: '{nm}', SEQ: {item.get('SEQ')}")
                seen_nms.add(nm)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_raw_sector_data()
