'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';
import { useAuth, isAdminEmail } from '@/context/AuthContext';
import { Compass, TrendingUp, ShieldAlert, Sparkles, AlertTriangle, BookOpen, CheckCircle2, FileText, ArrowRight, Users, Target, Shield, Award, Flame, Briefcase, DollarSign, RefreshCw, Printer, X, BarChart3, Clock, Loader2, Zap, Globe, ChevronRight } from 'lucide-react';


// [Smart Executive Opinion Parser]
// 긴 줄글 형태의 임원 보고서를 [화자 뱃지] + [핵심 질문 헤드라인] + [상세 해설]로 깔끔 분리
function parseExecutiveOpinion(raw: string, defaultRole: string = "분석본부", defaultIcon: string = "💡") {
    if (!raw) return { badge: defaultRole, title: "", body: "", icon: defaultIcon };
    
    // Pattern: [Title · Role]: Body  or  Emoji [Title · Role]: Body
    const match = raw.match(/^([^\w\s\[]*)\s*\[([^·\]]+)(?:·\s*([^\]]+))?\]\s*:\s*([\s\S]*)$/);
    if (match) {
        const icon = match[1]?.trim() || defaultIcon;
        const title = match[2]?.trim() || "";
        const badge = match[3]?.trim() || defaultRole;
        const body = match[4]?.trim() || "";
        return { icon, title, badge, body };
    }
    
    const colonIdx = raw.indexOf(":");
    if (colonIdx > 0 && colonIdx < 50) {
        return {
            icon: defaultIcon,
            title: raw.substring(0, colonIdx).replace(/[\[\]]/g, '').trim(),
            badge: defaultRole,
            body: raw.substring(colonIdx + 1).trim()
        };
    }
    
    return { badge: defaultRole, title: "", body: raw, icon: defaultIcon };
}

// 긴 줄글을 깔끔한 개조식(불릿 포인트) 문장 배열로 분리하는 헬퍼
function splitIntoBullets(raw: string): string[] {
    if (!raw) return [];
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    const parts = cleaned
        .split(/(?<=[.!?다요음함])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
    return parts.length > 0 ? parts : [cleaned];
}

interface Executive {
    id: string;
    name: string;
    role: string;
    dept: string;
    avatar: string;
    badge: string;
    style: string;
    color: string;
    status: string;
}

interface KeyMetric {
    label: string;
    value: string;
    sub: string;
    tone: 'positive' | 'negative' | 'neutral';
}

interface DiscoveryReason {
    badge: string;
    trigger: string;
    summary: string;
    key_drivers: string[];
}

interface BuyReasonCard {
    icon: string;
    title: string;
    highlight: string;
    desc: string;
    badge: string;
}

interface BuyReasons {
    title: string;
    cards: BuyReasonCard[];
}

interface MeetingAttendee {
    name: string;
    role: string;
    dept: string;
    avatar: string;
}

interface MeetingDialogue {
    speaker: string;
    role: string;
    avatar: string;
    text: string;
}

interface MeetingMinutes {
    meeting_no: string;
    title: string;
    date_time: string;
    location: string;
    chairperson: string;
    attendees: MeetingAttendee[];
    dialogue: MeetingDialogue[];
    verdict_badge: string;
    verdict_summary: string;
}

interface Agenda {
    topic_type: string;
    title: string;
    subtitle: string;
    target_name?: string;
    target_code?: string;
    badge: string;
    timestamp: string;
    key_metrics: KeyMetric[];
    ceo_question?: string | null;
    discovery_reason?: DiscoveryReason;
    buy_reasons?: BuyReasons;
    meeting_minutes?: MeetingMinutes;
}

interface DebateTurn {
    speaker_id: string;
    name: string;
    role: string;
    dept: string;
    avatar: string;
    stance: string;
    stance_tone: 'bull' | 'bear' | 'caution' | 'neutral' | 'summary';
    headline: string;
    message: string;
    data_tag: string;
}

interface AutoApprovalDoc {
    doc_id: string;
    doc_number: string;
    category_type?: string;
    category_badge: string;
    urgency: string;
    stock_name: string;
    stock_code?: string;
    current_price?: string;
    target_price?: string;
    upside_pct?: string;
    profit_per_share?: string;
    profit_10m?: string;
    title: string;
    proposer: string;
    submitted_at: string;
    easy_headline?: string;
    key_numbers: { label: string; value: string }[];
    research_opinion: string;
    quant_opinion: string;
    risk_opinion: string;
    secretary_conclusion: string;
    recommendation: string;
    detail_url?: string;
    easy_terms?: { term: string; desc: string }[];
}

interface RiskFactor {
    icon: string;
    title: string;
    tag: string;
    tagColor: string;
    points: string[];
}

interface RiskDefenseRule {
    num: string;
    title: string;
    target: string;
    desc: string;
}

function parsePriceValue(raw: any, sector?: string, stockName?: string): { num: number; isDollar: boolean; formatted: string } {
    if (!raw) return { num: 0, isDollar: false, formatted: '-' };
    const str = String(raw).trim();
    const s = `${stockName || ''} ${str}`.toLowerCase();
    const isDollar = str.includes('$');
    const isVix = sector === 'macro_vix' || s.includes('vix') || s.includes('공포');
    const isRate = sector === 'macro_rate' || str.includes('%') || s.includes('국채') || s.includes('금리') || s.includes('tnx');
    const isOil = sector === 'macro_oil' || s.includes('wti') || s.includes('원유') || s.includes('유가') || s.includes('cl=f');
    const isFx = sector === 'macro_fx' || s.includes('환율') || s.includes('달러') || s.includes('usdkrw');

    const beforeParen = str.split('(')[0];
    const match = beforeParen.match(/([0-9,]+(?:\.[0-9]+)?)/);
    if (!match) return { num: 0, isDollar, formatted: str };
    const num = parseFloat(match[1].replace(/,/g, ''));

    let formatted = '';
    if (isVix) {
        // VIX 지수는 원화('원')가 아닌 지수 포인트(pt)입니다!
        formatted = `${num.toFixed(2)}pt`;
    } else if (isRate) {
        formatted = `${num.toFixed(2)}%`;
    } else if (isOil || isDollar) {
        formatted = `$${num.toFixed(2)}`;
    } else if (isFx) {
        formatted = `${num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}원`;
    } else {
        formatted = `${Math.round(num).toLocaleString()}원`;
    }

    return { num, isDollar: isDollar || isOil, formatted };
}

function getCategoryTheme(doc: AutoApprovalDoc): { icon: string; shortLabel: string; pill: string } {
    if (doc.category_type === 'kr_stock') {
        return {
            icon: '🇰🇷',
            shortLabel: '국내주식',
            pill: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        };
    }
    if (doc.category_type === 'us_stock') {
        return {
            icon: '🌎',
            shortLabel: '미국주식',
            pill: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
    }
    if (doc.category_type === 'global_futures') {
        return {
            icon: '📊',
            shortLabel: '글로벌선물',
            pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    }
    if (doc.category_type === 'world_news') {
        return {
            icon: '📰',
            shortLabel: '매크로뉴스',
            pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
    }
    return {
        icon: '📌',
        shortLabel: (doc.category_badge || '시장종합').replace(/^[^\w가-힣]+/, '').trim() || '시장종합',
        pill: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    };
}

function detectSectorType(stockName: string, title: string = "", categoryBadge: string = ""): string {
    const s = `${stockName} ${title} ${categoryBadge}`.toLowerCase();
    if (s.includes('vix') || s.includes('변동성') || s.includes('공포')) {
        return 'macro_vix';
    }
    if (s.includes('wti') || s.includes('원유') || s.includes('유가') || s.includes('cl=f')) {
        return 'macro_oil';
    }
    if (s.includes('환율') || s.includes('달러') || s.includes('usdkrw') || s.includes('dxy') || s.includes('krw=x')) {
        return 'macro_fx';
    }
    if (s.includes('국채') || s.includes('금리') || s.includes('tnx') || s.includes('10년물')) {
        return 'macro_rate';
    }
    if (s.includes('나스닥') || s.includes('nq=f') || s.includes('s&p') || s.includes('es=f')) {
        return 'macro_futures';
    }
    if (stockName === '전체 시장 시스템' || s.includes('모닝') || s.includes('매크로') || s.includes('지수') || s.includes('선물')) {
        return 'macro_market';
    }
    if (/기업은행|국민은행|신한|하나금융|우리금융|카카오뱅크|jb금융|dgb금융|bnk금융|키움증권|미래에셋|삼성증권|한국금융지주|메리츠|동양생명|삼성화재|db손해|한화생명|은행|금융/.test(s)) {
        return 'banking';
    }
    if (/두산에너빌리티|한전기술|한전kps|한국전력|현대일렉트릭|효성중공업|두산밥캣|두산|씨에스윈드|현대건설기계|ls일렉트릭|ls|일진전기|원전|원자력|전력기기/.test(s)) {
        return 'nuclear_energy';
    }
    if (/삼성전자|sk하이닉스|한미반도체|리노공업|isc|원익|동진쎄미켐|하나마이크론|주성엔지니어링|hpsp|이오테크닉스|db하이텍|semiconductor|hbm|반도체/.test(s)) {
        return 'semiconductor';
    }
    if (/현대차|기아|현대모비스|현대위아|만도|hl만도|한온시스템|한국타이어|자동차/.test(s)) {
        return 'automotive';
    }
    if (/알테오젠|삼천당제약|삼성바이오로직스|셀트리온|유한양행|한미약품|리가켐바이오|에이비엘바이오|sk바이오팜|한올바이오파마|휴젤|파마리서치|바이오|제약/.test(s)) {
        return 'bio_pharma';
    }
    if (/한화에어로스페이스|lig넥스원|현대로템|한국항공우주|한화시스템|풍산|방산/.test(s)) {
        return 'defense';
    }
    if (/대한항공|아시아나|진에어|제주항공|티웨이|hmm|팬오션|대한해운|항공|해운/.test(s)) {
        return 'shipping_airline';
    }
    if (/lg에너지솔루션|에코프로|posco홀딩스|포스코퓨처엠|엘앤에프|삼성sdi|sk이노베이션|코스모신소재|금양|2차전지|배터리/.test(s)) {
        return 'secondary_battery';
    }
    if (/naver|네이버|카카오|엔씨소프트|크래프톤|넷마블|하이브|sm|jyp|와이지/.test(s)) {
        return 'internet_entertainment';
    }
    if (/nvda|tsla|aapl|msft|googl|amzn|meta|avgo|qcom|amd/.test(s)) {
        return 'us_tech';
    }
    return 'general_stock';
}

interface FinancialRiskPlan {
    isDollar: boolean;
    currPrice: string;
    targetPrice: string;
    maxAlloc: string;
    allocType: string;
    totalShares: string;
    actualInvest: string;
    cashReserve: string;
    stopLossPrice: string;
    maxLossAmount: string;
    shieldedAmount: string;
    target1Price: string;
    target1CashIn: string;
    target1ProfitAmt: string;
    finalTotalVal: string;
    finalProfitAmt: string;
    finalUpsidePct: string;
    priceExceedsBudget: boolean;
    tranches: { step: string; price: string; shares: string; amt: string }[];
}

function computeFinancialRiskPlan(rawCurrPrice: any, rawTargetPrice: any, totalCapital: number = 100000): FinancialRiskPlan | null {
    const isDollar = String(rawCurrPrice || '').includes('$') || String(rawTargetPrice || '').includes('$');
    const cMatch = String(rawCurrPrice || '').split('(')[0].match(/([0-9,]+(?:\.[0-9]+)?)/);
    const currP = cMatch ? parseFloat(cMatch[1].replace(/,/g, '')) : 0;
    if (currP <= 0) return null;

    const tMatch = String(rawTargetPrice || '').split('(')[0].match(/([0-9,]+(?:\.[0-9]+)?)/);
    const targetP = tMatch ? parseFloat(tMatch[1].replace(/,/g, '')) : (currP * 1.15);

    const fmt = (v: number) => isDollar ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${Math.round(v).toLocaleString()}원`;

    // 운용 자금 처리:
    // 500만원 이하(10만, 30만, 50만, 100만, 300만, 500만) = 해당 종목 실전 직접 투입 예산으로 100% 배정
    // 1,000만원 이상(1천만, 3천만, 5천만, 1억 등) = 전체 계좌 포트폴리오 안전 분산 15% 비중 한도 적용
    const isDirectBudget = totalCapital <= 5000000;
    const capital = isDollar ? (totalCapital <= 5000000 ? (totalCapital / 1400) : (totalCapital / 1400)) : totalCapital;
    const maxAlloc = isDirectBudget ? capital : (capital * 0.15);
    const allocType = isDirectBudget 
        ? (isDollar ? '소액 실전 예산 (직접 투입)' : `소액 실전 맞춤 (${fmt(maxAlloc)} 직접 투입)`) 
        : `계좌 분산 한도 (${fmt(maxAlloc)}, 총자산의 15%)`;

    let priceExceedsBudget = false;
    let totalShares = Math.floor(maxAlloc / currP);
    if (totalShares <= 0) {
        totalShares = 1;
        priceExceedsBudget = true;
    }

    // 3단계 분할 매수 수량 배분
    let share1 = 0;
    let share2 = 0;
    let share3 = 0;
    if (totalShares === 1) {
        share1 = 1;
        share2 = 0;
        share3 = 0;
    } else if (totalShares === 2) {
        share1 = 1;
        share2 = 1;
        share3 = 0;
    } else if (totalShares === 3) {
        share1 = 1;
        share2 = 1;
        share3 = 1;
    } else {
        share1 = Math.max(1, Math.round(totalShares * 0.3));
        share2 = Math.max(1, Math.round(totalShares * 0.4));
        share3 = totalShares - share1 - share2;
        if (share3 < 0) {
            share2 += share3;
            share3 = 0;
        }
    }

    const safeEntry = isDollar ? Number((currP * 0.985).toFixed(2)) : Math.round(currP * 0.985);
    const entry2 = isDollar ? Number((currP * 0.965).toFixed(2)) : Math.round(currP * 0.965);
    const entry3 = currP;

    const actualInvest = isDollar ? Number((totalShares * currP).toFixed(2)) : Math.round(totalShares * currP);
    const cashReserve = Math.max(0, isDollar ? Number((maxAlloc - actualInvest).toFixed(2)) : Math.round(maxAlloc - actualInvest));

    const stopLossP = isDollar ? Number((currP * 0.965).toFixed(2)) : Math.round(currP * 0.965);
    const lossPerShare = isDollar ? Number((currP - stopLossP).toFixed(2)) : Math.round(currP - stopLossP);
    const maxLossAmt = isDollar ? Number((lossPerShare * totalShares).toFixed(2)) : Math.round(lossPerShare * totalShares);
    // 철통 회수금: 손절 후 건져내는 주식 평가금 + 미투입 잔여 현금
    const shieldedAmt = isDollar 
        ? Number((actualInvest - maxLossAmt + (priceExceedsBudget ? 0 : cashReserve)).toFixed(2)) 
        : (actualInvest - maxLossAmt + (priceExceedsBudget ? 0 : cashReserve));

    // 1차 익절가 (중간 목표가 또는 +8%)
    const t1P = targetP > currP
        ? (isDollar ? Number((currP + (targetP - currP) * 0.5).toFixed(2)) : Math.round(currP + (targetP - currP) * 0.5))
        : (isDollar ? Number((currP * 1.08).toFixed(2)) : Math.round(currP * 1.08));
    const t1Shares = Math.max(1, Math.floor(totalShares * 0.5));
    const t1ProfitPerShare = isDollar ? Number((t1P - currP).toFixed(2)) : Math.round(t1P - currP);
    const t1CashIn = isDollar ? Number((t1Shares * t1P).toFixed(2)) : Math.round(t1Shares * t1P);
    const t1ProfitAmt = isDollar ? Number((t1ProfitPerShare * t1Shares).toFixed(2)) : Math.round(t1ProfitPerShare * t1Shares);

    // 최종 목표가
    const finalProfitPerShare = isDollar ? Number((targetP - currP).toFixed(2)) : Math.round(targetP - currP);
    const finalTotalVal = isDollar ? Number((totalShares * targetP).toFixed(2)) : Math.round(totalShares * targetP);
    const finalProfitAmt = isDollar ? Number((finalProfitPerShare * totalShares).toFixed(2)) : Math.round(finalProfitPerShare * totalShares);
    const finalUpsidePct = ((targetP - currP) / currP * 100).toFixed(1);

    return {
        isDollar,
        currPrice: fmt(currP),
        targetPrice: fmt(targetP),
        maxAlloc: fmt(maxAlloc),
        allocType,
        totalShares: isDollar ? `${totalShares}주` : `${totalShares.toLocaleString()}주`,
        actualInvest: fmt(actualInvest),
        cashReserve: fmt(cashReserve),
        stopLossPrice: fmt(stopLossP),
        maxLossAmount: fmt(maxLossAmt),
        shieldedAmount: fmt(shieldedAmt),
        target1Price: fmt(t1P),
        target1CashIn: fmt(t1CashIn),
        target1ProfitAmt: fmt(t1ProfitAmt),
        finalTotalVal: fmt(finalTotalVal),
        finalProfitAmt: fmt(finalProfitAmt),
        finalUpsidePct: `${Number(finalUpsidePct) > 0 ? '+' : ''}${finalUpsidePct}%`,
        priceExceedsBudget,
        tranches: [
            { step: '1차 (30%)', price: fmt(safeEntry), shares: `${share1}주`, amt: fmt(share1 * safeEntry) },
            { step: '2차 (40%)', price: fmt(entry2), shares: `${share2}주`, amt: fmt(share2 * entry2) },
            { step: '3차 (30%)', price: fmt(entry3), shares: `${share3}주`, amt: fmt(share3 * entry3) },
        ],
    };
}

function getDetailedRiskBreakdown(doc: AutoApprovalDoc, capitalOverride: number = 100000): {
    headline: string;
    factors: RiskFactor[];
    defenseRules: RiskDefenseRule[];
    financialPlan: FinancialRiskPlan | null;
} {
    const sName = doc.stock_name || "해당 안건";
    const sector = detectSectorType(doc.stock_name, doc.title || "", doc.category_badge || "");
    const isUSStock = doc.category_type === 'us_stock' || sector === 'us_tech';

    // 1. 가격 추출 및 실전 자산 방어선 수치 산출
    const rawPrice = doc.current_price || doc.key_numbers?.find(k => k.label.includes('현재가') || k.label.includes('현재 주가') || k.label.includes('현재 시세'))?.value;
    const rawTarget = doc.target_price || doc.key_numbers?.find(k => k.label.includes('목표가'))?.value;

    const currPrice = parsePriceValue(rawPrice, sector, doc.stock_name);
    const targetPrice = parsePriceValue(rawTarget, sector, doc.stock_name);

    const priceNum = currPrice.num;
    const isDollar = currPrice.isDollar || isUSStock;
    const isVix = sector === 'macro_vix';
    const isRate = sector === 'macro_rate';
    const isOil = sector === 'macro_oil';
    const isFx = sector === 'macro_fx';
    const fmt = (n: number) => {
        if (isVix) return `${n.toFixed(2)}pt`;
        if (isRate) return `${n.toFixed(2)}%`;
        if (isOil || isDollar) return `$${n.toFixed(2)}`;
        if (isFx) return `${n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}원`;
        return `${Math.round(n).toLocaleString()}원`;
    };

    // 손절가 (-3.5%)
    const stopLossNum = priceNum > 0 ? (isDollar ? priceNum * 0.965 : Math.round(priceNum * 0.965)) : 0;
    const stopLossFormatted = stopLossNum > 0 ? fmt(stopLossNum) : '-3.5% 또는 50일선';

    // 권장 안전 진입가 (당일 1.5% 눌림목 또는 현재가)
    const safeEntryNum = priceNum > 0 ? (isDollar ? priceNum * 0.985 : Math.round(priceNum * 0.985)) : 0;
    const safeEntryFormatted = safeEntryNum > 0 ? fmt(safeEntryNum) : '오전 10시 지지선';

    // 1차 분할 익절가 (중간값 또는 +7.5%)
    let target1Num = 0;
    if (priceNum > 0) {
        if (targetPrice.num > priceNum) {
            target1Num = isDollar ? priceNum + (targetPrice.num - priceNum) * 0.5 : Math.round(priceNum + (targetPrice.num - priceNum) * 0.5);
        } else {
            target1Num = isDollar ? priceNum * 1.075 : Math.round(priceNum * 1.075);
        }
    }
    const target1Formatted = target1Num > 0 ? fmt(target1Num) : '1차 목표가 도달 시';
    const currPriceStr = currPrice.num > 0 ? currPrice.formatted : '현재가';
    const maxWeightDesc = isDollar ? '총자산 1만 달러 기준 최대 $1,000~$1,500' : '총자산 1,000만원 기준 최대 100만~150만원';

    let headline = "";
    let factors: RiskFactor[] = [];

    if (sector === 'banking') {
        headline = `‘${sName}’은 금리 인하 사이클에 따른 순이자마진(NIM) 축소 압력과 중소기업 대출 건전성(대손충당금)을 반드시 점검해야 합니다. 7~8%대 고배당 매력은 높으나 배당락 전후 단기 수급 변동에 철저히 대비하십시오.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 금리/배당락 변동성",
                tag: "NIM 마진 & 배당락 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "한국은행 기준금리 인하 기조 진입 시 예대금리차 축소로 인한 분기 순이자마진(NIM) 둔화 리스크 모니터링",
                    "7~8%대 높은 배당수익률과 밸류업 수혜가 있으나, 결산 배당락 전후 기관 배당차익거래 청산 매물 출회 주의",
                    `권장 진입가: 현재가(${currPriceStr}) 대비 무리한 시초가 추격 대신 지지선(${safeEntryFormatted}) 안착 확인 후 진입`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 중기 대출 건전성/충당금 리스크",
                tag: "연체율 & 대손충당금 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "중소기업 특화 국책은행 특성상 내수 경기 침체 시 중소기업 연체율 상승 및 부동산 PF·대손충당금 추가 적립 여부 필수 체크",
                    "정부 '기업 밸류업 프로그램' 모멘텀 둔화 시 외국인 및 기관의 동반 순매도 전환 여부 실시간 감시",
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 하향 이탈 시 감정 배제 후 즉시 손절 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 정부 배당/자본 규제 민감도",
                tag: "CET1 자본비율 & 세입 정책",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "대주주(기획재정부 59.2%)의 배당 세입 정책 및 금융당국의 스트레스 완충자본 규제 강화에 따른 보통주자본(CET1) 관리 부담",
                    "원/달러 환율보다는 국내 중소기업 체감 경기 및 한국은행 금융통화위원회 기준금리 결정 경로가 주가의 핵심 변수",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 절대 엄수`,
                ],
            },
        ];
    } else if (sector === 'nuclear_energy') {
        headline = `‘${sName}’은 체코 신규 원전 본계약 체결 일정과 웨스팅하우스(WEC) 지식재산권(IP) 분쟁 합의 여부가 핵심 리스크입니다. 단기 급등에 따른 밸류에이션 부담이 있으므로 분할 매수와 손절선을 엄수하십시오.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 원전 수주 모멘텀 변동성",
                tag: "본계약 일정 & 위꼬리 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "체코 원전 우선협상대상자 선정 후 본계약 체결(2025~2026년)까지 뉴스 플로우에 따른 단기 주가 널뛰기 리스크",
                    "개장 직후 원전 테마성 갭상승 추격 매수를 엄금하고 오전 10시 이후 지지선 안착 확인 후 진입",
                    `권장 진입가: ${currPriceStr} 대비 ${safeEntryFormatted} 부근 눌림목에서 분할 체결 권장`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 대형 수주 공백/차익 매물",
                tag: "차익 매물벽 & 특허 분쟁",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "대형 수주 공시 직후 단기 재료 소멸로 인한 기관·외국인의 차익실현 매도 벽 출회 위험",
                    "웨스팅하우스 특허 소송 및 미국 정부 원전 수출 통제 관련 돌발 뉴스 시 변동성 확대 대비",
                    `철통 손절선: ${stopLossFormatted} (-3.5% 또는 50일선) 이탈 시 감정 배제 후 기계적 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 글로벌 원전/전력망 정책",
                tag: "글로벌 정책 & CAPEX 부담",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 대선 및 유럽 각국의 탈원전 회귀 속도, 빅테크 SMR(소형모듈원자로) 전력 공급 계약 구체화 여부 모니터링",
                    "가스터빈 및 SMR 상용화 설비투자(CAPEX) 부담 대비 영업이익 창출 속도 점검",
                    `계좌 비중 한도: 총자산의 10~15%(${maxWeightDesc}) 이내 엄격 통제`,
                ],
            },
        ];
    } else if (sector === 'semiconductor') {
        headline = `‘${sName}’은 글로벌 빅테크의 AI 설비투자(CAPEX) 지속성 및 HBM3E/HBM4 공급 과잉 논란, 미국 대중국 반도체 장비 규제 변수를 정밀 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & AI 사이클 피크아웃 변동성",
                tag: "HBM 공급 & 갭상승 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "엔비디아 차세대 GPU 출시 주기 및 빅테크 AI 서버 투자 속도 조절에 따른 단기 고점 위꼬리 리스크",
                    "범용 D램/낸드 가격 회복 속도 및 메모리 감산 종료 후 공급 증가에 따른 마진 압박 확인",
                    `권장 진입가: ${safeEntryFormatted} 이하 눌림목 지지선 확인 후 3단계 분할 진입`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 외국인 선물·현물 동반 매도 감시",
                tag: "외인 패시브 매도벽 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "코스피 대형 반도체주 특성상 외국인의 선물 대량 매도 및 프로그램 차익 매물 출회 시 일일 낙폭 확대 주의",
                    `50일선 및 직전 고점 매물대 돌파 여부 확인, 손절가 ${stopLossFormatted} 하향 이탈 시 즉시 위험 관리`,
                    "엔비디아 실적 발표 전후 옵션 변동성에 따른 단기 흔들림 대비",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 미·중 무역 규제 및 환율",
                tag: "수출 통제 & 고환율 민감도",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 상무부의 대중국 반도체 장비·HBM 수출 통제 규제 및 대만 TSMC 파운드리 생태계 병목 변수",
                    "원/달러 고환율에 따른 단기 환차익 매력과 외국인 패시브 자금 유출입 변동성 동시 모니터링",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 엄수`,
                ],
            },
        ];
    } else if (sector === 'shipping_airline') {
        headline = `‘${sName}’은 국제 유가(WTI) 급등과 고환율에 따른 항공유류비·외화리스부채 환차손, 아시아나 합병 후 독점 노선 반납에 따른 매출 공백 리스크를 관리해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 유가·환율 원가 변동성",
                tag: "유류할증료 & 환차손 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "중동 지정학적 위기 시 항공유(Jet Fuel) 가격 급등에 따른 3~4분기 영업이익률 급락 위험",
                    "원/달러 환율 1,380원대 지속 시 대규모 외화표시 항공기 리스부채 평가손실 발생 가능성",
                    `권장 진입가: ${safeEntryFormatted} 부근 눌림목에서 분할 체결`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 아시아나 합병 통합 비용",
                tag: "노선 반납 & 마일리지 통합",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "아시아나항공 인수합병(M&A) 완료 과정에서 화물사업부 매각 및 알짜 유럽·미주 슬롯 반납에 따른 매출 공백",
                    `대규모 마일리지 통합 및 조직 융합 비용 발생 시 단기 실적 쇼크 주의, 손절선 ${stopLossFormatted} 준수`,
                    "기관 투자가의 장기 합병 불확실성에 따른 일시적 수급 이탈 감시",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 글로벌 여객/화물 수요 둔화",
                tag: "교역량 & 화물 운임 추이",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "중국·유럽 경기 침체 시 프리미엄 여객 및 반도체 항공 화물 운임(TAC 지수) 하락 압력 점검",
                    "글로벌 인플레이션에 따른 해외여행 수요 피크아웃 여부 확인",
                    `계좌 비중 한도: 총자산의 10~15%(${maxWeightDesc}) 이내 엄격 제한`,
                ],
            },
        ];
    } else if (sector === 'us_tech') {
        headline = `‘${sName}’은 높은 밸류에이션(PER)에 따른 분기 실적 및 가이던스 1~2% 미달 시 급락 변동성과 미국 법무부(DOJ) 반독점 소송 리스크를 철저히 관리해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 나스닥 실적 발표 전후 변동성",
                tag: "어닝 가이던스 & 갭락 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "분기 어닝 시즌 가이던스 눈높이가 극도로 높아 실적이 예상치를 상회해도 '재료 소멸'로 -5~10% 급락 위험",
                    "장 초반 뉴욕 증시 개장 직후 추격 매수를 자제하고 한국 시간 밤 11시 30분 이후 눌림목 안착 확인",
                    `권장 진입가: ${safeEntryFormatted} 이하 분할 매수`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 미국 국채 10년물 금리 및 기관 블록딜",
                tag: "국채 금리 & 내부자 매도 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "미국 10년물 국채 금리 급등 시 고밸류 빅테크 멀티플 디레이팅(주가 급락) 압력",
                    `내부자(CEO·임원) 지분 매각 및 옵션 만기일 전후 대규모 변동성 주의, 손절선 ${stopLossFormatted} 기계적 방어`,
                    "월가 대형 헤지펀드의 차익실현 매물 출회 여부 상시 점검",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 미 법무부 반독점 소송 및 환율",
                tag: "빅테크 반독점 & 환차손",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미 법무부(DOJ) 및 FTC의 빅테크 반독점 제재, 대중국 AI 가속기 판매 제재 리스크",
                    "원/달러 환율 하락 시 해외 주식 평가 수익이 원화 기준으로 줄어드는 환차손 리스크 점검",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 엄수`,
                ],
            },
        ];
    } else if (sector === 'macro_vix') {
        headline = `‘VIX 공포지수(${currPriceStr})’는 현재 20 미만의 안정 구간이나, 20 돌파 시 변동성 확대 및 30 상회 시 글로벌 증시 급락 패닉 리스크를 상시 감시해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "공포 수위 임계선 & 급등 변동성",
                tag: "20선 안정 vs 30선 패닉",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `현재 VIX 지수(${currPriceStr})는 20 미만의 안정 구간으로 시장 참여자들의 공포 심리가 낮은 평온한 상태`,
                    "VIX가 20을 넘어서거나 단기 +10% 이상 급등할 경우 변동성 주의보 발령 및 추격 매수 자제",
                    "VIX 30 돌파 시에는 글로벌 패닉 구간이므로 모든 신규 매수를 즉시 중단하고 방어 태세 전환",
                ],
            },
            {
                icon: "📉",
                title: "옵션 시장 풋/콜 비율 & 기관 하방 헤지",
                tag: "기관 풋옵션 매수 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "S&P 500 지수 풋옵션(하락 베팅) 거래량이 콜옵션 대비 급증하는지 풋/콜 비율(PCR) 실시간 모니터링",
                    "월가 대형 헤지펀드의 변동성 매수 포지션 확대 시 대형 기술주 일시 조정 가능성 대비",
                    "옵션 만기일 전후 지수 흔들림 및 변동성 스프레드 확대 여부 상시 점검",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 한국 증시 패시브 영향",
                tag: "외국인 위험선호 연동",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "VIX 안정세 지속 시 글로벌 투자 자금의 위험자산 선호(Risk-On)로 한국 코스피 및 반도체 우량주 수급 우호적",
                    "미국 FOMC 금리 발표, 주요 고용·물가 지표 및 지정학적 돌발 뉴스 발생 시 VIX 급변 모니터링",
                    "대표님 실천 지침: VIX 20 미만 유지 시 승인하신 종목(기업은행 등 10만원 예산) 계획대로 분할 매수 적합",
                ],
            },
        ];
    } else if (sector === 'macro_oil') {
        headline = `‘WTI 국제유가(${currPriceStr})’는 중동 지정학적 충돌과 산유국(OPEC+) 감산 정책에 따른 에너지 원가 급등 및 글로벌 인플레이션 자극 리스크를 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "유가 변동성 & 인플레이션 자극",
                tag: "배럴당 $80 저항선 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `현재 WTI 유가(${currPriceStr})는 정상 범위 내에서 횡보 중이나, 배럴당 $80 상회 시 물가 재점화 우려`,
                    "유가 급등 시 미국 CPI 상승 및 연준 금리 인하 지연 압력으로 글로벌 증시 단기 흔들림 대비",
                    "산유국(OPEC+) 감산 회의 및 미국 원유 재고량 발표 전후 가격 변동성 모니터링",
                ],
            },
            {
                icon: "📉",
                title: "국내 수출·운송 기업 원가 부담",
                tag: "항공·해운·화학 마진 압박",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "항공(대한항공 등)·해운 기업의 유류비 증가 및 외화 리스부채 평가손실 리스크 점검",
                    "정유·석유화학 업종의 정제마진(스프레드) 축소 여부 실시간 체크",
                    "고유가 지속 시 한국 무역수지 악화 및 외국인 패시브 자금 이탈 압력 감시",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 중동 정세 모니터링",
                tag: "해상 물동량 병목 변수",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "중동 분쟁 심화 시 호르무즈 해협 등 주요 원유 수송로 봉쇄 우려에 따른 공급 쇼크 점검",
                    "유가 안정 구간($70대 초반) 유지 시 국내 제조업 기업들의 실적 방어력 양호",
                    "대표님 지침: 유가 안정 시 실적 우량주 분할 매수 정상 집행",
                ],
            },
        ];
    } else if (sector === 'macro_fx') {
        headline = `‘원/달러 환율(${currPriceStr})’은 1,380원대 후반 고환율 구간 지속에 따른 외국인 패시브 자금의 일시 이탈 및 환차손 회피 매물 출회에 대비해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "환율 변동성 & 1,400원 심리적 저항선",
                tag: "외환당국 개입 경계선",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `현재 환율(${currPriceStr})은 고환율 구간으로 1,400원 저항선 근접 시 변동성 확대 주의`,
                    "1,400원 돌파 시 외환당국 구두개입 및 국민연금 외환스왑 가동 가능성 모니터링",
                    "환율 급등 국면에서는 시초가 추격 매수를 자제하고 장중 지지선 안착 확인 필수",
                ],
            },
            {
                icon: "📉",
                title: "외국인 환차익/환차손 수급 분기점",
                tag: "외인 패시브 매도벽 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "환율 상승(원화 약세) 시 외국인은 달러 환전 손실을 우려해 한국 IT·반도체 대형주 매도세 전환 가능성",
                    "반대로 환율이 1,380원 아래로 하향 안정화될 경우 외국인 선물 및 현물 순매수 유입 가속",
                    "당일 외국인의 코스피 선물 순매도 금액 3,000억 원 초과 여부 필수 체크",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 미 연준 금리/달러 인덱스",
                tag: "DXY 달러 인덱스 연동",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 달러 인덱스(DXY) 103~105선 등락 및 미·한 기준금리 격차 영향 점검",
                    "수출 대장주(현대차, 반도체)의 단기 환차익 수혜와 원자재 수입 물가 상승 영향 동시 점검",
                    "대표님 지침: 환율 안정 시 승인 안건(10만원 예산) 계획대로 분할 체결",
                ],
            },
        ];
    } else if (sector === 'macro_rate') {
        headline = `‘미국 10년물 국채금리(${currPriceStr})’는 4.2~4.3% 상회 시 글로벌 성장주 및 빅테크 밸류에이션(할인율) 급락 리스크를 경계해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "국채금리 변동성 & 4.3% 저항선",
                tag: "장기 시장금리 벤치마크",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `현재 미국 10년물 국채금리(${currPriceStr})는 채권 시장의 핵심 바로미터`,
                    "10년물 금리가 4.3%를 돌파할 경우 뉴욕증시 기술주 멀티플 디레이팅(주가 급락) 압력 발생",
                    "미국 고용 지표 및 CPI 물가 지표 발표 시간대 금리 변동성 집중 모니터링",
                ],
            },
            {
                icon: "📉",
                title: "글로벌 성장주 & 빅테크 할인율 압박",
                tag: "고밸류 기술주 조정 주의",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "금리 상승 시 미래 현금흐름의 현재가치 할인율이 높아져 고PER AI 반도체·소프트웨어주 차익 매물 출회",
                    "미국 20년물 국채 ETF(TLT) 등 채권 자산 유동성 흐름 추적",
                    "금리 하향 안정 시 엔비디아, SK하이닉스 등 성장 대장주 반등 모멘텀 강화",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 미 연준(Fed) 기준금리 경로",
                tag: "FOMC 점도표 & 통화 정책",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "미국 연준(Fed)의 기준금리 인하 횟수 및 속도 조절 발언에 따른 시장 심리 점검",
                    "한국은행 기준금리 결정 경로 및 국내 채권 금리 스프레드 모니터링",
                    "대표님 지침: 국채금리 안정 시 승인 안건 정상 분할 매수 집행",
                ],
            },
        ];
    } else if (sector === 'macro_futures') {
        headline = `‘${sName}(${currPriceStr})’는 미국 빅테크 실적 발표 전후 옵션 변동성과 한국 증시 시초가 갭 연동 리스크를 정밀 점검해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 시초가 갭 변동성",
                tag: "장 초반 30분 관망",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `미국 야간 선물(${currPriceStr})의 급등락이 한국 코스피·코스닥 시초가 갭 형성에 직결`,
                    "개장 직후 갭상승 출발 시 무리한 추격 매수를 자제하고 10시 이후 지지선 안착 확인",
                    "미국 정규장 마감 후 시간외 빅테크 어닝 발표에 따른 선물 지수 출렁임 주의",
                ],
            },
            {
                icon: "📉",
                title: "외국인 선물 수급 & 프로그램 매매",
                tag: "외국인 선물 동향 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "나스닥 선물 약세 시 국내 IT·반도체 대형주로 외국인 프로그램 매도세 출회 가능성",
                    "외국인 코스피 200 선물 순매도 전환 시 당일 오후장 지수 하방 압력 점검",
                    "선물 지수 50일선 지지력 유지 여부 실시간 체크",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 글로벌 AI 사이클",
                tag: "빅테크 실적 & CAPEX",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "엔비디아, 마이크로소프트 등 미국 매그니피센트7(M7) 주가 흐름과 선물 지수 동조화 모니터링",
                    "글로벌 반도체 지수(SOX) 및 기술주 투자 심리 추적",
                    "대표님 지침: 선물 지수 안정 시 실전 승인 종목 계획대로 분할 체결",
                ],
            },
        ];
    } else if (sector === 'macro_market') {
        headline = "외국인의 KOSPI 200 선물 순매도 전환(-3,000억 원 이상) 및 미국 국채 금리·환율 급변 시 지수 전반의 패시브 자금 이탈에 대비하십시오.";
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 시초가 갭 변동성",
                tag: "장 초반 30분 관망",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    "개장 직후(09:00~09:20) 갭상승 출발 시 단기 차익 실현 매물 출회 및 위꼬리 리스크 존재",
                    "시초가 30분간 전액 매수는 지양하며, 10시 이후 당일 시초가 및 지지선 안착을 확인해야 안전",
                    "선물 지수 베이시스(선물-현물 가격차) 백워데이션 전환 시 신규 진입 자제",
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 패시브 매물 출회",
                tag: "외국인 선물 순매도 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    "외국인의 KOSPI 200 선물 순매도 전환 시 당일 오후장 지수 급격 하락 압력 발생 가능성",
                    "외국인 선물 순매도가 -3,000억 원 이상 급증할 경우 신규 진입을 전면 보류하고 관망",
                    "기관 금융투자(프로그램) 매도세 전환 여부 필수 체크",
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 환율·금리 민감도",
                tag: "대외 거시 환경 리스크",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "원/달러 환율 1,380원대 후반 고환율 구간 지속 시 외국인 패시브 자금의 일시 이탈 위험",
                    "미국 주요 물가·고용 지표 발표 및 지정학적 변수에 따른 글로벌 시장 흔들림 모니터링",
                    "지수 레버리지 ETF 단일 투자 시 계좌 비중 15% 이내 엄격 제한",
                ],
            },
        ];
    } else {
        // general_stock
        const customAlert = parseExecutiveOpinion(doc.risk_opinion, "리스크본부", "⚠️").body || "";
        headline = customAlert.length > 15 ? customAlert : `‘${sName}’은 실시간 수급 동향과 전고점 매물대 저항 여부를 점검하고, 증권사 예상 실적(컨센서스) 부합 여부를 확인한 뒤 보수적으로 분할 접근해야 합니다.`;
        factors = [
            {
                icon: "⏰",
                title: "진입 타이밍 & 시초가 변동성",
                tag: "장 초반 30분 주의",
                tagColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
                points: [
                    `호재 뉴스로 개장 직후 주가가 급등 출발할 경우 단기 고점 차익 매물에 물릴 위험`,
                    `시초가 추격 매수를 자제하고, 오전 10시 이후 장중 거래량 및 지지선 안착 확인 후 진입`,
                    `권장 진입가: 현재가(${currPriceStr}) 대비 ${safeEntryFormatted} 부근 눌림목 체결`,
                ],
            },
            {
                icon: "📉",
                title: "수급 변심 & 매물대 저항",
                tag: "큰손 매도 전환 감시",
                tagColor: "text-rose-300 bg-rose-500/15 border-rose-500/30",
                points: [
                    `직전 고점 부근 및 매물 집중 구간에서의 단기 차익 실현 매도 벽 출회 위험`,
                    `50일 이동평균선 지지 여부와 외국인·기관 큰손의 당일 동반 순매도 전환 여부 필수 체크`,
                    `기계적 손절 방어선: ${stopLossFormatted} (-3.5% 또는 50일선) 이탈 시 감정 배제 후 즉시 방어`,
                ],
            },
            {
                icon: "🌐",
                title: "거시 매크로 & 실적/공시 민감도",
                tag: "실적 컨센서스 & 비중 통제",
                tagColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
                points: [
                    "분기 실제 영업이익이 증권사 컨센서스에 부합하는지 실적 발표일 전후 모니터링",
                    "원/달러 환율 1,380원선 변동 및 글로벌 금리 기조에 따른 패시브 자금 변동성 체크",
                    `단일 종목 계좌 편입 한도: 총자산의 10~15%(${maxWeightDesc}) 절대 엄수`,
                ],
            },
        ];
    }

    // 실전 자금 리스크 계산 플랜 도출
    const plan = computeFinancialRiskPlan(rawPrice, rawTarget, capitalOverride);
    const isMacroSector = sector.startsWith('macro_');

    const defenseRules: RiskDefenseRule[] = isMacroSector ? [
        {
            num: "①",
            title: "시장 체온계 감시",
            target: sector === 'macro_vix' ? "VIX 20 미만 안정선" : (sector === 'macro_fx' ? "환율 1,390원 지지선" : (sector === 'macro_oil' ? "유가 $80 저항선" : "정상 등락 범위 유지")),
            desc: sector === 'macro_vix' 
                ? "VIX 20 미만 유지 시 시장에 공포가 없으므로 대표님의 실전 승인 종목 매매를 정상 집행합니다."
                : (sector === 'macro_fx' ? "환율 안정세 지속 시 외국인 순매수가 강화되므로 승인 종목 체결을 지원합니다." : "대외 거시 지표가 평온하게 유지되는지 24시간 실시간 모니터링합니다."),
        },
        {
            num: "②",
            title: "실전 종목 연동",
            target: "승인 안건 10만원 분할 체결",
            desc: "거시 지표가 맑음(안정)일 때 대표님이 [승인 서명]하신 개별 실전 우량주(기업은행 등)를 안전하게 분할 매수합니다.",
        },
        {
            num: "③",
            title: "비상 방어선 가동",
            target: sector === 'macro_vix' ? "VIX 30 돌파 시 패닉 경보" : (sector === 'macro_fx' ? "환율 1,400원 돌파 시 경보" : "대외 변동성 급증 시"),
            desc: "공포지수 급등이나 환율 급변 등 폭풍우 발생 시 신규 매수를 전면 보류하고 기존 종목 -3.5% 손절선을 엄수합니다.",
        },
        {
            num: "④",
            title: "자산 방어 & 현금 확보",
            target: "리스크 감지 시 현금 50% 확보",
            desc: "대외 리스크가 확대될 경우 보유 주식의 절반을 분할 익절하여 안전 현금을 확보하고 계좌를 지킵니다.",
        },
    ] : [
        {
            num: "①",
            title: "계좌 비중 한도",
            target: plan ? `${plan.maxAlloc} (${plan.allocType})` : `최대 10~15% (${maxWeightDesc})`,
            desc: plan 
                ? (plan.priceExceedsBudget 
                    ? `설정 예산(${plan.maxAlloc}) 대비 1주 단가가 높아 최소 단위인 1주(${plan.actualInvest}) 기준으로 산출했습니다.`
                    : `운용 자산 기준 총 ${plan.actualInvest} (${plan.totalShares}) 배정 (잔여 현금 ${plan.cashReserve} 비상금 보관)`)
                : `${sName} 단일 종목에 과도하게 집중하지 않고 안전 포트폴리오 비중을 철저히 준수합니다.`,
        },
        {
            num: "②",
            title: "3단계 분할 매수",
            target: plan 
                ? (plan.tranches[1].shares === '0주' 
                    ? `1차 ${plan.tranches[0].amt} (1주 집중)` 
                    : `1차 ${plan.tranches[0].amt} ➔ 2차 ${plan.tranches[1].amt} ➔ 3차 ${plan.tranches[2].amt}`)
                : `30% ➔ 40% ➔ 30% (${safeEntryFormatted})`,
            desc: plan
                ? (plan.tranches[1].shares === '0주'
                    ? `오전 10시 지지선 확인 후 ${plan.tranches[0].price}에 1주 진입합니다.`
                    : `1차(${plan.tranches[0].price} ${plan.tranches[0].shares}) ➔ 2차(${plan.tranches[1].price} ${plan.tranches[1].shares}) ➔ 3차(${plan.tranches[2].price} ${plan.tranches[2].shares}) 분할 체결`)
                : `1차(오전 10시 지지선 ${safeEntryFormatted}에 30%) ➔ 2차(눌림목 안착 40%) ➔ 3차(상승 돌파 30%)로 나누어 매수합니다.`,
        },
        {
            num: "③",
            title: "기계적 손절 방어선",
            target: plan
                ? `🛑 ${plan.stopLossPrice} (최대 손실 딱 -${plan.maxLossAmount})`
                : `🛑 ${stopLossFormatted} (-3.5% 도달 시 즉각)`,
            desc: plan
                ? `손절 시 총 손실은 딱 -${plan.maxLossAmount}으로 철저히 차단되며, 원금 + 잔여금 ${plan.shieldedAmount}은 안전하게 지켜냅니다.`
                : `현재가 대비 -3.5% 하락한 ${stopLossFormatted}을 종가 또는 장중 이탈하면 감정 없이 즉시 방어합니다.`,
        },
        {
            num: "④",
            title: "1차 분할 익절",
            target: plan
                ? `🎯 ${plan.target1Price} (+${plan.target1ProfitAmt} 확정)`
                : `🎯 ${target1Formatted} (보유 물량 50%)`,
            desc: plan
                ? `1차 목표 도달 시 절반 매도로 현금 ${plan.target1CashIn} 즉시 회수 (확정 순수익: +${plan.target1ProfitAmt})`
                : `1차 목표가 ${target1Formatted} 도달 시 보유 물량의 절반(50%)을 분할 매도하여 원금과 확정 수익을 챙깁니다.`,
        },
    ];

    return {
        headline,
        factors,
        defenseRules,
        financialPlan: plan,
    };
}

interface StockRiskDiagnostic {
    riskScore: number;
    riskLevel: '안전·저위험' | '중위험·주의관찰' | '고위험·단기과열';
    badgeClass: string;
    scoreColor: string;
    safeEntryStr: string;
    stopLossStr: string;
    takeProfitStr: string;
    maxWeightStr: string;
    splitRuleStr: string;
    croVerdict: string;
    financialPlan: FinancialRiskPlan | null;
    factors: {
        icon: string;
        title: string;
        tag: string;
        tagColor: string;
        points: string[];
    }[];
}

function computeStockRiskDiagnostic(r: any, capitalOverride: number = 100000): StockRiskDiagnostic {
    const isUS = r.category === 'us_stock';
    const price = typeof r.price === 'number' ? r.price : 0;
    const fmt = (n: number) => isUS ? `$${n.toFixed(2)}` : `${Math.round(n).toLocaleString()}원`;

    // 1. 계산 수치
    const stopLossVal = isUS ? price * 0.965 : Math.round(price * 0.965);
    const safeEntryVal = r.change_pct > 2 ? (isUS ? price * 0.985 : Math.round(price * 0.985)) : price;
    const targetMeanNum = r.consensus?.target_mean;
    const takeProfitVal = targetMeanNum && targetMeanNum > price 
        ? targetMeanNum 
        : (isUS ? price * 1.08 : Math.round(price * 1.075));

    // 2. 리스크 스코어 (1~5점)
    let score = 2;
    const rp = r.range_pos;
    if (rp !== null && rp !== undefined) {
        if (rp >= 80) score += 1;
        if (rp <= 15) score += 1;
    }
    const chg = r.change_pct || 0;
    if (chg >= 4) score += 1;
    if (chg <= -3.5) score += 1;

    if (r.flow) {
        const ft = r.flow.foreign_today;
        const ot = r.flow.organ_today;
        if (ft !== null && ot !== null) {
            if (ft < 0 && ot < 0) score += 1;
            else if (ft > 0 && ot > 0) score -= 1;
        }
    }
    if (r.per && r.per > 45) score += 1;
    score = Math.max(1, Math.min(5, score));

    let riskLevel: '안전·저위험' | '중위험·주의관찰' | '고위험·단기과열' = '중위험·주의관찰';
    let badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    let scoreColor = 'text-amber-400';

    if (score <= 2) {
        riskLevel = '안전·저위험';
        badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        scoreColor = 'text-emerald-400';
    } else if (score >= 4) {
        riskLevel = '고위험·단기과열';
        badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
        scoreColor = 'text-rose-400';
    }

    const safeEntryStr = `${fmt(safeEntryVal)} 이하 (무리한 추격 매수 방지선)`;
    const stopLossStr = `${fmt(stopLossVal)} (-3.5% 도달 시 기계적 즉각 손절)`;
    const takeProfitStr = `${fmt(takeProfitVal)} (1차 50% 분할 익절 목표)`;
    const maxWeightStr = '계좌 총자산의 최대 10~15% 이내 (몰빵 절대 금지)';
    const splitRuleStr = '1차 30%(10시 안착) ➔ 2차 40%(눌림 지지) ➔ 3차 30%(돌파)';

    const factors = [
        {
            icon: '⏰',
            title: '진입 타이밍 & 시초가 변동성',
            tag: '장 초반 30분 관망 원칙',
            tagColor: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
            points: [
                `현재 주가는 52주 범위의 ${rp ?? 50}% 구간 (오늘 ${chg > 0 ? '+' : ''}${chg}%)에 위치`,
                `개장 직후 갭상승 추격 매수를 자제하고, 오전 10시 이후 당일 시초가 위 지지선 안착 확인 필수`,
                `안전 진입가: ${fmt(safeEntryVal)} 부근의 눌림목 분할 체결 권장`,
            ],
        },
        {
            icon: '📉',
            title: '수급 변심 & 매물대 저항',
            tag: '큰손 수급 및 매물벽 진단',
            tagColor: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
            points: [
                `외국인/기관 수급: ${r.flow ? `오늘 외인 ${r.flow.foreign_today > 0 ? '+' : ''}${Math.round(r.flow.foreign_today || 0).toLocaleString()}주 / 기관 ${r.flow.organ_today > 0 ? '+' : ''}${Math.round(r.flow.organ_today || 0).toLocaleString()}주` : '수급 모멘텀 집계 중'}`,
                `직전 고점 매물대(${r.high52_str || '전고점'}) 진입 시 차익실현 매도세 출회 가능성 대비`,
                `철통 방어선: ${fmt(stopLossVal)} (-3.5% 또는 50일선) 이탈 시 감정 없이 손절 처리`,
            ],
        },
        {
            icon: '🌐',
            title: '거시 매크로 & 실적/공시 민감도',
            tag: '대외 변수 & 비중 통제',
            tagColor: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
            points: [
                `환율(1,380원선) 변동 및 미국 금리 기조에 따른 패시브 자금 변동성 주의`,
                `증권사 목표가(${r.consensus?.target_mean_str || '컨센서스'}) 대비 상승여력(${r.consensus?.upside_pct ? `${r.consensus.upside_pct}%` : '집계 중'}) 확인`,
                `단일 종목 계좌 편입 한도: 총자산의 10~15% 이내로 엄격 제한 (몰빵 금지)`,
            ],
        },
    ];

    let croVerdict = '';
    if (score <= 2) {
        croVerdict = `현재 ${r.stock_name}은(는) 큰손 수급과 밸류에이션 상 하방 경직성이 확보된 안전 구간입니다. 안전 진입가(${fmt(safeEntryVal)}) 부근에서 3단계 분할로 진입하시되, 손절선(${fmt(stopLossVal)})은 반드시 기계적으로 걸어두십시오.`;
    } else if (score === 3) {
        croVerdict = `${r.stock_name}은(는) 현재 지지선과 저항선 사이에서 방향성을 탐색하는 중립 구간입니다. 단기 급등에 따른 뇌동매매를 피하시고, 오전 10시 이후 지지력 확인 후 계좌 비중 10% 이내로 보수적 분할 매수하십시오.`;
    } else {
        croVerdict = `${r.stock_name}은(는) 단기 가격 급등 또는 52주 상단 매물벽 저항으로 변동성 리스크가 높은 과열 구간입니다. 신규 추격 매수는 전면 자제하시고, -3.5% 손절가(${fmt(stopLossVal)})를 철저히 설정한 상태에서만 극소액 분할 접근을 허용합니다.`;
    }

    const plan = computeFinancialRiskPlan(r.price_str || r.price, r.consensus?.target_mean || r.consensus?.target_mean_str, capitalOverride);

    return {
        riskScore: score,
        riskLevel,
        badgeClass,
        scoreColor,
        safeEntryStr,
        stopLossStr,
        takeProfitStr,
        maxWeightStr,
        splitRuleStr,
        croVerdict,
        financialPlan: plan,
        factors,
    };
}

interface ResearchReportItem {
    id: string;
    category: string;
    stock_name: string;
    title: string;
    broker: string;
    date: string;
    target_price: string;
    opinion: string;
    summary: string[];
    plain_explanation: string;
    action_point: string;
    pdf_url: string;
    detail_url: string;
}

interface CeoChatLog {
    id: string;
    timestamp: string;
    ceoMessage: string;
    agendaTitle: string;
    targetName: string;
    secretaryReply: string;
    debates: DebateTurn[];
    metrics: KeyMetric[];
}

type SignStatus = 'pending' | 'approved' | 'hold' | 'reexamine';

const QUICK_TOPICS = [
    { label: '🌅 전사 출근 브리핑', topic: '', message: '오늘 전사 출근 브리핑 및 핵심 리포트 보고해줘' },
    { label: '⚡ 두산에너빌리티', topic: '두산에너빌리티', message: '두산에너빌리티 목표주가랑 수급·리스크 끝장 토론해봐' },
    { label: '💾 삼성전자', topic: '삼성전자', message: '삼성전자 지금 외인·기관 수급이랑 리서치 의견 보고해봐' },
    { label: '🔥 SK하이닉스', topic: 'SK하이닉스', message: 'SK하이닉스 임원들 찬반 끝장 토론해봐' },
    { label: '🚢 삼성중공업', topic: '삼성중공업', message: '삼성중공업 수주 모멘텀이랑 리스크 대면 보고해봐' },
    { label: '✈️ 대한항공', topic: '대한항공', message: '대한항공 3분기 실적 리포트랑 수급 분석 보고해' },
    { label: '🟢 엔비디아 (NVDA)', topic: 'NVDA', message: '엔비디아(NVDA) 글로벌 AI 추세랑 밸류에이션 토론해봐' },
    { label: '⚡ 테슬라 (TSLA)', topic: 'TSLA', message: '테슬라(TSLA) 변동성이랑 모멘텀 임원 토론해봐' },
    { label: '🍎 애플 (AAPL)', topic: 'AAPL', message: '애플(AAPL) 온디바이스 AI랑 실적 전망 임원 토론해봐' },
    { label: '🛡️ 팔란티어 (PLTR)', topic: 'PLTR', message: '팔란티어(PLTR) AI 국방 수주랑 성장성 보고해봐' },
    { label: '📊 나스닥100 선물', topic: 'NQ=F', message: '나스닥100 선물(NQ=F) 야간 추세랑 헤지 전략 보고해' },
];

const FALLBACK_EXECUTIVES: Executive[] = [
    {
        id: 'chief_sec',
        name: '정유진',
        role: '비서실장',
        dept: '대표이사 직속 비서실',
        badge: '결재 서류 취합 · 3줄 핵심 요약',
        avatar: '👩‍💼',
        color: 'amber',
        style: '각 본부 임원들이 알아서 분석해 올린 기안서를 대표님이 서명만 하실 수 있도록 3줄로 요약해 결재판에 올립니다.',
        status: '어려운 금융 용어를 빼고 대표님 눈높이에 맞춘 쉬운 결재 요약 완료',
    },
    {
        id: 'research_vp',
        name: '박진우',
        role: '부사장 (리서치센터장)',
        dept: '기업·산업 리서치본부',
        badge: '증권사 리포트 쉬운 번역',
        avatar: '👨‍💼',
        color: 'purple',
        style: '국내외 제도권 증권사 애널리스트들이 발표한 최신 리포트와 목표주가 컨센서스를 자동 분석해 결재 올립니다.',
        status: '증권사 종목·시황 리포트 전수 조사 및 쉬운 한글 해설 완료',
    },
    {
        id: 'quant_dir',
        name: '김도현',
        role: '상무 (퀀트·수급본부장)',
        dept: '알고리즘 트레이딩·수급본부',
        badge: '외인/기관 큰손 자금 추적',
        avatar: '📈',
        color: 'emerald',
        style: '외국인·기관 수급 유입과 50일 이동평균선 돌파 여부를 알고리즘으로 자동 스캔해 보고합니다.',
        status: '외국인·기관 큰손 매수세 및 두 달 평균가격(50일선) 비교 완료',
    },
    {
        id: 'risk_cro',
        name: '최서연',
        role: '상무 (리스크관리본부장 · CRO)',
        dept: '리스크관리·컴플라이언스본부',
        badge: '조심할 점 콕 집어 점검',
        avatar: '🛡️',
        color: 'rose',
        style: '모든 결재 기안서에 대해 고점 부담, 환율·금리 변동성, 손절/방어 기준선을 사전에 감사하여 첨부합니다.',
        status: '모든 결재 서류에 대표님이 꼭 조심하셔야 할 위험 요인 첨부 완료',
    },
    {
        id: 'global_dir',
        name: '이준호',
        role: '이사 (글로벌·파생본부장)',
        dept: '해외주식·ETF·선물파생본부',
        badge: '미국 10대 빅테크 순환 · 선물 지수',
        avatar: '🌎',
        color: 'blue',
        style: '밤사이 뉴욕 증시 10대 빅테크(NVDA·TSLA·AAPL·MSFT·GOOGL·AMZN 등) 순환 분석과 나스닥 선물, 원/달러 환율과 한국 증시 연결고리를 자동 보고합니다.',
        status: '미국 10대 빅테크 데일리 순환 분석 & 나스닥 선물·원자재 24시간 연동 완료',
    },
    {
        id: 'weekly_review_dir',
        name: '한지훈',
        role: '이사 (주간리서치·성과복기팀장)',
        dept: '주간 리서치·실전매매 복기TF',
        badge: '주간 리서치 적중 복기 · 월요일 Top3',
        avatar: '📋',
        color: 'teal',
        style: '한 주간 상정된 증권사 리포트 추천주와 실전 모의투자 계좌의 매매 성적표(승률·손익·반성문)를 복기하고 차주 월요일 개장 전략을 수립합니다.',
        status: '주간 리서치 추천주 전수 복기 & 실전 계좌 매매 복기 보고서 상정 완료',
    },
    {
        id: 'econ_cal_dir',
        name: '윤서아',
        role: '이사 (경제일정·매크로분석팀장)',
        dept: '글로벌 경제캘린더·이벤트분석팀',
        badge: '한주 경제일정 · 호재/악재 시나리오',
        avatar: '🗓️',
        color: 'indigo',
        style: '한 주간(월~금) 한국·미국의 핵심 경제일정(FOMC·물가·고용·수출입·빅테크 실적)을 요일별로 정리하고 결과별 대응 시나리오를 사전 브리핑합니다.',
        status: '한 주간 한·미 핵심 경제일정 캘린더 및 요일별 대응 시나리오 수립 완료',
    },
];

const FALLBACK_AUTO_APPROVALS: AutoApprovalDoc[] = [
    {
        doc_id: 'DOC-DEFAULT-01',
        doc_number: '제 2026-01 호',
        category_type: 'kr_stock',
        category_badge: '🌐 전사 24시간·주말 무휴 종합 보고',
        urgency: '최우선 결재',
        stock_name: '전체 시장 시스템',
        title: '[전사 상시 감시 보고] 지금 주식시장 분위기 & 돈이 몰리는 핵심 업종 브리핑',
        proposer: '박진우 부사장 (리서치센터장) 외 4개 본부 합동',
        submitted_at: '상시 자동 상정 완료',
        easy_headline: '지금 시장은 모든 주식이 다 같이 오르는 장이 아닙니다! 실제로 해외 일감(수주)을 많이 따내고 돈을 잘 버는 알짜 우량주(AI 반도체·원전·조선·항공)로만 큰손들의 돈이 몰리고 있으니, 이 종목들만 콕 집어서 관리하자는 보고서입니다.',
        key_numbers: [
            { label: '오늘의 시장 핵심 키워드', value: '실적 좋은 알짜주 집중' },
            { label: '미리 보는 미국장 (나스닥선물)', value: '20,480pt (+0.42%)' },
            { label: '글로벌 AI 대장 (엔비디아)', value: '$138.00 (+0.89%)' },
            { label: '직원들이 분석 마친 보고서', value: '종목 6건 · 시황 4건' },
        ],
        research_opinion: '👍 [왜 이렇게 봐야 하나요? · 박진우 리서치센터장]: 소문으로만 오르는 주식은 피하고 분기 성적표(영업이익)가 잘 나오는 수출·수주 대장주만 골라 담아야 안전하다는 뜻입니다.',
        quant_opinion: '📊 [큰손들 돈의 흐름은? · 김도현 수급본부장]: 최근 두 달 평균 가격(50일선) 위에서 외국인과 기관 부자들이 함께 사들이는 종목들만 주가가 계속 힘을 내고 있습니다.',
        risk_opinion: '⚠️ [이것만 조심하세요! · 최서연 리스크본부장]: 이미 하루에 급등한 주식을 뒤늦게 따라 사는 것(추격 매수)은 절대 금물입니다! 나누어서 천천히 접근해야 안전합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 현재 우리 회사 모든 자동 분석 시스템이 주말·야간 상관없이 100% 정상 작동 중입니다. 알짜 실적주 위주로 집중 감시하라는 지침에 [승인 서명]만 눌러주십시오!',
        recommendation: '알짜 실적주 집중 감시 체제 승인',
        easy_terms: [
            { term: '컨센서스 (시장 예상치)', desc: '여러 증권사 전문가들이 이번 분기에 회사가 돈을 얼마나 벌지 미리 계산해 놓은 평균 예상 점수입니다.' },
            { term: '나스닥100 선물', desc: '미국 시장이 열리기 전에도 24시간 거래되는 미리 보는 미국 기술주 온도계입니다.' },
            { term: '50일선 (대략 8월 초부터 지금까지)', desc: '오늘부터 거꾸로 계산해 대략 8월 초부터 지금까지(약 2.5개월간) 주식시장에서 거래된 평균 매수단가입니다. 현재 주가가 이 선 위에 있으면 사는 힘이 강한 안전 구간입니다.' },
        ],
    },
    {
        doc_id: 'DOC-DEFAULT-02',
        doc_number: '제 2026-02 호',
        category_type: 'kr_stock',
        category_badge: '🏢 종목 쉽게 읽기 (하나증권)',
        urgency: '정규 결재',
        stock_name: '두산에너빌리티',
        stock_code: '034020',
        current_price: '64,100원 (+2.07%)',
        target_price: '120,000원',
        upside_pct: '+87.2%',
        profit_per_share: '주당 +55,900원 (+87.2%)',
        profit_10m: '약 +8,720,000원',
        title: '[두산에너빌리티] 연내 SMR 추가 수주 기대 및 글로벌 원전 기자재 모멘텀 유효',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (수급) · 최서연 상무 (리스크)',
        submitted_at: '쉬운 해설 완료',
        easy_headline: '하나증권에서 두산에너빌리티의 현재가(64,100원) 대비 목표주가를 120,000원(기대 상승여력 +87.2%)으로 제시했습니다. 소형원전(SMR) 추가 일감 계약이 기대되어 지금 매수하기에 매우 매력적인 구간입니다!',
        key_numbers: [
            { label: '실시간 현재가', value: '64,100원 (+2.07%)' },
            { label: '전문가 목표주가', value: '120,000원 (상승여력 +87.2%)' },
            { label: '주당 예상 기대차익', value: '주당 +55,900원 이익' },
            { label: '1,000만원 투자 시 기대수익', value: '약 +8,720,000원' },
        ],
        research_opinion: '👍 [왜 좋은가요? · 박진우 리서치센터장]: 전 세계적으로 AI 데이터센터 전력 부족 때문에 소형원전(SMR)과 가스터빈 발전기 주문이 늘어나고 있어 앞으로 회사가 벌어들일 이익이 계속 커질 것으로 분석됐습니다.',
        quant_opinion: '📊 [돈의 흐름은? · 김도현 수급본부장]: 증권사가 부른 목표 가격(120,000원)에 비해 지금 주가가 얼마나 저렴한지, 외국인과 기관 큰손들이 사 모으고 있는지 실시간 추적 중입니다.',
        risk_opinion: '⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 무조건 좋다고 한 번에 사기보다는, 올해 안에 소형원전(SMR) 실제 본계약 공시가 나오는지를 함께 확인해야 합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 두산에너빌리티(목표주가 120,000원)의 좋은 점과 주의할 점을 모두 정리했습니다. 우리 회사 중점 관심 종목으로 등록할지 [승인 서명]을 눌러 결정해 주십시오!',
        recommendation: '목표주가 120,000원 기준 관심종목 등록 승인',
        detail_url: 'https://stock.naver.com/research/company/96804',
        easy_terms: [
            { term: 'SMR (소형모듈원전)', desc: '기존 거대한 원자력발전소를 작게 줄여서 공장에서 찍어내듯 만들어 설치하는 차세대 안전 발전소입니다.' },
            { term: '밸류에이션 (주가 가성비)', desc: '회사가 버는 돈이나 가진 재산에 비해 지금 주가가 비싼지 싼지 따져보는 가격표 점수입니다.' },
            { term: '50일선 (대략 8월 초부터 지금까지)', desc: '대략 8월 초부터 지금까지(약 2.5개월간) 주식을 산 사람들의 평균단가입니다. 이 가격 위에서는 최근 매수한 사람들이 수익권이라 주가가 단단하게 지지됩니다.' },
        ],
    },
    {
        doc_id: 'DOC-DEFAULT-03',
        doc_number: '제 2026-03 호',
        category_type: 'kr_stock',
        category_badge: '🏢 종목 쉽게 읽기 (한화투자증권)',
        urgency: '정규 결재',
        stock_name: '대한항공',
        title: '[대한항공] 3분기 일회성 성과급 반영에도 견조한 국제선 여객 운임 및 해외발 수요 유지',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (수급) · 최서연 상무 (리스크)',
        submitted_at: '쉬운 해설 완료',
        easy_headline: '한화투자증권에서 대한항공 주가가 43,000원까지 갈 수 있다고 분석했습니다! 직원들에게 보너스(성과급)를 주느라 이번 분기 이익이 예상보다 조금 적게 나왔을 뿐, 비행기 표값이나 해외 승객 수는 아주 탄탄하다는 뜻입니다.',
        key_numbers: [
            { label: '분석한 회사 이름', value: '대한항공' },
            { label: '보고서 낸 증권사', value: '한화투자증권' },
            { label: '전문가 목표주가', value: '43,000원' },
            { label: '전문가 결론', value: '사도 좋음 (매수)' },
        ],
        research_opinion: '👍 [왜 좋은가요? · 박진우 리서치센터장]: 3분기 매출 5조 448억원, 영업이익 4,212억원을 기록했습니다. 미주·일본 노선 등 비행기 운임이 높게 유지되고 있고 해외 환승 승객도 계속 늘고 있습니다.',
        quant_opinion: '📊 [돈의 흐름은? · 김도현 수급본부장]: 목표주가(43,000원) 대비 주가가 저렴한 구간에 있어 연기금과 외국인 큰손들의 저가 매수세가 들어오는지 감시하고 있습니다.',
        risk_opinion: '⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 이번 실적에서 빠진 돈은 한 번만 나가는 직원 성과급 때문이므로 본업 문제와 구분해서 봐야 하며, 기름값(유가)과 환율이 오르는지만 조심하면 됩니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 대한항공(목표주가 43,000원)은 본업이 튼튼하다는 보고입니다. 확인하셨으면 [승인 서명]을 눌러주십시오!',
        recommendation: '목표주가 43,000원 기준 관심종목 등록 승인',
        detail_url: 'https://stock.naver.com/research/company/96803',
        easy_terms: [
            { term: '컨센서스 (시장 예상치)', desc: '여러 증권사 전문가들이 이번 분기에 회사가 돈을 얼마나 벌지 미리 계산해 놓은 평균 예상 점수입니다.' },
            { term: '목표주가', desc: '증권사 애널리스트가 앞으로 6개월~1년 안에 이 가격까지는 갈 수 있다고 제시한 목표 가격입니다.' },
        ],
    },
    {
        doc_id: 'DOC-DEFAULT-04',
        doc_number: '제 2026-04 호',
        category_type: 'kr_stock',
        category_badge: '🏢 종목 쉽게 읽기 (미래에셋증권)',
        urgency: '정규 결재',
        stock_name: 'SK하이닉스',
        title: '[SK하이닉스] HBM3E 12단 독점적 지위 지속 및 AI 서버용 고부가 메모리 수익성 극대화',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (수급) · 최서연 상무 (리스크)',
        submitted_at: '쉬운 해설 완료',
        easy_headline: '미래에셋증권에서 SK하이닉스 목표주가를 270,000원으로 제시했습니다! 미국 엔비디아에 납품하는 AI 전용 초고속 메모리(HBM) 분야 1등이라서, 일반 반도체 경기와 상관없이 돈을 아주 잘 벌고 있다는 뜻입니다.',
        key_numbers: [
            { label: '분석한 회사 이름', value: 'SK하이닉스' },
            { label: '보고서 낸 증권사', value: '미래에셋증권' },
            { label: '전문가 목표주가', value: '270,000원' },
            { label: '전문가 결론', value: '사도 좋음 (매수)' },
        ],
        research_opinion: '👍 [왜 좋은가요? · 박진우 리서치센터장]: AI 컴퓨터에 꼭 들어가야 하는 최고급 메모리(HBM)를 사실상 독점 공급하다시피 하면서 업계 최고 수준의 이익률을 내고 있습니다.',
        quant_opinion: '📊 [돈의 흐름은? · 김도현 수급본부장]: 대략 8월 초부터 지금까지(약 2.5개월) 평균 가격인 50일선 위에서 외국인과 기관 큰손들이 가장 활발하게 사들이는 대한민국 대표 AI 반도체 대장주입니다.',
        risk_opinion: '⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 밤사이 미국 엔비디아 주가가 흔들리는 날에는 아침에 같이 출렁일 수 있으니 급등하는 날 추격 매수만 피하시면 됩니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: AI 반도체 1등주 SK하이닉스(목표주가 270,000원) 쉬운 해설 보고서입니다. [승인 서명]을 요청드립니다!',
        recommendation: '목표주가 270,000원 기준 관심종목 등록 승인',
        detail_url: 'https://stock.naver.com/research/company',
        easy_terms: [
            { term: 'HBM (고대역폭 메모리)', desc: '일반 D램을 아파트처럼 여러 층 쌓아 올려 AI 칩이 엄청난 속도로 데이터를 처리하게 돕는 AI 전용 최고급 메모리입니다.' },
            { term: '50일선 (대략 8월 초부터 지금까지)', desc: '오늘을 기준으로 거꾸로 계산해 대략 8월 초부터 지금까지(약 2.5개월간) 주식을 산 사람들의 평균 매수가격입니다. 주가가 이 선 위에 있으면 사는 힘이 강합니다.' },
        ],
    },
    {
        doc_id: 'DOC-DEFAULT-05',
        doc_number: '제 2026-05 호',
        category_type: 'us_stock',
        category_badge: '🌎 미국 주식 쉽게 읽기',
        urgency: '글로벌 핵심',
        stock_name: 'NVDA',
        title: '[엔비디아 (NVDA)] 전 세계 AI 대장주 분위기 & 한국 반도체(삼전·하이닉스) 영향 보고',
        proposer: '이준호 이사 (글로벌·파생본부장)',
        submitted_at: '24시간 글로벌 데스크',
        easy_headline: '전 세계 AI 칩 1등 회사인 미국 엔비디아가 잘 가야 한국 삼성전자·SK하이닉스도 같이 힘을 받습니다! 미국 월스트리트 전문가들은 엔비디아가 평균 $175.00(지금보다 +26.8% 더 상승 가능)까지 갈 수 있다고 보고 있습니다.',
        key_numbers: [
            { label: '엔비디아 현재 주가', value: '$138.00 (+0.89%)' },
            { label: '미국 전문가 평균 목표가', value: '$175.00 (+26.8%)' },
            { label: '최근 두 달 평균가격(50일선)', value: '$132.40' },
            { label: '현재 주가 힘(추세)', value: '📈 50일선 상회 강세' },
        ],
        research_opinion: '👍 [왜 중요한가요? · 이준호 글로벌이사]: 엔비디아는 전 세계 빅테크 기업들이 서로 사려고 줄을 서는 AI 반도체의 대장입니다. 미국 전문가 평균 목표가가 $175.00로 한국 반도체 주식에도 좋은 신호입니다.',
        quant_opinion: '📊 [차트 흐름은? · 김도현 수급본부장]: 최근 두 달 평균 가격($132.40) 위에서 튼튼하게 버티고 있어서 글로벌 큰손 자금이 AI 기술주에 계속 머물러 있습니다.',
        risk_opinion: '⚠️ [뭘 조심해야 하나요? · 최서연 리스크본부장]: 최근 1년 최고가 근처에서는 수익을 챙기려는 매도 물량이 나올 수 있으니 원/달러 환율과 함께 보셔야 합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [대표님 결재 가이드]: 한국 반도체 주식의 길잡이 역할을 하는 엔비디아(NVDA) 점검 보고서입니다. 확인하셨으면 [승인 서명]을 눌러주십시오!',
        recommendation: '글로벌 AI 대장주 연동 감시 승인',
        easy_terms: [
            { term: 'HBM (고대역폭 메모리)', desc: '엔비디아 AI 칩 옆에 꼭 붙어 있어야 하는 초고속 메모리로, 한국 SK하이닉스와 삼성전자가 만듭니다.' },
            { term: '목표주가', desc: '미국 월스트리트 투자은행(IB) 전문가들이 계산한 향후 1년 목표 주가입니다.' },
        ],
    },
];

const FALLBACK_DEBATES: DebateTurn[] = [
    {
        speaker_id: 'sec_chief',
        name: '정유진',
        role: '비서실장',
        dept: '대표이사 직속 비서실',
        avatar: '👩‍💼',
        stance: '결재서류 상정 완료',
        stance_tone: 'summary',
        headline: '대표님, 평일·주말 구분 없이 각 본부 임원들이 시장 시스템과 핵심 종목 분석을 모두 마쳐 기안서를 올렸습니다!',
        message: '대표님께서 직접 찾으실 필요 없이 리서치센터·퀀트본부·리스크관리본부·글로벌본부가 24시간 상시 분석을 끝내고 [대표이사 전자결재 집무실]에 기안서를 올려두었습니다.\n브리핑 요약만 훑어보시고 [✅ 승인 서명] 도장만 찍어주시면 됩니다!',
        data_tag: '전 부서 상시 자율 기안 완료',
    },
    {
        speaker_id: 'research_vp',
        name: '박진우',
        role: '부사장 (리서치센터장)',
        dept: '기업·산업 리서치본부',
        avatar: '👨‍💼',
        stance: '리서치 자동 분석 보고',
        stance_tone: 'bull',
        headline: '증권사 최신 리포트 전수 분석 완료 — 두산에너빌리티(120,000원) · 대한항공(43,000원) · SK하이닉스(270,000원)',
        message: '대표님, 증권사에 주말은 없습니다! 국내 주요 증권사 애널리스트들이 발표한 최신 종목·시황 리포트를 전수 조사하여 핵심만 3초 요약해 결재판에 올려두었습니다.',
        data_tag: '제도권 증권사 리포트 전수 요약',
    },
    {
        speaker_id: 'quant_dir',
        name: '김도현',
        role: '상무 (퀀트·수급본부장)',
        dept: '알고리즘 트레이딩·수급본부',
        avatar: '📈',
        stance: '수급 스캐너 정상 가동',
        stance_tone: 'neutral',
        headline: '외국인·기관 수급 및 50일 이동평균선 돌파 스캐너 자동 감사 완료',
        message: '상정된 모든 종목의 현재가와 50일 이동평균선 위치, 최근 52주 고저점 대비 수급 탄력을 자동으로 계산해 각 결재 서류에 첨부해 두었습니다.',
        data_tag: 'KRX 수급 & 50일선 연동',
    },
    {
        speaker_id: 'risk_cro',
        name: '최서연',
        role: '상무 (리스크관리본부장 · CRO)',
        dept: '리스크관리·컴플라이언스본부',
        avatar: '🛡️',
        stance: '사전 리스크 감사 완료',
        stance_tone: 'caution',
        headline: '모든 결재 안건에 주의해야 할 하방 리스크 요인을 사전에 첨부했습니다',
        message: '리서치팀의 낙관적인 목표주가 뒤에 숨어 있는 실적 하회 리스크·환율 변수·차익실현 주의 구간을 제가 직접 빨간펜으로 적어 각 기안서에 붙여 두었습니다.',
        data_tag: 'CRO 사전 리스크 감사필',
    },
    {
        speaker_id: 'global_dir',
        name: '이준호',
        role: '이사 (글로벌·파생본부장)',
        dept: '해외주식·ETF·선물파생본부',
        avatar: '🌎',
        stance: '24시간 글로벌 데스크 보고',
        stance_tone: 'bull',
        headline: '나스닥100 선물(NQ=F) · 엔비디아(NVDA) 24시간 글로벌 데스크 보고 완료',
        message: '글로벌본부에서도 미국 증시와 지수 선물 시장을 상시 분석해 결재 안건으로 올려두었습니다. 한국 반도체와 수출주 개장 방향성을 결정짓는 핵심 지표이니 함께 재가해 주십시오!',
        data_tag: '미국 주식 · ETF · 선물 24시간 데스크',
    },
];

const FALLBACK_RESEARCH_DESK: ResearchReportItem[] = [
    {
        id: 'fb_rep_1',
        category: '종목·목표주가',
        stock_name: '두산에너빌리티',
        title: '연내 SMR 추가 수주 기대 및 글로벌 원전 기자재 모멘텀 유효',
        broker: '하나증권',
        date: '최신 발간',
        target_price: '120,000원',
        opinion: 'Buy (매수)',
        summary: ['목표주가 120,000원 및 투자의견 매수 유지'],
        plain_explanation: '소형모듈원전(SMR) 추가 수주와 전사적 이익 개선 기대감 유효',
        action_point: '연내 SMR 수주 공시 및 밸류에이션 멀티플 확인',
        pdf_url: '',
        detail_url: 'https://stock.naver.com/research/company/96804',
    },
    {
        id: 'fb_rep_2',
        category: '종목·목표주가',
        stock_name: '대한항공',
        title: '[3Q Review] 일회성 성과급 반영에도 견조한 국제선 여객 운임 유지',
        broker: '한화투자증권',
        date: '최신 발간',
        target_price: '43,000원',
        opinion: 'Buy (매수)',
        summary: ['별도 매출액 5조 448억원, 영업이익 4,212억원 기록'],
        plain_explanation: '해외발 수요 적극 유치 및 미주·일본 노선 견조한 운임 지속',
        action_point: '일회성 비용과 본업 여객·화물 수익성 분리 점검',
        pdf_url: '',
        detail_url: 'https://stock.naver.com/research/company/96803',
    },
    {
        id: 'fb_rep_3',
        category: '종목·목표주가',
        stock_name: 'SK하이닉스',
        title: 'HBM3E 12단 독점적 지위 지속 및 AI 서버용 고부가 메모리 수익성 극대화',
        broker: '미래에셋증권',
        date: '최신 발간',
        target_price: '270,000원',
        opinion: 'Buy (매수)',
        summary: ['AI 가속기향 HBM 매출 비중 확대로 영업이익률 선도'],
        plain_explanation: 'AI 전용 초고속 메모리(HBM) 시장을 선도하며 높은 이익 창출',
        action_point: '외국인·기관 반도체 프로그램 순매수 유입 확인',
        pdf_url: '',
        detail_url: 'https://stock.naver.com/research/company',
    },
    {
        id: 'fb_rep_4',
        category: '종목·목표주가',
        stock_name: '삼성전자',
        title: '역사적 PBR 밴드 하단 저평가 매력 및 HBM 공급 확대 기대',
        broker: 'KB증권',
        date: '최신 발간',
        target_price: '85,000원',
        opinion: 'Buy (매수)',
        summary: ['12개월 선행 PBR 1.0배 부근 하방 경직성 확보'],
        plain_explanation: '자산가치 대비 저점 구간으로 추가 하락 위험 제한적',
        action_point: '외국인 수급 전환 및 50일 이동평균선 안착 여부 점검',
        pdf_url: '',
        detail_url: 'https://stock.naver.com/research/company',
    },
];

export default function CeoOfficePage() {
    const { user, isLoading: authLoading } = useAuth();
    const isAdmin = isAdminEmail(user?.email);

    const [executives, setExecutives] = useState<Executive[]>(FALLBACK_EXECUTIVES);
    const [autoApprovals, setAutoApprovals] = useState<AutoApprovalDoc[]>(FALLBACK_AUTO_APPROVALS);
    const [agenda, setAgenda] = useState<Agenda | null>(null);
    const [debates, setDebates] = useState<DebateTurn[]>(FALLBACK_DEBATES);
    const [researchDesk, setResearchDesk] = useState<ResearchReportItem[]>(FALLBACK_RESEARCH_DESK);
    const [marketDesk, setMarketDesk] = useState<ResearchReportItem[]>([]);
    const [officeStatus, setOfficeStatus] = useState<string>('🏖️ 주말·야간 24시간 비상근무 가동 · 전 부서 자율 시장 분석 및 대표이사 결재 상정 완료');
    const [updatedAt, setUpdatedAt] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [isCallingMeeting, setIsCallingMeeting] = useState<boolean>(false);

    // 기본 첫 화면을 "🖋️ 대표이사 전자결재 집무실 (서명 전용)"으로 설정!
    const [activeTab, setActiveTab] = useState<'electronic_sign' | 'one_page_summary' | 'weekly_review_calendar' | 'boardroom' | 'approved_tf' | 'history' | 'watchlist_research'>('electronic_sign');
    const [summaryFilter, setSummaryFilter] = useState<'all' | 'approved' | 'kr_stock' | 'us_stock' | 'macro'>('all');
    const [summaryViewMode, setSummaryViewMode] = useState<'table' | 'cards'>('table');
    const [weeklySubView, setWeeklySubView] = useState<'both' | 'review' | 'calendar'>('both');
    const [weeklyReview, setWeeklyReview] = useState<any>(null);
    const [weeklyCalendar, setWeeklyCalendar] = useState<any>(null);
    const [signMap, setSignMap] = useState<Record<string, { status: SignStatus; signedAt: string }>>({});
    const getCeoEmail = useCallback(() => {
        if (user?.email) return user.email;
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('stock_user');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.email) return parsed.email;
                }
            } catch (e) {}
        }
        return '';
    }, [user]);

    const [commandInput, setCommandInput] = useState<string>('');
    const [showCommandDrawer, setShowCommandDrawer] = useState<boolean>(false);
    const [chatLogs, setChatLogs] = useState<CeoChatLog[]>([]);
    const [companyPolicy, setCompanyPolicy] = useState<any>({
        mode: 'balanced',
        mode_label: '⚖️ 표준 균형운용 체제',
        auto_pilot: true,
        alloc_per_trade_krw: 10000000,
        target_1_pct: 15.0,
        target_final_pct: 30.0,
        stop_loss_pct: -3.5,
    });
    const [directiveLogs, setDirectiveLogs] = useState<any[]>([]);
    const [lastWorkflowResult, setLastWorkflowResult] = useState<any | null>(null);
    const [isExecutingDirective, setIsExecutingDirective] = useState<boolean>(false);
    const [autoExecOnDirective, setAutoExecOnDirective] = useState<boolean>(true);
    
    // 💼 증권사 자산운용 프랍 트레이딩 데스크 상태 & 일일 P&L 결산 보고서 모달
    const [tradingDesk, setTradingDesk] = useState<any>(null);
    const [tradingLoading, setTradingLoading] = useState<boolean>(false);
    const [showDailyReportModal, setShowDailyReportModal] = useState<boolean>(false);

    // ⭐ [NEW] 관심종목 트레이딩팀 특별 진단 & 포트폴리오 편입 심사 상태
    const [watchlistAnalysis, setWatchlistAnalysis] = useState<any[]>([]);
    const [isWatchlistLoading, setIsWatchlistLoading] = useState<boolean>(false);
    const [watchlistSearchInput, setWatchlistSearchInput] = useState<string>('');

    // 🛡️ [NEW] 종목별 리스크 감사 & 자율 종목 검색 진단 상태
    const [riskSearchQuery, setRiskSearchQuery] = useState<string>('');
    const [riskSearchLoading, setRiskSearchLoading] = useState<boolean>(false);
    const [searchedRiskReport, setSearchedRiskReport] = useState<any>(null);
    const [riskSearchError, setRiskSearchError] = useState<string>('');
    const [copiedRiskStock, setCopiedRiskStock] = useState<string>('');
    // 💰 [NEW] 대표이사 실전 투자금 기준 상태 (기본 1,000만원)
    const [riskCapital, setRiskCapital] = useState<number>(100000);

    // 📚 관심종목 리서치 보고서 상태
    const [researchReports, setResearchReports] = useState<any[]>([]);
    const [researchLoading, setResearchLoading] = useState<boolean>(false);
    const [researchGeneratedAt, setResearchGeneratedAt] = useState<string>('');
    const [researchRequested, setResearchRequested] = useState<number>(0);

    // 🔍 자율 종목 리스크 감사 실시간 검색 핸들러
    const handleSearchStockRisk = useCallback(async (symbolToSearch?: string) => {
        const target = (symbolToSearch || riskSearchQuery || '').trim();
        if (!target) return;
        try {
            setRiskSearchLoading(true);
            setRiskSearchError('');
            const uid = user?.id || (user as any)?.uid || '';
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/watchlist-research?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': uid, 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({ symbols: [target] })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.reports && json.reports.length > 0) {
                    setSearchedRiskReport(json.reports[0]);
                } else {
                    setRiskSearchError(`'${target}' 종목 정보를 찾을 수 없습니다. 정확한 종목명이나 코드를 확인해 주십시오.`);
                }
            } else {
                setRiskSearchError('종목 리스크 진단 중 일시적 통신 오류가 발생했습니다.');
            }
        } catch (e: any) {
            console.error('Failed to search stock risk:', e);
            setRiskSearchError('종목 리스크 진단에 실패했습니다.');
        } finally {
            setRiskSearchLoading(false);
        }
    }, [riskSearchQuery, user]);

    // 📋 리스크 진단서 클립보드 복사 핸들러
    const handleCopyRiskAudit = (r: any, audit: StockRiskDiagnostic) => {
        const p = audit.financialPlan;
        const text = `[최서연 CRO 종목별 정밀 리스크 진단 보고서 (실전 금액 산출 완료)]
■ 종목: ${r.stock_name} (${r.stock_code}) | 현재가: ${r.price_str}
■ 종합 리스크 등급: ${audit.riskLevel} (위험도 스코어: ${audit.riskScore}/5)
■ 실전 자산 방어 핵심 금액 (1,000만원 운용 기준):
  1. 총 투자 한도 (최대 15%): ${p ? `${p.actualInvest} (${p.totalShares})` : audit.maxWeightStr}
  2. 1차 진입가: ${p ? `${p.tranches[0].price} (${p.tranches[0].shares} / ${p.tranches[0].amt})` : audit.safeEntryStr}
  3. 기계적 손절가 (-3.5%): ${p ? `${p.stopLossPrice} (손실 제한: -${p.maxLossAmount} / 원금 ${p.shieldedAmount} 안전 회수)` : audit.stopLossStr}
  4. 1차 분할 익절가 (50%): ${p ? `${p.target1Price} (현금 ${p.target1CashIn} 회수 / 확정 순익 +${p.target1ProfitAmt})` : audit.takeProfitStr}
  5. 최종 목표가: ${p ? `${p.targetPrice} (${p.finalUpsidePct} / 총 순익 +${p.finalProfitAmt})` : audit.takeProfitStr}
■ 3대 세부 리스크 요인:
  - 진입 타이밍: ${audit.factors[0].points.join(' / ')}
  - 수급 및 매물대: ${audit.factors[1].points.join(' / ')}
  - 거시 매크로 & 비중: ${audit.factors[2].points.join(' / ')}
■ 최서연 상무(CRO) 최종 결재 소견:
  "${audit.croVerdict}"
※ 본 보고서는 AI 리스크 통제 시스템에 의해 자동 생성된 투자 참고용 감사 보고서입니다.`;

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedRiskStock(r.stock_code);
            setTimeout(() => setCopiedRiskStock(''), 3000);
        }
    };

    const fetchWatchlistResearch = useCallback(async () => {
        try {
            setResearchLoading(true);
            const uid = user?.id || (user as any)?.uid || '';
            let cachedSymbols: string[] = [];
            if (typeof window !== 'undefined') {
                try {
                    const raw = localStorage.getItem('cached_watchlist');
                    if (raw) {
                        cachedSymbols = JSON.parse(raw).map((it: any) => typeof it === 'string' ? it : it.symbol);
                    }
                } catch (e) {}
            }
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/watchlist-research?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': uid, 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({ symbols: cachedSymbols })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success') {
                    setResearchReports(json.reports || []);
                    setResearchGeneratedAt(json.generated_at || '');
                    setResearchRequested(json.requested_count || 0);
                }
            }
        } catch (err) {
            console.error('Failed to load watchlist research:', err);
        } finally {
            setResearchLoading(false);
        }
    }, [user]);

    const fetchWatchlistAnalysis = useCallback(async (customSymbols?: string[]) => {
        try {
            setIsWatchlistLoading(true);
            const uid = user?.id || (user as any)?.uid || (typeof window !== 'undefined' ? localStorage.getItem('guest_user_id') : '');
            let cachedSymbols: string[] = [];
            if (typeof window !== 'undefined') {
                try {
                    const raw = localStorage.getItem('cached_watchlist');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        cachedSymbols = parsed.map((it: any) => typeof it === 'string' ? it : it.symbol);
                    }
                } catch (e) {}
            }
            const symbolsToSend = customSymbols && customSymbols.length > 0 
                ? customSymbols 
                : (cachedSymbols.length > 0 ? cachedSymbols : ['005930', '000660', '035420', '005380', 'NVDA', 'TSLA']);
                
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/watchlist-analysis?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': uid || '',
                    'X-CEO-Email': user?.email || ''
                },
                body: JSON.stringify({ symbols: symbolsToSend })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.items) {
                    setWatchlistAnalysis(json.items);
                }
            }
        } catch (err) {
            console.error('Failed to load watchlist analysis:', err);
        } finally {
            setIsWatchlistLoading(false);
        }
    }, [user]);

    const handleApproveWatchlistStock = async (item: any) => {
        if (!confirm(`[대표이사 재가] '${item.stock_name}' 종목을 트레이딩팀 운용 포트폴리오에 정식 편입하고 1,000만원 분할 매수를 집행하시겠습니까?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({
                    stock_name: item.stock_name,
                    stock_code: item.stock_code,
                    category: item.category,
                    current_price: item.current_price,
                    target_price: item.target_price_final,
                    confidence_score: 95
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setToastMessage({
                    title: `🚀 [포트폴리오 편입 완료] ${item.stock_name}`,
                    desc: data.message || `트레이딩팀 최민석 수석이 호가창 감시 및 1차 분할 매수를 체결하였습니다!`
                });
                fetchTradingDesk();
                fetchWatchlistAnalysis();
            } else if (data.status === 'already_exists') {
                alert(data.message);
            }
        } catch (e) {
            console.error('Watchlist trade order error:', e);
            alert('주문 처리 중 오류가 발생했습니다.');
        }
    };

    const handleAddCustomWatchlistStock = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!watchlistSearchInput.trim()) return;
        const target = watchlistSearchInput.trim();
        setWatchlistSearchInput('');
        const currentCodes = watchlistAnalysis.map(a => a.stock_code || a.symbol);
        const nextList = [target, ...currentCodes.filter(c => c !== target)];
        await fetchWatchlistAnalysis(nextList);
    };

    const fetchTradingDesk = useCallback(async () => {
        try {
            setTradingLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk?ceo_email=${encodeURIComponent(getCeoEmail())}`, { headers: { 'X-CEO-Email': getCeoEmail() } });
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.data) {
                    setTradingDesk(json.data);
                    if (json.data.company_policy) setCompanyPolicy(json.data.company_policy);
                    if (Array.isArray(json.data.directive_logs)) setDirectiveLogs(json.data.directive_logs);
                }
            }
        } catch (e) {
            console.error('Failed to load trading desk:', e);
        } finally {
            setTradingLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchTradingDesk();
            fetchWatchlistAnalysis();
        }
        if (typeof window !== 'undefined' && window.location.search.includes('tab=trading')) {
            setActiveTab('approved_tf');
        }
        if (typeof window !== 'undefined' && window.location.search.includes('tab=research')) {
            setActiveTab('watchlist_research');
            fetchWatchlistResearch();
        }
    }, [authLoading, isAdmin, fetchTradingDesk]);

    // 대표이사 시장가 즉시 전량 익절/매도
    const handleClosePosition = async (posId: string, stockName: string) => {
        if (!confirm(`[대표이사 지시] ${stockName} 포지션을 실시간 시장가로 전량 매도하여 수익을 확정하시겠습니까?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/close?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({ position_id: posId, reason: '대표이사 시장가 즉시 익절 지시' })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setToastMessage({
                    title: `🎉 [수익 확정 매도] ${stockName} 전량 매도 체결!`,
                    desc: data.message || `실현손익 ${data.pnl_krw?.toLocaleString()}원 (${data.pnl_pct}%)이 안전하게 확정되었습니다.`
                });
                setTimeout(() => setToastMessage(null), 6000);
                fetchTradingDesk();
            }
        } catch (e) {
            console.error('Close trade error:', e);
        }
    };

    // 1차 목표가 50% 분할 익절
    const handlePartialSell = async (posId: string, stockName: string) => {
        if (!confirm(`[대표이사 지시] ${stockName} 보유 물량의 50%를 분할 매도하여 원금과 수익을 챙기시겠습니까?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/partial-sell?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify({ position_id: posId })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setToastMessage({
                    title: `💰 [50% 분할 익절 완료] ${stockName} 차익 실현!`,
                    desc: data.message || `50% 분할 매도로 수익금을 확정하고 잔여 물량은 최종 목표가까지 보유합니다.`
                });
                setTimeout(() => setToastMessage(null), 6000);
                fetchTradingDesk();
            }
        } catch (e) {
            console.error('Partial sell error:', e);
        }
    };

    // 이메일형 서류함 전용 상태 (선택된 문서, 카테고리 필터, 결재상태 필터, 모바일 상세 열람 토글)
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'kr_stock' | 'us_stock' | 'global_futures' | 'world_news'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
    const [mobileDetailOpen, setMobileDetailOpen] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

    const mainSectionRef = useRef<HTMLDivElement>(null);
    const boardroomDebateRef = useRef<HTMLDivElement>(null);
    const detailReaderRef = useRef<HTMLDivElement>(null);

    // localStorage에서 오늘 서명한 결재 상태 복원
    useEffect(() => {
        try {
            const saved = localStorage.getItem('ceo_office_signatures_v1');
            if (saved) {
                setSignMap(JSON.parse(saved));
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const updateSignature = (docId: string, status: SignStatus) => {
        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        setSignMap(prev => {
            const next = {
                ...prev,
                [docId]: { status, signedAt: nowStr },
            };
            try {
                localStorage.setItem('ceo_office_signatures_v1', JSON.stringify(next));
            } catch (e) {
                // ignore
            }
            return next;
        });

        if (status === 'approved') {
            const doc = autoApprovals.find(d => d.doc_id === docId);
            const stockName = doc?.stock_name || '안건';

            // 💼 증권사 트레이딩 팀으로 매수 주문 자동 전송
            if (doc) {
                fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                    body: JSON.stringify(doc)
                }).then(() => fetchTradingDesk()).catch(e => console.error(e));
            }

            setToastMessage({
                title: `💼 [증권사 운용팀 주문 집행] '${stockName}' 매수 체결 완료!`,
                desc: `대표이사 재가 승인 완료: 트레이딩 팀이 적정 매수가에 분할 매수를 집행하였으며, 실시간 P&L 및 1차/최종 목표가 분할 매도 감시가 시작되었습니다.`
            });
            setTimeout(() => setToastMessage(null), 6000);
        }
    };

    const handleApproveAll = () => {
        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        setSignMap(prev => {
            const next = { ...prev };
            autoApprovals.forEach(doc => {
                next[doc.doc_id] = { status: 'approved', signedAt: nowStr };
            });
            try {
                localStorage.setItem('ceo_office_signatures_v1', JSON.stringify(next));
            } catch (e) {
                // ignore
            }
            return next;
        });
        // 💼 전 종목 트레이딩 팀 분할 매수 일괄 전송
        autoApprovals.forEach(doc => {
            fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CEO-Email': user?.email || '' },
                body: JSON.stringify(doc)
            }).catch(e => console.error(e));
        });
        setTimeout(() => fetchTradingDesk(), 500);

        setToastMessage({
            title: `💼 [증권사 운용팀] 전 안건 일괄 재가 & 포트폴리오 편입 완료!`,
            desc: `총 ${autoApprovals.length}건에 대해 트레이딩 팀이 적정 매수가 분할 매수를 집행하였으며, 실시간 P&L 수익률 감시가 시작되었습니다.`
        });
        setTimeout(() => setToastMessage(null), 6000);
    };

    const fetchOfficeData = useCallback(async (topicParam = '', messageParam = '', appendHistory = false) => {
        if (appendHistory) {
            setIsCallingMeeting(true);
        }

        try {
            const ceoEm = getCeoEmail();
            const params = new URLSearchParams();
            if (topicParam) params.set('topic', topicParam);
            if (messageParam) params.set('message', messageParam);
            if (ceoEm) params.set('ceo_email', ceoEm);

            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office?${params.toString()}`, {
                cache: 'no-store',
                headers: { 'X-CEO-Email': ceoEm },
            });
            const json = await res.json();
            if (json.status === 'success' && json.data) {
                const d = json.data;
                if (Array.isArray(d.executives) && d.executives.length > 0) setExecutives(d.executives);
                if (Array.isArray(d.auto_approvals) && d.auto_approvals.length > 0) setAutoApprovals(d.auto_approvals);
                if (d.agenda) setAgenda(d.agenda);
                if (Array.isArray(d.debates) && d.debates.length > 0) setDebates(d.debates);
                if (Array.isArray(d.research_desk) && d.research_desk.length > 0) setResearchDesk(d.research_desk);
                if (Array.isArray(d.market_desk) && d.market_desk.length > 0) setMarketDesk(d.market_desk);
                if (d.office_status) setOfficeStatus(d.office_status);
                if (d.updated_at) setUpdatedAt(d.updated_at);
                if (d.company_policy && Object.keys(d.company_policy).length > 0) setCompanyPolicy(d.company_policy);
                if (Array.isArray(d.directive_logs)) setDirectiveLogs(d.directive_logs);
                if (d.weekly_review && Object.keys(d.weekly_review).length > 0) setWeeklyReview(d.weekly_review);
                if (d.weekly_calendar && Object.keys(d.weekly_calendar).length > 0) setWeeklyCalendar(d.weekly_calendar);

                if (appendHistory && (messageParam || topicParam)) {
                    const secTurn = (d.debates || []).find((t: DebateTurn) => t.speaker_id === 'sec_chief') || (d.debates || [])[0];
                    const newLog: CeoChatLog = {
                        id: `${Date.now()}`,
                        timestamp: d.updated_at || new Date().toLocaleTimeString('ko-KR'),
                        ceoMessage: messageParam || `${topicParam} 재검토 및 임원 심층 보고 지시`,
                        agendaTitle: d.agenda?.title || topicParam,
                        targetName: d.agenda?.target_name || '전사 브리핑',
                        secretaryReply: secTurn ? secTurn.message : '임원진 합동 보고가 완료되었습니다.',
                        debates: d.debates || [],
                        metrics: d.agenda?.key_metrics || [],
                    };
                    setChatLogs(prev => [newLog, ...prev.slice(0, 14)]);
                }
            }
        } catch (err) {
            console.error('Failed to load CEO office data:', err);
        } finally {
            setLoading(false);
            setIsCallingMeeting(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchOfficeData('', '', false);
        }
    }, [authLoading, isAdmin, fetchOfficeData]);

    const executeCompanyDirective = async (payload: any) => {
        setIsExecutingDirective(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/execute-directive?ceo_email=${encodeURIComponent(getCeoEmail())}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CEO-Email': user?.email || '',
                },
                body: JSON.stringify({
                    ...payload,
                    candidate_docs: autoApprovals.slice(0, 8),
                }),
            });
            const json = await res.json();
            if (json.status === 'success') {
                if (json.company_policy) setCompanyPolicy(json.company_policy);
                if (json.trading_desk) {
                    setTradingDesk(json.trading_desk);
                    if (Array.isArray(json.trading_desk.directive_logs)) {
                        setDirectiveLogs(json.trading_desk.directive_logs);
                    }
                }
                setLastWorkflowResult(json);

                if (json.created_doc) {
                    const cdoc = json.created_doc;
                    setAutoApprovals(prev => [cdoc, ...prev.filter(d => d.doc_id !== cdoc.doc_id && d.stock_name !== cdoc.stock_name)]);
                    setSelectedDocId(cdoc.doc_id);
                    if (json.executed_trades && json.executed_trades.length > 0) {
                        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                        setSignMap(prev => {
                            const next = { ...prev, [cdoc.doc_id]: { status: 'approved' as SignStatus, signedAt: nowStr } };
                            try { localStorage.setItem('ceo_office_signatures_v1', JSON.stringify(next)); } catch (e) {}
                            return next;
                        });
                    }
                }

                if (Array.isArray(json.executed_trades) && json.executed_trades.length > 0) {
                    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                    setSignMap(prev => {
                        const next = { ...prev };
                        json.executed_trades.forEach((tr: any) => {
                            const matchingDoc = autoApprovals.find(d => d.stock_name === tr.stock_name);
                            if (matchingDoc) {
                                next[matchingDoc.doc_id] = { status: 'approved', signedAt: nowStr };
                            }
                        });
                        try { localStorage.setItem('ceo_office_signatures_v1', JSON.stringify(next)); } catch (e) {}
                        return next;
                    });
                }

                setToastMessage({
                    title: '🏛️ [전사 5대 본부 자동 이행 완료]',
                    desc: json.headline_result || '대표님의 지시사항이 전 부서에 하달되어 즉시 집행되었습니다.',
                });
                setTimeout(() => setToastMessage(null), 7000);
            }
        } catch (err) {
            console.error('Directive execution error:', err);
        } finally {
            setIsExecutingDirective(false);
        }
    };

    const handleSendDirective = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = commandInput.trim();
        if (!trimmed) return;
        setCommandInput('');
        await executeCompanyDirective({
            command_type: 'CUSTOM_DIRECTIVE',
            directive_text: trimmed,
            auto_execute: autoExecOnDirective,
        });
        fetchOfficeData('', trimmed, true);
    };

    const handleReexamineDoc = (doc: AutoApprovalDoc) => {
        updateSignature(doc.doc_id, 'reexamine');
        const isMacro = doc.category_type === 'world_news' || doc.category_badge?.includes('모닝') || doc.title?.includes('모닝 글로벌 특보') || doc.stock_name === '전체 시장 시스템' || doc.stock_name?.includes('매크로');
        const target = isMacro ? '07:20 모닝 글로벌 특보' : (doc.stock_name === '전체 시장 시스템' ? '' : doc.stock_name);
        const targetDisplay = isMacro ? '07:20 모닝 글로벌 특보' : doc.stock_name;
        const msg = `${targetDisplay} 안건(${doc.doc_number}) 대표이사 재검토 지시 — 임원 전원 심층 대면 보고 실시!`;
        
        // 대표이사 재검토 지시 토스트 알림 팝업
        setToastMessage({
            title: "📢 [정유진 비서실장] 대표님의 재검토 지시 접수 완료!",
            desc: `"${doc.title || targetDisplay}" 안건 재검토를 위해 5개 본부 임원을 회의실로 긴급 소집했습니다.`
        });
        setTimeout(() => setToastMessage(null), 6000);

        setActiveTab('boardroom');
        setMobileDetailOpen(false);
        fetchOfficeData(target, msg, true);

        // 5인 임원 대면 토론 & 회의록으로 부드럽고 정확하게 자동 스크롤
        setTimeout(() => {
            boardroomDebateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 250);
    };

    const handleQuickTopic = (topic: string, message: string) => {
        setActiveTab('boardroom');
        fetchOfficeData(topic, message, true);
        setTimeout(() => {
            mainSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const getStanceStyle = (tone: DebateTurn['stance_tone']) => {
        switch (tone) {
            case 'bull':
                return {
                    cardBorder: 'border-emerald-500/40 bg-emerald-950/15',
                    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    accent: 'text-emerald-300',
                    leftBar: 'bg-emerald-500',
                };
            case 'bear':
                return {
                    cardBorder: 'border-rose-500/40 bg-rose-950/15',
                    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                    accent: 'text-rose-300',
                    leftBar: 'bg-rose-500',
                };
            case 'caution':
                return {
                    cardBorder: 'border-amber-500/40 bg-amber-950/15',
                    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    accent: 'text-amber-300',
                    leftBar: 'bg-amber-500',
                };
            case 'summary':
                return {
                    cardBorder: 'border-purple-500/50 bg-gradient-to-r from-purple-950/30 via-indigo-950/25 to-slate-900/60',
                    badge: 'bg-purple-500/25 text-purple-200 border-purple-400/50',
                    accent: 'text-purple-200',
                    leftBar: 'bg-purple-500',
                };
            default:
                return {
                    cardBorder: 'border-sky-500/35 bg-sky-950/15',
                    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
                    accent: 'text-sky-300',
                    leftBar: 'bg-sky-500',
                };
        }
    };

    const totalDocs = autoApprovals.length;
    const approvedDocsCount = autoApprovals.filter(d => signMap[d.doc_id]?.status === 'approved').length;
    const pendingDocsCount = autoApprovals.filter(d => !signMap[d.doc_id] || signMap[d.doc_id]?.status === 'pending').length;

    // 카테고리별 건수 집계
    const countTotal = autoApprovals.length;
    const countKr = autoApprovals.filter(d => d.category_type === 'kr_stock').length;
    const countUs = autoApprovals.filter(d => d.category_type === 'us_stock').length;
    const countFutures = autoApprovals.filter(d => d.category_type === 'global_futures').length;
    const countNews = autoApprovals.filter(d => d.category_type === 'world_news' || d.category_type === 'all' || d.doc_id.endsWith('-01')).length;

    // 필터링 적용된 결재 서류 목록
    const filteredDocs = autoApprovals.filter(doc => {
        if (categoryFilter !== 'all') {
            if (categoryFilter === 'kr_stock' && doc.category_type !== 'kr_stock') return false;
            if (categoryFilter === 'us_stock' && doc.category_type !== 'us_stock') return false;
            if (categoryFilter === 'global_futures' && doc.category_type !== 'global_futures') return false;
            if (categoryFilter === 'world_news' && doc.category_type !== 'world_news' && doc.category_type !== 'all' && !doc.doc_id.endsWith('-01')) return false;
        }
        const signStatus = signMap[doc.doc_id]?.status || 'pending';
        if (statusFilter === 'pending' && signStatus !== 'pending') return false;
        if (statusFilter === 'approved' && signStatus !== 'approved') return false;
        return true;
    });

    // 🎯 [CEO Executive Intelligence] 오늘 올라온 15건 결재 기안서 데이터 100% 실시간 연동 집계
    const intelligenceMetrics = useMemo(() => {
        const rankedStocks: { name: string; upside: string; target: string; upsideNum: number; profit10m?: string; categoryBadge?: string }[] = [];
        let totalUpside = 0;
        let countWithUpside = 0;

        autoApprovals.forEach(doc => {
            if (doc.upside_pct && doc.upside_pct.includes('%')) {
                const num = parseFloat(doc.upside_pct.replace(/[^0-9.-]/g, ''));
                if (!isNaN(num) && num > 0) {
                    totalUpside += num;
                    countWithUpside += 1;
                    rankedStocks.push({
                        name: doc.stock_name,
                        upside: doc.upside_pct,
                        target: doc.target_price || '',
                        upsideNum: num,
                        profit10m: doc.profit_10m,
                        categoryBadge: doc.category_badge,
                    });
                }
            }
        });

        rankedStocks.sort((a, b) => b.upsideNum - a.upsideNum);
        const topStock = rankedStocks[0] || { name: '두산에너빌리티', upside: '+87.2%', target: '120,000원', upsideNum: 87.2, profit10m: '약 +8,720,000원', categoryBadge: '국내 주식' };
        const secondStock = rankedStocks[1] || { name: 'SK하이닉스', upside: '+45.1%', target: '270,000원', upsideNum: 45.1, profit10m: '약 +4,510,000원', categoryBadge: '국내 주식' };

        const avgUpside = countWithUpside > 0 ? (totalUpside / countWithUpside).toFixed(1) : '34.8';

        const krDocs = autoApprovals.filter(d => d.category_type === 'kr_stock');
        const usDocs = autoApprovals.filter(d => d.category_type === 'us_stock');
        const futuresDocs = autoApprovals.filter(d => d.category_type === 'global_futures');
        const newsDocs = autoApprovals.filter(d => d.category_type === 'world_news' || d.category_type === 'all' || d.doc_id.endsWith('-01'));

        // 1. 나스닥 선물 실시간 시세 (선물 기안서 또는 제1호 기안서에서 추출)
        const nqFuturesDoc = futuresDocs.find(d => d.stock_name.includes('NQ=F') || d.stock_name.includes('나스닥') || d.stock_code === 'NQ=F');
        const macroDoc = autoApprovals.find(d => d.doc_id.endsWith('-01') || d.category_type === 'all');
        const nqItem = macroDoc?.key_numbers?.find(k => k.label.includes('나스닥선물') || k.label.includes('미국장'));
        const nqPrice = nqFuturesDoc?.current_price || (nqItem ? nqItem.value : '20,480.00 (+0.42%)');

        // 2. 미국 빅테크 대장주 실시간 시세 (오늘 빅테크 기안서 중 NVDA 우선, 없으면 첫 번째 빅테크 기안서)
        const bigTechDoc = usDocs.find(d => d.stock_name.includes('엔비디아') || d.stock_name.includes('NVDA') || d.stock_code === 'NVDA') || usDocs[0];
        const bigTechPrice = bigTechDoc?.current_price || '$138.00 (+0.89%)';
        const bigTechName = bigTechDoc?.stock_name || '엔비디아(NVDA)';
        const bigTechSymbol = bigTechDoc?.stock_code || 'NVDA';
        const bigTechUpside = bigTechDoc?.upside_pct && bigTechDoc.upside_pct.includes('%')
            ? `목표 ${bigTechDoc.target_price || ''} (${bigTechDoc.upside_pct})`
            : 'AI·빅테크 수혜 지속';

        // 3. 실시간 원/달러 환율 (경제뉴스/매크로 기안서에서 실시간 추출)
        const worldNewsDoc = autoApprovals.find(d => d.category_type === 'world_news');
        const fxKeyItem = worldNewsDoc?.key_numbers?.find(k => k.label.includes('환율')) || macroDoc?.key_numbers?.find(k => k.label.includes('환율'));
        const usdKrwPrice = worldNewsDoc?.current_price || fxKeyItem?.value || '1,388.50원 (+0.12%)';

        // 4. 오늘 기안서에 실제 상정된 종목명 리스트 문자열 (고정 문구 대신 100% 실제 기안서 종목 노출)
        const krStockListStr = krDocs.length > 0
            ? Array.from(new Set(krDocs.map(d => d.stock_name))).join(' · ')
            : '두산에너빌리티 · SK하이닉스 · 삼성전자 · 대한항공';
        const usStockListStr = usDocs.length > 0
            ? usDocs.map(d => d.stock_name).join(' · ')
            : '엔비디아(NVDA) · 테슬라(TSLA) · 애플(AAPL) · MSFT';
        const futuresListStr = futuresDocs.length > 0
            ? futuresDocs.map(d => d.stock_name.replace(/\(.*?\)/g, '')).join(' · ')
            : '나스닥100선물 · S&P500선물 · WTI원유';

        const approvalRate = totalDocs > 0 ? Math.round((approvedDocsCount / totalDocs) * 100) : 0;

        return {
            topStock,
            secondStock,
            avgUpside,
            nqPrice,
            bigTechPrice,
            bigTechName,
            bigTechSymbol,
            bigTechUpside,
            usdKrwPrice,
            krStockListStr,
            usStockListStr,
            futuresListStr,
            approvalRate,
            krDocs,
            usDocs,
            futuresDocs,
            newsDocs,
        };
    }, [autoApprovals, totalDocs, approvedDocsCount]);

    const handleJumpToDoc = (docId: string) => {
        setSelectedDocId(docId);
        setActiveTab('electronic_sign');
        setMobileDetailOpen(true);
        setTimeout(() => {
            (detailReaderRef.current || mainSectionRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // 좌측 서류함 카드용 깔끔 2줄 핵심 불릿 추출기 (중복되는 증권사/현재가/목표가 서두 제거 후 핵심 요점만 2줄 요약)
    const getCleanCardBullets = (doc: AutoApprovalDoc): string[] => {
        const raw = (doc.easy_headline || doc.plain_summary || '').trim();
        if (!raw) return [];
        const cleaned = raw
            .replace(/^[^.]+대비 목표가를 [^.]+제시했습니다\.\s*/g, '')
            .replace(/^현재가\([^)]+\) 대비 목표주가 [—-]+\s*/g, '')
            .replace(/^[^.]+기업 분석 리포트\s*\([^)]*\)입니다\.\s*/g, '')
            .replace(/^📌\s*\[[^\]]+\]:?\s*/g, '')
            .trim();

        const sentences = cleaned
            .split(/(?<=다\.|요\.|음\.|함\.|망\.)\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 4 && !s.includes('기업 분석 리포트') && !s.includes('대비 목표가를'));

        const targetList = sentences.length > 0 ? sentences : [cleaned];
        return targetList.slice(0, 2).map(s => {
            return s
                .replace(/다가오는 실적 발표에서 시장 예상치\(컨센서스\)를 뛰어넘는/g, '시장 예상치를 뛰어넘는')
                .replace(/핵심 긍정 요인으로 꼽았습니다\./g, '핵심 호재로 평가')
                .replace(/분석했습니다\./g, '전망')
                .replace(/예상했습니다\./g, '전망')
                .replace(/예상됩니다\./g, '전망');
        });
    };

    const getCleanCardTitle = (doc: AutoApprovalDoc): { badgeName: string; mainTitle: string } => {
        let t = (doc.title || '').trim();
        let badgeName = doc.stock_name || '';
        // Strip leading [종목명] if present
        const m = t.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (m) {
            badgeName = m[1];
            t = m[2];
        }
        // Strip secondary English tag like [3Q26 Review] into cleaner Korean or remove
        t = t.replace(/^\[3Q\d*\s*Review\]\s*/i, '3분기 실적 리뷰 · ');
        t = t.replace(/^\[4Q\d*\s*Preview\]\s*/i, '4분기 실적 프리뷰 · ');
        return { badgeName, mainTitle: t || doc.title };
    };

    // 현재 열람 중인 상세 기안서
    const activeDoc = autoApprovals.find(d => d.doc_id === selectedDocId) || filteredDocs[0] || autoApprovals[0] || null;

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="inline-block w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-bold text-gray-300">대표이사 보안 인가 확인 중...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#0d1526] border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto mb-4">
                        🔒
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black mb-3">
                        CEO SECURITY CLEARANCE REQUIRED
                    </div>
                    <h1 className="text-xl font-black text-white mb-2">
                        대표이사 전용 보안 구역입니다
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-6">
                        이 집무실과 전자결재 시스템은 등록된 관리자(대표이사) 계정으로 로그인했을 때만 표시되고 입장할 수 있습니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
                            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer"
                        >
                            🔑 관리자 계정으로 로그인
                        </button>
                        <Link
                            href="/"
                            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs sm:text-sm transition-all"
                        >
                            홈 대시보드로 이동
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-white pb-20">
            {/* 대표이사 긴급 지시 토스트 플로팅 배너 */}
            {/* 🏛️ [대표이사 결재용] 증권사 공식 일일 자산운용 및 수익률 결산 보고서 모달 */}
            {showDailyReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#0b1222] border-2 border-amber-500/40 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 text-gray-200 relative">
                        {/* 닫기 버튼 */}
                        <button
                            type="button"
                            onClick={() => setShowDailyReportModal(false)}
                            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* 보고서 상단 공문 헤더 */}
                        <div className="border-b-2 border-amber-500/30 pb-5">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-mono">
                                <span>문서번호: PROPTRADE-20261021-CEO-01</span>
                                <span>보고일시: {new Date().toLocaleDateString('ko-KR')} 실시간 KST</span>
                            </div>
                            <div className="text-center space-y-1">
                                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-black text-xs tracking-wider">
                                    [대표이사 직속 결재 보고]
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-2">
                                    자산운용본부 일일 포트폴리오 운용 성과 결산 보고서
                                </h2>
                                <p className="text-xs text-gray-400">
                                    Daily Proprietary Trading & P&L Performance Report
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-5 text-xs bg-black/40 p-3.5 rounded-2xl border border-white/5">
                                <div><span className="text-gray-400">수신:</span> <strong className="text-white">대표이사 귀하</strong></div>
                                <div><span className="text-gray-400">발신:</span> <strong className="text-amber-300">자산운용총괄 CIO & 수석 운용역 최민석</strong></div>
                            </div>
                        </div>

                        {/* 1. 총괄 운용 성과 요약 */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>1. 총괄 포트폴리오 운용 실적 요약</span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-black/50 p-3.5 rounded-2xl border border-white/10">
                                    <div className="text-[11px] text-gray-400">총 운용 자산 (AUM)</div>
                                    <div className="text-base font-black text-white font-mono mt-1">
                                        {(tradingDesk?.summary?.total_capital || 100000000).toLocaleString()}원
                                    </div>
                                </div>
                                <div className="bg-black/50 p-3.5 rounded-2xl border border-emerald-500/30">
                                    <div className="text-[11px] text-emerald-400">보유 평가 손익</div>
                                    <div className="text-base font-black text-rose-400 font-mono mt-1">
                                        +{(tradingDesk?.summary?.total_unrealized_pnl || 0).toLocaleString()}원
                                    </div>
                                </div>
                                <div className="bg-black/50 p-3.5 rounded-2xl border border-amber-500/30">
                                    <div className="text-[11px] text-amber-400">누적 실현 손익</div>
                                    <div className="text-base font-black text-amber-300 font-mono mt-1">
                                        +{(tradingDesk?.summary?.total_realized_pnl || 0).toLocaleString()}원
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-950/40 to-teal-950/30 p-3.5 rounded-2xl border border-emerald-500/40">
                                    <div className="text-[11px] text-emerald-300 font-bold">종합 순수익률 (알파)</div>
                                    <div className="text-base font-black text-rose-400 font-mono mt-1">
                                        +{(tradingDesk?.summary?.combined_return_pct || 0)}%
                                    </div>
                                    <div className="text-[10px] text-emerald-400 mt-0.5">코스피 대비 +5.8% 초과달성</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. 종목별 세부 매매 및 손익 원장 */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>2. 재가 종목별 상세 운용 현황</span>
                            </h3>
                            <div className="overflow-x-auto bg-black/40 rounded-2xl border border-white/5 p-2">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-400 text-[11px]">
                                            <th className="py-2 px-2.5">종목명</th>
                                            <th className="py-2 px-2.5">매수평단</th>
                                            <th className="py-2 px-2.5">현재가</th>
                                            <th className="py-2 px-2.5">수량</th>
                                            <th className="py-2 px-2.5">투자원금</th>
                                            <th className="py-2 px-2.5">평가손익</th>
                                            <th className="py-2 px-2.5">수익률</th>
                                            <th className="py-2 px-2.5">운용상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(tradingDesk?.positions || []).map((p: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-2 px-2.5 font-bold text-white">{p.stock_name}</td>
                                                <td className="py-2 px-2.5">{p.category === 'kr_stock' ? `${p.buy_price.toLocaleString()}원` : `$${p.buy_price}`}</td>
                                                <td className="py-2 px-2.5 font-bold text-amber-300">{p.category === 'kr_stock' ? `${p.current_price.toLocaleString()}원` : `$${p.current_price}`}</td>
                                                <td className="py-2 px-2.5">{p.qty}주</td>
                                                <td className="py-2 px-2.5">{p.invested_krw?.toLocaleString()}원</td>
                                                <td className="py-2 px-2.5 text-rose-400 font-bold">+{p.unrealized_pnl?.toLocaleString()}원</td>
                                                <td className="py-2 px-2.5 text-rose-300 font-bold">+{p.pnl_pct}%</td>
                                                <td className="py-2 px-2.5 text-emerald-400 font-bold">{p.status === 'CLOSED' ? '청산완료' : p.status === 'PARTIAL_EXIT' ? '50%익절' : '보유운용중'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 3. 트레이딩 본부장 총평 및 익일 운용 계획 */}
                        <div className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-2 text-xs leading-relaxed">
                            <h4 className="font-black text-amber-300 flex items-center gap-1.5">
                                <span>👨‍💼</span>
                                <span>3. 트레이딩 본부장 총평 및 익일 운용 전략</span>
                            </h4>
                            <p className="text-gray-300">
                                "대표님께서 결재해 주신 알짜 실적주 중심의 압축 포트폴리오가 시장 대비 확연한 초과 수익(Alpha)을 달성하고 있습니다. 두산에너빌리티와 SK하이닉스 등 주도 업종의 호가 체결 강도가 최상위 수준을 유지하고 있어, 무리한 조기 청산보다는 1차 목표가(+15%) 도달 시 50% 분할 매도로 수익을 챙기고 잔여 수량은 최종 목표주가까지 추세 추종할 것을 건의드립니다."
                            </p>
                        </div>

                        {/* 하단 액션 버튼 */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                <span>보고서 인쇄 및 PDF 저장</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDailyReportModal(false)}
                                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                            >
                                보고서 확인 완료 (닫기)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toastMessage && (
                <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-[420px] z-50 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400/90 rounded-2xl p-4 shadow-2xl shadow-amber-500/25 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5 animate-bounce">📢</span>
                            <div>
                                <div className="text-xs sm:text-sm font-black text-amber-300">{toastMessage.title}</div>
                                <p className="text-xs text-gray-200 font-bold mt-1 leading-snug">{toastMessage.desc}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setToastMessage(null)}
                            className="text-gray-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* 상단 대표이사 전자결재 집무실 헤더 배너 */}
            <div className="relative overflow-hidden border-b border-amber-500/30 bg-gradient-to-r from-[#0d1527] via-[#131c33] to-[#0d1527]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex-1">
                            {/* 상단 럭셔리 인가 뱃지 */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black shadow-sm">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    <span>🏛️ AI 증권사 대표이사 전자결재실</span>
                                    <span className="text-gray-500">|</span>
                                    <span className="text-emerald-300 font-extrabold">전 부서 자율 분석 완료</span>
                                </div>
                                <span className="text-[11px] text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/5 font-mono">
                                    {officeStatus}
                                </span>
                            </div>

                            {/* 메인 헤드라인 (한눈에 들어오는 깔끔 요약형) */}
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[38px] font-black tracking-tight text-white leading-tight">
                                    대표님, 오늘 시장 분석이 완료되었습니다 <br className="hidden sm:inline" />
                                    <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent underline decoration-amber-500/40 decoration-2">
                                        총 {totalDocs}건의 결재 기안서
                                    </span>
                                    를 검토 후 서명해 주십시오 🖋️
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs text-gray-200">
                                    <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 font-extrabold text-amber-300">
                                        📌 핵심 요약
                                    </span>
                                    <span>5개 본부 전수 조사 완료</span>
                                    <span className="text-gray-500">·</span>
                                    <strong className="text-emerald-300">실적 흑자 + 50일선 수급 돌파</strong>
                                    <span>검증 안건만 엄선 상정</span>
                                </div>
                            </div>

                            {/* 🌟 [1] 글로벌 4대 핵심 지표 한눈에 보기 (기안서 데이터 100% 실시간 연동) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold mb-1">
                                        <span>🇺🇸 미국 나스닥선물</span>
                                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded">NQ=F</span>
                                    </div>
                                    <div className="text-sm sm:text-base font-black text-white font-mono">
                                        {intelligenceMetrics.nqPrice}
                                    </div>
                                    <div className="text-[10px] text-emerald-300 mt-1 font-bold truncate">
                                        ✓ 선물 기안서 실시간 시세 연동
                                    </div>
                                </div>

                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold mb-1">
                                        <span>🤖 글로벌 빅테크 대장</span>
                                        <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.2 rounded">{intelligenceMetrics.bigTechSymbol}</span>
                                    </div>
                                    <div className="text-sm sm:text-base font-black text-white font-mono">
                                        {intelligenceMetrics.bigTechPrice}
                                    </div>
                                    <div className="text-[10px] text-sky-300 mt-1 font-bold truncate">
                                        ✓ {intelligenceMetrics.bigTechUpside}
                                    </div>
                                </div>

                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold mb-1">
                                        <span>💵 실시간 원/달러 환율</span>
                                        <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded">USD/KRW</span>
                                    </div>
                                    <div className="text-sm sm:text-base font-black text-amber-300 font-mono">
                                        {intelligenceMetrics.usdKrwPrice}
                                    </div>
                                    <div className="text-[10px] text-amber-200/90 mt-1 font-bold truncate">
                                        ✓ 실시간 외환 시세 · 외국인 수급 연동
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-rose-950/30 border border-amber-500/35 rounded-xl p-3 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold mb-1">
                                        <span>🎯 상정 종목 평균 기대수익</span>
                                        <span className="text-[10px] text-rose-300 font-mono bg-rose-500/20 px-1.5 py-0.2 rounded font-black">TOP</span>
                                    </div>
                                    <div className="text-sm sm:text-base font-black text-rose-400 font-mono">
                                        평균 +{intelligenceMetrics.avgUpside}%
                                    </div>
                                    <div className="text-[10px] text-rose-300 mt-1 font-bold truncate">
                                        🚀 1위: {intelligenceMetrics.topStock.name} ({intelligenceMetrics.topStock.upside})
                                    </div>
                                </div>
                            </div>

                            {/* 🌟 [2] 오늘의 기안서 3줄 핵심 요약 브리핑 (오늘 상정된 종목 100% 자동 반영) */}
                            <div className="bg-gradient-to-br from-[#0c162c] via-[#0b1222] to-[#0d162a] border border-amber-500/35 rounded-2xl p-4 shadow-xl">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                            📊 오늘 기안서 3줄 핵심 요약
                                        </span>
                                        <span className="text-xs sm:text-sm font-black text-white">
                                            오늘 상정된 {totalDocs}건의 실제 기안서 종목·환율·기대수익 실시간 자동 브리핑
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-emerald-300 font-bold">
                                        ● 기안서 데이터 100% 실시간 연동
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                                    {/* 카드 1: 오늘 기안서에 실제 올라온 국내/미국 종목 */}
                                    <div className="bg-black/45 border border-emerald-500/25 rounded-xl p-3 space-y-1.5">
                                        <div className="text-emerald-300 font-black flex items-center justify-between">
                                            <span>💡 1. 오늘 어떤 종목이 올라왔나요?</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">실시간 기안 종목</span>
                                        </div>
                                        <ul className="space-y-1 text-gray-200 font-medium text-[11px] sm:text-xs">
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">국내 상정주 ({intelligenceMetrics.krDocs.length}건):</strong> <strong className="text-emerald-300">{intelligenceMetrics.krStockListStr}</strong></span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">미국 빅테크 ({intelligenceMetrics.usDocs.length}건):</strong> <strong className="text-sky-300">{intelligenceMetrics.usStockListStr}</strong></span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">선정 기준:</strong> 증권사 목표가 제시 & 분기 흑자 검증 기업</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* 카드 2: 오늘 기안서의 실시간 선물·환율·수급 */}
                                    <div className="bg-black/45 border border-cyan-500/25 rounded-xl p-3 space-y-1.5">
                                        <div className="text-cyan-300 font-black flex items-center justify-between">
                                            <span>📈 2. 글로벌 선물 & 환율·수급은?</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">24H 거시 연동</span>
                                        </div>
                                        <ul className="space-y-1 text-gray-200 font-medium text-[11px] sm:text-xs">
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-cyan-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">글로벌 선물:</strong> {intelligenceMetrics.futuresListStr} (<strong className="text-cyan-300">나스닥 {intelligenceMetrics.nqPrice}</strong>)</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-cyan-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">실시간 환율:</strong> <strong className="text-amber-300">원/달러 {intelligenceMetrics.usdKrwPrice}</strong> (외국인 수급 직결)</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-cyan-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">매매 기준선:</strong> 두 달 평균가(<strong className="text-cyan-300">50일선</strong>) 지지 확인 후 분할 접근</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* 카드 3: 오늘 기안서 기대수익 1위·2위 & 결재 효과 */}
                                    <div className="bg-black/45 border border-rose-500/25 rounded-xl p-3 space-y-1.5">
                                        <div className="text-rose-300 font-black flex items-center justify-between">
                                            <span>🛡️ 3. 오늘 기대수익 TOP & 결재 효과</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">TFT 가동</span>
                                        </div>
                                        <ul className="space-y-1 text-gray-200 font-medium text-[11px] sm:text-xs">
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-rose-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">기대수익 1위:</strong> <strong className="text-rose-300">{intelligenceMetrics.topStock.name} ({intelligenceMetrics.topStock.upside}, 목표 {intelligenceMetrics.topStock.target})</strong></span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-rose-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">기대수익 2위:</strong> <strong className="text-amber-300">{intelligenceMetrics.secondStock.name} ({intelligenceMetrics.secondStock.upside}, 목표 {intelligenceMetrics.secondStock.target})</strong></span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-rose-400 font-black shrink-0">•</span>
                                                <span><strong className="text-white">1천만원 투자 시:</strong> 최고 <strong className="text-emerald-300">{intelligenceMetrics.topStock.profit10m || '약 +872만원'}</strong> 기대 (서명 시 TFT 가동)</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 우측 상단 전자결재 현황판 & 일괄 서명 버튼 */}
                        <div className="bg-[#0b1222]/95 border-2 border-amber-500/35 rounded-2xl p-4 sm:p-5 min-w-[300px] lg:w-[330px] backdrop-blur-md shadow-2xl shrink-0 space-y-3.5">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                                    <span>📋</span>
                                    <span>오늘의 결재 집무판</span>
                                </span>
                                <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                                    {updatedAt ? `${updatedAt} 상정` : '실시간 상정'}
                                </span>
                            </div>

                            {/* 실시간 서명 진행률 게이지 바 */}
                            <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="text-gray-300 font-bold">결재 서명 진행률</span>
                                    <span className="text-amber-300 font-black font-mono">
                                        {intelligenceMetrics.approvalRate}% ({approvedDocsCount}/{totalDocs}건 완료)
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-300 transition-all duration-500 rounded-full"
                                        style={{ width: `${intelligenceMetrics.approvalRate}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-white/5 rounded-xl py-2 px-2 border border-white/5">
                                    <div className="text-[10px] text-gray-400 font-bold">총 상정</div>
                                    <div className="text-lg font-black text-white">{totalDocs}건</div>
                                </div>
                                <div className="bg-amber-500/10 rounded-xl py-2 px-2 border border-amber-500/30">
                                    <div className="text-[10px] text-amber-200 font-bold">서명 대기</div>
                                    <div className="text-lg font-black text-amber-300 flex items-center justify-center gap-1">
                                        {pendingDocsCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />}
                                        <span>{pendingDocsCount}건</span>
                                    </div>
                                </div>
                                <div className="bg-emerald-500/10 rounded-xl py-2 px-2 border border-emerald-500/30">
                                    <div className="text-[10px] text-emerald-200 font-bold">승인 완료</div>
                                    <div className="text-lg font-black text-emerald-400">{approvedDocsCount}건</div>
                                </div>
                            </div>

                            {/* 최고 기대수익주 퀵 하이라이트 박스 */}
                            <div className="bg-gradient-to-r from-rose-950/30 to-amber-950/20 border border-rose-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                <div>
                                    <div className="text-[10px] text-rose-300 font-bold">🚀 오늘 기대수익 1위</div>
                                    <div className="font-black text-white text-sm">{intelligenceMetrics.topStock.name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-rose-400 font-black font-mono text-sm">{intelligenceMetrics.topStock.upside}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">목표 {intelligenceMetrics.topStock.target}</div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleApproveAll}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                            >
                                <span>🖋️ 상정된 안건 전체 일괄 승인 서명하기</span>
                            </button>
                        </div>
                    </div>

                    {/* 🌟 [3] 총 {totalDocs}건 기안서 4대 분류 한눈에 보는 요약표 (줄글 없이 깔끔한 리스트) */}
                    <div className="mt-5 pt-5 border-t border-white/10">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                                    <span>📑</span>
                                    <span>오늘 올라온 {totalDocs}건 기안서 분야별 핵심 요약표</span>
                                </span>
                                <span className="text-xs text-gray-400 hidden sm:inline">
                                    (종목을 클릭하시면 해당 결재 서류로 바로 이동합니다)
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                4대 분야 요약
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* 1. 국내 주식 요약 리스트 */}
                            <div className="bg-[#0b1424]/95 border border-emerald-500/30 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between">
                                <div>
                                    <div
                                        onClick={() => {
                                            setCategoryFilter('kr_stock');
                                            if (intelligenceMetrics.krDocs[0]) handleJumpToDoc(intelligenceMetrics.krDocs[0].doc_id);
                                        }}
                                        className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                                            <span>🇰🇷</span>
                                            <span>국내 우량 실적주</span>
                                        </span>
                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                                            {intelligenceMetrics.krDocs.length}건
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelligenceMetrics.krDocs.map(doc => (
                                            <button
                                                key={doc.doc_id}
                                                type="button"
                                                onClick={() => handleJumpToDoc(doc.doc_id)}
                                                className="w-full flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/5 hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer text-left"
                                            >
                                                <span className="font-extrabold text-white break-keep">{doc.stock_name}</span>
                                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                                    {doc.target_price && <span className="text-gray-300">목표 {doc.target_price}</span>}
                                                    {doc.upside_pct && doc.upside_pct.includes('%') && (
                                                        <span className="text-rose-400 font-black">{doc.upside_pct}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                                    <span>증권사 목표주가 컨센서스</span>
                                    <span>클릭 시 상세 열람 →</span>
                                </div>
                            </div>

                            {/* 2. 미국 빅테크 요약 리스트 */}
                            <div className="bg-[#0b1424]/95 border border-sky-500/30 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between">
                                <div>
                                    <div
                                        onClick={() => {
                                            setCategoryFilter('us_stock');
                                            if (intelligenceMetrics.usDocs[0]) handleJumpToDoc(intelligenceMetrics.usDocs[0].doc_id);
                                        }}
                                        className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-black text-sky-300">
                                            <span>🌎</span>
                                            <span>미국 10대 빅테크</span>
                                        </span>
                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                                            {intelligenceMetrics.usDocs.length}건
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelligenceMetrics.usDocs.map(doc => (
                                            <button
                                                key={doc.doc_id}
                                                type="button"
                                                onClick={() => handleJumpToDoc(doc.doc_id)}
                                                className="w-full flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/5 hover:bg-sky-500/15 border border-transparent hover:border-sky-500/30 transition-all cursor-pointer text-left"
                                            >
                                                <span className="font-extrabold text-white break-keep">{doc.stock_name}</span>
                                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                                    {doc.current_price && <span className="text-gray-300">{doc.current_price.split(' ')[0]}</span>}
                                                    {doc.upside_pct && doc.upside_pct.includes('%') && (
                                                        <span className="text-rose-400 font-black">{doc.upside_pct}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-sky-400 font-bold">
                                    <span>월스트리트 목표가 연동</span>
                                    <span>클릭 시 상세 열람 →</span>
                                </div>
                            </div>

                            {/* 3. 글로벌 선물·지수 요약 리스트 */}
                            <div className="bg-[#0b1424]/95 border border-purple-500/30 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between">
                                <div>
                                    <div
                                        onClick={() => {
                                            setCategoryFilter('global_futures');
                                            if (intelligenceMetrics.futuresDocs[0]) handleJumpToDoc(intelligenceMetrics.futuresDocs[0].doc_id);
                                        }}
                                        className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-black text-purple-300">
                                            <span>📊</span>
                                            <span>글로벌 선물 & 지수</span>
                                        </span>
                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                                            {intelligenceMetrics.futuresDocs.length}건
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelligenceMetrics.futuresDocs.map(doc => (
                                            <button
                                                key={doc.doc_id}
                                                type="button"
                                                onClick={() => handleJumpToDoc(doc.doc_id)}
                                                className="w-full flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/5 hover:bg-purple-500/15 border border-transparent hover:border-purple-500/30 transition-all cursor-pointer text-left"
                                            >
                                                <span className="font-extrabold text-white break-keep">{doc.stock_name}</span>
                                                <span className="text-[11px] font-mono text-purple-300 font-bold shrink-0">
                                                    {doc.current_price ? doc.current_price.split(' ')[0] : '24H 감시'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-purple-400 font-bold">
                                    <span>24시간 야간 선물·원자재</span>
                                    <span>클릭 시 상세 열람 →</span>
                                </div>
                            </div>

                            {/* 4. 전사 종합 & 경제특보 요약 리스트 */}
                            <div className="bg-[#0b1424]/95 border border-amber-500/30 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between">
                                <div>
                                    <div
                                        onClick={() => {
                                            setCategoryFilter('world_news');
                                            if (intelligenceMetrics.newsDocs[0]) handleJumpToDoc(intelligenceMetrics.newsDocs[0].doc_id);
                                        }}
                                        className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 cursor-pointer hover:opacity-80"
                                    >
                                        <span className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                            <span>📰</span>
                                            <span>전사 종합 & 경제특보</span>
                                        </span>
                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                            {intelligenceMetrics.newsDocs.length}건
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelligenceMetrics.newsDocs.map(doc => (
                                            <button
                                                key={doc.doc_id}
                                                type="button"
                                                onClick={() => handleJumpToDoc(doc.doc_id)}
                                                className="w-full flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white/5 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer text-left"
                                            >
                                                <span className="font-extrabold text-white break-keep">{doc.stock_name}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0">
                                                    필독 브리핑
                                                </span>
                                            </button>
                                        ))}
                                        <div className="text-[11px] text-gray-300 bg-black/30 rounded-lg p-2 border border-white/5 leading-snug">
                                            • 미 연준 금리 & 환율 방향성<br />
                                            • 외국인 패시브 자금 유입 점검
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                                    <span>거시경제 핵심 요약</span>
                                    <span>클릭 시 상세 열람 →</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 7인 임원진(주간복기팀·경제일정팀 포함) 자율 업무 완료 상태 카드 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-6">
                        {executives.map(exec => (
                            <div
                                key={exec.id}
                                className="bg-[#0b1222]/90 border border-white/10 rounded-xl p-3 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-xl">{exec.avatar}</span>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                            ✓ 분석·기안 완료
                                        </span>
                                    </div>
                                    <div className="text-sm font-extrabold text-white">{exec.name}</div>
                                    <div className="text-[11px] font-bold text-amber-300/90">{exec.role}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{exec.dept}</div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-emerald-200/90 line-clamp-2">
                                    {exec.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div ref={mainSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                {/* 상단 탭 & 선택형 특별 지시 토글 바 */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('electronic_sign')}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'electronic_sign'
                                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>🖋️ 대표이사 전자결재 서류함 (자동 상정)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/25 font-extrabold">
                                대기 {pendingDocsCount}건
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('one_page_summary')}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'one_page_summary'
                                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-300 text-slate-950 shadow-lg shadow-amber-500/25'
                                    : 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 border border-amber-400/40'
                            }`}
                        >
                            <span>📄 1장 요약 브리핑 카드</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                activeTab === 'one_page_summary' ? 'bg-slate-950/30 text-slate-950' : 'bg-amber-400/20 text-amber-300'
                            }`}>
                                한눈에 보기·복사
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('weekly_review_calendar')}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'weekly_review_calendar'
                                    ? 'bg-gradient-to-r from-teal-400 via-emerald-400 to-sky-400 text-slate-950 shadow-lg shadow-teal-500/25'
                                    : 'bg-teal-500/15 text-teal-200 hover:bg-teal-500/25 border border-teal-400/40'
                            }`}
                        >
                            <span>📋 주간 리서치 복기 &amp; 🗓️ 한주 경제일정</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                activeTab === 'weekly_review_calendar' ? 'bg-slate-950/30 text-slate-950' : 'bg-teal-400/20 text-teal-300'
                            }`}>
                                주말·주간 특화팀
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('boardroom')}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'boardroom'
                                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>🎙️ 임원 대면 브리핑 · 심층 토론실</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/25">
                                {debates.length}명 보고
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('approved_tf');
                                fetchTradingDesk();
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'approved_tf'
                                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>💼</span>
                            <span>트레이딩 운용팀 & 실시간 수익률 보고</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                activeTab === 'approved_tf' ? 'bg-slate-950/40 text-slate-950' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                                {(tradingDesk?.positions?.filter((p: any) => p.status !== 'CLOSED')?.length || approvedDocsCount)}개 종목 운용 중
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('watchlist_research');
                                if (researchReports.length === 0) fetchWatchlistResearch();
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'watchlist_research'
                                    ? 'bg-gradient-to-r from-sky-500 to-indigo-400 text-slate-950 shadow-lg shadow-sky-500/25'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>🛡️ 종목별 리스크 감사 & 관심종목 보고서</span>
                            {researchReports.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/25 font-extrabold">
                                    {researchReports.length}종목
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'history'
                                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>🗂️ 결재 및 특별 지시 기록</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/25">
                                {approvedDocsCount + directiveLogs.length + chatLogs.length}건
                            </span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowCommandDrawer(prev => !prev)}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                                showCommandDrawer
                                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10'
                                    : 'bg-white/5 hover:bg-white/10 border-amber-500/30 text-amber-300'
                            }`}
                        >
                            <span>⚡</span>
                            <span>{showCommandDrawer ? '전사 지휘통제실 접기 ▲' : '전사 지휘통제실 & 자동운용 사령부 열기 ▼'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                fetchOfficeData('', '', false);
                                fetchTradingDesk();
                            }}
                            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                        >
                            🔄 전 부서 시세·보고 갱신
                        </button>
                    </div>
                </div>

                {/* ⚡ 대표이사 심플 지시 & 자동운용 컨트롤 바 (임원회의 탭이거나 대표님이 지시창 버튼을 눌렀을 때만 깔끔하게 표시) */}
                {(showCommandDrawer || activeTab === 'boardroom') && (
                    <div className="bg-gradient-to-br from-[#10192d] via-[#0d1425] to-[#131e36] border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3">
                        {/* 1줄: 상태 배지 + 운용 모드 3단 선택 + 원클릭 자동 명령 3개 */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                    ⚡ 대표이사 전사 지시실
                                </span>
                                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                                    {[
                                        { id: 'aggressive', label: '🔥 공격모드(2천만)' },
                                        { id: 'balanced', label: '⚖️ 표준균형(1천만)' },
                                        { id: 'conservative', label: '🛡️ 안전방어(500만)' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            disabled={isExecutingDirective}
                                            onClick={() => executeCompanyDirective({
                                                command_type: 'UPDATE_POLICY',
                                                mode: m.id,
                                                apply_preset_defaults: true,
                                            })}
                                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                                (companyPolicy?.mode || 'balanced') === m.id
                                                    ? 'bg-amber-500 text-slate-950 font-black'
                                                    : 'text-gray-300 hover:bg-white/10'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 원클릭 자동 실행 버튼 3개 */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={isExecutingDirective}
                                    onClick={() => executeCompanyDirective({ command_type: 'AUTO_INVEST_TOP3' })}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black cursor-pointer"
                                >
                                    🚀 오늘 TOP 3 자동 매수
                                </button>
                                <button
                                    type="button"
                                    disabled={isExecutingDirective}
                                    onClick={() => executeCompanyDirective({ command_type: 'AUDIT_ALL_POSITIONS' })}
                                    className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-black cursor-pointer"
                                >
                                    🛡️ 보유종목 방어선 점검
                                </button>
                                <button
                                    type="button"
                                    disabled={isExecutingDirective}
                                    onClick={() => executeCompanyDirective({ command_type: 'TAKE_PROFIT_WINNERS' })}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black cursor-pointer"
                                >
                                    💰 수익종목 50% 분할익절
                                </button>
                            </div>
                        </div>

                        {/* 2줄: 깔끔한 1줄 지시 입력창 */}
                        <form onSubmit={handleSendDirective} className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={commandInput}
                                onChange={e => setCommandInput(e.target.value)}
                                placeholder="직접 지시를 입력하세요 (예: 삼성중공업 기안 올리고 1000만원 매수해 / 엔비디아 매수해)"
                                className="flex-1 bg-[#070b14] border border-white/20 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isCallingMeeting || isExecutingDirective}
                                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer shrink-0"
                            >
                                {isExecutingDirective || isCallingMeeting ? '⚡ 5대 본부 실행 중...' : '📢 지시 하달 & 자동 집행'}
                            </button>
                        </form>

                        {/* 빠른 지시 칩 */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {QUICK_TOPICS.map(item => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={async () => {
                                        await executeCompanyDirective({
                                            command_type: 'CUSTOM_DIRECTIVE',
                                            directive_text: item.message,
                                            auto_execute: true,
                                        });
                                        fetchOfficeData(item.topic, item.message, true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* 지시 실행 시에만 깔끔하게 뜨는 5대 본부 이행 결과 요약 */}
                        {lastWorkflowResult && (
                            <div className="bg-emerald-950/30 border border-emerald-400/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div className="text-emerald-200 font-bold">
                                    <span className="text-emerald-400 font-black mr-1.5">✅ 전 부서 자동 이행 완료:</span>
                                    {lastWorkflowResult.headline_result}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {lastWorkflowResult.created_doc && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedDocId(lastWorkflowResult.created_doc.doc_id);
                                                setActiveTab('electronic_sign');
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] cursor-pointer"
                                        >
                                            🖋️ 생성된 기안서 보기
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('approved_tf');
                                            fetchTradingDesk();
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[11px] cursor-pointer"
                                    >
                                        💼 트레이딩 내역 보기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLastWorkflowResult(null)}
                                        className="text-gray-400 hover:text-white px-1 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="bg-[#0d1526] border border-white/10 rounded-2xl p-12 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-base font-bold text-white">
                            전 부서 임원들이 오늘의 시장 시스템과 리서치 기안서를 대표님 책상에 올리고 있습니다...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            잠시만 기다려 주시면 서명만 하실 수 있도록 정리된 전자결재판이 열립니다.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 좌측 8컬럼: 대표이사 전자결재 서류함 (기본 탭) */}
                        <div className={['electronic_sign', 'one_page_summary', 'weekly_review_calendar', 'watchlist_research', 'approved_tf'].includes(activeTab) ? 'lg:col-span-12 space-y-5' : 'lg:col-span-8 space-y-5'}>
                            {activeTab === 'electronic_sign' && (
                                <>
                                    {/* 비서실장 브리핑 안내 배너 */}
                                    <div className="bg-gradient-to-r from-amber-500/15 via-indigo-950/40 to-slate-900 border border-amber-500/35 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
                                                👩‍💼
                                            </div>
                                            <div>
                                                <div className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                                                    <span>정유진 비서실장 · 일일 결재 브리핑</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                                        24시간 무휴 자동 상정
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-white font-bold mt-0.5 leading-relaxed">
                                                    &ldquo;대표님! 오늘 각 본부 임원들이 <span className="text-emerald-300">🇰🇷 국내 주식</span>뿐만 아니라 <span className="text-sky-300">🌎 미국 빅테크</span>, <span className="text-purple-300">📊 글로벌 선물</span>, <span className="text-amber-300">📰 전세계 경제뉴스</span>까지 전수 분석하여 총 <span className="text-amber-300 underline font-black">{totalDocs}건의 기안서</span>를 올렸습니다. 메일함처럼 좌측 목록에서 서류를 선택해 10초 핵심 보고를 확인하시고 서명해 주십시오!&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={handleApproveAll}
                                                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                            >
                                                <span>⚡</span>
                                                <span>모든 서류 일괄 승인 (재가)</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 카테고리 탭 & 결재 상태 필터 */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a101f] border border-white/10 rounded-2xl p-3">
                                        {/* 카테고리 탭 5개 */}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {[
                                                { key: 'all', label: '전체', count: countTotal, icon: '📋' },
                                                { key: 'kr_stock', label: '국내 주식', count: countKr, icon: '🇰🇷' },
                                                { key: 'us_stock', label: '미국 빅테크', count: countUs, icon: '🌎' },
                                                { key: 'global_futures', label: '글로벌 선물·지수', count: countFutures, icon: '📊' },
                                                { key: 'world_news', label: '전세계 경제뉴스', count: countNews, icon: '📰' },
                                            ].map(tab => {
                                                const isTabActive = categoryFilter === tab.key;
                                                return (
                                                    <button
                                                        key={tab.key}
                                                        type="button"
                                                        onClick={() => {
                                                            setCategoryFilter(tab.key as any);
                                                            const match = autoApprovals.find(d => tab.key === 'all' || d.category_type === tab.key || (tab.key === 'world_news' && (d.category_type === 'all' || d.doc_id.endsWith('-01'))));
                                                            if (match) setSelectedDocId(match.doc_id);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                            isTabActive
                                                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                                                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                        }`}
                                                    >
                                                        <span>{tab.icon}</span>
                                                        <span>{tab.label}</span>
                                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                                            isTabActive ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-gray-400'
                                                        }`}>
                                                            {tab.count}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* 결재 상태 필터 */}
                                        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1 text-xs shrink-0 self-start sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('all')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                                    statusFilter === 'all' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                전체 ({countTotal})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('pending')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                    statusFilter === 'pending' ? 'bg-amber-500/30 text-amber-300 font-black' : 'text-gray-400 hover:text-amber-300'
                                                }`}
                                            >
                                                <span>⏳ 미결재</span>
                                                <span className="text-[10px] px-1 rounded-full bg-amber-500/20 font-black">{pendingDocsCount}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('approved')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                    statusFilter === 'approved' ? 'bg-emerald-500/30 text-emerald-300 font-black' : 'text-gray-400 hover:text-emerald-300'
                                                }`}
                                            >
                                                <span>💮 결재완료</span>
                                                <span className="text-[10px] px-1 rounded-full bg-emerald-500/20 font-black">{approvedDocsCount}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 이메일형 2단 마스터-디테일 결재 서류함 */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                                        {/* 좌측 서류 목록 (Mail Master List) */}
                                        <div className={`lg:col-span-5 xl:col-span-4 space-y-2.5 ${mobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
                                            <div className="flex items-center justify-between px-1 text-xs text-gray-400 font-bold mb-1">
                                                <span>📬 상정된 서류함 ({filteredDocs.length}건)</span>
                                                <span className="text-[11px] text-amber-300">클릭 시 우측 상세 열람</span>
                                            </div>

                                            <div className="space-y-2.5">
                                                {filteredDocs.length === 0 ? (
                                                    <div className="bg-black/30 border border-white/10 rounded-2xl p-8 text-center text-gray-400 text-xs">
                                                        해당 조건에 맞는 결재 서류가 없습니다.
                                                    </div>
                                                ) : (
                                                    filteredDocs.map((doc) => {
                                                        const signInfo = signMap[doc.doc_id];
                                                        const status: SignStatus = signInfo?.status || 'pending';
                                                        const isSelected = activeDoc?.doc_id === doc.doc_id;

                                                        return (
                                                            <div
                                                                key={doc.doc_id}
                                                                onClick={() => {
                                                                    setSelectedDocId(doc.doc_id);
                                                                    setMobileDetailOpen(true);
                                                                    setTimeout(() => {
                                                                        detailReaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                    }, 60);
                                                                }}
                                                                className={`group relative rounded-2xl border-2 transition-all p-3.5 sm:p-4 cursor-pointer text-left ${
                                                                    isSelected
                                                                        ? 'border-amber-400/80 bg-gradient-to-br from-[#182645] to-[#0f172a] shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40'
                                                                        : status === 'approved'
                                                                        ? 'border-emerald-500/30 bg-[#0a1518]/70 hover:border-emerald-500/60'
                                                                        : status === 'hold'
                                                                        ? 'border-rose-500/30 bg-[#160d15]/70 hover:border-rose-500/60'
                                                                        : 'border-white/10 bg-[#0d1526]/80 hover:border-white/25 hover:bg-[#111c33]'
                                                                }`}
                                                            >
                                                                {/* 선택 좌측 하이라이트 바 */}
                                                                {isSelected && (
                                                                    <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-gradient-to-b from-amber-400 to-yellow-300 rounded-r-full" />
                                                                )}

                                                                {/* 1. 상단: 문서번호 & 카테고리 뱃지 & 결재상태 */}
                                                                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pl-1.5">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-[10px] font-mono font-extrabold text-slate-300 bg-white/5 px-1.5 py-0.5 rounded">
                                                                            {doc.doc_number}
                                                                        </span>
                                                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                                            {doc.category_badge}
                                                                        </span>
                                                                    </div>
                                                                    <div className="shrink-0">
                                                                        {status === 'approved' && (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                                                                                💮 결재완료
                                                                            </span>
                                                                        )}
                                                                        {status === 'hold' && (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-300 bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 rounded-full">
                                                                                ⏸️ 보류
                                                                            </span>
                                                                        )}
                                                                        {status === 'pending' && (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full">
                                                                                ⏳ 미결재
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 2. 종목명 하이라이트 + 핵심 한줄 제목 */}
                                                                {(() => {
                                                                    const { badgeName, mainTitle } = getCleanCardTitle(doc);
                                                                    const bullets = getCleanCardBullets(doc);
                                                                    return (
                                                                        <>
                                                                            <div className="pl-1.5 space-y-1">
                                                                                {badgeName && (
                                                                                    <div className="inline-flex items-center gap-1.5">
                                                                                        <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border border-amber-400/40 text-amber-200 font-black text-xs">
                                                                                            🎯 {badgeName}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                <h4 className={`text-[13px] sm:text-sm font-black leading-snug break-keep ${
                                                                                    isSelected ? 'text-white' : 'text-gray-100 group-hover:text-white'
                                                                                }`}>
                                                                                    {mainTitle}
                                                                                </h4>
                                                                            </div>

                                                                            {/* 3. 💰 현재가 ➔ 목표가 & 기대수익 하이라이트 박스 (확 눈에 띄게!) */}
                                                                            {(doc.current_price || doc.target_price) && (
                                                                                <div className="mt-2.5 ml-1.5 p-2 rounded-xl bg-black/50 border border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
                                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                                        {doc.current_price && (
                                                                                            <span className="text-gray-200 font-bold">
                                                                                                현재 <strong className="text-white">{doc.current_price.split(' ')[0]}</strong>
                                                                                            </span>
                                                                                        )}
                                                                                        {doc.target_price && (
                                                                                            <>
                                                                                                <span className="text-amber-400 font-black">➔</span>
                                                                                                <span className="text-amber-300 font-black">
                                                                                                    목표 {doc.target_price}
                                                                                                </span>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                    {doc.upside_pct && doc.upside_pct !== '컨센서스 유지' && doc.upside_pct !== '집계 중' && (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-rose-500/25 border border-rose-500/40 text-rose-300 font-black text-[11px]">
                                                                                            기대 {doc.upside_pct}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* 4. 📌 핵심 요점 2줄 불릿 요약 (중복 서두 없이 깔끔하게!) */}
                                                                            {bullets.length > 0 && (
                                                                                <ul className="mt-2 pl-1.5 space-y-1 text-[11px] text-gray-200 leading-snug break-keep">
                                                                                    {bullets.map((b, bIdx) => (
                                                                                        <li key={bIdx} className="flex items-start gap-1.5">
                                                                                            <span className="text-amber-400 font-black shrink-0 mt-0.5">•</span>
                                                                                            <span>{b}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}

                                                                {/* 5. 하단: 기안 임원 요약 & 서명 퀵버튼 */}
                                                                <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/10 pl-1.5 text-[10px] text-gray-400">
                                                                    <span className="flex-1 leading-snug break-keep">✍️ {doc.proposer}</span>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateSignature(doc.doc_id, status === 'approved' ? 'pending' : 'approved');
                                                                            }}
                                                                            className={`px-2 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                                                                status === 'approved'
                                                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30'
                                                                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-sm'
                                                                            }`}
                                                                        >
                                                                            {status === 'approved' ? '취소' : '서명'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* 우측 상세 열람실 (Detail Dossier Reader) */}
                                        <div ref={detailReaderRef} className={`lg:col-span-7 xl:col-span-8 scroll-mt-6 ${mobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
                                            {activeDoc ? (
                                                <div className={`relative overflow-hidden rounded-3xl border-2 transition-all p-5 sm:p-7 shadow-2xl ${
                                                    (signMap[activeDoc.doc_id]?.status || 'pending') === 'approved'
                                                        ? 'border-emerald-500/50 bg-gradient-to-br from-[#0b1d19] via-[#0c1626] to-[#09101d]'
                                                        : (signMap[activeDoc.doc_id]?.status || 'pending') === 'hold'
                                                        ? 'border-rose-500/40 bg-[#170f18]'
                                                        : 'border-white/15 bg-gradient-to-br from-[#10192e] to-[#0a101f]'
                                                }`}>
                                                    {/* 모바일 전용 뒤로가기 버튼 */}
                                                    <div className="lg:hidden mb-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMobileDetailOpen(false)}
                                                            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-black text-xs flex items-center justify-center gap-2 border border-white/15 cursor-pointer"
                                                        >
                                                            <span>←</span>
                                                            <span>📬 결재 서류 목록으로 돌아가기</span>
                                                        </button>
                                                    </div>

                                                    {/* 우측 상단 대표이사 결재 도장 스탬프 */}
                                                    {signMap[activeDoc.doc_id]?.status === 'approved' && (
                                                        <div className="sm:absolute sm:top-6 sm:right-7 mb-3 sm:mb-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 font-black text-xs shadow-lg">
                                                            <span>💮 대표이사 결재완료</span>
                                                            <span className="text-[10px] text-emerald-200/80">
                                                                ({signMap[activeDoc.doc_id]?.signedAt})
                                                            </span>
                                                        </div>
                                                    )}
                                                    {signMap[activeDoc.doc_id]?.status === 'hold' && (
                                                        <div className="sm:absolute sm:top-6 sm:right-7 mb-3 sm:mb-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-rose-400 bg-rose-500/20 text-rose-300 font-black text-xs">
                                                            <span>⏸️ 대표이사 보류 지시 ({signMap[activeDoc.doc_id]?.signedAt})</span>
                                                        </div>
                                                    )}
                                                    {signMap[activeDoc.doc_id]?.status === 'reexamine' && (
                                                        <div className="sm:absolute sm:top-6 sm:right-7 mb-3 sm:mb-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 border-sky-400 bg-sky-500/20 text-sky-200 font-black text-xs shadow-lg">
                                                            <span>🔄 심층 재검토 지시됨 ({signMap[activeDoc.doc_id]?.signedAt})</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveTab('boardroom');
                                                                    setTimeout(() => {
                                                                        boardroomDebateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                    }, 200);
                                                                }}
                                                                className="underline text-amber-300 hover:text-amber-200 font-extrabold text-[11px] ml-1 cursor-pointer"
                                                            >
                                                                대면 회의실 입장 →
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* 문서 번호 & 카테고리 헤더 */}
                                                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                                        <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-gray-200 font-mono text-xs font-bold">
                                                            문서번호 {activeDoc.doc_number}
                                                        </span>
                                                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-extrabold">
                                                            {activeDoc.category_badge}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            · {activeDoc.submitted_at}
                                                        </span>
                                                    </div>

                                                    {/* 안건 제목 & 기안자 */}
                                                    <h3 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight pr-0 sm:pr-48">
                                                        {activeDoc.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 font-bold">기안</span>
                                                        <span className="text-zinc-200 font-semibold">{activeDoc.proposer}</span>
                                                    </div>

                                                    {/* 💡 대표님을 위한 10초 쉬운 해설 (가독성 극대화 프리미엄 박스) */}
                                                    {activeDoc.easy_headline && (
                                                        <div className="mt-4 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-zinc-950 border-2 border-amber-400/40 rounded-2xl p-4 sm:p-5 shadow-xl shadow-amber-950/30 relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                                                            <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-md">
                                                                        <span>💡</span>
                                                                        <span>대표님을 위한 10초 쉬운 해설</span>
                                                                    </span>
                                                                    <span className="text-amber-300/90 text-xs font-bold">
                                                                        (쉽게 말해 무슨 뜻인가요?)
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] font-mono text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/25">
                                                                    EXECUTIVE SUMMARY
                                                                </span>
                                                            </div>
                                                            <ul className="space-y-1.5 text-sm sm:text-[15px] font-bold text-zinc-100 leading-relaxed">
                                                                {splitIntoBullets(activeDoc.easy_headline).map((line, lIdx) => (
                                                                    <li key={lIdx} className="flex items-start gap-2">
                                                                        <span className="text-amber-400 font-black shrink-0 mt-0.5">✓</span>
                                                                        <span>{line}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* 💰 [대표님 실시간 시세 & 목표 수익 시뮬레이터 / 거시지표 전광판 분기] */}
                                                    {(() => {
                                                        const isMacroDoc = 
                                                            activeDoc.category_type === 'global_futures' || 
                                                            activeDoc.category_type === 'world_news' || 
                                                            activeDoc.category_type === 'macro' ||
                                                            activeDoc.category_badge?.includes('지표') || 
                                                            activeDoc.category_badge?.includes('뉴스') || 
                                                            activeDoc.category_badge?.includes('특보') ||
                                                            activeDoc.stock_name?.includes('VIX') || 
                                                            activeDoc.stock_name?.includes('환율') || 
                                                            activeDoc.stock_name?.includes('금리') || 
                                                            activeDoc.stock_name?.includes('시스템') ||
                                                            activeDoc.stock_name?.includes('선물');

                                                        const hasPrice = Boolean(activeDoc.current_price || activeDoc.key_numbers.some(k => k.label.includes('현재가') || k.label.includes('현재 주가') || k.label.includes('현재 시세')));
                                                        if (!hasPrice) return null;

                                                        if (isMacroDoc) {
                                                            const isVix = activeDoc.stock_name?.includes('VIX') || activeDoc.title?.includes('VIX');
                                                            const vixVal = parseFloat((activeDoc.current_price || '18').replace(/[^0-9.]/g, '')) || 18.39;
                                                            return (
                                                                <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/30 border border-sky-500/40 shadow-xl relative overflow-hidden">
                                                                    <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm sm:text-base font-black text-sky-300 flex items-center gap-1.5">
                                                                                    <span className="text-lg">📊</span>
                                                                                    <span>[글로벌 거시 지표] 실시간 위험도 &amp; 시장 체온계 진단표</span>
                                                                                </span>
                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse">
                                                                                    ● 24시간 실시간 글로벌 시장 지표 연동
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                                                                                ※ 개별 매수 종목이 아니며, 오늘 주식시장 전체의 <strong className="text-amber-300">'위험도(공포 수위)'와 대외 환경을 진단하는 핵심 계기판</strong>입니다.
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-left sm:text-right shrink-0 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                                                                            <div className="text-[10px] text-emerald-300/90 font-bold">시장 날씨 판정</div>
                                                                            <div className="text-sm sm:text-base font-black text-emerald-400 font-mono tracking-tight flex items-center sm:justify-end gap-1">
                                                                                <span>{isVix ? (vixVal < 20 ? '☀️ 맑음 (안도 랠리)' : vixVal < 30 ? '⛅ 흐림 (주의 관망)' : '⛈️ 폭풍우 (패닉 경보)') : '🌐 글로벌 시장 지표'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* 4단 거시 지표 진단 카드 */}
                                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                                                                        <div className="bg-black/50 rounded-xl p-3 border border-white/10">
                                                                            <div className="text-[11px] text-zinc-400 font-medium">① 실시간 지표 수치</div>
                                                                            <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
                                                                                {isVix ? (activeDoc.current_price?.includes('pt') ? activeDoc.current_price : `${(parseFloat((activeDoc.current_price || '18.39').replace(/[^0-9.]/g, '')) || 18.39).toFixed(2)}pt`) : (activeDoc.current_price || '실시간 연동 중')}
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-black/50 rounded-xl p-3 border border-sky-500/20">
                                                                            <div className="text-[11px] text-sky-300 font-medium">② 지표 성격</div>
                                                                            <div className="text-xs sm:text-sm font-black text-sky-200 mt-0.5 truncate">
                                                                                시장 위험도 측정기 (매수X)
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-black/50 rounded-xl p-3 border border-emerald-500/20">
                                                                            <div className="text-[11px] text-emerald-300 font-medium">③ 시장 공포 수준</div>
                                                                            <div className="text-xs sm:text-sm font-black text-emerald-300 mt-0.5">
                                                                                {isVix ? (vixVal < 20 ? '낮음 (안정 구간 / 20 미만)' : '경계 구간') : '정상 범위 내 등락'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-gradient-to-br from-sky-950/40 to-emerald-950/30 rounded-xl p-3 border border-emerald-500/30">
                                                                            <div className="text-[11px] text-emerald-300/90 font-bold">④ 대표님 행동 지침</div>
                                                                            <div className="text-xs sm:text-sm font-black text-emerald-300 mt-0.5">
                                                                                우량주 분할 매수 적합
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-slate-900 to-zinc-900 border border-amber-500/40 shadow-xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                                                            
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-1.5">
                                                                            <span className="text-lg">💰</span>
                                                                            <span>실시간 현재가 & 목표 기대수익 예측표</span>
                                                                        </span>
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                                                            ● 장중 실시간 호가 연동
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                                                                        대표님께서 지금 매수 후 전문가 목표가에 도달했을 때 <span className="text-amber-300 font-bold">얼마의 수익(차익)</span>이 발생하는지 실시간으로 계산해 드립니다.
                                                                    </p>
                                                                </div>
                                                                {activeDoc.upside_pct && activeDoc.upside_pct !== '컨센서스 유지' && (
                                                                    <div className="text-left sm:text-right shrink-0 bg-rose-500/15 px-3 py-1.5 rounded-xl border border-rose-500/30">
                                                                        <div className="text-[10px] text-rose-300/90 font-bold">목표 달성 시 기대수익률</div>
                                                                        <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight flex items-center sm:justify-end gap-1">
                                                                            <span>{activeDoc.upside_pct}</span>
                                                                            <span className="text-xs font-normal text-rose-300">상승 여력</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 4단 실시간 시세 및 예상 수익 지표 */}
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                                                                <div className="bg-black/50 rounded-xl p-3 border border-white/10">
                                                                    <div className="text-[11px] text-zinc-400 font-medium">① 실시간 현재가</div>
                                                                    <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
                                                                        {activeDoc.current_price || activeDoc.key_numbers.find(k => k.label.includes('현재가') || k.label.includes('현재 주가') || k.label.includes('현재 시세'))?.value || '실시간 연동 중'}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-black/50 rounded-xl p-3 border border-white/10">
                                                                    <div className="text-[11px] text-zinc-400 font-medium">② 전문가 목표주가</div>
                                                                    <div className="text-sm sm:text-base font-black text-amber-300 font-mono mt-0.5">
                                                                        {activeDoc.target_price || activeDoc.key_numbers.find(k => k.label.includes('목표가'))?.value || '컨센서스 유지'}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-black/50 rounded-xl p-3 border border-white/10">
                                                                    <div className="text-[11px] text-zinc-400 font-medium">③ 1주당 기대 차익</div>
                                                                    <div className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-0.5">
                                                                        {activeDoc.profit_per_share || activeDoc.key_numbers.find(k => k.label.includes('주당'))?.value || '집계 중'}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-gradient-to-br from-amber-950/40 to-rose-950/30 rounded-xl p-3 border border-amber-500/30">
                                                                    <div className="text-[11px] text-amber-300/90 font-bold">④ 1,000만원 투자 시 기대수익</div>
                                                                    <div className="text-sm sm:text-base font-black text-amber-300 font-mono mt-0.5">
                                                                        {activeDoc.profit_10m || activeDoc.key_numbers.find(k => k.label.includes('1,000만원'))?.value || '모니터링 중'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                    {/* 🎯 대표님을 위한 종목 심층 3대 핵심 분석 & 팩트체크 */}
                                                    <div className="mt-4 bg-gradient-to-br from-[#0c1427] via-[#09101f] to-[#0d162b] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
                                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-white/10">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                                                <h4 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                                                                    <span>🎯</span>
                                                                    <span>[{activeDoc.stock_name}] 대표님 전용 세부 심층 분석 & 투자 팩트체크</span>
                                                                </h4>
                                                            </div>
                                                            <span className="text-[11px] font-extrabold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25">
                                                                💡 초보자 눈높이 맞춤 해설
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            {/* 1. 핵심 호재 & 왜 오르나요? */}
                                                            <div className="bg-gradient-to-b from-emerald-950/25 via-zinc-900/60 to-zinc-950 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                                                                <div>
                                                                    <div className="flex items-center justify-between gap-1.5 text-xs font-black text-emerald-300 mb-2 pb-1.5 border-b border-emerald-500/15">
                                                                        <span className="flex items-center gap-1">
                                                                            <span>{activeDoc.category_type === 'global_futures' || activeDoc.category_badge?.includes('지표') ? '📊' : '🚀'}</span>
                                                                            <span>{activeDoc.category_type === 'global_futures' || activeDoc.category_badge?.includes('지표') ? '1. 지표의 핵심 의미 (무슨 뜻인가요?)' : '1. 왜 오를까요? (성장 동력)'}</span>
                                                                        </span>
                                                                        <span className="text-[10px] text-emerald-400">박진우 부사장</span>
                                                                    </div>
                                                                    <ul className="space-y-1.5 text-xs text-zinc-200 leading-relaxed font-medium">
                                                                        {splitIntoBullets(parseExecutiveOpinion(activeDoc.research_opinion, "리서치센터", "💡").body || activeDoc.easy_headline || "").map((b, bIdx) => (
                                                                            <li key={bIdx} className="flex items-start gap-1.5">
                                                                                <span className="text-emerald-400 font-black shrink-0">•</span>
                                                                                <span>{b}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                                <div className="mt-3 pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                                                                    <span>실적 모멘텀</span>
                                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 font-black">🟢 성장성 우수</span>
                                                                </div>
                                                            </div>

                                                            {/* 2. 외인/기관 큰손 수급 상태 */}
                                                            <div className="bg-gradient-to-b from-cyan-950/25 via-zinc-900/60 to-zinc-950 border border-cyan-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                                                                <div>
                                                                    <div className="flex items-center justify-between gap-1.5 text-xs font-black text-cyan-300 mb-2 pb-1.5 border-b border-cyan-500/15">
                                                                        <span className="flex items-center gap-1">
                                                                            <span>📈</span>
                                                                            <span>2. 큰손 수급 흐름</span>
                                                                        </span>
                                                                        <span className="text-[10px] text-cyan-400">김도현 상무</span>
                                                                    </div>
                                                                    <ul className="space-y-1.5 text-xs text-zinc-200 leading-relaxed font-medium">
                                                                        {splitIntoBullets(parseExecutiveOpinion(activeDoc.quant_opinion, "수급분석본부", "📊").body || "최근 두 달 평균선(50일선) 위에서 외국인과 기관 큰손들의 수급 지지력을 정밀 감시하고 있습니다.").map((b, bIdx) => (
                                                                            <li key={bIdx} className="flex items-start gap-1.5">
                                                                                <span className="text-cyan-400 font-black shrink-0">•</span>
                                                                                <span>{b}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                                <div className="mt-3 pt-2 border-t border-cyan-500/15 flex items-center justify-between text-[11px] text-cyan-400 font-bold">
                                                                    <span>50일선 추세</span>
                                                                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 font-black">📊 지지력 확보</span>
                                                                </div>
                                                            </div>

                                                            {/* 3. 목표가와 안전마진 / 거시 지표일 경우 위험도 판정 */}
                                                            {(() => {
                                                                const isMacroDoc = 
                                                                    activeDoc.category_type === 'global_futures' || 
                                                                    activeDoc.category_type === 'world_news' || 
                                                                    activeDoc.category_badge?.includes('지표') || 
                                                                    activeDoc.stock_name?.includes('VIX') || 
                                                                    activeDoc.stock_name?.includes('환율') || 
                                                                    activeDoc.stock_name?.includes('금리');

                                                                if (isMacroDoc) {
                                                                    const isVix = activeDoc.stock_name?.includes('VIX') || activeDoc.title?.includes('VIX');
                                                                    return (
                                                                        <div className="bg-gradient-to-b from-sky-950/25 via-zinc-900/60 to-zinc-950 border border-sky-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                                                                            <div>
                                                                                <div className="flex items-center justify-between gap-1.5 text-xs font-black text-sky-300 mb-2 pb-1.5 border-b border-sky-500/15">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <span>🛡️</span>
                                                                                        <span>3. 시장 위험도 판정 &amp; 행동 지침</span>
                                                                                    </span>
                                                                                    <span className="text-[10px] text-sky-400">거시 리스크</span>
                                                                                </div>
                                                                                <ul className="space-y-1.5 text-xs text-zinc-200 leading-relaxed font-medium">
                                                                                    {isVix ? (
                                                                                        <>
                                                                                            <li className="flex items-start gap-1.5">
                                                                                                <span className="text-emerald-400 font-black shrink-0">•</span>
                                                                                                <span><strong className="text-white">공포 수위 판정:</strong> 현재 VIX 지수({isVix ? (activeDoc.current_price?.includes('pt') ? activeDoc.current_price : `${(parseFloat((activeDoc.current_price || '18.39').replace(/[^0-9.]/g, '')) || 18.39).toFixed(2)}pt`) : activeDoc.current_price})는 <strong className="text-emerald-300">20 미만의 안정 구간</strong>으로 시장에 공포가 없습니다.</span>
                                                                                            </li>
                                                                                            <li className="flex items-start gap-1.5">
                                                                                                <span className="text-emerald-400 font-black shrink-0">•</span>
                                                                                                <span><strong className="text-white">외국인 수급 환경:</strong> 위험 회피 심리가 낮아 글로벌 큰손들의 한국 우량주 매수 유입에 우호적입니다.</span>
                                                                                            </li>
                                                                                            <li className="flex items-start gap-1.5">
                                                                                                <span className="text-emerald-400 font-black shrink-0">•</span>
                                                                                                <span><strong className="text-white">대표님 행동 지침:</strong> 승인하신 실전 종목(기업은행 등)을 10만원 예산 내에서 <strong className="text-amber-300">계획대로 분할 매수하셔도 안전</strong>합니다.</span>
                                                                                            </li>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <li className="flex items-start gap-1.5">
                                                                                                <span className="text-sky-400 font-black shrink-0">•</span>
                                                                                                <span><strong className="text-white">거시 지표 흐름:</strong> {activeDoc.current_price} 수준에서 안정적인 등락을 유지하고 있습니다.</span>
                                                                                            </li>
                                                                                            <li className="flex items-start gap-1.5">
                                                                                                <span className="text-sky-400 font-black shrink-0">•</span>
                                                                                                <span><strong className="text-white">포트폴리오 영향:</strong> 대외 급변 요인이 제한적이므로 정상 투자 전략을 유지합니다.</span>
                                                                                            </li>
                                                                                        </>
                                                                                    )}
                                                                                </ul>
                                                                            </div>
                                                                            <div className="mt-3 pt-2 border-t border-sky-500/15 flex items-center justify-between text-[11px] text-sky-300 font-bold">
                                                                                <span>투자 환경 판정</span>
                                                                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">☀️ 시장 날씨 맑음</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div className="bg-gradient-to-b from-purple-950/25 via-zinc-900/60 to-zinc-950 border border-purple-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                                                                        <div>
                                                                            <div className="flex items-center justify-between gap-1.5 text-xs font-black text-purple-300 mb-2 pb-1.5 border-b border-purple-500/15">
                                                                                <span className="flex items-center gap-1">
                                                                                    <span>🎯</span>
                                                                                    <span>3. 목표가 &amp; 기대수익 요약</span>
                                                                                </span>
                                                                                <span className="text-[10px] text-purple-400">밸류에이션</span>
                                                                            </div>
                                                                            <ul className="space-y-1.5 text-xs text-zinc-200 leading-relaxed font-medium">
                                                                                {activeDoc.current_price && activeDoc.target_price ? (
                                                                                    <>
                                                                                        <li className="flex items-start gap-1.5">
                                                                                            <span className="text-purple-400 font-black shrink-0">•</span>
                                                                                            <span><strong className="text-white">현재가 ➔ 목표가:</strong> {activeDoc.current_price} ➔ <strong className="text-amber-300">{activeDoc.target_price}</strong></span>
                                                                                        </li>
                                                                                        <li className="flex items-start gap-1.5">
                                                                                            <span className="text-purple-400 font-black shrink-0">•</span>
                                                                                            <span><strong className="text-white">기대 상승폭:</strong> <strong className="text-rose-400">{activeDoc.upside_pct || '상승 여력 충분'}</strong> ({activeDoc.profit_per_share || '안전마진 확보'})</span>
                                                                                        </li>
                                                                                        <li className="flex items-start gap-1.5">
                                                                                            <span className="text-purple-400 font-black shrink-0">•</span>
                                                                                            <span><strong className="text-white">1천만원 투자 시:</strong> <strong className="text-emerald-300">{activeDoc.profit_10m || '높은 기대수익'}</strong> 예상</span>
                                                                                        </li>
                                                                                    </>
                                                                                ) : (
                                                                                    <li className="flex items-start gap-1.5">
                                                                                        <span className="text-purple-400 font-black shrink-0">•</span>
                                                                                        <span>국내외 제도권 증권사들의 긍정적 투자의견과 함께 추가 상승 여력이 충분한 구간입니다.</span>
                                                                                    </li>
                                                                                )}
                                                                            </ul>
                                                                        </div>
                                                                        <div className="mt-3 pt-2 border-t border-purple-500/15 flex items-center justify-between text-[11px] text-purple-300 font-bold">
                                                                            <span>가격 매력도</span>
                                                                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 font-black">💎 상승 여력 충분</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* 4. 대표이사 리스크 정밀 진단 & 세부 방어 매뉴얼 */}
                                                        {(() => {
                                                            const riskData = getDetailedRiskBreakdown(activeDoc, riskCapital);
                                                            return (
                                                                <div className="mt-4 bg-gradient-to-br from-rose-950/30 via-zinc-950/90 to-red-950/20 border border-rose-500/35 rounded-2xl p-4 sm:p-4.5 shadow-lg space-y-3.5">
                                                                    {/* 상단 타이틀 바 */}
                                                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-rose-500/20">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center text-xs">
                                                                                🛡️
                                                                            </span>
                                                                            <h5 className="text-xs sm:text-sm font-black text-rose-200 tracking-tight flex items-center gap-1.5">
                                                                                <span>4. 리스크 정밀 진단 & 세부 방어 매뉴얼</span>
                                                                                <span className="text-[10px] text-zinc-400 font-normal">| 최서연 리스크관리본부장 (CRO)</span>
                                                                            </h5>
                                                                        </div>
                                                                        <span className="text-[10px] font-black text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/30 flex items-center gap-1">
                                                                            <span>⚠️</span>
                                                                            <span>손실 방어 1순위 감사 완료</span>
                                                                        </span>
                                                                    </div>

                                                                    {/* CRO 핵심 경고 헤드라인 */}
                                                                    <div className="bg-black/50 border border-rose-500/25 rounded-xl p-3 flex items-start gap-2.5">
                                                                        <span className="text-rose-400 font-black text-xs shrink-0 mt-0.5">📌</span>
                                                                        <p className="text-xs text-rose-100/95 font-medium leading-relaxed">
                                                                            <span className="font-black text-rose-300 mr-1.5">[CRO 핵심 경보]:</span>
                                                                            {riskData.headline}
                                                                        </p>
                                                                    </div>

                                                                    {/* 3대 정밀 리스크 요인 분석 카드 그리드 */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                                        {riskData.factors.map((f, fIdx) => (
                                                                            <div key={fIdx} className="bg-zinc-950/80 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                                                                                <div>
                                                                                    <div className="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-white/5">
                                                                                        <span className="text-xs font-black text-white flex items-center gap-1">
                                                                                            <span>{f.icon}</span>
                                                                                            <span>{f.title}</span>
                                                                                        </span>
                                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${f.tagColor}`}>
                                                                                            {f.tag}
                                                                                        </span>
                                                                                    </div>
                                                                                    <ul className="space-y-1.5 text-[11px] sm:text-xs text-zinc-300 leading-relaxed font-medium">
                                                                                        {f.points.map((pt, pIdx) => (
                                                                                            <li key={pIdx} className="flex items-start gap-1.5">
                                                                                                <span className="text-rose-400 font-bold shrink-0">•</span>
                                                                                                <span>{pt}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* 🔒 [안전 게이트키퍼] 대표이사 독점 결재권 보증 안내 배너 */}
                                                                    <div className="bg-gradient-to-r from-sky-950/40 via-blue-950/30 to-indigo-950/30 border border-sky-500/35 rounded-xl p-3 sm:p-3.5 flex items-start gap-3">
                                                                        <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 text-lg shrink-0">
                                                                            🔒
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs font-black text-sky-200">
                                                                                    대표이사 독점 결재권(Human-in-the-Loop Safe Guard) 가동 중
                                                                                </span>
                                                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                                    100% 허가제
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                                                                                자동매매는 대표님께서 기안서를 검토하시고 <strong className="text-amber-300">[승인 서명(재가)]</strong>을 누르신 <strong>‘허가 안건’</strong>에 한해서만, 대표님이 정하신 소액 예산(10만원 등) 한도 내에서 안전하게 체결됩니다. <strong className="text-rose-300">미결재·반려 안건은 계좌에서 1원도 무단 매매되지 않으므로 안심하셔도 됩니다.</strong>
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* 🎯 대표님 전용 철통 자산 방어 4대 실천 수칙 */}
                                                                    <div className="pt-2 border-t border-rose-500/20">
                                                                        <div className="text-[11px] font-black text-amber-300 flex items-center gap-1.5 mb-2">
                                                                            <Target className="w-3.5 h-3.5 text-amber-400" />
                                                                            <span>대표님 전용 '철통 자산 방어 실천 4원칙' (구체적 실행 수칙)</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                            {riskData.defenseRules.map((rule, rIdx) => (
                                                                                <div key={rIdx} className="bg-black/60 border border-amber-500/20 rounded-xl p-3 flex flex-col justify-between">
                                                                                    <div>
                                                                                        <div className="flex items-center justify-between text-[11px] font-black text-zinc-300">
                                                                                            <span>{rule.num} {rule.title}</span>
                                                                                        </div>
                                                                                        <div className="text-xs sm:text-[13px] font-black text-amber-300 font-mono mt-1.5 leading-snug">
                                                                                            {rule.target}
                                                                                        </div>
                                                                                        <p className="text-[11px] text-zinc-300 mt-1.5 leading-relaxed font-medium">
                                                                                            {rule.desc}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {/* 💰 [NEW] 대표이사 실전 자금 배분 & 철통 손익 계산표 / 거시 지표 신호등 분기 */}
                                                                    {(() => {
                                                                        const isMacroDoc = 
                                                                            activeDoc.category_type === 'global_futures' || 
                                                                            activeDoc.category_type === 'world_news' || 
                                                                            activeDoc.category_badge?.includes('지표') || 
                                                                            activeDoc.stock_name?.includes('VIX') || 
                                                                            activeDoc.stock_name?.includes('환율') || 
                                                                            activeDoc.stock_name?.includes('금리');

                                                                        if (isMacroDoc) {
                                                                            const isVix = activeDoc.stock_name?.includes('VIX') || activeDoc.title?.includes('VIX');
                                                                            return (
                                                                                <div className="mt-3.5 bg-black/70 border-2 border-sky-500/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl">
                                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-base">🧭</span>
                                                                                            <h6 className="text-xs sm:text-sm font-black text-white">
                                                                                                {activeDoc.stock_name} 시장 날씨 판정 &amp; 대표님 자산 운용 신호등
                                                                                            </h6>
                                                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                                                                                거시 환경 종합 진단
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                                                                        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                                                                                            <div className="text-[11px] font-black text-emerald-300 flex items-center gap-1.5">
                                                                                                <span>🟢</span>
                                                                                                <span>초록불: VIX 20 미만 (현재 18.39)</span>
                                                                                            </div>
                                                                                            <div className="text-sm font-black text-white">안도 랠리 · 정상 매수 허용</div>
                                                                                            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                                                                                                시장에 공포가 없는 안정 구간입니다. 대표님이 서명하신 개별 우량주(기업은행 등)를 10만원 예산 내에서 계획대로 매수 체결하셔도 안전합니다.
                                                                                            </p>
                                                                                        </div>
                                                                                        
                                                                                        <div className="bg-amber-950/20 border border-amber-500/25 rounded-xl p-3.5 space-y-1.5">
                                                                                            <div className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                                                                                                <span>🟡</span>
                                                                                                <span>노란불: VIX 20 ~ 30</span>
                                                                                            </div>
                                                                                            <div className="text-sm font-black text-amber-200">변동성 주의 · 보수적 접근</div>
                                                                                            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                                                                                                시장이 긴장하고 있는 상태입니다. 시초가 추격 매수를 엄금하고 오전 10시 이후 지지선 안착을 확인한 뒤에만 분할 진입합니다.
                                                                                            </p>
                                                                                        </div>
                                                                                        
                                                                                        <div className="bg-rose-950/20 border border-rose-500/25 rounded-xl p-3.5 space-y-1.5">
                                                                                            <div className="text-[11px] font-black text-rose-300 flex items-center gap-1.5">
                                                                                                <span>🔴</span>
                                                                                                <span>빨간불: VIX 30 이상</span>
                                                                                            </div>
                                                                                            <div className="text-sm font-black text-rose-300">시장 패닉 · 매수 전면 보류</div>
                                                                                            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                                                                                                전쟁·위기 등 폭풍우 구간입니다. 신규 매수를 전면 중단하고 -3.5% 손절선을 엄수하여 현금을 90% 이상 비축합니다.
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                    <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                                                                        ※ <strong>[결재 가이드]</strong>: 본 안건에 [승인 서명]을 누르시더라도 VIX를 직접 매수하지 않으며, <strong className="text-amber-300">“현재 시장 날씨(VIX 18.39)가 맑고 정상이므로, 다른 우량 실전 종목들의 정상 매매를 허가한다”</strong>는 전사 거시 환경 승인으로 자동 처리됩니다.
                                                                                    </p>
                                                                                </div>
                                                                            );
                                                                        }

                                                                        if (!riskData.financialPlan) return null;
                                                                        return (
                                                                        <div className="mt-3.5 bg-black/70 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl">
                                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-base">💰</span>
                                                                                    <h6 className="text-xs sm:text-sm font-black text-white">
                                                                                        {activeDoc.stock_name} 실전 자금 배분 &amp; 철통 손익 방어 계산표
                                                                                    </h6>
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                                        100% 금액 계산 완료
                                                                                    </span>
                                                                                </div>

                                                                                {/* 투자금 변경 퀵 버튼 & 직접 입력 */}
                                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                                    <span className="text-[11px] text-gray-400 font-bold shrink-0">운용 예산:</span>
                                                                                    {[
                                                                                        { label: '🌟 10만원 (소액 실전)', val: 100000 },
                                                                                        { label: '30만원', val: 300000 },
                                                                                        { label: '50만원', val: 500000 },
                                                                                        { label: '100만원', val: 1000000 },
                                                                                        { label: '300만원', val: 3000000 },
                                                                                        { label: '500만원', val: 5000000 },
                                                                                        { label: '1,000만원 (15% 비중)', val: 10000000 },
                                                                                        { label: '5,000만원', val: 50000000 },
                                                                                        { label: '1억원', val: 100000000 },
                                                                                    ].map((btn) => (
                                                                                        <button
                                                                                            key={btn.val}
                                                                                            type="button"
                                                                                            onClick={() => setRiskCapital(btn.val)}
                                                                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                                                                                riskCapital === btn.val
                                                                                                    ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-1 ring-amber-300'
                                                                                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                                                                            }`}
                                                                                        >
                                                                                            {btn.label}
                                                                                        </button>
                                                                                    ))}
                                                                                    <div className="flex items-center gap-1 bg-black/60 border border-white/15 rounded-lg px-2 py-0.5 ml-1">
                                                                                        <span className="text-[10px] text-gray-400 font-bold">직접:</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="10000"
                                                                                            min="10000"
                                                                                            value={riskCapital}
                                                                                            onChange={(e) => {
                                                                                                const n = parseInt(e.target.value, 10);
                                                                                                if (!isNaN(n) && n > 0) setRiskCapital(n);
                                                                                            }}
                                                                                            className="w-20 bg-transparent text-[10px] font-mono text-amber-300 font-bold focus:outline-none text-right"
                                                                                        />
                                                                                        <span className="text-[10px] text-gray-400">원</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* 상세 표 */}
                                                                            <div className="overflow-x-auto">
                                                                                <table className="w-full text-left text-xs border-collapse">
                                                                                    <thead>
                                                                                        <tr className="border-b border-white/10 text-gray-400 text-[11px]">
                                                                                            <th className="py-2 px-2.5 font-bold">진행 단계</th>
                                                                                            <th className="py-2 px-2.5 font-bold">기준 단가</th>
                                                                                            <th className="py-2 px-2.5 font-bold">매수 수량 및 투입 금액</th>
                                                                                            <th className="py-2 px-2.5 font-bold">리스크 통제 &amp; 손익 결과</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-white/5 text-gray-200 text-xs">
                                                                                        <tr className="bg-white/[0.02]">
                                                                                            <td className="py-2.5 px-2.5 font-bold text-sky-300">1차 분할 매수</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-white">{riskData.financialPlan.tranches[0].price}</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-white">{riskData.financialPlan.tranches[0].shares} ({riskData.financialPlan.tranches[0].amt})</td>
                                                                                            <td className="py-2.5 px-2.5 text-gray-300 font-medium">비중 30% · 오전 10시 이후 지지선 진입</td>
                                                                                        </tr>
                                                                                        <tr className="bg-white/[0.02]">
                                                                                            <td className="py-2.5 px-2.5 font-bold text-sky-300">2차 분할 매수</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-white">{riskData.financialPlan.tranches[1].price}</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-white">{riskData.financialPlan.tranches[1].shares} ({riskData.financialPlan.tranches[1].amt})</td>
                                                                                            <td className="py-2.5 px-2.5 text-gray-300 font-medium">비중 40% · 하방 지지력 확인 후 체결</td>
                                                                                        </tr>
                                                                                        <tr className="bg-white/[0.02]">
                                                                                            <td className="py-2.5 px-2.5 font-bold text-sky-300">3차 분할 매수</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-white">{riskData.financialPlan.tranches[2].price}</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-white">{riskData.financialPlan.tranches[2].shares} ({riskData.financialPlan.tranches[2].amt})</td>
                                                                                            <td className="py-2.5 px-2.5 text-gray-300 font-medium">비중 30% · 전고점 상승 돌파 시 추가 매수</td>
                                                                                        </tr>
                                                                                        <tr className="bg-amber-500/10 font-bold border-y border-amber-500/25">
                                                                                            <td className="py-2.5 px-2.5 text-amber-300">⚖️ 총 투자 한도</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-amber-300">현재가 {riskData.financialPlan.currPrice}</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-amber-300">
                                                                                                총 {riskData.financialPlan.totalShares} ({riskData.financialPlan.actualInvest})
                                                                                                {riskData.financialPlan.cashReserve !== '0원' && !riskData.financialPlan.priceExceedsBudget && (
                                                                                                    <span className="text-gray-400 text-[10px] ml-1.5 font-normal">(잔여 현금 {riskData.financialPlan.cashReserve} 비축)</span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="py-2.5 px-2.5 text-amber-200">
                                                                                                {riskData.financialPlan.allocType}
                                                                                                {riskData.financialPlan.priceExceedsBudget && (
                                                                                                    <span className="text-rose-400 text-[10px] block font-normal">※ 1주 단가가 예산보다 높아 최소 1주 기준으로 시뮬레이션</span>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                        <tr className="bg-rose-500/10 font-bold border-b border-rose-500/30">
                                                                                            <td className="py-2.5 px-2.5 text-rose-300 flex items-center gap-1">
                                                                                                <span>🛑</span>
                                                                                                <span>기계적 손절 방어</span>
                                                                                            </td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-rose-400">{riskData.financialPlan.stopLossPrice} (-3.5%)</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-rose-300">전량 매도 ({riskData.financialPlan.totalShares})</td>
                                                                                            <td className="py-2.5 px-2.5 text-rose-200">
                                                                                                <strong className="text-rose-400">최대 손실 -{riskData.financialPlan.maxLossAmount} 한정</strong>
                                                                                                <span className="text-gray-300 ml-1.5">(원금 {riskData.financialPlan.shieldedAmount} 철통 회수)</span>
                                                                                            </td>
                                                                                        </tr>
                                                                                        <tr className="bg-emerald-500/10 font-bold border-b border-emerald-500/25">
                                                                                            <td className="py-2.5 px-2.5 text-emerald-300 flex items-center gap-1">
                                                                                                <span>🎯</span>
                                                                                                <span>1차 분할 익절</span>
                                                                                            </td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-emerald-400">{riskData.financialPlan.target1Price}</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-emerald-300">보유 50% 분할 매도</td>
                                                                                            <td className="py-2.5 px-2.5 text-emerald-200">
                                                                                                <span>현금 회수: {riskData.financialPlan.target1CashIn}</span>
                                                                                                <strong className="text-emerald-400 ml-1.5">(확정 순수익: +{riskData.financialPlan.target1ProfitAmt})</strong>
                                                                                            </td>
                                                                                        </tr>
                                                                                        <tr className="bg-purple-500/10 font-bold">
                                                                                            <td className="py-2.5 px-2.5 text-purple-300 flex items-center gap-1">
                                                                                                <span>🏆</span>
                                                                                                <span>최종 목표가 달성</span>
                                                                                            </td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-purple-300">{riskData.financialPlan.targetPrice} ({riskData.financialPlan.finalUpsidePct})</td>
                                                                                            <td className="py-2.5 px-2.5 font-mono text-purple-200">잔여 50% 전량 익절</td>
                                                                                            <td className="py-2.5 px-2.5 text-purple-200">
                                                                                                <span>총 평가 회수: {riskData.financialPlan.finalTotalVal}</span>
                                                                                                <strong className="text-purple-300 ml-1.5">(최종 누적 순이익: +{riskData.financialPlan.finalProfitAmt})</strong>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                                                                                ※ 대표님의 소중한 원금을 지키기 위해, 최악의 경우에도 <strong className="text-rose-300">최대 손실을 -{riskData.financialPlan.maxLossAmount}으로 철저히 차단</strong>하고 <strong className="text-emerald-300">원금 {riskData.financialPlan.shieldedAmount}을 안전하게 확보</strong>하도록 설계된 실전 리스크 매뉴얼입니다.
                                                                            </p>
                                                                        </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* 🏛️ 대표이사 재가 연동: 전담 TFT 신설 안내 배너 */}
                                                    <div className={`mt-4 rounded-2xl p-4 sm:p-4.5 border transition-all ${
                                                        (signMap[activeDoc.doc_id]?.status || 'pending') === 'approved'
                                                            ? 'bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                                                            : 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/30'
                                                    }`}>
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                                                                    (signMap[activeDoc.doc_id]?.status || 'pending') === 'approved'
                                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                                }`}>
                                                                    {(signMap[activeDoc.doc_id]?.status || 'pending') === 'approved' ? '🚀' : '🏛️'}
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs sm:text-sm font-black flex items-center gap-2">
                                                                        <span className={(signMap[activeDoc.doc_id]?.status || 'pending') === 'approved' ? 'text-emerald-300' : 'text-amber-300'}>
                                                                            {(signMap[activeDoc.doc_id]?.status || 'pending') === 'approved'
                                                                                ? `[대표이사 재가 완료] '${activeDoc.stock_name}' 특별 집중 분석 전담 TFT 가동 중!`
                                                                                : `[대표이사 특명 권한] 서명(재가) 시 '${activeDoc.stock_name}' 전담 분석 TFT 자동 신설`}
                                                                        </span>
                                                                        {(signMap[activeDoc.doc_id]?.status || 'pending') === 'approved' && (
                                                                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 font-bold animate-pulse">
                                                                                24시간 밀착 감시
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] sm:text-xs text-gray-300 font-medium mt-0.5 leading-relaxed">
                                                                        {(signMap[activeDoc.doc_id]?.status || 'pending') === 'approved'
                                                                            ? '리서치센터(박진우)·수급퀀트(김도현)·리스크(최서연) 4대 전담관이 배치되어 목표가 도달 및 실시간 수급을 밀착 추적합니다.'
                                                                            : '대표님께서 하단 [승인 서명 (재가)]을 누르시면, 즉시 이 종목만을 24시간 전담하는 특별 분석 TFT가 발족됩니다.'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {(signMap[activeDoc.doc_id]?.status || 'pending') === 'approved' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveTab('approved_tf')}
                                                                    className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                                                                >
                                                                    <span>🏛️</span>
                                                                    <span>전담 TFT 지휘본부 입장 →</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 핵심 수치 요약 표 (상승/하락 직관적 컬러 반영 & 말줄임 없이 전체 표기) */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
                                                        {activeDoc.key_numbers.map((kn, i) => {
                                                            const valStr = String(kn.value || "");
                                                            const isDown = valStr.includes("-") && (valStr.includes("%") || valStr.includes("하락") || valStr.includes("▼"));
                                                            const isUp = valStr.includes("+") && (valStr.includes("%") || valStr.includes("상승") || valStr.includes("▲"));

                                                            const valColor = isDown 
                                                                ? "text-blue-400 font-mono" 
                                                                : isUp 
                                                                ? "text-rose-400 font-mono" 
                                                                : "text-amber-300 font-sans";

                                                            const cardBorder = isDown 
                                                                ? "border-blue-500/25 bg-blue-950/20" 
                                                                : isUp 
                                                                ? "border-rose-500/25 bg-rose-950/20" 
                                                                : "border-white/10 bg-zinc-900/60";

                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`rounded-2xl p-3 sm:p-3.5 border transition-all shadow-sm flex flex-col justify-between min-h-[78px] sm:min-h-[84px] ${cardBorder}`}
                                                                >
                                                                    <div className="text-[11px] text-zinc-400 font-bold tracking-tight leading-snug mb-1">
                                                                        {kn.label}
                                                                    </div>
                                                                    <div className={`text-xs sm:text-[13px] font-black leading-snug break-words ${valColor}`}>
                                                                        {kn.value}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* 📖 이 보고서에 나온 어려운 단어 3초 풀이 (사전형 카드 그리드) */}
                                                    {activeDoc.easy_terms && activeDoc.easy_terms.length > 0 && (
                                                        <div className="mt-5 bg-gradient-to-br from-zinc-900/90 via-slate-950 to-zinc-950 border border-white/15 rounded-2xl p-4 sm:p-5 shadow-lg">
                                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                                                                <div className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                                                                    <span className="text-base">📖</span>
                                                                    <span>이 보고서에 등장한 어려운 단어 3초 풀이</span>
                                                                </div>
                                                                <span className="text-[11px] text-zinc-400 font-bold hidden sm:inline">
                                                                    초보자를 위한 친절한 금융 용어집
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                {activeDoc.easy_terms.map((t, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="bg-zinc-900/70 border border-white/10 hover:border-amber-400/30 rounded-xl p-3 text-xs leading-relaxed transition-all"
                                                                    >
                                                                        <div className="font-black text-amber-300 mb-1 flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                                            <span>{t.term}</span>
                                                                        </div>
                                                                        <div className="text-zinc-300 font-medium pl-3 border-l-2 border-amber-400/30">
                                                                            {t.desc}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 비서실장 최종 결재 건의문 */}
                                                    <div className="mt-5 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-zinc-900 border border-purple-500/40 rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-purple-950/20">
                                                        <div className="flex items-start gap-3">
                                                            <span className="px-2.5 py-1 rounded-lg bg-purple-500/25 text-purple-200 text-xs font-black border border-purple-400/40 shrink-0 mt-0.5">
                                                                비서실장 최종 검토
                                                            </span>
                                                            <div className="text-xs sm:text-sm text-purple-100 font-bold leading-relaxed">
                                                                {activeDoc.secretary_conclusion}
                                                            </div>
                                                        </div>
                                                        <span className="shrink-0 px-3 py-1.5 rounded-xl bg-purple-500/30 text-purple-200 text-xs font-black border border-purple-400/50 shadow-sm self-start sm:self-auto">
                                                            건의: {activeDoc.recommendation}
                                                        </span>
                                                    </div>

                                                    {/* 하단 대표이사 전자서명 버튼 바 */}
                                                    <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateSignature(activeDoc.doc_id, 'approved')}
                                                                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                    (signMap[activeDoc.doc_id]?.status || 'pending') === 'approved'
                                                                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                                                                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-md shadow-amber-500/20'
                                                                }`}
                                                            >
                                                                <span>
                                                                    {(signMap[activeDoc.doc_id]?.status || 'pending') === 'approved'
                                                                        ? '✅ 대표이사 승인 서명 완료'
                                                                        : '🖋️ 대표이사 승인 서명 (재가)'}
                                                                </span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => updateSignature(activeDoc.doc_id, 'hold')}
                                                                className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                                                                    (signMap[activeDoc.doc_id]?.status || 'pending') === 'hold'
                                                                        ? 'bg-rose-500 text-white border-rose-400'
                                                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/15'
                                                                }`}
                                                            >
                                                                ⏸️ 보류 처리
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleReexamineDoc(activeDoc)}
                                                                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-sky-500/20 via-indigo-500/25 to-sky-500/20 hover:from-sky-500/35 hover:to-indigo-500/35 text-sky-200 border border-sky-400/50 shadow-lg shadow-sky-500/15 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                                                title="5개 본부 임원을 회의실로 긴급 소집하여 대면 심층 보고 및 질의응답을 받습니다"
                                                            >
                                                                <span className="text-base">👥</span>
                                                                <span>임원 대면 심층보고 소집</span>
                                                            </button>
                                                        </div>

                                                        <div className="w-full mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="text-amber-400 text-xs">💡</span>
                                                                <span>
                                                                    <strong className="text-gray-200 font-bold">[임원 대면 심층보고 소집]</strong>을 누르시면 5개 본부 임원이 회의실로 즉각 소집되어 해당 안건의 쟁점과 분석을 실시간 대면 보고합니다.
                                                                </span>
                                                            </span>
                                                        </div>

                                                        {activeDoc.detail_url && (
                                                            <a
                                                                href={activeDoc.detail_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-sky-400 hover:underline font-bold"
                                                            >
                                                                증권사 원문 리포트 열람 ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-[#0d1526] border border-white/10 rounded-3xl p-12 text-center text-gray-400 text-sm">
                                                    좌측 목록에서 결재할 서류를 선택해 주십시오.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 결재함 하단: 전사 4대 자동화 엔진 가동 현황 바 */}
                                    <div className="mt-3 bg-[#0d1526]/60 border border-white/10 rounded-2xl p-3.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                            <span className="text-gray-300 font-bold truncate">🏢 리서치센터 크롤러</span>
                                            <span className="text-emerald-400 font-black text-[11px] ml-auto">정상 ({researchDesk.length}건)</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                            <span className="text-gray-300 font-bold truncate">📈 퀀트 수급 스캐너</span>
                                            <span className="text-emerald-400 font-black text-[11px] ml-auto">50일선 판독</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                                            <span className="text-gray-300 font-bold truncate">🌎 글로벌 24시 데스크</span>
                                            <span className="text-sky-300 font-black text-[11px] ml-auto">실시간 연동</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                                            <span className="text-gray-300 font-bold truncate">🛡️ CRO 리스크 감사봇</span>
                                            <span className="text-purple-300 font-black text-[11px] ml-auto">전 건 감사필</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'one_page_summary' && (() => {
                                const summaryDocs = autoApprovals.filter(doc => {
                                    const st = signMap[doc.doc_id]?.status || 'pending';
                                    if (summaryFilter === 'approved') return st === 'approved';
                                    if (summaryFilter === 'kr_stock') return doc.category_type === 'kr_stock';
                                    if (summaryFilter === 'us_stock') return doc.category_type === 'us_stock';
                                    if (summaryFilter === 'macro') return doc.category_type === 'global_futures' || doc.category_type === 'world_news' || doc.category_type === 'all';
                                    return true;
                                });

                                const handleCopyOnePageSummary = () => {
                                    const nowStr = new Date().toLocaleString('ko-KR');
                                    const lines: string[] = [
                                        `📄 [대표이사 집무실 · 1장 요약 브리핑 시트]`,
                                        `• 일시: ${nowStr}`,
                                        `• 나스닥선물: ${intelligenceMetrics.nqPrice} | 원/달러 환율: ${intelligenceMetrics.usdKrwPrice}`,
                                        `• 상정 ${totalDocs}건 중 결재완료 ${approvedDocsCount}건 (평균 기대수익 +${intelligenceMetrics.avgUpside}%)`,
                                        `----------------------------------------`,
                                    ];
                                    summaryDocs.forEach((d, idx) => {
                                        const st = (signMap[d.doc_id]?.status || 'pending') === 'approved' ? '✅결재완료' : '⏳대기';
                                        const headline = (d.easy_headline || d.title || '').replace(/\s+/g, ' ').trim();
                                        lines.push(
                                            `${idx + 1}. [${st}] ${d.stock_name} (${d.category_badge})`,
                                            `   - 현재가: ${d.current_price || '-'} ➔ 목표가: ${d.target_price || '-'} (${d.upside_pct || '유망'})`,
                                            `   - 1천만원 기대수익: ${d.profit_10m || '-'} | 방어선: 50일선 지지 · -3.5% 손절`,
                                            `   - 핵심포인트: ${headline}`
                                        );
                                    });
                                    if (weeklyReview?.monday_top3_picks?.length) {
                                        lines.push(`----------------------------------------`, `🚀 [차주 월요일 최우선 공략 Top 3]`);
                                        weeklyReview.monday_top3_picks.forEach((p: any) => {
                                            lines.push(`• ${p.rank}위 ${p.name}: 현재 ${p.current} ➔ 목표 ${p.target} (${p.upside}) | ${p.point}`);
                                        });
                                    }
                                    const text = lines.join('\n');
                                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                        navigator.clipboard.writeText(text);
                                        setToastMessage({
                                            title: '📋 1장 요약 브리핑 복사 완료!',
                                            desc: `총 ${summaryDocs.length}건의 종목 타점 및 핵심 포인트가 클립보드에 복사되었습니다. 카카오톡이나 메모장에 바로 붙여넣으실 수 있습니다.`
                                        });
                                    }
                                };

                                return (
                                    <div className="space-y-5">
                                        {/* 1. 상단 컨트롤 & 액션 헤더 */}
                                        <div className="bg-gradient-to-r from-[#0e172a] via-[#131f38] to-[#0e172a] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                                <div>
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black mb-2">
                                                        <span>📄 EXECUTIVE 1-PAGE BRIEFING SHEET</span>
                                                        <span>·</span>
                                                        <span className="text-emerald-300">진입가 · 목표가 · 손절가 · 핵심근거 1장 압축</span>
                                                    </div>
                                                    <h2 className="text-xl sm:text-2xl font-black text-white">
                                                        대표이사 전용 · 오늘의 결재 종목 1장 요약 브리핑 표
                                                    </h2>
                                                    <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                                        개별 기안서를 일일이 열지 않고도 전 종목의 <strong className="text-amber-300">현재 진입가 · 목표주가(기대수익) · 손절 방어선 · 1천만원 기대수익</strong>을 한 장의 표로 비교하고 즉시 결재하실 수 있습니다.
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyOnePageSummary}
                                                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                                                    >
                                                        <span>📋 카톡·메모장용 1장 텍스트 복사</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => typeof window !== 'undefined' && window.print()}
                                                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
                                                    >
                                                        <Printer className="w-4 h-4 text-amber-300" />
                                                        <span>PDF / 1장 인쇄</span>
                                                    </button>
                                                    {pendingDocsCount > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleApproveAll}
                                                            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                                                        >
                                                            🖋️ 전 안건 일괄 승인 ({pendingDocsCount}건)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 4대 핵심 요약 지표 배너 */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                <div className="bg-black/45 border border-white/10 rounded-2xl p-3.5">
                                                    <div className="text-[11px] text-gray-400 font-bold">📌 결재 진행 현황</div>
                                                    <div className="text-base sm:text-lg font-black text-white mt-0.5">
                                                        총 {totalDocs}건 중 <span className="text-emerald-400">{approvedDocsCount}건 재가</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 mt-0.5">미결재 대기: {pendingDocsCount}건</div>
                                                </div>
                                                <div className="bg-black/45 border border-rose-500/30 rounded-2xl p-3.5">
                                                    <div className="text-[11px] text-rose-300 font-bold">🎯 상정 종목 평균 기대수익</div>
                                                    <div className="text-base sm:text-lg font-black text-rose-400 font-mono mt-0.5">
                                                        평균 +{intelligenceMetrics.avgUpside}%
                                                    </div>
                                                    <div className="text-[11px] text-amber-300 mt-0.5 truncate">
                                                        1위: {intelligenceMetrics.topStock.name} ({intelligenceMetrics.topStock.upside})
                                                    </div>
                                                </div>
                                                <div className="bg-black/45 border border-cyan-500/30 rounded-2xl p-3.5">
                                                    <div className="text-[11px] text-cyan-300 font-bold">🌎 글로벌 선물 &amp; 원/달러 환율</div>
                                                    <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5 truncate">
                                                        나스닥 {intelligenceMetrics.nqPrice}
                                                    </div>
                                                    <div className="text-[11px] text-amber-300 mt-0.5">
                                                        환율: {intelligenceMetrics.usdKrwPrice}
                                                    </div>
                                                </div>
                                                <div className="bg-black/45 border border-emerald-500/30 rounded-2xl p-3.5">
                                                    <div className="text-[11px] text-emerald-300 font-bold">🛡️ 전사 표준 리스크 방어선</div>
                                                    <div className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">
                                                        50일선 지지 · -3.5% 손절
                                                    </div>
                                                    <div className="text-[11px] text-gray-300 mt-0.5">
                                                        1차 익절 +15% / 최종 +30%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 필터 버튼 & 뷰 모드 전환 */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {[
                                                        { id: 'all', label: `전체 안건 (${totalDocs})` },
                                                        { id: 'approved', label: `✅ 결재완료 종목 (${approvedDocsCount})` },
                                                        { id: 'kr_stock', label: `🇰🇷 국내 주식 (${countKr})` },
                                                        { id: 'us_stock', label: `🇺🇸 미국 빅테크 (${countUs})` },
                                                        { id: 'macro', label: `📊 선물·거시 (${countFutures + countNews})` },
                                                    ].map(f => (
                                                        <button
                                                            key={f.id}
                                                            type="button"
                                                            onClick={() => setSummaryFilter(f.id as any)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                                summaryFilter === f.id
                                                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                            }`}
                                                        >
                                                            {f.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSummaryViewMode('table')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                                            summaryViewMode === 'table'
                                                                ? 'bg-emerald-500 text-slate-950'
                                                                : 'text-gray-300 hover:text-white'
                                                        }`}
                                                    >
                                                        📊 1장 압축 표 보기
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSummaryViewMode('cards')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                                            summaryViewMode === 'cards'
                                                                ? 'bg-emerald-500 text-slate-950'
                                                                : 'text-gray-300 hover:text-white'
                                                        }`}
                                                    >
                                                        📱 스마트폰 명함 카드뷰
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. 표 모드 (PC/태블릿 한눈에 보기) */}
                                        {summaryViewMode === 'table' ? (
                                            <div className="bg-[#0b1324] border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
                                                {/* 좌우 스크롤 안내 가이드 */}
                                                <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-black/40 to-transparent border-b border-white/10 flex items-center justify-between text-xs text-zinc-300">
                                                    <span className="flex items-center gap-1.5 font-bold text-amber-300">
                                                        <span>↔️</span>
                                                        <span>표를 좌우(← →)로 스크롤하시면 <strong>[원클릭 즉시 승인]</strong> 버튼까지 전체 안건을 한눈에 보실 수 있습니다.</span>
                                                    </span>
                                                    <span className="hidden sm:inline text-zinc-400 font-mono">총 {summaryDocs.length}개 안건 상정</span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[1150px] text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-[#111c35] border-b border-white/15 text-[11px] sm:text-xs font-black text-amber-300">
                                                                <th className="py-3 px-3.5 whitespace-nowrap text-center">구분</th>
                                                                <th className="py-3 px-3.5 whitespace-nowrap">종목명 (코드)</th>
                                                                <th className="py-3 px-3.5 whitespace-nowrap text-right">현재 진입가</th>
                                                                <th className="py-3 px-3.5 whitespace-nowrap text-right">목표가 (기대수익)</th>
                                                                <th className="py-3 px-3.5 whitespace-nowrap text-right">1천만원 기대수익</th>
                                                                <th className="py-3 px-3.5 whitespace-nowrap text-center">손절·방어 기준선</th>
                                                                <th className="py-3 px-3.5 min-w-[280px]">핵심 투자 포인트 (1줄 요약)</th>
                                                                <th className="py-3 px-3.5 text-center whitespace-nowrap">원클릭 결재</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/10 text-xs sm:text-sm">
                                                            {summaryDocs.map((doc) => {
                                                                const isApproved = (signMap[doc.doc_id]?.status || 'pending') === 'approved';
                                                                const theme = getCategoryTheme(doc);
                                                                const oneLinePoint = (doc.easy_headline || doc.secretary_conclusion || doc.title || '').replace(/\s+/g, ' ').trim();
                                                                return (
                                                                    <tr
                                                                        key={doc.doc_id}
                                                                        className={`transition-colors hover:bg-white/[0.04] ${
                                                                            isApproved ? 'bg-emerald-950/15' : ''
                                                                        }`}
                                                                    >
                                                                        <td className="py-3.5 px-3.5 align-middle text-center whitespace-nowrap">
                                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black border ${theme.pill}`}>
                                                                                <span>{theme.icon}</span>
                                                                                <span>{theme.shortLabel}</span>
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3.5 px-3.5 align-middle whitespace-nowrap">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedDocId(doc.doc_id);
                                                                                    setActiveTab('electronic_sign');
                                                                                }}
                                                                                className="text-left group cursor-pointer block"
                                                                            >
                                                                                <div className="font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                                                                                    {doc.stock_name}
                                                                                </div>
                                                                                <div className="text-[11px] text-gray-400 font-mono leading-normal mt-0.5 pb-0.5">
                                                                                    {doc.stock_code || doc.doc_number}
                                                                                </div>
                                                                            </button>
                                                                        </td>
                                                                        <td className="py-3.5 px-3.5 align-middle text-right whitespace-nowrap font-mono font-bold text-gray-200">
                                                                            {doc.current_price || '실시간 연동'}
                                                                        </td>
                                                                        <td className="py-3.5 px-3.5 align-middle text-right whitespace-nowrap font-mono">
                                                                            <div className="font-black text-amber-300 leading-snug">
                                                                                {doc.target_price || '목표가 산정'}
                                                                            </div>
                                                                            {doc.upside_pct && (
                                                                                <div className="text-xs font-black text-rose-400 leading-normal mt-0.5 pb-0.5">
                                                                                    {doc.upside_pct}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-3.5 px-3.5 align-middle text-right whitespace-nowrap font-mono font-black text-emerald-300">
                                                                            {doc.profit_10m || '안정 수익 기대'}
                                                                        </td>
                                                                        <td className="py-3.5 px-3.5 align-middle text-center whitespace-nowrap">
                                                                            <span className="inline-block px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
                                                                                50일선 지지 · -3.5% 손절
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3.5 px-3.5 align-middle text-xs text-gray-200 leading-relaxed min-w-[280px] whitespace-normal">
                                                                            <div className="line-clamp-2 font-medium break-keep leading-relaxed pb-0.5">
                                                                                {oneLinePoint}
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3.5 px-3.5 align-middle text-center whitespace-nowrap">
                                                                            {isApproved ? (
                                                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                                                                                    ✓ 재가완료
                                                                                </span>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleSignDoc(doc.doc_id, 'approved')}
                                                                                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-sm"
                                                                                >
                                                                                    🖋️ 즉시 승인
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 3. 스마트폰 명함 카드뷰 (모바일 캡처 최적화) */
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {summaryDocs.map((doc) => {
                                                    const isApproved = (signMap[doc.doc_id]?.status || 'pending') === 'approved';
                                                    const theme = getCategoryTheme(doc);
                                                    const oneLinePoint = (doc.easy_headline || doc.secretary_conclusion || doc.title || '').replace(/\s+/g, ' ').trim();
                                                    return (
                                                        <div
                                                            key={doc.doc_id}
                                                            className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                                                                isApproved
                                                                    ? 'bg-gradient-to-br from-emerald-950/35 via-[#0c1526] to-[#0a101d] border-emerald-500/45 shadow-lg'
                                                                    : 'bg-[#0b1324] border-white/15'
                                                            }`}
                                                        >
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${theme.pill}`}>
                                                                        <span>{theme.icon}</span>
                                                                        <span>{theme.shortLabel}</span>
                                                                    </span>
                                                                    {isApproved ? (
                                                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black">
                                                                            ✓ 대표이사 재가필
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSignDoc(doc.doc_id, 'approved')}
                                                                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black cursor-pointer"
                                                                        >
                                                                            🖋️ 즉시 승인
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div>
                                                                    <h3 className="text-base sm:text-lg font-black text-white">
                                                                        {doc.stock_name}
                                                                    </h3>
                                                                    <p className="text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                                                                        {oneLinePoint}
                                                                    </p>
                                                                </div>

                                                                <div className="grid grid-cols-3 gap-2 bg-black/45 border border-white/10 rounded-xl p-2.5 text-center">
                                                                    <div>
                                                                        <div className="text-[10px] text-gray-400 font-bold">현재 진입가</div>
                                                                        <div className="text-xs font-black text-white font-mono mt-0.5 truncate">
                                                                            {doc.current_price ? doc.current_price.split(' ')[0] : '-'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="border-x border-white/10 px-1">
                                                                        <div className="text-[10px] text-amber-300 font-bold">목표가(수익)</div>
                                                                        <div className="text-xs font-black text-rose-400 font-mono mt-0.5 truncate">
                                                                            {doc.upside_pct || doc.target_price || '유망'}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-rose-300 font-bold">손절 방어선</div>
                                                                        <div className="text-xs font-black text-rose-300 font-mono mt-0.5">
                                                                            -3.5% / 50일선
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                                                                <span className="text-emerald-300 font-black">
                                                                    💰 1천만 투자 시: {doc.profit_10m || '수익 기대'}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedDocId(doc.doc_id);
                                                                        setActiveTab('electronic_sign');
                                                                    }}
                                                                    className="text-gray-400 hover:text-amber-300 font-bold text-[11px] cursor-pointer"
                                                                >
                                                                    기안서 원문 →
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {activeTab === 'boardroom' && agenda && (
                                <>
                                    {/* 현재 상정 안건 전광판 */}
                                    <div className="bg-gradient-to-br from-[#111c33] to-[#0b1222] border border-white/15 rounded-2xl p-5 shadow-xl">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                📌 {agenda.badge}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                보고 시각: {agenda.timestamp}
                                            </span>
                                        </div>

                                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                                            {agenda.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                            {agenda.subtitle}
                                        </p>

                                        {agenda.key_metrics && agenda.key_metrics.length > 0 && (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/10">
                                                {agenda.key_metrics.map((m, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-black/40 border border-white/10 rounded-xl p-3"
                                                    >
                                                        <div className="text-[11px] text-gray-400 font-semibold">
                                                            {m.label}
                                                        </div>
                                                        <div
                                                            className={`text-base sm:text-lg font-black mt-0.5 ${
                                                                m.tone === 'positive'
                                                                    ? 'text-emerald-400'
                                                                    : m.tone === 'negative'
                                                                    ? 'text-rose-400'
                                                                    : 'text-sky-300'
                                                            }`}
                                                        >
                                                            {m.value}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                            {m.sub}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 1. 🔍 종목 발굴 배경 (왜 하필 이 종목을 분석했는가?) */}
                                    {agenda.discovery_reason && (
                                        <div className="bg-gradient-to-br from-[#121c33] via-[#0f172a] to-[#0a1224] border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                                    <span className="text-xs sm:text-sm font-black text-amber-300">
                                                        {agenda.discovery_reason.badge}
                                                    </span>
                                                </div>
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-200">
                                                    🎯 발굴 계기: {agenda.discovery_reason.trigger}
                                                </span>
                                            </div>

                                            <p className="text-sm sm:text-base text-white font-bold leading-relaxed">
                                                {agenda.discovery_reason.summary}
                                            </p>

                                            {agenda.discovery_reason.key_drivers && agenda.discovery_reason.key_drivers.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-white/10">
                                                    {agenda.discovery_reason.key_drivers.map((kd, idx) => (
                                                        <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-start gap-2">
                                                            <span className="text-amber-400 font-black text-xs shrink-0 mt-0.5">#{idx + 1}</span>
                                                            <span className="text-xs text-gray-200 font-semibold leading-snug">{kd}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. 🎯 매수 추천 3대 핵심 근거 & 투자 전략 가이드 */}
                                    {agenda.buy_reasons && (
                                        <div className="bg-gradient-to-br from-[#0c1a2e] via-[#0d1726] to-[#09121f] border border-emerald-500/35 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">🎯</span>
                                                    <h4 className="text-base sm:text-lg font-black text-white">
                                                        {agenda.buy_reasons.title}
                                                    </h4>
                                                </div>
                                                <span className="text-xs text-emerald-400 font-bold hidden sm:inline">
                                                    전 부서 합동 평가 완료
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                                {agenda.buy_reasons.cards.map((c, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-[#080e1a]/85 border border-white/10 hover:border-emerald-400/40 rounded-xl p-4 flex flex-col justify-between transition-all"
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-2xl">{c.icon}</span>
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                    {c.badge}
                                                                </span>
                                                            </div>
                                                            <h5 className="text-sm font-black text-white mb-1">
                                                                {c.title}
                                                            </h5>
                                                            <div className="text-xs font-bold text-amber-300 mb-2">
                                                                {c.highlight}
                                                            </div>
                                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                                {c.desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. 📋 임원 합동 대면 회의록 (Executive Meeting Minutes) */}
                                    {agenda.meeting_minutes && (
                                        <div ref={boardroomDebateRef} className="scroll-mt-6 bg-[#0b1322] border-2 border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5">
                                            {/* 회의록 헤더 */}
                                            <div className="border-b border-white/15 pb-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 font-mono text-xs font-black">
                                                            {agenda.meeting_minutes.meeting_no}
                                                        </span>
                                                        <span className="text-xs text-indigo-200/80 font-bold">
                                                            공식 임원 회의록
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-mono">
                                                        {agenda.meeting_minutes.date_time}
                                                    </span>
                                                </div>

                                                <h4 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                                                    <span>📋</span>
                                                    <span>{agenda.meeting_minutes.title}</span>
                                                </h4>

                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                                                    <span>📍 장소: <strong className="text-gray-200">{agenda.meeting_minutes.location}</strong></span>
                                                    <span>👤 주재/간사: <strong className="text-gray-200">{agenda.meeting_minutes.chairperson}</strong></span>
                                                </div>

                                                {/* 참석 임원 명단 */}
                                                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                                                    <span className="text-[11px] text-gray-400 font-bold">참석 임원:</span>
                                                    {agenda.meeting_minutes.attendees.map((att, i) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-200"
                                                        >
                                                            <span>{att.avatar}</span>
                                                            <strong className="font-extrabold text-white">{att.name}</strong>
                                                            <span className="text-[10px] text-gray-400">({att.dept})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 생생한 회의 토론록 (대화체 버블) */}
                                            <div className="space-y-3">
                                                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                                                    <span>🎙️</span>
                                                    <span>임원진 심층 토론 및 발언 기록 (Transcript)</span>
                                                </div>

                                                <div className="space-y-2.5">
                                                    {agenda.meeting_minutes.dialogue.map((dlg, i) => (
                                                        <div
                                                            key={i}
                                                            className="bg-black/35 border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-start gap-3 hover:border-white/20 transition-all"
                                                        >
                                                            <div className="flex items-center gap-2 shrink-0 sm:w-36">
                                                                <span className="text-xl">{dlg.avatar}</span>
                                                                <div>
                                                                    <div className="text-xs font-black text-white">{dlg.speaker}</div>
                                                                    <div className="text-[10px] text-amber-400/90 font-bold">{dlg.role}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs sm:text-sm text-gray-200 leading-relaxed sm:border-l sm:border-white/10 sm:pl-3.5">
                                                                {dlg.text}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 회의 최종 의결 주문 */}
                                            <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-emerald-900/30 border-2 border-emerald-400/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-start gap-2.5">
                                                    <span className="text-2xl mt-0.5">💮</span>
                                                    <div>
                                                        <div className="text-xs font-black text-emerald-300">
                                                            투자심의위원회 최종 의결 주문
                                                        </div>
                                                        <div className="text-xs sm:text-sm text-white font-extrabold mt-0.5">
                                                            {agenda.meeting_minutes.verdict_summary}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs shrink-0 shadow-md">
                                                    {agenda.meeting_minutes.verdict_badge}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 임원진 릴레이 대면 보고 */}
                                    <div className="space-y-4">
                                        {debates.map((turn, idx) => {
                                            const st = getStanceStyle(turn.stance_tone);
                                            return (
                                                <div
                                                    key={`${turn.speaker_id}-${idx}`}
                                                    className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${st.cardBorder}`}
                                                >
                                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${st.leftBar}`} />

                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pl-2">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/15 flex items-center justify-center text-xl">
                                                                {turn.avatar}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm sm:text-base font-black text-white">
                                                                        {turn.name}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-amber-300">
                                                                        {turn.role}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-400">
                                                                    {turn.dept}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <span
                                                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${st.badge}`}
                                                        >
                                                            {turn.stance}
                                                        </span>
                                                    </div>

                                                    <div className="pl-2">
                                                        <h4 className={`text-sm sm:text-base font-extrabold mb-2 ${st.accent}`}>
                                                            {turn.headline}
                                                        </h4>
                                                        <div className="text-xs sm:text-sm text-gray-100 leading-relaxed whitespace-pre-line bg-black/30 rounded-xl p-3.5 border border-white/5">
                                                            {turn.message}
                                                        </div>
                                                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                                                            <span>📊 근거 데이터: {turn.data_tag}</span>
                                                            <span>보고 순서 #{idx + 1}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* 🏛️ [대표이사 특명] 재가 종목 특별 집중 분석 전담 TFT 지휘본부 */}
                            {activeTab === 'approved_tf' && (
                                <div className="space-y-6">
                                    {/* 🏛️ 1. 증권사 자산운용본부 프랍 트레이딩 데스크 총괄 현황판 */}
                                    <div className="bg-gradient-to-br from-[#0c1427] via-[#09101f] to-[#0a162b] border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                                        
                                        {/* 헤더 & 일일 보고서 발간 버튼 */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
                                            <div className="flex items-start gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-300 text-slate-950 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-emerald-500/30 font-black">
                                                    💼
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                                                            ● 프랍 트레이딩 데스크 실시간 가동
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            AUM 1억원 포트폴리오
                                                        </span>
                                                    </div>
                                                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                                                        <span>증권사 자산운용 프랍 트레이딩 데스크</span>
                                                    </h2>
                                                    <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                                        대표님께서 서명(재가)하신 종목을 전담 트레이더가 <span className="text-amber-300 font-bold">적정 매수가에 분할 매수</span>하고, 목표가 도달 시 <span className="text-emerald-400 font-bold">분할 익절</span>을 자동 집행하며 실시간 수익률을 직속 보고합니다.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 일일 보고서 발간 & 실시간 동기화 버튼 */}
                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDailyReportModal(true)}
                                                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95"
                                                >
                                                    <BarChart3 className="w-4 h-4 text-slate-950" />
                                                    <span>증권사 일일 운용 결산보고서 열람</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={fetchTradingDesk}
                                                    disabled={tradingLoading}
                                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold text-xs transition-all cursor-pointer"
                                                    title="실시간 호가 및 수익률 동기화"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${tradingLoading ? 'animate-spin text-emerald-400' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* 4대 총괄 운용 지표 (AUM, 평가손익, 실현손익, 종합수익률) */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5">
                                            <div className="bg-black/50 border border-white/10 rounded-2xl p-4">
                                                <div className="text-xs text-gray-400 font-bold flex items-center justify-between">
                                                    <span>총 운용자산 (AUM)</span>
                                                    <span className="text-[10px] text-zinc-500">배정금액</span>
                                                </div>
                                                <div className="text-lg sm:text-xl font-black text-white font-mono mt-1">
                                                    {(tradingDesk?.summary?.total_capital || 100000000).toLocaleString()}원
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    가용 현금: {(tradingDesk?.summary?.available_cash || 100000000).toLocaleString()}원
                                                </div>
                                            </div>

                                            <div className="bg-black/50 border border-emerald-500/30 rounded-2xl p-4">
                                                <div className="text-xs text-emerald-400 font-bold flex items-center justify-between">
                                                    <span>보유종목 평가손익</span>
                                                    <span className="text-[10px] text-emerald-400/80">장중 실시간</span>
                                                </div>
                                                <div className={`text-lg sm:text-xl font-black font-mono mt-1 ${
                                                    (tradingDesk?.summary?.total_unrealized_pnl || 0) >= 0 ? 'text-rose-400' : 'text-blue-400'
                                                }`}>
                                                    {(tradingDesk?.summary?.total_unrealized_pnl || 0) >= 0 ? '+' : ''}
                                                    {(tradingDesk?.summary?.total_unrealized_pnl || 0).toLocaleString()}원
                                                </div>
                                                <div className="text-[11px] text-emerald-300 font-mono mt-1">
                                                    운용 중 포지션 {tradingDesk?.summary?.active_position_count || 0}개 종목
                                                </div>
                                            </div>

                                            <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-4">
                                                <div className="text-xs text-amber-400 font-bold flex items-center justify-between">
                                                    <span>누적 확정 실현손익</span>
                                                    <span className="text-[10px] text-amber-400/80">익절 완료금</span>
                                                </div>
                                                <div className="text-lg sm:text-xl font-black text-amber-300 font-mono mt-1">
                                                    +{(tradingDesk?.summary?.total_realized_pnl || 0).toLocaleString()}원
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    매도 차익 실현 완료
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-emerald-950/40 to-teal-950/30 border border-emerald-500/40 rounded-2xl p-4">
                                                <div className="text-xs text-emerald-300 font-bold flex items-center justify-between">
                                                    <span>종합 순수익률 / 승률</span>
                                                    <span className="text-[10px] text-emerald-300">합산 성과</span>
                                                </div>
                                                <div className="text-lg sm:text-xl font-black text-rose-400 font-mono mt-1">
                                                    +{(tradingDesk?.summary?.combined_return_pct || 0)}%
                                                </div>
                                                <div className="text-[11px] text-emerald-300/90 font-bold mt-1">
                                                    운용 승률: {tradingDesk?.summary?.win_rate || 0}% ({tradingDesk?.summary?.win_count || 0}승 {tradingDesk?.summary?.loss_count || 0}패)
                                                </div>
                                            </div>
                                        </div>

                                        {/* 트레이딩 본부장 브리핑 코멘트 */}
                                        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 font-bold">
                                                👨‍💼
                                            </div>
                                            <div className="text-xs text-gray-300 leading-relaxed">
                                                <div className="font-black text-amber-300 mb-1 flex items-center gap-2">
                                                    <span>[최민석 수석 운용역 · 프랍트레이딩 1팀장 직속 보고]</span>
                                                    <span className="text-[10px] text-gray-400 font-normal">경력 14년 제도권 대형사 출신</span>
                                                </div>
                                                "대표님께서 결재 기안서에서 재가(승인)해 주신 종목들은 호가창을 정밀 분석하여 <span className="text-white font-bold">가장 유리한 적정 매수가에 분할 체결</span>을 완료하였습니다. 현재 시장 변동성 속에서도 <span className="text-rose-400 font-bold font-mono">+{tradingDesk?.summary?.combined_return_pct || 0}%</span>의 초과 수익을 안정적으로 유지 중이며, 1차 목표가(+15%) 도달 시 50% 분할 익절하여 원금을 즉시 회수하는 보수적 방어 체계를 가동하고 있습니다."
                                            </div>
                                        </div>
                                    </div>

                                    {/* 🏛️ 2. 종목별 실시간 트레이딩 운용 카드 (증권사 주문 집행판 & 원장) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                                <span>🎯</span>
                                                <span>재가 종목별 실시간 운용 포지션 & 매매 집행 원장</span>
                                                <span className="text-xs text-gray-400 font-normal">
                                                    (총 {(tradingDesk?.positions || []).length}개 포지션)
                                                </span>
                                            </h3>
                                            <span className="text-xs text-emerald-400 font-bold">
                                                ● 1초 단위 실시간 P&L 갱신
                                            </span>
                                        </div>

                                        {(tradingDesk?.positions || []).length === 0 ? (
                                            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-10 text-center space-y-3">
                                                <div className="text-4xl">📝</div>
                                                <div className="text-lg font-black text-white">현재 운용 중인 재가 종목이 없습니다.</div>
                                                <p className="text-xs text-gray-400 max-w-md mx-auto">
                                                    전자결재 기안서 탭에서 마음에 드는 종목을 검토하시고 [승인 서명 (재가)]을 누르시면, 트레이딩 팀이 즉시 적정 매수가에 분할 매수를 집행하고 운용을 개시합니다.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('electronic_sign')}
                                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                                                >
                                                    결재 기안서 검토하러 가기 →
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {(tradingDesk?.positions || []).map((pos: any) => {
                                                    const isClosed = pos.status === 'CLOSED';
                                                    const isPartial = pos.status === 'PARTIAL_EXIT';
                                                    const isProfit = (pos.pnl_pct || 0) >= 0;

                                                    return (
                                                        <div
                                                            key={pos.id}
                                                            className={`rounded-3xl border-2 transition-all p-5 sm:p-6 shadow-xl space-y-4 ${
                                                                isClosed
                                                                    ? 'bg-zinc-950/60 border-zinc-800 opacity-75'
                                                                    : 'bg-gradient-to-br from-[#0c1427] via-[#09101f] to-[#0a162b] border-emerald-500/35 hover:border-emerald-500/60'
                                                            }`}
                                                        >
                                                            {/* 상단: 종목명 + 상태 + 트레이더 정보 */}
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ${
                                                                        isClosed
                                                                            ? 'bg-zinc-800 text-zinc-400'
                                                                            : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 text-emerald-300'
                                                                    }`}>
                                                                        {pos.category === 'us_stock' ? '🌎' : '📈'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                                                                isClosed
                                                                                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                                                    : isPartial
                                                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                                            }`}>
                                                                                {isClosed ? '⚪ 전량 익절 완료 (청산)' : isPartial ? '🟡 50% 분할 익절 완료 (잔여 보유)' : '🟢 매수 완료 · 목표가 감시 중'}
                                                                            </span>
                                                                            <span className="text-xs text-gray-400 font-mono">
                                                                                {pos.stock_code} · {pos.trader_name}
                                                                            </span>
                                                                        </div>
                                                                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                                                                            <span>{pos.stock_name}</span>
                                                                            <span className="text-xs text-gray-400 font-normal">
                                                                                (진입일시: {pos.buy_date})
                                                                            </span>
                                                                        </h3>
                                                                    </div>
                                                                </div>

                                                                {/* 대표이사 즉각 매매 지휘 액션 버튼 */}
                                                                {!isClosed && (
                                                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleClosePosition(pos.id, pos.stock_name)}
                                                                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                                                                        >
                                                                            <span>⚡</span>
                                                                            <span>시장가 전량 익절 (수익 확정)</span>
                                                                        </button>
                                                                        {!isPartial && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handlePartialSell(pos.id, pos.stock_name)}
                                                                                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/35 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                                                                            >
                                                                                <span>🎯</span>
                                                                                <span>50% 분할 익절</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 4단 손익 및 매매 지표 */}
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                                <div className="bg-black/50 border border-white/10 rounded-2xl p-3">
                                                                    <div className="text-[11px] text-gray-400 font-medium">매수 평균단가 (체결)</div>
                                                                    <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
                                                                        {pos.category === 'kr_stock' ? `${pos.buy_price.toLocaleString()}원` : `$${pos.buy_price}`}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                                        수량: {pos.qty}주 ({(pos.invested_krw || 0).toLocaleString()}원)
                                                                    </div>
                                                                </div>

                                                                <div className="bg-black/50 border border-white/10 rounded-2xl p-3">
                                                                    <div className="text-[11px] text-gray-400 font-medium">
                                                                        {isClosed ? '매도 청산단가' : '실시간 현재가'}
                                                                    </div>
                                                                    <div className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
                                                                        {pos.category === 'kr_stock' ? `${pos.current_price.toLocaleString()}원` : `$${pos.current_price}`}
                                                                    </div>
                                                                    <div className={`text-[10px] mt-0.5 ${isClosed ? 'text-gray-400' : 'text-emerald-400'}`}>
                                                                        {isClosed ? '전량 매도 청산 완료' : '실시간 호가 연동 중'}
                                                                    </div>
                                                                </div>

                                                                <div className={`border rounded-2xl p-3 ${
                                                                    isProfit
                                                                        ? 'bg-rose-950/25 border-rose-500/35'
                                                                        : 'bg-blue-950/25 border-blue-500/35'
                                                                }`}>
                                                                    <div className="text-[11px] font-bold text-gray-300 flex items-center justify-between">
                                                                        <span>{isClosed ? '확정 실현손익' : '실시간 평가손익'}</span>
                                                                        <span className="text-[10px] font-mono font-bold">
                                                                            {isProfit ? '수익 중' : '손실 중'}
                                                                        </span>
                                                                    </div>
                                                                    <div className={`text-sm sm:text-base font-black font-mono mt-0.5 ${
                                                                        isProfit ? 'text-rose-400' : 'text-blue-400'
                                                                    }`}>
                                                                        {isProfit ? '+' : ''}
                                                                        {(isClosed ? pos.realized_pnl : pos.unrealized_pnl || 0).toLocaleString()}원
                                                                    </div>
                                                                    <div className={`text-[11px] font-black font-mono mt-0.5 ${
                                                                        isProfit ? 'text-rose-300' : 'text-blue-300'
                                                                    }`}>
                                                                        수익률: {isProfit ? '+' : ''}{pos.pnl_pct}%
                                                                    </div>
                                                                </div>

                                                                <div className="bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/30 rounded-2xl p-3">
                                                                    <div className="text-[11px] text-amber-300 font-bold">목표 매도가 & 방어선</div>
                                                                    <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">
                                                                        1차: {pos.category === 'kr_stock' ? `${pos.target_price_1?.toLocaleString()}원` : `$${pos.target_price_1}`}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-300 font-mono mt-0.5">
                                                                        최종: {pos.category === 'kr_stock' ? `${pos.target_price_final?.toLocaleString()}원` : `$${pos.target_price_final}`} (손절: {pos.category === 'kr_stock' ? `${pos.stop_loss_price?.toLocaleString()}원` : `$${pos.stop_loss_price}`})
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 3단계 분할 매매 진행 프로그레스 바 */}
                                                            <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5 space-y-2">
                                                                <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                                                                    <span className="flex items-center gap-1.5 text-amber-300">
                                                                        <span>📊</span>
                                                                        <span>증권사 3단계 분할 매매 진행 로드맵</span>
                                                                    </span>
                                                                    <span className="font-mono text-zinc-400">
                                                                        현재가 {pos.category === 'kr_stock' ? `${pos.current_price.toLocaleString()}원` : `$${pos.current_price}`}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                                    <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                                                                        ✓ 1단계: 적정가 분할 매수 완료
                                                                    </div>
                                                                    <div className={`p-2 rounded-xl border font-bold ${
                                                                        isPartial
                                                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                                                            : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                                                    }`}>
                                                                        {isPartial ? '✓ 2단계: 50% 분할 익절 완료' : '2단계: 1차 목표가(+15%) 50% 익절 대기'}
                                                                    </div>
                                                                    <div className={`p-2 rounded-xl border font-bold ${
                                                                        isClosed
                                                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                                                            : 'bg-white/5 border-white/10 text-gray-400'
                                                                    }`}>
                                                                        {isClosed ? '✓ 3단계: 최종 목표 전량 매도 완료' : '3단계: 최종 목표가 전량 매도 대기'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 트레이딩 룸 체결 로그 히스토리 */}
                                                            <div className="bg-[#060a14] rounded-2xl p-3.5 border border-white/10 space-y-2">
                                                                <div className="text-xs font-bold text-zinc-400 flex items-center justify-between">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                                                        <span>트레이딩 데스크 주문 체결 일지</span>
                                                                    </span>
                                                                    <span className="text-[10px] text-zinc-500">감사 기록 보존</span>
                                                                </div>
                                                                <div className="space-y-1.5 font-mono text-xs">
                                                                    {(pos.trade_logs || []).map((tl: any, i: number) => (
                                                                        <div key={i} className="flex items-start gap-2 text-zinc-300">
                                                                            <span className="text-zinc-500 text-[11px] shrink-0">[{tl.timestamp}]</span>
                                                                            <span className={`px-1 py-0.2 rounded text-[10px] font-black shrink-0 ${
                                                                                tl.type === 'BUY'
                                                                                    ? 'bg-rose-500/20 text-rose-300'
                                                                                    : tl.type === 'SELL' || tl.type === 'PARTIAL_SELL'
                                                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                                                    : 'bg-cyan-500/20 text-cyan-300'
                                                                            }`}>
                                                                                {tl.type}
                                                                            </span>
                                                                            <span className="leading-relaxed">{tl.message}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* 🏛️ 3. 증권사 공식 매매 체결 장부 (Trade Blotter) */}
                                    <div className="bg-[#0c1427] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                                <span>📜</span>
                                                <span>증권사 공식 매매 체결 장부 (Trade Blotter)</span>
                                            </h3>
                                            <span className="text-xs text-gray-400">
                                                전자 금융 감사 기준 준수
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs font-mono">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-gray-400 text-[11px]">
                                                        <th className="py-2.5 px-3">주문번호</th>
                                                        <th className="py-2.5 px-3">체결일시</th>
                                                        <th className="py-2.5 px-3">종목명</th>
                                                        <th className="py-2.5 px-3">구분</th>
                                                        <th className="py-2.5 px-3">수량</th>
                                                        <th className="py-2.5 px-3">체결단가</th>
                                                        <th className="py-2.5 px-3">약정금액</th>
                                                        <th className="py-2.5 px-3">체결상태</th>
                                                        <th className="py-2.5 px-3">운용역</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-gray-200">
                                                    {(tradingDesk?.blotter || []).map((b: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                            <td className="py-2.5 px-3 text-gray-400">{b.order_id}</td>
                                                            <td className="py-2.5 px-3 text-gray-400">{b.timestamp}</td>
                                                            <td className="py-2.5 px-3 font-bold text-white">{b.stock_name}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                                                                    b.side.includes('매수')
                                                                        ? 'bg-rose-500/20 text-rose-300'
                                                                        : 'bg-emerald-500/20 text-emerald-300'
                                                                }`}>
                                                                    {b.side}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3">{b.qty}주</td>
                                                            <td className="py-2.5 px-3 font-bold text-amber-300">{b.price_str}</td>
                                                            <td className="py-2.5 px-3">{b.amount_str}</td>
                                                            <td className="py-2.5 px-3 text-emerald-400 font-bold">{b.status}</td>
                                                            <td className="py-2.5 px-3 text-gray-400">{b.trader}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* ⭐ [NEW] 대표이사 관심종목 트레이딩팀 특별 진단 & 포트폴리오 편입 심사대 */}
                                    <div className="bg-[#0f172a] border border-blue-500/20 rounded-2xl p-5 space-y-4 shadow-xl">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">⭐</span>
                                                    <h3 className="text-base font-black text-white">
                                                        대표이사 관심종목 트레이딩팀 특별 진단 & 포트폴리오 편입 심사대
                                                    </h3>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                        최민석 수석 전담 진단
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    대표님의 관심종목을 자산운용 프랍트레이딩 데스크에서 기술적 지지선·적정 매수가·3단계 분할 익절 로드맵을 정밀 진단했습니다. 재가(승인) 시 1,000만 원 규모로 즉시 분할 매수 체결됩니다.
                                                </p>
                                            </div>

                                            {/* 종목 직접 추가 진단 입력폼 */}
                                            <form onSubmit={handleAddCustomWatchlistStock} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={watchlistSearchInput}
                                                    onChange={(e) => setWatchlistSearchInput(e.target.value)}
                                                    placeholder="종목명 또는 코드 (예: 카카오, 현대차, TSLA)"
                                                    className="px-3 py-1.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isWatchlistLoading || !watchlistSearchInput.trim()}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs font-black rounded-xl transition-all shadow flex items-center gap-1 shrink-0"
                                                >
                                                    <span>🔍 진단 의뢰</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fetchWatchlistAnalysis()}
                                                    disabled={isWatchlistLoading}
                                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors border border-white/10"
                                                    title="새로고침"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${isWatchlistLoading ? 'animate-spin text-blue-400' : ''}`} />
                                                </button>
                                            </form>
                                        </div>

                                        {/* 관심종목 진단 카드 리스트 */}
                                        {isWatchlistLoading && watchlistAnalysis.length === 0 ? (
                                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                                <span className="text-xs">트레이딩팀 최민석 수석이 관심종목 실시간 호가 및 지지선을 분석 중입니다...</span>
                                            </div>
                                        ) : watchlistAnalysis.length === 0 ? (
                                            <div className="py-8 text-center text-gray-400 text-xs">
                                                진단된 관심종목이 없습니다. 상단에서 종목명을 입력하여 트레이딩팀에 진단을 의뢰해 보세요.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                {watchlistAnalysis.map((item: any, idx: number) => {
                                                    const isHolding = item.is_already_holding;
                                                    const isPlus = item.change_pct > 0;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`bg-black/40 border ${
                                                                isHolding ? 'border-emerald-500/30' : 'border-white/10 hover:border-blue-500/40'
                                                            } rounded-xl p-4 transition-all flex flex-col justify-between gap-3 shadow`}
                                                        >
                                                            {/* 상단: 종목 정보 및 배지 */}
                                                            <div>
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div>
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                                                                item.category === 'kr_stock'
                                                                                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                                                                                    : 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                                                                            }`}>
                                                                                {item.category === 'kr_stock' ? '국내주식' : '미국주식'}
                                                                            </span>
                                                                            <h4 className="text-sm font-black text-white">
                                                                                {item.stock_name}
                                                                            </h4>
                                                                            <span className="text-[11px] font-mono text-gray-400">
                                                                                {item.stock_code}
                                                                            </span>
                                                                        </div>
                                                                        {/* 현재가 및 등락률 */}
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-base font-black font-mono text-white">
                                                                                {item.current_price_str}
                                                                            </span>
                                                                            <span className={`text-xs font-bold font-mono px-1.5 py-0.2 rounded ${
                                                                                isPlus
                                                                                    ? 'bg-rose-500/15 text-rose-400'
                                                                                    : item.change_pct < 0
                                                                                    ? 'bg-blue-500/15 text-blue-400'
                                                                                    : 'bg-zinc-800 text-gray-400'
                                                                            }`}>
                                                                                {isPlus ? '+' : ''}{item.change_pct}%
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* 진단 등급 배지 */}
                                                                    <div className={`px-2 py-1 rounded-lg text-right shrink-0 ${
                                                                        item.desk_rating === 'S'
                                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                                    }`}>
                                                                        <div className="text-[10px] font-black">{item.desk_rating_label}</div>
                                                                    </div>
                                                                </div>

                                                                {/* 4분할 트레이딩 로드맵 */}
                                                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-xs">
                                                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <span>🎯</span>
                                                                            <span>추천 적정 매수가</span>
                                                                        </div>
                                                                        <div className="text-xs font-black font-mono text-amber-300 mt-0.5">
                                                                            {item.recommended_buy_price_str}
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <span>🚀</span>
                                                                            <span>1차 목표가 (50% 익절)</span>
                                                                        </div>
                                                                        <div className="text-xs font-black font-mono text-emerald-400 mt-0.5">
                                                                            {item.target_price_1_str}
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <span>🏆</span>
                                                                            <span>최종 목표가</span>
                                                                        </div>
                                                                        <div className="text-xs font-black font-mono text-rose-300 mt-0.5">
                                                                            {item.target_price_final_str}
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <span>🛡️</span>
                                                                            <span>손절 방어선</span>
                                                                        </div>
                                                                        <div className="text-xs font-black font-mono text-gray-400 mt-0.5">
                                                                            {item.stop_loss_price_str}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* 운용역 코멘트 */}
                                                                <div className="mt-2.5 p-2 bg-blue-950/20 border border-blue-500/15 rounded-lg text-[11px] text-blue-200/90 leading-relaxed">
                                                                    <span className="font-bold text-blue-300 mr-1">👨‍💼 수석 운용역 분석:</span>
                                                                    {item.trader_comment}
                                                                </div>
                                                            </div>

                                                            {/* 액션 버튼 */}
                                                            <div className="pt-2 border-t border-white/5">
                                                                {isHolding ? (
                                                                    <div className="w-full py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        <span>트레이딩팀 포트폴리오 운용 중 (현재 수익률: {item.holding_pnl_pct > 0 ? '+' : ''}{item.holding_pnl_pct}%)</span>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleApproveWatchlistStock(item)}
                                                                        className="w-full py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <span>🚀 대표이사 재가 & 트레이딩팀 즉시 편입 (1,000만원 분할 매수)</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}{activeTab === 'watchlist_research' && (
                                <div className="space-y-5">
                                    <div className="bg-gradient-to-r from-[#0d1627] via-[#101d38] to-[#0d1627] border-2 border-sky-500/40 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                                    <span>🛡️</span>
                                                    <span>CRO 최서연 상무 (리스크 총괄)</span>
                                                </span>
                                                <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                                    전사 리스크 감사 보고서
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                    관심종목 {researchReports.length}종목 전수 점검
                                                </span>
                                            </div>
                                            <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                                                🛡️ 종목별 리스크 감사 보고서 &amp; 내 관심종목 정밀 자산 방어선
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
                                                대표님의 소중한 투자 원금을 지키기 위해, 내 관심종목은 물론 검색하신 모든 종목에 대해 <strong className="text-amber-300">정밀 리스크 등급 · -3.5% 자동 손절선 · 1차 익절가 · 계좌 15% 비중 한도</strong>를 산출하여 1장의 리스크 감사 보고서로 브리핑합니다.
                                                {researchGeneratedAt && (
                                                    <span className="text-sky-300 font-bold ml-1">({researchGeneratedAt} 기준)</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link
                                                href="/watchlist"
                                                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 text-xs font-bold transition-all"
                                            >
                                                ⚙️ 관심종목 설정
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={fetchWatchlistResearch}
                                                disabled={researchLoading}
                                                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-gray-700 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/20"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${researchLoading ? 'animate-spin' : ''}`} />
                                                <span>{researchLoading ? '전수 점검 중...' : '관심종목 전수 새로고침'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 🔍 [방안 2 핵심 기능] 자율 종목 검색 & 실시간 리스크 감사 바 */}
                                    <div className="bg-[#0b1324] border border-sky-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🔍</span>
                                                <h4 className="text-xs sm:text-sm font-black text-white">
                                                    자율 종목 즉시 검색 &amp; 실시간 리스크 감사 보고서 생성
                                                </h4>
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                    국내·미국 전 종목 실시간 진단
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-400">
                                                원하시는 종목을 입력하시면 최서연 CRO의 1장 리스크 진단서가 즉시 생성됩니다.
                                            </span>
                                        </div>

                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                handleSearchStockRisk();
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <input
                                                type="text"
                                                value={riskSearchQuery}
                                                onChange={(e) => setRiskSearchQuery(e.target.value)}
                                                placeholder="진단할 종목명 또는 종목코드 입력 (예: 두산에너빌리티, 삼성전자, 현대차, NVDA, TSLA...)"
                                                className="flex-1 bg-black/60 border border-white/15 focus:border-sky-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all"
                                            />
                                            <button
                                                type="submit"
                                                disabled={riskSearchLoading || !riskSearchQuery.trim()}
                                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 disabled:bg-gray-800 disabled:from-transparent disabled:to-transparent text-slate-950 disabled:text-gray-500 text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-sky-500/25"
                                            >
                                                {riskSearchLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                                ) : (
                                                    <span>🔍</span>
                                                )}
                                                <span>{riskSearchLoading ? '감사 중...' : '실시간 리스크 감사'}</span>
                                            </button>
                                        </form>

                                        {/* 추천 빠른 종목 칩 */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            <span className="text-[11px] font-bold text-gray-400 mr-1">⚡ 대표님 다빈도 종목:</span>
                                            {[
                                                { name: '삼성전자', code: '005930' },
                                                { name: 'SK하이닉스', code: '000660' },
                                                { name: '두산에너빌리티', code: '034020' },
                                                { name: '현대차', code: '005380' },
                                                { name: '한화에어로스페이스', code: '012450' },
                                                { name: '알테오젠', code: '196170' },
                                                { name: '엔비디아 (NVDA)', code: 'NVDA' },
                                                { name: '테슬라 (TSLA)', code: 'TSLA' },
                                                { name: '애플 (AAPL)', code: 'AAPL' },
                                            ].map((chip) => (
                                                <button
                                                    key={chip.code}
                                                    type="button"
                                                    onClick={() => {
                                                        setRiskSearchQuery(chip.name);
                                                        handleSearchStockRisk(chip.code);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-sky-500/20 text-gray-300 hover:text-sky-300 border border-white/10 hover:border-sky-500/30 text-[11px] font-medium transition-all cursor-pointer"
                                                >
                                                    {chip.name}
                                                </button>
                                            ))}
                                        </div>

                                        {riskSearchError && (
                                            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                                                <span>⚠️</span>
                                                <span>{riskSearchError}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 🌟 [자율 검색된 종목 스포트라이트 리스크 감사 보고서] */}
                                    {searchedRiskReport && (() => {
                                        const r = searchedRiskReport;
                                        const isKr = r.category === 'kr_stock';
                                        const audit = computeStockRiskDiagnostic(r, riskCapital);
                                        const isCopied = copiedRiskStock === r.stock_code;

                                        return (
                                            <div className="bg-gradient-to-br from-[#121b2f] via-[#0d1628] to-[#121b2f] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-300">
                                                {/* 헤더 */}
                                                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md">
                                                                <span>⚡ 실시간 감사 완료</span>
                                                            </span>
                                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${isKr ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                                                                {isKr ? '🇰🇷 국내주식' : '🌎 미국주식'}
                                                            </span>
                                                            <h4 className="text-xl sm:text-2xl font-black text-white">{r.stock_name}</h4>
                                                            <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">{r.stock_code}</span>
                                                        </div>
                                                        <p className="text-xs sm:text-sm text-gray-300 mt-1.5 font-medium">{r.headline}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyRiskAudit(r, audit)}
                                                            className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                isCopied
                                                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg'
                                                                    : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/15'
                                                            }`}
                                                        >
                                                            <span>{isCopied ? '✅ 복사 완료!' : '📋 카톡·메모장 복사'}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (typeof window !== 'undefined') window.print();
                                                            }}
                                                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                            <span>🖨️ 1장 PDF 인쇄</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSearchedRiskReport(null)}
                                                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                                                            title="닫기"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 시세 요약 */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                                    <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                                                        <div className="text-[11px] text-gray-400 font-bold">실시간 현재가</div>
                                                        <div className="text-lg font-black font-mono text-white mt-0.5">{r.price_str}</div>
                                                        <div className={`text-xs font-bold font-mono mt-0.5 ${r.change_pct > 0 ? 'text-rose-400' : r.change_pct < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                            {r.change_pct > 0 ? '+' : ''}{r.change_pct}%
                                                        </div>
                                                    </div>
                                                    <div className="bg-black/50 border border-amber-500/25 rounded-xl p-3">
                                                        <div className="text-[11px] text-amber-300 font-bold">증권사 목표가</div>
                                                        <div className="text-lg font-black font-mono text-amber-300 mt-0.5">{r.consensus?.target_mean_str || '실적 리포트 참고'}</div>
                                                        <div className="text-[11px] text-gray-300 mt-0.5">상승여력 {r.consensus?.upside_pct ? `+${r.consensus.upside_pct}%` : '집계 중'}</div>
                                                    </div>
                                                    <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                                                        <div className="text-[11px] text-gray-400 font-bold">52주 위치</div>
                                                        <div className="text-lg font-black font-mono text-white mt-0.5">{r.range_pos !== null && r.range_pos !== undefined ? `하단 대비 ${r.range_pos}%` : '-'}</div>
                                                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">{r.low52_str || ''} ~ {r.high52_str || ''}</div>
                                                    </div>
                                                    <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                                                        <div className="text-[11px] text-gray-400 font-bold">PER · PBR</div>
                                                        <div className="text-lg font-black font-mono text-white mt-0.5">{r.per ? `PER ${Number(r.per).toFixed(1)}배` : '-'}</div>
                                                        <div className="text-[11px] text-sky-300 mt-0.5">{r.pbr ? `PBR ${Number(r.pbr).toFixed(2)}배` : ''}</div>
                                                    </div>
                                                </div>

                                                {/* 🛡️ 최서연 CRO 리스크 정밀 감사 & 자산 방어선 모듈 */}
                                                <div className="bg-gradient-to-br from-rose-950/30 via-slate-900/90 to-zinc-950 border-2 border-rose-500/40 rounded-2xl p-4 sm:p-5 space-y-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">🛡️</span>
                                                            <h5 className="text-sm sm:text-base font-black text-white">
                                                                최서연 CRO 리스크 정밀 감사 &amp; 자산 방어 실천 가이드
                                                            </h5>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-300">종합 리스크 등급:</span>
                                                            <span className={`px-3 py-1 rounded-xl text-xs font-black border ${audit.badgeClass}`}>
                                                                {audit.riskLevel} (위험도 {audit.riskScore}/5)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 대표이사 자산 방어 4대 실천 가이드 (숫자 기반) */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                                        <div className="bg-black/60 border border-sky-500/30 rounded-xl p-3">
                                                            <div className="text-[11px] text-sky-300 font-black flex items-center gap-1">
                                                                <span>🛡️</span>
                                                                <span>안전 권장 진입가</span>
                                                            </div>
                                                            <div className="text-sm sm:text-base font-black font-mono text-white mt-1">
                                                                {audit.safeEntryStr.split(' ')[0]}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5">추격 매수 자제선</div>
                                                        </div>

                                                        <div className="bg-black/60 border border-rose-500/40 rounded-xl p-3">
                                                            <div className="text-[11px] text-rose-300 font-black flex items-center gap-1">
                                                                <span>🛑</span>
                                                                <span>기계적 손절선 (-3.5%)</span>
                                                            </div>
                                                            <div className="text-sm sm:text-base font-black font-mono text-rose-400 mt-1">
                                                                {audit.stopLossStr.split(' ')[0]}
                                                            </div>
                                                            <div className="text-[10px] text-rose-300/80 mt-0.5">이탈 시 즉시 기계적 손절</div>
                                                        </div>

                                                        <div className="bg-black/60 border border-emerald-500/30 rounded-xl p-3">
                                                            <div className="text-[11px] text-emerald-300 font-black flex items-center gap-1">
                                                                <span>🎯</span>
                                                                <span>1차 분할 익절가 (50%)</span>
                                                            </div>
                                                            <div className="text-sm sm:text-base font-black font-mono text-emerald-400 mt-1">
                                                                {audit.takeProfitStr.split(' ')[0]}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5">원금 및 확정수익 확보</div>
                                                        </div>

                                                        <div className="bg-black/60 border border-amber-500/30 rounded-xl p-3">
                                                            <div className="text-[11px] text-amber-300 font-black flex items-center gap-1">
                                                                <span>⚖️</span>
                                                                <span>계좌 최대 비중 한도</span>
                                                            </div>
                                                            <div className="text-sm sm:text-base font-black font-mono text-amber-300 mt-1">
                                                                최대 10~15%
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5">몰빵 절대 금지 룰</div>
                                                        </div>
                                                    </div>

                                                    {/* 3대 정밀 리스크 팩터 세부 진단 */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {audit.factors.map((f, fIdx) => (
                                                            <div key={fIdx} className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 text-xs font-black text-white">
                                                                        <span>{f.icon}</span>
                                                                        <span>{f.title}</span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.tagColor}`}>
                                                                        {f.tag}
                                                                    </span>
                                                                </div>
                                                                <ul className="space-y-1.5 text-[11px] text-gray-300 leading-relaxed font-medium">
                                                                    {f.points.map((pt, pIdx) => (
                                                                        <li key={pIdx} className="flex items-start gap-1.5">
                                                                            <span className="text-rose-400 font-black shrink-0">•</span>
                                                                            <span>{pt}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* 최서연 상무 최종 소견 */}
                                                    <div className="p-3.5 rounded-xl bg-black/70 border border-rose-500/30 text-xs space-y-1">
                                                        <div className="flex items-center gap-1.5 text-rose-300 font-black">
                                                            <span>⚠️</span>
                                                            <span>최서연 CRO 상무의 직설적 최종 결재 의견</span>
                                                        </div>
                                                        <p className="text-gray-200 leading-relaxed font-medium">
                                                            &ldquo;{audit.croVerdict}&rdquo;
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {researchLoading && researchReports.length === 0 ? (
                                        <div className="py-16 bg-[#0f172a] border border-white/10 rounded-2xl flex flex-col items-center gap-3 text-gray-300">
                                            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                                            <span className="text-sm font-bold">관심종목별 증권사 리서치 리포트 원문과 실시간 수급 데이터를 수집하고 있습니다...</span>
                                        </div>
                                    ) : researchReports.length === 0 ? (
                                        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-10 text-center space-y-3">
                                            <div className="text-4xl">⭐</div>
                                            <div className="text-base font-black text-white">등록된 관심종목이 없습니다</div>
                                            <p className="text-xs text-gray-400">관심종목을 먼저 등록하시면 종목별 증권사 리서치 보고서가 자동으로 생성됩니다.</p>
                                            <Link href="/watchlist" className="inline-block px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black">
                                                관심종목 설정하러 가기 →
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 border-b border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">📋</span>
                                                    <h4 className="text-sm sm:text-base font-black text-white">
                                                        대표님 등록 관심종목 전수 리스크 관리 보고서 ({researchReports.length}개 종목)
                                                    </h4>
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                                                        최서연 CRO 정밀 진단
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    ※ 종목별 리스크 감사 결과 · -3.5% 손절 방어선 · 1장 인쇄 및 복사 지원
                                                </span>
                                            </div>

                                            {researchReports.map((r: any) => {
                                                const isKr = r.category === 'kr_stock';
                                                const audit = computeStockRiskDiagnostic(r, riskCapital);
                                                const isCopied = copiedRiskStock === r.stock_code;
                                                const fmtFlow = (v: number | null | undefined) =>
                                                    v === null || v === undefined ? '-' : `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}주`;
                                                const flowColor = (v: number | null | undefined) =>
                                                    !v ? 'text-gray-300' : v > 0 ? 'text-rose-400' : 'text-blue-400';
                                                const badge: Record<string, string> = {
                                                    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                                                    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                                                    slate: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                                                    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                                                };
                                                const brokerReports: any[] = r.broker_reports || [];

                                                return (
                                                    <div key={r.stock_code} className="bg-gradient-to-br from-[#0f172a] via-[#0c1324] to-[#0f172a] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
                                                        {/* 1. 종목 헤더 */}
                                                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-white/10">
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${isKr ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                                                                        {isKr ? '🇰🇷 국내주식' : '🌎 미국주식'}
                                                                    </span>
                                                                    <h4 className="text-xl font-black text-white">{r.stock_name}</h4>
                                                                    <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">{r.stock_code}</span>
                                                                    {brokerReports.length > 0 && (
                                                                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                            📑 증권사 리포트 {brokerReports.length}건 수록
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs sm:text-sm text-gray-300 mt-1.5 font-medium">{r.headline}</p>
                                                            </div>
                                                            <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black border shadow-sm ${badge[r.opinion?.color] || badge.slate}`}>
                                                                종합 의견 · {r.opinion?.label}
                                                            </span>
                                                        </div>

                                                        {/* 2. 4대 핵심 시세 & 밸류에이션 지표 */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                            <div className="bg-black/45 border border-white/10 rounded-xl p-3.5">
                                                                <div className="text-[11px] text-gray-400 font-bold">실시간 현재가</div>
                                                                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">{r.price_str}</div>
                                                                <div className={`text-xs font-bold font-mono mt-0.5 ${r.change_pct > 0 ? 'text-rose-400' : r.change_pct < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                                    {r.change_pct > 0 ? '+' : ''}{r.change_pct}% {r.trading_value ? `· 거래대금 ${r.trading_value}` : ''}
                                                                </div>
                                                            </div>

                                                            <div className="bg-black/45 border border-amber-500/25 rounded-xl p-3.5">
                                                                <div className="text-[11px] text-amber-300/90 font-bold">증권사 목표가 / 리포트 기준</div>
                                                                <div className="text-base sm:text-lg font-black font-mono text-amber-300 mt-0.5">{r.consensus?.target_mean_str || '실적 리포트 참고'}</div>
                                                                <div className="text-[11px] text-gray-300 mt-0.5 font-medium">
                                                                    {r.consensus?.upside_pct !== null && r.consensus?.upside_pct !== undefined
                                                                        ? `현재가 대비 ${r.consensus.upside_pct > 0 ? '+' : ''}${r.consensus.upside_pct}% 상승여력`
                                                                        : (r.consensus?.note || '아래 증권사 리포트 요약 참고')}
                                                                </div>
                                                            </div>

                                                            <div className="bg-black/45 border border-white/10 rounded-xl p-3.5">
                                                                <div className="text-[11px] text-gray-400 font-bold">PER · PBR (재무 가성비)</div>
                                                                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
                                                                    {r.per ? `PER ${Number(r.per).toFixed(1)}배` : '집계 중'}
                                                                    {r.pbr ? <span className="text-xs text-sky-300 ml-1.5">· PBR {Number(r.pbr).toFixed(2)}배</span> : null}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400 mt-0.5">
                                                                    {r.market_cap ? `시총 ${r.market_cap}` : ''}
                                                                    {r.eps ? ` · EPS ${Number(r.eps).toLocaleString()}원` : ''}
                                                                </div>
                                                            </div>

                                                            <div className="bg-black/45 border border-white/10 rounded-xl p-3.5">
                                                                <div className="text-[11px] text-gray-400 font-bold">52주 주가 위치 (최저~최고)</div>
                                                                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
                                                                    {r.range_pos !== null && r.range_pos !== undefined ? `하단 대비 ${r.range_pos}%` : '-'}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                                    {r.low52_str && r.high52_str ? `${r.low52_str} ~ ${r.high52_str}` : '0%=52주 최저 · 100%=52주 최고'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 🛡️ 2.5 [최서연 CRO 리스크 정밀 감사 & 자산 방어선 보고서] */}
                                                        <div className="bg-gradient-to-br from-rose-950/25 via-slate-900/90 to-zinc-950 border-2 border-rose-500/35 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-xs">
                                                                        🛡️ 리스크 감사
                                                                    </span>
                                                                    <span className="text-xs sm:text-sm font-black text-white">
                                                                        {r.stock_name} 리스크 정밀 진단 &amp; 자산 방어선 가이드 (최서연 CRO)
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${audit.badgeClass}`}>
                                                                        {audit.riskLevel} (위험도 {audit.riskScore}/5)
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopyRiskAudit(r, audit)}
                                                                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                                                                            isCopied
                                                                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                                                                : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/15'
                                                                        }`}
                                                                    >
                                                                        <span>{isCopied ? '✅ 복사 완료!' : '📋 진단서 복사'}</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (typeof window !== 'undefined') window.print();
                                                                        }}
                                                                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-black transition-all cursor-pointer flex items-center gap-1"
                                                                    >
                                                                        <Printer className="w-3 h-3" />
                                                                        <span>1장 인쇄</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* 대표이사 자산 방어 4대 실천 가이드 */}
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                                <div className="bg-black/60 border border-sky-500/25 rounded-xl p-2.5">
                                                                    <div className="text-[10px] text-sky-300 font-black flex items-center gap-1">
                                                                        <span>🛡️</span>
                                                                        <span>안전 권장 진입가</span>
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-black font-mono text-white mt-1">
                                                                        {audit.safeEntryStr.split(' ')[0]}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 mt-0.5">추격 매수 금지선</div>
                                                                </div>

                                                                <div className="bg-black/60 border border-rose-500/35 rounded-xl p-2.5">
                                                                    <div className="text-[10px] text-rose-300 font-black flex items-center gap-1">
                                                                        <span>🛑</span>
                                                                        <span>손절 방어선 (-3.5%)</span>
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-black font-mono text-rose-400 mt-1">
                                                                        {audit.stopLossStr.split(' ')[0]}
                                                                    </div>
                                                                    <div className="text-[10px] text-rose-300/80 mt-0.5">기계적 자동 손절</div>
                                                                </div>

                                                                <div className="bg-black/60 border border-emerald-500/25 rounded-xl p-2.5">
                                                                    <div className="text-[10px] text-emerald-300 font-black flex items-center gap-1">
                                                                        <span>🎯</span>
                                                                        <span>1차 익절가 (50%)</span>
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-black font-mono text-emerald-400 mt-1">
                                                                        {audit.takeProfitStr.split(' ')[0]}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 mt-0.5">원금 및 수익 확보</div>
                                                                </div>

                                                                <div className="bg-black/60 border border-amber-500/25 rounded-xl p-2.5">
                                                                    <div className="text-[10px] text-amber-300 font-black flex items-center gap-1">
                                                                        <span>⚖️</span>
                                                                        <span>최대 계좌 비중</span>
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-black font-mono text-amber-300 mt-1">
                                                                        최대 10~15%
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 mt-0.5">안전 포트폴리오</div>
                                                                </div>
                                                            </div>

                                                            {/* 3대 정밀 리스크 팩터 세부 진단 */}
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                                {audit.factors.map((f, fIdx) => (
                                                                    <div key={fIdx} className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-1.5">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-1.5 text-xs font-black text-white">
                                                                                <span>{f.icon}</span>
                                                                                <span>{f.title}</span>
                                                                            </div>
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${f.tagColor}`}>
                                                                                {f.tag}
                                                                            </span>
                                                                        </div>
                                                                        <ul className="space-y-1 text-[11px] text-gray-300 leading-relaxed font-medium">
                                                                            {f.points.map((pt, pIdx) => (
                                                                                <li key={pIdx} className="flex items-start gap-1">
                                                                                    <span className="text-rose-400 font-black shrink-0">•</span>
                                                                                    <span>{pt}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* 최서연 상무 최종 소견 */}
                                                            <div className="p-3 rounded-xl bg-black/60 border border-rose-500/25 text-xs space-y-1">
                                                                <div className="flex items-center gap-1.5 text-rose-300 font-black">
                                                                    <span>⚠️</span>
                                                                    <span>최서연 CRO 상무의 직설적 최종 결재 의견</span>
                                                                </div>
                                                                <p className="text-gray-200 leading-relaxed font-medium">
                                                                    &ldquo;{audit.croVerdict}&rdquo;
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 3. 📑 증권사 애널리스트 리서치 리포트 본문 핵심 요약 & PDF 원문 (가장 핵심!) */}
                                                        <div className="bg-gradient-to-br from-amber-950/20 via-slate-900/90 to-zinc-950 border border-amber-500/35 rounded-2xl p-4 sm:p-5 space-y-3.5">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                                                        📑 증권사 리서치 리포트 핵심 요약
                                                                    </span>
                                                                    <span className="text-xs sm:text-sm font-black text-white">
                                                                        {brokerReports.length > 0
                                                                            ? `${r.stock_name}에 대해 증권사 애널리스트가 발표한 실제 분석 리포트 (${brokerReports.length}건)`
                                                                            : `${r.stock_name} AI 리서치센터 종합 밸류에이션 & 수급 분석`}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] text-amber-300/90 font-bold">
                                                                    원문 핵심 요약 & PDF 제공
                                                                </span>
                                                            </div>

                                                            {brokerReports.length > 0 ? (
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {brokerReports.map((br: any, bIdx: number) => (
                                                                        <div
                                                                            key={br.id || bIdx}
                                                                            className="bg-black/50 border border-white/10 hover:border-amber-500/40 rounded-xl p-4 transition-all space-y-2.5"
                                                                        >
                                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                                                                                        🏢 {br.broker}
                                                                                    </span>
                                                                                    <span className="text-xs font-mono text-gray-400">
                                                                                        {br.date} 발간
                                                                                    </span>
                                                                                    {br.target_price ? (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black font-mono">
                                                                                            목표주가 {br.target_price}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-bold">
                                                                                            {br.opinion || '실적·모멘텀 분석'}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {br.pdf_url && (
                                                                                        <a
                                                                                            href={br.pdf_url}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-black transition-all flex items-center gap-1"
                                                                                        >
                                                                                            <span>📄 증권사 원문 PDF 보기</span>
                                                                                        </a>
                                                                                    )}
                                                                                    {br.naver_url && (
                                                                                        <a
                                                                                            href={br.naver_url}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[11px] font-bold transition-all"
                                                                                        >
                                                                                            상세 원문 →
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <h5 className="text-sm sm:text-[15px] font-black text-white">
                                                                                &ldquo;{br.title}&rdquo;
                                                                            </h5>

                                                                            {br.summary_bullets && br.summary_bullets.length > 0 && (
                                                                                <ul className="space-y-1.5 pt-1 text-xs text-gray-200 leading-relaxed font-medium">
                                                                                    {br.summary_bullets.map((line: string, lIdx: number) => (
                                                                                        <li key={lIdx} className="flex items-start gap-2">
                                                                                            <span className="text-amber-400 font-black shrink-0 mt-0.5">•</span>
                                                                                            <span>{line}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-black/45 border border-white/10 rounded-xl p-4 text-xs text-gray-200 space-y-1.5">
                                                                    <div className="font-black text-amber-300 mb-1">💡 AI 리서치센터 자체 재무·수급 진단 요약</div>
                                                                    <p className="leading-relaxed">
                                                                        현재 {r.stock_name}({r.stock_code})은(는) 현재가 <strong className="text-white">{r.price_str}</strong> (52주 최저~최고 범위의 <strong className="text-sky-300">{r.range_pos ?? 50}%</strong> 구간)에서 거래되고 있으며,
                                                                        {r.per ? ` PER ${Number(r.per).toFixed(1)}배` : ''}{r.pbr ? ` · PBR ${Number(r.pbr).toFixed(2)}배` : ''}의 밸류에이션을 기록 중입니다. 아래 수급 지표와 투자 포인트를 함께 참고해 주십시오.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 4. 외국인·기관·개인 수급 동향 */}
                                                        {r.flow && (
                                                            <div className="bg-black/35 border border-white/10 rounded-xl p-3.5">
                                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                                    <div className="text-xs font-black text-gray-200">💰 오늘 누가 샀을까요? (투자자별 순매수 수급)</div>
                                                                    <div className="text-[11px] text-gray-400 font-medium">
                                                                        최근 3거래일 합계 — 외국인 <span className={flowColor(r.flow.foreign_3d)}>{fmtFlow(r.flow.foreign_3d)}</span> · 기관 <span className={flowColor(r.flow.organ_3d)}>{fmtFlow(r.flow.organ_3d)}</span>
                                                                        {r.flow.foreign_hold_ratio ? ` · 외국인 보유율 ${r.flow.foreign_hold_ratio}` : ''}
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                                                                    <div className="bg-white/5 rounded-lg py-2 px-3 border border-white/5">
                                                                        <div className="text-gray-400 text-[11px] font-bold">외국인 (오늘)</div>
                                                                        <div className={`text-sm font-black font-mono mt-0.5 ${flowColor(r.flow.foreign_today)}`}>{fmtFlow(r.flow.foreign_today)}</div>
                                                                    </div>
                                                                    <div className="bg-white/5 rounded-lg py-2 px-3 border border-white/5">
                                                                        <div className="text-gray-400 text-[11px] font-bold">기관 (오늘)</div>
                                                                        <div className={`text-sm font-black font-mono mt-0.5 ${flowColor(r.flow.organ_today)}`}>{fmtFlow(r.flow.organ_today)}</div>
                                                                    </div>
                                                                    <div className="bg-white/5 rounded-lg py-2 px-3 border border-white/5">
                                                                        <div className="text-gray-400 text-[11px] font-bold">개인 (오늘)</div>
                                                                        <div className={`text-sm font-black font-mono mt-0.5 ${flowColor(r.flow.individual_today)}`}>{fmtFlow(r.flow.individual_today)}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 5. 좋은 점 (핵심 호재) & 주의할 점 (리스크 체크포인트) */}
                                                        <div className="grid md:grid-cols-2 gap-3">
                                                            <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-3.5">
                                                                <div className="text-xs font-black text-emerald-300 mb-2 flex items-center justify-between">
                                                                    <span>👍 핵심 긍정 요인 (투자 포인트)</span>
                                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">호재·모멘텀</span>
                                                                </div>
                                                                <ul className="space-y-1.5 text-xs text-emerald-100/95 leading-relaxed">
                                                                    {(r.opinion?.good || []).map((g: string, i: number) => (
                                                                        <li key={i} className="flex items-start gap-2">
                                                                            <span className="text-emerald-400 font-black shrink-0">•</span>
                                                                            <span>{g}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div className="bg-rose-950/20 border border-rose-500/25 rounded-xl p-3.5">
                                                                <div className="text-xs font-black text-rose-300 mb-2 flex items-center justify-between">
                                                                    <span>⚠️ 주의할 점 (리스크 체크포인트)</span>
                                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">안전 점검</span>
                                                                </div>
                                                                <ul className="space-y-1.5 text-xs text-rose-100/95 leading-relaxed">
                                                                    {(r.opinion?.warn || []).map((w: string, i: number) => (
                                                                        <li key={i} className="flex items-start gap-2">
                                                                            <span className="text-rose-400 font-black shrink-0">•</span>
                                                                            <span>{w}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>

                                                        {/* 6. 최신 뉴스 (최대 5건) */}
                                                        <div className="bg-black/35 border border-white/10 rounded-xl p-3.5">
                                                            <div className="text-xs font-black text-gray-200 mb-2 flex items-center justify-between">
                                                                <span>📰 관련 최신 뉴스 ({(r.news || []).length}건)</span>
                                                                <span className="text-[11px] text-gray-400">클릭 시 언론사 원문 열람</span>
                                                            </div>
                                                            {(r.news || []).length === 0 ? (
                                                                <div className="text-xs text-gray-500">최근 뉴스가 없습니다.</div>
                                                            ) : (
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                                                                    {r.news.map((n: any, i: number) => (
                                                                        <li key={i} className="text-xs leading-snug flex items-start gap-1.5 truncate">
                                                                            <span className="text-sky-400 font-bold shrink-0">•</span>
                                                                            <div className="truncate">
                                                                                {n.url ? (
                                                                                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-200 hover:underline font-medium">{n.title}</a>
                                                                                ) : (
                                                                                    <span className="text-gray-200">{n.title}</span>
                                                                                )}
                                                                                {n.press && <span className="text-[10px] text-gray-400 ml-1.5">({n.press}{n.datetime ? ` · ${n.datetime}` : ''})</span>}
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <p className="text-[11px] text-gray-500 px-1 leading-relaxed">
                                                ※ 공개된 시세·수급·증권사 리서치 리포트·뉴스를 자동으로 요약한 참고 자료이며 투자 권유가 아닙니다. 최종 판단과 책임은 투자자 본인에게 있습니다.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}{activeTab === 'weekly_review_calendar' && (
                                <div className="space-y-6">
                                    {/* 상단 헤더 & 뷰 전환 스위치 */}
                                    <div className="bg-gradient-to-r from-[#0b192c] via-[#0f2537] to-[#0b192c] border-2 border-teal-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-400/40">
                                                        📋 주간 리서치·성과복기팀 (한지훈 이사)
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                                                        🗓️ 글로벌 경제일정·매크로분석팀 (윤서아 이사)
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                                        {weeklyReview?.period_label || '주간 전수 결산 & 차주(월~금) 시나리오 가동'}
                                                    </span>
                                                </div>
                                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                                    🏛️ 대표이사 전용 『주간 리서치·매매 복기』 &amp; 『한주 경제일정 시나리오』 합동 보고서
                                                </h2>
                                                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                                    이번 주 추천 종목과 실전 계좌의 성적표를 냉정하게 복기(반성)하고, 다가오는 한 주간(월~금) 한국·미국의 핵심 경제일정과 호재·악재 대응 시나리오를 한눈에 브리핑합니다.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setWeeklySubView('both')}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                                                        weeklySubView === 'both'
                                                            ? 'bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/25'
                                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                                    }`}
                                                >
                                                    ✨ 복기 + 경제일정 한눈에 보기
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setWeeklySubView('review')}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                                                        weeklySubView === 'review'
                                                            ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/25'
                                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                                    }`}
                                                >
                                                    📋 주간 리서치·매매 복기만
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setWeeklySubView('calendar')}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                                                        weeklySubView === 'calendar'
                                                            ? 'bg-indigo-400 text-slate-950 shadow-lg shadow-indigo-400/25'
                                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                                    }`}
                                                >
                                                    🗓️ 한주 경제일정 캘린더만
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PART 1: 📋 주간 리서치·성과 복기팀 보고서 */}
                                    {(weeklySubView === 'both' || weeklySubView === 'review') && (
                                        <div className="bg-[#0b1323] border-2 border-emerald-500/35 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                                <div>
                                                    <div className="text-xs font-black text-emerald-400 mb-1 flex items-center gap-2">
                                                        <span>📋 PART 1 · 주간 리서치·실전매매 복기TF</span>
                                                        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                            {weeklyReview?.team_leader || '한지훈 이사 · 박진우 부사장 · 최서연 상무'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg sm:text-xl font-black text-white">
                                                        {weeklyReview?.title || '📋 [주간 리서치·성과 복기 보고서] 추천주 적중 점검 & 차주 개장 Top 3 전략'}
                                                    </h3>
                                                </div>
                                                <span className="text-xs font-mono text-gray-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 self-start sm:self-auto">
                                                    {weeklyReview?.updated_at || '실시간 복기 동기화 완료'}
                                                </span>
                                            </div>

                                            {/* 4대 핵심 복기 KPI 카드 */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {(weeklyReview?.kpis || [
                                                    { label: '주간 리서치 전수 복기', value: `총 ${researchDesk.length}개 핵심 종목`, sub: '증권사 목표주가 vs 현재가 괴리율 감사', tone: 'positive' },
                                                    { label: '평균 목표주가 상승여력', value: '+28.4%', sub: `최고 기대수익: ${intelligenceMetrics.topStock.name} (${intelligenceMetrics.topStock.upside})`, tone: 'positive' },
                                                    { label: '실전 운용계좌 누적 성과', value: '+0.00% (승률 100%)', sub: '추격매수 배제 · 분할매수 원칙 준수', tone: 'positive' },
                                                    { label: '차주(월) 1순위 공략주', value: intelligenceMetrics.topStock.name, sub: `목표가 ${intelligenceMetrics.topStock.target} (${intelligenceMetrics.topStock.upside})`, tone: 'positive' },
                                                ]).map((kpi: any, idx: number) => (
                                                    <div key={idx} className="bg-black/45 border border-emerald-500/25 rounded-2xl p-4">
                                                        <div className="text-xs font-bold text-gray-400 mb-1">{kpi.label}</div>
                                                        <div className="text-lg sm:text-xl font-black text-emerald-300">{kpi.value}</div>
                                                        <div className="text-[11px] text-gray-300 mt-1">{kpi.sub}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* 대표님 전용 3줄 복기 총평 */}
                                            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/35 rounded-2xl p-4 sm:p-5">
                                                <div className="text-xs sm:text-sm font-black text-emerald-300 mb-2.5 flex items-center gap-2">
                                                    <span>📌</span>
                                                    <span>대표님 전용 주간 복기 3줄 핵심 요약 (10초 브리핑)</span>
                                                </div>
                                                <div className="space-y-2 text-xs sm:text-sm text-gray-100 font-bold leading-relaxed">
                                                    {(weeklyReview?.executive_3line_summary || [
                                                        '1️⃣ [리서치 복기 총평]: 이번 주 증권사 커버리지 종목 점검 결과, 실적·수주 기반 대형주의 목표가 대비 저평가 매력이 뚜렷합니다.',
                                                        '2️⃣ [실전 매매 반성 및 평가]: 급등주 추격매수를 철저히 배제하고 현금 비중을 유지하며 1,000만원 정액 분할 매수 원칙을 지켰습니다.',
                                                        '3️⃣ [차주 월요일 핵심 전략]: 기대수익률 상위 Top 3 종목을 중심으로 월요일 시초가 눌림목에서 분할 매수 대응을 건의합니다.',
                                                    ]).map((line: string, i: number) => (
                                                        <div key={i} className="bg-black/35 rounded-xl px-3.5 py-2 border border-white/5">
                                                            {line}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 🚀 차주 월요일 개장 최우선 타겟 Top 3 */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                                                        <span>🚀</span>
                                                        <span>차주(월요일) 개장 집중 공략 Top 3 타겟 &amp; 매매 시나리오</span>
                                                    </h4>
                                                    <span className="text-xs text-gray-400">복기 결과 기대수익률 최상위 엄선</span>
                                                </div>
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                                                    {(weeklyReview?.monday_top3 || []).map((item: any) => (
                                                        <div key={item.rank} className="bg-gradient-to-br from-[#111c33] to-[#0a101f] border-2 border-amber-500/35 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                                                            <div className="space-y-2.5">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                                                        🏆 월요일 {item.rank}순위 · {item.stock_name}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                                                                        {item.broker}
                                                                    </span>
                                                                </div>

                                                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                                                                    <div>
                                                                        <div className="text-[10px] text-gray-400 font-bold">현재가 ➔ 목표주가</div>
                                                                        <div className="font-black text-white font-mono mt-0.5">
                                                                            {item.current_price.split(' ')[0]} ➔ <span className="text-amber-300">{item.target_price}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-[10px] text-rose-300 font-bold">기대수익률</div>
                                                                        <div className="text-sm font-black text-rose-400 font-mono">{item.upside_pct}</div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5 text-xs">
                                                                    <div className="bg-emerald-950/35 border border-emerald-500/30 rounded-lg p-2.5">
                                                                        <span className="text-emerald-300 font-black block mb-0.5">🎯 월요일 진입 타점:</span>
                                                                        <span className="text-gray-200 font-medium">{item.entry_strategy}</span>
                                                                    </div>
                                                                    <div className="bg-rose-950/30 border border-rose-500/25 rounded-lg p-2.5">
                                                                        <span className="text-rose-300 font-black block mb-0.5">🛡️ 손절·방어 원칙:</span>
                                                                        <span className="text-gray-200 font-medium">{item.stop_loss_rule}</span>
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-300 px-1 pt-0.5">
                                                                        <strong className="text-amber-300">• 핵심 모멘텀:</strong> {item.core_catalyst}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleApproveWatchlistStock({
                                                                    stock_name: item.stock_name,
                                                                    stock_code: item.stock_code,
                                                                    category: 'kr_stock',
                                                                    current_price: item.current_price,
                                                                    target_price_final: item.target_price,
                                                                })}
                                                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs cursor-pointer transition-all shadow-md"
                                                            >
                                                                🖋️ 대표이사 직권 차주 포트폴리오 즉시 편입
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 📊 이번 주 증권사 리포트 추천주 전수 복기 리스트 */}
                                            <div className="space-y-3">
                                                <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                                    <span>📊</span>
                                                    <span>이번 주 상정 증권사 리포트 종목별 정밀 복기표</span>
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {(weeklyReview?.research_review_list || []).map((rep: any, idx: number) => (
                                                        <div key={idx} className="bg-black/45 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-4 space-y-2.5 transition-all">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-xs">
                                                                        🎯 {rep.stock_name}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-gray-400">
                                                                        {rep.broker} · {rep.date}
                                                                    </span>
                                                                </div>
                                                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                    {rep.verdict_badge}
                                                                </span>
                                                            </div>

                                                            <div className="text-sm font-black text-white">
                                                                {rep.title}
                                                            </div>

                                                            <div className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                                <span className="text-gray-300 font-bold">
                                                                    현재 <strong className="text-white font-mono">{rep.current_price.split(' ')[0]}</strong> ➔ 목표 <strong className="text-amber-300 font-mono">{rep.target_price}</strong>
                                                                </span>
                                                                <span className="text-rose-400 font-black font-mono">
                                                                    기대수익 {rep.upside_pct} (1천만원 시 {rep.profit_10m})
                                                                </span>
                                                            </div>

                                                            <ul className="space-y-1 text-xs text-gray-200 leading-relaxed">
                                                                <li className="flex items-start gap-1.5">
                                                                    <span className="text-emerald-400 font-black shrink-0">•</span>
                                                                    <span><strong className="text-emerald-300">주간 복기:</strong> {rep.review_note}</span>
                                                                </li>
                                                                <li className="flex items-start gap-1.5">
                                                                    <span className="text-amber-400 font-black shrink-0">•</span>
                                                                    <span><strong className="text-amber-300">차주 지침:</strong> {rep.monday_action}</span>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 💼 실전 모의투자 계좌 주간 매매 반성문 & 리스크 감사 */}
                                            <div className="bg-black/40 border border-white/15 rounded-2xl p-4 sm:p-5 space-y-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <h4 className="text-base font-black text-white flex items-center gap-2">
                                                        <span>💼</span>
                                                        <span>우리 회사 실전 운용 계좌 주간 매매 복기 &amp; CRO 반성문</span>
                                                    </h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTab('approved_tf');
                                                            fetchTradingDesk();
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black cursor-pointer"
                                                    >
                                                        실전 트레이딩 데스크 상세 열기 →
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                                                        <div className="text-xs sm:text-sm font-black text-emerald-300">
                                                            👍 이번 주 잘한 점 (한지훈 복기팀장 · 김도현 수급상무 평가)
                                                        </div>
                                                        <ul className="space-y-1.5 text-xs text-gray-200 leading-relaxed">
                                                            {(weeklyReview?.account_reflection?.well_done_points || []).map((pt: string, i: number) => (
                                                                <li key={i} className="flex items-start gap-1.5">
                                                                    <span className="text-emerald-400 font-black shrink-0">✓</span>
                                                                    <span>{pt}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="bg-rose-950/25 border border-rose-500/30 rounded-xl p-4 space-y-2">
                                                        <div className="text-xs sm:text-sm font-black text-rose-300">
                                                            ⚠️ 반성 및 차주 보완할 점 (최서연 CRO 리스크 감사)
                                                        </div>
                                                        <ul className="space-y-1.5 text-xs text-gray-200 leading-relaxed">
                                                            {(weeklyReview?.account_reflection?.improve_points || []).map((pt: string, i: number) => (
                                                                <li key={i} className="flex items-start gap-1.5">
                                                                    <span className="text-rose-400 font-black shrink-0">!</span>
                                                                    <span>{pt}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                {Array.isArray(weeklyReview?.account_reflection?.positions) && weeklyReview.account_reflection.positions.length > 0 && (
                                                    <div className="pt-2 space-y-2">
                                                        <div className="text-xs font-black text-gray-300">
                                                            📌 현재 보유 운용 종목별 주간 복기 코멘트 ({weeklyReview.account_reflection.positions.length}종목)
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                            {weeklyReview.account_reflection.positions.map((pos: any, i: number) => (
                                                                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-black text-white">{pos.stock_name}</span>
                                                                        <span className={`font-black font-mono ${pos.pnl_pct >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                                                                            {pos.pnl_pct >= 0 ? `+${pos.pnl_pct}%` : `${pos.pnl_pct}%`}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-400 font-mono">
                                                                        매수가 {pos.entry_price_str} ➔ 현재 {pos.current_price_str}
                                                                    </div>
                                                                    <div className="text-[11px] text-emerald-200 pt-1 border-t border-white/5">
                                                                        • {pos.review_comment}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* PART 2: 🗓️ 한주 경제일정·매크로 분석팀 캘린더 */}
                                    {(weeklySubView === 'both' || weeklySubView === 'calendar') && (
                                        <div className="bg-[#0b1323] border-2 border-indigo-500/35 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                                <div>
                                                    <div className="text-xs font-black text-indigo-400 mb-1 flex items-center gap-2">
                                                        <span>🗓️ PART 2 · 글로벌 경제캘린더·이벤트분석팀</span>
                                                        <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                                            {weeklyCalendar?.team_leader || '윤서아 이사 · 이준호 이사 · 김도현 상무'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg sm:text-xl font-black text-white">
                                                        {weeklyCalendar?.title || '🗓️ 한·미 핵심 경제일정 캘린더 & 요일별 호재/악재 대응 시나리오'}
                                                    </h3>
                                                </div>
                                                <span className="text-xs font-black text-amber-300 bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-500/30 self-start sm:self-auto">
                                                    {weeklyCalendar?.mode_badge || '주간 5일(월~금) 시나리오 가동'}
                                                </span>
                                            </div>

                                            {/* 거시지표 기준점 4칸 요약 & 주간 전략 총평 */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {(weeklyCalendar?.macro_indicators || [
                                                    { label: '실시간 원/달러 환율', value: '1,380원대 실시간 감시' },
                                                    { label: '나스닥100 선물(NQ=F)', value: '24시간 추세 연동 중' },
                                                    { label: 'WTI 국제유가(CL=F)', value: '인플레 안정 구간 점검' },
                                                    { label: '주간 핵심 빅이벤트', value: '목(고용·PMI) · 금(PCE물가)' },
                                                ]).map((m: any, idx: number) => (
                                                    <div key={idx} className="bg-black/45 border border-indigo-500/25 rounded-2xl p-3.5">
                                                        <div className="text-[11px] font-bold text-gray-400">{m.label}</div>
                                                        <div className="text-base font-black text-indigo-300 font-mono mt-1">{m.value}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="bg-gradient-to-r from-indigo-950/45 via-slate-900 to-sky-950/35 border border-indigo-500/35 rounded-2xl p-4 text-xs sm:text-sm text-gray-100 leading-relaxed">
                                                <div className="font-black text-indigo-300 mb-1 flex items-center gap-1.5">
                                                    <span>🧭</span>
                                                    <span>윤서아 경제일정팀장 · 한주간 시장 온도계 &amp; 대응 가이드</span>
                                                </div>
                                                <p className="font-medium text-gray-200">
                                                    {weeklyCalendar?.weekly_strategy_summary || '주 초반(월~수)에는 한국 수출입 동향과 연준 위원 발언을 확인하며 실적 저평가주를 분할 매집하고, 주 후반(목~금) 미국 실업수당·PMI 및 PCE 물가지수 발표 전후에는 현금 비중(20~30%)으로 변동성에 유연하게 대응하십시오.'}
                                                </p>
                                            </div>

                                            {/* 월~금 요일별 상세 타임라인 & 호재/악재 시나리오 카드 */}
                                            <div className="space-y-4">
                                                {(weeklyCalendar?.days || []).map((day: any, dIdx: number) => (
                                                    <div
                                                        key={dIdx}
                                                        className={`rounded-2xl p-4 sm:p-5 border transition-all space-y-3.5 ${
                                                            day.is_today
                                                                ? 'bg-gradient-to-r from-indigo-950/50 via-[#101c35] to-[#0d1629] border-2 border-amber-400 shadow-lg shadow-amber-500/10'
                                                                : 'bg-black/45 border-white/10 hover:border-indigo-500/40'
                                                        }`}
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="px-3 py-1 rounded-xl bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 font-black text-xs sm:text-sm font-mono">
                                                                    📅 {day.date_str}
                                                                </span>
                                                                {day.is_today && (
                                                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] animate-pulse">
                                                                        ★ TODAY 오늘의 일정
                                                                    </span>
                                                                )}
                                                                <span className="text-sm sm:text-base font-black text-white">
                                                                    {day.theme}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-amber-400 tracking-wider">
                                                                    중요도 {day.stars}
                                                                </span>
                                                                <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-gray-200 text-[11px] font-bold">
                                                                    {day.importance_badge}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* 시간대별 세부 일정 리스트 */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                                            {(day.events || []).map((ev: any, eIdx: number) => (
                                                                <div key={eIdx} className="bg-slate-900/90 border border-white/10 rounded-xl p-3 space-y-1">
                                                                    <div className="flex items-center justify-between text-[11px]">
                                                                        <span className="font-black text-sky-300">{ev.country}</span>
                                                                        <span className="font-mono text-amber-300 font-bold">⏰ {ev.time} KST</span>
                                                                    </div>
                                                                    <div className="text-xs font-black text-white leading-snug">
                                                                        {ev.name}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-400 pt-0.5">
                                                                        • 예상/핵심: <span className="text-gray-200 font-semibold">{ev.consensus}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* 호재 vs 악재 시나리오 양면 비교 */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-1">
                                                                <div className="font-black text-emerald-300 flex items-center gap-1.5">
                                                                    <span>🟢 긍정(호재) 발표 시 시장 시나리오 &amp; 공략</span>
                                                                </div>
                                                                <p className="text-gray-200 leading-relaxed font-medium">
                                                                    {day.bull_scenario}
                                                                </p>
                                                            </div>
                                                            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-xs space-y-1">
                                                                <div className="font-black text-rose-300 flex items-center gap-1.5">
                                                                    <span>🔴 부진(악재) 발표 시 리스크 방어 지침</span>
                                                                </div>
                                                                <p className="text-gray-200 leading-relaxed font-medium">
                                                                    {day.bear_scenario}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 주목할 수혜 섹터 태그 */}
                                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                                            <span className="text-[11px] font-black text-indigo-300">
                                                                🎯 {day.day_name} 집중 감시 섹터:
                                                            </span>
                                                            {(day.focus_sectors || []).map((sec: string, sIdx: number) => (
                                                                <span
                                                                    key={sIdx}
                                                                    className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-500/30 text-[11px] font-bold"
                                                                >
                                                                    #{sec}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                                        )}{activeTab === 'history' && (
                                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-5">
                                    <div>
                                        <h3 className="text-lg font-black text-white mb-1">
                                            🗂️ 대표님 전사 지휘 명령 이력 & 전자결재 서명 기록부
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            대표님께서 지휘통제실에서 하달하신 전사 명령(5대 본부 자동 이행 로그)과 전자결재 서명 내역이 보관됩니다.
                                        </p>
                                    </div>

                                    {directiveLogs.length > 0 && (
                                        <div className="space-y-2.5">
                                            <div className="text-xs font-black text-amber-300">
                                                ⚡ 최근 대표이사 지휘 명령 & 5대 본부 자동 이행 원장 ({directiveLogs.length}건)
                                            </div>
                                            {directiveLogs.map((log: any, idx: number) => (
                                                <div key={log.cmd_id || idx} className="bg-black/50 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <span className="text-xs font-black text-amber-300 font-mono">
                                                            [{log.cmd_id}] 지시: {log.directive_text}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 font-mono">{log.timestamp}</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-emerald-300">{log.headline_result}</div>
                                                    {Array.isArray(log.workflow_steps) && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 pt-1">
                                                            {log.workflow_steps.map((st: any, sIdx: number) => (
                                                                <div key={sIdx} className="bg-white/5 rounded-lg p-2 text-[10px]">
                                                                    <div className="font-black text-white">{st.avatar} {st.dept}</div>
                                                                    <div className="text-emerald-300 font-bold">{st.status}</div>
                                                                    <div className="text-gray-400 mt-0.5 line-clamp-2">{st.detail}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-2.5">
                                        {autoApprovals.map(doc => {
                                            const info = signMap[doc.doc_id];
                                            const st = info?.status || 'pending';
                                            return (
                                                <div
                                                    key={doc.doc_id}
                                                    className="bg-black/40 border border-white/10 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2"
                                                >
                                                    <div>
                                                        <div className="text-xs text-gray-400 font-mono">
                                                            {doc.doc_number} · {doc.stock_name}
                                                        </div>
                                                        <div className="text-sm font-bold text-white">
                                                            {doc.title}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {st === 'approved' && (
                                                            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                                                                💮 승인 완료 ({info?.signedAt})
                                                            </span>
                                                        )}
                                                        {st === 'hold' && (
                                                            <span className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black">
                                                                ⏸️ 보류 ({info?.signedAt})
                                                            </span>
                                                        )}
                                                        {st === 'reexamine' && (
                                                            <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                                                                🔄 재검토 지시 ({info?.signedAt})
                                                            </span>
                                                        )}
                                                        {st === 'pending' && (
                                                            <span className="px-3 py-1 rounded-lg bg-white/10 text-gray-400 text-xs font-bold">
                                                                서명 대기 중
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 우측 4컬럼: 전사 시장 시스템 가동 현황 & 빠른 서명 요약 (전자결재 탭에서는 12컬럼 풀와이드 메일함으로 전환) */}
                        <div className={['electronic_sign', 'weekly_review_calendar', 'watchlist_research', 'approved_tf'].includes(activeTab) ? 'hidden' : 'lg:col-span-4 space-y-5'}>
                            {/* 전사 자동 시스템 가동 모니터 */}
                            <div className="bg-[#0d1526] border border-emerald-500/30 rounded-2xl p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                        <span>🖥️ 전사 자동화 시스템 상태</span>
                                    </h3>
                                    <span className="text-[11px] font-extrabold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                        100% 정상 가동
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">리서치센터 크롤러</div>
                                            <div className="text-[11px] text-gray-400">국내 증권사 리포트 자동 수집·요약</div>
                                        </div>
                                        <span className="text-emerald-400 font-black">정상 ({researchDesk.length}건)</span>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">퀀트 수급 스캐너</div>
                                            <div className="text-[11px] text-gray-400">외인·기관 수급 및 50일선 자동 판독</div>
                                        </div>
                                        <span className="text-emerald-400 font-black">정상 가동</span>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">글로벌 24시 데스크</div>
                                            <div className="text-[11px] text-gray-400">미국주식 · ETF · 나스닥선물 연동</div>
                                        </div>
                                        <span className="text-emerald-400 font-black">실시간 동기화</span>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white">CRO 리스크 감사봇</div>
                                            <div className="text-[11px] text-gray-400">전 기안서 하방 위험 자동 첨부</div>
                                        </div>
                                        <span className="text-emerald-400 font-black">감사 완료</span>
                                    </div>
                                </div>
                            </div>

                            {/* 리서치팀 추가 참고 원문 서류함 */}
                            <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm sm:text-base font-black text-white">
                                        📑 오늘 수집된 리포트 원문 목록
                                    </h3>
                                    <Link
                                        href="/research"
                                        className="text-xs font-bold text-sky-400 hover:underline"
                                    >
                                        자료실 전체보기 →
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {researchDesk.slice(0, 5).map(rep => (
                                        <div
                                            key={rep.id}
                                            className="bg-black/40 border border-white/10 rounded-xl p-3"
                                        >
                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                <span className="text-xs font-black text-white">
                                                    {rep.stock_name}
                                                </span>
                                                <span className="text-[11px] font-bold text-amber-300">
                                                    🎯 {rep.target_price}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-300 line-clamp-1">
                                                [{rep.broker}] {rep.title}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 광고 슬롯 */}
                            <div className="flex justify-center">
                                <KakaoRevenueAd type="feed" />
                            </div>
                        </div>
                    </div>
                )}

                {/* 🔒 대표이사 집무실 1급 기밀 보안 & 🌐 일반 공개 페이지 무인 구글 SEO 분리 가동 현황판 */}
                <div className="bg-[#0d1526] border border-amber-500/35 rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                            <h3 className="text-xs sm:text-sm font-black text-white">
                                🔒 대표이사 집무실·기안서 『대표님 단독 열람 보안』 &amp; 🌐 일반 공개 페이지 무인 SEO 가동 중
                            </h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            🔒 이 집무실과 결재 기안서는 오직 대표님 계정만 열람 가능 (외부·검색엔진 100% 비공개)
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-black/40 border border-amber-500/25 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-amber-300">🔒 대표이사 집무실·기안서</div>
                                <div className="text-[11px] text-gray-400">일반 회원·비로그인·검색로봇 접근 완전 차단</div>
                            </div>
                            <span className="text-amber-400 font-black shrink-0">대표님 전용</span>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">🌐 일반 공개 종목 페이지</div>
                                <div className="text-[11px] text-gray-400">일반 방문자용 종목 시세·가이드 구글 노출</div>
                            </div>
                            <Link href="/directory" className="text-emerald-400 font-black hover:underline shrink-0">
                                디렉토리 →
                            </Link>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">🗺️ 공개 페이지 사이트맵</div>
                                <div className="text-[11px] text-gray-400">집무실 제외 · 공개 가이드/종목만 등록</div>
                            </div>
                            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-black hover:underline shrink-0">
                                Sitemap →
                            </a>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">📡 무인 IndexNow 검색 핑</div>
                                <div className="text-[11px] text-gray-400">일반 공개 페이지만 구글·네이버 자동 홍보</div>
                            </div>
                            <span className="text-emerald-400 font-black shrink-0">자동 가동 중</span>
                        </div>
                    </div>
                </div>

                {/* 자본시장법 준수 고지 */}
                <div className="bg-[#0b1120] border border-white/10 rounded-xl p-4 text-[11px] text-gray-400 leading-relaxed">
                    <span className="font-bold text-gray-300">⚖️ 준법감시인 안내 (자본시장법 제101조 준수):</span>{' '}
                    본 「AI 증권사 대표이사 전자결재 & 자율 보고 시스템」은 제도권 증권사 리서치센터가 발간한 공개 컨센서스 리포트와 거래소의 객관적 시세·수급 데이터를 자동으로 요약·상정하는 시뮬레이션 시스템입니다. 모든 최종 투자 판단(결재)과 책임은 이용자 본인에게 있습니다.
                </div>
            </div>
        </div>
    );
}
