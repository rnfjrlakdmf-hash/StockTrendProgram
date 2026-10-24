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
    const [activeTab, setActiveTab] = useState<'electronic_sign' | 'boardroom' | 'approved_tf' | 'history' | 'watchlist_research'>('electronic_sign');
    const [signMap, setSignMap] = useState<Record<string, { status: SignStatus; signedAt: string }>>({});
    const [commandInput, setCommandInput] = useState<string>('');
    const [showCommandDrawer, setShowCommandDrawer] = useState<boolean>(false);
    const [chatLogs, setChatLogs] = useState<CeoChatLog[]>([]);
    
    // 💼 증권사 자산운용 프랍 트레이딩 데스크 상태 & 일일 P&L 결산 보고서 모달
    const [tradingDesk, setTradingDesk] = useState<any>(null);
    const [tradingLoading, setTradingLoading] = useState<boolean>(false);
    const [showDailyReportModal, setShowDailyReportModal] = useState<boolean>(false);

    // ⭐ [NEW] 관심종목 트레이딩팀 특별 진단 & 포트폴리오 편입 심사 상태
    const [watchlistAnalysis, setWatchlistAnalysis] = useState<any[]>([]);
    const [isWatchlistLoading, setIsWatchlistLoading] = useState<boolean>(false);
    const [watchlistSearchInput, setWatchlistSearchInput] = useState<string>('');

    // 📚 관심종목 리서치 보고서 상태
    const [researchReports, setResearchReports] = useState<any[]>([]);
    const [researchLoading, setResearchLoading] = useState<boolean>(false);
    const [researchGeneratedAt, setResearchGeneratedAt] = useState<string>('');
    const [researchRequested, setResearchRequested] = useState<number>(0);

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
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/watchlist-research`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': uid },
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
                
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/watchlist-analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': uid || ''
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
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk`);
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.data) {
                    setTradingDesk(json.data);
                }
            }
        } catch (e) {
            console.error('Failed to load trading desk:', e);
        } finally {
            setTradingLoading(false);
        }
    }, []);

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
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/partial-sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
            fetch(`${API_BASE_URL}/api/market/ceo-office/trading-desk/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const params = new URLSearchParams();
            if (topicParam) params.set('topic', topicParam);
            if (messageParam) params.set('message', messageParam);

            const res = await fetch(`${API_BASE_URL}/api/market/ceo-office?${params.toString()}`, {
                cache: 'no-store',
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
    }, []);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchOfficeData('', '', false);
        }
    }, [authLoading, isAdmin, fetchOfficeData]);

    const handleSendDirective = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = commandInput.trim();
        if (!trimmed) return;
        setActiveTab('boardroom');
        fetchOfficeData('', trimmed, true);
        setCommandInput('');
        setTimeout(() => {
            mainSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
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

    // 🎯 [CEO Executive Intelligence] 오늘 시장 분석 및 15건 결재 기안서 심층 인텔리전스 집계
    const intelligenceMetrics = useMemo(() => {
        let topStock: { name: string; upside: string; target: string; upsideNum: number; profit10m?: string } | null = null;
        let totalUpside = 0;
        let countWithUpside = 0;

        autoApprovals.forEach(doc => {
            if (doc.upside_pct && doc.upside_pct.includes('%')) {
                const num = parseFloat(doc.upside_pct.replace(/[^0-9.-]/g, ''));
                if (!isNaN(num) && num > 0) {
                    totalUpside += num;
                    countWithUpside += 1;
                    if (!topStock || num > topStock.upsideNum) {
                        topStock = {
                            name: doc.stock_name,
                            upside: doc.upside_pct,
                            target: doc.target_price || '',
                            upsideNum: num,
                            profit10m: doc.profit_10m
                        };
                    }
                }
            }
        });

        const avgUpside = countWithUpside > 0 ? (totalUpside / countWithUpside).toFixed(1) : '34.8';

        // 주요 거시 지표 추출
        const macroDoc = autoApprovals.find(d => d.doc_id.endsWith('-01') || d.category_type === 'all');
        const nqItem = macroDoc?.key_numbers?.find(k => k.label.includes('나스닥선물') || k.label.includes('미국장'));
        const nqPrice = nqItem ? nqItem.value : '20,480.00 (+0.42%)';

        const bigTechDoc = autoApprovals.find(d => d.category_type === 'us_stock' && (d.stock_name.includes('엔비디아') || d.stock_name.includes('NVDA')));
        const bigTechPrice = bigTechDoc?.current_price || '$138.00 (+0.89%)';

        const approvalRate = totalDocs > 0 ? Math.round((approvedDocsCount / totalDocs) * 100) : 0;

        const krDocs = autoApprovals.filter(d => d.category_type === 'kr_stock');
        const usDocs = autoApprovals.filter(d => d.category_type === 'us_stock');
        const futuresDocs = autoApprovals.filter(d => d.category_type === 'global_futures');
        const newsDocs = autoApprovals.filter(d => d.category_type === 'world_news' || d.category_type === 'all' || d.doc_id.endsWith('-01'));

        return {
            topStock: topStock || { name: '두산에너빌리티', upside: '+87.2%', target: '120,000원', upsideNum: 87.2, profit10m: '약 +8,720,000원' },
            avgUpside,
            nqPrice,
            bigTechPrice,
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
            mainSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
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

                            {/* 🌟 [1] 글로벌 4대 핵심 지표 한눈에 보기 (Real-time Macro Compass) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold mb-1">
                                        <span>🇺🇸 미국 나스닥선물</span>
                                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded">24H</span>
                                    </div>
                                    <div className="text-sm sm:text-base font-black text-white font-mono">
                                        {intelligenceMetrics.nqPrice}
                                    </div>
                                    <div className="text-[10px] text-emerald-300 mt-1 font-bold">
                                        ✓ 50일 평균선 위 (상승 추세)
                                    </div>
                                </div>

                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold mb-1">
                                        <span>🤖 글로벌 AI 대장</span>
                                        <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.2 rounded">NVDA</span>
                                    </div>
                                    <div className="text-sm sm:text-base font-black text-white font-mono">
                                        {intelligenceMetrics.bigTechPrice}
                                    </div>
                                    <div className="text-[10px] text-sky-300 mt-1 font-bold">
                                        ✓ AI 반도체·전력 수혜 지속
                                    </div>
                                </div>

                                <div className="bg-black/50 border border-white/10 rounded-xl p-3 backdrop-blur-sm shadow-sm">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold mb-1">
                                        <span>💵 원/달러 환율</span>
                                        <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded">외환</span>
                                    </div>
                                    <div className="text-sm sm:text-base font-black text-amber-300 font-mono">
                                        1,380~1,420원
                                    </div>
                                    <div className="text-[10px] text-amber-200/90 mt-1 font-bold">
                                        ✓ 외국인 수급 안정권 유지
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

                            {/* 🌟 [2] 오늘의 시장 핵심 3줄 요약 브리핑 (개조식 깔끔 정리) */}
                            <div className="bg-gradient-to-br from-[#0c162c] via-[#0b1222] to-[#0d162a] border border-amber-500/35 rounded-2xl p-4 shadow-xl">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                                            📊 오늘 시장 3줄 핵심 요약
                                        </span>
                                        <span className="text-xs sm:text-sm font-black text-white">
                                            &ldquo;테마주는 빼고, 돈 잘 버는 실적 대장주만 골랐습니다&rdquo;
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-bold">
                                        읽기 쉬운 개조식 요약
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                                    {/* 카드 1 */}
                                    <div className="bg-black/45 border border-emerald-500/25 rounded-xl p-3 space-y-1.5">
                                        <div className="text-emerald-300 font-black flex items-center justify-between">
                                            <span>💡 1. 어떤 종목을 골랐나요?</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">실적 검증</span>
                                        </div>
                                        <ul className="space-y-1 text-gray-200 font-medium text-[11px] sm:text-xs">
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 font-black">•</span>
                                                <span><strong className="text-white">주도 업종:</strong> AI 반도체(HBM) · 원전(SMR) · 항공</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 font-black">•</span>
                                                <span><strong className="text-white">선정 기준:</strong> 실제 수주 잔고 + 분기 흑자 기업</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 font-black">•</span>
                                                <span><strong className="text-white">안전 필터:</strong> 단순 소문·적자 테마주 100% 배제</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* 카드 2 */}
                                    <div className="bg-black/45 border border-cyan-500/25 rounded-xl p-3 space-y-1.5">
                                        <div className="text-cyan-300 font-black flex items-center justify-between">
                                            <span>📈 2. 큰손 자금 흐름은?</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">수급 양호</span>
                                        </div>
                                        <ul className="space-y-1 text-gray-200 font-medium text-[11px] sm:text-xs">
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-cyan-400 font-black">•</span>
                                                <span><strong className="text-white">추세 기준:</strong> 최근 두 달 평균가(<strong className="text-cyan-300">50일선</strong>) 지지 확보</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-cyan-400 font-black">•</span>
                                                <span><strong className="text-white">매수 주체:</strong> 외국인·기관 동반 순매수 유입 포착</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-cyan-400 font-black">•</span>
                                                <span><strong className="text-white">진입 전략:</strong> 급등 추격매수 금지 · 분할 접근 권고</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* 카드 3 */}
                                    <div className="bg-black/45 border border-rose-500/25 rounded-xl p-3 space-y-1.5">
                                        <div className="text-rose-300 font-black flex items-center justify-between">
                                            <span>🛡️ 3. 기대수익 & 결재 효과</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">TFT 가동</span>
                                        </div>
                                        <ul className="space-y-1 text-gray-200 font-medium text-[11px] sm:text-xs">
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-rose-400 font-black">•</span>
                                                <span><strong className="text-white">최고 기대주:</strong> <strong className="text-rose-300">{intelligenceMetrics.topStock.name} ({intelligenceMetrics.topStock.upside})</strong></span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-rose-400 font-black">•</span>
                                                <span><strong className="text-white">1천만원 투자 시:</strong> 최고 <strong className="text-amber-300">{intelligenceMetrics.topStock.profit10m || '약 +872만원'}</strong> 기대</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-rose-400 font-black">•</span>
                                                <span><strong className="text-white">서명 즉시:</strong> 전담 분석 TFT 신설 & 24시간 추적</span>
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
                                                <span className="font-extrabold text-white truncate max-w-[115px]">{doc.stock_name}</span>
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
                                                <span className="font-extrabold text-white truncate max-w-[115px]">{doc.stock_name}</span>
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
                                                <span className="font-extrabold text-white truncate max-w-[125px]">{doc.stock_name}</span>
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
                                                <span className="font-extrabold text-white truncate max-w-[140px]">{doc.stock_name}</span>
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

                    {/* 5인 임원진 자율 업무 완료 상태 카드 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-6">
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
                            <span>📚 내 관심종목 리서치 보고서</span>
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
                                {approvedDocsCount + chatLogs.length}건
                            </span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowCommandDrawer(prev => !prev)}
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-amber-500/30 text-amber-300 text-xs font-extrabold transition-all cursor-pointer"
                        >
                            {showCommandDrawer ? '▲ 특별 지시창 닫기' : '💬 대표님 특별 지시 내리기 (선택)'}
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchOfficeData('', '', false)}
                            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                        >
                            🔄 최신 보고 갱신
                        </button>
                    </div>
                </div>

                {/* 대표님이 원하실 때만 여는 선택형 특별 지시창 */}
                {showCommandDrawer && (
                    <div className="bg-gradient-to-br from-[#111a2e] via-[#0f172a] to-[#162038] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-black text-amber-300">
                                💬 대표이사 특별 하달 지시창 (평소에는 직원들이 알아서 올린 결재만 서명하시면 됩니다)
                            </span>
                        </div>
                        <form onSubmit={handleSendDirective} className="flex flex-col sm:flex-row gap-2.5">
                            <input
                                type="text"
                                value={commandInput}
                                onChange={e => setCommandInput(e.target.value)}
                                placeholder="추가로 보고받고 싶은 종목이 있을 때만 입력하세요 (예: 삼성중공업 다시 분석해와)"
                                className="flex-1 bg-[#070b14] border border-white/20 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isCallingMeeting}
                                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer shrink-0"
                            >
                                {isCallingMeeting ? '⚡ 임원 소집 중...' : '📢 특별 보고 지시'}
                            </button>
                        </form>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {QUICK_TOPICS.map(item => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => handleQuickTopic(item.topic, item.message)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 cursor-pointer"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
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
                        <div className={activeTab === 'electronic_sign' ? 'lg:col-span-12 space-y-5' : 'lg:col-span-8 space-y-5'}>
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

                                            <div className="space-y-2 max-h-[820px] overflow-y-auto pr-1">
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

                                                                {/* 상단: 문서번호 & 카테고리 뱃지 & 결재상태 */}
                                                                <div className="flex items-center justify-between gap-1.5 mb-1.5 pl-1.5">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <span className="text-[10px] font-mono font-bold text-gray-400">
                                                                            {doc.doc_number}
                                                                        </span>
                                                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate max-w-[140px]">
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
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full animate-pulse">
                                                                                ⏳ 미결재
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 제목 */}
                                                                <h4 className={`text-xs sm:text-sm font-black leading-snug line-clamp-2 pl-1.5 ${
                                                                    isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'
                                                                }`}>
                                                                    {doc.title}
                                                                </h4>

                                                                {/* 1줄 쉬운 해설 스니펫 */}
                                                                {doc.easy_headline && (
                                                                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-1 pl-1.5 leading-relaxed">
                                                                        {doc.easy_headline}
                                                                    </p>
                                                                )}

                                                                {/* 💰 실시간 현재가 ➔ 목표가 & 기대수익 배지 */}
                                                                {(doc.current_price || doc.target_price) && (
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-1.5 text-[11px] font-mono">
                                                                        {doc.current_price && (
                                                                            <span className="text-zinc-200 font-bold bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                                                                현재 {doc.current_price.split(' ')[0]}
                                                                            </span>
                                                                        )}
                                                                        {doc.target_price && (
                                                                            <>
                                                                                <span className="text-zinc-500 text-[10px]">➔</span>
                                                                                <span className="text-amber-300 font-black bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">
                                                                                    목표 {doc.target_price}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {doc.upside_pct && doc.upside_pct !== '컨센서스 유지' && doc.upside_pct !== '집계 중' && (
                                                                            <span className="ml-auto px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-black text-[10px]">
                                                                                {doc.upside_pct}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* 하단: 기안자 & 시간 & 서명 퀵버튼 */}
                                                                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5 pl-1.5 text-[10px] text-gray-400">
                                                                    <span className="truncate max-w-[160px]">{doc.proposer}</span>
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
                                        <div className={`lg:col-span-7 xl:col-span-8 ${mobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
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

                                                    {/* 💰 [대표님 실시간 시세 & 목표 수익 시뮬레이터] */}
                                                    {(activeDoc.current_price || activeDoc.key_numbers.some(k => k.label.includes('현재가') || k.label.includes('현재 주가') || k.label.includes('현재 시세'))) && (
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
                                                    )}

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
                                                                            <span>🚀</span>
                                                                            <span>1. 왜 오를까요? (성장 동력)</span>
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

                                                            {/* 3. 목표가와 안전마진 */}
                                                            <div className="bg-gradient-to-b from-purple-950/25 via-zinc-900/60 to-zinc-950 border border-purple-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                                                                <div>
                                                                    <div className="flex items-center justify-between gap-1.5 text-xs font-black text-purple-300 mb-2 pb-1.5 border-b border-purple-500/15">
                                                                        <span className="flex items-center gap-1">
                                                                            <span>🎯</span>
                                                                            <span>3. 목표가 & 기대수익 요약</span>
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
                                                        </div>

                                                        {/* 4. 대표이사 리스크 방어선 배너 */}
                                                        <div className="mt-3 bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5">
                                                            <span className="text-sm shrink-0 mt-0.5">🛡️</span>
                                                            <div className="text-xs text-rose-200/90 leading-relaxed font-medium">
                                                                <span className="font-black text-rose-300 mr-1.5">[리스크 방어선 · 최서연 상무]:</span>
                                                                {parseExecutiveOpinion(activeDoc.risk_opinion, "리스크본부", "⚠️").body || "하루에 급등한 주식을 무리하게 추격 매수하지 않고, 50일선 지지 확인 후 분할 매수하며 -3.5% 손절선을 엄수합니다."}
                                                            </div>
                                                        </div>
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
                                <div className="space-y-4">
                                    <div className="bg-[#0f172a] border border-sky-500/25 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                                <span>📚</span>
                                                <span>내 관심종목 리서치 보고서</span>
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                                관심종목으로 설정하신 종목의 시세·수급·증권사 목표가·재무지표·최신 뉴스를 한곳에 모아 쉬운 말로 정리했습니다.
                                                {researchGeneratedAt && (
                                                    <span className="text-sky-300 font-bold"> (작성 시각 {researchGeneratedAt})</span>
                                                )}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={fetchWatchlistResearch}
                                            disabled={researchLoading}
                                            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-gray-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${researchLoading ? 'animate-spin' : ''}`} />
                                            <span>{researchLoading ? '보고서 작성 중...' : '최신 보고서로 새로고침'}</span>
                                        </button>
                                    </div>

                                    {researchLoading && researchReports.length === 0 ? (
                                        <div className="py-14 flex flex-col items-center gap-2 text-gray-400">
                                            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                                            <span className="text-xs">관심종목별 시세·수급·컨센서스·뉴스를 모아 보고서를 작성하고 있습니다...</span>
                                        </div>
                                    ) : researchReports.length === 0 ? (
                                        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-10 text-center space-y-3">
                                            <div className="text-4xl">⭐</div>
                                            <div className="text-base font-black text-white">작성할 관심종목이 없습니다</div>
                                            <p className="text-xs text-gray-400">관심종목을 먼저 등록하시면 종목별 리서치 보고서가 자동으로 만들어집니다.</p>
                                            <Link href="/watchlist" className="inline-block px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black">
                                                관심종목 설정하러 가기 →
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {researchReports.map((r: any) => {
                                                const isKr = r.category === 'kr_stock';
                                                const fmtFlow = (v: number | null | undefined) =>
                                                    v === null || v === undefined ? '-' : `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString()}주`;
                                                const flowColor = (v: number | null | undefined) =>
                                                    !v ? 'text-gray-300' : v > 0 ? 'text-rose-400' : 'text-blue-400';
                                                const badge: Record<string, string> = {
                                                    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                                                    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                                                    slate: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
                                                    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                                                };
                                                return (
                                                    <div key={r.stock_code} className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-4">
                                                        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/10">
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isKr ? 'bg-blue-500/15 text-blue-300' : 'bg-purple-500/15 text-purple-300'}`}>
                                                                        {isKr ? '국내주식' : '미국주식'}
                                                                    </span>
                                                                    <h4 className="text-lg font-black text-white">{r.stock_name}</h4>
                                                                    <span className="text-xs font-mono text-gray-400">{r.stock_code}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-300 mt-1.5">{r.headline}</p>
                                                            </div>
                                                            <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${badge[r.opinion?.color] || badge.slate}`}>
                                                                종합 의견 · {r.opinion?.label}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                                                            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                                                                <div className="text-[11px] text-gray-400">현재가</div>
                                                                <div className="text-sm font-black font-mono text-white mt-0.5">{r.price_str}</div>
                                                                <div className={`text-[11px] font-bold font-mono ${r.change_pct > 0 ? 'text-rose-400' : r.change_pct < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                                                    {r.change_pct > 0 ? '+' : ''}{r.change_pct}%
                                                                </div>
                                                            </div>
                                                            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                                                                <div className="text-[11px] text-gray-400">증권사 평균 목표가</div>
                                                                <div className="text-sm font-black font-mono text-amber-300 mt-0.5">{r.consensus?.target_mean_str || '-'}</div>
                                                                <div className="text-[11px] text-gray-400">
                                                                    {r.consensus?.upside_pct !== null && r.consensus?.upside_pct !== undefined ? `현재가 대비 ${r.consensus.upside_pct > 0 ? '+' : ''}${r.consensus.upside_pct}%` : '자료 없음'}
                                                                </div>
                                                            </div>
                                                            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                                                                <div className="text-[11px] text-gray-400">PER (이익 대비 주가)</div>
                                                                <div className="text-sm font-black font-mono text-white mt-0.5">{r.per ? `${Number(r.per).toFixed(1)}배` : '-'}</div>
                                                                <div className="text-[11px] text-gray-400">{r.market_cap ? `시총 ${r.market_cap}` : ''}</div>
                                                            </div>
                                                            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                                                                <div className="text-[11px] text-gray-400">52주 가격 위치</div>
                                                                <div className="text-sm font-black font-mono text-white mt-0.5">{r.range_pos !== null && r.range_pos !== undefined ? `${r.range_pos}%` : '-'}</div>
                                                                <div className="text-[11px] text-gray-400">0%=최저 · 100%=최고</div>
                                                            </div>
                                                        </div>

                                                        {r.flow && (
                                                            <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                                                                <div className="text-[11px] font-bold text-gray-300 mb-2">💰 오늘 누가 샀을까요? (순매수)</div>
                                                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                                    <div><div className="text-gray-400 text-[11px]">외국인</div><div className={`font-black font-mono ${flowColor(r.flow.foreign_today)}`}>{fmtFlow(r.flow.foreign_today)}</div></div>
                                                                    <div><div className="text-gray-400 text-[11px]">기관</div><div className={`font-black font-mono ${flowColor(r.flow.organ_today)}`}>{fmtFlow(r.flow.organ_today)}</div></div>
                                                                    <div><div className="text-gray-400 text-[11px]">개인</div><div className={`font-black font-mono ${flowColor(r.flow.individual_today)}`}>{fmtFlow(r.flow.individual_today)}</div></div>
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 mt-2">
                                                                    최근 3거래일 합계 — 외국인 {fmtFlow(r.flow.foreign_3d)} · 기관 {fmtFlow(r.flow.organ_3d)}
                                                                    {r.flow.foreign_hold_ratio ? ` · 외국인 보유율 ${r.flow.foreign_hold_ratio}` : ''}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="grid md:grid-cols-2 gap-2.5">
                                                            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3">
                                                                <div className="text-[11px] font-black text-emerald-300 mb-1.5">👍 좋은 점</div>
                                                                {(r.opinion?.good || []).length === 0 ? (
                                                                    <div className="text-[11px] text-gray-500">특별히 눈에 띄는 호재 지표가 없습니다.</div>
                                                                ) : (
                                                                    <ul className="space-y-1 text-[11px] text-emerald-100/90 list-disc pl-4">
                                                                        {r.opinion.good.map((g: string, i: number) => <li key={i}>{g}</li>)}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                            <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3">
                                                                <div className="text-[11px] font-black text-rose-300 mb-1.5">⚠️ 주의할 점</div>
                                                                {(r.opinion?.warn || []).length === 0 ? (
                                                                    <div className="text-[11px] text-gray-500">특별히 눈에 띄는 위험 신호가 없습니다.</div>
                                                                ) : (
                                                                    <ul className="space-y-1 text-[11px] text-rose-100/90 list-disc pl-4">
                                                                        {r.opinion.warn.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                                                            <div className="text-[11px] font-bold text-gray-300 mb-2">📰 최신 뉴스</div>
                                                            {(r.news || []).length === 0 ? (
                                                                <div className="text-[11px] text-gray-500">최근 뉴스가 없습니다.</div>
                                                            ) : (
                                                                <ul className="space-y-1.5">
                                                                    {r.news.map((n: any, i: number) => (
                                                                        <li key={i} className="text-[12px] leading-snug">
                                                                            {n.url ? (
                                                                                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-200 hover:underline">{n.title}</a>
                                                                            ) : (
                                                                                <span className="text-gray-200">{n.title}</span>
                                                                            )}
                                                                            {n.press && <span className="text-[10px] text-gray-500 ml-1.5">· {n.press}</span>}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <p className="text-[11px] text-gray-500 px-1 leading-relaxed">
                                                ※ 공개된 시세·수급·증권사 컨센서스·뉴스를 자동으로 요약한 참고 자료이며 투자 권유가 아닙니다. 최종 판단과 책임은 투자자 본인에게 있습니다.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}{activeTab === 'history' && (
                                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-black text-white mb-1">
                                            🗂️ 오늘 대표님 전자결재 서명 및 지시 기록부
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            오늘 대표님께서 서명(승인·보류·재검토)하신 기안서 내역이 자동 보관됩니다.
                                        </p>
                                    </div>

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
                        <div className={activeTab === 'electronic_sign' ? 'hidden' : 'lg:col-span-4 space-y-5'}>
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

                {/* 자본시장법 준수 고지 */}
                <div className="bg-[#0b1120] border border-white/10 rounded-xl p-4 text-[11px] text-gray-400 leading-relaxed">
                    <span className="font-bold text-gray-300">⚖️ 준법감시인 안내 (자본시장법 제101조 준수):</span>{' '}
                    본 「AI 증권사 대표이사 전자결재 & 자율 보고 시스템」은 제도권 증권사 리서치센터가 발간한 공개 컨센서스 리포트와 거래소의 객관적 시세·수급 데이터를 자동으로 요약·상정하는 시뮬레이션 시스템입니다. 모든 최종 투자 판단(결재)과 책임은 이용자 본인에게 있습니다.
                </div>
            </div>
        </div>
    );
}
