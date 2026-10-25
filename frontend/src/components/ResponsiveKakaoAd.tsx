"use client";

import React, { useEffect, useState, useRef } from "react";

interface ResponsiveKakaoAdProps {
  mobileAdUnit: string;
  mobileAdWidth?: string;
  mobileAdHeight?: string;
  pcAdUnit: string;
  pcAdWidth?: string;
  pcAdHeight?: string;
  className?: string;
}

export default function ResponsiveKakaoAd({
  mobileAdUnit,
  mobileAdWidth = "300",
  mobileAdHeight = "250",
  pcAdUnit,
  pcAdWidth = "728",
  pcAdHeight = "90",
  className = "",
}: ResponsiveKakaoAdProps) {
  const [isPC, setIsPC] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [adFailed, setAdFailed] = useState<boolean>(false);
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

  const currentUnit = isPC ? pcAdUnit : mobileAdUnit;
  const currentWidth = isPC ? pcAdWidth : mobileAdWidth;
  const currentHeight = isPC ? pcAdHeight : mobileAdHeight;

  useEffect(() => {
    if (!mounted || isPC === null || !currentUnit || currentUnit === "DAN-PLACEHOLDER") return;

    const container = containerRef.current;
    if (!container) return;
    if (container.offsetParent === null) return;

    setAdFailed(false);
    const failCallbackName = `__kakaoAdFail_${currentUnit.replace(/[^a-zA-Z0-9]/g, "_")}`;
    (window as any)[failCallbackName] = () => {
      setAdFailed(true);
    };

    try {
      const w = window as any;
      if (w.adfit && typeof w.adfit.destroy === "function") {
        w.adfit.destroy(currentUnit);
      }
    } catch {
      // ignore
    }

    container.innerHTML = "";

    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", currentUnit);
    ins.setAttribute("data-ad-width", String(currentWidth));
    ins.setAttribute("data-ad-height", String(currentHeight));
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
          w.adfit.destroy(currentUnit);
        }
        delete w[failCallbackName];
      } catch {
        // ignore
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [mounted, isPC, currentUnit, currentWidth, currentHeight]);

  if (!mounted || isPC === null || adFailed || !currentUnit || currentUnit === "DAN-PLACEHOLDER") {
    return null;
  }

  const numWidth = parseInt(currentWidth, 10);

  return (
    <div
      className={`responsive-kakao-ad-wrapper flex justify-center items-center my-2 overflow-hidden ${className}`}
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
