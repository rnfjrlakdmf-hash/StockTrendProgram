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
    const [showGuide, setShowGuide] = useState(false);
    const [filterKeyword, setFilterKeyword] = useState<string | null>(null);

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
        <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black">
            <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
                    
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    <Activity className="w-3 h-3" />
                                    Real-time Analysis Active
                                </div>
                                <button 
                                    onClick={() => setShowGuide(!showGuide)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${
                                        showGuide 
                                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' 
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-blue-500/30 hover:text-blue-400'
                                    }`}
                                >
                                    <Sparkles className="w-3 h-3" />
                                    {showGuide ? 'Close Guide' : 'Beginner Guide'}
                                </button>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                                ETF <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Statistics</span>
                            </h1>
                            <p className="text-gray-400 font-bold max-w-xl leading-snug text-xs md:text-sm">
                                {market === 'KR' 
                                    ? "국내 상장된 주요 ETF(레버리지, 인버스, 배당주 등)의 거래량과 등락률 통계 데이터를 실시간 모니터링합니다."
                                    : "미국 시장을 구성하는 지수 추종 ETF와 섹터별 상품군의 실시간 데이터를 집계하여 노출합니다."
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
                    
                    {/* Beginner Metrics Guide Section */}
                    {showGuide && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="space-y-2">
                                <div className="p-2 w-fit bg-blue-500/20 rounded-lg text-blue-400">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <h4 className="font-black text-white text-sm">운용보수 (TER)</h4>
                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">펀드 운용 과정에서 발생하는 연간 비용 비율로, 일할 계산되어 순자산가치에 반영됩니다.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="p-2 w-fit bg-purple-500/20 rounded-lg text-purple-400">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <h4 className="font-black text-white text-sm">순자산총액 (AUM)</h4>
                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">해당 ETF가 보유한 자산의 총 가치입니다. 펀드의 전체 운용 규모를 나타내는 지표입니다.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="p-2 w-fit bg-red-500/20 rounded-lg text-red-400">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <h4 className="font-black text-white text-sm">추적오차 / 괴리율</h4>
                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">기초지수수익률과 ETF 수익률 간의 차이, 또는 실제 가치와 시장가 간의 차이를 나타냅니다.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="p-2 w-fit bg-yellow-500/20 rounded-lg text-yellow-400">
                                    <Filter className="w-4 h-4" />
                                </div>
                                <h4 className="font-black text-white text-sm">유동성 (거래량)</h4>
                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">시장 내에서 체결된 거래의 총 수량입니다. 매수/매도 호가의 촘촘한 정도를 결정하는 통계치입니다.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left/Middle: Main Widget */}
                        <div className="xl:col-span-2 space-y-8">
                            <EtfRankingWidget data={data} market={market} loading={loading} filterKeyword={filterKeyword} />
                            
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
                                <h3 className="text-xl font-black text-white mb-6 tracking-tight">시장 데이터 모니터</h3>
                                
                                <div className="space-y-6 relative">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shrink-0">
                                            <Activity className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-gray-300 leading-relaxed bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                                                현재 {market === 'KR' ? '국내' : '미국'} ETF 시장에서 거래량이 가장 활발한 종목은 
                                                <span className="text-blue-400"> {data[0]?.name || '...'}</span> 입니다. 
                                                이 종목의 실시간 거래량은 {data[0]?.volume ? parseInt(data[0].volume).toLocaleString() : '0'}건을 기록 중입니다.
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-bold">Updated: {lastUpdate.toLocaleTimeString()}</p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">유형별 지표 (참고용)</h4>
                                        <div className="space-y-3">
                                            {[
                                                { title: "인버스/헷지군", keyword: "인버스", icon: <TrendingDown className="w-3.5 h-3.5 text-blue-400" /> },
                                                { title: "시장 지수 추종", keyword: market === 'KR' ? '200' : 'S&P', icon: <TrendingUp className="w-3.5 h-3.5 text-red-400" /> },
                                                { title: "섹터/테마군", keyword: "반도체", icon: <ArrowRight className="w-3.5 h-3.5 text-purple-400" /> }
                                            ].map((strat) => (
                                                <button 
                                                    key={strat.title} 
                                                    onClick={() => setFilterKeyword(filterKeyword === strat.keyword ? null : strat.keyword)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                                                        filterKeyword === strat.keyword 
                                                        ? 'bg-blue-600/20 border-blue-500/50' 
                                                        : 'bg-white/5 hover:bg-white/10 border-transparent'
                                                    }`}
                                                >
                                                    <span className={`text-xs font-bold ${filterKeyword === strat.keyword ? 'text-white' : 'text-gray-300'}`}>{strat.title}</span>
                                                    {strat.icon}
                                                </button>
                                            ))}
                                            {filterKeyword && (
                                                <button 
                                                    onClick={() => setFilterKeyword(null)}
                                                    className="w-full py-2 text-[10px] text-gray-500 font-bold hover:text-white transition-colors"
                                                >
                                                    정렬 초기화
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => window.location.href = `/analysis?symbol=${data[0]?.symbol}`}
                                        className="w-full mt-8 py-4 rounded-2xl border border-blue-600/50 text-blue-400 font-black text-sm hover:bg-blue-600/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        종목 상세 데이터 확인
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="mt-12 p-8 rounded-3xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[11px] text-gray-500 font-bold leading-relaxed max-w-2xl mx-auto uppercase tracking-tighter">
                            [ 투자 유의사항 및 면책 조항 ]<br />
                            본 서비스에서 제공하는 모든 데이터와 통계 정보는 투자 참고용으로만 활용되어야 하며, 어떠한 경우에도 투자 성과를 보장하거나 특정 종목의 매수/매도를 권유하지 않습니다. 
                            데이터는 거래소 및 정보 제공처의 사정에 따라 지연되거나 오차가 발생할 수 있습니다. 
                            모든 투자의 최종 결정과 그에 따른 책임은 투자자 본인에게 있음을 알려드립니다. 
                            본 서비스는 금융위원회의 유사투자자문업 신고 대상에 해당하지 않는 비자문형 시장 데이터 제공 도구입니다.
                        </p>
                    </div>
            </div>
        </div>
    );
}
