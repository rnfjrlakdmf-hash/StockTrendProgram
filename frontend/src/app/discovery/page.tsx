"use client";

import React, { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Header from "@/components/Header";
import MarketIndicators from "@/components/MarketIndicators";
import GaugeChart from "@/components/GaugeChart";
import { TrendingUp, ShieldCheck, Loader2, PlayCircle, Swords, Bell, Star, Save, LineChart as LineChartIcon, TrendingDown, AlertTriangle, Info, ArrowRight, Share2, BookOpen, Clock, Calendar, Cpu, Zap, Globe, BarChart2, Search, Lock, MessageSquare, Coins, Activity, Building2, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import ComponentErrorBoundary from '@/components/ComponentErrorBoundary';
import { useStockSocket } from "@/hooks/useStockSocket";
import BlinkingPrice from "@/components/BlinkingPrice";
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
import MarketNewsWidget from "@/components/MarketNewsWidget";
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
    regular_close?: number;
    regular_change_pct?: number;
    regular_change_val?: number;
    market_status?: string;
    change_val?: number;
    change_percent?: number;
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
        after_market_data?: {
            price: number;
            change_val: number;
            change_pct: string;
            status: string;
        };
    };
    after_market_data?: {
        price: number;
        change_val: number;
        change_pct: string;
        status: string;
    };
    nxt_data?: {
        price: number;
        change_val: number;
        change_pct: string;
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

// 거래소 이름을 한글로 변환하는 헬퍼
const getExchangeLabel = (symbol: string): { code: string; exchange: string; color: string } => {
    if (!symbol) return { code: symbol, exchange: '', color: 'text-gray-400' };
    if (symbol.includes('.KS')) return { code: symbol.replace('.KS', ''), exchange: '코스피', color: 'text-blue-400' };
    if (symbol.includes('.KQ')) return { code: symbol.replace('.KQ', ''), exchange: '코스닥', color: 'text-emerald-400' };
    if (symbol.includes('.O'))  return { code: symbol.replace('.O', ''), exchange: '나스닥', color: 'text-purple-400' };
    if (symbol.includes('.N'))  return { code: symbol.replace('.N', ''), exchange: 'NYSE', color: 'text-amber-400' };
    if (symbol.includes('.A'))  return { code: symbol.replace('.A', ''), exchange: '아멕스', color: 'text-orange-400' };
    if (/^[A-Z]{1,5}$/.test(symbol)) return { code: symbol, exchange: '나스닥/NYSE', color: 'text-purple-400' };
    return { code: symbol, exchange: '', color: 'text-gray-400' };
};

function EasyTerm({ label, term, isEasyMode, align = 'left' }: { label: string, term: string, isEasyMode: boolean, align?: 'left' | 'right' }) {
    if (!isEasyMode) return <div className="text-gray-400 text-[10px] sm:text-xs mb-1 break-words">{label}</div>;

    const explanation = TERM_EXPLANATIONS[term];

    return (
        <div className="group relative inline-flex items-center cursor-help mb-1 max-w-full">
            <span className="text-blue-300 border-b border-dashed border-blue-500/50 text-[10px] sm:text-xs font-bold flex items-center gap-1 break-words leading-tight">
                {label} <span className="text-[10px] text-yellow-400 opacity-80 shrink-0">📋</span>
            </span>
            <div className={`absolute bottom-full mb-2 w-52 p-3 bg-[#09090b] border border-blue-500/30 text-white text-xs rounded-xl shadow-2xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xl leading-relaxed font-medium ${
                align === 'right' ? 'right-0 left-auto' : 'left-0'
            }`}>
                <span className="text-yellow-400 font-bold block mb-1"><span>💡</span> <span>{term}</span> <span>지표 풀이</span></span>
                <span>{explanation || "쉬운 설명이 준비 중이에요!"}</span>
                <div className={`absolute top-full -mt-1 border-4 border-transparent border-t-[#09090b] ${
                    align === 'right' ? 'right-4 left-auto' : 'left-4'
                }`}></div>
            </div>
        </div>
    );
}

// [Cache System] Ultra-fast navigation
const STOCK_CACHE: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 30 * 60 * 1000; // [Optimized] 10분→30분 캐시. 백엔드 AI 캐시(1시간)와 정렬하여 Gemini 재호출 최소화

// Helper for parsing change rate and applying standard KOR formatting (Red = Up, Blue = Down, with ▲/▼)
const formatChangeDisplay = (val: any) => {
    // [Fix] Handle undefined/null specifically to prevent 'undefined%' string
    if (val === undefined || val === null || val === 'N/A' || val === '-') {
        return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: '0.00%' };
    }
    const str = String(val).trim();
    if (str === '0' || str === '0.00%' || str === '0.0' || !str) {
        return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: '0.00%' };
    }
    
    // [New] Preserve labels like [정규], [야간]
    const labelMatch = str.match(/^(\[[^\]]+\])/);
    const label = labelMatch ? labelMatch[1] : "";
    
    // Improved Parsing: Check markers OR numerical value
    const isNegExplicit = str.includes('-') || str.includes('▼') || str.includes('하락');
    const isPosExplicit = str.includes('+') || str.includes('▲') || str.includes('상승');
    
    const num = parseFloat(str.replace(/\[[^\]]+\]/g, '').replace(/[^\d.-]/g, ''));
    if (isNaN(num)) return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: str };
    if (num === 0) return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: label ? `${label} 0.00%` : '0.00%' };

    const isPos = isPosExplicit || (!isNegExplicit && num > 0);
    const isNeg = isNegExplicit || (!isPosExplicit && num < 0);
    
    // Remove existing signs and labels for clean formatting
    let cleanText = str.replace(/\[[^\]]+\]/g, '').replace(/[+▼▲-]/g, '').replace('하락', '').replace('상승', '').trim();
    
    // [Safety] If absolute numeric value is huge and no % was present, it's likely a price change (not pct).
    if (!str.includes('%')) {
        const absVal = Math.abs(parseFloat(cleanText.replace(/,/g, '')));
        if (absVal > 500) {
            return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: label ? `${label} 0.00%` : '0.00%' };
        }
        cleanText = `${cleanText}%`;
    }
    
    // [Updated] Standard KOR Colors: Red-500 (Up), Blue-500 (Down)
    if (isPos) return { colorText: 'text-red-500', colorBg: 'bg-red-500/10', text: label ? `${label} ▲ ${cleanText}` : `▲ ${cleanText}` };
    if (isNeg) return { colorText: 'text-blue-500', colorBg: 'bg-blue-500/10', text: label ? `${label} ▼ ${cleanText}` : `▼ ${cleanText}` };
    
    return { colorText: 'text-slate-400', colorBg: 'bg-slate-400/20', text: label ? `${label} ${cleanText}` : `${cleanText}` };
};

// Extended helper combining Amount + Percentage (e.g., ▲ 11,000 (1.01%))
// Extended helper combining Amount + Percentage (e.g., ▲ 11,000 (1.01%))
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
    const icon = calculatedDiff > 0 ? '▲ ' : calculatedDiff < 0 ? '▼ ' : '';
    
    // [Fix] Ensure we never output 'undefined%' or '(undefined%)'
    let pct = textStr.replace(/^[▲▼]\s*/, '').trim();
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

    const labelMatch = textStr.match(/^(\[[^\]]+\])/);
    const label = labelMatch ? labelMatch[1] : "";
    let cleanPct = pct.replace(/^\[[^\]]+\]\s*/, '');

    if (amtStr) {
       return { ...finalFormat, text: label ? `${label} ${icon}${amtStr}(${cleanPct})` : `${icon}${amtStr}(${cleanPct})` };
    }
    return { ...finalFormat, text: label ? `${label} ${icon}${cleanPct}` : `${icon}${cleanPct}` };
};
function parseCompanyDescription(desc: string) {
    if (!desc) return null;
    
    // 문장 단위로 분할
    const sentences = desc.split(/[.!?]\s+/).map(s => s.trim()).filter(Boolean);
    
    let basicIntro = "";
    let establishment = "";
    let location = "";
    const products: string[] = [];
    const technologies: string[] = [];
    
    sentences.forEach((sentence, idx) => {
        // 설립 및 본사 정보 찾기
        if (sentence.includes("설립") || sentence.includes("본사")) {
            const estMatch = sentence.match(/(\d{4})년에\s+설립/);
            if (estMatch) {
                establishment = estMatch[1] + "년 설립";
            }
            const locMatch = sentence.match(/(대한민국\s+[가-힣]+시|[가-힣]+시|서울|성남|울산|수원|인천|부산)/);
            if (locMatch) {
                location = locMatch[1];
            }
            return;
        }
        
        // 첫 문장은 기본 소개로 지정
        if (idx === 0) {
            basicIntro = sentence + (sentence.endsWith('.') ? '' : '.');
            return;
        }
        
        // 제품 및 제품 목록 추출 (쉼표로 구분된 부분)
        if (sentence.includes("제공합니다") || sentence.includes("포함됩니다") || sentence.includes("영위합니다") || sentence.includes("생산")) {
            const cleanText = sentence.replace(/이 회사는|을 포함한|제품 및 서비스가 포함됩니다|등을 제공합니다|제공합니다/g, "");
            const items = cleanText.split(/[,;]/).map(i => i.trim()).filter(i => i.length > 1 && i.length < 20);
            products.push(...items);
        } else if (sentence.includes("솔루션") || sentence.includes("기술") || sentence.includes("시스템")) {
            const items = sentence.replace(/솔루션도 제공하고 있다|등을 제공합니다|제공합니다/g, "").split(/[,;]/).map(i => i.trim()).filter(i => i.length > 1 && i.length < 20);
            technologies.push(...items);
        }
    });
    
    // 중복 제거
    const uniqueProducts = Array.from(new Set(products)).slice(0, 12);
    const uniqueTech = Array.from(new Set(technologies)).slice(0, 8);
    
    return {
        basicIntro,
        establishment,
        location,
        products: uniqueProducts,
        technologies: uniqueTech,
        rawSentences: sentences
    };
}

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
    const router = useRouter();
    const pathname = usePathname();
    const lastSearchedQuery = useRef<string>("");
    const [mounted, setMounted] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [stock, setStock] = useState<StockData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false); // [New] AI analyzing state
    const [analysisStep, setAnalysisStep] = useState(0); // 0=idle, 1=수급분석, 2=재무검토, 3=뉴스감지, 4=리포트작성
    const [error, setError] = useState("");
    const [showReport, setShowReport] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'news' | 'disclosure' | 'financials' | 'backtest' | 'history' | 'daily' | 'story' | 'alerts' | 'dividend_health' | 'investor' | 'overhang'>('analysis');
    const [easyMode, setEasyMode] = useState(false);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [exchangeRate, setExchangeRate] = useState<number>(1450); // Default
    const [financialHighlights, setFinancialHighlights] = useState<any | null>(null);
    const [financialsLoading, setFinancialsLoading] = useState(false);
    const [dividendData, setDividendData] = useState<any>(null);
    const [healthData, setHealthData] = useState<any>(null);
    const [dividendLoading, setDividendLoading] = useState(false);

    // [New] 해외 주식 프리마켓/에프터마켓 세션별 데이터
    const [extendedHours, setExtendedHours] = useState<any>(null);
    const [extendedLoading, setExtendedLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
        console.log("[Discovery] Mounted. API_BASE_URL:", API_BASE_URL);
    }, []);

    // [New] 해외 주식 세션별 데이터 fetch (프리마켓 / 정규장 / 에프터마켓) + 30초 자동 갱신
    const [extendedLastUpdated, setExtendedLastUpdated] = useState<number>(0);

    useEffect(() => {
        if (!stock?.symbol) { setExtendedHours(null); return; }
        const sym = stock.symbol;
        const cleanCode = sym.split('.')[0];
        const isDomestic = (sym.endsWith('.KS') || sym.endsWith('.KQ') || /^\d{6}$/.test(cleanCode));
        if (isDomestic) { setExtendedHours(null); return; }

        const fetchExtended = (showLoading = false) => {
            if (showLoading) setExtendedLoading(true);
            fetch(`${API_BASE_URL}/api/analysis/stock/${encodeURIComponent(sym)}/extended-hours`)
                .then(r => r.json())
                .then(d => {
                    if (d.status === 'success') {
                        setExtendedHours(d.data);
                        setExtendedLastUpdated(Date.now()); // 갱신 시각 기록 (flash 효과용)
                    } else {
                        setExtendedHours(null);
                    }
                })
                .catch(() => setExtendedHours(null))
                .finally(() => { if (showLoading) setExtendedLoading(false); });
        };

        fetchExtended(true); // 최초 1회 (로딩 표시)

        // [Polling] 10초마다 자동 갱신 (백그라운드, 로딩 스피너 없음)
        // 백엔드 10초 캐시가 있어 Naver 과부하 없음
        const interval = setInterval(() => fetchExtended(false), 10_000);
        return () => clearInterval(interval);
    }, [stock?.symbol]);

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
        const fetchDailyPrices = async (showLoading = true) => {
            if (!stock?.symbol) return;
            if (showLoading) setDailyLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/${encodeURIComponent(stock.symbol)}/daily-history?range=${dailyRange}&t=${Date.now()}`);
                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setDailyPricesData(json.data);
                }
            } catch (err) {
                console.error("Daily price fetch error:", err);
            } finally {
                if (showLoading) setDailyLoading(false);
            }
        };

        if (activeTab === 'daily') {
            fetchDailyPrices(true);
            
            // [New] Auto-refresh every 30 seconds for real-time daily price updates
            const interval = setInterval(() => {
                console.log("[Discovery] Auto-refreshing daily prices...");
                fetchDailyPrices(false); // Don't show loading spinner during auto-refresh for smoother UX
            }, 30000);
            
            return () => clearInterval(interval);
        }
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
    // KIS 키 입력 시: 국내(H0STCNT0) + 해외(HDFSCNT0) 모두 실시간
    // KIS 키 없을 시: 10초 폴링 fallback
    const { realtimeData, isConnected } = useStockSocket(stock?.symbol || null);

    useEffect(() => {
        if (realtimeData && stock) {
            setStock(prev => {
                if (!prev) return null;
                if (prev.price === realtimeData.price) return prev;

                return {
                    ...prev,
                    price: realtimeData.price,
                    change: realtimeData.change,
                    regular_close: realtimeData.regular_close || prev.regular_close,
                    regular_change_pct: realtimeData.regular_change_pct || prev.regular_change_pct,
                    regular_change_val: realtimeData.regular_change_val || prev.regular_change_val,
                    market_status: realtimeData.market_status || prev.market_status,
                    nxt_data: realtimeData.nxt_data || prev.nxt_data,
                    after_market_data: realtimeData.after_market_data || prev.after_market_data,
                    details: prev.details
                } as StockData;
            });

            // [New] KIS 실시간: 해외주식 extendedHours 위젯 가격도 즉시 업데이트
            // 폴링(10초) 대신 WebSocket 체결가로 active session 가격 덮어씀
            if (extendedHours && realtimeData.price) {
                const newPrice = parseFloat(String(realtimeData.price).replace(/,/g, ''));
                if (!isNaN(newPrice)) {
                    setExtendedHours((prev: any) => {
                        if (!prev) return prev;
                        const isActive = prev.market_status === 'OPEN';
                        const extActive = prev.extended?.is_active;
                        if (isActive) {
                            // 정규장 실시간 업데이트
                            return { ...prev, regular: { ...prev.regular, price: newPrice } };
                        } else if (extActive && prev.extended) {
                            // 장외(프리/에프터) 실시간 업데이트
                            return { ...prev, extended: { ...prev.extended, price: newPrice } };
                        }
                        return prev;
                    });
                    setExtendedLastUpdated(Date.now());
                }
            }
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

        // 타자 치는 동안 불필요한 API 호출을 막기 위해 디바운스 시간 최적화 (30ms -> 400ms)
        const timer = setTimeout(fetchSearchResults, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // [New] Handle URL Query Params - Trigger search when query param differs from last searched query (prevents infinite loops)
    useEffect(() => {
        const query = searchParams.get("q");
        if (query && query.toUpperCase() !== lastSearchedQuery.current.toUpperCase()) {
            setSearchInput(query);
            handleSearch(query);
        }
    }, [searchParams]);

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
            // [Speed Optimization] Use local mapping first to avoid unnecessary API calls
            let targetSymbol = query;
            const localTicker = getTickerFromKorean(targetSymbol);
            
            if (localTicker !== targetSymbol) {
                targetSymbol = localTicker;
                console.log("[Search] Resolved instantly via local mapping:", targetSymbol);
            } else {
                const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(targetSymbol);
                if (isKorean) {
                    console.log("[Search] Korean query detected. Resolving ticker via API...");
                    const searchUrl = `${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(targetSymbol)}&_t=${timestamp}`;
                    const searchRes = await fetch(searchUrl, { cache: 'no-store' });
                    if (!searchRes.ok) throw new Error(`Search API failed with status ${searchRes.status}`);
                    
                    const searchJson = await searchRes.json();
                    if (searchJson.status === "success" && Array.isArray(searchJson.data) && searchJson.data.length > 0) {
                        const found = searchJson.data[0];
                        targetSymbol = found.symbol || found.code || targetSymbol;
                    } else {
                        setStock(null);
                        setLoading(false);
                        setError(`'${query}'에 대한 검색 결과가 없습니다.`);
                        return;
                    }
                }
            }

            const cacheBuster = Math.random().toString(36).substring(7);
            const safeTicker = encodeURIComponent(targetSymbol.toUpperCase());
            console.log("[Search] Fetching data for ticker:", safeTicker);

            // [Fix] URL 파라미터 동기화 (관련 섹터 종목 클릭 시 무한 새로고침 및 멈춤 방지)
            // React closure stale state 방지를 위해 브라우저의 실제 URL을 직접 확인합니다.
            const currentQ = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get("q") : searchParams.get("q");
            
            if (currentQ?.toUpperCase() !== targetSymbol.toUpperCase()) {
                console.log("[Search] URL is different, pushing to router. Fetching data immediately to prevent UI freeze.");
                router.push(`${pathname}?q=${targetSymbol}`);
            }

            // 검색 진행이 확정되었으므로 마지막 검색 기록 갱신 (useEffect 중복 호출 방지)
            lastSearchedQuery.current = targetSymbol;

            // [Instant Load] Check global STOCK_CACHE first
            const cachedData = STOCK_CACHE[targetSymbol.toUpperCase()];
            if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
                console.log("[Search] Cache hit! Instant render for:", targetSymbol);
                setStock(cachedData.data);
                setLoading(false);
                
                // [Optimized] 캐시에 이미 AI 분석 결과(score)가 있으면 백그라운드 재요청 스킵
                const hasAiData = cachedData.data?.score !== undefined && cachedData.data?.rationale;
                if (hasAiData) {
                    console.log("[Search] Cache hit with AI data! No background fetch needed.", targetSymbol);
                    setLoading(false);
                } else {
                    // AI 데이터 없으면 백그라운드에서 AI 분석 요청
                    setIsAnalyzing(true);
                    setAnalysisStep(1);
                    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 1500);
                    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 3000);
                    const stepTimer3 = setTimeout(() => setAnalysisStep(4), 5000);
                    fetch(`${API_BASE_URL}/api/analysis/stock/${safeTicker}?t=${timestamp}`)
                        .then(res => res.ok ? res.json() : null)
                        .then(jsonFull => {
                            clearTimeout(stepTimer1); clearTimeout(stepTimer2); clearTimeout(stepTimer3);
                            if (jsonFull?.status === "success") {
                                setStock(jsonFull.data);
                                STOCK_CACHE[jsonFull.data.symbol.toUpperCase()] = { data: jsonFull.data, timestamp: Date.now() };
                            }
                            setIsAnalyzing(false); setAnalysisStep(0);
                        })
                        .catch(() => { clearTimeout(stepTimer1); clearTimeout(stepTimer2); clearTimeout(stepTimer3); setIsAnalyzing(false); setAnalysisStep(0); });
                }

                // Fetch Financial Highlights in background
                setFinancialsLoading(true);
                fetch(`${API_BASE_URL}/api/analysis/stock/${safeTicker}/financials?t=${Date.now()}&v=5.2.7`)
                    .then(res => res.json())
                    .then(resJson => {
                        if (resJson.status === "success") {
                            setFinancialHighlights(resJson.data);
                        }
                    })
                    .catch(() => { })
                    .finally(() => setFinancialsLoading(false));
                    
                return;
            }

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

                // 2. Slow Fetch (Background AI Analysis) - 30초 AbortController 타임아웃
                setIsAnalyzing(true);
                setAnalysisStep(1);
                const aiStepTimer1 = setTimeout(() => setAnalysisStep(2), 1800);
                const aiStepTimer2 = setTimeout(() => setAnalysisStep(3), 3600);
                const aiStepTimer3 = setTimeout(() => setAnalysisStep(4), 5500);
                const aiController = new AbortController();
                const aiTimeoutId = setTimeout(() => aiController.abort(), 30000); // 30초 타임아웃
                fetch(`${API_BASE_URL}/api/analysis/stock/${safeTicker}?t=${timestamp}`, { signal: aiController.signal })
                    .then(res => res.ok ? res.json() : null)
                    .then(jsonFull => {
                        clearTimeout(aiTimeoutId); clearTimeout(aiStepTimer1); clearTimeout(aiStepTimer2); clearTimeout(aiStepTimer3);
                        if (jsonFull?.status === "success") {
                            setStock(jsonFull.data);
                            STOCK_CACHE[jsonFull.data.symbol.toUpperCase()] = { data: jsonFull.data, timestamp: Date.now() };
                        }
                        setIsAnalyzing(false); setAnalysisStep(0);
                    })
                    .catch((err) => {
                        clearTimeout(aiTimeoutId); clearTimeout(aiStepTimer1); clearTimeout(aiStepTimer2); clearTimeout(aiStepTimer3);
                        if (err.name !== 'AbortError') console.error('[AI Fetch] Error:', err);
                        setIsAnalyzing(false); setAnalysisStep(0);
                    });

                // 3. Fetch Financial Highlights
                setFinancialsLoading(true);
                fetch(`${API_BASE_URL}/api/analysis/stock/${safeTicker}/financials?t=${Date.now()}&v=5.2.7`)
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
            console.error(err);
        }
    };

    // [New] Prefetch function for hover optimization
    const prefetchStock = async (term: string) => {
        if (!term) return;
        let query = term.trim();
        let ticker = getTickerFromKorean(query).toUpperCase();
        
        // Skip if already in cache
        if (STOCK_CACHE[ticker]) return;

        try {
            const safeTicker = encodeURIComponent(ticker);
            const fastUrl = `${API_BASE_URL}/api/analysis/stock/${safeTicker}?skip_ai=true`;
            const resFast = await fetch(fastUrl, { cache: 'force-cache' });
            if (!resFast.ok) return;
            const jsonFast = await resFast.json();
            
            if (jsonFast.status === "success" && jsonFast.data && jsonFast.data.symbol) {
                STOCK_CACHE[ticker] = { data: jsonFast.data, timestamp: Date.now() };
            }
        } catch (e) {
            console.error("Prefetch error:", e);
        }
    };

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
            <Header title="종목 발굴 & 데이터 분석" subtitle="AI가 분석하는 종목의 핵심 데이터 현황" />

            <div className="p-6 space-y-8">
                {/* Initial View: Search, Widgets, Dashboard */}
                {!stock && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Search / Hero Section */}
                        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 p-6 border border-white/20 shadow-xl overflow-visible">
                            <div className="relative z-20 max-w-2xl">
                                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-md">종목 데이터 분석 (AI Analysis)</h2>
                                <p className="text-gray-200 mb-4 text-sm md:text-base">
                                    종목 코드(티커)를 입력하여 기업의 재무 상태와 시장 심리를 분석하세요.<br />
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
                                            onFocus={() => searchResults.length > 0 && setShowResults(true)}
                                        />
                                        
                                        {/* [New] Search Results Dropdown */}
                                        {showResults && searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[300px] overflow-y-auto">
                                                {searchResults.map((res, idx) => (
                                                    <button
                                                        key={idx}
                                                        onMouseEnter={() => prefetchStock(res.symbol || res.code)}
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
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span>분석 시작</span>}
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

                        {/* 신규: 팩트 기반 증시 스캐너 & LIVE 공시 속보 */}
                        <div className="w-full">
                            <MarketScannerDashboard />
                        </div>

                        {/* 신규: 시장 지수 뉴스 위젯 */}
                        <div className="w-full">
                            <MarketNewsWidget />
                        </div>
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

                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Main Content Area (Left) */}
                            <div className="lg:col-span-8 space-y-6">
                                {/* Main Score Card */}
                                <div className="rounded-3xl bg-black/40 border border-white/20 p-8 backdrop-blur-md shadow-lg">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 md:gap-0">
                                    <div className="flex-1">
                                        <h3 className="text-3xl md:text-5xl font-black flex flex-wrap items-center gap-4 text-white mb-6">
                                            <span>{stock.name}</span>
                                            <span className="text-xl md:text-2xl text-gray-400 font-bold opacity-60 flex items-center gap-2">
                                                <span>{getExchangeLabel(stock.symbol).code}</span>
                                                {getExchangeLabel(stock.symbol).exchange && (
                                                    <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 ${getExchangeLabel(stock.symbol).color}`}>
                                                        {getExchangeLabel(stock.symbol).exchange}
                                                    </span>
                                                )}
                                            </span>
                                        </h3>

                                        {/* 정규장 및 시간외 거래 가격 분리 레이아웃 */}
                                        <div className="flex flex-col gap-4 mb-8">
                                            {/* 정규장 가격 영역 */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-md w-max shadow-sm">
                                                    {stock.market_status === '장중' ? 'LIVE MARKET 실시간 현재가' : 
                                                     stock.market_status?.includes('동시호가') ? 'CALL AUCTION 예상 체결가' :
                                                     stock.market_status?.includes('시간외') || stock.market_status?.includes('야간') || stock.market_status?.includes('에프터') ? 'AFTER MARKET 시간외 거래' :
                                                     stock.market_status?.includes('프리') || stock.market_status?.includes('PRE') ? 'PRE MARKET 프리마켓' :
                                                     'REGULAR MARKET 정규장 종가'}
                                                </span>
                                                <div className="flex flex-wrap items-center gap-4">
                                                    <span className="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tighter flex items-center">
                                                        <span className="text-2xl md:text-3xl mr-1 text-gray-500 font-bold">
                                                            {stock.currency === 'KRW' ? '₩' : '$'}
                                                        </span>
                                                        <BlinkingPrice
                                                            price={stock.currency === 'KRW'
                                                                ? Number(String(stock.regular_close || stock.price).replace(/,/g, '')).toLocaleString()
                                                                : stock.regular_close || stock.price}
                                                            className="text-white bg-transparent"
                                                        />
                                                    </span>

                                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-lg md:text-xl shadow-lg border ${
                                                        (() => {
                                                            const val = Number(String(stock.regular_change_val || stock.change_val || '0').replace(/,/g, ''));
                                                            return val > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                                                                   val < 0 ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                                                                   'bg-gray-500/10 border-white/10 text-gray-400';
                                                        })()
                                                    }`}>
                                                        <span className="flex items-center gap-1">
                                                            {(() => {
                                                                const val = Number(String(stock.regular_change_val || stock.change_val || '0').replace(/,/g, ''));
                                                                return val > 0 ? '▲' : val < 0 ? '▼' : '';
                                                            })()}
                                                            {Math.abs(Number(String(stock.regular_change_val || stock.change_val || '0').replace(/,/g, ''))).toLocaleString()}
                                                        </span>
                                                        <span className="text-sm md:text-base font-bold opacity-80 ml-1">
                                                            ({(() => {
                                                                const pct = stock.regular_change_pct;
                                                                if (!pct || pct === 0 || pct === '0.00%') {
                                                                    const raw = String(stock.change_percent || stock.change || '0.00%');
                                                                    const num = parseFloat(raw.replace(/[^\d.-]/g, ''));
                                                                    return isNaN(num) ? '0.00%' : `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
                                                                }
                                                                const n = typeof pct === 'number' ? pct : parseFloat(String(pct).replace(/[^\d.-]/g, ''));
                                                                return isNaN(n) ? String(pct) : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
                                                            })()})
                                                        </span>
                                                    </div>

                                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm shadow-sm ${
                                                        stock.market_status === '장중' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                                                        stock.market_status?.includes('시간외') || stock.market_status?.includes('야간') || stock.market_status?.includes('에프터') || stock.market_status?.includes('AFTER') ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                                        stock.market_status?.includes('동시호가') || stock.market_status?.includes('프리') || stock.market_status?.includes('PRE') ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                                        'bg-gray-500/10 text-gray-400 border-gray-500/30'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            stock.market_status === '장중' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                                                            stock.market_status?.includes('시간외') || stock.market_status?.includes('야간') || stock.market_status?.includes('에프터') || stock.market_status?.includes('AFTER') ? 'bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.6)]' :
                                                            stock.market_status?.includes('동시호가') || stock.market_status?.includes('프리') || stock.market_status?.includes('PRE') ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                                                            'bg-gray-500'
                                                        }`}></div>
                                                        <span className="text-xs md:text-sm font-black uppercase tracking-tight">{stock.market_status || '장마감'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 해외 주식 세션별 가격 위젯 (프리마켓 / 정규장 / 에프터마켓) */}
                                            {(extendedHours || extendedLoading) && (
                                                <GlobalExtendedHoursWidget
                                                    data={extendedHours}
                                                    loading={extendedLoading}
                                                    lastUpdated={extendedLastUpdated}
                                                />
                                            )}

                                            {/* 시간외 거래(애프터 마켓) 가격 영역 (국내 전용) */}
                                            {!extendedHours && (stock.nxt_data || stock.after_market_data) && (
                                                <div className="flex flex-col gap-1.5 mt-1 border-t border-white/10 pt-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] md:text-[11px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20 shadow-sm w-max">
                                                            {stock.market_status?.includes('야간') || stock.market_status?.includes('NXT') || (!stock.after_market_data && stock.nxt_data) 
                                                                ? 'NXT AFTER MARKET 야간거래' 
                                                                : 'AFTER MARKET 시간외거래'}
                                                        </span>
                                                        {(stock.market_status?.includes('시간외') || stock.market_status?.includes('야간') || stock.market_status?.includes('NXT')) && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1.5">
                                                        <span className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tight flex items-center">
                                                            <span className="text-lg md:text-xl mr-0.5 text-gray-500 font-bold">{stock.currency === 'KRW' ? '₩' : '$'}</span>
                                                            <BlinkingPrice
                                                                price={Number(String(
                                                                    (stock.market_status?.includes('야간') || stock.market_status?.includes('NXT')) 
                                                                        ? (stock.nxt_data?.price || stock.after_market_data?.price || 0)
                                                                        : (stock.after_market_data?.price || stock.nxt_data?.price || 0)
                                                                ).replace(/,/g, '')).toLocaleString()}
                                                                className="text-white bg-transparent"
                                                            />
                                                        </span>
                                                        <div className={`flex items-center gap-1.5 font-bold px-3 py-1 rounded-xl text-sm md:text-base border ${
                                                            (() => {
                                                                const val = (stock.market_status?.includes('야간') || stock.market_status?.includes('NXT')) 
                                                                    ? (stock.nxt_data?.change_val || 0) 
                                                                    : (stock.after_market_data?.change_val || 0);
                                                                return val > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                                                                       val < 0 ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                                                                       'bg-gray-500/10 border-white/10 text-gray-400';
                                                            })()
                                                        }`}>
                                                            <span>
                                                                {((stock.market_status?.includes('야간') || stock.market_status?.includes('NXT')) 
                                                                    ? (stock.nxt_data?.change_val || 0) 
                                                                    : (stock.after_market_data?.change_val || 0)) > 0 ? '▲' : 
                                                                 ((stock.market_status?.includes('야간') || stock.market_status?.includes('NXT')) 
                                                                    ? (stock.nxt_data?.change_val || 0) 
                                                                    : (stock.after_market_data?.change_val || 0)) < 0 ? '▼' : ''}
                                                                {Math.abs((stock.market_status?.includes('야간') || stock.market_status?.includes('NXT')) 
                                                                    ? (stock.nxt_data?.change_val || 0) 
                                                                    : (stock.after_market_data?.change_val || 0)).toLocaleString()}
                                                            </span>
                                                            <span className="text-xs md:text-sm opacity-80">
                                                                ({(stock.market_status?.includes('야간') || stock.market_status?.includes('NXT')) 
                                                                    ? (stock.nxt_data?.change_pct_str || stock.nxt_data?.change_pct || "0.00%") 
                                                                    : (stock.after_market_data?.change_pct_str || stock.after_market_data?.change_pct || "0.00%")})
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto flex flex-wrap md:flex-col justify-between md:justify-end items-center md:items-end gap-4 md:gap-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
                                        <div className="flex items-center gap-3 md:flex-col md:items-end">
                                            <div className="text-sm text-gray-400 md:mb-1"><span>AI 종합 점수</span></div>
                                            {/* [UX] AI 분석 중 점수 스켈레톤 */}
                                            {isAnalyzing && !stock.score ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="w-20 h-12 bg-white/10 rounded-xl animate-pulse" />
                                                    <div className="text-[10px] text-blue-400/60 font-mono animate-pulse">분석 중...</div>
                                                </div>
                                            ) : (
                                                <div className={`text-4xl md:text-5xl font-black ${(stock.score || 0) >= 70 ? 'text-green-400' : 'text-yellow-400'} drop-shadow-sm transition-colors duration-700`}><span>{stock.score || '-'}</span></div>
                                            )}
                                        </div>
                                        <div className="w-full md:w-auto mt-4 md:mt-2 flex items-center justify-end gap-2">
                                            {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && <WatchlistButton symbol={stock.symbol} />}

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

                                    {/* [UX] 게이지 차트 or 스켈레톤 */}
                                    {isAnalyzing && !stock.metrics?.supplyDemand ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {["수급 분석", "재무 건전성", "뉴스 심리"].map((label, i) => (
                                                <div key={i} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
                                                    <div className="w-24 h-24 rounded-full bg-white/10" />
                                                    <div className="text-center space-y-1.5">
                                                        <div className="h-4 w-20 bg-white/10 rounded-full mx-auto" />
                                                        <div className="h-3 w-28 bg-white/5 rounded-full mx-auto" />
                                                    </div>
                                                    <div className="text-[11px] text-blue-400/50 font-mono">{label} 분석 중...</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <GaugeChart score={stock.metrics?.supplyDemand || 0} label="수급 분석" subLabel="기관/외국인 수급 강도" color="#3b82f6" />
                                            <GaugeChart score={stock.metrics?.financials || 0} label="재무 건전성" subLabel="성장성 및 수익성" color="#10b981" />
                                            <GaugeChart score={stock.metrics?.news || 0} label="뉴스 심리" subLabel="긍정/부정 뉴스 분석" color="#f59e0b" />
                                        </div>
                                    )}

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
                                                    <EasyTerm label="거래량 (Volume)" term="거래량" isEasyMode={easyMode} align="right" />
                                                    <div className="font-mono text-white"><span>{stock.details?.volume?.toLocaleString() || 'N/A'}</span></div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="PER (주가수익비율)" term="PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.pe_ratio === 'number' && stock.details.pe_ratio !== 0)
                                                            ? <span><span>{Number(stock.details.pe_ratio).toFixed(2)}</span><span>배</span></span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="EPS (주당순이익)" term="EPS" isEasyMode={easyMode} align="right" />
                                                    <div className="font-mono text-white">
                                                        <span>{typeof stock.details?.eps === 'number' ? stock.details.eps.toLocaleString() : '-'}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="배당수익률 (Yield)" term="배당수익률" isEasyMode={easyMode} />
                                                    <div className="font-mono text-green-400">
                                                        <span>{(typeof stock.details?.dividend_yield === 'number' && stock.details.dividend_yield !== 0)
                                                            ? <span>{(Number(stock.details.dividend_yield) * 100).toFixed(2)}</span>
                                                            : <span>{'-'}</span>}
                                                            {(typeof stock.details?.dividend_yield === 'number' && stock.details.dividend_yield !== 0) && <span>%</span>}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="추정 PER" term="추정 PER" isEasyMode={easyMode} />
                                                    <div className="font-mono text-white">
                                                        <span>{(typeof stock.details?.forward_pe === 'number' && stock.details.forward_pe !== 0)
                                                            ? <span><span>{Number(stock.details.forward_pe).toFixed(2)}</span><span>배</span></span>
                                                            : <span>{'-'}</span>}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="추정 EPS" term="추정 EPS" isEasyMode={easyMode} align="right" />
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
                                                            ? <span>{Number(stock.details.pbr).toFixed(2)}배</span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="BPS" term="BPS" isEasyMode={easyMode} align="right" />
                                                    <div className="font-mono text-white">
                                                        {typeof stock.details?.bps === 'number'
                                                            ? <span><span>{stock.currency === 'KRW' ? '₩' : '$'}</span><span>{stock.details.bps.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
                                                            : <span>{'-'}</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <EasyTerm label="주당배당금" term="주당배당금" isEasyMode={easyMode} align="right" />
                                                    <div className="font-mono text-white">
                                                        {(typeof stock.details?.dividend_rate === 'number' && stock.details.dividend_rate !== 0)
                                                            ? <span><span>{stock.currency === 'KRW' ? '₩' : '$'}</span><span>{stock.details.dividend_rate.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
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
                                                        <span className="text-red-400"><span>{stock.details?.day_high?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
                                                        <span className="text-gray-600 mx-1">/</span>
                                                        <span className="text-blue-400"><span>{stock.details?.day_low?.toLocaleString(undefined, { maximumFractionDigits: stock.currency === 'KRW' ? 0 : 2 })}</span></span>
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



                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'daily' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('daily')}
                                        >
                                            <span>일일 시세</span>
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
                                                                <span>📈 {isGlobal ? '주요 주주' : '투자자 동향'}</span> <span className="text-xs bg-indigo-500/20 px-2 py-0.5 rounded-full ml-1 text-indigo-300">{isGlobal ? 'US' : 'New'}</span>
                                                            </button>
                                                            <button
                                                                className={`pb-3 whitespace-nowrap flex items-center gap-1 ${activeTab === 'financials' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                                                                onClick={() => setActiveTab('financials')}
                                                            >
                                                                <span>💰 재무제표</span> <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full ml-1 text-emerald-300">Detailed</span>
                                                            </button>
                                                            
                                                            {!isGlobal && (
                                                                <>
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
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        )}

                                        <button
                                            className={`pb-2 md:pb-3 whitespace-nowrap ${activeTab === 'news' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setActiveTab('news')}
                                        >
                                            <span>관련 뉴스</span>
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
                                            {stock.description && (() => {
                                                const parsed = parseCompanyDescription(stock.description);
                                                if (!parsed) return null;
                                                
                                                return (
                                                    <div className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-500/10 p-5 md:p-6 shadow-2xl relative overflow-hidden group">
                                                        {/* 배경 광원 효과 */}
                                                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none transition-transform group-hover:scale-150 duration-700" />
                                                        
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4 relative z-10">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                                    <Building2 className="w-4 h-4 text-indigo-400" />
                                                                </div>
                                                                <h4 className="text-sm font-black text-indigo-300 uppercase tracking-widest">
                                                                    기업 개요 (Company Profile)
                                                                </h4>
                                                            </div>
                                                            
                                                            <div className="flex gap-2">
                                                                {parsed.establishment && (
                                                                    <span className="text-[10px] md:text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                                                                        📅 {parsed.establishment}
                                                                    </span>
                                                                )}
                                                                {parsed.location && (
                                                                    <span className="text-[10px] md:text-xs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                                                                        📍 {parsed.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 기본 회사 소개 */}
                                                        {parsed.basicIntro && (
                                                            <p className="text-gray-200 text-sm md:text-base leading-relaxed font-semibold mb-5 border-l-2 border-indigo-500/40 pl-3 relative z-10">
                                                                {parsed.basicIntro}
                                                            </p>
                                                        )}

                                                        {/* 주요 사업 배지 */}
                                                        {parsed.products.length > 0 && (
                                                            <div className="mb-4 relative z-10">
                                                                <h5 className="text-[10px] md:text-[11px] font-black text-indigo-400/80 uppercase tracking-widest mb-2">
                                                                    🚢 주요 사업 및 생산 품목
                                                                </h5>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {parsed.products.map((item, idx) => (
                                                                        <span key={idx} className="text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 px-2.5 py-1.5 rounded-xl">
                                                                            {item}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 핵심 기술 배지 */}
                                                        {parsed.technologies.length > 0 && (
                                                            <div className="mb-4 relative z-10">
                                                                <h5 className="text-[10px] md:text-[11px] font-black text-purple-400/80 uppercase tracking-widest mb-2">
                                                                    ⚡ 핵심 기술 및 솔루션
                                                                </h5>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {parsed.technologies.map((item, idx) => (
                                                                        <span key={idx} className="text-xs font-semibold text-purple-200 bg-purple-500/5 hover:bg-purple-500/10 transition-colors border border-purple-500/10 px-2.5 py-1.5 rounded-xl">
                                                                            {item}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* 설명 전문 보기 아코디언 */}
                                                        <details className="mt-4 border-t border-white/5 pt-3 group relative z-10">
                                                            <summary className="text-[10px] md:text-xs text-gray-500 font-bold hover:text-gray-300 cursor-pointer list-none flex items-center gap-1 select-none">
                                                                <span>📄 설명 전문 보기</span>
                                                                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                                                            </summary>
                                                            <p className="text-gray-400 text-xs md:text-sm leading-relaxed mt-2 whitespace-pre-wrap">
                                                                {stock.description}
                                                            </p>
                                                        </details>
                                                    </div>
                                                );
                                            })()}

                                            <h4 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-400" /> 종합 분석 리포트
                                            </h4>
                                            <div className={`leading-relaxed text-sm md:text-lg font-medium whitespace-pre-wrap mb-6 min-h-[100px] ${(stock.summary || "").includes("오류") ? 'text-red-300' : 'text-gray-100'}`}>
                                                {isAnalyzing && (!stock?.summary || (stock.summary && stock.summary.length < 50)) ? (
                                                    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-indigo-950/40 overflow-hidden">
                                                        {/* 진행 단계 헤더 */}
                                                        <div className="flex items-center gap-3 px-5 py-4 border-b border-blue-500/10">
                                                            <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-blue-500/20">
                                                                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                                                <span className="absolute inset-0 rounded-full border border-blue-400/30 animate-ping" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-blue-200">🤖 AI 분석 엔진 가동 중</p>
                                                                <p className="text-[11px] text-blue-400/70 font-mono">
                                                                    {analysisStep === 1 && '수급 데이터 수집 중... (외국인·기관 매매 분석)'}
                                                                    {analysisStep === 2 && '재무제표 검토 중... (매출·영업이익·부채비율)'}
                                                                    {analysisStep === 3 && '뉴스·공시 감지 중... (호재·악재 자동 스캔)'}
                                                                    {analysisStep === 4 && 'AI 리포트 최종 작성 중... (거의 완료!)'}
                                                                    {analysisStep === 0 && '데이터 요청 중...'}
                                                                </p>
                                                            </div>
                                                            {/* 단계 뱃지 */}
                                                            <div className="ml-auto text-[10px] font-black text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full border border-blue-400/20">
                                                                {analysisStep}/4
                                                            </div>
                                                        </div>
                                                        {/* 진행 바 */}
                                                        <div className="px-5 pt-3 pb-1">
                                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-1000 ease-out"
                                                                    style={{ width: `${[5, 28, 55, 80, 95][analysisStep] ?? 5}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-right text-[10px] text-blue-400/60 mt-1 font-mono">{[5, 28, 55, 80, 95][analysisStep] ?? 5}%</p>
                                                        </div>
                                                        {/* 스켈레톤 텍스트 미리보기 */}
                                                        <div className="px-5 pb-5 space-y-2.5">
                                                            {[100, 90, 75, 85, 60].map((w, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="h-3.5 rounded-full bg-white/5 animate-pulse"
                                                                    style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }}
                                                                />
                                                            ))}
                                                        </div>
                                                        {/* 단계 스텝 도트 */}
                                                        <div className="flex items-center justify-center gap-3 pb-4">
                                                            {['수급', '재무', '뉴스', '리포트'].map((label, i) => (
                                                                <div key={i} className="flex flex-col items-center gap-1">
                                                                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                                                                        analysisStep > i ? 'bg-blue-400 scale-125' : analysisStep === i + 1 ? 'bg-blue-400 animate-pulse' : 'bg-white/10'
                                                                    }`} />
                                                                    <span className={`text-[9px] font-bold transition-colors duration-500 ${
                                                                        analysisStep > i ? 'text-blue-300' : 'text-white/20'
                                                                    }`}>{label}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span>{stock.summary || "분석 내용이 없습니다."}</span>
                                                )}

                                            </div>

                                            {/* [New] 3-Line Rationale with Beginner Terms Guide */}
                                            {(stock.rationale && stock.rationale.supply) ? (
                                                <div className="mb-6 space-y-3 animate-in fade-in duration-500">
                                                    {/* 용어 설명 토글 버튼 */}
                                                    <details className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                                        <summary className="flex items-center gap-2 p-3 cursor-pointer text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                                <Info className="w-4 h-4" />
                                                            </div>
                                                            <span>주식 초보자를 위한 용어 쉽게 이해하기 (클릭)</span>
                                                        </summary>
                                                        <div className="p-4 pt-2 text-sm text-gray-300 space-y-3 border-t border-white/5 bg-black/20 leading-relaxed">
                                                            <p><strong className="text-blue-400">✅ 수급 (Supply):</strong> <span className="text-gray-400">"지금 이 주식을 누가 열정적으로 사고 있나?"</span><br/>외국인이나 기관 등 돈이 많은 큰손들이 이 주식을 많이 담고 있다면 수급이 좋다고 해요. 그만큼 인기몰이 중이라는 뜻이죠!</p>
                                                            <p><strong className="text-purple-400">🔥 모멘텀 (Momentum):</strong> <span className="text-gray-400">"앞으로 주가가 오를 만한 착한 소식이나 에너지가 있나?"</span><br/>신제품 대박, 역대급 실적 달성 등 앞으로 주가를 강하게 끌어올릴 만한 원동력을 나타내요.</p>
                                                            <p><strong className="text-red-400">⚠️ 리스크 (Risk):</strong> <span className="text-gray-400">"투자하기 전 조심해야 할 위험 요소는 무엇인가?"</span><br/>회사에 나쁜 소식이 있거나, 주가가 너무 비싼 상태 등 주가가 떨어질 수 있는 불안 요소들을 짚어줘요.</p>
                                                        </div>
                                                    </details>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
                                                            <div className="text-blue-400 font-bold mb-1 flex items-center gap-2"><span>✅ 수급 (Supply)</span></div>
                                                            <div className="text-sm text-gray-200"><span>{stock.rationale.supply}</span></div>
                                                        </div>
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
                                                            <div className="text-purple-400 font-bold mb-1 flex items-center gap-2"><span>🔥 모멘텀 (Momentum)</span></div>
                                                            <div className="text-sm text-gray-200"><span>{stock.rationale.momentum}</span></div>
                                                        </div>
                                                        <div className="bg-white/5 p-4 rounded-xl border border-red-500/30 shadow-lg">
                                                            <div className="text-red-400 font-bold mb-1 flex items-center gap-2"><span>⚠️ 리스크 (Risk)</span></div>
                                                            <div className="text-sm text-gray-200"><span>{stock.rationale.risk}</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : isAnalyzing ? (
                                                /* [UX] rationale 카드 스켈레톤 */
                                                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {[
                                                        { label: '✅ 수급 (Supply)', color: 'border-blue-500/20', labelColor: 'text-blue-400/40' },
                                                        { label: '🔥 모멘텀 (Momentum)', color: 'border-white/10', labelColor: 'text-purple-400/40' },
                                                        { label: '⚠️ 리스크 (Risk)', color: 'border-red-500/20', labelColor: 'text-red-400/40' },
                                                    ].map((item, i) => (
                                                        <div key={i} className={`bg-white/5 p-4 rounded-xl border ${item.color} shadow-lg`} style={{ animationDelay: `${i * 200}ms` }}>
                                                            <div className={`font-bold mb-2 text-sm ${item.labelColor}`}>{item.label}</div>
                                                            <div className="space-y-1.5">
                                                                <div className="h-3 bg-white/10 rounded-full animate-pulse w-full" />
                                                                <div className="h-3 bg-white/10 rounded-full animate-pulse w-5/6" />
                                                                <div className="h-3 bg-white/10 rounded-full animate-pulse w-4/6" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}



                                            <AIDisclaimer className="mt-6" />
                                        </>
                                    ) : activeTab === 'news' ? (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <h4 className="text-xl font-bold flex items-center gap-2 text-white">
                                                    <TrendingUp className="h-6 w-6 text-yellow-400" /> 관련 뉴스/공시
                                                </h4>
                                                

                                            </div>

                                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                                {newsLoading ? (
                                                    <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                                        <Loader2 className="h-8 w-8 text-yellow-400 animate-spin mb-4" />
                                                        <p className="text-gray-400 text-sm">최신 뉴스를 집계하고 있습니다...</p>
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
                                                            <th className="py-3 px-2">전일비</th>
                                                            <th className="py-3 px-2">시가</th>
                                                            <th className="py-3 px-2">고가</th>
                                                            <th className="py-3 px-2">저가</th>
                                                            <th className="py-3 px-2 text-right">거래량</th>
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
                                                                            <span>{stock.currency === 'KRW' ? '₩' : '$'}{day.close.toLocaleString()}</span>
                                                                        </td>
                                                                        <td className={`py-3 px-2 font-mono font-bold ${safeChange > 0 ? 'text-red-400' : safeChange < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                                            <div className="flex items-center gap-1">
                                                                                <span>{safeChange > 0 ? '▲' : safeChange < 0 ? '▼' : null}</span>
                                                                                <span>{Math.abs(day.change_val || 0).toLocaleString()}</span>
                                                                                <span className="text-[10px] ml-1 opacity-70">({safeChange > 0 ? '+' : ''}{Number(safeChange).toFixed(2)}%)</span>
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
                                                                <td colSpan={7} className="py-4 text-center text-gray-500">일일 시세 데이터 없음</td>
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

                            {/* Sidebar / Recommendations (Right) */}
                        <div className="lg:col-span-4 space-y-6">
                            {stock.symbol && (!stock.symbol.toUpperCase || !stock.symbol.toUpperCase().includes("MARKET")) && (
                                <div className="rounded-3xl bg-black/40 border border-white/20 p-6 shadow-lg sticky top-24">
                                    <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                                        관련 섹터 종목
                                    </h3>
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
                                            <p className="text-xs text-gray-400 mb-2"><span>{toKoreanDate(data.date)}</span></p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-purple-400 font-bold"><span>종합 점수:</span></span>
                                                    <span className="text-white font-mono"><span>{Number(data.score).toFixed(1)}</span></span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-green-400 text-xs"><span>재무:</span></span>
                                                    <span className="text-white text-xs font-mono"><span>{Number(data.financial || 0).toFixed(1)}</span></span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-amber-400 text-xs"><span>심리:</span></span>
                                                    <span className="text-white text-xs font-mono"><span>{Number(data.news || 0).toFixed(1)}</span></span>
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
                        <span>최근 50회 분석 결과 트렌드 • 💡 차트 포인트 위에 마우스를 올려 변동 이유를 확인하세요</span>
                    </p>
                </div>
            )}
        </div>
    );
}

function WatchlistButton({ symbol }: { symbol: string }) {
    const { user, isMigrating } = useAuth();
    const [isWatchlisted, setIsWatchlisted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkWatchlist = async () => {
            if (!user) {
                setLoading(false);
                setIsWatchlisted(false);
                return;
            }
            if (isMigrating) {
                setLoading(true);
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
    }, [symbol, user, isMigrating]);

    const toggleWatchlist = async () => {
        console.log("[Watchlist] Toggling symbol:", symbol, "isWatchlisted:", isWatchlisted);
        if (!user) {
            alert("관심종목 기능은 로그인이 필요합니다.");
            return;
        }
        if (isMigrating) {
            alert("관심종목을 동기화하고 있습니다. 잠시만 기다려주세요.");
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
                const wantToSet = confirm("포트폴리오 연동을 위해 매수 단가와 수량을 입력하시겠습니까?\n(취소 시 기본 관심종목으로만 등록되며 단가는 현재가로 지정됩니다)");
                let price: number | undefined = undefined;
                let quantity: number | undefined = undefined;
                
                if (wantToSet) {
                    const pInput = prompt("매수 단가를 입력하세요 (숫자만, 0입력시 초기화):");
                    if (pInput !== null && pInput.trim() !== '') {
                        const parsedP = parseFloat(pInput.replace(/[^0-9.]/g, ''));
                        if (!isNaN(parsedP)) price = parsedP;
                    }
                    const qInput = prompt("보유 수량을 입력하세요 (숫자만):");
                    if (qInput !== null && qInput.trim() !== '') {
                        const parsedQ = parseFloat(qInput.replace(/[^0-9.]/g, ''));
                        if (!isNaN(parsedQ)) quantity = parsedQ;
                    }
                }

                options.headers = { 
                    ...options.headers,
                    'Content-Type': 'application/json' 
                };
                options.body = JSON.stringify({ symbol, price, quantity });
            }

            const res = await fetch(url, options);
            const json = await res.json();

            if (json.status === "success") {
                setIsWatchlisted(!isWatchlisted);
                const userId = user.id || (user as any).uid || "guest";
                
                // [Auto-FCM Activation] 관심종목 등록 시 알림 권한 자동 요청 및 서버 연동
                if (!isWatchlisted) {
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                        const currentPerm = Notification.permission;
                        if (currentPerm === 'default') {
                            // 비동기로 알림 권한 및 토큰 등록 요청 (UI를 차단하지 않음)
                            setTimeout(async () => {
                                try {
                                    const { requestFCMToken } = await import('@/lib/firebase');
                                    const token = await requestFCMToken();
                                    if (token) {
                                        await fetch(`${API_BASE_URL}/api/system/fcm/register`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-User-Id': userId
                                            },
                                            body: JSON.stringify({
                                                token,
                                                device_type: 'web',
                                                device_name: navigator.userAgent
                                            })
                                        });
                                        localStorage.setItem('fcm_registered', 'true');
                                        // Dispatch event to update FCMTokenManager indicator status
                                        window.dispatchEvent(new CustomEvent('OPEN_FCM_REQUEST'));
                                    }
                                } catch (fcmErr) {
                                    console.error('[FCM Auto-Enable] Error:', fcmErr);
                                }
                            }, 500);
                        } else if (currentPerm === 'granted') {
                            // 이미 권한이 있으면 최신 상태로 토큰 연동만 확실히 동기화
                            setTimeout(async () => {
                                try {
                                    const { requestFCMToken } = await import('@/lib/firebase');
                                    const token = await requestFCMToken();
                                    if (token) {
                                        await fetch(`${API_BASE_URL}/api/system/fcm/register`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-User-Id': userId
                                            },
                                            body: JSON.stringify({
                                                token,
                                                device_type: 'web',
                                                device_name: navigator.userAgent
                                            })
                                        });
                                        localStorage.setItem('fcm_registered', 'true');
                                    }
                                } catch (e) {}
                            }, 500);
                        }
                    }
                }
                
                alert(isWatchlisted ? "❌ 관심종목에서 삭제되었습니다." : "⭐ 관심종목에 등록되었습니다!");
                // Dispatch event to notify Sidebar
                window.dispatchEvent(new CustomEvent('watchlistChanged'));
            } else {
                alert("⚠️ 저장 실패: " + (json.message || "서버 응답 오류"));
            }
        } catch (err: any) {
            console.error(err);
            alert("🛑 통신 오류: " + err.message);
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
                    📊 장 마감 수급 집계 현황 (잠정)
                </h4>
                <div className="p-6 bg-white/5 rounded-xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
                    {isWeekend ? (
                        <>
                            <div className="text-3xl">😴</div>
                            <div className="text-gray-300 font-bold"><span>오늘은 휴장일(주말)입니다.</span></div>
                            <div className="text-sm text-gray-500"><span>장 마감 수급 정보는 평일 장중(09:30 ~ 14:30)에만 집계됩니다.</span></div>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl">{isMarketOpen ? '📭' : '🌙'}</div>
                            <div className="text-gray-300 font-bold">
                                <span>{isMarketOpen ? "잠정 집계 현황이 아직 없습니다." : "지금은 정규장 운영 시간이 아닙니다."}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                                <span>{isMarketOpen ? "장 시작 직후이거나, 거래량이 적어 집계되지 않았을 수 있습니다." : "장 마감 수급 집계가 마감되었습니다. (정규장: 09:00 ~ 15:30)"}</span>
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
                            <span>📊 장 마감 수급 분석 데이터</span> <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded ml-2"><span>09:30~14:30 집계</span></span>
                        </>
                    )
                )}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-xl border ${totalForeigner > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-sm text-gray-400 mb-1">
                        <span>{isDaily ? (isToday ? '외국인 오늘 합계' : '외국인 당일 합계') : '외국인 잠정 합계'}</span>
                    </div>
                    <div className={`text-2xl font-bold font-mono ${totalForeigner > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        <span>{totalForeigner > 0 ? '+' : null}</span><span><span>{totalForeigner.toLocaleString()}</span><span>주</span></span>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${totalInst > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <div className="text-xs md:text-sm text-gray-400 mb-1">
                        <span>{isDaily ? (isToday ? '기관 오늘 합계' : '기관 당일 합계') : '기관 잠정 합계'}</span>
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
                                <strong><span>텔레그램 ID 미설정</span></strong><br />
                                <span>알림을 모바일로 받으려면 [Settings] 메뉴에서 텔레그램을 연동해주세요.</span>
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
    if (!data || !Array.isArray(data) || data.length === 0) return <div className="text-gray-500 text-sm"><span>당일 차트 데이터 없음</span></div>;

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


// Old DividendHealthTab removed in favor of FinancialsTable and direct raw_data binding

// [New] KIS 실시간 안내 배너 (해외주식 조회 시, KIS 미연동 유저에게만 표시)
function KisRealTimeBanner() {
    const [dismissed, setDismissed] = useState(false);
    const [kisConnected, setKisConnected] = useState(false);

    useEffect(() => {
        // sessionStorage에서 KIS 키 존재 여부 확인 (탭 닫으면 자동 삭제)
        const stored = sessionStorage.getItem('user_kis_keys');
        if (stored) {
            try { JSON.parse(stored); setKisConnected(true); } catch {}
        }
        // 이번 세션에 닫았으면 숨김
        if (sessionStorage.getItem('kis_banner_dismissed') === 'true') {
            setDismissed(true);
        }
    }, []);

    if (kisConnected || dismissed) return null;

    return (
        <div className="relative mt-3 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-950/40 to-orange-950/30 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 닫기 버튼 */}
            <button
                onClick={() => { setDismissed(true); sessionStorage.setItem('kis_banner_dismissed', 'true'); }}
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-400 text-lg leading-none"
            >
                ×
            </button>

            <div className="flex items-start gap-3 pr-6">
                {/* 아이콘 */}
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-base">⚡</span>
                </div>

                <div className="flex-1">
                    <div className="text-sm font-black text-amber-300 mb-0.5">
                        더 빠르게 정보를 보고 싶으신가요?
                    </div>
                    <div className="text-[11px] text-gray-400 leading-relaxed mb-3">
                        현재 <span className="text-amber-400 font-bold">10초 간격</span>으로 갱신 중입니다.
                        한국투자증권 OpenAPI를 연동하면 나스닥·NYSE 체결가를 <span className="text-white font-bold">즉시</span> 볼 수 있습니다.
                        <span className="text-green-400 font-bold"> 계좌 개설 + API 발급 모두 무료</span>입니다.
                    </div>

                    {/* 단계 요약 */}
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        {['① KIS 계좌 개설', '② API 키 발급', '③ 앱 설정 입력'].map((step, i) => (
                            <span key={i} className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full font-bold">
                                {step}
                            </span>
                        ))}
                        <span className="text-[10px] text-green-400 font-bold">→ 연동 완료!</span>
                    </div>

                    <a
                        href="/settings"
                        className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-black px-3 py-1.5 rounded-lg transition-colors"
                    >
                        ⚙️ 설정 페이지에서 진행하기 →
                    </a>
                </div>
            </div>
        </div>
    );
}


// [New] 해외 주식 프리마켓 / 정규장 / 에프터마켓 세션별 가격 위젯
function GlobalExtendedHoursWidget({ data, loading, lastUpdated }: { data: any; loading: boolean; lastUpdated?: number }) {
    const [tickAgo, setTickAgo] = useState('');

    // 마지막 갱신 시각을 "방금 전 / N초 전" 형식으로 실시간 업데이트
    useEffect(() => {
        if (!lastUpdated) return;
        const tick = () => {
            const diff = Math.floor((Date.now() - lastUpdated) / 1000);
            if (diff < 5) setTickAgo('방금 갱신');
            else if (diff < 60) setTickAgo(`${diff}초 전 갱신`);
            else setTickAgo(`${Math.floor(diff / 60)}분 전 갱신`);
        };
        tick();
        const id = setInterval(tick, 5000);
        return () => clearInterval(id);
    }, [lastUpdated]);

    if (loading) {
        return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 w-fit">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-xs text-gray-400 font-bold animate-pulse">장외 시세 로딩 중...</span>
            </div>
        );
    }
    if (!data) return null;

    const { regular, extended, current_session, currency, usd_krw } = data;
    const currencySymbol = currency === 'USD' ? '$' : (currency === 'KRW' ? '₩' : currency + ' ');
    const isUSD = currency === 'USD';

    // [v2] 달러 → 원화 환산 헬퍼
    const fmtKrw = (usdPrice: number): string | null => {
        if (!isUSD || !usd_krw || !usdPrice) return null;
        return Math.round(usdPrice * usd_krw).toLocaleString();
    };

    const isPre = extended?.session_type === 'PRE_MARKET';
    const isAfter = extended?.session_type === 'AFTER_HOURS';
    const isRegularActive = data.market_status === 'OPEN';
    const isExtendedActive = extended?.is_active;

    const getChangeColor = (val: number) => val > 0 ? 'text-rose-400' : val < 0 ? 'text-blue-400' : 'text-gray-400';
    const getChangeBg = (val: number) => val > 0 ? 'bg-rose-500/10 border-rose-500/30' : val < 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10';
    const arrow = (val: number) => val > 0 ? '▲ ' : val < 0 ? '▼ ' : '';

    const fmt = (n: number, decimals = 2) => n?.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 세션 상태 배지 + 갱신 시각 */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                        isRegularActive ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]' :
                        isExtendedActive ? 'bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(192,132,252,0.6)]' :
                        'bg-gray-600'
                    }`} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                        {current_session}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono ml-1">{data.exchange}</span>
                </div>
                {/* 🔄 자동 갱신 인디케이터 */}
                <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-mono">
                    <div className="w-1 h-1 rounded-full bg-blue-500/60 animate-pulse" />
                    <span>10초 자동갱신</span>
                    {tickAgo && <span className="text-gray-700">· {tickAgo}</span>}
                </div>
            </div>

            {/* 세션 카드 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* ① 프리마켓 */}
                <div className={`relative rounded-2xl border p-4 transition-all duration-300 ${
                    isPre && isExtendedActive
                        ? 'bg-purple-900/20 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                        : 'bg-white/[0.03] border-white/8 opacity-60'
                }`}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isPre && isExtendedActive
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-white/5 text-gray-500 border border-white/10'
                        }`}>Pre-Market</span>
                        {isPre && isExtendedActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                        )}
                    </div>
                    {isPre && extended?.price ? (
                        <>
                            <div className="text-2xl font-black text-white font-mono tracking-tight">
                                {currencySymbol}{fmt(extended.price)}
                            </div>
                            {/* [v2] 원화 환산가 */}
                            {fmtKrw(extended.price) && (
                                <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                    ≈ ₩{fmtKrw(extended.price)}
                                </div>
                            )}
                            <div className={`flex items-center gap-1 mt-1 text-sm font-bold ${getChangeColor(extended.change || 0)}`}>
                                <span>{arrow(extended.change || 0)}{Math.abs(extended.change || 0).toFixed(2)}</span>
                                <span className="text-xs opacity-70">({extended.change_pct > 0 ? '+' : ''}{extended.change_pct?.toFixed(2)}%)</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1.5 font-mono">
                                vs 전일종가 {currencySymbol}{fmt(regular.prev_close)}
                            </div>
                        </>
                    ) : (
                        <div className="text-gray-600 text-xs font-bold mt-1">
                            {data.market_status === 'CLOSED' ? '장마감 (세션 종료)' : '세션 미개장'}
                        </div>
                    )}
                </div>

                {/* ② 정규장 */}
                <div className={`relative rounded-2xl border p-4 transition-all duration-300 ${
                    isRegularActive
                        ? 'bg-green-900/20 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.12)]'
                        : 'bg-white/[0.03] border-white/8'
                }`}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isRegularActive
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}>Regular Hours</span>
                        {isRegularActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />}
                    </div>
                    <div className="text-2xl font-black text-white font-mono tracking-tight">
                        {currencySymbol}{fmt(regular.price)}
                    </div>
                    {/* [v2] 원화 환산가 */}
                    {fmtKrw(regular.price) && (
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            ≈ ₩{fmtKrw(regular.price)}
                        </div>
                    )}
                    <div className={`flex items-center gap-1 mt-1 text-sm font-bold ${getChangeColor(regular.change || 0)}`}>
                        <span>{arrow(regular.change || 0)}{Math.abs(regular.change || 0).toFixed(2)}</span>
                        <span className="text-xs opacity-70">({regular.change_pct > 0 ? '+' : ''}{regular.change_pct?.toFixed(2)}%)</span>
                    </div>
                    {(regular.high || regular.low) && (
                        <div className="text-[10px] text-gray-500 mt-1.5 font-mono">
                            H {currencySymbol}{fmt(regular.high)} · L {currencySymbol}{fmt(regular.low)}
                        </div>
                    )}
                </div>

                {/* ③ 에프터마켓 */}
                <div className={`relative rounded-2xl border p-4 transition-all duration-300 ${
                    isAfter && isExtendedActive
                        ? 'bg-amber-900/20 border-amber-500/40 shadow-[0_0_20px_rgba(251,191,36,0.12)]'
                        : 'bg-white/[0.03] border-white/8 opacity-60'
                }`}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isAfter && isExtendedActive
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/5 text-gray-500 border border-white/10'
                        }`}>After Hours</span>
                        {isAfter && isExtendedActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        )}
                    </div>
                    {isAfter && extended?.price ? (
                        <>
                            <div className="text-2xl font-black text-white font-mono tracking-tight">
                                {currencySymbol}{fmt(extended.price)}
                            </div>
                            {/* [v2] 원화 환산가 */}
                            {fmtKrw(extended.price) && (
                                <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                    ≈ ₩{fmtKrw(extended.price)}
                                </div>
                            )}
                            <div className={`flex items-center gap-1 mt-1 text-sm font-bold ${getChangeColor(extended.change || 0)}`}>
                                <span>{arrow(extended.change || 0)}{Math.abs(extended.change || 0).toFixed(2)}</span>
                                <span className="text-xs opacity-70">({extended.change_pct > 0 ? '+' : ''}{extended.change_pct?.toFixed(2)}%)</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1.5 font-mono">
                                vs 정규장 종가 {currencySymbol}{fmt(regular.price)}
                            </div>
                            {!isExtendedActive && (
                                <div className="text-gray-500 text-[10px] font-bold mt-2">장마감 (최종가)</div>
                            )}
                        </>
                    ) : (
                        <div className="text-gray-600 text-xs font-bold mt-1">
                            {data.market_status === 'CLOSED' ? '장마감 (세션 종료)' : '세션 미개장'}
                        </div>
                    )}
                </div>
            </div>

            {/* 전일 종가 기준선 정보 */}
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-500 font-mono">
                <span>전일종가 {currencySymbol}{fmt(regular.prev_close)}</span>
                {regular.volume && <span>· 거래량 {Number(regular.volume).toLocaleString()}</span>}
                {data.per && <span>· PER {Number(data.per).toFixed(1)}x</span>}
                {data.dividend_yield && <span>· 배당 {(Number(data.dividend_yield) * 1).toFixed(2)}%</span>}
            </div>
        </div>
    );
}
