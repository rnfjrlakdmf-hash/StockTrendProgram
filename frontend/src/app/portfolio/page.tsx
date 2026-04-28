"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Star, Plus, Trash2, Zap, Loader2, PieChart as PieChartIcon, Calendar, Activity, Info, ChevronRight, X, Link, Key, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import AdRewardModal from "@/components/AdRewardModal";
import { checkReward } from "@/lib/reward";
import CleanStockList from "@/components/CleanStockList";
import AIDisclaimer from "@/components/AIDisclaimer";

import { isFreeModeEnabled } from "@/lib/adminMode";

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899', '#6366f1'];

export default function PortfolioPage() {
    const [inputSymbol, setInputSymbol] = useState("");
    const [holdings, setHoldings] = useState<{ symbol: string, price: string, quantity: string }[]>([]);
    const [inputPrice, setInputPrice] = useState("");
    const [inputQuantity, setInputQuantity] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const [showAdModal, setShowAdModal] = useState(false);
    const [hasPaid, setHasPaid] = useState(false);

    // [New] Fetch Portfolio on Load
    useEffect(() => {
        const userId = localStorage.getItem("stock_user_id");
        if (userId) {
            fetch(`${API_BASE_URL}/api/portfolio`, {
                headers: { "X-User-ID": userId }
            })
            .then(res => res.json())
            .then(json => {
                if (json.status === "success" && json.data) {
                    setHoldings(json.data);
                }
            })
            .catch(console.error);
        }
    }, [API_BASE_URL]);

    const addHolding = async () => {
        if (!inputSymbol || !inputPrice || !inputQuantity) {
            alert("종목, 단가, 수량을 모두 입력해주세요.");
            return;
        }
        const sym = inputSymbol.toUpperCase().trim();
        const newHolding = { symbol: sym, price: inputPrice, quantity: inputQuantity };
        
        // Optimistic UI Update
        const updatedHoldings = [...holdings, newHolding];
        setHoldings(updatedHoldings);
        
        const userId = localStorage.getItem("stock_user_id");
        if (userId) {
            try {
                await fetch(`${API_BASE_URL}/api/portfolio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
                    body: JSON.stringify(newHolding)
                });
            } catch (e) {
                console.error("Save error:", e);
            }
        }
        
        setInputSymbol("");
        setInputPrice("");
        setInputQuantity("");
    };

    const removeHolding = async (sym: string) => {
        setHoldings(holdings.filter(h => h.symbol !== sym));

        const userId = localStorage.getItem("stock_user_id");
        if (userId) {
            try {
                await fetch(`${API_BASE_URL}/api/portfolio/${sym}`, {
                    method: 'DELETE',
                    headers: { 'X-User-ID': userId }
                });
            } catch (e) {
                console.error("Delete error:", e);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') addHolding();
    };

    const fetchPriceForSymbol = async (sym: string) => {
        if (!sym.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/quote/${encodeURIComponent(sym.trim())}`);
            const json = await res.json();
            if (json.status === "success" && json.data?.price) {
                // Ensure price is formatted as a simple string without commas for the number input
                const priceValue = typeof json.data.price === 'number' ? json.data.price : parseFloat(json.data.price.toString().replace(/,/g, ''));
                if (!isNaN(priceValue)) {
                    setInputPrice(priceValue.toString());
                }
            }
        } catch (e) {
            console.error("Failed to fetch price", e);
        }
    };


    const runOptimization = async (overrideHoldings?: any[]) => {
        const targetHoldings = overrideHoldings || holdings;
        const targetSymbols = targetHoldings.map(h => h.symbol);

        if (targetSymbols.length < 1) {
            setError("최소 1개 이상의 종목이 필요합니다.");
            return;
        }

        const isPro = localStorage.getItem("isPro") === "true";
        const hasValidReward = checkReward();

        if (!isPro && !hasValidReward && !hasPaid && !isFreeModeEnabled()) {
            setShowAdModal(true);
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);
        setAnalysisResult(null);

        try {
            if (targetSymbols.length >= 2) {
                const resOpt = await fetch(`${API_BASE_URL}/api/portfolio/optimize?_t=${Date.now()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols: targetSymbols }),
                });
                const jsonOpt = await resOpt.json();
                if (jsonOpt.status === "success") {
                    setResult(jsonOpt.data || jsonOpt);
                }
            }

            const resDiag = await fetch(`${API_BASE_URL}/api/portfolio/diagnosis?_t=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portfolio: targetSymbols }),
            });
            const jsonDiag = await resDiag.json();

            if (jsonDiag.status === "success") {
                setAnalysisResult(jsonDiag.data);
            }

        } catch (err) {
            setError("Server connection failed");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const syncFromWatchlist = async () => {
        const userId = localStorage.getItem("stock_user_id");
        if (!userId) {
            alert("로그인 후 이용할 수 있는 기능입니다.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                headers: { "X-User-ID": userId }
            });
            const json = await res.json();
            if (json.status === "success" && json.data.length > 0) {
                const favHoldings = json.data.map((s: any) => ({
                    symbol: s.symbol,
                    price: s.current_price || "0",
                    quantity: "1"
                }));
                
                // Save to DB
                for (const h of favHoldings) {
                    await fetch(`${API_BASE_URL}/api/portfolio`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
                        body: JSON.stringify(h)
                    });
                }

                setHoldings(favHoldings);
                alert(`${favHoldings.length}개의 관심종목을 현재가 기준으로 포트폴리오에 담았습니다. 수익금을 확인해 보세요!`);
                runOptimization(favHoldings);
            } else {
                alert("가져올 관심종목이 없습니다.");
            }
        } catch (e) {
            console.error(e);
            alert("가져오기 실패");
        } finally {
            setLoading(false);
        }
    };


    const handleAdReward = () => {
        setHasPaid(true);
        setShowAdModal(false);
        setTimeout(() => runOptimization(), 100);
    };

    return (
        <div className="h-screen flex flex-col bg-[#121212] text-white overflow-hidden relative">
            <div className="bg-red-900/30 border-b border-red-500/30 px-4 py-2 flex items-center gap-3 text-[11px] text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p>
                    <strong>법적 고지:</strong> 본 포트폴리오 분석 시스템은 사용자가 직접 입력한 데이터를 바탕으로 한 <strong>통계적 정보 제공</strong>만을 목적으로 합니다.
                </p>
            </div>

            <div className="shrink-0">
                <Header title="AI 포트폴리오 (내 자산)" subtitle="" />
            </div>

            <AdRewardModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onReward={handleAdReward}
                featureName="AI Portfolio Optimizer"
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto h-full flex flex-col gap-4">

                    <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 shrink-0 backdrop-blur-md">
                        <div className="flex gap-2">
                             <button
                                onClick={syncFromWatchlist}
                                className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all shrink-0 whitespace-nowrap"
                            >
                                <Star className="w-4 h-4" />
                                관심종목 불러오기
                            </button>
                        </div>
                        <div className="flex-1 w-full flex items-center gap-4 overflow-x-auto custom-scrollbar pb-1 md:pb-0 font-bold">
                            {holdings.map(h => {
                                const priceNum = Number(h.price);
                                const qtyNum = Number(h.quantity);
                                return (
                                    <div key={h.symbol} className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl text-xs border border-white/10 shrink-0 hover:border-blue-500/50 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-black text-blue-400">{h.symbol}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] text-gray-500">{priceNum.toLocaleString()}원 × {qtyNum}주</span>
                                                <span className="text-[10px] text-gray-400 font-bold bg-white/5 px-1 rounded">총 {(priceNum * qtyNum).toLocaleString()}원</span>
                                            </div>
                                        </div>
                                        <button onClick={() => removeHolding(h.symbol)} className="text-gray-400 hover:text-red-400 ml-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                            <div className="grid grid-cols-3 gap-2 min-w-[400px]">
                                <input
                                    type="text"
                                    placeholder="종목"
                                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 uppercase font-mono text-xs"
                                    value={inputSymbol}
                                    onChange={(e) => setInputSymbol(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={(e) => fetchPriceForSymbol(e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="단가"
                                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs"
                                    value={inputPrice}
                                    onChange={(e) => setInputPrice(e.target.value)}
                                />
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        placeholder="수량"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs"
                                        value={inputQuantity}
                                        onChange={(e) => setInputQuantity(e.target.value)}
                                    />
                                    <button onClick={addHolding} className="bg-blue-600 p-1.5 rounded-lg hover:bg-blue-500 shrink-0">
                                        <Plus className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => runOptimization()}
                            disabled={loading || holdings.length < 1}
                            className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> 진단하기</>}
                        </button>
                    </div>

                    {(result || analysisResult) ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
                            <div className="md:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
                                <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-blue-500 text-xs font-bold px-2 py-0.5 rounded text-white">AI 데이터 분석</span>
                                            <h3 className="text-lg font-bold text-white leading-tight">
                                                {analysisResult?.diagnosis || "분석 완료"}
                                            </h3>
                                        </div>
                                        <div className="text-3xl font-bold text-white mb-3">
                                            {analysisResult?.score || 0}<span className="text-sm font-normal text-gray-400">점</span>
                                        </div>
                                        <p className="text-sm text-gray-300 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed">
                                            "{analysisResult?.prescription || "분석 결과를 토대로 자산을 관리해 보세요."}"
                                        </p>
                                    </div>
                                </div>

                                {result && (
                                    <div className="flex flex-col gap-3">
                                        <div className="bg-gradient-to-r from-blue-600/20 to-blue-900/40 border border-blue-500/30 p-4 rounded-2xl">
                                            <div className="text-xs text-blue-300 mb-1">총 투자 금액</div>
                                            <div className="text-2xl font-black text-white">
                                                {(holdings.reduce((acc, h) => acc + (Number(h.price) * Number(h.quantity)), 0)).toLocaleString()}원
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-800/50 border border-white/10 p-4 rounded-2xl text-center">
                                                <div className="text-xs text-gray-400 mb-1">기대 수익 (연)</div>
                                                <div className="text-xl font-bold text-red-400">{result.metrics.expected_return}%</div>
                                            </div>
                                            <div className="bg-gray-800/50 border border-white/10 p-4 rounded-2xl text-center">
                                                <div className="text-xs text-gray-400 mb-1">변동성</div>
                                                <div className="text-xl font-bold text-blue-400">{result.metrics.volatility}%</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 flex-1">
                                    <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> 배당 캘린더
                                    </h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {analysisResult?.calendar?.map((event: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-xs">
                                                <span>{event.symbol}</span>
                                                <span className="font-bold text-red-400">+{event.amount.toLocaleString()}원</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-8 flex flex-col gap-4">
                                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 flex-1 flex flex-col">
                                    <h4 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> 포트폴리오 6각 데이터맵
                                    </h4>
                                    <div className="flex-1 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                                { subject: '베타', A: analysisResult?.factors?.beta || 0 },
                                                { subject: '알파', A: analysisResult?.factors?.alpha || 0 },
                                                { subject: '모멘텀', A: analysisResult?.factors?.momentum || 0 },
                                                { subject: '밸류', A: analysisResult?.factors?.value || 0 },
                                                { subject: '변동성', A: analysisResult?.factors?.volatility || 0 },
                                                { subject: '배당', A: analysisResult?.factors?.yield || 0 },
                                            ]}>
                                                <PolarGrid stroke="#333" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                                <Radar name="My Portfolio" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border border-white/10 rounded-3xl bg-black/20 m-4">
                            <Star className="w-20 h-20 mb-6 opacity-20 text-yellow-500" />
                            <h3 className="text-2xl font-bold text-gray-300 mb-2">포트폴리오 비서</h3>
                            <p className="text-sm mt-2">상단의 입력창에 보유 종목을 추가해보세요</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
