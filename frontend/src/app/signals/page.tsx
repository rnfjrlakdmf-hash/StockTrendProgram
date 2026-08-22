"use client";
// [Deployment Trigger] v3.7.13-FINAL-FIX-2026-05-04

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Zap, TrendingUp, TrendingDown, Volume2, FileText, Users,
    RefreshCw, ChevronRight, Bot, ThumbsUp, ThumbsDown, BarChart3,
    Activity, AlertTriangle, Search, Calendar, ChevronLeft, ExternalLink, PieChart,
    Star, Globe, Trash2, X, Bell, BellRing, HelpCircle, LayoutGrid, Table, Award, Sparkles,
    DollarSign, Clock
} from "lucide-react";
import MarketIndicators from "@/components/MarketIndicators";
import MarketScannerDashboard from "@/components/MarketScannerDashboard";
import CleanStockList from "@/components/CleanStockList";
import AIDisclaimer from "@/components/AIDisclaimer";
import RankingWidget from "@/components/RankingWidget";

// ============ Shared Types ============
interface Signal { id: number; symbol: string; signal_type: string; title: string; summary: string; data: any; created_at: string; }

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
    const forceDynamic = searchParams.get('refresh');
    const tabParam = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState<"signals" | "heatmap" | "supply" | "calendar">("signals");

    useEffect(() => {
        if (tabParam === "calendar" || tabParam === "heatmap" || tabParam === "supply" || tabParam === "signals") {
            setActiveTab(tabParam);
        } else if (tabParam === "ipo") {
            setActiveTab("calendar");
        }
    }, [tabParam]);

    // [v5.9.0] 전역 트렌드 컬러 유틸리티 (일관된 시각적 경험 제공)
    const getTrendStyle = (value: string | number | undefined, changeStr?: string) => {
        const rawValue = String(value || "0");
        const num = parseFloat(rawValue.replace(/[^0-9.-]/g, ''));
        const str = changeStr || rawValue;
        
        const isUp = num > 0 || str.includes('+') || (num === 0 && !str.includes('-') && parseFloat(str) > 0);
        const isDown = num < 0 || str.includes('-') || (num === 0 && str.includes('-'));
        
        return {
            isUp,
            isDown,
            color: isUp ? 'text-rose-500' : isDown ? 'text-sky-500' : 'text-gray-400',
            bg: isUp ? 'bg-rose-500/10' : isDown ? 'bg-sky-500/10' : 'bg-gray-500/10',
            border: isUp ? 'border-rose-500/20' : isDown ? 'border-sky-500/20' : 'border-gray-500/20',
            icon: isUp ? '▲' : isDown ? '▼' : '●'
        };
    };

    const tabs = [
        { id: "signals" as const, label: "시그널", icon: <Zap className="w-4 h-4" />, gradient: "from-orange-600 to-red-600" },
        { id: "heatmap" as const, label: "히트맵", icon: <BarChart3 className="w-4 h-4" />, gradient: "from-red-600 to-pink-600" },
        { id: "supply" as const, label: "시장 주도주", icon: <Users className="w-4 h-4" />, gradient: "from-green-600 to-emerald-600" },
        { id: "calendar" as const, label: "캘린더/주요 경제지표", icon: <Calendar className="w-4 h-4" />, gradient: "from-blue-600 to-indigo-600" },
    ];

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="시장 인텔리전스" subtitle="당일 시그널 · 글로벌 캘린더 · 시장 주도주 분석" />
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

                <div className={activeTab === "signals" ? "block animate-in fade-in duration-200" : "hidden"}>
                    <SignalsFeedTab router={router} />
                </div>
                <div className={activeTab === "heatmap" ? "block animate-in fade-in duration-200" : "hidden"}>
                    <HeatmapTab router={router} />
                </div>
                <div className={activeTab === "supply" ? "block animate-in fade-in duration-200" : "hidden"}>
                    <MarketInsightsTab router={router} />
                </div>
                <div className={activeTab === "calendar" ? "block animate-in fade-in duration-200" : "hidden"}>
                    <CalendarTab router={router} />
                </div>

                <AIDisclaimer className="mt-8 opacity-80" />
            </div>
        </div>
    );
}

// ============ WIDGET: GLOBAL RISK GAUGE ============
function GlobalRiskGauge() {
    const [riskData, setRiskData] = useState<{
        status: "risk_on" | "neutral" | "risk_off";
        score: number;
        title: string;
        desc: string;
        vix: string;
        vixStatus: string;
        usdkrw: string;
        usdkrwStatus: string;
        us10y: string;
        us10yStatus: string;
    }>({
        status: "neutral",
        score: 0,
        title: "🟡 글로벌 리스크 신호등: 중립 / 관망 (Neutral)",
        desc: "주요 거시 경제 지표 및 시장 변동성을 종합 점검 중입니다.",
        vix: "16.0pt",
        vixStatus: "안정",
        usdkrw: "1,381원",
        usdkrwStatus: "보통",
        us10y: "4.70%",
        us10yStatus: "부담"
    });
    const [loading, setLoading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        const fetchRisk = async () => {
            try {
                const indRes = await fetch(`${API_BASE_URL}/api/market/indices`, { cache: 'no-store' });
                const indJ = await indRes.json();
                
                const all: any[] = Array.isArray(indJ.data) ? indJ.data : [];
                
                let vixItem = all.find((i: any) => String(i.event_kr || i.name || "").includes("VIX") || String(i.symbol || "").includes("VIX"));
                let fxItem = all.find((i: any) => (String(i.event_kr || "").includes("USD") && String(i.event_kr || "").includes("환율")) || String(i.event_kr || "").includes("원/달러"));
                let us10yItem = all.find((i: any) => String(i.event_kr || "").includes("10년") && (String(i.event_kr || "").includes("금리") || String(i.event_kr || "").includes("국채")));

                let vixVal = vixItem ? parseFloat(String(vixItem.actual || vixItem.price || vixItem.close || "16.0").replace(/[^0-9.]/g, '')) : 16.0;
                if (isNaN(vixVal) || vixVal <= 0) vixVal = 16.0;

                let fxVal = fxItem ? parseFloat(String(fxItem.actual || fxItem.price || fxItem.close || "1381").replace(/[^0-9.]/g, '')) : 1381;
                if (isNaN(fxVal) || fxVal <= 0) fxVal = 1381;

                let us10yVal = us10yItem ? parseFloat(String(us10yItem.actual || us10yItem.price || us10yItem.close || "4.7").replace(/[^0-9.]/g, '')) : 4.7;
                if (isNaN(us10yVal) || us10yVal <= 0) us10yVal = 4.7;

                let score = 0;
                let vixStatus = "안정";
                if (vixVal < 18) { score += 1; vixStatus = "안정"; }
                else if (vixVal <= 23) { vixStatus = "주의"; }
                else { score -= 2; vixStatus = "공포"; }

                let fxStatus = "보통";
                if (fxVal < 1370) { score += 1; fxStatus = "우호"; }
                else if (fxVal > 1400) { score -= 1; fxStatus = "부담"; }

                let us10yStatus = "안정";
                if (us10yVal < 4.3) { score += 1; us10yStatus = "안정"; }
                else { score -= 1; us10yStatus = "부담"; }

                let status: "risk_on" | "neutral" | "risk_off" = "neutral";
                let title = "🟡 글로벌 리스크 신호등: 중립 / 관망 (Neutral)";
                let desc = "주요 거시 경제 지표 발표를 앞두고 관망세가 짙은 혼조 국면입니다.";

                if (score >= 2) {
                    status = "risk_on";
                    title = "🟢 글로벌 리스크 신호등: 위험 선호 우호 (Risk-On)";
                    desc = "VIX 변동성과 환율·금리가 안정적이며, 글로벌 유동성이 주식 등 위험자산에 우호적인 환경입니다.";
                } else if (score < 0 || vixVal >= 23) {
                    status = "risk_off";
                    title = "🔴 글로벌 리스크 신호등: 위험 회피 경계 (Risk-Off)";
                    desc = "달러 및 안전자산 선호 심리가 강화되어 무리한 추격 매수보다 보수적 리스크 관리가 안전합니다.";
                }

                setRiskData({
                    status,
                    score,
                    title,
                    desc,
                    vix: `${vixVal.toFixed(1)}pt`,
                    vixStatus,
                    usdkrw: `${Math.round(fxVal).toLocaleString()}원`,
                    usdkrwStatus: fxStatus,
                    us10y: `${us10yVal.toFixed(2)}%`,
                    us10yStatus
                });
            } catch (e) {
                console.error("Risk gauge calculation error:", e);
            }
        };

        fetchRisk();
        const interval = setInterval(fetchRisk, 60000); // 1분 주기 실시간 자동 갱신
        return () => clearInterval(interval);
    }, []);

    const isRiskOn = riskData.status === "risk_on";
    const isRiskOff = riskData.status === "risk_off";

    return (
        <div className={`border rounded-2xl p-4 mb-3 transition-all relative overflow-hidden ${
            isRiskOn 
                ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-black border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                : isRiskOff 
                ? 'bg-gradient-to-r from-rose-950/70 via-slate-900 to-black border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                : 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-black border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
        }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            isRiskOn ? 'bg-emerald-400' : isRiskOff ? 'bg-rose-400' : 'bg-amber-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${
                            isRiskOn ? 'bg-emerald-500' : isRiskOff ? 'bg-rose-500' : 'bg-amber-500'
                        }`}></span>
                    </span>
                    <h4 className="text-sm font-black text-white tracking-tight">{riskData.title}</h4>
                </div>
                <span className="text-[10px] text-gray-400 font-mono self-start sm:self-auto bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                    글로벌 거시 지표 5종 종합
                </span>
            </div>

            <p className="text-xs text-gray-300 mb-3 leading-relaxed font-medium">
                {riskData.desc}
            </p>

            {/* 3대 핵심 바로미터 칩 & 쉬운 설명 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-gray-300 font-bold">VIX 공포지수</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                riskData.vixStatus === '안정' ? 'text-emerald-400 bg-emerald-500/15' : riskData.vixStatus === '주의' ? 'text-amber-400 bg-amber-500/15' : 'text-rose-400 bg-rose-500/15'
                            }`}>
                                {riskData.vixStatus}
                            </span>
                        </div>
                        <div className="text-sm font-black text-white font-mono my-0.5">{riskData.vix}</div>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[10px] text-gray-400 leading-tight text-left">
                        💡 <span className="text-gray-300 font-medium">20 미만</span>일수록 시장 심리가 평온하여 주식 매수에 우호적입니다.
                    </div>
                </div>

                <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-gray-300 font-bold">원/달러 환율</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                riskData.usdkrwStatus === '우호' ? 'text-emerald-400 bg-emerald-500/15' : riskData.usdkrwStatus === '보통' ? 'text-amber-400 bg-amber-500/15' : 'text-rose-400 bg-rose-500/15'
                            }`}>
                                {riskData.usdkrwStatus}
                            </span>
                        </div>
                        <div className="text-sm font-black text-white font-mono my-0.5">{riskData.usdkrw}</div>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[10px] text-gray-400 leading-tight text-left">
                        💡 환율이 안정(<span className="text-gray-300 font-medium">하락</span>)되어야 외국인의 국내 주식 순매수가 늘어납니다.
                    </div>
                </div>

                <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-gray-300 font-bold">美 10년물 국채</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                riskData.us10yStatus === '안정' ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'
                            }`}>
                                {riskData.us10yStatus}
                            </span>
                        </div>
                        <div className="text-sm font-black text-white font-mono my-0.5">{riskData.us10y}</div>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[10px] text-gray-400 leading-tight text-left">
                        💡 금리가 <span className="text-gray-300 font-medium">낮을수록</span> 미래 가치가 높은 기술·성장주에 유리합니다.
                    </div>
                </div>
            </div>

            {/* 초보자를 위한 상세 지표 가이드 (아코디언 토글) */}
            <div className="mt-3 pt-2.5 border-t border-white/10">
                <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5"
                >
                    <span className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
                        <span>💡 신호등 & 3대 지표 쉽게 이해하기 (초보자 가이드)</span>
                    </span>
                    <span className="text-xs font-mono">{showGuide ? "▲ 닫기" : "▼ 펼치기"}</span>
                </button>

                {showGuide && (
                    <div className="mt-2.5 p-3.5 bg-black/60 rounded-xl border border-white/10 text-xs text-gray-300 space-y-3 text-left animate-in fade-in duration-200">
                        <div>
                            <h5 className="font-black text-white mb-1.5 flex items-center gap-1.5">
                                🚦 신호등 3단계의 의미
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                                    <span className="font-bold text-emerald-400">🟢 위험 선호 (Risk-On)</span>
                                    <p className="text-gray-300 mt-1 leading-relaxed">
                                        시장에 자신감이 넘쳐 주식 등 자산으로 돈이 몰리는 상승 친화적 장세입니다.
                                    </p>
                                </div>
                                <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30">
                                    <span className="font-bold text-amber-400">🟡 중립 / 관망 (Neutral)</span>
                                    <p className="text-gray-300 mt-1 leading-relaxed">
                                        주요 경제지표 발표를 앞두고 눈치보기가 이어지며, 실적 우량주 위주로 압축이 유리합니다.
                                    </p>
                                </div>
                                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30">
                                    <span className="font-bold text-rose-400">🔴 위험 회피 (Risk-Off)</span>
                                    <p className="text-gray-300 mt-1 leading-relaxed">
                                        달러나 금 등 안전자산으로 돈이 빠져나가므로 무리한 매수를 줄이고 방어하는 장세입니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/5">
                            <h5 className="font-black text-white mb-1.5 flex items-center gap-1.5">
                                📊 3대 거시지표 핵심 포인트
                            </h5>
                            <ul className="space-y-1.5 text-[11px] text-gray-300 list-disc list-inside">
                                <li>
                                    <strong className="text-white">VIX (변동성·공포지수):</strong> 미국 S&P 500 시장의 불안감을 나타내며, <strong>20 이하</strong>면 평온, <strong>25 이상</strong>이면 시장이 공포에 빠져 있음을 뜻합니다.
                                </li>
                                <li>
                                    <strong className="text-white">원/달러 환율:</strong> 외국인 투자자의 매수 기준입니다. 환율이 <strong>내려갈수록(원화 강세)</strong> 외인의 한국 주식 매수 유입이 강력해집니다.
                                </li>
                                <li>
                                    <strong className="text-white">美 10년물 국채금리:</strong> 전 세계 금융의 기준금리 역할을 하며, <strong>금리가 안정될수록</strong> AI, 반도체, 2차전지 등 성장주 주가에 큰 힘이 됩니다.
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <p className="mt-2 text-[9px] text-gray-500 text-right italic">
                ※ 글로벌 공공 시장 지표 기반의 객관적 척도이며, 특정 종목에 대한 투자 권유가 아닙니다.
            </p>
        </div>
    );
}

// ============ TAB 1: SIGNAL FEED ============
function SignalsFeedTab({ router }: { router: any }) {
    const { user } = useAuth();
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [briefingSymbol, setBriefingSymbol] = useState<string | null>(null);
    const [briefing, setBriefing] = useState<any>(null);
    const [briefingLoading, setBriefingLoading] = useState(false);

    // 신규 추가: 공시 상세 모달 상태
    const [selectedDisclosure, setSelectedDisclosure] = useState<Signal | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [signalFilter, setSignalFilter] = useState<"all" | "volume" | "disclosure" | "investor">("all");
    const [showWatchlistSection, setShowWatchlistSection] = useState(false);
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
    const [hiddenSignals, setHiddenSignals] = useState<number[]>([]);
    const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
    const [riskLoading, setRiskLoading] = useState(false);
    const [disclosureCategory, setDisclosureCategory] = useState<"all" | "insider" | "contract" | "risk">("all");

    // [v6.6.0] 숨긴 시그널(삭제) 상태를 브라우저에 저장하여 영구 삭제된 것처럼 작동하게 함
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("hidden_signals");
            if (saved) {
                try {
                    setHiddenSignals(JSON.parse(saved));
                } catch (e) {}
            }
        }
    }, []);

    const hideSignal = (id: number) => {
        setHiddenSignals(prev => {
            const next = [...prev, id];
            localStorage.setItem("hidden_signals", JSON.stringify(next));
            return next;
        });
    };

    // [New] 자동 새로고침 상태
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [countdown, setCountdown] = useState(30);

    const fetchSignals = async () => { try { const r = await fetch(`${API_BASE_URL}/api/signals?limit=50`); const j = await r.json(); if (j.status === "success") setSignals(j.data || []); } catch { } finally { setLoading(false); } };

    // [New] 자동 새로고침 주기 관리 타이머
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (autoRefresh) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        fetchSignals();
                        fetchRiskAlerts();
                        return 30; // 30초 주기로 리셋
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setCountdown(30);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [autoRefresh]);

    const scanSignals = async (type: 'all' | 'watchlist' = 'all') => {
        setScanning(true);
        try {
            const endpoint = type === 'watchlist' ? '/api/signals/scan?type=watchlist' : '/api/signals/scan?type=all';
            const token = user?.id;
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
                if (type === 'watchlist') {
                    setShowWatchlistSection(true);
                }
            }
        } catch {
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        if (watchlistSymbols.length === 0) {
            (async () => {
                const token = user?.id;
                if (!token) return;
                try {
                    const r = await fetch(`${API_BASE_URL}/api/watchlist`, { headers: { "x-user-id": token } });
                    const j = await r.json();
                    if (j.status === "success" && j.data) {
                        setWatchlistSymbols(j.data.map((item: any) => item.symbol));
                    }
                } catch { }
            })();
        }
    }, [watchlistSymbols.length]);

    const fetchBriefing = async (sym: string) => { setBriefingSymbol(sym); setBriefingLoading(true); setBriefing(null); try { const r = await fetch(`${API_BASE_URL}/api/signals/${sym}/briefing`); const j = await r.json(); if (j.status === "success") setBriefing(j.data); } catch { } finally { setBriefingLoading(false); } };

    // 리스크 공시 데이터 가져오기
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
        const inv = setInterval(fetchRiskAlerts, 300000);
        return () => clearInterval(inv);
    }, []);

    const getBadge = (t: string) => {
        if (t === "VOLUME_SURGE") return { label: "🔥 거래량 급증", color: "bg-orange-500/20 text-orange-300", border: "border-orange-500/40" };
        if (t === "DISCLOSURE") return { label: "📢 공시", color: "bg-blue-500/20 text-blue-300", border: "border-blue-500/40" };
        if (t === "INVESTOR_SURGE") return { label: "👥 수급 급증", color: "bg-green-500/20 text-green-300", border: "border-green-500/40" };
        return { label: "시그널", color: "bg-gray-500/20 text-gray-300", border: "border-gray-500/40" };
    };

    // 지저분한 수치 및 텍스트 자동 정제 함수
    const formatSignalText = (text: string) => {
        if (!text) return "";
        let clean = text.replace(/\(주\)/g, "").replace(/\[약식\]/g, "(약식)");
        // 633,469.7777777778주 -> 633,470주
        clean = clean.replace(/(\d[\d,]*)\.(\d+)주/g, (match, p1) => {
            const intVal = parseInt(p1.replace(/,/g, ''), 10);
            if (!isNaN(intVal)) {
                return `${intVal.toLocaleString()}주`;
            }
            return `${p1}주`;
        });
        return clean;
    };

    // 거래량 폭증 배율 계산 배지
    const getSurgeBadge = (sig: any) => {
        const text = `${sig.title} ${sig.summary}`;
        const matchRatio = text.match(/대비\s*([\d.]+)배/);
        const matchPct = text.match(/(\d+)%\s*폭증/);
        if (matchRatio) {
            const val = parseFloat(matchRatio[1]);
            if (val >= 5) return { label: `💥 ${val.toFixed(1)}x 초대량`, color: "bg-red-500/20 text-red-300 border-red-500/40" };
            if (val >= 2) return { label: `🔥 ${val.toFixed(1)}x 폭증`, color: "bg-orange-500/20 text-orange-300 border-orange-500/40" };
        } else if (matchPct) {
            const pct = parseInt(matchPct[1], 10);
            const val = pct / 100;
            if (val >= 5) return { label: `💥 ${val.toFixed(1)}x 초대량`, color: "bg-red-500/20 text-red-300 border-red-500/40" };
            if (val >= 2) return { label: `🔥 ${val.toFixed(1)}x 폭증`, color: "bg-orange-500/20 text-orange-300 border-orange-500/40" };
        }
        return null;
    };

    // 직관적 상대 시간 계산
    const getRelativeTime = (dateStr: string) => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin < 1) return "방금 전";
            if (diffMin < 60) return `${diffMin}분 전`;
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) return `${diffHours}시간 전`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays}일 전`;
            return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
        } catch {
            return dateStr;
        }
    };

    // 필터링된 공시 목록
    const filteredRiskAlerts = (Array.isArray(riskAlerts) ? riskAlerts : []).filter(alert => {
        if (disclosureCategory === "all") return true;
        const text = (alert.title + " " + (alert.name || "") + " " + (alert.category || "")).toLowerCase();
        if (disclosureCategory === "insider") {
            return alert.category === "insider" || text.includes("대량보유") || text.includes("소유상황") || text.includes("임원") || text.includes("주요주주") || text.includes("5%");
        }
        if (disclosureCategory === "contract") {
            return alert.category === "contract" || text.includes("단일판매") || text.includes("공급계약") || text.includes("실적") || text.includes("배당") || text.includes("무상증자") || text.includes("소각");
        }
        if (disclosureCategory === "risk") {
            return alert.category === "risk" || text.includes("유상증자") || text.includes("전환사채") || text.includes("감자") || text.includes("소송") || text.includes("불성실") || text.includes("정지") || text.includes("cb");
        }
        return true;
    });

    const isMatchFilter = (sig: Signal) => {
        if (signalFilter === "all") return true;
        if (signalFilter === "volume") return sig.signal_type === "VOLUME_SURGE";
        if (signalFilter === "disclosure") return sig.signal_type === "DISCLOSURE";
        if (signalFilter === "investor") return sig.signal_type === "INVESTOR_SURGE";
        return true;
    };

    const watchlistSignals = (Array.isArray(signals) ? signals : []).filter(sig => {
        const matchSearch = !searchQuery || String(sig.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(sig.symbol || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchSearch && watchlistSymbols.includes(sig.symbol) && !hiddenSignals.includes(sig.id) && isMatchFilter(sig);
    });

    const otherSignals = (Array.isArray(signals) ? signals : []).filter(sig => {
        const matchSearch = !searchQuery || String(sig.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(sig.symbol || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchSearch && !watchlistSymbols.includes(sig.symbol) && !hiddenSignals.includes(sig.id) && isMatchFilter(sig);
    });

    // 필터별 개수 카운트
    const totalCount = (Array.isArray(signals) ? signals : []).filter(s => !hiddenSignals.includes(s.id)).length;
    const volumeCount = (Array.isArray(signals) ? signals : []).filter(s => s.signal_type === "VOLUME_SURGE" && !hiddenSignals.includes(s.id)).length;
    const disclosureCount = (Array.isArray(signals) ? signals : []).filter(s => s.signal_type === "DISCLOSURE" && !hiddenSignals.includes(s.id)).length;
    const investorCount = (Array.isArray(signals) ? signals : []).filter(s => s.signal_type === "INVESTOR_SURGE" && !hiddenSignals.includes(s.id)).length;

    const renderSignal = (sig: any, onHide?: (e: React.MouseEvent) => void) => {
        const badge = getBadge(sig.signal_type);
        const surgeBadge = getSurgeBadge(sig);
        const relativeTime = getRelativeTime(sig.created_at);
        const cleanTitle = formatSignalText(sig.title);
        const cleanSummary = formatSignalText(sig.summary);

        const handleSignalClick = () => {
            router.push(`/discovery?q=${sig.symbol}`);
        };

        return (
            <div
                key={sig.id}
                className={`bg-white/5 border ${badge.border} hover:border-white/30 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group shadow-sm`}
                onClick={handleSignalClick}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${badge.color} border ${badge.border}`}>
                                {badge.label}
                            </span>
                            {surgeBadge && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${surgeBadge.color} border animate-pulse`}>
                                    {surgeBadge.label}
                                </span>
                            )}
                            <span className="text-[11px] font-bold text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded">
                                {relativeTime}
                            </span>
                            <span className="text-[10px] text-gray-500 hidden sm:inline">
                                ({new Date(sig.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })})
                            </span>
                        </div>
                        
                        <h4 className="font-bold text-white text-sm group-hover:text-orange-300 transition-colors flex items-center gap-1.5 flex-wrap">
                            <span>{cleanTitle}</span>
                        </h4>
                        
                        <p className="text-xs text-gray-300 mt-1.5 leading-relaxed break-keep">
                            {cleanSummary}
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {sig.signal_type === "DISCLOSURE" && (
                            <button
                                onClick={e => { e.stopPropagation(); setSelectedDisclosure(sig); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all"
                                title="공시 원문 보기"
                            >
                                <FileText className="w-3.5 h-3.5 text-blue-400" /> 공시원문
                            </button>
                        )}

                        <button
                            onClick={e => { e.stopPropagation(); fetchBriefing(sig.symbol); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600/30 to-purple-600/30 hover:from-blue-600/50 hover:to-purple-600/50 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                            <Bot className="w-3.5 h-3.5" /> AI 분석
                        </button>
                        
                        <button
                            onClick={e => { e.stopPropagation(); router.push(`/discovery?q=${sig.symbol}`); }}
                            className="text-[11px] text-gray-400 group-hover:text-white flex items-center font-bold px-2.5 py-1.5 bg-white/5 hover:bg-orange-600/30 border border-white/10 hover:border-orange-500/40 rounded-xl transition-all"
                        >
                            차트보기 〉
                        </button>

                        {onHide && (
                            <button
                                onClick={onHide}
                                className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded-lg transition-colors"
                                title="시그널 삭제 (숨기기)"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 text-left">
            {/* [NEW] 글로벌 리스크 신호등 게이지 위젯 */}
            <GlobalRiskGauge />

            {/* [NEW] 오늘의 주요 공시 리스트 알림 패널 & 카테고리 필터 */}
            {riskAlerts.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-2 backdrop-blur-md overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-yellow-500 via-purple-500 to-blue-500 opacity-50"></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            <h4 className="text-sm font-black text-gray-200 uppercase tracking-tighter">당일 주요 공시 인사이트</h4>
                            <span className="text-[10px] font-black bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/40 uppercase tracking-tighter">
                                실시간 DART
                            </span>
                        </div>

                        {/* 공시 카테고리 필터 칩 */}
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                            <button
                                onClick={() => setDisclosureCategory("all")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    disclosureCategory === "all" ? "bg-yellow-500 text-black shadow-md" : "bg-white/5 text-gray-400 hover:text-white"
                                }`}
                            >
                                전체 ({riskAlerts.length})
                            </button>
                            <button
                                onClick={() => setDisclosureCategory("insider")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                                    disclosureCategory === "insider" ? "bg-purple-600 text-white shadow-md" : "bg-white/5 text-gray-400 hover:text-white"
                                }`}
                            >
                                🔥 지분변동
                            </button>
                            <button
                                onClick={() => setDisclosureCategory("contract")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                                    disclosureCategory === "contract" ? "bg-blue-600 text-white shadow-md" : "bg-white/5 text-gray-400 hover:text-white"
                                }`}
                            >
                                💰 공급계약·실적
                            </button>
                            <button
                                onClick={() => setDisclosureCategory("risk")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                                    disclosureCategory === "risk" ? "bg-red-600 text-white shadow-md" : "bg-white/5 text-gray-400 hover:text-white"
                                }`}
                            >
                                ⚠️ 증자·주의
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredRiskAlerts.map((alert, idx) => {
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
                                        <span className="text-[9px] text-gray-500 font-mono">{alert.date} · DART 원문</span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors flex-shrink-0" />
                                </a>
                            );
                        })}
                        {filteredRiskAlerts.length === 0 && (
                            <p className="text-gray-500 text-xs text-center py-6">선택한 카테고리에 해당하는 공시가 없습니다.</p>
                        )}
                    </div>
                    <p className="mt-3 text-[9px] text-gray-600 font-bold leading-relaxed text-center border-t border-white/5 pt-2 italic">
                        본 정보는 DART 공시 원문과 키워드를 기반으로 한 객관적 사실 보도이며, 투자 권유가 아닙니다.
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
                        전체 시장의 노이즈를 제거하고 정교한 알고리즘 조건(<span className="text-orange-300">거래량 급증</span>, <span className="text-blue-300">핵심 공시</span>, <span className="text-green-300">주요 수급 변동</span>)에 부합하는 유의미한 시그널을 신속하게 포착합니다.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-bold flex items-center gap-2">감지된 시그널 피드</h3>
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

                    {/* 자동 새로고침 토글 */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold select-none h-9 hover:bg-white/[0.08] transition-all">
                        <span className="text-gray-400">자동 갱신</span>
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`relative w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                                autoRefresh ? 'bg-orange-600' : 'bg-gray-700'
                            }`}
                        >
                            <div
                                className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                                    autoRefresh ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                        {autoRefresh && (
                            <span className="text-orange-400 font-mono w-6 text-center animate-pulse text-[10px]">
                                {countdown}s
                            </span>
                        )}
                    </div>

                    <button onClick={() => scanSignals('watchlist')} disabled={scanning} className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                        <Users className="w-4 h-4" />내 종목 스캔
                    </button>

                    <button onClick={() => scanSignals('all')} disabled={scanning} className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                        <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />{scanning ? "스캔 중..." : "전체 스캔"}
                    </button>
                </div>
            </div>

            {/* [NEW] 시그널 카테고리 스마트 필터 칩 */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                <button
                    onClick={() => setSignalFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        signalFilter === "all" ? "bg-orange-600 text-white shadow-md" : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
                    }`}
                >
                    전체 보기 ({totalCount})
                </button>
                <button
                    onClick={() => setSignalFilter("volume")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        signalFilter === "volume" ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md" : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
                    }`}
                >
                    🔥 거래량 폭증 ({volumeCount})
                </button>
                <button
                    onClick={() => setSignalFilter("disclosure")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        signalFilter === "disclosure" ? "bg-blue-600 text-white shadow-md" : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
                    }`}
                >
                    📢 핵심 공시 ({disclosureCount})
                </button>
                <button
                    onClick={() => setSignalFilter("investor")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        signalFilter === "investor" ? "bg-green-600 text-white shadow-md" : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
                    }`}
                >
                    👥 수급 급증 ({investorCount})
                </button>
            </div>

            <div className="flex flex-col gap-6">
                {showWatchlistSection && watchlistSignals.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-yellow-400">
                                <Star className="w-5 h-5 fill-yellow-400" />
                                내 관심종목 시그널
                            </h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => {
                                        if (!window.confirm("내 관심종목 시그널 내역을 모두 삭제하시겠습니까?")) return;
                                        const idsToHide = watchlistSignals.map(sig => sig.id);
                                        setHiddenSignals(prev => {
                                            const next = [...prev, ...idsToHide];
                                            localStorage.setItem("hidden_signals", JSON.stringify(next));
                                            return next;
                                        });
                                        setShowWatchlistSection(false);
                                    }}
                                    className="text-xs text-red-400 hover:text-white px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors flex items-center gap-1"
                                    title="스캔 내역 전체 삭제"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> 내역 삭제
                                </button>
                                <button 
                                    onClick={() => setShowWatchlistSection(false)}
                                    className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                                >
                                    ✕ 닫기
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {watchlistSignals.map(sig => renderSignal(sig, (e) => {
                                e.stopPropagation();
                                hideSignal(sig.id);
                            }))}
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-blue-400">
                            <Globe className="w-5 h-5" />
                            전체 시장 시그널
                        </h3>
                        {otherSignals.length > 0 && (
                            <button 
                                onClick={() => {
                                    if (!window.confirm("전체 시장 시그널 내역을 모두 삭제하시겠습니까?")) return;
                                    const idsToHide = otherSignals.map(sig => sig.id);
                                    setHiddenSignals(prev => {
                                        const next = [...prev, ...idsToHide];
                                        localStorage.setItem("hidden_signals", JSON.stringify(next));
                                        return next;
                                    });
                                }}
                                className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 bg-white/5 hover:bg-red-500/10 rounded-lg border border-white/10 hover:border-red-500/20 transition-colors flex items-center gap-1"
                                title="전체 시장 시그널 내역 지우기"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> 모두 지우기
                            </button>
                        )}
                    </div>
                    {loading ? <div className="text-center py-12 text-gray-500"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />로딩 중...</div>
                        : otherSignals.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 mb-4">{searchQuery ? `'${searchQuery}'에 대한 시그널 검색 결과가 없습니다` : '아직 감지된 시그널이 없습니다.'}</p>
                                {!searchQuery && <button onClick={() => scanSignals('all')} className="px-6 py-2 bg-orange-600 hover:bg-orange-500 transition-colors rounded-xl text-sm font-bold">지금 첫 스캔 실행</button>}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {otherSignals.map(sig => renderSignal(sig, (e) => {
                                    e.stopPropagation();
                                    hideSignal(sig.id);
                                }))}
                            </div>
                        )}
                </div>
            </div>

            {/* AI 브리핑 모달 */}
            {briefingSymbol && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setBriefingSymbol(null)}>
                    <div className="bg-gray-900 border border-white/20 rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-blue-400" />AI 1분 브리핑 · {briefingSymbol}</h3>
                            <button onClick={() => setBriefingSymbol(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
                        </div>
                        {briefingLoading ? <div className="text-center py-8"><Bot className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-pulse" /><p className="text-gray-400">AI 분석 중...</p></div>
                            : briefing ? (
                                <div className="space-y-4">
                                    {briefing.price && (
                                        <div className="flex items-center gap-4 bg-white/5 rounded-xl p-3">
                                            <span className="text-2xl font-black">{briefing.price.price !== "N/A" ? briefing.price.price : ""}</span>
                                            {briefing.price.change_pct !== "N/A" && (
                                                <span className={`text-sm font-bold ${parseFloat(String(briefing.price.change_pct).replace(/[^0-9.-]/g, '')) >= 0 ? "text-red-400" : "text-blue-400"}`}>
                                                    {(() => {
                                                        const raw = String(briefing.price.change_pct || '0%');
                                                        const val = Math.abs(parseFloat(raw.replace(/[+%\-▲▼,]/g, '')));
                                                        if (val > 500) return '0.00%';
                                                        return raw.includes('%') ? raw : `${raw}%`;
                                                    })()}
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
                                            {(Array.isArray(briefing.key_points) ? briefing.key_points : []).map((p: string, i: number) => (
                                                <div key={i} className="flex items-start gap-2 text-sm bg-gray-800/50 p-2 rounded-lg border border-white/5">
                                                    <span className="text-blue-400 mt-0.5">●</span>
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

// ============ TAB 2: HEATMAP (업종별/테마별 실시간 주도 섹터 맵) ============
function HeatmapTab({ router }: { router: any }) {
    const [sectors, setSectors] = useState<any[]>([]);
    const [heatmap, setHeatmap] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [view, setView] = useState<"sectors" | "themes">("sectors");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<"high" | "low" | "name">("high");
    const [viewMode, setViewMode] = useState<"card" | "table">("card");

    const loadData = async (isManual: boolean = false) => {
        if (isManual) setRefreshing(true);
        try {
            const [s, h] = await Promise.all([
                fetch(`${API_BASE_URL}/api/market/korea/sector_heatmap`, { cache: 'no-store' }),
                fetch(`${API_BASE_URL}/api/market/korea/heatmap`, { cache: 'no-store' })
            ]);
            const sj = await s.json(), hj = await h.json();

            if (sj.status === "success" && Array.isArray(sj.data)) {
                setSectors(sj.data);
            }
            if (hj.status === "success" && Array.isArray(hj.data)) {
                setHeatmap(hj.data);
            }
        } catch (e) {
            console.error("Heatmap load error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        const timer = setInterval(() => loadData(false), 60000);
        return () => clearInterval(timer);
    }, []);

    const rawData = view === "sectors" ? sectors : heatmap;

    // Filter & Sort
    const filteredData = (Array.isArray(rawData) ? rawData : []).filter((item: any) => {
        const title = String(item.name || item.theme || "");
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        if (title.toLowerCase().includes(term)) return true;
        if (Array.isArray(item.stocks) && item.stocks.some((st: any) => String(st.name || "").toLowerCase().includes(term))) return true;
        return false;
    });

    const sortedData = [...filteredData].sort((a, b) => {
        const aChg = Number(a.change || 0);
        const bChg = Number(b.change || 0);
        if (sortBy === "high") return bChg - aChg;
        if (sortBy === "low") return aChg - bChg;
        const aName = String(a.name || a.theme || "");
        const bName = String(b.name || b.theme || "");
        return aName.localeCompare(bName, "ko");
    });

    // Summary Statistics
    const topItem = sortedData.length > 0 ? sortedData[0] : null;
    const upCount = sortedData.filter(d => Number(d.change || 0) > 0).length;
    const downCount = sortedData.filter(d => Number(d.change || 0) < 0).length;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Top Intelligence Control Bar */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-3.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 w-full md:w-auto">
                        <button
                            onClick={() => setView("sectors")}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                view === "sectors"
                                    ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-600/30"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>업종별 주도 섹터</span>
                            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono">{sectors.length}</span>
                        </button>
                        <button
                            onClick={() => setView("themes")}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                view === "themes"
                                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span>실시간 인기 테마</span>
                            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono">{heatmap.length}</span>
                        </button>
                    </div>

                    {/* Action & View Mode Buttons */}
                    <div className="flex items-center justify-between md:justify-end gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                            <button
                                onClick={() => setViewMode("card")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    viewMode === "card" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                                }`}
                                title="카드 뷰"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">카드</span>
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    viewMode === "table" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                                }`}
                                title="상세 표 뷰"
                            >
                                <Table className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">표</span>
                            </button>
                        </div>

                        {/* Live Refresh Button */}
                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing || loading}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">실시간 갱신</span>
                        </button>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
                    {/* Fast Search Input */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={view === "sectors" ? "업종명 또는 종목명 검색..." : "테마명 또는 종목명 검색..."}
                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-7 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 transition-all"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs">
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Sorting Tabs & Color Legend */}
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 text-[11px] font-bold">
                            <button
                                onClick={() => setSortBy("high")}
                                className={`px-2.5 py-1 rounded-md transition-all ${sortBy === "high" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-gray-400 hover:text-white"}`}
                            >
                                🔥 급등순
                            </button>
                            <button
                                onClick={() => setSortBy("low")}
                                className={`px-2.5 py-1 rounded-md transition-all ${sortBy === "low" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-gray-400 hover:text-white"}`}
                            >
                                ❄️ 급락순
                            </button>
                            <button
                                onClick={() => setSortBy("name")}
                                className={`px-2.5 py-1 rounded-md transition-all ${sortBy === "name" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"}`}
                            >
                                🔤 가나다순
                            </button>
                        </div>

                        {/* Color Legend */}
                        <div className="hidden lg:flex items-center gap-2 text-[10px] text-gray-400 bg-black/30 px-2.5 py-1 rounded-lg border border-white/5">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />+15%↑</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" />상승</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-600 inline-block" />보합</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />하락</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stat Highlights */}
            {sortedData.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                        <span className="text-gray-400 font-bold">👑 오늘 1등 주도 섹터</span>
                        <span className="font-black text-red-400 truncate max-w-[140px]" title={topItem?.name || topItem?.theme}>
                            {topItem?.name || topItem?.theme} (+{Number(topItem?.change || 0).toFixed(2)}%)
                        </span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                        <span className="text-gray-400 font-bold">📊 상승 / 하락 분포</span>
                        <span className="font-black text-white">
                            <span className="text-red-400">{upCount}</span> 상승 / <span className="text-blue-400">{downCount}</span> 하락
                        </span>
                    </div>
                    <div className="hidden sm:flex bg-white/5 border border-white/5 rounded-xl p-2.5 items-center justify-between">
                        <span className="text-gray-400 font-bold">⚡ 모니터링 수</span>
                        <span className="font-black text-yellow-400 font-mono">{sortedData.length}개 {view === "sectors" ? "업종" : "테마"}</span>
                    </div>
                </div>
            )}

            {/* Content Body */}
            {loading ? (
                <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-white/5 space-y-3">
                    <RefreshCw className="w-9 h-9 text-orange-400 animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 font-bold">실시간 시장 데이터를 분석하여 섹터 맵을 생성하고 있습니다...</p>
                </div>
            ) : sortedData.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/40 rounded-3xl border border-white/5 space-y-2">
                    <p className="text-gray-400 text-sm font-bold">검색 결과가 없습니다.</p>
                    <p className="text-gray-500 text-xs">다른 검색어를 입력해 보세요.</p>
                </div>
            ) : viewMode === "card" ? (
                /* Card Matrix Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {sortedData.map((item: any, i: number) => {
                        const title = item.name || item.theme || "섹터";
                        const changeNum = Number(item.change || 0);
                        const isUp = changeNum > 0;
                        const isDown = changeNum < 0;
                        const rank = i + 1;

                        return (
                            <div
                                key={i}
                                className="bg-zinc-900/70 hover:bg-zinc-900 border border-white/10 hover:border-orange-500/40 rounded-2xl p-4 transition-all duration-200 group shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 flex flex-col justify-between"
                            >
                                {/* Card Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                                    <div
                                        className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 pr-2"
                                        onClick={() => router.push(`/${view === "themes" ? "theme" : "discovery"}?q=${encodeURIComponent(title)}`)}
                                    >
                                        {/* Rank Badge */}
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                            rank === 1 ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30' :
                                            rank === 2 ? 'bg-slate-300 text-black' :
                                            rank === 3 ? 'bg-amber-700 text-white' :
                                            'bg-white/10 text-gray-400'
                                        }`}>
                                            {rank}
                                        </span>

                                        {/* Title */}
                                        <h3 className="font-black text-sm md:text-base text-gray-100 group-hover:text-orange-400 transition-colors truncate">
                                            {title}
                                        </h3>
                                        <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-orange-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    {/* Change Badge */}
                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono shrink-0 ${
                                        isUp ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                                        isDown ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                                        'bg-white/10 text-gray-300 border border-white/10'
                                    }`}>
                                        {isUp ? '+' : ''}{changeNum.toFixed(2)}%
                                    </span>
                                </div>

                                {/* Stock List */}
                                <div className="space-y-1.5">
                                    {Array.isArray(item.stocks) && item.stocks.length > 0 ? (
                                        item.stocks.map((stock: any, j: number) => {
                                            const stockChg = Number(stock.change || 0);
                                            const stockIsUp = stockChg > 0;
                                            const stockIsDown = stockChg < 0;
                                            const barWidth = Math.min(Math.abs(stockChg) * 3.5, 100);

                                            return (
                                                <div
                                                    key={j}
                                                    onClick={() => router.push(`/discovery?q=${encodeURIComponent(stock.name)}`)}
                                                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-black/30 hover:bg-white/10 border border-transparent hover:border-white/10 cursor-pointer transition-all gap-2"
                                                >
                                                    {/* Stock Name with 1st Leader Tag */}
                                                    <div className="flex items-center gap-1.5 w-28 sm:w-32 shrink-0 truncate">
                                                        {j === 0 && (
                                                            <span className="text-[9px] font-black bg-amber-400/20 text-amber-300 px-1 py-0.2 rounded shrink-0">
                                                                대장
                                                            </span>
                                                        )}
                                                        <span className="font-bold text-gray-200 hover:text-white truncate">
                                                            {stock.name}
                                                        </span>
                                                    </div>

                                                    {/* Dynamic Sleek Bar */}
                                                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                stockChg >= 15 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                                                stockChg > 0 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                                                stockChg < 0 ? 'bg-gradient-to-r from-blue-600 to-cyan-400' :
                                                                'bg-gray-600'
                                                            }`}
                                                            style={{ width: `${Math.max(barWidth, 4)}%` }}
                                                        />
                                                    </div>

                                                    {/* Stock Change */}
                                                    <span className={`text-xs font-black font-mono w-16 text-right shrink-0 ${
                                                        stockIsUp ? 'text-red-400' : stockIsDown ? 'text-blue-400' : 'text-gray-400'
                                                    }`}>
                                                        {stockIsUp ? '+' : ''}{stockChg}%
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-4 text-xs text-gray-500 font-medium">편입 대표 종목 정보 없음</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* HTS-Style Compact Table View */
                <div className="bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-300">
                            <thead className="bg-black/50 text-gray-400 font-bold border-b border-white/10 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4 w-16 text-center">순위</th>
                                    <th className="py-3 px-4">섹터 / 테마명</th>
                                    <th className="py-3 px-4 text-right">평균 등락률</th>
                                    <th className="py-3 px-4">1대장 종목</th>
                                    <th className="py-3 px-4">2대장 종목</th>
                                    <th className="py-3 px-4">3대장 종목</th>
                                    <th className="py-3 px-4 text-center">바로가기</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium">
                                {sortedData.map((item: any, i: number) => {
                                    const title = item.name || item.theme || "섹터";
                                    const changeNum = Number(item.change || 0);
                                    const isUp = changeNum > 0;
                                    const isDown = changeNum < 0;
                                    const stocks = Array.isArray(item.stocks) ? item.stocks : [];
                                    const rank = i + 1;

                                    return (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4 text-center">
                                                <span className={`w-5 h-5 rounded inline-flex items-center justify-center font-bold text-xs ${
                                                    rank === 1 ? 'bg-amber-400 text-black' :
                                                    rank === 2 ? 'bg-slate-300 text-black' :
                                                    rank === 3 ? 'bg-amber-700 text-white' :
                                                    'text-gray-500'
                                                }`}>
                                                    {rank}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-black text-white cursor-pointer hover:text-orange-400"
                                                onClick={() => router.push(`/${view === "themes" ? "theme" : "discovery"}?q=${encodeURIComponent(title)}`)}>
                                                {title}
                                            </td>
                                            <td className="py-3 px-4 text-right font-black font-mono text-sm">
                                                <span className={isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-gray-300'}>
                                                    {isUp ? '+' : ''}{changeNum.toFixed(2)}%
                                                </span>
                                            </td>
                                            {/* Top 3 Stocks */}
                                            {[0, 1, 2].map((idx) => {
                                                const s = stocks[idx];
                                                if (!s) return <td key={idx} className="py-3 px-4 text-gray-600">-</td>;
                                                const sChg = Number(s.change || 0);
                                                return (
                                                    <td key={idx} className="py-3 px-4 cursor-pointer hover:text-white"
                                                        onClick={() => router.push(`/discovery?q=${encodeURIComponent(s.name)}`)}>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-gray-200">{s.name}</span>
                                                            <span className={`font-mono text-[11px] font-bold ${sChg > 0 ? 'text-red-400' : sChg < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                                ({sChg > 0 ? '+' : ''}{sChg}%)
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    onClick={() => router.push(`/${view === "themes" ? "theme" : "discovery"}?q=${encodeURIComponent(title)}`)}
                                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-orange-500/20 hover:text-orange-400 text-gray-400 text-[11px] font-bold transition-all"
                                                >
                                                    분석 ↗
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ TAB 3: MARKET INSIGHTS (국내 수급/시장 주도주) ============
function MarketInsightsTab({ router }: { router: any }) {
    const [insightsData, setInsightsData] = useState<any>(null);
    const [investorData, setInvestorData] = useState<any>(null);
    const [doubleWhaleData, setDoubleWhaleData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [subTab, setSubTab] = useState<"double_whale" | "volume" | "value">("volume");

    const loadData = async (isManual: boolean = false) => {
        if (isManual) setRefreshing(true);
        try {
            const [r1, r2, r3] = await Promise.all([
                fetch(`${API_BASE_URL}/api/market/investors/top`, { cache: 'no-store' }),
                fetch(`${API_BASE_URL}/api/market/market-insights`, { cache: 'no-store' }),
                fetch(`${API_BASE_URL}/api/market/double-whale`, { cache: 'no-store' })
            ]);
            const [j1, j2, j3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

            if (j1.status === "success" && j1.data) setInvestorData(j1.data);
            if (j2.status === "success" && j2.data) setInsightsData(j2.data);
            if (j3.status === "success" && Array.isArray(j3.data)) setDoubleWhaleData(j3.data);
        } catch (e) {
            console.error("Market insights error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        const timer = setInterval(() => loadData(false), 60000);
        return () => clearInterval(timer);
    }, []);

    // Reusable Premium Leaderboard Card
    const renderLeaderboard = (
        title: string,
        subtitle: string,
        items: any[],
        theme: "red" | "purple" | "emerald" | "blue" | "orange" | "yellow",
        icon: any,
        sliceNum: number = 10,
        isVolumeMode: boolean = false
    ) => {
        const themeMap = {
            red: { border: "border-red-500/30", bg: "bg-red-950/20", titleColor: "text-red-400", badgeBg: "bg-red-500/15 text-red-400 border-red-500/30" },
            purple: { border: "border-purple-500/30", bg: "bg-purple-950/20", titleColor: "text-purple-400", badgeBg: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
            emerald: { border: "border-emerald-500/30", bg: "bg-emerald-950/20", titleColor: "text-emerald-400", badgeBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
            blue: { border: "border-cyan-500/30", bg: "bg-cyan-950/20", titleColor: "text-cyan-400", badgeBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
            orange: { border: "border-orange-500/30", bg: "bg-orange-950/20", titleColor: "text-orange-400", badgeBg: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
            yellow: { border: "border-amber-500/30", bg: "bg-amber-950/20", titleColor: "text-amber-400", badgeBg: "bg-amber-500/15 text-amber-400 border-amber-500/30" }
        };

        const currentTheme = themeMap[theme] || themeMap.red;

        return (
            <div className={`rounded-2xl border ${currentTheme.border} ${currentTheme.bg} bg-zinc-900/80 backdrop-blur-xl p-4 shadow-xl flex flex-col justify-between`}>
                <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg bg-white/5 ${currentTheme.titleColor}`}>
                                {icon}
                            </div>
                            <div>
                                <h4 className={`font-black text-sm md:text-base text-white flex items-center gap-1.5`}>
                                    {title}
                                </h4>
                                <p className="text-[10px] text-gray-400 font-medium">{subtitle}</p>
                            </div>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                            실시간 TOP {sliceNum}
                        </span>
                    </div>

                    {/* Stock Items */}
                    <div className="space-y-1.5">
                        {(Array.isArray(items) ? items : []).slice(0, sliceNum).map((item: any, i: number) => {
                            const rank = i + 1;
                            const isFirst = rank === 1;
                            const isSecond = rank === 2;
                            const isThird = rank === 3;
                            const chgStr = String(item.change || item.value || "");
                            const isPlus = chgStr.includes("+") || (!chgStr.includes("-") && !isVolumeMode && parseFloat(chgStr) > 0);
                            const isMinus = chgStr.includes("-");

                            return (
                                <div
                                    key={i}
                                    onClick={() => router.push(`/discovery?q=${encodeURIComponent(item.symbol || item.name)}`)}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 hover:bg-white/10 border border-transparent hover:border-white/15 cursor-pointer transition-all duration-150 group gap-2"
                                >
                                    {/* Left: Rank & Name */}
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                                            isFirst ? "bg-amber-400 text-black shadow-md shadow-amber-400/30" :
                                            isSecond ? "bg-slate-300 text-black" :
                                            isThird ? "bg-amber-700 text-white" :
                                            "bg-white/10 text-gray-400"
                                        }`}>
                                            {rank}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-gray-100 group-hover:text-white truncate text-xs md:text-sm flex items-center gap-1.5">
                                                <span>{item.name}</span>
                                                {isFirst && <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 py-0.2 rounded font-bold">1등</span>}
                                            </div>
                                            {item.price && (
                                                <div className="text-[10px] text-gray-400 font-mono">
                                                    {item.price}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Change / Volume Badges */}
                                    <div className="text-right shrink-0">
                                        <div className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono inline-block border ${
                                            isVolumeMode
                                                ? currentTheme.badgeBg
                                                : isPlus
                                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                                : isMinus
                                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                                : "bg-white/10 text-gray-300 border-white/10"
                                        }`}>
                                            {item.value || item.change || item.amount || "-"}
                                        </div>
                                        {isVolumeMode && item.amount && (
                                            <div className={`text-[10px] font-mono mt-0.5 font-bold ${
                                                item.amount.includes("+") ? "text-red-400" : item.amount.includes("-") ? "text-blue-400" : "text-gray-400"
                                            }`}>
                                                {item.amount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {(!items || items.length === 0) && (
                            <div className="text-center py-8 text-xs text-gray-500 font-medium">데이터 집계 중...</div>
                        )}
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 text-[10px] text-gray-500 flex items-center justify-between">
                    <span>※ 클릭 시 해당 종목 차트/분석으로 이동</span>
                    <span className="font-mono">실시간 네이버 증권</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Top Navigation & Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-zinc-900/80 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
                {/* 3 Subtabs */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                        onClick={() => setSubTab("volume")}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            subTab === "volume"
                                ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-600/20"
                                : "text-gray-400 hover:text-white bg-black/20"
                        }`}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>실시간 급등 & 거래량 TOP</span>
                    </button>
                    <button
                        onClick={() => setSubTab("double_whale")}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            subTab === "double_whale"
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20"
                                : "text-gray-400 hover:text-white bg-black/20"
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>외인·기관 쌍끌이 레이더</span>
                    </button>
                    <button
                        onClick={() => setSubTab("value")}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            subTab === "value"
                                ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/20"
                                : "text-gray-400 hover:text-white bg-black/20"
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5" />
                        <span>인기 검색 & 거래대금 TOP</span>
                    </button>
                </div>

                {/* Refresh Button */}
                <button
                    onClick={() => loadData(true)}
                    disabled={refreshing || loading}
                    className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                    <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>실시간 갱신</span>
                </button>
            </div>

            {/* Content Body */}
            {loading ? (
                <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-white/5 space-y-3">
                    <RefreshCw className="w-9 h-9 text-orange-400 animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 font-bold">국내 시장 실시간 수급 및 주도주 데이터를 집계하고 있습니다...</p>
                </div>
            ) : subTab === "volume" ? (
                /* Subtab 1: Rise & Volume TOP 4 Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderLeaderboard(
                        "KOSPI 실시간 급등 TOP",
                        "코스피 시장 당일 최고 상승률 순위",
                        investorData?.foreign_sell || [],
                        "red",
                        <TrendingUp className="w-4 h-4" />,
                        10,
                        false
                    )}
                    {renderLeaderboard(
                        "KOSDAQ 실시간 급등 TOP",
                        "코스닥 시장 당일 최고 상승률 순위",
                        investorData?.institution_sell || [],
                        "purple",
                        <TrendingUp className="w-4 h-4" />,
                        10,
                        false
                    )}
                    {renderLeaderboard(
                        "KOSPI 거래량 폭발 TOP",
                        "코스피 시장 당일 누적 거래량 순위",
                        investorData?.foreign_top || [],
                        "emerald",
                        <Activity className="w-4 h-4" />,
                        10,
                        true
                    )}
                    {renderLeaderboard(
                        "KOSDAQ 거래량 폭발 TOP",
                        "코스닥 시장 당일 누적 거래량 순위",
                        investorData?.institution_top || [],
                        "blue",
                        <Activity className="w-4 h-4" />,
                        10,
                        true
                    )}
                </div>
            ) : subTab === "double_whale" ? (
                /* Subtab 2: Double Whale Radar */
                <div className="space-y-3 text-left">
                    <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-black border border-emerald-500/20 rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm md:text-base font-black text-emerald-300 flex items-center gap-1.5">
                                👥 외인 & 기관 스마트머니 동시 순매수 TOP 15
                            </h3>
                            <span className="text-[10px] text-gray-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                100% 실시간 수급 통계
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed mb-4 font-medium">
                            외국인과 기관이 함께 순매수하는 종목은 시장 주도력을 확보할 가능성이 높습니다. (종목 클릭 시 차트 분석으로 이동)
                        </p>

                        <div className="space-y-2">
                            {doubleWhaleData.map((item: any, idx: number) => {
                                const isDouble = item.type === "쌍끌이";
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => router.push(`/discovery?q=${encodeURIComponent(item.symbol || item.name)}`)}
                                        className="bg-black/50 hover:bg-black/80 border border-white/5 hover:border-emerald-500/40 rounded-xl p-3 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-black shrink-0 ${
                                                    idx < 3 ? "bg-emerald-500 text-black" : "bg-white/10 text-gray-300"
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="font-bold text-white text-sm truncate group-hover:text-emerald-300 transition-colors">
                                                    {item.name}
                                                </span>
                                                <span className="text-[9px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                                                    {item.market}
                                                </span>
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                                                    isDouble 
                                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse" 
                                                        : item.type === "외인집중" 
                                                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" 
                                                        : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                                }`}>
                                                    {item.type}
                                                </span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-black text-white font-mono">{item.total_str}</span>
                                            </div>
                                        </div>

                                        {/* 외인 / 기관 수급 분할 바 */}
                                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/5 p-2 rounded-lg font-mono">
                                            <div className="flex items-center justify-between text-blue-300">
                                                <span className="text-gray-400">외국인:</span>
                                                <span className="font-bold">{item.foreign_shares}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-purple-300 border-l border-white/10 pl-2">
                                                <span className="text-gray-400">기관:</span>
                                                <span className="font-bold">{item.inst_shares}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {doubleWhaleData.length === 0 && (
                                <p className="text-gray-500 text-xs text-center py-6">수급 집계 데이터가 없습니다.</p>
                            )}
                        </div>

                        <p className="mt-3 text-[9px] text-gray-500 text-center italic">
                            ※ 한국거래소 및 네이버 금융 공식 체결 수급 통계 기준이며, 특정 종목 추천이나 투자 자문이 아닙니다.
                        </p>
                    </div>
                </div>
            ) : (
                /* Subtab 3: Search & Transaction Value TOP 2 Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderLeaderboard(
                        "실시간 인기 검색 순위",
                        "개인투자자 관심도 및 실시간 최다 검색 종목",
                        insightsData?.search_top || [],
                        "orange",
                        <Search className="w-4 h-4" />,
                        15,
                        false
                    )}
                    {renderLeaderboard(
                        "실시간 거래대금 상위 TOP",
                        "대규모 자금이 유입 중인 실수급 집중 종목",
                        insightsData?.value_top || [],
                        "yellow",
                        <Zap className="w-4 h-4" />,
                        15,
                        false
                    )}
                </div>
            )}
        </div>
    );
}

// ============ TAB 4: CALENDAR ============
function CalendarTab({ router }: { router: any }) {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    
    // 메인 서브탭 상태 (경제지표 / 실적·배당 / 공모주)
    const [mainTab, setMainTab] = useState<"economic" | "earndiv" | "ipo">("earndiv");
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (tabParam === "ipo") {
            setMainTab("ipo");
        } else if (tabParam === "economic") {
            setMainTab("economic");
        }
    }, [tabParam]);

    // [New] AI 테마 자동 매칭 함수
    const getAiThemeForEvent = (eventName: string) => {
        if (!eventName) return null;
        const lower = eventName.toLowerCase();
        if (lower.includes('cpi') || lower.includes('pce') || lower.includes('물가')) return { theme: '금리인하', reason: '물가 지표 둔화 시 금리인하 기대감으로 유동성 장세가 연출될 수 있습니다.' };
        if (lower.includes('fomc') || lower.includes('파월') || lower.includes('금리') || lower.includes('policy rate')) return { theme: '금융', reason: '기준금리 향방은 은행/금융주의 예대마진과 직결되는 핵심 변수입니다.' };
        if (lower.includes('고용') || lower.includes('실업') || lower.includes('pmi') || lower.includes('구인') || lower.includes('claims')) return { theme: '경기방어', reason: '실물 경기 둔화 우려 시 방어주 성격의 포트폴리오로 자금이 이동하는 경향이 있습니다.' };
        if (lower.includes('반도체') || lower.includes('엔비디아') || lower.includes('마이크론')) return { theme: '반도체', reason: '글로벌 반도체 밸류체인 실적 발표는 국내 소부장 종목들에 직접적인 낙수효과를 줍니다.' };
        if (lower.includes('애플') || lower.includes('아이폰') || lower.includes('wwdc')) return { theme: '애플부품', reason: '애플의 신제품/신기술 발표는 국내 카메라모듈, 디스플레이 벤더들의 주가 모멘텀입니다.' };
        if (lower.includes('테슬라') || lower.includes('전기차')) return { theme: '2차전지', reason: '전방 산업인 글로벌 EV 판매량 지표는 배터리 셀/소재 기업들의 실적 바로미터입니다.' };
        if (lower.includes('바이오') || lower.includes('fda') || lower.includes('학회')) return { theme: '바이오', reason: '글로벌 학회에서의 임상 데이터 발표나 FDA 승인 모멘텀은 섹터 전반의 투심을 견인합니다.' };
        if (lower.includes('ai') || lower.includes('인공지능')) return { theme: '인공지능', reason: '글로벌 빅테크들의 AI 투자 확대 스탠스는 국내 AI 소프트웨어/인프라 기업들의 밸류를 높입니다.' };
        if (lower.includes('원유') || lower.includes('석유') || lower.includes('opec')) return { theme: '정유', reason: '국제 유가 변동은 정제마진에 직접적인 영향을 주어 정유/화학 섹터의 수익성을 결정합니다.' };
        return null;
    };

    // 매크로 경제지표 데이터
    const [macroEvents, setMacroEvents] = useState<any[]>([]);
    const [macroLoading, setMacroLoading] = useState(true);
    const [onlyHighImpact, setOnlyHighImpact] = useState(false);
    const [krEvents, setKrEvents] = useState<any[]>([]);
    const [krLoading, setKrLoading] = useState(false);
    const [globalAssets, setGlobalAssets] = useState<any>(null);
    const [globalAssetsLoading, setGlobalAssetsLoading] = useState(false);
    const [showAllGlobalAssets, setShowAllGlobalAssets] = useState(false);

    // 실적·배당 데이터 & 캘린더 상태
    const [events, setEvents] = useState<any[]>([]);
    const [earndivLoading, setEarndivLoading] = useState(true);
    const [calTab, setCalTab] = useState<"earnings" | "dividend">("earnings");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
    const [scheduleFilter, setScheduleFilter] = useState<"upcoming" | "selected" | "month">("upcoming");

    // 공모주(IPO) 데이터
    const [ipos, setIpos] = useState<any[]>([]);
    const [ipoLoading, setIpoLoading] = useState(true);
    const [ipoTab, setIpoTab] = useState<'kr' | 'us'>('kr');
    const [ipoFilter, setIpoFilter] = useState<'all' | 'active' | 'upcoming' | 'watched'>('all');
    const [ipoSearch, setIpoSearch] = useState<string>('');
    const [watchedIpos, setWatchedIpos] = useState<Set<string>>(new Set());
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

    useEffect(() => {
        if (watchlistSymbols.length === 0) {
            (async () => {
                const token = localStorage.getItem("token");
                if (!token) return;
                try {
                    const r = await fetch(`${API_BASE_URL}/api/watchlist`, { headers: { "x-user-id": token } });
                    const j = await r.json();
                    if (j.status === "success" && j.data) {
                        setWatchlistSymbols(j.data.map((item: any) => item.symbol));
                    }
                } catch { }
            })();
        }
    }, [watchlistSymbols.length]);

    const fetchWatched = async () => {
        try {
            const userId = user?.id || (user as any)?.uid || "guest";
            const res = await fetch(`${API_BASE_URL}/api/ipo_watchlist`, {
                headers: { "X-User-Id": userId }
            });
            const json = await res.json();
            if (json.status === "success") {
                setWatchedIpos(new Set(json.data));
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchWatched();
    }, [user]);

    const toggleWatchIPO = async (ipoName: string) => {
        const userId = user?.id || (user as any)?.uid || "guest";
        const isWatched = watchedIpos.has(ipoName);

        try {
            if (isWatched) {
                const res = await fetch(`${API_BASE_URL}/api/ipo_watchlist/${encodeURIComponent(ipoName)}`, {
                    method: "DELETE",
                    headers: { "X-User-Id": userId }
                });
                if (res.ok) {
                    const newSet = new Set(watchedIpos);
                    newSet.delete(ipoName);
                    setWatchedIpos(newSet);
                    alert(`${ipoName} 알림이 해제되었습니다.`);
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/api/ipo_watchlist`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-Id": userId
                    },
                    body: JSON.stringify({ ipo_name: ipoName })
                });
                if (res.ok) {
                    const newSet = new Set(watchedIpos);
                    newSet.add(ipoName);
                    setWatchedIpos(newSet);
                    alert(`${ipoName} 알림이 등록되었습니다.`);
                }
            }
        } catch (e) {
            console.error(e);
            alert("알림 설정 중 오류가 발생했습니다.");
        }
    };

    // 실시간 수동 갱신 함수
    const refreshAllCalendarData = async () => {
        setRefreshing(true);
        try {
            const [r1, r2, r3, r4] = await Promise.all([
                fetch(`${API_BASE_URL}/api/market/calendar`, { cache: 'no-store' }),
                fetch(`${API_BASE_URL}/api/market/calendar/events`, { cache: 'no-store' }),
                fetch(`${API_BASE_URL}/api/market/korea/ipo`, { cache: 'no-store' }),
                fetch(`${API_BASE_URL}/api/market/us/ipo`, { cache: 'no-store' })
            ]);
            const [j1, j2, j3, j4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);

            if (j1.status === "success" && j1.data) setMacroEvents(j1.data);
            if (j2.status === "success" && j2.data) setEvents(j2.data);
            if (ipoTab === 'kr' && j3.status === "success" && j3.data) {
                setIpos(j3.data.map((item: any) => ({
                    ...item,
                    name: item.name || item.corp || item.symbol,
                    subscription_date: item.date,
                    fixed_price: item.price,
                    price_band: item.band || ""
                })));
            } else if (ipoTab === 'us' && j4.status === "success" && j4.data) {
                setIpos(j4.data.map((item: any) => ({
                    ...item,
                    name: item.name || item.corp || item.symbol,
                    subscription_date: item.date,
                    fixed_price: item.price,
                    price_band: item.band || ""
                })));
            }
        } catch (e) {
            console.error("Calendar refresh error:", e);
        } finally {
            setRefreshing(false);
        }
    };

    // 경제지표 데이터 fetch (글로벌 일정)
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

    // 글로벌 주요 지수 및 매크로 지표 fetch (숫자 중심 표시용)
    useEffect(() => {
        const fetchGlobalAssets = async () => {
            setGlobalAssetsLoading(true);
            try {
                const [assetsRes, indicesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/market/assets`).catch(() => null),
                    fetch(`${API_BASE_URL}/api/market/indices`).catch(() => null)
                ]);

                const assetsJson = assetsRes ? await assetsRes.json().catch(() => ({})) : {};
                const indicesJson = indicesRes ? await indicesRes.json().catch(() => ({})) : {};

                const rawAssets = assetsJson?.data || {};
                const rawIndices = indicesJson?.data || [];

                const combined: any[] = [];

                // 1. 국내 및 해외 주요 지수 (코스피, 코스닥, S&P 500, 나스닥, 다우존스, VIX)
                if (Array.isArray(rawIndices)) {
                    rawIndices.forEach((item: any) => {
                        const name = String(item.event_kr || item.event || "");
                        if (
                            name.includes("KOSPI") || name.includes("코스피") ||
                            name.includes("KOSDAQ") || name.includes("코스닥") ||
                            name.includes("S&P 500") || name.includes("NASDAQ") || name.includes("나스닥") ||
                            name.includes("DOW") || name.includes("다우") ||
                            name.includes("VIX") || name.includes("공포") ||
                            name.includes("미 국채 10년물") || name.includes("달러 지수")
                        ) {
                            const cleanName = name
                                .replace("[글로벌] ", "")
                                .replace("(공포지수)", "")
                                .replace("DOW JONES", "다우존스");
                            combined.push({
                                name: cleanName,
                                price: item.actual,
                                change: item.change
                            });
                        }
                    });
                }

                // 2. 주요 환율, 원자재, 채권 (원/달러 환율, WTI 유가, 금, 은, 구리 등)
                if (typeof rawAssets === 'object' && rawAssets !== null) {
                    const forexList = rawAssets.Forex || [];
                    forexList.forEach((f: any) => {
                        if (f.name === "미국 USD" || f.symbol === "FX_USDKRW" || f.name === "일본 JPY") {
                            const cnum = parseFloat(String(f.change || 0));
                            const cstr = `${cnum > 0 ? '+' : ''}${cnum.toFixed(2)}%`;
                            combined.push({
                                name: f.name === "미국 USD" ? "원/달러 환율" : f.name === "일본 JPY" ? "원/엔 환율 (100엔)" : f.name,
                                price: `₩${f.price}`,
                                change: cstr
                            });
                        }
                    });

                    const commodityList = rawAssets.Commodity || [];
                    commodityList.forEach((c: any) => {
                        if (c.name === "WTI" || c.name === "국제 금" || c.name === "Gold" || c.name === "천연가스" || c.name === "구리") {
                            const cnum = parseFloat(String(c.change || 0));
                            const cstr = `${cnum > 0 ? '+' : ''}${cnum.toFixed(2)}%`;
                            combined.push({
                                name: c.name === "WTI" ? "WTI 유가" : c.name === "Gold" || c.name === "국제 금" ? "국제 금" : c.name,
                                price: `$${c.price}`,
                                change: cstr
                            });
                        }
                    });
                }

                // 중복 제거
                const unique = combined.filter((item, index, self) =>
                    index === self.findIndex((t) => t.name === item.name)
                );

                if (unique.length > 0) {
                    setGlobalAssets(unique);
                }
            } catch (e) {
                console.error("Global assets fetch error:", e);
            } finally {
                setGlobalAssetsLoading(false);
            }
        };

        fetchGlobalAssets();
        const interval = setInterval(fetchGlobalAssets, 30000);
        return () => clearInterval(interval);
    }, []);

    // 실적·배당 데이터 fetch
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE_URL}/api/market/calendar/events`);
                const j = await r.json();
                let allEvents = j.status === "success" ? (j.data || []) : [];

                const token = localStorage.getItem("token");
                if (token && watchlistSymbols.length > 0) {
                    try {
                        const syms = watchlistSymbols.join(",");
                        const w_res = await fetch(`${API_BASE_URL}/api/market/calendar/watchlist?symbols=${syms}`, {
                            headers: { "x-user-id": token }
                        });
                        const w_j = await w_res.json();
                        if (w_j.status === "success" && w_j.data) {
                            const existingKeys = new Set(allEvents.map((e: any) => `${e.symbol}-${e.type}`));
                            const newEvents = w_j.data.filter((e: any) => !existingKeys.has(`${e.symbol}-${e.type}`));
                            allEvents = [...allEvents, ...newEvents];
                        }
                    } catch (e) {
                        console.error("Watchlist events fetch error:", e);
                    }
                }

                setEvents(allEvents);
            } catch { }
            finally { setEarndivLoading(false); }
        })();
    }, [watchlistSymbols.join(",")]);

    // 공모주 데이터 fetch
    useEffect(() => {
        if (mainTab !== "ipo") return;
        (async () => {
            try {
                setIpoLoading(true);
                setIpos([]);
                const endpoint = ipoTab === 'kr' ? '/api/market/korea/ipo' : '/api/market/us/ipo';
                const r = await fetch(`${API_BASE_URL}${endpoint}`, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
                const j = await r.json();
                if (j.status === "success") {
                    setIpos(j.data.map((item: any) => ({
                        ...item,
                        name: item.corp || item.name || item.symbol,
                        symbol: item.symbol || "",
                        subscription_date: item.date,
                        fixed_price: item.price,
                        price_band: item.band || "",
                        detail: item.detail || item.type || ""
                    })));
                }
            } catch { }
            finally { setIpoLoading(false); }
        })();
    }, [mainTab, ipoTab]);

    // 실적·배당 달력 계산
    const filtered = (Array.isArray(events) ? events : []).filter(e => e.type === calTab);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    
    const isToday = (d: number) => {
        const n = new Date();
        return n.getFullYear() === currentMonth.getFullYear() && n.getMonth() === currentMonth.getMonth() && n.getDate() === d;
    };
    
    const isSelected = (d: number) => {
        return selectedDay === d;
    };

    const getEventsForDay = (d: number) => {
        const ds = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return (Array.isArray(filtered) ? filtered : []).filter(e => String(e.date || "").startsWith(ds));
    };

    const icon = (t: string) => t === "earnings" ? "📈" : t === "dividend" ? "💰" : "📋";

    // 하단 목록에 표시할 이벤트 필터링 및 정렬
    const getDisplayEvents = () => {
        const list = Array.isArray(filtered) ? [...filtered] : [];
        
        if (scheduleFilter === "selected" && selectedDay !== null) {
            const ds = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
            return list.filter(e => String(e.date || "").startsWith(ds));
        }
        
        if (scheduleFilter === "month") {
            const ym = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
            return list.filter(e => String(e.date || "").startsWith(ym)).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
        }

        // Default "upcoming":
        return list.sort((a, b) => {
            const dDayA = Math.ceil((new Date(a.date).getTime() - Date.now()) / 86400000);
            const dDayB = Math.ceil((new Date(b.date).getTime() - Date.now()) / 86400000);
            
            const isUpA = dDayA >= 0;
            const isUpB = dDayB >= 0;
            
            if (isUpA && !isUpB) return -1;
            if (!isUpA && isUpB) return 1;
            if (isUpA && isUpB) return dDayA - dDayB;
            return dDayB - dDayA;
        });
    };

    const displayEvents = getDisplayEvents();
    const selectedDayEvents = selectedDay !== null ? getEventsForDay(selectedDay) : [];

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Top Navigation & Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-zinc-900/80 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
                {/* 3 Main Subtabs */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                        onClick={() => setMainTab("earndiv")}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            mainTab === "earndiv"
                                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/20"
                                : "text-gray-400 hover:text-white bg-black/20"
                        }`}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>실적 / 배당 캘린더</span>
                    </button>
                    <button
                        onClick={() => setMainTab("economic")}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            mainTab === "economic"
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20"
                                : "text-gray-400 hover:text-white bg-black/20"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>주요 경제 지표</span>
                    </button>
                    <button
                        onClick={() => setMainTab("ipo")}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                            mainTab === "ipo"
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/20"
                                : "text-gray-400 hover:text-white bg-black/20"
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>공모주 청약</span>
                    </button>
                </div>

                {/* Refresh Button */}
                <button
                    onClick={refreshAllCalendarData}
                    disabled={refreshing}
                    className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                    <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>실시간 갱신</span>
                </button>
            </div>

            {/* TAB 1: 실적/배당 서브탭 */}
            <div className={mainTab === "earndiv" ? "space-y-4 block animate-in fade-in duration-200" : "hidden"}>
                {/* 실적 vs 배당 토글 */}
                <div className="flex gap-2 bg-zinc-900/60 p-1.5 rounded-2xl border border-white/5">
                    <button
                        onClick={() => {
                            setCalTab("earnings");
                            setSelectedDay(null);
                        }}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                            calTab === "earnings" 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/50" 
                                : "text-gray-400 hover:text-white bg-black/20"
                        }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        <span>📈 기업 실적 발표 캘린더</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 font-mono">
                            {(Array.isArray(events) ? events : []).filter(e => e.type === "earnings").length}건
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setCalTab("dividend");
                            setSelectedDay(null);
                        }}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                            calTab === "dividend" 
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/50" 
                                : "text-gray-400 hover:text-white bg-black/20"
                        }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        <span>💰 배당락 / 배당금 캘린더</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 font-mono">
                            {(Array.isArray(events) ? events : []).filter(e => e.type === "dividend").length}건
                        </span>
                    </button>
                </div>

                {/* 스마트 인터랙티브 캘린더 그리드 */}
                <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-xl shadow-xl space-y-4">
                    {/* 달력 헤더: 년월 이동, 빠른 월 점퍼 및 오늘 버튼 */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-black/30 p-1 rounded-xl border border-white/10">
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                    title="이전 달"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 text-sm md:text-base font-black text-white min-w-[100px] text-center">
                                    {currentMonth.toLocaleString("ko-KR", { year: "numeric", month: "long" })}
                                </span>
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                    title="다음 달"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    const now = new Date();
                                    setCurrentMonth(now);
                                    setSelectedDay(now.getDate());
                                    setScheduleFilter("selected");
                                }}
                                className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                            >
                                <Clock className="w-3.5 h-3.5" />
                                <span>오늘</span>
                            </button>
                        </div>

                        {/* 시즌 빠른 이동 뱃지들 */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-500 font-bold hidden sm:inline">빠른 이동:</span>
                            {(() => {
                                const stats: { [key: string]: { year: number, month: number, count: number } } = {};
                                (Array.isArray(events) ? events : []).forEach(e => {
                                    if (e?.type === calTab && e?.date) {
                                        const match = String(e.date).match(/^(\d{4})-(\d{1,2})/);
                                        if (match) {
                                            const y = parseInt(match[1]);
                                            const m = parseInt(match[2]);
                                            const key = `${y}-${String(m).padStart(2, "0")}`;
                                            if (!stats[key]) {
                                                stats[key] = { year: y, month: m, count: 0 };
                                            }
                                            stats[key].count += 1;
                                        }
                                    }
                                });
                                const entries = Object.entries(stats).sort(([a], [b]) => a.localeCompare(b));
                                if (entries.length === 0) return <span className="text-[10px] text-gray-500">집계된 시즌 일정 없음</span>;

                                return entries.map(([key, item]) => {
                                    const isCurrent = currentMonth.getFullYear() === item.year && (currentMonth.getMonth() + 1) === item.month;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                const targetDate = new Date(item.year, item.month - 1, 1);
                                                setCurrentMonth(targetDate);
                                                setSelectedDay(null);
                                                setScheduleFilter("month");
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                isCurrent
                                                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/30 font-black ring-1 ring-orange-400"
                                                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                                            }`}
                                        >
                                            <span>{item.month}월</span>
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${isCurrent ? 'bg-black/40 text-white' : 'bg-orange-500/20 text-orange-300'}`}>
                                                {item.count}건
                                            </span>
                                            {item.count >= 5 && <span className="text-[10px]">🔥시즌</span>}
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* 요일 헤더 */}
                    <div className="grid grid-cols-7 gap-1.5">
                        {["일", "월", "화", "수", "목", "금", "토"].map(d => (
                            <div key={d} className={`text-center text-xs font-black py-1 rounded-lg bg-black/20 ${
                                d === "일" ? "text-rose-400" : d === "토" ? "text-blue-400" : "text-gray-400"
                            }`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* 날짜 셀 그리드 */}
                    <div className="grid grid-cols-7 gap-1.5">
                        {Array.from({ length: firstDay }, (_, i) => (
                            <div key={`empty-${i}`} className="min-h-[65px] md:min-h-[75px] rounded-xl bg-black/10 opacity-20 border border-transparent" />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const evs = getEventsForDay(day);
                            const dow = (firstDay + i) % 7;
                            const today = isToday(day);
                            const selected = isSelected(day);

                            return (
                                <div
                                    key={day}
                                    onClick={() => {
                                        setSelectedDay(day);
                                        setScheduleFilter("selected");
                                    }}
                                    className={`min-h-[65px] md:min-h-[75px] rounded-xl p-2 border transition-all cursor-pointer flex flex-col justify-between group ${
                                        selected
                                            ? "border-orange-500 bg-orange-500/25 shadow-lg shadow-orange-500/20 ring-2 ring-orange-400"
                                            : today
                                            ? "border-amber-500/60 bg-amber-500/10 hover:border-amber-400"
                                            : evs.length > 0
                                            ? "border-white/20 bg-white/5 hover:border-orange-500/50 hover:bg-white/10"
                                            : "border-white/5 bg-black/20 hover:border-white/20 hover:bg-white/5"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs md:text-sm font-black ${
                                            selected ? "text-orange-300" :
                                            today ? "text-amber-400" :
                                            dow === 0 ? "text-rose-400" :
                                            dow === 6 ? "text-blue-400" :
                                            "text-gray-200"
                                        }`}>
                                            {day}
                                        </span>
                                        {today && (
                                            <span className="text-[8px] font-black bg-amber-400 text-black px-1 rounded">
                                                오늘
                                            </span>
                                        )}
                                    </div>

                                    {/* Event Chips (종목명 뱃지 노출) */}
                                    {evs.length > 0 ? (
                                        <div className="mt-1 space-y-0.5">
                                            {evs.slice(0, 1).map((ev: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className={`text-[9px] font-black truncate px-1 py-0.5 rounded border ${
                                                        calTab === 'earnings'
                                                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                    }`}
                                                    title={ev.name}
                                                >
                                                    {ev.name}
                                                </div>
                                            ))}
                                            {evs.length > 1 && (
                                                <div className="text-[8px] font-bold text-orange-400 flex items-center gap-0.5">
                                                    <span>+{evs.length - 1}건</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-3" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 하단 일정 섹션 & 필터 바 */}
                <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <h4 className="font-black text-sm md:text-base text-gray-200 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-orange-400" />
                            <span>
                                {scheduleFilter === "selected" && selectedDay !== null
                                    ? `📌 ${currentMonth.getMonth() + 1}월 ${selectedDay}일 일정 (${selectedDayEvents.length}건)`
                                    : scheduleFilter === "month"
                                    ? `📅 ${currentMonth.getMonth() + 1}월 전체 일정 (${displayEvents.length}건)`
                                    : `⚡ 다가오는 주요 실적/배당 일정 (${displayEvents.length}건)`}
                            </span>
                        </h4>

                        {/* 3가지 필터 탭 */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                            <button
                                onClick={() => setScheduleFilter("upcoming")}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    scheduleFilter === "upcoming" ? "bg-orange-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
                                }`}
                            >
                                ⚡ 다가오는 순
                            </button>
                            <button
                                onClick={() => setScheduleFilter("selected")}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    scheduleFilter === "selected" ? "bg-orange-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
                                }`}
                            >
                                📌 선택한 날짜 ({selectedDay ? `${selectedDay}일` : "-"})
                            </button>
                            <button
                                onClick={() => setScheduleFilter("month")}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    scheduleFilter === "month" ? "bg-orange-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
                                }`}
                            >
                                📅 {currentMonth.getMonth() + 1}월 전체
                            </button>
                        </div>
                    </div>

                    {earndivLoading ? (
                        <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-white/5">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-400 mb-2" />
                            <p className="text-xs text-gray-400 font-bold">DART 전자공시 및 최신 실적 일정을 분석하고 있습니다...</p>
                        </div>
                    ) : displayEvents.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-zinc-900/60 rounded-2xl border border-white/5">
                            <Calendar className="w-10 h-10 text-gray-500 mx-auto mb-2 opacity-40" />
                            <p className="text-xs text-gray-300 font-bold mb-1">
                                {scheduleFilter === "selected" && selectedDay !== null
                                    ? `${currentMonth.getMonth() + 1}월 ${selectedDay}일에는 예정된 ${calTab === "earnings" ? "실적" : "배당"} 일정이 없습니다.`
                                    : "조회된 일정이 없습니다."}
                            </p>
                            <p className="text-[11px] text-gray-500 mb-4">다가오는 주요 기업들의 일정을 확인해보세요.</p>
                            <button
                                onClick={() => setScheduleFilter("upcoming")}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-orange-600/30"
                            >
                                ⚡ 다가오는 전체 일정 보기
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {displayEvents.slice(0, 16).map((ev, i) => {
                                const dDay = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86400000);
                                const isPast = dDay < 0;

                                return (
                                    <div
                                        key={i}
                                        className="bg-zinc-900/80 border border-white/10 hover:border-white/25 rounded-2xl p-4 transition-all hover:bg-white/5 cursor-pointer group flex flex-col justify-between gap-3 shadow-lg"
                                        onClick={() => {
                                            if (ev.link) window.open(ev.link, '_blank');
                                            else router.push(`/discovery?q=${encodeURIComponent(ev.symbol || ev.name)}`);
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`p-2.5 rounded-xl ${
                                                    ev.type === 'earnings' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                } shrink-0`}>
                                                    <span className="text-lg">{icon(ev.type)}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-black text-sm text-white group-hover:text-orange-400 transition-colors truncate">
                                                            {ev.name}
                                                        </span>
                                                        <span className="text-xs font-mono text-gray-400">
                                                            {ev.symbol}
                                                        </span>
                                                        {(ev.is_dart || (ev.symbol && /^\d{6}$/.test(ev.symbol))) && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-0.5">
                                                                <FileText className="w-2.5 h-2.5" /> DART 공식
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-300 mt-1 font-medium line-clamp-1">
                                                        {ev.detail && ev.detail !== "실적 발표 (예정)"
                                                            ? ev.detail
                                                            : ev.summary
                                                            ? ev.summary
                                                            : isPast
                                                            ? "공시 발표가 완료된 일정입니다."
                                                            : "공시가 등록되는 즉시 핵심 수치를 업데이트합니다."}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right D-Day & Date */}
                                            <div className="text-right shrink-0">
                                                <span className={`text-xs font-black px-2.5 py-1 rounded-xl border block mb-1 font-mono shadow-sm ${
                                                    dDay === 0
                                                        ? "bg-rose-500 text-white border-rose-400 animate-pulse"
                                                        : dDay > 0 && dDay <= 3
                                                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                                        : dDay > 3 && dDay <= 7
                                                        ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                                                        : dDay > 7
                                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                                        : "bg-white/5 text-gray-400 border-white/10"
                                                }`}>
                                                    {dDay === 0 ? "TODAY" : dDay > 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`}
                                                </span>
                                                <div className="text-[10px] font-mono text-gray-400 font-bold">
                                                    {ev.date}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Action bar */}
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                                            <div className="flex items-center gap-1.5 text-gray-400">
                                                <span>{isPast ? "📌 발표 완료" : "⏱️ 발표 대기"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {ev.link && (
                                                    <span className="text-blue-400 hover:underline flex items-center gap-0.5">
                                                        공시원문 <ExternalLink className="w-2.5 h-2.5" />
                                                    </span>
                                                )}
                                                <span className="text-orange-400 group-hover:underline flex items-center gap-0.5 font-bold">
                                                    차트 분석 ↗
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* TAB 2: 주요 경제 지표 서브탭 */}
            <div className={mainTab === "economic" ? "space-y-4 block animate-in fade-in duration-200" : "hidden"}>
                <div className="space-y-4">
                    {/* 상단 글로벌 주요 지수 및 매크로 지표 미니 카드 그리드 (숫자 중심 컴팩트 뷰) */}
                    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 md:p-5 shadow-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-sm md:text-base text-gray-200 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-emerald-400" />
                                <span>주요 경제 지표 (실시간)</span>
                            </h4>
                            <span className="text-[10px] text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                                실시간 30초 자동 동기화
                            </span>
                        </div>

                        {globalAssetsLoading && !globalAssets ? (
                            <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-gray-500" /></div>
                        ) : globalAssets && globalAssets.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5">
                                {(Array.isArray(globalAssets) ? globalAssets : []).map((asset: any, i: number) => {
                                    const changeStr = String(asset.change || "");
                                    const isUp = changeStr.startsWith('+') || (parseFloat(changeStr) > 0 && !changeStr.startsWith('-'));
                                    const isDown = changeStr.startsWith('-') || parseFloat(changeStr) < 0;

                                    const colorClass = isUp ? 'text-rose-500' : isDown ? 'text-blue-400' : 'text-gray-400';
                                    const badgeBg = isUp ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : isDown ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-white/5 text-gray-400 border-white/10';

                                    return (
                                        <div
                                            key={i}
                                            className="bg-black/30 hover:bg-white/5 border border-white/5 hover:border-white/20 rounded-xl p-3 flex flex-col justify-between transition-all group shadow-sm"
                                        >
                                            <div className="text-xs font-bold text-gray-400 group-hover:text-gray-200 transition-colors truncate mb-1">
                                                {asset.name}
                                            </div>
                                            <div className={`text-base md:text-lg font-black font-mono tracking-tight ${colorClass}`}>
                                                {asset.price}
                                            </div>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border ${badgeBg}`}>
                                                    {isUp ? '▲' : isDown ? '▼' : '●'} {changeStr || "0.00%"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-xs">
                                <p>실시간 지표 데이터를 조회하는 중입니다...</p>
                            </div>
                        )}
                    </div>

                    {/* 하단 글로벌 경제 캘린더 일정 섹션 */}
                    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 md:p-5 shadow-xl">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <h4 className="font-black text-sm md:text-base text-gray-200 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-400" /> 주간 글로벌 핵심 일정
                            </h4>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setOnlyHighImpact(!onlyHighImpact)}
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                        onlyHighImpact
                                            ? "bg-red-500/20 text-red-300 border-red-500/40 shadow-sm"
                                            : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                                    }`}
                                >
                                    <span>⭐⭐⭐</span>
                                    <span>{onlyHighImpact ? "특급 이벤트만 보는 중" : "특급 이벤트만 보기"}</span>
                                </button>
                                <div className="text-[10px] text-gray-500 hidden sm:block">ForexFactory / Global</div>
                            </div>
                        </div>

                        {macroLoading ? (
                            <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-gray-500" /></div>
                        ) : macroEvents.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-xs">
                                <p>예정된 주요 경제 일정이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[350px] overflow-y-auto hide-scrollbar">
                                {(Array.isArray(macroEvents) ? macroEvents : [])
                                    .filter(evt => {
                                        if (!onlyHighImpact) return true;
                                        const name = (evt.event_kr || evt.event || "").toLowerCase();
                                        return evt.importance >= 3 || name.includes("cpi") || name.includes("fomc") || name.includes("금리") || name.includes("고용") || name.includes("gdp") || name.includes("pce");
                                    })
                                    .map((evt, i) => {
                                        const is3Star = evt.importance >= 3 || String(evt.event_kr || evt.event || "").includes("CPI") || String(evt.event_kr || evt.event || "").includes("FOMC");
                                        return (
                                            <div key={i} className={`flex flex-col p-3 rounded-xl transition-all border group ${
                                                is3Star 
                                                    ? "bg-red-950/20 hover:bg-red-950/30 border-red-500/30 shadow-sm" 
                                                    : "bg-black/20 hover:bg-black/40 border-white/5"
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-center min-w-[45px]">
                                                        <span className="text-[11px] font-mono font-black text-gray-400">{evt.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 px-1">
                                                        {evt.country === 'KR' ? '🇰🇷' : evt.country === 'US' ? '🇺🇸' : evt.country === 'JP' ? '🇯🇵' : evt.country === 'CN' ? '🇨🇳' : evt.country === 'EU' ? '🇪🇺' : '🌐'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={`font-bold text-xs truncate ${is3Star ? "text-white" : "text-gray-300"}`}>
                                                                {evt.event_kr || evt.event}
                                                            </span>
                                                            {is3Star && (
                                                                <span className="text-[9px] font-black bg-red-500/30 text-red-300 px-1.5 py-0.2 rounded border border-red-500/40">
                                                                    ⭐⭐⭐ 특급
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-3 mt-1 text-[10px] font-bold">
                                                            {evt.previous && evt.previous !== "-" && <span className="text-gray-500">이전 <span className="text-gray-400">{evt.previous}</span></span>}
                                                            {evt.forecast && evt.forecast !== "-" && <span className="text-gray-500">예상 <span className="text-yellow-500/80">{evt.forecast}</span></span>}
                                                            {evt.actual && evt.actual !== "-" && <span className="text-gray-400">실제 <span className={`${is3Star ? 'text-green-400 font-black' : 'text-gray-200'}`}>{evt.actual}</span></span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Zap className={`w-3.5 h-3.5 ${is3Star ? 'text-red-500 fill-red-500 animate-pulse' : evt.importance >= 2 ? 'text-orange-400 fill-orange-400' : 'text-gray-700'}`} />
                                                    </div>
                                                </div>
                                                {(() => {
                                                    const aiData = getAiThemeForEvent(evt.event_kr || evt.event);
                                                    if (aiData && (evt.importance >= 2 || is3Star)) {
                                                        return (
                                                            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                                                                <span className="text-gray-400">💡 AI 수혜 테마: <strong className="text-yellow-300">{aiData.theme}</strong></span>
                                                                <span className="text-gray-500 truncate max-w-[200px]">{aiData.reason}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TAB 3: 공모주 서브탭 */}
            <div className={mainTab === "ipo" ? "space-y-4 block animate-in fade-in duration-200" : "hidden"}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-white/10 shadow-xl">
                    <div>
                        <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                            <span>📋 공모주 청약 캘린더</span>
                        </h2>
                        <span className="text-xs text-gray-400">DART 전자공시 기반 실시간 청약·상장 일정 분석</span>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                            <button
                                onClick={() => setIpoTab('kr')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    ipoTab === 'kr'
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 font-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                🇰🇷 국내 공모주
                            </button>
                            <button
                                onClick={() => setIpoTab('us')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    ipoTab === 'us'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                🇺🇸 미국 공모주
                            </button>
                        </div>
                    </div>
                </div>

                {/* 실시간 달러 환율 및 통화 변환 헬퍼 */}
                {(() => {
                    // Extract live USD/KRW exchange rate from globalAssets
                    let liveUsdRate = 1380;
                    if (Array.isArray(globalAssets)) {
                        const found = globalAssets.find((a: any) =>
                            a.name?.includes("원/달러") ||
                            a.name?.includes("달러/원") ||
                            a.name?.includes("USD/KRW") ||
                            a.symbol?.includes("USDKRW")
                        );
                        if (found && found.price) {
                            const num = parseFloat(String(found.price).replace(/,/g, ""));
                            if (!isNaN(num) && num > 500 && num < 3000) {
                                liveUsdRate = num;
                            }
                        }
                    }

                    const convertUsdToKrw = (usdStr: string) => {
                        if (!usdStr) return "";
                        if (usdStr.includes("~")) {
                            const parts = usdStr.split("~").map(p => p.trim());
                            const m1 = parts[0].match(/[\d,.]+/);
                            const m2 = parts[1].match(/[\d,.]+/);
                            if (m1 && m2) {
                                const v1 = parseFloat(m1[0].replace(/,/g, ""));
                                const v2 = parseFloat(m2[0].replace(/,/g, ""));
                                if (!isNaN(v1) && !isNaN(v2) && (v1 > 0 || v2 > 0)) {
                                    return `약 ${Math.round(v1 * liveUsdRate).toLocaleString()}원 ~ ${Math.round(v2 * liveUsdRate).toLocaleString()}원`;
                                }
                            }
                        } else {
                            const m = usdStr.match(/[\d,.]+/);
                            if (m) {
                                const v = parseFloat(m[0].replace(/,/g, ""));
                                if (!isNaN(v) && v > 0) {
                                    return `약 ${Math.round(v * liveUsdRate).toLocaleString()}원`;
                                }
                            }
                        }
                        return "";
                    };

                    // Helper to parse dates and calculate D-Day
                    const parseIpoData = (rawList: any[]) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        return (Array.isArray(rawList) ? rawList : []).map(ipo => {
                            const rawDate = String(ipo.subscription_date || ipo.date || "");
                            let startD: Date | null = null;
                            let endD: Date | null = null;
                            let dateDisplay = rawDate;

                            const m6 = rawDate.match(/^(\d{2})(\d{2})(\d{2})\s*~\s*(\d{2})(\d{2})$/);
                            if (m6) {
                                const y = 2000 + parseInt(m6[1]);
                                const m1 = parseInt(m6[2]);
                                const d1 = parseInt(m6[3]);
                                const m2 = parseInt(m6[4]);
                                const d2 = parseInt(m6[5]);
                                startD = new Date(y, m1 - 1, d1);
                                endD = new Date(y, m2 - 1, d2, 23, 59, 59);
                                dateDisplay = `${y}.${String(m1).padStart(2, "0")}.${String(d1).padStart(2, "0")} ~ ${String(m2).padStart(2, "0")}.${String(d2).padStart(2, "0")}`;
                            } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                                startD = new Date(rawDate);
                                endD = new Date(rawDate + "T23:59:59");
                                dateDisplay = rawDate;
                            }

                            let status: "active" | "upcoming" | "closed" = "upcoming";
                            let statusLabel = "청약 예정";
                            let dDayNum = 999;

                            if (startD && endD) {
                                const diffStart = Math.ceil((startD.getTime() - today.getTime()) / 86400000);
                                const diffEnd = Math.ceil((endD.getTime() - today.getTime()) / 86400000);

                                if (today >= startD && today <= endD) {
                                    status = "active";
                                    statusLabel = diffEnd === 0 ? "오늘 청약 마감 🔥" : "청약 진행중 🔥";
                                    dDayNum = 0;
                                } else if (today < startD) {
                                    status = "upcoming";
                                    statusLabel = diffStart === 1 ? "내일 시작" : `D-${diffStart}`;
                                    dDayNum = diffStart;
                                } else {
                                    status = "closed";
                                    statusLabel = "청약 마감";
                                    dDayNum = -1;
                                }
                            }

                            return {
                                ...ipo,
                                dateDisplay,
                                status,
                                statusLabel,
                                dDayNum,
                                isWatched: watchedIpos.has(ipo.name)
                            };
                        });
                    };

                    const parsedList = parseIpoData(ipos);

                    const activeCount = parsedList.filter(i => i.status === "active").length;
                    const upcomingCount = parsedList.filter(i => i.status === "upcoming").length;
                    const watchedCount = parsedList.filter(i => i.isWatched).length;

                    const filteredList = parsedList.filter(item => {
                        // Filter by tab status
                        if (ipoFilter === "active" && item.status !== "active") return false;
                        if (ipoFilter === "upcoming" && item.status !== "upcoming") return false;
                        if (ipoFilter === "watched" && !item.isWatched) return false;

                        // Search
                        if (ipoSearch) {
                            const q = ipoSearch.toLowerCase();
                            const matchName = String(item.name || "").toLowerCase().includes(q);
                            const matchDetail = String(item.detail || "").toLowerCase().includes(q);
                            return matchName || matchDetail;
                        }

                        return true;
                    });

                    // Sort: Active first, then upcoming (closest first), then closed
                    filteredList.sort((a, b) => {
                        if (a.status === "active" && b.status !== "active") return -1;
                        if (b.status === "active" && a.status !== "active") return 1;
                        if (a.status === "upcoming" && b.status === "upcoming") return a.dDayNum - b.dDayNum;
                        if (a.status === "upcoming" && b.status === "closed") return -1;
                        if (b.status === "upcoming" && a.status === "closed") return 1;
                        return 0;
                    });

                    return (
                        <div className="space-y-3">
                            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                                {/* 필터 칩 바 및 환율 표시 */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto hide-scrollbar">
                                        <button
                                            onClick={() => setIpoFilter("all")}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                                ipoFilter === "all" ? "bg-purple-600 text-white shadow-sm font-black" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            ⚡ 전체 ({parsedList.length})
                                        </button>
                                        <button
                                            onClick={() => setIpoFilter("active")}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                                                ipoFilter === "active" ? "bg-rose-600 text-white shadow-sm font-black" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            🔥 진행중 ({activeCount})
                                        </button>
                                        <button
                                            onClick={() => setIpoFilter("upcoming")}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                                ipoFilter === "upcoming" ? "bg-blue-600 text-white shadow-sm font-black" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            ⏳ 예정 ({upcomingCount})
                                        </button>
                                        <button
                                            onClick={() => setIpoFilter("watched")}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                                                ipoFilter === "watched" ? "bg-yellow-500 text-black shadow-sm font-black" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            ⭐ 알림 ({watchedCount})
                                        </button>
                                    </div>

                                    {ipoTab === 'us' && (
                                        <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/25 text-[11px] font-bold text-blue-300 shadow-sm">
                                            <span>💵 실시간 적용 환율:</span>
                                            <span className="font-mono font-black text-white">1$ = {Math.round(liveUsdRate).toLocaleString()}원</span>
                                        </div>
                                    )}
                                </div>

                                {/* 검색 인풋 */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={ipoSearch}
                                        onChange={(e) => setIpoSearch(e.target.value)}
                                        placeholder="종목명, 주관사 검색..."
                                        className="bg-black/30 border border-white/10 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none w-full md:w-56"
                                    />
                                    {ipoSearch && (
                                        <button
                                            onClick={() => setIpoSearch("")}
                                            className="absolute right-2.5 top-2 text-gray-400 hover:text-white text-xs"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 로딩 & 목록 렌더링 */}
                            {ipoLoading ? (
                                <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-white/5">
                                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-2" />
                                    <p className="text-xs text-gray-400 font-bold">DART 전자공시 및 최신 공모주 청약 일정을 분석하고 있습니다...</p>
                                </div>
                            ) : filteredList.length === 0 ? (
                                <div className="text-center py-12 px-4 bg-zinc-900/60 rounded-2xl border border-white/5">
                                    <FileText className="w-10 h-10 text-gray-500 mx-auto mb-2 opacity-40" />
                                    <p className="text-xs text-gray-300 font-bold mb-1">
                                        {ipoSearch ? `"${ipoSearch}" 검색 결과가 없습니다.` : "해당 조건의 공모주 일정이 없습니다."}
                                    </p>
                                    <p className="text-[11px] text-gray-500 mb-4">전체 탭을 눌러 다가오는 일정을 확인해보세요.</p>
                                    <button
                                        onClick={() => { setIpoFilter("all"); setIpoSearch(""); }}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-purple-600/30"
                                    >
                                        ⚡ 전체 공모주 보기
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {filteredList.map((ipo, idx) => {
                                        const isFixedPrice = ipo.fixed_price && ipo.fixed_price !== "미정" && ipo.fixed_price !== "-";
                                        const krwFixedEstimate = isFixedPrice ? convertUsdToKrw(String(ipo.fixed_price)) : "";
                                        const krwBandEstimate = ipo.price_band ? convertUsdToKrw(String(ipo.price_band)) : "";

                                        return (
                                            <div
                                                key={idx}
                                                className={`bg-zinc-900/80 border rounded-2xl p-4 transition-all hover:bg-white/5 flex flex-col justify-between gap-3.5 shadow-lg group ${
                                                    ipo.status === 'active'
                                                        ? 'border-rose-500/40 ring-1 ring-rose-500/20'
                                                        : 'border-white/10 hover:border-white/25'
                                                }`}
                                            >
                                                {/* 상단 헤더: 종목명 & D-Day 뱃지 */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="font-black text-sm md:text-base text-white group-hover:text-purple-400 transition-colors truncate">
                                                                {ipo.name}
                                                            </h4>
                                                            {ipo.symbol && (
                                                                <span className="text-xs font-mono text-gray-400 font-bold">
                                                                    {ipo.symbol}
                                                                </span>
                                                            )}
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                                {ipoTab === 'kr' ? '국내 공모' : ipo.type || '미국 IPO'}
                                                            </span>
                                                        </div>
                                                        {ipo.detail && (
                                                            <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-gray-500">{ipoTab === 'kr' ? '주관사:' : '정보:'}</span>
                                                                <span className="font-bold text-gray-300">{ipo.detail}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* D-Day 뱃지 */}
                                                    <div className="shrink-0 text-right">
                                                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl border block font-mono shadow-sm ${
                                                            ipo.status === 'active'
                                                                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                                                                : ipo.dDayNum <= 3
                                                                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                                                : ipo.status === 'upcoming'
                                                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                                                : 'bg-white/5 text-gray-500 border-white/10'
                                                        }`}>
                                                            {ipo.statusLabel}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 핵심 공모 정보 그리드 */}
                                                <div className="bg-black/30 rounded-xl p-3 border border-white/5 grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-[10px] text-gray-500 font-bold block mb-0.5">📅 {ipoTab === 'kr' ? '청약 일정' : '상장/공모일'}</span>
                                                        <span className="font-mono font-bold text-gray-200 text-[11px] block truncate">
                                                            {ipo.dateDisplay}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-gray-500 font-bold block mb-0.5">💰 확정 공모가</span>
                                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                                            <span className={`font-mono font-black text-xs ${
                                                                isFixedPrice ? 'text-rose-400' : 'text-gray-400'
                                                            }`}>
                                                                {isFixedPrice ? (String(ipo.fixed_price).includes('$') ? ipo.fixed_price : `${ipo.fixed_price}원`) : '미정 (수요예측 대기)'}
                                                            </span>
                                                            {ipoTab === 'us' && krwFixedEstimate && (
                                                                <span className="text-[11px] font-bold text-emerald-400 font-sans">
                                                                    ({krwFixedEstimate})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {ipo.price_band && (
                                                        <div className="col-span-2 pt-1.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                                            <span className="text-gray-500">🎯 희망 공모가 밴드:</span>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-mono text-gray-300 font-bold">
                                                                    {String(ipo.price_band).includes('$') ? ipo.price_band : `${ipo.price_band}원`}
                                                                </span>
                                                                {ipoTab === 'us' && krwBandEstimate && (
                                                                    <span className="text-emerald-400 font-bold font-sans text-[11px]">
                                                                        ({krwBandEstimate})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 하단 액션 바 */}
                                                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                                                    <button
                                                        onClick={() => window.open(
                                                            ipoTab === 'kr'
                                                                ? `https://search.naver.com/search.naver?query=${encodeURIComponent(ipo.name + " 공모주")}`
                                                                : `https://finance.yahoo.com/quote/${ipo.symbol || ipo.name}`,
                                                            '_blank'
                                                        )}
                                                        className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 text-[11px] transition-colors"
                                                    >
                                                        공모 상세정보 <ExternalLink className="w-3 h-3" />
                                                    </button>

                                                    <button
                                                        onClick={() => toggleWatchIPO(ipo.name)}
                                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                                                            ipo.isWatched
                                                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                                                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {ipo.isWatched ? (
                                                            <>
                                                                <BellRing className="w-3.5 h-3.5 text-yellow-400" />
                                                                <span>알림 받는 중</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Bell className="w-3.5 h-3.5" />
                                                                <span>청약 알림 받기</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>        </div>
    );
}
