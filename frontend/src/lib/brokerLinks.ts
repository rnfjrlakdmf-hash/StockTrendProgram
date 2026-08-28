/**
 * Korean Securities MTS/HTS Deep Link Bridge
 * 국내 주요 9대 증권사 모바일 MTS 어플 원클릭 실행 및 PC WTS/HTS 연동 유틸리티
 */

export interface BrokerInfo {
    id: string;
    name: string;
    appTitle: string;
    tagline: string;
    emoji: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    iosScheme: string;
    androidPackage: string;
    iosAppStoreUrl: string;
    androidPlayStoreUrl: string;
    webTradeUrl: string;
}

export const BROKER_LIST: BrokerInfo[] = [
    {
        id: "toss",
        name: "토스증권",
        appTitle: "토스 (Toss)",
        tagline: "초보자도 쓰기 쉬운 직관적 차트와 간편 주문",
        emoji: "🔵",
        bgColor: "from-blue-600 to-blue-700",
        textColor: "text-blue-400",
        borderColor: "border-blue-500/30",
        iosScheme: "supertoss://stock",
        androidPackage: "viva.republica.toss",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id839333328",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=viva.republica.toss",
        webTradeUrl: "https://tossinvest.com"
    },
    {
        id: "kiwoom",
        name: "키움증권",
        appTitle: "영웅문S#",
        tagline: "국내 점유율 1위, 전문 투자자용 강력한 호가창",
        emoji: "🔴",
        bgColor: "from-rose-600 to-pink-700",
        textColor: "text-rose-400",
        borderColor: "border-rose-500/30",
        iosScheme: "kiwoomheroes://",
        androidPackage: "com.kiwoom.heros",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1617478051",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.kiwoom.heros",
        webTradeUrl: "https://www.kiwoom.com"
    },
    {
        id: "kb",
        name: "KB증권",
        appTitle: "M-able (마블)",
        tagline: "다양한 자산 관리와 간편 트레이딩 지원",
        emoji: "🟡",
        bgColor: "from-amber-600 to-yellow-600",
        textColor: "text-amber-400",
        borderColor: "border-amber-500/30",
        iosScheme: "kbsec://",
        androidPackage: "com.kbsec.mts.platform",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1173400587",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.kbsec.mts.platform",
        webTradeUrl: "https://www.kbsec.com"
    },
    {
        id: "mirae",
        name: "미래에셋증권",
        appTitle: "M-STOCK",
        tagline: "글로벌 투자 및 연금·해외주식 특화 트레이딩",
        emoji: "🟠",
        bgColor: "from-orange-600 to-amber-700",
        textColor: "text-orange-400",
        borderColor: "border-orange-500/30",
        iosScheme: "miraeassetmstock://",
        androidPackage: "com.miraeasset.trade",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1607567784",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.miraeasset.trade",
        webTradeUrl: "https://securities.miraeasset.com"
    },
    {
        id: "samsung",
        name: "삼성증권",
        appTitle: "mPOP (엠팝)",
        tagline: "프리미엄 자산관리와 안정적인 모바일 주문",
        emoji: "💎",
        bgColor: "from-cyan-600 to-blue-700",
        textColor: "text-cyan-400",
        borderColor: "border-cyan-500/30",
        iosScheme: "samsungmpop://",
        androidPackage: "com.samsung.mpop",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id436402778",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.samsung.mpop",
        webTradeUrl: "https://www.samsungpop.com"
    },
    {
        id: "nh",
        name: "NH투자증권",
        appTitle: "나무증권 (NAMUH)",
        tagline: "2030 스마트 투자자를 위한 간편 수수료 우대",
        emoji: "🌳",
        bgColor: "from-emerald-600 to-teal-700",
        textColor: "text-emerald-400",
        borderColor: "border-emerald-500/30",
        iosScheme: "nhnamuh://",
        androidPackage: "com.nhwm.trade",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1089926442",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.nhwm.trade",
        webTradeUrl: "https://www.mynamuh.com"
    },
    {
        id: "shinhan",
        name: "신한투자증권",
        appTitle: "신한알파",
        tagline: "쉬운 해외주식 소수점 투자 및 AI 종목 발굴",
        emoji: "🔷",
        bgColor: "from-sky-600 to-indigo-700",
        textColor: "text-sky-400",
        borderColor: "border-sky-500/30",
        iosScheme: "shinhanalpha://",
        androidPackage: "com.shinhaninvest.trade",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1331828775",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.shinhaninvest.trade",
        webTradeUrl: "https://www.shinhansec.com"
    },
    {
        id: "korea",
        name: "한국투자증권",
        appTitle: "한국투자",
        tagline: "전통의 강자, 실시간 호가와 오픈 API 연동",
        emoji: "🔶",
        bgColor: "from-amber-600 to-orange-700",
        textColor: "text-amber-400",
        borderColor: "border-amber-500/30",
        iosScheme: "koreainvestment://",
        androidPackage: "com.truefriend.mts",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1604517037",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.truefriend.mts",
        webTradeUrl: "https://www.truefriend.com"
    },
    {
        id: "kakaopay",
        name: "카카오페이증권",
        appTitle: "카카오페이",
        tagline: "카톡으로 간편하게 시작하는 국내/미국 주식",
        emoji: "💛",
        bgColor: "from-yellow-500 to-amber-600",
        textColor: "text-yellow-400",
        borderColor: "border-yellow-500/30",
        iosScheme: "kakaopay://securities",
        androidPackage: "com.kakaopay.app",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1464493844",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.kakaopay.app",
        webTradeUrl: "https://kakaopaysec.com"
    }
];

const PREFERRED_BROKER_KEY = "stocktrend_preferred_broker";

/**
 * 사용자가 선택한 주거래 증권사 정보 가져오기
 */
export function getPreferredBroker(): BrokerInfo {
    if (typeof window === "undefined") return BROKER_LIST[0];
    const savedId = localStorage.getItem(PREFERRED_BROKER_KEY);
    const found = BROKER_LIST.find(b => b.id === savedId);
    return found || BROKER_LIST[0]; // 기본값: 토스증권
}

/**
 * 주거래 증권사 설정 저장
 */
export function setPreferredBroker(brokerId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PREFERRED_BROKER_KEY, brokerId);
    window.dispatchEvent(new CustomEvent("preferred_broker_changed", { detail: brokerId }));
}

/**
 * 현재 기기 환경에 맞는 앱스토어/플레이스토어 다운로드 URL 반환
 */
export function getStoreDownloadUrl(broker: BrokerInfo): string {
    if (typeof window === "undefined") return broker.webTradeUrl;
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    return isIOS ? broker.iosAppStoreUrl : broker.androidPlayStoreUrl;
}

/**
 * 스마트 딥링크 실행기 (MTS 어플 즉시 켜기)
 * - Android: Intent scheme + S.browser_fallback_url (미설치 시 구글플레이로 자동 전환)
 * - iOS: Custom scheme 시도 + 타이머를 통한 앱스토어 안전 이동
 * - Desktop/PC: 해당 증권사 공식 WTS 웹 트레이딩 또는 포털 새 탭 열기
 */
export function launchMtsApp(brokerId?: string): { isMobile: boolean; broker: BrokerInfo } {
    if (typeof window === "undefined") {
        return { isMobile: false, broker: BROKER_LIST[0] };
    }

    const targetId = brokerId || localStorage.getItem(PREFERRED_BROKER_KEY) || "toss";
    const broker = BROKER_LIST.find(b => b.id === targetId) || BROKER_LIST[0];

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);

    if (isAndroid) {
        // 안드로이드 공식 인텐트 스킴 (앱 설치 시 즉시 실행, 미설치 시 플레이스토어로 자동 이동)
        const cleanScheme = broker.iosScheme.replace("://", "").replace("/stock", "").replace("/securities", "");
        const fallbackUrl = encodeURIComponent(broker.androidPlayStoreUrl);
        const intentUrl = `intent://${cleanScheme}#Intent;scheme=${cleanScheme};package=${broker.androidPackage};S.browser_fallback_url=${fallbackUrl};end;`;

        try {
            window.location.href = intentUrl;
        } catch (e) {
            // 인텐트 실행 실패 시 플레이스토어로 직접 이동
            window.location.href = broker.androidPlayStoreUrl;
        }

        return { isMobile: true, broker };
    } else if (isIOS) {
        // iOS 커스텀 URL 스킴
        const now = Date.now();
        
        try {
            window.location.href = broker.iosScheme;
        } catch (e) {
            window.location.href = broker.iosAppStoreUrl;
        }

        // 미설치 시 앱스토어로 부드럽게 유도
        setTimeout(() => {
            if (Date.now() - now < 2000) {
                window.location.href = broker.iosAppStoreUrl;
            }
        }, 1500);

        return { isMobile: true, broker };
    } else {
        // PC / 데스크탑 환경: WTS 웹 트레이딩 또는 공식 사이트 오픈
        window.open(broker.webTradeUrl, "_blank", "noopener,noreferrer");
        return { isMobile: false, broker };
    }
}
