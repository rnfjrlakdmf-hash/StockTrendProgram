"use client";

import React, { useState, useEffect } from 'react';
import { 
    Sparkles, 
    Calendar, 
    TrendingUp, 
    TrendingDown, 
    CheckCircle2, 
    Clock, 
    Activity, 
    RefreshCw, 
    ShieldCheck, 
    Info, 
    ChevronRight, 
    Flame, 
    Coins, 
    BarChart3, 
    ArrowUpRight,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';

interface ScannerItem {
    code: string;
    name: string;
    market: string;
    entryPrice: number;
    currentPrice: number;
    returnRate: number;
    highestReturnRate: number;
    resistancePrice: number;
    reachedResistance: boolean;
    highestPrice: number;
    volRatio: number;
    majorBuyer: string;
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
}

interface ScannerResponse {
    status: string;
    daysAgo: number;
    targetDate: string;
    displayDate: string;
    totalCount: number;
    reachedCount: number;
    successRate: number;
    avgReturn: number;
    filterRules: string[];
    disclaimer: string;
    data: ScannerItem[];
}

export default function ClosingQuantScanner() {
    const [daysAgo, setDaysAgo] = useState<number>(0);
    const [data, setData] = useState<ScannerResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const tabs = [
        { days: 0, label: "오늘 포착" },
        { days: 1, label: "1일 전" },
        { days: 2, label: "2일 전" },
        { days: 3, label: "3일 전" },
        { days: 4, label: "4일 전" },
        { days: 5, label: "5일 전" }
    ];

    const fetchScannerData = (selectedDays: number) => {
        setLoading(true);
        setIsRefreshing(true);
        fetch(`${API_BASE_URL}/api/scanner/closing?days_ago=${selectedDays}`)
            .then(res => res.json())
            .then(json => {
                if (json.status === 'success') {
                    setData(json);
                }
            })
            .catch(err => console.error("Closing scanner fetch error:", err))
            .finally(() => {
                setLoading(false);
                setIsRefreshing(false);
            });
    };

    useEffect(() => {
        fetchScannerData(daysAgo);
    }, [daysAgo]);

    return (
        <div className="w-full relative overflow-hidden bg-gradient-to-br from-[#0B0F19]/95 via-[#121829]/95 to-[#090C15]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.12)] transition-all">
            {/* 은은한 배경 앰비언트 글로우 */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16"></div>

            {/* 헤더 섹션 */}
            <div className="relative border-b border-white/10 pb-5 mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                퀀트 알고리즘 팩트 스캐너
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                {data?.targetDate ? `${data.targetDate.slice(0,4)}.${data.targetDate.slice(4,6)}.${data.targetDate.slice(6,8)} 기준` : "실시간 갱신"}
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            <span>장마감 수급 퀀트 스캐너</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                            정규장 장마감 시점 거래량 급증 및 메이저 수급 집중 종목을 객관적 알고리즘으로 추출하고, 기술적 벤치마크선 도달 여부를 통계적으로 추적합니다.
                        </p>
                    </div>

                    <button 
                        onClick={() => fetchScannerData(daysAgo)} 
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white border border-white/10 transition-all self-start sm:self-auto disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>새로고침</span>
                    </button>
                </div>

                {/* 퀀트 필터링 수식 3종 칩 배너 */}
                <div className="flex items-center gap-2 mt-4 flex-wrap text-[11px]">
                    <span className="text-slate-400 font-bold">수급 스캔 퀀트 수식:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-medium">
                        ① 5일 평균 대비 거래량 급증
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-medium">
                        ② 외국인·기관 메이저 순유입
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-medium">
                        ③ 기술적 벤치마크선(+10%) 도달 추적
                    </span>
                </div>
            </div>

            {/* 일자별 탭 내비게이션 (오늘 ~ 5일 전) */}
            <div className="flex gap-1.5 bg-white/5 p-1 rounded-2xl overflow-x-auto scrollbar-hide mb-5">
                {tabs.map(tab => (
                    <button
                        key={tab.days}
                        onClick={() => setDaysAgo(tab.days)}
                        className={`flex-1 min-w-[70px] py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all whitespace-nowrap ${
                            daysAgo === tab.days 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25" 
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <span>{tab.label}</span>
                        {daysAgo === tab.days && data?.displayDate && (
                            <span className="text-[10px] text-blue-200 font-mono font-normal">({data.displayDate})</span>
                        )}
                    </button>
                ))}
            </div>

            {/* 벤토 서머리 스탯 카드 4분할 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 block mb-1">스캔 종목 수</span>
                    <div className="text-lg sm:text-xl font-black text-white font-mono">
                        {data?.totalCount || 0}개
                    </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 block mb-1">벤치마크 도달 종목</span>
                    <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono flex items-center gap-1">
                        <span>{data?.reachedCount || 0}개</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                    </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 block mb-1">기준선 도달률</span>
                    <div className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                        {data?.successRate || 0}%
                    </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-xs text-slate-400 block mb-1">평균 변동률</span>
                    <div className={`text-lg sm:text-xl font-black font-mono ${(data?.avgReturn || 0) >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                        {(data?.avgReturn || 0) > 0 ? `+${data?.avgReturn}%` : `${data?.avgReturn}%`}
                    </div>
                </div>
            </div>

            {/* 데이터 테이블 컨테이너 */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
                {loading ? (
                    <div className="py-16 text-center text-slate-400 space-y-3">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                        <p className="text-xs">수급 퀀트 알고리즘 데이터를 분석하고 있습니다...</p>
                    </div>
                ) : !data || data.data.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs">
                        해당 일자에는 퀀트 필터 기준을 충족한 포착 종목이 없습니다.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                                <th className="p-3.5 sm:p-4">종목코드 / 종목명</th>
                                <th className="p-3.5 sm:p-4 text-center hidden md:table-cell">CVD / OBV 수급 델타</th>
                                <th className="p-3.5 sm:p-4 text-right">스캔 시점 시세</th>
                                <th className="p-3.5 sm:p-4 text-right">현재 시세</th>
                                <th className="p-3.5 sm:p-4 text-right">기준 대비 변동률</th>
                                <th className="p-3.5 sm:p-4 text-right">기술적 벤치마크 (+10%)</th>
                                <th className="p-3.5 sm:p-4 text-center">시세 도달 확인</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                            {data.data.map((item, idx) => {
                                const isUp = item.returnRate > 0;
                                return (
                                    <tr key={idx} className="hover:bg-white/[0.04] transition-colors group">
                                        {/* 종목명 및 코드 */}
                                        <td className="p-3.5 sm:p-4">
                                            <Link href={`/stock/${item.code}`} className="flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                                <div className="flex flex-col font-sans">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white group-hover:text-blue-400 text-xs sm:text-sm">{item.name}</span>
                                                        <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded font-mono">{item.market}</span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 font-mono">{item.code}</span>
                                                    
                                                    {/* 모바일 전용 CVD/OBV 뱃지 */}
                                                    <div className="flex md:hidden flex-wrap items-center gap-1 mt-1 font-mono">
                                                        {item.cvd && (
                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                item.cvd.isBullish 
                                                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                                                    : 'bg-slate-800 text-slate-400 border border-white/10'
                                                            }`}>
                                                                <span>💎</span>
                                                                <span>{item.cvd.label}</span>
                                                            </span>
                                                        )}
                                                        {item.obv && (
                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                item.obv.isBullish 
                                                                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' 
                                                                    : 'bg-slate-800 text-slate-400 border border-white/10'
                                                            }`}>
                                                                <span>📈</span>
                                                                <span>{item.obv.label}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 ml-auto transition-colors" />
                                            </Link>
                                        </td>

                                        {/* PC 전용 CVD / OBV 퀀트 뱃지 열 */}
                                        <td className="p-3.5 sm:p-4 text-center hidden md:table-cell font-sans">
                                            <div className="flex flex-col items-center gap-1">
                                                {item.cvd && (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                        item.cvd.isBullish 
                                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10' 
                                                            : 'bg-slate-800 text-slate-400 border border-white/10'
                                                    }`}>
                                                        <span>💎</span>
                                                        <span>{item.cvd.label}</span>
                                                    </span>
                                                )}
                                                {item.obv && (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                        item.obv.isBullish 
                                                            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' 
                                                            : 'bg-slate-800 text-slate-400 border border-white/10'
                                                    }`}>
                                                        <span>📈</span>
                                                        <span>{item.obv.label}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 스캔 시점 시세 */}
                                        <td className="p-3.5 sm:p-4 text-right text-slate-300">
                                            {item.entryPrice.toLocaleString()}원
                                        </td>

                                        {/* 현재 시세 */}
                                        <td className="p-3.5 sm:p-4 text-right font-bold text-white">
                                            {item.currentPrice.toLocaleString()}원
                                        </td>

                                        {/* 변동률 */}
                                        <td className="p-3.5 sm:p-4 text-right font-bold">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md ${
                                                isUp ? 'text-rose-400 bg-rose-500/10' : item.returnRate < 0 ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400'
                                            }`}>
                                                {isUp ? `+${item.returnRate}%` : `${item.returnRate}%`}
                                            </span>
                                        </td>

                                        {/* 기술적 벤치마크 (+10%) */}
                                        <td className="p-3.5 sm:p-4 text-right text-slate-300">
                                            <span>{item.resistancePrice.toLocaleString()}원</span>
                                            <span className="text-[10px] text-slate-500 block font-sans">(+10.0%)</span>
                                        </td>

                                        {/* 시세 도달 확인 여부 */}
                                        <td className="p-3.5 sm:p-4 text-center">
                                            {item.reachedResistance ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>도달 확인</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-slate-400 bg-white/5 border border-white/5">
                                                    <Clock className="w-3 h-3 text-slate-500" />
                                                    <span>관측 중</span>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 법적 면책 조항 (유사투자자문업 방지 100% 안전 고지 배너) */}
            <div className="mt-5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <strong className="text-slate-400 block mb-0.5">자본시장법 준수 퀀트 시뮬레이션 안내:</strong>
                    본 화면은 사전에 정의된 기술적 알고리즘(거래량 급증 및 수급 유입)에 의해 기계적으로 추출된 객관적 통계 결과이며, 개별 종목에 대한 매수/매도 권유나 투자 자문이 아닙니다. 기술적 벤치마크선은 퀀트 백테스팅 및 통계 관측을 위한 참고 수준일 뿐 특정 수익률이나 목표가를 보장하는 것이 아니며, 모든 투자의 최종 판단과 손익의 책임은 투자자 본인에게 있습니다.
                </div>
            </div>
        </div>
    );
}
