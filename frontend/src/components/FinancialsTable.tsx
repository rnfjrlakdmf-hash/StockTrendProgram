"use client";

import React from 'react';

interface FinancialMetric {
    dates: string[];
    values: (number | null)[];
}

interface FinancialsTableProps {
    data: Record<string, FinancialMetric> | null;
}

const METRIC_LABELS: Record<string, string> = {
    revenue: "매출액 (억원)",
    operating_income: "영업이익 (억원)",
    net_income: "당기순이익 (억원)",
    operating_margin: "영업이익률 (%)",
    net_income_margin: "순이익률 (%)",
    roe: "ROE (자기자본이익률)",
    roa: "ROA (총자산이익률)",
    debt_ratio: "부채비율 (%)",
    quick_ratio: "당좌비율 (%)",
    reserve_ratio: "유보율 (%)",
    eps: "EPS (주당순이익)",
    bps: "BPS (주당장부가치)",
    per: "PER (배)",
    pbr: "PBR (배)",
    dps: "주당배당금 (원)",
    dividend_yield: "시가배당률 (%)",
    payout_ratio: "배당성향 (%)"
};

export default function FinancialsTable({ data }: FinancialsTableProps) {
    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p>재무제표 데이터를 불러올 수 없습니다.</p>
                <p className="text-xs mt-2">기업별 데이터 제공 사정에 따라 차이가 있을 수 있습니다.</p>
            </div>
        );
    }

    // Use dates from revenue or any other metric
    const firstMetric = Object.values(data)[0];
    if (!firstMetric || !firstMetric.dates || firstMetric.dates.length === 0) {
        return <div className="text-center py-10 text-gray-500">표시할 데이터가 없습니다.</div>;
    }

    const dates = firstMetric.dates;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    📋 기업 상세 실적 분석
                </h4>
                <span className="text-xs text-gray-400 font-medium">* 연간/분기 실적 기준</span>
            </div>

            <div className="overflow-x-auto bg-black/40 rounded-2xl border border-white/10 shadow-xl scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="py-4 px-4 text-gray-400 text-sm font-bold sticky left-0 bg-black/80 z-10 backdrop-blur-md">주요 지표</th>
                            {dates.map((date, idx) => (
                                <th key={idx} className={`py-4 px-4 text-sm font-bold text-center ${idx === dates.length - 1 ? 'text-blue-400 bg-blue-400/5' : 'text-gray-300'}`}>
                                    {date}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {Object.keys(METRIC_LABELS).map((key) => {
                            const metric = data[key];
                            if (!metric) return null;

                            return (
                                <tr key={key} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-3 px-4 text-sm font-medium text-gray-300 sticky left-0 bg-black/80 group-hover:bg-gray-900 transition-colors z-10 backdrop-blur-md border-r border-white/5">
                                        {METRIC_LABELS[key]}
                                    </td>
                                    {metric.values.map((val, idx) => (
                                        <td key={idx} className={`py-3 px-4 text-center font-mono text-sm ${idx === dates.length - 1 ? 'bg-blue-400/5' : ''}`}>
                                            {val === null ? (
                                                <span className="text-gray-600">-</span>
                                            ) : (
                                                <span className={`${val > 0 ? 'text-gray-100' : val < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                    {val.toLocaleString()}
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 p-3 bg-blue-900/10 rounded-xl border border-blue-500/20">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                    실적 데이터는 네이버 금융 정보를 바탕으로 제공됩니다. 예상(E) 수치는 증권사 컨센서스 자료이며 실제 결과와 다를 수 있으므로 투자 시 유의해 주시기 바랍니다.
                </p>
            </div>
        </div>
    );
}
