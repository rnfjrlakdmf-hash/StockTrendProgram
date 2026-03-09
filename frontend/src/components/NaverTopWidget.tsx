import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { RefreshCw } from 'lucide-react';

type MarketType = 'krx' | 'nxt';
type RankType = 'quant' | 'rise' | 'fall' | 'market_sum';

export default function NaverTopWidget() {
    const [market, setMarket] = useState<MarketType>('krx');
    const [rankType, setRankType] = useState<RankType>('quant');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/rank/naver/${market}/${rankType}`);
                const json = await res.json();
                if (!ignore && json.status === "success") {
                    setData(json.data);
                }
            } catch (e) {
                console.error("NaverTopWidget Fetch Error:", e);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s refresh

        return () => {
            ignore = true;
            clearInterval(interval);
        };
    }, [market, rankType]);

    // Helpers
    const formatPrice = (price: number) => {
        return Number(price).toLocaleString();
    };

    const getChangeColor = (change_percent: number) => {
        if (change_percent > 0) return 'text-red-500'; // 한국 주식은 상승 시 빨간색
        if (change_percent < 0) return 'text-blue-500'; // 하락 시 파란색
        return 'text-gray-400';
    };

    const getPriceBgColor = (change_percent: number) => {
        if (change_percent > 0) return 'bg-red-500/10 border-red-500/20';
        if (change_percent < 0) return 'bg-blue-500/10 border-blue-500/20';
        return 'bg-gray-500/10 border-gray-500/20';
    };

    return (
        <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl w-full overflow-hidden">
            {/* Main Tabs (KRX / NXT) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/10 pb-3">
                <div className="flex gap-2 text-lg md:text-xl font-bold items-center">
                    <span className="text-white">TOP종목</span>
                    <span className="text-gray-500 text-xs md:text-sm ml-1 sm:ml-2 font-normal">네이버 금융 기준</span>
                </div>

                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto w-full sm:w-auto">
                    <button
                        onClick={() => setMarket('krx')}
                        className={`flex-1 sm:flex-none px-4 md:px-6 py-1.5 rounded-lg text-sm font-bold transition-all ${market === 'krx' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        KRX
                    </button>
                    <button
                        onClick={() => setMarket('nxt')}
                        className={`flex-1 sm:flex-none px-4 md:px-6 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${market === 'nxt' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        NXT <span className="text-[10px] bg-white/10 px-1 py-0.5 rounded text-gray-300 whitespace-nowrap hidden sm:inline-block">야간</span>
                    </button>
                </div>
            </div>

            {/* Sub Tabs (거래상위 / 상승 / 하락 / 시가총액상위) */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="flex gap-1 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
                    {[
                        { key: 'quant', label: '거래상위' },
                        { key: 'rise', label: '상승' },
                        { key: 'fall', label: '하락' },
                        { key: 'market_sum', label: '시총상위' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setRankType(tab.key as RankType)}
                            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${rankType === tab.key ? 'text-white border-white' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Refresh indicator */}
                <div className="text-[10px] sm:text-xs text-gray-500 flex items-center justify-end gap-1.5 bg-black/30 px-3 py-1.5 rounded-full pl-0 sm:pl-3 bg-transparent sm:bg-black/30 w-fit self-end sm:self-auto">
                    <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                    <span>실시간 갱신</span>
                </div>
            </div>

            {/* List */}
            <div className="min-h-[400px]">
                {loading && data.length === 0 ? (
                    <div className="flex justify-center items-center h-[300px]">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-600" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex justify-center items-center h-[300px] text-gray-500 text-sm">
                        데이터를 불러올 수 없습니다. 시장이 닫혀있거나 통신 오류일 수 있습니다.
                    </div>
                ) : (
                    <div className="space-y-2 overflow-x-auto hide-scrollbar">
                        <div className="min-w-[400px]">
                            {/* Header Row */}
                            <div className="flex items-center justify-between px-3 md:px-5 py-2 md:py-3 text-[10px] md:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1 md:mb-2">
                                <div className="w-8 md:w-10 text-center">순위</div>
                                <div className="flex-1 ml-3 md:ml-5">종목명</div>
                                <div className="w-20 md:w-28 text-right">현재가</div>
                                <div className="w-20 md:w-28 text-right">등락률</div>
                            </div>

                            {/* Body Rows */}
                            <div className="space-y-2 md:space-y-3">
                                {data.map((item, idx) => (
                                    <div key={`${item.symbol}-${idx}`} className="flex items-center justify-between p-3 md:p-4 px-3 md:px-5 rounded-xl md:rounded-2xl bg-[#2a2a2c] hover:bg-[#323235] transition-all group cursor-pointer border border-transparent hover:border-white/20 shadow-sm">
                                        {/* Rank */}
                                        <div className="w-8 md:w-10 flex justify-center">
                                            <span className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full font-bold text-sm md:text-lg font-mono ${idx < 3 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-gray-400'
                                                }`}>
                                                {item.rank}
                                            </span>
                                        </div>

                                        {/* Name & Symbol */}
                                        <div className="flex-1 ml-3 md:ml-5 overflow-hidden">
                                            <div className="font-bold text-white text-sm md:text-lg group-hover:text-blue-300 transition-colors truncate">{item.name}</div>
                                            <div className="text-[10px] md:text-sm text-gray-500 font-mono mt-0 md:mt-0.5">{item.symbol}</div>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right w-20 md:w-28">
                                            <div className={`font-bold font-mono text-sm md:text-lg tracking-tight ${getChangeColor(item.change_percent)}`}>
                                                {formatPrice(item.price)}
                                            </div>
                                        </div>

                                        {/* Change */}
                                        <div className="text-right w-20 md:w-28 flex justify-end">
                                            <div className={`px-2 md:px-3 py-1 md:py-1.5 rounded md:rounded-lg border font-bold font-mono text-[10px] md:text-sm min-w-[3.5rem] w-full max-w-[5rem] md:max-w-24 text-center ${getPriceBgColor(item.change_percent)} ${getChangeColor(item.change_percent)}`}>
                                                {item.change_percent > 0 ? '+' : ''}{item.change}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
