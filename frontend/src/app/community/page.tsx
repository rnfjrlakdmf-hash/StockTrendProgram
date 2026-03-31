"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { 
    Users, MessageSquare, ShieldAlert, Send, 
    Share2, Download, Search, Filter, 
    TrendingUp, TrendingDown, Info, AlertTriangle,
    CheckCircle2, Loader2, Sparkles, Trophy, X,
    Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StrategyResultModal from "@/components/StrategyResultModal";

interface ChatMessage {
    id: number;
    user_name: string;
    text: string;
    timestamp: string;
    symbol: string;
}

interface Strategy {
    id: number;
    user_name: string;
    title: string;
    description: string;
    filters: any;
    likes: number;
    usage_count: number;
    timestamp: string;
}

export default function CommunityPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'lounge' | 'market' | 'poll'>('lounge');
    
    // Lounge States
    const [chats, setChats] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [sentiment, setSentiment] = useState({ score: 50, summary: "분석 중..." });
    
    // Market States
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [marketLoading, setMarketLoading] = useState(false);
    const [scanningId, setScanningId] = useState<number | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [scanResults, setScanResults] = useState([]);
    const [selectedStrategyTitle, setSelectedStrategyTitle] = useState("");

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initial Fetch
    useEffect(() => {
        if (activeTab === 'lounge') {
            fetchChats();
            const interval = setInterval(fetchChats, 5000); // 5 sec auto refresh
            return () => clearInterval(interval);
        }
        if (activeTab === 'market') fetchStrategies();
    }, [activeTab]);

    const fetchChats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/lounge`);
            const json = await res.json();
            if (json.status === "success") {
                setChats(json.data);
                fetchSentiment();
            }
        } catch (e) { console.error(e); }
    };

    const fetchSentiment = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/sentiment/global`);
            const json = await res.json();
            if (json.status === "success") setSentiment(json.data);
        } catch (e) { console.error(e); }
    };

    const fetchStrategies = async () => {
        setMarketLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/strategies`);
            const json = await res.json();
            if (json.status === "success") setStrategies(json.data);
        } catch (e) { console.error(e); }
        finally { setMarketLoading(false); }
    };

    const handleApplyFilter = async (strategy: Strategy) => {
        setScanningId(strategy.id);
        setSelectedStrategyTitle(strategy.title);
        
        try {
            // 백엔드 터보 스캐너 호출
            const res = await fetch(`${API_BASE_URL}/api/market/strategy/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filters: strategy.filters
                })
            });
            const json = await res.json();
            
            if (json.status === "success") {
                setScanResults(json.data);
                setShowResultModal(true);
            } else {
                alert(json.message || "스캔 중 오류가 발생했습니다.");
            }
        } catch (e) {
            console.error(e);
            alert("서버 연결에 실패했습니다.");
        } finally {
            setScanningId(null);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || sending) return;
        if (!user) { alert("로그인이 필요한 서비스입니다."); return; }
        
        setSending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/lounge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_name: user.name,
                    text: inputText,
                    symbol: "global"
                })
            });
            const json = await res.json();
            if (json.status === "success") {
                setInputText("");
                fetchChats();
            } else if (json.status === "blocked") {
                alert(json.message);
                setInputText("");
            }
        } catch (e) { console.error(e); }
        finally { setSending(false); }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chats]);

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 pt-24">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter mb-2 flex items-center gap-3">
                            <Users className="w-10 h-10 text-blue-500" />
                            COMMUNITY
                        </h1>
                        <p className="text-gray-400 font-medium">집단 지성과 AI가 만나는 클린 투자 커뮤니티</p>
                    </div>
                    
                    {/* Compliance Banner */}
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-start gap-3 max-w-md">
                        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-200/80 leading-relaxed font-bold">
                            본 커뮤니티는 유사투자자문행위 방지를 위해 실시간 AI 필터가 작동 중입니다. 
                            <span className="text-amber-500"> 특정 종목 추천, 수익 보장, 리딩 유도</span> 등의 발언은 즉시 삭제 및 차단될 수 있습니다.
                        </p>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
                    <TabButton active={activeTab === 'lounge'} onClick={() => setActiveTab('lounge')} icon={<MessageSquare className="w-4 h-4"/>} label="종합 라운지" />
                    <TabButton active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={<Filter className="w-4 h-4"/>} label="전략 마켓" />
                    <TabButton active={activeTab === 'poll'} onClick={() => setActiveTab('poll')} icon={<Trophy className="w-4 h-4"/>} label="테마 투표" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Left/Main Column: Active Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'lounge' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[650px] shadow-2xl"
                            >
                                {/* Chat Header with Sentiment */}
                                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-sm font-bold text-gray-300">실시간 글로벌 라운지</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-blue-400" />
                                            <span className="text-[10px] font-bold text-blue-300">AI 심리 요약: {sentiment.score.toFixed(0)}점</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Chat Messages Area */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                                    {chats.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                                            <MessageSquare className="w-12 h-12 opacity-20" />
                                            <p className="text-sm">아직 대화가 없습니다. 첫 인사를 건네보세요!</p>
                                        </div>
                                    ) : (
                                        chats.map((chat) => (
                                            <div key={chat.id} className="flex flex-col gap-1">
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-xs font-black ${chat.user_name === user?.name ? 'text-blue-400' : 'text-gray-400'}`}>
                                                        {chat.user_name}
                                                    </span>
                                                    <span className="text-[8px] text-gray-600 font-mono">
                                                        {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                                                    chat.user_name === user?.name 
                                                    ? 'bg-blue-600 text-white rounded-tr-none self-start ml-0' 
                                                    : 'bg-white/10 text-gray-200 rounded-tl-none self-start border border-white/5'
                                                }`}>
                                                    {chat.text}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-black/40 border-t border-white/10">
                                    <div className="relative group">
                                        <input 
                                            type="text"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder={user ? "자유롭게 의견을 나누세요 (AI 수사관 모니터링 중)" : "로그인 후 대화에 참여하세요"}
                                            disabled={!user || sending}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pr-12 group-hover:bg-white/10"
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            disabled={!user || !inputText.trim() || sending}
                                            className="absolute right-2 top-2 p-3 bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/40"
                                        >
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-[10px] text-gray-500 text-center font-medium">
                                        건전한 대화 문화를 위해 <span className="text-blue-400">데이터 기반 분석</span> 위주로 소통해 주세요.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'market' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                                <div className="col-span-full mb-2">
                                    <p className="text-sm font-bold text-gray-400">🔥 실시간 인기 전략 공유</p>
                                </div>
                                {marketLoading ? (
                                    <div className="col-span-full py-20 flex flex-col items-center gap-4 text-gray-500">
                                        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                        <p>전략 마켓 데이터를 불러오고 있습니다...</p>
                                    </div>
                                ) : strategies.length === 0 ? (
                                    <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/20">
                                        <Filter className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                        <p className="text-gray-400">아직 등록된 공식 필터가 없습니다.</p>
                                    </div>
                                ) : (
                                    strategies.map((strat) => (
                                        <div key={strat.id} className="bg-white/5 rounded-3xl p-6 border border-white/10 hover:border-blue-500/30 transition-all group relative overflow-hidden flex flex-col">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Share2 className="w-20 h-20 text-white" />
                                            </div>
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="text-lg font-bold text-white leading-tight pr-4">{strat.title}</h4>
                                                <TrendingUp className="w-5 h-5 text-blue-500 opacity-50" />
                                            </div>
                                            <p className="text-xs text-gray-400 mb-6 leading-relaxed line-clamp-2 h-10">{strat.description}</p>
                                            
                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400">
                                                        {strat.user_name[0]}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-500">{strat.user_name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleApplyFilter(strat)}
                                                    disabled={scanningId === strat.id}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                                >
                                                    {scanningId === strat.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Download className="w-3 h-3" />
                                                    )}
                                                    {scanningId === strat.id ? "스캔 중..." : "필터 적용"}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}
                        
                        {activeTab === 'poll' && (
                            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                                <div className="p-8 text-center space-y-6">
                                    <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto border border-yellow-400/20">
                                        <Trophy className="w-10 h-10 text-yellow-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black tracking-tighter">인간 vs AI 수익률 챌린지</h3>
                                        <p className="text-gray-400 text-sm max-w-sm mx-auto">
                                            사용자가 투표한 테마와 AI가 분석한 테마 중,<br/>내일 실제로 더 많이 오르는 쪽은 어디일까요?
                                        </p>
                                    </div>
                                    <div className="pt-4 flex flex-col gap-2">
                                        <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
                                            <span className="text-sm font-bold text-yellow-200">배타 서비스 준비 중입니다.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: AI Insights & Rules */}
                    <div className="space-y-6">
                        
                        {/* AI Sentiment Board */}
                        {activeTab === 'lounge' && (
                            <div className="bg-gradient-to-br from-indigo-900/40 to-black rounded-3xl p-6 border border-indigo-500/20 shadow-xl overflow-hidden relative">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                                <h4 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> AI 여론 분석 보드
                                </h4>
                                
                                <div className="space-y-6">
                                    <div className="flex items-end justify-between mb-1">
                                        <span className="text-xs text-gray-400 font-bold">집단 심리 지표</span>
                                        <span className={`text-2xl font-black ${sentiment.score > 50 ? 'text-green-400' : 'text-rose-400'} flex items-center gap-1`}>
                                            {sentiment.score.toFixed(0)} <small className="text-sm opacity-60">pts</small>
                                        </span>
                                    </div>
                                    
                                    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/10">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${sentiment.score}%` }}
                                            className={`h-full ${sentiment.score > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-rose-500 to-red-500'}`}
                                        />
                                    </div>
                                    
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 shadow-inner">
                                        <div className="flex gap-3 items-start">
                                            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                            <p className="text-xs text-gray-300 leading-relaxed italic font-medium">
                                                "{sentiment.summary}"
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <StatCard label="총 대화수" value={`${chats.length}건`} />
                                        <StatCard label="분위기" value={sentiment.score >= 70 ? "낙관적" : sentiment.score >= 40 ? "중립" : "비관적"} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Safety Rules */}
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> 커뮤니티 가이드라인
                            </h4>
                            <ul className="space-y-4">
                                <RuleItem icon={<AlertTriangle className="text-rose-400 w-4 h-4"/>} text="특정 종목 추천 및 수익 보장 행위 금지" />
                                <RuleItem icon={<AlertTriangle className="text-rose-400 w-4 h-4"/>} text="수익금 인증을 통한 가입 유도 금지" />
                                <RuleItem icon={<CheckCircle2 className="text-blue-400 w-4 h-4"/>} text="데이터와 기술 지표 기반의 정보 공유" />
                                <RuleItem icon={<CheckCircle2 className="text-blue-400 w-4 h-4"/>} text="개인 연락처 정보 노출 절대 금지" />
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* 전략 결과 모달 */}
            <StrategyResultModal 
                isOpen={showResultModal}
                onClose={() => setShowResultModal(false)}
                results={scanResults}
                strategyName={selectedStrategyTitle}
            />
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-black transition-all whitespace-nowrap
                ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-2px]' : 'text-gray-400 hover:text-white hover:bg-white/10'}
            `}
        >
            {icon}
            {label}
        </button>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-tighter">{label}</p>
            <p className="text-sm font-black text-white">{value}</p>
        </div>
    );
}

function RuleItem({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <li className="flex gap-4 items-start group">
            <div className="mt-1 shrink-0 group-hover:scale-125 transition-transform">{icon}</div>
            <span className="text-xs text-gray-400 font-bold leading-relaxed">{text}</span>
        </li>
    );
}
