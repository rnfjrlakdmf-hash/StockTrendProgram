"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, ChevronLeft, 
  Flame, Bell, TrendingUp, ShieldAlert, Sparkles
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

interface TickerItem {
  id: string;
  type: "dart" | "whale" | "surge" | "news" | "market";
  badge: string;
  badgeColor: string;
  title: string;
  targetUrl: string;
  timeAgo: string;
  symbol?: string;
}

const DEFAULT_ITEMS: TickerItem[] = [
  {
    id: "def-1",
    type: "dart",
    badge: "DART 공시",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    title: "[공시 속보] 주요 상장사 공급계약 및 단일판매 계약 체결 공시",
    targetUrl: "/alerts",
    timeAgo: "방금 전",
  },
  {
    id: "def-2",
    type: "whale",
    badge: "세력 포착",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    title: "[외인 순매수] 코스피 핵심 주도주 외국인·기관 대량 순매수 유입 포착",
    targetUrl: "/signals?tab=supply",
    timeAgo: "1분 전",
  },
  {
    id: "def-3",
    type: "surge",
    badge: "AI 시그널",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    title: "[골든크로스] 20일 이동평균선 상향 돌파 기술적 급등 유망 종목 포착",
    targetUrl: "/signals",
    timeAgo: "2분 전",
  },
  {
    id: "def-4",
    type: "market",
    badge: "증시 시황",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    title: "[시장 브리핑] 글로벌 증시 훈풍에 국내 증시 주요 섹터 매수세 확대",
    targetUrl: "/blog",
    timeAgo: "3분 전",
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

        // 1. Firebase Firestore alerts 조회
        try {
          const alertsRef = collection(db, "alerts");
          const q = query(alertsRef, orderBy("timestamp", "desc"), limit(8));
          const snap = await getDocs(q);

          snap.forEach((doc) => {
            const d = doc.data();
            const text = `${d.title || ""} ${d.body || ""}`;
            
            let badge = "실시간 속보";
            let badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
            let type: TickerItem["type"] = "news";

            if (text.includes("공시") || d.dart_url || d.type === "disclosure") {
              badge = "DART 공시";
              badgeColor = "bg-blue-500/20 text-blue-400 border-blue-500/40";
              type = "dart";
            } else if (text.includes("외국인") || text.includes("세력") || text.includes("순매수") || d.type === "whale_alert") {
              badge = "세력 포착";
              badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/40";
              type = "whale";
            } else if (text.includes("골든크로스") || text.includes("급등") || text.includes("신호")) {
              badge = "AI 시그널";
              badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";
              type = "surge";
            } else if (text.includes("시황") || text.includes("브리핑")) {
              badge = "장중 시황";
              badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
              type = "market";
            }

            const title = (d.title || d.body || "실시간 알림").replace(/\[.*?\]/g, "").trim();
            const symbol = d.symbol ? String(d.symbol).trim() : undefined;
            const targetUrl = symbol ? `/stock/${symbol}` : d.dart_url || "/alerts";

            fetchedItems.push({
              id: doc.id,
              type,
              badge,
              badgeColor,
              title: title.length > 55 ? title.substring(0, 52) + "..." : title,
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
              json.data.disclosures.slice(0, 4).forEach((d: any, idx: number) => {
                fetchedItems.push({
                  id: `disc-${idx}`,
                  type: "dart",
                  badge: "시장 속보",
                  badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
                  title: d.title,
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

  // 4.5초마다 롤링
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4500);

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
      className="relative w-full border-y border-emerald-500/20 bg-gradient-to-r from-black via-slate-950/95 to-black text-white shadow-xl shadow-emerald-950/10 backdrop-blur-md overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* 좌측: 라이브 인디케이터 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] sm:text-xs font-black tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>LIVE</span>
            <span className="hidden md:inline text-rose-300/70 font-medium">속보</span>
          </div>

          <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${currentItem.badgeColor}`}>
            {currentItem.badge}
          </span>
        </div>

        {/* 중앙: 롤링 텍스트 영역 */}
        <div className="flex-1 overflow-hidden min-w-0 h-6 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentIndex}-${currentItem.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full truncate"
            >
              <Link 
                href={currentItem.targetUrl}
                className="group flex items-center gap-2 hover:text-emerald-300 transition-colors w-full"
                title={currentItem.title}
              >
                <span className="text-xs sm:text-sm font-semibold text-gray-100 group-hover:text-emerald-300 transition-colors truncate">
                  {currentItem.title}
                </span>
                <span className="hidden lg:inline text-[11px] text-gray-500 shrink-0">
                  {currentItem.timeAgo}
                </span>
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 우측: 컨트롤 버튼 및 전체보기 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs">
          <Link
            href="/alerts"
            className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md border border-emerald-500/30 transition-colors"
          >
            <span>전체 속보</span>
            <ChevronRight className="w-3 h-3" />
          </Link>

          <div className="flex items-center gap-0.5 border border-white/10 rounded-md bg-white/5 p-0.5">
            <button
              onClick={handlePrev}
              aria-label="이전 속보"
              className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={handleNext}
              aria-label="다음 속보"
              className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}
