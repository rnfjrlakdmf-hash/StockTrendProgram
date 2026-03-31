"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Calendar, TrendingUp, TrendingDown, Clock, BarChart3, Settings2 } from "lucide-react";
import dynamic from "next/dynamic";
import { API_BASE_URL } from "@/lib/config";

// ApexCharts is heavy and needs window, so load it dynamically
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface StoryPoint {
    date: string;
    price: number;
    icon: string;
    title: string;
    description: string;
    impact: "positive" | "negative" | "neutral";
    change: number;
    type: string;
    news?: {
        title: string;
        link: string;
        publisher?: string;
    };
    disclosure?: {
        title: string;
        link: string;
        submitter?: string;
    };
}

interface ChartDataPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface StoryChartProps {
    symbol: string;
    period?: string; // 1mo, 3mo, 6mo, 1y
}

export default function StoryChart({ symbol, period: initialPeriod = "1y" }: StoryChartProps) {
    const [period, setPeriod] = useState(initialPeriod);
    const [interval, setInterval] = useState<string>("1d");
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [stories, setStories] = useState<StoryPoint[]>([]);
    const [selectedStory, setSelectedStory] = useState<StoryPoint | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // [NEW] Adjust period if interval is intraday (Optimized: Force 1d for intraday to prevent lag)
        const isIntraday = interval.includes("m") || interval === "1h";
        if (isIntraday) {
            if (period !== "1d") setPeriod("1d");
        }
        loadStoryData();
    }, [symbol, period, interval]);

    const loadStoryData = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/chart/story/${symbol}?period=${period}&interval=${interval}`);
            const data = await res.json();

            if (data.status === "success") {
                setChartData(data.data.price_data);
                setStories(data.data.stories);
            } else {
                setError(data.message || "차트 데이터 로드 실패");
            }
        } catch (e) {
            setError("서버 연결 실패");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Moving Averages
    const movingAverages = useMemo(() => {
        if (chartData.length === 0) return { ma5: [], ma20: [], ma60: [], ma120: [] };

        const calculateMA = (data: number[], window: number) => {
            const results = [];
            for (let i = 0; i < data.length; i++) {
                if (i < window - 1) {
                    results.push(null);
                    continue;
                }
                const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
                results.push(Number((sum / window).toFixed(2)));
            }
            return results;
        };

        const closes = chartData.map(d => d.close);
        return {
            ma5: calculateMA(closes, 5),
            ma20: calculateMA(closes, 20),
            ma60: calculateMA(closes, 60),
            ma120: calculateMA(closes, 120)
        };
    }, [chartData]);
 
    // [NEW] Find Highest and Lowest points for annotations
    const { highest, lowest } = useMemo(() => {
        if (chartData.length === 0) return { highest: null, lowest: null };
        let high = chartData[0];
        let low = chartData[0];
        chartData.forEach(d => {
            if (d.high > high.high) high = d;
            if (d.low < low.low) low = d;
        });
        return { highest: high, lowest: low };
    }, [chartData]);


    // Format data for ApexCharts
    const candleSeries = useMemo(() => [{
        name: 'Candle',
        type: 'candlestick',
        data: chartData.map(d => ({
            x: new Date(d.date).getTime(),
            y: [d.open, d.high, d.low, d.close]
        }))
    }, {
        name: 'MA5',
        type: 'line',
        data: chartData.map((d, i) => ({
            x: new Date(d.date).getTime(),
            y: movingAverages.ma5[i]
        }))
    }, {
        name: 'MA20',
        type: 'line',
        data: chartData.map((d, i) => ({
            x: new Date(d.date).getTime(),
            y: movingAverages.ma20[i]
        }))
    }, {
        name: 'MA60',
        type: 'line',
        data: chartData.map((d, i) => ({
            x: new Date(d.date).getTime(),
            y: movingAverages.ma60[i]
        }))
    }, {
        name: 'MA120',
        type: 'line',
        data: chartData.map((d, i) => ({
            x: new Date(d.date).getTime(),
            y: movingAverages.ma120[i]
        }))
    }], [chartData, movingAverages, interval]); // Added interval to dependency

    const volumeSeries = useMemo(() => [{
        name: 'Volume',
        type: 'bar',
        data: chartData.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.volume
        }))
    }], [chartData]);

    const chartOptions: any = {
        chart: {
            type: 'candlestick',
            height: 400,
            id: 'candles',
            toolbar: {
                show: false
            },
            offsetY: -10,
            background: 'transparent',
            foreColor: '#9ca3af'
        },
        theme: {
            mode: 'dark'
        },
        stroke: {
            width: [1, 2, 2, 2, 2],
            curve: 'smooth',
            colors: ['#ef4444', '#22c55e', '#ef4444', '#f97316', '#a855f7'] // Colors for Candle, MA5, MA20, MA60, MA120
        },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#ef4444',
                    downward: '#3b82f6'
                },
                wick: {
                    useFillColor: true
                }
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeFormatter: {
                    year: 'yyyy',
                    month: 'yyyy/MM',
                    day: 'MM/dd',
                    hour: 'HH:mm'
                },
                style: {
                    colors: '#6b7280',
                    fontSize: '10px'
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false }
        },
        yaxis: {
            opposite: true,
            tooltip: {
                enabled: true
            },
            labels: {
                formatter: (val: number) => val?.toLocaleString()
            }
        },
        grid: {
            borderColor: '#374151',
            strokeDashArray: 4
        },
        tooltip: {
            shared: true,
            custom: function({ seriesIndex, dataPointIndex, w }: any) {
                const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex]
                const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex]
                const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex]
                const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex]
                
                const timestamp = w.globals.seriesX[seriesIndex][dataPointIndex];
                const date = new Date(timestamp);
                const isIntraday = interval.includes("m") || interval === "1h";
                const d = isIntraday 
                    ? `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                    : date.toLocaleDateString();
                
                return `
                    <div class="bg-gray-900 border border-gray-700 p-2 text-xs rounded shadow-lg">
                        <div class="font-bold border-b border-gray-700 pb-1 mb-1 text-white">${d}</div>
                        <div class="flex gap-4 justify-between text-gray-400"><span>시:</span> <span class="font-mono text-white">${o?.toLocaleString()}</span></div>
                        <div class="flex gap-4 justify-between text-gray-400"><span>고:</span> <span class="font-mono text-red-400">${h?.toLocaleString()}</span></div>
                        <div class="flex gap-4 justify-between text-gray-400"><span>저:</span> <span class="font-mono text-blue-400">${l?.toLocaleString()}</span></div>
                        <div class="flex gap-4 justify-between text-gray-400"><span>종:</span> <span class="font-mono font-bold text-white">${c?.toLocaleString()}</span></div>
                    </div>
                `
            }
        },
        annotations: {
            points: [
                // Highest Point Annotation
                ...(highest ? [{
                    x: new Date(highest.date).getTime(),
                    y: highest.high,
                    marker: {
                        size: 4,
                        fillColor: '#ef4444',
                        strokeColor: '#fff',
                        radius: 2,
                    },
                    label: {
                        borderColor: '#ef4444',
                        offsetY: -30,
                        style: {
                            color: '#fff',
                            background: '#ef4444',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: { left: 8, right: 8, top: 2, bottom: 2 }
                        },
                        text: `최고 ${highest.high.toLocaleString()} (${new Date(highest.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}) ↓`
                    }
                }] : []),
                // Lowest Point Annotation
                ...(lowest ? [{
                    x: new Date(lowest.date).getTime(),
                    y: lowest.low,
                    marker: {
                        size: 4,
                        fillColor: '#3b82f6',
                        strokeColor: '#fff',
                        radius: 2,
                    },
                    label: {
                        borderColor: '#3b82f6',
                        offsetY: 40,
                        style: {
                            color: '#fff',
                            background: '#3b82f6',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: { left: 8, right: 8, top: 1, bottom: 1 }
                        },
                        text: `↑ 최저 ${lowest.low.toLocaleString()} (${new Date(lowest.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })})`
                    }
                }] : []),
                // Historical Stories
                ...stories.map(s => ({
                    x: new Date(s.date).getTime(),
                    y: s.price,
                    marker: {
                        size: 6,
                        fillColor: s.impact === 'positive' ? '#ef4444' : s.impact === 'negative' ? '#3b82f6' : '#6b7280',
                        strokeColor: '#fff',
                        radius: 2
                    },
                    label: {
                        borderColor: '#ffffff20',
                        offsetY: -30,
                        style: {
                            color: '#fff',
                            background: '#1f2937',
                            fontSize: '10px',
                            padding: {
                                left: 5,
                                right: 5,
                                top: 2,
                                bottom: 2
                            }
                        },
                        text: s.icon
                    }
                }))
            ]
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            markers: {
                radius: 12
            }
        }
    };

    const volumeOptions: any = {
        chart: {
            height: 150,
            type: 'bar',
            brush: {
                enabled: false,
                target: 'candles'
            },
            selection: {
                enabled: true
            },
            toolbar: {
                show: false
            },
            background: 'transparent',
            foreColor: '#9ca3af'
        },
        theme: {
            mode: 'dark'
        },
        plotOptions: {
            bar: {
                columnWidth: '80%',
                colors: {
                    ranges: [{
                        from: 0,
                        to: 1000000000000,
                        color: '#7c3aed40' // Soft purple for volume
                    }]
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            type: 'datetime',
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { show: false }
        },
        yaxis: {
            labels: {
                show: true,
                formatter: (val: number) => {
                    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
                    return val.toString();
                }
            }
        },
        grid: {
            show: false
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const isIntraday = interval.includes("m") || interval === "1h";
        
        if (isIntraday) {
            return date.toLocaleString('ko-KR', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (loading && chartData.length === 0) {
        return (
            <div className="bg-black/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">데이터를 분석하는 중...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black/40 border border-white/5 rounded-3xl p-4 md:p-8 backdrop-blur-md">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                    <h2 className="text-xl md:text-2xl font-bold text-white">차정 정밀 분석</h2>
                    {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {/* Interval Selector */}
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 overflow-x-auto max-w-[300px] md:max-w-none no-scrollbar">
                        <button 
                            onClick={() => setInterval("1m")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${interval === '1m' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            1분
                        </button>
                        <button 
                            onClick={() => setInterval("3m")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${interval === '3m' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            3분
                        </button>
                        <button 
                            onClick={() => setInterval("5m")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${interval === '5m' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            5분
                        </button>
                        <button 
                            onClick={() => setInterval("15m")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${interval === '15m' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            15분
                        </button>
                        <button 
                            onClick={() => setInterval("30m")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${interval === '30m' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            30분
                        </button>
                        <button 
                            onClick={() => setInterval("1h")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${interval === '1h' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            1시간
                        </button>
                        <div className="w-[1px] h-4 bg-white/10 mx-1 self-center" />
                        <button 
                            onClick={() => setInterval("1d")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${interval === '1d' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            일봉
                        </button>
                        <button 
                            onClick={() => setInterval("1wk")}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${interval === '1wk' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            주봉
                        </button>
                    </div>

                    {/* Period Selector (Hidden for Intraday to prevent lag) */}
                    {!(interval.includes("m") || interval === "1h") && (
                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            {['1mo', '3mo', '6mo', '1y'].map((p) => (
                                <button 
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${period === p ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {p === '1mo' ? '1M' : p === '3mo' ? '3M' : p === '6mo' ? '6M' : '1Y'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Legend & MA Info */}
            <div className="flex flex-wrap gap-4 mb-4 text-[10px] md:text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]" /><span>양봉</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span>음봉</span></div>
                <div className="flex items-center gap-1.5"><div className="h-0.5 w-4 bg-[#22c55e]" /><span>MA5</span></div>
                <div className="flex items-center gap-1.5"><div className="h-0.5 w-4 bg-[#ef4444]" /><span>MA20</span></div>
                <div className="flex items-center gap-1.5"><div className="h-0.5 w-4 bg-[#f97316]" /><span>MA60</span></div>
                <div className="flex items-center gap-1.5"><div className="h-0.5 w-4 bg-[#a855f7]" /><span>MA120</span></div>
            </div>

            {/* Main Chart Case */}
            <div className="bg-black/20 rounded-2xl p-2 md:p-4 mb-2 border border-white/5">
                <div id="chart-candle">
                    {isMounted && (
                        <Chart 
                            options={chartOptions} 
                            series={candleSeries} 
                            type="candlestick" 
                            height={400} 
                        />
                    )}
                </div>
            </div>

            {/* Volume Chart */}
            <div className="bg-black/20 rounded-2xl p-2 md:p-4 mb-6 border border-white/5">
                <div id="chart-volume">
                    {isMounted && (
                        <Chart 
                            options={volumeOptions} 
                            series={volumeSeries} 
                            type="bar" 
                            height={150} 
                        />
                    )}
                </div>
            </div>

            {/* Historical Stories (Stock Biography) */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-bold text-white">📖 주식 위인전</h2>
                    </div>
                    <div className="text-sm text-gray-400">
                        총 {stories.length}개의 역사적 순간 확인됨
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {stories.map((story, idx) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedStory(story)}
                            className={`
                                bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all
                                border-l-4 ${story.impact === 'positive'
                                    ? 'border-red-500'
                                    : story.impact === 'negative'
                                        ? 'border-blue-500'
                                        : 'border-gray-500'
                                }
                                ${selectedStory?.date === story.date ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''}
                            `}
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-3xl bg-white/5 w-12 h-12 flex items-center justify-center rounded-xl">{story.icon}</div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-white font-bold">{story.title}</h4>
                                        {story.change !== 0 && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${story.change > 0 ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                                                }`}>
                                                {story.change > 0 ? '▲' : '▼'}{Math.abs(story.change).toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">{story.description}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(story.date)}
                                        <span className="mx-1">•</span>
                                        <span className="uppercase">{story.type} event</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {stories.length === 0 && (
                        <div className="col-span-2 py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                            이 기간 동안 탐지된 특별한 역사적 변동이 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Story Detail Portal (Modal) */}
            {selectedStory && isMounted && typeof window !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedStory(null)}
                >
                    <div
                        className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-[32px] max-w-xl w-full p-8 shadow-2xl relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500" />
                        
                        <div className="text-7xl text-center mb-6 drop-shadow-lg">
                            {selectedStory.icon}
                        </div>

                        <h2 className="text-2xl font-bold text-white text-center mb-4">
                            {selectedStory.title}
                        </h2>

                        <div className="flex items-center justify-center gap-4 mb-8">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-xs text-gray-300">
                                <Calendar className="w-3 h-3" />
                                {formatDate(selectedStory.date)}
                            </div>
                            {selectedStory.change !== 0 && (
                                <div className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-full text-xs ${selectedStory.change > 0 ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                    {selectedStory.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {selectedStory.change > 0 ? '+' : ''}{selectedStory.change.toFixed(1)}%
                                </div>
                            )}
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 mb-6">
                            <p className="text-gray-200 text-base text-center leading-relaxed">
                                {selectedStory.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <p className="text-[10px] text-gray-500 mb-1">당시 주가</p>
                                <p className="text-lg font-bold text-white font-mono">
                                    ₩{selectedStory.price.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <p className="text-[10px] text-gray-500 mb-1">분류</p>
                                <p className="text-sm font-bold text-blue-300 uppercase">
                                    {selectedStory.type === 'global' ? '🌐 거시 경제' : selectedStory.type === 'company' ? '🏢 기업 소식' : '📊 기술적 변동'}
                                </p>
                            </div>
                        </div>

                        {selectedStory.news && selectedStory.news.title && (
                            <button 
                                onClick={() => window.open(selectedStory.news?.link, '_blank')}
                                className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4 mb-3 transition-all text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-xl">📰</div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-blue-400 font-bold mb-0.5">관련 뉴스 읽기</p>
                                        <p className="text-sm text-white font-medium line-clamp-1 group-hover:text-blue-300 transition-colors">
                                            {selectedStory.news.title}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )}

                        {selectedStory.disclosure && selectedStory.disclosure.title && (
                            <button 
                                onClick={() => window.open(selectedStory.disclosure?.link, '_blank')}
                                className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-4 mb-3 transition-all text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-xl">📝</div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-yellow-400 font-bold mb-0.5">공시 정보 확인</p>
                                        <p className="text-sm text-white font-medium line-clamp-1 group-hover:text-yellow-300 transition-colors">
                                            {selectedStory.disclosure.title}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )}

                        <button
                            onClick={() => setSelectedStory(null)}
                            className="mt-4 w-full bg-white text-black hover:bg-gray-200 font-bold py-4 rounded-2xl transition-all shadow-xl active:scale-95"
                        >
                            닫기
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
