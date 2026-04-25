"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import MarketScannerDashboard from "@/components/MarketScannerDashboard";
import { Loader2, Search, TrendingUp, TrendingDown, Activity, Zap, BarChart3, ChevronRight, ShieldCheck, Building2, Users, Globe, Info, RefreshCw, AlertTriangle, AlertCircle, ArrowUpRight, ArrowDownRight, Clock, DollarSign, PieChart, Star, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import KoreanCompanyOverview from "@/components/KoreanCompanyOverview";
import TurboQuantIndicators from "@/components/TurboQuantIndicators";
import InvestorTrendTab from "@/components/InvestorTrendTab";
import GaugeChart from "@/components/GaugeChart";

function DiscoveryContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || "";
    const [searchTerm, setSearchTerm] = useState("");
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'analysis' | 'news' | 'price' | 'dart' | 'financials' | 'health'>('analysis');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchTerm.trim();
        if (trimmed) {
            router.push(`/discovery?q=${encodeURIComponent(trimmed)}`);
        }
    };

    useEffect(() => {
        if (!query) {
            setAnalysisData(null);
            setError(null);
            return;
        }

        const fetchAnalysis = async () => {
            setIsAnalyzing(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE_URL}/api/stock/${encodeURIComponent(query)}`);
                const json = await res.json();
                if (json.status === 'success') {
                    setAnalysisData(json.data);
                } else {
                    setError(json.message || "종목을 찾을 수 없습니다.");
                }
            } catch (err) {
                setError("서버 통신 중 오류가 발생했습니다.");
            } finally {
                setIsAnalyzing(false);
            }
        };

        fetchAnalysis();
    }, [query]);

    return (
        <div className="min-h-screen pb-20 text-white bg-black font-[Outfit]">
            <Header title="종목발굴" subtitle={query ? `'${query}' 분석 결과` : "실시간 시장 데이터 분석"} />
            
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
                {!query && (
                    <div className="space-y-16 animate-in fade-in slide-in-from-top-8 duration-1000">
                        <div className="max-w-3xl mx-auto">
                            <form onSubmit={handleSearch} className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <div className="relative flex items-center bg-[#0d0d0f] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl p-2">
                                    <div className="pl-6 text-gray-500">
                                        <Search className="w-6 h-6" />
                                    </div>
                                    <input 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="종목명 또는 코드를 입력하세요..."
                                        className="w-full bg-transparent border-none focus:ring-0 text-white py-6 px-6 text-lg font-medium"
                                    />
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[1.5rem] font-black transition-all mr-2">
                                        분석 시작
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="space-y-8">
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-black text-white tracking-tighter">시장 가이드</h2>
                                <p className="text-gray-500 text-sm">현재 시장의 온도와 주요 지표를 확인하세요.</p>
                            </div>
                            <MarketScannerDashboard />
                        </div>
                    </div>
                )}

                {query && (
                    <div className="space-y-10">
                        {isAnalyzing && !analysisData ? (
                            <div className="p-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10 animate-pulse">
                                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
                                <h3 className="text-3xl font-black text-white tracking-tighter italic">AI 정밀 분석 엔진 가동 중...</h3>
                                <p className="text-gray-500 mt-2 font-bold">네이버 금융 및 DART 데이터를 파싱하여 리포트를 생성하고 있습니다.</p>
                            </div>
                        ) : error ? (
                            <div className="p-20 border border-red-500/20 bg-red-500/5 rounded-[3rem] text-center">
                                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                                <h3 className="text-2xl font-bold text-white mb-2">{error}</h3>
                                <p className="text-gray-500 mb-8">일시적인 오류이거나 존재하지 않는 종목 코드일 수 있습니다.</p>
                                <button onClick={() => router.push('/discovery')} className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-bold transition-all">
                                    다른 종목 검색하기
                                </button>
                            </div>
                        ) : analysisData ? (
                            <div className="space-y-12 animate-in fade-in duration-700">
                                
                                {/* 🏛️ 1. 첫 화면 헤더: 종목 정보 및 점수 */}
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full"></div>
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 relative z-10">
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <h1 className="text-6xl font-black text-white tracking-tighter leading-none">{analysisData.name}</h1>
                                                    <span className="text-2xl text-gray-500 font-mono font-bold mt-2">{analysisData.symbol}</span>
                                                </div>
                                                
                                                <div className="flex items-baseline gap-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-7xl font-black text-white font-mono tracking-tighter leading-none">
                                                            {analysisData.currency === 'KRW' ? '₩' : '$'}{analysisData.price}
                                                        </span>
                                                        {analysisData.price_krw && analysisData.currency !== 'KRW' && (
                                                            <span className="text-orange-400 font-bold text-xl mt-1">₩{analysisData.price_krw}</span>
                                                        )}
                                                    </div>
                                                    <div className={`flex items-center gap-2 font-black text-3xl ${analysisData.change?.includes('-') ? 'text-blue-400' : 'text-red-400'}`}>
                                                        {analysisData.change?.includes('-') ? <TrendingDown className="w-8 h-8" /> : <TrendingUp className="w-8 h-8" />}
                                                        {analysisData.change}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5">
                                                    {[
                                                        { label: "수급 에너지", score: analysisData.metrics?.supplyDemand, color: "#3b82f6", icon: <Users className="w-3.5 h-3.5 text-blue-400" /> },
                                                        { label: "재무 분석", score: analysisData.metrics?.financials, color: "#10b981", icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> },
                                                        { label: "시장 심리", score: analysisData.metrics?.news, color: "#f59e0b", icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> }
                                                    ].map((m, i) => (
                                                        <div key={i} className="flex flex-col items-center space-y-4">
                                                            <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                                {m.icon} {m.label}
                                                            </h5>
                                                            <GaugeChart score={m.score || 50} label={m.label} color={m.color} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-black/40 p-8 rounded-[3rem] border border-white/5 flex flex-col items-center gap-4">
                                                <div className="relative w-44 h-44 flex items-center justify-center">
                                                    <svg className="w-full h-full -rotate-90">
                                                        <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                                                        <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                                            strokeDasharray={502} strokeDashoffset={502 - (502 * (analysisData.score || 0) / 100)}
                                                            className={analysisData.score >= 70 ? "text-emerald-500" : analysisData.score >= 40 ? "text-yellow-500" : "text-red-500"} 
                                                            strokeLinecap="round" />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-6xl font-black text-white leading-none">{analysisData.score || 0}</span>
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">AI SCORE</span>
                                                    </div>
                                                </div>
                                                <div className="px-5 py-1.5 bg-white/5 rounded-full border border-white/10">
                                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-tighter italic">Grade {analysisData.score >= 70 ? 'S' : analysisData.score >= 40 ? 'A' : 'B'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 실전 대응 전략 */}
                                    <div className="bg-[#0d0d0f] border border-white/10 rounded-[3rem] p-10 shadow-2xl flex flex-col">
                                         <h5 className="text-xl font-black text-white mb-8 flex items-center gap-2 tracking-tight">
                                             <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> AI 실전 대응 전략
                                         </h5>
                                         <div className="space-y-8 flex-1">
                                             <div className="space-y-4">
                                                 <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-500/10 w-fit px-2 py-1 rounded">Buy Points</p>
                                                 <div className="space-y-3">
                                                     {(analysisData.rationale?.pros || []).slice(0, 3).map((p: string, i: number) => (
                                                         <div key={i} className="flex gap-3 text-sm text-gray-300 font-medium">
                                                             <span className="text-emerald-400 flex-shrink-0 mt-1">●</span>
                                                             <p className="leading-snug">{p}</p>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                             <div className="h-px bg-white/5" />
                                             <div className="space-y-4">
                                                 <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest bg-rose-500/10 w-fit px-2 py-1 rounded">Caution Points</p>
                                                 <div className="space-y-3">
                                                     {(analysisData.rationale?.cons || []).slice(0, 2).map((c: string, i: number) => (
                                                         <div key={i} className="flex gap-3 text-sm text-gray-400 font-medium">
                                                             <span className="text-rose-400 flex-shrink-0 mt-1">■</span>
                                                             <p className="leading-snug">{c}</p>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         </div>
                                    </div>
                                </div>

                                {/* AI 요약 리포트 + 주요 관찰 포인트 */}
                                <div className="bg-gradient-to-br from-blue-600/15 to-purple-600/15 border border-white/10 rounded-[3rem] p-12 shadow-2xl backdrop-blur-xl">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-500/20 p-2 rounded-xl"><Zap className="w-5 h-5 text-blue-400" /></div>
                                            <h5 className="text-2xl font-black text-white tracking-tighter uppercase">AI 통합 분석 리포트</h5>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black text-purple-400 uppercase tracking-tighter">
                                                추세 강도 {analysisData.strategy?.trend_strength || 0}%
                                            </div>
                                            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                                변동성 {analysisData.strategy?.volatility || 0}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <p className="text-gray-100 leading-relaxed text-3xl font-medium italic bg-black/30 p-10 rounded-[2.5rem] border border-white/5">
                                            "{analysisData.summary || analysisData.analysis_summary}"
                                        </p>
                                        {analysisData.strategy?.observation_point && (
                                            <div className="bg-blue-500/10 border-l-4 border-blue-500 p-6 rounded-r-2xl">
                                                <p className="text-lg font-bold text-blue-300 flex items-center gap-2">
                                                    <Info className="w-5 h-5" /> 주요 관찰 포인트: <span className="text-white">{analysisData.strategy.observation_point}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 📑 2. 상세 데이터 영역 (6개 탭 구조) */}
                                <div className="space-y-10 pt-10 border-t border-white/10">
                                    <div className="flex items-center gap-1 border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur-md px-2 overflow-x-auto no-scrollbar">
                                        {[
                                            { id: 'analysis', label: '데이터 종합 분석' },
                                            { id: 'news', label: '관련 뉴스' },
                                            { id: 'price', label: '일일 시세' },
                                            { id: 'dart', label: '공시(DART)', isNew: true },
                                            { id: 'financials', label: '재무제표' },
                                            { id: 'health', label: '💰 배당/건전성', isNew: true }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`relative flex items-center gap-2 px-8 py-6 text-base font-bold transition-all whitespace-nowrap ${
                                                    activeTab === tab.id 
                                                    ? 'text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-400' 
                                                    : 'text-gray-500 hover:text-white'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                {tab.isNew && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                                                        tab.id === 'health' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                        New
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="pt-6">
                                        {activeTab === 'analysis' && (
                                            <div className="space-y-10 animate-in fade-in duration-500">
                                                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-xl">
                                                    <h5 className="text-2xl font-black text-white mb-10 uppercase tracking-tighter flex items-center gap-3">
                                                        <Building2 className="w-6 h-6 text-blue-400" /> 기업 개요 및 사업 분석
                                                    </h5>
                                                    <KoreanCompanyOverview symbol={analysisData.symbol} stockName={analysisData.name} />
                                                </div>

                                                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-xl">
                                                    <h5 className="text-2xl font-black text-white mb-10 uppercase tracking-tighter flex items-center gap-3">
                                                        <Users className="w-6 h-6 text-purple-400" /> 외국인 / 기관 수급 트렌드
                                                    </h5>
                                                    <InvestorTrendTab symbol={analysisData.symbol} stockName={analysisData.name} />
                                                </div>

                                                {/* 연관 종목 섹션 */}
                                                {analysisData.related_stocks && analysisData.related_stocks.length > 0 && (
                                                    <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-xl">
                                                         <h5 className="text-2xl font-black text-white mb-10 uppercase tracking-tighter flex items-center gap-3">
                                                             <PieChart className="w-6 h-6 text-amber-400" /> 섹터 연관 종목 비교
                                                         </h5>
                                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                             {analysisData.related_stocks.map((s: any, i: number) => (
                                                                 <div key={i} className="bg-black/30 border border-white/5 p-6 rounded-2xl hover:bg-black/50 transition-all group cursor-pointer" onClick={() => router.push(`/discovery?q=${s.symbol}`)}>
                                                                     <div className="flex justify-between items-start mb-4">
                                                                         <div>
                                                                             <p className="text-xl font-black text-white group-hover:text-blue-400 transition-colors">{s.name}</p>
                                                                             <p className="text-xs text-gray-500 font-mono">{s.symbol}</p>
                                                                         </div>
                                                                         <ArrowUpRight className="w-5 h-5 text-gray-700 group-hover:text-blue-400 transition-colors" />
                                                                     </div>
                                                                     <p className="text-sm text-gray-400 leading-snug">{s.reason}</p>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'news' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                                                {analysisData.news?.slice(0, 10).map((item: any, i: number) => (
                                                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] hover:bg-white/10 transition-all group">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest px-2 py-1 bg-blue-400/10 rounded-md">{item.source}</span>
                                                            <span className="text-[10px] text-gray-600 font-mono">{item.time}</span>
                                                        </div>
                                                        <h6 className="text-lg font-bold text-gray-200 group-hover:text-white line-clamp-2 leading-snug">{item.title}</h6>
                                                        <div className="mt-6 flex items-center gap-2 text-gray-500 text-xs font-bold group-hover:text-blue-400 transition-colors">
                                                            기사 원문 보기 <ChevronRight className="w-4 h-4" />
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === 'price' && (
                                            <div className="p-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10">
                                                <Activity className="w-16 h-16 text-gray-700 mx-auto mb-6 animate-bounce" />
                                                <h4 className="text-xl font-black text-gray-500">실시간 일일 시세 모니터링</h4>
                                                <p className="text-gray-600 mt-2">차트와 호가 데이터를 통합 분석 중입니다.</p>
                                            </div>
                                        )}

                                        {activeTab === 'dart' && (
                                            <div className="p-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10">
                                                <FileText className="w-16 h-16 text-gray-700 mx-auto mb-6" />
                                                <h4 className="text-xl font-black text-gray-500">DART 공시 분석</h4>
                                                <p className="text-gray-600 mt-2">최신 공시 내용을 파싱하여 핵심 키워드를 추출합니다.</p>
                                            </div>
                                        )}

                                        {activeTab === 'financials' && (
                                            <div className="animate-in fade-in duration-500">
                                                <TurboQuantIndicators symbol={analysisData.symbol} stockName={analysisData.name} />
                                            </div>
                                        )}

                                        {activeTab === 'health' && (
                                            <div className="animate-in fade-in duration-500">
                                                {(() => {
                                                    const hData = analysisData.health_data || {};
                                                    const raw = hData.raw_data || {};
                                                    const years = raw.debt_ratio?.dates || [];
                                                    const chartData = years.slice(0, 4).map((y: string, i: number) => ({
                                                        year: y,
                                                        debt: raw.debt_ratio?.values?.[i],
                                                        current: raw.current_ratio?.values?.[i],
                                                        roe: raw.roe?.values?.[i],
                                                    })).filter((d: any) => d.year);

                                                    return (
                                                        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl">
                                                            <div className="flex items-center justify-between mb-10">
                                                                <h4 className="text-2xl font-black text-white flex items-center gap-3">
                                                                    <Activity className="w-6 h-6 text-blue-400" /> 재무 건전성 분석
                                                                </h4>
                                                                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Health Score: {hData.score || 0}</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-[450px]">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={chartData}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                                        <XAxis dataKey="year" stroke="#4b5563" fontSize={11} axisLine={false} tickLine={false} />
                                                                        <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} unit="%" />
                                                                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", color: "#fff" }} />
                                                                        <Legend iconType="circle" />
                                                                        <Line type="monotone" dataKey="debt" name="부채비율" stroke="#ef4444" strokeWidth={4} dot={{ r: 6 }} />
                                                                        <Line type="monotone" dataKey="current" name="유동비율" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6 }} />
                                                                        <Line type="monotone" dataKey="roe" name="ROE" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6 }} />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 🏛️ 3. 하단 시장 가이드 (초창기 통합형 레이아웃 복구) */}
                                <div className="pt-20 border-t border-white/10 space-y-8">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-3xl font-black text-white tracking-tighter">시장 가이드</h2>
                                        <p className="text-gray-500 text-sm">종목 분석과 함께 현재 시장의 전반적인 흐름을 체크하세요.</p>
                                    </div>
                                    <MarketScannerDashboard />
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="max-w-4xl mx-auto px-6 py-12 border-t border-white/5 opacity-40 text-center">
                    <p className="text-[10px] text-gray-500">
                        본 프로그램에서 제공하는 정보는 참고용 데이터이며, 투자 자문을 제공하지 않습니다. 모든 투자 결정의 책임은 투자자 본인에게 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function DiscoveryPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
            <DiscoveryContent />
        </Suspense>
    );
}
