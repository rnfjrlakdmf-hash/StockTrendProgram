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
    // [v2] 세션 배지
    sessionBadge?: { label: string; color: string; dot: string };
    extendedPrice?: string | number | null;
    extendedChange?: string | null;
    // [v3] 통화 정보
    currency?: string;          // 'USD' | 'KRW' | 'JPY' ...
    price_krw?: string | null;  // 해외주식 원화 환산가
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
                        {/* Main Content Area */}
                        <div className="flex items-center justify-between gap-2 md:gap-4 py-4 md:py-6 px-3 md:px-6">
                            {/* Stock Info */}
                            <div 
                                className="flex flex-col gap-1 min-w-0 flex-1 cursor-pointer active:opacity-50"
                                onClick={() => onItemClick && onItemClick(item.symbol)}
                            >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[16px] md:text-[21px] font-black text-white tracking-tight group-hover:text-blue-400 transition-colors leading-tight" translate="no">
                                        {item.name}
                                    </span>
                                    {/* [v2] 세션 배지 */}
                                    {item.sessionBadge && (
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] md:text-[10px] font-black border shrink-0 ${item.sessionBadge.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.sessionBadge.dot}`} />
                                            {item.sessionBadge.label}
                                        </span>
                                    )}
                                    {item.badge && (
                                        <div className={`flex items-center gap-0.5 px-1 py-0.25 rounded text-[9px] md:text-[11px] font-bold border shrink-0 ${item.badge.color}`}>
                                            <span>{item.badge.icon}</span>
                                            <span>{item.badge.label}</span>
                                        </div>
                                    )}
                                    {/* Quant Grade Badge */}
                                    {item.quantGrade && (
                                        <div 
                                            className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-md text-[10px] md:text-[12px] font-black shadow-lg shrink-0
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
                                
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] md:text-[15px] text-gray-100 font-bold">
                                    <span className="shrink-0 font-mono tracking-wider bg-white/30 px-1.5 py-0.25 rounded text-[10px] md:text-[12px] text-white font-black shadow-sm ring-1 ring-white/20" translate="no">
                                        {item.symbol}
                                    </span>
                                </div>
                                
                                {item.badge?.reason && (
                                    <div className="flex flex-col gap-1.5 mt-2.5">
                                        <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                                            {getHashtags(item.badge.reason).map((tag, idx) => (
                                                <span 
                                                    key={idx} 
                                                    className="text-[10px] md:text-[12px] bg-orange-500/10 text-orange-400 border border-orange-500/25 px-2.5 py-0.5 rounded-lg font-black shadow-md hover:bg-orange-500/20 transition-all cursor-default"
                                                    translate="no"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-[10px] md:text-[11.5px] text-zinc-400 font-bold leading-normal pl-0.5">
                                            {item.badge.reason}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Price Area */}
                            <div 
                                className="flex flex-col items-end gap-0.5 shrink-0 cursor-pointer"
                                onClick={() => onItemClick && onItemClick(item.symbol)}
                            >
                                <BlinkingPrice
                                    price={item.price}
                                    className={`text-[18px] md:text-[25px] font-black tabular-nums tracking-tight leading-none ${textColorClass}`}
                                    prefix={item.currency && item.currency !== 'KRW' ? '$' : ''}
                                />

                                {/* [v3] 해외주식 원화 환산가 병기 */}
                                {item.currency && item.currency !== 'KRW' && (
                                    <div className="flex items-center gap-1 mt-0">
                                        {item.price_krw ? (
                                            <span className="text-[10px] md:text-[11px] text-gray-400 tabular-nums tracking-tight font-bold">
                                                ≈ ₩{item.price_krw}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] text-gray-600 tracking-wider">KRW -</span>
                                        )}
                                    </div>
                                )}

                                {item.extendedPrice && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[9px] text-indigo-400 font-black bg-indigo-500/10 border border-indigo-500/20 px-1.5 rounded">
                                            {item.sessionBadge?.label === 'PRE' ? 'PRE' : 'AFTER'}
                                        </span>
                                        <span className={`text-[11px] font-black tabular-nums tracking-tight ${
                                            (() => {
                                                const chg = parseFloat(String(item.extendedChange || '0').replace(/[^0-9.-]/g,''));
                                                return chg > 0 ? 'text-red-400' : chg < 0 ? 'text-blue-400' : 'text-gray-400';
                                            })()
                                        }`}>
                                            {item.extendedPrice}
                                            {item.extendedChange && (
                                                <span className="text-[9px] ml-0.5 opacity-70">
                                                    ({parseFloat(String(item.extendedChange).replace(/[^0-9.-]/g,'')) > 0 ? '+' : ''}{item.extendedChange})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}

                                {/* Entry Price & Yield Display */}
                                {(item.added_price !== undefined || item.quantity !== undefined) && (
                                    <div 
                                        className="flex flex-col items-end mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEditAddedPrice) onEditAddedPrice(item.symbol, item.added_price || 0, item.quantity || 0);
                                        }}
                                        title="진입가 및 수량 설정/수정"
                                    >
                                        {(item.added_price || 0) > 0 || (item.quantity && item.quantity > 0) ? (
                                            <>
                                                {(() => {
                                                    const isUSD = item.currency && item.currency !== 'KRW';
                                                    const currencySign = isUSD ? '$' : '';
                                                    const currencyUnit = isUSD ? '' : '원';
                                                    const curP = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
                                                    const addedP = item.added_price || 0;
                                                    
                                                    const perShareDiff = !isNaN(curP) ? (curP - addedP) : 0;
                                                    const totalDiff = perShareDiff * (item.quantity && item.quantity > 0 ? item.quantity : 1);
                                                    const pct = addedP > 0 ? ((curP - addedP) / addedP) * 100 : 0;
                                                    
                                                    const isDiffPositive = perShareDiff > 0;
                                                    const isDiffNegative = perShareDiff < 0;
                                                    const diffColorClass = isDiffPositive ? 'text-red-400' : isDiffNegative ? 'text-blue-400' : 'text-gray-400';

                                                    // 해외 주식이고 환율 정보(price_krw)가 있는 경우, 원화 환산 손익도 계산
                                                    let krwDiffStr = "";
                                                    if (isUSD && item.price_krw && !isNaN(curP) && curP > 0) {
                                                        const rawKrwPrice = parseFloat(String(item.price_krw).replace(/[^0-9.]/g, ''));
                                                        if (!isNaN(rawKrwPrice)) {
                                                            const exchangeRate = rawKrwPrice / curP;
                                                            const totalDiffKrw = totalDiff * exchangeRate;
                                                            krwDiffStr = ` (≈ ₩${Math.round(totalDiffKrw).toLocaleString()})`;
                                                        }
                                                    }

                                                    return (
                                                        <>
                                                            <div className="text-[9px] md:text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                                                <span className="bg-blue-600/30 text-blue-300 px-1 rounded text-[8px]">보유</span>
                                                                <span className="font-mono">
                                                                    {currencySign}
                                                                    {isUSD 
                                                                        ? addedP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                        : addedP.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                    {currencyUnit}
                                                                    {item.quantity && item.quantity > 0 ? ` (${item.quantity.toLocaleString()}주)` : ''} 
                                                                    <span className="text-[8px] text-gray-500 ml-1">✎</span>
                                                                </span>
                                                            </div>
                                                            {addedP > 0 && (
                                                                <div className={`text-[10px] md:text-[12px] font-black flex items-center gap-0.5 ${diffColorClass}`}>
                                                                    {isNaN(curP) ? "로딩중..." : (
                                                                        `${totalDiff > 0 ? '+' : ''}${currencySign}${
                                                                            isUSD
                                                                                ? totalDiff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                                : totalDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                                        }${currencyUnit} (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)${krwDiffStr}`
                                                                    )}
                                                                    
                                                                    {/* 자랑하기 버튼 (수익 중일 때만 표시) */}
                                                                    {pct > 0 && (
                                                                        <div onClick={(e) => e.stopPropagation()} className="ml-2 inline-block">
                                                                            {(() => {
                                                                                const shareUrl = new URL(`${getApiBaseUrl() === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/api/og`);
                                                                                shareUrl.searchParams.set('title', item.name || item.symbol);
                                                                                shareUrl.searchParams.set('subtitle', '세력 포착 라이브 알림 덕분!');
                                                                                shareUrl.searchParams.set('theme', '내 수익률 인증');
                                                                                shareUrl.searchParams.set('change', `+${pct.toFixed(2)}%`);
                                                                                
                                                                                return (
                                                                                    <KakaoShareButton 
                                                                                        title={`[수익인증] ${item.name} +${pct.toFixed(2)}%`}
                                                                                        description="제가 보유한 종목의 수익률을 확인해보세요! 스톡 트렌드 프로그램의 무료 프리미엄 알림 덕분입니다."
                                                                                        url={`${API_BASE_URL === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/stock/${item.symbol.split('.')[0]}`}
                                                                                        imageUrl={shareUrl.toString()}
                                                                                        customIcon={<span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded shadow">자랑하기 🔥</span>}
                                                                                    />
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <div className="text-[9px] md:text-[10px] text-gray-500 font-bold flex items-center gap-1 mt-1">
                                                <span className="bg-gray-800 px-1 rounded text-[8px]">보유 미설정</span>
                                                <span className="font-mono hover:text-blue-400 transition-colors text-[9px]">입력 ✎</span>
                                            </div>
                                        )}
                                    </div>
                                )}


                                <div className={`flex items-center gap-0.5 text-[11px] md:text-[14px] font-black ${textColorClass} bg-white/10 px-2 py-0.25 rounded-full shadow-lg mt-0.5`}>
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

                            {/* Actions Area */}
                            <div className="flex items-center gap-1 md:gap-2 shrink-0 pl-1 md:pl-2">
                                {onAlertClick && (
                                    <button 
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const rawPrice = String(item.price || "0").replace(/[^0-9.]/g, '');
                                            onAlertClick(item.symbol, parseFloat(rawPrice), item.added_price);
                                        }}
                                        className="p-2 md:p-3.5 bg-blue-600 text-white rounded-xl md:rounded-2xl transition-all active:scale-50 cursor-pointer shadow-2xl flex items-center justify-center border border-yellow-400/50 md:border-2 md:border-yellow-400 hover:ring-4 hover:ring-blue-400"
                                        title="방어막 설정"
                                    >
                                        <Shield className="w-4 h-4 md:w-6 md:h-6" />
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
                                        className="p-2 md:p-3.5 bg-red-600 text-white rounded-xl md:rounded-2xl transition-all active:scale-50 cursor-pointer shadow-2xl flex items-center justify-center border border-yellow-400/50 md:border-2 md:border-yellow-400 hover:ring-4 hover:ring-red-400"
                                        title="삭제"
                                    >
                                        <Trash2 className="w-4 h-4 md:w-6 md:h-6" />
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
