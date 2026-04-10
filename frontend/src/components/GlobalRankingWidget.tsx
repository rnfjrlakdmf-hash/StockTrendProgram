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
    price_krw?: string;
    currency_symbol?: string;
    change_val?: number | string;
    change_percent: number | string;
    risefall?: string | number;
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

    // [TurboQuant Precision Formatter]
    const formatPrice = (item: RankItem) => {
        const { price, currency_symbol } = item;
        if (!price || price === 0 || price === '-') return '-';
        
        let decimals = 2; // Default (USA)
        if (market === 'KOSPI') decimals = 0;
        else if (market === 'CHINA' || market === 'HONG_KONG') decimals = 3;
        else if (market === 'JAPAN') decimals = 1;
        else if (market === 'VIETNAM') decimals = 0;

        const num = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : Number(price);
        
        if (Number.isNaN(num)) return '-';

        const formatted = num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
        
        // Match screenshot prefix (HK$ uses concatenated style, others space)
        const prefix = market === 'HONG_KONG' ? 'HK$' : (currency_symbol || '');
        return `${prefix}${formatted}`;
    };

    const getRiseFallInfo = (item: RankItem) => {
        const { risefall, change_val, change_percent } = item;
        const val = typeof change_percent === 'string' ? parseFloat(change_percent) : change_percent;
        const abs_val = typeof change_val === 'string' ? parseFloat(change_val) : change_val;
        
        let color = 'text-gray-400';
        let icon = '';
        
        // Naver use specific codes if available
        const rfCode = String(risefall);
        if (rfCode === '2' || rfCode === '3' || val > 0) {
            color = 'text-[#f23c3c]'; // Naver Red
            icon = '▲';
        } else if (rfCode === '5' || rfCode === '6' || val < 0) {
            color = 'text-[#3c78f2]'; // Naver Blue
            icon = '▼';
        }

        const abs_str = abs_val ? Math.abs(Number(abs_val)).toLocaleString(undefined, { 
            minimumFractionDigits: (market === 'KOSPI' || market === 'VIETNAM') ? 0 : (market === 'CHINA' || market === 'HONG_KONG' ? 3 : 1) 
        }) : '';
        
        const pct_str = isNaN(val) ? '0.00' : Math.abs(val).toFixed(2);
        
        return { color, icon, abs_str, pct_str };
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
                        <p className="text-xs text-gray-400/60 mt-0.5">실계좌 기반 최신 시장 트렌드 동기화</p>
                    </div>
                </div>

                {/* Market Selector */}
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 overflow-x-auto hide-scrollbar">
                    {MARKET_CONFIG.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMarket(m.id)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                market === m.id 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
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
                                <span className="bg-blue-500/10 p-1.5 rounded-lg">
                                    <cat.icon className="w-4 h-4 text-blue-400" />
                                </span>
                                <h3 className="text-sm font-bold text-gray-300">{cat.label}</h3>
                            </div>
                            {loading && (
                                <RefreshCw className="w-3 h-3 text-gray-600 animate-spin" />
                            )}
                        </div>

                        <div className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                            {rankData[cat.id].length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {rankData[cat.id].map((item, idx) => {
                                        const rf = getRiseFallInfo(item);
                                        return (
                                            <div
                                                key={`${item.symbol}-${idx}`}
                                                onClick={() => handleItemClick(item.symbol, item.name)}
                                                className="flex items-center justify-between p-4 hover:bg-white/10 active:bg-white/5 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <span className={`w-6 text-center text-lg font-black italic tracking-tighter ${
                                                        idx < 3 ? 'text-blue-500' : 'text-gray-700'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                    <div className="overflow-hidden">
                                                        <div className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors truncate">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 font-medium font-mono">
                                                            {item.symbol}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-sm font-bold text-gray-100 font-mono tracking-tight">
                                                        {formatPrice(item)}
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <div className={`text-[11px] font-bold font-mono ${rf.color}`}>
                                                            {rf.icon} {rf.abs_str} ({rf.pct_str}%)
                                                        </div>
                                                        {item.price_krw && market !== 'KOSPI' && (
                                                            <div className="text-[9px] text-gray-500 mt-0.5 font-medium bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5">
                                                                약 <span className="text-gray-400">{item.price_krw}</span>원
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 space-y-3 opacity-30">
                                    <div className="p-4 rounded-full bg-white/5">
                                        <Activity className="w-8 h-8 text-gray-600" />
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">실시간 데이터 동기화 중...</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer indicator - TurboQuant tech Badge */}
            <div className="flex justify-between items-center px-2">
                 <div className="flex items-center gap-2">
                     <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                         <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Global Ranking V2.8</span>
                     </div>
                 </div>
                 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                     <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">TurboQuant™ High-Speed Sync Active</span>
                 </div>
            </div>
        </div>
    );
}
