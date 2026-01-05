"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Typewriter from "@/components/Typewriter";

interface Message {
    role: 'user' | 'ai';
    content: string;
    time: string;
    isNew?: boolean;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'ai',
            content: "안녕하세요! 저는 AI 주식 상담사입니다. \n종목 분석, 시황 질문, 투자 고민 등 무엇이든 물어보세요! \n(예: '테슬라 지금 사도 될까?', '오늘 나스닥 어때?')",
            time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            isNew: true
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            role: 'user',
            content: input,
            time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            isNew: false
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

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

    return (
        <div className="min-h-screen flex flex-col text-white">
            <Header title="AI 주식 상담 챗봇" subtitle="24시간 깨어있는 나만의 투자 멘토" />

            <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full flex flex-col h-[calc(100vh-100px)]">
                {/* Chat Area */}
                <div className="flex-1 bg-black/40 border border-white/20 rounded-3xl p-4 md:p-6 mb-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10" ref={scrollRef}>
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
                        placeholder="메시지를 입력하세요 (Shift + Enter for new line)..."
                        className="w-full bg-black/60 border border-white/20 rounded-2xl pl-6 pr-16 py-4 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-xl"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition-all active:scale-95"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
