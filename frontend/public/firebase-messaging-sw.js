/**
 * Firebase Cloud Messaging Service Worker
 * 백그라운드 푸시 알림 처리 (SW Version: 2026.09.01-v2)
 */

const SW_VERSION = '2026.09.01-v2';

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
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received (v2):', payload);

    const notificationTitle = payload.notification?.title || '새 알림';
    const symbol = payload.data?.symbol || '';
    const alertType = payload.data?.type || 'stock-alert';

    // 알림 종류별 태그 분리
    let tag;
    if (alertType === 'disclosure_alert') {
        tag = symbol ? `disc-${symbol}` : 'disc-alert';
    } else if (alertType === 'news_alert') {
        tag = symbol ? `news-${symbol}` : 'news-alert';
    } else {
        tag = symbol ? `stock-alert-${symbol}` : 'stock-alert';
    }

    const notificationOptions = {
        body: payload.notification?.body || '',
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
