"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, Network, Loader2, ArrowRight } from "lucide-react";
import AdRewardModal from "@/components/AdRewardModal";

import { isFreeModeEnabled } from "@/lib/adminMode";

export default function SupplyChainPage() {
    const [scenarioInput, setScenarioInput] = useState("");
    const [scenarioTarget, setScenarioTarget] = useState(""); // New state for target company
    const [scenarioData, setScenarioData] = useState<any>(null);
    const [scenarioLoading, setScenarioLoading] = useState(false);

    // [Restored] State for Supply Chain Map
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [showAdModal, setShowAdModal] = useState(false);
    const [hasPaid, setHasPaid] = useState(false);

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

    const handleScenarioSearch = async () => {
        if (!scenarioInput) return;

        // Pro check for Scenario too? Let's keep it free for now or same logic
        const isPro = localStorage.getItem("isPro") === "true";
        if (!isPro && !isFreeModeEnabled() && !hasPaid) {
            setShowAdModal(true);
            return;
        }

        setScenarioLoading(true);
        setScenarioData(null);
        // setData(null); // Do not clear main map when simulating scenario
        try {
            let url = `${API_BASE_URL}/api/supply-chain/scenario/${encodeURIComponent(scenarioInput)}`;
            // Use specific scenarioTarget instead of searchInput
            if (scenarioTarget) {
                url += `?symbol=${encodeURIComponent(scenarioTarget)}`;
            }
            const res = await fetch(url);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                setScenarioData(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setScenarioLoading(false);
        }
    };

    const handleAdReward = () => {
        setHasPaid(true);
        setShowAdModal(false);
        if (searchInput) setTimeout(handleSearch, 100);
        else if (scenarioInput) setTimeout(handleScenarioSearch, 100);
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

                {/* Search Section (Dual Mode) */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Standard Supply Chain Search */}
                    <div className="relative">
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

                    {/* Butterfly Effect Search */}
                    <div className="relative">
                        <label className="block text-sm text-gray-400 mb-2 ml-1">🌪️ 나비효과 시뮬레이터 (What If?)</label>
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    value={scenarioInput}
                                    onChange={(e) => setScenarioInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleScenarioSearch()}
                                    placeholder="사건 입력 (예: 금리인상, 전쟁)..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                />
                                <Network className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            </div>

                            {/* Optional Target Company Input */}
                            <div className="relative w-1/3">
                                <input
                                    type="text"
                                    value={scenarioTarget}
                                    onChange={(e) => setScenarioTarget(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleScenarioSearch()}
                                    placeholder="타겟 기업 (선택)..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-3 pr-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                                />
                            </div>

                            <button
                                onClick={handleScenarioSearch}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
                            >
                                Simulate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {(loading || scenarioLoading) && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin mb-4 text-cyan-500" />
                        <p className="animate-pulse text-lg text-cyan-500">
                            {loading ? "AI가 전 세계 공급망 데이터를 연결 중입니다..." : "AI가 인과관계의 나비효과를 추적 중입니다..."}
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
                                                                <span className="text-gray-200 group-hover:text-white font-bold transition-colors cursor-pointer">{node.label}</span>
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
                                    <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.4)] border-4 border-white transform hover:scale-105 transition-transform cursor-pointer group z-10 relative">
                                        <span className="text-2xl md:text-3xl font-black text-white text-center px-4 break-keep leading-tight">
                                            {data.nodes.find((n: any) => n.group === 'target')?.label}
                                        </span>
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
                                                    <span className="text-gray-200 group-hover:text-white font-bold transition-colors cursor-pointer text-lg md:text-base">{node.label}</span>
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
                                                            <span className="text-gray-200 group-hover:text-white font-bold transition-colors cursor-pointer text-lg md:text-base">{node.label}</span>
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

                {/* [VIEW 2] Butterfly Effect Simulator */}
                {scenarioData && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 bg-black/40 border border-purple-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(168,85,247,0.1)]">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center gap-2">
                                🌪️ 나비효과 시뮬레이션
                            </h2>
                            <p className="text-gray-400 mt-2">"{scenarioInput}"(으)로 시작된 거대한 변화</p>
                            <div className="mt-4 p-3 bg-purple-900/20 text-purple-200 rounded-xl inline-block border border-purple-500/20">
                                {scenarioData.summary}
                            </div>
                        </div>

                        {/* Valid Path Visualization (Wrapped Layout) */}
                        <div className="w-full px-4">
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                {/* Steps */}
                                {scenarioData.paths.map((step: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-40 md:w-48 bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors">
                                            <div className="text-xl mb-2">{idx === 0 ? '🌪️' : idx % 2 === 0 ? '📉' : '📈'}</div>
                                            <div className="font-bold text-white mb-1 text-sm break-keep leading-tight">{step.step}</div>
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${step.impact?.includes('UP') || step.impact?.includes('Positive') ? 'bg-green-500/20 text-green-400' :
                                                step.impact?.includes('DOWN') || step.impact?.includes('Negative') ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {step.impact}
                                            </div>
                                        </div>
                                        {/* Arrow (Hidden on last step) */}
                                        <ArrowRight className="text-gray-600 w-5 h-5" />
                                    </div>
                                ))}

                                {/* Final Arrow (Pulse) */}
                                <ArrowRight className="text-purple-500 w-8 h-8 animate-pulse" />

                                {/* Final Stocks */}
                                {scenarioData.final_stocks.map((stock: any, idx: number) => (
                                    <div key={idx} className="w-56 bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/50 p-6 rounded-2xl flex flex-col items-center text-center shadow-[0_0_30px_rgba(168,85,247,0.3)] transform hover:scale-105 transition-transform cursor-pointer">
                                        <div className="text-xs text-purple-300 mb-1">최종 수혜주</div>
                                        <div className="text-2xl font-black text-white mb-2">{stock.name}</div>
                                        <div className="text-xs text-gray-300 bg-black/40 px-2 py-1 rounded mb-2">{stock.symbol}</div>
                                        <div className="text-xs text-gray-400 leading-tight line-clamp-2">
                                            "{stock.reason}"
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
