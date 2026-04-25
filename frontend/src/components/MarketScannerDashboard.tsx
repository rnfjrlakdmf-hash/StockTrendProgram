'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Radio, AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw, Zap } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

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
    const combinedScore = Math.round((kospiScore + kosdaqScore) / 2);
    const combined = getSentiment(combinedScore);

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
                                <span className="text-[9px] font-black text-white/90 drop-shadow">{upPct.toFixed(0)}%</span>
                            )}
                        </div>
                        <div
                            style={{ width: animateBars ? `${samePct}%` : '0%' }}
                            className="bg-gray-600/60 transition-all duration-1000 ease-out delay-100 flex items-center justify-center"
                        >
                            {samePct > 8 && (
                                <span className="text-[9px] font-black text-gray-300/80">{samePct.toFixed(0)}%</span>
                            )}
                        </div>
                        <div
                            style={{ width: animateBars ? `${downPct}%` : '0%' }}
                            className="bg-gradient-to-l from-blue-500 to-indigo-400 transition-all duration-1000 ease-out delay-200 flex items-center justify-center"
                        >
                            {downPct > 12 && (
                                <span className="text-[9px] font-black text-white/90 drop-shadow">{downPct.toFixed(0)}%</span>
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

    return (
        <div className="space-y-4 mt-8">
            {/* 종합 시장 체감 온도 카드 */}
            <div className={`relative bg-white/[0.03] border border-white/10 rounded-2xl p-5 overflow-hidden`}>
                {/* 배경 글로우 */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-16 blur-3xl opacity-20 ${
                    combinedScore >= 55 ? 'bg-red-500' : combinedScore >= 45 ? 'bg-gray-500' : 'bg-blue-500'
                }`} />

                <div className="relative flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            combinedScore >= 55 ? 'bg-red-500/15' : combinedScore >= 45 ? 'bg-gray-500/15' : 'bg-blue-500/15'
                        }`}>
                            <Zap className={`w-5 h-5 ${combined.color}`} />
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">시장 체감 온도</p>
                            <p className={`text-xl font-black ${combined.color}`}>{combined.label}</p>
                        </div>
                    </div>

                    {/* 온도 게이지 */}
                    <div className="flex-1 min-w-[160px] max-w-xs">
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono mb-1">
                            <span>약세</span>
                            <span className={`font-black ${combined.color}`}>{combinedScore}점</span>
                            <span>강세</span>
                        </div>
                        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                            <div
                                style={{ width: animateBars ? `${combinedScore}%` : '0%' }}
                                className={`h-full bg-gradient-to-r ${combined.bar} rounded-full transition-all duration-1500 ease-out shadow-lg ${combined.glow}`}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-600 mt-0.5 font-mono">
                            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                        </div>
                    </div>

                    {/* 갱신 시각 */}
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                        <span>{lastUpdated || '로딩중'}</span>
                        <button onClick={() => fetchData()} className="ml-1 hover:text-gray-300 transition-colors">
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 메인 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 증시 스캐너 */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-base font-bold text-white">Today&apos;s 증시 스캐너</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-5 leading-relaxed">
                        📈 <strong className="text-gray-400">빨강(상승)</strong>이 넓을수록 수익 내기 좋은 장,
                        📉 <strong className="text-gray-400">파랑(하락)</strong>이 압도적이면 현금 비중 확대 고려.
                        <span className="text-gray-600"> (1분 자동갱신)</span>
                    </p>
                    <div className="space-y-6">
                        {data.stats?.kospi && renderStatsBar(data.stats.kospi, 'KOSPI (코스피)')}
                        {data.stats?.kosdaq && renderStatsBar(data.stats.kosdaq, 'KOSDAQ (코스닥)')}
                    </div>
                </div>

                {/* LIVE 공시 속보 */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-[320px]">
                    <div className="flex justify-between items-center mb-1 shrink-0">
                        <div className="flex items-center gap-2">
                            <Radio className={`w-4 h-4 text-red-500 ${isRefreshing ? 'animate-spin' : 'animate-pulse'}`} />
                            <h3 className="text-base font-bold text-white">LIVE 특이 공시 속보</h3>
                        </div>
                        {lastUpdated && (
                            <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                {lastUpdated}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3 pb-3 border-b border-white/10 shrink-0 leading-relaxed">
                        유상증자·수주·계약 등 호재/악재 공시를 실시간 포착합니다.
                    </p>
                    <div className="overflow-y-auto pr-1 custom-scrollbar flex-1 space-y-2">
                        {Array.isArray(data.disclosures) && data.disclosures.length > 0 ? (
                            data.disclosures.map((item, idx) => (
                                <a
                                    key={idx}
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 transition-all group"
                                >
                                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-1">
                                        <span className="text-amber-400/70 font-bold px-1.5 py-0.5 bg-amber-400/10 rounded-md">
                                            {item.press}
                                        </span>
                                        <span className="text-gray-600">{item.date}</span>
                                    </div>
                                    <h4 className="text-xs font-bold text-gray-300 group-hover:text-amber-300 leading-snug transition-colors">
                                        {item.title}
                                    </h4>
                                </a>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs space-y-2">
                                <AlertCircle className="w-7 h-7 opacity-40" />
                                <p>현재 포착된 특이 공시가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
