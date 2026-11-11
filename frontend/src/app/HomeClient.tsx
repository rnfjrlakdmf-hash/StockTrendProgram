"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import LiveMarketHub from "@/components/LiveMarketHub";
import MarketIndicators from "@/components/MarketIndicators";
import FearGreedSpeedometer from "@/components/FearGreedSpeedometer";
import { CalendarClock, ChevronRight, Newspaper, Flame, BookOpen, Calculator } from "lucide-react";
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

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 pt-2 sm:pt-3 space-y-4">
        {/* 1. 슬림 퀵 리서치 링크 바 (공포·탐욕 지수가 바로 보이도록 얇고 정돈된 1줄 바) */}
        <div className="rounded-xl bg-zinc-900/80 border border-white/10 px-3 py-1.5 flex flex-wrap items-center justify-between gap-1.5 shadow-sm text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-black shrink-0 flex items-center gap-1">
              <span>🏛️</span>
              <span>RESEARCH HUB</span>
            </span>
            <span className="text-[11px] text-gray-400 hidden xl:inline-block font-medium truncate">
              공식 공공데이터 기반 정량 수급 분석
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 flex-wrap text-[11px]">
            {isAdmin && (
              <>
                <Link
                  href="/ceo-office"
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black transition-all shadow-xs hover:brightness-110 flex items-center gap-1"
                >
                  <span>🏛️</span>
                  <span>대표이사 집무실</span>
                </Link>
                <Link
                  href="/research"
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold transition-all"
                >
                  📑 리서치
                </Link>
              </>
            )}
            <Link
              href="/blog"
              className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-bold transition-all"
            >
              📰 칼럼
            </Link>
            <Link
              href="/theory"
              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold transition-all"
            >
              📘 차트
            </Link>
            <Link
              href="/guide"
              className="px-2 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold transition-all"
            >
              📚 백과 (46선)
            </Link>
            <Link
              href="/calculator"
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold transition-all"
            >
              🧮 계산기
            </Link>
          </div>
        </div>

        {/* 2. [최상단 배치] 핵심 마켓 상황판 2단 그리드: 좌측(공포·탐욕 지수) / 우측(실시간 시세 & 랭킹 허브) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-stretch">
          <FearGreedSpeedometer />
          <LiveMarketHub />
        </div>

        {/* 3. 핵심 아카데미 & 리서치 바로가기 3단 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isAdmin ? (
            <>
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
            </>
          ) : (
            <>
              <Link
                href="/guide"
                className="p-5 rounded-2xl bg-zinc-900/70 border border-purple-500/25 hover:border-purple-400/50 transition-all group flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      <BookOpen className="w-3 h-3 text-purple-400" /> 금융 백과사전
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors">
                    46대 필수 주식 용어 백과사전
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                    PER, PBR, ROE 기업 가치평가부터 DART 전자공시와 FOMC 금리까지 체계적으로 학습합니다.
                  </p>
                </div>
              </Link>

              <Link
                href="/blog"
                className="p-5 rounded-2xl bg-zinc-900/70 border border-blue-500/25 hover:border-blue-400/50 transition-all group flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      <Newspaper className="w-3 h-3 text-blue-400" /> 리서치 칼럼
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors">
                    거시경제 &amp; 재무 분석 리포트
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                    기업 재무제표 독해법과 글로벌 금리·환율 사이클을 깊이 있게 다룬 정통 금융 칼럼입니다.
                  </p>
                </div>
              </Link>

              <Link
                href="/calculator"
                className="p-5 rounded-2xl bg-zinc-900/70 border border-emerald-500/25 hover:border-emerald-400/50 transition-all group flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <Calculator className="w-3 h-3 text-emerald-400" /> 금융 계산 도구
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                    평단가 · 배당수익률 계산기
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                    분할매수 평균단가 계산과 배당소득세(15.4%) 공제 후 실수령 배당금을 즉시 시뮬레이션합니다.
                  </p>
                </div>
              </Link>
            </>
          )}
        </div>

        {/* 4. 글로벌 핵심 거시경제 지표 */}
        <div>
          <MarketIndicators limit={10} />
        </div>
      </div>
    </div>
  );
}
