"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Plus, Trash2, Zap, Loader2, PieChart as PieChartIcon, Calendar, Activity, Info, ChevronRight, X, Link, Key } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import AdRewardModal from "@/components/AdRewardModal";
import { checkReward } from "@/lib/reward";
import CleanStockList from "@/components/CleanStockList";

import { isFreeModeEnabled } from "@/lib/adminMode";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function PortfolioPage() {
    const [inputSymbol, setInputSymbol] = useState("");
    const [symbols, setSymbols] = useState<string[]>([]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    // KIS State
    const [showKisModal, setShowKisModal] = useState(false);
    const [kisKeys, setKisKeys] = useState({ appKey: "", appSecret: "", account: "" });
    const [isKisConnected, setIsKisConnected] = useState(false);

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
        setIsKisConnected(false); // Manually modified so not fully synced
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') addSymbol();
    };

    const [showAdModal, setShowAdModal] = useState(false);
    const [hasPaid, setHasPaid] = useState(false);

    const handleKisConnect = async () => {
        if (!kisKeys.appKey || !kisKeys.appSecret || !kisKeys.account) {
            setError("API Key, Secret, 계좌번호를 모두 입력해주세요."); // Reuse error state for modal?
            alert("정보를 모두 입력해주세요.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/kis/balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_key: kisKeys.appKey,
                    app_secret: kisKeys.appSecret,
                    account: kisKeys.account
                })
            });
            const json = await res.json();

            if (json.status === "success" && json.data?.holdings) {
                const holdings = json.data.holdings;
                const formattedSymbols = holdings.map((h: any) => h.symbol);

                setSymbols(formattedSymbols);
                setIsKisConnected(true);
                setShowKisModal(false);

                // Auto-run analysis
                setTimeout(() => runOptimization(formattedSymbols), 500);
            } else {
                alert("계좌 연결 실패: " + (json.message || "Unknown error"));
            }
        } catch (e) {
            alert("연결 중 오류가 발생했습니다.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const runOptimization = async (overrideSymbols?: string[]) => {
        const targetSymbols = overrideSymbols || symbols;

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
            // 1. Optimization (Efficient Frontier) - Needs > 1
            if (targetSymbols.length >= 2) {
                const resOpt = await fetch(`${API_BASE_URL}/api/portfolio/optimize?_t=${Date.now()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols: targetSymbols }),
                });
                const jsonOpt = await resOpt.json();

                if (jsonOpt.status === "success") {
                    setResult(jsonOpt);
                } else {
                    console.warn("Optimization warning:", jsonOpt.message);
                }
            }

            // 2. Portfolio Analysis
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

    const handleAdReward = () => {
        setHasPaid(true);
        setShowAdModal(false);
        setTimeout(() => runOptimization(), 100);
    };

    return (
        <div className="h-screen flex flex-col bg-[#121212] text-white overflow-hidden relative">
            {/* Modal for KIS */}
            {showKisModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Key className="w-5 h-5 text-yellow-400" /> KIS 자산 연동
                            </h3>
                            <button onClick={() => setShowKisModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3 mb-6">
                            <input
                                type="text" placeholder="App Key"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-yellow-400 outline-none"
                                value={kisKeys.appKey}
                                onChange={e => setKisKeys({ ...kisKeys, appKey: e.target.value })}
                            />
                            <input
                                type="password" placeholder="App Secret"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-yellow-400 outline-none"
                                value={kisKeys.appSecret}
                                onChange={e => setKisKeys({ ...kisKeys, appSecret: e.target.value })}
                            />
                            <input
                                type="text" placeholder="계좌번호 (8자리, 하이픈 제외)"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-yellow-400 outline-none"
                                value={kisKeys.account}
                                onChange={e => setKisKeys({ ...kisKeys, account: e.target.value })}
                            />
                            <p className="text-xs text-gray-400 pt-1">* 정보는 서버에 저장되지 않고 일회성으로 사용됩니다.</p>
                        </div>
                        <button
                            onClick={handleKisConnect}
                            disabled={loading}
                            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl disabled:opacity-50"
                        >
                            {loading ? "연결 중..." : "내 계좌 분석하기"}
                        </button>
                    </div>
                </div>
            )}

            {/* Compact Header */}
            <div className="shrink-0">
                <Header title="AI 포트폴리오 (내 자산)" subtitle="" />
            </div>

            <AdRewardModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onReward={handleAdReward}
                featureName="AI Portfolio Optimizer"
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto h-full flex flex-col gap-4">

                    {/* 1. Top Control Bar */}
                    <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 shrink-0 backdrop-blur-md">
                        <button
                            onClick={() => setShowKisModal(true)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all ${isKisConnected ? 'bg-green-900/20 text-green-400 border-green-500/50' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
                        >
                            <Link className="w-4 h-4" />
                            {isKisConnected ? "KIS 연동됨" : "증권사 연결"}
                        </button>

                        <div className="flex-1 w-full flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
                            {symbols.map(sym => (
                                <div key={sym} className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-sm border border-white/10 shrink-0">
                                    <span className="font-mono font-bold">{sym}</span>
                                    <button onClick={() => removeSymbol(sym)} className="text-gray-400 hover:text-red-400">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 min-w-[200px]">
                                <input
                                    type="text"
                                    placeholder="종목 추가 (ex: 삼성전자)"
                                    className="w-full bg-transparent border-b border-white/20 px-2 py-1 outline-none focus:border-blue-500 uppercase font-mono text-sm"
                                    value={inputSymbol}
                                    onChange={(e) => setInputSymbol(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button onClick={addSymbol} className="bg-white/10 p-1.5 rounded-lg hover:bg-white/20">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => runOptimization()}
                            disabled={loading || symbols.length < 1}
                            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap transition-all"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> 분석 실행</>}
                        </button>
                    </div>

                    {/* 2. Results Dashboard */}
                    {(result || analysisResult) ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">

                            {/* Left Column */}
                            <div className="md:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
                                <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Activity className="w-24 h-24 text-white" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-blue-500 text-xs font-bold px-2 py-0.5 rounded text-white">AI 데이터 분석</span>
                                            <h3 className="text-lg font-bold text-white leading-tight">
                                                {analysisResult?.diagnosis || "분석 중..."}
                                            </h3>
                                        </div>
                                        <div className="text-3xl font-bold text-white mb-3">
                                            {analysisResult?.score || 0}<span className="text-sm font-normal text-gray-400">점</span>
                                        </div>
                                        <p className="text-sm text-gray-300 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed">
                                            "{analysisResult?.prescription || "결과를 기다려주세요."}"
                                        </p>
                                    </div>
                                </div>

                                {result && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-800/50 border border-white/10 p-4 rounded-2xl text-center">
                                            <div className="text-xs text-gray-400 mb-1">기대 수익 (연)</div>
                                            <div className="text-xl font-bold text-green-400">{result.metrics.expected_return}%</div>
                                        </div>
                                        <div className="bg-gray-800/50 border border-white/10 p-4 rounded-2xl text-center">
                                            <div className="text-xs text-gray-400 mb-1">변동성 (Risk)</div>
                                            <div className="text-xl font-bold text-red-400">{result.metrics.volatility}%</div>
                                        </div>
                                        <div className="col-span-2 bg-gray-800/50 border border-white/10 p-3 rounded-2xl flex items-center justify-between px-6">
                                            <div className="text-xs text-gray-400">Sharpe Ratio</div>
                                            <div className="text-xl font-bold text-blue-400">{result.metrics.sharpe_ratio}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 flex-1 min-h-[150px] flex flex-col">
                                    <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> 배당 캘린더
                                    </h4>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 max-h-[200px]">
                                        {analysisResult?.calendar?.length > 0 ? (
                                            analysisResult.calendar.map((event: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${event.source === '확정' ? 'text-emerald-300 bg-emerald-900/40 border border-emerald-500/30' : 'text-green-400 bg-green-900/30'}`}>
                                                            {new Date(event.date).getMonth() + 1}/{new Date(event.date).getDate()}
                                                        </span>
                                                        <span className="font-bold text-xs">{event.symbol}</span>
                                                    </div>
                                                    <span className="text-gray-300 text-xs font-medium">+{event.currency === 'KRW' ? '₩' : '$'}{event.amount.toLocaleString()}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-center text-gray-600 py-4">예정된 배당 없음</p>
                                        )}
                                    </div>
                                    {analysisResult?.calendar?.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-white/10 text-right text-xs text-gray-500">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-gray-600">Data: SEIBRO, Naver, Yahoo</span>
                                                <span className="text-green-400 font-bold">Total: ₩{analysisResult.calendar.reduce((acc: number, cur: any) => acc + cur.amount, 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Center Column */}
                            <div className="md:col-span-5 flex flex-col gap-4">
                                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 relative flex-1 min-h-[250px] flex flex-col">
                                    <h4 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> 6각 팩터 데이터맵
                                    </h4>
                                    <div className="flex-1 w-full relative">
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
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                <Radar name="My Portfolio" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid #333', fontSize: '12px' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 h-[180px] flex items-center justify-between">
                                    <div className="w-1/2 h-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analysisResult?.nutrition?.nutrition || []}
                                                    cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value"
                                                >
                                                    {analysisResult?.nutrition?.nutrition?.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#000', borderRadius: '8px', fontSize: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <PieChartIcon className="w-5 h-5 text-gray-600" />
                                        </div>
                                    </div>
                                    <div className="w-1/2 pl-2 space-y-1 overflow-y-auto h-full scrollbar-hide">
                                        <h4 className="text-xs font-bold text-orange-400 mb-2">자산 구성 요소</h4>
                                        {(analysisResult?.nutrition?.nutrition || []).map((n: any) => (
                                            <div key={n.name} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: n.fill }} />
                                                    <span className="text-gray-300 truncate">{n.name}</span>
                                                </div>
                                                <span className="font-bold text-gray-500">{n.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="md:col-span-3 bg-gray-900/60 border border-white/10 rounded-2xl p-4 flex flex-col">
                                <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center justify-between">
                                    <span>최적 비중</span>
                                    <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">Rebalanced</span>
                                </h4>

                                {result && (
                                    <>
                                        <div className="flex-1 w-full h-[150px] min-h-[150px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={result.allocation}
                                                        cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="weight"
                                                    >
                                                        {result.allocation.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#000', borderRadius: '8px', fontSize: '12px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 max-h-[300px]">
                                            {result.allocation.map((item: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg">
                                                    <span className="font-bold">{item.symbol}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{item.current_weight || 0}% →</span>
                                                        <span className="font-bold text-blue-400">{item.weight}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border border-white/10 rounded-3xl bg-black/20 m-4">
                            <Zap className="w-20 h-20 mb-6 opacity-20 text-blue-500 animate-pulse" />
                            <h3 className="text-2xl font-bold text-gray-300 mb-2">포트폴리오 데이터 분석</h3>
                            <button
                                onClick={() => setShowKisModal(true)}
                                className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-black px-8 py-3 rounded-full font-bold shadow-lg"
                            >
                                증권사 계좌 연결하기 🚀
                            </button>
                            <p className="mt-4 text-sm opacity-60">또는 종목 코드를 직접 입력하세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
