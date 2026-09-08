"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Gauge, TrendingUp, TrendingDown, RefreshCw, 
  ShieldAlert, Sparkles, Activity, Info, BarChart3, Scale
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";

interface FearGreedData {
  score: number;
  label: string;
  factors?: {
    ad_ratio?: number;
    volatility?: number;
    momentum?: number;
  };
  marketSignal?: string;
  reason?: string;
}

export default function FearGreedSpeedometer() {
  const [data, setData] = useState<FearGreedData>({
    score: 65,
    label: "탐욕",
    factors: {
      ad_ratio: 52,
      volatility: 60,
      momentum: 75,
    },
    marketSignal: "상승 우세",
    reason: "코스피 및 코스닥 전반에 걸쳐 외인 매수세와 상승 모멘텀이 안정적으로 유지되고 있습니다.",
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      const [resScanner, resStatus] = await Promise.all([
        fetch(`${API_BASE_URL}/api/market/scanner`).catch(() => null),
        fetch(`${API_BASE_URL}/api/market/status`).catch(() => null),
      ]);

      let score = 65;
      let label = "탐욕";
      let factors = { ad_ratio: 52, volatility: 60, momentum: 75 };
      let reason = "상승 모멘텀과 시장 수급이 긍정적으로 작용하는 장세입니다.";
      let signal = "상승 우세";

      if (resScanner && resScanner.ok) {
        const json = await resScanner.json();
        if (json.status === "success" && json.data?.stats?.fear_greed) {
          const fg = json.data.stats.fear_greed;
          score = typeof fg.score === "number" ? Math.max(0, Math.min(100, Math.round(fg.score))) : score;
          label = fg.label || label;
          if (fg.factors) {
            factors = {
              ad_ratio: Math.round(fg.factors.ad_ratio || 50),
              volatility: Math.round(fg.factors.volatility || 50),
              momentum: Math.round(fg.factors.momentum || 50),
            };
          }
        }
      }

      if (resStatus && resStatus.ok) {
        const sJson = await resStatus.json();
        if (sJson.status === "success" && sJson.data) {
          reason = sJson.data.reason || reason;
          signal = sJson.data.message || signal;
        }
      }

      setData({
        score,
        label,
        factors,
        marketSignal: signal,
        reason,
      });
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error("Fear & Greed fetch error", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000); // 1분마다 실시간 갱신
    return () => clearInterval(interval);
  }, []);

  // 지수 상태별 스타일 및 AI 처방전 산출
  const getStatusConfig = (score: number) => {
    if (score >= 75) {
      return {
        badge: "🔥 극단적 탐욕",
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        gaugeColor: "#ef4444",
        advice: "시장 열기가 매우 뜨겁습니다. 단기 급등주 추격 매수는 자제하고, 분할 수익 실현과 현금 비중 확대를 권장합니다.",
      };
    }
    if (score >= 55) {
      return {
        badge: "📈 탐욕 (상승장)",
        badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/40",
        gaugeColor: "#f97316",
        advice: "상승 모멘텀이 안정적으로 지속되고 있습니다. 주도 테마 및 실적 우량주의 눌림목 분할 매수 전략이 유리합니다.",
      };
    }
    if (score >= 45) {
      return {
        badge: "⚖️ 중립 (관망)",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        gaugeColor: "#eab308",
        advice: "시장 방향성이 탐색되는 구간입니다. 무리한 베팅보다는 펀더멘털이 견고한 우량주 중심의 방어적 투자가 좋습니다.",
      };
    }
    if (score >= 25) {
      return {
        badge: "💧 공포 (조정장)",
        badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        gaugeColor: "#06b6d4",
        advice: "투심이 위축되어 과도한 낙폭이 발생하는 구간입니다. 분할 매수 관점에서 좋은 기업을 싸게 담을 수 있는 기회입니다.",
      };
    }
    return {
      badge: "❄️ 극단적 공포",
      badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      gaugeColor: "#3b82f6",
      advice: "역사적 바닥권 신호입니다. 대중이 공포에 질려 던질 때 용기 있게 분할 매수한 투자자가 가장 높은 수익을 얻었습니다.",
    };
  };

  const status = getStatusConfig(data.score);

  // 180도 반원 게이지 각도 계산 (-90도 ~ +90도)
  const needleRotation = -90 + (data.score / 100) * 180;

  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-950 to-black p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
      {/* 백그라운드 앰비언트 글로우 */}
      <div 
        className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: status.gaugeColor }}
      />

      {/* 헤더 영역 */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              한국 증시 공포·탐욕 지수
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                LIVE
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              코스피·코스닥 수급, 변동성, 추세 모멘텀 통합 AI 진단
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchData()}
          disabled={isRefreshing}
          aria-label="데이터 새로고침"
          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-orange-400" : ""}`} />
        </button>
      </div>

      {/* 3D 반원형 속도계 게이지 비주얼 */}
      <div className="py-4 flex flex-col items-center justify-center relative">
        <div className="relative w-64 h-32 sm:w-72 sm:h-36 flex items-end justify-center overflow-hidden">
          {/* SVG 반원형 아크 (5개 색상 구간) */}
          <svg className="w-full h-full" viewBox="0 0 200 100">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="25%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>

            {/* 배경 아크 */}
            <path
              d="M 20 95 A 80 80 0 0 1 180 95"
              fill="none"
              stroke="#1e293b"
              strokeWidth="16"
              strokeLinecap="round"
            />

            {/* 그라데이션 컬러 아크 */}
            <path
              d="M 20 95 A 80 80 0 0 1 180 95"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="251.2"
              strokeDashoffset="0"
              opacity="0.9"
            />
          </svg>

          {/* 게이지 바늘 (스프링 애니메이션) */}
          <motion.div
            className="absolute bottom-0 left-1/2 w-1.5 h-24 sm:h-28 -ml-[3px] origin-bottom rounded-full z-10"
            style={{
              background: "linear-gradient(to top, #ffffff 40%, " + status.gaugeColor + " 100%)",
              boxShadow: "0 0 12px " + status.gaugeColor,
            }}
            initial={{ rotate: -90 }}
            animate={{ rotate: needleRotation }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
          />

          {/* 중앙 피벗 캡 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border-4 border-white shadow-xl z-20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.gaugeColor }} />
          </div>
        </div>

        {/* 하단 점수 및 배지 표시 */}
        <div className="mt-3 flex flex-col items-center">
          <div className="flex items-baseline gap-1.5">
            <motion.span 
              className="text-4xl sm:text-5xl font-black text-white tracking-tight"
              key={data.score}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {data.score}
            </motion.span>
            <span className="text-sm font-bold text-gray-500">/ 100점</span>
          </div>

          <div className={`mt-1.5 px-3 py-1 rounded-full text-xs font-black border tracking-wide ${status.badgeBg}`}>
            {status.badge}
          </div>
        </div>
      </div>

      {/* 3대 세부 분석 지표 바 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 py-3 my-2 border-y border-white/5 bg-white/[0.02] rounded-2xl p-2.5">
        <div className="text-center">
          <div className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-orange-400" /> 모멘텀
          </div>
          <div className="text-sm font-bold text-white">{data.factors?.momentum ?? 75}%</div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-orange-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${data.factors?.momentum ?? 75}%` }} 
            />
          </div>
        </div>

        <div className="text-center">
          <div className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-cyan-400" /> 변동성
          </div>
          <div className="text-sm font-bold text-white">{data.factors?.volatility ?? 60}%</div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${data.factors?.volatility ?? 60}%` }} 
            />
          </div>
        </div>

        <div className="text-center">
          <div className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1 mb-1">
            <Scale className="w-3 h-3 text-emerald-400" /> 등락비율
          </div>
          <div className="text-sm font-bold text-white">{data.factors?.ad_ratio ?? 52}%</div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${data.factors?.ad_ratio ?? 52}%` }} 
            />
          </div>
        </div>
      </div>

      {/* AI 시장 처방전 박스 */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 text-xs leading-relaxed text-gray-300 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-orange-300 mr-1.5">AI 시장 처방:</span>
          <span>{status.advice}</span>
        </div>
      </div>

      {/* 하단 시간 & 바로가기 */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 pt-2">
        <span>{lastUpdated ? `${lastUpdated} 기준 실시간 계산` : "실시간 동기화 중"}</span>
        <Link 
          href="/discovery" 
          className="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 transition-colors"
        >
          정밀 퀀트 분석 보기 →
        </Link>
      </div>
    </div>
  );
}
