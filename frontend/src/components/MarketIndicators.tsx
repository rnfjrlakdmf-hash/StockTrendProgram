"use client";

import React, { useState, useEffect } from 'react';
import { 
    BarChart3, 
    DollarSign, 
    RefreshCw, 
    Droplet, 
    Maximize2, 
    X, 
    Loader2, 
    TrendingUp, 
    Activity, 
    Globe, 
    Building2, 
    Flame, 
    Layers,
    Info,
    ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from "@/lib/config";
import TradingViewIndicesWidget from './TradingViewIndicesWidget';

interface CleanStockItem {
    symbol: string;
    name: string;
    price: string;
    change: string;
    unit?: string;
    isRealtime?: boolean;
}

interface MarketIndicatorsProps {
    limit?: number;
}

type MacroTabKey = 'forex' | 'commodity' | 'bonds' | 'interest';

export default function MarketIndicators({ limit }: MarketIndicatorsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<MacroTabKey>('forex');
    const [selectedModalCategory, setSelectedModalCategory] = useState<{ title: string, items: CleanStockItem[], icon: React.ReactNode } | null>(null);
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
        const interval = setInterval(fetchMajorIndicators, 10000); // 10초 실시간 갱신
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
            
            // Professional Translation / Cleanup
            if (name === 'WTI Crude') { name = 'WTI 원유'; unit = 'USD/배럴'; }
            else if (name === 'Brent Crude') { name = '브렌트유'; unit = 'USD/배럴'; }
            else if (name === 'Gold') { name = '국제 금'; unit = 'USD/온스'; }
            else if (name === 'Silver') { name = '국제 은'; unit = 'USD/온스'; }
            else if (name === 'Copper') { name = '구리'; unit = 'USD/톤'; }
            else if (name === 'Gasoline - RBOB' || name.includes('RBOB')) { name = 'RBOB 휘발유'; unit = 'USD/갤런'; }
            else if (name === 'Heating Oil') { name = '난방유'; unit = 'USD/갤런'; }
            else if (name === 'Natural Gas') { name = '천연가스'; unit = 'USD/MMBtu'; }
            else if (name === 'Dubai Crude' || name === 'Dubai') { name = '두바이유'; unit = 'USD/배럴'; }
            else if (name === 'Gasoline - 95 RON') { name = '고급휘발유'; unit = 'USD/톤'; }
            else if (name === 'Murban' || name.includes('마니') || name.includes('Murban')) { name = '머반 원유'; unit = 'USD/배럴'; }
            else if (name.includes('10Y')) name = name.replace('10Y', '10년물');
            else if (name.includes('CD 91일')) name = 'CD금리(91D)';
            else if (name.includes('콜금리')) name = '시장 콜금리';
            else if (name.includes('미국연방준비은행') || name === '미국 연방준비은행') name = '미국 연준(Fed) 기준금리';
            else if (name === '한국은행') name = '한국은행(BOK) 기준금리';
            else if (name === '유럽중앙은행') name = '유럽중앙은행(ECB) 기준금리';
            else if (name === '영국은행') name = '영란은행(BOE) 기준금리';
            else if (name === '일본은행') name = '일본은행(BOJ) 기준금리';
            
            const priceVal = item.price;
            const changeVal = parseFloat(String(item.change || 0));
            const changeStr = `${changeVal > 0 ? '+' : ''}${Number(changeVal || 0).toFixed(2)}%`;

            // KRW Conversion Logic
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

    if (loading && !data) return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/5 rounded-3xl h-[560px] animate-pulse flex items-center justify-center border border-white/5">
                <Loader2 className="w-8 h-8 text-gray-700 animate-spin" />
            </div>
            <div className="bg-white/5 rounded-3xl h-[560px] animate-pulse flex items-center justify-center border border-white/5">
                <Loader2 className="w-8 h-8 text-gray-700 animate-spin" />
            </div>
        </div>
    );
    if (!data) return null;

    const forex = processItems(data.Forex, 'Forex');
    const commodity = processItems(data.Commodity, 'Commodity');
    const bonds = processItems(data.Bonds, 'Bonds');
    const interest = processItems(data.Interest, 'Interest');

    const macroTabs = [
        {
            id: 'forex' as MacroTabKey,
            label: '주요 환율',
            icon: <RefreshCw className="w-3.5 h-3.5" />,
            badge: `${forex.length}`,
            items: forex,
            activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10 shadow-sm',
            hoverClass: 'hover:text-emerald-300 hover:bg-emerald-500/10',
            dotColor: 'bg-emerald-400',
            tip: '원/달러, 유로, 엔화, 달러인덱스 등 글로벌 외환 시장 실시간 환율'
        },
        {
            id: 'commodity' as MacroTabKey,
            label: '원자재·에너지',
            icon: <Flame className="w-3.5 h-3.5" />,
            badge: `${commodity.length}`,
            items: commodity,
            activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10 shadow-sm',
            hoverClass: 'hover:text-amber-300 hover:bg-amber-500/10',
            dotColor: 'bg-amber-400',
            tip: 'WTI 원유, 금, 은, 천연가스 등 핵심 원자재 시세 (원화 환산 병기)'
        },
        {
            id: 'bonds' as MacroTabKey,
            label: '국가 채권 10Y',
            icon: <BarChart3 className="w-3.5 h-3.5" />,
            badge: `${bonds.length}`,
            items: bonds,
            activeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/10 shadow-sm',
            hoverClass: 'hover:text-purple-300 hover:bg-purple-500/10',
            dotColor: 'bg-purple-400',
            tip: '미국·한국·일본 등 주요국 10년물 국채 수익률 (글로벌 경기 선행지표)'
        },
        {
            id: 'interest' as MacroTabKey,
            label: '글로벌 기준금리',
            icon: <Building2 className="w-3.5 h-3.5" />,
            badge: `${interest.length}`,
            items: interest,
            activeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sky-500/10 shadow-sm',
            hoverClass: 'hover:text-sky-300 hover:bg-sky-500/10',
            dotColor: 'bg-sky-400',
            tip: '미 연준·한국은행·ECB 등 중앙은행 기준금리 및 시장 금리(CD/콜/코픽스)'
        },
    ];

    const currentTab = macroTabs.find(t => t.id === activeTab) || macroTabs[0];

    return (
        <div className="space-y-4">
            {/* Top Bar: Data Sync Status */}
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-300 tracking-tight flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        글로벌 매크로 & 실시간 지표 분석
                    </h2>
                </div>
                <div className="bg-zinc-900/90 border border-white/10 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-emerald-400 tracking-tight flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" /> 데이터 실시간 동기화: {lastUpdated || 'SYNCING...'}
                    </span>
                </div>
            </div>

            {/* 2-Column Balanced Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 items-stretch">
                {/* 1. Left Card: 글로벌 지수 실시간 차트 (TradingView) */}
                <div className="flex flex-col h-full min-h-[560px]">
                    <TradingViewIndicesWidget />
                </div>

                {/* 2. Right Card: 글로벌 거시경제 & 원자재 통합 허브 (환율 · 원자재 · 채권 · 기준금리) */}
                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-full min-h-[560px]">
                    {/* Header */}
                    <div className="bg-zinc-950/80 border-b border-white/10 px-5 py-3.5 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <span className="font-black text-white text-sm tracking-tight block">
                                    글로벌 거시경제 & 자산 지표
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                                    환율 · 원자재 · 국채 수익률 · 주요국 기준금리 통합
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedModalCategory({ title: currentTab.label, items: currentTab.items, icon: currentTab.icon })}
                            className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
                            title="전체보기"
                        >
                            <span className="text-[11px] text-gray-400 font-medium hidden md:inline">전체보기</span>
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* 4 Unified Category Tabs */}
                    <div className="bg-black/30 border-b border-white/5 p-2 px-3 flex gap-1.5 overflow-x-auto scrollbar-none">
                        {macroTabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                                        isActive 
                                            ? tab.activeClass 
                                            : `text-gray-400 border-transparent ${tab.hoverClass}`
                                    }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-md ${
                                        isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-500'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Category Description Banner */}
                    <div className="px-5 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <span className="truncate">{currentTab.tip}</span>
                        {exchangeRate && activeTab === 'commodity' && (
                            <span className="text-amber-400 font-mono font-bold shrink-0 ml-2">
                                적용 환율: ₩{exchangeRate.toLocaleString()}
                            </span>
                        )}
                    </div>

                    {/* Indicator Items List */}
                    <div className="flex-1 overflow-y-auto max-h-[440px] custom-scrollbar divide-y divide-white/5">
                        {currentTab.items.map((item, idx) => {
                            const isUp = item.change.includes('+');
                            const isDown = item.change.includes('-');
                            const isZero = item.change === '0.00%';
                            
                            const priceParts = item.price.split(' (');
                            const mainPrice = priceParts[0];
                            const subPrice = priceParts[1] ? `(${priceParts[1]}` : "";

                            return (
                                <div key={idx} className="group flex items-center justify-between px-5 py-3 hover:bg-zinc-800/80 transition-colors relative">
                                    <div className="flex flex-col max-w-[55%] min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs md:text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                                {item.name}
                                            </span>
                                            {item.isRealtime && (
                                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold border border-emerald-500/20 shrink-0">
                                                    SYNC
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-mono truncate tracking-wider mt-0.5">
                                            {item.symbol} {item.unit && `· ${item.unit}`}
                                        </span>
                                    </div>
                                    <div className="text-right flex flex-col items-end shrink-0 ml-2">
                                        <div className="tabular-nums font-black font-mono text-xs md:text-sm text-white flex flex-col items-end leading-tight">
                                            <span>{mainPrice}</span>
                                            {subPrice && (
                                                <span className="text-[10px] text-amber-400/90 font-mono font-bold tracking-tighter mt-0.5">
                                                    {subPrice}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1">
                                            <div className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${
                                                isZero 
                                                    ? 'text-gray-400 bg-white/5 border-white/10' 
                                                    : isUp 
                                                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                                                    : 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                                            }`}>
                                                {item.change}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Special Macro Note for Bonds Tab (Fills the height cleanly and provides institutional value) */}
                        {activeTab === 'bonds' && (
                            <div className="p-4 mx-4 my-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
                                <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 shrink-0 mt-0.5">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div className="text-xs text-purple-200/90 leading-relaxed">
                                    <span className="font-bold text-white block mb-0.5">💡 거시경제 선행지표 분석 팁</span>
                                    국채 10년물 금리는 글로벌 경기 전망 및 중앙은행 통화정책의 핵심 벤치마크입니다. 특히 미국 국채 10년물 금리의 급등락은 글로벌 주식 시장의 성장주 밸류에이션에 직접적인 영향을 미칩니다.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for All Data */}
            {selectedModalCategory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                    {selectedModalCategory.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">{selectedModalCategory.title}</h3>
                                    <span className="text-xs text-gray-400">실시간 매크로 지표 전체 목록</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedModalCategory(null)}
                                className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                             <div className="divide-y divide-white/5">
                                {selectedModalCategory.items.map((item, idx) => {
                                    const isUp = item.change.includes('+');
                                    const isZero = item.change === '0.00%';
                                    return (
                                        <div key={idx} className="flex items-center justify-between px-8 py-4 hover:bg-white/5 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-gray-100">{item.name}</span>
                                                <span className="text-xs text-gray-500 font-mono">{item.symbol} {item.unit && `(${item.unit})`}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-base font-black text-white font-mono leading-tight">
                                                    {item.price}
                                                </div>
                                                <div className={`text-xs font-bold font-mono mt-1 ${isZero ? 'text-gray-500' : isUp ? 'text-rose-400' : 'text-sky-400'}`}>
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
                                onClick={() => setSelectedModalCategory(null)}
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
