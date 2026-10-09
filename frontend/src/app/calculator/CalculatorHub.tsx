"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calculator, DollarSign, Sparkles, AlertTriangle, Coffee, TrendingUp } from "lucide-react";
import CalculatorClient from "./CalculatorClient";
import DividendCalculator from "@/components/DividendCalculator";
import KakaoRevenueAd from "@/components/KakaoRevenueAd";

export default function CalculatorHub() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialTab = searchParams.get("tab") === "dividend" ? "dividend" : "averaging";
  const [activeTab, setActiveTab] = useState<"averaging" | "dividend">(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "dividend" && activeTab !== "dividend") {
      setActiveTab("dividend");
    } else if (tabParam === "averaging" && activeTab !== "averaging") {
      setActiveTab("averaging");
    }
  }, [searchParams]);

  const handleTabChange = (tab: "averaging" | "dividend") => {
    setActiveTab(tab);
    router.replace(`/calculator?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* 계산기 탭 전환 헤더 */}
      <div className="flex items-center justify-center p-1.5 rounded-2xl bg-zinc-900/90 border border-white/10 max-w-md mx-auto shadow-xl">
        <button
          type="button"
          onClick={() => handleTabChange("averaging")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === "averaging"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span>🚨</span>
          <span>물타기 평단가</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("dividend")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 relative ${
            activeTab === "dividend"
              ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-500/25"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span>💰</span>
          <span>배당금 &amp; 월배당</span>
          <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black tracking-tight animate-bounce">
            HOT
          </span>
        </button>
      </div>

      {/* 탭별 설명 배너 */}
      <div className="text-center space-y-1">
        {activeTab === "averaging" ? (
          <>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-2">
              <span>🚨</span>
              <span>추가 매수 시 평단가 인하 &amp; 구조대 탈출 시뮬레이터</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              현재 물려있는 주가와 추가 매수 자금을 입력하여 원금 회복에 필요한 상승률을 계산합니다.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-2">
              <span>💰</span>
              <span>국내·미국 주식 배당금 &amp; 제2의 월급 캐시플로우 계산기</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              삼성전자, 맥쿼리인프라, SCHD, JEPI 등 인기 배당주의 세후 실수령액과 ISA 절세 효과를 산출합니다.
            </p>
          </>
        )}
      </div>

      {/* 계산기 본문 */}
      <div>
        {activeTab === "averaging" ? (
          <CalculatorClient />
        ) : (
          <DividendCalculator />
        )}
      </div>

      {/* 계산기 하단 정식 광고 배치 (체류 시간 동안 노출) */}
      <div className="pt-4">
        <KakaoRevenueAd type="banner" />
      </div>
    </div>
  );
}
