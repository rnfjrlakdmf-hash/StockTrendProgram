"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import GaugeChart from "@/components/GaugeChart";
import { fetchStockAnalysis, fetchThemeAnalysis, fetchChatResponse, StockData, fetchStockFast } from "@/lib/api";
import MarketScannerDashboard from "@/components/MarketScannerDashboard";
import NaverTopWidget from "@/components/NaverTopWidget";
import MorningBriefWidget from "@/components/MorningBriefWidget";
import DashboardMarketClock from "@/components/DashboardMarketClock";
import LiveRankingBox from "@/components/LiveRankingBox";
import PopularSearchWidget from "@/components/PopularSearchWidget";
import WeekendCryptoDashboard from "@/components/WeekendCryptoDashboard";
import KakaoAdFit from "@/components/KakaoAdFit";

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
            
            {/* [주말 특별 배너] 다음 주 증시 캘린더 유도 (테스트를 위해 상시 노출) */}
            {(() => {
              const day = new Date().getDay();
              const hour = new Date().getHours();
              // 금요일 18시 이후 ~ 월요일 08시 이전
              // const isWeekend = (day === 5 && hour >= 18) || day === 6 || day === 0 || (day === 1 && hour < 8);
              const isWeekend = true; // 대표님 확인용 임시 상시 노출
              
              if (!isWeekend) return null;
              
              return (
                <>
                  {/* 코인 핫트렌드 대시보드 (주말 한정 최상단) */}
                  <WeekendCryptoDashboard />

                  {/* 카카오 애드핏 배너 */}
                  <div className="mb-4">
                    <KakaoAdFit adUnit="DAN-XHkHhnjZT4zSnILn" adWidth="300" adHeight="250" />
                  </div>

                  <Link href="/weekend-whale" className="block relative overflow-hidden group rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 p-1 mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                      <Layers className="w-24 h-24 text-blue-400" />
                    </div>
                    <div className="relative bg-black/40 backdrop-blur-md rounded-[22px] p-6 md:p-8 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                           <span className="animate-pulse flex h-3 w-3 relative">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                           </span>
                           <span className="text-red-400 font-bold text-sm tracking-wider">WEEKEND SPECIAL</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight">
                          주말 한정판: 세력/외인 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">매집 TOP 3</span> 리포트
                        </h2>
                        <p className="text-gray-400 font-medium text-sm md:text-base">한 주간의 수급 데이터를 분석한 AI 리포트로 월요일 장을 미리 준비하세요.</p>
                      </div>
                      <div className="hidden md:flex items-center justify-center w-14 h-14 rounded-full bg-white/10 group-hover:bg-blue-500/20 transition-colors duration-300">
                        <ChevronRight className="w-8 h-8 text-white group-hover:text-blue-400 transition-colors duration-300" />
                      </div>
                    </div>
                  </Link>
                </>
              );
            })()}

            {/* [Phase 5] Real-time Trending Search (FOMO Widget) */}
            <PopularSearchWidget />

            {/* [Phase 3] Live Ranking Dashboard (KRX) */}
            <LiveRankingBox />

            {/* Real-time World Clock Grid at the top */}
            <DashboardMarketClock />

            {/* 모닝 브리핑 */}
            <MorningBriefWidget />

            {/* 카카오 애드핏 배너 */}
            <div className="mb-4">
              <KakaoAdFit adUnit="DAN-XHkHhnjZT4zSnILn" adWidth="300" adHeight="250" />
            </div>

            {/* 실시간 종목 랭킹 (Removed for commercial legal safety) */}

            {/* SEO & Content Section for AdSense Crawlers (콘텐츠 부족 문제 해결용 정적 텍스트) */}
            <div className="mt-12 bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-md">
              <h1 className="text-2xl md:text-3xl font-black text-white mb-6">StockTrend 전문가: 장 마감 데이터 분석 및 핵심 테마 검색 플랫폼</h1>
              
              <div className="space-y-5 text-sm md:text-base text-gray-300 leading-relaxed font-medium">
                <p>
                  <strong>StockTrend 전문가 플랫폼</strong>은 급변하는 주식 시장에서 개인 투자자들이 신속하고 정확한 의사결정을 내릴 수 있도록 돕는 <strong>최고 수준의 주식 분석 서비스</strong>입니다. 코스피(KOSPI), 코스닥(KOSDAQ) 등 국내 주식 시장뿐만 아니라 나스닥(NASDAQ), S&P 500을 포함한 글로벌 증시의 주요 지표와 장 마감 가격 변동을 철저히 분석하여, 방대하고 복잡한 금융 데이터를 누구나 쉽게 이해할 수 있는 직관적인 리포트로 변환하여 제공합니다.
                </p>
                <p>
                  본 플랫폼은 실시간 시장 데이터와 뉴스 플로우를 기반으로 현재 주식 시장의 주요 <strong>산업 트렌드와 자금 유입 동향</strong>을 객관적으로 분석합니다. 당사의 시스템은 주관적인 예측을 철저히 배제하고, 각 기업의 최신 공시, 실적 발표, 그리고 공급망 연관성을 바탕으로 시장의 흐름을 요약 브리핑 형태로 제공합니다. 이를 통해 투자자들은 검증되지 않은 루머에 흔들리지 않고, <strong>실제 펀더멘털(Fundamental)과 객관적 데이터</strong>에 기반한 합리적인 투자 판단을 내릴 수 있습니다.
                </p>
                <p>
                  또한, 메인 대시보드에 제공되는 <strong>인기 글로벌 랭킹 위젯</strong>과 <strong>세계 증시 현황판</strong>을 통해 전 세계 금융 시장의 자금 흐름을 한눈에 파악할 수 있습니다. 외국인 및 기관의 순매수 동향, 미국 연방준비제도(Fed)의 금리 정책 변화, 빅테크 기업들의 실적 발표(Earnings Call), 그리고 각종 거시경제 지표 발표 등 글로벌 메가 이벤트가 국내 증시와 내 포트폴리오에 미치는 영향을 수석 전략가의 시각으로 입체적으로 분석하여 브리핑해 드립니다.
                </p>
                <p>
                  뿐만 아니라, 특정 주식 종목을 검색하면 <strong>수급(Supply & Demand), 재무 건전성(Financials), 시장 심리(News Sentiment)</strong>의 3가지 핵심 지표를 종합하여 0점부터 100점까지의 <strong>'투자 매력도 종합 점수'</strong>를 산출해 직관적인 게이지 차트로 보여줍니다. 이를 바탕으로 현재 해당 주식이 과대평가되었는지, 과소평가되었는지를 판단하고 보다 체계적인 투자 전략을 수립할 수 있습니다.
                </p>
                <p className="text-gray-500 text-xs mt-8 pt-6 border-t border-white/10">
                  ※ 안내사항: 본 서비스에서 제공하는 주식 시세, 테마 분석 리포트 및 기반의 모든 투자 정보는 당사의 시스템을 활용해 주기적으로 가공된 정보입니다. 하지만 시스템 및 통신 환경에 따라 실제 시장 데이터와 시간차가 발생할 수 있으며, 제공되는 정보는 오직 투자 참고용으로만 사용되어야 합니다. 주식 거래 및 투자 판단에 대한 최종 책임은 전적으로 투자자 본인에게 있습니다. 건강하고 성공적인 투자를 위해 본 플랫폼을 유용한 보조 지표로 적극 활용해 보세요.
                </p>
              </div>
            </div>

            {/* Guide Links for SEO Crawlers & Users */}
            <div className="mt-8 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white mb-4">📚 투자 전략 가이드 (추천 칼럼)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/guide/ai-investing" className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-cyan-500/50 transition-colors group block">
                  <h3 className="text-cyan-400 font-bold group-hover:text-cyan-300">초보자를 위한 실전 주식 투자 가이드</h3>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">감정을 배제하고 철저한 데이터 기반으로 시장 상황을 판단하는 분석의 원리를 알아봅니다.</p>
                </Link>
                <Link href="/guide/supply-chain-analysis" className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-cyan-500/50 transition-colors group block">
                  <h3 className="text-cyan-400 font-bold group-hover:text-cyan-300">공급망 지도 분석 방법론</h3>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">공급사, 고객사, 경쟁사의 역학 관계가 기업의 주가와 실적에 미치는 나비효과를 파악합니다.</p>
                </Link>
                <Link href="/guide/risk-management" className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-cyan-500/50 transition-colors group block">
                  <h3 className="text-cyan-400 font-bold group-hover:text-cyan-300">포트폴리오 변동성 관리와 헷징</h3>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">현대 포트폴리오 이론(MPT)을 바탕으로 리스크를 통제하는 분산 투자법을 안내합니다.</p>
                </Link>
              </div>
            </div>

            {/* FAQ Section for SEO */}
            <div className="mt-8 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md mb-10">
              <h2 className="text-xl font-bold text-white mb-6">💡 자주 묻는 질문 (FAQ)</h2>
              <div className="space-y-6 text-gray-300 text-sm">
                <div>
                  <h3 className="font-bold text-blue-400 mb-2">Q. StockTrend의 AI 주식 분석은 어떻게 이루어지나요?</h3>
                  <p className="leading-relaxed">A. 당사의 AI 시스템은 수십만 건의 재무제표, 증권사 리포트 원문, 뉴스 기사를 자연어처리(NLP) 기술로 분석합니다. 이를 통해 인간이 파악하기 힘든 투자 심리(Sentiment)와 숨겨진 리스크를 감지하여 0~100점의 투자 매력도 점수로 제공합니다.</p>
                </div>
                <div>
                  <h3 className="font-bold text-blue-400 mb-2">Q. 미국 나스닥과 S&P 500 주식도 분석 가능한가요?</h3>
                  <p className="leading-relaxed">A. 네, 가능합니다. 코스피와 코스닥 등 국내 증시뿐만 아니라, 테슬라, 엔비디아, 마이크로소프트 등 미국 주요 빅테크 종목 및 글로벌 주식들의 실시간 데이터와 실적 분석 리포트를 모두 무료로 확인하실 수 있습니다.</p>
                </div>
                <div>
                  <h3 className="font-bold text-blue-400 mb-2">Q. 푸시 알림 서비스는 어떻게 신청하나요?</h3>
                  <p className="leading-relaxed">A. 관심 있는 주식을 검색한 후 별모양 아이콘을 눌러 '관심 종목'으로 등록하면, 해당 기업의 주가가 급변하거나 주요 공시, 분기 실적 발표가 있을 때 스마트폰 브라우저 푸시 알림으로 가장 빠르게 속보를 받아보실 수 있습니다.</p>
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
