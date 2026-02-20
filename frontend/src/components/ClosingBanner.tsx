"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Clock, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

export default function ClosingBanner() {
    const [visible, setVisible] = useState(false);
    const [data, setData] = useState<any[]>([]);
    const [marketType, setMarketType] = useState("");

    useEffect(() => {
        const checkClosing = async () => {
            // 1. Check Time (Is Market Closed?)
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay(); // 0: Sun, 6: Sat

            // Skip weekends
            if (day === 0 || day === 6) return;

            let isClosed = false;
            let type = "";

            // KR Market: Closed after 15:40
            if (hour >= 16) {
                isClosed = true;
                type = "KR";
            }
            // US Market: Closed after 06:00 (approx)
            // (Simulate for demo: Always show if requested, or logic)
            // For logic: if (hour >= 6 && hour < 9) ... 

            // For User Request: "장마감할때 얼마로 마감되었는지 알려주게"
            // Let's force check if we haven't shown it today
            const todayStr = now.toISOString().split('T')[0];
            const lastShown = localStorage.getItem("closingBannerShownDate");

            if (isClosed && lastShown !== todayStr) {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/watchlist/closing-summary`);
                    const json = await res.json();

                    if (json.status === "success" && json.data.length > 0) {
                        setData(json.data);
                        setMarketType(type);
                        setVisible(true);
                    }
                } catch (e: any) {
                    console.warn("[ClosingBanner] Failed to fetch closing summary (backend might be offline):", e.message || e);
                }
            }
        };

        // Check immediately on mount, then every minute
        checkClosing();
        const interval = setInterval(checkClosing, 60000);

        return () => clearInterval(interval);
    }, []);

    const handleClose = () => {
        setVisible(false);
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem("closingBannerShownDate", todayStr);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-[#111] border border-white/20 rounded-2xl shadow-2xl p-0 overflow-hidden w-80 md:w-96">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-400" />
                        <span className="font-bold text-white text-sm">Today's Closing Report</span>
                    </div>
                    <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-80 overflow-y-auto">
                    <p className="text-xs text-gray-400 mb-3">
                        관심 종목의 오늘 장 마감 시세입니다.
                    </p>

                    <div className="space-y-3">
                        {data.map((item, idx) => {
                            const isPlus = item.change && item.change.startsWith('+');
                            const colorClass = isPlus ? "text-red-400" : "text-blue-400";
                            const Icon = isPlus ? TrendingUp : TrendingDown;

                            return (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div>
                                        <div className="font-bold text-sm text-gray-200">{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.symbol}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-white">
                                            {item.currency === 'KRW' ? '₩' : '$'}{item.price}
                                        </div>
                                        <div className={`text-xs flex items-center justify-end gap-1 ${colorClass}`}>
                                            <Icon className="w-3 h-3" />
                                            {item.change}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={handleClose} className="w-full mt-4 py-2 rounded-lg bg-white/10 text-xs font-bold text-gray-400 hover:bg-white/20 transition-colors flex items-center justify-center gap-1">
                        확인 완료 <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
