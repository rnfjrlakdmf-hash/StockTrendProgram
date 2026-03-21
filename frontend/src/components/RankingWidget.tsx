
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RankingWidget() {
    const router = useRouter();
    const [market, setMarket] = useState<'KR' | 'US'>('KR');
    const [data, setData] = useState<{ gainers: any[], losers: any[] }>({ gainers: [], losers: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        // Reset data immediately to prevent ghosting (showing KR data on US tab)
        setData({ gainers: [], losers: [] });

        const fetchRankings = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/rank/movers/${market}`);
                const json = await res.json();
                if (!ignore && json.status === "success") {
                    setData(json.data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchRankings();
        const interval = setInterval(fetchRankings, 10000); // 10s refresh

        return () => {
            ignore = true;
            clearInterval(interval);
        };
    }, [market]);

    const handleStockClick = (symbol: string) => {
        // Simple search via URL
        router.push(`/discovery?q=${encodeURIComponent(symbol)}`);
    };

    const formatPrice = (price: number) => {
        return Number(price).toLocaleString(undefined, {
            minimumFractionDigits: market === 'US' ? 2 : 0,
            maximumFractionDigits: market === 'US' ? 2 : 0
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Controls */}
            <div className="md:col-span-2 flex items-center justify-between">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setMarket('KR')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${market === 'KR' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        🇰🇷 국내 (KIS)
                    </button>
                    <button
                        onClick={() => setMarket('US')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${market === 'US' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        🇺🇸 미국 (Top10)
                    </button>
                </div>
                {/* Remove manual refresh button logic for now or keep generic */}
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>{loading ? '갱신 중...' : '실시간'}</span>
                </div>
            </div>

            {/* Gainers */}
            <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/20 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-lg">
                <h3 className="text-base md:text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> {market === 'US' ? '미국 대형주 상승' : '실시간 상승 (Top 5)'}
                </h3>
                <div className="space-y-3">
                    {data.gainers.length > 0 ? data.gainers.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleStockClick(item.symbol || item.name)}
                            className="cursor-pointer flex items-center justify-between p-3 rounded-xl bg-black/40 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`font-mono font-bold w-6 text-center ${idx === 0 ? 'text-yellow-400 text-lg' : 'text-gray-500'}`}>{idx + 1}</span>
                                <div>
                                    <div className="font-bold text-gray-200 group-hover:text-white text-xs md:text-sm truncate max-w-[120px] md:max-w-none">{item.name}</div>
                                    <div className="text-[10px] md:text-xs text-gray-500 font-mono">{item.symbol}</div>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-red-400 font-bold font-mono text-xs md:text-sm">
                                    ▲{String(item.change || '').replace(/[+%\-▲▼]/g, '')}%
                                </div>
                                <div className="text-gray-500 text-[10px] md:text-xs font-mono">
                                    {formatPrice(item.price)}{item.price_krw && <span className="text-blue-300 ml-1 text-[9px] md:text-[10px]">({item.price_krw}원)</span>}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-gray-500 py-8 text-sm flex flex-col items-center justify-center">
                            {loading ? <RefreshCw className="w-6 h-6 animate-spin mb-2 opacity-50" /> : null}
                            데이터 수신 중...
                        </div>
                    )}
                </div>
            </div>

            {/* Losers */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-lg">
                <h3 className="text-base md:text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" /> {market === 'US' ? '미국 대형주 하락' : '실시간 하락 (Bottom 5)'}
                </h3>
                <div className="space-y-3">
                    {data.losers.length > 0 ? data.losers.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleStockClick(item.symbol || item.name)}
                            className="cursor-pointer flex items-center justify-between p-3 rounded-xl bg-black/40 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`font-mono font-bold w-6 text-center ${idx === 0 ? 'text-blue-300 text-lg' : 'text-gray-500'}`}>{idx + 1}</span>
                                <div>
                                    <div className="font-bold text-gray-200 group-hover:text-white text-xs md:text-sm truncate max-w-[120px] md:max-w-none">{item.name}</div>
                                    <div className="text-[10px] md:text-xs text-gray-500 font-mono">{item.symbol}</div>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-blue-400 font-bold font-mono text-xs md:text-sm">
                                    ▼{String(item.change || '').replace(/[+%\-▲▼]/g, '')}%
                                </div>
                                <div className="text-gray-500 text-[10px] md:text-xs font-mono">
                                    {formatPrice(item.price)}{item.price_krw && <span className="text-blue-300 ml-1 text-[9px] md:text-[10px]">({item.price_krw}원)</span>}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-gray-500 py-8 text-sm flex flex-col items-center justify-center">
                            {loading ? <RefreshCw className="w-6 h-6 animate-spin mb-2 opacity-50" /> : null}
                            데이터 수신 중...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
