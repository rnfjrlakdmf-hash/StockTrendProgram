'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
    const width = 48;
    const height = 18;
    
    const points = data.map((d, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((d - min) / range) * height
    }));
    
    const path = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;
    
    return (
        <svg width={width} height={height} className="overflow-visible drop-shadow-sm">
            <path 
                d={path} 
                fill="none" 
                stroke={up ? "#fb7185" : "#38bdf8"} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="opacity-85"
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
                const coreIndices = json.data.filter((item: any) => {
                    const name = item.event_kr || "";
                    return (
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
                        name.includes("콜")
                    );
                }).map((item: any) => {
                    let icon = "📈";
                    let cleanLabel = item.event_kr.replace("[글로벌] ", "").replace("[한국] ", "").replace("🏦 ", "").replace("📋 ", "").split(" (")[0];

                    if (item.event_kr.includes("KOSPI") || item.event_kr.includes("코스피")) {
                        icon = "🇰🇷";
                        cleanLabel = "KOSPI";
                    } else if (item.event_kr.includes("KOSDAQ") || item.event_kr.includes("코스닥")) {
                        icon = "🇰🇷";
                        cleanLabel = "KOSDAQ";
                    } else if (item.event_kr.includes("S&P")) {
                        icon = "🇺🇸";
                        cleanLabel = "S&P 500";
                    } else if (item.event_kr.includes("NASDAQ") || item.event_kr.includes("나스닥")) {
                        icon = "🇺🇸";
                        cleanLabel = "NASDAQ 100";
                    } else if (item.event_kr.includes("다우")) {
                        icon = "🇺🇸";
                        cleanLabel = "Dow Jones";
                    } else if (item.event_kr.includes("비트코인") || item.event_kr.includes("BTC")) {
                        icon = "₿";
                        cleanLabel = "비트코인 (BTC)";
                    } else if (item.event_kr.includes("환율") || item.event_kr.includes("달러") || item.event_kr.includes("USD")) {
                        icon = "💵";
                        cleanLabel = "USD/KRW 환율";
                    } else if (item.event_kr.includes("금리") || item.event_kr.includes("국채") || item.event_kr.includes("10년물")) {
                        icon = "📊";
                        cleanLabel = "미 10년물 국채";
                    } else if (item.event_kr.includes("WTI") || item.event_kr.includes("유가")) {
                        icon = "🛢️";
                        cleanLabel = "WTI 원유";
                    } else if (item.event_kr.includes("금") || item.event_kr.includes("Gold")) {
                        icon = "💰";
                        cleanLabel = "국제 금 (Gold)";
                    }

                    return {
                        label: cleanLabel,
                        icon: icon,
                        value: item.actual || "---",
                        change: item.change || "0.00%",
                        up: item.change_val !== undefined ? item.change_val >= 0 : !item.change?.startsWith("-"),
                        sparkline: item.sparkline
                    };
                });
                
                // 중복 제거
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
            <div className="flex items-center gap-3 px-4 h-11 bg-zinc-950/70 animate-pulse">
                <div className="w-32 h-5 bg-white/10 rounded-lg" />
                <div className="w-32 h-5 bg-white/10 rounded-lg" />
                <div className="w-32 h-5 bg-white/10 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden flex items-center h-11 md:h-12 select-none group/ticker">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes ticker-marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker-marquee {
                    display: flex !important;
                    width: max-content !important;
                    animation: ticker-marquee 45s linear infinite !important;
                    will-change: transform;
                }
                .animate-ticker-marquee:hover {
                    animation-play-state: paused !important;
                }
            `}} />

            {/* Left Static Live Beacon Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-4 pr-3.5 h-full bg-[#06070d] border-r border-white/10 text-[11px] md:text-xs font-black tracking-wider uppercase z-20 shrink-0 shadow-lg">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                </span>
                <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent font-extrabold tracking-tight">
                    LIVE RADAR
                </span>
            </div>
            
            {/* Infinite Marquee Stream */}
            <div 
                className="animate-ticker-marquee flex items-center gap-4 pl-2" 
                style={{ display: 'flex', width: 'max-content' }}
            >
                {[...indices, ...indices].map((idx, i) => (
                    <div 
                        key={i} 
                        className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-cyan-500/30 transition-all duration-200 group/item cursor-default"
                    >
                        <span className="text-sm md:text-base drop-shadow-sm">{idx.icon}</span>
                        <span className="text-xs md:text-sm font-black text-gray-300 tracking-tight whitespace-nowrap group-hover/item:text-white transition-colors">
                            {idx.label}
                        </span>
                        <span className="text-xs md:text-sm font-black text-white font-mono tabular-nums tracking-tight whitespace-nowrap">
                            {idx.value}
                        </span>
                        
                        <span className={`text-[11px] md:text-xs font-black font-mono px-2 py-0.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shadow-sm ${
                            idx.up 
                                ? 'text-rose-300 border-rose-500/30 bg-rose-500/15 shadow-[0_0_10px_rgba(244,63,94,0.15)]' 
                                : 'text-sky-300 border-sky-500/30 bg-sky-500/15 shadow-[0_0_10px_rgba(56,189,248,0.15)]'
                        }`}>
                            {idx.up ? <TrendingUp className="w-3 h-3 text-rose-400" /> : <TrendingDown className="w-3 h-3 text-sky-400" />}
                            {idx.change}
                        </span>

                        {idx.sparkline && idx.sparkline.length > 1 && (
                            <div className="hidden lg:block opacity-75 group-hover/item:opacity-100 transition-opacity ml-1">
                                <Sparkline data={idx.sparkline} up={idx.up} />
                            </div>
                        )}
                        
                        <span className="text-white/10 ml-2 font-mono">│</span>
                    </div>
                ))}
            </div>

            {/* Fading Edge Gradient Masks */}
            <div className="absolute inset-y-0 left-0 sm:left-[115px] w-12 bg-gradient-to-r from-[#06070d] to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#06070d] to-transparent pointer-events-none z-10" />
        </div>
    );
}
