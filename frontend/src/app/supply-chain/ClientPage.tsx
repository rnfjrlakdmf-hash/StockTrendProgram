"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, Network, Loader2, ArrowRight, X, ExternalLink, Activity } from "lucide-react";
import AdRewardModal from "@/components/AdRewardModal";
import { isFreeModeEnabled } from "@/lib/adminMode";
import { checkReward } from "@/lib/reward";

export default function ClientPage({ initialQuery }: { initialQuery?: string }) {
    // [Restored] State for Supply Chain Map
    const [searchInput, setSearchInput] = useState(initialQuery || "");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [showAdModal, setShowAdModal] = useState(false);
    const [hasPaid, setHasPaid] = useState(false);
    
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [nodeDetail, setNodeDetail] = useState<any>(null);
    const [nodeLoading, setNodeLoading] = useState(false);

    // [Cache & Autocomplete]
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (!searchInput) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(searchInput)}`);
                const json = await res.json();
                if (json.status === "success") setSearchResults(json.data);
            } catch (e) {}
        }, 200);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const SUPPLY_CACHE: Record<string, { data: any, timestamp: number }> = useMemo(() => ({}), []);

    const prefetchSupply = async (sym: string) => {
        const ticker = sym.toUpperCase();
        if (SUPPLY_CACHE[ticker]) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/supply-chain/${ticker}`);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                SUPPLY_CACHE[ticker] = { data: json.data, timestamp: Date.now() };
            }
        } catch (e) {}
    };

    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (targetSymbol?: string) => {
        const query = (targetSymbol || searchInput).toUpperCase();
        if (!query) return;

        // Check for Pro Mode or Active Reward
        if (!isFreeModeEnabled() && !checkReward()) {
            setShowAdModal(true);
            return;
        }

        // [Cache Check]
        if (SUPPLY_CACHE[query]) {
            setData(SUPPLY_CACHE[query].data);
            setError(null);
            setLoading(false);
            
            // Background update
            try {
                fetch(`${API_BASE_URL}/api/analysis/supply-chain/${query}`)
                    .then(r => r.json())
                    .then(json => {
                        if (json.status === "success" && json.data) {
                            SUPPLY_CACHE[query] = { data: json.data, timestamp: Date.now() };
                            setData(json.data);
                        }
                    });
            } catch(e) {}
            return;
        }

        setLoading(true);
        setData(null);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/supply-chain/${query}`);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                SUPPLY_CACHE[query] = { data: json.data, timestamp: Date.now() };
                setData(json.data);
            } else {
                setError(json.message || "공급망 데이터를 불러오는 데 실패했습니다.");
            }
        } catch (e) {
            console.error(e);
            setError("데이터 요청 중 네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-search on mount if initialQuery is provided
    useEffect(() => {
        if (initialQuery && !data && !loading && !error) {
            handleSearch(initialQuery);
        }
    }, [initialQuery]);

    const handleAdReward = () => {
        setHasPaid(true);
        setShowAdModal(false);
        if (searchInput) setTimeout(handleSearch, 100);
    };

    const handleNodeClick = async (node: any) => {
        setSelectedNode(node);
        setNodeLoading(true);
        setNodeDetail(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/supply-chain/detail/${encodeURIComponent(node.ticker || node.id)}?name=${encodeURIComponent(node.label)}`);
            const json = await res.json();
            if (json.status === "success") {
                setNodeDetail(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setNodeLoading(false);
        }
    };

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="Global Value Chain Map" subtitle="전 세계 공급망 및 나비효과 분석" />

            <AdRewardModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onReward={handleAdReward}
                featureName="Supply Chain Map"
            />

            <div className="p-6 max-w-7xl mx-auto space-y-8">

                {/* Search Section */}
                <div className="max-w-2xl mx-auto relative">
                    <label className="block text-sm text-gray-400 mb-2 ml-1">🏢 기업 공급망 분석</label>
                    <div className="relative z-50">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setShowResults(true);
                            }}
                            onFocus={() => setShowResults(true)}
                            onBlur={() => setTimeout(() => setShowResults(false), 200)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="티커 입력 (예: TSLA, AAPL)..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        
                        {/* [Autocomplete Dropdown] */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                {searchResults.map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        onMouseEnter={() => prefetchSupply(item.symbol)}
                                        onClick={() => {
                                            setSearchInput(item.symbol);
                                            setShowResults(false);
                                            handleSearch(item.symbol);
                                        }}
                                        className="px-4 py-3 hover:bg-gray-800 cursor-pointer flex justify-between items-center transition-colors border-b border-gray-800/50 last:border-0"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-sm">{item.name}</span>
                                            <span className="text-xs text-gray-500 font-mono mt-0.5">{item.symbol}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => handleSearch()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        >
                            Map It
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin mb-4 text-cyan-500" />
                        <p className="animate-pulse text-lg text-cyan-500">
                            AI가 전 세계 공급망 데이터를 연결 중입니다...
                        </p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="p-6 rounded-2xl bg-red-900/20 border border-red-500/30 text-center max-w-lg">
                            <h3 className="text-red-400 font-bold mb-2 text-lg">⚠️ 분석 실패</h3>
                            <p className="text-red-200/80">{error}</p>
                            <button 
                                onClick={() => handleSearch()}
                                className="mt-6 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-6 py-2 rounded-xl transition-colors font-bold text-sm"
                            >
                                다시 시도하기
                            </button>
                        </div>
                    </div>
                )}

                {/* [VIEW 1] Supply Chain Map */}
                {data && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-6">

                        {/* 1. Commodity Navigator (Macro & Raw Material Exposure Cards) */}
                        {data.commodities && data.commodities.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-sm font-black text-gray-400 uppercase tracking-wider">
                                        🌐 핵심 원자재 및 거시 리스크 (Macro Exposure)
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {data.commodities.map((comm: any, idx: number) => {
                                        const isBenefit = comm.type === 'Benefit';
                                        return (
                                            <div
                                                key={idx}
                                                className={`p-4 rounded-2xl border backdrop-blur-md transition-all hover:scale-[1.01] shadow-lg flex flex-col justify-between gap-3 ${
                                                    isBenefit
                                                        ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                                                        : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                                                }`}
                                            >
                                                {/* Card Header: Icon, Type Badge, Name, Price */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{isBenefit ? '📈' : '⚠️'}</span>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                                                                    isBenefit
                                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                                }`}>
                                                                    {isBenefit ? '수혜 원자재' : '리스크 원자재'}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-base font-black text-white mt-1">
                                                                {comm.name}
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    {/* Price & Change */}
                                                    {comm.change_display && (
                                                        <div className="text-right">
                                                            <span className={`text-xs font-mono font-black px-2 py-1 rounded-lg bg-black/40 border border-white/10 ${
                                                                comm.change_value > 0 ? "text-rose-400" : "text-blue-400"
                                                            }`}>
                                                                {comm.change_display}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Impact Reason */}
                                                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 text-xs text-gray-200 leading-relaxed font-medium">
                                                    {comm.reason}
                                                </div>

                                                {/* Sensitivity Info */}
                                                {comm.sensitivity && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                                                        <span className="font-bold text-yellow-400 shrink-0">민감도:</span>
                                                        <span className="truncate">{comm.sensitivity}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. Supply Chain Insight (Executive Briefing) */}
                        <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-blue-950/30 via-zinc-900/60 to-slate-900/40 border border-blue-500/20 backdrop-blur-md shadow-lg">
                            <h3 className="text-blue-300 font-bold mb-3 flex items-center gap-2 text-sm md:text-base">
                                <span className="text-lg">💡</span> 핵심 공급망 인사이트 (Supply Chain Insight)
                            </h3>
                            <ul className="space-y-2 text-gray-200 text-xs md:text-sm leading-relaxed">
                                {String(data.summary || "").split('\n').map((line: string, i: number) => {
                                    const cleanLine = line.replace(/^[\-\*•\d\.]+\s*/, '').trim();
                                    if (!cleanLine) return null;
                                    return (
                                        <li key={i} className="flex items-start gap-2.5">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                            <span>{cleanLine}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* 3. Visualization Canvas: 3-Column Value Chain Map */}
                        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-xl p-4 sm:p-6 md:p-8 flex flex-col lg:flex-row justify-between items-stretch gap-6 shadow-2xl">

                            {/* Left: Suppliers */}
                            <div className="w-full lg:w-[32%] flex flex-col">
                                <div className="h-full p-4 md:p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-emerald-500/20">
                                            <h3 className="text-emerald-400 font-black text-sm md:text-base flex items-center gap-2">
                                                <span>🏢 주요 공급사 (Suppliers)</span>
                                            </h3>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                                        </div>

                                        <div className="space-y-3">
                                            {(data.nodes || []).filter((n: any) => n.group === 'supplier').map((node: any) => {
                                                const link = (data.links || []).find((l: any) => l.source === node.id);
                                                const isArtery = link?.width_type === 'artery';
                                                return (
                                                    <div 
                                                        key={node.id} 
                                                        onClick={() => handleNodeClick(node)}
                                                        className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-sm hover:shadow-emerald-500/10 hover:scale-[1.01]"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                                                                    {node.label}
                                                                </h4>
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/20">
                                                                        {link?.value || "공급"}
                                                                    </span>
                                                                    {isArtery && (
                                                                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">
                                                                            핵심의존 High
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Price Badge */}
                                                            {node.price_display && (
                                                                <div className="text-right shrink-0">
                                                                    <div className="text-xs font-mono font-bold text-gray-200">
                                                                        {node.price_display}
                                                                    </div>
                                                                    <span className={`text-[11px] font-mono font-bold ${
                                                                        node.change_value > 0 ? "text-rose-400" : "text-blue-400"
                                                                    }`}>
                                                                        {node.change_display}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Themes */}
                                                        {node.themes && (
                                                            <div className="flex flex-wrap gap-1 mt-2.5">
                                                                {node.themes.map((t: string, i: number) => (
                                                                    <span key={i} className="text-[9px] bg-white/5 text-gray-300 px-1.5 py-0.5 rounded-md border border-white/5">
                                                                        #{t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Event Chip */}
                                                        {node.event && (
                                                            <div className="mt-2.5 p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-start gap-1.5 text-[10px] text-rose-200">
                                                                <span className="font-black text-rose-400 shrink-0">🚩 {node.event.d_day}</span>
                                                                <span className="truncate">{node.event.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Center: Target Stock Hub */}
                            <div className="w-full lg:w-[36%] flex flex-col items-center justify-center py-4 lg:py-0 order-first lg:order-none">
                                <div className="w-full max-w-sm flex flex-col items-center">
                                    
                                    {/* D-Day Target Event Banner (Centered above Core) */}
                                    {(data.nodes || []).find((n: any) => n.group === 'target')?.event && (
                                        <div className="mb-4 w-full bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-400/40 text-center animate-pulse">
                                            <div className="flex items-center justify-center gap-1.5 font-black">
                                                <span>🚩</span>
                                                <span>{(data.nodes || []).find((n: any) => n.group === 'target')?.event.d_day}</span>
                                                <span className="text-white/80">|</span>
                                                <span>{(data.nodes || []).find((n: any) => n.group === 'target')?.event.name}</span>
                                            </div>
                                            {(data.nodes || []).find((n: any) => n.group === 'target')?.event.date && (
                                                <div className="text-[10px] text-rose-200 mt-0.5">
                                                    {(data.nodes || []).find((n: any) => n.group === 'target')?.event.date}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Target Central Hub Node */}
                                    <div 
                                        onClick={() => handleNodeClick((data.nodes || []).find((n: any) => n.group === 'target'))}
                                        className="w-56 h-56 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.4)] border-4 border-cyan-400/80 p-6 text-center cursor-pointer group hover:scale-105 transition-all duration-300 relative"
                                    >
                                        <span className="text-xs font-black text-cyan-200 uppercase tracking-widest mb-1">
                                            분석 핵심 기업
                                        </span>
                                        
                                        <h2 className="text-lg md:text-xl font-black text-white leading-tight break-keep group-hover:underline underline-offset-4 decoration-cyan-300">
                                            {(data.nodes || []).find((n: any) => n.group === 'target')?.label || data.symbol || "Target"}
                                        </h2>
                                        
                                        {/* Themes */}
                                        {(data.nodes || []).find((n: any) => n.group === 'target')?.themes && (
                                            <div className="flex flex-wrap justify-center gap-1 my-2">
                                                {(data.nodes || []).find((n: any) => n.group === 'target')?.themes.map((t: string, i: number) => (
                                                    <span key={i} className="text-[9px] bg-black/30 text-cyan-100 px-2 py-0.5 rounded-full border border-white/20 font-bold">
                                                        #{t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Price */}
                                        {(data.nodes || []).find((n: any) => n.group === 'target')?.price_display && (
                                            <div className="mt-1 bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/20 backdrop-blur-md">
                                                <span className="text-sm font-bold font-mono text-white mr-1.5">
                                                    {(data.nodes || []).find((n: any) => n.group === 'target')?.price_display}
                                                </span>
                                                <span className={`text-xs font-bold font-mono ${
                                                    (data.nodes || []).find((n: any) => n.group === 'target')?.change_value > 0 
                                                        ? "text-rose-300" 
                                                        : "text-blue-300"
                                                }`}>
                                                    {(data.nodes || []).find((n: any) => n.group === 'target')?.change_display || ""}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Competitors & Clients */}
                            <div className="w-full lg:w-[32%] flex flex-col gap-4">
                                
                                {/* 1. Competitors (Rivals) */}
                                <div className="p-4 md:p-5 rounded-2xl border border-rose-500/20 bg-rose-950/10 backdrop-blur-sm">
                                    <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-rose-500/20">
                                        <h3 className="text-rose-400 font-black text-sm md:text-base flex items-center gap-2">
                                            <span>⚔️ 주요 경쟁사 (Rivals)</span>
                                        </h3>
                                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
                                    </div>

                                    <div className="space-y-3">
                                        {(data.nodes || []).filter((n: any) => n.group === 'competitor').map((node: any) => (
                                            <div 
                                                key={node.id}
                                                onClick={() => handleNodeClick(node)}
                                                className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-rose-500/50 transition-all cursor-pointer group shadow-sm hover:shadow-rose-500/10 hover:scale-[1.01]"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors truncate">
                                                            {node.label}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                                                            {node.market_share && (
                                                                <span className="bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/30">
                                                                    점유율 {node.market_share}
                                                                </span>
                                                            )}
                                                            <span>경쟁 관계</span>
                                                        </div>
                                                    </div>

                                                    {/* Price Badge */}
                                                    {node.price_display && (
                                                        <div className="text-right shrink-0">
                                                            <div className="text-xs font-mono font-bold text-gray-200">
                                                                {node.price_display}
                                                            </div>
                                                            <span className={`text-[11px] font-mono font-bold ${
                                                                node.change_value > 0 ? "text-rose-400" : "text-blue-400"
                                                            }`}>
                                                                {node.change_display}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Themes */}
                                                {node.themes && (
                                                    <div className="flex flex-wrap gap-1 mt-2.5">
                                                        {node.themes.map((t: string, i: number) => (
                                                            <span key={i} className="text-[9px] bg-white/5 text-gray-300 px-1.5 py-0.5 rounded-md border border-white/5">
                                                                #{t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Customers (Clients) */}
                                <div className="p-4 md:p-5 rounded-2xl border border-blue-500/20 bg-blue-950/10 backdrop-blur-sm">
                                    <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-blue-500/20">
                                        <h3 className="text-blue-400 font-black text-sm md:text-base flex items-center gap-2">
                                            <span>🤝 주요 고객사 (Clients)</span>
                                        </h3>
                                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#60a5fa]" />
                                    </div>

                                    <div className="space-y-3">
                                        {(data.nodes || []).filter((n: any) => n.group === 'customer').map((node: any) => {
                                            const link = (data.links || []).find((l: any) => l.target === node.id);
                                            const isArtery = link?.width_type === 'artery';
                                            return (
                                                <div 
                                                    key={node.id}
                                                    onClick={() => handleNodeClick(node)}
                                                    className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer group shadow-sm hover:shadow-blue-500/10 hover:scale-[1.01]"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                                                                {node.label}
                                                            </h4>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-bold border border-blue-500/20">
                                                                    {link?.value || "매출처"}
                                                                </span>
                                                                {isArtery && (
                                                                    <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded font-bold border border-blue-500/30">
                                                                        주요 계약 Major
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Price Badge */}
                                                        {node.price_display && (
                                                            <div className="text-right shrink-0">
                                                                <div className="text-xs font-mono font-bold text-gray-200">
                                                                    {node.price_display}
                                                                </div>
                                                                <span className={`text-[11px] font-mono font-bold ${
                                                                    node.change_value > 0 ? "text-rose-400" : "text-blue-400"
                                                                }`}>
                                                                    {node.change_display}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Themes */}
                                                    {node.themes && (
                                                        <div className="flex flex-wrap gap-1 mt-2.5">
                                                            {node.themes.map((t: string, i: number) => (
                                                                <span key={i} className="text-[9px] bg-white/5 text-gray-300 px-1.5 py-0.5 rounded-md border border-white/5">
                                                                    #{t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Event Chip */}
                                                    {node.event && (
                                                        <div className="mt-2.5 p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-start gap-1.5 text-[10px] text-rose-200">
                                                            <span className="font-black text-rose-400 shrink-0">🚩 {node.event.d_day}</span>
                                                            <span className="truncate">{node.event.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* [NEW] Node Detail Modal */}
                {selectedNode && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className={`p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r ${
                                selectedNode.group === 'supplier' ? 'from-green-900/40 to-transparent' :
                                selectedNode.group === 'customer' ? 'from-blue-900/40 to-transparent' :
                                selectedNode.group === 'competitor' ? 'from-red-900/40 to-transparent' :
                                'from-cyan-900/40 to-transparent'
                            }`}>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black text-white">{selectedNode.label}</h2>
                                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400 font-mono">
                                            {selectedNode.ticker || selectedNode.id}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">AI 공급망 상세 분석 리포트</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedNode(null)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                                >
                                    <X className="w-6 h-6 text-gray-400 group-hover:text-white" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                                {nodeLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
                                        <p className="text-gray-400 animate-pulse">상세 분석 데이터를 가져오는 중...</p>
                                    </div>
                                ) : nodeDetail ? (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {/* 1. Summary */}
                                        <section>
                                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-cyan-500" /> 전략 요약
                                            </h3>
                                            <p className="text-white text-lg leading-relaxed font-bold break-keep">
                                                {typeof nodeDetail.summary === 'string' ? nodeDetail.summary : JSON.stringify(nodeDetail.summary)}
                                            </p>
                                        </section>

                                        {/* 2. News Analysis */}
                                        <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">최신 이슈 분석</h3>
                                            <div className="space-y-3">
                                                {nodeDetail.news_analysis.map((point: string, i: number) => (
                                                    <div key={i} className="flex gap-3 text-gray-200">
                                                        <span className="text-cyan-500 font-bold">Q{i+1}.</span>
                                                        <p className="text-sm leading-relaxed">{point}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* 3. Financials (If available) */}
                                        {(selectedNode.market_cap || selectedNode.operating_margin) && (
                                            <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">재무 지표</h3>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                                                        <div className="text-[10px] text-gray-400 mb-1">시가총액</div>
                                                        <div className="text-sm font-bold text-white">{selectedNode.market_cap !== 'N/A' ? (selectedNode.market_cap / 1e9).toFixed(1) + 'B' : 'N/A'}</div>
                                                    </div>
                                                    <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                                                        <div className="text-[10px] text-gray-400 mb-1">영업이익률</div>
                                                        <div className="text-sm font-bold text-white">{selectedNode.operating_margin}</div>
                                                    </div>
                                                    <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                                                        <div className="text-[10px] text-gray-400 mb-1">PER</div>
                                                        <div className="text-sm font-bold text-white">{typeof selectedNode.pe_ratio === 'number' ? selectedNode.pe_ratio.toFixed(1) : selectedNode.pe_ratio}</div>
                                                    </div>
                                                </div>
                                            </section>
                                        )}

                                        {/* 4. Themes & Tip */}
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <section>
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">핵심 테마</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {nodeDetail.themes.map((theme: string, i: number) => (
                                                        <span key={i} className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-xl text-sm font-bold border border-cyan-500/20">
                                                            {theme}
                                                        </span>
                                                    ))}
                                                </div>
                                            </section>
                                            <section>
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">전략적 데이터 인사이트</h3>
                                                <div className="bg-slate-500/10 border border-slate-500/20 p-3 rounded-xl">
                                                    <p className="text-slate-300 text-sm font-bold break-keep">
                                                        🔍 {nodeDetail.analysis_point}
                                                    </p>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-500">
                                        데이터를 불러올 수 없습니다. 다시 시도해 주세요.
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
                                <div className="text-xs text-gray-500">
                                    * AI 분석은 참고용이며 투자 판단의 책임은 본인에게 있습니다.
                                </div>
                                <a 
                                    href={`/stock/${selectedNode.ticker || selectedNode.id}`}
                                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-bold transition-colors"
                                >
                                    종목 상세 페이지 <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                )}


            </div>
        </div>
    );
}
