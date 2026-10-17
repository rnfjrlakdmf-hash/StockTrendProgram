"use client";

import KakaoRevenueAd from "@/components/KakaoRevenueAd";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Clock, TrendingUp, Anchor, Briefcase, ChevronRight, CheckCircle, Share2, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/LoginModal';

interface WhaleReport {
    title: string;
    subtitle: string;
    whale_sectors?: { sector: string; leader: string; intensity: string; flow_reason: string }[];
    hidden_whales?: { stock: string; amount: string; pattern: string; catalyst: string }[];
    foreign_analysis: { stock: string; amount?: string; reason: string }[];
    inst_analysis: { stock: string; amount?: string; reason: string }[];
    monday_strategy: string;
    generated_at: string;
}

interface ReportResponse {
    is_open: boolean;
    opens_at?: string;
    countdown_seconds?: number;
    report?: WhaleReport;
}

import SeoContentBlock from '@/components/SeoContentBlock';

const FALLBACK_WHALE_REPORT: ReportResponse = {
    is_open: true,
    report: {
        title: "주간 슈퍼 고래(Whale) 수급 심층 엑스레이: 외국인·기관 3대 주도 섹터 및 매집주 분석",
        subtitle: "한 주간 한국거래소(KRX)에서 포착된 외국인·기관 거대 자본의 집중 유입 섹터와 은밀한 수급 축적 패턴을 해부합니다.",
        whale_sectors: [
            {
                sector: "AI 반도체 & HBM(고대역폭메모리) 소부장",
                leader: "SK하이닉스 · 삼성전자 · 한미반도체",
                intensity: "외인·기관 양매수 집중",
                flow_reason: "글로벌 빅테크의 차세대 AI 가속기 투자 확대에 따라 HBM3E/HBM4 밸류체인 및 어드밴스드 패키징 공정 장비 기업으로 외국인 패시브·액티브 자금이 동반 유입되었습니다."
            },
            {
                sector: "북미 전력 인프라 & 초고압 변압기",
                leader: "HD현대일렉트릭 · 효성중공업 · LS ELECTRIC",
                intensity: "기관 연속 순매수",
                flow_reason: "AI 데이터센터 전력 소비 급증과 북미 노후 송배전망 교체 사이클이 맞물리며 장기 수주 잔고(Backlog)가 3년 치 이상 확보된 전력기기 대장주에 연기금·투신 자금이 집중되었습니다."
            },
            {
                sector: "기업 밸류업 & 주주환원 금융·지주",
                leader: "KB금융 · 신한지주 · 현대차",
                intensity: "외국인 장기 매집",
                flow_reason: "자사주 매입·소각 확대 및 배당성향 상향 공시가 이어지면서 저PBR·고ROE 핵심 우량주에 글로벌 롱온리(Long-only) 펀드의 자금 유입이 지속되고 있습니다."
            }
        ],
        hidden_whales: [
            {
                stock: "삼성전기",
                amount: "기관 45만주 순매수",
                pattern: "지수 조정 구간 20일 이동평균선 하단 방어 및 기관 5거래일 연속 매집",
                catalyst: "AI 서버용 고부가 MLCC(적층세라믹콘덴서) 및 FC-BGA 기판 가동률 상승 모멘텀"
            },
            {
                stock: "유한양행",
                amount: "외인·연기금 동반 유입",
                pattern: "박스권 횡보 중 거래량 감소 속 기관·외국인 지분율 점진적 확대",
                catalyst: "글로벌 폐암 신약 병용요법 로열티 유입 본격화 및 R&D 파이프라인 마일스톤 기대감"
            },
            {
                stock: "LIG넥스원",
                amount: "외국인 18만주 순매수",
                pattern: "단기 눌림목 구간에서 투신·연기금의 저가 분할 매수세 유입 확인",
                catalyst: "중동 및 유럽향 방공망 수출 수주 잔고 확대에 따른 중장기 실적 가시성 확보"
            }
        ],
        foreign_analysis: [
            { stock: "SK하이닉스", amount: "1,420,000주", reason: "HBM 시장 지배력 및 분기 영업이익 컨센서스 상향에 따른 글로벌 반도체 펀드 자금 유입" },
            { stock: "삼성전자", amount: "2,850,000주", reason: "역사적 PBR 밴드 하단에서의 밸류에이션 매력 부각 및 레거시·선단 메모리 업황 회복 기대" },
            { stock: "KB금융", amount: "680,000주", reason: "보통주자본비율(CET1) 기반의 적극적 자사주 소각 및 분기 배당 매력에 따른 외국인 매수" },
            { stock: "현대차", amount: "510,000주", reason: "하이브리드(HEV) 판매 호조를 통한 고수익성 유지 및 주주환원 정책 강화" },
            { stock: "알테오젠", amount: "240,000주", reason: "피하주사(SC) 제형 변경 플랫폼 기술의 글로벌 빅파마 확장성 부각" }
        ],
        inst_analysis: [
            { stock: "HD현대일렉트릭", amount: "195,000주", reason: "북미 초고압 변압기 수주 단가 상승 및 고마진 매출 인식 본격화에 따른 기관 매집" },
            { stock: "셀트리온", amount: "310,000주", reason: "미국 시장 신약 짐펜트라 처방 확대 및 바이오시밀러 포트폴리오 원가율 개선" },
            { stock: "한화에어로스페이스", amount: "220,000주", reason: "폴란드 및 루마니아 등 유럽향 지상방산 인도 물량 증가로 분기 사상 최대 실적 기대" },
            { stock: "NAVER", amount: "380,000주", reason: "AI 기반 광고·커머스 타겟팅 고도화에 따른 영업이익률 개선 및 밸류에이션 저평가 매력" },
            { stock: "크래프톤", amount: "115,000주", reason: "글로벌 핵심 IP 트래픽 강세 지속 및 신작 파이프라인 모멘텀에 따른 투신·연기금 매수" }
        ],
        monday_strategy: "1. 시초가 추격 매수 자제 및 09:00~09:30 프로그램 수급 확인: 월요일 장 초반에는 주말 간 발생한 글로벌 매크로 이슈와 미 증시 선물 흐름이 일시적으로 반영되며 호가 공백과 변동성이 확대됩니다. 시초가 갭상승 종목을 추격 매수하기보다 장 시작 후 30분간 외국인·기관의 비차익 프로그램 순매수 유입 여부를 먼저 점검하십시오.\n2. 외인·기관 양매수 지속 섹터의 눌림목 분할 접근: 한 주간 거대 자본이 집중된 반도체 소부장, 전력 인프라, 밸류업 금융·자동차 섹터 중 5일 또는 20일 이동평균선 부근에서 거래량이 줄어들며 하방 경직성을 보이는 종목을 중심으로 분할 접근하는 전략이 유효합니다.\n3. 손절선(Stop-Loss) 및 현금 비중 원칙 준수: 진입 전 반드시 핵심 지지선 이탈 시의 기계적 손절 기준(-2% ~ -3% 또는 주요 추세선 이탈)을 설정하고, 계좌 내 최소 20~30%의 현금 비중을 유지하여 시장 변동성에 유연하게 대응하시기 바랍니다.",
        generated_at: "2026-08-28"
    }
};

export default function WeekendWhalePage() {
    const { user } = useAuth();
    const [data, setData] = useState<ReportResponse>(FALLBACK_WHALE_REPORT);
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/weekend-whale-report?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then((resData: ReportResponse) => {
                if (resData && resData.report) {
                    setData({ ...resData, is_open: true });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch whale report", err);
                setLoading(false);
            });
    }, []);

    const report = data?.report || FALLBACK_WHALE_REPORT.report;

    return (
        <div className="min-h-screen bg-[#07090e] text-gray-100 pb-20">
            {/* Header */}
            <header className="relative pt-24 pb-12 px-6 overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-indigo-950/20 to-transparent"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="w-64 h-64 text-cyan-400" />
                </div>
                
                <div className="relative z-10 max-w-5xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black mb-4">
                        <Anchor className="w-3.5 h-3.5" />
                        {(data as any)?.is_current_weekend 
                            ? "🔥 주말 특별 라이브 (한 주간 고래 자금 엑스레이)" 
                            : "📰 지난 주말 특별 리포트 다시보기"}
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black mb-3 leading-tight tracking-tight text-white">
                        {report?.title || "주말 한정판: 슈퍼 고래(Whale) 수급 심층 엑스레이"}
                    </h1>
                    <p className="text-sm md:text-base text-cyan-200/70 font-medium leading-relaxed max-w-2xl">
                        {report?.subtitle || "한 주간 시장을 뒤흔든 슈퍼 고래들의 집중 매집 섹터와 은밀한 매집주를 해부합니다."}
                    </p>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-10">
                
                {/* 1. 주간 슈퍼 고래 집중 섹터 맵 */}
                {report?.whale_sectors && report.whale_sectors.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                            <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-white">
                                    🐋 주간 슈퍼 고래 집중 섹터 맵 (Whale Sector Map)
                                </h2>
                                <p className="text-xs sm:text-sm text-zinc-300 font-medium">한 주간 거대 자본(수천억 원대)이 집중된 상위 3대 주도 산업군</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {report.whale_sectors.map((sec, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-gradient-to-b from-cyan-950/20 via-zinc-950/80 to-zinc-950/90 border-l-4 border-cyan-400 rounded-3xl p-6 transition-all shadow-lg flex flex-col justify-between hover:from-cyan-950/30"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className="text-xs font-black text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 px-3 py-1 rounded-xl">
                                                주도 섹터 #{idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-lg">
                                                {sec.intensity || "집중 유입"}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-white mb-1.5">
                                            {sec.sector}
                                        </h3>
                                        <p className="text-xs sm:text-sm font-bold text-zinc-300 mb-3.5">
                                            대표 종목: <span className="text-cyan-300">{sec.leader}</span>
                                        </p>
                                        <p className="text-sm sm:text-[15px] text-zinc-100 leading-relaxed font-normal">
                                            {sec.flow_reason}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                <KakaoRevenueAd type="banner" />

                {/* 2. 고래들의 은밀한 매집주 */}
                {report?.hidden_whales && report.hidden_whales.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-white">
                                    🔍 고래들의 은밀한 매집주 (Hidden Whale Accumulation)
                                </h2>
                                <p className="text-xs sm:text-sm text-zinc-300 font-medium">주가는 횡보/조정 중이나 외인·기관이 조용히 수량을 축적한 종목군</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {report.hidden_whales.map((hw, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-zinc-950/80 border border-indigo-500/20 hover:border-indigo-500/50 rounded-3xl p-5 transition-all shadow-lg flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/5">
                                            <h3 className="text-lg font-black text-white">
                                                {hw.stock}
                                            </h3>
                                            <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg">
                                                {hw.amount}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 text-xs text-gray-300">
                                            <p className="leading-relaxed font-medium text-cyan-200/90">
                                                📌 {hw.pattern}
                                            </p>
                                            <p className="leading-relaxed text-gray-400">
                                                💡 {hw.catalyst}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                <KakaoRevenueAd type="feed" />

                {/* 3. Foreign & Institution Top 10 Facts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Foreign Top 10 */}
                    <section className="bg-zinc-950/70 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-sm shadow-xl">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2.5 text-cyan-400 pb-3 border-b border-white/5">
                            <Anchor className="w-5 h-5" /> 외국인 주간 순매수 TOP 10
                        </h2>
                        <div className="space-y-3">
                            {(user ? report?.foreign_analysis : report?.foreign_analysis?.slice(0, 3))?.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-zinc-900/60 border border-white/5 hover:border-cyan-500/30 rounded-2xl p-3.5 flex items-start gap-3 transition-all"
                                >
                                    <div className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center font-black text-xs border border-cyan-500/20 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                            <h3 className="text-lg font-black text-white">
                                                {item.stock}
                                            </h3>
                                            {item.amount && (
                                                <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                                                    {item.amount.includes('주') ? item.amount : `${item.amount}주`}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-zinc-100 text-sm sm:text-[15px] leading-relaxed font-normal">
                                            {item.reason}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Institution Top 10 */}
                    <section className="bg-zinc-950/70 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-sm shadow-xl">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2.5 text-indigo-400 pb-3 border-b border-white/5">
                            <Briefcase className="w-5 h-5" /> 기관 주간 순매수 TOP 10
                        </h2>
                        <div className="space-y-3">
                            {(user ? report?.inst_analysis : report?.inst_analysis?.slice(0, 3))?.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-zinc-900/60 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-3.5 flex items-start gap-3 transition-all"
                                >
                                    <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center font-black text-xs border border-indigo-500/20 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                            <h3 className="text-lg font-black text-white">
                                                {item.stock}
                                            </h3>
                                            {item.amount && (
                                                <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                                    {item.amount.includes('주') ? item.amount : `${item.amount}주`}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-zinc-100 text-sm sm:text-[15px] leading-relaxed font-normal">
                                            {item.reason}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* 4. Monday Strategy (Member Distinction) */}
                {user ? (
                    <section className="bg-gradient-to-br from-zinc-900/90 via-zinc-900 to-indigo-950/30 border border-indigo-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
                        <h2 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2 text-emerald-400 pb-3 border-b border-white/10">
                            <CheckCircle className="w-6 h-6" />
                            🎯 다음 주 월요일 시초가 공략 로드맵 (Monday Opening Playbook)
                        </h2>
                        <div className="text-gray-200 leading-relaxed text-xs md:text-sm whitespace-pre-line space-y-2 font-normal">
                            {report?.monday_strategy}
                        </div>
                    </section>
                ) : (
                    <section className="bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-indigo-950/30 border border-cyan-500/30 rounded-3xl p-6 md:p-8 text-center space-y-4 shadow-2xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black">
                            <Lock className="w-3.5 h-3.5" /> 회원 전용 심층 데이터 잠금
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white">
                            외인·기관 순매수 4~10위 전체 명단 & 월요일 시초가 공략 로드맵
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
                            상단 3대 주도 섹터 맵, 은밀한 매집주 3선, 외인·기관 TOP 3 분석은 무료로 공개됩니다. 나머지 4~10위 종목 상세 수급 사유와 월요일 장 초반(09:00~09:30) 실전 대응 로드맵은 회원 로그인 후 즉시 열람하실 수 있습니다.
                        </p>
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
                        >
                            🔐 무료 로그인하고 전체 명단 & 월요일 전략 열람하기
                        </button>
                    </section>
                )}

                {/* 5. Disclaimer */}
                <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-3xl text-[11px] text-gray-400 space-y-1.5">
                    <p className="font-bold text-cyan-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-cyan-400" /> 주말 수급 정보 법적 안내 및 유의사항
                    </p>
                    <p className="leading-relaxed text-gray-500">
                        본 주말 고래 수급 리포트는 한국거래소(KRX) 주간 수급 통계 및 공시 데이터를 요약한 단순 정보 제공용 자료이며, 특정 종목의 매수·매도를 권유하지 않습니다. 투자 판단의 최종 책임은 투자자 본인에게 있습니다.
                    </p>
                </div>
            </main>

            <SeoContentBlock
                pageTitle="주간 슈퍼 고래(외국인·기관) 수급 심층 엑스레이 리포트"
                pageDescription="한 주간 한국거래소(KRX)에서 집계된 외국인·기관 투자자의 집중 순매수 상위 섹터와 조용히 수량이 축적된 매집주 패턴, 월요일 시초가 대응 원칙을 분석합니다."
            />

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </div>
    );
}
