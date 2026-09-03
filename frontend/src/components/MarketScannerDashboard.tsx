'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Radio, AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw, Zap, ExternalLink, Clock, FileText, Flame, ShieldCheck, BarChart3, Scale } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import KakaoShareButton from './KakaoShareButton';
import { MarketScannerSkeleton } from './SkeletonCard';

interface MarketStats {
    up: number;
    same: number;
    down: number;
    up_limit?: number;   // 상한가
    down_limit?: number; // 하한가
}

interface MarketScannerData {
    stats: {
        kospi: MarketStats;
        kosdaq: MarketStats;
        fear_greed?: {
            score: number;
            label: string;
            factors?: {
                ad_ratio: number;
                volatility: number;
                momentum: number;
            };
        };
    };
    disclosures: Array<{
        title: string;
        link: string;
        press: string;
        date: string;
    }>;
}

// 시장 체감 온도 점수 계산 (0~100)
function calcSentimentScore(stats: MarketStats): number {
    const total = (stats.up || 0) + (stats.same || 0) + (stats.down || 0) || 1;
    return Math.round(((stats.up || 0) / total) * 100);
}

// 점수에 따른 색상/라벨
function getSentiment(score: number) {
    if (score >= 70) return { label: '강세장', color: 'text-red-400', bar: 'from-red-500 to-orange-400', glow: 'shadow-red-500/30' };
    if (score >= 55) return { label: '상승우세', color: 'text-orange-400', bar: 'from-orange-500 to-yellow-400', glow: 'shadow-orange-500/20' };
    if (score >= 45) return { label: '중립', color: 'text-gray-400', bar: 'from-gray-500 to-gray-400', glow: 'shadow-gray-500/20' };
    if (score >= 30) return { label: '하락우세', color: 'text-blue-400', bar: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-500/20' };
    return { label: '약세장', color: 'text-blue-500', bar: 'from-blue-600 to-indigo-500', glow: 'shadow-blue-600/30' };
}

export default function MarketScannerDashboard() {
    const [data, setData] = useState<MarketScannerData | null>(null);
    const [signal, setSignal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [animateBars, setAnimateBars] = useState(false);

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        setIsRefreshing(true);
        setAnimateBars(false);
        try {
            const [resScanner, resSignal] = await Promise.all([
                fetch(`${API_BASE_URL}/api/market/scanner`),
                fetch(`${API_BASE_URL}/api/market/status`)
            ]);
            
            const resData = await resScanner.json();
            const sigData = await resSignal.json();
            
            if (resData.status === 'success') {
                setData(resData.data);
                setLastUpdated(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                setTimeout(() => setAnimateBars(true), 100); // 데이터 로드 후 애니메이션 트리거
            }
            if (sigData.status === 'success') {
                setSignal(sigData.data);
            }
        } catch (err) {
            console.error('Market scanner fetch error', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <MarketScannerSkeleton />
                <MarketScannerSkeleton />
            </div>
        );
    }

    if (!data) return null;

    const kospiScore = calcSentimentScore(data.stats?.kospi || { up: 0, same: 0, down: 0 });
    const kosdaqScore = calcSentimentScore(data.stats?.kosdaq || { up: 0, same: 0, down: 0 });
    
    // 백엔드에서 내려주는 고퀄리티 공포/탐욕 지수 데이터 사용 (없으면 폴백)
    const fg = data.stats?.fear_greed;
    const combinedScore = fg ? fg.score : Math.round((kospiScore + kosdaqScore) / 2);
    
    let combined = getSentiment(combinedScore);
    if (fg) {
        if (fg.score >= 76) combined = { label: fg.label, color: 'text-red-500', bar: 'from-red-600 to-rose-500', glow: 'shadow-red-500/50' };
        else if (fg.score >= 56) combined = { label: fg.label, color: 'text-orange-400', bar: 'from-orange-500 to-yellow-400', glow: 'shadow-orange-500/30' };
        else if (fg.score >= 46) combined = { label: fg.label, color: 'text-gray-400', bar: 'from-gray-500 to-gray-400', glow: 'shadow-gray-500/20' };
        else if (fg.score >= 26) combined = { label: fg.label, color: 'text-cyan-400', bar: 'from-cyan-500 to-blue-400', glow: 'shadow-cyan-500/30' };
        else combined = { label: fg.label, color: 'text-blue-500', bar: 'from-blue-600 to-indigo-500', glow: 'shadow-blue-600/50' };
    }

    const renderStatsBar = (stats: MarketStats, name: string) => {
        if (!stats) return null;
        const total = (stats.up || 0) + (stats.same || 0) + (stats.down || 0) || 1;
        const upPct = ((stats.up || 0) / total) * 100;
        const downPct = ((stats.down || 0) / total) * 100;
        const samePct = ((stats.same || 0) / total) * 100;
        const score = calcSentimentScore(stats);

        // 수급 비율 진단 문구
        let breadthNote = "수급 균형 (팽팽한 혼조세)";
        let breadthColor = "text-zinc-400 bg-white/5 border-white/10";
        if (upPct >= 60) {
            breadthNote = `매수세 압도 (상승 ${upPct.toFixed(0)}%)`;
            breadthColor = "text-rose-300 bg-rose-500/10 border-rose-500/25";
        } else if (upPct >= 52) {
            breadthNote = `상승 우세 (매수 탄력 유지)`;
            breadthColor = "text-rose-300 bg-rose-500/10 border-rose-500/20";
        } else if (downPct >= 60) {
            breadthNote = `매도세 우세 (하락 ${downPct.toFixed(0)}%)`;
            breadthColor = "text-blue-300 bg-blue-500/10 border-blue-500/25";
        } else if (downPct >= 52) {
            breadthNote = `하방 압력 (매도 우위)`;
            breadthColor = "text-blue-300 bg-blue-500/10 border-blue-500/20";
        }

        return (
            <div className="space-y-4">
                {/* 헤더: 시장명, 상태 칩, 총 종목수 */}
                <div className="flex justify-between items-center pb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm md:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            {name}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${breadthColor}`}>
                            {breadthNote}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* 상한가 하이라이트 */}
                        {(stats.up_limit !== undefined && stats.up_limit > 0) && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                <Flame className="w-3 h-3 text-rose-400" />
                                <span>상한가 {stats.up_limit}</span>
                            </span>
                        )}
                        <span className="text-zinc-400 text-xs font-mono font-bold bg-white/5 px-2 py-0.5 rounded-md">
                            총 {total.toLocaleString()}개 종목
                        </span>
                    </div>
                </div>

                {/* 프로그레스 바 (듀얼 그라디언트 + 애니메이션) */}
                <div className="relative">
                    <div className="h-7 w-full flex rounded-xl overflow-hidden bg-black/60 border border-white/10 p-0.5 shadow-inner">
                        <div
                            style={{ width: animateBars ? `${upPct}%` : '0%' }}
                            className="bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-1000 ease-out flex items-center justify-center rounded-l-lg relative group shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                        >
                            {upPct > 12 && (
                                <span className="text-[11px] font-black text-white font-mono tracking-tight">
                                    {upPct.toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <div
                            style={{ width: animateBars ? `${samePct}%` : '0%' }}
                            className="bg-zinc-700/80 transition-all duration-1000 ease-out delay-100 flex items-center justify-center"
                        >
                            {samePct > 8 && (
                                <span className="text-[10px] font-bold text-zinc-300 font-mono">
                                    {samePct.toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <div
                            style={{ width: animateBars ? `${downPct}%` : '0%' }}
                            className="bg-gradient-to-l from-blue-600 to-cyan-500 transition-all duration-1000 ease-out delay-200 flex items-center justify-center rounded-r-lg shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                        >
                            {downPct > 12 && (
                                <span className="text-[11px] font-black text-white font-mono tracking-tight">
                                    {downPct.toFixed(0)}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3대 핵심 수급 통계 카드 (고대비 깔끔 레이아웃) */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                    {/* 상승 */}
                    <div className="bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors rounded-2xl py-2.5 px-2">
                        <div className="flex items-center justify-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-rose-400" />
                            <span className="text-rose-400 font-black text-base md:text-lg font-mono">
                                {(stats.up || 0).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-rose-300/90 mt-0.5">
                            상승 <span className="font-mono">({upPct.toFixed(1)}%)</span>
                        </p>
                    </div>

                    {/* 보합 */}
                    <div className="bg-zinc-800/40 border border-white/5 hover:border-white/15 transition-colors rounded-2xl py-2.5 px-2">
                        <div className="flex items-center justify-center gap-1.5">
                            <Minus className="w-4 h-4 text-zinc-400" />
                            <span className="text-zinc-300 font-black text-base md:text-lg font-mono">
                                {(stats.same || 0).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-zinc-400 mt-0.5">
                            보합 <span className="font-mono">({samePct.toFixed(1)}%)</span>
                        </p>
                    </div>

                    {/* 하락 */}
                    <div className="bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-colors rounded-2xl py-2.5 px-2">
                        <div className="flex items-center justify-center gap-1.5">
                            <TrendingDown className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-400 font-black text-base md:text-lg font-mono">
                                {(stats.down || 0).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-blue-300/90 mt-0.5">
                            하락 <span className="font-mono">({downPct.toFixed(1)}%)</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    };

        const getDisclosureCategory = (title: string) => {
        if (title.includes('수주') || title.includes('계약') || title.includes('공급') || title.includes('MOU')) {
            return { label: '대규모 수주·공급계약', icon: '💎', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' };
        }
        if (title.includes('유상증자') || title.includes('전환사채') || title.includes('CB') || title.includes('BW') || title.includes('감자')) {
            return { label: '자본변동·CB발행', icon: '⚠️', color: 'text-rose-300 bg-rose-500/10 border-rose-500/20' };
        }
        if (title.includes('무상증자') || title.includes('배당') || title.includes('자사주') || title.includes('소각')) {
            return { label: '주주환원·자사주', icon: '🎁', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' };
        }
        if (title.includes('지분') || title.includes('매집') || title.includes('최대주주') || title.includes('공개매수') || title.includes('합병') || title.includes('취득') || title.includes('처분')) {
            return { label: '지분변동·M&A', icon: '🏢', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' };
        }
        if (title.includes('실적') || title.includes('잠정') || title.includes('영업익') || title.includes('매출')) {
            return { label: '잠정실적 공시', icon: '📊', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' };
        }
        return { label: '핵심 시장 공시', icon: '📑', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' };
    };

    const getNewsBadge = (title: string) => {
        const goodKeywords = ['무상증자', '수주', '계약', '흑자', '상향', '배당', '공급', '특허', '자사주', '최대실적', '돌파', '상한가', '영업익', '영업이익', '↑', '급등', 'MOU', '체결'];
        const badKeywords = ['유상증자', '하향', '적자', '횡령', '배임', '소송', '상장폐지', '정지', '지연', '해지', '처분', '블록딜', '하한가', '급락', '↓', '매각'];
        
        if (goodKeywords.some(k => title.includes(k))) {
            return <span className="ml-2 px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] rounded border border-red-500/20 font-black tracking-widest">호재</span>;
        }
        if (badKeywords.some(k => title.includes(k))) {
            return <span className="ml-2 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] rounded border border-blue-500/20 font-black tracking-widest">악재</span>;
        }
        return <span className="ml-2 px-1.5 py-0.5 bg-gray-500/10 text-gray-400 text-[9px] rounded border border-gray-500/20 font-black tracking-widest">특징</span>;
    };

    return (
        <div className="space-y-6 mt-6">
            {/* 1. 종합 시장 심리 & 주요 지수 대시보드 (2단 프리미엄 터미널 레이아웃) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 좌측: 한국 증시 체감 심리지수 (Fear & Greed Index) */}
                <div className="relative bg-zinc-950/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden group">
                    {/* 배경 소프트 앰비언트 글로우 */}
                    <div className={`absolute -top-10 -left-10 w-48 h-48 blur-[80px] opacity-25 pointer-events-none transition-all duration-1000 ${
                        combinedScore >= 56 ? 'bg-rose-500' : combinedScore >= 46 ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />

                    <div>
                        {/* 상단 타이틀 & 스코어 칩 */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2.5 rounded-2xl border border-white/10 ${
                                    combinedScore >= 56 ? 'bg-rose-500/15 text-rose-400' : combinedScore >= 46 ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                                }`}>
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase block font-mono">
                                        Market Sentiment Index
                                    </span>
                                    <h3 className="text-sm md:text-base font-black text-white tracking-tight">
                                        한국 증시 체감 심리지수 (공포·탐욕)
                                    </h3>
                                </div>
                            </div>

                            <span className={`text-xs md:text-sm font-black px-3 py-1 rounded-xl border shadow-sm ${
                                combinedScore >= 76 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                                combinedScore >= 56 ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                                combinedScore >= 46 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                combinedScore >= 26 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                                'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}>
                                {combined.label} ({combinedScore}점)
                            </span>
                        </div>

                        {/* 메인 점수 및 5단 세그먼트 미터 게이지 */}
                        <div className="my-3 space-y-3">
                            <div className="flex items-baseline justify-between">
                                <div className="flex items-baseline gap-1.5">
                                    <span className={`text-4xl md:text-5xl font-black font-mono tracking-tight ${combined.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]`}>
                                        {combinedScore}
                                    </span>
                                    <span className="text-sm font-bold text-zinc-500">/ 100점</span>
                                </div>
                                <span className="text-xs text-zinc-300 font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                    {combinedScore >= 76 ? "🔥 극단적 탐욕 (과열 주의 구간)" :
                                     combinedScore >= 56 ? "📈 탐욕 우세 (상승 모멘텀 지속)" :
                                     combinedScore >= 46 ? "⚖️ 중립 관망 (수급 팽팽한 혼조세)" :
                                     combinedScore >= 26 ? "❄️ 공포 확산 (방어적 대응 구간)" :
                                     "😱 극단적 공포 (과매도 반등 대기 구간)"}
                                </span>
                            </div>

                            {/* 5단 세그먼트 게이지 바 */}
                            <div className="space-y-1.5">
                                <div className="h-3.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 relative shadow-inner">
                                    <div
                                        style={{ width: animateBars ? `${combinedScore}%` : '0%' }}
                                        className={`h-full bg-gradient-to-r ${combined.bar} rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_12px_rgba(255,255,255,0.3)]`}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow-lg"></div>
                                    </div>
                                </div>

                                {/* 5단 게이지 구간 가이드 */}
                                <div className="grid grid-cols-5 text-[9px] sm:text-[10px] font-mono font-bold text-center pt-0.5 gap-1">
                                    <span className={`py-0.5 rounded ${combinedScore <= 25 ? 'text-blue-400 bg-blue-500/15 font-black' : 'text-zinc-500'}`}>0~25 극단적공포</span>
                                    <span className={`py-0.5 rounded ${combinedScore > 25 && combinedScore <= 45 ? 'text-cyan-400 bg-cyan-500/15 font-black' : 'text-zinc-500'}`}>26~45 공포</span>
                                    <span className={`py-0.5 rounded ${combinedScore > 45 && combinedScore <= 55 ? 'text-amber-400 bg-amber-500/15 font-black' : 'text-zinc-500'}`}>46~55 중립</span>
                                    <span className={`py-0.5 rounded ${combinedScore > 55 && combinedScore <= 75 ? 'text-orange-400 bg-orange-500/15 font-black' : 'text-zinc-500'}`}>56~75 탐욕</span>
                                    <span className={`py-0.5 rounded ${combinedScore > 75 ? 'text-rose-400 bg-rose-500/15 font-black' : 'text-zinc-500'}`}>76~100 극단적탐욕</span>
                                </div>
                            </div>
                        </div>

                        {/* 3대 정밀 계량 팩터 박스 */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5">
                            <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                                <span className="text-[10px] text-zinc-400 block font-medium">수급 A/D비율</span>
                                <span className="text-xs sm:text-sm font-bold font-mono text-zinc-200">
                                    {fg?.factors?.ad_ratio ?? 50}점
                                </span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                                <span className="text-[10px] text-zinc-400 block font-medium">변동성 (VIX)</span>
                                <span className="text-xs sm:text-sm font-bold font-mono text-zinc-200">
                                    {fg?.factors?.volatility ?? 50}점
                                </span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                                <span className="text-[10px] text-zinc-400 block font-medium">125일 모멘텀</span>
                                <span className="text-xs sm:text-sm font-bold font-mono text-zinc-200">
                                    {fg?.factors?.momentum ?? 50}점
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed pt-2.5 border-t border-white/5 font-medium mt-3">
                        💡 코스피·코스닥 전체 2,600여 종목의 실시간 상승/하락 비율과 VIX 변동성, 중기 추세를 종합 분석한 계량 심리지수입니다.
                    </p>
                </div>

                {/* 우측: 실시간 주요 지수 & 매크로 시황 요약 */}
                <div className="relative bg-zinc-950/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase block font-mono">
                                        Live Market Pulse
                                    </span>
                                    <h3 className="text-sm md:text-base font-black text-white tracking-tight">
                                        실시간 주요 지수 & 매크로 요약
                                    </h3>
                                </div>
                            </div>

                            {signal && (
                                <span className={`text-xs font-bold px-3 py-1 rounded-xl border flex items-center gap-1.5 shadow-sm ${
                                    signal.signal === 'red' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                                    signal.signal === 'yellow' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                                    <span>{signal.message || "정상 운영"}</span>
                                </span>
                            )}
                        </div>

                        {/* 3대 핵심 지표 카드 그리드 (고대비 깔끔 표기) */}
                        <div className="grid grid-cols-3 gap-2.5 my-3">
                            {/* KOSPI */}
                            <div className="bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-3 text-center">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] text-zinc-400 font-bold">KOSPI</span>
                                    {signal?.details?.kospi_pct && (
                                        <span className={`text-[10px] font-bold font-mono ${
                                            signal.details.kospi_pct.includes('-') ? 'text-blue-400' : 'text-rose-400'
                                        }`}>
                                            {signal.details.kospi_pct}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm sm:text-base font-black font-mono text-white block truncate">
                                    {signal?.details?.kospi || "-"}
                                </span>
                            </div>

                            {/* KOSDAQ */}
                            <div className="bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-3 text-center">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] text-zinc-400 font-bold">KOSDAQ</span>
                                    {signal?.details?.kosdaq_pct && (
                                        <span className={`text-[10px] font-bold font-mono ${
                                            signal.details.kosdaq_pct.includes('-') ? 'text-blue-400' : 'text-rose-400'
                                        }`}>
                                            {signal.details.kosdaq_pct}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm sm:text-base font-black font-mono text-white block truncate">
                                    {signal?.details?.kosdaq || "-"}
                                </span>
                            </div>

                            {/* 원/달러 환율 */}
                            <div className="bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-3 text-center">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] text-zinc-400 font-bold">원/달러 환율</span>
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">고시</span>
                                </div>
                                <span className="text-sm sm:text-base font-black font-mono text-emerald-400 block truncate">
                                    {signal?.details?.usd ? `${signal.details.usd}원` : "-"}
                                </span>
                            </div>
                        </div>

                        {/* 시황 포인트 전문 코멘트 */}
                        {signal?.reason && (
                            <div className="bg-zinc-900/60 rounded-2xl p-3.5 border border-white/5 text-xs text-zinc-300 leading-relaxed mb-2">
                                <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                                    <span>🏛️ 매크로 시황 진단:</span>
                                </div>
                                <p className="text-zinc-300 pl-1">{signal.reason}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`} />
                            <span className="font-mono">{lastUpdated || '실시간 전산 수신'}</span>
                        </div>
                        <button
                            onClick={() => fetchData()}
                            disabled={isRefreshing}
                            className="hover:text-white transition-colors flex items-center gap-1.5 font-bold text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 active:scale-95"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>새로고침</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. 상세 시장 수급 현황 (Market Breadth Radar - KOSPI vs KOSDAQ) */}
            <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10 mb-5">
                    <div>
                        <h3 className="text-sm md:text-base font-black text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                            <span>실시간 시장 수급 등락 분포도 (Market Breadth Radar)</span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                            코스피 · 코스닥 전 종목의 실시간 상승 / 보합 / 하락 및 상·하한가 수급을 집계합니다.
                        </p>
                    </div>
                    <KakaoShareButton 
                        title={`오늘의 공포/탐욕 지수: ${combined.label} (${combinedScore}점)`}
                        description={`코스피/코스닥 시장 분위기를 알려드립니다! 지금 장은 살 때일까요, 팔 때일까요?`}
                        url={`https://stock-trend-program.co.kr/discovery`}
                        buttonText="카카오톡으로 공유"
                        className="text-xs font-bold text-[#391B1B] bg-[#FEE500] hover:bg-[#FEE500]/90 px-3 py-1.5 rounded-xl border border-[#FEE500]/20 transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {data.stats.kospi && (
                        <div className="bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            {renderStatsBar(data.stats.kospi, 'KOSPI (코스피)')}
                        </div>
                    )}
                    {data.stats.kosdaq && (
                        <div className="bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            {renderStatsBar(data.stats.kosdaq, 'KOSDAQ (코스닥)')}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. 특이 공시 속보 (Breaking Disclosures) - Executive Radar */}
            <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="relative p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            <Radio className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : 'animate-pulse'}`} />
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm md:text-base font-black text-white tracking-tight">실시간 특이 공시 속보 레이더</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    LIVE DART
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                유상증자 · 대규모 수주계약 · CB발행 · 지분변동 등 주가 변동성을 촉발하는 핵심 공시 전산 포착
                            </p>
                        </div>
                    </div>

                    {lastUpdated && (
                        <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 self-start sm:self-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{lastUpdated} 기준 수신</span>
                        </span>
                    )}
                </div>
                
                {Array.isArray(data.disclosures) && data.disclosures.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {data.disclosures.slice(0, 6).map((item, idx) => {
                            const cat = getDisclosureCategory(item.title);
                            const redirectUrl = `/news-redirect?target=${encodeURIComponent(item.link)}&title=${encodeURIComponent(item.title)}&source=${encodeURIComponent(item.press || '공시정보')}`;

                            return (
                                <a
                                    key={idx}
                                    href={redirectUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-col justify-between p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-amber-500/40 transition-all duration-200 group h-full shadow-sm hover:shadow-xl relative overflow-hidden"
                                >
                                    <div>
                                        {/* 상단 뱃지 라인 */}
                                        <div className="flex justify-between items-center text-[10px] font-mono mb-2.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${cat.color}`}>
                                                    <span>{cat.icon}</span>
                                                    <span>{cat.label}</span>
                                                </span>
                                                {item.press && (
                                                    <span className="text-zinc-400 font-medium px-1.5 py-0.5 bg-white/5 rounded border border-white/5">
                                                        {item.press}
                                                    </span>
                                                )}
                                            </div>
                                            {getNewsBadge(item.title)}
                                        </div>

                                        {/* 공시 헤드라인 */}
                                        <h4 className="text-xs md:text-sm font-bold text-zinc-100 group-hover:text-amber-300 leading-snug transition-colors line-clamp-2 mb-3">
                                            {item.title}
                                        </h4>
                                    </div>

                                    {/* 하단 푸터 라인 */}
                                    <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                                        <span className="font-mono">{item.date || '오늘'}</span>
                                        <div className="flex items-center gap-1 text-zinc-400 group-hover:text-amber-400 transition-colors font-medium text-[11px]">
                                            <span>원문 확인</span>
                                            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2 bg-black/20 rounded-2xl border border-white/5">
                        <AlertCircle className="w-7 h-7 opacity-40 text-zinc-500" />
                        <p>현재 시장에 영향력이 큰 특이 공시가 감지되지 않았습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
