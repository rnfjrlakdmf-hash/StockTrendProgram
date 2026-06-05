"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

export default function DisclosureRedirectPage() {
  const searchParams = useSearchParams();
  const targetUrl = searchParams.get("url");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!targetUrl) return;

    // 2초 카운트다운 후 실제 공시 페이지로 자동 이동
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.replace(targetUrl);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetUrl]);

  if (!targetUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e17] text-white">
        <p className="text-gray-400">잘못된 접근입니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e17] text-white p-4">
      <div className="max-w-md w-full bg-[#151c2c] rounded-2xl p-8 border border-gray-800 flex flex-col items-center text-center shadow-2xl">
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <Image src="/logo.png" alt="STOCK AI" width={40} height={40} className="rounded-full" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">STOCK AI 공시 분석</h2>
        <p className="text-gray-400 mb-8 text-sm">
          안전하게 원문 서버(SEC/DART)로 연결 중입니다...<br />
          잠시만 기다려주세요.
        </p>

        <div className="w-full bg-gray-800 rounded-full h-2 mb-4 overflow-hidden">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(1 - (countdown / 5)) * 100}%` }}
          ></div>
        </div>
        
        <p className="text-xs text-gray-500 animate-pulse">
          {countdown}초 후 자동으로 이동합니다
        </p>
      </div>
    </div>
  );
}
