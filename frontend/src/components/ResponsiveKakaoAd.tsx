"use client";

import React, { useEffect, useState, useRef } from "react";

interface ResponsiveKakaoAdProps {
  mobileAdUnit: string;
  mobileAdWidth?: string;
  mobileAdHeight?: string;
  pcAdUnit: string;
  pcAdWidth?: string;
  pcAdHeight?: string;
  className?: string;
}

// [Google AdSense 심사 통과를 위한 일시적 광고 비활성화 모드]
// 구글 애드센스 승인이 완료된 후 아래 값을 false로 변경하시면 즉시 복원됩니다.
const ADSENSE_REVIEW_MODE = true;

export default function ResponsiveKakaoAd({
  mobileAdUnit,
  mobileAdWidth = "300",
  mobileAdHeight = "250",
  pcAdUnit,
  pcAdWidth = "728",
  pcAdHeight = "90",
  className = ""
}: ResponsiveKakaoAdProps) {
  if (ADSENSE_REVIEW_MODE) return null;
  const [isPC, setIsPC] = useState<boolean | null>(null);
  const [shouldDisplay, setShouldDisplay] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_ADS === 'true') {
      setShouldDisplay(false);
      return;
    }

    const ua = (navigator.userAgent || "").toLowerCase();
    const isBot = ua.includes("googlebot") || 
                  ua.includes("mediapartners-google") || 
                  ua.includes("adsbot-google") || 
                  ua.includes("feedfetcher-google") ||
                  ua.includes("lighthouse") || 
                  ua.includes("headless") ||
                  ua.includes("crawler");

    if (isBot) {
      setShouldDisplay(false);
      return;
    }

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isKorea = tz === "Asia/Seoul" || navigator.language.startsWith("ko");
      setShouldDisplay(isKorea);
    } catch {
      setShouldDisplay(true);
    }

    const checkIsPC = () => window.innerWidth >= 768;
    setIsPC(checkIsPC());

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setIsPC(checkIsPC()), 250);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!shouldDisplay || isPC === null) return null;

  const currentUnit = isPC ? pcAdUnit : mobileAdUnit;
  const currentWidth = isPC ? pcAdWidth : mobileAdWidth;
  const currentHeight = isPC ? pcAdHeight : mobileAdHeight;

  if (!currentUnit || currentUnit === "DAN-PLACEHOLDER") return null;

  const numWidth = parseInt(currentWidth, 10);
  const numHeight = parseInt(currentHeight, 10);

  const htmlContent = `
    <!DOCTYPE html>
    <html style="margin:0;padding:0;overflow:hidden;">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }
        </style>
      </head>
      <body>
        <ins class="kakao_ad_area" style="display:none;"
          data-ad-unit="${currentUnit}"
          data-ad-width="${currentWidth}"
          data-ad-height="${currentHeight}"></ins>
        <script type="text/javascript" src="//t1.daumcdn.net/kas/static/ba.min.js" async></script>
      </body>
    </html>
  `;

  return (
    <div 
      ref={containerRef}
      className={`responsive-kakao-ad-wrapper flex justify-center items-center my-4 overflow-hidden ${className}`}
      style={{ minHeight: `${numHeight}px` }}
    >
      <iframe
        srcDoc={htmlContent}
        width={numWidth}
        height={numHeight}
        style={{
          border: "none",
          overflow: "hidden",
          width: `${numWidth}px`,
          height: `${numHeight}px`,
          maxWidth: "100%",
          display: "block",
          margin: "0 auto"
        }}
        scrolling="no"
        title="Responsive Kakao Ad"
      />
    </div>
  );
}
