"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, User, BarChart2, ShieldAlert, Sparkles, LineChart, UserCheck, Users, HelpCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
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
    const { user } = useAuth();
    const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
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
                        alert(`🎉 자동 출석: ${json.streak}일 연속 출석 달성! 보너스 ${json.bonus} 코인을 획득했습니다! (총 ${json.coins} 코인)`);
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
            alert("로그인이 필요합니다.");
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
                    alert(`🎉 ${json.streak}일 연속 출석 달성! 보너스 ${json.bonus} 코인을 추가 획득했습니다! (총 ${json.coins} 코인)`);
                } else {
                    alert(json.message || "10 코인 획득!");
                }
                setIsAttendanceModalOpen(true);
            } else if (json.status === "already") {
                if (json.streak !== undefined) setAttendanceStreak(json.streak);
                setIsAttendanceModalOpen(true);
            } else {
                alert("❌ 오류: " + json.message);
            }
        } catch (err) {
            console.error(err);
            alert("출석체크 중 오류가 발생했습니다.");
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(e.currentTarget.value);
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

                        // Browser Notification (Toast style via window.alert for now, simplest to force attention)
                        // In a real app we would use a Toast component, but alert() is effective for forcing user to see it.
                        // Or we can just log it if we want to be less intrusive, but user asked for ALERTS.

                        // Let's use simple alert for v1
                        const msg = `🚨 [가격 알림] ${newTriggers[0].symbol} 목표가 도달!\n현재가: ${newTriggers[0].triggered_price}\n목표가: ${newTriggers[0].target_price}`;
                        // We use setTimeout to let UI render/sound play before blocking with alert
                        setTimeout(() => alert(msg), 100);

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
        <header className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50 transition-all duration-200">
            <div className="flex items-center gap-8 w-full md:w-auto mb-4 md:mb-0 flex-shrink-0 min-w-[150px]">
                <div className="flex flex-col">
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2 whitespace-nowrap">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-xs md:text-sm text-gray-400 font-medium hidden md:block whitespace-nowrap">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Navigation moved to Sidebar */}
            </div>

            {/* [New] Flip Clock Style Index Ticker (Center Space) */}
            {pathname !== '/settings' && title !== '설정' && (
                <div className="hidden lg:flex flex-1 items-center justify-center mx-4 min-w-0 overflow-hidden">
                    <FlipIndexTicker />
                </div>
            )}

            <div className="flex items-center gap-4 w-full md:w-auto justify-end min-w-0">
                {/* Search Bar Removed as per user request */}

                <div className="flex items-center justify-end" ref={dropdownRef}>
                    <div className="relative">
                        <button 
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="rounded-xl border border-white/5 bg-white/5 p-1 flex items-center gap-2 pr-3 hover:bg-white/10 transition-colors shrink-0 relative"
                        >
                            {/* Alert Badge on Profile Button */}
                            {user && unreadAlertsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border border-[#0f1115] z-10 shadow-lg">
                                    {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                                </span>
                            )}
                            
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

                        {/* Dropdown Menu */}
                        {isProfileMenuOpen && (
                            <div className="absolute right-0 mt-3 w-64 bg-[#0f1115]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-2 z-50">
                                
                                {user ? (
                                    <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/5 mb-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm font-medium">보유 코인</span>
                                            <div className="flex items-center gap-1.5 text-yellow-400 font-bold bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20">
                                                <span>🪙</span>
                                                <span>{coins} C</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                handleAttendance();
                                                setIsProfileMenuOpen(false);
                                            }}
                                            disabled={isAttendanceLoading}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                        >
                                            ✅ 출석체크 하기
                                        </button>
                                        {user.is_guest && (
                                            <button 
                                                onClick={() => {
                                                    setShowLoginModal(true);
                                                    setIsProfileMenuOpen(false);
                                                }}
                                                className="w-full mt-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 border border-white/10"
                                            >
                                                정식 로그인 / 연동하기
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/5 mb-2">
                                        <div className="text-sm text-gray-400 text-center mb-1">로그인하고 혜택을 받아보세요!</div>
                                        <button 
                                            onClick={() => {
                                                setShowLoginModal(true);
                                                setIsProfileMenuOpen(false);
                                            }}
                                            className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            로그인 / 회원가입
                                        </button>
                                    </div>
                                )}

                                {/* Menu Links */}
                                <div className="flex flex-col gap-1">
                                    <Link href="/alerts" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white group">
                                        <div className="flex items-center gap-3">
                                            <Bell className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                                            <span className="font-medium text-sm">알림 센터</span>
                                        </div>
                                        {unreadAlertsCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                                                {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                                            </span>
                                        )}
                                    </Link>

                                    <a href="https://discord.com/invite/gQrUXaaqB" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#5865F2]/10 transition-colors text-gray-300 hover:text-[#5865F2] group">
                                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2] transition-colors" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                                        </svg>
                                        <span className="font-medium text-sm">주식 오픈채팅 (디스코드)</span>
                                    </a>

                                    <Link href="https://t.me/stocktrend_live" target="_blank" rel="noopener noreferrer" className="md:hidden flex items-center gap-3 p-3 rounded-xl hover:bg-blue-500/10 transition-colors text-gray-300 hover:text-blue-400 group">
                                        <Send className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                                        <span className="font-medium text-sm">텔레그램 실시간 속보</span>
                                    </Link>

                                    <Link href="/guide" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white group">
                                        <HelpCircle className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                                        <span className="font-medium text-sm">이용 가이드</span>
                                    </Link>

                                    {user && ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '') && (
                                        <Link href="/admin" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-fuchsia-500/10 transition-colors text-gray-300 hover:text-fuchsia-400 group mt-2 border-t border-white/5 pt-3">
                                            <Users className="h-5 w-5 text-gray-400 group-hover:text-fuchsia-400 transition-colors" />
                                            <span className="font-medium text-sm">관리자 센터</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
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
