"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import Header from "@/components/Header";
import {
  Bot,
  Power,
  Zap,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Activity,
  RotateCcw,
  Trash2,
} from "lucide-react";

const ADMIN_KEY = "StockTrendSecretAdmin2026!";

export default function AdminAutoTradePage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showKisModal, setShowKisModal] = useState(false);

  // 설정 폼 상태
  const [mode, setMode] = useState("AI_PAPER");
  const [marketTarget, setMarketTarget] = useState("KR");
  const [maxTotalInvestKrw, setMaxTotalInvestKrw] = useState(10000000);
  const [orderAmountKrw, setOrderAmountKrw] = useState(2000000);
  const [maxPositions, setMaxPositions] = useState(5);
  const [takeProfitPct, setTakeProfitPct] = useState(4.0);
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [autoAveragingDown, setAutoAveragingDown] = useState(true);
  const [stopLossPct, setStopLossPct] = useState(2.5);
  const [trailingStopPct, setTrailingStopPct] = useState(1.2);
  const [kisOrderEnabled, setKisOrderEnabled] = useState(true);
  const [kisAppKey, setKisAppKey] = useState("");
  const [kisAppSecret, setKisAppSecret] = useState("");
  const [kisAccountNo, setKisAccountNo] = useState("");

  // [철통 보안] 대표님 관리자 이메일(rnfjr@gmail.com / rnfjrlakdmf@gmail.com) 외 접근 원천 차단
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push("/");
      } else {
        const email = currentUser.email?.toLowerCase();
        if (email !== "rnfjr@gmail.com" && email !== "rnfjrlakdmf@gmail.com") {
          alert("🛑 접근 권한이 없습니다. 대표님 전용 비밀 페이지입니다.");
          router.push("/");
        }
      }
    }
  }, [currentUser, authLoading, router]);

  const syncFormFromConfig = (cfg: any) => {
    if (!cfg) return;
    setMode(cfg.mode || "AI_PAPER");
    setMarketTarget(cfg.market_target || "KR");
    setMaxTotalInvestKrw(Number(cfg.max_total_invest_krw ?? 10000000));
    setOrderAmountKrw(Number(cfg.order_amount_krw || 2000000));
    setMaxPositions(Number(cfg.max_positions || 5));
    setTakeProfitPct(Number(cfg.take_profit_pct || 4.0));
    setUseStopLoss(Boolean(cfg.use_stop_loss ?? false));
    setAutoAveragingDown(Boolean(cfg.auto_averaging_down ?? true));
    setStopLossPct(Number(cfg.stop_loss_pct || 2.5));
    setTrailingStopPct(Number(cfg.trailing_stop_pct || 1.2));
    setKisOrderEnabled(Boolean(cfg.kis_order_enabled ?? true));
    setKisAppKey(cfg.kis_app_key || "");
    setKisAppSecret(cfg.kis_app_secret || "");
    setKisAccountNo(cfg.kis_account_no || "");
  };

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/status`, {
        headers: { "X-Admin-Key": ADMIN_KEY },
      });
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setData(json.data);
        if (!silent) syncFormFromConfig(json.data.config);
      }
    } catch (e) {
      console.error("AutoTrader status error:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchStatus(false);
      const timer = setInterval(() => fetchStatus(true), 5000);
      return () => clearInterval(timer);
    }
  }, [authLoading, currentUser, fetchStatus]);

  const handleToggleBot = async () => {
    if (!data?.config) return;
    setActionLoading(true);
    try {
      const nextEnabled = !data.config.enabled;
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleKisOrder = async () => {
    setActionLoading(true);
    try {
      const nextVal = !kisOrderEnabled;
      setKisOrderEnabled(nextVal);
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({ kis_order_enabled: nextVal }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({
          mode,
          market_target: marketTarget,
          max_total_invest_krw: Number(maxTotalInvestKrw),
          order_amount_krw: Number(orderAmountKrw),
          max_positions: Number(maxPositions),
          take_profit_pct: Number(takeProfitPct),
          use_stop_loss: Boolean(useStopLoss),
          auto_averaging_down: Boolean(autoAveragingDown),
          stop_loss_pct: Number(stopLossPct),
          trailing_stop_pct: Number(trailingStopPct),
          kis_order_enabled: Boolean(kisOrderEnabled),
          kis_app_key: kisAppKey,
          kis_app_secret: kisAppSecret,
          kis_account_no: kisAccountNo,
        }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
        alert("✅ 자동매매 로봇 전략 및 계좌 설정이 저장되었습니다!");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunCycleNow = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/run-cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({ force_buy: true }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleClosePosition = async (symbol: string, name: string) => {
    if (!confirm(`[${name}] 보유 물량을 지금 즉시 시장가로 전량 매도하시겠습니까?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/close-position`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({ symbol }),
      });
      const json = await res.json();
      if (json.status === "success") setData(json.data);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePanicSell = async () => {
    if (!confirm("🚨 [긴급 킬스위치]\n보유 중인 모든 종목을 즉시 시장가로 전량 매도하고 자동매매 봇을 일시정지하시겠습니까?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/panic-sell`, {
        method: "POST",
        headers: { "X-Admin-Key": ADMIN_KEY },
      });
      const json = await res.json();
      if (json.status === "success") setData(json.data);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPaper = async () => {
    if (!confirm("가상 계좌 시드머니를 1,000만 원으로 초기화하고 즉시 새 포트폴리오 매수를 시작하시겠습니까?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/reset-paper`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({ initial_capital_krw: 10000000 }),
      });
      const json = await res.json();
      if (json.status === "success") setData(json.data);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-sm font-bold text-gray-300">대표님 전용 AI 자동매매 사령부 접속 중...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const cfg = data?.config || {};
  const positions = data?.positions || [];
  const candidates = data?.candidates || [];
  const tradeLogs = data?.trade_logs || [];

  return (
    <div className="min-h-screen bg-[#06070a] text-white pb-24">
      <Header />

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-6">
        {/* 상단 헤더 & 마스터 스위치 */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-950/50 via-zinc-900/95 to-black border border-emerald-500/30 p-4 sm:p-7 shadow-2xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => router.push("/admin")}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> 관리자 홈
                </button>
                <button
                  onClick={() => router.push("/alerts?tab=auto_trade")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-black flex items-center gap-1"
                >
                  🔔 자동매매 알림탭 열기
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/test-fcm`, { method: "POST" });
                      const d = await res.json();
                      alert(d.message || "대표님 계정으로 자동매매 FCM 푸시 알림을 발송했습니다!");
                    } catch {
                      alert("FCM 테스트 요청 실패");
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1"
                >
                  📲 내 폰으로 FCM 알림 테스트
                </button>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black">
                  👑 대표님 단독 전용 (일반 회원 비공개)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 pt-1">
                <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                24시간 무인 AI 자동매매 사령부
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                우리 서버 AI가 24시간 수급·공시·차트 지지선을 분석해 혼자서 종목을 고르고 자동 매수·익절·손절까지 수행합니다.
              </p>
            </div>

            {/* 마스터 컨트롤 버튼 그룹 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleToggleBot}
                disabled={actionLoading}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg ${
                  cfg.enabled
                    ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/25"
                    : "bg-zinc-800 text-gray-300 hover:bg-zinc-700 border border-white/10"
                }`}
              >
                <Power className="w-4 h-4" />
                {cfg.enabled ? "🟢 로봇 자동매매 가동 중 (ON)" : "⚪ 로봇 일시정지됨 (OFF)"}
              </button>

              <button
                onClick={handleRunCycleNow}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/25"
              >
                <Zap className="w-4 h-4" />
                지금 즉시 종목 발굴 &amp; 매매 실행
              </button>

              <button
                onClick={handlePanicSell}
                disabled={actionLoading || positions.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white font-black text-xs sm:text-sm transition-all disabled:opacity-40"
              >
                <ShieldAlert className="w-4 h-4" />
                전량 즉시 매도(킬스위치)
              </button>
            </div>
          </div>

          {/* 5대 핵심 계좌 자산 전광판 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
              <div className="text-[11px] text-gray-400 font-bold">총 운용 자산 (평가액+현금)</div>
              <div className="text-lg sm:text-xl font-black text-white font-mono mt-1">
                ₩{(summary.total_equity_krw || 0).toLocaleString()}
              </div>
              <div className={`text-xs font-black mt-1 ${summary.total_return_krw >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                원금 대비 {summary.total_return_krw >= 0 ? "+" : ""}
                {(summary.total_return_krw || 0).toLocaleString()}원 ({summary.total_return_pct >= 0 ? "+" : ""}
                {summary.total_return_pct || 0}%)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
              <div className="text-[11px] text-gray-400 font-bold">주문 가능 현금 (예수금)</div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-1">
                ₩{(summary.cash_krw || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                주식 매입액: ₩{(summary.eval_amount_krw || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
              <div className="text-[11px] text-gray-400 font-bold">현재 보유종목 평가손익</div>
              <div className={`text-lg sm:text-xl font-black font-mono mt-1 ${(summary.unrealized_pnl_krw || 0) >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                {(summary.unrealized_pnl_krw || 0) >= 0 ? "+" : ""}₩{(summary.unrealized_pnl_krw || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                보유 {positions.length}종목 / 최대 {cfg.max_positions || 5}종목
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10">
              <div className="text-[11px] text-gray-400 font-bold">누적 확정 수익 (실현손익)</div>
              <div className={`text-lg sm:text-xl font-black font-mono mt-1 ${(summary.realized_pnl_krw || 0) >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                {(summary.realized_pnl_krw || 0) >= 0 ? "+" : ""}₩{(summary.realized_pnl_krw || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                총 {summary.total_trades || 0}회 매도 완료
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-gray-400 font-bold">AI 매매 승률 &amp; 운전 모드</div>
              <div className="text-lg sm:text-xl font-black text-amber-300 font-mono mt-1">
                승률 {summary.win_rate ?? 100}% ({summary.win_trades || 0}승 {summary.loss_trades || 0}패)
              </div>
              <div className="text-[11px] text-emerald-400 font-bold mt-1">
                모드: {cfg.mode === "KIS_REAL" ? "🔥 한국투자증권 실전계좌" : cfg.mode === "KIS_VIRTUAL" ? "🧪 한국투자증권 모의계좌" : "⚡ 서버 실시간 AI 가상계좌"}
              </div>
            </div>
          </div>
        </div>

        {/* 1. 현재 보유 종목 실시간 감시 & 자동 익절/손절 현황판 */}
        <div className="rounded-3xl bg-zinc-900/90 border border-white/10 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  현재 로봇이 보유·감시 중인 종목 ({positions.length} / {cfg.max_positions || 5})
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  5초마다 실시간 현재가·수익률 자동 새로고침 중 ({data?.last_quote_refresh_at || "실시간"})
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                목표 익절가(+{cfg.take_profit_pct}%) 도달 시 0.1초 만에 자동 익절 매도하고, 확보된 현금으로 즉시 새 유망주를 매수합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(cfg.max_positions || 5) < 10 && (
                <button
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
                        body: JSON.stringify({ max_positions: 10, order_amount_krw: 1000000 }),
                      });
                      const json = await res.json();
                      if (json.status === "success") {
                        setData(json.data);
                        syncFormFromConfig(json.data.config);
                      }
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="text-xs font-black text-indigo-200 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 px-3 py-1.5 rounded-xl flex items-center gap-1"
                >
                  ➕ 보유 한도 10종목(종목당 100만원)으로 늘리기
                </button>
              )}
              <button
                onClick={handleResetPaper}
                className="text-xs font-bold text-gray-400 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 1,000만 원 시드 초기화 &amp; 재매수
              </button>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="py-10 text-center space-y-3 bg-zinc-950/60 rounded-2xl border border-white/5">
              <p className="text-sm font-bold text-gray-300">현재 보유 중인 종목이 없습니다.</p>
              <button
                onClick={handleRunCycleNow}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400"
              >
                ⚡ 지금 즉시 AI 1순위 종목 자동 매수하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {positions.map((pos: any) => {
                const isPlus = (pos.pnl_pct || 0) >= 0;
                return (
                  <div
                    key={pos.symbol}
                    className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10 hover:border-emerald-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-black">
                            {pos.sector || "주도주"}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">{pos.symbol}</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                          {pos.name} <span className="text-xs font-bold text-gray-400">({pos.qty}주 보유)</span>
                        </h3>
                      </div>

                      <div className="text-right">
                        <div className={`text-base sm:text-lg font-black font-mono ${isPlus ? "text-rose-400" : "text-blue-400"}`}>
                          {isPlus ? "+" : ""}
                          {pos.pnl_pct}% ({isPlus ? "+" : ""}
                          {(pos.pnl_krw || 0).toLocaleString()}원)
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          매수가 {pos.avg_price?.toLocaleString()} → 현재가 <b className="text-white">{pos.current_price?.toLocaleString()}</b>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-medium">
                      💡 선정 사유: {pos.reason}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono bg-zinc-900 px-3 py-2 rounded-xl">
                      <span className="text-rose-400 font-bold">🎯 자동 익절가: {pos.target_price?.toLocaleString()}</span>
                      <span className="text-blue-400 font-bold">🛡️ 자동 손절가: {pos.stop_price?.toLocaleString()}</span>
                      <button
                        onClick={() => handleClosePosition(pos.symbol, pos.name)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-sans font-black text-[11px] transition-all"
                      >
                        즉시 매도
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 로봇 전략 설정 & 한국투자증권(KIS) 24시간 무인 API 연동 패널 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌측: 자동매매 운전 모드 & 손익비 설정 */}
          <div className="rounded-3xl bg-zinc-900/90 border border-white/10 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                자동매매 전략 &amp; 계좌 연동 설정
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                  cfg.enabled
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                }`}
              >
                {cfg.enabled ? "🟢 현재 자동매매 켜짐 (ON)" : "🛑 현재 자동매매 꺼짐 (OFF)"}
              </span>
            </div>

            {/* 🎛️ 계좌가 연동되어 있어도 언제든 1초 만에 켰다 껐다 하는 전용 ON/OFF 스위치 박스 */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <Power className="w-4 h-4 text-emerald-400" />
                    계좌 연동 중에도 언제든 즉시 ON / OFF 제어 스위치
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                    실제 계좌(App Key·계좌번호)를 등록해 두셨더라도 삭제할 필요 없이, 아래 버튼 하나로 언제든 자동매매와 실전 계좌 주문을 켰다 껐다 하실 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 버튼 1: AI 자동매매 전체 마스터 전원 ON/OFF */}
                <button
                  type="button"
                  onClick={handleToggleBot}
                  disabled={actionLoading}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                    cfg.enabled
                      ? "bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/15"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-200 hover:bg-rose-950/60"
                  }`}
                >
                  <div>
                    <div className="text-xs font-black flex items-center gap-1.5">
                      {cfg.enabled ? "🟢 AI 자동매매 가동 중 (켜짐)" : "🛑 AI 자동매매 일시정지 (꺼짐)"}
                    </div>
                    <div className="text-[10px] text-gray-300 mt-0.5">
                      {cfg.enabled
                        ? "클릭 시 모든 자동 매수·매도를 즉시 멈춥니다 (OFF)"
                        : "클릭 시 설정된 전략으로 자동매매를 다시 시작합니다 (ON)"}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 ${
                      cfg.enabled ? "bg-emerald-400 text-black" : "bg-rose-500 text-white"
                    }`}
                  >
                    {cfg.enabled ? "ON (끄기)" : "OFF (켜기)"}
                  </span>
                </button>

                {/* 버튼 2: 연동 계좌(KIS) 실제 주문 전송 잠금/해제 스위치 */}
                <button
                  type="button"
                  onClick={handleToggleKisOrder}
                  disabled={actionLoading}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                    kisOrderEnabled
                      ? "bg-blue-500/20 border-blue-400 text-white shadow-lg shadow-blue-500/15"
                      : "bg-amber-950/40 border-amber-500/40 text-amber-200 hover:bg-amber-950/60"
                  }`}
                >
                  <div>
                    <div className="text-xs font-black flex items-center gap-1.5">
                      {kisOrderEnabled ? "🔓 실전·연동 계좌 주문 전송 (켜짐)" : "🔒 실전·연동 계좌 주문 잠금 (꺼짐)"}
                    </div>
                    <div className="text-[10px] text-gray-300 mt-0.5">
                      {kisOrderEnabled
                        ? "한투 모드 선택 시 연동된 실제 계좌로 주문을 넣습니다"
                        : "계좌 정보는 그대로 보관하고 실제 계좌 주문만 차단합니다"}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 ${
                      kisOrderEnabled ? "bg-blue-400 text-black" : "bg-amber-500 text-black"
                    }`}
                  >
                    {kisOrderEnabled ? "연동 ON" : "잠금 OFF"}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">1) 자동매매 운전 모드 선택</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "AI_PAPER", title: "⚡ 서버 AI 가상매매", desc: "API 없이 즉시 1,000만원 실전호가로 자동매매" },
                    { id: "KIS_VIRTUAL", title: "🧪 한투 모의투자 API", desc: "한국투자증권 모의계좌 연동 24시간 주문" },
                    { id: "KIS_REAL", title: "🔥 한투 실전투자 API", desc: "한국투자증권 실전계좌 실제 자금 자동매매" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        mode === m.id
                          ? "bg-emerald-500/15 border-emerald-500 text-white"
                          : "bg-zinc-950/70 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-black">{m.title}</div>
                      <div className="text-[10px] text-gray-400 mt-1 leading-snug">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 💰 실제/연동 계좌 자동매매 총 투자 한도 금액 설정 (안전 예산 보호캡) */}
              <div className="p-3.5 rounded-2xl bg-blue-950/35 border border-blue-500/35 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                      💰 실제·연동 계좌 자동매매 최대 총 투자 한도 설정 (안전 예산 보호캡)
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
                      실제 증권사 계좌에 큰 금액(예: 5,000만원)이 들어있어도, 여기서 설정한{" "}
                      <span className="text-blue-300 font-bold">
                        {maxTotalInvestKrw > 0 ? `${maxTotalInvestKrw.toLocaleString()}원` : "계좌 전체 잔고(무제한)"}
                      </span>{" "}
                      한도 내에서만 AI가 자동매매(신규 매수·물타기)를 진행하며 나머지 계좌 예수금은 절대 건드리지 않습니다.
                    </p>
                  </div>
                </div>

                {/* 빠른 한도 금액 프리셋 버튼 */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "100만원", val: 1000000 },
                    { label: "300만원", val: 3000000 },
                    { label: "500만원", val: 5000000 },
                    { label: "1,000만원", val: 10000000 },
                    { label: "2,000만원", val: 20000000 },
                    { label: "한도 제한 없음", val: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => {
                        setMaxTotalInvestKrw(preset.val);
                        if (preset.val > 0 && maxPositions > 0) {
                          setOrderAmountKrw(Math.floor(preset.val / maxPositions));
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                        maxTotalInvestKrw === preset.val
                          ? "bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20"
                          : "bg-zinc-950/80 text-gray-300 border-white/15 hover:border-blue-400/50 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-blue-200 block mb-1">
                      AI 자동매매 총 운용 한도 금액 (원, 0=무제한)
                    </label>
                    <input
                      type="number"
                      value={maxTotalInvestKrw}
                      onChange={(e) => setMaxTotalInvestKrw(Math.max(0, Number(e.target.value)))}
                      step={500000}
                      className="w-full bg-zinc-950 border border-blue-500/40 rounded-xl px-3 py-2 text-xs font-mono font-black text-blue-300"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (maxTotalInvestKrw > 0 && maxPositions > 0) {
                          setOrderAmountKrw(Math.floor(maxTotalInvestKrw / maxPositions));
                        }
                      }}
                      disabled={maxTotalInvestKrw <= 0}
                      className="w-full py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-40 border border-blue-500/40 text-blue-200 text-[11px] font-black transition-all"
                    >
                      ⚡ 한도를 {maxPositions}종목으로 자동 균등 분할 (1종목당{" "}
                      {maxTotalInvestKrw > 0
                        ? `${Math.floor(maxTotalInvestKrw / Math.max(1, maxPositions)).toLocaleString()}원`
                        : "-"}
                      )
                    </button>
                  </div>
                </div>

                {/* 실시간 한도 소진율 게이지 */}
                {maxTotalInvestKrw > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-gray-400">
                        현재 AI 자동매매 투입 원금:{" "}
                        <strong className="text-white">
                          {Number(summary?.invested_principal_krw || 0).toLocaleString()}원
                        </strong>
                      </span>
                      <span className="text-emerald-300">
                        남은 매수 가능 한도:{" "}
                        <strong>
                          {Math.max(0, maxTotalInvestKrw - Number(summary?.invested_principal_krw || 0)).toLocaleString()}원
                        </strong>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((Number(summary?.invested_principal_krw || 0) / Math.max(1, maxTotalInvestKrw)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">매매 대상 시장</label>
                  <select
                    value={marketTarget}
                    onChange={(e) => setMarketTarget(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <option value="KR">🇰🇷 국내 주식 (코스피·코스닥 우량주)</option>
                    <option value="US">🇺🇸 미국 주식 (엔비디아·테슬라 등 야간)</option>
                    <option value="ALL">🌍 국내(주간) + 미국(야간) 24시간 풀가동</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">1종목당 매수 금액 (원)</label>
                  <input
                    type="number"
                    value={orderAmountKrw}
                    onChange={(e) => setOrderAmountKrw(Number(e.target.value))}
                    step={100000}
                    className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white"
                  />
                </div>
              </div>

              {/* 무손절(익절 전용) vs 단타 칼손절 모드 선택 */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      🛡️ 손절(손해 확정) 작동 방식 선택
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
                      {!useStopLoss
                        ? "✅ 현재 [무손절 · 익절 전용 모드]: 주가가 일시 하락해도 절대 손해 보고 팔지 않으며, 반등하여 목표 수익률에 도달했을 때만 매도합니다."
                        : `⚠️ 현재 [단타 칼손절 모드]: 주가가 -${stopLossPct}% 하락하면 즉시 시장가로 손절 매도하고 다른 종목으로 교체합니다.`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUseStopLoss(false)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      !useStopLoss
                        ? "bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-950/50"
                        : "bg-zinc-950/70 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-black text-emerald-300">🛡️ 무손절 · 익절 전용 (추천)</div>
                    <div className="text-[10px] text-gray-300 mt-0.5">손해 보고는 절대 안 팦! 기다렸다가 수익 날 때만 익절</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseStopLoss(true)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      useStopLoss
                        ? "bg-blue-500/20 border-blue-400 text-white"
                        : "bg-zinc-950/70 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-black text-blue-300">⚡ 단타 칼손절 회전 모드</div>
                    <div className="text-[10px] text-gray-300 mt-0.5">-{stopLossPct}% 도달 시 즉시 던지고 다른 종목 교체</div>
                  </button>
                </div>

                {!useStopLoss && (
                  <label className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-500/20 cursor-pointer">
                    <span className="text-[11px] font-bold text-emerald-200">
                      💧 -5% 이상 일시 하락 시 여유 현금으로 1회 자동 물타기 (평단가 낮춰서 빠른 익절 유도)
                    </span>
                    <input
                      type="checkbox"
                      checked={autoAveragingDown}
                      onChange={(e) => setAutoAveragingDown(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-rose-300 block mb-1">🎯 자동 익절률 (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-rose-500/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-blue-300 block mb-1">
                    {useStopLoss ? "🛡️ 자동 칼손절 (%)" : "🛡️ 손절 (현재 꺼짐)"}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!useStopLoss}
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    className={`w-full bg-zinc-950 border rounded-xl px-3 py-2 text-xs font-mono font-bold ${
                      useStopLoss ? "border-blue-500/30 text-blue-300" : "border-white/10 text-gray-600 opacity-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-300 block mb-1">📈 최대 보유 종목수</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxPositions}
                    onChange={(e) => setMaxPositions(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-300"
                  />
                </div>
              </div>

              {/* 한국투자증권 OpenAPI 키 입력 슬롯 */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" /> 한국투자증권(KIS) 24시간 무인 주문 API 키 (선택)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKisModal(!showKisModal)}
                    className="text-[11px] font-bold text-blue-400 underline"
                  >
                    {showKisModal ? "접기" : "API 키 입력 / 3분 발급 안내 열기"}
                  </button>
                </div>

                {showKisModal && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      • 스마트폰으로 <b>한국투자증권 앱(뱅키스)</b> 비대면 계좌 개설 후, <b>KIS Developers</b>에서 무료 발급받은 APP KEY / SECRET / 계좌번호(8자리-01)를 입력하면 집 PC를 켜두지 않아도 우리 리눅스 서버가 24시간 실제 주문을 체결합니다.
                    </p>
                    <input
                      type="text"
                      placeholder="KIS 계좌번호 (예: 50123456-01)"
                      value={kisAccountNo}
                      onChange={(e) => setKisAccountNo(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                    <input
                      type="text"
                      placeholder="KIS APP KEY 입력"
                      value={kisAppKey}
                      onChange={(e) => setKisAppKey(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                    <input
                      type="password"
                      placeholder="KIS APP SECRET 입력"
                      value={kisAppSecret}
                      onChange={(e) => setKisAppSecret(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={actionLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs sm:text-sm shadow-lg"
              >
                💾 위 자동매매 전략 및 계좌 설정 저장하기
              </button>
            </div>
          </div>

          {/* 우측: AI 실시간 종목 발굴 레이더 Top 6 */}
          <div className="rounded-3xl bg-zinc-900/90 border border-white/10 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  AI 로봇 실시간 매수 타점 레이더 Top 6
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  수급·차트 지지선·섹터 모멘텀 점수가 가장 높은 최우선 매수 대기 종목입니다.
                </p>
              </div>
              <span className="text-[11px] font-mono text-gray-500">최근 스캔: {data?.last_cycle_at?.slice(11) || "방금 전"}</span>
            </div>

            <div className="space-y-2.5">
              {candidates.slice(0, 6).map((cand: any, idx: number) => (
                <div
                  key={cand.symbol}
                  className="p-3 rounded-2xl bg-zinc-950/80 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-black text-white text-sm">{cand.name}</span>
                      <span className="text-[11px] text-gray-500 font-mono">{cand.symbol}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-black">
                        AI {cand.ai_score}점
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 pl-7">{cand.reason}</p>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className="text-sm font-black text-white">
                      {cand.is_us ? `$${cand.price}` : `₩${cand.price?.toLocaleString()}`}
                    </div>
                    <div className={`text-xs font-bold ${cand.change_pct >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                      {cand.change_pct >= 0 ? "+" : ""}
                      {cand.change_pct}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. 로봇 자동 매수·매도 체결 일지 */}
        <div className="rounded-3xl bg-zinc-900/90 border border-white/10 p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-black text-white">📜 로봇 자동 매수·매도 실시간 체결 일지</h2>
          {tradeLogs.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">아직 기록된 매매 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {tradeLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-zinc-950/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-black text-[11px] ${
                        log.action === "BUY"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {log.action === "BUY" ? "🟢 자동 매수" : "🔴 자동 매도"}
                    </span>
                    <span className="text-gray-400 font-mono text-[11px]">{log.timestamp}</span>
                    <span className="text-white font-black text-sm">
                      {log.name} ({log.qty}주)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 font-mono">
                    <span className="text-gray-300">
                      체결가 <b>{log.price?.toLocaleString()}</b> (₩{(log.amount_krw || 0).toLocaleString()})
                    </span>
                    {log.action === "SELL" && (
                      <span className={`font-black ${log.pnl_krw >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                        실현손익 {log.pnl_krw >= 0 ? "+" : ""}
                        {(log.pnl_krw || 0).toLocaleString()}원 ({log.pnl_pct >= 0 ? "+" : ""}
                        {log.pnl_pct}%)
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 font-sans">사유: {log.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
