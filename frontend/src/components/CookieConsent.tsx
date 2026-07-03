"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem("cookieConsent");
    if (!hasConsented) {
      // Delay showing the banner slightly for better UX
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "true");
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[1000] p-4 animate-in slide-in-from-bottom-full duration-500 pb-20 sm:pb-4 pointer-events-none">
      <div className="max-w-3xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-gray-300 text-sm leading-relaxed">
            🍪 본 웹사이트는 원활한 서비스 제공과 맞춤형 광고(Google AdSense 등) 송출을 위해 쿠키를 사용합니다. 
            사이트를 계속 이용하시면 쿠키 사용에 동의한 것으로 간주됩니다. 자세한 내용은{" "}
            <Link href="/privacy-policy" className="text-blue-400 hover:underline font-bold">
              개인정보처리방침
            </Link>
            을 확인해 주세요.
          </p>
        </div>
        <button
          onClick={acceptCookies}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
        >
          확인 및 동의
        </button>
      </div>
    </div>
  );
}
