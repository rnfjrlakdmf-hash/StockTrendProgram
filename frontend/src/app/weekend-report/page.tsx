"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Lock, Clock, Calendar, CheckCircle2, TrendingUp, AlertTriangle, Share2, 
    ArrowLeft, Flame, Sparkles, Check, Copy, Compass, Zap, ShieldCheck, 
    Layers, ChevronRight, BarChart3, Globe
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';
import { toast } from 'sonner';

interface WeekendReport {
    title: string;
    subtitle: string;
    week_summary_bullets: string[];
    sections: {
        emoji: string;
        title: string;
        content: string;
    }[];
    disclaimer: string;
    generated_at: string;
}

interface ReportResponse {
    is_open: boolean;
    opens_at?: string;
    countdown_seconds?: number;
    report?: WeekendReport;
}

// Readability & Eye-Friendly Highlight Helper
function HighlightText({ text, className = "" }: { text: string; className?: string }) {
    if (!text) return null;
    
    // Only highlight short symbols/tickers (<= 12 chars) like (삼성전자), (GDP), (CPI)
    // Long explanatory sentences in parens will render naturally as clean, comfortable text
    const parts = text.split(/('[\w가-힣\s·,]{1,12}'|\([\w가-힣\s·,]{1,10}\))/g);
    
    return (
        <span className={className}>
            {parts.map((part, index) => {
                if (!part) return null;
                if (part.startsWith("'") && part.endsWith("'") && part.length <= 14) {
                    return (
                        <span key={index} className="text-amber-300 font-bold px-1.5 py-0.5 rounded-md bg-amber-400/10 mx-0.5 border border-amber-500/20">
                            {part.slice(1, -1)}
                        </span>
                    );
                }
                if (part.startsWith("(") && part.endsWith(")") && part.length <= 12) {
                    return (
                        <span key={index} className="text-sky-300 font-bold px-1.5 py-0.5 rounded-md bg-sky-400/10 mx-0.5 border border-sky-500/20">
                            {part}
                        </span>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}

export default function WeekendReportPage() {
    const [data, setData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/weekend-report?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then((resData: ReportResponse) => {
                setData(resData);
                if (!resData.is_open && resData.countdown_seconds) {
                    setTimeLeft(resData.countdown_seconds);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch weekend report", err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!data?.is_open && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [data, timeLeft]);

    const formatTime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        if (d > 0) return `${d}일 ${h}시간 ${m}분 ${s}초`;
        return `${h}시간 ${m}분 ${s}초`;
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: '주말 마켓 인사이트 리포트',
                text: '이번 주 시장 핵심 팩트와 다음 주 경제 일정을 확인하세요!',
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                setCopied(true);
                toast.success("🎉 주말 인사이트 링크가 복사되었습니다!");
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                alert("링크 복사에 실패했습니다.");
            });
        }
    };

    // Helper to parse section content into structured high-end cards
    const renderParsedContent = (content: string) => {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        
        return (
            <div className="space-y-3.5">
                {lines.map((line, idx) => {
                    const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
                    
                    // Check if line contains a colon separator (e.g. "기술 및 반도체: 설명..." or "8월 25일(화): 일정...")
                    const colonIdx = cleanLine.indexOf(':');
                    if (colonIdx > 0 && colonIdx < 35) {
                        const tag = cleanLine.substring(0, colonIdx).trim();
                        const desc = cleanLine.substring(colonIdx + 1).trim();
                        
                        const isDate = tag.includes('월') && tag.includes('일');

                        return (
                            <div 
                                key={idx} 
                                className={`p-4.5 rounded-2xl transition-all flex flex-col gap-2 border ${
                                    isDate 
                                        ? 'bg-zinc-900/90 border-blue-500/25 hover:border-blue-500/40 shadow-sm' 
                                        : 'bg-zinc-900/90 border-amber-500/25 hover:border-amber-500/40 shadow-sm'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
                                    <span className={`text-xs md:text-sm font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                                        isDate 
                                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 font-mono tracking-tight' 
                                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    }`}>
                                        {isDate ? <Calendar className="w-3.5 h-3.5 text-blue-400" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                                        {tag}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">
                                        {isDate ? "KEY EVENT" : "SECTOR ROTATION"}
                                    </span>
                                </div>
                                <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-normal pl-0.5">
                                    <HighlightText text={desc} />
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className="bg-zinc-900/90 border border-white/10 p-4 rounded-2xl text-sm sm:text-base text-zinc-100 leading-relaxed font-normal">
                            <HighlightText text={cleanLine} />
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07080d] flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono text-amber-400/80 animate-pulse">VVIP WEEKEND INTELLIGENCE LOADING...</span>
            </div>
        );
    }

    if (!data?.is_open) {
        return (
            <div className="min-h-screen bg-[#07080d] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[160px] pointer-events-none"></div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 flex flex-col items-center text-center max-w-lg w-full"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-3xl p-0.5 shadow-[0_0_35px_rgba(59,130,246,0.35)] flex items-center justify-center mb-6">
                        <div className="w-full h-full bg-zinc-950 rounded-[22px] flex items-center justify-center text-blue-400">
                            <Lock className="w-8 h-8" />
                        </div>
                    </div>
                    
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
                        WEEKEND LIMITED ACCESS
                    </span>

                    <h1 className="text-2xl sm:text-3xl font-black mb-3 text-white tracking-tight">주말 한정 마켓 인사이트</h1>
                    <p className="text-xs sm:text-sm text-gray-300 mb-8 leading-relaxed font-medium">
                        토요일 오전 10시, 지난주 시장의 핵심 팩트 요약과<br/>
                        다음 주 필수 체크포인트가 독점 공개됩니다.
                    </p>
                    
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-7 w-full shadow-2xl space-y-2">
                        <div className="flex items-center justify-center gap-2 text-blue-300 text-xs font-bold">
                            <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
                            <span>오픈까지 남은 시간</span>
                        </div>
                        <div className="text-3xl sm:text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-purple-300">
                            {timeLeft > 0 ? formatTime(timeLeft) : "곧 열립니다!"}
                        </div>
                    </div>
                    
                    <Link href="/" className="mt-8 text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors p-2 rounded-xl hover:bg-white/5">
                        <ArrowLeft className="w-3.5 h-3.5" /> 홈으로 돌아가기
                    </Link>
                </motion.div>
            </div>
        );
    }

    const { report } = data;

    return (
        <div className="min-h-screen bg-[#07080d] text-gray-100 p-4 md:p-8 max-w-5xl mx-auto relative overflow-hidden font-sans pb-24">
            {/* Ambient Glowing Background Auroras */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed bottom-10 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

            {/* Top Navigation & Status Bar */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all shadow-sm active:scale-95"
                >
                    <ArrowLeft className="w-4 h-4 text-amber-400" />
                    <span>홈으로 돌아가기</span>
                </Link>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border border-blue-500/30 text-blue-300 text-xs font-black shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <Calendar className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span>
                        {(data as any)?.is_current_weekend 
                            ? "🔥 주말 특별 라이브 리포트 (일요일 자정 마감)" 
                            : "지난 주말 특별 리포트 다시보기"}
                    </span>
                </div>
            </div>

            {/* Prestige Hero Header */}
            <div className="relative mb-10 pb-6 border-b border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative p-3.5 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.35)] text-white font-black flex items-center justify-center shrink-0">
                            <Compass className="w-7 h-7 text-white drop-shadow-sm" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-400"></span>
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
                                    VVIP WEEKEND BRIEFING
                                </span>
                                <span className="text-xs font-mono font-bold text-gray-300">
                                    WEEKEND EDITION
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl lg:text-[28px] font-black text-white tracking-tight leading-snug">
                                {report?.title || "주말 마켓 인사이트: 지난주 시장 데이터와 다음 주 경제 일정"}
                            </h1>
                            <p className="text-sm text-zinc-300 mt-1 font-medium">
                                {report?.subtitle || "이번 주 시장 핵심 팩트 요약과 다음 주 주요 경제 캘린더"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="space-y-10">
                {/* 1. 1분 마켓 서머리 Executive Bento */}
                <section className="relative bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-zinc-950 border border-emerald-500/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden space-y-5">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-gradient-to-br from-emerald-400/20 to-teal-600/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-mono font-bold text-emerald-400 tracking-widest block uppercase">
                                    SECTION 01 · 1-MIN EXECUTIVE SUMMARY
                                </span>
                                <h2 className="text-lg md:text-xl font-black text-white">
                                    1분 마켓 핵심 서머리
                                </h2>
                            </div>
                        </div>
                        <span className="text-[11px] bg-emerald-500/15 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            WEEKLY BRIEF
                        </span>
                    </div>

                    <div className="space-y-3.5">
                        {report?.week_summary_bullets?.map((bullet, idx) => (
                            <div 
                                key={idx} 
                                className="flex items-start gap-4 bg-zinc-900/90 border border-white/10 hover:border-emerald-500/40 p-4.5 rounded-2xl transition-all shadow-sm"
                            >
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-black flex items-center justify-center text-xs font-black font-mono shrink-0 mt-0.5 shadow-md">
                                    {idx + 1}
                                </div>
                                <span className="text-sm sm:text-base text-zinc-100 leading-relaxed font-medium pt-0.5">
                                    <HighlightText text={bullet.replace(/^[•\-\*·]\s*/, '')} />
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. 상세 섹션 (2-Column Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {report?.sections?.map((section, idx) => (
                        <section 
                            key={idx} 
                            className={`relative rounded-3xl p-6 md:p-7 shadow-2xl border flex flex-col justify-between overflow-hidden ${
                                idx === 0 
                                    ? 'bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-950 border-amber-500/30 hover:border-amber-500/50' 
                                    : 'bg-gradient-to-br from-blue-950/20 via-zinc-950 to-zinc-950 border-blue-500/30 hover:border-blue-500/50'
                            }`}
                        >
                            <div className="space-y-5">
                                <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl p-2 bg-zinc-900/90 rounded-2xl border border-white/10 shadow-sm">
                                            {section.emoji}
                                        </span>
                                        <div>
                                            <span className={`text-[10px] font-mono font-bold tracking-wider block uppercase ${
                                                idx === 0 ? 'text-amber-400' : 'text-blue-400'
                                            }`}>
                                                {idx === 0 ? 'SECTION 02 · SECTOR THEMES' : 'SECTION 03 · MACRO CALENDAR'}
                                            </span>
                                            <h3 className="text-base md:text-lg font-black text-white">
                                                {section.title}
                                            </h3>
                                        </div>
                                    </div>
                                </div>

                                {renderParsedContent(section.content)}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Kakao AdFit In-Feed Banner */}
                <KakaoRevenueAd type="feed" />

                {/* 3. 액션 버튼 */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button 
                        onClick={handleShare}
                        className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs md:text-sm shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all transform active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-300" />
                                <span className="text-emerald-100 font-bold">주말 인사이트 복사 완료!</span>
                            </>
                        ) : (
                            <>
                                <Share2 className="w-4 h-4 text-blue-200" />
                                <span>이 주말 인사이트 지인에게 공유하기</span>
                            </>
                        )}
                    </button>
                    <p className="text-[11px] text-gray-400 font-mono tracking-wider">
                        VVIP WEEKEND RADAR · CONFIDENTIAL INTELLIGENCE
                    </p>
                </div>

                {/* 4. 자본시장법 준수 법적 면책 안내 */}
                <div className="p-6 bg-zinc-950/90 border border-white/5 rounded-3xl text-xs text-gray-300 space-y-2">
                    <p className="font-bold text-amber-400 flex items-center gap-2 text-xs md:text-sm">
                        <ShieldCheck className="w-4 h-4 text-amber-400" /> 투자 정보 법적 고지 및 면책 안내
                    </p>
                    <p className="leading-relaxed text-gray-400 text-xs md:text-[13px]">
                        {report?.disclaimer || "본 주말 마켓 인사이트 리포트는 과거 데이터와 예정된 경제 일정 등 객관적 사실만을 요약한 단순 정보 제공용 자료이며, 특정 종목에 대한 투자 권유나 개별 자문을 수행하지 않습니다. 투자의 최종 책임은 투자자 본인에게 있습니다."}
                    </p>
                </div>
            </main>
        </div>
    );
}
