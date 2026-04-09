"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Users, ShieldCheck, ShieldAlert, Search, Loader2, Mail, Calendar, UserCheck, Star, Trash2 } from "lucide-react";
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

export default function AdminPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState<string | null>(null);

    // [Security] Minimal admin check - can be expanded
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push("/");
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

    const toggleProStatus = async (userId: string, currentPro: boolean) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users/pro`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, is_pro: !currentPro })
            });
            const json = await res.json();
            if (json.status === "success") {
                // Local state update for instant feedback
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_pro: !currentPro } : u));
            }
        } catch (err) {
            alert("상태 변경에 실패했습니다.");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                <Header title="관리자 센터" subtitle="회원 정보를 안전하게 로드 중입니다..." />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            <Header title="회원 관리" subtitle={`총 ${users.length}명의 회원이 등록되어 있습니다.`} />

            <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Search Bar */}
                <div className="relative group max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="이름 또는 이메일로 검색..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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

                {/* Trial Reset Section Placeholder */}
                <div className="grid md:grid-cols-2 gap-6 mt-12">
                     <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 flex flex-col justify-between">
                         <div>
                            <UserCheck className="w-10 h-10 text-blue-500 mb-6" />
                            <h3 className="text-xl font-bold text-white mb-2">프리미엄 관리</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">사용자들에게 실시간으로 Pro 권한을 부여하거나 해제할 수 있습니다. 변경된 즉시 사용자의 대시보드 기능이 업데이트됩니다.</p>
                         </div>
                         <div className="flex gap-4">
                             <div className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold">ALL PRO ON</div>
                             <div className="px-4 py-2 bg-white/5 text-gray-500 rounded-xl text-xs font-bold">LOGS VIEW</div>
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
