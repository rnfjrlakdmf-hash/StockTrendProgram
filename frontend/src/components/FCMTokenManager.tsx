/**
 * FCM Token Manager Component
 * 푸시 알림 활성화 및 토큰 등록
 */

"use client";

import { useEffect, useState } from "react";
import { requestFCMToken, onForegroundMessage, getNotificationPermission, showNotification } from "@/lib/firebase";
import { API_BASE_URL } from "@/lib/config";
import { Bell, BellOff, Check } from "lucide-react";

export default function FCMTokenManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [registered, setRegistered] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // 현재 권한 상태 확인
        setPermission(getNotificationPermission());

        // 로컬 스토리지에서 등록 상태 확인
        const isRegistered = localStorage.getItem('fcm_registered') === 'true';
        setRegistered(isRegistered);

        // 포그라운드 메시지 리스너
        onForegroundMessage((payload) => {
            console.log('[FCM] Received foreground message:', payload);

            // 커스텀 알림 표시
            const title = payload.notification?.title || '새 알림';
            const body = payload.notification?.body || '';

            showNotification(title, {
                body,
                data: payload.data
            });
        });
    }, []);

    const handleEnableNotifications = async () => {
        setLoading(true);

        try {
            // FCM 토큰 요청
            const token = await requestFCMToken();

            if (!token) {
                alert('❌ 알림 권한이 거부되었습니다.\n\n브라우저 설정에서 알림 권한을 허용해주세요.');
                setLoading(false);
                return;
            }

            // 서버에 토큰 등록
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

            const data = await res.json();

            if (data.status === 'success') {
                setRegistered(true);
                setPermission('granted');
                localStorage.setItem('fcm_registered', 'true');

                // 성공 알림
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

    // 이미 등록된 경우 표시하지 않음
    if (permission === 'granted' && registered) {
        return (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                        <h4 className="font-bold text-white">📱 푸시 알림 활성화됨</h4>
                        <p className="text-sm text-gray-300">
                            앱이 꺼져있어도 핸드폰과 워치로 알림을 받습니다.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 권한이 거부된 경우
    if (permission === 'denied') {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <BellOff className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-bold text-white mb-1">🔕 알림이 차단되었습니다</h4>
                        <p className="text-sm text-gray-300 mb-2">
                            브라우저 설정에서 알림 권한을 허용해주세요.
                        </p>
                        <p className="text-xs text-gray-400">
                            Chrome: 주소창 왼쪽 자물쇠 아이콘 → 알림 → 허용
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 등록 안 된 경우 - 활성화 버튼 표시
    return (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">📱 핸드폰 알림 받기</h4>
                    <p className="text-sm text-gray-300 mb-3">
                        앱이 꺼져있어도 핸드폰과 워치로 가격 알림을 받을 수 있습니다.
                    </p>
                    <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            손절/익절 조건 도달 시 즉시 알림
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            회의 중, 업무 중에도 놓치지 않음
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            워치에도 자동 전달
                        </div>
                    </div>
                    <button
                        onClick={handleEnableNotifications}
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                설정 중...
                            </>
                        ) : (
                            <>
                                <Bell className="w-4 h-4" />
                                알림 활성화
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
