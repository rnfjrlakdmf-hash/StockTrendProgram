"use client";

import { useEffect, useRef, useState } from 'react';

interface ResponsiveKakaoAdProps {
  mobileAdUnit: string;
  mobileAdWidth: string;
  mobileAdHeight: string;
  pcAdUnit: string;
  pcAdWidth: string;
  pcAdHeight: string;
}

export default function ResponsiveKakaoAd({ 
  mobileAdUnit, mobileAdWidth, mobileAdHeight,
  pcAdUnit, pcAdWidth, pcAdHeight
}: ResponsiveKakaoAdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [isPC, setIsPC] = useState<boolean | null>(null);

  useEffect(() => {
    // 클라이언트 마운트 시 기기 감지
    const checkIsPC = () => window.innerWidth >= 768;
    setIsPC(checkIsPC());

    const handleResize = () => {
      // 리사이즈 시마다 광고를 다시 그리면 클릭률이 깎일 수 있으므로 
      // 최초 렌더링 시의 화면 사이즈 기준으로만 고정하거나, 디바이스 타입이 바뀔 때만 리렌더링
      const currentIsPC = checkIsPC();
      if (isPC !== null && currentIsPC !== isPC) {
        // window를 늘리거나 줄일 때 분기점이 바뀌면 새로고침 유도하는게 낫지만, 
        // 광고 스크립트 특성상 그냥 두는게 나을 수 있음. 일단 상태만 변경.
        setIsPC(currentIsPC);
      }
    };
    
    // Resize 이벤트는 생략하거나 debounce 처리하는 것이 좋음. 여기서는 모바일/PC 분기점만 체크
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPC]);

  useEffect(() => {
    if (isPC === null) return; // 아직 감지 안됨

    const adUnit = isPC ? pcAdUnit : mobileAdUnit;
    const adWidth = isPC ? pcAdWidth : mobileAdWidth;
    const adHeight = isPC ? pcAdHeight : mobileAdHeight;

    if (!adUnit || adUnit === "DAN-PLACEHOLDER") return;

    const renderAd = () => {
      if (!adRef.current) return;
      adRef.current.innerHTML = "";

      const ins = document.createElement("ins");
      ins.className = "kakao_ad_area";
      ins.setAttribute("data-ad-unit", adUnit);
      ins.setAttribute("data-ad-width", adWidth);
      ins.setAttribute("data-ad-height", adHeight);

      const script = document.createElement("script");
      script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
      script.async = true;
      script.type = "text/javascript";
      script.charset = "utf-8";

      adRef.current.appendChild(ins);
      adRef.current.appendChild(script);
    };

    renderAd();
  }, [isPC, mobileAdUnit, pcAdUnit, mobileAdWidth, pcAdWidth, mobileAdHeight, pcAdHeight]);

  if (isPC === null) {
    // 하이드레이션 에러 및 레이아웃 시프트 방지
    return <div className="w-full flex justify-center my-4 h-[250px]" />;
  }

  return (
    <div className="w-full flex justify-center my-4 overflow-hidden">
      <div 
        ref={adRef} 
        className="relative flex items-center justify-center rounded-xl"
      >
      </div>
    </div>
  );
}
