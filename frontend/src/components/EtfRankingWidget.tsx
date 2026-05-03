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
    data: any[];
    loading: boolean;
    market: 'KR' | 'US';
    filterKeyword?: string | null;
}

export default function EtfRankingWidget({ data, loading, market, filterKeyword }: EtfRankingWidgetProps) {
    const isPositive = (val: string | undefined) => {
        if (!val) return false;
        return val.includes('▲') || val.includes('+') || (!val.includes('▼') && !val.includes('-') && val !== '0' && val !== '0%');
    };
    
    const isNegative = (val: string | undefined) => {
        if (!val) return false;
        return val.includes('▼') || val.includes('-');
    };

    const formatPrice = (val: string | number | undefined) => {
        if (!val) return '0';
        if (typeof val === 'number') return val.toLocaleString();
        return parseInt(val.replace(/,/g, '')).toLocaleString();
    };

    // Filter data if keyword exists
    const displayData = (Array.isArray(data) && filterKeyword)
        ? data.filter(item => 
            (item.name && item.name.toLowerCase().includes(filterKeyword.toLowerCase())) || 
            (item.symbol && item.symbol.toLowerCase().includes(filterKeyword.toLowerCase()))
          )
        : (Array.isArray(data) ? data : []);

    return (
        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full" />
            
            <div className="flex items-center justify-between mb-8 relative">
                <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter flex items-center gap-2">
                        Real-time Market <span className="text-blue-400">Statistics</span>
                        {filterKeyword && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-600 rounded-full text-white uppercase tracking-widest animate-pulse ml-2">
                                FILTER: {filterKeyword}
                            </span>
                        )}
                    </h2>
                    <p className="text-gray-500 font-bold text-[10px] md:text-xs">
                        거래량 상위 {market === 'KR' ? '국내' : '미국'} ETF 종목군을 실시간으로 집계한 데이터입니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Live Now</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                {Array.isArray(displayData) && displayData.length > 0 ? (
                    displayData.map((item, idx) => {
                        const positive = isPositive(item.change);
                        const negative = isNegative(item.change);
                        const colorClass = positive ? 'text-red-400' : negative ? 'text-blue-400' : 'text-gray-400';
                        const bgColorClass = positive ? 'bg-red-500/5' : negative ? 'bg-blue-500/5' : 'bg-gray-500/5';
                        const borderColorClass = positive ? 'border-red-500/10' : negative ? 'border-blue-500/10' : 'border-white/5';

                        return (
                            <div 
                                key={item.symbol + idx}
                                className={`flex items-center justify-between p-4 rounded-2xl border ${borderColorClass} ${bgColorClass} hover:bg-white/5 transition-all group/item cursor-pointer`}
                                onClick={() => window.location.href = `/etf-analysis?symbol=${item.symbol}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-sm ${idx < 3 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-500'}`}>
                                        {item.rank || idx + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-gray-100 group-hover/item:text-white transition-colors truncate text-xs md:text-sm">
                                            {item.name}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] md:text-[10px] font-mono text-gray-500 uppercase">{item.symbol}</span>
                                            {item.volume && (
                                                <span className="text-[9px] md:text-[10px] text-gray-600 font-bold hidden sm:inline">Vol: {parseInt(item.volume).toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0 ml-2">
                                    <div className={`text-xs md:text-sm lg:text-base font-black font-mono tracking-tighter ${colorClass}`}>
                                        {positive && '▲'}{negative && '▼'}{String(item.change || '0%').replace(/[▲▼+%-]/g, '')}%
                                    </div>
                                    <div className="text-[10px] md:text-[11px] font-bold text-gray-400">
                                        {formatPrice(item.price)}{market === 'US' ? '$' : '원'}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="inline-flex p-4 rounded-3xl bg-white/5 mb-4">
                            <Activity className={`w-8 h-8 ${loading ? 'text-blue-500 animate-spin' : 'text-gray-700'}`} />
                        </div>
                        <p className="text-gray-400 font-black text-base">
                            {loading ? '서버에서 최신 데이터를 동기화 중입니다...' : (filterKeyword ? '선택하신 조건에 맞는 종목이 현재 거래량 상위권에 없습니다.' : '데이터를 불러오는 데 실패했거나 현재 장외 시간입니다.')}
                        </p>
                        {!loading && filterKeyword && (
                            <p className="text-gray-600 text-[11px] mt-3 font-bold">
                                우측의 [정렬 초기화]를 눌러 전체 시장 상황을 먼저 확인해보세요.
                            </p>
                        )}
                        {!loading && !filterKeyword && (
                            <p className="text-gray-600 text-[11px] mt-3 font-bold">
                                일시적인 네트워크 장애일 수 있으니 잠시 후 다시 시도해주세요.
                            </p>
                        )}
                    </div>
                )}
                
                {Array.isArray(displayData) && displayData.length > 0 && (
                    <div className="col-span-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 group cursor-default">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <p className="text-[10px] md:text-xs text-gray-400 font-bold">
                            리스트의 각 종목을 <span className="text-blue-400">클릭</span>하면 차트와 실질적인 상세 리포트 데이터를 확인하실 수 있습니다.
                        </p>
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
