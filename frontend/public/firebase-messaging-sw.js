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
    const alertType = payload.data?.type || 'stock-alert';

    // 알림 종류별 태그 분리
    // - 뉴스 속보: news-{symbol} -> 같은 종목 뉴스만 덜어쓰기
    // - 공시 속보: disc-{symbol} -> 같은 종목 공시만 덜어쓰기
    // -> 뉴스와 공시는 서로 덜어쓰지 않고 독립적으로 쌓임
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
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: payload.data,
        tag: tag,
        renotify: true,
        requireInteraction: true,
        silent: false,
        actions: [
            {
                action: 'view',
                title: alertType === 'disclosure_alert' ? '공시 보기 📊' : '종목 보기 📈'
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

    const data = event.notification.data || {};
    const alertType = data.type || '';
    const symbol = data.symbol || '';
    const newsUrl = data.news_url || '';
    const dartUrl = data.dart_url || '';
    const notifTitle = event.notification.body?.split('\n')[0] || '';

    let targetUrl;

    if (alertType === 'disclosure_alert') {
        // 공시 알림: 버튼 클릭이든 본문 클릭이든 무조건 공시 중간 경유 페이지로 이동 (조회수 증가 및 원문 제공)
        if (dartUrl) {
            const params = new URLSearchParams();
            params.set('url', dartUrl);
            params.set('type', 'disclosure');
            if (symbol) params.set('symbol', symbol);
            if (notifTitle) params.set('title', notifTitle);
            targetUrl = `/news-redirect?${params.toString()}`;
        } else {
            targetUrl = data.url || '/discovery';
        }
    } else if (alertType === 'news_alert') {
        // 뉴스 속보: 중간 경유 페이지 또는 종목 페이지
        if (event.action === 'view') {
            // 종목 보기 버튼 -> 종목 분석 페이지
            targetUrl = data.url || '/discovery';
        } else {
            // 본문 클릭 -> 뉴스 중간 경유 페이지 (고급스러운 UI 포함)
            if (newsUrl) {
                const params = new URLSearchParams();
                params.set('url', newsUrl);
                if (symbol) params.set('symbol', symbol);
                if (notifTitle) params.set('title', notifTitle);
                targetUrl = `/news-redirect?${params.toString()}`;
            } else {
                targetUrl = data.url || '/discovery';
            }
        }
    } else {
        // 기타 알림 (장시작가 등)
        targetUrl = data.url || '/';
    }

    const isSameOrigin = targetUrl.startsWith('/') || targetUrl.startsWith(self.location.origin);
    const fullUrl = isSameOrigin ? new URL(targetUrl, self.location.origin).href : targetUrl;
    const baseOrigin = self.location.origin;

    // 앱 열기 또는 포커스
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 외부 링크(DART 등)인 경우 보안상 무조건 새 창(새 탭)으로 열기
                if (!isSameOrigin) {
                    return clients.openWindow(fullUrl);
                }

                // 이미 열려있는 앱 창 찾기 (같은 도메인이면 OK)
                const existingClient = clientList.find(client =>
                    client.url.startsWith(baseOrigin)
                );

                if (existingClient && 'focus' in existingClient) {
                    // 이미 열린 창이 있으면 포커스 + 해당 종목 페이지로 이동
                    return existingClient.focus().then(() => {
                        return existingClient.navigate(fullUrl);
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
