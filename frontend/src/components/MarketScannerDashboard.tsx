'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Radio, AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw, Zap } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import KakaoShareButton from './KakaoShareButton';

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
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [animateBars, setAnimateBars] = useState(false);

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        setIsRefreshing(true);
        setAnimateBars(false);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/scanner`);
            const resData = await res.json();
            if (resData.status === 'success') {
                setData(resData.data);
                setLastUpdated(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                setTimeout(() => setAnimateBars(true), 100); // 데이터 로드 후 애니메이션 트리거
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
                {[0, 1].map(i => (
                    <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 animate-pulse">
                        <div className="h-5 w-40 bg-white/10 rounded mb-4" />
                        <div className="h-3 w-full bg-white/5 rounded mb-6" />
                        <div className="space-y-4">
                            <div className="h-8 w-full bg-white/5 rounded" />
                            <div className="h-8 w-full bg-white/5 rounded" />
                        </div>
                    </div>
                ))}
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
                        <span className="text-sm font-bold text-white">{name}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            score >= 55 ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : score >= 45 ? 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        }`}>
                            {sentiment.label}
                        </span>
                    </div>
                    <span className="text-gray-500 text-[11px] font-mono">총 {total.toLocaleString()}종목</span>
                </div>

                {/* 메인 바 */}
                <div className="relative">
                    <div className="h-5 w-full flex rounded-lg overflow-hidden bg-white/5 border border-white/10">
                        <div
                            style={{ width: animateBars ? `${upPct}%` : '0%' }}
                            className="bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-1000 ease-out flex items-center justify-center"
                        >
                            {upPct > 12 && (
                                <span className="text-[9px] font-black text-white/90 drop-shadow">{Number(upPct || 0).toFixed(0)}%</span>
                            )}
                        </div>
                        <div
                            style={{ width: animateBars ? `${samePct}%` : '0%' }}
                            className="bg-gray-600/60 transition-all duration-1000 ease-out delay-100 flex items-center justify-center"
                        >
                            {samePct > 8 && (
                                <span className="text-[9px] font-black text-gray-300/80">{Number(samePct || 0).toFixed(0)}%</span>
                            )}
                        </div>
                        <div
                            style={{ width: animateBars ? `${downPct}%` : '0%' }}
                            className="bg-gradient-to-l from-blue-500 to-indigo-400 transition-all duration-1000 ease-out delay-200 flex items-center justify-center"
                        >
                            {downPct > 12 && (
                                <span className="text-[9px] font-black text-white/90 drop-shadow">{Number(downPct || 0).toFixed(0)}%</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 수치 */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg py-1.5 px-2">
                        <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-3 h-3 text-red-400" />
                            <span className="text-red-400 font-black text-sm">{(stats.up || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-0.5">상승</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg py-1.5 px-2">
                        <div className="flex items-center justify-center gap-1">
                            <Minus className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-400 font-black text-sm">{(stats.same || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-0.5">보합</p>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg py-1.5 px-2">
                        <div className="flex items-center justify-center gap-1">
                            <TrendingDown className="w-3 h-3 text-blue-400" />
                            <span className="text-blue-400 font-black text-sm">{(stats.down || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-0.5">하락</p>
                    </div>
                </div>
            </div>
        );
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
        <div className="space-y-4 mt-8">
            {/* 종합 시장 체감 온도 카드 -> 한국판 공포/탐욕 지수 */}
            <div className={`relative bg-black/40 border border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl group`}>
                {/* 배경 글로우 */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 blur-[80px] opacity-20 transition-all duration-1000 ${
                    combinedScore >= 55 ? 'bg-red-500' : combinedScore >= 45 ? 'bg-gray-500' : 'bg-blue-500'
                }`} />

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner ${
                            combinedScore >= 55 ? 'bg-red-500/15' : combinedScore >= 45 ? 'bg-gray-500/15' : 'bg-blue-500/15'
                        }`}>
                            <Zap className={`w-7 h-7 md:w-8 md:h-8 ${combined.color} group-hover:scale-110 transition-transform`} />
                        </div>
                        <div>
                            <p className="text-[12px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                                KOREA FEAR & GREED INDEX
                            </p>
                            <h2 className={`text-2xl md:text-3xl font-black ${combined.color} tracking-tight drop-shadow-md`}>
                                {combined.label} <span className="text-white/80 text-xl font-bold ml-1">{combinedScore}</span>
                            </h2>
                        </div>
                    </div>

                    {/* 온도 게이지 */}
                    <div className="flex-1 w-full max-w-md">
                        <div className="flex justify-between text-xs text-gray-400 font-bold mb-2">
                            <span className="text-blue-400">극단적 공포</span>
                            <span className="text-red-400">극단적 탐욕</span>
                        </div>
                        <div className="h-4 md:h-5 w-full bg-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner relative">
                            {/* 마커 눈금 */}
                            <div className="absolute inset-0 flex justify-between px-1 items-center opacity-30">
                                <div className="w-0.5 h-full bg-white"></div>
                                <div className="w-0.5 h-full bg-white"></div>
                                <div className="w-0.5 h-full bg-white"></div>
                                <div className="w-0.5 h-full bg-white"></div>
                                <div className="w-0.5 h-full bg-white"></div>
                            </div>
                            <div
                                style={{ width: animateBars ? `${combinedScore}%` : '0%' }}
                                className={`h-full bg-gradient-to-r ${combined.bar} rounded-full transition-all duration-[2000ms] ease-out shadow-lg ${combined.glow} relative`}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 rounded-full blur-[1px]"></div>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono font-bold px-1">
                            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                        </div>
                    </div>
                </div>
                
                {/* 갱신 시각 및 바이럴 버튼 */}
                <div className="mt-6 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`} />
                        <span>{lastUpdated || '로딩중'} 업데이트됨 (1분 주기)</span>
                        <button onClick={() => fetchData()} className="ml-2 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <KakaoShareButton 
                        title={`오늘의 공포/탐욕 지수: ${combined.label} (${combinedScore}점)`}
                        description={`코스피/코스닥 시장 분위기를 알려드립니다! 지금 장은 살 때일까요, 팔 때일까요?`}
                        url={`https://stock-trend-program.co.kr/discovery`}
                        buttonText="카카오톡으로 시장 분위기 공유하기"
                        className="text-xs font-bold text-[#391B1B] bg-[#FEE500] hover:bg-[#FEE500]/90 px-3 py-1.5 rounded-lg border border-[#FEE500]/20 transition-all flex items-center gap-1.5 w-full md:w-auto justify-center"
                    />
                </div>

                {/* 통합된 KOSPI/KOSDAQ 스캐너 */}
                <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-base font-bold text-white">상세 시장 수급 현황 (Today's 증시 스캐너)</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-5 leading-relaxed">
                        📈 <strong className="text-gray-400">상승(빨강)</strong> 비율이 높을수록 투자 심리가 안정된 상태입니다.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        {data.stats?.kospi && renderStatsBar(data.stats.kospi, 'KOSPI (코스피)')}
                        {data.stats?.kosdaq && renderStatsBar(data.stats.kosdaq, 'KOSDAQ (코스닥)')}
                    </div>
                </div>
            </div>

            {/* 공시 속보 (Full Width Grid) */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Radio className={`w-5 h-5 text-red-500 ${isRefreshing ? 'animate-spin' : 'animate-pulse'}`} />
                            <h3 className="text-base font-bold text-white">특이 공시 속보</h3>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            유상증자·수주·계약 등 호재/악재 공시를 신속하게 포착합니다.
                        </p>
                    </div>
                    {lastUpdated && (
                        <span className="text-xs text-gray-500 font-mono flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full">
                            <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            {lastUpdated}
                        </span>
                    )}
                </div>
                
                {Array.isArray(data.disclosures) && data.disclosures.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {data.disclosures.slice(0, 9).map((item, idx) => (
                            <a
                                key={idx}
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex flex-col p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all group h-full"
                            >
                                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-2">
                                    <div className="flex items-center">
                                        <span className="text-amber-400/80 font-bold px-2 py-0.5 bg-amber-400/10 rounded-md">
                                            {item.press}
                                        </span>
                                        {getNewsBadge(item.title)}
                                    </div>
                                    <span className="text-gray-500 bg-black/20 px-2 py-0.5 rounded-md">{item.date}</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-300 group-hover:text-amber-300 leading-snug transition-colors line-clamp-2">
                                    {item.title}
                                </h4>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-600 text-sm space-y-3 bg-black/20 rounded-2xl border border-white/5">
                        <AlertCircle className="w-8 h-8 opacity-40" />
                        <p>현재 포착된 특이 공시가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
