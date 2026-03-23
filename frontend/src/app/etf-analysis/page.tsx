"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Activity, TrendingUp, TrendingDown, Layers, PieChart,
    Calendar, DollarSign, RefreshCw, BarChart2, ShieldAlert
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function EtfAnalysisContent() {
    const searchParams = useSearchParams();
    const urlSymbol = searchParams.get("symbol");

    const [symbol, setSymbol] = useState("");
    const [loading, setLoading] = useState(false);
    const [etfData, setEtfData] = useState<any>(null);

    // Auto-search if symbol is provided
    useEffect(() => {
        if (urlSymbol) {
            setSymbol(urlSymbol);
            fetchEtfDetail(urlSymbol);
        }
    }, [urlSymbol]);

    const fetchEtfDetail = async (sym: string) => {
        if (!sym) return;
        setLoading(true);
        setEtfData(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/etf-detail/${sym}`);
            const json = await res.json();
            if (json.status === "success") {
                setEtfData(json.data);
            } else {
                setEtfData({ error: json.message || "Failed to load ETF details" });
            }
        } catch (e) {
            console.error(e);
            setEtfData({ error: "Network error fetching ETF data." });
        } finally {
            setLoading(false);
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
                            
                            {/* Title Card */}
                            <div className="p-8 rounded-3xl bg-gradient-to-tr from-gray-900 to-gray-800 border border-gray-700/50">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <p className="text-gray-400 font-black tracking-widest mb-1 text-sm">{etfData.symbol}</p>
                                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">{etfData.name}</h2>
                                        <p className="text-blue-400 font-bold tracking-tight">자산운용사: {etfData.basic_info?.amc || "N/A"}</p>
                                    </div>
                                    <div className="bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-500/20 text-right">
                                        <p className="text-gray-400 text-xs font-bold mb-1">순자산총액 (AUM)</p>
                                        <p className="text-2xl font-black text-blue-400">{etfData.basic_info?.aum || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Basic Dashboard Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-6 rounded-3xl bg-gray-900 border border-gray-800 text-center">
                                    <p className="text-gray-500 text-xs font-bold mb-2 tracking-tighter">총보수 (TER)</p>
                                    <p className="text-xl font-black text-white">{etfData.basic_info?.ter || "N/A"}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900 border border-gray-800 text-center">
                                    <p className="text-gray-500 text-xs font-bold mb-2 tracking-tighter">분배율/배당률</p>
                                    <p className="text-xl font-black text-emerald-400">{etfData.basic_info?.dividend_yield || "0.00%"}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900 border border-gray-800 text-center">
                                    <p className="text-gray-500 text-xs font-bold mb-2 tracking-tighter">상장일</p>
                                    <p className="text-lg font-bold text-white">{etfData.basic_info?.launch_date || "N/A"}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900 border border-gray-800 text-center flex flex-col justify-center">
                                    <p className="text-gray-500 text-[10px] font-bold mb-1 tracking-tighter">기초지수</p>
                                    <p className="text-sm font-bold text-gray-300 leading-tight line-clamp-2">{etfData.basic_info?.index || "N/A"}</p>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* Holdings Table */}
                                <div className="p-8 rounded-3xl bg-gray-900 border border-gray-800 flex flex-col">
                                    <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                        <PieChart className="w-5 h-5 text-indigo-400" />
                                        상위 10위 구성 종목 (CU)
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
                                            <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12">
                                                <Layers className="w-12 h-12 mb-4 opacity-20" />
                                                <p className="font-bold text-sm text-center">해외 지수 추종 ETF 등 일부 상품은<br/>네이버 금융에서 구성 종목(CU) 비율을 실시간으로 제공하지 않습니다.</p>
                                                <p className="text-xs mt-2 text-indigo-400/70 font-bold bg-indigo-500/10 px-3 py-1.5 rounded-lg">(대신, 하단의 1년치 역사적 시세 차트를 참조해 주세요!)</p>
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
                                        <ShieldAlert className="w-6 h-6 text-gray-500 flex-shrink-0 mt-1" />
                                        <p className="text-xs text-gray-500 font-bold leading-relaxed">
                                            미국(US) ETF의 경우 국내 거래소와 데이터 제공 방식이 달라 실시간 구성 종목 추출이 제한될 수 있으며, 수익률 등 일부 핵심 정보만 제공됩니다.
                                            모든 정보는 과거 데이터를 기반으로 하며 미래 수익을 보장하지 않으므로 투자 시 참고용으로만 활용하십시오.
                                        </p>
                                    </div>
                                </div>

                                {/* Chart Section */}
                                {etfData.chart_data && etfData.chart_data.length > 0 && (
                                    <div className="col-span-full p-8 rounded-3xl bg-gray-900 border border-gray-800">
                                        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-blue-400" />
                                            최근 1년 가격 추이 (YFinance)
                                        </h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={etfData.chart_data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                                    <XAxis 
                                                        dataKey="date" 
                                                        stroke="#4b5563" 
                                                        fontSize={10} 
                                                        tickMargin={10} 
                                                        minTickGap={30} 
                                                    />
                                                    <YAxis 
                                                        domain={['auto', 'auto']} 
                                                        stroke="#4b5563" 
                                                        fontSize={10} 
                                                        tickFormatter={(val) => val.toLocaleString()} 
                                                        width={60} 
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '12px' }}
                                                        itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                                                        formatter={(value: number) => [value.toLocaleString() + '원', '종가']}
                                                        labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                                    />
                                                    <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
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
