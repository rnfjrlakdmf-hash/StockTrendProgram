"use client";

import { useState, useEffect } from "react";
import { Star, Trash2, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import CleanStockList from "@/components/CleanStockList";
import { useAuth } from "@/context/AuthContext";

export default function WatchlistPage() {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [quotes, setQuotes] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const { user, isLoading: isAuthLoading } = useAuth();

    const fetchWatchlist = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                headers: { "X-User-ID": user.id }
            });
            const json = await res.json();
            if (json.status === "success" && json.data.length > 0) {
                // Backend now returns {symbol, name} objects
                // If it returns strings (legacy), map them. Validating structure.
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

    useEffect(() => {
        if (isAuthLoading) return;
        if (user) {
            fetchWatchlist();
            const interval = setInterval(fetchWatchlist, 10000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
            setWatchlist([]);
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
                headers: { "X-User-ID": user.id }
            });
            setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
            const newQuotes = { ...quotes };
            delete newQuotes[symbol];
            setQuotes(newQuotes);
        } catch (e) {
            console.error(e);
        }
    };

    const handleReset = async () => {
        if (!confirm("관심 종목을 모두 초기화하시겠습니까?")) return;
        try {
            await fetch(`${API_BASE_URL}/api/watchlist`, { method: "DELETE" });
            setWatchlist([]);
            setQuotes({});
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

                {/* Reset Button Removed as requested */}
            </div>

            {/* Content */}
            {isAuthLoading || loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p>데이터를 불러오는 중입니다...</p>
                </div>
            ) : !user ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-10 h-10 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h3>
                    <p className="text-gray-400 mb-6 max-w-md">
                        관심 종목을 관리하려면 구글 로그인을 진행해주세요.
                    </p>
                </div>
            ) : watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Star className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">관심 종목이 비어있습니다</h3>
                    <p className="text-gray-400 mb-6 max-w-md">
                        종목 발굴 페이지에서 유망한 종목을 찾아 별표(★)를 눌러 추가해보세요.
                    </p>
                    <Link
                        href="/discovery"
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        종목 발굴하러 가기
                    </Link>
                </div>
            ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                    <CleanStockList
                        items={watchlist.map(item => {
                            const data = quotes[item.symbol];
                            return {
                                symbol: item.symbol,
                                name: item.name || (data ? data.name : item.symbol),
                                price: data ? data.price : "-",
                                change: data ? data.change : "0%",
                            };
                        })}
                        onItemClick={(sym) => {
                            // Use window.location as router.push might not be imported or we want full reload? 
                            // Using window.location for now as Link covered whole div before
                            window.location.href = `/?q=${sym}`;
                        }}
                        onDelete={handleRemoveItem}
                    />
                </div>
            )}
        </div>
    );
}

