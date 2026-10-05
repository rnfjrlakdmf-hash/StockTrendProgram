"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";
import Header from "@/components/Header";
import { getMarketInfo } from "@/lib/marketTag";
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
  ShieldCheck,
  Sliders,
  Sparkles,
  Clock,
  Lock,
  Unlock,
  Layers,
  Cpu,
  Coins,
  ChevronRight,
  TrendingDown,
  Target,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Gauge,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  BarChart2,
  Search,
  Filter,
  ArrowRight,
  Award,
} from "lucide-react";

const ADMIN_KEY = "StockTrendSecretAdmin2026!";

function parsePositionDetails(pos: any, fxRate: number = 1355) {
  const isUS = Boolean(pos.is_us || (pos.symbol && /^[A-Z]/.test(pos.symbol)));
  const qty = Number(pos.qty || 1);
  const avgPrice = Number(pos.avg_price || pos.current_price || 0);
  const curPrice = Number(pos.current_price || avgPrice);
  const targetPrice = Number(pos.target_price || (avgPrice > 0 ? avgPrice * 1.02 : 0));
  const stopPrice = Number(pos.stop_price || (avgPrice > 0 ? avgPrice * 0.99 : 0));

  const targetPct = avgPrice > 0 ? Number((((targetPrice - avgPrice) / avgPrice) * 100).toFixed(1)) : 2.0;
  const stopPct = avgPrice > 0 ? Number((((avgPrice - stopPrice) / avgPrice) * 100).toFixed(1)) : 1.0;

  const unitMultiplier = isUS ? fxRate : 1;
  const totalBuyKrw = Math.round(qty * avgPrice * unitMultiplier);
  const totalCurKrw = Math.round(qty * curPrice * unitMultiplier);
  const pnlKrw = Number(pos.pnl_krw !== undefined ? pos.pnl_krw : (totalCurKrw - totalBuyKrw));
  const pnlPct = Number(pos.pnl_pct !== undefined ? pos.pnl_pct : (avgPrice > 0 ? ((curPrice - avgPrice) / avgPrice) * 100 : 0));
  const targetProfitKrw = Math.round(qty * (targetPrice - avgPrice) * unitMultiplier);

  // Target progress percentage: 0% at avgPrice, 100% at targetPrice
  let targetProgress = 0;
  if (targetPrice > avgPrice) {
    targetProgress = Math.max(0, Math.min(100, Math.round(((curPrice - avgPrice) / (targetPrice - avgPrice)) * 100)));
  }

  // Parse chips from reason
  const chips: { label: string; icon?: string; color: string }[] = [];
  const rawReason = String(pos.reason || "");
  const parts = rawReason.split("·").map((p: string) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("AI 퀀트")) {
      const match = part.match(/\d+점/);
      chips.push({
        label: `AI 퀀트 ${match ? match[0] : "99점"}`,
        icon: "✨",
        color: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
      });
    } else if (part.includes("자산 맞춤") || part.includes("배분")) {
      const match = part.match(/[\d,]+원/);
      chips.push({
        label: match ? `예산 ${match[0]} 배분` : "자산 맞춤 균등 배분",
        icon: "💰",
        color: "bg-blue-500/15 text-blue-300 border-blue-400/30",
      });
    } else if (part.includes("수급") || part.includes("기관") || part.includes("외인")) {
      chips.push({
        label: "외인·기관 수급 돌파",
        icon: "⚡",
        color: "bg-purple-500/15 text-purple-300 border-purple-400/30",
      });
    } else if (part.includes("눌림목") || part.includes("저점")) {
      chips.push({
        label: "장중 저점 눌림목 타점",
        icon: "🎯",
        color: "bg-amber-500/15 text-amber-300 border-amber-400/30",
      });
    }
  }

  const uniqueChips: { label: string; icon?: string; color: string }[] = [];
  const seenLabels = new Set<string>();
  for (const chip of chips) {
    if (!seenLabels.has(chip.label)) {
      seenLabels.add(chip.label);
      uniqueChips.push(chip);
    }
  }

  return {
    isUS,
    qty,
    avgPrice,
    curPrice,
    targetPrice,
    stopPrice,
    targetPct,
    stopPct,
    totalBuyKrw,
    totalCurKrw,
    pnlKrw,
    pnlPct,
    targetProfitKrw,
    targetProgress,
    chips: uniqueChips,
  };
}

function splitStockName(rawName: any = "") {
  if (!rawName) return { mainName: "", subName: "" };
  const trimmed = String(rawName).trim();
  // (괄호) 또는 [대괄호]로 감싸진 부제/테마/영문명 분리
  const match = trimmed.match(/^([^\(\[]+)\s*([\(\[].+[\)\]])$/);
  if (match) {
    return {
      mainName: match[1].trim(),
      subName: match[2].trim(),
    };
  }
  return { mainName: trimmed, subName: "" };
}

function parseCandidateReason(rawReason: any = "") {
  if (!rawReason) return { chips: [], techSummary: "", text: "" };
  const str = typeof rawReason === "string" ? rawReason : String(rawReason);

  // 5·20일선 등에서 '·'가 구분자로 오인되어 잘리는 문제 완벽 방지
  const safeStr = str.replace(/5·20/g, "5_20_SAFE").replace(/·/g, "|||");
  const parts = safeStr
    .split("|||")
    .map((p: string) => p.replace(/5_20_SAFE/g, "5·20").trim())
    .filter(Boolean);

  const rawChips: { label: string; icon?: string; color: string; priority: number }[] = [];
  let techSummary = "";
  const textParts: string[] = [];

  for (const part of parts) {
    if (part.includes("장마감 수급스캐너") || part.includes("CVD") || part.includes("OBV")) {
      techSummary = part.replace(/[\[\]]/g, "").replace("🔥", "").trim();
      rawChips.push({
        label: "장마감 수급스캐너 포착",
        icon: "🔥",
        color: "bg-rose-500/15 text-rose-300 border-rose-400/30",
        priority: 1,
      });
    } else if (part.includes("골든크로스") || part.includes("정배열")) {
      rawChips.push({
        label: "5·20일선 정배열 골든크로스",
        icon: "📈",
        color: "bg-blue-500/15 text-blue-300 border-blue-400/30",
        priority: 2,
      });
      if (part.includes("차트:")) {
        techSummary = part.replace(/^[\[\(]/, "").replace(/[\]\)]$/, "").trim();
      }
    } else if (part.includes("20일선")) {
      rawChips.push({
        label: "20일 이평 지지 반등",
        icon: "📊",
        color: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
        priority: 3,
      });
      if (part.includes("차트:")) {
        techSummary = part.replace(/^[\[\(]/, "").replace(/[\]\)]$/, "").trim();
      }
    } else if (part.includes("RSI")) {
      const rsiMatch = part.match(/RSI\s*\d+[^\)]*\)?/i);
      rawChips.push({
        label: rsiMatch ? rsiMatch[0] : "RSI 저점 반등",
        icon: "📉",
        color: "bg-purple-500/15 text-purple-300 border-purple-400/30",
        priority: 4,
      });
    } else if (part.includes("초동 돌파")) {
      rawChips.push({
        label: "외인·기관 초동 돌파",
        icon: "⚡",
        color: "bg-amber-500/15 text-amber-300 border-amber-400/30",
        priority: 2,
      });
    } else if (part.includes("눌림목") || part.includes("저점")) {
      rawChips.push({
        label: "장중 저점 분할매집",
        icon: "🎯",
        color: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
        priority: 3,
      });
    } else if (part.includes("거래량")) {
      const volMatch = part.match(/거래량\s*[\d%]+/i);
      rawChips.push({
        label: volMatch ? `${volMatch[0]} 급증` : "거래량 유입 포착",
        icon: "🌊",
        color: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
        priority: 4,
      });
    } else if (part.includes("스마트머니") || part.includes("수급")) {
      rawChips.push({
        label: "외인·기관 수급 집중",
        icon: "⚡",
        color: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
        priority: 3,
      });
    } else if (
      part.includes("해외신생") ||
      part.includes("AI") ||
      part.includes("SMR") ||
      part.includes("우주") ||
      part.includes("로봇") ||
      part.includes("양자") ||
      part.includes("원전") ||
      part.includes("방산")
    ) {
      const cleanTheme = part
        .replace(/^[\[\(]/, "")
        .replace(/[\]\)]$/, "")
        .replace("스마트머니 집중", "")
        .replace("스마트머니", "")
        .trim();
      rawChips.push({
        label: cleanTheme,
        icon: "🚀",
        color: "bg-rose-500/15 text-rose-300 border-rose-400/30",
        priority: 1,
      });
    } else if (part.includes("소액한도 맞춤")) {
      // 주당 단가 배분은 메인 카드 상단에 직접 표시되므로 중복 칩 추가 생략
    } else if (
      !part.includes("야간 미국장") &&
      !part.includes("주간 한국장") &&
      !part.includes("AI 퀀트") &&
      !part.includes("실시간 타점")
    ) {
      const clean = part.replace(/^[\[\(]/, "").replace(/[\]\)]$/, "").trim();
      if (clean && (clean.includes("차트:") || clean.includes("CVD") || clean.includes("OBV"))) {
        techSummary = clean;
      } else if (clean && clean.length >= 4 && !clean.includes("기관·외인") && clean !== "기관" && clean !== "외인") {
        textParts.push(clean);
      }
    }
  }

  // 중복 칩 완전 제거 (동일 라벨 중복 방지)
  const uniqueChips: { label: string; icon?: string; color: string }[] = [];
  const seen = new Set<string>();
  rawChips.sort((a, b) => a.priority - b.priority);
  for (const c of rawChips) {
    if (!seen.has(c.label)) {
      seen.add(c.label);
      uniqueChips.push({ label: c.label, icon: c.icon, color: c.color });
    }
  }

  return { chips: uniqueChips, techSummary, text: textParts.join(" · ") };
}

function formatTradeReason(rawReason: any = "") {
  if (!rawReason) return { tag: "AI 판단", text: "실시간 알고리즘 체결", chips: [] };
  const reason = typeof rawReason === "string" ? rawReason : String(rawReason);
  if (!reason.trim()) return { tag: "AI 판단", text: "실시간 알고리즘 체결", chips: [] };

  const chips: { label: string; color: string }[] = [];

  // 1. [태그] 형태가 맨 앞에 있는 경우 (예: 🧠 [AI 자율판단 조기익절] 상세...)
  const bracketMatch = reason.match(/^([^\s\[]+)?\s*\[([^\]]+)\]\s*(.*)$/);
  if (bracketMatch) {
    const icon = bracketMatch[1] ? `${bracketMatch[1]} ` : "";
    const tag = `${icon}${bracketMatch[2]}`.trim();
    let text = bracketMatch[3].trim();
    text = text.replace(/\[한투주문[^\]]+\]/g, "").trim();

    if (text.includes("수익 조기 챙김") || text.includes("조기익절")) {
      chips.push({
        label: "수익 조기 실현",
        color: "bg-rose-500/15 text-rose-300 border-rose-400/30",
      });
    }
    if (text.includes("추가하락 방어") || text.includes("리스크관리")) {
      chips.push({
        label: "원금 손실 방어",
        color: "bg-blue-500/15 text-blue-300 border-blue-400/30",
      });
    }
    if (text.includes("시드 즉시 교체")) {
      chips.push({
        label: "강세 주도주 교체",
        color: "bg-amber-500/15 text-amber-300 border-amber-400/30",
      });
    }
    if (text.includes("목표가")) {
      chips.push({
        label: "목표가 달성 익절",
        color: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
      });
    }

    return { tag, text: text || tag, chips };
  }

  // 2. AI 퀀트 N점 · [매수 상세 사유] 형태
  const safeStr = reason.replace(/5·20/g, "5_20_SAFE").replace(/·/g, "|||");
  const chunks = safeStr
    .split("|||")
    .map((c) => c.replace(/5_20_SAFE/g, "5·20").trim())
    .filter(Boolean);

  let tag = "⚡ AI 퀀트 포착";
  const cleanChunks: string[] = [];

  for (const chunk of chunks) {
    if (chunk.includes("AI 퀀트")) {
      tag = `✨ ${chunk.replace(/^AI\s*퀀트\s*/, "AI 퀀트 ")}`;
    } else if (chunk.includes("RSI")) {
      const match = chunk.match(/RSI\s*\d+[^\)]*\)?/i);
      chips.push({
        label: match ? match[0] : "RSI 저점 반등",
        color: "bg-purple-500/15 text-purple-300 border-purple-400/30",
      });
    } else if (chunk.includes("골든크로스") || chunk.includes("정배열")) {
      chips.push({
        label: "5·20일선 골든크로스",
        color: "bg-blue-500/15 text-blue-300 border-blue-400/30",
      });
    } else if (chunk.includes("볼린저")) {
      chips.push({
        label: "볼린저 하단 반등",
        color: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
      });
    } else if (chunk.includes("거래량")) {
      chips.push({
        label: "바닥권 거래량 급증",
        color: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
      });
    } else if (chunk.includes("스마트머니") || chunk.includes("수급")) {
      chips.push({
        label: "외인·기관 수급 집중",
        color: "bg-amber-500/15 text-amber-300 border-amber-400/30",
      });
    } else if (
      chunk.includes("정규장 실시간 포착") ||
      chunk.includes("소액한도 맞춤") ||
      chunk.includes("실시간 타점") ||
      chunk.includes("한투주문")
    ) {
      continue;
    } else {
      cleanChunks.push(chunk.replace(/^[\[\(]/, "").replace(/[\]\)]$/, ""));
    }
  }

  return {
    tag,
    text: cleanChunks.length > 0 ? cleanChunks.join(" · ") : reason,
    chips,
  };
}

export default function AdminAutoTradePage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showKisModal, setShowKisModal] = useState(false);

  // 설정 폼 상태
  const [mode, setMode] = useState("AI_PAPER");
  const [marketTarget, setMarketTarget] = useState("ALL");
  const [maxTotalInvestKrw, setMaxTotalInvestKrw] = useState(10000000);
  const [orderAmountKrw, setOrderAmountKrw] = useState(1400000);
  const [maxPositions, setMaxPositions] = useState(7);
  const [takeProfitPct, setTakeProfitPct] = useState(2.0);
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [autoAveragingDown, setAutoAveragingDown] = useState(true);
  const [stopLossPct, setStopLossPct] = useState(2.5);
  const [trailingStopPct, setTrailingStopPct] = useState(1.0);
  const [kisOrderEnabled, setKisOrderEnabled] = useState(true);
  const [kisAppKey, setKisAppKey] = useState("");
  const [kisAppSecret, setKisAppSecret] = useState("");
  const [kisAccountNo, setKisAccountNo] = useState("");
  const [paperSeedKrw, setPaperSeedKrw] = useState<number>(20000000);
  const [logFilter, setLogFilter] = useState<"ALL" | "BUY" | "SELL" | "PROFIT" | "LOSS">("ALL");
  const [logSearch, setLogSearch] = useState<string>("");
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [viewWindow, setViewWindow] = useState<"REAL" | "PAPER">("REAL");

  const handleCopySymbol = (e: React.MouseEvent, symbol: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(symbol);
        setCopiedSymbol(symbol);
        setTimeout(() => setCopiedSymbol(null), 1800);
      }
    } catch {}
  };

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

  // [로컬 시드 캐시 복원] 새로고침 또는 브라우저 재접속 시에도 대표님이 설정한 시드머니 즉시 복원
  useEffect(() => {
    try {
      const cached = localStorage.getItem("admin_auto_paper_seed");
      if (cached && Number(cached) > 0) {
        setPaperSeedKrw(Number(cached));
      }
    } catch {}
  }, []);

  const syncFormFromConfig = (cfg: any) => {
    if (!cfg) return;
    setMode(cfg.mode || "AI_PAPER");
    setMarketTarget(cfg.market_target === "KR_ONLY" || cfg.market_target === "US_ONLY" ? cfg.market_target : "ALL");
    setMaxTotalInvestKrw(Number(cfg.max_total_invest_krw ?? 10000000));
    setOrderAmountKrw(Number(cfg.order_amount_krw || 1400000));
    setMaxPositions(Number(cfg.max_positions || 7));
    setTakeProfitPct(Number(cfg.take_profit_pct || 2.0));
    setUseStopLoss(Boolean(cfg.use_stop_loss ?? false));
    setAutoAveragingDown(Boolean(cfg.auto_averaging_down ?? true));
    setStopLossPct(Number(cfg.stop_loss_pct || 2.5));
    setTrailingStopPct(Number(cfg.trailing_stop_pct || 1.0));
    setKisOrderEnabled(Boolean(cfg.kis_order_enabled ?? true));
    setKisAppKey(cfg.kis_app_key || "");
    setKisAppSecret(cfg.kis_app_secret || "");
    setKisAccountNo(cfg.kis_account_no || "");
    if (cfg.paper_seed_krw) {
      const sVal = Number(cfg.paper_seed_krw);
      setPaperSeedKrw(sVal);
      try {
        localStorage.setItem("admin_auto_paper_seed", String(sVal));
      } catch {}
    }
  };

  const getAdminHeaders = useCallback(async (withJson = true) => {
    const hdrs: Record<string, string> = { "X-Admin-Key": ADMIN_KEY };
    if (withJson) hdrs["Content-Type"] = "application/json";
    try {
      if (currentUser && typeof (currentUser as any).getIdToken === "function") {
        const tok = await (currentUser as any).getIdToken();
        if (tok) hdrs["Authorization"] = `Bearer ${tok}`;
      }
    } catch {}
    return hdrs;
  }, [currentUser]);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const hdrs = await getAdminHeaders(false);
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/status`, {
        headers: hdrs,
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
  }, [getAdminHeaders]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchStatus(false);
      const timer = setInterval(() => fetchStatus(true), 5000);
      return () => clearInterval(timer);
    }
  }, [authLoading, currentUser, fetchStatus]);

  useEffect(() => {
    if (data?.config?.mode) {
      setViewWindow(data.config.mode === "KIS_REAL" ? "REAL" : "PAPER");
    }
  }, [data?.config?.mode]);

  const handleToggleBot = async () => {
    if (!data?.config) return;
    setActionLoading(true);
    try {
      const nextEnabled = !data.config.enabled;
      const hdrs = await getAdminHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
        method: "POST",
        headers: hdrs,
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
      const hdrs = await getAdminHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
        method: "POST",
        headers: hdrs,
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
      const hdrs = await getAdminHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
        method: "POST",
        headers: hdrs,
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
          paper_seed_krw: Number(paperSeedKrw),
        }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
        syncFormFromConfig(json.data.config);
        alert("✅ 자동매매 로봇 전략 및 계좌 설정이 안전하게 암호화·마스킹 저장되었습니다!");
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

  const handleApplyPaperSeed = async (targetSeed?: number) => {
    const seedVal = Math.max(50000, Number(targetSeed ?? paperSeedKrw) || 20000000);
    setPaperSeedKrw(seedVal);
    try {
      localStorage.setItem("admin_auto_paper_seed", String(seedVal));
    } catch {}
    setActionLoading(true);
    try {
      const hdrs = await getAdminHeaders(true);
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({ paper_seed_krw: seedVal }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
        syncFormFromConfig(json.data.config);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyRealLimit = async (targetLimit?: number, startRealNow: boolean = false) => {
    const limitVal = Math.max(30000, Number(targetLimit ?? maxTotalInvestKrw) || 100000);
    const autoMaxPos = limitVal <= 200000 ? 2 : limitVal <= 500000 ? 3 : limitVal <= 1000000 ? 5 : limitVal <= 4000000 ? 7 : 10;
    const autoOrderAmt = Math.max(25000, Math.floor(limitVal / Math.max(2, autoMaxPos)));
    setMaxTotalInvestKrw(limitVal);
    setMaxPositions(autoMaxPos);
    setOrderAmountKrw(autoOrderAmt);
    setActionLoading(true);
    try {
      const hdrs = await getAdminHeaders(true);
      const payload: Record<string, unknown> = {
        max_total_invest_krw: limitVal,
        max_positions: autoMaxPos,
        order_amount_krw: autoOrderAmt,
      };
      if (startRealNow) {
        payload.mode = "KIS_REAL";
        payload.kis_order_enabled = true;
        payload.enabled = true;
        setMode("KIS_REAL");
        setKisOrderEnabled(true);
      }
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/config`, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
        syncFormFromConfig(json.data.config);
        if (startRealNow) {
          await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/run-cycle?force_buy=true`, {
            method: "POST",
            headers: hdrs,
          })
            .then((r) => r.json())
            .then((j) => {
              if (j.status === "success") setData(j.data);
            })
            .catch(() => {});
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPaper = async (customSeed?: number) => {
    const seedVal = Math.max(50000, Number(customSeed ?? paperSeedKrw) || 20000000);
    const seedText = seedVal >= 10000 ? `${(seedVal / 10000).toLocaleString()}만 원` : `${seedVal.toLocaleString()}원`;
    if (!confirm(`가상 계좌 시드머니를 [${seedText}]으로 초기화하고 즉시 새 포트폴리오 매수를 시작하시겠습니까?`)) return;
    setPaperSeedKrw(seedVal);
    try {
      localStorage.setItem("admin_auto_paper_seed", String(seedVal));
    } catch {}
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/reset-paper`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
        body: JSON.stringify({ initial_capital_krw: seedVal }),
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

  const cfg = data?.config || {};
  const configuredMaxPos = Number(cfg.max_positions || maxPositions || 7);
  const activePaperSeed = Number(cfg.paper_seed_krw || paperSeedKrw || 20000000);
  const paperSeedLabel = activePaperSeed >= 10000 ? `${(activePaperSeed / 10000).toLocaleString()}만원` : `${activePaperSeed.toLocaleString()}원`;
  const realPositions = data?.real_positions || [];
  const paperPositions = data?.paper_positions || [];
  const isRealView = viewWindow === "REAL";

  const summary = isRealView
    ? { ...(data?.summary || {}), ...(data?.real_summary || {}) }
    : { ...(data?.summary || {}), ...(data?.paper_summary || {}) };
  const positions = isRealView ? realPositions : paperPositions;
  const candidates = data?.candidates || [];
  const tradeLogs = isRealView
    ? (data?.real_trade_logs || [])
    : (data?.paper_trade_logs || data?.trade_logs || []);

  const buyLogs = tradeLogs.filter((l: any) => l?.action === "BUY");
  const sellLogs = tradeLogs.filter((l: any) => l?.action === "SELL");
  const profitLogs = sellLogs.filter((l: any) => (Number(l?.pnl_krw) || 0) >= 0);
  const lossLogs = sellLogs.filter((l: any) => (Number(l?.pnl_krw) || 0) < 0);

  const buyCount = buyLogs.length;
  const sellCount = sellLogs.length;
  const profitCount = profitLogs.length;
  const lossCount = lossLogs.length;

  const totalRealizedPnl = sellLogs.reduce((acc: number, l: any) => acc + (Number(l?.pnl_krw) || 0), 0);
  const winRate = sellLogs.length === 0 ? "0.0" : ((profitCount / sellLogs.length) * 100).toFixed(1);
  const totalVolumeKrw = tradeLogs.reduce((acc: number, l: any) => acc + (Number(l?.amount_krw) || 0), 0);
  const bestTrade =
    profitLogs.length === 0
      ? null
      : [...profitLogs].sort((a: any, b: any) => (Number(b?.pnl_krw) || 0) - (Number(a?.pnl_krw) || 0))[0];

  let filteredLogs = tradeLogs;
  if (logFilter === "BUY") filteredLogs = buyLogs;
  else if (logFilter === "SELL") filteredLogs = sellLogs;
  else if (logFilter === "PROFIT") filteredLogs = profitLogs;
  else if (logFilter === "LOSS") filteredLogs = lossLogs;

  if (logSearch.trim()) {
    const q = logSearch.trim().toLowerCase();
    filteredLogs = filteredLogs.filter((l: any) => {
      const name = String(l?.name || "").toLowerCase();
      const sym = String(l?.symbol || "").toLowerCase();
      const reason = String(l?.reason || "").toLowerCase();
      return name.includes(q) || sym.includes(q) || reason.includes(q);
    });
  }

  const totalEq = Math.max(1, Number(summary.total_equity_krw || 0));
  const cashAmt = Math.max(0, Number(summary.cash_krw || 0));
  const stockAmt = Math.max(0, Number(summary.eval_amount_krw || 0));
  const cashPct = Math.min(100, Math.max(0, Math.round((cashAmt / totalEq) * 100)));
  const stockPct = Math.min(100, Math.max(0, 100 - cashPct));

  const totalTrades = Number(summary.total_trades || 0);
  const winTrades = Number(summary.win_trades || 0);
  const lossTrades = Number(summary.loss_trades || 0);
  const calculatedWinRate = totalTrades > 0 ? Math.round((winTrades / totalTrades) * 100) : 0;
  const waitingSlotsCount = Math.max(0, configuredMaxPos - positions.length);

  const formatSignedKrw = (val: number) => {
    const rounded = Math.round(val || 0);
    if (rounded > 0) return `+₩${rounded.toLocaleString()}`;
    if (rounded < 0) return `-₩${Math.abs(rounded).toLocaleString()}`;
    return "₩0";
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-white pb-24">
      <Header />

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-6">
        {/* 상단 사령부 메인 헤더 & 마스터 스위치 콘솔 */}
        <div className="rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-black border border-white/10 p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
          {/* Subtle ambient lighting */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* 1. 상단 내비게이션 & 실시간 시스템 인디케이터 바 */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-white/5 relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-white/10 hover:border-white/20 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>관리자 홈</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/alerts?tab=auto_trade")}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-indigo-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <span>🔔 자동매매 체결 알림</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/system/admin/auto-trader/test-fcm`, { method: "POST" });
                    const d = await res.json();
                    alert(d.message || "대표님 계정으로 자동매매 FCM 푸시 알림을 발송했습니다!");
                  } catch {
                    alert("FCM 테스트 요청 실패");
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <span>📲 내 폰으로 알림 테스트</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black flex items-center gap-1.5">
                <span>👑 대표님 단독 전용 관제</span>
              </span>
            </div>

            {/* 실시간 서버 엔진 헬스체크 배지 */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono flex items-center gap-2 text-gray-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-emerald-400 font-bold">24H 무인 자율엔진 ONLINE</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400">5초 주기 시세 동기화</span>
              </div>
            </div>
          </div>

          {/* 2. 타이틀 & 마스터 컨트롤 커맨드 덱 */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
                  <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                    24시간 무인 AI 자율 트레이딩 사령부
                  </h1>
                  <span className="text-[11px] font-bold text-emerald-400 tracking-wider font-mono">
                    AUTONOMOUS AI QUANT TRADING SYSTEM
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
                24시간 수급 집중도·외인·기관 동향·기술적 지지선을 실시간 추적하여, 사람의 개입 없이 최적의 매수·조기익절·손절을 스스로 무인 집행합니다.
              </p>
            </div>

            {/* 마스터 컨트롤 버튼 덱 (완벽한 레이아웃 밸런스) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {/* 메인 마스터 스위치 */}
              <button
                type="button"
                onClick={handleToggleBot}
                disabled={actionLoading}
                className={`flex items-center justify-between sm:justify-center gap-3 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer shadow-xl ${
                  cfg.enabled
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/25 ring-2 ring-emerald-400/40"
                    : "bg-zinc-900 text-gray-300 hover:bg-zinc-800 border border-white/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {cfg.enabled && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.enabled ? "bg-emerald-950" : "bg-gray-500"}`} />
                  </span>
                  <Power className="w-4 h-4" />
                  <span>{cfg.enabled ? "로봇 자동매매 가동 중 (ON)" : "로봇 일시정지됨 (OFF)"}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${cfg.enabled ? "bg-black/20 text-black font-black" : "bg-white/10 text-gray-400"}`}>
                  {cfg.enabled ? "RUNNING" : "STOPPED"}
                </span>
              </button>

              {/* 보조 실행 액션 2종 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRunCycleNow}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs transition-all shadow-lg shadow-blue-600/25 active:scale-95 cursor-pointer whitespace-nowrap"
                  title="현재 시각 최우선 순위 종목을 즉시 스캔하여 매매 사이클을 실행합니다"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>즉시 종목 발굴·매매</span>
                </button>

                <button
                  type="button"
                  onClick={handlePanicSell}
                  disabled={actionLoading || positions.length === 0}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white font-black text-xs transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer whitespace-nowrap shadow-sm"
                  title="비상 시 현재 보유 중인 모든 종목을 즉시 시장가로 일괄 매도합니다"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>전량 매도(킬스위치)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. 🔀 [실전 계좌 보유 창] vs [가상 모의투자 창] 프라이빗 뱅킹 스타일 대형 2분할 덱 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {/* 카드 1: 한국투자증권 실전 계좌 창 */}
            <button
              type="button"
              onClick={() => setViewWindow("REAL")}
              className={`p-4 sm:p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer ${
                isRealView
                  ? "bg-gradient-to-br from-blue-950/50 via-zinc-900/95 to-black border-blue-400 text-white shadow-[0_0_30px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/50"
                  : "bg-zinc-950/60 border-white/10 text-gray-400 hover:border-blue-400/50 hover:bg-zinc-900/60 hover:text-gray-200"
              }`}
            >
              <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-2xl pointer-events-none transition-all ${
                isRealView ? "bg-blue-500/15" : "bg-transparent group-hover:bg-blue-500/5"
              }`} />

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black border font-mono tracking-tight bg-blue-500/20 text-blue-300 border-blue-400/40 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      <span>KIS REAL ACCOUNT</span>
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      계좌번호 43880949-22
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      🏦 한국투자증권 실전 계좌 운용 창
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono shrink-0 ${
                      realPositions.length > 0
                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                        : "bg-zinc-800 text-gray-400"
                    }`}>
                      {realPositions.length}종목 보유 중
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    실제 증권사 한도 <b className="text-blue-300 font-mono">₩{(cfg.max_total_invest_krw || 100000).toLocaleString()}원</b> 내에서 체결된 실전 보유 종목만 100% 분리 관리합니다.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
                  <span
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md ${
                      isRealView
                        ? "bg-blue-400 text-black shadow-blue-400/30 ring-2 ring-blue-300/40"
                        : "bg-zinc-800 text-gray-400 border border-white/10 group-hover:border-blue-400/40 group-hover:text-white"
                    }`}
                  >
                    {isRealView ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                        <span>현재 열림</span>
                      </>
                    ) : (
                      <>
                        <span>창 열기</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </span>
                  {isRealView && (
                    <span className="text-[10px] text-blue-300/90 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      실시간 관제 중
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* 카드 2: AI 가상 모의투자 창 */}
            <button
              type="button"
              onClick={() => setViewWindow("PAPER")}
              className={`p-4 sm:p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer ${
                !isRealView
                  ? "bg-gradient-to-br from-amber-950/50 via-zinc-900/95 to-black border-amber-400 text-white shadow-[0_0_30px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50"
                  : "bg-zinc-950/60 border-white/10 text-gray-400 hover:border-amber-400/50 hover:bg-zinc-900/60 hover:text-gray-200"
              }`}
            >
              <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-2xl pointer-events-none transition-all ${
                !isRealView ? "bg-amber-500/15" : "bg-transparent group-hover:bg-amber-500/5"
              }`} />

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black border font-mono tracking-tight bg-amber-500/20 text-amber-300 border-amber-400/40 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>AI PAPER PORTFOLIO</span>
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      가상 시드 {paperSeedLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      🎮 AI 가상 모의투자 창 ({paperSeedLabel})
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono shrink-0 ${
                      paperPositions.length > 0
                        ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                        : "bg-zinc-800 text-gray-400"
                    }`}>
                      {paperPositions.length}종목 운용 중
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    자유로운 가상 시드로 AI 퀀트 알고리즘의 매수·익절·교체매매 실력을 실시간으로 검증하는 모의 전용 창입니다.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
                  <span
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md ${
                      !isRealView
                        ? "bg-amber-400 text-black shadow-amber-400/30 ring-2 ring-amber-300/40"
                        : "bg-zinc-800 text-gray-400 border border-white/10 group-hover:border-amber-400/40 group-hover:text-white"
                    }`}
                  >
                    {!isRealView ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                        <span>현재 열림</span>
                      </>
                    ) : (
                      <>
                        <span>창 열기</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </span>
                  {!isRealView && (
                    <span className="text-[10px] text-amber-300/90 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      실시간 관제 중
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* 4. 💎 5대 핵심 계좌 자산 프리미엄 인포그래픽 전광판 (선택된 창 기준) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
            {/* 1) 총 운용 자산 */}
            <div className="p-4 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-amber-500/40 transition-all space-y-3 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-gray-300">
                    {isRealView ? "실전 총 자산" : "가상 총 운용 자산"}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {isRealView ? `한도 ₩${(cfg.max_total_invest_krw || 100000).toLocaleString()}` : `시드 ${paperSeedLabel}`}
                </span>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                  ₩{(summary.total_equity_krw || 0).toLocaleString()}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black font-mono border flex items-center gap-0.5 ${
                    (summary.total_return_krw || 0) >= 0
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/25"
                      : "text-blue-400 bg-blue-500/10 border-blue-500/25"
                  }`}>
                    {(summary.total_return_krw || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{formatSignedKrw(summary.total_return_krw || 0)}</span>
                    <span>({(summary.total_return_pct || 0) >= 0 ? "+" : ""}{summary.total_return_pct || 0}%)</span>
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-white/5 text-[10px] text-gray-400 flex items-center justify-between">
                <span>원금 보존율</span>
                <span className="font-mono text-gray-300 font-bold">
                  {Math.max(0, 100 + Number(summary.total_return_pct || 0)).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* 2) 가용 예수금 & 자산 배분 비중 */}
            <div className="p-4 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-emerald-500/40 transition-all space-y-3 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-gray-300">
                    {isRealView ? "남은 매수 가능 한도" : "주문 가능 예수금"}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  현금 {cashPct}%
                </span>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  ₩{(summary.cash_krw || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-mono">
                  <span>주식 평가액:</span>
                  <b className="text-gray-200">₩{(summary.eval_amount_krw || 0).toLocaleString()}</b>
                </div>
              </div>

              {/* 자산 배분 듀얼 바 */}
              <div className="space-y-1 pt-1 border-t border-white/5">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                  <div className="h-full bg-emerald-400" style={{ width: `${cashPct}%` }} title={`현금 비중 ${cashPct}%`} />
                  <div className="h-full bg-blue-400" style={{ width: `${stockPct}%` }} title={`주식 비중 ${stockPct}%`} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span className="text-emerald-400">예수금 {cashPct}%</span>
                  <span className="text-blue-400">주식 {stockPct}%</span>
                </div>
              </div>
            </div>

            {/* 3) 보유 종목 실시간 평가손익 & 슬롯 현황 */}
            <div className="p-4 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-purple-500/40 transition-all space-y-3 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    (summary.unrealized_pnl_krw || 0) >= 0
                      ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                  }`}>
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-gray-300">
                    {isRealView ? "실전 종목 평가손익" : "가상 종목 평가손익"}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  실시간 5초 갱신
                </span>
              </div>

              <div>
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  (summary.unrealized_pnl_krw || 0) >= 0 ? "text-rose-400" : "text-blue-400"
                }`}>
                  {formatSignedKrw(summary.unrealized_pnl_krw || 0)}
                </div>
                <div className="text-xs text-gray-300 mt-1 flex items-center gap-1 font-mono">
                  <span>{isRealView ? "실전" : "가상"} <b>{positions.length}</b>개 / 최대 <b>{configuredMaxPos}</b>종목</span>
                </div>
              </div>

              {/* 슬롯 시각화 도트 */}
              <div className="pt-1 border-t border-white/5 space-y-1">
                <div className="flex items-center gap-1">
                  {Array.from({ length: configuredMaxPos }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 rounded-full transition-all ${
                        i < positions.length
                          ? (isRealView ? "w-3.5 bg-blue-400 shadow-sm shadow-blue-400/50" : "w-3.5 bg-amber-400 shadow-sm shadow-amber-400/50")
                          : "w-2 bg-zinc-800 border border-white/20"
                      }`}
                      title={i < positions.length ? `${positions[i]?.name || '보유 종목'}` : '매수 대기 슬롯'}
                    />
                  ))}
                  <span className="text-[10px] text-gray-400 font-mono ml-auto">
                    {waitingSlotsCount}개 대기
                  </span>
                </div>
              </div>
            </div>

            {/* 4) 누적 확정 수익 (실현손익) & 승률 */}
            <div className="p-4 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-cyan-500/40 transition-all space-y-3 shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-gray-300">누적 확정 수익</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {summary.total_trades || 0}회 매도
                </span>
              </div>

              <div>
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                  (summary.realized_pnl_krw || 0) >= 0 ? "text-rose-400" : "text-blue-400"
                }`}>
                  {formatSignedKrw(summary.realized_pnl_krw || 0)}
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 font-mono">
                  <span>승률:</span>
                  <b className="text-cyan-300">{calculatedWinRate}%</b>
                  <span className="text-gray-500">({winTrades}승 {lossTrades}패)</span>
                </div>
              </div>

              {/* 승률 미니 바 */}
              <div className="pt-1 border-t border-white/5 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                  <div className="h-full bg-cyan-400" style={{ width: `${calculatedWinRate}%` }} />
                  <div className="h-full bg-rose-500/40" style={{ width: `${100 - calculatedWinRate}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span className="text-cyan-300">익절 {winTrades}회</span>
                  <span className="text-rose-300">손절 {lossTrades}회</span>
                </div>
              </div>
            </div>

            {/* 5) 현재 관제 창 & 운전 모드 */}
            <div className="p-4 rounded-3xl bg-zinc-950/80 border border-white/10 hover:border-emerald-500/40 transition-all space-y-3 shadow-lg relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-400/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-gray-300">실시간 관제 모드</span>
                </div>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>

              <div>
                <div className="text-base sm:text-lg font-black text-amber-300 tracking-tight flex items-center gap-1.5">
                  {isRealView ? "🏦 실전 계좌 전용" : "🎮 가상 모의투자"}
                </div>
                <div className="text-xs text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <span>가동:</span>
                  <span className="text-gray-200">
                    {cfg.mode === "KIS_REAL" ? "한국투자증권 실전" : cfg.mode === "KIS_VIRTUAL" ? "한국투자증권 모의" : "서버 자율 AI 가상"}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-400">서버 상태</span>
                <span className="text-emerald-400 font-bold">NORMAL 24H</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. 현재 보유 종목 실시간 감시 & 자동 익절/손절 현황판 (선택된 창 전용) */}
        <div
          className={`rounded-3xl border p-4 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden transition-all ${
            isRealView
              ? "bg-gradient-to-b from-blue-950/30 via-zinc-900/95 to-black/95 border-blue-500/40 shadow-blue-500/5"
              : "bg-gradient-to-b from-amber-950/25 via-zinc-900/95 to-black/95 border-amber-500/40 shadow-amber-500/5"
          }`}
        >
          {/* subtle background glow mesh */}
          <div
            className={`absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
              isRealView ? "bg-blue-500/10" : "bg-amber-500/10"
            }`}
          />

          {/* 창 내부 상단 빠른 전환 탭 바 & 실시간 동기화 상태 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2 p-1 bg-black/60 rounded-2xl border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setViewWindow("REAL")}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 cursor-pointer relative ${
                  isRealView
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/40"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-blue-300" />
                <span>🏦 실전 계좌 보유 종목</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
                    isRealView ? "bg-white/20 text-white" : "bg-zinc-800 text-gray-400"
                  }`}
                >
                  {realPositions.length}
                </span>
                {isRealView && (
                  <span className="w-2 h-2 rounded-full bg-blue-300 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewWindow("PAPER")}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 cursor-pointer relative ${
                  !isRealView
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/30 border border-amber-300/60 font-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Coins className="w-4 h-4 text-amber-950" />
                <span>🎮 가상 모의투자 보유 종목</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
                    !isRealView ? "bg-black/30 text-black" : "bg-zinc-800 text-gray-400"
                  }`}
                >
                  {paperPositions.length}
                </span>
                {!isRealView && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-2 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>5초마다 실시간 시세·수익률 자동 갱신 중 ({data?.last_quote_refresh_at || "실시간"})</span>
              </span>
              <button
                type="button"
                onClick={() => fetchStatus(false)}
                title="지금 즉시 데이터 새로고침"
                className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 🏦 [신규] 한국투자증권 실전 계좌 투자 한도(내가 정한 금액) 직접 설정 & 원클릭 실전 매매 시작 바 */}
          {isRealView && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-black/60 border border-blue-500/30 space-y-3.5 relative overflow-hidden shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-black text-blue-300 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      한국투자증권(43880949-22) 실전 계좌 최대 투자 한도 설정
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[11px] font-mono font-bold">
                      지정 한도: ₩{(cfg.max_total_invest_krw || maxTotalInvestKrw || 100000).toLocaleString()}원
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                        cfg.mode === "KIS_REAL" && cfg.kis_order_enabled
                          ? "bg-emerald-400 text-black shadow-sm shadow-emerald-400/30"
                          : "bg-zinc-800 text-amber-300 border border-amber-400/40"
                      }`}
                    >
                      {cfg.mode === "KIS_REAL" && cfg.kis_order_enabled ? "🟢 실전 주문 ON (가동 중)" : "🔒 실전 주문 대기 중 (모의투자 전용)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    💡 <strong className="text-blue-200">대표님 자산 철통 보호 안전장치</strong>: 대표님 증권 계좌에 예수금이 아무리 많아도,{" "}
                    <strong className="text-white underline decoration-blue-400 underline-offset-2">
                      여기서 직접 정하신 한도 금액(예: 10만 원, 100만 원 등) 내에서만
                    </strong>{" "}
                    AI가 종목별로 안전하게 쪼개어 자동 매수·익절·손절합니다. 한도를 1원도 초과하지 않으므로 안심하고 소액부터 검증하실 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleApplyRealLimit(maxTotalInvestKrw, true)}
                  className="text-xs font-black text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Flame className="w-4 h-4 text-emerald-950" />
                  <span>이 한도(₩{(maxTotalInvestKrw || 100000).toLocaleString()}원)로 실전 자동매매 시작</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                <span className="text-[11px] text-gray-400 font-bold mr-1">⚡ 빠른 한도 선택:</span>
                {[
                  { label: "🛡️ 5만 원", val: 50000 },
                  { label: "🔥 10만 원", val: 100000 },
                  { label: "30만 원", val: 300000 },
                  { label: "50만 원", val: 500000 },
                  { label: "💎 100만 원", val: 1000000 },
                  { label: "300만 원", val: 3000000 },
                  { label: "500만 원", val: 5000000 },
                  { label: "1,000만 원", val: 10000000 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleApplyRealLimit(preset.val, false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      (cfg.max_total_invest_krw || maxTotalInvestKrw) === preset.val
                        ? "bg-blue-400 text-black shadow-md shadow-blue-400/30"
                        : "bg-zinc-900/90 text-gray-300 border border-white/10 hover:border-blue-400/60 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                  <input
                    type="number"
                    min={30000}
                    step={50000}
                    value={maxTotalInvestKrw}
                    onChange={(e) => setMaxTotalInvestKrw(Number(e.target.value))}
                    placeholder="실전 한도 금액(원)"
                    className="w-40 px-3.5 py-1.5 rounded-xl bg-black/80 border border-blue-400/40 text-blue-200 font-mono text-xs font-bold focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleApplyRealLimit(maxTotalInvestKrw, false)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs shrink-0 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    💾 한도만 저장
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 💰 [신규] AI 가상 모의투자 시드머니 직접 설정 & 원클릭 즉시 적용 바 */}
          {!isRealView && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-yellow-950/20 to-black/60 border border-amber-500/30 space-y-3.5 relative overflow-hidden shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-black text-amber-300 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-400" />
                      모의투자 시드머니(가상 원금) 내 마음대로 설정
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[11px] font-black shadow-sm">
                      현재 설정: ₩{activePaperSeed.toLocaleString()}원 ({paperSeedLabel})
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    💡 <strong className="text-amber-200">24시간 자율 AI 운용 메커니즘</strong>: 시드머니 한도 내에서 퀀트 상위 종목을 국내(4종목 60%)와 해외(3종목 40%)로 균형 분할 매수합니다. 목표 수익률(+{takeProfitPct || 2.0}%) 도달 시 즉시 익절하고,{" "}
                    <strong className="text-emerald-300">상승 탄력이 약해지면(+0.5%~+{(Number(takeProfitPct || 2.0) - 0.1).toFixed(1)}%) 알아서 조기 익절</strong>하며,{" "}
                    <strong className="text-rose-300">약세 종목(-1.0% 이하)은 강세 주도주로 실시간 교체 매매</strong>하여 계좌 수익률을 극대화합니다.
                  </p>
                </div>
                <button
                  onClick={() => handleResetPaper(paperSeedKrw)}
                  disabled={actionLoading}
                  className="text-xs font-black text-amber-200 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>현재 시드({paperSeedLabel})로 처음부터 초기화 &amp; 재매수</span>
                </button>
              </div>

              {/* AI 포트폴리오 자동 배분 인포그래픽 바 */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    AI 알고리즘 자산 자동 배분 비중
                  </span>
                  <span className="text-[10px] text-gray-500">실시간 유동성 관리</span>
                </div>
                {/* Visual Bar */}
                <div className="h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden flex shadow-inner">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: "45%" }} title="야간 미국 나스닥·NYSE 풀가동 45%" />
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: "30%" }} title="주간 국내 코스피·코스닥 탄력 예비 슬롯 30%" />
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400" style={{ width: "25%" }} title="위기대응 안전현금 버퍼 25%" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-blue-300">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    야간 미국장 풀가동 ({configuredMaxPos}개 슬롯)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    주간 국내장 탄력 예비 (+3개 슬롯)
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    위기대응 안전현금 (약 ₩{Math.round(activePaperSeed * 0.28).toLocaleString()}원)
                  </span>
                </div>
              </div>

              {/* 빠른 시드 선택 & 직접 입력 */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                <span className="text-[11px] text-gray-400 font-bold mr-1">⚡ 빠른 시드 선택:</span>
                {[
                  { label: "🔥 10만 원", val: 100000 },
                  { label: "50만 원", val: 500000 },
                  { label: "100만 원", val: 1000000 },
                  { label: "300만 원", val: 3000000 },
                  { label: "500만 원", val: 5000000 },
                  { label: "💎 1,000만 원", val: 10000000 },
                  { label: "🚀 2,000만 원", val: 20000000 },
                  { label: "5,000만 원", val: 50000000 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleApplyPaperSeed(preset.val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      activePaperSeed === preset.val
                        ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                        : "bg-zinc-900/90 text-gray-300 border border-white/10 hover:border-amber-400/60 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                  <input
                    type="number"
                    min={50000}
                    step={100000}
                    value={paperSeedKrw}
                    onChange={(e) => setPaperSeedKrw(Number(e.target.value))}
                    placeholder="원하는 시드머니(원)"
                    className="w-40 px-3.5 py-1.5 rounded-xl bg-black/80 border border-amber-400/40 text-amber-200 font-mono text-xs font-bold focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleApplyPaperSeed(paperSeedKrw)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs shrink-0 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    🚀 시드머니 즉시 적용
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Activity className={`w-5 h-5 ${isRealView ? "text-blue-400" : "text-amber-400"}`} />
                {isRealView
                  ? `🏦 한국투자증권 실전 계좌 보유·감시 종목 (${realPositions.length} / ${configuredMaxPos}개 종목 · 예비 3슬롯 탄력 운용)`
                  : `🎮 AI 가상 모의투자(${paperSeedLabel} 시드) 보유·감시 종목 (${paperPositions.length} / 기본 ${configuredMaxPos}개 + 탄력 예비 3슬롯 풀가동)`}
              </h2>
              <p className="text-xs text-gray-300 mt-1">
                {isRealView
                  ? "한국투자증권 실제 계좌(43880949-22)에서 체결된 보유 종목만 표시됩니다. (야간 미국장 7개 풀가동 + 주간 국내장 예비 3슬롯 탄력 매수)"
                  : `실제 계좌 돈이 아닌 [${paperSeedLabel}] 가상 시드머니 한도에 맞춰 AI가 매매 검증 중인 종목 목록입니다. (야간 미국장 ${configuredMaxPos}개 풀가동 운용 중 · 🇰🇷국내 개장(09:00) 시 시드머니 여유에 맞춰 탄력 예비 슬롯으로 국내 주도주 즉시 자동 매수)`}
              </p>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="py-12 text-center space-y-4 bg-zinc-950/60 rounded-3xl border border-white/5 p-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Activity className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-300">
                {isRealView
                  ? "🏦 현재 실전 계좌로 자동매수된 보유 종목이 없습니다 (0주 · 다음 정규장 개장 시 설정 한도 내에서 자동 매수 대기 중)"
                  : "현재 가상 계좌에 보유 중인 종목이 없습니다. 아래 버튼으로 1순위 후보 종목을 즉시 매수해보세요."}
              </p>
              <button
                onClick={handleRunCycleNow}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>⚡ 지금 즉시 AI 1순위 종목 스캔 &amp; 매수 시도하기</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {positions.map((pos: any, idx: number) => {
                const isRealPos = pos.trade_mode === "KIS_REAL" || String(pos.reason || "").includes("[한투주문 완료");
                const posMarket = getMarketInfo(pos.symbol);
                const details = parsePositionDetails(pos, 1355);
                const isPlus = details.pnlPct >= 0;

                const sector = pos.sector || (() => {
                  const match = String(pos.reason || "").match(/(?:해외신생|국내주도)?\s*([가-힣A-Za-z0-9\/]+)\s*(?:스마트머니|테마|주도)/);
                  return match ? match[1].trim() : (details.isUS ? "미국 혁신주" : "국내 주도주");
                })();

                const cleanSector = sector
                  .replace(/^🚀?\s*해외신생\s*·?\s*/, "")
                  .replace(/\s*\(\$[\d~]+대?\)/, "")
                  .replace(/\s*\(₩[\d~,]+대?\)/, "")
                  .trim() || (details.isUS ? "미국 혁신주" : "국내 주도주");

                const formatPrice = (p: number) => {
                  if (details.isUS) {
                    return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                  return `${Math.round(p).toLocaleString()}원`;
                };

                const formatKrw = (val: number) => `${Math.round(val).toLocaleString()}원`;

                // Gauge Position Percentage: Stop-loss (-1%) <--- Current Price ---> Take Profit (+4%)
                const totalSpan = details.targetPrice - details.stopPrice;
                let gaugePosPct = 50;
                if (totalSpan > 0) {
                  gaugePosPct = Math.max(5, Math.min(95, Math.round(((details.curPrice - details.stopPrice) / totalSpan) * 100)));
                }

                const isTargetHit = details.curPrice >= details.targetPrice;
                const distToTarget = Math.max(0, details.targetPrice - details.curPrice);
                const distToTargetKrw = Math.round(details.qty * distToTarget * (details.isUS ? 1355 : 1));

                return (
                  <div
                    key={`${pos?.symbol || "pos"}-${idx}`}
                    className="p-5 rounded-3xl bg-gradient-to-b from-zinc-900/95 via-zinc-950/90 to-black/95 border border-white/10 hover:border-emerald-500/40 transition-all space-y-4 shadow-xl relative overflow-hidden group"
                  >
                    {/* 카드 상단 배지 바 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                            isRealPos
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {isRealPos ? "🏦 실전계좌 보유" : "🎮 가상 모의투자"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border font-mono flex items-center gap-1 ${posMarket.style}`}>
                          <span>{posMarket.flag}</span>
                          <span>{posMarket.label}</span>
                          <span className="text-[9px] opacity-80 font-sans">({posMarket.isUS ? "해외" : "국내"})</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 text-[10px] font-black shrink-0">
                          {cleanSector}
                        </span>
                        <span className="text-xs text-gray-400 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-md">
                          {pos.symbol}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>24H AI 밀착 감시</span>
                      </div>
                    </div>

                    {/* 종목명 & 수익률 메인 디스플레이 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {(() => {
                          const posNameInfo = splitStockName(pos.name);
                          return (
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <h3 className="text-base sm:text-xl font-extrabold text-white leading-normal tracking-[0.03em]">
                                {posNameInfo.mainName}
                              </h3>
                              {posNameInfo.subName && (
                                <span className="text-xs sm:text-sm font-semibold text-gray-300 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-md tracking-normal">
                                  {posNameInfo.subName}
                                </span>
                              )}
                              <span className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-400/20 font-mono shrink-0 ml-1">
                                {details.qty.toLocaleString()}주 보유
                              </span>
                            </div>
                          );
                        })()}
                        <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span>매수일시: {pos.buy_time || "실시간 체결"}</span>
                          <span>·</span>
                          <span>환율: 1,355원 기준</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 whitespace-nowrap pl-2">
                        <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight flex items-center justify-end gap-1 whitespace-nowrap ${
                          isPlus ? "text-rose-400" : "text-blue-400"
                        }`}>
                          {isPlus ? <ArrowUpRight className="w-5 h-5 text-rose-400 shrink-0" /> : <ArrowDownRight className="w-5 h-5 text-blue-400 shrink-0" />}
                          <span className="whitespace-nowrap">{isPlus ? "+" : ""}{details.pnlPct.toFixed(2)}%</span>
                        </div>
                        <div className={`text-xs sm:text-sm font-black font-mono whitespace-nowrap ${isPlus ? "text-rose-300" : "text-blue-300"}`}>
                          {isPlus ? "+" : ""}{formatKrw(details.pnlKrw)}
                        </div>
                      </div>
                    </div>

                    {/* 매수원금 vs 현재평가액 4-Grid 인포박스 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-black/60 border border-white/5">
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-400 font-bold">총 매수 원금</div>
                        <div className="text-xs sm:text-sm font-black text-gray-200 font-mono">
                          ₩{formatKrw(details.totalBuyKrw)}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          단가 {formatPrice(details.avgPrice)}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-400 font-bold">현재 평가 가치</div>
                        <div className={`text-xs sm:text-sm font-black font-mono ${isPlus ? "text-rose-300" : "text-blue-300"}`}>
                          ₩{formatKrw(details.totalCurKrw)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          현재가 <b className="text-white">{formatPrice(details.curPrice)}</b>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <Target className="w-3 h-3 text-emerald-400" />
                          익절 달성 가치
                        </div>
                        <div className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                          ₩{formatKrw(details.totalBuyKrw + details.targetProfitKrw)}
                        </div>
                        <div className="text-[10px] text-emerald-400/80 font-mono">
                          목표 {formatPrice(details.targetPrice)} (+{formatKrw(details.targetProfitKrw)})
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-blue-400" />
                          손절 방어선
                        </div>
                        <div className="text-xs sm:text-sm font-black text-blue-300 font-mono">
                          {formatPrice(details.stopPrice)}
                        </div>
                        <div className="text-[10px] text-blue-400/80 font-mono">
                          최대 -{details.stopPct}% 이탈 즉시 방어
                        </div>
                      </div>
                    </div>

                    {/* 🎯 [핵심 시각화] 목표 수익 & 손절 방어 거리 게이지 바 */}
                    <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-300 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-amber-400" />
                          익절 목표 도달 게이지
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {isTargetHit ? (
                            <span className="text-rose-400 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-rose-400" />
                              목표가 돌파 완료! 즉시 자동 익절 진행 중
                            </span>
                          ) : (
                            `목표가까지 ${formatPrice(distToTarget)} 남음 (도달 시 추가 수익 +${formatKrw(distToTargetKrw)})`
                          )}
                        </span>
                      </div>

                      {/* Visual Range Track */}
                      <div className="relative h-2.5 w-full rounded-full bg-zinc-800/90 overflow-hidden border border-white/5">
                        {/* Background segments: Red left (stop zone), neutral center, green right (profit zone) */}
                        <div className="absolute inset-0 flex">
                          <div className="w-1/4 h-full bg-rose-500/20" />
                          <div className="w-2/4 h-full bg-zinc-700/30" />
                          <div className="w-1/4 h-full bg-emerald-500/25" />
                        </div>
                        {/* Progress Fill Bar */}
                        <div
                          className={`h-full transition-all duration-500 ${
                            isPlus
                              ? "bg-gradient-to-r from-amber-400 to-rose-400"
                              : "bg-gradient-to-r from-blue-500 to-amber-400"
                          }`}
                          style={{ width: `${gaugePosPct}%` }}
                        />
                      </div>

                      {/* Scale Labels */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                        <span className="text-blue-300">🛡️ 손절선 {formatPrice(details.stopPrice)} (-{details.stopPct}%)</span>
                        <span className="text-amber-200 font-bold">📍 현재가 {formatPrice(details.curPrice)} ({gaugePosPct}%)</span>
                        <span className="text-emerald-300">🎯 목표가 {formatPrice(details.targetPrice)} (+{details.targetPct}%)</span>
                      </div>
                    </div>

                    {/* AI 전략 & 선정 사유 프리미엄 마이크로 칩 */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {details.chips.map((chip, cIdx) => (
                          <span
                            key={cIdx}
                            className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold border flex items-center gap-1 ${chip.color}`}
                          >
                            <span>{chip.icon || "✨"}</span>
                            <span>{chip.label}</span>
                          </span>
                        ))}
                      </div>

                      <div className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl font-medium leading-relaxed">
                        💡 <strong className="text-emerald-200">AI 포착 사유:</strong> {pos.reason}
                      </div>
                    </div>

                    {/* 하단 원클릭 매도 및 안내 바 */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                      <div className="text-[11px] text-gray-400 hidden sm:block">
                        ✨ 상승 탄력 둔화 시(+0.5%~+{(details.targetPct - 0.1).toFixed(1)}%) AI가 자동 분할 조기 익절을 실행합니다.
                      </div>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleClosePosition(pos.symbol, pos.name)}
                        className="ml-auto px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>원클릭 즉시 시장가 매도</span>
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
          {/* 좌측: 자동매매 운전 모드 & 손익비 설정 (사령부 콘솔) */}
          <div className="rounded-3xl bg-gradient-to-b from-zinc-900/95 via-zinc-950/90 to-black/95 border border-white/10 p-5 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* 헤더 & 가동 상태 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5 tracking-tight">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400">
                    <Settings className="w-4 h-4" />
                  </div>
                  자동매매 전략 &amp; 계좌 연동 설정
                </h2>
                <p className="text-xs text-gray-400 mt-1 pl-10.5">
                  클라우드 24시간 무인 매매 엔진 · 리스크 관리 사령부
                </p>
              </div>

              <div>
                {cfg.enabled ? (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-2 shadow-lg shadow-emerald-500/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    🟢 실시간 자동매매 가동 중 (ON)
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    🛑 자동매매 일시정지 (OFF)
                  </span>
                )}
              </div>
            </div>

            {/* 🎛️ 원터치 제어 덱: 마스터 스위치 박스 */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <Power className="w-4 h-4 text-emerald-400" />
                  계좌 연동 중에도 언제든 즉시 ON / OFF 원클릭 스위치
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                실제 계좌(App Key·계좌번호)가 연동되어 있어도, 키를 삭제할 필요 없이 아래 스위치 하나로 자동매매와 실전 주문을 즉시 켜고 끌 수 있습니다.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 버튼 1: AI 자동매매 전체 마스터 전원 */}
                <button
                  type="button"
                  onClick={handleToggleBot}
                  disabled={actionLoading}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    cfg.enabled
                      ? "bg-gradient-to-r from-emerald-950/60 to-zinc-950 border-emerald-400/80 text-white shadow-xl shadow-emerald-500/10"
                      : "bg-zinc-900/60 border-rose-500/40 text-rose-200 hover:bg-rose-950/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-black flex items-center gap-1.5">
                      {cfg.enabled ? "🟢 AI 자동매매 가동 중 (ON)" : "🛑 AI 자동매매 일시정지 (OFF)"}
                    </div>
                    <div className="text-[10px] text-gray-300">
                      {cfg.enabled
                        ? "정규장 시간대에 맞춰 실시간 매수·익절 중"
                        : "클릭 시 즉시 자동매매 재개 (ON)"}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
                      cfg.enabled
                        ? "bg-emerald-400 text-black shadow-md shadow-emerald-400/30"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {cfg.enabled ? "ON (끄기)" : "OFF (켜기)"}
                  </span>
                </button>

                {/* 버튼 2: 실전·연동 계좌 주문 전송 락 스위치 */}
                <button
                  type="button"
                  onClick={handleToggleKisOrder}
                  disabled={actionLoading}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    kisOrderEnabled
                      ? "bg-gradient-to-r from-blue-950/60 to-zinc-950 border-blue-400/80 text-white shadow-xl shadow-blue-500/10"
                      : "bg-zinc-900/60 border-amber-500/40 text-amber-200 hover:bg-amber-950/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-black flex items-center gap-1.5">
                      {kisOrderEnabled ? "🔓 실전 계좌 주문 연동 (ON)" : "🔒 실전 계좌 주문 잠금 (OFF)"}
                    </div>
                    <div className="text-[10px] text-gray-300">
                      {kisOrderEnabled
                        ? "실전 모드 선택 시 한투 실제 계좌로 체결 전송"
                        : "계좌 정보는 안전 보관, 모의투자만 실행"}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
                      kisOrderEnabled
                        ? "bg-blue-400 text-black shadow-md shadow-blue-400/30"
                        : "bg-amber-400 text-black"
                    }`}
                  >
                    {kisOrderEnabled ? "연동 ON" : "잠금 OFF"}
                  </span>
                </button>
              </div>
            </div>

            {/* 1) 자동매매 운전 모드 선택 (3대 모드) */}
            <div className="space-y-2.5 relative z-10">
              <label className="text-xs font-black text-gray-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                1) 자동매매 운전 모드 선택
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "AI_PAPER",
                    title: "⚡ AI 가상 모의투자",
                    tag: "무위험 실전 테스트",
                    desc: "API 없이 가상 시드머니로 24시간 실전 호가 매매 검증",
                    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-400/30",
                  },
                  {
                    id: "KIS_VIRTUAL",
                    title: "🧪 한투 모의투자 API",
                    tag: "한투 모의계좌 연동",
                    desc: "한국투자증권 모의투자 계좌로 24시간 자동 주문 전송",
                    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-400/30",
                  },
                  {
                    id: "KIS_REAL",
                    title: "🔥 한투 실전투자 API",
                    tag: "실제 계좌 자금 매매",
                    desc: "한국투자증권 실전 계좌에 실제 자금으로 24시간 자동 매매",
                    badgeColor: "bg-blue-500/15 text-blue-300 border-blue-400/30",
                  },
                ].map((m) => {
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? "bg-gradient-to-b from-emerald-500/20 via-zinc-900 to-zinc-950 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xl shadow-emerald-500/10"
                          : "bg-zinc-950/70 border-white/10 text-gray-400 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                          {m.tag}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 선택됨
                          </span>
                        )}
                      </div>
                      <div className={`text-xs font-black ${isSelected ? "text-white" : "text-gray-300"}`}>
                        {m.title}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 leading-snug">{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2) 💰 실제·연동 계좌 자동매매 최대 총 투자 한도 설정 (안전 예산 보호랩) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-950/40 via-zinc-950 to-zinc-950 border border-blue-500/40 space-y-3.5 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-blue-300 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-blue-400" />
                    2) 투자 한도 &amp; 예산 배분 스마트 시뮬레이터 (안전 예산 보호캡)
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1 leading-snug">
                    실제 증권사 계좌에 큰 금액(예: 5,000만 원)이 들어있어도, 여기서 정하신{" "}
                    <span className="text-blue-300 font-black underline underline-offset-2">
                      {maxTotalInvestKrw > 0 ? `${maxTotalInvestKrw.toLocaleString()}원` : "계좌 전체 잔고(무제한)"}
                    </span>{" "}
                    한도 내에서만 AI가 매매하며, 나머지 계좌 예수금은 절대 건드리지 않습니다!
                  </p>
                </div>
              </div>

              {/* 빠른 한도 금액 프리셋 칩 */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "🔥 10만원 (소액 시작)", val: 100000, pos: 2, order: 50000 },
                  { label: "30만원", val: 300000, pos: 3, order: 100000 },
                  { label: "50만원", val: 500000, pos: 4, order: 125000 },
                  { label: "100만원", val: 1000000, pos: 5, order: 200000 },
                  { label: "300만원", val: 3000000, pos: 6, order: 500000 },
                  { label: "500만원", val: 5000000, pos: 7, order: 700000 },
                  { label: "1,000만원", val: 10000000, pos: 10, order: 1000000 },
                  { label: "한도 제한 없음", val: 0, pos: 10, order: 1000000 },
                ].map((preset) => {
                  const isPresetActive = maxTotalInvestKrw === preset.val;
                  return (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => {
                        setMaxTotalInvestKrw(preset.val);
                        if (preset.val > 0) {
                          setMaxPositions(preset.pos);
                          setOrderAmountKrw(preset.order);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        isPresetActive
                          ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/25 scale-[1.02]"
                          : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-blue-400/50 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* 수치 입력 & 자동 분할 박스 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-blue-200 block mb-1">
                    AI 자동매매 총 운용 한도 금액 (원, 0=무제한)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={maxTotalInvestKrw}
                      onChange={(e) => setMaxTotalInvestKrw(Math.max(0, Number(e.target.value)))}
                      step={50000}
                      className="w-full bg-zinc-950 border border-blue-500/40 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-blue-300 focus:outline-none focus:border-blue-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-bold">원</span>
                  </div>
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
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-40 border border-blue-400/40 text-blue-200 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    한도를 {maxPositions}종목으로 자동 균등 분할
                    <span className="text-white font-mono">
                      (1종목당{" "}
                      {maxTotalInvestKrw > 0
                        ? `${Math.floor(maxTotalInvestKrw / Math.max(1, maxPositions)).toLocaleString()}원`
                        : "-"}
                      )
                    </span>
                  </button>
                </div>
              </div>

              {/* 실시간 한도 소진율 게이지 */}
              {maxTotalInvestKrw > 0 && (
                <div className="pt-2 space-y-1.5 border-t border-blue-500/20">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-300">
                      현재 AI 자동매매 투입 원금:{" "}
                      <strong className="text-white font-mono">
                        {Number(summary?.invested_principal_krw || 0).toLocaleString()}원
                      </strong>
                    </span>
                    <span className="text-emerald-300 font-bold">
                      남은 매수 가능 한도:{" "}
                      <strong className="font-mono text-emerald-400">
                        {Math.max(0, maxTotalInvestKrw - Number(summary?.invested_principal_krw || 0)).toLocaleString()}원
                      </strong>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 transition-all duration-500 shadow-md shadow-emerald-500/20"
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

            {/* 3) 매매 대상 시장 & 종목당 매수 금액 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
              <div>
                <label className="text-xs font-black text-gray-200 block mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  3) 매매 대상 시장 (시간대별 자동 스위칭)
                </label>
                <select
                  value={marketTarget}
                  onChange={(e) => setMarketTarget(e.target.value)}
                  className="w-full bg-zinc-950 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="ALL">🌍 시간대별 자동 (주간 08~17시 🇰🇷국내장 / 야간 17~08시 🇺🇸미국장)</option>
                  <option value="KR_ONLY">🇰🇷 국내 주식만 고정 (코스피·코스닥 전용)</option>
                  <option value="US_ONLY">🇺🇸 미국 주식만 고정 (나스닥·뉴욕 전용)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-gray-200 block mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                  1종목당 기본 매수 배분액 (원)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={orderAmountKrw}
                    onChange={(e) => setOrderAmountKrw(Number(e.target.value))}
                    step={100000}
                    className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-bold">원</span>
                </div>
              </div>
            </div>

            {/* 4) 손익 관리 & 안전 가드 */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/30 via-zinc-950 to-zinc-950 border border-emerald-500/30 space-y-3.5 relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    4) 손절(손해 확정) 작동 방식 &amp; 안심 가드
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1 leading-snug">
                    {!useStopLoss
                      ? "✅ 현재 [무손절 · 익절 전용 모드]: 주가가 일시 하락해도 절대 손해 보고 팔지 않으며, 반등하여 목표 수익률에 도달했을 때만 매도합니다."
                      : `⚠️ 현재 [단타 칼손절 모드]: 주가가 -${stopLossPct}% 하락하면 즉시 시장가로 손절 매도하고 다른 주도주로 교체합니다.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUseStopLoss(false)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    !useStopLoss
                      ? "bg-gradient-to-r from-emerald-500/20 to-zinc-900 border-emerald-400 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/40"
                      : "bg-zinc-950/70 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-black text-emerald-300 flex items-center justify-between">
                    <span>🛡️ 무손절 · 익절 전용 (추천)</span>
                    {!useStopLoss && <span className="text-[10px] text-emerald-400">✓ 활성</span>}
                  </div>
                  <div className="text-[10px] text-gray-300 mt-1">
                    손해 보고는 절대 안 팦! 기다렸다가 수익 날 때만 익절
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUseStopLoss(true)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    useStopLoss
                      ? "bg-gradient-to-r from-blue-500/20 to-zinc-900 border-blue-400 text-white shadow-lg shadow-blue-950/50 ring-1 ring-blue-400/40"
                      : "bg-zinc-950/70 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-black text-blue-300 flex items-center justify-between">
                    <span>⚡ 단타 칼손절 회전 모드</span>
                    {useStopLoss && <span className="text-[10px] text-blue-400">✓ 활성</span>}
                  </div>
                  <div className="text-[10px] text-gray-300 mt-1">
                    -{stopLossPct}% 도달 시 즉시 던지고 다른 주도주 교체
                  </div>
                </button>
              </div>

              {!useStopLoss && (
                <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 cursor-pointer hover:bg-emerald-500/15 transition-all">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-emerald-200 block">
                      💧 -5% 이상 일시 하락 시 1회 자동 물타기 가드
                    </span>
                    <span className="text-[10px] text-gray-300 block">
                      단기 급락 시 여유 현금으로 단 1회만 분할 매수하여 평단가를 크게 낮추고 더 빠른 익절을 유도합니다.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoAveragingDown}
                    onChange={(e) => setAutoAveragingDown(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                </label>
              )}

              {/* 수치 입력: 익절률 / 손절률 / 보유 종목수 */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-zinc-950 border border-rose-500/30">
                  <label className="text-[11px] font-bold text-rose-300 block mb-1">
                    🎯 목표 익절률 (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-rose-500/30 rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-rose-300 focus:outline-none"
                  />
                  <div className="text-[9px] text-gray-400 mt-1">권장: +2.0% (단기 빠른 회전율 극대화)</div>
                </div>

                <div className={`p-3 rounded-xl bg-zinc-950 border ${useStopLoss ? "border-blue-500/40" : "border-white/10 opacity-50"}`}>
                  <label className="text-[11px] font-bold text-blue-300 block mb-1">
                    {useStopLoss ? "🛡️ 자동 칼손절 (%)" : "🛡️ 손절 (꺼짐)"}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!useStopLoss}
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-blue-300 focus:outline-none"
                  />
                  <div className="text-[9px] text-gray-400 mt-1">단타 손절 시에만 적용</div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-emerald-300">📈 최대 종목수</label>
                    <div className="flex gap-1">
                      {[5, 7, 10].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setMaxPositions(cnt)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                            maxPositions === cnt
                              ? "bg-emerald-500 text-black font-black"
                              : "bg-white/10 text-gray-300 hover:text-white"
                          }`}
                        >
                          {cnt}개
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxPositions}
                    onChange={(e) => setMaxPositions(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-emerald-300 focus:outline-none"
                  />
                  <div className="text-[9px] text-gray-400 mt-1">동시 보유 최대 개수</div>
                </div>
              </div>
            </div>

            {/* 5) 한국투자증권 OpenAPI 보안 금고 */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3 relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-300 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" /> 한국투자증권(KIS) 24시간 무인 주문 API 키
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-black border flex items-center gap-1.5 ${
                      summary.kis_configured
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-sm shadow-emerald-500/20"
                        : "bg-rose-500/20 text-rose-300 border-rose-400/50"
                    }`}
                  >
                    {summary.kis_configured ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        서버 보안 금고 영구 보관됨 (재입력 불필요 ✓)
                      </>
                    ) : (
                      "⚠️ APP KEY / SECRET 1회 등록 필요"
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKisModal(!showKisModal)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    {showKisModal ? "닫기 ▲" : "설정 열기 ▼"}
                  </button>
                </div>
              </div>

              {showKisModal && (
                <div className="space-y-2.5 pt-3 border-t border-white/10">
                  {summary.kis_configured ? (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200 font-bold">
                      ✅ 현재 서버 보안 금고(`kis_credentials_vault`)에 대표님의 계좌번호(`{kisAccountNo || "43880949-22"}`)와 API 키가 안전하게 영구 암호화 저장되어 있습니다. 다시 입력하지 않으셔도 24시간 자동 유지됩니다!
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs text-amber-200 font-bold">
                      💡 계좌번호(`43880949-22`)는 자동 입력되어 있습니다. 아래 <b>APP KEY</b>와 <b>APP SECRET</b>을 딱 한 번만 붙여넣고 <b>[💾 저장하기]</b>를 눌러주시면, 영구 금고 파일에 잠금 보관되어 다시는 지워지지 않습니다!
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="KIS 계좌번호 (예: 43880949-22)"
                    value={kisAccountNo || "43880949-22"}
                    onChange={(e) => setKisAccountNo(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder={summary.kis_configured ? "🟢 서버 금고에 APP KEY 보관 중 (변경 시에만 새 키 입력)" : "KIS APP KEY 붙여넣기 (최초 1회)"}
                    value={kisAppKey}
                    onChange={(e) => setKisAppKey(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder={summary.kis_configured ? "🟢 서버 금고에 APP SECRET 보관 중 (변경 시에만 새 키 입력)" : "KIS APP SECRET 붙여넣기 (최초 1회)"}
                    value={kisAppSecret}
                    onChange={(e) => setKisAppSecret(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* 저장 및 원클릭 액션 바 */}
            <div className="pt-2 space-y-2 relative z-10">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-black" />
                💾 위 자동매매 전략 및 계좌 설정 저장하기
              </button>
              <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span>클라우드 서버에 실시간 동기화됩니다.</span>
                <button
                  type="button"
                  onClick={handleRunCycleNow}
                  disabled={actionLoading}
                  className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                >
                  ⚡ 지금 즉시 AI 타점 스캔 1회 수동 실행
                </button>
              </div>
            </div>
          </div>

          {/* 우측: AI 실시간 종목 발굴 레이더 Top 10 (시간대별 국내장·미국장 자동 스위칭) */}
          <div className="rounded-3xl bg-gradient-to-b from-zinc-900/95 via-zinc-950/90 to-black/95 border border-white/10 p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* 헤더 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5 tracking-tight">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-sm">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  AI 로봇 실시간 매수 타점 레이더 Top 10
                </h2>
                <p className="text-xs text-gray-400 mt-1 pl-10.5">
                  현재 열리는 주식시장 시간대에 맞춰 AI가 즉시 매수·익절할 최우선 10대 종목
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-900 border border-white/10 text-gray-300 flex items-center gap-1.5 shadow-sm">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  최근 스캔: {data?.last_cycle_at?.slice(11) || "실시간"}
                </span>
                <button
                  type="button"
                  onClick={() => fetchStatus(false)}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm"
                  title="지금 새로고침"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
                </button>
              </div>
            </div>

            {/* 🕒 시간대별 자동 스위칭 세션 상태 배너 */}
            <div
              className={`p-4 rounded-2xl border flex flex-col gap-2 relative z-10 shadow-lg ${
                data?.session_info?.active_market === "US"
                  ? "bg-gradient-to-r from-indigo-950/70 via-zinc-950/90 to-zinc-950 border-indigo-500/40 text-indigo-200 shadow-indigo-500/5"
                  : "bg-gradient-to-r from-emerald-950/70 via-zinc-950/90 to-zinc-950 border-emerald-500/40 text-emerald-200 shadow-emerald-500/5"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  {data?.session_info?.session_badge ||
                    "🕒 시간대별 국내장(08~17시) · 미국장(17~08시) 자동 스위칭 가동 중"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/10 text-white font-mono border border-white/10">
                  주간 08~17시 🇰🇷한국장 / 야간 17~08시 🇺🇸미국장
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-snug">
                {data?.session_info?.session_desc ||
                  "주간(08:00~17:00)에는 국내 주도주 Top 10을, 야간(17:00~08:00)에는 해외·미국 급등주 Top 10을 후보군에 올려 24시간 쉬지 않고 자동 매수·익절 매도합니다."}
              </p>
            </div>

            {/* Top 10 종목 카드 목록 (프리미엄 퀀트 레이더 디자인) */}
            <div className="space-y-3 relative z-10">
              {candidates.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-950/50 border border-white/5 text-center text-gray-400 space-y-2">
                  <Bot className="w-8 h-8 text-gray-500 mx-auto animate-pulse" />
                  <p className="text-sm font-bold">실시간 시장 종목 스캔 중...</p>
                  <p className="text-xs text-gray-500">잠시 후 AI 퀀트 알고리즘이 발굴한 최우선 10대 종목이 표시됩니다.</p>
                </div>
              ) : (
                candidates.slice(0, 10).map((cand: any, idx: number) => {
                  const fxRate = data?.session_info?.fx_rate || 1355;
                  const krwEquiv = cand.is_us ? Math.round((cand.price || 0) * fxRate) : cand.price;
                  const candMarket = getMarketInfo(cand.symbol);
                  const parsed = parseCandidateReason(cand.reason);
                  const isPositive = Number(cand.change_pct || 0) >= 0;

                  // 🎯 AI 목표가 & 손절가 & 1회 권장 매수량 계산
                  const targetPct = Number(data?.config?.take_profit_pct || takeProfitPct || 4.0);
                  const stopPct = Number(data?.config?.stop_loss_pct || (useStopLoss ? stopLossPct : 1.0) || 1.0);

                  // 대표님의 총 운용자산(1,000만원) 및 7종목 균등 분할 고려
                  const totalSeedOrLimit = Math.max(
                    Number(data?.config?.max_total_invest_krw || 0),
                    Number(data?.config?.paper_seed_krw || 0),
                    activePaperSeed,
                    10000000
                  );
                  const maxPos = Number(data?.config?.max_positions || maxPositions || 7);
                  const evenAllocKrw = Math.floor(totalSeedOrLimit / Math.max(1, maxPos)); // 1000만원 / 7 ≈ 142만원

                  // 설정된 1회 주문금액이 너무 작으면(소액 테스트 잔여값 등) 7종목 균등 분할액(약 140만원) 자동 적용
                  const rawOrderBudget = Number(data?.config?.order_amount_krw || orderAmountKrw || 0);
                  const orderBudgetKrw = rawOrderBudget >= 200000 ? rawOrderBudget : evenAllocKrw;

                  const unitPriceKrw = cand.is_us ? Math.round((cand.price || 0) * fxRate) : (cand.price || 0);

                  const targetPrice = cand.is_us
                    ? Number(((cand.price || 0) * (1 + targetPct / 100)).toFixed(2))
                    : Math.round((cand.price || 0) * (1 + targetPct / 100));
                  const targetUpside = cand.is_us
                    ? Number((targetPrice - (cand.price || 0)).toFixed(2))
                    : Math.round(targetPrice - (cand.price || 0));

                  const stopPrice = cand.is_us
                    ? Number(((cand.price || 0) * (1 - stopPct / 100)).toFixed(2))
                    : Math.round((cand.price || 0) * (1 - stopPct / 100));
                  const stopDownside = cand.is_us
                    ? Number(((cand.price || 0) - stopPrice).toFixed(2))
                    : Math.round((cand.price || 0) - stopPrice);

                  const recShares = unitPriceKrw > 0 ? Math.floor(orderBudgetKrw / unitPriceKrw) : 0;
                  const recAmountKrw = recShares * unitPriceKrw;
                  const rrRatio = stopPct > 0 ? (targetPct / stopPct).toFixed(1) : "4.0";

                  // [핵심] 예상 수익금 및 손실 제한금 계산 (미국주는 달러 * 환율 적용하여 실제 원화 단위로 정확히 표시!)
                  const expectedProfitKrw = cand.is_us
                    ? Math.round(targetUpside * recShares * fxRate)
                    : Math.round(targetUpside * recShares);
                  const expectedProfitUsd = cand.is_us
                    ? Number((targetUpside * recShares).toFixed(1))
                    : 0;

                  const expectedLossKrw = cand.is_us
                    ? Math.round(stopDownside * recShares * fxRate)
                    : Math.round(stopDownside * recShares);
                  const expectedLossUsd = cand.is_us
                    ? Number((stopDownside * recShares).toFixed(1))
                    : 0;

                  // 순위 뱃지 스타일링 (1위 골드, 2위 실버, 3위 브론즈)
                  const rankBadgeClass =
                    idx === 0
                      ? "bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black font-black shadow-md shadow-amber-500/25 border border-amber-300/60"
                      : idx === 1
                      ? "bg-gradient-to-r from-slate-200 via-zinc-200 to-slate-400 text-black font-black shadow-md shadow-zinc-400/20 border border-slate-300/60"
                      : idx === 2
                      ? "bg-gradient-to-r from-amber-700 via-orange-600 to-amber-600 text-white font-black shadow-md shadow-orange-500/20 border border-amber-500/40"
                      : "bg-zinc-800/90 text-gray-300 font-bold border border-white/10";

                  const rankMedal = idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`;

                  return (
                    <div
                      key={`${cand?.symbol || "cand"}-${idx}`}
                      className="p-4 sm:p-5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/95 border border-white/10 hover:border-emerald-500/40 transition-all duration-200 shadow-xl group relative overflow-hidden space-y-3"
                    >
                      {/* 1~3위 배경 미세 글로우 */}
                      {idx === 0 && <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />}
                      {idx === 1 && <div className="absolute top-0 right-0 w-48 h-48 bg-slate-300/5 rounded-full blur-2xl pointer-events-none" />}
                      {idx === 2 && <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />}

                      {/* 1. 상단: 순위, 마켓, 종목명 (넓은 자간 및 부제 분리), 심볼, AI 스코어 */}
                      {(() => {
                        const nameInfo = splitStockName(cand.name);
                        return (
                          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-white/[0.08] relative z-10">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 tracking-wider shadow-sm ${rankBadgeClass}`}>
                                {rankMedal}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-black border font-mono shrink-0 flex items-center gap-1.5 shadow-2xs ${candMarket.style}`}
                              >
                                <span>{candMarket.flag}</span>
                                <span className="tracking-wide">{candMarket.label}</span>
                              </span>

                              {/* 종목명 (쾌적한 자간 + 부제/테마 뱃지 분리) */}
                              <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 min-w-0">
                                <span
                                  className="font-extrabold text-white text-base sm:text-lg group-hover:text-emerald-300 transition-colors tracking-[0.03em] leading-normal"
                                  title={cand.name}
                                >
                                  {nameInfo.mainName}
                                </span>
                                {nameInfo.subName && (
                                  <span className="text-xs sm:text-sm font-semibold text-gray-300 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-md tracking-normal">
                                    {nameInfo.subName}
                                  </span>
                                )}
                              </div>

                              {/* 티커 심볼 뱃지 */}
                              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-zinc-800/90 border border-white/15 text-emerald-400/90 tracking-wider shrink-0 shadow-2xs">
                                {cand.symbol}
                              </span>
                            </div>

                            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 shrink-0 shadow-sm tracking-wide">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                              AI {cand.ai_score || 99}점
                            </span>
                          </div>
                        );
                      })()}

                      {/* 2. 시세 & 1회 권장 매수량 히어로 박스 */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 relative z-10">
                        {/* 실시간 현재가 & 당일 등락률 */}
                        <div className="flex items-baseline gap-2.5 font-mono">
                          <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                            {cand.is_us ? `$${Number(cand.price || 0).toLocaleString()}` : `₩${Number(cand.price || 0).toLocaleString()}`}
                          </span>
                          {cand.is_us && (
                            <span className="text-xs text-gray-400 font-bold">
                              ≈ ₩{krwEquiv?.toLocaleString()}
                            </span>
                          )}
                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 ${
                              isPositive
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            <span>{isPositive ? "▲" : "▼"}</span>
                            <span>{isPositive ? "+" : ""}{cand.change_pct}%</span>
                          </span>
                        </div>

                        {/* 1회 권장 매수량 (총 자산 1,000만원 기준 1종목당 140만원 배분) */}
                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-gray-400 font-bold flex items-center justify-end gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            <span>1회 권장 매수 (1종목 {Math.round(orderBudgetKrw / 10000)}만원 배정)</span>
                          </div>
                          <div className="font-mono text-sm sm:text-base font-black text-amber-300 mt-0.5">
                            {recShares > 0 ? (
                              <>
                                <span className="text-amber-300 font-black">{recShares.toLocaleString()}주</span>
                                <span className="text-xs text-gray-300 ml-1.5 font-bold">
                                  (약 {Math.round(recAmountKrw / 10000).toLocaleString()}만원)
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs">예산 조정 필요</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. AI 퀀트 익절 목표가 & 손절 방어선 듀얼 카드 (2열 와이드 그리드) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
                        {/* 🎯 AI 익절 목표가 */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/25 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              AI 익절 목표 (+{targetPct}%)
                            </span>
                            {recShares > 0 && (
                              <span className="text-[11px] text-emerald-300 font-extrabold bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 rounded-md font-mono">
                                +약 ₩{expectedProfitKrw.toLocaleString()}원{cand.is_us ? ` (+$${expectedProfitUsd})` : ""} 기대
                              </span>
                            )}
                          </div>
                          <div className="font-mono font-black text-emerald-400 text-base sm:text-lg flex items-baseline gap-1.5">
                            <span>{cand.is_us ? `$${targetPrice}` : `₩${targetPrice.toLocaleString()}`}</span>
                            <span className="text-xs text-emerald-300/80 font-normal">
                              (+{cand.is_us ? `$${targetUpside}` : `₩${targetUpside.toLocaleString()}`})
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            목표 도달 시 AI가 전량 자동 익절 매도
                          </div>
                        </div>

                        {/* 🛡️ AI 방어 손절선 */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-blue-500/[0.07] border border-blue-500/25 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              AI 방어 손절선 (-{stopPct}%)
                            </span>
                            {recShares > 0 && (
                              <span className="text-[11px] text-blue-300 font-extrabold bg-blue-500/15 border border-blue-400/30 px-2 py-0.5 rounded-md font-mono">
                                -약 ₩{expectedLossKrw.toLocaleString()}원{cand.is_us ? ` (-$${expectedLossUsd})` : ""} 제한
                              </span>
                            )}
                          </div>
                          <div className="font-mono font-black text-blue-400 text-base sm:text-lg flex items-baseline gap-1.5">
                            <span>{cand.is_us ? `$${stopPrice}` : `₩${stopPrice.toLocaleString()}`}</span>
                            <span className="text-xs text-blue-300/80 font-normal">
                              (-{cand.is_us ? `$${stopDownside}` : `₩${stopDownside.toLocaleString()}`})
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            급락 리스크 발생 시 즉시 원금 방어 손절
                          </div>
                        </div>
                      </div>

                      {/* 4. AI 시그널 브리핑 칩 */}
                      {parsed.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5 relative z-10">
                          {parsed.chips.map((chip, cIdx) => (
                            <span
                              key={cIdx}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-xs ${chip.color}`}
                            >
                              {chip.icon && <span>{chip.icon}</span>}
                              <span>{chip.label}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 5. 기술 지표 요약 (5·20일선 잘림 방지 완료) */}
                      {parsed.techSummary && (
                        <div className="text-xs text-gray-300 bg-white/[0.03] border border-white/10 rounded-xl p-2.5 flex items-center gap-2 font-mono relative z-10">
                          <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-gray-400 font-bold shrink-0">기술 지표:</span>
                          <span className="text-gray-200 font-medium truncate">{parsed.techSummary}</span>
                        </div>
                      )}

                      {/* 부가 브리핑 텍스트 */}
                      {parsed.text && parsed.text.length >= 4 && (
                        <p className="text-xs text-gray-400 pl-1 leading-relaxed relative z-10 tracking-normal">
                          💡 {parsed.text}
                        </p>
                      )}

                      {/* 6. 사용자 편의 액션 바: 차트 보기 & 종목코드 복사 & 손익비 지표 */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs relative z-10">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/stock/${cand.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-emerald-600 hover:text-white text-gray-200 text-xs font-bold transition-all border border-white/10 hover:border-emerald-500 shadow-sm cursor-pointer group/btn"
                          >
                            <BarChart2 className="w-3.5 h-3.5 text-emerald-400 group-hover/btn:text-white" />
                            <span>차트·호가 상세</span>
                            <ExternalLink className="w-3 h-3 opacity-60 group-hover/btn:opacity-100" />
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => handleCopySymbol(e, cand.symbol)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white text-xs font-mono transition-all border border-white/10 cursor-pointer"
                            title="종목코드 복사"
                          >
                            {copiedSymbol === cand.symbol ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">복사됨</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>코드 복사</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="text-xs text-gray-400 font-mono hidden sm:flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400/80 inline-block animate-pulse" />
                          <span>손익비 {rrRatio}:1 퀀트 타점</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3. 로봇 자동 매수·매도 실시간 체결 일지 (초프리미엄 퀀트 트레이딩 저널) */}
        <div className="rounded-3xl bg-gradient-to-b from-zinc-900/95 via-zinc-950/90 to-black/95 border border-white/10 p-5 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* 헤더 & 실시간 상태 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5 tracking-tight">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-sm">
                  <Coins className="w-4 h-4" />
                </div>
                로봇 자동 매수·매도 실시간 체결 일지
              </h2>
              <p className="text-xs text-gray-400 mt-1 pl-10.5">
                AI 퀀트 알고리즘이 24시간 동안 실시간으로 판단하여 진입·청산한 모든 체결 영수증
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-900 border border-white/10 text-gray-300 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                실시간 기록 중: 총 {tradeLogs.length}건
              </span>
            </div>
          </div>

          {/* 🌟 체결 성과 KPI 4대 지표 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
            {/* 누적 실현 손익 */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-1 shadow-md">
              <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>누적 실현 손익</span>
              </div>
              <div
                className={`text-base sm:text-xl font-black font-mono tracking-tight ${
                  totalRealizedPnl >= 0 ? "text-rose-400" : "text-blue-400"
                }`}
              >
                {totalRealizedPnl >= 0 ? "+" : ""}
                {totalRealizedPnl.toLocaleString()}원
              </div>
              <div className="text-[10px] text-gray-400 font-medium">
                {sellCount > 0 ? `매도 ${sellCount}건 정산 완료` : "매도 대기 중"}
              </div>
            </div>

            {/* 매매 승률 */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-1 shadow-md">
              <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>체결 승률 (Win Rate)</span>
              </div>
              <div className="text-base sm:text-xl font-black font-mono text-amber-300 tracking-tight">
                {winRate}%
              </div>
              <div className="text-[10px] text-gray-400 font-medium">
                {profitCount}승 {lossCount}패 (익절 비중)
              </div>
            </div>

            {/* 누적 회전 거래대금 */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-1 shadow-md">
              <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>총 체결 회전액</span>
              </div>
              <div className="text-base sm:text-xl font-black font-mono text-cyan-300 tracking-tight">
                {totalVolumeKrw >= 100000000
                  ? `${(totalVolumeKrw / 100000000).toFixed(1)}억원`
                  : totalVolumeKrw >= 10000
                  ? `${Math.round(totalVolumeKrw / 10000).toLocaleString()}만원`
                  : `${totalVolumeKrw.toLocaleString()}원`}
              </div>
              <div className="text-[10px] text-gray-400 font-medium">
                매수 {buyCount}건 · 매도 {sellCount}건
              </div>
            </div>

            {/* 최고 수익 거래 */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-1 shadow-md">
              <div className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>최고 수익 거래</span>
              </div>
              <div className="text-xs sm:text-sm font-black text-white truncate" title={bestTrade?.name}>
                {bestTrade ? bestTrade.name : "체결 대기"}
              </div>
              <div className="text-[11px] font-black font-mono text-rose-400">
                {bestTrade ? `+${(bestTrade.pnl_krw || 0).toLocaleString()}원 (+${bestTrade.pnl_pct}%)` : "-"}
              </div>
            </div>
          </div>

          {/* 🎛️ 필터 탭 바 & 실시간 검색창 툴바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            {/* 탭 바: 전체 / 매수 / 익절 / 손절방어 */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/90 border border-white/10 self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setLogFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  logFilter === "ALL"
                    ? "bg-zinc-800 text-white shadow-sm font-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                전체 ({tradeLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("BUY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  logFilter === "BUY"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black shadow-sm"
                    : "text-gray-400 hover:text-emerald-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                매수 ({buyCount})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("PROFIT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  logFilter === "PROFIT"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black shadow-sm"
                    : "text-gray-400 hover:text-rose-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                익절 성공 ({profitCount})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("LOSS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  logFilter === "LOSS"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 font-black shadow-sm"
                    : "text-gray-400 hover:text-blue-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                리스크 방어 ({lossCount})
              </button>
            </div>

            {/* 실시간 종목명/티커 검색창 */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="종목명·티커·사유 실시간 검색..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full bg-zinc-950/90 border border-white/10 hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-all font-medium"
              />
              {logSearch && (
                <button
                  type="button"
                  onClick={() => setLogSearch("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white text-xs cursor-pointer p-0.5"
                  title="검색어 지우기"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 체결 일지 카드 목록 */}
          {filteredLogs.length === 0 ? (
            <div className="py-14 text-center text-gray-500 space-y-3 rounded-2xl bg-zinc-950/40 border border-white/5">
              <Bot className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-sm font-bold text-gray-400">
                {logSearch ? `"${logSearch}" 검색 결과가 없습니다.` : "조건에 해당하는 매매 체결 내역이 없습니다."}
              </p>
              {logSearch && (
                <button
                  type="button"
                  onClick={() => setLogSearch("")}
                  className="text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  검색어 초기화
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar relative z-10">
              {filteredLogs.map((log: any, idx: number) => {
                const formatted = formatTradeReason(log?.reason);
                const isBuy = log?.action === "BUY";
                const isProfit = (log?.pnl_krw ?? 0) >= 0;
                const logMarket = getMarketInfo(log?.symbol, log?.reason);

                return (
                  <div
                    key={`${log?.id || "log"}-${idx}`}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 shadow-md hover:shadow-xl space-y-3 relative overflow-hidden group ${
                      isBuy
                        ? "bg-gradient-to-r from-emerald-950/20 via-zinc-950 to-zinc-950 border-emerald-500/20 hover:border-emerald-500/40"
                        : isProfit
                        ? "bg-gradient-to-r from-rose-950/20 via-zinc-950 to-zinc-950 border-rose-500/25 hover:border-rose-500/50"
                        : "bg-gradient-to-r from-blue-950/20 via-zinc-950 to-zinc-950 border-blue-500/25 hover:border-blue-500/50"
                    }`}
                  >
                    {/* 미세 글로우 */}
                    <div
                      className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20 ${
                        isBuy ? "bg-emerald-500" : isProfit ? "bg-rose-500" : "bg-blue-500"
                      }`}
                    />

                    {/* Row 1: 거래 분류 뱃지 + 종목명/코드 + 수량 + 체결 시간 + 실현 손익 / 체결 금액 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                      {/* 좌측: 체결 뱃지 + 마켓 + 종목명 + 수량 */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span
                          className={`px-2.5 py-1 rounded-xl font-black text-xs shrink-0 flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : isProfit
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isBuy ? "bg-emerald-400" : isProfit ? "bg-rose-400 animate-pulse" : "bg-blue-400"
                            }`}
                          />
                          {isBuy ? "⚡ 자동 매수" : isProfit ? "🎯 자동 익절" : "🛡️ 리스크 매도"}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border font-mono shrink-0 flex items-center gap-1 ${logMarket.style}`}
                        >
                          <span>{logMarket.flag}</span>
                          <span>{logMarket.label}</span>
                        </span>

                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span
                            className="font-black text-white text-base sm:text-lg group-hover:text-emerald-300 transition-colors whitespace-nowrap"
                            title={log.name}
                          >
                            {log.name}
                          </span>
                          <span className="text-xs text-gray-400 font-mono font-bold shrink-0">
                            {log.symbol}
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-white/10 text-amber-300 font-black font-mono text-xs whitespace-nowrap">
                          {log.qty?.toLocaleString()}주
                        </span>

                        <span className="px-2 py-0.5 rounded-lg bg-zinc-900/80 border border-white/5 text-gray-400 font-mono text-[11px] whitespace-nowrap hidden sm:inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          {log.timestamp}
                        </span>
                      </div>

                      {/* 우측: 체결단가 & 실현 손익 / 매수 총액 */}
                      <div className="flex items-center sm:items-end justify-between sm:justify-end gap-3 font-mono shrink-0 ml-auto sm:ml-0">
                        <div className="text-left sm:text-right">
                          <div className="text-xs text-gray-400">
                            체결단가{" "}
                            <strong className="text-white text-sm">
                              {log.price
                                ? (log.is_us || logMarket.isUS || (typeof log.price === 'number' && log.price < 500 && !/^\d{6}$/.test(log.symbol || '')))
                                  ? `$${Number(log.price).toFixed(2)}`
                                  : `₩${Math.round(Number(log.price)).toLocaleString()}`
                                : "-"}
                            </strong>
                          </div>
                          <div className="text-[11px] text-gray-400 font-bold">
                            총 정산: ₩{(log.amount_krw || 0).toLocaleString()}
                          </div>
                        </div>

                        {!isBuy ? (
                          <div
                            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black font-mono shrink-0 shadow-md ${
                              isProfit
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            }`}
                          >
                            <div className="text-[10px] opacity-80">실현 손익</div>
                            <div>
                              {isProfit ? "+" : ""}
                              {(log.pnl_krw || 0).toLocaleString()}원 ({log.pnl_pct >= 0 ? "+" : ""}
                              {log.pnl_pct}%)
                            </div>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black font-mono shrink-0 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <div className="text-[10px] text-emerald-400/80">매수 투입금</div>
                            <div>₩{(log.amount_krw || 0).toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: AI 매매 사유 & 테크니컬 지표 (가독성 높은 디테일 박스) */}
                    {log.reason && (
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 relative z-10 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1 ${
                              isBuy
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                : isProfit
                                ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                                : "bg-blue-500/15 border-blue-500/30 text-blue-300"
                            }`}
                          >
                            {formatted.tag}
                          </span>

                          {/* 이유 파싱 칩들 */}
                          {formatted.chips && formatted.chips.map((chip: any, cIdx: number) => (
                            <span
                              key={cIdx}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${chip.color}`}
                            >
                              {chip.label}
                            </span>
                          ))}
                        </div>

                        <p className="text-gray-300 text-xs leading-relaxed break-keep">
                          {formatted.text}
                        </p>
                      </div>
                    )}

                    {/* Row 3: 하단 편의 액션 바: 차트 보기 & 종목코드 복사 & 모바일 시간 */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-xs relative z-10">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/stock/${log.symbol}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-emerald-600 hover:text-white text-gray-300 text-[11px] font-bold transition-all border border-white/10 hover:border-emerald-500 shadow-xs cursor-pointer group/btn"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-emerald-400 group-hover/btn:text-white" />
                          <span>차트·체결 타점 분석</span>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover/btn:opacity-100" />
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => handleCopySymbol(e, log.symbol)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-gray-400 hover:text-gray-200 text-[11px] font-mono transition-all border border-white/5 cursor-pointer"
                          title="종목코드 복사"
                        >
                          {copiedSymbol === log.symbol ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">복사됨</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>코드 복사</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                        <span className="sm:hidden flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.timestamp}
                        </span>
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-zinc-900 border border-white/5">
                          {log.mode === "KIS_REAL" ? "증권사 실전 연동" : "AI 가상 모의매매"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
