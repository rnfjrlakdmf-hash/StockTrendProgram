"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Rocket, Cpu, Plane, Bot, Coins, Dna, ArrowUpRight, TrendingUp, ShieldCheck, Zap } from "lucide-react";

export interface EmergingStock {
    ticker: string;
    nameKo: string;
    nameEn: string;
    exchange: string;
    category: "space" | "quantum" | "uam" | "ai" | "fintech" | "bio";
    categoryLabel: string;
    icon: string;
    oneLiner: string;
    tags: string[];
    highlight: string;
}

export const US_EMERGING_STOCKS: EmergingStock[] = [
    // 1. 우주항공 & 위성
    {
        ticker: "ASTS",
        nameKo: "AST 스페이스모바일",
        nameEn: "AST SpaceMobile",
        exchange: "NASDAQ",
        category: "space",
        categoryLabel: "우주항공 & 위성",
        icon: "🚀",
        oneLiner: "스마트폰에 인공위성이 바로 연결되는 우주 셀룰러 광대역 통신망 구축",
        tags: ["#우주인터넷", "#AT&T·버라이즌제휴", "#블루버드위성"],
        highlight: "지상 기지국 없는 오지에서도 스마트폰 통신 연결"
    },
    {
        ticker: "RKLB",
        nameKo: "로켓랩",
        nameEn: "Rocket Lab USA",
        exchange: "NASDAQ",
        category: "space",
        categoryLabel: "우주항공 & 위성",
        icon: "🛸",
        oneLiner: "스페이스X의 대항마로 꼽히는 민간 소형 우주 로켓 발사체 및 위성 제조 1위",
        tags: ["#로켓발사체", "#일렉트론", "#NASA수주"],
        highlight: "상업용 소형 위성 발사 시장 독보적 점유율"
    },
    {
        ticker: "LUNR",
        nameKo: "인튜이티브 머신스",
        nameEn: "Intuitive Machines",
        exchange: "NASDAQ",
        category: "space",
        categoryLabel: "우주항공 & 위성",
        icon: "🌕",
        oneLiner: "민간 기업 최초로 달 표면 착륙에 성공한 NASA 아르테미스 프로젝트 핵심 파트너",
        tags: ["#달탐사", "#NASA파트너", "#우주화물"],
        highlight: "미국 정부 달 착륙선 및 우주 통신망 계약 수주"
    },

    // 2. 양자컴퓨터
    {
        ticker: "IONQ",
        nameKo: "아이온큐",
        nameEn: "IonQ, Inc.",
        exchange: "NYSE",
        category: "quantum",
        categoryLabel: "양자컴퓨팅",
        icon: "⚛️",
        oneLiner: "세계 최초 상용 클라우드 이온트랩 방식 양자컴퓨터 선도 기업",
        tags: ["#양자컴퓨터", "#AWS·MS제휴", "#슈퍼컴퓨팅"],
        highlight: "아마존·구글·마이크로소프트 클라우드 전반에 양자 시스템 탑재"
    },
    {
        ticker: "RGTI",
        nameKo: "리게티 컴퓨팅",
        nameEn: "Rigetti Computing",
        exchange: "NASDAQ",
        category: "quantum",
        categoryLabel: "양자컴퓨팅",
        icon: "🔬",
        oneLiner: "초전도 기반 다중 큐비트 양자 프로세서 및 하이브리드 양자-클라우드 개발",
        tags: ["#초전도양자", "#칩직접제조", "#양자알고리즘"],
        highlight: "양자 프로세서 칩을 자체 팹에서 직접 생산하는 풀스택 기업"
    },

    // 3. UAM 플라잉카
    {
        ticker: "JOBY",
        nameKo: "조비 에비에이션",
        nameEn: "Joby Aviation",
        exchange: "NYSE",
        category: "uam",
        categoryLabel: "UAM 플라잉카",
        icon: "🚁",
        oneLiner: "도심을 비행하는 전기 수직이착륙(eVTOL) 친환경 에어택시 상용화 선도 기업",
        tags: ["#도심항공", "#도요타5억불투자", "#FAA인증순항"],
        highlight: "도요타 및 우버와 제휴하여 세계 최초 에어택시 노선 개설 추진"
    },
    {
        ticker: "ACHR",
        nameKo: "아처 에비에이션",
        nameEn: "Archer Aviation",
        exchange: "NYSE",
        category: "uam",
        categoryLabel: "UAM 플라잉카",
        icon: "🛩️",
        oneLiner: "스텔란티스 및 유나이티드항공과 협력하는 차세대 도심형 전기 항공 모빌리티",
        tags: ["#에어택시", "#유나이티드항공", "#스텔란티스양산"],
        highlight: "글로벌 완성차 및 대형 항공사와의 대규모 선주문 확보"
    },

    // 4. 차세대 AI & 데이터
    {
        ticker: "PLTR",
        nameKo: "팔란티어",
        nameEn: "Palantir Technologies",
        exchange: "NYSE",
        category: "ai",
        categoryLabel: "차세대 AI & 데이터",
        icon: "🤖",
        oneLiner: "미 국방부 및 글로벌 500대 대기업의 의사결정을 지원하는 엔터프라이즈 AI OS",
        tags: ["#인공지능플랫폼", "#AIP", "#흑자전환S&P500"],
        highlight: "기업용 생성형 AI 솔루션 AIP의 폭발적인 수요로 급성장"
    },
    {
        ticker: "SMCI",
        nameKo: "슈퍼마이크로컴퓨터",
        nameEn: "Super Micro Computer",
        exchange: "NASDAQ",
        category: "ai",
        categoryLabel: "차세대 AI & 데이터",
        icon: "⚡",
        oneLiner: "엔비디아 최신 AI 가속기 칩을 장착하는 고효율 수랭식 액체냉각 AI 서버 1위",
        tags: ["#AI서버", "#엔비디아파트너", "#액체냉각"],
        highlight: "AI 데이터센터의 발열을 잡는 수랭식 솔루션 시장 선점"
    },
    {
        ticker: "AI",
        nameKo: "C3.ai",
        nameEn: "C3.ai, Inc.",
        exchange: "NYSE",
        category: "ai",
        categoryLabel: "차세대 AI & 데이터",
        icon: "🌐",
        oneLiner: "에너지·제조·국방 산업을 위한 맞춤형 엔터프라이즈 생성형 AI 소프트웨어",
        tags: ["#기업용AI", "#스마트공장", "#미공군계약"],
        highlight: "복잡한 기업 프로세스에 생성형 AI를 즉각 적용하는 턴키 솔루션"
    },

    // 5. 혁신 핀테크
    {
        ticker: "SOFI",
        nameKo: "소파이 테크놀로지스",
        nameEn: "SoFi Technologies",
        exchange: "NASDAQ",
        category: "fintech",
        categoryLabel: "혁신 핀테크",
        icon: "💳",
        oneLiner: "미국 MZ세대를 사로잡은 모바일 올인원 디지털 종합 금융 은행 플랫폼",
        tags: ["#디지털뱅킹", "#학자금대출", "#흑자전환"],
        highlight: "예금, 대출, 투자, 신용카드를 하나의 앱으로 해결하는 슈퍼앱"
    },
    {
        ticker: "COIN",
        nameKo: "코인베이스",
        nameEn: "Coinbase Global",
        exchange: "NASDAQ",
        category: "fintech",
        categoryLabel: "혁신 핀테크",
        icon: "🪙",
        oneLiner: "미국 최대 제도권 가상자산 거래소이자 비트코인 현물 ETF 수탁(Custody) 독점",
        tags: ["#비트코인ETF수탁", "#제도권거래소", "#Base체인"],
        highlight: "미국 비트코인 현물 ETF 대다수의 자산을 보관·관리하는 핵심 인프라"
    },

    // 6. 유전자 바이오
    {
        ticker: "CRSP",
        nameKo: "크리스퍼 테라퓨틱스",
        nameEn: "CRISPR Therapeutics",
        exchange: "NASDAQ",
        category: "bio",
        categoryLabel: "유전자 바이오",
        icon: "🧬",
        oneLiner: "노벨상 수상 유전자 가위(CRISPR-Cas9) 기술로 난치병 완치 치료제를 개발",
        tags: ["#유전자가위", "#FDA최초승인", "#희귀난치병"],
        highlight: "세계 최초로 FDA 승인을 받은 크리스퍼 유전자 치료제 '카스게비' 보유"
    }
];

const CATEGORIES = [
    { key: "all", label: "전체 유망주", icon: "🔥" },
    { key: "space", label: "우주항공·위성", icon: "🚀" },
    { key: "quantum", label: "양자컴퓨터", icon: "⚛️" },
    { key: "uam", label: "플라잉카(UAM)", icon: "🚁" },
    { key: "ai", label: "차세대 AI·데이터", icon: "🤖" },
    { key: "fintech", label: "혁신 핀테크", icon: "💳" },
    { key: "bio", label: "유전자 바이오", icon: "🧬" },
];

interface UsEmergingStocksShowcaseProps {
    onSelectStock?: (ticker: string) => void;
    className?: string;
}

export default function UsEmergingStocksShowcase({ onSelectStock, className = "" }: UsEmergingStocksShowcaseProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const filteredStocks = selectedCategory === "all" 
        ? US_EMERGING_STOCKS 
        : US_EMERGING_STOCKS.filter(s => s.category === selectedCategory);

    return (
        <section className={`w-full rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-950/80 to-slate-900/90 p-5 sm:p-7 backdrop-blur-xl shadow-2xl relative overflow-hidden ${className}`}>
            {/* 앰비언트 글로우 장식 */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            {/* 헤더 타이틀 */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-5 border-b border-white/10">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500/15 via-cyan-500/15 to-indigo-500/15 text-cyan-300 border border-cyan-500/30 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                        <span>초보자 맞춤형 미국 신생 혁신 기업 큐레이션</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <span>🚀 지금 월가가 주목하는 미국 혁신 유망주 테마</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        어려운 종목 코드를 몰라도 괜찮습니다. 미래 10배 성장이 기대되는 미국의 차세대 테크 기업들을 한눈에 확인하세요.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>5단계 AI 진단 리포트 연동</span>
                </div>
            </div>

            {/* 테마 카테고리 필터 탭 */}
            <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.key}
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                            selectedCategory === cat.key
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]"
                                : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5"
                        }`}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        {cat.key === "all" ? (
                            <span className="text-[10px] ml-0.5 px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                                {US_EMERGING_STOCKS.length}
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>

            {/* 신생 기업 카드 그리드 (반응형 1~3열) */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredStocks.map(stock => (
                    <div
                        key={stock.ticker}
                        className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/40 p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between"
                    >
                        {/* 상단: 아이콘 + 종목명 + 티커 + 거래소 */}
                        <div>
                            <div className="flex items-start justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                        {stock.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                                                {stock.nameKo}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                            <span className="font-bold text-cyan-400">{stock.ticker}</span>
                                            <span>•</span>
                                            <span>{stock.nameEn}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400">
                                    {stock.exchange}
                                </span>
                            </div>

                            {/* 초보자를 위한 1줄 비즈니스 해설 */}
                            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal mb-3 line-clamp-2">
                                {stock.oneLiner}
                            </p>

                            {/* 핵심 투자 포인트 하이라이트 칩 */}
                            <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15 mb-3.5">
                                <span className="text-[11px] text-cyan-300 font-medium flex items-center gap-1.5 leading-snug">
                                    <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                                    <span>{stock.highlight}</span>
                                </span>
                            </div>

                            {/* 태그 모음 */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {stock.tags.map((tag, idx) => (
                                    <span key={idx} className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-mono">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* 하단: 액션 버튼 2종 (5단계 AI 진단 / 실시간 차트) */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
                            <Link
                                href={`/stock/${stock.ticker}`}
                                className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-md shadow-blue-500/20 active:scale-95 text-center"
                            >
                                <span>5단계 AI 진단</span>
                                <ArrowUpRight className="w-3 h-3" />
                            </Link>

                            {onSelectStock ? (
                                <button
                                    onClick={() => onSelectStock(stock.ticker)}
                                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                                >
                                    <TrendingUp className="w-3 h-3 text-cyan-400" />
                                    <span>실시간 시세·차트</span>
                                </button>
                            ) : (
                                <Link
                                    href={`/discovery?q=${stock.ticker}`}
                                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 text-center"
                                >
                                    <TrendingUp className="w-3 h-3 text-cyan-400" />
                                    <span>실시간 시세·차트</span>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 하단 안내 문구 */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                <span>※ 위 종목들은 대형주가 아닌 차세대 기술 혁신을 주도하는 유망 신생 기업들로, 높은 성장성과 함께 변동성이 존재하므로 분산 투자를 권장합니다.</span>
                <span className="shrink-0 text-slate-400">데이터: NASDAQ / NYSE 실시간 연동</span>
            </div>
        </section>
    );
}
