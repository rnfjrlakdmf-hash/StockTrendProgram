"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Bell, BellRing, Trash2, Plus, CheckCircle, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface Alert {
    id: number;
    symbol: string;
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

    // New Alert Inputs
    const [symbol, setSymbol] = useState("");
    const [targetPrice, setTargetPrice] = useState("");
    const [condition, setCondition] = useState<'above' | 'below'>('above');
    const [adding, setAdding] = useState(false);

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/alerts`);
            const json = await res.json();
            if (json.status === "success") {
                // Triggered 된 것을 위로, 혹은 Active 위로? 보통 Active가 중요.
                // 여기서는 역순(최신순) 정렬
                const sorted = json.data.sort((a: any, b: any) => b.id - a.id);
                setAlerts(sorted);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 알림 체크 트리거 (Manual)
    const runCheck = async () => {
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/alerts/check`);
            await fetchAlerts(); // Re-fetch to see updates
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
        if (!symbol || !targetPrice) return;
        setAdding(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol.toUpperCase(),
                    target_price: parseFloat(targetPrice),
                    condition
                })
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

    const handleDelete = async (id: number) => {
        if (!confirm("삭제하시겠습니까?")) return;
        try {
            await fetch(`${API_BASE_URL}/api/alerts/${id}`, { method: 'DELETE' });
            setAlerts(alerts.filter(a => a.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="가격 알림 센터" subtitle="목표가 도달 시 즉시 알림" />

            <div className="p-6 max-w-4xl mx-auto space-y-8">
                {/* Input Card */}
                <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/20 p-6 shadow-xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <BellRing className="text-yellow-400" /> 새 알림 등록
                    </h3>
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

                        <div className="flex-1 w-full space-y-1">
                            <label className="text-xs text-gray-400 ml-1">조건 (Condition)</label>
                            <div className="flex bg-white/10 rounded-xl p-1 border border-white/10">
                                <button
                                    onClick={() => setCondition('above')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${condition === 'above' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <ArrowUp className="w-4 h-4" /> 이상 (Above)
                                </button>
                                <button
                                    onClick={() => setCondition('below')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${condition === 'below' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <ArrowDown className="w-4 h-4" /> 이하 (Below)
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

                        <button
                            onClick={handleAddAlert}
                            disabled={adding || !symbol || !targetPrice}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold h-[50px] flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            <Plus /> 등록
                        </button>
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
                                    <div className={`p-3 rounded-full ${alert.status === 'triggered' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {alert.status === 'triggered' ? <BellRing className="w-6 h-6 animate-bounce" /> : <Bell className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-bold">{alert.symbol}</span>
                                            {alert.status === 'triggered' && <span className="text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full">TRIGGERED</span>}
                                        </div>
                                        <div className="text-gray-400 text-sm mt-0.5">
                                            목표가 <span className="text-white font-mono font-bold">${alert.target_price}</span> 도달 시 알림
                                            <span className="mx-2 text-gray-600">|</span>
                                            조건: {alert.condition === 'above' ? '▲ 이상' : '▼ 이하'}
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
        </div>
    );
}
