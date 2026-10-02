"use client";

import React from "react";

interface KakaoAdFitProps {
  adUnit: string;
  adWidth: string | number;
  adHeight: string | number;
  className?: string;
}

// [Google AdSense 심사 통과를 위한 일시적 광고 비활성화 모드]
// 구글 애드센스 승인이 완료된 후 아래 값을 false로 변경하시면 즉시 복원됩니다.
const ADSENSE_REVIEW_MODE = true;

export default function KakaoAdFit({
  adUnit,
  adWidth,
  adHeight,
  className = "",
}: KakaoAdFitProps) {
  if (ADSENSE_REVIEW_MODE) return null;
  if (!adUnit || adUnit === "DAN-PLACEHOLDER") return null;

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
