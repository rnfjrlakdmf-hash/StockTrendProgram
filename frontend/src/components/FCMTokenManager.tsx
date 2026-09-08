/**
 * FCM Token Manager Component
 * 푸시 알림 활성화 및 토큰 등록
 */

"use client";

import { useEffect, useState } from "react";
import { requestFCMToken, onForegroundMessage, onNotificationClick, getNotificationPermission, showNotification } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/config";
import { Bell, BellOff, Check, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";


export default function FCMTokenManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [registered, setRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const [isVisible, setIsVisible] = useState(true);
    const [currentToken, setCurrentToken] = useState<string | null>(null);
    const [prefs, setPrefs] = useState({ pref_morning: true, pref_closing: true, pref_price: true, pref_news: true, pref_watch_compact: true, pref_ipo: true, pref_dividend: true, pref_whale_alert: true, pref_insider_alert: true, pref_watchlist_live: true });

    // [Native App] 앱(Android) 실행 시 자동으로 FCM 토큰 등록
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const autoRegisterNative = async () => {
                try {
                    const permStatus = await PushNotifications.requestPermissions();
                    if (permStatus.receive !== 'granted') return;
                    await PushNotifications.register();
                    PushNotifications.addListener('registration', async (tokenData) => {
                        const token = tokenData.value;
                        setCurrentToken(token); // Fix: Set token state so toggles work
                        const userId = localStorage.getItem('stock_user') ? JSON.parse(localStorage.getItem('stock_user')!).id : 'guest';
                        if (userId === 'guest') return;
                        console.log('[FCM Native] Auto-registering android token:', token.substring(0, 20) + '...');
                        await fetch(`${API_BASE_URL}/api/system/fcm/register`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
                            body: JSON.stringify({ token, device_type: 'android', device_name: 'Android App' })
                        });
                        localStorage.setItem('fcm_registered', 'true');
                        localStorage.setItem('fcm_token_value', token);
                        setRegistered(true);
                    });
                } catch (e) {
                    console.error('[FCM Native] Auto-register failed:', e);
                }
            };
            autoRegisterNative();
        }
    }, [user]);

    useEffect(() => {
        // [Critical] Explicit Service Worker Registration (Web only)
        if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js')
                .then((registration) => {
                    console.log('[FCM] Service Worker registered:', registration.scope);
                    registration.update();
                })
                .catch((err) => {
                    console.error('[FCM] Service Worker registration failed:', err);
                });
        }

        const safePermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
        console.log("FCMTokenManager Mounted! Permission:", safePermission);
        
        // ... rest of the existing logic ...
        const isRegistered = localStorage.getItem('fcm_registered') === 'true';
        setRegistered(isRegistered);

        // [Fix] 네이티브 앱에서는 Notification.permission이 항상 'default'를 반환하므로
        // localStorage의 fcm_registered 값으로 permission 상태를 대신 판단
        if (Capacitor.isNativePlatform() && isRegistered) {
            setPermission('granted');
        } else {
            const currentPermission = getNotificationPermission();
            setPermission(currentPermission);
        }

        onForegroundMessage((payload) => {
            console.log('[FCM] Received foreground message (Web):', payload);
            const title = payload.notification?.title || '새 알림';
            const body = payload.notification?.body || '';
            showNotification(title, { body, data: payload.data });
        });

        // [Fix] 네이티브 푸시 알림 리스너 (앱이 켜져 있을 때 수신 처리)
        if (Capacitor.isNativePlatform()) {
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('[FCM Native] Foreground push received:', notification);
                showNotification(notification.title || '새 알림', { 
                    body: notification.body || '', 
                    data: notification.data 
                });
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('[FCM Native] Notification Clicked:', notification);
                const data = notification.notification.data;
                if (data && data.url) {
                    window.location.href = data.url;
                }
            });
        }

        // 웹(WebPush) 푸시 알림 클릭 시 URL 이동 처리
        onNotificationClick((payload) => {
            console.log('[FCM Web] Notification Clicked, payload:', payload);
            if (payload.data && payload.data.url) {
                window.location.href = payload.data.url;
            }
        });

        // Service Worker로부터의 네비게이션 메시지 수신 (창 전환 후 목적지 링크 이동 100% 보장)
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            const handleSwMessage = (event: MessageEvent) => {
                if (event.data && event.data.type === 'FCM_NAVIGATE' && event.data.url) {
                    console.log('[FCM] Received FCM_NAVIGATE from SW:', event.data.url);
                    window.location.href = event.data.url;
                }
            };
            navigator.serviceWorker.addEventListener('message', handleSwMessage);
            return () => {
                navigator.serviceWorker.removeEventListener('message', handleSwMessage);
            };
        }
    }, []);

    // [Init] Load initial token from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('fcm_token_value');
        if (stored) {
            setCurrentToken(stored);
            setRegistered(true);
            setPermission('granted');
            fetchPreferences(stored);
        }
    }, []);

    // [Auto Sync] 사용자가 변경되거나 권한이 허용되면 토큰 강제 갱신
    useEffect(() => {
        const currentPermission = getNotificationPermission();
        if (currentPermission === 'granted') {
            syncTokenToServer(true); // 강제 갱신 트리거
        }
    }, [user]);

    // [Tab Focus Sync] 탭이 활성화될 때 토큰 상태 및 소유권 자동 검증 (로그인 시 강제 갱신)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const currentPermission = getNotificationPermission();
                if (currentPermission === 'granted') {
                    syncTokenToServer(true); // 강제 갱신 트리거
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [user]);

    const fetchPreferences = async (token: string) => {
        try {
            const userId = getReliableUserId();
            const res = await fetch(`${API_BASE_URL}/api/system/fcm/preferences?token=${token}`, {
                headers: { 'X-User-Id': userId }
            });
            const data = await res.json();
            if (data.status === 'success') {
                setPrefs(data.data);
            } else if (data.status === 'error' && data.message === 'Token not found') {
                // Auto-heal: Register token if missing from backend DB
                console.log('[FCM] Token missing in backend DB, auto-registering...');
                await registerTokenToBackend(token, userId);
                // Try fetching again once
                const res2 = await fetch(`${API_BASE_URL}/api/system/fcm/preferences?token=${token}`, {
                    headers: { 'X-User-Id': userId }
                });
                const data2 = await res2.json();
                if (data2.status === 'success') {
                    setPrefs(data2.data);
                }
            }
        } catch (e) {
            console.error('[FCM] Fetch prefs failed:', e);
        }
    };

    const handleTogglePref = async (key: keyof typeof prefs) => {
        if (!currentToken) return;
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        setPrefs(newPrefs); // Optimistic UI
        try {
            const userId = getReliableUserId();
            // Ensure token is registered before updating prefs to prevent silent failures
            await registerTokenToBackend(currentToken, userId);
            
            await fetch(`${API_BASE_URL}/api/system/fcm/preferences`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Id': userId
                },
                body: JSON.stringify({
                    token: currentToken,
                    ...newPrefs
                })
            });
        } catch (e) {
            console.error('[FCM] Update prefs failed:', e);
            setPrefs(prefs); // Revert on error
        }
    };

    // [BugFix] user_id를 가장 신뢰성 있는 순서로 읽기
    // 1) useAuth user.id (React 상태)
    // 2) stock_user localStorage (JSON에서 id 직접 파싱)
    // 3) user_id localStorage (백엔드 응답 후 늦게 저장됨 - 신뢰 안함)
    // 4) guest (마지막 충대)
    const getReliableUserId = (): string => {
        if (user?.id) return user.id;
        try {
            const storedUser = localStorage.getItem('stock_user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed?.id) return parsed.id;
            }
        } catch {}
        
        let guestId = localStorage.getItem('guest_id');
        if (!guestId) {
            guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('guest_id', guestId);
        }
        return localStorage.getItem('user_id') || guestId;
    };

    const syncTokenToServer = async (force: boolean = false) => {
        try {
            const currentUserId = getReliableUserId();

            const token = await requestFCMToken();
            if (!token) return;

            setCurrentToken(token);

            // ─── 핵심: 토큰 자동 갱신 로직 ───────────────────────────
            const storedToken = localStorage.getItem('fcm_token_value');
            const lastSyncTime = parseInt(localStorage.getItem('fcm_last_sync') || '0');
            const now = Date.now();
            const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12시간마다 자동 재등록

            const tokenChanged = storedToken !== token;           // Firebase가 토큰 교체했는지
            const syncExpired = now - lastSyncTime > SYNC_INTERVAL_MS; // 12시간 경과했는지

            if (force) {
                console.log('[FCM] Forced sync triggered by user action or login status change.');
            } else if (tokenChanged) {
                // 🔄 Firebase가 새 토큰 발급 → 즉시 재등록 (사용자 모르게 자동)
                console.log('[FCM] Token rotated by Firebase. Auto re-registering silently...');
            } else if (!syncExpired) {
                // ⏭️ 최근 12시간 내 동일 토큰 → 스킵 (서버 부하 방지)
                console.log('[FCM] Token is fresh (synced within 12h). Skipping.');
                setRegistered(true);
                await fetchPreferences(token);
                return;
            } else {
                // ⏰ 12시간 이상 경과 → last_used 갱신을 위해 재등록
                console.log('[FCM] Re-syncing token to refresh last_used timestamp...');
            }

            // 서버에 토큰 등록/갱신 (UPSERT → last_used 자동 갱신)
            const regResult = await registerTokenToBackend(token, currentUserId);
            if (regResult.status === 'success') {
                console.log('[FCM] Token synced for user:', currentUserId);
                localStorage.setItem('fcm_token_value', token);
                localStorage.setItem('fcm_last_sync', String(now));
                await fetchPreferences(token);
            } else {
                console.error('[FCM] Sync failed:', regResult.message);
            }

            setRegistered(true);
            localStorage.setItem('fcm_registered', 'true');
        } catch (e) {
            console.error('[FCM] Auto-sync failed:', e);
        }
    };


    const registerTokenToBackend = async (token: string, forcedUserId?: string) => {
        // [BugFix] stock_user JSON에서 id를 직접 읽어서 가장 신뢰성 있는 user_id 사용
        const userId = forcedUserId || getReliableUserId();
        console.log('[FCM] Registering token for user:', userId);
        const res = await fetch(`${API_BASE_URL}/api/system/fcm/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId
            },
            body: JSON.stringify({
                token,
                device_type: Capacitor.isNativePlatform() ? 'android' : 'web',
                device_name: Capacitor.isNativePlatform() ? 'Android App' : navigator.userAgent
            })
        });
        return res.json();
    };

    const handleEnableNotifications = async () => {
        // ✅ 로그인 체크: 비로그인 상태면 guest 토큰 등록 방지
        const currentUserId = getReliableUserId();
        if (currentUserId === 'guest') {
            alert('🔐 로그인 후 알림을 설정할 수 있습니다.\n\n우측 상단의 로그인 버튼을 눌러 로그인해주세요!');
            return;
        }

        setLoading(true);

        try {
            // [Android Native] 이미 자동 등록된 토큰이 있으면 재사용 (재등록 시 타임아웃 방지)
            let token: string;
            if (Capacitor.isNativePlatform()) {
                const cachedToken = localStorage.getItem('fcm_token_value');
                if (cachedToken) {
                    console.log('[FCM Native] Using cached android token');
                    token = cachedToken;
                } else {
                    token = await requestFCMToken();
                }
            } else {
                token = await requestFCMToken();
            }

            const data = await registerTokenToBackend(token, currentUserId);

            if (data.status === 'success') {
                setCurrentToken(token);
                // localStorage에 토큰 값과 sync 시간 저장 (자동 갱신 시스템용)
                localStorage.setItem('fcm_token_value', token);
                localStorage.setItem('fcm_last_sync', String(Date.now()));
                await fetchPreferences(token);
                setRegistered(true);
                setPermission('granted');
                localStorage.setItem('fcm_registered', 'true');

                showNotification('✅ 푸시 알림 활성화!', {
                    body: '이제 앱이 꺼져있어도 가격 알림을 받을 수 있습니다.',
                    icon: '/icon.png'
                });
                console.log('[FCM] Registered. User:', currentUserId, 'Token:', token.substring(0, 20) + '...');

            } else {
                alert(`❌ 알림 등록 실패\n\n${data.message || '잠시 후 다시 시도해주세요.'}`);
                console.error("[FCM] Server Error:", data);
            }
        } catch (error: any) {
            console.error('[FCM] Registration failed:', error);
            const errMsg = error.message || String(error);
            
            if (errMsg === 'PERMISSION_DENIED') {
                alert('❌ 알림 권한이 거부되었습니다.\n\n브라우저 주소창의 🔒 자물쇠를 클릭하여 알림 권한을 허용해주세요.');
            } else if (errMsg === 'TIMEOUT') {
                alert('❌ 연결 시간 초과\n\n인터넷 연결을 확인하고 다시 시도해주세요.');
            } else if (errMsg === 'FCM_UNAVAILABLE') {
                // iOS 여부 확인 - iOS면 맞춤 안내
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const isStandalone = ('standalone' in navigator && (navigator as any).standalone === true) ||
                    window.matchMedia('(display-mode: standalone)').matches;
                if (isIOS && !isStandalone) {
                    alert('📱 아이폰 알림 받기 안내\n\n아이폰은 홈 화면에 앱을 추가해야 알림을 받을 수 있습니다.\n\n1️⃣ Safari 아래 공유 버튼(↑) 터치\n2️⃣ "홈 화면에 추가" 선택\n3️⃣ 홈 화면 앱으로 다시 실행\n4️⃣ 알림 허용 버튼 누르기\n\n⚠️ 크롬 앱에서는 작동하지 않습니다. 반드시 Safari를 이용하세요.');
                } else {
                    alert('❌ 알림을 지원하지 않는 환경입니다.\n\n일반 크롬(Chrome) 또는 엣지(Edge) 브라우저를 이용해주세요.');
                }
            } else if (errMsg.includes('push service error') || errMsg.includes('Registration failed')) {
                alert('❌ 브라우저 푸시 서비스가 차단되었습니다.\n\n시크릿 모드를 사용 중이거나, 광고 차단 앱이 알림을 막고 있을 수 있습니다.\n일반 크롬(Chrome) 브라우저에서 다시 시도해주세요.');
            } else {
                alert(`❌ 오류가 발생했습니다.\n\n${errMsg}\n\n다시 시도해주시거나 관리자에게 문의해주세요.`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTestPush = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setLoading(true);
        const userId = getReliableUserId();
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/fcm/test`, {
                method: 'GET',
                headers: {
                    'X-User-Id': userId
                }
            });
            const data = await res.json();
            console.log('[FCM-Test] Response:', data);

            if (res.status === 200 && data.status === 'success') {
                // 성공 - 잠시 후 실제 알림이 도착함
                alert('✅ 테스트 알림을 발송했습니다!\n잠시 후 알림이 도착합니다. 🔔\n\n알림이 안 오면:\n1. 브라우저 알림 권한 확인\n2. Windows 알림 센터 확인');
            } else {
                const errMsg = data.message || data.error || '상세 사유 없음';
                alert(`❌ 테스트 발송 실패: ${errMsg}\n(ID: ${userId})`);
            }
        } catch (error) {
            console.error('[FCM-Test] Request failed:', error);
            alert(`❌ 서버 연결 오류\n\n${error}`);
        } finally {
            setLoading(false);
        }
    };


    // [Fix] Listen for global event from layout banner
    useEffect(() => {
        const handleOpenRequest = () => {
            setIsVisible(true);
            handleEnableNotifications();
        };
        window.addEventListener('OPEN_FCM_REQUEST', handleOpenRequest);
        return () => window.removeEventListener('OPEN_FCM_REQUEST', handleOpenRequest);
    }, []);

    // [Enhancement] Premium UI Design for Notification Status

    // Connected State: 이미 알림 권한이 승인된 경우 우측 하단의 상시 플로팅 종 아이콘은 숨김
    // (메인 스마트 리모컨 FloatingQuickMenu을 가리지 않도록 처리)
    if (permission === 'granted') {
        return null;
    }


    if (!isVisible) return null;

    // Denied State (Subtle Toast)
    if (permission === 'denied') {
        return (
            <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-500" suppressHydrationWarning>
                <div className="bg-[#111]/90 backdrop-blur-md border border-red-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3 pr-10 relative max-w-sm">
                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-2 right-2 text-white/20 hover:text-white/80 p-1"
                    >
                        ✕
                    </button>
                    <div className="bg-red-500/10 p-2 rounded-full shrink-0">
                        <BellOff className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">알림이 차단됨</p>
                        <p className="text-xs text-gray-400 mt-0.5">브라우저 주소창의 🔒자물쇠를 눌러 허용해주세요.</p>
                    </div>
                </div>
            </div>
        );
    }

    // 비로그인 상태에서는 알림 카드 표시 안 함 (guest 토큰 방지)
    if (getReliableUserId() === 'guest') return null;

    // Default Request State (Premium Card)
    return (
        <div suppressHydrationWarning>
            <div className="fixed bottom-6 right-6 z-[9999] max-w-[340px] w-full animate-in slide-in-from-right-5 fade-in duration-700">
                <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors duration-500">

                    {/* Atmospheric Glow */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[50px] pointer-events-none group-hover:bg-blue-500/30 transition-colors duration-500"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none"></div>

                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-3 right-3 text-white/20 hover:text-white transition-colors p-1 z-10"
                    >
                        ✕
                    </button>

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Bell className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-[15px] leading-tight flex items-center gap-2">
                                    가격 변동 알림
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                </h4>
                                <p className="text-[11px] text-blue-300 font-medium">관심 종목 가격 변동 시 즉시 발송</p>
                            </div>
                        </div>

                        {/* Content */}
                        <p className="text-sm text-gray-400 leading-relaxed mb-4 font-medium">
                            시장 변동 알림을 <br />
                            자동으로 받아보세요.
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={handleEnableNotifications}
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-gray-100 disabled:opacity-50 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group/btn"
                        >
                            {loading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                    <span>연결 중...</span>
                                </>
                            ) : (
                                <>
                                    <span>알림 켜기</span>
                                    <span className="text-xs font-normal text-gray-500 group-hover/btn:text-black transition-colors">(무료)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
