"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown, BarChart3, Search } from "lucide-react";

interface ShortData {
    symbol: string;
    name: string;
    short_volume: number;
    short_ratio: number;
    total_volume: number;
    change?: number;
    price?: number;
}

export default function ShortSellingPage() {
    const router = useRouter();
    const [data, setData] = useState<ShortData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchSymbol, setSearchSymbol] = useState("");
    const [singleResult, setSingleResult] = useState<any>(null);
    const [singleLoading, setSingleLoading] = useState(false);

    const fetchTopShorts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/short-selling/top`);
            const json = await res.json();
            if (json.status === "success") {
                setData(json.data || []);
            }
        } catch (err) {
            console.error("Short selling fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const searchShort = async () => {
        if (!searchSymbol) return;
        setSingleLoading(true);
        setSingleResult(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/short-selling/${searchSymbol}`);
            const json = await res.json();
            if (json.status === "success") {
                setSingleResult(json.data);
            }
        } catch (err) {
            console.error("Short search error:", err);
        } finally {
            setSingleLoading(false);
        }
    };

    useEffect(() => { fetchTopShorts(); }, []);

    const getRatioColor = (ratio: number) => {
        if (ratio >= 20) return "text-red-400";
        if (ratio >= 10) return "text-orange-400";
        if (ratio >= 5) return "text-yellow-400";
        return "text-gray-400";
    };

    const getRatioBar = (ratio: number) => {
        const width = Math.min(ratio, 40) / 40 * 100;
        let color = "bg-gray-600";
        if (ratio >= 20) color = "bg-red-500";
        else if (ratio >= 10) color = "bg-orange-500";
        else if (ratio >= 5) color = "bg-yellow-500";
        return { width: `${width}%`, color };
    };

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="공매도 모니터" subtitle="종목별 공매도 잔고 현황" />

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* Search */}
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="종목코드 입력 (예: 005930)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500 uppercase font-mono"
                            value={searchSymbol}
                            onChange={e => setSearchSymbol(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") searchShort(); }}
                        />
                    </div>
                    <button
                        onClick={searchShort}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-sm"
                    >
                        조회
                    </button>
                </div>

                {/* Single Result */}
                {singleLoading && (
                    <div className="text-center py-6 text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        조회 중...
                    </div>
                )}
                {singleResult && (
                    <div className="bg-gradient-to-br from-orange-900/20 to-black border border-orange-500/30 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black">{singleResult.name || searchSymbol}</h3>
                                <p className="text-gray-400 text-sm">{searchSymbol}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-2xl font-black ${getRatioColor(singleResult.short_ratio || 0)}`}>
                                    {(singleResult.short_ratio || 0).toFixed(2)}%
                                </span>
                                <p className="text-xs text-gray-500">공매도 비율</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white/5 rounded-xl p-3">
                                <p className="text-xs text-gray-500">공매도 잔고</p>
                                <p className="text-sm font-bold">{(singleResult.short_balance || 0).toLocaleString()}주</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3">
                                <p className="text-xs text-gray-500">공매도 거래량</p>
                                <p className="text-sm font-bold">{(singleResult.short_volume || 0).toLocaleString()}주</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3">
                                <p className="text-xs text-gray-500">총 거래량</p>
                                <p className="text-sm font-bold">{(singleResult.total_volume || 0).toLocaleString()}주</p>
                            </div>
                        </div>
                        {singleResult.history && singleResult.history.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-gray-400 mb-2">최근 추이</h4>
                                <div className="space-y-1">
                                    {singleResult.history.slice(0, 5).map((h: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                                            <span className="text-gray-400">{h.date}</span>
                                            <div className="flex-1 mx-4">
                                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${getRatioBar(h.ratio || 0).color} rounded-full transition-all`} style={{ width: getRatioBar(h.ratio || 0).width }} />
                                                </div>
                                            </div>
                                            <span className={`font-bold ${getRatioColor(h.ratio || 0)}`}>{(h.ratio || 0).toFixed(2)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Top List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                            공매도 비율 상위 종목
                        </h3>
                        <button onClick={fetchTopShorts} className="text-gray-400 hover:text-white">
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                            로딩 중...
                        </div>
                    ) : data.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">공매도 데이터를 불러올 수 없습니다.</p>
                    ) : (
                        <div className="space-y-2">
                            {data.map((item, i) => {
                                const bar = getRatioBar(item.short_ratio || 0);
                                return (
                                    <div
                                        key={i}
                                        className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/discovery?q=${item.symbol || item.name}`)}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-500 w-5 text-right">{i + 1}</span>
                                                <div>
                                                    <span className="font-bold text-sm">{item.name}</span>
                                                    <span className="text-xs text-gray-500 ml-2">{item.symbol}</span>
                                                </div>
                                            </div>
                                            <span className={`text-lg font-black ${getRatioColor(item.short_ratio || 0)}`}>
                                                {(item.short_ratio || 0).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                            <div className={`h-full ${bar.color} rounded-full transition-all`} style={{ width: bar.width }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                            <span>공매도 {(item.short_volume || 0).toLocaleString()}주</span>
                                            <span>전체 {(item.total_volume || 0).toLocaleString()}주</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] text-gray-600 mt-4">
                    * 공매도 데이터는 한국거래소(KRX) 기준이며, 전일 기준 데이터입니다.<br />
                    본 정보는 투자 참고용이며, 특정 종목의 매수·매도를 권유하지 않습니다.
                </p>
            </div>
        </div>
    );
}
