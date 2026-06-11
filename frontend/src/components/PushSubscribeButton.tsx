"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { requestFCMToken, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function PushSubscribeButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 컴포넌트 마운트 시 로컬 스토리지 확인
  useEffect(() => {
    const subscribed = localStorage.getItem("push_subscribed") === "true";
    if (subscribed) {
      setIsSubscribed(true);
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");

      // 1. 브라우저 알림 권한 및 FCM 토큰 요청
      const token = await requestFCMToken();

      if (token) {
        // 2. Firestore에 토큰 저장
        await setDoc(doc(db, "fcm_tokens", token), {
          token: token,
          userAgent: navigator.userAgent,
          createdAt: serverTimestamp(),
          source: "blog_bottom_button"
        });

        // 3. 로컬 스토리지에 상태 저장
        localStorage.setItem("push_subscribed", "true");
        setIsSubscribed(true);
      }
    } catch (error: any) {
      console.error("Push subscription error:", error);
      if (error.message === 'PERMISSION_DENIED') {
        setErrorMsg("알림 권한이 차단되었습니다. 브라우저 설정에서 권한을 허용해주세요.");
      } else {
        setErrorMsg("알림 설정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-3">
          <BellRing className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">알림 구독 완료! 🎉</h3>
        <p className="text-sm text-gray-400 text-center">
          매일 아침 가장 중요한 시황 리포트가 완성되면 바로 알려드릴게요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-3">
        <Bell className="w-6 h-6 text-indigo-400 animate-bounce" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">매일 아침 시황 리포트 받아보기</h3>
      <p className="text-sm text-gray-400 text-center mb-4 max-w-sm">
        앱을 켜지 않아도, 시황 리포트가 작성되는 즉시 스마트폰과 PC로 가장 먼저 알림을 보내드립니다.
      </p>
      
      <button
        onClick={handleSubscribe}
        disabled={isLoading}
        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>설정 중...</span>
          </>
        ) : (
          <>
            <BellRing className="w-5 h-5" />
            <span>네, 알림을 받을게요</span>
          </>
        )}
      </button>

      {errorMsg && (
        <p className="mt-3 text-sm text-red-400 font-medium text-center">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
