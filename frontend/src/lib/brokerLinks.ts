/**
 * Korean Securities MTS/HTS Deep Link Bridge
 * 국내 주요 9대 증권사 모바일 MTS 어플 원클릭 실행 및 구글 플레이/앱스토어 연동 유틸리티
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
    appScheme: string;          // 앱 고유 딥링크 스킴 (안드로이드/iOS 공통)
    androidPackage: string;     // 안드로이드 패키지명
    iosAppStoreUrl: string;     // 애플 앱스토어 링크
    androidPlayStoreUrl: string;// 구글 플레이스토어 링크
    webTradeUrl: string;        // 공식 웹 트레이딩(WTS) 링크
}

export const BROKER_LIST: BrokerInfo[] = [
    {
        id: "nh",
        name: "NH투자증권",
        appTitle: "나무증권 (NAMUH)",
        tagline: "2030 스마트 투자자를 위한 간편 수수료 우대",
        emoji: "🌳",
        bgColor: "from-emerald-600 to-teal-700",
        textColor: "text-emerald-400",
        borderColor: "border-emerald-500/30",
        appScheme: "txsmart://",
        androidPackage: "com.nhqv.namuh",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1083946011",
        androidPlayStoreUrl: "https://play.google.com/store/search?q=NH%ED%88%AC%EC%9E%90%EC%A6%9D%EA%B2%83+%EB%82%98%EB%AC%B4&c=apps",
        webTradeUrl: "https://www.mynamuh.com"
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
        appScheme: "heromts://",
        androidPackage: "com.kiwoom.heromts",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1588636253",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.kiwoom.heromts",
        webTradeUrl: "https://www.kiwoom.com"
    },
    {
        id: "toss",
        name: "토스증권",
        appTitle: "토스 (Toss)",
        tagline: "초보자도 쓰기 쉬운 직관적 차트와 간편 주문",
        emoji: "🔵",
        bgColor: "from-blue-600 to-blue-700",
        textColor: "text-blue-400",
        borderColor: "border-blue-500/30",
        appScheme: "supertoss://stock",
        androidPackage: "viva.republica.toss",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id839333328",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=viva.republica.toss",
        webTradeUrl: "https://tossinvest.com"
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
        appScheme: "mpopapp://",
        androidPackage: "com.samsungpop.android.mpop",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id366126607",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.samsungpop.android.mpop",
        webTradeUrl: "https://www.samsungpop.com"
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
        appScheme: "kbma://",
        androidPackage: "com.kbsec.mts.iplustarngm2",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1173618342",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.kbsec.mts.iplustarngm2",
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
        appScheme: "miraeassetTrade://",
        androidPackage: "com.miraeasset.trade",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id475658607",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.miraeasset.trade",
        webTradeUrl: "https://securities.miraeasset.com"
    },
    {
        id: "shinhan",
        name: "신한투자증권",
        appTitle: "신한 SOL증권",
        tagline: "쉬운 해외주식 소수점 투자 및 AI 종목 발굴",
        emoji: "🔷",
        bgColor: "from-sky-600 to-indigo-700",
        textColor: "text-sky-400",
        borderColor: "border-sky-500/30",
        appScheme: "newshinhanialpha://",
        androidPackage: "com.shinhaninvest.nsmts",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1331828775",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.shinhaninvest.nsmts",
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
        appScheme: "neosmartaf://",
        androidPackage: "com.koreainvestment.mts",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1604517037",
        androidPlayStoreUrl: "https://play.google.com/store/search?q=%ED%95%9C%EA%B5%AD%ED%88%AC%EC%9E%90%EC%A6%9D%EA%B2%83&c=apps",
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
        appScheme: "kakaopay://securities",
        androidPackage: "com.kakaopay.app",
        iosAppStoreUrl: "https://apps.apple.com/kr/app/id1464493844",
        androidPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.kakaopay.app",
        webTradeUrl: "https://kakaopaysec.com"
    }
];

import { API_BASE_URL } from "./config";

const PREFERRED_BROKER_KEY = "stocktrend_preferred_broker";

/**
 * 사용자가 선택한 주거래 증권사 정보 가져오기
 */
export function getPreferredBroker(): BrokerInfo {
    if (typeof window === "undefined") return BROKER_LIST[0];
    const savedId = localStorage.getItem(PREFERRED_BROKER_KEY);
    const found = BROKER_LIST.find(b => b.id === savedId);
    return found || BROKER_LIST[0]; // 기본값: NH나무증권
}

/**
 * 주거래 증권사 설정 저장 (브라우저 로컬 저장 + 로그인 사용자 DB 영구 저장)
 */
export function setPreferredBroker(brokerId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PREFERRED_BROKER_KEY, brokerId);
    window.dispatchEvent(new CustomEvent("preferred_broker_changed", { detail: brokerId }));

    // 로그인된 사용자인 경우 계정에 영구 저장
    try {
        const storedUser = localStorage.getItem("stock_user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.id && !parsed.is_guest) {
                // update local cached user object
                parsed.preferred_broker = brokerId;
                localStorage.setItem("stock_user", JSON.stringify(parsed));

                // send to backend DB
                fetch(`${API_BASE_URL}/api/auth/preferred-broker`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: parsed.id,
                        broker: brokerId
                    })
                }).catch(err => console.warn("Failed to sync preferred broker to DB:", err));
            }
        }
    } catch (e) {
        console.warn("Preferred broker DB sync error:", e);
    }
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
 * 종목 코드 클립보드 자동 복사 유틸리티 (모바일 브라우저 최적화)
 */
export async function copyTickerToClipboard(ticker: string): Promise<boolean> {
    if (typeof window === "undefined" || !ticker) return false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(ticker);
            return true;
        } else {
            // 구형/모바일 브라우저 폴백
            const textArea = document.createElement("textarea");
            textArea.value = ticker;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand("copy");
            textArea.remove();
            return successful;
        }
    } catch (e) {
        console.warn("Clipboard copy failed:", e);
        return false;
    }
}

/**
 * 스마트 딥링크 실행기 (스마트폰에 설치된 MTS 어플 즉시 켜기 + 종목 연동)
 */
export function launchMtsApp(
    brokerId?: string,
    symbol?: string,
    stockName?: string
): { isMobile: boolean; broker: BrokerInfo; copied: boolean } {
    if (typeof window === "undefined") {
        return { isMobile: false, broker: BROKER_LIST[0], copied: false };
    }

    const targetId = brokerId || localStorage.getItem(PREFERRED_BROKER_KEY) || "nh";
    const broker = BROKER_LIST.find(b => b.id === targetId) || BROKER_LIST[0];

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isMobile = isAndroid || isIOS;

    // 종목코드 순수 6자리 추출 (예: 000660.KS -> 000660)
    const cleanTicker = (symbol || "").replace(/\.(KS|KQ)$/i, "").replace(/^A/i, "").trim();

    // 1. 토스증권 특별 처리 (토스는 종목 URL로 앱 내 다이렉트 직행 100% 지원)
    if (broker.id === "toss" && cleanTicker) {
        const tossStockUrl = `https://tossinvest.com/stocks/${cleanTicker}`;
        if (isMobile) {
            // 모바일: 토스 앱스킴 시도 후 유니버설 링크 이동
            window.location.href = `supertoss://stock/stockDetail?stockCode=${cleanTicker}`;
            setTimeout(() => {
                window.location.href = tossStockUrl;
            }, 600);
        } else {
            window.open(tossStockUrl, "_blank", "noopener,noreferrer");
        }
        return { isMobile, broker, copied: false };
    }

    // 2. 카카오페이증권 종목 직행 시도
    if (broker.id === "kakaopay" && cleanTicker && isMobile) {
        window.location.href = `kakaopay://securities/stocks/${cleanTicker}`;
        return { isMobile, broker, copied: true };
    }

    // 3. 전통 증권사 (NH나무, 키움, 삼성, KB 등) 모바일 실행
    if (isAndroid) {
        // 안드로이드: 종목 파라미터 포함 스킴 시도
        const cleanScheme = broker.appScheme.replace("://", "").replace("/stock", "").replace("/securities", "");
        let targetScheme = broker.appScheme;
        
        // 증권사별 종목 파라미터 시도
        if (cleanTicker) {
            if (broker.id === "kiwoom") targetScheme = `heromts://order?stockcode=${cleanTicker}`;
            else if (broker.id === "nh") targetScheme = `txsmart://stock?code=${cleanTicker}`;
            else if (broker.id === "samsung") targetScheme = `mpopapp://stock?code=${cleanTicker}`;
            else if (broker.id === "kb") targetScheme = `kbma://stock?code=${cleanTicker}`;
            else if (broker.id === "shinhan") targetScheme = `newshinhanialpha://stock?code=${cleanTicker}`;
        }

        const intentUrl = `intent://#Intent;scheme=${cleanScheme};package=${broker.androidPackage};end;`;

        try {
            window.location.href = targetScheme;
            setTimeout(() => {
                // 특정 스킴 미지원 시 기본 패키지 인텐트로 앱 오픈
                window.location.href = intentUrl;
            }, 500);
        } catch (e) {
            window.location.href = intentUrl;
        }

        return { isMobile: true, broker, copied: !!cleanTicker };
    } else if (isIOS) {
        // iOS: 커스텀 URL 스킴 호출
        let targetScheme = broker.appScheme;
        if (cleanTicker) {
            if (broker.id === "kiwoom") targetScheme = `heromts://order?stockcode=${cleanTicker}`;
            else if (broker.id === "nh") targetScheme = `txsmart://stock?code=${cleanTicker}`;
        }

        window.location.href = targetScheme;
        return { isMobile: true, broker, copied: !!cleanTicker };
    } else {
        // PC / 데스크탑 환경: 네이버페이 증권 종목창 또는 WTS 사이트 오픈
        if (cleanTicker) {
            window.open(`https://m.stock.naver.com/item/${cleanTicker}`, "_blank", "noopener,noreferrer");
        } else {
            window.open(broker.webTradeUrl, "_blank", "noopener,noreferrer");
        }
        return { isMobile: false, broker, copied: !!cleanTicker };
    }
}
