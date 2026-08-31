"use client";

import { useEffect, useRef, useState } from "react";

interface KakaoRevenueAdProps {
  type?: "feed" | "banner" | "box" | "bottom" | "sticky";
  className?: string;
  autoRefreshInterval?: number; // 초 단위 스마트 리프레시 (기본 35초)
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
    if (!autoRefreshInterval || autoRefreshInterval < 25) return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden && isVisible) {
        setRefreshKey((prev) => prev + 1);
      }
    }, autoRefreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, isVisible]);

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
    <div ref={containerRef} className={`w-full flex flex-col items-center justify-center my-4 overflow-hidden ${className}`}>
      <div 
        className="relative flex flex-col items-center justify-center bg-zinc-950/40 border border-white/10 rounded-2xl p-2 shadow-sm transition-all duration-300 w-full max-w-4xl overflow-hidden"
      >
        <div className="w-full flex items-center justify-between px-2 mb-1">
          <span className="text-[9px] font-bold text-gray-500 tracking-wider">SPONSORED</span>
          <span className="text-[8px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">카카오 애드핏</span>
        </div>
        
        <div className="flex items-center justify-center overflow-hidden" style={{ width: numWidth, height: numHeight, maxWidth: "100%" }}>
          <iframe
            key={refreshKey}
            srcDoc={htmlContent}
            width={numWidth}
            height={numHeight}
            style={{ border: "none", overflow: "hidden", maxWidth: "100%" }}
            scrolling="no"
            title={`Kakao Ad ${type}`}
          />
        </div>
      </div>
    </div>
  );
}
