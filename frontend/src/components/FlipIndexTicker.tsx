'use client';

import { useState, useEffect, useRef } from 'react';
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
    const width = 38;
    const height = 14;
    
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
                strokeWidth="1.75" 
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
    const containerRef = useRef<HTMLDivElement>(null);
    const lastDataHashRef = useRef<string>("");

    const fetchIndices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/indices`, { cache: "no-store" });
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                const targetItems: MarketIndex[] = [];

                for (const item of json.data) {
                    const name = item.event_kr || "";
                    let label = "";
                    let icon = "📊";

                    if (name === "S&P 500" || name === "S&P") {
                        label = "S&P 500";
                        icon = "🇺🇸";
                    } else if (name === "DOW JONES" || name.includes("다우")) {
                        label = "Dow Jones";
                        icon = "🇺🇸";
                    } else if (name === "NASDAQ 100") {
                        label = "NASDAQ 100";
                        icon = "🇺🇸";
                    } else if (name.includes("국채") && (name.includes("10년") || name.includes("10년물"))) {
                        label = "미 10년물 국채";
                        icon = "📈";
                    } else if (name.includes("USD") && name.includes("환율")) {
                        label = "USD/KRW 환율";
                        icon = "💵";
                    } else if (name === "WTI" || name.includes("원유")) {
                        label = "WTI 원유";
                        icon = "🛢️";
                    } else if (name.includes("국제 금") || (name.includes("금") && name.includes("Gold"))) {
                        label = "국제 금 (Gold)";
                        icon = "🥇";
                    } else if (name.includes("비트코인") || name.includes("BTC") || name === "Unknown") {
                        label = "비트코인 (BTC)";
                        icon = "🪙";
                    } else if (name.includes("KOSPI")) {
                        label = "KOSPI";
                        icon = "🇰🇷";
                    } else if (name.includes("KOSDAQ")) {
                        label = "KOSDAQ";
                        icon = "🇰🇷";
                    }

                    if (label && !targetItems.some(x => x.label === label)) {
                        let rawChange = String(item.change || "0.00%").trim();
                        if (!rawChange.endsWith("%")) {
                            rawChange = `${rawChange}%`;
                        }
                        const numVal = parseFloat(rawChange.replace("%", ""));
                        if (!rawChange.startsWith("+") && !rawChange.startsWith("-") && numVal > 0) {
                            rawChange = `+${rawChange}`;
                        }

                        let rawValue = String(item.actual || "---").trim();
                        // Format large numbers like BTC (e.g. 107710000 -> 107,710,000원)
                        if (!isNaN(Number(rawValue)) && Number(rawValue) >= 10000) {
                            rawValue = `${Number(rawValue).toLocaleString()}원`;
                        }

                        targetItems.push({
                            label,
                            icon,
                            value: rawValue,
                            change: rawChange,
                            up: item.change_val !== undefined ? item.change_val >= 0 : !rawChange.startsWith("-"),
                            sparkline: item.sparkline
                        });
                    }
                }

                if (targetItems.length > 0) {
                    const currentHash = JSON.stringify(targetItems.map(u => `${u.label}:${u.value}:${u.change}`));
                    if (currentHash !== lastDataHashRef.current) {
                        lastDataHashRef.current = currentHash;
                        setIndices(targetItems);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch market indices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndices();
        const interval = setInterval(fetchIndices, 60000); 
        return () => clearInterval(interval);
    }, []);

    // Direct DOM manipulation on touch to pause/resume without React re-render
    const handleTouchStart = () => {
        if (containerRef.current) {
            const tracks = containerRef.current.querySelectorAll<HTMLElement>('.ticker-track-stream');
            tracks.forEach(t => { t.style.animationPlayState = 'paused'; });
        }
    };

    const handleTouchEnd = () => {
        if (containerRef.current) {
            const tracks = containerRef.current.querySelectorAll<HTMLElement>('.ticker-track-stream');
            tracks.forEach(t => { t.style.animationPlayState = 'running'; });
        }
    };

    if (loading && (!Array.isArray(indices) || indices.length === 0)) {
        return (
            <div className="flex items-center gap-3 px-4 h-10 md:h-11 bg-zinc-950/70 animate-pulse">
                <div className="w-24 h-4 bg-white/10 rounded-md" />
                <div className="w-28 h-4 bg-white/10 rounded-md" />
                <div className="w-24 h-4 bg-white/10 rounded-md" />
            </div>
        );
    }

    if (!indices || indices.length === 0) return null;

    const renderItem = (idx: MarketIndex, key: string) => (
        <div 
            key={key} 
            className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/10 border border-white/5 hover:border-cyan-500/30 transition-all duration-200 cursor-default select-none"
        >
            <span className="text-xs sm:text-sm drop-shadow-sm">{idx.icon}</span>
            <span className="text-[11px] sm:text-xs md:text-sm font-black text-gray-300 tracking-tight whitespace-nowrap">
                {idx.label}
            </span>
            <span className="text-[11px] sm:text-xs md:text-sm font-black text-white font-mono tabular-nums tracking-tight whitespace-nowrap">
                {idx.value}
            </span>
            
            <span className={`text-[10px] sm:text-[11px] md:text-xs font-black font-mono px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 whitespace-nowrap shadow-sm ${
                idx.up 
                    ? 'text-rose-300 border-rose-500/30 bg-rose-500/15' 
                    : 'text-sky-300 border-sky-500/30 bg-sky-500/15'
            }`}>
                {idx.up ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400" />}
                {idx.change}
            </span>

            {idx.sparkline && idx.sparkline.length > 1 && (
                <div className="hidden md:block opacity-75 ml-0.5">
                    <Sparkline data={idx.sparkline} up={idx.up} />
                </div>
            )}
            
            <span className="text-white/20 ml-1.5 font-mono text-[10px]">|</span>
        </div>
    );

    return (
        <div 
            ref={containerRef}
            className="ticker-wrapper relative w-full overflow-hidden flex items-center h-10 md:h-11 select-none bg-[#06070d]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* 좌측 고정 LIVE 배지 */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-3 sm:pl-4 pr-2.5 sm:pr-3.5 h-full bg-[#06070d] border-r border-white/10 text-[10px] sm:text-xs font-black tracking-wider uppercase z-30 shrink-0 shadow-lg">
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                </span>
                <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent font-extrabold tracking-tight whitespace-nowrap">
                    <span className="sm:hidden">LIVE</span>
                    <span className="hidden sm:inline">LIVE RADAR</span>
                </span>
            </div>
            
            {/* 2-Track 무한 마키: Track 1과 Track 2가 각각 -100% 이동하며 모든 지수가 100% 끊김/리셋 없이 영구 순환 */}
            <div 
                className="flex items-center overflow-hidden flex-1 pl-2.5"
                style={{ 
                    maskImage: 'linear-gradient(to right, transparent 0px, black 24px, black calc(100% - 24px), transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 24px, black calc(100% - 24px), transparent 100%)'
                }}
            >
                {/* Track 1 */}
                <div className="ticker-track-stream pr-3">
                    {indices.map((idx, i) => renderItem(idx, `t1-${idx.label}-${i}`))}
                </div>

                {/* Track 2 (완벽한 쌍둥이 복제본) */}
                <div className="ticker-track-stream pr-3" aria-hidden="true">
                    {indices.map((idx, i) => renderItem(idx, `t2-${idx.label}-${i}`))}
                </div>
            </div>
        </div>
    );
}
