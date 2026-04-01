'use client';

import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell
} from 'recharts';
import { Loader2, TrendingUp, ShieldCheck, AlertCircle, ChevronDown } from 'lucide-react';
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
        headers: string[];
        indicators: IndicatorData[];
    };
}

interface Props {
    symbol: string;
    stockName?: string;
}

const FIN_GUBUN_MAP = [
    { label: 'K-IFRS(연결)', value: 'IFRSL' },
    { label: 'K-IFRS(별도)', value: 'IFRSS' },
    { label: 'K-GAAP(연결)', value: 'GAAPL' },
    { label: 'K-GAAP(별도)', value: 'GAAPS' },
    { label: '주재무제표', value: 'MAIN' },
];

export default function TurboQuantIndicators({ symbol, stockName }: Props) {
    const [freq, setFreq] = useState('0'); // 0: 연간, 1: 분기
    const [finGubun, setFinGubun] = useState('IFRSL');
    const [data, setData] = useState<IndicatorsResponse['data'] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        try {
            const cleanSymbol = symbol.split('.')[0];
            const response = await fetch(`${API_BASE_URL}/api/stock/${cleanSymbol}/indicators?freq=${freq}&finGubun=${finGubun}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                setData(result.data);
            } else {
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
    }, [symbol, freq, finGubun]);

    if (!symbol) return null;

    // 차트 데이터 변환 (안정성 지표 추이)
    const getChartData = () => {
        if (!data) return [];
        return data.headers.map(header => {
            const entry: any = { name: header };
            data.indicators.forEach(ind => {
                if (['부채비율', '유동부채비율', '비유동부채비율'].includes(ind.name)) {
                    entry[ind.name] = ind.values[header];
                }
            });
            return entry;
        });
    };

    // 차트 데이터 변환 (부채 구조 분석)
    const getDebtChartData = () => {
        if (!data) return [];
        return data.headers.map(header => {
            const entry: any = { name: header };
            data.indicators.forEach(ind => {
                if (['순부채비율', '이자보상배율'].includes(ind.name)) {
                    entry[ind.name] = ind.values[header];
                }
            });
            return entry;
        });
    };

    return (
        <div className="bg-slate-900/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
            {/* Header & Filters */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 mb-2">
                            <ShieldCheck className="w-7 h-7 text-green-400" />
                            터보퀸트 정밀 진단: <span className="text-blue-400">재무 안정성</span>
                        </h3>
                        <p className="text-slate-400 text-sm font-medium">
                            WiseReport 연동 실시간 투자지표 분석 (K-IFRS/K-GAAP 정밀 대입)
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
                        <p className="text-slate-400 font-bold animate-pulse text-sm">터보 엔진이 정밀 데이터를 파싱 중입니다...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4 text-red-300">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <span className="font-bold text-sm">{error}</span>
                    </div>
                ) : data && data.indicators.length > 0 ? (
                    <div className="space-y-8">
                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Chart 1: Stability Indices */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                <h4 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-400" /> 안정성 지표 추이 (%)
                                </h4>
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getChartData()}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="#94a3b8" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false} 
                                            />
                                            <YAxis 
                                                stroke="#94a3b8" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false}
                                                tickFormatter={(value) => `${value}%`}
                                            />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '12px' }}
                                                itemStyle={{ fontWeight: 'bold' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                                            <Line name="부채비율" type="monotone" dataKey="부채비율" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                            <Line name="유동부채비율" type="monotone" dataKey="유동부채비율" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                                            <Line name="비유동부채비율" type="monotone" dataKey="비유동부채비율" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Chart 2: Debt Structure */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                <h4 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-purple-400" /> 부채 체력 분석 (배/%)
                                </h4>
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={getDebtChartData()}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '12px' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                            <Bar yAxisId="left" name="순부채비율" dataKey="순부채비율" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30}>
                                                {getDebtChartData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.순부채비율 < 0 ? '#10b981' : '#6366f1'} opacity={0.8} />
                                                ))}
                                            </Bar>
                                            <Line yAxisId="right" name="이자보상배율" type="step" dataKey="이자보상배율" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Table Section */}
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-[#0c1221] z-10">항목</th>
                                        {data.headers.map(h => (
                                            <th key={h} className="p-4 text-xs font-bold text-slate-300 text-center">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.indicators.map((ind, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 text-sm font-bold text-slate-200 sticky left-0 bg-[#0c1221]/90 z-10 border-r border-white/5">
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

                        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                            <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                * 데이터 출처: Naver Pay 증권 / WiseReport (제공처의 사정에 따라 업데이트 주기가 다를 수 있습니다.)
                                <br />
                                * 순부채비율이 음수(-)인 경우, 보유 현금이 차입금보다 많은 매우 우량한 상태를 의미합니다.
                                <br />
                                * YoY(전년대비) 등 정밀 데이터 조회를 위해 상단 필터를 활용하세요.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <p className="text-slate-500 font-bold">표시할 데이터가 없습니다 (K-IFRS/K-GAAP 등 회계기준을 확인하세요).</p>
                    </div>
                )}
            </div>
        </div>
    );
}
