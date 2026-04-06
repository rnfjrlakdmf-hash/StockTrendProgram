import requests
import json

headers = {"User-Agent": "Mozilla/5.0"}
url = "https://navercomp.wisereport.co.kr/company/ajax/cF9001.aspx?cmp_cd=005930&data_typ=1&chartType=svg"

r = requests.get(url, headers=headers)
# Try to decode with CP949 first as Naver sometimes uses it
try:
    decoded_text = r.content.decode('cp949')
    data = json.loads(decoded_text)
except:
    data = r.json()

items = data.get('dt3', {}).get('data', [])

print("--- ALL UNIQUE ITEM IDs in AJAX ---")
seen = set()
for item in items:
    it_id = str(item.get('ITEM'))
    nm = str(item.get('NM'))
    combo = f"{it_id}: {nm}"
    if combo not in seen:
        print(combo)
        seen.add(combo)
