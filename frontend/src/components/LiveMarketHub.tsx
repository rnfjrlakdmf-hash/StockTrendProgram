"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, Flame, TrendingUp, Coins, RefreshCw, 
  ChevronRight, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";

// 1. 코인 데이터 인터페이스
interface CryptoCoin {
  market: string;
  korean_name: string;
  trade_price: number;
  signed_change_rate: number;
  signed_change_price: number;
  acc_trade_price_24h: number;
}

// 2. 검색어 데이터 인터페이스
interface SearchItem {
  rank: number;
  name: string;
  symbol: string;
  price: string;
  change_percent: number;
}

export default function LiveMarketHub() {
  // 메인 탭: 'ranking' (마켓 랭킹) | 'search' (급상승 검색어) | 'crypto' (가상자산 24H)
  const [activeTab, setActiveTab] = useState<"ranking" | "search" | "crypto">("ranking");

  // 마켓 랭킹 서브 옵션
  const [rankingMarket, setRankingMarket] = useState<"KR" | "US">("KR");
  const [rankingCategory, setRankingCategory] = useState<"amount" | "volume">("amount");
  const [rankings, setRankings] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);

  // 급상승 검색어 데이터
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(true);

  // 가상자산 데이터
  const [coins, setCoins] = useState<CryptoCoin[]>([]);
  const [cryptoLoading, setCryptoLoading] = useState(true);

  // 페이지 토글 (1~5위 / 6~10위)
  const [page, setPage] = useState<1 | 2>(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 1) 마켓 랭킹 데이터 불러오기
  const fetchRankings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/market/rankings/live?market=${rankingMarket}&category=${rankingCategory}`);
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        setRankings(json.data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error("Live ranking fetch error:", e);
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    setRankingLoading(true);
    fetchRankings();
    const interval = setInterval(fetchRankings, 5000);
    return () => clearInterval(interval);
  }, [rankingMarket, rankingCategory]);

  // 2) 급상승 검색어 불러오기
  const fetchPopularKeywords = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/market/popular-search`);
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
        setSearchItems(json.data);
      } else {
        // 기본 폴백 데이터
        setSearchItems([
          { rank: 1, name: "삼성전자", symbol: "005930", price: "72,500", change_percent: 2.1 },
          { rank: 2, name: "SK하이닉스", symbol: "000660", price: "182,000", change_percent: 3.4 },
          { rank: 3, name: "한화에어로스페이스", symbol: "012450", price: "245,000", change_percent: 5.8 },
          { rank: 4, name: "현대차", symbol: "005380", price: "248,000", change_percent: 1.2 },
          { rank: 5, name: "NAVER", symbol: "035420", price: "192,500", change_percent: -0.8 },
          { rank: 6, name: "알테오젠", symbol: "196170", price: "320,000", change_percent: 4.5 },
          { rank: 7, name: "에코프로머티리얼즈", symbol: "450080", price: "115,000", change_percent: -2.1 },
          { rank: 8, name: "기아", symbol: "000270", price: "123,400", change_percent: 0.9 },
          { rank: 9, name: "카카오", symbol: "035720", price: "48,500", change_percent: -1.2 },
          { rank: 10, name: "셀트리온", symbol: "068270", price: "189,000", change_percent: 1.5 }
        ]);
      }
    } catch {
      // 오류 시 안전한 폴백 유지
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularKeywords();
    const interval = setInterval(fetchPopularKeywords, 30000);
    return () => clearInterval(interval);
  }, []);

  // 3) 가상자산 시세 불러오기 (업비트)
  const fetchCrypto = async () => {
    try {
      const res = await fetch("https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL,KRW-DOGE,KRW-ADA");
      const data = await res.json();
      const names: { [key: string]: string } = {
        "KRW-BTC": "비트코인",
        "KRW-ETH": "이더리움",
        "KRW-XRP": "리플",
        "KRW-SOL": "솔라나",
        "KRW-DOGE": "도지코인",
        "KRW-ADA": "에이다"
      };

      if (Array.isArray(data)) {
        const formatted: CryptoCoin[] = data.map((item: any) => ({
          market: item.market,
          korean_name: names[item.market] || item.market.replace("KRW-", ""),
          trade_price: item.trade_price,
          signed_change_rate: item.signed_change_rate,
          signed_change_price: item.signed_change_price,
          acc_trade_price_24h: item.acc_trade_price_24h
        }));
        setCoins(formatted);
      }
    } catch (e) {
      console.error("Crypto fetch error", e);
    } finally {
      setCryptoLoading(false);
    }
  };

  useEffect(() => {
    fetchCrypto();
    const interval = setInterval(fetchCrypto, 10000);
    return () => clearInterval(interval);
  }, []);

  // 탭 변경 시 페이지 1로 리셋
  const handleTabChange = (tab: "ranking" | "search" | "crypto") => {
    setActiveTab(tab);
    setPage(1);
  };

  // 현재 페이지에 보여줄 데이터 슬라이스 (1~5위 또는 6~10위)
  const currentRankings = rankings.slice((page - 1) * 5, page * 5);
  const currentSearches = searchItems.slice((page - 1) * 5, page * 5);

  return (
    <div className="w-full bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col justify-between h-full group hover:border-white/20 transition-all duration-300">
      
      {/* 1. 상단 마스터 헤더 & 3대 탭 전환 버튼 */}
      <div className="bg-zinc-950/90 border-b border-white/10 px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        
        {/* 타이틀 & 실시간 펄스 */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl relative">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full"></span>
          </div>
          <div>
            <h2 className="font-black text-white text-sm tracking-tight flex items-center gap-2">
              실시간 시세 & 랭킹 허브
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                LIVE
              </span>
            </h2>
          </div>
        </div>

        {/* 3대 통합 탭 셀렉터 */}
        <div className="flex bg-zinc-900/90 rounded-2xl p-1 border border-white/10 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => handleTabChange("ranking")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeTab === "ranking"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>마켓 랭킹</span>
          </button>

          <button
            onClick={() => handleTabChange("search")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeTab === "search"
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-300" />
            <span>급상승 검색어</span>
          </button>

          <button
            onClick={() => handleTabChange("crypto")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeTab === "crypto"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            <span>가상자산 24H</span>
          </button>
        </div>

      </div>

      {/* 2. 서브 컨트롤 바 (세부 옵션 + 1~5위 / 6~10위 페이징) */}
      <div className="px-4 sm:px-5 py-2.5 bg-zinc-900/40 border-b border-white/5 flex items-center justify-between gap-2">
        
        {/* 좌측 서브 카테고리 필터 */}
        {activeTab === "ranking" && (
          <div className="flex items-center gap-1">
            <div className="flex bg-zinc-950/80 rounded-xl p-0.5 border border-white/5">
              <button
                onClick={() => { setRankingMarket("KR"); setRankingCategory("amount"); }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  rankingMarket === "KR" && rankingCategory === "amount" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                국내 대금
              </button>
              <button
                onClick={() => { setRankingMarket("KR"); setRankingCategory("volume"); }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  rankingMarket === "KR" && rankingCategory === "volume" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                국내 인기
              </button>
              <div className="w-px bg-white/10 mx-0.5 my-1" />
              <button
                onClick={() => { setRankingMarket("US"); setRankingCategory("amount"); }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  rankingMarket === "US" && rankingCategory === "amount" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                미국 대금
              </button>
              <button
                onClick={() => { setRankingMarket("US"); setRankingCategory("volume"); }}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  rankingMarket === "US" && rankingCategory === "volume" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                미국 인기
              </button>
            </div>
          </div>
        )}

        {activeTab === "search" && (
          <div className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span>포털 실시간 급상승 관심 종목 (30초 자동 갱신)</span>
          </div>
        )}

        {activeTab === "crypto" && (
          <div className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>업비트(Upbit) 24시간 실시간 연동 (정규장 마감 무관)</span>
          </div>
        )}

        {/* 우측 페이지 토글 (마켓 랭킹, 검색어에서 1~5위 / 6~10위 전환) */}
        {(activeTab === "ranking" || activeTab === "search") && (
          <div className="flex bg-zinc-950/80 rounded-xl p-0.5 border border-white/5 items-center">
            <button
              onClick={() => setPage(1)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                page === 1 ? "bg-white/20 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              1 ~ 5위
            </button>
            <button
              onClick={() => setPage(2)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                page === 2 ? "bg-white/20 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              6 ~ 10위
            </button>
          </div>
        )}

      </div>

      {/* 3. 메인 종목 리스트 (가로 폭 100% 확보 - 종목제목과 가격이 절대 잘리지 않는 1열 구조) */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-around gap-2 min-h-[300px]">
        
        {/* 탭 1: 마켓 랭킹 */}
        {activeTab === "ranking" && (
          <>
            {rankingLoading && rankings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Activity className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : currentRankings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-xs py-12">
                실시간 랭킹 데이터를 불러오는 중입니다...
              </div>
            ) : (
              currentRankings.map((item, idx) => {
                const actualRank = (page - 1) * 5 + idx + 1;
                const isUp = item.change_val > 0 || String(item.change_percent).includes('+');
                const isDown = item.change_val < 0 || String(item.change_percent).includes('-');
                const bgClass = isUp 
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-300" 
                  : isDown 
                  ? "bg-sky-500/10 border-sky-500/20 text-sky-300" 
                  : "bg-white/5 border-white/10 text-gray-400";

                return (
                  <Link 
                    href={`/stock/${item.symbol}`} 
                    key={item.symbol || idx}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-white/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
                  >
                    {/* 좌측: 순위 뱃지 + 종목명 (넓은 공간으로 종목명 100% 온전하게 표시) */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 flex items-center justify-center rounded-xl font-black text-xs ${
                        actualRank === 1 ? "bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-md shadow-amber-500/20" :
                        actualRank === 2 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-black shadow-md" :
                        actualRank === 3 ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 shadow-md" :
                        "bg-zinc-800/80 text-gray-400 font-bold border border-white/5"
                      }`}>
                        {actualRank}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm md:text-base text-white group-hover:text-indigo-300 transition-colors whitespace-nowrap">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono font-bold bg-white/5 border border-white/10 px-1.5 py-0.2 rounded whitespace-nowrap">
                          {item.symbol}
                        </span>
                      </div>
                    </div>

                    {/* 우측: 현재가 (절대 잘리지 않음) + 등락률 뱃지 */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-black font-mono text-xs sm:text-sm md:text-base text-white tabular-nums whitespace-nowrap">
                          {rankingMarket === "US" && "$"}
                          {typeof (item.price_num || item.price) === "number" 
                            ? (item.price_num || item.price).toLocaleString() 
                            : item.price}
                          {rankingMarket === "KR" && <span className="text-xs font-bold text-gray-400 ml-0.5">원</span>}
                        </div>
                      </div>

                      <div className={`px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black font-mono border flex items-center gap-0.5 whitespace-nowrap ${bgClass}`}>
                        <span>{isUp ? '▲' : isDown ? '▼' : ''}</span>
                        <span>{item.change_percent}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </>
        )}

        {/* 탭 2: 급상승 검색어 */}
        {activeTab === "search" && (
          <>
            {searchLoading && searchItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Activity className="w-6 h-6 text-rose-400 animate-spin" />
              </div>
            ) : (
              currentSearches.map((item, idx) => {
                const actualRank = (page - 1) * 5 + idx + 1;
                const isUp = item.change_percent > 0;
                const isDown = item.change_percent < 0;
                const bgClass = isUp 
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-300" 
                  : isDown 
                  ? "bg-sky-500/10 border-sky-500/20 text-sky-300" 
                  : "bg-white/5 border-white/10 text-gray-400";

                return (
                  <Link 
                    href={item.symbol ? `/stock/${item.symbol}` : `/discovery?q=${encodeURIComponent(item.name)}`}
                    key={idx}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-white/5 hover:border-rose-500/30 transition-all group cursor-pointer"
                  >
                    {/* 좌측: 순위 뱃지 + 종목명 (넓은 공간으로 종목명 100% 온전하게 표시) */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 flex items-center justify-center rounded-xl font-black text-xs ${
                        actualRank === 1 ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20" :
                        actualRank === 2 ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md" :
                        actualRank === 3 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-amber-100 shadow-md" :
                        "bg-zinc-800/80 text-gray-400 font-bold border border-white/5"
                      }`}>
                        {actualRank}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm md:text-base text-white group-hover:text-rose-300 transition-colors whitespace-nowrap">
                          {item.name}
                        </span>
                        {item.symbol && (
                          <span className="text-[10px] text-gray-500 font-mono font-bold bg-white/5 border border-white/10 px-1.5 py-0.2 rounded whitespace-nowrap">
                            {item.symbol}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 우측: 현재가 (절대 잘리지 않음) + 등락률 뱃지 */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-black font-mono text-xs sm:text-sm md:text-base text-white tabular-nums whitespace-nowrap">
                          {item.price}
                          <span className="text-xs font-bold text-gray-400 ml-0.5">원</span>
                        </div>
                      </div>

                      <div className={`px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black font-mono border flex items-center gap-0.5 whitespace-nowrap ${bgClass}`}>
                        <span>{isUp ? '▲' : isDown ? '▼' : ''}</span>
                        <span>{isUp ? `+${item.change_percent}%` : `${item.change_percent}%`}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </>
        )}

        {/* 탭 3: 가상자산 24H (6개 코인 모두 시원하게 1열 배치) */}
        {activeTab === "crypto" && (
          <>
            {cryptoLoading && coins.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Activity className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
            ) : (
              coins.map((coin) => {
                const isUp = coin.signed_change_rate > 0;
                const isDown = coin.signed_change_rate < 0;
                const changePercent = (coin.signed_change_rate * 100).toFixed(2);
                const symbol = coin.market.replace("KRW-", "");

                return (
                  <div 
                    key={coin.market}
                    className="flex items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-white/5 hover:border-amber-500/30 transition-all group cursor-default"
                  >
                    {/* 좌측: 코인 한글명 + 심볼 */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-[11px]">
                        🪙
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm md:text-base text-white group-hover:text-amber-300 transition-colors whitespace-nowrap">
                          {coin.korean_name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono font-bold bg-white/5 border border-white/10 px-1.5 py-0.2 rounded whitespace-nowrap">
                          {symbol}
                        </span>
                      </div>
                    </div>

                    {/* 우측: 코인 현재가 (전체 금액 100% 표출) + 등락률 뱃지 */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-black font-mono text-xs sm:text-sm md:text-base text-white tabular-nums whitespace-nowrap">
                          {coin.trade_price >= 1000 ? coin.trade_price.toLocaleString() : coin.trade_price}
                          <span className="text-xs font-bold text-gray-400 ml-0.5">원</span>
                        </div>
                      </div>

                      <div className={`px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black font-mono border flex items-center gap-0.5 whitespace-nowrap ${
                        isUp ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                        isDown ? "text-sky-400 bg-sky-500/10 border-sky-500/20" :
                        "text-gray-400 bg-white/5 border-white/10"
                      }`}>
                        <span>{isUp ? '▲' : isDown ? '▼' : ''}</span>
                        <span>{isUp ? '+' : ''}{changePercent}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

      </div>

      {/* 4. 푸터: 실시간 상태 & 공식 데이터 출처 */}
      <div className="bg-zinc-950/90 border-t border-white/10 px-4 sm:px-5 py-3 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            {activeTab === "ranking" && "한국거래소(KRX) · 나스닥 실시간 거래대금 연동"}
            {activeTab === "search" && "국내 주요 포털 실시간 검색 트렌드 연동"}
            {activeTab === "crypto" && "업비트(Upbit) 국내 거래소 실시간 시세 연동"}
          </span>
        </div>
        <div className="text-gray-400 font-mono text-[10px] hidden sm:block">
          {lastUpdated ? `${lastUpdated.toLocaleTimeString('ko-KR', { hour12: false })} 갱신` : "실시간 동기화"}
        </div>
      </div>

    </div>
  );
}
