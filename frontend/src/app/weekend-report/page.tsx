"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Clock, Calendar, CheckCircle2, TrendingUp, AlertTriangle, Share2, ArrowLeft, Flame, Sparkles, Check } from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';

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
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                alert("링크 복사에 실패했습니다.");
            });
        }
    };

    // Helper to parse section content into structured items
    const renderParsedContent = (content: string) => {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        
        return (
            <div className="space-y-3">
                {lines.map((line, idx) => {
                    const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
                    
                    // Check if line contains a colon separator (e.g. "기술 및 반도체: 설명..." or "8월 25일(화): 일정...")
                    const colonIdx = cleanLine.indexOf(':');
                    if (colonIdx > 0 && colonIdx < 30) {
                        const tag = cleanLine.substring(0, colonIdx).trim();
                        const desc = cleanLine.substring(colonIdx + 1).trim();
                        
                        const isDate = tag.includes('월') && tag.includes('일');

                        return (
                            <div key={idx} className="bg-zinc-950/70 border border-white/5 hover:border-white/15 p-4 rounded-2xl transition-all flex flex-col gap-1.5 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${
                                        isDate 
                                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 font-mono' 
                                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                    }`}>
                                        {tag}
                                    </span>
                                </div>
                                <p className="text-xs md:text-sm text-gray-300 leading-relaxed pl-0.5">
                                    {desc}
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className="bg-zinc-950/50 border border-white/5 p-3.5 rounded-2xl text-xs md:text-sm text-gray-300 leading-relaxed">
                            {cleanLine}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-500 font-bold">마켓 인사이트를 불러오는 중...</span>
            </div>
        );
    }

    if (!data?.is_open) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-[120px]"></div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 flex flex-col items-center text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                        <Lock className="w-9 h-9 text-blue-400" />
                    </div>
                    
                    <h1 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">주말 한정 마켓 인사이트</h1>
                    <p className="text-xs sm:text-sm text-gray-400 mb-8 leading-relaxed">
                        토요일 오전 10시, 지난주 시장의 핵심 팩트 요약과<br/>
                        다음 주 필수 체크포인트가 독점 공개됩니다.
                    </p>
                    
                    <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 w-full shadow-2xl">
                        <div className="flex items-center justify-center gap-2 text-gray-400 mb-3 text-xs font-bold">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span>오픈까지 남은 시간</span>
                        </div>
                        <div className="text-3xl sm:text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                            {timeLeft > 0 ? formatTime(timeLeft) : "곧 열립니다!"}
                        </div>
                    </div>
                    
                    <Link href="/" className="mt-8 text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" /> 홈으로 돌아가기
                    </Link>
                </motion.div>
            </div>
        );
    }

    const { report } = data;

    return (
        <div className="min-h-screen bg-[#09090b] text-gray-200 pb-20">
            {/* Header */}
            <header className="relative pt-12 pb-10 px-4 sm:px-6 overflow-hidden border-b border-white/5 bg-gradient-to-b from-zinc-900/80 via-zinc-900/40 to-transparent">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors p-1 rounded-lg">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>홈으로 돌아가기</span>
                        </Link>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-blue-400 text-xs font-bold shadow-sm">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                                {(data as any)?.is_current_weekend 
                                    ? "🔥 주말 특별 라이브 리포트 (일요일 자정 마감)" 
                                    : "지난 주말 특별 리포트 다시보기"}
                            </span>
                        </div>
                    </div>
                    
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 leading-tight tracking-tight">
                        {report?.title || "주말 마켓 인사이트: 지난주 시장 데이터와 다음 주 경제 일정"}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-400 font-medium leading-relaxed">
                        {report?.subtitle || "이번 주 시장 핵심 팩트 요약과 다음 주 주요 경제 캘린더"}
                    </p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {/* 1. 1분 마켓 서머리 */}
                <section className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white">1분 마켓 핵심 서머리</h2>
                                <p className="text-xs text-gray-400">지난주 시장 흐름의 가장 중요한 핵심 요약입니다.</p>
                            </div>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            WEEKLY BRIEF
                        </span>
                    </div>

                    <div className="space-y-3">
                        {report?.week_summary_bullets?.map((bullet, idx) => (
                            <div key={idx} className="flex items-start gap-3.5 bg-zinc-950/60 border border-white/5 p-4 rounded-2xl hover:border-white/15 transition-all">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-black font-mono shrink-0 mt-0.5">
                                    {idx + 1}
                                </div>
                                <span className="text-xs md:text-sm text-gray-200 leading-relaxed font-medium">
                                    {bullet.replace(/^[•\-\*·]\s*/, '')}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. 상세 섹션 (2-Column Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {report?.sections?.map((section, idx) => (
                        <section key={idx} className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/5">
                                    <span className="text-2xl p-1 bg-zinc-950 rounded-xl border border-white/5">{section.emoji}</span>
                                    <h3 className="text-base font-black text-white">{section.title}</h3>
                                </div>
                                {renderParsedContent(section.content)}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Kakao AdFit In-Feed Banner */}
                <KakaoRevenueAd type="feed" />

                {/* 3. 공유하기 버튼 */}
                <div className="flex flex-col items-center justify-center pt-4">
                    <button 
                        onClick={handleShare}
                        className="flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm sm:text-base shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95"
                    >
                        {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Share2 className="w-5 h-5" />}
                        <span>{copied ? "링크가 복사되었습니다!" : "이 인사이트를 지인에게 공유하기"}</span>
                    </button>
                    <p className="text-[11px] text-gray-500 mt-2">주변 투자자 동료와 함께 핵심 마켓 일정을 공유해보세요.</p>
                </div>

                {/* 4. 면책 안내 */}
                <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 text-xs text-gray-400 leading-relaxed flex items-start gap-3.5 shadow-md">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <strong className="text-gray-300 font-bold block mb-1">투자 정보 면책 안내</strong>
                        <p className="text-gray-500">
                            {report?.disclaimer || "본 리포트는 과거 데이터와 예정된 경제 일정 등 객관적 사실만을 요약한 참고 자료입니다. 특정 종목에 대한 투자 권유나 추천이 아니며, 투자의 최종 책임은 본인에게 있습니다."}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
