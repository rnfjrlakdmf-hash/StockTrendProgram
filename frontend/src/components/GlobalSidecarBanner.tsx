"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldAlert, X, ArrowRight, Flame } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth, isAdminEmail } from "@/context/AuthContext";

interface SidecarBannerData {
  updated_at?: string;
  updated_time?: string;
  overall_level: string;
  overall_badge: string;
  banner_active: boolean;
  headline: string;
  sub_guide?: string;
  account_brake_active?: boolean;
}

export default function GlobalSidecarBanner() {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [data, setData] = useState<SidecarBannerData | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string>("");

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market/sidecar-status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (active && json?.status === "success" && json?.data) {
          setData(json.data);
        }
      } catch {
        // 네트워크 일시 오류 시 조용히 무시 (정상 화면 방해 금지)
      }
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!data?.banner_active) return;
    try {
      const dateKey = (data.updated_at || "").slice(0, 10) || "today";
      const key = `sidecar_banner_dismissed_${data.overall_level}_${dateKey}`;
      if (sessionStorage.getItem(key) === "1") {
        setDismissedKey(key);
      }
    } catch {
      // ignore storage errors
    }
  }, [data?.banner_active, data?.overall_level, data?.updated_at]);

  // 평상시(NORMAL, WATCH)에는 완전히 렌더링하지 않아 화면 및 애드센스 정책 100% 보호
  if (!data || !data.banner_active) {
    return null;
  }

  const dateKey = (data.updated_at || "").slice(0, 10) || "today";
  const currentKey = `sidecar_banner_dismissed_${data.overall_level}_${dateKey}`;
  if (dismissedKey === currentKey) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedKey(currentKey);
    try {
      sessionStorage.setItem(currentKey, "1");
    } catch {
      // ignore
    }
  };

  const level = data.overall_level;
  const isCritical = level === "CIRCUIT_BREAKER" || level === "SELL_SIDECAR";
  const isBuySidecar = level === "BUY_SIDECAR";

  const wrapperStyle = isCritical
    ? "bg-gradient-to-r from-rose-950/95 via-red-950/95 to-rose-950/95 border-b border-rose-500/50 text-rose-50"
    : isBuySidecar
      ? "bg-gradient-to-r from-orange-950/95 via-amber-950/95 to-orange-950/95 border-b border-orange-400/50 text-orange-50"
      : "bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-amber-950/95 border-b border-amber-400/50 text-amber-50";

  const badgeStyle = isCritical
    ? "bg-rose-500 text-white shadow-sm shadow-rose-500/40"
    : isBuySidecar
      ? "bg-orange-500 text-white shadow-sm shadow-orange-500/40"
      : "bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/40";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full relative z-30 backdrop-blur-md transition-all ${wrapperStyle}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${badgeStyle}`}
          >
            {isCritical ? (
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            ) : isBuySidecar ? (
              <Flame className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>{data.overall_badge}</span>
          </span>

          <p className="text-xs sm:text-[13px] font-bold leading-snug truncate sm:whitespace-normal">
            {data.headline}
          </p>

          {isAdmin && data.account_brake_active && (
            <Link
              href="/admin/auto-trade"
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/45 border border-rose-400/50 text-rose-200 hover:text-white text-[11px] font-black shrink-0 transition-colors"
            >
              <span>🛡️ 내 자동매매 매수 잠금 가동 중</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Link
            href="/#sidecar-radar"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-black text-white transition-all"
          >
            <span>상세 레이더 보기</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="경보 배너 닫기"
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
