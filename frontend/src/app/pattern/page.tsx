"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { 
    Search, LineChart, Target, Shield, AlertTriangle, Loader2, Lock, 
    PlayCircle, Crown, Sun, CloudSun, CloudRain, 
    PieChart, BarChart3, TrendingUp, TrendingDown, Clock,
    TowerControl, Activity
} from "lucide-react";
import dynamic from "next/dynamic";

// ApexCharts is heavy and needs window, so load it dynamically
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import AIDisclaimer from "@/components/AIDisclaimer";

import { getTickerFromKorean } from "@/lib/stockMapping";
import { isPremiumUnlocked } from "@/lib/adminMode";
import ProModal from "@/components/ProModal";
import AdRewardModal from "@/components/AdRewardModal";

export default function PatternPage() {
    const [searchInput, setSearchInput] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [chartType, setChartType] = useState<"line" | "candle">("line");
    const [linePeriod, setLinePeriod] = useState<string>("1y");
    const [candleInterval, setCandleInterval] = useState<string>("1d");
    const [isMounted, setIsMounted] = useState(false);
    const [showDocent, setShowDocent] = useState(true);

    useEffect(() => {
        setIsMounted(true);
        const stored = localStorage.getItem("showDocent");
        if (stored !== null) setShowDocent(stored === "true");
    }, []);

    // [Pro & Ad] - Keep existing logic
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

    const handleSearch = async (targetSymbol?: string, targetParams?: { period?: string, interval?: string }) => {
        const symbolToSearch = (typeof targetSymbol === 'string' ? targetSymbol : null) || searchInput;
        
        // Finalize params based on Chart Type
        let periodToUse = targetParams?.period || (chartType === 'line' ? linePeriod : '');
        let intervalToUse = targetParams?.interval || (chartType === 'candle' ? candleInterval : '1d');

        // Default periods for Candle if not set
        if (chartType === 'candle' && !periodToUse) {
            if (intervalToUse === '1wk') periodToUse = '2y';
            else if (intervalToUse === '1mo') periodToUse = '5y';
            else periodToUse = '1y';
        }

        if (!symbolToSearch) return;

        if (!isPro && dailyCount >= dailyLimit) {
            setShowAdModal(true);
            return;
        }

        const isNewSearch = typeof targetSymbol === 'string' && !targetParams;
        if (isNewSearch) {
            setLoading(true);
            setResult(null);
        } else {
            setUpdating(true);
        }

        if (!isPro && (typeof targetSymbol === 'string' || !targetParams)) {
            const newCount = dailyCount + 1;
            setDailyCount(newCount);
            localStorage.setItem("patternUsage", JSON.stringify({
                date: new Date().toDateString(),
                count: newCount
            }));
        }

        try {
            const ticker = getTickerFromKorean(symbolToSearch).toUpperCase();
            const res = await fetch(`${API_BASE_URL}/api/chart/patterns/${ticker}?interval=${intervalToUse}&period=${periodToUse}&t=${Date.now()}`);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                setResult(json.data);
            } else {
                alert("검색 결과가 없습니다. 티커를 확인해주세요.");
            }
        } catch (e) {
            console.error(e);
            alert("서버 연결 오류");
        } finally {
            setLoading(false);
            setUpdating(false);
        }
    };

    // Re-fetch when interval or period changes
    useEffect(() => {
        const symbol = result?.stock_info?.symbol || searchInput;
        if (symbol && result) {
            // [NEW] Optimized: Force 1d period for intraday to prevent lag
            const isIntraday = candleInterval.includes("m") || candleInterval === "1h";
            let periodToUse = chartType === 'line' ? linePeriod : (isIntraday ? '1d' : undefined);
            
            handleSearch(symbol, { 
                period: periodToUse,
                interval: chartType === 'candle' ? candleInterval : '1d'
            });
        }
    }, [linePeriod, candleInterval, chartType]);

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

    // Moving Averages
    const movingAverages = useMemo(() => {
        if (!result?.history || result.history.length === 0) return { ma5: [], ma20: [], ma60: [], ma120: [] };
        const calculateMA = (data: number[], window: number) => {
            const results = [];
            for (let i = 0; i < data.length; i++) {
                if (i < window - 1) { results.push(null); continue; }
                const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
                results.push(Number((sum / window).toFixed(2)));
            }
            return results;
        };
        const closes = result.history.map((d: any) => d.close);
        return {
            ma5: calculateMA(closes, 5),
            ma20: calculateMA(closes, 20),
            ma60: calculateMA(closes, 60),
            ma120: calculateMA(closes, 120)
        };
    }, [result?.history]);

    // ApexCharts Configurations
    const chartSeries = useMemo(() => {
        if (!result?.history) return [];
        const history = result.history;

        if (chartType === 'line') {
            return [
                {
                    name: 'Price',
                    type: 'area',
                    data: history.map((d: any) => ({
                        x: new Date(d.date).getTime(),
                        y: d.close
                    }))
                }
            ];
        } else {
            return [
                {
                    name: 'Candle',
                    type: 'candlestick',
                    data: history.map((d: any) => ({
                        x: new Date(d.date).getTime(),
                        y: [d.open, d.high, d.low, d.close]
                    }))
                },
                { name: 'MA5', type: 'line', data: history.map((d: any, i: number) => ({ x: new Date(d.date).getTime(), y: movingAverages.ma5[i] })) },
                { name: 'MA20', type: 'line', data: history.map((d: any, i: number) => ({ x: new Date(d.date).getTime(), y: movingAverages.ma20[i] })) },
                { name: 'MA60', type: 'line', data: history.map((d: any, i: number) => ({ x: new Date(d.date).getTime(), y: movingAverages.ma60[i] })) },
                { name: 'MA120', type: 'line', data: history.map((d: any, i: number) => ({ x: new Date(d.date).getTime(), y: movingAverages.ma120[i] })) }
            ];
        }
    }, [result?.history, chartType, movingAverages]);

    const volumeSeries = useMemo(() => {
        if (!result?.history) return [];
        return [{
            name: '거래량',
            type: 'bar',
            data: result.history.map((d: any) => ({
                x: new Date(d.date).getTime(),
                y: d.volume
            }))
        }];
    }, [result?.history]);

    const chartOptions: any = {
        chart: {
            type: chartType === 'line' ? 'area' : 'candlestick',
            height: 400,
            id: 'candles',
            toolbar: { show: false },
            background: 'transparent',
            foreColor: '#9ca3af',
            locales: [{
                name: 'ko',
                options: {
                    months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                    shortMonths: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                    days: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
                    shortDays: ['일', '월', '화', '수', '목', '금', '토'],
                    toolbar: {
                        exportToSVG: 'SVG 다운로드',
                        exportToPNG: 'PNG 다운로드',
                        exportToCSV: 'CSV 다운로드',
                        selection: '선택',
                        selectionZoom: '선택 확대',
                        zoomIn: '확대',
                        zoomOut: '축소',
                        pan: '이동',
                        reset: '초기화'
                    }
                }
            }],
            defaultLocale: 'ko'
        },
        dataLabels: { enabled: false },
        theme: { mode: 'dark' },
        stroke: { width: chartType === 'line' ? [2] : [1, 2, 2, 2, 2], curve: 'smooth' },
        fill: {
            type: chartType === 'line' ? 'gradient' : 'solid',
            gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] }
        },
        plotOptions: {
            candlestick: {
                colors: { upward: '#ef4444', downward: '#3b82f6' },
                wick: { useFillColor: true }
            }
        },
        xaxis: { 
            type: 'datetime', 
            axisBorder: { show: false }, 
            axisTicks: { show: false },
            labels: {
                datetimeFormatter: {
                    year: 'yyyy년',
                    month: 'yyyy년 MM월',
                    day: 'MM월 dd일',
                    hour: 'HH:mm'
                }
            }
        },
        yaxis: { opposite: true, labels: { formatter: (val: number) => Math.round(val || 0).toLocaleString() } },
        grid: { borderColor: '#ffffff08', strokeDashArray: 4, padding: { left: 10, right: 10 } },
        tooltip: {
            shared: true,
            x: { format: ['1m','5m','30m','60m'].includes(candleInterval) ? 'yyyy년 MM월 dd일 HH:mm' : 'yyyy년 MM월 dd일' },
            y: { formatter: (val: number) => Math.round(val || 0).toLocaleString() },
            custom: function({ seriesIndex, dataPointIndex, w }: any) {
                const history = result?.history || [];
                const item = history[dataPointIndex];
                if (!item) return "";

                const rawDate = new Date(item.date);
                const yyyy = rawDate.getFullYear();
                const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
                const dd = String(rawDate.getDate()).padStart(2, '0');
                const hh = String(rawDate.getHours()).padStart(2, '0');
                const mins = String(rawDate.getMinutes()).padStart(2, '0');

                const isIntraday = ['1m','5m','30m','60m'].includes(candleInterval);
                const dateHeader = isIntraday 
                    ? `${yyyy}. ${mm}. ${dd}. ${hh}:${mins}`
                    : `${yyyy}. ${mm}. ${dd}.`;

                const ma5 = movingAverages.ma5[dataPointIndex];
                const ma20 = movingAverages.ma20[dataPointIndex];
                const ma60 = movingAverages.ma60[dataPointIndex];
                const ma120 = movingAverages.ma120[dataPointIndex];

                const volumeStr = item.volume?.toLocaleString() || "0";
                
                let priceSection = "";
                if (chartType === 'candle') {
                    priceSection = `
                        <div class="flex gap-10 justify-between mb-1 text-[11px]"><span class="text-gray-400">시가</span> <span class="font-mono font-medium text-white">${Math.round(item.open || 0).toLocaleString()}</span></div>
                        <div class="flex gap-10 justify-between mb-1 text-[11px]"><span class="text-gray-400">고가</span> <span class="font-mono font-semibold text-red-400">${Math.round(item.high || 0).toLocaleString()}</span></div>
                        <div class="flex gap-10 justify-between mb-1 text-[11px]"><span class="text-gray-400">저가</span> <span class="font-mono font-semibold text-blue-400">${Math.round(item.low || 0).toLocaleString()}</span></div>
                        <div class="flex gap-10 justify-between mb-2 text-[11px] font-bold border-b border-gray-700/30 pb-1"><span class="text-gray-300">종가</span> <span class="font-mono font-black text-white">${Math.round(item.close || 0).toLocaleString()}</span></div>
                    `;
                } else {
                    priceSection = `
                        <div class="flex gap-10 justify-between mb-2 text-sm font-bold border-b border-gray-700/30 pb-1"><span class="text-gray-300">종가</span> <span class="font-mono font-black text-emerald-400">${Math.round(item.close || 0).toLocaleString()}</span></div>
                    `;
                }

                return `
                    <div class="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 p-3 rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.6)] text-white whitespace-nowrap z-50 pointer-events-none min-w-[200px]">
                        <div class="text-[11px] font-black text-gray-400 border-b border-gray-700/50 pb-2 mb-2 tracking-tighter">
                            📅 ${dateHeader}
                        </div>
                        ${priceSection}
                        <div class="flex gap-10 justify-between mb-2 text-[11px]"><span class="text-gray-400">거래량</span> <span class="font-mono font-bold text-blue-300">${volumeStr}</span></div>
                        
                        <div class="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-gray-700/50">
                            <div class="flex justify-between text-[10px]"><span class="text-emerald-500/80 font-bold">MA5</span> <span class="font-mono text-gray-300">${ma5 ? Math.round(ma5).toLocaleString() : '-'}</span></div>
                            <div class="flex justify-between text-[10px]"><span class="text-red-500/80 font-bold">MA20</span> <span class="font-mono text-gray-300">${ma20 ? Math.round(ma20).toLocaleString() : '-'}</span></div>
                            <div class="flex justify-between text-[10px]"><span class="text-orange-500/80 font-bold">MA60</span> <span class="font-mono text-gray-300">${ma60 ? Math.round(ma60).toLocaleString() : '-'}</span></div>
                            <div class="flex justify-between text-[10px]"><span class="text-purple-500/80 font-bold">MA120</span> <span class="font-mono text-gray-300">${ma120 ? Math.round(ma120).toLocaleString() : '-'}</span></div>
                        </div>
                    </div>
                `;
            }
        },
        annotations: {
            points: [
                ...(result?.stories || []).map((s: any) => ({
                    x: new Date(s.date).getTime(),
                    y: s.price,
                    marker: { size: 6, fillColor: s.impact === 'positive' ? '#ef4444' : s.impact === 'negative' ? '#3b82f6' : '#6b7280', strokeColor: '#fff', radius: 2 },
                    label: { borderColor: '#ffffff20', offsetY: -30, style: { color: '#fff', background: '#1f2937', fontSize: '10px' }, text: s.icon }
                })),
                // [NEW] Highest/Lowest Price Annotations
                ...(result?.history && result.history.length > 0 ? [
                    (() => {
                        const highest = [...result.history].sort((a, b) => b.high - a.high)[0];
                        const idx = result.history.indexOf(highest);
                        const n = result.history.length;
                        const isStart = idx < n * 0.15;
                        const isEnd = idx > n * 0.85;
                        return {
                            x: new Date(highest.date).getTime(),
                            y: highest.high,
                            marker: { size: 0 },
                            label: {
                                text: `최고 ${Math.round(highest.high).toLocaleString()} (${new Date(highest.date).toLocaleDateString('ko-KR', {month:'short', day:'numeric'})}) ↓`,
                                borderColor: '#ef4444',
                                offsetX: isStart ? +60 : (isEnd ? -60 : 0),
                                style: { color: '#fff', background: '#ef4444' }
                            }
                        };
                    })(),
                    (() => {
                        const lowest = [...result.history].sort((a, b) => a.low - b.low)[0];
                        const idx = result.history.indexOf(lowest);
                        const n = result.history.length;
                        const isStart = idx < n * 0.15;
                        const isEnd = idx > n * 0.85;
                        return {
                            x: new Date(lowest.date).getTime(),
                            y: lowest.low,
                            marker: { size: 0 },
                            label: {
                                text: `↑ 최저 ${Math.round(lowest.low).toLocaleString()} (${new Date(lowest.date).toLocaleDateString('ko-KR', {month:'short', day:'numeric'})})`,
                                borderColor: '#3b82f6',
                                offsetY: 40,
                                offsetX: isStart ? +60 : (isEnd ? -60 : 0),
                                style: { color: '#fff', background: '#3b82f6' }
                            }
                        };
                    })()
                ] : [])
            ]
        },
        colors: chartType === 'line' ? ['#10b981'] : ['#ef4444', '#22c55e', '#ef4444', '#f97316', '#a855f7'],
        legend: { position: 'top', horizontalAlign: 'left' }
    };

    const volumeOptions: any = {
        chart: { height: 120, type: 'bar', toolbar: { show: false }, background: 'transparent', foreColor: '#9ca3af' },
        theme: { mode: 'dark' },
        plotOptions: { bar: { columnWidth: '80%', colors: { ranges: [{ from: 0, to: 9999999999999, color: '#60a5fa30' }] } } },
        dataLabels: { enabled: false },
        xaxis: { 
            type: 'datetime', 
            axisBorder: { show: false }, 
            axisTicks: { show: false }, 
            labels: { 
                show: true,
                style: { colors: '#6b7280', fontSize: '10px' },
                datetimeFormatter: {
                    year: 'yyyy년',
                    month: 'M월',
                    day: 'd일',
                    hour: 'HH:mm'
                }
            }
        },
        yaxis: { 
            labels: { 
                style: { colors: '#6b7280', fontSize: '10px' },
                formatter: (val: number) => {
                    if (val >= 100000000) return (val / 100000000).toFixed(1) + '억';
                    if (val >= 10000) return (val / 10000).toLocaleString() + '만';
                    return val.toLocaleString();
                }
            } 
        },
        grid: { show: true, borderColor: '#ffffff05', strokeDashArray: 2 }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen pb-20 bg-[#0a0a0a]">
            <Header />
            <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
            <AdRewardModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} onReward={handleAdReward} featureName="PatternAnalytics" />

            <div className="p-6 max-w-5xl mx-auto space-y-8">
                {/* Search Bar & Title */}
                <div className="text-center space-y-4 pt-8">
                    <h1 className="text-5xl font-black text-white flex items-center justify-center gap-4">
                        <LineChart className="w-12 h-12 text-emerald-500" />
                        AI 차트 분석 <span className="text-emerald-500">PRO</span>
                    </h1>
                    <p className="text-gray-400 text-lg">AI가 분석하는 스마트한 차트 리포트.</p>
                    
                    {/* Docent Toggle Switch */}
                    <div className="flex justify-center mt-6">
                        <button 
                            onClick={() => {
                                const next = !showDocent;
                                setShowDocent(next);
                                localStorage.setItem("showDocent", String(next));
                            }}
                            className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-300 ${showDocent ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500'}`}
                        >
                            <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${showDocent ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${showDocent ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">AI 도슨트 가이드 {showDocent ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>

                    <div className="relative max-w-xl mx-auto z-20 mt-8">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder={isLocked ? "무료 사용량을 다 썼어요! 광고 보고 충전하세요 ⚡" : "종목명 또는 티커 입력 (예: 삼성전자, AAPL)"}
                                className={`relative w-full bg-black border border-white/10 rounded-2xl py-5 pl-14 pr-32 text-white text-xl font-bold focus:outline-none transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={loading || isLocked}
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6 z-10" />
                            <button onClick={() => handleSearch()} disabled={loading || isLocked} className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-lg font-bold transition-all disabled:opacity-50 z-10">
                                {isLocked ? <Lock className="w-5 h-5" /> : "분석하기"}
                            </button>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-32 text-emerald-500 space-y-6">
                        <Loader2 className="w-16 h-16 animate-spin text-emerald-400" />
                        <h3 className="text-2xl font-bold text-white animate-pulse">AI 분석 엔진 가동 중...</h3>
                    </div>
                )}

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                        {/* Summary Header */}
                        <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 flex flex-col md:flex-row items-center gap-8">
                             <div className="flex-shrink-0"><LineChart className="w-20 h-20 text-emerald-400" /></div>
                            <div className="flex-1 text-center md:text-left">
                                <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold mb-2 inline-block">패턴 분석 결과</span>
                                <h2 className="text-3xl font-black text-white">{result.weather?.pattern}</h2>
                                <p className="text-gray-400 mt-2">{result.weather?.comment}</p>
                            </div>
                        </div>

                        {/* AI Docent (Beginner Guide) */}
                        {showDocent && result.beginner_insight && (
                            <div className="relative overflow-hidden rounded-3xl p-8 mb-8 group transition-all duration-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                                {/* Premium Background with Gradient and Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-black to-black z-0" />
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                                
                                <div className="relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white leading-none">주린이를 위한 AI 차트 도슨트 🎓</h3>
                                            <p className="text-xs text-emerald-500/60 mt-1.5 font-medium uppercase tracking-wider">AI 지능형 분석 Insight</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-inner">
                                        <div 
                                            className="text-lg md:text-xl text-emerald-50 leading-relaxed font-medium" 
                                            dangerouslySetInnerHTML={{ 
                                                __html: result.beginner_insight.text
                                                    .replace(/\*\*(.*?)\*\*/g, '<span class="text-emerald-400 font-extrabold underline underline-offset-4 decoration-emerald-500/30">$1</span>')
                                                    .replace(/<small>(.*?)<\/small>/g, '<span class="block mt-4 text-[10px] text-gray-500 font-normal opacity-80 italic">$1</span>')
                                            }} 
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {result.beginner_insight.tips?.map((tip: any, idx: number) => (
                                            <div key={idx} className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    <div className="text-xs font-bold text-emerald-400">{tip.label}</div>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed font-light">{tip.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Professional Chart Section */}
                        <div className="rounded-3xl bg-black border border-white/10 p-4 md:p-8">
                            {/* Chart Controls */}
                            <div className="flex flex-col gap-4 mb-8">
                                <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl w-fit border border-white/10">
                                    <button onClick={() => setChartType('line')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${chartType === 'line' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>선차트</button>
                                    <button onClick={() => setChartType('candle')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${chartType === 'candle' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>봉차트</button>
                                </div>

                                 <div className="flex flex-wrap items-center gap-3">
                                    {chartType === 'line' ? (
                                        [
                                            { label: '1일', value: '1d' },
                                            { label: '1주일', value: '1주일' },
                                            { label: '3개월', value: '3개월' },
                                            { label: '1년', value: '1년' },
                                            { label: '3년', value: '3년' },
                                            { label: '5년', value: '5년' },
                                            { label: '10년', value: '10년' }
                                        ].map((p) => (
                                            <button key={p.value} onClick={() => setLinePeriod(p.value)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${linePeriod === p.value ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'}`}>{p.label}</button>
                                        ))
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <select
                                                    value={['1m','5m','30m','60m'].includes(candleInterval) ? candleInterval : 'default'}
                                                    onChange={(e) => setCandleInterval(e.target.value as any)}
                                                    className={`appearance-none px-4 py-2 pr-8 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer ${
                                                        ['1m','5m','30m','60m'].includes(candleInterval) 
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-500' 
                                                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                                                    }`}
                                                >
                                                    <option value="default" disabled className="bg-gray-900 text-gray-500">분봉 ▾</option>
                                                    <option value="1m" className="bg-gray-800 text-white">1분봉</option>
                                                    <option value="5m" className="bg-gray-800 text-white">5분봉</option>
                                                    <option value="30m" className="bg-gray-800 text-white">30분봉</option>
                                                    <option value="60m" className="bg-gray-800 text-white">1시간봉</option>
                                                </select>
                                                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                                                    <svg className={`w-3 h-3 ${['1m','5m','30m','60m'].includes(candleInterval) ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>

                                            {[
                                                { label: '일봉', value: '1d' },
                                                { label: '주봉', value: '1wk' },
                                                { label: '월봉', value: '1mo' }
                                            ].map((i) => (
                                                <button key={i.value} onClick={() => setCandleInterval(i.value as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${candleInterval === i.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'}`}>{i.label}</button>
                                            ))}
                                            
                                            {/* Optimization Badge for Intraday */}
                                            {(candleInterval.includes('m') || candleInterval === '60m') && (
                                                <div className="ml-2 flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-full animate-pulse">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Intraday Optimized (1D)</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 mb-6 text-[10px] md:text-xs text-gray-400">
                                {chartType === 'candle' ? (
                                    <>
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]" /><span>양봉</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span>음봉</span></div>
                                        <div className="flex items-center gap-1.5"><div className="h-0.5 w-3 bg-[#22c55e]" /><span>MA5</span></div>
                                        <div className="flex items-center gap-1.5"><div className="h-0.5 w-3 bg-[#ef4444]" /><span>MA20</span></div>
                                        <div className="flex items-center gap-1.5"><div className="h-0.5 w-3 bg-[#f97316]" /><span>MA60</span></div>
                                        <div className="flex items-center gap-1.5"><div className="h-0.5 w-3 bg-[#a855f7]" /><span>MA120</span></div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-emerald-500" /><span>종가 추세선</span></div>
                                )}
                            </div>

                             <div className="space-y-4 relative">
                                {updating && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 rounded-2xl flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                                            <span className="text-xs font-bold text-white">동기화 중...</span>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-white/5 rounded-2xl p-2 border border-white/5 min-h-[400px]">
                                    {isMounted && <Chart key={`chart-${chartType}-${candleInterval}`} options={chartOptions} series={chartSeries} type={chartType === 'line' ? 'area' : 'candlestick'} height={400} />}
                                </div>
                                <div className="bg-white/5 rounded-2xl p-2 border border-white/5">
                                    {isMounted && <Chart key={`vol-${chartType}-${candleInterval}`} options={volumeOptions} series={volumeSeries} type="bar" height={120} />}
                                </div>
                            </div>
                        </div>

                        {/* Investor Trend (Whale Tracker) - Only show for KR stocks with whale data */}
                        {result.whale && (
                            <div className="rounded-3xl bg-white/5 border border-white/10 p-8 space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-3"><TowerControl className="w-6 h-6 text-blue-400" /> 📡 세력 평단가 추적기</h3>
                                    <div className="px-3 py-1 bg-blue-500/10 rounded-full text-[10px] font-bold text-blue-400 border border-blue-500/20 uppercase tracking-tighter">최근 40일 추정</div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Whale Average Prices */}
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gradient-to-br from-blue-500/10 to-transparent p-5 rounded-2xl border border-blue-500/20 flex flex-col justify-between h-32">
                                                <p className="text-gray-400 text-xs font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> 외국인 평단</p>
                                                <div>
                                                    <p className="text-2xl font-black text-white font-mono">₩{result.whale?.foreigner?.avg_price?.toLocaleString()}</p>
                                                    <div className={`text-xs mt-1 font-bold ${result.whale?.foreigner?.return_rate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                        수익률 {result.whale?.foreigner?.return_rate}%
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-purple-500/10 to-transparent p-5 rounded-2xl border border-purple-500/20 flex flex-col justify-between h-32">
                                                <p className="text-gray-400 text-xs font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> 기관 평단</p>
                                                <div>
                                                    <p className="text-2xl font-black text-white font-mono">₩{result.whale?.institution?.avg_price?.toLocaleString()}</p>
                                                    <div className={`text-xs mt-1 font-bold ${result.whale?.institution?.return_rate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                        수익률 {result.whale?.institution?.return_rate}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Flow Chart Placeholder/Text */}
                                    <div className="bg-black/40 rounded-2xl p-6 border border-white/10">
                                        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-400">
                                            <Activity className="w-4 h-4 text-emerald-500" /> 5개 투자 데이터 실시간 체크
                                        </div>
                                        <div className="space-y-4">
                                            {result.whale?.ingredients?.map((ing: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                                    <span className="text-gray-500 font-mono">{ing.date.split('-').slice(1).join('/')}</span>
                                                    <span className={`font-bold ${ing.winner === '개인' ? 'text-yellow-400' : ing.winner === '외국인' ? 'text-red-400' : 'text-blue-400'}`}>{ing.winner} 입성</span>
                                                    <span className="text-gray-300 font-mono">₩{ing.price.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <AIDisclaimer className="mt-8" />
                    </div>
                )}
            </div>

        </div>
    );
}
