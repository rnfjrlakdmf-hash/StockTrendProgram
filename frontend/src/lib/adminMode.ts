/**
 * Admin Mode Utility Functions
 * 관리자 모드에서 무료로 모든 기능을 사용할 수 있도록 하는 유틸리티
 */

/**
 * 무료 모드가 활성화되어 있는지 확인
 */
export function isFreeModeEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('admin_free_mode') === 'true';
}

/**
 * API 호출 제한 우회 (무료 모드가 활성화된 경우)
 */
export function shouldBypassApiLimit(): boolean {
    return isFreeModeEnabled();
}

/**
 * 프리미엄 기능 잠금 해제 여부
 */
export function isPremiumUnlocked(): boolean {
    return isFreeModeEnabled();
}

/**
 * 무료 모드 토글
 */
export function toggleFreeMode(): void {
    const current = isFreeModeEnabled();
    sessionStorage.setItem('admin_free_mode', (!current).toString());
}

/**
 * 무료 모드 상태 확인
 */
export function getFreeModeStatus(): {
    enabled: boolean;
    message: string;
} {
    const enabled = isFreeModeEnabled();
    return {
        enabled,
        message: enabled
            ? '🎁 무료 모드 활성화: 모든 프리미엄 기능 사용 가능'
            : '일반 모드'
    };
}
