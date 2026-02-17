import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Trash2 } from 'lucide-react';
import BlinkingPrice from './BlinkingPrice';

export interface CleanStockItem {
    symbol: string;
    name: string;
    price: string;
    change: string; // "+1.5%" or "-0.2%" or "0%"
    change_price?: string; // Optional absolute change value
    // [New] Verification Badge
    badge?: {
        label: string;
        color: string;
        icon: string;
        reason?: string;
    };
}

interface CleanStockListProps {
    items: CleanStockItem[];
    onItemClick?: (symbol: string) => void;
    onDelete?: (symbol: string) => void;
    isLoading?: boolean;
}

export default function CleanStockList({ items, onItemClick, onDelete, isLoading = false }: CleanStockListProps) {
    if (isLoading && items.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-sm">로딩중...</div>;
    }

    if (items.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-sm">데이터가 없습니다.</div>;
    }

    return (
        <div className="flex flex-col divide-y divide-white/5">
            {items.map((item) => {
                const isPositive = item.change && (item.change.startsWith('+') || (!item.change.startsWith('-') && item.change !== '0%') && parseFloat(item.change) > 0);
                const isNegative = item.change && (item.change.startsWith('-') || parseFloat(item.change) < 0);

                const textColorClass = isPositive ? 'text-red-400' : isNegative ? 'text-blue-400' : 'text-gray-300';
                const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

                return (
                    <div
                        key={item.symbol}
                        className="active:bg-white/10 transition-colors cursor-pointer py-3.5 px-4 flex items-center justify-between group relative"
                    >
                        <div
                            className="flex-1 flex items-center justify-between min-w-0 pr-2"
                            onClick={() => onItemClick && onItemClick(item.symbol)}
                        >
                            {/* Left: Name & Symbol & Badge */}
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[15px] font-bold text-white tracking-tight group-hover:text-blue-100 transition-colors whitespace-nowrap">
                                        {item.name}
                                    </span>
                                    {/* Badge Rendering */}
                                    {item.badge && (
                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${item.badge.color}`}>
                                            <span>{item.badge.icon}</span>
                                            <span>{item.badge.label}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium min-w-0">
                                    <span className="shrink-0 font-mono">{item.symbol}</span>
                                    {/* Badge Reason */}
                                    {item.badge?.reason && (
                                        <span className="text-[11px] text-gray-600 truncate min-w-0">
                                            - {item.badge.reason}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right: Price & Change */}
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                {/* Blinking Price Component */}
                                <BlinkingPrice
                                    price={item.price}
                                    className={`text-[15px] font-bold font-mono tracking-tight ${textColorClass}`}
                                />

                                <div className={`flex items-center gap-1 text-[12px] font-medium ${textColorClass}`}>
                                    <Icon className="w-3 h-3" strokeWidth={3} />
                                    <span>{item.change}</span>
                                </div>
                            </div>
                        </div>

                        {/* Delete Button */}
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item.symbol);
                                }}
                                className="absolute right-2 p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors z-10"
                                title="삭제"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
