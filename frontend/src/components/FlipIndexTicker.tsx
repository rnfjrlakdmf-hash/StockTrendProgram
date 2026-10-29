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
    const width = 42;
    const height = 16;
    
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
    const [isPaused, setIsPaused] = useState(false);

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
                        name.includes("국채") || 
                        name.includes("WTI") || 
                        name.includes("유가") || 
                        name.includes("비트코인") ||
                        name.includes("BTC") ||
                        name.includes("금") ||
                        name.includes("Gold")
                    );
                }).map((item: any) => {
                    let icon = "📊";
                    let cleanLabel = item.event_kr.replace("[미국] ", "").replace("[한국] ", "").replace("★ ", "").replace("● ", "").split(" (")[0];

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
                        icon = "🪙";
                        cleanLabel = "비트코인 (BTC)";
                    } else if (item.event_kr.includes("환율") || item.event_kr.includes("원달러") || item.event_kr.includes("USD")) {
                        icon = "💵";
                        cleanLabel = "USD/KRW 환율";
                    } else if (item.event_kr.includes("국채") || item.event_kr.includes("10년물")) {
                        icon = "📈";
                        cleanLabel = "미 10년물 국채";
                    } else if (item.event_kr.includes("WTI") || item.event_kr.includes("원유") || item.event_kr.includes("유가")) {
                        icon = "🛢️";
                        cleanLabel = "WTI 원유";
                    } else if (item.event_kr.includes("금") || item.event_kr.includes("Gold")) {
                        icon = "🥇";
                        cleanLabel = "국제 금 (Gold)";
                    }

                    // 수치 및 등락률 정밀 포맷팅
                    let rawChange = String(item.change || "0.00%").trim();
                    if (!rawChange.endsWith("%")) {
                        rawChange = `${rawChange}%`;
                    }
                    if (!rawChange.startsWith("+") && !rawChange.startsWith("-") && parseFloat(rawChange) > 0) {
                        rawChange = `+${rawChange}`;
                    }

                    return {
                        label: cleanLabel,
                        icon: icon,
                        value: item.actual || "---",
                        change: rawChange,
                        up: item.change_val !== undefined ? item.change_val >= 0 : !rawChange.startsWith("-"),
                        sparkline: item.sparkline
                    };
                });
                
                // 중복 라벨 제거
                const uniqueIndices = coreIndices.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.label === v.label)) === i);
                if (uniqueIndices.length > 0) {
                    setIndices(uniqueIndices);
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
        const interval = setInterval(fetchIndices, 15000); 
        return () => clearInterval(interval);
    }, []);

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

    return (
        <div 
            className="relative w-full overflow-hidden flex items-center h-10 md:h-11 select-none group/ticker bg-[#06070d]"
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes ticker-marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker-marquee {
                    display: flex !important;
                    width: max-content !important;
                    animation: ticker-marquee 18s linear infinite !important;
                    will-change: transform;
                }
                @media (min-width: 768px) {
                    .animate-ticker-marquee {
                        animation: ticker-marquee 22s linear infinite !important;
                    }
                }
                .group\\/ticker:hover .animate-ticker-marquee,
                .group\\/ticker:active .animate-ticker-marquee {
                    animation-play-state: paused !important;
                }
            `}} />

            {/* 좌측 LIVE RADAR 뱃지: 모바일 컴팩트 뱃지 + PC 풀 뱃지 */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-3 sm:pl-4 pr-2.5 sm:pr-3.5 h-full bg-[#06070d] border-r border-white/10 text-[10px] sm:text-xs font-black tracking-wider uppercase z-20 shrink-0 shadow-lg">
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                </span>
                <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent font-extrabold tracking-tight whitespace-nowrap">
                    <span className="sm:hidden">LIVE</span>
                    <span className="hidden sm:inline">LIVE RADAR</span>
                </span>
            </div>
            
            {/* 부드러운 무한 롤링 티커 스트림 (38초~45초 안심 속도) */}
            <div 
                className="animate-ticker-marquee flex items-center gap-2.5 sm:gap-4 pl-3" 
                style={{ 
                    display: 'flex', 
                    width: 'max-content',
                    animationPlayState: isPaused ? 'paused' : 'running'
                }}
            >
                {[...indices, ...indices].map((idx, i) => (
                    <div 
                        key={i} 
                        className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/10 border border-white/5 hover:border-cyan-500/30 transition-all duration-200 group/item cursor-default"
                    >
                        <span className="text-xs sm:text-sm drop-shadow-sm">{idx.icon}</span>
                        <span className="text-[11px] sm:text-xs md:text-sm font-black text-gray-300 tracking-tight whitespace-nowrap group-hover/item:text-white transition-colors">
                            {idx.label}
                        </span>
                        <span className="text-[11px] sm:text-xs md:text-sm font-black text-white font-mono tabular-nums tracking-tight whitespace-nowrap">
                            {idx.value}
                        </span>
                        
                        <span className={`text-[10px] sm:text-[11px] md:text-xs font-black font-mono px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg border flex items-center gap-0.5 sm:gap-1 whitespace-nowrap shadow-sm ${
                            idx.up 
                                ? 'text-rose-300 border-rose-500/30 bg-rose-500/15 shadow-[0_0_8px_rgba(244,63,94,0.15)]' 
                                : 'text-sky-300 border-sky-500/30 bg-sky-500/15 shadow-[0_0_8px_rgba(56,189,248,0.15)]'
                        }`}>
                            {idx.up ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400" />}
                            {idx.change}
                        </span>

                        {idx.sparkline && idx.sparkline.length > 1 && (
                            <div className="hidden md:block opacity-75 group-hover/item:opacity-100 transition-opacity ml-0.5">
                                <Sparkline data={idx.sparkline} up={idx.up} />
                            </div>
                        )}
                        
                        <span className="text-white/20 ml-1.5 sm:ml-2 font-mono text-[10px]">|</span>
                    </div>
                ))}
            </div>

            {/* 좌우 페이딩 그라디언트 마스크 */}
            <div className="absolute inset-y-0 left-[62px] sm:left-[110px] w-8 sm:w-12 bg-gradient-to-r from-[#06070d] to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-[#06070d] to-transparent pointer-events-none z-10" />
        </div>
    );
}
