"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Smartphone, User, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
    const { user } = useAuth();
    
    // 🔒 Hidden Admin Mode
    const [adminMode, setAdminMode] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [freeMode, setFreeMode] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initialize state on client-side only
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setFreeMode(sessionStorage.getItem('admin_free_mode') === 'true');
        }
    }, []);

    const handleHeaderClick = () => {
        const now = Date.now();
        if (now - lastClickTime > 2000) {
            setClickCount(1);
        } else {
            setClickCount(prev => prev + 1);
        }
        setLastClickTime(now);

        if (clickCount + 1 >= 7) {
            setAdminMode(true);
            setClickCount(0);
            setMsg({ type: 'success', text: '🔓 관리자 모드 활성화됨' });
        }
    };

    const toggleFreeMode = () => {
        const newMode = !freeMode;
        setFreeMode(newMode);
        sessionStorage.setItem('admin_free_mode', newMode.toString());
        setMsg({
            type: 'success',
            text: newMode ? '🎁 무료 모드 활성화! (앱 종료 시까지 유지)' : '무료 모드 비활성화됨'
        });
    };

    return (
        <div className="min-h-screen text-white pb-20">
            {/* Header: Click title for Secret Admin Mode */}
            <div onClick={handleHeaderClick} className="cursor-default select-none">
                <Header title="설정" subtitle="앱 환경 설정" />
            </div>

            <div className="max-w-2xl mx-auto p-6 space-y-6">
                
                {/* Admin Panel (Hidden by default) */}
                {adminMode && (
                    <div className="rounded-3xl bg-gradient-to-br from-purple-900 to-black p-8 border border-purple-500/50 shadow-2xl shadow-purple-900/50 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <ShieldCheck className="w-7 h-7 text-purple-400" />
                                관리자 패널
                            </h2>
                            <button
                                onClick={() => setAdminMode(false)}
                                className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-sm rounded-lg"
                            >
                                숨기기
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Free Mode Toggle */}
                            <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 p-5 rounded-xl border border-yellow-500/50 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                                            <span className="text-2xl">🎁</span>
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-yellow-300">무료 모드</div>
                                            <div className="text-xs text-yellow-200/70">모든 프리미엄 기능 무제한 사용</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleFreeMode}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${freeMode ? 'bg-green-500' : 'bg-gray-600'}`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${freeMode ? 'translate-x-7' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-black/40 p-4 rounded-xl border border-purple-500/20">
                                <div className="text-sm text-purple-300 mb-2">시스템 상태</div>
                                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                    <div><span className="text-gray-400">사용자:</span> <span className="text-white ml-2">{user?.email || 'Guest'}</span></div>
                                    <div><span className="text-gray-400">API:</span> <span className="text-white ml-2">Connected</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        localStorage.clear();
                                        setMsg({ type: 'success', text: '로컬 스토리지 초기화 완료' });
                                        setTimeout(() => window.location.reload(), 1000);
                                    }}
                                    className="bg-red-900/20 hover:bg-red-900/40 text-red-300 px-4 py-3 rounded-lg text-sm transition-colors border border-red-500/20"
                                >
                                    🗑️ 초기화
                                </button>
                                <button
                                    onClick={() => window.open(`${API_BASE_URL}/docs`, '_blank')}
                                    className="bg-blue-900/20 hover:bg-blue-900/40 text-blue-300 px-4 py-3 rounded-lg text-sm transition-colors border border-blue-500/20"
                                >
                                    📚 API 문서
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Account Info */}
                <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                        <User className="w-5 h-5 text-blue-400" />
                        계정 정보
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-5 bg-black/20 rounded-2xl border border-white/5">
                            <span className="text-gray-400 font-medium">로그인 상태</span>
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest ${user ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                {user ? 'LOGGED IN' : 'GUEST'}
                            </span>
                        </div>
                        {user && (
                            <div className="flex justify-between items-center p-5 bg-black/20 rounded-2xl border border-white/5">
                                <span className="text-gray-400 font-medium">연동 이메일</span>
                                <span className="text-white text-sm font-bold">{user.email}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Broker Quick Links */}
                <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-xl">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-green-400" />
                        증권사 앱 바로가기
                    </h3>
                    <p className="text-xs text-gray-500 mb-6">자주 사용하는 증권사 앱을 빠르게 실행할 수 있습니다.</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { name: "토스증권", color: "from-blue-600 to-blue-800", deepLink: "supertoss://", webUrl: "https://tossinvest.com" },
                            { name: "KB증권", color: "from-yellow-600 to-yellow-800", deepLink: "kb-mable://", webUrl: "https://www.kbsec.com" },
                            { name: "미래에셋", color: "from-orange-600 to-orange-800", deepLink: "miraeasset-mstock://", webUrl: "https://securities.miraeasset.com" },
                            { name: "NH나무증권", color: "from-green-600 to-green-800", deepLink: "nh-namuh://", webUrl: "https://www.nhqv.com" },
                            { name: "삼성증권", color: "from-indigo-600 to-indigo-800", deepLink: "samsungpop://", webUrl: "https://www.samsungpop.com" },
                            { name: "카카오페이증권", color: "from-amber-500 to-amber-700", deepLink: "kakaopaysec://", webUrl: "https://securities.kakaopay.com" },
                        ].map((broker) => (
                            <button
                                key={broker.name}
                                onClick={() => {
                                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                                    if (isMobile) {
                                        const timeout = setTimeout(() => {
                                            window.open(broker.webUrl, '_blank');
                                        }, 1500);
                                        window.location.href = broker.deepLink;
                                        window.addEventListener('blur', () => clearTimeout(timeout), { once: true });
                                    } else {
                                        window.open(broker.webUrl, '_blank');
                                    }
                                }}
                                className={`bg-gradient-to-br ${broker.color} p-5 rounded-2xl text-white font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 border border-white/10 group`}
                            >
                                {broker.name}
                                <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>

                    <p className="text-[10px] text-gray-600 mt-6 text-center italic">
                        * 본 기능은 편의용 연결 도구이며, 어떠한 투자 권유나 종목 추천을 포함하지 않습니다.
                    </p>
                </div>

                <div className="py-10 text-center space-y-2">
                    <p className="text-gray-600 text-[10px] font-black tracking-widest uppercase">Sector Trend v2.9.0 (Compliance-Secure)</p>
                    <p className="text-gray-700 text-[9px]">© 2026 Gemini Antigravity. All rights reserved.</p>
                </div>

                {msg && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 fixed bottom-24 left-1/2 -translate-x-1/2 shadow-2xl z-50 min-w-[300px] justify-center ${msg.type === 'success' ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
                        {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span className="text-sm font-bold">{msg.text}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
