"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, ChevronLeft, 
  Flame, Bell, TrendingUp, ShieldAlert, Sparkles, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

interface TickerItem {
  id: string;
  type: "dart" | "whale" | "surge" | "news" | "market" | "portfolio";
  badge: string;
  badgeColor: string;
  headline: string; // 종목명 또는 속보 핵심 타이틀
  summary: string;  // 요약된 상세 내용 (수급, 금액, 등락률 등)
  targetUrl: string;
  timeAgo: string;
  symbol?: string;
}

const DEFAULT_ITEMS: TickerItem[] = [
  {
    id: "def-1",
    type: "dart",
    badge: "DART 공시",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    headline: "HD현대일렉트릭 (267260)",
    summary: "6,700억원 규모 북미 대형 전력변압기 공급계약 체결 (최근 매출액 대비 25.4%)",
    targetUrl: "/alerts",
    timeAgo: "방금 전",
  },
  {
    id: "def-2",
    type: "whale",
    badge: "큰손 매집",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    headline: "삼성전자 (005930)",
    summary: "외국인 120만주 · 기관 45만주 동시 순매수 유입 (주요 반도체 수급 집중)",
    targetUrl: "/signals?tab=supply",
    timeAgo: "1분 전",
  },
  {
    id: "def-3",
    type: "surge",
    badge: "AI 시그널",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    headline: "SK하이닉스 (000660)",
    summary: "20일선 골든크로스 발생 및 HBM 차세대 메모리 수요 모멘텀 감지",
    targetUrl: "/signals",
    timeAgo: "2분 전",
  },
  {
    id: "def-4",
    type: "portfolio",
    badge: "장마감 결산",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    headline: "국내 관심종목 결산",
    summary: "당일 관심종목 일일 평균 수익률 +1.8% 기록 · 외국인 순매수 지속",
    targetUrl: "/watchlist",
    timeAgo: "3분 전",
  },
  {
    id: "def-5",
    type: "market",
    badge: "장중 시황",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    headline: "글로벌 매크로",
    summary: "미국 연준 금리 인하 기대감에 코스피·코스닥 외국인 순매수세 확대",
    targetUrl: "/blog",
    timeAgo: "5분 전",
  },
];

export default function BloombergLiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(DEFAULT_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTickerData() {
      try {
        const fetchedItems: TickerItem[] = [];

        // 1. Firebase Firestore alerts 조회 및 풍부한 정보 추출
        try {
          const alertsRef = collection(db, "alerts");
          const q = query(alertsRef, orderBy("timestamp", "desc"), limit(12));
          const snap = await getDocs(q);

          snap.forEach((doc) => {
            const d = doc.data();
            const rawTitle = (d.title || "").trim();
            const rawBody = (d.body || "").trim();
            const fullText = `${rawTitle} ${rawBody}`;
            
            let badge = "실시간 속보";
            let badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
            let type: TickerItem["type"] = "news";
            let headline = "";
            let summary = "";

            // A. 포트폴리오 / 관심종목 결산 알림
            if (fullText.includes("관심종목 결산") || fullText.includes("포트폴리오") || d.type === "portfolio_summary") {
              badge = "장마감 결산";
              badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
              type = "portfolio";
              headline = rawTitle.replace(/\[.*?\]/g, "").replace(/💰|📉|📈/g, "").trim() || "내 관심종목 결산";
              
              if (rawBody) {
                summary = rawBody
                  .replace(/\(단순 집계.*?\)/g, "")
                  .split("\n")
                  .map(s => s.trim())
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(" · ");
              } else {
                summary = "국내 관심종목 당일 등락률 및 외국인·기관 수급 집계 완료";
              }
            } 
            // B. DART 전자공시
            else if (fullText.includes("공시") || d.dart_url || d.type === "disclosure") {
              badge = "DART 공시";
              badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/40";
              type = "dart";
              
              const cleanTitle = rawTitle.replace(/\[.*?\]/g, "").trim();
              if (cleanTitle.includes(" ")) {
                const parts = cleanTitle.split(" ");
                headline = parts[0];
                summary = parts.slice(1).join(" ") + (rawBody ? ` · ${rawBody.split("\n")[0]}` : "");
              } else {
                headline = cleanTitle || "상장사 공시";
                summary = rawBody ? rawBody.split("\n")[0] : "금융감독원 신규 전자공시 접수";
              }
            } 
            // C. 큰손 / 외국인 / 기관 수급
            else if (fullText.includes("외국인") || fullText.includes("세력") || fullText.includes("순매수") || d.type === "whale_alert") {
              badge = "큰손 매집";
              badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/40";
              type = "whale";
              const cleanTitle = rawTitle.replace(/\[.*?\]/g, "").trim();
              headline = cleanTitle.split(" ")[0] || "수급 집중주";
              summary = rawBody ? rawBody.split("\n")[0] : cleanTitle;
            } 
            // D. AI 시그널 / 급등락
            else if (fullText.includes("골든크로스") || fullText.includes("급등") || fullText.includes("신호") || fullText.includes("돌파")) {
              badge = "AI 시그널";
              badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";
              type = "surge";
              const cleanTitle = rawTitle.replace(/\[.*?\]/g, "").trim();
              headline = cleanTitle.split(" ")[0] || "AI 시그널";
              summary = rawBody ? rawBody.split("\n")[0] : cleanTitle;
            } 
            // E. 일반 시황
            else {
              badge = "장중 시황";
              badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
              type = "market";
              headline = rawTitle.replace(/\[.*?\]/g, "").trim() || "시장 속보";
              summary = rawBody ? rawBody.split("\n")[0] : "실시간 증시 주요 브리핑";
            }

            const symbol = d.symbol ? String(d.symbol).trim() : undefined;
            const targetUrl = symbol ? `/stock/${symbol}` : d.url || d.dart_url || "/alerts";

            if (!summary || summary === headline) {
              summary = rawBody ? rawBody.split("\n")[0] : "실시간 시장 데이터 동기화 완료";
            }

            if (summary.length > 85) {
              summary = summary.substring(0, 82) + "...";
            }

            fetchedItems.push({
              id: doc.id,
              type,
              badge,
              badgeColor,
              headline,
              summary,
              targetUrl,
              timeAgo: "방금 전",
              symbol,
            });
          });
        } catch (e) {
          // Firestore fallback silently
        }

        // 2. 백엔드 market scanner 공시 데이터 보강
        try {
          const res = await fetch(`${API_BASE_URL}/api/market/scanner`);
          if (res.ok) {
            const json = await res.json();
            if (json.status === "success" && json.data?.disclosures) {
              json.data.disclosures.slice(0, 5).forEach((d: any, idx: number) => {
                const titleStr = d.title || "";
                let headline = "DART 공시";
                let summary = titleStr;

                if (titleStr.includes(",")) {
                  const parts = titleStr.split(",");
                  headline = parts[0]?.trim() || "공시 속보";
                  summary = parts.slice(1).join(",").trim();
                } else if (titleStr.includes(" ")) {
                  const parts = titleStr.split(" ");
                  headline = parts[0]?.trim() || "공시 속보";
                  summary = parts.slice(1).join(" ").trim();
                }

                if (d.press) {
                  summary += ` (${d.press})`;
                }

                fetchedItems.push({
                  id: `disc-${idx}`,
                  type: "dart",
                  badge: "DART 공시",
                  badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                  headline,
                  summary,
                  targetUrl: d.link || "/alerts",
                  timeAgo: d.date ? d.date.split(" ")[1] || "실시간" : "실시간",
                });
              });
            }
          }
        } catch (e) {
          // Scanner fallback silently
        }

        if (isMounted && fetchedItems.length >= 2) {
          setItems(fetchedItems);
        }
      } catch (err) {
        console.error("Ticker load error", err);
      }
    }

    loadTickerData();
    const refreshTimer = setInterval(loadTickerData, 60000); // 1분마다 신규 속보 동기화
    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
    };
  }, []);

  // 5초마다 부드러운 롤링
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, items.length]);

  const currentItem = items[currentIndex] || DEFAULT_ITEMS[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div 
      className="relative w-full border-y border-emerald-500/25 bg-gradient-to-r from-black via-zinc-950 to-black text-white shadow-xl shadow-emerald-950/20 backdrop-blur-md overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 상단 미세 네온 라인 */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-5">
        {/* 좌측: 라이브 인디케이터 & 카테고리 배지 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-rose-500/15 border border-rose-500/35 text-rose-400 text-xs font-black tracking-wider shadow-sm shadow-rose-500/10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span>LIVE</span>
            <span className="hidden sm:inline text-rose-300 font-bold">속보</span>
          </div>

          <span className={`text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 transition-colors shadow-sm ${currentItem.badgeColor}`}>
            {currentItem.badge}
          </span>
        </div>

        {/* 중앙: 롤링 텍스트 영역 (종목명/헤드라인 + 상세 요약 정보 풍부화) */}
        <div className="flex-1 overflow-hidden min-w-0 min-h-[30px] sm:min-h-[34px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentIndex}-${currentItem.id}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full truncate"
            >
              <Link 
                href={currentItem.targetUrl}
                className="group flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2.5 hover:text-emerald-300 transition-colors w-full"
                title={`${currentItem.headline} - ${currentItem.summary}`}
              >
                {/* 1. 종목명 또는 헤드라인 (크고 뚜렷하게) */}
                <span className="text-xs sm:text-sm md:text-[15px] font-black text-white group-hover:text-amber-300 transition-colors shrink-0 flex items-center gap-1">
                  {currentItem.headline}
                </span>

                {/* 구분선 (데스크톱) */}
                <span className="hidden sm:inline text-gray-600 font-bold shrink-0">|</span>

                {/* 2. 상세 요약 정보 (금액, 수급, 등락률 등 무슨 내용인지 명확히 전달) */}
                <span className="text-[11px] sm:text-xs md:text-sm text-gray-200 group-hover:text-white transition-colors truncate font-medium">
                  {currentItem.summary}
                </span>

                {/* 타임스탬프 */}
                <span className="hidden xl:inline text-[11px] font-mono text-gray-500 shrink-0 ml-1">
                  · {currentItem.timeAgo}
                </span>
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 우측: 전체 속보 링크 및 이전/다음 컨트롤러 */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/alerts"
            className="hidden md:flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 transition-all shadow-sm"
          >
            <span>전체 속보</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-0.5 border border-white/10 rounded-lg bg-white/5 p-0.5">
            <button
              onClick={handlePrev}
              aria-label="이전 속보"
              className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
              title="이전 속보"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              aria-label="다음 속보"
              className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
              title="다음 속보"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 하단 은은한 네온 라인 */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
