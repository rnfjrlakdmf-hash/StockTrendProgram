"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, Network, Loader2, ArrowRight } from "lucide-react";

export default function SupplyChainPage() {
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const handleSearch = async () => {
        if (!searchInput) return;
        setLoading(true);
        setData(null);
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

    return (
        <div className="min-h-screen pb-10">
            <Header />

            <div className="p-6 max-w-6xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-white flex items-center justify-center gap-3">
                        <Network className="w-10 h-10 text-cyan-500" />
                        Global Value Chain Map
                    </h1>
                    <p className="text-gray-400 text-lg">
                        기업의 생태계를 한눈에. 공급망, 고객사, 경쟁사를 연결해보세요.
                    </p>
                </div>

                <div className="relative max-w-xl mx-auto">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="티커 입력 (예: TSLA, AAPL)..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-lg focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6" />
                    <button
                        onClick={handleSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    >
                        Map It
                    </button>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-cyan-500">
                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                        <p className="animate-pulse text-lg">AI가 전 세계 공급망 데이터를 연결 중입니다...</p>
                    </div>
                )}

                {data && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                        {/* Explanation */}
                        <div className="mb-6 p-4 rounded-xl bg-cyan-900/10 border border-cyan-500/20 text-center text-cyan-200">
                            {data.summary}
                        </div>

                        {/* Visualization Canvas (Simple CSS Node Graph) */}
                        <div className="relative min-h-[600px] rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden p-10 flex items-center justify-center">

                            {/* Central Node (Target) */}
                            <div className="z-20 relative">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.5)] border-4 border-white transform hover:scale-110 transition-transform cursor-pointer group">
                                    <span className="text-2xl font-black text-white">{data.nodes.find((n: any) => n.group === 'target')?.label}</span>
                                    <div className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-cyan-300 font-bold w-full text-center">Me</div>
                                </div>
                            </div>

                            {/* Lines (SVG Overlay) - Simplified visual representation */}
                            {/* NOTE: Real implementation would use D3.js or react-flow for complex dynamic layout.
                                Here we simply position predefined groups relative to center using absolute positioning for a static-ish looks good feel. */}

                            {/* Suppliers (Top Left) */}
                            <div className="absolute top-10 left-10 p-6 rounded-2xl border border-dashed border-green-500/30 bg-green-500/5">
                                <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">Build With (Suppliers) <ArrowRight className="w-4 h-4" /></h3>
                                <div className="space-y-4">
                                    {data.nodes.filter((n: any) => n.group === 'supplier').map((node: any) => (
                                        <div key={node.id} className="flex items-center gap-3 group">
                                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                            <span className="text-gray-300 group-hover:text-white transition-colors cursor-pointer">{node.label}</span>
                                            <span className="text-xs text-gray-500 hidden group-hover:inline-block animate-in fade-in">
                                                - {data.links.find((l: any) => l.source === node.id)?.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Customers (Bottom Right) */}
                            <div className="absolute bottom-10 right-10 p-6 rounded-2xl border border-dashed border-blue-500/30 bg-blue-500/5 text-right">
                                <h3 className="text-blue-400 font-bold mb-4 flex items-center justify-end gap-2"><ArrowRight className="w-4 h-4" /> Sell To (Customers)</h3>
                                <div className="space-y-4">
                                    {data.nodes.filter((n: any) => n.group === 'customer').map((node: any) => (
                                        <div key={node.id} className="flex items-center justify-end gap-3 group">
                                            <span className="text-xs text-gray-500 hidden group-hover:inline-block animate-in fade-in">
                                                {data.links.find((l: any) => l.target === node.id)?.value} -
                                            </span>
                                            <span className="text-gray-300 group-hover:text-white transition-colors cursor-pointer">{node.label}</span>
                                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Competitors (Top Right) */}
                            <div className="absolute top-10 right-10 p-6 rounded-2xl border border-dashed border-red-500/30 bg-red-500/5">
                                <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">Fight With (Competitors)</h3>
                                <div className="space-y-4">
                                    {data.nodes.filter((n: any) => n.group === 'competitor').map((node: any) => (
                                        <div key={node.id} className="flex items-center gap-3 group">
                                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                            <span className="text-gray-300 group-hover:text-white transition-colors cursor-pointer">{node.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Decorative Connecting Lines (SVG) - Abstracted */}
                            <svg className="absolute inset-0 pointer-events-none opacity-20">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#fff" />
                                    </marker>
                                </defs>
                                {/* Just some decorative lines radiating from center */}
                                <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="white" strokeWidth="1" strokeDasharray="5,5" />
                                <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="white" strokeWidth="1" strokeDasharray="5,5" />
                                <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="red" strokeWidth="1" strokeDasharray="2,2" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
