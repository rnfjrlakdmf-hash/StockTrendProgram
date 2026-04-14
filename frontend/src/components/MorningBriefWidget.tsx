"use client";

import { useState, useEffect } from "react";
import { 
    Coffee, ChevronRight, Newspaper, Activity, Sparkles, Loader2, 
    AlertCircle, CalendarDays, Clock, ChevronDown, ChevronUp, Bot,
    UserCircle2, Globe, TrendingUp, Zap
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

    const fetchTimeline = async () => {
        if (!user) return;
        setLoading(true);
        try {
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
                await fetchTimeline();
            }
        } catch (err) {
            setError("생성 중 오류가 발생했습니다.");
            setLoading(false);
        }
    };

    const fetchLivePrices = async (briefs: MorningBriefData[]) => {
        const symbolsSet = new Set<string>();
        briefs.forEach(b => {
            b.watchlist_briefs?.forEach(item => symbolsSet.add(item.symbol));
        });
        
        if (symbolsSet.size === 0) return;
        
        const symbols = Array.from(symbolsSet).join(",");
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
            fetchLivePrices(timeline);
        }
    }, [timeline]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // 개인화 브리핑 추출 (SYSTEM이 아닌 가장 최신 기록)
    const latestPersonal = timeline.find(b => b.user_id !== 'SYSTEM');

    if (authLoading || loading) {
        return (
            <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] animate-pulse">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-medium">개인 맞춤형 분석 리포트를 구성하는 중...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="w-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center">
                <Sparkles className="w-10 h-10 text-yellow-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">프리미엄 AI 마켓 분석</h3>
                <p className="text-gray-400 mb-6 max-w-md text-sm">로그인하시면 자정부터 장 마감까지 매시간 업데이트되는 전문 브리핑과 사용자님만의 관심종목 리포트를 받아보실 수 있습니다.</p>
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
                    className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 shadow-xl shadow-white/5 active:scale-95 transition-transform"
                >
                    로그인하고 시작하기
                </button>
            </div>
        );
    }

    return (
        <div className="w-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden flex flex-col">
                
                {/* Header Area */}
                <div className="relative p-7 md:p-10 bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-transparent border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-blue-500/30 rounded-3xl">
                            <Bot className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] bg-blue-400/20 text-blue-400 px-3 py-1 rounded-full font-black tracking-widest uppercase flex items-center gap-1.5">
                                    <Sparkles className="w-2.5 h-2.5" /> AI INVEST NAVIGATOR
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">AI 통합 마켓 인텔리전스</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                        <button onClick={() => setIsSimpleMode(false)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${!isSimpleMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>전문가 모드</button>
                        <button onClick={() => setIsSimpleMode(true)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${isSimpleMode ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>초보자 모드</button>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-white/10 min-h-[600px]">
                    
                    {/* LEFT COLUMN: PERSONAL FEATURED SECTION */}
                    <div className="w-full xl:w-[65%] p-7 md:p-10 space-y-10 bg-gradient-to-br from-white/[0.02] to-transparent">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/10 rounded-lg">
                                    <UserCircle2 className="w-5 h-5 text-yellow-500" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">나의 관심종목 맞춤 인사이트</h3>
                            </div>
                            <button onClick={generateNow} className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl text-[10px] font-black tracking-widest border border-blue-500/20 transition-all uppercase">리서치 새로고침</button>
                        </div>

                        {latestPersonal ? (
                            <div className="space-y-10 animate-in fade-in slide-in-from-left duration-700">
                                {/* Featured Personal Card */}
                                <div className="bg-gradient-to-br from-blue-600/10 via-white/[0.03] to-transparent border border-blue-500/20 rounded-[3rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                                        <TrendingUp className="w-64 h-64 text-blue-400" />
                                    </div>
                                    
                                    <div className="relative">
                                        <h4 className="text-2xl md:text-3xl font-black text-white leading-tight mb-10 max-w-2xl">
                                            {latestPersonal.market_title}
                                        </h4>

                                        {/* Summary Bullets */}
                                        <div className="bg-black/30 backdrop-blur-xl rounded-[2rem] p-8 border border-white/5 space-y-5 mb-12">
                                            {(isSimpleMode && latestPersonal.simple_summary_bullets ? latestPersonal.simple_summary_bullets : latestPersonal.summary_bullets).map((b, i) => (
                                                <div key={i} className="flex items-start gap-4">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                                    <p className="text-gray-200 font-bold text-lg md:text-xl leading-relaxed">{b}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Watchlist Insight Grid */}
                                        {latestPersonal.watchlist_briefs && latestPersonal.watchlist_briefs.length > 0 ? (
                                            <div className="grid sm:grid-cols-2 gap-5">
                                                {latestPersonal.watchlist_briefs.map((item, i) => {
                                                    const live = livePrices[item.symbol];
                                                    return (
                                                        <div key={i} className="group p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-blue-500/30 transition-all hover:bg-white/[0.05]">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-white text-lg tracking-tight group-hover:text-blue-200 transition-colors">{item.name}</span>
                                                                    <span className="text-[10px] text-gray-600 font-mono font-bold">{item.symbol}</span>
                                                                </div>
                                                                {live && (
                                                                    <div className="text-right">
                                                                        <div className="text-sm font-black text-white">{live.price}</div>
                                                                        <div className={`text-[11px] font-black ${live.up ? 'text-red-400' : 'text-blue-400'}`}>{live.change}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 font-medium">
                                                                {isSimpleMode && item.simple_insight ? item.simple_insight : item.insight}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-10 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center">
                                                <p className="text-gray-500 text-sm">관심종목을 추가하시면 이곳에서 전용 분석을 받으실 수 있습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Shared Context Sections */}
                                <div className="grid md:grid-cols-2 gap-10">
                                    {(isSimpleMode && latestPersonal.simple_sections ? latestPersonal.simple_sections : latestPersonal.sections).map((sec, i) => (
                                        <div key={i} className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl drop-shadow-lg">{sec.emoji}</div>
                                                <h5 className="font-black text-white text-base tracking-tight">{sec.title}</h5>
                                            </div>
                                            <p className="text-gray-400 text-sm leading-relaxed font-medium pl-10 border-l border-white/10">{sec.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                                <Zap className="w-12 h-12 text-gray-700 mb-4 animate-pulse" />
                                <h4 className="text-xl font-bold text-gray-500">오늘 생성된 맞춤 브리핑이 없습니다.</h4>
                                <p className="text-gray-600 text-sm mt-2 mb-10 max-w-sm text-center">관심종목의 수급, 차트, 소식을 집대성한 회원님만의 AI 리포트를 지금 바로 생성해보세요.</p>
                                <button onClick={generateNow} className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-2xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all">AI 전용 브리핑 생성</button>
                            </div>
                        )}
                        
                        {/* Legal */}
                        {latestPersonal && (
                            <div className="pt-8 border-t border-white/5 opacity-50 flex items-start gap-4">
                                <AlertCircle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-gray-600 leading-relaxed italic">{latestPersonal.disclaimer}</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: REFINED MARKET TIMELINE */}
                    <div className="w-full xl:w-[35%] bg-black/30 p-7 md:p-10 flex flex-col gap-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-gray-500" />
                                <h3 className="text-lg font-black text-gray-400 uppercase tracking-tighter">오늘의 시장 실시간 로그</h3>
                            </div>
                        </div>

                        <div className="relative space-y-12 pl-6 md:pl-10">
                            {/* Vertical Path */}
                            <div className="absolute left-1 md:left-2 top-3 bottom-0 w-[2px] bg-gradient-to-b from-blue-500/40 via-purple-500/20 to-transparent"></div>

                            {timeline.length > 0 ? (
                                timeline.map((brief, idx) => {
                                    const date = new Date(brief.generated_at);
                                    const timeLabel = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                                    const isExpanded = expandedIds[brief.generated_at];
                                    const isSystem = brief.user_id === 'SYSTEM';

                                    return (
                                        <div key={idx} className="relative group animate-in fade-in slide-in-from-right duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                            {/* dot */}
                                            <div className={`absolute -left-[1.45rem] md:-left-[1.7rem] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-black z-10 transition-all ${idx === 0 ? 'bg-blue-400 scale-125 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'bg-gray-700 group-hover:bg-gray-500'}`}></div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-black tracking-widest ${idx === 0 ? 'text-blue-400' : 'text-gray-500'}`}>{timeLabel} 생성</span>
                                                        <span className={`text-[9px] px-2 py-0.5 rounded border border-white/5 font-black uppercase tracking-tighter ${isSystem ? 'bg-gray-500/10 text-gray-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                                            {isSystem ? 'Global Market' : 'My Analysis'}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => toggleExpand(brief.generated_at)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-500">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                                    </button>
                                                </div>

                                                <div 
                                                    className={`p-5 rounded-[1.5rem] border transition-all duration-300 ${isExpanded ? 'bg-white/5 border-white/10 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] cursor-pointer'}`}
                                                    onClick={() => !isExpanded && toggleExpand(brief.generated_at)}
                                                >
                                                    <h5 className={`text-sm md:text-base font-bold text-gray-200 leading-snug tracking-tight ${!isExpanded ? 'line-clamp-2' : ''}`}>{brief.market_title}</h5>
                                                    
                                                    {isExpanded && (
                                                        <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                                                            <div className="h-[1px] bg-white/5"></div>
                                                            {(isSimpleMode && brief.simple_summary_bullets ? brief.simple_summary_bullets : brief.summary_bullets).slice(0, 3).map((b, i) => (
                                                                <div key={i} className="flex items-start gap-3">
                                                                    <div className="w-1 h-1 rounded-full bg-blue-500/60 mt-2 shrink-0"></div>
                                                                    <p className="text-[12px] text-gray-400 leading-relaxed font-medium">{b}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-20 opacity-30">
                                    <Clock className="w-10 h-10 mx-auto mb-4" />
                                    <p className="text-xs font-bold font-mono">WAITING FOR MARKET LOGS...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="px-10 py-5 bg-black/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">AI CORE ONLINE</span>
                        </div>
                        <div className="hidden md:flex items-center gap-2.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Premium Intelligence Ver. 4.6.2</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
