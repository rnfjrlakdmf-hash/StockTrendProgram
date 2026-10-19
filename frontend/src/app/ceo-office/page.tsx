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

export default function CeoOfficePage() {
    const { user, isLoading: authLoading } = useAuth();
    const isAdmin = isAdminEmail(user?.email);

    const [executives, setExecutives] = useState<Executive[]>([]);
    const [autoApprovals, setAutoApprovals] = useState<AutoApprovalDoc[]>([]);
    const [agenda, setAgenda] = useState<Agenda | null>(null);
    const [debates, setDebates] = useState<DebateTurn[]>([]);
    const [researchDesk, setResearchDesk] = useState<ResearchReportItem[]>([]);
    const [marketDesk, setMarketDesk] = useState<ResearchReportItem[]>([]);
    const [officeStatus, setOfficeStatus] = useState<string>('전 부서 자율 시장 분석 완료 · 대표이사 전자결재 대기 중');
    const [updatedAt, setUpdatedAt] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
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
                setAutoApprovals(d.auto_approvals || []);
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
