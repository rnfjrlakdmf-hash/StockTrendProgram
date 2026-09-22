"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sparkles, Rocket, Cpu, Plane, Bot, Coins, Dna, ArrowUpRight, TrendingUp, ShieldCheck, Zap, Flame, RefreshCw, Loader2, Award, Star } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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

export interface LiveEmergingStock {
    ticker: string;
    nameKo: string;
    nameEn: string;
    exchange: string;
    category: string;
    categoryLabel: string;
    icon: string;
    oneLiner: string;
    highlight: string;
    tags: string[];
    price: number;
    prev_close: number;
    change_pct: number;
    vol_ratio: number;
    hot_badge: string;
    badge_type: string;
    momentum_score: number;
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

    // 4. 차세대 AI
    {
        ticker: "PLTR",
        nameKo: "팔란티어",
        nameEn: "Palantir Technologies",
        exchange: "NYSE",
        category: "ai",
        categoryLabel: "차세대 AI",
        icon: "🤖",
        oneLiner: "정부 정보기관 및 글로벌 기업을 위한 AI 구동 엔터프라이즈 데이터 플랫폼",
        tags: ["#AI운영체제", "#미국방부채택", "#S&P500편입"],
        highlight: "S&P 500 편입 및 생성형 AI 플랫폼(AIP) 폭발적 채택"
    },
    {
        ticker: "SMCI",
        nameKo: "슈퍼마이크로컴퓨터",
        nameEn: "Super Micro Computer",
        exchange: "NASDAQ",
        category: "ai",
        categoryLabel: "차세대 AI",
        icon: "🖥️",
        oneLiner: "엔비디아 GPU를 탑재하는 고성능 액체냉각 AI 서버 랙 인프라 세계 1위",
        tags: ["#AI데이터센터", "#액체냉각서버", "#엔비디아파트너"],
        highlight: "생성형 AI 데이터센터 증설에 필수적인 액체 냉각 솔루션"
    },
    {
        ticker: "AI",
        nameKo: "C3.ai",
        nameEn: "C3.ai, Inc.",
        exchange: "NYSE",
        category: "ai",
        categoryLabel: "차세대 AI",
        icon: "⚡",
        oneLiner: "석유, 화학, 방산, 금융 산업에 맞춤형 엔터프라이즈 생성형 AI 애플리케이션 공급",
        tags: ["#기업용생성형AI", "#산업용AI", "#빅데이터분석"],
        highlight: "포춘 500대 기업 및 미 공군 대상 대규모 엔터프라이즈 계약"
    },

    // 5. 핀테크
    {
        ticker: "SOFI",
        nameKo: "소파이 테크놀로지스",
        nameEn: "SoFi Technologies",
        exchange: "NASDAQ",
        category: "fintech",
        categoryLabel: "혁신 핀테크",
        icon: "💳",
        oneLiner: "학자금 대출부터 예금, 주식, 가상자산까지 모바일 앱 하나로 끝내는 미국 대표 네오뱅크",
        tags: ["#디지털금융", "#네오뱅크", "#흑자전환달성"],
        highlight: "미국 2030 세대 필수 올인원 금융 플랫폼으로 급성장"
    },
    {
        ticker: "COIN",
        nameKo: "코인베이스",
        nameEn: "Coinbase Global",
        exchange: "NASDAQ",
        category: "fintech",
        categoryLabel: "혁신 핀테크",
        icon: "🪙",
        oneLiner: "미국 최초로 나스닥에 직상장된 최대 제도권 암호화폐 거래소 및 기관 수탁사",
        tags: ["#비트코인ETF수탁", "#가상자산거래소", "#제도권금융"],
        highlight: "비트코인 및 이더리움 현물 ETF 대다수의 공식 커스터디 수탁 파트너"
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
        oneLiner: "노벨 화학상 수상 3세대 유전자 가위(CRISPR-Cas9) 기술로 난치병 치료제 개발",
        tags: ["#유전자가위", "#FDA최초승인", "#희귀병완치도전"],
        highlight: "세계 최초 미국 FDA 승인 유전자 가위 치료제(카스게비) 상용화"
    }
];

export const CATEGORIES = [
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
    const { user } = useAuth();

    // 2대 뷰 모드: live(오늘의 실시간 핫 유망주) vs curated(분야별 대표 혁신주)
    const [viewMode, setViewMode] = useState<"live" | "curated">("live");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const [liveStocks, setLiveStocks] = useState<LiveEmergingStock[]>([]);
    const [loadingLive, setLoadingLive] = useState<boolean>(true);
    const [lastUpdated, setLastUpdated] = useState<string>("");

    // 관심종목 동기화 State
    const [watchlistSet, setWatchlistSet] = useState<Set<string>>(new Set());
    const [togglingTicker, setTogglingTicker] = useState<string | null>(null);

    const fetchWatchlist = useCallback(async () => {
        try {
            const currentUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null) || 'guest';
            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                headers: { "X-User-ID": currentUserId }
            });
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                const set = new Set<string>();
                json.data.forEach((item: any) => {
                    const sym = typeof item === 'string' ? item : item.symbol;
                    if (sym) {
                        set.add(sym.toUpperCase());
                    }
                });
                setWatchlistSet(set);
            }
        } catch (err) {
            console.error("Failed to fetch watchlist in showcase:", err);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchWatchlist();
        const handleWatchlistChanged = () => fetchWatchlist();
        window.addEventListener('watchlistChanged', handleWatchlistChanged);
        return () => window.removeEventListener('watchlistChanged', handleWatchlistChanged);
    }, [fetchWatchlist]);

    const toggleWatchlist = async (ticker: string, nameKo: string, currentPrice?: number) => {
        const sym = ticker.toUpperCase();
        const isSaved = watchlistSet.has(sym);
        const currentUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null) || 'guest';

        setTogglingTicker(sym);
        try {
            if (isSaved) {
                const res = await fetch(`${API_BASE_URL}/api/watchlist/${encodeURIComponent(sym)}`, {
                    method: 'DELETE',
                    headers: { "X-User-ID": currentUserId }
                });
                const json = await res.json();
                if (json.status === 'success') {
                    setWatchlistSet(prev => {
                        const next = new Set(prev);
                        next.delete(sym);
                        return next;
                    });
                    toast.info(`⭐ [${nameKo || sym}] 관심종목에서 해제되었습니다.`);
                    window.dispatchEvent(new CustomEvent('watchlistChanged'));
                } else {
                    toast.error("관심종목 해제 실패: " + (json.message || "오류가 발생했습니다."));
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': currentUserId
                    },
                    body: JSON.stringify({
                        symbol: sym,
                        price: currentPrice || 0
                    })
                });
                const json = await res.json();
                if (json.status === 'success') {
                    setWatchlistSet(prev => {
                        const next = new Set(prev);
                        next.add(sym);
                        return next;
                    });
                    toast.success(`⭐ [${nameKo || sym}] 관심종목에 추가되었습니다!`);
                    window.dispatchEvent(new CustomEvent('watchlistChanged'));
                } else {
                    toast.error("관심종목 추가 실패: " + (json.message || "오류가 발생했습니다."));
                }
            }
        } catch (e) {
            console.error("Watchlist toggle error:", e);
            toast.error("네트워크 통신 중 오류가 발생했습니다.");
        } finally {
            setTogglingTicker(null);
        }
    };

    const fetchLiveStocks = async (isManual = false) => {
        setLoadingLive(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/us-emerging-live?t=${Date.now()}`);
            const data = await res.json();
            if (data.status === "success" && Array.isArray(data.data)) {
                setLiveStocks(data.data);
                setLastUpdated(data.updated_at || "");
            }
        } catch (e) {
            console.error("Failed to fetch live emerging stocks:", e);
        } finally {
            setLoadingLive(false);
        }
    };

    useEffect(() => {
        fetchLiveStocks();
    }, []);

    const filteredCuratedStocks = selectedCategory === "all" 
        ? US_EMERGING_STOCKS 
        : US_EMERGING_STOCKS.filter(s => s.category === selectedCategory);

    return (
        <section className={`w-full rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-950/80 to-slate-900/90 p-5 sm:p-7 backdrop-blur-xl shadow-2xl relative overflow-hidden ${className}`}>
            {/* 앰비언트 글로우 장식 */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            {/* 헤더 타이틀 */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-5 border-b border-white/10">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500/15 via-cyan-500/15 to-indigo-500/15 text-cyan-300 border border-cyan-500/30 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                        <span>초보자 맞춤형 미국 신생 혁신 기업 발굴 엔진</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <span>🚀 지금 월가가 주목하는 미국 혁신 유망주</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        어려운 종목 코드를 몰라도 괜찮습니다. 오늘 미국 시장에서 거래량이 터지고 급등하는 미래 10배 성장 유망주를 실시간으로 확인하고 관심종목(⭐)으로 찜하세요.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>나스닥 / NYSE 실시간 연동</span>
                </div>
            </div>

            {/* 상단 2대 뷰 모드 탭 전환기 */}
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md">
                    <button
                        onClick={() => setViewMode("live")}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                            viewMode === "live"
                                ? "bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 scale-[1.02]"
                                : "text-zinc-400 hover:text-white"
                        }`}
                    >
                        <Flame className="w-4 h-4 text-yellow-200 animate-pulse" />
                        <span>오늘의 실시간 핫 유망주</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 text-amber-200 font-mono">LIVE</span>
                    </button>
                    <button
                        onClick={() => setViewMode("curated")}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                            viewMode === "curated"
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]"
                                : "text-zinc-400 hover:text-white"
                        }`}
                    >
                        <Award className="w-4 h-4 text-cyan-200" />
                        <span>분야별 대표 혁신주 (13선)</span>
                    </button>
                </div>

                {viewMode === "live" && (
                    <div className="flex items-center gap-2">
                        {lastUpdated && (
                            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
                                갱신: {lastUpdated}
                            </span>
                        )}
                        <button
                            onClick={() => fetchLiveStocks(true)}
                            disabled={loadingLive}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                            title="실시간 시세 새로고침"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin text-orange-400' : 'text-zinc-400'}`} />
                            <span>새로고침</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 1. 실시간 핫 유망주 뷰 모드 (오늘 시장 급등/거래량 폭증 순 자동 정렬) */}
            {/* ========================================================================= */}
            {viewMode === "live" && (
                <div>
                    {loadingLive && liveStocks.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-3 animate-pulse">
                                    <div className="h-6 w-3/4 bg-white/10 rounded-lg" />
                                    <div className="h-4 w-full bg-white/5 rounded" />
                                    <div className="h-4 w-2/3 bg-white/5 rounded" />
                                    <div className="h-10 w-full bg-white/5 rounded-xl mt-4" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {liveStocks.map((stock, idx) => {
                                const isSaved = watchlistSet.has(stock.ticker.toUpperCase());
                                return (
                                    <div
                                        key={stock.ticker}
                                        className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-orange-500/40 p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 flex flex-col justify-between"
                                    >
                                        {/* 상단: 아이콘 + 종목명 + 티커 + 실시간 시세 + 관심종목 별표 */}
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shrink-0">
                                                        {stock.icon || "🚀"}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-black font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                #{idx + 1}
                                                            </span>
                                                            <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors truncate">
                                                                {stock.nameKo}
                                                            </h3>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                                            <span className="font-bold text-cyan-400">{stock.ticker}</span>
                                                            <span>•</span>
                                                            <span className="truncate">{stock.nameEn}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 우측: 실시간 주가 & 등락률 & 관심종목 토글 버튼 */}
                                                <div className="flex items-center gap-2 shrink-0 pl-2">
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
                                                            ${stock.price.toFixed(2)}
                                                        </div>
                                                        <div className={`text-xs font-black font-mono flex items-center gap-0.5 ${
                                                            stock.change_pct > 0 ? 'text-rose-400' : stock.change_pct < 0 ? 'text-sky-400' : 'text-zinc-400'
                                                        }`}>
                                                            <span>{stock.change_pct > 0 ? '▲' : stock.change_pct < 0 ? '▼' : ''}</span>
                                                            <span>{stock.change_pct > 0 ? `+${stock.change_pct.toFixed(2)}%` : `${stock.change_pct.toFixed(2)}%`}</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleWatchlist(stock.ticker, stock.nameKo, stock.price);
                                                        }}
                                                        disabled={togglingTicker === stock.ticker.toUpperCase()}
                                                        className={`p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer active:scale-95 shrink-0 ${
                                                            isSaved
                                                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-md shadow-amber-500/10 hover:bg-amber-500/30"
                                                                : "bg-white/5 text-zinc-500 border-white/10 hover:text-amber-300 hover:bg-white/10 hover:border-amber-500/30"
                                                        }`}
                                                        title={isSaved ? "관심종목에서 해제" : "내 관심종목에 추가"}
                                                        aria-label="관심종목 토글"
                                                    >
                                                        {togglingTicker === stock.ticker.toUpperCase() ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                                        ) : (
                                                            <Star className={`w-4 h-4 transition-transform ${isSaved ? "fill-amber-400 text-amber-400 scale-110" : ""}`} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 당일 핫 시그널 배지 (급등/거래량 폭증/눌림목 등) */}
                                            <div className="mb-2.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-sm ${
                                                    stock.badge_type === 'surge'
                                                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                                        : stock.badge_type === 'volume'
                                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                        : stock.badge_type === 'dip'
                                                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                                        : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                                }`}>
                                                    <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                                    <span>{stock.hot_badge}</span>
                                                </span>
                                            </div>

                                            {/* 초보자를 위한 1줄 비즈니스 해설 */}
                                            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal mb-3 line-clamp-2">
                                                {stock.oneLiner}
                                            </p>

                                            {/* 핵심 투자 포인트 하이라이트 칩 */}
                                            <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15 mb-3.5">
                                                <span className="text-[11px] text-cyan-300 font-medium flex items-center gap-1.5 leading-snug">
                                                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                                                    <span>{stock.highlight}</span>
                                                </span>
                                            </div>

                                            {/* 태그 모음 */}
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {stock.tags.map((tag, tIdx) => (
                                                    <span key={tIdx} className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-mono">
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
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. 분야별 대표 혁신 기업 큐레이션 뷰 모드 (검증된 13선 스테디셀러) */}
            {/* ========================================================================= */}
            {viewMode === "curated" && (
                <div>
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
                        {filteredCuratedStocks.map(stock => {
                            const isSaved = watchlistSet.has(stock.ticker.toUpperCase());
                            return (
                                <div
                                    key={stock.ticker}
                                    className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/40 p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between"
                                >
                                    {/* 상단: 아이콘 + 종목명 + 티커 + 거래소 + 관심종목 별표 */}
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

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400">
                                                    {stock.exchange}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleWatchlist(stock.ticker, stock.nameKo);
                                                    }}
                                                    disabled={togglingTicker === stock.ticker.toUpperCase()}
                                                    className={`p-1.5 rounded-xl transition-all border flex items-center justify-center cursor-pointer active:scale-95 shrink-0 ${
                                                        isSaved
                                                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-md shadow-amber-500/10 hover:bg-amber-500/30"
                                                            : "bg-white/5 text-zinc-500 border-white/10 hover:text-amber-300 hover:bg-white/10 hover:border-amber-500/30"
                                                    }`}
                                                    title={isSaved ? "관심종목에서 해제" : "내 관심종목에 추가"}
                                                    aria-label="관심종목 토글"
                                                >
                                                    {togglingTicker === stock.ticker.toUpperCase() ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                                    ) : (
                                                        <Star className={`w-3.5 h-3.5 transition-transform ${isSaved ? "fill-amber-400 text-amber-400 scale-110" : ""}`} />
                                                    )}
                                                </button>
                                            </div>
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
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 하단 안내 문구 */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                <span>※ 미국 신생 혁신 기업은 높은 기술 성장성과 함께 변동성이 존재하므로 분산 투자를 권장합니다.</span>
                <span className="shrink-0 text-slate-400">데이터: NASDAQ / NYSE 실시간 배치 엔진</span>
            </div>
        </section>
    );
}
