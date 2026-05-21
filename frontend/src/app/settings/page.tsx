"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Smartphone, User, ExternalLink, CheckCircle, AlertTriangle, Zap, Eye, EyeOff, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function SettingsPage() {
    const { user } = useAuth();

    // 🔒 Hidden Admin Mode
    const [adminMode, setAdminMode] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [freeMode, setFreeMode] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // [New] KIS API 키 상태
    const [kisAppKey, setKisAppKey] = useState('');
    const [kisSecret, setKisSecret] = useState('');
    const [kisAccount, setKisAccount] = useState('');
    const [showKeys, setShowKeys] = useState(false);
    const [kisGuideOpen, setKisGuideOpen] = useState(false);
    const [kisConnected, setKisConnected] = useState(false);
    const [isKisCollapsed, setIsKisCollapsed] = useState(true);
    const [isAccountCollapsed, setIsAccountCollapsed] = useState(true);
    const [isBrokersCollapsed, setIsBrokersCollapsed] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setFreeMode(sessionStorage.getItem('admin_free_mode') === 'true');
            // 저장된 KIS 키 불러오기 (sessionStorage: 탭 닫으면 자동 삭제)
            const stored = sessionStorage.getItem('user_kis_keys');
            if (stored) {
                try {
                    const keys = JSON.parse(stored);
                    setKisAppKey(keys.kis_app_key || '');
                    setKisSecret(keys.kis_secret || '');
                    setKisAccount(keys.kis_account || '');
                    setKisConnected(true);
                    setIsKisCollapsed(true); // 이미 연동되어 있다면 접어둡니다.
                } catch {}
            } else {
                setIsKisCollapsed(true); // 연동되어 있지 않아도 기본적으로 접은 상태로 유지합니다.
            }
        }
    }, []);

    const handleSaveKis = () => {
        if (!kisAppKey.trim() || !kisSecret.trim() || !kisAccount.trim()) {
            setMsg({ type: 'error', text: '모든 항목을 입력해 주세요.' });
            return;
        }
        const keys = {
            kis_app_key: kisAppKey.trim(),
            kis_secret: kisSecret.trim(),
            kis_account: kisAccount.trim(),
        };
        sessionStorage.setItem('user_kis_keys', JSON.stringify(keys));
        setKisConnected(true);
        setMsg({ type: 'success', text: '✅ KIS API 키가 저장되었습니다! 탭을 닫으면 자동 삭제됩니다.' });
        setTimeout(() => setMsg(null), 4000);
    };

    const handleClearKis = () => {
        sessionStorage.removeItem('user_kis_keys');
        setKisAppKey('');
        setKisSecret('');
        setKisAccount('');
        setKisConnected(false);
        setMsg({ type: 'success', text: '🗑️ KIS API 키가 삭제되었습니다.' });
        setTimeout(() => setMsg(null), 3000);
    };

    const handleHeaderClick = () => {
        const now = Date.now();
        if (now - lastClickTime > 2000) { setClickCount(1); }
        else { setClickCount(prev => prev + 1); }
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
        setMsg({ type: 'success', text: newMode ? '🎁 무료 모드 활성화! (앱 종료 시까지 유지)' : '무료 모드 비활성화됨' });
    };

    const maskKey = (key: string) => key ? key.substring(0, 6) + '••••••••••••••••••••' + key.slice(-4) : '';

    return (
        <div className="min-h-screen text-white pb-20">
            <div onClick={handleHeaderClick} className="cursor-default select-none">
                <Header title="설정" subtitle="앱 환경 설정" />
            </div>

            <div className="max-w-2xl mx-auto p-6 space-y-6">

                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    [New] KIS 실시간 시세 연동
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className={`rounded-3xl border shadow-xl transition-all duration-300 ${kisConnected
                    ? 'bg-gradient-to-br from-blue-950/60 to-purple-950/60 border-blue-500/40'
                    : 'bg-white/5 border-white/10'}`}>

                    {/* 헤더 (클릭 시 접기/펴기) */}
                    <div 
                        onClick={() => setIsKisCollapsed(!isKisCollapsed)}
                        className={`p-6 cursor-pointer select-none hover:bg-white/[0.02] active:bg-white/[0.04] transition-all rounded-3xl ${!isKisCollapsed ? 'pb-3' : ''}`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kisConnected ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                                    <Zap className={`w-5 h-5 ${kisConnected ? 'text-blue-400' : 'text-gray-500'}`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                                        실시간 시세 연동
                                        {kisConnected && (
                                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-black tracking-widest">LIVE</span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-gray-400">한국투자증권 OpenAPI</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${kisConnected ? 'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-gray-600'}`} />
                                {isKisCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                            </div>
                        </div>
                    </div>

                    {/* 접이식 본문 */}
                    {!isKisCollapsed && (
                        <div className="animate-in fade-in slide-in-from-top-3 duration-250">
                            {/* 상태 메시지 */}
                            <div className="px-6 pb-2">
                                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${kisConnected
                                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
                                    {kisConnected ? (
                                        <><CheckCircle className="w-4 h-4 shrink-0" /> 실시간 시세가 활성화되어 있습니다. 해외주식도 즉시 체결가로 업데이트됩니다.</>
                                    ) : (
                                        <><AlertTriangle className="w-4 h-4 shrink-0" /> 현재 10초 간격 갱신 중입니다. 실시간으로 보고 싶으면 아래 단계를 진행하세요.</>
                                    )}
                                </div>
                            </div>

                            {/* 4단계 가이드 (접이식) */}
                            <div className="px-6 pt-2">
                                <button
                                    onClick={() => setKisGuideOpen(!kisGuideOpen)}
                                    className="w-full flex items-center justify-between py-2 text-sm font-bold text-gray-300 hover:text-white transition-colors"
                                >
                                    <span>📋 연동 방법 보기 (4단계 · 무료)</span>
                                    {kisGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {kisGuideOpen && (
                                    <div className="pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {[
                                            {
                                                step: '1',
                                                icon: '🏦',
                                                title: '한국투자증권 계좌 개설',
                                                desc: '앱에서 5분이면 개설 완료. 계좌 개설 비용 없음',
                                                link: 'https://www.truefriend.com',
                                                linkLabel: '공식 홈페이지 →',
                                                color: 'border-blue-500/30 bg-blue-500/5'
                                            },
                                            {
                                                step: '2',
                                                icon: '🔑',
                                                title: 'OpenAPI 포털 가입 후 앱 등록',
                                                desc: 'App Key · App Secret 발급 (무료)',
                                                link: 'https://apiportal.koreainvestment.com',
                                                linkLabel: 'KIS Developers 바로가기 →',
                                                color: 'border-purple-500/30 bg-purple-500/5'
                                            },
                                            {
                                                step: '3',
                                                icon: '✅',
                                                title: '미국주식 실시간 시세 신청',
                                                desc: '한국투자증권 앱 → 해외주식 메뉴에서 실시간 시세 신청 (완전 무료)',
                                                link: null,
                                                linkLabel: null,
                                                color: 'border-green-500/30 bg-green-500/5'
                                            },
                                            {
                                                step: '4',
                                                icon: '⚡',
                                                title: '아래 입력창에 키 입력 후 저장',
                                                desc: 'App Key, App Secret, 계좌번호 입력하면 즉시 실시간 활성화',
                                                link: null,
                                                linkLabel: null,
                                                color: 'border-amber-500/30 bg-amber-500/5'
                                            },
                                        ].map((item) => (
                                            <div key={item.step} className={`flex gap-3 p-3 rounded-xl border ${item.color}`}>
                                                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-black text-white shrink-0">
                                                    {item.step}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                                        <span>{item.icon}</span> {item.title}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
                                                    {item.link && (
                                                        <a
                                                            href={item.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1 font-bold"
                                                        >
                                                            {item.linkLabel} <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 키 입력 폼 */}
                            <div className="px-6 pb-6 pt-2 space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-gray-400">API 키 입력</span>
                                    <button
                                        onClick={() => setShowKeys(!showKeys)}
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
                                    >
                                        {showKeys ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        {showKeys ? '숨기기' : '표시'}
                                    </button>
                                </div>

                                {[
                                    { label: 'App Key', value: kisAppKey, setter: setKisAppKey, placeholder: 'P-xxxxxxxxxxxxxxxx...' },
                                    { label: 'App Secret', value: kisSecret, setter: setKisSecret, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx...' },
                                    { label: '계좌번호', value: kisAccount, setter: setKisAccount, placeholder: '50123456-01 (대시 포함 또는 숫자만)' },
                                ].map((field) => (
                                    <div key={field.label}>
                                        <label className="text-[11px] text-gray-500 font-bold mb-1 block">{field.label}</label>
                                        <input
                                            type={showKeys ? 'text' : 'password'}
                                            value={field.value}
                                            onChange={(e) => field.setter(e.target.value)}
                                            placeholder={field.placeholder}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 font-mono"
                                        />
                                    </div>
                                ))}

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={handleSaveKis}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                                    >
                                        <Zap className="w-4 h-4" /> 저장하고 실시간 활성화
                                    </button>
                                    {kisConnected && (
                                        <button
                                            onClick={handleClearKis}
                                            className="px-4 py-2.5 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-xl text-sm border border-red-500/20 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <p className="text-[10px] text-gray-600 text-center">
                                    🔒 API 키는 이 브라우저 세션에만 저장됩니다 (탭 닫으면 자동 삭제 · 서버 미전송)
                                </p>
                            </div>
                        </div>
                    )}
                </div>



                
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
                <div className="bg-white/5 rounded-3xl border border-white/10 shadow-xl overflow-hidden transition-all duration-300">
                    <div 
                        onClick={() => setIsAccountCollapsed(!isAccountCollapsed)}
                        className={`p-6 cursor-pointer select-none hover:bg-white/[0.02] active:bg-white/[0.04] transition-all flex items-center justify-between ${!isAccountCollapsed ? 'pb-3' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">계정 정보</h3>
                                <p className="text-xs text-gray-400">로그인 상태 및 연동 계정</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isAccountCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                        </div>
                    </div>

                    {!isAccountCollapsed && (
                        <div className="p-6 pt-2 space-y-4 animate-in fade-in slide-in-from-top-3 duration-250">
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
                    )}
                </div>

                {/* Broker Quick Links */}
                <div className="bg-white/5 rounded-3xl border border-white/10 shadow-xl overflow-hidden transition-all duration-300">
                    <div 
                        onClick={() => setIsBrokersCollapsed(!isBrokersCollapsed)}
                        className={`p-6 cursor-pointer select-none hover:bg-white/[0.02] active:bg-white/[0.04] transition-all flex items-center justify-between ${!isBrokersCollapsed ? 'pb-3' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                <Smartphone className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">증권사 앱 바로가기</h3>
                                <p className="text-xs text-gray-400">자주 사용하는 증권사 빠른 연결</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isBrokersCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                        </div>
                    </div>

                    {!isBrokersCollapsed && (
                        <div className="p-6 pt-2 animate-in fade-in slide-in-from-top-3 duration-250">
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
                    )}
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
