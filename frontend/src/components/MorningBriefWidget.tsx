"use client";

import { useState, useEffect } from "react";
import { 
    Coffee, ChevronRight, Newspaper, Activity, Sparkles, Loader2, 
    AlertCircle, CalendarDays, Clock, ChevronDown, ChevronUp, Bot
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface BriefingSection {
    emoji: string;
    title: string;
    content: string;
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

export default function MorningBriefWidget() {
    const { user, isLoading: authLoading } = useAuth();
    const [timeline, setTimeline] = useState<MorningBriefData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [livePrices, setLivePrices] = useState<Record<string, { price: string, change: string, up: boolean }>>({});
    const [isSimpleMode, setIsSimpleMode] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    const fetchTimeline = async (force: boolean = false) => {
        if (!user) return;
        setLoading(true);
        try {
            // 히스토리 타임라인 가져오기
            const url = new URL(`${API_BASE_URL}/api/ai/briefing-timeline`);
            const res = await fetch(url.toString(), {
                headers: { "X-User-ID": user.id }
            });
            const json = await res.json();
            
            if (json.status === "success" && json.data) {
                setTimeline(json.data);
                // 최신 항목(인덱스 0)은 기본적으로 펼쳐둠
                if (json.data.length > 0) {
                    setExpandedIds({ [json.data[0].generated_at]: true });
                }
            } else {
                setError(json.message || "브리핑을 불러올 수 없습니다.");
            }
        } catch (err) {
            setError("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const generateNow = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/morning-brief?force=true`, {
                headers: { "X-User-ID": user.id }
            });
            const json = await res.json();
            if (json.status === "success") {
                await fetchTimeline(); // 재생성 후 목록 다시 불러오기
            }
        } catch (err) {
            setError("생성 중 오류가 발생했습니다.");
            setLoading(false);
        }
    };

    const fetchLivePrices = async (brief: MorningBriefData) => {
        if (!brief || !brief.watchlist_briefs || !brief.watchlist_briefs.length) return;
        const symbols = brief.watchlist_briefs.map(b => b.symbol).join(",");
        try {
            const res = await fetch(`${API_BASE_URL}/api/stock/quotes/multi?symbols=${symbols}`);
            const json = await res.json();
            if (json.status === "success") {
                setLivePrices(prev => ({ ...prev, ...json.data }));
            }
        } catch (err) {
            console.error("Failed to fetch live prices", err);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            fetchTimeline();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (timeline.length > 0) {
            // 최신 브리핑의 시세만 먼저 가져옴
            fetchLivePrices(timeline[0]);
        }
    }, [timeline]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (authLoading || loading) {
        return (
            <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] animate-pulse">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-medium">시간대별 시장 타임라인을 구성하고 있습니다...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="w-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center">
                <Sparkles className="w-10 h-10 text-yellow-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">AI 마켓 타임라인 서비스</h3>
                <p className="text-gray-400 mb-6 max-w-md text-sm">로그인하시면 자정부터 장 마감까지 매시간 업데이트되는 전문 브리핑 리포트를 감상하실 수 있습니다.</p>
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
                    className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-xl shadow-white/5 active:scale-95 transition-transform"
                >
                    로그인하고 시작하기
                </button>
            </div>
        );
    }

    return (
        <div className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Header Area */}
            <div className="relative p-7 md:p-10 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-500/20 rounded-3xl">
                        <Sparkles className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black tracking-widest uppercase flex items-center gap-1.5">
                                <Activity className="w-2.5 h-2.5" /> LIVE TIMELINE
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">AI 마켓 브리핑 타임라인</h2>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                    <button onClick={() => setIsSimpleMode(false)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${!isSimpleMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>전문가 모드</button>
                    <button onClick={() => setIsSimpleMode(true)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${isSimpleMode ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>초보자 모드</button>
                </div>
            </div>

            <div className="p-7 md:p-10 relative">
                {/* Vertical Timeline Line */}
                <div className="absolute left-10 md:left-14 top-10 bottom-10 w-[2px] bg-gradient-to-b from-blue-500/50 via-purple-500/20 to-transparent"></div>

                <div className="space-y-12">
                    {timeline.length > 0 ? (
                        timeline.map((brief, idx) => {
                            const date = new Date(brief.generated_at);
                            const timeLabel = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} 생성`;
                            const isExpanded = expandedIds[brief.generated_at];
                            const bullets = (isSimpleMode && brief.simple_summary_bullets ? brief.simple_summary_bullets : brief.summary_bullets) || [];
                            const sections = (isSimpleMode && brief.simple_sections ? brief.simple_sections : brief.sections) || [];

                            return (
                                <div key={idx} className="relative pl-14 md:pl-20 group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-[0.55rem] md:left-[1.55rem] top-1 w-5 h-5 rounded-full border-4 border-black transition-all duration-500 ${idx === 0 ? 'bg-blue-500 scale-125 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gray-700 group-hover:bg-blue-400'}`}></div>

                                    <div className="space-y-4">
                                        {/* Time & Label */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-gray-500 group-hover:text-blue-400 transition-colors">{timeLabel}</span>
                                            {brief.user_id === 'SYSTEM' && (
                                                <span className="text-[9px] bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded border border-white/5 font-black uppercase tracking-tighter">Market Wide</span>
                                            )}
                                            {idx === 0 && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-black uppercase tracking-tighter animate-pulse">Latest</span>}
                                        </div>

                                        {/* Briefing Card */}
                                        <div className={`bg-white/[0.03] border border-white/5 rounded-3xl p-6 md:p-8 transition-all duration-500 ${isExpanded ? 'ring-1 ring-blue-500/30' : 'hover:bg-white/[0.05] cursor-pointer'}`} onClick={() => !isExpanded && toggleExpand(brief.generated_at)}>
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <h3 className={`text-xl md:text-2xl font-black text-white leading-tight ${!isExpanded ? 'line-clamp-1' : ''}`}>
                                                    {brief.market_title}
                                                </h3>
                                                <button onClick={(e) => { e.stopPropagation(); toggleExpand(brief.generated_at); }} className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0">
                                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}
                                                </button>
                                            </div>

                                            {/* Bullets (Always visible when expanded or first item) */}
                                            {isExpanded && (
                                                <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
                                                    <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-3">
                                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Clock className="w-3 h-3"/> 핵심 요약</div>
                                                        {bullets.map((b, i) => (
                                                            <div key={i} className="flex items-start gap-3">
                                                                <div className="w-1 h-1 rounded-full bg-blue-500 mt-2"></div>
                                                                <p className="text-gray-300 text-base font-bold leading-relaxed">{b}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Sections (Only in latest or significantly expanded) */}
                                                    <div className="grid md:grid-cols-2 gap-10">
                                                        <div className="space-y-8">
                                                            {sections.map((sec, i) => (
                                                                <div key={i} className="space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xl">{sec.emoji}</span>
                                                                        <h4 className="font-black text-white tracking-tight">{sec.title}</h4>
                                                                    </div>
                                                                    <div className="pl-9">
                                                                        <p className="text-gray-400 text-sm leading-relaxed">{sec.content}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Watchlist / Market Focus */}
                                                        <div className="space-y-8">
                                                            {brief.watchlist_briefs && brief.watchlist_briefs.length > 0 && (
                                                                <div className="space-y-4">
                                                                    <div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2"><Newspaper className="w-3.5 h-3.5"/> 주시 종목</div>
                                                                    <div className="space-y-3">
                                                                        {brief.watchlist_briefs.map((item, i) => {
                                                                            const live = livePrices[item.symbol];
                                                                            return (
                                                                                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all">
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <span className="font-bold text-white text-sm">{item.name} <span className="text-[10px] text-gray-500 font-mono">{item.symbol}</span></span>
                                                                                        {live && <span className={`text-[11px] font-black ${live.up ? 'text-red-400' : 'text-blue-400'}`}>{live.price} ({live.change})</span>}
                                                                                    </div>
                                                                                    <p className="text-xs text-gray-400 line-clamp-2">{isSimpleMode && item.simple_insight ? item.simple_insight : item.insight}</p>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="pt-6 border-t border-white/5">
                                                                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5"/> TODAY'S CHECKPOINT</div>
                                                                <p className="text-xs text-gray-500 italic leading-relaxed">{brief.market_focus}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 pl-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                            <Clock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-500">타임라인 데이터가 없습니다.</h3>
                            <p className="text-gray-600 text-sm mt-2 mb-6">자정부터 매시간 자동으로 리포트가 생성됩니다.</p>
                            <button onClick={generateNow} className="px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:scale-105 transition-transform">지금 바로 생성하기</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-black/60 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-[10px] font-black text-gray-500 tracking-widest uppercase">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> System Optimized</span>
                    <span className="hidden md:inline-block">/</span>
                    <span className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-blue-400"/> Premium Intelligence active</span>
                </div>
                <div className="flex items-center gap-4">
                     <button onClick={generateNow} className="px-5 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 font-black rounded-xl transition-all uppercase tracking-widest text-[10px]">Manual Refresh</button>
                </div>
            </div>
        </div>
    );
}
