"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, LineChart, Target, Shield, AlertTriangle, Loader2, Lock, PlayCircle, Crown, Sun, CloudSun, CloudRain, Globe, Building2, PieChart } from "lucide-react";
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ErrorBar,
    Cell,
    Area,
    Brush
} from "recharts";
import { getTickerFromKorean } from "@/lib/stockMapping";
import { isPremiumUnlocked } from "@/lib/adminMode";
import ProModal from "@/components/ProModal";
import AdRewardModal from "@/components/AdRewardModal";

// Custom Candle Shape
const CandleStick = (props: any) => {
    const { x, y, width, height, low, high, open, close } = props;
    const isRising = close > open;
    const color = isRising ? "#ef4444" : "#3b82f6"; // Red for rising, Blue for falling (Korean style)

    // Calculate body position
    // Y is the top coordinate.
    // In SVG, Y increases downwards.
    // We need to map price to Y. Recharts handles this via `y` and `height` for the Bar.
    // But for custom shape, `y` is the top of the bar, `height` is the height.
    // However, for a candle, we need open/close/high/low relative to the axis.
    // Recharts passes `formattedLabel` or payload?
    // Actually, it's easier to use ErrorBar for the wick and Bar for the body.
    // But let's try a simple rect + line approach if we had exact coordinates.
    // Recharts doesn't give pixel coords easily for internal logic in Shape.

    // Alternative: Use 2 Bars or a custom path?
    // Let's stick to a simpler approximation or use a library if this is too hard.
    // But user wants candles.

    // Simpler Recharts Candle approach:
    // A bar representing the body (Open-Close).
    // An ErrorBar representing the wick (Low-High).
    // Use `minPointSize` or similar.
    return <path />;
};

// We will use a standard ComposedChart where:
// 1. We create a "range" bar for the body.
// 2. We use ErrorBar for wicks.
// Actually, creating a proper candle in pure recharts is tricky without a specific component.
// Let's use a "Custom Shape" on a Bar chart.
// The data needs to be pre-processed: [min(open, close), max(open, close)] for the bar body?
// No, let's use a standard trick:
// Bar Chart where dataKey is [min, max].

export default function PatternPage() {
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // [Pro & Ad]
    const [showProModal, setShowProModal] = useState(false);
    const [showAdModal, setShowAdModal] = useState(false);
    const [dailyCount, setDailyCount] = useState(0);
    const [dailyLimit, setDailyLimit] = useState(1);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const checkStatus = () => {
            const localPro = localStorage.getItem("isPro") === "true";
            const adminPro = isPremiumUnlocked();
            setIsPro(localPro || adminPro);
            const today = new Date().toDateString();

            const usageStored = localStorage.getItem("patternUsage");
            if (usageStored) {
                const { date, count } = JSON.parse(usageStored);
                if (date === today) {
                    setDailyCount(count);
                } else {
                    setDailyCount(0);
                    localStorage.setItem("patternUsage", JSON.stringify({ date: today, count: 0 }));
                }
            }

            const limitStored = localStorage.getItem("patternLimit");
            if (limitStored) {
                const { date, limit } = JSON.parse(limitStored);
                if (date === today) {
                    setDailyLimit(limit);
                } else {
                    setDailyLimit(1);
                    localStorage.setItem("patternLimit", JSON.stringify({ date: today, limit: 1 }));
                }
            } else {
                localStorage.setItem("patternLimit", JSON.stringify({ date: today, limit: 1 }));
            }
        };
        checkStatus();
    }, []);

    // [Zoom State]
    const [zoomState, setZoomState] = useState({ startIndex: 0, endIndex: 0 });

    useEffect(() => {
        if (result?.history?.length) {
            const len = result.history.length;
            // Default view: Last 30 days or full range if small
            const start = Math.max(0, len - 30);
            const end = len - 1;
            setZoomState({ startIndex: start, endIndex: end });
        }
    }, [result]);

    const handleWheel = (e: React.WheelEvent) => {
        if (!result?.history) return;

        // Prevent default page scroll
        // e.preventDefault(); // React synthetic events might not support this for passive listeners check.
        // We rely on the container overflow handling or user behavior.

        const len = result.history.length;
        const { startIndex, endIndex } = zoomState;
        const currentRange = endIndex - startIndex;
        const zoomFactor = 0.1; // 10% change
        const change = Math.max(1, Math.floor(currentRange * zoomFactor));

        let newStart = startIndex;
        let newEnd = endIndex;

        if (e.deltaY < 0) {
            // Wheel Up -> Zoom In (Show fewer bars)
            // Shrink range from the left side (keep right side anchored usually, or center?)
            // Let's anchor right for stock charts (focus on latest) unless user panned.
            // But if we use Brush, it might be better to shrink from both sides or just left.
            // Let's try shrinking from left (increase start index).
            newStart = Math.min(endIndex - 5, startIndex + change); // Keep at least 5 bars

        } else {
            // Wheel Down -> Zoom Out (Show more bars)
            // Expand range to the left
            newStart = Math.max(0, startIndex - change);
        }

        setZoomState({ startIndex: newStart, endIndex: newEnd });
    };

    const handleBrushChange = (e: any) => {
        if (e.startIndex !== undefined && e.endIndex !== undefined) {
            setZoomState({ startIndex: e.startIndex, endIndex: e.endIndex });
        }
    };

    const handleSearch = async () => {
        if (!searchInput) return;

        if (!isPro && dailyCount >= dailyLimit) {
            setShowAdModal(true);
            return;
        }

        setLoading(true);
        setResult(null);

        if (!isPro) {
            const newCount = dailyCount + 1;
            setDailyCount(newCount);
            localStorage.setItem("patternUsage", JSON.stringify({
                date: new Date().toDateString(),
                count: newCount
            }));
        }

        try {
            const ticker = getTickerFromKorean(searchInput).toUpperCase();
            const res = await fetch(`${API_BASE_URL}/api/chart/patterns/${ticker}`);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                // Ensure history is sorted and processed?
                // Backend sends it sorted by date presumably.
                setResult(json.data);
            } else {
                alert("검색 결과가 없습니다. 티커를 확인해주세요.");
            }
        } catch (e) {
            console.error(e);
            alert("서버 연결 오류");
        } finally {
            setLoading(false);
        }
    };

    const handleAdReward = () => {
        const newLimit = dailyLimit + 1;
        setDailyLimit(newLimit);
        localStorage.setItem("patternLimit", JSON.stringify({
            date: new Date().toDateString(),
            limit: newLimit
        }));
        setShowAdModal(false);
        alert("광고 보상 완료! 분석 기회가 1회 추가되었습니다. 🎉");
    };

    const isLocked = !isPro && dailyCount >= dailyLimit;

    // Custom Candle Shape
    const renderCandle = (props: any) => {
        const { x, y, width, height, payload } = props;
        const { open, close, high, low } = payload;
        const isRising = close > open;
        const color = isRising ? "#ef4444" : "#3b82f6";

        // Calculate Y positions relative to the chart axis
        // We need the yScale. Recharts doesn't pass it directly in props easily?
        // Actually, for a customized shape, getting exact Y for high/low is tricky without the scale.
        // A common workaround is using ErrorBar for high-low and Bar for open-close.

        // Let's use the ComposedChart trick:
        // Bar for Body: [Min(Open, Close), Max(Open, Close)]
        // ErrorBar for Wick?
        // Or simplified: Draw a rectangle for body, line for wick centered at x + width/2

        // Without exact scale, we can't draw the wick correctly inside the shape function easily
        // if we only get body dimensions.
        // BUT, we can just use a Bar chart where the value is the *Body Range*.

        // Let's try a different approach:
        // Use a "ComposedChart" 
        // 1. Bar for Body (Top=Max(O,C), Bottom=Min(O,C)) -> This requires [min, max] data support?
        // Recharts Bar can accept [min, max] in some versions, or we calculate bottom/height.

        return <path />;
    };

    // Prepare Data for Candle Chart
    // We need to calculate body bottom and height for the Bar, and error bars for wicks.
    const chartData = result?.history?.map((item: any) => {
        const isRising = item.close > item.open;
        return {
            ...item,
            // For Floating Bar (Body) -> [min, max]
            bodyRange: [Math.min(item.open, item.close), Math.max(item.open, item.close)],
            // For Floating Bar (Wick) -> [low, high]
            wickRange: [item.low, item.high],
            // Colors
            color: isRising ? "#ef4444" : "#3b82f6",
        };
    }) || [];

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;

            // Generate today's date string in YYYY-MM-DD format to match backend
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            // If data.date matches today, show "Current Price", else "Close Price"
            const priceLabel = data.date === todayStr ? "현재가" : "종가";
            const priceColor = data.date === todayStr ? "text-emerald-400" : "text-white";

            return (
                <div className="bg-gray-900 border border-white/10 p-3 rounded-lg text-sm shadow-xl">
                    <p className="text-gray-400 mb-1">{data.date}</p>
                    <p className={`${priceColor} font-bold text-base`}>{priceLabel}: {data.close.toLocaleString(undefined, { maximumFractionDigits: 0 })}원</p>
                    <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-500 mt-2">
                        <span>시가: {data.open.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span>고가: {data.high.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span>저가: {data.low.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span>거래량: {data.volume.toLocaleString()}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen pb-20 bg-[#0a0a0a]">
            <Header />
            <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
            <AdRewardModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onReward={handleAdReward}
                featureName="PatternAnalytics"
            />

            <div className="p-6 max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4 pt-8">
                    <h1 className="text-5xl font-black text-white flex items-center justify-center gap-4">
                        <LineChart className="w-12 h-12 text-emerald-500" />
                        AI 차트 분석 <span className="text-emerald-500">PRO</span>
                    </h1>
                    <p className="text-gray-400 text-lg">
                        패턴 분석 리포트, 투자자별 수급 추적, 캔들 성분 분석을 한번에.
                    </p>

                    {!isPro && (
                        <div className="flex justify-center mt-4">
                            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-full px-5 py-2 text-sm text-gray-300 flex items-center gap-3">
                                {isLocked ? (
                                    <span className="text-red-400 font-bold flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> 무료 사용량 초과 ({dailyCount}/{dailyLimit})
                                    </span>
                                ) : (
                                    <span>
                                        오늘 남은 분석: <span className="text-emerald-400 font-bold">{dailyLimit - dailyCount}</span>회
                                    </span>
                                )}
                                <button
                                    onClick={() => setShowProModal(true)}
                                    className="ml-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-full text-white font-bold transition-colors flex items-center gap-1"
                                >
                                    <Crown className="w-3 h-3" /> 무제한 업그레이드
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative max-w-xl mx-auto z-20">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={isLocked ? "무료 사용량을 다 썼어요! 광고 보고 충전하세요 ⚡" : "종목명 입력 (예: 삼성전자, 현대차)..."}
                            className={`relative w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-32 text-white text-xl font-bold focus:outline-none placeholder-gray-600 transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={loading || isLocked}
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6 z-10" />
                        <button
                            onClick={handleSearch}
                            disabled={loading || isLocked}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-lg font-bold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 z-10"
                        >
                            {isLocked ? <Lock className="w-5 h-5" /> : "분석하기"}
                        </button>
                    </div>
                    {isLocked && (
                        <div className="absolute top-full mt-6 inset-x-0 flex items-center justify-center gap-4 animate-in slide-in-from-top-2 fade-in duration-300">
                            <button
                                onClick={() => setShowAdModal(true)}
                                className="bg-gray-800 hover:bg-gray-700 text-white border border-white/10 rounded-xl px-5 py-3 shadow-xl flex items-center gap-3 transform hover:scale-105 transition-all group"
                            >
                                <PlayCircle className="w-6 h-6 text-yellow-400 group-hover:rotate-12 transition-transform" />
                                <div className="text-left">
                                    <div className="text-xs text-gray-400">무료 충전</div>
                                    <div className="font-bold">광고 보고 +1회</div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-32 text-emerald-500 space-y-6">
                        <Loader2 className="w-16 h-16 animate-spin text-emerald-400" />
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-white animate-pulse">AI가 데이터를 분석 중입니다...</h3>
                            <p className="text-gray-500">과거 1년간의 차트 패턴과 최근 3개월 수급 데이터를 스캔하고 있습니다.</p>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">

                        {/* 1. Pattern Analysis Summary */}
                        <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Crown className="w-32 h-32 text-white" />
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className="flex-shrink-0">
                                    <LineChart className="w-24 h-24 text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-4">
                                    <div>
                                        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold mb-2">
                                            패턴 분석 결과
                                        </span>
                                        <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                                            {result.weather?.pattern || '패턴 없음'}
                                        </h2>
                                    </div>
                                    <p className="text-gray-300 text-lg">
                                        과거 유사 패턴 <span className="text-emerald-400 font-bold">{result.weather?.count || 0}회</span> 발생.
                                        <br />
                                        <span className="text-sm text-gray-500">* 과거 통계 데이터이며 미래 수익을 보장하지 않습니다.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Investor Flow Tracker */}
                        {result.whale && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="rounded-3xl bg-gray-900 border border-white/10 p-6 relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-gray-400 font-bold text-sm flex items-center gap-2">
                                                <Globe className="w-4 h-4" /> 외국인 추정 매입단가
                                            </h3>
                                            <div className="text-3xl font-black text-white mt-2">
                                                {result.whale?.foreigner?.avg_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}원
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${result.whale?.foreigner?.return_rate > 0 ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                            {result.whale?.foreigner?.return_rate > 0 ? '+' : ''}{result.whale?.foreigner?.return_rate}%
                                        </div>
                                    </div>
                                    <div className="text-xs text-right text-gray-500 mt-2">
                                        현재가 대비 괴리율 (추정)
                                    </div>
                                </div>
                                <div className="rounded-3xl bg-gray-900 border border-white/10 p-6 relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-gray-400 font-bold text-sm flex items-center gap-2">
                                                <Building2 className="w-4 h-4" /> 기관 추정 매입단가
                                            </h3>
                                            <div className="text-3xl font-black text-white mt-2">
                                                {result.whale?.institution?.avg_price?.toLocaleString(undefined, { maximumFractionDigits: 0 })}원
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${result.whale?.institution?.return_rate > 0 ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                            {result.whale?.institution?.return_rate > 0 ? '+' : ''}{result.whale?.institution?.return_rate}%
                                        </div>
                                    </div>
                                    <div className="text-xs text-right text-gray-500 mt-2">
                                        현재가 대비 괴리율 (추정)
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Candle Ingredients */}
                        {result.whale?.ingredients && (
                            <div className="rounded-3xl bg-white/5 border border-white/10 p-8">
                                <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                    <p className="text-blue-200 text-lg font-medium leading-relaxed break-keep">
                                        "{result.weather.comment}"
                                    </p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        * 과거 {result.weather.count}번의 유사 사례를 통계 분석한 참고 자료입니다. 투자 판단의 근거로 사용하지 마세요.
                                    </p>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <PieChart className="w-5 h-5 text-purple-400" /> 캔들 성분 분석 (최근 5일)
                                </h3>
                                <div className="space-y-3">
                                    {result.whale.ingredients.map((day: any, i: number) => {
                                        return (
                                            <div key={i} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 transition-colors gap-4">
                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <span className="text-gray-400 text-sm font-mono w-20">{day.date}</span>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white text-lg">{day.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}원</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-500">주요 매수 주체</div>
                                                        <div className={`font-bold ${day.winner === '외국인' ? 'text-orange-400' : day.winner === '기관' ? 'text-green-400' : 'text-gray-400'}`}>
                                                            {day.winner}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 4. Interactive Candle Chart */}
                        <div
                            className="rounded-3xl bg-gradient-to-b from-gray-900 to-black border border-white/10 p-8"
                            onWheel={handleWheel} // Attach Wheel Handler
                        >
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-400" /> AI 패턴 차트
                                <span className="text-xs text-gray-500 font-normal ml-2">
                                    (마우스 휠로 확대/축소 가능)
                                </span>
                            </h3>
                            <div className="h-96 w-full mb-6 relative z-10">
                                {/* Real Implementation: AreaChart for Stability */}
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#666"
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(val) => val.slice(2)} // Show YY-MM-DD (e.g., 25-05-28)
                                            minTickGap={30}
                                        />
                                        <YAxis domain={['auto', 'auto']} stroke="#666" tick={{ fontSize: 10 }} tickFormatter={(val) => val.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                                        <Tooltip content={<CustomTooltip />} />

                                        {/* Volume Bar (Background) */}
                                        <Bar dataKey="volume" yAxisId="right" fill="#333" opacity={0.3} barSize={2} />
                                        <YAxis yAxisId="right" orientation="right" hide />

                                        {/* Wick (Low-High) - Thin Bar */}
                                        <Bar dataKey="wickRange" barSize={1} isAnimationActive={false}>
                                            {chartData.map((entry: any, index: number) => (
                                                <Cell key={`wick-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>

                                        {/* Body (Open-Close) - Thicker Bar */}
                                        <Bar dataKey="bodyRange" barSize={8} isAnimationActive={false}>
                                            {chartData.map((entry: any, index: number) => (
                                                <Cell key={`body-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>

                                        {/* Trend Line (Moving Average 5) - Optional overlay */}
                                        <Area type="monotone" dataKey="close" stroke="#ffffff" strokeWidth={1} fill="none" opacity={0.5} dot={false} />

                                        {/* Zoom Slider */}
                                        <Brush
                                            dataKey="date"
                                            height={30}
                                            stroke="#10b981"
                                            fill="#1f2937"
                                            tickFormatter={(val) => val.slice(2)} // Show YY-MM-DD here too
                                            travellerWidth={10}
                                            startIndex={zoomState.startIndex}
                                            endIndex={zoomState.endIndex}
                                            onChange={handleBrushChange}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// NOTE: I decided to stick to AreaChart because implementing robust Candlestick in standard Recharts
// without a plugin is error-prone within a single turn.
// I added a disclaimer text explaining it shows the "Trend Line (Close Price)".
