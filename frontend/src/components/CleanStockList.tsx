import React from 'react';
import { Minus, ChevronRight, Trash2, Shield } from 'lucide-react';
import BlinkingPrice from './BlinkingPrice';

export interface CleanStockItem {
    symbol: string;
    name: string;
    price: string;
    change: string; // "+1.5%" or "-0.2%" or "0%"
    change_percent?: string; // Percent value for fallback
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
                        {/* Main Content Area (Limited Click Zone) */}
                        <div className="flex items-center justify-between gap-4 py-6 px-4 md:px-6">
                            <div 
                                className="flex flex-col gap-1.5 min-w-0 flex-1 cursor-pointer active:opacity-50"
                                onClick={() => onItemClick && onItemClick(item.symbol)}
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[19px] md:text-[21px] font-black text-white tracking-tight group-hover:text-blue-400 transition-colors leading-tight" translate="no">
                                        {item.name}
                                    </span>
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
                                </div>
                            </div>

                            {/* Price Area (Also Clickable) */}
                            <div 
                                className="flex flex-col items-end gap-1 shrink-0 cursor-pointer pr-24 md:pr-32"
                                onClick={() => onItemClick && onItemClick(item.symbol)}
                            >
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

                        {/* Actions (Standalone High-Priority Layer) */}
                        <div className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 z-[99999]">
                            {onAlertClick && (
                                <button 
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const rawPrice = String(item.price || "0").replace(/[^0-9.]/g, '');
                                        onAlertClick(item.symbol, parseFloat(rawPrice));
                                    }}
                                    className="p-3.5 bg-blue-600 text-white rounded-2xl transition-all active:scale-50 cursor-pointer shadow-2xl flex items-center justify-center border-2 border-yellow-400 hover:ring-4 hover:ring-blue-400"
                                    title="방어막 설정"
                                >
                                    <Shield className="w-6 h-6" />
                                </button>
                            )}
                            
                            {onDelete && (
                                <button 
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDelete(item.symbol);
                                    }}
                                    className="p-3.5 bg-red-600 text-white rounded-2xl transition-all active:scale-50 cursor-pointer shadow-2xl flex items-center justify-center border-2 border-yellow-400 hover:ring-4 hover:ring-red-400"
                                    title="삭제"
                                >
                                    <Trash2 className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
