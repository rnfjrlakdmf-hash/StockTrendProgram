"use client";

import { useState, useEffect } from "react";
import { Coffee, ChevronRight, Newspaper, Activity, Sparkles, Loader2, AlertCircle, CalendarDays } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Typewriter from "./Typewriter";

interface MorningBriefData {
    market_title: string;
    summary_bullets: string[];
    simple_summary_bullets?: string[];
    sections: {
        emoji: string;
        title: string;
        content: string;
    }[];
    simple_sections?: {
        emoji: string;
        title: string;
        content: string;
    }[];
    watchlist_briefs: {
        symbol: string;
        name: string;
        insight: string;
        simple_insight?: string;
    }[];
    market_focus: string;
    disclaimer: string;
    generated_at: string;
}

export default function MorningBriefWidget() {
    const { user, isLoading: authLoading } = useAuth();
    const [brief, setBrief] = useState<MorningBriefData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [livePrices, setLivePrices] = useState<Record<string, { price: string, change: string, up: boolean }>>({});
    const [isSimpleMode, setIsSimpleMode] = useState(false);

    const fetchBrief = async (force: boolean = false) => {
        if (!user) return;
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/api/ai/morning-brief`);
            if (force) url.searchParams.append("force", "true");
            
            const res = await fetch(url.toString(), {
                headers: { "X-User-ID": user.id }
            });
            const json = await res.json();
            if (json.status === "success" && json.data) {
                setBrief(json.data);
            } else {
                setError(json.message || "브리핑을 불러올 수 없습니다.");
            }
        } catch (err) {
            setError("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const fetchLivePrices = async () => {
        if (!brief || !brief.watchlist_briefs.length) return;
        const symbols = brief.watchlist_briefs.map(b => b.symbol).join(",");
        try {
            const res = await fetch(`${API_BASE_URL}/api/stock/quotes/multi?symbols=${symbols}`);
            const json = await res.json();
            if (json.status === "success") {
                setLivePrices(json.data);
            }
        } catch (err) {
            console.error("Failed to fetch live prices", err);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            fetchBrief();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    // 실시간 시세 폴링 (1분마다)
    useEffect(() => {
        if (brief && brief.watchlist_briefs.length > 0) {
            fetchLivePrices(); // Initial fetch
            const interval = setInterval(fetchLivePrices, 60000);
            return () => clearInterval(interval);
        }
    }, [brief]);

    if (authLoading || loading) {
        return (
            <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px] animate-pulse">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-medium">오늘의 시장 데이터를 정리하고 있습니다...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="w-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center">
                <Sparkles className="w-10 h-10 text-yellow-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">마켓 브리핑 서비스 안내</h3>
                <p className="text-gray-400 mb-6 max-w-md text-sm">로그인하시면 관심종목과 연관된 주요 뉴스 및 시장 데이터를 매일 아침 요약하여 확인하실 수 있습니다.</p>
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
                    className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-xl shadow-white/5 active:scale-95 transition-transform"
                >
                    로그인하고 시작하기
                </button>
            </div>
        );
    }

    if (error || !brief) {
        return (
            <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
                <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">{error || "아직 생성된 브리핑이 없습니다. 관심종목을 먼저 추가해보세요!"}</p>
                <button onClick={() => fetchBrief(true)} className="mt-4 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold">다시 시도</button>
            </div>
        );
    }

    const currentBullets = isSimpleMode && brief.simple_summary_bullets ? brief.simple_summary_bullets : brief.summary_bullets;
    const currentSections = isSimpleMode && brief.simple_sections ? brief.simple_sections : brief.sections;

    return (
        <div className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Header Area */}
            <div className="relative p-7 md:p-10 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent border-b border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-blue-500/20 rounded-3xl relative">
                            <Bot className="w-7 h-7 text-blue-400" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-black animate-pulse"></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black tracking-widest uppercase flex items-center gap-1.5">
                                    <Sparkles className="w-2.5 h-2.5" /> AI INTELLIGENCE
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold">
                                    {new Date(brief.generated_at).getMonth() + 1}. {new Date(brief.generated_at).getDate()}. {new Date(brief.generated_at).getHours()}:{String(new Date(brief.generated_at).getMinutes()).padStart(2, '0')} 기준 요약
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">
                                {brief.market_title}
                            </h2>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                        <button 
                            onClick={() => setIsSimpleMode(false)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${!isSimpleMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            전문가 모드
                        </button>
                        <button 
                            onClick={() => setIsSimpleMode(true)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${isSimpleMode ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            초보자 모드
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-7 md:p-10 space-y-12">
                {/* 1. Summary Box: Naver Style */}
                <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/20"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <span className="px-3 py-1 bg-gray-500/20 text-gray-300 text-[11px] font-black rounded-lg uppercase tracking-wider">요약</span>
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                    </div>
                    <ul className="space-y-4">
                        {currentBullets.map((bullet, idx) => (
                            <li key={idx} className="flex items-start gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                                <p className="text-gray-200 leading-relaxed font-bold text-lg">
                                    {bullet}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 2. Segmented Sections */}
                <div className="grid lg:grid-cols-2 gap-12">
                    <div className="space-y-10">
                        {currentSections.map((section, idx) => (
                            <div key={idx} className="space-y-4 animate-in fade-in slide-in-from-left duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{section.emoji}</span>
                                    <h3 className="text-xl font-black text-white tracking-tight">{section.title}</h3>
                                </div>
                                <div className="pl-10">
                                    <p className="text-gray-400 leading-relaxed font-medium text-base">
                                        <Typewriter key={`${isSimpleMode}-${idx}`} text={section.content} speed={30} />
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {/* Market Focus (Small Footer in Left Column) */}
                        <div className="pt-6 border-t border-white/5 opacity-60">
                            <div className="flex items-center gap-2 text-[11px] font-black text-purple-400 uppercase tracking-widest mb-2">
                                <CalendarDays className="w-3.5 h-3.5" /> TODAY'S CHECKPOINT
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed italic">{brief.market_focus}</p>
                        </div>
                    </div>

                    {/* 3. Watchlist Insights (Right Column) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-yellow-500 text-sm font-black uppercase tracking-widest">
                                <Newspaper className="w-4 h-4" /> WATCHLIST INSIGHTS
                            </div>
                            <Link href="/watchlist" className="text-[11px] font-black text-gray-500 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-tighter">View All <ChevronRight className="w-3 h-3"/></Link>
                        </div>

                        <div className="space-y-4">
                            {brief.watchlist_briefs.length > 0 ? (
                                brief.watchlist_briefs.map((item, idx) => {
                                    const live = livePrices[item.symbol];
                                    return (
                                        <div key={idx} className="group p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/[0.03] transition-all cursor-pointer">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500/40 group-hover:bg-blue-400 transition-colors"></div>
                                                    <span className="font-black text-white text-lg group-hover:text-blue-200 transition-colors tracking-tight">{item.name}</span>
                                                    <span className="text-xs text-gray-600 font-mono tracking-tighter">{item.symbol}</span>
                                                </div>
                                                {live && (
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-white">{live.price}</div>
                                                        <div className={`text-xs font-bold ${live.up ? 'text-red-400' : 'text-blue-400'}`}>
                                                            {live.change}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-sm leading-relaxed transition-colors ${isSimpleMode ? 'text-emerald-400/80 group-hover:text-emerald-300' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                                {isSimpleMode && item.simple_insight ? item.simple_insight : item.insight}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-12 border border-dashed border-white/10 rounded-[2.5rem] text-center bg-white/[0.01]">
                                    <p className="text-gray-500 text-xs mb-4">주시 종목이 없습니다.<br/>관심 있는 종목을 추가하여 맞춤 분석을 받아보세요.</p>
                                    <Link href="/watchlist" className="inline-block px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black rounded-xl transition-colors uppercase tracking-widest">Add Symbols</Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

                {/* Right: Watchlist Insights */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold">
                            <Newspaper className="w-4 h-4" /> 주시 종목 심층 분석 ({brief.watchlist_briefs.length})
                        </div>
                        <Link href="/watchlist" className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">모두 보기 <ChevronRight className="w-3 h-3"/></Link>
                    </div>

                    <div className="space-y-3">
                        {brief.watchlist_briefs.length > 0 ? (
                            brief.watchlist_briefs.map((item, idx) => {
                                const live = livePrices[item.symbol];
                                return (
                                    <div key={idx} className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500/40 group-hover:bg-blue-400 transition-colors"></div>
                                                <span className="font-bold text-white group-hover:text-blue-200 transition-colors">{item.name}</span>
                                                <span className="text-[10px] text-gray-500 font-mono tracking-tighter">{item.symbol}</span>
                                            </div>
                                            {live && (
                                                <div className="text-right">
                                                    <div className="text-[11px] font-black text-white">{live.price}</div>
                                                    <div className={`text-[10px] font-bold ${live.up ? 'text-red-400' : 'text-blue-400'}`}>
                                                        {live.change}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p className={`text-sm leading-snug transition-colors ${isSimpleMode ? 'text-emerald-400/80 group-hover:text-emerald-300' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                            {isSimpleMode && item.simple_insight ? item.simple_insight : item.insight}
                                        </p>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 border border-dashed border-white/10 rounded-3xl text-center">
                                <p className="text-gray-500 text-xs mb-4">아직 주시 종목이 없습니다.<br/>관심 있는 종목을 추가하여 맞춤 분석을 받아보세요.</p>
                                <Link href="/watchlist" className="inline-block px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg transition-colors">종목 추가하기</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer: Detailed Legal Disclaimer for Regulatory Compliance */}
            <div className="px-8 py-6 bg-black/80 border-t border-white/5 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-red-500 uppercase tracking-wider">Investment Disclaimer & Compliance Notice</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            본 서비스는 유료 또는 무료로 제공되는 인공지능 기반 데이터 분석 보조 도구로, 최종적인 투자 결정에 대한 조언을 제공하지 않습니다. 
                            AI가 생성한 모든 브리핑과 종목 분석은 공개된 시장 데이터를 바탕으로 도출된 참고용 정보일 뿐이며, 특정 종목의 매수·매도 가격이나 
                            거래 시점을 권유하는 유사투자자문 행위에 해당하지 않습니다. 과거의 성과가 미래의 수익을 보장하지 않으며, 모든 투자에 따른 
                            손실 책임은 투자자 본인에게 귀속됩니다.
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4 text-[9px] text-gray-500 font-black tracking-tighter">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> ENGINE STATUS: OPTIMIZED</span>
                        <span className="flex items-center gap-1.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/20">
                            <Sparkles className="w-2 h-2" /> PREMIUM INTELLIGENCE
                        </span>
                    </div>
                    <button onClick={() => fetchBrief(true)} className="text-[10px] text-blue-500/70 hover:text-blue-400 font-black uppercase tracking-widest transition-all hover:tracking-[0.2em]">REFRESH DATA</button>
                </div>
            </div>
        </div>
    );
}
