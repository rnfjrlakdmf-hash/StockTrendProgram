"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Plus, Trash2, Zap, Loader2, PieChart as PieChartIcon } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function PortfolioPage() {
    const [inputSymbol, setInputSymbol] = useState("");
    const [symbols, setSymbols] = useState<string[]>([]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const addSymbol = () => {
        if (!inputSymbol) return;
        const sym = inputSymbol.toUpperCase().trim();
        if (!symbols.includes(sym)) {
            setSymbols([...symbols, sym]);
        }
        setInputSymbol("");
    };

    const removeSymbol = (sym: string) => {
        setSymbols(symbols.filter(s => s !== sym));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') addSymbol();
    };

    const runOptimization = async () => {
        if (symbols.length < 2) {
            setError("최소 2개 이상의 종목이 필요합니다.");
            return;
        }
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/api/portfolio/optimize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symbols }),
            });
            const json = await res.json();

            if (json.status === "success") {
                setResult(json);
            } else {
                setError(json.message || "Optimization failed");
            }
        } catch (err) {
            setError("Server connection failed");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="AI 포트폴리오 최적화" subtitle="Efficient Frontier 기반 최적 자산 배분" />

            <div className="p-6 max-w-6xl mx-auto space-y-8">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Input Section */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="rounded-3xl bg-black/40 border border-white/20 p-6 shadow-lg h-full">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Plus className="text-blue-400" /> 종목 구성
                            </h3>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Symbol (ex: AAPL)"
                                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                                    value={inputSymbol}
                                    onChange={(e) => setInputSymbol(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button
                                    onClick={addSymbol}
                                    className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-3 transition-colors"
                                >
                                    <Plus />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {symbols.map(sym => (
                                    <div key={sym} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                                        <span className="font-bold text-sm">{sym}</span>
                                        <button onClick={() => removeSymbol(sym)} className="text-gray-400 hover:text-red-400">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {symbols.length === 0 && <p className="text-gray-500 text-sm">종목을 추가해주세요.</p>}
                            </div>

                            <button
                                onClick={runOptimization}
                                disabled={loading || symbols.length < 2}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading && <Loader2 className="animate-spin" />}
                                {loading ? "최적화 중..." : "포트폴리오 분석 실행"}
                            </button>
                            {error && <p className="text-red-400 mt-2 text-center text-sm">{error}</p>}
                        </div>
                    </div>

                    {/* Result Section */}
                    <div className="lg:col-span-2">
                        {result && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Summary Metrics */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-black/40 border border-white/20 rounded-2xl p-5 text-center">
                                        <div className="text-gray-400 text-sm mb-1">기대 수익률 (연)</div>
                                        <div className="text-3xl font-bold text-green-400">{result.metrics.expected_return}%</div>
                                    </div>
                                    <div className="bg-black/40 border border-white/20 rounded-2xl p-5 text-center">
                                        <div className="text-gray-400 text-sm mb-1">예상 변동성 (Risk)</div>
                                        <div className="text-3xl font-bold text-red-400">{result.metrics.volatility}%</div>
                                    </div>
                                    <div className="bg-black/40 border border-white/20 rounded-2xl p-5 text-center">
                                        <div className="text-gray-400 text-sm mb-1">Sharpe Ratio</div>
                                        <div className="text-3xl font-bold text-blue-400">{result.metrics.sharpe_ratio}</div>
                                    </div>
                                </div>

                                {/* AI Doctor Note */}
                                {result.doctor_note && (
                                    <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-900/10 to-transparent p-6 relative overflow-hidden">
                                        <div className="flex items-start gap-4 z-10 relative">
                                            <div className="bg-blue-600 rounded-full p-2 mt-1">
                                                <Zap className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-blue-200 mb-2">AI Portfolio Doctor</h3>
                                                <p className="text-gray-200 leading-relaxed text-md font-medium">
                                                    "{result.doctor_note}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Main Chart Area */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 border border-white/20 rounded-3xl p-8">
                                    <div className="flex flex-col justify-center">
                                        <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                                            <PieChartIcon className="text-purple-400" /> 최적 비중 (Optimal Weights)
                                        </h4>
                                        <ul className="space-y-3">
                                            {result.allocation.map((item: any, idx: number) => (
                                                <li key={item.symbol} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                        <span className="font-bold">{item.symbol}</span>
                                                    </div>
                                                    <span className="font-mono text-lg text-blue-200">{item.weight}%</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="h-64 md:h-auto min-h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={result.allocation}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="weight"
                                                >
                                                    {result.allocation.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(0,0,0,0.8)',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        borderRadius: '12px'
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!result && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 min-h-[400px] border border-white/10 rounded-3xl bg-black/20">
                                <Zap className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg">종목을 추가하고 최적화 버튼을 눌러주세요.</p>
                                <p className="text-sm opacity-60 mt-2">AI가 샤프 지수(위험 대비 수익률)를 최대화하는 비중을 계산합니다.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
