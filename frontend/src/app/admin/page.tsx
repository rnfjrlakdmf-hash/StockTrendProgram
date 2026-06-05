"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Users, ShieldCheck, ShieldAlert, Search, Loader2, Mail, Calendar, UserCheck, Star, Trash2, Activity, Eye, UserPlus, Megaphone, Power, RefreshCw, AlertTriangle } from "lucide-react";
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

interface AnalyticsStats {
    active_users_5m: number;
    daily_stats: DailyStat[];
}

export default function AdminPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [reportSending, setReportSending] = useState(false);
    const [autoHealEnabled, setAutoHealEnabled] = useState(false);

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
            const res = await fetch(`${API_BASE_URL}/api/admin/users`);
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
        } catch (e) {
            console.error("Failed to fetch analytics:", e);
        }
    };

    const toggleProStatus = async (userId: string, currentPro: boolean) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users/pro`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                                <button className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                                                    <Star className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 rounded-lg bg-red-500/5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
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

                {/* Premium Help & Daily Report Info Grid */}
                <div className="grid md:grid-cols-3 gap-6 mt-12">
                     {/* Premium management & Marketing */}
                     <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 flex flex-col justify-between space-y-6">
                          <div>
                             <UserCheck className="w-10 h-10 text-blue-500 mb-6" />
                             <h3 className="text-xl font-bold text-white mb-2">프리미엄 관리 및 권한 조절</h3>
                             <p className="text-sm text-gray-400 leading-relaxed">사용자들에게 Pro 등급을 활성화하여 제공할 수 있습니다. 스위치를 클릭하면 해당 등급 설정이 백엔드 DB와 대시보드 화면에 즉시 동기화 적용됩니다.</p>
                          </div>
                          
                          <div className="pt-6 border-t border-white/10">
                              <Megaphone className="w-10 h-10 text-orange-500 mb-6" />
                              <h3 className="text-xl font-bold text-white mb-2">SNS 마케팅 봇</h3>
                              <p className="text-sm text-gray-400 leading-relaxed mb-6">원클릭으로 블로그, 커뮤니티, 쇼츠용 홍보 문구를 자동 생성합니다.</p>
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
                     <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-600/10 to-transparent border border-white/5 flex flex-col justify-between">
                          <div>
                             <Activity className="w-10 h-10 text-indigo-400 mb-6" />
                             <h3 className="text-xl font-bold text-white mb-2">일일 운영 보고서 자동 알림 (23:59:59)</h3>
                             <p className="text-sm text-gray-400 leading-relaxed mb-6">
                                 매일 밤 11시 59분 59초에 오늘 하루 동안 집계된 순방문자수(UV), 페이지뷰(PV), 동시 접속자 수 및 누적 가입자 현황을 관리자 계정으로 자동 발송합니다.
                             </p>
                             <div className="flex flex-col gap-3">
                                 <div className="flex items-center gap-2 text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl self-start">
                                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                     백엔드 스케줄러 정상 작동 중 (🟢 ON)
                                 </div>
                                 <button
                                     onClick={handleTestDailyReport}
                                     disabled={reportSending}
                                     className="flex items-center justify-center gap-2 w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-50 text-sm"
                                 >
                                     {reportSending ? (
                                         <>
                                             <Loader2 className="w-4 h-4 animate-spin" />
                                             보고서 발송 중...
                                         </>
                                     ) : (
                                         <>
                                             ⚡ 지금 즉시 보고서 발송 테스트
                                         </>
                                     )}
                                 </button>
                             </div>
                          </div>
                     </div>
                     
                     {/* Master Control Room (긴급 마스터 키) */}
                     <div className="p-8 rounded-[2rem] bg-gradient-to-br from-red-600/10 to-transparent border border-red-500/20 flex flex-col justify-between">
                          <div>
                             <AlertTriangle className="w-10 h-10 text-red-500 mb-6" />
                             <h3 className="text-xl font-bold text-white mb-2">긴급 마스터 컨트롤 룸</h3>
                             <p className="text-sm text-gray-400 leading-relaxed mb-6">
                                 모바일 기기에서 원격으로 백엔드 서버를 껐다 켜거나 자가치유(오토힐링) 로봇을 제어할 수 있는 최상위 권한 컨트롤 패널입니다.
                             </p>
                             
                             <div className="space-y-4 pt-4 border-t border-red-500/10">
                                 {/* 자가치유 토글 */}
                                 <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5">
                                     <div className="flex items-center gap-3">
                                         <div className={`p-2 rounded-lg ${autoHealEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                            <RefreshCw className={`w-5 h-5 ${autoHealEnabled ? 'animate-spin-slow' : ''}`} />
                                         </div>
                                         <div>
                                             <div className="text-sm font-bold text-white">오토 힐링 (자가 치유)</div>
                                             <div className="text-[10px] text-gray-500">스케줄러 다운 시 로봇이 자동 부활시킴</div>
                                         </div>
                                     </div>
                                     <button 
                                        onClick={handleToggleAutoHeal}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoHealEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                     >
                                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoHealEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                     </button>
                                 </div>
                                 
                                 {/* 강제 서버 재부팅 버튼 */}
                                 <button
                                     onClick={handleRebootServer}
                                     className="flex items-center justify-center gap-2 w-full mt-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black tracking-widest py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-red-500/20 active:scale-95 text-sm"
                                 >
                                     <Power className="w-5 h-5" />
                                     서버 강제 재부팅 (REBOOT)
                                 </button>
                             </div>
                          </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
