import React from 'react';
import { Minus, ChevronRight, Trash2, Shield } from 'lucide-react';
import BlinkingPrice from './BlinkingPrice';
import { API_BASE_URL } from '@/lib/config';
import KakaoShareButton from '@/components/KakaoShareButton';


export interface CleanStockItem {
    symbol: string;
    name: string;
    price: string;
    change: string;
    change_percent?: string;
    change_price?: string;
    isRealtime?: boolean;
    unit?: string;
    badge?: {
        label: string;
        color: string;
        icon: string;
        reason?: string;
    };
    quantGrade?: string;
    added_price?: number;
    quantity?: number;
    purchases?: { id: number; buy_price: number; quantity: number; purchase_date: string }[];
    // [v2] 세션 배지
    sessionBadge?: { label: string; color: string; dot: string };
    extendedPrice?: string | number | null;
    extendedChange?: string | null;
    // [v3] 통화 정보
    currency?: string;          // 'USD' | 'KRW' | 'JPY' ...
    price_krw?: string | null;  // 해외주식 원화 환산가
    // [v4] 전문 데이터 지표 (수급, 목표가, 밸류에이션)
    proInsights?: {
        target_price?: string;
        foreign_streak?: number;
        organ_streak?: number;
        latest_foreign?: number;
        latest_organ?: number;
        is_double_buy?: boolean;
        per?: string;
        pbr?: string;
        high_52w?: string;
        low_52w?: string;
        summary_tags?: string[];
    };
}

// Helper function to extract high-value keywords and format them as hashtags
function getHashtags(reason: string): string[] {
    if (!reason) return [];
    const stopWords = new Set(["및", "등", "사업", "영위", "관련", "기업", "제조", "판매", "개발", "생산", "전문", "업체", "부문", "시장", "국내", "글로벌", "세계", "보유", "통해", "제공"]);
    const rawWords = reason.split(/[\s,./\-_+&|]+/g).map(w => w.trim());
    const words = rawWords
        .filter(w => w.length >= 2 && !stopWords.has(w))
        .map(w => w.replace(/[()[\]{}]/g, ''));
    const hashtags = words.map(w => `#${w}`);
    if (hashtags.length === 0) {
        return [`#${reason.replace(/\s+/g, '').substring(0, 10)}`];
    }
    return hashtags.slice(0, 4);
}

interface CleanStockListProps {
    items: CleanStockItem[];
    onItemClick?: (symbol: string) => void;
    onDelete?: (symbol: string) => void;
    onAlertClick?: (symbol: string, currentPrice: number, addedPrice?: number) => void;
    onEditAddedPrice?: (symbol: string, currentAddedPrice: number, currentQuantity: number) => void;
    isLoading?: boolean;
    hideLabels?: boolean;
}

export default function CleanStockList({ items, onItemClick, onDelete, onAlertClick, onEditAddedPrice, isLoading = false, hideLabels = false }: CleanStockListProps) {
    if (isLoading && items.length === 0) {
        return <div className="p-8 text-center text-gray-500 text-sm">데이터를 불러오는 중입니다...</div>;
    }

    if (items.length === 0) {
        return <div className="p-8 text-center text-gray-500 text-sm">등록된 관심종목이 없습니다.</div>;
    }

    return (
        <div className="flex flex-col divide-y divide-white/5">
            {items.map((item) => {
                const changeStr = item.change ? String(item.change) : "";
                const labelMatch = changeStr.match(/^(\[[^\]]+\])\s*/);
                const label = labelMatch ? labelMatch[1] + " " : "";
                
                const cleanStrForParse = changeStr.replace(/^\[[^\]]+\]\s*/, "");
                const changeNum = parseFloat(cleanStrForParse.replace(/[+%▼▲,]/g, ""));
                
                const isPositive = cleanStrForParse.startsWith('+') || (changeNum > 0 && !cleanStrForParse.startsWith('-'));
                const isNegative = cleanStrForParse.startsWith('-') || changeNum < 0;

                const textColorClass = isPositive ? 'text-rose-400' : isNegative ? 'text-sky-400' : 'text-gray-300';
                
                return (
                    <div
                        key={item.symbol}
                        className="relative group hover:bg-white/[0.02] transition-all"
                    >
                        {/* Main Content Area */}
                        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-y-3 gap-x-3 md:gap-6 py-4 md:py-5 px-4 md:px-6">
                            {/* 1. Stock Info (Left) */}
                            <div 
                                className="flex flex-col gap-1 min-w-[160px] flex-1 cursor-pointer active:opacity-60"
                                onClick={() => onItemClick && onItemClick(item.symbol)}
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-base md:text-lg font-black text-white tracking-tight group-hover:text-blue-400 transition-colors leading-tight" translate="no">
                                        {item.name}
                                    </span>
                                    {/* 세션 배지 */}
                                    {item.sessionBadge && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${item.sessionBadge.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.sessionBadge.dot}`} />
                                            {item.sessionBadge.label}
                                        </span>
                                    )}
                                    {item.badge && (
                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${item.badge.color}`}>
                                            <span>{item.badge.icon}</span>
                                            <span>{item.badge.label}</span>
                                        </div>
                                    )}
                                    {/* Quant Grade Badge */}
                                    {item.quantGrade && (
                                        <div 
                                            className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-lg text-[10px] md:text-xs font-black shadow-md shrink-0
                                                ${item.quantGrade === 'S' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border border-purple-400/40' : 
                                                  item.quantGrade === 'A' ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border border-blue-400/40' : 
                                                  item.quantGrade === 'B' ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white border border-emerald-400/40' : 
                                                  item.quantGrade === 'C' ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border border-amber-400/40' : 
                                                  'bg-gradient-to-br from-rose-500 to-red-600 text-white border border-rose-400/40'}`}
                                            title="퀀트 밸런스 등급"
                                        >
                                            {item.quantGrade}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                    <span className="bg-zinc-800/80 border border-white/10 px-2 py-0.5 rounded-md text-[11px] text-gray-300 font-bold tracking-wider" translate="no">
                                        {item.symbol}
                                    </span>
                                </div>
                                
                                {item.badge?.reason && (
                                    <div className="flex flex-col gap-1 mt-1.5">
                                        <div className="flex flex-wrap gap-1 max-w-[90%]">
                                            {getHashtags(item.badge.reason).map((tag, idx) => (
                                                <span 
                                                    key={idx} 
                                                    className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-md font-bold hover:bg-blue-500/20 transition-all cursor-default"
                                                    translate="no"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* [PRO] 외인/기관 수급 & 증권사 리서치 컨센서스 목표가 */}
                                {item.proInsights && (
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        {item.proInsights.is_double_buy && (
                                            <span className="text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm">
                                                🔥 외인·기관 쌍끌이
                                            </span>
                                        )}
                                        {!item.proInsights.is_double_buy && (item.proInsights.foreign_streak || 0) >= 2 && (
                                            <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                                🌐 외인 {item.proInsights.foreign_streak}일 연속매수
                                            </span>
                                        )}
                                        {!item.proInsights.is_double_buy && (item.proInsights.organ_streak || 0) >= 2 && (
                                            <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                                🏢 기관 {item.proInsights.organ_streak}일 연속매수
                                            </span>
                                        )}
                                        {item.proInsights.target_price && (
                                            <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1" title="국내 증권사 리서치센터 평균 목표주가 집계">
                                                🎯 증권사 목표가 {item.proInsights.target_price}원
                                            </span>
                                        )}
                                        {item.proInsights.per && item.proInsights.per !== 'N/A' && (
                                            <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                                📊 PER {item.proInsights.per}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2. Purchase / Average Price Box (Center) */}
                            {((item.purchases && item.purchases.length > 0) || (item.added_price ? true : false)) && (
                                <div className="order-last md:order-none w-full md:w-auto flex md:flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide px-0 md:px-2 min-w-0 md:max-w-[42vw]">
                                    {(item.purchases && item.purchases.length > 0 ? item.purchases : [{ id: 0, buy_price: item.added_price || 0, quantity: item.quantity || 0, purchase_date: '' }]).map((p, idx) => {
                                        const isUSD = item.currency && item.currency !== 'KRW';
                                        const currencySign = isUSD ? '$' : '';
                                        const currencyUnit = isUSD ? '' : '원';
                                        
                                        const curP = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
                                        const pct = p.buy_price > 0 ? ((curP - p.buy_price) / p.buy_price) * 100 : 0;
                                        const isPos = pct > 0;
                                        const isNeg = pct < 0;
                                        const badgeColor = isPos 
                                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                                            : isNeg 
                                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                                            : 'bg-zinc-800 border-white/10 text-gray-400';

                                        return (
                                            <div 
                                                key={p.id || idx} 
                                                className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border transition-all hover:border-white/20 cursor-pointer bg-zinc-950/70 shadow-sm`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEditAddedPrice) onEditAddedPrice(item.symbol, p.buy_price, p.quantity);
                                                }}
                                                title="클릭하여 매수 단가 및 수량 수정"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 font-bold">
                                                        {item.purchases && item.purchases.length > 1 ? `${idx+1}차 매수` : '매수단가'}
                                                        {p.quantity > 0 ? ` (${p.quantity.toLocaleString()}주)` : ''}
                                                    </span>
                                                    <span className="text-xs md:text-sm font-black font-mono text-white">
                                                        {currencySign}
                                                        {isUSD ? p.buy_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : p.buy_price.toLocaleString()}
                                                        {currencyUnit}
                                                    </span>
                                                </div>

                                                <div className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${badgeColor} flex flex-col items-end`}>
                                                    <span>{!isNaN(curP) && p.buy_price > 0 ? `${isPos ? '+' : ''}${pct.toFixed(2)}%` : '0.00%'}</span>
                                                    {p.buy_price > 0 && !isNaN(curP) && (
                                                        <span className="text-[9px] opacity-80 font-normal mt-0.5">
                                                            {isPos ? '+' : isNeg ? '-' : ''}
                                                            {currencySign}
                                                            {Math.abs(p.quantity > 0 ? (curP - p.buy_price) * p.quantity : (curP - p.buy_price)).toLocaleString(undefined, { minimumFractionDigits: isUSD ? 2 : 0, maximumFractionDigits: isUSD ? 2 : 0 })}
                                                            {currencyUnit}
                                                        </span>
                                                    )}
                                                </div>

                                                {isPos && (
                                                    <div 
                                                        onClick={(e) => e.stopPropagation()} 
                                                        title="수익 자랑하기"
                                                        className="ml-0.5"
                                                    >
                                                        <KakaoShareButton 
                                                            title={`🔥 ${item.name} 수익 인증!`}
                                                            description={`내가 산 ${item.name}, 지금 +${pct.toFixed(2)}% 수익 중이에요! 부럽지? 😎`}
                                                            url={`https://stock-trend-program.co.kr/discovery?q=${item.symbol}`}
                                                            buttonText=""
                                                            className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/80 transition-colors shadow-sm p-0.5"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 3. Current Price & Change Badge (Right) */}
                            <div 
                                className="flex flex-col items-end gap-1.5 shrink-0 cursor-pointer min-w-[130px]"
                                onClick={() => onItemClick && onItemClick(item.symbol)}
                            >
                                <BlinkingPrice
                                    price={item.price}
                                    className={`text-xl md:text-2xl font-black font-mono tabular-nums tracking-tight leading-none text-white`}
                                    prefix={item.currency && item.currency !== 'KRW' ? '$' : ''}
                                />

                                {/* 해외주식 원화 환산가 */}
                                {item.currency && item.currency !== 'KRW' && item.price_krw && (
                                    <span className="text-[11px] text-gray-400 font-mono tabular-nums">
                                        ≈ ₩{item.price_krw}
                                    </span>
                                )}

                                {/* 프리/에프터 가격 */}
                                {item.extendedPrice && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-indigo-300 font-black bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.25 rounded">
                                            {item.sessionBadge?.label === 'PRE' ? 'PRE' : 'AFTER'}
                                        </span>
                                        <span className={`text-[11px] font-bold font-mono ${
                                            parseFloat(String(item.extendedChange || '0').replace(/[^0-9.-]/g,'')) > 0 ? 'text-rose-400' : 'text-sky-400'
                                        }`}>
                                            {item.extendedPrice}
                                        </span>
                                    </div>
                                )}

                                {/* 등락률 뱃지 */}
                                <div className={`flex items-center gap-1 text-xs md:text-sm font-black font-mono px-2.5 py-1 rounded-xl border shadow-sm ${
                                    isPositive 
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                        : isNegative 
                                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                                        : 'bg-zinc-800 text-gray-300 border-white/10'
                                }`}>
                                    <span translate="no">
                                        {(() => {
                                            const rawChange = String(item.change || '');
                                            const rawPct = String(item.change_percent || '');
                                            
                                            const amountMatch = rawChange.match(/[0-9,.]+/);
                                            const pctMatch = rawPct.match(/[0-9,.]+/);
                                            
                                            let amountStr = amountMatch ? amountMatch[0] : '';
                                            let pctStr = pctMatch ? pctMatch[0] : '';
                                            
                                            if (!pctStr && rawChange.includes('%')) {
                                                pctStr = amountStr;
                                            }
                                            
                                            if (amountStr === pctStr && pctStr) {
                                                const curP_main = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
                                                const isUSD_main = item.currency && item.currency !== 'KRW';
                                                
                                                if (!isNaN(curP_main)) {
                                                    const pctVal = parseFloat(pctStr) / 100;
                                                    const prevP = isPositive ? (curP_main / (1 + pctVal)) : (curP_main / (1 - pctVal));
                                                    let calcAmount = Math.abs(curP_main - prevP);
                                                    
                                                    if (isUSD_main) {
                                                        amountStr = calcAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                    } else {
                                                        amountStr = Math.round(calcAmount).toLocaleString();
                                                    }
                                                }
                                            }
                                            
                                            if (amountStr && pctStr) {
                                                return `${hideLabels ? '' : label}${isPositive ? '▲ +' : isNegative ? '▼ -' : ''}${amountStr} (${pctStr}%)`;
                                            }
                                            
                                            return `${hideLabels ? '' : label}${isPositive ? '▲ +' : isNegative ? '▼ -' : ''}${pctStr || amountStr}%`;
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {/* 4. Action Buttons (Rightmost) */}
                            <div className="flex items-center gap-2 shrink-0 pl-1 md:pl-2">
                                {onAlertClick && (
                                    <button 
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const rawPrice = String(item.price || "0").replace(/[^0-9.]/g, '');
                                            onAlertClick(item.symbol, parseFloat(rawPrice), item.added_price);
                                        }}
                                        className="p-2.5 md:p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 rounded-2xl transition-all active:scale-90 shadow-sm"
                                        title="가격 알림 및 안전 방어선 설정"
                                    >
                                        <Shield className="w-4 h-4 md:w-5 md:h-5" />
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
                                        className="p-2.5 md:p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl transition-all active:scale-90 shadow-sm"
                                        title="관심종목 삭제"
                                    >
                                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
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
