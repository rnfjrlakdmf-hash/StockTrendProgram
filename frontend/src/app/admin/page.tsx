"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Users, ShieldCheck, ShieldAlert, Search, Loader2, Mail, Calendar, Star, Trash2, Activity, Eye, UserPlus, Megaphone, Power, RefreshCw, AlertTriangle, DollarSign, ExternalLink, Settings, MousePointerClick, Bell, Monitor, Smartphone, TrendingUp, BarChart3, Info, Sparkles, HelpCircle, ArrowUpRight, CheckCircle2, Flame, Globe, Copy } from "lucide-react";
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
    const [copiedUid, setCopiedUid] = useState<string | null>(null);

    const copyUid = (uid: string) => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(uid);
            setCopiedUid(uid);
            setTimeout(() => setCopiedUid(null), 1800);
        }
    };

    const formatDateKst = (dateStr?: string) => {
        if (!dateStr) return "-";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "-";
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}.${m}.${day}`;
        } catch {
            return dateStr;
        }
    };

    const formatLastLogin = (dateStr?: string) => {
        if (!dateStr) return { text: "접속 이력 없음", isRecent: false, isToday: false };
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return { text: "-", isRecent: false, isToday: false };
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return { text: "오늘 접속", isRecent: true, isToday: true };
            if (diffDays === 1) return { text: "어제 접속", isRecent: true, isToday: false };
            if (diffDays < 7) return { text: `${diffDays}일 전`, isRecent: true, isToday: false };
            return { text: formatDateKst(dateStr), isRecent: false, isToday: false };
        } catch {
            return { text: dateStr, isRecent: false, isToday: false };
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

    // 디테일 통계 지표 계산
    const avgDailyPV = analytics?.daily_stats && analytics.daily_stats.length > 0
        ? Math.round(totalPV / analytics.daily_stats.length)
        : 0;
    const todayPvPerUv = todayUV > 0 ? (todayPV / todayUV).toFixed(2) : "1.00";
    const proMemberCount = users.filter(u => u.is_pro).length;
    const proMemberPct = users.length > 0 ? ((proMemberCount / users.length) * 100).toFixed(1) : "0.0";
    
    const maxDailyPV = Math.max(...(analytics?.daily_stats?.map(s => s.pageviews) || [1]), 1);
    const maxHourlyPV = Math.max(...(hourlyStats?.map(s => s.pageviews) || [1]), 1);
    const peakHourStat = hourlyStats && hourlyStats.length > 0
        ? hourlyStats.reduce((max, cur) => cur.pageviews > max.pageviews ? cur : max, hourlyStats[0])
        : null;

    const getDayOfWeekKst = (dateStr: string) => {
        try {
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const d = new Date(dateStr);
            return days[d.getDay()] || '';
        } catch {
            return '';
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white pb-24">
            <Header title="관리자 대시보드" subtitle={`총 ${users.length}명의 가입 회원과 사이트 트래픽 및 AI 인프라 비용을 모니터링합니다.`} />

            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* ============================================================ */}
                {/* 1. 상단 핵심 5대 프리미엄 지표 카드 (대칭 & 디테일 수치) */}
                {/* ============================================================ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
                    {/* 카드 1: 실시간 접속자 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-emerald-500/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 hover:scale-[1.01] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">현재 실시간 접속</h3>
                            </div>
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="my-2">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{analytics?.active_users_5m ?? 0}</span>
                                <span className="text-gray-400 font-bold text-xs">명</span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/5 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-gray-400">
                                <span>집계 기준</span>
                                <span className="font-mono text-zinc-300">최근 5분 활동</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">서버 상태</span>
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 정상 가동
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 카드 2: 누적 가입 회원 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-amber-500/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 hover:scale-[1.01] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">누적 회원 계정</h3>
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="my-2">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{users.length.toLocaleString()}</span>
                                <span className="text-gray-400 font-bold text-xs">명</span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/5 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-gray-400">
                                <span>회원 등급</span>
                                <span className="font-mono text-zinc-300">PRO {proMemberCount}명 · 일반 {users.length - proMemberCount}명</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">PRO 비율</span>
                                <span className="text-amber-400 font-bold font-mono">{proMemberPct}%</span>
                            </div>
                        </div>
                    </div>

                    {/* 카드 3: 오늘의 방문 (PV & UV) */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-blue-500/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 hover:scale-[1.01] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">오늘의 트래픽</h3>
                                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-500/30">TODAY</span>
                            </div>
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                <Eye className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="my-2">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{todayPV.toLocaleString()}</span>
                                <span className="text-blue-400 font-bold text-xs">PV</span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/5 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-gray-400">
                                <span>순방문자 (UV)</span>
                                <span className="text-purple-400 font-bold font-mono">{todayUV.toLocaleString()}명</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">인당 열람률</span>
                                <span className="text-blue-300 font-bold font-mono">{todayPvPerUv} PV/인</span>
                            </div>
                        </div>
                    </div>

                    {/* 카드 4: 30일 누적 PV */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-indigo-500/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/40 hover:scale-[1.01] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">30일 누적 PV</h3>
                            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="my-2">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{totalPV.toLocaleString()}</span>
                                <span className="text-gray-400 font-bold text-xs">회</span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/5 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-gray-400">
                                <span>집계 기간</span>
                                <span className="font-mono text-zinc-300">최근 30일 총합</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">일평균 조회수</span>
                                <span className="text-indigo-400 font-bold font-mono">~{avgDailyPV.toLocaleString()} PV/일</span>
                            </div>
                        </div>
                    </div>

                    {/* 카드 5: 30일 누적 UV */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-purple-500/20 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/40 hover:scale-[1.01] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">30일 누적 UV</h3>
                            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                <UserPlus className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="my-2">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">{totalUV.toLocaleString()}</span>
                                <span className="text-gray-400 font-bold text-xs">명</span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/5 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-gray-400">
                                <span>방문자 성격</span>
                                <span className="font-mono text-zinc-300">중복제거 순방문</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">열람 심도</span>
                                <span className="text-purple-400 font-bold font-mono">{(totalPV / Math.max(totalUV, 1)).toFixed(2)} PV/인</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================================ */}
                {/* 2. 트래픽 상세 테이블 (일별 & 시간대별 시각화) */}
                {/* ============================================================ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 좌측: 일별 조회수 및 방문자수 통계 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-inner">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white">일별 트래픽 분석</h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">날짜별 페이지뷰(PV)와 순방문자수(UV) 추이</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">최근 30일</span>
                            </div>
                        </div>

                        <div className="max-h-[360px] overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                            {analytics?.daily_stats && analytics.daily_stats.length > 0 ? (
                                analytics.daily_stats.map((stat) => {
                                    const isToday = stat.date === todayStr;
                                    const ratio = Math.min(Math.round((stat.pageviews / maxDailyPV) * 100), 100);
                                    const dow = getDayOfWeekKst(stat.date);
                                    const pvPerUv = stat.unique_visitors > 0 ? (stat.pageviews / stat.unique_visitors).toFixed(1) : "1.0";

                                    return (
                                        <div 
                                            key={stat.date} 
                                            className={`relative overflow-hidden p-3.5 rounded-2xl border transition-all ${
                                                isToday 
                                                ? 'bg-blue-950/20 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                                : 'bg-zinc-950/70 border-white/5 hover:border-white/15'
                                            }`}
                                        >
                                            {/* 인텐시티 배경 게이지 바 */}
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 bg-blue-500/[0.04] pointer-events-none rounded-2xl transition-all duration-500" 
                                                style={{ width: `${ratio}%` }} 
                                            />

                                            <div className="relative flex justify-between items-center gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-blue-400 animate-ping' : 'bg-blue-500'}`} />
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-white font-bold font-mono text-xs md:text-sm">{stat.date}</span>
                                                        <span className={`text-[11px] font-bold ${dow === '토' ? 'text-blue-400' : dow === '일' ? 'text-rose-400' : 'text-zinc-500'}`}>
                                                            ({dow})
                                                        </span>
                                                        {isToday && (
                                                            <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-full ml-1">
                                                                TODAY
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 md:gap-5 text-xs">
                                                    <div className="text-right">
                                                        <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">PAGEVIEWS</span>
                                                        <span className="text-blue-400 font-black font-mono text-sm">{stat.pageviews.toLocaleString()}회</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">VISITORS</span>
                                                        <span className="text-purple-400 font-black font-mono text-sm">{stat.unique_visitors.toLocaleString()}명</span>
                                                    </div>
                                                    <div className="hidden sm:block text-right border-l border-white/5 pl-3">
                                                        <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">심도</span>
                                                        <span className="text-zinc-400 font-mono text-xs">{pvPerUv}x</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 하단 미니 트래픽 바 */}
                                            <div className="relative w-full bg-zinc-800/40 h-1 rounded-full overflow-hidden mt-2">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.max(ratio, 4)}%` }} 
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-gray-500 text-xs text-center py-10">아직 기록된 일별 방문 통계가 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* 우측: 시간대별 트래픽 피크 모니터링 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-inner">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white">시간대별 트래픽 피크</h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">24시간 접속 집중 시간대 실시간 모니터링</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {peakHourStat && (
                                    <span className="text-[10px] font-black text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 flex items-center gap-1">
                                        <span>🔥 최다 피크:</span> {peakHourStat.date_hour.split('_')[1] || peakHourStat.date_hour}시 ({peakHourStat.pageviews}회)
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="max-h-[360px] overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                            {hourlyStats && hourlyStats.length > 0 ? (
                                hourlyStats.map((stat) => {
                                    const isPeak = peakHourStat && peakHourStat.date_hour === stat.date_hour;
                                    const ratio = Math.min(Math.round((stat.pageviews / maxHourlyPV) * 100), 100);
                                    const hourPart = stat.date_hour.replace('_', ' ');

                                    return (
                                        <div 
                                            key={stat.date_hour} 
                                            className={`relative overflow-hidden p-3.5 rounded-2xl border transition-all ${
                                                isPeak 
                                                ? 'bg-purple-950/20 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                                                : 'bg-zinc-950/70 border-white/5 hover:border-white/15'
                                            }`}
                                        >
                                            {/* 인텐시티 배경 게이지 바 */}
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 bg-purple-500/[0.04] pointer-events-none rounded-2xl transition-all duration-500" 
                                                style={{ width: `${ratio}%` }} 
                                            />

                                            <div className="relative flex justify-between items-center gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-2 h-2 rounded-full ${isPeak ? 'bg-purple-400 animate-pulse' : 'bg-purple-500'}`} />
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-white font-bold font-mono text-xs md:text-sm">{hourPart}시</span>
                                                        {isPeak && (
                                                            <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full ml-1 flex items-center gap-0.5">
                                                                🔥 PEAK
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 md:gap-5 text-xs">
                                                    <div className="text-right">
                                                        <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">PAGEVIEWS</span>
                                                        <span className="text-blue-400 font-black font-mono text-sm">{stat.pageviews.toLocaleString()}회</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">VISITORS</span>
                                                        <span className="text-rose-400 font-black font-mono text-sm">{stat.unique_visitors.toLocaleString()}명</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 하단 미니 트래픽 바 */}
                                            <div className="relative w-full bg-zinc-800/40 h-1 rounded-full overflow-hidden mt-2">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-purple-600 to-rose-500 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.max(ratio, 4)}%` }} 
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-gray-500 text-xs text-center py-10">아직 시간대별 방문 통계가 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>


                {/* ============================================================ */}
                {/* 3. Gemini AI API 비용 모니터링 (디테일 인프라 관제) */}
                {/* ============================================================ */}
                <div className="pt-2 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 shadow-inner">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="text-xl md:text-2xl font-black text-white">Gemini AI API 비용 관제</h2>
                                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        실시간 연동 중
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-zinc-800 text-zinc-400 border border-white/10">
                                        {geminiCost?.model || 'gemini-2.5-flash-lite'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">실시간 AI 모델 토큰 소모량, 호출 횟수 및 월간 예산 소진율 모니터링</p>
                            </div>
                        </div>

                        <button
                            onClick={fetchGeminiCost}
                            disabled={geminiCostLoading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-2xl text-xs font-bold text-gray-300 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                            {geminiCostLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            비용 새로고침
                        </button>
                    </div>

                    {geminiCost ? (
                        <>
                            {/* 요약 카드 3개 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* 오늘 비용 */}
                                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[11px] font-black uppercase text-emerald-400 tracking-widest">오늘 사용 비용</p>
                                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md border border-white/5">TODAY</span>
                                        </div>
                                        <p className="text-3xl font-black font-mono text-white tracking-tight">₩{geminiCost.today.cost_krw.toLocaleString()}<span className="text-base font-normal text-zinc-400 ml-1">원</span></p>
                                        <p className="text-xs text-gray-400 mt-1 font-mono">${geminiCost.today.cost_usd} USD · {geminiCost.today.calls}회 호출</p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-[11px]">
                                        <div className="flex justify-between text-gray-400">
                                            <span>호출당 단가</span>
                                            <span className="font-mono text-emerald-400 font-bold">~{geminiCost.today.calls > 0 ? (geminiCost.today.cost_krw / geminiCost.today.calls).toFixed(2) : "0"}원/회</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>토큰 사용량</span>
                                            <span className="font-mono text-zinc-300">인 {Math.round(geminiCost.today.input_tokens / 1000)}k / 아웃 {Math.round(geminiCost.today.output_tokens / 1000)}k</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 이번달 비용 + 예산 게이지 */}
                                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-blue-500/20 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[11px] font-black uppercase text-blue-400 tracking-widest">이번 달 누적 비용</p>
                                            <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{geminiCost.this_month.month}월</span>
                                        </div>
                                        <p className="text-3xl font-black font-mono text-white tracking-tight">₩{geminiCost.this_month.cost_krw.toLocaleString()}<span className="text-base font-normal text-zinc-400 ml-1">원</span></p>
                                        <p className="text-xs text-gray-400 mt-1 font-mono">예산 한도: ₩{geminiCost.this_month.budget_limit_krw.toLocaleString()}원</p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                                        <div className="flex justify-between text-[11px] text-gray-400">
                                            <span>예산 소진율</span>
                                            <span className={`font-mono font-bold ${geminiCost.this_month.budget_used_pct >= 80 ? "text-rose-400" : "text-emerald-400"}`}>
                                                {geminiCost.this_month.budget_used_pct}% ({Math.max(geminiCost.this_month.budget_limit_krw - geminiCost.this_month.cost_krw, 0).toLocaleString()}원 잔여)
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    geminiCost.this_month.budget_used_pct >= 80 ? "bg-rose-500" :
                                                    geminiCost.this_month.budget_used_pct >= 50 ? "bg-amber-500" : "bg-gradient-to-r from-emerald-500 to-teal-400"
                                                }`}
                                                style={{ width: `${Math.min(geminiCost.this_month.budget_used_pct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 30일 총계 */}
                                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-purple-500/20 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-purple-500/40 transition-all">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[11px] font-black uppercase text-purple-400 tracking-widest">30일 누적 총 비용</p>
                                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md border border-white/5">30 DAYS</span>
                                        </div>
                                        <p className="text-3xl font-black font-mono text-white tracking-tight">₩{geminiCost.total_cost_krw.toLocaleString()}<span className="text-base font-normal text-zinc-400 ml-1">원</span></p>
                                        <p className="text-xs text-gray-400 mt-1 font-mono">총 API 호출 {geminiCost.total_calls.toLocaleString()}회</p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-[11px]">
                                        <div className="flex justify-between text-gray-400">
                                            <span>일평균 API 비용</span>
                                            <span className="font-mono text-purple-400 font-bold">~{Math.round(geminiCost.total_cost_krw / 30).toLocaleString()}원/일</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>백엔드 캐싱</span>
                                            <span className="text-emerald-400 font-bold">스마트 최적화 활성 🟢</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 일별 바 차트 */}
                            <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <span>일별 API 비용 추이 (최근 30일)</span>
                                    </h3>
                                    <span className="text-xs text-gray-500 font-mono">단위: 원(KRW)</span>
                                </div>
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
                                                                className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600/40 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 transition-all shadow-sm"
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

                {/* 4. [검색어 트렌드] 실제 이용자 실시간 인기 검색어 TOP 10 */}
                {/* ============================================================ */}
                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-blue-500/20 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-md">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
                                <Flame className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                                    실시간 인기 검색어 순위 TOP 10
                                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                                        실시간 유저 집계 🟢
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    실제 이용자들이 사이트 내 검색창에서 가장 많이 찾아보고 관심 있어 하는 종목 순위입니다.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={fetchSearchAnalytics}
                            disabled={searchAnalyticsLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-gray-300 hover:text-white rounded-xl transition-all active:scale-95"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${searchAnalyticsLoading ? "animate-spin text-blue-400" : ""}`} />
                            새로고침
                        </button>
                    </div>

                    {/* 실시간 1위 종목 하이라이트 배너 */}
                    {searchAnalytics?.top_searches?.[0] && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 bg-amber-400 text-black text-xs font-black rounded-lg">1위 종목</span>
                                <span className="text-lg font-black text-white">{searchAnalytics.top_searches[0].keyword}</span>
                                {searchAnalytics.top_searches[0].price_change && (
                                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                        searchAnalytics.top_searches[0].price_change.startsWith('+')
                                            ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                            : 'text-sky-400 bg-sky-500/10 border border-sky-500/20'
                                    }`}>
                                        {searchAnalytics.top_searches[0].price_change}
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-400">누적 검색 </span>
                                <span className="text-sm font-black font-mono text-emerald-400">{searchAnalytics.top_searches[0].count}회</span>
                                <span className="text-xs text-gray-400 ml-3">점유율 </span>
                                <span className="text-sm font-black font-mono text-amber-300">{searchAnalytics.top_searches[0].search_ratio}</span>
                            </div>
                        </div>
                    )}

                    {/* 2열 10개 종목 리스트 (1~5위 좌측, 6~10위 우측) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchAnalytics?.top_searches?.slice(0, 10).map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => router.push(`/discovery?q=${encodeURIComponent(item.keyword)}`)}
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/70 hover:bg-white/[0.05] border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group shadow-sm"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                        idx === 0 ? "bg-amber-400 text-black shadow-md" :
                                        idx === 1 ? "bg-slate-300 text-black" :
                                        idx === 2 ? "bg-amber-700 text-white" :
                                        "bg-white/10 text-gray-400"
                                    }`}>
                                        {idx + 1}
                                    </span>
                                    <span className="font-bold text-sm text-gray-200 group-hover:text-amber-300 transition-colors truncate">
                                        {item.keyword}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    {item.price_change && (
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                                            item.price_change.startsWith('+')
                                                ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                                : item.price_change.startsWith('-')
                                                ? 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                                                : 'text-gray-400 bg-white/5 border-white/10'
                                        }`}>
                                            {item.price_change}
                                        </span>
                                    )}
                                    <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                        {item.count ? `${item.count.toLocaleString()}회` : item.search_ratio}
                                    </span>
                                    <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-[11px] text-gray-500 pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <span>💡 종목을 클릭하시면 해당 종목의 심층 AI 분석 및 수급 현황 페이지로 즉시 이동합니다.</span>
                        <span className="font-mono text-zinc-400 font-medium">{searchAnalytics?.last_updated ? `마지막 갱신: ${searchAnalytics.last_updated} (한국시간)` : ''}</span>
                    </p>
                </div>

                {/* ============================================================ */}
                {/* 5. 가입 회원 관리 & 권한 제어 센터 */}
                {/* ============================================================ */}
                <div className="pt-4 space-y-4">
                    {/* 상단 프리미엄 컨트롤 바 (타이틀, 통계 배지, 검색, 일괄 발송) */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-b from-zinc-900/90 via-zinc-900/80 to-zinc-950 p-5 md:p-6 rounded-3xl border border-white/10 shadow-xl backdrop-blur-md">
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 shadow-inner">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">가입 회원 관리</h2>
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-zinc-800/90 text-zinc-300 border border-white/10">
                                            전체 <strong className="text-white font-mono">{users.length}</strong>명
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            PRO <strong className="text-blue-300 font-mono">{users.filter(u => u.is_pro).length}</strong>명
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            알림 수신 <strong className="text-emerald-300 font-mono">{users.filter(u => u.has_fcm_token).length}</strong>명
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">회원 등급(PRO) 부여, 개별/일괄 푸시 알림 발송 및 사용자 계정을 관리합니다.</p>
                            </div>
                        </div>

                        {/* 검색창 & 일괄 발송 버튼 */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                            <button
                                onClick={() => { setPushTarget('inactive'); setShowPushModal(true); }}
                                className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-2xl font-bold transition-all shadow-lg shadow-violet-950/40 text-xs text-white active:scale-95"
                            >
                                <Bell className="w-3.5 h-3.5" />
                                <span>미접속자 일괄 푸시</span>
                            </button>
                            
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="이름 또는 이메일 검색..."
                                    className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl py-2 pl-9 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center bg-zinc-800"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 프리미엄 유저 테이블 카드 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/80 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-950/80 border-b border-white/10 text-[11px] font-bold text-zinc-400 tracking-wider uppercase">
                                        <th className="px-6 py-4">사용자</th>
                                        <th className="px-6 py-4">연락처 & 알림 수신</th>
                                        <th className="px-6 py-4 text-center">멤버십 등급</th>
                                        <th className="px-6 py-4">가입일 / 최근 접속</th>
                                        <th className="px-6 py-4 text-right">계정 관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((user) => {
                                            const lastLogin = formatLastLogin(user.last_login_at);
                                            const isCopied = copiedUid === user.id;

                                            return (
                                                <tr key={user.id} className="hover:bg-white/[0.03] transition-colors group">
                                                    {/* 1. 사용자 */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative flex-shrink-0">
                                                                {user.picture ? (
                                                                    <img 
                                                                        src={user.picture} 
                                                                        alt="" 
                                                                        className="w-10 h-10 rounded-2xl object-cover ring-1 ring-white/10 shadow-sm" 
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm ring-1 ring-white/10 shadow-sm">
                                                                        {user.name ? user.name.slice(0, 1) : "U"}
                                                                    </div>
                                                                )}
                                                                {user.is_pro && (
                                                                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow-md ring-2 ring-zinc-950" title="PRO 회원">
                                                                        <Sparkles className="w-2.5 h-2.5 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-white font-bold text-sm tracking-tight">{user.name || "이름 없음"}</span>
                                                                    {lastLogin.isToday && (
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="오늘 접속" />
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => copyUid(user.id)}
                                                                    title="클릭하여 전체 UID 복사"
                                                                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors text-left group/uid mt-0.5"
                                                                >
                                                                    <span>UID: #{user.id ? (user.id.length > 10 ? `${user.id.slice(0, 4)}...${user.id.slice(-4)}` : user.id) : "-"}</span>
                                                                    <Copy className="w-3 h-3 opacity-0 group-hover/uid:opacity-100 transition-opacity" />
                                                                    {isCopied && <span className="text-[10px] text-emerald-400 font-sans font-bold">복사됨!</span>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 2. 연락처 & 알림 수신 */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-xs">
                                                                <Mail className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                                                <span className="truncate max-w-[220px]" title={user.email}>{user.email}</span>
                                                            </div>
                                                            
                                                            {/* 알림 상태 배지 (행 높이 균일화) */}
                                                            <div className="flex items-center gap-1.5">
                                                                {user.has_fcm_token ? (
                                                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                                                                        <Bell className="w-2.5 h-2.5" />
                                                                        <span>알림 켜짐</span>
                                                                        {user.fcm_devices && user.fcm_devices.length > 0 && (
                                                                            <span className="flex items-center gap-0.5 ml-1 pl-1 border-l border-emerald-500/30 text-emerald-300">
                                                                                {user.fcm_devices.map((device, idx) => {
                                                                                    const isMobile = device.toLowerCase().includes('mobile') || device.toLowerCase().includes('android') || device.toLowerCase().includes('ios');
                                                                                    return isMobile ? (
                                                                                        <Smartphone key={idx} className="w-2.5 h-2.5" title={device} />
                                                                                    ) : (
                                                                                        <Monitor key={idx} className="w-2.5 h-2.5" title={device} />
                                                                                    );
                                                                                })}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800/40 text-zinc-500 border border-white/5">
                                                                        <span>알림 미설정</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 3. 멤버십 등급 (PRO 토글) */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center">
                                                            <button
                                                                onClick={() => toggleProStatus(user.id, user.is_pro)}
                                                                title={user.is_pro ? "클릭 시 일반(FREE) 회원으로 변경" : "클릭 시 PRO 회원으로 승급"}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-tight transition-all duration-200 active:scale-95 ${
                                                                    user.is_pro 
                                                                    ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 text-blue-300 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:border-blue-400 hover:scale-105' 
                                                                    : 'bg-zinc-800/60 text-zinc-400 border border-white/10 hover:border-white/30 hover:text-white hover:bg-zinc-800 hover:scale-105'
                                                                }`}
                                                            >
                                                                {user.is_pro ? <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />}
                                                                <span>{user.is_pro ? "PRO MEMBER" : "FREE PLAN"}</span>
                                                            </button>
                                                        </div>
                                                    </td>

                                                    {/* 4. 가입일 / 최근 접속 */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1 text-xs">
                                                            <div className="flex items-center gap-1.5 text-zinc-300 font-mono">
                                                                <span className="text-[10px] text-zinc-500 font-sans font-medium">가입</span>
                                                                <span>{formatDateKst(user.created_at)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 font-mono">
                                                                <span className="text-[10px] text-zinc-500 font-sans font-medium">접속</span>
                                                                <span className={lastLogin.isRecent ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                                                                    {lastLogin.text}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 5. 계정 관리 액션 버튼 */}
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button 
                                                                onClick={() => { setPushTarget(user); setShowPushModal(true); }}
                                                                className="p-2 rounded-xl bg-zinc-950 border border-white/10 text-zinc-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all active:scale-95"
                                                                title="개별 푸시 알림 발송"
                                                            >
                                                                <Bell className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteUser(user.id, user.name)}
                                                                className="p-2 rounded-xl bg-zinc-950 border border-white/10 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all active:scale-95"
                                                                title="회원 삭제"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-zinc-500">
                                                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                <p className="text-sm font-medium">검색 조건과 일치하는 회원이 없습니다.</p>
                                                {searchTerm && (
                                                    <button 
                                                        onClick={() => setSearchTerm("")}
                                                        className="mt-2 text-xs text-blue-400 hover:underline"
                                                    >
                                                        검색어 초기화
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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
