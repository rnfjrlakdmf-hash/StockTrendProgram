'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';
import { useAuth, isAdminEmail } from '@/context/AuthContext';

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
    category_badge: string;
    urgency: string;
    stock_name: string;
    title: string;
    proposer: string;
    submitted_at: string;
    key_numbers: { label: string; value: string }[];
    research_opinion: string;
    quant_opinion: string;
    risk_opinion: string;
    secretary_conclusion: string;
    recommendation: string;
    detail_url?: string;
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
        status: '전 부서 24시간·주말 무휴 자율 분석 기안서 취합 및 대표님 결재 대기 중',
    },
    {
        id: 'research_vp',
        name: '박진우',
        role: '부사장 (리서치센터장)',
        dept: '기업·산업 리서치본부',
        badge: '증권사 리포트 · 컨센서스 총괄',
        avatar: '👨‍💼',
        color: 'purple',
        style: '국내외 제도권 증권사 애널리스트들이 발표한 최신 리포트와 목표주가 컨센서스를 자동 분석해 결재 올립니다.',
        status: '증권사 종목·시황 리포트 전수 조사 및 차주 전략 기안 완료',
    },
    {
        id: 'quant_dir',
        name: '김도현',
        role: '상무 (퀀트·수급본부장)',
        dept: '알고리즘 트레이딩·수급본부',
        badge: '외인/기관 수급 · 추세 돌파',
        avatar: '📈',
        color: 'emerald',
        style: '외국인·기관 수급 유입과 50일 이동평균선 돌파 여부를 알고리즘으로 자동 스캔해 보고합니다.',
        status: 'KRX 수급 & 50일 이평선 추세 돌파 스캐닝 완료',
    },
    {
        id: 'risk_cro',
        name: '최서연',
        role: '상무 (리스크관리본부장 · CRO)',
        dept: '리스크관리·컴플라이언스본부',
        badge: '과열 경보 · 하방 리스크 방어',
        avatar: '🛡️',
        color: 'rose',
        style: '모든 결재 기안서에 대해 고점 부담, 환율·금리 변동성, 손절/방어 기준선을 사전에 감사하여 첨부합니다.',
        status: '상정 안건 전 종목 하방 리스크 및 환율 변동성 감사 완료',
    },
    {
        id: 'global_dir',
        name: '이준호',
        role: '이사 (글로벌·파생본부장)',
        dept: '해외주식·ETF·선물파생본부',
        badge: '미국 빅테크 · 나스닥/금/원유 선물',
        avatar: '🌎',
        color: 'blue',
        style: '밤사이 뉴욕 증시(엔비디아·테슬라), 나스닥100 선물, 원/달러 환율과 한국 증시 연결고리를 자동 보고합니다.',
        status: '미국 나스닥 선물 · 엔비디아 · 달러 환율 24시간 연동 분석 완료',
    },
];

const FALLBACK_AUTO_APPROVALS: AutoApprovalDoc[] = [
    {
        doc_id: 'DOC-DEFAULT-01',
        doc_number: '제 2026-01 호',
        category_badge: '🌐 전사 24시간·주말 무휴 종합 보고',
        urgency: '최우선 결재',
        stock_name: '전체 시장 시스템',
        title: '[전사 365일 상시 감시 보고] 국내외 증시 시황 결산 및 차주(개장일) 리서치·수급 시스템 자동 브리핑',
        proposer: '박진우 부사장 (리서치센터장) 외 4개 본부 합동',
        submitted_at: '상시 자동 상정 완료',
        key_numbers: [
            { label: '핵심 시황 전략', value: '실적·수주 주도주 압축' },
            { label: '나스닥100 선물 (NQ=F)', value: '20,480pt (+0.42%)' },
            { label: '글로벌 AI 대장 (NVDA)', value: '$138.00 (+0.89%)' },
            { label: '자율 분석 완료 건수', value: '종목 6건 · 시황 4건' },
        ],
        research_opinion: '👨‍💼 박진우 부사장(리서치): 증권사에 주말은 없습니다! 전사 리서치센터가 분석한 핵심 시황은 전체 지수 추종보다 실제로 해외 수주와 영업이익이 찍히는 AI 반도체·원전(SMR)·항공·조선 주도주로 에너지를 집중하는 전략입니다.',
        quant_opinion: '📈 김도현 상무(퀀트·수급): 전사 수급 스캐너 점검 결과, 50일 이동평균선 위에서 외국인과 기관의 프로그램 순매수가 동반 유입되는 종목군만 강한 시세 연속성을 유지하고 있습니다.',
        risk_opinion: '🛡️ 최서연 상무(리스크 CRO): 나스닥100 선물 변동성과 장 초반 외국인 선물 수급 이탈 여부를 1순위 위험 지표로 설정했습니다. 급등 종목 추격 매수 금지 원칙을 유지합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [결재 요약]: 평일·주말 관계없이 전사 시장 데이터 수집·리서치·퀀트 스캐너가 100% 정상 가동 중이며, 실적 컨센서스 상향 종목 중심의 선별 모니터링 체제를 대표님께 승인 요청드립니다.',
        recommendation: '전사 24시간 시장 모니터링 체제 승인 (가결 권고)',
    },
    {
        doc_id: 'DOC-DEFAULT-02',
        doc_number: '제 2026-02 호',
        category_badge: '🏢 국내 종목 자율 분석 (하나증권)',
        urgency: '정규 결재',
        stock_name: '두산에너빌리티',
        title: '[두산에너빌리티] 연내 SMR 추가 수주 기대 및 글로벌 원전 기자재 모멘텀 유효',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (퀀트) · 최서연 상무 (CRO)',
        submitted_at: '자율 분석 완료',
        key_numbers: [
            { label: '분석 대상 종목', value: '두산에너빌리티' },
            { label: '발간 증권사', value: '하나증권' },
            { label: '제시 목표주가', value: '120,000원' },
            { label: '투자의견', value: 'Buy (매수)' },
        ],
        research_opinion: '👨‍💼 박진우 부사장(리서치): 목표주가를 밸류에이션 배수 조정으로 일부 조정했으나, 향후 소형모듈원전(SMR) 추가 수주와 가스터빈 수주 잔고 확대에 따른 전사적 증익 기대감은 여전히 유효합니다.',
        quant_opinion: '📈 김도현 상무(퀀트·수급): 목표주가(120,000원) 대비 현재 주가의 괴리율과 외국인·기관 수급 유입 연속성을 자동 추적 중입니다.',
        risk_opinion: '🛡️ 최서연 상무(리스크 CRO): 목표주가 조정이 기업 펀더멘털 훼손인지 시장 멀티플 조정인지 구분하고 연내 SMR 본계약 공시 일정을 함께 체크해야 합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [결재 요약]: 두산에너빌리티에 대한 하나증권 리포트(목표가 120,000원)와 리스크 감사가 완료되었습니다. 대표님 중점 관심 포트폴리오 편입 여부를 서명해 주십시오.',
        recommendation: '목표가 120,000원 기준 중점 관리 승인 요청',
        detail_url: 'https://stock.naver.com/research/company/96804',
    },
    {
        doc_id: 'DOC-DEFAULT-03',
        doc_number: '제 2026-03 호',
        category_badge: '🏢 국내 종목 자율 분석 (한화투자증권)',
        urgency: '정규 결재',
        stock_name: '대한항공',
        title: '[대한항공] 3분기 일회성 성과급 반영에도 견조한 국제선 여객 운임 및 해외발 수요 유지',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (퀀트) · 최서연 상무 (CRO)',
        submitted_at: '자율 분석 완료',
        key_numbers: [
            { label: '분석 대상 종목', value: '대한항공' },
            { label: '발간 증권사', value: '한화투자증권' },
            { label: '제시 목표주가', value: '43,000원' },
            { label: '투자의견', value: 'Buy (매수)' },
        ],
        research_opinion: '👨‍💼 박진우 부사장(리서치): 별도 매출액 5조 448억원, 영업이익 4,212억원을 기록했습니다. 성과급 반영 등으로 시장 기대치를 소폭 하회했으나 해외발 환승 수요 유치와 견조한 여객 운임이 지속되고 있습니다.',
        quant_opinion: '📈 김도현 상무(퀀트·수급): 목표주가(43,000원) 대비 저평가 영역에서 기관 연기금 및 외국인 저가 매수세 유입 여부를 스캔하고 있습니다.',
        risk_opinion: '🛡️ 최서연 상무(리스크 CRO): 일회성 비용(성과급 등) 요인과 본업인 여객·화물 운임 체력을 분리해서 점검하고 국제 유가 및 환율 흐름을 동시 확인해야 합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [결재 요약]: 대한항공에 대한 한화투자증권 리포트(목표가 43,000원) 및 리스크 감사가 완료되었습니다. 대표님 서명을 요청드립니다.',
        recommendation: '목표가 43,000원 기준 중점 관리 승인 요청',
        detail_url: 'https://stock.naver.com/research/company/96803',
    },
    {
        doc_id: 'DOC-DEFAULT-04',
        doc_number: '제 2026-04 호',
        category_badge: '🏢 국내 종목 자율 분석 (미래에셋증권)',
        urgency: '정규 결재',
        stock_name: 'SK하이닉스',
        title: '[SK하이닉스] HBM3E 12단 독점적 지위 지속 및 AI 서버용 고부가 메모리 수익성 극대화',
        proposer: '박진우 부사장 (리서치) · 김도현 상무 (퀀트) · 최서연 상무 (CRO)',
        submitted_at: '자율 분석 완료',
        key_numbers: [
            { label: '분석 대상 종목', value: 'SK하이닉스' },
            { label: '발간 증권사', value: '미래에셋증권' },
            { label: '제시 목표주가', value: '270,000원' },
            { label: '투자의견', value: 'Buy (매수)' },
        ],
        research_opinion: '👨‍💼 박진우 부사장(리서치): 엔비디아 등 북미 빅테크향 HBM 매출 비중 확대로 범용 메모리 경기 변동과 무관하게 업계 최고 수준의 영업이익률을 유지하고 있다는 분석입니다.',
        quant_opinion: '📈 김도현 상무(퀀트·수급): 50일 이동평균선 지지력 확보 및 외국인·기관 반도체 섹터 프로그램 순매수 유입 강도가 가장 높은 핵심 주도주입니다.',
        risk_opinion: '🛡️ 최서연 상무(리스크 CRO): 미국 필라델피아 반도체 지수 변동성과 분기 HBM 출하 가이던스 달성 여부를 조건부로 관리해야 합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [결재 요약]: AI 반도체 핵심 주도주 SK하이닉스(목표가 270,000원) 자율 분석 기안서입니다. 대표님 결재를 요청드립니다.',
        recommendation: '목표가 270,000원 기준 중점 관리 승인 요청',
        detail_url: 'https://stock.naver.com/research/company',
    },
    {
        doc_id: 'DOC-DEFAULT-05',
        doc_number: '제 2026-05 호',
        category_badge: '🌎 해외·글로벌 데스크 자율 분석',
        urgency: '글로벌 핵심',
        stock_name: 'NVDA',
        title: '[엔비디아 (NVDA)] 글로벌 AI 반도체 선행지표 & 월가 IB 목표주가 자율 점검 보고',
        proposer: '이준호 이사 (글로벌·파생본부장)',
        submitted_at: '24시간 글로벌 데스크',
        key_numbers: [
            { label: '현재 주가 (등락률)', value: '$138.00 (+0.89%)' },
            { label: '월가 IB 평균 목표가', value: '$175.00 (+26.8%)' },
            { label: '50일 이동평균선', value: '$132.40' },
            { label: '추세 판정', value: '📈 50일선 상회 강세' },
        ],
        research_opinion: '🌎 이준호 이사(글로벌): 국내 반도체(삼성전자·SK하이닉스) 및 전력기기 업종의 선행지표인 엔비디아(NVDA)는 차세대 블랙웰(Blackwell) 수요 견조로 월가 IB 평균 목표가 $175.00을 유지하고 있습니다.',
        quant_opinion: '📈 김도현 상무(퀀트·수급): 50일 이동평균선($132.40) 위에서 중기 상승 추세를 유지하며 글로벌 AI 테크 수급의 기준점 역할을 하고 있습니다.',
        risk_opinion: '🛡️ 최서연 상무(리스크 CRO): 52주 신고가 부근 단기 차익실현 매물과 원/달러 환율 변동성을 동시에 감안해 국내 반도체 연동 비중을 조절해야 합니다.',
        secretary_conclusion: '👩‍💼 정유진 비서실장 [결재 요약]: 글로벌 AI 반도체 선행지표(NVDA) 점검 완료. 국내 반도체·전력 인프라 섹터 연동 모니터링 승인을 요청드립니다.',
        recommendation: '글로벌 선행지표 연동 승인 요청',
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
    const [activeTab, setActiveTab] = useState<'electronic_sign' | 'boardroom' | 'history'>('electronic_sign');
    const [signMap, setSignMap] = useState<Record<string, { status: SignStatus; signedAt: string }>>({});
    const [commandInput, setCommandInput] = useState<string>('');
    const [showCommandDrawer, setShowCommandDrawer] = useState<boolean>(false);
    const [chatLogs, setChatLogs] = useState<CeoChatLog[]>([]);

    const mainSectionRef = useRef<HTMLDivElement>(null);

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
        const target = doc.stock_name === '전체 시장 시스템' ? '' : doc.stock_name;
        const msg = `${doc.stock_name} 안건(${doc.doc_number}) 대표이사 재검토 지시 — 임원 전원 심층 대면 보고 실시!`;
        setActiveTab('boardroom');
        fetchOfficeData(target, msg, true);
        setTimeout(() => {
            mainSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
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
            {/* 상단 대표이사 전자결재 집무실 헤더 배너 */}
            <div className="relative overflow-hidden border-b border-amber-500/30 bg-gradient-to-r from-[#0d1527] via-[#131c33] to-[#0d1527]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-extrabold mb-3">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                🏛️ CEO ELECTRONIC APPROVAL SYSTEM · 전 부서 자율 분석 & 대표이사 결재실
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                                대표님, 직원들이 오늘 시장 분석을 마치고 결재 서류를 올렸습니다
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed max-w-3xl">
                                대표님께서 직접 검색하거나 지시하실 필요 없습니다. 리서치센터·퀀트수급본부·리스크관리본부(CRO)·글로벌파생본부가 알아서 시장 시스템과 핵심 종목을 분석해 결재판에 올려두었으니, 보고를 읽으시고 <span className="text-amber-300 font-bold">[승인 서명]</span>만 눌러주십시오.
                            </p>
                        </div>

                        {/* 우측 상단 전자결재 현황판 & 일괄 서명 버튼 */}
                        <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-4 min-w-[290px] backdrop-blur-md shadow-xl">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                <span className="font-bold text-amber-300">📋 오늘의 대표이사 결재판</span>
                                <span>{updatedAt ? `${updatedAt} 자동 상정` : '실시간 자동 상정'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                <div className="bg-white/5 rounded-xl py-2 px-2 border border-white/5">
                                    <div className="text-[10px] text-gray-400">총 상정 서류</div>
                                    <div className="text-base font-black text-white">{totalDocs}건</div>
                                </div>
                                <div className="bg-amber-500/10 rounded-xl py-2 px-2 border border-amber-500/25">
                                    <div className="text-[10px] text-amber-200">서명 대기</div>
                                    <div className="text-base font-black text-amber-300">{pendingDocsCount}건</div>
                                </div>
                                <div className="bg-emerald-500/10 rounded-xl py-2 px-2 border border-emerald-500/25">
                                    <div className="text-[10px] text-emerald-200">승인 완료</div>
                                    <div className="text-base font-black text-emerald-400">{approvedDocsCount}건</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleApproveAll}
                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <span>🖋️ 상정된 안건 전체 일괄 승인 서명하기</span>
                            </button>
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
                        <div className="lg:col-span-8 space-y-5">
                            {activeTab === 'electronic_sign' && (
                                <>
                                    {/* 비서실장 브리핑 안내 배너 */}
                                    <div className="bg-gradient-to-r from-amber-500/15 via-indigo-950/40 to-slate-900 border border-amber-500/35 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
                                                👩‍💼
                                            </div>
                                            <div>
                                                <div className="text-xs font-extrabold text-amber-300">
                                                    정유진 비서실장 · 일일 결재 브리핑
                                                </div>
                                                <p className="text-xs sm:text-sm text-white font-bold mt-0.5 leading-relaxed">
                                                    &ldquo;대표님! 오늘 각 본부 임원들이 알아서 시장 시스템과 주요 종목 분석을 마쳐 총 <span className="text-amber-300 underline">{totalDocs}건의 기안서</span>를 올렸습니다. 각 서류의 3줄 핵심 보고만 보시고 아래 <span className="text-emerald-300">[✅ 대표이사 승인 서명]</span> 버튼만 눌러주시면 됩니다!&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 자동 상정된 전자결재 기안서 리스트 */}
                                    <div className="space-y-5">
                                        {autoApprovals.map((doc) => {
                                            const signInfo = signMap[doc.doc_id];
                                            const status: SignStatus = signInfo?.status || 'pending';

                                            return (
                                                <div
                                                    key={doc.doc_id}
                                                    className={`relative overflow-hidden rounded-3xl border-2 transition-all p-5 sm:p-6 shadow-xl ${
                                                        status === 'approved'
                                                            ? 'border-emerald-500/50 bg-gradient-to-br from-[#0b1d19] via-[#0c1626] to-[#09101d]'
                                                            : status === 'hold'
                                                            ? 'border-rose-500/40 bg-[#170f18]'
                                                            : 'border-white/15 hover:border-amber-500/40 bg-gradient-to-br from-[#10192e] to-[#0a101f]'
                                                    }`}
                                                >
                                                    {/* 우측 상단 대표이사 결재 도장 스탬프 */}
                                                    {status === 'approved' && (
                                                        <div className="sm:absolute sm:top-5 sm:right-6 mb-3 sm:mb-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 font-black text-xs shadow-lg">
                                                            <span>💮 대표이사 결재완료</span>
                                                            <span className="text-[10px] text-emerald-200/80">
                                                                ({signInfo?.signedAt})
                                                            </span>
                                                        </div>
                                                    )}
                                                    {status === 'hold' && (
                                                        <div className="sm:absolute sm:top-5 sm:right-6 mb-3 sm:mb-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-rose-400 bg-rose-500/20 text-rose-300 font-black text-xs">
                                                            <span>⏸️ 대표이사 보류 지시 ({signInfo?.signedAt})</span>
                                                        </div>
                                                    )}
                                                    {status === 'reexamine' && (
                                                        <div className="sm:absolute sm:top-5 sm:right-6 mb-3 sm:mb-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-amber-400 bg-amber-500/20 text-amber-300 font-black text-xs">
                                                            <span>🔄 심층 재검토 지시됨 ({signInfo?.signedAt})</span>
                                                        </div>
                                                    )}

                                                    {/* 문서 번호 & 카테고리 헤더 */}
                                                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                                        <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-gray-200 font-mono text-xs font-bold">
                                                            문서번호 {doc.doc_number}
                                                        </span>
                                                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-extrabold">
                                                            {doc.category_badge}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            · {doc.submitted_at}
                                                        </span>
                                                    </div>

                                                    {/* 안건 제목 & 기안자 */}
                                                    <h3 className="text-lg sm:text-xl font-black text-white leading-snug pr-0 sm:pr-44">
                                                        {doc.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        기안 및 합동 분석: <span className="text-gray-200 font-semibold">{doc.proposer}</span>
                                                    </p>

                                                    {/* 핵심 수치 요약 표 */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
                                                        {doc.key_numbers.map((kn, i) => (
                                                            <div
                                                                key={i}
                                                                className="bg-black/40 border border-white/10 rounded-xl p-3"
                                                            >
                                                                <div className="text-[10px] text-gray-400 font-semibold">
                                                                    {kn.label}
                                                                </div>
                                                                <div className="text-xs sm:text-sm font-black text-amber-300 mt-0.5 truncate">
                                                                    {kn.value}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* 각 본부 임원 자율 분석 3단 요약 보고 */}
                                                    <div className="space-y-2 bg-black/35 border border-white/10 rounded-2xl p-4 text-xs sm:text-sm leading-relaxed">
                                                        <div className="text-gray-100">
                                                            {doc.research_opinion}
                                                        </div>
                                                        <div className="text-emerald-200/95 pt-1.5 border-t border-white/5">
                                                            {doc.quant_opinion}
                                                        </div>
                                                        <div className="text-rose-200/95 pt-1.5 border-t border-white/5">
                                                            {doc.risk_opinion}
                                                        </div>
                                                    </div>

                                                    {/* 비서실장 최종 결재 건의문 */}
                                                    <div className="mt-3 bg-purple-950/30 border border-purple-500/35 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                        <div className="text-xs sm:text-sm text-purple-100 font-bold">
                                                            {doc.secretary_conclusion}
                                                        </div>
                                                        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-purple-500/25 text-purple-200 text-[11px] font-black border border-purple-400/30">
                                                            건의: {doc.recommendation}
                                                        </span>
                                                    </div>

                                                    {/* 하단 대표이사 전자서명 버튼 바 */}
                                                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateSignature(doc.doc_id, 'approved')}
                                                                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                    status === 'approved'
                                                                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                                                                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-md shadow-amber-500/20'
                                                                }`}
                                                            >
                                                                <span>
                                                                    {status === 'approved'
                                                                        ? '✅ 대표이사 승인 서명 완료'
                                                                        : '🖋️ 대표이사 승인 서명 (재가)'}
                                                                </span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => updateSignature(doc.doc_id, 'hold')}
                                                                className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                                                                    status === 'hold'
                                                                        ? 'bg-rose-500 text-white border-rose-400'
                                                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/15'
                                                                }`}
                                                            >
                                                                ⏸️ 보류 처리
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleReexamineDoc(doc)}
                                                                className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 transition-all cursor-pointer"
                                                            >
                                                                🎙️ 임원 대면 심층보고 소집
                                                            </button>
                                                        </div>

                                                        {doc.detail_url && (
                                                            <a
                                                                href={doc.detail_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-sky-400 hover:underline font-bold"
                                                            >
                                                                증권사 원문 리포트 열람 ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
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

                            {activeTab === 'history' && (
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

                        {/* 우측 4컬럼: 전사 시장 시스템 가동 현황 & 빠른 서명 요약 */}
                        <div className="lg:col-span-4 space-y-5">
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
