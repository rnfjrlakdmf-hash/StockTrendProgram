'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell
} from 'recharts';
import { 
    Loader2, TrendingUp, ShieldCheck, AlertCircle, ChevronDown, 
    BarChart3, Activity, Zap, Plus, Minus 
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://stocktrendprogram-production.up.railway.app';

interface IndicatorsResponse {
    status: string;
    data: {
        name: string;
        symbol: string;
        years: string[];
        rows: {
            label: string;
            values: string[];
        }[];
    };
    message?: string;
}

interface Props {
    symbol: string;
    stockName?: string;
    showEasy?: boolean;
}

// 지표 포맷팅 통합 헬퍼 함수
const formatInvestValue = (val: any, label: string) => {
    if (val === '-' || val === '' || val == null) return '-';
    
    try {
        const cleanVal = String(val).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleanVal);
        if (isNaN(num)) return val;

        const labelClean = String(label).replace(/\s+/g, '');
        
        // 1. 비율 지표 (%)
        if (labelClean.includes('률') || labelClean.includes('비율')) {
            return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
        }
        // 2. 주당 가격 지표 (원)
        else if (labelClean.includes('EPS') || labelClean.includes('BPS') || labelClean.includes('주당')) {
            return `${Math.round(num).toLocaleString()}원`;
        }
        // 3. 배수 지표 (배)
        else if (labelClean.includes('PER') || labelClean.includes('PBR') || labelClean.includes('배')) {
            return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}배`;
        }
        // 4. 금액 지표 (Million Won base -> 조/억 변환)
        else {
            const absNum = Math.abs(num);
            const sign = num < 0 ? '-' : '';
            let result = '';
            
            if (absNum >= 1000000) {
                const trillion = Math.floor(absNum / 1000000);
                const billion = Math.round((absNum % 1000000) / 100);
                result = `${sign}${trillion}조${billion > 0 ? ` ${billion.toLocaleString()}억` : ''}`;
            } else if (absNum >= 100) {
                const billion = Math.floor(absNum / 100);
                const million = Math.round(absNum % 100);
                result = `${sign}${billion}억${million > 0 ? ` ${million}만` : ''}`;
            } else {
                result = `${sign}${Math.round(absNum * 100).toLocaleString()}만`;
            }
            return result + '원';
        }
    } catch (e) {
        return val;
    }
};

// 초보자 가이드 데이터
const EASY_GUIDE: Record<string, { title: string; desc: string }> = {
    '1': { title: '💰 수익성 분석 (얼마나 효율적으로 버는가?)', desc: '이 지표들은 남의 돈 안 쓰고 내 돈(자본)으로 얼마나 알짜배기 장사를 했는지 보여줍니다. ROE가 높을수록 효율적인 기업입니다.' },
    '2': { title: '🚀 성장성 분석 (얼마나 빨리 크는가?)', desc: '작년보다 매출이나 이익이 얼마나 늘었는지 보여줍니다. 숫자가 클수록 회사가 빠르게 성장하고 있다는 뜻입니다.' },
    '3': { title: '🛡️ 안정성 분석 (튼튼한 회사인가?)', desc: '빌린 돈(부채)이 너무 많지는 않은지, 갑자기 돈을 갚아야 할 때 바로 줄 수 있는 돈이 있는지 체크합니다.' },
    '4': { title: '⚙️ 활동성 분석 (얼마나 바쁘게 움직이는가?)', desc: '가진 자산을 놀리지 않고 얼마나 빠르게 회전시켜서 매출을 일으키는지 보여줍니다.' }
};

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

// 카테고리별 핵심 지표 (가독성 요약용)
const CORE_INDICATORS: Record<string, string[]> = {
    '1': ['영업이익률', '매출액순이익률', 'ROE', 'ROA', 'EBITDA마진율'],
    '2': ['매출액증가율', '영업이익증가율', '순이익증가율', 'EPS증가율', '총자산증가율'],
    '3': ['부채비율', '유동비율', '이자보상배율', '유보율', '당좌비율'],
    '4': ['총자산회전율', '매출채권회전율', '재고자산회전율', '매입채무회전율']
};

export default function TurboQuantIndicators({ symbol, stockName, showEasy }: Props) {
    const [freq, setFreq] = useState('0'); // 0: 연간, 1: 분기
    const [finGubun, setFinGubun] = useState('MAIN'); // Default to MAIN
    const [category, setCategory] = useState('1'); // 1: 수익성, 2: 성장성, 3: 안정성, 4: 활동성
    const [data, setData] = useState<IndicatorsResponse['data'] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullView, setIsFullView] = useState(false); // 요약/전체보기 상태

    const fetchData = async () => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const cleanSymbol = symbol.split('.')[0];
            const response = await fetch(`${API_BASE_URL}/api/stock/${cleanSymbol}/indicators?freq=${freq}&finGubun=${finGubun}&category=${category}`);
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
    }, [symbol, freq, finGubun, category]);

    // 지표 필터링 로직 (요약 모드인 경우 핵심 지표만)
    const filteredRows = useMemo(() => {
        if (!data || !Array.isArray(data.rows)) return [];
        if (isFullView) return data.rows;
        
        const coreList = CORE_INDICATORS[category] || [];
        // 지표 이름에 핵심 키워드가 포함된 것만 필터링
        return data.rows.filter(row => row && typeof row.label === 'string' && coreList.some(core => row.label.includes(core)));
    }, [data, category, isFullView]);

    if (!symbol) return null;

    // 차트 데이터 변환
    const getChartData = () => {
        if (!data || !Array.isArray(data.rows) || data.rows.length === 0 || !Array.isArray(data.years)) return [];
        const chartData: any[] = [];
        data.years.forEach((year, idx) => {
            const entry: any = { name: year };
            // 상위 3개 지표를 차트에 표시
            data.rows.slice(0, 3).forEach(row => {
                const valStr = String(row.values?.[idx] || '0');
                const val = parseFloat(valStr.replace(/,/g, ''));
                entry[row.label] = isNaN(val) ? 0 : val;
            });
            chartData.push(entry);
        });
        return chartData;
    };

    const getCategoryTitle = () => {
        return CATEGORIES.find(c => c.value === category)?.label || '재무 지표';
    };

    return (
        <div className="w-full overflow-hidden mt-2">
            {/* Nav Categories */}
            <div className="flex border-b border-white/10 bg-white/5 overflow-x-auto no-scrollbar">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => {
                            setCategory(cat.value);
                            setIsFullView(false); // 카테고리 이동 시 다시 요약모드로
                        }}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap notranslate
                            ${category === cat.value 
                                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500 shadow-[inset_0_-2px_10px_rgba(79,70,229,0.3)]' 
                                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
                            }`}
                        translate="no"
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Header & Filters */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 to-indigo-600/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 mb-2 notranslate" translate="no">
                            <BarChart3 className="w-7 h-7 text-indigo-400" />
                            터보퀸트 정밀 진단 <span className="text-[10px] text-indigo-500/50 font-normal">v2.3</span>: <span className="text-indigo-400">{getCategoryTitle()}</span>
                        </h3>
                        <p className="text-slate-400 text-sm font-medium">
                            {stockName ? `${stockName}(${symbol})` : symbol} 실시간 데이터 가독성 엔진 가동 중
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Freq Toggle */}
                        <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center">
                            {['0', '1'].map(f => (
                                <button 
                                    key={f}
                                    onClick={() => setFreq(f)}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all notranslate ${freq === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    translate="no"
                                >
                                    {f === '0' ? '연간' : '분기'}
                                </button>
                            ))}
                        </div>

                        {/* Gubun Select */}
                        <div className="relative group">
                            <select 
                                value={finGubun}
                                onChange={(e) => setFinGubun(e.target.value)}
                                className="bg-white/5 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2.5 outline-none hover:bg-white/10 transition-all appearance-none pr-8 cursor-pointer notranslate"
                                translate="no"
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
                {/* Beginner Guide Banner */}
                {showEasy && EASY_GUIDE[category] && (
                    <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-5 h-5 text-emerald-400" />
                            <h4 className="font-black text-emerald-400 text-sm">{EASY_GUIDE[category].title}</h4>
                        </div>
                        <p className="text-emerald-100/70 text-xs leading-relaxed">{EASY_GUIDE[category].desc}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-slate-400 font-bold animate-pulse text-sm">터보 엔진이 지표 데이터를 실시간 분석 중입니다...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4 text-red-300">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <span className="font-bold text-sm">{error}</span>
                    </div>
                ) : data && Array.isArray(data.rows) && data.rows.length > 0 ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Chart Area */}
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 shadow-inner">
                            <h4 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2 notranslate" translate="no">
                                <TrendingUp className="w-4 h-4 text-indigo-400" /> {getCategoryTitle()} 지표 추이 분석
                            </h4>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={getChartData()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis 
                                            stroke="#94a3b8" 
                                            fontSize={11} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tickFormatter={(val) => {
                                                if (Math.abs(val) >= 100) return `${(val/100).toFixed(0)}억`;
                                                return val;
                                            }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '12px' }}
                                            formatter={(value, name) => [formatInvestValue(value, String(name)), name]}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                        {Object.keys(getChartData()[0] || {}).filter(k => k !== 'name').map((key, i) => (
                                            <Line 
                                                key={key} 
                                                name={key} 
                                                type="monotone" 
                                                dataKey={key} 
                                                stroke={i === 0 ? '#6366f1' : i === 1 ? '#10b981' : i === 2 ? '#f59e0b' : '#ef4444'} 
                                                strokeWidth={3} 
                                                dot={{ r: 4 }} 
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Table Area */}
                        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-x-auto shadow-xl">
                            <table className="w-full text-left border-collapse min-w-[800px]" translate="no">
                                <thead>
                                    <tr className="bg-white/10 border-b border-white/10">
                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-[#0e1629] z-10 notranslate" translate="no">항목</th>
                                        {Array.isArray(data.years) && data.years.map(y => (
                                            <th key={y} className="p-4 text-xs font-black text-slate-300 text-center notranslate" translate="no">{y}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.map((row, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                            <td className="p-4 text-sm font-bold text-slate-200 sticky left-0 bg-[#0e1629]/95 z-10 border-r border-white/5 group-hover:text-indigo-400 transition-colors notranslate" translate="no">
                                                {row.label}
                                            </td>
                                            {Array.isArray(row.values) && row.values.map((val, vIdx) => {
                                                const rawVal = parseFloat(String(val || '0').replace(/,/g, ''));
                                                const isNegative = !isNaN(rawVal) && rawVal < 0;
                                                
                                                // 헬퍼 함수를 통한 통합 포맷팅
                                                let displayVal = formatInvestValue(val, row.label);
                                                
                                                return (
                                                    <td key={vIdx} className={`p-4 text-sm font-medium text-center ${isNegative ? 'text-red-400' : 'text-slate-300'} whitespace-nowrap`}>
                                                        {displayVal}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Toggle Button */}
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={() => setIsFullView(!isFullView)}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-slate-300 transition-all shadow-lg active:scale-95 notranslate"
                                translate="no"
                            >
                                {isFullView ? (
                                    <>
                                        <Minus className="w-4 h-4 text-indigo-400" />
                                        핵심 지표만 보기 (요약 모드)
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 text-indigo-400" />
                                        세부 지표 전체 보기 (+{(Array.isArray(data?.rows) && Array.isArray(filteredRows)) ? (data.rows.length - filteredRows.length) : 0}개)
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start gap-4 shadow-lg">
                            <ShieldCheck className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                            <div>
                                <h5 className="text-indigo-300 text-sm font-black mb-1 notranslate" translate="no">터보퀸트 정밀 분석 가이드</h5>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                    이 화면의 데이터는 실시간 공시 지표를 바탕으로 파싱되었습니다. 현재 **핵심 요약 모드**가 활성화되어 있어 투자 결정에 가장 중요한 지표들만 선별하여 보여드립니다. 
                                    상단의 탭을 통해 수익성, 성장성, 안정성, 활동성 데이터를 입체적으로 분석하세요.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-24 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-bounce" />
                        <p className="text-slate-400 font-bold">{error || '선택하신 조건(회계기준/주기)의 데이터를 분석 중이거나 불러올 수 없습니다.'}</p>
                        <p className="text-slate-600 text-xs mt-2 italic">종목 코드(6자리)를 입력하시면 더 정확한 데이터 조회가 가능합니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
