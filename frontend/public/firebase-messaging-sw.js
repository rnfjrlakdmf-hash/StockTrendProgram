/**
 * Firebase Cloud Messaging Service Worker
 * 백그라운드 푸시 알림 처리 (SW Version: 2026.09.03-v6-navigation-fix)
 * 
 * [스마트 카테고리별 다중 알림 시스템 & 원클릭 타겟 링크 직행]
 * - 브리핑, 공시, 뉴스, 각 종목별 급등 알림이 서로를 지우지 않고 독립적으로 수신됩니다.
 * - 알림 클릭 시 단순 통합 대시보드(/)가 아닌, 공시/뉴스 원문 또는 해당 종목 심층 분석창(/discovery?q=종목코드)으로 즉시 직행합니다.
 */

const SW_VERSION = '2026.09.23-v10-no-duplicate';

// Firebase SDK 로드
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 설정
firebase.initializeApp({
    apiKey: "AIzaSyAlr-fX3Wcc2PL3cZioxc7jDYgn4j3eLqg",
    authDomain: "stocktrendprogram.firebaseapp.com",
    projectId: "stocktrendprogram",
    storageBucket: "stocktrendprogram.firebasestorage.app",
    messagingSenderId: "656335224088",
    appId: "1:656335224088:web:e041e46056d0183f11f26d"
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신
messaging.onBackgroundMessage(async (payload) => {
    console.log('[SW] Background message received (v10 duplicate prevention):', payload);

    // [중복 알림 원천 차단]
    // FCM 페이로드에 notification 객체가 포함되어 있으면 Firebase JS SDK가 브라우저 푸시 이벤트를 통해 자체적으로 알림을 띄웁니다.
    // 여기서 self.registration.showNotification을 또 호출하면 동일 알림이 화면에 2개씩 뜨는 현상이 발생합니다.
    if (payload.notification) {
        console.log('[SW] Notification already handled natively by WebPush. Skipping duplicate showNotification.');
        return;
    }

    const notificationTitle = payload.data?.title || '새 알림';
    const notificationBody = payload.data?.body || '';
    const symbol = payload.data?.symbol || '';
    const alertType = payload.data?.type || 'stock-alert';
    const subType = payload.data?.sub_type || '';
    const isQuantAlert = alertType === 'quant_scanner' || (subType && subType.startsWith('quant_')) || (notificationTitle && notificationTitle.includes('퀀트'));

    // 카테고리 및 종목별 결정론적 태그 생성 (임의의 밀리초 타임스탬프로 인한 OS 중복 병합 무력화 방지)
    let tag = payload.data?.tag || '';
    if (!tag) {
        if (alertType === 'disclosure_alert') {
            tag = symbol ? `st-disc-${symbol}` : `st-disc`;
        } else if (alertType === 'news_alert') {
            tag = symbol ? `st-news-${symbol}` : `st-news`;
        } else if (alertType === 'market_summary') {
            tag = `st-market-summary`;
        } else if (alertType === 'portfolio_summary') {
            tag = `st-portfolio-summary`;
        } else if (isQuantAlert) {
            tag = symbol ? `st-quant-${symbol}` : `st-quant`;
        } else if (symbol) {
            tag = `st-stock-${symbol}`;
        } else {
            tag = `st-alert`;
        }
    }

    const notificationOptions = {
        body: notificationBody,
        icon: 'https://stock-trend-program.co.kr/icon.png',
        badge: 'https://stock-trend-program.co.kr/badge.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: payload.data,
        tag: tag,
        renotify: true,
        requireInteraction: false,
        silent: false,
        actions: isQuantAlert ? [
            {
                action: 'view_scanner',
                title: '📊 퀀트 스캐너 전체보기'
            },
            {
                action: 'view_stock',
                title: '🔍 해당 종목 차트'
            }
        ] : [
            {
                action: 'view_stock',
                title: '🔍 AI 정밀 진단'
            },
            {
                action: 'view_doc',
                title: '📄 공시·뉴스 원문'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트 핸들러
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // FCM 내부 계층 구조 안전 언래핑
    const rawData = event.notification.data || {};
    const data = rawData.FCM_MSG?.data || rawData.data || rawData;

    const symbol = data.symbol || '';
    const cleanSymbol = symbol ? (symbol.split('.')[0] || symbol) : '';
    const newsUrl = data.news_url || '';
    const dartUrl = data.dart_url || '';
    const customUrl = data.url || '';
    const alertType = data.type || '';
    const subType = data.sub_type || '';
    const notifTitle = event.notification.body?.split('\n')[0] || '';
    const fullTitle = event.notification.title || '';
    const isQuantAlert = alertType === 'quant_scanner' || subType.startsWith('quant_') || fullTitle.includes('퀀트');

    let targetUrl;

    // 액션 버튼 클릭에 따른 스마트 분기
    if (event.action === 'view_scanner') {
        targetUrl = '/signals?tab=scanner';
    } else if (event.action === 'view_stock' && cleanSymbol) {
        targetUrl = `/discovery?q=${cleanSymbol}`;
    } else if (event.action === 'view_doc') {
        if (dartUrl) {
            const params = new URLSearchParams();
            params.set('url', dartUrl);
            params.set('type', 'disclosure');
            if (cleanSymbol) params.set('symbol', cleanSymbol);
            if (notifTitle) params.set('title', notifTitle);
            targetUrl = `/news-redirect?${params.toString()}`;
        } else if (newsUrl) {
            const params = new URLSearchParams();
            params.set('url', newsUrl);
            params.set('type', 'news');
            if (cleanSymbol) params.set('symbol', cleanSymbol);
            if (notifTitle) params.set('title', notifTitle);
            targetUrl = `/news-redirect?${params.toString()}`;
        } else if (cleanSymbol) {
            targetUrl = `/discovery?q=${cleanSymbol}`;
        } else {
            targetUrl = '/alerts';
        }
    } 
    // [사용자 요청] 퀀트 시세 알림 본체 클릭 시: 퀀트 스캐너 전체보기로 최우선 이동!
    else if (isQuantAlert) {
        targetUrl = '/signals?tab=scanner';
    }
    // 기본 알림 본체 클릭 시: 공시 원문 > 뉴스 원문 > 종목 심층 분석 > 알림센터 순으로 정밀 타겟팅
    else if (dartUrl) {
        const params = new URLSearchParams();
        params.set('url', dartUrl);
        params.set('type', 'disclosure');
        if (cleanSymbol) params.set('symbol', cleanSymbol);
        if (notifTitle) params.set('title', notifTitle);
        targetUrl = `/news-redirect?${params.toString()}`;
    } else if (newsUrl) {
        const params = new URLSearchParams();
        params.set('url', newsUrl);
        params.set('type', 'news');
        if (cleanSymbol) params.set('symbol', cleanSymbol);
        if (notifTitle) params.set('title', notifTitle);
        targetUrl = `/news-redirect?${params.toString()}`;
    } else if (customUrl && customUrl !== '/' && !customUrl.endsWith('stock-trend-program.co.kr') && !customUrl.endsWith('stock-trend-program.co.kr/')) {
        // 구버전 /scanner 링크가 들어온 경우 퀀트 스캐너 전체보기로 자동 교정
        if (customUrl === '/scanner' || customUrl.endsWith('/scanner')) {
            targetUrl = '/signals?tab=scanner';
        } else {
            targetUrl = customUrl;
        }
    } else if (cleanSymbol) {
        targetUrl = `/discovery?q=${cleanSymbol}`;
    } else {
        targetUrl = '/alerts';
    }

    const isSameOrigin = targetUrl.startsWith('/') || targetUrl.startsWith(self.location.origin);
    const fullUrl = isSameOrigin ? new URL(targetUrl, self.location.origin).href : targetUrl;
    const baseOrigin = self.location.origin;

    console.log('[SW] Navigating to targetUrl:', targetUrl, 'fullUrl:', fullUrl);

    // 앱 열기 또는 포커스 및 네비게이션 강제
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(async (clientList) => {
                if (!isSameOrigin) {
                    if (clients.openWindow) return clients.openWindow(fullUrl);
                    return;
                }

                // 이미 사이트가 열려 있는 탭 검색
                const existingClient = clientList.find(client =>
                    client.url && client.url.startsWith(baseOrigin)
                );

                if (existingClient) {
                    // 브라우저 네이티브 창 이동 시도
                    try {
                        if ('navigate' in existingClient) {
                            await existingClient.navigate(fullUrl);
                        }
                    } catch (navErr) {
                        console.warn('[SW] client.navigate() error, will use postMessage fallback:', navErr);
                    }

                    // 탭 포커스 활성화
                    if ('focus' in existingClient) {
                        await existingClient.focus();
                    }

                    // SPA 환경에서 router 이동을 100% 보장하기 위해 포스트 메시지 브로드캐스트
                    existingClient.postMessage({
                        type: 'FCM_NAVIGATE',
                        url: fullUrl
                    });
                    return;
                }

                // 열려 있는 탭이 없으면 새 창으로 열기
                if (clients.openWindow) {
                    return clients.openWindow(fullUrl);
                }
            })
    );
});

// Service Worker 설치 및 즉시 활성화
self.addEventListener('install', (event) => {
    console.log(`[SW] Service Worker (${SW_VERSION}) installing...`);
    self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
    console.log(`[SW] Service Worker (${SW_VERSION}) activated! Claiming clients...`);
    event.waitUntil(clients.claim());
});
