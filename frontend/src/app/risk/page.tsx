"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import GaugeChart from "@/components/GaugeChart";
import { ShieldAlert, AlertOctagon, TrendingDown, Bell, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface AlertItem {
    name: string;
    alertType: string;
    message: string;
    level: string;
    time: string;
}

interface RiskMetrics {
    volatility: string;
    safe_score: number;
    alert_count: number;
}

export default function RiskPage() {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRiskData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/risk`);
                const json = await res.json();
                if (json.status === "success") {
                    setAlerts(json.data.alerts);
                    setMetrics(json.data.metrics);
                }
            } catch (err) {
                console.error("Risk API Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRiskData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen text-white flex flex-col">
                <Header title="위험 관리 (Risk Guard)" subtitle="잠재적 위험 요소를 분석 중입니다..." />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-red-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="위험 관리 (Risk Guard)" subtitle="변동성 모니터링 및 포트폴리오 보호" />

            <div className="p-6 max-w-7xl mx-auto space-y-8">

                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="rounded-3xl bg-red-900/40 border border-red-500/30 p-6 flex items-center gap-4 shadow-lg">
                        <div className="p-3 bg-red-500/20 rounded-xl text-red-500">
                            <AlertOctagon className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-300 font-medium">활성 경고 (Alerts)</div>
                            <div className="text-3xl font-bold text-white">{metrics?.alert_count || 0}</div>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-yellow-900/40 border border-yellow-500/30 p-6 flex items-center gap-4 shadow-lg">
                        <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-500">
                            <TrendingDown className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-300 font-medium">포트폴리오 평균 변동성</div>
                            <div className="text-3xl font-bold text-white">{metrics?.volatility || "0%"}</div>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-blue-900/40 border border-blue-500/30 p-6 flex items-center gap-4 shadow-lg">
                        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-500">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-300 font-medium">안전 점수</div>
                            <div className="text-3xl font-bold text-white">{metrics?.safe_score || 100}/100</div>
                        </div>
                    </div>
                </div>

                {/* Main Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Watchlist Alerts */}
                    <div className="rounded-3xl bg-black/40 border border-white/20 p-6 shadow-lg">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                            <Bell className="w-5 h-5 text-red-400" /> 감지된 위험 요소
                        </h3>

                        <div className="space-y-4">
                            {alerts.length > 0 ? alerts.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors">
                                    <div className={`w-2 h-12 rounded-full ${item.level === 'Critical' ? 'bg-red-500' :
                                        item.level === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
                                        }`} />
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <h4 className="font-bold text-lg text-white">{item.name}</h4>
                                            <span className="text-xs text-gray-400 font-medium">{item.time}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.level === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                                                }`}>
                                                {item.alertType}
                                            </span>
                                            <span className="text-sm text-gray-300 font-medium">{item.message}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-gray-400">
                                    <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>현재 감지된 위험 요소가 없습니다.</p>
                                    <p className="text-xs mt-2">안전한 상태입니다!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Portfolio Health Gauge */}
                    <div className="rounded-3xl bg-black/40 border border-white/20 p-6 flex flex-col items-center justify-center text-center shadow-lg">
                        <h3 className="text-xl font-bold mb-2 text-white">포트폴리오 안전 진단</h3>
                        <p className="text-sm text-gray-300 mb-8 font-medium">변동성과 기술적 지표(RSI)를 기반으로 분석</p>

                        <div className="scale-125 mb-8">
                            <GaugeChart
                                score={metrics?.safe_score || 100}
                                label="안전성 (Stability)"
                                subLabel=""
                                color={metrics && metrics.safe_score < 70 ? "#ef4444" : "#10b981"}
                            />
                        </div>

                        <div className="max-w-xs text-sm text-gray-300 font-medium">
                            {metrics && metrics.safe_score < 50 ? (
                                <span className="text-red-400">주의가 필요합니다. 일부 종목의 변동성이 매우 크거나 과열 상태입니다.</span>
                            ) : metrics && metrics.safe_score < 80 ? (
                                <span className="text-yellow-400">약간의 위험이 감지됩니다. 모니터링을 지속하세요.</span>
                            ) : (
                                <span className="text-green-400">포트폴리오가 매우 안정적입니다.</span>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
