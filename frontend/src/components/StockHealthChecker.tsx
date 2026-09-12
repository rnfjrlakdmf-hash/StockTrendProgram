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
    ArrowUpRight,
    HelpCircle,
    ChevronDown,
    ChevronUp,
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

export default function StockHealthChecker({ initialTicker = "005930" }: { initialTicker?: string }) {
    const [searchQuery, setSearchQuery] = useState(initialTicker);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [healthData, setHealthData] = useState<StockHealthData | null>(null);
    const [copied, setCopied] = useState(false);
    const [expandedTip, setExpandedTip] = useState<string | null>(null);

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
    }, [initialTicker]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchHealthCheck(searchQuery);
    };

    const handleShare = () => {
        if (!healthData) return;
        const text = `[5대 안전벨트 종목 자가진단] ${healthData.stockName} (${healthData.ticker})\n총점: ${healthData.totalScore}/100점 (${healthData.grade.label})\n👉 나만의 종목 안전벨트 점검하기: ${window.location.href}`;
        if (navigator.clipboard) {
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

                    {/* 빠른 종목 검색창 */}
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
                        return (
                            <div className={`p-6 md:p-8 rounded-2xl border ${styles.ring} bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 relative overflow-hidden`}>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    {/* 좌측: 종목 기본 정보 & 등급 */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl md:text-3xl font-black text-white">
                                                {healthData.stockName}
                                            </h2>
                                            <span className="text-sm font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                                {healthData.ticker}
                                            </span>
                                            <span className={`text-xs px-2.5 py-1 rounded-full ${styles.badge}`}>
                                                {healthData.grade.level} 등급
                                            </span>
                                        </div>

                                        <p className="text-sm md:text-base font-semibold text-slate-200 flex items-center gap-2">
                                            <span>{healthData.grade.label}</span>
                                            <span className="text-xs font-normal text-slate-400">· {healthData.grade.summary}</span>
                                        </p>

                                        <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
                                            <span>현재 기준가: <strong className="text-white font-mono text-sm">{healthData.currentPrice.toLocaleString()}원</strong></span>
                                            {healthData.previousClose > 0 && (
                                                <span>
                                                    전일비: <strong className={healthData.currentPrice >= healthData.previousClose ? "text-rose-400 font-mono" : "text-blue-400 font-mono"}>
                                                        {healthData.currentPrice >= healthData.previousClose ? "+" : ""}
                                                        {(((healthData.currentPrice - healthData.previousClose) / healthData.previousClose) * 100).toFixed(2)}%
                                                    </strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 우측: 100점 만점 대형 스코어 */}
                                    <div className="flex items-center gap-5 self-end md:self-auto">
                                        <div className="text-right">
                                            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">5대 팩트 건전성 총점</div>
                                            <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                                                {healthData.totalScore}
                                                <span className="text-xl md:text-2xl text-slate-500 font-normal"> / 100</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleShare}
                                            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex flex-col items-center justify-center gap-1"
                                            title="진단 결과 복사/공유"
                                        >
                                            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
                                            <span className="text-[10px]">{copied ? "복사됨" : "공유"}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* 5대 안전벨트 상세 체크리스트 */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                5대 팩트 안전 점검표 (항목별 20점 만점)
                            </h3>
                            <span className="text-xs text-slate-400">
                                각 항목 카드를 누르면 초보자 가이드를 확인할 수 있습니다
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5">
                            {healthData.checklist.map((item) => {
                                const isExpanded = expandedTip === item.id;
                                const isPass = item.status === "pass";
                                const isWarn = item.status === "warn";

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-4 md:p-5 rounded-xl border transition-all duration-200 ${
                                            isPass
                                                ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/40"
                                                : isWarn
                                                ? "bg-amber-950/20 border-amber-900/40 hover:border-amber-500/40"
                                                : "bg-rose-950/20 border-rose-900/40 hover:border-rose-500/40"
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* 왼쪽: 질문 및 분석 내용 */}
                                            <div className="flex items-start gap-3.5 flex-1">
                                                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex-shrink-0 mt-0.5">
                                                    {renderChecklistIcon(item.icon, item.status)}
                                                </div>
                                                <div className="space-y-1">
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
                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 오른쪽: 점수 및 상세보기 버튼 */}
                                            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-800/60 flex-shrink-0 gap-2">
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-400 font-medium">배점</div>
                                                    <div className="text-lg font-black text-white font-mono">
                                                        {item.score} <span className="text-xs text-slate-500 font-normal">/ {item.maxScore}점</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedTip(isExpanded ? null : item.id)}
                                                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                                                >
                                                    <span>{isExpanded ? "닫기" : "왜 중요할까?"}</span>
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* 펼쳐지는 초보자 핵심 가이드 */}
                                        {isExpanded && (
                                            <div className="mt-4 pt-3 border-t border-slate-800/80 bg-slate-950/40 -mx-4 -mb-4 md:-mx-5 md:-mb-5 p-4 rounded-b-xl space-y-2 text-xs">
                                                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                                                    <HelpCircle className="w-3.5 h-3.5" />
                                                    초보자가 꼭 알아야 할 팩트 체크 원칙
                                                </div>
                                                {item.id === "earnings" && (
                                                    <p className="text-slate-300 leading-relaxed">
                                                        💡 <strong>영업이익이 계속 적자인 기업</strong>은 통장에 남은 돈이 바닥나면 <strong>유상증자(주주에게 돈 요구)</strong>나 전환사채(CB)를 찍어낼 확률이 매우 높습니다. 초보자일수록 최근 실적이 흑자를 지키고 있는 기업을 우선하는 것이 가장 안전한 안전벨트입니다.
                                                    </p>
                                                )}
                                                {item.id === "valuation" && (
                                                    <p className="text-slate-300 leading-relaxed">
                                                        💡 <strong>PER(주가수익비율)</strong>은 회사가 버는 이익 대비 주가가 몇 배인지, <strong>PBR(주가순자산비율)</strong>은 가진 재산 대비 몇 배인지를 뜻합니다. 아무리 좋은 기업도 지나치게 비싼 가격에 사면 긴 하락장 동안 버티기 어렵습니다.
                                                    </p>
                                                )}
                                                {item.id === "supply" && (
                                                    <p className="text-slate-300 leading-relaxed">
                                                        💡 <strong>시가총액이 너무 작은 종목(수백억 대)</strong>은 소수의 작전 세력이나 찌라시 리딩방에 의해 주가가 하루에도 수십%씩 출렁입니다. 최소 3천억~1조원 이상의 메이저 종목은 외국인과 기관의 풍부한 거래량이 있어 안전한 매매가 가능합니다.
                                                    </p>
                                                )}
                                                {item.id === "overheat" && (
                                                    <p className="text-slate-300 leading-relaxed">
                                                        💡 뉴스를 보고 종목을 살 때 이미 <strong>당일 10~20% 이상 급등한 상태</strong>라면 대부분 고점에 물리는 '상투'가 됩니다. 급등할 때 쫓아가지 않고, 호흡을 가다듬고 눌림목을 기다리는 습관이 계좌를 지킵니다.
                                                    </p>
                                                )}
                                                {item.id === "debt" && (
                                                    <p className="text-slate-300 leading-relaxed">
                                                        💡 <strong>부채비율이 200%를 넘는 기업</strong>은 요즘처럼 금리가 높은 시기에 막대한 금융 이자를 내느라 이익이 급감할 수 있습니다. 빚이 적고 자본이 탄탄한 회사는 금융 위기가 와도 끄떡없이 생존합니다.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
