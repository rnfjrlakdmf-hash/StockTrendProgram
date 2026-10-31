"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import {
    Search, Newspaper, TrendingUp, Award, ExternalLink, BookOpen,
    Sparkles, Target, Building2, Filter, ArrowLeft, BarChart3,
    RefreshCw, ChevronRight, Layers, Eye, Calendar, CheckCircle2, X,
    Globe, Flame, Coins
} from "lucide-react";
import KakaoRevenueAd from "@/components/KakaoRevenueAd";
import SeoContentBlock from "@/components/SeoContentBlock";

type MainTabType = "kr_company" | "us_stock" | "etf" | "futures" | "kr_industry" | "kr_macro";

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
    company_profile?: string | null;
    goal_price?: string | null;
    goal_price_num?: number | null;
    opinion?: string | null;
    summary_points: string[];
    easy_summary: string;
    checkpoint: string;
    naver_url?: string;
}

interface MultiAssetResearchItem {
    id: string;
    asset_type: "us_stock" | "etf" | "futures";
    symbol: string;
    name: string;
    sector: string;
    price: string;
    price_num?: number | null;
    change_pct: number;
    high_52w: string;
    low_52w: string;
    ma50: string;
    trend_badge: string;
    target_mean?: string | null;
    target_high?: string | null;
    target_low?: string | null;
    upside_pct?: number | null;
    opinion?: string | null;
    analyst_count?: number;
    forward_pe?: number | null;
    div_yield?: number | null;
    company_profile?: string | null;
    summary_points: string[];
    easy_summary: string;
    checkpoint: string;
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
        keywords: ["opm", "영업이익률", "마진"],
        easyMeaning: "매출액 중에서 실제로 회사가 손에 쥔 순수 영업이익의 비율로, 장사를 얼마나 알짜로 잘했는지 보여줍니다."
    },
    {
        term: "컨센서스 (시장 예상치)",
        keywords: ["컨센서스", "시장 기대치", "예상치", "추정치", "월가"],
        easyMeaning: "국내외 주요 증권사·투자은행(IB) 애널리스트들이 예상한 기업 실적이나 목표주가의 평균 점수입니다."
    },
    {
        term: "PER / 선행 PER (주가수익비율)",
        keywords: ["per", "선행 per", "밸류에이션"],
        easyMeaning: "회사가 1년간 벌어들이는 순이익 대비 현재 주가가 몇 배인지 나타내는 지표로, 선행 PER은 앞으로 1년간 벌어들일 예상 이익 기준입니다."
    },
    {
        term: "PBR (주가순자산비율)",
        keywords: ["pbr"],
        easyMeaning: "회사가 가진 전체 순자산(장부가치) 대비 주가가 몇 배인지 나타내며, 1배 미만이면 장부가치보다 주가가 저렴하다는 뜻입니다."
    },
    {
        term: "CapEx (설비투자)",
        keywords: ["capex", "설비투자", "데이터센터"],
        easyMeaning: "기업이 미래 성장을 위해 공장 증설, AI 데이터센터 서버 확충 등에 투자하는 자금입니다."
    },
    {
        term: "SMR (소형모듈원전)",
        keywords: ["smr", "소형모듈원전", "원전"],
        easyMeaning: "공장에서 모듈 형태로 제작해 조립할 수 있는 차세대 소형 원자력발전소로, AI 데이터센터 전력 공급의 핵심 대안입니다."
    },
    {
        term: "HBM / 파운드리 / ASIC",
        keywords: ["hbm", "dram", "파운드리", "asic", "cowos", "블랙웰"],
        easyMeaning: "AI 서버에 들어가는 초고속 메모리(HBM), 맞춤형 AI 반도체(ASIC), 그리고 이를 위탁생산하는 초미세 공정(파운드리) 기술입니다."
    },
    {
        term: "커버드콜 (Covered Call)",
        keywords: ["커버드콜", "콜옵션", "월배당", "분배금"],
        easyMeaning: "우량 주식을 보유하면서 동시에 콜옵션(살 수 있는 권리)을 팔아 옵션 프리미엄 수익으로 매달 높은 배당(분배금)을 지급하는 ETF 전략입니다."
    },
    {
        term: "ETF 괴리율 & 총보수",
        keywords: ["괴리율", "총보수", "환헤지", "기초지수"],
        easyMeaning: "괴리율은 ETF에 담긴 실제 주식들의 가치(순자산가치)와 시장 거래 가격의 차이이며, 괴리율이 작을수록 제값에 거래되는 좋은 ETF입니다."
    },
    {
        term: "선물 롤오버 (Roll-over) & 증거금",
        keywords: ["롤오버", "증거금", "선물", "만기", "헤지"],
        easyMeaning: "선물은 만기가 있는 계약이므로 만기 전에 다음 달 계약(차월물)으로 갈아타는 것을 '롤오버'라고 하며, 계약 유지를 위해 계좌에 넣어두는 보증금을 '증거금'이라 합니다."
    },
    {
        term: "VIX 지수 (월가 공포지수)",
        keywords: ["vix", "공포지수", "변동성"],
        easyMeaning: "앞으로 30일 동안 S&P500 지수가 얼마나 출렁일지 옵션 시장 참여자들의 불안감을 수치화한 지표입니다. 높을수록 시장 공포가 극에 달했음을 뜻합니다."
    },
    {
        term: "수주잔고 & Capa (생산능력)",
        keywords: ["수주", "capa", "캐파", "가동률"],
        easyMeaning: "수주잔고는 이미 계약해 둔 밀린 일감 총액이며, Capa(캐파)는 공장에서 최대로 찍어낼 수 있는 생산 능력을 뜻합니다."
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

const QUICK_CHIPS_BY_TAB: Record<MainTabType, { label: string; query: string }[]> = {
    kr_company: [
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
    ],
    us_stock: [
        { label: "전체 미국 빅테크 10선", query: "" },
        { label: "🔥 엔비디아 (NVDA)", query: "NVDA" },
        { label: "🚗 테슬라 (TSLA)", query: "TSLA" },
        { label: "🍎 애플 (AAPL)", query: "AAPL" },
        { label: "☁️ 마이크로소프트 (MSFT)", query: "MSFT" },
        { label: "🛡️ 팔란티어 (PLTR)", query: "PLTR" },
        { label: "📡 브로드컴 (AVGO)", query: "AVGO" },
        { label: "🏭 TSMC (TSM)", query: "TSM" },
        { label: "📱 메타 (META)", query: "META" },
        { label: "🔍 구글 (GOOGL)", query: "GOOGL" },
        { label: "📦 아마존 (AMZN)", query: "AMZN" },
    ],
    etf: [
        { label: "전체 한·미 대표 ETF", query: "" },
        { label: "🚀 QQQ (미국 나스닥100)", query: "QQQ" },
        { label: "🇺🇸 SPY (미국 S&P500)", query: "SPY" },
        { label: "💾 SOXX (미국 반도체)", query: "SOXX" },
        { label: "💰 SCHD (미국 배당성장)", query: "SCHD" },
        { label: "🏦 TLT (미국 20년 장기국채)", query: "TLT" },
        { label: "💵 JEPI (커버드콜 월배당)", query: "JEPI" },
        { label: "🇰🇷 KODEX 200", query: "069500.KS" },
        { label: "🐯 TIGER 미국나스닥100", query: "133690.KS" },
    ],
    futures: [
        { label: "전체 글로벌 핵심 선물", query: "" },
        { label: "📈 나스닥100 선물 (NQ=F)", query: "NQ=F" },
        { label: "📊 S&P500 선물 (ES=F)", query: "ES=F" },
        { label: "🥇 국제 금 선물 (GC=F)", query: "GC=F" },
        { label: "🛢️ WTI 원유 선물 (CL=F)", query: "CL=F" },
        { label: "🥈 국제 은 선물 (SI=F)", query: "SI=F" },
        { label: "⚡ 구리 선물 (HG=F)", query: "HG=F" },
        { label: "🔥 천연가스 선물 (NG=F)", query: "NG=F" },
        { label: "🏦 미 10년 국채금리 (^TNX)", query: "^TNX" },
        { label: "💵 달러 인덱스 (DX-Y.NYB)", query: "DX-Y.NYB" },
        { label: "🚨 VIX 공포지수 (^VIX)", query: "^VIX" },
    ],
    kr_industry: [
        { label: "전체 산업 리포트", query: "" },
        { label: "💾 반도체·IT", query: "반도체" },
        { label: "⚡ 전력·원전", query: "전력" },
        { label: "🏦 은행·금융", query: "은행" },
        { label: "📡 통신", query: "통신" },
        { label: "💊 제약·바이오", query: "바이오" },
        { label: "🚗 자동차", query: "자동차" },
    ],
    kr_macro: [
        { label: "전체 거시경제·금리·시황", query: "" },
        { label: "💵 환율·달러", query: "환율" },
        { label: "🏦 금리·채권", query: "금리" },
        { label: "🇺🇸 미국 지표(CPI·고용)", query: "미국" },
        { label: "📊 ETF 전략", query: "ETF" },
    ],
};

const FALLBACK_KR_REPORTS: ResearchReportItem[] = [
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
            "팀코리아 체코 원전 우선협상대상자 선정에 따른 본계약 체결 및 추가 수주 가시화.",
            "뉴스케일파워 등 글로벌 SMR(소형모듈원전) 주기기 파운드리 공급 계약 가속화.",
            "가스터빈 국산화 성공 및 발전 플랜트 주기기 납품을 통한 중장기 실적 개선."
        ],
        easy_summary: "[두산에너빌리티] 대형원전 및 글로벌 SMR 추가 수주 기대감을 분석한 리포트입니다. 체코 원전 본계약 체결과 빅테크 AI 전력 인프라 수요에 따른 실적 턴어라운드가 기대됩니다.",
        checkpoint: "향후 공시(DART)되는 수주·공급계약 규모와 분기 영업이익률 추이를 함께 확인해 보세요.",
        naver_url: "https://stock.naver.com/research/company/96804"
    }
];

export default function MultiAssetResearchPage() {
    const [mainTab, setMainTab] = useState<MainTabType>("kr_company");
    const [macroSubCat, setMacroSubCat] = useState<"economy" | "debenture" | "market" | "invest">("economy");
    const [searchInput, setSearchInput] = useState<string>("");
    const [activeQuery, setActiveQuery] = useState<string>("");
    const [selectedBroker, setSelectedBroker] = useState<string>("ALL");

    // 국내 리포트 상태
    const [krItems, setKrItems] = useState<ResearchReportItem[]>(FALLBACK_KR_REPORTS);
    const [consensus, setConsensus] = useState<ConsensusSummary | null>(null);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [page, setPage] = useState<number>(0);

    // 멀티에셋(해외주식 / ETF / 선물) 리서치 상태
    const [multiItems, setMultiItems] = useState<MultiAssetResearchItem[]>([]);
    const [relatedKrReports, setRelatedKrReports] = useState<ResearchReportItem[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);

    const isMultiAssetTab = mainTab === "us_stock" || mainTab === "etf" || mainTab === "futures";

    const fetchKrResearch = useCallback(async (cat: string, q: string, pageNum: number, append: boolean = false) => {
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
                        setKrItems(prev => [...prev, ...data.items]);
                    } else {
                        setKrItems(data.items.length > 0 ? data.items : (q ? [] : FALLBACK_KR_REPORTS));
                        setConsensus(data.consensus || null);
                        setTotalCount(Number(data.total_count) || data.items.length);
                        setSelectedBroker("ALL");
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch KR research reports:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const fetchMultiAssetResearch = useCallback(async (assetType: "us_stock" | "etf" | "futures", q: string) => {
        setLoading(true);
        try {
            const url = `${API_BASE_URL}/api/market/multi-asset-research?asset_type=${encodeURIComponent(assetType)}&q=${encodeURIComponent(q)}`;
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                if (data.status === "success") {
                    setMultiItems(Array.isArray(data.items) ? data.items : []);
                    setRelatedKrReports(Array.isArray(data.related_securities_reports) ? data.related_securities_reports : []);
                }
            }
        } catch (err) {
            console.error("Failed to fetch multi-asset research:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setPage(0);
        if (mainTab === "us_stock" || mainTab === "etf" || mainTab === "futures") {
            fetchMultiAssetResearch(mainTab, activeQuery);
        } else if (mainTab === "kr_company") {
            fetchKrResearch("company", activeQuery, 0, false);
        } else if (mainTab === "kr_industry") {
            fetchKrResearch("industry", activeQuery, 0, false);
        } else {
            fetchKrResearch(macroSubCat, activeQuery, 0, false);
        }
    }, [mainTab, macroSubCat, activeQuery, fetchKrResearch, fetchMultiAssetResearch]);

    const handleTabSwitch = (nextTab: MainTabType) => {
        setMainTab(nextTab);
        setSearchInput("");
        setActiveQuery("");
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setActiveQuery(searchInput.trim());
    };

    const handleQuickSelect = (q: string) => {
        setSearchInput(q);
        setActiveQuery(q);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        const cat = mainTab === "kr_company" ? "company" : mainTab === "kr_industry" ? "industry" : macroSubCat;
        fetchKrResearch(cat, activeQuery, nextPage, true);
    };

    const availableBrokers = Array.from(new Set(krItems.map(i => i.broker))).filter(Boolean);
    const displayedKrItems = selectedBroker === "ALL"
        ? krItems
        : krItems.filter(i => i.broker === selectedBroker);

    const quickChips = QUICK_CHIPS_BY_TAB[mainTab] || [];

    const searchPlaceholder =
        mainTab === "kr_company"
            ? "국내 종목명(예: 삼성전자, SK하이닉스, 두산에너빌리티, 현대차) 또는 6자리 코드 입력..."
            : mainTab === "us_stock"
                ? "미국 주식 한글명 또는 티커 입력 (예: 엔비디아, NVDA, 테슬라, TSLA, PLTR, IONQ, LLY)..."
                : mainTab === "etf"
                    ? "미국·국내 ETF 티커 또는 이름 입력 (예: QQQ, SPY, SOXX, SCHD, TLT, JEPI, KODEX 200)..."
                    : mainTab === "futures"
                        ? "선물 종목명 또는 심볼 입력 (예: 나스닥 선물, 금 선물, 원유, 구리, 천연가스, 국채, 달러)..."
                        : "산업명 또는 거시경제 키워드 입력 (예: 반도체, 원전, 환율, 금리, CPI)...";

    return (
        <div className="min-h-screen bg-[#07080d] text-gray-100 p-4 md:p-8 max-w-6xl mx-auto relative overflow-hidden font-sans pb-24">
            {/* Ambient Glow */}
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
                            <span>MULTI-ASSET RESEARCH CENTER</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            국내·해외주식 · ETF · 선물 통합 리서치 센터
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">
                            국내 증권사 종목·산업 리포트부터 미국 빅테크 월가 컨센서스, 대표 ETF, 글로벌 선물 시황까지 핵심 요약으로 깔끔하게 확인하세요.
                        </p>
                    </div>
                </div>

                {/* 6대 자산군 마스터 탭 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                        { id: "kr_company", label: "🇰🇷 국내 종목별", sub: "증권사 목표주가·실적" },
                        { id: "us_stock", label: "🇺🇸 해외 주식", sub: "월가 IB 목표가·빅테크" },
                        { id: "etf", label: "📊 국내·미국 ETF", sub: "지수·배당·채권 ETF" },
                        { id: "futures", label: "⚡ 선물·원자재·금리", sub: "나스닥·금·원유·국채" },
                        { id: "kr_industry", label: "🏭 산업·섹터", sub: "반도체·원전·바이오" },
                        { id: "kr_macro", label: "🌐 거시경제·채권", sub: "환율·금리·시황전략" },
                    ].map((t) => {
                        const active = mainTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => handleTabSwitch(t.id as MainTabType)}
                                className={`p-3 rounded-2xl text-left transition-all cursor-pointer border flex flex-col justify-between ${
                                    active
                                        ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.01]"
                                        : "bg-zinc-950/80 text-zinc-300 border-white/10 hover:bg-zinc-900 hover:border-white/20"
                                }`}
                            >
                                <span className="text-xs sm:text-sm font-black block">{t.label}</span>
                                <span className={`text-[10px] mt-1 block ${active ? "text-purple-100 font-semibold" : "text-zinc-400"}`}>
                                    {t.sub}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 검색 바 */}
                <form onSubmit={handleSearchSubmit} className="relative flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 text-purple-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={searchPlaceholder}
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
                        <span>리서치 검색</span>
                    </button>
                </form>

                {/* 자산군별 인기 종목 원클릭 퀵칩 */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>인기 종목 바로가기</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {quickChips.map((chip) => {
                            const isSelected = activeQuery === chip.query;
                            return (
                                <button
                                    key={chip.label}
                                    type="button"
                                    onClick={() => handleQuickSelect(chip.query)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                        isSelected
                                            ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                            : "bg-zinc-900/90 text-zinc-300 border-white/10 hover:bg-zinc-800 hover:text-white"
                                    }`}
                                >
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ===================================================================== */}
            {/* MODE A: 해외주식(us_stock) · ETF(etf) · 선물·원자재(futures) 멀티에셋 뷰 */}
            {/* ===================================================================== */}
            {isMultiAssetTab ? (
                <div className="space-y-8">
                    {loading ? (
                        <div className="py-20 text-center space-y-3 bg-zinc-900/40 rounded-3xl border border-white/10">
                            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                            <p className="text-sm font-bold text-zinc-300">
                                실시간 글로벌 시세, 월가 IB 컨센서스 및 기술적 추세 데이터를 분석하고 있습니다...
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5">
                                {multiItems.map((mItem) => {
                                    const combinedText = `${mItem.name} ${mItem.sector} ${(mItem.summary_points || []).join(" ")} ${mItem.easy_summary} ${mItem.checkpoint}`;
                                    const terms = getMatchedTerms(combinedText, 3);
                                    const isUp = mItem.change_pct >= 0;

                                    return (
                                        <article
                                            key={mItem.id}
                                            className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-zinc-900/95 via-zinc-900/80 to-zinc-950 border border-purple-500/30 hover:border-purple-400/60 transition-all shadow-xl space-y-5"
                                        >
                                            {/* 상단 종목 헤더 & 실시간 시세/컨센서스 배지 */}
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                                                <div className="space-y-1.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black font-mono">
                                                            {mItem.symbol}
                                                        </span>
                                                        <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/35 text-xs font-bold">
                                                            {mItem.sector}
                                                        </span>
                                                        <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-bold">
                                                            {mItem.trend_badge}
                                                        </span>
                                                        {mItem.opinion && (
                                                            <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/35 text-xs font-black">
                                                                월가 의견: {mItem.opinion}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                                                        <span>{mItem.name}</span>
                                                    </h3>
                                                </div>

                                                {/* 우측 현재가 & 월가 목표주가 요약 박스 */}
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="px-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 flex flex-col">
                                                        <span className="text-[10px] text-zinc-400 font-bold">현재 시세 (일일 등락)</span>
                                                        <div className="flex items-baseline gap-2 mt-0.5">
                                                            <span className="text-base sm:text-lg font-black text-white font-mono">
                                                                {mItem.price}
                                                            </span>
                                                            <span className={`text-xs font-black font-mono ${isUp ? "text-rose-400" : "text-blue-400"}`}>
                                                                {isUp ? `+${mItem.change_pct}%` : `${mItem.change_pct}%`}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {mItem.target_mean && (
                                                        <div className="px-4 py-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/35 flex flex-col">
                                                            <span className="text-[10px] text-emerald-300 font-bold">
                                                                🎯 제3자 월가 IB 목표가 평균 {mItem.analyst_count ? `(${mItem.analyst_count}개 기관 집계)` : ""}
                                                            </span>
                                                            <div className="flex items-baseline gap-2 mt-0.5">
                                                                <span className="text-base sm:text-lg font-black text-emerald-300 font-mono">
                                                                    {mItem.target_mean}
                                                                </span>
                                                                {mItem.upside_pct !== null && mItem.upside_pct !== undefined && (
                                                                    <span className={`text-xs font-black font-mono ${mItem.upside_pct >= 0 ? "text-amber-300" : "text-zinc-400"}`}>
                                                                        (컨센서스 괴리율 {mItem.upside_pct >= 0 ? `+${mItem.upside_pct}%` : `${mItem.upside_pct}%`})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Link
                                                        href={`/discovery?q=${encodeURIComponent(mItem.symbol)}`}
                                                        className="px-3.5 py-2.5 rounded-2xl bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 border border-blue-400/40 text-xs font-black flex items-center gap-1.5 transition-all"
                                                    >
                                                        <BarChart3 className="w-4 h-4 text-blue-300" />
                                                        <span>상세 차트 분석</span>
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* 핵심 퀀트 지표 미니 그리드 */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                <div className="p-3 rounded-xl bg-black/35 border border-white/5">
                                                    <span className="text-[11px] text-zinc-400 block">50일 이동평균선</span>
                                                    <span className="text-xs sm:text-sm font-black text-zinc-100 font-mono mt-0.5 block">
                                                        {mItem.ma50}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-black/35 border border-white/5">
                                                    <span className="text-[11px] text-zinc-400 block">최근 고점 (High)</span>
                                                    <span className="text-xs sm:text-sm font-black text-rose-300 font-mono mt-0.5 block">
                                                        {mItem.high_52w}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-black/35 border border-white/5">
                                                    <span className="text-[11px] text-zinc-400 block">최근 저점 (Low)</span>
                                                    <span className="text-xs sm:text-sm font-black text-blue-300 font-mono mt-0.5 block">
                                                        {mItem.low_52w}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-black/35 border border-white/5">
                                                    <span className="text-[11px] text-zinc-400 block">
                                                        {mItem.target_high ? "월가 IB 최고/최저 컨센서스" : mItem.div_yield ? "연간 분배(배당)수익률" : "선행 PER / 구분"}
                                                    </span>
                                                    <span className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5 block">
                                                        {mItem.target_high
                                                            ? `${mItem.target_high} / ${mItem.target_low}`
                                                            : mItem.div_yield
                                                                ? `연 ${mItem.div_yield}%`
                                                                : mItem.forward_pe
                                                                    ? `PER ${mItem.forward_pe}배`
                                                                    : mItem.sector}
                                                    </span>
                                                </div>
                                            </div>

                                            {mItem.company_profile && (
                                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                                                    <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-black text-amber-300">🏢 어떤 회사(상품)인가요? · {mItem.name}</div>
                                                        <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed">{mItem.company_profile}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 1순위: 핵심 요약 & 체크포인트 */}
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                                                <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/45 via-indigo-950/30 to-zinc-900/80 border border-purple-500/35 space-y-2 shadow-inner">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-black text-purple-200">
                                                            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                                                            <span>한눈에 보는 핵심 요약</span>
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/25">
                                                            핵심 브리핑
                                                        </span>
                                                    </div>
                                                    <p className="text-sm sm:text-[15px] text-white font-medium leading-relaxed">
                                                        {mItem.easy_summary.replace(/^\[[^\]]+\]\s*/, "")}
                                                    </p>
                                                </div>

                                                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-zinc-900/80 border border-emerald-500/30 space-y-2 flex flex-col justify-center">
                                                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-black text-emerald-300">
                                                        <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                                                        <span>체크포인트</span>
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed">
                                                        {mItem.checkpoint}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 2순위: 리서치 세부 수치 및 핵심 포인트 */}
                                            <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
                                                <div className="text-xs font-black text-zinc-300 flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                                                    <span>
                                                        {mainTab === "us_stock"
                                                            ? "월가 컨센서스 & 핵심 지표"
                                                            : mainTab === "etf"
                                                                ? "ETF 구조 & 시세 요약"
                                                                : "선물 시세 & 핵심 포인트"}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {mItem.summary_points.map((pt, pIdx) => (
                                                        <div key={pIdx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                                                            <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-black font-mono flex items-center justify-center shrink-0 mt-0.5">
                                                                {pIdx + 1}
                                                            </span>
                                                            <span className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                                                                {pt}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 3순위: 용어 자동 풀이 */}
                                            {terms.length > 0 && (
                                                <div className="pt-3 border-t border-white/10 space-y-2.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                                        <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                                                        <span>함께 알아두면 좋은 금융 용어</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                        {terms.map((t, tIdx) => (
                                                            <div key={tIdx} className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 flex flex-col gap-1">
                                                                <span className="text-xs font-black text-amber-300">• {t.term}</span>
                                                                <span className="text-xs text-zinc-200 leading-relaxed">{t.easyMeaning}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>

                            {/* 연관 국내 증권사 실제 발표 리포트 (해외/ETF/선물 연관) */}
                            {relatedKrReports.length > 0 && (
                                <section className="p-6 rounded-3xl bg-zinc-900/60 border border-blue-500/30 space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                        <div>
                                            <span className="text-[11px] font-mono font-bold text-blue-400 uppercase">
                                                THIRD-PARTY SECURITIES FIRM REPORTS
                                            </span>
                                            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                                                📑 국내 제도권 증권사가 공개 발표한 {mainTab === "us_stock" ? "미국·글로벌 증시" : mainTab === "etf" ? "ETF·자산배분" : "거시경제·금리·선물"} 최신 리포트 인용
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {relatedKrReports.map((rep, rIdx) => (
                                            <div key={`${rep.id}_${rIdx}`} className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5 flex flex-col justify-between">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black">
                                                            {rep.broker} (외부 기관)
                                                        </span>
                                                        <span className="text-[11px] font-mono text-zinc-400">{rep.date}</span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-white leading-snug">{rep.title}</h4>
                                                    {(rep.easy_summary || rep.summary_points?.[0]) && (
                                                        <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                                                            • {rep.easy_summary || rep.summary_points?.[0]}
                                                        </p>
                                                    )}
                                                </div>
                                                {rep.naver_url && (
                                                    <a
                                                        href={rep.naver_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-300 hover:text-blue-200 self-end"
                                                    >
                                                        <span>증권사 리포트 원문 보기</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* ===================================================================== */
                /* MODE B: 국내 종목별(kr_company) · 산업별(kr_industry) · 거시/채권(kr_macro) */
                /* ===================================================================== */
                <>
                    {/* 거시경제·채권·시황 세부 탭 */}
                    {mainTab === "kr_macro" && (
                        <div className="flex flex-wrap items-center gap-2 mb-5">
                            {[
                                { id: "economy", label: "🌐 거시경제·환율·물가 분석" },
                                { id: "debenture", label: "🏦 채권·국고채·금리 분석" },
                                { id: "market", label: "📊 데일리 증시 시황" },
                                { id: "invest", label: "🧭 포트폴리오·시장동향" },
                            ].map((st) => (
                                <button
                                    key={st.id}
                                    onClick={() => setMacroSubCat(st.id as any)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer border transition-all ${
                                        macroSubCat === st.id
                                            ? "bg-blue-600 text-white border-blue-400 shadow-md"
                                            : "bg-zinc-900 text-zinc-300 border-white/10 hover:bg-zinc-800"
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 증권사별 필터 */}
                    {availableBrokers.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5">
                            <Filter className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <button
                                onClick={() => setSelectedBroker("ALL")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer border ${
                                    selectedBroker === "ALL"
                                        ? "bg-purple-500/30 text-purple-200 border-purple-400/50"
                                        : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                                }`}
                            >
                                전체 증권사 ({krItems.length})
                            </button>
                            {availableBrokers.slice(0, 8).map((brk) => (
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

                    {/* 특정 국내 종목 검색 시: 🎯 목표주가 컨센서스 요약 보드 */}
                    {consensus && activeQuery && mainTab === "kr_company" && (
                        <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/95 to-teal-950/30 border border-emerald-500/35 shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                                        <Target className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                증권사 컨센서스 요약
                                            </span>
                                            {consensus.stock_code && (
                                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-200">
                                                    {consensus.stock_code}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                                            {consensus.stock_name} · 증권사 목표주가 한눈에 보기 (최근 {consensus.report_count}건 집계)
                                        </h2>
                                    </div>
                                </div>

                                <Link
                                    href={`/discovery?q=${encodeURIComponent(consensus.stock_code || consensus.stock_name)}`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-md transition-all self-start sm:self-center"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    <span>{consensus.stock_name} 실시간 차트·수급 보기</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/30">
                                    <span className="text-xs font-bold text-zinc-300 block">🎯 증권사 평균 목표가</span>
                                    <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-1 block">
                                        {consensus.avg_goal_price}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 mt-0.5 block">전문가 평균 눈높이</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-black/50 border border-rose-500/30">
                                    <span className="text-xs font-bold text-zinc-300 block">📈 증권사 최고 목표가</span>
                                    <span className="text-xl sm:text-2xl font-black text-rose-300 font-mono mt-1 block">
                                        {consensus.max_goal_price}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 mt-0.5 block">가장 긍정적인 목표치</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-black/50 border border-blue-500/30">
                                    <span className="text-xs font-bold text-zinc-300 block">📉 증권사 최저 목표가</span>
                                    <span className="text-xl sm:text-2xl font-black text-blue-300 font-mono mt-1 block">
                                        {consensus.min_goal_price}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 mt-0.5 block">가장 보수적인 목표치</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/30">
                                    <span className="text-xs font-bold text-zinc-300 block">📊 매수(Buy) 의견 비율</span>
                                    <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1 block">
                                        {consensus.buy_count}건 <span className="text-sm text-zinc-400">/ {consensus.report_count}건</span>
                                    </span>
                                    <span className="text-[11px] text-zinc-400 mt-0.5 block">최근 발표 리포트 기준</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 리포트 리스트 */}
                    {loading ? (
                        <div className="py-20 text-center space-y-3 bg-zinc-900/40 rounded-3xl border border-white/10">
                            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                            <p className="text-sm font-bold text-zinc-300">
                                증권사 공개 리서치 리포트를 불러오는 중입니다...
                            </p>
                        </div>
                    ) : displayedKrItems.length === 0 ? (
                        <div className="py-16 text-center space-y-4 bg-zinc-900/40 rounded-3xl border border-white/10 p-6">
                            <p className="text-base font-black text-white">
                                &lsquo;{activeQuery}&rsquo;에 대한 리포트를 찾지 못했습니다.
                            </p>
                            <p className="text-xs text-zinc-400">
                                해외 주식(엔비디아·테슬라 등)이나 ETF·선물을 찾으신다면 상단의 <strong>🇺🇸 해외 주식 / 📊 ETF / ⚡ 선물·원자재</strong> 탭을 눌러보세요!
                            </p>
                            <button
                                onClick={() => handleQuickSelect("")}
                                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer"
                            >
                                전체 최신 리포트 보기
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {displayedKrItems.map((item, idx) => {
                                const combinedText = `${item.title} ${(item.summary_points || []).join(" ")} ${item.easy_summary}`;
                                const terms = getMatchedTerms(combinedText, 3);
                                const cleanEasySummary = (item.easy_summary || "").replace(/^\[[^\]]+\]\s*/, "");

                                // 원문 문장 내 영어 약어(3Q26 Preview 등)를 친절한 한글로 자동 병기
                                const formatRawPoint = (rawPt: string) => {
                                    return rawPt
                                        .replace(/([1-4])Q(\d{2})\s*Preview\s*:?/gi, "[$2년 $1분기 실적 전망] ")
                                        .replace(/([1-4])Q(\d{2})\s*Review\s*:?/gi, "[$2년 $1분기 실적 리뷰] ")
                                        .replace(/(\d)\s+(조|억|만|원)/g, "$1$2");
                                };

                                return (
                                    <article
                                        key={`${item.id}_${idx}`}
                                        className="p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/95 to-zinc-950 border border-white/15 hover:border-purple-500/45 transition-all shadow-2xl space-y-5"
                                    >
                                        {/* 카드 상단: 좌측(종목·증권사·리포트 제목) + 우측(목표주가·투자의견 스코어보드 & 바로가기) */}
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                                            <div className="space-y-2.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {item.item_name && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (mainTab === "kr_company") {
                                                                    handleQuickSelect(item.item_code || item.item_name);
                                                                }
                                                            }}
                                                            className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer transition-colors"
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

                                                    <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/35 text-xs font-black flex items-center gap-1.5">
                                                        <Award className="w-3.5 h-3.5 text-purple-300" />
                                                        <span>{item.broker}</span>
                                                        {item.analyst && (
                                                            <span className="text-[11px] text-purple-300/80 font-medium">
                                                                · {item.analyst}
                                                            </span>
                                                        )}
                                                    </span>

                                                    <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400 px-2 py-0.5 rounded-lg bg-white/5">
                                                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                        {item.date}
                                                    </span>

                                                    {item.read_count > 0 && (
                                                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-400 px-2 py-0.5 rounded-lg bg-white/5">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            {item.read_count.toLocaleString()}명 열람
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight">
                                                    {item.title}
                                                </h3>
                                            </div>

                                            {/* 우측: 한눈에 보는 목표주가 · 의견 스코어보드 & 액션 버튼 */}
                                            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                                {item.opinion && (
                                                    <div className="px-3.5 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/35 flex flex-col">
                                                        <span className="text-[10px] font-bold text-rose-300/80">증권사 투자의견</span>
                                                        <span className="text-xs sm:text-sm font-black text-rose-300 mt-0.5">
                                                            {item.opinion}
                                                        </span>
                                                    </div>
                                                )}

                                                {item.goal_price && (
                                                    <div className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex flex-col">
                                                        <span className="text-[10px] font-bold text-emerald-300/80">🎯 증권사 제시 목표가</span>
                                                        <span className="text-sm sm:text-base font-black text-emerald-300 font-mono mt-0.5">
                                                            {item.goal_price}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    {item.item_code && (
                                                        <Link
                                                            href={`/discovery?q=${encodeURIComponent(item.item_code)}`}
                                                            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/35 text-xs font-black transition-colors"
                                                        >
                                                            <BarChart3 className="w-3.5 h-3.5 text-blue-300" />
                                                            <span>차트·수급</span>
                                                        </Link>
                                                    )}
                                                    {item.naver_url && (
                                                        <a
                                                            href={item.naver_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/15 text-xs font-black transition-colors"
                                                        >
                                                            <span>원문 리포트</span>
                                                            <ExternalLink className="w-3.5 h-3.5 text-purple-300" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 어떤 회사인지 간단 소개 */}
                                        {item.company_profile && (
                                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                                                <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <div className="text-xs font-black text-amber-300">🏢 어떤 회사인가요? · {item.item_name}</div>
                                                    <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed">{item.company_profile}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* 1순위: 한눈에 보는 핵심 요약 & 체크포인트 */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                                            <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/45 via-indigo-950/30 to-zinc-900/85 border border-purple-500/35 space-y-2 shadow-inner">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-black text-purple-200">
                                                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                                                        <span>한눈에 보는 핵심 요약</span>
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/25">
                                                        핵심 브리핑
                                                    </span>
                                                </div>
                                                <p className="text-sm sm:text-[15px] text-white font-medium leading-relaxed">
                                                    {cleanEasySummary}
                                                </p>
                                            </div>

                                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-zinc-900/85 border border-emerald-500/30 space-y-2 flex flex-col justify-center">
                                                <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-black text-emerald-300">
                                                    <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    <span>핵심 체크포인트</span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed">
                                                    {item.checkpoint}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 2순위: 리포트 3줄 핵심 정리 */}
                                        {item.summary_points && item.summary_points.length > 0 && (
                                            <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="text-xs font-black text-zinc-300 flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                                                        <span>리포트 3줄 핵심 정리</span>
                                                    </div>
                                                    <span className="text-[11px] text-zinc-400 font-medium">
                                                        {item.broker} 발표 데이터 기반
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {item.summary_points.map((pt, pIdx) => (
                                                        <div
                                                            key={pIdx}
                                                            className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.025] border border-white/5"
                                                        >
                                                            <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-black font-mono flex items-center justify-center shrink-0 mt-0.5">
                                                                {pIdx + 1}
                                                            </span>
                                                            <span className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                                                                {formatRawPoint(pt)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 3순위: 어려운 금융·회계 용어 자동 풀이 */}
                                        {terms.length > 0 && (
                                            <div className="pt-3 border-t border-white/10 space-y-2.5">
                                                <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                                    <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                                                    <span>함께 알아두면 좋은 금융 용어</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                    {terms.map((t, tIdx) => (
                                                        <div key={tIdx} className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 flex flex-col gap-1">
                                                            <span className="text-xs font-black text-amber-300">• {t.term}</span>
                                                            <span className="text-xs text-zinc-200 leading-relaxed">{t.easyMeaning}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 카드 하단 깔끔한 출처 및 안내 */}
                                        <div className="pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                                            <span>
                                                📌 {item.broker} 공개 리포트 요약 · 투자 권유가 아닌 참고용 학습 자료입니다.
                                            </span>
                                            {item.naver_url && (
                                                <a
                                                    href={item.naver_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-purple-400 hover:text-purple-300 font-bold inline-flex items-center gap-1"
                                                >
                                                    <span>공식 원문 보기</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}

                            {krItems.length >= 15 && (
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
                </>
            )}

            {/* 저작권법 및 자본시장법 준수 안내 */}
            <div className="mt-10 p-5 sm:p-6 rounded-3xl bg-zinc-950/90 border border-white/10 space-y-2 text-xs text-zinc-400 leading-relaxed">
                <p className="text-amber-300 font-black text-xs sm:text-sm">
                    ⚖️ 리서치 이용 및 법적 안내
                </p>
                <p>
                    • 본 리서치 센터는 무료 금융 데이터·용어 학습 공간이며, 특정 종목의 매수·매도를 권유하지 않습니다.<br />
                    • 표시되는 목표주가와 투자의견은 각 증권사 및 글로벌 투자은행(IB)이 공개 발표한 컨센서스 수치를 집계한 참고 자료입니다.<br />
                    • 저작권 보호를 위해 리포트 원문이나 PDF는 직접 제공하지 않으며, 상세 원문은 각 카드의 <strong>[원문 리포트 ↗]</strong> 공식 링크에서 열람하실 수 있습니다.
                </p>
            </div>

            <div className="mt-8">
                <KakaoRevenueAd type="feed" />
            </div>

            <SeoContentBlock
                pageTitle="국내주식 · 해외주식(월가 IB) · ETF · 선물 통합 리서치 센터"
                pageDescription="국내 상장 종목 증권사 리포트, 미국 빅테크(엔비디아·테슬라·애플) 월가 투자은행 목표주가 컨센서스, 한·미 대표 ETF(QQQ·SPY·SCHD·TLT) 및 나스닥·금·원유·국채 선물 리서치 분석을 제공합니다."
            />
        </div>
    );
}
