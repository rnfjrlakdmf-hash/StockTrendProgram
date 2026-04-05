import requests
import json

symbol = '005930'
ajax_url = f"https://navercomp.wisereport.co.kr/v2/company/ajax/cF9001.aspx?cmp_cd={symbol}&sec_cd=&data_typ=1"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": f"https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd={symbol}"
}

try:
    response = requests.get(ajax_url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    
    # Check raw content sample
    print(f"Raw Bytes (First 100): {response.content[:100]}")
    
    # Try different decodings
    for enc in ['utf-8', 'euc-kr', 'cp949']:
        try:
            sample = response.content.decode(enc, errors='ignore')[:100]
            print(f"Decoded with {enc}: {sample}")
        except:
            pass
    
    # Original logic
    content = response.content.decode('utf-8', errors='replace')
    data = json.loads(content)
    
    if response.status_code == 200:
        print(f"Keys in JSON: {list(data.keys())}")
        if "dt3" in data:
            data_items = data['dt3'].get('data', [])
            print(f"Total data items in dt3: {len(data_items)}")
            
            # Check for specific search terms
            search_terms = ["PER", "PBR", "ROE", "배당성향", "부채비율", "수익률"]
            for term in search_terms:
                matches = [item.get("NM", "") for item in data_items if term in item.get("NM", "")]
                print(f"Matches for '{term}': {matches}")
            
            # Print unique NM for each GUBN to understand structure
            for g in ["1", "2", "3"]:
                g_items = [item for item in data_items if item.get("GUBN") == g]
                g_names = [item.get("NM", "") for item in g_items]
                print(f"\nGUBN {g} Names: {g_names}")
except Exception as e:
    print(f"Error: {e}")
