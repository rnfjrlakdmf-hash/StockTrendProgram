"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import MarketIndicators from "@/components/MarketIndicators";
import GaugeChart from "@/components/GaugeChart";
import { TrendingUp, ShieldCheck, Loader2, PlayCircle, Swords, Bell, Star, Save, LineChart as LineChartIcon, TrendingDown, AlertTriangle, Info, ArrowRight, Share2, BookOpen, Clock, Calendar, Cpu, Zap, Globe, BarChart2, Search, Lock, MessageSquare, Coins, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import ComponentErrorBoundary from '@/components/ComponentErrorBoundary';
import { useStockSocket } from "@/hooks/useStockSocket";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import AIDisclaimer from "@/components/AIDisclaimer";

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

const STOCK_CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000;

const formatChangeDisplay = (val: any) => {
    if (val === undefined || val === null || val === 'N/A' || val === '-') {
        return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: '0.00%' };
    }
    const str = String(val).trim();
    if (str === '0' || str === '0.00%' || str === '0.0' || !str) {
        return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: '0.00%' };
    }
    
    const labelMatch = str.match(/^(\[[^\]]+\])/);
    const label = labelMatch ? labelMatch[1] : "";
    
    const isNegExplicit = str.includes('-') || str.includes('▼') || str.includes('하락');
    const isPosExplicit = str.includes('+') || str.includes('▲') || str.includes('상승');
    
    const num = parseFloat(str.replace(/\[[^\]]+\]/g, '').replace(/[^\d.-]/g, ''));
    if (isNaN(num)) return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: str };
    if (num === 0) return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: label ? `${label} 0.00%` : '0.00%' };

    const isPos = isPosExplicit || (!isNegExplicit && num > 0);
    const isNeg = isNegExplicit || (!isPosExplicit && num < 0);
    
    let cleanText = str.replace(/\[[^\]]+\]/g, '').replace(/[+▼▲-]/g, '').replace('하락', '').replace('상승', '').trim();
    
    if (!str.includes('%')) {
        const absVal = Math.abs(parseFloat(cleanText.replace(/,/g, '')));
        if (absVal > 500) {
            return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: label ? `${label} 0.00%` : '0.00%' };
        }
        cleanText = `${cleanText}%`;
    }
    
    if (isPos) return { colorText: 'text-red-500', colorBg: 'bg-red-500/10', text: label ? `${label} ▲ ${cleanText}` : `▲ ${cleanText}` };
    if (isNeg) return { colorText: 'text-blue-500', colorBg: 'bg-blue-500/10', text: label ? `${label} ▼ ${cleanText}` : `▼ ${cleanText}` };
    
    return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: label ? `${label} ${cleanText}` : `${cleanText}` };
};

const formatChangeWithAmountDisplay = (changePctStr: any, currentPrice: any, prevClose: any, explicitChangeVal?: any, currency: string = 'KRW') => {
    const baseFormat = formatChangeDisplay(changePctStr);
    
    let amtStr = "";
    let calculatedDiff = 0;
    const pVal = parseFloat(String(currentPrice || "0").replace(/,/g, ''));
    const isKRW = currency === 'KRW' || !currency || currency === 'null';
    
    if (explicitChangeVal !== undefined && explicitChangeVal !== null) {
        calculatedDiff = parseFloat(String(explicitChangeVal).replace(/,/g, ''));
    } else if (!isNaN(pVal) && pVal !== 0) {
        if (prevClose !== undefined && prevClose !== null) {
            const prev = parseFloat(String(prevClose).replace(/,/g, ''));
            if (!isNaN(prev)) calculatedDiff = pVal - prev;
        } else if (changePctStr && String(changePctStr).includes('%')) {
            const pct = parseFloat(String(changePctStr).replace(/[^\d.-]/g, ''));
            if (!isNaN(pct) && pct !== 0) {
                const prev = pVal / (1 + (pct / 100));
                calculatedDiff = pVal - prev;
            }
        }
    }

    if (calculatedDiff !== 0) {
        const prefix = !isKRW ? '$' : '';
        const decimals = isKRW ? 0 : 2;
        const optDecimals = !isKRW && Math.abs(calculatedDiff) < 0.1 ? 4 : decimals;
        amtStr = `${prefix}${Math.abs(calculatedDiff).toLocaleString(undefined, {maximumFractionDigits: optDecimals})} `;
    }
    
    let finalFormat = { ...baseFormat };
    if (baseFormat.colorText === 'text-slate-400' && calculatedDiff !== 0) {
        if (calculatedDiff > 0) {
            finalFormat.colorText = 'text-red-500';
            finalFormat.colorBg = 'bg-red-500/10';
        } else {
            finalFormat.colorText = 'text-blue-500';
            finalFormat.colorBg = 'bg-blue-500/10';
        }
    }
    
    const textStr = String(finalFormat.text || "");
    const icon = calculatedDiff > 0 ? '▲ ' : calculatedDiff < 0 ? '▼ ' : '';
    
    let pct = textStr.replace(/^[▲▼]\s*/, '').trim();
    if (!pct || pct === 'undefined' || pct === 'null' || pct === '0.00%') {
        if (calculatedDiff !== 0 && pVal > 0) {
            const prevVal = pVal - calculatedDiff;
            if (prevVal > 0) {
                pct = `${(Math.abs(calculatedDiff) / prevVal * 100).toFixed(2)}%`;
            }
        }
    }
    if (!pct || pct === 'undefined') pct = '0.00%';

    const labelMatch = textStr.match(/^(\[[^\]]+\])/);
    const label = labelMatch ? labelMatch[1] : "";
    let cleanPct = pct.replace(/^\[[^\]]+\]\s*/, '');

    if (amtStr) {
       return { ...finalFormat, text: label ? `${label} ${icon}${amtStr}(${cleanPct})` : `${icon}${amtStr}(${cleanPct})` };
    }
    return { ...finalFormat, text: label ? `${label} ${icon}${cleanPct}` : `${icon}${cleanPct}` };
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
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [stock, setStock] = useState<StockData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<'analysis' | 'news' | 'disclosure' | 'financials' | 'daily' | 'investor' | 'overhang' | 'alerts'>('analysis');
    const [easyMode, setEasyMode] = useState(false);
    const [exchangeRate, setExchangeRate] = useState<number>(1450);
    const [financialHighlights, setFinancialHighlights] = useState<any | null>(null);
    const [financialsLoading, setFinancialsLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [newsPeriod, setNewsPeriod] = useState('1d');
    const [periodNews, setPeriodNews] = useState<any[]>([]);
    const [newsLoading, setNewsLoading] = useState(false);

    const [dailyRange, setDailyRange] = useState('1mo');
    const [dailyPricesData, setDailyPricesData] = useState<any[]>([]);
    const [dailyLoading, setDailyLoading] = useState(false);

    useEffect(() => {
        if (stock) {
            setDailyPricesData(stock.daily_prices || []);
            setDailyRange('1mo');
        }
    }, [stock?.symbol]);

    useEffect(() => {
        const fetchDailyPrices = async () => {
            if (!stock?.symbol) return;
            setDailyLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/${encodeURIComponent(stock.symbol)}/daily-history?range=${dailyRange}&t=${Date.now()}`);
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

    useEffect(() => {
        const fetchPeriodNews = async () => {
            if (!stock?.symbol) return;
            setNewsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/analysis/stock/${encodeURIComponent(stock.symbol)}/news`);
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
    }, [stock?.symbol, activeTab]);

    const { realtimeData, isConnected } = useStockSocket(stock?.symbol || null);

    useEffect(() => {
        if (realtimeData && stock) {
            setStock(prev => {
                if (!prev) return null;
                if (prev.price === realtimeData.price && prev.market_status === realtimeData.market_status) return prev;

                return {
                    ...prev,
                    price: realtimeData.price,
                    change: realtimeData.change,
                    regular_close: realtimeData.regular_close || prev.regular_close,
                    regular_change_pct: realtimeData.regular_change_pct || prev.regular_change_pct,
                    regular_change_val: realtimeData.regular_change_val || prev.regular_change_val,
                    market_status: realtimeData.market_status || prev.market_status,
                    nxt_data: realtimeData.nxt_data || prev.nxt_data,
                } as StockData;
            });
        }
    }, [realtimeData]);

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

    useEffect(() => {
        const fetchSearchResults = async () => {
            const query = searchInput.trim();
            if (!query) {
                setSearchResults([]);
                setShowResults(false);
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(query)}&_t=${Date.now()}`);
                const data = await res.json();
                if (data.status === 'success' && Array.isArray(data.data)) {
                    setSearchResults(data.data);
                    setShowResults(data.data.length > 0);
                }
            } catch (err) {
                console.error("Autocomplete error:", err);
            }
        };

        const timer = setTimeout(fetchSearchResults, 30);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        const query = searchParams.get("q");
        if (query && !stock) {
            setSearchInput(query);
            handleSearch(query);
        }
    }, [searchParams]);

    const handleSearch = async (term?: string) => {
        let query = (term || searchInput || "").trim();
        if (!query) return;
        setLoading(true);
        setError("");
        setActiveTab('analysis');
        setIsAnalyzing(false);
        setShowResults(false);

        try {
            let targetSymbol = query;
            const localTicker = getTickerFromKorean(targetSymbol);
            
            if (localTicker !== targetSymbol) {
                targetSymbol = localTicker;
            } else {
                const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(targetSymbol);
                if (isKorean) {
                    const searchRes = await fetch(`${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(targetSymbol)}&_t=${Date.now()}`);
                    const searchJson = await searchRes.json();
                    if (searchJson.status === "success" && Array.isArray(searchJson.data) && searchJson.data.length > 0) {
                        targetSymbol = searchJson.data[0].symbol || searchJson.data[0].code || targetSymbol;
                    } else {
                        setStock(null);
                        setLoading(false);
                        setError(`'${query}'에 대한 검색 결과가 없습니다.`);
                        return;
                    }
                }
            }

            const safeTicker = encodeURIComponent(targetSymbol.toUpperCase());
            const fastUrl = `${API_BASE_URL}/api/analysis/stock/${safeTicker}?skip_ai=true&_t=${Date.now()}`;
            const resFast = await fetch(fastUrl);
            const jsonFast = await resFast.json();

            if (jsonFast.status === "success" && jsonFast.data && jsonFast.data.symbol) {
                setStock(jsonFast.data);
                setLoading(false); 

                if (jsonFast.data.symbol.toUpperCase().includes("MARKET")) {
                    setActiveTab('news');
                    return;
                }

                setIsAnalyzing(true);
                fetch(`${API_BASE_URL}/api/analysis/stock/${safeTicker}?t=${Date.now()}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(jsonFull => {
                        if (jsonFull?.status === "success") {
                            setStock(jsonFull.data);
                        }
                        setIsAnalyzing(false);
                    })
                    .catch(() => setIsAnalyzing(false));

                setFinancialsLoading(true);
                fetch(`${API_BASE_URL}/api/analysis/stock/${safeTicker}/financials?t=${Date.now()}`)
                    .then(res => res.json())
                    .then(resJson => {
                        if (resJson.status === "success") {
                            setFinancialHighlights(resJson.data);
                        }
                    })
                    .catch(() => { })
                    .finally(() => setFinancialsLoading(false));

            } else {
                setStock(null);
                setLoading(false);
                setError(`'${targetSymbol}' 데이터를 불러올 수 없습니다.`);
            }
        } catch (err) {
            setStock(null);
            setLoading(false);
            setError("서버 연결에 실패했습니다.");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen pb-10 text-white notranslate" translate="no">
            <Header title="종목 발굴 & 데이터 분석" subtitle="AI가 분석하는 종목의 핵심 데이터 현황" />

            <div className="container mx-auto px-4 mt-8">
                {error && (
                    <div className="max-w-md mx-auto mb-8 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-4">
                        <span className="text-xl">⚠️</span>
                        <p className="font-bold">{error}</p>
                    </div>
                )}

                {!stock && (
                    <div className="space-y-12">
                        {/* Search Section */}
                        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 p-8 border border-white/20 shadow-xl overflow-visible">
                            <div className="relative z-20 max-w-2xl">
                                <h2 className="text-2xl md:text-3xl font-black mb-4 text-white drop-shadow-md">종목 데이터 분석</h2>
                                <p className="text-gray-200 mb-6 text-sm md:text-lg font-medium">
                                    기업의 재무 상태와 시장 수급을 실시간으로 분석하세요.
                                </p>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="종목명 또는 티커 입력..."
                                            className="w-full rounded-2xl bg-black/60 border border-white/30 px-6 py-4 text-lg outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 font-bold"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onFocus={() => searchResults.length > 0 && setShowResults(true)}
                                        />
                                        
                                        {showResults && searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[400px] overflow-y-auto">
                                                {searchResults.map((res, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            setSearchInput(res.name);
                                                            setShowResults(false);
                                                            handleSearch(res.symbol || res.code);
                                                        }}
                                                        className="w-full text-left px-6 py-4 hover:bg-blue-600/30 transition-colors border-b border-white/5 last:border-b-0 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div className="font-black text-white text-base">{res.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono uppercase">{res.symbol || res.code}</div>
                                                        </div>
                                                        <span className={`text-[10px] px-2 py-1 rounded-full border font-black ${
                                                            res.market === 'Global' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                        }`}>
                                                            {res.market}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleSearch()}
                                        disabled={loading}
                                        className="rounded-2xl bg-blue-600 px-8 py-4 font-black text-white hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 active:scale-95"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <span>분석</span>}
                                    </button>
                                </div>
                            </div>
                            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                                <ShieldCheck className="absolute right-0 top-1/2 -translate-y-1/2 h-80 w-80 text-white/5 -rotate-12" />
                            </div>
                        </div>

                        <MarketSignalWidget />
                        <MarketScannerDashboard />
                    </div>
                )}

                {stock && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <button
                            onClick={() => { setStock(null); setSearchInput(""); }}
                            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 font-bold"
                        >
                            <span>← 다른 종목 검색</span>
                        </button>

                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Main Card */}
                            <div className="rounded-3xl bg-black/40 border border-white/20 p-8 backdrop-blur-md shadow-2xl overflow-hidden relative">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                                    <div className="flex-1 space-y-6">
                                        <h3 className="text-4xl md:text-6xl font-black flex flex-wrap items-center gap-4 text-white">
                                            <span>{stock.name}</span>
                                            <span className="text-xl md:text-3xl text-gray-500 font-bold opacity-40">
                                                {stock.symbol}
                                            </span>
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-6">
                                            <span className="text-5xl md:text-7xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
                                                {stock.currency === 'KRW'
                                                    ? <span><span className="text-2xl md:text-3xl mr-1 text-gray-500 font-bold">₩</span>{Number(String(stock.details?.regular_close || stock.price).replace(/,/g, '')).toLocaleString()}</span>
                                                    : <span><span className="text-2xl md:text-3xl mr-1 text-gray-500 font-bold">$</span>{stock.details?.regular_close || stock.price}</span>}
                                            </span>

                                            <div className={`px-5 py-2.5 rounded-2xl font-black text-xl md:text-2xl shadow-xl border border-white/10 ${formatChangeWithAmountDisplay(stock.regular_change_pct || "", stock.details?.regular_close || stock.price, undefined, stock.regular_change_val, stock.currency).colorBg} ${formatChangeWithAmountDisplay(stock.regular_change_pct || "", stock.details?.regular_close || stock.price, undefined, stock.regular_change_val, stock.currency).colorText}`}>
                                                {formatChangeWithAmountDisplay(stock.regular_change_pct || "", stock.details?.regular_close || stock.price, undefined, stock.regular_change_val, stock.currency).text}
                                            </div>

                                            <div className={`flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-lg ${
                                                stock.market_status === '장중' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                                                stock.market_status?.includes('시간외') || stock.market_status?.includes('야간') ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                                'bg-gray-500/10 text-gray-400 border-gray-500/30'
                                            }`}>
                                                <div className={`w-3 h-3 rounded-full ${
                                                    stock.market_status === '장중' ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 
                                                    stock.market_status?.includes('시간외') || stock.market_status?.includes('야간') ? 'bg-indigo-400 animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.6)]' :
                                                    'bg-gray-500'
                                                }`}></div>
                                                <span className="text-sm font-black uppercase tracking-widest">{stock.market_status || '장마감'}</span>
                                            </div>
                                        </div>

                                        {/* NXT / After-hours Card */}
                                        {(stock.nxt_data || (stock.details?.regular_close && Number(String(stock.details.regular_close).replace(/,/g, '')) !== Number(String(stock.price).replace(/,/g, '')))) && (
                                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 max-w-sm transition-all hover:bg-white/[0.08] group relative overflow-hidden shadow-xl">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                                    <Clock className="w-16 h-16 text-indigo-400" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 shadow-sm">
                                                            {stock.market_status?.includes('NXT') ? 'NXT 야간거래' : 'AFTER MARKET 시간외'}
                                                        </span>
                                                        {(stock.market_status?.includes('NXT') || stock.market_status?.includes('시간외')) && (
                                                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-end gap-3">
                                                        <span className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tighter">
                                                            {stock.currency === 'KRW' ? '₩' : '$'}{Number(String(stock.price).replace(/,/g, '')).toLocaleString()}
                                                        </span>
                                                        <span className={`text-base md:text-lg font-black mb-1 ${formatChangeWithAmountDisplay(stock.change, stock.price, stock.details?.regular_close, undefined, stock.currency).colorText}`}>
                                                            {formatChangeWithAmountDisplay(stock.change, stock.price, stock.details?.regular_close, undefined, stock.currency).text}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full md:w-auto flex flex-wrap md:flex-col justify-between md:justify-end items-center md:items-end gap-6 border-t md:border-t-0 border-white/10 pt-6 md:pt-0">
                                        <div className="flex items-center gap-4 md:flex-col md:items-end">
                                            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">AI SCORE</div>
                                            <div className={`text-6xl md:text-8xl font-black ${stock.score >= 70 ? 'text-green-400' : 'text-yellow-400'} drop-shadow-2xl`}>
                                                {stock.score}
                                            </div>
                                        </div>
                                        <div className="w-full md:w-auto flex items-center justify-end gap-3">
                                            {stock.symbol && !stock.symbol.toUpperCase().includes("MARKET") && (
                                                <>
                                                    <WatchlistButton symbol={stock.symbol} />
                                                    <a
                                                        href={`/community?stock=${encodeURIComponent(stock.symbol)}`}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-100 border border-blue-500/30 transition-all shadow-lg"
                                                    >
                                                        <MessageSquare className="w-5 h-5" />
                                                        <span>토론방</span>
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-10 border-t border-white/10">
                                    <GaugeChart score={stock.metrics?.supplyDemand || 0} label="수급 분석" subLabel="기관/외국인 매집 강도" color="#3b82f6" />
                                    <GaugeChart score={stock.metrics?.financials || 0} label="재무 건전성" subLabel="성장성 및 수익성 지표" color="#10b981" />
                                    <GaugeChart score={stock.metrics?.news || 0} label="뉴스 심리" subLabel="AI 긍부정 감성 분석" color="#f59e0b" />
                                </div>

                                {stock.currency === 'KRW' && stock.symbol && !stock.symbol.includes('.') && (
                                    <div className="mt-10 pt-10 border-t border-white/10">
                                        <LiveSupplyWidget symbol={stock.symbol} />
                                    </div>
                                )}

                                {stock.details && (
                                    <div className="mt-10 pt-10 border-t border-white/10">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-widest">
                                                <Activity className="w-5 h-5 text-blue-400" /> 상세 투자 지표
                                            </h4>
                                            <button
                                                onClick={() => setEasyMode(!easyMode)}
                                                className={`text-xs font-black px-4 py-2 rounded-full transition-all flex items-center gap-3 border ${easyMode
                                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-xl ring-2 ring-white/10"
                                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <span>🎓 용어 번역기</span>
                                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${easyMode ? 'bg-black/40' : 'bg-black/60'}`}>
                                                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${easyMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/[0.08] transition-colors">
                                                <EasyTerm label="시가총액" term="시가총액" isEasyMode={easyMode} />
                                                <div className="font-black text-white text-xl tracking-tighter">{stock.details?.market_cap || 'N/A'}</div>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/[0.08] transition-colors">
                                                <EasyTerm label="거래량" term="거래량" isEasyMode={easyMode} />
                                                <div className="font-mono text-white text-lg font-bold">{stock.details?.volume?.toLocaleString() || 'N/A'}</div>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/[0.08] transition-colors">
                                                <EasyTerm label="PER" term="PER" isEasyMode={easyMode} />
                                                <div className="font-mono text-white text-lg font-bold">
                                                    {typeof stock.details?.pe_ratio === 'number' && stock.details.pe_ratio !== 0 ? `${stock.details.pe_ratio.toFixed(2)}배` : '-'}
                                                </div>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/[0.08] transition-colors">
                                                <EasyTerm label="PBR" term="PBR" isEasyMode={easyMode} />
                                                <div className="font-mono text-white text-lg font-bold">
                                                    {typeof stock.details?.pbr === 'number' && stock.details.pbr !== 0 ? `${stock.details.pbr.toFixed(2)}배` : '-'}
                                                </div>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/[0.08] transition-colors">
                                                <EasyTerm label="배당수익률" term="배당수익률" isEasyMode={easyMode} />
                                                <div className="font-mono text-green-400 text-lg font-bold">
                                                    {typeof stock.details?.dividend_yield === 'number' && stock.details.dividend_yield !== 0 ? `${(stock.details.dividend_yield * 100).toFixed(2)}%` : '-'}
                                                </div>
                                            </div>
                                            
                                            <div className="p-2 col-span-1">
                                                <div className="text-gray-500 text-[10px] font-black uppercase mb-1">전일 종가</div>
                                                <div className="font-mono text-gray-300 font-bold">
                                                    {stock.currency === 'KRW' ? '₩' : '$'}{stock.details?.prev_close?.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="p-2 col-span-1">
                                                <div className="text-gray-500 text-[10px] font-black uppercase mb-1">시가 (Open)</div>
                                                <div className="font-mono text-gray-300 font-bold">
                                                    {stock.currency === 'KRW' ? '₩' : '$'}{stock.details?.open?.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="p-2 col-span-1">
                                                <div className="text-gray-500 text-[10px] font-black uppercase mb-1">고가 / 저가</div>
                                                <div className="font-mono text-xs font-bold space-x-1">
                                                    <span className="text-red-400">{stock.details?.day_high?.toLocaleString()}</span>
                                                    <span className="text-gray-600">/</span>
                                                    <span className="text-blue-400">{stock.details?.day_low?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="p-2 col-span-2">
                                                <div className="text-gray-500 text-[10px] font-black uppercase mb-1">52주 최고/최저</div>
                                                <div className="font-mono text-xs font-bold space-x-2">
                                                    <span className="text-red-300">{stock.details?.year_high?.toLocaleString()}</span>
                                                    <span className="text-gray-600">~</span>
                                                    <span className="text-blue-300">{stock.details?.year_low?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Analysis Tab Card */}
                            <div className="rounded-3xl bg-black/40 border border-white/20 p-8 shadow-2xl">
                                <div className="flex items-center gap-6 border-b border-white/10 mb-8 font-black text-sm md:text-base overflow-x-auto scrollbar-hide py-2">
                                    <button
                                        className={`pb-4 whitespace-nowrap transition-all ${activeTab === 'analysis' ? 'text-blue-400 border-b-4 border-blue-400 scale-105' : 'text-gray-500 hover:text-white'}`}
                                        onClick={() => setActiveTab('analysis')}
                                    >
                                        데이터 종합 분석
                                    </button>
                                    <button
                                        className={`pb-4 whitespace-nowrap transition-all ${activeTab === 'daily' ? 'text-blue-400 border-b-4 border-blue-400 scale-105' : 'text-gray-500 hover:text-white'}`}
                                        onClick={() => setActiveTab('daily')}
                                    >
                                        일일 시세
                                    </button>
                                    
                                    {stock.symbol && !stock.symbol.toUpperCase().includes("MARKET") && (
                                        <>
                                            {(() => {
                                                const isGlobal = /[a-zA-Z]/.test(stock.symbol) && !stock.symbol.endsWith('.KS') && !stock.symbol.endsWith('.KQ');
                                                return (
                                                    <>
                                                        <button
                                                            className={`pb-4 whitespace-nowrap transition-all flex items-center gap-1 ${activeTab === 'investor' ? 'text-indigo-400 border-b-4 border-indigo-400 scale-105' : 'text-gray-500 hover:text-white'}`}
                                                            onClick={() => setActiveTab('investor')}
                                                        >
                                                            <span>{isGlobal ? '주요 주주' : '투자자 동향'}</span>
                                                        </button>
                                                        <button
                                                            className={`pb-4 whitespace-nowrap transition-all ${activeTab === 'financials' ? 'text-emerald-400 border-b-4 border-emerald-400 scale-105' : 'text-gray-500 hover:text-white'}`}
                                                            onClick={() => setActiveTab('financials')}
                                                        >
                                                            재무제표
                                                        </button>
                                                        {!isGlobal && (
                                                            <>
                                                                <button
                                                                    className={`pb-4 whitespace-nowrap transition-all ${activeTab === 'overhang' ? 'text-yellow-400 border-b-4 border-yellow-400 scale-105' : 'text-gray-500 hover:text-white'}`}
                                                                    onClick={() => setActiveTab('overhang')}
                                                                >
                                                                    오버행/타법인
                                                                </button>
                                                                <button
                                                                    className={`pb-4 whitespace-nowrap transition-all ${activeTab === 'disclosure' ? 'text-blue-400 border-b-4 border-blue-400 scale-105' : 'text-gray-500 hover:text-white'}`}
                                                                    onClick={() => setActiveTab('disclosure')}
                                                                >
                                                                    공시(DART)
                                                                </button>
                                                            </>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </>
                                    )}
                                    <button
                                        className={`pb-4 whitespace-nowrap transition-all ${activeTab === 'news' ? 'text-blue-400 border-b-4 border-blue-400 scale-105' : 'text-gray-500 hover:text-white'}`}
                                        onClick={() => setActiveTab('news')}
                                    >
                                        관련 뉴스
                                    </button>
                                </div>

                                <div className="min-h-[400px]">
                                    {activeTab === 'analysis' && (
                                        <div className="space-y-10 animate-in fade-in duration-500">
                                            {(stock.symbol.split('.')[0].length === 6 && /^\d+$/.test(stock.symbol.split('.')[0])) && (
                                                <KoreanCompanyOverview symbol={stock.symbol} stockName={stock.name} />
                                            )}

                                            {stock.description && (
                                                <div className="rounded-3xl bg-indigo-500/5 border border-indigo-500/10 p-6 md:p-8 shadow-inner">
                                                    <h4 className="text-xs font-black text-indigo-300 flex items-center gap-2 mb-6 uppercase tracking-[0.2em]">
                                                        🏢 기업 프로필 (Company Profile)
                                                    </h4>
                                                    <div className="text-gray-300 text-base md:text-lg leading-relaxed font-medium">
                                                        {stock.description}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-6">
                                                <h4 className="text-xl md:text-2xl font-black mb-6 flex items-center gap-3 text-white">
                                                    <TrendingUp className="h-6 w-6 text-blue-400" /> AI 종합 전략 분석
                                                </h4>
                                                
                                                <div className={`leading-relaxed text-base md:text-xl font-medium whitespace-pre-wrap min-h-[150px] ${(stock.summary || "").includes("오류") ? 'text-red-400' : 'text-gray-100'}`}>
                                                    {isAnalyzing && (!stock?.summary || stock.summary.length < 50) ? (
                                                        <div className="flex flex-col items-center justify-center py-20 space-y-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                                            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                                                            <div className="text-center">
                                                                <div className="text-blue-200 text-lg font-black mb-1">AI가 실시간 데이터를 연산 중입니다...</div>
                                                                <div className="text-gray-500 text-sm font-bold">맞춤형 투자 전략 수립 중 (약 3~5초 소요)</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner leading-[1.8]">
                                                            {stock.summary || "분석 리포트를 불러오지 못했습니다."}
                                                        </div>
                                                    )}
                                                </div>

                                                {stock.rationale && stock.rationale.supply && (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                                        <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 shadow-lg group hover:bg-blue-500/20 transition-all">
                                                            <div className="text-blue-400 font-black mb-3 flex items-center gap-2 uppercase tracking-widest text-sm">✅ 수급 (Supply)</div>
                                                            <div className="text-sm text-gray-200 font-bold leading-relaxed">{stock.rationale.supply}</div>
                                                        </div>
                                                        <div className="bg-purple-500/10 p-6 rounded-2xl border border-purple-500/20 shadow-lg group hover:bg-purple-500/20 transition-all">
                                                            <div className="text-purple-400 font-black mb-3 flex items-center gap-2 uppercase tracking-widest text-sm">🔥 모멘텀 (Momentum)</div>
                                                            <div className="text-sm text-gray-200 font-bold leading-relaxed">{stock.rationale.momentum}</div>
                                                        </div>
                                                        <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 shadow-lg group hover:bg-red-500/20 transition-all">
                                                            <div className="text-red-400 font-black mb-3 flex items-center gap-2 uppercase tracking-widest text-sm">⚠️ 리스크 (Risk)</div>
                                                            <div className="text-sm text-gray-200 font-bold leading-relaxed">{stock.rationale.risk}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <AIDisclaimer />
                                        </div>
                                    )}

                                    {activeTab === 'news' && (
                                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                            <h4 className="text-2xl font-black flex items-center gap-3 text-white mb-8">
                                                <Globe className="h-7 w-7 text-yellow-400" /> 실시간 관련 소식
                                            </h4>
                                            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-3 scrollbar-custom">
                                                {newsLoading ? (
                                                    <div className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                        <Loader2 className="h-10 w-10 text-yellow-400 animate-spin mb-4" />
                                                        <p className="text-gray-400 font-bold">인덱싱된 최신 뉴스를 불러오고 있습니다...</p>
                                                    </div>
                                                ) : (periodNews.length > 0 || (stock.news && stock.news.length > 0)) ? (
                                                    (periodNews.length > 0 ? periodNews : stock.news).map((n, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => window.open(n.link, '_blank')}
                                                            className="flex flex-col p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 cursor-pointer group shadow-md"
                                                        >
                                                            <h5 className="font-black text-white mb-3 group-hover:text-yellow-400 text-lg md:text-xl leading-snug transition-colors">
                                                                {n.title}
                                                            </h5>
                                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                                                <span className="bg-yellow-400/10 px-3 py-1 rounded-lg text-yellow-500 border border-yellow-500/20 uppercase tracking-widest">
                                                                    {n.publisher}
                                                                </span>
                                                                <span className="font-mono">{toKoreanDate(n.published)}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-gray-500 text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10 font-bold">
                                                        데이터베이스에 등록된 최신 뉴스가 없습니다.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'daily' && stock.symbol && (
                                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                <h4 className="text-2xl font-black flex items-center gap-3 text-white">
                                                    <Calendar className="h-7 w-7 text-blue-400" /> 일일 시세 히스토리
                                                    {dailyLoading && <Loader2 className="w-5 h-5 animate-spin text-primary ml-2" />}
                                                </h4>
                                                
                                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                                    {[
                                                        { id: '1mo', label: '1개월' },
                                                        { id: '3mo', label: '3개월' },
                                                        { id: '6mo', label: '6개월' },
                                                        { id: '1y', label: '1년' }
                                                    ].map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => setDailyRange(p.id)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${dailyRange === p.id
                                                                ? 'bg-blue-600 text-white shadow-lg'
                                                                : 'text-gray-500 hover:text-white'
                                                            }`}
                                                        >
                                                            {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto bg-black/20 rounded-2xl border border-white/10 max-h-[600px] overflow-y-auto scrollbar-custom shadow-inner">
                                                <table className="w-full text-left border-collapse min-w-[700px]">
                                                    <thead className="sticky top-0 bg-[#0f172a] shadow-md z-10">
                                                        <tr className="border-b border-white/10 text-gray-500 text-xs font-black uppercase tracking-widest">
                                                            <th className="py-4 px-6">날짜</th>
                                                            <th className="py-4 px-6 text-right">종가</th>
                                                            <th className="py-4 px-6 text-right">전일비 (%)</th>
                                                            <th className="py-4 px-6 text-right">시가</th>
                                                            <th className="py-4 px-6 text-right">고가</th>
                                                            <th className="py-4 px-6 text-right">저가</th>
                                                            <th className="py-4 px-6 text-right">거래량</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {dailyPricesData.length > 0 ? (
                                                            dailyPricesData.map((day, idx) => {
                                                                const safeChange = Math.abs(day.change || 0) > 500 ? 0 : (day.change || 0);
                                                                return (
                                                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                                        <td className="py-4 px-6 text-gray-300 font-mono text-sm font-bold">{toKoreanDate(day.date)}</td>
                                                                        <td className="py-4 px-6 text-right font-mono font-black text-white text-base">
                                                                            {stock.currency === 'KRW' ? '₩' : '$'}{day.close.toLocaleString()}
                                                                        </td>
                                                                        <td className={`py-4 px-6 text-right font-mono font-black text-sm ${safeChange > 0 ? 'text-red-400' : safeChange < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                <span>{safeChange > 0 ? '▲' : safeChange < 0 ? '▼' : ''}</span>
                                                                                <span>{Math.abs(day.change_val || 0).toLocaleString()}</span>
                                                                                <span className="text-[10px] opacity-60 ml-1">({safeChange > 0 ? '+' : ''}{Number(safeChange).toFixed(2)}%)</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-6 text-right text-gray-500 font-mono text-sm">{day.open.toLocaleString()}</td>
                                                                        <td className="py-4 px-6 text-right text-red-400/60 font-mono text-sm">{day.high.toLocaleString()}</td>
                                                                        <td className="py-4 px-6 text-right text-blue-400/60 font-mono text-sm">{day.low.toLocaleString()}</td>
                                                                        <td className="py-4 px-6 text-right text-gray-500 font-mono text-sm font-bold">{day.volume.toLocaleString()}</td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="py-20 text-center text-gray-600 font-bold">시세 정보를 불러올 수 없습니다.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'investor' && <InvestorTrendTab symbol={stock.symbol} stockName={stock.name} />}
                                    {activeTab === 'overhang' && <OverhangTab symbol={stock.symbol} stockName={stock.name} />}
                                    {activeTab === 'disclosure' && <DisclosureTable symbol={stock.symbol} />}
                                    {activeTab === 'financials' && <FinancialsTable data={financialHighlights} currency={stock.currency} />}
                                    {activeTab === 'alerts' && (
                                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                            <SimplePushTest />
                                            <PriceAlertSetup 
                                                symbol={stock.symbol} 
                                                currentPrice={Number(String(stock.price).replace(/,/g, '')) || 0}
                                                buyPrice={Number(String(stock.price).replace(/,/g, ''))}
                                                quantity={1}
                                            />
                                            <PriceAlertList />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recommendations */}
                            {stock.related_stocks && stock.related_stocks.length > 0 && (
                                <div className="rounded-3xl bg-black/40 border border-white/20 p-8 shadow-2xl">
                                    <h3 className="text-xl md:text-2xl font-black mb-8 text-white flex items-center gap-3">
                                        <Zap className="w-6 h-6 text-blue-400" /> 관련 섹터 및 테마 종목
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {stock.related_stocks.map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSearch(item.symbol)}
                                                className="group cursor-pointer flex items-center justify-between p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/40 transition-all shadow-md active:scale-[0.98]"
                                            >
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="font-black text-white group-hover:text-blue-300 transition-colors text-lg mb-1 truncate">
                                                        {item.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono mb-2 uppercase tracking-widest">{item.symbol}</div>
                                                    <div className="text-xs text-gray-400 font-bold line-clamp-1 opacity-70">
                                                        {item.reason}
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    {item.price && <div className="font-mono text-base text-white font-black">{item.price}</div>}
                                                    {item.change && (
                                                        <div className={`text-xs font-black px-3 py-1 rounded-lg shadow-sm ${formatChangeWithAmountDisplay(item.change, item.price, undefined, undefined, 'KRW').colorText} ${formatChangeWithAmountDisplay(item.change, item.price, undefined, undefined, 'KRW').colorBg}`}>
                                                            {formatChangeWithAmountDisplay(item.change, item.price, undefined, undefined, 'KRW').text}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const toKoreanDate = (val: any) => {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d.getTime())) {
        if (typeof val === 'string' && val.includes('.')) {
            const parts = val.split('.');
            if (parts.length >= 3) return `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
        }
        return val;
    }
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

function WatchlistButton({ symbol }: { symbol: string }) {
    const { user } = useAuth();
    const [isWatchlisted, setIsWatchlisted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkWatchlist = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                    headers: { "X-User-ID": user.id || (user as any).uid }
                });
                if (!res.ok) {
                    setLoading(false);
                    return;
                }
                const json = await res.json();
                if (json.status === "success" && json.data.some((item: any) => item.symbol === symbol)) {
                    setIsWatchlisted(true);
                }
            } catch (err) { } finally {
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
        setLoading(true);
        try {
            const method = isWatchlisted ? 'DELETE' : 'POST';
            const url = isWatchlisted ? `/api/watchlist/${symbol}` : `/api/watchlist`;
            const options: RequestInit = { 
                method,
                headers: { 
                    "X-User-ID": user.id || (user as any).uid || "guest",
                    'Content-Type': 'application/json'
                },
                body: !isWatchlisted ? JSON.stringify({ symbol }) : undefined
            };

            const res = await fetch(url, options);
            const json = await res.json();

            if (json.status === "success") {
                setIsWatchlisted(!isWatchlisted);
                window.dispatchEvent(new CustomEvent('watchlistChanged'));
            }
        } catch (err) { } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={toggleWatchlist}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg ${isWatchlisted
                ? 'bg-yellow-400 text-black hover:bg-yellow-300 ring-2 ring-yellow-400/50'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                }`}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-black' : ''}`} />}
            <span>{isWatchlisted ? '관심종목' : '관심등록'}</span>
        </button>
    );
}

function MarketSignalWidget() {
    const [signal, setSignal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/market/status`)
            .then(res => res.json())
            .then(json => { if (json.status === "success") setSignal(json.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="animate-pulse bg-white/5 h-48 rounded-3xl"></div>;
    if (!signal) return null;

    return (
        <div className="relative rounded-3xl bg-[#111] border border-white/10 p-8 shadow-xl flex flex-col justify-between overflow-hidden group">
            <div className="flex justify-between items-start z-10">
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                        <Activity className="text-blue-400" /> 시장 통합 시그널
                    </h3>
                    <p className={`text-2xl md:text-3xl font-black leading-tight tracking-tighter ${signal.signal === 'red' ? 'text-red-400' :
                        signal.signal === 'yellow' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                        {signal.message}
                    </p>
                    {signal.reason && (
                        <div className="bg-white/5 rounded-2xl p-4 text-sm md:text-base text-gray-300 border border-white/5 font-medium leading-relaxed">
                            <span className="font-black text-blue-300 mr-2">요인분석</span> {signal.reason}
                        </div>
                    )}
                </div>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${signal.signal === 'red' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : signal.signal === 'yellow' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'} animate-pulse`}>
                    <div className="text-4xl">
                        {signal.signal === 'red' ? '🛑' : signal.signal === 'yellow' ? '⚠️' : '🚀'}
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm font-black z-10">
                <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                    <span className="text-gray-500">KOSPI</span>
                    <span className="text-white font-mono">{signal.details?.kospi}</span>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                    <span className="text-gray-500">환율 (USD)</span>
                    <span className="text-white font-mono">{signal.details?.usd}</span>
                </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
        </div>
    );
}

function LiveSupplyWidget({ symbol }: { symbol: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSupply = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/analysis/stock/${encodeURIComponent(symbol)}/investors/live`);
                const json = await res.json();
                if (json.status === "success" && json.data) setData(json.data);
            } catch (err) { } finally { setLoading(false); }
        };

        if (symbol && !symbol.includes("MARKET")) {
            fetchSupply();
            const interval = setInterval(fetchSupply, 60000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [symbol]);

    if (!data || data.length === 0) {
        if (loading) return null;
        return (
            <div className="mt-10 p-8 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                <div className="text-4xl opacity-50">🌙</div>
                <div className="text-gray-400 font-black">실시간 수급 집계가 종료되었거나 아직 시작되지 않았습니다.</div>
                <div className="text-xs text-gray-600">한국 정규장 운영 시간(09:00 ~ 15:30)에 데이터가 집계됩니다.</div>
            </div>
        );
    }

    const last = data[data.length - 1];
    const totalForeigner = last?.foreigner || 0;
    const totalInst = last?.institution || 0;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h4 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <Activity className="text-red-400" /> 실시간 수급 잠정 집계
                <span className="text-xs font-bold text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">09:30~14:30 실시간</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className={`p-6 rounded-3xl border-2 transition-all shadow-xl ${totalForeigner > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
                    <div className="text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">외국인 잠정 합계</div>
                    <div className={`text-4xl font-black font-mono ${totalForeigner > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {totalForeigner > 0 ? '+' : ''}{totalForeigner.toLocaleString()}<span className="text-lg ml-1">주</span>
                    </div>
                </div>
                <div className={`p-6 rounded-3xl border-2 transition-all shadow-xl ${totalInst > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
                    <div className="text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">기관 잠정 합계</div>
                    <div className={`text-4xl font-black font-mono ${totalInst > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {totalInst > 0 ? '+' : ''}{totalInst.toLocaleString()}<span className="text-lg ml-1">주</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-black/20 rounded-2xl border border-white/10 max-h-80 overflow-y-auto scrollbar-custom shadow-inner">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#1a1c23] text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">집계 시간</th>
                            <th className="px-6 py-4 text-right">외국인 추정</th>
                            <th className="px-6 py-4 text-right">기관 추정</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.slice().reverse().map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-3 font-mono font-bold text-gray-400">{row.time}</td>
                                <td className={`px-6 py-3 text-right font-mono font-black ${row.foreigner > 0 ? 'text-red-400' : row.foreigner < 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                                    {row.foreigner > 0 ? '+' : ''}{row.foreigner.toLocaleString()}
                                </td>
                                <td className={`px-6 py-3 text-right font-mono font-black ${row.institution > 0 ? 'text-red-400' : row.institution < 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                                    {row.institution > 0 ? '+' : ''}{row.institution.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[10px] text-gray-600 mt-4 text-right font-bold">* 위 데이터는 주요 창구별 잠정치이며 실제 확정 결과와 차이가 있을 수 있습니다.</p>
        </div>
    );
}
