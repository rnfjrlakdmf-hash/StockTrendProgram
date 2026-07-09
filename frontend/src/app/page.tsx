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
import SeoContentBlock from "@/components/SeoContentBlock";

import { TrendingUp, Zap, AlertCircle, Loader2, Coins, Globe, BarChart3, Droplets, Layers, AlertTriangle, MessageSquare, Activity, CalendarClock, ChevronRight, Lock, Newspaper, Send, Bell, Users } from "lucide-react";

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
        
        {/* 상단 통합 배너 영역 (가로배너 + 사각배너 나란히 배치) */}
        <div className="flex flex-col xl:flex-row items-center justify-center gap-6 -mt-2 mb-4">
          {/* 좌측/중앙 배너 (모바일: 320x50, PC: 728x90) */}
          <div className="flex justify-center">
            <div className="block md:hidden">
              <KakaoAdFit adUnit="DAN-g3wzyZlZ4hBiYyRA" adWidth="320" adHeight="50" />
            </div>
            <div className="hidden md:block">
              <KakaoAdFit adUnit="DAN-eeR4RhnpmQaeIlYm" adWidth="728" adHeight="90" />
            </div>
          </div>
          {/* 우측 사각 배너 (PC에서만 상단에 나란히 배치) */}
          <div className="hidden xl:block">
            <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
          </div>
        </div>
        
        {/* 텔레그램 구독 유도 카드 - 메인 CTA */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0088cc]/20 via-[#005f8f]/10 to-transparent border border-[#0088cc]/30 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#0088cc]/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            {/* 아이콘 */}
            <div className="w-20 h-20 bg-gradient-to-br from-[#0088cc] to-[#005f8f] rounded-3xl flex items-center justify-center shrink-0 shadow-2xl shadow-blue-500/30">
              <Send className="w-10 h-10 text-white" />
            </div>
            {/* 텍스트 */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#4fc3f7] text-xs font-bold px-3 py-1 rounded-full mb-3">
                <Zap className="w-3 h-3" /> 실시간 속보 채널
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                텔레그램 실시간 주식 속보 채널
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                외국인 순매수 1위, 상한가 급등주, DART 대량보유 공시, 미국 증시 속보를<br className="hidden md:block" />
                텔레그램에서 <strong className="text-white">1초 만에</strong> 받아보세요. 완전 무료!
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start text-xs">
                {["🐳 세력 포착 알림", "📈 상한가 속보", "🌐 미국증시 브리핑", "💎 VIP 수급 데이터"].map(t => (
                  <span key={t} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-gray-300 font-medium">{t}</span>
                ))}
              </div>
            </div>
            {/* 버튼 */}
            <div className="shrink-0">
              <a
                href="https://t.me/stocktrend_live"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-[#0088cc] to-[#00b2ff] hover:from-[#006fa6] hover:to-[#0088cc] text-white font-black px-6 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 text-base whitespace-nowrap"
              >
                <Send className="w-5 h-5" />
                지금 무료 구독
                <ChevronRight className="w-5 h-5" />
              </a>
            </div>
          </div>
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


            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 relative">
              <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-black p-6 backdrop-blur-md relative overflow-hidden">
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
              
              {/* 우측 사이드바 광고 영역 (검색 결과 페이지 전용, PC에서만 표시) */}
              <div className="hidden xl:block relative">
                <div className="sticky top-24 flex justify-center">
                  <KakaoAdFit adUnit="DAN-t0pQeZMZ4NvClxXn" adWidth="320" adHeight="480" />
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


            {/* 코인 핫트렌드 대시보드 (상시 노출) */}
            <WeekendCryptoDashboard />

            {/* 메인 대시보드 레이아웃: 좌측/우측 2단 구성 (사이드바 없음) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
              <LiveRankingBox />
              <PopularSearchWidget />
              
              {/* 모바일 전용: 위젯 하단으로 스퀘어 배너 이동 */}
              <div className="flex lg:hidden justify-center my-2 lg:col-span-2">
                <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
              </div>
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


            {/* SEO Text Rich Links (AdSense Approval Priority) */}
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-200 mb-4 ml-2 flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-purple-400" /> 최신 마켓 리포트 및 투자 스터디
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/theory" className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/20 to-black border border-indigo-500/20 hover:border-indigo-500/50 transition-colors group block">
                    <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full mb-3">AI 차트 분석</span>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 mb-2">매일 차트 스터디 (주식 이론방)</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      이동평균선, RSI, MACD, 캔들 패턴 등 주식 투자의 기초부터 심화까지! 매일 업데이트되는 예쁜 차트와 함께 실전 주식 이론을 무료로 학습해 보세요. 초보자도 쉽게 따라할 수 있는 완벽한 가이드가 제공됩니다.
                    </p>
                  </Link>
                  <Link href="/blog" className="p-6 rounded-3xl bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 hover:border-blue-500/50 transition-colors group block">
                    <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full mb-3">마켓 뷰</span>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 mb-2">오늘의 증시 마감 리포트</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      매일 장 마감 후 국내 코스피, 코스닥부터 미국 나스닥까지 글로벌 시황을 완벽하게 요약해 드립니다. 기관과 외국인의 수급 흐름, 시장을 주도한 핵심 테마와 특징주를 AI 애널리스트가 심층 분석하여 제공합니다.
                    </p>
                  </Link>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-400 mb-3 ml-2 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" /> 투자 전략 가이드
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Link href="/guide/ai-investing" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors group block">
                    <h3 className="text-gray-300 font-semibold group-hover:text-cyan-300 text-sm">초보자를 위한 실전 주식 가이드</h3>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">데이터 기반의 올바른 투자 습관과 마인드셋을 기르는 첫 걸음</p>
                  </Link>
                  <Link href="/guide/supply-chain-analysis" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors group block">
                    <h3 className="text-gray-300 font-semibold group-hover:text-cyan-300 text-sm">공급망 지도 분석 방법론</h3>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">산업의 밸류체인을 이해하고 숨은 수혜주를 발굴하는 비법</p>
                  </Link>
                  <Link href="/guide/risk-management" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors group block">
                    <h3 className="text-gray-300 font-semibold group-hover:text-cyan-300 text-sm">포트폴리오 변동성 관리</h3>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">하락장에서도 계좌를 지키는 리스크 관리 및 자산 배분 전략</p>
                  </Link>
                </div>
              </div>
            </div>

            {/* 하단 통합 배너 광고 (모바일: 320x480 세로형, PC: 728x90 가로형) */}
            <div className="my-8 flex justify-center">
              {/* 모바일 전용 대형 배너 */}
              <div className="block md:hidden">
                <KakaoAdFit adUnit="DAN-b946L75vYgFilyWy" adWidth="320" adHeight="480" />
              </div>
              {/* PC 전용 하단 가로 배너 */}
              <div className="hidden md:block">
                <KakaoAdFit adUnit="DAN-kfR4SXJubdA0vEcm" adWidth="728" adHeight="90" />
              </div>
            </div>

            {/* SEO & Content Section for AdSense Crawlers */}
            <div className="mt-12 border-t border-white/10 pt-10 pb-8 px-4 text-left max-w-5xl mx-auto">
              <details className="group cursor-pointer">
                <summary className="text-gray-600 text-sm font-bold hover:text-gray-400 transition-colors list-none flex justify-center items-center gap-2 bg-white/5 py-3 px-6 rounded-2xl w-fit mx-auto border border-white/5">
                  <span>서비스 상세 가이드 및 면책 조항 (펼치기)</span>
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <article className="prose prose-invert prose-sm md:prose-base lg:prose-lg mx-auto text-gray-500 mt-8 pt-8 border-t border-white/5">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-400 mb-6">StockTrend 전문가 플랫폼: AI 주식 데이터 분석 및 핵심 트렌드 탐색 가이드</h1>
                
                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-300 mb-3">1. 인공지능(AI) 기반 주식 시장 데이터 분석의 원리</h2>
                  <p className="mb-4 leading-relaxed">
                    StockTrend 전문가 플랫폼은 단순한 주가 조회를 넘어, 코스피(KOSPI), 코스닥(KOSDAQ) 및 미국 나스닥(NASDAQ), S&P 500 등 글로벌 주요 증시의 방대한 데이터를 실시간으로 수집하고 분석하는 첨단 AI 기반 주식 정보 플랫폼입니다. 
                    현대 주식 시장은 초 단위로 생성되는 수많은 재무 데이터, 증권사 리포트, 그리고 거시 경제 뉴스 플로우에 의해 움직입니다. 당사의 시스템은 자연어처리(NLP) 기술과 머신러닝 알고리즘을 활용하여 이러한 비정형 데이터를 정형화하고, 투자자들에게 가장 직관적인 형태의 인사이트로 제공합니다.
                  </p>
                  <p className="leading-relaxed">
                    특히, 기술적 분석(Technical Analysis)과 기본적 분석(Fundamental Analysis)을 결합하여 종목별 투자 매력도를 종합적으로 평가합니다. 이동평균선(Moving Average), MACD, RSI(상대강도지수), 볼린저 밴드(Bollinger Bands) 등 차트 지표뿐만 아니라 PER, PBR, ROE, EPS 등 핵심 재무 지표를 실시간으로 크로스 체크하여 잠재적 리스크 요인을 사전에 필터링합니다.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-300 mb-3">2. 실시간 테마주 검색 및 섹터 로테이션 전략</h2>
                  <p className="mb-4 leading-relaxed">
                    주식 시장에서 수익을 극대화하기 위해서는 자금의 흐름, 즉 '섹터 로테이션(Sector Rotation)'을 정확히 읽어내는 것이 필수적입니다. 반도체, 2차전지, 바이오, 인공지능, 자율주행 등 매일 변동하는 핵심 테마와 주도주를 추적하는 것은 개인 투자자에게 매우 어려운 과제입니다.
                  </p>
                  <p className="leading-relaxed">
                    저희 플랫폼의 테마 검색 엔진은 키워드 하나만 입력해도 해당 테마에 엮여 있는 대장주와 관련주(Followers)를 즉시 분류해 냅니다. 각 종목이 왜 해당 테마로 분류되었는지에 대한 구체적인 편입 사유와 뉴스 기사(News Sentiment)의 호조 및 악재 여부를 함께 제공하여, 투자자가 뉴스에 휩쓸리지 않고 팩트(Fact)에 기반한 데이터 투자를 할 수 있도록 돕습니다.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-300 mb-3">3. 외국인 및 기관 수급 분석과 장 마감 시황 브리핑</h2>
                  <p className="mb-4 leading-relaxed">
                    국내 증시 특성상 외국인과 기관 투자자의 수급(Supply & Demand)은 주가 향방을 결정짓는 절대적인 요소입니다. 프로그램 매매 동향과 공매도(Short Selling) 잔고, 대차 잔고 추이 등을 면밀히 분석하여 메이저 자금의 이탈 및 유입을 포착합니다. 
                  </p>
                  <p className="leading-relaxed">
                    매일 장이 마감된 후, 당일 시장을 주도했던 핵심 섹터와 급등락 종목의 원인을 심층 분석한 '장 마감 브리핑 리포트'를 발행합니다. 이는 다음 날의 개장 전 프리마켓(Pre-market) 준비를 위한 최고의 지침서가 되며, 바쁜 직장인 투자자들도 하루 5분 투자로 시장 전체의 매크로 흐름(인플레이션, 금리, 환율 동향)을 파악할 수 있도록 최적화되어 있습니다.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-300 mb-3">4. 리스크 관리(Risk Management)와 포트폴리오 최적화 방안</h2>
                  <p className="mb-4 leading-relaxed">
                    아무리 좋은 종목이라도 매수 타이밍과 비중 조절에 실패하면 손실을 볼 수 있습니다. 분산 투자(Diversification)와 자산 배분 전략은 계좌를 지키는 가장 확실한 방법입니다. 저희는 사용자가 관심 종목으로 등록한 기업들에 대해 실적 발표일, 배당락일, 유상증자 및 전환사채(CB) 발행 등 주가에 치명적인 영향을 미칠 수 있는 공시(Disclosure) 정보를 실시간 푸시 알림으로 전달합니다.
                  </p>
                  <p className="leading-relaxed">
                    또한, 목표가 도달 알림 및 손절매(Stop-Loss) 설정 가이드를 통해 감정에 휘둘리지 않는 기계적인 트레이딩 훈련을 지원합니다. 주식 투자는 마라톤과 같습니다. 일시적인 손실에 연연하기보다는 철저한 데이터 기반의 투자 룰(Rule)을 확립하고 이를 지켜나가는 것이 경제적 자유를 향한 지름길입니다.
                  </p>
                </section>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
                  <h3 className="font-bold text-gray-300 mb-2">💡 면책 조항 (Disclaimer)</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    본 웹사이트에서 제공되는 모든 데이터, 뉴스, 분석 보고서, 투자 지표 및 AI 챗봇의 답변은 투자 판단을 위한 참고 자료일 뿐입니다. 제공되는 정보의 정확성이나 완전성을 보장할 수 없으며, 예기치 않은 오류가 발생할 수 있습니다. 당사는 본 플랫폼에서 제공하는 정보로 인해 발생하는 어떠한 직간접적인 투자 손실에 대해서도 법적 책임을 지지 않습니다. 주식, ETF, 암호화폐 등 모든 금융 상품 투자에 대한 최종 결정권과 책임은 전적으로 투자자 본인에게 있음을 강력히 명시합니다. 투자를 진행하기 전 반드시 본인의 철저한 분석과 전문가의 조언을 참고하시기 바랍니다.
                  </p>
                </div>
              </article>
              </details>
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
      {/* [New] 대규모 SEO 텍스트 폭격 영역 (구글 애드센스 승인을 위한 1,500자 이상의 콘텐츠 가이드) */}
      <SeoContentBlock />
    </div>
  );
}
