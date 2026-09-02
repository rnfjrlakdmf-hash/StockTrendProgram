'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
    ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine, Line, Area
} from 'recharts';
import { 
    RefreshCw, Users, AlertCircle, TrendingUp, TrendingDown, Briefcase, Globe, 
    Calendar, Loader2, Building2, Sparkles, ShieldCheck, BarChart3, Activity, 
    Layers, ArrowUpRight, ArrowDownRight, CheckCircle2
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface InvestorData {
    date: string;
    close?: number;
    price?: number;
    diff?: number;
    change?: number;
    volume?: number;
    institution: number;
    foreigner: number;
    retail: number;
    foreign_holdings?: number;
    foreign_ratio?: number;
}

interface InvestorTrendTabProps {
    symbol: string;
    stockName: string;
}

// 1. 수치 포맷팅 헬퍼
function formatShares(num: number | string | undefined | null, showSign = false): string {
    if (num === undefined || num === null || num === "N/A" || num === "NaN") return "0주";
    const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
    if (isNaN(n)) return "0주";
    const sign = showSign && n > 0 ? '+' : '';
    return `${sign}${Math.round(n).toLocaleString()}주`;
}

function formatCompactShares(num: number | undefined | null, showSign = false): string {
    if (num === undefined || num === null || isNaN(num) || num === 0) return "0주";
    const sign = showSign && num > 0 ? '+' : '';
    const abs = Math.abs(num);
    if (abs >= 100000000) {
        return `${sign}${(num / 100000000).toFixed(2)}억 주`;
    } else if (abs >= 10000) {
        return `${sign}${(num / 10000).toFixed(1)}만 주`;
    }
    return `${sign}${Math.round(num).toLocaleString()}주`;
}

function formatMoneyKRW(shares: number | undefined | null, price: number | undefined | null): string {
    if (!shares || !price || isNaN(shares) || isNaN(price) || shares === 0) return "0원";
    const amt = shares * price;
    const sign = amt > 0 ? '+' : '';
    const abs = Math.abs(amt);
    if (abs >= 1000000000000) {
        return `${sign}${(amt / 1000000000000).toFixed(2)}조 원`;
    } else if (abs >= 100000000) {
        return `${sign}${(amt / 100000000).toFixed(1)}억 원`;
    } else if (abs >= 10000) {
        return `${sign}${(amt / 10000).toFixed(0)}만 원`;
    }
    return `${sign}${Math.round(amt).toLocaleString()}원`;
}

// 2. 외국계 증권사 판별
function isForeignBroker(name: string): boolean {
    if (!name) return false;
    const foreignList = [
        'JP모간', '제이피모간', 'J.P', 'JPMORGAN', '모건스탠리', '골드만삭스', '골드만', 
        'CS', '크레디트스위스', 'UBS', '메릴린치', 'BOA', '맥쿼리', '노무라', '다이와', 
        '씨티', 'CITI', '바클레이즈', 'HSBC', 'BNP', '소시에테', 'SG'
    ];
    return foreignList.some(f => name.toUpperCase().includes(f.toUpperCase()));
}

export default function InvestorTrendTab({ symbol, stockName }: InvestorTrendTabProps) {
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);
    const [tabView, setTabView] = useState<'daily_bar' | 'cumulative_line' | 'table'>('daily_bar');
    const [period, setPeriod] = useState<number>(20);

    const fetchData = async (showLoading = true) => {
        if (!symbol) return;
        if (showLoading) setIsLoading(true);
        setError(false);
        try {
            const sym = encodeURIComponent(symbol);
            const res = await fetch(`${API_BASE_URL}/api/analysis/stock/${sym}/investor?period=${period}&t=${Date.now()}`);
            const json = await res.json();
            if (json.status === "success") {
                setApiResponse(json.data);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error("Investor trend fetch error:", err);
            setError(true);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData(true);
        const interval = setInterval(() => {
            fetchData(false);
        }, 30000);
        return () => clearInterval(interval);
    }, [symbol, period]);

    // 일별 트렌드 데이터 정렬 (과거 -> 최신)
    const trendData: InvestorData[] = useMemo(() => {
        if (!apiResponse || !apiResponse.trend) return [];
        const list = apiResponse.trend || [];
        return [...list].reverse();
    }, [apiResponse]);

    // 누적 수급 계산 데이터
    const cumulativeData = useMemo(() => {
        if (!trendData || trendData.length === 0) return [];
        let cumFrgn = 0;
        let cumInst = 0;
        let cumRetail = 0;

        return trendData.map(d => {
            cumFrgn += (d.foreigner || 0);
            cumInst += (d.institution || 0);
            cumRetail += (d.retail || 0);
            return {
                ...d,
                cumForeigner: cumFrgn,
                cumInstitution: cumInst,
                cumRetail: cumRetail,
                cumSmartMoney: cumFrgn + cumInst
            };
        });
    }, [trendData]);

    // 최근 데이터 (0이 아닌 최신 거래일)
    const latestData = useMemo(() => {
        if (!trendData || trendData.length === 0) return null;
        for (let i = trendData.length - 1; i >= 0; i--) {
            const d = trendData[i];
            if ((d.institution !== 0) || (d.foreigner !== 0) || (d.retail !== 0)) {
                return d;
            }
        }
        return trendData[trendData.length - 1];
    }, [trendData]);

    // 누적 총합 집계
    const periodSummary = useMemo(() => {
        if (!trendData || trendData.length === 0) {
            return { totalFrgn: 0, totalInst: 0, totalRetail: 0, smartMoney: 0, avgPrice: 0 };
        }
        let totalFrgn = 0;
        let totalInst = 0;
        let totalRetail = 0;
        let priceSum = 0;
        let count = 0;

        trendData.forEach(d => {
            totalFrgn += (d.foreigner || 0);
            totalInst += (d.institution || 0);
            totalRetail += (d.retail || 0);
            const p = d.close || d.price || 0;
            if (p > 0) {
                priceSum += p;
                count++;
            }
        });

        const avgPrice = count > 0 ? priceSum / count : (latestData?.close || latestData?.price || 0);
        return {
            totalFrgn,
            totalInst,
            totalRetail,
            smartMoney: totalFrgn + totalInst,
            avgPrice
        };
    }, [trendData, latestData]);

    // 거래원 필터링 및 상위 5개사 정돈
    const cleanBrokerage = useMemo(() => {
        const raw = apiResponse?.brokerage || { sell: [], buy: [] };
        const filterBrokers = (list: any[]) => {
            return (list || [])
                .filter(b => b.name && !b.name.includes('외국인') && !b.name.includes('(') && b.volume > 0)
                .slice(0, 5);
        };
        const sell = filterBrokers(raw.sell);
        const buy = filterBrokers(raw.buy);
        const maxSellVol = sell.length > 0 ? Math.max(...sell.map((s: any) => s.volume)) : 1;
        const maxBuyVol = buy.length > 0 ? Math.max(...buy.map((b: any) => b.volume)) : 1;
        const totalSellVol = sell.reduce((acc: number, s: any) => acc + (s.volume || 0), 0);
        const totalBuyVol = buy.reduce((acc: number, b: any) => acc + (b.volume || 0), 0);

        return { sell, buy, maxSellVol, maxBuyVol, totalSellVol, totalBuyVol };
    }, [apiResponse]);

    if (isLoading && !apiResponse) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-zinc-950/50 rounded-3xl border border-white/5">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                <p className="text-sm font-bold text-white">투자자별 메이저 수급 및 실시간 거래원 데이터 분석 중...</p>
                <p className="text-xs text-zinc-500 mt-1">외국인·기관 매매동향 및 상위 증권사 창구를 집계하고 있습니다.</p>
            </div>
        );
    }

    const PeriodButton = ({ val, label }: { val: number, label: string }) => (
        <button
            onClick={() => setPeriod(val)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${period === val
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 border-indigo-400/50 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            <span>{label}</span>
        </button>
    );

    // 수급 주포 종합 진단 문구
    const smartDiagnosis = (() => {
        const { totalFrgn, totalInst, smartMoney } = periodSummary;
        if (totalFrgn > 0 && totalInst > 0) {
            return {
                title: "🔥 쌍끌이 순매수 (강력 매수세)",
                desc: "외국인과 기관이 동시에 물량을 집중 매집하고 있어 강력한 수급 모멘텀이 형성되어 있습니다.",
                badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40"
            };
        } else if (totalFrgn < 0 && totalInst < 0) {
            return {
                title: "💧 쌍끌이 순매도 (차익 실현)",
                desc: "외국인과 기관의 동반 매도세가 지속되며 개인의 물량 받기가 진행되고 있습니다.",
                badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40"
            };
        } else if (totalFrgn > 0 && totalInst <= 0) {
            return {
                title: "⚡ 외국인 주도 매수세",
                desc: "기관의 매도세 속에서도 외국인이 공격적인 순매수를 기록하며 주가 하단을 지지하고 있습니다.",
                badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40"
            };
        } else if (totalInst > 0 && totalFrgn <= 0) {
            return {
                title: "🛡️ 기관 주도 방어 매수세",
                desc: "외국인의 비중 축소 물량을 국내 기관(투신·연기금 등)이 적극적으로 받아내고 있습니다.",
                badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
            };
        }
        return {
            title: "⚖️ 수급 공방 및 관망세",
            desc: "매수와 매도 주체 간의 팽팽한 수급 공방이 이어지며 방향성을 탐색하고 있습니다.",
            badgeColor: "bg-zinc-800 text-zinc-300 border-zinc-700"
        };
    })();

    return (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* 1. Header & Period Filter Ribbon */}
            {apiResponse?.type !== 'global_institutional' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner shrink-0">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-lg md:text-xl font-black text-white tracking-tight">
                                    메이저 수급 & 거래원 인텔리전스
                                </h4>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    INSTITUTIONAL FLOWS
                                </span>
                                {isLoading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin ml-1" />}
                            </div>
                            <p className="text-xs text-zinc-400 font-medium mt-0.5">
                                외국인·기관·개인 3대 투자 주체 순매수 포지션 및 상위 5대 증권사 창구 분석
                            </p>
                        </div>
                    </div>

                    {/* Glassmorphic Period Selector */}
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-950/90 rounded-2xl border border-white/10 shadow-inner w-fit">
                        <PeriodButton val={1} label="당일" />
                        <PeriodButton val={5} label="5일" />
                        <PeriodButton val={20} label="1개월" />
                        <PeriodButton val={60} label="3개월" />
                        <PeriodButton val={120} label="6개월" />
                        <PeriodButton val={250} label="1년" />
                    </div>
                </div>
            )}

            {/* 2. Executive 3-Major Investor Net Flow KPI Ribbon */}
            {apiResponse?.type !== 'global_institutional' && (
                <div className="space-y-3.5">
                    {/* Top Smart Money Diagnosis Bar */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-zinc-950 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-white">{period === 1 ? '당일' : `${period}일 누적`} 수급 종합 진단</span>
                                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${smartDiagnosis.badgeColor}`}>
                                        {smartDiagnosis.title}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-300 font-medium mt-0.5">
                                    {smartDiagnosis.desc}
                                </p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">메이저(외인+기관) 합산 순매수</div>
                            <div className={`text-base font-black font-mono mt-0.5 ${periodSummary.smartMoney > 0 ? 'text-rose-400' : periodSummary.smartMoney < 0 ? 'text-blue-400' : 'text-zinc-200'}`}>
                                {formatCompactShares(periodSummary.smartMoney, true)} ({formatMoneyKRW(periodSummary.smartMoney, periodSummary.avgPrice)})
                            </div>
                        </div>
                    </div>

                    {/* 3대 주체별 상세 카드 그리드 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {/* 1. 외국인 순매수 카드 */}
                        <div className="bg-gradient-to-br from-purple-950/30 via-zinc-900/70 to-black p-5 rounded-2xl border border-purple-500/30 shadow-lg relative overflow-hidden group">
                            <div className="flex items-center justify-between text-xs font-black text-purple-300 mb-2">
                                <span className="flex items-center gap-1.5">
                                    <Globe className="w-4 h-4 text-purple-400" />
                                    <span>외국인 {period === 1 ? '당일 순매수' : `${period}일 누적`}</span>
                                </span>
                                <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md">
                                    FOREIGN
                                </span>
                            </div>
                            <div className={`text-xl md:text-2xl font-black font-mono tracking-tight ${periodSummary.totalFrgn > 0 ? 'text-rose-400' : periodSummary.totalFrgn < 0 ? 'text-blue-400' : 'text-white'}`}>
                                {formatShares(periodSummary.totalFrgn, true)}
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-300 mt-2 pt-2 border-t border-white/5 font-semibold">
                                <span>추정 거래대금</span>
                                <span className="font-mono font-bold text-white">{formatMoneyKRW(periodSummary.totalFrgn, periodSummary.avgPrice)}</span>
                            </div>
                            {latestData?.foreign_ratio !== undefined && (
                                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 font-medium">
                                    <span>외인 지분율 / 보유</span>
                                    <span className="font-mono text-purple-300 font-bold">{latestData.foreign_ratio}% ({formatCompactShares(latestData.foreign_holdings)})</span>
                                </div>
                            )}
                        </div>

                        {/* 2. 기관 순매수 카드 */}
                        <div className="bg-gradient-to-br from-blue-950/30 via-zinc-900/70 to-black p-5 rounded-2xl border border-blue-500/30 shadow-lg relative overflow-hidden group">
                            <div className="flex items-center justify-between text-xs font-black text-blue-300 mb-2">
                                <span className="flex items-center gap-1.5">
                                    <Briefcase className="w-4 h-4 text-blue-400" />
                                    <span>기관 {period === 1 ? '당일 순매수' : `${period}일 누적`}</span>
                                </span>
                                <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-md">
                                    INSTITUTION
                                </span>
                            </div>
                            <div className={`text-xl md:text-2xl font-black font-mono tracking-tight ${periodSummary.totalInst > 0 ? 'text-rose-400' : periodSummary.totalInst < 0 ? 'text-blue-400' : 'text-white'}`}>
                                {formatShares(periodSummary.totalInst, true)}
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-300 mt-2 pt-2 border-t border-white/5 font-semibold">
                                <span>추정 거래대금</span>
                                <span className="font-mono font-bold text-white">{formatMoneyKRW(periodSummary.totalInst, periodSummary.avgPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 font-medium">
                                <span>기관 수급 포지션</span>
                                <span className={`font-bold ${periodSummary.totalInst > 0 ? 'text-rose-400' : periodSummary.totalInst < 0 ? 'text-blue-400' : 'text-zinc-300'}`}>
                                    {periodSummary.totalInst > 0 ? '순매수 우위' : periodSummary.totalInst < 0 ? '순매도 우위' : '중립'}
                                </span>
                            </div>
                        </div>

                        {/* 3. 개인 순매수 카드 */}
                        <div className="bg-gradient-to-br from-emerald-950/30 via-zinc-900/70 to-black p-5 rounded-2xl border border-emerald-500/30 shadow-lg relative overflow-hidden group">
                            <div className="flex items-center justify-between text-xs font-black text-emerald-300 mb-2">
                                <span className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-emerald-400" />
                                    <span>개인 {period === 1 ? '당일 순매수' : `${period}일 누적`}</span>
                                </span>
                                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                    RETAIL
                                </span>
                            </div>
                            <div className={`text-xl md:text-2xl font-black font-mono tracking-tight ${periodSummary.totalRetail > 0 ? 'text-rose-400' : periodSummary.totalRetail < 0 ? 'text-blue-400' : 'text-white'}`}>
                                {formatShares(periodSummary.totalRetail, true)}
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-300 mt-2 pt-2 border-t border-white/5 font-semibold">
                                <span>추정 거래대금</span>
                                <span className="font-mono font-bold text-white">{formatMoneyKRW(periodSummary.totalRetail, periodSummary.avgPrice)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 font-medium">
                                <span>개인 수급 포지션</span>
                                <span className={`font-bold ${periodSummary.totalRetail > 0 ? 'text-rose-400' : periodSummary.totalRetail < 0 ? 'text-blue-400' : 'text-zinc-300'}`}>
                                    {periodSummary.totalRetail > 0 ? '개인 매수세' : periodSummary.totalRetail < 0 ? '개인 매도세' : '중립'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. 거래원 상위 5개사 (Top 5 Brokerage Houses) 블룸버그 스타일 듀얼 카드 */}
            {apiResponse?.type !== 'global_institutional' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 매도 상위 5개사 */}
                    <div className="bg-zinc-950/90 border border-blue-500/25 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-950/60 to-zinc-900 border-b border-blue-500/20 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    <TrendingDown className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-blue-200">매도 상위 5개사 (Sell Side)</h4>
                                    <p className="text-[10px] text-zinc-400 font-medium">당일 주요 매도 출회 창구</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono font-black text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 rounded-xl">
                                총 {cleanBrokerage.totalSellVol.toLocaleString()}주
                            </span>
                        </div>
                        <div className="p-5 space-y-3 flex-1">
                            {cleanBrokerage.sell.length > 0 ? (
                                cleanBrokerage.sell.map((b: any, i: number) => {
                                    const pct = Math.min(100, Math.max(8, (b.volume / cleanBrokerage.maxSellVol) * 100));
                                    const foreign = isForeignBroker(b.name);
                                    return (
                                        <div key={i} className="space-y-1 group">
                                            <div className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] ${
                                                        i === 0 ? 'bg-blue-500 text-white shadow-sm' : 'bg-white/10 text-zinc-300'
                                                    }`}>
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-zinc-100 font-bold group-hover:text-blue-300 transition-colors">
                                                        {b.name}
                                                    </span>
                                                    {foreign && (
                                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                                            GLOBAL
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="font-mono font-bold text-zinc-100 text-xs">
                                                    <span>{b.volume.toLocaleString()}</span>
                                                    <span className="text-[10px] text-zinc-400 ml-0.5">주</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-zinc-500 text-xs font-medium">거래원 매도 데이터가 집계되지 않았습니다.</div>
                            )}
                        </div>
                    </div>

                    {/* 매수 상위 5개사 */}
                    <div className="bg-zinc-950/90 border border-rose-500/25 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-5 py-3.5 bg-gradient-to-r from-rose-950/60 to-zinc-900 border-b border-rose-500/20 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-rose-200">매수 상위 5개사 (Buy Side)</h4>
                                    <p className="text-[10px] text-zinc-400 font-medium">당일 주요 매수 유입 창구</p>
                                </div>
                            </div>
                            <span className="text-xs font-mono font-black text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-xl">
                                총 {cleanBrokerage.totalBuyVol.toLocaleString()}주
                            </span>
                        </div>
                        <div className="p-5 space-y-3 flex-1">
                            {cleanBrokerage.buy.length > 0 ? (
                                cleanBrokerage.buy.map((b: any, i: number) => {
                                    const pct = Math.min(100, Math.max(8, (b.volume / cleanBrokerage.maxBuyVol) * 100));
                                    const foreign = isForeignBroker(b.name);
                                    return (
                                        <div key={i} className="space-y-1 group">
                                            <div className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] ${
                                                        i === 0 ? 'bg-rose-500 text-white shadow-sm' : 'bg-white/10 text-zinc-300'
                                                    }`}>
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-zinc-100 font-bold group-hover:text-rose-300 transition-colors">
                                                        {b.name}
                                                    </span>
                                                    {foreign && (
                                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                                            GLOBAL
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="font-mono font-bold text-zinc-100 text-xs">
                                                    <span>{b.volume.toLocaleString()}</span>
                                                    <span className="text-[10px] text-zinc-400 ml-0.5">주</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-rose-600 to-amber-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-zinc-500 text-xs font-medium">거래원 매수 데이터가 집계되지 않았습니다.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. [Global Institutional View] 해외 종목 주요 기관 주주 */}
            {apiResponse?.type === 'global_institutional' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-zinc-950 border border-blue-500/30 rounded-3xl p-5 flex items-center gap-4 shadow-xl">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-base font-black text-white flex items-center gap-2">
                                <span>해외 종목 주요 글로벌 기관 주주 현황</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">13F FILING</span>
                            </div>
                            <div className="text-xs text-zinc-300 font-medium mt-0.5">
                                {apiResponse.message || '해외 종목은 미국 SEC 13F 공시 기반 글로벌 자산운용사 및 주요 기관 보유 현황을 제공합니다.'}
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {(apiResponse.trend || []).map((holder: any, i: number) => {
                            const holderTranslations: Record<string, string> = {
                                'Vanguard': '뱅가드 그룹 (Vanguard)',
                                'Blackrock': '블랙록 (BlackRock)',
                                'State Street': '스테이트 스트리트 (State Street)',
                                'FMR': '피델리티 자산운용 (FMR)',
                                'Geode Capital': '지오드 캐피탈 (Geode)',
                                'Price (T.Rowe)': '티로우프라이스 (T. Rowe Price)',
                                'Morgan Stanley': '모건 스탠리 (Morgan Stanley)',
                                'JPMORGAN CHASE': 'JP모건 체이스 (JPMorgan)',
                                'Capital World': '캐피탈 그룹 (Capital World)',
                                'Capital International': '캐피탈 그룹 (Capital Int.)',
                                'Bank Of America': '뱅크오브아메리카 (BofA)',
                                'Wellington': '웰링턴 매니지먼트 (Wellington)',
                                'Northern Trust': '노던 트러스트 (Northern Trust)',
                                'Citigroup': '씨티그룹 (Citigroup)',
                                'Goldman Sachs': '골드만삭스 (Goldman Sachs)',
                                'Bank of New York Mellon': 'BNY 멜론 (BNY Mellon)',
                                'Sanders Capital': '샌더스 캐피탈 (Sanders Capital)',
                                'Fisher Asset Management': '피셔 애셋 매니지먼트 (Fisher)',
                                'Van Eck': '반에크 자산운용 (Van Eck)',
                                'Renaissance Technologies': '르네상스 테크놀로지 (Renaissance)',
                                'Invesco': '인베스코 (Invesco)',
                                'Charles Schwab': '찰스 슈왑 (Charles Schwab)',
                                'Berkshire Hathaway': '버크셔 해서웨이 (Berkshire)'
                            };
                            
                            let translatedName = holder.name;
                            for (const [eng, kor] of Object.entries(holderTranslations)) {
                                if (holder.name.toUpperCase().includes(eng.toUpperCase())) {
                                    translatedName = kor;
                                    break;
                                }
                            }

                            const isPercentNA = !holder.percent || holder.percent === 'N/A' || holder.percent === 'NaN%';

                            return (
                                <div key={i} className="bg-zinc-950/80 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4.5 flex justify-between items-center transition-all group shadow-md">
                                    <div>
                                        <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                                            {translatedName}
                                        </div>
                                        {translatedName !== holder.name && (
                                            <div className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-[170px]">({holder.name})</div>
                                        )}
                                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-mono">
                                            <Calendar className="w-3 h-3 text-zinc-400" /> 공시일: {holder.date || '최근'}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {isPercentNA ? (
                                            <div className="text-xs font-bold text-zinc-500">지분율 미상</div>
                                        ) : (
                                            <div className="text-base font-black text-indigo-400 font-mono">{holder.percent}</div>
                                        )}
                                        <div className="text-xs text-zinc-300 font-mono font-bold mt-0.5">
                                            {formatShares(holder.shares)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 5. 탭 컨트롤 (일별 막대 vs 누적 추세선 vs 상세 표) */}
            {apiResponse?.type !== 'global_institutional' && (
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setTabView('daily_bar')}
                            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                                tabView === 'daily_bar' 
                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-black shadow-sm' 
                                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>일별 수급 막대 차트</span>
                        </button>
                        <button
                            onClick={() => setTabView('cumulative_line')}
                            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                                tabView === 'cumulative_line' 
                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-black shadow-sm' 
                                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            <span>누적 수급 곡선</span>
                        </button>
                        <button
                            onClick={() => setTabView('table')}
                            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                                tabView === 'table' 
                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-black shadow-sm' 
                                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            <span>상세 수급 데이터 테이블</span>
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 text-xs font-bold font-mono">
                        <span className="flex items-center gap-1 text-purple-400"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> 외국인</span>
                        <span className="flex items-center gap-1 text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 기관</span>
                        <span className="flex items-center gap-1 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 개인</span>
                        <span className="flex items-center gap-1 text-rose-400"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> 주가</span>
                    </div>
                </div>
            )}

            {/* 6. 메인 콘텐츠 뷰 */}
            {apiResponse?.type !== 'global_institutional' && (
                tabView === 'daily_bar' ? (
                    <div className="bg-zinc-950/90 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-400" />
                                <h3 className="text-sm font-black text-white">투자 주체별 일별 순매수 & 주가 흐름</h3>
                            </div>
                            <span className="text-[11px] text-zinc-400 font-mono font-bold">UNIT: SHARES / KRW</span>
                        </div>

                        <div className="h-[420px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={trendData}
                                    margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                                    barGap={1}
                                    barCategoryGap="20%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.06} vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => val.substring(5)}
                                        stroke="#64748b"
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                        minTickGap={period >= 120 ? 40 : 15}
                                    />
                                    {/* Left YAxis: Shares */}
                                    <YAxis
                                        yAxisId="shares"
                                        stroke="#64748b"
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => {
                                            if (Math.abs(value) >= 1000000) return `${Number(value / 1000000).toFixed(1)}M`;
                                            if (Math.abs(value) >= 1000) return `${Number(value / 1000).toFixed(0)}K`;
                                            return value.toString();
                                        }}
                                        dx={-10}
                                    />
                                    {/* Right YAxis: Price */}
                                    <YAxis
                                        yAxisId="price"
                                        orientation="right"
                                        stroke="#e2e8f0"
                                        tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => Math.round(value).toLocaleString()}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', fontSize: '12px', backdropFilter: 'blur(12px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ padding: '3px 0', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#f8fafc', marginBottom: '8px', fontWeight: 'bold' }}
                                        formatter={(value: any, name: any) => {
                                            const labels: any = { 
                                                foreigner: '외국인 순매수', 
                                                institution: '기관 순매수', 
                                                retail: '개인 순매수',
                                                close: '종가'
                                            };
                                            const unit = name === 'close' ? '원' : '주';
                                            return [`${formatShares(Number(value), true)} ${unit === '원' ? '원' : ''}`, labels[name] || name];
                                        }}
                                        labelFormatter={(label) => `📅 ${label} 수급 및 주가`}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        height={36}
                                        iconType="circle"
                                        formatter={(value) => {
                                            const labels: any = { foreigner: '외국인', institution: '기관', retail: '개인', close: '주가' };
                                            return <span className="text-xs text-zinc-300 mr-3 font-bold">{labels[value] || value}</span>
                                        }}
                                    />
                                    <ReferenceLine yAxisId="shares" y={0} stroke="#ffffff" opacity={0.15} strokeWidth={1} />
                                    
                                    {/* 주가 선 */}
                                    <Line 
                                        yAxisId="price" 
                                        type="monotone" 
                                        dataKey="close" 
                                        stroke="#f43f5e" 
                                        strokeWidth={2.5} 
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#f43f5e' }}
                                    />

                                    {/* 3대 주체별 막대 */}
                                    <Bar yAxisId="shares" dataKey="foreigner" fill="#c084fc" radius={[3, 3, 0, 0]} maxBarSize={14} />
                                    <Bar yAxisId="shares" dataKey="institution" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={14} />
                                    <Bar yAxisId="shares" dataKey="retail" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={14} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : tabView === 'cumulative_line' ? (
                    <div className="bg-zinc-950/90 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-purple-400" />
                                <h3 className="text-sm font-black text-white">기간 누적 수급 곡선 & 스마트머니 합산 추이</h3>
                            </div>
                            <span className="text-[11px] text-zinc-400 font-mono font-bold">CUMULATIVE SHARES</span>
                        </div>

                        <div className="h-[420px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={cumulativeData}
                                    margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.06} vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => val.substring(5)}
                                        stroke="#64748b"
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                        minTickGap={period >= 120 ? 40 : 15}
                                    />
                                    <YAxis
                                        yAxisId="shares"
                                        stroke="#64748b"
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => formatCompactShares(value)}
                                        dx={-10}
                                    />
                                    <YAxis
                                        yAxisId="price"
                                        orientation="right"
                                        stroke="#e2e8f0"
                                        tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => Math.round(value).toLocaleString()}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', fontSize: '12px', backdropFilter: 'blur(12px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ padding: '3px 0', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#f8fafc', marginBottom: '8px', fontWeight: 'bold' }}
                                        formatter={(value: any, name: any) => {
                                            const labels: any = { 
                                                cumForeigner: '외국인 누적 순매수', 
                                                cumInstitution: '기관 누적 순매수', 
                                                cumRetail: '개인 누적 순매수',
                                                cumSmartMoney: '외인+기관 누적합산',
                                                close: '종가'
                                            };
                                            const unit = name === 'close' ? '원' : '주';
                                            return [`${formatShares(Number(value), true)} ${unit === '원' ? '원' : ''}`, labels[name] || name];
                                        }}
                                        labelFormatter={(label) => `📅 ${label} 누적 수급`}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        height={36}
                                        iconType="line"
                                        formatter={(value) => {
                                            const labels: any = { 
                                                cumForeigner: '외인 누적', 
                                                cumInstitution: '기관 누적', 
                                                cumRetail: '개인 누적',
                                                cumSmartMoney: '스마트머니(외+기)',
                                                close: '주가' 
                                            };
                                            return <span className="text-xs text-zinc-300 mr-3 font-bold">{labels[value] || value}</span>
                                        }}
                                    />
                                    <ReferenceLine yAxisId="shares" y={0} stroke="#ffffff" opacity={0.15} strokeWidth={1} />
                                    
                                    <Line yAxisId="shares" type="monotone" dataKey="cumForeigner" stroke="#c084fc" strokeWidth={2.5} dot={false} />
                                    <Line yAxisId="shares" type="monotone" dataKey="cumInstitution" stroke="#60a5fa" strokeWidth={2.5} dot={false} />
                                    <Line yAxisId="shares" type="monotone" dataKey="cumRetail" stroke="#34d399" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                                    <Line yAxisId="shares" type="monotone" dataKey="cumSmartMoney" stroke="#fbbf24" strokeWidth={3} dot={false} />
                                    <Line yAxisId="price" type="monotone" dataKey="close" stroke="#f43f5e" strokeWidth={2} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    /* 7. 상세 데이터 테이블 */
                    <div className="bg-zinc-950/95 border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                            <table className="w-full text-left border-collapse relative">
                                <thead className="sticky top-0 bg-[#0c1222] backdrop-blur-xl border-b-2 border-indigo-500/30 shadow-xl z-10">
                                    <tr className="text-zinc-100 text-xs md:text-sm font-black uppercase tracking-wider whitespace-nowrap">
                                        <th className="py-4 px-4 whitespace-nowrap">일자</th>
                                        <th className="py-4 px-4 text-right whitespace-nowrap">종가</th>
                                        <th className="py-4 px-4 text-right whitespace-nowrap">전일대비</th>
                                        <th className="py-4 px-4 text-right whitespace-nowrap">등락률</th>
                                        <th className="py-4 px-5 text-right whitespace-nowrap">외국인 순매수</th>
                                        <th className="py-4 px-5 text-right whitespace-nowrap">기관 순매수</th>
                                        <th className="py-4 px-5 text-right whitespace-nowrap">개인 순매수</th>
                                        <th className="py-4 px-4 text-right whitespace-nowrap">외인 지분율</th>
                                        <th className="py-4 px-5 text-right whitespace-nowrap">거래량</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10 text-xs md:text-sm font-mono">
                                    {[...trendData].reverse().map((day: any, idx) => {
                                        const diff = day.diff || 0;
                                        const chg = day.change || 0;
                                        const isUp = diff > 0;
                                        const isDown = diff < 0;
                                        const frgn = day.foreigner || 0;
                                        const inst = day.institution || 0;
                                        const ret = day.retail || 0;

                                        return (
                                            <tr key={idx} className="hover:bg-gradient-to-r hover:from-indigo-500/15 hover:via-purple-500/10 hover:to-transparent transition-colors group whitespace-nowrap">
                                                <td className="py-3.5 px-4 text-zinc-100 font-bold whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{day.date}</span>
                                                        {idx === 0 && (
                                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/50">
                                                                최근
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-extrabold text-white whitespace-nowrap">
                                                    ₩{Math.round(day.close || day.price || 0).toLocaleString()}
                                                </td>
                                                <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${isUp ? 'text-rose-400' : isDown ? 'text-blue-400' : 'text-zinc-400'}`}>
                                                    {isUp ? '▲' : isDown ? '▼' : '•'} {Math.abs(Math.round(diff)).toLocaleString()}
                                                </td>
                                                <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${chg > 0 ? 'text-rose-400' : chg < 0 ? 'text-blue-400' : 'text-zinc-400'}`}>
                                                    {chg > 0 ? '+' : ''}{Number(chg).toFixed(2)}%
                                                </td>
                                                <td className={`py-3.5 px-5 text-right font-black whitespace-nowrap ${frgn > 0 ? 'text-rose-400' : frgn < 0 ? 'text-blue-400' : 'text-zinc-400'}`}>
                                                    {frgn > 0 ? '+' : ''}{Math.round(frgn).toLocaleString()}
                                                </td>
                                                <td className={`py-3.5 px-5 text-right font-black whitespace-nowrap ${inst > 0 ? 'text-rose-400' : inst < 0 ? 'text-blue-400' : 'text-zinc-400'}`}>
                                                    {inst > 0 ? '+' : ''}{Math.round(inst).toLocaleString()}
                                                </td>
                                                <td className={`py-3.5 px-5 text-right font-black whitespace-nowrap ${ret > 0 ? 'text-rose-400' : ret < 0 ? 'text-blue-400' : 'text-zinc-400'}`}>
                                                    {ret > 0 ? '+' : ''}{Math.round(ret).toLocaleString()}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-bold text-purple-300 whitespace-nowrap">
                                                    {Number(day.foreign_ratio || 0).toFixed(2)}%
                                                </td>
                                                <td className="py-3.5 px-5 text-right text-zinc-300 whitespace-nowrap font-medium">
                                                    {Math.round(day.volume || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Footer Notice */}
            <div className="text-[11px] text-zinc-400 flex items-center gap-2 justify-center bg-zinc-950/60 py-3 rounded-2xl border border-white/5 shadow-inner">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>데이터 소스: 한국거래소(KRX) 및 네이버 금융 실시간 거래원·투자자별 매매동향 API. 30초 주기로 자동 갱신됩니다.</span>
            </div>
        </div>
    );
}
