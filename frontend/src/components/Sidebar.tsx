"use client";

import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Star, TrendingUp, TrendingDown, LayoutDashboard, Newspaper, Compass, Settings, Bell, MessageSquare, LineChart, Crown, Zap, X, Network, Sparkles, UserCheck, Shield, CalendarDays, Menu, PlayCircle, Timer, History, BarChart3, Activity, Users, Globe, HelpCircle } from "lucide-react";
import { App } from '@capacitor/app';
import MarketClock from "./MarketClock";
import { requestPayment } from "@/lib/payment";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "./LoginModal";
import AdRewardModal from "./AdRewardModal"; // Import Modal

const navigation = [
    { 
        name: "통합 대시보드", 
        href: "/", 
        icon: LayoutDashboard,
        desc: "오늘의 주가지수, 헤드라인 뉴스 및 전체 시장 상황을 한눈에 요약해 주는 종합 상황판입니다."
    },
    { 
        name: "글로벌 마켓 시그널", 
        href: "/signals", 
        icon: Activity,
        desc: "달러 환율, 국제 유가, 금값 및 오늘 밤 발표될 세계 경제 지표를 보여주는 경제 기상도입니다."
    },
    { 
        name: "AI 퀀트 종목 발굴", 
        href: "/discovery", 
        icon: Compass,
        desc: "시장의 세력들이 돈을 쏟아붓는 주식과 기관들이 집중 매수하는 유망 종목을 실시간 골라냅니다."
    },
    { 
        name: "기업 펀더멘탈 분석", 
        href: "/analysis", 
        icon: BarChart3,
        desc: "회사가 돈은 잘 버는지, 빚은 없는지, 부도 위험은 없는지 재무 구조를 철저히 검사해 줍니다."
    },
    { 
        name: "실시간 테마 트래커", 
        href: "/theme", 
        icon: Sparkles,
        desc: "오늘 하루 시장에서 자금이 가장 집중되며 급상승하고 있는 인기 테마 그룹과 대장 주식을 보여줍니다."
    },
    { 
        name: "AI 기술적 패턴 분석", 
        href: "/pattern", 
        icon: LineChart,
        desc: "골든크로스나 캔들 차트 모양을 AI가 자동으로 읽어 지금이 살 타이밍인지 쉽게 알려줍니다."
    },
    { 
        name: "ETF 포트폴리오 분석", 
        href: "/etf", 
        icon: Activity,
        desc: "개별 주식 투자가 불안할 때 시장 전체나 유망 산업 분야에 묶음 투자할 수 있는 ETF를 비교합니다."
    },
    { 
        name: "글로벌 서플라이 체인", 
        href: "/supply-chain", 
        icon: Network,
        desc: "이 회사는 어디서 부품을 사오고 완성품은 어디에 납품하는지, 얽힌 기업 인맥도를 지도로 보여줍니다."
    },
    { 
        name: "투자 인텔리전스 포럼", 
        href: "/community", 
        icon: Users,
        desc: "어떤 종목에 호재나 악재가 터졌을 때 실시간으로 다른 주주들과 소통하고 관련 공시를 공유합니다."
    },
    { 
        name: "포트폴리오 자산 진단", 
        href: "/portfolio", 
        icon: Shield,
        desc: "내가 산 주식들의 투자 비중을 분석하여 특정 종목에 몰리지 않고 안전하게 분산되어 있는지 진단합니다."
    },
    { 
        name: "실시간 스마트 워치리스트", 
        href: "/watchlist", 
        icon: Star,
        desc: "내가 찜한 종목들의 실시간 시세와 관련 공시, 악재/호재 일정을 캘린더 형태로 자동 수집합니다."
    },
    { 
        name: "연동 설정 및 시스템 관리", 
        href: "/settings", 
        icon: Settings,
        desc: "증권사 계좌 연동을 위한 보안 키 등록 및 화면 다크모드, 알림 등 시스템 환경을 조율합니다."
    },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    const [clocks, setClocks] = useState({
        korTime: "", usaTime: "", jpnTime: "", ukTime: "",
        isKorOpen: false, isUsaOpen: false, isJpnOpen: false, isUkOpen: false
    });

    useEffect(() => {
        const updateClocks = () => {
            const now = new Date();
            
            // 1. Seoul Time Calculation
            const korStr = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Seoul',
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            }).format(now);
            const korDate = new Date(korStr);
            const korHours = korDate.getHours();
            const korMinutes = korDate.getMinutes();
            const korDay = korDate.getDay();
            
            const korTotalMinutes = korHours * 60 + korMinutes;
            const korOpenMinutes = 9 * 60 + 0;
            const korCloseMinutes = 15 * 60 + 30;
            const isKorTimeOpen = korTotalMinutes >= korOpenMinutes && korTotalMinutes < korCloseMinutes;
            const isKorWeekday = korDay !== 0 && korDay !== 6;
            
            const y = korDate.getFullYear();
            const m = String(korDate.getMonth() + 1).padStart(2, '0');
            const d = String(korDate.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;
            const KR_HOLIDAYS = [
                "2025-01-01", "2025-01-27", "2025-01-28", "2025-01-29",
                "2025-03-03", "2025-05-05", "2025-05-06", "2025-06-06",
                "2025-08-15", "2025-10-03", "2025-10-06", "2025-10-07",
                "2025-10-08", "2025-10-09", "2025-12-25"
            ];
            const isKorHoliday = KR_HOLIDAYS.includes(dateStr);
            const isKorOpen = isKorTimeOpen && isKorWeekday && !isKorHoliday;

            // 2. New York Time Calculation
            const usaStr = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            }).format(now);
            const usaDate = new Date(usaStr);
            const usaHours = usaDate.getHours();
            const usaMinutes = usaDate.getMinutes();
            const usaDay = usaDate.getDay();
            
            const usaTotalMinutes = usaHours * 60 + usaMinutes;
            const usaOpenMinutes = 9 * 60 + 30;
            const usaCloseMinutes = 16 * 60 + 0;
            const isUsaTimeOpen = usaTotalMinutes >= usaOpenMinutes && usaTotalMinutes < usaCloseMinutes;
            const isUsaWeekday = usaDay !== 0 && usaDay !== 6;
            const isUsaOpen = isUsaTimeOpen && isUsaWeekday;

            // 3. Tokyo Time Calculation
            const jpnStr = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            }).format(now);
            const jpnDate = new Date(jpnStr);
            const jpnHours = jpnDate.getHours();
            const jpnMinutes = jpnDate.getMinutes();
            const jpnDay = jpnDate.getDay();
            const jpnTotalMinutes = jpnHours * 60 + jpnMinutes;
            const jpnOpenMinutes = 9 * 60 + 0;
            const jpnCloseMinutes = 15 * 60 + 0;
            const isJpnTimeOpen = jpnTotalMinutes >= jpnOpenMinutes && jpnTotalMinutes < jpnCloseMinutes;
            const isJpnWeekday = jpnDay !== 0 && jpnDay !== 6;
            const isJpnOpen = isJpnTimeOpen && isJpnWeekday;

            // 4. London Time Calculation
            const ukStr = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Europe/London',
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric',
                hour12: false
            }).format(now);
            const ukDate = new Date(ukStr);
            const ukHours = ukDate.getHours();
            const ukMinutes = ukDate.getMinutes();
            const ukDay = ukDate.getDay();
            const ukTotalMinutes = ukHours * 60 + ukMinutes;
            const ukOpenMinutes = 8 * 60 + 0;
            const ukCloseMinutes = 16 * 60 + 30;
            const isUkTimeOpen = ukTotalMinutes >= ukOpenMinutes && ukTotalMinutes < ukCloseMinutes;
            const isUkWeekday = ukDay !== 0 && ukDay !== 6;
            const isUkOpen = isUkTimeOpen && isUkWeekday;

            const formatTime = (date: Date) => {
                const hh = String(date.getHours()).padStart(2, '0');
                const mm = String(date.getMinutes()).padStart(2, '0');
                const ss = String(date.getSeconds()).padStart(2, '0');
                return `${hh}:${mm}:${ss}`;
            };

            setClocks({
                korTime: formatTime(korDate),
                usaTime: formatTime(usaDate),
                jpnTime: formatTime(jpnDate),
                ukTime: formatTime(ukDate),
                isKorOpen, isUsaOpen, isJpnOpen, isUkOpen
            });
        };

        updateClocks();
        const interval = setInterval(updateClocks, 1000);
        return () => clearInterval(interval);
    }, []);

    // [New] Global Login Modal Trigger Listener
    useEffect(() => {
        const handleOpenLogin = () => setShowLoginModal(true);
        window.addEventListener('open-login-modal', handleOpenLogin);
        return () => window.removeEventListener('open-login-modal', handleOpenLogin);
    }, []);
    const [showProModal, setShowProModal] = useState(false);
    const [showAdRewardModal, setShowAdRewardModal] = useState(false); // [New] Modal State
    const [exchangeRate, setExchangeRate] = useState<number>(1450); // Default fallback
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // [New] Timer State
    const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);
    const [isPro, setIsPro] = useState(false);

    // [New] Watchlist Preview State
    const [watchlistPreview, setWatchlistPreview] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/status`);

                // [Fix] Check response status before parsing
                if (!res.ok) {
                    // Silently use fallback exchange rate
                    return;
                }

                const data = await res.json();
                if (data.status === "success" && data.data.details?.usd) {
                    const usdRaw = data.data.details.usd;
                    const rate = parseFloat(String(usdRaw).replace(/,/g, ''));
                    if (!isNaN(rate)) setExchangeRate(rate);
                }
            } catch (err) {
                // [Fix] Silently ignore - fallback exchange rate (1450) is already set
            }
        };

        fetchExchangeRate();
    }, []);

    const proPriceUsd = 3.5;
    const proPriceKrw = Math.floor(proPriceUsd * exchangeRate / 10) * 10; // 10원 단위 절사

    // [Android] Back Button Handler
    useEffect(() => {
        let listener: any;
        const setupBack = async () => {
            listener = await App.addListener('backButton', () => {
                const path = window.location.pathname;
                if (path === '/' || path === '/discovery' || path === '/auth/login') {
                    App.exitApp();
                } else {
                    window.history.back();
                }
            });
        };
        setupBack();
        return () => { if (listener) listener.remove(); };
    }, []);

    // [New] Real-time Countdown Timer
    useEffect(() => {
        const updateTimer = () => {
            // Check Pro & Admin Free Mode
            const localPro = localStorage.getItem('isPro') === 'true';
            const adminFree = sessionStorage.getItem('admin_free_mode') === 'true';

            // Admin Free Mode overrides everything
            if (adminFree) {
                setIsPro(true);
                setTimeLeftStr("관리자 모드 (무제한)");
                return;
            }

            setIsPro(localPro || user?.is_pro === true);

            if (localPro || user?.is_pro) {
                setTimeLeftStr("무제한 (PRO)");
                return;
            }

            // Check Reward Expiry
            const expiry = localStorage.getItem('rewardExpiry'); // Used for both reward time and pro trial
            if (expiry) {
                const expTime = parseInt(expiry);
                const now = Date.now();
                const diff = expTime - now;

                if (diff > 0) {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeftStr(`${h}시간 ${m}분 ${s}초`);
                } else {
                    localStorage.removeItem('rewardExpiry');
                    // Note: 'proExpiry' was used previously, now let's standardize on rewardExpiry for logic
                    // If you used proExpiry before, you might want to check that too
                    const proExpiry = localStorage.getItem('proExpiry');
                    if (proExpiry) {
                        // ... logic for legacy proExpiry if needed
                        localStorage.removeItem('proExpiry');
                    }
                    setTimeLeftStr(null);
                }
            } else {
                setTimeLeftStr(null);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [user, showAdRewardModal]); // Update on modal close too

    // [New] Watchlist Synchronizer
    useEffect(() => {
        const fetchWatchlist = async () => {
            if (!user) {
                setWatchlistPreview([]);
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                    headers: { "X-User-ID": user.id || (user as any).uid }
                });
                const json = await res.json();
                if (json.status === "success") {
                    // Limit to top 5 recent items
                    setWatchlistPreview(json.data.slice(0, 5));
                }
            } catch (err) {
                console.error("Failed to fetch sidebar watchlist:", err);
            }
        };

        fetchWatchlist();

        // Listen for internal changes (Discovery page toggle)
        window.addEventListener('watchlistChanged', fetchWatchlist);
        return () => window.removeEventListener('watchlistChanged', fetchWatchlist);
    }, [user]);

    const [freeTrialCount, setFreeTrialCount] = useState(0);
    const [isLoadingTrial, setIsLoadingTrial] = useState(false);

    // [Modified] Check if user is a real Google user
    const isGoogleUser = user && !user.id.startsWith("dev_");

    // Init Free Trial from User Profile (Backend Source of Truth)
    useEffect(() => {
        if (isGoogleUser) {
            // Use count from DB (provided via AuthContext -> Login Response)
            // Default to 2 if undefined (legacy/fallback)
            const count = user?.free_trial_count !== undefined ? user.free_trial_count : 2;
            setFreeTrialCount(count);
        } else {
            setFreeTrialCount(0);
        }
    }, [user, isGoogleUser]);

    const handleFreeTrial = async () => {
        if (isGoogleUser && freeTrialCount > 0 && !isLoadingTrial) {
            setIsLoadingTrial(true);
            try {
                // Call Backend API to decrement count
                const res = await fetch(`${API_BASE_URL}/api/auth/use-trial`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user?.id })
                });

                const data = await res.json();

                if (data.status === "success" && typeof data.new_count === 'number') {
                    const newCount = data.new_count;
                    setFreeTrialCount(newCount);

                    // Update local storage user object to keep sync on refresh (optimistic)
                    if (user) {
                        const updatedUser = { ...user, free_trial_count: newCount };
                        localStorage.setItem("stock_user", JSON.stringify(updatedUser)); // For AuthContext init
                    }

                    // Grant 1 Hour Time
                    const now = Date.now();
                    const currentExpiry = localStorage.getItem("rewardExpiry");
                    let baseTime = now;
                    if (currentExpiry && parseInt(currentExpiry) > now) {
                        baseTime = parseInt(currentExpiry);
                    }
                    const newExpiry = baseTime + (1 * 60 * 60 * 1000); // 1 hour
                    localStorage.setItem("rewardExpiry", newExpiry.toString());

                    alert(`🎁 신규 혜택 적용! 광고 없이 1시간이 충전되었습니다.\n(남은 무료 기회: ${newCount}회)`);
                } else {
                    alert("오류: " + (data.message || "이용권 사용 실패"));
                }
            } catch (e) {
                console.error(e);
                alert("서버 통신 오류가 발생했습니다.");
            } finally {
                setIsLoadingTrial(false);
            }
        }
    };

    if (!mounted) {
        return (
            <div className="fixed inset-y-0 left-0 z-50 h-full w-80 bg-[#09090b] border-r border-white/10 flex flex-col p-4 animate-pulse">
                <div className="h-8 w-32 bg-white/5 rounded-lg mb-8" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-10 w-full bg-white/5 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden fixed top-8 left-4 z-[100] p-2 rounded-lg bg-black/80 text-white border border-white/20 hover:bg-white/10 backdrop-blur-md shadow-xl"
            >
                <Menu className="h-6 w-6" />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-[1001] bg-black/80 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={`
                fixed inset-y-0 left-0 z-[1002] h-full w-80 flex flex-col justify-between border-r border-white/10 bg-[#09090b] md:bg-black/40 backdrop-blur-xl text-white p-4 pt-24 md:pt-4 transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0 md:flex
                ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="absolute top-6 right-4 p-2 text-gray-400 hover:text-white md:hidden z-10 bg-black/20 rounded-full"
                >
                    <X className="h-6 w-6" />
                </button>
                <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar pb-4">
                    <div className="flex flex-col gap-2.5 px-2 py-4 mb-8 border-b border-white/5 pb-5">
                        <div className="flex items-center gap-2">
                            {/* Dynamic spinning global globe/clock icon */}
                            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                                <Globe 
                                    className="w-4 h-4 text-blue-200" 
                                    style={{ animation: 'spin 15s linear infinite' }}
                                />
                                {/* Pulsing dot indicating real-time activity */}
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black animate-ping" />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black" />
                            </div>
                            <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                                STOCK AI
                            </span>
                        </div>

                        {/* Ultra-sleek Micro Global Clocks Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {/* KOR Clock */}
                            <div className={`flex items-center justify-between p-2 rounded-xl border bg-black/40 ${clocks.isKorOpen ? 'border-emerald-500/30' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-xs">🇰🇷</span>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider leading-none">SEOUL</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-300 mt-0.5" suppressHydrationWarning>{clocks.korTime}</span>
                                    </div>
                                </div>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${clocks.isKorOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                            </div>

                            {/* USA Clock */}
                            <div className={`flex items-center justify-between p-2 rounded-xl border bg-black/40 ${clocks.isUsaOpen ? 'border-emerald-500/30' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-xs">🇺🇸</span>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider leading-none">NEW YORK</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-300 mt-0.5" suppressHydrationWarning>{clocks.usaTime}</span>
                                    </div>
                                </div>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${clocks.isUsaOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                            </div>

                            {/* JPN Clock */}
                            <div className={`flex items-center justify-between p-2 rounded-xl border bg-black/40 ${clocks.isJpnOpen ? 'border-emerald-500/30' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-xs">🇯🇵</span>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider leading-none">TOKYO</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-300 mt-0.5" suppressHydrationWarning>{clocks.jpnTime}</span>
                                    </div>
                                </div>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${clocks.isJpnOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                            </div>

                            {/* UK Clock */}
                            <div className={`flex items-center justify-between p-2 rounded-xl border bg-black/40 ${clocks.isUkOpen ? 'border-emerald-500/30' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-xs">🇬🇧</span>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider leading-none">LONDON</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-300 mt-0.5" suppressHydrationWarning>{clocks.ukTime}</span>
                                    </div>
                                </div>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${clocks.isUkOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                            </div>
                        </div>
                    </div>

                    <nav className="space-y-1.5">
                        {navigation.map((item) => (
                            <div 
                                key={item.name} 
                                className="relative group/menu flex flex-col rounded-xl transition-all hover:bg-white/5"
                            >
                                <div className="flex items-center justify-between pr-2 w-full">
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsMobileOpen(false)}
                                        className="flex-1 flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-200 transition-all hover:text-white active:scale-98"
                                    >
                                        <item.icon className="h-5 w-5 transition-colors group-hover/menu:text-blue-400" />
                                        <span>{item.name}</span>
                                    </Link>
                                    
                                    {/* ℹ️ Info Trigger Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setActiveTooltip(activeTooltip === item.name ? null : item.name);
                                        }}
                                        onMouseEnter={() => setActiveTooltip(item.name)}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-white/10 transition-all shrink-0"
                                        title={`${item.name} 설명 보기`}
                                    >
                                        <HelpCircle className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Universal Inline Accordion Tooltip (Fixes clipping issue on Desktop) */}
                                {activeTooltip === item.name && (
                                    <div className="w-full px-4 pb-3 text-xs animate-in slide-in-from-top-2 duration-200 fade-in">
                                        <div className="p-3.5 bg-black/60 backdrop-blur-md border border-blue-500/40 rounded-xl space-y-1.5 shadow-lg">
                                            <p className="font-bold text-[11px] text-blue-300 flex items-center gap-1.5">
                                                <item.icon className="w-3.5 h-3.5" />
                                                {item.name}란?
                                            </p>
                                            <p className="text-[11px] leading-relaxed text-white font-semibold">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {(user?.email?.toLowerCase() === "rnfjr@gmail.com" || user?.email?.toLowerCase() === "rnfjrlakdmf@gmail.com") && (
                            <Link
                                href="/admin"
                                onClick={() => setIsMobileOpen(false)}
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold bg-fuchsia-950/40 text-fuchsia-300 border border-fuchsia-500/20 transition-all hover:bg-fuchsia-900/40 hover:text-fuchsia-200 hover:scale-105 active:scale-95 group"
                            >
                                <Shield className="h-5 w-5 text-fuchsia-400 transition-colors group-hover:text-fuchsia-300" />
                                <span>관리자 센터 👑</span>
                            </Link>
                        )}
                    </nav>

                    {/* [New] Watchlist Preview Section */}
                    {user && watchlistPreview.length > 0 && (
                        <div className="mt-8 px-2">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 mb-3 flex items-center justify-between">
                                최근 관심종목
                                <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[8px]">{watchlistPreview.length}</span>
                            </h4>
                            <div className="space-y-1">
                                {watchlistPreview.map((stock) => (
                                    <Link
                                        key={stock.symbol}
                                        href="/watchlist"
                                        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-all group border border-transparent hover:border-white/5"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400/20 group-hover:fill-yellow-400 transition-all" />
                                            <span className="truncate">{stock.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[9px] font-mono text-gray-500 group-hover:text-blue-300 transition-colors uppercase">{stock.symbol}</span>
                                            <TrendingUp className="w-3 h-3 text-rose-500/50 group-hover:text-rose-500" />
                                        </div>
                                    </Link>
                                ))}
                                <Link
                                    href="/watchlist"
                                    className="block text-[10px] text-center text-gray-500 hover:text-blue-400 mt-2 py-1 transition-colors font-bold"
                                >
                                    전체보기 →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Bottom Section */}
                <div className="mt-auto space-y-3 pt-3 border-t border-white/10">
                    {/* 1. Pro Membership upgrade block */}
                    {isPro ? (
                        <div className="rounded-xl bg-gradient-to-br from-blue-900/40 to-black p-2.5 border border-blue-500/30 shadow-lg flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                                <Crown className="w-3.5 h-3.5 text-yellow-400" />
                                <span>PRO 멤버십 이용중</span>
                            </div>
                            <p className="text-[9px] text-gray-400 leading-normal">모든 프리미엄 기능을 제한없이 이용하고 계십니다.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-2.5 border border-white/10 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-1.5 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Timer className="w-12 h-12 text-white" />
                            </div>

                            <div className="flex justify-between items-start mb-1.5">
                                <div>
                                    <p className="text-[11px] font-bold text-blue-200 mb-0.5 flex items-center gap-1.5">
                                        <Crown className="w-3 h-3 text-yellow-400" /> PRO 요금제
                                    </p>
                                    <p className="text-[9px] text-gray-400">AI 통찰력 무제한 이용</p>
                                </div>
                                <button
                                    onClick={() => setShowProModal(true)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded transition-colors"
                                >
                                    UP
                                </button>
                            </div>

                            {/* Timer / Reward Section */}
                            <div className="pt-1.5 border-t border-white/10 mt-1">
                                {timeLeftStr ? (
                                    <div className="mb-1.5">
                                        <div className="flex justify-between items-center text-[9px] text-gray-300 mb-0.5">
                                            <span>남은 시간</span>
                                            <span className="text-green-400 font-mono font-bold animate-pulse">{timeLeftStr}</span>
                                        </div>
                                        <div className="w-full bg-black/40 rounded-full h-1 overflow-hidden border border-white/5">
                                            <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-full w-full animate-pulse" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[9px] text-gray-400 mb-1.5 text-center">
                                        이용권이 없습니다.
                                    </div>
                                )}

                                {freeTrialCount > 0 ? (
                                    <button
                                        onClick={handleFreeTrial}
                                        className="w-full rounded-lg py-1.5 text-[9px] font-bold bg-green-600 text-white hover:bg-green-500 animate-pulse border border-green-400/30 flex items-center justify-center gap-1 shadow-md transition-colors"
                                    >
                                        🎁 1시간 무료 이용하기 ({freeTrialCount}회)
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowAdRewardModal(true)}
                                        className="w-full rounded-lg py-1.5 text-[9px] font-bold bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <PlayCircle className="w-3 h-3 text-yellow-500" />
                                        광고 보고 시간 충전 (30분)
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 2. User account profile block */}
                    {user ? (
                        <div className="rounded-xl bg-white/10 p-2.5 border border-white/10 flex items-center gap-2.5 shadow-lg">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs ring-2 ring-white/20">
                                {user.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                                <p className="text-[9px] text-gray-300 truncate">{user.email}</p>
                            </div>
                            <button onClick={logout} className="p-1 px-1.5 text-gray-300 hover:text-white transition-colors bg-white/5 rounded-lg">
                                <span className="text-[9px] font-bold">로그아웃</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                                    window.location.href = "/login";
                                } else {
                                    setShowLoginModal(true);
                                }
                            }}
                            className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            로그인
                        </button>
                    )}



                    {/* 4. Version info */}
                    <div className="opacity-30 text-center">
                        <span className="text-[8px] font-mono text-gray-500">v3.8.0-READY</span>
                    </div>
                </div>
            </div>

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
            <AdRewardModal isOpen={showAdRewardModal} onClose={() => setShowAdRewardModal(false)} onReward={() => { }} featureName="SidebarCharge" />

            {showProModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative bg-[#111] border border-white/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/20 to-transparent" />

                        <div className="p-8 relative">
                            <button
                                onClick={() => setShowProModal(false)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center mb-6">
                                <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-black px-3 py-1 rounded-full mb-4 animate-bounce">
                                    🚀 GRAND LAUNCH SPECIAL
                                </div>
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/30">
                                    <Crown className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">PRO 멤버십 혜택</h2>
                                <p className="text-gray-400 text-sm">상위 1% 투자자를 위한 프리미엄 기능을 잠금 해제하세요.</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <BenefitItem
                                    icon={<Zap className="w-5 h-5 text-yellow-400" />}
                                    title="무제한 AI 데이터 분석"
                                    desc="하루 제한 없이 종목 발굴과 포트폴리오 분석을 이용하세요."
                                />
                                <BenefitItem
                                    icon={<LineChart className="w-5 h-5 text-green-400" />}
                                    title="실시간 스나이퍼 알림"
                                    desc="RSI, 골든크로스 등 기술 지표 변동을 분석합니다."
                                />
                                <BenefitItem
                                    icon={<Newspaper className="w-5 h-5 text-blue-400" />}
                                    title="심층 리포트 & 공급망 분석"
                                    desc="기업의 숨겨진 리스크와 공급망 관계를 한눈에 파악하세요."
                                />
                            </div>

                            {user && user.free_trial_count !== undefined && user.free_trial_count > 0 && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`${API_BASE_URL}/api/auth/use-ticket`, {
                                                method: "POST",
                                                headers: { "X-User-ID": user.id }
                                            });
                                            const data = await res.json();
                                            if (data.status === "success") {
                                                // Sync frontend rewardExpiry
                                                const now = Date.now();
                                                let baseTime = now;
                                                const currentExpiry = localStorage.getItem("rewardExpiry");
                                                if (currentExpiry && parseInt(currentExpiry) > now) {
                                                    baseTime = parseInt(currentExpiry);
                                                }
                                                localStorage.setItem("rewardExpiry", (baseTime + 60 * 60 * 1000).toString());
                                                
                                                alert(data.message);
                                                setShowProModal(false);
                                                window.location.reload();
                                            } else {
                                                alert(data.message);
                                            }
                                        } catch (e) {
                                            alert("서버 통신 오류가 발생했습니다.");
                                        }
                                    }}
                                    className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold text-white text-sm mb-3 transition-colors flex items-center justify-center gap-2 border border-white/20"
                                >
                                    🎁 1시간 PRO 무료 이용권 사용하기 (남은 횟수: {user.free_trial_count}번)
                                </button>
                            )}

                            <button
                                onClick={async () => {
                                    try {
                                        await requestPayment(() => {
                                            localStorage.setItem("isPro", "true");
                                            alert("결제가 완료되었습니다! 프로 기능이 활성화됩니다.");
                                            setShowProModal(false);
                                            window.location.reload();
                                        });
                                    } catch (e: any) {
                                        alert("결제 요청 실패: " + e.message);
                                    }
                                }}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-[1.02] shadow-lg shadow-blue-600/30 flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-blue-200 text-xs font-normal line-through">$10.00/mo</span>
                                <span suppressHydrationWarning>월 ${proPriceUsd} (약 ₩{proPriceKrw.toLocaleString()})으로 시작하기</span>
                            </button>
                            <p className="text-center text-xs text-gray-500 mt-4" suppressHydrationWarning>
                                * 실시간 환율({exchangeRate.toLocaleString()}원/$) 적용
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="mt-1">{icon}</div>
            <div>
                <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
