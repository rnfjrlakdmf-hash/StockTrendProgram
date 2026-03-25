"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { 
    Search, LineChart, Target, Shield, AlertTriangle, Loader2, Lock, 
    PlayCircle, Crown, Sun, CloudSun, CloudRain, 
    PieChart, BarChart3, BookOpen, Calendar, TrendingUp, TrendingDown, Clock
} from "lucide-react";
import dynamic from "next/dynamic";

// ApexCharts is heavy and needs window, so load it dynamically
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

import { getTickerFromKorean } from "@/lib/stockMapping";
import { isPremiumUnlocked } from "@/lib/adminMode";
import ProModal from "@/components/ProModal";
import AdRewardModal from "@/components/AdRewardModal";

export default function PatternPage() {
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [chartType, setChartType] = useState<"line" | "candle">("line");
    const [linePeriod, setLinePeriod] = useState<string>("1y");
    const [candleInterval, setCandleInterval] = useState<"1d" | "1wk" | "1mo">("1d");
    const [selectedStory, setSelectedStory] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
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

        setLoading(true);
        if (typeof targetSymbol === 'string' || !targetParams) {
             setResult(null);
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
            const res = await fetch(`${API_BASE_URL}/api/chart/patterns/${ticker}?interval=${intervalToUse}&period=${periodToUse}`);
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
        }
    };

    // Re-fetch when interval or period changes
    useEffect(() => {
        const symbol = result?.stock_info?.symbol || searchInput;
        if (symbol && result) {
            handleSearch(symbol, { 
                period: chartType === 'line' ? linePeriod : undefined,
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
            name: 'Volume',
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
            foreColor: '#9ca3af'
        },
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
        xaxis: { type: 'datetime', axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { opposite: true, labels: { formatter: (val: number) => val?.toLocaleString() } },
        grid: { borderColor: '#374151', strokeDashArray: 4 },
        tooltip: {
            shared: true,
            y: { formatter: (val: number) => val?.toLocaleString() },
            custom: chartType === 'candle' ? function({ seriesIndex, dataPointIndex, w }: any) {
                const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
                const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
                const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
                const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
                const d = new Date(w.globals.seriesX[seriesIndex][dataPointIndex]).toLocaleDateString();
                return `
                    <div class="bg-gray-900 border border-gray-700 p-2 text-xs rounded shadow-lg text-white">
                        <div class="font-bold border-b border-gray-700 pb-1 mb-1">${d}</div>
                        <div class="flex gap-4 justify-between"><span>시:</span> <span class="font-mono">${o?.toLocaleString()}</span></div>
                        <div class="flex gap-4 justify-between"><span>고:</span> <span class="font-mono text-red-400">${h?.toLocaleString()}</span></div>
                        <div class="flex gap-4 justify-between"><span>저:</span> <span class="font-mono text-blue-400">${l?.toLocaleString()}</span></div>
                        <div class="flex gap-4 justify-between"><span>종:</span> <span class="font-mono font-bold">${c?.toLocaleString()}</span></div>
                    </div>
                `;
            } : undefined
        },
        annotations: {
            points: (result?.stories || []).map((s: any) => ({
                x: new Date(s.date).getTime(),
                y: s.price,
                marker: { size: 6, fillColor: s.impact === 'positive' ? '#ef4444' : s.impact === 'negative' ? '#3b82f6' : '#6b7280', strokeColor: '#fff', radius: 2 },
                label: { borderColor: '#ffffff20', offsetY: -30, style: { color: '#fff', background: '#1f2937', fontSize: '10px' }, text: s.icon }
            }))
        },
        colors: chartType === 'line' ? ['#10b981'] : undefined,
        legend: { position: 'top', horizontalAlign: 'left' }
    };

    const volumeOptions: any = {
        chart: { height: 120, type: 'bar', toolbar: { show: false }, background: 'transparent', foreColor: '#9ca3af' },
        theme: { mode: 'dark' },
        plotOptions: { bar: { columnWidth: '80%', colors: { ranges: [{ from: 0, to: 9999999999999, color: '#60a5fa30' }] } } },
        dataLabels: { enabled: false },
        xaxis: { type: 'datetime', axisBorder: { show: false }, axisTicks: { show: false }, labels: { show: false } },
        yaxis: { labels: { formatter: (val: number) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val.toString() } },
        grid: { show: false }
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
                    <p className="text-gray-400 text-lg">패턴 분석 리포트와 주식 위인전을 한번에.</p>
                    <div className="relative max-w-xl mx-auto z-20 mt-8">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder={isLocked ? "무료 사용량을 다 썼어요! 광고 보고 충전하세요 ⚡" : "종목명 입력 (예: 삼성전자, 현대차)..."}
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
                        <h3 className="text-2xl font-bold text-white animate-pulse">AI 분석 중...</h3>
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
                        {result.beginner_insight && (
                            <div className="rounded-3xl bg-emerald-500/5 border border-emerald-500/20 p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="w-32 h-32 text-emerald-500" />
                                </div>
                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">주린이를 위한 AI 차트 도슨트 🎓</h3>
                                    </div>
                                    
                                    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5">
                                        <p className="text-lg text-emerald-50 text-leading-relaxed" dangerouslySetInnerHTML={{ __html: result.beginner_insight.text.replace(/\*\*(.*?)\*\*/g, '<span class="text-emerald-400 font-bold">$1</span>') }} />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {result.beginner_insight.tips?.map((tip: any, idx: number) => (
                                            <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                                <div className="text-xs font-bold text-emerald-400 mb-1">{tip.label}</div>
                                                <p className="text-xs text-gray-400 leading-relaxed">{tip.desc}</p>
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

                                <div className="flex flex-wrap items-center gap-2">
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
                                        [
                                            { label: '일봉', value: '1d' },
                                            { label: '주봉', value: '1wk' },
                                            { label: '월봉', value: '1mo' }
                                        ].map((i) => (
                                            <button key={i.value} onClick={() => setCandleInterval(i.value as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${candleInterval === i.value ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'}`}>{i.label}</button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 mb-6 text-[10px] md:text-xs text-gray-400">
                                {chartType === 'candle' ? (
                                    <>
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]" /><span>양봉</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span>음봉</span></div>
                                        <div className="flex items-center gap-1.5"><div className="h-0.5 w-3 bg-[#FEB019]" /><span>MA5</span></div>
                                        <div className="flex items-center gap-1.5"><div className="h-0.5 w-3 bg-[#00E396]" /><span>MA20</span></div>
                                        <div className="flex items-center gap-1.5"><div className="h-0.5 w-3 bg-[#008FFB]" /><span>MA60</span></div>
                                        <div className="flex items-center gap-1.5"><div className="h-0.5 w-3 bg-[#775DD0]" /><span>MA120</span></div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-emerald-500" /><span>종가 추세선</span></div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white/5 rounded-2xl p-2 border border-white/5 min-h-[400px]">
                                    {isMounted && <Chart options={chartOptions} series={chartSeries} type={chartType === 'line' ? 'area' : 'candlestick'} height={400} />}
                                </div>
                                <div className="bg-white/5 rounded-2xl p-2 border border-white/5">
                                    {isMounted && <Chart options={volumeOptions} series={volumeSeries} type="bar" height={120} />}
                                </div>
                            </div>
                        </div>

                        {/* Stock Biography (Stories) */}
                        <div className="rounded-3xl bg-white/5 border border-white/10 p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-3"><BookOpen className="w-6 h-6 text-purple-400" /> 📖 주식 위인전</h3>
                                <span className="text-sm text-gray-400">총 {result.stories?.length || 0}개의 주요 사건</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                {result.stories?.map((story: any, idx: number) => (
                                    <div key={idx} onClick={() => setSelectedStory(story)} className="bg-white/5 hover:bg-white/10 border-l-4 border-emerald-500 rounded-xl p-4 cursor-pointer transition-all">
                                        <div className="flex gap-4">
                                            <div className="text-3xl">{story.icon}</div>
                                            <div>
                                                <h4 className="text-white font-bold">{story.title}</h4>
                                                <p className="text-xs text-gray-500 mt-1">{formatDate(story.date)}</p>
                                                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{story.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!result.stories || result.stories.length === 0) && <div className="col-span-2 text-center py-20 text-gray-500">탐지된 주요 사건이 없습니다.</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Portal */}
            {selectedStory && isMounted && createPortal(
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedStory(null)}>
                    <div className="bg-gray-900 border border-white/10 rounded-[32px] max-w-xl w-full p-8 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                        <div className="text-7xl text-center mb-6">{selectedStory.icon}</div>
                        <h2 className="text-2xl font-bold text-white text-center mb-4">{selectedStory.title}</h2>
                        <div className="flex justify-center gap-4 mb-8">
                            <div className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400 flex items-center gap-2"><Calendar className="w-3 h-3" /> {formatDate(selectedStory.date)}</div>
                            {selectedStory.change !== 0 && <div className={`px-3 py-1 rounded-full text-xs font-bold ${selectedStory.change > 0 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{selectedStory.change > 0 ? '+' : ''}{selectedStory.change}%</div>}
                        </div>
                        <div className="bg-white/5 rounded-2xl p-6 mb-6 text-gray-200 text-center leading-relaxed">{selectedStory.description}</div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                             <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <p className="text-[10px] text-gray-500 mb-1">당시 주가</p>
                                <p className="text-lg font-bold text-white font-mono">₩{selectedStory.price.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <p className="text-[10px] text-gray-500 mb-1">분류</p>
                                <p className="text-sm font-bold text-emerald-300 uppercase">{selectedStory.type}</p>
                            </div>
                        </div>
                        {selectedStory.news?.link && (
                            <button onClick={() => window.open(selectedStory.news.link, '_blank')} className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4 mb-4 text-left transition-all">
                                <p className="text-[10px] text-blue-400 font-bold">관련 뉴스</p>
                                <p className="text-sm text-white line-clamp-1">{selectedStory.news.title}</p>
                            </button>
                        )}
                        <button onClick={() => setSelectedStory(null)} className="w-full bg-white text-black font-bold py-4 rounded-2xl">닫기</button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
