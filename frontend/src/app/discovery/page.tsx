"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import MarketScannerDashboard from "@/components/MarketScannerDashboard";
import { Loader2, Search } from "lucide-react";
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
                                {/* 분석 요약 카드 */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-2xl">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">📊</div>
                                            <div>
                                                <h4 className="text-2xl font-black text-white">{analysisData.name} <span className="text-gray-400 text-sm font-normal ml-2">{analysisData.symbol}</span></h4>
                                                <p className="text-blue-300/80 text-sm font-bold">종합 투자 점수: {analysisData.score}점</p>
                                            </div>
                                        </div>
                                        <p className="text-gray-200 leading-relaxed text-lg mb-8 bg-black/30 p-6 rounded-2xl border border-white/5 italic">
                                            "{analysisData.summary}"
                                        </p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white/5 p-4 rounded-2xl text-center">
                                                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">수급 에너지</p>
                                                <p className="text-xl font-black text-white">{analysisData.metrics?.supplyDemand}%</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl text-center">
                                                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">재무 건전성</p>
                                                <p className="text-xl font-black text-white">{analysisData.metrics?.financials}%</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl text-center">
                                                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">이슈 민감도</p>
                                                <p className="text-xl font-black text-white">{analysisData.metrics?.news}%</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between">
                                        <h5 className="text-lg font-bold text-white mb-4">💡 AI 대처 전략</h5>
                                        <div className="space-y-4 flex-1">
                                            {analysisData.rationale?.pros?.slice(0, 3).map((p: string, i: number) => (
                                                <div key={i} className="flex gap-3 text-sm text-gray-300">
                                                    <span className="text-green-400 font-bold">✓</span>
                                                    <p>{p}</p>
                                                </div>
                                            ))}
                                            {analysisData.rationale?.cons?.slice(0, 2).map((c: string, i: number) => (
                                                <div key={i} className="flex gap-3 text-sm text-gray-400">
                                                    <span className="text-rose-400 font-bold">!</span>
                                                    <p>{c}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="mt-8 w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/5">
                                            상세 리포트 보기
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="opacity-40 scale-[0.98] origin-top transition-all hover:opacity-100 hover:scale-100 duration-500">
                                    <MarketScannerDashboard />
                                </div>
                            </div>
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
