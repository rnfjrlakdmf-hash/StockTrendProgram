"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import MarketScannerDashboard from "@/components/MarketScannerDashboard";
import { Loader2, Search, TrendingUp, TrendingDown, Activity, Zap, BarChart3, ChevronRight, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";

function DiscoveryContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || "";
    const [searchTerm, setSearchTerm] = useState("");
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showWaitHint, setShowWaitHint] = useState(false);

    React.useEffect(() => {
        let timer: any;
        if (isAnalyzing) {
            timer = setTimeout(() => setShowWaitHint(true), 10000);
        } else {
            setShowWaitHint(false);
        }
        return () => clearTimeout(timer);
    }, [isAnalyzing]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchTerm.trim();
        if (trimmed) {
            setIsAnalyzing(true);
            setAnalysisData(null);
            setError(null);
            router.push(`/discovery?q=${encodeURIComponent(trimmed)}`);
        }
    };

    React.useEffect(() => {
        if (!query) {
            setAnalysisData(null);
            setError(null);
            return;
        }

        const fetchAnalysis = async () => {
            setIsAnalyzing(true);
            setError(null);
            
            // Timeout logic
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

            try {
                console.log(`[Discovery] Starting analysis for: ${query}`);
                const res = await fetch(`${API_BASE_URL}/api/stock/${encodeURIComponent(query)}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const json = await res.json();
                if (json.status === 'success') {
                    setAnalysisData(json.data);
                } else {
                    setError(json.message || "종목을 찾을 수 없거나 분석 중 오류가 발생했습니다.");
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    setError("분석 시간이 너무 오래 걸려 중단되었습니다. 잠시 후 다시 시도해 주세요.");
                } else {
                    console.error("Analysis fetch error:", err);
                    setError("서버 통신 중 오류가 발생했습니다. 네트워크 상태를 확인해 주세요.");
                }
            } finally {
                setIsAnalyzing(false);
            }
        };

        fetchAnalysis();
    }, [query]);

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="종목발굴" subtitle={query ? `'${query}' 분석 결과` : "실시간 시장 데이터 분석"} />
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
                {/* 🔍 프리미엄 검색바 (메인) */}
                {!query && (
                    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-top-8 duration-1000 delay-150">
                        <form onSubmit={handleSearch} className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative flex items-center bg-[#0d0d0f] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                                <div className="pl-6 text-gray-500">
                                    <Search className="w-6 h-6" />
                                </div>
                                <input 
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="분석할 종목명 또는 코드를 입력하세요 (예: 삼성전자, 005930)"
                                    className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-600 py-6 px-6 text-lg font-medium"
                                />
                                <button 
                                    type="submit"
                                    className="mr-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-[1.5rem] font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                                >
                                    분석 시작
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 🎯 검색 전: 메인 스캐너 & 실시간 공시 */}
                {!query && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-8">
                        <div className="text-center space-y-2 mb-4">
                            <h2 className="text-3xl font-black text-white tracking-tighter flex items-center justify-center gap-3">
                                <span className="w-12 h-[2px] bg-gradient-to-r from-transparent to-blue-500"></span>
                                종목발굴 시장 가이드
                                <span className="w-12 h-[2px] bg-gradient-to-l from-transparent to-blue-500"></span>
                            </h2>
                            <p className="text-gray-500 text-sm font-medium">검색 전, 현재 시장의 온도와 긴급 공시를 먼저 확인하세요.</p>
                        </div>
                        <MarketScannerDashboard />
                    </div>
                )}

                {/* 🔍 검색 후: 결과 표시 */}
                {query && (
                    <div className="space-y-10">
                         {/* 검색 후 상단에 콤팩트한 검색바 다시 제공 */}
                         <div className="max-w-2xl mx-auto mb-10">
                            <form onSubmit={handleSearch} className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-all">
                                <Search className="w-5 h-5 ml-4 text-gray-500" />
                                <input 
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="다른 종목 검색..."
                                    className="w-full bg-transparent border-none focus:ring-0 text-white py-3 px-4 text-sm font-medium"
                                />
                            </form>
                         </div>

                         {isAnalyzing ? (
                            <div className="p-20 border border-white/5 bg-white/[0.03] rounded-[4rem] text-center backdrop-blur-3xl shadow-2xl animate-in zoom-in-95 duration-700 border-t-blue-500/10">
                                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative">
                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                    <div className="absolute inset-0 rounded-[2rem] border-2 border-blue-500/20 animate-ping"></div>
                                </div>
                                <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">'{query}' 정밀 분석 중</h3>
                                <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                                    AI가 실시간 호가, 수급 동향, 재무 제표를 결합하여 <br/>
                                    <span className="text-blue-400 font-bold">최적의 매수/매도 대처 시나리오</span>를 산출하고 있습니다.
                                </p>

                                {showWaitHint && (
                                    <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500 max-w-md mx-auto">
                                        <p className="text-blue-300 text-sm font-medium">
                                            ⌛ 현재 정밀 분석량이 많아 평소보다 조금 더 소요되고 있습니다. <br/>
                                            잠시만 더 기다려 주시면 최상의 분석 결과를 보여드릴게요!
                                        </p>
                                    </div>
                                )}
                            </div>
                         ) : error ? (
                            <div className="p-20 border border-red-500/20 bg-red-500/5 rounded-[3rem] text-center backdrop-blur-xl animate-in fade-in duration-500">
                                <div className="text-red-400 mb-4 flex justify-center">
                                    <Search className="w-12 h-12 opacity-50" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{error}</h3>
                                <p className="text-gray-500 text-sm">종목명을 다시 확인하시거나 잠시 후 다시 시도해 주세요.</p>
                                <button onClick={() => router.push('/discovery')} className="mt-8 text-blue-400 hover:underline text-sm font-bold">홈으로 돌아가기</button>
                            </div>
                         ) : analysisData && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* 🏢 종목 헤더 (리포트 스타일) */}
                                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <BarChart3 className="w-48 h-48 -rotate-12" />
                                    </div>
                                    <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{analysisData.name}</h4>
                                                <span className="text-gray-500 font-mono text-lg tracking-widest">{analysisData.symbol}</span>
                                                {analysisData.details?.market_status && (
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${
                                                        analysisData.details.market_status.includes('장중') ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                    }`}>
                                                        {analysisData.details.market_status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-baseline gap-4">
                                                <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter">
                                                    {analysisData.currency === 'KRW' ? '₩' : '$'}{analysisData.price}
                                                </span>
                                                <div className={`flex items-center gap-1 font-bold text-lg ${analysisData.change?.includes('-') ? 'text-blue-400' : 'text-red-400'}`}>
                                                    {analysisData.change?.includes('-') ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                                                    <span>{analysisData.change}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                                            {[
                                                { label: "시가총액", value: analysisData.details?.market_cap || "N/A" },
                                                { label: "PER", value: `${analysisData.details?.pe_ratio || "N/A"}배` },
                                                { label: "PBR", value: `${analysisData.details?.pbr || "N/A"}배` },
                                                { label: "거래량", value: analysisData.details?.volume?.toLocaleString() || "N/A" }
                                            ].map((item, i) => (
                                                <div key={i} className="bg-white/5 px-4 py-3 rounded-2xl border border-white/5 min-w-[100px]">
                                                    <p className="text-[10px] text-gray-500 font-black uppercase mb-1">{item.label}</p>
                                                    <p className="text-sm font-bold text-gray-200">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 🧠 AI 분석 매트릭스 (2열 레이아웃) */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-2xl h-full">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl animate-pulse">🤖</div>
                                                <div>
                                                    <h5 className="text-xl font-black text-white uppercase tracking-tight">AI 통합 분석 리포트</h5>
                                                    <p className="text-blue-300/80 text-xs font-bold uppercase tracking-widest">Composite Investment Score: {analysisData.score}pts</p>
                                                </div>
                                            </div>
                                            <p className="text-gray-200 leading-relaxed text-lg mb-6 bg-black/30 p-6 rounded-2xl border border-white/5 italic">
                                                "{analysisData.summary}"
                                            </p>
                                            
                                            {analysisData.description && (
                                                <div className="mb-8 px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                                                    <h5 className="text-[10px] text-gray-500 uppercase font-black mb-2 flex items-center gap-2">
                                                        <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                                                        기업 개요
                                                    </h5>
                                                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                                                        {analysisData.description}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-center group hover:bg-blue-500/10 transition-colors">
                                                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">수급 에너지</p>
                                                    <p className="text-2xl font-black text-white">{analysisData.metrics?.supplyDemand}%</p>
                                                </div>
                                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-center group hover:bg-blue-500/10 transition-colors">
                                                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">재무 건전성</p>
                                                    <p className="text-2xl font-black text-white">{analysisData.metrics?.financials}%</p>
                                                </div>
                                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-center group hover:bg-blue-500/10 transition-colors">
                                                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1">이슈 민감도</p>
                                                    <p className="text-2xl font-black text-white">{analysisData.metrics?.news}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="bg-[#0d0d0f] border border-white/10 rounded-[2.5rem] p-8 h-full flex flex-col">
                                            <h5 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                                                <Zap className="w-5 h-5 text-amber-400" /> AI 대처 전략
                                            </h5>
                                            <div className="space-y-5 flex-1">
                                                <div className="space-y-3">
                                                    <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Strong Points</p>
                                                    {analysisData.rationale?.pros?.slice(0, 3).map((p: string, i: number) => (
                                                        <div key={i} className="flex gap-3 text-sm text-gray-300 items-start">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                                            <p className="leading-snug">{p}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="h-px bg-white/5 w-full my-2" />
                                                <div className="space-y-3">
                                                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Cautionary Points</p>
                                                    {analysisData.rationale?.cons?.slice(0, 2).map((c: string, i: number) => (
                                                        <div key={i} className="flex gap-3 text-sm text-gray-400 items-start">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                                            <p className="leading-snug">{c}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => router.push(`/analysis?symbol=${analysisData.symbol}`)}
                                                className="mt-8 w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 group flex items-center justify-center gap-2"
                                            >
                                                <span>프로 분석 리포트 이동</span>
                                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {(() => {
                                    const hData = analysisData.health_data || {};
                                    const raw = hData.raw_data || {};
                                    
                                    // 백엔드 raw_data 구조에 맞게 데이터 가공 (dates와 values 결합)
                                    const years = raw.debt_ratio?.dates || [];
                                    const healthChartData = years.slice(0, 4).map((y: string, i: number) => ({
                                        year: y,
                                        debt: raw.debt_ratio?.values?.[i],
                                        current: raw.current_ratio?.values?.[i],
                                        roe: raw.roe?.values?.[i],
                                    })).filter(d => d.year && (d.debt !== null || d.current !== null || d.roe !== null));

                                    if (healthChartData.length === 0) return null;

                                    return (
                                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                            <div className="flex items-center justify-between mb-10">
                                                <div>
                                                    <h4 className="text-xl font-black text-white flex items-center gap-2">
                                                        <span className="bg-blue-500/20 p-2 rounded-xl"><Activity className="w-5 h-5 text-blue-400" /></span>
                                                        🏦 재무 건전성 추이 분석
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-2 ml-11 uppercase font-bold tracking-widest">3개년 재무 안정성 지표 (DART/Naver 실시간 연동)</p>
                                                </div>
                                            </div>

                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={healthChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                        <XAxis dataKey="year" stroke="#4b5563" fontSize={11} axisLine={false} tickLine={false} tickMargin={10} />
                                                        <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} unit="%" />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "24px", backdropFilter: "blur(12px)", color: "#fff" }}
                                                            formatter={(value: any) => [`${value}%`, ""]}
                                                        />
                                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                                                        <Line type="monotone" dataKey="debt" name="부채비율" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, strokeWidth: 2, stroke: "#000", fill: "#ef4444" }} connectNulls animationDuration={1000} />
                                                        <Line type="monotone" dataKey="current" name="유동비율" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, strokeWidth: 2, stroke: "#000", fill: "#3b82f6" }} connectNulls animationDuration={1200} />
                                                        <Line type="monotone" dataKey="roe" name="자기자본이익률(ROE)" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, strokeWidth: 2, stroke: "#000", fill: "#f59e0b" }} connectNulls animationDuration={1400} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
                                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 group hover:bg-red-500/5 transition-all">
                                                    <div className="flex items-center gap-2 mb-2 text-red-400">
                                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                        <span className="text-[10px] font-black uppercase">부채비율</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 leading-snug">자본 대비 빚의 비율입니다. 100% 미만이면 재무 상태가 매우 탄탄해요.</p>
                                                </div>
                                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 group hover:bg-blue-500/5 transition-all">
                                                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                                        <span className="text-[10px] font-black uppercase">유동비율</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 leading-snug">현금화 가능한 자산의 비율입니다. 200% 이상이면 단기 위기에 강해요.</p>
                                                </div>
                                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 group hover:bg-amber-500/5 transition-all">
                                                    <div className="flex items-center gap-2 mb-2 text-amber-400">
                                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                        <span className="text-[10px] font-black uppercase">ROE (수익성)</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 leading-snug">내 돈으로 얼마나 벌었는지를 뜻해요. 15% 이상이면 알짜배기 성장을 하고 있어요.</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {/* 📉 하단: 섹터 내 위치 및 추가 분석 카드 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between group cursor-pointer hover:border-blue-500/30 transition-all"
                                         onClick={() => router.push(`/analysis?symbol=${analysisData.symbol}`)}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                                <Activity className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <div>
                                                <h6 className="font-bold text-white">섹터 내 순위 및 비교 분석</h6>
                                                <p className="text-xs text-gray-500">동종 업계 대비 가치/성장 점수를 확인하세요.</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between group cursor-pointer hover:border-purple-500/30 transition-all"
                                         onClick={() => router.push(`/signals`)}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                                <Search className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <h6 className="font-bold text-white">유사 테마 종목 발굴</h6>
                                                <p className="text-xs text-gray-500">현재 상승 모멘텀을 공유하는 종목들을 탐색합니다.</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                    </div>
                                </div>

                                <div className="pt-10 opacity-30 hover:opacity-100 transition-opacity">
                                    <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 text-center">Current Market Snapshot</h5>
                                    <MarketScannerDashboard />
                                </div>
                            </div>
                        )}
                         )}
                    </div>
                )}

                {/* ⚖️ 법적 면책 조항 (유사투자자문업 준수) */}
                <div className="max-w-4xl mx-auto px-6 py-12 border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity">
                    <div className="flex items-start gap-4 text-[10px] text-gray-500 leading-relaxed text-center justify-center">
                        <p>
                            <strong>[투자 유의사항 및 법적 고지]</strong><br/>
                            본 프로그램에서 제공하는 모든 정보는 공시 데이터 및 시장 지표를 기반으로 한 **객관적 데이터 분석 결과**이며, 특정 종목에 대한 매수/매도 권유 또는 투자 자문을 제공하지 않습니다. <br/>
                            AI 분석 결과는 학습된 알고리즘에 따른 참고용 수치일 뿐, 향후 주가 흐름이나 수익률을 보장하지 않습니다. <br/>
                            모든 투자의 최종 결정과 책임은 투자자 본인에게 있으며, 본 시스템은 어떠한 경우에도 투자 결과에 대한 법적 책임을 지지 않습니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DiscoveryPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        }>
            <DiscoveryContent />
        </Suspense>
    );
}
