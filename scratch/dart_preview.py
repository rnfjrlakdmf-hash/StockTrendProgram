import requests, sys, os
sys.stdout.reconfigure(encoding='utf-8')

DART_API_KEY = "f4ec215eba3e7ef30b5102e2bc3f30616ab9a858"

import datetime
today = datetime.datetime.now()
bgn_de = (today - datetime.timedelta(days=30)).strftime("%Y%m%d")
end_de = today.strftime("%Y%m%d")

print("=" * 60)
print("✅ DART API 연동 데이터 미리보기")
print(f"조회 기간: {bgn_de} ~ {end_de}")
print("=" * 60)

# 1. 실적 공시
print("\n📈 [1] 실적발표 공시 (결산실적공시예고)")
url = f"https://opendart.fss.or.kr/api/list.json?crtfc_key={DART_API_KEY}&bgn_de={bgn_de}&end_de={end_de}&page_count=100"
res = requests.get(url, timeout=10)
data = res.json()

if data.get("status") == "000" and "list" in data:
    count = 0
    for item in data["list"]:
        title = item.get("report_nm", "")
        if "결산실적" in title or "분기실적" in title or "영업실적" in title:
            print(f"  종목: {item.get('corp_name'):15s} | 코드: {item.get('stock_code')} | 공시: {title[:40]}")
            count += 1
            if count >= 10:
                break
    if count == 0:
        print("  → 해당 기간에 실적공시예고 없음")
else:
    print(f"  API 오류: {data.get('message', data)}")

# 2. 배당 공시
print("\n💰 [2] 배당 공시 (현금·현물배당결정)")
count = 0
if data.get("status") == "000" and "list" in data:
    for item in data["list"]:
        title = item.get("report_nm", "")
        if "배당결정" in title or "배당" in title:
            date_raw = item.get("rcept_dt", "")
            date_str = f"{date_raw[:4]}-{date_raw[4:6]}-{date_raw[6:]}" if len(date_raw)==8 else date_raw
            print(f"  종목: {item.get('corp_name'):15s} | 코드: {item.get('stock_code')} | 날짜: {date_str} | 공시: {title[:35]}")
            count += 1
            if count >= 10:
                break
    if count == 0:
        print("  → 해당 기간에 배당결정 공시 없음")

# 3. 대량 공시 수 통계
print("\n📊 [3] 최근 30일 공시 통계")
total = len(data.get("list", []))
print(f"  전체 공시 수: {total}건 (100건 제한 기준)")

# 타입별 분류
keywords_map = {
    "실적/영업": ["결산실적", "분기실적", "영업실적"],
    "배당결정": ["배당결정", "현금배당"],
    "유상증자": ["유상증자"],
    "전환사채": ["전환사채"],
    "주요계약": ["단일판매", "단일공급"],
    "임원변경": ["임원의변동"],
}
for label, kws in keywords_map.items():
    cnt = sum(1 for item in data.get("list", []) if any(kw in item.get("report_nm","") for kw in kws))
    bar = "█" * cnt
    print(f"  {label:10s}: {cnt:3d}건 {bar}")
