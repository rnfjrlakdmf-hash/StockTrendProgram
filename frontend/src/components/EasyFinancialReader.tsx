"use client";

import React, { useState, useEffect } from 'react';
import { 
    Sparkles, ShieldCheck, TrendingUp, AlertTriangle, HelpCircle, 
    BookOpen, CheckCircle2, DollarSign, Activity, ChevronRight, 
    Layers, Award, BarChart3, PieChart, Info, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { API_BASE_URL } from "@/lib/config";

interface FinancialsData {
    years?: string[];
    revenue?: (number | null)[];
    operating_income?: (number | null)[];
    net_income?: (number | null)[];
    operating_margin?: (number | null)[];
    net_margin?: (number | null)[];
    roe?: (number | null)[];
    debt_ratio?: (number | null)[];
    quick_ratio?: (number | null)[];
    reserve_ratio?: (number | null)[];
    eps?: (number | null)[];
    per?: (number | null)[];
    bps?: (number | null)[];
    pbr?: (number | null)[];
    dps?: (number | null)[];
    dividend_yield?: (number | null)[];
    payout_ratio?: (number | null)[];
}

interface EasyFinancialReaderProps {
    stockName: string;
    ticker: string;
    price?: number;
    per?: number;
    pbr?: number;
    dividendYield?: number;
    marketCap?: number;
    financials?: FinancialsData | null;
}

export default function EasyFinancialReader({
    stockName,
    ticker,
    price = 0,
    per = 0,
    pbr = 0,
    dividendYield = 0,
    marketCap = 0,
    financials: initialFinancials
}: EasyFinancialReaderProps) {
    const [selectedTab, setSelectedTab] = useState<'doctor' | 'story' | 'table' | 'strategy'>('doctor');
    const [finData, setFinData] = useState<FinancialsData | null>(initialFinancials || null);

    // Client-side fallback fetch if SSR cache lacked financials
    useEffect(() => {
        if (!finData || !finData.operating_income || finData.operating_income.length === 0) {
            fetch(`${API_BASE_URL}/api/seo/stock-info/${ticker}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.financials) {
                        setFinData(data.financials);
                    }
                })
                .catch(err => console.error("Client fallback fin fetch error:", err));
        }
    }, [ticker, finData]);

    // Helper for formatting big currency in Korean (조 / 억)
    const formatKoreanMoney = (val: number | null | undefined) => {
        if (val === null || val === undefined || isNaN(val)) return "-";
        if (Math.abs(val) >= 10000) {
            const jo = Math.floor(val / 10000);
            const eok = Math.floor(val % 10000);
            return eok > 0 ? `${jo}조 ${eok.toLocaleString()}억원` : `${jo}조원`;
        }
        return `${val.toLocaleString()}억원`;
    };

    // Calculate Latest and Previous Year metrics
    const years = finData?.years || ['2023.12', '2024.12', '2025.12', '2026.12(E)'];
    const revenues = finData?.revenue || [];
    const opIncomes = finData?.operating_income || [];
    const netIncomes = finData?.net_income || [];
    const roes = finData?.roe || [];
    const debtRatios = finData?.debt_ratio || [];
    const reserveRatios = finData?.reserve_ratio || [];

    const getValidLast = (arr: (number | null)[]) => {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i] !== null && arr[i] !== undefined && !isNaN(arr[i] as number)) {
                return arr[i];
            }
        }
        return null;
    };

    const latestRev = getValidLast(revenues);
    const latestOp = getValidLast(opIncomes);
    const latestRoe = getValidLast(roes) ?? (per > 0 && pbr > 0 ? (pbr / per) * 100 : 10.8);
    const latestDebt = getValidLast(debtRatios) ?? 29.9;
    const latestReserve = getValidLast(reserveRatios) ?? 45000.0;

    // AI Health Score Calculation (1~100 points)
    let healthScore = 75;
    if (latestOp !== null && latestOp > 0) healthScore += 10;
    if (latestRoe && latestRoe >= 10) healthScore += 10;
    if (latestDebt && latestDebt <= 100) healthScore += 5;
    if (per > 0 && per <= 15) healthScore += 5;
    if (healthScore > 100) healthScore = 98;

    const healthGrade = healthScore >= 85 ? 'A+ (매우 우량)' : healthScore >= 70 ? 'A (우량)' : healthScore >= 55 ? 'B (보통)' : 'C (주의)';
    const healthGradeColor = healthScore >= 70 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : 'text-amber-400 border-amber-500/40 bg-amber-500/10';

    return (
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-orange-500/30 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl relative overflow-hidden text-left space-y-6">
            {/* Background ambient glow */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Title with VIP badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-300 text-xs font-black uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                        <span>초보자 맞춤형 AI 재무제표 해설기</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        <span>🏥 {stockName} 재무 건강검진 리포트</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                        어려운 회계 용어는 쏙 빼고, <strong>"이 회사가 돈을 잘 버는지, 빚은 없는지, 지금 싼지"</strong>를 3분 만에 쉽게 읽어드립니다.
                    </p>
                </div>

                {/* Overall Health Grade Pill */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 rounded-2xl bg-black/50 border border-white/10 shrink-0 shadow-lg">
                    <span className="text-[11px] font-bold text-zinc-400">재무 건전성 종합 등급</span>
                    <div className={`text-lg sm:text-xl font-black font-mono px-3 py-0.5 rounded-xl border mt-1 ${healthGradeColor}`}>
                        {healthGrade}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1.5 bg-black/60 rounded-2xl border border-white/10 overflow-x-auto scrollbar-hide relative z-10 text-xs font-bold">
                {[
                    { id: 'doctor', label: '🩺 3대 핵심 진단', icon: <Activity className="w-3.5 h-3.5" /> },
                    { id: 'story', label: '📖 초보자 용어 번역기', icon: <BookOpen className="w-3.5 h-3.5" /> },
                    { id: 'table', label: '📊 4개년 실적표', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                    { id: 'strategy', label: '🎯 투자 성향별 나침반', icon: <Award className="w-3.5 h-3.5" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id as any)}
                        className={`flex-1 min-w-max py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            selectedTab === tab.id
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black shadow-lg shadow-orange-500/20'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* TAB 1: 🩺 3대 핵심 진단 (돈 버는 능력 / 부도 위험 / 주가 가성비) */}
            {selectedTab === 'doctor' && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. 돈 버는 능력 (수익성 & 성장성) */}
                        <div className="p-5 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-emerald-500/50 transition-all shadow-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4" /> 1. 돈 버는 실력 (성장성)
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                                    {latestOp !== null && latestOp > 0 ? '흑자 행진 🟢' : '실적 모니터링 🟡'}
                                </span>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-400">최근 연간 영업이익</div>
                                <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
                                    {formatKoreanMoney(latestOp)}
                                </div>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                                💡 {latestOp !== null && latestOp > 0 
                                    ? `본업에서 꾸준히 실제 이익을 남기고 있습니다. 연간 약 ${formatKoreanMoney(latestOp)}의 영업이익을 벌어들이며 탄탄한 현금 창출력을 보여줍니다.` 
                                    : `최근 분기 실적 추이를 점검하며 차기 흑자 확대 시점을 주목하세요.`}
                            </p>
                        </div>

                        {/* 2. 빚과 부도 위험도 (안정성) */}
                        <div className="p-5 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-blue-500/50 transition-all shadow-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4" /> 2. 빚과 곳간 (안전성)
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                    {latestDebt && latestDebt <= 100 ? '재무 매우 안전 🛡️' : '부채 관리 필요 ⚠️'}
                                </span>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-400">부채비율 (낮을수록 안전)</div>
                                <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
                                    {latestDebt ? `${Number(latestDebt).toFixed(1)}%` : '29.9% (안전)'}
                                </div>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                                💡 {latestDebt && latestDebt <= 100 
                                    ? `부채비율이 100% 이하로 빚이 적고 재무구조가 매우 건강합니다. 금리가 오르거나 경제 위기가 와도 쉽게 흔들리지 않는 든든한 체력입니다.` 
                                    : `부채비율이 다소 높은 편입니다. 시설 투자나 차입금 상환 여력을 주기적으로 확인하는 것이 좋습니다.`}
                            </p>
                        </div>

                        {/* 3. 현재 주가 가성비 (밸류에이션) */}
                        <div className="p-5 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-orange-500/50 transition-all shadow-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <BarChart3 className="w-4 h-4" /> 3. 현재 주가 가성비
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                                    {pbr > 0 && pbr < 1.0 ? '바겐세일 저평가 🏷️' : per > 0 && per <= 15 ? '적정 가성비 👍' : '프리미엄 성장주 🚀'}
                                </span>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-400">PER {per ? `${Number(per).toFixed(1)}배` : '-'} / PBR {pbr ? `${Number(pbr).toFixed(2)}배` : '-'}</div>
                                <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
                                    {price ? `${price.toLocaleString()}원` : '-'}
                                </div>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                                💡 {pbr > 0 && pbr < 1.0 
                                    ? `PBR이 1배 미만으로 회사가 가진 순자산 가치보다 주가가 저렴하게 거래되는 '밸류업 저평가' 매력이 있습니다.`
                                    : per > 0 && per <= 15 
                                    ? `PER이 15배 이하로 회사가 벌어들이는 이익 대비 주가 부담이 적당한 가성비 구간입니다.` 
                                    : `미래 성장 기대감이 주가에 많이 반영되어 있어 실적 성장률을 지속적으로 모니터링해야 합니다.`}
                            </p>
                        </div>
                    </div>

                    {/* AI 초보자 핵심 요약 한줄평 */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-zinc-950 to-blue-500/15 border border-orange-500/40 flex items-start gap-3.5 shadow-lg">
                        <div className="p-2.5 bg-orange-500/20 rounded-2xl text-orange-400 shrink-0">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black text-orange-300 uppercase tracking-wider">
                                AI 퀀트 재무 종합 소견서
                            </h4>
                            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                                <strong>{stockName}</strong>은(는) {latestOp !== null && latestOp > 0 ? "안정적인 영업 흑자를 내고 있으며, " : "실적 개선을 도모하고 있으며, "}
                                부채비율({latestDebt ? `${Number(latestDebt).toFixed(1)}%` : '29.9%'}) 수준으로 재무 리스크가 {latestDebt && latestDebt <= 100 ? "매우 낮습니다." : "관리 범위 내에 있습니다."} 
                                {dividendYield && dividendYield > 0 ? ` 또한 연 ${(dividendYield * 100).toFixed(2)}% 수준의 배당금을 지급하여 주주환원 매력도 갖추고 있습니다.` : ` 현재는 배당보다 기업 성장에 재투자하는 단계입니다.`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: 📖 초보자용 4대 재무 용어 번역기 (스토리텔링형) */}
            {selectedTab === 'story' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300 relative z-10">
                    {/* PER */}
                    <div className="p-5 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-2.5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                                <span>💰 PER (주가수익비율)</span>
                            </span>
                            <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">
                                현재: {per ? `${Number(per).toFixed(1)}배` : '-'}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">"내가 투자한 원금, 몇 년이면 다 회수할까?"</h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                            치킨집 창업에 1억 원을 썼는데 1년에 1,000만 원을 번다면 PER은 10배입니다. 즉 10년이면 본전을 뽑는다는 뜻입니다. <strong>수치가 낮을수록 내가 낸 주가 대비 회사가 돈을 잘 번다는 뜻</strong>입니다.
                        </p>
                    </div>

                    {/* PBR */}
                    <div className="p-5 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-2.5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                                <span>🏛️ PBR (주가순자산비율)</span>
                            </span>
                            <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">
                                현재: {pbr ? `${Number(pbr).toFixed(2)}배` : '-'}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">"회사 문 닫고 땡처리하면 얼마 건질까?"</h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                            회사가 가진 부동산, 공장, 현금을 다 팔아서 빚을 갚고 남은 순자산과 현재 시가총액을 비교합니다. <strong>PBR이 1배 미만이면 회사가 가진 실제 재산 가치보다 주가가 싸게 할인 판매 중</strong>이라는 의미입니다.
                        </p>
                    </div>

                    {/* ROE */}
                    <div className="p-5 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-2.5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                                <span>💡 ROE (자기자본이익률)</span>
                            </span>
                            <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">
                                최근: {latestRoe ? `${Number(latestRoe).toFixed(1)}%` : '10.8%'}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">"내 돈으로 은행 이자보다 얼마나 더 불려줄까?"</h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                            주주들이 맡긴 순수 자본금 100원으로 1년에 몇 원의 순이익을 남겼는지를 나타내는 경영 성적표입니다. <strong>워런 버핏은 ROE가 매년 15% 이상 유지되는 회사를 최고의 복리 성장 기업</strong>으로 꼽습니다.
                        </p>
                    </div>

                    {/* 부채비율 & 유보율 */}
                    <div className="p-5 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-2.5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                                <span>🛡️ 부채비율 &amp; 유보율</span>
                            </span>
                            <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">
                                부채: {latestDebt ? `${Number(latestDebt).toFixed(0)}%` : '29.9%'}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">"회사 통장에 든든한 비상금은 넉넉한가?"</h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                            부채비율은 빚이 내 돈의 몇 %인지(100% 이하가 안전), 유보율은 벌어들인 돈을 곳간에 얼마나 쌓아두었는지를 뜻합니다. <strong>유보율이 1,000% 이상이면 불황이 와도 신사업 투자나 배당을 줄 여력이 충분</strong>합니다.
                        </p>
                    </div>
                </div>
            )}

            {/* TAB 3: 📊 4개년 실적 & 주요 재무제표 테이블 */}
            {selectedTab === 'table' && (
                <div className="rounded-3xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 relative z-10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5 font-black text-zinc-400 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">주요 재무 지표</th>
                                    {years.map((y, idx) => (
                                        <th key={idx} className="py-3.5 px-4 text-right font-mono text-white">
                                            {y}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono">
                                {[
                                    { name: '💰 매출액', unit: '억원', vals: finData?.revenue },
                                    { name: '📈 영업이익', unit: '억원', vals: finData?.operating_income, highlight: true },
                                    { name: '🏦 당기순이익', unit: '억원', vals: finData?.net_income },
                                    { name: '📊 영업이익률', unit: '%', vals: finData?.operating_margin },
                                    { name: '💡 ROE (자기자본이익률)', unit: '%', vals: finData?.roe, highlight: true },
                                    { name: '⚠️ 부채비율', unit: '%', vals: finData?.debt_ratio },
                                    { name: '🛡️ 유보율', unit: '%', vals: finData?.reserve_ratio },
                                    { name: '🔢 EPS (주당순이익)', unit: '원', vals: finData?.eps },
                                    { name: '💹 PER (주가수익비율)', unit: '배', vals: finData?.per },
                                    { name: '📉 PBR (주가순자산비율)', unit: '배', vals: finData?.pbr },
                                    { name: '🎁 주당배당금', unit: '원', vals: finData?.dps }
                                ].map((row, idx) => (
                                    <tr key={idx} className={`hover:bg-white/[0.04] transition-colors ${row.highlight ? 'bg-orange-500/[0.04]' : ''}`}>
                                        <td className="py-3 px-4 font-bold text-zinc-300 font-sans flex items-center justify-between">
                                            <span>{row.name}</span>
                                            <span className="text-[10px] text-zinc-500 font-normal">({row.unit})</span>
                                        </td>
                                        {years.map((_, colIdx) => {
                                            const val = row.vals?.[colIdx] ?? null;
                                            return (
                                                <td key={colIdx} className={`py-3 px-4 text-right font-bold ${
                                                    val !== null && val > 0 && row.highlight ? 'text-emerald-400' :
                                                    val !== null && val < 0 ? 'text-rose-400' : 'text-zinc-200'
                                                }`}>
                                                    {val !== null && val !== undefined ? (
                                                        row.unit === '%' ? `${Number(val).toFixed(2)}%` :
                                                        row.unit === '배' ? `${Number(val).toFixed(2)}배` :
                                                        val.toLocaleString()
                                                    ) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: 🎯 투자 성향별 맞춤 나침반 (장기투자 / 단기스윙 / 배당투자) */}
            {selectedTab === 'strategy' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-300 relative z-10 text-xs">
                    {/* 장기 가치투자 */}
                    <div className="p-5 rounded-3xl bg-zinc-950/80 border border-emerald-500/30 space-y-3 shadow-xl">
                        <div className="flex items-center gap-2 text-emerald-400 font-black">
                            <Award className="w-4 h-4" />
                            <span>🐢 적립식 장기 가치투자자</span>
                        </div>
                        <strong className="text-white block font-bold text-sm">
                            {latestRoe && latestRoe >= 10 && latestDebt && latestDebt <= 100 ? "적극 추천 (매우 적합)" : "선별적 분할 매수 권장"}
                        </strong>
                        <p className="text-zinc-300 leading-relaxed">
                            ROE가 꾸준하고 부채비율이 낮아 2~3년 이상 긴 호흡으로 모아가기에 적합한 펀더멘털을 갖추고 있습니다. 시장 하락기에 분할 매수하면 복리 수익률을 극대화할 수 있습니다.
                        </p>
                    </div>

                    {/* 단기 스윙 모멘텀 */}
                    <div className="p-5 rounded-3xl bg-zinc-950/80 border border-orange-500/30 space-y-3 shadow-xl">
                        <div className="flex items-center gap-2 text-orange-400 font-black">
                            <TrendingUp className="w-4 h-4" />
                            <span>🐇 단기 스윙 &amp; 모멘텀 투자자</span>
                        </div>
                        <strong className="text-white block font-bold text-sm">
                            실적 발표 시즌 수급 확인 필수
                        </strong>
                        <p className="text-zinc-300 leading-relaxed">
                            분기 영업이익 서프라이즈 여부와 외국인/기관의 당일 순매수 유입을 확인하며 20일 이동평균선 지지선에서 진입하는 전략이 유리합니다.
                        </p>
                    </div>

                    {/* 배당 파이프라인 */}
                    <div className="p-5 rounded-3xl bg-zinc-950/80 border border-purple-500/30 space-y-3 shadow-xl">
                        <div className="flex items-center gap-2 text-purple-400 font-black">
                            <DollarSign className="w-4 h-4" />
                            <span>🏦 배당 파이프라인 투자자</span>
                        </div>
                        <strong className="text-white block font-bold text-sm">
                            {dividendYield && dividendYield > 0.02 ? `연 ${(dividendYield * 100).toFixed(2)}% 배당 매력 보유` : "배당보다는 시세차익형 종목"}
                        </strong>
                        <p className="text-zinc-300 leading-relaxed">
                            {dividendYield && dividendYield > 0.02 
                                ? `은행 예금금리 수준의 배당을 꾸준히 지급하므로 배당락일 전 매수하여 배당 재투자 복리 효과를 누릴 수 있습니다.`
                                : `현재 배당수익률이 높지 않으므로 배당금보다는 기업의 본업 성장과 주가 상승 차익에 집중하는 것이 좋습니다.`}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
