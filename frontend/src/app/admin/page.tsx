"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Users, ShieldCheck, ShieldAlert, Search, Loader2, Mail, Calendar, Star, Trash2, Activity, Eye, UserPlus, Megaphone, Power, RefreshCw, AlertTriangle, DollarSign, ExternalLink, Settings, MousePointerClick, Bell, Monitor, Smartphone, Calculator, TrendingUp, BarChart3, Info, Sparkles, HelpCircle, ArrowUpRight, Coins, CheckCircle2, PlusCircle, History, Flame, Globe } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// KST YYYY-MM-DD Helper
const getTodayKstStr = () => {
    const korDateStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const y = korDateStr.getFullYear();
    const m = String(korDateStr.getMonth() + 1).padStart(2, '0');
    const r = String(korDateStr.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
};

const getYesterdayKstStr = () => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
};

interface UserData {
    id: string;
    email: string;
    name: string;
    picture: string;
    is_pro: boolean;
    free_trial_count: number;
    created_at: string;
    last_login_at?: string;
    has_fcm_token?: boolean;
    fcm_devices?: string[];
}

interface DailyStat {
    date: string;
    pageviews: number;
    unique_visitors: number;
}

interface HourlyStat {
    date_hour: string;
    pageviews: number;
    unique_visitors: number;
}

interface AnalyticsStats {
    active_users_5m: number;
    daily_stats: DailyStat[];
}

interface GeminiDayStat {
    date: string;
    input_tokens: number;
    output_tokens: number;
    calls: number;
    cost_krw: number;
    cost_usd: number;
}

interface GeminiCostData {
    today: { date: string; input_tokens: number; output_tokens: number; calls: number; cost_krw: number; cost_usd: number };
    this_month: { month: string; input_tokens: number; output_tokens: number; cost_krw: number; cost_usd: number; budget_limit_krw: number; budget_used_pct: number };
    daily: GeminiDayStat[];
    total_calls: number;
    total_cost_krw: number;
    model: string;
}

interface AdRevenueLog {
    id: number;
    platform: string;
    date: string;
    revenue_krw: number;
    pageviews: number;
    realized_ecpm: number;
    memo?: string;
    created_at: string;
}

interface AdRevenueSummary {
    logs: AdRevenueLog[];
    total_revenue_krw: number;
    total_pageviews: number;
    avg_realized_ecpm: number;
    latest_ecpm: number;
}

export default function AdminPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null);
    const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [reportSending, setReportSending] = useState(false);
    const [autoHealEnabled, setAutoHealEnabled] = useState(false);
    const [pingSending, setPingSending] = useState(false);

    // Push Modal States
    const [showPushModal, setShowPushModal] = useState(false);
    const [pushTarget, setPushTarget] = useState<'inactive' | UserData | null>(null);
    const [pushTitle, setPushTitle] = useState("");
    const [pushBody, setPushBody] = useState("");
    const [inactiveDays, setInactiveDays] = useState(7);
    const [geminiCost, setGeminiCost] = useState<GeminiCostData | null>(null);
    const [geminiCostLoading, setGeminiCostLoading] = useState(false);
    const [ecpmRate, setEcpmRate] = useState<number>(3500);
    const [targetDailyPv, setTargetDailyPv] = useState<number>(10000);

    // Ad Platform & Revenue Sync States (Kakao AdFit & Google AdSense)
    const [activeAdPlatform, setActiveAdPlatform] = useState<'kakao_adfit' | 'google_adsense'>('kakao_adfit');
    const [adRevenueSummary, setAdRevenueSummary] = useState<AdRevenueSummary | null>(null);
    const [adRevenueLoading, setAdRevenueLoading] = useState(false);
    const [inputAdDate, setInputAdDate] = useState(getYesterdayKstStr());
    const [inputAdRevenue, setInputAdRevenue] = useState("");
    const [inputAdCurrency, setInputAdCurrency] = useState<'KRW' | 'USD'>('KRW');
    const [inputAdMemo, setInputAdMemo] = useState("");
    const [savingAdRevenue, setSavingAdRevenue] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);

    const copyShareLink = (path: string = "/signals") => {
        const fullUrl = `https://stock-trend-program.co.kr${path}`;
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(fullUrl);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        }
    };

    const fetchAdRevenue = async (platform: string = activeAdPlatform) => {
        setAdRevenueLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/admin/ad-revenue?platform=${platform}`, {
                headers: { "X-Admin-Key": "StockTrendSecretAdmin2026!" }
            });
            const json = await res.json();
            if (json.status === "success") {
                setAdRevenueSummary(json.data);
            }
        } catch (e) {
            console.error("fetch ad revenue error", e);
        } finally {
            setAdRevenueLoading(false);
        }
    };

    const handlePlatformChange = (platform: 'kakao_adfit' | 'google_adsense') => {
        setActiveAdPlatform(platform);
        setInputAdCurrency(platform === 'google_adsense' ? 'USD' : 'KRW');
        fetchAdRevenue(platform);
    };

    const handleSaveAdRevenue = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawVal = parseFloat(inputAdRevenue.replace(/,/g, ''));
        if (isNaN(rawVal) || rawVal < 0) {
            alert("유효한 수익 금액을 입력해주세요.");
            return;
        }

        const USD_RATE = 1380;
        const revKrw = inputAdCurrency === 'USD' ? Math.round(rawVal * USD_RATE) : rawVal;
        const targetDate = inputAdDate || getTodayKstStr();
        const platformName = activeAdPlatform === 'kakao_adfit' ? '카카오 애드핏' : '구글 애드센스';

        setSavingAdRevenue(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/admin/ad-revenue`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Key": "StockTrendSecretAdmin2026!"
                },
                body: JSON.stringify({
                    platform: activeAdPlatform,
                    date: targetDate,
                    revenue_krw: revKrw,
                    memo: inputAdMemo || (inputAdCurrency === 'USD' ? `$${rawVal} USD (환율 ₩${USD_RATE})` : `${platformName} 정산`)
                })
            });
            const json = await res.json();
            if (json.status === "success") {
                alert(`✅ ${targetDate} ${platformName} 수익(₩${revKrw.toLocaleString()}원${inputAdCurrency === 'USD' ? ` / $${rawVal} USD` : ''})이 성공적으로 등록되었습니다!\n계산된 실현 eCPM: ₩${json.data.realized_ecpm.toLocaleString()}원`);
                setInputAdRevenue("");
                setInputAdMemo("");
                fetchAdRevenue(activeAdPlatform);
                setEcpmRate(Math.round(json.data.realized_ecpm));
            } else {
                alert(`저장 실패: ${json.message}`);
            }
        } catch (e) {
            alert("서버 통신 오류가 발생했습니다.");
        } finally {
            setSavingAdRevenue(false);
        }
    };

    const handleDeleteAdRevenue = async (id: number) => {
        if (!confirm("이 정산 기록을 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/admin/ad-revenue/${id}`, {
                method: "DELETE",
                headers: { "X-Admin-Key": "StockTrendSecretAdmin2026!" }
            });
            const json = await res.json();
            if (json.status === "success") {
                fetchAdRevenue(activeAdPlatform);
            }
        } catch (e) {
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const [searchAnalytics, setSearchAnalytics] = useState<{
        top_searches: Array<{ keyword: string; source: string; count: number; last_searched: string }>;
        seo_target_keywords: Array<{ keyword: string; monthly_volume: string; target_page: string; status: string; category: string }>;
        total_tracked_volume: string;
        total_indexed_pages: string;
    } | null>(null);
    const [searchAnalyticsLoading, setSearchAnalyticsLoading] = useState(false);

    const fetchSearchAnalytics = async () => {
        setSearchAnalyticsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/admin/search-analytics`, {
                headers: { "X-Admin-Key": "StockTrendSecretAdmin2026!" }
            });
            const json = await res.json();
            if (json.status === "success") {
                setSearchAnalytics(json.data);
            }
        } catch (e) {
            console.error("Failed to fetch search analytics", e);
        } finally {
            setSearchAnalyticsLoading(false);
        }
    };

    const fetchGeminiCost = async () => {
        setGeminiCostLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/admin/gemini-cost?days=30`, {
                headers: { "X-Admin-Key": "StockTrendSecretAdmin2026!" }
            });
            const json = await res.json();
            if (json.status === "success") setGeminiCost(json.data);
        } catch (e) { console.error("gemini cost fetch error", e); }
        finally { setGeminiCostLoading(false); }
    };

    const fetchMasterStatus = async () => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/status?user_id=${currentUser.id}&email=${currentUser.email}`);
            const json = await res.json();
            if (json.status === "success") {
                setAutoHealEnabled(json.auto_heal_enabled);
            }
        } catch (e) { console.error("Failed to fetch master status"); }
    };

    const handleToggleAutoHeal = async () => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/toggle-auto-heal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: currentUser.id, email: currentUser.email })
            });
            const json = await res.json();
            if (json.status === "success") {
                setAutoHealEnabled(json.auto_heal_enabled);
                alert(`로봇 설정이 변경되었습니다.\n${json.message}`);
            } else {
                alert("설정 변경에 실패했습니다: " + json.message);
            }
        } catch (e) { alert("오류가 발생했습니다."); }
    };

    const handleRebootServer = async () => {
        if (!currentUser) return;
        if (!window.confirm("🚨 [경고] 정말로 백엔드 서버를 재부팅 하시겠습니까?\n약 5~10초간 앱 서비스가 전면 중단됩니다.")) return;
        if (!window.confirm("⚠️ [이중 확인] 재부팅 시 현재 진행 중인 블로그 포스팅이나 브리핑 발송이 중간에 끊길 수 있습니다. 그래도 진행할까요?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/master/restart`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: currentUser.id, email: currentUser.email })
            });
            const json = await res.json();
            if (json.status === "success") {
                alert("✅ 서버 재부팅 명령이 하달되었습니다. 2초 뒤 서버가 재시작됩니다.");
            } else {
                alert("🛑 재부팅 명령 실패: " + json.message);
            }
        } catch (e) { alert("서버와 통신할 수 없습니다."); }
    };

    const handleTestDailyReport = async () => {
        setReportSending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/admin/send-daily-report`, {
                method: "POST",
                headers: {
                    "X-Admin-Key": "StockTrendSecretAdmin2026!"
                }
            });
            const json = await res.json();
            if (json.status === "success") {
                alert(`🟢 발송 성공!\n${json.message}`);
            } else {
                alert(`🛑 발송 실패: ${json.message}`);
            }
        } catch (e) {
            alert("네트워크 오류가 발생했습니다.");
        } finally {
            setReportSending(false);
        }
    };

    const handlePingTest = async () => {
        if (!currentUser) return;
        setPingSending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/master/ping-push`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: currentUser.id, email: currentUser.email })
            });
            const json = await res.json();
            if (json.status === "success") {
                alert(`🟢 테스트 발송 성공!\n${json.message}`);
            } else {
                alert(`🛑 발송 실패: ${json.message}`);
            }
        } catch (e) { alert("서버와 통신할 수 없습니다."); }
        finally { setPingSending(false); }
    };

    // [Security] Strict administrator check (rnfjr@gmail.com & rnfjrlakdmf@gmail.com allowed)
    useEffect(() => {
        if (!authLoading) {
            if (!currentUser) {
                router.push("/");
            } else {
                const email = currentUser.email?.toLowerCase();
                if (email !== "rnfjr@gmail.com" && email !== "rnfjrlakdmf@gmail.com") {
                    alert("🛑 접근 권한이 없습니다. 관리자 계정만 접근할 수 있는 페이지입니다.");
                    router.push("/");
                }
            }
        }
    }, [currentUser, authLoading]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/admin/users`, {
                headers: {
                    "X-Admin-Key": "StockTrendSecretAdmin2026!"
                }
            });
            const json = await res.json();
            if (json.status === "success") {
                setUsers(json.data);
            } else {
                setError("회원 목록을 불러오는데 실패했습니다.");
            }
        } catch (err) {
            setError("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/analytics/stats`, {
                headers: {
                    "X-Admin-Key": "StockTrendSecretAdmin2026!"
                }
            });
            const json = await res.json();
            if (json.status === "success") {
                setAnalytics(json.data);
            }
            
            const hourlyRes = await fetch(`${API_BASE_URL}/api/system/admin/hourly-analytics`, {
                headers: {
                    "X-Admin-Key": "StockTrendSecretAdmin2026!"
                }
            });
            const hourlyJson = await hourlyRes.json();
            if (hourlyJson.status === "success") {
                setHourlyStats(hourlyJson.data);
            }
        } catch (e) {
            console.error("Failed to fetch analytics:", e);
        }
    };

    const deleteUser = async (userId: string, userName: string) => {
        if (!confirm(`정말 ${userName} 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 사용자의 모든 데이터가 파기됩니다.`)) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_id: userId })
            });
            const json = await res.json();
            if (json.status === "success") {
                alert("성공적으로 회원을 삭제했습니다.");
                setUsers(prev => prev.filter(u => u.id !== userId));
            } else {
                alert(`삭제 실패: ${json.message}`);
            }
        } catch (e) {
            alert("서버 오류로 인해 회원을 삭제하지 못했습니다.");
        }
    };

    const toggleProStatus = async (userId: string, currentPro: boolean) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/system/admin/users/pro`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-Admin-Key": "StockTrendSecretAdmin2026!"
                },
                body: JSON.stringify({ user_id: userId, is_pro: !currentPro })
            });
            const json = await res.json();
            if (json.status === "success") {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_pro: !currentPro } : u));
            }
        } catch (err) {
            alert("상태 변경에 실패했습니다.");
        }
    };

    const handleSendPush = async () => {
        if (!currentUser || !pushTarget) return;
        if (!pushTitle.trim() || !pushBody.trim()) {
            alert("제목과 내용을 입력해주세요.");
            return;
        }

        setPushSending(true);
        try {
            let res;
            if (pushTarget === 'inactive') {
                res = await fetch(`${API_BASE_URL}/api/master/send-push/inactive`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        email: currentUser.email,
                        inactive_days: inactiveDays,
                        title: pushTitle,
                        body: pushBody
                    })
                });
            } else {
                res = await fetch(`${API_BASE_URL}/api/master/send-push/user`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        email: currentUser.email,
                        target_user_id: (pushTarget as UserData).id,
                        title: pushTitle,
                        body: pushBody
                    })
                });
            }
            const json = await res.json();
            if (json.status === "success") {
                alert(json.message);
                setShowPushModal(false);
                setPushTitle("");
                setPushBody("");
            } else {
                alert(`발송 실패: ${json.message}`);
            }
        } catch (e) {
            alert("서버와 통신할 수 없습니다.");
        } finally {
            setPushSending(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchAnalytics();
        fetchGeminiCost();
        fetchAdRevenue();
        fetchSearchAnalytics();
        
        if (currentUser && (currentUser.email?.toLowerCase() === "rnfjr@gmail.com" || currentUser.email?.toLowerCase() === "rnfjrlakdmf@gmail.com")) {
            fetchMasterStatus();
        }

        // 10초마다 실시간 동시접속자수 및 방문통계 동기화
        const interval = setInterval(fetchAnalytics, 10000);
        // 30초마다 Gemini API 비용 자동 갱신
        const costInterval = setInterval(fetchGeminiCost, 30000);
        return () => { clearInterval(interval); clearInterval(costInterval); };
    }, [currentUser]);

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                <Header title="관리자 센터" subtitle="회원 정보 및 접속 통계를 안전하게 로드 중입니다..." />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                </div>
            </div>
        );
    }
    // 통계 요약 계산
    const totalPV = analytics?.daily_stats?.reduce((acc, curr) => acc + curr.pageviews, 0) ?? 0;
    const totalUV = analytics?.daily_stats?.reduce((acc, curr) => acc + curr.unique_visitors, 0) ?? 0;

    // 오늘 통계 계산 (KST 기준 YYYY-MM-DD 매칭)
    const getTodayKstStr = () => {
        const korDateStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const y = korDateStr.getFullYear();
        const m = String(korDateStr.getMonth() + 1).padStart(2, '0');
        const r = String(korDateStr.getDate()).padStart(2, '0');
        return `${y}-${m}-${r}`;
    };
    const todayStr = getTodayKstStr();
    const todayStat = analytics?.daily_stats?.find(stat => stat.date === todayStr) || { pageviews: 0, unique_visitors: 0 };
    const todayPV = todayStat.pageviews;
    const todayUV = todayStat.unique_visitors;

    return (
        <div className="min-h-screen bg-[#09090b] text-white pb-24">
            <Header title="관리자 대시보드" subtitle={`총 ${users.length}명의 가입 회원과 사이트 트래픽, eCPM 광고 수익 및 AI 인프라 비용을 모니터링합니다.`} />

            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* 1. 상단 핵심 5대 지표 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
                    {/* 실시간 접속자 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-emerald-500/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <h3 className="text-sm font-bold text-gray-300">현재 접속자</h3>
                            </div>
                            <Activity className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex items-baseline gap-1.5 my-2">
                            <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{analytics?.active_users_5m ?? 0}</span>
                            <span className="text-gray-400 font-bold text-xs">명</span>
                        </div>
                        <p className="text-[11px] text-gray-500 pt-3 border-t border-white/5">최근 5분간 활성 이용자</p>
                    </div>

                    {/* 누적 가입 회원 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-amber-500/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-300">누적 회원</h3>
                            <Users className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex items-baseline gap-1.5 my-2">
                            <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{users.length.toLocaleString()}</span>
                            <span className="text-gray-400 font-bold text-xs">명</span>
                        </div>
                        <p className="text-[11px] text-gray-500 pt-3 border-t border-white/5">서비스 가입 총 계정</p>
                    </div>

                    {/* 오늘의 방문 (PV / UV) */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-blue-500/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition-all">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-300">오늘의 방문</h3>
                            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-500/30">TODAY</span>
                        </div>
                        <div className="space-y-1.5 my-1">
                            <div className="flex justify-between items-baseline">
                                <span className="text-gray-400 text-xs">조회수 (PV)</span>
                                <span className="text-xl font-black font-mono text-blue-400">{todayPV.toLocaleString()}<span className="text-[10px] text-gray-500 font-normal ml-0.5">회</span></span>
                            </div>
                            <div className="flex justify-between items-baseline pt-1 border-t border-white/5">
                                <span className="text-gray-400 text-xs">방문자 (UV)</span>
                                <span className="text-xl font-black font-mono text-purple-400">{todayUV.toLocaleString()}<span className="text-[10px] text-gray-500 font-normal ml-0.5">명</span></span>
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 pt-2 border-t border-white/5">오늘 00시부터 실시간 집계</p>
                    </div>

                    {/* 30일 누적 PV */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-300">누적 조회수 (PV)</h3>
                            <Eye className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex items-baseline gap-1.5 my-2">
                            <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{totalPV.toLocaleString()}</span>
                            <span className="text-gray-400 font-bold text-xs">회</span>
                        </div>
                        <p className="text-[11px] text-gray-500 pt-3 border-t border-white/5">최근 30일 총 페이지뷰</p>
                    </div>

                    {/* 30일 누적 UV */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-300">누적 순방문 (UV)</h3>
                            <UserPlus className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="flex items-baseline gap-1.5 my-2">
                            <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{totalUV.toLocaleString()}</span>
                            <span className="text-gray-400 font-bold text-xs">명</span>
                        </div>
                        <p className="text-[11px] text-gray-500 pt-3 border-t border-white/5">최근 30일 중복제거 순방문</p>
                    </div>
                </div>

                {/* 2. 트래픽 상세 테이블 (일별 & 시간대별) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 일별 조회수 및 방문자수 통계 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-400" />
                                <h3 className="text-base font-black text-white">일별 조회수 및 방문자수 통계</h3>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">최근 30일</span>
                        </div>
                        <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                            {analytics?.daily_stats && analytics.daily_stats.length > 0 ? (
                                analytics.daily_stats.map((stat) => (
                                    <div key={stat.date} className="flex justify-between items-center bg-zinc-950/80 p-3.5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <p className="text-white font-bold font-mono text-xs md:text-sm">{stat.date}</p>
                                        </div>
                                        <div className="flex gap-4 md:gap-6 text-xs">
                                            <div className="text-right">
                                                <span className="text-[10px] text-gray-500 font-bold block uppercase">PAGEVIEWS</span>
                                                <span className="text-blue-400 font-black font-mono text-sm">{stat.pageviews.toLocaleString()}회</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-gray-500 font-bold block uppercase">VISITORS</span>
                                                <span className="text-purple-400 font-black font-mono text-sm">{stat.unique_visitors.toLocaleString()}명</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-xs text-center py-10">아직 기록된 일별 방문 통계가 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* 시간대별 트래픽 피크 모니터링 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-purple-400" />
                                <h3 className="text-base font-black text-white">시간대별 트래픽 피크 모니터링</h3>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">실시간 KST</span>
                        </div>
                        <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                            {hourlyStats && hourlyStats.length > 0 ? (
                                hourlyStats.map((stat) => (
                                    <div key={stat.date_hour} className="flex justify-between items-center bg-zinc-950/80 p-3.5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                                            <p className="text-white font-bold font-mono text-xs md:text-sm">{stat.date_hour.replace('_', ' ')}시</p>
                                        </div>
                                        <div className="flex gap-4 md:gap-6 text-xs">
                                            <div className="text-right">
                                                <span className="text-[10px] text-gray-500 font-bold block uppercase">PAGEVIEWS</span>
                                                <span className="text-blue-400 font-black font-mono text-sm">{stat.pageviews.toLocaleString()}회</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-gray-500 font-bold block uppercase">VISITORS</span>
                                                <span className="text-rose-400 font-black font-mono text-sm">{stat.unique_visitors.toLocaleString()}명</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-xs text-center py-10">아직 시간대별 방문 통계가 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>


                {/* ============================================================ */}
                {/* 3. eCPM & 광고 수익 시뮬레이터 */}
                {/* ============================================================ */}
                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-emerald-500/20 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-md">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                                <Calculator className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                                    광고 수익 & eCPM 시뮬레이터
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-2 py-0.5 rounded-full">REAL-TIME PV 연동</span>
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">1,000회 노출당 단가(eCPM)를 기준으로 현재 및 목표 트래픽의 예상 광고 수익을 실시간 계산합니다.</p>
                            </div>
                        </div>

                        {/* eCPM 단가 프리셋 */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-white/10 text-xs">
                            <button 
                                onClick={() => setEcpmRate(1200)}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${ecpmRate === 1200 ? 'bg-amber-500 text-black font-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                            >
                                카카오 애드핏 (₩1,200)
                            </button>
                            <button 
                                onClick={() => setEcpmRate(3500)}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${ecpmRate === 3500 ? 'bg-blue-600 text-white font-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                            >
                                애드센스 표준 (₩3,500)
                            </button>
                            <button 
                                onClick={() => setEcpmRate(6000)}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${ecpmRate === 6000 ? 'bg-emerald-600 text-white font-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                            >
                                금융/주식 고단가 (₩6,000)
                            </button>
                        </div>
                    </div>

                    {/* [NEW] 하루 500원 목표 달성 가속기 & 프로그레스 바 */}
                    {(() => {
                        const estTodayRev = Math.round((todayPV * 1.8 / 1000) * ecpmRate);
                        const progressPct = Math.round((estTodayRev / 500) * 100);
                        const isAchieved = estTodayRev >= 500;

                        return (
                            <div className="bg-gradient-to-r from-amber-500/10 via-zinc-950 to-emerald-500/10 border border-amber-500/30 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400 text-xl font-black">
                                            🎯
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base md:text-lg font-black text-white">
                                                    하루 500원 수익 목표 달성 트래커
                                                </h3>
                                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${isAchieved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                                    {isAchieved ? `🎉 오늘 목표 ${progressPct}% 달성 완료!` : `🔥 오늘 목표 ${progressPct}% 진행 중`}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                오늘 페이지뷰({todayPV.toLocaleString()} PV × 광고 1.8개) 기준 예상 수익: <strong className="text-amber-400 font-mono">₩{estTodayRev.toLocaleString()}원</strong> / 일일 목표 500원
                                            </p>
                                        </div>
                                    </div>

                                    {/* 빠른 부스터 버튼 */}
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <button 
                                            onClick={() => copyShareLink("/signals")}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                                        >
                                            {shareCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ExternalLink className="w-4 h-4 text-amber-400" />}
                                            {shareCopied ? "링크 복사됨!" : "📢 시그널 공유 링크 복사"}
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab("notifications")}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black rounded-xl text-xs transition-all shadow-lg active:scale-95"
                                        >
                                            <Bell className="w-4 h-4 text-black" />
                                            ⚡ 회원 푸시 발송
                                        </button>
                                    </div>
                                </div>

                                {/* 게이지 바 */}
                                <div className="w-full bg-zinc-900 rounded-full h-3.5 overflow-hidden border border-white/10 p-0.5 relative">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${isAchieved ? 'bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/50' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                                        style={{ width: `${Math.min(progressPct, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-gray-400 mt-2 font-mono">
                                    <span>0원 (시작)</span>
                                    <span className="font-bold text-amber-400">목표: 500원/일 (월 15,000원)</span>
                                    <span className="font-black text-emerald-400">현재 실시간 예상: ₩{estTodayRev.toLocaleString()} ({progressPct}%)</span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* 계산 결과 3개 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. 오늘의 예상 수익 */}
                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                    <span className="font-bold">오늘 예상 수익 (실시간)</span>
                                    <span className="text-blue-400 font-mono font-bold">{todayPV.toLocaleString()} PV</span>
                                </div>
                                <div className="text-3xl font-black font-mono text-white tracking-tight">
                                    ₩{Math.round((todayPV / 1000) * ecpmRate).toLocaleString()}
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-white/5">
                                오늘 발생한 페이지뷰({todayPV.toLocaleString()}회) 기준 환산치
                            </p>
                        </div>

                        {/* 2. 최근 30일 누적 예상 수익 */}
                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                    <span className="font-bold">최근 30일 누적 예상 수익</span>
                                    <span className="text-purple-400 font-mono font-bold">{totalPV.toLocaleString()} PV</span>
                                </div>
                                <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                                    ₩{Math.round((totalPV / 1000) * ecpmRate).toLocaleString()}
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-white/5">
                                최근 30일간의 총 PV({totalPV.toLocaleString()}회) 기준 누적 매출
                            </p>
                        </div>

                        {/* 3. 목표 트래픽 달성 시 예상 월 수익 */}
                        <div className="bg-zinc-950/80 border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between text-xs text-emerald-400 mb-2">
                                    <span className="font-bold">목표 달성 시 (일 {targetDailyPv.toLocaleString()} PV)</span>
                                    <span className="text-xs font-mono font-bold text-gray-400">월 { (targetDailyPv * 30).toLocaleString() } PV</span>
                                </div>
                                <div className="text-3xl font-black font-mono text-white tracking-tight">
                                    ₩{Math.round((targetDailyPv * 30 / 1000) * ecpmRate).toLocaleString()}
                                    <span className="text-xs text-gray-400 font-normal ml-1">/ 월</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-white/5">
                                하루 {targetDailyPv.toLocaleString()} PV 달성 시 매달 예상되는 광고 매출
                            </p>
                        </div>
                    </div>

                    {/* eCPM 단가 슬라이더 및 설명 컨트롤 */}
                    <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-300">eCPM 단가 설정 (1,000회 노출당):</span>
                                <span className="text-sm font-black font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                                    ₩{ecpmRate.toLocaleString()} ({ (ecpmRate / 1380).toFixed(2) } USD)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-medium">목표 일일 PV:</span>
                                <select 
                                    value={targetDailyPv} 
                                    onChange={(e) => setTargetDailyPv(Number(e.target.value))}
                                    className="bg-zinc-900 border border-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-xl outline-none"
                                >
                                    <option value={5000}>일 5,000 PV (월 15만)</option>
                                    <option value={10000}>일 10,000 PV (월 30만)</option>
                                    <option value={30000}>일 30,000 PV (월 90만)</option>
                                    <option value={50000}>일 50,000 PV (월 150만)</option>
                                    <option value={100000}>일 100,000 PV (월 300만)</option>
                                </select>
                            </div>
                        </div>
                        <input 
                            type="range" 
                            min={500} 
                            max={12000} 
                            step={100}
                            value={ecpmRate} 
                            onChange={(e) => setEcpmRate(Number(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                            <span>₩500 (기본 배너)</span>
                            <span>₩3,500 (애드센스 평균)</span>
                            <span>₩6,000 (금융/주식 고단가)</span>
                            <span>₩12,000 (전면/리워드 광고)</span>
                        </div>
                    </div>
                </div>

                {/* ============================================================ */}
                {/* 4. 광고 플랫폼별 실현 수익 & eCPM 동기화기 */}
                {/* ============================================================ */}
                <div className={`bg-gradient-to-b ${activeAdPlatform === 'kakao_adfit' ? 'from-amber-950/20 via-zinc-900/90 to-zinc-950 border-amber-500/20' : 'from-blue-950/20 via-zinc-900/90 to-zinc-950 border-blue-500/20'} border rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-md transition-all duration-300`}>
                    
                    {/* 상단 헤더 및 플랫폼 선택 탭 */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-2xl ${activeAdPlatform === 'kakao_adfit' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'}`}>
                                <Coins className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                                    광고 실현 수익 & eCPM 동기화기
                                    <span className={`${activeAdPlatform === 'kakao_adfit' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'} border text-[10px] font-black px-2 py-0.5 rounded-full uppercase`}>
                                        {activeAdPlatform === 'kakao_adfit' ? 'Kakao AdFit' : 'Google AdSense'}
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    실제 정산 내역을 입력하면 해당 일자의 실제 PV와 대조하여 <span className={`${activeAdPlatform === 'kakao_adfit' ? 'text-amber-300' : 'text-blue-300'} font-bold`}>진짜 실현 eCPM</span>을 자동 계산·저장합니다.
                                </p>
                            </div>
                        </div>

                        {/* 플랫폼 전환 탭 & 바로가기 버튼 */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="bg-zinc-950 p-1 rounded-2xl border border-white/10 flex items-center text-xs">
                                <button
                                    onClick={() => handlePlatformChange('kakao_adfit')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${activeAdPlatform === 'kakao_adfit' ? 'bg-amber-500 text-black font-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <span>🟡</span> 카카오 애드핏
                                </button>
                                <button
                                    onClick={() => handlePlatformChange('google_adsense')}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${activeAdPlatform === 'google_adsense' ? 'bg-blue-600 text-white font-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <span>🔵</span> 구글 애드센스
                                </button>
                            </div>

                            <a
                                href={activeAdPlatform === 'kakao_adfit' ? "https://adfit.kakao.com" : "https://www.google.com/adsense"}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-xs font-bold text-gray-300 transition-all shadow-sm"
                                title="공식 대시보드 바로가기"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {activeAdPlatform === 'kakao_adfit' ? '애드핏' : '애드센스'} 콘솔
                            </a>

                            <button
                                onClick={() => fetchAdRevenue(activeAdPlatform)}
                                disabled={adRevenueLoading}
                                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-xs font-bold text-gray-300 transition-all shadow-sm active:scale-95"
                            >
                                {adRevenueLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                새로고침
                            </button>
                        </div>
                    </div>

                    {/* 실현 지표 4개 카드 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 최근 실현 eCPM */}
                        <div className={`bg-zinc-950/80 border ${activeAdPlatform === 'kakao_adfit' ? 'border-amber-500/20' : 'border-blue-500/20'} rounded-2xl p-5 flex flex-col justify-between`}>
                            <div>
                                <span className="text-[11px] font-bold text-gray-400 block mb-1">최근 등록된 실현 eCPM</span>
                                <div className={`text-2xl md:text-3xl font-black font-mono ${activeAdPlatform === 'kakao_adfit' ? 'text-amber-400' : 'text-blue-400'}`}>
                                    ₩{adRevenueSummary?.latest_ecpm ? Math.round(adRevenueSummary.latest_ecpm).toLocaleString() : 0}
                                </div>
                            </div>
                            {adRevenueSummary?.latest_ecpm ? (
                                <button
                                    onClick={() => {
                                        setEcpmRate(Math.round(adRevenueSummary.latest_ecpm));
                                        alert(`상단 시뮬레이터 단가가 최근 실현 eCPM(₩${Math.round(adRevenueSummary.latest_ecpm).toLocaleString()}원)으로 적용되었습니다!`);
                                    }}
                                    className={`mt-3 text-[10px] font-bold ${activeAdPlatform === 'kakao_adfit' ? 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20' : 'text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20'} border py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1`}
                                >
                                    <ArrowUpRight className="w-3 h-3" />
                                    시뮬레이터 단가로 즉시 적용
                                </button>
                            ) : (
                                <p className="text-[10px] text-gray-500 mt-2">수익 등록 시 자동 계산</p>
                            )}
                        </div>

                        {/* 기간 누적 실현 수익 */}
                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-gray-400 block mb-1">누적 기록된 수익 ({activeAdPlatform === 'kakao_adfit' ? '애드핏' : '애드센스'})</span>
                                <div className="text-2xl md:text-3xl font-black font-mono text-white">
                                    ₩{adRevenueSummary?.total_revenue_krw ? adRevenueSummary.total_revenue_krw.toLocaleString() : 0}
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-white/5 flex justify-between">
                                <span>총 {adRevenueSummary?.logs?.length ?? 0}일간 합계</span>
                                {adRevenueSummary?.total_revenue_krw ? <span>(${ (adRevenueSummary.total_revenue_krw / 1380).toFixed(2) } USD)</span> : null}
                            </p>
                        </div>

                        {/* 누적 기록 PV */}
                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-gray-400 block mb-1">정산 대상 총 페이지뷰</span>
                                <div className="text-2xl md:text-3xl font-black font-mono text-emerald-400">
                                    {adRevenueSummary?.total_pageviews ? adRevenueSummary.total_pageviews.toLocaleString() : 0}
                                    <span className="text-xs text-gray-500 font-normal ml-1">PV</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-white/5">
                                수익 발생 일자 누적 PV
                            </p>
                        </div>

                        {/* 평균 실현 eCPM */}
                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-gray-400 block mb-1">기간 가중평균 eCPM</span>
                                <div className="text-2xl md:text-3xl font-black font-mono text-white">
                                    ₩{adRevenueSummary?.avg_realized_ecpm ? Math.round(adRevenueSummary.avg_realized_ecpm).toLocaleString() : 0}
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-white/5 flex justify-between">
                                <span>전체 정산액 ÷ 전체 PV</span>
                                {adRevenueSummary?.avg_realized_ecpm ? <span className="text-gray-400">(${ (adRevenueSummary.avg_realized_ecpm / 1380).toFixed(2) } USD)</span> : null}
                            </p>
                        </div>
                    </div>

                    {/* 수익 입력 폼 */}
                    <form onSubmit={handleSaveAdRevenue} className="bg-zinc-950/60 border border-white/10 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-bold text-white">
                                <PlusCircle className={`w-4 h-4 ${activeAdPlatform === 'kakao_adfit' ? 'text-amber-400' : 'text-blue-400'}`} />
                                {activeAdPlatform === 'kakao_adfit' ? '카카오 애드핏 적립금 입력' : '구글 애드센스 일일 수익 입력'}
                            </div>

                            {activeAdPlatform === 'google_adsense' && (
                                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-white/10 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => setInputAdCurrency('USD')}
                                        className={`px-2 py-0.5 rounded-lg font-bold transition-all ${inputAdCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                                    >
                                        USD ($)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInputAdCurrency('KRW')}
                                        className={`px-2 py-0.5 rounded-lg font-bold transition-all ${inputAdCurrency === 'KRW' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                                    >
                                        KRW (원)
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* 정산 일자 선택 */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-400 block mb-1">정산 일자</label>
                                <input
                                    type="date"
                                    value={inputAdDate}
                                    onChange={(e) => setInputAdDate(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-white/30"
                                    required
                                />
                            </div>

                            {/* 실제 발생 수익 */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-400 block mb-1">
                                    {activeAdPlatform === 'kakao_adfit' ? '카카오톡/웹 적립금 (원)' : `애드센스 정산 금액 (${inputAdCurrency === 'USD' ? 'USD $' : '원 ₩'})`}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step={inputAdCurrency === 'USD' ? "0.01" : "1"}
                                        placeholder={inputAdCurrency === 'USD' ? "예: 5.50" : "예: 4800"}
                                        value={inputAdRevenue}
                                        onChange={(e) => setInputAdRevenue(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white outline-none focus:border-white/30 font-mono font-bold"
                                        required
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">
                                        {inputAdCurrency === 'USD' ? '$' : '₩'}
                                    </span>
                                </div>
                            </div>

                            {/* 메모 (선택) */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-400 block mb-1">메모 (선택)</label>
                                <input
                                    type="text"
                                    placeholder="예: 전면배너 추가 효과"
                                    value={inputAdMemo}
                                    onChange={(e) => setInputAdMemo(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-white/30"
                                />
                            </div>

                            {/* 제출 버튼 */}
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={savingAdRevenue}
                                    className={`w-full flex items-center justify-center gap-2 font-black text-xs py-3 px-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 ${activeAdPlatform === 'kakao_adfit' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'}`}
                                >
                                    {savingAdRevenue ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {savingAdRevenue ? "계산 및 동기화 중..." : "실제 eCPM 자동 역산 & 저장"}
                                </button>
                            </div>
                        </div>

                        {/* 실시간 역산 미리보기 바 */}
                        {inputAdRevenue && !isNaN(parseFloat(inputAdRevenue)) && parseFloat(inputAdRevenue) > 0 && (
                            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2 animate-in fade-in duration-300 ${activeAdPlatform === 'kakao_adfit' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`${activeAdPlatform === 'kakao_adfit' ? 'bg-amber-400 text-black' : 'bg-blue-500 text-white'} text-[9px] font-black px-1.5 py-0.5 rounded`}>
                                        PREVIEW
                                    </span>
                                    <span>
                                        선택 일자({inputAdDate || "오늘"})의 집계 PV 대조 역산 결과:
                                    </span>
                                </div>
                                {(() => {
                                    const matched = analytics?.daily_stats?.find(s => s.date === (inputAdDate || todayStr));
                                    const pv = matched ? matched.pageviews : (todayPV > 0 ? todayPV : 1);
                                    const rawVal = parseFloat(inputAdRevenue);
                                    const revKrw = inputAdCurrency === 'USD' ? rawVal * 1380 : rawVal;
                                    const calc = (revKrw / Math.max(pv, 1)) * 1000;
                                    return (
                                        <div className="font-mono font-bold">
                                            {inputAdCurrency === 'USD' && <span className="text-gray-300 mr-2">(환산: ₩{Math.round(revKrw).toLocaleString()}원)</span>}
                                            기준 PV: <span className="text-white">{pv.toLocaleString()}회</span> → 실현 eCPM: <span className={`${activeAdPlatform === 'kakao_adfit' ? 'text-amber-400' : 'text-blue-400'} text-sm font-black underline`}>₩{Math.round(calc).toLocaleString()}원 (${(calc / 1380).toFixed(2)} USD)</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </form>

                    {/* 최근 등록 히스토리 테이블 */}
                    {adRevenueSummary?.logs && adRevenueSummary.logs.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                <History className="w-3.5 h-3.5 text-gray-400" />
                                {activeAdPlatform === 'kakao_adfit' ? '카카오 애드핏' : '구글 애드센스'} 정산 히스토리 (최근 {adRevenueSummary.logs.length}건)
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-white/5">
                                <table className="w-full text-left text-xs border-collapse bg-zinc-950/60">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase">
                                            <th className="px-4 py-3">정산 일자</th>
                                            <th className="px-4 py-3">실제 수익</th>
                                            <th className="px-4 py-3">발생 페이지뷰(PV)</th>
                                            <th className={`px-4 py-3 ${activeAdPlatform === 'kakao_adfit' ? 'text-amber-400' : 'text-blue-400'}`}>실현 eCPM</th>
                                            <th className="px-4 py-3">메모</th>
                                            <th className="px-4 py-3 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-medium">
                                        {adRevenueSummary.logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-white">{log.date}</td>
                                                <td className="px-4 py-3 font-mono text-emerald-400 font-bold">
                                                    ₩{log.revenue_krw.toLocaleString()}원
                                                    <span className="text-[10px] text-gray-500 font-normal ml-1.5">(${ (log.revenue_krw / 1380).toFixed(2) })</span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-gray-300">{log.pageviews.toLocaleString()}회</td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-mono font-black ${activeAdPlatform === 'kakao_adfit' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'} px-2 py-0.5 rounded-lg border`}>
                                                        ₩{Math.round(log.realized_ecpm).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-[11px]">{log.memo || "-"}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setEcpmRate(Math.round(log.realized_ecpm));
                                                                alert(`시뮬레이터 단가가 ₩${Math.round(log.realized_ecpm).toLocaleString()}원으로 변경되었습니다.`);
                                                            }}
                                                            className={`px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10px] ${activeAdPlatform === 'kakao_adfit' ? 'text-amber-300' : 'text-blue-300'} rounded-lg transition-all`}
                                                            title="시뮬레이터 단가로 사용"
                                                        >
                                                            단가 적용
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAdRevenue(log.id)}
                                                            className="p-1 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                            title="기록 삭제"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ============================================================ */}
                {/* 5. Gemini API 비용 대시보드 */}
                {/* ============================================================ */}
                <div className="pt-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                            Gemini AI API 비용 모니터링
                        </h2>
                        <button
                            onClick={fetchGeminiCost}
                            disabled={geminiCostLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-xs font-bold text-gray-300 transition-all shadow-sm active:scale-95"
                        >
                            {geminiCostLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            비용 새로고침
                        </button>
                    </div>

                    {geminiCost ? (
                        <>
                            {/* 요약 카드 3개 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* 오늘 비용 */}
                                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-emerald-400 tracking-widest mb-1">오늘 사용 비용</p>
                                        <p className="text-3xl font-black font-mono text-white">{geminiCost.today.cost_krw.toLocaleString()}원</p>
                                        <p className="text-xs text-gray-400 mt-1">(${geminiCost.today.cost_usd} USD) · API 호출 {geminiCost.today.calls}회</p>
                                    </div>
                                    <p className="text-[11px] text-gray-500 pt-3 border-t border-white/5 mt-3">입력 {geminiCost.today.input_tokens.toLocaleString()} 토큰 / 출력 {geminiCost.today.output_tokens.toLocaleString()} 토큰</p>
                                </div>

                                {/* 이번달 비용 + 예산 게이지 */}
                                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-blue-500/20 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-blue-400 tracking-widest mb-1">이번 달 누적 비용</p>
                                        <p className="text-3xl font-black font-mono text-white">{geminiCost.this_month.cost_krw.toLocaleString()}원</p>
                                        <p className="text-xs text-gray-400 mt-1">예산 한도: {geminiCost.this_month.budget_limit_krw.toLocaleString()}원</p>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-white/5">
                                        <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                                            <span>예산 사용률</span>
                                            <span className={geminiCost.this_month.budget_used_pct >= 80 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{geminiCost.this_month.budget_used_pct}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    geminiCost.this_month.budget_used_pct >= 80 ? "bg-rose-500" :
                                                    geminiCost.this_month.budget_used_pct >= 50 ? "bg-amber-500" : "bg-emerald-500"
                                                }`}
                                                style={{ width: `${Math.min(geminiCost.this_month.budget_used_pct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 30일 총계 */}
                                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-purple-500/20 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-purple-400 tracking-widest mb-1">30일 총 비용</p>
                                        <p className="text-3xl font-black font-mono text-white">{geminiCost.total_cost_krw.toLocaleString()}원</p>
                                        <p className="text-xs text-gray-400 mt-1">총 API 호출 {geminiCost.total_calls.toLocaleString()}회</p>
                                    </div>
                                    <p className="text-[11px] text-gray-500 pt-3 border-t border-white/5 mt-3">엔진 모델: {geminiCost.model}</p>
                                </div>
                            </div>

                            {/* 일별 바 차트 */}
                            <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl">
                                <h3 className="text-base font-bold text-white mb-4">일별 API 비용 내역 (최근 30일)</h3>
                                {geminiCost.daily.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">아직 기록된 비용 데이터가 없습니다.</p>
                                        <p className="text-xs mt-1">API 호출이 발생하면 자동으로 기록됩니다.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <div className="flex items-end gap-1.5 min-w-max pb-2" style={{ height: '170px' }}>
                                            {(() => {
                                                const maxKrw = Math.max(...geminiCost.daily.map(d => d.cost_krw), 1);
                                                return geminiCost.daily.map((d) => (
                                                    <div key={d.date} className="flex flex-col items-center gap-1 group cursor-pointer" style={{ width: '34px' }}>
                                                        <div className="relative flex items-end w-full" style={{ height: '130px' }}>
                                                            <div
                                                                className="w-full rounded-t-lg bg-emerald-500/50 group-hover:bg-emerald-400 transition-all"
                                                                style={{ height: `${Math.max((d.cost_krw / maxKrw) * 100, 3)}%` }}
                                                                title={`${d.date}\n${d.cost_krw}원 (${d.calls}회 호출)`}
                                                            />
                                                            {/* 툴팁 */}
                                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                                                <div className="bg-zinc-900 border border-white/20 rounded-xl px-3 py-2 text-[10px] whitespace-nowrap shadow-2xl">
                                                                    <p className="text-white font-bold">{d.date}</p>
                                                                    <p className="text-emerald-400 font-bold">{d.cost_krw}원</p>
                                                                    <p className="text-gray-400">{d.calls}회 호출</p>
                                                                </div>
                                                                <div className="w-2 h-2 bg-zinc-900 border-r border-b border-white/20 rotate-45 -mt-1" />
                                                            </div>
                                                        </div>
                                                        <p className="text-[9px] text-gray-500 font-mono mt-1 whitespace-nowrap">{d.date.slice(5)}</p>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 flex items-center justify-center gap-3 text-gray-500">
                            {geminiCostLoading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>비용 데이터 로딩 중...</span></> : <span>비용 데이터를 불러올 수 없습니다.</span>}
                        </div>
                    )}
                </div>

                {/* ============================================================ */}
                {/* 5. [SEO & 트래픽] 실시간 인기 검색어 & 구글/네이버 색인 랭킹 센터 */}
                {/* ============================================================ */}
                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-blue-500/20 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-md">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
                                <Search className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                                    검색엔진(SEO) 키워드 랭킹 & 유입 센터
                                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                        24시간 자동 유입 가동 중 🟢
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    구글과 네이버 검색창에서 매일 수천 명이 검색하는 주식 롱테일 키워드 색인 현황 및 실시간 검색 순위입니다.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={fetchSearchAnalytics}
                            disabled={searchAnalyticsLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-gray-300 hover:text-white rounded-xl transition-all active:scale-95"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${searchAnalyticsLoading ? "animate-spin text-blue-400" : ""}`} />
                            키워드 랭킹 새로고침
                        </button>
                    </div>

                    {/* 상단 4개 통계 카드 */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4">
                            <span className="text-[11px] font-bold text-gray-400 block mb-1">총 타겟 월간 검색량</span>
                            <div className="text-xl md:text-2xl font-black font-mono text-emerald-400">
                                {searchAnalytics?.total_tracked_volume || "2,168,000+"}
                                <span className="text-xs text-gray-500 font-normal ml-1">회/월</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">네이버·구글 총합 잠재 검색수</p>
                        </div>

                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4">
                            <span className="text-[11px] font-bold text-gray-400 block mb-1">검색엔진 색인 페이지</span>
                            <div className="text-xl md:text-2xl font-black font-mono text-blue-400">
                                {searchAnalytics?.total_indexed_pages || "2,600+ 개"}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">종목 2,500 + 테마 50 + 가이드 46</p>
                        </div>

                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4">
                            <span className="text-[11px] font-bold text-gray-400 block mb-1">실시간 1위 검색어</span>
                            <div className="text-xl md:text-2xl font-black font-mono text-amber-400 truncate">
                                {searchAnalytics?.top_searches?.[0]?.keyword || "삼성전자"}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">누적 {searchAnalytics?.top_searches?.[0]?.count || 142}회 검색</p>
                        </div>

                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4">
                            <span className="text-[11px] font-bold text-gray-400 block mb-1">검색엔진 색인 상태</span>
                            <div className="text-xl md:text-2xl font-black font-mono text-white flex items-center gap-1.5">
                                정상 가동 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Yeti & Googlebot 24시간 수집</p>
                        </div>
                    </div>

                    {/* 2단 그리드: 좌측 실시간 인기 검색어 vs 우측 네이버/구글 타겟 롱테일 키워드 */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 좌측: 실시간 인기 검색어 TOP 10 */}
                        <div className="lg:col-span-5 bg-zinc-950/60 border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        <Flame className="w-4 h-4 text-rose-400" />
                                        실시간 인기 검색어 순위 TOP 10
                                    </h3>
                                    <span className="text-[10px] text-gray-400 font-mono">실시간 누적</span>
                                </div>

                                <div className="mt-3 space-y-2">
                                    {searchAnalytics?.top_searches?.slice(0, 10).map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => router.push(`/discovery?q=${encodeURIComponent(item.keyword)}`)}
                                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                                    idx === 0 ? "bg-amber-400 text-black shadow-md" :
                                                    idx === 1 ? "bg-slate-300 text-black" :
                                                    idx === 2 ? "bg-amber-700 text-white" :
                                                    "bg-white/10 text-gray-400"
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="font-bold text-xs text-gray-200 group-hover:text-amber-300 transition-colors truncate">
                                                    {item.keyword}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                    {item.count}회
                                                </span>
                                                <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-500 pt-2 border-t border-white/5">
                                💡 방문자가 사이트 내에서 검색하거나 클릭한 실시간 로그입니다.
                            </p>
                        </div>

                        {/* 우측: 네이버 & 구글 24시간 자동 유입 타겟 키워드 랭킹 */}
                        <div className="lg:col-span-7 bg-zinc-950/60 border border-white/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                <h3 className="text-sm font-black text-white flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-400" />
                                    네이버 & 구글 24시간 검색 유입 타겟 키워드
                                </h3>
                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                    Sitemap.xml 전수 색인 중
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-white/5">
                                <table className="w-full text-left text-xs border-collapse bg-zinc-950/40">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase">
                                            <th className="px-3 py-2.5">타겟 검색어</th>
                                            <th className="px-3 py-2.5">월간 검색량</th>
                                            <th className="px-3 py-2.5">연결 타겟 페이지</th>
                                            <th className="px-3 py-2.5 text-right">색인 상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-medium">
                                        {searchAnalytics?.seo_target_keywords?.map((seo, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-3 py-2.5 font-bold text-gray-200">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                            {seo.category}
                                                        </span>
                                                        <span>{seo.keyword}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 font-mono text-emerald-400 font-bold">
                                                    {seo.monthly_volume}
                                                </td>
                                                <td className="px-3 py-2.5 font-mono text-gray-400">
                                                    <a
                                                        href={seo.target_page}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-white underline flex items-center gap-1"
                                                    >
                                                        {seo.target_page}
                                                        <ExternalLink className="w-3 h-3 text-gray-500" />
                                                    </a>
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono text-[11px] text-emerald-400 font-bold">
                                                    {seo.status}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 leading-relaxed">
                                🚀 <strong>프로그래매틱 SEO 가동 중:</strong> 위 키워드들이 네이버·구글 검색창에 노출되어 매일 수천 명의 잠재 투자자를 우리 사이트로 24시간 자동 유입시킵니다.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Header for User Table */}
                <div className="pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Users className="w-6 h-6 text-blue-500" />
                            가입 회원 리스트
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">회원 목록 및 권한 부여를 관리할 수 있습니다.</p>
                    </div>
                    {/* Search Bar & Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
                        <button
                            onClick={() => { setPushTarget('inactive'); setShowPushModal(true); }}
                            className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-2xl font-bold transition-all shadow-lg text-sm"
                        >
                            <Bell className="w-4 h-4" />
                            미접속자 일괄 발송
                        </button>
                        <div className="relative group w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="이름 또는 이메일로 검색..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* User Table Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-3xl shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">사용자</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">이메일 / 알림</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">등급 (PRO)</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">가입/접속일</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <img src={user.picture} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold">{user.name}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono">{user.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-gray-300 text-sm">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 text-gray-600" />
                                                    {user.email}
                                                </div>
                                                {user.has_fcm_token && (
                                                    <div className="flex flex-col gap-1.5 w-fit mt-1">
                                                        <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-500/20">
                                                            <Bell className="w-3 h-3" />
                                                            알림 ON
                                                        </div>
                                                        {user.fcm_devices && user.fcm_devices.length > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                {user.fcm_devices.map((device, idx) => {
                                                                    const isMobile = device.toLowerCase().includes('mobile') || device.toLowerCase().includes('android') || device.toLowerCase().includes('ios');
                                                                    return (
                                                                        <div key={idx} className="flex items-center justify-center w-5 h-5 bg-white/5 border border-white/10 rounded-full" title={device}>
                                                                            {isMobile ? <Smartphone className="w-3 h-3 text-gray-400" /> : <Monitor className="w-3 h-3 text-gray-400" />}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => toggleProStatus(user.id, user.is_pro)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-tight transition-all ${
                                                        user.is_pro 
                                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                                        : 'bg-white/5 text-gray-500 border border-white/5 grayscale group-hover:grayscale-0'
                                                    }`}
                                                >
                                                    {user.is_pro ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                                    {user.is_pro ? "PRO MEMBER" : "FREE PLAN"}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-gray-300 text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-gray-600 font-mono">접속: {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => { setPushTarget(user); setShowPushModal(true); }}
                                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:text-white hover:bg-blue-500/20 transition-all"
                                                    title="푸시 알림 보내기"
                                                >
                                                    <Bell className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => alert('특별 회원 표시 기능은 준비 중입니다.')}
                                                    className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                                                >
                                                    <Star className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteUser(user.id, user.name)}
                                                    className="p-2 rounded-lg bg-red-500/5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Section Header for Admin Tools */}
                <div className="pt-12 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Settings className="w-6 h-6 text-indigo-500" />
                            관리자 운영 도구
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">자동화 로봇 제어, 수익 확인 및 시스템 모니터링</p>
                    </div>
                </div>

                {/* 3x2 Grid for Standard Tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">


                    {/* SNS Marketing Bot */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-orange-600/10 to-transparent border border-orange-500/10 flex flex-col h-full group hover:border-orange-500/30 transition-all">
                        <div className="flex-grow">
                            <Megaphone className="w-10 h-10 text-orange-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">SNS 마케팅 봇</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">원클릭으로 블로그, 커뮤니티, 쇼츠용 홍보 문구를 자동 생성합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-orange-500/10 mt-auto">
                            <button
                                onClick={() => router.push('/admin/marketing')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <Megaphone className="w-4 h-4" />
                                마케팅 봇 실행하기
                            </button>
                        </div>
                    </div>

                    {/* Daily Analytics Report Card */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/10 flex flex-col h-full group hover:border-indigo-500/30 transition-all">
                        <div className="flex-grow">
                            <Activity className="w-10 h-10 text-indigo-400 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">운영 보고서 (일일 발송)</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">매일 밤 23시 59분에 방문자수 및 PV 등을 요약하여 알림으로 자동 발송합니다.</p>
                            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg mb-6 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                스케줄러 정상 작동 중
                            </div>
                        </div>
                        <div className="pt-4 border-t border-indigo-500/10 mt-auto">
                            <button
                                onClick={handleTestDailyReport}
                                disabled={reportSending}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm disabled:opacity-50"
                            >
                                {reportSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                {reportSending ? "발송 중..." : "수동 발송 테스트"}
                            </button>
                        </div>
                    </div>

                    {/* Google AdSense */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-green-600/10 to-transparent border border-green-500/10 flex flex-col h-full group hover:border-green-500/30 transition-all">
                        <div className="flex-grow">
                            <DollarSign className="w-10 h-10 text-green-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">구글 애드센스</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">달러 수익과 클릭률(CTR), 트래픽 지표를 구글 대시보드에서 실시간 확인합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-green-500/10 mt-auto">
                            <button
                                onClick={() => window.open('https://www.google.com/adsense/', '_blank')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                수익 확인하기
                            </button>
                        </div>
                    </div>

                    {/* Kakao AdFit */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/10 flex flex-col h-full group hover:border-yellow-500/30 transition-all">
                        <div className="flex-grow">
                            <DollarSign className="w-10 h-10 text-yellow-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">카카오 애드핏</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">카카오 광고 수익과 노출수 지표를 애드핏 대시보드에서 실시간 확인합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-yellow-500/10 mt-auto">
                            <button
                                onClick={() => window.open('https://adfit.kakao.com/', '_blank')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                수익 확인하기
                            </button>
                        </div>
                    </div>

                    {/* System Logs */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-fuchsia-600/10 to-transparent border border-fuchsia-500/10 flex flex-col h-full group hover:border-fuchsia-500/30 transition-all">
                        <div className="flex-grow">
                            <Activity className="w-10 h-10 text-fuchsia-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">시스템 로그 열람</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">발송 성공/실패 여부, 토큰 만료 등 백그라운드 발생 로그를 엑셀 표로 확인합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-fuchsia-500/10 mt-auto">
                            <button
                                onClick={() => router.push('/admin/logs')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <Eye className="w-4 h-4" />
                                로그 대시보드 입장
                            </button>
                        </div>
                    </div>

                    {/* Microsoft Clarity */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-cyan-600/10 to-transparent border border-cyan-500/10 flex flex-col h-full group hover:border-cyan-500/30 transition-all">
                        <div className="flex-grow">
                            <MousePointerClick className="w-10 h-10 text-cyan-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">클래리티 (히트맵 & 녹화)</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">사용자들의 마우스 클릭 위치, 스크롤 깊이 및 실제 화면 녹화(세션 리플레이)를 확인합니다.</p>
                        </div>
                        <div className="pt-4 border-t border-cyan-500/10 mt-auto">
                            <button
                                onClick={() => window.open('https://clarity.microsoft.com/', '_blank')}
                                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                히트맵 분석 바로가기
                            </button>
                        </div>
                    </div>
                </div>

                {/* Emergency Master Control Room */}
                <div className="mt-6 p-8 rounded-[2rem] bg-gradient-to-br from-red-600/10 via-black/40 to-black/80 border border-red-500/20 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-500/20 transition-all"></div>
                    
                    <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                        {/* Left Info */}
                        <div className="md:w-1/3 w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="relative flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                                </span>
                                <h3 className="text-2xl font-black text-white">긴급 제어 시스템</h3>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                백엔드 서버에 장애가 발생하거나 로봇이 멈췄을 때 원격으로 복구할 수 있는 최상위 권한 컨트롤 패널입니다.
                            </p>
                        </div>
                        
                        {/* Right Controls */}
                        <div className="md:w-2/3 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Auto Heal */}
                            <div className="bg-black/60 border border-red-500/20 p-5 rounded-2xl flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 text-white font-bold">
                                        <RefreshCw className={`w-4 h-4 ${autoHealEnabled ? 'text-green-400 animate-spin-slow' : 'text-gray-500'}`} />
                                        자가 치유 로봇
                                    </div>
                                    <button 
                                        onClick={handleToggleAutoHeal}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoHealEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoHealEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-tight">자동 복구 스케줄러를 활성화하여 서버 다운 시 자동 재시작합니다.</p>
                            </div>
                            
                            {/* Ping Test */}
                            <button
                                onClick={handlePingTest}
                                disabled={pingSending}
                                className="bg-gradient-to-b from-blue-600/20 to-blue-900/40 hover:from-blue-500/30 border border-blue-500/30 p-5 rounded-2xl flex flex-col justify-between h-full text-left transition-all active:scale-95 disabled:opacity-50"
                            >
                                <div className="flex items-center gap-2 text-blue-400 font-bold mb-4">
                                    {pingSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    알림 핑(Ping) 전송
                                </div>
                                <p className="text-[11px] text-gray-400 leading-tight text-white/70">스마트폰으로 테스트 알림을 발송하여 푸시 서버 상태를 점검합니다.</p>
                            </button>
                            
                            {/* Reboot */}
                            <button
                                onClick={handleRebootServer}
                                className="bg-gradient-to-b from-red-600/20 to-red-900/40 hover:from-red-500/30 border border-red-500/30 p-5 rounded-2xl flex flex-col justify-between h-full text-left transition-all active:scale-95"
                            >
                                <div className="flex items-center gap-2 text-red-400 font-bold mb-4">
                                    <Power className="w-4 h-4" />
                                    서버 강제 재부팅
                                </div>
                                <p className="text-[11px] text-gray-400 leading-tight text-white/70">경고: 서버 인스턴스를 강제 재시작합니다. 5초간 서비스가 중단됩니다.</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Push Notification Modal */}
            {showPushModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {pushTarget === 'inactive' ? '미접속자 일괄 알림 발송' : `개별 알림 발송 (${(pushTarget as UserData)?.name})`}
                        </h3>
                        
                        {pushTarget === 'inactive' && (
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-400 mb-2">미접속 기간 기준 (일)</label>
                                <select 
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                    value={inactiveDays}
                                    onChange={e => setInactiveDays(Number(e.target.value))}
                                >
                                    <option value={3}>3일 이상 미접속자</option>
                                    <option value={7}>7일 이상 미접속자</option>
                                    <option value={14}>14일 이상 미접속자</option>
                                    <option value={30}>30일 이상 미접속자</option>
                                </select>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-400 mb-2">알림 제목</label>
                            <input 
                                type="text"
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                placeholder="예: [안내] 오랜만에 오셨네요!"
                                value={pushTitle}
                                onChange={e => setPushTitle(e.target.value)}
                            />
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-400 mb-2">알림 내용</label>
                            <textarea 
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white h-32 resize-none focus:outline-none focus:border-blue-500"
                                placeholder="알림톡처럼 보낼 메시지를 작성하세요."
                                value={pushBody}
                                onChange={e => setPushBody(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowPushModal(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 font-bold transition-colors"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleSendPush}
                                disabled={pushSending}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl py-3 font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {pushSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                                발송하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
