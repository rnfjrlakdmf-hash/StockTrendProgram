"use client";

import React from 'react';
import { TrendingUp, TrendingDown, Activity, Globe, Zap, BarChart3 } from 'lucide-react';

interface EtfItem {
    rank: number;
    symbol: string;
    name: string;
    price: string | number;
    price_krw?: string;
    change: string;
    change_percent: number;
    volume?: string;
}

interface EtfRankingWidgetProps {
    data: EtfItem[];
    market: 'KR' | 'US';
    loading?: boolean;
}

export default function EtfRankingWidget({ data, market, loading }: EtfRankingWidgetProps) {
    const formatPrice = (val: string | number) => {
        if (typeof val === 'number') return val.toLocaleString();
        return val;
    };

    const isPositive = (change: string) => change.includes('▲') || (!change.includes('▼') && parseFloat(change) > 0);
    const isNegative = (change: string) => change.includes('▼') || change.includes('-');

    return (
        <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
            
            <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
                        {market === 'KR' ? <BarChart3 className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">
                            {market === 'KR' ? '국내 ETF 랭킹' : '미국 주요 ETF'}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            Real-time Market Statistics
                        </p>
                    </div>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-xs text-blue-400 font-bold animate-pulse">
                        <Activity className="w-3 h-3" />
                        UPDATING
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                {data.length > 0 ? (
                    data.map((item, idx) => {
                        const positive = isPositive(item.change);
                        const negative = isNegative(item.change);
                        const colorClass = positive ? 'text-red-400' : negative ? 'text-blue-400' : 'text-gray-400';
                        const bgColorClass = positive ? 'bg-red-500/5' : negative ? 'bg-blue-500/5' : 'bg-gray-500/5';
                        const borderColorClass = positive ? 'border-red-500/10' : negative ? 'border-blue-500/10' : 'border-white/5';

                        return (
                            <div 
                                key={item.symbol + idx}
                                className={`flex items-center justify-between p-4 rounded-2xl border ${borderColorClass} ${bgColorClass} hover:bg-white/5 transition-all group/item cursor-pointer`}
                                onClick={() => window.location.href = `/analysis?symbol=${item.symbol}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-sm ${idx < 3 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-500'}`}>
                                        {item.rank || idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-gray-100 group-hover/item:text-white transition-colors truncate max-w-[140px]">
                                            {item.name}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-gray-500 uppercase">{item.symbol}</span>
                                            {item.volume && (
                                                <span className="text-[10px] text-gray-600 font-bold">Vol: {parseInt(item.volume).toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0">
                                    <div className={`text-sm md:text-base font-black font-mono tracking-tighter ${colorClass}`}>
                                        {positive && '▲'}{negative && '▼'}{String(item.change || '0%').replace(/[▲▼+%-]/g, '')}%
                                    </div>
                                    <div className="text-[11px] font-bold text-gray-400">
                                        {formatPrice(item.price)}{market === 'US' ? '$' : '원'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="inline-flex p-4 rounded-3xl bg-white/5 mb-4">
                            <Activity className="w-8 h-8 text-gray-700 animate-pulse" />
                        </div>
                        <p className="text-gray-500 font-bold">ETF 데이터를 불러오는 중입니다...</p>
                    </div>
                )}
            </div>

            {market === 'KR' && (
                <div className="mt-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="text-xs text-blue-200/80 leading-relaxed font-medium">
                        국내 ETF 수치는 거래소 실시간 데이터를 기반으로 하며, <span className="text-blue-400 font-bold underline">레버리지/인버스/배당주</span> 등 유형별 통계를 객관적으로 집계합니다.
                    </p>
                </div>
            )}
        </div>
    );
}
