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
    simple_summary?: string;
    watchlist_briefs: {
        symbol: string;
        name: string;
        insight: string;
        simple_insight?: string;
    }[];
    market_focus: string;
    simple_focus?: string;
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
                
                <div className="flex flex-col items-center gap-3 mt-6">
                    <Link href="/discovery" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform flex items-center gap-2">
                        관심종목 추가하러 가기 <ChevronRight className="w-4 h-4" />
                    </Link>
                    
                    <button 
                        onClick={() => {
                            const storedUser = localStorage.getItem("stock_user");
                            if (storedUser) {
                                const parsed = JSON.parse(storedUser);
                                fetch(`${API_BASE_URL}/api/watchlist/migrate`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ guest_id: "guest", target_id: parsed.id })
                                }).then(() => {
                                    alert("이전 관심종목을 모두 가져왔습니다! 페이지를 새로고침합니다.");
                                    window.location.reload();
                                });
                            } else {
                                alert("로그인 또는 '고정 계정 활성화'를 먼저 해주세요.");
                            }
                        }}
                        className="text-xs text-gray-500 hover:text-white underline underline-offset-4 transition-colors"
                    >
                        이미 추가했는데 안 보이시나요? (데이터 가져오기)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Header Area */}
            <div className="relative p-6 md:p-8 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent border-b border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-2xl relative">
                            <Coffee className="w-6 h-6 text-blue-400" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-black animate-pulse"></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {user ? (
                                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-black tracking-widest uppercase flex items-center gap-1.5">
                                        <Sparkles className="w-2.5 h-2.5" /> CERTIFIED MEMBER ONLY
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2.5 py-1 rounded-full font-black tracking-widest uppercase flex items-center gap-1.5">
                                        GUEST ACCESS (LIMITED)
                                    </span>
                                )}
                                <span className="text-[10px] bg-white/5 text-gray-500 px-2 py-1 rounded-full font-medium">{new Date(brief.generated_at).toLocaleDateString()}</span>
                            </div>
                            <h2 className="text-2xl font-black text-white leading-tight">
                                {user ? `${user.name} 회원님` : "게스트 투자자님"}, {brief.market_title}
                            </h2>
                        </div>
                    </div>

                    {/* Beginner Mode Toggle */}
                    <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                        <button 
                            onClick={() => setIsSimpleMode(false)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!isSimpleMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            전문가 모드
                        </button>
                        <button 
                            onClick={() => setIsSimpleMode(true)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isSimpleMode ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            초보자 모드
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 grid lg:grid-cols-2 gap-8 md:gap-12">
                {/* Left: Market Summary */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 text-sm font-bold">
                            <Activity className="w-4 h-4" /> 글로벌 마켓 전략 가이드라인
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/10 shadow-inner">
                            <div className="text-gray-200 leading-relaxed font-medium text-base">
                                <Typewriter key={isSimpleMode ? 'simple' : 'pro'} text={isSimpleMode && brief.simple_summary ? brief.simple_summary : brief.market_summary} speed={40} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-purple-400 text-sm font-bold">
                            <CalendarDays className="w-4 h-4" /> 회원님을 위한 오늘의 핵심 체크포인트
                        </div>
                        <div className={`p-5 rounded-2xl border transition-colors ${isSimpleMode ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-purple-500/5 border-purple-500/10'}`}>
                            <p className={`text-sm leading-relaxed ${isSimpleMode ? 'text-emerald-200' : 'text-gray-300'}`}>
                                {isSimpleMode && brief.simple_focus ? brief.simple_focus : brief.market_focus}
                            </p>
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

            {/* Footer: Disclaimer */}
            <div className="px-8 py-5 bg-black/60 flex flex-col gap-3 border-t border-white/5">
                <p className="text-[9px] text-gray-600 leading-normal italic font-medium uppercase tracking-tighter">
                    {brief.disclaimer}
                </p>
                <div className="flex items-center justify-between">
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
