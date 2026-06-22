"use client";

import { useEffect, useRef } from 'react';

interface KakaoAdFitProps {
  adUnit: string;
  adWidth: string;
  adHeight: string;
}

export default function KakaoAdFit({ adUnit, adWidth, adHeight }: KakaoAdFitProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [adUnit, adWidth, adHeight]);

  return (
    <div className="w-full flex justify-center my-4 overflow-hidden">
      <div 
        ref={adRef} 
        className="relative bg-gray-500/5 rounded-xl flex items-center justify-center border border-gray-500/10"
        style={{ minWidth: `${adWidth}px`, minHeight: `${adHeight}px` }}
      >
        {(!adUnit || adUnit === "DAN-PLACEHOLDER") && (
          <div className="flex flex-col items-center p-4">
            <span className="text-xs text-gray-500 font-medium">카카오 애드핏 광고 영역</span>
            <span className="text-[10px] text-gray-400">page.tsx 파일에서 DAN-XXXXXX ID를 입력해주세요</span>
          </div>
        )}
      </div>
    </div>
  );
}
