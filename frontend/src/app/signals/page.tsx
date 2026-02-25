"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Zap, TrendingUp, TrendingDown, Volume2, FileText, Users,
    RefreshCw, ChevronRight, Bot, ThumbsUp, ThumbsDown, BarChart3,
    Activity, AlertTriangle
} from "lucide-react";

interface Signal {
    id: number;
    symbol: string;
    signal_type: string;
    title: string;
    summary: string;
    data: any;
    created_at: string;
}

interface VoteResult {
    up: number;
    down: number;
    total: number;
    up_pct: number;
    down_pct: number;
}

interface InvestorData {
    foreign_top: any[];
    institution_top: any[];
    foreign_sell: any[];
    institution_sell: any[];
}

export default function SignalsPage() {
    const router = useRouter();
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [activeTab, setActiveTab] = useState<"signals" | "investors" | "vote">("signals");
    const [investorData, setInvestorData] = useState<InvestorData | null>(null);
    const [investorLoading, setInvestorLoading] = useState(false);

    // Vote state
    const [voteSymbol, setVoteSymbol] = useState("");
    const [voteResults, setVoteResults] = useState<VoteResult | null>(null);
    const [userVote, setUserVote] = useState<string | null>(null);
    const [voting, setVoting] = useState(false);

    // Briefing state
    const [briefingSymbol, setBriefingSymbol] = useState<string | null>(null);
    const [briefing, setBriefing] = useState<any>(null);
    const [briefingLoading, setBriefingLoading] = useState(false);

    const fetchSignals = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/signals?limit=30`);
            const json = await res.json();
            if (json.status === "success") {
                setSignals(json.data || []);
            }
        } catch (err) {
            console.error("Signals fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const scanSignals = async () => {
        setScanning(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/signals/scan`, { method: "POST" });
            const json = await res.json();
            if (json.status === "success") {
                fetchSignals();
            }
        } catch (err) {
            console.error("Scan error:", err);
        } finally {
            setScanning(false);
        }
    };

    const fetchInvestors = async () => {
        setInvestorLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/investors/top`);
            const json = await res.json();
            if (json.status === "success") {
                setInvestorData(json.data);
            }
        } catch (err) {
            console.error("Investor fetch error:", err);
        } finally {
            setInvestorLoading(false);
        }
    };

    const submitVote = async (symbol: string, direction: string) => {
        setVoting(true);
        try {
            const userId = localStorage.getItem("user_id") || "guest";
            const res = await fetch(`${API_BASE_URL}/api/votes/${symbol}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-User-Id": userId },
                body: JSON.stringify({ direction })
            });
            const json = await res.json();
            if (json.status === "success") {
                setVoteResults(json.results);
                setUserVote(direction);
            }
        } catch (err) {
            console.error("Vote error:", err);
        } finally {
            setVoting(false);
        }
    };

    const fetchVoteResults = async (symbol: string) => {
        try {
            const userId = localStorage.getItem("user_id") || "guest";
            const res = await fetch(`${API_BASE_URL}/api/votes/${symbol}`, {
                headers: { "X-User-Id": userId }
            });
            const json = await res.json();
            if (json.status === "success") {
                setVoteResults(json.data);
                setUserVote(json.user_vote);
            }
        } catch (err) {
            console.error("Vote results error:", err);
        }
    };

    const fetchBriefing = async (symbol: string) => {
        setBriefingSymbol(symbol);
        setBriefingLoading(true);
        setBriefing(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/signals/${symbol}/briefing`);
            const json = await res.json();
            if (json.status === "success") {
                setBriefing(json.data);
            }
        } catch (err) {
            console.error("Briefing error:", err);
        } finally {
            setBriefingLoading(false);
        }
    };

    useEffect(() => {
        fetchSignals();
    }, []);

    useEffect(() => {
        if (activeTab === "investors" && !investorData) {
            fetchInvestors();
        }
    }, [activeTab]);

    const getSignalIcon = (type: string) => {
        switch (type) {
            case "VOLUME_SURGE": return <Volume2 className="w-5 h-5" />;
            case "DISCLOSURE": return <FileText className="w-5 h-5" />;
            case "INVESTOR_SURGE": return <Users className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    const getSignalColor = (type: string) => {
        switch (type) {
            case "VOLUME_SURGE": return "from-orange-500/20 to-red-500/20 border-orange-500/40";
            case "DISCLOSURE": return "from-blue-500/20 to-indigo-500/20 border-blue-500/40";
            case "INVESTOR_SURGE": return "from-green-500/20 to-emerald-500/20 border-green-500/40";
            default: return "from-gray-500/20 to-gray-600/20 border-gray-500/40";
        }
    };

    const getSignalBadge = (type: string) => {
        switch (type) {
            case "VOLUME_SURGE": return { label: "거래량 폭증", color: "bg-orange-500/20 text-orange-300" };
            case "DISCLOSURE": return { label: "공시", color: "bg-blue-500/20 text-blue-300" };
            case "INVESTOR_SURGE": return { label: "수급 급변", color: "bg-green-500/20 text-green-300" };
            default: return { label: "시그널", color: "bg-gray-500/20 text-gray-300" };
        }
    };

    const popularStocks = ["005930", "000660", "373220", "035420", "068270", "AAPL", "TSLA", "NVDA"];

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="스마트 시그널" subtitle="실시간 시장 인텔리전스" />

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* Tabs */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
                    <button
                        onClick={() => setActiveTab("signals")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "signals" ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <Zap className="w-4 h-4" /> 시그널 피드
                    </button>
                    <button
                        onClick={() => setActiveTab("investors")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "investors" ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <BarChart3 className="w-4 h-4" /> 수급 추적
                    </button>
                    <button
                        onClick={() => setActiveTab("vote")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "vote" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <ThumbsUp className="w-4 h-4" /> 종목 투표
                    </button>
                </div>

                {/* =============== SIGNALS TAB =============== */}
                {activeTab === "signals" && (
                    <div className="space-y-4">
                        {/* Scan Button */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Zap className="w-5 h-5 text-orange-400" />
                                최근 감지된 시그널
                            </h3>
                            <button
                                onClick={scanSignals}
                                disabled={scanning}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
                                {scanning ? "스캔 중..." : "지금 스캔"}
                            </button>
                        </div>

                        {/* Signal Cards */}
                        {loading ? (
                            <div className="text-center py-12 text-gray-500">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                                로딩 중...
                            </div>
                        ) : signals.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 mb-4">아직 감지된 시그널이 없습니다</p>
                                <button
                                    onClick={scanSignals}
                                    className="px-6 py-2 bg-orange-600 rounded-xl text-sm font-bold"
                                >
                                    🔍 첫 스캔 실행하기
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {signals.map(signal => {
                                    const badge = getSignalBadge(signal.signal_type);
                                    return (
                                        <div
                                            key={signal.id}
                                            className={`bg-gradient-to-r ${getSignalColor(signal.signal_type)} border rounded-2xl p-4 hover:scale-[1.01] transition-transform cursor-pointer`}
                                            onClick={() => router.push(`/discovery?q=${signal.symbol}`)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="p-2 bg-white/10 rounded-xl mt-0.5">
                                                        {getSignalIcon(signal.signal_type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badge.color}`}>
                                                                {badge.label}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(signal.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-bold text-white text-sm md:text-base">{signal.title}</h4>
                                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{signal.summary}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 ml-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            fetchBriefing(signal.symbol);
                                                        }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        <Bot className="w-3.5 h-3.5" /> AI 브리핑
                                                    </button>
                                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* AI Briefing Modal */}
                        {briefingSymbol && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setBriefingSymbol(null)}>
                                <div className="bg-gray-900 border border-white/20 rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Bot className="w-5 h-5 text-blue-400" />
                                            AI 1분 브리핑 — {briefingSymbol}
                                        </h3>
                                        <button onClick={() => setBriefingSymbol(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
                                    </div>

                                    {briefingLoading ? (
                                        <div className="text-center py-8">
                                            <Bot className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-pulse" />
                                            <p className="text-gray-400">AI가 분석 중입니다...</p>
                                        </div>
                                    ) : briefing ? (
                                        <div className="space-y-4">
                                            {/* Price */}
                                            {briefing.price && (
                                                <div className="flex items-center gap-4 bg-white/5 rounded-xl p-3">
                                                    <span className="text-2xl font-black">{briefing.price.price}</span>
                                                    <span className={`text-sm font-bold ${parseFloat(briefing.price.change_pct) >= 0 ? "text-red-400" : "text-blue-400"}`}>
                                                        {briefing.price.change_pct}%
                                                    </span>
                                                </div>
                                            )}

                                            {/* Briefing Text */}
                                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                                                <p className="text-sm text-gray-200 leading-relaxed">{briefing.briefing}</p>
                                            </div>

                                            {/* Key Points */}
                                            {briefing.key_points && (
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold text-gray-400">핵심 포인트</h4>
                                                    {briefing.key_points.map((point: string, i: number) => (
                                                        <div key={i} className="flex items-start gap-2 text-sm">
                                                            <span className="text-blue-400 mt-0.5">•</span>
                                                            <span className="text-gray-300">{point}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Disclaimer */}
                                            <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                                                {briefing.disclaimer}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">브리핑을 불러올 수 없습니다.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* =============== INVESTORS TAB =============== */}
                {activeTab === "investors" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-green-400" />
                                외국인·기관 수급 현황
                            </h3>
                            <button onClick={fetchInvestors} className="text-sm text-gray-400 hover:text-white">
                                <RefreshCw className={`w-4 h-4 ${investorLoading ? "animate-spin" : ""}`} />
                            </button>
                        </div>

                        {investorLoading ? (
                            <div className="text-center py-12 text-gray-500">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                                수급 데이터 로딩 중...
                            </div>
                        ) : investorData ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Foreign Buy */}
                                <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-500/30 rounded-2xl p-4">
                                    <h4 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> 외국인 순매수 TOP
                                    </h4>
                                    <div className="space-y-2">
                                        {(investorData.foreign_top || []).slice(0, 7).map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 cursor-pointer transition-colors"
                                                onClick={() => router.push(`/discovery?q=${item.code || item.symbol || item.name}`)}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                                                    <span className="font-medium truncate max-w-[120px]">{item.name || item.symbol}</span>
                                                </div>
                                                <span className="text-green-400 font-mono text-xs">{item.amount || item.value || ""}</span>
                                            </div>
                                        ))}
                                        {(!investorData.foreign_top || investorData.foreign_top.length === 0) && (
                                            <p className="text-gray-500 text-sm text-center py-4">데이터 없음</p>
                                        )}
                                    </div>
                                </div>

                                {/* Institution Buy */}
                                <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-2xl p-4">
                                    <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> 기관 순매수 TOP
                                    </h4>
                                    <div className="space-y-2">
                                        {(investorData.institution_top || []).slice(0, 7).map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 cursor-pointer transition-colors"
                                                onClick={() => router.push(`/discovery?q=${item.code || item.symbol || item.name}`)}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                                                    <span className="font-medium truncate max-w-[120px]">{item.name || item.symbol}</span>
                                                </div>
                                                <span className="text-blue-400 font-mono text-xs">{item.amount || item.value || ""}</span>
                                            </div>
                                        ))}
                                        {(!investorData.institution_top || investorData.institution_top.length === 0) && (
                                            <p className="text-gray-500 text-sm text-center py-4">데이터 없음</p>
                                        )}
                                    </div>
                                </div>

                                {/* Foreign Sell */}
                                <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-2xl p-4">
                                    <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4" /> 외국인 순매도 TOP
                                    </h4>
                                    <div className="space-y-2">
                                        {(investorData.foreign_sell || []).slice(0, 7).map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 cursor-pointer transition-colors"
                                                onClick={() => router.push(`/discovery?q=${item.code || item.symbol || item.name}`)}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                                                    <span className="font-medium truncate max-w-[120px]">{item.name || item.symbol}</span>
                                                </div>
                                                <span className="text-red-400 font-mono text-xs">{item.amount || item.value || ""}</span>
                                            </div>
                                        ))}
                                        {(!investorData.foreign_sell || investorData.foreign_sell.length === 0) && (
                                            <p className="text-gray-500 text-sm text-center py-4">데이터 없음</p>
                                        )}
                                    </div>
                                </div>

                                {/* Institution Sell */}
                                <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-2xl p-4">
                                    <h4 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4" /> 기관 순매도 TOP
                                    </h4>
                                    <div className="space-y-2">
                                        {(investorData.institution_sell || []).slice(0, 7).map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 cursor-pointer transition-colors"
                                                onClick={() => router.push(`/discovery?q=${item.code || item.symbol || item.name}`)}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                                                    <span className="font-medium truncate max-w-[120px]">{item.name || item.symbol}</span>
                                                </div>
                                                <span className="text-purple-400 font-mono text-xs">{item.amount || item.value || ""}</span>
                                            </div>
                                        ))}
                                        {(!investorData.institution_sell || investorData.institution_sell.length === 0) && (
                                            <p className="text-gray-500 text-sm text-center py-4">데이터 없음</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">수급 데이터를 불러올 수 없습니다.</p>
                        )}
                    </div>
                )}

                {/* =============== VOTE TAB =============== */}
                {activeTab === "vote" && (
                    <div className="space-y-6">
                        <div className="text-center space-y-4 py-6">
                            <h3 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                                🗳️ 종목 투표
                            </h3>
                            <p className="text-gray-400">내일 이 종목, 오를까 내릴까?</p>

                            {/* Quick Vote Buttons */}
                            <div className="flex flex-wrap justify-center gap-2">
                                {popularStocks.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setVoteSymbol(s); fetchVoteResults(s); }}
                                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${voteSymbol === s ? "bg-purple-600 text-white scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {/* Custom Input */}
                            <div className="flex gap-2 max-w-sm mx-auto">
                                <input
                                    type="text"
                                    placeholder="종목코드 입력 (예: 005930)"
                                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 uppercase font-mono"
                                    value={voteSymbol}
                                    onChange={e => setVoteSymbol(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && voteSymbol) fetchVoteResults(voteSymbol); }}
                                />
                                <button
                                    onClick={() => voteSymbol && fetchVoteResults(voteSymbol)}
                                    className="px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-sm"
                                >
                                    조회
                                </button>
                            </div>
                        </div>

                        {/* Vote Result */}
                        {voteSymbol && voteResults && (
                            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-3xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="text-center">
                                    <h4 className="text-xl font-black mb-1">{voteSymbol}</h4>
                                    <p className="text-gray-400 text-sm">총 {voteResults.total}명 투표</p>
                                </div>

                                {/* Vote Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="text-red-400">📈 오를것 {voteResults.up_pct}%</span>
                                        <span className="text-blue-400">📉 내릴것 {voteResults.down_pct}%</span>
                                    </div>
                                    <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700 rounded-l-full"
                                            style={{ width: `${voteResults.up_pct}%` }}
                                        />
                                        <div
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700 rounded-r-full"
                                            style={{ width: `${voteResults.down_pct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>{voteResults.up}명</span>
                                        <span>{voteResults.down}명</span>
                                    </div>
                                </div>

                                {/* Vote Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => submitVote(voteSymbol, "up")}
                                        disabled={voting}
                                        className={`py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${userVote === "up"
                                            ? "bg-red-500 text-white ring-2 ring-red-300 shadow-lg shadow-red-500/30"
                                            : "bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/30"
                                            }`}
                                    >
                                        <ThumbsUp className="w-6 h-6 mx-auto mb-1" />
                                        오를것 👆
                                    </button>
                                    <button
                                        onClick={() => submitVote(voteSymbol, "down")}
                                        disabled={voting}
                                        className={`py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${userVote === "down"
                                            ? "bg-blue-500 text-white ring-2 ring-blue-300 shadow-lg shadow-blue-500/30"
                                            : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 border border-blue-500/30"
                                            }`}
                                    >
                                        <ThumbsDown className="w-6 h-6 mx-auto mb-1" />
                                        내릴것 👇
                                    </button>
                                </div>

                                {userVote && (
                                    <p className="text-center text-xs text-gray-500">
                                        ✅ 오늘 투표 완료 ({userVote === "up" ? "오를것" : "내릴것"})
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Disclaimer */}
                <div className="text-center py-4">
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                        * 본 정보는 투자 참고용 데이터이며, 특정 종목의 매수·매도를 권유하지 않습니다.<br />
                        모든 투자 판단과 책임은 이용자 본인에게 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
