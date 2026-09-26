"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function KakaoStickyBottomAd() {
  // Google AdSense 승인 심사 기간 중 하단 고정 스티키 타사 광고 및 클로킹 오인 원천 차단
  return null;
}
/*

  useEffect(() => {
    const checkIsPC = () => window.innerWidth >= 768;
    setIsPC(checkIsPC());

    const handleResize = () => setIsPC(checkIsPC());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 24시간 닫기 여부 확인
  useEffect(() => {
    try {
      const hideUntil = localStorage.getItem("hide_sticky_ad_until");
      if (hideUntil && parseInt(hideUntil, 10) > Date.now()) {
        setClosed(true);
      }
    } catch (_) {}
  }, []);

  // 35초마다 스마트 자동 새로고침 (모바일 & PC 모두 활성화하여 노출수 극대화)
  useEffect(() => {
    if (closed || isHiddenPage || !shouldDisplay) return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        setRefreshKey((prev) => prev + 1);
      }
    }, 35000);

    return () => clearInterval(intervalId);
  }, [closed, isHiddenPage, shouldDisplay]);

  const handleClose = () => {
    setClosed(true);
    try {
      // 24시간 동안 다시 뜨지 않도록 저장
      localStorage.setItem("hide_sticky_ad_until", (Date.now() + 24 * 60 * 60 * 1000).toString());
    } catch (_) {}
  };

  // [모바일 UX 보호] 모바일 환경(!isPC)에서는 화면 밑부분 가림 및 이용 불편 방지를 위해 완전히 숨김
  if (!shouldDisplay || closed || isHiddenPage || isPC === null || !isPC) return null;

  // 모바일: 320x50 (DAN-b9cY6ogHFZTTD0Sl) / PC: 728x90 (DAN-eeR4RhnpmQaeIlYm)
  const unit = isPC ? "DAN-eeR4RhnpmQaeIlYm" : "DAN-b9cY6ogHFZTTD0Sl";
  const width = isPC ? "728" : "320";
  const height = isPC ? "90" : "50";
  const numWidth = parseInt(width, 10);
  const numHeight = parseInt(height, 10);

  const htmlContent = `
    <!DOCTYPE html>
    <html style="margin:0;padding:0;overflow:hidden;">
      <head>
        <meta charset="utf-8">
        <base href="https://stock-trend-program.co.kr/" target="_top">
        <meta name="referrer" content="always">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }
        </style>
      </head>
      <body>
        <ins class="kakao_ad_area" style="display:none;"
          data-ad-unit="${unit}"
          data-ad-width="${width}"
          data-ad-height="${height}"></ins>
        <script type="text/javascript" src="https://t1.daumcdn.net/kas/static/ba.min.js" async></script>
      </body>
    </html>
  `;

  return (
    <div className="fixed bottom-[54px] md:bottom-0 left-0 right-0 z-40 flex justify-center items-center bg-zinc-950/95 backdrop-blur-md border-t border-white/10 py-1 px-2 md:py-1.5 md:px-4 shadow-2xl transition-all animate-in slide-in-from-bottom duration-300">
      <div className="relative flex items-center justify-center w-full max-w-4xl">
        <iframe
          key={refreshKey}
          srcDoc={htmlContent}
          width={numWidth}
          height={numHeight}
          style={{ border: "none", overflow: "hidden", maxWidth: "100%", height: `${numHeight}px` }}
          scrolling="no"
          title="Kakao Sticky Ad"
        />
        
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-1/2 -translate-y-1/2 right-1 md:right-2 p-1 rounded-full bg-zinc-800/90 text-gray-400 hover:text-white border border-white/10 shadow-md transition-all text-xs cursor-pointer hover:bg-zinc-700"
          title="광고 24시간 닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
*/
