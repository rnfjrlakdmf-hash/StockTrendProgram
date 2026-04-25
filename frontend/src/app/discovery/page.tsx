"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import MarketScannerDashboard from "@/components/MarketScannerDashboard";
import { Loader2, Search, TrendingUp, TrendingDown, Activity, Zap, BarChart3, ChevronRight, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import KoreanCompanyOverview from "@/components/KoreanCompanyOverview";
import TurboQuantIndicators from "@/components/TurboQuantIndicators";
import InvestorTrendTab from "@/components/InvestorTrendTab";

function DiscoveryContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || "";
    const [searchTerm, setSearchTerm] = useState("");
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showWaitHint, setShowWaitHint] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'news' | 'price' | 'dart' | 'financials' | 'health'>('analysis');

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
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            try {
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
                    setError("서버 통신 중 오류가 발생했습니다.");
                }
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
                            <div className="p-20 text-center">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                                <h3 className="text-2xl font-black text-white tracking-tighter">'{query}' 분석 중...</h3>
                            </div>
                         ) : error ? (
                            <div className="p-20 border border-red-500/20 bg-red-500/5 rounded-[3rem] text-center">
                                <h3 className="text-xl font-bold text-white mb-2">{error}</h3>
                                <button onClick={() => router.push('/discovery')} className="mt-8 text-blue-400 hover:underline">홈으로 돌아가기</button>
                            </div>
                         ) : analysisData ? (
                            <div className="space-y-8 animate-in fade-in duration-700">
                                {/* 종목 헤더 */}
                                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-4xl font-black text-white tracking-tighter">{analysisData.name}</h4>
                                                <span className="text-gray-500 font-mono text-lg">{analysisData.symbol}</span>
                                            </div>
                                            <div className="flex items-baseline gap-4">
                                                <span className="text-5xl font-black text-white font-mono">
                                                    {analysisData.currency === 'KRW' ? '₩' : '$'}{analysisData.price}
                                                </span>
                                                <div className={`flex items-center gap-1 font-bold text-xl ${analysisData.change?.includes('-') ? 'text-blue-400' : 'text-red-400'}`}>
                                                    {analysisData.change}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                                {/* 📑 탭 바 (요청된 순서 및 명칭 적용) */}
                                <div className="flex items-center gap-1 border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur-md px-2">
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
                                            className={`relative flex items-center gap-2 px-6 py-5 text-sm font-bold transition-all whitespace-nowrap ${
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

                                <div className="space-y-8 pt-4">
                                    {activeTab === 'analysis' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                                            <div className="lg:col-span-2 space-y-6">
                                                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-2xl">
                                                    <h5 className="text-xl font-black text-white mb-6 uppercase">AI 통합 분석 리포트</h5>
                                                    <p className="text-gray-200 leading-relaxed text-lg mb-6 bg-black/30 p-6 rounded-2xl italic">
                                                        "{analysisData.summary}"
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="bg-white/5 p-5 rounded-2xl text-center">
                                                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">수급 에너지</p>
                                                            <p className="text-2xl font-black text-white">{analysisData.metrics?.supplyDemand}%</p>
                                                        </div>
                                                        <div className="bg-white/5 p-5 rounded-2xl text-center">
                                                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">재무 건전성</p>
                                                            <p className="text-2xl font-black text-white">{analysisData.metrics?.financials}%</p>
                                                        </div>
                                                        <div className="bg-white/5 p-5 rounded-2xl text-center">
                                                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">이슈 민감도</p>
                                                            <p className="text-2xl font-black text-white">{analysisData.metrics?.news}%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-[#0d0d0f] border border-white/10 rounded-[2.5rem] p-8">
                                                <h5 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-amber-400" /> AI 대처 전략
                                                </h5>
                                                <div className="space-y-6">
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] text-green-500 font-black uppercase">Strong Points</p>
                                                        {analysisData.rationale?.pros?.slice(0, 3).map((p: string, i: number) => (
                                                            <p key={i} className="text-sm text-gray-300">• {p}</p>
                                                        ))}
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] text-rose-500 font-black uppercase">Cautionary Points</p>
                                                        {analysisData.rationale?.cons?.slice(0, 2).map((c: string, i: number) => (
                                                            <p key={i} className="text-sm text-gray-400">• {c}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 초창기 모델의 핵심: 상세 기업 개요 추가 */}
                                            <div className="lg:col-span-3">
                                                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                                                    <h5 className="text-xl font-black text-white mb-8 uppercase tracking-widest flex items-center gap-2">
                                                        <Building2 className="w-5 h-5 text-blue-400" /> 데이터 기반 상세 분석
                                                    </h5>
                                                    <KoreanCompanyOverview symbol={analysisData.symbol} stockName={analysisData.name} />
                                                </div>
                                            </div>

                                            {/* 초창기 모델의 핵심: 수급 분석 추가 */}
                                            <div className="lg:col-span-3">
                                                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                                                    <h5 className="text-xl font-black text-white mb-8 uppercase tracking-widest flex items-center gap-2">
                                                        <Users className="w-5 h-5 text-purple-400" /> 외국인/기관 수급 트렌드
                                                    </h5>
                                                    <InvestorTrendTab symbol={analysisData.symbol} stockName={analysisData.name} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'news' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
                                            {analysisData.news && analysisData.news.length > 0 ? (
                                                analysisData.news.slice(0, 8).map((item: any, i: number) => (
                                                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/10 transition-all">
                                                        <p className="text-[10px] text-blue-400 font-bold uppercase mb-2">{item.source}</p>
                                                        <h6 className="font-bold text-gray-200 line-clamp-2">{item.title}</h6>
                                                        <p className="text-xs text-gray-500 mt-2">{item.time}</p>
                                                    </a>
                                                ))
                                            ) : (
                                                <div className="col-span-full p-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                    <p className="text-gray-500">검색된 뉴스가 없습니다.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'price' && (
                                        <div className="p-20 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 animate-in fade-in duration-500">
                                            <p className="text-gray-500 mb-2">일일 시세 데이터 분석 중입니다.</p>
                                            <p className="text-[10px] text-gray-600 uppercase font-black">Coming Soon</p>
                                        </div>
                                    )}

                                    {activeTab === 'dart' && (
                                        <div className="p-20 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 animate-in fade-in duration-500">
                                            <p className="text-gray-500 mb-2">실시간 DART 공시 연동 기능이 준비 중입니다.</p>
                                            <p className="text-[10px] text-gray-600 uppercase font-black">Coming Soon</p>
                                        </div>
                                    )}

                                    {activeTab === 'financials' && (
                                        <div className="animate-in fade-in duration-500">
                                            <TurboQuantIndicators symbol={analysisData.symbol} stockName={analysisData.name} />
                                        </div>
                                    )}

                                    {activeTab === 'health' && (
                                        <div className="animate-in fade-in duration-500 space-y-8">
                                            {(() => {
                                                const hData = analysisData.health_data || {};
                                                const raw = hData.raw_data || {};
                                                const years = raw.debt_ratio?.dates || [];
                                                const chartData = years.slice(0, 4).map((y: string, i: number) => ({
                                                    year: y,
                                                    debt: raw.debt_ratio?.values?.[i],
                                                    current: raw.current_ratio?.values?.[i],
                                                    roe: raw.roe?.values?.[i],
                                                })).filter(d => d.year);

                                                if (chartData.length === 0) return (
                                                    <div className="p-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                        <p className="text-gray-500">재무 건전성 데이터가 없습니다.</p>
                                                    </div>
                                                );

                                                return (
                                                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                                                        <h4 className="text-xl font-black text-white mb-10 flex items-center gap-2">
                                                            <Activity className="w-5 h-5 text-blue-400" /> 재무 건전성 및 배당 추이
                                                        </h4>
                                                        <div className="h-[400px]">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={chartData}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                                    <XAxis dataKey="year" stroke="#4b5563" fontSize={11} axisLine={false} tickLine={false} />
                                                                    <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} unit="%" />
                                                                    <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "12px" }} />
                                                                    <Legend />
                                                                    <Line type="monotone" dataKey="debt" name="부채비율" stroke="#ef4444" strokeWidth={3} />
                                                                    <Line type="monotone" dataKey="current" name="유동비율" stroke="#3b82f6" strokeWidth={3} />
                                                                    <Line type="monotone" dataKey="roe" name="ROE" stroke="#f59e0b" strokeWidth={3} />
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
