"use client";
// [Deployment Trigger] symbol-based deduplication v2 - 2026-03-04

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Zap, TrendingUp, TrendingDown, Volume2, FileText, Users,
    RefreshCw, ChevronRight, Bot, ThumbsUp, ThumbsDown, BarChart3,
    Activity, AlertTriangle, Search, Calendar, ChevronLeft, ExternalLink, PieChart
} from "lucide-react";
import MarketIndicators from "@/components/MarketIndicators";
import CleanStockList from "@/components/CleanStockList";
import AIDisclaimer from "@/components/AIDisclaimer";
import RankingWidget from "@/components/RankingWidget";

// ============ Shared Types ============
interface Signal { id: number; symbol: string; signal_type: string; title: string; summary: string; data: any; created_at: string; }
interface VoteResult { up: number; down: number; total: number; up_pct: number; down_pct: number; }

export default function SignalsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <SignalsPageContent />
        </Suspense>
    );
}

function SignalsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Vercel 강제 Dynamic 렌더링 (캐시 방지) 트리거
    const forceDynamic = searchParams.get('refresh');

    const [activeTab, setActiveTab] = useState<"signals" | "heatmap" | "supply" | "calendar" | "vote">("signals");

    const tabs = [
        { id: "signals" as const, label: "시그널", icon: <Zap className="w-4 h-4" />, gradient: "from-orange-600 to-red-600" },
        { id: "heatmap" as const, label: "히트맵", icon: <BarChart3 className="w-4 h-4" />, gradient: "from-red-600 to-pink-600" },
        { id: "supply" as const, label: "시장 주도주", icon: <Users className="w-4 h-4" />, gradient: "from-green-600 to-emerald-600" },
        { id: "calendar" as const, label: "캘린더/주요 경제지표", icon: <Calendar className="w-4 h-4" />, gradient: "from-blue-600 to-indigo-600" },
        { id: "vote" as const, label: "투표", icon: <ThumbsUp className="w-4 h-4" />, gradient: "from-purple-600 to-indigo-600" },
    ];

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="시장 인텔리전스" subtitle="실시간 시그널 · 글로벌 캘린더 · 시장 주도주 분석" />
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

                <AIDisclaimer className="mt-8 opacity-80" />
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

    const [searchQuery, setSearchQuery] = useState("");
    const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
    const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
    const [riskLoading, setRiskLoading] = useState(false);

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

    // 리스크 공시 데이터 가져오기 (전역 상태 대신 탭 내부에서 관리)
    const fetchRiskAlerts = async () => {
        setRiskLoading(true);
        try {
            const r = await fetch(`${API_BASE_URL}/api/market/risk-alerts`);
            const j = await r.json();
            if (j.status === "success") setRiskAlerts(j.data || []);
        } catch { } finally { setRiskLoading(false); }
    };

    // 리스크 공시에 대한 동적 배지 생성 
    const getRiskBadge = (category: string) => {
        if (category === "risk") return { label: "고위험", color: "bg-red-500/20 text-red-300", border: "border-red-500/40" };
        if (category === "insider") return { label: "수급변동", color: "bg-purple-500/20 text-purple-300", border: "border-purple-500/40" };
        if (category === "contract") return { label: "대형호재", color: "bg-blue-500/20 text-blue-300", border: "border-blue-500/40" };
        return { label: "주요사항", color: "bg-gray-500/20 text-gray-300", border: "border-gray-500/40" };
    };

    useEffect(() => {
        fetchSignals();
        fetchRiskAlerts();
        // 5분마다 리스크 공시 갱신
        const inv = setInterval(fetchRiskAlerts, 300000);
        return () => clearInterval(inv);
    }, []);

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
        <div className="space-y-4 text-left">
            {/* [NEW] 오늘의 주요 공시 리스크 알림 위젯 (시그널 탭 최상단 배치) */}
            {riskAlerts.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-2 backdrop-blur-md overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 via-purple-500 to-blue-500 opacity-50"></div>
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <h4 className="text-sm font-black text-gray-200 uppercase tracking-tighter">실시간 주요 공시 인사이트</h4>
                        <span className="ml-auto text-[10px] font-bold text-blue-400/60 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 animate-pulse">LIVE 스캔 중</span>
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        {riskAlerts.map((alert, idx) => {
                            const badge = getRiskBadge(alert.category);
                            return (
                                <a
                                    key={idx}
                                    href={alert.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-2.5 bg-black/40 hover:bg-black/60 rounded-xl border border-white/5 transition-all group"
                                >
                                    <div className="flex flex-col gap-1 min-w-0 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${badge.border} ${badge.color}`}>
                                                {badge.label}
                                            </span>
                                            <span className="text-[10px] font-black text-white bg-white/10 px-1.5 py-0.5 rounded truncate max-w-[80px]">{alert.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-300 font-bold truncate group-hover:text-white transition-colors">
                                            {alert.title}
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-mono">{alert.date} • DART 원문</span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors flex-shrink-0" />
                                </a>
                            );
                        })}
                    </div>
                    <p className="mt-3 text-[9px] text-gray-600 font-bold leading-relaxed text-center border-t border-white/5 pt-2 italic">
                        💡 본 정보는 DART 공시 원문의 키워드를 기반으로 한 객관적 사실 보도이며, 투자 권유가 아닙니다.
                    </p>
                </div>
            )}

            {/* 시그널 안내 패널 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-orange-400" /> 데이터 기반 시장 모니터링
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        전체 시장의 노이즈를 제거하고 정교한 알고리즘 조건(<span className="text-orange-300">거래량 급증</span>, <span className="text-blue-300">핵심 공시</span>, <span className="text-green-300">주요 수급 변화</span>)에 부합하는 유의미한 시그널을 실시간으로 포착합니다.
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
                // [MODIFY] /api/korea/sector_heatmap 사용, no-store 추가하여 실시간 보장
                const [s, h] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/korea/sector_heatmap`, { cache: 'no-store' }),
                    fetch(`${API_BASE_URL}/api/korea/heatmap`, { cache: 'no-store' })
                ]);
                const sj = await s.json(), hj = await h.json();

                // 업종별, 테마별 모두 동일한 반환 구조(name, change, stocks)를 가짐
                if (sj.status === "success" && sj.data) {
                    setSectors(sj.data);
                }
                if (hj.status === "success" && hj.data) {
                    setHeatmap(hj.data);
                }
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    const data = view === "sectors" ? sectors : heatmap;

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                        {data.map((item: any, i: number) => (
                            <div key={i} className="bg-black/20 rounded-xl p-4 border border-white/5 hover:border-white/20 transition-all group">
                                <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                                    <div
                                        className="font-bold text-gray-200 group-hover:text-white flex items-center gap-2 cursor-pointer"
                                        onClick={() => router.push(`/${view === "themes" ? "theme" : "discovery"}?q=${encodeURIComponent(item.name || item.theme)}`)}
                                    >
                                        <span className="w-5 h-5 flex items-center justify-center rounded bg-red-500/20 text-red-500 text-xs font-bold">{i + 1}</span>
                                        {item.name || item.theme}
                                    </div>
                                    <span className={`${item.change >= 0 ? 'text-red-400 bg-red-900/10' : 'text-blue-400 bg-blue-900/10'} font-bold text-sm px-1.5 rounded`}>
                                        {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
                                    </span>
                                </div>

                                {/* Stocks in this theme/sector */}
                                <div className="space-y-2">
                                    {item.stocks && item.stocks.map((stock: any, j: number) => (
                                        <div
                                            key={j}
                                            className="flex justify-between items-center text-base cursor-pointer hover:bg-white/5 p-2 rounded"
                                            onClick={() => router.push(`/discovery?q=${encodeURIComponent(stock.name)}`)}
                                        >
                                            <span className="text-gray-300 text-sm font-medium w-28 truncate">{stock.name}</span>
                                            <div className={`flex-1 h-2 mx-3 rounded-full overflow-hidden bg-gray-700`}>
                                                <div
                                                    className={`h-full ${stock.change > 20 ? 'bg-purple-500' : stock.change > 10 ? 'bg-red-500' : stock.change > 0 ? 'bg-red-400' : 'bg-blue-400'}`}
                                                    style={{ width: `${Math.min(Math.abs(stock.change) * 3, 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-sm font-mono font-bold w-14 text-right ${stock.change > 0 ? 'text-red-400' : stock.change < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                                {stock.change > 0 ? '+' : ''}{stock.change}%
                                            </span>
                                        </div>
                                    ))}
                                    {(!item.stocks || item.stocks.length === 0) && (
                                        <div className="text-xs text-gray-500 text-center py-2">편입 종목 정보 없음</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
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
                    <div className="space-y-6">
                        {/* [MOVED] 실시간 상승/하락 랭킹 (히트맵 탭에서 이동) */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="mb-4">
                                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                    <TrendingUp className="text-blue-400 w-5 h-5" /> 실시간 시장 등락 현황
                                </h4>
                            </div>
                            <RankingWidget />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {renderList("KOSPI 상승률 TOP", investorData?.foreign_sell || [], "red", <TrendingUp className="w-3.5 h-3.5" />, 7)}
                            {renderList("KOSDAQ 상승률 TOP", investorData?.institution_sell || [], "purple", <TrendingUp className="w-3.5 h-3.5" />, 7)}
                            {renderList("KOSPI 거래량 TOP", investorData?.foreign_top || [], "green", <Activity className="w-3.5 h-3.5" />, 7)}
                            {renderList("KOSDAQ 거래량 TOP", investorData?.institution_top || [], "blue", <Activity className="w-3.5 h-3.5" />, 7)}
                        </div>
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
    const [countryFilter, setCountryFilter] = useState<"calendar" | "market">("market");
    const [krEvents, setKrEvents] = useState<any[]>([]);
    const [krLoading, setKrLoading] = useState(false);
    const [globalAssets, setGlobalAssets] = useState<any>(null);
    const [globalAssetsLoading, setGlobalAssetsLoading] = useState(false);

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

    // 통합 시장 지표 fetch
    useEffect(() => {
        // 데이터가 아직 없거나 갱신이 필요할 때 로딩 시작
        if (!krEvents.length) setKrLoading(true);
        if (!globalAssets) setGlobalAssetsLoading(true);

        const fetchMarketData = async () => {
            try {
                // 병렬로 데이터 호출
                const [krRes, globalRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/market/calendar/korea`),
                    fetch(`${API_BASE_URL}/api/assets`)
                ]);

                const krJson = await krRes.json();
                const globalJson = await globalRes.json();

                if (krJson.status === "success") setKrEvents(krJson.data || []);
                if (globalJson.status === "success") setGlobalAssets(globalJson.data || {});
            } catch (error) {
                console.error("Market data fetch error:", error);
            } finally {
                setKrLoading(false);
                setGlobalAssetsLoading(false);
            }
        };

        fetchMarketData();

        // 1분마다 자동 갱신
        const interval = setInterval(fetchMarketData, 60000);
        return () => clearInterval(interval);
    }, []);

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
                    📈 주요 경제 지표
                </button>
                <button onClick={() => setMainTab("earndiv")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mainTab === "earndiv" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    📊 실적·배당
                </button>
                <button onClick={() => setMainTab("ipo")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mainTab === "ipo" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    🆕 공모주
                </button>
            </div>

            {/* ── 주요 경제 지표 탭 ── */}
            {mainTab === "economic" && (
                <div className="space-y-4">
                    {/* 상단 글로벌 경제 캘린더 일정 섹션 */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-black text-sm text-gray-200 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-400" /> 오늘 글로벌 일정
                            </h4>
                            <div className="text-[10px] text-gray-500">Yahoo Finance</div>
                        </div>

                        {macroLoading ? (
                            <div className="flex justify-center py-4"><RefreshCw className="w-4 h-4 animate-spin text-gray-500" /></div>
                        ) : macroEvents.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 text-xs">
                                <p>오늘 예정된 주요 일정이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-[180px] overflow-y-auto hide-scrollbar">
                                {macroEvents.map((evt, i) => (
                                    <div key={i} className="flex items-start gap-3 p-2 bg-black/20 hover:bg-black/40 rounded-lg transition-colors border border-white/5">
                                        <div className="flex flex-col items-center min-w-[50px]">
                                            <span className={`text-[10px] font-mono font-bold ${evt.impact === "high" ? "text-red-400" : "text-gray-400"}`}>{evt.time}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold text-xs break-words ${evt.impact === "high" ? "text-white" : "text-gray-300"}`}>{evt.event_kr || evt.event}</div>
                                            {(evt.forecast !== "-" || evt.actual !== "-") && (
                                                <div className="flex gap-2 mt-0.5 text-[10px] text-gray-400">
                                                    {evt.forecast !== "-" && <span>예상 <span className="text-yellow-400 font-mono">{evt.forecast}</span></span>}
                                                    {evt.actual !== "-" && <span>실제 <span className="text-green-400 font-mono font-bold">{evt.actual}</span></span>}
                                                </div>
                                            )}
                                        </div>
                                        {evt.impact === "high" && <span className="text-[8px] bg-red-900/40 text-red-400 border border-red-500/30 px-1 py-0.5 rounded font-bold flex-shrink-0">HIGH</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 하단 통합 시장 모니터 섹션 (Naver Major Indicators 연동) */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h4 className="font-black text-sm px-1 text-white flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-400" /> 프리미엄 글로벌 마켓 인덱스
                            </h4>
                            <span className="text-[10px] text-gray-500">Naver Finance 실시간 연동 (Sync-Turbo)</span>
                        </div>
                        <MarketIndicators />
                    </div>
                    </div>
                </div>
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
