"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import { Send, Bot, User, Loader2, Sparkles, Lock, PlayCircle, Crown } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Typewriter from "@/components/Typewriter";
import ProModal from "@/components/ProModal";
import AdRewardModal from "@/components/AdRewardModal";
import AIDisclaimer from "@/components/AIDisclaimer";

import { isFreeModeEnabled } from "@/lib/adminMode";

interface Message {
    role: 'user' | 'ai';
    content: string;
    time: string;
    isNew?: boolean;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // [Pro & Ad]
    const [showProModal, setShowProModal] = useState(false);
    const [showAdModal, setShowAdModal] = useState(false);
    const [dailyCount, setDailyCount] = useState(0);
    const [dailyLimit, setDailyLimit] = useState(3); // Mutable limit
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        setMessages([
            {
                role: 'ai',
                content: "안녕하세요! 저는 AI 주식 상담사입니다. \n종목 분석, 시황 질문, 투자 고민 등 무엇이든 물어보세요! \n(예: '테슬라 최근 실적은?', '오늘 나스닥 어때?')",
                time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                isNew: true
            }
        ]);

        // Check Pro & Daily Usage & Limit
        const checkStatus = () => {
            const localPro = localStorage.getItem("isPro") === "true";
            setIsPro(localPro || isFreeModeEnabled());
            const today = new Date().toDateString();

            // Usage Count
            const usageStored = localStorage.getItem("chatUsage");
            if (usageStored) {
                const { date, count } = JSON.parse(usageStored);
                if (date === today) {
                    setDailyCount(count);
                } else {
                    setDailyCount(0);
                    localStorage.setItem("chatUsage", JSON.stringify({ date: today, count: 0 }));
                }
            }

            // Daily Limit (Persist limit increases for the day)
            const limitStored = localStorage.getItem("chatLimit");
            if (limitStored) {
                const { date, limit } = JSON.parse(limitStored);
                if (date === today) {
                    setDailyLimit(limit);
                } else {
                    setDailyLimit(3); // Reset to default
                    localStorage.setItem("chatLimit", JSON.stringify({ date: today, limit: 3 }));
                }
            } else {
                localStorage.setItem("chatLimit", JSON.stringify({ date: today, limit: 3 }));
            }
        };
        checkStatus();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        // [Unlock Check]
        if (!isPro && dailyCount >= dailyLimit) {
            // Wait, don't auto-show Pro modal, let user choose in UI
            // But if they hit enter on locked input, show Ad Modal by default
            setShowAdModal(true);
            return;
        }

        const userMsg: Message = {
            role: 'user',
            content: input,
            time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            isNew: false
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        // Increment Usage
        if (!isPro) {
            const newCount = dailyCount + 1;
            setDailyCount(newCount);
            localStorage.setItem("chatUsage", JSON.stringify({
                date: new Date().toDateString(),
                count: newCount
            }));
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content })
            });
            const json = await res.json();

            if (json.status === "success") {
                const aiMsg: Message = {
                    role: 'ai',
                    content: json.reply,
                    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                    isNew: true
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                role: 'ai',
                content: "죄송해요, 서버 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요. 😓",
                time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                isNew: true
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Increase Limit on Ad Watch
    const handleAdReward = () => {
        const newLimit = dailyLimit + 1;
        setDailyLimit(newLimit);
        localStorage.setItem("chatLimit", JSON.stringify({
            date: new Date().toDateString(),
            limit: newLimit
        }));
        setShowAdModal(false);
        alert("광고 보상 완료! 대화 기회가 1회 추가되었습니다. 🎉");
    };

    const isLocked = !isPro && dailyCount >= dailyLimit;

    return (
        <div className="min-h-screen flex flex-col text-white">
            <Header title="AI 주식 상담 챗봇" subtitle="24시간 깨어있는 나만의 투자 멘토" />
            <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
            <AdRewardModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onReward={handleAdReward}
                featureName="ChatUsage"
            />

            <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full flex flex-col h-[calc(100vh-100px)]">
                {/* Free User Usage Badge */}
                {!isPro && (
                    <div className="mb-4 flex justify-center">
                        <div className="bg-white/10 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-300 flex items-center gap-2">
                            {isLocked ? (
                                <span className="text-red-400 font-bold flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> 무료 사용량 초과 ({dailyCount}/{dailyLimit})
                                </span>
                            ) : (
                                <span>
                                    일일 사용량: <span className="text-blue-400 font-bold">{dailyCount}</span> / {dailyLimit}회
                                </span>
                            )}
                            <button
                                onClick={() => setShowProModal(true)}
                                className="ml-2 text-[10px] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-2 py-0.5 rounded text-white font-bold transition-all flex items-center gap-1"
                            >
                                <Crown className="w-3 h-3" /> 무제한
                            </button>
                        </div>
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 bg-black/40 border border-white/20 rounded-3xl p-4 md:p-6 mb-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10" ref={scrollRef}>
                    <AIDisclaimer isCompact={true} className="mt-0 mb-6 bg-purple-500/5 border-purple-500/20" />
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[80%] md:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                                {/* Avatar */}
                                <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                </div>

                                {/* Bubble */}
                                <div>
                                    <div className={`p-3 md:p-4 rounded-2xl whitespace-pre-wrap text-sm md:text-base leading-relaxed shadow-md ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white/10 border border-white/10 text-gray-100 rounded-tl-none'
                                        }`}>
                                        {msg.role === 'ai' && <div className="flex items-center gap-1 text-xs text-purple-300 font-bold mb-1"><Sparkles className="w-3 h-3" /> AI Analyst</div>}
                                        {msg.role === 'ai' && msg.isNew ? (
                                            <Typewriter text={msg.content} speed={10} />
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                    <div className={`text-[10px] text-gray-500 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                        {msg.time}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center animate-pulse">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="bg-white/10 border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                    <span className="text-sm text-gray-400">데이터를 분석하고 있어요...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isLocked ? "무료 사용량을 다 썼어요! 광고 보고 충전하세요 ⚡" : "궁금한 걸 물어보세요..."}
                        className={`w-full bg-black/60 border border-white/20 rounded-2xl pl-4 pr-14 py-3 md:py-4 text-sm md:text-base outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-xl placeholder-gray-500 ${isLocked ? 'opacity-50' : ''}`}
                        disabled={loading || isLocked}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading || isLocked}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
                    </button>

                    {/* Unlock Options when Locked */}
                    {isLocked && (
                        <div className="absolute inset-x-0 -top-20 md:-top-16 flex items-center justify-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
                            <button
                                onClick={() => setShowAdModal(true)}
                                className="bg-gray-800 hover:bg-gray-700 text-white border border-white/20 rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 transform hover:scale-105 transition-all group"
                            >
                                <PlayCircle className="w-5 h-5 text-yellow-400 group-hover:rotate-12 transition-transform" />
                                <div className="text-left">
                                    <div className="text-xs text-gray-400">무료 충전</div>
                                    <div className="font-bold text-sm">광고 보고 +1회</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setShowProModal(true)}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 transform hover:scale-105 transition-all shadow-blue-600/30"
                            >
                                <Crown className="w-5 h-5 text-white animate-pulse" />
                                <div className="text-left">
                                    <div className="text-xs text-blue-200">제한 없이</div>
                                    <div className="font-bold text-sm">PRO 업그레이드</div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
