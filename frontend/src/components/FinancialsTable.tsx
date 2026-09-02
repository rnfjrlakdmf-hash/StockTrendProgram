'use client';

import React, { useState, useMemo } from 'react';
import { 
    Sparkles, HelpCircle, TrendingUp, TrendingDown, ShieldCheck, 
    DollarSign, Activity, AlertCircle, Award, CheckCircle2, ChevronRight,
    BarChart3, PieChart, Info, BookOpen
} from 'lucide-react';

interface FinancialMetric {
    dates: string[];
    values: (number | null)[];
}

interface FinancialsTableProps {
    data: any | null;
    currency?: string;
}

const METRIC_CONFIG: Record<string, {
    label: string;
    unit: string;
    description: string;
    beginnerNote: string;
    emoji: string;
    higherIsBetter: boolean;
    format: 'number' | 'percent' | 'ratio';
    goodBenchmark?: string;
}> = {
    revenue: { 
        label: "매출액", 
        unit: "억원", 
        emoji: "💰", 
        description: "회사가 제품이나 서비스를 팔아서 벌어들인 총 수입", 
        beginnerNote: "회사의 덩치가 얼마나 커지고 있는지 보여주는 기본 체력입니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "지속 성장 우수"
    },
    operating_income: { 
        label: "영업이익", 
        unit: "억원", 
        emoji: "📈", 
        description: "순수 본업을 통해 벌어들인 실제 알짜 사업 이익", 
        beginnerNote: "원가와 인건비를 빼고 진짜 장사로 남긴 돈으로 가장 중요합니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "흑자 & 증가세 우수"
    },
    net_income: { 
        label: "순이익", 
        unit: "억원", 
        emoji: "🏦", 
        description: "세금과 이자, 부대비용을 모두 제하고 최종 통장에 남은 순이익", 
        beginnerNote: "주주들의 몫이 되는 최종 이익입니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "안정적 흑자 유지"
    },
    operating_margin: { 
        label: "영업이익률", 
        unit: "%", 
        emoji: "📊", 
        description: "매출 100원을 올렸을 때 영업이익으로 몇 원을 남겼는지 비율", 
        beginnerNote: "10% 이상이면 마진이 높고 제품 경쟁력이 뛰어난 기업입니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "10% 이상 우수"
    },
    net_income_margin: { 
        label: "순이익률", 
        unit: "%", 
        emoji: "✅", 
        description: "매출 100원 중 최종 순이익이 차지하는 백분율", 
        beginnerNote: "회사의 최종 수익성 마진을 나타냅니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "5~10% 이상 양호"
    },
    roe: { 
        label: "ROE (자기자본이익률)", 
        unit: "%", 
        emoji: "💡", 
        description: "주주들이 맡긴 내 돈(자본)을 굴려 몇 %의 수익을 냈는지 지표", 
        beginnerNote: "워런 버핏이 가장 중요하게 보는 지표로 10~15% 이상이면 특급 기업입니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "10% 이상 특급"
    },
    debt_ratio: { 
        label: "부채비율", 
        unit: "%", 
        emoji: "🛡️", 
        description: "회사 자본 대비 빚이 얼마나 많은지 나타내는 건전성 지표", 
        beginnerNote: "100% 미만이면 빚이 거의 없어 불황에도 망하지 않는 안전한 회사입니다.",
        higherIsBetter: false, 
        format: 'percent',
        goodBenchmark: "100% 이하 안전"
    },
    quick_ratio: { 
        label: "당좌비율", 
        unit: "%", 
        emoji: "⚡", 
        description: "채권자가 당장 돈을 갚으라 할 때 즉시 갚을 수 있는 현금성 자산 비율", 
        beginnerNote: "100% 이상이면 단기 자금 압박 걱정이 없는 회사입니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "100% 이상 우수"
    },
    reserve_ratio: { 
        label: "유보율", 
        unit: "%", 
        emoji: "🏗️", 
        description: "회사가 번 돈을 배당 등으로 다 쓰지 않고 비상금으로 쌓아둔 비율", 
        beginnerNote: "높을수록 현금 곳간이 든든해 위기에 강하고 무상증자 여력이 큽니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "1000% 이상 든든"
    },
    eps: { 
        label: "EPS (주당순이익)", 
        unit: "원", 
        emoji: "🔢", 
        description: "주식 1주가 1년 동안 얼마의 순이익을 벌어다 주었는지 금액", 
        beginnerNote: "주식 1장의 가치를 나타내며, 매년 EPS가 늘어나는 기업이 최고의 성장주입니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "매년 우상향 우수"
    },
    per: { 
        label: "PER (주가수익비율)", 
        unit: "배", 
        emoji: "💹", 
        description: "현재 주가가 1주당 번 돈(EPS)의 몇 배로 거래되고 있는지 배수", 
        beginnerNote: "회사가 번 돈으로 원금을 회수하는 데 걸리는 연수입니다. 낮을수록 저평가!",
        higherIsBetter: false, 
        format: 'ratio',
        goodBenchmark: "10~15배 적정"
    },
    pbr: { 
        label: "PBR (주가순자산비율)", 
        unit: "배", 
        emoji: "📉", 
        description: "회사가 당장 문을 닫고 청산했을 때의 자산가치 대비 현재 주가 배수", 
        beginnerNote: "1배 미만이면 회사를 다 팔아도 주가보다 재산이 많은 절대적 저평가 상태입니다.",
        higherIsBetter: false, 
        format: 'ratio',
        goodBenchmark: "1.0배 이하 저평가"
    },
    bps: { 
        label: "BPS (주당순자산)", 
        unit: "원", 
        emoji: "🏛️", 
        description: "기업 청산 시 주식 1주당 주주에게 돌아갈 순자산(재산) 가치", 
        beginnerNote: "주가의 가장 튼튼한 바닥 지지선 역할을 합니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "지속 증가 우수"
    },
    dps: { 
        label: "주당배당금 (DPS)", 
        unit: "원", 
        emoji: "🎁", 
        description: "주식 1주를 갖고 있으면 현금으로 지급받는 배당금", 
        beginnerNote: "통장에 꽂히는 실제 현금 배당금입니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "배당 확대 우수"
    },
    dividend_yield: { 
        label: "배당수익률", 
        unit: "%", 
        emoji: "💸", 
        description: "현재 주가 대비 1년간 받는 배당금의 이자율 같은 비율", 
        beginnerNote: "은행 예금 금리보다 높으면 매력적인 고배당 투자처가 됩니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "3~5% 이상 고배당"
    },
    payout_ratio: { 
        label: "배당성향", 
        unit: "%", 
        emoji: "🤝", 
        description: "회사가 번 순이익 중에서 주주들에게 배당으로 나눠준 비율", 
        beginnerNote: "20~40% 수준이면 주주환원과 재투자의 밸런스가 좋습니다.",
        higherIsBetter: false, 
        format: 'percent',
        goodBenchmark: "20~40% 적정"
    },
};

// 카테고리 그룹핑
const METRIC_GROUPS = [
    { title: "📈 실적 지표", description: "회사가 물건을 얼마나 잘 팔고 실제로 얼마를 남겼는가", keys: ["revenue", "operating_income", "net_income"] },
    { title: "💰 수익성 지표", description: "매출 대비 남기는 마진과 투자금 대비 이익 창출 효율성", keys: ["operating_margin", "net_income_margin", "roe"] },
    { title: "🛡️ 안정성 & 건전성", description: "빚이 감당 가능한 수준인지, 회사의 재정이 튼튼한지", keys: ["debt_ratio", "quick_ratio", "reserve_ratio"] },
    { title: "📊 주가 & 가치평가 (밸류에이션)", description: "현재 주가가 기업 가치 대비 싼지 비싼지 판별", keys: ["eps", "per", "pbr", "bps"] },
    { title: "🎁 배당 & 주주환원", description: "주주들에게 번 돈을 얼마나 알뜰하게 나눠주는가", keys: ["dps", "dividend_yield", "payout_ratio"] },
];

function formatValue(val: any, format: string, unit: string, currency?: string): string {
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num)) return '-';

    if (format === 'number') {
        if (currency === 'USD') {
            if (Math.abs(num) >= 1000000000) return `$${Number(num / 1000000000).toFixed(1)}B`;
            if (Math.abs(num) >= 1000000) return `$${Number(num / 1000000).toFixed(1)}M`;
            return `$${Math.round(num).toLocaleString()}`;
        }
        if (unit === '억원') {
            if (Math.abs(num) >= 10000) return `${Number(num / 10000).toFixed(1)}조`;
            return `${Math.round(num).toLocaleString()}억`;
        }
        // 원 단위 (EPS, BPS 등)
        return `${Math.round(num).toLocaleString()}`;
    }
    if (format === 'percent') return `${Number(num).toFixed(1)}%`;
    if (format === 'ratio') return `${Number(num).toFixed(2)}배`;
    return Math.round(num).toLocaleString();
}

function getTrend(values: (number | null)[], idx: number): 'up' | 'down' | 'flat' | 'none' {
    if (idx === 0) return 'none';
    const curr = values[idx];
    const prev = values[idx - 1];
    if (curr === null || prev === null || prev === 0) return 'none';
    const diff = (curr - prev) / Math.abs(prev);
    if (diff > 0.03) return 'up';
    if (diff < -0.03) return 'down';
    return 'flat';
}

function getColorClass(val: number, higherIsBetter: boolean, isZero: boolean): string {
    if (isZero) return 'text-zinc-500';
    if (higherIsBetter) {
        if (val > 0) return 'text-emerald-400 font-bold';
        if (val < 0) return 'text-rose-400 font-bold';
        return 'text-zinc-300';
    } else {
        return 'text-zinc-200';
    }
}

export default function FinancialsTable({ data: rawData, currency }: FinancialsTableProps) {
    const [showEasyMode, setShowEasyMode] = useState(true);
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    const data = React.useMemo(() => {
        if (!rawData) return null;
        
        let processedData = rawData;
        if (rawData.detailed && rawData.detailed.full_data) {
            processedData = rawData.detailed.full_data;
        }

        if (Object.values(processedData).some((v: any) => v && typeof v === 'object' && 'dates' in v)) {
            return processedData as Record<string, FinancialMetric>;
        }

        if (rawData.detailed && (rawData.detailed.annual || rawData.detailed.quarterly)) {
            const annual = rawData.detailed.annual || [];
            const quarterly = rawData.detailed.quarterly || [];
            const combinedDates = [...annual.map((a: any) => a.date), ...quarterly.map((q: any) => q.date)];
            
            const transform = (key: string) => {
                return { 
                    dates: combinedDates, 
                    values: [
                        ...annual.map((a: any) => a[key] ?? null),
                        ...quarterly.map((q: any) => q[key] ?? null)
                    ] 
                };
            };

            return {
                revenue: transform('revenue'),
                operating_income: transform('operating_income'),
                net_income: transform('net_income'),
                debt_ratio: { dates: combinedDates, values: combinedDates.map(() => rawData.debt_ratio || null) },
                per: { dates: combinedDates, values: combinedDates.map(() => rawData.detailed.summary?.per || null) },
                pbr: { dates: combinedDates, values: combinedDates.map(() => rawData.detailed.summary?.pbr || null) },
                roe: { dates: combinedDates, values: combinedDates.map(() => rawData.detailed.summary?.roe || null) },
            };
        }
        
        return null;
    }, [rawData]);

    const firstMetric = data ? Object.values(data)[0] : null;
    const dates = firstMetric?.dates || [];

    const isQuarterDate = (d: string) => {
        if (!d) return false;
        if (d.includes('Q') || d.includes('분기')) return true;
        const monthMatch = d.match(/\/(\d{2})/);
        if (monthMatch) {
            const month = parseInt(monthMatch[1]);
            return month === 3 || month === 6 || month === 9;
        }
        return false;
    };

    const annualDates = dates.filter((d: string) => !isQuarterDate(d));
    const quarterlyDates = dates.filter((d: string) => isQuarterDate(d));
    const hasQuarterlyData = quarterlyDates.length > 0;
    const isEstimate = (d: string) => d?.includes('(E)');

    // 초보자를 위한 AI 재무제표 3줄 핵심 총평 자동 생성
    const aiSummary = useMemo(() => {
        if (!data) return null;
        
        // 1. 최근 유효 데이터 추출
        const getLatestVal = (key: string) => {
            const vals = data[key]?.values || [];
            for (let i = vals.length - 1; i >= 0; i--) {
                if (vals[i] !== null && vals[i] !== undefined && !isNaN(vals[i] as number)) {
                    return { val: vals[i] as number, date: dates[i] };
                }
            }
            return null;
        };

        const revObj = getLatestVal('revenue');
        const opObj = getLatestVal('operating_income');
        const roeObj = getLatestVal('roe');
        const debtObj = getLatestVal('debt_ratio');
        const perObj = getLatestVal('per');
        const pbrObj = getLatestVal('pbr');
        const opmObj = getLatestVal('operating_margin');

        // 진단 문구 빌드
        const points = [];

        // 1) 성장성 & 매출
        if (revObj && opObj) {
            const revFmt = formatValue(revObj.val, 'number', '억원', currency);
            const opFmt = formatValue(opObj.val, 'number', '억원', currency);
            const isOpGood = opObj.val > 0;
            points.push({
                category: "성장 & 실적",
                title: isOpGood ? "견고한 실적 창출력" : "수익성 개선 필요",
                desc: `최근 실적 기준 매출액 ${revFmt}, 영업이익 ${opFmt}을 기록하며 본업에서 ${isOpGood ? '안정적인 흑자 구조를 입증' : '실적 턴어라운드를 추진'}하고 있습니다.`,
                status: isOpGood ? "positive" : "warning",
                badge: isOpGood ? "실적 호조" : "수익 주의"
            });
        }

        // 2) 수익성 (ROE & 마진)
        if (roeObj || opmObj) {
            const roeVal = roeObj?.val ?? 0;
            const opmVal = opmObj?.val ?? 0;
            const isHighQuality = roeVal >= 10 || opmVal >= 10;
            points.push({
                category: "수익 효율성",
                title: isHighQuality ? "우수한 자본 효율성 (High ROE)" : "평균 수준의 마진율",
                desc: `자기자본이익률(ROE) ${roeVal.toFixed(1)}% 및 영업이익률 ${opmVal.toFixed(1)}%로, ${isHighQuality ? '투자금 대비 뛰어난 이익 창출 마진을 달성' : '적정 수준의 효율성을 유지'}하고 있습니다.`,
                status: isHighQuality ? "positive" : "neutral",
                badge: roeVal >= 10 ? "ROE 10% 돌파" : "적정 마진"
            });
        }

        // 3) 재무 안정성 (부채비율)
        if (debtObj) {
            const debtVal = debtObj.val;
            const isSafe = debtVal < 100;
            points.push({
                category: "재무 안정성",
                title: isSafe ? "초우량 무차입급 건전성" : "부채 모니터링 필요",
                desc: `부채비율이 ${debtVal.toFixed(1)}%로, 기준선(100%) 대비 ${isSafe ? '매우 낮아 금융 위기나 금리 인상기에도 끄떡없는 초안전 재무구조' : '부채 비중이 다소 있어 이자 부담 점검 필요'}를 갖추고 있습니다.`,
                status: isSafe ? "positive" : "warning",
                badge: isSafe ? "부채 초안전" : "부채 관리"
            });
        }

        // 4) 밸류에이션 총평
        let valTitle = "적정 가치 평가";
        let valDesc = "현재 기업 가치와 이익 수준이 시장에서 균형 있게 평가받고 있습니다.";
        if (pbrObj && pbrObj.val < 1.0) {
            valTitle = "자산가치 대비 저평가 (PBR < 1.0)";
            valDesc = `현재 PBR이 ${pbrObj.val.toFixed(2)}배로 청산 가치보다 주가가 낮게 거래되는 절대적 저평가 매력이 있습니다.`;
        } else if (pbrObj && pbrObj.val >= 2.0) {
            valTitle = "높은 미래 프리미엄 부여";
            valDesc = `PBR ${pbrObj.val.toFixed(2)}배로 시장에서 높은 미래 성장 잠재력을 주가에 선반영하고 있습니다.`;
        }

        return {
            points,
            valTitle,
            valDesc,
            latestRev: revObj ? formatValue(revObj.val, 'number', '억원', currency) : '-',
            latestOp: opObj ? formatValue(opObj.val, 'number', '억원', currency) : '-',
            latestRoe: roeObj ? `${roeObj.val.toFixed(1)}%` : '-',
            latestDebt: debtObj ? `${debtObj.val.toFixed(1)}%` : '-'
        };
    }, [data, dates, currency]);

    if (!data || !firstMetric || !Array.isArray(firstMetric.dates) || firstMetric.dates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 bg-zinc-950/60 rounded-3xl border border-white/5">
                <AlertCircle className="w-8 h-8 text-zinc-500 mb-2" />
                <p className="font-bold text-zinc-300">재무제표 데이터를 불러올 수 없습니다.</p>
                <p className="text-xs text-zinc-500 mt-1">기업별 공시 사정에 따라 차이가 있을 수 있습니다.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
            {/* 1. Header & Easy Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner shrink-0">
                        <BookOpen className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-lg md:text-xl font-black text-white tracking-tight">
                                기업 상세 재무제표 & 실적 인텔리전스
                            </h4>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                DART AUDITED
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium mt-0.5">
                            {currency === 'USD'
                                ? '미국 증권거래위원회(SEC) 공식 10-K/10-Q 공시 데이터 기반'
                                : '금융감독원 전자공시시스템(DART) 공식 감사보고서 데이터 기반 (단위: 억원/원/%)'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        onClick={() => setShowEasyMode(!showEasyMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black border transition-all cursor-pointer shadow-lg ${
                            showEasyMode 
                                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10' 
                                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                    >
                        <Sparkles className={`w-4 h-4 ${showEasyMode ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
                        <span>{showEasyMode ? '💡 초보자 해설 모드 ON' : '💡 초보자 해설 모드 OFF'}</span>
                    </button>
                </div>
            </div>

            {/* 2. [NEW] 초보자를 위한 AI 재무제표 닥터 3줄 핵심 읽기 카드 */}
            {aiSummary && (
                <div className="bg-gradient-to-br from-zinc-950 via-[#0a1128] to-zinc-950 border border-indigo-500/30 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white flex items-center gap-2">
                                    <span>AI 재무 닥터: 초보자를 위한 30초 핵심 진단</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        EASY SUMMARY
                                    </span>
                                </h3>
                                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                                    복잡한 회계 수치를 초보 투자자도 1초 만에 이해할 수 있도록 쉽게 풀어냈습니다.
                                </p>
                            </div>
                        </div>

                        {/* 4대 핵심 요약 배지 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="text-[10px] text-zinc-400 font-bold">최근 매출</div>
                                <div className="text-xs font-black text-white font-mono">{aiSummary.latestRev}</div>
                            </div>
                            <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="text-[10px] text-zinc-400 font-bold">최근 영업익</div>
                                <div className="text-xs font-black text-emerald-400 font-mono">{aiSummary.latestOp}</div>
                            </div>
                            <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="text-[10px] text-zinc-400 font-bold">최근 ROE</div>
                                <div className="text-xs font-black text-purple-300 font-mono">{aiSummary.latestRoe}</div>
                            </div>
                            <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="text-[10px] text-zinc-400 font-bold">부채비율</div>
                                <div className="text-xs font-black text-cyan-300 font-mono">{aiSummary.latestDebt}</div>
                            </div>
                        </div>
                    </div>

                    {/* 3대 핵심 진단 포인트 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                        {aiSummary.points.map((pt, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between group shadow-md">
                                <div>
                                    <div className="flex items-center justify-between text-xs font-black mb-1.5">
                                        <span className="text-zinc-400 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                            {pt.category}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                            pt.status === 'positive' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        }`}>
                                            {pt.badge}
                                        </span>
                                    </div>
                                    <div className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors">
                                        {pt.title}
                                    </div>
                                    <p className="text-xs text-zinc-300 leading-relaxed font-medium mt-1.5">
                                        {pt.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Detailed Financial Tables by Category */}
            {METRIC_GROUPS.map((group) => {
                const groupKeys = group.keys.filter(k => (data as any)[k]);
                if (groupKeys.length === 0) return null;

                return (
                    <div key={group.title} className="bg-zinc-950/90 rounded-3xl border border-white/10 shadow-2xl overflow-hidden group/container">
                        {/* 그룹 타이틀 바 */}
                        <div className="px-5 py-4 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="font-black text-white text-sm md:text-base tracking-tight">{group.title}</span>
                                {showEasyMode && (
                                    <span className="text-xs text-zinc-400 font-medium hidden sm:inline-block">
                                        • {group.description}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">
                                {groupKeys.length} METRICS
                            </span>
                        </div>

                        {/* 고해상도 재무 데이터 테이블 (min-w-[880px] 로 글씨 잘림 방지) */}
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
                            <table className="w-full text-left border-collapse min-w-[880px]">
                                <thead>
                                    {/* 1단 헤더: 연간 vs 분기 뱃지 */}
                                    <tr className="bg-black/60">
                                        <th className="py-2.5 px-4 sticky left-0 bg-[#0d1322] z-20 w-44 border-r border-white/10"></th>
                                        <th colSpan={annualDates.length} className="py-2 px-3 text-[11px] font-black uppercase tracking-wider text-emerald-300 text-center border-b border-emerald-500/30 bg-emerald-950/20">
                                            📊 연간 실적 (Yearly Performance)
                                        </th>
                                        {hasQuarterlyData && (
                                            <th colSpan={quarterlyDates.length} className="py-2 px-3 text-[11px] font-black uppercase tracking-wider text-blue-300 text-center border-b border-blue-500/30 bg-blue-950/20 border-l border-white/15">
                                                ⏰ 분기 실적 (Quarterly Trend)
                                            </th>
                                        )}
                                    </tr>
                                    {/* 2단 헤더: 날짜 */}
                                    <tr className="border-b border-white/10 bg-zinc-950 text-xs">
                                        <th className="py-3 px-4 text-zinc-400 font-black uppercase tracking-wider sticky left-0 bg-[#0d1322] z-20 backdrop-blur-md w-44 border-r border-white/10 whitespace-nowrap">
                                            지표명 (단위)
                                        </th>
                                        {dates.map((date: string, idx: number) => {
                                            const isQDate = isQuarterDate(date);
                                            const isFirstQ = isQDate && !isQuarterDate(dates[idx - 1] || '');
                                            return (
                                                <th 
                                                    key={idx} 
                                                    className={`py-3 px-3 text-center whitespace-nowrap font-black font-mono ${
                                                        isEstimate(date) 
                                                            ? 'text-purple-300 bg-purple-500/10' 
                                                            : isQDate 
                                                                ? 'text-blue-200' 
                                                                : 'text-zinc-200'
                                                    } ${isFirstQ ? 'border-l border-white/15' : ''}`}
                                                >
                                                    {date}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-xs md:text-sm">
                                    {groupKeys.map((key) => {
                                        const config = METRIC_CONFIG[key];
                                        const metric = (data as any)[key];
                                        if (!config || !metric) return null;

                                        return (
                                            <tr
                                                key={key}
                                                className="hover:bg-gradient-to-r hover:from-indigo-500/10 hover:via-purple-500/5 hover:to-transparent transition-colors group cursor-default"
                                                onMouseEnter={() => setHoveredKey(key)}
                                                onMouseLeave={() => setHoveredKey(null)}
                                            >
                                                {/* 좌측 고정 지표명 셀 */}
                                                <td className="py-3.5 px-4 sticky left-0 bg-[#0d1322] group-hover:bg-[#131c33] transition-colors z-10 backdrop-blur-md border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.5)] whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base shrink-0">{config.emoji}</span>
                                                        <div className="truncate">
                                                            <div className="text-xs md:text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1">
                                                                <span>{config.label}</span>
                                                                {showEasyMode && (
                                                                    <HelpCircle className="w-3 h-3 text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0" />
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-400 font-bold uppercase">{config.unit}</div>
                                                        </div>
                                                    </div>

                                                    {/* 쉬운 설명 팝오버 툴팁 */}
                                                    {showEasyMode && hoveredKey === key && (
                                                        <div className="absolute left-48 top-1 z-50 w-64 bg-zinc-950/95 border border-amber-500/40 rounded-2xl p-4 shadow-2xl text-xs text-zinc-200 leading-relaxed pointer-events-none backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="text-amber-300 font-black flex items-center gap-1.5 mb-1 text-xs">
                                                                <Sparkles className="w-3.5 h-3.5" />
                                                                <span>{config.label}이란?</span>
                                                            </div>
                                                            <p className="text-zinc-300 font-medium mb-2">{config.description}</p>
                                                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 font-semibold">
                                                                💡 <span className="font-bold">초보자 팁:</span> {config.beginnerNote}
                                                            </div>
                                                            {config.goodBenchmark && (
                                                                <div className="mt-2 text-[10px] text-zinc-400 flex items-center justify-between border-t border-white/10 pt-1.5">
                                                                    <span>우수 기준</span>
                                                                    <span className="font-bold text-emerald-400">{config.goodBenchmark}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* 날짜별 값들 */}
                                                {metric.values.map((val: any, idx: number) => {
                                                    const isQuarter = isQuarterDate(dates[idx] || '');
                                                    const isFirstQ = isQuarter && !isQuarterDate(dates[idx - 1] || '');
                                                    const trend = getTrend(metric.values, idx);
                                                    const colorClass = val !== null
                                                        ? getColorClass(val, config.higherIsBetter, val === 0)
                                                        : '';

                                                    return (
                                                        <td 
                                                            key={idx} 
                                                            className={`py-3.5 px-3.5 text-center whitespace-nowrap transition-colors min-w-[85px] ${
                                                                isEstimate(dates[idx]) 
                                                                    ? 'bg-purple-500/5' 
                                                                    : isQuarter 
                                                                        ? 'bg-blue-500/[0.03]' 
                                                                        : 'bg-emerald-500/[0.02]'
                                                            } ${isFirstQ ? 'border-l border-white/15' : ''}`}
                                                        >
                                                            {val === null ? (
                                                                <span className="text-zinc-700 text-xs font-bold">-</span>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className={`tracking-tight ${colorClass}`}>
                                                                        {formatValue(val, config.format, config.unit, currency)}
                                                                    </span>
                                                                    {/* 전기 대비 추세 화살표 */}
                                                                    {trend !== 'none' && showEasyMode && (
                                                                        <span className={`text-[10px] font-black ${
                                                                            trend === 'up'
                                                                                ? config.higherIsBetter ? 'text-emerald-400' : 'text-rose-400'
                                                                                : trend === 'down'
                                                                                    ? config.higherIsBetter ? 'text-rose-400' : 'text-emerald-400'
                                                                                    : 'text-zinc-500'
                                                                        }`}>
                                                                            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '─'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {/* 4. 하단 범례 & 가이드 */}
            <div className="p-4 bg-zinc-950/80 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 shadow-inner">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-400" />
                        <span>색상 및 기호 안내:</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold"><span className="text-base">■</span> 실적 호조 / 개선</span>
                    <span className="flex items-center gap-1 text-rose-400 font-bold"><span className="text-base">■</span> 실적 둔화 / 악화</span>
                    <span className="flex items-center gap-1 text-purple-400 font-bold"><span className="text-base">■</span> 증권가 컨센서스 예상치(E)</span>
                    <span className="flex items-center gap-1 text-zinc-300">▲▼ 전기 대비 변동</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-medium">
                    데이터 출처: DART 공식 전자공시 / KRX
                </div>
            </div>
        </div>
    );
}
