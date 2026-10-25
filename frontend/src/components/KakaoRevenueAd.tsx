"use client";

import { useEffect, useRef, useState } from "react";

interface KakaoRevenueAdProps {
  type?: "feed" | "banner" | "box" | "bottom" | "sticky";
  className?: string;
  autoRefreshInterval?: number;
}

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
  const [adFailed, setAdFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_ADS === "true") {
      return;
    }

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

    try {
      const comp = window.getComputedStyle(container);
      if (comp.display === "none" || comp.visibility === "hidden") return;
    } catch {
      // ignore
    }

    const unitId = config.unit;
    setAdFailed(false);

    const failCallbackName = `__kakaoAdFail_${unitId.replace(/[^a-zA-Z0-9]/g, "_")}`;
    (window as any)[failCallbackName] = () => {
      setAdFailed(true);
    };

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
    ins.setAttribute("data-ad-onfail", failCallbackName);

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
        delete w[failCallbackName];
      } catch {
        // ignore
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [mounted, isPC, config?.unit, config?.width, config?.height]);

  if (!mounted || isPC === null || adFailed || !config?.unit || config.unit === "DAN-PLACEHOLDER") {
    return null;
  }

  const numWidth = parseInt(config.width, 10);

  return (
    <div
      className={`kakao-revenue-ad-wrapper flex justify-center items-center my-2 overflow-hidden ${className}`}
      style={{ width: "100%" }}
    >
      <div
        ref={containerRef}
        style={{
          width: `${numWidth}px`,
          maxWidth: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      />
    </div>
  );
}
