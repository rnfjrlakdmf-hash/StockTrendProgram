# 공시 데이터 표시 문제 해결 가이드

## 현재 상황
- ✅ **백엔드 API**: 정상 작동 (10개 공시 데이터 반환 확인)
- ✅ **DisclosureTable 컴포넌트**: 존재하고 디버깅 로그 추가됨
- ✅ **discovery/page.tsx**: 컴포넌트 정상 통합됨 (line 983)
- ❌ **프론트엔드 표시**: 공시 데이터가 화면에 나타나지 않음

## 가능한 원인

### 1. 프론트엔드 빌드 문제
- 코드를 수정했지만 Next.js가 새 코드를 로드하지 않음
- 브라우저 캐시 문제

### 2. API 통신 문제
- CORS 오류
- API_BASE_URL 설정 오류
- 네트워크 요청 실패

### 3. 컴포넌트 렌더링 조건 문제
- `activeTab === 'disclosure'` 조건이 맞지 않음
- `stock.symbol`이 올바르게 전달되지 않음

## 해결 방법

### A. 브라우저에서 직접 확인 (가장 중요!)

1. **브라우저 열기**: http://localhost:3000

2. **개발자 도구 열기**: F12

3. **Console 탭**에서 확인:
   ```
   [DisclosureTable] Starting fetch for symbol: 005930.KS
   [DisclosureTable] Clean symbol: 005930
   [DisclosureTable] Fetching URL: http://localhost:8000/api/stock/005930/disclosures
   [DisclosureTable] Response status: 200
   [DisclosureTable] Response JSON: {status: "success", data: [...]}
   [DisclosureTable] ✅ Setting disclosures, count: 10
   ```

4. **Network 탭**에서 확인:
   - `/disclosures` 요청 찾기
   - Status: 200 OK
   - Response 탭에서 JSON 데이터 확인

5. **오류 확인**:
   - 빨간색 오류 메시지
   - CORS 오류
   - Failed to fetch 오류

### B. 완전한 재시작

1. **모든 서버 중지**:
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force
   Get-Process | Where-Object {$_.ProcessName -eq "python"} | Stop-Process -Force
   ```

2. **백엔드 재시작**:
   ```powershell
   cd backend
   python main.py
   ```

3. **프론트엔드 재시작**:
   ```powershell
   cd frontend
   npm run dev
   ```

4. **브라우저 완전 새로고침**: Ctrl + Shift + R

### C. 테스트 페이지로 확인

http://localhost:3000/test-disclosure.html 접속
- 공시 목록이 보이면 → 백엔드 정상
- 오류가 보이면 → 오류 메시지 확인

## 사용자에게 필요한 정보

다음 중 하나를 확인해주세요:

1. **F12 → Console 탭**의 스크린샷
2. **F12 → Network 탭**에서 `disclosures` 요청의 Response
3. 공시 탭을 클릭했을 때 나타나는 정확한 메시지

이 정보가 있으면 정확한 원인을 찾을 수 있습니다!
