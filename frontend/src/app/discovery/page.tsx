"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import MarketIndicators from "@/components/MarketIndicators";
import GaugeChart from "@/components/GaugeChart";
import { TrendingUp, ShieldCheck, Loader2, PlayCircle, Swords, Bell, Star, Save, LineChart as LineChartIcon, TrendingDown, AlertTriangle, Info, ArrowRight, Share2, BookOpen, Clock, Calendar, Cpu, Zap, Globe, BarChart2, Search, Lock, MessageSquare } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import ComponentErrorBoundary from '@/components/ComponentErrorBoundary';
import { useStockSocket } from "@/hooks/useStockSocket";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

import StoryChart from "@/components/StoryChart";
import PriceAlertSetup from "@/components/PriceAlertSetup";
import PriceAlertList from "@/components/PriceAlertList";
import DisclosureTable from "@/components/DisclosureTable";
import FCMTokenManager from "@/components/FCMTokenManager";
import SimplePushTest from "@/components/SimplePushTest";
import FinancialsTable from "@/components/FinancialsTable";
import CompanyAnalysisScore from "@/components/CompanyAnalysisScore";
import InvestorTrendTab from "@/components/InvestorTrendTab";
import OverhangTab from "@/components/OverhangTab";
import MarketScannerDashboard from "@/components/MarketScannerDashboard";
import KoreanCompanyOverview from "@/components/KoreanCompanyOverview";
import TurboQuantIndicators from "@/components/TurboQuantIndicators";

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
    description?: string;
    symbol: string;
    price: string;
    price_krw?: string;
    change: string;
    currency: string;
    sector: string;
    market_type?: string;
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
        market_status?: string;
        nxt_data?: {
            price: number;
            change_val: number;
            change_pct: string;
        };
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
                <span className="text-yellow-300 font-bold block mb-1"><span>💡</span> <span>{term}</span> <span>지표 풀이</span></span>
                <span>{explanation || "쉬운 설명이 준비 중이에요!"}</span>
                <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-indigo-900/95"></div>
            </div>
        </div>
    );
}

// [Cache System] Ultra-fast navigation
const STOCK_CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000; // 1 minute cache for fast re-navigation

// Helper for parsing change rate and applying standard KOR formatting (Red = Up, Blue = Down, with ▲/▼)
const formatChangeDisplay = (val: any) => {
    if (!val || val === 'N/A' || val === '-') return { colorText: 'text-gray-400', colorBg: 'bg-gray-400/20', text: val };
    const str = String(val).trim();
    if (str === '0' || str === '0.00%' || str === '0.0') return { colorText: 'text-gray-400', colorBg: 'bg-gray-400/20', text: str };
    
    // Improved Parsing: Check markers OR numerical value
    const isNegExplicit = str.includes('-') || str.includes('▼') || str.includes('하락');
    const isPosExplicit = str.includes('+') || str.includes('▲') || str.includes('상승');
    
    const num = parseFloat(str.replace(/[^\d.-]/g, ''));
    if (isNaN(num)) return { colorText: 'text-gray-400', colorBg: 'bg-gray-400/20', text: str };
    if (num === 0) return { colorText: 'text-gray-400', colorBg: 'bg-gray-400/20', text: str };

    const isPos = isPosExplicit || (!isNegExplicit && num > 0);
    const isNeg = isNegExplicit || (!isPosExplicit && num < 0);
    
    // Remove existing signs for clean formatting
    let cleanText = str.replace(/[+▼▲-]/g, '').replace('하락', '').replace('상승', '').trim();
    
    if (isPos) return { colorText: 'text-red-400', colorBg: 'bg-red-400/20', text: `▲ ${cleanText}` };
    if (isNeg) return { colorText: 'text-blue-400', colorBg: 'bg-blue-400/20', text: `▼ ${cleanText}` };
    
    return { colorText: 'text-gray-400', colorBg: 'bg-gray-400/20', text: cleanText };
};

// Extended helper combining Amount + Percentage (e.g., ▲ 11,000 (1.01%))
const formatChangeWithAmountDisplay = (changePctStr: any, currentPrice: any, prevClose: any, explicitChangeVal?: any, currency: string = 'KRW') => {
    const baseFormat = formatChangeDisplay(changePctStr);
    
    let amtStr = "";
    const pVal = parseFloat(String(currentPrice || "0").replace(/,/g, ''));
    const isKRW = currency === 'KRW' || !currency || currency === 'null';
    
    if (explicitChangeVal !== undefined && explicitChangeVal !== null) {
        const diff = parseFloat(String(explicitChangeVal).replace(/,/g, ''));
        if (!isNaN(diff) && diff !== 0) {
            const prefix = !isKRW ? '$' : '';
            const decimals = isKRW ? 0 : 2;
            amtStr = `${prefix}${Math.abs(diff).toLocaleString(undefined, {maximumFractionDigits: decimals})} `;
        }
    } else if (!isNaN(pVal) && pVal !== 0) {
        let diff = 0;
        if (prevClose !== undefined && prevClose !== null) {
            const prev = parseFloat(String(prevClose).replace(/,/g, ''));
            if (!isNaN(prev)) diff = pVal - prev;
        } else if (changePctStr && String(changePctStr).includes('%')) {
            // Reverse calculate from percentage
            const pct = parseFloat(String(changePctStr).replace(/[^\d.-]/g, ''));
            if (!isNaN(pct) && pct !== 0) {
                // Rate = (P - Prev) / Prev * 100 -> Prev = P / (1 + Rate/100)
                const prev = pVal / (1 + (pct / 100));
                diff = pVal - prev;
            }
        }
        
        if (diff !== 0) {
           const prefix = !isKRW ? '$' : '';
           const decimals = isKRW ? 0 : 2;
           // If it's a very small difference in USD, use more decimals
           const optDecimals = !isKRW && Math.abs(diff) < 0.1 ? 4 : decimals;
           amtStr = `${prefix}${Math.abs(diff).toLocaleString(undefined, {maximumFractionDigits: optDecimals})} `;
        }
    }
    
    const textStr = String(baseFormat.text || "");
    if (amtStr && textStr.includes('%')) {
       const iconMatch = textStr.match(/^[▲▼]/);
       const icon = iconMatch ? iconMatch[0] + ' ' : '';
       const pct = textStr.replace(/^[▲▼]\s*/, '');
       return { ...baseFormat, text: `${icon}${amtStr}(${pct})` };
    }
    if (amtStr && !textStr.includes('%')) {
       const iconMatch = textStr.match(/^[▲▼]/);
       const icon = iconMatch ? iconMatch[0] + ' ' : '';
       return { ...baseFormat, text: `${icon}${amtStr}` };
    }
    return baseFormat;
};

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
    const [mounted, setMounted] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [stock, setStock] = useState<StockData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false); // [New] AI analyzing state
    const [error, setError] = useState("");
    const [showReport, setShowReport] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'news' | 'disclosure' | 'financials' | 'backtest' | 'history' | 'daily' | 'story' | 'alerts' | 'dividend_health' | 'investor' | 'overhang'>('analysis');
    const [easyMode, setEasyMode] = useState(false);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [exchangeRate, setExchangeRate] = useState<number>(1450); // Default
    const [financialHighlights, setFinancialHighlights] = useState<any[]>([]);
    const [financialsLoading, setFinancialsLoading] = useState(false);
    const [dividendData, setDividendData] = useState<any>(null);
    const [healthData, setHealthData] = useState<any>(null);
    const [dividendLoading, setDividendLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // [New] News Period State
    const [newsPeriod, setNewsPeriod] = useState('1d');
    const [periodNews, setPeriodNews] = useState<any[]>([]);
    const [newsLoading, setNewsLoading] = useState(false);

    // [New] Daily Prices State
    const [dailyRange, setDailyRange] = useState('1mo');
    const [dailyPricesData, setDailyPricesData] = useState<any[]>([]);
    const [dailyLoading, setDailyLoading] = useState(false);

    // Initialize dailyPricesData when stock changes
    useEffect(() => {
        if (stock) {
            setDailyPricesData(stock.daily_prices || []);
            setDailyRange('1mo');
        }
    }, [stock?.symbol]);

    // Fetch daily prices when tab is active and range changes
    useEffect(() => {
        const fetchDailyPrices = async () => {
            if (!stock?.symbol) return;
            setDailyLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/stock/${encodeURIComponent(stock.symbol)}/daily-history?range=${dailyRange}`);
                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setDailyPricesData(json.data);
                }
            } catch (err) {
                console.error("Daily price fetch error:", err);
            } finally {
                setDailyLoading(false);
            }
        };

        if (activeTab === 'daily') fetchDailyPrices();
    }, [dailyRange, stock?.symbol, activeTab]);

    // [New] Effect to fetch period-based news
    useEffect(() => {
        const fetchPeriodNews = async () => {
            if (!stock?.symbol) return;
            setNewsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/stock/` + encodeURIComponent(stock.symbol) + `/news?period=` + newsPeriod);
                const json = await res.json();
                if (json.status === "success") {
                    setPeriodNews(json.data);
                }
            } catch (err) {
                console.error("News fetch error:", err);
            } finally {
                setNewsLoading(false);
            }
        };
        if (activeTab === 'news') fetchPeriodNews();
    }, [newsPeriod, stock?.symbol, activeTab]);

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
                    change: realtimeData.change,
                    details: prev.details ? {
                        ...prev.details,
                        market_status: realtimeData.details?.market_status || prev.details?.market_status,
                        nxt_data: realtimeData.details?.nxt_data || prev.details?.nxt_data
                    } : prev.details
                } as StockData;
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

    const getKrwPrice = (price: string | number, manualRate?: number) => {
        const p = parseFloat(String(price).replace(/,/g, ''));
        if (isNaN(p)) return null;
        const rate = manualRate || exchangeRate;
        return (p * rate).toLocaleString(undefined, { maximumFractionDigits: 0 });
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

                // 3. Fetch Financial Highlights
                setFinancialsLoading(true);
                fetch(`${API_BASE_URL}/api/stock/${safeTicker}/financials`)
                    .then(res => res.json())
                    .then(resJson => {
                        if (resJson.status === "success") {
                            setFinancialHighlights(resJson.data || []);
                        }
                    })
                    .catch(() => { })
                    .finally(() => setFinancialsLoading(false));

            } else {
                // [Fallback] Search via Backend API (Global/Dynamic Map)
                try {
                    const searchRes = await fetch(`${API_BASE_URL}/api/stock/search?q=${safeTicker}`);
                    const searchJson = await searchRes.json();

                    if (searchJson.status === "success" && Array.isArray(searchJson.data) && searchJson.data.length > 0) {
                        // Found a better match! Retry with this symbol
                        const foundSymbol = searchJson.data[0].symbol;
                        if (foundSymbol && foundSymbol !== ticker) {
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

    if (!mounted) return null;

    return (
        <div className="min-h-screen pb-10 text-white notranslate" translate="no">
            <Header title="종목 발굴 & 데이터 분석" subtitle="AI가 분석하는 종목의 핵심 데이터 현황" />

            <div className="p-6 space-y-8">
                {/* Initial View: Search, Widgets, Dashboard */}
                {!stock && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Search / Hero Section */}
                        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 p-6 border border-white/20 overflow-hidden shadow-xl">
                            <div className="relative z-10 max-w-2xl">
                                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-md"><span>종목 데이터 분석 (AI Analysis)</span></h2>
                                <p className="text-gray-200 mb-4 text-sm md:text-base">
                                    <span><span>종목 코드(티커)를 입력하여 기업의 재무 상태와 시장 심리를 분석하세요.</span><br />
                                    <span className="text-xs text-gray-400"><span>예시: AAPL, 삼성전자 (테마 검색 불가)</span></span></span>
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
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span>분석 시작</span>}
                                    </button>
                                </div>

                                {error && <p className="text-red-400 mt-3 font-semibold bg-red-900/40 p-2 rounded-lg inline-block">{error}</p>}
                            </div>
                            <ShieldCheck className="absolute right-0 top-1/2 -translate-y-1/2 h-64 w-64 text-white/5 -rotate-12" />
                        </div>

                        {/* Market Traffic Light & Health Check Entry */}
                        <div className="w-full">
                            <MarketSignalWidget />
                        </div>

                        {/* 신규: 팩트 기반 증시 스캐너 & LIVE 공시 속보 */}
                        <div className="w-full">
                            <MarketScannerDashboard />
                        </div>


                        {/* Market Indicators Grid Removed (Redundant with Market Intelligence) */}
                    </div>
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
                            <span><span>←</span> <span>뒤로 가기</span></span>
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
                                                    <div className={`font-mono font-bold ${formatChangeWithAmountDisplay(item.change_percent || item.change, item.price, undefined, undefined, 'KRW').colorText}`}>
                                                        {item.price}
                                                    </div>
                                                    <div className={`text-[10px] md:text-xs font-bold leading-tight ${formatChangeWithAmountDisplay(item.change_percent || item.change, item.price, undefined, undefined, 'KRW').colorText}`}>
                                                        {formatChangeWithAmountDisplay(item.change_percent || item.change, item.price, undefined, undefined, 'KRW').text}
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
                                                    <div className={`font-mono font-bold ${formatChangeWithAmountDisplay(item.change_percent || item.change, item.price, undefined, undefined, 'KRW').colorText}`}>
                                                        {item.price}
                                                    </div>
                                                    <div className={`text-[10px] md:text-xs font-bold leading-tight ${formatChangeWithAmountDisplay(item.change_percent || item.change, item.price, undefined, undefined, 'KRW').colorText}`}>
                                                        {formatChangeWithAmountDisplay(item.change_percent || item.change, item.price, undefined, undefined, 'KRW').text}
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
                            <span><span>←</span> <span>다른 종목 검색하기</span></span>
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Main Score Card */}
                                <div className="rounded-3xl bg-black/40 border border-white/20 p-6 backdrop-blur-md shadow-lg mb-6">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 md:gap-0">
                                        <div>
                                            <h3 className="text-2xl md:text-3xl font-bold flex flex-wrap items-center gap-2 md:gap-3 text-white">
                                                <span>{stock.name}</span>
                                                {stock.market_type && (
                                                    <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-md border font-black uppercase tracking-wider ${
                                                        stock.market_type.includes('KOSPI') ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 
                                                        stock.market_type.includes('KOSDAQ') ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 
                                                        'bg-gray-500/10 text-gray-400 border-gray-500/30'
                                                    }`}>
                                                        <span>{stock.market_type}</span>
                                                    </span>
                                                )}
                                                <span className="text-base md:text-lg text-gray-400 font-medium whitespace-nowrap">
                                                    <span>{stock.symbol}</span>
                                                </span>
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                                                <span className="text-3xl md:text-4xl font-bold text-white">
                                                    {stock.currency === 'KRW'
                                                        ? <span><span>{"₩"}</span><span>{Number(String(stock.price).replace(/,/g, '')).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                                                        : (stock.currency === 'USD' || (stock.currency && typeof stock.currency === 'string' && stock.currency.includes('USD')))
                                                            ? <span><span>{"$"}</span><span>{stock.price}</span></span>
                                                            : <span><span>{stock.currency}</span> <span>{stock.price}</span></span>}
                                                </span>
                                                {/* [Updated] Show KRW for foreign stocks ONLY */}
                                                {stock.currency !== 'KRW' && (stock.symbol && !stock.symbol.includes('.KS') && !stock.symbol.includes('.KQ')) && (
                                                    <span className="text-lg md:text-xl text-gray-400 font-mono">
                                                        <span>(약 ₩</span><span>{stock.price_krw || getKrwPrice(stock.price)}</span><span>)</span>
                                                    </span>
                                                )}
                                                <span className={`font-bold px-2 py-1 md:px-3 md:py-1 rounded-lg text-base md:text-lg ${formatChangeWithAmountDisplay(stock.change, stock.price, stock.details?.prev_close, undefined, stock.currency).colorText} ${formatChangeWithAmountDisplay(stock.change, stock.price, stock.details?.prev_close, undefined, stock.currency).colorBg}`}>
                                                    <span>{formatChangeWithAmountDisplay(stock.change, stock.price, stock.details?.prev_close, undefined, stock.currency).text}</span>
                                                </span>
                                                {/* [New] Market Status Badge with Green Light */}
                                                {stock.details?.market_status && (
                                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold border shadow-sm transition-all ${stock.details.market_status.includes('장중') || stock.details.market_status.includes('Open') || stock.details.market_status.includes('야간거래') || stock.details.market_status.includes('NXT')
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/30 ring-1 ring-green-500/10'
                                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                        }`}>
                                                        {(stock.details.market_status.includes('장중') || stock.details.market_status.includes('Open') || stock.details.market_status.includes('야간거래') || stock.details.market_status.includes('NXT')) && (
                                                            <span className="flex h-2 w-2 relative">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                            </span>
                                                        )}
                                                        {stock.details.market_status === 'After-Market' ? <span>야간거래(NXT)</span> : 
                                                         stock.details.market_status === 'Unknown' ? <span>데이터 준비중</span> : 
                                                         <span>{stock.details.market_status}</span>}
                                                    </span>
                                                )}
                                            </div>
                                            {/* [New] NXT After Market Price */}
                                            {stock.details?.nxt_data && (
                                                <div className="mt-2 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-fit">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider"><span>NXT After Market</span></span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl font-black text-white">
                                                                <span>₩</span><span>{stock.details.nxt_data.price.toLocaleString()}</span>
                                                            </span>
                                                            <span className={`text-xs font-bold ${formatChangeWithAmountDisplay(stock.details.nxt_data.change_pct, stock.details.nxt_data.price, undefined, stock.details.nxt_data.change_val, 'KRW').colorText}`}>
                                                                <span>{formatChangeWithAmountDisplay(stock.details.nxt_data.change_pct, stock.details.nxt_data.price, undefined, stock.details.nxt_data.change_val, 'KRW').text}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full md:w-auto flex flex-wrap md:flex-col justify-between md:justify-end items-center md:items-end gap-4 md:gap-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                                            <div className="flex items-center gap-3 md:flex-col md:items-end">
                                                <div className="text-sm text-gray-400 md:mb-1"><span>AI 종합 점수</span></div>
                                                <div className={`text-4xl md:text-5xl font-black ${stock.score >= 70 ? 'text-green-400' : 'text-yellow-400'} drop-shadow-sm`}><span>{stock.score}</span></div>
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
                                                {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                                    <a
                                                        href={`/community?stock=${encodeURIComponent(stock.symbol)}`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-100 border border-blue-500/30 transition-all"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span className="hidden sm:inline">종목 토론방</span>
                                                    </a>
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
                                                    <div className="font-bold text-white text-lg tracking-tight"><span>{stock.details?.market_cap || 'N/A'}</span></div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="거래량 (Volume)" term="거래량" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white"><span>{stock.details?.volume?.toLocaleString() || 'N/A'}</span></div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PER (주가수익비율)" term="PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pe_ratio === 'number' && stock.details.pe_ratio !== 0)
                                                            ? <span><span>{stock.details.pe_ratio.toFixed(2)}</span><span>배</span></span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="EPS (주당순이익)" term="EPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        <span>{typeof stock.details?.eps === 'number' ? stock.details.eps.toLocaleString() : '-'}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="배당수익률 (Yield)" term="배당수익률" isEasyMode={easyMode} />
                                                    <div className="font-mono text-green-400">
                                                        <span>{(typeof stock.details?.dividend_yield === 'number' && stock.details.dividend_yield !== 0)
                                                            ? <span>{(stock.details.dividend_yield * 100).toFixed(2)}</span>
                                                            : <span>{'-'}</span>}
                                                            {(typeof stock.details?.dividend_yield === 'number' && stock.details.dividend_yield !== 0) && <span>%</span>}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="추정 PER" term="추정 PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        <span>{(typeof stock.details?.forward_pe === 'number' && stock.details.forward_pe !== 0)
                                                            ? <span><span>{stock.details.forward_pe.toFixed(2)}</span><span>배</span></span>
                                                            : <span>{'-'}</span>}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="추정 EPS" term="추정 EPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {typeof stock.details?.forward_eps === 'number'
                                                            ? <span><span>{stock.currency === 'KRW' ? '₩' : '$'}</span><span>{stock.details.forward_eps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
                                                            : <span><span>{'-'}</span></span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PBR" term="PBR" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pbr === 'number' && stock.details.pbr !== 0)
                                                            ? <span>{stock.details.pbr.toFixed(2)}배</span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="BPS" term="BPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {typeof stock.details?.bps === 'number'
                                                            ? <span>{stock.currency === 'KRW' ? '₩' : '$'}{stock.details.bps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="주당배당금" term="주당배당금" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.dividend_rate === 'number' && stock.details.dividend_rate !== 0)
                                                            ? <span>{stock.currency === 'KRW' ? '₩' : '$'}{stock.details.dividend_rate.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>

                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">전일 종가</div>
                                                    <div className="font-mono text-gray-300">
                                                        <span>{stock.currency === 'KRW' ? '₩' : '$'}</span>
                                                        <span>{stock.details?.prev_close?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">시가 (Open)</div>
                                                    <div className="font-mono text-gray-300">
                                                        <span>{stock.currency === 'KRW' ? '₩' : '$'}</span>
                                                        <span>{stock.details?.open?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1"><span>고가 / 저가</span></div>
                                                    <div className="font-mono text-sm">
                                                        <span className="text-red-400">{stock.details?.day_high?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                        <span className="text-gray-600 mx-1">/</span>
                                                        <span className="text-blue-400">{stock.details?.day_low?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 p-2">
                                                    <div className="text-gray-500 text-xs mb-1"><span>52주 최고 / 최저</span></div>
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
                                            <span>데이터 종합 분석</span>
                                        </button>

                                        {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                            <button
                                                className={`pb-3 whitespace-nowrap ${activeTab === 'financials' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                onClick={() => setActiveTab('financials')}
                                            >
                                                <span>재무제표</span>
                                            </button>
                                        )}



                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'daily' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('daily')}
                                        >
                                            <span>일일 시세</span>
                                        </button>

                                        {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                            <>
                                                <button
                                                    className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'investor' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('investor')}
                                                >
                                                    <span>📈 투자자 동향</span> <span className="text-xs bg-indigo-500/20 px-2 py-0.5 rounded-full ml-1 text-indigo-300">New</span>
                                                </button>
                                                <button
                                                    className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'dividend_health' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => {
                                                        setActiveTab('dividend_health');
                                                        if (stock && !dividendData) {
                                                            setDividendLoading(true);
                                                            const sym = encodeURIComponent(stock.symbol);
                                                            Promise.all([
                                                                fetch(`${API_BASE_URL}/api/stock/${sym}/dividends`).then(r => r.json()),
                                                                fetch(`${API_BASE_URL}/api/stock/${sym}/health`).then(r => r.json())
                                                            ]).then(([divRes, healthRes]) => {
                                                                if (divRes.status === 'success') setDividendData(divRes.data);
                                                                if (healthRes.status === 'success') setHealthData(healthRes.data);
                                                            }).catch(() => { }).finally(() => setDividendLoading(false));
                                                        }
                                                    }}
                                                >
                                                    <span>💰 배당/건전성</span> <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full ml-1 text-emerald-300">New</span>
                                                </button>
                                                <button
                                                    className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'overhang' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('overhang')}
                                                >
                                                    <span>⚠️ 오버행/타법인</span> <span className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded-full ml-1 text-yellow-300">New</span>
                                                </button>
                                                <button
                                                    className={`pb-3 whitespace-nowrap ${activeTab === 'disclosure' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                    onClick={() => setActiveTab('disclosure')}
                                                >
                                                    <span>공시(DART)</span> <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-1 text-gray-300">New</span>
                                                </button>
                                            </>
                                        )}

                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'news' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('news')}
                                        >
                                            <span>관련 뉴스</span>
                                        </button>


                                    </div>

                                    {activeTab === 'dividend_health' && (
                                        <DividendHealthTab
                                            dividendData={dividendData}
                                            healthData={healthData}
                                            loading={dividendLoading}
                                        />
                                    )}

                                    {activeTab === 'investor' && (
                                        <InvestorTrendTab
                                            symbol={stock.symbol}
                                            stockName={stock.name}
                                        />
                                    )}

                                    {activeTab === 'overhang' && (
                                        <OverhangTab
                                            symbol={stock.symbol}
                                            stockName={stock.name}
                                        />
                                    )}

                                    {activeTab === 'analysis' ? (
                                        <>
                                            {/* Chart Section Hidden */}

                                            {/* AI Opinion */}
                                            {/* AI Opinion */}
                                            {/* [New] Detailed Corporate Overview Section (KR Only) */}
                                            {(stock.symbol.split('.')[0].length === 6 && /^\d+$/.test(stock.symbol.split('.')[0])) && (
                                                <div className="mb-10">
                                                    <KoreanCompanyOverview 
                                                        symbol={stock.symbol} 
                                                        stockName={stock.name} 
                                                    />
                                                </div>
                                            )}



                                            {/* [New] Corporate Overview Section (Basic Description) */}
                                            {stock.description && (
                                                <div className="mb-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 p-5 md:p-6 shadow-lg">
                                                    <h4 className="text-sm font-black text-indigo-300 flex items-center gap-2 mb-4 uppercase tracking-widest">
                                                        🏢 기업 개요 (Company Profile)
                                                    </h4>
                                                    <div className="text-gray-300 text-sm md:text-base leading-relaxed font-medium">
                                                        {stock.description}
                                                    </div>
                                                </div>
                                            )}

                                            <h4 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-400" /> 종합 분석 리포트
                                            </h4>
                                            <div className={`leading-relaxed text-sm md:text-lg font-medium whitespace-pre-wrap mb-6 min-h-[100px] ${(stock.summary || "").includes("오류") ? 'text-red-300' : 'text-gray-100'}`}>
                                                {isAnalyzing && (!stock?.summary || (stock.summary && stock.summary.length < 50)) ? (
                                                    <div className="flex flex-col items-center justify-center h-full py-8 space-y-3 bg-white/5 rounded-xl border border-white/5">
                                                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                                        <div className="text-center">
                                                            <div className="text-blue-200 text-sm font-bold mb-1"><span>AI가 실시간 데이터를 분석 중입니다...</span></div>
                                                            <div className="text-slate-500 text-xs"><span>전략 수립 및 리포트 작성 중 (약 3~5초)</span></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span>{stock.summary || "분석 내용이 없습니다."}</span>
                                                )}
                                                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-[11px] text-gray-400 leading-relaxed">
                                                    ⚠️ **주의**: 본 분석 결과는 객관적 재무 지표와 공시 정보를 바탕으로 알고리즘이 생성한 '참고용' 요약입니다. 어떠한 경우에도 투자 권유나 수익 보장을 의미하지 않으며, 모든 투자 결정에 대한 책임은 투자자 본인에게 있습니다.
                                                </div>
                                            </div>

                                            {/* [New] Healthcare Analysis Integration - Hidden by user request 
                                            {stock.symbol && !stock.symbol.includes("MARKET") && (
                                                <div className="mt-8 pt-8 border-t border-white/10">
                                                    <h4 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                                                        <ShieldCheck className="h-6 w-6 text-green-400" /> 재무 지표 현황 분석 (알고리즘 산출)
                                                    </h4>
                                                    <CompanyAnalysisScore symbol={stock.symbol} autoLoad={true} />
                                                </div>
                                            )}
                                            */}


                                            {/* [New] 3-Line Rationale */}
                                            {stock.rationale && stock.rationale.supply && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                        <div className="text-blue-400 font-bold mb-1 flex items-center gap-2"><span>✅ 수급 (Supply)</span></div>
                                                        <div className="text-sm text-gray-200"><span>{stock.rationale.supply}</span></div>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                        <div className="text-purple-400 font-bold mb-1 flex items-center gap-2"><span>🔥 모멘텀 (Momentum)</span></div>
                                                        <div className="text-sm text-gray-200"><span>{stock.rationale.momentum}</span></div>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl border border-red-500/30">
                                                        <div className="text-red-400 font-bold mb-1 flex items-center gap-2"><span>⚠️ 리스크 (Risk)</span></div>
                                                        <div className="text-sm text-gray-200"><span>{stock.rationale.risk}</span></div>
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
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <h4 className="text-xl font-bold flex items-center gap-2 text-white">
                                                    <TrendingUp className="h-6 w-6 text-yellow-400" /> 관련 뉴스/공시
                                                </h4>
                                                
                                                {/* [New] Period Filter Bar */}
                                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start md:self-end">
                                                    {[
                                                        { id: '1d', label: '당일' },
                                                        { id: '3m', label: '3개월' },
                                                        { id: '6m', label: '6개월' },
                                                        { id: '1y', label: '1년' }
                                                    ].map((p) => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => setNewsPeriod(p.id)}
                                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                                newsPeriod === p.id 
                                                                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                            }`}
                                                        >
                                                            {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                                {newsLoading ? (
                                                    <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                                        <Loader2 className="h-8 w-8 text-yellow-400 animate-spin mb-4" />
                                                        <p className="text-gray-400 text-sm">실시간 뉴스를 집계하고 있습니다...</p>
                                                    </div>
                                                ) : (Array.isArray(periodNews) && periodNews.length > 0) || (stock?.news && Array.isArray(stock.news) && stock.news.length > 0) ? (
                                                    (Array.isArray(periodNews) && periodNews.length > 0 ? periodNews : (stock?.news || [])).map((n: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-start p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 cursor-pointer" onClick={() => window.open(n.link, '_blank')}>
                                                            <div className="w-full">
                                                                <h5 className="font-bold text-white mb-2 group-hover:text-yellow-400 text-lg leading-snug break-all">
                                                                    <span>{n.title}</span>
                                                                </h5>
                                                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                                                    <span className="bg-yellow-400/10 px-2 py-0.5 rounded text-xs text-yellow-400 font-bold border border-yellow-400/20">
                                                                        <span>{n.publisher}</span>
                                                                    </span>
                                                                    <span className="font-mono text-xs">
                                                                        <span>{toKoreanDate(n.published)}</span>
                                                                    </span>
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
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                <h4 className="text-xl font-bold flex items-center gap-2 text-white">
                                                    📅 일일 시세
                                                    {dailyLoading && <span className="ml-2 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>}
                                                </h4>
                                                
                                                <div className="flex gap-2">
                                                    {[
                                                        { id: '1mo', label: '1개월' },
                                                        { id: '3mo', label: '3개월' },
                                                        { id: '6mo', label: '6개월' },
                                                        { id: '1y', label: '1년' }
                                                    ].map(period => (
                                                        <button
                                                            key={period.id}
                                                            onClick={() => setDailyRange(period.id)}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dailyRange === period.id
                                                                ? 'bg-primary text-white shadow-md'
                                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {period.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto bg-white/5 rounded-xl border border-white/10 max-h-[600px] overflow-y-auto">
                                                <table className="w-full text-left border-collapse relative">
                                                    <thead className="sticky top-0 bg-[#0f172a] shadow-sm z-10">
                                                        <tr className="border-b border-white/10 text-gray-400 text-sm">
                                                            <th className="py-3 px-2">날짜</th>
                                                            <th className="py-3 px-2">종가</th>
                                                            <th className="py-3 px-2">등락</th>
                                                            <th className="py-3 px-2 text-right">거래량</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {dailyPricesData && Array.isArray(dailyPricesData) && dailyPricesData.length > 0 ? (
                                                            dailyPricesData.map((day, idx) => (
                                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                    <td className="py-3 px-2 text-gray-300 font-mono text-sm">
                                                                        <span>{toKoreanDate(day.date)}</span>
                                                                    </td>
                                                                    <td className="py-3 px-2 font-mono font-bold">
                                                                        <span><span>{stock.currency === 'KRW' ? '₩' : '$'}</span><span>{day.close.toLocaleString()}</span></span>
                                                                    </td>
                                                                    <td className={`py-3 px-2 font-mono font-bold ${day.change > 0 ? 'text-red-400' : day.change < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                                        <span><span>{day.change > 0 ? '+' : null}</span><span>{day.change.toFixed(2)}</span><span>%</span></span>
                                                                    </td>
                                                                    <td className="py-3 px-2 text-right text-gray-400 font-mono text-sm">
                                                                        <span>{day.volume.toLocaleString()}</span>
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

                                    ) : (stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET"))) && activeTab === 'disclosure' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <DisclosureTable symbol={stock.symbol} />
                                        </div>
                                    ) : (stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET"))) && activeTab === 'financials' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <FinancialsTable data={stock.health_data?.raw_data} />
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
                                        {stock.related_stocks && Array.isArray(stock.related_stocks) && stock.related_stocks.length > 0 ? (
                                            <div className="space-y-3">
                                                {stock.related_stocks.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => handleSearch(item.symbol)}
                                                        className="group cursor-pointer flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all"
                                                    >
                                                        <div className="flex-1 min-w-0 pr-3">
                                                            <div className="font-bold text-white text-sm whitespace-normal break-words group-hover:text-blue-300 transition-colors">
                                                                <span>{item.name}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 font-mono mb-1"><span>{item.symbol}</span></div>
                                                            <div className="text-[10px] text-gray-400 truncate">
                                                                <span>{item.reason}</span>
                                                            </div>
                                                        </div>

                                                        <div className="text-right whitespace-nowrap">
                                                            {item.price && (
                                                                <div className="font-mono text-sm text-white font-bold mb-1">
                                                                    <span>{item.price}</span>
                                                                </div>
                                                            )}
                                                            {item.change && (
                                                                <div className={`text-xs font-bold px-2 py-1 rounded-md inline-block ${formatChangeWithAmountDisplay(item.change, item.price, undefined, undefined, 'KRW').colorText} ${formatChangeWithAmountDisplay(item.change, item.price, undefined, undefined, 'KRW').colorBg}`}>
                                                                    <span>{formatChangeWithAmountDisplay(item.change, item.price, undefined, undefined, 'KRW').text}</span>
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








interface ScoreHistory {
    date: string;
    score: number;
    financial: number;
    news: number;
}

/** [Helper] 날짜를 한국 표기법으로 변환 (YYYY년 MM월 DD일) */
const toKoreanDate = (val: any) => {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d.getTime())) {
        // 이미 YYYY.MM.DD 형식인 경우 처리
        if (typeof val === 'string' && val.includes('.')) {
            const parts = val.split('.');
            if (parts.length >= 3) return `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
        }
        return val;
    }
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

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

            {!loading && (!Array.isArray(history) || history.length === 0) && (
                <div className="p-8 text-center text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>저장된 점수 히스토리가 없습니다.</p>
                </div>
            )}

            {Array.isArray(history) && history.length > 0 && (
                <div className="h-64 w-full bg-white/5 rounded-xl border border-white/10 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#aaaaaa' }}
                                tickFormatter={(val) => toKoreanDate(val)}
                            />
                            <YAxis domain={[0, 100]} />
                            <Tooltip
                                content={(props: any) => {
                                    if (!props.active || !props.payload || !props.payload.length) return null;
                                    const data = props.payload[0].payload;
                                    return (
                                        <div className="bg-gray-800 border border-gray-600 rounded-xl p-3 shadow-lg">
                                            <p className="text-xs text-gray-400 mb-2">{toKoreanDate(data.date)}</p>
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
    const { user } = useAuth();
    const [isWatchlisted, setIsWatchlisted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkWatchlist = async () => {
            if (!user) {
                setLoading(false);
                setIsWatchlisted(false);
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                    headers: { "X-User-ID": user.id }
                });

                // [Fix] Check response status
                if (!res.ok) {
                    setLoading(false);
                    return;
                }

                const json = await res.json();
                // json.data is now array of objects {symbol, name}
                if (json.status === "success" && json.data.some((item: any) => item.symbol === symbol)) {
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
    }, [symbol, user]);

    const toggleWatchlist = async () => {
        if (!user) {
            alert("관심종목 기능은 로그인이 필요합니다.");
            return;
        }
        if (loading) return;
        setLoading(true);
        try {
            const method = isWatchlisted ? 'DELETE' : 'POST';
            const url = isWatchlisted ? `${API_BASE_URL}/api/watchlist/${symbol}` : `${API_BASE_URL}/api/watchlist`;

            const options: RequestInit = { 
                method,
                headers: { "X-User-ID": user.id }
            };
            if (!isWatchlisted) {
                options.headers = { 
                    ...options.headers,
                    'Content-Type': 'application/json' 
                };
                options.body = JSON.stringify({ symbol });
            }

            const res = await fetch(url, options);
            const json = await res.json();

            if (json.status === "success") {
                setIsWatchlisted(!isWatchlisted);
                // Dispatch event to notify Sidebar
                window.dispatchEvent(new CustomEvent('watchlistChanged'));
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
            {isWatchlisted ? <span>관심종목</span> : <span>관심등록</span>}
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

// [New] Financial Highlights Component
function FinancialHighlights({ data, loading }: { data: any[], loading: boolean }) {
    if (loading) return <div className="h-32 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 animate-pulse text-gray-500 text-xs">재무 데이터를 불러오는 중...</div>;
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-5 mb-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <BarChart2 className="w-24 h-24 text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2 mb-4">
                📈 최근 3개년 실적 하이라이트 (연간)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-3 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '11px' }}
                                formatter={(value: any) => [`${(Number(value) / 100000000).toLocaleString()} 억원`, '']}
                                labelStyle={{ fontWeight: 'bold', color: '#60a5fa' }}
                            />
                            <Line type="monotone" dataKey="revenue" name="매출액" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="op_income" name="영업이익" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                    {Array.isArray(data) && data.slice(-1).map((latest, i) => (
                        <div key={i} className="space-y-3">
                            <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                                <p className="text-[10px] text-gray-500 mb-0.5"><span>최근 연매출</span></p>
                                <p className="text-sm font-bold text-blue-300"><span><span>{(Number(latest?.revenue || 0) / 100000000).toLocaleString()}</span> <span>억원</span></span></p>
                            </div>
                            <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                <p className="text-[10px] text-gray-500 mb-0.5"><span>영업이익</span></p>
                                <p className="text-sm font-bold text-emerald-400"><span><span>{(Number(latest?.op_income || 0) / 100000000).toLocaleString()}</span> <span>억원</span></span></p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="mt-3 text-[10px] text-gray-500 leading-relaxed italic border-t border-white/5 pt-2">
                * 위 수치는 DART/yfinance 공정 공시 데이터를 기반으로 가공된 객관적 수치이며, 향후 실적을 보장하지 않습니다.
            </p>
        </div>
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
                        📈 시장 데이터 요약
                    </h3>
                    <p className={`text-lg font-bold leading-tight ${signal.signal === 'red' ? 'text-red-400' :
                        signal.signal === 'yellow' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                        <span>{signal.message}</span>
                    </p>
                    {signal.reason && (
                        <div className="mt-3 bg-white/5 rounded-lg p-2 text-sm text-gray-300 border border-white/5">
                            <span className="font-bold text-blue-200"><span>원인?</span></span> <span>{signal.reason}</span>
                        </div>
                    )}
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${getTrafficColor(signal.signal)} animate-pulse`}>
                    <div className="text-3xl">
                        {signal.signal === 'red' ? <span>🛑</span> : signal.signal === 'yellow' ? <span>⚠️</span> : <span>🚀</span>}
                    </div>
                </div>
            </div>



            <div className="mt-6 flex items-center gap-4 text-sm text-gray-400 z-10">
                <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <span>KOSPI</span> <span className="text-gray-200 font-mono ml-1"><span>{signal.details?.kospi}</span></span>
                </div>
                <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <span>USD/KRW</span> <span className="text-gray-200 font-mono ml-1"><span>{signal.details?.usd}</span></span>
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
            setError("분석할 종목을 입력해주세요.");
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
                                    <span>{result.score}</span><span>점</span>
                                </div>
                                <div className="inline-block bg-white/10 px-4 py-2 rounded-full text-lg font-bold border border-white/20">
                                    <span><span>상태 요약:</span> <span>{result.diagnosis}</span></span>
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
                                다른 포트폴리오 분석하기
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

    if (!data || !Array.isArray(data) || data.length === 0) {
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
    const last = (Array.isArray(data) && data.length > 0) ? data[data.length - 1] : null;
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
                            <span>📊 오늘의 수급 결과</span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>확정치</span></span>
                        </>
                    ) : (
                        <>
                            <span>📊 최근 수급 결과</span> <span>(<span>{last?.time}</span>)</span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>확정치</span></span>
                        </>
                    )
                ) : (
                    !isMarketOpen ? (
                        <>
                            <span>🏁 오늘의 수급 잠정치 (마감)</span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>장마감</span></span>
                        </>
                    ) : (
                        <>
                            <span>📊 실시간 수급 분석 데이터</span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>09:30~14:30 집계</span></span>
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
                        <span>{totalForeigner > 0 ? '+' : null}</span><span><span>{totalForeigner.toLocaleString()}</span><span>주</span></span>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${totalInst > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-xs md:text-sm text-gray-400 mb-1">
                        {isDaily ? (isToday ? '기관 오늘 합계' : '기관 당일 합계') : '기관 잠정 합계'}
                    </div>
                    <div className={`text-lg md:text-2xl font-bold font-mono ${totalInst > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        <span>{totalInst > 0 ? '+' : null}</span><span><span>{totalInst.toLocaleString()}</span><span>주</span></span>
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
                        {Array.isArray(data) && data.length > 0 ? (
                            data.slice().reverse().map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-2 font-mono text-gray-300"><span>{row.time}</span></td>
                                    <td className={`px-4 py-2 text-right font-mono font-bold ${row.foreigner > 0 ? 'text-red-400' : row.foreigner < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                        <span>{(row.foreigner || 0).toLocaleString()}</span>
                                    </td>
                                    <td className={`px-4 py-2 text-right font-mono font-bold ${row.institution > 0 ? 'text-red-400' : row.institution < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                        <span>{(row.institution || 0).toLocaleString()}</span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500"><span>집계된 데이터가 없습니다.</span></td>
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
                            <span>&quot;매수 유입 확인&quot; 주요 주체들의 수급량이 증가하며 자금이 유입되고 있습니다. 수급 측면에서의 긍정적 지표입니다.</span>
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
                        <div className="text-gray-400 text-xs md:text-sm mb-1"><span>{symbol} 현재가</span></div>
                        <div className="text-2xl md:text-3xl font-bold text-white tracking-widest"><span>{currentPrice.toLocaleString()}</span></div>
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
                                <span>▲ 이상일 때 (돌파)</span>
                            </button>
                            <button
                                onClick={() => setCondition("below")}
                                className={`py-3 rounded-xl border font-bold transition-all ${condition === "below" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-gray-400"}`}
                            >
                                <span>▼ 이하일 때 (하락)</span>
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
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : <span>알림 저장하기</span>}
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
    if (!data || !Array.isArray(data) || data.length === 0) return <div className="text-gray-500 text-sm"><span>실시간 차트 데이터 없음</span></div>;

    const isUp = (Array.isArray(data) && data.length > 0) ? ((data[data.length - 1]?.close || 0) >= (data[0]?.close || 0)) : false;
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


// [NEW] 배당 히스토리 & 재무 건전성 탭 컴포넌트
function DividendHealthTab({
    dividendData,
    healthData,
    loading,
}: {
    dividendData: any;
    healthData: any;
    loading: boolean;
}) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-gray-400 text-sm"><span>배당 &amp; 재무 건전성 데이터 불러오는 중...</span></p>
            </div>
        );
    }

    const hasDividend = dividendData && Array.isArray(dividendData.years) && dividendData.years.length > 0;
    const hasHealth = healthData && Array.isArray(healthData.years) && healthData.years.length > 0;

    if (!hasDividend && !hasHealth) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
                <BarChart2 className="w-10 h-10 opacity-30" />
                <p className="text-sm"><span>이 종목의 배당/재무 데이터를 수집할 수 없습니다.</span></p>
                <p className="text-xs text-gray-600"><span>국내 종목은 종목코드(6자리)로 검색하면 더 정확합니다.</span></p>
            </div>
        );
    }

    const divChartData = hasDividend && Array.isArray(dividendData.years) && Array.isArray(dividendData.amounts)
        ? dividendData.years.map((y: string, i: number) => ({ year: String(y || ""), div: Number(dividendData.amounts[i] || 0) }))
        : [];

    const healthChartData = hasHealth && Array.isArray(healthData.years)
        ? healthData.years.map((y: string, i: number) => ({
            year: y,
            debt: (healthData.debt_ratio || [])[i],
            current: (healthData.current_ratio || [])[i],
            roe: (healthData.roe || [])[i],
        }))
        : [];

    const summary = dividendData?.summary ?? {};

    return (
        <div className="space-y-6">
            {hasDividend && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-center">
                        <p className="text-[10px] text-gray-500 mb-1"><span>최근 연도 배당금</span></p>
                        <p className="text-lg font-black text-emerald-400">
                            <span>{ (summary.latest_div ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }</span> <span>원</span>
                        </p>
                        <p className="text-[10px] text-gray-600"><span>{summary.latest_year}</span><span>년 기준</span></p>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 text-center">
                        <p className="text-[10px] text-gray-500 mb-1"><span>연속 배당 연수</span></p>
                        <p className="text-lg font-black text-blue-400"><span>{summary.consecutive_years ?? "-"}</span> <span>년</span></p>
                    </div>
                    {summary.yoy_growth_pct !== undefined && (
                        <div className={`border rounded-xl p-4 text-center ${summary.yoy_growth_pct >= 0 ? "bg-green-500/5 border-green-500/15" : "bg-red-500/5 border-red-500/15"}`}>
                            <p className="text-[10px] text-gray-500 mb-1"><span>전년대비 배당 변화</span></p>
                            <p className={`text-lg font-black ${summary.yoy_growth_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                                <span>{summary.yoy_growth_pct >= 0 ? "+" : null}</span><span>{summary.yoy_growth_pct}%</span>
                            </p>
                        </div>
                    )}
                </div>
            )}

            {hasDividend && (
                <div className="bg-black/30 border border-white/10 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-emerald-300 mb-4"><span>💰 연간 배당금 히스토리 (최근 5개년)</span></h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={divChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                            <XAxis dataKey="year" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v: number) => v.toLocaleString()} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #10b98130", borderRadius: "12px", fontSize: "11px" }}
                                formatter={(v: any) => [`${Number(v).toLocaleString()} 원`, "배당금"]}
                            />
                            <Area type="monotone" dataKey="div" name="배당금" stroke="#10b981" strokeWidth={3} fill="url(#divGrad)" dot={{ r: 4, fill: "#10b981" }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {hasHealth && (
                <div className="bg-black/30 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-blue-300"><span>🏦 재무 건전성 지표 추이 (부채비율 · 유동비율 · ROE)</span></h4>
                        {healthData?.source === 'DART' && (
                            <span className="bg-blue-900/40 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                <span>DART 공식 데이터</span>
                            </span>
                        )}
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={healthChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                            <XAxis dataKey="year" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} unit="%" />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #3b82f630", borderRadius: "12px", fontSize: "11px" }}
                                formatter={(value: any) => [value !== null && value !== undefined ? `${value}%` : "N/A", ""]}
                            />
                            <Line type="monotone" dataKey="debt" name="부채비율" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line type="monotone" dataKey="current" name="유동비율" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line type="monotone" dataKey="roe" name="ROE" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-4 mt-2">
                        <span className="text-[10px] text-red-400"><span>● 부채비율 — 낮을수록 안전</span></span>
                        <span className="text-[10px] text-blue-400"><span>● 유동비율 — 높을수록 단기 안전</span></span>
                        <span className="text-[10px] text-yellow-400"><span>● ROE — 높을수록 자본 효율 우수</span></span>
                    </div>
                </div>
            )}

            <p className="text-[10px] text-gray-500 italic border-t border-white/5 pt-3">
                <span>* 위 수치는</span> <span>{healthData?.source === 'DART' ? 'DART(전자공시시스템) 사업보고서 원본 데이터' : 'yfinance 공개 데이터'}</span> <span>기반의 객관적 사실입니다. 향후 실적이나 주가 수익률을 보장하지 않습니다.</span>
            </p>
        </div>
    );
}
