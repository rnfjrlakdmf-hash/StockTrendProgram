"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { API_BASE_URL } from '@/lib/config';
import { Activity, Globe, RefreshCcw, TrendingUp, TrendingDown, ArrowRight, Sparkles, Filter } from 'lucide-react';
import EtfRankingWidget from '@/components/EtfRankingWidget';

export default function EtfAnalysisPage() {
    const [market, setMarket] = useState<'KR' | 'US'>('KR');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const fetchEtfRankings = async (m: 'KR' | 'US') => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rank/etf?market=${m}`);
            const json = await res.json();
            if (json.status === "success") {
                setData(json.data);
                setLastUpdate(new Date());
            }
        } catch (err) {
            console.error("Failed to fetch ETF rankings:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEtfRankings(market);
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchEtfRankings(market);
        }, 30000);
        
        return () => clearInterval(interval);
    }, [market]);

    return (
        <div className="flex h-screen bg-black overflow-hidden font-sans">
            <Sidebar />
            
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black">
                <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
                    
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                <Activity className="w-3 h-3" />
                                Real-time Analysis Active
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                ETF <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Intelligence</span>
                            </h1>
                            <p className="text-gray-400 font-bold max-w-xl leading-relaxed text-sm md:text-base">
                                {market === 'KR' 
                                    ? "국내 상장된 주요 ETF(레버리지, 인버스, 배당주 등)의 거래량과 수익률을 실시간으로 분석합니다."
                                    : "미국 시장을 주도하는 지수 추종 ETF와 테마별 글로벌 상품군을 분석하여 최적의 통찰력을 제공합니다."
                                }
                            </p>
                        </div>
                        
                        {/* Market Selector Tabs */}
                        <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shrink-0">
                            <button
                                onClick={() => setMarket('KR')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                                    market === 'KR' 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="text-lg">🇰🇷</span> 국내 시장
                            </button>
                            <button
                                onClick={() => setMarket('US')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                                    market === 'US' 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="text-lg">🇺🇸</span> 미국 시장
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left/Middle: Main Widget */}
                        <div className="xl:col-span-2 space-y-8">
                            <EtfRankingWidget data={data} market={market} loading={loading} />
                            
                            {/* Market Summary Banner */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20">
                                    <h4 className="text-purple-400 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> Today's Alpha
                                    </h4>
                                    <p className="text-gray-200 text-sm font-bold leading-relaxed">
                                        {market === 'KR' 
                                            ? "오늘 국내 ETF 시장은 반도체 및 2차전지 테마의 거래가 집중되고 있습니다. 상위 거래 종목의 괴리율을 체크하세요."
                                            : "강력한 기술주 상승세로 QQQ와 SOXX의 자금 유입이 뚜렷합니다. 국채 금리 변동에 따른 TMF/TMV 전략을 확인하세요."
                                        }
                                    </p>
                                </div>
                                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20">
                                    <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Filter className="w-4 h-4" /> Smart Filter
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['지수추종', '레버리지', '배당우선', '섹터/테마'].map((tag) => (
                                            <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-gray-400 font-bold hover:bg-blue-500/20 hover:text-blue-400 transition-colors cursor-pointer">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Info / Analysis Panel */}
                        <div className="space-y-6">
                            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden h-full">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                                <h3 className="text-xl font-black text-white mb-6 tracking-tight">시장 통합 분석 봇</h3>
                                
                                <div className="space-y-6 relative">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shrink-0">
                                            <Activity className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-gray-300 leading-relaxed bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                                                현재 {market === 'KR' ? '국내' : '미국'} ETF 시장의 핵심 키워드는 
                                                <span className="text-blue-400"> #{market === 'KR' ? '변동성' : '인플레이션'}</span> 입니다. 
                                                상위 랭킹 종목들은 모두 일일 변동성이 평소보다 2배 이상 높게 나타나고 있습니다.
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-bold">Updated: {lastUpdate.toLocaleTimeString()}</p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">전략 추천</h4>
                                        <div className="space-y-3">
                                            {[
                                                { title: "헷지 전략", icon: <TrendingDown className="w-3.5 h-3.5 text-blue-400" /> },
                                                { title: "모멘텀 추종", icon: <TrendingUp className="w-3.5 h-3.5 text-red-400" /> },
                                                { title: "장기 보유", icon: <ArrowRight className="w-3.5 h-3.5 text-purple-400" /> }
                                            ].map((strat) => (
                                                <div key={strat.title} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10">
                                                    <span className="text-xs font-bold text-gray-300">{strat.title}</span>
                                                    {strat.icon}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        className="w-full mt-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        상세 AI 리포트 보기
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
