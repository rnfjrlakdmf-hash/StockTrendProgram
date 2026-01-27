"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, LineChart, Target, Shield, AlertTriangle, Loader2, Lock, PlayCircle, Crown } from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine
} from "recharts";
import { getTickerFromKorean } from "@/lib/stockMapping";
import ProModal from "@/components/ProModal";
import AdRewardModal from "@/components/AdRewardModal";

export default function PatternPage() {
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // [Pro & Ad]
    const [showProModal, setShowProModal] = useState(false);
    const [showAdModal, setShowAdModal] = useState(false);
    const [dailyCount, setDailyCount] = useState(0);
    const [dailyLimit, setDailyLimit] = useState(1); // Default 1 free use
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const checkStatus = () => {
            const localPro = localStorage.getItem("isPro") === "true";
            setIsPro(localPro);
            const today = new Date().toDateString();

            // Usage Count
            const usageStored = localStorage.getItem("patternUsage");
            if (usageStored) {
                const { date, count } = JSON.parse(usageStored);
                if (date === today) {
                    setDailyCount(count);
                } else {
                    setDailyCount(0);
                    localStorage.setItem("patternUsage", JSON.stringify({ date: today, count: 0 }));
                }
            }

            // Daily Limit
            const limitStored = localStorage.getItem("patternLimit");
            if (limitStored) {
                const { date, limit } = JSON.parse(limitStored);
                if (date === today) {
                    setDailyLimit(limit);
                } else {
                    setDailyLimit(1); // Reset
                    localStorage.setItem("patternLimit", JSON.stringify({ date: today, limit: 1 }));
                }
            } else {
                localStorage.setItem("patternLimit", JSON.stringify({ date: today, limit: 1 }));
            }
        };
        checkStatus();
    }, []);

    const handleSearch = async () => {
        if (!searchInput) return;

        // [Unlock Check]
        if (!isPro && dailyCount >= dailyLimit) {
            setShowAdModal(true);
            return;
        }

        setLoading(true);
        setResult(null);

        // Increment Usage
        if (!isPro) {
            const newCount = dailyCount + 1;
            setDailyCount(newCount);
            localStorage.setItem("patternUsage", JSON.stringify({
                date: new Date().toDateString(),
                count: newCount
            }));
        }

        try {
            const ticker = getTickerFromKorean(searchInput).toUpperCase();
            const res = await fetch(`${API_BASE_URL}/api/chart/patterns/${ticker}`);
            const json = await res.json();
            if (json.status === "success") {
                setResult(json.data);
            } else {
                alert("검색 결과가 없습니다. 티커를 확인해주세요.");
            }
        } catch (e) {
            console.error(e);
            alert("서버 연결 오류");
        } finally {
            setLoading(false);
        }
    };

    // Increase Limit on Ad Watch
    const handleAdReward = () => {
        const newLimit = dailyLimit + 1;
        setDailyLimit(newLimit);
        localStorage.setItem("patternLimit", JSON.stringify({
            date: new Date().toDateString(),
            limit: newLimit
        }));
        setShowAdModal(false);
        alert("광고 보상 완료! 분석 기회가 1회 추가되었습니다. 🎉");
        // Optional: Auto trigger search if input exists? 
        // handleSearch(); // Might be better to let user click again to confirm
    };

    const isLocked = !isPro && dailyCount >= dailyLimit;

    return (
        <div className="min-h-screen pb-10">
            <Header />
            <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
            <AdRewardModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onReward={handleAdReward}
                featureName="PatternAnalytics"
            />

            <div className="p-6 max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-white flex items-center justify-center gap-3">
                        <LineChart className="w-10 h-10 text-emerald-500" />
                        AI 차트 패턴 분석
                    </h1>
                    <p className="text-gray-400 text-lg">
                        복잡한 차트 분석은 AI에게 맡기세요. 패턴, 지지선, 저항선을 자동으로 감지합니다.
                    </p>
                    {/* Usage Badge */}
                    {!isPro && (
                        <div className="flex justify-center mt-2">
                            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-300 flex items-center gap-2">
                                {isLocked ? (
                                    <span className="text-red-400 font-bold flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> 무료 사용량 초과 ({dailyCount}/{dailyLimit})
                                    </span>
                                ) : (
                                    <span>
                                        일일 무료 사용량: <span className="text-emerald-400 font-bold">{dailyCount}</span> / {dailyLimit}회
                                    </span>
                                )}
                                <button
                                    onClick={() => setShowProModal(true)}
                                    className="ml-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 rounded text-white font-bold transition-colors flex items-center gap-1"
                                >
                                    <Crown className="w-3 h-3" /> 무제한
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative max-w-xl mx-auto">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={isLocked ? "무료 사용량을 다 썼어요! 광고 보고 충전하세요 ⚡" : "티커 또는 한글 종목명 (예: 삼성전자, NVDA)..."}
                        className={`w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-lg focus:outline-none focus:border-emerald-500/50 transition-colors ${isLocked ? 'opacity-50' : ''}`}
                        disabled={loading || isLocked}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6" />
                    <button
                        onClick={handleSearch}
                        disabled={loading || isLocked}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        {isLocked ? <Lock className="w-4 h-4" /> : "분석"}
                    </button>

                    {/* Unlock Options when Locked */}
                    {isLocked && (
                        <div className="absolute inset-x-0 -top-20 md:-top-16 flex items-center justify-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-20">
                            <button
                                onClick={() => setShowAdModal(true)}
                                className="bg-gray-800 hover:bg-gray-700 text-white border border-white/20 rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 transform hover:scale-105 transition-all group"
                            >
                                <PlayCircle className="w-5 h-5 text-yellow-400 group-hover:rotate-12 transition-transform" />
                                <div className="text-left">
                                    <div className="text-xs text-gray-400">무료 충전</div>
                                    <div className="font-bold text-sm">광고 보고 +1회</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setShowProModal(true)}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 transform hover:scale-105 transition-all shadow-emerald-500/30"
                            >
                                <Crown className="w-5 h-5 text-white animate-pulse" />
                                <div className="text-left">
                                    <div className="text-xs text-emerald-200">제한 없이</div>
                                    <div className="font-bold text-sm">PRO 업그레이드</div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-500">
                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                        <p className="animate-pulse text-lg">AI가 지난 60일간의 캔들을 스캔 중입니다...</p>
                    </div>
                )}

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Signal Card with Chart */}
                        <div className="md:col-span-2 rounded-3xl bg-gradient-to-b from-gray-900 to-black border border-white/10 p-8 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 z-10 relative">
                                <div>
                                    <span className="text-emerald-400 font-bold tracking-wider text-sm uppercase mb-2 block">
                                        감지된 패턴
                                    </span>
                                    <h2 className="text-4xl font-black text-white mb-2">
                                        {result.pattern}
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${result.signal === 'Buy' ? 'bg-green-500/20 text-green-400' :
                                            result.signal === 'Sell' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {result.signal === 'Buy' ? '매수' : result.signal === 'Sell' ? '매도' : '중립'} 신호
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                            신뢰도: <span className="text-white font-bold">{result.confidence}%</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Interactive Chart */}
                            <div className="h-80 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={result.history}>
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#666"
                                            tick={{ fill: '#666', fontSize: 10 }}
                                            tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            stroke="#666"
                                            tick={{ fill: '#666', fontSize: 10 }}
                                            tickFormatter={(val) => result.currency === '₩' ? val.toLocaleString() : `$${val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: any) => [result.currency === '₩' ? `₩${Number(value).toLocaleString()}` : `$${Number(value)}`, "Price"]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#10b981"
                                            fillOpacity={1}
                                            fill="url(#colorPrice)"
                                            strokeWidth={2}
                                        />
                                        {/* Resistance Line */}
                                        <ReferenceLine
                                            y={result.resistance}
                                            stroke="#ef4444"
                                            strokeDasharray="5 5"
                                            label={{
                                                value: `저항선 (${result.currency === '₩' ? '₩' : '$'}${result.resistance?.toLocaleString()})`,
                                                position: 'insideTopRight',
                                                fill: '#ef4444',
                                                fontSize: 12
                                            }}
                                        />
                                        {/* Support Line */}
                                        <ReferenceLine
                                            y={result.support}
                                            stroke="#3b82f6"
                                            strokeDasharray="5 5"
                                            label={{
                                                value: `지지선 (${result.currency === '₩' ? '₩' : '$'}${result.support?.toLocaleString()})`,
                                                position: 'insideBottomRight',
                                                fill: '#3b82f6',
                                                fontSize: 12
                                            }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Analysis Detail */}
                        <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-400" /> 주요 구간
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <span className="text-red-400 font-bold flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> 저항선
                                    </span>
                                    <span className="text-2xl font-bold text-white">
                                        {result.currency || '$'}{Number(result.resistance).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <span className="text-blue-400 font-bold flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> 지지선
                                    </span>
                                    <span className="text-2xl font-bold text-white">
                                        {result.currency || '$'}{Number(result.support).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Summary Text */}
                        <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" /> AI 분석 코멘트
                            </h3>
                            <p className="text-gray-300 leading-relaxed text-lg">
                                {result.summary}
                            </p>
                        </div>
                    </div>
                )}
                {/* Beginner Guide Section */}
                <div className="mt-12 border-t border-white/10 pt-8">
                    <h3 className="text-xl font-bold text-gray-400 mb-6 text-center">차트 분석 용어 가이드</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl bg-red-900/10 border border-red-500/20">
                            <h4 className="text-red-400 font-bold text-lg mb-2 flex items-center gap-2">
                                <Shield className="w-5 h-5" /> 저항선 (Resistance)
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                주가가 상승하다가 매도세에 부딪혀 <strong>더 이상 오르기 힘든 가격대(천장)</strong>를 의미합니다.
                                이 선을 강하게 뚫고 올라가면 새로운 상승 추세의 시작으로 봅니다.
                            </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-blue-900/10 border border-blue-500/20">
                            <h4 className="text-blue-400 font-bold text-lg mb-2 flex items-center gap-2">
                                <Shield className="w-5 h-5" /> 지지선 (Support)
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                주가가 하락하다가 매수세가 들어와 <strong>반등할 가능성이 높은 가격대(바닥)</strong>를 의미합니다.
                                이 선이 무너지면 추가 하락의 위험이 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
