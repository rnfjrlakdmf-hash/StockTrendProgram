"use client";

import { useState, useEffect } from "react";
import { Star, Trash2, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";

export default function WatchlistPage() {
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [quotes, setQuotes] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchWatchlist = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/watchlist`);
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
        fetchWatchlist();
        const interval = setInterval(fetchWatchlist, 10000);
        return () => clearInterval(interval);
    }, []);

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
        try {
            await fetch(`${API_BASE_URL}/api/watchlist/${symbol}`, { method: "DELETE" });
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

                {watchlist.length > 0 && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20"
                    >
                        <Trash2 className="w-4 h-4" /> 전체 초기화
                    </button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p>관심 종목 데이터를 불러오는 중입니다...</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {watchlist.map((item) => {
                        const data = quotes[item.symbol];
                        const isUp = data?.change?.includes('+');

                        return (
                            <div key={item.symbol} className="group relative bg-black/40 border border-white/10 rounded-3xl p-6 backdrop-blur-md hover:border-blue-500/30 transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-blue-500/10">
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => handleRemoveItem(item.symbol)}
                                        className="p-2 rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        title="목록에서 삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-2xl font-bold text-white">{item.symbol}</h3>
                                    </div>
                                    <p className="text-sm text-gray-400 truncate pr-8">
                                        {item.name || (data ? data.name : "로딩중...")}
                                    </p>
                                </div>

                                {data ? (
                                    <div className="mt-6 flex items-end justify-between">
                                        <div>
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Current Price</p>
                                            <p className="text-3xl font-bold text-gray-100">{data.price}</p>
                                        </div>
                                        <div className={`text-right ${isUp ? 'text-red-400' : 'text-blue-400'}`}>
                                            <div className="flex items-center justify-end gap-1 font-bold text-lg">
                                                {isUp ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                                {data.change}
                                            </div>
                                            <span className="text-xs opacity-80">전일 대비</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-6 h-[72px] flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                                    </div>
                                )}

                                {/* Link to Detail Page */}
                                <Link
                                    href={`/?q=${item.symbol}`} // Simple way to nav to detail, or make a dedicated detail page
                                    className="absolute inset-0 z-0"
                                    onClick={(e) => {
                                        // Prevent click when deleting
                                        if ((e.target as HTMLElement).closest('button')) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

