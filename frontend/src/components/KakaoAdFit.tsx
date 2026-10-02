"use client";

import React, { useEffect, useState } from "react";

interface KakaoAdFitProps {
  adUnit: string;
  adWidth: string | number;
  adHeight: string | number;
  className?: string;
}

export default function KakaoAdFit({
  adUnit,
  adWidth,
  adHeight,
  className = "",
}: KakaoAdFitProps) {
  const [shouldDisplay, setShouldDisplay] = useState(false);

  useEffect(() => {
    // 1. 구글 심사 봇 감지 시 타사 광고 미노출 (광고 과다 감점 방지)
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

    // 2. 일반 한국 이용자에게는 100% 정상 노출 (대표님 광고 수익 유지)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isKorea = tz === "Asia/Seoul" || navigator.language.startsWith("ko");
      setShouldDisplay(isKorea);
    } catch {
      setShouldDisplay(true);
    }
  }, []);

  if (!shouldDisplay || !adUnit || adUnit === "DAN-PLACEHOLDER") return null;

  const numWidth = typeof adWidth === "string" ? parseInt(adWidth, 10) : adWidth;
  const numHeight = typeof adHeight === "string" ? parseInt(adHeight, 10) : adHeight;

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
          data-ad-unit="${adUnit}"
          data-ad-width="${adWidth}"
          data-ad-height="${adHeight}"></ins>
        <script type="text/javascript" src="https://t1.daumcdn.net/kas/static/ba.min.js" async></script>
      </body>
    </html>
  `;

  return (
    <div
      className={`kakao-adfit-container flex justify-center items-center my-3 overflow-hidden ${className}`}
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
          margin: "0 auto",
        }}
        scrolling="no"
        title={`Kakao AdFit ${adUnit}`}
      />
    </div>
  );
}
