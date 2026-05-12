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
    quantGrade?: string; // S, A, B, C, D
    added_price?: number; // Price when added to watchlist
}

interface CleanStockListProps {
    items: CleanStockItem[];
    onItemClick?: (symbol: string) => void;
    onDelete?: (symbol: string) => void;
    onAlertClick?: (symbol: string, currentPrice: number, addedPrice?: number) => void;
    isLoading?: boolean;
    hideLabels?: boolean;
}

export default function CleanStockList({ items, onItemClick, onDelete, onAlertClick, isLoading = false, hideLabels = false }: CleanStockListProps) {
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
                // Extract label like [정규], [야간] if present
                const labelMatch = changeStr.match(/^(\[[^\]]+\])\s*/);
                const label = labelMatch ? labelMatch[1] + " " : "";
                
                // Remove label for number parsing
                const cleanStrForParse = changeStr.replace(/^\[[^\]]+\]\s*/, "");
                const changeNum = parseFloat(cleanStrForParse.replace(/[+%▼▲,]/g, ""));
                
                const isPositive = cleanStrForParse.startsWith('+') || (changeNum > 0 && !cleanStrForParse.startsWith('-'));
                const isNegative = cleanStrForParse.startsWith('-') || changeNum < 0;

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
                                    {/* Quant Grade Badge */}
                                    {item.quantGrade && (
                                        <div 
                                            className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-md text-[11px] md:text-[12px] font-black shadow-lg shrink-0
                                                ${item.quantGrade === 'S' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border border-purple-400/50' : 
                                                  item.quantGrade === 'A' ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border border-blue-400/50' : 
                                                  item.quantGrade === 'B' ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white border border-emerald-400/50' : 
                                                  item.quantGrade === 'C' ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border border-orange-400/50' : 
                                                  'bg-gradient-to-br from-red-500 to-rose-600 text-white border border-red-400/50'}`}
                                            title="AI 퀀트 등급"
                                        >
                                            {item.quantGrade}
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
                                
                                {/* Entry Price & Yield Display */}
                                {item.added_price && item.added_price > 0 && (
                                    <div className="flex flex-col items-end mt-1">
                                        <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                                            <span className="bg-gray-800 px-1 rounded text-[9px]">진입가</span>
                                            <span className="font-mono">{item.added_price.toLocaleString()}원</span>
                                        </div>
                                        <div className={`text-[12px] font-black flex items-center gap-0.5 ${
                                            (() => {
                                                const curP = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
                                                const diff = curP - (item.added_price || 0);
                                                return diff > 0 ? 'text-red-400' : diff < 0 ? 'text-blue-400' : 'text-gray-400';
                                            })()
                                        }`}>
                                            {(() => {
                                                const curP = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
                                                const diff = curP - (item.added_price || 0);
                                                return `${diff > 0 ? '+' : ''}${diff.toLocaleString()}원`;
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <div className={`flex items-center gap-1 text-[13px] md:text-[14px] font-black ${textColorClass} bg-white/10 px-2.5 py-0.5 rounded-full shadow-lg mt-1`}>
                                    <span translate="no">
                                        {(() => {
                                            const rawChange = String(item.change || '');
                                            const cleanStrForParse = rawChange.replace(/^\[[^\]]+\]\s*/, "");
                                            const numericVal = Math.abs(parseFloat(cleanStrForParse.replace(/[+%\-▲▼,]/g, '')));
                                            
                                            let cleanValue = cleanStrForParse;
                                            if (isNaN(numericVal)) {
                                                cleanValue = cleanStrForParse;
                                            } else if (numericVal > 500 && item.change_percent) {
                                                cleanValue = String(item.change_percent).replace(/^\[[^\]]+\]\s*/, "");
                                            }
                                            
                                            const finalDisplay = cleanValue.replace(/[+%\-▲▼]/g, '');
                                            return `${hideLabels ? '' : label}${isPositive ? '▲' : isNegative ? '▼' : ''}${finalDisplay}%`;
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
                                        onAlertClick(item.symbol, parseFloat(rawPrice), item.added_price);
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
