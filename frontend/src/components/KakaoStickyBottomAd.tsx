"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function KakaoStickyBottomAd() {
  const [closed, setClosed] = useState(false);
  const [isPC, setIsPC] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const adRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 로그인, 관리자 페이지에서는 숨김
  const isHiddenPage = pathname?.startsWith('/admin') || pathname?.startsWith('/login') || pathname?.startsWith('/widget');

  useEffect(() => {
    const checkIsPC = () => window.innerWidth >= 768;
    setIsPC(checkIsPC());

    const handleResize = () => setIsPC(checkIsPC());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 30초마다 스마트 자동 새로고침 (뷰어블 인뷰율 99% 영역)
  useEffect(() => {
    if (closed || isHiddenPage) return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        setRefreshKey((prev) => prev + 1);
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [closed, isHiddenPage]);

  // 카카오 애드핏 배너 렌더링 (모바일: 320x50 또는 320x100 / PC: 728x90)
  useEffect(() => {
    if (isPC === null || closed || isHiddenPage) return;

    const unit = isPC ? "DAN-eeR4RhnpmQaeIlYm" : "DAN-8TxTsrWjI6Q4SOt0";
    const width = isPC ? "728" : "320";
    const height = isPC ? "90" : "50";

    const renderAd = () => {
      if (!adRef.current) return;
      adRef.current.innerHTML = "";

      const ins = document.createElement("ins");
      ins.className = "kakao_ad_area";
      ins.style.display = "none";
      ins.setAttribute("data-ad-unit", unit);
      ins.setAttribute("data-ad-width", width);
      ins.setAttribute("data-ad-height", height);

      const script = document.createElement("script");
      script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
      script.async = true;
      script.type = "text/javascript";
      script.charset = "utf-8";

      adRef.current.appendChild(ins);
      adRef.current.appendChild(script);
    };

    renderAd();
  }, [isPC, closed, refreshKey, isHiddenPage]);

  if (closed || isHiddenPage) return null;

  return (
    <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-40 flex justify-center items-center bg-zinc-950/95 backdrop-blur-md border-t border-white/10 py-1 px-3 shadow-2xl transition-all animate-in slide-in-from-bottom duration-300">
      <div className="relative flex items-center justify-center w-full max-w-4xl">
        <div ref={adRef} className="flex items-center justify-center min-h-[50px]" />
        
        {/* 닫기 버튼 */}
        <button
          onClick={() => setClosed(true)}
          className="absolute -top-3 right-1 md:top-2 md:right-2 p-1 rounded-full bg-zinc-800/90 text-gray-400 hover:text-white border border-white/10 shadow-md transition-all text-xs"
          title="광고 닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
