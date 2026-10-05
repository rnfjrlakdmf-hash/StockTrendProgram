/**
 * Firebase Cloud Messaging Service Worker
 * 백그라운드 푸시 알림 처리 (SW Version: 2026.09.03-v6-navigation-fix)
 * 
 * [스마트 카테고리별 다중 알림 시스템 & 원클릭 타겟 링크 직행]
 * - 브리핑, 공시, 뉴스, 각 종목별 급등 알림이 서로를 지우지 않고 독립적으로 수신됩니다.
 * - 알림 클릭 시 단순 통합 대시보드(/)가 아닌, 공시/뉴스 원문 또는 해당 종목 심층 분석창(/discovery?q=종목코드)으로 즉시 직행합니다.
 */

const SW_VERSION = '2026.10.06-v16-bulletproof-push';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// [핵심] Firebase SDK 로드 전에 네이티브 push 이벤트를 최우선 가로채어 처리합니다.
// 1) 사이트 탭이 켜져 있든 꺼져 있든(절전/잠금화면 포함) 100% OS/상단바 푸시 알림이 팝업됩니다.
// 2) 모바일 브라우저(삼성 인터넷, 크롬 모바일 등)의 actions/vibrate 비호환 에러 시 3단계 안전 폴백으로 100% 무조건 알림 표출!
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload = {};
    try {
        payload = event.data.json();
    } catch (e) {
        try {
            payload = { notification: { title: '📢 스톡 트렌드 알림', body: event.data.text() } };
        } catch (err) {
            return;
        }
    }

    // Firebase 내부 리스너가 알림을 삼키거나 중복 표시하지 못하도록 즉시 전파 차단
    event.stopImmediatePropagation();

    const dataObj = payload.data || {};
    const notifObj = payload.notification || {};

    const notificationTitle = notifObj.title || dataObj.title || '📢 스톡 트렌드 알림';
    const notificationBody = notifObj.body || dataObj.body || '';
    const symbol = dataObj.symbol || '';
    const alertType = dataObj.type || 'stock-alert';
    const subType = dataObj.sub_type || '';

    // 고유 태그 + 타임스탬프 부여로 OS가 이전 알림에 조용히 묻어버리는(Suppress) 현상 방지
    const baseTag = dataObj.tag || notifObj.tag || (symbol ? `st-${alertType}-${symbol}` : `st-${alertType}`);
    const uniqueTag = `${baseTag}-${Date.now()}`;

    const baseOrigin = (self.location && self.location.origin) ? self.location.origin : 'https://stocktrend.site';
    const iconUrl = `${baseOrigin}/icon.png`;
    const badgeUrl = `${baseOrigin}/badge.png`;

    // 1단계 표준 옵션
    const primaryOptions = {
        body: notificationBody,
        icon: iconUrl,
        badge: badgeUrl,
        vibrate: [200, 100, 200],
        data: dataObj,
        tag: uniqueTag,
        renotify: true,
        requireInteraction: false,
        silent: false
    };

    // [철통 3단계 폴백] 모바일 브라우저의 옵션 비호환 에러를 원천 차단하여 무조건 알림 화면 표출 보장
    event.waitUntil((async () => {
        try {
            await self.registration.showNotification(notificationTitle, primaryOptions);
        } catch (err) {
            console.warn('[SW] Primary showNotification failed, trying safe fallback:', err);
            try {
                // 2단계 폴백: vibrate 등 복잡한 설정 제외 후 간소화
                await self.registration.showNotification(notificationTitle, {
                    body: notificationBody,
                    icon: iconUrl,
                    badge: badgeUrl,
                    data: dataObj,
                    tag: uniqueTag
                });
            } catch (fallbackErr) {
                console.warn('[SW] Safe fallback failed, trying bare-minimum notification:', fallbackErr);
                // 3단계 최후의 보루: 순수 텍스트만으로 100% 강제 팝업
                try {
                    await self.registration.showNotification(notificationTitle, {
                        body: notificationBody
                    });
                } catch (e3) {
                    console.error('[SW] All showNotification attempts failed:', e3);
                }
            }
        }
    })());
});

// Firebase SDK 로드 (토큰 발급 및 구독 호환성 유지용)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAlr-fX3Wcc2PL3cZioxc7jDYgn4j3eLqg",
    authDomain: "stocktrendprogram.firebaseapp.com",
    projectId: "stocktrendprogram",
    storageBucket: "stocktrendprogram.firebasestorage.app",
    messagingSenderId: "656335224088",
    appId: "1:656335224088:web:e041e46056d0183f11f26d"
});

const messaging = firebase.messaging();

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
    } else if (customUrl && customUrl !== '/' && !customUrl.endsWith('stocktrend.site') && !customUrl.endsWith('stocktrend.site/') && !customUrl.endsWith('stock-trend-program.co.kr') && !customUrl.endsWith('stock-trend-program.co.kr/')) {
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
