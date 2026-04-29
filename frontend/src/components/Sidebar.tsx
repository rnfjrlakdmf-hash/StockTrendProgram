"use client";

import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Star, TrendingUp, TrendingDown, LayoutDashboard, Newspaper, Compass, Settings, Bell, MessageSquare, LineChart, Crown, Zap, X, Network, Sparkles, UserCheck, Shield, CalendarDays, Menu, PlayCircle, Timer, History, BarChart3, Activity, Users } from "lucide-react";
import { App } from '@capacitor/app';
import MarketClock from "./MarketClock";
import { requestPayment } from "@/lib/payment";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "./LoginModal";
import AdRewardModal from "./AdRewardModal"; // Import Modal

const navigation = [
    { name: "대시보드", href: "/", icon: LayoutDashboard },
    { name: "시장 인텔리전스", href: "/signals", icon: Activity },

    { name: "종목발굴", href: "/discovery", icon: Compass },
    { name: "정리분석", href: "/analysis", icon: BarChart3 },
    { name: "이슈 테마", href: "/theme", icon: Sparkles },
    { name: "차트 분석", href: "/pattern", icon: LineChart },
    { name: "ETF 분석", href: "/etf", icon: Activity },
    { name: "공급망 지도", href: "/supply-chain", icon: Network },
    { name: "커뮤니티", href: "/community", icon: Users },
    { name: "포트폴리오", href: "/portfolio", icon: Shield },
    { name: "MY 관심종목", href: "/watchlist", icon: Star },
    { name: "설정 (API 연결)", href: "/settings", icon: Settings },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);

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
                const res = await fetch(`/api/market/status`);

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
                const res = await fetch(`/api/watchlist`, {
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
                const res = await fetch(`/api/auth/use-trial`, {
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
                    className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={`
                fixed inset-y-0 left-0 z-50 h-full w-80 flex flex-col justify-between border-r border-white/10 bg-[#09090b] md:bg-black/40 backdrop-blur-xl text-white p-4 pt-24 md:pt-4 transition-transform duration-300 ease-in-out
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
                    <div className="flex items-center gap-2 px-2 py-4 mb-8">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 animate-pulse" />
                        <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            STOCK AI
                        </span>
                    </div>

                    <nav className="space-y-2">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-200 transition-all hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 group"
                            >
                                <item.icon className="h-5 w-5 transition-colors group-hover:text-blue-400" />
                                {item.name}
                            </Link>
                        ))}
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
                <div className="mt-auto space-y-2">
                    {user ? (
                        <div className="rounded-xl bg-white/10 p-3 border border-white/10 flex items-center gap-3 shadow-lg">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-base ring-2 ring-white/20">
                                {user.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                                <p className="text-xs text-gray-300 truncate">{user.email}</p>
                            </div>
                            <button onClick={logout} className="p-1.5 text-gray-300 hover:text-white transition-colors bg-white/5 rounded-lg">
                                <span className="text-[10px] font-bold">로그아웃</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            <UserCheck className="w-4 h-4" />
                            로그인
                        </button>
                    )}

                    <MarketClock />
                    <div className="px-2 pt-4 border-t border-white/5 opacity-30 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-gray-500 font-mono text-center">v3.6.40-STABLE</p>
                    </div>
                </div>

                {isPro ? (
                    <div className="rounded-xl bg-gradient-to-br from-blue-900/40 to-black p-3 border border-blue-500/30 shadow-lg flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <span>PRO 멤버십 이용중</span>
                        </div>
                        <p className="text-[10px] text-gray-400">모든 프리미엄 기능을 제한없이 이용하고 계십니다.</p>
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-3 border border-white/10 shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Timer className="w-16 h-16 text-white" />
                            </div>

                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-xs font-bold text-blue-200 mb-0.5 flex items-center gap-2">
                                        <Crown className="w-3 h-3 text-yellow-400" /> PRO 요금제
                                    </p>
                                    <p className="text-[10px] text-gray-400">AI 통찰력 무제한 이용</p>
                                </div>
                                <button
                                    onClick={() => setShowProModal(true)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded transition-colors"
                                >
                                    UP
                                </button>
                            </div>

                            {/* Timer / Reward Section */}
                            <div className="pt-2 border-t border-white/10 mt-1">
                                {timeLeftStr ? (
                                    <div className="mb-2">
                                        <div className="flex justify-between items-center text-[10px] text-gray-300 mb-1">
                                            <span>남은 시간</span>
                                            <span className="text-green-400 font-mono font-bold animate-pulse">{timeLeftStr}</span>
                                        </div>
                                        <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/5">
                                            <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-full w-full animate-pulse" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-gray-400 mb-2 text-center">
                                        이용권이 없습니다.
                                    </div>
                                )}

                                {freeTrialCount > 0 ? (
                                    <button
                                        onClick={handleFreeTrial}
                                        className="w-full rounded-lg py-2 text-[10px] font-bold bg-green-600 text-white hover:bg-green-500 animate-pulse border border-green-400/30 flex items-center justify-center gap-1 shadow-md transition-colors"
                                    >
                                        🎁 1시간 무료 이용하기 ({freeTrialCount}회)
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowAdRewardModal(true)}
                                        className="w-full rounded-lg py-2 text-[10px] font-bold bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <PlayCircle className="w-3 h-3 text-yellow-500" />
                                        광고 보고 시간 충전 (30분)
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
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
