'use client';

import { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { RefreshCw, Users, AlertCircle, TrendingUp, Briefcase, Globe } from 'lucide-react';
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

    const fetchData = async () => {
        if (!symbol) return;
        setIsLoading(true);
        setError(false);
        try {
            const sym = encodeURIComponent(symbol);
            const res = await fetch(`${API_BASE_URL}/api/stock/${sym}/investors/history`);
            const data = await res.json();
            setApiResponse(data);
        } catch (err) {
            console.error("Investor trend fetch error:", err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [symbol]);

    // API 응답에서 데이터 추출 및 정렬 (가장 오래된 날짜부터 차근차근)
    const rawData: InvestorData[] = useMemo(() => {
        if (!apiResponse || apiResponse.status !== 'success' || !apiResponse.data) return [];
        // 원본 데이터는 최신 날짜가 index 0. 차트를 위해 오래된 날짜부터 시작하도록 역순(reverse) 정렬
        return [...apiResponse.data].reverse();
    }, [apiResponse]);

    // 최근 데이터 (가장 최신일자)
    const latestData = rawData.length > 0 ? rawData[rawData.length - 1] : null;

    // 통합 데이터 범위 계산 (Y축 도메인 설정용 등)
    const maxValue = useMemo(() => {
        if (rawData.length === 0) return 0;
        let max = 0;
        rawData.forEach(d => {
            const rowMax = Math.max(Math.abs(d.institution), Math.abs(d.foreigner), Math.abs(d.retail));
            if (rowMax > max) max = rowMax;
        });
        return max;
    }, [rawData]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <div className="animate-spin mb-4">
                    <RefreshCw className="w-8 h-8 text-indigo-400" />
                </div>
                <p>최근 20일간 투자자별 매매동향 데이터를 불러오는 중...</p>
            </div>
        );
    }

    if (error || apiResponse?.status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <AlertCircle className="w-10 h-10 text-rose-400 mb-4" />
                <p>투자자별 매매 데이터를 불러오는데 실패했습니다.</p>
                <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> 다시 시도
                </button>
            </div>
        );
    }

    if (rawData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Users className="w-10 h-10 text-slate-500 mb-4" />
                <p>현재 종목의 투자자별 매매동향 데이터가 조회되지 않습니다.</p>
            </div>
        );
    }

    // 숫자 포맷터 (주 단위, 억 단위 변환)
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('ko-KR').format(num);
    };

    // 요약 카드용 아이콘 매핑
    return (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-right-4 duration-300">

            {/* 상단 요약 카드 (최근 영업일 기준) */}
            {latestData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-center">
                        <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                            기관 ({latestData.date.substring(5)})
                        </div>
                        <div className={`text-xl font-bold flex items-baseline gap-1 ${latestData.institution > 0 ? 'text-rose-400' : latestData.institution < 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                            {latestData.institution > 0 ? '+' : ''}{formatNumber(latestData.institution)}
                            <span className="text-sm font-normal text-slate-500">주</span>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-center">
                        <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-purple-400" />
                            외국인 ({latestData.date.substring(5)})
                        </div>
                        <div className={`text-xl font-bold flex items-baseline gap-1 ${latestData.foreigner > 0 ? 'text-rose-400' : latestData.foreigner < 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                            {latestData.foreigner > 0 ? '+' : ''}{formatNumber(latestData.foreigner)}
                            <span className="text-sm font-normal text-slate-500">주</span>
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-center">
                        <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            개인 (추정치)
                        </div>
                        <div className={`text-xl font-bold flex items-baseline gap-1 ${latestData.retail > 0 ? 'text-rose-400' : latestData.retail < 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                            {latestData.retail > 0 ? '+' : ''}{formatNumber(latestData.retail)}
                            <span className="text-sm font-normal text-slate-500">주</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 탭 컨트롤 (차트 vs 표) */}
            <div className="flex border-b border-slate-800 mb-4">
                <button
                    onClick={() => setTabView('chart')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tabView === 'chart' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    Bar 차트
                </button>
                <button
                    onClick={() => setTabView('table')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tabView === 'table' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    일자별 상세 데이터
                </button>
            </div>

            {/* 메인 콘텐츠 영역 */}
            {tabView === 'chart' ? (
                <div className="bg-[#0b1121] border border-slate-800/60 rounded-xl p-5 md:p-6 custom-shadow relative overflow-hidden group">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-slate-100 hidden md:block">투자 주체별 순매수 동향 (최근 20영업일)</h3>
                        <h3 className="text-sm font-bold text-slate-100 md:hidden">매매 동향 차트</h3>
                        <span className="text-xs text-slate-500 ml-auto">단위: 주</span>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={rawData}
                                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                                barGap={0}
                                barCategoryGap="20%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => val.substring(5)}
                                    stroke="#64748b"
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => {
                                        if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}만`;
                                        return value.toString();
                                    }}
                                    dx={-10}
                                    domain={[-maxValue * 1.05, maxValue * 1.05]}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ padding: '2px 0' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}
                                    formatter={(value: any, name: any) => {
                                        const label = name === 'institution' ? '기관' : name === 'foreigner' ? '외국인' : '개인';
                                        return [`${formatNumber(Number(value))} 주`, label];
                                    }}
                                    labelFormatter={(label) => `${label} 순매수`}
                                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => {
                                        return <span className="text-xs text-slate-300 mr-4 font-medium">{value === 'institution' ? '기관' : value === 'foreigner' ? '외국인' : '개인'}</span>
                                    }}
                                />
                                <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                                <Bar dataKey="institution" fill="#3b82f6" radius={[2, 2, 2, 2]} maxBarSize={30} />
                                <Bar dataKey="foreigner" fill="#a855f7" radius={[2, 2, 2, 2]} maxBarSize={30} />
                                <Bar dataKey="retail" fill="#14b8a6" radius={[2, 2, 2, 2]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-[10px] text-slate-500 text-center">
                        ※ 개인 순매수량은 기관 및 외국인 순매수 합의 역산 추정치로, 일부 오차가 있을 수 있습니다. (출처: 네이버페이 증권 기반 가공)
                    </div>
                </div>
            ) : (
                <div className="bg-[#0b1121] border border-slate-800/60 rounded-xl relative overflow-hidden custom-shadow">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs text-slate-400 bg-slate-800/50 uppercase border-b border-slate-700/50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 min-w-[100px]">일자</th>
                                    <th scope="col" className="px-4 py-3 text-right">종가</th>
                                    <th scope="col" className="px-4 py-3 text-right">기관 매수</th>
                                    <th scope="col" className="px-4 py-3 text-right">외국인 매수</th>
                                    <th scope="col" className="px-4 py-3 text-right">개인 매수 (추정)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* 테이블은 최신 날짜가 위로 오도록 다시 역정렬(원본 apiResponse.data 순서) */}
                                {[...rawData].reverse().map((day, idx) => (
                                    <tr key={idx} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-200">
                                            {day.date.substring(5)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatNumber(day.price)}원
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${day.institution > 0 ? 'text-rose-400' : day.institution < 0 ? 'text-blue-400' : ''}`}>
                                            {day.institution > 0 ? '+' : ''}{formatNumber(day.institution)}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${day.foreigner > 0 ? 'text-rose-400' : day.foreigner < 0 ? 'text-blue-400' : ''}`}>
                                            {day.foreigner > 0 ? '+' : ''}{formatNumber(day.foreigner)}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${day.retail > 0 ? 'text-rose-400' : day.retail < 0 ? 'text-blue-400' : ''}`}>
                                            {day.retail > 0 ? '+' : ''}{formatNumber(day.retail)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
