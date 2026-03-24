'use client';

import { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { RefreshCw, Users, AlertCircle, TrendingUp, Briefcase, Globe, Calendar, Loader2, TrendingDown } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface InvestorData {
    date: string;
    price: number;
    institution: number;
    foreigner: number;
    retail: number;
}

interface InvestorTrendTabProps {
    symbol: string;
    stockName: string;
}

export default function InvestorTrendTab({ symbol, stockName }: InvestorTrendTabProps) {
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);
    const [tabView, setTabView] = useState<'chart' | 'table'>('chart');
    const [period, setPeriod] = useState<number>(1);

    const fetchData = async () => {
        if (!symbol) return;
        setIsLoading(true);
        setError(false);
        try {
            const sym = encodeURIComponent(symbol);
            const res = await fetch(`${API_BASE_URL}/api/stock/${sym}/investor?period=${period}`);
            const json = await res.json();
            if (json.status === "success") {
                setApiResponse(json.data);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error("Investor trend fetch error:", err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [symbol, period]);

    const trendData: InvestorData[] = useMemo(() => {
        if (!apiResponse || !apiResponse.trend) return [];
        // Support both old and new data structures
        const list = apiResponse.trend || [];
        return [...list].reverse();
    }, [apiResponse]);

    const brokerage = apiResponse?.brokerage || { sell: [], buy: [], foreign_estimate: null };
    const latestData = trendData.length > 0 ? trendData[trendData.length - 1] : null;

    const maxValue = useMemo(() => {
        if (trendData.length === 0) return 0;
        let max = 0;
        trendData.forEach(d => {
            const rowMax = Math.max(Math.abs(d.institution || 0), Math.abs(d.foreigner || 0), Math.abs(d.retail || 0));
            if (rowMax > max) max = rowMax;
        });
        return max || 1000;
    }, [trendData]);

    if (isLoading && !apiResponse) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <div className="animate-spin mb-4">
                    <RefreshCw className="w-8 h-8 text-indigo-400" />
                </div>
                <p>투자자별 매매동향 및 거래원 데이터를 불러오는 중...</p>
            </div>
        );
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('ko-KR').format(num);
    };

    const PeriodButton = ({ val, label }: { val: number, label: string }) => (
        <button
            onClick={() => setPeriod(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${period === val
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* 기간 선택 필터 */}
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold text-gray-300 mr-2">누적 기간</span>
                    <div className="flex items-center gap-1.5">
                        <PeriodButton val={20} label="1개월" />
                        <PeriodButton val={60} label="3개월" />
                        <PeriodButton val={120} label="6개월" />
                        <PeriodButton val={250} label="1년" />
                    </div>
                </div>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
            </div>

            {/* 거래원 정보 (Brokerage) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 매도 상위 */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-4 py-3 bg-blue-500/10 border-b border-blue-500/20 flex justify-between items-center">
                        <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" /> 매도 상위 5개사
                        </h4>
                        <span className="text-[10px] text-blue-400 font-mono">Sell Side</span>
                    </div>
                    <div className="p-4 space-y-2">
                        {brokerage.sell.length > 0 ? brokerage.sell.slice(0, 5).map((b: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-gray-300 font-medium">{b.name}</span>
                                <span className="text-gray-400 font-mono text-xs">{formatNumber(b.volume)}주</span>
                            </div>
                        )) : <div className="text-center py-4 text-gray-600 text-xs text-slate-500">데이터 없음</div>}
                    </div>
                </div>

                {/* 매수 상위 */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex justify-between items-center">
                        <h4 className="text-sm font-bold text-red-300 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> 매수 상위 5개사
                        </h4>
                        <span className="text-[10px] text-red-400 font-mono">Buy Side</span>
                    </div>
                    <div className="p-4 space-y-2">
                        {brokerage.buy.length > 0 ? brokerage.buy.slice(0, 5).map((b: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-gray-300 font-medium">{b.name}</span>
                                <span className="text-gray-400 font-mono text-xs">{formatNumber(b.volume)}주</span>
                            </div>
                        )) : <div className="text-center py-4 text-gray-600 text-xs text-slate-500">데이터 없음</div>}
                    </div>
                </div>
            </div>

            {/* 외국계 추정합 (오늘만 노출) */}
            {period === 1 && brokerage.foreign_estimate && (
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/20 p-2 rounded-lg">
                            <Globe className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <div className="text-xs text-indigo-300 font-bold mb-0.5">외국계 추정합 (실시간 집계)</div>
                            <div className="text-[10px] text-indigo-400/60">오늘 외국계 증권사 전체 매매 현황</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-xl font-black ${brokerage.foreign_estimate.net > 0 ? 'text-red-400' : brokerage.foreign_estimate.net < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                            {brokerage.foreign_estimate.net > 0 ? '+' : ''}{formatNumber(brokerage.foreign_estimate.net)}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                            매수 {formatNumber(brokerage.foreign_estimate.buy)} / 매도 {formatNumber(brokerage.foreign_estimate.sell)}
                        </div>
                    </div>
                </div>
            )}

            {/* 상단 요약 카드 (최근 영업일 기준) */}
            {latestData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:bg-slate-800/40 transition-colors">
                        <div className="text-slate-400 text-xs font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                            기관 순매수 ({latestData.date.substring(5)})
                        </div>
                        <div className={`text-2xl font-black flex items-baseline gap-1 ${latestData.institution > 0 ? 'text-red-400' : latestData.institution < 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                            {latestData.institution > 0 ? '+' : ''}{formatNumber(latestData.institution)}
                            <span className="text-xs font-normal text-slate-500 uppercase">Shares</span>
                        </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:bg-slate-800/40 transition-colors">
                        <div className="text-slate-400 text-xs font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                            <Globe className="w-3.5 h-3.5 text-purple-400" />
                            외국인 순매수 ({latestData.date.substring(5)})
                        </div>
                        <div className={`text-2xl font-black flex items-baseline gap-1 ${latestData.foreigner > 0 ? 'text-red-400' : latestData.foreigner < 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                            {latestData.foreigner > 0 ? '+' : ''}{formatNumber(latestData.foreigner)}
                            <span className="text-xs font-normal text-slate-500 uppercase">Shares</span>
                        </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:bg-slate-800/40 transition-colors">
                        <div className="text-slate-400 text-xs font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            개인 순매수 ({latestData.date.substring(5)})
                        </div>
                        <div className={`text-2xl font-black flex items-baseline gap-1 ${latestData.retail > 0 ? 'text-red-400' : latestData.retail < 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                            {latestData.retail > 0 ? '+' : ''}{formatNumber(latestData.retail || 0)}
                            <span className="text-xs font-normal text-slate-500 uppercase">Shares</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 탭 컨트롤 (차트 vs 표) */}
            <div className="flex border-b border-white/10 mb-2">
                <button
                    onClick={() => setTabView('chart')}
                    className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${tabView === 'chart' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    Bar 차트 분석
                </button>
                <button
                    onClick={() => setTabView('table')}
                    className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${tabView === 'table' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    상세 데이터 테이블
                </button>
            </div>

            {/* 메인 콘텐츠 영역 */}
            {tabView === 'chart' ? (
                <div className="bg-black/60 border border-white/10 rounded-2xl p-5 md:p-6 custom-shadow relative overflow-hidden group">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-gray-200">투자 주체별 순매수 동향 추이</h3>
                        <span className="text-[10px] text-gray-500 ml-auto font-mono">UNIT: SHARES</span>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={trendData}
                                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                                barGap={0}
                                barCategoryGap="20%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.05} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => val.substring(5)}
                                    stroke="#64748b"
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => {
                                        if (Math.abs(value) >= 100000) return `${(value / 1000000).toFixed(1)}M`;
                                        if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                        return value.toString();
                                    }}
                                    dx={-10}
                                    domain={[-maxValue * 1.1, maxValue * 1.1]}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', backdropFilter: 'blur(8px)' }}
                                    itemStyle={{ padding: '4px 0', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}
                                    formatter={(value: any, name: any) => {
                                        const label = name === 'institution' ? '기관' : name === 'foreigner' ? '외국인' : '개인';
                                        return [`${formatNumber(Number(value))} 주`, label];
                                    }}
                                    labelFormatter={(label) => `${label} 순매수 현황`}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => {
                                        return <span className="text-xs text-slate-400 mr-4 font-bold">{value === 'institution' ? '기관' : value === 'foreigner' ? '외국인' : '개인'}</span>
                                    }}
                                />
                                <ReferenceLine y={0} stroke="#ffffff" opacity={0.1} strokeWidth={1} />
                                <Bar dataKey="institution" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                <Bar dataKey="foreigner" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                <Bar dataKey="retail" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="bg-black/40 border border-white/10 rounded-2xl relative overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-[10px] text-gray-500 bg-white/5 uppercase border-b border-white/10 tracking-widest font-black">
                                <tr>
                                    <th scope="col" className="px-6 py-4">일자 (DATE)</th>
                                    <th scope="col" className="px-6 py-4 text-right">종가 (CLOSE)</th>
                                    <th scope="col" className="px-6 py-4 text-right">기관 (INST)</th>
                                    <th scope="col" className="px-6 py-4 text-right">외국인 (FRGN)</th>
                                    <th scope="col" className="px-4 py-4 text-right">보유주수/비율</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono">
                                {[...trendData].reverse().map((day: any, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 text-gray-200 group-hover:text-white font-bold">
                                            {day.date.substring(5)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-white">
                                            {formatNumber(day.close)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black ${day.institution > 0 ? 'text-red-400' : day.institution < 0 ? 'text-blue-400' : ''}`}>
                                            {day.institution > 0 ? '+' : ''}{formatNumber(day.institution)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black ${day.foreigner > 0 ? 'text-red-400' : day.foreigner < 0 ? 'text-blue-400' : ''}`}>
                                            {day.foreigner > 0 ? '+' : ''}{formatNumber(day.foreigner)}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                           <div className="text-gray-400 text-[11px]">{formatNumber(day.foreign_holdings)}</div>
                                           <div className="text-gray-500 text-[10px]">{day.foreign_ratio}%</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div className="text-[10px] text-gray-600 flex items-center gap-2 justify-center bg-white/5 py-2 rounded-xl border border-white/5">
                <AlertCircle className="w-3 h-3" />
                <span>데이터 소스: 네이버 금융 실시간 거래원 및 모바일 투자자 트렌드 API 연동. 해외 주식은 거래소 제한으로 인해 제공하지 않습니다.</span>
            </div>
        </div>
    );
}
