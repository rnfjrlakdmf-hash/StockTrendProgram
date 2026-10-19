'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';

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

export default function CeoOfficePage() {
    const [executives, setExecutives] = useState<Executive[]>([]);
    const [agenda, setAgenda] = useState<Agenda | null>(null);
    const [debates, setDebates] = useState<DebateTurn[]>([]);
    const [researchDesk, setResearchDesk] = useState<ResearchReportItem[]>([]);
    const [marketDesk, setMarketDesk] = useState<ResearchReportItem[]>([]);
    const [officeStatus, setOfficeStatus] = useState<string>('전 부서 실시간 시장 모니터링 및 대표이사 결재 대기 중');
    const [updatedAt, setUpdatedAt] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [isCallingMeeting, setIsCallingMeeting] = useState<boolean>(false);

    // CEO Direct Command Input
    const [commandInput, setCommandInput] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'boardroom' | 'approval' | 'history'>('boardroom');
    const [approvedIds, setApprovedIds] = useState<Record<string, boolean>>({});
    const [chatLogs, setChatLogs] = useState<CeoChatLog[]>([]);

    const boardroomRef = useRef<HTMLDivElement>(null);

    const fetchOfficeData = useCallback(async (topicParam = '', messageParam = '', appendHistory = false) => {
        if (appendHistory) {
            setIsCallingMeeting(true);
        } else {
            setLoading(true);
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
                setExecutives(d.executives || []);
                setAgenda(d.agenda || null);
                setDebates(d.debates || []);
                setResearchDesk(d.research_desk || []);
                setMarketDesk(d.market_desk || []);
                setOfficeStatus(d.office_status || '');
                setUpdatedAt(d.updated_at || '');

                if (appendHistory && (messageParam || topicParam)) {
                    const secTurn = (d.debates || []).find((t: DebateTurn) => t.speaker_id === 'sec_chief') || (d.debates || [])[0];
                    const newLog: CeoChatLog = {
                        id: `${Date.now()}`,
                        timestamp: d.updated_at || new Date().toLocaleTimeString('ko-KR'),
                        ceoMessage: messageParam || `${topicParam} 긴급 임원 안건 상정`,
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
        fetchOfficeData('', '', false);
    }, [fetchOfficeData]);

    const handleSendDirective = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = commandInput.trim();
        if (!trimmed) return;
        setActiveTab('boardroom');
        fetchOfficeData('', trimmed, true);
        setCommandInput('');
        setTimeout(() => {
            boardroomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const handleQuickTopic = (topic: string, message: string) => {
        setActiveTab('boardroom');
        fetchOfficeData(topic, message, true);
        setTimeout(() => {
            boardroomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const handleConveneFromReport = (stockName: string, title: string) => {
        setActiveTab('boardroom');
        const msg = `${stockName} 리서치 보고서("${title}") 기반으로 임원 끝장 토론 소집해!`;
        fetchOfficeData(stockName, msg, true);
        setTimeout(() => {
            boardroomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const toggleApproveReport = (id: string) => {
        setApprovedIds(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
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

    const approvedCount = Object.values(approvedIds).filter(Boolean).length;

    return (
        <div className="min-h-screen bg-[#070b14] text-white pb-20">
            {/* 상단 대표이사 집무실 헤더 배너 */}
            <div className="relative overflow-hidden border-b border-amber-500/25 bg-gradient-to-r from-[#0d1527] via-[#131c33] to-[#0d1527]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-extrabold mb-3">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                🏛️ EXECUTIVE BOARDROOM · AI 증권사 대표이사 집무실
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex flex-wrap items-center gap-2.5">
                                <span>대표님, 임원진 대면 보고 및 결재 준비 완료되었습니다</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed max-w-3xl">
                                리서치센터·퀀트수급본부·리스크관리본부(CRO)·글로벌파생본부 임원들이 실시간 시장 데이터와 증권사 리포트를 바탕으로 대표님께 직접 보고하고 치열하게 찬반 토론을 진행합니다.
                            </p>
                        </div>

                        {/* 집무실 실시간 상태 위젯 */}
                        <div className="bg-black/45 border border-white/10 rounded-2xl p-4 min-w-[260px] backdrop-blur-md">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                                <span className="font-bold text-amber-300">📡 비서실 핫라인 가동 중</span>
                                <span>{updatedAt ? `${updatedAt} 기준` : '실시간 연동'}</span>
                            </div>
                            <p className="text-xs text-gray-200 font-semibold leading-snug mb-2.5">
                                {officeStatus}
                            </p>
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                                <div className="bg-white/5 rounded-lg py-1.5 px-2">
                                    <div className="text-[10px] text-gray-400">배석 임원</div>
                                    <div className="text-sm font-black text-emerald-400">{executives.length || 5}명</div>
                                </div>
                                <div className="bg-white/5 rounded-lg py-1.5 px-2">
                                    <div className="text-[10px] text-gray-400">결재 대기 리포트</div>
                                    <div className="text-sm font-black text-amber-300">{researchDesk.length + marketDesk.length}건</div>
                                </div>
                                <div className="bg-white/5 rounded-lg py-1.5 px-2">
                                    <div className="text-[10px] text-gray-400">오늘 결재 완료</div>
                                    <div className="text-sm font-black text-sky-300">{approvedCount}건</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5인 임원진 상시 대기석 카드 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-6">
                        {executives.map(exec => (
                            <div
                                key={exec.id}
                                className="bg-[#0b1222]/90 border border-white/10 hover:border-amber-500/40 rounded-xl p-3 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-1 mb-1.5">
                                        <span className="text-xl">{exec.avatar}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                            ● 대기중
                                        </span>
                                    </div>
                                    <div className="text-sm font-extrabold text-white">{exec.name}</div>
                                    <div className="text-[11px] font-bold text-amber-300/90">{exec.role}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{exec.dept}</div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-300 line-clamp-2">
                                    {exec.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                {/* 💬 대표이사 직통 지시·대화창 (CEO Direct Command Box) */}
                <div className="bg-gradient-to-br from-[#111a2e] via-[#0f172a] to-[#162038] border-2 border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-amber-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🎙️</span>
                            <h2 className="text-base sm:text-lg font-black text-white">
                                대표이사 직통 지시 · 긴급 임원회의 소집창
                            </h2>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                실시간 대화형
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">
                            국내주식 · 미국주식 · ETF · 선물 어떤 종목이나 질문이든 지시만 내려주세요
                        </span>
                    </div>

                    <form onSubmit={handleSendDirective} className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={commandInput}
                                onChange={e => setCommandInput(e.target.value)}
                                placeholder="예: &quot;두산에너빌리티 임원들끼리 끝장 토론해봐&quot;, &quot;삼성전자 지금 수급 어때?&quot;, &quot;NVDA 리스크 보고해&quot;"
                                className="w-full bg-[#070b14] border border-white/20 focus:border-amber-400 rounded-xl px-4 py-3.5 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isCallingMeeting}
                            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/20 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                        >
                            {isCallingMeeting ? '⚡ 임원 긴급 소집 중...' : '📢 임원 소집 · 지시 내리기'}
                        </button>
                    </form>

                    {/* 원클릭 긴급 안건 버튼 */}
                    <div className="mt-4">
                        <div className="text-[11px] font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                            <span>⚡ 대표님 자주 찾으시는 원클릭 안건 상정:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_TOPICS.map(item => {
                                const isCurrent =
                                    (item.topic === '' && agenda?.topic_type === 'briefing') ||
                                    (item.topic !== '' &&
                                        (agenda?.target_name?.includes(item.topic) ||
                                            agenda?.target_code === item.topic));
                                return (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={() => handleQuickTopic(item.topic, item.message)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                            isCurrent
                                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/10'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 탭 전환 바 */}
                <div ref={boardroomRef} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('boardroom')}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'boardroom'
                                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>🎙️ 임원 끝장 토론 · 대면 보고실</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20">
                                {debates.length}명 발언
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('approval')}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'approval'
                                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>📑 리서치팀 상정 보고서 결재함</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20">
                                {researchDesk.length + marketDesk.length}건
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'history'
                                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>🗂️ 오늘의 대표님 지시·보고 회의록</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20">
                                {chatLogs.length}건
                            </span>
                        </button>
                    </div>

                    <Link
                        href="/research"
                        className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                        <span>📚 전체 리서치 자료실 바로가기</span>
                        <span>→</span>
                    </Link>
                </div>

                {/* 메인 콘텐츠 영역 */}
                {loading ? (
                    <div className="bg-[#0d1526] border border-white/10 rounded-2xl p-12 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-base font-bold text-white">
                            비서실장이 각 본부 임원들과 최신 증권사 리포트를 소집하고 있습니다...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            실시간 주가·외국인/기관 수급·애널리스트 목표가를 집계 중입니다.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 좌측 8컬럼: 임원 회의실 또는 탭 콘텐츠 */}
                        <div className="lg:col-span-8 space-y-5">
                            {activeTab === 'boardroom' && agenda && (
                                <>
                                    {/* 현재 상정 안건 전광판 */}
                                    <div className="bg-gradient-to-br from-[#111c33] to-[#0b1222] border border-white/15 rounded-2xl p-5 shadow-xl">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                📌 {agenda.badge}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                안건 상정 시각: {agenda.timestamp}
                                            </span>
                                        </div>

                                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                                            {agenda.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-300 mt-1">
                                            {agenda.subtitle}
                                        </p>

                                        {agenda.ceo_question && (
                                            <div className="mt-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5">
                                                <span className="text-lg">👔</span>
                                                <div>
                                                    <div className="text-[11px] font-bold text-amber-300">
                                                        대표이사 하달 지시사항
                                                    </div>
                                                    <div className="text-sm font-extrabold text-white">
                                                        &ldquo;{agenda.ceo_question}&rdquo;
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 핵심 지표 전광판 */}
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

                                    {/* 임원진 릴레이 대면 보고 & 찬반 토론 */}
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

                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${st.badge}`}
                                                            >
                                                                {turn.stance}
                                                            </span>
                                                        </div>
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
                                                            <span>발언 순서 #{idx + 1}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {activeTab === 'approval' && (
                                <div className="space-y-4">
                                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 sm:p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                            <div>
                                                <h3 className="text-lg font-black text-white">
                                                    📑 리서치센터 상정 종목 리포트 결재함
                                                </h3>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    리서치팀이 대표님 책상에 올린 최신 증권사 원문 요약 보고서입니다. 결재 도장을 찍거나 즉시 임원 토론에 부칠 수 있습니다.
                                                </p>
                                            </div>
                                            <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
                                                결재 완료 {approvedCount} / {researchDesk.length}건
                                            </span>
                                        </div>

                                        <div className="space-y-3.5">
                                            {researchDesk.map(rep => {
                                                const isApproved = !!approvedIds[rep.id];
                                                return (
                                                    <div
                                                        key={rep.id}
                                                        className={`rounded-2xl border p-4 transition-all ${
                                                            isApproved
                                                                ? 'border-emerald-500/40 bg-emerald-950/10'
                                                                : 'border-white/10 bg-[#090f1d]'
                                                        }`}
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-xs font-extrabold border border-blue-500/30">
                                                                    {rep.broker}
                                                                </span>
                                                                <span className="text-base font-black text-white">
                                                                    {rep.stock_name}
                                                                </span>
                                                                {rep.target_price && rep.target_price !== '제시안함' && (
                                                                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-extrabold border border-amber-500/30">
                                                                        🎯 목표주가 {rep.target_price}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-gray-400">{rep.date}</span>
                                                        </div>

                                                        <h4 className="text-sm sm:text-base font-bold text-gray-100 mb-2">
                                                            {rep.title}
                                                        </h4>

                                                        {rep.plain_explanation && (
                                                            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-xs sm:text-sm text-emerald-100 mb-2.5">
                                                                <span className="font-black text-emerald-300 mr-1.5">
                                                                    💡 비서실 1줄 요약 보고:
                                                                </span>
                                                                {rep.plain_explanation}
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleApproveReport(rep.id)}
                                                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                                                        isApproved
                                                                            ? 'bg-emerald-500 text-slate-950'
                                                                            : 'bg-white/10 hover:bg-white/20 text-white'
                                                                    }`}
                                                                >
                                                                    {isApproved ? '✅ 대표이사 결재 완료' : '🖋️ 결재 승인 도장 찍기'}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleConveneFromReport(rep.stock_name, rep.title)
                                                                    }
                                                                    className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer"
                                                                >
                                                                    🎙️ 이 종목 임원 끝장토론 소집
                                                                </button>
                                                            </div>

                                                            {rep.detail_url && (
                                                                <a
                                                                    href={rep.detail_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-sky-400 hover:underline font-semibold"
                                                                >
                                                                    원문 리포트 보기 ↗
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5">
                                    <h3 className="text-lg font-black text-white mb-1">
                                        🗂️ 오늘 대표님 하달 지시 & 임원 보고 회의록
                                    </h3>
                                    <p className="text-xs text-gray-400 mb-4">
                                        상단 지시창에서 대표님이 질문하거나 소집한 모든 임원 회의 기록이 순서대로 보관됩니다.
                                    </p>

                                    {chatLogs.length === 0 ? (
                                        <div className="text-center py-10 bg-black/30 rounded-xl border border-white/5">
                                            <p className="text-sm text-gray-300 font-bold">
                                                아직 오늘 추가로 하달하신 특별 지시 내역이 없습니다.
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                위 지시창에 종목명이나 질문을 입력하시면 회의록이 자동 기록됩니다.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {chatLogs.map(log => (
                                                <div
                                                    key={log.id}
                                                    className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-2.5"
                                                >
                                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                                        <span className="font-bold text-amber-300">
                                                            👔 대표이사 지시 ({log.targetName})
                                                        </span>
                                                        <span>{log.timestamp}</span>
                                                    </div>
                                                    <div className="text-sm font-extrabold text-white">
                                                        &ldquo;{log.ceoMessage}&rdquo;
                                                    </div>
                                                    <div className="bg-purple-950/25 border border-purple-500/30 rounded-lg p-3 text-xs text-gray-200 whitespace-pre-line">
                                                        {log.secretaryReply}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 우측 4컬럼: 대표님 전용 결재 데스크 요약 (항상 표시) */}
                        <div className="lg:col-span-4 space-y-5">
                            {/* 책상 위 긴급 결재 서류함 */}
                            <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-4 sm:p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                                        <span>📥 리서치팀 방금 올린 보고서</span>
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('approval')}
                                        className="text-xs font-bold text-amber-300 hover:underline cursor-pointer"
                                    >
                                        전체 결재함 ({researchDesk.length}건) →
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mb-3">
                                    종목을 클릭하면 즉시 임원 5명이 해당 종목을 놓고 찬반 토론을 시작합니다.
                                </p>

                                <div className="space-y-2.5">
                                    {researchDesk.slice(0, 6).map(rep => {
                                        const isApproved = !!approvedIds[rep.id];
                                        return (
                                            <div
                                                key={rep.id}
                                                className="bg-black/40 hover:bg-black/60 border border-white/10 hover:border-amber-500/40 rounded-xl p-3 transition-all"
                                            >
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-black text-white">
                                                            {rep.stock_name}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                                                            {rep.broker}
                                                        </span>
                                                    </div>
                                                    {rep.target_price && rep.target_price !== '제시안함' && (
                                                        <span className="text-[11px] font-extrabold text-amber-300">
                                                            🎯 {rep.target_price}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-gray-300 line-clamp-1 mb-2">
                                                    {rep.title}
                                                </p>

                                                <div className="flex items-center justify-between gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleConveneFromReport(rep.stock_name, rep.title)
                                                        }
                                                        className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold transition-all cursor-pointer"
                                                    >
                                                        🎙️ 이 종목 임원회의 소집
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleApproveReport(rep.id)}
                                                        className={`py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                                                            isApproved
                                                                ? 'bg-emerald-500 text-slate-950'
                                                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                                        }`}
                                                    >
                                                        {isApproved ? '결재됨' : '결재'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 거시 시황·산업 브리핑 서류함 */}
                            {marketDesk.length > 0 && (
                                <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-4 sm:p-5">
                                    <h3 className="text-sm sm:text-base font-black text-white mb-2">
                                        🌐 거시 시황 · 산업전략실 보고서
                                    </h3>
                                    <div className="space-y-2.5">
                                        {marketDesk.slice(0, 4).map(m => (
                                            <div
                                                key={m.id}
                                                className="bg-black/35 border border-white/10 rounded-xl p-3"
                                            >
                                                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                                                    <span className="font-bold text-sky-300">{m.broker}</span>
                                                    <span>{m.date}</span>
                                                </div>
                                                <div className="text-xs font-bold text-white line-clamp-1">
                                                    {m.title}
                                                </div>
                                                {m.plain_explanation && (
                                                    <p className="text-[11px] text-gray-300 mt-1 line-clamp-2">
                                                        {m.plain_explanation}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 광고 슬롯 (한국 유저 대상 카카오 애드핏) */}
                            <div className="flex justify-center">
                                <KakaoRevenueAd type="feed" />
                            </div>
                        </div>
                    </div>
                )}

                {/* 자본시장법 준수 고지 */}
                <div className="bg-[#0b1120] border border-white/10 rounded-xl p-4 text-[11px] text-gray-400 leading-relaxed">
                    <span className="font-bold text-gray-300">⚖️ 준법감시인 안내 (자본시장법 제101조 준수):</span>{' '}
                    본 「AI 증권사 대표이사 집무실 & 임원 회의실」은 제도권 증권사 리서치센터가 발간한 공개 컨센서스 리포트와 한국거래소(KRX)·글로벌 거래소의 객관적 시세·수급 데이터를 이용자가 입체적으로 비교·검토할 수 있도록 돕기 위해 구성된 시뮬레이션 브리핑 시스템입니다. 개별 투자자에 대한 1:1 맞춤형 투자자문이나 매수·매도 권유가 아니며, 모든 최종 투자 판단(결재)과 책임은 이용자 본인에게 있습니다.
                </div>
            </div>
        </div>
    );
}
