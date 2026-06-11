"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, ThumbsUp, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ChatMessage {
  id: number;
  user_name: string;
  text: string;
  symbol: string;
  profit_verified?: number;
  likes: number;
  timestamp: string;
  user_id: string;
  points?: number;
}

export default function StockChatBoard({ symbol }: { symbol: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    try {
      const res = await fetch(`/api/community/lounge?symbol=${symbol}`);
      const data = await res.json();
      if (data.status === "success") {
        setMessages(data.data.reverse()); // 최신 글이 아래로 오도록
      }
    } catch (e) {
      console.error("Failed to fetch chats:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000); // 5초마다 폴링
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      user_name: "전송 중...",
      text: inputText,
      symbol: symbol,
      likes: 0,
      timestamp: new Date().toISOString(),
      user_id: user?.id || "unknown",
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    const textToSend = inputText;
    setInputText("");

    try {
      await fetch("/api/community/lounge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          text: textToSend,
          user_id: user?.id || "unknown",
        }),
      });
      fetchChats();
    } catch (e) {
      console.error("Failed to send chat", e);
    }
  };

  const handleLike = async (id: number) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const res = await fetch(`/api/community/lounge/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
        );
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col h-[600px]">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        <h3 className="font-bold text-lg text-white">실시간 종목 토론방</h3>
        <span className="ml-auto text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">
          {symbol}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
        {isLoading ? (
          <div className="text-center text-gray-500 text-sm mt-10 animate-pulse">로딩 중...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-10">
            첫 번째 의견을 남겨보세요!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = user && msg.user_id === user.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="text-[10px] text-gray-500 font-bold mb-1 ml-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {msg.user_name}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] ${
                  isMe ? "bg-indigo-600 text-white rounded-br-sm" : "bg-white/10 text-gray-200 rounded-bl-sm"
                }`}>
                  <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-gray-600 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button 
                    onClick={() => handleLike(msg.id)}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-rose-400 transition-colors"
                  >
                    <ThumbsUp className="w-3 h-3" /> {msg.likes > 0 && msg.likes}
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2 relative">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="건전한 토론 문화를 만들어가요."
          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white p-3 rounded-xl transition-colors flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
