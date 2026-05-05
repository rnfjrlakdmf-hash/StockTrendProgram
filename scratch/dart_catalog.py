import requests, sys, os
sys.stdout.reconfigure(encoding='utf-8')

DART_API_KEY = "f4ec215eba3e7ef30b5102e2bc3f30616ab9a858"

import datetime
today = datetime.datetime.now()

print("=" * 60)
print("DART API 가능한 데이터 전체 카탈로그")
print("=" * 60)

# 범위를 6개월로 넓혀서 다양한 공시 유형 확인
bgn_de = (today - datetime.timedelta(days=90)).strftime("%Y%m%d")
end_de = today.strftime("%Y%m%d")

url = f"https://opendart.fss.or.kr/api/list.json?crtfc_key={DART_API_KEY}&bgn_de={bgn_de}&end_de={end_de}&page_count=100"
res = requests.get(url, timeout=10)
data = res.json()
items = data.get("list", [])
print(f"\n[조회 기간: 최근 90일 / 총 {len(items)}건 샘플]\n")

# 공시 종류 분류
all_types = {}
for item in items:
    title = item.get("report_nm", "")
    # 1단어 추출
    first_word = title.split("[")[0].strip()[:20]
    all_types[first_word] = all_types.get(first_word, 0) + 1

print("최근 90일간 공시 유형:")
for k, v in sorted(all_types.items(), key=lambda x: -x[1])[:20]:
    print(f"  {k:25s} {v:3d}건")

# 삼성전자 공시 전용 확인
print("\n" + "=" * 60)
print("삼성전자(005930) 공시 데이터 샘플")
print("=" * 60)
bgn_de2 = (today - datetime.timedelta(days=365)).strftime("%Y%m%d")
url2 = f"https://opendart.fss.or.kr/api/list.json?crtfc_key={DART_API_KEY}&bgn_de={bgn_de2}&end_de={end_de}&corp_code=00126380&page_count=20"
res2 = requests.get(url2, timeout=10)
data2 = res2.json()
items2 = data2.get("list", [])
for item in items2[:10]:
    date_raw = item.get("rcept_dt", "")
    date_str = f"{date_raw[:4]}-{date_raw[4:6]}-{date_raw[6:]}" if len(date_raw)==8 else date_raw
    print(f"  [{date_str}] {item.get('report_nm', '')}")
