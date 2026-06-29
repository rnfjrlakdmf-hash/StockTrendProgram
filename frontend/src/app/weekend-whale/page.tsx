"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Clock, TrendingUp, Anchor, Briefcase, ChevronRight, CheckCircle, Share2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/LoginModal';

interface WhaleReport {
    title: string;
    subtitle: string;
    foreign_analysis: { stock: string; reason: string }[];
    inst_analysis: { stock: string; reason: string }[];
    monday_strategy: string;
    generated_at: string;
}

interface ReportResponse {
    is_open: boolean;
    opens_at?: string;
    countdown_seconds?: number;
    report?: WhaleReport;
}

export default function WeekendWhalePage() {
    const { user } = useAuth();
    const [data, setData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/weekend-whale-report`)
            .then(res => res.json())
            .then((resData: ReportResponse) => {
                setData(resData);
                if (!resData.is_open && resData.countdown_seconds) {
                    setTimeLeft(resData.countdown_seconds);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch whale report", err);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data?.is_open) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]"></div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 flex flex-col items-center text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-gray-800/80 rounded-2xl border border-gray-700 flex items-center justify-center mb-8 shadow-2xl">
                        <Lock className="w-10 h-10 text-blue-400" />
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-3 tracking-tight">주말 한정 매집 리포트</h1>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        세력과 외국인의 수급 데이터 분석은<br/>
                        주말(금요일 오후 6시 ~ 월요일 오전 8시)에만 공개됩니다.
                    </p>
                    
                    <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 w-full shadow-2xl">
                        <div className="flex items-center justify-center gap-2 text-gray-400 mb-3 text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            <span>오픈까지 남은 시간</span>
                        </div>
                        <div className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            {timeLeft > 0 ? formatTime(timeLeft) : "곧 열립니다!"}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    const { report } = data;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-gray-100 pb-20">
            {/* Header */}
            <header className="relative pt-20 pb-12 px-6 overflow-hidden border-b border-gray-800/50">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="w-64 h-64" />
                </div>
                
                <div className="relative z-10 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                        <Anchor className="w-4 h-4" />
                        주말 한정 열람 (스마트머니 추적)
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
                        {report?.title || "주말 한정판: 세력/외인 매집 TOP 3"}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 font-light">
                        {report?.subtitle || "금요일 장 마감 기준 외국인/기관 수급 완전 분석"}
                    </p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
                
                {/* Foreign Top 10 */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
                        <Anchor className="w-8 h-8" /> 외국인 순매수 TOP 10
                    </h2>
                    <div className="grid gap-4 relative">
                        {report?.foreign_analysis?.map((item, idx) => {
                            const isBlurred = !user && idx >= 3;
                            return (
                                <div key={idx} className={`bg-gray-800/30 border border-gray-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-6 transition-colors ${isBlurred ? 'blur-md opacity-70 pointer-events-none select-none' : 'hover:bg-gray-800/50'}`}>
                                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center font-black text-2xl text-blue-400">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-white mb-2">{item.stock}</h3>
                                        <p className="text-gray-400 leading-relaxed text-lg">{item.reason}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {!user && report?.foreign_analysis && report.foreign_analysis.length > 3 && (
                            <div className="absolute inset-x-0 bottom-0 top-[350px] flex items-center justify-center z-10 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent rounded-3xl">
                                <button 
                                    onClick={() => setShowLoginModal(true)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-3 transition-transform hover:scale-105"
                                >
                                    <Lock className="w-6 h-6" />
                                    로그인하고 4~10위 분석 확인하기
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Institution Top 10 */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-purple-400">
                        <Briefcase className="w-8 h-8" /> 기관 순매수 TOP 10
                    </h2>
                    <div className="grid gap-4 relative">
                        {report?.inst_analysis?.map((item, idx) => {
                            const isBlurred = !user && idx >= 3;
                            return (
                                <div key={idx} className={`bg-gray-800/30 border border-gray-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-6 transition-colors ${isBlurred ? 'blur-md opacity-70 pointer-events-none select-none' : 'hover:bg-gray-800/50'}`}>
                                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center font-black text-2xl text-purple-400">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-white mb-2">{item.stock}</h3>
                                        <p className="text-gray-400 leading-relaxed text-lg">{item.reason}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {!user && report?.inst_analysis && report.inst_analysis.length > 3 && (
                            <div className="absolute inset-x-0 bottom-0 top-[350px] flex items-center justify-center z-10 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent rounded-3xl">
                                <button 
                                    onClick={() => setShowLoginModal(true)}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-3 transition-transform hover:scale-105"
                                >
                                    <Lock className="w-6 h-6" />
                                    로그인하고 4~10위 분석 확인하기
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Monday Strategy */}
                <section className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-3xl p-8 backdrop-blur-sm shadow-xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        월요일 시장 대응 전략
                    </h2>
                    <p className="text-gray-300 leading-relaxed text-lg">
                        {report?.monday_strategy}
                    </p>
                </section>

                {/* Disclaimer */}
                <div className="mt-16 bg-gray-900/80 border border-gray-800 rounded-2xl p-6 text-xs text-gray-500 leading-relaxed flex gap-4">
                    <AlertTriangle className="w-6 h-6 text-gray-600 flex-shrink-0" />
                    <p>
                        본 리포트는 과거 데이터와 예정된 일정 등 객관적 사실만을 요약한 참고 자료입니다. 특정 종목에 대한 투자 권유나 추천이 아니며, 투자의 최종 책임은 본인에게 있습니다.
                    </p>
                </div>
            </main>

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </div>
    );
}
