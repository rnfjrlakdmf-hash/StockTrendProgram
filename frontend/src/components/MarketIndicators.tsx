"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, RefreshCw, Droplet, Maximize2, X, Loader2 } from 'lucide-react';
import { API_BASE_URL } from "@/lib/config";
import CleanStockList, { CleanStockItem } from './CleanStockList';

interface MarketIndicatorsProps {
    limit?: number; // Optional limit for items to display (default: all or 10)
}

export default function MarketIndicators({ limit }: MarketIndicatorsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<{ title: string, items: CleanStockItem[], icon: React.ReactNode } | null>(null);

    const fetchAssets = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/assets`);

            // [Fix] Check response status
            if (!res.ok) {
                setLoading(false);
                return;
            }

            const json = await res.json();
            if (json.status === "success" && json.data) {
                // [Fix] Robust Update: Only update if we have valid data
                // This prevents flickering if one request returns empty/partial data
                if (Object.keys(json.data).length > 0) {
                    setData((prev: any) => {
                        if (!prev) return json.data;
                        return {
                            ...prev,
                            ...json.data,
                            // Preserve existing arrays if new ones are empty (optional safety)
                            Indices: (json.data.Indices && json.data.Indices.length > 0) ? json.data.Indices : prev.Indices,
                            Crypto: (json.data.Crypto && json.data.Crypto.length > 0) ? json.data.Crypto : prev.Crypto,
                            Forex: (json.data.Forex && json.data.Forex.length > 0) ? json.data.Forex : prev.Forex,
                            Commodity: (json.data.Commodity && json.data.Commodity.length > 0) ? json.data.Commodity : prev.Commodity,
                            Interest: (json.data.Interest && json.data.Interest.length > 0) ? json.data.Interest : prev.Interest,
                        };
                    });
                }
            }
        } catch (e) {
            // [Fix] Silently ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
        const interval = setInterval(fetchAssets, 5000); // 5초 갱신
        return () => clearInterval(interval);
    }, []);

    // Helper to process /api/assets data into CleanStockItem format with Korean translation
    function processAssets(items: any[] | undefined, type: 'indices' | 'crypto' | 'forex' | 'commodity' | 'interest'): CleanStockItem[] {
        if (!items || items.length === 0) return [];

        return items.map(item => {
            let name = item.name;
            if (!name) return { symbol: item.symbol || 'Unknown', name: 'Unknown', price: '-', change: '0%' };

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
                // Korean Interest Rates
                if (name.includes('콜금리')) name = name; // Keep as is
                else if (name.includes('CD')) name = name; // Keep as is
                else if (name.includes('국고채')) name = name; // Keep as is
                // US Treasury Rates
                else if (name.includes('13W')) name = '미국 국채 3개월';
                else if (name.includes('2Y Note') || name.includes('US 2Y')) name = '미국 국채 2년';
                else if (name.includes('5Y')) name = '미국 국채 5년';
                else if (name.includes('10Y')) name = '미국 국채 10년';
                else if (name.includes('30Y')) name = '미국 국채 30년';
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
            const changeStr = `${changeVal > 0 ? '+' : ''}${parseFloat(changeVal).toFixed(2)}%`;

            // Use item.symbol if available, otherwise use name as ID
            const symbol = item.symbol || item.name;

            return {
                symbol: symbol,
                name: name,
                price: type === 'crypto' ? `$${priceStr}` : priceStr,
                change: changeStr
            };
        });
    }

    const openModal = (title: string, items: CleanStockItem[], icon: React.ReactNode) => {
        setSelectedCategory({ title, items, icon });
    };

    const renderCard = (title: string, icon: React.ReactNode, items: CleanStockItem[], limit?: number, onExpand?: () => void) => {
        const displayItems = limit ? items.slice(0, limit) : items;
        const hasMore = limit ? items.length > limit : false;

        return (
            <div className="bg-white/5 rounded-2xl p-0 border border-white/5 flex flex-col h-full relative group overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5">
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

                <div className={`overflow-y-auto ${!limit ? 'max-h-[70vh]' : 'max-h-[400px]'} scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent`}>
                    <CleanStockList items={displayItems} />
                </div>

                {hasMore && !onExpand && (
                    <div className="py-3 text-center border-t border-white/5 bg-white/[0.02]">
                        <span className="text-xs text-gray-500 font-medium">+{items.length - (limit || 0)} more items</span>
                    </div>
                )}
            </div>
        );
    };

    if (loading && !data) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
    if (!data) return null;

    const displayLimit = limit || 5; // Reduced default limit for cleaner mobile view

    const indices = processAssets(data.Indices, 'indices');
    const crypto = processAssets(data.Crypto, 'crypto');
    const forex = processAssets(data.Forex, 'forex');
    const commodity = processAssets(data.Commodity, 'commodity');
    const interest = processAssets(data.Interest, 'interest');

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {renderCard("글로벌 주요 지수", <BarChart3 className="text-blue-400" />, indices, displayLimit, () => openModal("글로벌 주요 지수 (전체)", indices, <BarChart3 className="text-blue-400" />))}
                {renderCard("암호화폐", <DollarSign className="text-yellow-400" />, crypto, displayLimit, () => openModal("암호화폐 (전체)", crypto, <DollarSign className="text-yellow-400" />))}
                {renderCard("주요 환율", <RefreshCw className="text-green-400" />, forex, displayLimit, () => openModal("주요 환율 (전체)", forex, <RefreshCw className="text-green-400" />))}
                {renderCard("원자재", <Droplet className="text-orange-400" />, commodity, displayLimit, () => openModal("원자재 (전체)", commodity, <Droplet className="text-orange-400" />))}
                {renderCard("금리/채권", <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 w-5 h-5"><path d="M12 2v20" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>, interest, displayLimit, () => openModal("금리/채권 (전체)", interest, <div className="text-purple-400">🏦</div>))}
            </div>

            {/* Modal for All Data */}
            {selectedCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#18181b] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
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
                        <div className="overflow-y-auto flex-1">
                            <CleanStockList items={selectedCategory.items} />
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 flex justify-end bg-white/5">
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
