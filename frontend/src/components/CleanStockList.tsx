import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Trash2, Shield } from 'lucide-react';
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
                const isPositive = item.change && (item.change.startsWith('+') || (!item.change.startsWith('-') && item.change !== '0%') && parseFloat(item.change) > 0);
                const isNegative = item.change && (item.change.startsWith('-') || parseFloat(item.change) < 0);

                const textColorClass = isPositive ? 'text-red-400' : isNegative ? 'text-blue-400' : 'text-gray-300';
                const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;
                
                return (
                    <div
                        key={item.symbol}
                        className="hover:bg-white/[0.03] active:bg-white/10 transition-all cursor-pointer py-6 px-4 md:px-6 flex items-center justify-between gap-4 group border-b border-white/5 last:border-0"
                        onClick={() => onItemClick && onItemClick(item.symbol)}
                    >
                        {/* Left Side: Name, Symbol, Badge, Reason */}
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[19px] md:text-[21px] font-black text-white tracking-tight group-hover:text-blue-400 transition-colors leading-tight">
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
                                <span className="shrink-0 font-mono tracking-wider bg-white/30 px-2 py-0.5 rounded text-[12px] text-white font-black shadow-sm ring-1 ring-white/20">
                                    {item.symbol}
                                </span>
                                {/* Badge Reason */}
                                {item.badge?.reason && (
                                    <span className="text-[13px] md:text-[14px] text-white leading-snug break-words">
                                        - {item.badge.reason}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Price & Change & Actions */}
                        <div className="flex items-center gap-5 shrink-0 ml-4">
                            {/* Price & Change */}
                            <div className="flex flex-col items-end gap-1.5 min-w-[90px] md:min-w-[110px]">
                                <BlinkingPrice
                                    price={item.price}
                                    className={`text-[21px] md:text-[25px] font-black font-mono tracking-tighter leading-none ${textColorClass}`}
                                />
                                <div className={`flex items-center gap-1 text-[13px] md:text-[14px] font-black ${textColorClass} bg-white/10 px-2.5 py-0.5 rounded-full shadow-lg shadow-black/20`}>
                                    <Icon className="w-3.5 h-3.5" strokeWidth={4} />
                                    <span>{item.change}</span>
                                </div>
                            </div>

                            {/* Actions (Hidden on tiny mobile, visible from sm up) */}
                            <div className="hidden sm:flex items-center gap-1.5 bg-white/5 rounded-xl p-1 border border-white/5">
                                {onAlertClick && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const numericPrice = parseFloat(item.price.replace(/,/g, ''));
                                            onAlertClick(item.symbol, numericPrice);
                                        }}
                                        className="p-2.5 text-blue-400/80 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all active:scale-95"
                                        title="방어막(알림) 설정"
                                    >
                                        <Shield className="w-4.5 h-4.5" />
                                    </button>
                                )}
                                
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(item.symbol);
                                        }}
                                        className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                                        title="삭제"
                                    >
                                        <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
