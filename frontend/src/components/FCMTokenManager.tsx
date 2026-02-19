/**
 * FCM Token Manager Component
 * 푸시 알림 활성화 및 토큰 등록
 */

"use client";

import { useEffect, useState } from "react";
import { requestFCMToken, onForegroundMessage, getNotificationPermission, showNotification } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/config";
import { Bell, BellOff, Check } from "lucide-react";
import BuySignalModal from "./BuySignalModal";

export default function FCMTokenManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [registered, setRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [buySignalData, setBuySignalData] = useState<any>(null);
    useEffect(() => {
        const safePermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
        console.log("FCMTokenManager Mounted! Permission:", safePermission);

        // 현재 권한 상태 확인
        const currentPermission = getNotificationPermission();
        setPermission(currentPermission);


        // 로컬 스토리지에서 등록 상태 확인
        const isRegistered = localStorage.getItem('fcm_registered') === 'true';
        setRegistered(isRegistered);

        // [Auto Sync] 권한이 이미 있다면 백엔드에 토큰 갱신 (DB 누락 방지)
        if (currentPermission === 'granted') {
            syncTokenToServer();
        }

        // 포그라운드 메시지 리스너
        onForegroundMessage((payload) => {
            console.log('[FCM] Received foreground message:', payload);

            if (payload.data?.type === 'BUY_SIGNAL') {
                setBuySignalData({
                    stockName: payload.data.stock_name,
                    stockCode: payload.data.stock_code,
                    targetPrice: payload.data.target_price,
                    qty: payload.data.qty
                });
                return;
            }

            const title = payload.notification?.title || '새 알림';
            const body = payload.notification?.body || '';

            showNotification(title, {
                body,
                data: payload.data
            });
        });
    }, []);

    const syncTokenToServer = async () => {
        try {
            const token = await requestFCMToken();
            if (token) {
                await registerTokenToBackend(token);
                setRegistered(true);
                localStorage.setItem('fcm_registered', 'true');
            }
        } catch (e) {
            console.error('[FCM] Auto-sync failed:', e);
        }
    };

    const registerTokenToBackend = async (token: string) => {
        const userId = localStorage.getItem('user_id') || 'guest';
        const res = await fetch(`${API_BASE_URL}/api/fcm/register`, {
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

            if (!token) {
                alert('❌ 알림 권한이 거부되었습니다.\n\n브라우저 설정에서 알림 권한을 허용해주세요.');
                setLoading(false);
                return;
            }

            const data = await registerTokenToBackend(token);

            if (data.status === 'success') {
                setRegistered(true);
                setPermission('granted');
                localStorage.setItem('fcm_registered', 'true');

                showNotification('✅ 푸시 알림 활성화!', {
                    body: '이제 앱이 꺼져있어도 가격 알림을 받을 수 있습니다.',
                    icon: '/icon.png'
                });
            } else {
                alert('❌ 알림 설정에 실패했습니다.\n\n' + (data.message || '알 수 없는 오류'));
            }
        } catch (error) {
            console.error('[FCM] Registration failed:', error);
            alert('❌ 알림 설정 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const [isVisible, setIsVisible] = useState(true);

    // [Enhancement] Premium UI Design for Notification Status

    // Connected State (Minimal & Sleek)
    if (permission === 'granted' && registered) {
        return (
            <div suppressHydrationWarning>
                <div className="fixed bottom-6 right-6 z-[50] animate-in slide-in-from-bottom-5 fade-in duration-700">
                    <div className="group relative flex items-center justify-center">
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all duration-500 scale-150 animate-pulse"></div>

                        {/* Status Badge */}
                        <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 p-3 rounded-full hover:scale-105 transition-transform cursor-default shadow-2xl relative overflow-hidden">
                            {/* Shiny Gradient Border */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            <Check className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                        </div>

                        {/* Hover Tooltip (Smooth Appearance) */}
                        <div className="absolute bottom-full right-0 mb-3 w-max max-w-[200px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
                            <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-xs">
                                <p className="text-white font-bold mb-0.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    실시간 알림 수신 중
                                </p>
                                <p className="text-gray-400 font-medium">안전하게 연결되었습니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <BuySignalModal
                    isOpen={!!buySignalData}
                    onClose={() => setBuySignalData(null)}
                    data={buySignalData}
                />
            </div>
        );
    }

    // [Fix] Listen for global event from layout banner
    useEffect(() => {
        const handleOpenRequest = () => {
            setIsVisible(true);
            handleEnableNotifications();
        };
        window.addEventListener('OPEN_FCM_REQUEST', handleOpenRequest);
        return () => window.removeEventListener('OPEN_FCM_REQUEST', handleOpenRequest);
    }, []);

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
                                    AI 매수 신호 알림
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                </h4>
                                <p className="text-[11px] text-blue-300 font-medium">실시간 포착 시 즉시 발송</p>
                            </div>
                        </div>

                        {/* Content */}
                        <p className="text-sm text-gray-400 leading-relaxed mb-4 font-medium">
                            놓치지 마세요. <br />
                            급등 예상 종목을 가장 먼저 알려드립니다.
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
            <BuySignalModal
                isOpen={!!buySignalData}
                onClose={() => setBuySignalData(null)}
                data={buySignalData}
            />
        </div>
    );
}
