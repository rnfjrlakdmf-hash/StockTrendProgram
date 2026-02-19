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
        console.log("FCMTokenManager Mounted! Permission:", Notification.permission);

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

    // 이미 등록된 경우 (작은 배지로 표시)
    if (permission === 'granted' && registered) {
        return (
            <>
                <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-500 group">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 shadow-lg backdrop-blur-md flex items-center gap-2 hover:bg-green-500/20 transition-all cursor-default">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-bold text-sm">알림 ON</span>

                        {/* Hover to see details */}
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#111] border border-green-500/30 rounded-xl p-4 hidden group-hover:block transition-all shadow-xl z-[10000]">
                            <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" /> 연결 성공
                            </h4>
                            <p className="text-gray-400 text-xs">
                                실시간 매수 신호를 수신 중입니다.
                            </p>
                        </div>
                    </div>
                </div>
                <BuySignalModal
                    isOpen={!!buySignalData}
                    onClose={() => setBuySignalData(null)}
                    data={buySignalData}
                />
            </>
        );
    }

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

// 권한이 거부된 경우 (플로팅 경고)
if (permission === 'denied') {
    return (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="bg-[#111] border border-red-500/50 rounded-2xl p-5 shadow-2xl relative">
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-white p-1"
                >
                    ✕
                </button>
                <div className="flex items-start gap-4">
                    <div className="bg-red-500/20 p-3 rounded-full">
                        <BellOff className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-white mb-1 text-lg">알림이 차단됨</h4>
                        <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                            브라우저 주소창 옆 🔒자물쇠를 눌러<br />
                            <span className="text-red-300 font-bold">알림 권한을 허용</span>해주세요.
                        </p>
                        <div className="text-xs text-gray-500 bg-white/5 p-2 rounded">
                            * 새로고침 필요
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 기본: 알림 요청 플로팅 위젯
return (
    <>
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="bg-[#111] border-2 border-blue-500/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-blue-400 transition-colors">
                {/* Background Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 z-10"
                >
                    ✕
                </button>

                <div className="flex items-start gap-4 z-10 relative">
                    <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <Bell className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-white mb-1 text-lg flex items-center gap-2">
                            실시간 매수 신호
                            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">LIVE</span>
                        </h4>
                        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                            AI가 포착한 <span className="text-blue-300 font-bold">급등 예상 종목</span>을<br />
                            즉시 알려드립니다.
                        </p>

                        <button
                            onClick={handleEnableNotifications}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 active:scale-95"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    연결 중...
                                </>
                            ) : (
                                <>
                                    🔔 알림 켜기 (무료)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <BuySignalModal
            isOpen={!!buySignalData}
            onClose={() => setBuySignalData(null)}
            data={buySignalData}
        />
    </>
);
}
