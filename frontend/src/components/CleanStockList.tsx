import React from 'react';
import { Minus, ChevronRight, Trash2, Shield } from 'lucide-react';
import BlinkingPrice from './BlinkingPrice';

export interface CleanStockItem {
    symbol: string;
    name: string;
    price: string;
    change: string; // "+1.5%" or "-0.2%" or "0%"
    change_price?: string; // Optional absolute change value
    isRealtime?: boolean;
    unit?: string;
    // [New] Verification Badge
    badge?: {
        label: string;
        color: string;
        icon: string;
        reason?: string;
    };
    added_price?: number; // Price when added to watchlist
}

interface CleanStockListProps {
    items: CleanStockItem[];
    onItemClick?: (symbol: string) => void;
    onDelete?: (symbol: string) => void;
    onAlertClick?: (symbol: string, currentPrice: number) => void;
    isLoading?: boolean;
}

export default function CleanStockList({ items, onItemClick, onDelete, onAlertClick, isLoading = false }: CleanStockListProps) {
    if (isLoading && items.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-sm">로딩중...</div>;
    }

    if (items.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-sm">데이터가 없습니다.</div>;
    }

    return (
        <div className="flex flex-col divide-y divide-white/5">
            {items.map((item) => {
                const changeStr = item.change ? String(item.change) : "";
                const changeNum = parseFloat(changeStr.replace(/[+%▼▲]/g, ""));
                
                const isPositive = changeStr.startsWith('+') || (changeNum > 0 && !changeStr.startsWith('-'));
                const isNegative = changeStr.startsWith('-') || changeNum < 0;

                const textColorClass = isPositive ? 'text-red-400' : isNegative ? 'text-blue-400' : 'text-gray-300';
                
                return (
                    <div
                        key={item.symbol}
                        className="relative group border-b border-white/5 last:border-0 border-l-4 border-orange-500 shadow-[inset_4px_0_10px_-4px_rgba(249,115,22,0.3)] hover:bg-white/[0.03] transition-all"
                    >
                        {/* Main Clickable Row Area */}
                        <div 
                            className="flex items-center justify-between gap-4 py-6 px-4 md:px-6 cursor-pointer active:bg-white/5 pr-32"
                            onClick={() => onItemClick && onItemClick(item.symbol)}
                        >
                            {/* Left Side: Name, Symbol, Badge, Reason */}
                            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[19px] md:text-[21px] font-black text-white tracking-tight group-hover:text-blue-400 transition-colors leading-tight" translate="no">
                                        {item.name}
                                    </span>
                                    {/* Badge Rendering */}
                                    {item.badge && (
                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] md:text-[11px] font-bold border shrink-0 ${item.badge.color}`}>
                                            <span>{item.badge.icon}</span>
                                            <span>{item.badge.label}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 text-[13px] md:text-[15px] text-gray-100 font-bold">
                                    <span className="shrink-0 font-mono tracking-wider bg-white/30 px-2 py-0.5 rounded text-[12px] text-white font-black shadow-sm ring-1 ring-white/20" translate="no">
                                        {item.symbol}
                                    </span>
                                    {/* Badge Reason */}
                                    {item.badge?.reason && (
                                        <div className="mt-1 w-full">
                                            <p className="text-[13px] md:text-[14px] text-white leading-snug break-words opacity-90" suppressHydrationWarning>
                                                <span>- </span><span>{item.badge.reason}</span>
                                            </p>
                                        </div>
                                    )}
                                    {/* Added Price & Profit */}
                                    {item.added_price && item.added_price > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-[10px] text-gray-500">관심 등록가: {item.added_price.toLocaleString()}</span>
                                            {(() => {
                                                const current = parseFloat(String(item.price || "0").replace(/[^0-9.]/g, ""));
                                                if (isNaN(current) || current <= 0) return null;
                                                const profitRate = ((current - item.added_price) / item.added_price) * 100;
                                                if (Math.abs(profitRate) > 1000 || item.added_price < 1) return null;
                                                const isPlus = profitRate > 0;
                                                return (
                                                    <span className={`text-[10px] font-black ${isPlus ? 'text-red-400' : 'text-blue-400'}`}>
                                                        ({isPlus ? '+' : ''}{profitRate.toFixed(2)}%)
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Center/Right Side: Price & Change */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <BlinkingPrice
                                    price={item.price}
                                    className={`text-[21px] md:text-[25px] font-black font-mono tracking-tighter leading-none ${textColorClass}`}
                                />
                                <div className={`flex items-center gap-1 text-[13px] md:text-[14px] font-black ${textColorClass} bg-white/10 px-2.5 py-0.5 rounded-full shadow-lg`}>
                                    <span translate="no">
                                        {(() => {
                                            const rawChange = String(item.change || '');
                                            const numericVal = Math.abs(parseFloat(rawChange.replace(/[+%\-▲▼,]/g, '')));
                                            const cleanValue = (numericVal > 500) ? (item.change_percent || '0.00%') : rawChange;
                                            const finalDisplay = cleanValue.replace(/[+%\-▲▼]/g, '');
                                            return `${isPositive ? '▲' : isNegative ? '▼' : ''}${finalDisplay}%`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions (Isolated Absolute Layer) */}
                        <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 z-50 pointer-events-auto">
                            {onAlertClick && (
                                <div 
                                    role="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const rawPrice = String(item.price || "0").replace(/[^0-9.]/g, '');
                                        onAlertClick(item.symbol, parseFloat(rawPrice));
                                    }}
                                    className="p-3 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl transition-all active:scale-90 border border-blue-500/30 cursor-pointer shadow-xl backdrop-blur-md"
                                    title="방어막 설정"
                                >
                                    <Shield className="w-5 h-5" />
                                </div>
                            )}
                            
                            {onDelete && (
                                <div 
                                    role="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDelete(item.symbol);
                                    }}
                                    className="p-3 bg-red-600/10 hover:bg-red-600 text-gray-400 hover:text-white rounded-xl transition-all active:scale-90 border border-white/10 hover:border-red-500 cursor-pointer shadow-xl backdrop-blur-md"
                                    title="삭제"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
