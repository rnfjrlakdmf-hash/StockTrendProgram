'use client';

import React, { useState, useMemo } from 'react';
import { 
    Sparkles, HelpCircle, TrendingUp, TrendingDown, ShieldCheck, 
    DollarSign, Activity, AlertCircle, Award, CheckCircle2, ChevronRight,
    BarChart3, PieChart, Info, BookOpen, Layers, Check, ArrowUpRight, ArrowDownRight, Eye
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
    category: string;
}> = {
    revenue: { 
        label: "매출액", 
        unit: "억원", 
        emoji: "💰", 
        description: "회사가 제품이나 서비스를 판매하여 벌어들인 총 수입입니다.", 
        beginnerNote: "회사의 덩치와 사업 규모가 얼마나 커지고 있는지 보여주는 가장 기본적인 체력 지표입니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "매년 우상향 지속",
        category: "실적 지표"
    },
    operating_income: { 
        label: "영업이익", 
        unit: "억원", 
        emoji: "📈", 
        description: "순수 본업을 통해 벌어들인 실제 알짜 사업 이익 (매출 - 매출원가 - 판관비)입니다.", 
        beginnerNote: "원가와 인건비를 빼고 진짜 장사로 남긴 돈으로, 기업 가치 평가에서 가장 중요합니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "흑자 유지 및 두 자릿수 성장",
        category: "실적 지표"
    },
    net_income: { 
        label: "당기순이익", 
        unit: "억원", 
        emoji: "🏦", 
        description: "세금과 금융이자, 일회성 손익을 모두 제하고 최종 통장에 남은 순이익입니다.", 
        beginnerNote: "모든 비용을 치르고 주주들의 몫으로 남는 최종 이익입니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "안정적 흑자 유지",
        category: "실적 지표"
    },
    operating_margin: { 
        label: "영업이익률", 
        unit: "%", 
        emoji: "📊", 
        description: "매출 100원을 올렸을 때 영업이익으로 몇 원을 남겼는지 나타내는 수익성 비율입니다.", 
        beginnerNote: "10% 이상이면 제품 경쟁력과 시장 지배력이 매우 뛰어난 고마진 기업입니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "10% 이상 우수",
        category: "수익성 지표"
    },
    net_income_margin: { 
        label: "순이익률", 
        unit: "%", 
        emoji: "✅", 
        description: "매출액 대비 최종 순이익이 차지하는 백분율입니다.", 
        beginnerNote: "회사의 최종 알짜 마진율을 나타냅니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "5~10% 이상 양호",
        category: "수익성 지표"
    },
    roe: { 
        label: "ROE (자기자본이익률)", 
        unit: "%", 
        emoji: "💡", 
        description: "주주들이 맡긴 내 돈(자기자본)을 굴려 1년간 몇 %의 수익을 냈는지 나타내는 핵심 지표입니다.", 
        beginnerNote: "워런 버핏이 가장 중시하는 지표로, 10~15% 이상이면 자본을 놀리지 않고 초우량하게 굴리는 기업입니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "10% 이상 특급",
        category: "수익성 지표"
    },
    debt_ratio: { 
        label: "부채비율", 
        unit: "%", 
        emoji: "🛡️", 
        description: "회사 자기자본 대비 빚(부채)이 얼마나 많은지 나타내는 재무 건전성 지표입니다.", 
        beginnerNote: "100% 미만이면 빚이 거의 없어 경제 위기나 금리 인상기에도 망하지 않는 안전한 회사입니다.",
        higherIsBetter: false, 
        format: 'percent',
        goodBenchmark: "100% 이하 초안전",
        category: "재무 안정성"
    },
    quick_ratio: { 
        label: "당좌비율", 
        unit: "%", 
        emoji: "⚡", 
        description: "채권자가 당장 돈을 갚으라 할 때 즉시 현금화하여 갚을 수 있는 자산 비율입니다.", 
        beginnerNote: "100% 이상이면 단기 자금 압박이나 흑자 도산 위험이 전혀 없는 회사입니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "100% 이상 든든",
        category: "재무 안정성"
    },
    reserve_ratio: { 
        label: "유보율", 
        unit: "%", 
        emoji: "🏗️", 
        description: "회사가 번 돈을 사외로 유출하지 않고 비상금으로 사내에 쌓아둔 잉여금 비율입니다.", 
        beginnerNote: "높을수록 현금 곳간이 든든해 신사업 투자 여력이 크고 무상증자 가능성이 높습니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "1000% 이상 초우량",
        category: "재무 안정성"
    },
    eps: { 
        label: "EPS (주당순이익)", 
        unit: "원", 
        emoji: "🔢", 
        description: "주식 1주가 1년 동안 얼마의 순이익을 벌어다 주었는지 나타내는 금액입니다.", 
        beginnerNote: "주식 1장의 순수한 이익 가치로, EPS가 매년 늘어나는 주식이 최고의 주도주입니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "매년 우상향 우수",
        category: "밸류에이션"
    },
    per: { 
        label: "PER (주가수익비율)", 
        unit: "배", 
        emoji: "💹", 
        description: "현재 주가가 1주당 순이익(EPS)의 몇 배 수준으로 거래되는지 나타내는 배수입니다.", 
        beginnerNote: "회사가 번 돈으로 투자 원금을 회수하는 데 걸리는 연수입니다. 낮을수록 저평가!",
        higherIsBetter: false, 
        format: 'ratio',
        goodBenchmark: "10~15배 적정 수준",
        category: "밸류에이션"
    },
    pbr: { 
        label: "PBR (주가순자산비율)", 
        unit: "배", 
        emoji: "📉", 
        description: "기업이 당장 청산했을 때의 순자산 가치 대비 현재 주가의 비율입니다.", 
        beginnerNote: "1배 미만이면 회사를 다 청산해도 주가보다 재산이 많은 절대적 저평가 상태입니다.",
        higherIsBetter: false, 
        format: 'ratio',
        goodBenchmark: "1.0배 이하 저평가",
        category: "밸류에이션"
    },
    bps: { 
        label: "BPS (주당순자산)", 
        unit: "원", 
        emoji: "🏛️", 
        description: "기업 청산 시 주식 1주당 주주에게 돌아갈 순자산(자본) 가치입니다.", 
        beginnerNote: "주가가 폭락할 때 가장 든든한 바닥 지지선 역할을 합니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "지속 증가 우수",
        category: "밸류에이션"
    },
    dps: { 
        label: "주당배당금 (DPS)", 
        unit: "원", 
        emoji: "🎁", 
        description: "주식 1주를 보유했을 때 주주 통장으로 입금되는 연간 현금 배당금입니다.", 
        beginnerNote: "주가 변동과 상관없이 직접 지급받는 현금 보상입니다.",
        higherIsBetter: true, 
        format: 'number',
        goodBenchmark: "배당 지속 성장",
        category: "배당 & 주주환원"
    },
    dividend_yield: { 
        label: "배당수익률", 
        unit: "%", 
        emoji: "💸", 
        description: "현재 주가 대비 1년간 받는 배당금의 연간 이자율 같은 백분율입니다.", 
        beginnerNote: "은행 정기예금 금리보다 높으면 매력적인 현금 파이프라인이 됩니다.",
        higherIsBetter: true, 
        format: 'percent',
        goodBenchmark: "3~5% 이상 고배당",
        category: "배당 & 주주환원"
    },
    payout_ratio: { 
        label: "배당성향", 
        unit: "%", 
        emoji: "🤝", 
        description: "회사가 1년간 번 순이익 중 주주들에게 배당으로 나눠준 금액의 비율입니다.", 
        beginnerNote: "20~40% 수준이면 미래 투자와 주주환원의 균형이 가장 잘 맞습니다.",
        higherIsBetter: false, 
        format: 'percent',
        goodBenchmark: "20~40% 적정 균형",
        category: "배당 & 주주환원"
    },
};

const CATEGORIES = [
    { id: 'all', title: "전체 통합 보기", icon: Layers, keys: [] },
    { id: 'perf', title: "📈 실적 지표", icon: TrendingUp, keys: ["revenue", "operating_income", "net_income"] },
    { id: 'profit', title: "💰 수익성 & 마진", icon: PieChart, keys: ["operating_margin", "net_income_margin", "roe"] },
    { id: 'health', title: "🛡️ 재무 안정성", icon: ShieldCheck, keys: ["debt_ratio", "quick_ratio", "reserve_ratio"] },
    { id: 'val', title: "📊 밸류에이션", icon: BarChart3, keys: ["eps", "per", "pbr", "bps"] },
    { id: 'div', title: "🎁 배당 & 주주환원", icon: Award, keys: ["dps", "dividend_yield", "payout_ratio"] },
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
        return `${Math.round(num).toLocaleString()}원`;
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
        if (val > 0) return 'text-emerald-400 font-extrabold';
        if (val < 0) return 'text-rose-400 font-extrabold';
        return 'text-zinc-300';
    } else {
        return 'text-zinc-100 font-bold';
    }
}

export default function FinancialsTable({ data: rawData, currency }: FinancialsTableProps) {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [selectedMetricKey, setSelectedMetricKey] = useState<string>('revenue');

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

    // AI 초보자 3줄 핵심 진단 리포트 생성
    const aiSummary = useMemo(() => {
        if (!data) return null;
        
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

        const points = [];

        // 1) 성장성 & 매출
        if (revObj && opObj) {
            const revFmt = formatValue(revObj.val, 'number', '억원', currency);
            const opFmt = formatValue(opObj.val, 'number', '억원', currency);
            const isOpGood = opObj.val > 0;
            points.push({
                category: "성장 & 실적",
                title: isOpGood ? "견고한 실적 창출력" : "수익성 개선 추진",
                desc: `최근 실적 기준 매출액 ${revFmt}, 영업이익 ${opFmt}을 기록하며 본업에서 ${isOpGood ? '안정적인 흑자 구조' : '실적 턴어라운드 흐름'}를 나타내고 있습니다.`,
                status: isOpGood ? "positive" : "warning",
                badge: isOpGood ? "실적 호조" : "수익 주의"
            });
        }

        // 2) 수익 효율성 (ROE)
        if (roeObj || opmObj) {
            const roeVal = roeObj?.val ?? 0;
            const opmVal = opmObj?.val ?? 0;
            const isHighQuality = roeVal >= 10 || opmVal >= 10;
            points.push({
                category: "수익 효율성",
                title: isHighQuality ? "우수한 자본 효율성 (High ROE)" : "적정 수익성 유지",
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
                title: isSafe ? "초우량 무차입급 건전성" : "부채 관리 모니터링",
                desc: `부채비율이 ${debtVal.toFixed(1)}%로, 기준선(100%) 대비 ${isSafe ? '매우 낮아 금융 위기나 불황에도 망하지 않는 안전한 재무구조' : '부채 비중이 다소 있어 이자 부담 점검 필요'}를 갖추고 있습니다.`,
                status: isSafe ? "positive" : "warning",
                badge: isSafe ? "부채 초안전" : "부채 관리"
            });
        }

        return {
            points,
            latestRev: revObj ? formatValue(revObj.val, 'number', '억원', currency) : '-',
            latestOp: opObj ? formatValue(opObj.val, 'number', '억원', currency) : '-',
            latestRoe: roeObj ? `${roeObj.val.toFixed(1)}%` : '-',
            latestDebt: debtObj ? `${debtObj.val.toFixed(1)}%` : '-'
        };
    }, [data, dates, currency]);

    // 필터링할 메트릭 그룹 구성
    const displayedGroups = useMemo(() => {
        if (!data) return [];
        const groups = [
            { title: "📈 실적 지표", desc: "매출액 및 본업의 영업이익 흐름", keys: ["revenue", "operating_income", "net_income"] },
            { title: "💰 수익성 & 마진", desc: "영업이익률 및 주주 자본 효율성(ROE)", keys: ["operating_margin", "net_income_margin", "roe"] },
            { title: "🛡️ 재무 안정성", desc: "부채비율 및 현금 유보 건전성", keys: ["debt_ratio", "quick_ratio", "reserve_ratio"] },
            { title: "📊 밸류에이션 (주가 지표)", desc: "기업 가치 대비 주가 적정성 (PER/PBR)", keys: ["eps", "per", "pbr", "bps"] },
            { title: "🎁 배당 & 주주환원", desc: "주주에게 나눠주는 현금 배당금", keys: ["dps", "dividend_yield", "payout_ratio"] },
        ];

        if (activeCategory === 'all') {
            return groups.filter(g => g.keys.some(k => (data as any)[k]));
        }
        const selected = CATEGORIES.find(c => c.id === activeCategory);
        if (!selected) return groups;
        return groups
            .filter(g => g.keys.some(k => selected.keys.includes(k) && (data as any)[k]))
            .map(g => ({
                ...g,
                keys: g.keys.filter(k => selected.keys.includes(k) && (data as any)[k])
            }));
    }, [data, activeCategory]);

    const activeMetricConfig = METRIC_CONFIG[selectedMetricKey] || METRIC_CONFIG['revenue'];

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
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6 pt-1">
            {/* 1. Header & Title Ribbon */}
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
                                ? '미국 SEC 공식 공시 데이터 기반 (글로벌 스탠다드)'
                                : '금융감독원 DART 공식 감사보고서 데이터 기반 (단위: 억원/원/%)'}
                        </p>
                    </div>
                </div>

                {/* 4대 퀵 요약 미니 배지 */}
                {aiSummary && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-center shadow-inner">
                            <div className="text-[9px] text-zinc-400 font-bold uppercase">최근 매출</div>
                            <div className="text-xs font-black text-white font-mono">{aiSummary.latestRev}</div>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-center shadow-inner">
                            <div className="text-[9px] text-zinc-400 font-bold uppercase">최근 영업익</div>
                            <div className="text-xs font-black text-emerald-400 font-mono">{aiSummary.latestOp}</div>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-center shadow-inner">
                            <div className="text-[9px] text-zinc-400 font-bold uppercase">최근 ROE</div>
                            <div className="text-xs font-black text-purple-300 font-mono">{aiSummary.latestRoe}</div>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-center shadow-inner">
                            <div className="text-[9px] text-zinc-400 font-bold uppercase">부채비율</div>
                            <div className="text-xs font-black text-cyan-300 font-mono">{aiSummary.latestDebt}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. 초보자를 위한 AI 재무 닥터 3줄 요약 카드 */}
            {aiSummary && (
                <div className="bg-gradient-to-br from-zinc-950 via-[#0c142e] to-zinc-950 border border-indigo-500/30 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 relative overflow-hidden">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                <span>AI 재무 닥터: 초보자를 위한 30초 핵심 진단</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    3-POINT SUMMARY
                                </span>
                            </h3>
                            <p className="text-xs text-zinc-400 font-medium mt-0.5">
                                복잡한 회계 수치를 초보 투자자도 1초 만에 이해할 수 있도록 쉽게 풀어냈습니다.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                        {aiSummary.points.map((pt, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between shadow-lg">
                                <div>
                                    <div className="flex items-center justify-between text-xs font-black mb-1.5">
                                        <span className="text-zinc-300 flex items-center gap-1.5 font-bold">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                            {pt.category}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                            pt.status === 'positive' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        }`}>
                                            {pt.badge}
                                        </span>
                                    </div>
                                    <div className="font-extrabold text-sm text-white">
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

            {/* 3. [NEW & EXCLUSIVE] 선택 지표 인터랙티브 인텔리전스 가이드 바 (Glitch-Free Solid Info Bar) */}
            {activeMetricConfig && (
                <div className="p-4.5 rounded-2xl bg-zinc-950 border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
                    <div className="flex items-start md:items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xl shrink-0">
                            {activeMetricConfig.emoji}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm md:text-base font-black text-white">
                                    {activeMetricConfig.label} ({activeMetricConfig.unit})
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
                                    {activeMetricConfig.category}
                                </span>
                                {activeMetricConfig.goodBenchmark && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> 우수 기준: {activeMetricConfig.goodBenchmark}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-300 font-medium mt-1">
                                {activeMetricConfig.description}
                            </p>
                            <p className="text-xs text-amber-200 font-semibold mt-1 flex items-center gap-1">
                                <span>💡 <span className="underline decoration-amber-400/50">초보자 실전 팁</span>:</span>
                                <span>{activeMetricConfig.beginnerNote}</span>
                            </p>
                        </div>
                    </div>

                    <div className="text-[11px] text-zinc-500 font-medium shrink-0 flex items-center gap-1 self-end md:self-center bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>아래 표에서 원하는 지표를 클릭하면 실시간 해설이 바뀝니다.</span>
                    </div>
                </div>
            )}

            {/* 4. 카테고리 필터 탭 바 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                                isActive 
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'bg-zinc-950 border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{cat.title}</span>
                        </button>
                    );
                })}
            </div>

            {/* 5. [UNIFIED MASTER TABLE] 원스톱 단일 통합 재무제표 마스터 테이블 */}
            <div className="bg-zinc-950/95 border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                            {/* 1단 헤더: 연간 vs 분기 뱃지 */}
                            <tr className="bg-[#0b1020] border-b border-white/10">
                                <th className="py-3 px-4 sticky left-0 bg-[#0b1020] z-30 w-48 border-r border-white/15">
                                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">주요 재무 지표</span>
                                </th>
                                <th colSpan={annualDates.length} className="py-2.5 px-3 text-xs font-black uppercase tracking-wider text-emerald-300 text-center border-b border-emerald-500/40 bg-emerald-950/30">
                                    📊 연간 실적 (Yearly Performance)
                                </th>
                                {hasQuarterlyData && (
                                    <th colSpan={quarterlyDates.length} className="py-2.5 px-3 text-xs font-black uppercase tracking-wider text-blue-300 text-center border-b border-blue-500/40 bg-blue-950/30 border-l border-white/15">
                                        ⏰ 분기 실적 (Quarterly Trend)
                                    </th>
                                )}
                            </tr>
                            {/* 2단 헤더: 날짜 */}
                            <tr className="border-b-2 border-indigo-500/30 bg-[#0e162e] text-xs">
                                <th className="py-3 px-4 text-zinc-300 font-extrabold uppercase tracking-wider sticky left-0 bg-[#0e162e] z-30 backdrop-blur-md w-48 border-r border-white/15 whitespace-nowrap">
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
                                                    ? 'text-purple-300 bg-purple-500/15' 
                                                    : isQDate 
                                                        ? 'text-blue-200' 
                                                        : 'text-zinc-100'
                                            } ${isFirstQ ? 'border-l border-white/20' : ''}`}
                                        >
                                            {date}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5 font-mono text-xs md:text-sm">
                            {displayedGroups.map((group, gIdx) => (
                                <React.Fragment key={group.title}>
                                    {/* 카테고리 구분 섹션 바 */}
                                    <tr className="bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border-t-2 border-b border-white/10">
                                        <td colSpan={dates.length + 1} className="py-2.5 px-4 font-black text-xs text-indigo-300 uppercase tracking-wider sticky left-0 z-20">
                                            <div className="flex items-center gap-2">
                                                <span>{group.title}</span>
                                                <span className="text-[10px] text-zinc-400 font-normal">({group.desc})</span>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* 카테고리 내 지표 행들 */}
                                    {group.keys.map((key) => {
                                        const config = METRIC_CONFIG[key];
                                        const metric = (data as any)[key];
                                        if (!config || !metric) return null;
                                        const isSelected = selectedMetricKey === key;

                                        return (
                                            <tr
                                                key={key}
                                                onClick={() => setSelectedMetricKey(key)}
                                                className={`transition-colors cursor-pointer group whitespace-nowrap ${
                                                    isSelected 
                                                        ? 'bg-indigo-500/20' 
                                                        : 'hover:bg-gradient-to-r hover:from-indigo-500/15 hover:via-purple-500/10 hover:to-transparent'
                                                }`}
                                            >
                                                {/* 좌측 고정 지표명 셀 */}
                                                <td className={`py-3.5 px-4 sticky left-0 z-20 backdrop-blur-md border-r border-white/15 shadow-[4px_0_12px_rgba(0,0,0,0.5)] whitespace-nowrap transition-colors ${
                                                    isSelected ? 'bg-[#152040]' : 'bg-[#0d1322] group-hover:bg-[#131c33]'
                                                }`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base shrink-0">{config.emoji}</span>
                                                        <div className="truncate">
                                                            <div className={`text-xs md:text-sm font-black transition-colors flex items-center gap-1.5 ${
                                                                isSelected ? 'text-amber-300' : 'text-white group-hover:text-amber-300'
                                                            }`}>
                                                                <span>{config.label}</span>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-zinc-400 uppercase">
                                                                    {config.unit}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
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
                                                            className={`py-3.5 px-3.5 text-center whitespace-nowrap transition-colors min-w-[90px] ${
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
                                                                    {trend !== 'none' && (
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
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 6. 하단 범례 & 데이터 공시 출처 */}
            <div className="p-4 bg-zinc-950/90 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 shadow-inner">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-zinc-200 font-black flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-indigo-400" />
                        <span>색상 및 기호 안내:</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-extrabold"><span className="text-base">■</span> 실적 호조 / 개선</span>
                    <span className="flex items-center gap-1 text-rose-400 font-extrabold"><span className="text-base">■</span> 실적 둔화 / 악화</span>
                    <span className="flex items-center gap-1 text-purple-400 font-extrabold"><span className="text-base">■</span> 증권가 컨센서스 예상치(E)</span>
                    <span className="flex items-center gap-1 text-zinc-300 font-bold">▲▼ 전기 대비 변동</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                    데이터 출처: DART 공식 전자공시 / KRX
                </div>
            </div>
        </div>
    );
}
