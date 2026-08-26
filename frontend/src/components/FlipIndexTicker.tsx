'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';

interface MarketIndex {
    label: string;
    icon: string;
    value: string;
    change: string;
    up: boolean;
    sparkline?: number[];
}

const Sparkline = ({ data, up }: { data: number[], up: boolean }) => {
    if (!data || data.length < 2) return null;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 40;
    const height = 16;
    
    const points = data.map((d, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((d - min) / range) * height
    }));
    
    const path = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;
    
    return (
        <svg width={width} height={height} className="overflow-visible">
            <path 
                d={path} 
                fill="none" 
                stroke={up ? "#f87171" : "#60a5fa"} 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="opacity-70"
            />
        </svg>
    );
};

export default function FlipIndexTicker() {
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const fetchIndices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/indices`, { cache: "no-store" });
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                // [v5.8.0] 필터링 개선: 지수뿐만 아니라 수급, 통계, 매크로 지표를 통합적으로 표시
                const coreIndices = json.data.filter((item: any) => {
                    const name = item.event_kr || "";
                    
                    const isTarget = 
                        name.includes("KOSPI") || 
                        name.includes("KOSDAQ") || 
                        name.includes("S&P") || 
                        name.includes("NASDAQ") || 
                        name.includes("다우") || 
                        name.includes("USD") || 
                        name.includes("환율") || 
                        name.includes("국고채") || 
                        name.includes("WTI") || 
                        name.includes("금") || 
                        name.includes("비트코인") ||
                        name.includes("BTC") ||
                        name.includes("CD") ||
                        name.includes("콜");
                    
                    return isTarget;
                }).map((item: any) => {
                    let icon = "📈";
                    if (item.event_kr.includes("KOSPI") || item.event_kr.includes("KOSDAQ") || item.event_kr.includes("코스피")) icon = "🇰🇷";
                    else if (item.event_kr.includes("S&P") || item.event_kr.includes("NASDAQ") || item.event_kr.includes("다우") || item.event_kr.includes("나스닥")) icon = "🇺🇸";
                    else if (item.event_kr.includes("비트코인") || item.event_kr.includes("BTC")) icon = "₿";
                    else if (item.event_kr.includes("환율") || item.event_kr.includes("달러")) icon = "💵";
                    else if (item.event_kr.includes("금리") || item.event_kr.includes("채권") || item.event_kr.includes("CD") || item.event_kr.includes("콜")) icon = "📊";
                    else if (item.event_kr.includes("WTI") || item.event_kr.includes("유가")) icon = "🛢️";
                    else if (item.event_kr.includes("금") || item.event_kr.includes("Gold")) icon = "💰";
                    else if (item.event_kr.includes("구리") || item.event_kr.includes("Copper")) icon = "🏗️";

                    return {
                        label: item.event_kr.replace("[글로벌] ", "").replace("[한국] ", "").replace("🏦 ", "").replace("📋 ", "").split(" (")[0],
                        icon: icon,
                        value: item.actual || "---",
                        change: item.change || "0.00%",
                        up: item.change_val !== undefined ? item.change_val >= 0 : !item.change?.startsWith("-")
                    };
                });
                
                // 중복 제거 (명칭 기준)
                const uniqueIndices = coreIndices.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.label === v.label)) === i);
                setIndices(uniqueIndices);
            }
        } catch (err) {
            console.error("Failed to fetch market indices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchIndices();
        const interval = setInterval(fetchIndices, 15000); 
        return () => clearInterval(interval);
    }, []);

    if (loading && (!Array.isArray(indices) || indices.length === 0)) {
        return (
            <div className="flex items-center gap-3 px-4 h-9 bg-zinc-950/60 rounded-xl border border-white/5 animate-pulse">
                <div className="w-24 h-4 bg-white/10 rounded" />
                <div className="w-24 h-4 bg-white/10 rounded" />
                <div className="w-24 h-4 bg-white/10 rounded" />
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden bg-zinc-950/80 border border-white/10 rounded-2xl px-3 py-1 backdrop-blur-md shadow-inner flex items-center h-10">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes ticker-h {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker-h {
                    display: flex !important;
                    width: max-content !important;
                    animation: ticker-h 40s linear infinite !important;
                    will-change: transform;
                }
                .animate-ticker-h:hover {
                    animation-play-state: paused !important;
                }
            `}} />
            
            <div 
                className="animate-ticker-h flex items-center gap-3 select-none" 
                style={{ display: 'flex', width: 'max-content' }}
            >
                {[...indices, ...indices].map((idx, i) => (
                    <div key={i} className="flex-shrink-0 flex items-center gap-2.5 px-3 py-1 rounded-xl hover:bg-white/5 transition-colors group/item">
                        <span className="text-xs">{idx.icon}</span>
                        <span className="text-[11px] font-bold text-gray-400 tracking-tight whitespace-nowrap">{idx.label}</span>
                        <span className="text-xs font-black text-white font-mono tabular-nums whitespace-nowrap">{idx.value}</span>
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 whitespace-nowrap ${
                            idx.up ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 'text-sky-400 border-sky-500/20 bg-sky-500/10'
                        }`}>
                            {idx.up ? '▲' : '▼'}{idx.change}
                        </span>
                        {idx.sparkline && (
                            <div className="hidden sm:block opacity-60 group-hover/item:opacity-100 transition-opacity ml-1">
                                <Sparkline data={idx.sparkline} up={idx.up} />
                            </div>
                        )}
                        <span className="text-white/10 ml-2">|</span>
                    </div>
                ))}
            </div>

            {/* Fading Mask on Left & Right */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none z-10" />
        </div>
    );
}
