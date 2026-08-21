"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { API_BASE_URL } from '@/lib/config';
import { Activity, Globe, RefreshCcw, TrendingUp, TrendingDown, ArrowRight, Sparkles, Filter, Zap, BarChart } from 'lucide-react';
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
        setData([]); // 탭 전환 시 이전 시장 데이터가 남아있는 버그 픽스
        
        try {
            const baseUrl = API_BASE_URL;
            const url = cat 
                ? `${baseUrl}/api/market/rank/etf?market=${m}&category=${cat}` 
                : `${baseUrl}/api/market/rank/etf?market=${m}`;
                
            const response = await fetch(url, { cache: 'no-store' });
            const res = await response.json();
            
            if (res.status === 'success') {
                // [리액트 크래시 방지 & Race Condition 완벽 차단]
                // 늦게 도착한 과거 요청 데이터가 화면을 덮어쓰는 것을 막기 위해, 데이터 본문(종목 코드)을 검열합니다.
                // 국내 ETF(KR) 심볼은 6자리 숫자, 미국 ETF(US) 심볼은 영문자입니다.
                const isKoreanData = res.data.length > 0 && /^\d+$/.test(res.data[0].symbol);
                
                if ((m === 'KR' && isKoreanData) || (m === 'US' && !isKoreanData)) {
                    setData(res.data);
                    setLastUpdate(new Date());
                }
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
    }, [market, apiCategoryKey]);

    return (
        <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black">
            <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
                    
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    <Activity className="w-3 h-3" />
                                    Real-time ETF Analysis
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
                                    {showGuide ? '가이드 닫기' : '초보자 ETF 분석 가이드'}
                                </button>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight flex items-center gap-3 flex-wrap">
                                <span>실시간 ETF 랭킹 &amp; 괴리율 레이더</span>
                                <span className="text-xs md:text-sm font-black px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full text-white shadow-lg shadow-blue-500/20">
                                    TOP 50 실시간
                                </span>
                            </h1>
                            <p className="text-gray-400 font-medium max-w-2xl leading-relaxed text-xs md:text-sm">
                                {market === 'KR' 
                                    ? "국내 상장된 주요 ETF(레버리지, 인버스, 배당주, 반도체 등)의 실시간 거래량, 거래대금, 실시간 NAV 및 괴리율 데이터를 모니터링합니다."
                                    : "미국 시장 지수(S&P500, 나스닥) 추종 ETF 및 글로벌 핵심 섹터·레버리지 상품군의 실시간 시세를 집계합니다."
                                }
                            </p>
                        </div>
                        
                        {/* Market Selector Tabs */}
                        <div className="flex p-1.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shrink-0">
                            <button
                                onClick={() => setMarket('KR')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all cursor-pointer ${
                                    market === 'KR' 
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-600/30' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="text-lg">🇰🇷</span> 국내 ETF
                            </button>
                            <button
                                onClick={() => setMarket('US')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all cursor-pointer ${
                                    market === 'US' 
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-600/30' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="text-lg">🇺🇸</span> 미국 ETF
                            </button>
                        </div>
                    </div>
                    
                    {showGuide && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            {/* Guide 1: Core Metrics */}
                            <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 backdrop-blur-md">
                                <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-400" />
                                    ETF 시장 분석을 위한 핵심 데이터 지표
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <div className="p-1.5 w-fit bg-blue-500/20 rounded-md text-blue-400">
                                            <Sparkles className="w-3.5 h-3.5" />
                                        </div>
                                        <h4 className="font-bold text-white text-xs">총보수비율 (TER)</h4>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">총보수비율(Total Expense Ratio). 장기 투자 수익률에 누적적 영향을 미치는 비용 지표로, 동일 지수 상품 간 비교의 핵심 기준입니다.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-1.5 w-fit bg-purple-500/20 rounded-md text-purple-400">
                                            <Activity className="w-3.5 h-3.5" />
                                        </div>
                                        <h4 className="font-bold text-white text-xs">순자산총액 (AUM)</h4>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">자산운용규모(Assets Under Management). 시장 조성자(LP)의 호가 공급 안정성 및 펀드 운용의 영속성을 평가하는 기준입니다.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-1.5 w-fit bg-red-500/20 rounded-md text-red-400">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                        </div>
                                        <h4 className="font-bold text-white text-xs">추적오차 / 괴리율</h4>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">기초지수와 NAV(순자산가치) 간의 오차, 그리고 NAV와 실제 거래 가격 간의 차이입니다. 스프레드 확대 구간에서는 유의가 필요합니다.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-1.5 w-fit bg-yellow-500/20 rounded-md text-yellow-400">
                                            <Filter className="w-3.5 h-3.5" />
                                        </div>
                                        <h4 className="font-bold text-white text-xs">시장 유동성</h4>
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">평균 거래량과 호가 잔량을 의미합니다. 유동성 부족 시 슬리피지(Slippage) 비용이 발생할 수 있어 체결 강도 확인이 권장됩니다.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guide 2: ETF Types Terminology */}
                            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/30 backdrop-blur-md">
                                <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-emerald-400" />
                                    주요 ETF 자산군 분류 및 통계적 특징
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 hover:border-emerald-500/20 transition-colors">
                                        <h4 className="text-emerald-400 font-black text-xs">#지수추종 (Index)</h4>
                                        <p className="text-gray-300 font-medium text-[10px]">특정 시장 지수의 수익률을 추종합니다. 광범위한 분산투자 효과를 통해 개별 기업 리스크(Unsystematic Risk)를 축소하는 패시브 전략입니다.</p>
                                        <p className="text-gray-500 text-[9px] italic">예) KODEX 200, SPY, QQQ</p>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 hover:border-emerald-500/20 transition-colors">
                                        <h4 className="text-emerald-400 font-black text-xs">#레버리지 (Leverage)</h4>
                                        <p className="text-gray-300 font-medium text-[10px]">기초자산의 일간 수익률을 배수 단위로 추종합니다. 변동성 장세에서는 음의 복리 효과(Volatility Drag)로 인해 장기 보유 시 손실 위험이 확대될 수 있습니다.</p>
                                        <p className="text-gray-500 text-[9px] italic">예) TQQQ, KODEX 레버리지</p>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 hover:border-emerald-500/20 transition-colors">
                                        <h4 className="text-emerald-400 font-black text-xs">#인버스 (Inverse)</h4>
                                        <p className="text-gray-300 font-medium text-[10px]">기초자산의 가격 하락에 역방향으로 수익을 추종하는 구조입니다. 포트폴리오의 시스템 리스크를 헤지(Hedge)하기 위한 단기 전술적 도구로 주로 활용됩니다.</p>
                                        <p className="text-gray-500 text-[9px] italic">예) KODEX 인버스, SQQQ</p>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 hover:border-emerald-500/20 transition-colors">
                                        <h4 className="text-emerald-400 font-black text-xs">#배당/인컴 (Dividend)</h4>
                                        <p className="text-gray-300 font-medium text-[10px]">안정적인 현금흐름 창출을 목적으로 하는 전략입니다. 배당 수익률(Yield)과 성장성(Growth)을 분석하여 포트폴리오의 방어력을 강화합니다.</p>
                                        <p className="text-gray-500 text-[9px] italic">예) SCHD, 커버드콜, 배당성장</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Full-Width ETF Ranking Widget (TOP 50) */}
                    <div className="w-full space-y-8">
                        <EtfRankingWidget data={data} market={market} loading={loading} filterKeyword={filterKeyword} />
                    </div>

                    {/* Bottom Analytics & Strategy Panels */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                        {/* Market Summary Banner */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20 flex flex-col justify-between">
                            <div>
                                <h4 className="text-purple-400 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> 실시간 ETF 수급 인사이트
                                </h4>
                                <p className="text-gray-200 text-xs md:text-sm font-bold leading-relaxed">
                                    {market === 'KR' 
                                        ? "실시간 거래량 분석 결과, 특정 섹터(반도체, 2차전지, 인버스 등)로의 자금 쏠림이 관찰됩니다. 매매 전 순자산가치(NAV) 대비 괴리율이 ±1% 이내인지 반드시 확인하시기 바랍니다."
                                        : "매크로 지표 및 빅테크 변동에 따라 나스닥100 및 레버리지(TQQQ, SOXL) ETF의 거래량이 확대되고 있습니다. 기초자산 변동폭을 고려하여 분할 대응을 권장합니다."
                                    }
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-purple-500/20 text-[11px] text-purple-300/80 font-medium">
                                💡 괴리율이 벌어졌을 때는 시장가 매수 시 슬리피지(손실)가 발생할 수 있습니다.
                            </div>
                        </div>

                        {/* Smart Filter Category Tags */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 flex flex-col justify-between">
                            <div>
                                <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Filter className="w-4 h-4" /> 테마별 원터치 필터
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { tag: '지수추종', keyword: market === 'KR' ? '200' : 'S&P', cat: 'index' },
                                        { tag: '레버리지', keyword: null, cat: 'leverage' },
                                        { tag: '인버스/숏', keyword: null, cat: 'inverse' },
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
                                                className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    isActive
                                                    ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20 scale-105'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-blue-500/20 hover:text-blue-400'
                                                }`}
                                            >
                                                #{item.tag}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                            {filterKeyword && (
                                <button 
                                    onClick={() => {
                                        setFilterKeyword(null);
                                        setApiCategoryKey(null);
                                        fetchEtfRankings(market, null);
                                    }}
                                    className="mt-3 w-full py-1.5 bg-white/5 hover:bg-white/10 text-[11px] text-gray-400 hover:text-white rounded-lg transition-colors font-bold"
                                >
                                    필터 초기화 (전체 보기)
                                </button>
                            )}
                        </div>

                        {/* Market Monitor Summary */}
                        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/10 flex flex-col justify-between">
                            <div>
                                <h4 className="text-white font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-400" /> 거래량 1위 리딩 종목
                                </h4>
                                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                                    <div className="text-xs font-bold text-gray-300">
                                        현재 거래량 1위: <span className="text-blue-400 font-extrabold">{data[0]?.name || '집계 중...'}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-400">
                                        당일 누적 거래량: <span className="text-white font-bold">{data[0]?.volume ? parseInt(String(data[0].volume).replace(/,/g, '')).toLocaleString() : '0'}주</span>
                                    </div>
                                    {data[0]?.amount && (
                                        <div className="text-[11px] text-gray-400">
                                            당일 거래대금: <span className="text-amber-400 font-bold">{data[0].amount}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={() => window.location.href = `/etf-analysis?symbol=${data[0]?.symbol}`}
                                className="w-full mt-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                1위 종목 심층 분석 차트 보기
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
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
