"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, ChevronUp, Search, Star, Home, X, TrendingUp, TrendingDown, RefreshCw, Bell, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { getPreferredBroker, launchMtsApp, BrokerInfo, BROKER_LIST } from "@/lib/brokerLinks";
import { toast } from "sonner";

export default function FloatingQuickMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [preferredBroker, setPreferredBroker] = useState<BrokerInfo>(BROKER_LIST[0]);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (typeof window !== "undefined") {
            setPreferredBroker(getPreferredBroker());

            const handleBrokerChange = (e: any) => {
                const found = BROKER_LIST.find(b => b.id === e.detail);
                if (found) setPreferredBroker(found);
            };

            window.addEventListener("preferred_broker_changed", handleBrokerChange);
            return () => window.removeEventListener("preferred_broker_changed", handleBrokerChange);
        }
    }, []);

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

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
    };

    const navSettings = () => {
        router.push("/settings");
        setIsOpen(false);
    };

    const navHome = () => {
        router.push("/");
        setIsOpen(false);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setIsOpen(false);
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;
        
        // 종목 검색 시 창이 바뀌면서 즉시 최상단으로 스크롤
        window.scrollTo({ top: 0, behavior: "smooth" });
        
        router.push(`/discovery?q=${encodeURIComponent(searchQuery)}`);
        setIsSearchOpen(false);
        setSearchQuery("");
        setIsOpen(false);
    };

    return (
        <>
        <div ref={menuRef} className="fixed bottom-20 md:bottom-6 right-3 md:right-6 z-40 flex flex-col items-end">
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
                {/* ⚡ 주거래 증권사 MTS 앱 즉시 실행 버튼 */}
                <button 
                    onClick={() => {
                        toast.info(`📱 ${preferredBroker.name} (${preferredBroker.appTitle}) 앱을 실행합니다...`);
                        launchMtsApp(preferredBroker.id);
                        setIsOpen(false);
                    }}
                    className={`group relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r ${preferredBroker.bgColor} hover:brightness-125 backdrop-blur-md border border-white/30 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all hover:scale-115 active:scale-95`}
                    title={`${preferredBroker.name} MTS 앱 실행`}
                >
                    <span className="text-sm">{preferredBroker.emoji}</span>
                    <span className="absolute right-12 px-2.5 py-1 bg-black/90 text-white text-[11px] font-bold rounded-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-yellow-400 fill-current animate-pulse" />
                        {preferredBroker.name} 앱 열기
                    </span>
                </button>

                <button 
                    onClick={scrollToTop}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-glass transition-all hover:scale-110"
                    title="맨 위로 가기"
                >
                    <ChevronUp className="w-5 h-5" />
                    <span className="absolute right-12 px-2 py-1 bg-black/80 text-[10px] rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">맨 위로</span>
                </button>
                
                {/* Sliding Search Bar & Button */}
                <div className="relative flex items-center justify-end w-full">
                    <div 
                        className={`absolute right-12 transition-all duration-300 overflow-hidden flex items-center ${
                            isSearchOpen ? 'w-[200px] opacity-100 pointer-events-auto mr-2' : 'w-0 opacity-0 pointer-events-none'
                        }`}
                    >
                        <form onSubmit={handleSearchSubmit} className="w-full">
                            <input
                                type="text"
                                autoFocus={isSearchOpen}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="종목 검색..."
                                className="w-full bg-black/80 backdrop-blur-md border border-cyan-500/50 rounded-full px-4 py-2 text-white placeholder-gray-300 text-xs font-bold focus:outline-none focus:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                            />
                        </form>
                    </div>
                    <button 
                        onClick={() => {
                            if (isSearchOpen && searchQuery.trim()) {
                                handleSearchSubmit();
                            } else {
                                toggleSearch();
                            }
                        }}
                        className={`group relative flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border transition-all hover:scale-110 z-10 ${
                            isSearchOpen ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-glass'
                        }`}
                        title="검색"
                    >
                        <Search className="w-4 h-4" />
                        {!isSearchOpen && (
                            <span className="absolute right-12 px-2 py-1 bg-black/80 text-[10px] rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">종목 검색</span>
                        )}
                    </button>
                </div>

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
                    if (isOpen) {
                        setIsWatchlistOpen(false);
                        setIsSearchOpen(false);
                    }
                }}
                className={`relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full transition-all duration-500 border shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] ${
                    isOpen 
                        ? "bg-cyan-600 border-cyan-400 rotate-45" 
                        : "bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400/50 hover:scale-110"
                }`}
            >
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md pointer-events-none" />
                {isOpen ? (
                    <X className="w-5 h-5 text-white relative z-10" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white relative z-10">
                        <rect x="6" y="2" width="12" height="20" rx="3" />
                        <circle cx="12" cy="6.5" r="1.5" fill="currentColor" />
                        <circle cx="12" cy="12" r="2.5" />
                        <circle cx="9.5" cy="17" r="1" fill="currentColor" />
                        <circle cx="14.5" cy="17" r="1" fill="currentColor" />
                    </svg>
                )}
            </button>
        </div>
        </>
    );
}
