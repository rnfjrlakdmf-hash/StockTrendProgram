"use client";

import React, { useState, useEffect } from "react";
import { Star, Trash2, Loader2, RefreshCw, AlertCircle, X, Bell, BellRing, Crosshair, Zap, Settings2, FileWarning, ExternalLink, Check } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import CleanStockList from "@/components/CleanStockList";
import PriceAlertSetup from "@/components/PriceAlertSetup";
import AdBanner from "@/components/AdBanner";
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

    // Alerts List States
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(true);

    // CB Disclosure State
    const [cbAlerts, setCbAlerts] = useState<any[]>([]);
    const [cbLoading, setCbLoading] = useState(false);

    // [NEW] 실적/배당 일정 State
    const [eventEvents, setEventEvents] = useState<any[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);

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
            if (json.status === "success") {
                setEventEvents(json.data || []);
            }
        } catch (err) {
            console.error(err);
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
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        Object.entries(newQuotes).forEach(([symbol, q]) => {
            const newPrice = parseFloat(String(q.price || '0').replace(/[^0-9.]/g, ''));
            const oldPrice = parseFloat(prevPricesRef.current[symbol] || '0');
            if (!oldPrice || isNaN(newPrice)) return;

            // 사용자 알림 조건 체크
            alertsList.forEach(a => {
                if (a.symbol !== symbol || a.status === 'triggered') return;
                if (a.type === 'PRICE' || !a.type) {
                    const hit = a.condition === 'above' ? newPrice >= a.target_price : newPrice <= a.target_price;
                    if (hit) {
                        new Notification(`⚡ ${symbol} 목표가 도달!`, {
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

        return () => clearInterval(quotesTimer);
    }, [watchlist]);

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

    return (
        <div className="p-4 md:p-8 pt-24 md:pt-8 max-w-7xl mx-auto min-h-screen space-y-8">
            {/* 상단 띠배너 광고 (320x50) */}
            <div className="flex justify-center -mt-2 mb-4">
                <KakaoAdFit adUnit="DAN-g3wzyZlZ4hBiYyRA" adWidth="320" adHeight="50" />
            </div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                        MY 관심종목
                    </h1>
                    <p className="text-gray-400 mt-2 flex items-center gap-2 text-sm">
                        <RefreshCw className={`w-4 h-4 ${quotesRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                        10초 자동 갱신 &middot; 최근 업데이트: {lastUpdated.toLocaleTimeString()}
                        {quotesRefreshing && <span className="text-blue-400 text-xs font-bold animate-pulse">업데이트 중...</span>}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setLoading(true);
                            fetchWatchlist();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all font-bold border border-white/10"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        리스트 새로고침
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
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all font-bold border border-blue-500/20"
                        >
                            데이터 상태 점검
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
                <button
                    onClick={() => setActiveTab("quotes")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === "quotes" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-gray-200"}`}
                >
                    <Star className="w-4 h-4" /> 시세 현황
                </button>
                <button
                    onClick={() => setActiveTab("schedules")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === "schedules" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-gray-400 hover:text-gray-200"}`}
                >
                    <Zap className="w-4 h-4" /> 실적/배당
                </button>
                <button
                    onClick={() => setActiveTab("alerts")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === "alerts" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-gray-400 hover:text-gray-200"}`}
                >
                    <Bell className="w-4 h-4" /> 알림/공시
                </button>
            </div>

            {/* Content Container */}
            <div className="min-h-[400px]">
                {/* 1. Quotes Tab */}
                {activeTab === "quotes" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {isAuthLoading || isMigrating || loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                <p>{isMigrating ? "관심종목을 동기화하고 있습니다. 잠시만 기다려주세요..." : "데이터를 불러오는 중입니다..."}</p>
                            </div>
                        ) : !user ? (
                            <div className="flex flex-col items-center justify-center py-32 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center">
                                <AlertCircle className="w-10 h-10 text-yellow-600 mb-6" />
                                <h3 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h3>
                                <p className="text-gray-400">관심 종목 및 알림 관리를 위해 로그인해주세요.</p>
                            </div>
                        ) : watchlist.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center">
                                <Star className="w-10 h-10 text-gray-600 mb-6" />
                                <h3 className="text-xl font-bold text-white mb-2">관심 종목이 비어있습니다</h3>
                                <Link href="/discovery" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl mt-4">종목 발굴하러 가기</Link>
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
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
                                            // [v2] 세션 배지 (장 상태 표시)
                                            sessionBadge: sessionBadge || undefined,
                                            // [v2] 프리/에프터 가격
                                            extendedPrice: data?.extended_price || null,
                                            extendedChange: data?.extended_change || null,
                                            // [v3] 통화 정보 (해외주식 $ 표시 + 원화 병기)
                                            currency: data?.currency || 'KRW',
                                            price_krw: data?.price_krw || null,
                                        };
                                    })}
                                    onItemClick={(sym) => { window.location.href = `/?q=${sym}`; }}
                                    onDelete={handleRemoveItem}
                                    onAlertClick={(symbol, price, addedPrice) => { setAlertStock({ symbol, price, addedPrice }); }}
                                    onEditAddedPrice={async (symbol, currentAddedPrice, currentQuantity) => {
                                        if (!user) return;
                                        const priceInput = prompt(`${symbol}의 실제 매수 단가를 입력해주세요.\n(숫자만 입력, 0 입력시 초기화)`, currentAddedPrice > 0 ? currentAddedPrice.toString() : "");
                                        if (priceInput === null) return;
                                        
                                        const price = parseFloat(priceInput.replace(/[^0-9.]/g, ''));
                                        if (isNaN(price)) {
                                            alert("유효한 단가를 입력해주세요.");
                                            return;
                                        }

                                        const qtyInput = prompt(`${symbol}의 보유 수량을 입력해주세요.\n(숫자만 입력, 0 입력시 초기화)`, currentQuantity > 0 ? currentQuantity.toString() : "");
                                        if (qtyInput === null) return;

                                        const quantity = parseFloat(qtyInput.replace(/[^0-9.]/g, ''));
                                        if (isNaN(quantity)) {
                                            alert("유효한 수량을 입력해주세요.");
                                            return;
                                        }

                                        try {
                                            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    "X-User-ID": user.id || (user as any).uid
                                                },
                                                body: JSON.stringify({ symbol, price, quantity })
                                            });
                                            const data = await res.json();
                                            if (data.status === 'success') {
                                                fetchWatchlist(); // 목록 새로고침
                                            } else {
                                                alert("수정에 실패했습니다.");
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            alert("서버 오류가 발생했습니다.");
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Schedules Tab */}
                {activeTab === "schedules" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
                            <h3 className="text-xl font-black text-emerald-400 flex items-center gap-2 mb-2">
                                <RefreshCw className={`w-5 h-5 ${eventsLoading ? 'animate-spin' : ''}`} />
                                최신 일정 리포트
                            </h3>
                            <p className="text-sm text-emerald-400/60 font-medium">관심종목의 배당락일, 실적발표, 주요 공시를 신속하게 스캔합니다.</p>
                        </div>

                        {eventEvents.length === 0 ? (
                            <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                <Zap className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">현재 예정된 일정이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {eventEvents.map((ev, i) => {
                                    if (!ev || !ev.date) return null;
                                    const eventDate = new Date(ev.date);
                                    if (isNaN(eventDate.getTime())) return null;
                                    const isDart = ev.source === "DART";
                                    const dDay = Math.ceil((eventDate.getTime() - Date.now()) / 86400000);
                                    const typeConfig: any = {
                                        earnings: { color: "blue", label: "실적발표", icon: "📈" },
                                        dividend: { color: "emerald", label: "배당일정", icon: "💰" },
                                        buyback:  { color: "orange", label: "자사주", icon: "🔄" },
                                        holder:   { color: "purple", label: "지분변동", icon: "👤" }
                                    };
                                    const conf = typeConfig[ev.type] || { color: "gray", label: "공시", icon: "📄" };

                                    return (
                                        <div key={i} className={`p-5 rounded-2xl border bg-black/40 hover:bg-black/60 transition-all border-${conf.color}-500/20 group relative overflow-hidden`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{conf.icon}</span>
                                                    <div className="min-w-0">
                                                        <h5 className="font-black text-white text-sm truncate" translate="no">{ev.name}</h5>
                                                        <p className="text-[10px] text-gray-500 font-bold" translate="no">{ev.symbol}</p>
                                                    </div>
                                                </div>
                                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black bg-${conf.color}-500/20 text-${conf.color}-400 border border-${conf.color}-500/30`}>
                                                    D-{dDay < 0 ? `+${Math.abs(dDay)}` : dDay === 0 ? "Day" : dDay}
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-300 font-bold line-clamp-2 leading-relaxed mb-4 h-10">
                                                {ev.detail}
                                            </p>
                                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                <span className="text-[10px] text-gray-500 font-mono font-bold">{ev.date}</span>
                                                {isDart && ev.link ? (
                                                    <a href={ev.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-black">
                                                        <ExternalLink className="w-3.5 h-3.5" /> DART 원문
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] text-gray-600 italic">Global Data</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
        </div>
    );
}
