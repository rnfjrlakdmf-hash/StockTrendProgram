"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Info,
    X,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
    Clock,
    Sparkles,
    Flame,
    Layers,
    ShieldCheck,
    Compass
} from "lucide-react";

interface StockTimingBadgeCardProps {
    symbol: string;
    stockName: string;
    currentPrice?: number | string;
    changePercent?: number;
    changeVal?: number;
    dayHigh?: number;
    dayLow?: number;
    prevClose?: number;
    currency?: string;
    className?: string;
}

type SignalType = "green" | "yellow" | "red";

interface TimingSignalResult {
    type: SignalType;
    statusLabel: string;
    subTitle: string;
    badgeText: string;
    headline: string;
    description: string;
    advice: string;
    psychology: string;       // 시장 심리 & 스마트 머니 수급 분석
    traderProtocol: string;   // 프로 트레이더 행동 수칙 (Action Protocol)
    scaleInTip: string;       // 3단계 황금 분할 매수 공식
    riskLevel: string;
    riskScore: number;        // 1~5점
    borderColor: string;
    glowColor: string;
    badgeBg: string;
    textColor: string;
    bgGradient: string;
}

export default function StockTimingBadgeCard({
    symbol,
    stockName,
    currentPrice = 0,
    changePercent = 0,
    changeVal = 0,
    dayHigh,
    dayLow,
    prevClose,
    currency = "KRW",
    className = ""
}: StockTimingBadgeCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"protocol" | "psychology" | "scaleIn">("protocol");

    // 6자리 종목코드 추출
    const cleanTicker = symbol
        ? symbol.includes(".")
            ? symbol.split(".")[0]
            : symbol
        : "";

    // 숫자 파싱
    const priceNum = typeof currentPrice === "number" 
        ? currentPrice 
        : Number(String(currentPrice).replace(/,/g, "")) || 0;
    const parsedChangePct = typeof changePercent === "number" ? changePercent : Number(changePercent) || 0;
    const parsedChangeVal = typeof changeVal === "number" ? changeVal : Number(changeVal) || 0;

    const highNum = typeof dayHigh === "number" ? dayHigh : Number(String(dayHigh || 0).replace(/,/g, "")) || 0;
    const lowNum = typeof dayLow === "number" ? dayLow : Number(String(dayLow || 0).replace(/,/g, "")) || 0;
    const prevCloseNum = typeof prevClose === "number" ? prevClose : Number(String(prevClose || 0).replace(/,/g, "")) || 0;

    // 객관적 기술적 시세 팩트 기반 신호등 판정 알고리즘
    const signal: TimingSignalResult = useMemo(() => {
        const pct = parsedChangePct;

        // 1. 빨간불: 단기 급등 과열 주의권 (+5.5% 이상 급등)
        if (pct >= 5.5) {
            return {
                type: "red",
                statusLabel: "기술적 단기 과열 구간",
                subTitle: "단기 급등에 따른 이격도 확대 및 변동성 주의",
                badgeText: "단기 과열 주의",
                headline: `당일 +${pct.toFixed(2)}% 급등! 단기 차익 실현 매물 출회 가능성이 높은 기술적 자리`,
                description: `당일 등락률이 +${pct.toFixed(2)}%로 단기 급등하여 기술적 보조지표상 과열권에 위치해 있습니다. 차트 이론상 단기 급등 후에는 가격 조정 또는 기간 조정이 빈번하게 발생합니다.`,
                advice: "기술적 지표상 이격도가 크게 벌어진 상태입니다. 차트 분석 이론에서는 무리한 진입보다 2~3일간 이격도를 좁히는 숨고르기(조정) 흐름을 확인하는 것이 권장됩니다.",
                psychology: "단기 모멘텀에 반응한 시장 참여자들의 매수세가 집중되면서 과열 양상을 보이고 있습니다. 반면 단기 저점에서 진입한 투자자들의 차익 실현(매도) 욕구가 커지는 시점이므로 상단 변동성에 유의할 필요가 있습니다.",
                traderProtocol: "【기술적 과열 신호 감지】 당일 단기 급등으로 기술적 과열권에 진입한 상태입니다. 일반적인 차트 트레이딩 이론에서는 급등 당일 추격 진입을 지양하고, 주가가 5일 이동평균선 등으로 수렴하며 지지를 형성하는지 관찰하는 것을 기본 원칙으로 봅니다.",
                scaleInTip: "일반적인 리스크 관리 이론상 단기 과열 구간에서는 신규 비중 확대를 자제하고, 주가가 기술적 지지선(이동평균선 또는 전일 종가)으로 안착할 때까지 현금 비중을 유지하는 전략이 권장됩니다.",
                borderColor: "border-rose-500/50 hover:border-rose-400",
                glowColor: "bg-rose-500/15 group-hover:bg-rose-500/25",
                badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
                textColor: "text-rose-400",
                bgGradient: "from-rose-950/40 via-zinc-900 to-zinc-950",
                riskLevel: "단기 과열 (주의)",
                riskScore: 5
            };
        }

        // 2. 초록불: 눌림목 안정권 (-0.2% ~ -3.5% 건전한 조정 또는 +0.0% ~ +1.8% 안정적 추세)
        if ((pct <= -0.2 && pct >= -3.5) || (pct >= 0 && pct <= 1.8)) {
            const isPullback = pct < 0;
            return {
                type: "green",
                statusLabel: "기술적 눌림목 / 지지 구간",
                subTitle: isPullback ? "건전한 숨고르기 (기술적 가격 조정)" : "바닥 다지기 (과열 없는 안정 추세)",
                badgeText: isPullback ? "기술적 조정" : "지지선 안착",
                headline: isPullback 
                    ? `당일 ${pct.toFixed(2)}% 수준의 완만한 숨고르기로 기술적 지지선을 테스트하는 구간`
                    : `당일 +${pct.toFixed(2)}%로 과열 없이 매물대를 소화하며 안정적 흐름을 유지 중인 구간`,
                description: isPullback
                    ? `주가가 급등 피로감을 덜어내고 주요 이동평균선이나 전일 지지선 부근에서 매물을 소화하고 있습니다. 기술적 과열 부담이 완화된 자리입니다.`
                    : `주가가 급격한 변동 없이 차분하게 거래되며 계단식 지지선을 형성하고 있습니다. 기술적 지표상 과열 부담이 적은 중립 안정 구간입니다.`,
                advice: "단기 과열 부담이 적은 기술적 지지 구간입니다. 일반적인 차트 분석에서는 단번에 자금을 집중하기보다 단계별 분할 관점으로 접근하는 것이 안전한 접근법으로 꼽힙니다.",
                psychology: "단기 급등 이후 나타나는 자연스러운 매물 소화 과정입니다. 하단에서 대기하는 매수세가 지지선을 형성하며 추가 하락 압력을 흡수하고 있어, 기술적으로 하방 경직성을 보이는 단계입니다.",
                traderProtocol: "【기술적 지지선 안착 관찰】 주요 지지선(이동평균선)을 훼손하지 않는 건전한 조정 국면입니다. 차트 이론상 이러한 눌림목 구간에서는 분할 관점으로 1차 비중을 점검하고, 당일 저가 지지 여부를 체크하는 것이 정석적 접근입니다.",
                scaleInTip: "분할 접근 이론: 1단계(1차 관찰 비중) ➔ 2단계(익일 저점 지지 및 반등 캔들 확인 시) ➔ 3단계(주요 이동평균선 안착 확인 시 단계적 비중 관리) 순으로 리스크를 분산하는 방법이 있습니다.",
                borderColor: "border-emerald-500/50 hover:border-emerald-400",
                glowColor: "bg-emerald-500/15 group-hover:bg-emerald-500/25",
                badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                textColor: "text-emerald-400",
                bgGradient: "from-emerald-950/40 via-zinc-900 to-zinc-950",
                riskLevel: "안정 (눌림목 지지)",
                riskScore: 1
            };
        }

        // 3. 노란불: 방향성 탐색권 (보합 공방 또는 1.8% ~ 5.5% 상승 구간, 또는 -3.5% 초과 급락)
        const isSharpDrop = pct < -3.5;
        return {
            type: "yellow",
            statusLabel: isSharpDrop ? "단기 급락 관망 구간" : "방향성 탐색 중립 구간",
            subTitle: isSharpDrop ? "하락 변동성 확대 & 저점 지지선 확인 필요" : "매수·매도 공방 (추세 탐색 국면)",
            badgeText: isSharpDrop ? "지지선 확인 필요" : "추세 탐색",
            headline: isSharpDrop 
                ? `당일 ${pct.toFixed(2)}% 낙폭 확대로 기술적 하락 변동성이 확대된 관망 구간`
                : `당일 등락률 ${pct > 0 ? "+" : ""}${pct.toFixed(2)}%로 상승과 하락의 분기점에서 에너지를 응축 중인 구간`,
            description: isSharpDrop
                ? `단기 매도세가 집중되어 저점 지지선을 테스트하고 있습니다. 하락 모멘텀이 진정되고 바닥 지지가 확인될 때까지 신중한 관찰이 요구되는 국면입니다.`
                : `매수세와 매도세가 팽팽하게 맞서며 뚜렷한 방향성을 모색하고 있습니다. 주요 저항선 돌파 또는 지지선 안착 여부를 확인할 필요가 있습니다.`,
            advice: isSharpDrop
                ? "하락 멈춤 및 거래량이 동반된 하단 지지선 형성(반등 캔들) 여부를 확인하며 보수적으로 관망하는 것이 차트 이론상 유리합니다."
                : "추세의 상방/하방 분기점이 확인될 때까지 섣부른 집중 투자를 지양하고 관망 또는 소액 분할 관점을 유지하는 것이 일반적입니다.",
            psychology: isSharpDrop
                ? "단기 차익 실현 및 시장 불안 심리가 겹쳐 매도 압력이 우세한 국면입니다. 저가 매수세가 유입되며 하락세를 멈추는 분기점까지는 시장 관망 심리가 큽니다."
                : "상승 모멘텀과 차익 실현 압력이 균형을 이루며 시장 참여자들의 관망세가 짙은 구간입니다. 뚜렷한 수급 주체의 유입 여부가 방향성을 가를 수 있습니다.",
            traderProtocol: isSharpDrop
                ? "【하락 멈춤 및 바닥 지지 확인】 급격한 낙폭 확대 시에는 조급한 진입보다 하락세가 진정되는 '쌍바닥' 또는 '아래꼬리 반등' 캔들의 출현 여부를 확인하고 대응하는 것이 기술적 리스크 관리의 기본입니다."
                : "【추세 돌파 확인 후 대응】 방향성이 미정인 상태이므로 명확한 저항선 돌파가 나타나거나, 반대로 안정적 눌림목(초록불) 구간으로 회귀할 때까지 흐름을 차분히 지켜보는 것이 권장됩니다.",
            scaleInTip: isSharpDrop
                ? "급락 국면에서는 섣부른 추가 매수를 피하고, 주가가 일봉상 전저점을 지켜내며 반등 흐름을 형성한 이후에만 단계적 분할 접근을 고려하는 것이 안전합니다."
                : "일반적 자금 관리: 추세가 뚜렷하지 않은 중립 국면에서는 비중을 보수적으로 유지하고, 저항선 돌파 등 기술적 확인 시점에 맞춰 비중을 조절하는 원칙이 있습니다.",
            borderColor: "border-amber-500/50 hover:border-amber-400",
            glowColor: "bg-amber-500/15 group-hover:bg-amber-500/25",
            badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
            textColor: "text-amber-400",
            bgGradient: "from-amber-950/40 via-zinc-900 to-zinc-950",
            riskLevel: isSharpDrop ? "주의 (급락 관망)" : "보통 (방향성 탐색)",
            riskScore: isSharpDrop ? 4 : 3
        };
    }, [parsedChangePct]);

    // 당일 가격 레인지(Day High-Low) 게이지 계산
    const dayRangeInfo = useMemo(() => {
        if (highNum > lowNum && lowNum > 0 && priceNum > 0) {
            const rawPercent = ((priceNum - lowNum) / (highNum - lowNum)) * 100;
            const clamped = Math.max(0, Math.min(100, rawPercent));
            let statusText = "당일 중간 가격대 형성";
            let statusColor = "text-zinc-300";
            if (clamped >= 80) {
                statusText = "당일 최고가권 근접 (차익 실현 주의)";
                statusColor = "text-rose-400";
            } else if (clamped <= 25) {
                statusText = "당일 최저가권 부근 (저점 지지 테스트)";
                statusColor = "text-blue-400";
            } else {
                statusText = "당일 안정적 중심 가격대 위치";
                statusColor = "text-emerald-400";
            }
            return {
                valid: true,
                percent: clamped,
                high: highNum,
                low: lowNum,
                statusText,
                statusColor
            };
        }
        return {
            valid: false,
            percent: 50,
            high: highNum,
            low: lowNum,
            statusText: "당일 가격 범위 집계 중",
            statusColor: "text-zinc-400"
        };
    }, [highNum, lowNum, priceNum]);

    // 모달 활성화 시 배경 스크롤 방지
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isModalOpen]);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsModalOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // 프리미엄 3D 신호등 램프 스타일 헬퍼
    const getLampStyle = (lamp: SignalType) => {
        const isActive = signal.type === lamp;
        switch (lamp) {
            case "red":
                return isActive
                    ? "bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,1),inset_0_1px_3px_rgba(255,255,255,0.8)] ring-2 ring-rose-400/80 animate-pulse"
                    : "bg-rose-950/40 border border-rose-900/30 opacity-30 shadow-inner";
            case "yellow":
                return isActive
                    ? "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,1),inset_0_1px_3px_rgba(255,255,255,0.8)] ring-2 ring-amber-300/80 animate-pulse"
                    : "bg-amber-950/40 border border-amber-900/30 opacity-30 shadow-inner";
            case "green":
                return isActive
                    ? "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,1),inset_0_1px_3px_rgba(255,255,255,0.8)] ring-2 ring-emerald-300/80 animate-pulse"
                    : "bg-emerald-950/40 border border-emerald-900/30 opacity-30 shadow-inner";
        }
    };

    return (
        <>
            {/* 신호등 기술적 타이밍 진단 미니 카드 (벤토 스타일) */}
            <div
                onClick={() => setIsModalOpen(true)}
                className={`p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border ${signal.borderColor} shadow-lg flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer group w-full h-full relative overflow-hidden ${className}`}
                title="클릭하여 신호등 매매 타이밍 프리미엄 상세 진단표 열기"
            >
                {/* 은은한 배경 오로라 글로우 */}
                <div className={`absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all ${signal.glowColor}`} />

                {/* 상단: 타이틀 및 3색 미니 신호등 램프 */}
                <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border group-hover:scale-105 transition-transform ${signal.badgeBg}`}>
                            <Activity className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${signal.textColor}`}>
                                    기술적 타이밍 진단
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${signal.badgeBg}`}>
                                    {signal.badgeText}
                                </span>
                            </div>
                            <div className="text-xs font-bold text-white group-hover:text-zinc-200 transition-colors">
                                {stockName} 과열도 분석
                            </div>
                        </div>
                    </div>

                    {/* 미니 3색 신호등 램프 바 */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 shadow-inner">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${getLampStyle("red")}`} />
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${getLampStyle("yellow")}`} />
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${getLampStyle("green")}`} />
                    </div>
                </div>

                {/* 중간: 메인 상태 명칭 및 직관적 가이드 */}
                <div className="relative z-10 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                                {signal.type === "green" && "🟢"}
                                {signal.type === "yellow" && "🟡"}
                                {signal.type === "red" && "🔴"}
                                <span>{signal.statusLabel}</span>
                            </span>
                        </div>
                        <span className={`text-xs font-extrabold ${signal.textColor}`}>
                            {signal.riskLevel}
                        </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-1">
                        {signal.headline}
                    </p>
                </div>

                {/* 하단: 클릭 유도 바 */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-500 font-medium relative z-10">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        실시간 기술적 분석 지표
                    </span>
                    <span className="text-indigo-400 group-hover:text-indigo-300 font-bold flex items-center gap-0.5">
                        상세 진단표 보기 →
                    </span>
                </div>
            </div>

            {/* 🌟 신호등 상세 진단 프리미엄 모달 팝업 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
                    {/* 배경 클릭 시 닫기 */}
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />

                    {/* 모달 본체 */}
                    <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800/90 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
                        
                        {/* 헤더: 프리미엄 다크 글래스 바 */}
                        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-zinc-800/80 bg-zinc-900/70 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-2xl border shadow-inner ${signal.badgeBg}`}>
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                                            {stockName} <span className="text-zinc-400 text-sm font-semibold">({cleanTicker})</span>
                                        </h2>
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${signal.badgeBg}`}>
                                            {signal.badgeText}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-indigo-400" />
                                        실시간 호가·등락률 기반 초보자 과열 방지 진단기
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                aria-label="닫기"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 모달 스크롤 콘텐츠 */}
                        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 custom-scrollbar text-zinc-300">
                            
                            {/* 1. 히어로: 3D 네온 신호등 전광판 카드 */}
                            <div className={`p-5 sm:p-6 rounded-2xl bg-gradient-to-br ${signal.bgGradient} border ${signal.borderColor} shadow-2xl relative overflow-hidden`}>
                                {/* 은은한 앰비언트 글로우 */}
                                <div className={`absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none ${signal.glowColor}`} />

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10">
                                    <div className="space-y-1.5 text-center sm:text-left">
                                        <div className="flex items-center justify-center sm:justify-start gap-2">
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                                                현재 기술적 타이밍 판정
                                            </span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${signal.badgeBg}`}>
                                                위험도 {signal.riskLevel}
                                            </span>
                                        </div>

                                        <div className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center sm:justify-start gap-2.5 ${signal.textColor}`}>
                                            {signal.type === "green" && "🟢"}
                                            {signal.type === "yellow" && "🟡"}
                                            {signal.type === "red" && "🔴"}
                                            <span>{signal.statusLabel}</span>
                                        </div>

                                        <div className="text-xs text-zinc-300 font-medium pt-0.5">
                                            {signal.subTitle}
                                        </div>
                                    </div>

                                    {/* 3D 네온 신호등 섀시 */}
                                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/80 border border-zinc-700/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`w-7 h-7 rounded-full transition-all duration-300 ${getLampStyle("red")}`} />
                                            <span className="text-[10px] font-black text-rose-400">과열</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`w-7 h-7 rounded-full transition-all duration-300 ${getLampStyle("yellow")}`} />
                                            <span className="text-[10px] font-black text-amber-400">관망</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`w-7 h-7 rounded-full transition-all duration-300 ${getLampStyle("green")}`} />
                                            <span className="text-[10px] font-black text-emerald-400">안전</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 헤드라인 요약 메시지 */}
                                <div className="mt-4 pt-3.5 border-t border-white/10 text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
                                    💬 {signal.headline}
                                </div>
                            </div>

                            {/* 2. 📊 당일 가격 레인지 & 현재가 위치 게이지 (Day High-Low Radar) */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-white">
                                        <Compass className="w-4 h-4 text-cyan-400" />
                                        <span>당일 고저가(Day Range) 내 현재 주가 위치</span>
                                    </div>
                                    <span className={`font-bold text-[11px] ${dayRangeInfo.statusColor}`}>
                                        {dayRangeInfo.statusText}
                                    </span>
                                </div>

                                {dayRangeInfo.valid ? (
                                    <div className="space-y-2 pt-1">
                                        {/* 게이지 트랙 */}
                                        <div className="relative w-full h-3 rounded-full bg-zinc-800 overflow-visible shadow-inner">
                                            {/* 그라데이션 베이스 바 */}
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-rose-500 opacity-75" />

                                            {/* 현재 위치 마커 핀 */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)] border-2 border-zinc-950 flex items-center justify-center transition-all duration-500 z-10"
                                                style={{ left: `${dayRangeInfo.percent}%` }}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                            </div>
                                        </div>

                                        {/* 저가 - 현재가 - 고가 수치 레이블 */}
                                        <div className="flex items-center justify-between text-[11px] pt-1">
                                            <div className="text-left">
                                                <span className="text-zinc-500 block text-[10px]">당일 저가 (Low)</span>
                                                <span className="font-mono font-bold text-blue-400">
                                                    {currency === "KRW" ? "₩" : "$"}{dayRangeInfo.low.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="text-center px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                                                <span className="text-zinc-400 block text-[10px]">현재가 (위치: {Math.round(dayRangeInfo.percent)}%)</span>
                                                <span className="font-mono font-black text-white">
                                                    {currency === "KRW" ? "₩" : "$"}{priceNum.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-zinc-500 block text-[10px]">당일 고가 (High)</span>
                                                <span className="font-mono font-bold text-rose-400">
                                                    {currency === "KRW" ? "₩" : "$"}{dayRangeInfo.high.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* 데이터 미수신 시 컴팩트 시세 카드 */
                                    <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                                            <span className="text-[10px] text-zinc-500 block">현재 등락률</span>
                                            <span className={`text-sm font-mono font-black ${
                                                parsedChangePct > 0 ? "text-rose-400" : parsedChangePct < 0 ? "text-blue-400" : "text-zinc-300"
                                            }`}>
                                                {parsedChangePct > 0 ? "+" : ""}{parsedChangePct.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                                            <span className="text-[10px] text-zinc-500 block">현재 주가</span>
                                            <span className="text-sm font-mono font-black text-white">
                                                {currency === "KRW" ? "₩" : "$"}{priceNum.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                                            <span className="text-[10px] text-zinc-500 block">과열 기준</span>
                                            <span className="text-sm font-mono font-black text-amber-400">+5.5% 이상</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 3. 🧠 기술적 심층 분석 브리핑 (3대 인터랙티브 탭) */}
                            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
                                {/* 탭 네비게이션 */}
                                <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950/50 p-1.5 gap-1 text-xs font-bold">
                                    <button
                                        onClick={() => setActiveTab("protocol")}
                                        className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                            activeTab === "protocol"
                                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        }`}
                                    >
                                        <Flame className="w-3.5 h-3.5" />
                                        <span>기술적 지표 분석</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab("psychology")}
                                        className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                            activeTab === "psychology"
                                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        }`}
                                    >
                                        <Activity className="w-3.5 h-3.5" />
                                        <span>심리 & 수급 진단</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab("scaleIn")}
                                        className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                            activeTab === "scaleIn"
                                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        }`}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>자금 관리 원칙</span>
                                    </button>
                                </div>

                                {/* 탭 본문 내용 */}
                                <div className="p-5">
                                    {activeTab === "protocol" && (
                                        <div className="space-y-3 animate-in fade-in duration-200">
                                            <div className="flex items-center gap-2">
                                                <span className="p-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase">
                                                    Technical Strategy
                                                </span>
                                                <h4 className="text-sm font-bold text-white">
                                                    기술적 차트 분석 및 리스크 점검 요점
                                                </h4>
                                            </div>
                                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5 font-medium">
                                                {signal.traderProtocol}
                                            </p>
                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong className="text-white">기술적 관찰 포인트:</strong> {signal.advice}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "psychology" && (
                                        <div className="space-y-3 animate-in fade-in duration-200">
                                            <div className="flex items-center gap-2">
                                                <span className="p-1 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold uppercase">
                                                    Market Sentiment
                                                </span>
                                                <h4 className="text-sm font-bold text-white">
                                                    시장 참여자 심리와 수급 동향 분석
                                                </h4>
                                            </div>
                                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5 font-medium">
                                                {signal.psychology}
                                            </p>
                                            <div className="text-[11px] text-zinc-400 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                                💡 <strong className="text-zinc-200">왜 심리 분석이 중요한가요?</strong> 주가는 시장 참여자들의 기대와 우려에 의해 가격이 형성됩니다. 단기 과열 구간에서의 쏠림 현상과 조정 구간에서의 매물 소화 과정을 객관적으로 이해하는 것이 올바른 차트 분석의 기초입니다.
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "scaleIn" && (
                                        <div className="space-y-3 animate-in fade-in duration-200">
                                            <div className="flex items-center gap-2">
                                                <span className="p-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">
                                                    Risk Management
                                                </span>
                                                <h4 className="text-sm font-bold text-white">
                                                    리스크 분산을 위한 단계별 분할 관리 이론 (참고용)
                                                </h4>
                                            </div>
                                            <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2">
                                                <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
                                                    {signal.scaleInTip}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                                                    <span className="text-[10px] text-zinc-400 font-bold block">1단계</span>
                                                    <span className="text-emerald-400 font-bold text-[11px]">1차 지지 관찰</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                                                    <span className="text-[10px] text-zinc-400 font-bold block">2단계</span>
                                                    <span className="text-indigo-400 font-bold text-[11px]">반등 캔들 확인</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                                                    <span className="text-[10px] text-zinc-400 font-bold block">3단계</span>
                                                    <span className="text-amber-400 font-bold text-[11px]">이평선 안착 완성</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 4. 🚦 신호등 3단계 판정 가이드 기준표 (비교 매트릭스) */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-zinc-400" />
                                        신호등 기술적 판정 기준표 (보조지표 상태 가이드)
                                    </h3>
                                    <span className="text-[10px] text-zinc-500">
                                        하이라이트된 카드가 현재 종목의 기술적 상태입니다
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    {/* 초록불 카드 */}
                                    <div className={`p-3.5 rounded-2xl transition-all ${
                                        signal.type === "green" 
                                            ? "bg-emerald-500/15 border-2 border-emerald-500/70 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/50" 
                                            : "bg-zinc-900/40 border border-zinc-800/80 opacity-70 hover:opacity-100"
                                    }`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🟢</span>
                                                <div>
                                                    <strong className="text-emerald-300 font-bold text-sm">
                                                        초록불 (기술적 눌림목 / 지지선 안착 구간)
                                                    </strong>
                                                    <span className="text-[10px] text-zinc-400 block sm:inline sm:ml-2">
                                                        당일 -0.2% ~ -3.5% 건전한 조정 또는 +0.0% ~ +1.8% 안정 추세
                                                    </span>
                                                </div>
                                            </div>
                                            {signal.type === "green" && (
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-zinc-950 font-black text-[10px] shrink-0">
                                                    현재 상태
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-zinc-300 leading-relaxed text-[11px] sm:text-xs">
                                            주가가 과열 없이 숨을 고르며 주요 지지선에서 매물을 소화하는 기술적 자리입니다. 차트 분석 이론상 이동평균선 지지가 유지되는지 관찰하는 구간입니다.
                                        </p>
                                    </div>

                                    {/* 노란불 카드 */}
                                    <div className={`p-3.5 rounded-2xl transition-all ${
                                        signal.type === "yellow" 
                                            ? "bg-amber-500/15 border-2 border-amber-500/70 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50" 
                                            : "bg-zinc-900/40 border border-zinc-800/80 opacity-70 hover:opacity-100"
                                    }`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🟡</span>
                                                <div>
                                                    <strong className="text-amber-300 font-bold text-sm">
                                                        노란불 (방향성 탐색 / 변동성 주의 구간)
                                                    </strong>
                                                    <span className="text-[10px] text-zinc-400 block sm:inline sm:ml-2">
                                                        보합 공방 또는 1.8% ~ 5.5% 상승, 또는 -3.5% 초과 급락 시
                                                    </span>
                                                </div>
                                            </div>
                                            {signal.type === "yellow" && (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 font-black text-[10px] shrink-0">
                                                    현재 상태
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-zinc-300 leading-relaxed text-[11px] sm:text-xs">
                                            매수와 매도가 팽팽하게 맞서 방향성을 탐색하거나, 단기 급락으로 바닥을 확인해야 하는 변동성 구간입니다. 기술적 반등 여부를 신중히 관찰하는 것을 기본 원칙으로 합니다.
                                        </p>
                                    </div>

                                    {/* 빨간불 카드 */}
                                    <div className={`p-3.5 rounded-2xl transition-all ${
                                        signal.type === "red" 
                                            ? "bg-rose-500/15 border-2 border-rose-500/70 shadow-lg shadow-rose-950/40 ring-1 ring-rose-400/50" 
                                            : "bg-zinc-900/40 border border-zinc-800/80 opacity-70 hover:opacity-100"
                                    }`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🔴</span>
                                                <div>
                                                    <strong className="text-rose-300 font-bold text-sm">
                                                        빨간불 (기술적 단기 과열 주의 구간)
                                                    </strong>
                                                    <span className="text-[10px] text-zinc-400 block sm:inline sm:ml-2">
                                                        당일 +5.5% 이상 급등 시
                                                    </span>
                                                </div>
                                            </div>
                                            {signal.type === "red" && (
                                                <span className="px-2 py-0.5 rounded-md bg-rose-500 text-zinc-950 font-black text-[10px] shrink-0">
                                                    현재 상태
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-zinc-300 leading-relaxed text-[11px] sm:text-xs">
                                            당일 급등으로 단기 이격도가 크게 벌어진 과열 상태입니다. 차트 이론상 차익 실현에 따른 가격/기간 조정 가능성이 높아 신중한 리스크 관리가 요구됩니다.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 5. ⚖️ 자본시장법 준수 법적 면책 고지 */}
                            <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
                                <div className="flex items-center gap-1.5 font-bold text-zinc-300">
                                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>자본시장법 준수 법적 면책 고지 (Legal Disclaimer)</span>
                                </div>
                                <p className="text-zinc-500">
                                    본 신호등 기술적 타이밍 진단기는 한국거래소 및 글로벌 금융 데이터의 실시간 주가 등락률과 당일 가격 변동 레인지를 기반으로 자동 산출된 <strong>객관적 기술 분석 보조지표(단순 수치 계산 결과)</strong>입니다. 자본시장과 금융투자업에 관한 법률상 특정 종목의 매수·매도를 권유하거나 투자 자문, 수익 보장을 제공하지 않으며, 투자에 관한 모든 판단과 최종 책임은 투자자 본인에게 있습니다.
                                </p>
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between">
                            <div className="text-[11px] text-zinc-500 hidden sm:flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                실시간 시세 반영 중
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
                            >
                                확인 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

