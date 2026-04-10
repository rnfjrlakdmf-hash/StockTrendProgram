import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { RefreshCw, TrendingUp, Search, DollarSign, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

type MarketType = 'KOSPI' | 'KOSDAQ' | 'USA' | 'CHINA' | 'HONG_KONG' | 'JAPAN' | 'VIETNAM';
type CategoryType = 'trading_volume' | 'trading_amount' | 'popular_search';

interface RankItem {
    rank: number;
    symbol: string;
    name: string;
    price: number | string;
    change_percent: number | string;
    volume?: number | string;
    amount?: number | string;
}

const MARKET_CONFIG: { id: MarketType; label: string; icon: string }[] = [
    { id: 'KOSPI', label: '국내', icon: '🇰🇷' },
    { id: 'USA', label: '미국', icon: '🇺🇸' },
    { id: 'CHINA', label: '중국', icon: '🇨🇳' },
    { id: 'HONG_KONG', label: '홍콩', icon: '🇭🇰' },
    { id: 'JAPAN', label: '일본', icon: '🇯🇵' },
    { id: 'VIETNAM', label: '베트남', icon: '🇻🇳' },
];

const CATEGORY_CONFIG: { id: CategoryType; label: string; icon: any }[] = [
    { id: 'trading_volume', label: '거래량 상위', icon: Activity },
    { id: 'trading_amount', label: '거래대금 상위', icon: DollarSign },
    { id: 'popular_search', label: '검색 상위', icon: Search },
];

export default function GlobalRankingWidget() {
    const router = useRouter();
    const [market, setMarket] = useState<MarketType>('KOSPI');
    const [loading, setLoading] = useState(false);
    const [rankData, setRankData] = useState<Record<CategoryType, RankItem[]>>({
        trading_volume: [],
        trading_amount: [],
        popular_search: [],
    });

    useEffect(() => {
        let ignore = false;

        const fetchAllCategories = async () => {
            setLoading(true);
            try {
                const results = await Promise.all(
                    CATEGORY_CONFIG.map(cat => 
                        fetch(`${API_BASE_URL}/api/rank/global?market=${market}&category=${cat.id}`)
                            .then(res => res.json())
                    )
                );

                if (!ignore) {
                    const newData: any = {};
                    CATEGORY_CONFIG.forEach((cat, idx) => {
                        newData[cat.id] = results[idx]?.data || [];
                    });
                    setRankData(newData);
                }
            } catch (e) {
                console.error("GlobalRankingWidget Fetch Error:", e);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchAllCategories();
        const interval = setInterval(fetchAllCategories, 30000); // 30s refresh

        return () => {
            ignore = true;
            clearInterval(interval);
        };
    }, [market]);

    const formatPrice = (price: any) => {
        if (!price || price === 0) return '-';
        return Number(price).toLocaleString(undefined, {
            maximumFractionDigits: market === 'KOSPI' ? 0 : 2
        });
    };

    const formatChange = (change: any) => {
        if (!change) return '0.00%';
        const val = typeof change === 'string' ? parseFloat(change) : change;
        const prefix = val > 0 ? '+' : '';
        return `${prefix}${val.toFixed(2)}%`;
    };

    const getChangeColor = (change: any) => {
        const val = typeof change === 'string' ? parseFloat(change) : change;
        if (val > 0) return 'text-red-500';
        if (val < 0) return 'text-blue-500';
        return 'text-gray-400';
    };

    const handleItemClick = (symbol: string, name: string) => {
        router.push(`/discovery?q=${encodeURIComponent(symbol || name)}`);
    };

    return (
        <div className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-2xl space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600/20 p-2.5 rounded-2xl border border-blue-500/30">
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">글로벌 실시간 랭킹</h2>
                        <p className="text-xs text-gray-500 mt-0.5">실시간 시장 인기 및 거래 현황</p>
                    </div>
                </div>

                {/* Market Selector */}
                <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 overflow-x-auto hide-scrollbar">
                    {MARKET_CONFIG.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMarket(m.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                market === m.id 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="text-base">{m.icon}</span>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {CATEGORY_CONFIG.map((cat) => (
                    <div key={cat.id} className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <cat.icon className="w-4 h-4 text-blue-400" />
                                <h3 className="text-sm font-bold text-gray-300">{cat.label}</h3>
                            </div>
                            {loading && (
                                <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />
                            )}
                        </div>

                        <div className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                            {rankData[cat.id].length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {rankData[cat.id].map((item, idx) => (
                                        <div
                                            key={`${item.symbol}-${idx}`}
                                            onClick={() => handleItemClick(item.symbol, item.name)}
                                            className="flex items-center justify-between p-4 hover:bg-white/5 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className={`w-6 text-center font-black italic ${
                                                    idx < 3 ? 'text-blue-500' : 'text-gray-600'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <div className="overflow-hidden">
                                                    <div className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors truncate">
                                                        {item.name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                        {item.symbol}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-sm font-bold text-gray-100 font-mono">
                                                    {formatPrice(item.price)}
                                                </div>
                                                <div className={`text-[11px] font-bold font-mono ${getChangeColor(item.change_percent)}`}>
                                                    {formatChange(item.change_percent)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3 opacity-40">
                                    <Activity className="w-8 h-8 text-gray-600" />
                                    <p className="text-xs text-gray-500">데이터가 없거나 장 휴장일 수 있습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer indicator */}
            <div className="flex justify-center md:justify-end">
                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                     <span className="text-[10px] font-bold text-blue-400">네이버 금융 라이브 파싱 가동 중</span>
                 </div>
            </div>
        </div>
    );
}
