import requests, re, json
session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
res = session.get('https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=005930')
match = re.search(r"encparam\s*[:=]\s*'([^']+)'", res.text)
if not match:
    match = re.search(r"encparam\s*[:=]\s*\"([^\"]+)\"", res.text)
enc = match.group(1)
res2 = session.get('https://navercomp.wisereport.co.kr/v2/company/cF4002.aspx?cmp_cd=005930&frq=1&rpt=1&finGubun=MAIN&encparam=' + enc, headers={'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=005930'})
try:
    json_str = res2.content.decode('cp949')
except UnicodeDecodeError:
    json_str = res2.content.decode('utf-8', 'ignore')
data = json.loads(json_str)
print(json.dumps(data, ensure_ascii=False, indent=2))
