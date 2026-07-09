"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Users, ShieldCheck, ShieldAlert, Search, Loader2, Mail, Calendar, UserCheck, Star, Trash2, Activity, Eye, UserPlus, Megaphone, Power, RefreshCw, AlertTriangle, DollarSign, ExternalLink, Settings, MousePointerClick } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface UserData {
    id: string;
    email: string;
    name: string;
    picture: string;
    is_pro: boolean;
    free_trial_count: number;
    created_at: string;
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

    useEffect(() => {
        fetchUsers();
        fetchAnalytics();
        
        if (currentUser && (currentUser.email?.toLowerCase() === "rnfjr@gmail.com" || currentUser.email?.toLowerCase() === "rnfjrlakdmf@gmail.com")) {
            fetchMasterStatus();
        }

        // 10초마다 실시간 동시접속자수 및 방문통계 동기화
        const interval = setInterval(fetchAnalytics, 10000);
        return () => clearInterval(interval);
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
        <div className="min-h-screen bg-black text-white pb-20">
            <Header title="관리자 대시보드" subtitle={`총 ${users.length}명의 회원이 가입되어 있으며, 방문 통계를 제공합니다.`} />

            <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Analytics Grid Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {/* Real-time Active Users */}
                    <div className="bg-gradient-to-br from-green-500/10 via-transparent to-transparent border border-green-500/20 rounded-[2rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-green-500/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3.5">
                                <span className="relative flex h-3.5 w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                                </span>
                                <h3 className="text-xl font-bold text-white">현재 접속</h3>
                            </div>
                            <Activity className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tight text-white">{analytics?.active_users_5m ?? 0}</span>
                            <span className="text-gray-400 font-bold">명 접속 중</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">최근 5분 동안 활발히 서비스를 이용하고 있는 사용자 수입니다.</p>
                    </div>

                    {/* Total Registered Members */}
                    <div className="bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent border border-yellow-500/20 rounded-[2rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-yellow-500/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">누적 가입 회원</h3>
                            <Users className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tight text-white">{users.length.toLocaleString()}</span>
                            <span className="text-gray-400 font-bold">명</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">현재까지 서비스에 가입한 총 누적 회원수입니다.</p>
                    </div>

                    {/* Today's Stats (1-Day) */}
                    <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent border border-blue-500/20 rounded-[2rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">오늘의 방문 (1일)</h3>
                            <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">TODAY</div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-gray-400 text-xs font-bold">오늘 조회수 (PV)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-blue-400">{todayPV.toLocaleString()}</span>
                                    <span className="text-[10px] text-gray-500 font-bold">회</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-baseline border-t border-white/5 pt-2">
                                <span className="text-gray-400 text-xs font-bold">오늘 방문자 (UV)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-purple-400">{todayUV.toLocaleString()}</span>
                                    <span className="text-[10px] text-gray-500 font-bold">명</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">오늘 자정(KST)부터 집계된 페이지 뷰와 순 방문자입니다.</p>
                    </div>

                    {/* Total Cumulative PV */}
                    <div className="bg-gradient-to-br from-blue-500/10 via-transparent to-transparent border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">누적 조회수 (PV)</h3>
                            <Eye className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tight text-white">{totalPV.toLocaleString()}</span>
                            <span className="text-gray-400 font-bold">회 클릭</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">최근 30일 동안 발생한 총 페이지뷰 카운트입니다.</p>
                    </div>

                    {/* Total Cumulative UV */}
                    <div className="bg-gradient-to-br from-purple-500/10 via-transparent to-transparent border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">누적 순방문자 (UV)</h3>
                            <UserPlus className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tight text-white">{totalUV.toLocaleString()}</span>
                            <span className="text-gray-400 font-bold">명 유입</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">최근 30일 동안 중복을 제외하고 방문한 유저 수입니다.</p>
                    </div>
                </div>

                {/* Stats Tables Grid: Daily & Hourly */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visitor Statistics Table Card */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                        <h3 className="text-xl font-bold text-white mb-6">일별 조회수 및 방문자수 통계</h3>
                        <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                            {analytics?.daily_stats && analytics.daily_stats.length > 0 ? (
                                analytics.daily_stats.map((stat) => (
                                    <div key={stat.date} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                        <div>
                                            <p className="text-white font-bold text-sm">{stat.date}</p>
                                        </div>
                                        <div className="flex gap-6 text-sm">
                                            <div className="text-right">
                                                <p className="text-gray-500 text-[10px] font-black uppercase">PAGEVIEWS (PV)</p>
                                                <p className="text-blue-400 font-black text-base">{stat.pageviews.toLocaleString()}회</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-500 text-[10px] font-black uppercase">VISITORS (UV)</p>
                                                <p className="text-purple-400 font-black text-base">{stat.unique_visitors.toLocaleString()}명</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-8">아직 기록된 방문 통계가 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* Hourly Statistics Table Card */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                        <h3 className="text-xl font-bold text-white mb-6">시간대별 트래픽 피크 모니터링</h3>
                        <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                            {hourlyStats && hourlyStats.length > 0 ? (
                                hourlyStats.map((stat) => (
                                    <div key={stat.date_hour} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                        <div>
                                            <p className="text-white font-bold text-sm">{stat.date_hour.replace('_', ' ')}시</p>
                                        </div>
                                        <div className="flex gap-6 text-sm">
                                            <div className="text-right">
                                                <p className="text-gray-500 text-[10px] font-black uppercase">PAGEVIEWS (PV)</p>
                                                <p className="text-blue-400 font-black text-base">{stat.pageviews.toLocaleString()}회</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-500 text-[10px] font-black uppercase">VISITORS (UV)</p>
                                                <p className="text-red-400 font-black text-base">{stat.unique_visitors.toLocaleString()}명</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-8">아직 시간대별 방문 통계가 없습니다.</p>
                            )}
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
                    {/* Search Bar */}
                    <div className="relative group w-full max-w-md">
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

                {/* User Table Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-3xl shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">사용자</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">이메일</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">등급 (PRO)</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">가입일</th>
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
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5 text-gray-600" />
                                                {user.email}
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
                                                <span className="text-[10px] text-gray-600 font-mono lowercase">verified</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
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
                    {/* Premium Management */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/10 flex flex-col h-full group hover:border-blue-500/30 transition-all">
                        <div className="flex-grow">
                            <UserCheck className="w-10 h-10 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-xl font-bold text-white mb-2">프리미엄 권한 부여</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">사용자들에게 Pro 등급을 제공합니다. 위 회원 리스트에서 토글을 클릭하면 즉시 동기화됩니다.</p>
                        </div>
                        <div className="pt-4 border-t border-blue-500/10 mt-auto">
                            <button
                                onClick={() => window.scrollTo({top: 500, behavior: 'smooth'})}
                                className="flex items-center justify-center w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3.5 px-6 rounded-2xl transition-all text-sm"
                            >
                                👆 위 회원 리스트에서 설정
                            </button>
                        </div>
                    </div>

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
        </div>
    );
}
