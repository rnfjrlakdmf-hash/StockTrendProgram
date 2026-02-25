"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Bell, BellRing, Trash2, Plus, ArrowUp, ArrowDown, Crosshair, Zap, TrendingDown, TrendingUp } from "lucide-react";
import AdRewardModal from "@/components/AdRewardModal";
import { API_BASE_URL } from "@/lib/config";
import { isFreeModeEnabled } from "@/lib/adminMode";

interface Alert {
    id: number;
    symbol: string;
    type: string; // PRICE, RSI_OVERSOLD, GOLDEN_CROSS, PRICE_DROP
    target_price: number;
    condition: 'above' | 'below';
    status: 'active' | 'triggered';
    created_at: string;
    triggered_at?: string;
    triggered_price?: number;
}


export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [activeTab, setActiveTab] = useState<'price' | 'sniper'>('price');
    const [symbol, setSymbol] = useState("");

    // Price Alert State
    const [targetPrice, setTargetPrice] = useState("");
    const [condition, setCondition] = useState<'above' | 'below'>('above');

    // Sniper Alert State
    const [sniperType, setSniperType] = useState<string>("RSI_OVERSOLD");

    const [adding, setAdding] = useState(false);

    // Settings
    const [chatId, setChatId] = useState("");

    const [showSettings, setShowSettings] = useState(false);

    // Ad Reward State
    const [showAdModal, setShowAdModal] = useState(false);
    const [hasPaid, setHasPaid] = useState(false);

    useEffect(() => {
        const savedChatId = localStorage.getItem("telegram_chat_id");
        if (savedChatId) {
            setChatId(savedChatId);
        }
    }, []);

    const saveSettings = () => {
        if (chatId.trim()) {
            localStorage.setItem("telegram_chat_id", chatId.trim());
            alert("텔레그램 ID가 저장되었습니다.");
            setShowSettings(false);
        }
    };

    const saveSettings_Direct = (id: string) => {
        localStorage.setItem("telegram_chat_id", id);
        // Alert handled by caller for smoother flow
    };

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/alerts`);
            const json = await res.json();
            if (json.status === "success") {
                const sorted = json.data.sort((a: Alert, b: Alert) => b.id - a.id);
                setAlerts(sorted);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const runCheck = async () => {
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/alerts/check`);
            await fetchAlerts();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleAddAlert = async () => {
        if (!symbol) return;
        if (activeTab === 'price' && !targetPrice) return;



        // Check for Pro Mode (Only for Sniper Alerts)
        if (activeTab === 'sniper') {
            const isPro = localStorage.getItem("isPro") === "true";
            if (!isPro && !hasPaid && !isFreeModeEnabled()) {
                setShowAdModal(true);
                return;
            }
        }

        setAdding(true);

        const currentChatId = chatId || localStorage.getItem("telegram_chat_id");
        if (!currentChatId) {
            if (!confirm("텔레그램 Chat ID가 설정되지 않았습니다. 알림을 받으려면 설정이 필요합니다. 계속하시겠습니까? (설정 없이 등록하면 알림이 오지 않을 수 있습니다)")) {
                setShowSettings(true);
                return;
            }
        }

        try {
            // Determine Payload
            let payload: any = {
                symbol: symbol.toUpperCase(),
                chat_id: currentChatId
            };

            if (activeTab === 'price') {
                payload.alert_type = "PRICE";
                payload.target_price = parseFloat(targetPrice);
                payload.condition = condition;
            } else {
                // Sniper
                payload.alert_type = sniperType;
                payload.target_price = 0; // Not used
                payload.condition = "above"; // Dummy
            }

            const res = await fetch(`${API_BASE_URL}/api/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.status === "success") {
                setSymbol("");
                setTargetPrice("");
                fetchAlerts();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setAdding(false);
        }
    };

    const handleAdReward = () => {
        setHasPaid(true);
        setShowAdModal(false);
        setTimeout(handleAddAlert, 100);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("삭제하시겠습니까?")) return;
        try {
            await fetch(`${API_BASE_URL}/api/alerts/${id}`, { method: 'DELETE' });
            setAlerts(alerts.filter(a => a.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const getSniperLabel = (type: string) => {
        switch (type) {
            case "RSI_OVERSOLD": return "💎 RSI 과매도 (침체)";
            case "RSI_OVERBOUGHT": return "⚠️ RSI 과매수 (과열)";
            case "GOLDEN_CROSS": return "🚀 골든크로스 (5일>20일)";
            case "PRICE_DROP": return "📉 급락 발생 (-3%)";
            default: return type;
        }
    };

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="가격 알림 센터" subtitle="관심 종목 가격 변동 모니터링" />

            <AdRewardModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onReward={handleAdReward}
                featureName="Sniper Alert System"
            />

            <div className="p-6 max-w-4xl mx-auto space-y-8">
                {/* Introduction & Settings Toggle */}
                <div className="flex items-center justify-between bg-blue-900/20 p-4 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <BellRing className="w-5 h-5" />
                        </div>
                        <div className="text-sm text-blue-200">
                            <span className="font-bold">TIP:</span> 텔레그램 봇(@rnfjrlAlarm_bot)에 메시지를 보내 Chat ID를 획득하세요.
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg font-bold transition-colors"
                    >
                        {showSettings ? "설정 닫기" : "알림 설정 관리"}
                    </button>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">

                        {/* 1. Web Push Notification Setting */}
                        <div className="rounded-3xl bg-neutral-900 border border-white/10 p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2 mb-2">
                                        <BellRing className="w-5 h-5 text-blue-400" />
                                        실시간 웹 푸시 알림
                                        <span className="text-[10px] bg-blue-600 px-2 py-0.5 rounded text-white font-bold">권장</span>
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        앱을 켜두지 않아도 중요한 가격 변동을 브라우저 알림으로 즉시 받아볼 수 있습니다.<br />
                                        <span className="text-gray-500 text-xs">* PC/모바일 모두 지원</span>
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (confirm("실시간 가격 변동 알림을 활성화하시겠습니까?")) {
                                            const { requestFCMToken, showNotification } = await import("@/lib/firebase");
                                            const { API_BASE_URL } = await import("@/lib/config");
                                            try {
                                                const token = await requestFCMToken();
                                                if (token) {
                                                    const userId = localStorage.getItem('user_id') || 'guest';
                                                    await fetch(`${API_BASE_URL}/api/fcm/register`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
                                                        body: JSON.stringify({ token, device_type: 'web', device_name: navigator.userAgent })
                                                    });
                                                    localStorage.setItem('fcm_registered', 'true');
                                                    alert("✅ 알림이 성공적으로 설정되었습니다!");
                                                    showNotification("알림 테스트", { body: "이제 가격 변동 알림을 받을 수 있습니다." });
                                                } else {
                                                    alert("❌ 알림 권한이 차단되었습니다. 브라우저 설정에서 권한을 허용해주세요.");
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                alert("설정 중 오류가 발생했습니다.");
                                            }
                                        }
                                    }}
                                    className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/30 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    🔔 푸시 알림 켜기
                                </button>
                            </div>
                        </div>

                        {/* 2. Telegram Bot Setting */}
                        <div className="rounded-3xl bg-neutral-900 border border-white/10 p-6 shadow-xl">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-bold text-white mb-1 flex items-center justify-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-400" /> 텔레그램 연동
                                </h3>
                                <p className="text-gray-400 text-sm">텔레그램 메신저로도 알림을 동시에 받아보세요.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 relative">
                                {/* Step 1 */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center mb-4 text-2xl shadow-lg shadow-blue-600/30">
                                        1
                                    </div>
                                    <h4 className="font-bold text-lg mb-2">알림 봇 시작하기</h4>
                                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                        텔레그램 봇에게 말을 걸어야<br />알림을 보낼 수 있어요.
                                    </p>
                                    <a
                                        href="https://t.me/rnfjrlAlarm_bot"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all hover:scale-105 shadow-xl flex items-center justify-center gap-2"
                                    >
                                        🤖 봇 연결하고 '시작' 누르기
                                    </a>
                                    <p className="text-xs text-blue-300 mt-3 animate-pulse">
                                        * 앱이 열리면 하단의 <strong>시작(Start)</strong>을 꼭 눌러주세요!
                                    </p>
                                </div>

                                {/* Arrow for PC layout */}
                                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-600">
                                    <ArrowUp className="rotate-90 w-8 h-8" />
                                </div>

                                {/* Step 2 */}
                                <div className={`bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col items-center text-center transition-colors ${chatId ? 'border-green-500/50 bg-green-500/10' : 'hover:bg-white/10'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 text-2xl shadow-lg ${chatId ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                                        {chatId ? <Zap /> : "2"}
                                    </div>
                                    <h4 className="font-bold text-lg mb-2">
                                        {chatId ? "연결 성공!" : "내 연결 ID 가져오기"}
                                    </h4>
                                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                        {chatId ? "이제 알림을 받을 준비가 완료되었습니다." : "봇에게 메시지를 보낸 후 아래 버튼을 눌러주세요."}
                                    </p>

                                    {chatId ? (
                                        <div className="w-full py-3 rounded-xl bg-green-500/20 text-green-400 font-bold border border-green-500/30 flex items-center justify-center gap-2">
                                            ✅ 설정 완료됨
                                        </div>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`${API_BASE_URL}/api/telegram/recent-users`);
                                                    const json = await res.json();
                                                    if (json.status === "success" && json.data.length > 0) {
                                                        const user = json.data[0];
                                                        // Auto confirm for better UX if name matches logic or just show generic
                                                        setChatId(user.id);
                                                        saveSettings_Direct(user.id); // Helper function needed or duplicate logic
                                                        alert(`${user.name}님 환영합니다! 연결되었습니다.`);
                                                    } else {
                                                        alert("아직 봇에게 메시지가 도착하지 않았습니다. 1번 버튼을 눌러 '시작'을 먼저 눌러주세요!");
                                                    }
                                                } catch {
                                                    alert("서버 연결 실패");
                                                }
                                            }}
                                            className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
                                        >
                                            🔄 연결 확인하기 (자동)
                                        </button>
                                    )}

                                    {!chatId && (
                                        <button
                                            onClick={() => {
                                                const inputId = prompt("텔레그램 Chat ID를 알고 계신가요? 9~10자리 숫자를 입력해주세요.");
                                                if (inputId && inputId.trim()) {
                                                    setChatId(inputId.trim());
                                                    saveSettings_Direct(inputId.trim());
                                                }
                                            }}
                                            className="text-xs text-gray-500 mt-4 underline hover:text-gray-300"
                                        >
                                            이미 ID를 알고 계신가요? 직접 입력
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input Card */}
                <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/20 overflow-hidden shadow-xl">
                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('price')}
                            className={`flex-1 py-4 font-bold text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'price' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Bell className="w-4 h-4" /> 지정가 알림
                        </button>
                        <button
                            onClick={() => setActiveTab('sniper')}
                            className={`flex-1 py-4 font-bold text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'sniper' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Crosshair className="w-4 h-4" /> 스나이퍼 알림
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full space-y-1">
                                <label className="text-xs text-gray-400 ml-1">종목 코드/티커</label>
                                <input
                                    type="text"
                                    placeholder="ex: TSLA"
                                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                />
                            </div>

                            {activeTab === 'price' ? (
                                <>
                                    <div className="flex-1 w-full space-y-1">
                                        <label className="text-xs text-gray-400 ml-1">조건 (Condition)</label>
                                        <div className="flex bg-white/10 rounded-xl p-1 border border-white/10">
                                            <button
                                                onClick={() => setCondition('above')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${condition === 'above' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                <ArrowUp className="w-4 h-4" /> 이상
                                            </button>
                                            <button
                                                onClick={() => setCondition('below')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${condition === 'below' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                <ArrowDown className="w-4 h-4" /> 이하
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full space-y-1">
                                        <label className="text-xs text-gray-400 ml-1">목표 가격 ($)</label>
                                        <input
                                            type="number"
                                            placeholder="150.00"
                                            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                            value={targetPrice}
                                            onChange={(e) => setTargetPrice(e.target.value)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex-[2] w-full space-y-1">
                                    <label className="text-xs text-gray-400 ml-1">감지 패턴 (Signal)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setSniperType("RSI_OVERSOLD")}
                                            className={`p-2 rounded-xl border text-sm font-bold transition-all ${sniperType === "RSI_OVERSOLD" ? "bg-green-500/20 border-green-500 text-green-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                                        >
                                            💎 RSI 과매도
                                        </button>
                                        <button
                                            onClick={() => setSniperType("GOLDEN_CROSS")}
                                            className={`p-2 rounded-xl border text-sm font-bold transition-all ${sniperType === "GOLDEN_CROSS" ? "bg-purple-500/20 border-purple-500 text-purple-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                                        >
                                            🚀 골든크로스
                                        </button>
                                        <button
                                            onClick={() => setSniperType("RSI_OVERBOUGHT")}
                                            className={`p-2 rounded-xl border text-sm font-bold transition-all ${sniperType === "RSI_OVERBOUGHT" ? "bg-yellow-500/20 border-yellow-500 text-yellow-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                                        >
                                            ⚠️ RSI 과매수
                                        </button>
                                        <button
                                            onClick={() => setSniperType("PRICE_DROP")}
                                            className={`p-2 rounded-xl border text-sm font-bold transition-all ${sniperType === "PRICE_DROP" ? "bg-red-500/20 border-red-500 text-red-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                                        >
                                            📉 급락 포착
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleAddAlert}
                                disabled={adding || !symbol || (activeTab === 'price' && !targetPrice)}
                                className={`px-6 py-3 rounded-xl font-bold h-[54px] flex items-center gap-2 disabled:opacity-50 transition-colors w-full md:w-auto justify-center ${activeTab === 'sniper' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                            >
                                <Plus /> {activeTab === 'sniper' ? '감시 시작' : '등록'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">나의 알림 목록 ({alerts.length})</h3>
                        <button
                            onClick={runCheck}
                            className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-gray-300 transition-colors"
                        >
                            {loading ? "Checking..." : "🔄 지금 확인하기"}
                        </button>
                    </div>

                    {alerts.length === 0 && (
                        <div className="p-8 text-center text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            등록된 알림이 없습니다.
                        </div>
                    )}

                    <div className="grid gap-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className={`p-4 rounded-xl border flex items-center justify-between ${alert.status === 'triggered' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/40 border-white/10'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${alert.status === 'triggered' ? 'bg-yellow-500/20 text-yellow-400' :
                                        alert.type && alert.type !== "PRICE" ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                                        }`}>
                                        {alert.status === 'triggered' ? <BellRing className="w-6 h-6 animate-bounce" /> :
                                            alert.type && alert.type !== "PRICE" ? <Crosshair className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-bold">{alert.symbol}</span>
                                            {alert.status === 'triggered' && <span className="text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full">TRIGGERED</span>}
                                            {alert.type && alert.type !== "PRICE" && (
                                                <span className="text-xs bg-purple-500/30 text-purple-300 border border-purple-500/50 font-bold px-2 py-0.5 rounded-full">SNIPER</span>
                                            )}
                                        </div>
                                        <div className="text-gray-400 text-sm mt-0.5">
                                            {(!alert.type || alert.type === "PRICE") ? (
                                                <>
                                                    목표가 <span className="text-white font-mono font-bold">${alert.target_price}</span> 도달 시 알림
                                                    <span className="mx-2 text-gray-600">|</span>
                                                    조건: {alert.condition === 'above' ? '▲ 이상' : '▼ 이하'}
                                                </>
                                            ) : (
                                                <span className="text-white font-bold">{getSniperLabel(alert.type)}</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            생성일: {new Date(alert.created_at).toLocaleDateString()}
                                            {alert.status === 'triggered' && ` • 감지됨: ${new Date(alert.triggered_at!).toLocaleString()} (가격: $${alert.triggered_price})`}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(alert.id)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
}
