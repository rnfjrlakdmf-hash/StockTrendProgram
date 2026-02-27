"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import MarketIndicators from "@/components/MarketIndicators";
import GaugeChart from "@/components/GaugeChart";
import { TrendingUp, ShieldCheck, Loader2, PlayCircle, Swords, Bell, Star, Save, LineChart as LineChartIcon, TrendingDown, AlertTriangle, Info, ArrowRight, Share2, BookOpen, Clock, Calendar, Cpu, Zap, Globe, BarChart2, Search, Lock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import ComponentErrorBoundary from '@/components/ComponentErrorBoundary';
import { useStockSocket } from "@/hooks/useStockSocket";
import { API_BASE_URL } from "@/lib/config";

import RankingWidget from "@/components/RankingWidget";
import StoryChart from "@/components/StoryChart";
import PriceAlertSetup from "@/components/PriceAlertSetup";
import PriceAlertList from "@/components/PriceAlertList";
import DisclosureTable from "@/components/DisclosureTable";
import FCMTokenManager from "@/components/FCMTokenManager";
import SimplePushTest from "@/components/SimplePushTest";
import FinancialsTable from "@/components/FinancialsTable";
import LiveSupplyWidget from "@/components/LiveSupplyWidget";
import WatchlistButton from "@/components/WatchlistButton";
import PriceAlertModal from "@/components/PriceAlertModal";
import MarketSignalWidget from "@/components/MarketSignalWidget";
import PortfolioHealthModal from "@/components/PortfolioHealthModal";
import ScoreHistoryChart from "@/components/ScoreHistoryChart";
import CompanyHealthScore from "@/components/CompanyHealthScore";

// [WebSocket Integration] Real-time Price Updates
// Replaces the old 5-second polling interval
/* REMOVED BAD BLOCK
        // Flash effect can be handled by CSS animations if needed, 
        // but React re-render will update values immediately.
        setStock(prev => {
            if (!prev) return null;
            // Avoid update if price hasn't changed to prevent unnecessary re-renders
            if (prev.price === realtimeData.price) return prev;

            return {
                ...prev,
                price: realtimeData.price,
                change: realtimeData.change
            };
        });
    }
*/

/* REMOVED: Legacy Polling Logic
useEffect(() => {
   // ...
}, [stock?.symbol]); 
*/
import { getTickerFromKorean } from "@/lib/stockMapping";


interface StockData {
    name: string;
    symbol: string;
    price: string;
    price_krw?: string;
    change: string;
    currency: string;
    sector: string;
    summary: string;
    score: number;
    metrics: {
        supplyDemand: number;
        financials: number;
        news: number;
    };
    news: {
        title: string;
        publisher: string;
        link: string;
        published: string;
    }[];
    rationale?: {
        supply: string;
        momentum: string;
        risk: string;
    };
    details?: {
        prev_close: number;
        open: number;
        day_low: number;
        day_high: number;
        year_low: number;
        year_high: number;
        volume: number;
        market_cap: string;
        pe_ratio: number;
        eps: number;
        dividend_yield: number;
        forward_pe?: number;
        forward_eps?: number;
        pbr?: number;
        bps?: number;
        dividend_rate?: number;
    };
    daily_prices?: {
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        change: number;
    }[];
    theme_data?: any;
    related_stocks?: {
        symbol: string;
        name: string;
        reason: string;
        price?: string;
        change?: string;
    }[];
    health_data?: {
        raw_data?: any;
        score: number;
        grade: string;
        details: any;
    } | null;
}


const TERM_EXPLANATIONS: Record<string, string> = {
    "시가총액": "이 회사를 통째로 인수하려면 필요한 돈이에요. (기업의 덩치)",
    "거래량": "오늘 하루 동안 사고팔린 주식의 개수예요. (많을수록 인기 폭발!)",
    "PER": "본전 뽑는 데 걸리는 시간! 숫자가 낮을수록 싸게 사는 거예요. (가성비)",
    "EPS": "주식 1주가 1년 동안 벌어온 순이익이에요. 높을수록 일을 잘한 거죠!",
    "PBR": "회사가 당장 망해서 짐 싸서 팔았을 때 가치 대비 주가예요. 1보다 낮으면 헐값!",
    "BPS": "지금 당장 회사를 청산하면 1주당 돌려받는 현금 가치예요.",
    "배당수익률": "은행 이자처럼, 주식을 갖고 있으면 매년 챙겨주는 보너스 비율이에요.",
    "주당배당금": "1주를 갖고 있을 때 회사가 꽂아주는 현금 보너스 액수!",
    "추정 PER": "내년 실적을 미리 예상해본 가성비 점수예요.",
    "추정 EPS": "내년에 1주당 얼마를 벌 것 같은지 예상한 금액이에요.",

    "PEG": "성장성 대비 주가가 싼지 비싼지 보는 지표예요. 낮을수록 좋아요!",
};

function EasyTerm({ label, term, isEasyMode }: { label: string, term: string, isEasyMode: boolean }) {
    if (!isEasyMode) return <div className="text-gray-400 text-xs mb-1">{label}</div>;

    const explanation = TERM_EXPLANATIONS[term];

    return (
        <div className="group relative inline-flex items-center cursor-help mb-1">
            <span className="text-blue-300 border-b border-dashed border-blue-500/50 text-xs font-bold flex items-center gap-1">
                {label} <span className="text-[10px] text-yellow-400 opacity-80">📋</span>
            </span>
            <div className="absolute bottom-full left-0 mb-2 w-52 p-3 bg-indigo-900/95 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md border border-white/10 leading-relaxed font-medium">
                <span className="text-yellow-300 font-bold block mb-1">💡 {term} 지표 풀이</span>
                {explanation || "쉬운 설명이 준비 중이에요!"}
                <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-indigo-900/95"></div>
            </div>
        </div>
    );
}

// [Cache System] Ultra-fast navigation
const STOCK_CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000; // 1 minute cache for fast re-navigation




export default function DiscoveryPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-400">Loading Discovery...</p>
                </div>
            </div>
        }>
            <DiscoveryContent />
        </Suspense>
    );
}

function DiscoveryContent() {
    const searchParams = useSearchParams();
    const [searchInput, setSearchInput] = useState("");
    const [stock, setStock] = useState<StockData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false); // [New] AI analyzing state
    const [error, setError] = useState("");
    const [showReport, setShowReport] = useState(false);
    const [showHealthCheck, setShowHealthCheck] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'news' | 'disclosure' | 'financials' | 'backtest' | 'history' | 'daily' | 'story' | 'alerts'>('analysis');
    const [easyMode, setEasyMode] = useState(false);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [exchangeRate, setExchangeRate] = useState<number>(1450); // Default

    // [WebSocket Integration] Real-time Price Updates
    // Replaces the old 5-second polling interval
    const { realtimeData, isConnected } = useStockSocket(stock?.symbol || null);

    useEffect(() => {
        if (realtimeData && stock) {
            setStock(prev => {
                if (!prev) return null;
                // Avoid update if price hasn't changed to prevent unnecessary re-renders
                if (prev.price === realtimeData.price) return prev;

                return {
                    ...prev,
                    price: realtimeData.price,
                    change: realtimeData.change
                };
            });
        }
    }, [realtimeData]);

    // [New] Fetch Real-time Exchange Rate
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/market/status`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "success" && data.data.details?.usd) {
                    const rate = parseFloat(String(data.data.details.usd).replace(/,/g, ''));
                    if (!isNaN(rate)) setExchangeRate(rate);
                }
            })
            .catch(err => console.error("Exchange rate fetch failed", err));
    }, []);

    const getKrwPrice = (price: string | number) => {
        const p = parseFloat(String(price).replace(/,/g, ''));
        if (isNaN(p)) return null;
        return (p * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
    };

    // [New] Handle URL Query Params
    useEffect(() => {
        const query = searchParams.get("q");
        if (query) {
            setSearchInput(query);
            handleSearch(query);
        }
    }, [searchParams]);

    const handleSearch = async (term?: string) => {
        let query = term || searchInput;
        if (!query) return;

        // Clean query
        query = query.trim();

        // [Cache Check] Instant load if recent
        let ticker = getTickerFromKorean(query).toUpperCase();
        const now = Date.now();
        if (STOCK_CACHE[ticker] && (now - STOCK_CACHE[ticker].timestamp < CACHE_DURATION)) {
            setStock(STOCK_CACHE[ticker].data);
            if (STOCK_CACHE[ticker].data.symbol.toUpperCase().includes("MARKET")) {
                setActiveTab('news');
            }
            setLoading(false);
            setError("");
            return;
        }

        setLoading(true);
        setError("");
        setActiveTab('analysis');
        setIsAnalyzing(false);

        try {
            ticker = ticker.toUpperCase();
            const safeTicker = encodeURIComponent(ticker);
            const timestamp = new Date().getTime();

            // 1. FAST Fetch (Skip AI) -> Immediate rendering
            const resFast = await fetch(`${API_BASE_URL}/api/stock/${safeTicker}?t=${timestamp}&skip_ai=true`);
            const jsonFast = await resFast.json();

            if (jsonFast.status === "success" && jsonFast.data && jsonFast.data.symbol) {
                setStock(jsonFast.data);
                setLoading(false); // Stop loading spinner, show data!

                // If Market, stop here
                if (jsonFast.data.symbol.toUpperCase().includes("MARKET")) {
                    setActiveTab('news');
                    return;
                }

                // 2. SLOW Fetch (Full AI Analysis) -> Background update
                setIsAnalyzing(true);

                // Do not await UI thread? No, we need waiting for result. But React already rendered stock.
                fetch(`${API_BASE_URL}/api/stock/${safeTicker}?t=${timestamp}`)
                    .then(res => {
                        // [Fix] Check response status
                        if (!res.ok) {
                            setIsAnalyzing(false);
                            return null;
                        }
                        return res.json();
                    })
                    .then(jsonFull => {
                        if (jsonFull && jsonFull.status === "success" && jsonFull.data && jsonFull.data.symbol) {
                            setStock(jsonFull.data);
                            STOCK_CACHE[ticker] = { data: jsonFull.data, timestamp: Date.now() };
                        }
                        setIsAnalyzing(false);
                    })
                    .catch(e => {
                        // [Fix] Silently ignore
                        setIsAnalyzing(false);
                    });

            } else {
                // [Fallback] Search via Backend API (Global/Dynamic Map)
                try {
                    const searchRes = await fetch(`${API_BASE_URL}/api/stock/search?q=${safeTicker}`);
                    const searchJson = await searchRes.json();

                    if (searchJson.status === "success" && searchJson.data && searchJson.data.symbol) {
                        // Found a better match! Retry with this symbol
                        // Prevent infinite loop: if returned symbol is same as input, stop
                        const foundSymbol = searchJson.data.symbol;
                        if (foundSymbol !== ticker) {
                            handleSearch(foundSymbol);
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Search API fallback failed", e);
                }

                setStock(null);
                setLoading(false);
                setError("검색된 종목이 없습니다. 정확한 종목명이나 티커를 입력해주세요.");
            }
        } catch (err) {
            setStock(null);
            setLoading(false);
            setError("서버 연결에 실패했습니다. (백엔드 실행 여부를 확인하세요)");
            console.error(err);
        }
    };

    // [New] Prefetch function for hover optimization
    const prefetchStock = async (term: string) => {
        if (!term) return;
        let query = term.trim();
        let ticker = getTickerFromKorean(query).toUpperCase();
        // ... (prefetch logic kept same, or updated if needed, but keeping simple for now)
        // For prefetch, maybe just basic info is enough?
    };

    // [Removed] Old polling logic replaced by WebSocket real-time updates (lines 180-198)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="종목 발굴 & 건강검진" subtitle="AI가 분석하는 종목의 핵심 건강 상태" />

            <div className="p-6 space-y-8">
                {/* Initial View: Search, Widgets, Dashboard */}
                {!stock && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Search / Hero Section */}
                        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 p-6 border border-white/20 overflow-hidden shadow-xl">
                            <div className="relative z-10 max-w-2xl">
                                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-md">종목 건강검진 (AI Health Check)</h2>
                                <p className="text-gray-200 mb-4 text-sm md:text-base">
                                    종목 코드(티커)를 입력하여 기업의 재무 상태와 심리를 분석하세요.<br />
                                    <span className="text-xs text-gray-400">예시: AAPL, 삼성전자 (테마 검색 불가)</span>
                                </p>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="종목명 또는 티커 입력..."
                                            className="w-full rounded-xl bg-black/60 border border-white/30 px-4 py-3 text-base md:text-lg outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 font-medium"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSearch()}
                                        disabled={loading}
                                        className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg text-sm md:text-base whitespace-nowrap"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "분석 시작"}
                                    </button>
                                </div>

                                {error && <p className="text-red-400 mt-3 font-semibold bg-red-900/40 p-2 rounded-lg inline-block">{error}</p>}
                            </div>
                            <ShieldCheck className="absolute right-0 top-1/2 -translate-y-1/2 h-64 w-64 text-white/5 -rotate-12" />
                        </div>

                        {/* Market Traffic Light & Health Check Entry */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MarketSignalWidget />
                            <div
                                onClick={() => setShowHealthCheck(true)}
                                className="cursor-pointer group relative rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/10 p-6 overflow-hidden hover:border-blue-500/50 transition-all shadow-lg"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <ShieldCheck className="w-32 h-32 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    🏥 내 계좌 건강검진 (AI)
                                </h3>
                                <p className="text-gray-400 text-sm mb-4 group-hover:text-gray-300 transition-colors">
                                    내 포트폴리오는 비만일까 빈혈일까?<br />
                                    AI 의사에게 진단받고 처방전을 확인하세요.
                                </p>
                                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                                    지금 진단하기 →
                                </div>
                            </div>
                        </div>

                        {/* [New] Real-time Rankings Widget */}
                        <RankingWidget />

                        {/* Market Indicators Grid */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">글로벌 시장 모니터</span>
                            </h2>
                            <MarketIndicators limit={10} />
                        </div>
                    </div>
                )}

                {showHealthCheck && <PortfolioHealthModal onClose={() => setShowHealthCheck(false)} />}
                {showAlertModal && stock && (
                    <PriceAlertModal
                        symbol={stock.symbol}
                        currentPrice={parseFloat(String(stock.price || "0").replace(/,/g, ''))}
                        onClose={() => setShowAlertModal(false)}
                    />
                )}

                {showAlertModal && stock && (
                    <PriceAlertModal
                        symbol={stock.symbol}
                        currentPrice={parseFloat(String(stock.price || "0").replace(/,/g, ''))}
                        onClose={() => setShowAlertModal(false)}
                    />
                )}

                {/* Results Section */}
                {stock && stock.symbol === "THEME" ? (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        {/* Theme Analysis View */}
                        <button
                            onClick={() => { setStock(null); setSearchInput(""); }}
                            className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                        >
                            <span className="text-xl">←</span> 뒤로 가기
                        </button>

                        <div className="rounded-3xl bg-black/40 border border-white/20 p-6 md:p-8 shadow-lg">
                            <div className="flex items-center gap-4 mb-4 md:mb-6">
                                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-bold border border-purple-500/30">Theme Analysis</span>
                                <h2 className="text-xl md:text-3xl font-bold text-white">{stock.name.replace("테마: ", "")}</h2>
                            </div>

                            <p className="text-sm md:text-xl text-gray-200 leading-relaxed mb-6 md:mb-8 border-l-4 border-purple-500 pl-4 py-2 bg-gradient-to-r from-purple-900/10 to-transparent">
                                {stock.summary}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Leaders */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                    <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                                        🚀 대장주 (Leaders)
                                    </h3>
                                    <div className="space-y-3">
                                        {stock.theme_data?.leaders?.map((item: any, idx: number) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSearch(item.symbol)}
                                                onMouseEnter={() => prefetchStock(item.symbol)}
                                                className="group cursor-pointer flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-blue-900/20 border border-white/5 hover:border-blue-500/30 transition-all"
                                            >
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-blue-300">{item.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{item.symbol}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-mono font-bold ${item.change?.toString().startsWith('+') || item.change > 0 ? 'text-red-400' : item.change?.toString().startsWith('-') || item.change < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                        {item.price}
                                                    </div>
                                                    <div className={`text-xs ${item.change?.toString().startsWith('+') || item.change > 0 ? 'text-red-400' : item.change?.toString().startsWith('-') || item.change < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                        {item.change_percent || item.change}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Followers */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                    <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                                        🔗 관련주 (Followers)
                                    </h3>
                                    <div className="space-y-3">
                                        {stock.theme_data?.followers?.map((item: any, idx: number) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSearch(item.symbol)}
                                                onMouseEnter={() => prefetchStock(item.symbol)}
                                                className="group cursor-pointer flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-green-900/20 border border-white/5 hover:border-green-500/30 transition-all"
                                            >
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-green-300">{item.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{item.symbol}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-mono font-bold ${item.change?.toString().startsWith('+') || item.change > 0 ? 'text-red-400' : item.change?.toString().startsWith('-') || item.change < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                        {item.price}
                                                    </div>
                                                    <div className={`text-xs ${item.change?.toString().startsWith('+') || item.change > 0 ? 'text-red-400' : item.change?.toString().startsWith('-') || item.change < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                        {item.change_percent || item.change}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {stock.theme_data?.risk_factor && (
                                <div className="mt-8 p-4 bg-red-900/10 border border-red-500/20 rounded-xl flex items-start gap-4">
                                    <div className="bg-red-500/20 p-2 rounded-lg">
                                        <TrendingUp className="h-6 w-6 text-red-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-red-400 mb-1">Risk Factor</h4>
                                        <p className="text-gray-300 text-sm">{stock.theme_data.risk_factor}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : stock && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        {/* Back Button */}
                        <button
                            onClick={() => { setStock(null); setSearchInput(""); }}
                            className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                        >
                            <span className="text-xl">←</span> 다른 종목 검색하기
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Main Score Card */}
                                <div className="rounded-3xl bg-black/40 border border-white/20 p-6 backdrop-blur-md shadow-lg">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 md:gap-0">
                                        <div>
                                            <h3 className="text-2xl md:text-3xl font-bold flex flex-wrap items-center gap-2 md:gap-3 text-white">
                                                {stock.name} <span className="text-base md:text-lg text-gray-400 font-medium whitespace-nowrap">{stock.symbol}</span>
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                                                <span className="text-3xl md:text-4xl font-bold text-white">
                                                    {stock.currency === 'KRW'
                                                        ? `₩${Number(String(stock.price).replace(/,/g, '')).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                                        : (stock.currency === 'USD' || (stock.currency && typeof stock.currency === 'string' && stock.currency.includes('USD')))
                                                            ? `$${stock.price}`
                                                            : `${stock.currency} ${stock.price}`}
                                                </span>
                                                {/* [Updated] Show KRW for foreign stocks ONLY */}
                                                {stock.currency !== 'KRW' && (stock.symbol && !stock.symbol.includes('.KS') && !stock.symbol.includes('.KQ')) && (
                                                    <span className="text-lg md:text-xl text-gray-400 font-mono">
                                                        (약 ₩{getKrwPrice(stock.price)})
                                                    </span>
                                                )}
                                                <span className={`font-bold px-2 py-1 md:px-3 md:py-1 rounded-lg text-base md:text-lg ${stock.currency === 'KRW' ? (String(stock.change).startsWith('+') ? 'text-red-400 bg-red-400/20' : 'text-blue-400 bg-blue-400/20') : (String(stock.change).startsWith('+') ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20')}`}>
                                                    {stock.change}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full md:w-auto flex flex-wrap md:flex-col justify-between md:justify-end items-center md:items-end gap-4 md:gap-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                                            <div className="flex items-center gap-3 md:flex-col md:items-end">
                                                <div className="text-sm text-gray-400 md:mb-1">AI 종합 점수</div>
                                                <div className={`text-4xl md:text-5xl font-black ${stock.score >= 70 ? 'text-green-400' : 'text-yellow-400'} drop-shadow-sm`}>{stock.score}</div>
                                            </div>
                                            <div className="w-full md:w-auto mt-2 md:mt-2 flex items-center justify-end gap-2">
                                                {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && <WatchlistButton symbol={stock.symbol} />}
                                                {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                                    <button
                                                        onClick={() => setShowAlertModal(true)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border border-white/20 transition-all"
                                                    >
                                                        <Bell className="w-4 h-4" />
                                                        <span className="hidden sm:inline">알림</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <GaugeChart score={stock.metrics?.supplyDemand || 0} label="수급 분석" subLabel="기관/외국인 수급 강도" color="#3b82f6" />
                                        <GaugeChart score={stock.metrics?.financials || 0} label="재무 건전성" subLabel="성장성 및 수익성" color="#10b981" />
                                        <GaugeChart score={stock.metrics?.news || 0} label="뉴스 심리" subLabel="긍정/부정 뉴스 분석" color="#f59e0b" />
                                    </div>

                                    {/* [New] Live Supply Widget for Korea Stocks */}
                                    {stock.currency === 'KRW' && stock.symbol && (
                                        <div className="mt-8">
                                            <LiveSupplyWidget symbol={stock.symbol} />
                                        </div>
                                    )}

                                    {stock.details && (
                                        <div className="mt-8 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                                            {/* [New] Easy Mode Toggle Header */}
                                            <div className="flex justify-between items-center mb-4 px-1">
                                                <h4 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                                    📊 상세 재무/투자 지표
                                                </h4>
                                                <button
                                                    onClick={() => setEasyMode(!easyMode)}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-2 border ${easyMode
                                                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20"
                                                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                                        }`}
                                                >
                                                    <span>🎓 주식 용어 번역기</span>
                                                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${easyMode ? 'bg-black/30' : 'bg-black/50'}`}>
                                                        <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${easyMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="시가총액 (Market Cap)" term="시가총액" isEasyMode={easyMode} />
                                                    <div className="font-bold text-white text-lg tracking-tight">{stock.details?.market_cap || 'N/A'}</div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="거래량 (Volume)" term="거래량" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">{stock.details?.volume?.toLocaleString() || 'N/A'}</div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PER (주가수익비율)" term="PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pe_ratio === 'number' && stock.details.pe_ratio !== 0)
                                                            ? `${stock.details.pe_ratio.toFixed(2)}배`
                                                            : '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="EPS (주당순이익)" term="EPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {typeof stock.details?.eps === 'number' ? stock.details.eps.toLocaleString() : '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="배당수익률 (Yield)" term="배당수익률" isEasyMode={easyMode} />
                                                    <div className="font-mono text-green-400">
                                                        {(typeof stock.details?.dividend_yield === 'number' && stock.details.dividend_yield !== 0)
                                                            ? `${(stock.details.dividend_yield * 100).toFixed(2)}%`
                                                            : '-'}
                                                    </div>
                                                </div>

                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="추정 PER" term="추정 PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.forward_pe === 'number' && stock.details.forward_pe !== 0)
                                                            ? `${stock.details.forward_pe.toFixed(2)}배`
                                                            : '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="추정 EPS" term="추정 EPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {typeof stock.details?.forward_eps === 'number'
                                                            ? `${stock.currency === 'KRW' ? '₩' : '$'}${stock.details.forward_eps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}`
                                                            : '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PBR" term="PBR" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pbr === 'number' && stock.details.pbr !== 0)
                                                            ? `${stock.details.pbr.toFixed(2)}배`
                                                            : '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="BPS" term="BPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {typeof stock.details?.bps === 'number'
                                                            ? `${stock.currency === 'KRW' ? '₩' : '$'}${stock.details.bps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}`
                                                            : '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="주당배당금" term="주당배당금" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.dividend_rate === 'number' && stock.details.dividend_rate !== 0)
                                                            ? `${stock.currency === 'KRW' ? '₩' : '$'}${stock.details.dividend_rate.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}`
                                                            : '-'}
                                                    </div>
                                                </div>

                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">전일 종가</div>
                                                    <div className="font-mono text-gray-300">
                                                        {stock.currency === 'KRW' ? '₩' : '$'}{stock.details?.prev_close?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">시가 (Open)</div>
                                                    <div className="font-mono text-gray-300">
                                                        {stock.currency === 'KRW' ? '₩' : '$'}{stock.details?.open?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">고가 / 저가</div>
                                                    <div className="font-mono text-sm">
                                                        <span className="text-red-400">{stock.details?.day_high?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                        <span className="text-gray-600 mx-1">/</span>
                                                        <span className="text-blue-400">{stock.details?.day_low?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 p-2">
                                                    <div className="text-gray-500 text-xs mb-1">52주 최고 / 최저</div>
                                                    <div className="font-mono text-sm">
                                                        <span className="text-red-300">{stock.details?.year_high?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                        <span className="text-gray-600 mx-2">~</span>
                                                        <span className="text-blue-300">{stock.details?.year_low?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Detailed Analysis Text */}
                                <div className="rounded-3xl bg-black/40 border border-white/20 p-8 shadow-lg">
                                    {/* Tab Navigation */}
                                    <div className="flex items-center gap-3 md:gap-6 border-b border-white/10 mb-6 font-bold text-sm md:text-lg overflow-x-auto scrollbar-hide py-2">
                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'analysis' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('analysis')}
                                        >
                                            데이터 종합 분석
                                        </button>
                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'news' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('news')}
                                        >
                                            관련 뉴스
                                        </button>
                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'daily' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('daily')}
                                        >
                                            일일 시세
                                        </button>
                                        {/* Story Chart tab removed per user request - news fetching issues
                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'story' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('story')}
                                        >
                                            📖 주식 위인전 <span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full ml-1 text-purple-300">New</span>
                                        </button>
                                        */}

                                        {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                            <>
                                                <button
                                                    className={`pb-3 whitespace-nowrap ${activeTab === 'disclosure' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('disclosure')}
                                                >
                                                    공시(DART) <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-1 text-gray-300">New</span>
                                                </button>
                                                <button
                                                    className={`pb-3 whitespace-nowrap ${activeTab === 'financials' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('financials')}
                                                >
                                                    재무제표
                                                </button>
                                                <button
                                                    className={`pb-3 whitespace-nowrap ${activeTab === 'backtest' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('backtest')}
                                                >
                                                    전략 백테스팅
                                                </button>
                                                <button
                                                    className={`pb-3 whitespace-nowrap ${activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('history')}
                                                >
                                                    AI 점수 추이
                                                </button>

                                                <button
                                                    className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'alerts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('alerts')}
                                                >
                                                    🛡️ 회의 중 방어막 <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full ml-1 text-blue-300">New</span>
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {activeTab === 'analysis' ? (
                                        <>
                                            {/* Chart Section */}

                                            {/* AI Opinion */}
                                            {/* AI Opinion */}
                                            <h4 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-400" /> 종합 분석 리포트
                                            </h4>
                                            <div className={`leading-relaxed text-sm md:text-lg font-medium whitespace-pre-wrap mb-6 min-h-[100px] ${(stock.summary || "").includes("오류") ? 'text-red-300' : 'text-gray-100'}`}>
                                                {isAnalyzing && (!stock?.summary || stock.summary.length < 50) ? (
                                                    <div className="flex flex-col items-center justify-center h-full py-8 space-y-3 bg-white/5 rounded-xl border border-white/5">
                                                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                                        <div className="text-center">
                                                            <div className="text-blue-200 text-sm font-bold mb-1">AI가 실시간 데이터를 분석 중입니다...</div>
                                                            <div className="text-slate-500 text-xs">전략 수립 및 리포트 작성 중 (약 3~5초)</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    stock.summary || "분석 내용이 없습니다."
                                                )}
                                                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-[11px] text-gray-400 leading-relaxed">
                                                    ⚠️ **주의**: 본 분석 결과는 객관적 재무 지표와 공시 정보를 바탕으로 알고리즘이 생성한 '참고용' 요약입니다. 어떠한 경우에도 투자 권유나 수익 보장을 의미하지 않으며, 모든 투자 결정에 대한 책임은 투자자 본인에게 있습니다.
                                                </div>
                                            </div>

                                            {/* [New] Healthcare Analysis Integration */}
                                            {stock.symbol && !stock.symbol.includes("MARKET") && (
                                                <div className="mt-8 pt-8 border-t border-white/10">
                                                    <h4 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                                                        <ShieldCheck className="h-6 w-6 text-green-400" /> 재무 지표 현황 분석 (알고리즘 산출)
                                                    </h4>
                                                    <CompanyHealthScore symbol={stock.symbol} autoLoad={true} />
                                                </div>
                                            )}

                                            {/* [New] 3-Line Rationale */}
                                            {stock.rationale && stock.rationale.supply && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                        <div className="text-blue-400 font-bold mb-1 flex items-center gap-2">✅ 수급 (Supply)</div>
                                                        <div className="text-sm text-gray-200">{stock.rationale.supply}</div>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                        <div className="text-purple-400 font-bold mb-1 flex items-center gap-2">🔥 모멘텀 (Momentum)</div>
                                                        <div className="text-sm text-gray-200">{stock.rationale.momentum}</div>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl border border-red-500/30">
                                                        <div className="text-red-400 font-bold mb-1 flex items-center gap-2">⚠️ 리스크 (Risk)</div>
                                                        <div className="text-sm text-gray-200">{stock.rationale.risk}</div>
                                                    </div>
                                                </div>
                                            )}



                                            <div className="mt-6 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30">
                                                <p className="text-blue-200 text-sm flex items-center gap-2">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    <strong>Guide:</strong> 이 분석은 AI가 실시간 데이터를 바탕으로 생성했으며, 투자 참고용입니다.
                                                </p>
                                            </div>
                                        </>
                                    ) : activeTab === 'news' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                                <TrendingUp className="h-6 w-6 text-yellow-400" /> 관련 뉴스/공시
                                            </h4>
                                            <div className="space-y-3">
                                                {stock.news && stock.news.length > 0 ? (
                                                    stock.news.map((n, idx) => (
                                                        <div key={idx} className="flex justify-between items-start p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 cursor-pointer" onClick={() => window.open(n.link, '_blank')}>
                                                            <div>
                                                                <h5 className="font-bold text-white mb-1 group-hover:text-blue-400 text-lg leading-snug">{n.title}</h5>
                                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-gray-300">{n.publisher}</span>
                                                                    <span>{n.published}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-gray-400 text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                                                        관련된 최신 뉴스가 없습니다.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : activeTab === 'daily' && stock.symbol ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                                📅 최근 일일 시세
                                            </h4>
                                            <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-white/10 text-gray-400 text-sm">
                                                            <th className="py-3 px-2">날짜</th>
                                                            <th className="py-3 px-2">종가</th>
                                                            <th className="py-3 px-2">등락</th>
                                                            <th className="py-3 px-2 text-right">거래량</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {stock.daily_prices && stock.daily_prices.length > 0 ? (
                                                            stock.daily_prices.map((day, idx) => (
                                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                    <td className="py-3 px-2 text-gray-300 font-mono text-sm">{day.date}</td>
                                                                    <td className="py-3 px-2 font-mono font-bold">
                                                                        {stock.currency === 'KRW' ? '₩' : '$'}{day.close.toLocaleString()}
                                                                    </td>
                                                                    <td className={`py-3 px-2 font-mono font-bold ${day.change > 0 ? 'text-red-400' : day.change < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                                        {day.change > 0 ? '+' : ''}{day.change.toFixed(2)}%
                                                                    </td>
                                                                    <td className="py-3 px-2 text-right text-gray-400 font-mono text-sm">
                                                                        {day.volume.toLocaleString()}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={4} className="py-4 text-center text-gray-500">일일 시세 데이터 없음</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : activeTab === 'story' && stock.symbol ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <StoryChart symbol={stock.symbol} period="1y" />
                                        </div>
                                    ) : (stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET"))) && activeTab === 'disclosure' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <DisclosureTable symbol={stock.symbol} />
                                        </div>
                                    ) : (stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET"))) && activeTab === 'financials' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <FinancialsTable data={stock.health_data?.raw_data} />
                                        </div>
                                    ) : (stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET"))) && activeTab === 'backtest' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <BacktestSimulator symbol={stock.symbol} currency={stock.currency} />
                                        </div>
                                    ) : (stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET"))) && activeTab === 'history' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <ScoreHistoryChart symbol={stock.symbol} />
                                        </div>
                                    ) : activeTab === 'alerts' && stock.symbol ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                                            <SimplePushTest />
                                            <PriceAlertSetup
                                                symbol={stock.symbol}
                                                currentPrice={Number(stock.price) || 0}
                                                buyPrice={Number(stock.price)}
                                                quantity={100}
                                            />
                                            <PriceAlertList />
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Sidebar / Recommendations */}
                            <div className="space-y-6">
                                {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                    <div className="rounded-3xl bg-black/40 border border-white/20 p-6 h-full shadow-lg">
                                        <h3 className="text-lg font-bold mb-4 text-white">관련 섹터 종목</h3>
                                        {stock.related_stocks && stock.related_stocks.length > 0 ? (
                                            <div className="space-y-3">
                                                {stock.related_stocks.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => handleSearch(item.symbol)}
                                                        className="group cursor-pointer flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all"
                                                    >
                                                        <div className="flex-1 min-w-0 pr-3">
                                                            <div className="font-bold text-white text-sm whitespace-normal break-words group-hover:text-blue-300 transition-colors">
                                                                {item.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 font-mono mb-1">{item.symbol}</div>
                                                            <div className="text-[10px] text-gray-400 truncate">
                                                                {item.reason}
                                                            </div>
                                                        </div>

                                                        <div className="text-right whitespace-nowrap">
                                                            {item.price && (
                                                                <div className="font-mono text-sm text-white font-bold mb-1">
                                                                    {item.price}
                                                                </div>
                                                            )}
                                                            {item.change && (
                                                                <div className={`text-xs font-bold px-2 py-1 rounded-md inline-block ${String(item.change).startsWith('+')
                                                                    ? 'bg-red-500/20 text-red-400'
                                                                    : String(item.change).startsWith('-')
                                                                        ? 'bg-blue-500/20 text-blue-400'
                                                                        : 'bg-gray-500/20 text-gray-400'
                                                                    }`}>
                                                                    {item.change}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 mb-4">{stock.name}과(와) 유사한 산업군의 기업들을 비교 분석할 예정입니다. (데이터 수집 중)</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface BacktestResult {
    total_return: number;
    buy_hold_return: number;
    max_drawdown: number;
    final_equity: number;
    chart_data: { date: string; strategy: number; buy_hold: number }[];
}

function BacktestSimulator({ symbol, currency }: { symbol: string, currency: string }) {
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const runBacktest = async () => {
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/stock/${symbol}/backtest`);
            const json = await res.json();
            if (json.status === "success") {
                setResult(json.data);
            } else {
                setError(json.message || "백테스팅 실행 중 오류가 발생했습니다.");
            }
        } catch (err) {
            console.error(err);
            setError("서버 연결에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-xl font-bold text-white mb-1">이동평균 교차 전략 (Golden Cross)</h4>
                    <p className="text-gray-400 text-sm">단기 이평선(5일)이 장기 이평선(20일)을 돌파할 때 매수하는 전략</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={runBacktest}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        시뮬레이션 실행
                    </button>
                </div>
            </div>

            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                    {/* metrics and chart... */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">최종 수익률</div>
                            <div className={`text-2xl font-bold ${result.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {result.total_return}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">단순 보유 시</div>
                            <div className={`text-xl font-bold ${result.buy_hold_return >= 0 ? 'text-gray-200' : 'text-gray-400'}`}>
                                {result.buy_hold_return}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">최대 낙폭 (MDD)</div>
                            <div className="text-xl font-bold text-red-300">
                                {result.max_drawdown}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">최종 자산 ({currency === 'KRW' ? '₩10k' : '$10k'} 투자 시)</div>
                            <div className="text-xl font-bold text-blue-200">
                                {currency === 'KRW' ? '₩' : '$'}{result.final_equity.toLocaleString(undefined, { maximumFractionDigits: currency === 'KRW' ? 0 : 2 })}
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-64 w-full bg-white/5 rounded-xl border border-white/10 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={result.chart_data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#aaaaaa' }}
                                    tickFormatter={(val) => val.slice(5)} // MM-DD
                                    interval={Math.floor(result.chart_data.length / 5)}
                                />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Line type="monotone" dataKey="strategy" stroke="#3b82f6" strokeWidth={2} dot={false} name="전략 수익금" />
                                <Line type="monotone" dataKey="buy_hold" stroke="#6b7280" strokeWidth={2} dot={false} name="단순 보유" strokeDasharray="4 4" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}







interface ScoreHistory {
    date: string;
    score: number;
    financial: number;
    news: number;
}

function ScoreHistoryChart({ symbol }: { symbol: string }) {
    const [history, setHistory] = useState<ScoreHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/stock/${symbol}/history`);
                const json = await res.json();
                if (json.status === "success") {
                    setHistory(json.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (symbol) fetchHistory();
    }, [symbol]);

    return (
        <div className="space-y-4">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span>AI 점수 변화 추이</span>
                {loading && <Loader2 className="animate-spin w-4 h-4 text-blue-400" />}
            </h4>

            {!loading && history.length === 0 && (
                <div className="p-8 text-center text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>저장된 점수 히스토리가 없습니다.</p>
                </div>
            )}

            {history.length > 0 && (
                <div className="h-64 w-full bg-white/5 rounded-xl border border-white/10 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#aaaaaa' }}
                                tickFormatter={(val) => new Date(val).toLocaleDateString()}
                            />
                            <YAxis domain={[0, 100]} />
                            <Tooltip
                                content={(props: any) => {
                                    if (!props.active || !props.payload || !props.payload.length) return null;
                                    const data = props.payload[0].payload;
                                    return (
                                        <div className="bg-gray-800 border border-gray-600 rounded-xl p-3 shadow-lg">
                                            <p className="text-xs text-gray-400 mb-2">{new Date(data.date).toLocaleDateString('ko-KR')}</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-purple-400 font-bold">종합 점수:</span>
                                                    <span className="text-white font-mono">{data.score.toFixed(1)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-green-400 text-xs">재무:</span>
                                                    <span className="text-white text-xs font-mono">{(data.financial || 0).toFixed(1)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-amber-400 text-xs">심리:</span>
                                                    <span className="text-white text-xs font-mono">{(data.news || 0).toFixed(1)}</span>
                                                </div>
                                            </div>
                                            {data.reason && (
                                                <div className="mt-3 pt-2 border-t border-gray-600">
                                                    <p className="text-xs text-blue-300 font-semibold mb-1">📊 변동 이유:</p>
                                                    <p className="text-xs text-gray-300">{data.reason}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                            <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="종합 점수" />
                            <Line type="monotone" dataKey="financial" stroke="#10b981" strokeWidth={1} dot={false} name="재무 건전성" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="news" stroke="#f59e0b" strokeWidth={1} dot={false} name="AI 심리 점수" strokeDasharray="3 3" />
                        </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center mt-2 text-gray-400">
                        최근 50회 분석 결과 트렌드 • 💡 차트 포인트 위에 마우스를 올려 변동 이유를 확인하세요
                    </p>
                </div>
            )}
        </div>
    );
}

function WatchlistButton({ symbol }: { symbol: string }) {
    const [isWatchlisted, setIsWatchlisted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkWatchlist = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/watchlist`);

                // [Fix] Check response status
                if (!res.ok) {
                    setLoading(false);
                    return;
                }

                const json = await res.json();
                if (json.status === "success" && json.data.includes(symbol)) {
                    setIsWatchlisted(true);
                } else {
                    setIsWatchlisted(false);
                }
            } catch (err) {
                // [Fix] Silently ignore
            } finally {
                setLoading(false);
            }
        };
        checkWatchlist();
    }, [symbol]);

    const toggleWatchlist = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const method = isWatchlisted ? 'DELETE' : 'POST';
            const url = isWatchlisted ? `${API_BASE_URL}/api/watchlist/${symbol}` : `${API_BASE_URL}/api/watchlist`;

            const options: RequestInit = { method };
            if (!isWatchlisted) {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify({ symbol });
            }

            const res = await fetch(url, options);
            const json = await res.json();

            if (json.status === "success") {
                setIsWatchlisted(!isWatchlisted);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={toggleWatchlist}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isWatchlisted
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border border-white/20'
                }`}
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-black' : ''}`} />
            )}
            {isWatchlisted ? '관심종목' : '관심등록'}
        </button>
    );
}


interface PredictionDetail {
    symbol: string;
    date: string;
    prediction: string;
    past_price: number;
    current_price: number;
    change_pct: number;
    is_correct: boolean;
}

interface PredictionReport {
    total_count: number;
    success_count: number;
    success_rate: number;
    details: PredictionDetail[];
}

function MarketSignalWidget() {
    const [signal, setSignal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSignal = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/status`);
                const json = await res.json();
                if (json.status === "success") {
                    setSignal(json.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSignal();
    }, []);

    if (loading) return <div className="animate-pulse bg-white/5 h-48 rounded-3xl"></div>;

    if (!signal) return null;

    const getTrafficColor = (sig: string) => {
        if (sig === 'red') return 'bg-red-500 shadow-red-500/50';
        if (sig === 'yellow') return 'bg-yellow-400 shadow-yellow-400/50';
        return 'bg-green-500 shadow-green-500/50';
    };

    return (
        <div className="relative rounded-3xl bg-[#111] border border-white/10 p-6 shadow-lg flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start z-10">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        📈 시장 데이터 요약
                    </h3>
                    <p className={`text-lg font-bold leading-tight ${signal.signal === 'red' ? 'text-red-400' :
                        signal.signal === 'yellow' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                        {signal.message}
                    </p>
                    {signal.reason && (
                        <div className="mt-3 bg-white/5 rounded-lg p-2 text-sm text-gray-300 border border-white/5">
                            <span className="font-bold text-blue-200">원인?</span> {signal.reason}
                        </div>
                    )}
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${getTrafficColor(signal.signal)} animate-pulse`}>
                    <div className="text-3xl">
                        {signal.signal === 'red' ? '🛑' : signal.signal === 'yellow' ? '⚠️' : '🚀'}
                    </div>
                </div>
            </div>



            <div className="mt-6 flex items-center gap-4 text-sm text-gray-400 z-10">
                <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    KOSPI <span className="text-gray-200 font-mono ml-1">{signal.details?.kospi}</span>
                </div>
                <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    USD/KRW <span className="text-gray-200 font-mono ml-1">{signal.details?.usd}</span>
                </div>
            </div>
        </div>
    );
}



function PortfolioHealthModal({ onClose }: { onClose: () => void }) {
    const [portfolioText, setPortfolioText] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAnalyze = async () => {
        if (!portfolioText.trim()) {
            setError("진단할 종목을 입력해주세요.");
            return;
        }

        setLoading(true);
        setError("");

        const items = portfolioText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

        try {
            console.log("Analyzing portfolio:", items);
            const res = await fetch(`${API_BASE_URL}/api/portfolio/diagnosis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ portfolio: items })
            });
            const json = await res.json();
            console.log("Analysis result:", json);

            if (json.status === "success") {
                setResult(json.data);
            } else {
                setError(json.message || "분석에 실패했습니다.");
            }
        } catch (err) {
            console.error("Analysis Error:", err);
            setError("서버 연결에 실패했습니다. 백엔드 상태를 확인해주세요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative z-[110] bg-[#111] border border-white/20 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-gray-800 to-black">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        📊 AI 포트폴리오 분석
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 text-white">
                    {!result ? (
                        <div className="space-y-4">
                            <p className="text-gray-300">
                                보유하고 있는 종목들을 입력해주세요. (쉼표로 구분)<br />
                                <span className="text-xs md:text-sm text-gray-500">예시: 삼성전자, SK하이닉스, NAVER, 카카오, Tesla, Apple</span>
                            </p>
                            <textarea
                                className="w-full h-32 bg-white/5 border border-white/20 rounded-xl p-4 text-base md:text-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="종목명 입력..."
                                value={portfolioText}
                                onChange={(e) => setPortfolioText(e.target.value)}
                            />

                            {error && (
                                <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/20">
                                    ⚠️ {error}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
                            >
                                <span className="flex items-center gap-2">
                                    {loading ? (
                                        <Loader2 key="loader" className="animate-spin" />
                                    ) : (
                                        <ShieldCheck key="icon" />
                                    )}
                                    <span>{loading ? "AI 분석 중..." : "데이터 분석 시작"}</span>
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center">
                                <div className="text-gray-400 text-sm mb-2">포트폴리오 종합 지수</div>
                                <div className={`text-6xl font-black mb-4 ${result.score >= 80 ? 'text-green-400' :
                                    result.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    {result.score}점
                                </div>
                                <div className="inline-block bg-white/10 px-4 py-2 rounded-full text-lg font-bold border border-white/20">
                                    상태 요약: {result.diagnosis}
                                </div>
                            </div>

                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <h4 className="text-blue-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                                    📋 AI 분석 데이터 요약
                                </h4>
                                <p className="text-sm md:text-lg leading-relaxed whitespace-pre-wrap text-gray-200">
                                    {result.prescription}
                                </p>
                            </div>

                            {result.details && (result.details.sector_bias || result.details.risk_level) && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <div className="text-gray-500 text-xs mb-1">섹터 편중도</div>
                                        <div className="font-bold">{result.details.sector_bias || "N/A"}</div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <div className="text-gray-500 text-xs mb-1">위험 레벨</div>
                                        <div className="font-bold">{result.details.risk_level || "N/A"}</div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setResult(null)}
                                className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-bold transition-colors"
                            >
                                다른 포트폴리오 진단하기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// [New] Real-time Investor Estimates
function LiveSupplyWidget({ symbol }: { symbol: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSupply = async () => {
            try {
                // Encode symbol just in case
                const safeSymbol = encodeURIComponent(symbol);
                const res = await fetch(`${API_BASE_URL}/api/stock/${safeSymbol}/investors/live`);
                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setData(json.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (symbol && !symbol.includes("MARKET")) {
            fetchSupply();

            // Auto-refresh every 3 minutes (180000ms) for real-time updates
            const interval = setInterval(() => {
                fetchSupply();
            }, 180000);

            // Cleanup interval on unmount
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [symbol]);

    // Check Market Hours (KST)
    const now = new Date();
    // Convert to KST (UTC+9) roughly for display logic, though browser might be in KST already if user is in Korea.
    // Assuming user is in Korea based on context.
    const day = now.getDay(); // 0=Sun, 6=Sat
    const hour = now.getHours();
    const isWeekend = day === 0 || day === 6;
    const isMarketOpen = !isWeekend && hour >= 9 && hour < 16;

    if (!data || data.length === 0) {
        if (loading) return null;

        return (
            <div className="mt-8 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    📊 실시간 수급 집계 현황 (잠정)
                </h4>
                <div className="p-6 bg-white/5 rounded-xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
                    {isWeekend ? (
                        <>
                            <div className="text-3xl">😴</div>
                            <div className="text-gray-300 font-bold">오늘은 휴장일(주말)입니다.</div>
                            <div className="text-sm text-gray-500">실시간 잠정 수급은 평일 장중(09:30 ~ 14:30)에만 집계됩니다.</div>
                        </>
                    ) : !isMarketOpen ? (
                        <>
                            <div className="text-3xl">🌙</div>
                            <div className="text-gray-300 font-bold">지금은 장 운영 시간이 아닙니다.</div>
                            <div className="text-sm text-gray-500">실시간 수급 집계가 종료되었습니다. (운영시간: 09:00 ~ 15:30)</div>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl">📭</div>
                            <div className="text-gray-300 font-bold">잠정 집계 현황이 아직 없습니다.</div>
                            <div className="text-sm text-gray-500">장 시작 직후이거나, 거래량이 적어 집계되지 않았을 수 있습니다.</div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Calculate totals
    const last = data[data.length - 1];
    const totalForeigner = last?.foreigner || 0;
    const totalInst = last?.institution || 0;
    const isDaily = last?.is_daily || false; // Check if this is daily confirmed data
    const isToday = last?.is_today || false; // Check if this is today's data

    return (
        <div className="mt-8 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h4 className="text-base md:text-lg font-bold text-white mb-4 flex items-center gap-2">
                {isDaily ? (
                    isToday ? (
                        <>
                            📊 오늘의 수급 결과 <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2">확정치</span>
                        </>
                    ) : (
                        <>
                            📊 최근 수급 결과 ({last?.time}) <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2">확정치</span>
                        </>
                    )
                ) : (
                    !isMarketOpen ? (
                        <>
                            🏁 오늘의 수급 잠정치 (마감) <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2">장마감</span>
                        </>
                    ) : (
                        <>
                            📊 실시간 수급 분석 데이터 <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2">09:30~14:30 집계</span>
                        </>
                    )
                )}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-xl border ${totalForeigner > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-sm text-gray-400 mb-1">
                        {isDaily ? (isToday ? '외국인 오늘 합계' : '외국인 당일 합계') : '외국인 잠정 합계'}
                    </div>
                    <div className={`text-2xl font-bold font-mono ${totalForeigner > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {totalForeigner > 0 ? '+' : ''}{totalForeigner.toLocaleString()}주
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${totalInst > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-xs md:text-sm text-gray-400 mb-1">
                        {isDaily ? (isToday ? '기관 오늘 합계' : '기관 당일 합계') : '기관 잠정 합계'}
                    </div>
                    <div className={`text-lg md:text-2xl font-bold font-mono ${totalInst > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {totalInst > 0 ? '+' : ''}{totalInst.toLocaleString()}주
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10 max-h-60 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-xs text-gray-400 uppercase font-bold sticky top-0 backdrop-blur-md">
                        <tr>
                            <th className="px-4 py-3">시간</th>
                            <th className="px-4 py-3 text-right">외국인 (추정)</th>
                            <th className="px-4 py-3 text-right">기관 (추정)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data && data.length > 0 ? (
                            data.slice().reverse().map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-2 font-mono text-gray-300">{row.time}</td>
                                    <td className={`px-4 py-2 text-right font-mono font-bold ${row.foreigner > 0 ? 'text-red-400' : row.foreigner < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                        {row.foreigner.toLocaleString()}
                                    </td>
                                    <td className={`px-4 py-2 text-right font-mono font-bold ${row.institution > 0 ? 'text-red-400' : row.institution < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                        {row.institution.toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">집계된 데이터가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* [New] Explanation Tooltip Box */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                    <div className="font-bold text-gray-200 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        순매수 시
                    </div>
                    <ul className="space-y-2 text-gray-400 pl-1 custom-list">
                        <li className="flex gap-2">
                            <span className="text-red-300 font-bold whitespace-nowrap">외국인:</span>
                            <span>&quot;이 주식 지금 싸다!&quot; 큰손들이 장바구니에 담고 있어요. 주가 상승에 긍정적인 신호예요.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-red-300 font-bold whitespace-nowrap">기관:</span>
                            <span>&quot;실적 좋을 것 같네&quot; 하며 물량을 모으고 있어요. 든든한 지원군이 생긴 셈이죠.</span>
                        </li>
                    </ul>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                    <div className="font-bold text-gray-200 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        순매도 시
                    </div>
                    <ul className="space-y-2 text-gray-400 pl-1 custom-list">
                        <li className="flex gap-2">
                            <span className="text-blue-300 font-bold whitespace-nowrap">외국인:</span>
                            <span>&quot;이익 챙겨서 떠나자&quot; 주식을 팔고 현금화하는 중이에요. 단기적으로 주가가 내릴 수 있어요.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-blue-300 font-bold whitespace-nowrap">기관:</span>
                            <span>&quot;포트폴리오 조정 중&quot; 가지고 있던 주식을 팔고 있어요. 상승 힘이 약해질 수 있어요.</span>
                        </li>
                    </ul>
                </div>
            </div>

            <p className="text-xs text-gray-500 mt-2 text-right">* 이 데이터는 장중 잠정치로, 장 종료 후 확정치와 다를 수 있습니다.</p>
        </div>
    );
}

function PriceAlertModal({ symbol, currentPrice, onClose }: { symbol: string, currentPrice: number, onClose: () => void }) {
    const [targetPrice, setTargetPrice] = useState(currentPrice.toString());
    const [condition, setCondition] = useState("above"); // above | below
    const [telegramId, setTelegramId] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const tid = localStorage.getItem("telegramId");
        if (tid) setTelegramId(tid);
    }, []);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/alerts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol,
                    target_price: parseFloat(targetPrice),
                    condition,
                    chat_id: telegramId
                })
            });
            const json = await res.json();
            if (json.status === "success") {
                alert("✅ 알림이 설정되었습니다!\n" + (telegramId ? "📲 텔레그램으로 알림이 전송됩니다." : "⚠️ 텔레그램 ID가 설정되지 않아 알림을 받을 수 없습니다. 설정 페이지를 확인하세요."));
                onClose();
            } else {
                alert("❌ 설정 실패: " + json.message);
            }
        } catch (e) {
            alert("서버 통신 오류");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/20 rounded-3xl w-full max-w-md overflow-hidden transform scale-100 transition-all shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/40 to-purple-900/40">
                    <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        🔔 가격 알림 설정
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="text-gray-400 text-xs md:text-sm mb-1">{symbol} 현재가</div>
                        <div className="text-2xl md:text-3xl font-bold text-white tracking-widest">{currentPrice.toLocaleString()}</div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-300 mb-2 block">목표 가격 설정</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">Target</span>
                                <input
                                    type="number"
                                    value={targetPrice}
                                    onChange={(e) => setTargetPrice(e.target.value)}
                                    className="w-full bg-white/5 border border-white/20 rounded-xl py-3 pl-16 pr-4 text-white font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setCondition("above")}
                                className={`py-3 rounded-xl border font-bold transition-all ${condition === "above" ? "bg-red-500/20 border-red-500 text-red-400" : "bg-white/5 border-white/10 text-gray-400"}`}
                            >
                                ▲ 이상일 때 (돌파)
                            </button>
                            <button
                                onClick={() => setCondition("below")}
                                className={`py-3 rounded-xl border font-bold transition-all ${condition === "below" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-gray-400"}`}
                            >
                                ▼ 이하일 때 (하락)
                            </button>
                        </div>
                    </div>

                    {!telegramId && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl flex gap-3 items-start">
                            <span className="text-xl">⚠️</span>
                            <div className="text-xs text-yellow-200">
                                <strong>텔레그램 ID 미설정</strong><br />
                                알림을 모바일로 받으려면 [Settings] 메뉴에서 텔레그램을 연동해주세요.
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/20 py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "알림 저장하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function StockLiveChart({ symbol }: { symbol: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChart = async () => {
            setLoading(true);
            try {
                // symbol이 이미 .KS 등이 붙어있을 수 있음
                const res = await fetch(`${API_BASE_URL}/api/stock/chart/${encodeURIComponent(symbol)}`);
                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setData(json.data);
                }
            } catch (e) {
                console.error("Stock Chart fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchChart();
    }, [symbol]);

    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-gray-500" /></div>;
    if (!data || data.length === 0) return <div className="text-gray-500 text-sm">실시간 차트 데이터 없음</div>;

    const isUp = (data[data.length - 1]?.close || 0) >= (data[0]?.close || 0);
    const color = isUp ? "#ef4444" : "#3b82f6"; // Red or Blue

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorPriceStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [Number(value).toLocaleString(), '가격']}
                    labelStyle={{ display: 'none' }}
                />
                <Area
                    type="monotone"
                    dataKey="close"
                    stroke={color}
                    fillOpacity={1}
                    fill="url(#colorPriceStock)"
                    strokeWidth={2}
                    animationDuration={1000}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
