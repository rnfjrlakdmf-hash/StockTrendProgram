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
import AdBanner from "@/components/AdBanner";
import { getTickerFromKorean } from "@/lib/stockMapping";


// [v4.9.5] Deep-Sector-Matrix Analysis Dashboard
function AnalysisContent() {
    const searchParams = useSearchParams();
    const urlSymbol = searchParams.get("symbol");

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [symbol, setSymbol] = useState("");

    // [Fix] URL ?뚮씪誘명꽣濡??꾨떖???щ낵 ?먮룞 濡쒕뵫
    useEffect(() => {
        if (urlSymbol && urlSymbol !== symbol) {
            setSymbol(urlSymbol);
        }
    }, [urlSymbol]);
    const [activeTab, setActiveTab] = useState<"quant" | "financial" | "sector" | "peer">("quant");

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

    // [v1.9.0] 媛쒕퀎 遺꾩꽍 ?ㅽ뻾???꾪븳 ?寃??щ낵 ?곹깭??
    const [quantSymbol, setQuantSymbol] = useState("");
    const [finSymbol, setFinSymbol] = useState("");
    const [secSymbol, setSecSymbol] = useState("");
    const [activeSectorTab, setActiveSectorTab] = useState(0);
    const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

    // [v4.9.5] Sync Trigger
    useEffect(() => {
        if (!symbol || stockLoading) return;
        const targetSymbol = symbol.trim();
        if (/[????????媛-??/.test(targetSymbol)) return;
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
        } else if (/[????????媛-??/.test(targetSymbol)) {
            setStockLoading(true);
            try {
                const searchUrl = `${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(targetSymbol)}`;
                const res = await fetch(searchUrl);
                const json = await res.json();
                if (json.status === "success" && json.data && json.data.length > 0) {
                    targetSymbol = json.data[0].code;
                    setSymbol(targetSymbol);
                } else {
                    alert(`?대떦 醫낅ぉ('${targetSymbol}')??李얠쓣 ???놁뒿?덈떎.`);
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
            const url = new URL(`${API_BASE_URL}/api/analysis/sector-analysis/${sym}`);
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
            const url = new URL(`${API_BASE_URL}/api/analysis/sector-analysis/${sym}`);
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
        } catch (err) { console.error(err); }
        finally { if (!isBackground) setSectorLoading(false); }
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
                setPeerData({ status: "error", message: json.message || "?숈쥌 ?낃퀎 鍮꾧탳 ?곗씠?곕? 遺덈윭?ㅻ뒗 ?꾩쨷 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." });
            }
        } catch (err: any) { 
            console.error(err); 
            setPeerData({ status: "error", message: err.message || "?쒕쾭 ?듭떊???ㅽ뙣?덉뒿?덈떎. 醫낅ぉ肄붾뱶瑜??ㅼ떆 ?뺤씤??二쇱꽭??" });
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
        const labels = ["媛移?, "?깆옣", "紐⑤찘?", "?섏씡??, "?덉젙??];
        const cx = 150, cy = 150, r = 110;
        const getPoint = (index: number, score: number) => {
            const angle = (Math.PI * 2 * index / 5) - Math.PI / 2;
            const dist = (score / 100) * r;
            return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
        };
        const gridLevels = [20, 40, 60, 80, 100];
        return (
            <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
                {gridLevels.map(level => (
                    <polygon key={level} points={keys.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                ))}
                {keys.map((_, i) => { const p = getPoint(i, 100); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />; })}
                <polygon points={keys.map((k, i) => { const p = getPoint(i, factors?.[k]?.score || 0); return `${p.x},${p.y}`; }).join(" ")} fill="rgba(99,102,241,0.3)" stroke="rgb(99,102,241)" strokeWidth="2" />
                {keys.map((k, i) => { const p = getPoint(i, factors?.[k]?.score || 0); return <circle key={k} cx={p.x} cy={p.y} r="4" fill="rgb(129,140,248)" />; })}
                {keys.map((k, i) => { const p = getPoint(i, 120); return <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="bold"> {labels[i]} </text>; })}
            </svg>
        );
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen pb-20 text-white bg-black notranslate" translate="no">
            <Header title="?꾨줈 遺꾩꽍" subtitle="?곗씠??湲곕컲 醫낅ぉ ?뺣? 寃吏? />

            <div className="max-w-5xl mx-auto px-4 space-y-6 pt-4">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="relative group max-w-2xl mx-auto w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 z-10" />
                        <input type="text" placeholder="醫낅ぉ肄붾뱶 ?낅젰 (?? 005930, ?쇱꽦?꾩옄)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-lg font-bold focus:outline-none transition-colors"
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
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                {searchResults.map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        onMouseEnter={() => prefetchAnalysis(item.symbol)}
                                        onClick={() => {
                                            setSymbol(item.symbol);
                                            setShowResults(false);
                                            // Fake setting the value immediately
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
                                        className="px-4 py-3 hover:bg-gray-800 cursor-pointer flex justify-between items-center transition-colors border-b border-gray-800/50 last:border-0"
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
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Select a stock and click 'Analyze' in each tab below</p>
                        <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-rose-400/30 animate-pulse">
                            FINAL-ULTRA-FIX v5.0.1-STABLE
                        </span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 w-full">
                        {stockInfo && (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-3xl font-black">{stockInfo.name}</h2>
                                            <span className="text-gray-500 font-mono text-sm tracking-widest">{stockInfo.symbol}</span>
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            {/* [Fix] Price Blinking & Color Sync (Red for Up, Blue for Down) */}
                                            <BlinkingPrice 
                                                price={stockInfo.price || "---"} 
                                                className={`text-4xl font-black font-mono tracking-tighter ${
                                                    (parseFloat(String(stockInfo.change_rate || "0")) > 0) ? "text-red-500" : 
                                                    (parseFloat(String(stockInfo.change_rate || "0")) < 0) ? "text-blue-500" : 
                                                    "text-white"
                                                }`} 
                                            />
                                            <div className="flex flex-col gap-2 mt-1">
                                                {/* Regular Market */}
                                                {(() => {
                                                    const rawRateStr = String(stockInfo.change_rate || stockInfo.final_labeled_change || stockInfo.display_change || stockInfo.change || "0");
                                                    // Determine sign explicitly from string first (e.g. "+4.07%"), then fallback to numeric value
                                                    const isPos = rawRateStr.includes('+') || (!rawRateStr.includes('-') && parseFloat(rawRateStr.replace(/[^0-9.-]/g, "")) > 0);
                                                    const isNeg = rawRateStr.includes('-') || parseFloat(rawRateStr.replace(/[^0-9.-]/g, "")) < 0;
                                                    
                                                    const containerClass = isPos ? "bg-red-500/10 border-red-500/30 text-red-400" : 
                                                                           isNeg ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : 
                                                                           "bg-white/5 border-gray-500/20 text-gray-400";
                                                                           
                                                    const badgeClass = isPos ? "bg-red-500 text-white" : 
                                                                       isNeg ? "bg-blue-500 text-white" : 
                                                                       "bg-black/40 text-gray-400";

                                                    let valStr = String(stockInfo.change_val || "0").replace(/[^0-9.]/g, "");
                                                    let valNum = Number(valStr);
                                                    if (isNaN(valNum)) valNum = 0;
                                                    
                                                    let rawRate = rawRateStr.replace(/[^0-9.]/g, "");

                                                    return (
                                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl shadow-sm border ${containerClass}`}>
                                                            <span className={`text-xs font-bold mr-1 px-1.5 py-0.5 rounded ${badgeClass}`}>?뺢퇋??/span>
                                                            <span className="text-lg font-black tracking-tight font-mono">
                                                                {isPos ? '??' : isNeg ? '??' : ''}{valNum.toLocaleString()}
                                                            </span>
                                                            <span className="text-sm font-bold opacity-80 ml-1">
                                                                ({isPos ? '+' : isNeg ? '-' : ''}{rawRate}%)
                                                            </span>
                                                        </div>
                                                    );
                                                })()}

                                                {/* After-Hours Market */}
                                                {stockInfo.details?.nxt_data && (
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl shadow-[0_0_10px_rgba(99,102,241,0.2)] border ${
                                                        (() => {
                                                            const rawNxtPct = String(stockInfo.details.nxt_data.change_pct || "0");
                                                            const isPos = rawNxtPct.includes('+') || (!rawNxtPct.includes('-') && parseFloat(rawNxtPct.replace(/[^0-9.-]/g, "")) > 0);
                                                            const isNeg = rawNxtPct.includes('-') || parseFloat(rawNxtPct.replace(/[^0-9.-]/g, "")) < 0;
                                                            return isPos ? "bg-red-500/10 border-red-500/30 text-red-400" : isNeg ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-gray-500/10 border-gray-500/30 text-gray-400";
                                                        })()
                                                    }`}>
                                                        {(() => {
                                                            const rate = parseFloat(String(stockInfo.details.nxt_data.change_pct).replace(/[^0-9.-]/g, ""));
                                                            const isPos = rate > 0;
                                                            const isNeg = rate < 0;
                                                            const badgeClass = isPos ? "bg-red-500 text-white" : isNeg ? "bg-blue-500 text-white" : "bg-indigo-900/40 text-indigo-300";
                                                            return <span className={`text-xs font-bold mr-1 px-1.5 py-0.5 rounded ${badgeClass}`}>?쇨컙嫄곕옒 (NXT)</span>;
                                                        })()}
                                                        <span className="text-lg font-black tracking-tight font-mono">
                                                            {(() => {
                                                                const nxtValStr = String(stockInfo.details.nxt_data.change_val || "0");
                                                                const rate = parseFloat(String(stockInfo.details.nxt_data.change_pct).replace(/[^0-9.-]/g, ""));
                                                                const isPos = rate > 0;
                                                                const isNeg = rate < 0;
                                                                let valStr = nxtValStr.replace(/[^0-9.]/g, "");
                                                                let valNum = Number(valStr);
                                                                if (isNaN(valNum)) valNum = 0;
                                                                return `${isPos ? '??' : isNeg ? '??' : ''}${valNum.toLocaleString()}`;
                                                            })()}
                                                        </span>
                                                        <span className="text-sm font-bold opacity-80 ml-1">
                                                            {(() => {
                                                                const rate = parseFloat(String(stockInfo.details.nxt_data.change_pct).replace(/[^0-9.-]/g, ""));
                                                                const isPos = rate > 0;
                                                                const isNeg = rate < 0;
                                                                const raw = String(stockInfo.details.nxt_data.change_pct).replace(/[^0-9.]/g, "");
                                                                return `(${isPos ? '+' : isNeg ? '-' : ''}${raw}%)`;
                                                            })()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        <div className="bg-black/40 px-4 py-3 rounded-2xl border border-white/5">
                                            <p className="mb-1 opacity-50">?쒓?珥앹븸</p>
                                            <p className="text-sm text-gray-300">{stockInfo.market_cap_str || stockInfo.market_cap || "N/A"}</p>
                                        </div>
                                        {quantData && (
                                            <>
                                                <div className="bg-white/5 px-4 py-3 rounded-2xl">
                                                    <p className="mb-1 opacity-50">醫낇빀 ?먯닔</p>
                                                    <p className={`text-xl ${getScoreColor(quantData.total_score)}`}>{quantData.total_score}??/p>
                                                </div>
                                                <div className={`px-5 py-3 rounded-2xl bg-gradient-to-br ${getGradeStyle(quantData.grade)} flex flex-col justify-center`}>
                                                    <p className="mb-1 opacity-70 text-black">?깃툒</p>
                                                    <p className="text-xl font-black text-black">{quantData.grade}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {stockInfo.description && (
                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <div className="text-[10px] text-gray-500 uppercase font-black mb-2 flex items-center gap-2">
                                            <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                                            湲곗뾽 媛쒖슂
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                            {stockInfo.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setShowEasy(!showEasy)}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-sm transition-all shadow-xl group border ${showEasy ? "bg-indigo-600 border-indigo-400 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}>
                        <HelpCircle className={`w-5 h-5 ${showEasy ? "animate-bounce" : ""}`} />
                        <div className="text-left leading-none">
                            <p className="text-[10px] uppercase tracking-widest mb-1 opacity-70">Guide Mode</p>
                            <p className="text-xs">{showEasy ? <span>媛?대뱶 ?꾧린</span> : <span>媛?대뱶 耳쒓린</span>}</p>
                        </div>
                    </button>
                </div>

                {/* AdSense Placement (Main Analysis Top) */}
                <AdBanner adSlot="7781033256" />

                <div className="sticky top-4 z-40 flex justify-center py-2 bg-black/50 backdrop-blur-md rounded-2xl border border-white/5">
                    <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-full max-w-2xl">
                        {[
                            { id: "quant", label: "TurboQuant", icon: Zap },
                            { id: "financial", label: "?щТ 遺꾩꽍", icon: Shield },
                            { id: "sector", label: "?뱁꽣 遺꾩꽍", icon: PieChart },
                            { id: "peer", label: "?숈쥌鍮꾧탳", icon: Users }
                        ].map((tab: any) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-[400px] mt-4">
                    {activeTab === "quant" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/20 rounded-lg"><Zap className="w-5 h-5 text-amber-400" /></div>
                                    <h3 className="font-bold whitespace-nowrap">TurboQuant ?뺣? 遺꾩꽍</h3>
                                </div>
                                <button onClick={() => handleGlobalSearch("quant")}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                    ???濡쒕뱶
                                </button>
                            </div>

                            {quantLoading ? (
                                <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-3" /><p className="text-gray-500">吏??遺꾩꽍 以?..</p></div>
                            ) : quantData ? (
                                quantData.error ? (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center text-red-400">
                                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500 animate-bounce" />
                                        <h3 className="text-lg font-bold mb-2">???遺꾩꽍 ?곗씠?곕? 遺덈윭?????놁뒿?덈떎</h3>
                                        <p className="text-xs opacity-80 leading-relaxed mb-4">
                                            {quantData.error}
                                        </p>
                                        <button onClick={() => handleGlobalSearch("quant")}
                                            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                            ?ㅼ떆 ?쒕룄
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-indigo-900/30 to-black border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradeStyle(quantData.grade)} flex items-center justify-center text-xl font-black shadow-lg`}>{quantData.grade || "N/A"}</div>
                                                    <div><h3 className="text-lg font-bold">5異?????뺣? 吏꾨떒</h3><p className="text-xs text-gray-500">媛??⑺꽣蹂??먯닔? ?몃? 吏?쒕? ?뺤씤?섏꽭??/p></div>
                                                </div>
                                                <div className="text-right"><span className={`text-3xl font-black ${getScoreColor(quantData.total_score || 0)}`}>{quantData.total_score || 0}</span><p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Total Score</p></div>
                                            </div>
                                            <RadarChart factors={quantData.factors} />
                                            <div className="mt-8 pt-6 border-t border-white/10">
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                    {Object.entries(quantData.factors || {}).map(([key, f]: any) => {
                                                        const factorGuide: Record<string, string> = {
                                                            "value": "?꾩옱 二쇨?媛 踰뚭퀬 ?덈뒗 ?덉씠???ъ궛??鍮꾪빐 ?쇱? 鍮꾩떬吏瑜??섑??댁슂.",
                                                            "growth": "?묐뀈蹂대떎 留ㅼ텧?대굹 ?댁씡???쇰쭏???섏뿀?붿?, ?뚯궗??洹쒕え媛 而ㅼ???以묒씤吏 蹂댁뿬以섏슂.",
                                                            "momentum": "?щ엺?ㅼ쓽 愿?ш낵 二쇨? ?곸듅 ?먮쫫???쇰쭏??媛뺣젰?섍쾶 遺숈뿀?붿? 痢≪젙?댁슂.",
                                                            "quality": "???덇낵 鍮뚮┛ ?덉쓣 ?⑹퀜 ?쇰쭏???뚯쭨諛곌린 ?μ궗瑜??깆떎?섍퀬 ?⑥쑉?곸쑝濡??덈뒗吏 ?뚮젮以띾땲??",
                                                            "stability": "鍮뚮┛ ?덉씠 ?덈Т 留롮????딆?吏, 遺???꾪뿕 ?놁씠 ?뚯궗媛 ?쇰쭏???쇳듉?쒖? ?섑??댁슂."
                                                        };
                                                        return (
                                                            <div key={key} className={`flex flex-col items-center text-center p-3 rounded-2xl transition-all ${showEasy ? "bg-white/5 ring-1 ring-indigo-500/30" : ""}`}>
                                                                <span className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">{f?.label || ""}</span>
                                                                <span className={`text-2xl font-black mb-1 ${getScoreColor(f?.score || 0)}`}>{f?.score || 0}</span>
                                                                
                                                                {/* [New] Guide Mode Explanation */}
                                                                {showEasy && (
                                                                    <p className="text-[10px] text-indigo-300 leading-snug mt-2 mb-3 bg-indigo-500/10 p-2 rounded-lg italic">
                                                                        {factorGuide[key] || "?⑺꽣蹂??몃? 吏?쒕? 遺꾩꽍 以묒엯?덈떎."}
                                                                    </p>
                                                                )}
 
                                                                <div className="space-y-0.5 opacity-60">
                                                                    {Object.entries(f?.metrics || {}).map(([mk, mv]: any) => (
                                                                        <div key={mk} className="text-[9px] text-gray-400 flex items-center justify-center gap-1"><span>{mk}</span><span className="text-gray-200 font-bold">{mv}</span></div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border-t border-indigo-500/20 bg-indigo-500/5">
                                            <TurboQuantIndicators symbol={quantSymbol || symbol} showEasy={showEasy} />
                                        </div>
                                    </div>
                                )
                            ) : <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10"> <Activity className="w-12 h-12 text-indigo-400/30 mx-auto mb-4" /> <p className="text-gray-500">醫낅ぉ肄붾뱶瑜??낅젰?섎㈃ 5異????遺꾩꽍???쒖옉?⑸땲??/p> </div>}
                        </div>
                    )}
{activeTab === "financial" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg"><Shield className="w-5 h-5 text-emerald-400" /></div>
                                    <h3 className="font-bold whitespace-nowrap">?щТ 嫄닿컯??吏꾨떒</h3>
                                </div>
                                <button onClick={() => handleGlobalSearch("financial")}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                    嫄닿컯??痢≪젙
                                </button>
                            </div>
                            {financialLoading ? (
                                <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-emerald-400 mb-3" /><p className="text-gray-500">?щТ ?곗씠??遺꾩꽍 以?..</p></div>
                            ) : financialData ? (
                                financialData.error ? (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center text-red-400">
                                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500 animate-bounce" />
                                        <h3 className="text-lg font-bold mb-2">?щТ 遺꾩꽍 ?곗씠?곕? 遺덈윭?????놁뒿?덈떎</h3>
                                        <p className="text-xs opacity-80 leading-relaxed mb-4">
                                            {financialData.error}
                                        </p>
                                        <button onClick={() => handleGlobalSearch("financial")}
                                            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                            ?ㅼ떆 ?쒕룄
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
                                                    <h4 className="text-sm font-bold text-emerald-400 mb-1">珥덈낫??媛?대뱶 紐⑤뱶 ?쒖꽦?붾맖</h4>
                                                    <p className="text-xs text-gray-300 leading-relaxed">
                                                        ?대젮???щТ ?⑹뼱?ㅼ쓣 ?뚭린 ?쎄쾶 湲곗뾽??'嫄닿컯 ?곹깭'??鍮꾩쑀?섏뿬 ?ㅻ챸???쒕┫寃뚯슂.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="bg-gradient-to-br from-emerald-900/30 to-black border border-emerald-500/30 rounded-3xl p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <div><h2 className="text-2xl font-black text-white">?덉쟾??諛??щТ 嫄닿컯??吏꾨떒</h2><p className="text-gray-400 text-sm">醫낅ぉ??湲곗큹 泥대젰怨??꾧린 愿由??λ젰???뺣? ?ㅼ틪?⑸땲??</p></div>
                                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradeStyle(financialData.grade)} flex items-center justify-center text-3xl font-black shadow-xl`}>{financialData.grade || "N/A"}</div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                                                    <div className="flex items-center gap-2 mb-6"><Shield className="w-4 h-4 text-emerald-400" /><h4 className="text-xs font-black uppercase tracking-widest text-emerald-300">3媛쒕뀈 ?덉쟾??異붿씠</h4></div>
                                                    <div className="h-[200px] w-full">
                                                        {financialData?.charts?.stability && Array.isArray(financialData.charts.stability) && financialData.charts.stability.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%"><LineChart data={financialData.charts.stability}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} /><XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '11px' }} /><Legend iconType="circle" /><Line type="monotone" dataKey="遺梨꾨퉬?? stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} /><Line type="monotone" dataKey="?뱀쥖鍮꾩쑉" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer>
                                                        ) : <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">No Trend Data</div>}
                                                    </div>
                                                </div>
                                                <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                                                    <div className="flex items-center gap-2 mb-6"><TrendingUp className="w-4 h-4 text-indigo-400" /><h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">3媛쒕뀈 ?섏씡 ?⑥쑉 異붿씠</h4></div>
                                                    <div className="h-[200px] w-full">
                                                        {financialData?.charts?.profitability && Array.isArray(financialData.charts.profitability) && financialData.charts.profitability.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%"><AreaChart data={financialData.charts.profitability}><defs><linearGradient id="colorROE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} /><XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '11px' }} /><Area type="monotone" dataKey="ROE" stroke="#6366f1" fillOpacity={1} fill="url(#colorROE)" strokeWidth={3} /><Area type="monotone" dataKey="?곸뾽?댁씡瑜? stroke="#8b5cf6" fillOpacity={0.1} strokeWidth={2} /></AreaChart></ResponsiveContainer>
                                                        ) : <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">No Trend Data</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-black/40 rounded-2xl p-4 border border-white/10 group">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 whitespace-nowrap">
                                                            ?뱪 Altman Z-Score
                                                            {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">遺???꾪뿕瑜?/span>}
                                                        </h4>
                                                    </div>
                                                    {showEasy && (
                                                        <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                            ?뱀옣 ?곕윭吏??꾪뿕(遺???꾪뿕)???덈뒗吏 泥댄겕?댁슂. <span className="text-emerald-400 font-bold">3.0 ?댁긽?대㈃ '媛뺤쿋 泥대젰'</span>??媛吏??꾩＜ ?쇳듉???곹깭?덉슂!
                                                        </p>
                                                    )}
                                                    <div className="flex items-end gap-3">
                                                        <span className="text-3xl font-black">{financialData?.z_score?.value ?? "N/A"}</span>
                                                        <span className={`text-sm font-bold pb-1 ${financialData?.z_score?.color === "green" ? "text-green-400" : financialData?.z_score?.color === "yellow" ? "text-yellow-400" : "text-red-400"}`}>
                                                            {financialData?.z_score?.zone ?? "N/A"} ZONE
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="bg-black/40 rounded-2xl p-4 border border-white/10 group">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 whitespace-nowrap">
                                                            <span>?룍截?Piotroski F-Score</span>
                                                            {showEasy ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">醫낇빀 湲곗큹泥대젰</span> : null}
                                                        </h4>
                                                    </div>
                                                    {showEasy && (
                                                        <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                            ?뚯궗??<span className="text-emerald-400 font-bold">'洹쇱쑁怨?泥댁?諛?</span>??遊낅땲?? ?댁씡? ?섍퀬 鍮싳? 以꾩뿀?붿? 9?④퀎瑜??꾧꺽??寃吏꾪븳 湲곗큹泥대젰 ?먯닔?덉슂. 7???댁긽?대㈃ ?곗닔?댁슂.
                                                        </p>
                                                    )}
                                                    <div className="flex items-end gap-3">
                                                        <span className="text-3xl font-black">{financialData?.f_score?.value ?? "N/A"}</span>
                                                        <span className="text-sm text-gray-500 pb-1">/ 9</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
 
                                        {/* F-Score Details */}
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                            <h4 className="font-bold text-sm text-gray-300 mb-3">F-Score ?몃? ??ぉ</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                {(Array.isArray(financialData?.f_score?.details) ? financialData.f_score.details : []).map((d: string, i: number) => (
                                                    <div key={i} className="text-xs py-2 px-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-2">
                                                        <span className="text-emerald-500">??/span> {d}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
 
                                        {/* Key Ratios */}
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                            <h4 className="font-bold text-sm text-gray-300 mb-3">?듭떖 ?щТ 鍮꾩쑉</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {Object.entries(financialData?.ratios && typeof financialData.ratios === 'object' ? financialData.ratios : {}).map(([k, v]: any) => {
                                                    const getExplanation = (key: string) => {
                                                        if (key === "PER") return "踰꾨뒗 ?λ젰 ?鍮?'?꾩옱 媛寃⑺몴'";
                                                        if (key === "PBR") return "媛吏??먯궛 ?鍮?'?꾩옱 媛寃⑺몴'";
                                                        if (key === "ROE") return "?ъ옄湲??鍮?'洹쇱꽦' (?뚯궗??媛?깅퉬)";
                                                        if (key === "遺梨꾨퉬??) return "紐몃Т寃??鍮?'泥댁?諛? (鍮뚮┛ ??";
                                                        if (key === "?좊룞鍮꾩쑉") return "吏媛???'鍮꾩긽湲? (?꾧툑 ?ъ쑀)";
                                                        if (key === "?곸뾽?댁씡瑜?) return "1留뚯썝?댁튂 ?붿븘 ?쇰쭏瑜??④린??;
                                                        if (key === "留ㅼ텧珥앹씠?듬쪧") return "臾쇨굔 ?쇱????④릿 ?쒖닔 留덉쭊";
                                                        if (key === "?먯궛?뚯쟾??) return "?먯궛???쇰쭏??遺吏?고엳 援대━??;
                                                        return "";
                                                    };
                                                    return (
                                                        <div key={k} className="bg-black/30 rounded-2xl p-4 border border-white/5 transition-all hover:border-emerald-500/20">
                                                            <p className="text-[10px] text-gray-500 font-bold mb-0.5">{k}</p>
                                                            <p className="text-lg font-black text-white">{v}</p>
                                                            {showEasy && (
                                                                <p className="text-[10px] text-emerald-400/70 mt-1 font-medium leading-tight">
                                                                    {getExplanation(k)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10"> <Shield className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" /> <p className="text-gray-500">醫낅ぉ肄붾뱶瑜??낅젰?섎㈃ ?щТ 遺꾩꽍???쒖옉?⑸땲??/p> </div>}
                        </div>
                    )}

                    {activeTab === "sector" && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-2xl">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-3 bg-red-500/20 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.2)]"><PieChart className="w-6 h-6 text-red-500" /></div>
                                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Deep-Sector-Matrix v4.9.5</h3>
                                    </div>
                                    <p className="text-gray-400 text-sm font-medium">???醫낅ぉ vs ?뱁꽣 ?됯퇏 vs ?쒖옣 吏??(17媛?吏??珥덉젙諛 遺꾩꽍)</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={selectedSectorId || (Array.isArray(sectorData?.compare_sectors) ? sectorData.compare_sectors : []).find((s: any) => s.selected)?.id || ""}
                                        onChange={(e) => { const newId = e.target.value; setSelectedSectorId(newId); fetchSectorAnalysis(secSymbol || symbol, newId); }}
                                        className="bg-black/80 border border-white/20 rounded-2xl px-6 py-3 text-sm font-black text-white outline-none focus:ring-4 focus:ring-red-500/30 min-w-[240px] cursor-pointer appearance-none shadow-xl"
                                    >
                                        {(Array.isArray(sectorData?.compare_sectors) ? sectorData.compare_sectors : []).map((s: any) => <option key={s.id} value={s.id} className="bg-gray-900 text-white">{s.name}</option>)}
                                    </select>
                                    <button onClick={() => handleGlobalSearch("sector")} className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-2xl text-sm font-black shadow-[0_10px_30px_rgba(239,68,68,0.3)] transition-all active:scale-95 text-white">?곗씠??媛깆떊</button>
                                </div>
                            </div>

                            {sectorLoading ? (
                                <div className="text-center py-32"><RefreshCw className="w-16 h-16 animate-spin mx-auto text-red-500 mb-6 opacity-50" /><p className="text-gray-400 font-black tracking-widest uppercase">Fetching 17-Factor Deep Matrix...</p></div>
                            ) : sectorData ? (
                                sectorData.error ? (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center text-red-400">
                                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500 animate-bounce" />
                                        <h3 className="text-lg font-bold mb-2">?뱁꽣 遺꾩꽍 ?곗씠?곕? 遺덈윭?????놁뒿?덈떎</h3>
                                        <p className="text-xs opacity-80 leading-relaxed mb-4">
                                            {sectorData.error}
                                        </p>
                                        <button onClick={() => handleGlobalSearch("sector")}
                                            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                            ?ㅼ떆 ?쒕룄
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
                                                    <h4 className="text-sm font-bold text-red-400 mb-1">珥덈낫??媛?대뱶 紐⑤뱶 ?쒖꽦?붾맖 (?뱁꽣 留ㅽ듃由?뒪)</h4>
                                                    <p className="text-xs text-gray-300 leading-relaxed">
                                                        ?꾩옱 醫낅ぉ???랁븳 ?곗뾽(?뱁꽣) ?꾩껜 ?됯퇏 諛?肄붿뒪??肄붿뒪???쒖옣 吏?섏? ?깆쟻???섎???鍮꾧탳???쒕┰?덈떎. ?대? ?듯빐 ???뚯궗媛 ?낃퀎 ?됯퇏蹂대떎 ?μ궗瑜??섑븯怨??덈뒗吏 吏곴??곸쑝濡??????덉뒿?덈떎.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    {(() => {
                                        const sectorSections = [
                                            {
                                                group: "Value Analytics (媛移?遺꾩꽍)",
                                                metrics: [
                                                    { key: "PER", label: "PER (諛?" },
                                                    { key: "PBR", label: "PBR (諛?" },
                                                    { key: "Fwd. 12M PER", label: "Fwd. 12M PER" },
                                                    { key: "Fwd. 12M PBR", label: "Fwd. 12M PBR" }
                                                ]
                                            },
                                            {
                                                group: "Growth Dynamics (?깆옣??遺꾩꽍)",
                                                metrics: [
                                                    { key: "留ㅼ텧?≪쬆媛??, label: "留ㅼ텧??利앷???(%)" },
                                                    { key: "?곸뾽?댁씡利앷???, label: "?곸뾽?댁씡 利앷???(%)" },
                                                    { key: "?쒖씠?듭쬆媛??, label: "?쒖씠??利앷???(%)" }
                                                ]
                                            },
                                            {
                                                group: "Profitability Engine (?섏씡??遺꾩꽍)",
                                                metrics: [
                                                    { key: "ROE", label: "ROE (%)" },
                                                    { key: "ROA", label: "ROA (%)" },
                                                    { key: "留ㅼ텧珥앹씠?듬쪧", label: "留ㅼ텧珥앹씠?듬쪧 (%)" },
                                                    { key: "?곸뾽?댁씡瑜?, label: "?곸뾽?댁씡瑜?(%)" },
                                                    { key: "?쒖씠?듬쪧", label: "?쒖씠?듬쪧 (%)" }
                                                ]
                                            },
                                            {
                                                group: "Stability & Returns (?덉젙??諛??섏씡瑜?",
                                                metrics: [
                                                    { key: "遺梨꾨퉬??, label: "遺梨꾨퉬??(%)" },
                                                    { key: "?좊룞鍮꾩쑉", label: "?좊룞鍮꾩쑉 (%)" },
                                                    { key: "諛곕떦?섏씡瑜?, label: "諛곕떦?섏씡瑜?(%)" },
                                                    { key: "諛곕떦?깊뼢", label: "諛곕떦?깊뼢 (%)" },
                                                    { key: "二쇨??섏씡瑜?, label: "二쇨? ?섏씡瑜?(%)" }
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
                                                                    <h3 className="text-gray-400 font-bold mb-2">?곗씠?곌? ?쒓났?섏? ?딆뒿?덈떎</h3>
                                                                    <p className="text-gray-500 text-sm">?대떦 洹몃９(?????뱁꽣 遺꾩꽍 吏?쒓? ??醫낅ぉ(?먮뒗 ETF)?먮뒗 ?쒓났?섏? ?딆뒿?덈떎.<br/>?ㅻⅨ ??쓣 ?좏깮??蹂댁꽭??</p>
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
                                                                            const r = Array.isArray(cat.rows) ? cat.rows.find((r: any) => r.name === "??醫낅ぉ") : null;
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
                                                                            if(k==="PER") return "?꾩옱 二쇨?媛 ?댁씡 ?鍮??쇱? 鍮꾩떬吏 ?뚮젮二쇰뒗 媛?깅퉬 吏?쒖엯?덈떎. ?낃퀎 ?됯퇏蹂대떎 ??쑝硫???됯?, ?믪쑝硫?怨좏룊媛濡?遊낅땲??";
                                                                            if(k==="PBR") return "?뚯궗 ?먯궛(?ъ궛) ?鍮?二쇨?媛 ?쇱? 鍮꾩떬吏 蹂댁뿬以띾땲?? 蹂댄넻 1 誘몃쭔?대㈃ ?먯궛媛移섎낫???몃떎怨?遊낅땲??";
                                                                            if(k==="Fwd. 12M PER" || k==="Fwd. 12M PBR") return "1?????덉긽?섎뒗 ?ㅼ쟻??湲곗??쇰줈 怨꾩궛??媛?깅퉬 吏?쒖엯?덈떎. 誘몃옒???≪긽 ?щ젰??蹂???李멸퀬?댁슂.";
                                                                            if(k==="留ㅼ텧?≪쬆媛??) return "?뚯궗???명삎(臾쇨굔 ?뚮뒗 ?ㅼ??????쇰쭏???μ뫁 ?ш퀬 ?덈뒗吏 蹂댁뿬以띾땲??";
                                                                            if(k==="?곸뾽?댁씡利앷???) return "臾쇨굔 ?붿븘???④릿 ?쒖닔??留덉쭊)???묐뀈蹂대떎 ?쇰쭏???섏뿀?붿? 遊낅땲?? ?쒖씪 以묒슂???깆옣??吏?쒖삁??";
                                                                            if(k==="?쒖씠?듭쬆媛??) return "?멸툑 ????嫄????쇨퀬 ??二쇰㉧?덉뿉 理쒖쥌?곸쑝濡??⑤뒗 ?덉쓽 ?깆옣 ?띾룄?낅땲??";
                                                                            if(k==="ROE") return "?????먮낯湲??쇰줈 1?꾧컙 ?쇰쭏???뚯쭨 ?μ궗瑜??덈뒗吏 (媛?깅퉬?? 蹂댁뿬以띾땲?? ?믪쓣?섎줉 ?뚮젋 踰꾪븦??醫뗭븘?댁슂.";
                                                                            if(k==="ROA") return "鍮싰퉴吏 ?⑹튇 ?꾩껜 ?먯궛???쇰쭏??遺吏?고엳 援대졇?붿? 蹂댁뿬二쇰뒗 ?쒕룞 留덉쭊?⑥엯?덈떎.";
                                                                            if(k==="留ㅼ텧珥앹씠?듬쪧") return "臾쇨굔 ?쇱삩 ?먭?留?鍮쇨퀬 ?쇰쭏??留덉쭊???ш쾶 ?④꺼癒밸뒗吏 蹂댁뿬以띾땲??";
                                                                            if(k==="?곸뾽?댁씡瑜?) return "1留뚯썝?댁튂 ?붿븘??紐?泥쒖썝??吏꾩쭨濡??④린?붿?, ?뚯궗???듭떖 ?μ궗 ?ㅻ젰?낅땲??";
                                                                            if(k==="?쒖씠?듬쪧") return "理쒖쥌 ?멸툑源뚯? ??鍮쇨퀬 ?쒖닔?섍쾶 ?⑥? 吏꾩쭨 李?留덉쭊?⑥엯?덈떎.";
                                                                            if(k==="遺梨꾨퉬??) return "?????鍮?鍮뚮┛ ??鍮????쇰쭏??留롮?吏 遊낅땲?? 100% ?댄븯媛 ?덉쟾?섎ŉ, ?뱁꽣 ?됯퇏蹂대떎 ??쑝硫??쇳듉?⑸땲??";
                                                                            if(k==="?좊룞鍮꾩쑉") return "1???덉뿉 媛싳븘????鍮싲낫???뱀옣 ?꾧툑??媛?ν븳 ?먯궛??留롮?吏 遊낅땲?? ?믪쓣?섎줉 遺???꾪뿕????뒿?덈떎.";
                                                                            if(k==="諛곕떦?섏씡瑜?) return "二쇱떇???ㅺ퀬留??덉뼱???듭옣??苑귦엳??諛곕떦湲덉쓽 ?댁옄??媛숈? 媛쒕뀗?낅땲??";
                                                                            if(k==="諛곕떦?깊뼢") return "?뚯궗媛 踰뚯뼱?ㅼ씤 ??以?紐?%瑜?二쇱＜?ㅼ뿉寃?李⑺븯寃??섎닠二쇰뒗吏 蹂댁뿬以띾땲??";
                                                                            if(k==="二쇨??섏씡瑜?) return "?뱀젙 湲곌컙 ?숈븞 ?ㅼ젣濡?二쇨?媛 ?쇰쭏???щ옄?붿?(?뱀? ?⑥뼱議뚮뒗吏) 蹂댁뿬以띾땲??";
                                                                            return "?대떦 吏?쒖쓽 ?뱁꽣 ?됯퇏 諛??쒖옣 吏?섏???鍮꾧탳瑜?蹂댁뿬以띾땲??";
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
                                                                        <Line type="monotone" dataKey="??醫낅ぉ" stroke="#ef4444" strokeWidth={6} dot={{ r: 6, strokeWidth: 3, fill: '#ef4444', stroke: '#000' }} activeDot={{ r: 10, strokeWidth: 0 }} animationDuration={2500} />
                                                                        <Line type="monotone" dataKey="?뱁꽣 ?됯퇏" stroke="#10b981" strokeWidth={2.5} strokeDasharray="8 4" dot={{ r: 4, fill: '#10b981' }} animationDuration={2500} />
                                                                        <Line type="monotone" dataKey="?쒖옣 吏?? stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="4 8" dot={{ r: 4, fill: '#3b82f6' }} animationDuration={2500} />
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
                            ) : <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10"><PieChart className="w-20 h-20 text-red-500/20 mx-auto mb-6" /><p className="text-gray-400 font-black tracking-[0.3em] text-sm uppercase">Sector Matrix Stand-By</p></div>}
                        </div>
                    )}

                    {activeTab === "peer" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg"><Users className="w-5 h-5 text-purple-400" /></div>
                                    <h3 className="font-bold">?숈쥌 ?낃퀎 鍮꾧탳</h3>
                                </div>
                                <button onClick={fetchPeer} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">?쇱뼱 遺꾩꽍</button>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex gap-4">
                                <input type="text" placeholder="醫낅ぉ肄붾뱶 ?쇳몴濡?援щ텇 (?? 005930,000660)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500 uppercase font-mono text-white" value={peerSymbols} onChange={e => setPeerSymbols(e.target.value)} onKeyDown={e => { if (e.key === "Enter") fetchPeer(); }} />
                                <button onClick={fetchPeer} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-black text-sm text-white transition-all active:scale-95">鍮꾧탳 遺꾩꽍</button>
                            </div>
                            {peerLoading ? (
                                <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-orange-400 mb-3" /><p className="text-gray-500">?쇱뼱 ?곗씠??遺꾩꽍 以?..</p></div>
                            ) : peerData?.status === "error" ? (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 text-center text-red-400">
                                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500 animate-bounce" />
                                    <h3 className="text-lg font-bold mb-2">?숈쥌 ?낃퀎 ?쇱씠踰?鍮꾧탳 ?ㅽ뙣</h3>
                                    <p className="text-xs opacity-80 leading-relaxed mb-4">
                                        {peerData.message}
                                    </p>
                                    <button onClick={fetchPeer}
                                        className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                        ?ㅼ떆 ?쒕룄
                                    </button>
                                </div>
                            ) : peerData?.data && peerData.data.length > 0 ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {showEasy && (
                                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                                            <div className="bg-purple-500/20 p-2 rounded-lg h-fit">
                                                <HelpCircle className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-purple-400 mb-1">珥덈낫??媛?대뱶 紐⑤뱶 ?쒖꽦?붾맖 (?숈쥌 ?낃퀎 ?쇱씠踰?鍮꾧탳)</h4>
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    鍮꾩듂???낆쥌?먯꽌 寃쎌웳?섎뒗 ?쇱씠踰??뚯궗?ㅺ낵 二쇱슂 ?깆쟻?쒕? ?섎????먭퀬 鍮꾧탳?⑸땲?? 
                                                    媛?吏?쒕쭏??媛???곗뼱??1???뚯궗?먭쾶??<span className="text-[10px]">?몣</span> ?뺢????쒖떆?⑸땲??
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {/* Comparison Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="text-left py-3 px-2 text-gray-500 text-xs font-bold">吏??/th>
                                                    {peerData.data.map((s: any) => (
                                                        <th key={s.symbol} className="py-3 px-2 text-center">
                                                            <div className="font-black text-white">{s.name}</div>
                                                            <div className="text-[10px] text-gray-500">{s.symbol}</div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[
                                                    { key: "market_cap_display", label: "?쒓?珥앹븸" },
                                                    { key: "per", label: "PER (諛?" },
                                                    { key: "pbr", label: "PBR (諛?" },
                                                    { key: "roe", label: "ROE (%)" },
                                                    { key: "operating_margin", label: "?곸뾽?댁씡瑜?(%)" },
                                                    { key: "revenue_growth", label: "留ㅼ텧?깆옣瑜?(%)" },
                                                    { key: "dividend_yield", label: "諛곕떦?섏씡瑜?(%)" },
                                                    { key: "debt_to_equity", label: "遺梨꾨퉬??(%)" },
                                                    { key: "beta", label: "踰좏?" },
                                                    { key: "change_3m", label: "3媛쒖썡 ?섏씡瑜?(%)" },
                                                ].map(metric => {
                                                    const values = peerData.data.map((s: any) => parseFloat(s[metric.key]) || 0);
                                                    const maxIdx = values.indexOf(Math.max(...values));
                                                    const minIdx = values.indexOf(Math.min(...values));
                                                    const isHigherBetter = !["per", "debt_to_equity", "beta"].includes(metric.key);

                                                    return (
                                                        <tr key={metric.key} className="border-b border-white/5 hover:bg-white/5">
                                                            <td className="py-3 px-2 text-gray-400 text-xs font-bold whitespace-nowrap">
                                                                <div>{metric.label}</div>
                                                                {showEasy && (
                                                                    <div className="text-[10px] text-purple-300/80 font-medium mt-1.5 whitespace-normal break-keep leading-tight max-w-[130px]">
                                                                        {(() => {
                                                                            if(metric.key === "market_cap_display") return "?뚯궗???꾩껜 紐멸컪 (?ш린)";
                                                                            if(metric.key === "per") return "?댁씡 ?鍮???됯? ?뺣룄 (??쓣?섎줉 醫뗭쓬)";
                                                                            if(metric.key === "pbr") return "?먯궛 ?鍮???됯? ?뺣룄 (??쓣?섎줉 醫뗭쓬)";
                                                                            if(metric.key === "roe") return "?먮낯(?????쇰줈 援대┛ ?댁씡瑜?(?믪쓣?섎줉 醫뗭쓬)";
                                                                            if(metric.key === "operating_margin") return "?ㅼ젣 ?μ궗 留덉쭊??(?믪쓣?섎줉 醫뗭쓬)";
                                                                            if(metric.key === "revenue_growth") return "?명삎(洹쒕え)???깆옣 ?띾룄 (?믪쓣?섎줉 醫뗭쓬)";
                                                                            if(metric.key === "dividend_yield") return "二쇱떇 蹂댁쑀 ??諛쏅뒗 諛곕떦 ?댁옄 (?믪쓣?섎줉 醫뗭쓬)";
                                                                            if(metric.key === "debt_to_equity") return "媛吏????鍮?鍮싳쓽 鍮꾩쑉 (??쓣?섎줉 ?덉쟾)";
                                                                            if(metric.key === "beta") return "?쒖옣 蹂?숈꽦 (1蹂대떎 ?믪쑝硫?怨좎쐞??怨좎닔??";
                                                                            if(metric.key === "change_3m") return "理쒓렐 3媛쒖썡媛?二쇨? ?섏씡瑜?;
                                                                            return "";
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            {peerData.data.map((s: any, i: number) => {
                                                                const val = s[metric.key];
                                                                const isBest = isHigherBetter ? i === maxIdx : i === minIdx;
                                                                return (
                                                                    <td key={s.symbol} className={`py-3 px-2 text-center font-mono ${isBest ? "text-green-400 font-black" : "text-gray-300"}`}>
                                                                        {(() => {
                                                                            if (metric.key === "change_3m" || metric.key === "revenue_growth" || metric.key === "roe" || metric.key === "operating_margin") {
                                                                                const nVal = parseFloat(String(val || "0"));
                                                                                const color = nVal > 0 ? "text-red-400" : nVal < 0 ? "text-blue-400" : "text-gray-300";
                                                                                const sign = nVal > 0 ? "?? : nVal < 0 ? "?? : "";
                                                                                return <span className={`${color} font-bold`}>{sign} {val ?? "N/A"}</span>;
                                                                            }
                                                                            return <span>{val ?? "N/A"}</span>;
                                                                        })()}
                                                                        {isBest ? <span className="ml-1 text-[8px]">?몣</span> : null}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Visual Bars */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {["roe", "operating_margin", "change_3m"].map(metric => {
                                            const label = peerData.metrics_labels?.[metric] || metric;
                                            const maxVal = Math.max(...peerData.data.map((s: any) => Math.abs(parseFloat(s[metric]) || 0)), 1);
                                            return (
                                                <div key={metric} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                                    <h4 className="text-xs text-gray-500 font-bold mb-3">{label}</h4>
                                                    {peerData.data.map((s: any) => {
                                                        const val = parseFloat(s[metric]) || 0;
                                                        const w = Math.abs(val) / maxVal * 100;
                                                        return (
                                                            <div key={s.symbol} className="flex items-center gap-2 mb-2">
                                                                <span className="text-xs text-gray-400 w-16 truncate">{s.name?.slice(0, 4)}</span>
                                                                <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${val >= 0 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${w}%` }} />
                                                                </div>
                                                                <span className={`text-xs font-bold w-12 text-right ${val >= 0 ? "text-green-400" : "text-red-400"}`}>{val}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : !peerLoading && (
                                <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <Users className="w-12 h-12 text-orange-400/30 mx-auto mb-4" />
                                    <p className="text-gray-500">鍮꾧탳??醫낅ぉ 肄붾뱶瑜??낅젰?섏꽭??/p>
                                    <p className="text-xs text-gray-600 mt-2">理쒕? 5媛?醫낅ぉ 쨌 PER/PBR/ROE/?깆옣瑜???/p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <AIDisclaimer className="mt-12 opacity-60" />
                <p className="text-center text-[10px] text-gray-700 mt-6 font-bold tracking-tight opacity-40">
                    v4.9.5 PRECISION-SYNC (Deep-Sector-Matrix)
                </p>
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex flex-col items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-4" /><p className="text-gray-400 font-bold">濡쒕뵫 以?..</p></div>}>
            <AnalysisContent />
        </Suspense>
    );
}

