"use client";

import KakaoAdFit from "./KakaoAdFit";

export default function KakaoRevenueAd() {
  return (
    <div className="w-full flex flex-col items-center justify-center my-6 py-4 bg-gray-900/30 border border-gray-800 rounded-2xl backdrop-blur-sm">
      <div className="text-xs text-gray-500 mb-2 font-medium tracking-wider">Advertisement</div>
      <KakaoAdFit 
        adUnit="DAN-9AY61GpEFRB3dsZM" 
        adWidth="320" 
        adHeight="50" 
      />
    </div>
  );
}
