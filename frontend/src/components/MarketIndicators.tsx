"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, RefreshCw, Droplet, Maximize2, X, Loader2, TrendingUp, Activity } from 'lucide-react';
import { API_BASE_URL } from "@/lib/config";
import CleanStockList, { CleanStockItem } from './CleanStockList';

interface MarketIndicatorsProps {
    limit?: number; // Optional limit for items to display (default: all or 10)
}

export default function MarketIndicators({ limit }: MarketIndicatorsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<{ title: string, items: CleanStockItem[], icon: React.ReactNode } | null>(null);
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    const fetchMajorIndicators = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/major`);
            if (!res.ok) {
                setLoading(false);
                return;
            }

            const json = await res.json();
            if (json.status === "success" && json.data) {
                setData(json.data);
                if (json.data.updatedAt) setLastUpdated(json.data.updatedAt);
                
                // Extract USD/KRW Rate for conversion
                const forex = json.data.Forex || [];
                const usdKrw = forex.find((f: any) => f.symbol === 'FX_USDKRW' || f.name?.includes('달러/원'));
                if (usdKrw && usdKrw.price) {
                    const rate = parseFloat(String(usdKrw.price).replace(/,/g, ''));
                    if (!isNaN(rate)) setExchangeRate(rate);
                }
            }
        } catch (e) {
            console.error("Fetch Major Indicators Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMajorIndicators();
        const interval = setInterval(fetchMajorIndicators, 10000); // 10초 갱신
        return () => clearInterval(interval);
    }, []);

    // Precision price formatter
    const formatPriceDisplay = (price: any, category: string, symbol?: string) => {
        if (!price || price === '-') return '-';
        const num = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : price;
        if (isNaN(num)) return price;

        let decimals = 2;
        if (category === 'Interest' || category === 'Bonds') decimals = 3;
        if (category === 'Indices') decimals = 2;
        if (category === 'Forex') {
            decimals = symbol?.includes('KRW') ? 2 : 3;
        }

        const formatted = num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });

        if (category === 'Interest' || category === 'Bonds') return `${formatted}%`;
        if (category === 'Crypto') return `$${formatted}`;
        if (category === 'Forex' && symbol?.includes('KRW')) return `₩${formatted}`;
        
        return formatted;
    };

    function processItems(items: any[] | undefined, type: string): CleanStockItem[] {
        if (!items || items.length === 0) return [];

        return items.map(item => {
            let name = item.name || 'Unknown';
            let unit = item.unit || '';
            
            // Translation / Cleanup
            if (name === 'WTI Crude') { name = 'WTI 원유'; unit = 'USD/배럴'; }
            else if (name === 'Brent Crude') { name = '브렌트유'; unit = 'USD/배럴'; }
            else if (name === 'Gold') { name = '국제 금'; unit = 'USD/온스'; }
            else if (name === 'Silver') { name = '국제 은'; unit = 'USD/온스'; }
            else if (name === 'Copper') { name = '구리'; unit = 'USD/톤'; }
            else if (name.includes('10Y')) name = name.replace('10Y', '10년물');
            else if (name.includes('CD 91일')) name = 'CD금리(91D)';
            else if (name.includes('콜금리')) name = '시장 콜금리';
            
            const priceVal = item.price;
            const changeVal = parseFloat(String(item.change || 0));
            const changeStr = `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}%`;

            // [New] KRW Conversion Logic
            let krwPrice = "";
            const isUsdBased = unit.includes('USD') || unit === '$' || type === 'Crypto';
            if (isUsdBased && exchangeRate && priceVal) {
                const p = parseFloat(String(priceVal).replace(/,/g, ''));
                if (!isNaN(p)) {
                    krwPrice = ` (₩${(p * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })})`;
                }
            }

            return {
                symbol: item.symbol || item.name,
                name: name,
                price: `${formatPriceDisplay(priceVal, type, item.symbol)}${krwPrice}`,
                change: changeStr,
                unit: unit,
                isRealtime: type === 'Bonds' || type === 'Forex' || type === 'Indices' || (type === 'Interest' && !name.includes('기준금리'))
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
            <div className="bg-[#1c1c1e]/40 backdrop-blur-md rounded-2xl border border-white/5 flex flex-col h-full overflow-hidden transition-all hover:border-white/10 shadow-lg">
                <div className="flex justify-between items-center p-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                    <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                        {icon} <span className="tracking-tight">{title}</span>
                    </h4>
                    {hasMore && onExpand && (
                        <button
                            onClick={onExpand}
                            className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-[220px]">
                    <div className="divide-y divide-white/5">
                        {displayItems.map((item, idx) => {
                            const isUp = item.change.includes('+');
                            const isDown = item.change.includes('-');
                            const isZero = item.change === '0.00%';
                            
                            const priceParts = item.price.split(' (');
                            const mainPrice = priceParts[0];
                            const subPrice = priceParts[1] ? `(${priceParts[1]}` : "";

                            return (
                                <div key={idx} className="group flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors relative">
                                    <div className="flex flex-col max-w-[55%]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[12px] font-bold text-gray-300 truncate group-hover:text-white transition-colors">{item.name}</span>
                                            {item.isRealtime && <span className="text-[7px] bg-emerald-500/20 text-emerald-400 px-1 rounded-sm font-black border border-emerald-500/30 animate-pulse">LIVE</span>}
                                        </div>
                                        <span className="text-[9px] text-gray-500 font-mono truncate opacity-60">{item.symbol}</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="text-[12px] font-black text-gray-100 font-mono flex flex-col items-end leading-tight">
                                            <span>{mainPrice}</span>
                                            {subPrice && <span className="text-[9px] text-orange-400/80 font-bold tracking-tighter mt-0.5">{subPrice}</span>}
                                        </div>
                                        <div className={`text-[10px] font-bold font-mono mt-0.5 ${isZero ? 'text-gray-500' : isUp ? 'text-[#f23c3c]' : isDown ? 'text-[#3c78f2]' : 'text-gray-500'}`}>
                                            {item.change}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    if (loading && !data) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white/5 rounded-2xl h-64 animate-pulse flex items-center justify-center border border-white/5">
                    <Loader2 className="w-6 h-6 text-gray-700 animate-spin" />
                </div>
            ))}
        </div>
    );
    if (!data) return null;

    const displayLimit = limit || 5;

    const indices = processItems(data.Indices, 'Indices');
    const crypto = processItems(data.Crypto, 'Crypto');
    const forex = processItems(data.Forex, 'Forex');
    const commodity = processItems(data.Commodity, 'Commodity');
    const bonds = processItems(data.Bonds, 'Bonds');
    const interest = processItems(data.Interest, 'Interest');

    return (
        <div className="space-y-4">
            <div className="flex justify-end px-1">
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-400 tracking-tighter flex items-center gap-1.5">
                        <Activity className="w-3 h-3" /> 데이터 실시간 동기화 완료: {lastUpdated || 'SYNCING...'}
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {renderCard("글로벌 지수", <TrendingUp className="w-4 h-4 text-blue-400" />, indices, displayLimit, () => openModal("글로벌 주요 지수", indices, <TrendingUp className="text-blue-400" />))}
                {renderCard("주요 환율", <RefreshCw className="w-4 h-4 text-green-400" />, forex, displayLimit, () => openModal("실시간 주요 환율", forex, <RefreshCw className="text-green-400" />))}
                {renderCard("에너지/금속", <Droplet className="w-4 h-4 text-orange-400" />, commodity, displayLimit, () => openModal("원자재 (에너지/금속)", commodity, <Droplet className="text-orange-400" />))}
                {renderCard("국가 채권", <BarChart3 className="w-4 h-4 text-purple-400" />, bonds, displayLimit, () => openModal("주요국 국채 10년물", bonds, <BarChart3 className="text-purple-400" />))}
                {renderCard("기준 금리", <DollarSign className="w-4 h-4 text-red-400" />, interest, displayLimit, () => openModal("전세계 기준 금리", interest, <DollarSign className="text-red-400" />))}
                {renderCard("암호화폐", <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11.75 2v20M5 18h14M5 6h14M8 21.5V18M16 21.5V18M8 6V2.5M16 6V2.5" /></svg>, crypto, displayLimit, () => openModal("암호화폐 랭킹", crypto, "₿"))}
            </div>

            {/* Modal for All Data */}
            {selectedCategory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                    {selectedCategory.icon}
                                </div>
                                <h3 className="text-xl font-black text-white">{selectedCategory.title}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="p-2.5 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                             <div className="divide-y divide-white/5">
                                {selectedCategory.items.map((item, idx) => {
                                    const isUp = item.change.includes('+');
                                    const isZero = item.change === '0.00%';
                                    return (
                                        <div key={idx} className="flex items-center justify-between px-8 py-5 hover:bg-white/5 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-gray-100">{item.name}</span>
                                                <span className="text-xs text-gray-500 font-mono">{item.symbol}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-white font-mono leading-tight">
                                                    {item.price} <span className="text-[10px] text-gray-600 font-normal">{item.unit}</span>
                                                </div>
                                                <div className={`text-sm font-bold font-mono ${isZero ? 'text-gray-500' : isUp ? 'text-[#f23c3c]' : 'text-[#3c78f2]'}`}>
                                                    {item.change}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-center">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="px-12 py-3 bg-white text-black hover:bg-gray-200 rounded-full font-black transition-all"
                            >
                                대시보드로 돌아가기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
