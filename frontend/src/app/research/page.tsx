"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import {
    Search, Newspaper, TrendingUp, Award, ExternalLink, BookOpen,
    Sparkles, Target, Building2, Filter, ArrowLeft, BarChart3,
    RefreshCw, ChevronRight, Layers, Eye, Calendar, CheckCircle2, X
} from "lucide-react";
import KakaoRevenueAd from "@/components/KakaoRevenueAd";
import SeoContentBlock from "@/components/SeoContentBlock";

interface ResearchReportItem {
    id: string;
    nid: string;
    category: string;
    broker: string;
    analyst?: string | null;
    date: string;
    read_count: number;
    title: string;
    item_name: string;
    item_code?: string | null;
    industry_name?: string | null;
    goal_price?: string | null;
    goal_price_num?: number | null;
    opinion?: string | null;
    summary_points: string[];
    easy_summary: string;
    checkpoint: string;
    naver_url?: string;
}

interface ConsensusSummary {
    stock_name: string;
    stock_code?: string | null;
    avg_goal_price: string;
    max_goal_price: string;
    min_goal_price: string;
    buy_count: number;
    report_count: number;
    goal_sample_count: number;
}

interface EconomicTerm {
    term: string;
    keywords: string[];
    easyMeaning: string;
}

const RESEARCH_TERMS_DICT: EconomicTerm[] = [
    {
        term: "YoY (전년 동기 대비)",
        keywords: ["yoy", "전년동기", "전년 대비"],
        easyMeaning: "작년 같은 기간(예: 작년 3분기)과 비교해서 매출이나 이익이 얼마나 늘었는지를 뜻합니다."
    },
    {
        term: "QoQ (전분기 대비)",
        keywords: ["qoq", "전분기"],
        easyMeaning: "바로 직전 분기(3개월 전)와 비교해서 실적이 얼마나 성장했는지를 나타냅니다."
    },
    {
        term: "OPM (영업이익률)",
        keywords: ["opm", "영업이익률", "마진율"],
        easyMeaning: "매출액 중에서 실제로 회사가 손에 쥔 순수 영업이익의 비율로, 장사를 얼마나 알짜로 잘했는지 보여줍니다."
    },
    {
        term: "컨센서스 (시장 예상치)",
        keywords: ["컨센서스", "시장 기대치", "예상치", "추정치"],
        easyMeaning: "국내 주요 증권사 애널리스트들이 예상한 기업 실적의 평균 점수입니다. 이를 넘으면 '어닝 서프라이즈(깜짝 호실적)'라고 부릅니다."
    },
    {
        term: "PER (주가수익비율)",
        keywords: ["per"],
        easyMeaning: "회사가 1년간 벌어들이는 순이익 대비 현재 시가총액이 몇 배인지 나타내는 지표로, 낮을수록 이익 대비 주가가 저렴하다는 뜻입니다."
    },
    {
        term: "PBR (주가순자산비율)",
        keywords: ["pbr"],
        easyMeaning: "회사가 가진 전체 순자산(장부가치) 대비 주가가 몇 배인지 나타내며, 1배 미만이면 회사 청산가치보다도 주가가 싸다는 뜻입니다."
    },
    {
        term: "CapEx (설비투자)",
        keywords: ["capex", "설비투자"],
        easyMeaning: "기업이 미래 성장을 위해 공장 증설, AI 데이터센터 서버 확충 등에 투자하는 자금입니다."
    },
    {
        term: "SMR (소형모듈원전)",
        keywords: ["smr", "소형모듈원전", "원전"],
        easyMeaning: "공장에서 모듈 형태로 제작해 조립할 수 있는 차세대 소형 원자력발전소로, AI 데이터센터 전력 공급의 핵심 대안입니다."
    },
    {
        term: "HBM / DRAM (메모리 반도체)",
        keywords: ["hbm", "dram", "d램", "lpddr", "낸드"],
        easyMeaning: "AI 가속기와 서버에서 데이터를 초고속으로 처리·저장하는 핵심 메모리 반도체입니다."
    },
    {
        term: "수주잔고 & Capa (생산능력)",
        keywords: ["수주", "capa", "캐파", "가동률"],
        easyMeaning: "수주잔고는 이미 계약해 둔 밀린 일감 총액이며, Capa(캐파)는 공장에서 최대로 찍어낼 수 있는 생산 능력을 뜻합니다."
    },
    {
        term: "밸류업 & 주주환원",
        keywords: ["밸류업", "주주환원", "배당", "자사주"],
        easyMeaning: "기업이 벌어들인 이익으로 배당금을 늘리거나 자사주를 매입·소각해 주주가치를 높이는 정책입니다."
    },
    {
        term: "어닝 서프라이즈 / 부합 / 하회",
        keywords: ["상회", "하회", "부합", "서프라이즈"],
        easyMeaning: "'상회'는 전문가 예상보다 실적이 훨씬 잘 나왔다는 뜻이고, '부합'은 예상 수준, '하회'는 예상보다 밑돌았다는 뜻입니다."
    }
];

function getMatchedTerms(text: string, maxCount = 3): EconomicTerm[] {
    if (!text) return [];
    const lower = text.toLowerCase();
    const matched: EconomicTerm[] = [];
    for (const item of RESEARCH_TERMS_DICT) {
        if (item.keywords.some(k => lower.includes(k.toLowerCase()))) {
            matched.push(item);
            if (matched.length >= maxCount) break;
        }
    }
    return matched;
}

const POPULAR_STOCKS = [
    { label: "전체 최신 리포트", query: "" },
    { label: "🔥 삼성전자", query: "삼성전자" },
    { label: "🔥 SK하이닉스", query: "SK하이닉스" },
    { label: "⚡ 두산에너빌리티", query: "두산에너빌리티" },
    { label: "⚡ HD현대일렉트릭", query: "HD현대일렉트릭" },
    { label: "🚗 현대차", query: "현대차" },
    { label: "🚀 한화에어로스페이스", query: "한화에어로스페이스" },
    { label: "💊 한미약품", query: "한미약품" },
    { label: "💊 셀트리온", query: "셀트리온" },
    { label: "✈️ 대한항공", query: "대한항공" },
    { label: "💧 코웨이", query: "코웨이" },
    { label: "🔋 LG에너지솔루션", query: "LG에너지솔루션" },
    { label: "🌐 NAVER", query: "NAVER" },
];

const FALLBACK_REPORTS: ResearchReportItem[] = [
    {
        id: "company_96804",
        nid: "96804",
        category: "종목분석",
        broker: "하나증권",
        date: "2026-10-16",
        read_count: 8691,
        title: "대형원전과 SMR 추가 수주 기대",
        item_name: "두산에너빌리티",
        item_code: "034020",
        goal_price: "120,000원",
        goal_price_num: 120000,
        opinion: "Buy (매수)",
        summary_points: [
            "두산에너빌리티 목표주가를 120,000원으로 상향하며 투자의견 매수(Buy) 유지",
            "글로벌 대형 원전 및 차세대 소형모듈원전(SMR) 추가 수주 모멘텀 본격화 기대",
            "에너빌리티 부문 수주잔고 확대와 고마진 기자재 매출 비중 상승으로 중장기 실적 개선 전망"
        ],
        easy_summary: "하나증권에서 '두산에너빌리티'에 대해 목표주가를 120,000원으로 제시하며 'Buy (매수)' 의견을 낸 기업 분석 리포트입니다. 전 세계 AI 데이터센터 전력 수요 급증으로 대형원전과 소형원전(SMR) 핵심 설비 수주가 늘어날 것이라는 평가입니다.",
        checkpoint: "'두산에너빌리티'의 해외 원전 본계약 체결 일정과 분기 영업이익 개선 속도를 함께 확인하세요.",
        naver_url: "https://stock.naver.com/research/company/96804"
    },
    {
        id: "company_96803",
        nid: "96803",
        category: "종목분석",
        broker: "한화투자증권",
        date: "2026-10-16",
        read_count: 4210,
        title: "3Q26 Preview : 꺾이지 않는 해외법인 성장",
        item_name: "코웨이",
        item_code: "021240",
        goal_price: "160,000원",
        goal_price_num: 160000,
        opinion: "Buy (매수)",
        summary_points: [
            "3분기 연결 매출액 1조 4,302억원(+14% YoY), 영업이익 2,612억원(+8% YoY)으로 시장 기대치 부합 전망",
            "국내 렌탈 계정의 안정적 성장과 말레이시아·태국 등 해외법인의 고성장이 실적 견인",
            "구독형 비즈니스 모델 기반의 탄탄한 현금흐름과 주주환원 매력 지속"
        ],
        easy_summary: "한화투자증권에서 '코웨이'에 대해 목표주가를 160,000원으로 제시하며 'Buy (매수)' 의견을 낸 기업 분석 리포트입니다. 국내외 정수기·가전 렌탈 가입자가 꾸준히 늘어나며 3분기에도 시장 예상치에 부합하는 호실적이 기대된다는 분석입니다.",
        checkpoint: "'코웨이'의 동남아 해외법인 매출 성장률과 연말 배당·주주환원 정책을 함께 점검하세요.",
        naver_url: "https://stock.naver.com/research/company"
    },
    {
        id: "company_96802",
        nid: "96802",
        category: "종목분석",
        broker: "신한투자증권",
        date: "2026-10-16",
        read_count: 5120,
        title: "3Q26 Preview: 북미향 바이오 의약품 수출 일시적 숨고르기 후 반등",
        item_name: "한미약품",
        item_code: "128940",
        goal_price: "700,000원",
        goal_price_num: 700000,
        opinion: "Buy (매수)",
        summary_points: [
            "목표주가 700,000원 및 투자의견 매수(Buy) 유지",
            "주력 개량신약의 견조한 처방 성장과 글로벌 비만·대사질환 신약 파이프라인 임상 모멘텀 유효",
            "하반기 기술수출 마일스톤 유입 및 자회사 북경한미 실적 회복 여부 주목"
        ],
        easy_summary: "신한투자증권에서 '한미약품'에 대해 목표주가를 700,000원으로 제시하며 'Buy (매수)' 의견을 낸 리포트입니다. 단기 수출 물량 시차로 숨고르기가 있으나 비만치료제 등 핵심 신약 파이프라인 가치가 여전히 높다는 분석입니다.",
        checkpoint: "주요 학회에서의 비만·대사 신약 임상 데이터 발표 일정과 기관 수급 유입 여부를 체크하세요.",
        naver_url: "https://stock.naver.com/research/company"
    }
];

export default function DomesticStockResearchPage() {
    const [category, setCategory] = useState<"company" | "industry" | "market" | "invest">("company");
    const [searchInput, setSearchInput] = useState<string>("");
    const [activeQuery, setActiveQuery] = useState<string>("");
    const [selectedBroker, setSelectedBroker] = useState<string>("ALL");
    const [items, setItems] = useState<ResearchReportItem[]>(FALLBACK_REPORTS);
    const [consensus, setConsensus] = useState<ConsensusSummary | null>(null);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [page, setPage] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);

    const fetchResearch = useCallback(async (cat: string, q: string, pageNum: number, append: boolean = false) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        try {
            const url = `${API_BASE_URL}/api/market/research?category=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}&page=${pageNum}&size=20`;
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                if (data.status === "success" && Array.isArray(data.items)) {
                    if (append) {
                        setItems(prev => [...prev, ...data.items]);
                    } else {
                        setItems(data.items.length > 0 ? data.items : (q ? [] : FALLBACK_REPORTS));
                        setConsensus(data.consensus || null);
                        setTotalCount(Number(data.total_count) || data.items.length);
                        setSelectedBroker("ALL");
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch stock research reports:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPage(0);
        fetchResearch(category, activeQuery, 0, false);
    }, [category, activeQuery, fetchResearch]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setActiveQuery(searchInput.trim());
    };

    const handleQuickStockSelect = (stockQuery: string) => {
        setCategory("company");
        setSearchInput(stockQuery);
        setActiveQuery(stockQuery);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchResearch(category, activeQuery, nextPage, true);
    };

    // 현재 로드된 리포트의 증권사 목록 추출
    const availableBrokers = Array.from(new Set(items.map(i => i.broker))).filter(Boolean);
    const displayedItems = selectedBroker === "ALL"
        ? items
        : items.filter(i => i.broker === selectedBroker);

    return (
        <div className="min-h-screen bg-[#07080d] text-gray-100 p-4 md:p-8 max-w-6xl mx-auto relative overflow-hidden font-sans pb-24">
            {/* Ambient Background Glow */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px] pointer-events-none -z-10" />
            <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[150px] pointer-events-none -z-10" />

            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all"
                >
                    <ArrowLeft className="w-4 h-4 text-purple-400" />
                    <span>홈 대시보드로 돌아가기</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Link
                        href="/weekend-report"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-black transition-all"
                    >
                        <Newspaper className="w-3.5 h-3.5" />
                        <span>주간 마켓 인사이트 보기</span>
                    </Link>
                </div>
            </div>

            {/* Hero Header */}
            <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900/90 to-indigo-950/30 border border-purple-500/30 shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-black">
                            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                            <span>DOMESTIC EQUITY RESEARCH CENTER · 실시간 증권사 컨센서스</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            국내 종목별 증권사 리서치 &amp; 목표주가 센터
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">
                            국내 주요 증권사 애널리스트들이 발표한 <strong>종목별 분석 리포트, 목표주가 상향·하향, 투자의견(Buy/Hold)</strong>을 실시간으로 검색하고, 어려운 리포트 전문 용어를 <strong>초보자 눈높이 해설</strong>로 쉽게 확인하세요.
                        </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-start md:items-end justify-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
                        <span className="text-[11px] text-zinc-400 font-medium">누적 증권사 종목 리포트</span>
                        <span className="text-xl font-black text-purple-300 font-mono">
                            {totalCount > 0 ? `${totalCount.toLocaleString()}건+` : "실시간 연동"}
                        </span>
                    </div>
                </div>

                {/* 종목 검색 바 */}
                <form onSubmit={handleSearchSubmit} className="relative flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 text-purple-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="종목명(예: 삼성전자, SK하이닉스, 두산에너빌리티, 현대차) 또는 6자리 종목코드 입력..."
                            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-zinc-950/90 border border-purple-500/40 focus:border-purple-400 text-white placeholder-zinc-500 text-sm font-medium focus:outline-none shadow-inner"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchInput("");
                                    setActiveQuery("");
                                }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 cursor-pointer"
                                title="검색어 지우기"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        <span>종목 리포트 검색</span>
                    </button>
                </form>

                {/* 인기 국내 종목 원클릭 퀵버튼 */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>인기 종목 원클릭 바로가기 (클릭하면 해당 종목의 증권사 리포트만 모아봅니다)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {POPULAR_STOCKS.map((s) => {
                            const isSelected = activeQuery === s.query && category === "company";
                            return (
                                <button
                                    key={s.label}
                                    type="button"
                                    onClick={() => handleQuickStockSelect(s.query)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                        isSelected
                                            ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                            : "bg-zinc-900/90 text-zinc-300 border-white/10 hover:bg-zinc-800 hover:text-white"
                                    }`}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 리서치 카테고리 탭 & 증권사 필터 바 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { id: "company", label: "🏢 국내 종목별 리포트", desc: "종목 목표주가·실적 분석" },
                        { id: "industry", label: "🏭 산업·섹터 리포트", desc: "반도체·원전·바이오 등 업황" },
                        { id: "market", label: "📊 데일리 시황", desc: "매일 장마감 증시 리뷰" },
                        { id: "invest", label: "🧭 투자전략·자산배분", desc: "수급·밸류에이션 전략" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setCategory(tab.id as any)}
                            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer border flex items-center gap-2 ${
                                category === tab.id
                                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-lg"
                                    : "bg-zinc-900/80 text-zinc-300 border-white/10 hover:bg-zinc-800"
                            }`}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* 증권사별 필터 */}
                {availableBrokers.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <Filter className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <button
                            onClick={() => setSelectedBroker("ALL")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer border ${
                                selectedBroker === "ALL"
                                    ? "bg-purple-500/30 text-purple-200 border-purple-400/50"
                                    : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                            }`}
                        >
                            전체 증권사 ({items.length})
                        </button>
                        {availableBrokers.slice(0, 7).map((brk) => (
                            <button
                                key={brk}
                                onClick={() => setSelectedBroker(brk)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer border ${
                                    selectedBroker === brk
                                        ? "bg-purple-500/30 text-purple-200 border-purple-400/50"
                                        : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                                }`}
                            >
                                {brk}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 특정 종목 검색 시: 🎯 목표주가 컨센서스 요약 보드 */}
            {consensus && activeQuery && category === "company" && (
                <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/90 to-teal-950/30 border border-emerald-500/35 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                                <Target className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                                        ANALYST TARGET PRICE CONSENSUS
                                    </span>
                                    {consensus.stock_code && (
                                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-200">
                                            {consensus.stock_code}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-lg sm:text-xl font-black text-white">
                                    {consensus.stock_name} · 증권사 목표주가 컨센서스 요약 (최근 {consensus.report_count}건 기준)
                                </h2>
                            </div>
                        </div>

                        <Link
                            href={`/discovery?q=${encodeURIComponent(consensus.stock_code || consensus.stock_name)}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-md transition-all self-start sm:self-center"
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>{consensus.stock_name} 실시간 차트·수급 분석 보기</span>
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/25">
                            <span className="text-xs text-zinc-400 block">🎯 평균 목표주가</span>
                            <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono mt-1 block">
                                {consensus.avg_goal_price}
                            </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-black/40 border border-rose-500/25">
                            <span className="text-xs text-zinc-400 block">📈 최고 목표주가</span>
                            <span className="text-lg sm:text-xl font-black text-rose-300 font-mono mt-1 block">
                                {consensus.max_goal_price}
                            </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/25">
                            <span className="text-xs text-zinc-400 block">📉 최저 목표주가</span>
                            <span className="text-lg sm:text-xl font-black text-blue-300 font-mono mt-1 block">
                                {consensus.min_goal_price}
                            </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/25">
                            <span className="text-xs text-zinc-400 block">👍 매수(Buy) 의견</span>
                            <span className="text-lg sm:text-xl font-black text-amber-300 font-mono mt-1 block">
                                {consensus.buy_count}건 / {consensus.report_count}건
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 리포트 리스트 영역 */}
            {loading ? (
                <div className="py-20 text-center space-y-3 bg-zinc-900/40 rounded-3xl border border-white/10">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                    <p className="text-sm font-bold text-zinc-300">
                        국내 증권사 최신 리서치 리포트를 실시간으로 불러오는 중입니다...
                    </p>
                </div>
            ) : displayedItems.length === 0 ? (
                <div className="py-16 text-center space-y-4 bg-zinc-900/40 rounded-3xl border border-white/10 p-6">
                    <p className="text-base font-black text-white">
                        &lsquo;{activeQuery}&rsquo;에 대한 증권사 리포트를 찾지 못했습니다.
                    </p>
                    <p className="text-xs text-zinc-400">
                        정확한 종목명(예: 삼성전자, SK하이닉스, 현대차, 두산에너빌리티)이나 6자리 종목코드로 다시 검색해 보세요.
                    </p>
                    <button
                        onClick={() => handleQuickStockSelect("")}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer"
                    >
                        전체 최신 종목 리포트 보기
                    </button>
                </div>
            ) : (
                <div className="space-y-5">
                    {displayedItems.map((item, idx) => {
                        const combinedText = `${item.title} ${(item.summary_points || []).join(" ")} ${item.easy_summary}`;
                        const terms = getMatchedTerms(combinedText, 3);

                        return (
                            <article
                                key={`${item.id}_${idx}`}
                                className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-zinc-900/95 via-zinc-900/75 to-zinc-950 border border-white/10 hover:border-purple-500/40 transition-all shadow-xl space-y-4"
                            >
                                {/* 상단 배지 바 */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* 종목명 배지 (클릭 시 해당 종목 리포트 모아보기) */}
                                        {item.item_name && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (category === "company") {
                                                        handleQuickStockSelect(item.item_code || item.item_name);
                                                    }
                                                }}
                                                className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                                                title="클릭하면 이 종목의 리포트만 모아봅니다"
                                            >
                                                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                                                <span>{item.item_name}</span>
                                                {item.item_code && (
                                                    <span className="text-[11px] font-mono text-amber-200/80">
                                                        ({item.item_code})
                                                    </span>
                                                )}
                                            </button>
                                        )}

                                        {/* 증권사 배지 */}
                                        <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/35 text-xs font-black flex items-center gap-1.5">
                                            <Award className="w-3.5 h-3.5 text-purple-300" />
                                            <span>{item.broker}</span>
                                            {item.analyst && (
                                                <span className="text-[11px] text-purple-300/80 font-medium">
                                                    · {item.analyst} 애널리스트
                                                </span>
                                            )}
                                        </span>

                                        {/* 투자의견 배지 */}
                                        {item.opinion && (
                                            <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/35 text-xs font-black">
                                                투자의견: {item.opinion}
                                            </span>
                                        )}

                                        {/* 목표주가 배지 */}
                                        {item.goal_price && (
                                            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-xs font-black font-mono">
                                                🎯 목표주가: {item.goal_price}
                                            </span>
                                        )}
                                    </div>

                                    {/* 날짜, 조회수, 원문 & 차트 링크 */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                        <span className="inline-flex items-center gap-1 font-mono">
                                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                                            {item.date}
                                        </span>
                                        {item.read_count > 0 && (
                                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                                                <Eye className="w-3.5 h-3.5" />
                                                {item.read_count.toLocaleString()}
                                            </span>
                                        )}
                                        {item.item_code && (
                                            <Link
                                                href={`/discovery?q=${encodeURIComponent(item.item_code)}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-bold transition-colors"
                                            >
                                                <BarChart3 className="w-3 h-3" />
                                                <span>차트·수급</span>
                                            </Link>
                                        )}
                                        {item.naver_url && (
                                            <a
                                                href={item.naver_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition-colors"
                                            >
                                                <span>원문 보기</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* 리포트 제목 */}
                                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                                    {item.title}
                                </h3>

                                {/* 증권사 원문 핵심 요약 (불릿) */}
                                {item.summary_points && item.summary_points.length > 0 && (
                                    <div className="p-4 rounded-2xl bg-black/45 border border-white/10 space-y-2">
                                        <div className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                                            <span>증권사 리포트 원문 핵심 요약</span>
                                        </div>
                                        <ul className="space-y-1.5">
                                            {item.summary_points.map((pt, pIdx) => (
                                                <li key={pIdx} className="text-xs sm:text-sm text-zinc-200 leading-relaxed flex items-start gap-2">
                                                    <span className="text-purple-400 font-bold shrink-0">•</span>
                                                    <span>{pt}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* 초보자 눈높이 쉬운 해설 & 실전 체크포인트 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-2 p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/25 border border-purple-500/25 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-purple-300">
                                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                            <span>💡 초보자를 위한 쉬운 해설</span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed">
                                            {item.easy_summary}
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-teal-950/20 border border-emerald-500/25 space-y-1.5 flex flex-col justify-center">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                                            <Target className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>🎯 실전 체크포인트</span>
                                        </div>
                                        <p className="text-xs text-zinc-200 leading-relaxed">
                                            {item.checkpoint}
                                        </p>
                                    </div>
                                </div>

                                {/* 어려운 금융·회계 용어 자동 풀이 */}
                                {terms.length > 0 && (
                                    <div className="pt-3 border-t border-white/10 space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                            <span>📖 리포트 속 어려운 금융·회계 용어 자동 풀이</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {terms.map((t, tIdx) => (
                                                <div key={tIdx} className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 flex flex-col gap-1">
                                                    <span className="text-xs font-black text-amber-300">• {t.term}</span>
                                                    <span className="text-[11px] text-zinc-300 leading-relaxed">{t.easyMeaning}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}

                    {/* 더 불러오기 버튼 */}
                    {items.length >= 15 && (
                        <div className="pt-4 text-center">
                            <button
                                type="button"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="px-8 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-purple-500/40 text-purple-200 font-black text-xs sm:text-sm transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg"
                            >
                                {loadingMore ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>리포트 추가 로딩 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <Layers className="w-4 h-4 text-purple-400" />
                                        <span>이전 증권사 리포트 더 불러오기 (+20건)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-10">
                <KakaoRevenueAd type="feed" />
            </div>

            <SeoContentBlock
                pageTitle="국내 종목별 증권사 리서치 센터 & 목표주가 컨센서스 조회"
                pageDescription="삼성전자, SK하이닉스, 현대차, 두산에너빌리티 등 국내 코스피·코스닥 상장 기업의 최신 증권사 애널리스트 리포트, 목표주가 평균 컨센서스, 투자의견(Buy) 및 초보자 맞춤형 쉬운 해설을 무료로 제공합니다."
            />
        </div>
    );
}
