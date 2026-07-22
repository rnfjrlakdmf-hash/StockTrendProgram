import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import { RankingBoxSkeleton } from "./SkeletonCard";

function AnimatedNumber({ value, isPrice = false, prefix = "" }: { value: number | string, isPrice?: boolean, prefix?: string }) {
    // If it's a string (like "+1.23%"), just animate opacity. If number, we can do flip.
    // For simplicity, we just do a vertical slide animation on the entire value
    return (
        <span className="relative inline-block overflow-hidden h-[1.2em] leading-tight align-bottom">
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={value}
                    initial={{ rotateX: -90, opacity: 0, y: "50%" }}
                    animate={{ rotateX: 0, opacity: 1, y: "0%" }}
                    exit={{ rotateX: 90, opacity: 0, y: "-50%", position: "absolute" }}
                    transition={{ type: "spring", stiffness: 150, damping: 15 }}
                    style={{ transformOrigin: "center center", transformStyle: "preserve-3d" }}
                    className="inline-block origin-center"
                >
                    {prefix}{isPrice && typeof value === 'number' ? value.toLocaleString() : value}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

export default function LiveRankingBox() {
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [market, setMarket] = useState<"KR" | "US">("KR");
    const [category, setCategory] = useState<"amount" | "volume">("amount");

    const fetchRankings = async (currentMarket = market, currentCategory = category) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/rankings/live?market=${currentMarket}&category=${currentCategory}`);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                setRankings(json.data);
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error("Live ranking fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchRankings(market, category);
        const interval = setInterval(() => fetchRankings(market, category), 5000); // 5초마다 갱신
        return () => clearInterval(interval);
    }, [market, category]);

    if (loading && rankings.length === 0) {
        return <RankingBoxSkeleton />;
    }

    return (
        <div className="w-full bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Header with Tabs */}
            <div className="bg-indigo-900/40 border-b border-indigo-500/20 px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Activity className="w-5 h-5 text-indigo-400" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </div>
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                        <button 
                            onClick={() => { setMarket("KR"); setCategory("amount"); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${market === "KR" && category === "amount" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            🇰🇷 거래대금
                        </button>
                        <button 
                            onClick={() => { setMarket("KR"); setCategory("volume"); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${market === "KR" && category === "volume" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            🇰🇷 인기거래
                        </button>
                        <div className="w-px bg-white/10 mx-1 my-1"></div>
                        <button 
                            onClick={() => { setMarket("US"); setCategory("amount"); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${market === "US" && category === "amount" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            🇺🇸 거래대금
                        </button>
                        <button 
                            onClick={() => { setMarket("US"); setCategory("volume"); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${market === "US" && category === "volume" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            🇺🇸 인기거래
                        </button>
                    </div>
                </div>
                {lastUpdated && (
                    <div className="text-[10px] text-gray-500 tracking-wider flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md">
                        <RefreshCw className="w-3 h-3 text-gray-400 animate-spin-slow" />
                        {lastUpdated.toLocaleTimeString('ko-KR', { hour12: false })}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="p-2 md:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {rankings.map((item, idx) => {
                    const isUp = item.change_val > 0 || String(item.change_percent).includes('+');
                    const isDown = item.change_val < 0 || String(item.change_percent).includes('-');
                    const colorClass = isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-400";
                    const bgClass = isUp ? "bg-red-500/10" : isDown ? "bg-blue-500/10" : "bg-gray-500/10";
                    
                    return (
                        <Link href={`/stock/${item.symbol}`} key={item.symbol || idx}>
                            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/10 cursor-pointer">
                                <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
                                    {/* Rank Badge */}
                                    <div className={`w-5 h-5 md:w-6 md:h-6 flex-shrink-0 flex items-center justify-center rounded-md font-black text-[11px] md:text-xs ${
                                        idx < 3 ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "bg-white/10 text-gray-400"
                                    }`}>
                                        {item.rank}
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-[12px] xl:text-[13px] leading-tight break-all whitespace-normal line-clamp-2 text-white tracking-tighter group-hover:text-indigo-300 transition-colors">
                                            {item.name}
                                        </span>
                                        <span className="text-[10px] text-gray-500 tracking-wider truncate mt-0.5">
                                            {item.symbol}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end flex-shrink-0 ml-1.5">
                                    <div className={`tabular-nums tracking-tighter font-black text-[12px] xl:text-[13px] flex items-center gap-0.5 ${colorClass}`}>
                                        {market === "US" && <span>$</span>}
                                        <AnimatedNumber value={item.price_num || item.price} isPrice={true} />
                                        {market === "KR" && <span>원</span>}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bgClass} ${colorClass}`}>
                                            <AnimatedNumber value={item.change_percent} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
