"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import UsEmergingStocksShowcase from "@/components/UsEmergingStocksShowcase";
import KakaoAdFit from "@/components/KakaoAdFit";
import SeoContentBlock from "@/components/SeoContentBlock";
import { Rocket, Sparkles, Search, Compass, ShieldCheck, ArrowRight, ArrowLeft, Zap, Info, ChevronRight, TrendingUp } from "lucide-react";

export default function EmergingStocksPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <EmergingStocksContent />
        </Suspense>
    );
}

function EmergingStocksContent() {
    const router = useRouter();
    const [quickSearch, setQuickSearch] = useState("");

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (quickSearch.trim()) {
            router.push(`/discovery?q=${encodeURIComponent(quickSearch.trim())}`);
        }
    };

    return (
        <div className="min-h-screen pb-20 text-white bg-zinc-950">
            <Header 
                title="미국 혁신 신생기업 큐레이션" 
                subtitle="당일 급등주 및 거래량 폭증 테크 기업 실시간 자동 스캔 &amp; 차세대 혁신 유망주 큐레이션" 
            />

            <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in duration-500">
                {/* 상단 띠배너 광고 (모바일: 320x50, PC: 728x90) */}
                <div className="flex md:hidden justify-center -mt-2 mb-2">
                    <KakaoAdFit adUnit="DAN-g3wzyZlZ4hBiYyRA" adWidth="320" adHeight="50" />
                </div>
                <div className="hidden md:flex justify-center -mt-2 mb-2">
                    <KakaoAdFit adUnit="DAN-eeR4RhnpmQaeIlYm" adWidth="728" adHeight="90" />
                </div>

                {/* 상단 네비게이션 & 빠른 검색 바 */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                    <Link
                        href="/discovery"
                        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-cyan-300 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>종목 발굴 &amp; 마켓 스캐너로 이동</span>
                    </Link>

                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="미국 종목명 / 티커 검색..."
                                value={quickSearch}
                                onChange={(e) => setQuickSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                        >
                            진단
                        </button>
                    </form>
                </div>

                {/* 메인 큐레이션 쇼케이스 */}
                <UsEmergingStocksShowcase 
                    onSelectStock={(ticker) => {
                        router.push(`/discovery?q=${encodeURIComponent(ticker)}`);
                    }}
                />

                {/* 초보자를 위한 투자 원칙 가이드 카드 */}
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-black">
                        <ShieldCheck className="w-5 h-5" />
                        <span>초보 투자자를 위한 미국 혁신 신생기업(텐배거 유망주) 투자 핵심 원칙</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-300">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                            <div className="font-bold text-white flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-mono">1</span>
                                <span>현재의 적자보다 기술 독점성 주목</span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed">
                                혁신 신생기업은 막대한 R&D(연구개발) 비용 지출로 단기 PER이 0이거나 적자일 수 있습니다. 중요한 것은 대체 불가능한 특허와 상용화 파이프라인입니다.
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                            <div className="font-bold text-white flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-mono">2</span>
                                <span>몰빵 금지! 분할 매수 원칙 준수</span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed">
                                고성장 기술주는 시장 거시 경제(금리·환율)에 따라 주가 변동 폭이 큽니다. 한 번에 모든 자금을 넣지 말고 여러 달에 걸쳐 분할 매수하는 것이 안전합니다.
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                            <div className="font-bold text-white flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-mono">3</span>
                                <span>5단계 AI 리포트로 분기별 실적 확인</span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed">
                                각 종목 카드의 [5단계 AI 진단] 버튼을 누르면 실시간 시가총액, 매출 성장률, 분기별 현금 보유량 및 동종 업계 비교 데이터를 한눈에 검토할 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 인피드 광고 */}
                <div className="flex justify-center my-4 overflow-hidden">
                    <div className="block md:hidden">
                        <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
                    </div>
                    <div className="hidden md:block">
                        <KakaoAdFit adUnit="DAN-eeR4RhnpmQaeIlYm" adWidth="728" adHeight="90" />
                    </div>
                </div>

                {/* SEO 텍스트 블록 */}
                <SeoContentBlock 
                    pageTitle="미국 혁신 신생기업 큐레이션 | 초보자 맞춤 텐배거 유망주" 
                    pageDescription="우주항공(AST 스페이스모바일, 로켓랩), 양자컴퓨터(아이온큐, 리게티), UAM 플라잉카(조비 에비에이션, 아처), 차세대 AI(팔란티어) 등 미국의 미래 혁신을 이끄는 신생 기업 분석 및 5단계 AI 리포트를 제공합니다."
                />
            </div>
        </div>
    );
}
