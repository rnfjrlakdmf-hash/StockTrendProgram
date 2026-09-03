/**
 * Firebase Cloud Messaging Service Worker
 * 백그라운드 푸시 알림 처리 (SW Version: 2026.09.03-v6-navigation-fix)
 * 
 * [스마트 카테고리별 다중 알림 시스템 & 원클릭 타겟 링크 직행]
 * - 브리핑, 공시, 뉴스, 각 종목별 급등 알림이 서로를 지우지 않고 독립적으로 수신됩니다.
 * - 알림 클릭 시 단순 통합 대시보드(/)가 아닌, 공시/뉴스 원문 또는 해당 종목 심층 분석창(/discovery?q=종목코드)으로 즉시 직행합니다.
 */

const SW_VERSION = '2026.09.03-v6-navigation-fix';

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
    console.log('[SW] Background message received (v6 navigation fix):', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || '새 알림';
    const notificationBody = payload.notification?.body || payload.data?.body || '';
    const symbol = payload.data?.symbol || '';
    const alertType = payload.data?.type || 'stock-alert';

    // 카테고리 및 종목별 독립 태그 생성:
    let tag;
    if (alertType === 'disclosure_alert') {
        tag = symbol ? `disc-${symbol}` : `disc-${Date.now()}`;
    } else if (alertType === 'news_alert') {
        tag = symbol ? `news-${symbol}` : `news-${Date.now()}`;
    } else if (alertType === 'market_summary' || alertType === 'portfolio_summary') {
        tag = 'market-briefing-latest';
    } else if (symbol) {
        tag = `stock-price-${symbol}`;
    } else {
        tag = `alert-${Date.now()}`;
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
        actions: [
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
    const notifTitle = event.notification.body?.split('\n')[0] || '';

    let targetUrl;

    // 액션 버튼 클릭에 따른 스마트 분기
    if (event.action === 'view_stock' && cleanSymbol) {
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
        targetUrl = customUrl;
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
