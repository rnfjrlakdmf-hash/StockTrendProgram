'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    TrendingUp, TrendingDown, Activity, Globe, Zap, BarChart3, 
    Search, LayoutGrid, List, ArrowUpDown, Filter, Sparkles, 
    ExternalLink, ChevronRight, ShieldAlert, ArrowUpRight,
    AlertTriangle, CheckCircle2, Clock, Coins, Building2, Flame,
    Layers, BookOpen, HelpCircle
} from 'lucide-react';
import AIDisclaimer from '@/components/AIDisclaimer';

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

type SortField = 'amount' | 'volume' | 'change_high' | 'change_low' | 'nav_gap' | 'three_month';

export default function EtfRankingWidget({ data, loading, market, filterKeyword }: EtfRankingWidgetProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('amount'); // 거래대금순 기본 (시장 활력 반영)
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

    // 브랜드별 배지 스타일 및 운용사 이름 매핑
    const getBrandInfo = (brand?: string) => {
        const b = brand?.toUpperCase() || '';
        if (b.includes('KODEX')) return { color: 'text-blue-300 bg-blue-500/20 border-blue-500/40', company: '삼성자산운용' };
        if (b.includes('TIGER')) return { color: 'text-orange-300 bg-orange-500/20 border-orange-500/40', company: '미래에셋' };
        if (b.includes('ACE')) return { color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40', company: '한국투자' };
        if (b.includes('SOL')) return { color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40', company: '신한자산' };
        if (b.includes('RISE') || b.includes('KBSTAR')) return { color: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40', company: 'KB자산운용' };
        if (b.includes('PLUS') || b.includes('ARIRANG')) return { color: 'text-purple-300 bg-purple-500/20 border-purple-500/40', company: '한화자산' };
        if (b.includes('KOSEF')) return { color: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/40', company: '키움자산' };
        if (b.includes('TIMEFOLIO')) return { color: 'text-rose-300 bg-rose-500/20 border-rose-500/40', company: '타임폴리오' };
        return { color: 'text-zinc-300 bg-white/10 border-white/15', company: '글로벌/기타' };
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
            if (sortField === 'amount') {
                const amtA = a.amount_num || 0;
                const amtB = b.amount_num || 0;
                return amtB - amtA;
            }
            if (sortField === 'volume') {
                const volA = a.volume_num || parseInt(String(a.volume || 0).replace(/,/g, '')) || 0;
                const volB = b.volume_num || parseInt(String(b.volume || 0).replace(/,/g, '')) || 0;
                return volB - volA;
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

    // 전체 데이터 기준 4대 매크로 통계 집계
    const macroStats = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) {
            return {
                totalAmountFormatted: '0원',
                topAmountName: '-',
                topAmountVal: '-',
                gapAlertCount: 0,
                topGainerName: '-',
                topGainerPct: 0
            };
        }

        // 총 거래대금 합계
        let totalAmt = 0;
        data.forEach(item => {
            totalAmt += (item.amount_num || 0);
        });

        const totalAmountFormatted = totalAmt >= 10000 
            ? `${(totalAmt / 10000).toFixed(1)}조원` 
            : `${totalAmt.toLocaleString()}억원`;

        // 거래대금 1위 종목
        const sortedByAmt = [...data].sort((a, b) => (b.amount_num || 0) - (a.amount_num || 0));
        const topAmount = sortedByAmt[0];

        // 괴리율 경보 종목 수 (절댓값 1.0% 초과)
        const gapAlertCount = data.filter(item => Math.abs(item.nav_gap_num || 0) >= 1.0).length;

        // 당일 최고 급등 종목
        const sortedByGain = [...data].sort((a, b) => (b.change_percent || 0) - (a.change_percent || 0));
        const topGainer = sortedByGain[0];

        return {
            totalAmountFormatted,
            topAmountName: topAmount?.name || '-',
            topAmountVal: topAmount?.amount || '-',
            gapAlertCount,
            topGainerName: topGainer?.name || '-',
            topGainerPct: topGainer?.change_percent || 0
        };
    }, [data]);

    return (
        <div className="space-y-6">
            {/* 1. 상단 4대 매크로 ETF 시장 통계 대시보드 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. 상위 50종목 총 거래대금 */}
                <div className="bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-blue-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-blue-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-blue-400" />
                            <span>상위 ETF 총 거래대금</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-md">
                            LIQUIDITY
                        </span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">
                        {macroStats.totalAmountFormatted}
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        {market === 'KR' ? '국내 대표 ETF 실시간 유동성 집계' : '글로벌 지수 ETF 거래 집계'}
                    </div>
                </div>

                {/* 2. 당일 거래대금 1위 주도주 */}
                <div className="bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-purple-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-purple-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-purple-400" />
                            <span>거래대금 1위 ETF</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md">
                            NO.1 FLOW
                        </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-white truncate mt-1" title={macroStats.topAmountName}>
                        {macroStats.topAmountName}
                    </div>
                    <div className="text-xs font-bold text-purple-300 font-mono mt-1">
                        거래대금: {macroStats.topAmountVal}
                    </div>
                </div>

                {/* 3. 괴리율 주의 종목 수 */}
                <div className={`p-4 sm:p-5 rounded-2xl border shadow-lg flex flex-col justify-between ${
                    macroStats.gapAlertCount > 0 
                        ? 'bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-black border-amber-500/40' 
                        : 'bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-black border-emerald-500/30'
                }`}>
                    <div className="flex items-center justify-between text-xs font-black mb-1.5">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                            <ShieldAlert className={`w-4 h-4 ${macroStats.gapAlertCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                            <span>괴리율(±1%) 주의 종목</span>
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            macroStats.gapAlertCount > 0 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                            {macroStats.gapAlertCount > 0 ? 'WATCH' : 'NORMAL'}
                        </span>
                    </div>
                    <div className={`text-xl md:text-2xl font-black font-mono tracking-tight mt-1 ${
                        macroStats.gapAlertCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                        {macroStats.gapAlertCount}개 종목
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        {macroStats.gapAlertCount > 0 ? '순자산가치(NAV) 대비 매매가 주의' : '전 종목 호가 스프레드 정상 안정'}
                    </div>
                </div>

                {/* 4. 당일 최고 급등 ETF */}
                <div className="bg-gradient-to-br from-rose-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-rose-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-rose-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-rose-400" />
                            <span>당일 최고 급등 ETF</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-md">
                            TOP GAINER
                        </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-white truncate mt-1" title={macroStats.topGainerName}>
                        {macroStats.topGainerName}
                    </div>
                    <div className="text-xs font-bold text-rose-400 font-mono mt-1">
                        등락률: +{macroStats.topGainerPct.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* 2. AI ETF 마켓 & 유동성 실시간 총평 */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-zinc-950 via-[#0e162e] to-zinc-950 border border-blue-500/35 shadow-2xl relative overflow-hidden space-y-3">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                            <span>AI 퀀트 애널리스트 실시간 ETF 유동성 총평</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                                ETF VERDICT
                            </span>
                        </h4>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 text-xs sm:text-sm text-zinc-200 leading-relaxed break-keep font-medium space-y-2">
                    <p>
                        <strong className="text-blue-400 font-bold">📢 실시간 ETF 시장 흐름 진단: </strong>
                        현재 {market === 'KR' ? '국내' : '미국'} ETF 시장의 상위 50종목 총 거래대금은 <strong className="text-white font-mono">{macroStats.totalAmountFormatted}</strong> 수준으로 
                        {market === 'KR' ? ' 지수 파생상품(레버리지·인버스) 및 핵심 성장 테마(반도체, 2차전지, AI) 중심으로 강력한 자금 쏠림이 형성되어 있습니다.' : ' 나스닥100 및 빅테크 3배 레버리지 상품군으로 글로벌 유동성이 집중되고 있습니다.'}
                    </p>
                    <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-xs text-zinc-300">
                        <span className="text-amber-400 font-black shrink-0">💡 괴리율 체크포인트:</span>
                        <span>
                            현재 순자산가치(NAV) 대비 괴리율이 ±1%를 초과하는 종목은 <strong className="text-amber-300 font-mono">{macroStats.gapAlertCount}개</strong>입니다. 괴리율이 벌어진 상태에서 시장가로 무리하게 매수하면 의도치 않은 가격 손실(슬리피지)이 발생할 수 있으므로, 지정가 주문 또는 LP 호가 안정이 확인된 후 거래하는 것이 권장됩니다.
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. 본체 위젯 카드: 타이틀 + 컨트롤 바 + 뷰 토글 */}
            <div className="p-5 md:p-8 rounded-3xl bg-zinc-900/70 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
                
                {/* Header Title & View Toggle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">ETF Statistics</span>
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                TOP {displayLimit}
                            </span>
                        </div>
                        <p className="text-zinc-400 font-medium text-xs">
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
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
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
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
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
                <div className="space-y-3 relative z-10 bg-black/50 border border-white/10 p-3.5 md:p-4 rounded-2xl">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        {/* 실시간 검색창 */}
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="ETF 종목명, 브랜드, 코드 검색 (예: KODEX 200, TIGER, 반도체, 레버리지...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-12 py-2.5 bg-zinc-900/90 border border-white/10 rounded-xl text-white placeholder-gray-500 text-xs md:text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white bg-white/10 px-1.5 py-0.5 rounded cursor-pointer"
                                >
                                    지우기
                                </button>
                            )}
                        </div>

                        {/* 정렬 필터 */}
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
                            <span className="text-[11px] font-bold text-gray-400 shrink-0 flex items-center gap-1 hidden sm:flex">
                                <ArrowUpDown className="w-3 h-3 text-blue-400" /> 정렬:
                            </span>
                            {[
                                { id: 'amount', label: '거래대금순' },
                                { id: 'volume', label: '거래량순' },
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
                        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10 shrink-0">
                            {[20, 50, 100].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setDisplayLimit(num)}
                                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

                {/* 1. GRID CARD VIEW (2열 프리미엄 카드 모드) */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 relative z-10">
                        {processedData.length > 0 ? (
                            processedData.map((item, idx) => {
                                const positive = isPositive(item.change, item.change_percent);
                                const negative = isNegative(item.change, item.change_percent);
                                const colorClass = positive ? 'text-red-400' : negative ? 'text-blue-400' : 'text-gray-400';
                                const rank = item.rank || idx + 1;
                                
                                // 순위 뱃지 스타일
                                const rankBadgeStyle = rank === 1
                                    ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-black font-black shadow-lg shadow-amber-500/30'
                                    : rank === 2
                                    ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black font-black shadow-md'
                                    : rank === 3
                                    ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white font-black'
                                    : 'bg-white/5 border border-white/10 text-gray-400 font-bold';

                                const brandInfo = getBrandInfo(item.brand);
                                const navGapVal = Math.abs(item.nav_gap_num || 0);

                                return (
                                    <Link 
                                        key={item.symbol + idx}
                                        href={`/etf-analysis?symbol=${item.symbol}`}
                                        className="block group"
                                    >
                                        <article className="h-full flex flex-col justify-between bg-zinc-900/90 hover:bg-zinc-800/90 border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 md:p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden">
                                            <div>
                                                {/* 상단 행: 순위 + 브랜드 + 운용사 + 자산군 + 종목코드 */}
                                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs tabular-nums ${rankBadgeStyle}`}>
                                                            {rank}
                                                        </div>
                                                        {item.brand && (
                                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${brandInfo.color}`}>
                                                                <span>{item.brand}</span>
                                                                <span className="text-[9px] opacity-70 font-normal hidden sm:inline">({brandInfo.company})</span>
                                                            </span>
                                                        )}
                                                        {item.category_name && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">
                                                                {item.category_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-xs font-mono text-zinc-400 font-bold tracking-wider">
                                                            {item.symbol}
                                                        </span>
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                                                    </div>
                                                </div>

                                                {/* 종목명 & 현재가 / 등락률 */}
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <h3 className="font-extrabold text-sm md:text-base text-white group-hover:text-blue-300 transition-colors line-clamp-1 leading-snug flex-1">
                                                        {item.name}
                                                    </h3>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-base md:text-lg font-black text-white tabular-nums tracking-tight font-mono">
                                                            {formatPrice(item.price)}{market === 'US' ? '$' : '원'}
                                                        </div>
                                                        <div className={`text-xs font-black tabular-nums tracking-tight font-mono ${colorClass}`}>
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

                                            {/* 하단 세부 지표 그리드 (거래대금, 거래량, 실시간 NAV & 괴리율, 3M수익률) */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/5 text-[11px]">
                                                {/* 거래대금 */}
                                                <div className="bg-white/5 rounded-xl p-2">
                                                    <div className="text-zinc-400 text-[10px] font-bold">거래대금</div>
                                                    <div className="font-black text-zinc-100 truncate mt-0.5">{item.amount || '-'}</div>
                                                </div>

                                                {/* 거래량 */}
                                                <div className="bg-white/5 rounded-xl p-2">
                                                    <div className="text-zinc-400 text-[10px] font-bold">거래량</div>
                                                    <div className="font-black text-zinc-100 truncate font-mono mt-0.5">
                                                        {item.volume ? parseInt(String(item.volume).replace(/,/g, '')).toLocaleString() : '-'}
                                                    </div>
                                                </div>

                                                {/* 실시간 NAV & 괴리율 상태 뱃지 */}
                                                <div className={`rounded-xl p-2 border ${
                                                    navGapVal >= 1.0 
                                                        ? 'bg-amber-500/10 border-amber-500/30' 
                                                        : 'bg-white/5 border-transparent'
                                                }`}>
                                                    <div className="text-zinc-400 text-[10px] font-bold flex items-center justify-between">
                                                        <span>실시간 NAV</span>
                                                        {navGapVal >= 1.0 && <span className="text-[9px] font-black text-amber-400">주의</span>}
                                                    </div>
                                                    <div className="font-black text-zinc-100 truncate font-mono mt-0.5 flex items-center gap-1">
                                                        <span>{item.nav || '-'}</span>
                                                        {item.nav_gap && (
                                                            <span className={`text-[10px] font-black ${
                                                                navGapVal >= 1.0 
                                                                    ? 'text-amber-400' 
                                                                    : 'text-emerald-400'
                                                            }`}>
                                                                ({item.nav_gap})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 3개월 수익률 */}
                                                <div className="bg-white/5 rounded-xl p-2">
                                                    <div className="text-zinc-400 text-[10px] font-bold">3개월 수익률</div>
                                                    <div className={`font-black font-mono truncate mt-0.5 ${
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
                                        className="mt-3 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold cursor-pointer"
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
                                    const brandInfo = getBrandInfo(item.brand);

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
                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${brandInfo.color}`}>
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
                                                Math.abs(item.nav_gap_num || 0) >= 1.0 ? 'text-amber-400 font-black' : 'text-emerald-400'
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
            </div>

            {/* 4. 🎓 초보 투자자를 위한 [ETF & 괴리율 실전 마스터 가이드] */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/90 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm">
                        🎓
                    </div>
                    <div>
                        <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                            <span>초보 투자자를 위한 ETF &amp; 괴리율 실전 마스터 가이드</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                                1 MIN ETF GUIDE
                            </span>
                        </h4>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed break-keep">
                    {/* 카드 1 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-blue-300 text-sm flex items-center gap-1.5">
                            <span>1. 괴리율(Discrepancy)이란?</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            ETF가 담고 있는 실제 주식들의 순가치인 <strong className="text-white">'순자산가치(NAV)'</strong>와 시장에서 거래되는 <strong className="text-white">'현재가'</strong>의 차이입니다. 괴리율이 (+)로 너무 크면 실제 가치보다 웃돈을 주고 비싸게 사는 셈이므로, 괴리율이 ±0.5% 이내로 안정적일 때 거래하는 것이 안전합니다.
                        </p>
                    </div>

                    {/* 카드 2 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-purple-300 text-sm flex items-center gap-1.5">
                            <span>2. LP(유동성공급자) 거래 주의 시간</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            증권사(LP)는 장 시작 5분 후(09:05)부터 장 마감 10분 전(15:20)까지 호가를 제출합니다. <strong className="text-white">'09:00~09:05 및 15:20~15:30'</strong> 구간에는 LP 호가가 비어 괴리율이 비정상적으로 급변할 수 있으니 시장가 매수를 피하고 지정가로 주문하세요.
                        </p>
                    </div>

                    {/* 카드 3 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                            <span>3. 레버리지 '음의 복리(녹아내림)'</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            2배 레버리지 ETF는 일간 수익률의 2배를 추종합니다. 시장이 오르내림을 반복하며 횡보할 경우 <strong className="text-white">'음의 복리 효과(Volatility Drag)'</strong>로 인해 주가가 제자리여도 원금이 손실을 입게 되므로, 장기 투자보다는 단기 모멘텀용으로 접근해야 합니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* 5. 법적 면책 고지 */}
            <AIDisclaimer className="mt-4" isCompact={true} />
        </div>
    );
}
