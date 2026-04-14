"use client";

import { useState, useEffect } from "react";
import { 
    Coffee, ChevronRight, Newspaper, Activity, Sparkles, Loader2, 
    AlertCircle, CalendarDays, Clock, ChevronDown, ChevronUp, Bot,
    UserCircle2, Globe, TrendingUp, Zap, Info
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface BriefingSection {
    emoji: string;
    title: string;
    content: string;
}

interface MarketIndex {
    label: string;
    value: string;
    change: string;
    up: boolean;
    sparkline?: number[];
}

interface MorningBriefData {
    market_title: string;
    summary_bullets: string[];
    simple_summary_bullets?: string[];
    sections: BriefingSection[];
    simple_sections?: BriefingSection[];
    watchlist_briefs: {
        symbol: string;
        name: string;
        insight: string;
        simple_insight?: string;
    }[];
    market_focus: string;
    disclaimer: string;
    generated_at: string;
    user_id?: string;
}

const Sparkline = ({ data, up }: { data: number[], up: boolean }) => {
    if (!data || data.length < 2) return <div className="w-12 h-6 bg-white/5 rounded" />;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 24;
    
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
                className="drop-shadow-[0_0_4px_rgba(248,113,113,0.3)]"
            />
        </svg>
    );
};

export default function MorningBriefWidget() {
    const { user, isLoading: authLoading } = useAuth();
    const [timeline, setTimeline] = useState<MorningBriefData[]>([]);
    const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSimpleMode, setIsSimpleMode] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. 지수 데이터 및 스파크라인 (배열 반환하는 전용 API 사용)
            const indexRes = await fetch(`${API_BASE_URL}/api/market/indices`);
            const indexJson = await indexRes.json();
            if (indexJson.status === "success" && indexJson.data) {
                setMarketIndices(indexJson.data);
            }

            // 2. 브리핑 타임라인
            const url = new URL(`${API_BASE_URL}/api/ai/briefing-timeline`);
            const res = await fetch(url.toString(), {
                headers: { "X-User-ID": user.id }
            });
            const json = await res.json();
            
            if (json.status === "success" && json.data) {
                setTimeline(json.data);
                if (json.data.length > 0) {
                    setExpandedIds({ [json.data[0].generated_at]: true });
                }
            }
        } catch (err) {
            console.error("Fetch error", err);
        } finally {
            setLoading(false);
        }
    };

    const generateNow = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/ai/morning-brief?force=true`, {
                headers: { "X-User-ID": user.id }
            });
            await fetchData();
        } catch (err) {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            fetchData();
        }
    }, [user, authLoading]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const latestPersonal = timeline.find(b => b.user_id !== 'SYSTEM');

    if (authLoading || loading) {
        return (
            <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[500px] animate-pulse">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-medium">네이버 금융 데이터 동기화 중...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="w-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden flex flex-col">
                
                {/* 1. Market Index Bar (Naver Style with Sparklines) */}
                <div className="px-10 py-6 bg-white/[0.02] border-b border-white/5 flex items-center gap-10 overflow-x-auto no-scrollbar">
                    {marketIndices.map((idx, i) => (
                        <div key={i} className="flex items-center gap-4 shrink-0 group">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{idx.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-white tabular-nums">{idx.value}</span>
                                    <span className={`text-[11px] font-bold ${idx.up ? 'text-red-400' : 'text-blue-400'}`}>{idx.change}</span>
                                </div>
                            </div>
                            {idx.sparkline && <Sparkline data={idx.sparkline} up={idx.up} />}
                        </div>
                    ))}
                    <div className="ml-auto flex items-center gap-2 text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-black border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 실시간 데이터 동기화
                    </div>
                </div>

                {/* 2. Header Area */}
                <div className="relative p-7 md:p-10 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-blue-500/20 rounded-3xl">
                            <Sparkles className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                                    NAVER STYLE AI INSIGHT
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">AI 마켓 인텔리전스 리포트</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                        <button onClick={() => setIsSimpleMode(false)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${!isSimpleMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>전문가 모드</button>
                        <button onClick={() => setIsSimpleMode(true)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${isSimpleMode ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>초보자 모드</button>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-white/10">
                    
                    {/* LEFT COLUMN: FEATURED ANALYSIS */}
                    <div className="w-full xl:w-[65%] p-7 md:p-10 space-y-10">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">나의 관심종목 실시간 분석</h3>
                            </div>
                            <button onClick={generateNow} className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all">맞춤 분석 재생성</button>
                        </div>

                        {latestPersonal ? (
                            <div className="space-y-10 animate-in fade-in slide-in-from-left duration-700">
                                {/* Naver Style Summary Box */}
                                <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
                                    <h4 className="text-2xl md:text-3xl font-black text-white leading-tight mb-8">
                                        {latestPersonal.market_title}
                                    </h4>

                                    <div className="bg-black/40 rounded-3xl p-8 border border-white/5 space-y-5 mb-10">
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">TODAY'S CORE SUMMARY</div>
                                        {(isSimpleMode && latestPersonal.simple_summary_bullets ? latestPersonal.simple_summary_bullets : latestPersonal.summary_bullets).map((b, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <span className="text-blue-500 font-black mt-1">·</span>
                                                <p className="text-gray-200 font-bold text-lg leading-relaxed">{b}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sections with Bold Headers */}
                                    <div className="grid md:grid-cols-2 gap-10">
                                        {(isSimpleMode && latestPersonal.simple_sections ? latestPersonal.simple_sections : latestPersonal.sections).map((sec, i) => (
                                            <div key={i} className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{sec.emoji}</span>
                                                    <h5 className="font-black text-white text-base tracking-tight">{sec.title}</h5>
                                                </div>
                                                <p className="text-gray-400 text-sm leading-relaxed font-medium pl-10 border-l border-white/10">{sec.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Watchlist Insight Cards */}
                                {latestPersonal.watchlist_briefs && (
                                    <div className="grid sm:grid-cols-2 gap-5">
                                        {latestPersonal.watchlist_briefs.map((item, i) => (
                                            <div key={i} className="group p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-blue-500/30 transition-all">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-black text-white text-lg tracking-tight group-hover:text-blue-200">{item.name}</span>
                                                    <TrendingUp className="w-4 h-4 text-gray-700 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                                <p className="text-sm text-gray-400 leading-relaxed font-medium">
                                                    {isSimpleMode && item.simple_insight ? item.simple_insight : item.insight}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                                <Zap className="w-12 h-12 text-gray-700 mb-4 animate-pulse" />
                                <h4 className="text-xl font-bold text-gray-500">맞춤 분석 데이터가 부족합니다.</h4>
                                <button onClick={generateNow} className="mt-8 px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20">분석 시작하기</button>
                            </div>
                        )}
                        
                        {/* Legal */}
                        {latestPersonal && (
                             <div className="pt-8 border-t border-white/5 opacity-50 flex items-start gap-4">
                                <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-gray-600 leading-relaxed italic">{latestPersonal.disclaimer}</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: MARKET LOG TIMELINE */}
                    <div className="w-full xl:w-[35%] bg-black/30 p-7 md:p-10 flex flex-col gap-10">
                        <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-gray-500" />
                            <h3 className="text-lg font-black text-gray-400 uppercase tracking-tighter">실시간 시장 히스토리</h3>
                        </div>

                        <div className="relative space-y-10 pl-6 md:pl-10">
                            <div className="absolute left-1 md:left-2 top-3 bottom-0 w-[2px] bg-gradient-to-b from-blue-500/40 via-purple-500/20 to-transparent"></div>

                            {timeline.map((brief, idx) => {
                                const date = new Date(brief.generated_at);
                                const timeLabel = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                                const isExpanded = expandedIds[brief.generated_at];
                                const isSystem = brief.user_id === 'SYSTEM';

                                return (
                                    <div key={idx} className="relative group animate-in fade-in slide-in-from-right duration-500">
                                        <div className={`absolute -left-[1.45rem] md:-left-[1.7rem] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-black z-10 ${idx === 0 ? 'bg-blue-400 scale-125' : 'bg-gray-700 group-hover:bg-gray-500'}`}></div>
                                        
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-black ${idx === 0 ? 'text-blue-400' : 'text-gray-500'}`}>{timeLabel}</span>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded border border-white/5 font-black uppercase tracking-tighter ${isSystem ? 'bg-gray-500/10 text-gray-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {isSystem ? 'Global' : 'My'}
                                                    </span>
                                                </div>
                                                <button onClick={() => toggleExpand(brief.generated_at)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-500">
                                                    {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                                </button>
                                            </div>

                                            <div 
                                                className={`p-5 rounded-[1.5rem] border transition-all ${isExpanded ? 'bg-white/5 border-white/10 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] cursor-pointer'}`}
                                                onClick={() => !isExpanded && toggleExpand(brief.generated_at)}
                                            >
                                                <h5 className={`text-sm md:text-base font-bold text-gray-200 leading-snug tracking-tight ${!isExpanded ? 'line-clamp-2' : ''}`}>{brief.market_title}</h5>
                                                
                                                {isExpanded && (
                                                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                        {(isSimpleMode && brief.simple_summary_bullets ? brief.simple_summary_bullets : brief.summary_bullets).slice(0, 3).map((b, i) => (
                                                            <div key={i} className="flex items-start gap-3">
                                                                <div className="w-1 h-1 rounded-full bg-blue-500/60 mt-2 shrink-0"></div>
                                                                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{b}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
