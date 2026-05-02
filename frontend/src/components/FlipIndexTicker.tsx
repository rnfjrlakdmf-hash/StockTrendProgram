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
    if (!data || data.length < 2) return <div className="w-10 h-5 bg-white/5 rounded" />;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 20;
    
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
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={`transition-all duration-1000 ${up ? 'drop-shadow-[0_0_4px_rgba(248,113,113,0.3)]' : 'drop-shadow-[0_0_4px_rgba(96,165,250,0.3)]'}`}
            />
        </svg>
    );
};

export default function FlipIndexTicker() {
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchIndices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/indices`);
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                // [v5.5.0] 필터링: 국내외 4대 핵심 지수만 티커에 표시 (KOSPI, KOSDAQ, S&P 500, NASDAQ)
                const coreIndices = json.data.filter((item: any) => 
                    item.event_kr?.includes("KOSPI") || 
                    item.event_kr?.includes("KOSDAQ") || 
                    item.event_kr?.includes("S&P 500") || 
                    item.event_kr?.includes("NASDAQ")
                ).map((item: any) => {
                    // 기호 결정
                    let icon = "📈";
                    if (item.event_kr.includes("KOSPI") || item.event_kr.includes("KOSDAQ")) icon = "🇰🇷";
                    else if (item.event_kr.includes("S&P") || item.event_kr.includes("NASDAQ")) icon = "🇺🇸";

                    return {
                        label: item.event_kr.replace("[글로벌] ", "").split(" (")[0], // Clean up names
                        icon: icon,
                        value: item.actual || "---",
                        change: item.change || "0.00%",
                        // change_val이 있으면 사용, 없으면 change 문자열의 부호로 판단
                        up: item.change_val !== undefined ? item.change_val >= 0 : !item.change?.startsWith("-")
                    };
                });
                setIndices(coreIndices);
            }
        } catch (err) {
            console.error("Failed to fetch market indices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndices();
        const interval = setInterval(fetchIndices, 15000); 
        return () => clearInterval(interval);
    }, []);

    if (loading && (!Array.isArray(indices) || indices.length === 0)) {
        return (
            <div className="flex items-center gap-6 px-6 h-10">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-40 h-8 bg-white/5 animate-pulse rounded-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-5xl overflow-hidden group">
            <style jsx>{`
                @keyframes ticker-h {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .ticker-content-h {
                    display: flex;
                    width: max-content;
                    animation: ticker-h 60s linear infinite;
                    will-change: transform;
                }
                .ticker-content-h:hover {
                    animation-play-state: paused;
                }
            `}</style>
            
            <div className="ticker-content-h py-2 flex items-center gap-4">
                {[...indices, ...indices].map((idx, i) => (
                    <div key={i} className="flex items-center gap-6 px-8 border-r border-white/10 last:border-none hover:bg-white/[0.04] transition-all rounded-2xl py-2 group/item">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{idx.icon}</span>
                                <span className="text-[13px] font-black text-amber-200/80 uppercase tracking-wider">{idx.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-black text-white tabular-nums tracking-tighter">{idx.value}</span>
                                <span className={`text-[13px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${idx.up ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' : 'text-sky-400 border-sky-500/20 bg-sky-500/5'}`}>
                                    {idx.up ? '▲' : '▼'}{idx.change}
                                </span>
                            </div>
                        </div>
                        {idx.sparkline && (
                            <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                                <Sparkline data={idx.sparkline} up={idx.up} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Fading Edges */}
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10" />
        </div>
    );
}
