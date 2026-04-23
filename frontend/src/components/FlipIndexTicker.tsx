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
            if (json.status === 'success') {
                setIndices(Array.isArray(json.data) ? json.data : []);
            }
        } catch (err) {
            console.error("Failed to fetch market indices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndices();
        const interval = setInterval(fetchIndices, 10000); 
        return () => clearInterval(interval);
    }, []);

    if (loading && (!Array.isArray(indices) || indices.length === 0)) {
        return (
            <div className="flex items-center gap-6 px-6 h-10">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-32 h-6 bg-white/5 animate-pulse rounded-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-4xl overflow-hidden group">
            <style jsx>{`
                @keyframes ticker-h {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .ticker-content-h {
                    display: flex;
                    width: max-content;
                    animation: ticker-h 40s linear infinite;
                    will-change: transform;
                }
                .ticker-content-h:hover {
                    animation-play-state: paused;
                }
            `}</style>
            
            <div className="ticker-content-h py-2 flex items-center gap-8">
                {[...indices, ...indices].map((idx, i) => (
                    <div key={i} className="flex items-center gap-8 px-10 border-r border-white/20 last:border-none hover:bg-white/[0.06] transition-all rounded-3xl py-3 group/item">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2.5">
                                <span className="text-[20px] filter drop-shadow-md">{idx.icon}</span>
                                <span className="text-[15px] font-black text-amber-300 uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(252,211,77,0.3)]">{idx.label || "INDEX"}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-3xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{idx.value || "---"}</span>
                                <span className={`text-[17px] font-black px-3 py-1 rounded-xl border-2 flex items-center gap-1.5 shadow-lg ${idx.up ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : 'text-sky-400 border-sky-500/30 bg-sky-500/10'}`}>
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
