"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Clock,
  AlertTriangle,
  Lock,
  Activity,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth, isAdminEmail } from "@/context/AuthContext";

interface MarketGaugeItem {
  key: string;
  name: string;
  flag: string;
  price: number;
  price_str: string;
  change_val: number;
  change_pct: number;
  market_open: boolean;
  market_status: string;
  direction: "UP" | "DOWN" | "FLAT";
  level: string;
  badge: string;
  sidecar_threshold_pct: number | null;
  cb_levels: number[];
  next_trigger_label: string;
  distance_to_trigger_pct: number;
  gauge_pct: number;
  rule_desc: string;
}

interface BeginnerGuideItem {
  title: string;
  desc: string;
}

interface SidecarHistoryItem {
  date: string;
  time: string;
  level: string;
  badge: string;
  market: string;
  change_pct: number;
  headline: string;
}

interface SidecarStatusPayload {
  updated_at: string;
  updated_time: string;
  overall_level: string;
  overall_badge: string;
  banner_active: boolean;
  headline: string;
  sub_guide: string;
  top_alert_market: string;
  markets: MarketGaugeItem[];
  history: SidecarHistoryItem[];
  beginner_guide: BeginnerGuideItem[];
  account_brake_active?: boolean;
}

export default function MarketSidecarRadar() {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  const [data, setData] = useState<SidecarStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);

  const fetchRadar = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      const url = forceRefresh
        ? `${API_BASE_URL}/api/market/sidecar-status?refresh=true`
        : `${API_BASE_URL}/api/market/sidecar-status`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.status === "success" && json?.data) {
        setData(json.data);
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRadar(false);
    const timer = setInterval(() => fetchRadar(false), 20000);
    return () => clearInterval(timer);
  }, [fetchRadar]);

  // 실제 사이드카/서킷브레이커 경보 시 초보자 해설을 한 번 자동 펼쳐서 즉시 대응 원칙 안내
  useEffect(() => {
    if (
      !hasAutoExpanded &&
      data &&
      (data.overall_level === "SELL_SIDECAR" ||
        data.overall_level === "CIRCUIT_BREAKER" ||
        data.overall_level === "BUY_SIDECAR")
    ) {
      setShowGuide(true);
      setHasAutoExpanded(true);
    }
  }, [data, hasAutoExpanded]);

  if (loading) {
    return (
      <section
        id="sidecar-radar"
        className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 sm:p-5 animate-pulse space-y-4"
      >
        <div className="h-5 w-64 bg-white/10 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 rounded-xl bg-white/5 border border-white/5" />
          ))}
        </div>
      </section>
    );
  }

  if (!data) return null;

  const level = data.overall_level;
  const isCritical = level === "CIRCUIT_BREAKER" || level === "SELL_SIDECAR";
  const isImminent = level === "IMMINENT";
  const isBuySidecar = level === "BUY_SIDECAR";
  const isWatch = level === "WATCH";

  const containerTheme = isCritical
    ? "bg-gradient-to-b from-rose-950/55 via-zinc-950/95 to-zinc-950/95 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)]"
    : isBuySidecar
      ? "bg-gradient-to-b from-orange-950/45 via-zinc-950/95 to-zinc-950/95 border-orange-400/45"
      : isImminent
        ? "bg-gradient-to-b from-amber-950/45 via-zinc-950/95 to-zinc-950/95 border-amber-400/45"
        : isWatch
          ? "bg-gradient-to-b from-yellow-950/25 via-zinc-950/95 to-zinc-950/95 border-yellow-500/30"
          : "bg-zinc-900/75 border-white/10";

  const statusPillTheme = isCritical
    ? "bg-rose-500 text-white shadow-sm shadow-rose-500/40"
    : isBuySidecar
      ? "bg-orange-500 text-white"
      : isImminent
        ? "bg-amber-400 text-slate-950"
        : isWatch
          ? "bg-yellow-500/20 text-yellow-300 border border-yellow-400/40"
          : "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30";

  const getGaugeBarColor = (m: MarketGaugeItem) => {
    if (m.level.startsWith("CIRCUIT_BREAKER") || m.level === "SELL_SIDECAR") {
      return "bg-gradient-to-r from-rose-600 to-red-400";
    }
    if (m.level === "BUY_SIDECAR") {
      return "bg-gradient-to-r from-orange-500 to-amber-400";
    }
    if (m.level.startsWith("IMMINENT") || m.gauge_pct >= 70) {
      return "bg-gradient-to-r from-amber-500 to-yellow-400";
    }
    if (m.change_pct < 0) {
      return "bg-gradient-to-r from-sky-500 to-blue-400";
    }
    if (m.change_pct > 0) {
      return "bg-gradient-to-r from-rose-400 to-pink-400";
    }
    return "bg-emerald-500/70";
  };

  const getCardBorder = (m: MarketGaugeItem) => {
    if (m.level.startsWith("CIRCUIT_BREAKER") || m.level === "SELL_SIDECAR") {
      return "border-rose-500/55 bg-rose-950/25";
    }
    if (m.level === "BUY_SIDECAR") {
      return "border-orange-400/50 bg-orange-950/20";
    }
    if (m.level.startsWith("IMMINENT")) {
      return "border-amber-400/45 bg-amber-950/20";
    }
    return "border-white/10 bg-black/40 hover:border-white/20";
  };

  return (
    <section
      id="sidecar-radar"
      className={`rounded-2xl border p-4 sm:p-5 space-y-4 transition-all scroll-mt-20 ${containerTheme}`}
    >
      {/* 1. 헤더 영역 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-black text-white tracking-tight">
              {isCritical ? (
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 animate-pulse" />
              ) : isImminent ? (
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              )}
              <span>한·미 실시간 사이드카 · 서킷브레이커 경보 레이더</span>
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${statusPillTheme}`}
            >
              {data.overall_badge}
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            <strong className="text-white">{data.headline}</strong>
            {data.sub_guide ? ` — ${data.sub_guide}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <Link
              href="/admin/auto-trade"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                data.account_brake_active
                  ? "bg-rose-500/20 border-rose-400/50 text-rose-200 hover:bg-rose-500/30"
                  : "bg-emerald-500/15 border-emerald-400/35 text-emerald-300 hover:bg-emerald-500/25"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {data.account_brake_active
                  ? "자동매매 비상 브레이크 발동 중 · 제어"
                  : "자동매매 비상 브레이크 정상 감시"}
              </span>
            </Link>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-400 font-mono">
            <Clock className="w-3 h-3 text-gray-500" />
            <span>{data.updated_time || "-"}</span>
          </div>

          <button
            type="button"
            onClick={() => fetchRadar(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            title="실시간 지수 새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>갱신</span>
          </button>
        </div>
      </div>

      {/* 2. 4대 핵심 시장 실시간 게이지 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(data.markets || []).map((m) => {
          const isUp = m.change_pct > 0;
          const isDown = m.change_pct < 0;
          // 한국 증시 표준 색상: 상승 = 빨강(rose), 하락 = 파랑(sky)
          const pctColor = isUp
            ? "text-rose-400"
            : isDown
              ? "text-sky-400"
              : "text-gray-400";
          const arrowChar = isUp ? "▲" : isDown ? "▼" : "•";
          const pctText = `${arrowChar} ${m.change_pct > 0 ? "+" : ""}${m.change_pct.toFixed(2)}%`;

          return (
            <div
              key={m.key}
              className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 transition-all ${getCardBorder(m)}`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-black text-white flex items-center gap-1.5 truncate">
                    <span>{m.flag}</span>
                    <span>{m.name}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      m.market_open
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-white/5 text-gray-400 border border-white/10"
                    }`}
                  >
                    {m.market_open ? "장중" : "마감/집계"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-black text-white font-mono tracking-tight">
                    {m.price_str}
                  </span>
                  <span className={`text-sm font-black font-mono ${pctColor}`}>
                    {pctText}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-gray-200 truncate" title={m.badge}>
                  {m.badge}
                </div>
              </div>

              {/* 발동 기준 근접도 프로그레스 바 */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-gray-400 truncate pr-1">{m.next_trigger_label}</span>
                  <span
                    className={`font-mono shrink-0 ${
                      m.distance_to_trigger_pct <= 0
                        ? "text-rose-300 font-black"
                        : m.distance_to_trigger_pct <= 1.5
                          ? "text-amber-300"
                          : "text-gray-300"
                    }`}
                  >
                    {m.distance_to_trigger_pct <= 0
                      ? "기준 돌파!"
                      : `${m.distance_to_trigger_pct.toFixed(2)}%p 남음`}
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-zinc-800/90 overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getGaugeBarColor(m)}`}
                    style={{ width: `${Math.max(4, Math.min(100, m.gauge_pct || 0))}%` }}
                  />
                </div>

                <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">
                  {m.rule_desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. 초보자 3초 해설 & 최근 경보 이력 (접이식) */}
      <div className="border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => setShowGuide((prev) => !prev)}
          className="w-full flex items-center justify-between gap-2 text-left text-xs font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>초보자 3초 해설: 매도 사이드카 · 서킷브레이커 발동 기준과 대처 원칙</span>
            {data.history && data.history.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-black">
                최근 경보 {data.history.length}건
              </span>
            )}
          </span>
          {showGuide ? (
            <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          )}
        </button>

        {showGuide && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {(data.beginner_guide || []).map((g, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-black/45 border border-white/10 p-3 space-y-1"
                >
                  <div className="text-xs font-black text-amber-300">{g.title}</div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>

            {data.history && data.history.length > 0 && (
              <div className="rounded-xl bg-black/45 border border-rose-500/20 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-300">
                  <Activity className="w-3.5 h-3.5" />
                  <span>최근 사이드카 · 서킷브레이커 경보 감지 이력</span>
                </div>
                <div className="space-y-1.5">
                  {data.history.slice(0, 5).map((h, i) => (
                    <div
                      key={`${h.date}-${h.time}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 text-[11px] py-1 border-b border-white/5 last:border-b-0"
                    >
                      <span className="text-gray-200 font-medium">{h.headline}</span>
                      <span className="text-gray-500 font-mono text-[10px] shrink-0">
                        {h.date} {h.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
