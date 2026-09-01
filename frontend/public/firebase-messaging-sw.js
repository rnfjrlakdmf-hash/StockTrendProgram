/**
 * Firebase Cloud Messaging Service Worker
 * 백그라운드 푸시 알림 처리 (SW Version: 2026.09.01-v3-antigroup)
 */

const SW_VERSION = '2026.09.01-v3-antigroup';

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
    console.log('[SW] Background message received (v3):', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || '새 알림';
    const notificationBody = payload.notification?.body || payload.data?.body || '';
    const symbol = payload.data?.symbol || '';
    const alertType = payload.data?.type || 'stock-alert';

    // 카테고리별 스마트 태그 (스마트 덮어쓰기)
    let tag;
    if (alertType === 'disclosure_alert') {
        tag = symbol ? `disc-${symbol}` : 'disc-alert';
    } else if (alertType === 'news_alert') {
        tag = symbol ? `news-${symbol}` : 'news-alert';
    } else if (alertType === 'market_summary' || alertType === 'portfolio_summary') {
        tag = 'market-briefing-main';
    } else {
        tag = symbol ? `stock-${symbol}` : 'stock-alert-main';
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

    // 안드로이드 OS의 강제 묶음(하얀 네모 상자) 방지:
    // 기존에 쌓여있는 알림이 2개 이상이면 오래된 알림을 자동 정리하여
    // 항상 최신 1~2개의 알림이 선명한 [상승 차트 뱃지]로 유지되도록 보장
    try {
        const activeNotifs = await self.registration.getNotifications();
        if (activeNotifs && activeNotifs.length >= 2) {
            for (let i = 0; i < activeNotifs.length - 1; i++) {
                activeNotifs[i].close();
            }
        }
    } catch (e) {
        console.warn('[SW] Error managing notification stack:', e);
    }

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const data = event.notification.data || {};
    const alertType = data.type || '';
    const symbol = data.symbol || '';
    const newsUrl = data.news_url || '';
    const dartUrl = data.dart_url || '';
    const notifTitle = event.notification.body?.split('\n')[0] || '';

    let targetUrl;

    if (event.action === 'view_stock' && symbol) {
        targetUrl = `/stock/${symbol}`;
    } else if (event.action === 'view_doc') {
        if (dartUrl) {
            targetUrl = dartUrl;
        } else if (newsUrl) {
            targetUrl = newsUrl;
        } else {
            targetUrl = data.url || '/alerts';
        }
    } else if (alertType === 'disclosure_alert' || alertType === 'whale_alert') {
        if (dartUrl) {
            const params = new URLSearchParams();
            params.set('url', dartUrl);
            params.set('type', 'disclosure');
            if (symbol) params.set('symbol', symbol);
            if (notifTitle) params.set('title', notifTitle);
            targetUrl = `/news-redirect?${params.toString()}`;
        } else {
            targetUrl = data.url || '/alerts';
        }
    } else if (alertType === 'news_alert') {
        if (newsUrl) {
            const params = new URLSearchParams();
            params.set('url', newsUrl);
            if (symbol) params.set('symbol', symbol);
            if (notifTitle) params.set('title', notifTitle);
            targetUrl = `/news-redirect?${params.toString()}`;
        } else {
            targetUrl = data.url || '/alerts';
        }
    } else {
        targetUrl = data.url || '/alerts';
    }

    const isSameOrigin = targetUrl.startsWith('/') || targetUrl.startsWith(self.location.origin);
    const fullUrl = isSameOrigin ? new URL(targetUrl, self.location.origin).href : targetUrl;
    const baseOrigin = self.location.origin;

    // 앱 열기 또는 포커스
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                if (!isSameOrigin) {
                    return clients.openWindow(fullUrl);
                }

                const existingClient = clientList.find(client =>
                    client.url.startsWith(baseOrigin)
                );

                if (existingClient && 'focus' in existingClient) {
                    return existingClient.focus().then(() => {
                        return existingClient.navigate(fullUrl);
                    });
                }

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
