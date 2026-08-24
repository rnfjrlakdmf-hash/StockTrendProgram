"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Activity, TrendingUp, TrendingDown, Layers, PieChart,
    BarChart2, ShieldAlert, AlertTriangle, Info, RefreshCw,
    ShieldCheck, BarChart3, Zap, ArrowRight
} from "lucide-react";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false }) as any;

// ─────────────────────────────────────────────
// Tooltip 컴포넌트
// ─────────────────────────────────────────────
const TermTooltip = ({ title, content }: { title: string; content: string }) => (
    <div className="relative group inline-flex items-center gap-1 cursor-help">
        <span className="text-gray-500 text-[11px] font-bold">{title}</span>
        <Info className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-gray-800 text-gray-200 text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 border border-gray-700 font-medium leading-relaxed text-left">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
    </div>
);

// ─────────────────────────────────────────────
// 면책 배너 (법적 준수)
// ─────────────────────────────────────────────
const DisclaimerBanner = () => (
    <div className="mb-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
            <p className="text-amber-300 text-xs font-black mb-0.5">투자 참고 정보 안내</p>
            <p className="text-amber-200/60 text-[11px] leading-relaxed font-medium">
                이 페이지의 모든 수치는 <strong className="text-amber-300">과거 시장 데이터 기반 통계 정보</strong>이며, 특정 상품의 매수·매도를 권유하거나 미래 수익을 보장하지 않습니다.
                미국 상장 ETF 가격은 현지 거래소 규정에 따라 <strong className="text-amber-300">최소 15분 지연</strong>됩니다. 모든 투자 결정은 투자자 본인의 판단과 책임 하에 이루어져야 합니다.
            </p>
        </div>
    </div>
);

// ─────────────────────────────────────────────
// 52주 위치 바
// ─────────────────────────────────────────────
const PricePositionBar = ({ pct, high, low, currency }: { pct: number; high: number; low: number; currency: string }) => {
    const clamp = Math.max(0, Math.min(100, pct));
    const isUsd = currency === "USD";
    const fmt = (v: number) => isUsd ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${v.toLocaleString()}원`;
    return (
        <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-3">
                <TermTooltip title="52주 가격 위치" content="현재가가 지난 52주(1년) 최저가~최고가 범위의 어느 위치에 있는지 나타냅니다. 0%는 최저가 근처, 100%는 최고가 근처입니다. 매수·매도 신호가 아닌 순수 통계 위치 지표입니다." />
                <span className="text-white font-black text-base font-mono">{clamp.toFixed(1)}%</span>
            </div>
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden mb-2 shadow-inner">
                <div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-700"
                    style={{ width: `${clamp}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-indigo-400 shadow-md transition-all duration-700"
                    style={{ left: `calc(${clamp}% - 7px)` }}
                />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 font-bold mt-1 font-mono">
                <span>52주 최저 <strong className="text-blue-400">{fmt(low)}</strong></span>
                <span>52주 최고 <strong className="text-rose-400">{fmt(high)}</strong></span>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// 수익률 막대 차트 (단기~장기)
// ─────────────────────────────────────────────
const PerformanceBars = ({ performance }: { performance: Record<string, string> }) => {
    const entries = Object.entries(performance);
    if (entries.length === 0) return <div className="py-10 text-center text-gray-500 text-sm font-bold">수익률 정보가 없습니다.</div>;
    const max = entries.reduce((m, [, v]) => Math.max(m, Math.abs(parseFloat(v) || 0)), 0.1);
    return (
        <div className="space-y-4">
            {entries.map(([period, val]) => {
                const num = parseFloat(String(val).replace('%', '')) || 0;
                const isPos = num >= 0;
                const barW = Math.min(Math.abs(num) / max * 100, 100);
                return (
                    <div key={period}>
                        <div className="flex justify-between mb-1.5">
                            <span className="text-gray-400 text-xs font-bold">{period}</span>
                            <span className={`text-sm font-black font-mono ${isPos ? 'text-rose-400' : 'text-blue-400'}`}>
                                {isPos ? '▲' : '▼'} {Math.abs(num).toFixed(2)}%
                            </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${isPos ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-blue-700 to-blue-400'}`}
                                style={{ width: `${barW}%` }}
                            />
                        </div>
                    </div>
                );
            })}
            <p className="text-[10px] text-gray-500 font-bold pt-1">※ 과거 수익률이 미래 성과를 보장하지 않습니다.</p>
        </div>
    );
};

// ─────────────────────────────────────────────
// 리스크 지표 패널
// ─────────────────────────────────────────────
const RiskPanel = ({ risk }: { risk: any }) => {
    const items = [
        {
            label: "연환산 변동성",
            value: risk?.volatility ?? "N/A",
            tooltip: "과거 1년 일간 수익률의 연환산 표준편차입니다. 값이 클수록 가격 변동폭이 컸음을 의미합니다. 매수·매도 신호가 아닌 순수 변동성 통계입니다.",
            color: "text-amber-400",
        },
        {
            label: "최대낙폭 (MDD)",
            value: risk?.mdd ?? "N/A",
            tooltip: "과거 데이터 기간 내 최고점 대비 최대 하락폭입니다. 미래 하락을 예측하는 지표가 아닌 과거 통계치입니다.",
            color: "text-rose-400",
        },
        {
            label: "샤프 비율",
            value: risk?.sharpe ?? "N/A",
            tooltip: "무위험 수익률(연 3.5%) 대비 초과 수익의 변동성 효율을 나타냅니다. 과거 데이터 기반 통계이며 미래 수익을 보장하지 않습니다.",
            color: "text-emerald-400",
        },
        {
            label: "30일 평균 거래량",
            value: risk?.avg_volume_30d ?? "N/A",
            tooltip: "최근 30거래일 평균 거래 수량입니다. 유동성 참고 지표로, 거래량이 많을수록 매매가 수월합니다.",
            color: "text-blue-400",
        },
    ];
    return (
        <div className="grid grid-cols-2 gap-3">
            {items.map(item => (
                <div key={item.label} className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 flex flex-col justify-between">
                    <div className="mb-2">
                        <TermTooltip title={item.label} content={item.tooltip} />
                    </div>
                    <p className={`text-lg font-black font-mono ${item.color}`}>{item.value}</p>
                </div>
            ))}
            <p className="col-span-2 text-[10px] text-gray-500 font-bold">※ 모든 수치는 과거 데이터 기반 통계치이며 미래 성과를 보장하지 않습니다.</p>
        </div>
    );
};

// ─────────────────────────────────────────────
// 유사 ETF 비교 카드
// ─────────────────────────────────────────────
const PeerCompareCard = ({ peer, onClick }: { peer: any; onClick: () => void }) => (
    <button
        onClick={onClick}
        className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-indigo-500/40 transition-all text-left group w-full"
    >
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-indigo-300 text-sm font-mono">{peer?.symbol}</span>
                {peer?.ter && <span className="text-[10px] bg-zinc-800 text-gray-400 px-2 py-0.5 rounded font-bold border border-white/5">TER {peer.ter}</span>}
            </div>
            <p className="text-xs text-gray-300 font-bold truncate">{peer?.name}</p>
            {(peer?.dividend_yield || peer?.perf_1y) && (
                <div className="flex gap-3 mt-1.5">
                    {peer?.dividend_yield && (
                        <span className="text-[10px] text-emerald-400 font-black">배당 {peer.dividend_yield}</span>
                    )}
                    {peer?.perf_1y && (
                        <span className={`text-[10px] font-black font-mono ${String(peer.perf_1y).includes('-') ? 'text-blue-400' : 'text-rose-400'}`}>
                            1Y {peer.perf_1y}
                        </span>
                    )}
                </div>
            )}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors shrink-0 ml-2" />
    </button>
);

// ─────────────────────────────────────────────
// 메인 컨텐츠
// ─────────────────────────────────────────────
function EtfAnalysisContent() {
    const searchParams = useSearchParams();
    const urlSymbol = searchParams.get("symbol");

    const [symbol, setSymbol] = useState("");
    const [chartRange, setChartRange] = useState("1Y");
    const [loading, setLoading] = useState(false);
    const [etfData, setEtfData] = useState<any>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    const isUs = etfData?.symbol ? !/^\d[0-9A-Za-z]{5}$/.test(etfData.symbol) : false;
    const exRate = etfData?.exchange_rate || 1350;

    const renderCurrency = (val: string | number | undefined) => {
        if (!val || val === "N/A") return isUs ? "$0.00" : "0원";
        const strVal = String(val).replace(/[+\-]/g, "").replace(/원/g, "").replace(/,/g, "").replace(/\$/g, "");
        const numVal = parseFloat(strVal);
        if (isNaN(numVal)) return String(val);
        if (isUs) {
            const krwVal = Math.round(numVal * exRate);
            return `$${numVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${krwVal.toLocaleString()}원)`;
        }
        return `${numVal.toLocaleString()}원`;
    };

    const formatRichAUM = (val: string | number) => {
        if (!val || val === "N/A") return "N/A";
        const strVal = String(val);
        if (isUs) {
            const numStr = strVal.replace(/[^0-9.]/g, "");
            let baseNum = parseFloat(numStr);
            if (isNaN(baseNum)) return strVal;
            let krwLabel = "";
            if (strVal.includes("B")) {
                const uk = Math.round(baseNum * exRate * 0.01);
                const jo = Math.floor(uk / 10000);
                krwLabel = jo > 0 ? `약 ${jo}조 ${(uk % 10000).toLocaleString()}억 원` : `약 ${uk.toLocaleString()}억 원`;
            } else if (strVal.includes("M")) {
                const uk = Math.round((baseNum / 1000) * exRate * 0.01);
                krwLabel = `약 ${uk.toLocaleString()}억 원`;
            } else {
                const total = baseNum * exRate;
                const jo = Math.floor(total / 1e12);
                const uk = Math.floor((total % 1e12) / 1e8);
                krwLabel = jo > 0 ? `약 ${jo}조 ${uk > 0 ? uk.toLocaleString() + "억 " : ""}원` : uk > 0 ? `약 ${uk.toLocaleString()}억 원` : `약 ${Math.round(total).toLocaleString()}원`;
            }
            return krwLabel ? `${strVal} (${krwLabel})` : strVal;
        }
        const numStr = strVal.replace(/[^0-9]/g, "");
        if (!numStr) return strVal;
        const num = parseInt(numStr);
        if (num >= 10000) return `${Math.floor(num / 10000)}조 ${(num % 10000).toLocaleString()}억 원`;
        return `${num.toLocaleString()}억 원`;
    };

    const getFilteredChartData = () => {
        if (!etfData?.chart_data || !Array.isArray(etfData.chart_data)) return [];
        const data = etfData.chart_data;
        if (chartRange === "1M") return data.slice(-20);
        if (chartRange === "3M") return data.slice(-60);
        if (chartRange === "6M") return data.slice(-120);
        return data;
    };
    const filteredChartData = getFilteredChartData();

    useEffect(() => {
        if (urlSymbol) { setSymbol(urlSymbol); fetchEtfDetail(urlSymbol); }
    }, [urlSymbol]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh && urlSymbol && !loading && !etfData?.error) {
            interval = setInterval(() => fetchEtfDetail(urlSymbol, true), 10000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, urlSymbol, loading, etfData]);

    useEffect(() => {
        if (!symbol) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(symbol)}`);
                const json = await res.json();
                if (json.status === "success") setSearchResults(json.data);
            } catch {}
        }, 200);
        return () => clearTimeout(timer);
    }, [symbol]);

    const ETF_CACHE: Record<string, { data: any; timestamp: number }> = useMemo(() => ({}), []);

    const prefetchEtf = async (sym: string) => {
        const t = sym.toUpperCase();
        if (ETF_CACHE[t]) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/etf-detail/${t}?t=${Date.now()}`);
            const json = await res.json();
            if (json.status === "success" && json.data) ETF_CACHE[t] = { data: json.data, timestamp: Date.now() };
        } catch {}
    };

    const fetchEtfDetail = async (sym: string, isBackground = false) => {
        if (!sym) return;
        const ticker = sym.toUpperCase();
        if (!isBackground && ETF_CACHE[ticker]) {
            setEtfData(ETF_CACHE[ticker].data);
            setLoading(false);
            fetch(`${API_BASE_URL}/api/market/etf-detail/${ticker}?t=${Date.now()}`)
                .then(r => r.json())
                .then(json => { if (json.status === "success") { ETF_CACHE[ticker] = { data: json.data, timestamp: Date.now() }; setEtfData(json.data); } });
            return;
        }
        if (!isBackground) { setLoading(true); setEtfData(null); }
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/etf-detail/${ticker}?t=${Date.now()}`);
            const json = await res.json();
            if (json.status === "success") {
                if (!isBackground) ETF_CACHE[ticker] = { data: json.data, timestamp: Date.now() };
                setEtfData(json.data);
            } else if (!isBackground) {
                setEtfData({ error: json.message || "Failed to load ETF details" });
            }
        } catch (e) {
            if (!isBackground) setEtfData({ error: "Network error fetching ETF data." });
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // 섹터 도넛 차트 옵션
    const sectorChartOptions = useMemo(() => {
        const sw = etfData?.sector_weights || [];
        return {
            options: {
                chart: { type: "donut", background: "transparent" },
                labels: sw.map((s: any) => s.name),
                colors: ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"],
                plotOptions: { pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "섹터 수", color: "#9ca3af", fontSize: "11px", fontWeight: "700" } } } } },
                legend: { position: "bottom" as const, labels: { colors: "#9ca3af" }, fontSize: "11px", fontWeight: "700" },
                dataLabels: { enabled: false },
                tooltip: { y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
                theme: { mode: "dark" as const },
                stroke: { width: 0 },
            },
            series: sw.map((s: any) => s.value),
        };
    }, [etfData?.sector_weights]);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-24 pb-20">

                {/* ── 헤더 ── */}
                <div className="mb-10">
                    <div className="flex items-baseline justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                ETF 펀더멘탈 분석
                                <span className="text-[10px] bg-indigo-600 px-2 py-1 rounded tracking-widest font-bold align-middle">ETF ONLY</span>
                            </h1>
                            <p className="text-gray-400 font-bold mt-1.5 text-sm">수익률 추이 · 리스크 지표 · 구성 섹터 · 유사 상품 비교</p>
                        </div>
                    </div>

                    {/* 검색 바 & 빠른 종목 프리셋 */}
                    <div className="space-y-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1 group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Activity className="w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={symbol}
                                    onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setShowResults(true); }}
                                    onFocus={() => setShowResults(true)}
                                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                    onKeyDown={(e) => e.key === "Enter" && fetchEtfDetail(symbol)}
                                    placeholder="ETF 종목코드 또는 종목명 입력 (예: 069500, 252670, SPY, QQQ, SCHD)"
                                    className="w-full bg-zinc-900/90 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500/60 focus:bg-zinc-900 transition-all font-bold placeholder-gray-500 shadow-inner"
                                />
                                {showResults && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl">
                                        {searchResults.map((item: any, idx: number) => (
                                            <div
                                                key={idx}
                                                onMouseEnter={() => prefetchEtf(item.symbol)}
                                                onClick={() => { setSymbol(item.symbol); setShowResults(false); fetchEtfDetail(item.symbol); }}
                                                className="px-4 py-3.5 hover:bg-white/5 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-sm">{item.name}</span>
                                                    <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{item.symbol}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => fetchEtfDetail(symbol)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all whitespace-nowrap shadow-lg shadow-blue-600/20 active:scale-95">
                                ETF 분석
                            </button>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-xs font-black tracking-wider transition-all ${autoRefresh ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-zinc-900 text-gray-400 border border-white/10 hover:bg-white/5"}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-gray-600"}`} />
                                {autoRefresh ? "실시간 갱신 ON" : "자동갱신 OFF"}
                            </button>
                        </div>

                        {/* 인기 ETF 빠른 검색 태그 */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                            <span className="text-gray-500 font-black shrink-0">인기 ETF:</span>
                            {[
                                { sym: "069500", name: "KODEX 200" },
                                { sym: "252670", name: "KODEX 인버스2X" },
                                { sym: "305540", name: "TIGER 2차전지" },
                                { sym: "091160", name: "KODEX 반도체" },
                                { sym: "379800", name: "KODEX 미국나스닥100" },
                                { sym: "SPY", name: "S&P 500 (SPY)" },
                                { sym: "QQQ", name: "나스닥 100 (QQQ)" },
                                { sym: "SCHD", name: "미국배당다우 (SCHD)" },
                                { sym: "SOXX", name: "미국반도체 (SOXX)" },
                                { sym: "TQQQ", name: "나스닥 3X (TQQQ)" },
                            ].map(item => (
                                <button
                                    key={item.sym}
                                    onMouseEnter={() => prefetchEtf(item.sym)}
                                    onClick={() => { setSymbol(item.sym); fetchEtfDetail(item.sym); }}
                                    className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 font-bold ${
                                        symbol === item.sym
                                            ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                                            : "bg-zinc-900/60 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                    #{item.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── 콘텐츠 영역 ── */}
                <div className="min-h-[500px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                            <p className="text-blue-400/80 font-bold text-sm tracking-widest">ETF 상세 펀더멘탈 데이터를 정밀 분석 중입니다...</p>
                        </div>
                    ) : etfData && !etfData.error ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

                            {/* 면책 배너 */}
                            <DisclaimerBanner />

                            {/* ─ 헤더 카드 (종목 요약 & 실시간 시세) ─ */}
                            <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-tr from-zinc-900 via-zinc-900 to-blue-950/30 border border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-6 shadow-2xl">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-blue-400 font-mono font-black tracking-wider text-xs md:text-sm bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                                            {etfData.symbol}
                                        </span>
                                        <span className="text-gray-300 bg-zinc-800 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-white/5">
                                            {etfData.basic_info?.amc || "자산운용사"}
                                        </span>
                                        {(() => {
                                            const name = etfData.name || "";
                                            let badgeText = "패시브 인덱스";
                                            let badgeColor = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                                            if (name.includes("2X") || name.includes("인버스") || name.includes("레버리지") || name.includes("3X")) {
                                                badgeText = "레버리지/인버스 (고위험)";
                                                badgeColor = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                                            } else if (name.includes("배당") || name.includes("인컴") || name.includes("커버드콜")) {
                                                badgeText = "고배당 / 인컴형";
                                                badgeColor = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                                            } else if (name.includes("반도체") || name.includes("2차전지") || name.includes("바이오") || name.includes("AI")) {
                                                badgeText = "섹터 / 테마형";
                                                badgeColor = "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
                                            }
                                            return (
                                                <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold border ${badgeColor}`}>
                                                    {badgeText}
                                                </span>
                                            );
                                        })()}
                                        {isUs && <span className="text-[11px] bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-lg font-bold">US Market</span>}
                                    </div>
                                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white mb-3 leading-tight">
                                        {etfData.name}
                                    </h2>
                                    {etfData.market_data && (
                                        <div className="flex flex-wrap items-baseline gap-3">
                                            <span className="text-3xl md:text-4xl font-black text-white font-mono">
                                                {renderCurrency(etfData.market_data.price)}
                                            </span>
                                            <span className={`text-base md:text-lg font-bold font-mono flex items-center gap-1 px-2.5 py-0.5 rounded-xl ${
                                                parseFloat(etfData.market_data.change_percent) >= 0 
                                                    ? "bg-rose-500/15 text-rose-300 border border-rose-500/20" 
                                                    : "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                                            }`}>
                                                {parseFloat(etfData.market_data.change_percent) >= 0 ? "▲" : "▼"} {renderCurrency(etfData.market_data.change)} ({etfData.market_data.change_percent}%)
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* AUM 순자산총액 박스 */}
                                <div className="bg-zinc-900/90 p-5 rounded-2xl border border-white/10 text-left md:text-right shrink-0 shadow-lg">
                                    <div className="mb-1 flex justify-start md:justify-end">
                                        <TermTooltip title="순자산총액 (AUM)" content="이 ETF가 운용하고 있는 전체 자산 규모입니다. 규모가 클수록 상장폐지 위험이 낮고 풍부한 유동성으로 거래가 원활합니다." />
                                    </div>
                                    <p className="text-xl md:text-2xl font-black text-white font-mono">
                                        {formatRichAUM(etfData.basic_info?.aum)}
                                    </p>
                                </div>
                            </div>

                            {/* ─ 스냅샷 6개 (2x3 또는 3x2 균형 그리드) ─ */}
                            {etfData.market_data && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {/* 1. NAV */}
                                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-sm flex flex-col justify-between">
                                        <TermTooltip title="순자산가치 (NAV)" content="ETF가 보유한 실제 자산의 1주당 본질 가치입니다. 시장가와 비교하여 저평가/고평가 여부를 확인합니다." />
                                        <p className="text-sm md:text-base font-black text-white mt-2 font-mono">
                                            {renderCurrency(etfData.market_data.nav)}
                                        </p>
                                    </div>

                                    {/* 2. 괴리율 */}
                                    <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
                                        Math.abs(parseFloat(String(etfData.market_data.disparity).replace('%','')) || 0) > 1.0
                                            ? 'bg-rose-950/20 border-rose-500/40'
                                            : 'bg-zinc-900/80 border-white/10'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <TermTooltip title="괴리율 (Disparity)" content="시장가격과 실제 순자산가치(NAV) 간의 차이 비율입니다. 0%에 가까울수록 정상적이며, ±1% 이상 벌어지면 매매 시 주의가 필요합니다." />
                                            {Math.abs(parseFloat(String(etfData.market_data.disparity).replace('%','')) || 0) <= 0.5 && (
                                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold">정상</span>
                                            )}
                                        </div>
                                        <p className={`text-sm md:text-base font-black mt-2 font-mono ${
                                            String(etfData.market_data.disparity).includes("+") 
                                                ? "text-rose-400" 
                                                : String(etfData.market_data.disparity).includes("-") 
                                                    ? "text-blue-400" 
                                                    : "text-white"
                                        }`}>
                                            {etfData.market_data.disparity || "0.00%"}
                                        </p>
                                    </div>

                                    {/* 3. 일일 거래대금 */}
                                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-sm flex flex-col justify-between">
                                        <TermTooltip title="일일 거래대금" content="오늘 하루 동안 시장에서 거래된 총 거래 금액입니다. 거래대금이 클수록 원하는 가격에 즉시 체결되기 유리합니다." />
                                        <p className="text-sm md:text-base font-black text-amber-300 mt-2 font-mono truncate">
                                            {etfData.market_data.trading_value 
                                                ? (etfData.market_data.trading_value.includes("억") || etfData.market_data.trading_value.includes("조") 
                                                    ? etfData.market_data.trading_value 
                                                    : `${etfData.market_data.trading_value}원`)
                                                : "실시간 집계중"}
                                        </p>
                                    </div>

                                    {/* 4. 일일 거래량 */}
                                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-sm flex flex-col justify-between">
                                        <TermTooltip title="일일 거래량 (Volume)" content="오늘 시장에서 체결된 총 주식 수량입니다." />
                                        <p className="text-sm md:text-base font-black text-white mt-2 font-mono truncate">
                                            {etfData.market_data.volume 
                                                ? (typeof etfData.market_data.volume === 'number' 
                                                    ? `${etfData.market_data.volume.toLocaleString()}주` 
                                                    : `${etfData.market_data.volume}주`)
                                                : "0주"}
                                        </p>
                                    </div>

                                    {/* 5. 52주 최고가 */}
                                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-sm flex flex-col justify-between">
                                        <p className="text-gray-400 text-[11px] font-bold">52주 최고가</p>
                                        <p className="text-sm md:text-base font-black text-rose-400 mt-2 font-mono">
                                            {renderCurrency(etfData.market_data.high52w)}
                                        </p>
                                    </div>

                                    {/* 6. 52주 최저가 */}
                                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-sm flex flex-col justify-between">
                                        <p className="text-gray-400 text-[11px] font-bold">52주 최저가</p>
                                        <p className="text-sm md:text-base font-black text-blue-400 mt-2 font-mono">
                                            {renderCurrency(etfData.market_data.low52w)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ─ 기본 펀드 명세 4칸 ─ */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { tip: ["총보수 (TER)", "매년 자산에서 차감되는 펀드 운용 비용입니다. 동일 지수 추종 시 보수가 낮을수록 유리합니다."], val: etfData.basic_info?.ter || "N/A", color: "text-white" },
                                    { tip: ["분배율 / 배당수익률", "연간 주주에게 지급되는 현금 분배금 비율입니다. 과거 배당 통계이며 미래 지급을 보장하지 않습니다."], val: etfData.basic_info?.dividend_yield || "0.00%", color: "text-emerald-400" },
                                    { label: "상장일", val: (() => { const d = etfData.basic_info?.launch_date; if (!d || d === "N/A" || d === "알 수 없음") return "N/A"; try { const dt = new Date(d); if (isNaN(dt.getTime())) return d; return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`; } catch { return d; } })(), color: "text-gray-300" },
                                    { label: "추종 기초지수", val: etfData.basic_info?.index || "N/A", color: "text-gray-300 text-xs leading-tight" },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 md:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 text-center flex flex-col items-center justify-center gap-1.5">
                                        {item.tip ? <TermTooltip title={item.tip[0]} content={item.tip[1]} /> : <p className="text-gray-400 text-[11px] font-bold">{item.label}</p>}
                                        <p className={`font-black font-mono text-sm md:text-base ${item.color}`}>{item.val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ─ 52주 가격 위치 바 ─ */}
                            {etfData.risk_stats?.position_pct != null && (
                                <PricePositionBar
                                    pct={etfData.risk_stats.position_pct}
                                    high={etfData.risk_stats.high52}
                                    low={etfData.risk_stats.low52}
                                    currency={isUs ? "USD" : "KRW"}
                                />
                            )}

                            {/* ─ 💡 ETF 펀더멘탈 핵심 진단 브리핑 카드 ─ */}
                            <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-blue-950/30 via-zinc-900/60 to-indigo-950/30 border border-blue-500/20 backdrop-blur-md shadow-lg">
                                <h3 className="text-blue-300 font-bold mb-3 flex items-center gap-2 text-sm md:text-base">
                                    <span className="text-lg">💡</span> ETF 펀더멘탈 핵심 진단 요약 (Quant Briefing)
                                </h3>
                                <ul className="space-y-2 text-gray-200 text-xs md:text-sm leading-relaxed">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                        <span>
                                            <strong>기초지수 추종:</strong> 본 상품은 <strong>[{etfData.basic_info?.index || etfData.name}]</strong> 지수를 추종하며, 
                                            순자산총액(AUM)은 <strong>{formatRichAUM(etfData.basic_info?.aum)}</strong> 규모입니다.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                        <span>
                                            <strong>비용 및 배당성:</strong> 연간 총보수는 <strong>{etfData.basic_info?.ter || '0.00%'}</strong>이며, 
                                            최근 분배율은 <strong>{etfData.basic_info?.dividend_yield || '0.00%'}</strong> 수준으로 운용되고 있습니다.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                        <span>
                                            <strong>유동성 및 괴리율:</strong> 현재 괴리율은 <strong>{etfData.market_data.disparity || '0.00%'}</strong>로 
                                            {Math.abs(parseFloat(String(etfData.market_data.disparity).replace('%','')) || 0) <= 0.5 
                                                ? " NAV(순자산가치)와 매우 안정적으로 연동되어 호가 왜곡 없이 정상 매매가 가능합니다." 
                                                : " NAV 대비 다소 벌어져 있으므로 장중 호가 스프레드를 확인 후 분할 매매를 권장합니다."}
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* ─ 메인 그리드 ─ */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* 수익률 퍼포먼스 */}
                                <div className="p-5 md:p-7 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-lg">
                                    <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2">
                                        <BarChart2 className="w-5 h-5 text-emerald-400" />
                                        기간별 수익률 통계
                                    </h3>
                                    <PerformanceBars performance={etfData.performance || {}} />
                                </div>

                                {/* 리스크 지표 */}
                                <div className="p-5 md:p-7 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-lg">
                                    <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-amber-400" />
                                        리스크 통계 지표
                                    </h3>
                                    <RiskPanel risk={etfData.risk_stats} />
                                </div>

                                {/* 구성 종목 / 섹터 도넛 */}
                                {(etfData.holdings?.length > 0 || etfData.sector_weights?.length > 0) && (
                                    <div className="p-5 md:p-7 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-lg">
                                        <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2">
                                            <PieChart className="w-5 h-5 text-indigo-400" />
                                            {etfData.holdings?.length > 0 ? "구성 종목 (CU Top 10)" : "섹터별 구성 비중"}
                                        </h3>

                                    {/* 섹터 도넛 차트 (미국 ETF) */}
                                    {etfData.sector_weights?.length > 0 && (
                                        <div className="mb-4">
                                            <ReactApexChart
                                                key="sector-donut"
                                                options={sectorChartOptions.options}
                                                series={sectorChartOptions.series}
                                                type="donut"
                                                height={260}
                                            />
                                            <p className="text-[10px] text-gray-500 font-bold text-center mt-1">※ 섹터 구성비는 참고 통계이며 수시로 변경될 수 있습니다.</p>
                                        </div>
                                    )}

                                    {/* 구성 종목 테이블 */}
                                    {Array.isArray(etfData.holdings) && etfData.holdings.length > 0 && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-gray-400 text-xs tracking-widest">
                                                        <th className="pb-3 font-bold">순위</th>
                                                        <th className="pb-3 font-bold">종목명</th>
                                                        <th className="pb-3 font-bold text-right">비중</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {etfData.holdings.map((h: any, i: number) => {
                                                        const wNum = parseFloat(String(h?.weight || "0").replace("%", "")) || 0;
                                                        return (
                                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                                <td className="py-3 text-xs font-bold text-gray-500 w-10 font-mono">{i + 1}</td>
                                                                <td className="py-3 font-black text-gray-200">
                                                                    <div className="mb-1 text-sm">{h?.name || "N/A"}</div>
                                                                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" style={{ width: `${Math.min(wNum || (100 - i * 7), 100)}%` }} />
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 text-sm font-black text-indigo-400 text-right font-mono">
                                                                    {wNum > 0 ? (String(h.weight).includes("%") ? h.weight : `${h.weight}%`) : <span className="text-gray-600 text-[11px] italic">수집중</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                )}

                                {/* 유사 ETF 비교 카드 */}
                                <div className={`p-5 md:p-7 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-lg ${!(etfData.holdings?.length > 0 || etfData.sector_weights?.length > 0) ? "lg:col-span-2" : ""}`}>
                                    <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-blue-400" />
                                        유사 ETF 참고 목록
                                    </h3>
                                    <p className="text-gray-400 text-xs font-bold mb-5">동일 유형의 상품을 수치로만 나열한 참고 정보입니다. 특정 상품을 추천하지 않습니다.</p>
                                    {Array.isArray(etfData.similar_etfs) && etfData.similar_etfs.length > 0 ? (
                                        <div className="space-y-2">
                                            {etfData.similar_etfs.map((peer: any, idx: number) => (
                                                <PeerCompareCard
                                                    key={idx}
                                                    peer={peer}
                                                    onClick={() => { if (peer?.symbol) { setSymbol(peer.symbol); fetchEtfDetail(peer.symbol); } }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-gray-500 text-xs font-bold">비교 가능한 유사 상품 정보가 없습니다.</div>
                                    )}
                                </div>
                            </div>

                            {/* ─ 차트 ─ */}
                            {etfData.chart_data?.length > 0 && (
                                <div className="p-5 md:p-8 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-lg">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                                        <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-blue-400" />
                                            가격 추이 / 이동평균선
                                        </h3>
                                        <div className="flex gap-1.5 bg-zinc-800 p-1 rounded-xl w-full sm:w-auto border border-white/5">
                                            {["1M", "3M", "6M", "1Y"].map(r => (
                                                <button key={r} onClick={() => setChartRange(r)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${chartRange === r ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "text-gray-400 hover:text-white"}`}>{r}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-[300px] md:h-[420px] w-full">
                                        <ReactApexChart
                                            key={chartRange}
                                            options={{
                                                chart: { type: "line", background: "transparent", toolbar: { show: false }, animations: { enabled: false } },
                                                stroke: { width: [1, 2, 2, 2, 2], curve: "smooth" as const },
                                                colors: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"],
                                                plotOptions: { candlestick: { colors: { upward: "#ef4444", downward: "#3b82f6" } } },
                                                xaxis: {
                                                    type: "datetime",
                                                    labels: {
                                                        datetimeUTC: false,
                                                        style: { colors: "#9ca3af" },
                                                        datetimeFormatter: { year: "yyyy년", month: "yyyy.MM", day: "MM.dd" }
                                                    },
                                                    axisBorder: { show: false }, axisTicks: { show: false }
                                                },
                                                yaxis: {
                                                    tooltip: { enabled: true },
                                                    labels: { style: { colors: "#9ca3af" }, formatter: (v: number) => isUs ? `$${v.toLocaleString()}` : `${v.toLocaleString()}원` }
                                                },
                                                tooltip: {
                                                    shared: true,
                                                    x: { format: "yyyy년 MM월 dd일" },
                                                    y: { formatter: (v: number) => Math.round(v || 0).toLocaleString() },
                                                    custom: function ({ dataPointIndex }: any) {
                                                        const item = filteredChartData[dataPointIndex];
                                                        if (!item) return "";
                                                        const [yyyy, mm, dd] = item.date.split("-");
                                                        const fmt = (v: number | null) => v == null ? "-" : isUs ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `${Math.round(v).toLocaleString()}`;
                                                        return `<div class="bg-gray-900/95 border border-gray-700/50 p-3 rounded-2xl shadow-2xl text-white text-[11px] min-w-[200px]">
                                                            <div class="text-gray-400 font-black border-b border-gray-700/50 pb-2 mb-2">📅 ${yyyy}. ${mm}. ${dd}.</div>
                                                            <div class="flex justify-between mb-1"><span class="text-gray-400">시가</span><span class="font-mono">${fmt(item.open)}</span></div>
                                                            <div class="flex justify-between mb-1"><span class="text-gray-400">고가</span><span class="font-mono text-red-400">${fmt(item.high)}</span></div>
                                                            <div class="flex justify-between mb-2"><span class="text-gray-400">저가</span><span class="font-mono text-blue-400">${fmt(item.low)}</span></div>
                                                            <div class="flex justify-between font-black border-b border-gray-700/30 pb-2 mb-2"><span>종가</span><span class="font-mono">${fmt(item.close)}</span></div>
                                                            <div class="flex justify-between"><span class="text-gray-400">거래량</span><span class="text-blue-300">${item.volume?.toLocaleString()}</span></div>
                                                        </div>`;
                                                    }
                                                },
                                                grid: { borderColor: "#1f2937", strokeDashArray: 4 },
                                                theme: { mode: "dark" as const },
                                                legend: { show: true, position: "top" as const, horizontalAlign: "left" as const }
                                            }}
                                            series={[
                                                { name: "시세", type: "candlestick", data: filteredChartData.map((d: any) => ({ x: new Date(d.date).getTime(), y: [d.open, d.high, d.low, d.close] })) },
                                                { name: "MA5", type: "line", data: filteredChartData.map((d: any) => ({ x: new Date(d.date).getTime(), y: d.ma5 || null })) },
                                                { name: "MA20", type: "line", data: filteredChartData.map((d: any) => ({ x: new Date(d.date).getTime(), y: d.ma20 || null })) },
                                                { name: "MA60", type: "line", data: filteredChartData.map((d: any) => ({ x: new Date(d.date).getTime(), y: d.ma60 || null })) },
                                                { name: "MA120", type: "line", data: filteredChartData.map((d: any) => ({ x: new Date(d.date).getTime(), y: d.ma120 || null })) },
                                            ]}
                                            type="line"
                                            height="100%"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 하단 면책 */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                                <Zap className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-400 font-bold leading-relaxed">
                                    이 페이지의 모든 분석 수치는 <strong className="text-gray-300">과거 시장 데이터 기반 통계</strong>이며, 특정 ETF 상품의 매수·매도를 권유하거나 미래 성과를 보장하지 않습니다.
                                    미국 상장 ETF 시세는 현지 거래소 규정에 따라 최소 15분 지연됩니다.
                                    투자 결정은 투자자 본인의 판단과 책임 하에 이루어져야 합니다.
                                </p>
                            </div>

                        </div>
                    ) : etfData?.error ? (
                        <div className="py-32 flex flex-col items-center justify-center text-center">
                            <ShieldAlert className="w-12 h-12 text-red-500/50 mb-4" />
                            <p className="text-white font-bold">{etfData.error}</p>
                            <p className="text-gray-500 text-sm mt-2">입력하신 종목코드를 다시 한 번 확인해주세요.</p>
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-4 max-w-3xl mx-auto">
                            <Layers className="w-16 h-16 text-indigo-500/20 mb-6" />
                            <h2 className="text-xl font-black text-white mb-4">ETF 펀더멘탈 분석 시스템</h2>
                            <p className="text-gray-400 font-medium mb-8 leading-relaxed text-sm">
                                상단 검색창에 분석을 원하는 ETF 종목코드(예: 069500, SPY, QQQ)를 입력하시면 상세 통계 분석을 시작합니다.<br/>
                                데이터 수집 완료 시 자산 규모, 분배율, 기초 지수 등의 기본 정보부터 <strong className="text-gray-200">리스크 지표(변동성, 최대낙폭, 샤프 비율)</strong>와 구성 종목 비중까지 한눈에 파악하실 수 있습니다.
                            </p>
                            <div className="text-left bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                                <h3 className="text-sm font-bold text-indigo-400">📊 퀀트 기반 ETF 분석 가이드</h3>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                    저희 플랫폼은 주관적 편견을 배제하고 철저하게 과거 데이터를 바탕으로 한 정량적(Quantitative) 지표만을 제공합니다.
                                    수익률의 단순 수치뿐만 아니라, 그 수익을 달성하기 위해 감내해야 했던 변동성(Volatility)과 샤프비율(Sharpe Ratio)을 함께 제시하여 
                                    투자자가 리스크 대비 수익을 보다 입체적으로 평가할 수 있도록 돕습니다.
                                </p>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                    또한 유사한 카테고리에 속한 경쟁 ETF 상품들의 수수료(TER)와 배당률을 함께 비교함으로써, 
                                    투자 포트폴리오를 다각화하고 자산 배분 전략을 수립하는 데 유용한 기초 참고 자료로 활용하실 수 있습니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function EtfAnalysisPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><p className="text-gray-400 font-bold">ETF 분석기 준비 중...</p></div>}>
            <EtfAnalysisContent />
        </Suspense>
    );
}
