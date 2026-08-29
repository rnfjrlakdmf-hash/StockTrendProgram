"use client";

import { useEffect, useRef, useState } from "react";

interface KakaoRevenueAdProps {
  type?: "feed" | "banner" | "box" | "bottom";
  className?: string;
  autoRefreshInterval?: number; // 초 단위 자동 리프레시 (기본 60초)
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
  }
};

export default function KakaoRevenueAd({ 
  type = "feed", 
  className = "",
  autoRefreshInterval = 40 
}: KakaoRevenueAdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [isPC, setIsPC] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    const checkIsPC = () => window.innerWidth >= 768;
    setIsPC(checkIsPC());

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsPC(checkIsPC());
      }, 300);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // [수익 극대화] 사용자가 페이지를 보고 있을 때 60초마다 스마트 광고 리프레시 (노출수 3~4배 증가)
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval < 30) return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        setRefreshKey((prev) => prev + 1);
      }
    }, autoRefreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval]);

  useEffect(() => {
    if (isPC === null) return;

    const config = isPC ? AD_CONFIGS[type].pc : AD_CONFIGS[type].mobile;
    if (!config?.unit || config.unit === "DAN-PLACEHOLDER") return;

    const renderAd = () => {
      if (!adRef.current) return;
      adRef.current.innerHTML = "";

      const ins = document.createElement("ins");
      ins.className = "kakao_ad_area";
      ins.style.display = "none";
      ins.setAttribute("data-ad-unit", config.unit);
      ins.setAttribute("data-ad-width", config.width);
      ins.setAttribute("data-ad-height", config.height);

      const script = document.createElement("script");
      script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
      script.async = true;
      script.type = "text/javascript";
      script.charset = "utf-8";

      adRef.current.appendChild(ins);
      adRef.current.appendChild(script);
    };

    renderAd();
  }, [isPC, type, refreshKey]);

  const minHeight = type === "box" || (!isPC && type === "feed") ? "270px" : type === "bottom" && !isPC ? "500px" : "110px";

  return (
    <div className={`w-full flex flex-col items-center justify-center my-6 overflow-hidden ${className}`}>
      <div 
        className="relative flex flex-col items-center justify-center bg-zinc-950/40 border border-white/10 rounded-2xl p-2.5 shadow-sm transition-all duration-300 w-full max-w-4xl"
        style={{ minHeight }}
      >
        <div className="w-full flex items-center justify-between px-2 mb-1">
          <span className="text-[9px] font-bold text-gray-500 tracking-wider">ADVERTISEMENT</span>
          <span className="text-[8px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">스폰서십</span>
        </div>
        
        <div ref={adRef} className="flex items-center justify-center min-h-[50px] w-full" />
      </div>
    </div>
  );
}
