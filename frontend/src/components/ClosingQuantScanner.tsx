"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Sparkles, 
    Calendar, 
    TrendingUp, 
    TrendingDown, 
    CheckCircle2, 
    Clock, 
    Activity, 
    RefreshCw, 
    ShieldCheck, 
    Info, 
    HelpCircle,
    ChevronRight, 
    Flame, 
    Coins, 
    BarChart3, 
    ArrowUpRight,
    ExternalLink,
    Target,
    Star,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import QuantTooltip from '@/components/QuantTooltip';

interface ScannerItem {
    code: string;
    name: string;
    market: string;
    entryPrice: number;
    currentPrice: number;
    returnRate: number;
    highestReturnRate: number;
    resistancePrice: number;
    reachedResistance: boolean;
    reachedDate?: string;
    reachedDisplayDate?: string;
    reachedDaysTook?: string;
    highestPrice: number;
    volRatio: number;
    majorBuyer: string;
    cvd?: {
        strength: number;
        label: string;
        isBullish: boolean;
    };
    obv?: {
        trend: string;
        label: string;
        isBullish: boolean;
    };
}

interface ScannerResponse {
    status: string;
    daysAgo: number;
    targetDate: string;
    displayDate: string;
    totalCount: number;
    reachedCount: number;
    successRate: number;
    avgReturn: number;
    filterRules: string[];
    disclaimer: string;
    data: ScannerItem[];
}

export default function ClosingQuantScanner() {
    const [daysAgo, setDaysAgo] = useState<number>(0);
    const [data, setData] = useState<ScannerResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // 관심종목 연동 상태
    const { user } = useAuth();
    const [watchlistSet, setWatchlistSet] = useState<Set<string>>(new Set());
    const [togglingCode, setTogglingCode] = useState<string | null>(null);
    const [isBatchAdding, setIsBatchAdding] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setToastMessage(null);
        }, 2500);
    }, []);

    // 관심종목 목록 로드 및 실시간 동기화
    const fetchWatchlistSet = useCallback(async () => {
        try {
            const currentUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null) || 'guest';
            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                headers: { "X-User-ID": currentUserId }
            });
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                const set = new Set<string>();
                json.data.forEach((item: any) => {
                    const sym = typeof item === 'string' ? item : item.symbol;
                    if (sym) {
                        set.add(sym);
                        if (sym.includes('.')) {
                            set.add(sym.split('.')[0]);
                        }
                    }
                });
                setWatchlistSet(set);
            }
        } catch (err) {
            console.error("Watchlist fetch error in scanner:", err);
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

    // 단일 종목 관심종목 등록 / 해제 토글
    const toggleWatchlist = async (item: ScannerItem) => {
        const isSaved = watchlistSet.has(item.code) || Array.from(watchlistSet).some(s => s === item.code || s.startsWith(item.code));
        const currentUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null) || 'guest';
        
        setTogglingCode(item.code);
        try {
            if (isSaved) {
                // 관심종목 해제 (DELETE)
                const targetSymbol = Array.from(watchlistSet).find(s => s === item.code || s.startsWith(item.code)) || item.code;
                const res = await fetch(`${API_BASE_URL}/api/watchlist/${encodeURIComponent(targetSymbol)}`, {
                    method: 'DELETE',
                    headers: { "X-User-ID": currentUserId }
                });
                const json = await res.json();
                if (json.status === 'success') {
                    setWatchlistSet(prev => {
                        const next = new Set(prev);
                        next.delete(targetSymbol);
                        next.delete(item.code);
                        return next;
                    });
                    showToast(`⭐️ [${item.name}] 관심종목에서 해제되었습니다.`);
                    window.dispatchEvent(new CustomEvent('watchlistChanged'));
                }
            } else {
                // 관심종목 추가 (POST)
                const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': currentUserId
                    },
                    body: JSON.stringify({
                        symbol: item.code,
                        price: item.currentPrice
                    })
                });
                const json = await res.json();
                if (json.status === 'success') {
                    setWatchlistSet(prev => new Set(prev).add(item.code));
                    showToast(`🌟 [${item.name}] 관심종목에 추가되었습니다!`);
                    window.dispatchEvent(new CustomEvent('watchlistChanged'));
                }
            }
        } catch (err) {
            console.error("Watchlist toggle failed:", err);
            showToast("⚠️ 관심종목 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setTogglingCode(null);
        }
    };

    // 당일 포착 종목 전체 일괄 관심종목 등록
    const addAllToWatchlist = async () => {
        if (!data?.data || data.data.length === 0 || isBatchAdding) return;

        const currentUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('user_id') : null) || 'guest';
        
        // 아직 관심종목에 없는 종목 추출
        const unaddedItems = data.data.filter(item => {
            const isSaved = watchlistSet.has(item.code) || Array.from(watchlistSet).some(s => s === item.code || s.startsWith(item.code));
            return !isSaved;
        });

        if (unaddedItems.length === 0) {
            showToast("✨ 포착된 모든 종목이 이미 관심종목에 등록되어 있습니다.");
            return;
        }

        setIsBatchAdding(true);
        let successCount = 0;
        try {
            await Promise.all(
                unaddedItems.map(async (item) => {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-User-ID': currentUserId
                            },
                            body: JSON.stringify({
                                symbol: item.code,
                                price: item.currentPrice
                            })
                        });
                        const json = await res.json();
                        if (json.status === 'success') {
                            successCount++;
                        }
                    } catch (e) {
                        console.error(`Failed to add ${item.code}`, e);
                    }
                })
            );

            if (successCount > 0) {
                setWatchlistSet(prev => {
                    const next = new Set(prev);
                    unaddedItems.forEach(i => next.add(i.code));
                    return next;
                });
                showToast(`🎉 당일 포착 ${successCount}개 종목이 관심종목에 일괄 등록되었습니다!`);
                window.dispatchEvent(new CustomEvent('watchlistChanged'));
            }
        } catch (err) {
            console.error("Batch add failed:", err);
            showToast("⚠️ 일괄 등록 중 일부 오류가 발생했습니다.");
        } finally {
            setIsBatchAdding(false);
        }
    };

    const tabs = [
        { days: 0, label: "오늘 포착" },
        { days: 1, label: "1일 전" },
        { days: 2, label: "2일 전" },
        { days: 3, label: "3일 전" },
        { days: 4, label: "4일 전" },
        { days: 5, label: "5일 전" }
    ];

    const fetchScannerData = (selectedDays: number) => {
        setLoading(true);
        setIsRefreshing(true);
        fetch(`${API_BASE_URL}/api/scanner/closing?days_ago=${selectedDays}`)
            .then(res => res.json())
            .then(json => {
                if (json.status === 'success') {
                    setData(json);
                }
            })
            .catch(err => console.error("Closing scanner fetch error:", err))
            .finally(() => {
                setLoading(false);
                setIsRefreshing(false);
            });
    };

    useEffect(() => {
        fetchScannerData(daysAgo);
    }, [daysAgo]);

    return (
        <div className="w-full relative overflow-hidden bg-gradient-to-br from-[#0B0F19]/95 via-[#121829]/95 to-[#090C15]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.12)] transition-all">
            {/* 은은한 배경 앰비언트 글로우 */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16"></div>

            {/* 상단 럭셔리 네온 액센트 라인 */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-blue-500/80 via-emerald-400/80 to-transparent pointer-events-none"></div>

            {/* 헤더 섹션 */}
            <div className="relative border-b border-white/10 pb-6 mb-6">
                {/* 상단 인텔리전스 라이브 상태 바 */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 shadow-sm shadow-emerald-500/10">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            KRX 15:30 종가 수급 연동
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30">
                            <Sparkles className="w-3 h-3 text-blue-400" />
                            AI 퀀트 알고리즘 V4.2
                        </span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        <span className="text-xs font-mono text-slate-300 bg-white/[0.05] px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {data?.targetDate ? `${data.targetDate.slice(0,4)}.${data.targetDate.slice(4,6)}.${data.targetDate.slice(6,8)} 기준` : "실시간 갱신"}
                        </span>
                        <button 
                            onClick={addAllToWatchlist} 
                            disabled={isBatchAdding || !data?.data?.length}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-xs font-bold text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-all active:scale-95 disabled:opacity-50 shadow-sm shadow-amber-500/10"
                            title="현재 화면의 모든 포착 종목을 관심종목에 일괄 등록합니다"
                        >
                            {isBatchAdding ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            ) : (
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            )}
                            <span>전체 관심등록</span>
                        </button>
                        <button 
                            onClick={() => fetchScannerData(daysAgo)} 
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-xs font-bold text-blue-200 hover:text-white border border-blue-500/30 transition-all active:scale-95 disabled:opacity-50 shadow-sm shadow-blue-500/10"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : 'text-blue-300'}`} />
                            <span>새로고침</span>
                        </button>
                    </div>
                </div>

                {/* 메인 타이틀 영역 */}
                <div className="flex items-start gap-3.5 mb-5">
                    <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-indigo-500/20 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.25)] shrink-0 hidden sm:block">
                        <Flame className="w-7 h-7 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                                장마감 수급 퀀트 스캐너
                            </h2>
                            <span className="text-[11px] font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent border border-blue-500/30 px-2.5 py-0.5 rounded-full bg-blue-500/10 uppercase">
                                PRO QUANT
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300/90 mt-1.5 leading-relaxed">
                            정규장 장마감 시점 거래량 급증 및 메이저 수급 집중 종목을 객관적 알고리즘으로 추출하고, 기술적 벤치마크선 도달 여부를 통계적으로 추적합니다.
                        </p>
                    </div>
                </div>

                {/* 3대 핵심 퀀트 필터 벤토 그리드 (프리미엄 미니 카드 3종) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-white/5">
                    <div className="rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 p-3 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="p-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <BarChart3 className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-white">거래량 폭발 필터</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                            5일 평균 대비 거래량이 최소 150%~300% 이상 폭증한 종목 자동 스캔
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 p-3 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Coins className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-white">메이저 수급 집중</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                            외인·기관 순매수 및 장중 누적 체결 델타(CVD) 집중 종목 정밀 판별
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 p-3 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                <Target className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-white">10% 벤치마크 추적</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                            스캔 시점 대비 단기 +10% 벤치마크선 도달 여부를 객관적 통계로 매일 트래킹
                        </p>
                    </div>
                </div>
            </div>

            {/* 일자별 탭 내비게이션 (오늘 ~ 5일 전) */}
            <div className="flex gap-1.5 bg-white/5 p-1 rounded-2xl overflow-x-auto scrollbar-hide mb-5">
                {tabs.map(tab => (
                    <button
                        key={tab.days}
                        onClick={() => setDaysAgo(tab.days)}
                        className={`flex-1 min-w-[70px] py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all whitespace-nowrap ${
                            daysAgo === tab.days 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25" 
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <span>{tab.label}</span>
                        {daysAgo === tab.days && data?.displayDate && (
                            <span className="text-[10px] text-blue-200 font-mono font-normal">({data.displayDate})</span>
                        )}
                    </button>
                ))}
            </div>

            {/* 초보자 인터랙티브 가이드 힌트 배너 */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 mb-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-500/25 text-xs text-blue-200 shadow-sm">
                <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
                <span className="font-sans">
                    💡 <strong>초보자 인터랙티브 가이드:</strong> 모든 통계 카드와 표 항목에 <strong>마우스를 올리시면(모바일은 터치)</strong> 실시간 계산 원리와 실전 매매 꿀팁이 상세하게 나타납니다!
                </span>
            </div>

            {/* 벤토 서머리 스탯 카드 4분할 (마우스 호버 시 상세 해설 툴팁 제공) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <QuantTooltip
                    title="🔍 스캔 종목 수"
                    headline="거래량 폭발 + 메이저 수급 유입 종목"
                    description="당일 장마감 시점, 5일 평균 대비 거래량이 최소 150%~300% 이상 급증하고 외인·기관 큰손 자금이 강하게 유입된 유망 종목의 총 개수입니다."
                    tip="매일 장마감 직후 포착된 종목 리스트를 다음 날 시초가 및 단기 관심종목으로 체크해보세요."
                    statusText="오늘 감지"
                    statusColor="blue"
                    className="w-full h-full block"
                    forcePosition="bottom"
                >
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-blue-500/30 transition-all h-full group">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400 group-hover:text-blue-300 transition-colors">스캔 종목 수</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <div className="text-lg sm:text-xl font-black text-white font-mono">
                            {data?.totalCount || 0}개
                        </div>
                    </div>
                </QuantTooltip>

                <QuantTooltip
                    title="🎯 벤치마크 도달 종목"
                    headline="+10% 목표 가격 터치에 성공한 종목 수"
                    description="포착 시점 가격 대비 +10% 상승 기준선(저항선)을 실제로 터치하거나 돌파한 검증된 종목의 개수입니다."
                    tip="포착 후 1~5일 내에 도달하는 경우가 많으므로 상단의 '1일 전~5일 전' 탭을 눌러 과거 종목들의 성적표를 확인해보세요."
                    statusText="성공 검증"
                    statusColor="emerald"
                    className="w-full h-full block"
                    forcePosition="bottom"
                >
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/30 transition-all h-full group">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400 group-hover:text-emerald-300 transition-colors">벤치마크 도달 종목</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono flex items-center gap-1">
                            <span>{data?.reachedCount || 0}개</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                        </div>
                    </div>
                </QuantTooltip>

                <QuantTooltip
                    title="📊 기준선 도달률 (승률)"
                    headline="포착 종목의 +10% 목표 도달 성공 확률"
                    description="전체 포착 종목 중 +10% 벤치마크선에 도달한 종목의 비율(도달 종목 ÷ 전체 종목)입니다."
                    tip="포착 당일에는 10% 내외로 시작하지만, 2~5일이 지나면서 도달률이 점점 높아지는 통계적 흐름을 관측할 수 있습니다."
                    statusText="도달 성공률"
                    statusColor="indigo"
                    className="w-full h-full block"
                    forcePosition="bottom"
                >
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/30 transition-all h-full group">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400 group-hover:text-indigo-300 transition-colors">기준선 도달률</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                            {data?.successRate || 0}%
                        </div>
                    </div>
                </QuantTooltip>

                <QuantTooltip
                    title="📈 평균 변동률 (수익률)"
                    headline="포착 종목들의 현재 평균 성적표"
                    description="스캔 당시 가격과 현재가를 비교하여, 포착된 종목들이 평균 몇 % 상승하거나 하락했는지를 투명하게 집계한 퀀트 성적표입니다."
                    tip="시장 지수(코스피·코스닥) 대비 우리 알고리즘 종목들이 얼마나 초과 수익을 내고 있는지 객관적으로 비교해보세요."
                    statusText="통계 검증"
                    statusColor="rose"
                    className="w-full h-full block"
                    forcePosition="bottom"
                    align="right"
                >
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-rose-500/30 transition-all h-full group">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400 group-hover:text-rose-300 transition-colors">평균 변동률</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
                        </div>
                        <div className={`text-lg sm:text-xl font-black font-mono ${(data?.avgReturn || 0) >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                            {(data?.avgReturn || 0) > 0 ? `+${data?.avgReturn}%` : `${data?.avgReturn}%`}
                        </div>
                    </div>
                </QuantTooltip>
            </div>

            {/* 데이터 테이블 컨테이너 */}
            <div className="space-y-2">
                {/* 모바일 전용 좌우 스크롤 힌트 */}
                <div className="flex md:hidden items-center justify-between px-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span>포착 종목 퀀트 현황</span>
                    </span>
                    <span className="text-[11px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>👈 좌우로 밀어서 전체 확인 👉</span>
                    </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl">
                    {loading ? (
                        <div className="py-16 text-center text-slate-400 space-y-3">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                            <p className="text-xs">수급 퀀트 알고리즘 데이터를 분석하고 있습니다...</p>
                        </div>
                    ) : !data || data.data.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 text-xs">
                            해당 일자에는 퀀트 필터 기준을 충족한 포착 종목이 없습니다.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[700px]">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                                    <th className="py-3 px-3 sm:p-4 min-w-[190px] sm:min-w-[220px]">
                                        <QuantTooltip
                                            title="⭐ 관심종목 & 종목 정보"
                                            headline="별(★) 클릭으로 관심종목 즉시 등록"
                                            description="별(★) 아이콘을 클릭하면 내 관심종목에 즉시 저장되어 사이드바와 알림 기능으로 실시간 추적할 수 있습니다. 종목명을 클릭하면 '5대 안전벨트 진단'과 차트를 열람할 수 있습니다."
                                            tip="상단의 [전체 관심등록] 버튼을 누르면 오늘 포착된 모든 유망 종목을 한 번에 등록할 수 있어 매우 편리합니다."
                                            statusText="원클릭 연동"
                                            statusColor="amber"
                                            forcePosition="bottom"
                                        >
                                            <span className="inline-flex items-center gap-1.5 cursor-pointer hover:text-white border-b border-dashed border-slate-500 hover:border-white transition-colors">
                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                <span>종목코드 / 종목명</span>
                                                <HelpCircle className="w-3 h-3 text-slate-500" />
                                            </span>
                                        </QuantTooltip>
                                    </th>
                                    <th className="py-3 px-3 sm:p-4 text-center hidden md:table-cell min-w-[150px]">
                                        <div className="inline-flex items-center justify-center gap-1.5">
                                            <QuantTooltip
                                                title="📊 수급 퀀트 엔진 (CVD / OBV)"
                                                statusText="수급 델타"
                                                statusColor="blue"
                                                headline="차트 뒤에 숨은 '진짜 자금의 흐름'을 추적합니다"
                                                description="CVD는 당일 장중 '시장가 매수 vs 매도'의 실시간 힘겨루기를, OBV는 최근 20거래일 동안 세력이 물량을 모았는지 털었는지를 밝혀내는 퀀트 수급 지표입니다."
                                                tip="개별 종목의 CVD / OBV 뱃지에 마우스를 올리시거나 터치하시면 해당 종목의 상세 수급 상태를 바로 확인할 수 있습니다."
                                                forcePosition="bottom"
                                            >
                                                <span className="inline-flex items-center gap-1 cursor-pointer hover:text-white border-b border-dashed border-slate-500 hover:border-white transition-colors">
                                                    <span>CVD / OBV 수급 델타</span>
                                                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                                                </span>
                                            </QuantTooltip>
                                        </div>
                                    </th>
                                    <th className="py-3 px-3 sm:p-4 text-right min-w-[105px] whitespace-nowrap">
                                        <QuantTooltip
                                            title="⏱️ 스캔 시점 시세"
                                            headline="알고리즘이 종목을 처음 포착한 기준 가격"
                                            description="당일 장마감 시점 거래량 폭발과 메이저 수급 유입 조건을 충족하여 알고리즘이 최초 감지한 당시의 주가입니다."
                                            tip="이 가격을 기준으로 이후 수익률(+%)과 10% 벤치마크 목표선 도달 여부를 객관적으로 측정합니다."
                                            statusText="포착 기준가"
                                            statusColor="blue"
                                            forcePosition="bottom"
                                        >
                                            <span className="inline-flex items-center gap-1 cursor-pointer hover:text-white border-b border-dashed border-slate-500 hover:border-white transition-colors ml-auto">
                                                <span>스캔 시점 시세</span>
                                                <HelpCircle className="w-3 h-3 text-slate-500" />
                                            </span>
                                        </QuantTooltip>
                                    </th>
                                    <th className="py-3 px-3 sm:p-4 text-right min-w-[105px] whitespace-nowrap">
                                        <QuantTooltip
                                            title="💵 현재 시세"
                                            headline="실시간 현재 주가"
                                            description="정규장 중에는 실시간 현재가, 장마감 후에는 당일 최종 종가를 표시합니다."
                                            tip="스캔 시점 가격과 비교하여 현재 주가가 얼마나 움직였는지 한눈에 비교할 수 있습니다."
                                            statusText="현재 주가"
                                            statusColor="slate"
                                            forcePosition="bottom"
                                        >
                                            <span className="inline-flex items-center gap-1 cursor-pointer hover:text-white border-b border-dashed border-slate-500 hover:border-white transition-colors ml-auto">
                                                <span>현재 시세</span>
                                                <HelpCircle className="w-3 h-3 text-slate-500" />
                                            </span>
                                        </QuantTooltip>
                                    </th>
                                    <th className="py-3 px-3 sm:p-4 text-right min-w-[95px] whitespace-nowrap">
                                        <QuantTooltip
                                            title="📊 기준 대비 변동률"
                                            headline="스캔 시점 대비 현재까지의 수익률"
                                            description="포착 시점 가격 대비 현재 주가가 몇 % 상승하거나 하락했는지를 실시간으로 계산한 수치입니다."
                                            tip="빨간색은 상승(+), 파란색은 하락(-)을 나타내며, 포착 이후 주가의 실제 흐름을 투명하게 확인하는 핵심 지표입니다."
                                            statusText="수익률"
                                            statusColor="rose"
                                            forcePosition="bottom"
                                            align="right"
                                        >
                                            <span className="inline-flex items-center gap-1 cursor-pointer hover:text-white border-b border-dashed border-slate-500 hover:border-white transition-colors ml-auto">
                                                <span>기준 대비 변동률</span>
                                                <HelpCircle className="w-3 h-3 text-slate-500" />
                                            </span>
                                        </QuantTooltip>
                                    </th>
                                    <th className="py-3 px-3 sm:p-4 text-right min-w-[115px] whitespace-nowrap">
                                        <QuantTooltip
                                            title="🎯 기술적 벤치마크 (+10%)"
                                            headline="단기 1차 익절 목표선 (저항선)"
                                            description="스캔 시점 가격에서 정확히 +10.0% 상승한 가격입니다. 단기 매매 시 1차 수익 실현(익절) 구간으로 삼기 가장 좋은 기술적 기준선입니다."
                                            tip="주가가 이 가격 근처에 도달하면 분할 매도로 안전하게 수익을 챙기는 전략을 권장합니다."
                                            statusText="1차 목표선"
                                            statusColor="indigo"
                                            forcePosition="bottom"
                                            align="right"
                                        >
                                            <span className="inline-flex items-center gap-1 cursor-pointer hover:text-white border-b border-dashed border-slate-500 hover:border-white transition-colors ml-auto">
                                                <span>기술적 벤치마크 (+10%)</span>
                                                <HelpCircle className="w-3 h-3 text-slate-500" />
                                            </span>
                                        </QuantTooltip>
                                    </th>
                                    <th className="py-3 px-3 sm:p-4 text-center min-w-[110px] whitespace-nowrap">
                                        <QuantTooltip
                                            title="✅ 시세 도달 확인 여부"
                                            headline="+10% 목표선 실제 터치 여부 추적"
                                            description="포착 이후 당일 고가 기준으로 +10% 벤치마크선을 실제로 터치하거나 돌파했는지 실시간으로 검증한 결과입니다."
                                            tip="'도달 확인' 마크가 뜨면 1차 목표 수익률 달성에 성공한 종목입니다. '관측 중'은 현재 목표선을 향해 진행 중인 상태입니다."
                                            statusText="목표 도달 검증"
                                            statusColor="emerald"
                                            forcePosition="bottom"
                                            align="right"
                                        >
                                            <span className="inline-flex items-center gap-1 cursor-pointer hover:text-white border-b border-dashed border-slate-500 hover:border-white transition-colors">
                                                <span>시세 도달 확인</span>
                                                <HelpCircle className="w-3 h-3 text-slate-500" />
                                            </span>
                                        </QuantTooltip>
                                    </th>
                                </tr>
                            </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                            {data.data.map((item, idx) => {
                                const isUp = item.returnRate > 0;
                                const isNearBottom = idx >= data.data.length - 2;
                                const tooltipPos = isNearBottom ? "top" : "bottom";

                                return (
                                    <tr key={idx} className="hover:bg-white/[0.04] transition-colors group">
                                        {/* 종목명 및 코드 + 원클릭 관심종목 등록/해제 버튼 */}
                                        <td className="py-2.5 px-3 sm:p-4 min-w-[190px] sm:min-w-[220px]">
                                            <div className="flex items-center gap-2">
                                                {/* 원클릭 관심종목 별 버튼 */}
                                                {(() => {
                                                    const isSaved = watchlistSet.has(item.code) || Array.from(watchlistSet).some(s => s === item.code || s.startsWith(item.code));
                                                    const isToggling = togglingCode === item.code;

                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                toggleWatchlist(item);
                                                            }}
                                                            disabled={isToggling}
                                                            title={isSaved ? "관심종목에서 해제" : "관심종목에 등록"}
                                                            className={`p-1.5 rounded-xl transition-all active:scale-90 shrink-0 self-center ${
                                                                isSaved 
                                                                    ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 shadow-sm shadow-amber-400/20" 
                                                                    : "text-slate-500 hover:text-amber-300 hover:bg-white/10"
                                                            }`}
                                                        >
                                                            {isToggling ? (
                                                                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                                            ) : (
                                                                <Star 
                                                                    className={`w-4 h-4 transition-transform ${
                                                                        isSaved 
                                                                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-110" 
                                                                            : "text-slate-500 hover:scale-110"
                                                                    }`} 
                                                                />
                                                            )}
                                                        </button>
                                                    );
                                                })()}

                                                <Link href={`/stock/${item.code}`} className="flex items-center gap-2 group-hover:text-blue-400 transition-colors flex-1 min-w-0">
                                                    <div className="flex flex-col font-sans min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-bold text-white group-hover:text-blue-400 text-xs sm:text-sm truncate">{item.name}</span>
                                                            <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded font-mono shrink-0">{item.market}</span>
                                                        </div>
                                                        <span className="text-[11px] text-slate-400 font-mono">{item.code}</span>
                                                    
                                                    {/* 모바일 전용 CVD/OBV 뱃지 (줄바꿈 방지 whitespace-nowrap & 가로 정렬) */}
                                                    <div className="flex md:hidden items-center gap-1 mt-1 font-mono flex-wrap">
                                                        {item.cvd && (
                                                            <QuantTooltip
                                                                title="💎 CVD (누적 체결 델타)"
                                                                statusText={item.cvd.label}
                                                                statusColor={item.cvd.isBullish ? "emerald" : "slate"}
                                                                headline={
                                                                    item.cvd.isBullish 
                                                                        ? "🔥 시장가 매수세가 매도 물량을 압도하고 있습니다" 
                                                                        : "⏳ 매수보다 관망 및 매도 물량이 많은 숨고르기 구간"
                                                                }
                                                                description={
                                                                    item.cvd.isBullish 
                                                                        ? "호가창에 쌓인 매도 물량을 더 높은 가격을 주고라도 앞다투어 사들이는 공격적인 시장가 매수세의 힘을 측정한 지표입니다." 
                                                                        : "호가를 올려 사기보다는 아래에서 받아먹거나, 단기 차익 실현 물량이 나오며 수급이 쉬어가는 관망 상태입니다."
                                                                }
                                                                tip={
                                                                    item.cvd.isBullish 
                                                                        ? "100%를 초과할수록 세력과 기관이 주가를 적극적으로 끌어올리려는 매수 의지가 강력함을 뜻합니다." 
                                                                        : "100% 미만일 때는 무리한 추격 매수를 피하고, 매수세가 다시 100% 위로 올라서는지 확인하는 것이 좋습니다."
                                                                }
                                                                forcePosition={tooltipPos}
                                                            >
                                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                                                                    item.cvd.isBullish 
                                                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                                                        : 'bg-slate-800 text-slate-400 border border-white/10'
                                                                }`}>
                                                                    <span>💎</span>
                                                                    <span>{item.cvd.label}</span>
                                                                </span>
                                                            </QuantTooltip>
                                                        )}
                                                        {item.obv && (
                                                            <QuantTooltip
                                                                title="📈 OBV (세력 누적 매집 지표)"
                                                                statusText={item.obv.label}
                                                                statusColor={item.obv.isBullish ? "indigo" : "slate"}
                                                                headline={
                                                                    item.obv.isBullish 
                                                                        ? "🕵️‍♂️ 큰손(외인·기관)이 몰래 물량을 모아가는 중" 
                                                                        : "⚖️ 큰 자금 유출입 없이 수급이 팽팽한 횡보 상태"
                                                                }
                                                                description={
                                                                    item.obv.isBullish 
                                                                        ? "‘주가는 속여도 거래량은 못 속입니다.’ 주가가 오를 때 실린 진짜 거래량을 누적 합산하여 큰손들의 물량 매집 여부를 추적한 지표입니다." 
                                                                        : "매수 자금과 매도 자금이 균형을 이루며 방향성을 탐색하고 있는 거래량 숨고르기 구간입니다."
                                                                }
                                                                tip={
                                                                    item.obv.isBullish 
                                                                        ? "주가가 횡보하거나 조정을 받는데도 OBV가 먼저 우상향하면 조만간 주가가 분출할 가능성이 높은 전형적인 매집 신호입니다." 
                                                                        : "거래량이 실리면서 OBV 지표가 위쪽으로 고개를 들기 시작할 때가 좋은 진입 타이밍이 됩니다."
                                                                }
                                                                forcePosition={tooltipPos}
                                                            >
                                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                                                                    item.obv.isBullish 
                                                                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' 
                                                                        : 'bg-slate-800 text-slate-400 border border-white/10'
                                                                }`}>
                                                                    <span>📈</span>
                                                                    <span>{item.obv.label}</span>
                                                                </span>
                                                            </QuantTooltip>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 ml-auto transition-colors shrink-0" />
                                            </Link>
                                            </div>
                                        </td>

                                        {/* PC 전용 CVD / OBV 퀀트 뱃지 열 */}
                                        <td className="py-2.5 px-3 sm:p-4 text-center hidden md:table-cell font-sans min-w-[150px]">
                                            <div className="flex flex-col items-center gap-1.5">
                                                {item.cvd && (
                                                    <QuantTooltip
                                                        title="💎 CVD (누적 체결 델타)"
                                                        statusText={item.cvd.label}
                                                        statusColor={item.cvd.isBullish ? "emerald" : "slate"}
                                                        headline={
                                                            item.cvd.isBullish 
                                                                ? "🔥 시장가 매수세가 매도 물량을 압도하고 있습니다" 
                                                                : "⏳ 매수보다 관망 및 매도 물량이 많은 숨고르기 구간"
                                                        }
                                                        description={
                                                            item.cvd.isBullish 
                                                                ? "호가창에 쌓인 매도 물량을 더 높은 가격을 주고라도 앞다투어 사들이는 공격적인 시장가 매수세의 힘을 측정한 지표입니다." 
                                                                : "호가를 올려 사기보다는 아래에서 받아먹거나, 단기 차익 실현 물량이 나오며 수급이 쉬어가는 관망 상태입니다."
                                                        }
                                                        tip={
                                                            item.cvd.isBullish 
                                                                ? "100%를 초과할수록 세력과 기관이 주가를 적극적으로 끌어올리려는 매수 의지가 강력함을 뜻합니다." 
                                                                : "100% 미만일 때는 무리한 추격 매수를 피하고, 매수세가 다시 100% 위로 올라서는지 확인하는 것이 좋습니다."
                                                        }
                                                        forcePosition={tooltipPos}
                                                    >
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 cursor-pointer ${
                                                            item.cvd.isBullish 
                                                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 hover:border-emerald-400' 
                                                                : 'bg-slate-800 text-slate-400 border border-white/10 hover:border-slate-500'
                                                        }`}>
                                                            <span>💎</span>
                                                            <span>{item.cvd.label}</span>
                                                        </span>
                                                    </QuantTooltip>
                                                )}
                                                {item.obv && (
                                                    <QuantTooltip
                                                        title="📈 OBV (세력 누적 매집 지표)"
                                                        statusText={item.obv.label}
                                                        statusColor={item.obv.isBullish ? "indigo" : "slate"}
                                                        headline={
                                                            item.obv.isBullish 
                                                                ? "🕵️‍♂️ 큰손(외인·기관)이 몰래 물량을 모아가는 중" 
                                                                : "⚖️ 큰 자금 유출입 없이 수급이 팽팽한 횡보 상태"
                                                        }
                                                        description={
                                                            item.obv.isBullish 
                                                                ? "‘주가는 속여도 거래량은 못 속입니다.’ 주가가 오를 때 실린 진짜 거래량을 누적 합산하여 큰손들의 물량 매집 여부를 추적한 지표입니다." 
                                                                : "매수 자금과 매도 자금이 균형을 이루며 방향성을 탐색하고 있는 거래량 숨고르기 구간입니다."
                                                        }
                                                        tip={
                                                            item.obv.isBullish 
                                                                ? "주가가 횡보하거나 조정을 받는데도 OBV가 먼저 우상향하면 조만간 주가가 분출할 가능성이 높은 전형적인 매집 신호입니다." 
                                                                : "거래량이 실리면서 OBV 지표가 위쪽으로 고개를 들기 시작할 때가 좋은 진입 타이밍이 됩니다."
                                                        }
                                                        forcePosition={tooltipPos}
                                                    >
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 cursor-pointer ${
                                                            item.obv.isBullish 
                                                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400' 
                                                                : 'bg-slate-800 text-slate-400 border border-white/10 hover:border-slate-500'
                                                        }`}>
                                                            <span>📈</span>
                                                            <span>{item.obv.label}</span>
                                                        </span>
                                                    </QuantTooltip>
                                                )}
                                            </div>
                                        </td>

                                        {/* 스캔 시점 시세 */}
                                        <td className="py-2.5 px-3 sm:p-4 text-right text-slate-300 whitespace-nowrap min-w-[105px]">
                                            <QuantTooltip
                                                title={`⏱️ ${item.name} 스캔 시점가`}
                                                headline={`포착 당시 기준가: ${item.entryPrice.toLocaleString()}원`}
                                                description="알고리즘이 거래량 폭발과 메이저 수급 유입을 감지하고 스캐너에 처음 등록했을 때의 기준 주가입니다."
                                                tip="이 기준 가격을 바탕으로 현재 수익률과 +10% 벤치마크 도달 여부를 추적합니다."
                                                statusText="포착가"
                                                statusColor="blue"
                                                forcePosition={tooltipPos}
                                            >
                                                <span className="cursor-pointer hover:text-white transition-colors">{item.entryPrice.toLocaleString()}원</span>
                                            </QuantTooltip>
                                        </td>

                                        {/* 현재 시세 */}
                                        <td className="py-2.5 px-3 sm:p-4 text-right font-bold text-white whitespace-nowrap min-w-[105px]">
                                            <QuantTooltip
                                                title={`💵 ${item.name} 현재 시세`}
                                                headline={`실시간 현재가: ${item.currentPrice.toLocaleString()}원`}
                                                description={`스캔 기준가(${item.entryPrice.toLocaleString()}원) 대비 ${item.returnRate > 0 ? `+${item.returnRate}% 상승` : item.returnRate < 0 ? `${item.returnRate}% 하락` : '보합'} 중인 실시간 주가입니다.`}
                                                tip="정규장 중에는 실시간 현재가, 장마감 후에는 당일 최종 종가입니다."
                                                statusText="현재가"
                                                statusColor="slate"
                                                forcePosition={tooltipPos}
                                            >
                                                <span className="cursor-pointer hover:text-blue-300 transition-colors">{item.currentPrice.toLocaleString()}원</span>
                                            </QuantTooltip>
                                        </td>

                                        {/* 변동률 */}
                                        <td className="py-2.5 px-3 sm:p-4 text-right font-bold whitespace-nowrap min-w-[95px]">
                                            <QuantTooltip
                                                title={`📊 ${item.name} 실시간 수익률`}
                                                headline={isUp ? `+${item.returnRate}% 상승 추세` : item.returnRate < 0 ? `${item.returnRate}% 조정 중` : '변동 없음 (0%)'}
                                                description={`스캔 시점(${item.entryPrice.toLocaleString()}원)에서 현재가(${item.currentPrice.toLocaleString()}원)까지의 실제 주가 수익률입니다.`}
                                                tip={isUp ? "목표선(+10%)에 가까워질수록 분할 매도로 수익을 실현하는 것이 안전합니다." : "손실 폭이 -3%~-5%를 넘어가면 손절 기준을 준수하는 것이 안전합니다."}
                                                statusColor={isUp ? "rose" : item.returnRate < 0 ? "blue" : "slate"}
                                                forcePosition={tooltipPos}
                                                align="right"
                                            >
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md cursor-pointer hover:scale-105 transition-transform ${
                                                    isUp ? 'text-rose-400 bg-rose-500/10' : item.returnRate < 0 ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400'
                                                }`}>
                                                    {isUp ? `+${item.returnRate}%` : `${item.returnRate}%`}
                                                </span>
                                            </QuantTooltip>
                                        </td>

                                        {/* 기술적 벤치마크 (+10%) */}
                                        <td className="py-2.5 px-3 sm:p-4 text-right text-slate-300 whitespace-nowrap min-w-[115px]">
                                            <QuantTooltip
                                                title={`🎯 ${item.name} 1차 목표선`}
                                                headline={`1차 익절 목표가: ${item.resistancePrice.toLocaleString()}원 (+10.0%)`}
                                                description={`스캔 기준가(${item.entryPrice.toLocaleString()}원) 대비 정확히 +10% 상승한 1차 기술적 목표선(저항선)입니다.`}
                                                tip="단기 매매 시 욕심부리지 않고 1차 수익을 안전하게 챙기기 가장 좋은 가격입니다."
                                                statusText="목표선"
                                                statusColor="indigo"
                                                forcePosition={tooltipPos}
                                                align="right"
                                            >
                                                <div className="cursor-pointer">
                                                    <span className="border-b border-dotted border-slate-600 hover:border-white transition-colors">{item.resistancePrice.toLocaleString()}원</span>
                                                    <span className="text-[10px] text-slate-500 block font-sans">(+10.0%)</span>
                                                </div>
                                            </QuantTooltip>
                                        </td>

                                        {/* 시세 도달 확인 여부 */}
                                        <td className="py-2.5 px-3 sm:p-4 text-center whitespace-nowrap min-w-[110px]">
                                            {item.reachedResistance ? (
                                                <QuantTooltip
                                                    title="🏆 10% 벤치마크 도달 완료"
                                                    headline={`목표선(${item.resistancePrice.toLocaleString()}원) 터치 성공!`}
                                                    description={`${item.name} 종목이 ${item.reachedDaysTook ? `포착 후 ${item.reachedDaysTook}(${item.reachedDisplayDate})에 ` : ""}장중 최고가(${item.highestPrice.toLocaleString()}원, +${item.highestReturnRate}%)를 기록하며 +10% 벤치마크 목표선에 도달하여 검증을 완료했습니다.`}
                                                    tip="1차 목표가를 달성했으므로 무리한 추격 매수보다는 분할 익절이나 눌림목 지지 여부를 확인하세요."
                                                    statusText={item.reachedDaysTook ? `${item.reachedDaysTook} 달성` : "목표 달성"}
                                                    statusColor="emerald"
                                                    forcePosition={tooltipPos}
                                                    align="right"
                                                >
                                                    <div className="inline-flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition-transform">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                            <span>도달 확인</span>
                                                        </span>
                                                        {item.reachedDisplayDate && (
                                                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 whitespace-nowrap">
                                                                {item.reachedDaysTook} ({item.reachedDisplayDate})
                                                            </span>
                                                        )}
                                                    </div>
                                                </QuantTooltip>
                                            ) : (
                                                <QuantTooltip
                                                    title="⏳ 목표선 관측 진행 중"
                                                    headline={`목표선(${item.resistancePrice.toLocaleString()}원)을 향해 추적 중`}
                                                    description={`현재가 ${item.currentPrice.toLocaleString()}원으로, +10% 벤치마크 도달 여부를 실시간 추적하고 있습니다.`}
                                                    tip="거래량과 수급이 유지되는지 체크하면서 목표선 도달 여부를 지켜보세요."
                                                    statusText="추적 관측"
                                                    statusColor="slate"
                                                    forcePosition={tooltipPos}
                                                    align="right"
                                                >
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-slate-400 bg-white/5 border border-white/5 cursor-pointer hover:scale-105 transition-transform">
                                                        <Clock className="w-3 h-3 text-slate-500" />
                                                        <span>관측 중</span>
                                                    </span>
                                                </QuantTooltip>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                </div>
            </div>

            {/* 법적 면책 조항 (유사투자자문업 방지 100% 안전 고지 배너) */}
            <div className="mt-5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <strong className="text-slate-400 block mb-0.5">자본시장법 준수 퀀트 시뮬레이션 안내:</strong>
                    본 화면은 사전에 정의된 기술적 알고리즘(거래량 급증 및 수급 유입)에 의해 기계적으로 추출된 객관적 통계 결과이며, 개별 종목에 대한 매수/매도 권유나 투자 자문이 아닙니다. 기술적 벤치마크선은 퀀트 백테스팅 및 통계 관측을 위한 참고 수준일 뿐 특정 수익률이나 목표가를 보장하는 것이 아니며, 모든 투자의 최종 판단과 손익의 책임은 투자자 본인에게 있습니다.
                </div>
            </div>

            {/* 관심종목 변경 실시간 플로팅 토스트 알림 */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#121829]/95 border border-amber-500/50 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-xl text-xs sm:text-sm font-semibold transition-all animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0 animate-pulse" />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
}
