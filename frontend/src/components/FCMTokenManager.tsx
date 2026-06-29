/**
 * FCM Token Manager Component
 * 푸시 알림 활성화 및 토큰 등록
 */

"use client";

import { useEffect, useState } from "react";
import { requestFCMToken, onForegroundMessage, getNotificationPermission, showNotification } from "@/lib/firebase";
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
    const [prefs, setPrefs] = useState({ pref_morning: true, pref_closing: true, pref_price: true, pref_news: true, pref_watch_compact: true, pref_ipo: true, pref_dividend: true, pref_whale_alert: true, pref_watchlist_live: true });

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
                })
                .catch((err) => {
                    console.error('[FCM] Service Worker registration failed:', err);
                });
        }

        const safePermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
        console.log("FCMTokenManager Mounted! Permission:", safePermission);
        
        // ... rest of the existing logic ...
        const currentPermission = getNotificationPermission();
        setPermission(currentPermission);
        const isRegistered = localStorage.getItem('fcm_registered') === 'true';
        setRegistered(isRegistered);

        onForegroundMessage((payload) => {
            console.log('[FCM] Received foreground message:', payload);
            const title = payload.notification?.title || '새 알림';
            const body = payload.notification?.body || '';
            showNotification(title, { body, data: payload.data });
        });
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
            const res = await fetch(`${API_BASE_URL}/api/system/fcm/preferences?token=${token}`);
            const data = await res.json();
            if (data.status === 'success') {
                setPrefs(data.data);
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
            await fetch(`${API_BASE_URL}/api/system/fcm/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    const [showMenu, setShowMenu] = useState(false);

    // Connected State (Minimal & Sleek)
    // [BugFix] permission이 'granted'라면 등록(registered) 진행 중이더라도 프리미엄 카드가 아닌 요약 아이콘만 보여줌
    if (permission === 'granted') {
        const isSyncing = loading || !registered;
        return (
            <div suppressHydrationWarning>
                <div className="fixed bottom-6 right-6 z-[50] animate-in slide-in-from-bottom-5 fade-in duration-700">
                    <div className="relative flex items-center justify-center group">
                        {/* Pulse Effect */}
                        <div className={`absolute inset-0 ${isSyncing ? 'bg-yellow-500/20' : 'bg-blue-500/20'} rounded-full blur-xl group-hover:${isSyncing ? 'bg-yellow-500/30' : 'bg-blue-500/30'} transition-all duration-500 scale-150 animate-pulse`}></div>

                        {/* Status Badge */}
                        <div
                            onClick={() => setShowMenu(!showMenu)}
                            className="bg-[#111]/80 backdrop-blur-md border border-white/10 p-3 rounded-full hover:scale-105 transition-transform cursor-pointer shadow-2xl relative overflow-hidden active:scale-95"
                            title="클릭하여 테스트 알림 및 상태 확인"
                        >
                            {/* Shiny Gradient Border */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            {isSyncing ? (
                                <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Bell className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                            )}
                        </div>

                        {/* Hover/Click Tooltip (Smooth Appearance) */}
                        <div className={`absolute bottom-full right-0 mb-3 w-max max-w-[280px] transition-all duration-300 ${showMenu ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'}`}>
                            <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-4 shadow-2xl text-xs relative">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                                    className="absolute top-2 right-2 text-gray-600 hover:text-white p-1"
                                >
                                    ✕
                                </button>
                                <p className="text-white font-bold mb-1 flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></span>
                                    {loading ? '연결 재설정 중...' : '자동 알림 수신 중'}
                                </p>
                                <p className="text-gray-400 font-medium mb-3 leading-relaxed">
                                    {loading ? '잠시만 기다려주세요.' : '정상적으로 연결되었습니다. 자동으로 최신 속보와 가격 알림을 수신합니다.'}
                                </p>
                                
                                {!loading && (
                                    <div className="space-y-4">
                                        {/* 가이드 및 설정 섹션 */}
                                        <div className="bg-white/5 rounded-xl p-3 space-y-3 border border-white/5">
                                            {/* AI 마켓 브리핑 */}
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-purple-500/20 p-1.5 rounded-lg text-purple-400 text-xs mt-0.5">✨</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px]">AI 마켓 브리핑 (08:00)</p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">내 관심종목의 호재와 악재 요약본</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_morning')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_morning 
                                                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_morning ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_morning ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>
                                            
                                            {/* 장시작/마감 리포트 */}
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-400 text-xs mt-0.5">☀️</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px]">장시작/마감 리포트</p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">시가/종가 및 누적 수익 요약 리포트</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_closing')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_closing 
                                                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_closing ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_closing ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>
                                            
                                            {/* 가격 변동 알림 */}
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-red-500/20 p-1.5 rounded-lg text-red-400 text-xs mt-0.5">🚨</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px]">가격 변동 알림</p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">손절, 익절, 목표가 도달 시 즉시 알림</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_price')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_price 
                                                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_price ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_price ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>

                                            {/* 속보 알림 */}
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-yellow-500/20 p-1.5 rounded-lg text-yellow-400 text-xs mt-0.5">⚡</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px]">관심종목 속보 알림</p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">내 종목 관련 중요 뉴스 및 공시 즉시 알림</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_news')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_news 
                                                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_news ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_news ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>

                                            {/* 배당락일 알림 */}
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-purple-500/20 p-1.5 rounded-lg text-purple-400 text-xs mt-0.5">💰</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px]">배당락일 알림</p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">관심종목의 배당락일 전날 잊지 않게 미리 알림</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_dividend')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_dividend 
                                                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_dividend ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_dividend ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>


                                            {/* 신규 공모주 알림 */}
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-orange-500/20 p-1.5 rounded-lg text-orange-400 text-xs mt-0.5">🚀</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px]">모든 공모주 전체 알림</p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">모든 공모주 청약 일정 알림 (개별 종목만 받으려면 해제)</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_ipo')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_ipo 
                                                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_ipo ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_ipo ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>

                                            {/* 세력 포착 라이브 알림 */}
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-red-500/20 p-1.5 rounded-lg text-red-400 text-xs mt-0.5">🚨</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px]">세력 포착 라이브 알림</p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">거대 자본 매집 등 시장 핵심 공시 알림</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_whale_alert')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_whale_alert 
                                                            ? 'bg-gradient-to-r from-red-400 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_whale_alert ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_whale_alert ? 'bg-rose-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>

                                            {/* 관심종목 실시간 감시 */}
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-yellow-500/20 p-1.5 rounded-lg text-yellow-400 text-xs mt-0.5">🎯</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px]">내 관심종목 실시간 감시</p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">찜한 종목의 5% 급등락 및 속보 알림</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_watchlist_live')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_watchlist_live 
                                                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_watchlist_live ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_watchlist_live ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>

                                            {/* 스마트워치 요약 모드 */}
                                            <div className="flex items-center justify-between gap-2.5 pt-1 border-t border-white/5 mt-1">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-400 text-xs mt-0.5">⌚</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[11px] flex items-center gap-1">
                                                            스마트워치 요약 모드
                                                            <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold tracking-wider">NEW</span>
                                                        </p>
                                                        <p className="text-gray-400 text-[10px] leading-relaxed">워치 화면에 최적화된 초단문 형태로 알림 수신</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref('pref_watch_compact')}
                                                    className={`relative w-12 h-7 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        prefs.pref_watch_compact 
                                                            ? 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]' 
                                                            : 'bg-white/10 border border-white/5 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[2px] left-[2px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        prefs.pref_watch_compact ? 'translate-x-5' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${prefs.pref_watch_compact ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="w-full flex gap-2">
                                            <button 
                                                onClick={handleEnableNotifications}
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 text-[11px] shadow-lg shadow-blue-500/20"
                                            >
                                                <Loader2 className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> 
                                                알림 갱신 (Sync)
                                            </button>
                                            <button
                                                onClick={handleTestPush}
                                                disabled={loading}
                                                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 text-[11px] shadow-lg shadow-purple-500/20 disabled:opacity-50"
                                            >
                                                {loading ? (
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span>🔔</span>
                                                )}
                                                테스트 알림
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 text-center mt-1">
                                            기기 변경이나 알림 미수신 시 위 버튼들을 이용해주세요.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        );
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
