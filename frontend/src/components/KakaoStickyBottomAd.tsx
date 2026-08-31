"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function KakaoStickyBottomAd() {
  const [closed, setClosed] = useState(false);
  const [isPC, setIsPC] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const pathname = usePathname();

  const isHiddenPage = pathname?.startsWith('/admin') || pathname?.startsWith('/login') || pathname?.startsWith('/widget');

  useEffect(() => {
    const checkIsPC = () => window.innerWidth >= 768;
    setIsPC(checkIsPC());

    const handleResize = () => setIsPC(checkIsPC());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 35초마다 스마트 자동 새로고침 (인뷰율 99% 영역)
  useEffect(() => {
    if (closed || isHiddenPage) return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        setRefreshKey((prev) => prev + 1);
      }
    }, 35000);

    return () => clearInterval(intervalId);
  }, [closed, isHiddenPage]);

  if (closed || isHiddenPage || isPC === null) return null;

  // 모바일: 320x50 (DAN-b9cY6ogHFZTTD0Sl) / PC: 728x90 (DAN-eeR4RhnpmQaeIlYm)
  const unit = isPC ? "DAN-eeR4RhnpmQaeIlYm" : "DAN-b9cY6ogHFZTTD0Sl";
  const width = isPC ? "728" : "320";
  const height = isPC ? "90" : "50";
  const numWidth = parseInt(width, 10);
  const numHeight = parseInt(height, 10);

  const htmlContent = `
    <!DOCTYPE html>
    <html style="margin:0;padding:0;overflow:hidden;">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }
        </style>
      </head>
      <body>
        <ins class="kakao_ad_area" style="display:none;"
          data-ad-unit="${unit}"
          data-ad-width="${width}"
          data-ad-height="${height}"></ins>
        <script type="text/javascript" src="//t1.daumcdn.net/kas/static/ba.min.js" async></script>
      </body>
    </html>
  `;

  return (
    <div className="fixed bottom-[58px] md:bottom-0 left-0 right-0 z-40 flex justify-center items-center bg-zinc-950/95 backdrop-blur-md border-t border-white/10 py-1 px-2 shadow-2xl transition-all animate-in slide-in-from-bottom duration-300">
      <div className="relative flex items-center justify-center w-full max-w-4xl">
        <iframe
          key={refreshKey}
          srcDoc={htmlContent}
          width={numWidth}
          height={numHeight}
          style={{ border: "none", overflow: "hidden", maxWidth: "100%" }}
          scrolling="no"
          title="Kakao Sticky Ad"
        />
        
        {/* 닫기 버튼 */}
        <button
          onClick={() => setClosed(true)}
          className="absolute -top-3 right-1 md:top-1.5 md:right-2 p-1 rounded-full bg-zinc-800 text-gray-400 hover:text-white border border-white/10 shadow-md transition-all text-xs"
          title="광고 닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
