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
    <div className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 via-black to-black p-1 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent opacity-50" />
      
      <div className="relative bg-black/60 backdrop-blur-xl rounded-[22px] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-red-400 font-bold text-sm tracking-wider uppercase">Weekend Live</span>
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Coins className="h-6 w-6 text-yellow-400" /> 주말 코인 핫트렌드
            </h2>
            <p className="text-gray-400 text-sm mt-1">주식 장이 닫힌 주말, 쉬지 않는 가상화폐 시장의 흐름을 확인하세요.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <Flame className="h-3 w-3 text-orange-500" /> 업비트 실시간 연동
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {coins.map((coin) => {
            const isUp = coin.signed_change_rate > 0;
            const isDown = coin.signed_change_rate < 0;
            const changePercent = (coin.signed_change_rate * 100).toFixed(2);
            
            return (
              <div key={coin.market} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="text-sm font-bold text-gray-300 mb-1 flex justify-between items-start">
                  {coin.korean_name}
                  <span className="text-[10px] text-gray-600 font-normal">{coin.market.replace("KRW-", "")}</span>
                </div>
                <div className="text-lg font-black text-white mb-1">
                  {coin.trade_price.toLocaleString()}원
                </div>
                <div className={`text-sm font-bold flex items-center gap-1 ${isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-gray-400'}`}>
                  {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : null}
                  {isUp ? '+' : ''}{changePercent}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
