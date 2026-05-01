"use client";

import React, { useState } from 'react';

interface FinancialMetric {
    dates: string[];
    values: (number | null)[];
}

interface FinancialsTableProps {
    data: any | null;
    currency?: string;
}

const METRIC_CONFIG: Record<string, {
    label: string;
    unit: string;
    description: string;
    emoji: string;
    higherIsBetter: boolean;
    format: 'number' | 'percent' | 'ratio';
}> = {
    revenue:          { label: "매출액",     unit: "억원", emoji: "💰", description: "회사가 영업으로 벌어들인 총 수입", higherIsBetter: true,  format: 'number' },
    operating_income: { label: "영업이익",   unit: "억원", emoji: "📈", description: "팔아서 남긴 실제 이익 (매출 - 비용)", higherIsBetter: true,  format: 'number' },
    net_income:       { label: "순이익",     unit: "억원", emoji: "🏦", description: "세금·이자 다 빼고 최종 남는 돈", higherIsBetter: true,  format: 'number' },
    operating_margin: { label: "영업이익률", unit: "%",    emoji: "📊", description: "매출 100원 중 영업이익이 얼마인지 (높을수록 좋음)", higherIsBetter: true,  format: 'percent' },
    net_income_margin:{ label: "순이익률",   unit: "%",    emoji: "✅", description: "매출 100원 중 최종 순이익이 얼마인지", higherIsBetter: true,  format: 'percent' },
    roe:              { label: "ROE",        unit: "%",    emoji: "💡", description: "내 돈 대비 얼마나 벌었나 (10% 이상이면 우수)", higherIsBetter: true,  format: 'percent' },
    debt_ratio:       { label: "부채비율",   unit: "%",    emoji: "⚠️",  description: "빚이 얼마나 있나 (낮을수록 안전)", higherIsBetter: false, format: 'percent' },
    quick_ratio:      { label: "당좌비율",   unit: "%",    emoji: "🛡️", description: "갑자기 빚 갚아달라면 갚을 수 있나 (100% 이상 안전)", higherIsBetter: true,  format: 'percent' },
    reserve_ratio:    { label: "유보율",     unit: "%",    emoji: "🏗️", description: "회사에 쌓아둔 이익잉여금 비율 (높을수록 탄탄)", higherIsBetter: true,  format: 'percent' },
    eps:              { label: "EPS",        unit: "원",   emoji: "🔢", description: "주식 1주가 1년간 번 순이익", higherIsBetter: true,  format: 'number' },
    per:              { label: "PER",        unit: "배",   emoji: "💹", description: "본전 뽑는 데 걸리는 연수 (낮으면 상대적 저평가)", higherIsBetter: false, format: 'ratio' },
    pbr:              { label: "PBR",        unit: "배",   emoji: "📉", description: "청산가치 대비 주가 (1배 이하면 자산 대비 저평가)", higherIsBetter: false, format: 'ratio' },
    bps:              { label: "BPS",        unit: "원",   emoji: "🏛️", description: "청산 시 1주당 돌려받는 가치", higherIsBetter: true,  format: 'number' },
    dps:              { label: "주당배당금", unit: "원",   emoji: "🎁", description: "1주 보유 시 받는 현금 배당금", higherIsBetter: true,  format: 'number' },
    dividend_yield:   { label: "배당수익률", unit: "%",    emoji: "💸", description: "현재 주가 대비 배당금 비율 (은행 이자처럼)", higherIsBetter: true,  format: 'percent' },
    payout_ratio:     { label: "배당성향",   unit: "%",    emoji: "🤝", description: "순이익 중 배당으로 나눠주는 비율", higherIsBetter: false, format: 'percent' },
};

// 카테고리로 그룹핑
const METRIC_GROUPS = [
    { title: "📈 실적", description: "회사가 얼마나 벌었는지", keys: ["revenue", "operating_income", "net_income"] },
    { title: "💰 수익성", description: "얼마나 효율적으로 버는지", keys: ["operating_margin", "net_income_margin", "roe"] },
    { title: "🛡️ 안정성", description: "빚이 많은지, 건강한지", keys: ["debt_ratio", "quick_ratio", "reserve_ratio"] },
    { title: "📊 주가 지표", description: "주가가 싼지 비싼지", keys: ["eps", "per", "pbr", "bps"] },
    { title: "🎁 배당", description: "얼마나 나눠주는지", keys: ["dps", "dividend_yield", "payout_ratio"] },
];

function formatValue(val: any, format: string, unit: string, currency?: string): string {
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num)) return '-';

    if (format === 'number') {
        if (currency === 'USD') {
            if (Math.abs(num) >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
            if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
            return `$${num.toLocaleString()}`;
        }
        if (unit === '억원') {
            if (Math.abs(num) >= 10000) return `${(num / 10000).toFixed(1)}조`;
            return num.toLocaleString();
        }
    }
    if (format === 'percent') return `${num.toFixed(1)}%`;
    if (format === 'ratio') return `${num.toFixed(2)}배`;
    return num.toLocaleString();
}

function getTrend(values: (number | null)[], idx: number): 'up' | 'down' | 'flat' | 'none' {
    if (idx === 0) return 'none';
    const curr = values[idx];
    const prev = values[idx - 1];
    if (curr === null || prev === null || prev === 0) return 'none';
    const diff = (curr - prev) / Math.abs(prev);
    if (diff > 0.03) return 'up';
    if (diff < -0.03) return 'down';
    return 'flat';
}

function getColorClass(val: number, higherIsBetter: boolean, isZero: boolean): string {
    if (isZero) return 'text-gray-500';
    if (higherIsBetter) {
        if (val > 0) return 'text-emerald-400';
        if (val < 0) return 'text-red-400';
        return 'text-gray-400';
    } else {
        // lower is better (부채, PER, PBR 등)
        return 'text-gray-200';
    }
}

export default function FinancialsTable({ data: rawData, currency }: FinancialsTableProps) {
    const [showEasyMode, setShowEasyMode] = useState(true);
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    const data = React.useMemo(() => {
        if (!rawData) return null;
        
        // If it's already in the correct format (Domestic), return as is
        if (Object.values(rawData).some(v => v && typeof v === 'object' && 'dates' in v)) {
            return rawData as Record<string, FinancialMetric>;
        }

        // If it's in the Global format (from yfinance), transform it
        if (rawData.detailed && (rawData.detailed.annual || rawData.detailed.quarterly)) {
            const annual = rawData.detailed.annual || [];
            const quarterly = rawData.detailed.quarterly || [];
            
            // Limit to 4 annual and 6 quarterly to match Domestic UI expectation (total 10)
            // Backend currently provides 4 annual and 4 quarterly
            const combinedDates = [...annual.map((a: any) => a.date), ...quarterly.map((q: any) => q.date)];
            
            const transform = (key: string) => {
                const values = [
                    ...annual.map((a: any) => a[key] !== undefined ? a[key] / 100000000 : null), // Convert to 100M KRW equivalent if possible? No, global is USD.
                    ...quarterly.map((q: any) => q[key] !== undefined ? q[key] / 100000000 : null)
                ];
                // Actually, for global, units might be different. Let's just keep raw numbers and handle in formatter.
                return { dates: combinedDates, values: [
                    ...annual.map((a: any) => a[key] ?? null),
                    ...quarterly.map((q: any) => q[key] ?? null)
                ] };
            };

            return {
                revenue: transform('revenue'),
                operating_income: transform('operating_income'),
                net_income: transform('net_income'),
                debt_ratio: { dates: combinedDates, values: combinedDates.map(() => rawData.debt_ratio || null) },
                per: { dates: combinedDates, values: combinedDates.map(() => rawData.detailed.summary?.per || null) },
                pbr: { dates: combinedDates, values: combinedDates.map(() => rawData.detailed.summary?.pbr || null) },
                roe: { dates: combinedDates, values: combinedDates.map(() => rawData.detailed.summary?.roe || null) },
            };
        }
        
        return null;
    }, [rawData]);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p>재무제표 데이터를 불러올 수 없습니다.</p>
                <p className="text-xs mt-2">기업별 데이터 제공 사정에 따라 차이가 있을 수 있습니다.</p>
            </div>
        );
    }

    const firstMetric = data ? Object.values(data)[0] : null;
    if (!firstMetric || !Array.isArray(firstMetric.dates) || firstMetric.dates.length === 0) {
        return <div className="text-center py-10 text-gray-500">표시할 데이터가 없습니다.</div>;
    }

    const dates = firstMetric.dates;
    
    // 연간/분기 데이터 분리 (네이버 금융 cop_analysis 기준: 앞 4개 연간, 뒤 6개 분기)
    const annualDates = dates.slice(0, 4);
    const quarterlyDates = dates.slice(4);

    const isEstimate = (d: string) => d?.includes('(E)');

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
            {/* 헤더 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        📋 기업 상세 실적 분석
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5 ml-7 italic">네이버 금융 제공 데이터 기반 (단위: 억원/원/%)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowEasyMode(!showEasyMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${showEasyMode ? 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                    >
                        💡 {showEasyMode ? '쉬운 설명 ON' : '쉬운 설명 OFF'}
                    </button>
                </div>
            </div>

            {/* 카테고리별 그룹 렌더링 */}
            {METRIC_GROUPS.map((group) => {
                const groupKeys = group.keys.filter(k => data[k]);
                if (groupKeys.length === 0) return null;

                return (
                    <div key={group.title} className="bg-black/40 rounded-2xl border border-white/10 shadow-xl overflow-hidden group/container">
                        {/* 그룹 제목 */}
                        <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{group.title}</span>
                            {showEasyMode && (
                                <span className="text-xs text-gray-400">{group.description}</span>
                            )}
                        </div>

                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    {/* 1층: 그룹 헤더 (연간 / 분기) */}
                                    <tr className="bg-white/2">
                                        <th className="py-1.5 px-4 sticky left-0 bg-black/90 z-20 w-32"></th>
                                        <th colSpan={annualDates.length} className="py-1.5 px-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 text-center border-b border-emerald-500/20 bg-emerald-500/5">
                                            📊 연간 실적 (Yearly)
                                        </th>
                                        <th colSpan={quarterlyDates.length} className="py-1.5 px-3 text-[10px] font-black uppercase tracking-widest text-blue-400 text-center border-b border-blue-500/20 bg-blue-500/5 border-l border-white/10">
                                            ⏰ 분기 실적 (Quarterly)
                                        </th>
                                    </tr>
                                    {/* 2층: 날짜 헤더 */}
                                    <tr className="border-b border-white/10">
                                        <th className="py-2 px-4 text-gray-500 text-[10px] font-black uppercase tracking-tighter sticky left-0 bg-black/90 z-20 backdrop-blur-md w-32 border-r border-white/5">지표</th>
                                        {dates.map((date, idx) => {
                                            const isQStart = idx === 4;
                                            return (
                                                <th 
                                                    key={idx} 
                                                    className={`py-2 px-3 text-xs font-bold text-center whitespace-nowrap ${
                                                        isEstimate(date) ? 'text-purple-400' : 'text-gray-300'
                                                    } ${isQStart ? 'border-l border-white/20' : ''}`}
                                                >
                                                    {date}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {groupKeys.map((key) => {
                                        const config = METRIC_CONFIG[key];
                                        const metric = data[key];
                                        if (!config || !metric) return null;

                                        return (
                                            <tr
                                                key={key}
                                                className="hover:bg-white/5 transition-colors group cursor-default"
                                                onMouseEnter={() => setHoveredKey(key)}
                                                onMouseLeave={() => setHoveredKey(null)}
                                            >
                                                {/* 지표 이름 */}
                                                <td className="py-3 px-4 sticky left-0 bg-black/80 group-hover:bg-gray-900/90 transition-colors z-10 backdrop-blur-md border-r border-white/5 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-base">{config.emoji}</span>
                                                        <div>
                                                            <div className="text-xs font-bold text-gray-200">{config.label}</div>
                                                            <div className="text-[9px] text-gray-500 uppercase font-bold">{config.unit}</div>
                                                        </div>
                                                    </div>
                                                    {/* 쉬운 설명 툴팁 */}
                                                    {showEasyMode && hoveredKey === key && (
                                                        <div className="absolute left-36 top-1 z-50 w-52 bg-indigo-950/95 border border-indigo-500/40 rounded-xl p-3 shadow-2xl text-xs text-gray-200 leading-relaxed pointer-events-none backdrop-blur-md">
                                                            <span className="text-yellow-300 font-bold block mb-1 flex items-center gap-1">
                                                                <span className="animate-pulse">💡</span> {config.label}이란?
                                                            </span>
                                                            {config.description}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* 값들 */}
                                                {metric.values.map((val, idx) => {
                                                    const isQuarter = idx >= 4;
                                                    const isQStart = idx === 4;
                                                    const trend = getTrend(metric.values, idx);
                                                    const colorClass = val !== null
                                                        ? getColorClass(val, config.higherIsBetter, val === 0)
                                                        : '';

                                                    return (
                                                        <td 
                                                            key={idx} 
                                                            className={`py-3 px-3 text-center transition-colors ${
                                                                isEstimate(dates[idx]) ? 'bg-purple-500/5' : isQuarter ? 'bg-blue-400/2' : 'bg-emerald-400/2'
                                                            } ${isQStart ? 'border-l border-white/20' : ''}`}
                                                        >
                                                            {val === null ? (
                                                                <span className="text-gray-700 text-sm">-</span>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className={`font-mono text-sm font-bold tracking-tight ${colorClass}`}>
                                                                        {formatValue(val, config.format, config.unit, currency)}
                                                                    </span>
                                                                    {/* 전기 대비 추세 */}
                                                                    {trend !== 'none' && showEasyMode && (
                                                                        <span className={`text-[10px] font-black ${
                                                                            trend === 'up'
                                                                                ? config.higherIsBetter ? 'text-emerald-400' : 'text-red-400'
                                                                                : trend === 'down'
                                                                                    ? config.higherIsBetter ? 'text-red-400' : 'text-emerald-400'
                                                                                    : 'text-gray-500'
                                                                        }`}>
                                                                            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '─'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {/* 하단 범례 */}
            {showEasyMode && (
                <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-white/3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-gray-500 font-medium">색상 의미:</span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400"><span className="text-base">■</span> 좋음(증가)</span>
                    <span className="flex items-center gap-1 text-[11px] text-red-400"><span className="text-base">■</span> 하락(악화)</span>
                    <span className="flex items-center gap-1 text-[11px] text-purple-400"><span className="text-base">■</span> 예상치(E)</span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">▲▼ 전기 대비</span>
                </div>
            )}

            <div className="mt-2 p-3 bg-blue-900/10 rounded-xl border border-blue-500/20 flex items-center justify-between">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                    실적 데이터는 네이버 금융 정보를 바탕으로 제공됩니다. 예상(E) 수치는 증권사 컨센서스 자료이며 실제 결과와 다를 수 있습니다.
                </p>
                <span className="text-[10px] text-blue-500/50 font-mono">v3.6.1</span>
            </div>
        </div>
    );
}
