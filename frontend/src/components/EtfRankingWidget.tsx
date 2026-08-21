"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    TrendingUp, TrendingDown, Activity, Globe, Zap, BarChart3, 
    Search, LayoutGrid, List, ArrowUpDown, Filter, Sparkles, 
    ExternalLink, ChevronRight, ShieldAlert, ArrowUpRight
} from 'lucide-react';

export interface EtfItem {
    rank: number;
    symbol: string;
    name: string;
    brand?: string;
    category_name?: string;
    price: string | number;
    price_num?: number;
    price_krw?: string;
    change: string;
    change_val?: number;
    change_percent: number;
    volume?: string;
    volume_num?: number;
    amount?: string;
    amount_num?: number;
    market_sum?: string;
    market_sum_num?: number;
    nav?: string;
    nav_num?: number;
    nav_gap?: string;
    nav_gap_num?: number;
    three_month_return?: string;
    three_month_num?: number;
}

interface EtfRankingWidgetProps {
    data: EtfItem[];
    loading: boolean;
    market: 'KR' | 'US';
    filterKeyword?: string | null;
}

type SortField = 'volume' | 'amount' | 'change_high' | 'change_low' | 'nav_gap' | 'three_month';

export default function EtfRankingWidget({ data, loading, market, filterKeyword }: EtfRankingWidgetProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('volume');
    const [displayLimit, setDisplayLimit] = useState<number>(50); // 기본 50위까지 표시

    const isPositive = (val: string | number | undefined, percent?: number) => {
        if (percent !== undefined) return percent > 0;
        if (val === undefined || val === null) return false;
        const strVal = String(val);
        return strVal.includes('▲') || strVal.includes('+') || (!strVal.includes('▼') && !strVal.includes('-') && strVal !== '0' && strVal !== '0%');
    };
    
    const isNegative = (val: string | number | undefined, percent?: number) => {
        if (percent !== undefined) return percent < 0;
        if (val === undefined || val === null) return false;
        const strVal = String(val);
        return strVal.includes('▼') || strVal.includes('-');
    };

    const formatPrice = (val: string | number | undefined) => {
        if (!val) return '0';
        if (typeof val === 'number') return val.toLocaleString();
        return parseInt(String(val).replace(/,/g, '')).toLocaleString();
    };

    // 브랜드별 배지 컬러
    const getBrandColor = (brand?: string) => {
        switch (brand?.toUpperCase()) {
            case 'KODEX': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
            case 'TIGER': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
            case 'ACE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            case 'SOL': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
            case 'PLUS': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
            case 'RISE': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            default: return 'text-gray-300 bg-white/5 border-white/10';
        }
    };

    // 실시간 검색 및 정렬 필터 적용
    const processedData = useMemo(() => {
        let list = Array.isArray(data) ? [...data] : [];

        // 1. 검색어 필터
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(item => 
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.symbol && item.symbol.toLowerCase().includes(query)) ||
                (item.brand && item.brand.toLowerCase().includes(query)) ||
                (item.category_name && item.category_name.toLowerCase().includes(query))
            );
        }

        // 2. 정렬 필터
        list.sort((a, b) => {
            if (sortField === 'volume') {
                const volA = a.volume_num || parseInt(String(a.volume || 0).replace(/,/g, '')) || 0;
                const volB = b.volume_num || parseInt(String(b.volume || 0).replace(/,/g, '')) || 0;
                return volB - volA;
            }
            if (sortField === 'amount') {
                const amtA = a.amount_num || 0;
                const amtB = b.amount_num || 0;
                return amtB - amtA;
            }
            if (sortField === 'change_high') {
                return (b.change_percent || 0) - (a.change_percent || 0);
            }
            if (sortField === 'change_low') {
                return (a.change_percent || 0) - (b.change_percent || 0);
            }
            if (sortField === 'nav_gap') {
                return Math.abs(b.nav_gap_num || 0) - Math.abs(a.nav_gap_num || 0);
            }
            if (sortField === 'three_month') {
                return (b.three_month_num || 0) - (a.three_month_num || 0);
            }
            return 0;
        });

        // 3. 표시 개수 제한
        return list.slice(0, displayLimit);
    }, [data, searchQuery, sortField, displayLimit]);

    return (
        <div className="p-5 md:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
            
            {/* Header & Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">ETF Statistics</span>
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            TOP {displayLimit}
                        </span>
                    </div>
                    <p className="text-gray-400 font-medium text-xs">
                        거래량 및 거래대금 상위 {market === 'KR' ? '국내' : '미국'} ETF의 실시간 가격, NAV, 괴리율 통계 데이터입니다.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE 실시간 집계</span>
                    </div>

                    {/* 뷰 모드 토글 (그리드 vs 테이블) */}
                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'grid' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                            title="2열 카드 그리드 뷰"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'table' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                            title="상세 표(Table) 뷰"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Controls Bar: 실시간 검색 + 정렬 옵션 + 표시 개수 */}
            <div className="space-y-3 mb-6 relative z-10 bg-black/40 border border-white/10 p-3.5 md:p-4 rounded-2xl">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    {/* 실시간 검색창 */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ETF 종목명, 브랜드, 코드 검색 (예: KODEX 200, TIGER, 반도체, 레버리지...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder-gray-500 text-xs md:text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white bg-white/10 px-1.5 py-0.5 rounded"
                            >
                                지우기
                            </button>
                        )}
                    </div>

                    {/* 정렬 필터 */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
                        <span className="text-[11px] font-bold text-gray-400 shrink-0 flex items-center gap-1 hidden sm:flex">
                            <ArrowUpDown className="w-3 h-3 text-blue-400" /> 정렬:
                        </span>
                        {[
                            { id: 'volume', label: '거래량순' },
                            { id: 'amount', label: '거래대금순' },
                            { id: 'change_high', label: '급등순' },
                            { id: 'change_low', label: '급락순' },
                            { id: 'nav_gap', label: '괴리율순' },
                            { id: 'three_month', label: '3M수익률' }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSortField(s.id as SortField)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                    sortField === s.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* 표시 개수 선택 (20, 50, 100) */}
                    <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/10 shrink-0">
                        {[20, 50, 100].map((num) => (
                            <button
                                key={num}
                                onClick={() => setDisplayLimit(num)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                                    displayLimit === num
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {num}개
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 1. GRID CARD VIEW (2열 카드 모드) */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 relative z-10">
                    {processedData.length > 0 ? (
                        processedData.map((item, idx) => {
                            const positive = isPositive(item.change, item.change_percent);
                            const negative = isNegative(item.change, item.change_percent);
                            const colorClass = positive ? 'text-red-400' : negative ? 'text-blue-400' : 'text-gray-400';
                            const badgeBg = positive ? 'bg-red-500/10 text-red-400 border-red-500/20' : negative ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20';

                            // 순위 뱃지 스타일 (1위: 골드, 2위: 실버, 3위: 브론즈)
                            const rank = item.rank || idx + 1;
                            const rankBadgeStyle = rank === 1
                                ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-black font-black shadow-lg shadow-amber-500/30'
                                : rank === 2
                                ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black font-black shadow-md'
                                : rank === 3
                                ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white font-black'
                                : 'bg-white/5 border border-white/10 text-gray-400 font-bold';

                            return (
                                <Link 
                                    key={item.symbol + idx}
                                    href={`/etf-analysis?symbol=${item.symbol}`}
                                    className="block group"
                                >
                                    <article className="h-full flex flex-col justify-between bg-black/40 hover:bg-zinc-800/60 border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 md:p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden">
                                        <div>
                                            {/* 상단: 순위 + 브랜드 태그 + 자산군 + 바로가기 아이콘 */}
                                            <div className="flex items-center justify-between gap-2 mb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs tabular-nums ${rankBadgeStyle}`}>
                                                        {rank}
                                                    </div>
                                                    {item.brand && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBrandColor(item.brand)}`}>
                                                            {item.brand}
                                                        </span>
                                                    )}
                                                    {item.category_name && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 hidden sm:inline">
                                                            {item.category_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-mono text-gray-500 tracking-wider">
                                                        {item.symbol}
                                                    </span>
                                                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                                                </div>
                                            </div>

                                            {/* 종목명 & 현재가 / 등락률 */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <h3 className="font-bold text-sm md:text-base text-gray-100 group-hover:text-blue-300 transition-colors line-clamp-1 leading-snug flex-1">
                                                    {item.name}
                                                </h3>
                                                <div className="text-right shrink-0">
                                                    <div className="text-sm md:text-base font-black text-white tabular-nums tracking-tight">
                                                        {formatPrice(item.price)}{market === 'US' ? '$' : '원'}
                                                    </div>
                                                    <div className={`text-xs font-bold tabular-nums tracking-tight ${colorClass}`}>
                                                        {positive ? '▲' : negative ? '▼' : ''}
                                                        {Math.abs(item.change_percent || 0).toFixed(2)}%
                                                        {item.change_val !== undefined && (
                                                            <span className="text-[10px] text-gray-400 ml-1">
                                                                ({positive ? '+' : ''}{item.change_val.toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 하단 세부 데이터 지표 그리드 (거래대금, 거래량, NAV, 괴리율, 3M수익률) */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2.5 border-t border-white/5 text-[10px] md:text-[11px]">
                                            {/* 거래대금 */}
                                            <div className="bg-white/5 rounded-lg p-1.5 px-2">
                                                <div className="text-gray-500 text-[9px] font-medium">거래대금</div>
                                                <div className="font-bold text-gray-200 truncate">{item.amount || '-'}</div>
                                            </div>

                                            {/* 거래량 */}
                                            <div className="bg-white/5 rounded-lg p-1.5 px-2">
                                                <div className="text-gray-500 text-[9px] font-medium">거래량</div>
                                                <div className="font-bold text-gray-200 truncate">
                                                    {item.volume ? parseInt(String(item.volume).replace(/,/g, '')).toLocaleString() : '-'}
                                                </div>
                                            </div>

                                            {/* 실시간 NAV & 괴리율 */}
                                            <div className="bg-white/5 rounded-lg p-1.5 px-2">
                                                <div className="text-gray-500 text-[9px] font-medium">실시간 NAV (괴리율)</div>
                                                <div className="font-bold text-gray-200 truncate">
                                                    {item.nav || '-'}
                                                    {item.nav_gap && (
                                                        <span className={`ml-1 text-[10px] ${
                                                            Math.abs(item.nav_gap_num || 0) > 1.0 ? 'text-amber-400 font-black' : 'text-emerald-400'
                                                        }`}>
                                                            ({item.nav_gap})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 3개월 수익률 */}
                                            <div className="bg-white/5 rounded-lg p-1.5 px-2">
                                                <div className="text-gray-500 text-[9px] font-medium">3개월 수익률</div>
                                                <div className={`font-bold truncate ${
                                                    (item.three_month_num || 0) > 0 ? 'text-red-400' : (item.three_month_num || 0) < 0 ? 'text-blue-400' : 'text-gray-400'
                                                }`}>
                                                    {item.three_month_return || '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-20 text-center">
                            <Activity className={`w-8 h-8 mx-auto mb-3 ${loading ? 'text-blue-500 animate-spin' : 'text-gray-600'}`} />
                            <p className="text-gray-400 font-bold text-sm">
                                {loading ? '실시간 ETF 랭킹 데이터를 동기화 중입니다...' : '검색 조건에 일치하는 ETF 종목이 없습니다.'}
                            </p>
                            {!loading && searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-3 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold"
                                >
                                    검색 초기화
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 2. TABLE VIEW (상세 표 모드) */}
            {viewMode === 'table' && (
                <div className="relative z-10 overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                            <tr>
                                <th className="p-3 text-center w-12">순위</th>
                                <th className="p-3">종목명 / 티커</th>
                                <th className="p-3 text-right">현재가</th>
                                <th className="p-3 text-right">등락률</th>
                                <th className="p-3 text-right">거래대금</th>
                                <th className="p-3 text-right">거래량</th>
                                <th className="p-3 text-right">실시간 NAV</th>
                                <th className="p-3 text-right">괴리율</th>
                                <th className="p-3 text-right">3M수익률</th>
                                <th className="p-3 text-center">분석</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {processedData.map((item, idx) => {
                                const positive = isPositive(item.change, item.change_percent);
                                const negative = isNegative(item.change, item.change_percent);
                                const colorClass = positive ? 'text-red-400' : negative ? 'text-blue-400' : 'text-gray-400';
                                const rank = item.rank || idx + 1;

                                return (
                                    <tr 
                                        key={item.symbol + idx}
                                        className="hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => window.location.href = `/etf-analysis?symbol=${item.symbol}`}
                                    >
                                        <td className="p-3 text-center font-bold text-gray-400">{rank}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-gray-100 hover:text-blue-400 transition-colors">
                                                {item.name}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                                                <span>{item.symbol}</span>
                                                {item.brand && (
                                                    <span className={`px-1 rounded text-[9px] ${getBrandColor(item.brand)}`}>
                                                        {item.brand}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right font-mono font-bold text-white">
                                            {formatPrice(item.price)}{market === 'US' ? '$' : '원'}
                                        </td>
                                        <td className={`p-3 text-right font-mono font-bold ${colorClass}`}>
                                            {positive ? '▲' : negative ? '▼' : ''}{Math.abs(item.change_percent || 0).toFixed(2)}%
                                        </td>
                                        <td className="p-3 text-right font-mono text-gray-200">{item.amount || '-'}</td>
                                        <td className="p-3 text-right font-mono text-gray-400">
                                            {item.volume ? parseInt(String(item.volume).replace(/,/g, '')).toLocaleString() : '-'}
                                        </td>
                                        <td className="p-3 text-right font-mono text-gray-300">{item.nav || '-'}</td>
                                        <td className={`p-3 text-right font-mono ${
                                            Math.abs(item.nav_gap_num || 0) > 1.0 ? 'text-amber-400 font-bold' : 'text-emerald-400'
                                        }`}>
                                            {item.nav_gap || '-'}
                                        </td>
                                        <td className={`p-3 text-right font-mono font-bold ${
                                            (item.three_month_num || 0) > 0 ? 'text-red-400' : (item.three_month_num || 0) < 0 ? 'text-blue-400' : 'text-gray-400'
                                        }`}>
                                            {item.three_month_return || '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 하단 팁 */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-white/10 text-[11px] text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span>
                        ETF 종목을 클릭하면 <strong className="text-gray-300">실시간 차트, 보유 종목 TOP10, 수급 분석</strong> 상세 화면으로 이동합니다.
                    </span>
                </div>
                <div className="text-gray-400">
                    괴리율(NAV Gap)이 ±1% 이상 벌어진 종목은 <span className="text-amber-400 font-bold">주황색</span>으로 주의 표시됩니다.
                </div>
            </div>
        </div>
    );
}
