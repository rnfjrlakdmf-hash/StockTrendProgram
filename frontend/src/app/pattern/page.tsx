"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, LineChart, TrendingUp, TrendingDown, Target, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function PatternPage() {
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]); // We need history for chart, but MVP only text. Let's try to mock or minimal.

    const handleSearch = async () => {
        if (!searchInput) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/chart/patterns/${searchInput.toUpperCase()}`);
            const json = await res.json();
            if (json.status === "success") {
                setResult(json.data);
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

            <div className="p-6 max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-white flex items-center justify-center gap-3">
                        <LineChart className="w-10 h-10 text-emerald-500" />
                        AI Chart Pattern Hunter
                    </h1>
                    <p className="text-gray-400 text-lg">
                        복잡한 차트 분석은 AI에게 맡기세요. 패턴, 지지선, 저항선을 자동으로 감지합니다.
                    </p>
                </div>

                <div className="relative max-w-xl mx-auto">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="티커 입력 (예: TQQQ, SOXL)..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-lg focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6" />
                    <button
                        onClick={handleSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    >
                        Detect
                    </button>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-500">
                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                        <p className="animate-pulse text-lg">AI가 지난 60일간의 캔들을 스캔 중입니다...</p>
                    </div>
                )}

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Signal Card */}
                        <div className="md:col-span-2 rounded-3xl bg-gradient-to-r from-gray-900 to-black border border-white/10 p-8 relative overflow-hidden flex items-center justify-between">
                            <div className="relative z-10">
                                <span className="text-emerald-400 font-bold tracking-wider text-sm uppercase mb-2 block">
                                    Detected Pattern
                                </span>
                                <h2 className="text-4xl font-black text-white mb-2">
                                    {result.pattern}
                                </h2>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${result.signal === 'Buy' ? 'bg-green-500/20 text-green-400' :
                                            result.signal === 'Sell' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {result.signal} Signal
                                    </span>
                                    <span className="text-gray-400 text-sm">
                                        Confidence: <span className="text-white font-bold">{result.confidence}%</span>
                                    </span>
                                </div>
                            </div>
                            <div className="opacity-20 hidden md:block">
                                <LineChart className="w-32 h-32 text-emerald-500" />
                            </div>
                        </div>

                        {/* Analysis Detail */}
                        <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-400" /> Key Levels
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <span className="text-red-400 font-bold flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Resistance
                                    </span>
                                    <span className="text-2xl font-bold text-white">${result.resistance}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                    <span className="text-green-400 font-bold flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Support
                                    </span>
                                    <span className="text-2xl font-bold text-white">${result.support}</span>
                                </div>
                            </div>
                        </div>

                        {/* Summary Text */}
                        <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" /> AI Commentary
                            </h3>
                            <p className="text-gray-300 leading-relaxed text-lg">
                                {result.summary}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
