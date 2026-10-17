"use client";

import React, { useEffect, useRef, useState } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(1024);

  const numWidth = typeof adWidth === "string" ? parseInt(adWidth, 10) : adWidth;
  const numHeight = typeof adHeight === "string" ? parseInt(adHeight, 10) : adHeight;

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_ADS === "true") {
      return;
    }

    // 크롤러/검색엔진 봇 감지 (봇 방문 시에만 광고 호출 차단, 실사용자 100% 노출)
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

    setViewportWidth(window.innerWidth);
    setMounted(true);

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setViewportWidth(window.innerWidth), 250);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!mounted || !adUnit || adUnit === "DAN-PLACEHOLDER") return;

    // 모바일 화면(<768px)에서 PC 전용 와이드 배너(728px)가 호출되거나,
    // 부모 래퍼가 hidden(display:none) 상태일 때 0x0 무효 노출이 발생하는 것을 원천 차단
    if (numWidth >= 700 && viewportWidth < 768) return;

    const container = containerRef.current;
    if (!container) return;
    if (container.offsetParent === null) return;

    try {
      const w = window as any;
      if (w.adfit && typeof w.adfit.destroy === "function") {
        w.adfit.destroy(adUnit);
      }
    } catch {
      // ignore
    }

    container.innerHTML = "";

    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", adUnit);
    ins.setAttribute("data-ad-width", String(adWidth));
    ins.setAttribute("data-ad-height", String(adHeight));

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
          w.adfit.destroy(adUnit);
        }
      } catch {
        // ignore
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [mounted, adUnit, adWidth, adHeight, numWidth, viewportWidth]);

  if (!mounted || !adUnit || adUnit === "DAN-PLACEHOLDER") return null;
  if (numWidth >= 700 && viewportWidth < 768) return null;

  return (
    <div
      className={`kakao-adfit-container flex justify-center items-center my-3 overflow-hidden ${className}`}
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


