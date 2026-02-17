"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

/**
 * 간단한 푸시 알림 테스트 컴포넌트
 * Firebase 없이 브라우저 기본 알림으로 테스트
 */
export default function SimplePushTest() {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof window !== 'undefined' && 'Notification' in window
            ? Notification.permission
            : 'default'
    );

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            alert('이 브라우저는 알림을 지원하지 않습니다.');
            return;
        }

        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'granted') {
            // 테스트 알림 발송
            new Notification('✅ 알림 테스트 성공!', {
                body: '푸시 알림이 정상적으로 작동합니다.\n가격 알림 조건 도달 시 이렇게 알림을 받게 됩니다.',
                icon: '/icon.png',
                badge: '/badge.png',
                tag: 'test-notification',
                requireInteraction: false
            });
        }
    };

    const sendTestAlert = () => {
        if (Notification.permission !== 'granted') {
            alert('먼저 알림 권한을 허용해주세요!');
            return;
        }

        // 가격 알림 시뮬레이션
        new Notification('🚨 손절 조건 도달!', {
            body: '삼성전자가 3.2% 하락했습니다.\n현재가: ₩48,400 (-₩1,600)',
            icon: '/icon.png',
            badge: '/badge.png',
            tag: 'price-alert',
            requireInteraction: true,
            vibrate: [200, 100, 200]
        } as any);

        // 3초 후 익절 알림
        setTimeout(() => {
            new Notification('🎉 익절 조건 도달!', {
                body: 'SK하이닉스가 5.3% 상승했습니다.\n현재가: ₩158,000 (+₩8,000)',
                icon: '/icon.png',
                badge: '/badge.png',
                tag: 'price-alert-2',
                requireInteraction: true
            });
        }, 3000);
    };

    return (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
                <Bell className="w-6 h-6 text-blue-400 mt-1" />
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                        📱 푸시 알림 테스트
                    </h3>
                    <p className="text-sm text-gray-300 mb-4">
                        Firebase 설정 전에 브라우저 알림이 작동하는지 테스트해보세요.
                    </p>

                    {permission === 'default' && (
                        <div className="space-y-3">
                            <p className="text-sm text-yellow-300">
                                ⚠️ 알림 권한이 필요합니다.
                            </p>
                            <button
                                onClick={requestPermission}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                                <Bell className="w-5 h-5" />
                                알림 권한 요청
                            </button>
                        </div>
                    )}

                    {permission === 'denied' && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                            <p className="text-red-300 text-sm mb-2">
                                ❌ 알림이 차단되었습니다.
                            </p>
                            <p className="text-xs text-gray-400">
                                브라우저 설정에서 알림 권한을 허용해주세요.
                                <br />
                                Chrome: 주소창 왼쪽 자물쇠 → 알림 → 허용
                            </p>
                        </div>
                    )}

                    {permission === 'granted' && (
                        <div className="space-y-3">
                            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                                <p className="text-green-300 text-sm">
                                    ✅ 알림 권한이 허용되었습니다!
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={sendTestAlert}
                                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
                                >
                                    🚨 가격 알림 테스트 (손절 + 익절)
                                </button>

                                <button
                                    onClick={() => {
                                        new Notification('🎯 목표가 도달!', {
                                            body: 'NVIDIA가 목표가 $150에 도달했습니다.\n현재가: $150.25 (+2.3%)',
                                            icon: '/icon.png',
                                            requireInteraction: true
                                        });
                                    }}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
                                >
                                    🎯 목표가 알림 테스트
                                </button>
                            </div>

                            <div className="mt-4 p-4 bg-white/5 rounded-lg">
                                <p className="text-xs text-gray-400 mb-2">
                                    💡 <strong>테스트 방법:</strong>
                                </p>
                                <ul className="text-xs text-gray-400 space-y-1 ml-4">
                                    <li>• 버튼 클릭 후 알림이 나타나는지 확인</li>
                                    <li>• 핸드폰에서도 테스트 가능 (모바일 브라우저)</li>
                                    <li>• 워치 연동 시 워치에서도 확인 가능</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
