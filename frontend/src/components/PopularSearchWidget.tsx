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
    <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Flame className="w-48 h-48 text-red-500" />
      </div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            실시간 급상승 검색어 <span className="text-xs font-normal text-red-400 border border-red-500/50 px-2 py-0.5 rounded-full bg-red-500/10">HOT</span>
          </h2>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> 남들은 지금 뭘 볼까?
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 relative z-10">
        {items.map((item, idx) => (
          <Link 
            href={item.symbol ? `/stock/${item.symbol}` : "#"} 
            key={idx}
            className="flex items-center justify-between p-2 md:p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`text-base md:text-lg font-black w-5 md:w-6 shrink-0 text-center ${idx < 3 ? 'text-red-400' : 'text-gray-500'}`}>
                {idx + 1}
              </span>
              <span className="text-white font-bold text-[13px] md:text-sm hover:text-red-300 transition-colors truncate tracking-tighter">
                {item.name}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-400 text-[11px] md:text-xs tabular-nums tracking-tighter">{Number(item.price).toLocaleString()}원</span>
              <div className={`flex items-center gap-0.5 text-xs md:text-sm font-bold w-12 md:w-14 justify-end tabular-nums tracking-tighter ${
                item.change_percent > 0 ? "text-red-400" : item.change_percent < 0 ? "text-blue-400" : "text-gray-400"
              }`}>
                {item.change_percent > 0 ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4" /> : item.change_percent < 0 ? <ChevronDown className="w-3 h-3 md:w-4 md:h-4" /> : <Minus className="w-3 h-3 md:w-4 md:h-4" />}
                {Math.abs(item.change_percent)}%
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
