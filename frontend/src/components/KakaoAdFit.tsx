"use client";

import React from "react";

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
