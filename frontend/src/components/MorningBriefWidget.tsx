"use client";

import { useState, useEffect } from "react";
import { 
    Coffee, ChevronRight, Newspaper, Activity, Sparkles, Loader2, 
    AlertCircle, CalendarDays, Clock, ChevronDown, ChevronUp, Bot,
    UserCircle2, Globe, TrendingUp, Zap, Info, RotateCcw,
    Star, FileText, RefreshCw
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
    is_instant?: boolean;
    created_at?: string;
    kst_date?: string;
}


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


    const [marketStatus, setMarketStatus] = useState<any>(null);
    
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

    const fetchTimeline = async (isInitial = false) => {
        // [Mod] 게스트 사용자도 SYSTEM 브리핑 조회를 위해 fetch 허용
        const userId = user?.id || (user as any)?.uid || "SYSTEM";
        if (isInitial && timeline.length === 0) setIsInitialLoading(true);
        
        try {
            // [Zero-Wait Step 1] 기존 타임라인 즉시 로드 (1초 내 완료)
            const [timelineRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/ai/briefing-timeline`, {
                    headers: { "X-User-ID": userId }
                })
            ]);

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
        const userId = user?.id || (user as any)?.uid || "SYSTEM";
        
        // 폴링 중이 아닐 때만 초기 상태 설정
        if (!isRetry) {
            setIsUpdating(true);
            setUpdateStep(1);
        }
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/morning-brief`, {
                headers: { "X-User-ID": userId }
            });
            const json = await res.json();
            
            if (json.status === "success") {
                if (json.market_status) setMarketStatus(json.market_status);
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
                    await fetchTimeline();
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
                headers: { "X-User-ID": user.id || (user as any).uid }
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
                headers: { "X-User-ID": user.id || (user as any).uid }
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
        if (!authLoading) {
            const init = async () => {
                await fetchTimeline(true); // 데이터 즉시 로드 (Blocking minimal)
                syncBriefing();        // 최신화는 배경에서 (Non-blocking)
            };
            init();

            // [Ultra-Stability] 5분마다 자동으로 데이터 동기화 (새로고침 없이 실시간 갱신)
            const autoRefresh = setInterval(() => {
                console.log("🔄 [Auto-Sync] Fetching latest market intelligence...");
                fetchTimeline();
                syncBriefing(true); // 폴링 방식으로 조용히 업데이트
            }, 5 * 60 * 1000); // 5분

            return () => clearInterval(autoRefresh);
        }
    }, [user, authLoading]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // [History] 최근 영업일(평일) 기준 정확히 7일간의 날짜 목록 생성 (주말 제외)
    const availableDates = (() => {
        const dates = [];
        let checkDate = new Date();
        let daysFound = 0;
        const targetDays = 7; // [Update] 요청하신 대로 정확히 7 영업일 표시
        
        while (daysFound < targetDays) {
            const dayOfWeek = checkDate.getDay(); // 0: 일, 6: 토
            
            // 토요일(6)과 일요일(0)이 아닌 경우에만 목록에 추가
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const year = checkDate.getFullYear();
                const month = String(checkDate.getMonth() + 1).padStart(2, '0');
                const day = String(checkDate.getDate()).padStart(2, '0');
                dates.push(`${year}-${month}-${day}`);
                daysFound++;
            }
            
            // 하루 전으로 이동
            checkDate.setDate(checkDate.getDate() - 1);
            
            // 무한 루프 방지 (최대 30일까지만 탐색)
            if (dates.length >= targetDays || dates.length + daysFound > 30) break;
        }
        return dates;
    })();

    // 초기 로드 시 가장 최신 날짜 자동 선택
    useEffect(() => {
        if (!selectedDate && availableDates.length > 0) {
            setSelectedDate(availableDates[0]);
        }
    }, [availableDates]);

    // [History Fix] 선택된 날짜에 해당하는 데이터 필터링 (개인 맞춤 + SYSTEM 공용 모두 포함)
    const filteredTimeline = (timeline || []).filter(b => {
        if (!selectedDate) return false;
        
        // 날짜 데이터 추출 및 정규화 (KST 기준)
        // b.kst_date는 백엔드에서 '+9 hours' 처리된 YYYY-MM-DD 형식임
        const datePart = (b.kst_date || b.created_at || "").split(/[ T]/)[0];
        
        // 1. 선택된 날짜와 정확히 일치하는 경우 (Strict Match)
        if (datePart === selectedDate) return true;
        
        // 1. 선택된 날짜와 정확히 일치하는 경우 (Strict Match Only)
        return datePart === selectedDate;
    });

    // [분리] 왼쪽: 개인 맞춤 브리핑(관심종목 뉴스)만 표시 — SYSTEM 브리핑 절대 폴백 금지
    const latestPersonal = filteredTimeline.find(b => b.user_id !== 'SYSTEM') || null;

    // [분리] 오른쪽 타임라인: SYSTEM 브리핑(시장 히스토리)만 표시 — 개인 데이터 제외
    const systemTimeline = (timeline || []).filter(b => {
        if (b.user_id !== 'SYSTEM') return false;
        if (!selectedDate) return false;
        const datePart = (b.kst_date || b.created_at || "").split(/[ T]/)[0];
        // [Strict Match Only] 사용자가 선택한 날짜의 기록만 정직하게 노출
        return datePart === selectedDate;
    });

    // [Cleanup] 타임라인 내 중복 시간대 브리핑 제거 (Date + Hour 조합 활용)
    const uniqueSystemTimeline = systemTimeline.reduce((acc, current) => {
        const date = current?.created_at ? new Date(current.created_at) : new Date();
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        if (!acc.find(item => {
            const d = item?.created_at ? new Date(item.created_at) : new Date();
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}` === key;
        })) {
            acc.push(current);
        }
        return acc;
    }, [] as any[]);

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
        fetchTimeline();
    };

    // [UX Optimization] 만약 로컬 캐시 데이터(timeline)가 이미 있다면, 
    // 인증(authLoading) 중이라도 스켈레톤 대신 기존 데이터를 즉시 보여주어 '버퍼링'을 최소화합니다.
    if ((authLoading || isInitialLoading) && timeline.length === 0) {
        return <BriefingSkeleton />;
    }



    return (
        <div className="w-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700 relative">
            {/* Turbo Progress Overlay (Removed per user request) */}
            <div className={`w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden flex flex-col transition-all duration-700 ${isUpdating ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                


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
                                <span className="text-[10px] bg-purple-500/30 text-purple-300 px-3 py-1 rounded-full font-black tracking-widest uppercase border border-purple-500/20">
                                    v3.6.25-ULTRA-READY
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

                                {/* Watchlist News Intelligence Cards */}
                                {latestPersonal?.watchlist_briefs && (
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        {latestPersonal.watchlist_briefs.map((item, i) => (
                                            <div key={i} className="group p-7 bg-white/5 border border-white/10 rounded-[2rem] hover:border-emerald-500/30 transition-all shadow-xl">
                                                <div className="flex items-center justify-between mb-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-white text-xl tracking-tight group-hover:text-emerald-200">{item?.name || "종목명 확인 중"}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono tracking-widest">{item?.symbol}</span>
                                                    </div>
                                                    <div className="p-2.5 bg-emerald-500/10 rounded-2xl">
                                                        <TrendingUp className="w-5 h-5 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    {/* AI가 분류한 뉴스 데이터 렌더링 (분석 배제) */}
                                                    {(item?.insight || "").split('\n').filter(line => line && line.trim()).map((line, li) => {
                                                        const cleanLine = line.trim();
                                                        const isGood = cleanLine.includes('[호재');
                                                        const isBad = cleanLine.includes('[주의') || cleanLine.includes('[악재');
                                                        
                                                        return (
                                                            <div key={`${item.symbol}-${li}`} className="flex gap-2.5 items-start animate-in fade-in slide-in-from-right duration-500" style={{ animationDelay: `${li * 50}ms` }}>
                                                                {isGood && <span className="shrink-0 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[9px] font-black border border-blue-500/20">호재</span>}
                                                                {isBad && <span className="shrink-0 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[9px] font-black border border-rose-500/20">주의</span>}
                                                                <p className={`text-[12px] leading-relaxed font-medium ${isGood || isBad ? 'text-gray-200' : 'text-gray-500'}`}>
                                                                    {cleanLine.replace(/\[호재성 소식\]|\[주의\/악재성 소식\]|\[호재\]|\[주의\]|\[악재\]/g, '').trim()}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] rounded-[3.5rem] border border-dashed border-white/10">
                                <Bot className="w-14 h-14 text-white/5 mb-6 animate-pulse" />
                                <h4 className="text-xl font-bold text-gray-600">개인 맞춤 인텔리전스를 수집 중입니다.</h4>
                                <p className="text-xs text-gray-700 mt-2">잠시만 기다려 주시거나 아래 버튼을 클릭하세요.</p>
                                <button onClick={generateNow} className="mt-8 px-12 py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-black rounded-[2rem] border border-emerald-500/30 transition-all shadow-2xl">즉시 데이터 수집하기</button>
                            </div>
                        )}
                        
                        {/* Advisory Compliance Disclaimer */}
                        {latestPersonal && (
                             <div className="pt-10 border-t border-white/5 flex items-start gap-4">
                                <AlertCircle className="w-4 h-4 text-rose-500/40 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-600 font-bold leading-relaxed">준법 고지 및 면책 조항 (Investment Advisory Compliance)</p>
                                    <p className="text-[9px] text-gray-700 leading-relaxed italic">본 리포트는 AI 큐레이션 엔진이 수집된 다량의 뉴스 데이터를 기계적으로 분류한 결과입니다. 서비스 제공자는 특정 종목의 매칭 결과에 대해 주관적인 투자 전략이나 수익률 보장을 제공하지 않으며, 모든 투자 판단의 최종 책임은 사용자 본인에게 있습니다.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: MARKET LOG LOG (Naver Style) */}
                    <div className="w-full xl:w-[35%] bg-black/30 p-7 md:p-10 flex flex-col gap-10">
                        <div className="flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-gray-400" />
                                <h3 className="text-lg font-black text-gray-200 uppercase tracking-tighter shadow-sm">실시간 시장 히스토리</h3>
                                {marketStatus && (
                                    <div className={`ml-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all animate-in fade-in zoom-in duration-500
                                        ${marketStatus.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                          marketStatus.status === 'CLOSED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                          'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${marketStatus.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
                                        {marketStatus.text}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={fetchTimeline} 
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
                                title="새로고침"
                            >
                                <RefreshCw className={`w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors ${isUpdating ? 'animate-spin' : ''}`} />
                            </button>

                            {/* [History] 날짜 선택 달력 드롭다운 */}
                            {availableDates.length > 0 && (
                                <div className="relative ml-2">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer group/cal">
                                        <CalendarDays className="w-4 h-4 text-emerald-400" />
                                        <select 
                                            value={selectedDate}
                                            onChange={(e) => {
                                                setSelectedDate(e.target.value);
                                                setExpandedIds({});
                                            }}
                                            className="appearance-none bg-transparent text-xs font-black text-gray-300 cursor-pointer focus:outline-none pr-4"
                                        >
                                            {availableDates.map(date => {
                                                const d = new Date(date);
                                                const formatted = `${d.getMonth() + 1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`;
                                                return <option key={date} value={date} className="bg-slate-900 text-white">{formatted}</option>;
                                            })}
                                        </select>
                                        <ChevronDown className="w-3 h-3 text-gray-500 group-hover/cal:text-white transition-colors absolute right-2 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto pr-3 custom-scrollbar max-h-[600px]">
                            <div className="relative space-y-2 pl-7 md:pl-9">
                                {/* Vertical Timeline Line */}
                                <div className="absolute left-1.5 md:left-2.5 top-3 bottom-0 w-[1px] bg-gradient-to-b from-emerald-500/40 via-white/5 to-transparent"></div>

                                {(uniqueSystemTimeline && uniqueSystemTimeline.length > 0) ? uniqueSystemTimeline.map((brief, idx) => {
                                    const date = brief?.created_at ? new Date(brief.created_at) : new Date();
                                    // [Precision] 정시 브리핑은 분 단위를 절삭하여 00으로 강제 표시 (히스토리 일관성 확보)
                                    const timeLabel = brief.category === 'PERIODIC' 
                                        ? `${date.getHours()}:00` 
                                        : `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                                    const isExpanded = brief?.generated_at ? expandedIds[brief.generated_at] : (idx === 0);
                                    
                                    // 날짜 헤더 표시 조건 (이전 항목과 날짜가 다른 경우)
                                    const currentDate = brief.kst_date || brief.created_at?.split(' ')[0] || brief.created_at?.split('T')[0];
                                    const prevDate = idx > 0 ? (filteredTimeline[idx-1].kst_date || filteredTimeline[idx-1].created_at?.split(' ')[0] || filteredTimeline[idx-1].created_at?.split('T')[0]) : null;
                                    const showDateSeparator = currentDate !== prevDate;
                                    
                                    return (
                                        <div key={idx} className="space-y-4">
                                            {showDateSeparator && (
                                                <div className="flex items-center gap-3 py-4 sticky top-0 z-20 bg-transparent backdrop-blur-sm">
                                                    <div className="h-[1px] flex-1 bg-white/5"></div>
                                                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10 uppercase tracking-tighter">
                                                        {currentDate?.split('-')[1]}월 {currentDate?.split('-')[2]}일
                                                    </span>
                                                    <div className="h-[1px] flex-1 bg-white/5"></div>
                                                </div>
                                            )}
                                            <div className="relative group animate-in fade-in slide-in-from-right duration-500">
                                            {/* Naver Style Dot */}
                                            <div className={`absolute -left-[1.65rem] md:-left-[2.05rem] top-2.5 w-2.5 h-2.5 rounded-full border-2 border-black z-10 transition-colors
                                                ${idx === 0 ? 'bg-emerald-400 ring-4 ring-emerald-400/10' : 'bg-gray-700 group-hover:bg-gray-500'}`}>
                                            </div>
                                            
                                            <div className="space-y-2 pb-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[11px] font-bold font-mono ${idx === 0 ? 'text-emerald-400' : 'text-gray-500'}`}>{timeLabel}</span>
                                                        
                                                        {/* [Naver Badge System] */}
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-black tracking-tight
                                                            ${brief.category === 'PERIODIC' ? 'bg-gray-800 text-gray-400 border border-gray-700' :
                                                              brief.category === 'WATCHLIST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                              brief.category === 'DISCLOSURE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                            {brief.category === 'PERIODIC' ? '정기 브리핑' :
                                                             brief.category === 'WATCHLIST' ? '관심종목' :
                                                             brief.category === 'DISCLOSURE' ? '주요공시' : '시장요약'}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => brief.generated_at && toggleExpand(brief.generated_at)} className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-gray-600 hover:text-gray-400">
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                                                    </button>
                                                </div>

                                                <div 
                                                    className={`p-4 rounded-xl border transition-all duration-300
                                                        ${isExpanded ? 'bg-white/[0.04] border-white/10 shadow-2xl' : 'bg-white/[0.01] border-white/5 hover:border-white/10 cursor-pointer'}`}
                                                    onClick={() => !isExpanded && brief.generated_at && toggleExpand(brief.generated_at)}
                                                >
                                                    <div className="flex gap-3">
                                                        {/* Category Specific Icons */}
                                                        <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border
                                                            ${brief.category === 'PERIODIC' ? 'bg-gray-800/50 border-gray-700 text-gray-400' :
                                                              brief.category === 'WATCHLIST' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                              brief.category === 'DISCLOSURE' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                                              'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                                            {brief.category === 'PERIODIC' ? <Clock className="w-4 h-4" /> :
                                                             brief.category === 'WATCHLIST' ? <Star className="w-4 h-4" /> :
                                                             brief.category === 'DISCLOSURE' ? <FileText className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <h5 className={`text-[13px] font-bold text-gray-200 leading-snug tracking-tight ${!isExpanded ? 'line-clamp-1' : ''}`}>
                                                                {brief.market_title}
                                                            </h5>
                                                            
                                                            {isExpanded && (
                                                                <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                                                    {(isSimpleMode && brief.simple_summary_bullets ? brief.simple_summary_bullets : brief.summary_bullets).map((b, i) => (
                                                                        <div key={i} className="flex items-start gap-2.5 group/item">
                                                                            <div className="w-1 h-1 rounded-full bg-blue-500/40 mt-1.5 shrink-0 group-hover/item:bg-blue-400 transition-colors"></div>
                                                                            <p className="text-[11px] text-gray-400 leading-relaxed font-medium group-hover/item:text-gray-300 transition-colors">{b}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-20 text-center">
                                        <p className="text-gray-500 text-sm italic">해당 날짜의 기록이 생성되지 않았거나 주말/공휴일입니다. (v3.6.26-TURBO-STABLE)</p>
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
