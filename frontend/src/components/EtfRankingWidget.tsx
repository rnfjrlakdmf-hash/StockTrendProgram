'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
    TrendingUp, TrendingDown, Activity, Globe, Zap, BarChart3, 
    Search, LayoutGrid, List, ArrowUpDown, Filter, Sparkles, 
    ExternalLink, ChevronRight, ShieldAlert, ArrowUpRight,
    AlertTriangle, CheckCircle2, Clock, Coins, Building2, Flame,
    Layers, BookOpen, HelpCircle, Star, ChevronDown, ChevronUp, PieChart
} from 'lucide-react';
import AIDisclaimer from '@/components/AIDisclaimer';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

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
    turnover_rate?: number;
    nav?: string;
    nav_num?: number;
    nav_gap?: string;
    nav_gap_num?: number;
    nav_diff_krw?: number;
    three_month_return?: string;
    three_month_num?: number;
}

interface EtfRankingWidgetProps {
    data: EtfItem[];
    loading: boolean;
    market: 'KR' | 'US';
    filterKeyword?: string | null;
}

type SortField = 'amount' | 'market_sum' | 'turnover' | 'volume' | 'change_high' | 'change_low' | 'discount_best' | 'nav_gap' | 'three_month';

export default function EtfRankingWidget({ data, loading, market, filterKeyword }: EtfRankingWidgetProps) {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('amount');
    const [displayLimit, setDisplayLimit] = useState<number>(50);
    const [onlyWatchlist, setOnlyWatchlist] = useState<boolean>(false);

    // 관심종목(ETF 포함) 상태 관리
    const [watchlistSet, setWatchlistSet] = useState<Set<string>>(new Set());
    const [togglingSymbol, setTogglingSymbol] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 인라인 미니 분석 드로어(구성종목 TOP 5 · 총보수 · 배당 · 기간수익률) 상태
    const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
    const [detailCache, setDetailCache] = useState<Record<string, any>>({});
    const [detailLoading, setDetailLoading] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToastMsg(null), 3800);
    };

    const fetchWatchlistSet = useCallback(async () => {
        try {
            const currentUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null) || 'guest';
            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                headers: { 'X-User-ID': currentUserId }
            });
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                const set = new Set<string>();
                json.data.forEach((item: any) => {
                    const sym = typeof item === 'string' ? item : item.symbol;
                    if (sym) {
                        set.add(String(sym).toUpperCase());
                        if (String(sym).includes('.')) {
                            set.add(String(sym).split('.')[0].toUpperCase());
                        }
                    }
                });
                setWatchlistSet(set);
            }
        } catch (err) {
            console.error('Watchlist fetch error in ETF widget:', err);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchWatchlistSet();
        const handleWatchlistChanged = () => fetchWatchlistSet();
        window.addEventListener('watchlistChanged', handleWatchlistChanged);
        return () => {
            window.removeEventListener('watchlistChanged', handleWatchlistChanged);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [fetchWatchlistSet]);

    const isSymbolSaved = (sym: string) => {
        const clean = String(sym).toUpperCase().trim();
        return watchlistSet.has(clean) || Array.from(watchlistSet).some(s => s === clean || s.startsWith(clean + '.'));
    };

    const toggleWatchlistEtf = async (e: React.MouseEvent, item: EtfItem) => {
        e.preventDefault();
        e.stopPropagation();

        const sym = String(item.symbol).trim();
        const saved = isSymbolSaved(sym);
        const currentUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null) || 'guest';
        const numericPrice = item.price_num || parseFloat(String(item.price || '0').replace(/,/g, '')) || 0;

        setTogglingSymbol(sym);
        try {
            if (saved) {
                const targetSym = Array.from(watchlistSet).find(s => s === sym.toUpperCase() || s.startsWith(sym.toUpperCase() + '.')) || sym;
                const res = await fetch(`${API_BASE_URL}/api/watchlist/${encodeURIComponent(targetSym)}`, {
                    method: 'DELETE',
                    headers: { 'X-User-ID': currentUserId }
                });
                const json = await res.json();
                if (json.status === 'success') {
                    setWatchlistSet(prev => {
                        const next = new Set(prev);
                        next.delete(targetSym.toUpperCase());
                        next.delete(sym.toUpperCase());
                        return next;
                    });
                    showToast(`⭐️ [${item.name}] 관심종목(ETF 알림)에서 해제되었습니다.`);
                    window.dispatchEvent(new CustomEvent('watchlistChanged'));
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': currentUserId
                    },
                    body: JSON.stringify({
                        symbol: sym,
                        price: numericPrice
                    })
                });
                const json = await res.json();
                if (json.status === 'success') {
                    setWatchlistSet(prev => new Set(prev).add(sym.toUpperCase()));
                    showToast(`🌟 [${item.name}] 내 관심종목에 등록 완료! (장시작 시가 · 장마감 수익률 · 괴리율 알림 자동 수신)`);
                    window.dispatchEvent(new CustomEvent('watchlistChanged'));
                }
            }
        } catch (err) {
            console.error('ETF Watchlist toggle failed:', err);
            showToast('⚠️ 관심종목 등록 처리 중 오류가 발생했습니다.');
        } finally {
            setTogglingSymbol(null);
        }
    };

    const toggleExpandDetail = async (e: React.MouseEvent, symbol: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (expandedSymbol === symbol) {
            setExpandedSymbol(null);
            return;
        }
        setExpandedSymbol(symbol);
        if (!detailCache[symbol]) {
            setDetailLoading(symbol);
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/etf-detail/${encodeURIComponent(symbol)}`);
                const json = await res.json();
                if (json && json.status === 'success' && json.data) {
                    setDetailCache(prev => ({ ...prev, [symbol]: json.data }));
                }
            } catch (err) {
                console.error('Failed to load ETF quick detail:', err);
            } finally {
                setDetailLoading(null);
            }
        }
    };

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

    const getBrandInfo = (brand?: string) => {
        const b = brand?.toUpperCase() || '';
        if (b.includes('KODEX')) return { color: 'text-blue-300 bg-blue-500/20 border-blue-500/40', company: '삼성자산운용' };
        if (b.includes('TIGER')) return { color: 'text-orange-300 bg-orange-500/20 border-orange-500/40', company: '미래에셋' };
        if (b.includes('ACE')) return { color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40', company: '한국투자' };
        if (b.includes('SOL')) return { color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40', company: '신한자산' };
        if (b.includes('RISE') || b.includes('KBSTAR')) return { color: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40', company: 'KB자산운용' };
        if (b.includes('PLUS') || b.includes('ARIRANG')) return { color: 'text-purple-300 bg-purple-500/20 border-purple-500/40', company: '한화자산' };
        if (b.includes('KOSEF') || b.includes('KIWOOM')) return { color: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/40', company: '키움자산' };
        if (b.includes('TIMEFOLIO')) return { color: 'text-rose-300 bg-rose-500/20 border-rose-500/40', company: '타임폴리오' };
        return { color: 'text-zinc-300 bg-white/10 border-white/15', company: '글로벌 운용사' };
    };

    // 괴리율 정밀 통계 판독 헬퍼 (KRX 표준 용어: 할인 괴리 / 할증 괴리 / NAV 수렴 + 1주당 산술 편차)
    const getNavDisparityAnalysis = (item: EtfItem) => {
        const gap = item.nav_gap_num || 0;
        const priceNum = item.price_num || parseFloat(String(item.price || 0).replace(/,/g, '')) || 0;
        const navNum = item.nav_num || parseFloat(String(item.nav || 0).replace(/,/g, '')) || 0;
        const diffVal = item.nav_diff_krw !== undefined ? item.nav_diff_krw : (priceNum > 0 && navNum > 0 ? Math.round(priceNum - navNum) : 0);
        const unit = market === 'US' ? '$' : '원';

        if (Math.abs(gap) >= 1.0) {
            return {
                label: gap > 0 ? '⚠️ 할증 확대 (+1%↑)' : '📉 할인 확대 (-1%↓)',
                subText: diffVal !== 0 ? `NAV 대비 ${diffVal > 0 ? '+' : ''}${diffVal.toLocaleString()}${unit} 편차` : 'LP 호가 스프레드 확대 구간',
                badgeClass: gap > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                textClass: gap > 0 ? 'text-amber-400' : 'text-cyan-400'
            };
        }
        if (gap <= -0.15) {
            return {
                label: '📉 할인 괴리 (NAV 하회)',
                subText: diffVal < 0 ? `NAV 대비 -${Math.abs(diffVal).toLocaleString()}${unit} 낮음` : '시장가가 NAV 하회 중',
                badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                textClass: 'text-cyan-300'
            };
        }
        if (gap >= 0.15) {
            return {
                label: '📈 할증 괴리 (NAV 상회)',
                subText: diffVal > 0 ? `NAV 대비 +${diffVal.toLocaleString()}${unit} 높음` : '시장가가 NAV 상회 중',
                badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
                textClass: 'text-orange-300'
            };
        }
        return {
            label: '✅ NAV 수렴 (정상 범위)',
            subText: '시장가·순자산가치 일치 구간',
            badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            textClass: 'text-emerald-400'
        };
    };

    // 실시간 검색, 관심ETF 필터, 정렬 적용
    const processedData = useMemo(() => {
        let list = Array.isArray(data) ? [...data] : [];

        if (onlyWatchlist) {
            list = list.filter(item => isSymbolSaved(item.symbol));
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(item => 
                (item.name && item.name.toLowerCase().includes(query)) ||
                (item.symbol && item.symbol.toLowerCase().includes(query)) ||
                (item.brand && item.brand.toLowerCase().includes(query)) ||
                (item.category_name && item.category_name.toLowerCase().includes(query))
            );
        }

        list.sort((a, b) => {
            if (sortField === 'amount') return (b.amount_num || 0) - (a.amount_num || 0);
            if (sortField === 'market_sum') return (b.market_sum_num || 0) - (a.market_sum_num || 0);
            if (sortField === 'turnover') {
                const tA = a.turnover_rate ?? ((a.market_sum_num && a.market_sum_num > 0) ? ((a.amount_num || 0) / a.market_sum_num) * 100 : 0);
                const tB = b.turnover_rate ?? ((b.market_sum_num && b.market_sum_num > 0) ? ((b.amount_num || 0) / b.market_sum_num) * 100 : 0);
                return tB - tA;
            }
            if (sortField === 'volume') {
                const volA = a.volume_num || parseInt(String(a.volume || 0).replace(/,/g, '')) || 0;
                const volB = b.volume_num || parseInt(String(b.volume || 0).replace(/,/g, '')) || 0;
                return volB - volA;
            }
            if (sortField === 'change_high') return (b.change_percent || 0) - (a.change_percent || 0);
            if (sortField === 'change_low') return (a.change_percent || 0) - (b.change_percent || 0);
            if (sortField === 'discount_best') return (a.nav_gap_num || 0) - (b.nav_gap_num || 0); // 가장 음수(저평가 할인)인 순서
            if (sortField === 'nav_gap') return Math.abs(b.nav_gap_num || 0) - Math.abs(a.nav_gap_num || 0);
            if (sortField === 'three_month') return (b.three_month_num || 0) - (a.three_month_num || 0);
            return 0;
        });

        return list.slice(0, displayLimit);
    }, [data, searchQuery, sortField, displayLimit, onlyWatchlist, watchlistSet]);

    // 전체 데이터 기반: 4대 매크로 통계 + 🐂롱/🐻숏 자금 대결 게이지 + 🔥6대 섹터 자금 쏠림 집계
    const macroStats = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) {
            return {
                totalAmountFormatted: '0원',
                topAmountName: '-',
                topAmountVal: '-',
                gapAlertCount: 0,
                discountOpportunityCount: 0,
                topGainerName: '-',
                topGainerPct: 0,
                bullAmt: 0,
                bearAmt: 0,
                bullRatio: 50,
                bearRatio: 50,
                bullFormatted: '0억',
                bearFormatted: '0억',
                sectorFlows: [] as { name: string; keyword: string; amount: number; amountFormatted: string; avgChange: number; topEtf: string; count: number }[]
            };
        }

        const formatEok = (eok: number) => {
            if (eok >= 10000) return `${(eok / 10000).toFixed(2)}조원`;
            return `${Math.round(eok).toLocaleString()}억원`;
        };

        let totalAmt = 0;
        let bullAmt = 0;
        let bearAmt = 0;

        const sectorDefs = [
            { name: '💻 반도체 · HBM', keyword: '반도체', match: ['반도체', 'SOXL', 'SOXX', 'SMH', '필라델피아', '칩', 'HBM', 'NVDA', 'NVDL'] },
            { name: '🤖 AI · 빅테크', keyword: 'AI', match: ['AI', '인공지능', '빅테크', '나스닥', 'QQQ', 'TQQQ', '테크', '로봇', '소프트웨어', '클라우드'] },
            { name: '⚡ 2차전지 · 전기차', keyword: '2차전지', match: ['2차전지', '배터리', '전기차', '테슬라', 'TSLL', '양극재', '전고체'] },
            { name: '💰 배당 · 커버드콜', keyword: '배당', match: ['배당', '커버드콜', '인컴', 'SCHD', 'JEPI', 'JEPQ', '리츠', '고배당', '타겟데일리'] },
            { name: '🏦 채권 · 금리파킹', keyword: '채권', match: ['채권', '금리', 'CD', 'KOFR', '머니마켓', '단기채', '국고채', '미국채', 'TLT', 'TMF', '파킹'] },
            { name: '🛡️ 방산 · 조선 · 원자재', keyword: '방산', match: ['방산', '조선', '원자력', '전력', '금현물', '은현물', '원유', 'GLD', 'SLV', '에너지'] }
        ];

        const sectorMap = sectorDefs.map(s => ({ ...s, amount: 0, changeSum: 0, count: 0, topEtf: '-', topEtfAmt: -1 }));

        data.forEach(item => {
            const amt = item.amount_num || 0;
            totalAmt += amt;
            const n = (item.name || '').toUpperCase();
            const sym = (item.symbol || '').toUpperCase();

            const isBear = n.includes('인버스') || n.includes('2X') && n.includes('선물인버스') || n.includes('곱버스') || ['SQQQ', 'SOXS', 'SPXU', 'PSQ', 'SH', 'SDS', 'QID', 'TSLS', 'UVXY'].includes(sym);
            const isBull = n.includes('레버리지') || n.includes('200') || n.includes('나스닥') || n.includes('S&P') || n.includes('코스닥150') || ['TQQQ', 'SOXL', 'UPRO', 'SPY', 'QQQ', 'VOO', 'NVDL', 'TSLL'].includes(sym);

            if (isBear) bearAmt += amt;
            else if (isBull) bullAmt += amt;

            sectorMap.forEach(sec => {
                if (sec.match.some(m => n.includes(m.toUpperCase()) || sym === m.toUpperCase())) {
                    sec.amount += amt;
                    sec.changeSum += (item.change_percent || 0);
                    sec.count += 1;
                    if (amt > sec.topEtfAmt) {
                        sec.topEtfAmt = amt;
                        sec.topEtf = item.name;
                    }
                }
            });
        });

        const totalDirectional = bullAmt + bearAmt;
        const bullRatio = totalDirectional > 0 ? Math.round((bullAmt / totalDirectional) * 100) : 50;
        const bearRatio = 100 - bullRatio;

        const sortedByAmt = [...data].sort((a, b) => (b.amount_num || 0) - (a.amount_num || 0));
        const topAmount = sortedByAmt[0];
        const gapAlertCount = data.filter(item => Math.abs(item.nav_gap_num || 0) >= 1.0).length;
        const discountOpportunityCount = data.filter(item => (item.nav_gap_num || 0) <= -0.15).length;
        const sortedByGain = [...data].sort((a, b) => (b.change_percent || 0) - (a.change_percent || 0));
        const topGainer = sortedByGain[0];

        const sectorFlows = sectorMap
            .map(s => ({
                name: s.name,
                keyword: s.keyword,
                amount: s.amount,
                amountFormatted: formatEok(s.amount),
                avgChange: s.count > 0 ? s.changeSum / s.count : 0,
                topEtf: s.topEtf,
                count: s.count
            }))
            .sort((a, b) => b.amount - a.amount);

        return {
            totalAmountFormatted: formatEok(totalAmt),
            topAmountName: topAmount?.name || '-',
            topAmountVal: topAmount?.amount || '-',
            gapAlertCount,
            discountOpportunityCount,
            topGainerName: topGainer?.name || '-',
            topGainerPct: topGainer?.change_percent || 0,
            bullAmt,
            bearAmt,
            bullRatio,
            bearRatio,
            bullFormatted: formatEok(bullAmt),
            bearFormatted: formatEok(bearAmt),
            sectorFlows
        };
    }, [data]);

    return (
        <div className="space-y-6 relative">
            {/* 실시간 토스트 알림 배너 */}
            {toastMsg && (
                <div className="fixed bottom-6 right-6 z-50 max-w-md bg-zinc-900/95 border border-emerald-500/50 text-white px-4 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.35)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold leading-snug">{toastMsg}</span>
                </div>
            )}

            {/* 1. 상단 4대 매크로 ETF 시장 통계 대시보드 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. 상위 ETF 총 거래대금 */}
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
                        {market === 'KR' ? `국내 상위 ${data.length}종목 실시간 유동성 합계` : '글로벌 대표 ETF 거래대금 집계'}
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

                {/* 3. 괴리율 주의 & 할인 괴리 종목 수 */}
                <div 
                    onClick={() => setSortField('discount_best')}
                    className={`p-4 sm:p-5 rounded-2xl border shadow-lg flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                    macroStats.gapAlertCount > 0 
                        ? 'bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-black border-amber-500/40' 
                        : 'bg-gradient-to-br from-cyan-950/40 via-zinc-900/80 to-black border-cyan-500/30'
                }`}>
                    <div className="flex items-center justify-between text-xs font-black mb-1.5">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                            <ShieldAlert className={`w-4 h-4 ${macroStats.gapAlertCount > 0 ? 'text-amber-400' : 'text-cyan-400'}`} />
                            <span>NAV 할인 · 괴리율 통계</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                            할인괴리 {macroStats.discountOpportunityCount}개
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl md:text-2xl font-black font-mono tracking-tight text-cyan-300">
                            할인괴리 {macroStats.discountOpportunityCount}종목
                        </span>
                        <span className="text-xs font-bold text-amber-400 font-mono">
                            (±1% 초과: {macroStats.gapAlertCount}개)
                        </span>
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        클릭 시 순자산가치(NAV) 대비 할인율순 정렬
                    </div>
                </div>

                {/* 4. 당일 최고 급등 ETF */}
                <div 
                    onClick={() => setSortField('change_high')}
                    className="bg-gradient-to-br from-rose-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-rose-500/30 shadow-lg flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01]"
                >
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

            {/* 2. [NEW 업그레이드] 🐂 지수·레버리지형 vs 🐻 인버스형 실시간 거래대금 비중 & 🔥 6대 섹터 자금 유입 통계 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 좌측 5컬럼: 🐂 지수·레버리지형 vs 🐻 인버스형 거래대금 비중 */}
                <div className="lg:col-span-5 p-5 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-black border border-white/10 shadow-xl flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-base">📊</span>
                            <h4 className="text-sm sm:text-base font-black text-white">
                                지수·레버리지형 vs 인버스형 거래대금 비중
                            </h4>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            macroStats.bullRatio >= 55
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : macroStats.bearRatio >= 55
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
                        }`}>
                            {macroStats.bullRatio >= 55 ? '📈 정방향(레버리지·지수) 거래 우위' : macroStats.bearRatio >= 55 ? '📉 역방향(인버스) 거래 우위' : '⚖️ 양방향 거래 균형'}
                        </span>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-red-400 flex items-center gap-1">
                                📈 지수·레버리지형 <strong className="font-mono text-sm">{macroStats.bullRatio}%</strong>
                            </span>
                            <span className="text-blue-400 flex items-center gap-1">
                                <strong className="font-mono text-sm">{macroStats.bearRatio}%</strong> 인버스·선물숏형 📉
                            </span>
                        </div>

                        {/* 거래대금 비율 게이지 바 */}
                        <div className="w-full h-4 rounded-full bg-blue-950/80 overflow-hidden flex border border-white/10 p-0.5">
                            <div 
                                className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 rounded-l-full transition-all duration-700"
                                style={{ width: `${macroStats.bullRatio}%` }}
                            />
                            <div 
                                className="h-full bg-gradient-to-l from-blue-600 via-indigo-500 to-cyan-400 rounded-r-full transition-all duration-700"
                                style={{ width: `${macroStats.bearRatio}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                            <span>정방향 거래대금: <strong className="text-zinc-200">{macroStats.bullFormatted}</strong></span>
                            <span>역방향 거래대금: <strong className="text-zinc-200">{macroStats.bearFormatted}</strong></span>
                        </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed bg-white/5 p-2.5 rounded-xl border border-white/5">
                        💡 <strong className="text-zinc-200">통계 설명:</strong> 당일 거래대금 상위 ETF 중 정방향(대표지수·레버리지) 상품군과 역방향(인버스·선물인버스2X) 상품군 간의 단순 거래대금 합산 비율을 집계한 객관적 시장 통계입니다.
                    </p>
                </div>

                {/* 우측 7컬럼: 🔥 실시간 6대 핵심 섹터 자금 쏠림 레이더 */}
                <div className="lg:col-span-7 p-5 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-black border border-white/10 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-amber-400" />
                            <h4 className="text-sm sm:text-base font-black text-white">
                                섹터별 ETF 실시간 자금 쏠림 레이더 (클릭 시 즉시 필터)
                            </h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                            SECTOR MONEY FLOW
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {macroStats.sectorFlows.map((sec, i) => {
                            const isSelected = searchQuery === sec.keyword;
                            const isUp = sec.avgChange > 0;
                            const isDown = sec.avgChange < 0;
                            return (
                                <button
                                    key={sec.name}
                                    onClick={() => setSearchQuery(isSelected ? '' : sec.keyword)}
                                    className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-600/25 border-blue-400 shadow-lg shadow-blue-500/20 scale-[1.02]'
                                            : 'bg-white/5 hover:bg-white/10 border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-xs font-black text-white truncate">{sec.name}</span>
                                        <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                                            isUp ? 'bg-red-500/20 text-red-400' : isDown ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400'
                                        }`}>
                                            {isUp ? '+' : ''}{sec.avgChange.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="text-sm font-black text-amber-300 font-mono">
                                        {sec.amountFormatted}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate mt-1" title={sec.topEtf}>
                                        대장: <span className="text-zinc-200 font-bold">{sec.topEtf}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 3. 본체 위젯 카드: 타이틀 + 컨트롤 바 + 뷰 토글 */}
            <div className="p-5 md:p-8 rounded-3xl bg-zinc-900/70 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
                
                {/* Header Title & View Toggle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">ETF Statistics &amp; NAV Radar</span>
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                TOP {displayLimit}
                            </span>
                        </div>
                        <p className="text-zinc-400 font-medium text-xs">
                            ⭐ 각 ETF 카드의 <strong className="text-amber-300">[관심ETF 알림받기]</strong> 버튼을 누르면 내 관심종목에 저장되어 장시작 시가·장마감 수익률·괴리율 브리핑을 받아보실 수 있습니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* ⭐ 내 관심 ETF만 보기 토글 */}
                        <button
                            onClick={() => setOnlyWatchlist(!onlyWatchlist)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                onlyWatchlist
                                    ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                            }`}
                        >
                            <Star className={`w-3.5 h-3.5 ${onlyWatchlist ? 'fill-black text-black' : 'fill-amber-400 text-amber-400'}`} />
                            <span>내 관심 ETF만 보기</span>
                        </button>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>LIVE 실시간</span>
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
                    <div className="flex flex-col lg:flex-row items-center gap-3">
                        {/* 실시간 검색창 */}
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="ETF 종목명, 브랜드, 코드 검색 (예: KODEX 반도체, TIGER 미국, 배당, SOXL, SCHD...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-16 py-2.5 bg-zinc-900/90 border border-white/10 rounded-xl text-white placeholder-gray-500 text-xs md:text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white bg-white/10 px-2 py-0.5 rounded cursor-pointer"
                                >
                                    초기화
                                </button>
                            )}
                        </div>

                        {/* 정렬 필터 (시총순, 회전율순, 할인매수순 추가!) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto scrollbar-none pb-1 lg:pb-0">
                            <span className="text-[11px] font-bold text-gray-400 shrink-0 hidden sm:flex items-center gap-1">
                                <ArrowUpDown className="w-3 h-3 text-blue-400" /> 정렬:
                            </span>
                            {[
                                { id: 'amount', label: '🔥 거래대금순' },
                                { id: 'market_sum', label: '🏛️ 순자산(시총)순' },
                                { id: 'turnover', label: '⚡ 자금회전율순' },
                                { id: 'discount_best', label: '📉 NAV할인괴리순' },
                                { id: 'change_high', label: '📈 급등순' },
                                { id: 'nav_gap', label: '⚠️ 괴리율폭순' },
                                { id: 'three_month', label: '👑 3M수익률순' }
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

                {/* 1. GRID CARD VIEW (2열 초고밀도 프리미엄 카드 모드) */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {processedData.length > 0 ? (
                            processedData.map((item, idx) => {
                                const positive = isPositive(item.change, item.change_percent);
                                const negative = isNegative(item.change, item.change_percent);
                                const colorClass = positive ? 'text-red-400' : negative ? 'text-blue-400' : 'text-gray-400';
                                const rank = item.rank || idx + 1;
                                
                                const rankBadgeStyle = rank === 1
                                    ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-black font-black shadow-lg shadow-amber-500/30'
                                    : rank === 2
                                    ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black font-black shadow-md'
                                    : rank === 3
                                    ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white font-black'
                                    : 'bg-white/5 border border-white/10 text-gray-400 font-bold';

                                const brandInfo = getBrandInfo(item.brand);
                                const navAnalysis = getNavDisparityAnalysis(item);
                                const saved = isSymbolSaved(item.symbol);
                                const turnover = item.turnover_rate ?? ((item.market_sum_num && item.market_sum_num > 0) ? Number((((item.amount_num || 0) / item.market_sum_num) * 100).toFixed(1)) : 0);
                                const isExpanded = expandedSymbol === item.symbol;
                                const quickDetail = detailCache[item.symbol];

                                return (
                                    <div key={item.symbol + idx} className="flex flex-col">
                                        <Link 
                                            href={`/etf-analysis?symbol=${item.symbol}`}
                                            className="block group flex-1"
                                        >
                                            <article className={`h-full flex flex-col justify-between bg-zinc-900/90 hover:bg-zinc-800/90 border transition-all duration-200 hover:shadow-xl relative overflow-hidden rounded-2xl p-4 md:p-5 ${
                                                saved ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]' : 'border-white/10 hover:border-blue-500/40'
                                            }`}>
                                                <div>
                                                    {/* 상단 행: 순위 + 브랜드 + 자산군 + ⭐ 관심ETF 알림받기 버튼 */}
                                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs tabular-nums ${rankBadgeStyle}`}>
                                                                {rank}
                                                            </div>
                                                            {item.brand && (
                                                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${brandInfo.color}`}>
                                                                    <span>{item.brand}</span>
                                                                    <span className="text-[9px] opacity-75 font-normal hidden sm:inline">({brandInfo.company})</span>
                                                                </span>
                                                            )}
                                                            {item.category_name && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">
                                                                    {item.category_name}
                                                                </span>
                                                            )}
                                                            {turnover >= 20 && (
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse">
                                                                    🔥 수급폭발 (회전율 {turnover}%)
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* ⭐ 원터치 내 관심종목(ETF 알림) 등록/해제 버튼 */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => toggleWatchlistEtf(e, item)}
                                                            disabled={togglingSymbol === item.symbol}
                                                            className={`px-2.5 py-1 rounded-xl text-[11px] font-black border flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                                                                saved
                                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                                                                    : 'bg-white/5 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border-white/10 hover:border-amber-500/40'
                                                            }`}
                                                            title="내 관심종목에 추가하여 장시작 시가 및 장마감 결산 알림 받기"
                                                        >
                                                            <Star className={`w-3.5 h-3.5 ${saved ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`} />
                                                            <span>{saved ? '관심ETF 등록됨' : '+ 관심ETF 알림받기'}</span>
                                                        </button>
                                                    </div>

                                                    {/* 종목명 & 현재가 / 등락률 */}
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-extrabold text-sm md:text-base text-white group-hover:text-blue-300 transition-colors truncate leading-snug">
                                                                {item.name}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[11px] font-mono text-zinc-400 font-bold">
                                                                    티커: {item.symbol}
                                                                </span>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${navAnalysis.badgeClass}`}>
                                                                    {navAnalysis.label}
                                                                </span>
                                                            </div>
                                                        </div>
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

                                                {/* 하단 6대 핵심 지표 그리드 (거래대금, 순자산시총, 회전율, 실시간NAV, 괴리율판독, 3M수익률) */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-white/5 text-[11px]">
                                                    {/* 1. 거래대금 */}
                                                    <div className="bg-white/5 rounded-xl p-2">
                                                        <div className="text-zinc-400 text-[10px] font-bold flex items-center justify-between">
                                                            <span>당일 거래대금</span>
                                                            <span className="text-[9px] text-blue-400 font-mono">FLOW</span>
                                                        </div>
                                                        <div className="font-black text-white truncate mt-0.5 font-mono">{item.amount || '-'}</div>
                                                    </div>

                                                    {/* 2. 순자산총액(AUM / 시총) */}
                                                    <div className="bg-white/5 rounded-xl p-2">
                                                        <div className="text-zinc-400 text-[10px] font-bold flex items-center justify-between">
                                                            <span>순자산총액(시총)</span>
                                                            <span className="text-[9px] text-purple-400 font-mono">AUM</span>
                                                        </div>
                                                        <div className="font-black text-purple-200 truncate mt-0.5 font-mono">
                                                            {item.market_sum || (market === 'US' ? '대형 글로벌' : '-')}
                                                        </div>
                                                    </div>

                                                    {/* 3. 당일 자금 회전율 & 거래량 */}
                                                    <div className="bg-white/5 rounded-xl p-2">
                                                        <div className="text-zinc-400 text-[10px] font-bold flex items-center justify-between">
                                                            <span>자금 회전율 · 거래량</span>
                                                        </div>
                                                        <div className="font-black text-zinc-100 truncate font-mono mt-0.5 flex items-center gap-1">
                                                            <span className={turnover >= 20 ? 'text-rose-400' : 'text-emerald-300'}>
                                                                {turnover > 0 ? `${turnover}%` : '-'}
                                                            </span>
                                                            <span className="text-zinc-500 text-[10px]">
                                                                ({item.volume ? parseInt(String(item.volume).replace(/,/g, '')).toLocaleString() : '-'}주)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 4. 실시간 NAV (순자산가치) */}
                                                    <div className="bg-white/5 rounded-xl p-2">
                                                        <div className="text-zinc-400 text-[10px] font-bold">실시간 NAV (본래가치)</div>
                                                        <div className="font-black text-zinc-100 truncate font-mono mt-0.5">
                                                            {item.nav && item.nav !== '-' ? `${item.nav}${market === 'US' ? '$' : '원'}` : '실시간 연동'}
                                                        </div>
                                                    </div>

                                                    {/* 5. 괴리율 & 1주당 원화 차익 판독 */}
                                                    <div className={`rounded-xl p-2 border ${navAnalysis.badgeClass}`}>
                                                        <div className="text-[10px] font-bold flex items-center justify-between">
                                                            <span>괴리율 ({item.nav_gap || '0.00%'})</span>
                                                        </div>
                                                        <div className={`font-black truncate text-[10px] mt-0.5 ${navAnalysis.textClass}`}>
                                                            {navAnalysis.subText}
                                                        </div>
                                                    </div>

                                                    {/* 6. 3개월 누적 수익률 */}
                                                    <div className="bg-white/5 rounded-xl p-2">
                                                        <div className="text-zinc-400 text-[10px] font-bold">3개월 누적 수익률</div>
                                                        <div className={`font-black font-mono truncate mt-0.5 ${
                                                            (item.three_month_num || 0) > 0 ? 'text-red-400' : (item.three_month_num || 0) < 0 ? 'text-blue-400' : 'text-gray-400'
                                                        }`}>
                                                            {item.three_month_return || '-'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 카드 하단 액션 바: [구성종목·총보수·배당 요약 즉시 열기] + [심층 차트 이동] */}
                                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => toggleExpandDetail(e, item.symbol)}
                                                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer"
                                                    >
                                                        <PieChart className="w-3.5 h-3.5 text-blue-400" />
                                                        <span>{isExpanded ? '구성종목·보수 요약 닫기' : '🔍 구성종목 TOP 5 · 총보수 · 배당 요약'}</span>
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </button>

                                                    <span className="text-[11px] font-bold text-zinc-400 group-hover:text-blue-400 flex items-center gap-1">
                                                        <span>심층 차트</span>
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </span>
                                                </div>
                                            </article>
                                        </Link>

                                        {/* 인라인 미니 분석 드로어 (페이지 이동 없이 편입종목 TOP 5, 총보수, 배당률, 기간별 수익률 표시) */}
                                        {isExpanded && (
                                            <div className="mt-1.5 p-4 rounded-2xl bg-zinc-950/95 border border-blue-500/40 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {detailLoading === item.symbol ? (
                                                    <div className="py-6 text-center text-xs font-bold text-blue-300 flex items-center justify-center gap-2">
                                                        <Activity className="w-4 h-4 animate-spin" />
                                                        <span>[{item.name}] 편입 구성종목 TOP 5 및 운용 보수 데이터를 불러오는 중...</span>
                                                    </div>
                                                ) : quickDetail ? (
                                                    <>
                                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                                                            <div className="text-xs font-black text-white flex items-center gap-1.5">
                                                                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                                                <span>{item.name} 핵심 펀드 정보</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px] font-mono">
                                                                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                                                                    총보수(TER): <strong className="text-amber-300">{quickDetail.expense_ratio || '연 0.15~0.45%'}</strong>
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                                                                    배당/분배금: <strong className="text-emerald-300">{quickDetail.dividend_yield || '운용사 기준'}</strong>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* 편입 종목 TOP 5 */}
                                                        {Array.isArray(quickDetail.holdings) && quickDetail.holdings.length > 0 ? (
                                                            <div className="space-y-1.5">
                                                                <div className="text-[11px] font-black text-blue-300">
                                                                    📦 주요 편입 구성종목 (Holdings TOP 5)
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                    {quickDetail.holdings.slice(0, 5).map((h: any, hIdx: number) => (
                                                                        <div key={hIdx} className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-lg text-[11px]">
                                                                            <span className="text-zinc-200 font-bold truncate mr-2">
                                                                                {hIdx + 1}. {h.name || h.ticker}
                                                                            </span>
                                                                            <span className="text-blue-300 font-mono font-black shrink-0">
                                                                                {typeof h.weight === 'number' ? `${h.weight.toFixed(1)}%` : (h.weight || '-')}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[11px] text-zinc-400">
                                                                기초지수: <strong className="text-zinc-200">{quickDetail.underlying_index || item.category_name || '대표 지수 추종'}</strong>
                                                            </div>
                                                        )}

                                                        {/* 기간별 수익률 요약 */}
                                                        {quickDetail.performance && (
                                                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                                                {['1개월', '3개월', '6개월', '1년'].map(period => {
                                                                    const val = quickDetail.performance?.[period];
                                                                    const numVal = typeof val === 'number' ? val : parseFloat(String(val || 0));
                                                                    return (
                                                                        <div key={period} className="bg-white/5 p-1.5 rounded-lg text-center">
                                                                            <div className="text-[9px] text-zinc-400 font-bold">{period} 수익률</div>
                                                                            <div className={`text-[11px] font-mono font-black ${
                                                                                numVal > 0 ? 'text-red-400' : numVal < 0 ? 'text-blue-400' : 'text-zinc-400'
                                                                            }`}>
                                                                                {val !== undefined && val !== null ? `${numVal > 0 ? '+' : ''}${numVal.toFixed(1)}%` : '-'}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-zinc-400 py-2">
                                                        상세 구성종목 및 1년 시세 차트는 심층 분석 페이지에서 확인하실 수 있습니다.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-20 text-center">
                                <Activity className={`w-8 h-8 mx-auto mb-3 ${loading ? 'text-blue-500 animate-spin' : 'text-gray-600'}`} />
                                <p className="text-gray-400 font-bold text-sm">
                                    {loading
                                        ? '실시간 ETF 랭킹 데이터를 동기화 중입니다...'
                                        : onlyWatchlist
                                        ? '아직 등록한 관심 ETF가 없습니다. 카드 우측 상단의 [+ 관심ETF 알림받기] 버튼을 눌러 등록해보세요!'
                                        : '검색 조건에 일치하는 ETF 종목이 없습니다.'}
                                </p>
                                {!loading && (searchQuery || onlyWatchlist) && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setOnlyWatchlist(false);
                                        }}
                                        className="mt-3 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold cursor-pointer"
                                    >
                                        전체 ETF 보기
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. TABLE VIEW (상세 표 모드 - 시총, 회전율, 관심ETF 버튼 포함) */}
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
                                    <th className="p-3 text-right">순자산(시총)</th>
                                    <th className="p-3 text-right">회전율</th>
                                    <th className="p-3 text-right">실시간 NAV</th>
                                    <th className="p-3 text-right">괴리율 · 판독</th>
                                    <th className="p-3 text-right">3M수익률</th>
                                    <th className="p-3 text-center">관심알림</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {processedData.map((item, idx) => {
                                    const positive = isPositive(item.change, item.change_percent);
                                    const negative = isNegative(item.change, item.change_percent);
                                    const colorClass = positive ? 'text-red-400' : negative ? 'text-blue-400' : 'text-gray-400';
                                    const rank = item.rank || idx + 1;
                                    const brandInfo = getBrandInfo(item.brand);
                                    const navAnalysis = getNavDisparityAnalysis(item);
                                    const saved = isSymbolSaved(item.symbol);
                                    const turnover = item.turnover_rate ?? ((item.market_sum_num && item.market_sum_num > 0) ? Number((((item.amount_num || 0) / item.market_sum_num) * 100).toFixed(1)) : 0);

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
                                            <td className="p-3 text-right font-mono text-purple-300">{item.market_sum || '-'}</td>
                                            <td className={`p-3 text-right font-mono font-bold ${turnover >= 20 ? 'text-rose-400' : 'text-gray-300'}`}>
                                                {turnover > 0 ? `${turnover}%` : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-300">{item.nav || '-'}</td>
                                            <td className={`p-3 text-right font-mono ${navAnalysis.textClass}`}>
                                                <div className="font-bold">{item.nav_gap || '-'}</div>
                                                <div className="text-[9px] opacity-85">{navAnalysis.label}</div>
                                            </td>
                                            <td className={`p-3 text-right font-mono font-bold ${
                                                (item.three_month_num || 0) > 0 ? 'text-red-400' : (item.three_month_num || 0) < 0 ? 'text-blue-400' : 'text-gray-400'
                                            }`}>
                                                {item.three_month_return || '-'}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleWatchlistEtf(e, item)}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border cursor-pointer ${
                                                        saved
                                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                            : 'bg-white/5 text-gray-300 border-white/10 hover:text-amber-300'
                                                    }`}
                                                >
                                                    <Star className={`w-3 h-3 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                                                    <span>{saved ? '등록됨' : '담기'}</span>
                                                </button>
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
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-blue-300 text-sm flex items-center gap-1.5">
                            <span>1. 할인(-) vs 할증(+) 괴리율의 의미</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            ETF가 담고 있는 실제 자산들의 순가치인 <strong className="text-white">&apos;순자산가치(NAV)&apos;</strong>보다 시장 거래가가 낮게 형성된 상태를 <strong className="text-cyan-300">&apos;할인 괴리(-)&apos;</strong>라 부르며, 반대로 시장 거래가가 순자산가치보다 높게 형성된 상태를 <strong className="text-amber-300">&apos;할증 괴리(+)&apos;</strong>라고 정의합니다.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-purple-300 text-sm flex items-center gap-1.5">
                            <span>2. 자금 회전율(거래대금÷시총)이란?</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            ETF의 전체 덩치(순자산총액) 대비 당일 거래대금이 얼마나 폭발했는지 보여주는 지표입니다. <strong className="text-rose-300">회전율이 20% 이상</strong>인 ETF는 오늘 단기 스마트머니와 시장의 주도 수급이 가장 강력하게 쏠리고 있는 핵심 섹터입니다.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                            <span>3. 관심ETF 등록 시 어떤 알림이 오나요?</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            원하는 국내·미국 ETF 카드에서 <strong className="text-amber-300">[+ 관심ETF 알림받기]</strong>를 눌러두면, 일반 주식과 동일하게 <strong className="text-white">매일 아침 장시작 시가(NAV 괴리율 포함) 알림, 장마감 수익률 결산, 연관 섹터 지수 브리핑</strong>을 자동으로 받아보실 수 있습니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* 5. 법적 면책 고지 */}
            <AIDisclaimer className="mt-4" isCompact={true} />
        </div>
    );
}
