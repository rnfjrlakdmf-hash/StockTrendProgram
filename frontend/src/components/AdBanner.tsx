"use client";

import { useEffect } from 'react';

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: 'auto' | 'fluid' | 'rectangle';
  dataFullWidthResponsive?: boolean;
}

export default function AdBanner({ 
  dataAdSlot, 
  dataAdFormat = 'auto', 
  dataFullWidthResponsive = true 
}: AdBannerProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className="w-full overflow-hidden my-6 bg-white/5 border border-dashed border-white/10 rounded-2xl p-2 min-h-[100px] flex items-center justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-9471404163603833"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive.toString()}
      />
      {/* 개발 환경에서 광고 위치를 확인하기 위한 레이블 (배포 시에는 보이지 않음) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">AD SLOT: {dataAdSlot}</span>
      </div>
    </div>
  );
}
