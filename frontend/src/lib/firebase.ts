/**
 * Firebase Configuration
 * FCM 푸시 알림 설정
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyAlr-fX3Wcc2PL3cZioxc7jDYgn4j3eLqg",
    authDomain: "stocktrendprogram.firebaseapp.com",
    projectId: "stocktrendprogram",
    storageBucket: "stocktrendprogram.firebasestorage.app",
    messagingSenderId: "656335224088",
    appId: "1:656335224088:web:e041e46056d0183f11f26d",
    measurementId: "G-8NTHB3F79L"
};

// Firebase 앱 초기화
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
    // 이미 초기화되었는지 확인
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApps()[0];
    }

    // Service Worker 지원 확인
    if ('serviceWorker' in navigator) {
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('[Firebase] Messaging initialization failed:', error);
        }
    }
}

/**
 * FCM 토큰 요청
 * @returns FCM 토큰 또는 null
 */
export async function requestFCMToken(): Promise<string | null> {
    if (!messaging) {
        console.error('[Firebase] Messaging not initialized');
        return null;
    }

    try {
        // 알림 권한 요청
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('[Firebase] Notification permission denied');
            return null;
        }

        // VAPID 키 (Firebase Console → 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서)
        const vapidKey = 'BIoE99fZeoSM68hPLzw2Rl9YTke57JByI0217I02xl4tdUt6fpILEVQezkq-fYrxx_QkhRJA8JrU5uywCdDM7Bs';

        // FCM 토큰 가져오기
        const token = await getToken(messaging, { vapidKey });

        if (token) {
            console.log('[Firebase] FCM Token:', token);
            return token;
        } else {
            console.log('[Firebase] No registration token available');
            return null;
        }
    } catch (error) {
        console.error('[Firebase] Error getting FCM token:', error);
        return null;
    }
}

/**
 * 포그라운드 메시지 수신 리스너
 * @param callback 메시지 수신 시 호출될 콜백
 */
export function onForegroundMessage(callback: (payload: any) => void) {
    if (!messaging) {
        console.error('[Firebase] Messaging not initialized');
        return;
    }

    onMessage(messaging, (payload) => {
        console.log('[Firebase] Foreground message received:', payload);
        callback(payload);
    });
}

/**
 * 알림 권한 상태 확인
 * @returns 'granted' | 'denied' | 'default'
 */
export function getNotificationPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'default';
    }
    return Notification.permission;
}

/**
 * 브라우저 알림 표시
 * @param title 알림 제목
 * @param options 알림 옵션
 */
export function showNotification(title: string, options?: NotificationOptions) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'granted') {
        new Notification(title, {
            icon: '/icon.png',
            badge: '/badge.png',
            vibrate: [200, 100, 200],
            ...options
        } as any);
    }
}
