"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import GaugeChart from "@/components/GaugeChart";
import { TrendingUp, ShieldCheck, Loader2, PlayCircle, Star, Swords } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { API_BASE_URL } from "@/lib/config";
import SentimentBattle from "@/components/SentimentBattle";

interface StockData {
    name: string;
    symbol: string;
    price: string;
    change: string;
    currency: string;
    sector: string;
    summary: string;
    score: number;
    metrics: {
        supplyDemand: number;
        financials: number;
        news: number;
    };
}

export default function DiscoveryPage() {
    const [searchInput, setSearchInput] = useState("");
    const [stock, setStock] = useState<StockData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<'analysis' | 'insider' | 'disclosure' | 'backtest' | 'history' | 'battle'>('analysis');

    const handleSearch = async () => {
        if (!searchInput) return;
        setLoading(true);
        setError("");
        setStock(null);
        setActiveTab('analysis'); // 검색 시 기본 탭으로 리셋

        try {
            // Backend API call
            const res = await fetch(`${API_BASE_URL}/api/stock/${searchInput}`);
            const json = await res.json();

            if (json.status === "success") {
                setStock(json.data);
            } else {
                setError(json.message || "Failed to fetch stock data");
            }
        } catch (err) {
            setError("Connection error. Is the backend running?");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Polling for real-time price updates (every 5 seconds)
    useEffect(() => {
        if (!stock || !stock.symbol) return;

        const fetchLivePrice = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/quote/${stock.symbol}`);
                const json = await res.json();
                if (json.status === "success") {
                    setStock(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            price: json.data.price,
                            change: json.data.change
                        };
                    });
                }
            } catch (error) {
                console.error("Live price update failed:", error);
            }
        };

        const interval = setInterval(fetchLivePrice, 5000); // 5초마다 갱신
        return () => clearInterval(interval);
    }, [stock?.symbol]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="종목 발굴 & 건강검진" subtitle="AI가 분석하는 종목의 핵심 건강 상태" />

            <div className="p-6 space-y-8">
                {/* Search / Hero Section */}
                <div className="relative rounded-3xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 p-8 border border-white/20 overflow-hidden shadow-xl">
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl font-bold mb-4 text-white drop-shadow-md">종목 건강검진 (AI Health Check)</h2>
                        <p className="text-gray-200 mb-6 text-lg">
                            종목 코드(티커)를 입력하여 기업의 재무 상태와 시장 심리를 AI로 분석하세요.<br />
                            <span className="text-sm text-gray-400">예시: AAPL (애플), TSLA (테슬라), 005930.KS (삼성전자)</span>
                        </p>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="종목 코드를 입력하세요 (예: AAPL)"
                                    className="w-full rounded-xl bg-black/60 border border-white/30 px-6 py-4 text-xl outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 font-medium"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="rounded-xl bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg text-lg"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "분석 시작"}
                            </button>
                        </div>
                        {error && <p className="text-red-400 mt-3 font-semibold bg-red-900/40 p-2 rounded-lg inline-block">{error}</p>}
                    </div>
                    <ShieldCheck className="absolute right-0 top-1/2 -translate-y-1/2 h-64 w-64 text-white/5 -rotate-12" />
                </div>

                {/* Results Section */}
                {stock && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Main Score Card */}
                            <div className="rounded-3xl bg-black/40 border border-white/20 p-6 backdrop-blur-md shadow-lg">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-3xl font-bold flex items-center gap-3 text-white">
                                            {stock.name} <span className="text-lg text-gray-400 font-medium">{stock.symbol}</span>
                                        </h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-4xl font-bold text-white">{stock.currency} {stock.price}</span>
                                            <span className={`font-bold px-3 py-1 rounded-lg text-lg ${stock.currency === 'KRW' ? (stock.change.startsWith('+') ? 'text-red-400 bg-red-400/20' : 'text-blue-400 bg-blue-400/20') : (stock.change.startsWith('+') ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20')}`}>
                                                {stock.change}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400 mb-1">AI 종합 점수</div>
                                        <div className={`text-5xl font-black ${stock.score >= 70 ? 'text-green-400' : 'text-yellow-400'} drop-shadow-sm`}>{stock.score}</div>
                                        <div className="mt-2">
                                            <WatchlistButton symbol={stock.symbol} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <GaugeChart score={stock.metrics?.supplyDemand} label="수급 분석" subLabel="기관/외국인 매수 강도" color="#3b82f6" />
                                    <GaugeChart score={stock.metrics?.financials} label="재무 건전성" subLabel="성장성 및 수익성" color="#10b981" />
                                    <GaugeChart score={stock.metrics?.news} label="뉴스 심리" subLabel="긍정/부정 뉴스 분석" color="#f59e0b" />
                                </div>
                            </div>

                            {/* Detailed Analysis Text */}
                            <div className="rounded-3xl bg-black/40 border border-white/20 p-8 shadow-lg">
                                {/* Tab Navigation */}
                                <div className="flex items-center gap-6 border-b border-white/10 mb-6 font-bold text-lg">
                                    <button
                                        className={`pb-3 ${activeTab === 'analysis' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('analysis')}
                                    >
                                        AI 투자의견
                                    </button>
                                    <button
                                        className={`pb-3 ${activeTab === 'insider' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('insider')}
                                    >
                                        내부자 거래 <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-1 text-gray-300">New</span>
                                    </button>
                                    <button
                                        className={`pb-3 ${activeTab === 'disclosure' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('disclosure')}
                                    >
                                        공시(DART) <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full ml-1 text-gray-300">KR</span>
                                    </button>
                                    <button
                                        className={`pb-3 ${activeTab === 'backtest' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('backtest')}
                                    >
                                        전략 백테스팅
                                    </button>
                                    <button
                                        className={`pb-3 ${activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('history')}
                                    >
                                        AI 점수 추이
                                    </button>
                                    <button
                                        className={`pb-3 ${activeTab === 'battle' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
                                        onClick={() => setActiveTab('battle')}
                                    >
                                        개미 vs AI <Swords className="w-4 h-4 inline ml-1 mb-1" />
                                    </button>
                                </div>

                                {activeTab === 'analysis' ? (
                                    <>
                                        {/* AI Opinion */}
                                        <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                            <TrendingUp className="h-6 w-6 text-blue-400" /> 종합 분석 리포트
                                        </h4>
                                        <p className="text-gray-100 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                                            {stock.summary || "분석 내용이 없습니다."}
                                        </p>
                                        <div className="mt-6 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30">
                                            <p className="text-blue-200 text-sm flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4" />
                                                <strong>Guide:</strong> 이 분석은 AI가 실시간 데이터를 바탕으로 생성했으며, 투자 참고용입니다.
                                            </p>
                                        </div>
                                    </>
                                ) : activeTab === 'insider' ? (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <InsiderTable symbol={searchInput} />
                                    </div>
                                ) : activeTab === 'disclosure' ? (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <DisclosureTable symbol={searchInput} />
                                    </div>
                                ) : activeTab === 'backtest' ? (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <BacktestSimulator symbol={searchInput} />
                                    </div>
                                ) : activeTab === 'history' ? (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <ScoreHistoryChart symbol={searchInput} />
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <SentimentBattle symbol={searchInput} aiScore={stock.score} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar / Recommendations */}
                        <div className="space-y-6">
                            <div className="rounded-3xl bg-black/40 border border-white/20 p-6 h-full shadow-lg">
                                <h3 className="text-lg font-bold mb-4 text-white">관련 섹터 종목</h3>
                                <p className="text-gray-400 mb-4">{stock.name}과(와) 유사한 산업군의 기업들을 비교 분석할 예정입니다. (준비 중)</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function BacktestSimulator({ symbol }: { symbol: string }) {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState("1y");

    const runBacktest = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/stock/${symbol}/backtest?period=${period}`);
            const json = await res.json();
            if (json.status === "success") {
                setResult(json.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-xl font-bold text-white mb-1">이동평균 교차 전략 (Golden Cross)</h4>
                    <p className="text-gray-400 text-sm">단기 이평선(5일)이 장기 이평선(20일)을 돌파할 때 매수하는 전략</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none"
                    >
                        <option value="6mo">6개월</option>
                        <option value="1y">1년</option>
                        <option value="2y">2년</option>
                        <option value="5y">5년</option>
                    </select>
                    <button
                        onClick={runBacktest}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        시뮬레이션 실행
                    </button>
                </div>
            </div>

            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                    {/* metrics and chart... */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">최종 수익률</div>
                            <div className={`text-2xl font-bold ${result.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {result.total_return}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">단순 보유 시</div>
                            <div className={`text-xl font-bold ${result.buy_hold_return >= 0 ? 'text-gray-200' : 'text-gray-400'}`}>
                                {result.buy_hold_return}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">최대 낙폭 (MDD)</div>
                            <div className="text-xl font-bold text-red-300">
                                {result.max_drawdown}%
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-gray-400 text-xs mb-1">최종 자산 ($10k 투자 시)</div>
                            <div className="text-xl font-bold text-blue-200">
                                ${result.final_equity.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-64 w-full bg-white/5 rounded-xl border border-white/10 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={result.chart_data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#aaaaaa' }}
                                    tickFormatter={(val) => val.slice(5)} // MM-DD
                                    interval={Math.floor(result.chart_data.length / 5)}
                                />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Line type="monotone" dataKey="strategy" stroke="#3b82f6" strokeWidth={2} dot={false} name="전략 수익금" />
                                <Line type="monotone" dataKey="buy_hold" stroke="#6b7280" strokeWidth={2} dot={false} name="단순 보유" strokeDasharray="4 4" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

function InsiderTable({ symbol }: { symbol: string }) {
    const [trades, setTrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsider = async () => {
            // same old logic
            try {
                const res = await fetch(`${API_BASE_URL}/api/stock/${symbol}/insider`);
                const json = await res.json();
                if (json.status === "success") {
                    setTrades(json.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchInsider();
    }, [symbol]);

    // ... render logic ... 
    return (
        <div className="space-y-4">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span>최근 내부자 거래 내역 (Top 10)</span>
                {loading && <Loader2 className="animate-spin w-4 h-4 text-blue-400" />}
            </h4>

            {!loading && trades.length === 0 && (
                <p className="text-gray-400 text-sm">최근 내부자 거래 내역이 없거나 데이터를 불러올 수 없습니다.</p>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase border-b border-white/10">
                        <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Insider</th>
                            <th className="px-3 py-2">Position</th>
                            <th className="px-3 py-2 text-right">Shares</th>
                            <th className="px-3 py-2 text-right">Value ($)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {trades.map((t, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="px-3 py-3 font-mono text-gray-300">{t.date}</td>
                                <td className="px-3 py-3 font-bold text-white">{t.insider}</td>
                                <td className="px-3 py-3 text-gray-300">{t.position}</td>
                                <td className={`px-3 py-3 text-right font-mono ${t.text.includes('Sale') ? 'text-red-400' : 'text-blue-400'}`}>
                                    {t.shares.toLocaleString()}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-gray-300">
                                    {t.value > 0 ? t.value.toLocaleString() : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">* 데이터 출처: SEC Filings via Yahoo Finance</p>
        </div>
    );
}

function DisclosureTable({ symbol }: { symbol: string }) {
    const [disclosures, setDisclosures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDisclosure = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/korea/disclosure/${symbol}`);
                const json = await res.json();
                if (json.status === "success") {
                    setDisclosures(json.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (symbol && /\d{6}/.test(symbol)) {
            fetchDisclosure();
        } else {
            setLoading(false);
        }
    }, [symbol]);

    return (
        <div className="space-y-4">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span>최근 전자공시 (DART/KIND)</span>
                {loading && <Loader2 className="animate-spin w-4 h-4 text-blue-400" />}
            </h4>

            {!loading && disclosures.length === 0 && (
                <div className="p-8 text-center text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>공시 내역이 없거나 한국(KRX) 종목이 아닙니다.</p>
                    <p className="text-xs mt-2 text-gray-500">한국 종목 코드로 검색해주세요. (예: 005930.KS)</p>
                </div>
            )}

            <div className="overflow-x-auto">
                {/* ... table ... */}
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase border-b border-white/10">
                        <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2 w-1/2">Title</th>
                            <th className="px-3 py-2">Source</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {disclosures.map((d, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => window.open(d.link, '_blank')}>
                                <td className="px-3 py-3 font-mono text-gray-300 whitespace-nowrap">{d.date}</td>
                                <td className="px-3 py-3 font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {d.title}
                                </td>
                                <td className="px-3 py-3 text-gray-400 text-xs">
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-gray-300">{d.publisher}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {disclosures.length > 0 && <p className="text-xs text-gray-500 mt-2">* 데이터 출처: Naver Finance (DART)</p>}
        </div>
    );
}

function ScoreHistoryChart({ symbol }: { symbol: string }) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/stock/${symbol}/history`);
                const json = await res.json();
                if (json.status === "success") {
                    setHistory(json.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (symbol) fetchHistory();
    }, [symbol]);

    return (
        <div className="space-y-4">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span>AI 점수 변화 추이</span>
                {loading && <Loader2 className="animate-spin w-4 h-4 text-blue-400" />}
            </h4>

            {!loading && history.length === 0 && (
                <div className="p-8 text-center text-gray-400 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>저장된 점수 히스토리가 없습니다.</p>
                </div>
            )}

            {history.length > 0 && (
                <div className="h-64 w-full bg-white/5 rounded-xl border border-white/10 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#aaaaaa' }}
                                tickFormatter={(val) => new Date(val).toLocaleDateString()}
                            />
                            <YAxis domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                            <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Total Score" />
                            <Line type="monotone" dataKey="financial" stroke="#10b981" strokeWidth={1} dot={false} name="Financials" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="news" stroke="#f59e0b" strokeWidth={1} dot={false} name="Sentiment" strokeDasharray="3 3" />
                        </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-center mt-2 text-gray-400">최근 50회 분석 결과 트렌드</p>
                </div>
            )}
        </div>
    );
}

function WatchlistButton({ symbol }: { symbol: string }) {
    const [isWatchlisted, setIsWatchlisted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkWatchlist = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/watchlist`);
                const json = await res.json();
                if (json.status === "success" && json.data.includes(symbol)) {
                    setIsWatchlisted(true);
                } else {
                    setIsWatchlisted(false);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        checkWatchlist();
    }, [symbol]);

    const toggleWatchlist = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const method = isWatchlisted ? 'DELETE' : 'POST';
            const url = isWatchlisted ? `${API_BASE_URL}/api/watchlist/${symbol}` : `${API_BASE_URL}/api/watchlist`;

            const options: any = { method };
            if (!isWatchlisted) {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify({ symbol });
            }

            const res = await fetch(url, options);
            const json = await res.json();

            if (json.status === "success") {
                setIsWatchlisted(!isWatchlisted);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={toggleWatchlist}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isWatchlisted
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border border-white/20'
                }`}
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-black' : ''}`} />
            )}
            {isWatchlisted ? '관심종목' : '관심등록'}
        </button>
    );
}
