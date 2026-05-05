"use client";

import { useState, useEffect } from "react";
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
    const { user, isLoading: isAuthLoading } = useAuth();
    
    // Alert Modal State
    const [alertStock, setAlertStock] = useState<{ symbol: string; price: number; addedPrice?: number } | null>(null);

    // Alerts List States
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [chatId, setChatId] = useState("");

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
            } else {
                setWatchlist([]);
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

    useEffect(() => {
        setIsAdmin(isFreeModeEnabled());
        if (isAuthLoading) return;
        if (user) {
            fetchWatchlist();
            fetchAlerts();
            fetchCbAlerts();
            const savedChatId = localStorage.getItem("telegram_chat_id");
            if (savedChatId) setChatId(savedChatId);
            
            const interval = setInterval(() => {
                fetchWatchlist();
                fetchAlerts();
            }, 15000);
            // CB 알림은 5분마다 (API 부하 제한)
            const cbInterval = setInterval(fetchCbAlerts, 300000);
            return () => { clearInterval(interval); clearInterval(cbInterval); };
        } else {
            setLoading(false);
            setWatchlist([]);
            setAlerts([]);
        }
    }, [user, isAuthLoading]);

    useEffect(() => {
        if (watchlist.length === 0) return;

        const fetchQuotes = async () => {
            const symbols = watchlist.map(i => i.symbol).join(",");
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/quotes/multi?symbols=${encodeURIComponent(symbols)}`);
                const json = await res.json();
                if (json.status === "success") {
                    setQuotes(json.data);
                    setLastUpdated(new Date());
                }
            } catch (e) { }
        };
        fetchQuotes();
        
        // [NEW] 실적/배당 일정도 함께 로드
        const syms = watchlist.map(i => i.symbol).join(",");
        fetchEventSchedules(syms);
    }, [watchlist]);

    const handleRemoveItem = async (symbol: string) => {
        if (!user) return;
        if (!confirm(`${symbol} 종목을 삭제하시겠습니까?`)) return;

        try {
            await fetch(`${API_BASE_URL}/api/watchlist/${symbol}`, {
                method: "DELETE",
                headers: { "X-User-ID": user.id || (user as any).uid }
            });
            setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
            
            // Dispatch event to sync with Sidebar
            window.dispatchEvent(new CustomEvent('watchlistChanged'));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                        MY 관심종목
                    </h1>
                    <p className="text-gray-400 mt-2 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> 실시간 시세 자동 업데이트 중 ({lastUpdated.toLocaleTimeString()})
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
                        {isAuthLoading || loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                <p>데이터를 불러오는 중입니다...</p>
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
                                        return {
                                            symbol: item.symbol,
                                            name: item.name || (data ? data.name : item.symbol),
                                            price: data ? data.price : "-",
                                            change: data ? data.change : "0%",
                                            change_percent: data ? (data.change_percent || data.change) : "0%",
                                            badge: item.badge,
                                            added_price: item.added_price
                                        };
                                    })}
                                    onItemClick={(sym) => { window.location.href = `/?q=${sym}`; }}
                                    onDelete={handleRemoveItem}
                                    onAlertClick={(symbol, price, addedPrice) => { setAlertStock({ symbol, price, addedPrice }); }}
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
                                실시간 일정 리포트
                            </h3>
                            <p className="text-sm text-emerald-400/60 font-medium">관심종목의 배당락일, 실적발표, 주요 공시를 실시간 스캔합니다.</p>
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
                                    <h4 className="font-bold text-white leading-tight">실시간 푸시 알림 서비스</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">앱을 닫아도 실시간 가격 돌파 및 공시 소식을 전달합니다.</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    const { requestFCMToken } = await import("@/lib/firebase");
                                    const token = await requestFCMToken();
                                    if (token) {
                                        const res = await fetch(`${API_BASE_URL}/api/fcm/register`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id || (user as any).uid },
                                            body: JSON.stringify({ token, device_type: 'web', device_name: navigator.userAgent })
                                        });
                                        const data = await res.json();
                                        if (data.status === 'success') {
                                            alert("✅ 실시간 푸시 알림이 활성화되었습니다!");
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
                                    <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-xl border transition-all ${showSettings ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-400'}`}>
                                        <Settings2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {showSettings && (
                                <div className="grid md:grid-cols-2 gap-6 p-6 bg-purple-900/10 border border-purple-500/20 rounded-3xl animate-in zoom-in-95">
                                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                        <h3 className="font-bold flex items-center gap-2 text-blue-300"><Bell className="w-4 h-4" /> 웹 푸시 알림</h3>
                                        <p className="text-xs text-gray-500 leading-relaxed">브라우저 알림으로 가격 변동 소식을 즉시 받아볼 수 있습니다.</p>
                                        <button
                                            onClick={async () => {
                                                const { requestFCMToken } = await import("@/lib/firebase");
                                                const token = await requestFCMToken();
                                                if (token) {
                                                    await fetch(`${API_BASE_URL}/api/fcm/register`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id || (user as any).uid },
                                                        body: JSON.stringify({ token, device_type: 'web', device_name: navigator.userAgent })
                                                    });
                                                    alert("✅ 설정 완료!");
                                                }
                                            }}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                                        >
                                            🔔 푸시 알림 활성화
                                        </button>
                                    </div>
                                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                        <h3 className="font-bold flex items-center gap-2 text-yellow-500"><Zap className="w-4 h-4" /> 텔레그램 연동</h3>
                                        <div className="text-sm font-mono bg-white/5 p-3 rounded-lg text-gray-300">ID: {chatId || "미설정"}</div>
                                        <button
                                            onClick={async () => {
                                                const res = await fetch(`${API_BASE_URL}/api/auth/telegram/recent-users`);
                                                const json = await res.json();
                                                if (json.data?.length > 0) {
                                                    localStorage.setItem("telegram_chat_id", json.data[0].id);
                                                    setChatId(json.data[0].id);
                                                    alert("✅ 연결 성공!");
                                                } else { alert("@rnfjrlAlarm_bot 에게 먼저 메시지를 보내주세요."); }
                                            }}
                                            className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl transition-all"
                                        >
                                            🔄 연결 상태 확인
                                        </button>
                                    </div>
                                </div>
                            )}

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
