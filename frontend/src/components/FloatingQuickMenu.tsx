"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, ChevronUp, Search, Star, Home, X, TrendingUp, TrendingDown, RefreshCw, Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

export default function FloatingQuickMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user } = useAuth();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsWatchlistOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchWatchlist = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json = await res.json();
            if (json.status === "success" && Array.isArray(json.data)) {
                setWatchlist(json.data);
            }
        } catch (error) {
            console.error("Failed to fetch watchlist for quick menu:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleWatchlist = () => {
        if (!isWatchlistOpen) {
            fetchWatchlist();
        }
        setIsWatchlistOpen(!isWatchlistOpen);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setIsOpen(false);
    };

    const openSearch = () => {
        setIsSearchOpen(true);
        setIsOpen(false);
    };

    const navSettings = () => {
        router.push("/settings");
        setIsOpen(false);
    };

    const navHome = () => {
        router.push("/");
        setIsOpen(false);
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;
        router.push(`/discovery?q=${encodeURIComponent(searchQuery)}`);
        setIsSearchOpen(false);
        setSearchQuery("");
    };

    return (
        <>
        {/* Global Search Modal */}
        {isSearchOpen && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
                <div 
                    className="absolute inset-0"
                    onClick={() => setIsSearchOpen(false)}
                />
                <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden transform scale-100 animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Search className="w-5 h-5 text-cyan-400" />
                            통합 종목 검색
                        </h3>
                        <button onClick={() => setIsSearchOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-5">
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="종목명 또는 코드 입력 (예: 삼성전자)"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 pl-12 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-lg"
                            />
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <button
                                type="submit"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                            >
                                검색
                            </button>
                        </form>
                        <div className="mt-5">
                            <p className="text-xs text-gray-500 mb-2 font-bold">인기 검색어</p>
                            <div className="flex flex-wrap gap-2">
                                {['삼성전자', '비트코인', '테슬라', '에코프로', '엔비디아'].map(term => (
                                    <button
                                        key={term}
                                        onClick={() => {
                                            router.push(`/discovery?q=${encodeURIComponent(term)}`);
                                            setIsSearchOpen(false);
                                        }}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/50 rounded-lg text-sm text-gray-300 transition-colors"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div ref={menuRef} className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[1000] flex flex-col items-end">
            {/* Mini Watchlist Panel */}
            <div 
                className={`absolute bottom-16 right-16 w-72 mb-4 bg-black/80 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-[0_8px_32px_rgba(6,182,212,0.2)] overflow-hidden transition-all duration-300 transform origin-bottom-right ${
                    isWatchlistOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-50 opacity-0 pointer-events-none"
                }`}
            >
                <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        미니 관심종목
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchWatchlist} className="p-1 hover:bg-white/10 rounded-md transition-colors" disabled={isLoading}>
                            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setIsWatchlistOpen(false)} className="p-1 hover:bg-white/10 rounded-md transition-colors">
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                    {!user ? (
                        <div className="py-8 text-center text-xs text-gray-400">
                            로그인이 필요한 서비스입니다.
                        </div>
                    ) : isLoading && watchlist.length === 0 ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : watchlist.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-400">
                            등록된 관심종목이 없습니다.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {watchlist.map((item, idx) => {
                                const changeRate = typeof item.change_rate === 'number' ? item.change_rate : parseFloat(item.change_rate) || 0;
                                const isUp = changeRate > 0;
                                const isDown = changeRate < 0;
                                return (
                                    <Link key={idx} href={`/analysis?code=${item.code}`} onClick={() => setIsWatchlistOpen(false)}>
                                        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-pointer">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white truncate max-w-[120px]">{item.name}</span>
                                                <span className="text-[10px] text-gray-500">{item.code}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-xs font-bold ${isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-gray-300'}`}>
                                                    {Number(item.price || 0).toLocaleString()}원
                                                </span>
                                                <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-gray-400'}`}>
                                                    {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : isDown ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                                                    {isUp ? '+' : ''}{changeRate.toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="p-2 border-t border-white/5 bg-black/40">
                    <Link href="/watchlist" onClick={() => setIsWatchlistOpen(false)}>
                        <button className="w-full py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] font-bold hover:bg-cyan-500/20 transition-colors border border-cyan-500/30">
                            관심종목 전체보기
                        </button>
                    </Link>
                </div>
            </div>

            {/* Expanding Quick Menu Items */}
            <div 
                className={`flex flex-col items-center gap-3 mb-4 transition-all duration-300 origin-bottom ${
                    isOpen ? "scale-100 opacity-100 pointer-events-auto translate-y-0" : "scale-50 opacity-0 pointer-events-none translate-y-10"
                }`}
            >
                <button 
                    onClick={scrollToTop}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-glass transition-all hover:scale-110"
                    title="맨 위로 가기"
                >
                    <ChevronUp className="w-5 h-5" />
                    <span className="absolute right-12 px-2 py-1 bg-black/80 text-[10px] rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">맨 위로</span>
                </button>
                
                <button 
                    onClick={openSearch}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-glass transition-all hover:scale-110"
                    title="검색"
                >
                    <Search className="w-4 h-4" />
                    <span className="absolute right-12 px-2 py-1 bg-black/80 text-[10px] rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">종목 검색</span>
                </button>

                <button 
                    onClick={toggleWatchlist}
                    className={`group relative flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border transition-all hover:scale-110 ${
                        isWatchlistOpen 
                            ? 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.4)] text-yellow-400' 
                            : 'bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-glass'
                    }`}
                    title="미니 관심종목"
                >
                    <Star className={`w-4 h-4 ${isWatchlistOpen ? 'fill-yellow-400' : ''}`} />
                    <span className="absolute right-12 px-2 py-1 bg-black/80 text-[10px] rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">관심종목</span>
                </button>

                <button 
                    onClick={navSettings}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-glass transition-all hover:scale-110"
                    title="알림/설정"
                >
                    <Bell className="w-4 h-4" />
                    <span className="absolute right-12 px-2 py-1 bg-black/80 text-[10px] rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">알림/설정</span>
                </button>
                <button 
                    onClick={navHome}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-glass transition-all hover:scale-110"
                    title="홈으로"
                >
                    <Home className="w-4 h-4" />
                    <span className="absolute right-12 px-2 py-1 bg-black/80 text-[10px] rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">홈으로</span>
                </button>
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (isOpen) setIsWatchlistOpen(false); // Close watchlist if closing menu
                }}
                className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 border shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] ${
                    isOpen 
                        ? "bg-cyan-600 border-cyan-400 rotate-45" 
                        : "bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400/50 hover:scale-110"
                }`}
            >
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md pointer-events-none" />
                {isOpen ? (
                    <X className="w-6 h-6 text-white relative z-10" />
                ) : (
                    <Zap className="w-6 h-6 text-white relative z-10 fill-white" />
                )}
            </button>
        </div>
        </>
    );
}
