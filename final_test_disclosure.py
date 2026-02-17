import requests
import json

print("=" * 60)
print("백엔드 API 최종 테스트")
print("=" * 60)

# Test backend API
url = "http://localhost:8000/api/stock/005930/disclosures"
print(f"\n테스트 URL: {url}")

try:
    response = requests.get(url, timeout=5)
    print(f"상태 코드: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"응답 상태: {data.get('status')}")
        print(f"공시 개수: {len(data.get('data', []))}")
        
        if data.get('data'):
            print(f"\n첫 번째 공시:")
            first = data['data'][0]
            print(f"  제목: {first.get('title', 'N/A')}")
            print(f"  날짜: {first.get('date', 'N/A')}")
            
            print("\n✅ 백엔드 API 정상 작동 중!")
        else:
            print("\n❌ 데이터가 비어있습니다!")
    else:
        print(f"\n❌ HTTP 오류: {response.status_code}")
        
except Exception as e:
    print(f"\n❌ 오류 발생: {e}")

print("\n" + "=" * 60)
print("프론트엔드에서 확인 필요:")
print("=" * 60)
print("1. 브라우저 F12 → Console 탭")
print("2. 다음 명령어 입력:")
print("   fetch('http://localhost:8000/api/stock/005930/disclosures')")
print("     .then(r => r.json())")
print("     .then(d => console.log(d))")
print("3. 응답에 data 배열이 있는지 확인")
print("=" * 60)
