"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Zap, TrendingUp, TrendingDown, Volume2, FileText, Users,
    RefreshCw, ChevronRight, Bot, ThumbsUp, ThumbsDown, BarChart3,
    Activity, AlertTriangle, Search, Calendar, ChevronLeft
} from "lucide-react";

// ============ Shared Types ============
interface Signal { id: number; symbol: string; signal_type: string; title: string; summary: string; data: any; created_at: string; }
interface VoteResult { up: number; down: number; total: number; up_pct: number; down_pct: number; }

export default function SignalsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"signals" | "heatmap" | "supply" | "calendar" | "vote">("signals");

    const tabs = [
        { id: "signals" as const, label: "시그널", icon: <Zap className="w-4 h-4" />, gradient: "from-orange-600 to-red-600" },
        { id: "heatmap" as const, label: "히트맵", icon: <BarChart3 className="w-4 h-4" />, gradient: "from-red-600 to-pink-600" },
        { id: "supply" as const, label: "시장 주도주", icon: <Users className="w-4 h-4" />, gradient: "from-green-600 to-emerald-600" },
        { id: "calendar" as const, label: "캘린더", icon: <Calendar className="w-4 h-4" />, gradient: "from-blue-600 to-indigo-600" },
        { id: "vote" as const, label: "투표", icon: <ThumbsUp className="w-4 h-4" />, gradient: "from-purple-600 to-indigo-600" },
    ];

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="시장 인텔리전스" subtitle="시그널 · 히트맵 · 주도주 · 캘린더 · 투표" />
            <div className="max-w-5xl mx-auto p-4 space-y-6">
                {/* Tab Bar */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 min-w-max py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${activeTab === tab.id ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg` : "text-gray-400 hover:text-white"}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === "signals" && <SignalsFeedTab router={router} />}
                {activeTab === "heatmap" && <HeatmapTab router={router} />}
                {activeTab === "supply" && <MarketInsightsTab router={router} />}
                {activeTab === "calendar" && <CalendarTab router={router} />}
                {activeTab === "vote" && <VoteTab />}

                <p className="text-center text-[10px] text-gray-600 mt-4">
                    * 본 정보는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다.
                </p>
            </div>
        </div>
    );
}

// ============ TAB 1: SIGNAL FEED ============
function SignalsFeedTab({ router }: { router: any }) {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [briefingSymbol, setBriefingSymbol] = useState<string | null>(null);
    const [briefing, setBriefing] = useState<any>(null);
    const [briefingLoading, setBriefingLoading] = useState(false);

    // 신규 추가: 공시 상세 모달 상태
    const [selectedDisclosure, setSelectedDisclosure] = useState<Signal | null>(null);

    // 신규 추가: 종목 검색어 상태
    const [searchQuery, setSearchQuery] = useState("");
    const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

    const fetchSignals = async () => { try { const r = await fetch(`${API_BASE_URL}/api/signals?limit=50`); const j = await r.json(); if (j.status === "success") setSignals(j.data || []); } catch { } finally { setLoading(false); } };

    // Auth Token Helper
    const getAuthToken = async () => {
        try {
            const { getAuth } = await import("firebase/auth");
            const auth = getAuth();
            if (auth.currentUser) return await auth.currentUser.getIdToken();
        } catch { }
        return null; // Guest
    };

    const scanSignals = async (type: 'all' | 'watchlist' = 'all') => {
        setScanning(true);
        try {
            const endpoint = type === 'watchlist' ? '/api/signals/scan/watchlist' : '/api/signals/scan';
            const token = await getAuthToken();
            const headers: any = { "Content-Type": "application/json" };
            if (token) headers["x-user-id"] = token;

            const r = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "POST",
                headers
            });
            const j = await r.json();
            if (j.status === "error" && type === 'watchlist') {
                alert(j.message || "관심종목 스캔에 실패했습니다.");
            } else {
                fetchSignals();
                if (type === 'watchlist' && !showWatchlistOnly) {
                    setShowWatchlistOnly(true);
                }
            }
        } catch {
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        if (showWatchlistOnly && watchlistSymbols.length === 0) {
            (async () => {
                const token = await getAuthToken();
                if (!token) { alert("로그인이 필요합니다."); setShowWatchlistOnly(false); return; }
                try {
                    const r = await fetch(`${API_BASE_URL}/api/watchlist`, { headers: { "x-user-id": token } });
                    const j = await r.json();
                    if (j.status === "success" && j.data) {
                        setWatchlistSymbols(j.data.map((item: any) => item.symbol));
                    }
                } catch { }
            })();
        }
    }, [showWatchlistOnly, watchlistSymbols.length]);

    const fetchBriefing = async (sym: string) => { setBriefingSymbol(sym); setBriefingLoading(true); setBriefing(null); try { const r = await fetch(`${API_BASE_URL}/api/signals/${sym}/briefing`); const j = await r.json(); if (j.status === "success") setBriefing(j.data); } catch { } finally { setBriefingLoading(false); } };

    useEffect(() => { fetchSignals(); }, []);

    const getBadge = (t: string) => {
        if (t === "VOLUME_SURGE") return { label: "거래량 폭증", color: "bg-orange-500/20 text-orange-300", border: "border-orange-500/40" };
        if (t === "DISCLOSURE") return { label: "공시", color: "bg-blue-500/20 text-blue-300", border: "border-blue-500/40" };
        if (t === "INVESTOR_SURGE") return { label: "수급 급변", color: "bg-green-500/20 text-green-300", border: "border-green-500/40" };
        return { label: "시그널", color: "bg-gray-500/20 text-gray-300", border: "border-gray-500/40" };
    };

    // 검색어 필터링 로직: 이름 또는 심볼(코드)에 검색어가 포함된 시그널만 표시, 수급 관점 매칭
    const filteredSignals = signals.filter(sig => {
        const matchSearch = !searchQuery || sig.title.toLowerCase().includes(searchQuery.toLowerCase()) || sig.symbol.toLowerCase().includes(searchQuery.toLowerCase());
        const matchWatch = !showWatchlistOnly || watchlistSymbols.includes(sig.symbol);
        return matchSearch && matchWatch;
    });

    return (
        <div className="space-y-4">
            {/* 시그널 안내 패널 (신규 추가) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-orange-400" /> 팩트 기반 실시간 시그널
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        전체 시장 데이터에서 특정 알고리즘 조건(<span className="text-orange-300">거래량 폭증</span>, <span className="text-blue-300">주요 공시</span>, <span className="text-green-300">수급 급변</span>)을 만족한 주요 이벤트만 감지합니다.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-bold flex items-center gap-2">감지된 시그널 탭</h3>
                    <label
                        className="flex items-center gap-1.5 text-xs text-blue-300 font-bold cursor-pointer hover:text-blue-200 transition-colors w-max bg-blue-900/10 px-2 py-1.5 rounded-lg border border-blue-500/20"
                        title="전체 시장의 수많은 시그널 중, 내가 관심 있는 종목의 이벤트만 필터링해서 봅니다."
                    >
                        <input type="checkbox" className="rounded bg-black border-blue-500 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 w-3.5 h-3.5"
                            checked={showWatchlistOnly} onChange={(e) => setShowWatchlistOnly(e.target.checked)} />
                        관심종목 시그널만 필터링
                    </label>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <div className="relative flex-1 sm:w-48">
                        <input
                            type="text"
                            placeholder="종목명/코드 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                        />
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-white text-xs z-10">✕</button>
                        )}
                    </div>

                    <button onClick={() => scanSignals('watchlist')} disabled={scanning} className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                        <Users className="w-4 h-4" />내 종목 스캔
                    </button>

                    <button onClick={() => scanSignals('all')} disabled={scanning} className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                        <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />{scanning ? "스캔 중" : "전체 스캔"}
                    </button>
                </div>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />로딩 중...</div>
                : filteredSignals.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">{searchQuery ? `'${searchQuery}'에 대한 시그널 검색 결과가 없습니다` : '아직 감지된 시그널이 없습니다'}</p>
                        {!searchQuery && <button onClick={() => scanSignals('all')} className="px-6 py-2 bg-orange-600 rounded-xl text-sm font-bold">🔍 첫 스캔 실행</button>}
                    </div>
                ) : filteredSignals.map(sig => {
                    const badge = getBadge(sig.signal_type);

                    const handleSignalClick = () => {
                        if (sig.signal_type === "DISCLOSURE") {
                            setSelectedDisclosure(sig);
                        } else {
                            router.push(`/discovery?q=${sig.symbol}`);
                        }
                    };

                    return (
                        <div key={sig.id} className={`bg-white/5 border ${badge.border} rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer`} onClick={handleSignalClick}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badge.color}`}>{badge.label}</span>
                                        <span className="text-xs text-gray-500">{new Date(sig.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <h4 className="font-bold text-white text-sm">{sig.title}</h4>
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{sig.summary}</p>
                                </div>
                                <button onClick={e => { e.stopPropagation(); fetchBriefing(sig.symbol); }} className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold ml-2">
                                    <Bot className="w-3.5 h-3.5" /> AI
                                </button>
                            </div>
                        </div>
                    );
                })}

            {/* AI 브리핑 모달 */}
            {briefingSymbol && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setBriefingSymbol(null)}>
                    <div className="bg-gray-900 border border-white/20 rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-blue-400" />AI 1분 브리핑 — {briefingSymbol}</h3>
                            <button onClick={() => setBriefingSymbol(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
                        </div>
                        {briefingLoading ? <div className="text-center py-8"><Bot className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-pulse" /><p className="text-gray-400">AI 분석 중...</p></div>
                            : briefing ? (
                                <div className="space-y-4">
                                    {briefing.price && (
                                        <div className="flex items-center gap-4 bg-white/5 rounded-xl p-3">
                                            <span className="text-2xl font-black">{briefing.price.price !== "N/A" ? briefing.price.price : ""}</span>
                                            {briefing.price.change_pct !== "N/A" && (
                                                <span className={`text-sm font-bold ${parseFloat(briefing.price.change_pct) >= 0 ? "text-red-400" : "text-blue-400"}`}>
                                                    {briefing.price.change_pct.includes('%') ? briefing.price.change_pct : `${briefing.price.change_pct}%`}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                                        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{briefing.briefing}</p>
                                    </div>
                                    {briefing.key_points && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-gray-400">핵심 포인트</h4>
                                            {briefing.key_points.map((p: string, i: number) => (
                                                <div key={i} className="flex items-start gap-2 text-sm bg-gray-800/50 p-2 rounded-lg border border-white/5">
                                                    <span className="text-blue-400 mt-0.5">•</span>
                                                    <span className="text-gray-300 leading-relaxed">{p}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-600 text-center mt-2">{briefing.disclaimer}</p>
                                </div>
                            ) : <p className="text-gray-500 text-center py-8">불러올 수 없습니다</p>}
                    </div>
                </div>
            )}

            {/* 공시 상세 모달 */}
            {selectedDisclosure && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDisclosure(null)}>
                    <div className="bg-gray-900 border border-white/20 rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" />공시 상세</h3>
                            <button onClick={() => setSelectedDisclosure(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-xs font-bold">
                                    {selectedDisclosure.data?.type || "공시"}
                                </span>
                                {selectedDisclosure.data?.is_important && (
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full text-xs font-bold">
                                        주요
                                    </span>
                                )}
                                <span className="text-xs text-gray-400">
                                    {selectedDisclosure.data?.date || new Date(selectedDisclosure.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <h4 className="text-xl font-bold text-white leading-snug">
                                {selectedDisclosure.data?.full_title || selectedDisclosure.title}
                            </h4>

                            <p className="text-sm text-gray-400">
                                관련 종목: <span className="text-white font-bold">{selectedDisclosure.symbol}</span>
                            </p>

                            {selectedDisclosure.data?.link && (
                                <a
                                    href={selectedDisclosure.data.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
                                >
                                    <FileText className="w-4 h-4" /> DART/네이버 공시 원문 보기
                                </a>
                            )}

                            <button
                                onClick={() => router.push(`/discovery?q=${selectedDisclosure.symbol}`)}
                                className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-colors"
                            >
                                <Search className="w-4 h-4" /> 종목 분석으로 이동
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ TAB 2: HEATMAP ============
function HeatmapTab({ router }: { router: any }) {
    const [sectors, setSectors] = useState<any[]>([]);
    const [heatmap, setHeatmap] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"sectors" | "themes">("sectors");

    useEffect(() => {
        (async () => {
            try {
                const [s, h] = await Promise.all([fetch(`${API_BASE_URL}/api/korea/sectors`), fetch(`${API_BASE_URL}/api/korea/heatmap`)]);
                const sj = await s.json(), hj = await h.json();
                if (sj.status === "success") {
                    const raw = sj.data || [];
                    const normalized = Array.isArray(raw) ? raw.map((s: any) => {
                        // 백엔드가 change(숫자)를 직접 보내주면 우선 사용
                        if (typeof s.change === "number") {
                            return { name: s.name || s.theme || "", change: s.change };
                        }
                        // fallback: percent 문자열 파싱 (+/- 부호 포함)
                        const pStr = String(s.percent || "0");
                        const isNeg = pStr.includes("-") || pStr.includes("▼");
                        const val = parseFloat(pStr.replace(/[^0-9.]/g, "")) || 0;
                        return { name: s.name || s.theme || "", change: isNeg ? -val : val };
                    }) : (raw.top_sectors || []);
                    setSectors(normalized);
                }
                if (hj.status === "success") {
                    const raw2 = hj.data || [];
                    const normalized2 = Array.isArray(raw2) ? raw2.map((h: any) => {
                        // 백엔드의 change(숫자) 우선 사용
                        if (typeof h.change === "number") {
                            return { name: h.theme || h.name || "", change: h.change, stocks: h.stocks || [] };
                        }
                        // fallback: percent 문자열 파싱
                        const pStr = String(h.percent || "0");
                        const isNeg = pStr.includes("-") || pStr.includes("▼");
                        const val = parseFloat(pStr.replace(/[^0-9.]/g, "")) || 0;
                        return { name: h.theme || h.name || "", change: isNeg ? -val : val, stocks: h.stocks || [] };
                    }) : [];
                    setHeatmap(normalized2);
                }
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    const getColor = (c: number) => c >= 3 ? "bg-red-500" : c >= 1.5 ? "bg-red-600/80" : c >= 0.5 ? "bg-red-700/60" : c > 0 ? "bg-red-900/40" : c === 0 ? "bg-gray-700" : c > -0.5 ? "bg-blue-900/40" : c > -1.5 ? "bg-blue-700/60" : c > -3 ? "bg-blue-600/80" : "bg-blue-500";

    const data = view === "sectors" ? sectors : (Array.isArray(heatmap) ? heatmap : []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                    <button onClick={() => setView("sectors")} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${view === "sectors" ? "bg-red-600 text-white" : "text-gray-400"}`}>업종별</button>
                    <button onClick={() => setView("themes")} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${view === "themes" ? "bg-purple-600 text-white" : "text-gray-400"}`}>테마별</button>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-gray-500">
                    <span className="w-4 h-2 bg-blue-500 rounded" />하락 <span className="w-4 h-2 bg-gray-700 rounded ml-1" />보합 <span className="w-4 h-2 bg-red-500 rounded ml-1" />상승
                </div>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500"><RefreshCw className="w-8 h-8 animate-spin mx-auto" /></div> : (
                <>
                    <div className={`grid ${view === "sectors" ? "grid-cols-3 md:grid-cols-5" : "grid-cols-3 md:grid-cols-4"} gap-2`}>
                        {data.map((item: any, i: number) => {
                            const c = typeof item.change === "number" ? item.change : parseFloat(String(item.change || "0").replace(/[^0-9.-]/g, ""));
                            return (
                                <div key={i} className={`${getColor(c)} rounded-xl p-3 flex flex-col items-center justify-center min-h-[70px] hover:scale-105 transition-transform cursor-pointer border border-white/5`}
                                    onClick={() => view === "themes" ? router.push(`/theme?q=${encodeURIComponent(item.name)}`) : null}>
                                    <span className="font-bold text-[11px] text-center leading-tight text-white/90">{item.name}</span>
                                    <span className={`text-sm font-black mt-0.5 ${c >= 0 ? "text-red-200" : "text-blue-200"}`}>{c >= 0 ? "+" : ""}{c.toFixed(2)}%</span>
                                </div>
                            );
                        })}
                    </div>

                    {view === "sectors" && sectors.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-3">
                                <h4 className="font-bold text-red-400 text-sm mb-2 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />상승 TOP</h4>
                                {(() => {
                                    const ups = sectors.filter(s => (s.change || 0) > 0).sort((a, b) => (b.change || 0) - (a.change || 0)).slice(0, 5);
                                    if (ups.length === 0) return <div className="text-xs text-gray-500 py-2 text-center">상승 업종 없음</div>;
                                    return ups.map((s, i) => (
                                        <div key={i} className="flex justify-between py-1 text-xs"><span className="text-gray-300">{i + 1}. {s.name}</span><span className="text-red-400 font-bold">+{(s.change || 0).toFixed(2)}%</span></div>
                                    ));
                                })()}
                            </div>
                            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-3">
                                <h4 className="font-bold text-blue-400 text-sm mb-2 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" />하락 TOP</h4>
                                {(() => {
                                    const downs = sectors.filter(s => (s.change || 0) < 0).sort((a, b) => (a.change || 0) - (b.change || 0)).slice(0, 5);
                                    if (downs.length === 0) return <div className="text-xs text-gray-500 py-2 text-center">하락 업종 없음</div>;
                                    return downs.map((s, i) => (
                                        <div key={i} className="flex justify-between py-1 text-xs"><span className="text-gray-300">{i + 1}. {s.name}</span><span className="text-blue-400 font-bold">{(s.change || 0).toFixed(2)}%</span></div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ============ TAB 3: MARKET INSIGHTS (구 수급/공매도) ============
function MarketInsightsTab({ router }: { router: any }) {
    const [insightsData, setInsightsData] = useState<any>(null);
    const [investorData, setInvestorData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState<"volume" | "value">("volume");

    useEffect(() => {
        (async () => {
            try {
                // 1. 거래량 및 상승률 상위 (기존 API)
                const r1 = await fetch(`${API_BASE_URL}/api/investors/top`);
                const j1 = await r1.json();
                if (j1.status === "success") setInvestorData(j1.data);

                // 2. 실시간 검색 및 거래대금 상위 (신규 API)
                const r2 = await fetch(`${API_BASE_URL}/api/market-insights`);
                const j2 = await r2.json();
                if (j2.status === "success") setInsightsData(j2.data);
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    const renderList = (title: string, items: any[], color: string, icon: any, sliceNum: number = 10) => (
        <div className={`bg-${color}-900/10 border border-${color}-500/30 rounded-xl p-3`}>
            <h4 className={`font-bold text-${color}-400 text-sm mb-2 flex items-center gap-1`}>{icon} {title}</h4>
            {(items || []).slice(0, sliceNum).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-2 py-1.5 mb-1 hover:bg-white/10 cursor-pointer"
                    onClick={() => router.push(`/discovery?q=${item.symbol || item.name}`)}>
                    <span className="font-medium truncate max-w-[120px]">{i + 1}. {item.name}</span>
                    <span className={`text-${color}-400 font-mono text-[10px]`}>{item.amount || item.value || ""}</span>
                </div>
            ))}
            {(!items || items.length === 0) && <p className="text-gray-500 text-xs text-center py-3">데이터 없음</p>}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                <button onClick={() => setSubTab("volume")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${subTab === "volume" ? "bg-green-600 text-white" : "text-gray-400"}`}>🔥 급등·거래량 상위</button>
                <button onClick={() => setSubTab("value")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${subTab === "value" ? "bg-orange-600 text-white" : "text-gray-400"}`}>💰 검색·거래대금 상위</button>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500"><RefreshCw className="w-8 h-8 animate-spin mx-auto" /></div>
                : subTab === "volume" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {renderList("KOSPI 상승률 TOP", investorData?.foreign_sell || [], "red", <TrendingUp className="w-3.5 h-3.5" />, 7)}
                        {renderList("KOSDAQ 상승률 TOP", investorData?.institution_sell || [], "purple", <TrendingUp className="w-3.5 h-3.5" />, 7)}
                        {renderList("KOSPI 거래량 TOP", investorData?.foreign_top || [], "green", <Activity className="w-3.5 h-3.5" />, 7)}
                        {renderList("KOSDAQ 거래량 TOP", investorData?.institution_top || [], "blue", <Activity className="w-3.5 h-3.5" />, 7)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {renderList("실시간 검색 순위 (개인투자자 관심도)", insightsData?.search_top || [], "orange", <Search className="w-3.5 h-3.5" />, 15)}
                        {renderList("거래대금 상위 (실수급/큰손 포착)", insightsData?.value_top || [], "yellow", <Zap className="w-3.5 h-3.5" />, 15)}
                    </div>
                )}
        </div>
    );
}

// ============ TAB 4: CALENDAR ============
function CalendarTab({ router }: { router: any }) {
    // 메인 서브탭 상태 (경제지표 / 실적·배당 / 공모주)
    const [mainTab, setMainTab] = useState<"economic" | "earndiv" | "ipo">("economic");

    // ── 경제지표 ──
    const [macroEvents, setMacroEvents] = useState<any[]>([]);
    const [macroLoading, setMacroLoading] = useState(true);
    const [countryFilter, setCountryFilter] = useState<"global" | "kr">("global");
    const [krEvents, setKrEvents] = useState<any[]>([]);
    const [krLoading, setKrLoading] = useState(false);

    // ── 실적·배당 ──
    const [events, setEvents] = useState<any[]>([]);
    const [earndivLoading, setEarndivLoading] = useState(true);
    const [calTab, setCalTab] = useState<"earnings" | "dividend">("earnings");
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // ── 공모주(IPO) ──
    const [ipos, setIpos] = useState<any[]>([]);
    const [ipoLoading, setIpoLoading] = useState(true);

    // 경제지표 데이터 fetch (글로벌)
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/market/calendar`);
                const j = await r.json();
                if (j.status === "success") setMacroEvents(j.data || []);
            } catch { }
            finally { setMacroLoading(false); }
        })();
    }, []);

    // 한국 경제지표 fetch (필터 변경 시)
    useEffect(() => {
        if (countryFilter !== "kr") return;
        if (krEvents.length > 0) return; // 이미 로드됨
        setKrLoading(true);
        (async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/market/calendar/korea`);
                const j = await r.json();
                if (j.status === "success") setKrEvents(j.data || []);
            } catch { }
            finally { setKrLoading(false); }
        })();
    }, [countryFilter]);

    // 실적·배당 데이터 fetch
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/calendar/events`);
                const j = await r.json();
                if (j.status === "success") setEvents(j.data || []);
            } catch { }
            finally { setEarndivLoading(false); }
        })();
    }, []);

    // 공모주 데이터 fetch
    useEffect(() => {
        if (mainTab !== "ipo") return;
        (async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/korea/ipo`);
                const j = await r.json();
                if (j.status === "success") {
                    setIpos(j.data.map((item: any) => ({
                        ...item,
                        subscription_date: item.date,
                        fixed_price: item.price,
                        price_band: ""
                    })));
                }
            } catch { }
            finally { setIpoLoading(false); }
        })();
    }, [mainTab]);

    // 실적·배당 달력 계산
    const filtered = events.filter(e => e.type === calTab);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const isToday = (d: number) => {
        const n = new Date();
        return n.getFullYear() === currentMonth.getFullYear() && n.getMonth() === currentMonth.getMonth() && n.getDate() === d;
    };
    const getEventsForDay = (d: number) => {
        const ds = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return filtered.filter(e => e.date === ds);
    };
    const icon = (t: string) => t === "earnings" ? "📊" : t === "dividend" ? "💰" : "🆕";

    return (
        <div className="space-y-4">
            {/* 메인 서브탭 */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                <button onClick={() => setMainTab("economic")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mainTab === "economic" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    📈 경제 지표
                </button>
                <button onClick={() => setMainTab("earndiv")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mainTab === "earndiv" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    📊 실적·배당
                </button>
                <button onClick={() => setMainTab("ipo")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mainTab === "ipo" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    🆕 공모주
                </button>
            </div>

            {/* ── 경제 지표 탭 ── */}
            {mainTab === "economic" && (
                <div className="space-y-3">
                    {/* 국가 필터 */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCountryFilter("global")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${countryFilter === "global" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                        >🌐 글로벌</button>
                        <button
                            onClick={() => setCountryFilter("kr")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${countryFilter === "kr" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                        >🇰🇷 한국</button>
                    </div>

                    {/* 글로벌 지표 (Yahoo Finance) */}
                    {countryFilter === "global" && (
                        <>
                            <p className="text-xs text-gray-500">오늘 주요 경제 지표 발표 일정 (Yahoo Finance)</p>
                            {macroLoading ? (
                                <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-500" /></div>
                            ) : macroEvents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p>오늘 주요 경제 일정이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {macroEvents.map((evt, i) => (
                                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="flex flex-col items-center min-w-[70px]">
                                                    <span className={`text-xs font-mono font-bold ${evt.impact === "high" ? "text-red-400" : "text-gray-400"}`}>{evt.time}</span>
                                                    {evt.impact === "high" && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold text-sm break-words ${evt.impact === "high" ? "text-white" : "text-gray-200"}`}>{evt.event_kr || evt.event}</div>
                                                    {evt.event_kr && evt.event_kr !== evt.event && <div className="text-[10px] text-gray-500 mt-0.5">{evt.event}</div>}
                                                    {(evt.forecast !== "-" || evt.previous !== "-") && (
                                                        <div className="flex gap-3 mt-1 text-[11px] text-gray-400">
                                                            {evt.forecast !== "-" && <span>예상 <span className="text-yellow-400 font-mono">{evt.forecast}</span></span>}
                                                            {evt.previous !== "-" && <span>이전 <span className="text-gray-300 font-mono">{evt.previous}</span></span>}
                                                            {evt.actual !== "-" && <span>실제 <span className="text-green-400 font-mono font-bold">{evt.actual}</span></span>}
                                                        </div>
                                                    )}
                                                </div>
                                                {evt.impact === "high" && <span className="text-[9px] bg-red-900/40 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold flex-shrink-0">HIGH</span>}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-end gap-2 text-[10px] text-gray-500 pt-1">
                                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> High Impact
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* 한국 경제 지표 */}
                    {countryFilter === "kr" && (
                        <>
                            <p className="text-xs text-gray-500">🇰🇷 한국 주요 경제 지표 (실시간)</p>
                            {krLoading ? (
                                <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-500" /></div>
                            ) : krEvents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p>한국 경제 지표를 불러올 수 없습니다.</p>
                                </div>
                            ) : (() => {
                                // 카테고리별 그룹화
                                const CATEGORY_ORDER = ["🏦 주가지수", "📋 채권금리", "💱 환율", "⛽ 원자재", "😨 시장심리", "🌐 글로벌지수", "₿ 가상자산"];
                                const grouped: Record<string, any[]> = {};
                                krEvents.forEach(evt => {
                                    const cat = evt.category || "기타";
                                    if (!grouped[cat]) grouped[cat] = [];
                                    grouped[cat].push(evt);
                                });
                                const CAT_STYLE: Record<string, { bg: string; border: string; badge: string }> = {
                                    "🏦 주가지수": { bg: "bg-blue-900/15", border: "border-blue-500/20", badge: "bg-blue-900/50 text-blue-300 border-blue-500/30" },
                                    "📋 채권금리": { bg: "bg-purple-900/15", border: "border-purple-500/20", badge: "bg-purple-900/50 text-purple-300 border-purple-500/30" },
                                    "💱 환율": { bg: "bg-green-900/15", border: "border-green-500/20", badge: "bg-green-900/50 text-green-300 border-green-500/30" },
                                    "⛽ 원자재": { bg: "bg-orange-900/15", border: "border-orange-500/20", badge: "bg-orange-900/50 text-orange-300 border-orange-500/30" },
                                    "😨 시장심리": { bg: "bg-red-900/15", border: "border-red-500/20", badge: "bg-red-900/50 text-red-300 border-red-500/30" },
                                    "🌐 글로벌지수": { bg: "bg-indigo-900/15", border: "border-indigo-500/20", badge: "bg-indigo-900/50 text-indigo-300 border-indigo-500/30" },
                                    "₿ 가상자산": { bg: "bg-yellow-900/15", border: "border-yellow-500/20", badge: "bg-yellow-900/50 text-yellow-300 border-yellow-500/30" },
                                };
                                const ordered = [...CATEGORY_ORDER.filter(k => grouped[k]), ...Object.keys(grouped).filter(k => !CATEGORY_ORDER.includes(k))];
                                return (
                                    <div className="space-y-4">
                                        {ordered.map(cat => {
                                            const items = grouped[cat];
                                            const style = CAT_STYLE[cat] || { bg: "bg-white/5", border: "border-white/10", badge: "bg-white/10 text-gray-300 border-white/20" };
                                            return (
                                                <div key={cat} className={`${style.bg} border ${style.border} rounded-2xl p-4`}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="font-black text-sm text-white">{cat}</span>
                                                        <span className={`text-[9px] border px-1.5 py-0.5 rounded font-bold ${style.badge}`}>{items.length}개</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {items.map((evt, i) => {
                                                            const chgVal = evt.change_val;
                                                            const isUp = chgVal !== null && chgVal !== undefined ? chgVal > 0 : evt.change?.startsWith("+");
                                                            const isDown = chgVal !== null && chgVal !== undefined ? chgVal < 0 : evt.change?.startsWith("-");
                                                            // 지표 이름 간략화 (카테고리 prefix "[한국]" 제거)
                                                            const label = (evt.event_kr || evt.event || "").replace(/^\[한국\]\s*/, "").trim();
                                                            return (
                                                                <div key={i} className="bg-black/30 rounded-xl p-3 flex flex-col gap-1 hover:bg-black/50 transition-colors">
                                                                    <span className="text-[10px] text-gray-400 font-medium leading-tight">{label}</span>
                                                                    <div className="flex items-end justify-between gap-1">
                                                                        <span className="text-base font-black text-white font-mono leading-none">{evt.actual || "-"}</span>
                                                                        {evt.change && evt.change !== "" && (
                                                                            <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${isUp ? "bg-red-500/20 text-red-400" : isDown ? "bg-blue-500/20 text-blue-400" : "bg-gray-700/50 text-gray-400"}`}>
                                                                                {evt.change}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {evt.previous && evt.previous !== "-" && (
                                                                        <span className="text-[9px] text-gray-600 font-mono">전일 {evt.previous}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <p className="text-[10px] text-gray-600 text-center">* 실시간 데이터 (yfinance 기준) · 한국 상승=🔴 하락=🔵</p>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            )}

            {/* ── 실적·배당 탭 ── */}
            {mainTab === "earndiv" && (
                <div className="space-y-4">
                    <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                        <button onClick={() => setCalTab("earnings")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${calTab === "earnings" ? "bg-blue-600 text-white" : "text-gray-400"}`}>📊 실적</button>
                        <button onClick={() => setCalTab("dividend")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${calTab === "dividend" ? "bg-green-600 text-white" : "text-gray-400"}`}>💰 배당</button>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1.5 hover:bg-white/10 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                            <h3 className="text-lg font-black">{currentMonth.toLocaleString("ko-KR", { year: "numeric", month: "long" })}</h3>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1.5 hover:bg-white/10 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {["일", "월", "화", "수", "목", "금", "토"].map(d => <div key={d} className={`text-center text-[10px] font-bold py-1 ${d === "일" ? "text-red-400" : d === "토" ? "text-blue-400" : "text-gray-500"}`}>{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} className="min-h-[55px]" />)}
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1, evs = getEventsForDay(day), dow = (firstDay + i) % 7;
                                return (
                                    <div key={day} className={`min-h-[55px] rounded-lg p-1 border ${isToday(day) ? "border-orange-500/50 bg-orange-500/10" : evs.length > 0 ? "border-white/10 bg-white/5" : "border-transparent"}`}>
                                        <span className={`text-[10px] font-bold ${isToday(day) ? "text-orange-400" : dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-300"}`}>{day}</span>
                                        {evs.slice(0, 2).map((ev, j) => <div key={j} className="text-[8px] truncate rounded px-0.5 py-0.5 bg-white/5 mt-0.5 cursor-pointer" onClick={() => router.push(`/discovery?q=${ev.symbol}`)} title={ev.name}>{icon(ev.type)} {ev.name}</div>)}
                                        {evs.length > 2 && <span className="text-[8px] text-gray-500">+{evs.length - 2}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <h4 className="font-bold text-sm text-gray-400">다가오는 일정</h4>
                    {earndivLoading ? <div className="text-center py-6"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-500" /></div>
                        : filtered.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).map((ev, i) => {
                            const dDay = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86400000);
                            return (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 cursor-pointer flex justify-between items-center" onClick={() => router.push(`/discovery?q=${ev.symbol}`)}>
                                    <div className="flex items-center gap-2"><span className="text-lg">{icon(ev.type)}</span><div><span className="font-bold text-sm">{ev.name}</span><span className="text-gray-500 text-xs ml-1">{ev.symbol}</span><p className="text-[10px] text-gray-400">{ev.detail}</p></div></div>
                                    <div className="text-right"><div className="text-xs font-mono text-gray-400">{ev.date}</div><span className={`text-xs font-bold ${dDay <= 3 ? "text-red-400" : dDay <= 7 ? "text-yellow-400" : "text-gray-400"}`}>{dDay > 0 ? `D-${dDay}` : dDay === 0 ? "오늘" : `D+${Math.abs(dDay)}`}</span></div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* ── 공모주(IPO) 탭 ── */}
            {mainTab === "ipo" && (
                <div className="space-y-3">
                    <p className="text-xs text-gray-500">한국 공모주 청약 일정 (38커뮤니케이션 제공)</p>
                    {ipoLoading ? (
                        <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-500" /></div>
                    ) : ipos.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                            <p>예정된 공모주가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/10 text-gray-300 text-xs font-bold sticky top-0 backdrop-blur-md z-10">
                                        <tr>
                                            <th className="p-3 whitespace-nowrap">종목명</th>
                                            <th className="p-3 whitespace-nowrap text-center">공모일정</th>
                                            <th className="p-3 whitespace-nowrap text-right">공모가</th>
                                            <th className="p-3 whitespace-nowrap text-center">정보</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm">
                                        {ipos.map((ipo, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                <td className="p-3 font-bold text-white align-middle">{ipo.name}</td>
                                                <td className="p-3 text-gray-300 text-xs align-middle text-center font-mono">{ipo.subscription_date}</td>
                                                <td className="p-3 text-right align-middle">
                                                    {ipo.fixed_price && ipo.fixed_price !== "-" && (
                                                        <span className="text-red-400 font-bold font-mono text-xs bg-red-900/20 px-1.5 py-0.5 rounded">{ipo.fixed_price}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center align-middle">
                                                    <button
                                                        onClick={() => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(ipo.name + " 공모주")}`, '_blank')}
                                                        className="bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-1.5 rounded text-xs transition-colors border border-white/5"
                                                    >정보</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============ TAB 5: VOTE ============
function VoteTab() {
    const { user } = useAuth();
    const [voteSymbol, setVoteSymbol] = useState("");
    const [voteResults, setVoteResults] = useState<VoteResult | null>(null);
    const [userVote, setUserVote] = useState<string | null>(null);
    const [voting, setVoting] = useState(false);
    const [yesterdayData, setYesterdayData] = useState<any | null>(null);
    const [yesterdayLoading, setYesterdayLoading] = useState(false);
    const pops = ["005930", "000660", "373220", "035420", "068270", "AAPL", "TSLA", "NVDA"];

    // 오늘 투표 결과 조회
    const fetchVotes = async (sym: string) => {
        try {
            const uid = user?.id || "guest";
            const r = await fetch(`${API_BASE_URL}/api/votes/${sym}`, { headers: { "X-User-Id": uid } });
            const j = await r.json();
            if (j.status === "success") { setVoteResults(j.data); setUserVote(j.user_vote); }
        } catch { }
    };

    // 어제 예측 vs 실제 결과 조회
    const fetchYesterday = async (sym: string) => {
        setYesterdayLoading(true);
        setYesterdayData(null);
        try {
            const r = await fetch(`${API_BASE_URL}/api/votes/${sym}/yesterday`);
            const j = await r.json();
            if (j.status === "success" && j.data) setYesterdayData(j.data);
        } catch { }
        finally { setYesterdayLoading(false); }
    };

    // 종목 선택 시 오늘 + 어제 동시 조회
    const selectSymbol = (sym: string) => {
        setVoteSymbol(sym);
        fetchVotes(sym);
        fetchYesterday(sym);
    };

    const submitVote = async (sym: string, dir: string) => {
        if (!user) return;
        setVoting(true);
        try {
            const r = await fetch(`${API_BASE_URL}/api/votes/${sym}`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": user.id }, body: JSON.stringify({ direction: dir }) });
            const j = await r.json();
            if (j.status === "success") { setVoteResults(j.results); setUserVote(dir); }
        } catch { } finally { setVoting(false); }
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-4 py-4">
                <h3 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">🗳️ 종목 투표</h3>
                <p className="text-gray-400 text-sm">내일 이 종목, 오를까 내릴까?</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {pops.map(s => <button key={s} onClick={() => selectSymbol(s)} className={`px-4 py-2 rounded-full text-sm font-bold ${voteSymbol === s ? "bg-purple-600 text-white scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{s}</button>)}
                </div>
                <div className="flex gap-2 max-w-sm mx-auto">
                    <input type="text" placeholder="종목코드 입력" className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 uppercase font-mono" value={voteSymbol} onChange={e => setVoteSymbol(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && voteSymbol) selectSymbol(voteSymbol); }} />
                    <button onClick={() => voteSymbol && selectSymbol(voteSymbol)} className="px-4 py-2.5 bg-purple-600 rounded-xl font-bold text-sm">조회</button>
                </div>
            </div>

            {/* ── 어제 예측 vs 실제 결과 카드 ── */}
            {voteSymbol && (
                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 mb-3 font-bold">📅 어제 커뮤니티 예측 결과</p>
                    {yesterdayLoading ? (
                        <div className="flex justify-center py-3"><RefreshCw className="w-4 h-4 animate-spin text-gray-500" /></div>
                    ) : !yesterdayData ? (
                        <p className="text-center text-xs text-gray-600 py-2">어제 투표 데이터가 없습니다.</p>
                    ) : (
                        <div className="space-y-3">
                            {/* 투표 분포 바 */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-red-400">📈 오를것 {yesterdayData.yesterday_votes.up_pct}%</span>
                                    <span className="text-xs text-gray-500">{yesterdayData.yesterday_votes.total}명 참여</span>
                                    <span className="text-blue-400">📉 내릴것 {yesterdayData.yesterday_votes.down_pct}%</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                                    <div className="bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700 rounded-l-full" style={{ width: `${yesterdayData.yesterday_votes.up_pct}%` }} />
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700 rounded-r-full" style={{ width: `${yesterdayData.yesterday_votes.down_pct}%` }} />
                                </div>
                            </div>

                            {/* 실제 주가 결과 */}
                            <div className={`rounded-xl p-3 border ${yesterdayData.is_correct === true ? "bg-green-900/20 border-green-500/30" : yesterdayData.is_correct === false ? "bg-red-900/20 border-red-500/30" : "bg-white/5 border-white/10"}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-400">실제 주가 변동</p>
                                        {yesterdayData.actual_change_pct !== null ? (
                                            <p className={`text-lg font-black ${yesterdayData.actual_change_pct > 0 ? "text-red-400" : yesterdayData.actual_change_pct < 0 ? "text-blue-400" : "text-gray-400"}`}>
                                                {yesterdayData.actual_change_pct > 0 ? "+" : ""}{yesterdayData.actual_change_pct}%
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-500">데이터 없음</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {yesterdayData.is_correct === true && <div><p className="text-2xl">✅</p><p className="text-xs text-green-400 font-bold">예측 적중!</p></div>}
                                        {yesterdayData.is_correct === false && <div><p className="text-2xl">❌</p><p className="text-xs text-red-400 font-bold">예측 빗나감</p></div>}
                                        {yesterdayData.is_correct === null && <div><p className="text-2xl">❓</p><p className="text-xs text-gray-500 font-bold">확인불가</p></div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── 오늘 투표 카드 ── */}
            {voteSymbol && voteResults && (
                <div className="bg-purple-900/10 border border-purple-500/30 rounded-2xl p-6 space-y-5">
                    <div className="text-center"><h4 className="text-xl font-black">{voteSymbol}</h4><p className="text-gray-400 text-sm">오늘 커뮤니티 예측 · 총 {voteResults.total}명</p></div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-bold"><span className="text-red-400">📈 오를것 {voteResults.up_pct}%</span><span className="text-blue-400">📉 내릴것 {voteResults.down_pct}%</span></div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
                            <div className="bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700 rounded-l-full" style={{ width: `${voteResults.up_pct}%` }} />
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700 rounded-r-full" style={{ width: `${voteResults.down_pct}%` }} />
                        </div>
                    </div>
                    {/* 로그인 상태에 따라 투표 UI */}
                    {user ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => submitVote(voteSymbol, "up")} disabled={voting} className={`py-4 rounded-2xl font-black text-lg active:scale-95 ${userVote === "up" ? "bg-red-500 text-white ring-2 ring-red-300" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}><ThumbsUp className="w-5 h-5 mx-auto mb-1" />오를것 👆</button>
                                <button onClick={() => submitVote(voteSymbol, "down")} disabled={voting} className={`py-4 rounded-2xl font-black text-lg active:scale-95 ${userVote === "down" ? "bg-blue-500 text-white ring-2 ring-blue-300" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}><ThumbsDown className="w-5 h-5 mx-auto mb-1" />내릴것 👇</button>
                            </div>
                            {userVote && <p className="text-center text-xs text-gray-500">✅ 오늘 투표 완료 ({userVote === "up" ? "오를것" : "내릴것"})</p>}
                        </>
                    ) : (
                        <div className="text-center border border-purple-500/30 bg-purple-900/10 rounded-2xl p-5">
                            <p className="text-3xl mb-2">🔒</p>
                            <p className="font-bold text-white text-sm mb-1">로그인 후 투표할 수 있어요</p>
                            <p className="text-gray-500 text-xs mb-4">구글 계정으로 로그인하면 투표에 참여할 수 있습니다.</p>
                            <p className="text-[10px] text-gray-600">* 투표 결과는 누구나 조회할 수 있습니다</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
