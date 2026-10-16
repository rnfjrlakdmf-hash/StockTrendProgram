"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Lock, Clock, Calendar, CheckCircle2, TrendingUp, AlertTriangle, Share2, 
    ArrowLeft, Flame, Sparkles, Check, Copy, Compass, Zap, ShieldCheck, 
    Layers, ChevronRight, BarChart3, Globe, Building2
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';
import { toast } from 'sonner';

interface WeekendReport {
    title: string;
    subtitle: string;
    week_summary_bullets: string[];
    sections: {
        emoji: string;
        title: string;
        content: string;
    }[];
    disclaimer: string;
    generated_at: string;
}

interface ReportResponse {
    is_open: boolean;
    opens_at?: string;
    countdown_seconds?: number;
    report?: WeekendReport;
}

// Readability & Eye-Friendly Highlight Helper
function HighlightText({ text, className = "" }: { text: string; className?: string }) {
    if (!text) return null;
    
    // Only highlight short symbols/tickers (<= 12 chars) like (삼성전자), (GDP), (CPI)
    // Long explanatory sentences in parens will render naturally as clean, comfortable text
    const parts = text.split(/('[\w가-힣\s·,]{1,12}'|\([\w가-힣\s·,]{1,10}\))/g);
    
    return (
        <span className={className}>
            {parts.map((part, index) => {
                if (!part) return null;
                if (part.startsWith("'") && part.endsWith("'") && part.length <= 14) {
                    return (
                        <span key={index} className="text-amber-300 font-bold px-1.5 py-0.5 rounded-md bg-amber-400/10 mx-0.5 border border-amber-500/20">
                            {part.slice(1, -1)}
                        </span>
                    );
                }
                if (part.startsWith("(") && part.endsWith(")") && part.length <= 12) {
                    return (
                        <span key={index} className="text-sky-300 font-bold px-1.5 py-0.5 rounded-md bg-sky-400/10 mx-0.5 border border-sky-500/20">
                            {part}
                        </span>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}

import SeoContentBlock from '@/components/SeoContentBlock';
import { useAuth } from '@/context/AuthContext';

const FALLBACK_WEEKEND_REPORT: ReportResponse = {
    is_open: true,
    report: {
        title: "주간 마켓 인사이트: 글로벌 매크로 지표 점검과 차주 핵심 섹터 밸류체인 분석",
        subtitle: "한 주간 코스피·코스닥 및 뉴욕 증시 핵심 수급 팩트 요약과 다음 주 주요 경제 캘린더",
        week_summary_bullets: [
            "글로벌 반도체 및 AI 인프라 밸류체인 중심의 외국인·기관 양매수 유입 지속 — HBM(고대역폭메모리) 및 데이터센터 전력기기 섹터가 시장 하방 경직성을 확보하며 지수 반등을 견인했습니다.",
            "미국 연준(Fed) 통화정책 경로 및 국채 금리 변동성 완화 — 미 10년물 국채 금리가 안정권에 진입함에 따라 성장주 및 바이오·헬스케어 섹터로의 순환매(Sector Rotation)가 포착되었습니다.",
            "기업 밸류업 프로그램 및 주주환원 확대 기조 강화 — 낮은 PBR(주가순자산비율)과 높은 ROE(자기자본이익률)를 보유한 금융·지주·자동차 업종에 연기금 중심의 장기 패시브 자금이 유입되고 있습니다.",
            "차주 핵심 체크포인트 — 미국 소비자물가지수(CPI)·생산자물가지수(PPI) 발표 및 주요 빅테크·반도체 기업 실적 가이던스 확인 후 눌림목 분할 접근 전략이 유효합니다."
        ],
        sections: [
            {
                emoji: "🔥",
                title: "주간 핵심 주도 섹터 및 밸류체인 수급 분석",
                content: `AI 반도체 & HBM 밸류체인: 글로벌 AI 서버 증설 사이클이 본격화되면서 'SK하이닉스', '삼성전자' 및 후공정(OSAT)·테스트 소켓·열압착 본딩(TC Bonder) 소부장 기업들의 수주 잔고가 구조적으로 증가하고 있습니다. 단기 추격 매수보다는 20일 이동평균선 지지 여부를 확인하는 눌림목 대응이 유리합니다.\n전력 인프라 & 변압기·전선: 북미 노후 전력망 교체 주기와 AI 데이터센터 전력 수요 급증이 맞물리며 초고압 변압기 및 전력 설비 수출 기업들의 영업이익률(OPM)이 역대 최고치를 경신 중입니다. 수주 공시와 분기별 수출 통계를 함께 점검해야 합니다.\n바이오 & CDMO(위탁개발생산): 금리 안정화 기대감과 글로벌 빅파마와의 기술수출(L/O) 모멘텀, 미국 생물보안법 반사이익 기대감이 결합되며 위탁생산 및 플랫폼 바이오 기업들로 기관 수급이 확산되고 있습니다.`
            },
            {
                emoji: "📅",
                title: "차주 필수 체크 매크로 경제 일정 및 대응 포인트",
                content: `월요일: 한국 1~10일 수출입 잠정치 발표 (반도체·선박·자동차 품목별 일평균 수출액 증가율을 통해 분기 실적 어닝 서프라이즈 여부를 선행 점검합니다)\n화요일: 미국 NFIB 소기업 낙관지수 및 주요 연준 위원 연설 (고용 둔화 속도와 서비스 물가 점착성에 대한 연준의 스탠스 변화를 확인합니다)\n수요일: 미국 소비자물가지수(CPI) 및 근원 CPI 발표 (시장 컨센서스 대비 하회 시 나스닥 기술주 및 국내 성장주 중심의 안도 랠리가 기대됩니다)\n목요일: 한국 금융통화위원회 기준금리 결정 및 미국 신규 실업수당 청구건수 (내수 경기 진단 및 원/달러 환율 변동성에 따른 외국인 선물 포지션 변화를 주시합니다)\n금요일: 미국 미시간대 소비자심리지수 및 기대인플레이션 발표 (주말을 앞둔 기관 차익실현 물량 출회 가능성을 점검하고 현금 비중을 관리합니다)`
            }
        ],
        disclaimer: "본 주간 마켓 인사이트 리포트는 과거 시장 데이터와 예정된 거시경제 일정 등 객관적 사실만을 요약한 단순 정보 제공용 자료이며, 특정 종목에 대한 투자 권유나 개별 자문을 수행하지 않습니다. 투자의 최종 책임은 투자자 본인에게 있습니다.",
        generated_at: "2026-08-28"
    }
};

export default function WeekendReportPage() {
    const { user } = useAuth();
    const [data, setData] = useState<ReportResponse>(FALLBACK_WEEKEND_REPORT);
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/weekend-report?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then((resData: ReportResponse) => {
                if (resData && resData.report) {
                    setData({ ...resData, is_open: true });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch weekend report", err);
                setLoading(false);
            });
    }, []);

    const formatTime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        if (d > 0) return `${d}일 ${h}시간 ${m}분 ${s}초`;
        return `${h}시간 ${m}분 ${s}초`;
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: '주말 마켓 인사이트 리포트',
                text: '이번 주 시장 핵심 팩트와 다음 주 경제 일정을 확인하세요!',
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                setCopied(true);
                toast.success("🎉 주말 인사이트 링크가 복사되었습니다!");
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                alert("링크 복사에 실패했습니다.");
            });
        }
    };

interface MacroImpact {
    globalImpact: string;
    domesticImpact: string;
    keyTip?: string;
    badgeText?: string;
}

const getMacroEventImpact = (title: string, note: string = ""): MacroImpact => {
    const text = `${title} ${note}`.toLowerCase();

    // 1. CPI / 소비자물가지수 / 물가 / PCE
    if (text.includes('소비자물가지수') || text.includes('cpi') || text.includes('pce') || text.includes('개인소비지출')) {
        return {
            badgeText: "인플레이션 & 연준 금리 결정 핵심 지표",
            globalImpact: "물가 상승률이 예상보다 둔화되면 연준(Fed)의 금리 인하 기대감이 고조되며 나스닥 빅테크(엔비디아, 애플, 마이크로소프트)와 기술 성장주 중심의 강력한 반등 랠리가 촉발됩니다. 반대로 예상치를 상회하면 미 국채 금리 급등과 함께 성장주에 매물 압박이 가중됩니다.",
            domesticImpact: "미국 인플레이션 안정은 달러 강세를 누그러뜨려 원/달러 환율 안정을 유도합니다. 이는 환차손 우려를 덜어주어 외국인 투자자들의 코스피 대형 반도체(삼성전자, SK하이닉스), 2차전지, 바이오 등 시가총액 상위주로의 강력한 순매수 유입으로 연결됩니다.",
            keyTip: "변동성이 큰 에너지·식품을 제외한 '근원(Core) 물가지수'가 시장 예상치보다 낮게 나오는지가 기술주 상승의 핵심 트리거입니다."
        };
    }

    // 2. PPI / 생산자물가지수
    if (text.includes('생산자물가지수') || text.includes('ppi')) {
        return {
            badgeText: "도매 물가 & CPI 선행 지표",
            globalImpact: "기업들의 상품 생산 원가를 나타내며 향후 소비자물가의 방향타 역할을 합니다. PPI 둔화 시 기업들의 마진 개선 및 연준 긴축 완화 기대로 뉴욕 증시 전반에 우호적입니다.",
            domesticImpact: "글로벌 원자재 및 부품 조달 가격 안정으로 한국 제조업(자동차, 부품, 철강)의 원가 부담을 덜어주어 기업 실적 개선 모멘텀으로 작용합니다.",
            keyTip: "CPI 발표 직후나 직전에 발표되어 인플레이션 둔화 흐름의 일관성을 검증하는 지표로 활용됩니다."
        };
    }

    // 3. 소매판매 (Retail Sales)
    if (text.includes('소매판매') || text.includes('retail sales') || text.includes('소비')) {
        return {
            badgeText: "미국 실물 경제 70% 차지 소비 펀더멘털",
            globalImpact: "미국 GDP의 70%를 차지하는 민간 소비 체력을 검증합니다. 견조한 소매판매는 경기 침체(리세션) 우려를 차단하며 아마존, 월마트 등 유통·소비재 및 S&P500의 든든한 하방 지지선 역할을 합니다.",
            domesticImpact: "미국 소비 활성화는 대미 수출 비중이 절대적인 한국의 완성차(현대차·기아), IT 가전, 스마트폰 부품사 실적 가시성을 높여주어 외국인 및 기관 수급 유입에 긍정적으로 작용합니다.",
            keyTip: "'침체 없는 적당한 둔화(골디락스)' 수치가 금리 부담도 덜고 경기 우려도 낮춰 증시에 가장 이상적입니다."
        };
    }

    // 4. 산업생산 / 설비가동 / 제조업 / PMI / ISM
    if (text.includes('산업생산') || text.includes('제조업') || text.includes('pmi') || text.includes('ism') || text.includes('공장')) {
        return {
            badgeText: "실물 경기 & 공장 가동률 척도",
            globalImpact: "공장 가동률과 실물 제조 역량을 직접 확인하는 지표입니다. 지표 호조 시 경기 확장 국면으로 해석되어 다우존스 전통 산업재(캐터필러, 보잉)와 에너지·소재주가 강세를 보입니다.",
            domesticImpact: "한국은 전형적인 글로벌 중간재 수출국이므로, 글로벌 산업생산 확대는 전력설비(변압기·전선), 중기계, 조선, 화학, 해운 등 한국 인프라·산업재 섹터의 실적 모멘텀으로 직결됩니다.",
            keyTip: "제조업 경기 확장 기준선(보통 50 이상) 유지 여부가 경기순환(시클리컬) 주도주의 주가 향방을 가릅니다."
        };
    }

    // 5. 금리 / FOMC / 기준금리 / 연준 / 파월
    if (text.includes('기준금리') || text.includes('fomc') || text.includes('연준') || text.includes('금리') || text.includes('파월')) {
        return {
            badgeText: "글로벌 유동성 & 통화 정책 최고 이벤트",
            globalImpact: "금리 인하 또는 비둘기파(완화적) 기조 확인 시 유동성 공급 기대감으로 기술 성장주와 고밸류에이션 테크주가 전방위 탄력을 받습니다.",
            domesticImpact: "한미 금리차 축소로 원화 환율이 안정세를 찾고 신흥국 증시로의 글로벌 자금 리밸런싱이 일어나 코스피 지수 견인의 결정적 촉매제가 됩니다.",
            keyTip: "금리 결정 수치 자체보다 점도표(Dot Plot)와 파월 연준 의장의 기자회견 발언 뉘앙스가 단기 변동성을 결정합니다."
        };
    }

    // 6. 고용 / 실업률 / 비농업 / NFP
    if (text.includes('고용') || text.includes('실업률') || text.includes('비농업') || text.includes('nfp') || text.includes('일자리')) {
        return {
            badgeText: "연준 통화 정책의 양대 축 (물가 & 고용)",
            globalImpact: "신규 고용이 적당히 둔화되면 연준의 금리 인하 명분이 강화되어 뉴욕 증시에 훈풍이 불며, 급격한 경기 침체 신호만 아니라면 증시 상승 동력이 됩니다.",
            domesticImpact: "글로벌 긴축 종료 기대감을 키워 한국은행의 기준금리 인하 환경을 조성하고, 국내 내수 및 코스닥 성장주(바이오, 로봇 등)의 투자 심리를 개선합니다.",
            keyTip: "비농업 신규 일자리 수치와 함께 시간당 평균 임금 상승률의 둔화 여부를 필수적으로 체크해야 합니다."
        };
    }

    // 7. GDP / 경제성장률
    if (text.includes('gdp') || text.includes('경제성장') || text.includes('성장률')) {
        return {
            badgeText: "국가 경제 총체적 성적표",
            globalImpact: "미국 경제의 견조한 펀더멘털을 확인시켜 주며 기업들의 어닝스(실적) 신뢰도를 높여 지수의 안정적인 추세 상승을 뒷받침합니다.",
            domesticImpact: "글로벌 교역량 확대 기대감을 키워 한국 수출 주도 대형주(반도체, 자동차, 조선 등)의 실적 전망치를 상향시키는 요인이 됩니다.",
            keyTip: "잠재성장률 수준의 안정적 성장세가 유지되는지 확인하는 것이 중요합니다."
        };
    }

    // 8. 무역수지 / 수출입
    if (text.includes('무역수지') || text.includes('수출입') || text.includes('수출')) {
        return {
            badgeText: "한국 경제 생명선 & 수출 성적표",
            globalImpact: "글로벌 공급망과 주요 교역국 간의 물동량 흐름 및 교역 활력을 확인하는 주요 바로미터입니다.",
            domesticImpact: "무역흑자 유지 시 외환보유액 안정과 원화 강세를 유도하여 외국인 투자자들의 코스피 매수세를 촉진하는 핵심 동력이 됩니다.",
            keyTip: "반도체, 자동차, 선박 등 주력 품목의 대미·대중 수출액 증감률이 코스피 대형주의 향방을 좌우합니다."
        };
    }

    // 9. 기본 fallback
    return {
        badgeText: "글로벌 거시 경제 주요 지표",
        globalImpact: "실물 경제 펀더멘털과 글로벌 금리 향방에 영향을 주어 S&P500 및 나스닥 주요 지수의 변동성 지표로 작용합니다.",
        domesticImpact: "달러화 환율 및 글로벌 투자 심리와 연동되어 외국인/기관 수급과 국내 주요 수출 대형주의 단기 수급을 좌우합니다.",
        keyTip: "시장 예상치(컨센서스)와의 괴리율 및 발표 직후 미국 선물 시장의 즉각적인 반응에 주목하세요."
    };
};

    // Helper to parse section content into spacious, breathing, open editorial list
    const renderParsedContent = (content: string) => {
        if (!content) return null;
        const lines = content.split('\n').filter(l => l.trim().length > 0);

        return (
            <div className="space-y-4">
                {lines.map((line, idx) => {
                    const cleanLine = line.replace(/^[•\-\*·]\s*/, '').trim();
                    
                    // 1. 날짜 패턴 우선 검사 (예: 10월 14일(수) 또는 10월 14일 (수): ...)
                    const dateMatch = cleanLine.match(/^(\d{1,2}월\s*\d{1,2}일(?:\s*\([월화수목금토일]\))?)[:\s-]*(.*)$/);
                    
                    let tag = "";
                    let desc = "";
                    let isDate = false;

                    if (dateMatch && dateMatch[1]) {
                        tag = dateMatch[1].trim();
                        desc = dateMatch[2].trim();
                        isDate = true;
                    } else {
                        const colonIdx = cleanLine.indexOf(':');
                        if (colonIdx > 0 && colonIdx < 35) {
                            tag = cleanLine.substring(0, colonIdx).trim();
                            desc = cleanLine.substring(colonIdx + 1).trim();
                            isDate = tag.includes('월') && tag.includes('일');
                        }
                    }

                    if (tag && desc) {
                        let eventTitle = desc;
                        let eventNote: string | null = null;

                        if (isDate) {
                            // 대괄호 [일정명] 및 괄호 해설 정밀 파싱 (중첩 괄호 버그 방지)
                            const firstBracketOpen = desc.indexOf('[');
                            const lastBracketClose = desc.lastIndexOf(']');

                            if (firstBracketOpen !== -1 && lastBracketClose > firstBracketOpen) {
                                eventTitle = desc.substring(firstBracketOpen + 1, lastBracketClose).trim();
                                let remaining = desc.substring(lastBracketClose + 1).trim();
                                if (remaining.startsWith('(') && remaining.endsWith(')')) {
                                    remaining = remaining.substring(1, remaining.length - 1).trim();
                                } else if (remaining.startsWith(':')) {
                                    remaining = remaining.substring(1).trim();
                                }
                                if (remaining) {
                                    eventNote = remaining;
                                }
                            } else {
                                const lastParenOpen = desc.lastIndexOf('(');
                                const lastParenClose = desc.lastIndexOf(')');
                                if (lastParenOpen > 0 && lastParenClose === desc.length - 1) {
                                    const potentialNote = desc.substring(lastParenOpen + 1, lastParenClose).trim();
                                    const potentialTitle = desc.substring(0, lastParenOpen).trim();
                                    if (potentialNote.length > 5 || potentialNote.includes(' ')) {
                                        eventTitle = potentialTitle;
                                        eventNote = potentialNote;
                                    }
                                }
                            }
                        }

                        const impact = isDate ? getMacroEventImpact(eventTitle, eventNote || "") : null;

                        return (
                            <div 
                                key={idx} 
                                className={`relative p-5 sm:p-6 rounded-2xl transition-all border-l-4 shadow-md ${
                                    isDate 
                                        ? 'bg-gradient-to-r from-blue-950/30 via-zinc-900/40 to-transparent border-blue-400 hover:from-blue-950/50' 
                                        : 'bg-gradient-to-r from-amber-950/30 via-zinc-900/40 to-transparent border-amber-400 hover:from-amber-950/50'
                                }`}
                            >
                                <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                                    <span className={`text-xs sm:text-sm font-black px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                                        isDate 
                                            ? 'bg-blue-500/20 text-blue-300 font-mono tracking-tight border border-blue-500/30' 
                                            : 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                                    }`}>
                                        {isDate ? <Calendar className="w-3.5 h-3.5 text-blue-400" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                                        {tag}
                                    </span>
                                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                        isDate ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    }`}>
                                        {isDate ? "KEY EVENT" : "HOT SECTOR"}
                                    </span>
                                    {isDate && impact?.badgeText && (
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-500/15 border border-blue-400/30 text-blue-200">
                                            {impact.badgeText}
                                        </span>
                                    )}
                                </div>
                                {isDate ? (
                                    <div className="space-y-3.5 pl-0.5">
                                        <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                                            <HighlightText text={eventTitle} />
                                        </h4>
                                        {eventNote && (
                                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal bg-blue-950/30 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
                                                <span className="text-blue-400 font-bold shrink-0">💡 체크포인트:</span>
                                                <span>{eventNote}</span>
                                            </p>
                                        )}

                                        {/* 증시 파급효과 분석 (국내 vs 해외 2-Column Grid) */}
                                        {impact && (
                                            <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-3">
                                                <div className="flex items-center gap-2 text-xs font-black text-zinc-300">
                                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                                    <span>이 일정이 증시에 미치는 실전 파급효과 & 투자 전략</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* 🇺🇸 해외증시 영향 */}
                                                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/40 to-indigo-950/20 border border-blue-500/20 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs font-black text-blue-300">
                                                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                                                            <span>🇺🇸 해외(미국) 증시 영향</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                                                            {impact.globalImpact}
                                                        </p>
                                                    </div>

                                                    {/* 🇰🇷 국내증시 영향 */}
                                                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-teal-950/20 border border-emerald-500/20 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
                                                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                                            <span>🇰🇷 국내(한국) 증시 영향</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                                                            {impact.domesticImpact}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 🎯 핵심 관전 팁 */}
                                                {impact.keyTip && (
                                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200/90 leading-relaxed">
                                                        <span className="font-black text-amber-400 shrink-0">🎯 핵심 관전 팁:</span>
                                                        <span>{impact.keyTip}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-normal pl-0.5">
                                        <HighlightText text={desc} />
                                    </p>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border-l-2 border-white/20 text-sm sm:text-base text-zinc-100 leading-relaxed font-normal">
                            <HighlightText text={cleanLine} />
                        </div>
                    );
                })}
            </div>
        );
    };

    const report = data?.report || FALLBACK_WEEKEND_REPORT.report;

    return (
        <div className="min-h-screen bg-[#07080d] text-gray-100 p-4 md:p-8 max-w-5xl mx-auto relative overflow-hidden font-sans pb-24">
            {/* Ambient Glowing Background Auroras */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed bottom-10 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

            {/* Top Navigation & Status Bar */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all shadow-sm active:scale-95"
                >
                    <ArrowLeft className="w-4 h-4 text-amber-400" />
                    <span>홈으로 돌아가기</span>
                </Link>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border border-blue-500/30 text-blue-300 text-xs font-black shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <Calendar className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span>
                        {(data as any)?.is_current_weekend 
                            ? "🔥 주말 특별 라이브 리포트 (일요일 자정 마감)" 
                            : "지난 주말 특별 리포트 다시보기"}
                    </span>
                </div>
            </div>

            {/* Prestige Hero Header */}
            <div className="relative mb-10 pb-6 border-b border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative p-3.5 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.35)] text-white font-black flex items-center justify-center shrink-0">
                            <Compass className="w-7 h-7 text-white drop-shadow-sm" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-400"></span>
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
                                    {(data as any)?.is_current_weekend ? "VVIP WEEKEND BRIEFING" : "VVIP MARKET BRIEFING"}
                                </span>
                                <span className="text-xs font-mono font-bold text-gray-300">
                                    {(data as any)?.is_current_weekend ? "WEEKEND EDITION" : "WEEKLY EDITION"}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl lg:text-[28px] font-black text-white tracking-tight leading-snug">
                                {report?.title || "주말 마켓 인사이트: 지난주 시장 데이터와 다음 주 경제 일정"}
                            </h1>
                            <p className="text-sm text-zinc-300 mt-1 font-medium">
                                {report?.subtitle || "이번 주 시장 핵심 팩트 요약과 다음 주 주요 경제 캘린더"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="space-y-10">
                {/* 1. 1분 마켓 서머리 Executive Bento */}
                <section className="relative bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-zinc-950 border border-emerald-500/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden space-y-5">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-gradient-to-br from-emerald-400/20 to-teal-600/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-mono font-bold text-emerald-400 tracking-widest block uppercase">
                                    SECTION 01 · 1-MIN EXECUTIVE SUMMARY
                                </span>
                                <h2 className="text-lg md:text-xl font-black text-white">
                                    1분 마켓 핵심 서머리
                                </h2>
                            </div>
                        </div>
                        <span className="text-[11px] bg-emerald-500/15 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            WEEKLY BRIEF
                        </span>
                    </div>

                    <div className="space-y-3.5">
                        {report?.week_summary_bullets?.map((bullet, idx) => (
                            <div 
                                key={idx} 
                                className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all"
                            >
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-black flex items-center justify-center text-xs font-black font-mono shrink-0 mt-0.5 shadow-md">
                                    {idx + 1}
                                </div>
                                <span className="text-sm sm:text-base text-zinc-100 leading-relaxed font-normal pt-0.5">
                                    <HighlightText text={bullet.replace(/^[•\-\*·]\s*/, '')} />
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. 상세 섹션 (2-Column Grid) */}
                <div className="grid grid-cols-1 gap-8">
                    {report?.sections?.map((section, idx) => (
                        <section 
                            key={idx} 
                            className={`relative rounded-3xl p-6 md:p-7 shadow-2xl border flex flex-col justify-between overflow-hidden ${
                                idx === 0 
                                    ? 'bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-950 border-amber-500/30 hover:border-amber-500/50' 
                                    : 'bg-gradient-to-br from-blue-950/20 via-zinc-950 to-zinc-950 border-blue-500/30 hover:border-blue-500/50'
                            }`}
                        >
                            <div className="space-y-5">
                                <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl p-2 bg-zinc-900/90 rounded-2xl border border-white/10 shadow-sm">
                                            {section.emoji}
                                        </span>
                                        <div>
                                            <span className={`text-[10px] font-mono font-bold tracking-wider block uppercase ${
                                                idx === 0 ? 'text-amber-400' : 'text-blue-400'
                                            }`}>
                                                {idx === 0 ? 'SECTION 02 · SECTOR THEMES' : 'SECTION 03 · MACRO CALENDAR'}
                                            </span>
                                            <h3 className="text-base md:text-lg font-black text-white">
                                                {section.title}
                                            </h3>
                                        </div>
                                    </div>
                                </div>

                                {idx === 1 && !user ? (
                                    <div className="space-y-4">
                                        {renderParsedContent(section.content.split('\n').slice(0, 2).join('\n'))}
                                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/40 via-zinc-900/90 to-zinc-950 border border-blue-500/30 text-center space-y-3 shadow-xl">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-black">
                                                <Lock className="w-3.5 h-3.5" /> 회원 전용 차주 중·후반 실전 대응 전략
                                            </div>
                                            <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
                                                수요일~금요일 핵심 거시경제 이벤트(CPI·금통위·옵션만기 등) 발표 시점별 기관·외국인 수급 시나리오와 현금 비중 조절 가이드는 회원 로그인 후 전체 열람하실 수 있습니다.
                                            </p>
                                            <Link
                                                href="/login"
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg transition-all"
                                            >
                                                🔐 무료 로그인하고 차주 전체 일정 & 대응 전략 보기
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    renderParsedContent(section.content)
                                )}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Kakao AdFit In-Feed Banner */}
                <KakaoRevenueAd type="feed" />

                {/* 3. 액션 버튼 */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button 
                        onClick={handleShare}
                        className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs md:text-sm shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all transform active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-300" />
                                <span className="text-emerald-100 font-bold">주말 인사이트 복사 완료!</span>
                            </>
                        ) : (
                            <>
                                <Share2 className="w-4 h-4 text-blue-200" />
                                <span>이 주말 인사이트 지인에게 공유하기</span>
                            </>
                        )}
                    </button>
                    <p className="text-[11px] text-gray-400 font-mono tracking-wider">
                        VVIP WEEKEND RADAR · CONFIDENTIAL INTELLIGENCE
                    </p>
                </div>

                {/* 4. 자본시장법 준수 법적 면책 안내 */}
                <div className="p-6 bg-zinc-950/90 border border-white/5 rounded-3xl text-xs text-gray-300 space-y-2">
                    <p className="font-bold text-amber-400 flex items-center gap-2 text-xs md:text-sm">
                        <ShieldCheck className="w-4 h-4 text-amber-400" /> 투자 정보 법적 고지 및 면책 안내
                    </p>
                    <p className="leading-relaxed text-gray-400 text-xs md:text-[13px]">
                        {report?.disclaimer || "본 주말 마켓 인사이트 리포트는 과거 데이터와 예정된 경제 일정 등 객관적 사실만을 요약한 단순 정보 제공용 자료이며, 특정 종목에 대한 투자 권유나 개별 자문을 수행하지 않습니다. 투자의 최종 책임은 투자자 본인에게 있습니다."}
                    </p>
                </div>
            </main>
            <SeoContentBlock
                pageTitle="주간 마켓 인사이트 & 차주 거시경제 캘린더 리포트"
                pageDescription="한 주간의 코스피·코스닥 및 뉴욕 증시 핵심 수급 팩트 요약과 다음 주 주요 경제 일정(CPI, FOMC, 고용지표, 수출입 통계) 및 섹터별 밸류체인 분석을 제공합니다."
            />
        </div>
    );
}
