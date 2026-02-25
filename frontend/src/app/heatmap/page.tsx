"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
import { RefreshCw, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface SectorItem {
    name: string;
    change: number;
    volume?: number;
    stocks?: any[];
}

interface HeatmapItem {
    name: string;
    change: number;
    market_cap?: number;
}

export default function HeatmapPage() {
    const router = useRouter();
    const [sectors, setSectors] = useState<SectorItem[]>([]);
    const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"sectors" | "themes">("sectors");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [secRes, heatRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/korea/sectors`),
                fetch(`${API_BASE_URL}/api/korea/heatmap`)
            ]);
            const secJson = await secRes.json();
            const heatJson = await heatRes.json();

            if (secJson.status === "success") {
                setSectors(secJson.data?.top_sectors || []);
            }
            if (heatJson.status === "success") {
                setHeatmap(heatJson.data || []);
            }
        } catch (err) {
            console.error("Heatmap fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const getColor = (change: number) => {
        if (change >= 3) return "bg-red-500";
        if (change >= 1.5) return "bg-red-600/80";
        if (change >= 0.5) return "bg-red-700/60";
        if (change > 0) return "bg-red-900/40";
        if (change === 0) return "bg-gray-700";
        if (change > -0.5) return "bg-blue-900/40";
        if (change > -1.5) return "bg-blue-700/60";
        if (change > -3) return "bg-blue-600/80";
        return "bg-blue-500";
    };

    const getTextColor = (change: number) => {
        if (Math.abs(change) >= 1.5) return "text-white";
        return "text-gray-300";
    };

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="섹터 히트맵" subtitle="산업별 실시간 등락 현황" />

            <div className="max-w-6xl mx-auto p-4 space-y-6">
                {/* Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setView("sectors")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === "sectors" ? "bg-gradient-to-r from-red-600 to-orange-600 text-white" : "text-gray-400"}`}
                        >
                            업종별
                        </button>
                        <button
                            onClick={() => setView("themes")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === "themes" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : "text-gray-400"}`}
                        >
                            테마별
                        </button>
                    </div>
                    <button onClick={fetchData} className="p-2 text-gray-400 hover:text-white">
                        <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-16">
                        <RefreshCw className="w-10 h-10 animate-spin mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-500">히트맵 데이터 로딩 중...</p>
                    </div>
                ) : view === "sectors" ? (
                    <>
                        {/* Color Legend */}
                        <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
                            <span className="w-6 h-3 bg-blue-500 rounded" /> -3%이하
                            <span className="w-6 h-3 bg-blue-700/60 rounded ml-2" /> -1.5%
                            <span className="w-6 h-3 bg-gray-700 rounded ml-2" /> 0%
                            <span className="w-6 h-3 bg-red-700/60 rounded ml-2" /> +1.5%
                            <span className="w-6 h-3 bg-red-500 rounded ml-2" /> +3%이상
                        </div>

                        {/* Treemap Grid */}
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {sectors.map((sector, i) => {
                                const change = typeof sector.change === "number" ? sector.change : parseFloat(String(sector.change || "0").replace(/[^0-9.-]/g, ""));
                                return (
                                    <div
                                        key={i}
                                        className={`${getColor(change)} rounded-2xl p-4 flex flex-col items-center justify-center min-h-[100px] hover:scale-105 transition-transform cursor-pointer border border-white/10`}
                                    >
                                        <span className={`font-bold text-sm text-center ${getTextColor(change)}`}>
                                            {sector.name}
                                        </span>
                                        <span className={`text-lg font-black mt-1 ${change >= 0 ? "text-red-200" : "text-blue-200"}`}>
                                            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {sectors.length === 0 && (
                            <p className="text-center text-gray-500 py-8">섹터 데이터를 불러올 수 없습니다.</p>
                        )}

                        {/* Top/Bottom Sectors */}
                        {sectors.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-4">
                                    <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> 상승 TOP 5
                                    </h4>
                                    {[...sectors].sort((a, b) => (b.change || 0) - (a.change || 0)).slice(0, 5).map((s, i) => (
                                        <div key={i} className="flex justify-between py-1.5 text-sm">
                                            <span className="text-gray-300">{i + 1}. {s.name}</span>
                                            <span className="text-red-400 font-bold">+{(s.change || 0).toFixed(2)}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4">
                                    <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4" /> 하락 TOP 5
                                    </h4>
                                    {[...sectors].sort((a, b) => (a.change || 0) - (b.change || 0)).slice(0, 5).map((s, i) => (
                                        <div key={i} className="flex justify-between py-1.5 text-sm">
                                            <span className="text-gray-300">{i + 1}. {s.name}</span>
                                            <span className="text-blue-400 font-bold">{(s.change || 0).toFixed(2)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Themes View */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {(Array.isArray(heatmap) ? heatmap : []).map((item, i) => {
                            const change = typeof item.change === "number" ? item.change : parseFloat(String(item.change || "0").replace(/[^0-9.-]/g, ""));
                            return (
                                <div
                                    key={i}
                                    className={`${getColor(change)} rounded-xl p-3 flex flex-col items-center justify-center min-h-[80px] hover:scale-105 transition-transform cursor-pointer border border-white/5`}
                                    onClick={() => router.push(`/theme?q=${encodeURIComponent(item.name)}`)}
                                >
                                    <span className={`font-bold text-xs text-center leading-tight ${getTextColor(change)}`}>
                                        {item.name}
                                    </span>
                                    <span className={`text-sm font-black mt-0.5 ${change >= 0 ? "text-red-200" : "text-blue-200"}`}>
                                        {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                                    </span>
                                </div>
                            );
                        })}
                        {(!Array.isArray(heatmap) || heatmap.length === 0) && (
                            <p className="col-span-full text-center text-gray-500 py-8">테마 데이터를 불러올 수 없습니다.</p>
                        )}
                    </div>
                )}

                <p className="text-center text-[10px] text-gray-600 mt-4">
                    * 데이터는 네이버 금융 기준이며, 실시간 시세와 차이가 있을 수 있습니다.
                </p>
            </div>
        </div>
    );
}
