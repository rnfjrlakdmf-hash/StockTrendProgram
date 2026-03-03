"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, DollarSign, Droplet, Globe, BarChart3, ArrowUpRight, ArrowDownRight, Layers, AlertCircle, RefreshCw, PieChart, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { API_BASE_URL } from "@/lib/config";
import { FALLBACK_DASHBOARD_DATA } from "@/lib/fallbackData";
import MarketIndicators from './MarketIndicators';
import CleanStockList from './CleanStockList';

interface MarketItem {
    name: string;
    price: string;
    change: string;
    is_up: boolean;
}



interface MarketIndexSummary {
    value: string;
    change: string;
    percent: string;
    direction: "Up" | "Down" | "Equal";
    chart: string;
    investors?: {
        personal: string;
        foreigner: string;
        institutional: string;
    };
    stock_counts?: {
        upper: string;
        up: string;
        equal: string;
        down: string;
        lower: string;
    };
    program_trading?: {
        net: string;
        change: string;
        label: string;
    };
}

interface MarketDashboardData {
    exchange: MarketItem[];
    world_exchange: MarketItem[];
    interest: MarketItem[];
    oil: MarketItem[];
    gold: MarketItem[];
    raw_materials: MarketItem[];
    top_sectors: { name: string; percent: string }[];
    top_themes: { name: string; percent: string }[];
    market_summary?: {
        kospi: MarketIndexSummary;
        kosdaq: MarketIndexSummary;
        kospi200?: MarketIndexSummary;
    };
    extra_assets?: {
        Indices: any[];
        Crypto: any[];
        Forex: any[];
        Commodity: any[];
    };
}

interface MarketDashboardProps {
    onSearch?: (term: string) => void;
    onPrefetch?: (term: string) => void;
}

export default function MarketDashboard({ onSearch, onPrefetch }: MarketDashboardProps) {
    // [Zero Loading] Initialize with Falback Data immediately
    const [data, setData] = useState<MarketDashboardData>(FALLBACK_DASHBOARD_DATA as any);

    // ... existing state ...
    const [loadingIndices, setLoadingIndices] = useState(false);
    const [loadingSectors, setLoadingSectors] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'kospi' | 'kosdaq' | 'kospi200'>('kospi');

    // ... existing useEffects ...
    useEffect(() => {
        // 0. Load Cache from LocalStorage (Instant Render)
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem("dashboard_cache_v2");
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setData(parsed);
                    setLoadingIndices(false);
                    setLoadingSectors(false);
                } catch (e) {
                    console.error("Cache parse error", e);
                }
            }
        }

        // 1. Indices (Fastest)
        const fetchIndices = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/korea/indices`);

                // [Fix] Check response status
                if (!res.ok) {
                    setLoadingIndices(false);
                    return;
                }

                const json = await res.json();
                if (json.status === "success") {
                    setData(prev => {
                        const next = { ...prev, ...json.data };
                        if (typeof window !== 'undefined') localStorage.setItem("dashboard_cache_v2", JSON.stringify(next));
                        return next;
                    });
                }
            } catch (e) {
                // [Fix] Silently ignore
            }
            finally { setLoadingIndices(false); }
        };

        // 2. Sectors (Medium)
        const fetchSectors = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/korea/sectors`);

                // [Fix] Check response status
                if (!res.ok) {
                    setLoadingSectors(false);
                    return;
                }

                const json = await res.json();
                if (json.status === "success") {
                    setData(prev => {
                        const next = { ...prev, ...json.data };
                        if (typeof window !== 'undefined') localStorage.setItem("dashboard_cache_v2", JSON.stringify(next));
                        return next;
                    });
                }
            } catch (e) {
                // [Fix] Silently ignore
            }
            finally { setLoadingSectors(false); }
        };



        // 4. Assets (Indices, Crypto - From yfinance)
        const fetchAssets = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/assets`);

                // [Fix] Check response status
                if (!res.ok) {
                    return;
                }

                const json = await res.json();
                if (json.status === "success") {
                    setData(prev => {
                        const next = { ...prev, extra_assets: json.data };
                        if (typeof window !== 'undefined') localStorage.setItem("dashboard_cache_v2", JSON.stringify(next));
                        return next;
                    });
                }
            } catch (e) {
                // [Fix] Silently ignore
            }
        };

        // 5. Market Summary (KOSPI, KOSDAQ, Investors - Critical for Real-time)
        const fetchMarketSummary = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/korea/investors`);

                // [Fix] Check response status before parsing
                if (!res.ok) {
                    // Silently ignore - this endpoint may be slow or unavailable
                    return;
                }

                const json = await res.json();
                if (json.status === "success") {
                    setData(prev => {
                        const next = {
                            ...prev,
                            market_summary: json.data.market_summary,
                            investor_items: json.data.investor_items
                        };
                        if (typeof window !== 'undefined') localStorage.setItem("dashboard_cache_v2", JSON.stringify(next));
                        return next;
                    });
                }
            } catch (e) {
                // [Fix] Silently ignore - fallback to cached data
                // console.error removed to prevent console spam
            }
        };

        fetchIndices();
        fetchSectors();
        fetchMarketSummary();
        // 5초마다 데이터 갱신 (초고속 실시간 연동)
        const interval = setInterval(() => {
            fetchIndices();
            fetchSectors();
            fetchAssets();
            fetchMarketSummary();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const refreshAll = () => {
        setLoadingIndices(true); setLoadingSectors(true);
        window.location.reload();
    };

    if (error) return (
        <div className="bg-black/40 border border-white/5 rounded-3xl p-6 h-64 flex flex-col items-center justify-center gap-4">
            <div className="text-red-400 font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
            <button onClick={refreshAll} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> 다시 시도
            </button>
        </div>
    );

    const summary = data.market_summary && activeTab in data.market_summary
        ? data.market_summary[activeTab]
        : null;

    const isPositive = (val: string | undefined | null) => {
        if (!val) return false;
        return !val.includes('-');
    };

    return (
        <>
            {/* 0. Market Summary Widget Removed (User requested to hide everything in this section including title and chart) */}
















            {/* 1. Theme Heatmap (Restored) */}
            <ThemeHeatmapWidget onSearch={onSearch} onPrefetch={onPrefetch} />

            <div className="mb-8">
                {/* 2. Top Sectors & Themes (Redesigned with CleanStockList) */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Top Sectors */}
                        <div className="bg-white/5 rounded-2xl p-0 md:p-5 border border-white/5 overflow-hidden">
                            <div className="p-4 md:p-0 pb-0 flex items-center gap-2 mb-2 md:mb-4">
                                <PieChart className="text-purple-400 w-5 h-5" />
                                <h4 className="text-white font-bold">업종 상위</h4>
                            </div>

                            <CleanStockList
                                items={data.top_sectors ? data.top_sectors.slice(0, 5).map(s => ({
                                    symbol: s.name, // Using name as symbol for display key
                                    name: s.name,
                                    price: "", // No price data for sectors usually
                                    change: s.percent
                                })) : []}
                                onItemClick={(sym) => onSearch?.(sym)}
                            />
                        </div>

                        {/* Top Themes */}
                        <div className="bg-white/5 rounded-2xl p-0 md:p-5 border border-white/5 overflow-hidden">
                            <div className="p-4 md:p-0 pb-0 flex items-center gap-2 mb-2 md:mb-4">
                                <Activity className="text-orange-400 w-5 h-5" />
                                <h4 className="text-white font-bold">테마 상위</h4>
                            </div>

                            <CleanStockList
                                items={data.top_themes ? data.top_themes.slice(0, 5).map(t => ({
                                    symbol: t.name,
                                    name: t.name,
                                    price: "",
                                    change: t.percent
                                })) : []}
                                onItemClick={(sym) => onSearch?.(sym)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

// Helper to process /api/assets data into MarketItem format with Korean translation
// ... (kept same)

// Helper to process /api/assets data into MarketItem format with Korean translation
function processAssets(items: any[] | undefined, type: 'indices' | 'crypto' | 'forex' | 'commodity'): MarketItem[] {
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
        } else if (type === 'forex') {
            if (name.includes('USD/KRW')) name = '달러/원 (USD)';
            else if (name.includes('JPY/KRW')) name = '엔/원 (JPY)';
            else if (name.includes('EUR/KRW')) name = '유로/원 (EUR)';
            else if (name.includes('CNY/KRW')) name = '위안/원 (CNY)';
            else if (name.includes('GBP/KRW')) name = '파운드/원 (GBP)';
        } else if (type === 'commodity') {
            if (name === 'Gold') name = '국제 금';
            else if (name === 'Silver') name = '국제 은';
            else if (name === 'Crude Oil') name = 'WTI 원유';
            else if (name === 'Natural Gas') name = '천연가스';
            else if (name === 'Copper') name = '구리';
            else if (name === 'Corn') name = '옥수수';
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
            price: type === 'crypto' ? `$${priceStr}` : priceStr, // Coins in USD
            change: changeStr,
            is_up: is_up
        };
    });
}

// Helper Component (if needed, or removed if unused in new design)
function InvestorItem({ label, value, icon }: { label: string, value: string, icon: any }) {
    const isPositive = !value.includes("-");
    const colorClass = isPositive ? "text-red-400" : "text-blue-400";
    return (
        <div className="flex flex-col items-center p-2 rounded-lg hover:bg-white/5 transition-colors">
            {icon}
            <span className="text-gray-400 text-xs mb-1">{label}</span>
            <span className={`font-bold font-mono ${colorClass}`}>{value}</span>
        </div>
    );
}


// [New] Theme Heatmap Widget
function ThemeHeatmapWidget({ onSearch, onPrefetch }: { onSearch?: (term: string) => void, onPrefetch?: (term: string) => void }) {
    const [themes, setThemes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/korea/heatmap`);

                // [Fix] Check response status
                if (!res.ok) {
                    setLoading(false);
                    return;
                }

                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setThemes(json.data);
                }
            } catch (e) {
                // [Fix] Silently ignore
            } finally {
                setLoading(false);
            }
        };
        fetchHeatmap();
    }, []);

    if (loading) return (
        <div className="mb-8 bg-white/5 rounded-2xl border border-white/5 p-6 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            테마 주도주 지도(Heatmap) 그리는 중...
        </div>
    );

    if (!themes || themes.length === 0) return null;

    return (
        <div className="mb-8 bg-white/5 rounded-2xl border border-white/5 p-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                🔥 테마별 주도주 Heatmap
                <span className="text-xs font-normal text-gray-500 bg-black/30 px-2 py-0.5 rounded">실시간 거래량 상위</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.map((theme, i) => (
                    <div key={i} className="bg-black/20 rounded-xl p-4 border border-white/5 hover:border-white/20 transition-all group">
                        <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                            <div
                                className="font-bold text-gray-200 group-hover:text-white flex items-center gap-2 cursor-pointer"
                                onClick={() => onSearch?.(theme.theme)}
                                onMouseEnter={() => onPrefetch?.(theme.theme)}
                            >
                                <span className="w-5 h-5 flex items-center justify-center rounded bg-red-500/20 text-red-500 text-xs font-bold">{i + 1}</span>
                                {theme.theme}
                            </div>
                            <span className="text-red-400 font-bold text-sm bg-red-900/10 px-1.5 rounded">{theme.percent}</span>
                        </div>

                        {/* Stocks in this theme */}
                        <div className="space-y-2">
                            {theme.stocks.map((stock: any, j: number) => (
                                <div
                                    key={j}
                                    className="flex justify-between items-center text-base cursor-pointer hover:bg-white/5 p-2 rounded"
                                    onClick={() => onSearch?.(stock.name)}
                                    onMouseEnter={() => onPrefetch?.(stock.name)}
                                >
                                    <span className="text-gray-300 text-sm font-medium w-28 truncate">{stock.name}</span>
                                    <div className={`flex-1 h-2 mx-3 rounded-full overflow-hidden bg-gray-700`}>
                                        <div
                                            className={`h-full ${stock.change > 20 ? 'bg-purple-500' : stock.change > 10 ? 'bg-red-500' : stock.change > 0 ? 'bg-red-400' : 'bg-blue-400'}`}
                                            style={{ width: `${Math.min(Math.abs(stock.change) * 3, 100)}%` }}
                                        />
                                    </div>
                                    <span className={`text-sm font-mono font-bold w-14 text-right ${stock.change > 0 ? 'text-red-400' : stock.change < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                        {stock.change > 0 ? '+' : ''}{stock.change}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MarketList({ title, icon, items, fallbackText, loading, noDecimals = false }: { title: string, icon: any, items: MarketItem[], fallbackText?: string, loading?: boolean, noDecimals?: boolean }) {
    return (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col h-full hover:border-white/20 transition-all group">
            <div className="flex items-center gap-2 mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                {icon}
                <span className="text-sm font-bold text-gray-200">{title}</span>
            </div>
            <div className="space-y-3 flex-1">
                {loading && items.length === 0 ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-600 w-5 h-5" /></div>
                ) : items.length > 0 ? items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 truncate max-w-[100px] group-hover:text-gray-300 transition-colors">{item.name.replace('미국', '').replace('일본', '').replace('유럽연합', '').replace('중국', '')}</span>
                        <div className="text-right">
                            <div className="font-bold text-white font-mono">
                                {noDecimals ? item.price.split('.')[0] : item.price}
                            </div>
                            <div className={`text-xs flex items-center justify-end gap-0.5 ${item.is_up ? 'text-red-400' : 'text-blue-400'}`}>
                                {item.is_up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {item.change}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8 text-gray-600 text-xs">
                        {fallbackText || "데이터 없음"}
                    </div>
                )}
            </div>
        </div>
    );
}

function LiveChart({ symbol }: { symbol: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChart = async () => {
            setLoading(true);
            try {
                // symbol: kospi, kosdaq, kospi200
                const res = await fetch(`${API_BASE_URL}/api/korea/chart/${symbol}`);

                // [Fix] Check response status before parsing
                if (!res.ok) {
                    setLoading(false);
                    return;
                }

                const json = await res.json();
                if (json.status === "success" && json.data) {
                    setData(json.data);
                }
            } catch (e) {
                // [Fix] Silently ignore fetch errors
            } finally {
                setLoading(false);
            }
        };
        fetchChart();
    }, [symbol]);

    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-gray-500" /></div>;
    if (!data || data.length === 0) return <div className="text-gray-500 text-sm">차트 데이터 없음</div>;

    const isUp = (data[data.length - 1]?.close || 0) >= (data[0]?.close || 0);
    const color = isUp ? "#ef4444" : "#3b82f6"; // Red or Blue

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [Number(value).toLocaleString(), '지수']}
                    labelStyle={{ display: 'none' }}
                />
                <Area
                    type="monotone"
                    dataKey="close"
                    stroke={color}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    strokeWidth={2}
                    animationDuration={1000}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
