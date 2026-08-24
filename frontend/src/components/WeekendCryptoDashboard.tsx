"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Coins, Activity, Flame } from "lucide-react";
import Link from "next/link";

interface CoinData {
  market: string;
  korean_name: string;
  trade_price: number;
  signed_change_rate: number;
  acc_trade_price_24h: number;
}

const COIN_MAP: Record<string, string> = {
  "KRW-BTC": "비트코인",
  "KRW-ETH": "이더리움",
  "KRW-XRP": "리플",
  "KRW-DOGE": "도지코인",
  "KRW-SOL": "솔라나",
  "KRW-SHIB": "시바이누",
};

export default function WeekendCryptoDashboard() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const markets = Object.keys(COIN_MAP).join(",");
        const res = await fetch(`https://api.upbit.com/v1/ticker?markets=${markets}`);
        if (!res.ok) return;
        const data = await res.json();
        
        const formattedData: CoinData[] = data.map((item: any) => ({
          market: item.market,
          korean_name: COIN_MAP[item.market],
          trade_price: item.trade_price,
          signed_change_rate: item.signed_change_rate,
          acc_trade_price_24h: item.acc_trade_price_24h
        }));
        
        // 거래대금 순 정렬
        formattedData.sort((a, b) => b.acc_trade_price_24h - a.acc_trade_price_24h);
        setCoins(formattedData);
      } catch (e) {
        console.error("Failed to fetch crypto data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
    const interval = setInterval(fetchCoins, 3000); // 3초마다 갱신 (실시간 느낌)
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 flex justify-center items-center h-32">
        <Activity className="h-6 w-6 text-yellow-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-zinc-900/90 to-zinc-950 p-6 md:p-7 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-rose-400 font-black text-xs tracking-wider uppercase">WEEKEND LIVE 24/7</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Coins className="h-5 w-5 text-amber-400" />
            </div>
            <span>주말 가상자산 핫트렌드</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">주식 정규장이 닫힌 주말에도 실시간으로 움직이는 글로벌 가상자산 시세</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20 self-start sm:self-center shadow-sm">
          <Flame className="h-3.5 w-3.5 text-amber-400" /> 
          <span>업비트(Upbit) 실시간 연동</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {coins.map((coin) => {
          const isUp = coin.signed_change_rate > 0;
          const isDown = coin.signed_change_rate < 0;
          const changePercent = (coin.signed_change_rate * 100).toFixed(2);
          
          return (
            <div key={coin.market} className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 hover:border-amber-500/40 hover:bg-zinc-900 transition-all duration-300 shadow-md flex flex-col justify-between group">
              <div>
                <div className="text-xs font-black text-white mb-1.5 flex justify-between items-center">
                  <span className="group-hover:text-amber-300 transition-colors truncate">{coin.korean_name}</span>
                  <span className="text-[10px] text-gray-500 font-mono font-bold bg-white/5 border border-white/10 px-1.5 py-0.2 rounded">{coin.market.replace("KRW-", "")}</span>
                </div>
                <div className="text-base sm:text-lg font-black text-white font-mono tracking-tight my-1 truncate">
                  {coin.trade_price >= 1000 ? coin.trade_price.toLocaleString() : coin.trade_price}<span className="text-xs font-bold text-gray-400 ml-0.5">원</span>
                </div>
              </div>
              <div className={`mt-2 text-xs font-black flex items-center justify-between px-2 py-1 rounded-lg border font-mono ${
                isUp 
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                  : isDown 
                  ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' 
                  : 'text-gray-400 bg-white/5 border-white/10'
              }`}>
                <span className="text-[10px]">{isUp ? '▲' : isDown ? '▼' : '-'}</span>
                <span>{isUp ? '+' : ''}{changePercent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
