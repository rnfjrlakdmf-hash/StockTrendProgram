"use client";

import { useEffect, useState } from "react";

interface KakaoRevenueAdProps {
  type?: "feed" | "banner" | "box" | "bottom" | "sticky";
  className?: string;
  autoRefreshInterval?: number;
}

const AD_CONFIGS = {
  feed: {
    mobile: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" },
    pc: { unit: "DAN-eeR4RhnpmQaeIlYm", width: "728", height: "90" },
  },
  banner: {
    mobile: { unit: "DAN-8TxTsrWjI6Q4SOt0", width: "320", height: "100" },
    pc: { unit: "DAN-eeR4RhnpmQaeIlYm", width: "728", height: "90" },
  },
  box: {
    mobile: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" },
    pc: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" },
  },
  bottom: {
    mobile: { unit: "DAN-8TxTsrWjI6Q4SOt0", width: "320", height: "100" },
    pc: { unit: "DAN-kfR4SXJubdA0vEcm", width: "728", height: "90" },
  },
  sticky: {
    mobile: { unit: "DAN-g3wzyZlZ4hBiYyRA", width: "320", height: "50" },
    pc: { unit: "DAN-eeR4RhnpmQaeIlYm", width: "728", height: "90" },
  },
};

// [Google AdSense 심사 통과를 위한 일시적 광고 비활성화 모드]
// 구글 애드센스 승인이 완료된 후 아래 값을 false로 변경하시면 즉시 복원됩니다.
const ADSENSE_REVIEW_MODE = true;

export default function KakaoRevenueAd({
  type = "banner",
  className = "",
}: KakaoRevenueAdProps) {
  if (ADSENSE_REVIEW_MODE) return null;
  const [isPC, setIsPC] = useState<boolean | null>(null);

  useEffect(() => {
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

  if (isPC === null) return null;

  const config = isPC ? AD_CONFIGS[type]?.pc : AD_CONFIGS[type]?.mobile;
  if (!config?.unit || config.unit === "DAN-PLACEHOLDER") return null;

  const numWidth = parseInt(config.width, 10);
  const numHeight = parseInt(config.height, 10);

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
          data-ad-unit="${config.unit}"
          data-ad-width="${config.width}"
          data-ad-height="${config.height}"></ins>
        <script type="text/javascript" src="https://t1.daumcdn.net/kas/static/ba.min.js" async></script>
      </body>
    </html>
  `;

  return (
    <div
      className={`kakao-revenue-ad-wrapper flex justify-center items-center my-4 overflow-hidden ${className}`}
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
        title={`Kakao AdFit ${type}`}
      />
    </div>
  );
}
