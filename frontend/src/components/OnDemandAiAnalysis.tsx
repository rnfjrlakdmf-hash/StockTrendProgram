"use client";

import { useState, useEffect } from "react";
import KakaoAdFit from "./KakaoAdFit";

interface AiResult {
    score: number;
    summary: string;
    metrics: {
        financials?: number;
        supplyDemand?: number;
        news?: number;
    };
    rationale?: Record<string, any>;
}

const LOADING_MESSAGES = [
    "AI가 최신 뉴스 기사를 수집하고 있습니다...",
    "재무제표 및 실적 데이터를 분석 중입니다...",
    "외국인·기관 수급 동향을 파악하고 있습니다...",
    "공시 및 사업보고서를 검토하고 있습니다...",
    "AI가 종합 투자 의견을 작성하고 있습니다...",
];

export default function OnDemandAiAnalysis({ ticker, stockName }: { ticker: string, stockName: string }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AiResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [elapsedSec, setElapsedSec] = useState(0);

    // 로딩 중 메시지 순환 + 경과 시간 표시
    useEffect(() => {
        if (!loading) return;
        setLoadingMsgIdx(0);
        setElapsedSec(0);

        const msgInterval = setInterval(() => {
            setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 4000);

        const secInterval = setInterval(() => {
            setElapsedSec(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(msgInterval);
            clearInterval(secInterval);
        };
    }, [loading]);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90초 timeout

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://13.209.99.170:8000';
            const res = await fetch(`${apiUrl}/api/analysis/stock/${ticker}`, {
                signal: controller.signal,
            });

            if (!res.ok) {
                throw new Error(`서버 오류 (${res.status})`);
            }

            const data = await res.json();

            if (data.status === 'success' && data.data) {
                setResult(data.data);
            } else {
                setError(data.message || "AI 분석 결과를 불러오는데 실패했습니다.");
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                setError("AI 분석 시간이 초과되었습니다. 서버가 바쁜 상태이니 잠시 후 다시 시도해주세요.");
            } else {
                setError(`분석 중 오류가 발생했습니다: ${e.message || '알 수 없는 오류'}`);
            }
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-8 mb-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <span className="text-9xl">🤖</span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>✨</span> Gemini AI 심층 분석 요약
            </h2>

            {!result && !loading && (
                <div>
                    <p className="text-indigo-200 mb-6">
                        {stockName}에 대한 수백 개의 기사, 공시, 수급 데이터, 재무제표를 AI가 실시간으로 읽고 종합하여 완벽한 투자 리포트를 작성해 드립니다.
                    </p>
                    <button
                        onClick={handleAnalyze}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2"
                    >
                        <span>🚀</span> 지금 무료로 AI 분석 시작하기
                    </button>
                    <p className="text-xs text-indigo-400/60 mt-3">* 서버 상황에 따라 20~60초 정도 소요될 수 있습니다.</p>
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mb-4"></div>
                    <p className="text-indigo-300 font-bold mb-1 text-center text-base transition-all duration-500">
                        {LOADING_MESSAGES[loadingMsgIdx]}
                    </p>
                    <p className="text-indigo-400/60 text-sm mb-6">
                        경과 시간: {elapsedSec}초 / 최대 90초
                    </p>

                    {/* 광고 집중도 극대화 구역 */}
                    <div className="bg-black/40 p-2 rounded-xl border border-indigo-500/20 w-full max-w-[320px] mx-auto min-h-[250px] flex items-center justify-center">
                        <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
                    </div>
                </div>
            )}

            {error && !loading && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-200">
                    <p>⚠️ {error}</p>
                    <button onClick={handleAnalyze} className="mt-3 bg-red-800/40 hover:bg-red-700/50 text-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                        🔄 다시 시도하기
                    </button>
                </div>
            )}

            {result && !loading && (
                <div className="animate-fade-in-up">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-indigo-950/50 p-4 rounded-xl border border-indigo-500/20 text-center">
                            <div className="text-sm text-indigo-300">AI 종합 점수</div>
                            <div className="text-3xl font-black text-white">{result.score}<span className="text-lg text-indigo-400 font-normal">/100</span></div>
                        </div>
                        {result.metrics && (
                            <div className="flex gap-3">
                                {result.metrics.financials !== undefined && (
                                    <div className="bg-indigo-950/50 p-3 rounded-xl border border-indigo-500/20 text-center">
                                        <div className="text-xs text-indigo-300">재무</div>
                                        <div className="text-xl font-bold text-blue-300">{result.metrics.financials}</div>
                                    </div>
                                )}
                                {result.metrics.supplyDemand !== undefined && (
                                    <div className="bg-indigo-950/50 p-3 rounded-xl border border-indigo-500/20 text-center">
                                        <div className="text-xs text-indigo-300">수급</div>
                                        <div className="text-xl font-bold text-purple-300">{result.metrics.supplyDemand}</div>
                                    </div>
                                )}
                                {result.metrics.news !== undefined && (
                                    <div className="bg-indigo-950/50 p-3 rounded-xl border border-indigo-500/20 text-center">
                                        <div className="text-xs text-indigo-300">뉴스</div>
                                        <div className="text-xl font-bold text-emerald-300">{result.metrics.news}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <div className="bg-black/20 p-6 rounded-xl text-lg leading-relaxed text-indigo-100 border-l-4 border-indigo-500">
                            {result.summary}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
