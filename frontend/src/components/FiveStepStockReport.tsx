"use client";

import React, { useState, useEffect } from 'react';
import { 
    Sparkles, 
    ShieldCheck, 
    TrendingUp, 
    TrendingDown, 
    BarChart3, 
    AlertTriangle, 
    Layers, 
    Building2, 
    Coins, 
    Zap, 
    ChevronRight, 
    ExternalLink, 
    Activity, 
    Scale, 
    Info, 
    ArrowUpRight, 
    ArrowDownRight,
    RefreshCw
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface StepReportData {
    status: string;
    ticker: string;
    stockName: string;
    currentPrice: number;
    prevClose: number;
    step1: {
        market: string;
        per: number;
        pbr: number;
        foreignRate: string;
        score: number;
        grade: string;
        insight: string;
    };
    step2: {
        news: Array<{
            title: string;
            office: string;
            date: string;
            url: string;
        }>;
        status: string;
        insight: string;
    };
    step3: {
        peers: Array<{
            ticker: string;
            name: string;
            price: string;
            change: string;
        }>;
        cycle: string;
        insight: string;
    };
    step4: {
        foreignSum20d: number;
        instSum20d: number;
        retailSum20d: number;
        foreignRate: string;
        verdict: string;
        insight: string;
        cvd?: {
            strength: number;
            label: string;
            isBullish: boolean;
        };
        obv?: {
            trend: string;
            label: string;
            isBullish: boolean;
        };
    };
    step5: {
        high52: number;
        low52: number;
        high52Drop: number;
        low52Rise: number;
        vol5d: number;
        vol20d: number;
        volRatio: number;
        maAlignment: string;
        status: string;
        insight: string;
    };
    risk: {
        shortTermRisk: string;
        midTermRisk: string;
        counterArgument: string;
    };
}

interface Props {
    ticker: string;
    stockName: string;
    initialPrice?: number;
}

export default function FiveStepStockReport({ ticker, stockName, initialPrice }: Props) {
    const [data, setData] = useState<StepReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        fetch(`${API_BASE_URL}/api/stock/step-report/${ticker}`)
            .then(res => res.json())
            .then(json => {
                if (!isMounted) return;
                if (json.status === 'success') {
                    setData(json);
                } else {
                    setError(true);
                }
            })
            .catch(err => {
                console.error("Step report fetch error:", err);
                if (isMounted) setError(true);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [ticker]);

    if (loading) {
        return (
            <div className="w-full bg-gradient-to-br from-[#0c101d] via-[#11172a] to-[#0a0d17] border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl animate-pulse">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-7 bg-white/10 rounded-xl w-64"></div>
                    <div className="h-6 bg-white/10 rounded-full w-24"></div>
                </div>
                <div className="space-y-4">
                    <div className="h-28 bg-white/5 rounded-2xl"></div>
                    <div className="h-28 bg-white/5 rounded-2xl"></div>
                    <div className="h-28 bg-white/5 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return null; // 데이터 로드 실패 시 조용히 숨김 (기존 UI 유지)
    }

    const price = data.currentPrice || initialPrice || 0;
    const isPriceUp = data.currentPrice > data.prevClose;

    return (
        <section className="w-full relative overflow-hidden bg-gradient-to-br from-[#0B0F19]/95 via-[#121829]/95 to-[#090C15]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 sm:p-8 mb-8 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.15)] transition-all">
            {/* 은은한 앰비언트 글로우 */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

            {/* 헤더 섹션 */}
            <div className="relative border-b border-white/10 pb-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                5단계 AI 퀀트 정밀 진단 리포트
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">
                                {data.ticker} · {data.step1.market}
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span>{data.stockName}</span>
                            <span className="text-lg sm:text-xl font-bold font-mono text-slate-300">
                                {price.toLocaleString()}원
                            </span>
                        </h2>
                    </div>

                    {/* 종합 진단 스코어 뱃지 */}
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 sm:px-4 sm:py-2.5 self-start sm:self-auto backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">재무 종합 평점</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                                    {data.step1.score}
                                </span>
                                <span className="text-xs text-slate-400 font-bold">/ 10점</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40">
                            {data.step1.grade} 등급
                        </div>
                    </div>
                </div>
            </div>

            {/* 5단계 진단 본문 카드 그리드 */}
            <div className="relative space-y-6">

                {/* 1단계. 종목 기본 정보 (재무 펀더멘털) */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-xs font-black">
                                1
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                                <span>1단계. 종목 기본 정보 & 재무 가치</span>
                            </h3>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">펀더멘털</span>
                    </div>

                    {/* 4분할 스탯 칩 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-slate-400 block mb-1">상장 시장</span>
                            <span className="text-sm sm:text-base font-bold text-white">{data.step1.market}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-slate-400 block mb-1">PER (주가수익비율)</span>
                            <span className="text-sm sm:text-base font-bold text-blue-400">{data.step1.per > 0 ? `${data.step1.per}배` : 'N/A'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-slate-400 block mb-1">PBR (주가순자산비율)</span>
                            <span className="text-sm sm:text-base font-bold text-purple-400">{data.step1.pbr > 0 ? `${data.step1.pbr}배` : 'N/A'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-slate-400 block mb-1">외국인 지분율</span>
                            <span className="text-sm sm:text-base font-bold text-emerald-400">{data.step1.foreignRate}</span>
                        </div>
                    </div>

                    {/* 한 줄 해석 박스 */}
                    <div className="p-3.5 rounded-xl bg-[#141b2d] border border-blue-500/20 flex items-start gap-2.5">
                        <span className="text-base">💡</span>
                        <div className="flex-1">
                            <span className="text-xs font-bold text-amber-300 block mb-0.5">한 줄 해석</span>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                                {data.step1.insight}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2단계. 최근 공시 및 시장 재료 */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-xs font-black">
                                2
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                                <span>2단계. 최근 공시 및 시장 재료</span>
                            </h3>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {data.step2.status}
                        </span>
                    </div>

                    {/* 뉴스 및 공시 리스트 */}
                    <div className="space-y-2 mb-4">
                        {data.step2.news && data.step2.news.length > 0 ? (
                            data.step2.news.map((item, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-xs text-indigo-400 font-bold flex-shrink-0">뉴스</span>
                                        <span className="text-xs sm:text-sm text-slate-200 truncate font-medium">{item.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-[11px] text-slate-400">{item.office}</span>
                                        {item.url && (
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-3 text-xs text-slate-400 bg-white/5 rounded-xl">최근 30일 이내 발생한 특이 공시가 없으며 통상적인 경영활동을 이어가고 있습니다.</div>
                        )}
                    </div>

                    {/* 한 줄 해석 박스 */}
                    <div className="p-3.5 rounded-xl bg-[#141b2d] border border-indigo-500/20 flex items-start gap-2.5">
                        <span className="text-base">💡</span>
                        <div className="flex-1">
                            <span className="text-xs font-bold text-amber-300 block mb-0.5">한 줄 해석</span>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                                {data.step2.insight}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3단계. 엮인 테마 및 동종업계 피어 */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center text-xs font-black">
                                3
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                                <span>3단계. 엮인 테마 및 동종업계 (피어 비교)</span>
                            </h3>
                        </div>
                        <span className="text-xs font-semibold text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                            {data.step3.cycle}
                        </span>
                    </div>

                    {/* 동종업계 피어 칩 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                        {data.step3.peers && data.step3.peers.length > 0 ? (
                            data.step3.peers.map((peer, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                                    <span className="text-xs text-slate-300 font-bold truncate mb-1">{peer.name}</span>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-mono">{peer.price}원</span>
                                        <span className={`font-bold ${peer.change.startsWith('+') ? 'text-rose-400' : 'text-sky-400'}`}>
                                            {peer.change}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-4 p-3 text-xs text-slate-400 bg-white/5 rounded-xl">동종업계 피어 데이터 준비 중입니다.</div>
                        )}
                    </div>

                    {/* 한 줄 해석 박스 */}
                    <div className="p-3.5 rounded-xl bg-[#141b2d] border border-teal-500/20 flex items-start gap-2.5">
                        <span className="text-base">💡</span>
                        <div className="flex-1">
                            <span className="text-xs font-bold text-amber-300 block mb-0.5">한 줄 해석</span>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                                {data.step3.insight}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 4단계. 외국인·기관 20일 수급 동향 */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center text-xs font-black">
                                4
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                                <span>4단계. 외국인·기관 수급 (최근 20거래일)</span>
                            </h3>
                        </div>
                        <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                            {data.step4.verdict}
                        </span>
                    </div>

                    {/* 3대 주체 20일 누적 순매수 */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-slate-400 block mb-1">외국인 20일 순매수</span>
                            <span className={`text-sm sm:text-base font-black font-mono ${data.step4.foreignSum20d >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                                {data.step4.foreignSum20d > 0 ? `+${data.step4.foreignSum20d.toLocaleString()}` : data.step4.foreignSum20d.toLocaleString()}주
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-slate-400 block mb-1">기관 20일 순매수</span>
                            <span className={`text-sm sm:text-base font-black font-mono ${data.step4.instSum20d >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                                {data.step4.instSum20d > 0 ? `+${data.step4.instSum20d.toLocaleString()}` : data.step4.instSum20d.toLocaleString()}주
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-slate-400 block mb-1">개인 20일 순매수</span>
                            <span className={`text-sm sm:text-base font-black font-mono ${data.step4.retailSum20d >= 0 ? 'text-slate-200' : 'text-slate-400'}`}>
                                {data.step4.retailSum20d > 0 ? `+${data.step4.retailSum20d.toLocaleString()}` : data.step4.retailSum20d.toLocaleString()}주
                            </span>
                        </div>
                    </div>

                    {/* CVD / OBV 퀀트 수급 지표 칩 2종 */}
                    {(data.step4.cvd || data.step4.obv) && (
                        <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/15">
                            <span className="text-[11px] font-bold text-slate-400">퀀트 수급 델타:</span>
                            {data.step4.cvd && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                    data.step4.cvd.isBullish 
                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10' 
                                        : 'bg-slate-800 text-slate-400 border border-white/10'
                                }`}>
                                    <span>💎</span>
                                    <span>{data.step4.cvd.label}</span>
                                </span>
                            )}
                            {data.step4.obv && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                    data.step4.obv.isBullish 
                                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10' 
                                        : 'bg-slate-800 text-slate-400 border border-white/10'
                                }`}>
                                    <span>📈</span>
                                    <span>{data.step4.obv.label}</span>
                                </span>
                            )}
                        </div>
                    )}

                    {/* 한 줄 해석 박스 */}
                    <div className="p-3.5 rounded-xl bg-[#141b2d] border border-purple-500/20 flex items-start gap-2.5">
                        <span className="text-base">💡</span>
                        <div className="flex-1">
                            <span className="text-xs font-bold text-amber-300 block mb-0.5">한 줄 해석</span>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                                {data.step4.insight}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 5단계. 차트상 현재 위치 & 거래량 분석 */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 backdrop-blur-sm hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center text-xs font-black">
                                5
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                                <span>5단계. 차트상 현재 위치 & 기술적 지표</span>
                            </h3>
                        </div>
                        <span className="text-xs font-bold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                            {data.step5.status}
                        </span>
                    </div>

                    {/* 기술적 스탯 3분할 칩 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>52주 최고가 대비</span>
                                <span>{data.step5.high52.toLocaleString()}원</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-black font-mono text-sky-400">
                                    {data.step5.high52Drop}%
                                </span>
                                <span className="text-xs text-slate-400">낙폭 과대 구간</span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>5일 vs 20일 거래량</span>
                                <span>{data.step5.vol5d.toLocaleString()}주</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-black font-mono text-amber-400">
                                    {data.step5.volRatio > 0 ? `+${data.step5.volRatio}%` : `${data.step5.volRatio}%`}
                                </span>
                                <span className="text-xs text-slate-400">거래량 급증</span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xs text-slate-400 block mb-1">이동평균선 배열</span>
                            <div className="text-sm sm:text-base font-bold text-slate-200">
                                {data.step5.maAlignment}
                            </div>
                        </div>
                    </div>

                    {/* 한 줄 해석 박스 */}
                    <div className="p-3.5 rounded-xl bg-[#141b2d] border border-rose-500/20 flex items-start gap-2.5">
                        <span className="text-base">💡</span>
                        <div className="flex-1">
                            <span className="text-xs font-bold text-amber-300 block mb-0.5">한 줄 해석</span>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                                {data.step5.insight}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 보너스: 리스크 & 시장 반론 점검 (Bull vs Bear) */}
                <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent border border-amber-500/20 p-5">
                    <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>종합 리스크 및 시장 반론 점검 (Bull vs Bear)</span>
                    </h4>
                    <div className="space-y-2.5 text-xs sm:text-sm">
                        <div className="flex items-start gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[11px] flex-shrink-0 mt-0.5">단기 리스크</span>
                            <span className="text-slate-300">{data.risk.shortTermRisk}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px] flex-shrink-0 mt-0.5">중기 리스크</span>
                            <span className="text-slate-300">{data.risk.midTermRisk}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[11px] flex-shrink-0 mt-0.5">시장 반론</span>
                            <span className="text-slate-300">{data.risk.counterArgument}</span>
                        </div>
                    </div>
                </div>

                {/* 공식 법적 면책 조항 배너 */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-500 leading-relaxed">
                    ※ 본 5단계 진단 리포트는 한국거래소 및 DART 공시 통계 데이터를 알고리즘으로 단순 요약한 객관적 정보제공 콘텐츠이며, 특정 종목의 매수/매도를 권유하지 않습니다. 모든 투자 판단과 결과의 책임은 투자자 본인에게 있습니다.
                </div>

            </div>
        </section>
    );
}
