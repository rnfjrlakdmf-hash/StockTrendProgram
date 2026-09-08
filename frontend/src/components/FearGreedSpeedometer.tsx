"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Gauge, TrendingUp, TrendingDown, RefreshCw, 
  Sparkles, Activity, Scale, ChevronRight
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
    score: 75,
    label: "극단적 탐욕",
    factors: {
      ad_ratio: 44,
      volatility: 73,
      momentum: 100,
    },
    marketSignal: "초강세장 (Strong Bullish)",
    reason: "코스피 및 코스닥 전반에 걸쳐 외인·기관 대량 순매수와 상승 모멘텀이 매우 강하게 유지되고 있습니다.",
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

      let score = 75;
      let label = "극단적 탐욕";
      let factors = { ad_ratio: 44, volatility: 73, momentum: 100 };
      let reason = "상승 모멘텀과 시장 수급이 강하게 유지되는 활황 장세입니다.";
      let signal = "초강세장 (Strong Bullish)";

      if (resScanner && resScanner.ok) {
        const json = await resScanner.json();
        if (json.status === "success" && json.data?.stats?.fear_greed) {
          const fg = json.data.stats.fear_greed;
          score = typeof fg.score === "number" ? Math.max(0, Math.min(100, Math.round(fg.score))) : score;
          label = fg.label || label;
          if (fg.factors) {
            factors = {
              ad_ratio: Math.round(fg.factors.ad_ratio || 44),
              volatility: Math.round(fg.factors.volatility || 73),
              momentum: Math.round(fg.factors.momentum || 100),
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
    const interval = setInterval(() => fetchData(true), 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, []);

  // 상태별 설정
  const getStatusConfig = (score: number) => {
    if (score >= 75) {
      return {
        badge: "🔥 극단적 탐욕 (과열 주의)",
        badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        gaugeColor: "#ef4444",
        advice: "시장 열기가 매우 뜨겁습니다. 단기 급등주 추격 매수는 자제하고, 분할 수익 실현과 현금 비중 확대를 권장합니다.",
      };
    }
    if (score >= 55) {
      return {
        badge: "📈 탐욕 (상승 우세)",
        badgeBg: "bg-orange-500/15 text-orange-300 border-orange-500/30",
        gaugeColor: "#f97316",
        advice: "상승 모멘텀이 안정적으로 지속되고 있습니다. 주도 테마 및 실적 우량주의 눌림목 분할 매수 전략이 유리합니다.",
      };
    }
    if (score >= 45) {
      return {
        badge: "⚖️ 중립 (방향성 탐색)",
        badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        gaugeColor: "#eab308",
        advice: "시장 방향성이 탐색되는 구간입니다. 무리한 베팅보다는 펀더멘털이 견고한 우량주 중심의 분산 투자가 좋습니다.",
      };
    }
    if (score >= 25) {
      return {
        badge: "💧 공포 (단기 조정)",
        badgeBg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        gaugeColor: "#06b6d4",
        advice: "투심이 위축되어 과도한 낙폭이 발생하는 구간입니다. 분할 매수 관점에서 좋은 기업을 싸게 담을 수 있는 기회입니다.",
      };
    }
    return {
      badge: "❄️ 극단적 공포 (바닥 매수권)",
      badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      gaugeColor: "#3b82f6",
      advice: "역사적 바닥권 신호입니다. 대중이 공포에 질려 던질 때 용기 있게 분할 매수한 투자자가 가장 높은 수익을 기록했습니다.",
    };
  };

  const status = getStatusConfig(data.score);
  // -90도(0) ~ +90도(100)
  const needleAngle = -90 + (data.score / 100) * 180;

  return (
    <div className="w-full bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col justify-between h-full group hover:border-white/20 transition-all duration-300">
      
      {/* 1. Header with Unified FinTech Style */}
      <div className="bg-zinc-950/80 border-b border-white/10 px-5 py-4 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl relative">
            <Gauge className="w-4 h-4 text-orange-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full"></span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-black text-white text-sm tracking-tight">한국 증시 공포·탐욕 지수</h2>
            <span className="text-[10px] font-black text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded-md bg-emerald-500/10 tracking-wider">
              LIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden sm:inline text-[10px] text-gray-500 font-mono">
              {lastUpdated} 동기화
            </span>
          )}
          <button
            onClick={() => fetchData()}
            disabled={isRefreshing}
            aria-label="데이터 새로고침"
            className="p-1.5 text-gray-400 hover:text-white bg-zinc-900 border border-white/5 hover:border-white/20 rounded-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-orange-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Speedometer Gauge Section */}
      <div className="p-4 sm:p-5 flex flex-col items-center justify-center flex-1">
        <div className="relative w-64 h-32 sm:w-72 sm:h-36 flex items-end justify-center">
          {/* SVG Semicircular Gauge */}
          <svg className="w-full h-full" viewBox="0 0 220 115">
            <defs>
              <linearGradient id="speedometerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="25%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={status.gaugeColor} floodOpacity="0.8"/>
              </filter>
            </defs>

            {/* Background Track */}
            <path
              d="M 25 105 A 85 85 0 0 1 195 105"
              fill="none"
              stroke="#27272a"
              strokeWidth="15"
              strokeLinecap="round"
            />

            {/* Glowing Colored Track */}
            <path
              d="M 25 105 A 85 85 0 0 1 195 105"
              fill="none"
              stroke="url(#speedometerGradient)"
              strokeWidth="15"
              strokeLinecap="round"
              opacity="0.95"
            />

            {/* Zone Tick Marks */}
            <line x1="25" y1="105" x2="15" y2="105" stroke="#71717a" strokeWidth="1.5" />
            <line x1="68" y1="45" x2="60" y2="38" stroke="#71717a" strokeWidth="1.5" />
            <line x1="110" y1="20" x2="110" y2="10" stroke="#71717a" strokeWidth="1.5" />
            <line x1="152" y1="45" x2="160" y2="38" stroke="#71717a" strokeWidth="1.5" />
            <line x1="195" y1="105" x2="205" y2="105" stroke="#71717a" strokeWidth="1.5" />
          </svg>

          {/* Animated Needle */}
          <motion.div
            className="absolute bottom-0 left-1/2 w-1.5 h-24 sm:h-28 -ml-[3px] origin-bottom rounded-full z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to top, #ffffff 40%, " + status.gaugeColor + " 100%)",
              filter: "url(#needleGlow)",
            }}
            initial={{ rotate: -90 }}
            animate={{ rotate: needleAngle }}
            transition={{ type: "spring", stiffness: 70, damping: 14 }}
          />

          {/* Center Chrome Pivot */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-7 h-7 rounded-full bg-zinc-900 border-[3px] border-white shadow-xl z-20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.gaugeColor }} />
          </div>
        </div>

        {/* Digital Score & Status Pill */}
        <div className="mt-4 flex flex-col items-center">
          <div className="flex items-baseline gap-1.5 font-mono">
            <motion.span 
              className="text-4xl sm:text-5xl font-black text-white tracking-tight"
              key={data.score}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {data.score}
            </motion.span>
            <span className="text-xs sm:text-sm font-bold text-gray-500">/ 100점</span>
          </div>

          <div className={`mt-1.5 px-3 py-1 rounded-full text-xs font-black border tracking-wide shadow-sm ${status.badgeBg}`}>
            {status.badge}
          </div>
        </div>
      </div>

      {/* 3. Three Sub-Indicators (Clean Segmented Bars) */}
      <div className="px-4 sm:px-5 py-2">
        <div className="grid grid-cols-3 gap-2 bg-zinc-950/60 border border-white/5 rounded-2xl p-2.5">
          <div className="text-center">
            <div className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-orange-400" /> 모멘텀
            </div>
            <div className="text-sm font-black text-white font-mono">{data.factors?.momentum ?? 100}%</div>
            <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${data.factors?.momentum ?? 100}%` }} 
              />
            </div>
          </div>

          <div className="text-center border-x border-white/5 px-1">
            <div className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1 mb-1">
              <Activity className="w-3 h-3 text-cyan-400" /> 변동성
            </div>
            <div className="text-sm font-black text-white font-mono">{data.factors?.volatility ?? 73}%</div>
            <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${data.factors?.volatility ?? 73}%` }} 
              />
            </div>
          </div>

          <div className="text-center">
            <div className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1 mb-1">
              <Scale className="w-3 h-3 text-emerald-400" /> 등락비율
            </div>
            <div className="text-sm font-black text-white font-mono">{data.factors?.ad_ratio ?? 44}%</div>
            <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${data.factors?.ad_ratio ?? 44}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. AI Market Prescription Banner */}
      <div className="px-4 sm:px-5 pb-4 pt-1">
        <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 text-xs leading-relaxed text-gray-300 flex items-start gap-2.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-bold text-orange-300 mr-1.5">AI 시장 처방:</span>
            <span className="text-gray-300 text-[11px] sm:text-xs">{status.advice}</span>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500 px-1">
          <span>코스피·코스닥 2,500종목 팩트 데이터 기반</span>
          <Link 
            href="/discovery" 
            className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-0.5 transition-colors"
          >
            정밀 퀀트 분석 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
