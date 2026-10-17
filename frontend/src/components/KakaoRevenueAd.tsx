"use client";

import { useEffect, useRef, useState } from "react";

interface KakaoRevenueAdProps {
  type?: "feed" | "banner" | "box" | "bottom" | "sticky";
  className?: string;
  autoRefreshInterval?: number;
}

// 슬롯 타입별로 고유한 DAN 유닛 ID를 배정하여 한 페이지 내 다중 배치 시 중복 충돌 원천 방지
const AD_CONFIGS = {
  banner: {
    mobile: { unit: "DAN-8TxTsrWjI6Q4SOt0", width: "320", height: "100" },
    pc: { unit: "DAN-eeR4RhnpmQaeIlYm", width: "728", height: "90" },
  },
  feed: {
    mobile: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" },
    pc: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" },
  },
  box: {
    mobile: { unit: "DAN-b9cY6ogHFZTTD0Sl", width: "320", height: "50" },
    pc: { unit: "DAN-4lZ2zEzbyDJ1Yva6", width: "300", height: "250" },
  },
  bottom: {
    mobile: { unit: "DAN-b946L75vYgFilyWy", width: "320", height: "480" },
    pc: { unit: "DAN-kfR4SXJubdA0vEcm", width: "728", height: "90" },
  },
  sticky: {
    mobile: { unit: "DAN-g3wzyZlZ4hBiYyRA", width: "320", height: "50" },
    pc: { unit: "DAN-kfR4SXJubdA0vEcm", width: "728", height: "90" },
  },
};

export default function KakaoRevenueAd({
  type = "banner",
  className = "",
}: KakaoRevenueAdProps) {
  const [isPC, setIsPC] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_ADS === "true") {
      return;
    }

    // 크롤러/검색엔진 봇 감지 (봇 방문 시에만 광고 호출 제외, 실제 유저에게는 100% 노출)
    const ua = (navigator.userAgent || "").toLowerCase();
    const isBot =
      ua.includes("googlebot") ||
      ua.includes("mediapartners-google") ||
      ua.includes("adsbot-google") ||
      ua.includes("feedfetcher-google") ||
      ua.includes("lighthouse") ||
      ua.includes("headless") ||
      ua.includes("crawler");

    if (isBot) return;

    const checkIsPC = () => window.innerWidth >= 768;
    setIsPC(checkIsPC());
    setMounted(true);

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setIsPC(checkIsPC()), 250);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const config = isPC ? AD_CONFIGS[type]?.pc : AD_CONFIGS[type]?.mobile;

  useEffect(() => {
    if (!mounted || isPC === null || !config?.unit || config.unit === "DAN-PLACEHOLDER") return;

    const container = containerRef.current;
    if (!container) return;

    // 부모 요소가 display: none 상태인 경우 0x0 무효 노출 요청 방지
    if (container.offsetParent === null) return;

    const unitId = config.unit;

    // 이전 동일 유닛 잔여 상태 정리 (Next.js SPA 라우팅 시 광고 미노출 버그 해결)
    try {
      const w = window as any;
      if (w.adfit && typeof w.adfit.destroy === "function") {
        w.adfit.destroy(unitId);
      }
    } catch {
      // ignore
    }

    container.innerHTML = "";

    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", unitId);
    ins.setAttribute("data-ad-width", config.width);
    ins.setAttribute("data-ad-height", config.height);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;

    container.appendChild(ins);
    container.appendChild(script);

    return () => {
      try {
        const w = window as any;
        if (w.adfit && typeof w.adfit.destroy === "function") {
          w.adfit.destroy(unitId);
        }
      } catch {
        // ignore
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [mounted, isPC, config?.unit, config?.width, config?.height]);

  if (!mounted || isPC === null || !config?.unit || config.unit === "DAN-PLACEHOLDER") return null;

  const numWidth = parseInt(config.width, 10);
  const numHeight = parseInt(config.height, 10);

  return (
    <div
      className={`kakao-revenue-ad-wrapper flex justify-center items-center my-4 overflow-hidden ${className}`}
      style={{ minHeight: `${numHeight}px`, width: "100%" }}
    >
      <div
        ref={containerRef}
        style={{
          width: `${numWidth}px`,
          height: `${numHeight}px`,
          maxWidth: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      />
    </div>
  );
}


