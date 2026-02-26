"use client";

import { useState, useEffect } from "react";
import { Bell, TrendingDown, TrendingUp, Target, X, Clock, Check } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface Alert {
    id: number;
    symbol: string;
    type: string;
    buy_price?: number;
    threshold?: number;
    target_price?: number;
    quantity?: number;
    active: boolean;
    created_at: string;
    triggered_at?: string;
}

export default function PriceAlertList() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAlerts();
        loadHistory();

        // 30초마다 새로고침
        const interval = setInterval(() => {
            loadAlerts();
            loadHistory();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadAlerts = async () => {
        try {
            const userId = localStorage.getItem("user_id") || "guest";
            const res = await fetch(`${API_BASE_URL}/api/alerts/price/list?active_only=true`, {
                headers: { "X-User-Id": userId }
            });
            const data = await res.json();

            if (data.status === "success") {
                setAlerts(data.alerts);
            }
        } catch (e) {
            console.error("Failed to load alerts", e);
        }
    };

    const loadHistory = async () => {
        try {
            const userId = localStorage.getItem("user_id") || "guest";
            const res = await fetch(`${API_BASE_URL}/api/alerts/price/history?limit=20`, {
                headers: { "X-User-Id": userId }
            });
            const data = await res.json();

            if (data.status === "success") {
                setHistory(data.history);
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    const deleteAlert = async (alertId: number) => {
        if (!confirm("이 알림을 삭제하시겠습니까?")) return;

        try {
            const userId = localStorage.getItem("user_id") || "guest";
            const res = await fetch(`${API_BASE_URL}/api/alerts/price/${alertId}`, {
                method: "DELETE",
                headers: { "X-User-Id": userId }
            });
            const data = await res.json();

            if (data.status === "success") {
                loadAlerts();
            }
        } catch (e) {
            console.error("Failed to delete alert", e);
        }
    };

    const getAlertIcon = (type: string) => {
        if (type === 'stop_loss') return <TrendingDown className="w-5 h-5 text-red-400" />;
        if (type === 'take_profit') return <TrendingUp className="w-5 h-5 text-green-400" />;
        return <Target className="w-5 h-5 text-blue-400" />;
    };

    const getAlertLabel = (type: string) => {
        if (type === 'stop_loss') return '손절';
        if (type === 'take_profit') return '익절';
        return '목표가';
    };

    const getAlertColor = (type: string) => {
        if (type === 'stop_loss') return 'border-red-500/30 bg-red-500/10';
        if (type === 'take_profit') return 'border-green-500/30 bg-green-500/10';
        return 'border-blue-500/30 bg-blue-500/10';
    };

    return (
        <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">가격 알림</h3>
                </div>

                {/* Tab Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        활성 ({alerts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        히스토리
                    </button>
                </div>
            </div>

            {/* Active Alerts */}
            {activeTab === 'active' && (
                <div className="space-y-3">
                    {alerts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>활성 알림이 없습니다</p>
                        </div>
                    ) : (
                        alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`border rounded-xl p-4 ${getAlertColor(alert.type)}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        {getAlertIcon(alert.type)}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-white">{alert.symbol}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                                                    {getAlertLabel(alert.type)}
                                                </span>
                                            </div>

                                            {alert.type === 'target_price' ? (
                                                <p className="text-sm text-gray-300">
                                                    목표가: ₩{alert.target_price?.toLocaleString()}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-300">
                                                    기준가: ₩{alert.buy_price?.toLocaleString()} |
                                                    조건: {alert.threshold}%
                                                </p>
                                            )}

                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(alert.created_at).toLocaleString('ko-KR')}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => deleteAlert(alert.id)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-all"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Check className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>알림 히스토리가 없습니다</p>
                        </div>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                className="border border-white/10 bg-white/5 rounded-xl p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-white font-medium mb-1">{item.message}</p>
                                        <p className="text-sm text-gray-400">
                                            {item.symbol} |
                                            현재가: ₩{item.current_price?.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(item.triggered_at).toLocaleString('ko-KR')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
