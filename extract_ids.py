import requests
import json

headers = {"User-Agent": "Mozilla/5.0"}
url = "https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd=005930&data_typ=1&chartType=svg"

r = requests.get(url, headers=headers)
data = r.json()
items = data.get('dt3', {}).get('data', [])

print("--- ITEM IDs for GUBN: 1 (Target Stock) ---")
seen = set()
for item in items:
    if str(item.get('GUBN')) == '1':
        it_id = str(item.get('ITEM'))
        nm = str(item.get('NM'))
        if it_id not in seen:
            print(f"{it_id}: {nm}")
            seen.add(it_id)

print("\n--- Summary Table Keys from dt0 ---")
dt0_data = data.get('dt0', {}).get('data', [])
for item in dt0_data:
    if str(item.get('GUBN')) == '1':
        print(f"Returns Chart available for: {item.get('NM')}")
