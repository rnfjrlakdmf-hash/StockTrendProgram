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
    Compass,
    ExternalLink,
    BarChart2,
    LineChart as LineChartIcon
} from "lucide-react";
import KakaoShareButton from "@/components/KakaoShareButton";

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
    sellerSituation: string;    // 보유자(매도 입장)가 처한 상황 설명
    sellerPsychology: string;   // 팔려는 쪽의 심리 설명
    holderChecklist: string[];  // 보유자가 스스로 점검해 볼 질문 예시 (지시형 표현 금지)
    scaleOutNote: string;       // 분할 매도 개념 설명 (교육용)
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
    const [activeTab, setActiveTab] = useState<"protocol" | "psychology" | "seller" | "scaleIn">("protocol");

    // 6자리 종목코드 추출
    const cleanTicker = symbol
        ? symbol.includes(".")
            ? symbol.split(".")[0]
            : symbol
        : "";

    // 실시간 캔들 차트 URL 생성 (국내 네이버증권 / 해외 트레이딩뷰 스마트 연동)
    const chartUrl = useMemo(() => {
        if (!cleanTicker) return "";
        if (/^\d{6}$/.test(cleanTicker)) {
            return `https://m.stock.naver.com/domestic/stock/${cleanTicker}/chart`;
        }
        return `https://www.tradingview.com/chart/?symbol=${cleanTicker}`;
    }, [cleanTicker]);

    const handleOpenChart = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!chartUrl) return;
        window.open(chartUrl, "_blank", "noopener,noreferrer");
    };

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
    // [표현 원칙] 특정 종목의 매매 시점·가격을 지시하지 않고, 불특정 다수에게 동일하게 제공되는
    // 일반 개념 · 점검 질문 형태로만 서술합니다. (매수 입장 / 보유 입장 양쪽을 균형 있게 설명)
    const signal: TimingSignalResult = useMemo(() => {
        const pct = parsedChangePct;
        const sign = pct > 0 ? "+" : "";

        // 1. 빨간불: 단기 급등 과열 신호 (+5.5% 이상)
        if (pct >= 5.5) {
            return {
                type: "red",
                statusLabel: "단기 과열 신호 구간",
                subTitle: "짧은 시간에 크게 오른 만큼 변동성이 커지기 쉬운 구간",
                badgeText: "과열 신호",
                headline: `당일 +${pct.toFixed(2)}% 급등 - 단기 변동성이 커질 수 있는 구간`,
                description: "오늘 주가가 평소보다 빠르게 올랐습니다. 이렇게 짧은 기간에 크게 오른 뒤에는 차익을 실현하려는 매물이 늘어 주가가 흔들리는 경우가 있어, 일반적으로 '과열 신호'로 분류합니다.",
                advice: "급등 직후에는 가격 변동 폭이 커지는 경향이 있어, 투자자마다 거래 시점을 신중히 살펴보는 구간으로 알려져 있습니다.",
                psychology: "뒤늦게 소식을 접하고 관심을 갖는 투자자가 늘어나는 한편, 일찍 보유했던 투자자 중에는 수익을 확정하려는 움직임이 나타나기도 합니다. 두 힘의 균형에 따라 변동성이 커질 수 있습니다.",
                traderProtocol: "【과열 신호 요약】 오늘 상승률이 +5.5% 이상으로, 이 도구의 기준상 '과열 신호' 구간입니다. 급등 이후 차익 실현 매물이 나오며 조정을 받는 사례가 흔하다고 알려져 있으나, 이후 흐름은 종목과 시장 상황에 따라 달라 예측할 수 없습니다.",
                scaleInTip: "분할 접근은 한 번에 판단하지 않고 시간과 가격을 나누어 거래하는 개념입니다. 가격 변동이 큰 급등 구간에서 특히 자주 언급됩니다. (교육용 설명이며 특정 거래 권유가 아닙니다)",
                sellerSituation: "이미 보유 중인 투자자에게는 평가 수익이 크게 늘어난 구간입니다. 이 시점에는 '더 오를 것 같다'는 기대와 '지금 수익을 확정할까'라는 고민이 동시에 생기기 쉽습니다.",
                sellerPsychology: "수익이 난 상태에서는 '더 오를지 모른다'는 욕심과 '오른 만큼 되돌릴지 모른다'는 불안이 부딪힙니다. 이 갈등 때문에 단기 고점 부근에서 매도 물량이 늘어나기도 합니다.",
                holderChecklist: [
                    "내가 처음 세운 목표 수익률에 가까워졌는가?",
                    "오늘 상승의 이유(뉴스·수급)가 일회성인가, 지속될 만한 내용인가?",
                    "이 종목이 내 전체 자산에서 차지하는 비중은 적절한가?",
                    "거래량이 평소보다 크게 늘었는가? (매수·매도 모두 활발하다는 뜻)"
                ],
                scaleOutNote: "분할 매도는 보유 수량을 한 번에 정리하지 않고 여러 번에 나누어 정리하는 방식으로, 가격 변동에 따른 아쉬움을 줄이려는 목적으로 자주 소개됩니다. 어떤 방식을 쓸지는 투자자 본인의 목표와 투자 기간에 따라 다릅니다.",
                borderColor: "border-rose-500/50 hover:border-rose-400",
                glowColor: "bg-rose-500/15 group-hover:bg-rose-500/25",
                badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
                textColor: "text-rose-400",
                bgGradient: "from-rose-950/40 via-zinc-900 to-zinc-950",
                riskLevel: "단기 과열 (변동성 확대)",
                riskScore: 5
            };
        }

        // 2. 초록불: 숨고르기 구간 (-0.2% ~ -3.5% 완만한 조정 또는 +0.0% ~ +1.8% 안정 흐름)
        if ((pct <= -0.2 && pct >= -3.5) || (pct >= 0 && pct <= 1.8)) {
            const isPullback = pct < 0;
            return {
                type: "green",
                statusLabel: "숨고르기 구간 (눌림목)",
                subTitle: isPullback ? "상승 후 잠시 쉬어가며 가격대를 다지는 구간" : "큰 변동 없이 차분한 흐름이 이어지는 구간",
                badgeText: isPullback ? "숨고르기" : "안정 흐름",
                headline: isPullback
                    ? `당일 ${pct.toFixed(2)}% 수준의 완만한 조정 - 가격대를 다지는 흐름`
                    : `당일 +${pct.toFixed(2)}%로 급한 변동 없이 차분한 흐름`,
                description: isPullback
                    ? "주가는 계속 오르기만 하지 않고 중간에 쉬어가며 조정을 받는 경우가 많습니다. 지금은 가파른 하락 없이 완만하게 쉬어가는 모습으로, 기술적으로 '눌림목'이라고 부릅니다."
                    : "급등락 없이 매물을 소화하며 차분하게 움직이고 있습니다. 변동성이 낮은 구간으로 분류됩니다.",
                advice: "과열 신호가 없는 구간이라 상대적으로 변동성이 낮은 편입니다. 다만 이후 방향은 시장 상황에 따라 달라질 수 있어, 투자자마다 분할 접근 등 자신만의 원칙을 점검하는 구간입니다.",
                psychology: "그동안 가격 부담 때문에 지켜보던 투자자의 관심이 다시 모이기도 하고, 기관·외국인 수급이 가격대를 받쳐주는지 함께 살펴보는 투자자가 많습니다. 보유 중인 투자자 입장에서는 급한 매도 압박이 크지 않은 편입니다.",
                traderProtocol: "【숨고르기 구간 요약】 큰 하락 없이 완만한 흐름입니다. 차트상 이전 저점(지지선) 부근에서 가격이 유지되는지를 함께 살펴보는 투자자가 많습니다.",
                scaleInTip: "단계적 접근 개념 예시: 1단계(소량으로 시작) → 2단계(가격대 유지 여부 확인) → 3단계(상승 흐름 확인 후 추가 판단). 교육용 설명이며 특정 거래를 권유하는 것이 아닙니다.",
                sellerSituation: isPullback
                    ? "오늘 소폭 하락해 평가 수익이 줄었거나 평가 손실이 조금 커졌을 수 있습니다. 이 정도의 완만한 조정은 상승 추세 중에도 흔히 나타나는 흐름입니다."
                    : "보유 중인 투자자에게는 큰 평가 변동 없이 지켜볼 수 있는 구간입니다. 서둘러 정리를 고민할 만한 신호는 이 도구의 기준상 나타나지 않았습니다.",
                sellerPsychology: "작은 하락에도 '더 떨어지면 어쩌나' 하는 불안이 생기기 쉽지만, 완만한 조정은 정상 범위로 보는 시각이 많습니다. 사전에 정해 둔 원칙(보유 기간·손실 허용 범위)이 있으면 감정적 판단을 줄이는 데 도움이 됩니다.",
                holderChecklist: [
                    "처음 투자할 때 세운 보유 기간과 목표가 그대로인가?",
                    "이 종목을 보유한 이유(실적·산업 전망 등)에 변화가 있는가?",
                    "손실을 어디까지 감내할지 미리 정해 두었는가?",
                    "오늘 변동이 시장 전체 영향인지, 이 종목만의 이슈인지?"
                ],
                scaleOutNote: "이런 구간에서는 서둘러 정리하기보다 보유 이유가 아직 유효한지 점검하는 투자자가 많습니다. 분할 매도는 목표 수익률에 도달했을 때 일부씩 정리하는 방식으로 소개됩니다.",
                borderColor: "border-emerald-500/50 hover:border-emerald-400",
                glowColor: "bg-emerald-500/15 group-hover:bg-emerald-500/25",
                badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                textColor: "text-emerald-400",
                bgGradient: "from-emerald-950/40 via-zinc-900 to-zinc-950",
                riskLevel: "안정 (낮은 변동성)",
                riskScore: 1
            };
        }

        // 3. 노란불: 방향 탐색 구간 (보합 공방 또는 +1.8% ~ +5.5%, 또는 -3.5% 초과 하락)
        const isSharpDrop = pct < -3.5;
        return {
            type: "yellow",
            statusLabel: isSharpDrop ? "급락 구간 (변동성 주의)" : "방향 탐색 구간 (관망 우세)",
            subTitle: isSharpDrop ? "하락 폭이 커서 바닥 여부가 아직 확인되지 않은 구간" : "사려는 쪽과 팔려는 쪽이 팽팽하게 맞선 구간",
            badgeText: isSharpDrop ? "급락 변동성" : "방향 탐색",
            headline: isSharpDrop
                ? `당일 ${pct.toFixed(2)}% 낙폭 확대 - 하락 변동성이 큰 구간`
                : `당일 등락률 ${sign}${pct.toFixed(2)}% - 방향을 탐색하는 구간`,
            description: isSharpDrop
                ? "주가가 짧은 시간에 크게 내려 변동성이 매우 큰 상태입니다. 하락 이유와 거래량 변화 등을 함께 확인하는 투자자가 많으며, 하락이 멈췄는지는 차트에서 별도로 살펴봐야 합니다."
                : "매수와 매도 힘이 비슷해 뚜렷한 방향 없이 움직이는 상태입니다. 위로든 아래로든 방향이 나올 때까지 지켜보는 투자자가 많은 구간입니다.",
            advice: isSharpDrop
                ? "급락 구간에서는 가격 변동 폭이 커서 판단이 어려워지는 경우가 많습니다. 하락 원인과 거래량 변화를 함께 확인하는 것이 일반적인 점검 방식입니다."
                : "방향이 정해지기 전에는 판단이 엇갈리기 쉬워, 추세가 확인될 때까지 지켜보는 투자자가 많은 구간입니다.",
            psychology: isSharpDrop
                ? "하락에 대한 두려움으로 매도 물량이 늘어나는 한편, 낮아진 가격에 관심을 갖는 투자자도 나타납니다. 두 움직임의 균형이 잡히기 전까지는 불안정한 흐름이 이어질 수 있습니다."
                : "시장 참여자들의 생각이 반반으로 나뉘어 있고, 뚜렷한 뉴스나 수급 변화가 나타나는지 지켜보는 분위기입니다.",
            traderProtocol: isSharpDrop
                ? "【급락 변동성 요약】 하락 폭이 -3.5%를 넘어 이 도구의 기준상 '변동성 주의' 구간입니다. 하락이 멈추고 가격대가 유지되는지는 차트에서 별도로 확인해야 합니다."
                : "【방향 탐색 요약】 뚜렷한 방향 없이 움직이는 상태입니다. 위쪽 돌파 또는 아래쪽 이탈 중 어느 쪽으로 방향이 나오는지 차트로 함께 살펴보는 투자자가 많습니다.",
            scaleInTip: isSharpDrop
                ? "변동성이 큰 구간에서는 한 번에 판단하기보다 시간과 가격을 나누어 접근하는 개념이 자주 언급됩니다. 교육용 설명이며 특정 거래를 권유하지 않습니다."
                : "방향이 불확실할 때는 여러 번에 나누어 판단한다는 개념이 소개됩니다. 교육용 설명이며 특정 거래를 권유하지 않습니다.",
            sellerSituation: isSharpDrop
                ? "보유 중인 투자자에게는 평가 손실이 빠르게 커질 수 있는 구간입니다. 이때 '추가 하락 전에 정리할까', '조금 더 지켜볼까' 사이에서 고민이 커지기 쉽습니다."
                : "보유 중인 투자자 입장에서는 평가 금액의 변화가 크지 않아 판단이 쉽지 않은 구간입니다. 정리와 보유 모두 근거가 뚜렷하지 않을 수 있습니다.",
            sellerPsychology: isSharpDrop
                ? "손실이 커질수록 '본전이 되면 팔겠다'는 심리와 '더 떨어지기 전에 정리하자'는 공포가 부딪힙니다. 이런 감정은 판단을 흐리게 하는 대표적인 원인으로 알려져 있습니다."
                : "뚜렷한 신호가 없으면 '조금만 더 보자'는 기대가 길어지기 쉽습니다. 사전에 정한 기준이 있는 투자자는 이런 구간에서 감정 개입을 줄일 수 있습니다.",
            holderChecklist: isSharpDrop
                ? [
                    "하락 이유가 시장 전체 요인인지, 종목 고유의 악재인지?",
                    "처음 정해 둔 손실 허용 범위를 넘었는가?",
                    "추가 하락을 감당할 수 있는 자금 여력과 투자 기간이 남아 있는가?",
                    "감정이 아니라 미리 세운 원칙에 따라 판단하고 있는가?"
                ]
                : [
                    "내가 이 종목을 보유한 이유가 아직 유효한가?",
                    "목표 수익률과 손실 허용 범위가 정해져 있는가?",
                    "거래량이 늘어나며 방향이 나오고 있는가?",
                    "전체 자산 대비 이 종목의 비중은 적정한가?"
                ],
            scaleOutNote: isSharpDrop
                ? "분할 매도는 한 번에 정리하지 않고 나누어 정리해 한 시점의 가격에 대한 부담을 줄이려는 방식으로 소개됩니다. 하락 구간에서의 손실 제한(손절) 기준은 투자자마다 달라 일률적인 정답이 없습니다."
                : "분할 매도는 목표 수익률에 도달하거나 보유 이유가 바뀌었을 때 일부씩 나누어 정리하는 방식으로 소개됩니다. 어떤 기준을 쓸지는 투자자 본인의 계획에 따라 다릅니다.",
            borderColor: "border-amber-500/50 hover:border-amber-400",
            glowColor: "bg-amber-500/15 group-hover:bg-amber-500/25",
            badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
            textColor: "text-amber-400",
            bgGradient: "from-amber-950/40 via-zinc-900 to-zinc-950",
            riskLevel: isSharpDrop ? "주의 (하락 변동성)" : "보통 (방향 탐색)",
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
                statusText = "당일 최고가권 근접 (변동성 주의)";
                statusColor = "text-rose-400";
            } else if (clamped <= 25) {
                statusText = "당일 최저가권 부근";
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


    // 보유자(매도 입장) 참고용 객관 수치: 전일 종가 · 당일 고가 · 당일 저가 대비 현재 위치
    const sellerStats = useMemo(() => {
        const fromPrev = prevCloseNum > 0 && priceNum > 0
            ? ((priceNum - prevCloseNum) / prevCloseNum) * 100
            : parsedChangePct;
        const fromHigh = highNum > 0 && priceNum > 0 ? ((priceNum - highNum) / highNum) * 100 : null;
        const fromLow = lowNum > 0 && priceNum > 0 ? ((priceNum - lowNum) / lowNum) * 100 : null;
        const fmt = (v: number | null) => (v === null ? "집계 중" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
        const color = (v: number | null) =>
            v === null ? "text-zinc-400" : v > 0 ? "text-rose-400" : v < 0 ? "text-blue-400" : "text-zinc-300";

        let rangeText = "오늘 가격 범위를 집계하는 중입니다.";
        if (dayRangeInfo.valid) {
            const p = Math.round(dayRangeInfo.percent);
            if (p >= 80) {
                rangeText = `현재가는 오늘 변동폭의 상단 부근(${p}%)에 있습니다. 오늘 고가에 가까워 평가 수익이 큰 상태일 수 있습니다.`;
            } else if (p <= 25) {
                rangeText = `현재가는 오늘 변동폭의 하단 부근(${p}%)에 있습니다. 오늘 저가에 가까워 평가 손익이 불리한 쪽일 수 있습니다.`;
            } else {
                rangeText = `현재가는 오늘 변동폭의 중간대(${p}%)에 있습니다.`;
            }
        }
        return {
            prevText: fmt(fromPrev),
            prevColor: color(fromPrev),
            highText: fmt(fromHigh),
            highColor: color(fromHigh),
            lowText: fmt(fromLow),
            lowColor: color(fromLow),
            rangeText
        };
    }, [highNum, lowNum, priceNum, prevCloseNum, parsedChangePct, dayRangeInfo]);

    // 전문가 브리핑 탭 목록
    const tabItems: { key: "protocol" | "psychology" | "seller" | "scaleIn"; label: string; icon: React.ReactNode }[] = [
        { key: "protocol", label: "한눈에 요약", icon: <Flame className="w-3.5 h-3.5" /> },
        { key: "psychology", label: "사람들의 심리 & 수급", icon: <Activity className="w-3.5 h-3.5" /> },
        { key: "seller", label: "보유자 관점 (매도)", icon: <TrendingDown className="w-3.5 h-3.5" /> },
        { key: "scaleIn", label: "분할 접근 개념", icon: <Layers className="w-3.5 h-3.5" /> }
    ];

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
                            <div className="flex items-center gap-1.5">
                                <KakaoShareButton
                                    title={`[과열 진단] ${stockName} (${cleanTicker}) - ${signal.statusLabel}`}
                                    description={`${stockName} 현재가 ${priceNum.toLocaleString()}${currency === "KRW" ? "원" : currency} (${parsedChangePct >= 0 ? "+" : ""}${parsedChangePct.toFixed(2)}%)\n🚦 ${signal.statusLabel}\n${signal.subTitle}\n👉 실시간 진단 결과 확인하기`}
                                    url={`https://stock-trend-program.co.kr/discovery?q=${cleanTicker}`}
                                    buttonText="진단 결과 확인"
                                    className="px-3 py-1.5 rounded-full bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-black text-xs transition-all shadow-md shadow-[#FEE500]/20 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                                    showTextAlways={true}
                                />
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    aria-label="닫기"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* 모달 스크롤 콘텐츠 */}
                        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 custom-scrollbar text-zinc-300">
                            
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

{/* 💡 쉬운 용어 사전 (매수·매도 공통 개념) */}
<div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
        <span>💡 1초 핵심 용어 사전 (사는 입장 · 파는 입장 공통)</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed text-zinc-300">
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <strong className="text-emerald-400 block mb-0.5">🏃‍♂️ 눌림목(숨고르기)이란?</strong>
            상승하던 주가가 잠시 쉬어가며 조정을 받는 구간을 말합니다.
        </div>
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <strong className="text-cyan-400 block mb-0.5">🪜 지지선(바닥판)이란?</strong>
            하락하던 주가가 멈추거나 되돌림이 자주 나타났던 가격대입니다.
        </div>
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <strong className="text-rose-400 block mb-0.5">🧱 저항선(천장판)이란?</strong>
            상승하던 주가가 막혀 되돌려졌던 가격대로, 보유자가 매도 시점을 고민할 때 함께 참고하는 개념입니다.
        </div>
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <strong className="text-amber-400 block mb-0.5">💰 차익실현 · 손절이란?</strong>
            차익실현은 오른 주식을 팔아 수익을 확정하는 것, 손절은 손실이 더 커지기 전에 정리하는 것을 말합니다.
        </div>
    </div>
</div>

                            {/* 2. 📊 당일 가격 레인지 & 현재가 위치 게이지 (Day High-Low Radar) */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-white">
                                        <Compass className="w-4 h-4 text-cyan-400" />
                                        <span>오늘 하루 변동폭 내 현재 주가 위치</span>
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
                                                <span className="text-zinc-500 block text-[10px]">오늘 최저가 (Low)</span>
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
                                                <span className="text-zinc-500 block text-[10px]">오늘 최고가 (High)</span>
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

                            {/* 3. 🧠 전문가 심층 브리핑 (3대 인터랙티브 탭) */}
                            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
                                {/* 탭 네비게이션 */}
<div className="grid grid-cols-2 sm:grid-cols-4 border-b border-zinc-800 bg-zinc-950/50 p-1.5 gap-1 text-[11px] sm:text-xs font-bold">
    {tabItems.map((t) => (
        <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === t.key
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
        >
            {t.icon}
            <span>{t.label}</span>
        </button>
    ))}
</div>

                                {/* 탭 본문 내용 */}
                                <div className="p-5">
                                    {activeTab === "protocol" && (
                                        <div className="space-y-3 animate-in fade-in duration-200">
                                            <div className="flex items-center gap-2">
                                                <span className="p-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase">
                                                    Key Summary
                                                </span>
                                                <h4 className="text-sm font-bold text-white">
                                                    지금 이 종목의 기술적 상태 요점
                                                </h4>
                                            </div>
                                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5 font-medium">
                                                {signal.traderProtocol}
                                            </p>
                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong className="text-white">참고 포인트:</strong> {signal.advice}
                                                </span>
                                            </div>

                                            {/* 📈 차트에서 지지선 확인 퀵 배너 */}
                                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/50 via-indigo-950/30 to-purple-950/30 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-black text-blue-300">
                                                        <LineChartIcon className="w-4 h-4 text-blue-400 shrink-0" />
                                                        <span>차트에서 바닥 지지선 직접 확인하기</span>
                                                    </div>
                                                    <p className="text-[11px] text-zinc-300 leading-relaxed break-keep">
                                                        차트를 열어 <strong className="text-rose-400">빨간선(5일선)</strong>이나 <strong className="text-amber-300">노란선(20일선)</strong> 바닥판 아래로 주가가 더 안 떨어지고 멈추는지(지지선) 확인해 보세요!
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleOpenChart}
                                                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-blue-600/30 transition-all active:scale-95"
                                                    title="실시간 캔들 차트 새 창으로 열기"
                                                >
                                                    <BarChart2 className="w-3.5 h-3.5" />
                                                    <span>실시간 차트 열기</span>
                                                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                                                </button>
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
                                                    투자자들의 속마음과 큰손(세력)의 움직임
                                                </h4>
                                            </div>
                                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5 font-medium">
                                                {signal.psychology}
                                            </p>
                                            <div className="text-[11px] text-zinc-400 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                                💡 <strong className="text-zinc-200">왜 사람들의 심리가 중요한가요?</strong> 주가는 사려는 마음(기대·욕심)과 팔려는 마음(차익 실현·불안)의 균형에 따라 움직입니다. 사는 입장과 파는 입장 모두 감정이 판단을 흐리기 쉬워, 미리 세운 원칙을 점검하는 것이 도움이 된다고 알려져 있습니다.
                                            </div>
                                        </div>
                                    )}

{activeTab === "seller" && (
    <div className="space-y-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded bg-rose-500/20 text-rose-300 text-[10px] font-extrabold uppercase">
                Holder View
            </span>
            <h4 className="text-sm font-bold text-white">
                이미 보유 중인 투자자의 입장 (매도 관점)
            </h4>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5 font-medium">
            {signal.sellerSituation}
        </p>

        {/* 객관 수치: 전일 종가 / 오늘 고가 / 오늘 저가 대비 */}
        <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                <span className="text-[10px] text-zinc-500 block">전일 종가 대비</span>
                <span className={`text-sm font-mono font-black ${sellerStats.prevColor}`}>{sellerStats.prevText}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                <span className="text-[10px] text-zinc-500 block">오늘 고가 대비</span>
                <span className={`text-sm font-mono font-black ${sellerStats.highColor}`}>{sellerStats.highText}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                <span className="text-[10px] text-zinc-500 block">오늘 저가 대비</span>
                <span className={`text-sm font-mono font-black ${sellerStats.lowColor}`}>{sellerStats.lowText}</span>
            </div>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed px-1">
            📍 {sellerStats.rangeText}
        </p>

        <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
            <strong className="text-rose-300 text-xs block">🧠 팔려는 마음에는 어떤 심리가 있을까요?</strong>
            <p className="text-xs text-zinc-300 leading-relaxed">{signal.sellerPsychology}</p>
        </div>

        <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2">
            <strong className="text-zinc-100 text-xs block">✅ 보유 중인 투자자가 스스로 점검해 보는 질문 예시</strong>
            <ul className="space-y-1.5">
                {signal.holderChecklist.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{q}</span>
                    </li>
                ))}
            </ul>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
                <strong className="text-white">분할 매도 개념:</strong> {signal.scaleOutNote}
            </span>
        </div>

        <p className="text-[10px] text-zinc-500 leading-relaxed px-1">
            ※ 위 내용은 투자자가 스스로 생각해 볼 수 있는 일반적인 질문과 개념 설명이며, 특정 종목의 매도 시점·가격을 제시하거나 권유하는 것이 아닙니다.
        </p>
    </div>
)}

{activeTab === "scaleIn" && (
    <div className="space-y-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">
                Staged Approach
            </span>
            <h4 className="text-sm font-bold text-white">
                나누어 거래하는 &quot;분할 접근&quot; 개념 (교육용 설명)
            </h4>
        </div>
        <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2">
            <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
                {signal.scaleInTip}
            </p>
        </div>

        <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-emerald-300">🟢 매수 입장에서 소개되는 분할 개념</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                    <span className="text-[10px] text-zinc-400 font-bold block">1단계</span>
                    <span className="text-emerald-400 font-bold text-[11px]">소량으로 시작</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                    <span className="text-[10px] text-zinc-400 font-bold block">2단계</span>
                    <span className="text-indigo-400 font-bold text-[11px]">가격대 유지 확인</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                    <span className="text-[10px] text-zinc-400 font-bold block">3단계</span>
                    <span className="text-amber-400 font-bold text-[11px]">상승 흐름 확인</span>
                </div>
            </div>
        </div>

        <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-rose-300">🔴 보유 입장에서 소개되는 분할 개념</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                    <span className="text-[10px] text-zinc-400 font-bold block">1단계</span>
                    <span className="text-rose-400 font-bold text-[11px]">목표 일부 도달 시 일부 정리</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                    <span className="text-[10px] text-zinc-400 font-bold block">2단계</span>
                    <span className="text-indigo-400 font-bold text-[11px]">남은 수량 보유 이유 재점검</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
                    <span className="text-[10px] text-zinc-400 font-bold block">3단계</span>
                    <span className="text-amber-400 font-bold text-[11px]">계획 변경 시 나머지 정리</span>
                </div>
            </div>
        </div>

        <p className="text-[10px] text-zinc-500 leading-relaxed px-1">
            ※ 분할 접근은 한 시점의 가격에 대한 부담을 줄이려는 일반 개념이며, 수익을 보장하지 않습니다. 실제 방식은 투자자 본인의 목표·기간·자금 상황에 따라 달라집니다.
        </p>
    </div>
)}
                                </div>
                            </div>

                            {/* 4. 🚦 신호등 3단계 판정 가이드 기준표 (비교 매트릭스) */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-zinc-400" />
                                        신호등 색상별 의미 & 매수·매도 입장별 해석
                                    </h3>
                                    <span className="text-[10px] text-zinc-500">
                                        테두리가 빛나는 카드가 현재 종목의 상태입니다
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
                                                        초록불 (숨고르기 구간 - 눌림목)
                                                    </strong>
                                                    <span className="text-[10px] text-zinc-400 block sm:inline sm:ml-2">
                                                        당일 -0.2% ~ -3.5% 살짝 조정 또는 +0.0% ~ +1.8% 안정 추세
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
                                            급한 변동 없이 가격대를 다지는 구간으로 분류됩니다. 매수를 고민하는 입장에서는 가격 부담이 상대적으로 낮은 구간으로, 보유 중인 입장에서는 서둘러 판단하지 않아도 되는 구간으로 해석하는 경우가 많습니다.
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
                                                        노란불 (눈치보기 관망 구간 - 방향 탐색)
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
                                            사려는 힘과 팔려는 힘이 팽팽하거나 하락 변동성이 큰 구간입니다. 매수 입장에서는 방향이 확인되는지를, 보유 입장에서는 미리 정해 둔 기준을 점검하는 투자자가 많은 구간입니다.
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
                                                        빨간불 (단기 과열 신호 구간)
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
                                            당일 급등으로 단기 변동성이 커지기 쉬운 구간입니다. 매수 입장에서는 추격에 대한 부담이, 보유 입장에서는 수익 확정과 추가 상승 기대 사이의 고민이 커지는 구간으로 알려져 있습니다.
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
                                    본 진단기는 실시간 주가 등락률과 당일 가격 변동 범위를 기반으로 자동 산출한 <strong>객관적 수치</strong>와, 불특정 다수에게 동일하게 제공되는 <strong>일반적인 교육·참고 정보</strong>입니다. 개별 투자자의 투자 목적·재산 상황을 고려한 맞춤형 투자자문이 아니며, 특정 종목의 매수·매도 시점이나 가격을 제시하거나 권유하지 않습니다. 매수 입장과 보유(매도) 입장의 설명은 이해를 돕기 위한 일반 개념이며, 과거 시세 흐름이 미래 수익을 보장하지 않습니다. 투자 판단과 그에 따른 손익의 책임은 투자자 본인에게 있습니다.
                                </p>
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="px-5 sm:px-7 py-4 border-t border-zinc-800/80 bg-zinc-900/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={handleOpenChart}
                                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                    title="실시간 캔들 차트 새 창으로 열기"
                                >
                                    <LineChartIcon className="w-4 h-4" />
                                    <span>캔들 차트 바로보기</span>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                                </button>
                                <KakaoShareButton
                                    title={`[과열 진단] ${stockName} (${cleanTicker}) - ${signal.statusLabel}`}
                                    description={`${stockName} 현재가 ${priceNum.toLocaleString()}${currency === "KRW" ? "원" : currency} (${parsedChangePct >= 0 ? "+" : ""}${parsedChangePct.toFixed(2)}%)\n🚦 ${signal.statusLabel}\n${signal.subTitle}\n👉 실시간 진단 결과 확인하기`}
                                    url={`https://stock-trend-program.co.kr/discovery?q=${cleanTicker}`}
                                    buttonText="진단 결과 확인"
                                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-black text-xs transition-all shadow-md shadow-[#FEE500]/20 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                    showTextAlways={true}
                                />
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95 text-center cursor-pointer"
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

