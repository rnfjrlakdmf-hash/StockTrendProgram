"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Coins,
    Tag,
    Building2,
    TrendingUp,
    Info,
    Search,
    Share2,
    Check,
    Sparkles,
    RefreshCw
} from "lucide-react";

interface ChecklistItem {
    id: string;
    category: string;
    question: string;
    score: number;
    maxScore: number;
    status: "pass" | "warn" | "fail";
    headline: string;
    description: string;
    badge: string;
    icon: string;
    analogy?: string;
    dangerScenario?: string;
    facts?: {
        indicator: string;
        value: string;
        statusText: string;
        safeLine: string;
        dangerLine: string;
    };
}

interface StockHealthData {
    status: string;
    stockName: string;
    ticker: string;
    currentPrice: number;
    previousClose: number;
    totalScore: number;
    grade: {
        level: "S" | "A" | "B" | "C";
        label: string;
        color: string;
        summary: string;
    };
    checklist: ChecklistItem[];
    disclaimer: string;
    message?: string;
}

const PRESET_STOCKS = [
    { name: "삼성전자", ticker: "005930" },
    { name: "SK하이닉스", ticker: "000660" },
    { name: "현대차", ticker: "005380" },
    { name: "NAVER", ticker: "035420" },
    { name: "카카오", ticker: "035720" },
    { name: "LG에너지솔루션", ticker: "373220" },
];

export default function StockHealthChecker({ 
    initialTicker = "005930",
    hideSearchBar = false 
}: { 
    initialTicker?: string;
    hideSearchBar?: boolean;
}) {
    const [searchQuery, setSearchQuery] = useState(initialTicker);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [healthData, setHealthData] = useState<StockHealthData | null>(null);
    const [copied, setCopied] = useState(false);
    const [activeTabMap, setActiveTabMap] = useState<Record<string, "analogy" | "danger" | "facts">>({});

    const fetchHealthCheck = async (target: string) => {
        if (!target.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/stock-health/${encodeURIComponent(target.trim())}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "종목 정보를 불러올 수 없습니다. 종목명이나 코드를 확인해주세요.");
            }
            const data: StockHealthData = await res.json();
            if (data.status === "error") {
                throw new Error(data.message || "데이터를 분석할 수 없습니다.");
            }
            setHealthData(data);
        } catch (err: any) {
            setError(err.message || "일시적인 오류가 발생했습니다.");
            setHealthData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthCheck(initialTicker);
        setSearchQuery(initialTicker);
    }, [initialTicker]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchHealthCheck(searchQuery);
    };

    const handleShare = () => {
        if (!healthData) return;
        const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/safety?ticker=${healthData.ticker}` : '';
        const text = `[5대 안전벨트 종목 자가진단] ${healthData.stockName} (${healthData.ticker})\n총점: ${healthData.totalScore}/100점 (${healthData.grade.label})\n👉 나만의 종목 안전벨트 점검하기: ${currentUrl}`;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getGradeBadgeStyles = (level: string) => {
        switch (level) {
            case "S":
                return {
                    bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20",
                    scoreBg: "from-emerald-500 to-teal-400",
                    badge: "bg-emerald-500 text-slate-950 font-bold",
                    ring: "border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.25)]"
                };
            case "A":
                return {
                    bg: "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-blue-500/20",
                    scoreBg: "from-blue-500 to-cyan-400",
                    badge: "bg-blue-500 text-white font-bold",
                    ring: "border-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.25)]"
                };
            case "B":
                return {
                    bg: "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-amber-500/20",
                    scoreBg: "from-amber-500 to-yellow-400",
                    badge: "bg-amber-500 text-slate-950 font-bold",
                    ring: "border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                };
            default:
                return {
                    bg: "bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-rose-500/20",
                    scoreBg: "from-rose-500 to-red-400",
                    badge: "bg-rose-500 text-white font-bold",
                    ring: "border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.25)]"
                };
        }
    };

    const renderChecklistIcon = (iconName: string, status: string) => {
        const colorClass = status === "pass" ? "text-emerald-400" : status === "warn" ? "text-amber-400" : "text-rose-400";
        switch (iconName) {
            case "Coins": return <Coins className={`w-5 h-5 ${colorClass}`} />;
            case "Tag": return <Tag className={`w-5 h-5 ${colorClass}`} />;
            case "Building2": return <Building2 className={`w-5 h-5 ${colorClass}`} />;
            case "TrendingUp": return <TrendingUp className={`w-5 h-5 ${colorClass}`} />;
            default: return <ShieldCheck className={`w-5 h-5 ${colorClass}`} />;
        }
    };

    const getStatusIndicator = (status: string) => {
        switch (status) {
            case "pass":
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 통과 (+20)
                    </span>
                );
            case "warn":
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" /> 관찰/주의
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5" /> 경고 (0점)
                    </span>
                );
        }
    };

    const renderCircularGauge = (score: number, level: string) => {
        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (Math.min(score, 100) / 100) * circumference;
        const strokeColor = level === "S" ? "#10b981" : level === "A" ? "#3b82f6" : level === "B" ? "#f59e0b" : "#f43f5e";

        return (
            <div className="relative flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke="#1e293b"
                        strokeWidth="7"
                        fill="transparent"
                    />
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke={strokeColor}
                        strokeWidth="7"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={`${strokeDashoffset}`}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-white font-mono leading-none tracking-tight">{score}</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">/ 100점</span>
                </div>
            </div>
        );
    };

    const renderVisualRangeBar = (item: ChecklistItem) => {
        let pointerPercent = 50;
        if (item.id === "earnings") {
            pointerPercent = item.status === "pass" ? 20 : item.status === "warn" ? 55 : 85;
        } else if (item.id === "valuation") {
            pointerPercent = item.status === "pass" ? 22 : item.status === "warn" ? 60 : 88;
        } else if (item.id === "supply") {
            pointerPercent = item.status === "pass" ? 18 : item.status === "warn" ? 58 : 88;
        } else if (item.id === "overheat") {
            pointerPercent = item.status === "pass" ? 25 : item.status === "warn" ? 65 : 88;
        } else if (item.id === "debt") {
            pointerPercent = item.status === "pass" ? 20 : item.status === "warn" ? 55 : 90;
        }

        const pinColor = item.status === "pass" ? "bg-emerald-400 border-emerald-200" : item.status === "warn" ? "bg-amber-400 border-amber-200" : "bg-rose-500 border-rose-200";

        return (
            <div className="space-y-1.5 pt-2 pb-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">● 안전권</span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">● 주의/관찰</span>
                    <span className="flex items-center gap-1 text-rose-400 font-semibold">● 위험/경고</span>
                </div>
                <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/60 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-[40%]" />
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 w-[30%]" />
                    <div className="h-full bg-gradient-to-r from-rose-500 to-red-600 w-[30%]" />
                </div>
                <div className="relative h-4 w-full">
                    <div 
                        className="absolute -top-1.5 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
                        style={{ left: `${pointerPercent}%` }}
                    >
                        <div className={`w-3 h-3 rounded-full border-2 shadow-lg ${pinColor}`} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* 법적 컴플라이언스 상단 배너 */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400 gap-3">
                <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                        자본시장법 준수
                    </span>
                    <p className="line-clamp-1">
                        본 도구는 금융감독원 DART 및 KRX 공시 팩트를 바탕으로 한 <strong>투자자 자가 점검용 교육 도구</strong>입니다. (특정 종목 매수/매도 권유가 아닙니다)
                    </p>
                </div>
                <span className="hidden sm:inline-block text-[11px] text-slate-500 flex-shrink-0">
                    실시간 팩트 알고리즘
                </span>
            </div>

            {/* 메인 헤더 & 검색 섹션 */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800/90 via-slate-900/95 to-slate-950 border border-slate-700/60 p-6 md:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            초보자 안목 강화 · 5대 안전벨트
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            내 종목 매수 전 <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">5대 안전벨트 진단기</span>
                        </h1>
                        <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
                            초보자가 손실을 보는 90%의 원인은 <strong>적자 기업을 테마주로 사거나, 단기 꼭대기에서 충동 매수</strong>하기 때문입니다.
                            매수 버튼을 누르기 전 5가지 필수 팩트를 100점 만점으로 점검해 보세요.
                        </p>
                    </div>

                    {/* 빠른 종목 검색창 (hideSearchBar가 아닐 때만 노출) */}
                    {!hideSearchBar && (
                        <div className="w-full md:w-80 flex-shrink-0">
                            <form onSubmit={handleSearch} className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="종목명 또는 6자리 코드 입력..."
                                    className="w-full pl-10 pr-24 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition-all disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "진단하기"}
                                </button>
                            </form>

                            {/* 프리셋 추천 버튼 */}
                            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-slate-400 font-medium">인기:</span>
                                {PRESET_STOCKS.map((stock) => (
                                    <button
                                        key={stock.ticker}
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery(stock.name);
                                            fetchHealthCheck(stock.ticker);
                                        }}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                                    >
                                        {stock.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 에러 메시지 안내 */}
            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* 로딩 인디케이터 */}
            {loading && (
                <div className="py-20 flex flex-col items-center justify-center gap-3 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-slate-300">DART 공시 및 한국거래소 시세를 정밀 진단 중입니다...</p>
                    <span className="text-xs text-slate-500">실적 · 밸류에이션 · 시총 수급 · 단기 이격도 · 부채비율 계산 중</span>
                </div>
            )}

            {/* 진단 결과 카드 */}
            {!loading && healthData && (
                <div className="space-y-6">
                    {/* 상단 스코어 요약 카드 (Bento Style) */}
                    {(() => {
                        const styles = getGradeBadgeStyles(healthData.grade.level);
                        const passedCount = (healthData.checklist || []).filter(c => c.status === "pass").length;
                        return (
                            <div className={`p-6 md:p-8 rounded-2xl border ${styles.ring} bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 relative overflow-hidden shadow-2xl`}>
                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                    {/* 좌측: 종목 기본 정보 & 등급 & 5-Bar 미니 인디케이터 */}
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h2 className="text-2xl md:text-3xl font-black text-white">
                                                {healthData.stockName}
                                            </h2>
                                            <span className="text-sm font-mono px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                                                {healthData.ticker}
                                            </span>
                                            <span className={`text-xs px-3 py-1 rounded-full ${styles.badge} shadow-md`}>
                                                {healthData.grade.level} 등급
                                            </span>
                                            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                                                5대 안전벨트 {passedCount}/5 통과
                                            </span>
                                        </div>

                                        <p className="text-sm md:text-base font-semibold text-slate-200 flex items-center gap-2">
                                            <span>{healthData.grade.label}</span>
                                            <span className="text-xs font-normal text-slate-400">· {healthData.grade.summary}</span>
                                        </p>

                                        {/* 시세 및 5개 팩트 미니 바 */}
                                        <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <span>기준가:</span>
                                                <strong className="text-white font-mono text-sm">{healthData.currentPrice.toLocaleString()}원</strong>
                                                {healthData.previousClose > 0 && (
                                                    <span className={`font-mono font-bold ${healthData.currentPrice >= healthData.previousClose ? "text-rose-400" : "text-blue-400"}`}>
                                                        ({healthData.currentPrice >= healthData.previousClose ? "+" : ""}
                                                        {(((healthData.currentPrice - healthData.previousClose) / healthData.previousClose) * 100).toFixed(2)}%)
                                                    </span>
                                                )}
                                            </div>

                                            {/* 5대 안전벨트 점검 신호등 바 */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] text-slate-400 font-medium">안전벨트 상태:</span>
                                                <div className="flex items-center gap-1">
                                                    {(healthData.checklist || []).map((c) => (
                                                        <div
                                                            key={c.id}
                                                            title={`${c.category}: ${c.badge}`}
                                                            className={`w-3.5 h-2 rounded-sm transition-all ${
                                                                c.status === "pass"
                                                                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                                                                    : c.status === "warn"
                                                                    ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                                                                    : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 우측: 원형 다이얼 게이지 & 공유 버튼 */}
                                    <div className="flex items-center gap-4 self-end lg:self-auto bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                                        {renderCircularGauge(healthData.totalScore, healthData.grade.level)}

                                        <div className="flex flex-col items-center justify-between gap-2 pl-2">
                                            <button
                                                onClick={handleShare}
                                                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex flex-col items-center justify-center gap-1 shadow"
                                                title="진단 결과 복사/공유"
                                            >
                                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                                                <span className="text-[10px]">{copied ? "복사됨" : "공유"}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* 5대 안전벨트 상세 체크리스트 */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                5대 팩트 안전 점검표 (항목별 20점 만점)
                            </h3>
                            <span className="text-xs text-slate-400">
                                💡 탭을 눌러 [1초 비유], [어기면 생기는 위험], [공시 팩트]를 전환해보세요
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {(healthData.checklist || []).map((item) => {
                                const currentTab = activeTabMap[item.id] || "analogy";
                                const isPass = item.status === "pass";
                                const isWarn = item.status === "warn";

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-5 md:p-6 rounded-2xl border transition-all duration-200 shadow-lg space-y-4 ${
                                            isPass
                                                ? "bg-slate-900/90 border-slate-800 hover:border-emerald-500/40"
                                                : isWarn
                                                ? "bg-slate-900/90 border-amber-900/40 hover:border-amber-500/40"
                                                : "bg-slate-900/90 border-rose-900/40 hover:border-rose-500/40"
                                        }`}
                                    >
                                        {/* 헤더: 질문 + 상태 + 배점 */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex-shrink-0 mt-0.5">
                                                    {renderChecklistIcon(item.icon, item.status)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                                            {item.category}
                                                        </span>
                                                        <h4 className="text-sm md:text-base font-bold text-white">
                                                            {item.question}
                                                        </h4>
                                                        {getStatusIndicator(item.status)}
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-200 mt-1">
                                                        {item.headline}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 우측 배점 표시 */}
                                            <div className="flex items-center md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-slate-800/60 flex-shrink-0">
                                                <span className="text-[11px] text-slate-400 font-medium">안전 배점</span>
                                                <div className="text-lg font-black text-white font-mono">
                                                    {item.score} <span className="text-xs text-slate-500 font-normal">/ {item.maxScore}점</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 핵심 팩트 3단 매트릭스 박스 (디테일 정보량) */}
                                         {item.facts && (
                                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs">
                                                 <div className="space-y-1">
                                                     <div className="text-slate-400 flex items-center gap-1 font-medium">
                                                         <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                                         {item.facts.indicator}
                                                     </div>
                                                     <div className="font-bold text-white text-sm font-mono">
                                                         {item.facts.value}
                                                     </div>
                                                     <div className="text-[11px] text-slate-400 font-medium">
                                                         {item.facts.statusText}
                                                     </div>
                                                 </div>
                                                 <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-2 sm:pt-0 sm:pl-3">
                                                     <div className="text-emerald-400 flex items-center gap-1 font-semibold">
                                                         <CheckCircle2 className="w-3.5 h-3.5" />
                                                         안전 기준선
                                                     </div>
                                                     <div className="text-slate-200 leading-tight">
                                                         {item.facts.safeLine}
                                                     </div>
                                                 </div>
                                                 <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-2 sm:pt-0 sm:pl-3">
                                                     <div className="text-rose-400 flex items-center gap-1 font-semibold">
                                                         <AlertTriangle className="w-3.5 h-3.5" />
                                                         위험 경고선
                                                     </div>
                                                     <div className="text-slate-300 leading-tight">
                                                         {item.facts.dangerLine}
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                         {/* 시각적 레인지 게이지 바 */}
                                         {renderVisualRangeBar(item)}

                                         {/* 초보자 인터랙티브 3대 탭 (1초 비유 / 위험 시나리오 / 상세 해설) */}
                                         <div className="pt-2 border-t border-slate-800/70 space-y-2.5">
                                             {/* 탭 버튼들 */}
                                             <div className="flex items-center gap-1.5 flex-wrap">
                                                 <button
                                                     type="button"
                                                     onClick={() => setActiveTabMap(prev => ({ ...prev, [item.id]: "analogy" }))}
                                                     className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                                         currentTab === "analogy"
                                                             ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                                                             : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
                                                     }`}
                                                 >
                                                     <Sparkles className="w-3 h-3 text-emerald-400" />
                                                     💡 1초 핵심 비유
                                                 </button>

                                                 <button
                                                     type="button"
                                                     onClick={() => setActiveTabMap(prev => ({ ...prev, [item.id]: "danger" }))}
                                                     className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                                         currentTab === "danger"
                                                             ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                                                             : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
                                                     }`}
                                                 >
                                                     <AlertTriangle className="w-3 h-3 text-rose-400" />
                                                     ⚠️ 어기면 생기는 위험
                                                 </button>

                                                 <button
                                                     type="button"
                                                     onClick={() => setActiveTabMap(prev => ({ ...prev, [item.id]: "facts" }))}
                                                     className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                                         currentTab === "facts"
                                                             ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                                                             : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
                                                     }`}
                                                 >
                                                     <Info className="w-3 h-3 text-blue-400" />
                                                     📖 팩트 분석 해설
                                                 </button>
                                             </div>

                                            {/* 탭 내용 표시 영역 */}
                                            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs leading-relaxed transition-all">
                                                {currentTab === "analogy" && (
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-emerald-400 flex items-center gap-1">
                                                            <span>일상생활 비유로 쉽게 이해하기</span>
                                                        </div>
                                                        <p className="text-slate-300 font-medium">
                                                            {item.analogy || "핵심 지표 비유를 통해 쉽게 확인해 보세요."}
                                                        </p>
                                                    </div>
                                                )}

                                                {currentTab === "danger" && (
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-rose-400 flex items-center gap-1">
                                                            <span>초보자가 이 원칙을 무시했을 때 실제 겪는 위험</span>
                                                        </div>
                                                        <p className="text-slate-300 font-medium">
                                                            {item.dangerScenario || "무리한 매수로 인한 손실 위험에 주의해야 합니다."}
                                                        </p>
                                                    </div>
                                                )}

                                                {currentTab === "facts" && (
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-blue-400 flex items-center gap-1">
                                                            <span>DART 전자공시 및 시장 팩트 상세</span>
                                                        </div>
                                                        <p className="text-slate-300">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 하단: 초보자 종목 매수 전 5대 안전벨트 10초 핵심 요약 치트시트 */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/30 shadow-2xl space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white flex items-center gap-1.5">
                                    초보자 10초 매수 치트시트 (5대 안전벨트 핵심 가이드)
                                </h4>
                                <p className="text-xs text-slate-400">
                                    어떤 주식을 사더라도 아래 5가지 질문 중 4개 이상 통과하는 기업만 매매하는 습관이 계좌를 지킵니다.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                    🍗 1. 실적 흑자
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                    최근 분기 영업이익이 반드시 <strong>흑자</strong>인가? (적자 기업은 언제든 유상증자·CB 폭탄 위험)
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                    🏢 2. 거품 점검
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                    PER 35배 이하의 <strong>상식적인 가격대</strong>인가? (막연한 기대감 테마주는 거품 꺼지면 반토막)
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                    🚢 3. 수급 체급
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                    시가총액 <strong>3,000억원 이상</strong>인가? (수백억 원대 초소형주는 작전 세력의 설거지 놀이터)
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                    🏃 4. 상투 회피
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                    오늘 이미 10% 이상 <strong>폭등한 꼭대기</strong>가 아닌가? (숨찬 자리 쫓아가지 말고 눌림목 대기)
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                    💳 5. 빚더미 확인
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                    부채비율 <strong>120% 이하</strong>로 튼튼한가? (고금리 시대에 빚 많은 기업은 이자 폭탄으로 좌초)
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1 flex flex-col justify-center">
                                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                    🎯 골든 룰 (Golden Rule)
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                    위 5개 중 <strong className="text-emerald-400">최소 4개(80점 이상)</strong> 통과한 우량주만 매수해도 계좌 손실의 90%를 막을 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 법적 컴플라이언스 하단 상세 안내문 */}
                    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span>자본시장과 금융투자업에 관한 법률 제17조 준수 안내</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            {healthData.disclaimer}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
