"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { 
    Search, LineChart, Target, Shield, AlertTriangle, Loader2, Lock, 
    PlayCircle, Crown, Sun, CloudSun, CloudRain, 
    PieChart, BarChart3, TrendingUp, TrendingDown, Clock,
    TowerControl, Activity, Download, Share2
} from "lucide-react";
import html2canvas from "html2canvas";
import dynamic from "next/dynamic";

// ApexCharts is heavy and needs window, so load it dynamically
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import AIDisclaimer from "@/components/AIDisclaimer";

import { getTickerFromKorean } from "@/lib/stockMapping";
import AdRewardModal from "@/components/AdRewardModal";
import KakaoShareButton from "@/components/KakaoShareButton";
import KakaoRevenueAd from "@/components/KakaoRevenueAd";

export default function PatternPage() {
    const [searchInput, setSearchInput] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [chartType, setChartType] = useState<"line" | "candle">("candle");
    const [linePeriod, setLinePeriod] = useState<string>("3개월");
    const [candleInterval, setCandleInterval] = useState<string>("1d");
    const [candleZoomCount, setCandleZoomCount] = useState<number>(45);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showDocent, setShowDocent] = useState(true);
    const [showSupportResistance, setShowSupportResistance] = useState(true);

    // [Cache & Autocomplete]
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (!searchInput) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(searchInput)}`);
                const json = await res.json();
                if (json.status === "success") setSearchResults(json.data);
            } catch (e) {}
        }, 200);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        setIsMounted(true);
        const checkMobile = () => {
            const mob = window.innerWidth < 768;
            setIsMobile(mob);
            setCandleZoomCount((prev) => (prev === 45 && !mob ? 90 : prev));
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        const stored = localStorage.getItem("showDocent");
        if (stored !== null) setShowDocent(stored === "true");
        const storedSR = localStorage.getItem("showSupportResistance");
        if (storedSR !== null) setShowSupportResistance(storedSR === "true");
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // [v4] 일일 횟수 제한 시스템 완전 제거 - checkReward/isFreeModeEnabled 기반으로 교체
    const [showAdModal, setShowAdModal] = useState(false);


    // [Cache Object]
    const PATTERN_CACHE: Record<string, { data: any, timestamp: number }> = useMemo(() => ({}), []);

    const prefetchPattern = async (sym: string) => {
        const ticker = getTickerFromKorean(sym).toUpperCase();
        if (PATTERN_CACHE[ticker]) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/chart/patterns/${ticker}?interval=1d&period=1y&t=${Date.now()}`);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                PATTERN_CACHE[ticker] = { data: json.data, timestamp: Date.now() };
            }
        } catch(e) {}
    };

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

        // [v4] 더 이상 잊금 체크 없음 - 누구나 무료로 차트 분석 가능

        const isNewSearch = typeof targetSymbol === 'string' && !targetParams;
        if (isNewSearch) {
            setLoading(true);
            setResult(null);
        } else {
            setUpdating(true);
        }

        // [v4] dailyCount 토큰 업데이트 제거 (dailyCount 상태자체를 제거함)

        const ticker = getTickerFromKorean(symbolToSearch).toUpperCase();

        // [Cache Check]
        if (isNewSearch && PATTERN_CACHE[ticker]) {
            setResult(PATTERN_CACHE[ticker].data);
            setLoading(false);
            setUpdating(false);
            
            // Background update
            try {
                fetch(`${API_BASE_URL}/api/analysis/chart/patterns/${ticker}?interval=${intervalToUse}&period=${periodToUse}&t=${Date.now()}`)
                    .then(r => r.json())
                    .then(json => {
                        if (json.status === "success" && json.data) {
                            PATTERN_CACHE[ticker] = { data: json.data, timestamp: Date.now() };
                            setResult(json.data);
                        }
                    });
            } catch(e) {}
            return;
        }

        try {
            const ticker = getTickerFromKorean(symbolToSearch).toUpperCase();
            const res = await fetch(`${API_BASE_URL}/api/analysis/chart/patterns/${ticker}?interval=${intervalToUse}&period=${periodToUse}&t=${Date.now()}`);
            const json = await res.json();
            if (json.status === "success" && json.data) {
                if (isNewSearch) {
                    PATTERN_CACHE[ticker] = { data: json.data, timestamp: Date.now() };
                }
                setResult(json.data);
            } else {
                alert(json.message || "검색 결과가 없습니다. 티커를 확인해주세요.");
            }
        } catch (e) {
            console.error(e);
            alert("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
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
            const isIntraday = ['1m', '5m', '30m', '60m'].includes(candleInterval);
            let periodToUse = chartType === 'line' ? linePeriod : (isIntraday ? '1d' : undefined);
            
            handleSearch(symbol, { 
                period: periodToUse,
                interval: chartType === 'candle' ? candleInterval : '1d'
            });
        }
    }, [linePeriod, candleInterval, chartType]);

    const handleAdReward = () => {
        setShowAdModal(false);
    };

    // [v4] 차트 페이지 잊금 완전 제거 - isLocked 항상 false
    const isLocked = false;

    const handleDownloadImage = async () => {
        const captureEl = document.getElementById("capture-area");
        if (!captureEl) return;

        try {
            const buttons = captureEl.querySelectorAll('.hide-on-capture');
            buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

            const canvas = await html2canvas(captureEl, {
                backgroundColor: "#000000",
                scale: 2,
                logging: false,
                useCORS: true
            });

            buttons.forEach(btn => (btn as HTMLElement).style.display = '');

            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `pattern_analysis_${result?.stock_info?.symbol || 'result'}.png`;
            link.href = url;
            link.click();
        } catch (e) {
            console.error(e);
            alert("이미지 저장에 실패했습니다.");
        }
    };


    const isUS = useMemo(() => {
        const symbol = result?.stock_info?.symbol || searchInput || "";
        return /[a-zA-Z]/.test(symbol);
    }, [result, searchInput]);

    const formatPrice = (val: number | string | undefined | null) => {
        if (val === undefined || val === null || isNaN(Number(val))) return '0';
        const num = Number(val);
        if (isUS) {
            return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            return `₩${Math.round(num).toLocaleString()}`;
        }
    };

    const formatCompactAxisPrice = (val: number | string | undefined | null) => {
        if (val === undefined || val === null || isNaN(Number(val))) return '0';
        const num = Number(val);
        if (!isMobile) return formatPrice(num);
        if (isUS) {
            return num >= 1000 ? `$${(num / 1000).toFixed(1)}k` : `$${num.toFixed(0)}`;
        }
        if (num >= 100000) return `${(num / 10000).toFixed(1)}만`;
        return Math.round(num).toLocaleString();
    };

    // Moving Averages (calculated on full history so MA60/MA120 are accurate from day 1 of zoomed slice)
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

    const displayStartIdx = useMemo(() => {
        const fullLen = result?.history?.length || 0;
        if (!fullLen) return 0;
        if (chartType === 'candle' && candleZoomCount > 0 && fullLen > candleZoomCount) {
            return fullLen - candleZoomCount;
        }
        return 0;
    }, [result?.history, chartType, candleZoomCount]);

    const displayHistory = useMemo(() => {
        if (!result?.history) return [];
        return result.history.slice(displayStartIdx);
    }, [result?.history, displayStartIdx]);

    const activeBarInfo = useMemo(() => {
        if (!displayHistory.length) return null;
        const localIdx = (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < displayHistory.length)
            ? hoveredIndex
            : displayHistory.length - 1;
        const globalIdx = displayStartIdx + localIdx;
        const item = displayHistory[localIdx];
        if (!item) return null;
        return {
            item,
            ma5: movingAverages.ma5[globalIdx],
            ma20: movingAverages.ma20[globalIdx],
            ma60: movingAverages.ma60[globalIdx],
            ma120: movingAverages.ma120[globalIdx],
        };
    }, [displayHistory, hoveredIndex, displayStartIdx, movingAverages]);

    // ApexCharts Configurations
    const chartSeries = useMemo(() => {
        if (!displayHistory.length) return [];

        if (chartType === 'line') {
            return [
                {
                    name: 'Price',
                    type: 'area',
                    data: displayHistory.map((d: any) => ({
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
                    data: displayHistory.map((d: any) => ({
                        x: new Date(d.date).getTime(),
                        y: [d.open, d.high, d.low, d.close]
                    }))
                },
                { name: '5일선', type: 'line', data: displayHistory.map((d: any, i: number) => ({ x: new Date(d.date).getTime(), y: movingAverages.ma5[displayStartIdx + i] })) },
                { name: '20일선', type: 'line', data: displayHistory.map((d: any, i: number) => ({ x: new Date(d.date).getTime(), y: movingAverages.ma20[displayStartIdx + i] })) },
                { name: '60일선', type: 'line', data: displayHistory.map((d: any, i: number) => ({ x: new Date(d.date).getTime(), y: movingAverages.ma60[displayStartIdx + i] })) },
                { name: '120일선', type: 'line', data: displayHistory.map((d: any, i: number) => ({ x: new Date(d.date).getTime(), y: movingAverages.ma120[displayStartIdx + i] })) }
            ];
        }
    }, [displayHistory, displayStartIdx, chartType, movingAverages]);

    const volumeSeries = useMemo(() => {
        if (!displayHistory.length) return [];
        return [{
            name: '거래량',
            type: 'bar',
            data: displayHistory.map((d: any) => ({
                x: new Date(d.date).getTime(),
                y: d.volume,
                fillColor: Number(d.close) >= Number(d.open) ? '#ef444475' : '#3b82f675'
            }))
        }];
    }, [displayHistory]);

    const chartHeight = isChartExpanded ? (isMobile ? 480 : 560) : (isMobile ? 360 : 420);

    const chartOptions: any = {
        chart: {
            type: chartType === 'line' ? 'area' : 'candlestick',
            height: chartHeight,
            id: 'candles',
            toolbar: {
                show: true,
                tools: {
                    download: false,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            },
            zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
            background: 'transparent',
            foreColor: '#9ca3af',
            events: {
                mouseMove: (_event: any, _chartContext: any, config: any) => {
                    if (typeof config?.dataPointIndex === 'number' && config.dataPointIndex >= 0) {
                        setHoveredIndex(config.dataPointIndex);
                    }
                },
                click: (_event: any, _chartContext: any, config: any) => {
                    if (typeof config?.dataPointIndex === 'number' && config.dataPointIndex >= 0) {
                        setHoveredIndex(config.dataPointIndex);
                    }
                }
            },
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
        stroke: { width: chartType === 'line' ? [2.2] : [1.2, 1.8, 1.8, 1.8, 1.8], curve: 'smooth' },
        fill: {
            type: chartType === 'line' ? 'gradient' : 'solid',
            gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.08, stops: [0, 90, 100] }
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
            tickAmount: isMobile ? 4 : 8,
            labels: {
                datetimeUTC: false,
                style: { fontSize: isMobile ? '10px' : '11px', colors: '#9ca3af' },
                datetimeFormatter: {
                    year: 'yy년',
                    month: 'yy.MM',
                    day: 'M/d',
                    hour: 'HH:mm'
                }
            }
        },
        yaxis: {
            opposite: true,
            tickAmount: isMobile ? 5 : 7,
            labels: {
                style: { fontSize: isMobile ? '10px' : '11px', colors: '#d1d5db', fontWeight: 700 },
                formatter: (val: number) => formatCompactAxisPrice(val)
            }
        },
        grid: {
            borderColor: '#ffffff10',
            strokeDashArray: 3,
            padding: { left: isMobile ? 2 : 10, right: isMobile ? 2 : 10, top: 6, bottom: 0 }
        },
        tooltip: {
            shared: true,
            x: { format: ['1m','5m','30m','60m'].includes(candleInterval) ? 'yyyy년 MM월 dd일 HH:mm' : 'yyyy년 MM월 dd일' },
            y: { formatter: (val: number) => formatPrice(val) },
            custom: function({ dataPointIndex }: any) {
                const item = displayHistory[dataPointIndex];
                if (!item) return "";
                const globalIdx = displayStartIdx + dataPointIndex;

                const rawDate = new Date(item.date);
                const yyyy = rawDate.getFullYear();
                const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
                const dd = String(rawDate.getDate()).padStart(2, '0');
                const hh = String(rawDate.getHours()).padStart(2, '0');
                const mins = String(rawDate.getMinutes()).padStart(2, '0');

                const isIntraday = ['1m','5m','30m','60m'].includes(candleInterval);
                const dateHeader = isIntraday 
                    ? `${yyyy}.${mm}.${dd} ${hh}:${mins}`
                    : `${yyyy}.${mm}.${dd}`;

                const ma5 = movingAverages.ma5[globalIdx];
                const ma20 = movingAverages.ma20[globalIdx];
                const ma60 = movingAverages.ma60[globalIdx];
                const ma120 = movingAverages.ma120[globalIdx];

                const volumeStr = item.volume?.toLocaleString() || "0";
                
                let priceSection = "";
                if (chartType === 'candle') {
                    priceSection = `
                        <div class="flex gap-4 justify-between mb-0.5 text-[11px]"><span class="text-gray-400">시가</span> <span class="font-mono font-medium text-white">${formatPrice(item.open)}</span></div>
                        <div class="flex gap-4 justify-between mb-0.5 text-[11px]"><span class="text-gray-400">고가</span> <span class="font-mono font-semibold text-red-400">${formatPrice(item.high)}</span></div>
                        <div class="flex gap-4 justify-between mb-0.5 text-[11px]"><span class="text-gray-400">저가</span> <span class="font-mono font-semibold text-blue-400">${formatPrice(item.low)}</span></div>
                        <div class="flex gap-4 justify-between mb-1.5 text-[11px] font-bold border-b border-gray-700/30 pb-1"><span class="text-gray-300">종가</span> <span class="font-mono font-black text-white">${formatPrice(item.close)}</span></div>
                    `;
                } else {
                    priceSection = `
                        <div class="flex gap-4 justify-between mb-1.5 text-xs font-bold border-b border-gray-700/30 pb-1"><span class="text-gray-300">종가</span> <span class="font-mono font-black text-emerald-400">${formatPrice(item.close)}</span></div>
                    `;
                }

                return `
                    <div class="bg-gray-900/95 backdrop-blur-md border border-gray-700/60 p-2.5 rounded-xl shadow-2xl text-white whitespace-nowrap z-50 pointer-events-none min-w-[165px]">
                        <div class="text-[10px] font-black text-gray-300 border-b border-gray-700/50 pb-1 mb-1.5">
                            📅 ${dateHeader}
                        </div>
                        ${priceSection}
                        <div class="flex gap-4 justify-between mb-1 text-[10px]"><span class="text-gray-400">거래량</span> <span class="font-mono font-bold text-blue-300">${volumeStr}</span></div>
                        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 pt-1.5 border-t border-gray-700/50">
                            <div class="flex justify-between text-[9px]"><span class="text-emerald-400 font-bold">MA5</span> <span class="font-mono text-gray-200">${ma5 ? formatCompactAxisPrice(ma5) : '-'}</span></div>
                            <div class="flex justify-between text-[9px]"><span class="text-red-400 font-bold">MA20</span> <span class="font-mono text-gray-200">${ma20 ? formatCompactAxisPrice(ma20) : '-'}</span></div>
                            <div class="flex justify-between text-[9px]"><span class="text-orange-400 font-bold">MA60</span> <span class="font-mono text-gray-200">${ma60 ? formatCompactAxisPrice(ma60) : '-'}</span></div>
                            <div class="flex justify-between text-[9px]"><span class="text-purple-400 font-bold">MA120</span> <span class="font-mono text-gray-200">${ma120 ? formatCompactAxisPrice(ma120) : '-'}</span></div>
                        </div>
                    </div>
                `;
            }
        },
        annotations: {
            yaxis: (showSupportResistance && result?.support_resistance) ? [
                {
                    y: result.support_resistance.support1,
                    borderColor: '#10b981',
                    strokeDashArray: 4,
                    borderWidth: 1.5,
                    label: {
                        borderColor: '#10b981',
                        style: {
                            color: '#ffffff',
                            background: '#059669',
                            fontSize: isMobile ? '9px' : '11px',
                            fontWeight: 700,
                            padding: { left: 4, right: 4, top: 2, bottom: 2 }
                        },
                        text: isMobile
                            ? `지지 ${formatCompactAxisPrice(result.support_resistance.support1)}`
                            : `1차 지지선 ${formatPrice(result.support_resistance.support1)} (${result.support_resistance.support1_pct > 0 ? '+' : ''}${result.support_resistance.support1_pct}%)`,
                        position: 'left',
                        textAnchor: 'start',
                        offsetX: 4
                    }
                },
                {
                    y: result.support_resistance.resistance1,
                    borderColor: '#f43f5e',
                    strokeDashArray: 4,
                    borderWidth: 1.5,
                    label: {
                        borderColor: '#f43f5e',
                        style: {
                            color: '#ffffff',
                            background: '#e11d48',
                            fontSize: isMobile ? '9px' : '11px',
                            fontWeight: 700,
                            padding: { left: 4, right: 4, top: 2, bottom: 2 }
                        },
                        text: isMobile
                            ? `저항 ${formatCompactAxisPrice(result.support_resistance.resistance1)}`
                            : `1차 저항선 ${formatPrice(result.support_resistance.resistance1)} (+${result.support_resistance.resistance1_pct}%)`,
                        position: 'left',
                        textAnchor: 'start',
                        offsetX: 4
                    }
                }
            ] : [],
            points: [
                ...(displayHistory.length > 0 ? [
                    (() => {
                        const isLine = chartType === 'line';
                        const highest = [...displayHistory].sort((a, b) => isLine ? (b.close - a.close) : (b.high - a.high))[0];
                        const idx = displayHistory.indexOf(highest);
                        const n = displayHistory.length;
                        const isStart = idx < n * 0.2;
                        const isEnd = idx > n * 0.8;
                        const d = new Date(highest.date);
                        const dateStr = isMobile ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                        const targetVal = isLine ? highest.close : highest.high;
                        return {
                            x: new Date(highest.date).getTime(),
                            y: targetVal,
                            marker: { size: 0 },
                            label: {
                                text: `최고 ${formatPrice(targetVal)} (${dateStr}) ↓`,
                                borderColor: '#ef4444',
                                textAnchor: isStart ? 'start' : (isEnd ? 'end' : 'middle'),
                                offsetX: isStart ? 6 : (isEnd ? -6 : 0),
                                style: { color: '#fff', background: '#ef4444', fontSize: isMobile ? '9px' : '11px', fontWeight: 700 }
                            }
                        };
                    })(),
                    (() => {
                        const isLine = chartType === 'line';
                        const lowest = [...displayHistory].sort((a, b) => isLine ? (a.close - b.close) : (a.low - b.low))[0];
                        const idx = displayHistory.indexOf(lowest);
                        const n = displayHistory.length;
                        const isStart = idx < n * 0.2;
                        const isEnd = idx > n * 0.8;
                        const d = new Date(lowest.date);
                        const dateStr = isMobile ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                        const targetVal = isLine ? lowest.close : lowest.low;
                        return {
                            x: new Date(lowest.date).getTime(),
                            y: targetVal,
                            marker: { size: 0 },
                            label: {
                                text: `↑ 최저 ${formatPrice(targetVal)} (${dateStr})`,
                                borderColor: '#3b82f6',
                                offsetY: 34,
                                textAnchor: isStart ? 'start' : (isEnd ? 'end' : 'middle'),
                                offsetX: isStart ? 6 : (isEnd ? -6 : 0),
                                style: { color: '#fff', background: '#3b82f6', fontSize: isMobile ? '9px' : '11px', fontWeight: 700 }
                            }
                        };
                    })()
                ] : [])
            ]
        },
        colors: chartType === 'line' ? ['#10b981'] : ['#ef4444', '#22c55e', '#ef4444', '#f97316', '#a855f7'],
        legend: { show: false }
    };

    const volumeOptions: any = {
        chart: { height: isMobile ? 95 : 120, type: 'bar', toolbar: { show: false }, background: 'transparent', foreColor: '#9ca3af' },
        theme: { mode: 'dark' },
        plotOptions: { bar: { columnWidth: '75%' } },
        dataLabels: { enabled: false },
        xaxis: { 
            type: 'datetime', 
            axisBorder: { show: false }, 
            axisTicks: { show: false }, 
            tickAmount: isMobile ? 4 : 8,
            labels: { 
                datetimeUTC: false,
                show: true,
                style: { colors: '#6b7280', fontSize: isMobile ? '9px' : '10px' },
                datetimeFormatter: {
                    year: 'yy년',
                    month: 'M월',
                    day: 'M/d',
                    hour: 'HH:mm'
                }
            }
        },
        yaxis: { 
            opposite: true,
            tickAmount: 3,
            labels: { 
                style: { colors: '#6b7280', fontSize: isMobile ? '9px' : '10px' },
                formatter: (val: number) => {
                    if (val >= 100000000) return (val / 100000000).toFixed(1) + '억';
                    if (val >= 10000) return Math.round(val / 10000).toLocaleString() + '만';
                    return Math.round(val).toLocaleString();
                }
            } 
        },
        grid: { show: true, borderColor: '#ffffff08', strokeDashArray: 2, padding: { left: isMobile ? 2 : 10, right: isMobile ? 2 : 10 } }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen pb-20 bg-black">
            <Header />

            <AdRewardModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} onReward={handleAdReward} featureName="PatternAnalytics" />

            <div className="px-2.5 py-4 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-8">
                {/* Search Bar & Title */}
                <div className="text-center space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase">
                        PRO QUANT ANALYTICS
                    </div>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white flex items-center justify-center gap-2 sm:gap-3">
                        <LineChart className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 text-emerald-400 shrink-0" />
                        <span>프로 퀀트 차트 분석 <span className="text-emerald-400">고급</span></span>
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm md:text-base font-medium">
                        과거 5개년 패턴 통계 알고리즘 및 기관·외국인 수급 정밀 퀀트 리포트
                    </p>
                    
                    {/* 기술적 지표 브리핑 토글 스위치 */}
                    <div className="flex justify-center mt-2 sm:mt-4">
                        <button 
                            onClick={() => {
                                const next = !showDocent;
                                setShowDocent(next);
                                localStorage.setItem("showDocent", String(next));
                            }}
                            className={`flex items-center gap-3 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border transition-all duration-300 ${showDocent ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500'}`}
                        >
                            <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${showDocent ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${showDocent ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                            <span className="text-xs font-black tracking-wider">기술적 지표 브리핑 {showDocent ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>

                    {/* 인기 검색 퀵 칩 */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                        <span className="text-xs text-gray-500 font-bold">인기 분석:</span>
                        {[
                            { label: "삼성전자", sym: "005930" },
                            { label: "SK하이닉스", sym: "000660" },
                            { label: "현대차", sym: "005380" },
                            { label: "NAVER", sym: "035420" },
                            { label: "카카오", sym: "035720" },
                            { label: "AAPL", sym: "AAPL" },
                            { label: "NVDA", sym: "NVDA" },
                            { label: "TSLA", sym: "TSLA" },
                        ].map(t => (
                            <button
                                key={t.sym}
                                onClick={() => {
                                    setSearchInput(t.sym);
                                    handleSearch(t.sym);
                                }}
                                className="px-2.5 sm:px-3 py-1 rounded-xl bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-emerald-300 text-xs font-bold transition-all"
                            >
                                #{t.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative max-w-xl mx-auto z-20 mt-3 sm:mt-4">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => {
                                    setSearchInput(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="종목명 또는 티커 입력 (예: 삼성전자, 005930, AAPL)"
                                className="relative w-full bg-zinc-950 border border-white/10 rounded-2xl py-3.5 sm:py-4 md:py-5 pl-11 sm:pl-14 pr-24 sm:pr-32 text-white text-sm sm:text-base md:text-lg font-bold focus:outline-none transition-colors"
                                disabled={loading || isLocked}
                            />
                            
                            {/* [Autocomplete Dropdown] */}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                    {searchResults.map((item: any, idx: number) => (
                                        <div
                                            key={idx}
                                            onMouseEnter={() => prefetchPattern(item.symbol)}
                                            onClick={() => {
                                                setSearchInput(item.symbol);
                                                setShowResults(false);
                                                handleSearch(item.symbol);
                                            }}
                                            className="px-4 py-3 hover:bg-zinc-800 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-sm">{item.name}</span>
                                                <span className="text-xs text-gray-400 font-mono mt-0.5">{item.symbol}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 z-10" />
                            <button onClick={() => handleSearch()} disabled={loading || isLocked} className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 sm:px-5 py-2 md:py-2.5 rounded-xl text-xs sm:text-sm md:text-base font-black transition-all disabled:opacity-50 z-10 shadow-lg shadow-emerald-600/30">
                                {isLocked ? <Lock className="w-5 h-5" /> : "분석하기"}
                            </button>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 sm:py-28 text-emerald-400 space-y-5">
                        <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 animate-spin text-emerald-400" />
                        <div className="text-center space-y-1">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white animate-pulse">빅데이터 차트 패턴 및 수급 분석 중...</h3>
                            <p className="text-xs text-gray-400">과거 5개년 캔들 통계와 메이저 수급을 대조하고 있습니다.</p>
                        </div>
                    </div>
                )}

                {result && (
                    <div id="capture-area" className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-5 sm:space-y-6 bg-black pb-6 rounded-3xl">
                        
                        {/* 액션 버튼 */}
                        <div className="flex gap-2 justify-end hide-on-capture mt-1">
                            <button
                                onClick={handleDownloadImage}
                                className="bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md"
                            >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                                차트 저장
                            </button>
                            <KakaoShareButton 
                                title={`${result?.stock_info?.symbol || '종목'} 프로 퀀트 차트 분석`} 
                                description={result.weather?.comment || "과거 5개년 캔들 통계와 메이저 수급 분석 리포트를 확인해보세요."}
                                url={`https://stock-trend-program.co.kr/pattern?q=${result?.stock_info?.symbol || ''}`}
                                className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md"
                                buttonText="카톡 공유"
                            />
                        </div>

                        {/* 1. 프로페셔널 차트 & 거래량 섹션 (모바일 최상단 배치 + 확대/축소 + 터치 시세 전광판) */}
                        <div className="rounded-3xl bg-zinc-900/95 border border-emerald-500/25 p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-5 shadow-2xl">
                            {/* 상단 차트 컨트롤 */}
                            <div className="flex flex-col gap-3 border-b border-white/10 pb-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 bg-zinc-800/90 p-1 rounded-xl border border-white/10">
                                        <button 
                                            onClick={() => setChartType('candle')} 
                                            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all ${chartType === 'candle' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            🕯️ 캔들스틱
                                        </button>
                                        <button 
                                            onClick={() => setChartType('line')} 
                                            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all ${chartType === 'line' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            📈 영역 라인
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {/* 지지·저항선 토글 버튼 */}
                                        <button 
                                            onClick={() => {
                                                const next = !showSupportResistance;
                                                setShowSupportResistance(next);
                                                localStorage.setItem("showSupportResistance", String(next));
                                            }}
                                            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black border transition-all ${
                                                showSupportResistance 
                                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/10' 
                                                    : 'bg-zinc-800/50 border-white/5 text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>지지·저항</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                showSupportResistance ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-gray-400'
                                            }`}>
                                                {showSupportResistance ? 'ON' : 'OFF'}
                                            </span>
                                        </button>

                                        {/* 모바일 차트 크게 보기 토글 */}
                                        <button
                                            onClick={() => setIsChartExpanded(!isChartExpanded)}
                                            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black border transition-all ${
                                                isChartExpanded
                                                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                                    : 'bg-zinc-800/60 border-white/10 text-gray-300 hover:text-white'
                                            }`}
                                        >
                                            {isChartExpanded ? '⛶ 기본 크기' : '⛶ 크게 보기'}
                                        </button>
                                    </div>
                                </div>

                                {/* 봉 주기 & 모바일 봉 개수(확대 배율) 컨트롤 */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {chartType === 'line' ? (
                                            [
                                                { label: '1일', value: '1d' },
                                                { label: '1주일', value: '1주일' },
                                                { label: '3개월', value: '3개월' },
                                                { label: '1년', value: '1년' },
                                                { label: '3년', value: '3년' },
                                                { label: '5년', value: '5년' }
                                            ].map((p) => (
                                                <button 
                                                    key={p.value} 
                                                    onClick={() => setLinePeriod(p.value)} 
                                                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all ${linePeriod === p.value ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-zinc-800/50 text-gray-400 hover:text-white border border-white/5'}`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))
                                        ) : (
                                            <>
                                                <div className="relative">
                                                    <select
                                                        value={['1m','5m','30m','60m'].includes(candleInterval) ? candleInterval : 'default'}
                                                        onChange={(e) => setCandleInterval(e.target.value as any)}
                                                        className={`appearance-none px-2.5 sm:px-3.5 py-1.5 pr-6 rounded-lg text-xs font-black transition-all outline-none cursor-pointer ${
                                                            ['1m','5m','30m','60m'].includes(candleInterval) 
                                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-500' 
                                                            : 'bg-zinc-800/50 text-gray-400 hover:text-white border border-white/5'
                                                        }`}
                                                    >
                                                        <option value="default" disabled className="bg-zinc-900 text-gray-500">분봉 ▾</option>
                                                        <option value="1m" className="bg-zinc-800 text-white">1분봉</option>
                                                        <option value="5m" className="bg-zinc-800 text-white">5분봉</option>
                                                        <option value="30m" className="bg-zinc-800 text-white">30분봉</option>
                                                        <option value="60m" className="bg-zinc-800 text-white">1시간봉</option>
                                                    </select>
                                                    <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
                                                        <svg className={`w-3 h-3 ${['1m','5m','30m','60m'].includes(candleInterval) ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>

                                                {[
                                                    { label: '일봉', value: '1d' },
                                                    { label: '주봉', value: '1wk' },
                                                    { label: '월봉', value: '1mo' }
                                                ].map((i) => (
                                                    <button 
                                                        key={i.value} 
                                                        onClick={() => setCandleInterval(i.value as any)} 
                                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all ${candleInterval === i.value ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-zinc-800/50 text-gray-400 hover:text-white border border-white/5'}`}
                                                    >
                                                        {i.label}
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>

                                    {/* 캔들 확대 배율 버튼 (모바일 가독성 핵심) */}
                                    {chartType === 'candle' && (
                                        <div className="flex items-center gap-1 bg-zinc-950/90 p-1 rounded-xl border border-emerald-500/20 w-full sm:w-auto justify-between sm:justify-start">
                                            <span className="text-[10px] font-extrabold text-emerald-400 px-2 shrink-0">🔍 화면 배율</span>
                                            <div className="flex items-center gap-1">
                                                {[
                                                    { label: '30봉(확대)', count: 30 },
                                                    { label: '45봉(추천)', count: 45 },
                                                    { label: '90봉', count: 90 },
                                                    { label: '전체', count: 0 },
                                                ].map((z) => (
                                                    <button
                                                        key={z.count}
                                                        onClick={() => setCandleZoomCount(z.count)}
                                                        className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                                                            candleZoomCount === z.count
                                                                ? 'bg-emerald-500 text-black shadow-sm'
                                                                : 'text-gray-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {z.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 실시간 터치 봉 시세 · 이동평균선 HTS 전광판 (모바일에서 손가락에 가리지 않고 선명하게 확인) */}
                            {activeBarInfo && (
                                <div className="bg-zinc-950/90 border border-white/10 rounded-2xl p-2.5 sm:p-3.5 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-black text-[11px] font-mono">
                                                📅 {new Date(activeBarInfo.item.date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                            </span>
                                            <span className="text-white font-black text-sm sm:text-base font-mono">
                                                종가 {formatPrice(activeBarInfo.item.close)}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
                                            <span><span className="text-gray-500 font-sans">시가</span> <b className="text-gray-200">{formatCompactAxisPrice(activeBarInfo.item.open)}</b></span>
                                            <span><span className="text-gray-500 font-sans">고가</span> <b className="text-rose-400">{formatCompactAxisPrice(activeBarInfo.item.high)}</b></span>
                                            <span><span className="text-gray-500 font-sans">저가</span> <b className="text-blue-400">{formatCompactAxisPrice(activeBarInfo.item.low)}</b></span>
                                            <span><span className="text-gray-500 font-sans">거래량</span> <b className="text-amber-300">{(activeBarInfo.item.volume || 0).toLocaleString()}</b></span>
                                        </div>
                                    </div>
                                    {chartType === 'candle' && (
                                        <div className="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-white/5 text-[10px] sm:text-xs font-mono">
                                            <div className="flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded-lg">
                                                <span className="text-[#22c55e] font-bold font-sans">5일</span>
                                                <span className="text-white font-bold">{activeBarInfo.ma5 ? formatCompactAxisPrice(activeBarInfo.ma5) : '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded-lg">
                                                <span className="text-[#ef4444] font-bold font-sans">20일</span>
                                                <span className="text-white font-bold">{activeBarInfo.ma20 ? formatCompactAxisPrice(activeBarInfo.ma20) : '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded-lg">
                                                <span className="text-[#f97316] font-bold font-sans">60일</span>
                                                <span className="text-white font-bold">{activeBarInfo.ma60 ? formatCompactAxisPrice(activeBarInfo.ma60) : '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded-lg">
                                                <span className="text-[#a855f7] font-bold font-sans">120일</span>
                                                <span className="text-white font-bold">{activeBarInfo.ma120 ? formatCompactAxisPrice(activeBarInfo.ma120) : '-'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 차트 렌더링 컨테이너 (모바일 가로 100% 풀폭 확장) */}
                            <div className="space-y-2.5 relative -mx-1.5 sm:mx-0">
                                {updating && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 rounded-2xl flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                                            <span className="text-xs font-bold text-white">동기화 중...</span>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-zinc-950/90 rounded-2xl px-0.5 py-2 sm:p-4 border border-white/10" style={{ minHeight: `${chartHeight}px` }}>
                                    {isMounted && (
                                        <Chart
                                            key={`chart-${chartType}-${candleInterval}-${candleZoomCount}-${showSupportResistance}-${isChartExpanded}-${isMobile}`}
                                            options={chartOptions}
                                            series={chartSeries}
                                            type={chartType === 'line' ? 'area' : 'candlestick'}
                                            height={chartHeight}
                                        />
                                    )}
                                </div>
                                <div className="bg-zinc-950/90 rounded-2xl px-0.5 py-1.5 sm:p-3 border border-white/10">
                                    {isMounted && (
                                        <Chart
                                            key={`vol-${chartType}-${candleInterval}-${candleZoomCount}-${isMobile}`}
                                            options={volumeOptions}
                                            series={volumeSeries}
                                            type="bar"
                                            height={isMobile ? 95 : 120}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* 지지·저항선 요약 카드 (초보자용 보기 편한 스냅샷) */}
                            {result?.support_resistance && showSupportResistance && (
                                <div className="bg-zinc-950/70 border border-white/5 rounded-2xl p-3.5 sm:p-5 space-y-3 shadow-inner">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                                                <Shield className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-white flex items-center gap-1.5">
                                                    <span>기술적 지지 · 저항 구간</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-gray-400 font-semibold">과거 60일 통계 기준</span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                                                    과거 매물대와 캔들 패턴상 주가가 반등하거나 저항받았던 핵심 가격대입니다.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                                            <div className="flex items-center justify-between sm:justify-start gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                                                <span className="text-[11px] text-gray-300 font-bold">지지선</span>
                                                <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                                                    {formatPrice(result.support_resistance.support1)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-start gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25">
                                                <span className="text-[11px] text-gray-300 font-bold">저항선</span>
                                                <span className="text-xs sm:text-sm font-black font-mono text-rose-400">
                                                    {formatPrice(result.support_resistance.resistance1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. 패턴 분석 결과 & 4대 퀀트 지표 스냅샷 */}
                        <div className="rounded-3xl bg-zinc-900/90 border border-white/10 p-5 md:p-8 space-y-6 shadow-2xl">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shrink-0">
                                        <LineChart className="w-10 h-10 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                                                5개년 캔들 패턴 통계
                                            </span>
                                            <span className="text-xs text-gray-500 font-mono">
                                                {result?.stock_info?.symbol}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                                            {result.weather?.pattern}
                                        </h2>
                                        <p className="text-xs md:text-sm text-gray-300 mt-1 font-medium leading-relaxed">
                                            {result.weather?.comment}
                                        </p>
                                    </div>
                                </div>

                                {result.weather?.probability !== undefined && (
                                    <div className="bg-zinc-800/80 border border-white/10 p-4 rounded-2xl text-center shrink-0 w-full md:w-44">
                                        <div className="text-[11px] text-gray-400 font-bold mb-1">익일 상승 확률</div>
                                        <div className={`text-2xl md:text-3xl font-black font-mono ${result.weather.probability >= 55 ? 'text-rose-400' : result.weather.probability <= 45 ? 'text-blue-400' : 'text-amber-400'}`}>
                                            {result.weather.probability}%
                                        </div>
                                        <div className="w-full bg-zinc-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${result.weather.probability >= 55 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                                style={{ width: `${Math.min(result.weather.probability, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 4대 퀀트 지표 스냅샷 */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                                <div className="p-4 rounded-2xl bg-zinc-800/50 border border-white/5">
                                    <div className="text-[11px] text-gray-400 font-bold mb-1">과거 5년 출현 횟수</div>
                                    <div className="text-lg md:text-xl font-black text-white font-mono">
                                        {result.weather?.count || 0}회 발생
                                    </div>
                                    <div className="text-[10px] text-emerald-400 mt-1 font-semibold">
                                        {(result.weather?.count || 0) >= 30 ? '다빈도 패턴' : (result.weather?.count || 0) >= 10 ? '유효 통계 구간' : '희귀 패턴'}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-800/50 border border-white/5">
                                    <div className="text-[11px] text-gray-400 font-bold mb-1">익일 평균 변동률</div>
                                    <div className={`text-lg md:text-xl font-black font-mono ${Number(result.weather?.avg_return) >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                        {Number(result.weather?.avg_return) > 0 ? `+${result.weather?.avg_return}%` : `${result.weather?.avg_return || 0}%`}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1 font-semibold">통계적 기대 변동폭</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-800/50 border border-white/5">
                                    <div className="text-[11px] text-gray-400 font-bold mb-1">통계 표본 기간</div>
                                    <div className="text-lg md:text-xl font-black text-white font-mono">
                                        최근 1,825일
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1 font-semibold">5년 일봉 전수조사</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-800/50 border border-white/5">
                                    <div className="text-[11px] text-gray-400 font-bold mb-1">패턴 신뢰 등급</div>
                                    <div className="text-lg md:text-xl font-black text-emerald-400 font-mono">
                                        {(result.weather?.count || 0) >= 15 ? 'HIGH (높음)' : 'MODERATE (보통)'}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1 font-semibold">알고리즘 백테스팅</div>
                                </div>
                            </div>
                        </div>

                        {/* 3. 기술적 지표 종합 분석 브리핑 */}
                        {showDocent && result.beginner_insight && (
                            <div className="rounded-3xl p-5 md:p-8 bg-zinc-900/90 border border-white/10 space-y-6 shadow-2xl">
                                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                    <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg md:text-xl font-black text-white leading-none">
                                            핵심 기술적 지표 종합 분석 📊
                                        </h3>
                                        <p className="text-xs text-emerald-400/80 mt-1 font-bold">
                                            단기·중기 이동평균선 배열 및 거래량 모멘텀 종합 해석
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="bg-zinc-950/70 backdrop-blur-xl rounded-2xl p-5 md:p-6 border border-white/5 shadow-inner">
                                    <div 
                                        className="text-sm md:text-base text-gray-200 leading-relaxed font-medium" 
                                        dangerouslySetInnerHTML={{ 
                                            __html: result.beginner_insight.text
                                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-400 font-black">$1</strong>')
                                                .replace(/<small>(.*?)<\/small>/g, '<span class="block mt-4 text-xs text-rose-400/90 font-bold">$1</span>')
                                        }} 
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {result.beginner_insight.tips?.map((tip: any, idx: number) => (
                                        <div key={idx} className="bg-zinc-800/50 p-4 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all duration-300">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                <div className="text-xs font-black text-emerald-300">{tip.label}</div>
                                            </div>
                                            <p className="text-xs text-gray-400 leading-relaxed font-medium">{tip.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. 투자자별 메이저 수급 및 추정 평단가 */}
                        {result.whale && (
                            <div className="rounded-3xl bg-zinc-900/90 border border-white/10 p-5 md:p-8 space-y-6 shadow-2xl">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30">
                                            <TowerControl className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg md:text-xl font-black text-white">
                                                메이저 수급 & 추정 평균 매수가 (VWAP)
                                            </h3>
                                            <p className="text-xs text-gray-400 font-bold mt-0.5">
                                                최근 40영업일간 외국인·기관 실체결 거래량 가중평균가
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-500/10 rounded-full text-[11px] font-black text-blue-400 border border-blue-500/20">
                                        40일 수급 추정
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    {/* 외국인 & 기관 평단가 카드 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gradient-to-br from-blue-500/15 via-zinc-850 to-zinc-900 p-4 md:p-5 rounded-2xl border border-blue-500/30 flex flex-col justify-between">
                                            <p className="text-gray-300 text-xs font-black flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-400" /> 외국인 평단가
                                            </p>
                                            <div className="mt-3">
                                                <p className="text-xl md:text-2xl font-black text-white font-mono">
                                                    {formatPrice(result.whale?.foreigner?.avg_price)}
                                                </p>
                                                <div className={`text-xs mt-1 font-black ${Number(result.whale?.foreigner?.return_rate) >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                                    평단 대비 {Number(result.whale?.foreigner?.return_rate) > 0 ? `+${result.whale?.foreigner?.return_rate}%` : `${result.whale?.foreigner?.return_rate}%`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500/15 via-zinc-850 to-zinc-900 p-4 md:p-5 rounded-2xl border border-purple-500/30 flex flex-col justify-between">
                                            <p className="text-gray-300 text-xs font-black flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-purple-400" /> 기관 평단가
                                            </p>
                                            <div className="mt-3">
                                                <p className="text-xl md:text-2xl font-black text-white font-mono">
                                                    {formatPrice(result.whale?.institution?.avg_price)}
                                                </p>
                                                <div className={`text-xs mt-1 font-black ${Number(result.whale?.institution?.return_rate) >= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                                    평단 대비 {Number(result.whale?.institution?.return_rate) > 0 ? `+${result.whale?.institution?.return_rate}%` : `${result.whale?.institution?.return_rate}%`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 최근 5영업일 메이저 수급 일별 테이블 */}
                                    <div className="bg-zinc-950/70 rounded-2xl p-4 md:p-5 border border-white/5">
                                        <div className="flex items-center justify-between mb-3 text-xs font-black text-gray-300">
                                            <span className="flex items-center gap-1.5">
                                                <Activity className="w-4 h-4 text-emerald-400" /> 최근 5영업일 수급 주포
                                            </span>
                                            <span className="text-gray-500 font-normal text-[11px]">일자 / 주포 / 종가</span>
                                        </div>
                                        <div className="space-y-2">
                                            {result.whale?.ingredients?.map((ing: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0 font-medium">
                                                    <span className="text-gray-400 font-mono">{ing.date.split('-').slice(1).join('/')}</span>
                                                    <span className={`font-black px-2 py-0.5 rounded-md text-[11px] ${
                                                        ing.winner === '개인' 
                                                            ? 'bg-amber-500/10 text-amber-300' 
                                                            : ing.winner === '외국인' 
                                                            ? 'bg-blue-500/15 text-blue-300 font-bold' 
                                                            : ing.winner === '기관'
                                                            ? 'bg-purple-500/15 text-purple-300 font-bold'
                                                            : 'bg-zinc-800 text-gray-400'
                                                    }`}>
                                                        {ing.winner === '순매수 없음' ? ing.winner : `${ing.winner} 순매수`}
                                                    </span>
                                                    <span className="text-white font-mono font-bold">{formatPrice(ing.price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Kakao AdFit In-Feed Banner */}
                        <KakaoRevenueAd type="feed" />

                        {/* Viral Watermark (Included in capture) */}
                        <div className="pt-4 mt-8 border-t border-white/10 flex justify-between items-center text-gray-500 text-xs font-medium px-4">
                            <span>AI 주식 비서 - 내 종목 차트 분석하러 가기 👉</span>
                            <span className="font-bold text-emerald-500/70">stock-trend-program.co.kr</span>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
