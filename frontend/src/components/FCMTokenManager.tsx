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


export default function FCMTokenManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [registered, setRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const [isVisible, setIsVisible] = useState(true);
    const [currentToken, setCurrentToken] = useState<string | null>(null);
    const [prefs, setPrefs] = useState({ pref_morning: true, pref_closing: true, pref_price: true, pref_news: true, pref_watch_compact: true });

    useEffect(() => {
        // [Critical] Explicit Service Worker Registration
        if ('serviceWorker' in navigator) {
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

    // [Auto Sync] 사용자가 변경되거나 권한이 허용되면 토큰 갱신
    useEffect(() => {
        const currentPermission = getNotificationPermission();
        if (currentPermission === 'granted') {
            syncTokenToServer();
        }
    }, [user]);

    // [Tab Focus Sync] 탭이 활성화될 때 토큰 상태 및 소유권 자동 검증 (최적화되어 패스)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const currentPermission = getNotificationPermission();
                if (currentPermission === 'granted') {
                    syncTokenToServer();
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

    const syncTokenToServer = async () => {
        try {
            const token = await requestFCMToken();
            if (token) {
                setCurrentToken(token);
                const currentUserId = user?.id || localStorage.getItem('user_id') || 'guest';
                
                // 1. 서버에서 기존 토큰 정보 조회 (소유주 확인)
                const res = await fetch(`${API_BASE_URL}/api/system/fcm/preferences?token=${token}`);
                const data = await res.json();
                
                let needRegister = true;
                if (data.status === 'success' && data.data) {
                    setPrefs(data.data);
                    // 이미 현재 로그인한 유저로 등록되어 있다면 추가 등록 API 요청(DB 쓰기)을 생략
                    if (data.data.user_id === currentUserId) {
                        needRegister = false;
                        console.log("[FCM] Token is already registered to the correct user:", currentUserId);
                    }
                }
                
                if (needRegister) {
                    const regResult = await registerTokenToBackend(token);
                    if (regResult.status === 'success') {
                        console.log("[FCM] Registered token to backend successfully for user:", currentUserId);
                        await fetchPreferences(token);
                    } else {
                        console.error("[FCM] Registration failed:", regResult.message);
                    }
                }
                
                setRegistered(true);
                localStorage.setItem('fcm_registered', 'true');
            }
        } catch (e) {
            console.error('[FCM] Auto-sync failed:', e);
        }
    };

    const registerTokenToBackend = async (token: string) => {
        // useAuth의 user가 있으면 우선 사용, 없으면 localStorage 확인
        const userId = user?.id || localStorage.getItem('user_id') || 'guest';
        console.log("[FCM] Registering token for user:", userId);
        const res = await fetch(`${API_BASE_URL}/api/system/fcm/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId
            },
            body: JSON.stringify({
                token,
                device_type: 'web',
                device_name: navigator.userAgent
            })
        });
        return res.json();
    };

    const handleEnableNotifications = async () => {
        setLoading(true);

        try {
            const token = await requestFCMToken();

            const data = await registerTokenToBackend(token);

            if (data.status === 'success') {
                setCurrentToken(token);
                await fetchPreferences(token);
                setRegistered(true);
                setPermission('granted');
                localStorage.setItem('fcm_registered', 'true');

                showNotification('✅ 푸시 알림 활성화!', {
                    body: '이제 앱이 꺼져있어도 가격 알림을 받을 수 있습니다.',
                    icon: '/icon.png'
                });

                // [Debug] Success Alert with strict details
                const currentUserId = user?.id || localStorage.getItem('user_id') || 'guest';
                alert(`✅ 서버 연결 성공!\n(ID: ${currentUserId})\n(API: ${API_BASE_URL})\n\n토큰이 등록되었습니다.\n다시 백엔드에서 테스트를 진행해주세요.`);
                console.log("[FCM] Registered to:", API_BASE_URL, "User:", currentUserId, "Token:", token);

            } else {
                alert(`❌ 서버 등록 실패\n(API: ${API_BASE_URL})\n\n응답: ${data.message}`);
                console.error("[FCM] Server Error:", data);
            }
        } catch (error: any) {
            console.error('[FCM] Registration failed:', error);
            const errMsg = error.message || String(error);
            
            if (errMsg === 'PERMISSION_DENIED') {
                alert('❌ 알림 권한이 거부되었습니다.\n\n브라우저 설정에서 알림 권한을 허용해주세요.');
            } else if (errMsg === 'TIMEOUT') {
                alert('❌ 서버 응답 시간 초과\n\n토큰 발급 시간이 초과되었습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
            } else if (errMsg === 'FCM_UNAVAILABLE') {
                alert('❌ 시스템 오류\n\n푸시 알림을 지원하지 않는 환경이거나 브라우저입니다.');
            } else if (errMsg.includes('push service error') || errMsg.includes('Registration failed')) {
                alert(`❌ 브라우저 푸시 서비스 차단됨\n\n[원인]\n1. 시크릿 모드(Incognito)에서는 알림이 작동하지 않습니다.\n2. Brave 등 특정 브라우저에서는 푸시 기능이 제한됩니다.\n3. 회사망/광고차단앱이 알림 서버를 막고 있을 수 있습니다.\n\n[상세 에러 내역]\n${errMsg}\n\n일반 크롬(Chrome)이나 엣지(Edge) 브라우저에서 다시 시도해주세요.`);
            } else {
                alert(`❌ 서버 통신 오류\n\n${errMsg}\n(API: ${API_BASE_URL})\n다시 시도해주시거나 관리자에게 문의해주세요.`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTestPush = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setLoading(true);
        const userId = String(user?.id || localStorage.getItem('user_id') || 'guest');
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/fcm/test`, {
                method: 'GET',
                headers: {
                    'X-User-Id': userId
                }
            });
            const data = await res.json();
            console.log("[FCM-Test] Response:", data);

            if (res.status !== 200 || data.status !== 'success') {
                const errMsg = data.message || data.error || '상세 사유 없음';
                const errDetail = data.user_id ? `(ID: ${data.user_id})` : '';
                alert(`❌ 테스트 발송 실패: ${errMsg} ${errDetail}\n(Status: ${res.status})`);
            }
        } catch (error) {
            console.error('[FCM-Test] Request failed:', error);
            alert(`❌ 서버 연결 오류 발생\n\n상세: ${error}\nAPI: ${API_BASE_URL}`);
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
    if (permission === 'granted' && registered) {
        return (
            <div suppressHydrationWarning>
                <div className="fixed bottom-6 right-6 z-[50] animate-in slide-in-from-bottom-5 fade-in duration-700">
                    <div className="relative flex items-center justify-center group">
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all duration-500 scale-150 animate-pulse"></div>

                        {/* Status Badge */}
                        <div
                            onClick={() => setShowMenu(!showMenu)}
                            className="bg-[#111]/80 backdrop-blur-md border border-white/10 p-3 rounded-full hover:scale-105 transition-transform cursor-pointer shadow-2xl relative overflow-hidden active:scale-95"
                            title="클릭하여 테스트 알림 및 상태 확인"
                        >
                            {/* Shiny Gradient Border */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            {loading ? (
                                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Check className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                            )}
                        </div>

                        {/* Hover/Click Tooltip (Smooth Appearance) */}
                        <div className={`absolute bottom-full right-0 mb-3 w-max max-w-[220px] transition-all duration-300 ${showMenu ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'}`}>
                            <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-4 shadow-2xl text-xs relative">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                                    className="absolute top-2 right-2 text-gray-600 hover:text-white p-1"
                                >
                                    ✕
                                </button>
                                <p className="text-white font-bold mb-1 flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></span>
                                    {loading ? '연결 재설정 중...' : '실시간 알림 수신 중'}
                                </p>
                                <p className="text-gray-400 font-medium mb-3 leading-relaxed">
                                    {loading ? '잠시만 기다려주세요.' : '정상적으로 연결되었습니다. 실시간으로 최신 속보와 가격 알림을 수신합니다.'}
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

                                        <div className="w-full">
                                            <button 
                                                onClick={handleEnableNotifications}
                                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 text-[11px] shadow-lg shadow-blue-500/20"
                                            >
                                                <Loader2 className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> 
                                                알림 갱신 (Sync)
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
                            실시간으로 받아보세요.
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
