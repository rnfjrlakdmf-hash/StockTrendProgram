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
    Clock
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
    badgeText: string;
    headline: string;
    description: string;
    advice: string;
    borderColor: string;
    glowColor: string;
    badgeBg: string;
    textColor: string;
    riskLevel: string;
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

    // 객관적 기술적 시세 팩트 기반 신호등 판정 알고리즘
    const signal: TimingSignalResult = useMemo(() => {
        const pct = parsedChangePct;

        // 1. 빨간불: 단기 급등 과열 주의권 (+5.5% 이상 급등)
        if (pct >= 5.5) {
            return {
                type: "red",
                statusLabel: "단기 과열 주의",
                badgeText: "추격매수 주의",
                headline: "단기 급등으로 인한 상투(꼭대기) 물림 주의 구간",
                description: `당일 등락률이 +${pct.toFixed(2)}%로 단기 급등하여 차익 실현 매물이 쏟아질 위험이 높은 자리입니다.`,
                advice: "지금 쫓아가서 사면 최고점에 물릴 수 있습니다. 무리한 추격매수를 멈추고 2~3일간 숨고르기(눌림목)가 올 때까지 기다리는 것이 안전합니다.",
                borderColor: "border-rose-500/40 hover:border-rose-400/80",
                glowColor: "bg-rose-500/10 group-hover:bg-rose-500/20",
                badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                textColor: "text-rose-400",
                riskLevel: "단기 과열 (주의 요망)"
            };
        }

        // 2. 초록불: 눌림목 안정권 (-0.2% ~ -3.5% 건전한 조정 또는 +0.0% ~ +1.8% 안정적 추세)
        if ((pct <= -0.2 && pct >= -3.5) || (pct >= 0 && pct <= 1.8)) {
            const isPullback = pct < 0;
            return {
                type: "green",
                statusLabel: "눌림목 안정권",
                badgeText: "기술적 지지",
                headline: isPullback 
                    ? "건전한 숨고르기(조정)를 거치는 매력적인 지지 구간"
                    : "과열 없이 차분하게 바닥을 다지는 안정 구간",
                description: isPullback
                    ? `당일 ${pct.toFixed(2)}% 수준의 완만한 조정을 받으며 기술적 지지선에 안착하고 있습니다.`
                    : `당일 +${pct.toFixed(2)}%로 과열 없이 매물대를 소화하며 안정적인 흐름을 유지 중입니다.`,
                advice: "단기 과열 부담이 없어 초보자도 안심하고 분할 매수로 접근하기에 부담이 적은 기술적 자리입니다.",
                borderColor: "border-emerald-500/40 hover:border-emerald-400/80",
                glowColor: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
                badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                textColor: "text-emerald-400",
                riskLevel: "안정 (눌림목)"
            };
        }

        // 3. 노란불: 방향성 탐색권 (보합 공방 또는 1.8% ~ 5.5% 상승 구간, 또는 -3.5% 초과 급락)
        const isSharpDrop = pct < -3.5;
        return {
            type: "yellow",
            statusLabel: isSharpDrop ? "단기 급락 관망" : "방향성 탐색",
            badgeText: isSharpDrop ? "지지선 확인" : "중립 관망",
            headline: isSharpDrop 
                ? "단기 낙폭 확대로 바닥 지지 확인이 필요한 구간"
                : "매수세와 매도세가 팽팽하게 맞서는 힘겨루기 구간",
            description: isSharpDrop
                ? `당일 ${pct.toFixed(2)}% 하락하여 저점을 확인하는 과정에 있습니다.`
                : `당일 등락률 ${pct > 0 ? "+" : ""}${pct.toFixed(2)}%로 상승과 하락의 방향성을 탐색하고 있습니다.`,
            advice: isSharpDrop
                ? "바닥 지지선이 확고하게 다져지는 것을 확인한 후 천천히 분할로 접근하는 것을 권장합니다."
                : "한 번에 전액을 매수하기보다는 2~3회에 나누어 소액으로 분할 대응하는 것이 안전합니다.",
            borderColor: "border-amber-500/40 hover:border-amber-400/80",
            glowColor: "bg-amber-500/10 group-hover:bg-amber-500/20",
            badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
            textColor: "text-amber-400",
            riskLevel: "보통 (중립)"
        };
    }, [parsedChangePct]);

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

    // 신호등 램프 컬러 스타일 헬퍼
    const getLampStyle = (lamp: SignalType) => {
        const isActive = signal.type === lamp;
        switch (lamp) {
            case "red":
                return isActive
                    ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] ring-2 ring-rose-400 animate-pulse"
                    : "bg-rose-950/60 border border-rose-900/40 opacity-40";
            case "yellow":
                return isActive
                    ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] ring-2 ring-amber-300 animate-pulse"
                    : "bg-amber-950/60 border border-amber-900/40 opacity-40";
            case "green":
                return isActive
                    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)] ring-2 ring-emerald-400 animate-pulse"
                    : "bg-emerald-950/60 border border-emerald-900/40 opacity-40";
        }
    };

    return (
        <>
            {/* 신호등 기술적 타이밍 진단 미니 카드 (벤토 스타일) */}
            <div
                onClick={() => setIsModalOpen(true)}
                className={`p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border ${signal.borderColor} shadow-lg flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer group w-full h-full relative overflow-hidden ${className}`}
                title="클릭하여 신호등 매매 타이밍 상세 진단표 열기"
            >
                {/* 은은한 배경 글로우 */}
                <div className={`absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-all ${signal.glowColor}`} />

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
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 border border-white/10 shadow-inner">
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

            {/* 신호등 상세 진단 모달 팝업 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    {/* 배경 클릭 시 닫기 */}
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />

                    {/* 모달 본체 */}
                    <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl border ${signal.badgeBg}`}>
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black text-white">
                                            {stockName} ({cleanTicker}) 매매 타이밍 진단
                                        </h2>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${signal.badgeBg}`}>
                                            {signal.badgeText}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        객관적 시세 팩트 기반 초보자 과열 방지 보조지표
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
                        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-zinc-300">
                            {/* 1. 대형 3색 신호등 전광판 카드 */}
                            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-center sm:text-left">
                                    <div className="text-xs font-bold text-zinc-400">
                                        현재 기술적 타이밍 판정
                                    </div>
                                    <div className={`text-2xl sm:text-3xl font-black flex items-center justify-center sm:justify-start gap-2 ${signal.textColor}`}>
                                        {signal.type === "green" && "🟢"}
                                        {signal.type === "yellow" && "🟡"}
                                        {signal.type === "red" && "🔴"}
                                        <span>{signal.statusLabel}</span>
                                    </div>
                                    <div className="text-xs text-zinc-400 font-medium">
                                        위험도 수준: <span className="text-white font-bold">{signal.riskLevel}</span>
                                    </div>
                                </div>

                                {/* 가로형 신호등 램프 */}
                                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/80 border border-zinc-700 shadow-2xl">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-6 h-6 rounded-full transition-all ${getLampStyle("red")}`} />
                                        <span className="text-[10px] font-bold text-rose-400">과열</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-6 h-6 rounded-full transition-all ${getLampStyle("yellow")}`} />
                                        <span className="text-[10px] font-bold text-amber-400">중립</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-6 h-6 rounded-full transition-all ${getLampStyle("green")}`} />
                                        <span className="text-[10px] font-bold text-emerald-400">안정</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. 판정 사유 및 상세 설명 */}
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                                <div className="flex items-center gap-2 text-white font-bold text-sm">
                                    <Info className="w-4 h-4 text-indigo-400" />
                                    <span>진단 분석 내용</span>
                                </div>
                                <p className="text-sm text-zinc-200 leading-relaxed font-semibold">
                                    {signal.headline}
                                </p>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    {signal.description}
                                </p>
                                <div className="mt-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                                    💡 <strong className="text-white">초보자 대응 팁:</strong> {signal.advice}
                                </div>
                            </div>

                            {/* 3. 시세 팩트 체크 지표 */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
                                    <span className="text-[11px] text-zinc-500 font-bold block">현재 등락률</span>
                                    <span className={`text-base font-mono font-black ${
                                        parsedChangePct > 0 ? "text-rose-400" : parsedChangePct < 0 ? "text-blue-400" : "text-zinc-300"
                                    }`}>
                                        {parsedChangePct > 0 ? "+" : ""}{parsedChangePct.toFixed(2)}%
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
                                    <span className="text-[11px] text-zinc-500 font-bold block">현재 가격</span>
                                    <span className="text-base font-mono font-black text-white">
                                        {currency === "KRW" ? "₩" : "$"}{priceNum.toLocaleString()}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1 col-span-2 sm:col-span-1">
                                    <span className="text-[11px] text-zinc-500 font-bold block">과열 기준치</span>
                                    <span className="text-base font-mono font-black text-amber-400">
                                        +5.5% 이상
                                    </span>
                                </div>
                            </div>

                            {/* 4. 신호등 3단계 가이드 기준 안내 */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    신호등 판정 기준표 (초보자 안전 가이드)
                                </h3>
                                <div className="space-y-1.5 text-xs">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                                        <span className="text-sm">🟢</span>
                                        <div>
                                            <strong className="text-emerald-300">초록불 (눌림목 안정권):</strong>{" "}
                                            <span className="text-zinc-300">
                                                주가가 당일 -0.2% ~ -3.5% 건전한 조정을 거치거나 과열 없이 바닥을 다지는 상태. 분할 매수하기에 부담이 가장 적은 자리입니다.
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                        <span className="text-sm">🟡</span>
                                        <div>
                                            <strong className="text-amber-300">노란불 (방향성 탐색권):</strong>{" "}
                                            <span className="text-zinc-300">
                                                매수세와 매도세가 팽팽하여 방향성을 확인해야 하는 구간. 한 번에 사지 말고 관망하거나 분할로 접근하세요.
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
                                        <span className="text-sm">🔴</span>
                                        <div>
                                            <strong className="text-rose-300">빨간불 (단기 과열 주의권):</strong>{" "}
                                            <span className="text-zinc-300">
                                                당일 +5.5% 이상 급등하여 단기 상투에 물릴 위험이 매우 높은 상태. 추격 매수를 자제하고 눌림목을 기다려야 합니다.
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. 법적 면책 고지 (자본시장법 완전 준수) */}
                            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-zinc-400">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                    <span>자본시장법 준수 법적 면책 고지</span>
                                </div>
                                <p className="leading-relaxed">
                                    본 신호등 기술적 타이밍 진단기는 거래소의 실시간 주가 등락률 및 가격 변동 데이터를 기반으로 자동 산출된 <strong>객관적 기술 분석 보조지표</strong>입니다. 자본시장과 금융투자업에 관한 법률상 특정 종목의 매수·매도를 권유하거나 투자 수익을 보장하지 않으며, 모든 투자의 최종 결정과 책임은 투자자 본인에게 있습니다.
                                </p>
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="px-6 py-3.5 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
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
