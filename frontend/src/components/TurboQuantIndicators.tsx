'use client';

import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell
} from 'recharts';
import { Loader2, TrendingUp, ShieldCheck, AlertCircle, ChevronDown, BarChart3, Activity, Zap } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface IndicatorData {
    name: string;
    values: Record<string, number | null>;
}

interface IndicatorsResponse {
    status: string;
    data: {
        symbol: string;
        freq: string;
        finGubun: string;
        category: string;
        headers: string[];
        indicators: IndicatorData[];
    };
}

interface Props {
    symbol: string;
    stockName?: string;
}

const FIN_GUBUN_MAP = [
    { label: '주재무제표', value: 'MAIN' },
    { label: 'K-IFRS(연결)', value: 'IFRSL' },
    { label: 'K-IFRS(별도)', value: 'IFRSS' },
    { label: 'K-GAAP(연결)', value: 'GAAPL' },
    { label: 'K-GAAP(별도)', value: 'GAAPS' },
];

const CATEGORIES = [
    { label: '수익성', value: '1', icon: <Zap className="w-4 h-4" /> },
    { label: '성장성', value: '2', icon: <TrendingUp className="w-4 h-4" /> },
    { label: '안정성', value: '3', icon: <ShieldCheck className="w-4 h-4" /> },
    { label: '활동성', value: '4', icon: <Activity className="w-4 h-4" /> },
];

export default function TurboQuantIndicators({ symbol, stockName }: Props) {
    const [freq, setFreq] = useState('0'); // 0: 연간, 1: 분기
    const [finGubun, setFinGubun] = useState('MAIN'); // Default to MAIN
    const [category, setCategory] = useState('1'); // 1: 수익성, 2: 성장성, 3: 안정성, 4: 활동성
    const [data, setData] = useState<IndicatorsResponse['data'] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        try {
            const cleanSymbol = symbol.split('.')[0];
            const response = await fetch(`${API_BASE_URL}/api/stock/${cleanSymbol}/indicators?freq=${freq}&finGubun=${finGubun}&category=${category}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                setData(result.data);
            } else {
                // If it's an empty case (like ETF), result.message will contain the guidance
                setData(null);
                setError(result.message || '데이터를 불러오는데 실패했습니다.');
            }
        } catch (err) {
            setError('서버 통신 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [symbol, freq, finGubun, category]);

    if (!symbol) return null;

    // 차트 데이터 변환 (상단 주 차트)
    const getMainChartData = () => {
        if (!data) return [];
        
        // 카테고리에 따른 지표 필터링
        let targetMetrics: string[] = [];
        if (category === '1') targetMetrics = ['ROE', 'ROA', '영업이익률', '매출총이익률'];
        else if (category === '2') targetMetrics = ['매출액증가율', '영업이익증가율', '순이익증가율'];
        else if (category === '3') targetMetrics = ['부채비율', '유동부채비율', '비유동부채비율'];
        else if (category === '4') targetMetrics = ['총자산회전율', '자기자본회전율', '매출채권회전율'];

        return data.headers.map(header => {
            const entry: any = { name: header };
            data.indicators.forEach(ind => {
                if (targetMetrics.includes(ind.name)) {
                    entry[ind.name] = ind.values[header];
                }
            });
            return entry;
        });
    };

    // 차트 데이터 변환 (하단 보조 차트)
    const getSubChartData = () => {
        if (!data) return [];
        let targetMetrics: string[] = [];
        if (category === '1') targetMetrics = ['ROIC', 'EBITDA마진율'];
        else if (category === '2') targetMetrics = ['총자산증가율', '자기자본증가율'];
        else if (category === '3') targetMetrics = ['순부채비율', '이자보상배율'];
        else if (category === '4') targetMetrics = ['재고자산회전율', '매입채무회전율'];

        return data.headers.map(header => {
            const entry: any = { name: header };
            data.indicators.forEach(ind => {
                if (targetMetrics.includes(ind.name)) {
                    entry[ind.name] = ind.values[header];
                }
            });
            return entry;
        });
    };

    const getCategoryTitle = () => {
        return CATEGORIES.find(c => c.value === category)?.label || '재무 지표';
    };

    const getChart1Title = () => {
        if (category === '1') return '주요 수익성 추이 (%)';
        if (category === '2') return '성장 속도 분석 (%)';
        if (category === '3') return '안정성 지표 추이 (%)';
        if (category === '4') return '자본 운용 효율성 (회)';
        return '지표 추이';
    };

    const getChart2Title = () => {
        if (category === '1') return '투하자본 및 현금창출력';
        if (category === '2') return '자산 규모 확장성';
        if (category === '3') return '부채 체력 분석 (배/%)';
        if (category === '4') return '재고 및 채무 관리 (회)';
        return '상세 분석';
    };

    return (
        <div className="w-full overflow-hidden mt-2">
            {/* Nav Categories */}
            <div className="flex border-b border-white/10 bg-white/5 overflow-x-auto no-scrollbar">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap
                            ${category === cat.value 
                                ? 'bg-blue-600/20 text-blue-400 border-blue-500 shadow-[inset_0_-2px_10px_rgba(59,130,246,0.3)]' 
                                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Header & Filters */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-indigo-600/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 mb-2">
                            <BarChart3 className="w-7 h-7 text-blue-400" />
                            터보퀸트 정밀 진단: <span className="text-blue-400">{getCategoryTitle()}</span>
                        </h3>
                        <p className="text-slate-400 text-sm font-medium">
                            {stockName ? `${stockName}(${symbol})` : symbol} WiseReport 연동 고성능 데이터 파싱
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Freq Toggle */}
                        <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center">
                            <button 
                                onClick={() => setFreq('0')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${freq === '0' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                연간
                            </button>
                            <button 
                                onClick={() => setFreq('1')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${freq === '1' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                분기
                            </button>
                        </div>

                        {/* Gubun Select */}
                        <div className="relative group">
                            <select 
                                value={finGubun}
                                onChange={(e) => setFinGubun(e.target.value)}
                                className="bg-white/5 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2.5 outline-none hover:bg-white/10 transition-all appearance-none pr-8 cursor-pointer"
                            >
                                {FIN_GUBUN_MAP.map(opt => (
                                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        <p className="text-slate-400 font-bold animate-pulse text-sm">터보 엔진이 지표 데이터를 실시간 분석 중입니다...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4 text-red-300">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <span className="font-bold text-sm">{error}</span>
                    </div>
                ) : data && data.indicators.length > 0 ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Chart 1 */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 shadow-inner">
                                <h4 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-400" /> {getChart1Title()}
                                </h4>
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getMainChartData()}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '12px' }} />
                                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                            {Object.keys(getMainChartData()[0] || {}).filter(k => k !== 'name').map((key, i) => (
                                                <Line 
                                                    key={key} 
                                                    name={key} 
                                                    type="monotone" 
                                                    dataKey={key} 
                                                    stroke={i === 0 ? '#3b82f6' : i === 1 ? '#ef4444' : i === 2 ? '#10b981' : '#f59e0b'} 
                                                    strokeWidth={3} 
                                                    dot={{ r: 4 }} 
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Chart 2 */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 shadow-inner">
                                <h4 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-400" /> {getChart2Title()}
                                </h4>
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={getSubChartData()}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '12px' }} />
                                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                            {Object.keys(getSubChartData()[0] || {}).find(k => k.includes('율') || k.includes('증가')) ? (
                                                <Bar yAxisId="left" name={Object.keys(getSubChartData()[0] || {}).find(k => k.includes('율') || k.includes('증가'))} dataKey={Object.keys(getSubChartData()[0] || {}).find(k => k.includes('율') || k.includes('증가'))} fill="#6366f1bf" radius={[4, 4, 0, 0]} barSize={35} />
                                            ) : null}
                                            {Object.keys(getSubChartData()[0] || {}).filter(k => k !== 'name' && !k.includes('율') && !k.includes('증가')).map((key, i) => (
                                                <Line key={key} yAxisId="right" name={key} type="monotone" dataKey={key} stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                                            ))}
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Table Section */}
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-x-auto shadow-xl">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-white/10 border-b border-white/10">
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-[#0e1629] z-10">항목</th>
                                        {data.headers.map(h => (
                                            <th key={h} className="p-4 text-xs font-black text-slate-300 text-center">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.indicators.map((ind, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                            <td className="p-4 text-sm font-bold text-slate-200 sticky left-0 bg-[#0e1629]/95 z-10 border-r border-white/5 group-hover:text-blue-400 transition-colors">
                                                {ind.name}
                                            </td>
                                            {data.headers.map(h => {
                                                const val = ind.values[h];
                                                const isNegative = typeof val === 'number' && val < 0;
                                                return (
                                                    <td key={h} className={`p-4 text-sm font-medium text-center ${isNegative ? 'text-red-400' : 'text-slate-300'}`}>
                                                        {val === null ? '-' : val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start gap-4 shadow-lg">
                            <ShieldCheck className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                            <div>
                                <h5 className="text-indigo-300 text-sm font-black mb-1">터보퀸트 정밀 분석 가이드</h5>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                    이 화면의 데이터는 실시간 공시 지표를 바탕으로 파싱되었습니다. 
                                    차트 상단의 탭을 통해 **{getCategoryTitle()}** 데이터뿐만 아니라 다른 핵심 지표들도 함께 연동하여 입체적으로 종목을 분석하세요.
                                    회동률이나 수익성 지표가 산업 평균보다 높은지 확인하는 것이 전략 수립의 핵심입니다.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-24 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <Loader2 className="w-8 h-8 text-slate-600 mx-auto mb-4 animate-spin" />
                        <p className="text-slate-500 font-bold">선택하신 조건(회계기준/주기)의 데이터를 불러올 수 없습니다.</p>
                        <p className="text-slate-600 text-xs mt-1">상단의 필터를 변경하여 다시 시도해 보세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
