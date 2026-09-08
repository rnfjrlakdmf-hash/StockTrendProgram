"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Coins, Activity, Flame, ChevronRight } from "lucide-react";
import Link from "next/link";

interface CoinData {
  market: string;
  korean_name: string;
  trade_price: number;
  signed_change_rate: number;
  acc_trade_price_24h: number;
}

const COIN_ORDER = [
  { code: "KRW-BTC", name: "비트코인", symbol: "BTC" },
  { code: "KRW-ETH", name: "이더리움", symbol: "ETH" },
  { code: "KRW-SOL", name: "솔라나", symbol: "SOL" },
  { code: "KRW-XRP", name: "리플", symbol: "XRP" },
  { code: "KRW-DOGE", name: "도지코인", symbol: "DOGE" },
  { code: "KRW-SHIB", name: "시바이누", symbol: "SHIB" },
];

export default function WeekendCryptoDashboard() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const markets = COIN_ORDER.map(c => c.code).join(",");
        const res = await fetch(`https://api.upbit.com/v1/ticker?markets=${markets}`);
        if (!res.ok) return;
        const data = await res.json();
        
        const map: Record<string, any> = {};
        data.forEach((d: any) => { map[d.market] = d; });

        const formattedData: CoinData[] = COIN_ORDER.map(item => {
          const raw = map[item.code] || {};
          return {
            market: item.code,
            korean_name: item.name,
            trade_price: raw.trade_price || 0,
            signed_change_rate: raw.signed_change_rate || 0,
            acc_trade_price_24h: raw.acc_trade_price_24h || 0
          };
        });
        
        setCoins(formattedData);
      } catch (e) {
        console.error("Failed to fetch crypto data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
    const interval = setInterval(fetchCoins, 4000); // 4초마다 실시간 갱신
    return () => clearInterval(interval);
  }, []);

  if (loading && coins.length === 0) {
    return (
      <div className="w-full bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 flex justify-center items-center h-[350px]">
        <Activity className="h-6 w-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col justify-between h-full group hover:border-white/20 transition-all duration-300">
      
      {/* 1. Header matching PopularSearchWidget */}
      <div className="bg-zinc-950/80 border-b border-white/10 px-5 py-4 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl relative">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full"></span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-black text-white text-sm tracking-tight">글로벌 가상자산 핫트렌드</h2>
            <span className="text-[10px] font-black text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded-md bg-amber-500/10 tracking-wider">
              24/7 LIVE
            </span>
          </div>
        </div>

        <div className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-gray-300">업비트 실시간 연동</span>
        </div>
      </div>

      {/* 2. Spacious 3x2 Grid Layout (No Text Clipping!) */}
      <div className="p-3 md:p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1 items-stretch">
        {coins.map((coin) => {
          const isUp = coin.signed_change_rate > 0;
          const isDown = coin.signed_change_rate < 0;
          const changePercent = (coin.signed_change_rate * 100).toFixed(2);
          const symbol = coin.market.replace("KRW-", "");
          
          return (
            <div 
              key={coin.market} 
              className="bg-zinc-950/70 border border-white/5 hover:border-amber-500/30 hover:bg-zinc-800/80 rounded-2xl p-3 sm:p-3.5 transition-all duration-300 flex flex-col justify-between group cursor-default"
            >
              {/* Coin Title & Symbol */}
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                  {coin.korean_name}
                </span>
                <span className="text-[10px] text-gray-400 font-mono font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                  {symbol}
                </span>
              </div>

              {/* Price (Full display with no cutoffs) */}
              <div className="my-1.5">
                <div className="text-sm sm:text-base font-black text-white font-mono tracking-tight tabular-nums truncate">
                  {coin.trade_price >= 1000 ? coin.trade_price.toLocaleString() : coin.trade_price}
                  <span className="text-[11px] font-bold text-gray-400 ml-0.5">원</span>
                </div>
              </div>

              {/* Change Rate Pill */}
              <div className="mt-1 flex items-center justify-between">
                <div className={`px-2 py-0.5 rounded-md text-[11px] font-black font-mono border flex items-center gap-1 ${
                  isUp 
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                    : isDown 
                    ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' 
                    : 'text-gray-400 bg-white/5 border-white/10'
                }`}>
                  <span className="text-[9px]">{isUp ? '▲' : isDown ? '▼' : '-'}</span>
                  <span>{isUp ? '+' : ''}{changePercent}%</span>
                </div>

                <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">
                  {coin.acc_trade_price_24h > 100000000000 
                    ? `${(coin.acc_trade_price_24h / 100000000).toFixed(0)}억`
                    : "실시간"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Subtitle / Notice at bottom */}
      <div className="px-5 pb-4 pt-1 flex items-center justify-between text-[11px] text-gray-500">
        <span>정규 증시 마감 후에도 24시간 실시간 시세 제공</span>
        <span className="text-amber-400 font-semibold">글로벌 유동성 지표</span>
      </div>

    </div>
  );
}
