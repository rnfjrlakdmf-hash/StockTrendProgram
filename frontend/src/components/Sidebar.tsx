"use client";

import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Star, TrendingUp, TrendingDown, LayoutDashboard, Newspaper, Compass, Settings, Bell, MessageSquare, LineChart, Crown, Zap, X, Network, Sparkles, UserCheck, Shield, CalendarDays, Menu, PlayCircle, Timer, History, BarChart3, Activity, Users, Globe, HelpCircle, List, Gift, Gem, BookOpen, Send } from "lucide-react";
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
        name: "💎 VIP 프리미엄 리포트", 
        href: "/premium", 
        icon: Gem,
        desc: "실제 시장 데이터를 기반으로 외국인과 기관의 순매수 통계를 보여주는 데이터 리포트입니다. (출석 코인 소모)"
    },
    { 
        name: "🔒 주말 마켓 인사이트", 
        href: "/weekend-report", 
        icon: Newspaper,
        desc: "토/일 주말에만 열람 가능한 프리미엄 마켓 요약 리포트입니다."
    },
    { 
        name: "🔒 주말 고래 수급 리포트", 
        href: "/weekend-whale", 
        icon: Crown,
        desc: "세력과 외국인이 몰래 매집한 TOP 10 종목을 파헤치는 주말 한정 프리미엄 리포트입니다."
    },
    { 
        name: "🧮 물타기 생존 계산기", 
        href: "/calculator", 
        icon: Activity,
        desc: "내 불쌍한 계좌 살려낼 물타기 금액은? 친구들과 공유하며 재미있게 평단가를 계산해보세요!"
    },

    { 
        name: "매일 차트 스터디 (이론방)", 
        href: "/theory", 
        icon: BookOpen,
        desc: "매일매일 새롭게 올라오는 차트 보는 법과 주식 기초 이론을 쉽고 재미있게 공부하세요."
    },
    { 
        name: "주식 투자 용어 사전", 
        href: "/guide", 
        icon: HelpCircle,
        desc: "주식 초보자를 위한 필수 투자 용어, 지표, 분석법 및 기초 이론을 완벽하게 정리한 백과사전입니다."
    },
    { 
        name: "전문가 마켓 리포트", 
        href: "/blog", 
        icon: Newspaper,
        desc: "전문가가 매일 분석하는 국내/미국 증시 시황과 핵심 주도 테마 요약 리포트를 제공합니다."
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
        desc: "시장의 세력들이 돈을 쏟아붓는 주식과 기관들이 집중 매수하는 유망 종목을 자동으로 골라냅니다."
    },
    { 
        name: "기업 펀더멘탈 분석", 
        href: "/analysis", 
        icon: BarChart3,
        desc: "회사가 돈은 잘 버는지, 빚은 없는지, 부도 위험은 없는지 재무 구조를 철저히 검사해 줍니다."
    },
    { 
        name: "테마 트래커", 
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
        name: "포트폴리오 자산 진단", 
        href: "/portfolio", 
        icon: Shield,
        desc: "내가 산 주식들의 투자 비중을 분석하여 특정 종목에 몰리지 않고 안전하게 분산되어 있는지 진단합니다."
    },
    { 
        name: "스마트 워치리스트", 
        href: "/watchlist", 
        icon: Star,
        desc: "내가 찜한 종목들의 최신 시세와 관련 공시, 악재/호재 일정을 캘린더 형태로 자동 수집합니다."
    },
    { 
        name: "종목 디렉토리 (전체 종목)", 
        href: "/directory", 
        icon: List,
        desc: "국내 상장된 모든 주식 종목을 A-Z로 탐색하고 AI 주가 전망을 실시간으로 확인합니다.",
        hidden: true // 봇 크롤러용이므로 일반 유저 사이드바에서는 숨김 처리
    },
    { 
        name: "연동 설정 및 시스템 관리", 
        href: "/settings", 
        icon: Settings,
        desc: "증권사 계좌 연동을 위한 보안 키 등록 및 화면 다크모드, 알림 등 시스템 환경을 조율합니다."
    },
];

export default function Sidebar() {
    const { user, logout, isMigrating } = useAuth();
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
    const [mounted, setMounted] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);
    const [weekendCountdown, setWeekendCountdown] = useState<string | null>(null);

    // [New] Watchlist Preview State
    const [watchlistPreview, setWatchlistPreview] = useState<any[]>([]);

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
                // 1. Check if FCM Settings Modal is open
                const fcmModal = document.getElementById('fcm-settings-modal');
                if (fcmModal && fcmModal.getAttribute('data-open') === 'true') {
                    const closeBtn = document.getElementById('fcm-modal-close-btn');
                    if (closeBtn) {
                        closeBtn.click();
                        return;
                    }
                }

                // 2. Default navigation logic
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
            // [v4.1] 애드센스 승인 전까지 전면 무료 개방 안내 표시
            setIsPro(true);
            setTimeLeftStr("🎉 출시 기념 전면 무료 개방 중!");

            // [New] Weekend Countdown Timer
            const kstDateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" });
            const kstDate = new Date(kstDateStr);
            const day = kstDate.getDay();
            if (day === 0 || day === 6) {
                setWeekendCountdown(null); // It's weekend
            } else {
                // Find next Saturday 00:00 KST
                const daysUntilSaturday = 6 - day;
                const nextSaturday = new Date(kstDate);
                nextSaturday.setDate(kstDate.getDate() + daysUntilSaturday);
                nextSaturday.setHours(0, 0, 0, 0);
                
                const diff = nextSaturday.getTime() - kstDate.getTime();
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff / (1000 * 60)) % 60);
                const s = Math.floor((diff / 1000) % 60);
                
                setWeekendCountdown(`열리기까지 ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [user, showAdRewardModal]); // Update on modal close too

    // [New] Watchlist Synchronizer
    useEffect(() => {
        const fetchWatchlist = async () => {
            if (!user || isMigrating) {
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
    }, [user, isMigrating]);

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
                        <div className="flex items-center justify-between">
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
                            
                            {/* [Upgraded] Time Sync Badge */}
                            {(() => {
                                const activeCount = (clocks.isKorOpen ? 1 : 0) + (clocks.isUsaOpen ? 1 : 0) + (clocks.isJpnOpen ? 1 : 0) + (clocks.isUkOpen ? 1 : 0);
                                return (
                                    <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md border border-white/10" suppressHydrationWarning>
                                        <span className="text-[8px] text-blue-400 font-bold uppercase tracking-wider">Sync</span>
                                        <span className={`w-1.5 h-1.5 rounded-full ${activeCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                                        <span className={`text-[9px] font-bold ${activeCount > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                                            {activeCount} OPEN
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Ultra-sleek Micro Global Clocks Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {/* KOR Clock */}
                            <div className={`flex items-center justify-between p-2 rounded-xl border bg-black/40 ${clocks.isKorOpen ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-xs">🇰🇷</span>
                                    <div className="flex flex-col">
                                        <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${clocks.isKorOpen ? 'text-emerald-400' : 'text-gray-500'}`}>SEOUL</span>
                                        <span className={`text-[10px] font-mono font-bold mt-0.5 ${clocks.isKorOpen ? 'text-emerald-100' : 'text-gray-300'}`} suppressHydrationWarning>{clocks.korTime}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[8px] font-black tracking-widest ${clocks.isKorOpen ? 'text-emerald-400' : 'text-gray-600'}`}>
                                        {clocks.isKorOpen ? 'OPEN' : 'CLOSE'}
                                    </span>
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clocks.isKorOpen ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399] ring-2 ring-emerald-400/30' : 'bg-gray-700'}`} />
                                </div>
                            </div>

                            {/* USA Clock */}
                            <div className={`flex items-center justify-between p-2 rounded-xl border bg-black/40 ${clocks.isUsaOpen ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-xs">🇺🇸</span>
                                    <div className="flex flex-col">
                                        <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${clocks.isUsaOpen ? 'text-emerald-400' : 'text-gray-500'}`}>NEW YORK</span>
                                        <span className={`text-[10px] font-mono font-bold mt-0.5 ${clocks.isUsaOpen ? 'text-emerald-100' : 'text-gray-300'}`} suppressHydrationWarning>{clocks.usaTime}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[8px] font-black tracking-widest ${clocks.isUsaOpen ? 'text-emerald-400' : 'text-gray-600'}`}>
                                        {clocks.isUsaOpen ? 'OPEN' : 'CLOSE'}
                                    </span>
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clocks.isUsaOpen ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399] ring-2 ring-emerald-400/30' : 'bg-gray-700'}`} />
                                </div>
                            </div>

                            {/* JPN Clock */}
                            <div className={`flex items-center justify-between p-2 rounded-xl border bg-black/40 ${clocks.isJpnOpen ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-xs">🇯🇵</span>
                                    <div className="flex flex-col">
                                        <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${clocks.isJpnOpen ? 'text-emerald-400' : 'text-gray-500'}`}>TOKYO</span>
                                        <span className={`text-[10px] font-mono font-bold mt-0.5 ${clocks.isJpnOpen ? 'text-emerald-100' : 'text-gray-300'}`} suppressHydrationWarning>{clocks.jpnTime}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[8px] font-black tracking-widest ${clocks.isJpnOpen ? 'text-emerald-400' : 'text-gray-600'}`}>
                                        {clocks.isJpnOpen ? 'OPEN' : 'CLOSE'}
                                    </span>
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clocks.isJpnOpen ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399] ring-2 ring-emerald-400/30' : 'bg-gray-700'}`} />
                                </div>
                            </div>

                            {/* UK Clock */}
                            <div className={`flex items-center justify-between p-2 rounded-xl border bg-black/40 ${clocks.isUkOpen ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-xs">🇬🇧</span>
                                    <div className="flex flex-col">
                                        <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${clocks.isUkOpen ? 'text-emerald-400' : 'text-gray-500'}`}>LONDON</span>
                                        <span className={`text-[10px] font-mono font-bold mt-0.5 ${clocks.isUkOpen ? 'text-emerald-100' : 'text-gray-300'}`} suppressHydrationWarning>{clocks.ukTime}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[8px] font-black tracking-widest ${clocks.isUkOpen ? 'text-emerald-400' : 'text-gray-600'}`}>
                                        {clocks.isUkOpen ? 'OPEN' : 'CLOSE'}
                                    </span>
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${clocks.isUkOpen ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399] ring-2 ring-emerald-400/30' : 'bg-gray-700'}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* [New] Telegram Promotion Banner */}
                    <div className="mb-6 px-1">
                        <Link href="https://t.me/stocktrend_live" target="_blank" rel="noopener noreferrer">
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all group cursor-pointer border border-blue-400/30">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-[10px] font-black uppercase text-blue-200 tracking-wider">OFFICIAL CHANNEL</span>
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-white whitespace-nowrap">🔥 실시간 세력 매집 알림</span>
                                        <span className="text-xs text-blue-100 font-medium mt-0.5">텔레그램에서 가장 먼저 받기</span>
                                    </div>
                                    <div className="shrink-0 bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                                        <Send className="w-5 h-5 text-white transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>

                    <nav className="space-y-1.5">
                        {navigation.filter(item => {
                            if ((item as any).hidden) return false; // 숨김 처리된 탭 제외
                            return true;
                        }).map((item) => {
                            let isWeekend = true;
                            if (mounted) {
                                const kstDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
                                isWeekend = kstDate.getDay() === 0 || kstDate.getDay() === 6;
                            }
                            const isWeekendItem = item.href === '/weekend-report' || item.href === '/weekend-whale';
                            const isDisabled = isWeekendItem && !isWeekend;

                            return (
                                <div 
                                    key={item.name} 
                                    className={`relative group/menu flex flex-col rounded-xl transition-all ${isDisabled ? 'opacity-75 bg-white/5' : 'hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center justify-between pr-2 w-full">
                                        <Link
                                            href={isDisabled ? "#" : item.href}
                                            onClick={(e) => {
                                                if (isDisabled) {
                                                    e.preventDefault();
                                                    alert("주말(토/일)에만 열람 가능한 프리미엄 메뉴입니다. 카운트다운이 끝나면 열립니다!");
                                                } else {
                                                    setIsMobileOpen(false);
                                                }
                                            }}
                                            className={`flex-1 flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all ${isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-200 hover:text-white active:scale-98'}`}
                                    >
                                        <item.icon className={`h-5 w-5 ${isDisabled ? 'text-gray-500' : 'text-blue-400 group-hover/menu:text-blue-300'} transition-colors`} />
                                        <div className="flex flex-col">
                                            <span>{item.name}</span>
                                            {isDisabled && weekendCountdown && (
                                                <span className="text-[10px] text-amber-400 font-mono mt-0.5 tracking-wider animate-pulse">
                                                    ⏳ {weekendCountdown}
                                                </span>
                                            )}
                                        </div>
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
                            );
                        })}
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
                                        href={`/discovery?q=${stock.symbol.split('.')[0]}`}
                                        onClick={() => setIsMobileOpen(false)}
                                        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-all group border border-transparent hover:border-white/5 cursor-pointer"
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
                                    onClick={() => setIsMobileOpen(false)}
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
                    {/* 1. Reward/Timer block (No Payment) */}
                    {isPro ? (
                        <div className="rounded-xl bg-gradient-to-br from-blue-900/40 to-black p-2.5 border border-blue-500/30 shadow-lg flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                <span>AI 혜택 이용중</span>
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
                                        <Zap className="w-3 h-3 text-yellow-400" /> AI 분석 무료 이용
                                    </p>
                                    <p className="text-[9px] text-gray-400">광고 시청 시 기능 개방</p>
                                </div>
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



                    {/* 5. About & Contact links */}
                    <div className="flex justify-center gap-4 pt-1">
                        <Link
                            href="/about"
                            onClick={() => setIsMobileOpen(false)}
                            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors font-bold"
                        >
                            서비스 소개
                        </Link>
                        <span className="text-gray-700 text-[10px]">|</span>
                        <Link
                            href="/contact"
                            onClick={() => setIsMobileOpen(false)}
                            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors font-bold"
                        >
                            문의하기
                        </Link>
                    </div>

                    {/* 6. Version info */}
                    <div className="opacity-30 text-center">
                        <span className="text-[8px] font-mono text-gray-500">v3.8.0-READY</span>
                    </div>
                </div>
            </div>

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
            <AdRewardModal isOpen={showAdRewardModal} onClose={() => setShowAdRewardModal(false)} onReward={() => { }} featureName="SidebarCharge" />
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
