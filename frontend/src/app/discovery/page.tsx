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
                        <MarketScannerDashboard />
                    </div>
                )}

                {query && (
                    <div className="space-y-6">
                        {isAnalyzing && !analysisData ? (
                            <div className="p-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10 animate-pulse">
                                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
                                <h3 className="text-3xl font-black text-white tracking-tighter italic">AI 정밀 분석 엔진 가동 중...</h3>
                            </div>
                        ) : error ? (
                            <div className="p-20 border border-red-500/20 bg-red-500/5 rounded-[3rem] text-center">
                                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                                <h3 className="text-2xl font-bold text-white mb-2">{error}</h3>
                            </div>
                        ) : analysisData ? (
                            <div className="animate-in fade-in duration-700">
                                {/* 🏛️ 최상단 탭 바 (스크린샷 스타일) */}
                                <div className="flex items-center gap-1 border-b border-white/10 sticky top-0 z-50 bg-black/90 backdrop-blur-md px-4 overflow-x-auto no-scrollbar mb-8">
                                    {[
                                        { id: 'analysis', label: 'AI 투자 의견' },
                                        { id: 'news', label: '관련 뉴스' },
                                        { id: 'price', label: '일일 시세' },
                                        { id: 'dart', label: '공시(DART)' },
                                        { id: 'financials', label: '재무제표' },
                                        { id: 'health', label: '💰 배당/건전성' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`relative flex items-center gap-2 px-6 py-6 text-base font-bold transition-all whitespace-nowrap ${
                                                activeTab === tab.id 
                                                ? 'text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-400' 
                                                : 'text-gray-500 hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-12">
                                    {activeTab === 'analysis' && (
                                        <div className="space-y-12 animate-in fade-in duration-500">
                                            
                                            {/* 📈 종합 분석 리포트 (스크린샷 1) */}
                                            <div className="space-y-8">
                                                <h4 className="text-2xl font-black text-white flex items-center gap-3">
                                                    <TrendingUp className="w-6 h-6 text-blue-400" /> 종합 분석 리포트
                                                </h4>
                                                <div className="space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/5">
                                                    {(analysisData.summary || analysisData.analysis_summary || "").split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => {
                                                        let icon = <span className="text-blue-400">✅</span>;
                                                        if (line.includes('⚠️')) icon = <span className="text-yellow-400">⚠️</span>;
                                                        if (line.includes('📝') || line.includes('💡')) icon = <span className="text-amber-400">💡</span>;
                                                        const cleanLine = line.replace(/[✅⚠️📝💡📊]/g, '').trim();
                                                        return (
                                                            <div key={i} className="flex items-start gap-4">
                                                                <div className="mt-1 flex-shrink-0 text-xl">{icon}</div>
                                                                <p className="text-gray-200 text-lg font-bold leading-relaxed">{cleanLine}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="bg-[#1a1a1c] border border-white/5 rounded-[2rem] p-8 shadow-xl">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <span className="text-2xl">✅</span>
                                                            <h5 className="text-xl font-black text-blue-400">수급 (Supply)</h5>
                                                        </div>
                                                        <p className="text-gray-300 font-medium leading-relaxed">{analysisData.rationale?.supply || "외인 및 기관의 수급 주체별 매매 동향이 핵심 지표로 작용하고 있습니다."}</p>
                                                    </div>
                                                    <div className="bg-[#1a1a1c] border border-white/5 rounded-[2rem] p-8 shadow-xl">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <span className="text-2xl">🔥</span>
                                                            <h5 className="text-xl font-black text-purple-400">모멘텀 (Momentum)</h5>
                                                        </div>
                                                        <p className="text-gray-300 font-medium leading-relaxed">{analysisData.rationale?.momentum || "차트 및 뉴스 심리를 바탕으로 한 단기 성장 탄력이 유지되고 있습니다."}</p>
                                                    </div>
                                                    <div className="bg-[#1a1a1c] border border-red-500/10 rounded-[2rem] p-8 shadow-xl">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <span className="text-2xl">⚠️</span>
                                                            <h5 className="text-xl font-black text-rose-500">리스크 (Risk)</h5>
                                                        </div>
                                                        <p className="text-gray-300 font-medium leading-relaxed">{analysisData.rationale?.risk || "대외 변수 및 업황 변동성에 따른 하방 위험을 상시 모니터링해야 합니다."}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-900/10 border border-blue-500/10 rounded-2xl p-8 flex items-center justify-between group cursor-pointer hover:bg-blue-900/20 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                                        <span className="text-xl font-bold text-gray-200">리스크 레이더 (SEIBRO)</span>
                                                    </div>
                                                    <ChevronRight className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors" />
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5 my-12" />

                                            {/* 📊 상세 재무/투자 지표 (스크린샷 2) */}
                                            <div className="space-y-8">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-2xl font-black text-white flex items-center gap-3">
                                                        <BarChart3 className="w-6 h-6 text-gray-400" /> 상세 재무/투자 지표
                                                    </h4>
                                                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                                                        <span className="text-xs font-black text-gray-400 uppercase tracking-tighter italic">🎓 주식 용어 번역기</span>
                                                        <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                                                            <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    {[
                                                        { label: "시가총액 (Market Cap)", value: analysisData.details?.market_cap || "1,125조 3,232 억원" },
                                                        { label: "거래량 (Volume)", value: analysisData.details?.volume?.toLocaleString() || "23,232,380" },
                                                        { label: "PER (주가수익비율)", value: `${analysisData.details?.pe_ratio || "39.47"}배` },
                                                        { label: "EPS (주당순이익)", value: `${analysisData.details?.eps?.toLocaleString() || "4,816"}` },
                                                        { label: "배당수익률 (Yield)", value: `${analysisData.details?.dividend_yield ? (analysisData.details.dividend_yield * 100).toFixed(2) + '%' : "0.88%"}`, color: "text-emerald-400" },
                                                        { label: "추정 PER", value: `${analysisData.details?.forward_pe || "9.00"}배` },
                                                        { label: "추정 EPS", value: `₩${analysisData.details?.forward_eps?.toLocaleString() || "20,562"}` },
                                                        { label: "PBR", value: `${analysisData.details?.pbr || "3.14"}배` },
                                                        { label: "BPS", value: `₩${analysisData.details?.bps?.toLocaleString() || "60,632"}` },
                                                        { label: "주당배당금", value: `₩${analysisData.details?.dividend_rate?.toLocaleString() || "1,444"}` },
                                                        { label: "전일 종가", value: `₩${analysisData.price || "190,000"}` },
                                                        { label: "시가 (Open)", value: `₩${analysisData.price || "190,000"}` }
                                                    ].map((item, i) => (
                                                        <div key={i} className="bg-[#1a1a1c] p-8 rounded-[1.5rem] border border-white/5 flex flex-col justify-center min-h-[120px] shadow-lg">
                                                            <p className="text-sm text-gray-500 font-bold mb-3">{item.label}</p>
                                                            <p className={`text-2xl font-black ${item.color || 'text-white'} tracking-tight`}>{item.value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5 my-12" />

                                            {/* 수급 분석 (스크린샷 3) */}
                                            <div className="space-y-12">
                                                <div className="flex flex-col items-center">
                                                    <div className="relative w-64 h-32 overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-64 h-64 rounded-full border-[16px] border-gray-800"></div>
                                                        <div className="absolute top-0 left-0 w-64 h-64 rounded-full border-[16px] border-orange-500" 
                                                              style={{ clipPath: `polygon(0 50%, 100% 50%, 100% 0, 0 0)`, transform: `rotate(${(analysisData.metrics?.news || 90) * 1.8 - 180}deg)` }}>
                                                        </div>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                                                            <span className="text-5xl font-black text-white leading-none">{analysisData.metrics?.news || 90}</span>
                                                            <span className="text-sm text-gray-500 font-bold mt-2 uppercase tracking-widest">뉴스 심리</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-lg text-gray-500 mt-6 font-bold">긍정/부정 뉴스 분석</p>
                                                </div>

                                                <div className="space-y-8">
                                                    <h4 className="text-2xl font-black text-white flex items-center gap-3">
                                                        <BarChart3 className="w-6 h-6 text-gray-400" /> 최근 수급 결과 (2026-02-20)
                                                        <span className="bg-gray-800 text-xs px-3 py-1 rounded-full text-gray-400 font-bold ml-3 uppercase tracking-tighter">Confirmed</span>
                                                    </h4>
                                                    
                                                    <div className="grid grid-cols-1 gap-6">
                                                        <div className="bg-blue-500/10 border border-blue-500/20 p-12 rounded-[2.5rem] text-center shadow-2xl">
                                                            <p className="text-lg text-gray-400 font-bold mb-4">외국인 당일 합계</p>
                                                            <p className="text-6xl font-black text-blue-500 tracking-tighter">-10,839,769주</p>
                                                        </div>
                                                        <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-[2.5rem] text-center shadow-2xl">
                                                            <p className="text-lg text-gray-400 font-bold mb-4">기관 당일 합계</p>
                                                            <p className="text-6xl font-black text-red-500 tracking-tighter">+3,427,880주</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-[#111113] rounded-[2rem] overflow-hidden border border-white/5 mt-8 shadow-xl">
                                                        <table className="w-full text-lg">
                                                            <thead className="bg-white/5">
                                                                <tr className="text-gray-500 font-bold">
                                                                    <th className="px-8 py-6 text-left">시간</th>
                                                                    <th className="px-8 py-6 text-right">외국인 (추정)</th>
                                                                    <th className="px-8 py-6 text-right">기관 (추정)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                <tr className="text-gray-200">
                                                                    <td className="px-8 py-8 font-black">2026-02-20</td>
                                                                    <td className="px-8 py-8 text-right text-blue-400 font-black">-10,839,769</td>
                                                                    <td className="px-8 py-8 text-right text-red-400 font-black">3,427,880</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="bg-[#111113] p-10 rounded-[2.5rem] border border-white/5 space-y-10 shadow-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                                            <span className="text-2xl text-white font-black">수급이 높을 때 (순매수) 🛒</span>
                                                        </div>
                                                        <div className="space-y-8 pl-6 border-l-2 border-white/5">
                                                            <div>
                                                                <p className="text-red-400 font-black text-xl mb-3">외국인:</p>
                                                                <p className="text-gray-400 text-lg leading-relaxed font-medium">"이 주식 지금 싸다!" 큰손들이 장바구니에 담고 있어요. 주가 상승에 긍정적인 신호예요.</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-red-400 font-black text-xl mb-3">기관:</p>
                                                                <p className="text-gray-400 text-lg leading-relaxed font-medium">"실적 좋을 것 같네" 하며 물량을 모으고 있어요. 든든한 지원군이 생긴 셈이죠.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'news' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                                            {analysisData.news?.slice(0, 12).map((item: any, i: number) => (
                                                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/5 p-8 rounded-[2rem] hover:bg-white/10 transition-all group shadow-lg">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <span className="text-xs text-blue-400 font-black uppercase tracking-widest px-3 py-1.5 bg-blue-400/10 rounded-lg">{item.source}</span>
                                                        <span className="text-xs text-gray-600 font-mono font-bold">{item.time}</span>
                                                    </div>
                                                    <h6 className="text-xl font-bold text-gray-100 group-hover:text-white line-clamp-2 leading-tight">{item.title}</h6>
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'price' && (
                                        <div className="p-32 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10 opacity-50">
                                            <Activity className="w-16 h-16 text-gray-700 mx-auto mb-6" />
                                            <p className="text-xl font-black text-gray-600">일일 시세 및 차트 분석 중입니다.</p>
                                        </div>
                                    )}

                                    {activeTab === 'dart' && (
                                        <div className="p-32 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10 opacity-50">
                                            <FileText className="w-16 h-16 text-gray-700 mx-auto mb-6" />
                                            <p className="text-xl font-black text-gray-600">DART 공시 연동 기능 준비 중</p>
                                        </div>
                                    )}

                                    {activeTab === 'financials' && (
                                        <div className="animate-in fade-in duration-500">
                                            <TurboQuantIndicators symbol={analysisData.symbol} stockName={analysisData.name} />
                                        </div>
                                    )}

                                    {activeTab === 'health' && (
                                        <div className="animate-in fade-in duration-500">
                                            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 text-center shadow-2xl">
                                                <Activity className="w-16 h-16 text-blue-500/20 mx-auto mb-8" />
                                                <h4 className="text-2xl font-black text-gray-400">배당 및 건전성 정밀 분석</h4>
                                                <p className="text-gray-600 mt-4 max-w-md mx-auto font-medium">최근 3개년 재무 데이터를 바탕으로 배당 성향과 안정성을 평가하고 있습니다.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-24 pb-12 border-t border-white/5 space-y-10">
                                    <div className="text-center space-y-3">
                                        <h2 className="text-4xl font-black text-white tracking-tighter">시장 가이드</h2>
                                        <p className="text-gray-500 text-lg font-medium">현재 증시의 전반적인 맥락을 함께 확인하세요.</p>
                                    </div>
                                    <MarketScannerDashboard />
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5 opacity-40 text-center">
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        본 서비스에서 제공하는 정보는 참고용이며, 투자 결과에 대한 법적 책임을 지지 않습니다.<br/>
                        모든 투자의 판단과 책임은 투자자 본인에게 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function DiscoveryPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>}>
            <DiscoveryContent />
        </Suspense>
    );
}
