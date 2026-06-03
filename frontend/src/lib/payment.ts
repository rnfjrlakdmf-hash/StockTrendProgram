
export const requestPayment = (onSuccess: () => void) => {
    // Gumroad Product Link
    const GUMROAD_LINK = "https://3695269125038.gumroad.com/l/xxlzf";

    // 1. 모바일 앱 환경 (Capacitor / Cordova) 감지
    const isApp = typeof window !== "undefined" && (window as any).Capacitor;

    if (isApp) {
        // [Commercial Compliance] 모바일 앱 환경 내에서는 웹 외부 결제를 제한하고 스토어 인앱결제(IAP)를 연동
        alert("모바일 앱 버전에서는 앱스토어 및 구글 플레이스토어 인앱결제를 이용해야 합니다.\n(스토어 결제 모듈 기동 대기 중)");
        
        // 여기에 Capacitor용 RevenueCat 또는 Purchases 플러그인 연동 스텁 코드 추가 가능
        console.log("[IAP] Mobile App environment detected. Store In-App Purchases flow should execute here.");
        
        // 데모 환경을 위해 임시 성공 허용 (또는 결제 모듈 테스트)
        if (confirm("[개발 테스트 전용] 스토어 인앱결제가 완료된 것으로 시뮬레이션하시겠습니까?")) {
            onSuccess();
        }
        return;
    }

    // 2. 일반 웹 브라우저 환경
    window.open(GUMROAD_LINK, "_blank");

    if (confirm("결제 페이지가 새 창에서 열렸습니다.\n결제를 완료하셨습니까?\n(확인을 누르면 AI 고급 모드가 활성화됩니다)")) {
        onSuccess();
    }
};
