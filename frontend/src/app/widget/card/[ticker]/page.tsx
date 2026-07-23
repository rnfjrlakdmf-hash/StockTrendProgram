"use client";

import { use, useEffect, useState } from "react";
import { fetchStockFast, StockData } from "@/lib/api";
import { Loader2, TrendingUp, Zap, ExternalLink } from "lucide-react";
import GaugeChart from "@/components/GaugeChart";
import Link from "next/link";

export default function BloggerCardWidget({ params }: { params: Promise<{ ticker: string }> }) {
  const resolvedParams = use(params);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchStockFast(resolvedParams.ticker);
      if (data) {
        setStockData(data);
      }
      setLoading(false);
    };
    loadData();
  }, [resolvedParams.ticker]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[250px] bg-slate-900 flex flex-col items-center justify-center border border-slate-800 rounded-xl">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
        <span className="text-sm text-slate-400 font-bold">AI 분석 데이터 불러오는 중...</span>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="w-full h-full min-h-[250px] bg-slate-900 flex items-center justify-center border border-slate-800 rounded-xl text-slate-400">
        종목 데이터를 찾을 수 없습니다.
      </div>
    );
  }

  const isUp = stockData.change.includes('+');

  return (
    <div className="w-full h-full bg-slate-950 text-white border border-slate-800 rounded-xl overflow-hidden font-sans shadow-lg flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div>
          <h2 className="text-lg font-black">{stockData.name}</h2>
          <p className="text-xs text-slate-400">{stockData.symbol} | {stockData.sector}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{stockData.price}</p>
          <p className={`text-sm font-bold ${isUp ? 'text-red-400' : 'text-blue-400'}`}>
            {isUp ? '▲' : '▼'} {stockData.change}
          </p>
        </div>
      </div>

      {/* Body: AI Score */}
      <div className="p-4 flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 to-black relative">
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-sm">
          <Zap className="w-3 h-3" /> AI 실시간 분석
        </div>
        
        <div className="scale-75 origin-center -my-4">
           <GaugeChart 
             score={stockData.score || Math.floor(Math.random() * 40) + 40} // 기본값(임시 fallback)
             label="매력도" 
             color={(stockData.score || 50) > 70 ? "#4ade80" : "#facc15"} 
           />
        </div>
      </div>

      {/* Footer / CTA */}
      <a 
        href={`https://stock-trend-program.co.kr/stock/${resolvedParams.ticker}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 px-4 text-center transition-colors flex items-center justify-center gap-2 group"
      >
        세력 수급 및 AI 요약 브리핑 보기 
        <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </a>
    </div>
  );
}
