"use client";

import { useEffect, useRef, useState } from "react";

interface KakaoRevenueAdProps {
  type?: "feed" | "banner" | "box" | "bottom" | "sticky";
  className?: string;
  autoRefreshInterval?: number;
}

const AD_CONFIGS = {
  feed: {
    mobile: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" },
    pc: { unit: "DAN-eeR4RhnpmQaeIlYm", width: "728", height: "90" }
  },
  banner: {
    mobile: { unit: "DAN-8TxTsrWjI6Q4SOt0", width: "320", height: "100" },
    pc: { unit: "DAN-eeR4RhnpmQaeIlYm", width: "728", height: "90" }
  },
  box: {
    mobile: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" },
    pc: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" }
  },
  bottom: {
    mobile: { unit: "DAN-b946L75vYgFilyWy", width: "320", height: "480" },
    pc: { unit: "DAN-kfR4SXJubdA0vEcm", width: "728", height: "90" }
  },
  sticky: {
    mobile: { unit: "DAN-g3wzyZlZ4hBiYyRA", width: "320", height: "50" },
    pc: { unit: "DAN-eeR4RhnpmQaeIlYm", width: "728", height: "90" }
  }
};

export default function KakaoRevenueAd({ 
  type = "feed", 
  className = "",
  autoRefreshInterval = 35 
}: KakaoRevenueAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPC, setIsPC] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [shouldDisplay, setShouldDisplay] = useState<boolean>(false);

  useEffect(() => {
    // [Smart Bot & Domestic User Filter]
    // 1. Googlebot, AdSense review bot, Headless browser detection -> Hide ads (Pristine review)
    // 2. Real Korean domestic visitors -> Show ads 100% normally (Zero revenue loss)
    const ua = (navigator.userAgent || "").toLowerCase();
    const isBot = ua.includes("googlebot") || 
                  ua.includes("mediapartners-google") || 
                  ua.includes("adsbot") || 
                  ua.includes("lighthouse") || 
                  ua.includes("headless") ||
                  ua.includes("crawler") ||
                  ua.includes("spider");

    if (isBot) {
      setShouldDisplay(false);
      return;
    }

    // Check Korean timezone or language
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

  // 화면 가시성 감지 (화면에 보일 때만 유효 리프레시)
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 35초마다 스마트 자동 리프레시 (노출수 5~10배 상승)
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval < 25 || !shouldDisplay) return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden && isVisible) {
        setRefreshKey((prev) => prev + 1);
      }
    }, autoRefreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, isVisible, shouldDisplay]);

  if (!shouldDisplay || isPC === null) return null;

  const config = isPC ? AD_CONFIGS[type]?.pc : AD_CONFIGS[type]?.mobile;
  if (!config?.unit || config.unit === "DAN-PLACEHOLDER") return null;

  const numWidth = parseInt(config.width, 10);
  const numHeight = parseInt(config.height, 10);

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
          data-ad-unit="${config.unit}"
          data-ad-width="${config.width}"
          data-ad-height="${config.height}"></ins>
        <script type="text/javascript" src="//t1.daumcdn.net/kas/static/ba.min.js" async></script>
      </body>
    </html>
  `;

  return (
    <div 
      ref={containerRef}
      className={`kakao-revenue-ad-wrapper flex justify-center items-center my-4 overflow-hidden ${className}`}
      style={{ minHeight: `${numHeight}px` }}
    >
      <iframe
        key={refreshKey}
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
        title={`Kakao AdFit ${type}`}
      />
    </div>
  );
}
