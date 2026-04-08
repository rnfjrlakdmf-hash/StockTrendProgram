"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, Network, Loader2, ArrowRight, X, ExternalLink, Activity } from "lucide-react";
import AdRewardModal from "@/components/AdRewardModal";

import { isFreeModeEnabled } from "@/lib/adminMode";

export default function SupplyChainPage() {
    // [Restored] State for Supply Chain Map
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [showAdModal, setShowAdModal] = useState(false);
    const [hasPaid, setHasPaid] = useState(false);
    
    // [New] Node Detail Modal State
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [nodeDetail, setNodeDetail] = useState<any>(null);
    const [nodeLoading, setNodeLoading] = useState(false);

    const handleSearch = async () => {
        if (!searchInput) return;

        // Check for Pro Mode
        const isPro = localStorage.getItem("isPro") === "true";
        if (!isPro && !isFreeModeEnabled() && !hasPaid) {
            setShowAdModal(true);
            return;
        }

        setLoading(true);
        setData(null);
        // setScenarioData(null); // Do not clear scenario when searching company
        try {
            const res = await fetch(`${API_BASE_URL}/api/supply-chain/${searchInput.toUpperCase()}`);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                setData(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

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
            const res = await fetch(`${API_BASE_URL}/api/supply-chain/detail/${encodeURIComponent(node.ticker || node.id)}?name=${encodeURIComponent(node.label)}`);
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
                    <div className="relative">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="티커 입력 (예: TSLA, AAPL)..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        <button
                            onClick={handleSearch}
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

                {/* [VIEW 1] Supply Chain Map */}
                {data && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-6">

                        {/* 1. Commodity Navigator (Planets) */}
                        {data.commodities && data.commodities.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-8 py-6">
                                {data.commodities.map((comm: any, idx: number) => (
                                    <div key={idx} className={`relative group cursor-pointer flex flex-col items-center`}>
                                        <div className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-transform transform group-hover:scale-110 ${comm.type === 'Benefit' ? 'border-green-500 shadow-green-500/30' : 'border-red-500 shadow-red-500/30'
                                            }`}>
                                            <div className="text-2xl mb-1">
                                                {comm.type === 'Benefit' ? '📈' : '⚠️'}
                                            </div>
                                            <span className={`text-xs font-bold mb-1 ${comm.type === 'Benefit' ? 'text-green-400' : 'text-red-400'}`}>
                                                {comm.type === 'Benefit' ? '수혜 (Benefit)' : '리스크 (Risk)'}
                                            </span>
                                            <span className="font-bold text-xl text-white text-center leading-tight px-2 break-keep">
                                                {comm.name}
                                            </span>
                                            <div className="mt-2 text-sm font-mono bg-black/40 px-2 py-0.5 rounded">
                                                <span className={comm.change_value > 0 ? "text-red-400" : "text-blue-400"}>
                                                    {comm.change_display}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Reason Bubble (Always visible or heavily accented) */}
                                        <div className={`mt-3 px-4 py-2 rounded-xl text-sm font-bold text-center border break-keep max-w-[180px] shadow-lg ${comm.type === 'Benefit'
                                            ? 'bg-green-900/40 border-green-500/30 text-green-100'
                                            : 'bg-red-900/40 border-red-500/30 text-red-100'
                                            }`}>
                                            {comm.reason}
                                        </div>

                                        {/* Connecting Line (Visual Only) */}
                                        <div className={`absolute left-1/2 bottom-16 w-0.5 h-10 translate-y-full -translate-x-1/2 -z-10 bg-gradient-to-b ${comm.type === 'Benefit' ? 'from-green-500 to-transparent' : 'from-red-500 to-transparent'
                                            }`} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Explanation */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 backdrop-blur-md shadow-lg">
                            <h3 className="text-cyan-300 font-bold mb-3 flex items-center gap-2">
                                <span className="text-xl">📊</span> Supply Chain Insight
                            </h3>
                            <ul className="space-y-2 text-cyan-100/90 text-sm leading-relaxed">
                                {data.summary.split('\n').map((line: string, i: number) => {
                                    const cleanLine = line.replace(/^[\-\*•\d\.]+\s*/, '').trim();
                                    if (!cleanLine) return null;
                                    return (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                                            <span>{cleanLine}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Visualization Canvas */}
                        <div className="relative min-h-[600px] rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden p-6 md:p-10 flex flex-col lg:flex-row justify-between items-center lg:items-stretch gap-8">

                            {/* Decorative Lines */}
                            <svg className="hidden lg:block absolute inset-0 pointer-events-none opacity-30 z-0">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#fff" />
                                    </marker>
                                </defs>
                                {/* Dynamic Links would be hard to SVG strictly here without coordinates. 
                                    So we use the list rendering below for lines logic conceptually or keep simple BG lines. 
                                    For MVP, we stick to the column layout but enhance the list items visually. 
                                */}
                            </svg>

                            {/* Left: Suppliers */}
                            <div className="z-10 w-full lg:w-1/3 flex flex-col justify-center">
                                <div className="p-6 rounded-2xl border border-dashed border-green-500/30 bg-green-500/5 backdrop-blur-sm">
                                    <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">공급사 (Suppliers) <ArrowRight className="w-4 h-4" /></h3>
                                    <div className="space-y-6">
                                        {data.nodes.filter((n: any) => n.group === 'supplier').map((node: any) => {
                                            const link = data.links.find((l: any) => l.source === node.id);
                                            const isArtery = link?.width_type === 'artery';
                                            return (
                                                <div key={node.id} className="relative group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] ${isArtery ? 'w-4 h-4 ring-2 ring-green-300' : 'w-2 h-2'}`}></div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-center">
                                                                <span 
                                                                    onClick={() => handleNodeClick(node)}
                                                                    className="text-gray-200 group-hover:text-white font-bold transition-colors cursor-pointer hover:underline decoration-green-500/50 underline-offset-4"
                                                                >
                                                                    {node.label}
                                                                </span>
                                                                {/* Price Badge */}
                                                                {node.price_display && (
                                                                    <span className={`text-xs font-mono ml-2 ${node.change_value > 0 ? "text-red-400" : "text-blue-400"}`}>
                                                                        {node.change_display}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Relation Label & Weight */}
                                                            <div className={`text-xs mt-1 flex items-center gap-1 ${isArtery ? 'text-green-300 font-bold' : 'text-gray-500'}`}>
                                                                <span>{link?.value}</span>
                                                                {isArtery && <span className="text-[10px] bg-green-900/50 px-1 rounded">High Dep.</span>}
                                                            </div>
                                                            {/* [NEW] Themes */}
                                                            {node.themes && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {node.themes.map((t: string, i: number) => (
                                                                        <span key={i} className="text-[9px] bg-green-500/10 text-green-400/80 px-1.5 py-0.5 rounded-full border border-green-500/20">
                                                                            {t}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Event Flag */}
                                                    {node.event && (
                                                        <div className="absolute -top-4 -right-1 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg animate-bounce shadow-lg z-20 border border-white/20 min-w-max text-center">
                                                            <div>🚩 {node.event.d_day}</div>
                                                            <div className="text-[9px] font-normal opacity-90 leading-none mt-0.5 max-w-[80px] truncate">
                                                                {node.event.name}
                                                            </div>
                                                            {node.event.date && node.event.date !== 'Unknown' && (
                                                                <div className="text-[8px] text-red-100 mt-0.5 border-t border-white/20 pt-0.5">
                                                                    {node.event.date}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Center: Target Stock */}
                            <div className="z-20 w-full lg:flex-1 flex items-center justify-center py-8 lg:py-0">
                                <div className="relative">
                                    {/* Target Node */}
                                    <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(6,182,212,0.6)] border-4 border-white transform hover:scale-105 transition-transform duration-500 cursor-pointer group z-10 relative overflow-hidden">
                                        {/* Animated Polish effect */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        
                                        <span 
                                            onClick={() => handleNodeClick(data.nodes.find((n: any) => n.group === 'target'))}
                                            className="text-2xl md:text-3xl font-black text-white text-center px-4 break-keep leading-tight drop-shadow-lg group-hover:underline decoration-white/30 underline-offset-8 transition-all"
                                        >
                                            {data.nodes.find((n: any) => n.group === 'target')?.label}
                                        </span>
                                        
                                        {/* [NEW] Target Themes */}
                                        {data.nodes.find((n: any) => n.group === 'target')?.themes && (
                                            <div className="flex flex-wrap justify-center gap-1 mt-3 px-4">
                                                {data.nodes.find((n: any) => n.group === 'target')?.themes.map((t: string, i: number) => (
                                                    <span key={i} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-md border border-white/30 font-bold">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {/* Price */}
                                        {data.nodes.find((n: any) => n.group === 'target')?.price_display && (
                                            <div className="mt-2 bg-black/40 px-3 py-1 rounded-full text-sm font-mono border border-white/20 backdrop-blur-md">
                                                <span className="text-white mr-2">{data.nodes.find((n: any) => n.group === 'target')?.price_display}</span>
                                                <span className={data.nodes.find((n: any) => n.group === 'target')?.change_value > 0 ? "text-red-400" : "text-blue-400"}>
                                                    {data.nodes.find((n: any) => n.group === 'target')?.change_display}
                                                </span>
                                            </div>
                                        )}
                                        {/* Event Flag (Target) */}
                                        {data.nodes.find((n: any) => n.group === 'target')?.event && (
                                            <div className="absolute -top-4 right-10 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce shadow-xl border border-white/20">
                                                🚩 {data.nodes.find((n: any) => n.group === 'target')?.event.d_day}
                                                <div className="text-[9px] font-normal opacity-80">{data.nodes.find((n: any) => n.group === 'target')?.event.name}</div>
                                                {data.nodes.find((n: any) => n.group === 'target')?.event.date && data.nodes.find((n: any) => n.group === 'target')?.event.date !== 'Unknown' && (
                                                    <div className="text-[8px] text-red-100 mt-0.5 border-t border-white/20 pt-0.5">
                                                        {data.nodes.find((n: any) => n.group === 'target')?.event.date}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Orbit Rings (Visual) */}
                                    <div className="absolute inset-0 -m-10 border border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
                                    <div className="absolute inset-0 -m-20 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                                </div>
                            </div>

                            {/* Right: Customers & Competitors */}
                            <div className="z-10 w-full lg:w-1/3 flex flex-col justify-between gap-6">
                                {/* Competitors */}
                                <div className="p-6 rounded-2xl border border-dashed border-red-500/30 bg-red-500/5 backdrop-blur-sm">
                                    <h3 className="text-red-400 font-bold mb-4 flex items-center justify-end gap-2">경쟁사 (Rivals) <div className="w-2 h-2 rounded-full bg-red-500"></div></h3>
                                    <div className="space-y-6">
                                        {data.nodes.filter((n: any) => n.group === 'competitor').map((node: any) => (
                                            <div key={node.id} className="flex flex-col items-end gap-1 group relative">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span 
                                                        onClick={() => handleNodeClick(node)}
                                                        className="text-gray-200 group-hover:text-white font-bold transition-colors cursor-pointer text-lg md:text-base hover:underline decoration-red-500/50 underline-offset-4"
                                                    >
                                                        {node.label}
                                                    </span>
                                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                                </div>
                                                <div className="text-xs text-gray-500">{data.links.find((l: any) => l.target === node.id)?.value}</div>
                                                {/* Price Badge */}
                                                {node.price_display && (
                                                    <div className="flex items-center gap-2 text-[10px] font-mono bg-black/40 px-2 py-1 rounded-md border border-white/5">
                                                        <span className="text-gray-300">{node.price_display}</span>
                                                        <span className={node.change_value > 0 ? "text-red-400" : "text-blue-400"}>
                                                            {node.change_display}
                                                        </span>
                                                    </div>
                                                )}
                                                {/* [NEW] Themes */}
                                                {node.themes && (
                                                    <div className="flex flex-wrap justify-end gap-1 mt-1">
                                                        {node.themes.map((t: string, i: number) => (
                                                            <span key={i} className="text-[9px] bg-red-500/10 text-red-400/80 px-1.5 py-0.5 rounded-full border border-red-500/20">
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Customers */}
                                <div className="p-6 rounded-2xl border border-dashed border-blue-500/30 bg-blue-500/5 backdrop-blur-sm text-right">
                                    <h3 className="text-blue-400 font-bold mb-4 flex items-center justify-end gap-2"><ArrowRight className="w-4 h-4" /> 고객사 (Clients)</h3>
                                    <div className="space-y-6">
                                        {data.nodes.filter((n: any) => n.group === 'customer').map((node: any) => {
                                            const link = data.links.find((l: any) => l.target === node.id);
                                            const isArtery = link?.width_type === 'artery';
                                            return (
                                                <div key={node.id} className="relative group">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="flex-1 flex flex-col items-end">
                                                            <span 
                                                                onClick={() => handleNodeClick(node)}
                                                                className="text-gray-200 group-hover:text-white font-bold transition-colors cursor-pointer text-lg md:text-base hover:underline decoration-blue-500/50 underline-offset-4"
                                                            >
                                                                {node.label}
                                                            </span>
                                                            {/* Price Badge */}
                                                            {node.price_display && (
                                                                <span className={`text-xs font-mono mr-2 ${node.change_value > 0 ? "text-red-400" : "text-blue-400"}`}>
                                                                    {node.change_display}
                                                                </span>
                                                            )}
                                                            <div className={`text-xs mt-1 flex items-center gap-1 ${isArtery ? 'text-blue-300 font-bold' : 'text-gray-500'}`}>
                                                                {isArtery && <span className="text-[10px] bg-blue-900/50 px-1 rounded">Major Deal</span>}
                                                                <span>{link?.value}</span>
                                                            </div>
                                                            {/* [NEW] Themes */}
                                                            {node.themes && (
                                                                <div className="flex flex-wrap justify-end gap-1 mt-2">
                                                                    {node.themes.map((t: string, i: number) => (
                                                                        <span key={i} className="text-[9px] bg-blue-500/10 text-blue-400/80 px-1.5 py-0.5 rounded-full border border-blue-500/20">
                                                                            {t}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={`rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] ${isArtery ? 'w-4 h-4 ring-2 ring-blue-300' : 'w-2 h-2'}`}></div>
                                                    </div>
                                                    {/* Event Flag */}
                                                    {node.event && (
                                                        <div className="absolute -top-4 -left-1 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg animate-bounce shadow-lg z-20 border border-white/20 min-w-max text-center">
                                                            <div>🚩 {node.event.d_day}</div>
                                                            <div className="text-[9px] font-normal opacity-90 leading-none mt-0.5 max-w-[80px] truncate">
                                                                {node.event.name}
                                                            </div>
                                                            {node.event.date && node.event.date !== 'Unknown' && (
                                                                <div className="text-[8px] text-red-100 mt-0.5 border-t border-white/20 pt-0.5">
                                                                    {node.event.date}
                                                                </div>
                                                            )}
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
                                                {nodeDetail.summary}
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

                                        {/* 3. Themes & Tip */}
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
                                    href={`/stock-analysis?symbol=${selectedNode.ticker || selectedNode.id}`}
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
