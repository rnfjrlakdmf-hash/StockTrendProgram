/**
 * Firebase Cloud Messaging Service Worker
 * 백그라운드 푸시 알림 처리
 */

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
    console.log('[SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || '새 알림';
    const symbol = payload.data?.symbol || '';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        data: payload.data,
        // 종목별로 태그 분리 → 같은 종목 알림은 덮어쓰기, 다른 종목은 각각 표시
        tag: symbol ? `stock-alert-${symbol}` : 'stock-alert',
        renotify: true,
        actions: [
            {
                action: 'view',
                title: '종목 보기 📈'
            },
            {
                action: 'close',
                title: '닫기'
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

    // 종목발굴 페이지 URL 가져오기
    const data = event.notification.data || {};
    const targetUrl = data.url || '/discovery';
    const fullUrl = new URL(targetUrl, self.location.origin).href;
    const baseOrigin = self.location.origin;

    // 앱 열기 또는 포커스
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 이미 열려있는 앱 창 찾기 (같은 도메인이면 OK)
                const existingClient = clientList.find(client =>
                    client.url.startsWith(baseOrigin)
                );

                if (existingClient && 'focus' in existingClient) {
                    // 이미 열린 창이 있으면 포커스 + 해당 종목 페이지로 이동
                    return existingClient.focus().then(() => {
                        existingClient.navigate(fullUrl);
                    });
                }

                // 열린 창 없으면 새 창 열기
                if (clients.openWindow) {
                    return clients.openWindow(fullUrl);
                }
            })
    );
});


// Service Worker 설치
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installing...');
    self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activating...');
    event.waitUntil(clients.claim());
});
