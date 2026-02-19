/**
 * Firebase Configuration
 * FCM 푸시 알림 설정 (Lazy Initialization 적용)
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

// Singleton instances
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getFirebaseMessaging(): Messaging | null {
    if (typeof window === 'undefined') return null;

    if (!app) {
        try {
            app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        } catch (error) {
            console.error('[Firebase] App initialization failed:', error);
            return null;
        }
    }

    if (!messaging && 'serviceWorker' in navigator) {
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('[Firebase] Messaging initialization failed:', error);
        }
    }

    return messaging;
}

/**
 * FCM 토큰 요청
 */
export async function requestFCMToken(): Promise<string | null> {
    const msg = getFirebaseMessaging();
    if (!msg) {
        console.error('[Firebase] Messaging not available');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[Firebase] Notification permission denied');
            return null;
        }

        const vapidKey = 'BIoE99fZeoSM68hPLzw2Rl9YTke57JByI0217I02xl4tdUt6fpILEVQezkq-fYrxx_QkhRJA8JrU5uywCdDM7Bs';
        const tokenPromise = getToken(msg, { vapidKey });
        const timeoutPromise = new Promise<string | null>((_, reject) =>
            setTimeout(() => reject(new Error('FCM Token Request Timed Out')), 10000)
        );

        const token = await Promise.race([tokenPromise, timeoutPromise]);
        if (token) {
            console.log('[Firebase] FCM Token:', token);
            return token;
        }
        return null;
    } catch (error) {
        console.error('[Firebase] Error getting FCM token:', error);
        return null;
    }
}

/**
 * 포그라운드 메시지 수신 리스너
 */
export function onForegroundMessage(callback: (payload: any) => void) {
    const msg = getFirebaseMessaging();
    if (!msg) return;

    onMessage(msg, (payload) => {
        console.log('[Firebase] Foreground message received:', payload);
        callback(payload);
    });
}

/**
 * 알림 권한 상태 확인
 */
export function getNotificationPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'default';
    }
    return Notification.permission;
}

/**
 * 브라우저 알림 표시
 */
export function showNotification(title: string, options?: NotificationOptions) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'granted') {
        try {
            new Notification(title, {
                icon: '/icon.png',
                badge: '/badge.png',
                vibrate: [200, 100, 200],
                ...options
            } as any);
        } catch (e) {
            console.error("Notification Error:", e);
        }
    }
}
