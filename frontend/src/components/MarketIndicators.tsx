"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, RefreshCw, Droplet, Maximize2, X, Loader2 } from 'lucide-react';
import { API_BASE_URL } from "@/lib/config";

interface MarketItem {
    name: string;
    price: string;
    change: string;
    is_up: boolean;
}

interface MarketListProps {
    title: string;
    icon: React.ReactNode;
    items: MarketItem[];
    limit?: number;
    onExpand?: () => void;
}

export const MarketList = ({ title, icon, items, limit, onExpand }: MarketListProps) => {
    const displayItems = limit ? items.slice(0, limit) : items;
    const hasMore = limit ? items.length > limit : false;

    return (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex flex-col h-full relative group">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-white font-bold flex items-center gap-2 flex-shrink-0">
                    {icon} {title}
                </h4>
                {hasMore && onExpand && (
                    <button
                        onClick={onExpand}
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="전체 보기"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className={`space-y-3 overflow-y-auto ${!limit ? 'max-h-[70vh]' : 'max-h-[400px]'} pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent`}>
                {displayItems && displayItems.length > 0 ? (
                    displayItems.map((item, i) => (
                        <div key={i} className="flex justify-between items-center group/item hover:bg-white/5 p-2 rounded-lg transition-colors">
                            <span className="text-gray-400 group-hover/item:text-white transition-colors text-sm">{item.name}</span>
                            <div className="text-right">
                                <div className="text-white font-mono text-sm font-bold">{item.price}</div>
                                <div className={`text-xs ${item.is_up ? 'text-red-400' : 'text-blue-400'}`}>
                                    {item.is_up ? '+' : ''}{item.change}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-600 text-xs py-4">데이터 로딩중...</div>
                )}
            </div>

            {hasMore && !onExpand && (
                <div className="mt-4 pt-3 border-t border-white/5 text-center">
                    <span className="text-xs text-gray-500">and {items.length - (limit || 0)} more...</span>
                </div>
            )}
        </div>
    );
};

interface MarketIndicatorsProps {
    limit?: number; // Optional limit for items to display (default: all or 10)
}

export default function MarketIndicators({ limit }: MarketIndicatorsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<{ title: string, items: MarketItem[], icon: React.ReactNode } | null>(null);

    const fetchAssets = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets`);
            const json = await res.json();
            if (json.status === "success") {
                setData(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
        const interval = setInterval(fetchAssets, 5000); // 5초 갱신
        return () => clearInterval(interval);
    }, []);

    // Helper to process /api/assets data into MarketItem format with Korean translation
    function processAssets(items: any[] | undefined, type: 'indices' | 'crypto' | 'forex' | 'commodity' | 'interest'): MarketItem[] {
        if (!items || items.length === 0) return [];

        return items.map(item => {
            let name = item.name;
            // Korean Translation Mapping
            if (type === 'indices') {
                if (name === 'S&P 500') name = 'S&P 500 (미국)';
                else if (name === 'Nasdaq') name = '나스닥 (미국)';
                else if (name === 'Dow Jones') name = '다우존스 (미국)';
                else if (name === 'Russell 2000') name = '러셀 2000';
                else if (name === 'VIX') name = 'VIX (공포지수)';
                else if (name === 'KOSPI') name = '코스피 (한국)';
                else if (name === 'KOSDAQ') name = '코스닥 (한국)';
                else if (name === 'Nikkei 225') name = '니케이 225 (일본)';
                else if (name === 'Euro Stoxx 50') name = '유로스톡스 50';
                else if (name === 'Shanghai Composite') name = '상해종합 (중국)';
            } else if (type === 'crypto') {
                if (name === 'Bitcoin') name = '비트코인';
                else if (name === 'Ethereum') name = '이더리움';
                else if (name === 'Ripple') name = '리플';
                else if (name === 'Solana') name = '솔라나';
                else if (name === 'Dogecoin') name = '도지코인';
                else if (name === 'Cardano') name = '에이다';
                else if (name === 'BNB') name = '바이낸스';
                else if (name === 'Tron') name = '트론';
                else if (name === 'Avalanche') name = '아발란체';
                else if (name === 'Chainlink') name = '체인링크';
            } else if (type === 'forex') {
                if (name.includes('USD/KRW')) name = '달러/원 (USD)';
                else if (name.includes('JPY/KRW')) name = '엔/원 (JPY)';
                else if (name.includes('EUR/KRW')) name = '유로/원 (EUR)';
                else if (name.includes('CNY/KRW')) name = '위안/원 (CNY)';
                else if (name.includes('GBP/KRW')) name = '파운드/원 (GBP)';
                else if (name.includes('AUD/KRW')) name = '호주달러/원';
                else if (name.includes('CAD/KRW')) name = '캐나다달러/원';
                else if (name.includes('CHF/KRW')) name = '스위스프랑/원';
                else if (name.includes('HKD/KRW')) name = '홍콩달러/원';
                else if (name.includes('NZD/KRW')) name = '뉴질랜드달러/원';
            } else if (type === 'commodity') {
                if (name === 'Gold') name = '국제 금';
                else if (name === 'Silver') name = '국제 은';
                else if (name === 'Crude Oil') name = 'WTI 원유';
                else if (name === 'Natural Gas') name = '천연가스';
                else if (name === 'Copper') name = '구리';
                else if (name === 'Corn') name = '옥수수';
                else if (name === 'Platinum') name = '백금';
                else if (name === 'Palladium') name = '팔라듐';
                else if (name === 'Wheat') name = '소맥 (밀)';
                else if (name === 'Soybean') name = '대두 (콩)';
            } else if (type === 'interest') {
                // Interest rates usually come with good names, providing minor cleanups if needed
                if (name.includes('CD')) name = 'CD금리 (91일)';
                else if (name.includes('CP')) name = 'CP금리 (91일)';
                else if (name.includes('Treasury') && name.includes('3Y')) name = '국고채 3년';
                else if (name.includes('Treasury') && name.includes('10Y')) name = '국고채 10년';
            }

            // Safety check for price
            let priceStr = "0.00";
            if (typeof item.price === 'number') {
                priceStr = item.price.toLocaleString(undefined, { maximumFractionDigits: 2 });
            } else if (typeof item.price === 'string') {
                priceStr = item.price;
            }

            const changeVal = item.change || 0;
            const is_up = changeVal >= 0;
            const changeStr = `${Math.abs(changeVal).toFixed(2)}%`;

            return {
                name: name,
                price: type === 'crypto' ? `₩${priceStr}` : priceStr, // Coins in KRW (Upbit)
                change: changeStr,
                is_up: is_up
            };
        });
    }

    const openModal = (title: string, items: MarketItem[], icon: React.ReactNode) => {
        setSelectedCategory({ title, items, icon });
    };

    if (loading && !data) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
    if (!data) return null;

    const displayLimit = limit || 10;

    // Prepare Data
    const indices = processAssets(data.Indices, 'indices');
    const crypto = processAssets(data.Crypto, 'crypto');
    const forex = processAssets(data.Forex, 'forex');
    const commodity = processAssets(data.Commodity, 'commodity');
    const interest = processAssets(data.Interest, 'interest'); // [New] Interest Data

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <MarketList
                    title="글로벌 주요 지수"
                    icon={<BarChart3 className="text-blue-400" />}
                    items={indices}
                    limit={displayLimit}
                    onExpand={() => openModal("글로벌 주요 지수 (전체)", indices, <BarChart3 className="text-blue-400" />)}
                />
                <MarketList
                    title="암호화폐"
                    icon={<DollarSign className="text-yellow-400" />}
                    items={crypto}
                    limit={displayLimit}
                    onExpand={() => openModal("암호화폐 (전체)", crypto, <DollarSign className="text-yellow-400" />)}
                />
                <MarketList
                    title="주요 환율"
                    icon={<RefreshCw className="text-green-400" />}
                    items={forex}
                    limit={displayLimit}
                    onExpand={() => openModal("주요 환율 (전체)", forex, <RefreshCw className="text-green-400" />)}
                />
                <MarketList
                    title="원자재"
                    icon={<Droplet className="text-orange-400" />}
                    items={commodity}
                    limit={displayLimit}
                    onExpand={() => openModal("원자재 (전체)", commodity, <Droplet className="text-orange-400" />)}
                />
                {/* [New] Interest Rates Column */}
                <MarketList
                    title="금리/채권"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M12 2v20" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
                    items={interest}
                    limit={displayLimit}
                    onExpand={() => openModal("금리/채권 (전체)", interest, <div className="text-purple-400">🏦</div>)}
                />
            </div>

            {/* Modal for All Data */}
            {selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#18181b] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                {selectedCategory.icon} {selectedCategory.title}
                            </h3>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedCategory.items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors">
                                        <div className="font-bold text-gray-200">{item.name}</div>
                                        <div className="text-right">
                                            <div className="text-white font-mono font-bold text-lg">{item.price}</div>
                                            <div className={`text-sm ${item.is_up ? 'text-red-400' : 'text-blue-400'}`}>
                                                {item.is_up ? '+' : ''}{item.change}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
