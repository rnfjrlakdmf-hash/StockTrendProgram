"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
    Lock, Unlock, Gem, AlertCircle, Timer, Globe, Building2, Sparkles, 
    ShieldCheck, Crown, Flame, ArrowUpRight, TrendingUp, Zap, Layers,
    CheckCircle2, Compass, BarChart3, Copy, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/config';

interface ParsedQuantStock {
    name: string;
    volume: string;
    fact: string;
    tech: string;
    consensus: string;
}

export default function PremiumPage() {
    const { user } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'pulse' | 'quant' | 'catalyst' | 'risk'>('all');

    useEffect(() => {
        const fetchReport = async () => {
            if (!user) return;
            try {
                const userId = (user as any).uid || (user as any).id;
                const res = await fetch(`${API_BASE_URL}/api/auth/reports/premium?user_id=${userId}&t=${Date.now()}`, { cache: "no-store" });
                const data = await res.json();
                if (data.status === "success") {
                    setReport(data);
                }
            } catch (err) {
                console.error("Failed to fetch premium report", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchReport();
        } else {
            setIsLoading(false);
        }
    }, [user]);

    // Countdown to Midnight
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(23, 59, 59, 999);
            const diff = midnight.getTime() - now.getTime();
            
            if (diff <= 0) return "00:00:00";
            
            const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
            
            return `${h}:${m}:${s}`;
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleUnlock = async () => {
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        const confirmUnlock = window.confirm("💎 50 코인을 사용하여 VVIP 프리미엄 인텔리전스를 잠금 해제하시겠습니까?");
        if (!confirmUnlock) return;

        setIsUnlocking(true);
        try {
            const userId = (user as any).uid || (user as any).id;
            const res = await fetch(`${API_BASE_URL}/api/auth/reports/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    report_date: report?.data?.report_date
                })
            });
            const data = await res.json();

            if (data.status === "success") {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3500);
                
                const res2 = await fetch(`${API_BASE_URL}/api/reports/premium?user_id=${userId}`);
                const data2 = await res2.json();
                if (data2.status === "success") {
                    setReport(data2);
                }
                toast.success("🎉 VVIP 퀀트 인텔리전스가 잠금 해제되었습니다!");
                
                const fetchProfile = async () => {
                    const res3 = await fetch(`${API_BASE_URL}/api/user/${userId}/profile`);
                    const json3 = await res3.json();
                    if (json3.status === "success") {
                        window.dispatchEvent(new CustomEvent("coins_updated", { detail: json3.user.coins }));
                    }
                };
                fetchProfile();
            } else {
                toast.error("❌ 오류: " + data.message);
            }
        } catch (err) {
            console.error(err);
            toast.error("잠금 해제 중 오류가 발생했습니다.");
        } finally {
            setIsUnlocking(false);
        }
    };

    // Helper: Parse the raw text content into visual sections
    const parseVipReport = (rawContent: string) => {
        if (!rawContent) return { section1: '', quantStocks: [], section3: '', section4: '' };

        let section1 = '';
        const quantStocks: ParsedQuantStock[] = [];
        let section3 = '';
        let section4 = '';

        try {
            if (rawContent.includes('Section 1')) {
                const p1 = rawContent.split(/###\s*💎?\s*Section 1[^\n]*/i)[1] || '';
                const s2Split = p1.split(/###\s*🏆?\s*Section 2[^\n]*/i);
                section1 = s2Split[0].trim();

                if (s2Split.length > 1) {
                    const p2 = s2Split[1];
                    const s3Split = p2.split(/###\s*🚀?\s*Section 3[^\n]*/i);
                    const s2Raw = s3Split[0].trim();

                    const stockBlocks = s2Raw.split(/\n(?=-\s*\*\*)/);
                    for (const block of stockBlocks) {
                        const trimmed = block.trim();
                        if (!trimmed.startsWith('- **') && !trimmed.startsWith('-**')) continue;
                        const lines = trimmed.split('\n');
                        const headerMatch = lines[0].match(/-\s*\*\*([^\(]+)(?:\(([^)]+)\))?/);
                        const name = headerMatch ? headerMatch[1].replace(/\*\*/g, '').replace(':', '').trim() : '';
                        const volume = headerMatch && headerMatch[2] ? headerMatch[2].replace(/\*\*/g, '').trim() : '순매수 집중';

                        let fact = '';
                        let tech = '';
                        let consensus = '';

                        for (let i = 1; i < lines.length; i++) {
                            const l = lines[i].trim().replace(/^[-*•]\s*/, '');
                            if (l.includes('수급 팩트')) {
                                fact = l.split(/수급 팩트\*?\*?:/)[1]?.trim() || l.replace(/.*수급 팩트.*?:/, '').trim();
                            } else if (l.includes('기술적')) {
                                tech = l.split(/기술적[^\*:]*\*?\*?:/)[1]?.trim() || l.replace(/.*기술적.*?:/, '').trim();
                            } else if (l.includes('컨센서스')) {
                                consensus = l.split(/컨센서스[^\*:]*\*?\*?:/)[1]?.trim() || l.replace(/.*컨센서스.*?:/, '').trim();
                            }
                        }

                        if (name) {
                            quantStocks.push({ name, volume, fact, tech, consensus });
                        }
                    }

                    if (s3Split.length > 1) {
                        const p3 = s3Split[1];
                        const s4Split = p3.split(/###\s*🛡️?\s*Section 4[^\n]*/i);
                        section3 = s4Split[0].replace(/---.*/s, '').trim();

                        if (s4Split.length > 1) {
                            section4 = s4Split[1].replace(/---.*/s, '').replace(/\*※.*/s, '').trim();
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing VIP report:', e);
        }

        return { section1, quantStocks, section3, section4 };
    };

    const copyFullReport = () => {
        if (!report?.data?.content) return;
        navigator.clipboard.writeText(report.data.content);
        setCopied(true);
        toast.success("🎉 VVIP 인텔리전스 전문이 클립보드에 복사되었습니다!");
        setTimeout(() => setCopied(false), 2500);
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
                <Crown className="w-16 h-16 text-amber-400 mb-4 animate-bounce" />
                <h1 className="text-2xl md:text-3xl font-black text-white mb-2">VVIP 프리미엄 인텔리전스</h1>
                <p className="text-gray-400 mb-6 text-sm">기관/외국인 수급과 퀀트 알파 분석을 열람하려면 로그인이 필요합니다.</p>
            </div>
        );
    }

    const { section1, quantStocks, section3, section4 } = report?.data?.content 
        ? parseVipReport(report.data.content) 
        : { section1: '', quantStocks: [], section3: '', section4: '' };

    return (
        <div className="min-h-screen bg-[#07080d] text-gray-100 p-4 md:p-8 max-w-5xl mx-auto relative overflow-hidden font-sans">
            {/* Ambient Background Glowing Auroras */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed bottom-10 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                    <div className="text-7xl animate-bounce">👑💎✨🚀</div>
                </div>
            )}

            {/* Prestige Top Header Banner */}
            <div className="relative mb-8 pb-6 border-b border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="relative p-3.5 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.35)] text-black font-black flex items-center justify-center">
                            <Crown className="w-7 h-7 text-black drop-shadow-sm" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                                    VVIP QUANT TERMINAL
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                    {report?.data?.report_date || "2026-08-28"} KST
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-400 tracking-tight">
                                VIP 데일리 퀀트 & 주도 섹터 인텔리전스
                            </h1>
                        </div>
                    </div>

                    {/* Live Status & Lock Pill */}
                    <div className="flex items-center gap-2 self-start md:self-center">
                        {report?.locked ? (
                            <div className="bg-rose-500/10 text-rose-400 text-xs font-black px-4 py-2 rounded-2xl border border-rose-500/30 flex items-center gap-1.5 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                                <Lock className="w-3.5 h-3.5" />
                                VVIP 전용 잠금
                            </div>
                        ) : (
                            <div className="bg-emerald-500/10 text-emerald-400 text-xs font-black px-4 py-2 rounded-2xl border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                <Unlock className="w-3.5 h-3.5" />
                                열람 권한 활성화
                            </div>
                        )}
                        {!report?.locked && timeLeft && (
                            <div className="flex items-center gap-2 text-xs md:text-sm font-mono tabular-nums bg-amber-500/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-500/30 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                                <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                <span className="font-black tracking-wider">{timeLeft}</span>
                                <span className="text-[10px] text-amber-400/80 font-sans">남음</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col justify-center items-center h-80 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div>
                    <p className="text-xs font-mono text-amber-400/80 animate-pulse">VVIP QUANT ENGINE COMPUTING...</p>
                </div>
            ) : report && report.data ? (
                <div className="space-y-8">
                    {/* Unlocked Mode Interactive Tab Bar */}
                    {!report.locked && (
                        <div className="flex items-center gap-2 p-1.5 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto scrollbar-none shadow-xl">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'all'
                                        ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black shadow-lg shadow-amber-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                전체 브리핑
                            </button>
                            <button
                                onClick={() => setActiveTab('pulse')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'pulse'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Compass className="w-3.5 h-3.5 text-amber-400" />
                                1. 자금 대이동
                            </button>
                            <button
                                onClick={() => setActiveTab('quant')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'quant'
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Crown className="w-3.5 h-3.5 text-cyan-400" />
                                2. 퀀트 알파 3선
                            </button>
                            <button
                                onClick={() => setActiveTab('catalyst')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'catalyst'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Zap className="w-3.5 h-3.5 text-purple-400" />
                                3. 내일 주도 테마
                            </button>
                            <button
                                onClick={() => setActiveTab('risk')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'risk'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                4. 리스크 관리
                            </button>
                        </div>
                    )}

                    {/* Report Content Body */}
                    {report.locked ? (
                        /* Locked State: Clean Section 1 + Gold Vault Locked Card */
                        <div className="space-y-8">
                            {/* Section 1 Free Preview Card */}
                            <div className="relative bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-950 border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
                                            <Compass className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                                                💎 Section 1. 스마트머니 자금 대이동 맥락
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    무료 공개
                                                </span>
                                            </h3>
                                            <p className="text-xs text-gray-400">외인·기관 거대 자금의 섹터 로테이션 및 집중 이동 흐름</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm md:text-base text-gray-200 leading-relaxed font-normal whitespace-pre-line">
                                    {section1 || report.data.content || report.data.preview}
                                </p>
                            </div>

                            {/* Luxury Gold Vault Lock Card */}
                            <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 p-8 md:p-12 bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-zinc-950 shadow-2xl flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl p-0.5 shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center justify-center mb-5">
                                    <div className="w-full h-full bg-zinc-950 rounded-[22px] flex items-center justify-center text-amber-400">
                                        <Lock className="w-7 h-7" />
                                    </div>
                                </div>

                                <h3 className="text-xl md:text-2xl font-black text-white mb-2">
                                    VVIP 프리미엄 인텔리전스 잠금
                                </h3>
                                <p className="text-xs md:text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
                                    오늘 시장에서 외인·기관 퀀트 스코어 1위 종목들의 수급 팩트와 기술적 맥점, 내일의 주도 테마 밸류체인 심층 분석을 즉시 확인하세요.
                                </p>

                                {/* 3 Feature Badges */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mb-8">
                                    <div className="bg-zinc-900/90 border border-amber-500/20 rounded-2xl p-3 text-left">
                                        <span className="text-amber-400 text-xs font-black block mb-1">🏆 퀀트 알파 3선</span>
                                        <p className="text-[11px] text-gray-400 leading-tight">수급+이평선+컨센서스 종합 점수 1위</p>
                                    </div>
                                    <div className="bg-zinc-900/90 border border-cyan-500/20 rounded-2xl p-3 text-left">
                                        <span className="text-cyan-400 text-xs font-black block mb-1">🚀 내일 주도 테마</span>
                                        <p className="text-[11px] text-gray-400 leading-tight">소부장 & 핵심 밸류체인 연결고리</p>
                                    </div>
                                    <div className="bg-zinc-900/90 border border-emerald-500/20 rounded-2xl p-3 text-left">
                                        <span className="text-emerald-400 text-xs font-black block mb-1">🛡️ 헷지 & 리스크</span>
                                        <p className="text-[11px] text-gray-400 leading-tight">선물/인버스 포지션 기반 방어선</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUnlock}
                                    disabled={isUnlocking}
                                    className="w-full max-w-md py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-sm md:text-base shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                                >
                                    {isUnlocking ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                                    ) : (
                                        <>
                                            <span className="text-lg">🪙</span>
                                            50 코인으로 VVIP 전체 잠금 해제
                                        </>
                                    )}
                                </button>
                                <p className="text-[11px] text-gray-500 mt-3.5 flex items-center justify-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                    매일 출석체크로 무료 지급되는 코인으로 열람 가능합니다.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Unlocked State: Ultra Luxury Bento Executive Cards */
                        <div className="space-y-10">
                            
                            {/* 💎 SECTION 1: 스마트머니 자금 대이동 맥락 */}
                            {(activeTab === 'all' || activeTab === 'pulse') && section1 && (
                                <section className="relative bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-zinc-950 border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/30 rounded-2xl text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                                <Compass className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-amber-400 tracking-widest block uppercase">
                                                    SECTION 01 · MARKET ROTATION
                                                </span>
                                                <h3 className="text-lg md:text-xl font-black text-white">
                                                    스마트머니 자금 대이동 맥락
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm md:text-base text-gray-200 leading-relaxed font-normal bg-zinc-950/60 border border-white/5 rounded-2xl p-5 md:p-6">
                                        {section1}
                                    </div>
                                </section>
                            )}

                            {/* 🏆 SECTION 2: VVIP 퀀트 밸런스 알파 3선 */}
                            {(activeTab === 'all' || activeTab === 'quant') && (
                                <section className="space-y-5">
                                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-gradient-to-br from-cyan-400/20 to-blue-600/10 border border-cyan-500/30 rounded-2xl text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                                <Crown className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-widest block uppercase">
                                                    SECTION 02 · QUANT BALANCE TOP 3
                                                </span>
                                                <h3 className="text-lg md:text-xl font-black text-white">
                                                    VVIP 퀀트 밸런스 알파 3선
                                                </h3>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-500/10 px-3.5 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                            ALPHA TOP 3
                                        </span>
                                    </div>

                                    {quantStocks.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-5">
                                            {quantStocks.map((stock, idx) => (
                                                <div 
                                                    key={idx}
                                                    className={`relative rounded-3xl p-6 md:p-7 transition-all duration-300 shadow-2xl border ${
                                                        idx === 0 
                                                            ? 'bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-950 border-amber-500/40 hover:border-amber-400 shadow-amber-500/5' 
                                                            : idx === 1 
                                                            ? 'bg-gradient-to-br from-slate-900/30 via-zinc-950 to-zinc-950 border-slate-400/30 hover:border-slate-300' 
                                                            : 'bg-gradient-to-br from-amber-950/10 via-zinc-950 to-zinc-950 border-amber-700/30 hover:border-amber-600'
                                                    }`}
                                                >
                                                    {/* Stock Header */}
                                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5 mb-5">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-black shadow-md ${
                                                                idx === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-black' :
                                                                idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black' :
                                                                'bg-gradient-to-br from-amber-700 to-amber-900 text-white'
                                                            }`}>
                                                                #{idx + 1}
                                                            </span>
                                                            <div>
                                                                <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                                                    {stock.name}
                                                                </h4>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-1.5 rounded-xl shadow-sm">
                                                            {stock.volume}
                                                        </span>
                                                    </div>

                                                    {/* 3 Pillar Micro Bento Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                                        {/* 1. 수급 팩트 */}
                                                        <div className="bg-zinc-900/80 border border-cyan-500/20 hover:border-cyan-500/40 rounded-2xl p-4 transition-all">
                                                            <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 mb-2">
                                                                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                                                                수급 팩트 (Supply)
                                                            </div>
                                                            <p className="text-xs text-gray-300 leading-relaxed font-normal">
                                                                {stock.fact || "수급 집중 유입 확인"}
                                                            </p>
                                                        </div>

                                                        {/* 2. 기술적 지표 */}
                                                        <div className="bg-zinc-900/80 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-4 transition-all">
                                                            <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5 mb-2">
                                                                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                                                                기술적 위치 (Technical)
                                                            </div>
                                                            <p className="text-xs text-gray-300 leading-relaxed font-normal">
                                                                {stock.tech || "안정적 지지선 확보"}
                                                            </p>
                                                        </div>

                                                        {/* 3. 증권사 컨센서스 */}
                                                        <div className="bg-zinc-900/80 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-4 transition-all">
                                                            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                                컨센서스 (Target)
                                                            </div>
                                                            <p className="text-xs text-gray-300 leading-relaxed font-normal">
                                                                {stock.consensus || "증권사 긍정적 평가"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="prose prose-invert max-w-none text-sm text-gray-300 bg-zinc-950/70 p-6 rounded-3xl border border-white/5">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {report.data.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* 🚀 SECTION 3: 내일의 주도 유망 테마 & 밸류체인 레이더 */}
                            {(activeTab === 'all' || activeTab === 'catalyst') && section3 && (
                                <section className="relative bg-gradient-to-br from-purple-950/20 via-zinc-950 to-zinc-950 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-gradient-to-br from-purple-400/20 to-indigo-600/10 border border-purple-500/30 rounded-2xl text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-purple-400 tracking-widest block uppercase">
                                                    SECTION 03 · TOMORROW CATALYST
                                                </span>
                                                <h3 className="text-lg md:text-xl font-black text-white">
                                                    내일의 주도 유망 테마 & 밸류체인 레이더
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm md:text-base text-gray-200 leading-relaxed font-normal bg-zinc-950/60 border border-white/5 rounded-2xl p-5 md:p-6">
                                        {section3}
                                    </div>
                                </section>
                            )}

                            {/* 🛡️ SECTION 4: 지수 변동성 헷지 & 리스크 관리 분석 */}
                            {(activeTab === 'all' || activeTab === 'risk') && section4 && (
                                <section className="relative bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950 border border-emerald-500/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-gradient-to-br from-emerald-400/20 to-teal-600/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-widest block uppercase">
                                                    SECTION 04 · RISK & HEDGE DEFENSE
                                                </span>
                                                <h3 className="text-lg md:text-xl font-black text-white">
                                                    지수 변동성 헷지 & 리스크 관리 분석
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm md:text-base text-gray-200 leading-relaxed font-normal bg-zinc-950/60 border border-white/5 rounded-2xl p-5 md:p-6">
                                        {section4}
                                    </div>
                                </section>
                            )}

                            {/* Action Footer */}
                            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button
                                    onClick={copyFullReport}
                                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-white font-bold text-xs md:text-sm border border-white/10 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-400" />
                                            <span className="text-emerald-300 font-bold">VVIP 전문 복사 완료</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 text-amber-400" />
                                            <span>VVIP 리포트 전체 복사하기</span>
                                        </>
                                    )}
                                </button>
                                <p className="text-[11px] text-gray-500 font-mono tracking-wider">
                                    VVIP QUANT TERMINAL · CONFIDENTIAL INTELLIGENCE
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-16 bg-zinc-950 rounded-3xl border border-white/5">
                    리포트 데이터를 불러올 수 없습니다.
                </div>
            )}

            {/* 자본시장법 준수 법적 면책 안내 */}
            <div className="mt-12 p-6 bg-zinc-950/90 border border-white/5 rounded-3xl text-[11px] text-gray-400 space-y-2">
                <p className="font-bold text-amber-400/90 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" /> VVIP 퀀트 투자 정보 법적 고지 및 유의사항
                </p>
                <p className="leading-relaxed text-gray-500">
                    본 VIP 프리미엄 리포트는 한국거래소(KRX) 공시 데이터 및 정량적 퀀트 알고리즘 통계를 기반으로 자동 생성된 단순 정보 제공용 자료이며, 특정 금융투자상품의 매수·매도를 권유하거나 1:1 개별 자문을 수행하지 않습니다. 모든 투자 판단 및 최종 책임은 투자자 본인에게 있습니다.
                </p>
            </div>
        </div>
    );
}
