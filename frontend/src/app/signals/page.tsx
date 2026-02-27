"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-orange-400" />최근 감지된 시그널</h3>
                    <label className="flex items-center gap-1.5 text-xs text-blue-300 font-bold cursor-pointer hover:text-blue-200 transition-colors w-max bg-blue-900/10 px-2 py-1.5 rounded-lg border border-blue-500/20">
                        <input type="checkbox" className="rounded bg-black border-blue-500 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 w-3.5 h-3.5"
                            checked={showWatchlistOnly} onChange={(e) => setShowWatchlistOnly(e.target.checked)} />
                        내 관심종목 전용만 보기
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
                    return (
                        <div key={sig.id} className={`bg-white/5 border ${badge.border} rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer`} onClick={() => router.push(`/discovery?q=${sig.symbol}`)}>
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
                        const pStr = String(s.percent || s.change || "0");
                        const isNeg = pStr.includes("-");
                        const val = parseFloat(pStr.replace(/[^0-9.]/g, "")) || 0;
                        return { name: s.name || s.theme || "", change: isNeg ? -val : val };
                    }) : (raw.top_sectors || []);
                    setSectors(normalized);
                }
                if (hj.status === "success") {
                    const raw2 = hj.data || [];
                    const normalized2 = Array.isArray(raw2) ? raw2.map((h: any) => {
                        const pStr = String(h.percent || h.change || "0");
                        const isNeg = pStr.includes("-");
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
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [calTab, setCalTab] = useState<"earnings" | "dividend" | "ipo">("earnings");
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => { (async () => { try { const r = await fetch(`${API_BASE_URL}/api/calendar/events`); const j = await r.json(); if (j.status === "success") setEvents(j.data || []); } catch { } finally { setLoading(false); } })(); }, []);

    const filtered = events.filter(e => e.type === calTab);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const isToday = (d: number) => { const n = new Date(); return n.getFullYear() === currentMonth.getFullYear() && n.getMonth() === currentMonth.getMonth() && n.getDate() === d; };

    const getEventsForDay = (d: number) => {
        const ds = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return filtered.filter(e => e.date === ds);
    };

    const icon = (t: string) => t === "earnings" ? "📊" : t === "dividend" ? "💰" : "🆕";

    return (
        <div className="space-y-4">
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                <button onClick={() => setCalTab("earnings")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${calTab === "earnings" ? "bg-blue-600 text-white" : "text-gray-400"}`}>📊 실적</button>
                <button onClick={() => setCalTab("dividend")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${calTab === "dividend" ? "bg-green-600 text-white" : "text-gray-400"}`}>💰 배당</button>
                <button onClick={() => setCalTab("ipo")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${calTab === "ipo" ? "bg-purple-600 text-white" : "text-gray-400"}`}>🆕 IPO</button>
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

            {/* Upcoming List */}
            <h4 className="font-bold text-sm text-gray-400">다가오는 일정</h4>
            {loading ? <div className="text-center py-6"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-500" /></div>
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
    );
}

// ============ TAB 5: VOTE ============
function VoteTab() {
    const [voteSymbol, setVoteSymbol] = useState("");
    const [voteResults, setVoteResults] = useState<VoteResult | null>(null);
    const [userVote, setUserVote] = useState<string | null>(null);
    const [voting, setVoting] = useState(false);
    const pops = ["005930", "000660", "373220", "035420", "068270", "AAPL", "TSLA", "NVDA"];

    const fetchVotes = async (sym: string) => { try { const uid = localStorage.getItem("user_id") || "guest"; const r = await fetch(`${API_BASE_URL}/api/votes/${sym}`, { headers: { "X-User-Id": uid } }); const j = await r.json(); if (j.status === "success") { setVoteResults(j.data); setUserVote(j.user_vote); } } catch { } };
    const submitVote = async (sym: string, dir: string) => { setVoting(true); try { const uid = localStorage.getItem("user_id") || "guest"; const r = await fetch(`${API_BASE_URL}/api/votes/${sym}`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": uid }, body: JSON.stringify({ direction: dir }) }); const j = await r.json(); if (j.status === "success") { setVoteResults(j.results); setUserVote(dir); } } catch { } finally { setVoting(false); } };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-4 py-4">
                <h3 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">🗳️ 종목 투표</h3>
                <p className="text-gray-400 text-sm">내일 이 종목, 오를까 내릴까?</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {pops.map(s => <button key={s} onClick={() => { setVoteSymbol(s); fetchVotes(s); }} className={`px-4 py-2 rounded-full text-sm font-bold ${voteSymbol === s ? "bg-purple-600 text-white scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{s}</button>)}
                </div>
                <div className="flex gap-2 max-w-sm mx-auto">
                    <input type="text" placeholder="종목코드 입력" className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 uppercase font-mono" value={voteSymbol} onChange={e => setVoteSymbol(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && voteSymbol) fetchVotes(voteSymbol); }} />
                    <button onClick={() => voteSymbol && fetchVotes(voteSymbol)} className="px-4 py-2.5 bg-purple-600 rounded-xl font-bold text-sm">조회</button>
                </div>
            </div>

            {voteSymbol && voteResults && (
                <div className="bg-purple-900/10 border border-purple-500/30 rounded-2xl p-6 space-y-5">
                    <div className="text-center"><h4 className="text-xl font-black">{voteSymbol}</h4><p className="text-gray-400 text-sm">총 {voteResults.total}명 투표</p></div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-bold"><span className="text-red-400">📈 오를것 {voteResults.up_pct}%</span><span className="text-blue-400">📉 내릴것 {voteResults.down_pct}%</span></div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
                            <div className="bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700 rounded-l-full" style={{ width: `${voteResults.up_pct}%` }} />
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700 rounded-r-full" style={{ width: `${voteResults.down_pct}%` }} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => submitVote(voteSymbol, "up")} disabled={voting} className={`py-4 rounded-2xl font-black text-lg active:scale-95 ${userVote === "up" ? "bg-red-500 text-white ring-2 ring-red-300" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}><ThumbsUp className="w-5 h-5 mx-auto mb-1" />오를것 👆</button>
                        <button onClick={() => submitVote(voteSymbol, "down")} disabled={voting} className={`py-4 rounded-2xl font-black text-lg active:scale-95 ${userVote === "down" ? "bg-blue-500 text-white ring-2 ring-blue-300" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}><ThumbsDown className="w-5 h-5 mx-auto mb-1" />내릴것 👇</button>
                    </div>
                    {userVote && <p className="text-center text-xs text-gray-500">✅ 오늘 투표 완료 ({userVote === "up" ? "오를것" : "내릴것"})</p>}
                </div>
            )}
        </div>
    );
}
