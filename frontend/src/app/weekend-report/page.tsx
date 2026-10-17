"use client";

import { useState, useEffect } from 'react';
import { 
    Lock, Calendar, CheckCircle2, TrendingUp, Share2, 
    ArrowLeft, Sparkles, Check, Compass, Zap, ShieldCheck, 
    Globe, Building2, BookOpen, FileText, ExternalLink, Target, Award, Layers
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';
import { toast } from 'sonner';
import SeoContentBlock from '@/components/SeoContentBlock';
import { useAuth } from '@/context/AuthContext';

interface SecuritiesResearchItem {
    id: string;
    category: string;
    broker: string;
    date: string;
    title: string;
    target: string;
    item_code?: string | null;
    goal_price?: string | null;
    opinion?: string | null;
    raw_points: string[];
    easy_summary: string;
    checkpoint: string;
    naver_url?: string;
}

interface WeekendReport {
    title: string;
    subtitle: string;
    week_summary_bullets: string[];
    sections: {
        emoji: string;
        title: string;
        content: string;
    }[];
    securities_research?: SecuritiesResearchItem[];
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

const DEFAULT_SECURITIES_RESEARCH: SecuritiesResearchItem[] = [
    {
        id: "market_default_1",
        category: "시황·투자전략",
        broker: "신한투자증권",
        date: "2026-10-16",
        title: "트검다리 - AI 구원투수 젠슨 황 & 반도체·전력기기 수급 복귀",
        target: "국내 증시 시황",
        raw_points: [
            "미국 9월 생산자물가지수(PPI)와 소매판매 예상치 상회 속에서도 AI 설비투자(CapEx) 지속성에 대한 신뢰 회복",
            "젠슨 황의 AI 데이터센터 수요 및 자본조달 비용 하락 언급으로 글로벌 AI 밸류체인 투자심리 개선",
            "외국인 현·선물 매도 진정 및 기관 5일 연속 순매수 유입, 자동차·방산·초고압 변압기 등 전력기기 업종 동반 강세"
        ],
        easy_summary: "신한투자증권의 시황 분석 리포트입니다. 최근 물가 지표 발표로 시장이 잠시 흔들렸지만, 엔비디아(젠슨 황)가 AI 데이터센터 투자가 여전히 강력하다고 확인해주면서 한국 반도체와 전력설비(변압기) 기업들로 기관 자금이 다시 든든하게 들어오고 있다는 뜻입니다.",
        checkpoint: "외국인의 선물 매도세가 진정되는지, 그리고 AI 반도체와 초고압 변압기 대장주들의 기관 순매수가 이어지는지 확인하세요.",
        naver_url: "https://stock.naver.com/research/daily"
    },
    {
        id: "invest_default_2",
        category: "시황·투자전략",
        broker: "유안타증권",
        date: "2026-10-16",
        title: "[주식시황 위클리] 미워도 다시 한번, 조정 시 저점 매수하는 구간",
        target: "포트폴리오·투자전략",
        raw_points: [
            "단기 지수 급락 구간에서 외국인 수급 공백과 신용융자 반대매매 물량이 출회되며 과매도 구간 진입",
            "환율 급등세가 진정되고 달러화 강세가 속도 조절에 들어가면서 대형 실적주 중심의 저가 매수 유입 기대",
            "밸류에이션 매력이 높아진 반도체·IT 하드웨어 및 방어적 배당주 중심의 분할 대응 유효"
        ],
        easy_summary: "유안타증권의 주간 투자전략 보고서입니다. 최근 주가가 단기적으로 빠르게 빠지면서 겁을 먹은 투매 물량이 나왔지만, 기업들의 실제 실적에 비해 주가가 너무 싸진 상태이므로 공포에 팔기보다는 실적이 좋은 대형주를 차분히 모아가는 전략이 유리하다는 분석입니다.",
        checkpoint: "원/달러 환율이 안정세를 유지하는지 확인하면서 실적이 뒷받침되는 대형주 위주로 분할 접근하세요.",
        naver_url: "https://stock.naver.com/research/invest"
    },
    {
        id: "industry_default_1",
        category: "산업·섹터분석",
        broker: "하나증권",
        date: "2026-10-16",
        title: "통신주 최근 주가 하락을 배당·밸류업 매수 기회로 삼아야",
        target: "통신·배당 밸류업",
        raw_points: [
            "미국 통신주 조정 및 위성통신 경쟁 우려로 국내 통신 3사 주가가 단기 조정을 받았으나 실제 펀더멘털 영향은 제한적",
            "높은 배당수익률과 주주환원(밸류업) 정책을 감안할 때 단기 주가 하락은 중장기 배당 투자자에게 매력적인 구간",
            "연말 배당 시즌을 앞두고 안정적인 현금흐름을 보유한 통신 업종의 방어주 매력 부각 전망"
        ],
        easy_summary: "하나증권의 통신 산업 분석 리포트입니다. 해외 이슈 때문에 국내 통신사(SKT·KT·LGU+) 주가가 일시적으로 내렸지만, 통신사들이 벌어들이는 현금과 높은 배당금은 변함이 없기 때문에 오히려 싸게 배당주를 담아둘 좋은 기회라는 설명입니다.",
        checkpoint: "시장 변동성이 클 때 주가를 방어해주고 연말 배당금까지 챙길 수 있는 고배당 통신·금융주의 기관 수급을 체크하세요.",
        naver_url: "https://stock.naver.com/research/industry"
    },
    {
        id: "industry_default_2",
        category: "산업·섹터분석",
        broker: "한화투자증권",
        date: "2026-10-16",
        title: "은행 산업 분석: 가계대출 성장 둔화 속 기업대출 및 주주환원 차별화",
        target: "은행·금융지주",
        raw_points: [
            "가계대출 규제 강화로 대출 성장률은 완만해졌으나, 우량 대기업 및 중소기업 중심의 기업대출 수요가 실적을 뒷받침",
            "기준금리 환경 속에서도 안정적인 이자 이익과 자사주 매입·소각 등 밸류업 주주환원 여력이 핵심 주가 동력으로 작용",
            "보통주자본비율(CET1)이 높은 대형 금융지주 중심의 차별화된 주주환원 정책 지속 전망"
        ],
        easy_summary: "한화투자증권의 은행 업종 리포트입니다. 집을 살 때 빌리는 가계대출은 정부 규제로 줄었지만, 회사들이 빌리는 기업대출이 꾸준히 늘고 있어 은행들의 이익은 여전히 탄탄하며, 벌어들인 돈으로 배당을 늘리는 '밸류업' 매력이 계속될 것이라는 뜻입니다.",
        checkpoint: "주요 금융지주사들의 3분기 실적 발표와 함께 발표되는 자사주 소각·배당 확대 규모를 확인하세요.",
        naver_url: "https://stock.naver.com/research/industry"
    },
    {
        id: "company_default_1",
        category: "종목·목표주가",
        broker: "하나증권",
        date: "2026-10-16",
        title: "대형원전과 SMR(소형모듈원전) 추가 수주 모멘텀 기대",
        target: "두산에너빌리티",
        item_code: "034020",
        goal_price: "120,000원",
        opinion: "Buy (매수)",
        raw_points: [
            "목표주가 120,000원으로 상향 조정하며 투자의견 Buy(매수) 유지",
            "글로벌 AI 데이터센터 전력 수요 폭증으로 대형 원전 및 차세대 소형모듈원전(SMR) 핵심 주기기 수주 확대 기대",
            "원전 및 가스터빈 등 고수익 기자재 매출 비중이 늘어나며 중장기 이익 체력(펀더멘털) 구조적 개선 전망"
        ],
        easy_summary: "하나증권에서 '두산에너빌리티'에 대해 목표주가를 상향하며 발표한 리포트입니다. 전 세계적으로 AI 데이터센터를 돌릴 전기가 부족해지면서, 24시간 전기를 안정적으로 만드는 대형 원자력발전소와 소형원전(SMR) 핵심 설비를 만드는 이 회사의 일감(수주)이 크게 늘어날 것이라는 분석입니다.",
        checkpoint: "해외 원전 본계약 일정 및 북미 빅테크 기업들의 SMR(소형모듈원전) 전력 공급 계약 뉴스를 주시하세요.",
        naver_url: "https://stock.naver.com/research/company"
    },
    {
        id: "company_default_2",
        category: "종목·목표주가",
        broker: "한화투자증권",
        date: "2026-10-16",
        title: "3Q26 Preview: 꺾이지 않는 해외법인 고성장과 안정적 현금흐름",
        target: "코웨이",
        item_code: "021240",
        goal_price: "160,000원",
        opinion: "Buy (매수)",
        raw_points: [
            "3분기 연결 매출액 및 영업이익이 시장 예상치(컨센서스)에 부합하는 견조한 호실적 기록 전망",
            "국내 렌탈 계정의 안정적 성장과 더불어 말레이시아·태국 등 동남아 해외법인의 고성장이 전체 실적 견인",
            "안정적인 구독형(렌탈) 비즈니스 모델을 기반으로 경기 변동에 흔들리지 않는 이익 안정성 및 주주환원 확대 매력 보유"
        ],
        easy_summary: "한화투자증권에서 '코웨이'에 대해 발표한 기업 분석 리포트입니다. 정수기·공기청정기처럼 매달 렌탈료를 받는 사업 구조 덕분에 경기가 흔들려도 돈을 꾸준히 잘 벌고 있으며, 특히 말레이시아 등 해외에서 가입자가 빠르게 늘어 실적이 탄탄하다는 평가입니다.",
        checkpoint: "환율 변동에 따른 해외법인 실적 기여도와 연말 배당·주주환원 정책 강화를 함께 확인하세요.",
        naver_url: "https://stock.naver.com/research/company"
    }
];

const FALLBACK_WEEKEND_REPORT: ReportResponse = {
    is_open: true,
    report: {
        title: "주간 마켓 인사이트: 글로벌 매크로 지표 점검과 차주 핵심 섹터 밸류체인 분석",
        subtitle: "한 주간 코스피·코스닥 및 뉴욕 증시 핵심 수급 팩트 요약, 주요 증권사 리서치 브리핑과 다음 주 경제 캘린더",
        week_summary_bullets: [
            "[국내 증시 & 수급] 글로벌 반도체 및 AI 인프라 밸류체인 중심의 기관 매수세 유입 지속 — HBM(고대역폭메모리) 및 데이터센터 전력기기 섹터가 시장 하방 지지선을 확보하며 지수 반등을 견인했습니다.",
            "[미국 증시 & 금리·환율] 미국 물가지표(PPI·CPI) 및 소매판매 발표 속에서도 빅테크의 AI 설비투자(CapEx) 지속 의지가 재확인되며 나스닥 기술주와 한국 수출 대형주에 우호적인 수급 환경이 조성되었습니다.",
            "[증권사 리서치 컨센서스] 주요 증권사 리서치센터는 단기 지수 흔들림 구간을 실적 대비 저평가된 AI 반도체, 전력 인프라·원전(SMR), 그리고 고배당 밸류업(금융·통신) 업종의 분할 매수 기회로 평가하고 있습니다.",
            "[차주 핵심 관전 포인트] 다음 주 발표될 미국·중국 실물 경기 지표(산업생산·소매판매)와 주요 기업 3분기 실적 가이던스를 확인하며, 급등주 추격 매수보다는 눌림목 분할 접근 전략이 유효합니다."
        ],
        sections: [
            {
                emoji: "🔥",
                title: "최근 자금 쏠림 테마 복기",
                content: `• 반도체 & AI 인프라: 엔비디아 등 글로벌 빅테크 기업들이 AI 데이터센터 설비투자(CapEx)를 계속 늘리겠다고 밝히면서, HBM(고대역폭메모리)과 첨단 패키징 부품을 공급하는 국내 반도체 대장주 및 소부장 기업들로 기관 매수세가 다시 유입되었습니다.\n• 전력설비 & 원전(SMR): AI 데이터센터 가동에 막대한 전기가 필요해지면서 노후 전력망을 교체하는 초고압 변압기 기업들과 24시간 무탄소 전력을 공급하는 대형원전·소형모듈원전(SMR) 주기기 기업들의 수주 기대감이 강하게 부각되었습니다.\n• 바이오 & 헬스케어: 금리 안정화 기대감과 글로벌 제약사들의 신약 기술수출 및 위탁개발생산(CDMO) 수주 확대 소식에 힘입어 실적 가시성이 높은 바이오 대형주와 플랫폼 기업들로 순환매 자금이 유입되었습니다.\n• 금융·통신 & 배당 밸류업: 시장 변동성이 커질 때마다 안정적인 현금흐름과 높은 배당수익률, 자사주 소각 등 주주환원(밸류업) 정책을 갖춘 은행·금융지주 및 통신 3사로 연기금과 기관의 방어적 매수세가 꾸준히 모였습니다.`
            },
            {
                emoji: "📅",
                title: "차주 놓치면 안 될 경제 일정",
                content: `• 10월 19일(월): [중국 3분기 GDP 및 9월 산업생산·소매판매] (우리나라 대중국 수출 기업인 화학·철강·화장품·반도체 업종의 경기 회복 속도를 가늠하는 핵심 지표입니다)\n• 10월 20일(화): [미국 컨퍼런스보드 경기선행지수 발표] (미국 실물 경제가 침체 없이 안정적인 성장세를 이어가는지 확인하는 체크포인트입니다)\n• 10월 22일(목): [한국 1~20일 수출입 잠정치 & 미국 신규 실업수당 청구건수] (반도체·자동차·변압기 품목의 수출 증가율과 미국 고용 시장의 안정 여부를 동시에 점검합니다)`
            }
        ],
        securities_research: DEFAULT_SECURITIES_RESEARCH,
        disclaimer: "본 주간 마켓 인사이트 리포트는 과거 시장 데이터와 주요 증권사 공개 리서치 요약, 예정된 거시경제 일정 등 객관적 사실만을 정리한 단순 정보 제공용 자료이며, 특정 종목에 대한 투자 권유나 개별 자문을 수행하지 않습니다. 투자의 최종 책임은 투자자 본인에게 있습니다.",
        generated_at: "2026-10-17"
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

    if (text.includes('소비자물가지수') || text.includes('cpi') || text.includes('pce') || text.includes('개인소비지출')) {
        return {
            badgeText: "인플레이션 & 연준 금리 결정 핵심 지표",
            globalImpact: "물가 상승률이 예상보다 둔화되면 연준(Fed)의 금리 인하 기대감이 고조되며 나스닥 빅테크(엔비디아, 애플, 마이크로소프트)와 기술 성장주 중심의 강력한 반등 랠리가 촉발됩니다. 반대로 예상치를 상회하면 미 국채 금리 급등과 함께 성장주에 매물 압박이 가중됩니다.",
            domesticImpact: "미국 인플레이션 안정은 달러 강세를 누그러뜨려 원/달러 환율 안정을 유도합니다. 이는 환차손 우려를 덜어주어 외국인 투자자들의 코스피 대형 반도체(삼성전자, SK하이닉스), 2차전지, 바이오 등 시가총액 상위주로의 강력한 순매수 유입으로 연결됩니다.",
            keyTip: "변동성이 큰 에너지·식품을 제외한 '근원(Core) 물가지수'가 시장 예상치보다 낮게 나오는지가 기술주 상승의 핵심 트리거입니다."
        };
    }

    if (text.includes('생산자물가지수') || text.includes('ppi')) {
        return {
            badgeText: "도매 물가 & CPI 선행 지표",
            globalImpact: "기업들의 상품 생산 원가를 나타내며 향후 소비자물가의 방향타 역할을 합니다. PPI 둔화 시 기업들의 마진 개선 및 연준 긴축 완화 기대로 뉴욕 증시 전반에 우호적입니다.",
            domesticImpact: "글로벌 원자재 및 부품 조달 가격 안정으로 한국 제조업(자동차, 부품, 철강)의 원가 부담을 덜어주어 기업 실적 개선 모멘텀으로 작용합니다.",
            keyTip: "CPI 발표 직후나 직전에 발표되어 인플레이션 둔화 흐름의 일관성을 검증하는 지표로 활용됩니다."
        };
    }

    if (text.includes('소매판매') || text.includes('retail sales') || text.includes('소비')) {
        return {
            badgeText: "미국 실물 경제 70% 차지 소비 펀더멘털",
            globalImpact: "미국 GDP의 70%를 차지하는 민간 소비 체력을 검증합니다. 견조한 소매판매는 경기 침체(리세션) 우려를 차단하며 아마존, 월마트 등 유통·소비재 및 S&P500의 든든한 하방 지지선 역할을 합니다.",
            domesticImpact: "미국 소비 활성화는 대미 수출 비중이 절대적인 한국의 완성차(현대차·기아), IT 가전, 스마트폰 부품사 실적 가시성을 높여주어 외국인 및 기관 수급 유입에 긍정적으로 작용합니다.",
            keyTip: "'침체 없는 적당한 둔화(골디락스)' 수치가 금리 부담도 덜고 경기 우려도 낮춰 증시에 가장 이상적입니다."
        };
    }

    if (text.includes('산업생산') || text.includes('제조업') || text.includes('pmi') || text.includes('ism') || text.includes('공장')) {
        return {
            badgeText: "실물 경기 & 공장 가동률 척도",
            globalImpact: "공장 가동률과 실물 제조 역량을 직접 확인하는 지표입니다. 지표 호조 시 경기 확장 국면으로 해석되어 다우존스 전통 산업재(캐터필러, 보잉)와 에너지·소재주가 강세를 보입니다.",
            domesticImpact: "한국은 전형적인 글로벌 중간재 수출국이므로, 글로벌 산업생산 확대는 전력설비(변압기·전선), 중기계, 조선, 화학, 해운 등 한국 인프라·산업재 섹터의 실적 모멘텀으로 직결됩니다.",
            keyTip: "제조업 경기 확장 기준선(보통 50 이상) 유지 여부가 경기순환(시클리컬) 주도주의 주가 향방을 가릅니다."
        };
    }

    if (text.includes('기준금리') || text.includes('fomc') || text.includes('연준') || text.includes('금리') || text.includes('파월')) {
        return {
            badgeText: "글로벌 유동성 & 통화 정책 최고 이벤트",
            globalImpact: "금리 인하 또는 비둘기파(완화적) 기조 확인 시 유동성 공급 기대감으로 기술 성장주와 고밸류에이션 테크주가 전방위 탄력을 받습니다.",
            domesticImpact: "한미 금리차 축소로 원화 환율이 안정세를 찾고 신흥국 증시로의 글로벌 자금 리밸런싱이 일어나 코스피 지수 견인의 결정적 촉매제가 됩니다.",
            keyTip: "금리 결정 수치 자체보다 점도표(Dot Plot)와 파월 연준 의장의 기자회견 발언 뉘앙스가 단기 변동성을 결정합니다."
        };
    }

    if (text.includes('고용') || text.includes('실업률') || text.includes('비농업') || text.includes('nfp') || text.includes('일자리')) {
        return {
            badgeText: "연준 통화 정책의 양대 축 (물가 & 고용)",
            globalImpact: "신규 고용이 적당히 둔화되면 연준의 금리 인하 명분이 강화되어 뉴욕 증시에 훈풍이 불며, 급격한 경기 침체 신호만 아니라면 증시 상승 동력이 됩니다.",
            domesticImpact: "글로벌 긴축 종료 기대감을 키워 한국은행의 기준금리 인하 환경을 조성하고, 국내 내수 및 코스닥 성장주(바이오, 로봇 등)의 투자 심리를 개선합니다.",
            keyTip: "비농업 신규 일자리 수치와 함께 시간당 평균 임금 상승률의 둔화 여부를 필수적으로 체크해야 합니다."
        };
    }

    if (text.includes('gdp') || text.includes('경제성장') || text.includes('성장률')) {
        return {
            badgeText: "국가 경제 총체적 성적표",
            globalImpact: "미국·중국 등 주요국 경제의 견조한 펀더멘털을 확인시켜 주며 기업들의 어닝스(실적) 신뢰도를 높여 지수의 안정적인 추세 상승을 뒷받침합니다.",
            domesticImpact: "글로벌 교역량 확대 기대감을 키워 한국 수출 주도 대형주(반도체, 자동차, 조선 등)의 실적 전망치를 상향시키는 요인이 됩니다.",
            keyTip: "잠재성장률 수준의 안정적 성장세가 유지되는지 확인하는 것이 중요합니다."
        };
    }

    if (text.includes('무역수지') || text.includes('수출입') || text.includes('수출')) {
        return {
            badgeText: "한국 경제 생명선 & 수출 성적표",
            globalImpact: "글로벌 공급망과 주요 교역국 간의 물동량 흐름 및 교역 활력을 확인하는 주요 바로미터입니다.",
            domesticImpact: "무역흑자 유지 시 외환보유액 안정과 원화 강세를 유도하여 외국인 투자자들의 코스피 매수세를 촉진하는 핵심 동력이 됩니다.",
            keyTip: "반도체, 자동차, 선박 등 주력 품목의 대미·대중 수출액 증감률이 코스피 대형주의 향방을 좌우합니다."
        };
    }

    return {
        badgeText: "글로벌 거시 경제 주요 지표",
        globalImpact: "실물 경제 펀더멘털과 글로벌 금리 향방에 영향을 주어 S&P500 및 나스닥 주요 지수의 변동성 지표로 작용합니다.",
        domesticImpact: "달러화 환율 및 글로벌 투자 심리와 연동되어 외국인/기관 수급과 국내 주요 수출 대형주의 단기 수급을 좌우합니다.",
        keyTip: "시장 예상치(컨센서스)와의 괴리율 및 발표 직후 미국 선물 시장의 즉각적인 반응에 주목하세요."
    };
};

interface SectorDeepDive {
    badge: string;
    whyMoneyFlowed: string;
    valueChainAndStocks: string;
    nextWeekCheckpoint: string;
}

const getSectorThemeDeepDive = (tag: string, desc: string = ""): SectorDeepDive => {
    const t = `${tag} ${desc}`.toLowerCase();

    if (t.includes('반도체') || t.includes('ai') || t.includes('hbm') || t.includes('엔비디아') || t.includes('테크')) {
        return {
            badge: "AI 서버 · HBM · 첨단 패키징 밸류체인",
            whyMoneyFlowed: "미국 빅테크 기업들의 AI 데이터센터 설비투자(CapEx)가 꺾이지 않고 계속 확대된다는 점이 확인되면서, AI 가속기에 필수적인 HBM(고대역폭메모리)과 고성능 D램 공급 부족 기대감으로 기관·외국인 자금이 집중되었습니다.",
            valueChainAndStocks: "종합반도체(SK하이닉스, 삼성전자), HBM 열압착 본딩 장비(한미반도체 등), 반도체 테스트 소켓·후공정(OSAT) 및 기판 소부장 기업군",
            nextWeekCheckpoint: "엔비디아·TSMC 등 글로벌 AI 대장주의 주가 추이와 한국 10월 반도체 품목별 수출 데이터, 외국인 선물 수급 동향을 함께 점검하세요."
        };
    }

    if (t.includes('전력') || t.includes('변압기') || t.includes('원전') || t.includes('smr') || t.includes('에너지')) {
        return {
            badge: "AI 데이터센터 전력망 · 초고압 변압기 · SMR",
            whyMoneyFlowed: "AI 데이터센터 한 곳이 중소 도시만큼의 전기를 소비하면서 북미 노후 전력망 교체 수요와 24시간 무탄소 발전원인 원자력(대형원전·SMR) 수주 모멘텀이 동시에 폭발하며 실적주 매수세가 몰렸습니다.",
            valueChainAndStocks: "초고압 변압기·전력기기(HD현대일렉트릭, 효성중공업, LS ELECTRIC), 원전 및 SMR 주기기·터빈(두산에너빌리티), 전선·구리 케이블 기업군",
            nextWeekCheckpoint: "변압기 기업들의 북미 추가 수주 공시 여부와 3분기 영업이익률(OPM)이 시장 예상치를 넘어서는지 확인하세요."
        };
    }

    if (t.includes('바이오') || t.includes('제약') || t.includes('헬스케어') || t.includes('cdmo') || t.includes('신약')) {
        return {
            badge: "바이오 CDMO · 신약 기술수출(L/O) · 헬스케어",
            whyMoneyFlowed: "금리 인하 사이클에서는 미래 성장 가치가 큰 바이오 업종이 가장 큰 수혜를 입습니다. 여기에 글로벌 빅파마와의 기술수출 계약 및 대규모 위탁생산(CDMO) 수주 성과가 더해지며 기관 순환매 자금이 유입되었습니다.",
            valueChainAndStocks: "바이오 의약품 위탁생산(삼성바이오로직스), 바이오시밀러·신약(셀트리온, 유한양행), 비만치료제·ADC 플랫폼(알테오젠, 리가켐바이오 등)",
            nextWeekCheckpoint: "주요 국제 학회 임상 데이터 발표 일정과 국채 금리 안정세 유지 여부를 함께 체크하며 분할 접근하세요."
        };
    }

    if (t.includes('금융') || t.includes('은행') || t.includes('밸류업') || t.includes('배당') || t.includes('통신') || t.includes('지주')) {
        return {
            badge: "코리아 밸류업 · 고배당 · 자사주 소각 수혜",
            whyMoneyFlowed: "증시 변동성이 커질 때 투자자들은 현금을 확실히 벌어들이고 배당과 자사주 소각으로 주주에게 이익을 돌려주는 '밸류업' 우량주로 피신합니다. 연말 배당 시즌이 다가오며 연기금·기관의 방어적 매수세가 유입되었습니다.",
            valueChainAndStocks: "4대 금융지주(KB금융, 신한지주, 하나금융지주, 우리금융지주), 손해보험·증권주, 고배당 통신 3사(SK텔레콤, KT, LG유플러스)",
            nextWeekCheckpoint: "3분기 실적 발표에서 각 금융·통신사가 발표하는 추가 자사주 매입·소각 규모와 분기 배당금 공시를 꼭 확인하세요."
        };
    }

    if (t.includes('방산') || t.includes('항공') || t.includes('조선') || t.includes('해운') || t.includes('우주')) {
        return {
            badge: "K-방산 수출 · 친환경 선박 · MRO 밸류체인",
            whyMoneyFlowed: "글로벌 지정학적 안보 수요 증가와 유럽·중동향 무기체계 추가 수출 계약, 그리고 수년 치 일감(수주잔고)을 이미 확보한 조선·방산 기업들의 확실한 3분기 실적 성장세가 부각되며 자금이 유입되었습니다.",
            valueChainAndStocks: "방위산업 체계종합(한화에어로스페이스, 현대로템, LIG넥스원, 한국항공우주), 대형 조선 및 엔진(HD한국조선해양, 한화오션, 삼성중공업)",
            nextWeekCheckpoint: "해외 후속 수주 본계약 체결 소식과 원/달러 환율 수준에 따른 수출 마진 개선 폭을 점검하세요."
        };
    }

    if (t.includes('2차전지') || t.includes('이차전지') || t.includes('배터리') || t.includes('전기차') || t.includes('자동차') || t.includes('화장품')) {
        return {
            badge: "수출 주력 소비재 · 모빌리티 · 낙폭과대 순환매",
            whyMoneyFlowed: "그동안 주가 조정을 깊게 받았던 낙폭과대 우량주 중에서 북미·유럽·신흥국 수출 회복 시그널이 포착되거나 하이브리드·ESS(에너지저장장치) 등 실적이 뒷받침되는 기업들로 저가 매수세가 유입되었습니다.",
            valueChainAndStocks: "완성차·부품(현대차, 기아), 배터리 셀·소재(LG에너지솔루션, 삼성SDI, 에코프로비엠), K-뷰티 화장품 수출(아모레퍼시픽, 실리콘투, 한국콜마)",
            nextWeekCheckpoint: "단기 반등 시 성급한 추격 매수보다는 3분기 실제 영업이익 회복 여부와 외국인 공매도·수급 커버링을 확인하세요."
        };
    }

    return {
        badge: "기관·외국인 수급 집중 핵심 섹터",
        whyMoneyFlowed: "시장 전체 지수가 등락하는 과정에서도 확실한 실적 성장성과 산업 모멘텀(정부 정책, 글로벌 수주, 수출 호조)이 확인된 주도 업종으로 기관과 외국인의 압축 매수세가 유입되었습니다.",
        valueChainAndStocks: "해당 섹터 내 시가총액 상위 대장주 및 영업이익률이 높은 핵심 부품·소재(소부장) 강소기업군",
        nextWeekCheckpoint: "거래대금이 유지되면서 20일 이동평균선 지지력을 확보하는지, 그리고 기관의 연속 순매수가 이어지는지 확인하세요."
    };
};

interface EconomicTerm {
    term: string;
    keywords: string[];
    easyMeaning: string;
}

const ECONOMIC_TERMS_DICTIONARY: EconomicTerm[] = [
    {
        term: "인플레이션 (Inflation)",
        keywords: ["인플레이션", "물가 상승", "물가상승", "cpi", "pce", "물가지수", "소비자물가"],
        easyMeaning: "물건 가격이 전반적으로 계속 오르고 돈의 가치는 떨어지는 경제 현상입니다."
    },
    {
        term: "생산자물가지수 (PPI)",
        keywords: ["생산자물가", "ppi"],
        easyMeaning: "공장에서 물건을 만들어 도매로 넘길 때의 가격 변화로, 한 달 뒤 소비자물가(CPI)가 오를지 미리 알려주는 선행 지표입니다."
    },
    {
        term: "환차손 (Exchange Loss)",
        keywords: ["환차손"],
        easyMeaning: "환율 변동 때문에 가만히 앉아서 손해를 보는 위험입니다. (예: 외국인이 한국 주식을 샀는데 원화 가치가 떨어지면 달러로 바꿀 때 손실 발생)"
    },
    {
        term: "원/달러 환율",
        keywords: ["원/달러", "환율", "원달러"],
        easyMeaning: "미국 1달러를 사기 위해 우리 돈(원화)을 얼마 줘야 하는지를 나타내는 교환 비율입니다. (환율 안정 = 외국인 매수 유입에 유리)"
    },
    {
        term: "순매수 (Net Buying)",
        keywords: ["순매수", "양매수"],
        easyMeaning: "주식을 판(매도) 금액보다 사들인(매수) 금액이 더 많다는 뜻으로, 시장에 자금이 적극적으로 들어오는 것을 의미합니다."
    },
    {
        term: "설비투자 (CapEx)",
        keywords: ["capex", "설비투자", "데이터센터 투자"],
        easyMeaning: "기업이 미래에 돈을 더 잘 벌기 위해 공장, AI 서버, 데이터센터 같은 장비와 시설에 투자하는 자금입니다."
    },
    {
        term: "HBM (고대역폭메모리)",
        keywords: ["hbm", "고대역폭메모리"],
        easyMeaning: "여러 개의 D램 반도체를 아파트처럼 수직으로 쌓아 올려 데이터 처리 속도를 획기적으로 높인 AI 서버 필수 초고성능 메모리입니다."
    },
    {
        term: "SMR (소형모듈원전)",
        keywords: ["smr", "소형모듈원전", "원전"],
        easyMeaning: "기존 대형 원자력발전소보다 크기를 작게 줄여 공장에서 모듈 형태로 제작해 설치할 수 있는 차세대 안전·친환경 발전소입니다."
    },
    {
        term: "밸류업 & 주주환원 (Value-up)",
        keywords: ["밸류업", "주주환원", "자사주", "배당"],
        easyMeaning: "기업이 벌어들인 이익으로 배당금을 늘리거나 자기 회사 주식을 사서 없애(자사주 소각) 주주들의 주식 가치를 높여주는 정책입니다."
    },
    {
        term: "컨센서스 (Consensus / 시장 예상치)",
        keywords: ["컨센서스", "시장 예상치", "예상치"],
        easyMeaning: "여러 증권사 애널리스트들이 기업 실적이나 경제 지표를 미리 계산해 발표한 '전문가 평균 예상 점수'입니다."
    },
    {
        term: "PER / PBR (주가수익·순자산비율)",
        keywords: ["per", "pbr", "밸류에이션", "저평가"],
        easyMeaning: "회사가 벌어들이는 이익(PER)이나 가진 재산(PBR)에 비해 현재 주가가 몇 배로 거래되는지 보여주는 '주가 가성비' 지표입니다."
    },
    {
        term: "수주잔고 (Order Backlog)",
        keywords: ["수주", "수주잔고"],
        easyMeaning: "기업이 고객사로부터 이미 계약을 따내어 앞으로 만들어 납품하고 돈을 받을 '밀려있는 일감 총액'입니다."
    },
    {
        term: "CDMO (위탁개발생산)",
        keywords: ["cdmo", "위탁생산", "위탁개발생산"],
        easyMeaning: "반도체의 파운드리처럼, 글로벌 제약사가 설계한 바이오 신약을 대신 대량으로 배양·생산해 주는 고수익 바이오 사업입니다."
    },
    {
        term: "순환매 (Sector Rotation)",
        keywords: ["순환매"],
        easyMeaning: "시장 자금이 한 업종에만 머물지 않고 반도체 → 전력기기 → 바이오 → 금융처럼 돌아가며 주가를 끌어올리는 현상입니다."
    },
    {
        term: "하방 지지선 (Support Line)",
        keywords: ["하방 지지선", "하방 경직성", "지지선", "지지력"],
        easyMeaning: "주가가 떨어지더라도 저가 매수세가 들어와 더 이상 쉽게 내려가지 않도록 바닥을 단단히 받쳐주는 가격대입니다."
    },
    {
        term: "신용융자 & 반대매매",
        keywords: ["신용", "반대매매", "투매"],
        easyMeaning: "증권사에서 돈을 빌려 주식을 샀다가 주가가 일정 수준 이하로 떨어지면 증권사가 아침에 강제로 주식을 팔아버리는 것입니다."
    },
    {
        term: "연준 (Fed) & 기준금리",
        keywords: ["연준", "fed", "기준금리", "금리 인하", "국채 금리", "금리"],
        easyMeaning: "미국 중앙은행(Fed)이 결정하는 기준 이자율입니다. 금리가 안정되거나 내려가면 주식시장으로 돈이 유입되기 쉬워집니다."
    },
    {
        term: "소부장 (소재·부품·장비)",
        keywords: ["소부장", "후공정", "밸류체인"],
        easyMeaning: "삼성전자나 SK하이닉스 같은 대기업이 최종 제품을 만들 때 꼭 필요한 핵심 소재, 부품, 장비를 공급하는 알짜 협력 기업들입니다."
    }
];

const getRelevantEconomicTerms = (text: string, maxCount: number = 4): EconomicTerm[] => {
    if (!text) return [];
    const lower = text.toLowerCase();
    const matched: EconomicTerm[] = [];

    for (const item of ECONOMIC_TERMS_DICTIONARY) {
        if (item.keywords.some(k => lower.includes(k.toLowerCase()))) {
            matched.push(item);
            if (matched.length >= maxCount) break;
        }
    }
    return matched;
};

const SUMMARY_BADGES = [
    { label: "🇰🇷 국내 증시 & 수급", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    { label: "🇺🇸 글로벌 증시 & 금리·환율", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
    { label: "📑 증권사 리서치 컨센서스", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
    { label: "🎯 차주 핵심 관전 포인트", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
];

export default function WeekendReportPage() {
    const { user } = useAuth();
    const [data, setData] = useState<ReportResponse>(FALLBACK_WEEKEND_REPORT);
    const [copied, setCopied] = useState(false);
    const [selectedResearchCat, setSelectedResearchCat] = useState<string>("ALL");

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/weekend-report?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then((resData: ReportResponse) => {
                if (resData && resData.report) {
                    setData({ ...resData, is_open: true });
                }
            })
            .catch(err => {
                console.error("Failed to fetch weekend report", err);
            });
    }, []);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: '주말 마켓 인사이트 & 증권사 리서치 브리핑',
                text: '이번 주 시장 핵심 팩트, 주요 증권사 리서치 요약과 다음 주 경제 일정을 확인하세요!',
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

    // Helper to parse section content into rich cards (both Hot Sectors and Macro Calendar)
    const renderParsedContent = (content: string) => {
        if (!content) return null;
        const lines = content.split('\n').filter(l => l.trim().length > 0);

        return (
            <div className="space-y-5">
                {lines.map((line, idx) => {
                    const cleanLine = line.replace(/^[•\-\*·]\s*/, '').trim();
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
                        const sectorDive = !isDate ? getSectorThemeDeepDive(tag, desc) : null;

                        const combinedText = isDate
                            ? `${eventTitle} ${eventNote || ''} ${impact?.globalImpact || ''} ${impact?.domesticImpact || ''} ${impact?.keyTip || ''}`
                            : `${tag} ${desc} ${sectorDive?.whyMoneyFlowed || ''} ${sectorDive?.valueChainAndStocks || ''}`;
                        const detectedTerms = getRelevantEconomicTerms(combinedText, isDate ? 4 : 3);

                        return (
                            <div 
                                key={idx} 
                                className={`relative p-5 sm:p-6 rounded-2xl transition-all border-l-4 shadow-md ${
                                    isDate 
                                        ? 'bg-gradient-to-r from-blue-950/30 via-zinc-900/40 to-transparent border-blue-400 hover:from-blue-950/50' 
                                        : 'bg-gradient-to-r from-amber-950/30 via-zinc-900/40 to-transparent border-amber-400 hover:from-amber-950/50'
                                }`}
                            >
                                <div className="flex flex-wrap items-center gap-2.5 mb-3">
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
                                    {!isDate && sectorDive?.badge && (
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-200">
                                            {sectorDive.badge}
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

                                        {impact && (
                                            <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-3">
                                                <div className="flex items-center gap-2 text-xs font-black text-zinc-300">
                                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                                    <span>이 일정이 증시에 미치는 파급효과 & 데이터 관찰 포인트</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/40 to-indigo-950/20 border border-blue-500/20 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs font-black text-blue-300">
                                                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                                                            <span>🇺🇸 해외(미국) 증시 파급 경로</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                                                            {impact.globalImpact}
                                                        </p>
                                                    </div>

                                                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-teal-950/20 border border-emerald-500/20 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
                                                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                                            <span>🇰🇷 국내(한국) 증시 파급 경로</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                                                            {impact.domesticImpact}
                                                        </p>
                                                    </div>
                                                </div>

                                                {impact.keyTip && (
                                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200/90 leading-relaxed">
                                                        <span className="font-black text-amber-400 shrink-0">🔍 핵심 데이터 관찰 팁:</span>
                                                        <span>{impact.keyTip}</span>
                                                    </div>
                                                )}

                                                {detectedTerms.length > 0 && (
                                                    <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                                            <span>📖 1분 쏙쏙! 이번 일정 핵심 경제 용어 풀이</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {detectedTerms.map((term, tIdx) => (
                                                                <div 
                                                                    key={tIdx} 
                                                                    className="p-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 transition-colors flex flex-col gap-1 text-left shadow-sm"
                                                                >
                                                                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                                                        <span>{term.term}</span>
                                                                    </div>
                                                                    <p className="text-[11px] text-zinc-300 leading-relaxed font-normal pl-3">
                                                                        {term.easyMeaning}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* SECTION 02: 최근 자금 쏠림 테마 복기 — 심층 해설 카드 */
                                    <div className="space-y-3.5 pl-0.5">
                                        <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-medium">
                                            <HighlightText text={desc} />
                                        </p>

                                        {sectorDive && (
                                            <div className="mt-3 pt-3.5 border-t border-white/10 space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/35 to-zinc-900/60 border border-amber-500/20 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                                                            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                                                            <span>💰 왜 이 테마로 자금이 몰렸을까?</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                                                            {sectorDive.whyMoneyFlowed}
                                                        </p>
                                                    </div>

                                                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/35 to-zinc-900/60 border border-emerald-500/20 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
                                                            <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                                            <span>🏢 핵심 밸류체인 & 대표 종목군</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                                                            {sectorDive.valueChainAndStocks}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2 text-xs text-blue-200/90 leading-relaxed">
                                                    <span className="font-black text-blue-400 shrink-0">🔍 차주 수급·지표 관찰 포인트:</span>
                                                    <span>{sectorDive.nextWeekCheckpoint}</span>
                                                </div>

                                                {detectedTerms.length > 0 && (
                                                    <div className="pt-2.5 border-t border-white/5 space-y-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                                            <span>📖 초보자를 위한 테마 핵심 용어 풀이</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {detectedTerms.map((t, tIdx) => (
                                                                <div key={tIdx} className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 flex flex-col gap-1">
                                                                    <span className="text-xs font-black text-amber-300">• {t.term}</span>
                                                                    <span className="text-[11px] text-zinc-300 leading-relaxed pl-2.5">{t.easyMeaning}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
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

    const report = data?.report || FALLBACK_WEEKEND_REPORT.report!;

    const summaryCombinedText = (report?.week_summary_bullets || []).join(" ");
    const summaryTerms = getRelevantEconomicTerms(summaryCombinedText, 4);

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
                            : "주간 글로벌 매크로 & 수급 복기 브리핑"}
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
                                    {(data as any)?.is_current_weekend ? "WEEKEND EDITION" : "WEEKLY MACRO EDITION"}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl lg:text-[28px] font-black text-white tracking-tight leading-snug">
                                {report?.title || "주말 마켓 인사이트: 지난주 시장 수급 복기와 다음 주 거시경제 일정"}
                            </h1>
                            <p className="text-sm text-zinc-300 mt-1 font-medium">
                                한 주간 시장 전체의 큰 흐름(지수·환율·금리·테마 수급)과 다음 주 주요 경제 캘린더를 복기합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="space-y-10">
                {/* SECTION 01. 1분 마켓 핵심 서머리 Executive Bento */}
                <section className="relative bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-zinc-950 border border-emerald-500/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden space-y-6">
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

                    {/* 주간 핵심 마켓 펄스 요약 배지 바 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">🇰🇷 국내 수급 흐름</span>
                            <span className="text-xs sm:text-sm font-black text-white">기관 순매수 · 하방 지지력</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-blue-400 uppercase">🇺🇸 글로벌 모멘텀</span>
                            <span className="text-xs sm:text-sm font-black text-white">AI 설비투자(CapEx) 지속</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-purple-400 uppercase">📊 시장 밸류에이션</span>
                            <span className="text-xs sm:text-sm font-black text-white">실적·수급 펀더멘털 중심</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-amber-400 uppercase">🎯 주목 밸류체인</span>
                            <span className="text-xs sm:text-sm font-black text-white">AI반도체 · 전력/원전 · 밸류업</span>
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        {report?.week_summary_bullets?.map((rawBullet, idx) => {
                            const cleaned = rawBullet.replace(/^[•\-\*·]\s*/, '').trim();
                            const bracketMatch = cleaned.match(/^\[([^\]]+)\]\s*(.*)$/);
                            const customTag = bracketMatch ? bracketMatch[1] : null;
                            const bodyText = bracketMatch ? bracketMatch[2] : cleaned;
                            const badgeMeta = SUMMARY_BADGES[idx % SUMMARY_BADGES.length];

                            return (
                                <div 
                                    key={idx} 
                                    className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all"
                                >
                                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-black flex items-center justify-center text-xs font-black font-mono shrink-0 mt-0.5 shadow-md">
                                        {idx + 1}
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${badgeMeta.color}`}>
                                                {customTag || badgeMeta.label}
                                            </span>
                                        </div>
                                        <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-normal">
                                            <HighlightText text={bodyText} />
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* SECTION 01 하단 자동 용어 해설 */}
                    {summaryTerms.length > 0 && (
                        <div className="pt-4 border-t border-white/10 space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                                <BookOpen className="w-4 h-4 text-emerald-400" />
                                <span>📖 1분 쏙쏙! 서머리 속 어려운 금융·경제 용어 자동 풀이</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {summaryTerms.map((term, tIdx) => (
                                    <div 
                                        key={tIdx} 
                                        className="p-3 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 transition-colors flex flex-col gap-1"
                                    >
                                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                            <span>{term.term}</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-300 leading-relaxed pl-3">
                                            {term.easyMeaning}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* SECTION 02. 최근 자금 쏠림 테마 복기 */}
                {report?.sections?.[0] && (
                    <section className="relative rounded-3xl p-6 md:p-7 shadow-2xl border bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-950 border-amber-500/30 hover:border-amber-500/50 overflow-hidden">
                        <div className="space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl p-2 bg-zinc-900/90 rounded-2xl border border-white/10 shadow-sm">
                                        {report.sections[0].emoji || "🔥"}
                                    </span>
                                    <div>
                                        <span className="text-[10px] font-mono font-bold tracking-wider block uppercase text-amber-400">
                                            SECTION 02 · SECTOR THEMES & VALUE-CHAIN
                                        </span>
                                        <h3 className="text-base md:text-lg font-black text-white">
                                            {report.sections[0].title}
                                        </h3>
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full self-start sm:self-auto">
                                    수급 배경 · 핵심 밸류체인 · 차주 관찰 포인트 포함
                                </span>
                            </div>

                            {renderParsedContent(report.sections[0].content)}
                        </div>
                    </section>
                )}

                {/* SECTION 03. 주간 글로벌 매크로 온도계 & 수급·환율·금리 3대 관찰 포인트 (리서치 센터와 100% 역할 분리!) */}
                <section className="relative rounded-3xl p-6 md:p-8 shadow-2xl border bg-gradient-to-br from-purple-950/25 via-zinc-950 to-zinc-950 border-purple-500/35 overflow-hidden space-y-6">
                    <div className="absolute -top-10 -right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-gradient-to-br from-purple-500/25 to-indigo-600/15 border border-purple-500/40 rounded-2xl text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                <Target className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono font-bold text-purple-400 tracking-widest uppercase">
                                        SECTION 03 · WEEKLY MACRO & FLOW PLAYBOOK
                                    </span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                                        시장 전체 숲(Macro) 점검
                                    </span>
                                </div>
                                <h2 className="text-lg md:text-xl font-black text-white mt-0.5">
                                    차주 시장을 움직일 3대 매크로 변수 (환율 · 금리 · 수출/실적)
                                </h2>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    개별 종목을 보기 전에 반드시 먼저 확인해야 할 시장 전체의 자금 물줄기 3가지입니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/35 to-zinc-900/60 border border-purple-500/25 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    변수 01 · 외국인 수급 나침반
                                </span>
                                <span className="text-lg">💱</span>
                            </div>
                            <h4 className="text-base font-black text-white">
                                원/달러 환율 & 외국인 선물 수급
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                외국인 투자자 입장에서 원/달러 환율이 급등(원화 약세)하면 가만히 있어도 환차손이 발생하기 때문에 코스피200 선물과 대형주를 기계적으로 매도하는 경향이 있습니다. 반대로 환율 상승세가 진정되면 반도체·자동차 등 시가총액 상위주로 외국인 패시브 자금이 가장 먼저 복귀합니다.
                            </p>
                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-purple-200">
                                <strong className="text-purple-400">🔍 관찰 지표:</strong> 장중 원/달러 환율의 고점 돌파 여부 및 외국인 코스피200 선물 순매수 전환 시점
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/35 to-zinc-900/60 border border-blue-500/25 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    변수 02 · 기술주 밸류에이션 기준
                                </span>
                                <span className="text-lg">🏦</span>
                            </div>
                            <h4 className="text-base font-black text-white">
                                미국 10년물 국채금리 & 빅테크 CapEx
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                미국 10년물 국채 금리는 전 세계 위험자산의 ‘할인율(이자 부담)’ 역할을 합니다. 국채 금리가 안정세를 유지하고 미국 빅테크(엔비디아·MS·구글 등)의 AI 데이터센터 설비투자(CapEx) 지출이 유지될수록 국내 HBM 반도체 및 초고압 전력기기 밸류체인의 실적 가시성이 높아집니다.
                            </p>
                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-blue-200">
                                <strong className="text-blue-400">🔍 관찰 지표:</strong> 미국 10년물 국채 금리 추이 및 필라델피아 반도체 지수(SOX) 동조화 여부
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/35 to-zinc-900/60 border border-emerald-500/25 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    변수 03 · 펀더멘털 성적표 검증
                                </span>
                                <span className="text-lg">📦</span>
                            </div>
                            <h4 className="text-base font-black text-white">
                                관세청 수출 잠정치 & 실적 컨센서스
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                매월 11일·21일 발표되는 관세청 수출입 잠정치는 기업들의 분기 실적이 발표되기 전에 실제 해외 판매량을 가장 먼저 알려주는 선행 성적표입니다. 반도체, 변압기, 선박, 바이오(CDMO), 화장품 등 핵심 품목의 전년 동기 대비 수출 증가율이 유지되는지 비교합니다.
                            </p>
                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-emerald-200">
                                <strong className="text-emerald-400">🔍 관찰 지표:</strong> 품목별 수출 증가율(YoY) 및 일회성 비용을 제외한 본업 영업이익률(OPM) 추이
                            </div>
                        </div>
                    </div>

                    {/* 전용 리서치 센터(/research) 바로가기 브릿지 배너 */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/50 to-zinc-900 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                                    📑 종목별·자산군별 상세 리포트는 전용 메뉴에서!
                                </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-black text-white">
                                국내 종목별 리포트 · 미국 해외주식 · ETF · 선물/원자재 리서치를 찾으시나요?
                            </h3>
                            <p className="text-xs text-zinc-300">
                                주말 마켓 인사이트는 ‘주간 시장 전체 흐름과 경제 일정’에 집중하며, 개별 기업(두산에너빌리티·대한항공·엔비디아 등)과 ETF·선물 리서치는 전용 리서치 센터에서 실시간으로 제공합니다.
                            </p>
                        </div>
                        <Link
                            href="/research"
                            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-black shadow-lg transition-all"
                        >
                            <FileText className="w-4 h-4" />
                            <span>통합 리서치 센터 바로가기</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </section>

                {/* SECTION 04. 이번 주 / 다음 주 놓치면 안 될 경제 일정 */}
                {report?.sections?.[1] && (
                    <section className="relative rounded-3xl p-6 md:p-7 shadow-2xl border bg-gradient-to-br from-blue-950/20 via-zinc-950 to-zinc-950 border-blue-500/30 hover:border-blue-500/50 overflow-hidden">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl p-2 bg-zinc-900/90 rounded-2xl border border-white/10 shadow-sm">
                                        {report.sections[1].emoji || "📅"}
                                    </span>
                                    <div>
                                        <span className="text-[10px] font-mono font-bold tracking-wider block uppercase text-blue-400">
                                            SECTION 04 · MACRO CALENDAR
                                        </span>
                                        <h3 className="text-base md:text-lg font-black text-white">
                                            {report.sections[1].title}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            {!user ? (
                                <div className="space-y-4">
                                    {renderParsedContent(report.sections[1].content.split('\n').slice(0, 2).join('\n'))}
                                    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/40 via-zinc-900/90 to-zinc-950 border border-blue-500/30 text-center space-y-3 shadow-xl">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-black">
                                            <Lock className="w-3.5 h-3.5" /> 회원 전용 차주 중·후반 거시경제 일정 해설
                                        </div>
                                        <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
                                            수요일~금요일 핵심 거시경제 이벤트(CPI·금통위·옵션만기 등) 발표 시점별 국내·해외 증시 파급 경로와 경제 용어 해설은 회원 로그인 후 전체 열람하실 수 있습니다.
                                        </p>
                                        <Link
                                            href="/login"
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg transition-all"
                                        >
                                            🔐 무료 로그인하고 차주 전체 일정 & 파급효과 보기
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                renderParsedContent(report.sections[1].content)
                            )}
                        </div>
                    </section>
                )}

                {/* Kakao AdFit In-Feed Banner */}
                <KakaoRevenueAd type="feed" />

                {/* 액션 버튼 */}
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

                {/* 자본시장법 준수 법적 면책 안내 */}
                <div className="p-6 bg-zinc-950/90 border border-white/5 rounded-3xl text-xs text-gray-300 space-y-2">
                    <p className="font-bold text-amber-400 flex items-center gap-2 text-xs md:text-sm">
                        <ShieldCheck className="w-4 h-4 text-amber-400" /> 투자 정보 법적 고지 및 면책 안내
                    </p>
                    <p className="leading-relaxed text-gray-400 text-xs md:text-[13px]">
                        {report?.disclaimer || "본 주말 마켓 인사이트 리포트는 과거 데이터와 주요 증권사 공개 리서치 요약, 예정된 경제 일정 등 객관적 사실만을 요약한 단순 정보 제공용 자료이며, 특정 종목에 대한 투자 권유나 개별 자문을 수행하지 않습니다. 투자의 최종 책임은 투자자 본인에게 있습니다."}
                    </p>
                </div>
            </main>
            <SeoContentBlock
                pageTitle="주간 마켓 인사이트, 주요 증권사 리서치 요약 & 차주 거시경제 캘린더 리포트"
                pageDescription="한 주간의 코스피·코스닥 및 뉴욕 증시 핵심 수급 팩트 요약, 국내 주요 증권사 애널리스트 리서치 브리핑과 다음 주 주요 경제 일정(CPI, FOMC, 고용지표, 수출입 통계) 및 섹터별 밸류체인 분석을 제공합니다."
            />
        </div>
    );
}
