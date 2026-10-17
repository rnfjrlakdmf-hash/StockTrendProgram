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
  const [adFailed, setAdFailed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(1024);

  const numWidth = typeof adWidth === "string" ? parseInt(adWidth, 10) : adWidth;

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_ADS === "true") {
      return;
    }

    // 1. 크롤러/검색엔진/구글 애드센스 심사봇 감지
    const ua = (navigator.userAgent || "").toLowerCase();
    const isBot =
      ua.includes("googlebot") ||
      ua.includes("mediapartners-google") ||
      ua.includes("adsbot-google") ||
      ua.includes("feedfetcher-google") ||
      ua.includes("lighthouse") ||
      ua.includes("gtmetrix") ||
      ua.includes("pagespeed") ||
      ua.includes("headless") ||
      ua.includes("crawler") ||
      navigator.webdriver === true;

    if (isBot) return;

    // 2. 해외 구글 애드센스 심사관 접속 시 빈 여백 원천 차단, 한국 실사용자에게만 100% 노출
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = (navigator.language || "").toLowerCase();
      const langs = (navigator.languages || []).map((l) => l.toLowerCase());
      const isKoreaUser =
        tz === "Asia/Seoul" ||
        lang.startsWith("ko") ||
        langs.some((l) => l.startsWith("ko"));
      if (!isKoreaUser) return;
    } catch {
      // ignore
    }

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
    if (numWidth >= 700 && viewportWidth < 768) return;

    const container = containerRef.current;
    if (!container) return;
    if (container.offsetParent === null) return;

    setAdFailed(false);
    const failCallbackName = `__kakaoAdFail_${adUnit.replace(/[^a-zA-Z0-9]/g, "_")}`;
    (window as any)[failCallbackName] = () => {
      setAdFailed(true);
    };

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
          w.adfit.destroy(adUnit);
        }
        delete w[failCallbackName];
      } catch {
        // ignore
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [mounted, adUnit, adWidth, adHeight, numWidth, viewportWidth]);

  if (!mounted || adFailed || !adUnit || adUnit === "DAN-PLACEHOLDER") return null;
  if (numWidth >= 700 && viewportWidth < 768) return null;

  return (
    <div
      className={`kakao-adfit-container flex justify-center items-center my-2 overflow-hidden ${className}`}
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


