"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, User, BarChart2, ShieldAlert, Sparkles, LineChart, UserCheck, Users, HelpCircle, Send, BellRing, Star, Briefcase, ChevronRight, LogOut, LogIn, Coins, ShieldCheck, CheckCircle2, Flame, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import AttendanceModal from './AttendanceModal';
import LoginModal from './LoginModal';

const ADMIN_EMAILS = ['rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'];

import FlipIndexTicker from './FlipIndexTicker';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    onSearch?: (term: string) => void;
}

export default function Header({ title = "대시보드", subtitle = "환영합니다, 투자자님", onSearch }: HeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [coins, setCoins] = useState<number>(0);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [attendanceStreak, setAttendanceStreak] = useState(user?.attendance_streak || 0);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 메뉴 바깥 클릭 시 닫기
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 유저 객체가 변경될 때 연속 출석일 동기화
    useEffect(() => {
        if (user && user.attendance_streak !== undefined) {
            setAttendanceStreak(user.attendance_streak);
        }
    }, [user]);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                let lastVisitTime = 0;
                const storedVisit = localStorage.getItem('last_alert_visit');
                if (storedVisit) {
                    lastVisitTime = new Date(storedVisit).getTime();
                }

                const alertsRef = collection(db, "alerts");
                const q = query(alertsRef, orderBy("timestamp", "desc"), limit(50));
                const snapshot = await getDocs(q);
                
                let unreadCount = 0;
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const alertTime = data.timestamp?.seconds ? data.timestamp.seconds * 1000 : 0;
                    
                    if (alertTime > lastVisitTime) {
                        const isGlobal = data.is_global === true || data.is_global === undefined;
                        const isTargetedToMe = user && data.target_users && Array.isArray(data.target_users) && data.target_users.includes((user as any).uid || (user as any).id);
                        
                        if (user) {
                            if (isGlobal || isTargetedToMe) unreadCount++;
                        } else {
                            if (isGlobal) unreadCount++;
                        }
                    }
                });
                
                setUnreadAlertsCount(unreadCount);
            } catch (err) {
                console.error("Failed to fetch unread alerts count", err);
            }
        };

        fetchUnreadCount();

        // Listen for updates when user visits alerts page
        const handleAlertsVisited = () => setUnreadAlertsCount(0);
        window.addEventListener('alerts_visited', handleAlertsVisited);
        
        // Refresh count periodically (every 1 minute)
        const intervalId = setInterval(fetchUnreadCount, 60000);

        return () => {
            window.removeEventListener('alerts_visited', handleAlertsVisited);
            clearInterval(intervalId);
        };
    }, [user]);

    // [New] Fetch User Profile (Coins)
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                const userId = (user as any).uid || (user as any).id;
                const res = await fetch(`${API_BASE_URL}/api/auth/user/${userId}/profile`);
                const json = await res.json();
                if (json.status === "success" && json.user) {
                    setCoins(json.user.coins || 0);
                }
            } catch (err) {
                console.error("Failed to fetch user profile", err);
            }
        };
        fetchProfile();

        const handleCoinsUpdated = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail !== undefined) {
                setCoins(customEvent.detail);
            } else {
                fetchProfile(); // fallback
            }
        };

        window.addEventListener("coins_updated", handleCoinsUpdated);
        return () => window.removeEventListener("coins_updated", handleCoinsUpdated);
    }, [user]);

    // [자동 출석 로직]
    useEffect(() => {
        if (!user) return;
        
        const autoAttend = async () => {
            try {
                const userId = (user as any).uid || (user as any).id;
                const lastAutoAttend = localStorage.getItem(`auto_attend_${userId}`);
                const todayStr = new Date().toISOString().split('T')[0];
                
                // 오늘 이미 자동 출석을 시도했다면 스킵 (API 호출 최소화)
                if (lastAutoAttend === todayStr) return;
                
                const res = await fetch(`${API_BASE_URL}/api/auth/user/attendance`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: userId })
                });
                const json = await res.json();
                
                localStorage.setItem(`auto_attend_${userId}`, todayStr);
                
                if (json.status === "success") {
                    setCoins(json.coins);
                    if (json.streak !== undefined) setAttendanceStreak(json.streak);
                    
                    if (json.bonus && json.bonus > 0) {
                        toast.success(`🎉 자동 출석: ${json.streak}일 연속 출석 달성! 보너스 ${json.bonus} 코인을 획득했습니다! (총 ${json.coins} 코인)`);
                    } else {
                        toast.success(`🎉 자동 출석 완료! 10 코인을 획득했습니다. (총 ${json.coins} 코인)`);
                    }
                    
                    // 성공 시 달력 팝업을 띄워줌
                    setIsAttendanceModalOpen(true);
                } else if (json.status === "already") {
                    if (json.streak !== undefined) setAttendanceStreak(json.streak);
                    // 이미 출석된 경우 아무것도 안 함
                }
            } catch (err) {
                console.error("Auto attendance failed", err);
            }
        };
        
        // 약간의 지연 후 실행 (UI 렌더링 방해 않도록)
        const timer = setTimeout(autoAttend, 1500);
        return () => clearTimeout(timer);
    }, [user]);

    const handleAttendance = async () => {
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        setIsAttendanceLoading(true);
        try {
            const userId = (user as any).uid || (user as any).id;
            const res = await fetch(`${API_BASE_URL}/api/auth/user/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId })
            });
            const json = await res.json();
            
            if (json.status === "success") {
                setCoins(json.coins);
                if (json.streak !== undefined) setAttendanceStreak(json.streak);
                
                if (json.bonus && json.bonus > 0) {
                    toast.success(`🎉 ${json.streak}일 연속 출석 달성! 보너스 ${json.bonus} 코인을 추가 획득했습니다! (총 ${json.coins} 코인)`);
                } else {
                    toast.success(json.message || "10 코인 획득!");
                }
                setIsAttendanceModalOpen(true);
            } else if (json.status === "already") {
                if (json.streak !== undefined) setAttendanceStreak(json.streak);
                toast.info(`이미 출석체크를 완료했습니다! (현재 ${json.coins} 코인)`);
                setIsAttendanceModalOpen(true);
            } else {
                toast.error("❌ 오류: " + json.message);
            }
        } catch (err) {
            console.error(err);
            toast.error("출석체크 중 오류가 발생했습니다.");
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const term = searchQuery.trim();
        if (!term) return;
        
        // [Real-time SEO] Record search query
        try {
            fetch(`${API_BASE_URL}/api/system/search/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: term, source: 'header_search' })
            }).catch(() => {});
        } catch (_) {}

        if (onSearch) {
            onSearch(term);
        } else {
            router.push(`/discovery?q=${encodeURIComponent(term)}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
        }
    };

    // [New] Real-time Alert Polling
    useEffect(() => {
        const checkAlerts = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/alerts`);
                const json = await res.json();
                if (json.status === "success" && Array.isArray(json.data)) {
                    const triggered = json.data.filter((a: any) => a.status === "triggered");

                    // Check local storage to see if we already notified this specific trigger
                    let lastSeen = [];
                    try {
                        const stored = localStorage.getItem("seenAlerts");
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            if (Array.isArray(parsed)) lastSeen = parsed;
                        }
                    } catch (e) {
                        console.error("Failed to parse seenAlerts", e);
                    }
                    
                    const newTriggers = triggered.filter((a: any) => !lastSeen.includes(a.id + "_" + a.triggered_at));

                    if (Array.isArray(newTriggers) && newTriggers.length > 0) {
                        // Play Alert Sound
                        try {
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(ctx.destination);

                            // Ding-Dong effect
                            osc.frequency.setValueAtTime(880, ctx.currentTime); // High
                            osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.5); // Low
                            gain.gain.setValueAtTime(0.5, ctx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

                            osc.start();
                            osc.stop(ctx.currentTime + 0.6);
                        } catch (e) {
                            console.error("Audio block", e);
                        }

                        // Browser Notification (Toast style)
                        const msg = `🚨 [가격 알림] ${newTriggers[0].symbol} 목표가 도달!\n현재가: ${newTriggers[0].triggered_price}\n목표가: ${newTriggers[0].target_price}`;
                        toast.success(msg, { duration: 5000 });

                        // Mark as seen
                        const updatedSeen = [...lastSeen, ...newTriggers.map((a: any) => a.id + "_" + a.triggered_at)];
                        localStorage.setItem("seenAlerts", JSON.stringify(updatedSeen));
                    }
                }
            } catch (e) {
                // Ignore fetch errors
            }
        };

        const interval = setInterval(checkAlerts, 10000); // Check every 10s
        checkAlerts(); // Run immediately on mount
        return () => clearInterval(interval);
    }, []);

    return (
        <>
        <header className="sticky top-0 z-[100] border-b border-white/10 bg-[#07080d]/90 backdrop-blur-2xl transition-all duration-300 shadow-2xl">
            {/* Top Navigation Row */}
            <div className="flex flex-row items-center justify-between px-4 py-2.5 md:px-6 md:py-3 gap-2">
                <div className="flex items-center gap-2 flex-shrink-0 min-w-max mr-2 z-20">
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2 whitespace-nowrap">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-[11px] md:text-xs text-gray-400 font-medium hidden md:block whitespace-nowrap tracking-tight">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 justify-end shrink-0 ml-auto z-20">
                {/* Global Search Bar */}
                <div className="flex relative w-full flex-1 max-w-[130px] sm:max-w-[160px] md:max-w-[180px] group transition-all duration-500 ease-out hover:max-w-[200px] sm:hover:max-w-[240px] md:hover:max-w-[340px] focus-within:flex-1 focus-within:max-w-[200px] sm:focus-within:max-w-[240px] md:focus-within:max-w-[340px] pl-10 sm:pl-0">
                    <div className="absolute inset-y-0 left-10 sm:left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400 group-hover:text-gray-200 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="종목/테마 검색"
                        className="block w-full pl-9 pr-3 py-1.5 md:py-2 border border-white/5 rounded-full bg-white/5 text-xs md:text-sm placeholder-gray-500 text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-glass hover:bg-white/10"
                    />
                </div>

                <div className="flex items-center justify-end gap-3" ref={dropdownRef}>
                    <Link href="/alerts" className="relative p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all hover:shadow-glass group">
                        <Bell className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                        {user && unreadAlertsCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border border-[#0a0a0c] z-10 shadow-lg animate-pulse">
                                {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                            </span>
                        )}
                    </Link>
                    <div className="relative">
                        <button 
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="rounded-xl border border-white/5 bg-white/5 p-1 flex items-center gap-2 pr-3 hover:bg-white/10 transition-all shrink-0 relative hover:shadow-glass group"
                        >
                            
                            {user && !user.is_guest ? (
                                <>
                                    {user.picture ? (
                                        <img
                                            src={user.picture}
                                            alt={user.name}
                                            className="h-8 w-8 rounded-lg object-cover border border-white/10"
                                        />
                                    ) : (
                                        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-1.5">
                                            <User className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-gray-300 hidden md:block">{user.name}</span>
                                </>
                            ) : (
                                <>
                                    <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-1.5">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-300 hidden md:block">메뉴</span>
                                </>
                            )}
                        </button>

                        {/* Dropdown Menu - Executive Profile Hub */}
                        {isProfileMenuOpen && (
                            <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-[340px] bg-zinc-950/95 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-4 sm:p-5 flex flex-col gap-3 z-50 animate-in slide-in-from-top-2 duration-200 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(59,130,246,0.2)]">
                                
                                {/* 1. 회원 프로필 헤더 & 회원 등급 */}
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/25 text-sm shrink-0">
                                            {user?.name ? user.name.slice(0, 2) : '👤'}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-white font-black text-sm truncate max-w-[130px]">
                                                    {user?.name || (user?.email ? user.email.split('@')[0] : '게스트 투자자')}
                                                </span>
                                                {user && !user.is_guest ? (
                                                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                                        VIP 정회원
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 border border-white/10 shrink-0">
                                                        게스트
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-zinc-400 text-[11px] truncate max-w-[160px]">
                                                {user?.email || '체험 모드 이용 중'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {user && !user.is_guest ? (
                                        <button
                                            onClick={() => {
                                                logout();
                                                setIsProfileMenuOpen(false);
                                            }}
                                            className="text-[11px] font-bold text-zinc-400 hover:text-red-400 p-1.5 rounded-xl hover:bg-red-500/10 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                            title="로그아웃"
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            <span>로그아웃</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setShowLoginModal(true);
                                                setIsProfileMenuOpen(false);
                                            }}
                                            className="text-[11px] font-black text-blue-400 hover:text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 px-2.5 py-1 rounded-xl border border-blue-500/30 transition-all active:scale-95 shrink-0 cursor-pointer"
                                        >
                                            로그인
                                        </button>
                                    )}
                                </div>

                                {/* 2. 스마트 코인 지갑 & 출석체크 리워드 카드 */}
                                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-zinc-900/90 to-black border border-amber-500/30 space-y-2.5 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm">🪙</span>
                                            <span className="text-xs font-bold text-zinc-300">나의 보유 코인</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-black text-amber-400 font-mono text-sm bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                                            <span>{coins}</span>
                                            <span className="text-xs font-bold text-amber-300">C</span>
                                        </div>
                                    </div>

                                    {/* 출석체크 실행 버튼 */}
                                    <button
                                        onClick={() => {
                                            handleAttendance();
                                            setIsProfileMenuOpen(false);
                                        }}
                                        disabled={isAttendanceLoading}
                                        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                                        <span>오늘의 출석체크 (+10 코인 받기)</span>
                                    </button>

                                    {/* 코인 활용 팁 */}
                                    <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
                                        <span>💡 매일 출석 시 코인 적립</span>
                                        <span className="text-amber-300/80 font-medium">연속 {attendanceStreak}일 달성 중</span>
                                    </div>

                                    {user?.is_guest && (
                                        <button
                                            onClick={() => {
                                                setShowLoginModal(true);
                                                setIsProfileMenuOpen(false);
                                            }}
                                            className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white py-1.5 rounded-xl text-[11px] font-bold transition-all border border-white/10 flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <span>구글 정식 연동하고 코인 영구 보존하기</span>
                                            <ChevronRight className="w-3 h-3 text-zinc-400" />
                                        </button>
                                    )}
                                </div>

                                {/* 3. 주요 투자 허브 내비게이션 메뉴 */}
                                <div className="space-y-1 text-xs">
                                    {/* 관심종목 */}
                                    <Link 
                                        href="/watchlist" 
                                        onClick={() => setIsProfileMenuOpen(false)}
                                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                                                <Star className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-white">나의 관심종목</div>
                                                <div className="text-[10px] text-zinc-400">실시간 목표가 &amp; 수급 추적</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                                    </Link>

                                    {/* 포트폴리오 */}
                                    <Link 
                                        href="/portfolio" 
                                        onClick={() => setIsProfileMenuOpen(false)}
                                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-white">포트폴리오 &amp; 수익률 계산</div>
                                                <div className="text-[10px] text-zinc-400">내 자산 비중 &amp; 리밸런싱</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                                    </Link>

                                    {/* 실시간 알림센터 */}
                                    <Link 
                                        href="/alerts" 
                                        onClick={() => setIsProfileMenuOpen(false)}
                                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                                                <Bell className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                                    <span>스마트 알림센터</span>
                                                    {unreadAlertsCount > 0 && (
                                                        <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                                                            {unreadAlertsCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-zinc-400">DART 공시·뉴스 속보 모아보기</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                                    </Link>

                                    {/* 푸시 알림 설정 */}
                                    <Link 
                                        href="/settings" 
                                        onClick={() => setIsProfileMenuOpen(false)}
                                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                                <BellRing className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-white">푸시 알림 설정 (FCM)</div>
                                                <div className="text-[10px] text-zinc-400">급등락·공시 실시간 수신 제어</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                                    </Link>

                                    {/* 이용 가이드 */}
                                    <Link 
                                        href="/guide" 
                                        onClick={() => setIsProfileMenuOpen(false)}
                                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                                                <HelpCircle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs text-white">주식 퀀트 백과 가이드</div>
                                                <div className="text-[10px] text-zinc-400">46대 지표 &amp; 실전 투자 사전</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                                    </Link>
                                </div>

                                {/* 4. 커뮤니티 & 실시간 피드 채널 */}
                                <div className="pt-2.5 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                                    <a 
                                        href="https://discord.com/invite/gQrUXaaqB" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-white/5 hover:bg-[#5865F2]/20 text-zinc-300 hover:text-[#5865F2] border border-white/5 transition-all"
                                    >
                                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                                        </svg>
                                        <span className="font-bold text-[11px]">디스코드 토론</span>
                                    </a>

                                    <a 
                                        href="https://t.me/stocktrend_live" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-white/5 hover:bg-sky-500/20 text-zinc-300 hover:text-sky-400 border border-white/5 transition-all"
                                    >
                                        <Send className="w-3.5 h-3.5 shrink-0" />
                                        <span className="font-bold text-[11px]">텔레그램 속보</span>
                                    </a>
                                </div>

                                {/* 5. 관리자 시스템 링크 (관리자 이메일 로그인 시만 노출) */}
                                {user && ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '') && (
                                    <Link 
                                        href="/admin" 
                                        onClick={() => setIsProfileMenuOpen(false)} 
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 transition-all font-bold text-xs"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-purple-400" />
                                            <span>👑 관리자 전용 관제 센터</span>
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>

            {/* Dedicated Full-Width Ultra-Luxury Live Ticker Marquee Stream */}
            {pathname !== '/settings' && title !== '설정' && (
                <div className="w-full border-t border-white/5 bg-gradient-to-r from-[#06070d] via-[#0c1024] to-[#06070d] shadow-inner">
                    <FlipIndexTicker />
                </div>
            )}
        </header>
        <LoginModal 
            isOpen={showLoginModal} 
            onClose={() => setShowLoginModal(false)} 
        />
        {user && (
            <AttendanceModal 
                isOpen={isAttendanceModalOpen} 
                onClose={() => setIsAttendanceModalOpen(false)} 
                userId={user ? ((user as any).uid || (user as any).id) : ""}
                streak={attendanceStreak}
            />
        )}
        </>
    );
}
