"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import GaugeChart from "@/components/GaugeChart";
import { fetchStockAnalysis, fetchThemeAnalysis, fetchChatResponse, StockData, fetchStockFast } from "@/lib/api";
import MarketScannerDashboard from "@/components/MarketScannerDashboard";
import NaverTopWidget from "@/components/NaverTopWidget";
import DashboardMarketClock from "@/components/DashboardMarketClock";
import LiveRankingBox from "@/components/LiveRankingBox";
import PopularSearchWidget from "@/components/PopularSearchWidget";
import WeekendCryptoDashboard from "@/components/WeekendCryptoDashboard";
import KakaoAdFit from "@/components/KakaoAdFit";
import MarketIndicators from "@/components/MarketIndicators";

import { TrendingUp, Zap, AlertCircle, Loader2, Coins, Globe, BarChart3, Droplets, Layers, AlertTriangle, MessageSquare, Activity, CalendarClock, ChevronRight } from "lucide-react";

import { API_BASE_URL } from "@/lib/config";
import Link from 'next/link';
import { getTickerFromKorean } from "@/lib/stockMapping";




export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [themeResult, setThemeResult] = useState<any>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);




  const handleSearch = async (term: string) => {
    if (!term) return;
    setLoading(true);
    setError(null);
    setStockData(null);
    setThemeResult(null);
    setAiAnswer(null);

    // 1. Try Stock Search (주식 종목 검색) - FAST Mode first
    const ticker = getTickerFromKorean(term);
    const fastData = await fetchStockFast(ticker.toUpperCase());

    if (fastData) {
      setStockData(fastData);
      setLoading(false); // Stop main loading instantly
      setIsAiLoading(true); // Start AI loading spinner in widgets
      
      // Load AI analysis in background
      fetchStockAnalysis(ticker.toUpperCase()).then(fullData => {
         if (fullData) {
             setStockData(fullData);
         }
         setIsAiLoading(false);
      });
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <Header onSearch={handleSearch} />

      <div className="p-6 space-y-8">
        
        {/* 상단 띠배너 광고 (320x50) */}
        <div className="flex justify-center -mt-2 mb-4">
          <KakaoAdFit adUnit="DAN-g3wzyZlZ4hBiYyRA" adWidth="320" adHeight="50" />
        </div>
        
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
                <div className={`flex items-center justify-end gap-2 text-xl font-bold ${stockData.change.includes('+') ? 'text-red-400' : 'text-blue-400'}`}>
                  <span>{stockData.change.includes('+') ? "▲" : stockData.change.includes('-') ? "▼" : ""}</span>
                  <span>{stockData.change}</span>
                </div>
                {(stockData.is_extended_hours || stockData.market_status?.includes('시간외') || stockData.market_status?.includes('프리') || stockData.market_status?.includes('NXT') || stockData.market_status?.includes('애프터')) && (
                   <div className="mt-2 inline-flex flex-col items-end border-t border-white/10 pt-2">
                     <span className={`text-xs font-bold px-2 py-0.5 rounded-md mb-1 uppercase ${stockData.market_status?.includes('프리') || stockData.market_status?.includes('PRE') ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                       {stockData.market_status?.includes('프리') || stockData.market_status?.includes('PRE') ? 'PRE-MARKET 프리마켓' : 'AFTER-MARKET 애프터마켓'}
                     </span>
                     <p className="text-2xl font-bold text-gray-300">
                        {(() => {
                           const nxt = (stockData.market_status?.includes('야간') || stockData.market_status?.includes('NXT')) ? stockData.nxt_data : stockData.after_market_data;
                           const extPrice = stockData.extended_price || nxt?.price;
                           if (!extPrice) return '';
                           return Number(String(extPrice).replace(/,/g, '')).toLocaleString(undefined, {minimumFractionDigits: stockData.currency === 'KRW' ? 0 : 2});
                        })()}
                     </p>
                   </div>
                )}
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
                <h3 className="text-xl font-bold text-gray-300 mb-2 z-10">종합 투자 매력도</h3>
                {isAiLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 z-10">
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin mb-3" />
                    <p className="text-xs text-gray-400 animate-pulse font-medium">데이터를 다각도로 분석 중입니다...</p>
                  </div>
                ) : (
                  <>
                    <GaugeChart score={stockData.score || 0} label="종합 점수" color={(stockData.score || 0) > 70 ? "#4ade80" : (stockData.score || 0) > 40 ? "#facc15" : "#f87171"} />
                    <p className="text-center text-sm text-gray-400 mt-2 z-10 max-w-[200px]">
                      종합적인 재무, 수급, 뉴스 분석을 토대로 산출된 점수입니다.
                    </p>
                  </>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="rounded-3xl border border-white/5 bg-black/40 p-6 backdrop-blur-md grid grid-cols-3 gap-2">
                {isAiLoading ? (
                  <div className="col-span-3 flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    <GaugeChart score={stockData.metrics?.supplyDemand || 0} label="수급" subLabel="Technical" color="#60a5fa" />
                    <GaugeChart score={stockData.metrics?.financials || 0} label="재무" subLabel="Fundamental" color="#c084fc" />
                    <GaugeChart score={stockData.metrics?.news || 0} label="심리" subLabel="Sentiment" color="#f472b6" />
                  </>
                )}
              </div>

              {/* Expert Summary */}
              <div className="lg:col-span-1 rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-black p-6 backdrop-blur-md relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-6 w-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">핵심 요약 브리핑</h3>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-gray-200 leading-relaxed min-h-[150px] relative">
                  {isAiLoading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                      <Loader2 className="h-6 w-6 text-yellow-400 animate-spin mb-2" />
                      <span className="text-xs text-yellow-500/80 animate-pulse font-bold">최신 뉴스 및 실적 분석 중...</span>
                    </div>
                  )}
                  {stockData.summary || "분석 데이터를 불러오는 중입니다..."}
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
                  <h2 className="text-2xl font-bold text-white">종합 분석 결과</h2>
                </div>
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-gray-200 leading-relaxed text-lg whitespace-pre-wrap">
                  {aiAnswer}
                </div>
              </div>
            </div>
          </div>
        ) : !loading && !error && (
          // Default Dashboard Content
          <div className="space-y-8 animate-in fade-in duration-1000">


            {/* PC 전용 728x90 가로 배너 */}
            <div className="hidden md:flex justify-center mb-2">
              <KakaoAdFit adUnit="DAN-eeR4RhnpmQaeIlYm" adWidth="728" adHeight="90" />
            </div>

            {/* 코인 핫트렌드 대시보드 (상시 노출로 변경) */}
            <WeekendCryptoDashboard />

            {/* 2. 중단: 위젯 2단 분리 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LiveRankingBox />
              <PopularSearchWidget />
            </div>

            {/* 카카오 애드핏 2단 스퀘어 배너 (PC: 나란히 2개, Mobile: 세로로 2개) */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 my-8">
              <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
              <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
            </div>

            {/* 3. 주말 한정 특별 콘텐츠 */}
            {(() => {
              const day = new Date().getDay();
              const hour = new Date().getHours();
              // 금요일 18시 이후 ~ 월요일 08시 이전 (실제 주말 조건 복구)
              const isWeekend = (day === 5 && hour >= 18) || day === 6 || day === 0 || (day === 1 && hour < 8);
              
              if (!isWeekend) return null;
              
              return (
                <div className="space-y-6">
                  {/* 주말 특별 배너 2단 그리드 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Link href="/signals?tab=calendar" className="block relative overflow-hidden group rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 to-pink-900/20 p-6">
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                          <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold mb-3">WEEKEND LIVE</span>
                          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <CalendarClock className="w-5 h-5" /> 다음 주 글로벌 경제 일정
                          </h3>
                          <p className="text-sm text-indigo-200 line-clamp-2">미국 FOMC, CPI 발표 등 증시 방향성을 결정지을 핵심 일정과 시간표를 미리 체크하세요.</p>
                        </div>
                        <div className="mt-4 flex items-center text-indigo-300 text-sm font-semibold group-hover:text-white transition-colors">
                          일정표 확인하기 <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </Link>

                    <Link href="/weekend-report" className="block relative overflow-hidden group rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/40 to-teal-900/20 p-6">
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold mb-3 flex items-center gap-1 w-max">
                            <Lock className="w-3 h-3" /> PRO ONLY
                          </span>
                          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <Newspaper className="w-5 h-5" /> 이번 주 증시 요약 리포트
                          </h3>
                          <p className="text-sm text-emerald-200 line-clamp-2">한 주간의 코스피/코스닥 흐름과 외국인, 기관의 수급 동향을 AI가 완벽하게 요약했습니다.</p>
                        </div>
                        <div className="mt-4 flex items-center text-emerald-300 text-sm font-semibold group-hover:text-white transition-colors">
                          리포트 읽기 <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })()}

            {/* 글로벌 시장 인덱스 및 주요 지표 (안전한 공식/TradingView 데이터) */}
            <div className="space-y-6">
              <MarketIndicators limit={10} />
            </div>


            {/* Guide Links for SEO Crawlers & Users */}
            <div className="mt-8">
              <h2 className="text-lg font-bold text-gray-400 mb-3 ml-2">📚 투자 전략 가이드</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Link href="/guide/ai-investing" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors group block">
                  <h3 className="text-gray-300 font-semibold group-hover:text-cyan-300 text-sm">초보자를 위한 실전 주식 가이드</h3>
                </Link>
                <Link href="/guide/supply-chain-analysis" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors group block">
                  <h3 className="text-gray-300 font-semibold group-hover:text-cyan-300 text-sm">공급망 지도 분석 방법론</h3>
                </Link>
                <Link href="/guide/risk-management" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors group block">
                  <h3 className="text-gray-300 font-semibold group-hover:text-cyan-300 text-sm">포트폴리오 변동성 관리</h3>
                </Link>
              </div>
            </div>

            {/* 하단 세로 배너 광고 (320x480) */}
            <div className="my-8 flex justify-center">
              <KakaoAdFit adUnit="DAN-b946L75vYgFilyWy" adWidth="320" adHeight="480" />
            </div>

            {/* SEO & Content Section for AdSense Crawlers (축소된 Footer 스타일) */}
            <div className="mt-12 border-t border-white/10 pt-10 pb-8 text-center px-4">
              <h1 className="text-lg md:text-xl font-bold text-gray-500 mb-4">StockTrend 전문가: 장 마감 데이터 분석 및 핵심 테마 검색 플랫폼</h1>
              <div className="max-w-4xl mx-auto space-y-4 text-xs md:text-sm text-gray-600 leading-relaxed">
                <p>
                  <strong>StockTrend 전문가 플랫폼</strong>은 코스피, 코스닥 및 글로벌 증시의 주요 지표와 장 마감 가격 변동을 분석하여 직관적인 리포트를 제공합니다.
                  당사의 시스템은 실시간 시장 데이터와 뉴스 플로우를 기반으로 현재 산업 트렌드와 자금 유입 동향을 객관적으로 분석하며, 주관적인 예측을 철저히 배제합니다.
                </p>
                <p>
                  또한, 수급(Supply & Demand), 재무 건전성(Financials), 시장 심리(News Sentiment)의 3가지 핵심 지표를 종합하여 투자 매력도 점수를 산출합니다.
                  본 서비스의 모든 정보는 참고용이며, 투자 판단에 대한 최종 책임은 전적으로 투자자 본인에게 있습니다.
                </p>
              </div>
            </div>

            {/* FAQ Section for SEO (간소화) */}
            <div className="max-w-4xl mx-auto px-4 mb-10 border-t border-white/10 pt-8">
              <h2 className="text-sm font-bold text-gray-500 mb-4 text-center">💡 자주 묻는 질문 (FAQ)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600">
                <div>
                  <h3 className="font-semibold text-gray-500 mb-1">Q. AI 주식 분석 원리?</h3>
                  <p>재무제표, 증권사 리포트, 뉴스 기사를 자연어처리(NLP)로 분석하여 숨겨진 리스크와 심리를 수치화합니다.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-500 mb-1">Q. 미국 증시 분석?</h3>
                  <p>나스닥, S&P 500 등 글로벌 주요 빅테크 종목의 실시간 데이터와 실적 분석 리포트를 무료로 제공합니다.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-500 mb-1">Q. 푸시 알림 신청?</h3>
                  <p>관심 종목으로 등록하면 주가 급변이나 분기 실적 발표 시 스마트폰 푸시 알림으로 가장 빠르게 속보를 드립니다.</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}






function TopRankingWidget({ market, title }: { market: string, title: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Vercel Edge Cache Proxy 호출
        const res = await fetch(`/api/market/rank/top10/${market}`);

        // [Fix] Check response status before parsing
        if (!res.ok) {
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (json.status === "success") {
          setData(json.data);
        }
      } catch (e) {
        // [Fix] Silently ignore fetch errors
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, [market]);

  return (
    <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md flex flex-col h-[350px]">
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
            <div key={`${item.symbol}-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${idx < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>{item.rank}</span>
                <div>
                  <div className="font-bold text-white text-sm">{item.name}</div>
                  <div className="text-[10px] text-gray-500">{item.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-200 text-sm">
                  {market === 'US' ? '$' : '₩'}{Number(item.price || 0).toLocaleString(undefined, { maximumFractionDigits: market === 'US' ? 2 : 0 })}
                </div>
                <div className={`text-xs font-bold ${item.change_percent >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  {item.change_percent >= 0 ? '▲' : '▼'}{Math.abs(Number(item.change_percent || 0)).toFixed(2)}%
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
            {Array.isArray(result.leaders) && result.leaders.map((stock: any, i: number) => (
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
            {Array.isArray(result.followers) && result.followers.map((stock: any, i: number) => (
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
