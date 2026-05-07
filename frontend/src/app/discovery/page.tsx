"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import MarketIndicators from "@/components/MarketIndicators";
import GaugeChart from "@/components/GaugeChart";
import AdBanner from "@/components/AdBanner";
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

// [WebSocket Integration] Real-time Price Updates


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
                {label} <span className="text-[10px] text-yellow-400 opacity-80">?뱥</span>
            </span>
            <div className="absolute bottom-full left-0 mb-2 w-52 p-3 bg-indigo-900/95 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md border border-white/10 leading-relaxed font-medium">
                <span className="text-yellow-300 font-bold block mb-1"><span>?뮕</span> <span>{term}</span> <span>吏?????/span></span>
                <span>{explanation || "?ъ슫 ?ㅻ챸??以鍮?以묒씠?먯슂!"}</span>
                <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-indigo-900/95"></div>
            </div>
        </div>
    );
}

// [Cache System] Ultra-fast navigation
const STOCK_CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000; // 1 minute cache for fast re-navigation

// Helper for parsing change rate and applying standard KOR formatting (Red = Up, Blue = Down, with ????
const formatChangeDisplay = (val: any) => {
    // [Fix] Handle undefined/null specifically to prevent 'undefined%' string
    if (val === undefined || val === null || val === 'N/A' || val === '-') {
        return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: '0.00%' };
    }
    const str = String(val).trim();
    if (str === '0' || str === '0.00%' || str === '0.0' || !str) {
        return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: '0.00%' };
    }
    
    // [New] Preserve labels like [?뺢퇋], [?쇨컙]
    const labelMatch = str.match(/^(\[[^\]]+\])/);
    const label = labelMatch ? labelMatch[1] : "";
    
    // Improved Parsing: Check markers OR numerical value
    const isNegExplicit = str.includes('-') || str.includes('??) || str.includes('?섎씫');
    const isPosExplicit = str.includes('+') || str.includes('??) || str.includes('?곸듅');
    
    const num = parseFloat(str.replace(/\[[^\]]+\]/g, '').replace(/[^\d.-]/g, ''));
    if (isNaN(num)) return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: str };
    if (num === 0) return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: label ? `${label} 0.00%` : '0.00%' };

    const isPos = isPosExplicit || (!isNegExplicit && num > 0);
    const isNeg = isNegExplicit || (!isPosExplicit && num < 0);
    
    // Remove existing signs and labels for clean formatting
    let cleanText = str.replace(/\[[^\]]+\]/g, '').replace(/[+?쇄뼯-]/g, '').replace('?섎씫', '').replace('?곸듅', '').trim();
    
    // [Safety] If absolute numeric value is huge and no % was present, it's likely a price change (not pct).
    if (!str.includes('%')) {
        const absVal = Math.abs(parseFloat(cleanText.replace(/,/g, '')));
        if (absVal > 500) {
            return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: label ? `${label} 0.00%` : '0.00%' };
        }
        cleanText = `${cleanText}%`;
    }
    
    // [Final Fix] Always return clean percentage without labels from this helper
    if (isPos) return { colorText: 'text-red-500', colorBg: 'bg-red-500/10', text: `??${cleanText}` };
    if (isNeg) return { colorText: 'text-blue-500', colorBg: 'bg-blue-500/10', text: `??${cleanText}` };
    
    return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: `${cleanText}` };
};

// Extended helper combining Amount + Percentage (e.g., ??11,000 (1.01%))
// Extended helper combining Amount + Percentage (e.g., ??11,000 (1.01%))
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
    
    // [Updated] Enhanced Color Detection: If percentage is missing, use calculatedDiff's sign
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
    const icon = calculatedDiff > 0 ? '??' : calculatedDiff < 0 ? '??' : '';
    
    // [Fix] Ensure we never output 'undefined%' or '(undefined%)'
    let pct = textStr.replace(/^[?꿎뼹]\s*/, '').trim();
    if (!pct || pct === 'undefined' || pct === 'null' || pct === '0.00%') {
        if (calculatedDiff !== 0 && pVal > 0) {
            // Manually calculate pct if it's missing or undefined
            const prevVal = pVal - calculatedDiff;
            if (prevVal > 0) {
                pct = `${(Math.abs(calculatedDiff) / prevVal * 100).toFixed(2)}%`;
            }
        }
    }
    if (!pct || pct === 'undefined') pct = '0.00%';

    if (amtStr) {
       return { ...finalFormat, text: `${icon}${amtStr}(${pct})` };
    }
    return { ...finalFormat, text: `${icon}${pct}` };
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
        console.log("[Discovery] Mounted. API_BASE_URL:", API_BASE_URL);
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

    // [New] Effect to fetch period-based news
    useEffect(() => {
        const fetchPeriodNews = async () => {
            if (!stock?.symbol) return;
            setNewsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/analysis/stock/` + encodeURIComponent(stock.symbol) + `/news`);
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

    // [New] Real-time Search Logic
    useEffect(() => {
        const fetchSearchResults = async () => {
            const query = searchInput.trim();
            if (!query) {
                setSearchResults([]);
                setShowResults(false);
                return;
            }

            try {
                // Remove console log to avoid cluttering in instant search
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

        // ???移섎뒗 利됱떆 諛섏쓳?섎룄濡??湲??쒓컙??30ms濡?????⑥텞 (嫄곗쓽 0珥덉뿉 ?섎졃)
        const timer = setTimeout(fetchSearchResults, 30);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // [New] Handle URL Query Params - ONLY ONCE on mount
    useEffect(() => {
        const query = searchParams.get("q");
        if (query && !stock) {
            setSearchInput(query);
            handleSearch(query);
        }
    }, [searchParams, !!stock]);

    const handleSearch = async (term?: string) => {
        let query = (term || searchInput || "").trim();
        console.log("[Search] handleSearch initiated. term:", term, "searchInput:", searchInput, "final query:", query);
        if (!query) return;
        const timestamp = Date.now();
        setLoading(true);
        setError("");
        setActiveTab('analysis');
        setIsAnalyzing(false);
        setShowResults(false);

        try {
            // [Fix] Like AnalysisPage, resolve Korean names to tickers first
            let targetSymbol = query;
            const isKorean = /[????????媛-??/.test(targetSymbol);

            if (isKorean) {
                console.log("[Search] Korean query detected. Resolving ticker...");
                const searchUrl = `${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(targetSymbol)}&_t=${timestamp}`;
                const searchRes = await fetch(searchUrl, { cache: 'no-store' });
                if (!searchRes.ok) throw new Error(`Search API failed with status ${searchRes.status}`);
                
                const searchJson = await searchRes.json();
                console.log("[Search] Search API result:", searchJson);

                if (searchJson.status === "success" && Array.isArray(searchJson.data) && searchJson.data.length > 0) {
                    const found = searchJson.data[0];
                    targetSymbol = found.symbol || found.code || targetSymbol;
                    console.log("[Search] Resolved ticker:", targetSymbol);
                } else {
                    console.warn("[Search] No mapping found for:", query);
                    setStock(null);
                    setLoading(false);
                    setError(`'${query}'?????寃??寃곌낵媛 ?놁뒿?덈떎.`);
                    return;
                }
            }

            const timestamp = Date.now();
            const cacheBuster = Math.random().toString(36).substring(7);
            const safeTicker = encodeURIComponent(targetSymbol.toUpperCase());
            console.log("[Search] Fetching data for ticker:", safeTicker);

            // 1. FAST Fetch
            const fastUrl = `${API_BASE_URL}/api/analysis/stock/${safeTicker}?t=${timestamp}&cb=${cacheBuster}&skip_ai=true`;
            const resFast = await fetch(fastUrl, { 
                cache: 'no-store',
                headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
            });
            if (!resFast.ok) throw new Error(`Stock data API failed with status ${resFast.status}`);
            
            const jsonFast = await resFast.json();
            console.log("[Search] Fast fetch result:", jsonFast);

            if (jsonFast.status === "success" && jsonFast.data && jsonFast.data.symbol) {
                setStock(jsonFast.data);
                setLoading(false); 

                // If Market, stop here
                if (jsonFast.data.symbol.toUpperCase().includes("MARKET")) {
                    setActiveTab('news');
                    return;
                }

                // 2. Slow Fetch (Background AI Analysis)
                setIsAnalyzing(true);
                fetch(`${API_BASE_URL}/api/analysis/stock/${safeTicker}?t=${timestamp}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(jsonFull => {
                        if (jsonFull?.status === "success") {
                            setStock(jsonFull.data);
                            STOCK_CACHE[jsonFull.data.symbol.toUpperCase()] = { data: jsonFull.data, timestamp: Date.now() };
                        }
                        setIsAnalyzing(false);
                    })
                    .catch(() => setIsAnalyzing(false));

                // 3. Fetch Financial Highlights
                setFinancialsLoading(true);
                fetch(`${API_BASE_URL}/api/analysis/stock/${safeTicker}/financials?t=${Date.now()}`)
                    .then(res => res.json())
                    .then(resJson => {
                        if (resJson.status === "success") {
                            setFinancialHighlights(resJson.data || []);
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

    const prefetchStock = async (term: string) => {
        if (!term) return;
        let query = term.trim();
        let ticker = getTickerFromKorean(query).toUpperCase();
    // [Removed] Old polling logic replaced by WebSocket real-time updates (lines 180-198)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen pb-10 text-white notranslate" translate="no">
            <Header title="醫낅ぉ 諛쒓뎬 & ?곗씠??遺꾩꽍" subtitle="AI媛 遺꾩꽍?섎뒗 醫낅ぉ???듭떖 ?곗씠???꾪솴" />

            <div className="p-6 space-y-8">
                {/* Initial View: Search, Widgets, Dashboard */}
                {!stock && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Search / Hero Section */}
                        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 p-6 border border-white/20 shadow-xl overflow-visible">
                            <div className="relative z-20 max-w-2xl">
                                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-md">醫낅ぉ ?곗씠??遺꾩꽍 (AI Analysis)</h2>
                                <p className="text-gray-200 mb-4 text-sm md:text-base">
                                    醫낅ぉ 肄붾뱶(?곗빱)瑜??낅젰?섏뿬 湲곗뾽???щТ ?곹깭? ?쒖옣 ?щ━瑜?遺꾩꽍?섏꽭??<br />
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
                                            onFocus={() => searchResults.length > 0 && setShowResults(true)}
                                        />
                                        
                                        {/* [New] Search Results Dropdown */}
                                        {showResults && searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[300px] overflow-y-auto">
                                                {searchResults.map((res, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            setSearchInput(res.name);
                                                            setShowResults(false);
                                                            handleSearch(res.symbol || res.code);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-blue-600/30 transition-colors border-b border-white/5 last:border-b-0 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div className="font-bold text-white text-sm md:text-base">{res.name}</div>
                                                            <div className="text-xs text-gray-400 font-mono uppercase">{res.symbol || res.code}</div>
                                                        </div>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
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
                                        className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg text-sm md:text-base whitespace-nowrap"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span>遺꾩꽍 ?쒖옉</span>}
                                    </button>
                                </div>

                                {error && <p className="text-red-400 mt-3 font-semibold bg-red-900/40 p-2 rounded-lg inline-block">{error}</p>}
                            </div>
                            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                                <ShieldCheck className="absolute right-0 top-1/2 -translate-y-1/2 h-64 w-64 text-white/5 -rotate-12" />
                            </div>
                        </div>

                        {/* Market Traffic Light & Health Check Entry */}
                        <div className="w-full">
                            <MarketSignalWidget />
                        </div>

                        {/* ?좉퇋: ?⑺듃 湲곕컲 利앹떆 ?ㅼ틦??& LIVE 怨듭떆 ?띾낫 */}
                        <div className="w-full">
                            <MarketScannerDashboard />
                        </div>


                        {/* Market Indicators Grid Removed (Redundant with Market Intelligence) */}
                    </div>
                )}





                {/* Results Section */}
                {stock && stock.symbol === "THEME" ? (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        {/* Theme Analysis View */}
                        <button
                            onClick={() => { setStock(null); setSearchInput(""); }}
                            className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                        >
                            <span><span>??/span> <span>?ㅻ줈 媛湲?/span></span>
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
                        {/* AdSense Placement (Search Results Top) */}
                        <AdBanner adSlot="3412955102" />
                        
                        {/* Back Button */}
                        <button
                            onClick={() => { setStock(null); setSearchInput(""); }}
                            className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                        >
                            <span><span>??/span> <span>?ㅻⅨ 醫낅ぉ 寃?됲븯湲?/span></span>
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
                                                        ? <span><span>{"??}</span><span>{Number(String(stock.price).replace(/,/g, '')).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                                                        : (stock.currency === 'USD' || (stock.currency && typeof stock.currency === 'string' && stock.currency.includes('USD')))
                                                            ? <span><span>{"$"}</span><span>{stock.price}</span></span>
                                                            : <span><span>{stock.currency}</span> <span>{stock.price}</span></span>}
                                                </span>
                                                {/* [Updated] Show KRW for foreign stocks ONLY */}
                                                {stock.currency !== 'KRW' && (stock.symbol && !stock.symbol.includes('.KS') && !stock.symbol.includes('.KQ')) && (
                                                    <span className="text-lg md:text-xl text-gray-400 font-mono">
                                                        <span>(????/span><span>{stock.price_krw || getKrwPrice(stock.price)}</span><span>)</span>
                                                    </span>
                                                )}
                                                <span className={`font-bold px-2 py-1 md:px-3 md:py-1 rounded-lg text-base md:text-lg ${formatChangeWithAmountDisplay(stock.change, stock.price, stock.details?.prev_close, undefined, stock.currency).colorText} ${formatChangeWithAmountDisplay(stock.change, stock.price, stock.details?.prev_close, undefined, stock.currency).colorBg}`}>
                                                    <span>
                                                        [?뺢퇋] {formatChangeWithAmountDisplay(stock.change, stock.price, stock.details?.prev_close, undefined, stock.currency).text.replace(/\[[^\]]+\]/g, "").trim()}
                                                    </span>
                                                </span>
                                                {/* [New] Market Status Badge with Green Light */}
                                                {stock.details?.market_status && (
                                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold border shadow-sm transition-all ${stock.details.market_status.includes('?μ쨷') || stock.details.market_status.includes('Open') || stock.details.market_status.includes('?쇨컙嫄곕옒') || stock.details.market_status.includes('NXT')
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/30 ring-1 ring-green-500/10'
                                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                        }`}>
                                                        {(stock.details.market_status.includes('?μ쨷') || stock.details.market_status.includes('Open') || stock.details.market_status.includes('?쇨컙嫄곕옒') || stock.details.market_status.includes('NXT')) && (
                                                            <span className="flex h-2 w-2 relative">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                            </span>
                                                        )}
                                                        {stock.details.market_status.includes('NXT') ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="opacity-60 font-medium">?뺢퇋??留덇컧</span>
                                                                <span className="opacity-30">|</span>
                                                                <span className="text-indigo-400">?쇨컙嫄곕옒(NXT)</span>
                                                            </span>
                                                        ) : stock.details.market_status === 'Unknown' ? <span>?곗씠??以鍮꾩쨷</span> : 
                                                         <span>{stock.details.market_status}</span>}
                                                    </span>
                                                )}
                                            </div>
                                            {/* [New] NXT After Market Price */}
                                            {stock.details?.nxt_data && (
                                                <div className={`mt-2 flex items-center gap-3 rounded-xl px-3 py-2 w-fit transition-all duration-500 ${
                                                    stock.details.market_status?.includes('NXT') 
                                                    ? 'bg-indigo-600/20 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                                    : 'bg-white/5 border border-white/10 opacity-60'
                                                }`}>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider">NXT After Market</span>
                                                            {stock.details.market_status?.includes('NXT') && (
                                                                <span className="flex items-center gap-1 bg-indigo-500 text-[8px] text-white px-1.5 py-0.5 rounded-sm font-black animate-pulse">
                                                                    LIVE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl font-black text-white">
                                                                <span>??/span><span>{stock.details.nxt_data.price.toLocaleString()}</span>
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
                                                <div className="text-sm text-gray-400 md:mb-1"><span>AI 醫낇빀 ?먯닔</span></div>
                                                <div className={`text-4xl md:text-5xl font-black ${stock.score >= 70 ? 'text-green-400' : 'text-yellow-400'} drop-shadow-sm`}><span>{stock.score}</span></div>
                                            </div>
                                            <div className="w-full md:w-auto mt-2 md:mt-2 flex items-center justify-end gap-2">
                                                {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && <WatchlistButton symbol={stock.symbol} />}

                                                {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                                    <a
                                                        href={`/community?stock=${encodeURIComponent(stock.symbol)}`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-100 border border-blue-500/30 transition-all"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span className="hidden sm:inline">醫낅ぉ ?좊줎諛?/span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <GaugeChart score={stock.metrics?.supplyDemand || 0} label="?섍툒 遺꾩꽍" subLabel="湲곌?/?멸뎅???섍툒 媛뺣룄" color="#3b82f6" />
                                        <GaugeChart score={stock.metrics?.financials || 0} label="?щТ 嫄댁쟾?? subLabel="?깆옣??諛??섏씡?? color="#10b981" />
                                        <GaugeChart score={stock.metrics?.news || 0} label="?댁뒪 ?щ━" subLabel="湲띿젙/遺???댁뒪 遺꾩꽍" color="#f59e0b" />
                                    </div>

                                    {/* [New] Live Supply Widget for Korea Stocks ONLY */}
                                    {stock.currency === 'KRW' && stock.symbol && !stock.symbol.includes('.') && (
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
                                                    <div className="font-bold text-white text-lg tracking-tight"><span>{stock.details?.market_cap || 'N/A'}</span></div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="嫄곕옒??(Volume)" term="嫄곕옒?? isEasyMode={easyMode} />
                                                    <div className="font-mono text-white"><span>{stock.details?.volume?.toLocaleString() || 'N/A'}</span></div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PER (二쇨??섏씡鍮꾩쑉)" term="PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pe_ratio === 'number' && stock.details.pe_ratio !== 0)
                                                            ? <span><span>{stock.details.pe_ratio.toFixed(2)}</span><span>諛?/span></span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="EPS (二쇰떦?쒖씠??" term="EPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        <span>{typeof stock.details?.eps === 'number' ? stock.details.eps.toLocaleString() : '-'}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="諛곕떦?섏씡瑜?(Yield)" term="諛곕떦?섏씡瑜? isEasyMode={easyMode} />
                                                    <div className="font-mono text-green-400">
                                                        <span>{(typeof stock.details?.dividend_yield === 'number' && stock.details.dividend_yield !== 0)
                                                            ? <span>{(stock.details.dividend_yield * 100).toFixed(2)}</span>
                                                            : <span>{'-'}</span>}
                                                            {(typeof stock.details?.dividend_yield === 'number' && stock.details.dividend_yield !== 0) && <span>%</span>}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="異붿젙 PER" term="異붿젙 PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        <span>{(typeof stock.details?.forward_pe === 'number' && stock.details.forward_pe !== 0)
                                                            ? <span><span>{stock.details.forward_pe.toFixed(2)}</span><span>諛?/span></span>
                                                            : <span>{'-'}</span>}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="異붿젙 EPS" term="異붿젙 EPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {typeof stock.details?.forward_eps === 'number'
                                                            ? <span><span>{stock.currency === 'KRW' ? '?? : '$'}</span><span>{stock.details.forward_eps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
                                                            : <span><span>{'-'}</span></span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PBR" term="PBR" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pbr === 'number' && stock.details.pbr !== 0)
                                                            ? <span>{stock.details.pbr.toFixed(2)}諛?/span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="BPS" term="BPS" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {typeof stock.details?.bps === 'number'
                                                            ? <span><span>{stock.currency === 'KRW' ? '?? : '$'}</span><span>{stock.details.bps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="二쇰떦諛곕떦湲? term="二쇰떦諛곕떦湲? isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.dividend_rate === 'number' && stock.details.dividend_rate !== 0)
                                                            ? <span><span>{stock.currency === 'KRW' ? '?? : '$'}</span><span>{stock.details.dividend_rate.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>

                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">?꾩씪 醫낃?</div>
                                                    <div className="font-mono text-gray-300">
                                                        <span>{stock.currency === 'KRW' ? '?? : '$'}</span>
                                                        <span>{stock.details?.prev_close?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1">?쒓? (Open)</div>
                                                    <div className="font-mono text-gray-300">
                                                        <span>{stock.currency === 'KRW' ? '?? : '$'}</span>
                                                        <span>{stock.details?.open?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2">
                                                    <div className="text-gray-500 text-xs mb-1"><span>怨좉? / ?媛</span></div>
                                                    <div className="font-mono text-sm">
                                                        <span className="text-red-400"><span>{stock.details?.day_high?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
                                                        <span className="text-gray-600 mx-1">/</span>
                                                        <span className="text-blue-400"><span>{stock.details?.day_low?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 p-2">
                                                    <div className="text-gray-500 text-xs mb-1"><span>52二?理쒓퀬 / 理쒖?</span></div>
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
                                            <span>?곗씠??醫낇빀 遺꾩꽍</span>
                                        </button>



                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'daily' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('daily')}
                                        >
                                            <span>?쇱씪 ?쒖꽭</span>
                                        </button>

                                        {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                            <>
                                                {/* [New] Conditionally show tabs based on Global/Domestic */}
                                                {(() => {
                                                    const isGlobal = /[a-zA-Z]/.test(stock.symbol) && !stock.symbol.endsWith('.KS') && !stock.symbol.endsWith('.KQ');
                                                    return (
                                                        <>
                                                            <button
                                                                className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'investor' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
                                                                onClick={() => setActiveTab('investor')}
                                                            >
                                                                <span>?뱢 {isGlobal ? '二쇱슂 二쇱＜' : '?ъ옄???숉뼢'}</span> <span className="text-xs bg-indigo-500/20 px-2 py-0.5 rounded-full ml-1 text-indigo-300">{isGlobal ? 'US' : 'New'}</span>
                                                            </button>
                                                            <button
                                                                className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'financials' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                                                                onClick={() => setActiveTab('financials')}
                                                            >
                                                                <span>?뮥 ?щТ?쒗몴</span> <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full ml-1 text-emerald-300">Detailed</span>
                                                            </button>
                                                            
                                                            {!isGlobal && (
                                                                <>
                                                                    <button
                                                                        className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'overhang' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
                                                                        onClick={() => setActiveTab('overhang')}
                                                                    >
                                                                        <span>?좑툘 ?ㅻ쾭???踰뺤씤</span> <span className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded-full ml-1 text-yellow-300">New</span>
                                                                    </button>
                                                                    <button
                                                                        className={`pb-3 whitespace-nowrap ${activeTab === 'disclosure' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                                                        onClick={() => setActiveTab('disclosure')}
                                                                    >
                                                                        <span>怨듭떆(DART)</span> <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-1 text-gray-300">New</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        )}

                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'news' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('news')}
                                        >
                                            <span>愿???댁뒪</span>
                                        </button>


                                    </div>

                                    {activeTab === 'investor' ? (
                                        <InvestorTrendTab
                                            symbol={stock.symbol}
                                            stockName={stock.name}
                                        />
                                    ) : activeTab === 'overhang' ? (
                                        <OverhangTab
                                            symbol={stock.symbol}
                                            stockName={stock.name}
                                        />
                                    ) : activeTab === 'analysis' ? (
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
                                                        ?룫 湲곗뾽 媛쒖슂 (Company Profile)
                                                    </h4>
                                                    <div className="text-gray-300 text-sm md:text-base leading-relaxed font-medium">
                                                        {stock.description}
                                                    </div>
                                                </div>
                                            )}

                                            <h4 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-400" /> 醫낇빀 遺꾩꽍 由ы룷??
                                            </h4>
                                            <div className={`leading-relaxed text-sm md:text-lg font-medium whitespace-pre-wrap mb-6 min-h-[100px] ${(stock.summary || "").includes("?ㅻ쪟") ? 'text-red-300' : 'text-gray-100'}`}>
                                                {isAnalyzing && (!stock?.summary || (stock.summary && stock.summary.length < 50)) ? (
                                                    <div className="flex flex-col items-center justify-center h-full py-8 space-y-3 bg-white/5 rounded-xl border border-white/5">
                                                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                                        <div className="text-center">
                                                            <div className="text-blue-200 text-sm font-bold mb-1"><span>AI媛 ?ㅼ떆媛??곗씠?곕? 遺꾩꽍 以묒엯?덈떎...</span></div>
                                                            <div className="text-slate-500 text-xs"><span>?꾨왂 ?섎┰ 諛?由ы룷???묒꽦 以?(??3~5珥?</span></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span>{stock.summary || "遺꾩꽍 ?댁슜???놁뒿?덈떎."}</span>
                                                )}

                                            </div>

                                            {/* [New] Healthcare Analysis Integration - Hidden by user request 
                                            {stock.symbol && !stock.symbol.includes("MARKET") && (
                                                <div className="mt-8 pt-8 border-t border-white/10">
                                                    <h4 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                                                        <ShieldCheck className="h-6 w-6 text-green-400" /> ?щТ 吏???꾪솴 遺꾩꽍 (?뚭퀬由ъ쬁 ?곗텧)
                                                    </h4>
                                                    <CompanyAnalysisScore symbol={stock.symbol} autoLoad={true} />
                                                </div>
                                            )}
                                            */}


                                            {/* [New] 3-Line Rationale with Beginner Terms Guide */}
                                            {stock.rationale && stock.rationale.supply && (
                                                <div className="mb-6 space-y-3">
                                                    {/* ?⑹뼱 ?ㅻ챸 ?좉? 踰꾪듉 */}
                                                    <details className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                                        <summary className="flex items-center gap-2 p-3 cursor-pointer text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                                <Info className="w-4 h-4" />
                                                            </div>
                                                            <span>二쇱떇 珥덈낫?먮? ?꾪븳 ?⑹뼱 ?쎄쾶 ?댄빐?섍린 (?대┃)</span>
                                                        </summary>
                                                        <div className="p-4 pt-2 text-sm text-gray-300 space-y-3 border-t border-white/5 bg-black/20 leading-relaxed">
                                                            <p><strong className="text-blue-400">???섍툒 (Supply):</strong> <span className="text-gray-400">"吏湲???二쇱떇???꾧? ?댁젙?곸쑝濡??ш퀬 ?덈굹?"</span><br/>?멸뎅?몄씠??湲곌? ???덉씠 留롮? ?곗넀?ㅼ씠 ??二쇱떇??留롮씠 ?닿퀬 ?덈떎硫??섍툒??醫뗫떎怨??댁슂. 洹몃쭔???멸린紐곗씠 以묒씠?쇰뒗 ?살씠二?</p>
                                                            <p><strong className="text-purple-400">?뵦 紐⑤찘? (Momentum):</strong> <span className="text-gray-400">"?욎쑝濡?二쇨?媛 ?ㅻ? 留뚰븳 李⑺븳 ?뚯떇?대굹 ?먮꼫吏媛 ?덈굹?"</span><br/>?좎젣???諛? ???湲??ㅼ쟻 ?ъ꽦 ???욎쑝濡?二쇨?瑜?媛뺥븯寃??뚯뼱?щ┫ 留뚰븳 ?먮룞?μ쓣 ?섑??댁슂.</p>
                                                            <p><strong className="text-red-400">?좑툘 由ъ뒪??(Risk):</strong> <span className="text-gray-400">"?ъ옄?섍린 ??議곗떖?댁빞 ???꾪뿕 ?붿냼??臾댁뾿?멸??"</span><br/>?뚯궗???섏걶 ?뚯떇???덇굅?? 二쇨?媛 ?덈Т 鍮꾩떬 ?곹깭 ??二쇨?媛 ?⑥뼱吏????덈뒗 遺덉븞 ?붿냼?ㅼ쓣 吏싳뼱以섏슂.</p>
                                                        </div>
                                                    </details>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
                                                            <div className="text-blue-400 font-bold mb-1 flex items-center gap-2"><span>???섍툒 (Supply)</span></div>
                                                            <div className="text-sm text-gray-200"><span>{stock.rationale.supply}</span></div>
                                                        </div>
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
                                                            <div className="text-purple-400 font-bold mb-1 flex items-center gap-2"><span>?뵦 紐⑤찘? (Momentum)</span></div>
                                                            <div className="text-sm text-gray-200"><span>{stock.rationale.momentum}</span></div>
                                                        </div>
                                                        <div className="bg-white/5 p-4 rounded-xl border border-red-500/30 shadow-lg">
                                                            <div className="text-red-400 font-bold mb-1 flex items-center gap-2"><span>?좑툘 由ъ뒪??(Risk)</span></div>
                                                            <div className="text-sm text-gray-200"><span>{stock.rationale.risk}</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}



                                            <AIDisclaimer className="mt-6" />
                                        </>
                                    ) : activeTab === 'news' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <h4 className="text-xl font-bold flex items-center gap-2 text-white">
                                                    <TrendingUp className="h-6 w-6 text-yellow-400" /> 愿???댁뒪/怨듭떆
                                                </h4>
                                                

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
                                                        愿?⑤맂 理쒖떊 ?댁뒪媛 ?놁뒿?덈떎.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : activeTab === 'daily' && stock.symbol ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                <h4 className="text-xl font-bold flex items-center gap-2 text-white">
                                                    ?뱟 ?쇱씪 ?쒖꽭
                                                    {dailyLoading && <span className="ml-2 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>}
                                                </h4>
                                                
                                                <div className="flex gap-2">
                                                    {[
                                                        { id: '1mo', label: '1媛쒖썡' },
                                                        { id: '3mo', label: '3媛쒖썡' },
                                                        { id: '6mo', label: '6媛쒖썡' },
                                                        { id: '1y', label: '1?? }
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
                                                            <th className="py-3 px-2">?좎쭨</th>
                                                            <th className="py-3 px-2">醫낃?</th>
                                                            <th className="py-3 px-2">?꾩씪鍮?/th>
                                                            <th className="py-3 px-2">?쒓?</th>
                                                            <th className="py-3 px-2">怨좉?</th>
                                                            <th className="py-3 px-2">?媛</th>
                                                            <th className="py-3 px-2 text-right">嫄곕옒??/th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {dailyPricesData && Array.isArray(dailyPricesData) && dailyPricesData.length > 0 ? (
                                                            dailyPricesData.map((day: any, idx: number) => {
                                                                const safeChange = Math.abs(day.change || 0) > 500 ? 0 : (day.change || 0);
                                                                return (
                                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                        <td className="py-3 px-2 text-gray-300 font-mono text-sm">
                                                                            <span>{toKoreanDate(day.date)}</span>
                                                                        </td>
                                                                        <td className="py-3 px-2 font-mono font-bold">
                                                                            <span>{stock.currency === 'KRW' ? '?? : '$'}{day.close.toLocaleString()}</span>
                                                                        </td>
                                                                        <td className={`py-3 px-2 font-mono font-bold ${safeChange > 0 ? 'text-red-400' : safeChange < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                                            <div className="flex items-center gap-1">
                                                                                <span>{safeChange > 0 ? '?? : safeChange < 0 ? '?? : null}</span>
                                                                                <span>{Math.abs(day.change_val || 0).toLocaleString()}</span>
                                                                                <span className="text-[10px] ml-1 opacity-70">({safeChange > 0 ? '+' : ''}{safeChange.toFixed(2)}%)</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3 px-2 text-gray-400 font-mono text-sm">
                                                                            <span>{day.open.toLocaleString()}</span>
                                                                        </td>
                                                                        <td className="py-3 px-2 text-gray-400 font-mono text-sm">
                                                                            <span className="text-red-400/80">{day.high.toLocaleString()}</span>
                                                                        </td>
                                                                        <td className="py-3 px-2 text-gray-400 font-mono text-sm">
                                                                            <span className="text-blue-400/80">{day.low.toLocaleString()}</span>
                                                                        </td>
                                                                        <td className="py-3 px-2 text-right text-gray-400 font-mono text-sm">
                                                                            <span>{day.volume.toLocaleString()}</span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="py-4 text-center text-gray-500">?쇱씪 ?쒖꽭 ?곗씠???놁쓬</td>
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
                                            <FinancialsTable data={financialHighlights} currency={stock.currency} />
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








interface ScoreHistory {
    date: string;
    score: number;
    financial: number;
    news: number;
}

/** [Helper] ?좎쭨瑜??쒓뎅 ?쒓린踰뺤쑝濡?蹂??(YYYY??MM??DD?? */
const toKoreanDate = (val: any) => {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d.getTime())) {
        // ?대? YYYY.MM.DD ?뺤떇??寃쎌슦 泥섎━
        if (typeof val === 'string' && val.includes('.')) {
            const parts = val.split('.');
            if (parts.length >= 3) return `${parts[0]}??${parseInt(parts[1])}??${parseInt(parts[2])}??;
        }
        return val;
    }
    return `${d.getFullYear()}??${d.getMonth() + 1}??${d.getDate()}??;
};

function ScoreHistoryChart({ symbol }: { symbol: string }) {
    const [history, setHistory] = useState<ScoreHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/${symbol}/daily-history`);
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

            {!loading && (!Array.isArray(history) || history.length === 0) && (
                <div className="p-8 text-center text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>??λ맂 ?먯닔 ?덉뒪?좊━媛 ?놁뒿?덈떎.</p>
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
                                            <p className="text-xs text-gray-400 mb-2"><span>{toKoreanDate(data.date)}</span></p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-purple-400 font-bold"><span>醫낇빀 ?먯닔:</span></span>
                                                    <span className="text-white font-mono"><span>{data.score.toFixed(1)}</span></span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-green-400 text-xs"><span>?щТ:</span></span>
                                                    <span className="text-white text-xs font-mono"><span>{(data.financial || 0).toFixed(1)}</span></span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-amber-400 text-xs"><span>?щ━:</span></span>
                                                    <span className="text-white text-xs font-mono"><span>{(data.news || 0).toFixed(1)}</span></span>
                                                </div>
                                            </div>
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
                        <span>理쒓렐 50??遺꾩꽍 寃곌낵 ?몃젋?????뮕 李⑦듃 ?ъ씤???꾩뿉 留덉슦?ㅻ? ?щ젮 蹂???댁쑀瑜??뺤씤?섏꽭??/span>
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
                    headers: { "X-User-ID": user.id || (user as any).uid }
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
        console.log("[Watchlist] Toggling symbol:", symbol, "isWatchlisted:", isWatchlisted);
        if (!user) {
            alert("愿?ъ쥌紐?湲곕뒫? 濡쒓렇?몄씠 ?꾩슂?⑸땲??");
            return;
        }
        if (loading) return;
        setLoading(true);
        try {
            const method = isWatchlisted ? 'DELETE' : 'POST';
            const url = isWatchlisted ? `/api/watchlist/${symbol}` : `/api/watchlist`;

            const options: RequestInit = { 
                method,
                headers: { "X-User-ID": user.id || (user as any).uid || "guest" }
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
                const userId = user.id || (user as any).uid || "guest";
                alert(isWatchlisted ? "??愿?ъ쥌紐⑹뿉????젣?섏뿀?듬땲??" : "狩?愿?ъ쥌紐⑹뿉 ?깅줉?섏뿀?듬땲??");
                // Dispatch event to notify Sidebar
                window.dispatchEvent(new CustomEvent('watchlistChanged'));
            } else {
                alert("?좑툘 ????ㅽ뙣: " + (json.message || "?쒕쾭 ?묐떟 ?ㅻ쪟"));
            }
        } catch (err: any) {
            console.error(err);
            alert("?썞 ?듭떊 ?ㅻ쪟: " + err.message);
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
            {isWatchlisted ? <span>愿?ъ쥌紐?/span> : <span>愿?щ벑濡?/span>}
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
    if (loading) return <div className="h-32 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 animate-pulse text-gray-500 text-xs">?щТ ?곗씠?곕? 遺덈윭?ㅻ뒗 以?..</div>;
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-5 mb-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <BarChart2 className="w-24 h-24 text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2 mb-4">
                ?뱢 理쒓렐 3媛쒕뀈 ?ㅼ쟻 ?섏씠?쇱씠??(?곌컙)
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
                                formatter={(value: any) => [`${(Number(value) / 100000000).toLocaleString()} ?듭썝`, '']}
                                labelStyle={{ fontWeight: 'bold', color: '#60a5fa' }}
                            />
                            <Line type="monotone" dataKey="revenue" name="留ㅼ텧?? stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="op_income" name="?곸뾽?댁씡" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                    {Array.isArray(data) && data.slice(-1).map((latest, i) => (
                        <div key={i} className="space-y-3">
                            <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                                <p className="text-[10px] text-gray-500 mb-0.5"><span>理쒓렐 ?곕ℓ異?/span></p>
                                <p className="text-sm font-bold text-blue-300"><span><span>{(Number(latest?.revenue || 0) / 100000000).toLocaleString()}</span> <span>?듭썝</span></span></p>
                            </div>
                            <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                <p className="text-[10px] text-gray-500 mb-0.5"><span>?곸뾽?댁씡</span></p>
                                <p className="text-sm font-bold text-emerald-400"><span><span>{(Number(latest?.op_income || 0) / 100000000).toLocaleString()}</span> <span>?듭썝</span></span></p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="mt-3 text-[10px] text-gray-500 leading-relaxed italic border-t border-white/5 pt-2">
                * ???섏튂??DART/yfinance 怨듭젙 怨듭떆 ?곗씠?곕? 湲곕컲?쇰줈 媛怨듬맂 媛앷????섏튂?대ŉ, ?ν썑 ?ㅼ쟻??蹂댁옣?섏? ?딆뒿?덈떎.
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
                        ?뱢 ?쒖옣 ?곗씠???붿빟
                    </h3>
                    <p className={`text-lg font-bold leading-tight ${signal.signal === 'red' ? 'text-red-400' :
                        signal.signal === 'yellow' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                        <span>{signal.message}</span>
                    </p>
                    {signal.reason && (
                        <div className="mt-3 bg-white/5 rounded-lg p-2 text-sm text-gray-300 border border-white/5">
                            <span className="font-bold text-blue-200"><span>?먯씤?</span></span> <span>{signal.reason}</span>
                        </div>
                    )}
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${getTrafficColor(signal.signal)} animate-pulse`}>
                    <div className="text-3xl">
                        {signal.signal === 'red' ? <span>?썞</span> : signal.signal === 'yellow' ? <span>?좑툘</span> : <span>??</span>}
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
            setError("遺꾩꽍??醫낅ぉ???낅젰?댁＜?몄슂.");
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
                        ?뱤 AI ?ы듃?대━??遺꾩꽍
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
                                    <span>{loading ? "AI 遺꾩꽍 以?.." : "?곗씠??遺꾩꽍 ?쒖옉"}</span>
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center">
                                <div className="text-gray-400 text-sm mb-2">?ы듃?대━??醫낇빀 吏??/div>
                                <div className={`text-6xl font-black mb-4 ${result.score >= 80 ? 'text-green-400' :
                                    result.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    <span>{result.score}</span><span>??/span>
                                </div>
                                <div className="inline-block bg-white/10 px-4 py-2 rounded-full text-lg font-bold border border-white/20">
                                    <span><span>?곹깭 ?붿빟:</span> <span>{result.diagnosis}</span></span>
                                </div>
                            </div>

                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <h4 className="text-blue-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                                    ?뱥 AI 遺꾩꽍 ?곗씠???붿빟
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
                                ?ㅻⅨ ?ы듃?대━??遺꾩꽍?섍린
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
                const res = await fetch(`${API_BASE_URL}/api/analysis/stock/${safeSymbol}/investors/live`);
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

            // Auto-refresh every 1 minute (60000ms) for real-time updates as requested
            const interval = setInterval(() => {
                fetchSupply();
            }, 60000);

            // Cleanup interval on unmount
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [symbol]);

    // Check Market Hours (Force KST - UTC+9)
    const getKST = () => {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 9));
    };
    
    const nowKST = getKST();
    const day = nowKST.getDay(); // 0=Sun, 6=Sat
    const hour = nowKST.getHours();
    const minute = nowKST.getMinutes();
    const currentTime = hour * 100 + minute;
    
    const isWeekend = day === 0 || day === 6;
    // Market: 09:00 ~ 15:30
    const isMarketOpen = !isWeekend && currentTime >= 900 && currentTime < 1530;

    if (!data || !Array.isArray(data) || data.length === 0) {
        if (loading) return null;

        return (
            <div className="mt-8 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    ?뱤 ?ㅼ떆媛??섍툒 吏묎퀎 ?꾪솴 (?좎젙)
                </h4>
                <div className="p-6 bg-white/5 rounded-xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
                    {isWeekend ? (
                        <>
                            <div className="text-3xl">?샂</div>
                            <div className="text-gray-300 font-bold"><span>?ㅻ뒛? ?댁옣??二쇰쭚)?낅땲??</span></div>
                            <div className="text-sm text-gray-500"><span>?ㅼ떆媛??좎젙 ?섍툒? ?됱씪 ?μ쨷(09:30 ~ 14:30)?먮쭔 吏묎퀎?⑸땲??</span></div>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl">{isMarketOpen ? '?벊' : '?뙔'}</div>
                            <div className="text-gray-300 font-bold">
                                <span>{isMarketOpen ? "?좎젙 吏묎퀎 ?꾪솴???꾩쭅 ?놁뒿?덈떎." : "吏湲덉? ?뺢퇋???댁쁺 ?쒓컙???꾨떃?덈떎."}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                                <span>{isMarketOpen ? "???쒖옉 吏곹썑?닿굅?? 嫄곕옒?됱씠 ?곸뼱 吏묎퀎?섏? ?딆븯?????덉뒿?덈떎." : "?ㅼ떆媛??섍툒 吏묎퀎媛 醫낅즺?섏뿀?듬땲?? (?뺢퇋?? 09:00 ~ 15:30)"}</span>
                            </div>
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
                            <span>?뱤 ?ㅻ뒛???섍툒 寃곌낵</span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>?뺤젙移?/span></span>
                        </>
                    ) : (
                        <>
                            <span>?뱤 理쒓렐 ?섍툒 寃곌낵</span> <span>(<span>{last?.time}</span>)</span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>?뺤젙移?/span></span>
                        </>
                    )
                ) : (
                    !isMarketOpen ? (
                        <>
                            <span>?뢾 ?ㅻ뒛???섍툒 ?좎젙移?(留덇컧)</span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>?λ쭏媛?/span></span>
                        </>
                    ) : (
                        <>
                            <span>?뱤 ?ㅼ떆媛??섍툒 遺꾩꽍 ?곗씠??/span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>09:30~14:30 吏묎퀎</span></span>
                        </>
                    )
                )}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-xl border ${totalForeigner > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-sm text-gray-400 mb-1">
                        <span>{isDaily ? (isToday ? '?멸뎅???ㅻ뒛 ?⑷퀎' : '?멸뎅???뱀씪 ?⑷퀎') : '?멸뎅???좎젙 ?⑷퀎'}</span>
                    </div>
                    <div className={`text-2xl font-bold font-mono ${totalForeigner > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        <span>{totalForeigner > 0 ? '+' : null}</span><span><span>{totalForeigner.toLocaleString()}</span><span>二?/span></span>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${totalInst > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-xs md:text-sm text-gray-400 mb-1">
                        <span>{isDaily ? (isToday ? '湲곌? ?ㅻ뒛 ?⑷퀎' : '湲곌? ?뱀씪 ?⑷퀎') : '湲곌? ?좎젙 ?⑷퀎'}</span>
                    </div>
                    <div className={`text-lg md:text-2xl font-bold font-mono ${totalInst > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        <span>{totalInst > 0 ? '+' : null}</span><span><span>{totalInst.toLocaleString()}</span><span>二?/span></span>
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
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500"><span>吏묎퀎???곗씠?곌? ?놁뒿?덈떎.</span></td>
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
                            <span>&quot;留ㅼ닔 ?좎엯 ?뺤씤&quot; 二쇱슂 二쇱껜?ㅼ쓽 ?섍툒?됱씠 利앷??섎ŉ ?먭툑???좎엯?섍퀬 ?덉뒿?덈떎. ?섍툒 痢〓㈃?먯꽌??湲띿젙??吏?쒖엯?덈떎.</span>
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
                        <div className="text-gray-400 text-xs md:text-sm mb-1"><span>{symbol} ?꾩옱媛</span></div>
                        <div className="text-2xl md:text-3xl font-bold text-white tracking-widest"><span>{currentPrice.toLocaleString()}</span></div>
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
                                <span>???댁긽????(?뚰뙆)</span>
                            </button>
                            <button
                                onClick={() => setCondition("below")}
                                className={`py-3 rounded-xl border font-bold transition-all ${condition === "below" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-gray-400"}`}
                            >
                                <span>???댄븯????(?섎씫)</span>
                            </button>
                        </div>
                    </div>

                    {!telegramId && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl flex gap-3 items-start">
                            <span className="text-xl">?좑툘</span>
                            <div className="text-xs text-yellow-200">
                                <strong><span>?붾젅洹몃옩 ID 誘몄꽕??/span></strong><br />
                                <span>?뚮┝??紐⑤컮?쇰줈 諛쏆쑝?ㅻ㈃ [Settings] 硫붾돱?먯꽌 ?붾젅洹몃옩???곕룞?댁＜?몄슂.</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/20 py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : <span>?뚮┝ ??ν븯湲?/span>}
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
                const res = await fetch(`${API_BASE_URL}/api/analysis/chart/patterns/${encodeURIComponent(symbol)}`);
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
    if (!data || !Array.isArray(data) || data.length === 0) return <div className="text-gray-500 text-sm"><span>?ㅼ떆媛?李⑦듃 ?곗씠???놁쓬</span></div>;

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


// Old DividendHealthTab removed in favor of FinancialsTable and direct raw_data binding
