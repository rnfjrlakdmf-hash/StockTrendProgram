"use client";

import { useState, useEffect } from "react";
import { Star, Trash2, Loader2, RefreshCw, AlertCircle, X, Bell, BellRing, Crosshair, Zap, Settings2, FileWarning, ExternalLink } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import CleanStockList from "@/components/CleanStockList";
import PriceAlertSetup from "@/components/PriceAlertSetup";
import { useAuth } from "@/context/AuthContext";

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
    const [alertStock, setAlertStock] = useState<{ symbol: string; price: number } | null>(null);

    // Alerts List States
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [chatId, setChatId] = useState("");

    // CB Disclosure State
    const [cbAlerts, setCbAlerts] = useState<any[]>([]);
    const [cbLoading, setCbLoading] = useState(false);

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
        try {
            const res = await fetch(`${API_BASE_URL}/api/alerts`);
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
        if (!confirm("알림을 삭제하시겠습니까?")) return;
        try {
            await fetch(`${API_BASE_URL}/api/alerts/${id}`, { method: 'DELETE' });
            setAlerts(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const runAlertCheck = async () => {
        setAlertsLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/alerts/check`);
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
            const newQuotes: Record<string, any> = {};
            for (const item of watchlist) {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/quote/${item.symbol}`);
                    const json = await res.json();
                    if (json.status === "success") {
                        newQuotes[item.symbol] = json.data;
                    }
                } catch (e) { }
            }
            setQuotes(newQuotes);
            setLastUpdated(new Date());
        };
        fetchQuotes();
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
            </div>

            {/* Content */}
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
                                badge: item.badge,
                                added_price: item.added_price
                            };
                        })}
                        onItemClick={(sym) => { window.location.href = `/?q=${sym}`; }}
                        onDelete={handleRemoveItem}
                        onAlertClick={(symbol, price) => { setAlertStock({ symbol, price }); }}
                    />
                </div>
            )}

            {/* Alerts Section */}
            {user && (
                <div className="space-y-8 pt-8 border-t border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <BellRing className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-black text-white">나의 알림 목록 ({alerts.length})</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={runAlertCheck} className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition-all">
                                <RefreshCw className={`w-5 h-5 ${alertsLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={() => setShowSettings(!showSettings)} className={`p-2.5 rounded-xl border transition-all ${showSettings ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-400'}`}>
                                <Settings2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {showSettings && (
                        <div className="grid md:grid-cols-2 gap-6 p-6 bg-blue-900/10 border border-blue-500/20 rounded-3xl animate-in zoom-in-95">
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
                                        const res = await fetch(`${API_BASE_URL}/api/telegram/recent-users`);
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
            )}

            {/* CB Disclosure Alerts */}
            {user && (
                <div className="space-y-4 pt-8 border-t border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileWarning className="w-6 h-6 text-orange-400" />
                            <h2 className="text-2xl font-black text-white">전환사채(CB) 공시 알림</h2>
                            {cbAlerts.length > 0 && (
                                <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-black rounded-full animate-pulse">
                                    {cbAlerts.length}건
                                </span>
                            )}
                        </div>
                        <button onClick={fetchCbAlerts} className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition-all" title="새로고침">
                            <RefreshCw className={`w-5 h-5 ${cbLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {cbLoading ? (
                        <div className="py-8 flex items-center justify-center text-gray-500 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /><span>공시 확인 중...</span>
                        </div>
                    ) : cbAlerts.length === 0 ? (
                        <div className="py-12 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                            <FileWarning className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-600 text-sm">관심종목 중 최근 전환사채 공시가 없습니다.</p>
                            <p className="text-gray-700 text-xs mt-1">한국 종목만 조회됩니다.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {cbAlerts.map((cb, idx) => (
                                <a
                                    key={idx}
                                    href={cb.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/10 flex items-start gap-4 transition-all group"
                                >
                                    <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 shrink-0 mt-0.5">
                                        <FileWarning className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-orange-300" translate="no">{cb.symbol}</span>
                                            <span className="text-sm font-bold text-white">{cb.name}</span>
                                            <span className="text-[10px] bg-orange-500/30 text-orange-300 border border-orange-500/50 px-1.5 py-0.5 rounded font-black tracking-tighter uppercase">CB</span>
                                        </div>
                                        <p className="text-gray-200 text-sm leading-snug font-medium">{cb.title}</p>
                                        <p className="text-gray-500 text-xs mt-1" translate="no">{cb.date}</p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors shrink-0 mt-1" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {alertStock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div className="relative w-full max-w-lg">
                        <button onClick={() => setAlertStock(null)} className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
                        <PriceAlertSetup symbol={alertStock.symbol} currentPrice={alertStock.price} />
                    </div>
                </div>
            )}
        </div>
    );
}
