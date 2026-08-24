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
        <div className="w-full bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-full">
            {/* Header with Tabs */}
            <div className="bg-zinc-950/80 border-b border-white/10 px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl relative">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full"></span>
                    </div>
                    <span className="font-black text-white text-sm tracking-tight">실시간 마켓 랭킹</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex bg-zinc-900 rounded-xl p-1 border border-white/5">
                        <button 
                            onClick={() => { setMarket("KR"); setCategory("amount"); }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${market === "KR" && category === "amount" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                        >
                            국내 거래대금
                        </button>
                        <button 
                            onClick={() => { setMarket("KR"); setCategory("volume"); }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${market === "KR" && category === "volume" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                        >
                            국내 인기
                        </button>
                        <div className="w-px bg-white/10 mx-0.5 my-1"></div>
                        <button 
                            onClick={() => { setMarket("US"); setCategory("amount"); }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${market === "US" && category === "amount" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                        >
                            미국 대금
                        </button>
                        <button 
                            onClick={() => { setMarket("US"); setCategory("volume"); }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${market === "US" && category === "volume" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                        >
                            미국 인기
                        </button>
                    </div>

                    {lastUpdated && (
                        <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/5">
                            <RefreshCw className="w-2.5 h-2.5 text-gray-500 animate-spin-slow" />
                            {lastUpdated.toLocaleTimeString('ko-KR', { hour12: false })}
                        </div>
                    )}
                </div>
            </div>

            {/* List (2-column balanced grid) */}
            <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                {rankings.slice(0, 10).map((item, idx) => {
                    const isUp = item.change_val > 0 || String(item.change_percent).includes('+');
                    const isDown = item.change_val < 0 || String(item.change_percent).includes('-');
                    const colorClass = isUp ? "text-rose-400" : isDown ? "text-sky-400" : "text-gray-400";
                    const bgClass = isUp ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : isDown ? "bg-sky-500/10 border-sky-500/20 text-sky-300" : "bg-white/5 border-white/10 text-gray-400";
                    
                    return (
                        <Link href={`/stock/${item.symbol}`} key={item.symbol || idx}>
                            <div className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-800/80 border border-white/5 hover:border-indigo-500/30 transition-all group cursor-pointer h-full">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {/* Rank Badge */}
                                    <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg font-black text-xs ${
                                        idx === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-md shadow-amber-500/20" :
                                        idx === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-black shadow-md" :
                                        idx === 2 ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-200 shadow-md" :
                                        "bg-zinc-800 text-gray-400 font-bold"
                                    }`}>
                                        {item.rank}
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0 truncate">
                                        <span className="font-bold text-xs md:text-sm text-white tracking-tight group-hover:text-indigo-300 transition-colors truncate">
                                            {item.name}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-mono tracking-wider truncate">
                                            {item.symbol}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                    <div className="tabular-nums font-black font-mono text-xs md:text-sm text-white">
                                        {market === "US" && <span>$</span>}
                                        <AnimatedNumber value={item.price_num || item.price} isPrice={true} />
                                        {market === "KR" && <span className="text-[11px] font-bold text-gray-400 ml-0.5">원</span>}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${bgClass}`}>
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
