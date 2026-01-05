"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import GaugeChart from "@/components/GaugeChart";
import { fetchStockAnalysis, fetchThemeAnalysis, fetchChatResponse, StockData } from "@/lib/api";
import MacroCalendar from "@/components/MacroCalendar";
import { TrendingUp, Zap, Activity, AlertCircle, Loader2, Star, Coins, Globe, BarChart3, Droplets, UserCheck, Layers, AlertTriangle, MessageSquare } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from 'next/link';
import { getTickerFromKorean } from "@/lib/stockMapping";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [themeResult, setThemeResult] = useState<any>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);




  const handleSearch = async (term: string) => {
    if (!term) return;
    setLoading(true);
    setError(null);
    setStockData(null);
    setThemeResult(null);
    setAiAnswer(null);

    // 1. Try Stock Search (주식 종목 검색)
    const ticker = getTickerFromKorean(term);
    const data = await fetchStockAnalysis(ticker.toUpperCase());

    if (data) {
      setStockData(data);
    } else {
      // 2. If Stock Search fails, Try Theme Search (테마/관련주 검색)
      // Use original term for theme search
      const themeData = await fetchThemeAnalysis(term);
      if (themeData) {
        setThemeResult(themeData);
      } else {
        // 3. If Theme Search fails, Try General AI Chat (만능 검색)
        const chatReply = await fetchChatResponse(term);
        if (chatReply) {
          setAiAnswer(chatReply);
        } else {
          setError(`'${term}'에 대한 정보를 찾을 수 없습니다. 조금 더 구체적으로 질문해주세요.`);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-10">
      <Header onSearch={handleSearch} />

      <div className="p-6 space-y-8">
        {/* Top Section: Weather & Asset Ticker */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Assets Ticker (Full Width) */}
          <div className="w-full">
            <AssetTicker />
          </div>
        </div>

        {/* Real-time Top 10 Ranking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TopRankingWidget market="KR" title="국내 증시 Top 10" />
          <TopRankingWidget market="US" title="미국 증시 Top 10" />
        </div>

        {/* 2. Control Center (Shortcuts to Pro Tools) */}
        {!stockData && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <Link href="/coach" className="bg-gradient-to-br from-orange-900/40 to-black hover:from-orange-900/60 p-5 rounded-2xl border border-white/5 hover:border-orange-500/50 transition-all group">
              <UserCheck className="w-8 h-8 text-orange-500 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-gray-200 group-hover:text-white">트레이딩 코치</h3>
              <p className="text-xs text-gray-500 mt-1">매매 멘탈 & 습관 교정</p>
            </Link>
          </div>
        )}

        {/* Search Loading/Error State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 text-blue-400">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p className="text-lg font-medium animate-pulse">시장 데이터를 정밀 분석 중입니다...</p>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
            <AlertCircle className="h-6 w-6" />
            {error}
          </div>
        )}

        {/* Main Content: Analysis Result or Default View */}
        {stockData ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-150">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-2">{stockData.name} <span className="text-blue-500">({stockData.symbol})</span></h2>
                <p className="text-gray-400 text-lg">{stockData.sector} | {stockData.currency}</p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-bold text-white mb-1">{stockData.price}</p>
                <p className={`text-xl font-bold ${stockData.change.includes('+') ? 'text-green-400' : 'text-red-400'}`}>{stockData.change}</p>
              </div>
            </div>

            {/* Quick Actions for Stock */}
            {/* Quick Actions for Stock */}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Card */}
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-900/20 to-black p-6 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="h-32 w-32 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2 z-10">AI 투자 매력도</h3>
                <GaugeChart score={stockData.score} label="종합 점수" color={stockData.score > 70 ? "#4ade80" : stockData.score > 40 ? "#facc15" : "#f87171"} />
                <p className="text-center text-sm text-gray-400 mt-2 z-10 max-w-[200px]">
                  종합적인 재무, 수급, 뉴스 분석을 토대로 산출된 점수입니다.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="rounded-3xl border border-white/5 bg-black/40 p-6 backdrop-blur-md grid grid-cols-3 gap-2">
                <GaugeChart score={stockData.metrics.supplyDemand} label="수급" subLabel="Technical" color="#60a5fa" />
                <GaugeChart score={stockData.metrics.financials} label="재무" subLabel="Fundamental" color="#c084fc" />
                <GaugeChart score={stockData.metrics.news} label="심리" subLabel="Sentiment" color="#f472b6" />
              </div>

              {/* AI Summary */}
              <div className="lg:col-span-1 rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-black p-6 backdrop-blur-md relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-6 w-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">AI 브리핑</h3>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-gray-200 leading-relaxed min-h-[150px]">
                  {stockData.summary}
                </div>
              </div>
            </div>
          </div>
        ) : themeResult ? (
          <ThemeResultView result={themeResult} />
        ) : aiAnswer ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-150">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/20 to-black p-8 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <MessageSquare className="h-32 w-32 text-indigo-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">AI 검색 결과</h2>
                </div>
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-gray-200 leading-relaxed text-lg whitespace-pre-wrap">
                  {aiAnswer}
                </div>
              </div>
            </div>
          </div>
        ) : !loading && !error && (
          // Default Dashboard Content
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 backdrop-blur-md relative overflow-hidden group">
              {/* ... (Existing AI Briefing Mockup) ... */}
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                <Zap className="h-32 w-32 text-yellow-400 -rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">오늘의 AI 브리핑</h2>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="p-6 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-colors shadow-lg">
                    <h3 className="text-xl font-bold text-blue-200 mb-2">시장 팁</h3>
                    <p className="text-gray-200 leading-relaxed text-lg font-medium">
                      상단 검색바에 종목명(티커)을 입력하여 실시간 AI 분석 리포트를 받아보세요.<br />
                      예: <strong>AAPL, NVDA, TSLA</strong>
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="space-y-6">
              <WatchlistWidget />
              <MacroCalendar />
              <div className="rounded-3xl border border-white/5 bg-black/40 p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="h-5 w-5 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">인기 급상승 종목</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "NVDA", price: "$492.11", change: "+2.4%", desc: "AI 수요 급증" },
                    { name: "TSLA", price: "$245.32", change: "-1.2%", desc: "인도량 하향 조정" },
                  ].map((stock) => (
                    <div key={stock.name} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group bg-black/20 border border-transparent hover:border-white/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-white">{stock.name}</span>
                        </div>
                      </div>
                      <div className={`text-right ${stock.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                        <div className="font-bold text-lg">{stock.price}</div>
                        <div className="text-sm font-semibold">{stock.change}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}

function WatchlistWidget() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/watchlist`);
        const json = await res.json();
        if (json.status === "success" && json.data.length > 0) {
          setWatchlist(json.data.map((symbol: string) => ({ symbol })));
        } else {
          setWatchlist([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWatchlist();

    // Polling for updates every 10s (optional)
    const interval = setInterval(fetchWatchlist, 10000);
    return () => clearInterval(interval);
  }, []);

  // 간이 시세 조회 기능 (실제로는 API에서 한 번에 가져오는 게 좋음)
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  useEffect(() => {
    if (watchlist.length === 0) return;

    const fetchQuotes = async () => {
      // 여기서는 MVP로 각 종목 API를 호출하지만, 추후 배치 조회 API 권장
      const newQuotes: Record<string, any> = {};
      for (const item of watchlist) {
        try {
          // MVP: Use existing individual stock API (might be slow for many items)
          // A better approach is to make a bulk endpoint
          const res = await fetch(`${API_BASE_URL}/api/quote/${item.symbol}`);
          const json = await res.json();
          if (json.status === "success") {
            newQuotes[item.symbol] = json.data;
          }
        } catch (e) { }
      }
      setQuotes(newQuotes);
    };
    fetchQuotes();
  }, [watchlist]);


  return (
    <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-blue-900/20 to-black p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> 관심 종목
        </h2>
        <span className="text-xs text-gray-400">실시간</span>
      </div>

      {loading ? (
        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-500" /></div>
      ) : watchlist.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
          <p>관심 종목이 없습니다.</p>
          <p className="text-xs mt-1">종목 발굴 페이지에서 추가해주세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {watchlist.map((item) => {
            const data = quotes[item.symbol];
            return (
              <div key={item.symbol} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                <div>
                  <span className="font-bold text-white">{item.symbol}</span>
                  {data && <div className="text-xs text-gray-400">{data.name.substring(0, 15)}</div>}
                </div>
                <div className="text-right">
                  {data ? (
                    <>
                      <div className="font-bold text-white">{data.price}</div>
                      <div className={`text-xs font-bold ${data.change.includes('+') ? 'text-green-400' : 'text-red-400'}`}>{data.change}</div>
                    </>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function AssetTicker() {
  const [assets, setAssets] = useState<any>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assets`);
        const json = await res.json();
        if (json.status === "success") {
          setAssets(json.data);
        }
      } catch (e) { console.error(e); }
    };
    fetchAssets();

    // 10초마다 자산 시세 업데이트
    const interval = setInterval(fetchAssets, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!assets) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
    </div>
  );

  const categories = [
    { key: 'Indices', icon: <BarChart3 className="text-blue-400" />, label: '지수' },
    { key: 'Crypto', icon: <Coins className="text-yellow-400" />, label: '코인' },
    { key: 'Forex', icon: <Globe className="text-green-400" />, label: '환율' },
    { key: 'Commodity', icon: <Droplets className="text-orange-400" />, label: '원자재' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {categories.map((cat) => (
        <div key={cat.key} className="bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3 opacity-60">
            {cat.icon}
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{cat.label}</span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            {assets[cat.key]?.map((item: any) => (
              <div key={item.symbol} className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-200 whitespace-nowrap truncate">{item.name.replace(' Market', '').replace('USD/KRW', 'USD').replace('JPY/KRW', 'JPY')}</span>
                <div className="text-right">
                  <div className="font-bold text-white">
                    {item.currency === 'KRW' ? '₩' : '$'}{item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[10px] ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


function TopRankingWidget({ market, title }: { market: string, title: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/rank/top10/${market}`);
        const json = await res.json();
        if (json.status === "success") {
          setData(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, [market]);

  return (
    <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${market === 'KR' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
            {market === 'KR' ? <Globe className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          </div>
          <h3 className="font-bold text-white text-lg">{title}</h3>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold animate-pulse">Live Sync</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
        </div>
      ) : !Array.isArray(data) || data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          데이터를 불러올 수 없습니다.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {data.map((item, idx) => (
            <div key={item.symbol} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${idx < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>{item.rank}</span>
                <div>
                  <div className="font-bold text-white text-sm">{item.name}</div>
                  <div className="text-[10px] text-gray-500">{item.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-200 text-sm">
                  {market === 'US' ? '$' : '₩'}{Number(item.price).toLocaleString(undefined, { maximumFractionDigits: market === 'US' ? 2 : 0 })}
                </div>
                <div className={`text-xs font-bold ${market === 'US' ? (item.change >= 0 ? 'text-green-400' : 'text-red-400') : (item.change >= 0 ? 'text-red-400' : 'text-blue-400')}`}>
                  {item.change >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeResultView({ result }: { result: any }) {
  if (!result) return null;
  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-100">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-orange-900/20 to-black border border-orange-500/30 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Layers className="w-64 h-64 text-orange-400 -rotate-12 transform translate-x-12 -translate-y-12" />
        </div>
        <h3 className="text-3xl font-bold text-orange-100 mb-4 flex items-center gap-3 relative z-10">
          <span className="text-orange-500">#</span> {result.theme}
        </h3>
        <p className="text-xl text-gray-200 leading-relaxed font-medium relative z-10">
          {result.description}
        </p>

        <div className="mt-6 flex items-start gap-3 bg-red-900/20 p-4 rounded-xl border border-red-500/20 relative z-10">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
          <div>
            <div className="text-red-400 font-bold text-sm mb-1">핵심 리스크 (Risk Factor)</div>
            <p className="text-gray-300 text-sm">{result.risk_factor}</p>
          </div>
        </div>
      </div>

      {/* Stocks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Leaders */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-red-400" /> 대장주 (Leaders)
          </h4>
          <div className="space-y-4">
            {result.leaders.map((stock: any, i: number) => (
              <Link href={`/`} key={i} className="block hover:no-underline">
                {/* In a real app, this link might trigger a search for this stock */}
                <div className="flex gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-red-500/30 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center font-bold text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-white group-hover:text-red-400 transition-colors">{stock.symbol} <span className="text-sm font-normal text-gray-400">{stock.name}</span></div>
                    <p className="text-sm text-gray-400 mt-1">{stock.reason}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Followers */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Layers className="text-blue-400" /> 관련주 (Related)
          </h4>
          <div className="space-y-4">
            {result.followers.map((stock: any, i: number) => (
              <Link href={`/`} key={i} className="block hover:no-underline">
                <div className="flex gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-blue-500/30 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{stock.symbol} <span className="text-sm font-normal text-gray-400">{stock.name}</span></div>
                    <p className="text-sm text-gray-400 mt-1">{stock.reason}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
