"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bell,
  Sliders,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface SidecarGuardConfig {
  enabled: boolean;
  market_drop_threshold_pct: number;
  block_on_sell_sidecar: boolean;
  block_strategy_lab: boolean;
  daily_loss_limit_enabled: boolean;
  daily_loss_limit_pct: number;
  manual_lock: boolean;
  fcm_notify: boolean;
}

interface MarketSnapshot {
  overall_level: string;
  overall_badge: string;
  kospi200_fut_pct: number;
  kospi_pct: number;
  kosdaq_pct: number;
  sp500_pct: number;
  updated_time?: string;
}

interface SidecarGuardEval {
  buy_blocked: boolean;
  block_strategy_lab: boolean;
  trigger_code: string;
  triggers: string[];
  summary_text: string;
  today_pnl_krw: number;
  today_pnl_pct: number;
  seed_krw: number;
  config: SidecarGuardConfig;
  market_snapshot: MarketSnapshot;
}

interface SidecarEventLog {
  date: string;
  time: string;
  code: string;
  reason: string;
}

interface SidecarGuardApiPayload {
  market: {
    overall_level: string;
    overall_badge: string;
    headline: string;
    updated_time?: string;
  };
  guard: SidecarGuardEval;
  events: SidecarEventLog[];
  auto_trader_enabled: boolean;
  auto_trader_mode: string;
}

interface Props {
  ceoEmail?: string;
  adminKey?: string;
  compactDefault?: boolean;
}

export default function AccountSidecarControlPanel({
  ceoEmail,
  adminKey,
  compactDefault = false,
}: Props) {
  const [payload, setPayload] = useState<SidecarGuardApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compactDefault);
  const [didAutoExpand, setDidAutoExpand] = useState(false);

  const buildHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (adminKey) h["X-Admin-Key"] = adminKey;
    if (ceoEmail) h["X-CEO-Email"] = ceoEmail;
    return h;
  }, [adminKey, ceoEmail]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const fetchGuard = useCallback(async () => {
    if (!adminKey && !ceoEmail) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/sidecar-guard`, {
        headers: buildHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.status === "success" && json?.data) {
        setPayload(json.data);
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }, [adminKey, ceoEmail, buildHeaders]);

  useEffect(() => {
    fetchGuard();
    const timer = setInterval(fetchGuard, 20000);
    return () => clearInterval(timer);
  }, [fetchGuard]);

  // 비상 브레이크가 실제로 발동된 경우 compact 모드라도 자동 펼침
  useEffect(() => {
    if (!didAutoExpand && payload?.guard?.buy_blocked) {
      setExpanded(true);
      setDidAutoExpand(true);
    }
  }, [payload?.guard?.buy_blocked, didAutoExpand]);

  const patchConfig = async (patch: Partial<SidecarGuardConfig>, successText: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/sidecar-guard`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        showToast("⚠️ 설정 저장에 실패했습니다. 다시 시도해주세요.");
        return;
      }
      const json = await res.json();
      if (json?.status === "success" && json?.data) {
        setPayload(json.data);
        showToast(successText);
      }
    } catch {
      showToast("⚠️ 서버 연결 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-4 animate-pulse">
        <div className="h-5 w-72 bg-white/10 rounded-lg" />
      </div>
    );
  }

  if (!payload) return null;

  const { guard, market, events } = payload;
  const cfg = guard.config;
  const snap = guard.market_snapshot;
  const isBlocked = guard.buy_blocked;

  const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
  const pctClass = (v: number) =>
    v > 0 ? "text-rose-400" : v < 0 ? "text-sky-400" : "text-gray-400";

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 space-y-4 transition-all relative overflow-hidden ${
        isBlocked
          ? "bg-gradient-to-br from-rose-950/60 via-zinc-950/95 to-black border-rose-500/60 shadow-[0_0_32px_rgba(244,63,94,0.18)]"
          : "bg-gradient-to-br from-emerald-950/25 via-zinc-950/95 to-black border-emerald-500/35"
      }`}
    >
      {/* 저장 완료 토스트 */}
      {toastMsg && (
        <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/50 px-3.5 py-2 text-xs font-black text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. 상단 핵심 상태 바 (접혀 있어도 항상 즉시 파악 가능) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${
                isBlocked
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
              }`}
            >
              {isBlocked ? (
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>
                {isBlocked
                  ? "🚨 계좌 보호 사이드카 발동 중 (신규 매수 잠금)"
                  : "🛡️ 계좌 보호 사이드카 정상 감시 중"}
              </span>
            </span>

            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-gray-300">
              거래소: {market?.overall_badge || snap?.overall_badge}
            </span>

            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{snap?.updated_time || market?.updated_time || "-"}</span>
            </span>
          </div>

          {isBlocked && guard.triggers.length > 0 ? (
            <div className="space-y-1">
              {guard.triggers.map((t, i) => (
                <p key={i} className="text-xs font-bold text-rose-200 leading-snug">
                  • {t}
                </p>
              ))}
              <p className="text-[11px] text-amber-200/90 font-semibold">
                ✅ 신규 매수·물타기·전략랩 진입만 자동 차단되었습니다. 보유 종목의 익절·손절 방어 매도는 정상 작동합니다.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-300 font-mono">
              <span>
                선물 <b className={pctClass(snap.kospi200_fut_pct)}>{fmtPct(snap.kospi200_fut_pct)}</b>
              </span>
              <span>
                코스피 <b className={pctClass(snap.kospi_pct)}>{fmtPct(snap.kospi_pct)}</b>
              </span>
              <span>
                코스닥 <b className={pctClass(snap.kosdaq_pct)}>{fmtPct(snap.kosdaq_pct)}</b>
              </span>
              <span>
                S&amp;P500 <b className={pctClass(snap.sp500_pct)}>{fmtPct(snap.sp500_pct)}</b>
              </span>
              <span className="text-gray-500">|</span>
              <span>
                당일 손익{" "}
                <b className={pctClass(guard.today_pnl_pct)}>
                  {guard.today_pnl_krw >= 0 ? "+" : ""}
                  {guard.today_pnl_krw.toLocaleString()}원 ({fmtPct(guard.today_pnl_pct)})
                </b>
              </span>
            </div>
          )}
        </div>

        {/* 우측 원클릭 비상 버튼 + 펼치기 */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              patchConfig(
                { manual_lock: !cfg.manual_lock },
                !cfg.manual_lock
                  ? "🔒 대표님 수동 매수 사이드카를 즉시 발동했습니다. 모든 신규 매수가 잠겼습니다."
                  : "🔓 대표님 수동 매수 잠금을 해제했습니다."
              )
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-lg ${
              cfg.manual_lock
                ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/25"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25"
            }`}
          >
            {cfg.manual_lock ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>
              {cfg.manual_lock ? "수동 매수 잠금 해제" : "수동 매수 사이드카 발동"}
            </span>
          </button>

          <button
            type="button"
            onClick={fetchGuard}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="실시간 상태 새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-300" />
            <span>{expanded ? "규칙 접기" : "세부 규칙 설정"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. 펼쳐진 세부 연동 도식 & 제어 패널 */}
      {expanded && (
        <div className="space-y-4 pt-3 border-t border-white/10">
          {/* 거래소 경보 ➔ 자동매매 브레이크 실시간 연결 상태 바 */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2.5 bg-black/50 border border-white/10 rounded-xl p-3.5">
            <div className="space-y-1">
              <div className="text-[11px] font-black text-gray-400">
                ① 거래소 실시간 사이드카 레이더
              </div>
              <div className="text-xs font-black text-white">{market?.overall_badge}</div>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span>
                  선물 <b className={pctClass(snap.kospi200_fut_pct)}>{fmtPct(snap.kospi200_fut_pct)}</b>
                </span>
                <span>
                  코스피 <b className={pctClass(snap.kospi_pct)}>{fmtPct(snap.kospi_pct)}</b>
                </span>
                <span>
                  코스닥 <b className={pctClass(snap.kosdaq_pct)}>{fmtPct(snap.kosdaq_pct)}</b>
                </span>
                <span>
                  S&amp;P500 <b className={pctClass(snap.sp500_pct)}>{fmtPct(snap.sp500_pct)}</b>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                  cfg.enabled
                    ? isBlocked
                      ? "bg-rose-500/20 border-rose-400/50 text-rose-200"
                      : "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                    : "bg-zinc-800 border-white/10 text-gray-400"
                }`}
              >
                <span>{cfg.enabled ? "자동 연동 ON" : "자동 연동 OFF"}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-black text-gray-400">
                ② 대표님 자동매매 · 전략랩 비상 브레이크
              </div>
              <div className={`text-xs font-black ${isBlocked ? "text-rose-300" : "text-emerald-300"}`}>
                {isBlocked
                  ? "🔒 신규 매수·추매 전면 차단 (익절·손절은 유지)"
                  : "🟢 신규 매수 허용 · 실시간 급락 방어 대기"}
              </div>
              <div className="text-[11px] text-gray-400 font-mono">
                당일 손익:{" "}
                <b className={pctClass(guard.today_pnl_pct)}>
                  {guard.today_pnl_krw >= 0 ? "+" : ""}
                  {guard.today_pnl_krw.toLocaleString()}원 ({fmtPct(guard.today_pnl_pct)})
                </b>
                {" · "}전략랩 차단: <b>{cfg.block_strategy_lab ? "동시 잠금" : "개별 허용"}</b>
              </div>
            </div>
          </div>

          {/* 3. 세부 방어 규칙 스위치 & 임계치 설정 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 좌측: 시장 연동 급락 차단 */}
            <div className="rounded-xl bg-zinc-900/80 border border-white/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-white">
                    📉 시장 급락 · 매도 사이드카 자동 연동 차단
                  </div>
                  <p className="text-[11px] text-gray-400">
                    선물·코스피·코스닥·S&amp;P500이 설정 기준 이하로 급락하면 신규 매수를 즉시 멈춥니다.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    patchConfig(
                      { enabled: !cfg.enabled },
                      !cfg.enabled
                        ? "✅ 시장 급락 자동 연동 차단을 켰습니다."
                        : "⚠️ 시장 급락 자동 연동 차단을 껐습니다."
                    )
                  }
                  className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                    cfg.enabled
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-zinc-800 text-gray-400 border border-white/10"
                  }`}
                >
                  {cfg.enabled ? "ON" : "OFF"}
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-300">
                  시장 급락 자동 차단 기준 (현재: -{cfg.market_drop_threshold_pct.toFixed(1)}%)
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[2.5, 3.5, 5.0, 7.0].map((v) => {
                    const active = Math.abs(cfg.market_drop_threshold_pct - v) < 0.05;
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          patchConfig(
                            { market_drop_threshold_pct: v },
                            `✅ 시장 급락 매수 차단 기준을 -${v.toFixed(1)}%로 저장했습니다.`
                          )
                        }
                        className={`py-1.5 rounded-lg text-[11px] font-black font-mono transition-all cursor-pointer ${
                          active
                            ? "bg-amber-400 text-slate-950 shadow-sm"
                            : "bg-black/50 text-gray-300 border border-white/10 hover:border-amber-400/50"
                        }`}
                      >
                        -{v.toFixed(1)}%{v === 3.5 ? "★" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                <span className="text-[11px] font-bold text-gray-300">
                  🚨 거래소 매도 사이드카(-5%)·서킷브레이커 즉시 잠금
                </span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    patchConfig(
                      { block_on_sell_sidecar: !cfg.block_on_sell_sidecar },
                      !cfg.block_on_sell_sidecar
                        ? "✅ 거래소 매도 사이드카 즉시 연동을 켰습니다."
                        : "거래소 매도 사이드카 즉시 연동을 껐습니다."
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer shrink-0 ${
                    cfg.block_on_sell_sidecar
                      ? "bg-rose-500/25 text-rose-200 border border-rose-400/40"
                      : "bg-zinc-800 text-gray-400 border border-white/10"
                  }`}
                >
                  {cfg.block_on_sell_sidecar ? "연동 ON" : "연동 OFF"}
                </button>
              </div>
            </div>

            {/* 우측: 일일 계좌 손실 한도 & 전략랩/알림 연동 */}
            <div className="rounded-xl bg-zinc-900/80 border border-white/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-white">
                    💸 일일 계좌 최대 손실 서킷브레이커
                  </div>
                  <p className="text-[11px] text-gray-400">
                    하루 누적 손실이 설정 한도에 닿으면 당일 추가 매수를 자동 중단합니다.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    patchConfig(
                      { daily_loss_limit_enabled: !cfg.daily_loss_limit_enabled },
                      !cfg.daily_loss_limit_enabled
                        ? "✅ 일일 최대 손실 서킷브레이커를 켰습니다."
                        : "⚠️ 일일 최대 손실 서킷브레이커를 껐습니다."
                    )
                  }
                  className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                    cfg.daily_loss_limit_enabled
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-zinc-800 text-gray-400 border border-white/10"
                  }`}
                >
                  {cfg.daily_loss_limit_enabled ? "ON" : "OFF"}
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-300">
                  일일 손실 한도 (현재: -{cfg.daily_loss_limit_pct.toFixed(1)}%)
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[2.0, 3.5, 5.0].map((v) => {
                    const active = Math.abs(cfg.daily_loss_limit_pct - v) < 0.05;
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          patchConfig(
                            { daily_loss_limit_pct: v },
                            `✅ 일일 최대 손실 한도를 -${v.toFixed(1)}%로 저장했습니다.`
                          )
                        }
                        className={`py-1.5 rounded-lg text-[11px] font-black font-mono transition-all cursor-pointer ${
                          active
                            ? "bg-amber-400 text-slate-950 shadow-sm"
                            : "bg-black/50 text-gray-300 border border-white/10 hover:border-amber-400/50"
                        }`}
                      >
                        -{v.toFixed(1)}%{v === 3.5 ? "★" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    patchConfig(
                      { block_strategy_lab: !cfg.block_strategy_lab },
                      !cfg.block_strategy_lab
                        ? "✅ AI 전략랩(가상/실전) 신규 매수도 동시 잠금하도록 설정했습니다."
                        : "AI 전략랩 동시 잠금을 해제했습니다."
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer border ${
                    cfg.block_strategy_lab
                      ? "bg-violet-500/20 text-violet-200 border-violet-400/40"
                      : "bg-zinc-800 text-gray-400 border-white/10"
                  }`}
                >
                  🧪 전략랩 동시 차단: {cfg.block_strategy_lab ? "ON" : "OFF"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    patchConfig(
                      { fcm_notify: !cfg.fcm_notify },
                      !cfg.fcm_notify
                        ? "📲 발동 시 스마트폰 FCM 긴급 푸시 알림을 켰습니다."
                        : "스마트폰 FCM 긴급 푸시 알림을 껐습니다."
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer border ${
                    cfg.fcm_notify
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                      : "bg-zinc-800 text-gray-400 border-white/10"
                  }`}
                >
                  <Bell className="w-3 h-3" />
                  <span>스마트폰 푸시: {cfg.fcm_notify ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. 최근 비상 브레이크 발동 / 해제 이력 */}
          {events && events.length > 0 && (
            <div className="rounded-xl bg-black/45 border border-white/10 p-3 space-y-1.5">
              <div className="text-[11px] font-black text-amber-300">
                📋 최근 계좌 보호 사이드카 발동 · 제어 이력 ({events.length}건)
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {events.slice(0, 6).map((ev, i) => (
                  <div
                    key={`${ev.date}-${ev.time}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-2 text-[11px] py-1 border-b border-white/5 last:border-b-0"
                  >
                    <span className="text-gray-200 font-medium">{ev.reason}</span>
                    <span className="text-[10px] font-mono text-gray-500 shrink-0">
                      {ev.date} {ev.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
