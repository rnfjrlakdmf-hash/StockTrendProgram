"use client";

import { Bell } from "lucide-react";

export default function DebugBanner() {
    return (
        <div className="bg-blue-600 text-white text-center py-2 px-4 font-bold relative z-[99999] flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4" />
                알림이 안 보이시나요? 여기서 켜주세요! (v1.5)
            </span>
            <button
                onClick={() => {
                    const permission = Notification.permission;
                    if (permission === 'denied') {
                        alert('알림이 차단되어 있습니다. 주소창 자물쇠 버튼을 눌러 허용해주세요.');
                    } else {
                        // Trigger FCM Manager logic via event
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('OPEN_FCM_REQUEST'));
                        }
                    }
                }}
                className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-100 transition-colors"
            >
                알림 켜기
            </button>
        </div>
    );
}
