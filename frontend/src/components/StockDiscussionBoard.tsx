'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';

interface ChatMessage {
    id: number;
    user_name: string;
    text: string;
    timestamp: string;
    likes: number;
    user_id: string;
}

interface StockDiscussionBoardProps {
    ticker: string;
    name: string;
}

export default function StockDiscussionBoard({ ticker, name }: StockDiscussionBoardProps) {
    const [chats, setChats] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchChats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/lounge?symbol=${ticker}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success') {
                    setChats(data.data);
                }
            }
        } catch (e) {
            console.error("Failed to fetch chats", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
        
        // Polling every 10 seconds to keep the board feeling alive
        const interval = setInterval(fetchChats, 10000);
        return () => clearInterval(interval);
    }, [ticker]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/lounge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: inputText.trim(),
                    symbol: ticker,
                    user_id: typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'unknown' : 'unknown'
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success') {
                    setInputText('');
                    // Fetch immediately after posting
                    fetchChats();
                }
            }
        } catch (e) {
            console.error("Failed to post chat", e);
            alert("메시지 전송에 실패했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async (id: number) => {
        try {
            const user_id = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'unknown' : 'unknown';
            await fetch(`${API_BASE_URL}/api/community/lounge/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id })
            });
            fetchChats(); // Refresh likes
        } catch (e) {
            console.error("Like failed", e);
        }
    };

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-12 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span>💬</span> {name} 미니 종토방
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        이 종목에 대한 자유로운 의견을 남겨주세요. (로그인 없이 즉시 작성 가능)
                    </p>
                </div>
                <div className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-sm">
                    실시간
                </div>
            </div>

            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="text-center py-8 text-slate-500">데이터를 불러오는 중입니다...</div>
                ) : chats.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-800 border-dashed">
                        <p className="text-slate-400">아직 등록된 의견이 없습니다.</p>
                        <p className="text-indigo-400 mt-2 font-medium">첫 번째 댓글의 주인공이 되어보세요!</p>
                    </div>
                ) : (
                    chats.map((chat) => (
                        <div key={chat.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                        {chat.user_name.charAt(0)}
                                    </div>
                                    <span className="font-semibold text-slate-200 text-sm">{chat.user_name}</span>
                                </div>
                                <span className="text-xs text-slate-500">{formatDate(chat.timestamp)}</span>
                            </div>
                            <p className="text-slate-300 text-[15px] leading-relaxed whitespace-pre-wrap ml-10">
                                {chat.text}
                            </p>
                            <div className="flex justify-end mt-2">
                                <button 
                                    onClick={() => handleLike(chat.id)}
                                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-pink-400 transition-colors"
                                >
                                    <span>❤️</span> {chat.likes || 0}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`${name} 가즈아!!!! (응원 한마디 남기기)`}
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim() || isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
                >
                    {isSubmitting ? '전송중...' : '등록'}
                </button>
            </form>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #334155;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
