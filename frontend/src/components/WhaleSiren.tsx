'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Volume2, 
    VolumeX, 
    X, 
    ExternalLink, 
    TrendingUp, 
    Building2, 
    Briefcase, 
    Coins, 
    FileSpreadsheet, 
    Zap, 
    ShieldAlert,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';

interface WhaleEvent {
    id: string;
    corp: string;
    title: string;
    code: string;
    timestamp: any;
    url?: string;
}

interface EventAnalysis {
    category: string;
    subBadge: string;
    insight: string;
    badgeStyle: string;
    glowStyle: string;
    barColor: string;
    icon: any;
}

// 공시 및 이벤트 제목 기반 스마트 분류 & 전문가 마켓 인사이트 도출 함수
function analyzeWhaleEvent(title: string): EventAnalysis {
    const t = title.toLowerCase();

    if (t.includes('대표이사') || t.includes('임원') || t.includes('경영진') || t.includes('지배구조')) {
        return {
            category: '경영진·대표이사 변경',
            subBadge: 'LEADERSHIP SHIFT',
            insight: '경영 체제 개편 및 신임 리더십 선임 · 향후 사업 다각화 및 경영 쇄신 모멘텀 점검',
            badgeStyle: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
            glowStyle: 'rgba(168, 85, 247, 0.25)',
            barColor: 'from-purple-500 to-indigo-500',
            icon: Building2,
        };
    }
    if (t.includes('공급계약') || t.includes('수주') || t.includes('단일판매') || t.includes('계약체결')) {
        return {
            category: '대규모 수주·공급계약',
            subBadge: 'ORDER CONTRACT',
            insight: '직전년도 매출액 대비 수주 비중 및 납기 일정 확인 · 실적 턴어라운드 핵심 지표',
            badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            glowStyle: 'rgba(16, 185, 129, 0.25)',
            barColor: 'from-emerald-500 to-teal-500',
            icon: Coins,
        };
    }
    if (t.includes('전환사채') || t.includes('신주인수권') || t.includes('cb') || t.includes('bw') || t.includes('유상증자')) {
        return {
            category: '메자닌·자본 조달',
            subBadge: 'CAPITAL DILUTION',
            insight: '조달 자금 사용 목적(시설투자 vs 운영자금) 및 전환가액 리픽싱 희석 물량 주의',
            badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
            glowStyle: 'rgba(245, 158, 11, 0.25)',
            barColor: 'from-amber-500 to-orange-500',
            icon: Briefcase,
        };
    }
    if (t.includes('지분') || t.includes('최대주주') || t.includes('주식등의대량보유') || t.includes('임원ㆍ주요주주')) {
        return {
            category: '대주주·내부자 지분변동',
            subBadge: 'INSIDER TRADING',
            insight: '핵심 경영진 및 최대주주의 책임경영 신호(장내매수) 또는 차익실현 출회 여부 파악',
            badgeStyle: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
            glowStyle: 'rgba(59, 130, 246, 0.25)',
            barColor: 'from-blue-500 to-cyan-500',
            icon: ShieldAlert,
        };
    }
    if (t.includes('영업실적') || t.includes('잠정') || t.includes('분기보고서') || t.includes('반기보고서') || t.includes('사업보고서') || t.includes('배당') || t.includes('자기주식') || t.includes('소각')) {
        return {
            category: '실적·주주환원 공시',
            subBadge: 'EARNINGS & DIVIDEND',
            insight: '시장 컨센서스 부합 여부 및 자사주 매입·소각 등 주주가치 제고 정책의 실효성 평가',
            badgeStyle: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
            glowStyle: 'rgba(20, 184, 166, 0.25)',
            barColor: 'from-teal-500 to-emerald-500',
            icon: FileSpreadsheet,
        };
    }
    if (t.includes('무상증자') || t.includes('감자') || t.includes('합병') || t.includes('분할') || t.includes('주식소각')) {
        return {
            category: '기업 분할·합병 및 자본정책',
            subBadge: 'CORPORATE ACTION',
            insight: '신주 배정 비율과 기준일 수급 효과 분석 및 지배구조 개편에 따른 기업가치 재평가',
            badgeStyle: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
            glowStyle: 'rgba(244, 63, 94, 0.25)',
            barColor: 'from-rose-500 to-pink-500',
            icon: Zap,
        };
    }

    // 기본 DART 주요공시/세력포착
    return {
        category: '실시간 전자공시 라이브',
        subBadge: 'MARKET DISCLOSURE',
        insight: '공시 원문 세부 계약 조건 및 수급 주체별 매매 동향 교차 검증 권장',
        badgeStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        glowStyle: 'rgba(6, 182, 212, 0.25)',
        barColor: 'from-cyan-500 to-blue-500',
        icon: Sparkles,
    };
}

export default function WhaleSiren() {
    const [currentEvent, setCurrentEvent] = useState<WhaleEvent | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastShownEventId = useRef<string | null>(null);
    const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleInteract = () => setHasInteracted(true);
        window.addEventListener('click', handleInteract, { once: true });
        
        audioRef.current = new Audio('/alert.ogg');
        audioRef.current.volume = 0.4;

        return () => window.removeEventListener('click', handleInteract);
    }, []);

    const dismissToast = () => {
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = null;
        }
        setCurrentEvent(null);
    };

    useEffect(() => {
        let isChecking = false;

        const checkLatestEvent = async () => {
            if (isChecking) return;
            isChecking = true;
            try {
                const res = await fetch(`${API_BASE_URL}/api/live_events/latest`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'success' && json.data) {
                        const data = json.data;
                        let isRecent = true;
                        if (data.timestamp) {
                            // 최근 90초 이내 이벤트만 팝업
                            if (Date.now() - data.timestamp > 90000) {
                                isRecent = false;
                            }
                        }

                        // 이미 띄운 이벤트면 스킵 (Ref로 체크)
                        if (isRecent && lastShownEventId.current !== data.id) {
                            lastShownEventId.current = data.id; // 즉시 기록
                            
                            setCurrentEvent({
                                id: data.id,
                                corp: data.corp,
                                title: data.title,
                                code: data.code,
                                timestamp: data.timestamp,
                                url: data.url
                            });

                            if (!isMuted && hasInteracted && audioRef.current) {
                                audioRef.current.play().catch(e => console.log('Audio play failed:', e));
                            }

                            if (dismissTimerRef.current) {
                                clearTimeout(dismissTimerRef.current);
                            }
                            // 8.5초 후 자동 닫힘
                            dismissTimerRef.current = setTimeout(() => {
                                setCurrentEvent(null);
                            }, 8500);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch whale event", e);
            } finally {
                isChecking = false;
            }
        };

        // 처음 1회 실행 후 5초마다 폴링
        checkLatestEvent();
        const interval = setInterval(checkLatestEvent, 5000);

        return () => {
            clearInterval(interval);
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
        };
    }, [isMuted, hasInteracted]);

    const analysis = currentEvent ? analyzeWhaleEvent(currentEvent.title) : null;
    const CategoryIcon = analysis?.icon || Sparkles;

    return (
        <AnimatePresence>
            {currentEvent && analysis && (
                <motion.div
                    initial={{ opacity: 0, y: -40, scale: 0.92, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -25, scale: 0.94, filter: 'blur(6px)' }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="fixed top-20 right-4 sm:right-6 z-[100] w-[calc(100%-2rem)] sm:w-[420px]"
                >
                    {/* 카드 메인 컨테이너 */}
                    <div 
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d111d]/95 via-[#131929]/95 to-[#0a0d16]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(0,0,0,0.5)] transition-all duration-300"
                        style={{
                            boxShadow: `0 20px 45px -10px rgba(0,0,0,0.8), 0 0 25px -5px ${analysis.glowStyle}`
                        }}
                    >
                        {/* 상단 8.5초 카운트다운 타이머 프로그레스 바 */}
                        <div className="w-full h-1 bg-white/5 overflow-hidden">
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 8.5, ease: "linear" }}
                                className={`h-full bg-gradient-to-r ${analysis.barColor}`}
                            />
                        </div>

                        {/* 은은한 배경 앰비언트 글로우 */}
                        <div 
                            className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-40 transition-all duration-500"
                            style={{ background: analysis.glowStyle }}
                        />
                        <div 
                            className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500"
                            style={{ background: analysis.glowStyle }}
                        />

                        {/* 카드 내부 패딩 */}
                        <div className="relative p-4 sm:p-5 flex flex-col gap-3">
                            {/* 상단 헤더: 카테고리 뱃지 + 컨트롤 버튼들 */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${analysis.badgeStyle}`}>
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                                        </span>
                                        <CategoryIcon className="w-3.5 h-3.5" />
                                        <span>{analysis.category}</span>
                                    </span>
                                    <span className="text-[10px] font-bold tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                                        {analysis.subBadge}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* 음소거 버튼 */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsMuted(!isMuted);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                        title={isMuted ? "알림음 켜기" : "알림음 끄기"}
                                    >
                                        {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                                    </button>
                                    {/* 닫기 버튼 */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            dismissToast();
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                        title="닫기"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* 기업명 및 공시 제목 */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-black text-lg sm:text-xl tracking-tight">
                                        {currentEvent.corp}
                                    </h3>
                                    {currentEvent.code && (
                                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                                            {currentEvent.code}
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-200 text-sm font-medium leading-snug line-clamp-2">
                                    {currentEvent.title}
                                </p>
                            </div>

                            {/* 스마트 마켓 인사이트 박스 */}
                            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-sm flex items-start gap-2">
                                <span className="text-sm mt-0.5">💡</span>
                                <div className="flex-1">
                                    <span className="text-[11px] font-bold text-amber-300 block mb-0.5">
                                        전문가 핵심 관전 포인트
                                    </span>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        {analysis.insight}
                                    </p>
                                </div>
                            </div>

                            {/* 하단 액션 버튼 바 */}
                            <div className="flex items-center gap-2 pt-1">
                                {currentEvent.code && (
                                    <Link 
                                        href={`/discovery?q=${currentEvent.code}`}
                                        onClick={dismissToast}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
                                    >
                                        <span>종목 정밀 심층 분석</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                                {currentEvent.url && (
                                    <a 
                                        href={`/news-redirect?url=${encodeURIComponent(currentEvent.url)}${currentEvent.code ? `&symbol=${currentEvent.code}` : ''}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 transition-colors"
                                        title="DART 공시 원문 보기"
                                    >
                                        <span>원문</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

