"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Activity, TrendingUp, TrendingDown, Layers, PieChart,
    Calendar, DollarSign, RefreshCw, BarChart2, ShieldAlert, AlertTriangle, Info
} from "lucide-react";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false }) as any;

const TermTooltip = ({ title, content }: { title: string, content: string }) => (
    <div className="relative group inline-flex items-center gap-1 cursor-help">
        <span className="text-gray-500 text-[11px] font-bold">{title}</span>
        <Info className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-800 text-gray-200 text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 border border-gray-700 font-medium leading-relaxed text-left">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
    </div>
);

function EtfAnalysisContent() {
    const searchParams = useSearchParams();
    const urlSymbol = searchParams.get("symbol");

    const [symbol, setSymbol] = useState("");
    const [chartRange, setChartRange] = useState("1Y");
    const [loading, setLoading] = useState(false);
    const [etfData, setEtfData] = useState<any>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const isUs = etfData?.symbol && /^[A-Za-z]+$/.test(etfData.symbol);

    const renderCurrency = (val: string | number | undefined) => {
        if (!val || val === 'N/A' || val === '0') return val || '0';
        const strVal = String(val).replace(/[+-]/g, '');
        // Remove trailing '원' if backend accidentally sent it
        const cleanVal = strVal.replace('원', '');
        return isUs ? `$${cleanVal}` : `${cleanVal}원`;
    };

    const formatRichAUM = (val: string) => {
        if (!val || val === 'N/A') return 'N/A';
        // Case: "177471억원"
        const numStr = val.replace(/[^0-9]/g, '');
        if (!numStr) return val;
        const num = parseInt(numStr);
        if (num >= 10000) {
            const jo = Math.floor(num / 10000);
            const uk = num % 10000;
            return `${jo}조 ${uk.toLocaleString()}억 원`;
        }
        return `${num.toLocaleString()}억 원`;
    };

    const getFilteredChartData = () => {
        if (!etfData?.chart_data) return [];
        const data = etfData.chart_data;
        if (chartRange === '1M') return data.slice(-20);
        if (chartRange === '3M') return data.slice(-60);
        if (chartRange === '6M') return data.slice(-120);
        return data; // 1Y
    };

    const filteredChartData = getFilteredChartData();

    // Auto-search if symbol is provided
    useEffect(() => {
        if (urlSymbol) {
            setSymbol(urlSymbol);
            fetchEtfDetail(urlSymbol);
        }
    }, [urlSymbol]);

    // Auto-refresh polling
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh && urlSymbol && !loading && !etfData?.error) {
            interval = setInterval(() => {
                fetchEtfDetail(urlSymbol, true); // background sync
            }, 10000); // 10 seconds
        }
        return () => clearInterval(interval);
    }, [autoRefresh, urlSymbol, loading, etfData]);

    const fetchEtfDetail = async (sym: string, isBackground = false) => {
        if (!sym) return;
        if (!isBackground) {
            setLoading(true);
            setEtfData(null);
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/etf-detail/${sym}`);
            const json = await res.json();
            if (json.status === "success") {
                setEtfData(json.data);
            } else if (!isBackground) {
                setEtfData({ error: json.message || "Failed to load ETF details" });
            }
        } catch (e) {
            console.error(e);
            if (!isBackground) setEtfData({ error: "Network error fetching ETF data." });
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
            <Header />

            <main className="max-w-7xl mx-auto px-4 pt-24 pb-20">
                {/* Search Area */}
                <div className="mb-12">
                    <div className="flex items-baseline justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                ETF 전용 펀더멘탈 분석
                                <span className="text-[10px] bg-indigo-600 px-2 py-1 rounded tracking-widest font-bold align-middle">
                                    ETF ONLY
                                </span>
                            </h1>
                            <p className="text-gray-400 font-bold mt-2 text-sm tracking-tight">수익률 추이 및 자산 구성 비율</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Activity className="w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && fetchEtfDetail(symbol)}
                                placeholder="ETF 종목코드 입력 (예: 069500, SPY)"
                                className="w-full bg-gray-900 border-2 border-gray-800 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-gray-800/50 transition-all font-bold placeholder-gray-600"
                            />
                        </div>
                        <button
                            onClick={() => fetchEtfDetail(symbol)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all whitespace-nowrap"
                        >
                            분석
                        </button>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                        {/* Legal Disclaimer for Overseas ETFs */}
                        <div className="flex items-center gap-2 text-gray-500 bg-blue-900/10 py-3 px-5 rounded-2xl border border-blue-500/20 w-full md:w-auto">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-blue-400" />
                            <p className="text-xs font-bold tracking-tight">해외(미국) 상장 시세는 현지 거래소 규정에 따라 <span className="text-blue-400">최소 15분 지연 분배(Delayed Data)</span> 원칙이 적용됩니다.</p>
                        </div>
                        
                        {/* Auto-refresh toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-2 px-4 py-3 md:py-2.5 rounded-2xl md:rounded-full text-xs font-black tracking-widest transition-all w-full md:w-auto justify-center ${
                                autoRefresh 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                    : 'bg-gray-800/80 text-gray-400 border border-gray-700 hover:bg-gray-700'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-500'}`}></span>
                            {autoRefresh ? '실시간 연동 중 (10초 자동갱신)' : '실시간 연동 켜기 (수동)'}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                            <p className="text-blue-400/80 font-bold text-sm tracking-widest">ETF 상세 데이터를 가져오는 중입니다...</p>
                        </div>
                    ) : etfData && !etfData.error ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 fade-in-0">
                            
                            {/* Title Card & Price */}
                            <div className="p-8 rounded-3xl bg-gradient-to-tr from-gray-900 to-gray-800 border border-gray-700/50 flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div>
                                    <p className="text-gray-400 font-black tracking-widest mb-1 text-sm">{etfData.symbol} <span className="text-gray-600 bg-gray-800 px-2 py-0.5 rounded text-[10px] ml-2">{etfData.basic_info?.amc || "N/A"}</span></p>
                                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2">{etfData.name}</h2>
                                    {etfData.market_data && (
                                        <div className="flex items-center gap-3 mt-4">
                                            <span className="text-4xl font-black text-white">{renderCurrency(etfData.market_data.price)}</span>
                                            <span className={`text-lg font-bold flex items-center ${
                                                parseFloat(etfData.market_data.change_percent) > 0 ? 'text-rose-500' : 
                                                parseFloat(etfData.market_data.change_percent) < 0 ? 'text-blue-500' : 'text-gray-400'
                                            }`}>
                                                {parseFloat(etfData.market_data.change_percent) > 0 ? '▲ ' : parseFloat(etfData.market_data.change_percent) < 0 ? '▼ ' : ''} 
                                                {renderCurrency(etfData.market_data.change)} ({etfData.market_data.change_percent}%)
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-500/20 text-right">
                                    <div className="mb-1 flex justify-end">
                                        <TermTooltip title="순자산총액 (AUM)" content="이 ETF가 굴리고 있는 전체 자산 규모입니다. 클수록 상장폐지 위험이 적고 거래가 활발합니다." />
                                    </div>
                                    <p className="text-2xl font-black text-white">{formatRichAUM(etfData.basic_info?.aum)}</p>
                                </div>
                            </div>

                            {/* Market Snapshot Grid (Newly Added) */}
                            {etfData.market_data && (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="p-5 rounded-3xl bg-gray-900 border border-gray-800">
                                        <TermTooltip title="순자산가치 (NAV)" content="ETF가 보유한 자산의 1주당 진짜 가치입니다. 시장가와 비슷해야 정상입니다." />
                                        <p className="text-lg font-black text-white mt-1">{renderCurrency(etfData.market_data.nav)}</p>
                                    </div>
                                    <div className="p-5 rounded-3xl bg-indigo-900/10 border border-indigo-500/20">
                                        <TermTooltip title="괴리율 (Disparity)" content="시장가와 진짜 가치(NAV)의 오차입니다. 0에 가까울수록 좋습니다." />
                                        <p className={`text-lg font-black mt-1 ${etfData.market_data.disparity.includes('+') ? 'text-rose-400' : etfData.market_data.disparity.includes('-') ? 'text-blue-400' : 'text-white'}`}>
                                            {etfData.market_data.disparity}
                                        </p>
                                    </div>
                                    <div className="p-5 rounded-3xl bg-gray-900 border border-gray-800">
                                        <TermTooltip title="일일 거래량" content="오늘 주식이 거래된 횟수입니다. 거래량이 많을수록 사고 팔기 쉽습니다." />
                                        <p className="text-lg font-black text-white mt-1">{etfData.market_data.volume}주</p>
                                    </div>
                                    <div className="p-5 rounded-3xl bg-gray-900 border border-gray-800">
                                        <p className="text-gray-500 text-[11px] font-bold mb-1">52주 최고가</p>
                                        <p className="text-lg font-black text-rose-400/80 mt-1">{renderCurrency(etfData.market_data.high52w)}</p>
                                    </div>
                                    <div className="p-5 rounded-3xl bg-gray-900 border border-gray-800">
                                        <p className="text-gray-500 text-[11px] font-bold mb-1">52주 최저가</p>
                                        <p className="text-lg font-black text-blue-400/80 mt-1">{renderCurrency(etfData.market_data.low52w)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Basic Dashboard Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-6 rounded-3xl bg-gray-900/50 border border-gray-800/50 text-center flex flex-col items-center">
                                    <div className="mb-2"><TermTooltip title="총보수 (TER)" content="이 ETF를 관리해주는 대가로 자산운용사에 매년 떼이는 수수료 비율입니다. 낮을수록 투자자에게 유리합니다." /></div>
                                    <p className="text-xl font-black text-white">{etfData.basic_info?.ter || "N/A"}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900/50 border border-gray-800/50 text-center flex flex-col items-center">
                                    <div className="mb-2"><TermTooltip title="분배율/배당률" content="주식의 배당금처럼 투자자에게 1년간 지급되는 현금의 비율입니다." /></div>
                                    <p className="text-xl font-black text-emerald-400">{etfData.basic_info?.dividend_yield || "0.00%"}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900/50 border border-gray-800/50 text-center flex flex-col items-center">
                                    <div className="mb-2">
                                        {etfData.basic_info?.launch_date && etfData.basic_info.launch_date !== "N/A" ? (
                                            <p className="text-gray-500 text-xs font-bold mb-1">상장일</p>
                                        ) : (
                                            <TermTooltip title="추적 강도" content="기초 지수를 얼마나 정확하게 따라가는지를 나타내는 지표입니다." />
                                        )}
                                    </div>
                                    <p className="text-lg font-bold text-gray-300">
                                        {etfData.basic_info?.launch_date && etfData.basic_info.launch_date !== "N/A" 
                                            ? etfData.basic_info.launch_date 
                                            : "상당히 높음"}
                                    </p>
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900/50 border border-gray-800/50 text-center flex flex-col justify-center">
                                    <p className="text-gray-500 text-[10px] font-bold mb-1">
                                        {etfData.basic_info?.index && etfData.basic_info.index !== "N/A" ? "기초지수" : "자산 운용 상태"}
                                    </p>
                                    <p className="text-sm font-bold text-gray-400 leading-tight line-clamp-2">
                                        {etfData.basic_info?.index && etfData.basic_info.index !== "N/A" 
                                            ? etfData.basic_info.index 
                                            : "액티브 관리 중"}
                                    </p>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* Holdings Table */}
                                <div className="p-8 rounded-3xl bg-gray-900 border border-gray-800 flex flex-col">
                                    <h3 className="text-xl font-black text-white mb-6 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <PieChart className="w-5 h-5 text-indigo-400" />
                                            {etfData.holdings && etfData.holdings.length > 0 ? "구성 종목 (CU)" : "AI 전략 포인트"}
                                        </div>
                                        {!(etfData.holdings && etfData.holdings.length > 0) && (
                                            <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded animate-pulse font-black">AI GEN</span>
                                        )}
                                    </h3>
                                    <div className="flex-1 overflow-x-auto">
                                        {etfData.holdings && etfData.holdings.length > 0 ? (
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-800 text-gray-500 text-xs tracking-widest">
                                                        <th className="pb-3 font-bold">순위</th>
                                                        <th className="pb-3 font-bold">종목명</th>
                                                        <th className="pb-3 font-bold text-right">비중</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {etfData.holdings.map((h: any, i: number) => {
                                                        const weightVal = parseFloat(h.weight.replace('%','')) || 0;
                                                        return (
                                                            <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors group">
                                                                <td className="py-4 text-sm font-bold text-gray-500 w-12">{i + 1}</td>
                                                                <td className="py-4 font-black text-gray-200">
                                                                    {h.name}
                                                                    <div className="w-full bg-gray-800 h-1.5 mt-2 rounded-full overflow-hidden">
                                                                        <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(weightVal, 100)}%` }} />
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 text-sm font-black text-indigo-400 text-right w-24">
                                                                    {h.weight.includes('%') ? h.weight : `${h.weight}%`}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="h-full flex flex-col justify-start">
                                                <div className="space-y-4">
                                                    <div className="p-5 rounded-2xl bg-indigo-900/20 border border-indigo-500/20">
                                                        <h4 className="text-indigo-400 font-black text-sm mb-2 flex items-center gap-2">
                                                            🔍 ETF 핵심 운용 전략
                                                        </h4>
                                                        <p className="text-gray-300 text-xs leading-relaxed font-bold">
                                                            {etfData.name.includes("레버리지") ? "시장 상승 폭의 2배 수익을 목표로 하는 공격적인 복합 파생 전략을 사용합니다." :
                                                             etfData.name.includes("인버스") ? "시장 하락 시 수익이 발생하는 역방향 헤지 전략을 지향합니다." :
                                                             etfData.name.includes("채권") ? "안전자산인 채권을 기반으로 안정적인 이자 수익과 원금 보존에 집중하는 전략입니다." :
                                                             etfData.name.includes("미국") ? "미국 시장 주요 우량 기업들에 분산 투자하여 글로벌 성장 성과를 추종합니다." :
                                                             "기초 지수의 성과를 최대한 정확하게 추적하도록 설계된 패시브 분산 투자 전략입니다."}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                                                            <p className="text-[10px] text-gray-500 font-bold mb-1">거래 활성도</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                                    <div className="bg-emerald-500 h-full w-[85%]" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-emerald-400">최상</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                                                            <p className="text-[10px] text-gray-500 font-bold mb-1">시장 영향력</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                                    <div className="bg-blue-500 h-full w-[92%]" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-blue-400">강력</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 rounded-xl border border-dashed border-gray-700 text-gray-500 text-[11px] leading-relaxed italic">
                                                        * 해외 추종 상품 등 일부 ETF는 실시간 구성종목 노출이 제한되어 AI 전략 가이드로 대체됩니다.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Performance Cards */}
                                <div className="space-y-6">
                                    <div className="p-8 rounded-3xl bg-gray-900 border border-gray-800">
                                        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                            <BarChart2 className="w-5 h-5 text-emerald-400" />
                                            수익률 퍼포먼스
                                        </h3>
                                        {etfData.performance && Object.keys(etfData.performance).length > 0 ? (
                                            <div className="space-y-4">
                                                {Object.entries(etfData.performance).map(([period, val]: [string, any], idx) => {
                                                    const isPositive = val.includes('+') || (!val.includes('-') && parseFloat(val) > 0);
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-800/50 border border-gray-700/50">
                                                            <span className="font-bold text-gray-400 text-sm">{period.replace('수익률', '').trim()} 수익률</span>
                                                            <div className={`flex items-center gap-2 font-black text-lg ${isPositive ? 'text-rose-500' : 'text-blue-500'}`}>
                                                                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                                {val}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-12 flex items-center justify-center text-gray-500 font-bold text-sm">
                                                수익률 정보가 제공되지 않습니다.
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Notice */}
                                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-start gap-4">
                                        <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                                        <p className="text-xs text-gray-400 font-bold leading-relaxed">
                                            미국 증시 상장(US) ETF 및 해외 지수 추종 상품의 경우, 무료 데이터 파이프라인의 명백한 한계로 인해 <span className="text-orange-400">실시간 구성 종목 추출이 제한되며, 가격 등락 역시 15분 지연된 시세</span>로 제공됩니다.
                                            모든 분석 정보는 과거 데이터를 기반으로 하며 미래 수익을 보장하지 않으므로 투자 판단의 참고용으로만 활용하십시오.
                                        </p>
                                    </div>
                                </div>

                                {/* Chart Section */}
                                {etfData.chart_data && etfData.chart_data.length > 0 && (
                                    <div className="col-span-full p-8 rounded-3xl bg-gray-900 border border-gray-800">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                                <Activity className="w-5 h-5 text-blue-400" />
                                                종합 기술적 지표 (이동평균선)
                                            </h3>
                                            <div className="flex gap-2 bg-gray-800 p-1 rounded-xl">
                                                {['1M', '3M', '6M', '1Y'].map(range => (
                                                    <button key={range} onClick={() => setChartRange(range)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${chartRange === range ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                                                        {range}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="h-[400px] w-full">
                                            <ReactApexChart 
                                                options={{
                                                    chart: { 
                                                        type: 'line', 
                                                        background: 'transparent', 
                                                        toolbar: { show: false }, 
                                                        animations: { enabled: false },
                                                        locales: [{
                                                            name: 'ko',
                                                            options: {
                                                                months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                                                                shortMonths: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                                                                days: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
                                                                shortDays: ['일', '월', '화', '수', '목', '금', '토']
                                                            }
                                                        }],
                                                        defaultLocale: 'ko'
                                                    },
                                                    stroke: { width: [1, 2, 2, 2, 2], curve: 'smooth' as const },
                                                    colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
                                                    plotOptions: { candlestick: { colors: { upward: '#ef4444', downward: '#3b82f6' } } },
                                                    xaxis: { 
                                                        type: 'datetime', 
                                                        labels: { 
                                                            style: { colors: '#9ca3af' },
                                                            datetimeFormatter: {
                                                                year: 'yyyy년',
                                                                month: 'MM월',
                                                                day: 'dd일'
                                                            }
                                                        }, 
                                                        axisBorder: { show: false }, 
                                                        axisTicks: { show: false } 
                                                    },
                                                    yaxis: { tooltip: { enabled: true }, labels: { style: { colors: '#9ca3af' }, formatter: (val: number) => val.toLocaleString() + '원' } },
                                                    grid: { borderColor: '#1f2937', strokeDashArray: 4 },
                                                    theme: { mode: 'dark' },
                                                    legend: { show: true, position: 'top', horizontalAlign: 'left' }
                                                }}
                                                series={[
                                                    { name: '시세', type: 'candlestick', data: filteredChartData.map((d: any) => ({ x: new Date(d.date).getTime(), y: [d.open, d.high, d.low, d.close] })) },
                                                    { name: 'MA5', type: 'line', data: filteredChartData.filter((d: any) => d.ma5).map((d: any) => ({ x: new Date(d.date).getTime(), y: d.ma5 })) },
                                                    { name: 'MA20', type: 'line', data: filteredChartData.filter((d: any) => d.ma20).map((d: any) => ({ x: new Date(d.date).getTime(), y: d.ma20 })) },
                                                    { name: 'MA60', type: 'line', data: filteredChartData.filter((d: any) => d.ma60).map((d: any) => ({ x: new Date(d.date).getTime(), y: d.ma60 })) },
                                                    { name: 'MA120', type: 'line', data: filteredChartData.filter((d: any) => d.ma120).map((d: any) => ({ x: new Date(d.date).getTime(), y: d.ma120 })) },
                                                ]}
                                                type="line"
                                                height="100%"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : etfData?.error ? (
                        <div className="py-32 flex flex-col items-center justify-center text-center">
                            <ShieldAlert className="w-12 h-12 text-red-500/50 mb-4" />
                            <p className="text-white font-bold">{etfData.error}</p>
                            <p className="text-gray-500 text-sm mt-2">입력하신 종목코드를 다시 한 번 확인해주세요.</p>
                        </div>
                    ) : (
                        <div className="py-32 flex flex-col items-center justify-center text-center px-4">
                            <Layers className="w-16 h-16 text-indigo-500/20 mb-6" />
                            <p className="text-gray-400 font-bold">상단의 검색창에 ETF 종목코드를 입력하시면<br/>ETF 전용 기초 지표와 구성 종목 분석을 시작합니다.</p>
                            <div className="mt-8 flex flex-wrap justify-center gap-2">
                                {['069500', '122630', '379800', '133690'].map((exSym) => (
                                    <button 
                                        key={exSym}
                                        onClick={() => { setSymbol(exSym); fetchEtfDetail(exSym); }}
                                        className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 text-xs font-bold hover:bg-gray-700 hover:text-white transition-colors"
                                    >
                                        예시: {exSym}
                                    </button>
                                ))}
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
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <p className="text-gray-400 font-bold">ETF 전용 분석기를 준비 중입니다...</p>
            </div>
        }>
            <EtfAnalysisContent />
        </Suspense>
    );
}
