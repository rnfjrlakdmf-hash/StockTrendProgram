"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { Save, ShieldCheck, AlertTriangle, CheckCircle, Key, Loader2, User } from "lucide-react";

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'api'>('general');

    // API State
    const [appKey, setAppKey] = useState("");
    const [secret, setSecret] = useState("");
    const [account, setAccount] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // 🔒 Hidden Admin Mode
    const [adminMode, setAdminMode] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [freeMode, setFreeMode] = useState(false);

    // Initialize state on client-side only
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setFreeMode(sessionStorage.getItem('admin_free_mode') === 'true');
        }
    }, []);

    const handleSecretClick = () => {
        const now = Date.now();
        // Reset if more than 2 seconds passed
        if (now - lastClickTime > 2000) {
            setClickCount(1);
        } else {
            setClickCount(prev => prev + 1);
        }
        setLastClickTime(now);

        // Activate admin mode on 7th click
        if (clickCount + 1 >= 7) {
            setAdminMode(true);
            setClickCount(0);
            setMsg({ type: 'success', text: '🔓 관리자 모드 활성화됨' });
            // Ensure we are on General tab to see the unexpected admin panel
            setActiveTab('general');
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

    const handleSaveApi = async () => {
        if (!appKey || !secret || !account) {
            setMsg({ type: 'error', text: '모든 필드를 입력해주세요.' });
            return;
        }

        setLoading(true);
        try {
            const keys = {
                kis_app_key: appKey,
                kis_secret: secret,
                kis_account: account,
                broker: "kis",
                savedAt: Date.now()
            };
            localStorage.setItem("user_kis_keys", JSON.stringify(keys));
            setMsg({ type: 'success', text: '보안 저장 완료! API 키는 오직 내 폰에만 저장됩니다.' });
        } catch (e) {
            setMsg({ type: 'error', text: '저장 오류 발생' });
        } finally {
            setLoading(false);
        }
    };

    // Check existing keys on mount
    useEffect(() => {
        const stored = localStorage.getItem("user_kis_keys");
        if (stored) {
            const parsed = JSON.parse(stored);
            setAppKey(parsed.kis_app_key || "");
            setSecret(parsed.kis_secret || "");
            setAccount(parsed.kis_account || "");
        }
    }, []);

    return (
        <div className="min-h-screen text-white pb-20">
            {/* Header: Click title for Secret Admin Mode */}
            <div onClick={handleSecretClick} className="cursor-default select-none">
                <Header title="설정" subtitle="앱 환경 설정 및 계좌 연동" />
            </div>

            <div className="max-w-2xl mx-auto p-6 space-y-6">

                {/* Tabs */}
                <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'general'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        일반 설정
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'api'
                            ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        API 연동
                    </button>
                </div>

                {/* Tab Content: General */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Admin Panel (Hidden by default) */}
                        {adminMode && (
                            <div className="rounded-3xl bg-gradient-to-br from-purple-900 to-black p-8 border border-purple-500/50 shadow-2xl shadow-purple-900/50">
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
                                        {freeMode && (
                                            <div className="mt-3 text-xs text-yellow-100 bg-yellow-500/10 p-2 rounded-lg">
                                                ✨ 무료 모드 활성화: API 호출 제한 없음, 모든 프리미엄 기능 사용 가능
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-black/40 p-4 rounded-xl border border-purple-500/20">
                                        <div className="text-sm text-purple-300 mb-2">시스템 상태</div>
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div><span className="text-gray-400">사용자:</span> <span className="text-white ml-2">{user?.email || 'Guest'}</span></div>
                                            <div><span className="text-gray-400">API URL:</span> <span className="text-white ml-2">{API_BASE_URL}</span></div>
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

                        {/* Default General Settings Content */}
                        <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-400" />
                                계정 정보
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl">
                                    <span className="text-gray-400">로그인 상태</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                        {user ? '로그인됨' : '게스트'}
                                    </span>
                                </div>
                                {user && (
                                    <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl">
                                        <span className="text-gray-400">이메일</span>
                                        <span className="text-white text-sm">{user.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 text-center text-gray-500 text-xs">
                            <p>StockTrend Pro v1.0.0</p>
                            <p className="mt-1">© 2026 Gemini Antigravity. All rights reserved.</p>
                            {/* Hint for Admin Mode */}
                            <p className="mt-4 opacity-10 hover:opacity-100 transition-opacity cursor-pointer">
                                (Secret: Click '설정' header 7 times)
                            </p>
                        </div>
                    </div>
                )}

                {/* Tab Content: API Connect */}
                {activeTab === 'api' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Intro Card */}
                        <div className="rounded-3xl bg-gradient-to-br from-green-900 to-black p-8 border border-white/10 shadow-xl relative overflow-hidden">
                            <ShieldCheck className="absolute top-0 right-0 w-32 h-32 text-green-500/10 -mr-4 -mt-4 rotate-12" />
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Key className="w-6 h-6 text-green-400" />
                                한국투자증권 (KIS) Open API
                            </h2>
                            <p className="text-gray-300 mb-6 leading-relaxed text-sm">
                                <span className="text-green-300 font-bold">내 API 키</span>를 입력하면,
                                내 계좌를 안전하게 연동하여 <br />초고속 실시간 시세와 트레이딩 기능을 사용할 수 있습니다.
                            </p>
                            <div className="bg-green-900/20 p-3 rounded-xl border border-green-500/30 flex items-start gap-3">
                                <AlertTriangle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-green-200 leading-relaxed">
                                    입력하신 키는 <strong>오직 내 기기(브라우저)에만 저장</strong>되며,
                                    서버로 전송될 때는 암호화된 채널을 통해 일시적으로만 사용됩니다.
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">App Key</label>
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition-colors"
                                    placeholder="한국투자증권 발급 App Key"
                                    value={appKey}
                                    onChange={e => setAppKey(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">App Secret</label>
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition-colors"
                                    placeholder="한국투자증권 발급 App Secret"
                                    value={secret}
                                    onChange={e => setSecret(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">계좌번호 (종합매매)</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition-colors"
                                    placeholder="예: 1234567801 (총 10자리)"
                                    value={account}
                                    onChange={e => setAccount(e.target.value)}
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleSaveApi}
                                    disabled={loading}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/40 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> 설정 저장하기</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {msg && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 fixed bottom-24 left-1/2 -translate-x-1/2 shadow-2xl z-50 min-w-[300px] justify-center ${msg.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        {msg.text}
                    </div>
                )}
            </div>
        </div>
    );
}
