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
        if "finStdList" in data:
            fin_items = data.get("finStdList", [])
            print(f"Total items in finStdList: {len(fin_items)}")
            for item in fin_items:
                print(f"finStdList Item: {item}")
        else:
            print("finStdList key is missing")

        # Check dt0 as well
        if "dt0" in data:
            print(f"dt0 Item: {data['dt0'].get('data', [])[:2]}")
except Exception as e:
    print(f"Error: {e}")
