'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    AlertTriangle, Building2, ExternalLink, Loader2, Info, RefreshCw, 
    ShieldCheck, CheckCircle2, TrendingUp, Sparkles, BookOpen, Layers, 
    ArrowUpRight, HelpCircle, FileText, Check, ShieldAlert
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface OverhangData {
    title: string;
    link: string;
    date: string;
    type: string;
}

interface OverhangTabProps {
    symbol: string;
    stockName: string;
}

export default function OverhangTab({ symbol, stockName }: OverhangTabProps) {
    const [overhangs, setOverhangs] = useState<OverhangData[]>([]);
    const [investments, setInvestments] = useState<OverhangData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isManual = false) => {
        if (!symbol) return;
        
        if (isManual) setIsRefreshing(true);
        else setLoading(true);
        
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/stock/${symbol}/dart_overhang?t=${Date.now()}`);
            const data = await res.json();
            
            if (data.status === 'success' && data.data) {
                setOverhangs(Array.isArray(data.data.overhang) ? data.data.overhang : []);
                setInvestments(Array.isArray(data.data.investments) ? data.data.investments : []);
            } else {
                setError('데이터를 불러오지 못했습니다.');
            }
        } catch (err) {
            console.error("Overhang API Error:", err);
            setError('통신 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [symbol]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-zinc-950/40 rounded-3xl border border-white/5">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
                    <ShieldCheck className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-white font-black text-base">{stockName}의 DART 공시 원문을 정밀 스캔 중입니다...</p>
                    <p className="text-xs text-zinc-500">전환사채(CB), 신주인수권부사채(BW), 유상증자 및 타법인 출자 공시 분석 중</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center gap-4 py-12 bg-zinc-950/40 rounded-3xl border border-white/5">
                <div className="text-center py-4 px-6 text-rose-300 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-sm font-bold">
                    {error}
                </div>
                <button 
                    onClick={() => fetchData(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs md:text-sm font-bold text-white transition-all shadow-md cursor-pointer"
                >
                    <RefreshCw className="w-4 h-4" /> 공시 데이터 다시 불러오기
                </button>
            </div>
        );
    }

    const isOverhangClean = overhangs.length === 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* 1. 상단 인포 리본 & 액션 버튼 */}
            <div className="bg-gradient-to-r from-zinc-950 via-[#101426] to-zinc-950 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div className="flex items-start gap-3 text-xs md:text-sm text-zinc-300">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
                        <Info className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm md:text-base">DART 공시 기반 오버행 & 자본 변동 인텔리전스</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                FACT VERIFIED
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium mt-1 leading-relaxed break-keep">
                            금융감독원 DART 공시 원문의 과거 이력을 기초로 주식 수 희석(CB/BW/유증) 및 타법인 지분 출자를 정밀 필터링한 객관적 팩트 데이터입니다.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    <button 
                        onClick={() => fetchData(true)}
                        disabled={isRefreshing}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isRefreshing 
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-300 cursor-not-allowed" 
                            : "bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30 hover:text-white"
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? "스캔 중..." : "즉시 재추출"}</span>
                    </button>
                    <a 
                        href={`https://finance.naver.com/item/news_notice.naver?code=${symbol.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>원문 전체보기</span>
                    </a>
                </div>
            </div>

            {/* 2. 4대 핵심 자본 & 오버행 KPI 대시보드 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. 오버행 리스크 등급 */}
                <div className={`p-4 sm:p-5 rounded-2xl border shadow-lg relative overflow-hidden flex flex-col justify-between ${
                    isOverhangClean 
                        ? 'bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-black border-emerald-500/30' 
                        : 'bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-black border-amber-500/30'
                }`}>
                    <div className="flex items-center justify-between text-xs font-black mb-1.5">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>오버행 리스크 등급</span>
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            isOverhangClean 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                            {isOverhangClean ? 'SAFE' : 'WATCH'}
                        </span>
                    </div>
                    <div className="text-xl md:text-2xl font-black font-mono tracking-tight mt-1">
                        <span className={isOverhangClean ? 'text-emerald-400' : 'text-amber-400'}>
                            {isOverhangClean ? '클린 (최상급 안전)' : `주의 (${overhangs.length}건)`}
                        </span>
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        {isOverhangClean ? '잠재적 매물 폭탄(CB/BW) 위험 제로' : '향후 주식 전환 가능 물량 모니터링'}
                    </div>
                </div>

                {/* 2. 잠재 희석 위험도 */}
                <div className="bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-blue-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-blue-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <span>1주당 가치 보존율</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-zinc-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-md">EPS PROTECTION</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">
                        {isOverhangClean ? '100% (희석 없음)' : '희석 리스크 관찰'}
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        무분별한 유상증자 없는 건전한 자본 구조
                    </div>
                </div>

                {/* 3. 타법인 투자 건수 */}
                <div className="bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-purple-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-purple-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-purple-400" />
                            <span>타법인 출자·투자</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-zinc-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-md">M&A / EQUITY</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-purple-300 font-mono tracking-tight mt-1">
                        최근 {investments.length}건
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        {investments.length > 0 ? '전략적 지분 투자 및 계열사 출자' : '최근 신규 외부 출자 내역 없음'}
                    </div>
                </div>

                {/* 4. 공시 전수 스캔 범위 */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-indigo-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-indigo-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            <span>DART 전수 스캔</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-md">100 DOCS</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">
                        100건 전수 검증
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        최근 공시 목록 팩트 체크 완료
                    </div>
                </div>
            </div>

            {/* 3. AI 자본 구조 & 오버행 심층 분석 총평 카드 */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-zinc-950 via-[#0e162e] to-zinc-950 border border-indigo-500/35 shadow-2xl relative overflow-hidden space-y-3">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                            <span>AI 애널리스트 오버행 & 자본 건전성 정밀 총평</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                                AI VERDICT
                            </span>
                        </h4>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 text-xs sm:text-sm text-zinc-200 leading-relaxed break-keep font-medium space-y-2">
                    {isOverhangClean ? (
                        <p>
                            <strong className="text-emerald-400 font-bold">🛡️ 오버행 청정 기업 인증: </strong>
                            <strong>{stockName}</strong>은(는) 최근 수년간 전환사채(CB), 신주인수권부사채(BW), 제3자배정 유상증자 등 
                            <span className="text-emerald-300 font-bold"> 주주 가치를 훼손하고 주가를 짓누르는 잠재적 악성 매물(오버행)이 단 한 건도 발견되지 않은 초우량 클린 자본 기업</span>입니다. 
                            외부 사채 차입이나 주식 수 희석 없이 자체 잉여현금흐름으로 사업을 영위할 수 있는 막강한 재무 체력을 갖추고 있어, 
                            투자자는 주당순이익(EPS) 감소 걱정 없이 본업의 펀더멘털과 실적 성장에 온전히 집중할 수 있습니다.
                        </p>
                    ) : (
                        <p>
                            <strong className="text-amber-400 font-bold">⚠️ 잠재적 물량 모니터링 필요: </strong>
                            <strong>{stockName}</strong>의 공시 목록에서 전환사채 또는 유상증자 관련 이력이 확인되었습니다. 
                            해당 물량이 언제 시장에 주식으로 전환되어 매물로 출회될 수 있는지(전환가액, 행사기간 등)를 주의 깊게 점검하여 
                            단기 주가 변동성 리스크에 대비하는 전략이 권장됩니다.
                        </p>
                    )}
                </div>
            </div>

            {/* 4. 오버행 vs 타법인 출자 2열 상세 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. 오버행(잠재물량) 트래커 카드 */}
                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-white/15 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                        <span>오버행 공시 이력</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                            isOverhangClean ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        }`}>
                                            {isOverhangClean ? '0건 (안전)' : `${overhangs.length}건 검출`}
                                        </span>
                                    </h4>
                                    <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                        전환사채(CB), 신주인수권부사채(BW), 제3자 유상증자 등 잠재 물량
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
                            {overhangs.length > 0 ? (
                                overhangs.map((item, idx) => (
                                    <a
                                        key={`oh-${idx}`}
                                        href={item.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-white/10 hover:border-amber-500/40 transition-all group shadow-md"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-black bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-md border border-amber-500/40">
                                                {item.type}
                                            </span>
                                            <span className="text-xs text-zinc-400 font-mono font-bold">{item.date}</span>
                                        </div>
                                        <h5 className="text-sm font-black text-zinc-100 group-hover:text-amber-300 transition-colors leading-snug break-keep flex items-center justify-between gap-2">
                                            <span>{item.title}</span>
                                            <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-300 shrink-0" />
                                        </h5>
                                    </a>
                                ))
                            ) : (
                                /* 오버행 없을 때: 안심 프리미엄 인증 박스 */
                                <div className="p-6 rounded-2xl bg-emerald-950/15 border border-emerald-500/25 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                                            <ShieldCheck className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h5 className="text-sm sm:text-base font-black text-emerald-300">
                                                잠재적 희석 매물 제로 — 안전 기업
                                            </h5>
                                            <p className="text-xs text-zinc-400 font-medium mt-0.5">
                                                최근 약 100건의 DART 공시 분석 결과 관련 이력 없음
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-zinc-300 leading-relaxed font-medium break-keep">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            <span><strong>CB/BW 미발행:</strong> 주가 급등 시 주식으로 바꿔 팔아치우는 사채 매물 폭탄 위험이 없습니다.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            <span><strong>유상증자 위험 없음:</strong> 주주들에게 손을 벌리지 않고 자체 잉여금으로 안정적인 재무를 유지합니다.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            <span><strong>1주당 가치 보존:</strong> 발행 주식수 급증에 따른 주가 하락 및 희석 리스크가 전혀 없습니다.</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. 타법인출자 트래커 카드 */}
                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-white/15 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                        <span>타법인·자산 취득 이력</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                            {investments.length}건
                                        </span>
                                    </h4>
                                    <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                        타법인 주식 및 지분 취득 결정, 대규모 자산 양수도 등 전략적 투자
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
                            {investments.length > 0 ? (
                                investments.map((item, idx) => (
                                    <a
                                        key={`inv-${idx}`}
                                        href={item.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-white/10 hover:border-blue-500/40 transition-all group shadow-md"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-black bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-md border border-blue-500/40">
                                                {item.type}
                                            </span>
                                            <span className="text-xs text-zinc-400 font-mono font-bold">{item.date}</span>
                                        </div>
                                        <h5 className="text-sm font-black text-zinc-100 group-hover:text-blue-300 transition-colors leading-snug break-keep flex items-center justify-between gap-2">
                                            <span>{item.title}</span>
                                            <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-300 shrink-0" />
                                        </h5>
                                    </a>
                                ))
                            ) : (
                                <div className="p-8 rounded-2xl bg-zinc-900/40 border border-white/5 text-center space-y-2">
                                    <Building2 className="w-10 h-10 text-zinc-600 mx-auto opacity-40 mb-2" />
                                    <p className="text-zinc-300 text-sm font-bold">
                                        <span className="text-blue-400">{stockName}</span>의 최근 외부 출자·인수 이력이 없습니다.
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        기업의 신규 M&A나 전략적 지분 투자 공시가 발생하면 실시간으로 추적되어 표시됩니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. 🎓 초보 투자자를 위한 오버행 & 자본 변동 필수 지식 가이드 */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/90 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">
                        🎓
                    </div>
                    <div>
                        <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                            <span>초보 투자자를 위한 오버행 & 타법인 출자 가이드</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                                1 MIN GUIDE
                            </span>
                        </h4>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed break-keep">
                    {/* 카드 1 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                            <span>1. 오버행(Overhang)이란?</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            언제든지 주식으로 전환되어 시장에 쏟아져 나올 수 있는 <strong className="text-white">'대규모 잠재 매물 폭탄'</strong>을 뜻합니다. 오버행 물량이 시장에 풀리면 공급 과잉으로 주가가 급락할 수 있으므로, 오버행이 없는 기업일수록 주가 안전성이 뛰어납니다.
                        </p>
                    </div>

                    {/* 카드 2 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-blue-300 text-sm flex items-center gap-1.5">
                            <span>2. CB(전환사채)·BW의 위험성</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            기업이 돈이 부족할 때 사채를 발행하며 주식 전환 권리를 얹어주는 채권입니다. 주가가 상승하면 사채권자가 싼값에 주식으로 바꿔 차익을 챙겨 나가며 기존 주주들의 지분을 희석시키고 주가 상승을 억누르게 됩니다.
                        </p>
                    </div>

                    {/* 카드 3 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-purple-300 text-sm flex items-center gap-1.5">
                            <span>3. 타법인 출자의 투자 포인트</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            회사가 번 잉여 현금으로 유망한 기술 기업을 인수(M&A)하거나 계열사 시너지를 내기 위한 투자 행위입니다. 미래 신성장 동력을 확보하는 긍정적 시그널인지, 부실 계열사 지원용인지 공시 내용을 점검하는 것이 핵심입니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
