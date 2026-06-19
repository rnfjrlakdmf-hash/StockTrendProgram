"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Clock, Calendar, CheckCircle, TrendingUp, AlertTriangle, Share2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

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

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/weekend-report`)
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
                title: '주말 한정 마켓 인사이트',
                text: '이번 주 시장 핵심 팩트와 다음 주 일정을 확인하세요!',
                url: window.location.href,
            }).catch(console.error);
        } else {
            alert("공유하기를 지원하지 않는 브라우저입니다.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data?.is_open) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px]"></div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 flex flex-col items-center text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-gray-800/80 rounded-2xl border border-gray-700 flex items-center justify-center mb-8 shadow-2xl">
                        <Lock className="w-10 h-10 text-indigo-400" />
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-3 tracking-tight">주말 한정 프리미엄 인사이트</h1>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        평일에는 굳게 닫혀있습니다.<br/>
                        토요일 오전 10시, 지난주 시장의 핵심 팩트와<br/>
                        다음 주 필수 체크포인트가 독점 공개됩니다.
                    </p>
                    
                    <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 w-full shadow-2xl">
                        <div className="flex items-center justify-center gap-2 text-gray-400 mb-3 text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            <span>오픈까지 남은 시간</span>
                        </div>
                        <div className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            {timeLeft > 0 ? formatTime(timeLeft) : "곧 열립니다!"}
                        </div>
                    </div>
                    
                    <div className="mt-8 text-sm text-gray-500 bg-gray-800/30 px-4 py-2 rounded-full border border-gray-800">
                        알림 권한을 켜두시면 오픈 시 푸시를 보내드립니다.
                    </div>
                </motion.div>
            </div>
        );
    }

    const { report } = data;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-gray-100 pb-20">
            {/* Premium Header */}
            <header className="relative pt-20 pb-12 px-6 overflow-hidden border-b border-gray-800/50">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="w-64 h-64" />
                </div>
                
                <div className="relative z-10 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
                        <Calendar className="w-4 h-4" />
                        주말 한정 열람 (일요일 자정 파기)
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
                        {report?.title || "주말 마켓 인사이트"}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 font-light">
                        {report?.subtitle || "이번 주 핵심 팩트와 다음 주 경제 일정"}
                    </p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
                {/* Executive Summary */}
                <section className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-3xl p-8 backdrop-blur-sm shadow-xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        1분 마켓 서머리
                    </h2>
                    <ul className="space-y-4">
                        {report?.week_summary_bullets?.map((bullet, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0"></span>
                                <span className="text-gray-300 leading-relaxed text-lg">{bullet.replace(/^·\s*/, '')}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Main Sections */}
                <div className="grid md:grid-cols-2 gap-6">
                    {report?.sections?.map((section, idx) => (
                        <section key={idx} className="bg-gray-800/30 border border-gray-800 rounded-3xl p-8 hover:bg-gray-800/40 transition-colors">
                            <div className="text-3xl mb-4">{section.emoji}</div>
                            <h3 className="text-xl font-bold mb-4 text-white">{section.title}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {section.content}
                            </p>
                        </section>
                    ))}
                </div>

                {/* Share Button */}
                <div className="flex justify-center pt-8">
                    <button 
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Share2 className="w-5 h-5" />
                        이 인사이트를 지인에게 공유하기
                    </button>
                </div>

                {/* Disclaimer */}
                <div className="mt-16 bg-gray-900/80 border border-gray-800 rounded-2xl p-6 text-xs text-gray-500 leading-relaxed flex gap-4">
                    <AlertTriangle className="w-6 h-6 text-gray-600 flex-shrink-0" />
                    <p>
                        {report?.disclaimer || "본 리포트는 과거 데이터와 예정된 일정 등 객관적 사실만을 요약한 참고 자료입니다. 특정 종목에 대한 투자 권유나 추천이 아니며, 투자의 최종 책임은 본인에게 있습니다."}
                    </p>
                </div>
            </main>
        </div>
    );
}
