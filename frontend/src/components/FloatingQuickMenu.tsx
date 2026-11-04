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
    const [isCustomWatchlist, setIsCustomWatchlist] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [preferredBroker, setPreferredBroker] = useState<BrokerInfo>(BROKER_LIST[0]);
    const menuRef = useRef<HTMLDivElement>(null);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
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

    // Get effective user ID from auth state or localStorage
    const getEffectiveUserId = (): string | null => {
        if (user?.id) return String(user.id);
        if ((user as any)?.uid) return String((user as any).uid);
        if (typeof window !== "undefined") {
            try {
                const rawUser = localStorage.getItem("stock_user");
                if (rawUser) {
                    const parsed = JSON.parse(rawUser);
                    if (parsed?.id) return String(parsed.id);
                    if (parsed?.uid) return String(parsed.uid);
                    if (parsed?.email) return String(parsed.email);
                }
            } catch (e) {}
        }
        return null;
    };

    // 실시간 시세를 quotes/multi API에서 가져와 병합
    const fetchRealtimeQuotes = async (stockList: any[]) => {
        if (!stockList || stockList.length === 0) return stockList;
        
        try {
            const symbols = stockList.map(item => {
                const s = item.symbol || item.code || "";
                return s.replace(/\.(KS|KQ|O)$/i, "").trim();
            }).filter(Boolean);

            if (symbols.length === 0) return stockList;

            const res = await fetch(`${API_BASE_URL}/api/market/stock/quotes/multi?symbols=${encodeURIComponent(symbols.join(','))}`);
            const json = await res.json();
            
            if (json.status === "success" && json.data) {
                const quotesMap = json.data;
                return stockList.map(item => {
                    const rawSym = item.symbol || item.code || "";
                    const cleanCode = rawSym.replace(/\.(KS|KQ|O)$/i, "").trim();
                    const q = quotesMap[cleanCode] || quotesMap[rawSym];
                    
                    if (q) {
                        return {
                            ...item,
                            name: q.name || item.name || cleanCode,
                            code: cleanCode,
                            symbol: rawSym,
                            price: q.price,
                            price_krw: q.price_krw,
                            currency: q.currency || "KRW",
                            change_rate: q.change_percent || q.change,
                            up: q.up,
                            market_status: q.market_status,
                        };
                    }
                    return {
                        ...item,
                        code: cleanCode,
                        symbol: rawSym,
                    };
                });
            }
        } catch (e) {
            console.error("Failed to fetch quotes for mini watchlist:", e);
        }
        return stockList;
    };

    const fetchWatchlist = async () => {
        setIsLoading(true);
        try {
            const uid = getEffectiveUserId();
            let rawItems: any[] = [];
            let isUserList = false;

            // 1. 로그인 유저의 경우 서버에서 실제 등록된 관심종목 호출
            if (uid && !uid.toLowerCase().startsWith("guest")) {
                const token = typeof window !== "undefined" ? (localStorage.getItem("token") || sessionStorage.getItem("token")) : null;
                const headers: Record<string, string> = {
                    "X-User-ID": uid,
                };
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE_URL}/api/watchlist`, { headers });
                const json = await res.json();
                if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
                    rawItems = json.data;
                    isUserList = true;
                    if (typeof window !== "undefined") {
                        localStorage.setItem("cached_watchlist", JSON.stringify(rawItems));
                    }
                }
            }

            // 2. 만약 서버 응답이 없거나 비로그인이면 로컬 캐시 확인
            if (rawItems.length === 0 && typeof window !== "undefined") {
                try {
                    const cached = localStorage.getItem("cached_watchlist");
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            rawItems = parsed;
                            isUserList = true;
                        }
                    }
                } catch (e) {}
            }

            // 3. 등록된 관심종목이 아예 없는 경우 시장 대표 주도주 기본 목록 제공
            if (rawItems.length === 0) {
                rawItems = [
                    { name: "삼성전자", code: "005930", symbol: "005930.KS", sector: "반도체 대표주" },
                    { name: "SK하이닉스", code: "000660", symbol: "000660.KS", sector: "HBM·메모리" },
                    { name: "현대리바트", code: "079430", symbol: "079430.KS", sector: "가구·인테리어" },
                    { name: "NVIDIA", code: "NVDA", symbol: "NVDA.O", sector: "AI 가속기" },
                    { name: "Tesla", code: "TSLA", symbol: "TSLA.O", sector: "자율주행·전기차" },
                ];
                isUserList = false;
            }

            setIsCustomWatchlist(isUserList);

            // 4. 모든 종목에 대해 실시간 가격(quotes) 연동
            const enriched = await fetchRealtimeQuotes(rawItems);
            setWatchlist(enriched);
        } catch (error) {
            console.error("Failed to fetch watchlist for quick menu:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleWatchlist = () => {
        const nextState = !isWatchlistOpen;
        setIsWatchlistOpen(nextState);
        if (nextState) {
            fetchWatchlist();
            // 패널이 열려있는 동안 12초마다 실시간 시세 자동 갱신
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = setInterval(() => {
                fetchWatchlist();
            }, 12000);
        } else {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        }
    };

    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        };
    }, []);

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
        <div ref={menuRef} className="fixed bottom-20 md:bottom-6 right-3 md:right-6 z-[70] flex flex-col items-end">
            {/* Mini Watchlist Panel (실시간 시세 및 내 관심종목 연동) */}
            <div 
                className={`absolute bottom-16 right-16 w-80 sm:w-88 mb-4 bg-slate-950/95 backdrop-blur-2xl border border-amber-400/30 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.15)] overflow-hidden transition-all duration-300 transform origin-bottom-right ${
                    isWatchlistOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-50 opacity-0 pointer-events-none"
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-transparent">
                    <div className="flex items-center gap-2 min-w-0">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                        <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 truncate">
                            <span>미니 관심종목</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                {isCustomWatchlist ? "내 관심종목" : "시장 주도주"}
                            </span>
                        </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                            onClick={fetchWatchlist} 
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" 
                            disabled={isLoading}
                            title="실시간 시세 새로고침"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                        </button>
                        <button 
                            onClick={() => setIsWatchlistOpen(false)} 
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                {/* Stock List Body */}
                <div className="max-h-72 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {isLoading && watchlist.length === 0 ? (
                        <div className="flex flex-col justify-center items-center py-10 gap-2">
                            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-gray-400">실시간 시세를 불러오는 중...</span>
                        </div>
                    ) : watchlist.length === 0 ? (
                        <div className="text-center py-8 px-4 space-y-2">
                            <p className="text-xs text-gray-400">등록된 관심종목이 없습니다.</p>
                            <Link href="/watchlist" onClick={() => setIsWatchlistOpen(false)}>
                                <span className="inline-block text-[11px] font-bold text-amber-400 hover:underline">
                                    + 첫 관심종목 등록하러 가기
                                </span>
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {watchlist.map((item, idx) => {
                                const rawRate = item.change_rate;
                                const rateNum = typeof rawRate === 'number' 
                                    ? rawRate 
                                    : parseFloat(String(rawRate || '').replace('%', '').replace('+', '')) || 0;
                                const isUp = item.up === true || rateNum > 0;
                                const isDown = item.up === false || rateNum < 0;
                                const targetCode = item.code || (item.symbol ? item.symbol.replace(/\.(KS|KQ|O)$/i, '') : '');

                                return (
                                    <Link key={idx} href={`/discovery?q=${encodeURIComponent(targetCode)}`} onClick={() => setIsWatchlistOpen(false)}>
                                        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10 cursor-pointer group">
                                            {/* 왼쪽: 종목명 & 종목코드 & 섹터 */}
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs sm:text-[13px] font-bold text-white group-hover:text-amber-300 transition-colors truncate max-w-[120px]">
                                                        {item.name || targetCode}
                                                    </span>
                                                    {item.sector && !item.price && (
                                                        <span className="text-[9px] font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20 shrink-0">
                                                            {item.sector}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {targetCode}
                                                </span>
                                            </div>

                                            {/* 오른쪽: 실시간 현재가 & 등락률 */}
                                            <div className="flex flex-col items-end shrink-0">
                                                {item.price ? (
                                                    <>
                                                        <span className={`text-xs sm:text-[13px] font-black tracking-tight ${
                                                            isUp ? 'text-rose-400' : isDown ? 'text-blue-400' : 'text-gray-200'
                                                        }`}>
                                                            {item.currency === 'USD' ? `$${item.price}` : (String(item.price).includes('원') ? item.price : `${item.price}원`)}
                                                        </span>
                                                        <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                            isUp 
                                                                ? 'text-rose-300 bg-rose-500/15 border border-rose-500/30' 
                                                                : isDown 
                                                                    ? 'text-blue-300 bg-blue-500/15 border border-blue-500/30' 
                                                                    : 'text-gray-300 bg-white/5 border border-white/10'
                                                        }`}>
                                                            {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : isDown ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                                                            <span>
                                                                {isUp && !String(item.change_rate).startsWith('+') ? '+' : ''}
                                                                {item.change_rate ? item.change_rate : '0.00%'}
                                                            </span>
                                                        </div>
                                                        {item.currency === 'USD' && item.price_krw && (
                                                            <span className="text-[9px] text-gray-500 font-mono">
                                                                ≈ {item.price_krw}원
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-500">시세 확인 중</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Link & Auto-refresh status */}
                <div className="p-2.5 border-t border-white/10 bg-black/60 flex flex-col gap-1.5">
                    <Link href="/watchlist" onClick={() => setIsWatchlistOpen(false)}>
                        <button className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 text-xs font-bold transition-all border border-amber-500/30 shadow-sm flex items-center justify-center gap-1.5">
                            <span>⭐ 관심종목 관리 바로가기</span>
                        </button>
                    </Link>
                    <div className="text-[10px] text-gray-500 text-center font-mono flex items-center justify-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>12초 주기 실시간 시세 자동 갱신 중</span>
                    </div>
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
                title="스마트 리모컨"
                aria-label="스마트 리모컨"
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
