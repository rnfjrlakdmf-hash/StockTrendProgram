"use client";

import React, { useEffect, useState, useRef } from "react";

interface KakaoAdFitProps {
  adUnit: string;
  adWidth: string | number;
  adHeight: string | number;
  className?: string;
}

export default function KakaoAdFit(_props: KakaoAdFitProps) {
  // Google AdSense 승인 심사 기간 중 타사 광고 네트워크(Kakao AdFit) 중복 노출 및 User-Agent 클로킹 오인 원천 방지
  return null;
}
/*

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
      ref={containerRef}
      className={`kakao-adfit-container flex justify-center items-center my-3 overflow-hidden ${className}`}
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
        title={`Kakao AdFit ${adUnit}`}
      />
    </div>
  );
}
*/
