/**
 * Firebase Configuration
 * FCM 푸시 알림 설정 (Lazy Initialization 적용)
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

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
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);

let messaging: Messaging | null = null;

function getFirebaseMessaging(): Messaging | null {
    if (typeof window === 'undefined') return null;

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
export async function requestFCMToken(): Promise<string> {
    if (typeof window === 'undefined') return '';

    // [Capacitor 네이티브 앱 환경]
    if (Capacitor.isNativePlatform()) {
        try {
            console.log('[Firebase Native] Requesting push permissions...');
            const permStatus = await PushNotifications.requestPermissions();
            if (permStatus.receive !== 'granted') {
                throw new Error('PERMISSION_DENIED');
            }

            console.log('[Firebase Native] Registering for push notifications...');
            await PushNotifications.register();
            
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('TIMEOUT')), 15000);
                
                PushNotifications.addListener('registration', (token) => {
                    clearTimeout(timer);
                    console.log('[Firebase Native] FCM Token generated:', token.value);
                    // 네이티브 리스너 중복 방지를 위해 리스너 제거
                    PushNotifications.removeAllListeners();
                    resolve(token.value);
                });

                PushNotifications.addListener('registrationError', (error) => {
                    clearTimeout(timer);
                    console.error('[Firebase Native] Registration error:', error.error);
                    PushNotifications.removeAllListeners();
                    reject(new Error('REGISTRATION_ERROR'));
                });
            });
        } catch (error) {
            console.error('[Firebase Native] Push setup failed:', error);
            throw error;
        }
    }

    // [Web 브라우저 / PWA 환경]
    const msg = getFirebaseMessaging();
    if (!msg) {
        console.error('[Firebase] Messaging not available');
        throw new Error('FCM_UNAVAILABLE');
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[Firebase] Notification permission denied');
            throw new Error('PERMISSION_DENIED');
        }

        const vapidKey = 'BIoE99fZeoSM68hPLzw2Rl9YTke57JByI0217I02xl4tdUt6fpILEVQezkq-fYrxx_QkhRJA8JrU5uywCdDM7Bs';
        
        let registration;
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            const fcmReg = regs.find(r => r.active && r.active.scriptURL.includes('firebase-messaging-sw.js'));
            if (fcmReg) {
                registration = fcmReg;
                console.log('[Firebase] Using existing FCM Service Worker registration');
            } else {
                console.log('[Firebase] Registering new FCM Service Worker');
                registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                await navigator.serviceWorker.ready;
            }
        }

        const getFCMTokenWithTimeout = async (reg: any, attempt = 1): Promise<string> => {
            try {
                const tokenPromise = getToken(msg, { vapidKey, serviceWorkerRegistration: reg });
                const timeoutPromise = new Promise<string>((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT')), 15000)
                );
                return await Promise.race([tokenPromise, timeoutPromise]);
            } catch (err: any) {
                // 첫 번째 시도에서 실패/시간 초과가 발생한 경우 서비스 워커 초기화 후 재시도
                if (attempt === 1 && 'serviceWorker' in navigator) {
                    console.warn('[Firebase] Token request failed, clearing service workers and retrying...', err);
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (let r of regs) {
                        await r.unregister();
                    }
                    const newReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    await navigator.serviceWorker.ready;
                    return await getFCMTokenWithTimeout(newReg, 2);
                }
                throw err;
            }
        };

        const token = await getFCMTokenWithTimeout(registration);
        if (token) {
            console.log('[Firebase] FCM Token:', token);
            return token;
        }
        throw new Error('UNKNOWN_ERROR');
    } catch (error: any) {
        console.error('[Firebase] Error getting FCM token:', error);
        throw error;
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
        console.warn('[Notification] Browser does not support notifications');
        return;
    }

    if (Notification.permission !== 'granted') {
        console.warn('[Notification] Permission not granted');
        return;
    }

    try {
        // [Debug] Add alert for local testing feedback
        if (options?.tag === 'local-test') {
            console.log('[Notification] Local test triggered');
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    registration.showNotification(title, {
                        icon: '/icon.png',
                        badge: '/badge.png',
                        vibrate: [200, 100, 200],
                        ...options
                    } as any).catch(err => {
                        console.error('[Notification] SW Error:', err);
                        // Fallback
                        new Notification(title, options);
                    });
                } else {
                    // Fallback if no SW registered yet
                    new Notification(title, options);
                }
            });
        } else {
            new Notification(title, options);
        }
    } catch (e) {
        console.error("[Notification] Fatal Error:", e);
    }
}
