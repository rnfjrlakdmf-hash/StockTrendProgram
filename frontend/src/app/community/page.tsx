"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { 
    Users, MessageSquare, ShieldAlert, Send, 
    TrendingUp, TrendingDown, Info, AlertTriangle,
    CheckCircle2, Loader2, Sparkles, X,
    Search, Flame, ArrowLeft, MessageCircle, ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface ChatReply {
    id: number;
    user_name: string;
    text: string;
    timestamp: string;
}

interface ChatMessage {
    id: number;
    user_name: string;
    text: string;
    timestamp: string;
    symbol: string;
    profit?: number; // [New] 수익률 인증
    image_url?: string; // [New] 인증 이미지
    replies?: ChatReply[]; // [New] 답글
}

interface HotStock {
    symbol: string;
    count: number;
}

import { Suspense } from "react";

export default function CommunityPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
            <CommunityContent />
        </Suspense>
    );
}

function CommunityContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'lounge' | 'stock_talk'>('lounge');
    
    // Lounge States
    const [chats, setChats] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [sentiment, setSentiment] = useState({ score: 50, summary: "분석 중..." });
    
    // Stock Talk States
    const [targetSymbol, setTargetSymbol] = useState<string | null>(null);
    const [symbolInput, setSymbolInput] = useState("");
    const [stockChats, setStockChats] = useState<ChatMessage[]>([]);
    const [stockSending, setStockSending] = useState(false);
    const [stockInputText, setStockInputText] = useState("");
    const [stockSentiment, setStockSentiment] = useState({ score: 50, summary: "분석 중..." });
    const [hotStocks, setHotStocks] = useState<HotStock[]>([]);
    const [hotLoading, setHotLoading] = useState(false);
    
    // [New] Profit Input State
    const [profitInput, setProfitInput] = useState<string>("");
    
    // [New] Watchlist State
    const [watchlist, setWatchlist] = useState<any[]>([]);
    
    // [New] Reply States
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyInput, setReplyInput] = useState<string>("");
    const [replySending, setReplySending] = useState(false);
    
    // [New] Image Upload States
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
            setSelectedImagePreview(URL.createObjectURL(e.target.files[0]));
        }
    };
    
    const clearImage = () => {
        setSelectedImage(null);
        setSelectedImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const stockChatEndRef = useRef<HTMLDivElement>(null);

    // Auto-enter stock room from ?stock= query param (when coming from discovery page)
    useEffect(() => {
        const stockParam = searchParams.get('stock');
        if (stockParam) {
            setActiveTab('stock_talk');
            setTargetSymbol(stockParam.toUpperCase());
        }
    }, [searchParams]);

    // Fetch lounge chats on tab switch & auto-refresh
    useEffect(() => {
        if (activeTab === 'lounge') {
            fetchChats();
            const interval = setInterval(fetchChats, 5000);
            return () => clearInterval(interval);
        }
        if (activeTab === 'stock_talk') {
            fetchHotStocks();
            if (user) fetchWatchlist(); // [New] Fetch watchlist when logged in
            const interval = setInterval(fetchHotStocks, 10000);
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    // Auto-refresh stock talk room
    useEffect(() => {
        if (!targetSymbol) return;
        fetchStockChats(targetSymbol);
        const interval = setInterval(() => fetchStockChats(targetSymbol), 5000);
        return () => clearInterval(interval);
    }, [targetSymbol]);

    const fetchChats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/lounge?symbol=global`);
            const json = await res.json();
            if (json.status === "success") {
                setChats(json.data);
                fetchSentiment("global");
            }
        } catch (e) { console.error(e); }
    };

    const fetchStockChats = async (sym: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/lounge?symbol=${encodeURIComponent(sym)}`);
            const json = await res.json();
            if (json.status === "success") {
                // Filter to only this symbol's messages
                setStockChats(json.data.filter((c: ChatMessage) => c.symbol === sym));
                fetchSentiment(sym, true);
            }
        } catch (e) { console.error(e); }
    };

    const fetchSentiment = async (sym: string, isStock = false) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/sentiment/${encodeURIComponent(sym)}`);
            const json = await res.json();
            if (json.status === "success") {
                if (isStock) setStockSentiment(json.data);
                else setSentiment(json.data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchHotStocks = async () => {
        setHotLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/hot-stocks`);
            const json = await res.json();
            if (json.status === "success") setHotStocks(json.data);
        } catch (e) { console.error(e); }
        finally { setHotLoading(false); }
    };

    const fetchWatchlist = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/watchlist`, { headers: { 'x-user-id': user.id } });
            const json = await res.json();
            if (json.status === "success") setWatchlist(json.data);
        } catch (e) { console.error(e); }
    };

    const handleSendMessage = async () => {
        if ((!inputText.trim() && !selectedImage) || sending) return;
        if (!user) { alert("로그인이 필요한 서비스입니다."); return; }
        setSending(true);
        try {
            let uploadedUrl = null;
            if (selectedImage) {
                const formData = new FormData();
                formData.append("file", selectedImage);
                const uploadRes = await fetch(`${API_BASE_URL}/api/community/upload`, { method: "POST", body: formData });
                const uploadJson = await uploadRes.json();
                if (uploadJson.status === "success") uploadedUrl = uploadJson.url;
            }

            const payload: any = { user_name: user.name, text: inputText, symbol: "global" };
            if (uploadedUrl) payload.image_url = uploadedUrl;
            
            const res = await fetch(`${API_BASE_URL}/api/community/lounge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.status === "success") { setInputText(""); clearImage(); fetchChats(); }
            else if (json.status === "blocked") { alert(json.message); setInputText(""); clearImage(); }
        } catch (e) { console.error(e); }
        finally { setSending(false); }
    };

    const handleSendStockMessage = async () => {
        if ((!stockInputText.trim() && !selectedImage) || stockSending || !targetSymbol) return;
        if (!user) { alert("로그인이 필요한 서비스입니다."); return; }
        setStockSending(true);
        try {
            let uploadedUrl = null;
            if (selectedImage) {
                const formData = new FormData();
                formData.append("file", selectedImage);
                const uploadRes = await fetch(`${API_BASE_URL}/api/community/upload`, { method: "POST", body: formData });
                const uploadJson = await uploadRes.json();
                if (uploadJson.status === "success") uploadedUrl = uploadJson.url;
            }

            const payload: any = { user_name: user.name, text: stockInputText, symbol: targetSymbol };
            if (uploadedUrl) payload.image_url = uploadedUrl;

            const res = await fetch(`${API_BASE_URL}/api/community/lounge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.status === "success") { setStockInputText(""); clearImage(); fetchStockChats(targetSymbol); fetchHotStocks(); }
            else if (json.status === "blocked") { alert(json.message); setStockInputText(""); clearImage(); }
        } catch (e) { console.error(e); }
        finally { setStockSending(false); }
    };

    const handleSendReply = async (messageId: number) => {
        if (!replyInput.trim() || replySending) return;
        if (!user) { alert("로그인이 필요한 서비스입니다."); return; }
        setReplySending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/lounge/${messageId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_name: user.name, text: replyInput })
            });
            const json = await res.json();
            if (json.status === "success") { 
                setReplyInput(""); 
                setReplyingTo(null);
                if (activeTab === 'lounge') fetchChats();
                else if (targetSymbol) fetchStockChats(targetSymbol);
            }
        } catch (e) { console.error(e); }
        finally { setReplySending(false); }
    };

    const handleSymbolSearch = () => {
        if (!symbolInput.trim()) return;
        setTargetSymbol(symbolInput.trim().toUpperCase());
        setSymbolInput("");
    };

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chats]);
    useEffect(() => { stockChatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [stockChats]);

    // Intensity label
    const intensityLabel = (count: number) => {
        if (count >= 20) return { text: "🔥 매우 뜨거워요", color: "text-red-400" };
        if (count >= 10) return { text: "🌡️ 열기 상승중", color: "text-orange-400" };
        if (count >= 5) return { text: "💬 활발한 토론", color: "text-yellow-400" };
        return { text: "🌱 토론 시작", color: "text-emerald-400" };
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 pt-24">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter mb-2 flex items-center gap-3">
                            <Users className="w-10 h-10 text-blue-500" />
                            COMMUNITY
                        </h1>
                        <p className="text-gray-400 font-medium">집단 지성과 AI가 만나는 클린 투자 커뮤니티</p>
                    </div>
                    
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-start gap-3 max-w-md">
                        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-200/80 leading-relaxed font-bold">
                            본 커뮤니티는 유사투자자문행위 방지를 위해 실시간 AI 필터가 작동 중입니다. 
                            <span className="text-amber-500"> 특정 종목 추천, 수익 보장, 리딩 유도</span> 등의 발언은 즉시 삭제 및 차단될 수 있습니다.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
                    <TabButton active={activeTab === 'lounge'} onClick={() => setActiveTab('lounge')} icon={<MessageSquare className="w-4 h-4"/>} label="종합 라운지" />
                    <TabButton active={activeTab === 'stock_talk'} onClick={() => setActiveTab('stock_talk')} icon={<MessageCircle className="w-4 h-4"/>} label="종목 토론방" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left/Main Column */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* ─── 종합 라운지 ─── */}
                        {activeTab === 'lounge' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[650px] shadow-2xl"
                            >
                                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-sm font-bold text-gray-300">실시간 글로벌 라운지</span>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                                        <Sparkles className="w-3 h-3 text-blue-400" />
                                        <span className="text-[10px] font-bold text-blue-300">AI 심리 요약: {sentiment.score.toFixed(0)}점</span>
                                    </div>
                                </div>
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
                                                    <span className={`text-xs font-black ${chat.user_name === user?.name ? 'text-blue-400' : 'text-gray-400'}`}>{chat.user_name}</span>
                                                    <span className="text-[8px] text-gray-600 font-mono">
                                                        {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                                                    chat.user_name === user?.name 
                                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                                    : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                                                }`}>
                                                    {chat.text}
                                                    {chat.image_url && (
                                                        <div className="mt-2 border border-white/10 rounded-lg overflow-hidden w-fit">
                                                            <img src={`${API_BASE_URL}/uploads/${chat.image_url}`} alt="Attached" className="max-w-[200px] object-contain" />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Reply Button */}
                                                <button onClick={() => { setReplyingTo(replyingTo === chat.id ? null : chat.id); setReplyInput(""); }} 
                                                    className="text-[10px] text-gray-500 hover:text-white mt-0.5 ml-2 self-start flex items-center gap-1 transition-colors">
                                                    <MessageSquare className="w-3 h-3" /> 답글 달기
                                                </button>
                                                
                                                {/* Replies List */}
                                                {chat.replies && chat.replies.length > 0 && (
                                                    <div className="ml-4 mt-1 space-y-2 border-l-2 border-white/5 pl-4 py-1">
                                                        {chat.replies.map(r => (
                                                            <div key={r.id} className="flex flex-col gap-0.5">
                                                                <div className="flex items-baseline gap-2">
                                                                    <span className="text-[10px] font-bold text-gray-400">{r.user_name}</span>
                                                                    <span className="text-[8px] text-gray-600 font-mono">
                                                                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-300 bg-white/5 px-3 py-1.5 rounded-xl rounded-tl-none w-fit border border-white/5 max-w-[90%]">
                                                                    {r.text}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* Reply Input Box */}
                                                {replyingTo === chat.id && (
                                                    <div className="ml-4 mt-1 flex gap-2 w-[85%] animate-in slide-in-from-top-2 fade-in duration-200">
                                                        <input type="text" value={replyInput} onChange={e => setReplyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendReply(chat.id)} 
                                                            placeholder="답글을 입력하세요..." disabled={replySending}
                                                            className="flex-1 text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                                                        <button onClick={() => handleSendReply(chat.id)} disabled={replySending || !replyInput.trim()} 
                                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-colors">
                                                            {replySending ? <Loader2 className="w-3 h-3 animate-spin"/> : <Send className="w-3 h-3"/>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="p-4 bg-black/40 border-t border-white/10 space-y-3">
                                    {selectedImagePreview && (
                                        <div className="relative w-20 h-20 rounded-lg border border-white/10 overflow-hidden">
                                            <img src={selectedImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <button onClick={clearImage} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80"><X className="w-3 h-3 text-white"/></button>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        {/* Image Upload Button */}
                                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors shrink-0 group/img">
                                            <ImageIcon className="w-5 h-5 text-emerald-400 group-hover/img:text-emerald-300 transition-colors" />
                                            <span className="text-xs font-bold text-emerald-400/80 group-hover/img:text-emerald-300">인증샷</span>
                                        </button>
                                        
                                        <div className="relative group flex-1">
                                            <input 
                                                type="text" value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder={user ? "자유롭게 의견을 나누세요 (AI 모니터링 중)" : "로그인 후 대화에 참여하세요"}
                                                disabled={!user || sending}
                                                className="w-full h-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pr-14 group-hover:bg-white/10"
                                            />
                                            <button onClick={handleSendMessage} disabled={!user || (!inputText.trim() && !selectedImage) || sending}
                                                className="absolute right-2 top-2 p-3 bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/40">
                                                {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-center font-medium">건전한 대화 문화를 위해 <span className="text-blue-400">데이터 기반 분석</span> 위주로 소통해 주세요.</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── 종목 토론방 ─── */}
                        {activeTab === 'stock_talk' && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                
                                {targetSymbol ? (
                                    /* 토론방 내부 */
                                    <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[650px] shadow-2xl">
                                        {/* Room Header */}
                                        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-purple-900/40 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setTargetSymbol(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                                                    <ArrowLeft className="w-4 h-4 text-gray-400" />
                                                </button>
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <div>
                                                    <p className="text-xs text-gray-400 font-bold">종목 토론방</p>
                                                    <p className="text-base font-black text-white">{targetSymbol}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                                                    <Sparkles className="w-3 h-3 text-blue-400" />
                                                    <span className="text-[10px] font-bold text-blue-300">심리: {stockSentiment.score.toFixed(0)}점</span>
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/discovery?q=${encodeURIComponent(targetSymbol)}`)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 transition-all"
                                                >
                                                    <TrendingUp className="w-3 h-3" />
                                                    종목 분석 보기
                                                </button>
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                                            {stockChats.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                                                    <MessageCircle className="w-12 h-12 opacity-20" />
                                                    <p className="text-sm font-bold">{targetSymbol} 토론방에 첫 번째로 의견을 남겨보세요!</p>
                                                    <p className="text-xs text-gray-600">데이터 기반의 객관적인 의견을 공유해 주세요</p>
                                                </div>
                                            ) : (
                                                stockChats.map((chat) => (
                                                    <div key={chat.id} className="flex flex-col gap-1">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className={`text-xs font-black ${chat.user_name === user?.name ? 'text-blue-400' : 'text-gray-400'}`}>{chat.user_name}</span>
                                                            {chat.profit !== undefined && (
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${chat.profit > 0 ? 'bg-red-500/20 text-red-400' : chat.profit < 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                                    수익 {chat.profit > 0 ? '+' : ''}{chat.profit}%
                                                                </span>
                                                            )}
                                                            <span className="text-[8px] text-gray-600 font-mono">
                                                                {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                                                            chat.user_name === user?.name 
                                                            ? 'bg-blue-600 text-white rounded-tr-none' 
                                                            : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                                                        }`}>
                                                            {chat.text}
                                                        </div>
                                                        
                                                        {/* Reply Button */}
                                                        <button onClick={() => { setReplyingTo(replyingTo === chat.id ? null : chat.id); setReplyInput(""); }} 
                                                            className="text-[10px] text-gray-500 hover:text-white mt-0.5 ml-2 self-start flex items-center gap-1 transition-colors">
                                                            <MessageSquare className="w-3 h-3" /> 답글 달기
                                                        </button>
                                                        
                                                        {/* Replies List */}
                                                        {chat.replies && chat.replies.length > 0 && (
                                                            <div className="ml-4 mt-1 space-y-2 border-l-2 border-white/5 pl-4 py-1">
                                                                {chat.replies.map(r => (
                                                                    <div key={r.id} className="flex flex-col gap-0.5">
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className="text-[10px] font-bold text-gray-400">{r.user_name}</span>
                                                                            <span className="text-[8px] text-gray-600 font-mono">
                                                                                {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-xs text-gray-300 bg-white/5 px-3 py-1.5 rounded-xl rounded-tl-none w-fit border border-white/5 max-w-[90%]">
                                                                            {r.text}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        
                                                        {/* Reply Input Box */}
                                                        {replyingTo === chat.id && (
                                                            <div className="ml-4 mt-1 flex gap-2 w-[85%] animate-in slide-in-from-top-2 fade-in duration-200">
                                                                <input type="text" value={replyInput} onChange={e => setReplyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendReply(chat.id)} 
                                                                    placeholder="답글을 입력하세요..." disabled={replySending}
                                                                    className="flex-1 text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                                                                <button onClick={() => handleSendReply(chat.id)} disabled={replySending || !replyInput.trim()} 
                                                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-colors">
                                                                    {replySending ? <Loader2 className="w-3 h-3 animate-spin"/> : <Send className="w-3 h-3"/>}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                            <div ref={stockChatEndRef} />
                                        </div>

                                        {/* Input */}
                                        <div className="p-4 bg-black/40 border-t border-white/10 space-y-3">
                                            {selectedImagePreview && (
                                                <div className="relative w-20 h-20 rounded-lg border border-white/10 overflow-hidden">
                                                    <img src={selectedImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                    <button onClick={clearImage} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80"><X className="w-3 h-3 text-white"/></button>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                {/* Image Upload Button */}
                                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors shrink-0 group/img">
                                                    <ImageIcon className="w-5 h-5 text-emerald-400 group-hover/img:text-emerald-300 transition-colors" />
                                                    <span className="text-xs font-bold text-emerald-400/80 group-hover/img:text-emerald-300">인증샷</span>
                                                </button>
                                                
                                                <div className="relative group flex-1">
                                                    <input 
                                                        type="text" value={stockInputText}
                                                        onChange={(e) => setStockInputText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSendStockMessage()}
                                                        placeholder={user ? `${targetSymbol}에 대한 의견을 나눠보세요` : "로그인 후 대화에 참여하세요"}
                                                        disabled={!user || stockSending}
                                                        className="w-full h-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pr-14 group-hover:bg-white/10"
                                                    />
                                                    <button onClick={handleSendStockMessage} disabled={!user || (!stockInputText.trim() && !selectedImage) || stockSending}
                                                        className="absolute right-2 top-2 p-3 bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95">
                                                        {stockSending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* 종목 검색 화면 */
                                    <div className="space-y-6">
                                        {/* Search */}
                                        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-3xl p-6 border border-white/10 shadow-2xl">
                                            <h3 className="text-lg font-black text-white mb-1">종목 토론방 입장</h3>
                                            <p className="text-xs text-gray-400 mb-4">종목 코드 또는 종목명을 입력하면 해당 종목 전용 토론방으로 입장합니다. 종목발굴 탭에서 분석할 때도 자동으로 연결됩니다!</p>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" value={symbolInput}
                                                    onChange={(e) => setSymbolInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSymbolSearch()}
                                                    placeholder="예: 005930, 삼성전자, AAPL..."
                                                    className="flex-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500"
                                                />
                                                <button onClick={handleSymbolSearch}
                                                    className="px-5 py-3 bg-blue-600 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap">
                                                    <Search className="w-4 h-4" /> 입장
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Hot Stocks Ranking */}
                                            <div className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-xl">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Flame className="w-4 h-4 text-orange-400" /> 실시간 인기 토론 종목
                                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse ml-1" />
                                                </h3>
                                                {hotLoading ? (
                                                    <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                                                ) : hotStocks.length === 0 ? (
                                                    <div className="py-10 text-center text-gray-500">
                                                        <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                        <p className="text-sm">아직 종목 토론이 없습니다.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {hotStocks.map((item, idx) => {
                                                            const intensity = intensityLabel(item.count);
                                                            return (
                                                                <button key={item.symbol} onClick={() => setTargetSymbol(item.symbol)}
                                                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-black/30 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all group">
                                                                    <div className={`text-2xl font-black w-8 text-center ${
                                                                        idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-600'
                                                                    }`}>{idx + 1}</div>
                                                                    <div className="flex-1 text-left">
                                                                        <p className="font-black text-white group-hover:text-blue-300 transition-colors">{item.symbol}</p>
                                                                        <p className={`text-xs font-bold ${intensity.color}`}>{intensity.text}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="flex items-center gap-1 px-3 py-1 bg-white/5 rounded-xl border border-white/10">
                                                                            <MessageCircle className="w-3 h-3 text-gray-400" />
                                                                            <span className="text-sm font-black text-white">{item.count}</span>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* My Watchlist Rooms */}
                                            <div className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-xl flex flex-col">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-purple-400" /> 관심주식 종목 토론방
                                                </h3>
                                                {!user ? (
                                                    <div className="flex-1 py-10 flex flex-col items-center justify-center text-gray-500 text-center">
                                                        <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                        <p className="text-sm font-bold">로그인 후 이용할 수 있습니다</p>
                                                        <p className="text-xs mt-1">관심종목을 등록하고 토론방에 바로 입장하세요</p>
                                                    </div>
                                                ) : watchlist.length === 0 ? (
                                                    <div className="flex-1 py-10 flex flex-col items-center justify-center text-gray-500 text-center">
                                                        <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                        <p className="text-sm font-bold">관심종목이 없습니다</p>
                                                        <p className="text-xs mt-1">종목을 추가하여 빠른 토론방 입장을 즐겨보세요</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {watchlist.map((item) => (
                                                            <button key={item.symbol} onClick={() => setTargetSymbol(item.symbol)}
                                                                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/30 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all group">
                                                                <p className="font-black text-white group-hover:text-purple-300 transition-colors text-lg">{item.symbol}</p>
                                                                <p className="text-[10px] text-gray-500 mt-1">입장하기 &rarr;</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                    </div>

                    {/* ─── Right Column ─── */}
                    <div className="space-y-6">
                        
                        {/* Lounge Sentiment */}
                        {activeTab === 'lounge' && (
                            <div className="bg-gradient-to-br from-indigo-900/40 to-black rounded-3xl p-6 border border-indigo-500/20 shadow-xl overflow-hidden relative">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                                <h4 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> AI 여론 분석 보드
                                </h4>
                                <div className="space-y-6">
                                    <div className="flex items-end justify-between mb-1">
                                        <span className="text-xs text-gray-400 font-bold">집단 심리 지표</span>
                                        <span className={`text-2xl font-black ${sentiment.score > 50 ? 'text-green-400' : 'text-rose-400'}`}>
                                            {sentiment.score.toFixed(0)} <small className="text-sm opacity-60">pts</small>
                                        </span>
                                    </div>
                                    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/10">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${sentiment.score}%` }}
                                            className={`h-full ${sentiment.score > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-rose-500 to-red-500'}`} />
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <div className="flex gap-3 items-start">
                                            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                            <p className="text-xs text-gray-300 leading-relaxed italic font-medium">"{sentiment.summary}"</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <StatCard label="총 대화수" value={`${chats.length}건`} />
                                        <StatCard label="분위기" value={sentiment.score >= 70 ? "낙관적" : sentiment.score >= 40 ? "중립" : "비관적"} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stock Talk Sentiment (when in a room) */}
                        {activeTab === 'stock_talk' && targetSymbol && (
                            <div className="bg-gradient-to-br from-blue-900/40 to-black rounded-3xl p-6 border border-blue-500/20 shadow-xl overflow-hidden relative">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                                <h4 className="text-sm font-black text-blue-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> {targetSymbol} 토론 심리
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex items-end justify-between">
                                        <span className="text-xs text-gray-400 font-bold">현재 심리 지표</span>
                                        <span className={`text-2xl font-black ${stockSentiment.score > 50 ? 'text-green-400' : 'text-rose-400'}`}>
                                            {stockSentiment.score.toFixed(0)} <small className="text-sm opacity-60">pts</small>
                                        </span>
                                    </div>
                                    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/10">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${stockSentiment.score}%` }}
                                            className={`h-full ${stockSentiment.score > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-rose-500 to-red-500'}`} />
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <p className="text-xs text-gray-300 italic">"{stockSentiment.summary}"</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <StatCard label="토론 수" value={`${stockChats.length}건`} />
                                        <StatCard label="종목" value={targetSymbol} />
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
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button onClick={onClick} className={`
            flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-black transition-all whitespace-nowrap
            ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-2px]' : 'text-gray-400 hover:text-white hover:bg-white/10'}
        `}>
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
