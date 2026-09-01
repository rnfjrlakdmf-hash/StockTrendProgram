"use client";

import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Star, Flame, TrendingUp, TrendingDown, LayoutDashboard, Newspaper, Compass, Settings, Bell, MessageSquare, LineChart, Crown, Zap, X, Network, Sparkles, UserCheck, Shield, CalendarDays, Menu, PlayCircle, Timer, History, BarChart3, Activity, Users, Globe, HelpCircle, List, Gift, Gem, BookOpen, Send, ChevronDown, ChevronRight, Trophy, Calculator } from "lucide-react";
import { usePathname } from "next/navigation";
import { App } from '@capacitor/app';
import MarketClock from "./MarketClock";
import { requestPayment } from "@/lib/payment";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "./LoginModal";
import AdRewardModal from "./AdRewardModal"; // Import Modal

const navigationGroups = [
    {
        groupName: "홈 & 대시보드",
        items: [
            { name: "통합 대시보드", href: "/", icon: LayoutDashboard, desc: "오늘의 주가지수, 헤드라인 뉴스 및 전체 시장 상황을 한눈에 요약해 주는 종합 상황판입니다." },
            { name: "글로벌 마켓 시그널", href: "/signals", icon: Activity, desc: "달러 환율, 국제 유가, 금값 및 오늘 밤 발표될 세계 경제 지표를 보여주는 경제 기상도입니다.", badge: "LIVE" },
            { name: "실시간 테마 트래커", href: "/theme", icon: Sparkles, desc: "오늘 시장에서 자금이 가장 집중되며 급상승하고 있는 인기 테마 그룹과 대장 주식을 보여줍니다.", badge: "HOT" },
        ]
    },
    {
        groupName: "프리미엄 & 리포트",
        items: [
            { name: "주식 고수 랭킹", href: "/ranking", icon: Trophy, desc: "전국 주식 고수들의 포트폴리오 수익률과 명예의 전당 랭킹입니다.", badge: "VIP" },
            { name: "VIP 프리미엄 리포트", href: "/premium", icon: Gem, desc: "실제 시장 데이터를 기반으로 외국인과 기관의 순매수 통계를 보여주는 데이터 리포트입니다.", badge: "PRO" },
            { name: "주말 마켓 인사이트", href: "/weekend-report", icon: Newspaper, desc: "주말에 발행되는 프리미엄 마켓 요약 리포트입니다." },
            { name: "주말 고래 수급 리포트", href: "/weekend-whale", icon: Crown, desc: "세력과 외국인이 매집한 TOP 10 종목을 파헤치는 주말 프리미엄 리포트입니다." },
            { name: "전문가 마켓 리포트", href: "/blog", icon: Newspaper, desc: "전문가가 매일 분석하는 국내/미국 증시 시황과 핵심 주도 테마 요약 리포트를 제공합니다." },
            { name: "실시간 핫이슈 종목", href: "/post", icon: Flame, desc: "실시간으로 쏟아지는 구글 검색 트렌드 기반 급등주 및 테마주 핫이슈 리포트입니다." },
        ]
    },
    {
        groupName: "종목 발굴 & 분석",
        items: [
            { name: "종목 발굴 & 분석", href: "/discovery", icon: Compass, desc: "시장의 세력들이 돈을 쏟아붓는 주식과 기관들이 집중 매수하는 유망 종목을 자동으로 골라냅니다.", badge: "AI" },
            { name: "기업 펀더멘탈 분석", href: "/analysis", icon: BarChart3, desc: "회사의 실적, 부채, 밸류에이션 등 재무 건전성을 체계적으로 검사합니다." },
            { name: "기술적 패턴 분석", href: "/pattern", icon: LineChart, desc: "골든크로스, 지지선/저항선, 캔들 차트 패턴을 정밀 분석합니다." },
            { name: "ETF 포트폴리오 분석", href: "/etf", icon: Activity, desc: "시장 전체나 유망 산업 분야에 분산 투자할 수 있는 ETF를 비교합니다." },
            { name: "글로벌 서플라이 체인", href: "/supply-chain", icon: Network, desc: "기업 간 부품 공급망 및 밸류체인 인맥도를 지도로 보여줍니다." },
        ]
    },
    {
        groupName: "내 투자 & 자산 관리",
        items: [
            { name: "포트폴리오 자산 진단", href: "/portfolio", icon: Shield, desc: "내가 보유한 종목들의 투자 비중과 섹터 편중도를 분석하여 분산 투자 상태를 진단합니다." },
            { name: "스마트 관심종목", href: "/watchlist", icon: Star, desc: "내가 찜한 관심 종목들의 최신 시세와 실시간 공시 일정을 한곳에서 모아봅니다." },
            { name: "물타기 평단 계산기", href: "/calculator", icon: Calculator, desc: "추가 매수 시 변화하는 평단가와 탈출 시나리오를 계산합니다.", badge: "NEW" },
        ]
    },
    {
        groupName: "스터디 & 설정",
        items: [
            { name: "차트 스터디 (이론방)", href: "/theory", icon: BookOpen, desc: "차트 보는 법과 실전 주식 기초 이론을 쉽고 체계적으로 학습합니다." },
            { name: "주식 투자 용어 사전", href: "/guide", icon: HelpCircle, desc: "주식 초보자를 위한 필수 투자 용어 및 기초 지표를 정리한 백과사전입니다." },
            { name: "종목 디렉토리 (전체 종목)", href: "/directory", icon: List, desc: "국내 상장된 모든 주식 종목을 A-Z로 탐색합니다.", hidden: true },
            { name: "연동 설정 및 시스템 관리", href: "/settings", icon: Settings, desc: "증권사 API 연동, 화면 다크모드, 알림 설정 등 시스템 환경을 관리합니다." },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout, isMigrating } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        "홈 & 대시보드": true,
        "프리미엄 & 인사이트": true,
        "발굴 & 분석": false,
        "마이 트레이딩": false,
        "스터디 & 설정": false
    });

    const toggleGroup = (groupName: string) => {
        setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

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

    // [New] Mobile Sidebar Trigger Listener
    useEffect(() => {
        const handleOpenMobileSidebar = () => setIsMobileOpen(true);
        window.addEventListener('open-mobile-sidebar', handleOpenMobileSidebar);
        return () => window.removeEventListener('open-mobile-sidebar', handleOpenMobileSidebar);
    }, []);
    const [showProModal, setShowProModal] = useState(false);
    const [showAdRewardModal, setShowAdRewardModal] = useState(false); // [New] Modal State
    const [exchangeRate, setExchangeRate] = useState<number>(1450); // Default fallback
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);

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
        };

        updateTimer();
    }, [user, showAdRewardModal]);

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
                className="md:hidden fixed top-3 left-4 z-[110] p-2.5 rounded-2xl bg-zinc-900/90 text-white border border-white/15 hover:bg-zinc-800 backdrop-blur-xl shadow-2xl active:scale-95 transition-all"
                aria-label="메뉴 열기"
            >
                <Menu className="h-5 w-5 text-orange-400" />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-[1001] bg-black/80 backdrop-blur-md md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Ultra-Luxury VIP Sidebar Container */}
            <aside className={`
                fixed inset-y-0 left-0 z-[1002] h-full w-80 flex flex-col justify-between border-r border-white/10 bg-gradient-to-b from-zinc-950/95 via-zinc-900/95 to-black text-white p-4 pt-20 md:pt-4 transition-transform duration-300 ease-out shadow-[10px_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl
                md:relative md:translate-x-0 md:flex
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="absolute top-5 right-4 p-2 text-zinc-400 hover:text-white md:hidden z-10 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                    aria-label="메뉴 닫기"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar pb-4 space-y-5">
                    
                    {/* 1. VIP Brand Logo & Real-time Global Clocks Header */}
                    <div className="p-4 rounded-3xl bg-gradient-to-br from-white/[0.04] to-zinc-950/80 border border-white/10 shadow-lg space-y-4 relative overflow-hidden">
                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                        
                        {/* Brand Logo Row */}
                        <div className="flex items-center justify-between relative z-10">
                            <Link href="/" className="flex items-center gap-2.5 group">
                                <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-black shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                                    <Sparkles className="w-5 h-5 text-black font-black animate-pulse" />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black animate-ping" />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-yellow-300">
                                        STOCK TREND
                                    </span>
                                    <span className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-1 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        VIP QUANT TERMINAL
                                    </span>
                                </div>
                            </Link>

                            {/* Active Market Sync Indicator */}
                            {(() => {
                                const activeCount = (clocks.isKorOpen ? 1 : 0) + (clocks.isUsaOpen ? 1 : 0) + (clocks.isJpnOpen ? 1 : 0) + (clocks.isUkOpen ? 1 : 0);
                                return (
                                    <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full border border-white/10 shadow-inner" suppressHydrationWarning>
                                        <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-zinc-600'}`} />
                                        <span className={`text-[10px] font-black font-mono ${activeCount > 0 ? 'text-emerald-300' : 'text-zinc-500'}`}>
                                            {activeCount}개장
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* 4 Global Clocks Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
                            {/* KOR Clock */}
                            <div className={`p-2.5 rounded-2xl border transition-all ${
                                clocks.isKorOpen 
                                    ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                    : 'border-white/5 bg-black/40'
                            }`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                        <span>🇰🇷</span> 서울
                                    </span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                                        clocks.isKorOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-600 bg-white/5'
                                    }`}>
                                        {clocks.isKorOpen ? 'OPEN' : 'CLOSED'}
                                    </span>
                                </div>
                                <div className={`text-xs font-mono font-black ${clocks.isKorOpen ? 'text-emerald-200' : 'text-zinc-400'}`} suppressHydrationWarning>
                                    {clocks.korTime || '09:00:00'}
                                </div>
                            </div>

                            {/* USA Clock */}
                            <div className={`p-2.5 rounded-2xl border transition-all ${
                                clocks.isUsaOpen 
                                    ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                    : 'border-white/5 bg-black/40'
                            }`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                        <span>🇺🇸</span> 뉴욕
                                    </span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                                        clocks.isUsaOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-600 bg-white/5'
                                    }`}>
                                        {clocks.isUsaOpen ? 'OPEN' : 'CLOSED'}
                                    </span>
                                </div>
                                <div className={`text-xs font-mono font-black ${clocks.isUsaOpen ? 'text-emerald-200' : 'text-zinc-400'}`} suppressHydrationWarning>
                                    {clocks.usaTime || '22:30:00'}
                                </div>
                            </div>

                            {/* JPN Clock */}
                            <div className={`p-2.5 rounded-2xl border transition-all ${
                                clocks.isJpnOpen 
                                    ? 'border-emerald-500/40 bg-emerald-950/20' 
                                    : 'border-white/5 bg-black/40'
                            }`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                        <span>🇯🇵</span> 도쿄
                                    </span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                                        clocks.isJpnOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-600 bg-white/5'
                                    }`}>
                                        {clocks.isJpnOpen ? 'OPEN' : 'CLOSED'}
                                    </span>
                                </div>
                                <div className={`text-xs font-mono font-black ${clocks.isJpnOpen ? 'text-emerald-200' : 'text-zinc-400'}`} suppressHydrationWarning>
                                    {clocks.jpnTime || '09:00:00'}
                                </div>
                            </div>

                            {/* UK Clock */}
                            <div className={`p-2.5 rounded-2xl border transition-all ${
                                clocks.isUkOpen 
                                    ? 'border-emerald-500/40 bg-emerald-950/20' 
                                    : 'border-white/5 bg-black/40'
                            }`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                        <span>🇬🇧</span> 런던
                                    </span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                                        clocks.isUkOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-600 bg-white/5'
                                    }`}>
                                        {clocks.isUkOpen ? 'OPEN' : 'CLOSED'}
                                    </span>
                                </div>
                                <div className={`text-xs font-mono font-black ${clocks.isUkOpen ? 'text-emerald-200' : 'text-zinc-400'}`} suppressHydrationWarning>
                                    {clocks.ukTime || '16:00:00'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. VIP Telegram Live News Channel Banner */}
                    <div>
                        <Link href="https://t.me/stocktrend_live" target="_blank" rel="noopener noreferrer">
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/50 to-zinc-950 p-4 border border-blue-500/30 hover:border-blue-400/60 shadow-lg hover:shadow-blue-500/10 transition-all group cursor-pointer">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex flex-col min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                                                <Zap className="w-2.5 h-2.5 text-yellow-400 animate-pulse" /> 텔레그램 속보
                                            </span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                                        </div>
                                        <h3 className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">
                                            실시간 세력 수급 &amp; 공시
                                        </h3>
                                        <p className="text-[10px] text-zinc-400 truncate">
                                            장중 급등주 무료 즉시 알림
                                        </p>
                                    </div>
                                    <div className="shrink-0 bg-blue-500/20 border border-blue-500/40 p-2.5 rounded-2xl group-hover:bg-blue-500 group-hover:text-black transition-all text-blue-300 shadow-md group-hover:scale-105">
                                        <Send className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* 3. Luxury Category Navigation Menu */}
                    <nav className="space-y-4">
                        {navigationGroups.map((group) => {
                            const isOpen = openGroups[group.groupName] ?? true;
                            return (
                                <div key={group.groupName} className="space-y-1">
                                    <button
                                        onClick={() => toggleGroup(group.groupName)}
                                        className="flex items-center justify-between px-3 py-2 w-full text-left group hover:bg-white/5 rounded-2xl transition-colors cursor-pointer"
                                    >
                                        <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider group-hover:text-orange-400 transition-colors">
                                            {group.groupName}
                                        </span>
                                        {isOpen ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400 transition-colors" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400 transition-colors" />
                                        )}
                                    </button>
                                    
                                    {isOpen && (
                                        <div className="space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                            {group.items.filter(item => !(item as any).hidden).map((item: any) => {
                                                const isActive = pathname === item.href;

                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        onClick={() => setIsMobileOpen(false)}
                                                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-[13px] transition-all font-semibold group relative ${
                                                            isActive
                                                                ? 'bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-transparent text-amber-200 font-black border border-orange-500/40 shadow-lg shadow-orange-500/5'
                                                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <item.icon className={`h-4 w-4 shrink-0 transition-colors ${
                                                                isActive ? 'text-orange-400' : 'text-zinc-500 group-hover:text-amber-300'
                                                            }`} />
                                                            <span className="truncate">{item.name}</span>
                                                        </div>

                                                        {/* Feature Badge */}
                                                        {item.badge && (
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 shadow-sm ${
                                                                item.badge === 'VIP' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black' :
                                                                item.badge === 'HOT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                                                item.badge === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' :
                                                                'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                            }`}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Admin Link */}
                        {(user?.email?.toLowerCase() === "rnfjr@gmail.com" || user?.email?.toLowerCase() === "rnfjrlakdmf@gmail.com") && (
                            <Link
                                href="/admin"
                                onClick={() => setIsMobileOpen(false)}
                                className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-xs font-bold bg-fuchsia-950/40 text-fuchsia-300 border border-fuchsia-500/30 transition-all hover:bg-fuchsia-900/50 hover:text-fuchsia-200 mt-2"
                            >
                                <Shield className="h-4 w-4 text-fuchsia-400" />
                                <span>관리자 센터 👑</span>
                            </Link>
                        )}
                    </nav>

                    {/* 4. Watchlist Preview Section */}
                    {user && watchlistPreview.length > 0 && (
                        <div className="mt-4 p-4 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-2">
                            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                                <span>⭐ 최근 관심종목</span>
                                <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono">{watchlistPreview.length}</span>
                            </h4>
                            <div className="space-y-1.5 pt-1">
                                {watchlistPreview.map((stock, idx) => (
                                    <Link
                                        key={stock.code || idx}
                                        href={`/discovery?q=${(stock.code || '').split('.')[0]}`}
                                        onClick={() => setIsMobileOpen(false)}
                                        className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5 hover:text-white transition-all group border border-transparent hover:border-white/5"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Star className="w-3 h-3 text-amber-400 fill-amber-400/20 group-hover:fill-amber-400 transition-all" />
                                            <span className="truncate">{stock.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-500 group-hover:text-amber-300 transition-colors uppercase">{stock.code}</span>
                                    </Link>
                                ))}
                                <Link
                                    href="/watchlist"
                                    onClick={() => setIsMobileOpen(false)}
                                    className="block text-[11px] text-center text-zinc-400 hover:text-orange-400 pt-2 transition-colors font-bold"
                                >
                                    관심종목 전체보기 →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Bottom Section: VIP Status & User Profile */}
                <div className="mt-auto space-y-3 pt-4 border-t border-white/10">
                    {/* VIP All-Access Card */}
                    <div className="rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-zinc-950 p-3.5 border border-orange-500/30 shadow-lg flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs">
                                <Crown className="w-3.5 h-3.5 text-yellow-400" />
                                <span>VIP 올액세스 패스</span>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                전면 무료 개방
                            </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed pt-0.5">모든 AI 퀀트 분석과 VIP 리포트를 무제한 이용 중입니다.</p>
                    </div>

                    {/* User Profile / Login */}
                    {user && !user.is_guest ? (
                        <div className="rounded-2xl bg-zinc-950/80 p-3 border border-white/10 flex items-center justify-between gap-3 shadow-lg">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-black text-black text-xs shadow-md shrink-0">
                                    {user.name?.[0] || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate">{user.name || 'VIP 회원'}</p>
                                    <p className="text-[10px] text-zinc-400 truncate">{user.email || ''}</p>
                                </div>
                            </div>
                            <button 
                                onClick={logout} 
                                className="p-1.5 px-2.5 text-zinc-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-[10px] font-bold shrink-0 cursor-pointer active:scale-95"
                            >
                                로그아웃
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
                            className="w-full rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 py-3 text-xs font-black text-black hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 cursor-pointer active:scale-95"
                        >
                            <UserCheck className="w-4 h-4 text-black" />
                            <span>{user?.is_guest ? "정식 계정 로그인 / 연동" : "VIP 로그인 / 회원가입"}</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* Modals */}
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
            <AdRewardModal isOpen={showAdRewardModal} onClose={() => setShowAdRewardModal(false)} />
        </>
    );
}