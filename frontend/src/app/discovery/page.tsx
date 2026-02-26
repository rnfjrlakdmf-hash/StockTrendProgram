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
import RiskAlert from "@/components/RiskAlert";

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
}


const TERM_EXPLANATIONS: Record<string, string> = {
    "?쒓?珥앹븸": "???뚯궗瑜??듭㎏濡??몄닔?섎젮硫??꾩슂???덉씠?먯슂. (湲곗뾽???⑹튂)",
    "嫄곕옒??: "?ㅻ뒛 ?섎（ ?숈븞 ?ш퀬?붾┛ 二쇱떇??媛쒖닔?덉슂. (留롮쓣?섎줉 ?멸린 ??컻!)",
    "PER": "蹂몄쟾 戮묐뒗 ??嫄몃━???쒓컙! ?レ옄媛 ??쓣?섎줉 ?멸쾶 ?щ뒗 嫄곗삁?? (媛?깅퉬)",
    "EPS": "二쇱떇 1二쇨? 1???숈븞 踰뚯뼱???쒖씠?듭씠?먯슂. ?믪쓣?섎줉 ?쇱쓣 ?섑븳 嫄곗짛!",
    "PBR": "?뚯궗媛 ?뱀옣 留앺빐??吏??몄꽌 ?붿븯????媛移??鍮?二쇨??덉슂. 1蹂대떎 ??쑝硫??먭컪!",
    "BPS": "吏湲??뱀옣 ?뚯궗瑜?泥?궛?섎㈃ 1二쇰떦 ?뚮젮諛쏅뒗 ?꾧툑 媛移섏삁??",
    "諛곕떦?섏씡瑜?: "????댁옄泥섎읆, 二쇱떇??媛뽮퀬 ?덉쑝硫?留ㅻ뀈 梨숆꺼二쇰뒗 蹂대꼫??鍮꾩쑉?댁뿉??",
    "二쇰떦諛곕떦湲?: "1二쇰? 媛뽮퀬 ?덉쓣 ???뚯궗媛 苑귥븘二쇰뒗 ?꾧툑 蹂대꼫???≪닔!",
    "異붿젙 PER": "?대뀈 ?ㅼ쟻??誘몃━ ?덉긽?대낯 媛?깅퉬 ?먯닔?덉슂.",
    "異붿젙 EPS": "?대뀈??1二쇰떦 ?쇰쭏瑜?踰?寃?媛숈?吏 ?덉긽??湲덉븸?댁뿉??",

    "PEG": "?깆옣???鍮?二쇨?媛 ?쇱? 鍮꾩떬吏 蹂대뒗 吏?쒖삁?? ??쓣?섎줉 醫뗭븘??",
};

function EasyTerm({ label, term, isEasyMode }: { label: string, term: string, isEasyMode: boolean }) {
    if (!isEasyMode) return <div className="text-gray-400 text-xs mb-1">{label}</div>;

    const explanation = TERM_EXPLANATIONS[term];

    return (
        <div className="group relative inline-flex items-center cursor-help mb-1">
            <span className="text-blue-300 border-b border-dashed border-blue-500/50 text-xs font-bold flex items-center gap-1">
                {label} <span className="text-[10px] text-yellow-400 opacity-80">?럳</span>
            </span>
            <div className="absolute bottom-full left-0 mb-2 w-52 p-3 bg-indigo-900/95 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md border border-white/10 leading-relaxed font-medium">
                <span className="text-yellow-300 font-bold block mb-1">?뮕 {term} 留먮옉 ???/span>
                {explanation || "?ъ슫 ?ㅻ챸??以鍮?以묒씠?먯슂!"}
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

    const [showHealthCheck, setShowHealthCheck] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'news' | 'disclosure' | 'backtest' | 'history' | 'daily' | 'story' | 'alerts'>('analysis');
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
                setError("寃?됰맂 醫낅ぉ???놁뒿?덈떎. ?뺥솗??醫낅ぉ紐낆씠???곗빱瑜??낅젰?댁＜?몄슂.");
            }
        } catch (err) {
            setStock(null);
            setLoading(false);
            setError("?쒕쾭 ?곌껐???ㅽ뙣?덉뒿?덈떎. (諛깆뿏???ㅽ뻾 ?щ?瑜??뺤씤?섏꽭??");
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
            <Header title="醫낅ぉ 諛쒓뎬 & 嫄닿컯寃吏? subtitle="AI媛 遺꾩꽍?섎뒗 醫낅ぉ???듭떖 嫄닿컯 ?곹깭" />

            <div className="p-6 space-y-8">
                {/* Initial View: Search, Widgets, Dashboard */}
                {!stock && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Search / Hero Section */}
                        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 p-6 border border-white/20 overflow-hidden shadow-xl">
                            <div className="relative z-10 max-w-2xl">
                                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-md">醫낅ぉ 嫄닿컯寃吏?(AI Health Check)</h2>
                                <p className="text-gray-200 mb-4 text-sm md:text-base">
                                    醫낅ぉ 肄붾뱶(?곗빱)瑜??낅젰?섏뿬 湲곗뾽???щТ ?곹깭? ?щ━瑜?遺꾩꽍?섏꽭??<br />
                                    <span className="text-xs text-gray-400">?덉떆: AAPL, ?쇱꽦?꾩옄 (?뚮쭏 寃??遺덇?)</span>
                                </p>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="醫낅ぉ紐??먮뒗 ?곗빱 ?낅젰..."
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
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "遺꾩꽍 ?쒖옉"}
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
                                    ?룯 ??怨꾩쥖 嫄닿컯寃吏?(AI)
                                </h3>
                                <p className="text-gray-400 text-sm mb-4 group-hover:text-gray-300 transition-colors">
                                    ???ы듃?대━?ㅻ뒗 鍮꾨쭔?쇨퉴 鍮덊삁?쇨퉴?<br />
                                    AI ?섏궗?먭쾶 吏꾨떒諛쏄퀬 泥섎갑?꾩쓣 ?뺤씤?섏꽭??
                                </p>
                                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                                    吏湲?吏꾨떒?섍린 ??
                                </div>
                            </div>
                        </div>

                        {/* [New] Real-time Rankings Widget */}
                        <RankingWidget />

                        {/* Market Indicators Grid */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">湲濡쒕쾶 ?쒖옣 紐⑤땲??/span>
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
                            <span className="text-xl">??/span> ?ㅻ줈 媛湲?
                        </button>

                        <div className="rounded-3xl bg-black/40 border border-white/20 p-6 md:p-8 shadow-lg">
                            <div className="flex items-center gap-4 mb-4 md:mb-6">
                                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-bold border border-purple-500/30">Theme Analysis</span>
                                <h2 className="text-xl md:text-3xl font-bold text-white">{stock.name.replace("?뚮쭏: ", "")}</h2>
                            </div>

                            <p className="text-sm md:text-xl text-gray-200 leading-relaxed mb-6 md:mb-8 border-l-4 border-purple-500 pl-4 py-2 bg-gradient-to-r from-purple-900/10 to-transparent">
                                {stock.summary}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Leaders */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                    <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                                        ?? ??μ＜ (Leaders)
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
                                        ?뵕 愿?⑥＜ (Followers)
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
                            <span className="text-xl">??/span> ?ㅻⅨ 醫낅ぉ 寃?됲븯湲?
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
                                                        ? `??{Number(String(stock.price).replace(/,/g, '')).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                                        : (stock.currency === 'USD' || (stock.currency && typeof stock.currency === 'string' && stock.currency.includes('USD')))
                                                            ? `$${stock.price}`
                                                            : `${stock.currency} ${stock.price}`}
                                                </span>
                                                {/* [Updated] Show KRW for foreign stocks ONLY */}
                                                {stock.currency !== 'KRW' && (stock.symbol && !stock.symbol.includes('.KS') && !stock.symbol.includes('.KQ')) && (
                                                    <span className="text-lg md:text-xl text-gray-400 font-mono">
                                                        (????getKrwPrice(stock.price)})
                                                    </span>
                                                )}
                                                <span className={`font-bold px-2 py-1 md:px-3 md:py-1 rounded-lg text-base md:text-lg ${stock.currency === 'KRW' ? (String(stock.change).startsWith('+') ? 'text-red-400 bg-red-400/20' : 'text-blue-400 bg-blue-400/20') : (String(stock.change).startsWith('+') ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20')}`}>
                                                    {stock.change}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full md:w-auto flex flex-wrap md:flex-col justify-between md:justify-end items-center md:items-end gap-4 md:gap-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                                            <div className="flex items-center gap-3 md:flex-col md:items-end">
                                                <div className="text-sm text-gray-400 md:mb-1">AI 醫낇빀 ?먯닔</div>
                                                <div className={`text-4xl md:text-5xl font-black ${stock.score >= 70 ? 'text-green-400' : 'text-yellow-400'} drop-shadow-sm`}>{stock.score}</div>
                                            </div>
                                            <div className="w-full md:w-auto mt-2 md:mt-2 flex items-center justify-end gap-2">
                                                {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && <WatchlistButton symbol={stock.symbol} />}
                                                {/* Memoize array to prevent infinite fetch loop in RiskAlert useEffect */}
                                                {activeTab === 'analysis' && React.createElement(() => {
                                                    const symbols = useMemo(() => [stock.symbol], [stock.symbol]);
                                                    return <RiskAlert symbols={symbols} />;
                                                })}
                                                {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                                    <button
                                                        onClick={() => setShowAlertModal(true)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border border-white/20 transition-all"
                                                    >
                                                        <Bell className="w-4 h-4" />
                                                        <span className="hidden sm:inline">?뚮┝</span>
                                                    </button>
                                                )}

                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <GaugeChart score={stock.metrics?.supplyDemand || 0} label="?섍툒 遺꾩꽍" subLabel="湲곌?/?멸뎅???섍툒 媛뺣룄" color="#3b82f6" />
                                        <GaugeChart score={stock.metrics?.financials || 0} label="?щТ 嫄댁쟾?? subLabel="?깆옣??諛??섏씡?? color="#10b981" />
                                        <GaugeChart score={stock.metrics?.news || 0} label="?댁뒪 ?щ━" subLabel="湲띿젙/遺???댁뒪 遺꾩꽍" color="#f59e0b" />
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
                                                    ?뱤 ?곸꽭 ?щТ/?ъ옄 吏??
                                                </h4>
                                                <button
                                                    onClick={() => setEasyMode(!easyMode)}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-2 border ${easyMode
                                                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20"
                                                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                                        }`}
                                                >
                                                    <span>?럳 二쇱떇 ?⑹뼱 踰덉뿭湲?/span>
                                                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${easyMode ? 'bg-black/30' : 'bg-black/50'}`}>
                                                        <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${easyMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="?쒓?珥앹븸 (Market Cap)" term="?쒓?珥앹븸" isEasyMode={easyMode} />
                                                    <div className="font-bold text-white text-lg tracking-tight">{stock.details?.market_cap || 'N/A'}</div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="嫄곕옒??(Volume)" term="嫄곕옒?? isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">{stock.details?.volume?.toLocaleString() || 'N/A'}</div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PER (二쇨??섏씡鍮꾩쑉)" term="PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pe_ratio === 'number')
                                                            ? `${stock.details.pe_ratio.toFixed(2)}諛?
                                                            : (stock.details?.pe_ratio || 'N/A')}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="EPS (二쇰떦?쒖씠??" term="EPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">{stock.details?.eps ? stock.details.eps.toLocaleString() : 'N/A'}</div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="諛곕떦?섏씡瑜?(Yield)" term="諛곕떦?섏씡瑜? isEasyMode={easyMode} />
                                                    <div className="font-mono text-green-400">
                                                        {(typeof stock.details?.dividend_yield === 'number')
                                                            ? `${(stock.details.dividend_yield * 100).toFixed(2)}%`
                                                            : (stock.details?.dividend_yield || 'N/A')}
                                                    </div>
                                                </div>

                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="異붿젙 PER" term="異붿젙 PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.forward_pe === 'number')
                                                            ? `${stock.details.forward_pe.toFixed(2)}諛?
                                                            : (stock.details?.forward_pe || 'N/A')}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="異붿젙 EPS" term="異붿젙 EPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {stock.details?.forward_eps
                                                            ? `${stock.currency === 'KRW' ? '?? : '$'}${stock.details.forward_eps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}`
                                                            : 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PBR" term="PBR" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pbr === 'number')
                                                            ? `${stock.details.pbr.toFixed(2)}諛?
                                                            : (stock.details?.pbr || 'N/A')}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="BPS" term="BPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {stock.details?.bps
                                                            ? `${stock.currency === 'KRW' ? '?? : '$'}${stock.details.bps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}`
                                                            : 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="二쇰떦諛곕떦湲? term="二쇰떦諛곕떦湲? isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {stock.details?.dividend_rate
                                                            ? `${stock.currency === 'KRW' ? '?? : '$'}${stock.details.dividend_rate.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}`
                                                            : 'N/A'}
                                                    </div>
                                                </div>

                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">?꾩씪 醫낃?</div>
                                                    <div className="font-mono text-gray-300">
                                                        {stock.currency === 'KRW' ? '?? : '$'}{stock.details?.prev_close?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">?쒓? (Open)</div>
                                                    <div className="font-mono text-gray-300">
                                                        {stock.currency === 'KRW' ? '?? : '$'}{stock.details?.open?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">怨좉? / ?媛</div>
                                                    <div className="font-mono text-sm">
                                                        <span className="text-red-400">{stock.details?.day_high?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                        <span className="text-gray-600 mx-1">/</span>
                                                        <span className="text-blue-400">{stock.details?.day_low?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 p-2">
                                                    <div className="text-gray-500 text-xs mb-1">52二?理쒓퀬 / 理쒖?</div>
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
                                            AI ?ъ옄?섍껄
                                        </button>
                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'news' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('news')}
                                        >
                                            愿???댁뒪
                                        </button>
                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'daily' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('daily')}
                                        >
                                            ?쇱씪 ?쒖꽭
                                        </button>
                                        {/* Story Chart tab removed per user request - news fetching issues
                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'story' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('story')}
                                        >
                                            ?뱰 二쇱떇 ?꾩씤??<span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full ml-1 text-purple-300">New</span>
                                        </button>
                                        */}

                                        {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                            <>
                                                <button
                                                    className={`pb-3 whitespace-nowrap ${activeTab === 'disclosure' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('disclosure')}
                                                >
                                                    怨듭떆(DART) <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-1 text-gray-300">New</span>
                                                </button>
                                                <button
                                                    className={`pb-3 whitespace-nowrap ${activeTab === 'backtest' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('backtest')}
                                                >
                                                    ?꾨왂 諛깊뀒?ㅽ똿
                                                </button>
                                                <button
                                                    className={`pb-3 whitespace-nowrap ${activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('history')}
                                                >
                                                    AI ?먯닔 異붿씠
                                                </button>

                                                <button
                                                    className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'alerts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('alerts')}
                                                >
                                                    ?썳截??뚯쓽 以?諛⑹뼱留?<span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full ml-1 text-blue-300">New</span>
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
                                                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-400" /> 醫낇빀 遺꾩꽍 由ы룷??
                                            </h4>
                                            <div className={`leading-relaxed text-sm md:text-lg font-medium whitespace-pre-wrap mb-6 min-h-[100px] ${(stock.summary || "").includes("?ㅻ쪟") ? 'text-red-300' : 'text-gray-100'}`}>
                                                {isAnalyzing && (!stock?.summary || stock.summary.length < 50) ? (
                                                    <div className="flex flex-col items-center justify-center h-full py-8 space-y-3 bg-white/5 rounded-xl border border-white/5">
                                                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                                        <div className="text-center">
                                                            <div className="text-blue-200 text-sm font-bold mb-1">AI媛 ?ㅼ떆媛??곗씠?곕? 遺꾩꽍 以묒엯?덈떎...</div>
                                                            <div className="text-slate-500 text-xs">?꾨왂 ?섎┰ 諛?由ы룷???묒꽦 以?(??3~5珥?</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    stock.summary || "遺꾩꽍 ?댁슜???놁뒿?덈떎."
                                                )}
                                            </div>

                                            {/* [New] 3-Line Rationale */}
                                            {stock.rationale && stock.rationale.supply && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                        <div className="text-blue-400 font-bold mb-1 flex items-center gap-2">???섍툒 (Supply)</div>
                                                        <div className="text-sm text-gray-200">{stock.rationale.supply}</div>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                        <div className="text-purple-400 font-bold mb-1 flex items-center gap-2">?뵦 紐⑤찘? (Momentum)</div>
                                                        <div className="text-sm text-gray-200">{stock.rationale.momentum}</div>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl border border-red-500/30">
                                                        <div className="text-red-400 font-bold mb-1 flex items-center gap-2">?좑툘 由ъ뒪??(Risk)</div>
                                                        <div className="text-sm text-gray-200">{stock.rationale.risk}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* [New] Risk Radar (SEIBRO) */}
                                            <div className="mb-6">
                                                <RiskAlert symbols={[stock.symbol]} />
                                            </div>



                                            <div className="mt-6 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30">
                                                <p className="text-blue-200 text-sm flex items-center gap-2">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    <strong>Guide:</strong> ??遺꾩꽍? AI媛 ?ㅼ떆媛??곗씠?곕? 諛뷀깢?쇰줈 ?앹꽦?덉쑝硫? ?ъ옄 李멸퀬?⑹엯?덈떎.
                                                </p>
                                            </div>
                                        </>
                                    ) : activeTab === 'news' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                                <TrendingUp className="h-6 w-6 text-yellow-400" /> 愿???댁뒪/怨듭떆
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
                                                        愿?⑤맂 理쒖떊 ?댁뒪媛 ?놁뒿?덈떎.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : activeTab === 'daily' && stock.symbol ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                                ?뱟 理쒓렐 ?쇱씪 ?쒖꽭
                                            </h4>
                                            <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-white/10 text-gray-400 text-sm">
                                                            <th className="py-3 px-2">?좎쭨</th>
                                                            <th className="py-3 px-2">醫낃?</th>
                                                            <th className="py-3 px-2">?깅씫</th>
                                                            <th className="py-3 px-2 text-right">嫄곕옒??/th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {stock.daily_prices && stock.daily_prices.length > 0 ? (
                                                            stock.daily_prices.map((day, idx) => (
                                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                    <td className="py-3 px-2 text-gray-300 font-mono text-sm">{day.date}</td>
                                                                    <td className="py-3 px-2 font-mono font-bold">
                                                                        {stock.currency === 'KRW' ? '?? : '$'}{day.close.toLocaleString()}
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
                                                                <td colSpan={4} className="py-4 text-center text-gray-500">?쇱씪 ?쒖꽭 ?곗씠???놁쓬</td>
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
                                        <h3 className="text-lg font-bold mb-4 text-white">愿???뱁꽣 醫낅ぉ</h3>
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
                                            <p className="text-gray-400 mb-4">{stock.name}怨??) ?좎궗???곗뾽援곗쓽 湲곗뾽?ㅼ쓣 鍮꾧탳 遺꾩꽍???덉젙?낅땲?? (?곗씠???섏쭛 以?</p>
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
    const [period, setPeriod] = useState("1y");
    const [error, setError] = useState("");

    const runBacktest = async () => {
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/stock/${symbol}/backtest?period=${period}`);
            const json = await res.json();
            if (json.status === "success") {
                setResult(json.data);
            } else {
                setError(json.message || "諛깊뀒?ㅽ똿 ?ㅽ뻾 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
            }
        } catch (err) {
            console.error(err);
            setError("?쒕쾭 ?곌껐???ㅽ뙣?덉뒿?덈떎.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-xl font-bold text-white mb-1">?대룞?됯퇏 援먯감 ?꾨왂 (Golden Cross)</h4>
                    <p className="text-gray-400 text-sm">?④린 ?댄룊??5?????κ린 ?댄룊??20?????뚰뙆????留ㅼ닔?섎뒗 ?꾨왂</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none"
                    >
                        <option value="6mo">6媛쒖썡</option>
                        <option value="1y">1??/option>
                        <option value="2y">2??/option>
                        <option value="5y">5??/option>
                    </select>
                    <button
                        onClick={runBacktest}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        ?쒕??덉씠???ㅽ뻾
                    </button>
                </div>
            </div>

            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                    {/* metrics and chart... */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">理쒖쥌 ?섏씡瑜?/div>
                            <div className={`text-2xl font-bold ${result.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {result.total_return}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">?⑥닚 蹂댁쑀 ??/div>
                            <div className={`text-xl font-bold ${result.buy_hold_return >= 0 ? 'text-gray-200' : 'text-gray-400'}`}>
                                {result.buy_hold_return}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">理쒕? ?숉룺 (MDD)</div>
                            <div className="text-xl font-bold text-red-300">
                                {result.max_drawdown}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">理쒖쥌 ?먯궛 ({currency === 'KRW' ? '??0k' : '$10k'} ?ъ옄 ??</div>
                            <div className="text-xl font-bold text-blue-200">
                                {currency === 'KRW' ? '?? : '$'}{result.final_equity.toLocaleString(undefined, { maximumFractionDigits: currency === 'KRW' ? 0 : 2 })}
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
                                <Line type="monotone" dataKey="strategy" stroke="#3b82f6" strokeWidth={2} dot={false} name="?꾨왂 ?섏씡湲? />
                                <Line type="monotone" dataKey="buy_hold" stroke="#6b7280" strokeWidth={2} dot={false} name="?⑥닚 蹂댁쑀" strokeDasharray="4 4" />
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
                <span>AI ?먯닔 蹂??異붿씠</span>
                {loading && <Loader2 className="animate-spin w-4 h-4 text-blue-400" />}
            </h4>

            {!loading && history.length === 0 && (
                <div className="p-8 text-center text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>??λ맂 ?먯닔 ?덉뒪?좊━媛 ?놁뒿?덈떎.</p>
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
                                                    <span className="text-purple-400 font-bold">醫낇빀 ?먯닔:</span>
                                                    <span className="text-white font-mono">{data.score.toFixed(1)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-green-400 text-xs">?щТ:</span>
                                                    <span className="text-white text-xs font-mono">{(data.financial || 0).toFixed(1)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-amber-400 text-xs">?щ━:</span>
                                                    <span className="text-white text-xs font-mono">{(data.news || 0).toFixed(1)}</span>
                                                </div>
                                            </div>
                                            {data.reason && (
                                                <div className="mt-3 pt-2 border-t border-gray-600">
                                                    <p className="text-xs text-blue-300 font-semibold mb-1">?뱤 蹂???댁쑀:</p>
                                                    <p className="text-xs text-gray-300">{data.reason}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                            <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="醫낇빀 ?먯닔" />
                            <Line type="monotone" dataKey="financial" stroke="#10b981" strokeWidth={1} dot={false} name="?щТ 嫄댁쟾?? strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="news" stroke="#f59e0b" strokeWidth={1} dot={false} name="AI ?щ━ ?먯닔" strokeDasharray="3 3" />
                        </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center mt-2 text-gray-400">
                        理쒓렐 50??遺꾩꽍 寃곌낵 ?몃젋?????뮕 李⑦듃 ?ъ씤???꾩뿉 留덉슦?ㅻ? ?щ젮 蹂???댁쑀瑜??뺤씤?섏꽭??
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
            {isWatchlisted ? '愿?ъ쥌紐? : '愿?щ벑濡?}
        </button>
    );
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
                        ?슗 ?ㅻ뒛 ?쒖옣??
                    </h3>
                    <p className={`text-lg font-bold leading-tight ${signal.signal === 'red' ? 'text-red-400' :
                        signal.signal === 'yellow' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                        {signal.message}
                    </p>
                    {signal.reason && (
                        <div className="mt-3 bg-white/5 rounded-lg p-2 text-sm text-gray-300 border border-white/5">
                            <span className="font-bold text-blue-200">?먯씤?</span> {signal.reason}
                        </div>
                    )}
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${getTrafficColor(signal.signal)} animate-pulse`}>
                    <div className="text-3xl">
                        {signal.signal === 'red' ? '?썞' : signal.signal === 'yellow' ? '?좑툘' : '??'}
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
            setError("吏꾨떒??醫낅ぉ???낅젰?댁＜?몄슂.");
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
                setError(json.message || "遺꾩꽍???ㅽ뙣?덉뒿?덈떎.");
            }
        } catch (err) {
            console.error("Analysis Error:", err);
            setError("?쒕쾭 ?곌껐???ㅽ뙣?덉뒿?덈떎. 諛깆뿏???곹깭瑜??뺤씤?댁＜?몄슂.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative z-[110] bg-[#111] border border-white/20 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-gray-800 to-black">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        ?룯 AI ?ы듃?대━??吏꾨떒
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">??/button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 text-white">
                    {!result ? (
                        <div className="space-y-4">
                            <p className="text-gray-300">
                                蹂댁쑀?섍퀬 ?덈뒗 醫낅ぉ?ㅼ쓣 ?낅젰?댁＜?몄슂. (?쇳몴濡?援щ텇)<br />
                                <span className="text-xs md:text-sm text-gray-500">?덉떆: ?쇱꽦?꾩옄, SK?섏씠?됱뒪, NAVER, 移댁뭅?? Tesla, Apple</span>
                            </p>
                            <textarea
                                className="w-full h-32 bg-white/5 border border-white/20 rounded-xl p-4 text-base md:text-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="醫낅ぉ紐??낅젰..."
                                value={portfolioText}
                                onChange={(e) => setPortfolioText(e.target.value)}
                            />

                            {error && (
                                <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/20">
                                    ?좑툘 {error}
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
                                    <span>{loading ? "AI 吏꾨떒 以?.." : "嫄닿컯寃吏??쒖옉"}</span>
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center">
                                <div className="text-gray-400 text-sm mb-2">?뚯썝?섏쓽 二쇱떇 嫄닿컯 ?먯닔</div>
                                <div className={`text-6xl font-black mb-4 ${result.score >= 80 ? 'text-green-400' :
                                    result.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    {result.score}??
                                </div>
                                <div className="inline-block bg-white/10 px-4 py-2 rounded-full text-lg font-bold border border-white/20">
                                    吏꾨떒紐? {result.diagnosis}
                                </div>
                            </div>

                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <h4 className="text-blue-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                                    ?뭻 AI ?섏궗 泥섎갑??
                                </h4>
                                <p className="text-sm md:text-lg leading-relaxed whitespace-pre-wrap text-gray-200">
                                    {result.prescription}
                                </p>
                            </div>

                            {result.details && (result.details.sector_bias || result.details.risk_level) && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <div className="text-gray-500 text-xs mb-1">?뱁꽣 ?몄쨷??/div>
                                        <div className="font-bold">{result.details.sector_bias || "N/A"}</div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <div className="text-gray-500 text-xs mb-1">?꾪뿕 ?덈꺼</div>
                                        <div className="font-bold">{result.details.risk_level || "N/A"}</div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setResult(null)}
                                className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-bold transition-colors"
                            >
                                ?ㅻⅨ ?ы듃?대━??吏꾨떒?섍린
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
                    ???ㅼ떆媛??섍툒 ?ъ갑 (?좎젙移?
                </h4>
                <div className="p-6 bg-white/5 rounded-xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
                    {isWeekend ? (
                        <>
                            <div className="text-3xl">?샂</div>
                            <div className="text-gray-300 font-bold">?ㅻ뒛? ?댁옣??二쇰쭚)?낅땲??</div>
                            <div className="text-sm text-gray-500">?ㅼ떆媛??좎젙 ?섍툒? ?됱씪 ?μ쨷(09:30 ~ 14:30)?먮쭔 吏묎퀎?⑸땲??</div>
                        </>
                    ) : !isMarketOpen ? (
                        <>
                            <div className="text-3xl">?뙔</div>
                            <div className="text-gray-300 font-bold">吏湲덉? ???댁쁺 ?쒓컙???꾨떃?덈떎.</div>
                            <div className="text-sm text-gray-500">?ㅼ떆媛??섍툒 吏묎퀎媛 醫낅즺?섏뿀?듬땲?? (?댁쁺?쒓컙: 09:00 ~ 15:30)</div>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl">?벊</div>
                            <div className="text-gray-300 font-bold">?좎젙 吏묎퀎 ?꾪솴???꾩쭅 ?놁뒿?덈떎.</div>
                            <div className="text-sm text-gray-500">???쒖옉 吏곹썑?닿굅?? 嫄곕옒?됱씠 ?곸뼱 吏묎퀎?섏? ?딆븯?????덉뒿?덈떎.</div>
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
                            ?뱤 ?ㅻ뒛???섍툒 寃곌낵 <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2">?뺤젙移?/span>
                        </>
                    ) : (
                        <>
                            ?뱤 理쒓렐 ?섍툒 寃곌낵 ({last?.time}) <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2">?뺤젙移?/span>
                        </>
                    )
                ) : (
                    !isMarketOpen ? (
                        <>
                            ?뢾 ?ㅻ뒛???섍툒 ?좎젙移?(留덇컧) <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2">?λ쭏媛?/span>
                        </>
                    ) : (
                        <>
                            ???ㅼ떆媛??섍툒 ?ъ갑 (?좎젙移? <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2">09:30~14:30 吏묎퀎</span>
                        </>
                    )
                )}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-xl border ${totalForeigner > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-sm text-gray-400 mb-1">
                        {isDaily ? (isToday ? '?멸뎅???ㅻ뒛 ?⑷퀎' : '?멸뎅???뱀씪 ?⑷퀎') : '?멸뎅???좎젙 ?⑷퀎'}
                    </div>
                    <div className={`text-2xl font-bold font-mono ${totalForeigner > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {totalForeigner > 0 ? '+' : ''}{totalForeigner.toLocaleString()}二?
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${totalInst > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-xs md:text-sm text-gray-400 mb-1">
                        {isDaily ? (isToday ? '湲곌? ?ㅻ뒛 ?⑷퀎' : '湲곌? ?뱀씪 ?⑷퀎') : '湲곌? ?좎젙 ?⑷퀎'}
                    </div>
                    <div className={`text-lg md:text-2xl font-bold font-mono ${totalInst > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {totalInst > 0 ? '+' : ''}{totalInst.toLocaleString()}二?
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10 max-h-60 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-xs text-gray-400 uppercase font-bold sticky top-0 backdrop-blur-md">
                        <tr>
                            <th className="px-4 py-3">?쒓컙</th>
                            <th className="px-4 py-3 text-right">?멸뎅??(異붿젙)</th>
                            <th className="px-4 py-3 text-right">湲곌? (異붿젙)</th>
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
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">吏묎퀎???곗씠?곌? ?놁뒿?덈떎.</td>
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
                        ?쒕ℓ????
                    </div>
                    <ul className="space-y-2 text-gray-400 pl-1 custom-list">
                        <li className="flex gap-2">
                            <span className="text-red-300 font-bold whitespace-nowrap">?멸뎅??</span>
                            <span>&quot;??二쇱떇 吏湲??몃떎!&quot; ?곗넀?ㅼ씠 ?λ컮援щ땲???닿퀬 ?덉뼱?? 二쇨? ?곸듅??湲띿젙?곸씤 ?좏샇?덉슂.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-red-300 font-bold whitespace-nowrap">湲곌?:</span>
                            <span>&quot;?ㅼ쟻 醫뗭쓣 寃?媛숇꽕&quot; ?섎ŉ 臾쇰웾??紐⑥쑝怨??덉뼱?? ?좊뱺??吏?먭뎔???앷릿 ?덉씠二?</span>
                        </li>
                    </ul>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                    <div className="font-bold text-gray-200 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        ?쒕ℓ????
                    </div>
                    <ul className="space-y-2 text-gray-400 pl-1 custom-list">
                        <li className="flex gap-2">
                            <span className="text-blue-300 font-bold whitespace-nowrap">?멸뎅??</span>
                            <span>&quot;?댁씡 梨숆꺼???좊굹??quot; 二쇱떇???붽퀬 ?꾧툑?뷀븯??以묒씠?먯슂. ?④린?곸쑝濡?二쇨?媛 ?대┫ ???덉뼱??</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-blue-300 font-bold whitespace-nowrap">湲곌?:</span>
                            <span>&quot;?ы듃?대━??議곗젙 以?quot; 媛吏怨??덈뜕 二쇱떇???붽퀬 ?덉뼱?? ?곸듅 ?섏씠 ?쏀빐吏????덉뼱??</span>
                        </li>
                    </ul>
                </div>
            </div>

            <p className="text-xs text-gray-500 mt-2 text-right">* ???곗씠?곕뒗 ?μ쨷 ?좎젙移섎줈, ??醫낅즺 ???뺤젙移섏? ?ㅻ? ???덉뒿?덈떎.</p>
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
                alert("???뚮┝???ㅼ젙?섏뿀?듬땲??\n" + (telegramId ? "?벒 ?붾젅洹몃옩?쇰줈 ?뚮┝???꾩넚?⑸땲??" : "?좑툘 ?붾젅洹몃옩 ID媛 ?ㅼ젙?섏? ?딆븘 ?뚮┝??諛쏆쓣 ???놁뒿?덈떎. ?ㅼ젙 ?섏씠吏瑜??뺤씤?섏꽭??"));
                onClose();
            } else {
                alert("???ㅼ젙 ?ㅽ뙣: " + json.message);
            }
        } catch (e) {
            alert("?쒕쾭 ?듭떊 ?ㅻ쪟");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/20 rounded-3xl w-full max-w-md overflow-hidden transform scale-100 transition-all shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/40 to-purple-900/40">
                    <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        ?뵒 媛寃??뚮┝ ?ㅼ젙
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">??/button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="text-gray-400 text-xs md:text-sm mb-1">{symbol} ?꾩옱媛</div>
                        <div className="text-2xl md:text-3xl font-bold text-white tracking-widest">{currentPrice.toLocaleString()}</div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-300 mb-2 block">紐⑺몴 媛寃??ㅼ젙</label>
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
                                ???댁긽????(?뚰뙆)
                            </button>
                            <button
                                onClick={() => setCondition("below")}
                                className={`py-3 rounded-xl border font-bold transition-all ${condition === "below" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-gray-400"}`}
                            >
                                ???댄븯????(?섎씫)
                            </button>
                        </div>
                    </div>

                    {!telegramId && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl flex gap-3 items-start">
                            <span className="text-xl">?좑툘</span>
                            <div className="text-xs text-yellow-200">
                                <strong>?붾젅洹몃옩 ID 誘몄꽕??/strong><br />
                                ?뚮┝??紐⑤컮?쇰줈 諛쏆쑝?ㅻ㈃ [Settings] 硫붾돱?먯꽌 ?붾젅洹몃옩???곕룞?댁＜?몄슂.
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/20 py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "?뚮┝ ??ν븯湲?}
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
                // symbol???대? .KS ?깆씠 遺숈뼱?덉쓣 ???덉쓬
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
    if (!data || data.length === 0) return <div className="text-gray-500 text-sm">?ㅼ떆媛?李⑦듃 ?곗씠???놁쓬</div>;

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
                    formatter={(value: any) => [Number(value).toLocaleString(), '媛寃?]}
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
