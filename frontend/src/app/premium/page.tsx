"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Unlock, Gem, AlertCircle, Timer, Globe, Building2, Sparkles, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/config';

export default function PremiumPage() {
    const { user } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [copied, setCopied] = useState(false);

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

    // Timer Logic for Countdown to Midnight
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

        const confirmUnlock = window.confirm("50 코인을 사용하여 리포트를 잠금 해제하시겠습니까?");
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
                setTimeout(() => setShowConfetti(false), 3000);
                
                const res2 = await fetch(`${API_BASE_URL}/api/reports/premium?user_id=${userId}`);
                const data2 = await res2.json();
                if (data2.status === "success") {
                    setReport(data2);
                }
                toast.success("🎉 VIP 수급 리포트가 잠금 해제되었습니다!");
                
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

    const [activeTab, setActiveTab] = useState<'all' | 'pulse' | 'quant' | 'catalyst' | 'risk'>('all');

    // Helper: Parse the raw text content into visual sections
    const parseVipReport = (rawContent: string) => {
        if (!rawContent) return { section1: '', quantStocks: [], section3: '', section4: '' };

        let section1 = '';
        const quantStocks: Array<{ name: string; volume: string; fact: string; tech: string; consensus: string }> = [];
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
        toast.success("🎉 VIP 수급 리포트 본문이 클립보드에 복사되었습니다!");
        setTimeout(() => setCopied(false), 2500);
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
                <Gem className="w-16 h-16 text-yellow-500 mb-4 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">프리미엄 블라인드 리포트</h1>
                <p className="text-gray-400 mb-6">기관/외국인 수급과 핵심 테마 트렌드를 열람하려면 로그인이 필요합니다.</p>
            </div>
        );
    }

    const { section1, quantStocks, section3, section4 } = report?.data?.content 
        ? parseVipReport(report.data.content) 
        : { section1: '', quantStocks: [], section3: '', section4: '' };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen relative">
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                    <div className="text-6xl animate-bounce">🎉💰✨🚀</div>
                </div>
            )}

            {/* 상단 타이틀 바 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/20 text-black font-black">
                        <Gem className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            VIP 데일리 퀀트 인텔리전스
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                                당일 장마감 집계
                            </span>
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            스마트머니 자금 대이동 맥락 · VVIP 퀀트 알파 3선 · 내일 주도 테마 & 헷지 전략
                        </p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
            ) : report && report.data ? (
                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">
                                {report.data.report_date || "TODAY"} VVIP QUANT INTELLIGENCE
                            </span>
                            <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                                {report.data.title}
                            </h2>
                        </div>
                        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
                            {report.locked ? (
                                <div className="bg-rose-500/10 text-rose-400 text-xs font-black px-3.5 py-1.5 rounded-xl border border-rose-500/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                                    <Lock className="w-3.5 h-3.5" />
                                    잠금됨
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 text-emerald-400 text-xs font-black px-3.5 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <Unlock className="w-3.5 h-3.5" />
                                    열람 가능
                                </div>
                            )}
                            {!report.locked && timeLeft && (
                                <div className="flex items-center gap-2 text-xs md:text-sm font-mono tabular-nums bg-amber-500/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                    <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                    <span className="font-bold tracking-wider">{timeLeft}</span>
                                    <span className="text-[10px] text-amber-400/80 font-sans">남음</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation Tab Bar (Unlocked Mode) */}
                    {!report.locked && (
                        <div className="flex items-center gap-1.5 p-3 bg-zinc-950/80 border-b border-white/5 overflow-x-auto scrollbar-none">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    activeTab === 'all'
                                        ? 'bg-amber-500 text-black shadow-md font-black'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                🌟 전체 브리핑
                            </button>
                            <button
                                onClick={() => setActiveTab('pulse')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    activeTab === 'pulse'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                💎 1. 자금 대이동
                            </button>
                            <button
                                onClick={() => setActiveTab('quant')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    activeTab === 'quant'
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                🏆 2. 퀀트 알파 3선
                            </button>
                            <button
                                onClick={() => setActiveTab('catalyst')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    activeTab === 'catalyst'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                🚀 3. 내일 주도 테마
                            </button>
                            <button
                                onClick={() => setActiveTab('risk')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    activeTab === 'risk'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                🛡️ 4. 리스크 관리
                            </button>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="p-5 md:p-8 relative space-y-8">
                        {report.locked ? (
                            <>
                                {/* Preview Text (Section 1 Clean View) */}
                                <div className="p-6 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-3xl">
                                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 💎 Section 1. 스마트머니 자금 대이동 맥락 (무료 공개)
                                    </h4>
                                    <div className="text-sm md:text-base text-gray-200 leading-relaxed font-medium whitespace-pre-line">
                                        {section1 || report.data.content || report.data.preview}
                                    </div>
                                </div>

                                {/* Blurred Action Area */}
                                <div className="relative rounded-3xl overflow-hidden border border-white/5 p-8 bg-zinc-950/60 min-h-[360px] flex items-center justify-center">
                                    <div className="absolute inset-0 p-6 opacity-20 blur-md pointer-events-none select-none space-y-4">
                                        <div className="h-8 bg-amber-500/20 rounded-xl w-1/3"></div>
                                        <div className="h-20 bg-white/10 rounded-2xl"></div>
                                        <div className="h-20 bg-white/10 rounded-2xl"></div>
                                        <div className="h-20 bg-white/10 rounded-2xl"></div>
                                    </div>

                                    <div className="relative z-10 bg-zinc-900/95 backdrop-blur-xl border border-amber-500/40 p-6 md:p-8 rounded-3xl text-center shadow-2xl max-w-md w-full mx-4">
                                        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
                                            <Lock className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-lg md:text-xl font-black text-white mb-2">VVIP 퀀트 인텔리전스 잠금</h3>
                                        <div className="text-left bg-zinc-950/70 border border-white/5 rounded-2xl p-3.5 mb-5 space-y-1.5 text-xs text-gray-300">
                                            <p className="flex items-center gap-1.5 font-bold text-amber-300">
                                                <span>🏆</span> VVIP 퀀트 밸런스 알파 3선 심층 브리핑
                                            </p>
                                            <p className="flex items-center gap-1.5 font-bold text-cyan-300">
                                                <span>🚀</span> 내일의 주도 유망 테마 & 밸류체인 레이더
                                            </p>
                                            <p className="flex items-center gap-1.5 font-bold text-emerald-300">
                                                <span>🛡️</span> 지수 변동성 헷지 & 리스크 관리 가이드
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleUnlock}
                                            disabled={isUnlocking}
                                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm md:text-base shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
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
                                        <p className="text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                                            <AlertCircle className="w-3 h-3 text-amber-400" />
                                            매일 출석체크로 무료 지급되는 코인으로 열람 가능합니다.
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-8">
                                {/* SECTION 1: 스마트머니 자금 대이동 맥락 */}
                                {(activeTab === 'all' || activeTab === 'pulse') && section1 && (
                                    <div className="bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-3xl p-6 md:p-7 shadow-xl">
                                        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-4">
                                            <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base md:text-lg font-black text-white">
                                                    💎 Section 1. 스마트머니 자금 대이동 맥락 (Market Pulse)
                                                </h3>
                                                <p className="text-xs text-gray-400">외인·기관 거대 자금의 섹터 로테이션 및 집중 이동 흐름</p>
                                            </div>
                                        </div>
                                        <p className="text-sm md:text-base text-gray-200 leading-relaxed font-normal">
                                            {section1}
                                        </p>
                                    </div>
                                )}

                                {/* SECTION 2: VVIP 퀀트 밸런스 알파 3선 */}
                                {(activeTab === 'all' || activeTab === 'quant') && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
                                                    <Gem className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base md:text-lg font-black text-white">
                                                        🏆 Section 2. VVIP 퀀트 밸런스 알파 3선 (Quant Alpha Top 3)
                                                    </h3>
                                                    <p className="text-xs text-gray-400">수급 강도 + 이평선 지지 + 컨센서스 종합 점수 최상위 3선</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
                                                ALPHA TOP 3
                                            </span>
                                        </div>

                                        {quantStocks.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-4">
                                                {quantStocks.map((stock, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="bg-zinc-950/80 hover:bg-zinc-900/90 border border-white/10 hover:border-cyan-500/40 rounded-3xl p-5 md:p-6 transition-all shadow-xl space-y-4"
                                                    >
                                                        {/* Stock Header */}
                                                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                                                                    idx === 0 ? 'bg-amber-400 text-black shadow-md' :
                                                                    idx === 1 ? 'bg-slate-300 text-black' :
                                                                    'bg-amber-700 text-white'
                                                                }`}>
                                                                    #{idx + 1}
                                                                </span>
                                                                <h4 className="text-lg md:text-xl font-black text-white">
                                                                    {stock.name}
                                                                </h4>
                                                            </div>
                                                            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 rounded-xl">
                                                                {stock.volume}
                                                            </span>
                                                        </div>

                                                        {/* 3 Metrics Bento Grid */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            {/* 1. 수급 팩트 */}
                                                            <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-3.5 space-y-1.5">
                                                                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                                                                    <span>📊</span> 수급 팩트
                                                                </div>
                                                                <p className="text-xs text-gray-300 leading-relaxed font-normal">
                                                                    {stock.fact || "수급 집중 유입 확인"}
                                                                </p>
                                                            </div>

                                                            {/* 2. 기술적 지표 */}
                                                            <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-3.5 space-y-1.5">
                                                                <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                                                                    <span>📈</span> 기술적 지표 위치
                                                                </div>
                                                                <p className="text-xs text-gray-300 leading-relaxed font-normal">
                                                                    {stock.tech || "안정적 지지선 확보"}
                                                                </p>
                                                            </div>

                                                            {/* 3. 증권사 컨센서스 */}
                                                            <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-3.5 space-y-1.5">
                                                                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                                    <span>🎯</span> 컨센서스 참고
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
                                            /* Fallback Markdown if parsing fails */
                                            <div className="prose prose-invert max-w-none text-sm text-gray-300 bg-zinc-950/70 p-6 rounded-3xl border border-white/5">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {report.data.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SECTION 3: 내일의 주도 유망 테마 & 밸류체인 레이더 */}
                                {(activeTab === 'all' || activeTab === 'catalyst') && section3 && (
                                    <div className="bg-gradient-to-br from-purple-950/30 via-zinc-900 to-zinc-900 border border-purple-500/30 rounded-3xl p-6 md:p-7 shadow-xl">
                                        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-4">
                                            <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base md:text-lg font-black text-white">
                                                    🚀 Section 3. 내일의 주도 유망 테마 & 밸류체인 레이더 (Tomorrow Catalyst)
                                                </h3>
                                                <p className="text-xs text-gray-400">내일 및 주 후반 시장을 주도할 유망 테마와 밸류체인 연결고리</p>
                                            </div>
                                        </div>
                                        <p className="text-sm md:text-base text-gray-200 leading-relaxed font-normal">
                                            {section3}
                                        </p>
                                    </div>
                                )}

                                {/* SECTION 4: 지수 변동성 헷지 & 리스크 관리 분석 */}
                                {(activeTab === 'all' || activeTab === 'risk') && section4 && (
                                    <div className="bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-3xl p-6 md:p-7 shadow-xl">
                                        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-4">
                                            <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base md:text-lg font-black text-white">
                                                    🛡️ Section 4. 지수 변동성 헷지 & 리스크 관리 분석 (Risk & Defense)
                                                </h3>
                                                <p className="text-xs text-gray-400">기관/외인 선물·인버스 포지션 분석 및 단기 리스크 방어 전략</p>
                                            </div>
                                        </div>
                                        <p className="text-sm md:text-base text-gray-200 leading-relaxed font-normal">
                                            {section4}
                                        </p>
                                    </div>
                                )}

                                {/* Action Footer */}
                                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <button
                                        onClick={copyFullReport}
                                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs md:text-sm border border-white/10 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        {copied ? "✅ 리포트 복사 완료!" : "VIP 리포트 전체 복사하기"}
                                    </button>
                                    <p className="text-[11px] text-gray-500 font-mono">
                                        VVIP QUANT INTELLIGENCE TERMINAL · CONFIDENTIAL
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 py-12 bg-zinc-950 rounded-3xl border border-white/5">
                    리포트 데이터를 불러올 수 없습니다.
                </div>
            )}

            {/* 자본시장법 준수 법적 면책 안내 */}
            <div className="mt-8 p-5 bg-zinc-950/80 border border-white/5 rounded-3xl text-[11px] text-gray-400 space-y-1.5">
                <p className="font-bold text-amber-400/90 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" /> VVIP 투자 정보 법적 안내 및 유의사항
                </p>
                <p className="leading-relaxed text-gray-500">
                    본 VIP 프리미엄 리포트는 금융 시장의 수급 통계 및 정량적 퀀트 알고리즘을 기반으로 작성된 단순 통계 정보 제공용이며, 특정 종목의 매수·매도를 권유하거나 개별 투자 자문을 수행하지 않습니다. 모든 투자 판단 및 최종 책임은 투자자 본인에게 있습니다.
                </p>
            </div>
        </div>
    );
}
