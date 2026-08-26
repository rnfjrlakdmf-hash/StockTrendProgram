"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Search, RefreshCw, Shield, BarChart3, Users, TrendingUp, TrendingDown,
    Activity, Zap, AlertTriangle, ChevronRight, X, Info, HelpCircle,
    Eye, EyeOff, LayoutDashboard, History, PieChart, LineChart as LineIcon,
    Coins, ArrowUpRight, AlertCircle
} from "lucide-react";
import AIDisclaimer from "@/components/AIDisclaimer";
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import TurboQuantIndicators from "@/components/TurboQuantIndicators";
import BlinkingPrice from "@/components/BlinkingPrice";
import KakaoRevenueAd from "@/components/KakaoRevenueAd";
import { getTickerFromKorean } from "@/lib/stockMapping";
import StockChatBoard from "@/components/StockChatBoard";
import { MessageSquare } from "lucide-react";

// [v4.9.5] Deep-Sector-Matrix Analysis Dashboard
function AnalysisContent() {
    const searchParams = useSearchParams();
    const urlSymbol = searchParams.get("symbol");

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [symbol, setSymbol] = useState("");

    // [Fix] URL 파라미터로 전달된 심볼 자동 로딩
    useEffect(() => {
        if (urlSymbol && urlSymbol !== symbol) {
            setSymbol(urlSymbol);
        }
    }, [urlSymbol]);
    const [activeTab, setActiveTab] = useState<"quant" | "financial" | "sector" | "peer" | "community">("quant");

    // Quant State
    const [quantData, setQuantData] = useState<any>(null);
    const [quantLoading, setQuantLoading] = useState(false);
    const [isTurbo, setIsTurbo] = useState(false);

    // Financial Analysis State
    const [financialData, setFinancialData] = useState<any>(null);
    const [financialLoading, setFinancialLoading] = useState(false);

    // Sector State
    const [sectorData, setSectorData] = useState<any>(null);
    const [sectorLoading, setSectorLoading] = useState(false);

    // Peer State
    const [peerSymbols, setPeerSymbols] = useState("005930,000660,035420");
    const [peerData, setPeerData] = useState<any>(null);
    const [peerLoading, setPeerLoading] = useState(false);

    // Global Stock Info (Price, Change, etc.)
    const [stockInfo, setStockInfo] = useState<any>(null);
    const [stockLoading, setStockLoading] = useState(false);

    // UI Helpers
    const [showEasy, setShowEasy] = useState(false);

    // [Cache & Autocomplete]
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (!symbol) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(symbol)}`);
                const json = await res.json();
                if (json.status === "success") setSearchResults(json.data);
            } catch (e) {}
        }, 200);
        return () => clearTimeout(timer);
    }, [symbol]);

    const ANALYSIS_CACHE: Record<string, any> = useMemo(() => ({}), []);

    const prefetchAnalysis = async (sym: string) => {
        const ticker = getTickerFromKorean(sym).toUpperCase();
        if (ANALYSIS_CACHE[ticker]?.quant) return;
        
        if (!ANALYSIS_CACHE[ticker]) ANALYSIS_CACHE[ticker] = {};
        
        try {
            fetch(`${API_BASE_URL}/api/analysis/pro/summary/${ticker}?v5=true`)
                .then(r => r.json()).then(j => { if (j.status === "success") ANALYSIS_CACHE[ticker].basic = j.data.stock_info; });
            fetch(`${API_BASE_URL}/api/analysis/quant/${ticker}`)
                .then(r => r.json()).then(j => { if (j.status === "success") { ANALYSIS_CACHE[ticker].quant = j.data; ANALYSIS_CACHE[ticker].turbo = j.turbo; } });
        } catch(e) {}
    };

    // [v1.9.0] 개별 분석 실행을 위한 타겟 심볼 상태들
    const [quantSymbol, setQuantSymbol] = useState("");
    const [finSymbol, setFinSymbol] = useState("");
    const [secSymbol, setSecSymbol] = useState("");
    const [activeSectorTab, setActiveSectorTab] = useState(0);
    const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

    // [v4.9.5] Sync Trigger
    useEffect(() => {
        if (!symbol || stockLoading) return;
        const targetSymbol = symbol.trim();
        if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(targetSymbol)) return;
        if (targetSymbol.length < 5) return;

        if (activeTab === "sector" && secSymbol !== targetSymbol) {
            handleGlobalSearch("sector");
        } else if (activeTab === "quant" && quantSymbol !== targetSymbol) {
            handleGlobalSearch("quant");
        } else if (activeTab === "financial" && finSymbol !== targetSymbol) {
            handleGlobalSearch("financial");
        }
    }, [activeTab, symbol]);

    const handleGlobalSearch = async (tab: string) => {
        let targetSymbol = symbol.trim();
        if (!targetSymbol) return;

        // [Speed Optimization] Use local mapping first
        const localTicker = getTickerFromKorean(targetSymbol);
        if (localTicker !== targetSymbol) {
            targetSymbol = localTicker;
            setSymbol(targetSymbol);
            console.log("[Search] Resolved instantly via local mapping:", targetSymbol);
        } else if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(targetSymbol)) {
            setStockLoading(true);
            try {
                const searchUrl = `${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(targetSymbol)}`;
                const res = await fetch(searchUrl);
                const json = await res.json();
                if (json.status === "success" && json.data && json.data.length > 0) {
                    targetSymbol = json.data[0].code;
                    setSymbol(targetSymbol);
                } else {
                    alert(`해당 종목('${targetSymbol}')을 찾을 수 없습니다.`);
                    setStockLoading(false);
                    return;
                }
            } catch (err) {
                console.error(err);
                setStockLoading(false);
                return;
            } finally {
                setStockLoading(false);
            }
        }

        switch (tab) {
            case "quant": setQuantSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchQuant(targetSymbol); break;
            case "financial": setFinSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchFinancial(targetSymbol); break;
            case "sector": 
                setSelectedSectorId(null);
                setSecSymbol(targetSymbol); 
                fetchBasicInfo(targetSymbol); 
                fetchSectorAnalysis(targetSymbol); 
                break;
        }
    };

    const fetchBasicInfo = async (sym: string, isBackground = false) => {
        if (!sym) return;
        if (!ANALYSIS_CACHE[sym]) ANALYSIS_CACHE[sym] = {};
        
        if (!isBackground && ANALYSIS_CACHE[sym].basic) {
            setStockInfo(ANALYSIS_CACHE[sym].basic);
            setStockLoading(false);
            
            // Background update
            fetch(`${API_BASE_URL}/api/analysis/pro/summary/${sym}?v5=true&t=${new Date().getTime()}`)
                .then(r => r.json()).then(j => {
                    if (j.status === "success") {
                        ANALYSIS_CACHE[sym].basic = j.data.stock_info;
                        setStockInfo(j.data.stock_info);
                    }
                });
            return;
        }
        
        if (!isBackground) setStockLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/pro/summary/${sym}?v5=true&t=${new Date().getTime()}`);
            const json = await res.json();
            if (json.status === "success") {
                ANALYSIS_CACHE[sym].basic = json.data.stock_info;
                setStockInfo(json.data.stock_info);
            }
        } catch (err) { console.error(err); }
        finally { if (!isBackground) setStockLoading(false); }
    };

    const fetchQuant = async (sym: string, isBackground = false) => {
        if (!sym) return;
        if (!ANALYSIS_CACHE[sym]) ANALYSIS_CACHE[sym] = {};

        if (!isBackground && ANALYSIS_CACHE[sym].quant) {
            setQuantData(ANALYSIS_CACHE[sym].quant);
            setIsTurbo(ANALYSIS_CACHE[sym].turbo);
            setQuantLoading(false);
            
            // Background Update
            fetch(`${API_BASE_URL}/api/analysis/quant/${sym}`)
                .then(r => r.json()).then(j => {
                    if (j.status === "success") {
                        ANALYSIS_CACHE[sym].quant = j.data;
                        ANALYSIS_CACHE[sym].turbo = j.turbo;
                        setQuantData(j.data);
                        setIsTurbo(j.turbo);
                    }
                });
            return;
        }

        if (!isBackground) {
            setQuantLoading(true);
            setIsTurbo(false);
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/quant/${sym}`);
            const json = await res.json();
            if (json.status === "success") {
                ANALYSIS_CACHE[sym].quant = json.data;
                ANALYSIS_CACHE[sym].turbo = json.turbo;
                setQuantData(json.data);
                if (json.turbo) setIsTurbo(true);
            }
        } catch (err) { console.error(err); }
        finally { if (!isBackground) setQuantLoading(false); }
    };

    const fetchFinancial = async (sym: string, isBackground = false) => {
        if (!sym) return;
        if (!ANALYSIS_CACHE[sym]) ANALYSIS_CACHE[sym] = {};

        if (!isBackground && ANALYSIS_CACHE[sym].financial) {
            setFinancialData(ANALYSIS_CACHE[sym].financial);
            setFinancialLoading(false);
            fetch(`${API_BASE_URL}/api/analysis/financial-health/${sym}`)
                .then(r => r.json()).then(j => {
                    if (j.status === "success") {
                        ANALYSIS_CACHE[sym].financial = j.data;
                        setFinancialData(j.data);
                    }
                });
            return;
        }

        if (!isBackground) setFinancialLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/financial-health/${sym}`);
            const json = await res.json();
            if (json.status === "success") {
                ANALYSIS_CACHE[sym].financial = json.data;
                setFinancialData(json.data);
            }
        } catch (err) { console.error(err); }
        finally { if (!isBackground) setFinancialLoading(false); }
    };

    const fetchSectorAnalysis = async (sym: string, sector_id: string | null = null, isBackground = false) => {
        if (!sym) return;
        if (!ANALYSIS_CACHE[sym]) ANALYSIS_CACHE[sym] = {};
        const cacheKey = sector_id || 'default';
        if (!ANALYSIS_CACHE[sym].sector) ANALYSIS_CACHE[sym].sector = {};

        if (!isBackground && ANALYSIS_CACHE[sym].sector[cacheKey]) {
            setSectorData(ANALYSIS_CACHE[sym].sector[cacheKey]);
            setSectorLoading(false);
            const activeId = Array.isArray(ANALYSIS_CACHE[sym].sector[cacheKey].compare_sectors) ? ANALYSIS_CACHE[sym].sector[cacheKey].compare_sectors.find((s: any) => s.selected)?.id : null;
            if (!selectedSectorId && activeId) setSelectedSectorId(activeId);
            
            // Background Update
            const url = new URL(`${API_BASE_URL}/api/analysis/sector-analysis/${sym}`, window.location.origin);
            if (sector_id) url.searchParams.append("sector_id", sector_id);
            url.searchParams.append("v", "4.9.5");
            url.searchParams.append("t", new Date().getTime().toString());
            fetch(url.toString()).then(r => r.json()).then(j => {
                if (j.status === "success") {
                    ANALYSIS_CACHE[sym].sector[cacheKey] = j.data;
                    setSectorData(j.data);
                }
            });
            return;
        }

        if (!isBackground) setSectorLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/api/analysis/sector-analysis/${sym}`, window.location.origin);
            if (sector_id) url.searchParams.append("sector_id", sector_id);
            url.searchParams.append("v", "4.9.5");
            url.searchParams.append("t", new Date().getTime().toString());

            const res = await fetch(url.toString());
            const json = await res.json();
            if (json.status === "success") {
                ANALYSIS_CACHE[sym].sector[cacheKey] = json.data;
                setSectorData(json.data);
                const activeId = Array.isArray(json.data.compare_sectors) ? json.data.compare_sectors.find((s: any) => s.selected)?.id : null;
                if (!selectedSectorId && activeId) setSelectedSectorId(activeId);
            }
        } catch (err) {
            console.error(err);
            setSectorData({ error: "네트워크 통신 지연으로 섹터 분석 데이터를 불러오지 못했습니다. 데이터 갱신 버튼을 눌러 다시 시도해주세요." });
        } finally { 
            if (!isBackground) setSectorLoading(false); 
        }
    };

     const fetchPeer = async () => {
        if (!peerSymbols) return;
        setPeerLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/peer-compare?symbols=${encodeURIComponent(peerSymbols)}`);
            const json = await res.json();
            if (json.status === "success") {
                setPeerData(json);
            } else {
                setPeerData({ status: "error", message: json.message || "동종 업계 비교 데이터를 불러오는 도중 오류가 발생했습니다." });
            }
        } catch (err: any) { 
            console.error(err); 
            setPeerData({ status: "error", message: err.message || "서버 통신에 실패했습니다. 종목코드를 다시 확인해 주세요." });
        }
        finally { setPeerLoading(false); }
    };

    const getGradeStyle = (grade: string) => {
        switch (grade) {
            case "S": return "from-yellow-400 to-amber-500 text-black";
            case "A": return "from-green-500 to-emerald-500 text-white";
            case "B": return "from-blue-500 to-indigo-500 text-white";
            case "C": return "from-orange-500 to-amber-600 text-white";
            case "D": return "from-red-500 to-rose-600 text-white";
            default: return "from-gray-500 to-gray-600 text-white";
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-blue-400";
        if (score >= 40) return "text-yellow-400";
        return "text-red-400";
    };

    const RadarChart = ({ factors }: { factors: any }) => {
        const keys = ["value", "growth", "momentum", "quality", "stability"];
        const labels = ["가치 (Value)", "성장 (Growth)", "모멘텀 (Momentum)", "수익성 (Profit)", "안정성 (Safety)"];
        const cx = 150, cy = 150, r = 100;
        const getPoint = (index: number, score: number) => {
            const angle = (Math.PI * 2 * index / 5) - Math.PI / 2;
            const dist = (score / 100) * r;
            return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
        };
        const gridLevels = [20, 40, 60, 80, 100];
        return (
            <div className="relative py-2">
                <svg viewBox="0 0 300 300" className="w-full max-w-[280px] md:max-w-xs mx-auto drop-shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                    <defs>
                        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.15" />
                        </linearGradient>
                    </defs>
                    {gridLevels.map(level => (
                        <polygon key={level} points={keys.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    ))}
                    {keys.map((_, i) => { const p = getPoint(i, 100); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />; })}
                    <polygon points={keys.map((k, i) => { const p = getPoint(i, factors?.[k]?.score || 0); return `${p.x},${p.y}`; }).join(" ")} fill="url(#radarGrad)" stroke="#818cf8" strokeWidth="2.5" />
                    {keys.map((k, i) => { const p = getPoint(i, factors?.[k]?.score || 0); return <circle key={k} cx={p.x} cy={p.y} r="5" fill="#a5b4fc" stroke="#1e1b4b" strokeWidth="2" />; })}
                    {keys.map((k, i) => { const p = getPoint(i, 125); return <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#d1d5db" fontSize="10.5" fontWeight="700"> {labels[i]} </text>; })}
                </svg>
            </div>
        );
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen pb-20 text-white bg-zinc-950 notranslate" translate="no">
            <Header title="종목 퀀트 정밀 진단" subtitle="재무·가치·모멘텀 5대 팩터 심층 진단" />

            <div className="max-w-5xl mx-auto px-4 space-y-6 pt-4">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="relative group max-w-2xl mx-auto w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                        <input type="text" placeholder="종목명 또는 종목코드 입력 (예: 삼성전자, 005930, AAPL)"
                            className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-base md:text-lg font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-xl"
                            value={symbol}
                            onChange={(e) => {
                                setSymbol(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => setShowResults(true)}
                            onBlur={() => setTimeout(() => setShowResults(false), 200)}
                            onKeyDown={e => { if (e.key === "Enter") handleGlobalSearch(activeTab); }}
                        />
                        {/* [Autocomplete Dropdown] */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                {searchResults.map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        onMouseEnter={() => prefetchAnalysis(item.symbol)}
                                        onClick={() => {
                                            setSymbol(item.symbol);
                                            setShowResults(false);
                                            let targetSymbol = item.symbol;
                                            switch (activeTab) {
                                                case "quant": setQuantSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchQuant(targetSymbol); break;
                                                case "financial": setFinSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchFinancial(targetSymbol); break;
                                                case "sector": 
                                                    setSelectedSectorId(null);
                                                    setSecSymbol(targetSymbol); 
                                                    fetchBasicInfo(targetSymbol); 
                                                    fetchSectorAnalysis(targetSymbol); 
                                                    break;
                                            }
                                        }}
                                        className="px-4 py-3 hover:bg-zinc-800 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-white text-sm">{item.name}</span>
                                            <span className="text-xs text-gray-500 font-mono mt-0.5">{item.symbol}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center mt-3 px-1">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">종목 선택 후 하단 탭별 정밀 분석 데이터를 확인하세요</p>
                        <span className="bg-indigo-500/10 text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                            PRO QUANT DEEP SCAN
                        </span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
                    <div className="flex-1 w-full">
                        {stockInfo && (
                            <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    {/* Left: Stock info & Price */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">{stockInfo.name}</h2>
                                            <span className="text-xs font-mono font-bold bg-white/10 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10">{stockInfo.symbol}</span>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-baseline gap-3">
                                            <BlinkingPrice 
                                                price={stockInfo.price || "---"} 
                                                className={`text-4xl md:text-5xl font-black font-mono tracking-tighter ${
                                                    (parseFloat(String(stockInfo.change_rate || "0")) > 0) ? "text-rose-500" : 
                                                    (parseFloat(String(stockInfo.change_rate || "0")) < 0) ? "text-blue-400" : 
                                                    "text-white"
                                                }`} 
                                            />
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {/* Regular Market */}
                                                {(() => {
                                                    const rawRateStr = String(stockInfo.change_rate || stockInfo.final_labeled_change || stockInfo.display_change || stockInfo.change || "0");
                                                    const isPos = rawRateStr.includes('+') || (!rawRateStr.includes('-') && parseFloat(rawRateStr.replace(/[^0-9.-]/g, "")) > 0);
                                                    const isNeg = rawRateStr.includes('-') || parseFloat(rawRateStr.replace(/[^0-9.-]/g, "")) < 0;
                                                    
                                                    const containerClass = isPos ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : 
                                                                           isNeg ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : 
                                                                           "bg-white/5 border-gray-500/20 text-gray-400";
                                                                            
                                                    const badgeClass = isPos ? "bg-rose-500 text-white" : 
                                                                       isNeg ? "bg-blue-500 text-white" : 
                                                                       "bg-zinc-800 text-gray-400";

                                                    let valStr = String(stockInfo.change_val || "0").replace(/[^0-9.]/g, "");
                                                    let valNum = Number(valStr);
                                                    if (isNaN(valNum)) valNum = 0;
                                                    
                                                    let rawRate = rawRateStr.replace(/[^0-9.]/g, "");
                                                    let labelMatch = String(stockInfo.final_labeled_change || stockInfo.change || "").match(/\[(.*?)\]/);
                                                    let marketLabel = labelMatch ? labelMatch[1] : "정규";

                                                    return (
                                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl shadow-sm border ${containerClass}`}>
                                                            <span className={`text-[10px] font-black mr-0.5 px-1.5 py-0.5 rounded ${badgeClass}`}>{marketLabel}</span>
                                                            <span className="text-base md:text-lg font-black font-mono">
                                                                {isPos ? '▲ ' : isNeg ? '▼ ' : ''}{valNum.toLocaleString()}
                                                            </span>
                                                            <span className="text-xs md:text-sm font-bold opacity-80 font-mono">
                                                                ({isPos ? '+' : isNeg ? '-' : ''}{rawRate}%)
                                                            </span>
                                                        </div>
                                                    );
                                                })()}

                                                {/* After-Hours Market */}
                                                {stockInfo.details?.nxt_data && (
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border ${
                                                        (() => {
                                                            const rawNxtPct = String(stockInfo.details.nxt_data.change_pct || "0");
                                                            const isPos = rawNxtPct.includes('+') || (!rawNxtPct.includes('-') && parseFloat(rawNxtPct.replace(/[^0-9.-]/g, "")) > 0);
                                                            const isNeg = rawNxtPct.includes('-') || parseFloat(rawNxtPct.replace(/[^0-9.-]/g, "")) < 0;
                                                            return isPos ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : isNeg ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-gray-500/10 border-gray-500/30 text-gray-400";
                                                        })()
                                                    }`}>
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300">NXT야간</span>
                                                        <span className="text-sm font-bold font-mono">
                                                            {(() => {
                                                                const rate = parseFloat(String(stockInfo.details.nxt_data.change_pct).replace(/[^0-9.-]/g, ""));
                                                                const isPos = rate > 0;
                                                                const isNeg = rate < 0;
                                                                const raw = String(stockInfo.details.nxt_data.change_pct).replace(/[^0-9.]/g, "");
                                                                return `(${isPos ? '+' : isNeg ? '-' : ''}{raw}%)`;
                                                            })()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Key Summary Stat Cards */}
                                    <div className="flex flex-wrap md:flex-nowrap gap-3 text-left">
                                        <div className="bg-zinc-950/70 px-4 py-3 rounded-2xl border border-white/10 min-w-[120px]">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">시가총액</p>
                                            <p className="text-sm md:text-base font-black text-gray-200 font-mono">{stockInfo.market_cap_str || stockInfo.market_cap || "N/A"}</p>
                                        </div>
                                        {quantData && (
                                            <>
                                                <div className="bg-zinc-950/70 px-4 py-3 rounded-2xl border border-white/10 min-w-[100px]">
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">종합 점수</p>
                                                    <p className={`text-xl font-black font-mono ${getScoreColor(quantData.total_score)}`}>{quantData.total_score}점</p>
                                                </div>
                                                <div className={`px-5 py-3 rounded-2xl bg-gradient-to-br ${getGradeStyle(quantData.grade)} flex flex-col justify-center min-w-[80px] shadow-lg`}>
                                                    <p className="text-[10px] opacity-75 text-black font-bold uppercase tracking-wider mb-0.5">등급</p>
                                                    <p className="text-2xl font-black text-black font-mono leading-none">{quantData.grade}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {stockInfo.description && (
                                    <div className="mt-5 pt-4 border-t border-white/10">
                                        <div className="text-[11px] text-gray-400 uppercase font-black mb-1.5 flex items-center gap-2">
                                            <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                                            기업 개요
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed max-h-20 overflow-y-auto pr-2 custom-scrollbar">
                                            {stockInfo.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Guide Mode Toggle */}
                    <button onClick={() => setShowEasy(!showEasy)}
                        className={`flex md:flex-col items-center justify-center gap-2 px-5 py-4 rounded-3xl font-black text-xs transition-all shadow-xl border self-stretch md:self-auto ${showEasy ? "bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/30" : "bg-zinc-900/90 border-white/10 text-gray-400 hover:bg-zinc-800 hover:text-white"}`}>
                        <HelpCircle className={`w-5 h-5 ${showEasy ? "animate-bounce" : ""}`} />
                        <div className="text-center leading-tight">
                            <p className="text-[9px] uppercase tracking-widest opacity-70 mb-0.5">Guide Mode</p>
                            <p className="font-bold">{showEasy ? "가이드 ON" : "가이드 OFF"}</p>
                        </div>
                    </button>
                </div>

                {/* Kakao AdFit Placement (Main Analysis In-Feed) */}
                <KakaoRevenueAd type="feed" />

                <div className="sticky top-4 z-40 flex justify-center py-2 bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
                    <div className="flex gap-1.5 bg-zinc-900/80 p-1.5 rounded-xl w-full max-w-2xl border border-white/5">
                        {[
                            { id: "quant", label: "퀀트 정밀진단", icon: Zap },
                            { id: "financial", label: "재무 건강도", icon: Shield },
                            { id: "sector", label: "섹터 분석", icon: PieChart },
                            { id: "peer", label: "동종비교", icon: Users },
                            { id: "community", label: "종목 토론방", icon: MessageSquare }
                        ].map((tab: any) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-[400px] mt-4">
                    {activeTab === "quant" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-zinc-900/80 p-4 rounded-2xl border border-white/10 mb-4 shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl"><Zap className="w-5 h-5 text-amber-400" /></div>
                                    <div>
                                        <h3 className="font-black text-white text-sm md:text-base">5축 퀀트 정밀 진단</h3>
                                        <p className="text-xs text-gray-400">5대 핵심 팩터(가치·성장·모멘텀·수익성·안정성) 종합 스캔</p>
                                    </div>
                                </div>
                                <button onClick={() => handleGlobalSearch("quant")}
                                    className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5">
                                    <RefreshCw className={`w-3.5 h-3.5 ${quantLoading ? "animate-spin text-indigo-400" : ""}`} />
                                    <span>진단 새로고침</span>
                                </button>
                            </div>

                            {quantLoading ? (
                                <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-white/5"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-3" /><p className="text-gray-400 text-xs font-bold">5대 퀀트 팩터 지표 연산 중...</p></div>
                            ) : quantData ? (
                                quantData.error ? (
                                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 text-center text-rose-400">
                                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-rose-500 animate-bounce" />
                                        <h3 className="text-lg font-bold mb-2">퀀트 분석 데이터를 불러올 수 없습니다</h3>
                                        <p className="text-xs opacity-80 leading-relaxed mb-4">
                                            {quantData.error}
                                        </p>
                                        <button onClick={() => handleGlobalSearch("quant")}
                                            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                            다시 시도
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900/90 to-zinc-950 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradeStyle(quantData.grade)} flex items-center justify-center text-2xl font-black text-black shadow-xl`}>
                                                        {quantData.grade || "N/A"}
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <h3 className="text-lg md:text-xl font-black text-white">5축 퀀트 정밀 종합 진단</h3>
                                                            {quantData.tags && quantData.tags.map((tag: string, idx: number) => (
                                                                <span key={idx} className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs text-gray-400">각 팩터별 백분위 점수 및 공시 세부 지표 분석</p>
                                                    </div>
                                                </div>
                                                <div className="bg-zinc-950/80 px-5 py-3 rounded-2xl border border-white/10 text-right md:text-right">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Quant Score</p>
                                                    <span className={`text-3xl font-black font-mono ${getScoreColor(quantData.total_score || 0)}`}>{quantData.total_score || 0}<span className="text-sm font-bold text-gray-500 ml-0.5">점</span></span>
                                                </div>
                                            </div>

                                            {/* Radar Chart */}
                                            <RadarChart factors={quantData.factors} />

                                            {/* 5-Factor Score Cards */}
                                            <div className="mt-8 pt-6 border-t border-white/10">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                                                    {Object.entries(quantData.factors || {}).map(([key, f]: any) => {
                                                        const factorGuide: Record<string, string> = {
                                                             "value": "현재 주가가 벌고 있는 돈이나 재산에 비해 싼지 비싼지를 나타냅니다.",
                                                             "growth": "작년 대비 매출과 이익이 얼마나 증가하며 외형이 성장하는지 측정합니다.",
                                                             "momentum": "시장 참여자들의 관심과 주가 상승 흐름의 강도를 수치화합니다.",
                                                             "quality": "투입된 자본 대비 얼마나 효율적인 알짜 이익을 냈는지 분석합니다.",
                                                             "stability": "부채 부담과 금융 비용을 감당할 재무적 안전판을 검증합니다."
                                                        };
                                                        return (
                                                            <div key={key} className={`flex flex-col justify-between p-4 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 transition-all shadow-md ${showEasy ? "ring-1 ring-indigo-500/30" : ""}`}>
                                                                <div>
                                                                    <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">{f?.label || ""}</span>
                                                                    <div className="flex items-baseline gap-1 my-2">
                                                                        <span className={`text-2xl md:text-3xl font-black font-mono ${getScoreColor(f?.score || 0)}`}>{f?.score || 0}</span>
                                                                        <span className="text-xs font-bold text-gray-500">/100</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {showEasy && (
                                                                    <p className="text-[10px] text-indigo-300 leading-snug my-2 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                                                                        {factorGuide[key] || "팩터별 세부 지표를 분석 중입니다."}
                                                                    </p>
                                                                )}
 
                                                                <div className="space-y-1 pt-2 border-t border-white/5 mt-1">
                                                                    {Object.entries(f?.metrics || {}).map(([mk, mv]: any) => (
                                                                        <div key={mk} className="text-[10px] flex items-center justify-between gap-1">
                                                                            <span className="text-gray-400 truncate">{mk}</span>
                                                                            <span className="text-gray-200 font-bold font-mono">{String(mv)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border border-white/10 rounded-3xl overflow-hidden shadow-2xl bg-zinc-900/60">
                                            <TurboQuantIndicators symbol={quantSymbol || symbol} showEasy={showEasy} />
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-16 px-4 bg-zinc-900/50 rounded-3xl border border-dashed border-white/10 max-w-2xl mx-auto">
                                    <Activity className="w-12 h-12 text-indigo-400/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">5축 퀀트 정밀 진단 대기 중</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                        상단 검색창에 종목명을 입력하시면 5대 핵심 팩터 종합 분석 결과가 제공됩니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "financial" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-zinc-900/80 p-4 rounded-2xl border border-white/10 mb-4 shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"><Shield className="w-5 h-5 text-emerald-400" /></div>
                                    <div>
                                        <h3 className="font-black text-white text-sm md:text-base">기업 재무 건전성 및 펀더멘털 정밀 진단</h3>
                                        <p className="text-xs text-gray-400">Altman Z-Score(부도위험) & Piotroski F-Score(9대 기초체력) 융합 분석</p>
                                    </div>
                                </div>
                                <button onClick={() => handleGlobalSearch("financial")}
                                    className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5">
                                    <RefreshCw className={`w-3.5 h-3.5 ${financialLoading ? "animate-spin text-emerald-400" : ""}`} />
                                    <span>진단 새로고침</span>
                                </button>
                            </div>
                            {financialLoading ? (
                                <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-white/5"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-emerald-400 mb-3" /><p className="text-gray-400 text-xs font-bold">재무 건전성 지표 분석 및 채점 중...</p></div>
                            ) : financialData ? (
                                financialData.error ? (
                                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 text-center text-rose-400">
                                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-rose-500 animate-bounce" />
                                        <h3 className="text-lg font-bold mb-2">재무 분석 데이터를 불러올 수 없습니다</h3>
                                        <p className="text-xs opacity-80 leading-relaxed mb-4">
                                            {financialData.error}
                                        </p>
                                        <button onClick={() => handleGlobalSearch("financial")}
                                            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                            다시 시도
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        {showEasy && (
                                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                                                <div className="bg-emerald-500/20 p-2 rounded-lg h-fit">
                                                    <HelpCircle className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-emerald-400 mb-1">가이드 모드 활성화</h4>
                                                    <p className="text-xs text-gray-300 leading-relaxed">
                                                        복잡한 재무제표 용어를 기업의 '기초 체력'과 '위기 방어력' 관점에서 알기 쉽게 설명해 드립니다.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Main Health Card */}
                                        <div className="bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-zinc-950 border border-emerald-500/30 rounded-3xl p-6 md:p-8 shadow-2xl">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradeStyle(financialData.grade)} flex items-center justify-center text-3xl font-black text-black shadow-xl`}>
                                                        {financialData.grade || "N/A"}
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <h2 className="text-lg md:text-xl font-black text-white">안전성 및 재무 건강도 진단</h2>
                                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                                                                FINANCIAL HEALTH
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400">종목의 기초 체력, 부도 위험도 및 이익 체질 정밀 스캔</p>
                                                    </div>
                                                </div>
                                                <div className="bg-zinc-950/80 px-4 py-2.5 rounded-2xl border border-white/10 text-right md:text-right">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">HEALTH STATUS</p>
                                                    <p className="text-sm font-black text-emerald-400 font-mono">
                                                        {financialData.grade === 'S' || financialData.grade === 'A' ? '최상위 안정권 (Very Safe)' : financialData.grade === 'B' ? '양호 안정권 (Stable)' : '모니터링 필요 (Caution)'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Dual Charts */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                <div className="bg-zinc-950/80 rounded-2xl p-5 border border-white/10 shadow-lg">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="w-4 h-4 text-emerald-400" />
                                                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">3개년 안전성 추이</h4>
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 font-bold">부채비율 vs 당좌비율</span>
                                                    </div>
                                                    <div className="h-[200px] w-full">
                                                        {financialData?.charts?.stability && Array.isArray(financialData.charts.stability) && financialData.charts.stability.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={financialData.charts.stability} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                                                    <XAxis dataKey="year" stroke="#9ca3af" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} />
                                                                    <YAxis stroke="#9ca3af" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                                                    <Tooltip 
                                                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '11px' }} 
                                                                        formatter={(value: any, name: any) => [`${value}%`, name]}
                                                                    />
                                                                    <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                                                    <Line type="monotone" name="부채비율" dataKey="부채비율" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} />
                                                                    <Line type="monotone" name="당좌비율" dataKey="당좌비율" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        ) : <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">No Trend Data</div>}
                                                    </div>
                                                </div>

                                                <div className="bg-zinc-950/80 rounded-2xl p-5 border border-white/10 shadow-lg">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <TrendingUp className="w-4 h-4 text-indigo-400" />
                                                            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">3개년 수익 효율 추이</h4>
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 font-bold">ROE vs 영업이익률</span>
                                                    </div>
                                                    <div className="h-[200px] w-full">
                                                        {financialData?.charts?.profitability && Array.isArray(financialData.charts.profitability) && financialData.charts.profitability.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={financialData.charts.profitability} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                                                    <XAxis dataKey="year" stroke="#9ca3af" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} />
                                                                    <YAxis stroke="#9ca3af" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                                                    <Tooltip 
                                                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '11px' }} 
                                                                        formatter={(value: any, name: any) => [`${value}%`, name]}
                                                                    />
                                                                    <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                                                    <Line type="monotone" name="ROE" dataKey="ROE" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} />
                                                                    <Line type="monotone" name="영업이익률" dataKey="영업이익률" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        ) : <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">No Trend Data</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Z-Score & F-Score Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-zinc-950/80 rounded-2xl p-5 border border-white/10 hover:border-emerald-500/30 transition-all shadow-md">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                                📐 ALTMAN Z-SCORE
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-300">부도 위험도 모델</span>
                                                        </div>
                                                        <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                                                            financialData?.z_score?.color === "green" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : 
                                                            financialData?.z_score?.color === "yellow" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : 
                                                            "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                                        }`}>
                                                            {financialData?.z_score?.zone ?? "안전"} ZONE
                                                        </span>
                                                    </div>

                                                    <div className="flex items-baseline gap-3 my-2">
                                                        <span className="text-3xl md:text-4xl font-black font-mono text-white">{financialData?.z_score?.value ?? "N/A"}</span>
                                                        <span className="text-xs font-bold text-gray-400">기준치: 3.0 이상 (강철 체력)</span>
                                                    </div>

                                                    <p className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-white/5">
                                                        {financialData?.z_score?.value >= 3.0 ? "✅ 2년 내 파산 위험이 극히 낮으며 재무 건전성이 매우 견고한 상태입니다." : "⚠️ 부채 비율 및 유동성 구조에 대한 지속적인 관찰이 필요합니다."}
                                                    </p>
                                                </div>

                                                <div className="bg-zinc-950/80 rounded-2xl p-5 border border-white/10 hover:border-indigo-500/30 transition-all shadow-md">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                                                🏋️ PIOTROSKI F-SCORE
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-300">9대 펀더멘털 평가</span>
                                                        </div>
                                                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                            {financialData?.f_score?.value >= 8 ? '최우수 (Top Tier)' : financialData?.f_score?.value >= 6 ? '우수 (Good)' : '보통 (Moderate)'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-baseline gap-2 my-2">
                                                        <span className="text-3xl md:text-4xl font-black font-mono text-white">{financialData?.f_score?.value ?? "N/A"}</span>
                                                        <span className="text-base font-bold text-gray-500 font-mono">/ 9 점</span>
                                                    </div>

                                                    <p className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-white/5">
                                                        수익성(4점), 재무 레버리지(3점), 영업 효율성(2점) 전수 평가 결과 기초체력이 우수합니다.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* F-Score Details */}
                                        <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 shadow-xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-black text-sm md:text-base text-white flex items-center gap-2">
                                                    <span>Piotroski F-Score 9대 정밀 검진 항목</span>
                                                </h4>
                                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                                                    {financialData?.f_score?.value ?? 0} / 9 항목 통과
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                {(Array.isArray(financialData?.f_score?.details) ? financialData.f_score.details : []).map((d: string, i: number) => {
                                                    const isFail = d.includes('미달') || d.includes('낮음') || d.includes('악화') || d.includes('적자');
                                                    return (
                                                        <div key={i} className={`text-xs py-2.5 px-3.5 rounded-xl border flex items-center justify-between gap-2 font-medium ${
                                                            isFail 
                                                                ? "bg-rose-500/10 border-rose-500/20 text-rose-300" 
                                                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                                        }`}>
                                                            <div className="flex items-center gap-2 truncate">
                                                                <span className={`text-xs font-black ${isFail ? "text-rose-400" : "text-emerald-400"}`}>
                                                                    {isFail ? "✕" : "✓"}
                                                                </span>
                                                                <span className="truncate">{d}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                                                isFail ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                                                            }`}>
                                                                {isFail ? "미달" : "통과"}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Key Ratios */}
                                        <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 shadow-xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="font-black text-sm md:text-base text-white">핵심 투자 및 가치평가 재무 비율</h4>
                                                    <p className="text-xs text-gray-400">공시 재무제표 기반 주요 밸류에이션 및 수익·안정성 지표</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {Object.entries(financialData?.ratios && typeof financialData.ratios === 'object' ? financialData.ratios : {}).map(([k, v]: any) => {
                                                    const getExplanation = (key: string) => {
                                                        if (key === "PER") return "주가수익비율";
                                                        if (key === "PBR") return "주가순자산비율";
                                                        if (key === "ROE") return "자기자본이익률";
                                                        if (key === "부채비율") return "타인자본 의존도";
                                                        if (key === "유동비율") return "단기 채무상환력";
                                                        if (key === "영업이익률") return "영업활동 수익성";
                                                        if (key === "매출총이익률") return "원가 마진율";
                                                        if (key === "자산회전율") return "자산 활용 효율";
                                                        return "";
                                                    };
                                                    return (
                                                        <div key={k} className="bg-zinc-950/80 rounded-2xl p-4 border border-white/10 transition-all hover:border-emerald-500/30 shadow-md flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-wider">{k}</p>
                                                                    <span className="text-[10px] text-gray-500">{getExplanation(k)}</span>
                                                                </div>
                                                                <p className="text-lg md:text-xl font-black text-white font-mono">{String(v)}</p>
                                                            </div>
                                                            {showEasy && (
                                                                <p className="text-[10px] text-emerald-400/80 mt-2 font-medium leading-tight pt-1.5 border-t border-white/5">
                                                                    {k === "PER" && "순이익 대비 현재 주가 배수"}
                                                                    {k === "PBR" && "순자산 대비 현재 주가 배수"}
                                                                    {k === "ROE" && "내 돈으로 창출한 이익률"}
                                                                    {k === "부채비율" && "100% 이하면 매우 우수"}
                                                                    {k === "유동비율" && "200% 이상 권장"}
                                                                    {k === "영업이익률" && "매출 중 순수 영업이익"}
                                                                    {k === "매출총이익률" && "원가 제외 마진"}
                                                                    {k === "자산회전율" && "자산 대비 매출 창출력"}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-16 px-4 bg-zinc-900/50 rounded-3xl border border-dashed border-white/10 max-w-2xl mx-auto">
                                    <Shield className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">재무 건전성 및 실적 분석 대기 중</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                        종목코드를 입력하시면, 기업의 매출액, 영업이익, 순이익 흐름뿐만 아니라 ROE, 부채비율, 당좌비율 등 핵심 재무비율 지표를 한눈에 확인할 수 있습니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "sector" && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-900/80 p-6 rounded-3xl border border-white/10 shadow-2xl">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl"><PieChart className="w-5 h-5 text-rose-400" /></div>
                                        <h3 className="text-xl font-black text-white">동종 업종 및 섹터 매트릭스 비교</h3>
                                    </div>
                                    <p className="text-gray-400 text-xs font-medium">대상 종목 vs 섹터 평균 vs 시장 지수 (17개 핵심 지표 벤치마킹)</p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <select
                                        value={selectedSectorId || (Array.isArray(sectorData?.compare_sectors) ? sectorData.compare_sectors : []).find((s: any) => s.selected)?.id || ""}
                                        onChange={(e) => { const newId = e.target.value; setSelectedSectorId(newId); fetchSectorAnalysis(secSymbol || symbol, newId); }}
                                        className="flex-1 md:flex-none bg-zinc-950 border border-white/15 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-rose-500 min-w-[200px] cursor-pointer shadow-lg"
                                    >
                                        {(Array.isArray(sectorData?.compare_sectors) ? sectorData.compare_sectors : []).map((s: any) => <option key={s.id} value={s.id} className="bg-zinc-900 text-white">{s.name}{s.sector ? ` [${s.sector}]` : ''}</option>)}
                                    </select>
                                    <button onClick={() => handleGlobalSearch("sector")} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 text-white flex items-center gap-1.5 whitespace-nowrap">
                                        <RefreshCw className={`w-3.5 h-3.5 ${sectorLoading ? "animate-spin text-rose-400" : ""}`} />
                                        <span>섹터 갱신</span>
                                    </button>
                                </div>
                            </div>

                            {sectorLoading ? (
                                <div className="text-center py-32"><RefreshCw className="w-16 h-16 animate-spin mx-auto text-red-500 mb-6 opacity-50" /><p className="text-gray-400 font-black tracking-widest uppercase">Fetching 17-Factor Deep Matrix...</p></div>
                            ) : sectorData ? (
                                sectorData.error ? (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center text-red-400">
                                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500 animate-bounce" />
                                        <h3 className="text-lg font-bold mb-2">섹터 분석 데이터를 불러올 수 없습니다</h3>
                                        <p className="text-xs opacity-80 leading-relaxed mb-4">
                                            {sectorData.error}
                                        </p>
                                        <button onClick={() => handleGlobalSearch("sector")}
                                            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                            다시 시도
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {showEasy && (
                                            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                                                <div className="bg-red-500/20 p-2 rounded-lg h-fit">
                                                    <HelpCircle className="w-5 h-5 text-red-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-red-400 mb-1">초보자 가이드 모드 활성화됨 (섹터 매트릭스)</h4>
                                                    <p className="text-xs text-gray-300 leading-relaxed">
                                                        현재 종목이 속한 산업(섹터) 전체 평균 및 코스피/코스닥 시장 지수와 성적을 나란히 비교해 드립니다. 이를 통해 이 회사가 업계 평균보다 장사를 잘하고 있는지 직관적으로 알 수 있습니다.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    {(() => {
                                        const sectorSections = [
                                            {
                                                group: "Value Analytics (가치 분석)",
                                                metrics: [
                                                    { key: "PER", label: "PER (배)" },
                                                    { key: "PBR", label: "PBR (배)" },
                                                    { key: "Fwd. 12M PER", label: "Fwd. 12M PER" },
                                                    { key: "Fwd. 12M PBR", label: "Fwd. 12M PBR" }
                                                ]
                                            },
                                            {
                                                group: "Growth Dynamics (성장성 분석)",
                                                metrics: [
                                                    { key: "매출액증가율", label: "매출액 증가율 (%)" },
                                                    { key: "영업이익증가율", label: "영업이익 증가율 (%)" },
                                                    { key: "순이익증가율", label: "순이익 증가율 (%)" }
                                                ]
                                            },
                                            {
                                                group: "Profitability Engine (수익성 분석)",
                                                metrics: [
                                                    { key: "ROE", label: "ROE (%)" },
                                                    { key: "ROA", label: "ROA (%)" },
                                                    { key: "매출총이익률", label: "매출총이익률 (%)" },
                                                    { key: "영업이익률", label: "영업이익률 (%)" },
                                                    { key: "순이익률", label: "순이익률 (%)" }
                                                ]
                                            },
                                            {
                                                group: "Stability & Returns (안정성 및 수익률)",
                                                metrics: [
                                                    { key: "부채비율", label: "부채비율 (%)" },
                                                    { key: "유동비율", label: "유동비율 (%)" },
                                                    { key: "배당수익률", label: "배당수익률 (%)" },
                                                    { key: "배당성향", label: "배당성향 (%)" },
                                                    { key: "주가수익률", label: "주가 수익률 (%)" }
                                                ]
                                            }
                                        ];
                                        return (
                                            <div className="space-y-6">
                                                <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                                                    {sectorSections.map((sec: any, idx: number) => (
                                                        <button 
                                                            key={idx}
                                                            onClick={() => setActiveSectorTab(idx)}
                                                            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSectorTab === idx ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-transparent text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                                        >
                                                            <span>{sec.group.split(' (')[1].replace(')', '')}</span>
                                                        </button>
                                                ))}
                                            </div>
                                            
                                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                                        <span>{sectorSections[activeSectorTab].group}</span>
                                                    </h3>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {(() => {
                                                        const visibleMetrics = sectorSections[activeSectorTab].metrics.filter((metric: any) => (sectorData.charts || {})[metric.key]);
                                                        if (visibleMetrics.length === 0) {
                                                            return (
                                                                <div className="col-span-full py-16 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                                                                    <div className="flex justify-center mb-4"><PieChart className="w-12 h-12 text-gray-600" /></div>
                                                                    <h3 className="text-gray-400 font-bold mb-2">데이터가 제공되지 않습니다</h3>
                                                                    <p className="text-gray-500 text-sm">해당 그룹(탭)의 섹터 분석 지표가 이 종목(또는 ETF)에는 제공되지 않습니다.<br/>다른 탭을 선택해 보세요.</p>
                                                                </div>
                                                            );
                                                        }
                                                        return visibleMetrics.map((metric: any) => {
                                                            const cat = (sectorData.charts || {})[metric.key];
                                                            return (
                                                        <div key={metric.key} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:scale-[1.01] hover:border-red-500/20 group shadow-2xl">
                                                            <div className="flex items-center justify-between mb-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-2.5 h-10 bg-red-600 rounded-full group-hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all" />
                                                                    <h3 className="text-xl font-black text-white tracking-tighter uppercase">{metric.label}</h3>
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[10px] font-black text-gray-500 uppercase mb-1 tracking-widest">Curr FY0</span>
                                                                    <span className="text-3xl font-black text-red-500 tabular-nums drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                                                        {(() => {
                                                                            const r = Array.isArray(cat.rows) ? cat.rows.find((r: any) => r.name === "내 종목") : null;
                                                                            if (!r) return "-";
                                                                            const hds = Array.isArray(cat.headers) ? cat.headers : [];
                                                                            const isEst = hds.some((h: string) => typeof h === 'string' && (h.includes('(E)') || h.includes('(A)')));
                                                                            const targetIdx = isEst && hds.length > 1 ? hds.length - 2 : hds.length - 1;
                                                                            const targetH = hds[targetIdx] || "";
                                                                            return r[targetH] ?? "-";
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            {showEasy && (
                                                                <div className="mb-6 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                                                    <p className="text-xs text-red-300 font-medium leading-relaxed italic">
                                                                        {(() => {
                                                                            const k = metric.key;
                                                                            if(k==="PER") return "현재 주가가 이익 대비 싼지 비싼지 알려주는 가성비 지표입니다. 업계 평균보다 낮으면 저평가, 높으면 고평가로 봅니다.";
                                                                            if(k==="PBR") return "회사 자산(재산) 대비 주가가 싼지 비싼지 보여줍니다. 보통 1 미만이면 자산가치보다 싸다고 봅니다.";
                                                                            if(k==="Fwd. 12M PER" || k==="Fwd. 12M PBR") return "1년 뒤 예상되는 실적을 기준으로 계산한 가성비 지표입니다. 미래의 떡상 여력을 볼 때 참고해요.";
                                                                            if(k==="매출액증가율") return "회사의 외형(물건 파는 스케일)이 얼마나 쑥쑥 크고 있는지 보여줍니다.";
                                                                            if(k==="영업이익증가율") return "물건 팔아서 남긴 순수익(마진)이 작년보다 얼마나 늘었는지 봅니다. 제일 중요한 성장성 지표예요!";
                                                                            if(k==="순이익증가율") return "세금 등 뗄 거 다 떼고 내 주머니에 최종적으로 남는 돈의 성장 속도입니다.";
                                                                            if(k==="ROE") return "내 돈(자본금)으로 1년간 얼마나 알짜 장사를 했는지 (가성비율) 보여줍니다. 높을수록 워렌 버핏이 좋아해요.";
                                                                            if(k==="ROA") return "빚까지 합친 전체 자산을 얼마나 부지런히 굴렸는지 보여주는 활동 마진율입니다.";
                                                                            if(k==="매출총이익률") return "물건 떼온 원가만 빼고 얼마나 마진을 크게 남겨먹는지 보여줍니다.";
                                                                            if(k==="영업이익률") return "1만원어치 팔아서 몇 천원을 진짜로 남기는지, 회사의 핵심 장사 실력입니다.";
                                                                            if(k==="순이익률") return "최종 세금까지 다 빼고 순수하게 남은 진짜 찐 마진율입니다.";
                                                                            if(k==="부채비율") return "내 돈 대비 빌린 돈(빚)이 얼마나 많은지 봅니다. 100% 이하가 안전하며, 섹터 평균보다 낮으면 튼튼합니다.";
                                                                            if(k==="유동비율") return "1년 안에 갚아야 할 빚보다 당장 현금화 가능한 자산이 많은지 봅니다. 높을수록 부도 위험이 낮습니다.";
                                                                            if(k==="배당수익률") return "주식을 들고만 있어도 통장에 꽂히는 배당금의 이자율 같은 개념입니다.";
                                                                            if(k==="배당성향") return "회사가 벌어들인 돈 중 몇 %를 주주들에게 착하게 나눠주는지 보여줍니다.";
                                                                            if(k==="주가수익률") return "특정 기간 동안 실제로 주가가 얼마나 올랐는지(혹은 떨어졌는지) 보여줍니다.";
                                                                            return "해당 지표의 섹터 평균 및 시장 지수와의 비교를 보여줍니다.";
                                                                        })()}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="h-[300px] w-full">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={cat.chart_data || []}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                                        <XAxis dataKey="period" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} dy={15} />
                                                                        <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} width={40} />
                                                                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '24px', fontSize: '11px', color: '#fff', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }} itemStyle={{ fontWeight: '900', padding: '4px 0' }} cursor={{ stroke: '#ffffff10', strokeWidth: 1 }} />
                                                                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', paddingBottom: '40px' }} />
                                                                        <Line type="monotone" dataKey="내 종목" stroke="#ef4444" strokeWidth={6} dot={{ r: 6, strokeWidth: 3, fill: '#ef4444', stroke: '#000' }} activeDot={{ r: 10, strokeWidth: 0 }} animationDuration={2500} />
                                                                        <Line type="monotone" dataKey="섹터 평균" stroke="#10b981" strokeWidth={2.5} strokeDasharray="8 4" dot={{ r: 4, fill: '#10b981' }} animationDuration={2500} />
                                                                        <Line type="monotone" dataKey="시장 지수" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="4 8" dot={{ r: 4, fill: '#3b82f6' }} animationDuration={2500} />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </div>
                                                    );
                                                    });
                                                })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                    })()}
                                </div>
                                )
                            ) : (
                                <div className="text-center py-20 px-4 bg-white/5 rounded-[3rem] border border-dashed border-white/10 max-w-3xl mx-auto">
                                    <PieChart className="w-16 h-16 text-red-500/20 mx-auto mb-4" />
                                    <h3 className="text-xl font-black tracking-widest text-white mb-2 uppercase">Sector Matrix Stand-By</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        종목코드를 입력하시면 해당 기업이 속한 섹터(산업군) 내에서의 상대적인 위치와 경쟁력을 분석합니다. 
                                        동일 산업군 내에서의 시가총액 순위, 평균 PER/PBR 비교, 섹터 트렌드 점수 등을 종합적으로 계산하여,
                                        개별 종목이 시장 전체 흐름 속에서 어떤 위상을 차지하고 있는지 입체적으로 조망할 수 있습니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "community" && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <StockChatBoard symbol={secSymbol || finSymbol || quantSymbol || symbol} />
                        </div>
                    )}
                    
                    {activeTab === "peer" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-zinc-900/80 p-4 rounded-2xl border border-white/10 mb-4 shadow-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl"><Users className="w-5 h-5 text-purple-400" /></div>
                                    <div>
                                        <h3 className="font-black text-white text-sm md:text-base">동종 업계 및 라이벌 피어(Peer) 비교 분석</h3>
                                        <p className="text-xs text-gray-400">동일 섹터 경쟁사 간 밸류에이션(PER·PBR), 수익성(ROE·영업이익률), 성장성 다자간 비교</p>
                                    </div>
                                </div>
                                <button onClick={fetchPeer} className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5">
                                    <RefreshCw className={`w-3.5 h-3.5 ${peerLoading ? "animate-spin text-purple-400" : ""}`} />
                                    <span>비교 새로고침</span>
                                </button>
                            </div>

                            {/* Search & Preset Container */}
                            <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="비교할 종목명 또는 종목코드를 쉼표(,)로 입력하세요 (예: 삼성전자, SK하이닉스, NAVER)" 
                                        className="flex-1 bg-zinc-950 border border-white/15 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-purple-500 font-bold text-white shadow-inner" 
                                        value={peerSymbols} 
                                        onChange={e => setPeerSymbols(e.target.value)} 
                                        onKeyDown={e => { if (e.key === "Enter") fetchPeer(); }} 
                                    />
                                    <button 
                                        onClick={fetchPeer} 
                                        className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-2xl font-black text-sm text-white shadow-lg shadow-purple-600/30 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2"
                                    >
                                        <Users className="w-4 h-4" />
                                        <span>피어 비교 분석</span>
                                    </button>
                                </div>

                                {/* Preset Quick Chips */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider mr-1">추천 비교군:</span>
                                    {[
                                        { label: "반도체 대표", symbols: "005930,000660,042700" },
                                        { label: "인터넷/플랫폼", symbols: "035420,035720" },
                                        { label: "2차전지", symbols: "373220,006400,247540" },
                                        { label: "바이오/제약", symbols: "207940,068270,196170" },
                                        { label: "완성차", symbols: "005380,000270,012330" }
                                    ].map((preset, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setPeerSymbols(preset.symbols);
                                                setTimeout(() => {
                                                    fetch(`${API_BASE_URL}/api/analysis/peer-compare?symbols=${encodeURIComponent(preset.symbols)}`)
                                                        .then(r => r.json())
                                                        .then(j => { if (j.status === "success") setPeerData(j); });
                                                }, 50);
                                            }}
                                            className="px-3 py-1 bg-zinc-950 hover:bg-purple-950/40 border border-white/10 hover:border-purple-500/40 rounded-xl text-xs font-bold text-gray-300 hover:text-purple-300 transition-all"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {peerLoading ? (
                                <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-white/5">
                                    <RefreshCw className="w-10 h-10 animate-spin mx-auto text-purple-400 mb-3" />
                                    <p className="text-gray-400 text-xs font-bold">동종 업계 피어(Peer) 밸류에이션 및 재무 데이터 연산 중...</p>
                                </div>
                            ) : peerData?.status === "error" ? (
                                <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 text-center text-rose-400">
                                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-rose-500 animate-bounce" />
                                    <h3 className="text-lg font-bold mb-2">동종 업계 라이벌 비교 실패</h3>
                                    <p className="text-xs opacity-80 leading-relaxed mb-4">
                                        {peerData.message}
                                    </p>
                                    <button onClick={fetchPeer}
                                        className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                        다시 시도
                                    </button>
                                </div>
                            ) : peerData?.data && peerData.data.length > 0 ? (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {showEasy && (
                                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                                            <div className="bg-purple-500/20 p-2 rounded-lg h-fit">
                                                <HelpCircle className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-purple-400 mb-1">피어 비교 가이드 모드</h4>
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    비슷한 업종에서 경쟁하는 라이벌 회사들의 성적표를 한눈에 비교합니다. 
                                                    각 지표별로 가장 우수한 1위 기업에는 <span className="text-amber-400 font-black">👑 1위</span> 왕관 뱃지가 부여됩니다.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Comparison Table */}
                                    <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="font-black text-sm md:text-base text-white">피어(Peer) 핵심 지표 비교표</h4>
                                                <p className="text-xs text-gray-400">시가총액, 밸류에이션, 수익성, 안정성 및 단기 수익률 종합 비교</p>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                                                {peerData.data.length}개 기업 비교 중
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-white/10 bg-zinc-950/60">
                                                        <th className="text-left py-4 px-4 text-gray-400 text-xs font-black uppercase tracking-wider rounded-l-2xl">비교 지표</th>
                                                        {peerData.data.map((s: any) => (
                                                            <th key={s.symbol} className="py-4 px-4 text-center last:rounded-r-2xl">
                                                                <div className="font-black text-white text-sm md:text-base">{s.name}</div>
                                                                <div className="flex items-center justify-center gap-1.5 mt-1">
                                                                    <span className="text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">{s.symbol}</span>
                                                                    {s.price && <span className="text-[11px] font-mono font-bold text-gray-300">{Number(s.price).toLocaleString()}원</span>}
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {[
                                                        { key: "market_cap_display", rawKey: "market_cap", label: "시가총액", unit: "", isHigherBetter: true },
                                                        { key: "per", rawKey: "per", label: "PER (주가수익비율)", unit: "배", isHigherBetter: false, minPositive: true },
                                                        { key: "pbr", rawKey: "pbr", label: "PBR (주가순자산비율)", unit: "배", isHigherBetter: false, minPositive: true },
                                                        { key: "roe", rawKey: "roe", label: "ROE (자기자본이익률)", unit: "%", isHigherBetter: true },
                                                        { key: "operating_margin", rawKey: "operating_margin", label: "영업이익률", unit: "%", isHigherBetter: true },
                                                        { key: "revenue_growth", rawKey: "revenue_growth", label: "매출성장률", unit: "%", isHigherBetter: true },
                                                        { key: "dividend_yield", rawKey: "dividend_yield", label: "배당수익률", unit: "%", isHigherBetter: true },
                                                        { key: "debt_to_equity", rawKey: "debt_to_equity", label: "부채비율", unit: "%", isHigherBetter: false },
                                                        { key: "beta", rawKey: "beta", label: "베타 (시장민감도)", unit: "", isHigherBetter: false },
                                                        { key: "change_3m", rawKey: "change_3m", label: "3개월 수익률", unit: "%", isHigherBetter: true },
                                                    ].map(metric => {
                                                        const rawValues = peerData.data.map((s: any) => {
                                                            if (metric.rawKey === "market_cap") return Number(s.market_cap) || 0;
                                                            return parseFloat(String(s[metric.rawKey])) || 0;
                                                        });

                                                        let bestIdx = -1;
                                                        if (metric.isHigherBetter) {
                                                            const maxVal = Math.max(...rawValues);
                                                            if (maxVal > 0) bestIdx = rawValues.indexOf(maxVal);
                                                        } else if (metric.minPositive) {
                                                            const positiveVals = rawValues.filter((v: number) => v > 0);
                                                            if (positiveVals.length > 0) {
                                                                const minVal = Math.min(...positiveVals);
                                                                bestIdx = rawValues.indexOf(minVal);
                                                            }
                                                        } else {
                                                            const minVal = Math.min(...rawValues);
                                                            bestIdx = rawValues.indexOf(minVal);
                                                        }

                                                        return (
                                                            <tr key={metric.key} className="hover:bg-white/[0.03] transition-colors">
                                                                <td className="py-3.5 px-4 text-gray-300 text-xs font-bold whitespace-nowrap">
                                                                    <div>{metric.label}</div>
                                                                    {showEasy && (
                                                                        <div className="text-[10px] text-purple-300/70 font-medium mt-0.5 whitespace-normal break-keep leading-tight max-w-[150px]">
                                                                            {(() => {
                                                                                if(metric.key === "market_cap_display") return "기업의 전체 가치 크기";
                                                                                if(metric.key === "per") return "이익 대비 저평가 정도 (낮을수록 유리)";
                                                                                if(metric.key === "pbr") return "자산 대비 저평가 정도 (낮을수록 유리)";
                                                                                if(metric.key === "roe") return "자본 활용 이익 창출력 (높을수록 우수)";
                                                                                if(metric.key === "operating_margin") return "매출 대비 순수 영업마진";
                                                                                if(metric.key === "revenue_growth") return "전년 대비 외형 성장률";
                                                                                if(metric.key === "dividend_yield") return "주가 대비 연간 배당률";
                                                                                if(metric.key === "debt_to_equity") return "부채 의존도 (낮을수록 안전)";
                                                                                if(metric.key === "beta") return "지수 대비 주가 변동성";
                                                                                if(metric.key === "change_3m") return "최근 3개월 주가 변동률";
                                                                                return "";
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                {peerData.data.map((s: any, i: number) => {
                                                                    const val = s[metric.key];
                                                                    const isBest = i === bestIdx;
                                                                    return (
                                                                        <td key={s.symbol} className={`py-3.5 px-4 text-center font-mono text-xs md:text-sm ${isBest ? "bg-emerald-500/5 font-black text-emerald-300" : "text-gray-200"}`}>
                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                {(() => {
                                                                                    if (metric.key === "change_3m" || metric.key === "revenue_growth" || metric.key === "roe" || metric.key === "operating_margin") {
                                                                                        const nVal = parseFloat(String(val || "0"));
                                                                                        const color = nVal > 0 ? "text-rose-400 font-bold" : nVal < 0 ? "text-sky-400 font-bold" : "text-gray-300";
                                                                                        const sign = nVal > 0 ? "▲ " : nVal < 0 ? "▼ " : "";
                                                                                        return <span className={color}>{sign}{val !== undefined && val !== null ? val : "N/A"}{metric.unit}</span>;
                                                                                    }
                                                                                    if (metric.key === "per" || metric.key === "pbr" || metric.key === "dividend_yield" || metric.key === "debt_to_equity") {
                                                                                        return <span className={isBest ? "text-emerald-400 font-black" : "text-white"}>{val !== undefined && val !== null ? val : "N/A"}{metric.unit}</span>;
                                                                                    }
                                                                                    return <span>{val !== undefined && val !== null ? val : "N/A"}{metric.unit}</span>;
                                                                                })()}
                                                                                {isBest && (
                                                                                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] px-1.5 py-0.2 rounded-md font-black">
                                                                                        👑 1위
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Visual Comparison Mini Charts */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { key: "roe", label: "ROE (자기자본이익률)" },
                                            { key: "operating_margin", label: "영업이익률 (%)" },
                                            { key: "change_3m", label: "3개월 주가 수익률 (%)" }
                                        ].map(item => {
                                            const maxVal = Math.max(...peerData.data.map((s: any) => Math.abs(parseFloat(s[item.key]) || 0)), 1);
                                            return (
                                                <div key={item.key} className="bg-zinc-900/90 rounded-2xl p-5 border border-white/10 shadow-lg">
                                                    <h4 className="text-xs text-gray-400 font-black uppercase tracking-wider mb-4">{item.label}</h4>
                                                    <div className="space-y-3">
                                                        {peerData.data.map((s: any) => {
                                                            const val = parseFloat(s[item.key]) || 0;
                                                            const w = Math.min(Math.abs(val) / maxVal * 100, 100);
                                                            return (
                                                                <div key={s.symbol} className="flex items-center gap-3">
                                                                    <span className="text-xs text-gray-300 font-bold w-24 truncate" title={s.name}>{s.name}</span>
                                                                    <div className="flex-1 h-3.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                                                                        <div 
                                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                                val >= 0 
                                                                                    ? "bg-gradient-to-r from-emerald-600 to-teal-400" 
                                                                                    : "bg-gradient-to-r from-rose-600 to-rose-400"
                                                                            }`} 
                                                                            style={{ width: `${w}%` }} 
                                                                        />
                                                                    </div>
                                                                    <span className={`text-xs font-mono font-bold w-14 text-right ${val >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                                        {val > 0 ? `+${val}%` : `${val}%`}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : !peerLoading && (
                                <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-white/10 max-w-2xl mx-auto">
                                    <Users className="w-12 h-12 text-purple-400/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">동종 업계 비교 대기 중</h3>
                                    <p className="text-gray-400 text-xs leading-relaxed">
                                        상단에 비교할 라이벌 종목들을 입력하거나 상단 추천 비교군 버튼을 눌러보세요.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Kakao AdFit Bottom Banner */}
                <KakaoRevenueAd type="bottom" />

                <AIDisclaimer className="mt-8 opacity-60" />
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex flex-col items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-4" /><p className="text-gray-400 font-bold">로딩 중...</p></div>}>
            <AnalysisContent />
        </Suspense>
    );
}
