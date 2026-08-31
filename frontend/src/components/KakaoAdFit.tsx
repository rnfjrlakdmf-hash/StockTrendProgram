"use client";

import { useEffect, useState } from 'react';

interface KakaoAdFitProps {
  adUnit: string;
  adWidth: string;
  adHeight: string;
  className?: string;
}

export default function KakaoAdFit({ adUnit, adWidth, adHeight, className = "" }: KakaoAdFitProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !adUnit || adUnit === "DAN-PLACEHOLDER") return null;

  const numWidth = parseInt(adWidth, 10) || 320;
  const numHeight = parseInt(adHeight, 10) || 50;

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
          data-ad-unit="${adUnit}"
          data-ad-width="${adWidth}"
          data-ad-height="${adHeight}"></ins>
        <script type="text/javascript" src="//t1.daumcdn.net/kas/static/ba.min.js" async></script>
      </body>
    </html>
  `;

  return (
    <div className={`flex items-center justify-center overflow-hidden my-2 ${className}`} style={{ width: numWidth, height: numHeight, maxWidth: "100%" }}>
      <iframe
        srcDoc={htmlContent}
        width={numWidth}
        height={numHeight}
        style={{ border: "none", overflow: "hidden", maxWidth: "100%" }}
        scrolling="no"
        title="Kakao AdFit"
      />
    </div>
  );
}
