'use client';

import React, { useState, useMemo } from 'react';
import { 
    Sparkles, HelpCircle, TrendingUp, TrendingDown, ShieldCheck, 
    DollarSign, Activity, AlertCircle, Award, CheckCircle2, ChevronRight,
    BarChart3, PieChart, Info, BookOpen, Layers, Check, ArrowUpRight, ArrowDownRight, Eye,
    Gift, Coins, Percent, Calendar
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
        description: "순수 본업을 통해 벌어들인 실제 알짜 사업 이익 (매출 - 원가 - 판관비)입니다.", 
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
        category: "수익성 & 마진"
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
        category: "수익성 & 마진"
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
        category: "수익성 & 마진"
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
        if (val > 0) return 'text-emerald-400 font-black';
        if (val < 0) return 'text-rose-400 font-black';
        return 'text-zinc-200 font-bold';
    } else {
        return 'text-zinc-100 font-black';
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

    // 배당 요약 정보 추출 (Summary dvr 및 추가 배당 메타데이터)
    const dividendSummary = useMemo(() => {
        if (!rawData) return null;
        let dvr = rawData.dvr || rawData.dividend_yield || rawData.detailed?.summary?.dvr || null;
        let dps = rawData.dps || rawData.detailed?.summary?.dps || null;
        
        let dvrNum = null;
        if (typeof dvr === 'string') {
            const cleaned = parseFloat(dvr.replace(/%/g, ''));
            if (!isNaN(cleaned)) dvrNum = cleaned;
        } else if (typeof dvr === 'number') {
            dvrNum = dvr;
        }

        return {
            dvrRaw: dvr,
            dvrNum,
            dps,
            hasDividend: dvrNum !== null && dvrNum > 0
        };
    }, [rawData]);

    // AI 초보자 3줄 핵심 진단 리포트 생성 (가독성 & 단어 끊김 방지 최적화)
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
                desc: `최근 실적 기준 매출액 ${revFmt}, 영업이익 ${opFmt}을 기록하며 본업에서 ${isOpGood ? '안정적인 흑자 구조를 입증' : '실적 턴어라운드를 추진'}하고 있습니다.`,
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
                title: isHighQuality ? "우수한 자본 효율성 (ROE)" : "적정 수익성 유지",
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
                desc: `부채비율이 ${debtVal.toFixed(1)}%로, 기준선(100%) 대비 ${isSafe ? '매우 낮아 금융 위기나 불황에도 안전한 재무구조를 유지' : '부채 비중이 다소 있어 이자 부담 점검 필요'}하고 있습니다.`,
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
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 bg-zinc-950/60 rounded-3xl border border-white/5">
                <AlertCircle className="w-10 h-10 text-zinc-500 mb-3" />
                <p className="font-black text-base text-zinc-200">재무제표 데이터를 불러올 수 없습니다.</p>
                <p className="text-xs text-zinc-500 mt-1.5">기업별 공시 사정에 따라 차이가 있을 수 있습니다.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6 pt-1 w-full max-w-full">
            {/* 1. Header & Title Ribbon */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner shrink-0">
                        <BookOpen className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h4 className="text-lg md:text-xl font-black text-white tracking-tight">
                                기업 상세 재무제표 & 실적 인텔리전스
                            </h4>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                DART AUDITED
                            </span>
                        </div>
                        <p className="text-xs md:text-sm text-zinc-400 font-medium mt-1 break-keep">
                            {currency === 'USD'
                                ? '미국 SEC 공식 공시 데이터 기반 (글로벌 스탠다드)'
                                : '금융감독원 DART 공식 감사보고서 데이터 기반 (단위: 억원/원/%)'}
                        </p>
                    </div>
                </div>

                {/* 4대 퀵 요약 미니 배지 (모바일 2x2 그리드, PC 4열) */}
                {aiSummary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <div className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-zinc-950 border border-white/10 text-center shadow-inner">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">최근 매출</div>
                            <div className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">{aiSummary.latestRev}</div>
                        </div>
                        <div className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-zinc-950 border border-white/10 text-center shadow-inner">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">최근 영업익</div>
                            <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">{aiSummary.latestOp}</div>
                        </div>
                        <div className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-zinc-950 border border-white/10 text-center shadow-inner">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">최근 ROE</div>
                            <div className="text-xs sm:text-sm font-black text-purple-300 font-mono mt-0.5">{aiSummary.latestRoe}</div>
                        </div>
                        <div className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-zinc-950 border border-white/10 text-center shadow-inner">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">부채비율</div>
                            <div className="text-xs sm:text-sm font-black text-cyan-300 font-mono mt-0.5">{aiSummary.latestDebt}</div>
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
                            <p className="text-xs text-zinc-400 font-medium mt-0.5 break-keep">
                                복잡한 회계 수치를 초보 투자자도 1초 만에 이해할 수 있도록 쉽게 풀어냈습니다.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                        {aiSummary.points.map((pt, i) => (
                            <div key={i} className="p-5 rounded-2xl bg-zinc-900/95 border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between shadow-lg space-y-2.5 min-h-[150px]">
                                <div>
                                    <div className="flex items-center justify-between text-xs font-black mb-2.5">
                                        <span className="text-zinc-200 flex items-center gap-1.5 font-bold">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                            {pt.category}
                                        </span>
                                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border ${
                                            pt.status === 'positive' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        }`}>
                                            {pt.badge}
                                        </span>
                                    </div>
                                    <div className="font-black text-base text-white break-keep tracking-tight">
                                        {pt.title}
                                    </div>
                                    <p className="text-xs md:text-sm text-zinc-300 leading-relaxed font-medium mt-2 break-keep">
                                        {pt.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. 선택 지표 인터랙티브 인텔리전스 가이드 바 */}
            {activeMetricConfig && (
                <div className="p-5 rounded-3xl bg-zinc-950 border border-amber-500/35 shadow-2xl space-y-3.5 relative overflow-hidden animate-in fade-in duration-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-2xl flex items-center justify-center shrink-0">
                                {activeMetricConfig.emoji}
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="text-base md:text-lg font-black text-white">
                                        {activeMetricConfig.label}
                                    </span>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-zinc-300">
                                        단위: {activeMetricConfig.unit}
                                    </span>
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        {activeMetricConfig.category}
                                    </span>
                                </div>
                                <p className="text-xs md:text-sm text-zinc-300 font-medium mt-1 break-keep leading-relaxed">
                                    {activeMetricConfig.description}
                                </p>
                            </div>
                        </div>

                        {activeMetricConfig.goodBenchmark && (
                            <div className="shrink-0 self-start md:self-center">
                                <span className="text-xs md:text-sm font-black px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>우수 기준: {activeMetricConfig.goodBenchmark}</span>
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs md:text-sm text-amber-200">
                        <span className="font-black text-amber-400 shrink-0 mt-0.5 whitespace-nowrap">💡 초보자 실전 팁:</span>
                        <span className="font-semibold leading-relaxed text-zinc-200 break-keep">{activeMetricConfig.beginnerNote}</span>
                    </div>
                </div>
            )}

            {/* 4. 카테고리 필터 탭 바 (모바일 가로 스크롤, PC wrap) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap">
                {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                if (cat.id === 'div') setSelectedMetricKey('dividend_yield');
                                else if (cat.keys.length > 0) setSelectedMetricKey(cat.keys[0]);
                            }}
                            className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                                isActive 
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30' 
                                    : 'bg-zinc-950 border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{cat.title}</span>
                        </button>
                    );
                })}
            </div>

            {/* 5. [UNIFIED MASTER TABLE OR SPECIALIZED DIVIDEND CARD] */}
            {activeCategory === 'div' && displayedGroups.length === 0 ? (
                /* 배당 시계열 데이터가 없거나 결산 배당 단독 공시인 경우의 전용 럭셔리 배당 카드 */
                <div className="bg-gradient-to-br from-zinc-950 via-[#120e28] to-zinc-950 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-2xl shadow-inner">
                                🎁
                            </div>
                            <div>
                                <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                                    <span>기업 배당 & 주주환원 인텔리전스</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                                        SHAREHOLDER RETURN
                                    </span>
                                </h3>
                                <p className="text-xs md:text-sm text-zinc-400 font-medium mt-1 break-keep">
                                    정기 결산 배당 및 주주환원 정책을 분석하여 제공합니다.
                                </p>
                            </div>
                        </div>

                        {dividendSummary?.hasDividend ? (
                            <span className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs md:text-sm font-black flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>배당 지급 기업 (배당주)</span>
                            </span>
                        ) : (
                            <span className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs md:text-sm font-black flex items-center gap-2">
                                <Info className="w-4 h-4 text-amber-400" />
                                <span>무배당 / R&D 재투자 성장주</span>
                            </span>
                        )}
                    </div>

                    {/* 배당 핵심 KPI 그리드 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-purple-300 mb-1">
                                <span className="flex items-center gap-2">
                                    <Percent className="w-4 h-4 text-purple-400" />
                                    <span>최근 배당수익률</span>
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">DIVIDEND YIELD</span>
                            </div>
                            <div className="text-2xl font-black font-mono text-white mt-1">
                                {dividendSummary?.dvrRaw || (dividendSummary?.dvrNum !== null ? `${dividendSummary?.dvrNum}%` : '0.00%')}
                            </div>
                            <p className="text-xs md:text-sm text-zinc-400 mt-2 font-medium break-keep leading-relaxed">
                                현재 주가 대비 1년간 받는 현금 배당금의 연간 수익률입니다.
                            </p>
                        </div>

                        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-emerald-300 mb-1">
                                <span className="flex items-center gap-2">
                                    <Coins className="w-4 h-4 text-emerald-400" />
                                    <span>주당 배당금 (DPS)</span>
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">CASH DPS</span>
                            </div>
                            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                                {dividendSummary?.dps ? `${Math.round(dividendSummary.dps).toLocaleString()}원` : '정기 결산 배당'}
                            </div>
                            <p className="text-xs md:text-sm text-zinc-400 mt-2 font-medium break-keep leading-relaxed">
                                주식 1주당 실제 통장으로 입금되는 현금 배당금입니다.
                            </p>
                        </div>

                        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-amber-300 mb-1">
                                <span className="flex items-center gap-2">
                                    <Award className="w-4 h-4 text-amber-400" />
                                    <span>주주환원 정책 진단</span>
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">POLICY</span>
                            </div>
                            <div className="text-base md:text-lg font-black text-white mt-1 break-keep">
                                {dividendSummary?.hasDividend ? '안정적 주주 배당 지속' : '신사업 재투자형 성장 모델'}
                            </div>
                            <p className="text-xs md:text-sm text-zinc-400 mt-2 font-medium break-keep leading-relaxed">
                                {dividendSummary?.hasDividend 
                                    ? '벌어들인 이익의 일부를 현금 배당하여 주주에게 안정적으로 환원하고 있습니다.'
                                    : '배당 대신 미래 성장동력 확보를 위한 연구개발(R&D)에 집중하고 있습니다.'}
                            </p>
                        </div>
                    </div>

                    {/* 초보자를 위한 배당 투자 핵심 팁 */}
                    <div className="p-4.5 rounded-2xl bg-purple-950/30 border border-purple-500/25 space-y-2">
                        <div className="flex items-center gap-2 text-xs md:text-sm font-black text-purple-300">
                            <Sparkles className="w-4 h-4" />
                            <span>💡 초보자를 위한 배당 투자 꿀팁:</span>
                        </div>
                        <ul className="text-xs md:text-sm text-zinc-300 space-y-2 list-disc list-inside font-medium leading-relaxed break-keep">
                            <li><strong className="text-white">배당락일 주의:</strong> 배당을 받으려면 배당기준일 2영업일 전까지 주식을 매수해야 합니다.</li>
                            <li><strong className="text-white">배당소득세:</strong> 배당금 입금 시 15.4%(소득세 14% + 지방소득세 1.4%)가 원천징수됩니다.</li>
                            <li><strong className="text-white">배당 재투자:</strong> 지급받은 배당금으로 주식을 다시 매수하면 복리 효과를 극대화할 수 있습니다.</li>
                        </ul>
                    </div>
                </div>
            ) : (
                /* 전폭 마스터 테이블 (모바일 터치 최적화 & 가로 스크롤 안내 배너) */
                <div className="space-y-2 w-full">
                    {/* 모바일 전용 가로 스크롤 안내 가이드 */}
                    <div className="flex sm:hidden items-center justify-between px-3 py-2 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 font-bold shadow-md">
                        <span className="flex items-center gap-1.5">
                            <span>📱</span>
                            <span>표를 좌우로 밀어서 8개 실적 전체 확인</span>
                        </span>
                        <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-black animate-pulse">
                            좌우 스크롤 ➔
                        </span>
                    </div>

                    <div className="bg-zinc-950/95 border border-white/15 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl w-full">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 w-full">
                            <table className="w-full text-left border-collapse min-w-[620px] sm:min-w-[740px] md:min-w-full">
                                <thead>
                                    <tr className="bg-[#0b1020] border-b border-white/10">
                                        <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 md:px-5 sticky left-0 bg-[#0b1020] z-30 w-32 sm:w-40 md:w-48 border-r-2 border-indigo-500/40 shadow-[4px_0_15px_rgba(0,0,0,0.8)]">
                                            <span className="text-[11px] sm:text-xs md:text-sm font-black uppercase text-zinc-300 tracking-wider">주요 재무 지표</span>
                                        </th>
                                    <th colSpan={annualDates.length} className="py-2.5 px-3 text-xs md:text-sm font-black uppercase tracking-wider text-emerald-300 text-center border-b border-emerald-500/40 bg-emerald-950/30">
                                        📊 연간 실적 (Yearly Performance)
                                    </th>
                                    {hasQuarterlyData && (
                                        <th colSpan={quarterlyDates.length} className="py-2.5 px-3 text-xs md:text-sm font-black uppercase tracking-wider text-blue-300 text-center border-b border-blue-500/40 bg-blue-950/30 border-l border-white/15">
                                            ⏰ 분기 실적 (Quarterly Trend)
                                        </th>
                                    )}
                                </tr>
                                <tr className="border-b-2 border-indigo-500/40 bg-[#0e162e] text-xs">
                                    <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 md:px-5 text-zinc-300 font-extrabold uppercase tracking-wider sticky left-0 bg-[#0e162e] z-30 backdrop-blur-md w-32 sm:w-40 md:w-48 border-r-2 border-indigo-500/40 shadow-[4px_0_15px_rgba(0,0,0,0.8)] whitespace-nowrap">
                                        지표명 (단위)
                                    </th>
                                    {dates.map((date: string, idx: number) => {
                                        const isQDate = isQuarterDate(date);
                                        const isFirstQ = isQDate && !isQuarterDate(dates[idx - 1] || '');
                                        return (
                                            <th 
                                                key={idx} 
                                                className={`py-3 px-2.5 md:px-3 text-center whitespace-nowrap font-black font-mono text-xs md:text-sm ${
                                                    isEstimate(date) 
                                                        ? 'text-purple-300 bg-purple-500/15' 
                                                        : isQDate 
                                                            ? 'text-blue-200' 
                                                            : 'text-zinc-100'
                                                } ${isFirstQ ? 'border-l-2 border-blue-500/30' : ''}`}
                                            >
                                                {date}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/5 font-mono text-xs md:text-sm">
                                {displayedGroups.map((group) => (
                                    <React.Fragment key={group.title}>
                                        <tr className="bg-gradient-to-r from-[#111933] via-zinc-900 to-zinc-950 border-t-2 border-b border-white/15">
                                            <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 md:px-5 font-black text-xs md:text-sm text-amber-300 uppercase tracking-wider sticky left-0 z-20 bg-[#111933] border-r-2 border-indigo-500/40 shadow-[4px_0_15px_rgba(0,0,0,0.8)] whitespace-nowrap w-32 sm:w-40 md:w-48">
                                                {group.title}
                                            </td>
                                            <td colSpan={dates.length} className="py-3 px-4 text-xs md:text-sm text-zinc-400 font-medium break-keep">
                                                • {group.desc}
                                            </td>
                                        </tr>

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
                                                    <td className={`py-2.5 sm:py-3.5 px-2.5 sm:px-4 md:px-5 sticky left-0 z-20 backdrop-blur-md border-r-2 border-indigo-500/40 shadow-[4px_0_15px_rgba(0,0,0,0.8)] whitespace-nowrap transition-colors w-32 sm:w-40 md:w-48 ${
                                                        isSelected ? 'bg-[#18244a]' : 'bg-[#0d1322] group-hover:bg-[#131c33]'
                                                    }`}>
                                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                                            <span className="text-base sm:text-lg shrink-0">{config.emoji}</span>
                                                            <div className="truncate">
                                                                <div className={`text-xs md:text-sm font-black transition-colors flex items-center gap-1 ${
                                                                    isSelected ? 'text-amber-300' : 'text-white group-hover:text-amber-300'
                                                                }`}>
                                                                <span>{config.label}</span>
                                                                <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-white/10 text-zinc-400 uppercase">
                                                                    {config.unit}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

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
                                                            className={`py-3.5 px-2.5 md:px-3.5 text-center whitespace-nowrap transition-colors ${
                                                                isEstimate(dates[idx]) 
                                                                    ? 'bg-purple-500/5' 
                                                                    : isQuarter 
                                                                        ? 'bg-blue-500/[0.03]' 
                                                                        : 'bg-emerald-500/[0.02]'
                                                            } ${isFirstQ ? 'border-l-2 border-blue-500/30' : ''}`}
                                                        >
                                                            {val === null ? (
                                                                <span className="text-zinc-600 text-xs font-bold">-</span>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className={`tracking-tight text-xs md:text-sm font-extrabold ${colorClass}`}>
                                                                        {formatValue(val, config.format, config.unit, currency)}
                                                                    </span>
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
                </div>
            )}

            {/* 6. 하단 범례 & 데이터 공시 출처 */}
            <div className="p-4 bg-zinc-950/90 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 shadow-inner">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-zinc-200 font-black flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-indigo-400" />
                        <span>색상 및 기호 안내:</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-extrabold"><span className="text-base">■</span> 실적 호조 / 개선</span>
                    <span className="flex items-center gap-1.5 text-rose-400 font-extrabold"><span className="text-base">■</span> 실적 둔화 / 악화</span>
                    <span className="flex items-center gap-1.5 text-purple-400 font-extrabold"><span className="text-base">■</span> 증권가 컨센서스 예상치(E)</span>
                    <span className="flex items-center gap-1 text-zinc-300 font-bold">▲▼ 전기 대비 변동</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                    데이터 출처: DART 공식 전자공시 / KRX
                </div>
            </div>
        </div>
    );
}
