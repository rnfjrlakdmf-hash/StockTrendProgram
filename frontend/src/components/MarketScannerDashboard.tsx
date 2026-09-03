'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Radio, AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw, Zap, ExternalLink, Clock, FileText } from 'lucide-react';
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
        const sentiment = getSentiment(score);

        return (
            <div className="space-y-3">
                {/* 헤더 */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm md:text-base font-black text-white">{name}</span>
                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                            score >= 55 ? 'bg-red-500/20 border-red-500/40 text-red-300'
                            : score >= 45 ? 'bg-gray-500/20 border-gray-500/40 text-gray-300'
                            : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                        }`}>
                            {sentiment.label}
                        </span>
                    </div>
                    <span className="text-gray-400 text-xs font-mono font-medium">총 {total.toLocaleString()}개 종목</span>
                </div>

                {/* 메인 프로그레스 바 */}
                <div className="relative">
                    <div className="h-6 w-full flex rounded-xl overflow-hidden bg-black/60 border border-white/10 p-0.5 shadow-inner">
                        <div
                            style={{ width: animateBars ? `${upPct}%` : '0%' }}
                            className="bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-1000 ease-out flex items-center justify-center rounded-l-lg"
                        >
                            {upPct > 10 && (
                                <span className="text-[10px] font-black text-white drop-shadow font-mono">{Number(upPct || 0).toFixed(0)}%</span>
                            )}
                        </div>
                        <div
                            style={{ width: animateBars ? `${samePct}%` : '0%' }}
                            className="bg-zinc-600 transition-all duration-1000 ease-out delay-100 flex items-center justify-center"
                        >
                            {samePct > 8 && (
                                <span className="text-[10px] font-black text-zinc-200 font-mono">{Number(samePct || 0).toFixed(0)}%</span>
                            )}
                        </div>
                        <div
                            style={{ width: animateBars ? `${downPct}%` : '0%' }}
                            className="bg-gradient-to-l from-blue-600 to-cyan-500 transition-all duration-1000 ease-out delay-200 flex items-center justify-center rounded-r-lg"
                        >
                            {downPct > 10 && (
                                <span className="text-[10px] font-black text-white drop-shadow font-mono">{Number(downPct || 0).toFixed(0)}%</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3대 수치 카드 (고대비 깔끔 정렬) */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-1 sm:px-2">
                        <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-red-400 font-black text-sm md:text-base font-mono">{(stats.up || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] font-bold text-red-300/80 mt-0.5">상승 ({Number(upPct || 0).toFixed(0)}%)</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl py-2 px-1 sm:px-2">
                        <div className="flex items-center justify-center gap-1">
                            <Minus className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-300 font-black text-sm md:text-base font-mono">{(stats.same || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">보합 ({Number(samePct || 0).toFixed(0)}%)</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl py-2 px-1 sm:px-2">
                        <div className="flex items-center justify-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-blue-400 font-black text-sm md:text-base font-mono">{(stats.down || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] font-bold text-blue-300/80 mt-0.5">하락 ({Number(downPct || 0).toFixed(0)}%)</p>
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
            {/* 1. 종합 시장 심리 & 주요 지수 대시보드 (2단 깔끔 분할 레이아웃) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 좌측: 한국판 공포·탐욕 지수 (Fear & Greed Index) */}
                <div className="relative bg-zinc-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between overflow-hidden group">
                    {/* 배경 소프트 글로우 */}
                    <div className={`absolute -top-10 -left-10 w-48 h-48 blur-[70px] opacity-25 pointer-events-none transition-all duration-1000 ${
                        combinedScore >= 56 ? 'bg-red-500' : combinedScore >= 46 ? 'bg-gray-500' : 'bg-blue-500'
                    }`} />

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-xl border border-white/10 ${
                                    combinedScore >= 56 ? 'bg-red-500/15 text-red-400' : combinedScore >= 46 ? 'bg-gray-500/15 text-gray-400' : 'bg-blue-500/15 text-blue-400'
                                }`}>
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block font-mono">
                                        Market Sentiment
                                    </span>
                                    <h3 className="text-sm md:text-base font-black text-white">
                                        한국 시장 체감 온도 (공포·탐욕)
                                    </h3>
                                </div>
                            </div>

                            <span className={`text-xs md:text-sm font-black px-2.5 py-1 rounded-xl border ${
                                combinedScore >= 76 ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm' :
                                combinedScore >= 56 ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                                combinedScore >= 46 ? 'bg-gray-500/20 text-gray-300 border-gray-500/40' :
                                combinedScore >= 26 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                                'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                            }`}>
                                {combined.label} ({combinedScore}점)
                            </span>
                        </div>

                        {/* 메인 점수 및 게이지 */}
                        <div className="my-3 space-y-2">
                            <div className="flex items-baseline justify-between">
                                <div className="flex items-baseline gap-1.5">
                                    <span className={`text-3xl md:text-4xl font-black font-mono tracking-tight ${combined.color}`}>
                                        {combinedScore}
                                    </span>
                                    <span className="text-sm font-bold text-gray-400">/ 100점</span>
                                </div>
                                <span className="text-xs text-gray-400 font-medium">
                                    {combinedScore >= 76 ? "🔥 극단적 탐욕 (과열 주의)" :
                                     combinedScore >= 56 ? "📈 탐욕 (상승 우세)" :
                                     combinedScore >= 46 ? "⚖️ 중립 (관망세)" :
                                     combinedScore >= 26 ? "❄️ 공포 (하락 우세)" :
                                     "😱 극단적 공포 (과매도 구간)"}
                                </span>
                            </div>

                            {/* 온도 게이지 바 */}
                            <div className="h-4 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 relative shadow-inner">
                                <div
                                    style={{ width: animateBars ? `${combinedScore}%` : '0%' }}
                                    className={`h-full bg-gradient-to-r ${combined.bar} rounded-full transition-all duration-1000 ease-out relative`}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-md"></div>
                                </div>
                            </div>

                            {/* 게이지 눈금 라벨 */}
                            <div className="flex justify-between text-[10px] font-bold text-gray-500 font-mono pt-0.5">
                                <span className="text-blue-400">0 (극단적 공포)</span>
                                <span>50 (중립)</span>
                                <span className="text-red-400">100 (극단적 탐욕)</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-white/5 font-medium">
                        💡 코스피·코스닥 전체 종목의 실시간 상승/하락 비율과 수급을 종합 분석한 체감 심리지수입니다.
                    </p>
                </div>

                {/* 우측: 실시간 주요 지수 & 시장 상태 요약 */}
                <div className="relative bg-zinc-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/15 border border-white/10 text-emerald-400">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block font-mono">
                                        Live Market Pulse
                                    </span>
                                    <h3 className="text-sm md:text-base font-black text-white">
                                        실시간 주요 지수 & 시황 요약
                                    </h3>
                                </div>
                            </div>

                            {signal && (
                                <span className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                                    signal.signal === 'red' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                                    signal.signal === 'yellow' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}>
                                    {signal.signal === 'red' ? '🛑' : signal.signal === 'yellow' ? '⚠️' : '🚀'}
                                    <span>{signal.message || "정상 운영"}</span>
                                </span>
                            )}
                        </div>

                        {/* 3대 핵심 지표 카드 그리드 */}
                        <div className="grid grid-cols-3 gap-2 my-3">
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-2.5 text-center">
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">KOSPI</span>
                                <span className="text-xs sm:text-sm font-black font-mono text-white block truncate">
                                    {signal?.details?.kospi || "-"}
                                </span>
                            </div>
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-2.5 text-center">
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">KOSDAQ</span>
                                <span className="text-xs sm:text-sm font-black font-mono text-white block truncate">
                                    {signal?.details?.kosdaq || "-"}
                                </span>
                            </div>
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-2.5 text-center">
                                <span className="text-[10px] text-gray-400 font-bold block mb-1">원/달러 환율</span>
                                <span className="text-xs sm:text-sm font-black font-mono text-emerald-400 block truncate">
                                    {signal?.details?.usd ? `${signal.details.usd}원` : "-"}
                                </span>
                            </div>
                        </div>

                        {signal?.reason && (
                            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-xs text-gray-300 mb-2">
                                <span className="font-bold text-blue-300">💡 시황 포인트:</span> {signal.reason}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`} />
                            <span className="font-mono">{lastUpdated || '실시간 동기화'}</span>
                        </div>
                        <button
                            onClick={() => fetchData()}
                            disabled={isRefreshing}
                            className="hover:text-white transition-colors flex items-center gap-1 font-bold text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5"
                        >
                            <RefreshCw className={`w-3 h-3 text-orange-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>새로고침</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. 상세 시장 수급 현황 (Today's 증시 스캐너 - KOSPI vs KOSDAQ) */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/5 mb-5">
                    <div>
                        <h3 className="text-sm md:text-base font-black text-white flex items-center gap-2">
                            <span>📊 상세 시장 수급 현황 (Today's 증시 스캐너)</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            코스피·코스닥 시장 전체 상장 종목의 상승/보합/하락 분포를 실시간 집계합니다.
                        </p>
                    </div>
                    <KakaoShareButton 
                        title={`오늘의 공포/탐욕 지수: ${combined.label} (${combinedScore}점)`}
                        description={`코스피/코스닥 시장 분위기를 알려드립니다! 지금 장은 살 때일까요, 팔 때일까요?`}
                        url={`https://stock-trend-program.co.kr/discovery`}
                        buttonText="카카오톡으로 공유"
                        className="text-xs font-bold text-[#391B1B] bg-[#FEE500] hover:bg-[#FEE500]/90 px-3 py-1.5 rounded-xl border border-[#FEE500]/20 transition-all flex items-center gap-1.5 shrink-0"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {data.stats?.kospi && (
                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            {renderStatsBar(data.stats.kospi, '🇰🇷 KOSPI (코스피)')}
                        </div>
                    )}
                    {data.stats?.kosdaq && (
                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            {renderStatsBar(data.stats.kosdaq, '🇰🇷 KOSDAQ (코스닥)')}
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
