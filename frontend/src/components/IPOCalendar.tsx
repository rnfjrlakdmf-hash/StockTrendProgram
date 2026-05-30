"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { Loader2, Megaphone, Bell, BellRing } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function IPOCalendar() {
    const [ipos, setIpos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [watchedIpos, setWatchedIpos] = useState<Set<string>>(new Set());
    const { user } = useAuth();

    const fetchWatched = async () => {
        try {
            const userId = user?.id || (user as any)?.uid || "guest";
            const res = await fetch(`${API_BASE_URL}/api/user/ipo_watchlist`, {
                headers: { "X-User-Id": userId }
            });
            const json = await res.json();
            if (json.status === "success") {
                setWatchedIpos(new Set(json.data));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchIPO = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/korea/ipo`);
            const json = await res.json();
            if (json.status === "success") {
                const mapped = json.data.map((item: any) => ({
                    ...item,
                    subscription_date: item.date,
                    fixed_price: item.price,
                    price_band: item.band || ""
                }));
                setIpos(mapped);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIPO();
        const interval = setInterval(fetchIPO, 60000); // 1분마다 갱신
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchWatched();
    }, [user]);

    const toggleWatchIPO = async (ipoName: string) => {
        const userId = user?.id || (user as any)?.uid || "guest";
        const isWatched = watchedIpos.has(ipoName);

        try {
            if (isWatched) {
                const res = await fetch(`${API_BASE_URL}/api/user/ipo_watchlist/${encodeURIComponent(ipoName)}`, {
                    method: "DELETE",
                    headers: { "X-User-Id": userId }
                });
                if (res.ok) {
                    const newSet = new Set(watchedIpos);
                    newSet.delete(ipoName);
                    setWatchedIpos(newSet);
                    alert(`${ipoName} 알림이 해제되었습니다.`);
                }
            } else {
                const res = await fetch(`${API_BASE_URL}/api/user/ipo_watchlist`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-Id": userId
                    },
                    body: JSON.stringify({ ipo_name: ipoName })
                });
                if (res.ok) {
                    const newSet = new Set(watchedIpos);
                    newSet.add(ipoName);
                    setWatchedIpos(newSet);
                    alert(`${ipoName} 알림이 등록되었습니다.`);
                }
            }
        } catch (e) {
            console.error(e);
            alert("알림 설정 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-purple-900/20 to-black p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-purple-400" /> 공모주(IPO) 일정
                </h2>
                <span className="text-xs text-gray-400">DART 제공</span>
            </div>

            {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-500" /></div>
            ) : ipos.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>예정된 공모주가 없습니다.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/10 text-gray-300 text-xs font-bold sticky top-0 backdrop-blur-md z-10">
                                <tr>
                                    <th className="p-3 whitespace-nowrap">종목명</th>
                                    <th className="p-3 whitespace-nowrap text-center">공모일정</th>
                                    <th className="p-3 whitespace-nowrap text-right">공모가(확정/희망)</th>
                                    <th className="p-3 whitespace-nowrap text-center">분석</th>
                                    <th className="p-3 whitespace-nowrap text-center">알림</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {ipos.map((ipo, idx) => {
                                    const isWatched = watchedIpos.has(ipo.name);
                                    return (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-3 font-bold text-white align-middle">
                                                {ipo.name}
                                            </td>
                                            <td className="p-3 text-gray-300 text-xs align-middle text-center font-mono">
                                                {ipo.subscription_date}
                                            </td>
                                            <td className="p-3 text-right align-middle">
                                                <div className="flex flex-col items-end gap-1">
                                                    {ipo.fixed_price && ipo.fixed_price !== "-" && (
                                                        <span className="text-red-400 font-bold font-mono text-xs bg-red-900/20 px-1.5 py-0.5 rounded">
                                                            {ipo.fixed_price}
                                                        </span>
                                                    )}
                                                    <span className="text-gray-400 font-mono text-[11px]">
                                                        {ipo.price_band}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center align-middle">
                                                <button
                                                    onClick={() => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(ipo.name + " 공모주")}`, '_blank')}
                                                    className="bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-1.5 rounded text-xs transition-colors whitespace-nowrap border border-white/5"
                                                >
                                                    정보
                                                </button>
                                            </td>
                                            <td className="p-3 text-center align-middle">
                                                <button
                                                    onClick={() => toggleWatchIPO(ipo.name)}
                                                    className={`p-2 rounded-full transition-colors ${
                                                        isWatched ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-gray-500 hover:text-gray-300'
                                                    }`}
                                                    title={isWatched ? "알림 해제" : "알림 받기"}
                                                >
                                                    {isWatched ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
