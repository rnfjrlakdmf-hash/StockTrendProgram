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
    whale_sectors?: { sector: string; leader: string; intensity: string; flow_reason: string }[];
    hidden_whales?: { stock: string; amount: string; pattern: string; catalyst: string }[];
    foreign_analysis: { stock: string; amount?: string; reason: string }[];
    inst_analysis: { stock: string; amount?: string; reason: string }[];
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
        fetch(`${API_BASE_URL}/api/weekend-whale-report?t=${Date.now()}`, { cache: 'no-store' })
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
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data?.is_open) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]"></div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 flex flex-col items-center text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-zinc-900/80 rounded-3xl border border-cyan-500/30 flex items-center justify-center mb-8 shadow-2xl">
                        <Lock className="w-10 h-10 text-cyan-400" />
                    </div>
                    
                    <h1 className="text-2xl md:text-3xl font-black mb-3 tracking-tight">주말 한정 슈퍼 고래 수급 리포트</h1>
                    <p className="text-gray-400 mb-8 leading-relaxed text-sm">
                        한 주간 거대 고래(외인·기관)의 자금 대이동 분석은<br/>
                        주말(금요일 오후 6시 ~ 월요일 오전 8시)에만 공개됩니다.
                    </p>
                    
                    <div className="bg-zinc-900/60 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 w-full shadow-2xl">
                        <div className="flex items-center justify-center gap-2 text-gray-400 mb-3 text-sm font-medium">
                            <Clock className="w-4 h-4 text-cyan-400" />
                            <span>오픈까지 남은 시간</span>
                        </div>
                        <div className="text-3xl md:text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                            {timeLeft > 0 ? formatTime(timeLeft) : "곧 열립니다!"}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    const { report } = data;

    return (
        <div className="min-h-screen bg-[#07090e] text-gray-100 pb-20">
            {/* Header */}
            <header className="relative pt-24 pb-12 px-6 overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-indigo-950/20 to-transparent"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="w-64 h-64 text-cyan-400" />
                </div>
                
                <div className="relative z-10 max-w-5xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black mb-4">
                        <Anchor className="w-3.5 h-3.5" />
                        {(data as any)?.is_current_weekend 
                            ? "🔥 주말 특별 라이브 (한 주간 고래 자금 엑스레이)" 
                            : "📰 지난 주말 특별 리포트 다시보기"}
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black mb-3 leading-tight tracking-tight text-white">
                        {report?.title || "주말 한정판: 슈퍼 고래(Whale) 수급 심층 엑스레이"}
                    </h1>
                    <p className="text-sm md:text-base text-cyan-200/70 font-medium leading-relaxed max-w-2xl">
                        {report?.subtitle || "한 주간 시장을 뒤흔든 슈퍼 고래들의 집중 매집 섹터와 은밀한 매집주를 해부합니다."}
                    </p>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-10">
                
                {/* 1. 주간 슈퍼 고래 집중 섹터 맵 */}
                {report?.whale_sectors && report.whale_sectors.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                            <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-white">
                                    🐋 주간 슈퍼 고래 집중 섹터 맵 (Whale Sector Map)
                                </h2>
                                <p className="text-xs sm:text-sm text-zinc-300 font-medium">한 주간 거대 자본(수천억 원대)이 집중된 상위 3대 주도 산업군</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {report.whale_sectors.map((sec, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-gradient-to-b from-cyan-950/20 via-zinc-950/80 to-zinc-950/90 border-l-4 border-cyan-400 rounded-3xl p-6 transition-all shadow-lg flex flex-col justify-between hover:from-cyan-950/30"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className="text-xs font-black text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 px-3 py-1 rounded-xl">
                                                주도 섹터 #{idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-lg">
                                                {sec.intensity || "집중 유입"}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-white mb-1.5">
                                            {sec.sector}
                                        </h3>
                                        <p className="text-xs sm:text-sm font-bold text-zinc-300 mb-3.5">
                                            대표 종목: <span className="text-cyan-300">{sec.leader}</span>
                                        </p>
                                        <p className="text-sm sm:text-[15px] text-zinc-100 leading-relaxed font-normal">
                                            {sec.flow_reason}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. 고래들의 은밀한 매집주 */}
                {report?.hidden_whales && report.hidden_whales.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-white">
                                    🔍 고래들의 은밀한 매집주 (Hidden Whale Accumulation)
                                </h2>
                                <p className="text-xs sm:text-sm text-zinc-300 font-medium">주가는 횡보/조정 중이나 외인·기관이 조용히 수량을 축적한 종목군</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {report.hidden_whales.map((hw, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-zinc-950/80 border border-indigo-500/20 hover:border-indigo-500/50 rounded-3xl p-5 transition-all shadow-lg flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/5">
                                            <h3 className="text-lg font-black text-white">
                                                {hw.stock}
                                            </h3>
                                            <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg">
                                                {hw.amount}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 text-xs text-gray-300">
                                            <p className="leading-relaxed font-medium text-cyan-200/90">
                                                📌 {hw.pattern}
                                            </p>
                                            <p className="leading-relaxed text-gray-400">
                                                💡 {hw.catalyst}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 3. Foreign & Institution Top 10 Facts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Foreign Top 10 */}
                    <section className="bg-zinc-950/70 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-sm shadow-xl">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2.5 text-cyan-400 pb-3 border-b border-white/5">
                            <Anchor className="w-5 h-5" /> 외국인 주간 순매수 TOP 10
                        </h2>
                        <div className="space-y-3">
                            {report?.foreign_analysis?.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-zinc-900/60 border border-white/5 hover:border-cyan-500/30 rounded-2xl p-3.5 flex items-start gap-3 transition-all"
                                >
                                    <div className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center font-black text-xs border border-cyan-500/20 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                            <h3 className="text-lg font-black text-white">
                                                {item.stock}
                                            </h3>
                                            {item.amount && (
                                                <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                                                    {item.amount.includes('주') ? item.amount : `${item.amount}주`}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-zinc-100 text-sm sm:text-[15px] leading-relaxed font-normal">
                                            {item.reason}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Institution Top 10 */}
                    <section className="bg-zinc-950/70 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-sm shadow-xl">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2.5 text-indigo-400 pb-3 border-b border-white/5">
                            <Briefcase className="w-5 h-5" /> 기관 주간 순매수 TOP 10
                        </h2>
                        <div className="space-y-3">
                            {report?.inst_analysis?.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-zinc-900/60 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-3.5 flex items-start gap-3 transition-all"
                                >
                                    <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center font-black text-xs border border-indigo-500/20 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                            <h3 className="text-lg font-black text-white">
                                                {item.stock}
                                            </h3>
                                            {item.amount && (
                                                <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                                    {item.amount.includes('주') ? item.amount : `${item.amount}주`}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-zinc-100 text-sm sm:text-[15px] leading-relaxed font-normal">
                                            {item.reason}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* 4. Monday Strategy */}
                <section className="bg-gradient-to-br from-zinc-900/90 via-zinc-900 to-indigo-950/30 border border-indigo-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
                    <h2 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2 text-emerald-400 pb-3 border-b border-white/10">
                        <CheckCircle className="w-6 h-6" />
                        🎯 다음 주 월요일 시초가 공략 로드맵 (Monday Opening Playbook)
                    </h2>
                    <div className="text-gray-200 leading-relaxed text-xs md:text-sm whitespace-pre-line space-y-2 font-normal">
                        {report?.monday_strategy}
                    </div>
                </section>

                {/* 5. Disclaimer */}
                <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-3xl text-[11px] text-gray-400 space-y-1.5">
                    <p className="font-bold text-cyan-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-cyan-400" /> 주말 수급 정보 법적 안내 및 유의사항
                    </p>
                    <p className="leading-relaxed text-gray-500">
                        본 주말 고래 수급 리포트는 한국거래소(KRX) 주간 수급 통계 및 공시 데이터를 요약한 단순 정보 제공용 자료이며, 특정 종목의 매수·매도를 권유하지 않습니다. 투자 판단의 최종 책임은 투자자 본인에게 있습니다.
                    </p>
                </div>
            </main>

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </div>
    );
}
