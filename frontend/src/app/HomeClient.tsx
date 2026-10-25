"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import LiveMarketHub from "@/components/LiveMarketHub";
import KakaoRevenueAd from "@/components/KakaoRevenueAd";
import MarketIndicators from "@/components/MarketIndicators";
import FearGreedSpeedometer from "@/components/FearGreedSpeedometer";
import { CalendarClock, ChevronRight, Newspaper, Flame } from "lucide-react";
import Link from "next/link";
import { useAuth, isAdminEmail } from "@/context/AuthContext";

export default function HomeClient() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  const handleSearch = async (term: string) => {
    if (!term) return;
    router.push(`/discovery?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="pb-6">
      <Header
        title="통합 마켓 대시보드"
        subtitle="실시간 글로벌 지수 · 수급 통계 · 금융 리서치 허브"
        onSearch={handleSearch}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-5 space-y-6">
        {/* 1. 상단 퀵 내비게이션 바 (깔끔한 1줄 정렬) */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/10 px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-black shrink-0">
              RESEARCH HUB
            </span>
            <p className="text-xs sm:text-sm text-gray-300 truncate">
              한국거래소(KRX)·금융감독원(DART)·미국 SEC 공시 기반 정량 수급 분석 및 금융 교육 플랫폼
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isAdmin && (
              <Link
                href="/ceo-office"
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-sm"
              >
                🏛️ 대표이사 집무실
              </Link>
            )}
            <Link
              href="/research"
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold transition-all"
            >
              📑 증권 리서치
            </Link>
            <Link
              href="/blog"
              className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all"
            >
              📰 마켓 칼럼
            </Link>
            <Link
              href="/theory"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all"
            >
              📘 차트 아카데미
            </Link>
            <Link
              href="/guide"
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all"
            >
              📚 금융 백과 (46선)
            </Link>
            <Link
              href="/calculator"
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold transition-all"
            >
              🧮 주식 계산기
            </Link>
          </div>
        </div>

        {/* 2. 핵심 마켓 상황판 2단 그리드: 좌측(공포·탐욕 지수) / 우측(실시간 시세 & 랭킹 허브) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <FearGreedSpeedometer />
          <LiveMarketHub />
        </div>

        {/* 3. 핵심 리포트 & 스캐너 바로가기 3단 카드 (정렬 통일) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/signals?tab=scanner"
            className="p-5 rounded-2xl bg-zinc-900/70 border border-blue-500/25 hover:border-blue-400/50 transition-all group flex flex-col justify-between gap-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-500/15 text-orange-300 border border-orange-500/30">
                  <Flame className="w-3 h-3 text-orange-400" /> 장마감 수급 분석
                </span>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors">
                장마감 수급 퀀트 스캐너
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                정규장 종가 기준 기관·외국인 수급 유입 종목 및 일자별 시세 통계를 확인합니다.
              </p>
            </div>
          </Link>

          <Link
            href="/signals?tab=calendar"
            className="p-5 rounded-2xl bg-zinc-900/70 border border-indigo-500/25 hover:border-indigo-400/50 transition-all group flex flex-col justify-between gap-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <CalendarClock className="w-3 h-3 text-indigo-400" /> 매크로 캘린더
                </span>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors">
                글로벌 주요 경제 일정
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                미국 FOMC, CPI 물가지수, 고용지표 등 핵심 거시경제 발표 일정을 점검합니다.
              </p>
            </div>
          </Link>

          <Link
            href="/weekend-report"
            className="p-5 rounded-2xl bg-zinc-900/70 border border-emerald-500/25 hover:border-emerald-400/50 transition-all group flex flex-col justify-between gap-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Newspaper className="w-3 h-3 text-emerald-400" /> 주간 브리핑
                </span>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                주간 증시 요약 리포트
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                한 주간의 코스피·코스닥·나스닥 주요 업종 흐름과 기관·외국인 수급 통계를 요약합니다.
              </p>
            </div>
          </Link>
        </div>

        {/* 4. 글로벌 핵심 거시경제 지표 */}
        <div>
          <MarketIndicators limit={10} />
        </div>

        {/* 5. 대시보드 하단 배너 */}
        <div className="pt-2 flex justify-center">
          <KakaoRevenueAd type="banner" />
        </div>
      </div>
    </div>
  );
}
