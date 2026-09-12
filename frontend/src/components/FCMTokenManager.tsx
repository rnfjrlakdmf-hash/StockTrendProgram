/**
 * FCM Token Manager Component
 * 푸시 알림 활성화 및 토큰 등록
 */

"use client";

import { useEffect, useState } from "react";
import { requestFCMToken, onForegroundMessage, onNotificationClick, getNotificationPermission, showNotification } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/config";
import { Bell, BellOff, Check, Zap, Loader2, Calendar, Sparkles, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";


export default function FCMTokenManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [registered, setRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showDelayedCard, setShowDelayedCard] = useState(false);
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
                        const userId = getReliableUserId();
                        console.log('[FCM Native] Auto-registering android token for user:', userId, token.substring(0, 20) + '...');
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

    // [Smart Funnel] 3.5초 후 스르륵 등장 (24시간 동안 닫지 않은 경우에만)
    useEffect(() => {
        try {
            const dismissedUntil = localStorage.getItem('fcm_dismissed_until');
            if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
                setShowDelayedCard(false);
                return;
            }
        } catch {}

        const timer = setTimeout(() => {
            setShowDelayedCard(true);
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

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

    const handleDismissToday = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsVisible(false);
        setShowDelayedCard(false);
        try {
            localStorage.setItem('fcm_dismissed_until', String(Date.now() + 24 * 60 * 60 * 1000));
        } catch {}
    };

    // Connected State: 이미 알림 권한이 승인된 경우 플로팅 카드는 숨김
    if (permission === 'granted') {
        return null;
    }

    if (!isVisible || !showDelayedCard) return null;

    // Denied State (Subtle Toast)
    if (permission === 'denied') {
        return (
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-500" suppressHydrationWarning>
                <div className="bg-zinc-950/95 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3 pr-10 relative max-w-sm">
                    <button
                        onClick={handleDismissToday}
                        className="absolute top-2.5 right-2.5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                        title="닫기"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="bg-red-500/15 p-2 rounded-xl shrink-0">
                        <BellOff className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">알림이 차단되어 있습니다</p>
                        <p className="text-xs text-zinc-400 mt-0.5">브라우저 주소창 🔒 자물쇠를 눌러 알림을 [허용]해 주세요.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Default Request State: 비로그인(게스트) & 로그인 사용자 모두에게 매력적인 다크 프리미엄 알림 카드 제공
    return (
        <div suppressHydrationWarning>
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] max-w-[380px] w-[calc(100%-2rem)] animate-in slide-in-from-bottom-6 sm:slide-in-from-right-6 fade-in duration-500">
                <div className="bg-zinc-950/95 backdrop-blur-2xl border border-blue-500/35 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(59,130,246,0.25)] relative overflow-hidden group hover:border-blue-400/60 transition-all duration-300">

                    {/* 상단 앰비언트 글로우 라인 */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                    {/* 배경 글로우 */}
                    <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/30 transition-colors duration-500"></div>
                    <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>

                    {/* 닫기 버튼 */}
                    <button
                        onClick={handleDismissToday}
                        className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors z-10"
                        title="닫기"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="relative z-10 space-y-3.5">
                        {/* 뱃지 태그 */}
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                                <span>100% 무료 AI 투자 알림</span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                가입비 0원
                            </span>
                        </div>

                        {/* 메인 타이틀 & 서브 카피 */}
                        <div>
                            <h4 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight flex items-center gap-2">
                                내 종목 실적 D-Day & 급등 공시 알림 🔔
                            </h4>
                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                바쁜 일상 속 놓치기 쉬운 증시 핵심 일정을 스마트폰으로 1초 만에 챙겨드립니다.
                            </p>
                        </div>

                        {/* 3대 핵심 혜택 리스트 */}
                        <div className="space-y-2 py-1 bg-white/[0.03] p-3 rounded-2xl border border-white/5 text-xs text-zinc-300">
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md bg-blue-500/20 text-blue-400 shrink-0">
                                    <Calendar className="w-3.5 h-3.5" />
                                </div>
                                <span><strong>실적발표 D-7 & 배당기준일</strong> 아침 자동 알림</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md bg-purple-500/20 text-purple-400 shrink-0">
                                    <Zap className="w-3.5 h-3.5" />
                                </div>
                                <span><strong>대규모 수주·공급계약</strong> DART 공시 1초 포착</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 shrink-0">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                </div>
                                <span><strong>불법 리딩방 유도 NO</strong> · 스팸 없는 클린 알림</span>
                            </div>
                        </div>

                        {/* CTA 버튼 */}
                        <button
                            onClick={handleEnableNotifications}
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group/btn cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>스마트폰과 연결 중...</span>
                                </>
                            ) : (
                                <>
                                    <Bell className="w-4 h-4 group-hover/btn:animate-bounce" />
                                    <span>1초 만에 무료 알림 켜기</span>
                                </>
                            )}
                        </button>

                        {/* 하단 오늘 하루 보지 않기 */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5 px-1">
                            <span>* 상단 종 아이콘에서 언제든 해제 가능</span>
                            <button
                                onClick={handleDismissToday}
                                className="hover:text-zinc-300 underline underline-offset-2 transition-colors cursor-pointer"
                            >
                                오늘 하루 보지 않기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
