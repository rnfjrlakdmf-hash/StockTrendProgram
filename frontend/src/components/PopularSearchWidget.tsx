"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { TrendingUp, Flame, ChevronUp, ChevronDown, Minus } from "lucide-react";
import Link from "next/link";

interface PopularItem {
  rank: number;
  name: string;
  price: string;
  change_percent: number;
  symbol?: string;
}

export default function PopularSearchWidget() {
  const [items, setItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market/rank/naver/krx/popular`);
        const data = await res.json();
        if (data.status === "success" && data.data && data.data.length > 0) {
          setItems(data.data.slice(0, 10)); // Top 10
        }
      } catch (err) {
        console.error("Failed to fetch popular searches", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPopular();
    // Refresh every 30 seconds to stimulate FOMO with changing data
    const interval = setInterval(fetchPopular, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-full">
      {/* Header */}
      <div className="bg-zinc-950/80 border-b border-white/10 px-5 py-4 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl relative">
            <Flame className="w-4 h-4 text-rose-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full"></span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-black text-white text-sm tracking-tight">실시간 급상승 검색어</h2>
            <span className="text-[10px] font-black text-rose-400 border border-rose-500/40 px-1.5 py-0.2 rounded-md bg-rose-500/10">HOT</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-400 font-bold flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/5">
          <TrendingUp className="w-3 h-3 text-rose-400" />
          <span>실시간 인기 트렌드</span>
        </div>
      </div>

      {/* List (2-column balanced grid) */}
      <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
        {items.map((item, idx) => {
          const isUp = item.change_percent > 0;
          const isDown = item.change_percent < 0;
          const colorClass = isUp ? "text-rose-400" : isDown ? "text-sky-400" : "text-gray-400";
          const bgClass = isUp ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : isDown ? "bg-sky-500/10 border-sky-500/20 text-sky-300" : "bg-white/5 border-white/10 text-gray-400";

          return (
            <Link 
              href={item.symbol ? `/stock/${item.symbol}` : "#"} 
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-zinc-800/80 border border-white/5 hover:border-rose-500/30 transition-all group cursor-pointer h-full"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Rank Badge */}
                <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg font-black text-xs ${
                  idx === 0 ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md shadow-rose-500/20" :
                  idx === 1 ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md shadow-amber-500/20" :
                  idx === 2 ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-200 shadow-md" :
                  "bg-zinc-800 text-gray-400 font-bold"
                }`}>
                  {idx + 1}
                </div>

                <div className="flex flex-col min-w-0 truncate">
                  <span className="font-bold text-xs md:text-sm text-white tracking-tight group-hover:text-rose-300 transition-colors truncate">
                    {item.name}
                  </span>
                  {item.symbol && (
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider truncate">
                      {item.symbol}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end flex-shrink-0 ml-2">
                <div className="tabular-nums font-black font-mono text-xs md:text-sm text-white">
                  {Number(item.price).toLocaleString()}<span className="text-[11px] font-bold text-gray-400 ml-0.5">원</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${bgClass}`}>
                    {isUp ? `+${item.change_percent}%` : isDown ? `${item.change_percent}%` : '0.00%'}
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
