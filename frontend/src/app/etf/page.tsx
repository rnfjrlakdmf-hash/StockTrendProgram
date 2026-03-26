"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { API_BASE_URL } from '@/lib/config';
import { Activity, Globe, RefreshCcw, TrendingUp, TrendingDown, ArrowRight, Sparkles, Filter, Zap } from 'lucide-react';
import EtfRankingWidget from '@/components/EtfRankingWidget';

export default function EtfAnalysisPage() {
    const [market, setMarket] = useState<'KR' | 'US'>('KR');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [showGuide, setShowGuide] = useState(false);
    const [filterKeyword, setFilterKeyword] = useState<string | null>(null);
    const [apiCategoryKey, setApiCategoryKey] = useState<string | null>(null);

    const fetchEtfRankings = async (m: 'KR' | 'US', cat: string | null = null) => {
        setLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const url = cat 
                ? `${baseUrl}/api/rank/etf?market=${m}&category=${cat}` 
                : `${baseUrl}/api/rank/etf?market=${m}`;
                
            const response = await fetch(url);
            const res = await response.json();
            if (res.status === 'success') {
                setData(res.data);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch ETF rankings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryClick = (keyword: string | null, catKey: string | null) => {
        const isSame = filterKeyword === keyword && apiCategoryKey === catKey;
        const newKeyword = isSame ? null : keyword;
        const newCat = isSame ? null : catKey;
        
        setFilterKeyword(newKeyword);
        setApiCategoryKey(newCat); // Update the API category key state
        fetchEtfRankings(market, newCat);
    };

    useEffect(() => {
        fetchEtfRankings(market, apiCategoryKey); // Use apiCategoryKey for initial fetch
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchEtfRankings(market, apiCategoryKey); // Use apiCategoryKey for auto-refresh
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
                                ETF <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Statistics v2.5</span>
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
                    
                    {showGuide && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            {/* Guide 1: Core Metrics */}
                            <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 backdrop-blur-md">
                                <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-400" />
                                    ETF 투자 시 꼭 확인해야 할 필수 지표 4선
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <div className="p-1.5 w-fit bg-blue-500/20 rounded-md text-blue-400">
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </div>
                                        <h4 className="font-bold text-white text-xs">운용보수 (TER)</h4>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">펀드 운용 시 발생하는 연간 비용. 장기 투자일수록 보수가 낮은 상품이 유리합니다.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-1.5 w-fit bg-purple-500/20 rounded-md text-purple-400">
                                            <Activity className="w-3.5 h-3.5" />
                                        </div>
                                        <h4 className="font-bold text-white text-xs">순자산총액 (AUM)</h4>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">해당 ETF의 총 몸집. 규모가 클수록 거래가 안전하고 상장폐지 위험이 적습니다.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-1.5 w-fit bg-red-500/20 rounded-md text-red-400">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                        </div>
                                        <h4 className="font-bold text-white text-xs">추적오차 / 괴리율</h4>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">자산의 실제 가치와 주식시장 거래 가격의 차이. 0%에 가까울수록 제값을 주고받는 것입니다.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-1.5 w-fit bg-yellow-500/20 rounded-md text-yellow-400">
                                            <Filter className="w-3.5 h-3.5" />
                                        </div>
                                        <h4 className="font-bold text-white text-xs">유동성 (거래량)</h4>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">초보자는 무조건 거래량이 풍부한 종목을 고르세요. 원할 때 바로 팔 수 있어야 합니다.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guide 2: ETF Types Terminology */}
                            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/30 backdrop-blur-md">
                                <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-emerald-400" />
                                    초보자를 위한 ETF 유형별 필수 용어 사전
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 hover:border-emerald-500/20 transition-colors">
                                        <h4 className="text-emerald-400 font-black text-xs">#지수추종 (Index)</h4>
                                        <p className="text-gray-300 font-medium text-[10px]">코스피나 S&P500 등 '시장 전체 실력'에 투자하는 가장 기본적이고 안전한 정석 투자법입니다.</p>
                                        <p className="text-gray-500 text-[9px] italic">예) KODEX 200, SPY, QQQ</p>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 hover:border-emerald-500/20 transition-colors">
                                        <h4 className="text-emerald-400 font-black text-xs">#레버리지 (Leverage)</h4>
                                        <p className="text-gray-300 font-medium text-[10px]">시장이 1% 오를 때 수익을 2배, 3배 이상 추종하는 <span className="text-white font-bold">고위험 고수익</span> 상품입니다. 손실도 배가 됩니다.</p>
                                        <p className="text-gray-500 text-[9px] italic">예) TQQQ, KODEX 레버리지</p>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 hover:border-emerald-500/20 transition-colors">
                                        <h4 className="text-emerald-400 font-black text-xs">#인버스 (Inverse)</h4>
                                        <p className="text-gray-300 font-medium text-[10px]">주식 시장이 <span className="text-red-400 font-bold">하락할 때 반대로 수익이 나는 '청개구리' 상품</span>으로, 하락장 방어용으로 쓰입니다.</p>
                                        <p className="text-gray-500 text-[9px] italic">예) KODEX 인버스, SQQQ</p>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 hover:border-emerald-500/20 transition-colors">
                                        <h4 className="text-emerald-400 font-black text-xs">#배당/인컴 (Dividend)</h4>
                                        <p className="text-gray-300 font-medium text-[10px]">주가 상승폭은 적어도, 꼬박꼬박 이자(배당금)를 챙겨주는 '건물주' 스타일의 현금창출형 상품입니다.</p>
                                        <p className="text-gray-500 text-[9px] italic">예) SCHD, 커버드콜, 배당성장</p>
                                    </div>
                                </div>
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
                                        {[
                                            { tag: '지수추종', keyword: market === 'KR' ? '200' : 'S&P', cat: 'index' },
                                            { tag: '레버리지', keyword: null, cat: 'leverage' },
                                            { tag: '배당/리츠', keyword: null, cat: 'dividend' },
                                            { tag: '반도체', keyword: null, cat: 'semiconductor' },
                                            { tag: '2차전지', keyword: null, cat: 'battery' },
                                            { tag: 'IT/AI', keyword: null, cat: 'ai' },
                                            { tag: '헬스케어', keyword: null, cat: 'healthcare' },
                                            { tag: '채권/금리', keyword: null, cat: 'bond' }
                                        ].map((item) => {
                                            const isActive = filterKeyword === item.keyword && apiCategoryKey === item.cat;
                                            return (
                                                <span 
                                                    key={item.tag} 
                                                    onClick={() => handleCategoryClick(item.keyword, item.cat)}
                                                    className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                                        isActive
                                                        ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20'
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-blue-500/20 hover:text-blue-400'
                                                    }`}
                                                >
                                                    #{item.tag}
                                                </span>
                                            );
                                        })}
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
                                                { title: "인버스/헷지군", keyword: null, cat: "inverse", icon: <TrendingDown className="w-3.5 h-3.5 text-blue-400" /> },
                                                { title: "시장 지수 추종", keyword: market === 'KR' ? '200' : 'S&P', cat: "index", icon: <TrendingUp className="w-3.5 h-3.5 text-red-400" /> },
                                                { title: "2차전지 테마", keyword: null, cat: "battery", icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> },
                                                { title: "IT/AI 테마", keyword: null, cat: "ai", icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" /> },
                                                { title: "반도체 테마", keyword: null, cat: "semiconductor", icon: <BarChart3 className="w-3.5 h-3.5 text-orange-400" /> },
                                                { title: "배당주 테마", keyword: null, cat: "dividend", icon: <TrendingUp className="w-3.5 h-3.5 text-pink-400" /> },
                                                { title: "채권/금리군", keyword: null, cat: "bond", icon: <Activity className="w-3.5 h-3.5 text-emerald-400" /> }
                                            ].map((strat) => {
                                                const isActive = filterKeyword === strat.keyword && apiCategoryKey === strat.cat;
                                                return (
                                                    <button 
                                                        key={strat.title} 
                                                        onClick={() => handleCategoryClick(strat.keyword, strat.cat)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                                                            isActive 
                                                            ? 'bg-blue-600/20 border-blue-500/50' 
                                                            : 'bg-white/5 hover:bg-white/10 border-transparent'
                                                        }`}
                                                    >
                                                        <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-300'}`}>{strat.title}</span>
                                                        {strat.icon}
                                                    </button>
                                                );
                                            })}
                                            {filterKeyword && (
                                                <button 
                                                    onClick={() => {
                                                        setFilterKeyword(null);
                                                        fetchEtfRankings(market, null);
                                                    }}
                                                    className="w-full py-2 text-[10px] text-gray-500 font-bold hover:text-white transition-colors"
                                                >
                                                    정렬 초기화
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => window.location.href = `/etf-analysis?symbol=${data[0]?.symbol}`}
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
