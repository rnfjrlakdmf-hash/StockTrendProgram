"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Unlock, Gem, AlertCircle, Timer, Copy, Check, Share2, Globe, Building2, Sparkles, TrendingUp, ChevronRight, ShieldCheck } from 'lucide-react';
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

    // Helper: Parse the raw text content into visual sections
    const parseReportContent = (rawContent: string) => {
        if (!rawContent) return { summary: "", foreignItems: [], instItems: [] };

        let summary = "";
        const foreignItems: Array<{ rank: number; name: string; volume: string; desc: string }> = [];
        const instItems: Array<{ rank: number; name: string; volume: string; desc: string }> = [];

        // Split by major headers
        const foreignHeaderIdx = rawContent.indexOf("외국인 순매수");
        const instHeaderIdx = rawContent.indexOf("기관 순매수");

        if (foreignHeaderIdx > -1) {
            // Summary is before foreign header
            const rawSummaryPart = rawContent.substring(0, foreignHeaderIdx);
            summary = rawSummaryPart
                .replace(/###\s*📊?\s*오늘의 수급 특징 요약/g, '')
                .replace(/---/g, '')
                .trim();

            const foreignPart = instHeaderIdx > -1 
                ? rawContent.substring(foreignHeaderIdx, instHeaderIdx) 
                : rawContent.substring(foreignHeaderIdx);

            const instPart = instHeaderIdx > -1 
                ? rawContent.substring(instHeaderIdx) 
                : "";

            // Parse lines helper
            const parseLines = (text: string, targetList: Array<any>) => {
                const lines = text.split('\n');
                let currentRank = 1;
                for (const line of lines) {
                    const trimmed = line.trim().replace(/^[-*•]\s*/, '').replace(/^###.*\n?/, '');
                    if (!trimmed || trimmed.includes("팩트 체크") || trimmed.includes("---")) continue;

                    // Match patterns:
                    // 1) **삼성전자**: [2,908,093주 대량 매집] 설명...
                    // 2) SK스퀘어: [54,650주 순매수] 설명...
                    // 3) **삼성전자 (2,908,093주)**: 설명...
                    const matchBracket = trimmed.match(/^\*?\*?([^\*:]+)\*?\*?:\s*\[([^\]]+)\]\s*(.*)$/);
                    const matchParen = trimmed.match(/^\*?\*?([^\*:]+)\s*\(([^)]+)\)\*?\*?:\s*(.*)$/);

                    if (matchBracket) {
                        targetList.push({
                            rank: currentRank++,
                            name: matchBracket[1].replace(/\*\*/g, '').trim(),
                            volume: matchBracket[2].trim(),
                            desc: matchBracket[3].trim()
                        });
                    } else if (matchParen) {
                        targetList.push({
                            rank: currentRank++,
                            name: matchParen[1].replace(/\*\*/g, '').trim(),
                            volume: matchParen[2].trim(),
                            desc: matchParen[3].trim()
                        });
                    } else if (trimmed.includes(":")) {
                        const colonIdx = trimmed.indexOf(":");
                        const namePart = trimmed.substring(0, colonIdx).replace(/\*\*/g, '').trim();
                        const descPart = trimmed.substring(colonIdx + 1).trim();
                        targetList.push({
                            rank: currentRank++,
                            name: namePart,
                            volume: "순매수 포착",
                            desc: descPart
                        });
                    }
                }
            };

            parseLines(foreignPart, foreignItems);
            parseLines(instPart, instItems);
        } else {
            summary = rawContent;
        }

        return { summary, foreignItems, instItems };
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

    const { summary, foreignItems, instItems } = report?.data?.content 
        ? parseReportContent(report.data.content) 
        : { summary: "", foreignItems: [], instItems: [] };

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
                            VIP 세력 수급 인텔리전스
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                                당일 장마감 집계
                            </span>
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            한국거래소(KRX) 공식 외국인·기관 순매수 상위 종목 및 세력 자금 흐름 심층 분석
                        </p>
                    </div>
                </div>

                {/* 복사 버튼 (열람 가능 시) */}
                {report && !report.locked && (
                    <button
                        onClick={copyFullReport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-gray-200 hover:text-white rounded-xl transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                        {copied ? "복사 완료!" : "📋 리포트 전문 복사"}
                    </button>
                )}
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
                                {report.data.report_date || "TODAY"} MARKET WHALE INTELLIGENCE
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

                    {/* Content Area */}
                    <div className="p-5 md:p-8 relative space-y-8">
                        {report.locked ? (
                            <>
                                {/* Preview Text (Clear) */}
                                <div className="p-5 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl">
                                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 오늘 수급 핵심 프리뷰
                                    </h4>
                                    <p className="text-sm md:text-base text-gray-200 leading-relaxed font-medium">
                                        {report.data.preview}
                                    </p>
                                </div>

                                {/* Blurred Action Area */}
                                <div className="relative rounded-2xl overflow-hidden border border-white/5 p-8 bg-zinc-950/60 min-h-[360px] flex items-center justify-center">
                                    {/* Mock Blur Items */}
                                    <div className="absolute inset-0 p-6 opacity-20 blur-md pointer-events-none select-none space-y-4">
                                        <div className="h-6 bg-white/20 rounded w-1/3"></div>
                                        <div className="h-16 bg-white/10 rounded"></div>
                                        <div className="h-16 bg-white/10 rounded"></div>
                                        <div className="h-16 bg-white/10 rounded"></div>
                                    </div>

                                    <div className="relative z-10 bg-zinc-900/90 backdrop-blur-xl border border-amber-500/40 p-6 md:p-8 rounded-3xl text-center shadow-2xl max-w-md w-full mx-4">
                                        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
                                            <Lock className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-lg md:text-xl font-black text-white mb-2">프리미엄 수급 데이터 잠금</h3>
                                        <p className="text-gray-300 text-xs md:text-sm mb-6 leading-relaxed">
                                            외국인과 기관의 10대 집중 순매수 종목별 수량과<br />세력의 포트폴리오 헷지 전략 분석을 확인하세요.
                                        </p>
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
                                                    50 코인으로 즉시 잠금 해제
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
                            /* Unlocked Visual Report (Card Layout) */
                            <div className="space-y-8">
                                {/* 1. 오늘의 수급 특징 총평 카드 */}
                                {summary && (
                                    <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/90 to-blue-950/40 border border-blue-500/30 rounded-3xl p-6 md:p-7 shadow-xl">
                                        <div className="flex items-center gap-2.5 pb-4 border-b border-white/10 mb-4">
                                            <div className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base md:text-lg font-black text-white">
                                                    오늘의 수급 특징 요약 총평
                                                </h3>
                                                <p className="text-xs text-gray-400">기관의 대형주 지지 & 외국인의 양방향 헷지 분석</p>
                                            </div>
                                        </div>
                                        <div className="text-sm md:text-base text-gray-200 leading-relaxed font-normal whitespace-pre-wrap">
                                            {summary}
                                        </div>
                                    </div>
                                )}

                                {/* 2. 외국인 순매수 상위 팩트 체크 리스트 */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base md:text-lg font-black text-white">
                                                    외국인 순매수 상위 팩트 체크
                                                </h3>
                                                <p className="text-xs text-gray-400">글로벌 스마트머니의 포트폴리오 편입 및 헷지 종목</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                                            TOP 10
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        {foreignItems.map((item) => (
                                            <div
                                                key={item.rank}
                                                className="bg-zinc-950/70 hover:bg-zinc-900 border border-white/5 hover:border-cyan-500/40 rounded-2xl p-4 md:p-5 transition-all duration-200 shadow-md hover:shadow-cyan-500/5 flex flex-col justify-between"
                                            >
                                                <div className="flex items-center justify-between gap-2 mb-2.5 pb-2.5 border-b border-white/5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                                            item.rank === 1 ? 'bg-cyan-400 text-black shadow-md' :
                                                            item.rank === 2 ? 'bg-slate-300 text-black' :
                                                            item.rank === 3 ? 'bg-amber-700 text-white' :
                                                            'bg-white/10 text-gray-400'
                                                        }`}>
                                                            {item.rank}
                                                        </span>
                                                        <span className="text-sm md:text-base font-black text-white">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 rounded-xl shrink-0">
                                                        {item.volume}
                                                    </span>
                                                </div>
                                                <p className="text-xs md:text-[13px] text-gray-300 leading-relaxed font-normal">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. 기관 순매수 상위 팩트 체크 리스트 */}
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base md:text-lg font-black text-white">
                                                    기관 순매수 상위 팩트 체크
                                                </h3>
                                                <p className="text-xs text-gray-400">국내 기관계(투신·연기금)의 대형주 집중 매집 요충지</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                            TOP 10
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        {instItems.map((item) => (
                                            <div
                                                key={item.rank}
                                                className="bg-zinc-950/70 hover:bg-zinc-900 border border-white/5 hover:border-amber-500/40 rounded-2xl p-4 md:p-5 transition-all duration-200 shadow-md hover:shadow-amber-500/5 flex flex-col justify-between"
                                            >
                                                <div className="flex items-center justify-between gap-2 mb-2.5 pb-2.5 border-b border-white/5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                                            item.rank === 1 ? 'bg-amber-400 text-black shadow-md' :
                                                            item.rank === 2 ? 'bg-slate-300 text-black' :
                                                            item.rank === 3 ? 'bg-amber-700 text-white' :
                                                            'bg-white/10 text-gray-400'
                                                        }`}>
                                                            {item.rank}
                                                        </span>
                                                        <span className="text-sm md:text-base font-black text-white">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl shrink-0">
                                                        {item.volume}
                                                    </span>
                                                </div>
                                                <p className="text-xs md:text-[13px] text-gray-300 leading-relaxed font-normal">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 법적 고지 & 카피라이트 */}
                                <div className="p-4 bg-zinc-950/90 rounded-2xl border border-white/5 text-[11px] text-gray-400 flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5 text-gray-300">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                        본 리포트는 한국거래소(KRX) 일일 수급 통계 기반의 객관적 분석이며, 특정 종목 매수/매도 권유가 아닙니다.
                                    </span>
                                    <span className="font-mono text-gray-500 text-[10px]">
                                        StockTrend VIP Intelligence
                                    </span>
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
        </div>
    );
}
