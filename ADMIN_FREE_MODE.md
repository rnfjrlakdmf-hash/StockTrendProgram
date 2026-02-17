# 관리자 무료 모드 사용 가이드

## 활성화 방법

1. **설정 페이지 접속**: `/settings`로 이동
2. **관리자 모드 활성화**: 페이지 상단 제목을 2초 안에 7번 빠르게 클릭
3. **무료 모드 토글**: 관리자 패널에서 "무료 모드" 스위치를 켜기

## 무료 모드 기능

무료 모드가 활성화되면:
- ✅ 모든 API 호출 제한 해제
- ✅ 프리미엄 기능 무제한 사용
- ✅ 로컬 스토리지에 `admin_free_mode: true` 저장됨

## 코드에서 사용하기

```typescript
// 무료 모드 유틸리티 import
import { isFreeModeEnabled, isPremiumUnlocked, shouldBypassApiLimit } from '@/lib/adminMode';

// 예시 1: API 호출 제한 체크
if (!shouldBypassApiLimit() && apiCallCount >= MAX_CALLS) {
    return { error: "API 호출 제한 초과" };
}

// 예시 2: 프리미엄 기능 잠금
if (!isPremiumUnlocked()) {
    return <UpgradePrompt />;
}

// 예시 3: 무료 모드 상태 확인
const freeMode = isFreeModeEnabled();
console.log("무료 모드:", freeMode ? "활성화" : "비활성화");
```

## 관리자 패널 기능

- 🎁 **무료 모드 토글**: 모든 프리미엄 기능 잠금 해제
- 🗑️ **로컬 스토리지 초기화**: 모든 저장된 데이터 삭제
- 📋 **API 키 데이터 복사**: 저장된 키 데이터 클립보드 복사
- 📚 **API 문서 열기**: 백엔드 API 문서 새 탭에서 열기

## 보안

- 관리자 모드는 일반 사용자가 찾을 수 없도록 숨겨져 있음
- 무료 모드 플래그는 로컬 스토리지에만 저장 (서버 전송 X)
- 사용자별로 독립적으로 동작
