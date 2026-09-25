import React from 'react';
import { Minus, ChevronRight, Trash2, Shield, Sparkles, Pencil, TrendingUp, TrendingDown } from 'lucide-react';
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
    // [v4] 전문 데이터 지표 (수급, 목표가, 밸류에이션, ETF 전용 6대 인텔리전스)
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
        is_etf?: boolean;
        etf_info?: {
            amc?: string;
            brand?: string;
            category?: string;
            base_index?: string;
            nav?: string;
            nav_gap?: string;
            nav_gap_num?: number | null;
            nav_status?: string;
            aum?: string;
            trading_value?: string;
            turnover_rate?: string;
            ter?: string;
            dividend_yield?: string;
            return_1m?: string;
            return_3m?: string;
            return_6m?: string;
            return_1y?: string;
            high_52w?: string;
            low_52w?: string;
        };
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

// [Interactive Tooltip Component for PC Hover & Mobile Tap]
function BadgeTooltip({ 
    children, 
    title, 
    desc, 
    badgeClass 
}: { 
    children: React.ReactNode; 
    title: string; 
    desc: string; 
    badgeClass: string; 
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div 
            className="relative inline-flex items-center"
            onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
            }}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <span className={`${badgeClass} cursor-pointer transition-all hover:scale-105 active:scale-95 select-none`}>
                {children}
            </span>

            {/* Floating Tooltip Bubble */}
            {isOpen && (
                <div 
                    className="absolute bottom-full left-0 mb-2 w-56 sm:w-64 p-3 bg-zinc-950/95 border border-white/20 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-left pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-white/10">
                        <span className="text-[11px] font-black text-white flex items-center gap-1">
                            💡 {title}
                        </span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                            className="text-gray-400 hover:text-white text-[10px] p-0.5"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-300 leading-relaxed font-normal">
                        {desc}
                    </p>
                    <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-zinc-950 pointer-events-none" />
                </div>
            )}
        </div>
    );
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
                
                const curPriceNum = parseFloat(String(item.price || '0').replace(/[^0-9.]/g, ''));
                let upsidePct: number | null = null;
                if (item.proInsights?.target_price && curPriceNum > 0) {
                    const targetPriceNum = parseFloat(String(item.proInsights.target_price).replace(/[^0-9.]/g, ''));
                    if (targetPriceNum > 0) {
                        upsidePct = ((targetPriceNum - curPriceNum) / curPriceNum) * 100;
                    }
                }

                const isEtfItem = Boolean(
                    item.proInsights?.is_etf ||
                    item.proInsights?.etf_info ||
                    /^(KODEX|TIGER|KBSTAR|RISE|ACE|SOL|HANARO|ARIRANG|PLUS|KOSEF|TIMEFOLIO|1Q|WOORI|BNK|WON|UNICORN|FOCUS|KOACT|TREX|HK)\s/i.test(item.name || '') ||
                    ['SPY', 'QQQ', 'SOXL', 'TQQQ', 'SCHD', 'VOO', 'IVV', 'IWM', 'TLT', 'JEPI', 'JEPQ', 'DIA', 'XLK', 'SOXX', 'SMH', 'NVDL', 'TSLL', 'CONL', 'BITO', 'ARKK', 'SGOV', 'SQQQ', 'SOXS', 'TMF', 'XLF', 'XLE', 'XLV', 'GLD', 'SLV', 'IBIT'].includes(String(item.symbol || '').toUpperCase()) ||
                    String(item.name || '').toUpperCase().includes('ETF')
                );
                const etfInfo = item.proInsights?.etf_info;

                // 52주 가격 위치 계산 (ETF 및 일반 주식 공통)
                const high52Raw = etfInfo?.high_52w || item.proInsights?.high_52w;
                const low52Raw = etfInfo?.low_52w || item.proInsights?.low_52w;
                const high52Num = high52Raw ? parseFloat(String(high52Raw).replace(/[^0-9.]/g, '')) : 0;
                const low52Num = low52Raw ? parseFloat(String(low52Raw).replace(/[^0-9.]/g, '')) : 0;
                const pos52Pct = (high52Num > low52Num && curPriceNum > 0)
                    ? Math.max(0, Math.min(100, ((curPriceNum - low52Num) / (high52Num - low52Num)) * 100))
                    : null;
                
                return (
                    <div
                        key={item.symbol}
                        className="relative group hover:bg-white/[0.02] transition-all"
                    >
                        {/* Main Content Area - Spacious Rows */}
                        <div className="flex flex-col gap-3 py-4 md:py-5 px-4 md:px-6">
                            {/* [Row 1] Stock Name & Symbol (Left) vs Current Price & Daily Change (Right) */}
                            <div className="flex items-start justify-between gap-3">
                                {/* Left: Stock Name, Session Badge, Quant Grade, Symbol */}
                                <div 
                                    className="flex flex-col gap-1.5 min-w-0 flex-1 cursor-pointer active:opacity-60"
                                    onClick={() => {
                                        if (isEtfItem) {
                                            const cleanSym = item.symbol ? (item.symbol.split('.')[0] || item.symbol) : item.symbol;
                                            window.location.href = `/etf-analysis?symbol=${cleanSym}`;
                                        } else if (onItemClick) {
                                            onItemClick(item.symbol);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                        {isEtfItem && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                                📊 ETF
                                            </span>
                                        )}
                                        <span className="text-base sm:text-lg font-black text-white tracking-tight group-hover:text-blue-400 transition-colors leading-tight" translate="no">
                                            {item.name}
                                        </span>
                                        {/* 세션 배지 */}
                                        {item.sessionBadge && (
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${item.sessionBadge.color}`}>
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
                                            <BadgeTooltip
                                                title="퀀트 밸런스 등급"
                                                desc="재무 건전성, 거래량 모멘텀, 수급 및 성장성을 종합 평가한 점수 등급입니다. (S/A등급: 최우수, B등급: 우수, C/D등급: 주의)"
                                                badgeClass={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-lg text-[10px] md:text-xs font-black shadow-md shrink-0
                                                    ${item.quantGrade === 'S' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border border-purple-400/40' : 
                                                      item.quantGrade === 'A' ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border border-blue-400/40' : 
                                                      item.quantGrade === 'B' ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white border border-emerald-400/40' : 
                                                      item.quantGrade === 'C' ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border border-amber-400/40' : 
                                                      'bg-gradient-to-br from-rose-500 to-red-600 text-white border border-rose-400/40'}`}
                                            >
                                                {item.quantGrade}
                                            </BadgeTooltip>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-400 font-mono">
                                        <span className="bg-zinc-800/80 border border-white/10 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] text-gray-300 font-bold tracking-wider shrink-0" translate="no">
                                            {item.symbol}
                                        </span>
                                        {etfInfo?.amc && (
                                            <BadgeTooltip
                                                title="ETF 자산운용사 및 브랜드"
                                                desc={`${etfInfo.amc}에서 설계·운용하는 ${etfInfo.brand || 'ETF'} 상장지수펀드 상품입니다.`}
                                                badgeClass="bg-zinc-900/90 border border-white/10 px-2 py-0.5 rounded-md text-[10px] text-zinc-300 font-sans font-bold shrink-0"
                                            >
                                                🏛️ {etfInfo.amc}
                                            </BadgeTooltip>
                                        )}
                                        {etfInfo?.base_index && (
                                            <BadgeTooltip
                                                title="추종 기초지수 (Underlying Index)"
                                                desc={`이 ETF가 매일 수익률을 그대로 따라가도록 설계된 기준 지수(${etfInfo.base_index})입니다.`}
                                                badgeClass="bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-md text-[10px] text-indigo-300 font-sans font-bold shrink-0"
                                            >
                                                📌 추종지수: {etfInfo.base_index}
                                            </BadgeTooltip>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Realtime Price & Daily Change */}
                                <div 
                                    className="flex flex-col items-end gap-1 shrink-0 cursor-pointer text-right"
                                    onClick={() => {
                                        if (isEtfItem) {
                                            const cleanSym = item.symbol ? (item.symbol.split('.')[0] || item.symbol) : item.symbol;
                                            window.location.href = `/etf-analysis?symbol=${cleanSym}`;
                                        } else if (onItemClick) {
                                            onItemClick(item.symbol);
                                        }
                                    }}
                                >
                                    <BlinkingPrice
                                        price={item.price}
                                        className="text-lg sm:text-xl md:text-2xl font-black font-mono tabular-nums tracking-tight leading-none text-white"
                                        prefix={item.currency && item.currency !== 'KRW' ? '$' : ''}
                                    />

                                    {/* 해외주식 원화 환산가 */}
                                    {item.currency && item.currency !== 'KRW' && item.price_krw && (
                                        <span className="text-[10px] sm:text-[11px] text-gray-400 font-mono tabular-nums">
                                            ≈ ₩{item.price_krw}
                                        </span>
                                    )}

                                    {/* 프리/에프터 및 국내 시간외 가격 (정규장 종가와 완전히 같고 변동이 0%인 경우 중복 노출 방지) */}
                                    {(() => {
                                        if (!item.extendedPrice) return null;
                                        const cleanRegular = String(item.price || '').replace(/[^0-9.]/g, '');
                                        const cleanExt = String(item.extendedPrice || '').replace(/[^0-9.]/g, '');
                                        const extChangeNum = parseFloat(String(item.extendedChange ?? '0').replace(/[^0-9.-]/g, ''));
                                        
                                        // 정규장 종가와 시간외 가격이 동일하고 변동률도 0%이면 중복 숫자 노출 생략
                                        if (cleanRegular && cleanExt && cleanRegular === cleanExt && Math.abs(extChangeNum) === 0) {
                                            return null;
                                        }

                                        const extPriceFormatted = typeof item.extendedPrice === 'number'
                                            ? (item.currency === 'KRW' ? Math.round(item.extendedPrice).toLocaleString() : item.extendedPrice.toFixed(2))
                                            : String(item.extendedPrice);

                                        const extChangeStr = item.extendedChange !== undefined && item.extendedChange !== null && item.extendedChange !== ''
                                            ? (typeof item.extendedChange === 'number'
                                                ? `${item.extendedChange > 0 ? '+' : ''}${item.extendedChange.toFixed(2)}%`
                                                : String(item.extendedChange))
                                            : '';

                                        return (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shadow-sm">
                                                <span className="text-[9px] text-indigo-300 font-black flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                    {item.currency === 'KRW' ? (item.sessionBadge?.label === '프리' ? '프리' : '시간외') : (item.sessionBadge?.label === 'PRE' ? 'PRE' : 'AFTER')}
                                                </span>
                                                <span className={`text-[11px] font-black font-mono ${
                                                    extChangeNum > 0 ? 'text-rose-400' : 
                                                    extChangeNum < 0 ? 'text-sky-400' : 'text-zinc-300'
                                                }`}>
                                                    {item.currency === 'KRW' ? `${extPriceFormatted}원` : `$${extPriceFormatted}`}
                                                    {extChangeStr && (
                                                        <span className="ml-1 text-[10px] font-bold">
                                                            {extChangeStr.includes('(') ? extChangeStr : `(${extChangeStr})`}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })()}

                                    {/* 등락률 뱃지 */}
                                    <div className={`flex items-center gap-1 text-[11px] sm:text-xs md:text-sm font-black font-mono px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border shadow-sm ${
                                        isPositive 
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                            : isNegative 
                                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                                            : 'bg-zinc-800 text-gray-300 border-white/10'
                                    }`}>
                                        <span translate="no" className="whitespace-nowrap">
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
                            </div>

                            {/* [Row 2] Hashtags & Pro Insights Badges (Full Width, Detailed Streaks & Quantities) */}
                            {((item.badge?.reason) || (item.proInsights && (item.proInsights.is_double_buy || item.proInsights.foreign_streak || item.proInsights.organ_streak || item.proInsights.latest_foreign || item.proInsights.latest_organ || item.proInsights.target_price || (item.proInsights.per && item.proInsights.per !== 'N/A') || etfInfo))) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {/* Hashtags */}
                                    {item.badge?.reason && getHashtags(item.badge.reason).map((tag, idx) => (
                                        <span 
                                            key={idx} 
                                            className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-md font-bold hover:bg-blue-500/20 transition-all cursor-default whitespace-nowrap"
                                            translate="no"
                                        >
                                            {tag}
                                        </span>
                                    ))}

                                    {/* Pro Insights: 외인/기관 동반 쌍끌이 + 개별 연속일수 및 순매수 수량 */}
                                    {item.proInsights?.is_double_buy && (
                                        <BadgeTooltip
                                            title="외인·기관 쌍끌이 순매수"
                                            desc="외국인과 기관계 자금이 동시에 순매수(동반 매집) 중인 종목입니다. 메이저 수급이 함께 유입되고 있습니다."
                                            badgeClass="text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"
                                        >
                                            🔥 외인·기관 쌍끌이
                                        </BadgeTooltip>
                                    )}
                                    {((item.proInsights?.foreign_streak || 0) >= 1 || (item.proInsights?.latest_foreign || 0) > 0) && (
                                        <BadgeTooltip
                                            title="외국인 수급 현황"
                                            desc={`외국인 투자자가 ${(item.proInsights?.foreign_streak || 0) >= 2 ? `최근 ${item.proInsights?.foreign_streak}일 연속` : '당일'} 순매수(${item.proInsights?.latest_foreign ? `+${item.proInsights.latest_foreign.toLocaleString()}주` : '유입'}) 중입니다.`}
                                            badgeClass="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"
                                        >
                                            🌐 외인 {(item.proInsights?.foreign_streak || 0) >= 2 ? `${item.proInsights?.foreign_streak}일 연속` : '순매수'}
                                            {item.proInsights?.latest_foreign && item.proInsights.latest_foreign > 0 ? ` (+${item.proInsights.latest_foreign.toLocaleString()}주)` : ''}
                                        </BadgeTooltip>
                                    )}
                                    {((item.proInsights?.organ_streak || 0) >= 1 || (item.proInsights?.latest_organ || 0) > 0) && (
                                        <BadgeTooltip
                                            title="기관 수급 현황"
                                            desc={`기관계(금융투자·연기금·투신 등)가 ${(item.proInsights?.organ_streak || 0) >= 2 ? `최근 ${item.proInsights?.organ_streak}일 연속` : '당일'} 순매수(${item.proInsights?.latest_organ ? `+${item.proInsights.latest_organ.toLocaleString()}주` : '유입'}) 중입니다.`}
                                            badgeClass="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"
                                        >
                                            🏢 기관 {(item.proInsights?.organ_streak || 0) >= 2 ? `${item.proInsights?.organ_streak}일 연속` : '순매수'}
                                            {item.proInsights?.latest_organ && item.proInsights.latest_organ > 0 ? ` (+${item.proInsights.latest_organ.toLocaleString()}주)` : ''}
                                        </BadgeTooltip>
                                    )}
                                    {etfInfo?.nav_status && (
                                        <BadgeTooltip
                                            title="실시간 ETF 괴리율 상태"
                                            desc={`현재 시장가와 ETF 본래 가치(NAV ${etfInfo.nav || '-'})의 차이(${etfInfo.nav_gap || '0.00%'})입니다. '할인 괴리'는 실제 가치보다 저렴하게 거래 중임을, '정가 거래'는 제값에 거래 중임을 뜻합니다.`}
                                            badgeClass={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm whitespace-nowrap border ${
                                                etfInfo.nav_status.includes('할인')
                                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                    : etfInfo.nav_status.includes('할증')
                                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                            }`}
                                        >
                                            {etfInfo.nav_status} {etfInfo.nav_gap && etfInfo.nav_gap !== 'N/A' ? `(${etfInfo.nav_gap})` : ''}
                                        </BadgeTooltip>
                                    )}
                                    {item.proInsights?.target_price && (
                                        <BadgeTooltip
                                            title="증권사 리서치 평균 목표주가"
                                            desc={`국내 증권사 리서치센터 애널리스트들의 최근 3개월 평균 목표주가(컨센서스) 집계치입니다. (공개 통계 자료)`}
                                            badgeClass="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                                        >
                                            <span className="whitespace-nowrap">🎯 증권사 목표가 {item.proInsights.target_price}원</span>
                                            {upsidePct !== null && (
                                                <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded whitespace-nowrap ${
                                                    upsidePct > 0 ? 'bg-purple-500/30 text-purple-200' : 'bg-zinc-800 text-zinc-400'
                                                }`}>
                                                    {upsidePct > 0 ? `+${upsidePct.toFixed(1)}%` : `${upsidePct.toFixed(1)}%`}
                                                </span>
                                            )}
                                        </BadgeTooltip>
                                    )}
                                    {item.proInsights?.per && item.proInsights.per !== 'N/A' && (
                                        <BadgeTooltip
                                            title="PER (주가수익비율)"
                                            desc={`주가가 1주당 순이익(EPS)의 몇 배인지 나타내는 가치평가 지표입니다. 수치가 낮을수록 실적 대비 저평가 상태입니다.`}
                                            badgeClass="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"
                                        >
                                            📊 PER {item.proInsights.per}
                                        </BadgeTooltip>
                                    )}
                                    {item.proInsights?.pbr && item.proInsights.pbr !== 'N/A' && (
                                        <BadgeTooltip
                                            title="PBR (주가순자산비율)"
                                            desc={`주가가 기업의 순자산(자본총계) 대비 몇 배에 거래되는지 나타냅니다. 1배 미만이면 장부상 청산가치보다 저평가된 상태입니다.`}
                                            badgeClass="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"
                                        >
                                            🏛️ PBR {item.proInsights.pbr}
                                        </BadgeTooltip>
                                    )}
                                </div>
                            )}

                            {/* [Row 2.5] ETF 전용 6대 핵심 인텔리전스 그리드 & 52주 가격 위치 바 */}
                            {isEtfItem && etfInfo && (
                                <div className="mt-1 p-3 rounded-2xl bg-zinc-950/70 border border-indigo-500/20 shadow-inner space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-black text-indigo-300 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                            ETF 핵심 6대 인텔리전스 지표 (터치/마우스 오버 시 초보자 해설)
                                        </span>
                                        {etfInfo.category && (
                                            <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                                분류: {etfInfo.category}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {/* 1. 실시간 NAV */}
                                        <BadgeTooltip
                                            title="실시간 NAV (순자산가치 · 본래가격)"
                                            desc="이 ETF 바구니 안에 담긴 실제 주식들의 지금 당장 1주당 진짜 원가입니다. 현재 주가와 비교해 비싸게 사는지 싸게 사는지 기준이 됩니다."
                                            badgeClass="w-full flex flex-col justify-between p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 text-left"
                                        >
                                            <span className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                                                <span>💎 실시간 NAV (본래가치)</span>
                                                <span className="text-[9px] text-indigo-400">ⓘ</span>
                                            </span>
                                            <span className="text-xs sm:text-sm font-black font-mono text-white mt-1">
                                                {etfInfo.nav && etfInfo.nav !== 'N/A' ? etfInfo.nav : item.price}
                                            </span>
                                        </BadgeTooltip>

                                        {/* 2. 실시간 괴리율 판독 */}
                                        <BadgeTooltip
                                            title="실시간 괴리율 판독 (할인 vs 할증)"
                                            desc="시장 가격과 본래 가치(NAV)의 차이입니다. 마이너스(-)면 실제 가치보다 싸게 사는 '할인 기회'이고, 플러스(+)가 크면 실제 가치보다 비싸게 주고 사는 '할증 주의' 상태입니다."
                                            badgeClass="w-full flex flex-col justify-between p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 text-left"
                                        >
                                            <span className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                                                <span>⚖️ 괴리율 판독</span>
                                                <span className="text-[9px] text-indigo-400">ⓘ</span>
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className={`text-xs sm:text-sm font-black font-mono ${
                                                    (etfInfo.nav_gap_num ?? 0) < 0 ? 'text-emerald-400' : (etfInfo.nav_gap_num ?? 0) > 0.2 ? 'text-amber-400' : 'text-cyan-300'
                                                }`}>
                                                    {etfInfo.nav_gap && etfInfo.nav_gap !== 'N/A' ? etfInfo.nav_gap : '0.00%'}
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-300">
                                                    ({etfInfo.nav_status ? etfInfo.nav_status.replace(/^[^\s]+\s/, '') : '정가 거래'})
                                                </span>
                                            </div>
                                        </BadgeTooltip>

                                        {/* 3. 순자산총액 (AUM) */}
                                        <BadgeTooltip
                                            title="순자산총액 (AUM · 펀드 덩치)"
                                            desc="이 ETF에 모여있는 전체 투자 자금 규모입니다. 순자산이 1,000억 원 이상으로 클수록 상장폐지 위험이 없고 원하는 가격에 즉시 매매(유동성 풍부)하기 유리합니다."
                                            badgeClass="w-full flex flex-col justify-between p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 text-left"
                                        >
                                            <span className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                                                <span>🏦 순자산총액 (AUM)</span>
                                                <span className="text-[9px] text-indigo-400">ⓘ</span>
                                            </span>
                                            <span className="text-xs sm:text-sm font-black font-mono text-white mt-1">
                                                {etfInfo.aum && etfInfo.aum !== 'N/A' ? etfInfo.aum : '집계중'}
                                            </span>
                                        </BadgeTooltip>

                                        {/* 4. 당일 거래대금 · 회전율 */}
                                        <BadgeTooltip
                                            title="당일 거래대금 & 회전율"
                                            desc="오늘 하루 시장에서 거래된 총 금액과 전체 펀드 규모 대비 손바뀜 비율(회전율)입니다. 거래대금이 많을수록 매수·매도 호가 공백 없이 쾌적하게 거래됩니다."
                                            badgeClass="w-full flex flex-col justify-between p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 text-left"
                                        >
                                            <span className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                                                <span>🔥 거래대금 · 회전율</span>
                                                <span className="text-[9px] text-indigo-400">ⓘ</span>
                                            </span>
                                            <span className="text-xs sm:text-sm font-black font-mono text-white mt-1 truncate">
                                                {etfInfo.trading_value && etfInfo.trading_value !== 'N/A' ? etfInfo.trading_value : '-'}
                                                {etfInfo.turnover_rate && etfInfo.turnover_rate !== 'N/A' ? ` (${etfInfo.turnover_rate})` : ''}
                                            </span>
                                        </BadgeTooltip>

                                        {/* 5. 총보수(TER) · 연 분배금 */}
                                        <BadgeTooltip
                                            title="연간 총보수(수수료) & 분배금(배당률)"
                                            desc="총보수(TER)는 운용사에 내는 연간 관리 수수료(낮을수록 장기투자에 유리)이며, 분배금률은 보유 시 1년간 받는 예상 배당 수익률입니다."
                                            badgeClass="w-full flex flex-col justify-between p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 text-left"
                                        >
                                            <span className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                                                <span>💰 총보수 · 연 분배금</span>
                                                <span className="text-[9px] text-indigo-400">ⓘ</span>
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs font-black font-mono">
                                                <span className="text-amber-300">보수 {etfInfo.ter && etfInfo.ter !== 'N/A' ? etfInfo.ter : '연 0.15%'}</span>
                                                <span className="text-zinc-600">|</span>
                                                <span className="text-emerald-300">배당 {etfInfo.dividend_yield && etfInfo.dividend_yield !== 'N/A' ? etfInfo.dividend_yield : '연 0.00%'}</span>
                                            </div>
                                        </BadgeTooltip>

                                        {/* 6. 기간별 누적 수익률 (1M / 3M / 1Y) */}
                                        <BadgeTooltip
                                            title="기간별 누적 수익률 (1개월 / 3개월 / 1년)"
                                            desc="단기(1개월), 중기(3개월), 장기(1년) 동안 이 ETF가 실제로 기록한 누적 수익률 추이입니다. 추세의 지속성을 확인할 수 있습니다."
                                            badgeClass="w-full flex flex-col justify-between p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-indigo-500/40 text-left"
                                        >
                                            <span className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                                                <span>📈 기간별 수익률 (1M/3M/1Y)</span>
                                                <span className="text-[9px] text-indigo-400">ⓘ</span>
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px] font-black font-mono">
                                                <span className={String(etfInfo.return_1m).startsWith('+') ? 'text-rose-400' : String(etfInfo.return_1m).startsWith('-') ? 'text-sky-400' : 'text-zinc-300'}>
                                                    1M {etfInfo.return_1m && etfInfo.return_1m !== 'N/A' ? etfInfo.return_1m : '-'}
                                                </span>
                                                <span className="text-zinc-600">·</span>
                                                <span className={String(etfInfo.return_3m).startsWith('+') ? 'text-rose-400' : String(etfInfo.return_3m).startsWith('-') ? 'text-sky-400' : 'text-zinc-300'}>
                                                    3M {etfInfo.return_3m && etfInfo.return_3m !== 'N/A' ? etfInfo.return_3m : '-'}
                                                </span>
                                                <span className="text-zinc-600">·</span>
                                                <span className={String(etfInfo.return_1y).startsWith('+') ? 'text-rose-400' : String(etfInfo.return_1y).startsWith('-') ? 'text-sky-400' : 'text-zinc-300'}>
                                                    1Y {etfInfo.return_1y && etfInfo.return_1y !== 'N/A' ? etfInfo.return_1y : '-'}
                                                </span>
                                            </div>
                                        </BadgeTooltip>
                                    </div>
                                </div>
                            )}

                            {/* [52주 가격 위치 바] (ETF 및 일반 종목 모두 52주 최고/최저 데이터가 있을 때 노출) */}
                            {pos52Pct !== null && high52Raw && low52Raw && (
                                <div className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                        <span>📉 52주 최저 <strong className="text-sky-400">{item.currency && item.currency !== 'KRW' ? `$${low52Raw}` : `${low52Raw}원`}</strong></span>
                                        <span className="font-sans font-bold text-zinc-300">
                                            52주 가격 위치 <strong className="text-indigo-400">{pos52Pct.toFixed(0)}%</strong> 구간
                                        </span>
                                        <span>📈 52주 최고 <strong className="text-rose-400">{item.currency && item.currency !== 'KRW' ? `$${high52Raw}` : `${high52Raw}원`}</strong></span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                                        <div
                                            className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-rose-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pos52Pct}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* [Row 3] Bottom Row: Purchases / Average Price & Action Buttons */}
                            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 flex-wrap sm:flex-nowrap">
                                {/* Left: Purchase / Average Price Box */}
                                {((item.purchases && item.purchases.length > 0) || (item.added_price ? true : false)) ? (
                                    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar scrollbar-none min-w-0 max-w-full sm:max-w-[65vw]">
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
                                                    className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/10 hover:border-blue-500/40 cursor-pointer bg-zinc-950/80 hover:bg-zinc-900/90 shadow-md transition-all group/chip shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onEditAddedPrice) onEditAddedPrice(item.symbol, p.buy_price, p.quantity);
                                                    }}
                                                    title="클릭하여 매수 단가 및 수량 수정"
                                                >
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
                                                            <span>{item.purchases && item.purchases.length > 1 ? `${idx+1}차 매수` : '내 매수단가'}</span>
                                                            {p.quantity > 0 && (
                                                                <span className="text-zinc-300 font-mono">({p.quantity.toLocaleString()}주)</span>
                                                            )}
                                                            <Pencil className="w-2.5 h-2.5 text-zinc-500 group-hover/chip:text-blue-400 transition-colors ml-0.5" />
                                                        </div>
                                                        <span className="text-xs sm:text-sm font-black font-mono text-white">
                                                            {currencySign}
                                                            {isUSD ? p.buy_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : p.buy_price.toLocaleString()}
                                                            {currencyUnit}
                                                        </span>
                                                    </div>

                                                    <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black font-mono border ${badgeColor} flex flex-col items-end`}>
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
                                ) : (
                                    <div className="flex-1" />
                                )}

                                {/* Right: Action Buttons (Rightmost) */}
                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                    {/* ETF 전용 심층분석 버튼 (구성종목 TOP10, 괴리율, 보수 계산기) */}
                                    {isEtfItem && (
                                        <button
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const cleanSym = item.symbol ? (item.symbol.split('.')[0] || item.symbol) : item.symbol;
                                                window.location.href = `/etf-analysis?symbol=${cleanSym}`;
                                            }}
                                            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                            title="ETF 구성종목 TOP 10 · 괴리율 · 수수료 심층분석"
                                        >
                                            <span>📊</span>
                                            <span className="text-[11px] sm:text-xs">ETF 심층분석</span>
                                        </button>
                                    )}
                                    {/* AI 정밀 분석 직행 버튼 */}
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const cleanSym = item.symbol ? (item.symbol.split('.')[0] || item.symbol) : item.symbol;
                                            window.location.href = `/discovery?q=${cleanSym}`;
                                        }}
                                        className="flex items-center gap-1 px-2.5 sm:px-3 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 border border-blue-500/30 hover:border-blue-500/50 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                        title="종목 정밀 진단 & 차트 분석"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-[11px] sm:text-xs">정밀 분석</span>
                                    </button>
                                    {onAlertClick && (
                                        <button 
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rawPrice = String(item.price || "0").replace(/[^0-9.]/g, '');
                                                onAlertClick(item.symbol, parseFloat(rawPrice), item.added_price);
                                            }}
                                            className="p-2 sm:p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all active:scale-90 shadow-sm cursor-pointer"
                                            title="가격 알림 및 안전 방어선 설정"
                                        >
                                            <Shield className="w-4 h-4" />
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
                                            className="p-2 sm:p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-all active:scale-90 shadow-sm cursor-pointer"
                                            title="관심종목 삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
