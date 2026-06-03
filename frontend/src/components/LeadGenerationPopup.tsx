"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { BellRing, X, ArrowRight, ShieldCheck } from "lucide-react";
import { getToken } from "firebase/messaging";
import { app } from "@/lib/firebase";

export default function LeadGenerationPopup() {
    const { user } = useAuth();
    const [showPopup, setShowPopup] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // 이미 팝업을 본 유저이거나 구독자라면 무시
        if (localStorage.getItem("leadPopupDismissed") || localStorage.getItem("pushSubscribed")) {
            return;
        }

        // 사용자의 페이지 방문 횟수 또는 중요 액션 횟수 트래킹
        let actionCount = parseInt(localStorage.getItem("userActionCount") || "0", 10);
        actionCount += 1;
        localStorage.setItem("userActionCount", actionCount.toString());

        // 3번 이상 액션(페이지 뷰 등)을 한 경우에만 팝업 표시
        if (actionCount >= 3 && !user) {
            const timer = setTimeout(() => {
                setShowPopup(true);
            }, 5000); // 페이지 진입 5초 후
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleDismiss = () => {
        setShowPopup(false);
        // 팝업을 닫으면 7일간 다시 띄우지 않음 (여기서는 간단히 영구 무시로 처리)
        localStorage.setItem("leadPopupDismissed", "true");
    };

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            if (typeof window !== "undefined" && "Notification" in window) {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    // Firebase Messaging 토큰 가져오기 시도
                    const { getMessaging } = await import("firebase/messaging");
                    const messaging = getMessaging(app);
                    const token = await getToken(messaging, {
                        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                    });
                    if (token) {
                        localStorage.setItem("pushSubscribed", "true");
                        alert("구독이 완료되었습니다! 매일 아침 유망 종목 리포트를 보내드릴게요.");
                        setShowPopup(false);
                    }
                } else {
                    alert("알림 권한이 차단되었습니다. 브라우저 설정에서 알림을 허용해주세요.");
                }
            }
        } catch (error) {
            console.error("Subscription error:", error);
            alert("알림 설정 중 오류가 발생했습니다. 로그인을 먼저 진행해주세요.");
        } finally {
            setLoading(false);
        }
    };

    if (!showPopup) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-b from-blue-900 to-black border border-blue-500/30 rounded-3xl max-w-sm w-full p-6 relative shadow-2xl overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full" />
                
                <button 
                    onClick={handleDismiss}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center relative z-10 mt-2">
                    <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
                        <BellRing className="w-8 h-8 text-blue-400 animate-pulse" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white mb-2">
                        종목 분석이 유용하신가요?
                    </h3>
                    
                    <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                        상위 1% 투자자들은 <strong className="text-white">매일 아침 8시</strong>에 AI가 분석한 당일 핵심 주도주 리포트를 미리 받고 있습니다.
                    </p>

                    <button
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 shadow-lg shadow-blue-600/30 mb-4"
                    >
                        {loading ? "처리중..." : (
                            <>
                                지금 바로 무료 구독하기
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                    
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        <span>스팸 발송 없음 • 언제든 해지 가능</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
