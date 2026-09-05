"use client";

import React, { useState, useEffect } from "react";
import { Star, Trash2, Loader2, RefreshCw, AlertCircle, X, Bell, BellRing, Crosshair, Zap, Settings2, FileWarning, ExternalLink, Check, Calendar } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import CleanStockList from "@/components/CleanStockList";
import PriceAlertSetup from "@/components/PriceAlertSetup";
import WatchlistPurchaseModal from "@/components/WatchlistPurchaseModal";
import AdBanner from "@/components/AdBanner";
import KakaoAdFit from "@/components/KakaoAdFit";
import KakaoRevenueAd from "@/components/KakaoRevenueAd";
import AIDisclaimer from "@/components/AIDisclaimer";
import { Plus, Wallet, TrendingUp, TrendingDown, ArrowUpRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isFreeModeEnabled } from "@/lib/adminMode";

interface Alert {
    id: number;
    symbol: string;
    type: string; // PRICE, RSI_OVERSOLD, GOLDEN_CROSS, PRICE_DROP
    target_price: number;
    condition: 'above' | 'below';
    status: 'active' | 'triggered';
    created_at: string;
    triggered_at?: string;
    triggered_price?: number;
}

export default function WatchlistPage() {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [quotes, setQuotes] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const { user, isLoading: isAuthLoading, isMigrating } = useAuth();
    
    // Alert Modal State
    const [alertStock, setAlertStock] = useState<{ symbol: string; price: number; addedPrice?: number } | null>(null);
    const [purchaseModalSymbol, setPurchaseModalSymbol] = useState<string | null>(null);

    // Alerts List States
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(true);

    // CB Disclosure State
    const [cbAlerts, setCbAlerts] = useState<any[]>([]);
    const [cbLoading, setCbLoading] = useState(false);

    // [NEW] 실적/배당 일정 State & 필터
    const [eventEvents, setEventEvents] = useState<any[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [scheduleFilter, setScheduleFilter] = useState<"all" | "upcoming" | "earnings" | "dividend" | "contract">("all");

    // [PRO] 전문 수급 & 증권사 컨센서스 데이터
    const [proInsights, setProInsights] = useState<Record<string, any>>({});

    // [NEW] 서브탭 상태
    const [activeTab, setActiveTab] = useState<"quotes" | "schedules" | "alerts">("quotes");
    const [isAdmin, setIsAdmin] = useState(false);

    const fetchWatchlist = async () => {
        if (!user) return;
        
        // [v6.6.0] 로컬 캐시가 이미 존재한다면, 로딩 스피너를 띄우지 않고 백그라운드에서 조용히 갱신합니다.
        const hasCache = typeof window !== 'undefined' && localStorage.getItem("cached_watchlist") !== null;
        if (hasCache) {
            setLoading(false);
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                headers: { "X-User-ID": user.id || (user as any).uid }
            });
            const json = await res.json();
            if (json.status === "success" && json.data.length > 0) {
                const items = json.data.map((item: any) => {
                    if (typeof item === 'string') return { symbol: item, name: item };
                    return item;
                });
                setWatchlist(items);
                // 로컬 캐시 최신화
                localStorage.setItem("cached_watchlist", JSON.stringify(items));
            } else {
                setWatchlist([]);
                localStorage.removeItem("cached_watchlist");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlerts = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/alerts`, {
                headers: { "X-User-ID": user.id || (user as any).uid }
            });
            const json = await res.json();
            if (json.status === "success") {
                const sorted = json.data.sort((a: Alert, b: Alert) => b.id - a.id);
                setAlerts(sorted);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAlertsLoading(false);
        }
    };

    const handleDeleteAlert = async (id: number) => {
        if (!user) return;
        if (!confirm("알림을 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/alerts/${id}`, { 
                method: 'DELETE',
                headers: { "X-User-ID": user.id || (user as any).uid }
            });
            const json = await res.json();
            if (json.status === "success") {
                setAlerts(prev => prev.filter(a => a.id !== id));
            } else {
                alert("삭제에 실패했습니다: " + json.message);
            }
        } catch (error) {
            console.error(error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const runAlertCheck = async () => {
        if (!user) return;
        setAlertsLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/alerts/check`, {
                headers: { "X-User-ID": user.id || (user as any).uid }
            });
            await fetchAlerts();
        } catch (err) {
            console.error(err);
        } finally {
            setAlertsLoading(false);
        }
    };

    const fetchCbAlerts = async () => {
        if (!user) return;
        setCbLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/watchlist/cb-alerts`, {
                headers: { "X-User-ID": user.id || (user as any).uid }
            });
            const json = await res.json();
            if (json.status === "success") {
                setCbAlerts(json.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCbLoading(false);
        }
    };

    const fetchEventSchedules = async (symbols: string) => {
        if (!symbols) return;
        setEventsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/calendar/watchlist?symbols=${symbols}`);
            const json = await res.json();
            if (json && json.status === "success" && Array.isArray(json.data)) {
                setEventEvents(json.data);
            } else {
                setEventEvents([]);
            }
        } catch (err) {
            console.error(err);
            setEventEvents([]);
        } finally {
            setEventsLoading(false);
        }
    };

    const getSniperLabel = (type: string) => {
        switch (type) {
            case "RSI_OVERSOLD": return "💎 RSI 과매도 (침체)";
            case "RSI_OVERBOUGHT": return "⚠️ RSI 과매수 (과열)";
            case "GOLDEN_CROSS": return "🚀 골든크로스 (5일>20일)";
            case "PRICE_DROP": return "📉 급락 발생 (-3%)";
            default: return type;
        }
    };

    // [v2] 마지막 quotes 업데이트 시각
    const [quotesRefreshing, setQuotesRefreshing] = useState(false);
    // chatId 상태 (텔레그램 연동용)
    const [chatId, setChatId] = useState('');
    // 이전 가격 캐시 (가격 변동 감지용)
    const prevPricesRef = React.useRef<Record<string, string>>({});

    // ─────────────────────────────────────────────
    // 세션 배지 헬퍼 (quotes.market_status → 배지)
    // ─────────────────────────────────────────────
    const getSessionBadge = (marketStatus: string, symbol: string) => {
        const isDomestic = /^\d{6}$/.test(symbol) || symbol.endsWith('.KS') || symbol.endsWith('.KQ');
        const ms = (marketStatus || '').toLowerCase();

        if (isDomestic) {
            if (ms.includes('시간외') || ms.includes('야간')) return { label: '시간외', color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30', dot: 'bg-indigo-400 animate-pulse' };
            if (ms.includes('장중') || ms === '거래중' || ms === 'open') return { label: '장중', color: 'bg-green-500/20 text-green-400 border border-green-500/30', dot: 'bg-green-500 animate-pulse' };
            if (ms.includes('동시호가')) return { label: '동시호가', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', dot: 'bg-amber-400 animate-pulse' };
            return { label: '장마감', color: 'bg-gray-500/15 text-gray-500 border border-gray-500/20', dot: 'bg-gray-600' };
        }

        if (ms.includes('프리') || ms.includes('pre')) return { label: 'PRE', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', dot: 'bg-amber-400 animate-pulse' };
        if (ms.includes('에프터') || ms.includes('after') || ms.includes('post')) return { label: 'AFTER', color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30', dot: 'bg-indigo-400 animate-pulse' };
        if (ms.includes('장중') || ms.includes('open') || ms.includes('정규')) return { label: '장중', color: 'bg-green-500/20 text-green-400 border border-green-500/30', dot: 'bg-green-500 animate-pulse' };
        return { label: '장마감', color: 'bg-gray-500/15 text-gray-500 border border-gray-500/20', dot: 'bg-gray-600' };
    };
    // ─────────────────────────────────────────────
    // [v2] 가격 변동 감지 → 브라우저 알림 트리거
    // ─────────────────────────────────────────────
    const checkPriceAlerts = (newQuotes: Record<string, any>, alertsList: Alert[]) => {
        if (typeof window === 'undefined' || !('Notification' in window) || (window as any).Notification.permission !== 'granted') return;
        Object.entries(newQuotes).forEach(([symbol, q]) => {
            const newPrice = parseFloat(String(q.price || '0').replace(/[^0-9.]/g, ''));
            const oldPrice = parseFloat(prevPricesRef.current[symbol] || '0');
            if (!oldPrice || isNaN(newPrice)) return;

            // 사용자 알림 조건 체크
            alertsList.forEach(a => {
                if (a.symbol !== symbol || a.status === 'triggered') return;
                if (a.type === 'PRICE' || !a.type) {
                    const hit = a.condition === 'above' ? newPrice >= a.target_price : newPrice <= a.target_price;
                    if (hit && typeof window !== 'undefined' && 'Notification' in window) {
                        new (window as any).Notification(`⚡ ${symbol} 목표가 도달!`, {
                            body: `현재가 ${newPrice.toLocaleString()} (목표: ${a.target_price.toLocaleString()})`,
                            icon: '/favicon.ico',
                        });
                    }
                }
            });

            // 급락/급등 감지 (3% 이상 변동)
            if (oldPrice > 0) {
                const changePct = ((newPrice - oldPrice) / oldPrice) * 100;
                if (Math.abs(changePct) >= 3) {
                    const direction = changePct > 0 ? '🚀 급등' : '📉 급락';
                    new Notification(`${direction} ${symbol}`, {
                        body: `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}% 변동 감지 → ${newPrice.toLocaleString()}`,
                        icon: '/favicon.ico',
                    });
                }
            }

            prevPricesRef.current[symbol] = String(q.price);
        });
    };

    useEffect(() => {
        setIsAdmin(isFreeModeEnabled());
        
        // [v6.6.0] 하이드레이션 오류를 피하기 위해 클라이언트 사이드에서 즉시 캐시를 복구합니다.
        if (typeof window !== 'undefined') {
            const cachedWatchlist = localStorage.getItem("cached_watchlist");
            const cachedQuotes = localStorage.getItem("cached_quotes");
            if (cachedWatchlist) {
                try {
                    const parsed = JSON.parse(cachedWatchlist);
                    setWatchlist(parsed);
                    // 캐시가 유효하면 초기 로딩 스피너를 건너뜁니다.
                    setLoading(false);
                } catch (e) {}
            }
            if (cachedQuotes) {
                try {
                    setQuotes(JSON.parse(cachedQuotes));
                } catch (e) {}
            }
        }

        if (isAuthLoading || isMigrating) return;
        if (user) {
            fetchWatchlist();
            fetchAlerts();
            fetchCbAlerts();
            const savedChatId = localStorage.getItem("telegram_chat_id");
            if (savedChatId) setChatId(savedChatId);
            
            // [v2] 15초 → 10초로 단축, alerts 동기화 포함
            const interval = setInterval(() => {
                fetchWatchlist();
                fetchAlerts();
            }, 10000);
            // CB 알림은 5분마다 (API 부하 제한)
            const cbInterval = setInterval(fetchCbAlerts, 300000);

            return () => { clearInterval(interval); clearInterval(cbInterval); };
        } else {
            // 캐시가 없고 비회원인 경우에만 로딩을 끕니다.
            setLoading(false);
            setWatchlist([]);
            setAlerts([]);
        }
    }, [user, isAuthLoading, isMigrating]);

    useEffect(() => {
        if (watchlist.length === 0) return;

        const fetchQuotes = async () => {
            const symbols = watchlist.map(i => i.symbol).join(",");
            setQuotesRefreshing(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/quotes/multi?symbols=${encodeURIComponent(symbols)}`);
                const json = await res.json();
                if (json.status === "success") {
                    setQuotes(json.data);
                    // [v6.6.0] 시세 캐시도 함께 최신화
                    localStorage.setItem("cached_quotes", JSON.stringify(json.data));
                    setLastUpdated(new Date());
                    // [v2] 가격 알림 체크
                    checkPriceAlerts(json.data, alerts);
                }
            } catch (e) { }
            finally { setQuotesRefreshing(false); }
        };
        fetchQuotes();

        // [v2] quotes도 10초마다 독립 폴링 (watchlist 변경과 별개)
        const quotesTimer = setInterval(fetchQuotes, 10000);
        
        // [NEW] 실적/배당 일정도 함께 로드
        const syms = watchlist.map(i => i.symbol).join(",");
        fetchEventSchedules(syms);

        // [PRO] 수급 및 증권사 목표가 전문 데이터 로드
        const fetchProInsights = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/pro-insights?symbols=${encodeURIComponent(syms)}`);
                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setProInsights(json.data);
                }
            } catch (e) {}
        };
        fetchProInsights();

        return () => clearInterval(quotesTimer);
    }, [watchlist]);

    useEffect(() => {
        if (activeTab === "schedules" && watchlist.length > 0) {
            const syms = watchlist.map(i => i.symbol).join(",");
            fetchEventSchedules(syms);
        }
    }, [activeTab]);

    const handleRemoveItem = async (symbol: string) => {
        if (!user) return;
        if (!confirm(`${symbol} 종목을 삭제하시겠습니까?`)) return;

        try {
            await fetch(`${API_BASE_URL}/api/watchlist/${symbol}`, {
                method: "DELETE",
                headers: { "X-User-ID": user.id || (user as any).uid }
            });
            const updatedList = watchlist.filter(item => item.symbol !== symbol);
            setWatchlist(updatedList);
            localStorage.setItem("cached_watchlist", JSON.stringify(updatedList));

            // [v6.6.0] 시세 캐시에서도 삭제
            setQuotes(prev => {
                const nextQuotes = { ...prev };
                delete nextQuotes[symbol];
                localStorage.setItem("cached_quotes", JSON.stringify(nextQuotes));
                return nextQuotes;
            });
            
            // Dispatch event to sync with Sidebar
            window.dispatchEvent(new CustomEvent('watchlistChanged'));
        } catch (e) {
            console.error(e);
        }
    };
    // 통계 계산
    const upCount = watchlist.filter(item => {
        const q = quotes[item.symbol];
        const chg = q ? parseFloat(String(q.change || '0').replace(/[^0-9.-]/g, '')) : 0;
        return chg > 0;
    }).length;

    const downCount = watchlist.filter(item => {
        const q = quotes[item.symbol];
        const chg = q ? parseFloat(String(q.change || '0').replace(/[^0-9.-]/g, '')) : 0;
        return chg < 0;
    }).length;

    // [투자금액 및 총 평가손익 실시간 계산]
    let totalInvested = 0;
    let totalValuation = 0;
    let hasInvestmentData = false;

    watchlist.forEach(item => {
        const q = quotes[item.symbol];
        const curPrice = q ? parseFloat(String(q.price || '0').replace(/[^0-9.]/g, '')) : 0;
        
        if (item.purchases && item.purchases.length > 0) {
            item.purchases.forEach((p: any) => {
                if (p.buy_price > 0 && p.quantity > 0) {
                    totalInvested += p.buy_price * p.quantity;
                    totalValuation += (curPrice > 0 ? curPrice : p.buy_price) * p.quantity;
                    hasInvestmentData = true;
                }
            });
        } else if (item.added_price && item.quantity) {
            totalInvested += item.added_price * item.quantity;
            totalValuation += (curPrice > 0 ? curPrice : item.added_price) * item.quantity;
            hasInvestmentData = true;
        }
    });

    const totalProfit = totalValuation - totalInvested;
    const totalReturnRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    const isProfitPos = totalProfit > 0;
    const isProfitNeg = totalProfit < 0;

    return (
        <div className="p-4 md:p-8 pt-24 md:pt-8 max-w-7xl mx-auto min-h-screen space-y-6">
            {/* 상단 스마트 반응형 광고 */}
            <KakaoRevenueAd type="feed" />

            {/* Header & Quick Summary - Executive Portfolio Master */}
            <div className="bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl relative overflow-hidden">
                {/* 상단 앰비언트 글로우 라인 */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-blue-500 to-indigo-500"></div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-white/10">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl shadow-lg shadow-amber-500/10">
                                <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                        MY 관심종목
                                    </h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        실시간 포트폴리오 레이더
                                    </span>
                                </div>
                                <p className="text-zinc-400 mt-1 flex items-center gap-2 text-xs font-medium">
                                    <RefreshCw className={`w-3.5 h-3.5 ${quotesRefreshing ? 'animate-spin text-blue-400' : 'text-zinc-500'}`} />
                                    <span>10초 자동 갱신 · 최근 동기화: {lastUpdated.toLocaleTimeString()}</span>
                                    {quotesRefreshing && <span className="text-blue-400 text-[10px] font-bold animate-pulse">실시간 수신중...</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 액션 버튼 그룹 */}
                    <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
                        {/* 새 종목 발굴 & 추가 */}
                        <Link
                            href="/discovery"
                            className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all font-black text-xs shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4 text-blue-200" />
                            <span>+ 새 종목 발굴·추가</span>
                        </Link>

                        {/* 리스트 새로고침 */}
                        <button
                            onClick={() => {
                                setLoading(true);
                                fetchWatchlist();
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-200 hover:text-white transition-all font-bold text-xs border border-white/10 shadow-sm active:scale-95 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                            <span>시세 즉시 갱신</span>
                        </button>

                        {isAdmin && (
                            <button
                                onClick={() => {
                                    const debugInfo = JSON.stringify({
                                        watchlistSize: watchlist.length,
                                        quoteKeys: Object.keys(quotes),
                                        sampleQuote: quotes[watchlist[0]?.symbol] || "None",
                                        user: user ? { id: user.id, email: user.email } : "Not Logged In"
                                    }, null, 2);
                                    alert(`[데이터 상태 점검]\n${debugInfo}`);
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all font-bold text-xs border border-purple-500/20 cursor-pointer"
                            >
                                점검
                            </button>
                        )}
                    </div>
                </div>

                {/* [실시간 포트폴리오 자산 종합 평가 바] (매수단가 입력 종목이 있을 때) */}
                {hasInvestmentData && (
                    <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-white/10 shadow-inner grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                            <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1">
                                <Wallet className="w-3.5 h-3.5 text-zinc-500" />
                                <span>총 투자원금 (매수액)</span>
                            </span>
                            <span className="text-base sm:text-lg font-black font-mono text-white mt-1">
                                ₩{Math.round(totalInvested).toLocaleString()}
                            </span>
                        </div>

                        <div className="flex flex-col">
                            <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                                <span>실시간 총 평가금액</span>
                            </span>
                            <span className="text-base sm:text-lg font-black font-mono text-white mt-1">
                                ₩{Math.round(totalValuation).toLocaleString()}
                            </span>
                        </div>

                        <div className="flex flex-col col-span-2 md:col-span-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                            <span className="text-[11px] text-zinc-400 font-bold flex items-center justify-between">
                                <span>총 평가손익 &amp; 수익률</span>
                                <span className="text-[10px] text-zinc-500">실시간 체결가 기준</span>
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                                    isProfitPos ? 'text-rose-400' : isProfitNeg ? 'text-sky-400' : 'text-zinc-300'
                                }`}>
                                    {isProfitPos ? '+' : ''}₩{Math.round(totalProfit).toLocaleString()}
                                </span>
                                <span className={`text-xs sm:text-sm font-black font-mono px-2 py-0.5 rounded-lg border ${
                                    isProfitPos 
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                                        : isProfitNeg 
                                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' 
                                        : 'bg-zinc-800 text-zinc-400 border-white/10'
                                }`}>
                                    {isProfitPos ? '▲ +' : isProfitNeg ? '▼ ' : ''}{totalReturnRate.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4대 마켓 현황 통계 카드 */}
                {watchlist.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                        <div className="bg-zinc-950/70 border border-white/5 p-3.5 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
                            <span className="text-xs text-zinc-400 font-bold">보유 종목수</span>
                            <span className="text-sm md:text-base font-black font-mono text-white">{watchlist.length}개</span>
                        </div>
                        <div className="bg-zinc-950/70 border border-white/5 p-3.5 rounded-2xl flex items-center justify-between hover:border-rose-500/20 transition-colors">
                            <span className="text-xs text-rose-400 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                <span>상승 종목</span>
                            </span>
                            <span className="text-sm md:text-base font-black font-mono text-rose-400">▲ {upCount}개</span>
                        </div>
                        <div className="bg-zinc-950/70 border border-white/5 p-3.5 rounded-2xl flex items-center justify-between hover:border-sky-500/20 transition-colors">
                            <span className="text-xs text-sky-400 font-bold">하락 종목</span>
                            <span className="text-sm md:text-base font-black font-mono text-sky-400">▼ {downCount}개</span>
                        </div>
                        <div className="bg-zinc-950/70 border border-white/5 p-3.5 rounded-2xl flex items-center justify-between hover:border-purple-500/20 transition-colors">
                            <span className="text-xs text-purple-400 font-bold">가격 감시 알림</span>
                            <span className="text-sm md:text-base font-black font-mono text-purple-400">{alerts.length}건 등록</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Segmented Tab Navigation - Premium Pill Style */}
            <div className="flex p-1.5 bg-zinc-950/90 border border-white/10 rounded-2xl w-full sm:w-fit shadow-xl backdrop-blur-md gap-1">
                <button
                    onClick={() => setActiveTab("quotes")}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
                        activeTab === "quotes" 
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]" 
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                    <Star className="w-4 h-4 text-amber-400" />
                    <span>실시간 시세</span>
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-white/15 text-white">
                        {watchlist.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("schedules")}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
                        activeTab === "schedules" 
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]" 
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>실적·배당 캘린더</span>
                </button>
                <button
                    onClick={() => setActiveTab("alerts")}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
                        activeTab === "alerts" 
                            ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25 scale-[1.02]" 
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                    <Bell className="w-4 h-4 text-purple-400" />
                    <span>알림·공시</span>
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-white/15 text-white">
                        {alerts.length}
                    </span>
                </button>
            </div>

            {/* Content Container */}
            <div className="min-h-[400px]">
                {/* 1. Quotes Tab */}
                {activeTab === "quotes" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {isAuthLoading || isMigrating || loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-zinc-900/40 rounded-3xl border border-white/5">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                                <p className="text-sm font-semibold">{isMigrating ? "관심종목을 동기화하고 있습니다..." : "시세 데이터를 불러오는 중입니다..."}</p>
                            </div>
                        ) : !user ? (
                            <div className="flex flex-col items-center justify-center py-28 bg-zinc-900/40 border border-dashed border-white/10 rounded-3xl text-center p-6">
                                <AlertCircle className="w-12 h-12 text-amber-400 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">로그인이 필요합니다</h3>
                                <p className="text-xs text-gray-400 max-w-sm mb-5">관심종목 및 목표가 알림 관리를 위해 로그인해 주세요.</p>
                                <Link href="/login" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-lg">
                                    로그인하러 가기
                                </Link>
                            </div>
                        ) : watchlist.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-28 bg-zinc-900/40 border border-dashed border-white/10 rounded-3xl text-center p-6">
                                <Star className="w-12 h-12 text-gray-600 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">관심종목이 비어있습니다</h3>
                                <p className="text-xs text-gray-400 max-w-sm mb-5">종목 발굴 메뉴에서 관심 있는 종목을 추가해 보세요.</p>
                                <Link href="/discovery" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-lg">
                                    종목 발굴하러 가기
                                </Link>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <CleanStockList
                                    items={watchlist.map(item => {
                                        const data = quotes[item.symbol];
                                        const sessionBadge = data?.market_status
                                            ? getSessionBadge(data.market_status, item.symbol)
                                            : null;
                                        return {
                                            symbol: item.symbol,
                                            name: item.name || (data ? (data.name || item.symbol) : item.symbol),
                                            price: data ? data.price : "-",
                                            change: data ? data.change : "0%",
                                            change_percent: data ? (data.change_percent || data.change) : "0%",
                                            badge: item.badge,
                                            added_price: item.added_price,
                                            quantity: item.quantity,
                                            purchases: item.purchases,
                                            // [v2] 세션 배지 (장 상태 표시)
                                            sessionBadge: sessionBadge || undefined,
                                            // [v2] 프리/에프터 및 국내 시간외 가격
                                            extendedPrice: data?.extended_price || (data?.nxt_data ? data.nxt_data.price : (data?.after_market_data ? data.after_market_data.price : null)),
                                            extendedChange: data?.extended_change || (data?.nxt_data?.change_pct !== undefined ? `${data.nxt_data.change_pct > 0 ? '+' : ''}${data.nxt_data.change_pct}%` : null),
                                            // [v3] 통화 정보 (해외주식 $ 표시 + 원화 병기)
                                            currency: data?.currency || 'KRW',
                                            price_krw: data?.price_krw || null,
                                            // [v4] 전문 데이터 지표
                                            proInsights: proInsights[item.symbol],
                                        };
                                    })}
                                    onItemClick={(sym) => { 
                                        const cleanSym = sym ? (sym.split('.')[0] || sym) : sym;
                                        window.location.href = `/discovery?q=${cleanSym}`; 
                                    }}
                                    onDelete={handleRemoveItem}
                                    onAlertClick={(symbol, price, addedPrice) => { setAlertStock({ symbol, price, addedPrice }); }}
                                    onEditAddedPrice={(symbol) => {
                                        setPurchaseModalSymbol(symbol);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Schedules Tab */}
                {activeTab === "schedules" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* 상단 안내 & 리포트 헤더 */}
                        <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-500/20 p-5 rounded-3xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                            <Calendar className="w-5 h-5" />
                                        </span>
                                        <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                                            관심종목 실적·배당 캘린더
                                            <button 
                                                onClick={() => {
                                                    const syms = watchlist.map(i => i.symbol).join(",");
                                                    fetchEventSchedules(syms);
                                                }}
                                                className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 hover:text-white transition-colors cursor-pointer"
                                                title="일정 새로고침"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </h3>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                        💡 <strong className="text-zinc-200">알림센터(전체 공시)와 다른 점:</strong> 임원 지분변동 등 자잘한 일상 공시는 제외하고, 
                                        투자자가 꼭 챙겨야 할 <strong className="text-emerald-400">실적발표 D-Day</strong>, <strong className="text-emerald-400">배당기준일</strong>, <strong className="text-emerald-400">분기별 확정 재무제표</strong>만 엄선하여 제공합니다.
                                    </p>
                                </div>
                                {eventEvents.length > 0 && (
                                    <span className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black shrink-0">
                                        엄선 일정 {eventEvents.length}건
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 카테고리 필터 칩 */}
                        {(() => {
                            const validEvents = (Array.isArray(eventEvents) ? eventEvents : []).filter((e: any) => e && typeof e === 'object' && e.date);
                            const upcomingList = validEvents.filter((e: any) => Boolean(e.is_upcoming));
                            const earningsList = validEvents.filter((e: any) => e.type === "earnings");
                            const dividendList = validEvents.filter((e: any) => e.type === "dividend");
                            const contractList = validEvents.filter((e: any) => e.type === "contract");

                            const getEventDDay = (dateStr: string) => {
                                try {
                                    if (!dateStr) return { diff: 0, label: '-' };
                                    const parts = dateStr.split('-');
                                    if (parts.length !== 3) return { diff: 0, label: '-' };
                                    const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                    const now = new Date();
                                    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                    const diff = Math.round((target.getTime() - todayMidnight.getTime()) / 86400000);
                                    if (diff > 0) return { diff, label: `D-${diff}` };
                                    if (diff === 0) return { diff: 0, label: 'D-Day (오늘)' };
                                    return { diff, label: `${Math.abs(diff)}일 전` };
                                } catch {
                                    return { diff: 0, label: '-' };
                                }
                            };

                            if (validEvents.length === 0) {
                                return (
                                    <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                        <Zap className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-400 font-bold mb-2">현재 예정된 일정이 없습니다.</p>
                                        <p className="text-xs text-gray-600 mb-4">관심종목을 추가하시면 실적 공시와 배당 일정이 자동으로 분석됩니다.</p>
                                        <button
                                            onClick={() => {
                                                const syms = watchlist.map(i => i.symbol).join(",");
                                                fetchEventSchedules(syms);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
                                        >
                                            다시 스캔하기
                                        </button>
                                    </div>
                                );
                            }

                            // 필터 적용
                            const filteredEvents = validEvents.filter(ev => {
                                if (scheduleFilter === "all") return true;
                                if (scheduleFilter === "upcoming") return Boolean(ev.is_upcoming);
                                if (scheduleFilter === "earnings") return ev.type === "earnings";
                                if (scheduleFilter === "dividend") return ev.type === "dividend";
                                if (scheduleFilter === "contract") return ev.type === "contract";
                                return true;
                            });

                            const upcomings = filteredEvents.filter(ev => Boolean(ev.is_upcoming));
                            const recents = filteredEvents.filter(ev => !ev.is_upcoming);

                            const typeBadgeMap: Record<string, { bg: string; text: string; border: string; icon: string }> = {
                                earnings: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", icon: "📈" },
                                dividend: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", icon: "💰" },
                                contract: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", icon: "🤝" },
                                ir: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", icon: "🎤" },
                                buyback: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", icon: "🔄" },
                            };

                            return (
                                <div className="space-y-6">
                                    {/* 카테고리 필터 칩 */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                                        <button
                                            onClick={() => setScheduleFilter("all")}
                                            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                                                scheduleFilter === "all"
                                                    ? "bg-white text-black font-black shadow-lg"
                                                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5"
                                            }`}
                                        >
                                            전체보기 ({validEvents.length})
                                        </button>
                                        <button
                                            onClick={() => setScheduleFilter("upcoming")}
                                            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                                scheduleFilter === "upcoming"
                                                    ? "bg-emerald-500 text-black font-black shadow-lg"
                                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                            }`}
                                        >
                                            <span>📅</span> 다가오는 D-Day ({upcomingList.length})
                                        </button>
                                        <button
                                            onClick={() => setScheduleFilter("earnings")}
                                            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                                scheduleFilter === "earnings"
                                                    ? "bg-blue-500 text-white font-black shadow-lg"
                                                    : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                                            }`}
                                        >
                                            <span>📈</span> 실적 발표·보고서 ({earningsList.length})
                                        </button>
                                        <button
                                            onClick={() => setScheduleFilter("dividend")}
                                            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                                scheduleFilter === "dividend"
                                                    ? "bg-amber-500 text-black font-black shadow-lg"
                                                    : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                                            }`}
                                        >
                                            <span>💰</span> 배당 일정 ({dividendList.length})
                                        </button>
                                        <button
                                            onClick={() => setScheduleFilter("contract")}
                                            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                                scheduleFilter === "contract"
                                                    ? "bg-cyan-500 text-black font-black shadow-lg"
                                                    : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20"
                                            }`}
                                        >
                                            <span>🤝</span> 대형 수주·계약 ({contractList.length})
                                        </button>
                                    </div>

                                    {filteredEvents.length === 0 ? (
                                        <div className="py-16 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                            <p className="text-zinc-400 font-bold text-sm">선택한 카테고리에 해당하는 일정이 없습니다.</p>
                                            <button
                                                onClick={() => setScheduleFilter("all")}
                                                className="mt-3 px-3.5 py-1.5 rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10 text-xs font-bold transition-all"
                                            >
                                                전체 일정 보기
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {/* 1단: 📅 다가오는 핵심 일정 (Upcoming Radar) */}
                                            {upcomings.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
                                                            📅 다가오는 핵심 일정 (Upcoming Radar)
                                                        </h4>
                                                        <span className="text-[11px] text-zinc-500 font-medium">({upcomings.length}건 예정)</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {upcomings.map((ev, i) => {
                                                            const dInfo = getEventDDay(ev.date);
                                                            const conf = typeBadgeMap[ev.type] || { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", icon: "📅" };

                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-black/40 to-zinc-950/50 hover:border-emerald-500/50 transition-all shadow-lg flex flex-col justify-between group"
                                                                >
                                                                    <div>
                                                                        <div className="flex items-start justify-between mb-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-2xl">{conf.icon}</span>
                                                                                <div>
                                                                                    <h5 className="font-black text-white text-base leading-snug" translate="no">
                                                                                        {ev.name || ev.symbol}
                                                                                    </h5>
                                                                                    <p className="text-[11px] text-zinc-500 font-mono font-bold" translate="no">
                                                                                        {ev.symbol}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className={`px-3 py-1 rounded-xl text-xs font-black shadow-md ${
                                                                                dInfo.diff <= 7 
                                                                                    ? "bg-red-500 text-white animate-pulse" 
                                                                                    : dInfo.diff <= 30 
                                                                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" 
                                                                                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                                                            }`}>
                                                                                {dInfo.label}
                                                                            </div>
                                                                        </div>

                                                                        <p className="text-sm font-black text-zinc-100 leading-snug mb-1">
                                                                            {ev.detail}
                                                                        </p>
                                                                        {ev.desc && (
                                                                            <p className="text-xs text-zinc-400 font-medium leading-relaxed mb-3">
                                                                                {ev.desc}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${conf.bg} ${conf.text} border ${conf.border}`}>
                                                                                {ev.badge || "일정예정"}
                                                                            </span>
                                                                            <span className="text-xs text-emerald-400 font-mono font-bold">
                                                                                {ev.date}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[10px] text-zinc-500 font-medium">
                                                                            {ev.source === "KRX" ? "KRX 정기공시 규정" : ev.source || "글로벌 데이터"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 2단: 📊 최근 확정 실적 & 배당 성적표 (Recent Milestones) */}
                                            {recents.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-wider">
                                                            📊 최근 확정 실적 &amp; 주요 성적표 (Recent Milestones)
                                                        </h4>
                                                        <span className="text-[11px] text-zinc-500 font-medium">({recents.length}건 발표됨)</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {recents.map((ev, i) => {
                                                            const dInfo = getEventDDay(ev.date);
                                                            const conf = typeBadgeMap[ev.type] || { bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30", icon: "📋" };

                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    className={`p-4 rounded-2xl border bg-black/40 hover:bg-black/60 transition-all ${conf.border} flex flex-col justify-between shadow-md`}
                                                                >
                                                                    <div>
                                                                        <div className="flex items-start justify-between mb-2">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <span className="text-xl">{conf.icon}</span>
                                                                                <div className="min-w-0">
                                                                                    <h5 className="font-black text-white text-sm truncate" translate="no">
                                                                                        {ev.name || ev.symbol}
                                                                                    </h5>
                                                                                    <p className="text-[10px] text-zinc-500 font-mono font-bold" translate="no">
                                                                                        {ev.symbol}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-[11px] text-zinc-400 font-bold px-2 py-0.5 rounded bg-white/5">
                                                                                {dInfo.label}
                                                                            </span>
                                                                        </div>

                                                                        <p className="text-xs font-bold text-zinc-200 leading-snug mb-1">
                                                                            {ev.detail}
                                                                        </p>
                                                                        {ev.desc && (
                                                                            <p className="text-[11px] text-zinc-400 font-normal leading-relaxed mb-3">
                                                                                {ev.desc}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center justify-between pt-2.5 border-t border-white/5 mt-auto">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${conf.bg} ${conf.text}`}>
                                                                                {ev.badge || "공시"}
                                                                            </span>
                                                                            <span className="text-[10px] text-zinc-500 font-mono font-bold">{ev.date}</span>
                                                                        </div>
                                                                        {ev.link ? (
                                                                            <a 
                                                                                href={ev.link} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer" 
                                                                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-black transition-colors"
                                                                            >
                                                                                <ExternalLink className="w-3.5 h-3.5" /> DART 원문 보기
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-[10px] text-zinc-600 font-medium">{ev.source || "Global Data"}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* 3. Alerts Tab */}
                {activeTab === "alerts" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* [New] Physical Notification Enable Button (Top Priority) */}
                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600/30 p-3 rounded-2xl">
                                    <Bell className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white leading-tight">자동 푸시 알림 서비스</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">앱을 닫아도 설정한 가격 돌파 및 공시 소식을 전달합니다.</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    const { requestFCMToken } = await import("@/lib/firebase");
                                    const token = await requestFCMToken();
                                    if (token) {
                                        const res = await fetch(`${API_BASE_URL}/api/fcm/register`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || (user as any)?.uid || "" },
                                            body: JSON.stringify({ token, device_type: 'web', device_name: navigator.userAgent })
                                        });
                                        const data = await res.json();
                                        if (data.status === 'success') {
                                            alert("✅ 자동 푸시 알림이 활성화되었습니다!");
                                            window.location.reload(); // 권한 상태 반영을 위해 새로고침
                                        }
                                    } else {
                                        alert("❌ 알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.");
                                    }
                                }}
                                className={`px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 flex items-center gap-2 ${
                                    typeof Notification !== 'undefined' && Notification.permission === 'granted'
                                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                                }`}
                            >
                                {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? (
                                    <><Check className="w-4 h-4" /> 알림 수신 중</>
                                ) : (
                                    <><Bell className="w-4 h-4" /> 알림 활성화하기</>
                                )}
                            </button>
                        </div>

                        {/* Price Alerts Sub-section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 p-6 rounded-3xl">
                                <div>
                                    <h3 className="text-xl font-black text-purple-400 flex items-center gap-2 mb-1">
                                        <BellRing className="w-5 h-5" />
                                        나의 가격 알림 ({alerts.length})
                                    </h3>
                                    <p className="text-xs text-purple-400/60 font-medium">설정한 가격에 도달하면 즉시 푸시 알림을 보냅니다.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={runAlertCheck} className="p-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition-all">
                                        <RefreshCw className={`w-5 h-5 ${alertsLoading ? 'animate-spin' : ''}`} />
                                    </button>

                                </div>
                            </div>



                            <div className="grid gap-3">
                                {alerts.length === 0 ? (
                                    <div className="py-16 text-center text-gray-600 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">등록된 알림이 없습니다.</div>
                                ) : (
                                    alerts.map(alert => (
                                        <div key={alert.id} className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${alert.status === 'triggered' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${alert.status === 'triggered' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    {alert.status === 'triggered' ? <BellRing className="w-5 h-5 animate-bounce" /> : <Bell className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-black text-white">{alert.symbol}</span>
                                                        {alert.type && alert.type !== "PRICE" && <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-black tracking-tighter uppercase">SNIPER</span>}
                                                    </div>
                                                    <div className="text-gray-300 text-sm font-medium">
                                                        {(!alert.type || alert.type === "PRICE") 
                                                            ? `목표가 ₩${alert.target_price.toLocaleString()} ${alert.condition === 'above' ? '이상' : '이하'}`
                                                            : getSniperLabel(alert.type)}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteAlert(alert.id)} className="p-2.5 text-gray-600 hover:text-red-400 transition-all"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* CB Section */}
                        <div className="space-y-6 pt-8 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileWarning className="w-6 h-6 text-orange-400" />
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">전환사채(CB) 공시 알림</h2>
                                </div>
                                <button onClick={fetchCbAlerts} className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition-all">
                                    <RefreshCw className={`w-4 h-4 ${cbLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {cbAlerts.length === 0 ? (
                                <div className="py-12 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/5 text-gray-600 text-xs">최근 전환사채 공시가 없습니다.</div>
                            ) : (
                                <div className="grid gap-3">
                                    {cbAlerts.map((cb, idx) => (
                                        <a key={idx} href={cb.link} target="_blank" rel="noopener noreferrer" className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/10 flex items-start gap-4 transition-all group">
                                            <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 shrink-0 mt-0.5"><FileWarning className="w-5 h-5" /></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-black text-orange-300" translate="no">{cb.symbol}</span>
                                                    <span className="text-sm font-bold text-white">{cb.name}</span>
                                                </div>
                                                <p className="text-gray-200 text-sm leading-snug font-medium line-clamp-1">{cb.title}</p>
                                                <p className="text-gray-500 text-[10px] mt-1" translate="no">{cb.date}</p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors shrink-0 mt-1" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 유사투자자문업 법적 면책 안내 & 컴플라이언스 표준 고지 */}
            <AIDisclaimer pageName="MY 관심종목" />

            {/* 하단 세로 배너 광고 (320x480) */}
            <div className="mt-8 flex justify-center">
                <KakaoAdFit adUnit="DAN-b946L75vYgFilyWy" adWidth="320" adHeight="480" />
            </div>

            {alertStock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div className="relative w-full max-w-lg">
                        <button onClick={() => setAlertStock(null)} className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
                        <PriceAlertSetup symbol={alertStock.symbol} currentPrice={alertStock.price} buyPrice={alertStock.addedPrice} alertsCount={alerts.length} />
                    </div>
                </div>
            )}

            {purchaseModalSymbol && (
                <WatchlistPurchaseModal
                    isOpen={true}
                    symbol={purchaseModalSymbol}
                    onClose={() => setPurchaseModalSymbol(null)}
                    onSuccess={() => fetchWatchlist()}
                />
            )}
        </div>
    );
}
