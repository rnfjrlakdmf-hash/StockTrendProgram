"use client";

import { useState, useEffect } from "react";
import { Coffee, ChevronRight, Newspaper, Activity, Sparkles, Loader2, AlertCircle, CalendarDays } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Typewriter from "./Typewriter";

interface MorningBriefData {
    market_title: string;
    market_summary: string;
    watchlist_briefs: {
        symbol: string;
        name: string;
        insight: string;
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

    const fetchBrief = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/morning-brief`, {
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

    useEffect(() => {
        if (!authLoading && user) {
            fetchBrief();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

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
                <Link href="/discovery" className="inline-block mt-4 text-blue-400 font-bold text-sm">관심종목 추가하러 가기 <ChevronRight className="inline w-4 h-4" /></Link>
            </div>
        );
    }

    return (
        <div className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Header Area */}
            <div className="relative p-6 md:p-8 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent border-b border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/20 rounded-2xl">
                            <Coffee className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-black tracking-widest uppercase">MARKET DATA CURATION</span>
                                <span className="text-[10px] bg-white/5 text-gray-500 px-2 py-0.5 rounded-full font-medium">{new Date(brief.generated_at).toLocaleDateString()}</span>
                            </div>
                            <h2 className="text-2xl font-black text-white leading-tight">
                                {brief.market_title}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 grid lg:grid-cols-2 gap-8 md:gap-12">
                {/* Left: Market Summary */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 text-sm font-bold">
                            <Activity className="w-4 h-4" /> 주요 시장 지표 요약
                        </div>
                        <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5">
                            <p className="text-gray-300 leading-relaxed font-medium">
                                <Typewriter text={brief.market_summary} speed={40} />
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-purple-400 text-sm font-bold">
                            <CalendarDays className="w-4 h-4" /> 오늘의 주요 데이터 포인트
                        </div>
                        <div className="p-5 rounded-3xl bg-purple-500/5 border border-purple-500/10 shadow-inner">
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {brief.market_focus}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Watchlist Insights */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold">
                            <Newspaper className="w-4 h-4" /> 관심종목 정보 요약 ({brief.watchlist_briefs.length})
                        </div>
                        <Link href="/watchlist" className="text-xs text-gray-500 hover:text-white transition-colors">모두 보기</Link>
                    </div>

                    <div className="space-y-3">
                        {brief.watchlist_briefs.map((item, idx) => (
                            <div key={idx} className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/[0.07] transition-all cursor-pointer">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500/40 group-hover:bg-blue-400 transition-colors"></div>
                                        <span className="font-black text-white">{item.name}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{item.symbol}</span>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-gray-500/10 text-gray-500 group-hover:text-blue-400 transition-colors">
                                        <Newspaper className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 leading-snug line-clamp-2">
                                    {item.insight}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer: Disclaimer */}
            <div className="px-8 py-5 bg-black/60 flex flex-col gap-3 border-t border-white/5">
                <p className="text-[10px] text-gray-500 leading-normal italic font-medium">
                    {brief.disclaimer}
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[9px] text-gray-600 font-black tracking-tighter">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500/40"></div> DATA SOURCE: REAL-TIME INDICES & PUBLIC NEWS</span>
                    </div>
                    <button onClick={fetchBrief} className="text-[9px] text-blue-500/50 hover:text-blue-400 font-black uppercase tracking-widest transition-colors">REFRESH DATA</button>
                </div>
            </div>
        </div>
    );
}
