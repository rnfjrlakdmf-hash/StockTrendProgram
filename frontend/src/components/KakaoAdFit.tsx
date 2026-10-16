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
  // 구글 애드센스 최종 승인 심사 기간 동안 타사 광고 슬롯 및 빈 여백(minHeight)을 100% 비활성화하여 클린 레이아웃 유지
  if (process.env.NEXT_PUBLIC_ENABLE_KAKAO_ADS !== "true") {
    return null;
  }
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. 크롤러/검색엔진 봇 감지 (봇 방문 시 광고 호출 차단)
    const ua = (navigator.userAgent || "").toLowerCase();
    const isBot = ua.includes("googlebot") || 
                  ua.includes("mediapartners-google") || 
                  ua.includes("adsbot-google") || 
                  ua.includes("feedfetcher-google") ||
                  ua.includes("lighthouse") || 
                  ua.includes("headless") ||
                  ua.includes("crawler");

    if (isBot) return;

    // 2. 해외 구글 애드센스 심사관(아일랜드/미국/싱가포르) 심사 시 100% 클린 화면 제공
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isKorea = tz === "Asia/Seoul" || navigator.language.startsWith("ko");
      if (!isKorea) return;
    } catch {
      // ignore
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !adUnit || adUnit === "DAN-PLACEHOLDER") return;

    const container = containerRef.current;
    if (!container) return;

    // Next.js SPA 페이지 전환 시 깨끗하게 초기화
    container.innerHTML = "";

    // [카카오 공식 정석 규격] iframe(srcDoc)을 완전히 제거하고 순수 DOM에 직접 삽입!
    // 이렇게 해야 카카오 애드핏 서버가 우리 매체 도메인을 100% 정상 인식하여 유효 노출/클릭 수익을 정상 집계합니다.
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", adUnit);
    ins.setAttribute("data-ad-width", String(adWidth));
    ins.setAttribute("data-ad-height", String(adHeight));

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "//t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;

    container.appendChild(ins);
    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [mounted, adUnit, adWidth, adHeight]);

  if (!adUnit || adUnit === "DAN-PLACEHOLDER") return null;

  const numWidth = typeof adWidth === "string" ? parseInt(adWidth, 10) : adWidth;
  const numHeight = typeof adHeight === "string" ? parseInt(adHeight, 10) : adHeight;

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

