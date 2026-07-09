"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Smartphone, User, ExternalLink, CheckCircle, AlertTriangle, Zap, Eye, EyeOff, Trash2, ChevronDown, ChevronUp, BellRing } from "lucide-react";

export default function SettingsPage() {
    const { user, logout } = useAuth();

    // 🔒 Hidden Admin Mode
    const [adminMode, setAdminMode] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [freeMode, setFreeMode] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleDeleteAccount = async () => {
        if (!user || !user.id) return;
        
        const confirmDelete = window.confirm(
            "⚠️ 정말로 회원 탈퇴를 진행하시겠습니까?\n탈퇴 즉시 귀하의 계정 정보, 관심종목, 포트폴리오, 푸시 알림 토큰 등 모든 개인정보가 법에 따라 복구 불가능하게 영구 파기(DELETE)됩니다."
        );
        
        if (!confirmDelete) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ user_id: user.id }),
            });
            
            const data = await response.json();
            if (data.status === "success") {
                setMsg({ type: 'success', text: '🗑️ 회원 탈퇴가 완료되었습니다. 모든 개인정보가 영구 삭제되었습니다.' });
                setTimeout(() => {
                    logout();
                }, 2000);
            } else {
                setMsg({ type: 'error', text: data.message || '회원 탈퇴 처리 중 오류가 발생했습니다.' });
            }
        } catch (error) {
            console.error("Delete account error:", error);
            setMsg({ type: 'error', text: '서버 통신 오류로 회원 탈퇴에 실패했습니다.' });
        }
    };

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
    const [isNotifCollapsed, setIsNotifCollapsed] = useState(false);

    // [New] 알림 상태
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [prefs, setPrefs] = useState({
        pref_morning: true,
        pref_closing: true,
        pref_price: true,
        pref_breaking: true,
        pref_dividend: true,
        pref_ipo: true,
        pref_whale_alert: true,
        pref_insider_alert: true,
        pref_watchlist_live: true,
        pref_watch_compact: false,
    });

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

        // 알림 설정 불러오기
        const token = localStorage.getItem('fcm_token_value');
        if (token) {
            setFcmToken(token);
            fetch(`${API_BASE_URL}/api/system/fcm/preferences?token=${token}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        setPrefs(data.data);
                    }
                })
                .catch(err => console.error("Failed to fetch preferences:", err));
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

    const handleTogglePref = async (prefKey: keyof typeof prefs) => {
        if (!fcmToken) {
            setMsg({ type: 'error', text: '알림 토큰이 없습니다. 먼저 메인 화면에서 알림 권한을 허용해주세요.' });
            return;
        }
        
        // Optimistic update
        const newVal = !prefs[prefKey];
        setPrefs(prev => ({ ...prev, [prefKey]: newVal }));

        try {
            const updatedPrefs = { ...prefs, [prefKey]: newVal };
            const res = await fetch(`${API_BASE_URL}/api/system/fcm/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: fcmToken, ...updatedPrefs })
            });
            const data = await res.json();
            if (data.status !== 'success') throw new Error();
            setMsg({ type: 'success', text: '알림 설정이 변경되었습니다.' });
            setTimeout(() => setMsg(null), 2000);
        } catch (error) {
            // Revert on fail
            setPrefs(prev => ({ ...prev, [prefKey]: !newVal }));
            setMsg({ type: 'error', text: '네트워크 오류로 설정 변경에 실패했습니다.' });
        }
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
                    [New] KIS 시세 연동
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
                                        시세 연동
                                        {kisConnected && (
                                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-black tracking-widest">ACTIVE</span>
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
                                        <><CheckCircle className="w-4 h-4 shrink-0" /> 시세 연동이 활성화되어 있습니다. 해외주식도 즉시 체결가로 업데이트됩니다.</>
                                    ) : (
                                        <><AlertTriangle className="w-4 h-4 shrink-0" /> 현재 10초 간격 갱신 중입니다. 즉시 갱신하여 보고 싶으면 아래 단계를 진행하세요.</>
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
                                                title: '미국주식 무료 시세 신청',
                                                desc: '한국투자증권 앱 → 해외주식 메뉴에서 시세 신청 (완전 무료)',
                                                link: null,
                                                linkLabel: null,
                                                color: 'border-green-500/30 bg-green-500/5'
                                            },
                                            {
                                                step: '4',
                                                icon: '⚡',
                                                title: '아래 입력창에 키 입력 후 저장',
                                                desc: 'App Key, App Secret, 계좌번호 입력하면 즉시 연동 활성화',
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
                                        <Zap className="w-4 h-4" /> 저장하고 연동 활성화
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



                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    [New] 알림 설정 (PC에서도 쉽게 관리)
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="bg-white/5 rounded-3xl border border-white/10 shadow-xl overflow-hidden transition-all duration-300">
                    <div 
                        onClick={() => setIsNotifCollapsed(!isNotifCollapsed)}
                        className={`p-6 cursor-pointer select-none hover:bg-white/[0.02] active:bg-white/[0.04] transition-all flex items-center justify-between ${!isNotifCollapsed ? 'pb-3' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <BellRing className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">푸시 알림 설정</h3>
                                <p className="text-xs text-gray-400">마켓 브리핑, 세력 포착, 실시간 알림 관리</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isNotifCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                        </div>
                    </div>

                    {!isNotifCollapsed && (
                        <div className="p-6 pt-2 animate-in fade-in slide-in-from-top-3 duration-250">
                                <div className="space-y-4">
                                    {!fcmToken && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-bold text-red-400">알림 권한이 허용되지 않았습니다.</p>
                                                    <p className="text-xs text-red-300/80 mt-1">아래 알림을 켜려면 브라우저 권한을 허용해주세요.</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                            const { requestFCMToken } = await import('@/lib/firebase');
                                                            const token = await requestFCMToken();
                                                            if (token) {
                                                                localStorage.setItem('fcm_token_value', token);
                                                                setFcmToken(token);
                                                                
                                                                let uid = localStorage.getItem('uuid') || localStorage.getItem('user_id');
                                                                if (!uid) {
                                                                    uid = localStorage.getItem('guest_id');
                                                                    if (!uid) {
                                                                        uid = 'guest_' + Math.random().toString(36).substring(2, 15);
                                                                        localStorage.setItem('guest_id', uid);
                                                                    }
                                                                }
                                                                
                                                                await fetch(`${API_BASE_URL}/api/system/fcm-token`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ token: token, user_id: uid, source: 'settings_auto_prompt' })
                                                                });
                                                                window.location.reload();
                                                        } else {
                                                            alert('알림 권한이 차단되어 있습니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘을 눌러 알림 권한을 허용해주세요.');
                                                        }
                                                    } catch (e) {
                                                        console.error(e);
                                                        alert('알림 권한 요청 중 오류가 발생했습니다.');
                                                    }
                                                }}
                                                className="w-full sm:w-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors text-center"
                                            >
                                                권한 허용하기
                                            </button>
                                        </div>
                                    )}
                                    <div className="relative">
                                        {!fcmToken && (
                                            <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => alert('먼저 위의 [권한 허용하기] 버튼을 눌러주세요.')} />
                                        )}
                                        <div className={`space-y-2 ${!fcmToken ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {[
                                        { key: 'pref_morning', icon: '✨', title: 'AI 마켓 브리핑 (08:00)', desc: '장 시작 전 호재/악재 요약', activeColor: 'bg-green-500' },
                                        { key: 'pref_closing', icon: '☀️', title: '장시작/마감 리포트', desc: '시가/종가 및 수익 요약', activeColor: 'bg-green-500' },
                                        { key: 'pref_price', icon: '🚨', title: '가격 변동 알림', desc: '손절/익절 목표가 도달 즉시', activeColor: 'bg-green-500' },
                                        { key: 'pref_news', icon: '⚡', title: '관심종목 속보', desc: '중요 뉴스 및 공시 알림', activeColor: 'bg-green-500' },
                                        { key: 'pref_dividend', icon: '💰', title: '배당락일 알림', desc: '배당락일 전날 잊지 않게 미리', activeColor: 'bg-green-500' },
                                        { key: 'pref_ipo', icon: '🚀', title: '모든 공모주 전체 일정', desc: '공모주 청약/상장일 (개별종목은 해제)', activeColor: 'bg-green-500' },
                                        { key: 'pref_whale_alert', icon: '🐋', title: '세력/대주주 매집', desc: '단일판매, 증자, 5% 이상 대량 매집 포착', activeColor: 'bg-rose-500', isHighlight: true },
                                        { key: 'pref_insider_alert', icon: '🕵️', title: '내부자 거래 포착', desc: '임원/CEO 등 내부자 주식 매수/매도 실시간 포착', activeColor: 'bg-rose-500', isHighlight: true },
                                        { key: 'pref_watchlist_live', icon: '🎯', title: '내 관심종목 실시간 감시', desc: '찜한 종목의 장중 급등락(5%) 및 중요 속보', activeColor: 'bg-amber-500', isHighlight: true },
                                        { key: 'pref_watch_compact', icon: '⌚', title: '스마트워치 요약 모드', desc: '워치 화면에 최적화된 초단문 형태', activeColor: 'bg-indigo-500' },
                                    ].map((item) => {
                                        const prefKey = item.key as keyof typeof prefs;
                                        const isEnabled = prefs[prefKey];
                                        return (
                                            <div key={item.key} className="flex items-center justify-between p-3.5 bg-black/20 hover:bg-white/[0.02] border border-white/5 rounded-2xl transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="text-lg mt-0.5">{item.icon}</div>
                                                    <div>
                                                        <p className="text-white font-bold text-sm flex items-center gap-1.5">
                                                            {item.title}
                                                            {item.isHighlight && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">HOT</span>}
                                                        </p>
                                                        <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleTogglePref(prefKey)}
                                                    className={`relative w-14 h-8 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                                                        isEnabled 
                                                            ? (item.activeColor.includes('rose') ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.3)]' 
                                                                : item.activeColor.includes('amber') ? 'bg-gradient-to-r from-yellow-500 to-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.3)]'
                                                                : item.activeColor.includes('indigo') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]'
                                                                : 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]')
                                                            : 'bg-white/10 border border-white/10 hover:bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`absolute top-[3px] left-[3px] w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center ${
                                                        isEnabled ? 'translate-x-6' : 'translate-x-0'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isEnabled ? item.activeColor : 'bg-gray-400'}`}></div>
                                                    </div>
                                                </button>
                                            </div>
                                        );
                                    })}
                                        </div>
                                    </div>
                                </div>
                        </div>
                    )}
                </div>
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
                                <>
                                    <div className="flex justify-between items-center p-5 bg-black/20 rounded-2xl border border-white/5">
                                        <span className="text-gray-400 font-medium">연동 이메일</span>
                                        <span className="text-white text-sm font-bold">{user.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-5 bg-red-950/20 rounded-2xl border border-red-500/20 mt-2">
                                        <div className="flex flex-col">
                                            <span className="text-red-400 font-bold text-sm">회원 탈퇴</span>
                                            <span className="text-[10px] text-gray-500 mt-1">개인정보 및 관심종목 즉시 파기</span>
                                        </div>
                                        <button
                                            onClick={handleDeleteAccount}
                                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl text-xs font-black border border-red-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> 계정 영구 삭제
                                        </button>
                                    </div>
                                </>
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
                                    {
                                        name: "토스증권",
                                        color: "from-blue-500 to-blue-700",
                                        shadow: "shadow-blue-900/40",
                                        deepLink: "supertoss://invest",
                                        iosStore: "https://apps.apple.com/kr/app/id839333328",
                                        androidStore: "https://play.google.com/store/apps/details?id=viva.republica.toss",
                                        htsUrl: "https://tossinvest.com",
                                        webUrl: "https://tossinvest.com",
                                        label: "웹 트레이딩"
                                    },
                                    {
                                        name: "KB증권",
                                        color: "from-yellow-500 to-yellow-700",
                                        shadow: "shadow-yellow-900/40",
                                        deepLink: "kb-mable://",
                                        iosStore: "https://apps.apple.com/kr/app/id1372899048",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.kbsec.m_able",
                                        htsUrl: "https://m-able.kbsec.com/Mtradesub.do?cmd=TF01SP00100MU1",
                                        webUrl: "https://m-able.kbsec.com",
                                        label: "M-able"
                                    },
                                    {
                                        name: "미래에셋",
                                        color: "from-orange-500 to-red-600",
                                        shadow: "shadow-orange-900/40",
                                        deepLink: "miraeasset-mstock://",
                                        iosStore: "https://apps.apple.com/kr/app/id489213167",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.miraeasset.stock",
                                        htsUrl: "https://securities.miraeasset.com/hts/index.do",
                                        webUrl: "https://securities.miraeasset.com",
                                        label: "M-Stock"
                                    },
                                    {
                                        name: "나무증권",
                                        color: "from-[#C4E82F] to-[#A0C714]",
                                        textColor: "text-[#0A1A05]",
                                        shadow: "shadow-[#A0C714]/40",
                                        deepLink: "namuh://",
                                        iosStore: "https://apps.apple.com/kr/app/id1228853333",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.nhqv.namuh",
                                        htsUrl: "https://www.mynamuh.com",
                                        webUrl: "https://www.mynamuh.com",
                                        label: "나무"
                                    },
                                    {
                                        name: "삼성증권",
                                        color: "from-indigo-500 to-indigo-700",
                                        shadow: "shadow-indigo-900/40",
                                        deepLink: "samsungpop://",
                                        iosStore: "https://apps.apple.com/kr/app/id441266665",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.samsungpop.android",
                                        htsUrl: "https://www.samsungpop.com/trading/hts.do",
                                        webUrl: "https://www.samsungpop.com",
                                        label: "POP"
                                    },
                                    {
                                        name: "카카오페이증권",
                                        color: "from-amber-400 to-orange-500",
                                        shadow: "shadow-amber-900/40",
                                        deepLink: "kakaopay://",
                                        iosStore: "https://apps.apple.com/kr/app/id1514643599",
                                        androidStore: "https://play.google.com/store/apps/details?id=com.kakaopaycorp.securities",
                                        htsUrl: "https://securities.kakaopay.com",
                                        webUrl: "https://securities.kakaopay.com",
                                        label: "카카오페이"
                                    },
                                ].map((broker) => (
                                    <button
                                        key={broker.name}
                                        onClick={() => {
                                            const ua = navigator.userAgent;
                                            const isIOS = /iPhone|iPad|iPod/i.test(ua);
                                            const isAndroid = /Android/i.test(ua);
                                            const isMobile = isAndroid || isIOS;

                                            if (isMobile) {
                                                const isNativeApp = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;
                                                const storeUrl = isAndroid ? broker.androidStore : broker.iosStore;
                                                
                                                let targetUrl = broker.deepLink;
                                                
                                                // 일반 안드로이드 웹 브라우저일 때만 intent 스킴 사용 (Capacitor 환경은 기본 딥링크 사용)
                                                if (isAndroid && !isNativeApp) {
                                                    const packageName = broker.androidStore.split('id=')[1];
                                                    const fallbackUrl = encodeURIComponent(broker.androidStore);
                                                    const scheme = broker.deepLink.split('://')[0];
                                                    const hostAndPath = broker.deepLink.split('://')[1] || "";
                                                    targetUrl = `intent://${hostAndPath}#Intent;scheme=${scheme};package=${packageName};S.browser_fallback_url=${fallbackUrl};end`;
                                                }
                                                
                                                // Capacitor 및 모든 모바일 브라우저에서 가장 안정적으로 외부 앱(인텐트/딥링크)을 여는 표준 방법
                                                try {
                                                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                                                } catch (e) {
                                                    console.error("App open failed", e);
                                                    window.location.href = targetUrl;
                                                }
                                                
                                                // 앱 미설치 시 스토어로 이동시키는 타이머 폴백 (모바일 공통 적용)
                                                const start = Date.now();
                                                const t = setTimeout(() => {
                                                    if (Date.now() - start < 1800 && !document.hidden) {
                                                        window.location.href = storeUrl;
                                                    }
                                                }, 1200);

                                                const onVisibilityChange = () => {
                                                    if (document.hidden) {
                                                        clearTimeout(t);
                                                        document.removeEventListener('visibilitychange', onVisibilityChange);
                                                    }
                                                };
                                                document.addEventListener('visibilitychange', onVisibilityChange);

                                            } else {
                                                // PC: 웹 HTS 새 탭으로 오픈 & Best-effort 딥링크 시도 (Windows 11 안드로이드 앱 지원용 등)
                                                try {
                                                    const iframe = document.createElement('iframe');
                                                    iframe.style.display = 'none';
                                                    iframe.src = broker.deepLink;
                                                    document.body.appendChild(iframe);
                                                    setTimeout(() => {
                                                        if (document.body.contains(iframe)) {
                                                            document.body.removeChild(iframe);
                                                        }
                                                    }, 1000);
                                                } catch (e) {
                                                    console.error("Deep link trigger failed on PC", e);
                                                }
                                                window.open(broker.htsUrl, '_blank', 'noopener,noreferrer');
                                            }
                                        }}
                                        className={`bg-gradient-to-br ${broker.color} p-4 rounded-2xl ${broker.textColor || 'text-white'} font-black hover:scale-[1.04] active:scale-95 transition-all ${broker.shadow} shadow-lg flex flex-col items-center justify-center gap-1.5 border border-white/15 group min-h-[80px]`}
                                    >
                                        <span className="text-sm font-black">{broker.name}</span>
                                        <span className="text-[10px] font-medium opacity-70 flex items-center gap-1">
                                            <ExternalLink className="w-2.5 h-2.5" />
                                            {broker.label}
                                        </span>
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
                    <p className="text-gray-600 text-[10px] font-black tracking-widest uppercase">Sector Trend v2.9.10 (Compliance-Secure)</p>
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
