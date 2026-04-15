"use client";

import { useState, useEffect } from "react";
import { 
    Coffee, ChevronRight, Newspaper, Activity, Sparkles, Loader2, 
    AlertCircle, CalendarDays, Clock, ChevronDown, ChevronUp, Bot,
    UserCircle2, Globe, TrendingUp, Zap, Info, RotateCcw
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
    is_instant?: boolean;
    created_at?: string;
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
    
    // [Zero-Wait] 로컬 스토리지에서 이전 타임라인 데이터 즉시 로드
    const [timeline, setTimeline] = useState<MorningBriefData[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('morning_brief_timeline');
            if (cached) {
                try { return JSON.parse(cached); } catch { return []; }
            }
        }
        return [];
    });

    const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
    
    // [Zero-Wait] 로컬 데이터가 있으면 스켈레톤을 생략하고 즉시 렌더링
    const [isInitialLoading, setIsInitialLoading] = useState(() => {
        return timeline.length === 0;
    });

    const [isUpdating, setIsUpdating] = useState(false);
    const [isSimpleMode, setIsSimpleMode] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [updateStep, setUpdateStep] = useState(0); 
    const [loadingTimer, setLoadingTimer] = useState(0); 
    const [selectedDate, setSelectedDate] = useState<string>(""); // [History] 선택된 날짜 (YYYY-MM-DD)

    const fetchData = async (isInitial = false) => {
        if (!user) return;
        if (isInitial && timeline.length === 0) setIsInitialLoading(true);
        
        try {
            // [Zero-Wait Step 1] 지표 및 기존 타임라인 즉시 로드 (1초 내 완료)
            const [indexRes, timelineRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/market/indices`),
                fetch(`${API_BASE_URL}/api/ai/briefing-timeline`, {
                    headers: { "X-User-ID": user.id }
                })
            ]);

            const indexJson = await indexRes.json();
            if (indexJson.status === "success" && indexJson.data) {
                setMarketIndices(indexJson.data);
            }

            const timelineJson = await timelineRes.json();
            if (timelineJson.status === "success" && timelineJson.data) {
                setTimeline(timelineJson.data);
                // [Zero-Wait] 로컬 스토리지에 최신 데이터 백업
                localStorage.setItem('morning_brief_timeline', JSON.stringify(timelineJson.data));
                
                if (timelineJson.data.length > 0 && Object.keys(expandedIds).length === 0) {
                    const firstId = timelineJson.data[0]?.generated_at;
                    if (firstId) setExpandedIds({ [firstId]: true });
                }
            }
        } catch (err) {
            console.error("Initial fetch error", err);
        } finally {
            setIsInitialLoading(false);
        }
    };

    // [Zero-Wait Step 2] 백그라운드에서 조용히 최신 브리핑 동기화 (비차단 폴링 방식)
    const syncBriefing = async (isRetry = false) => {
        if (!user) return;
        
        // 폴링 중이 아닐 때만 초기 상태 설정
        if (!isRetry) {
            setIsUpdating(true);
            setUpdateStep(1);
        }
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/morning-brief`, {
                headers: { "X-User-ID": user.id }
            });
            const json = await res.json();
            
            if (json.status === "success") {
                // [Hybrid-Fast] 만약 즉시 리포트(is_instant)가 왔다면, 타임라인에 즉시 반영
                if (json.is_instant && json.data) {
                    setTimeline(prev => {
                        // 기존 타임라인에서 동일한 id(generated_at)가 있으면 교체, 없으면 맨 앞에 추가
                        const exists = prev.find(b => b.generated_at === json.data?.generated_at);
                        if (exists) return prev.map(b => b.generated_at === json.data?.generated_at ? json.data : b);
                        return [json.data, ...prev];
                    });
                }

                if (json.updating) {
                    setIsUpdating(true);
                    setUpdateStep(prev => (prev % 3) + 1);
                    setTimeout(() => syncBriefing(true), 5000);
                } else {
                    setIsUpdating(false);
                    setUpdateStep(0);
                    await fetchData();
                }
            }
        } catch (err) {
            console.error("Briefing sync error", err);
            setIsUpdating(false);
            setUpdateStep(0);
        }
    };

    const generateNow = async () => {
        if (!user) return;
        setIsUpdating(true);
        setUpdateStep(1); 
        
        try {
            // 강제 재생성 요청 (비차단)
            const res = await fetch(`${API_BASE_URL}/api/ai/morning-brief?force=true`, {
                headers: { "X-User-ID": user.id }
            });
            const json = await res.json();
            
            if (json.status === "success") {
                // 즉시 폴링 시작
                syncBriefing(true);
            }
        } catch (err) {
            console.error("Generate now error", err);
            setIsUpdating(false);
            setUpdateStep(0);
        }
    };

    const rollback = async () => {
        if (!user) return;
        if (!confirm("가장 최근 브리핑을 삭제하고 이전 단계로 되돌리시겠습니까?")) return;
        
        setIsUpdating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/briefing/rollback`, {
                method: "POST",
                headers: { "X-User-ID": user.id }
            });
            const json = await res.json();
            if (json.status === "success" && json.data) {
                setTimeline(prev => {
                    // [Zero-Wait] 배경 동기화 성공 시 로컬 스토리지와 상태를 모두 업데이트
                    localStorage.setItem('morning_brief_timeline', JSON.stringify(json.data));
                    return json.data;
                });
                setIsUpdating(false);
            } else {
                alert(json.message || "되돌릴 수 없습니다.");
                setIsUpdating(false);
            }
        } catch (err) {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            const init = async () => {
                await fetchData(true); // 데이터 즉시 로드 (Blocking minimal)
                syncBriefing();        // 최신화는 배경에서 (Non-blocking)
            };
            init();
        }
    }, [user, authLoading]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // [History] 타임라인 데이터를 날짜별로 그룹화하고 사용 가능한 날짜 목록 추출
    const availableDates = (Array.from(new Set(
        (timeline || []).map(b => b.created_at?.split(' ')[0] || b.created_at?.split('T')[0])
    )).filter(Boolean) as string[]).sort().reverse();

    // 초기 로드 시 가장 최신 날짜 자동 선택
    useEffect(() => {
        if (!selectedDate && availableDates.length > 0) {
            setSelectedDate(availableDates[0]);
        }
    }, [availableDates]);

    // 선택된 날짜에 해당하는 데이터만 필터링
    const filteredTimeline = (timeline || []).filter(b => {
        const itemDate = b.created_at?.split(' ')[0] || b.created_at?.split('T')[0];
        return itemDate === selectedDate;
    });

    const latestPersonal = filteredTimeline.find(b => b.user_id !== 'SYSTEM') || {
        market_title: selectedDate === new Date().toISOString().split('T')[0] 
            ? "시장 상황을 실시간으로 분석 중입니다..." 
            : `${selectedDate} 데이터가 없습니다.`,
        summary_bullets: ["데이터를 불러오는 중입니다...", "잠시만 기다려 주세요."],
        sections: [],
        watchlist_briefs: []
    } as Partial<MorningBriefData>;

    const BriefingSkeleton = () => (
        <div className="w-full space-y-6 animate-pulse">
            <div className="h-16 bg-white/5 rounded-3xl w-full" />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <div className="h-64 bg-white/5 rounded-[3rem]" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-32 bg-white/5 rounded-3xl" />
                        <div className="h-32 bg-white/5 rounded-3xl" />
                    </div>
                </div>
                <div className="h-96 bg-white/5 rounded-[3rem]" />
            </div>
        </div>
    );

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isInitialLoading) {
            interval = setInterval(() => {
                setLoadingTimer(prev => {
                    if (prev >= 20) { 
                        // [Auto-Recovery] 20초 경과 시 사용자가 버튼을 누르지 않아도 자동으로 강제 복구 로직 실행
                        handleEmergencyReset();
                        return 0;
                    }
                    return prev + 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isInitialLoading]);

    const handleEmergencyReset = () => {
        setIsInitialLoading(false);
        setIsUpdating(false);
        setLoadingTimer(0);
        fetchData();
    };

    // [UX Optimization] 만약 로컬 캐시 데이터(timeline)가 이미 있다면, 
    // 인증(authLoading) 중이라도 스켈레톤 대신 기존 데이터를 즉시 보여주어 '버퍼링'을 최소화합니다.
    if ((authLoading || isInitialLoading) && timeline.length === 0) {
        return <BriefingSkeleton />;
    }



    return (
        <div className="w-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700 relative">
            {/* Turbo Progress Overlay (Non-blocking) */}
            {isUpdating && (
                <div className="absolute top-0 left-0 right-0 z-50 bg-blue-600/90 backdrop-blur-md text-white px-6 py-2 flex items-center justify-between rounded-t-[3rem] animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-widest">
                            {updateStep === 1 ? "Turbo Scanning Market Data..." : 
                             updateStep === 2 ? "Quant Intelligence Analyzing..." : 
                             updateStep === 3 ? "AI Finalizing Your Report..." : "Syncing Intelligence..."}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        <div className={`w-8 h-1 rounded-full ${updateStep >= 1 ? 'bg-white' : 'bg-white/30'} transition-all duration-500`} />
                        <div className={`w-8 h-1 rounded-full ${updateStep >= 2 ? 'bg-white' : 'bg-white/30'} transition-all duration-500`} />
                        <div className={`w-8 h-1 rounded-full ${updateStep >= 3 ? 'bg-white' : 'bg-white/30'} transition-all duration-500`} />
                    </div>
                </div>
            )}
            <div className={`w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden flex flex-col transition-all duration-700 ${isUpdating ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                
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
                        <div className={`w-1.5 h-1.5 rounded-full ${isUpdating ? 'bg-blue-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} /> 
                        {isUpdating ? '실시간 브리핑 동기화 중(Turbo)' : '실시간 데이터 동기화 완료'}
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
                                {/* [History] 날짜 선택 드롭다운 */}
                                {availableDates.length > 0 && (
                                    <div className="relative">
                                        <select 
                                            value={selectedDate}
                                            onChange={(e) => {
                                                setSelectedDate(e.target.value);
                                                // 날짜 변경 시 첫 번째 항목 펼치기 초기화
                                                setExpandedIds({});
                                            }}
                                            className="appearance-none bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-bold pl-4 pr-10 py-2.5 rounded-2xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        >
                                            {availableDates.map(date => {
                                                const d = new Date(date);
                                                const formatted = `${d.getMonth() + 1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`;
                                                return <option key={date} value={date} className="bg-slate-900">{formatted}</option>;
                                            })}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                )}
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                                    NAVER STYLE AI INSIGHT
                                </span>
                                <span className="text-[10px] bg-purple-500/30 text-purple-300 px-3 py-1 rounded-full font-black tracking-widest uppercase border border-purple-500/20">
                                    v3.6.14-Patch
                                </span>
                                {latestPersonal?.is_instant && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full font-black tracking-widest uppercase animate-pulse">
                                        INSTANT DATA (AI ANALYZING...)
                                    </span>
                                )}
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
                            </div>
                            <div className="flex items-center gap-2">
                                {timeline.filter(b => b.user_id !== 'SYSTEM').length > 1 && (
                                    <button 
                                        onClick={rollback}
                                        title="이전 단계로 되돌리기"
                                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 transition-all flex items-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-tight hidden md:inline">이전단계</span>
                                    </button>
                                )}
                                <button onClick={generateNow} className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all">맞춤 분석 재생성</button>
                            </div>
                        </div>

                        {latestPersonal && latestPersonal.market_title !== "시장 상황을 실시간으로 분석 중입니다..." ? (
                            <div className="space-y-10 animate-in fade-in slide-in-from-left duration-700">
                                {/* Naver Style Summary Box */}
                                <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
                                     <h4 className="text-2xl md:text-3xl font-black text-white leading-tight mb-8">
                                        {latestPersonal?.market_title || "시장 상황을 분석 중입니다..."}
                                    </h4>

                                    <div className="bg-black/40 rounded-3xl p-8 border border-white/5 space-y-5 mb-10">
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">TODAY'S CORE SUMMARY</div>
                                        {(isSimpleMode && latestPersonal?.simple_summary_bullets ? latestPersonal.simple_summary_bullets : (latestPersonal?.summary_bullets || [])).map((b, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <span className="text-blue-500 font-black mt-1">·</span>
                                                <p className="text-gray-200 font-bold text-lg leading-relaxed">{b}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sections with Bold Headers */}
                                    <div className="grid md:grid-cols-2 gap-10">
                                        {(isSimpleMode && latestPersonal?.simple_sections ? latestPersonal.simple_sections : (latestPersonal?.sections || [])).map((sec, i) => (
                                            <div key={i} className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{sec?.emoji || "🔍"}</span>
                                                    <h5 className="font-black text-white text-base tracking-tight">{sec?.title || "데이터 탐색 중"}</h5>
                                                </div>
                                                <p className="text-gray-400 text-sm leading-relaxed font-medium pl-10 border-l border-white/10">{sec?.content || "분석 결과를 기다려 주세요."}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Watchlist Insight Cards */}
                                {latestPersonal?.watchlist_briefs && (
                                    <div className="grid sm:grid-cols-2 gap-5">
                                        {latestPersonal.watchlist_briefs.map((item, i) => (
                                            <div key={i} className="group p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-blue-500/30 transition-all">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-black text-white text-lg tracking-tight group-hover:text-blue-200">{item?.name || "종목명 확인 중"}</span>
                                                    <TrendingUp className="w-4 h-4 text-gray-700 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                                <p className="text-sm text-gray-400 leading-relaxed font-medium">
                                                    {isSimpleMode && item?.simple_insight ? item.simple_insight : (item?.insight || "데이터 분석 중입니다.")}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                                <Zap className="w-12 h-12 text-gray-700 mb-4 animate-pulse" />
                                <h4 className="text-xl font-bold text-gray-500">맞춤 분석 리포트를 생성할 수 없습니다.</h4>
                                <button onClick={generateNow} className="mt-8 px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20">수동 생성 시도하기</button>
                            </div>
                        )}
                        
                        {/* Legal */}
                        {latestPersonal && (
                             <div className="pt-8 border-t border-white/5 opacity-50 flex items-start gap-4">
                                <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-gray-600 leading-relaxed italic">{latestPersonal?.disclaimer || "AI 분석 결과는 투자 참고용이며 최종 책임은 투자자 본인에게 있습니다."}</p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: MARKET LOG TIMELINE */}
                    <div className="w-full xl:w-[35%] bg-black/30 p-7 md:p-10 flex flex-col gap-10">
                        <div className="flex items-center gap-3 shrink-0">
                            <Globe className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-black text-gray-200 uppercase tracking-tighter">실시간 시장 히스토리</h3>
                        </div>

                        {/* [UI Fix] 히스토리 영역 스크롤 및 컴팩트 레이아웃 적용 */}
                        <div className="flex-1 min-h-0 overflow-y-auto pr-3 custom-scrollbar max-h-[600px]">
                            <div className="relative space-y-4 pl-7 md:pl-9">
                                <div className="absolute left-1.5 md:left-2.5 top-3 bottom-0 w-[1.5px] bg-gradient-to-b from-blue-500/40 via-purple-500/10 to-transparent"></div>

                             {(filteredTimeline && filteredTimeline.length > 0) ? filteredTimeline.map((brief, idx) => {
                                 const date = brief?.created_at ? new Date(brief.created_at) : new Date();
                                 const timeLabel = brief?.created_at ? `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}` : "00:00";
                                 const isExpanded = brief?.generated_at ? expandedIds[brief.generated_at] : (idx === 0);
                                 const isSystem = brief?.user_id === 'SYSTEM';

                                return (
                                    <div key={idx} className="relative group animate-in fade-in slide-in-from-right duration-500">
                                        <div className={`absolute -left-[1.55rem] md:-left-[1.95rem] top-2 w-3 h-3 rounded-full border-2 border-black z-10 ${idx === 0 ? 'bg-blue-400 ring-4 ring-blue-500/20' : 'bg-gray-700 group-hover:bg-gray-500'}`}></div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black ${idx === 0 ? 'text-blue-400' : 'text-gray-500'}`}>{timeLabel}</span>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border border-white/5 font-black uppercase tracking-tighter ${isSystem ? 'bg-gray-500/10 text-gray-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {isSystem ? 'Global' : 'My'}
                                                    </span>
                                                </div>
                                                <button onClick={() => brief.generated_at && toggleExpand(brief.generated_at)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-500">
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                                                </button>
                                            </div>

                                            <div 
                                                className={`p-4 rounded-[1.25rem] border transition-all ${isExpanded ? 'bg-white/5 border-white/10 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] cursor-pointer'}`}
                                                onClick={() => !isExpanded && brief.generated_at && toggleExpand(brief.generated_at)}
                                            >
                                                <h5 className={`text-[13px] md:text-sm font-bold text-gray-200 leading-snug tracking-tight ${!isExpanded ? 'line-clamp-2' : ''}`}>{brief.market_title}</h5>
                                                
                                                {isExpanded && (
                                                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                                        {(isSimpleMode && brief.simple_summary_bullets ? brief.simple_summary_bullets : brief.summary_bullets).slice(0, 3).map((b, i) => (
                                                            <div key={i} className="flex items-start gap-2.5">
                                                                <div className="w-1 h-1 rounded-full bg-blue-500/60 mt-1.5 shrink-0"></div>
                                                                <p className="text-[10px] text-gray-400 leading-relaxed font-medium">{b}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="py-20 text-center">
                                    <p className="text-gray-500 text-sm italic">기록이 없습니다.</p>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Custom Scrollbar Styles */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
