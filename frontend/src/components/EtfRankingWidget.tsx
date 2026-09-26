'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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

// 초보자 눈높이 마우스 오버(Hover) 툴팁 컴포넌트 (Portal + Fixed 좌표로 상단 검색바/버튼 가림 현상 완벽 해결)
function BeginnerTooltip({
    title,
    desc,
    children,
    align = 'center'
}: {
    title: string;
    desc: string;
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right';
}) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; showBelow: boolean }>({
        top: 0,
        left: 0,
        showBelow: false,
    });

    const updatePosition = useCallback(() => {
        if (!triggerRef.current || typeof window === 'undefined') return;
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipWidth = 288; // w-72 = 288px
        const showBelow = rect.top < 190; // 화면 상단이나 검색바 근처면 아래쪽으로 펼침

        let left = rect.left + rect.width / 2 - tooltipWidth / 2;
        if (align === 'left') left = rect.left;
        if (align === 'right') left = rect.right - tooltipWidth;

        // 화면 좌우 밖으로 잘리지 않게 안전 여백(12px) 고정
        left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left));
        const top = showBelow ? rect.bottom + 10 : rect.top - 10;

        setCoords({ top, left, showBelow });
    }, [align]);

    const handleEnter = () => {
        updatePosition();
        setOpen(true);
    };

    const handleLeave = () => {
        setOpen(false);
    };

    useEffect(() => {
        if (!open) return;
        const handleScrollOrResize = () => updatePosition();
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [open, updatePosition]);

    return (
        <div
            ref={triggerRef}
            className="relative inline-flex items-center"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={(e) => {
                e.stopPropagation();
                updatePosition();
                setOpen((prev) => !prev);
            }}
        >
            {children}
            {open &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            transform: coords.showBelow ? 'translateY(0)' : 'translateY(-100%)',
                            zIndex: 99999,
                        }}
                        className="pointer-events-none w-72 p-3.5 rounded-2xl bg-[#090d16] border border-blue-400/60 shadow-[0_16px_45px_rgba(0,0,0,0.95)] text-left animate-in fade-in duration-150"
                    >
                        <div className="flex items-center gap-1.5 text-xs font-black text-blue-300 mb-1.5 pb-1.5 border-b border-white/15">
                            <span>🎓</span>
                            <span>{title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-100 font-medium leading-relaxed break-keep">
                            {desc}
                        </p>
                    </div>,
                    document.body
                )}
        </div>
    );
}

// ETF 유형(레버리지/인버스/배당/채권 등)별 초보자 맞춤 설명 생성기
function getCategoryBeginnerDesc(categoryName?: string, etfName?: string): string {
    const text = `${categoryName || ''} ${etfName || ''}`.toUpperCase();
    if (text.includes('인버스') || text.includes('-3X') || text.includes('-2X') || text.includes('-1X') || text.includes('SHORT')) {
        return '주가가 떨어질 때 오히려 수익이 나는 [청개구리(하락 방어) 상품]입니다. 시장 하락이 예상될 때 단기 방어용으로 활용합니다.';
    }
    if (text.includes('레버리지') || text.includes('3X') || text.includes('2X') || text.includes('BULL')) {
        return '기초 지수가 하루 1% 오를 때 2배~3배씩 움직이는 [고위험·고수익 가속 상품]입니다. 오를 땐 빠르지만 횡보장에서는 원금이 줄어들 수 있어 단기 매매에 쓰입니다.';
    }
    if (text.includes('배당') || text.includes('커버드콜') || text.includes('인컴') || text.includes('리츠')) {
        return '주가 상승뿐 아니라 매월 또는 분기마다 따박따박 나오는 [배당금(분배금) 현금흐름]을 목적으로 투자하는 인컴형 상품입니다.';
    }
    if (text.includes('채권') || text.includes('국채') || text.includes('금리') || text.includes('파킹') || text.includes('회사채')) {
        return '국가나 우량 기업에 돈을 빌려주고 이자를 받는 [안전자산·금리 연동형 상품]입니다. 주식 시장이 불안할 때 자금을 안전하게 보관하거나 금리 인하 시기에 활용합니다.';
    }
    if (text.includes('반도체') || text.includes('AI') || text.includes('빅테크') || text.includes('2차전지')) {
        return '특정 핵심 미래 산업(반도체·AI·배터리 등)의 대표 기업들만 한 바구니에 모아 집중 투자하는 [섹터·테마형 ETF]입니다.';
    }
    return '시장 전체를 대표하는 우량 기업들에 골고루 분산 투자하여, 개별 기업 악재 위험을 줄이고 시장 평균 수익을 따라가는 [기본 지수형 ETF]입니다.';
}

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
        const loggedInUserId = user?.id || (user as any)?.uid;
        if (!loggedInUserId) {
            setWatchlistSet(new Set());
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                headers: { 'X-User-ID': loggedInUserId }
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
    }, [user]);

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
        if (!user?.id && !(user as any)?.uid) return false;
        const clean = String(sym).toUpperCase().trim();
        return watchlistSet.has(clean) || Array.from(watchlistSet).some(s => s === clean || s.startsWith(clean + '.'));
    };

    const toggleWatchlistEtf = async (e: React.MouseEvent, item: EtfItem) => {
        e.preventDefault();
        e.stopPropagation();

        const loggedInUserId = user?.id || (user as any)?.uid;
        if (!loggedInUserId) {
            showToast('🔒 관심ETF 등록 및 맞춤 알림 수신은 로그인이 필요합니다.');
            if (typeof window !== 'undefined' && confirm('관심ETF 등록 및 장시작·장마감 맞춤 알림 수신은 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?')) {
                window.location.href = '/login';
            }
            return;
        }

        const sym = String(item.symbol).trim();
        const saved = isSymbolSaved(sym);
        const currentUserId = loggedInUserId;
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
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('cached_watchlist');
                    }
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
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('cached_watchlist');
                    }
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
        if (!val) return market === 'US' ? '$0.00' : '0원';
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
        if (isNaN(num)) return String(val);
        if (market === 'US') {
            return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `${Math.round(num).toLocaleString()}원`;
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
        // 미국 글로벌 ETF 운용사 매핑
        if (b.includes('ISHARES')) return { color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40', company: '블랙록(BlackRock)' };
        if (b.includes('VANGUARD')) return { color: 'text-red-300 bg-red-500/20 border-red-500/40', company: '뱅가드(Vanguard)' };
        if (b.includes('SPDR')) return { color: 'text-amber-300 bg-amber-500/20 border-amber-500/40', company: '스테이트스트리트' };
        if (b.includes('INVESCO')) return { color: 'text-blue-300 bg-blue-500/20 border-blue-500/40', company: '인베스코(Invesco)' };
        if (b.includes('PROSHARES')) return { color: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/40', company: '프로셰어즈' };
        if (b.includes('DIREXION')) return { color: 'text-purple-300 bg-purple-500/20 border-purple-500/40', company: '디렉시온(Direxion)' };
        if (b.includes('SCHWAB')) return { color: 'text-sky-300 bg-sky-500/20 border-sky-500/40', company: '찰스슈왑(Schwab)' };
        if (b.includes('JPMORGAN')) return { color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40', company: 'JP모건(JPMorgan)' };
        if (b.includes('VANECK')) return { color: 'text-teal-300 bg-teal-500/20 border-teal-500/40', company: '반에크(VanEck)' };
        if (b.includes('ARK')) return { color: 'text-pink-300 bg-pink-500/20 border-pink-500/40', company: '아크(ARK Invest)' };
        if (b.includes('GRANITESHARES') || b.includes('GLOBAL X') || b.includes('FIRST TRUST')) return { color: 'text-violet-300 bg-violet-500/20 border-violet-500/40', company: '글로벌 테마운용' };
        return { color: 'text-zinc-300 bg-white/10 border-white/15', company: '글로벌 운용사' };
    };

    // 괴리율 정밀 통계 판독 헬퍼 (KRX 표준 용어: 할인 괴리 / 할증 괴리 / NAV 수렴 + 1주당 산술 편차)
    const getNavDisparityAnalysis = (item: EtfItem) => {
        const gap = item.nav_gap_num || 0;
        const priceNum = item.price_num || parseFloat(String(item.price || 0).replace(/,/g, '')) || 0;
        const navNum = item.nav_num || parseFloat(String(item.nav || 0).replace(/,/g, '')) || 0;
        const rawDiff = item.nav_diff_krw !== undefined ? item.nav_diff_krw : (priceNum > 0 && navNum > 0 ? (priceNum - navNum) : 0);
        const diffFormatted = market === 'US'
            ? `${rawDiff > 0 ? '+' : rawDiff < 0 ? '-' : ''}$${Math.abs(rawDiff).toFixed(2)}`
            : `${rawDiff > 0 ? '+' : rawDiff < 0 ? '-' : ''}${Math.abs(Math.round(rawDiff)).toLocaleString()}원`;

        if (Math.abs(gap) >= 1.0) {
            return {
                label: gap > 0 ? '⚠️ 할증 확대 (+1%↑)' : '📉 할인 확대 (-1%↓)',
                subText: rawDiff !== 0 ? `NAV 대비 ${diffFormatted} 편차` : 'LP 호가 스프레드 확대 구간',
                badgeClass: gap > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                textClass: gap > 0 ? 'text-amber-400' : 'text-cyan-400'
            };
        }
        if (gap <= -0.15) {
            return {
                label: '📉 할인 괴리 (NAV 하회)',
                subText: rawDiff < 0 ? `NAV 대비 ${diffFormatted} 낮음` : '시장가가 NAV 하회 중',
                badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                textClass: 'text-cyan-300'
            };
        }
        if (gap >= 0.15) {
            return {
                label: '📈 할증 괴리 (NAV 상회)',
                subText: rawDiff > 0 ? `NAV 대비 ${diffFormatted} 높음` : '시장가가 NAV 상회 중',
                badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
                textClass: 'text-orange-300'
            };
        }
        return {
            label: '✅ NAV 수렴 (정상 범위)',
            subText: rawDiff !== 0 ? `NAV 편차 ${diffFormatted} (일치)` : '시장가·순자산가치 일치 구간',
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
            const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
            list = list.filter(item => {
                const brandCompany = getBrandInfo(item.brand).company || '';
                const searchableText = [
                    item.name || '',
                    (item.name || '').replace(/\s+/g, ''),
                    item.symbol || '',
                    item.brand || '',
                    brandCompany,
                    item.category_name || ''
                ].join(' ').toLowerCase();
                return tokens.every(tok => searchableText.includes(tok));
            });
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
                        <BeginnerTooltip
                            align="left"
                            title="상위 ETF 총 거래대금이란?"
                            desc="오늘 하루 동안 주요 ETF들에서 사고팔린 전체 금액의 합계입니다. 숫자가 클수록 시장에 현금(유동성)이 활발하게 돌고 있다는 뜻입니다."
                        >
                            <span className="flex items-center gap-1.5 cursor-help">
                                <Coins className="w-4 h-4 text-blue-400" />
                                <span>상위 ETF 총 거래대금</span>
                                <HelpCircle className="w-3.5 h-3.5 text-blue-400/70" />
                            </span>
                        </BeginnerTooltip>
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
                        <BeginnerTooltip
                            title="거래대금 1위 ETF란?"
                            desc="오늘 투자자들의 돈이 가장 많이 몰린 '시장 주인공' ETF입니다. 지금 시장 참여자들이 상승(레버리지)과 하락(인버스) 중 어디에 가장 크게 반응하는지 한눈에 보여줍니다."
                        >
                            <span className="flex items-center gap-1.5 cursor-help">
                                <Flame className="w-4 h-4 text-purple-400" />
                                <span>거래대금 1위 ETF</span>
                                <HelpCircle className="w-3.5 h-3.5 text-purple-400/70" />
                            </span>
                        </BeginnerTooltip>
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
                        <BeginnerTooltip
                            title="NAV 할인 · 괴리율 통계란?"
                            desc="ETF 안에 담긴 주식들의 실제 원가(NAV)보다 시장 가격이 더 싸게 거래되는 '할인 괴리(-)' 종목 수입니다. 클릭하면 본래 가치보다 저렴하게 거래 중인 순서대로 정렬합니다."
                        >
                            <span className="flex items-center gap-1.5 text-zinc-300 cursor-help">
                                <ShieldAlert className={`w-4 h-4 ${macroStats.gapAlertCount > 0 ? 'text-amber-400' : 'text-cyan-400'}`} />
                                <span>NAV 할인 · 괴리율 통계</span>
                                <HelpCircle className="w-3.5 h-3.5 text-cyan-400/70" />
                            </span>
                        </BeginnerTooltip>
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
                        <BeginnerTooltip
                            align="right"
                            title="당일 최고 급등 ETF란?"
                            desc="오늘 장에서 전일 대비 상승률이 가장 높은 ETF입니다. 클릭하면 상승률이 높은 순서대로 전체 목록을 즉시 정렬해 보여줍니다."
                        >
                            <span className="flex items-center gap-1.5 cursor-help">
                                <TrendingUp className="w-4 h-4 text-rose-400" />
                                <span>당일 최고 급등 ETF</span>
                                <HelpCircle className="w-3.5 h-3.5 text-rose-400/70" />
                            </span>
                        </BeginnerTooltip>
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
                        <BeginnerTooltip
                            align="left"
                            title="지수·레버리지형 vs 인버스형 거래대금 비중이란?"
                            desc="시장이 오를 때 수익이 나는 상품(지수·레버리지)과 시장이 내릴 때 수익이 나는 청개구리 상품(인버스) 중 어디에 오늘 거래대금이 더 많이 몰렸는지 비교한 줄다리기 지표입니다."
                        >
                            <div className="flex items-center gap-2 cursor-help">
                                <span className="text-base">📊</span>
                                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                                    <span>지수·레버리지형 vs 인버스형 거래대금 비중</span>
                                    <HelpCircle className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
                                </h4>
                            </div>
                        </BeginnerTooltip>
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
                        <BeginnerTooltip
                            align="left"
                            title="섹터별 ETF 실시간 자금 쏠림 레이더란?"
                            desc="반도체·AI, 2차전지, 배당, 채권 등 6가지 핵심 분야 중 오늘 어디로 가장 많은 거래대금이 몰리고 평균 몇 % 올랐는지 요약한 표입니다. 원하는 박스를 클릭하면 해당 분야 ETF만 골라 볼 수 있습니다."
                        >
                            <div className="flex items-center gap-2 cursor-help">
                                <Flame className="w-4 h-4 text-amber-400" />
                                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                                    <span>섹터별 ETF 실시간 자금 쏠림 레이더 (클릭 시 즉시 필터)</span>
                                    <HelpCircle className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                                </h4>
                            </div>
                        </BeginnerTooltip>
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
            <div className="p-5 md:p-8 rounded-3xl bg-zinc-900/70 border border-white/10 backdrop-blur-xl relative overflow-visible shadow-2xl space-y-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
                
                {/* Header Title & View Toggle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">ETF Statistics &amp; NAV Radar</span>
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                TOP {displayLimit}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <span>🎓</span>
                                <span>용어에 마우스를 올리면 초보자 설명이 나타납니다</span>
                            </span>
                        </div>
                        <p className="text-zinc-400 font-medium text-xs">
                            ⭐ 각 ETF 카드의 <strong className="text-amber-300">[관심ETF 알림받기]</strong> 버튼을 누르면 내 관심종목에 저장되어 장시작 시가·장마감 수익률·괴리율 브리핑을 받아보실 수 있습니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* ⭐ 내 관심 ETF만 보기 토글 */}
                        <button
                            onClick={() => {
                                const loggedInUserId = user?.id || (user as any)?.uid;
                                if (!loggedInUserId) {
                                    showToast('🔒 내 관심 ETF 모아보기는 로그인이 필요합니다.');
                                    if (typeof window !== 'undefined' && confirm('내 관심 ETF 모아보기는 로그인이 필요한 기능입니다.\n로그인 페이지로 이동하시겠습니까?')) {
                                        window.location.href = '/login';
                                    }
                                    return;
                                }
                                setOnlyWatchlist(!onlyWatchlist);
                            }}
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

                {/* Controls Bar: 1단(100% 와이드 실시간 검색창 + 추천 태그) / 2단(정렬 옵션 + 표시 개수) */}
                <div className="space-y-3.5 relative z-30 bg-zinc-950/90 border border-white/15 p-4 md:p-5 rounded-2xl shadow-lg">
                    {/* 1단: 풀 와이드(100% 폭) 실시간 검색창 (글자 잘림 완벽 방지) */}
                    <div className="flex flex-col gap-2.5 w-full">
                        <div className="relative w-full min-w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-blue-400 pointer-events-none z-10" />
                            <input
                                type="text"
                                placeholder="ETF 종목명, 운용사(삼성·미래에셋), 티커 코드 검색 (예: KODEX 200, TIGER 반도체, 미국배당, SOXL, SCHD...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: '#18181b', minWidth: '100%' }}
                                className={`block w-full min-w-full pl-11 ${searchQuery ? 'pr-32' : 'pr-4'} py-3.5 bg-zinc-900 border border-blue-500/40 focus:border-blue-400 rounded-xl text-white placeholder-gray-400 text-sm md:text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner`}
                            />
                            {searchQuery && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                                    <span className="text-[11px] font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-md">
                                        {processedData.length}건
                                    </span>
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-xs font-bold text-gray-200 hover:text-white bg-white/15 hover:bg-red-500/30 border border-white/10 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                                    >
                                        ✕ 지우기
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 원클릭 빠른 검색 키워드 칩 */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-gray-400 mr-1">🔥 인기 검색:</span>
                            {['반도체', '미국', '배당', '2차전지', '레버리지', '인버스', '채권', 'KODEX', 'TIGER'].map((kw) => {
                                const active = searchQuery.trim().toLowerCase() === kw.toLowerCase();
                                return (
                                    <button
                                        key={kw}
                                        onClick={() => setSearchQuery(active ? '' : kw)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                            active
                                                ? 'bg-blue-600/30 border-blue-400 text-blue-200 shadow-sm'
                                                : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        #{kw}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2단: 정렬 필터 + 표시 개수 선택 */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/10">
                        {/* 정렬 필터 (마우스 오버 시 초보자 설명 표시) */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-gray-400 shrink-0 flex items-center gap-1 mr-1">
                                <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" /> 정렬:
                            </span>
                            {[
                                {
                                    id: 'amount',
                                    label: '🔥 거래대금순',
                                    title: '거래대금순 정렬이란?',
                                    desc: '오늘 하루 동안 사고팔린 금액(현금 거래량)이 가장 많은 인기 순서대로 보여줍니다.'
                                },
                                {
                                    id: 'market_sum',
                                    label: '🏛️ 순자산(시총)순',
                                    title: '순자산(시가총액)순 정렬이란?',
                                    desc: '이 ETF에 모여 있는 전체 투자금(펀드 덩치·규모)이 가장 큰 순서대로 보여줍니다. 규모가 클수록 거래가 안정적입니다.'
                                },
                                {
                                    id: 'turnover',
                                    label: '⚡ 자금회전율순',
                                    title: '자금회전율순 정렬이란?',
                                    desc: '전체 펀드 덩치 대비 오늘 하루 거래된 금액 비율(거래대금÷순자산)이 높은 순서입니다. 덩치에 비해 오늘 돈이 가장 뜨겁게 몰리는 종목을 찾습니다.'
                                },
                                {
                                    id: 'discount_best',
                                    label: '📉 NAV할인괴리순',
                                    title: 'NAV 할인괴리순 정렬이란?',
                                    desc: 'ETF 바구니 안의 실제 주식 가치(NAV·원가)보다 현재 시장 가격이 더 싸게(할인 상태, -괴리율) 나와 있는 순서대로 보여줍니다.'
                                },
                                {
                                    id: 'change_high',
                                    label: '📈 급등순',
                                    title: '급등순 정렬이란?',
                                    desc: '어제 종가 대비 오늘 상승률(%)이 가장 높은 순서대로 보여줍니다.'
                                },
                                {
                                    id: 'nav_gap',
                                    label: '⚠️ 괴리율폭순',
                                    title: '괴리율폭순 정렬이란?',
                                    desc: '본래 가치(NAV)와 현재 시장 가격의 차이(할증이든 할인이든 절대값)가 가장 크게 벌어진 순서대로 보여줍니다.'
                                },
                                {
                                    id: 'three_month',
                                    label: '👑 3M수익률순',
                                    title: '3개월 누적 수익률순이란?',
                                    desc: '하루 반짝 등락이 아니라 최근 3개월 동안 가장 꾸준히 높은 수익률을 기록한 추세 종목 순서대로 보여줍니다.'
                                }
                            ].map((s) => (
                                <BeginnerTooltip key={s.id} title={s.title} desc={s.desc}>
                                    <button
                                        onClick={() => setSortField(s.id as SortField)}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                            sortField === s.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                </BeginnerTooltip>
                            ))}
                        </div>

                        {/* 표시 개수 선택 (20, 50, 100) */}
                        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10 shrink-0 ml-auto">
                            {[20, 50, 100].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setDisplayLimit(num)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                                            <article className={`h-full flex flex-col justify-between bg-zinc-900/90 hover:bg-zinc-800/90 border transition-all duration-200 hover:shadow-xl relative overflow-visible rounded-2xl p-4 md:p-5 ${
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
                                                                <BeginnerTooltip
                                                                    align="left"
                                                                    title={`운용사 브랜드: ${item.brand} (${brandInfo.company})`}
                                                                    desc={`이 ETF 상품을 설계하고 굴리는 자산운용사(${brandInfo.company})의 브랜드 이름입니다. (예: 삼성 KODEX, 미래에셋 TIGER, 블랙록 iShares 등)`}
                                                                >
                                                                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-help ${brandInfo.color}`}>
                                                                        <span>{item.brand}</span>
                                                                        <span className="text-[9px] opacity-75 font-normal hidden sm:inline">({brandInfo.company})</span>
                                                                    </span>
                                                                </BeginnerTooltip>
                                                            )}
                                                            {item.category_name && (
                                                                <BeginnerTooltip
                                                                    title={`상품 유형: ${item.category_name}`}
                                                                    desc={getCategoryBeginnerDesc(item.category_name, item.name)}
                                                                >
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1 cursor-help">
                                                                        <span>{item.category_name}</span>
                                                                        <HelpCircle className="w-2.5 h-2.5 text-gray-400" />
                                                                    </span>
                                                                </BeginnerTooltip>
                                                            )}
                                                            {turnover >= 20 && (
                                                                <BeginnerTooltip
                                                                    title="🔥 수급폭발 (고회전율) 배지란?"
                                                                    desc={`전체 펀드 규모(시총) 대비 오늘 하루 거래된 금액 비율이 ${turnover}%에 달한다는 뜻입니다. 20% 이상이면 시장 단기 매매 자금이 아주 뜨겁게 몰리고 있는 상태입니다.`}
                                                                >
                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse cursor-help">
                                                                        🔥 수급폭발 (회전율 {turnover}%)
                                                                    </span>
                                                                </BeginnerTooltip>
                                                            )}
                                                        </div>

                                                        {/* ⭐ 원터치 내 관심종목(ETF 알림) 등록/해제 버튼 */}
                                                        <BeginnerTooltip
                                                            align="right"
                                                            title="⭐ 관심ETF 알림받기 기능"
                                                            desc="이 버튼을 누르면 내 관심종목에 저장되어, 매일 아침 장 시작 시가와 장 마감 수익률·괴리율 결산 리포트를 나만의 맞춤 알림으로 받아보실 수 있습니다."
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={(e) => toggleWatchlistEtf(e, item)}
                                                                disabled={togglingSymbol === item.symbol}
                                                                className={`px-2.5 py-1 rounded-xl text-[11px] font-black border flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                                                                    saved
                                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                                                                        : 'bg-white/5 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border-white/10 hover:border-amber-500/40'
                                                                }`}
                                                            >
                                                                <Star className={`w-3.5 h-3.5 ${saved ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`} />
                                                                <span>{saved ? '관심ETF 등록됨' : '+ 관심ETF 알림받기'}</span>
                                                            </button>
                                                        </BeginnerTooltip>
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
                                                                <BeginnerTooltip
                                                                    align="left"
                                                                    title={`실시간 괴리율 판독: ${navAnalysis.label}`}
                                                                    desc={navAnalysis.tooltip}
                                                                >
                                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-help ${navAnalysis.badgeClass}`}>
                                                                        <span>{navAnalysis.label}</span>
                                                                        <HelpCircle className="w-2.5 h-2.5 opacity-80" />
                                                                    </span>
                                                                </BeginnerTooltip>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-base md:text-lg font-black text-white tabular-nums tracking-tight font-mono">
                                                                {formatPrice(item.price)}
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

                                                {/* 하단 6대 핵심 지표 그리드 (마우스 오버 시 초보자 눈높이 설명 풍선 표시!) */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-white/5 text-[11px]">
                                                    {/* 1. 거래대금 */}
                                                    <BeginnerTooltip
                                                        align="left"
                                                        title="당일 거래대금 (FLOW) 이란?"
                                                        desc="오늘 하루 동안 이 ETF가 시장에서 사고팔린 총 현금 액수입니다. 거래대금이 많을수록 내가 원할 때 언제든 바로 사고팔기 쉽습니다(유동성 풍부)."
                                                    >
                                                        <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-2 w-full cursor-help">
                                                            <div className="text-zinc-400 text-[10px] font-bold flex items-center justify-between">
                                                                <span className="flex items-center gap-1">
                                                                    <span>당일 거래대금</span>
                                                                    <HelpCircle className="w-2.5 h-2.5 text-zinc-500" />
                                                                </span>
                                                                <span className="text-[9px] text-blue-400 font-mono">FLOW</span>
                                                            </div>
                                                            <div className="font-black text-white truncate mt-0.5 font-mono">{item.amount || '-'}</div>
                                                        </div>
                                                    </BeginnerTooltip>

                                                    {/* 2. 순자산총액(AUM / 시총) */}
                                                    <BeginnerTooltip
                                                        title="순자산총액 (시총 · AUM) 이란?"
                                                        desc="이 ETF 통장에 모여 있는 전체 투자금(펀드 덩치)입니다. 순자산이 큰 대형 ETF일수록 상장폐지 위험이 없고 운용이 안정적입니다."
                                                    >
                                                        <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-2 w-full cursor-help">
                                                            <div className="text-zinc-400 text-[10px] font-bold flex items-center justify-between">
                                                                <span className="flex items-center gap-1">
                                                                    <span>순자산총액(시총)</span>
                                                                    <HelpCircle className="w-2.5 h-2.5 text-zinc-500" />
                                                                </span>
                                                                <span className="text-[9px] text-purple-400 font-mono">AUM</span>
                                                            </div>
                                                            <div className="font-black text-purple-200 truncate mt-0.5 font-mono">
                                                                {item.market_sum || (market === 'US' ? '대형 글로벌' : '-')}
                                                            </div>
                                                        </div>
                                                    </BeginnerTooltip>

                                                    {/* 3. 당일 자금 회전율 & 거래량 */}
                                                    <BeginnerTooltip
                                                        align="right"
                                                        title="자금 회전율 · 거래량이란?"
                                                        desc="전체 펀드 덩치(시총) 대비 오늘 하루 거래대금의 비율입니다. 예를 들어 회전율이 30%라면 전체 펀드 자금의 30%만큼 오늘 활발하게 손바뀜이 일어났다는 뜻입니다."
                                                    >
                                                        <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-2 w-full cursor-help">
                                                            <div className="text-zinc-400 text-[10px] font-bold flex items-center justify-between">
                                                                <span className="flex items-center gap-1">
                                                                    <span>자금 회전율 · 거래량</span>
                                                                    <HelpCircle className="w-2.5 h-2.5 text-zinc-500" />
                                                                </span>
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
                                                    </BeginnerTooltip>

                                                    {/* 4. 실시간 NAV (순자산가치) */}
                                                    <BeginnerTooltip
                                                        align="left"
                                                        title="실시간 NAV (순자산가치 · 본래가치) 란?"
                                                        desc="ETF 바구니 안에 실제로 들어있는 주식들의 진짜 원가(1주당 본래 가치)입니다. 현재 주가가 이 NAV보다 낮으면 본래 가치보다 싸게(할인) 거래되는 것입니다."
                                                    >
                                                        <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-2 w-full cursor-help">
                                                            <div className="text-zinc-400 text-[10px] font-bold flex items-center gap-1">
                                                                <span>실시간 NAV (본래가치)</span>
                                                                <HelpCircle className="w-2.5 h-2.5 text-zinc-500" />
                                                            </div>
                                                            <div className="font-black text-zinc-100 truncate font-mono mt-0.5">
                                                                {item.nav && item.nav !== '-' ? (market === 'US' ? `$${item.nav}` : `${item.nav}원`) : '실시간 연동'}
                                                            </div>
                                                        </div>
                                                    </BeginnerTooltip>

                                                    {/* 5. 괴리율 & 1주당 원화 차익 판독 */}
                                                    <BeginnerTooltip
                                                        title="괴리율 (할증 · 할인 차이) 이란?"
                                                        desc="현재 시장 가격과 본래 가치(NAV)의 차이 비율입니다. 마이너스(-)면 본래 가치보다 싸게 파는 '할인 상태'이고, 플러스(+)가 너무 크면 본래 가치보다 비싸게 주고 사는 '고평가 할증 상태'입니다."
                                                    >
                                                        <div className={`rounded-xl p-2 border w-full cursor-help ${navAnalysis.badgeClass}`}>
                                                            <div className="text-[10px] font-bold flex items-center justify-between">
                                                                <span className="flex items-center gap-1">
                                                                    <span>괴리율 ({item.nav_gap || '0.00%'})</span>
                                                                    <HelpCircle className="w-2.5 h-2.5 opacity-80" />
                                                                </span>
                                                            </div>
                                                            <div className={`font-black truncate text-[10px] mt-0.5 ${navAnalysis.textClass}`}>
                                                                {navAnalysis.subText}
                                                            </div>
                                                        </div>
                                                    </BeginnerTooltip>

                                                    {/* 6. 3개월 누적 수익률 */}
                                                    <BeginnerTooltip
                                                        align="right"
                                                        title="3개월 누적 수익률이란?"
                                                        desc="오늘 하루만의 등락이 아니라, 3개월 전부터 오늘까지 이 ETF를 보유했을 때의 중기 누적 성적표입니다. 중장기 추세가 상승장인지 하락장인지 보여줍니다."
                                                    >
                                                        <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-2 w-full cursor-help">
                                                            <div className="text-zinc-400 text-[10px] font-bold flex items-center gap-1">
                                                                <span>3개월 누적 수익률</span>
                                                                <HelpCircle className="w-2.5 h-2.5 text-zinc-500" />
                                                            </div>
                                                            <div className={`font-black font-mono truncate mt-0.5 ${
                                                                (item.three_month_num || 0) > 0 ? 'text-red-400' : (item.three_month_num || 0) < 0 ? 'text-blue-400' : 'text-gray-400'
                                                            }`}>
                                                                {item.three_month_return || '-'}
                                                            </div>
                                                        </div>
                                                    </BeginnerTooltip>
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
                                                                <BeginnerTooltip
                                                                    title="총보수 (TER · 운용수수료) 란?"
                                                                    desc="자산운용사가 ETF를 대신 굴려주는 대가로 1년 동안 펀드 자산에서 매일 아주 조금씩 자동으로 떼어가는 연간 수수료율입니다. 낮을수록 장기 투자에 유리합니다."
                                                                >
                                                                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 cursor-help flex items-center gap-1">
                                                                        <span>총보수(TER): <strong className="text-amber-300">{quickDetail.expense_ratio || '연 0.15~0.45%'}</strong></span>
                                                                        <HelpCircle className="w-2.5 h-2.5 text-zinc-400" />
                                                                    </span>
                                                                </BeginnerTooltip>
                                                                <BeginnerTooltip
                                                                    align="right"
                                                                    title="배당/분배금 (Dividend) 이란?"
                                                                    desc="ETF 바구니 안의 기업들로부터 받은 배당금이나 채권 이자를 투자자들에게 월별·분기별로 현금으로 나눠주는 비율(연환산 배당수익률)입니다."
                                                                >
                                                                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 cursor-help flex items-center gap-1">
                                                                        <span>배당/분배금: <strong className="text-emerald-300">{quickDetail.dividend_yield || '운용사 기준'}</strong></span>
                                                                        <HelpCircle className="w-2.5 h-2.5 text-zinc-400" />
                                                                    </span>
                                                                </BeginnerTooltip>
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
                                                {formatPrice(item.price)}
                                            </td>
                                            <td className={`p-3 text-right font-mono font-bold ${colorClass}`}>
                                                {positive ? '▲' : negative ? '▼' : ''}{Math.abs(item.change_percent || 0).toFixed(2)}%
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-200">{item.amount || '-'}</td>
                                            <td className="p-3 text-right font-mono text-purple-300">{item.market_sum || '-'}</td>
                                            <td className={`p-3 text-right font-mono font-bold ${turnover >= 20 ? 'text-rose-400' : 'text-gray-300'}`}>
                                                {turnover > 0 ? `${turnover}%` : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-300">
                                                {item.nav && item.nav !== '-' ? (market === 'US' ? `$${item.nav}` : `${item.nav}원`) : '-'}
                                            </td>
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
