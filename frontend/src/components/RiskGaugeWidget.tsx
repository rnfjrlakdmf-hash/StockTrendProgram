"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info, TrendingUp, AlertOctagon } from "lucide-react";

interface RiskData {
  code: string;
  creditRate: number;
  creditRiskLevel: "SAFE" | "WARNING" | "DANGER";
  shortingTrend: number;
  shortingRiskLevel: "SAFE" | "WARNING" | "DANGER";
  totalScore: number;
  overallStatus: string;
  aiComment: string;
}

export default function RiskGaugeWidget({ symbol }: { symbol: string }) {
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    
    // 국내 종목 6자리 숫자만 추출
    const cleanSymbol = symbol.split('.')[0];
    if (!/^\d{6}$/.test(cleanSymbol)) {
      setLoading(false);
      return;
    }

    const fetchRiskData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.stock-trend-program.co.kr';
        const res = await fetch(`${baseUrl}/api/stock/${cleanSymbol}/risk`);
        const result = await res.json();
        if (result.status === "success" && result.data) {
          setRiskData(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch risk data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskData();
  }, [symbol]);

  if (loading) return <div className="animate-pulse bg-white/5 h-24 rounded-2xl w-full"></div>;
  if (!riskData) return null;

  // 전체 스코어 색상 결정
  let scoreColor = "bg-green-500";
  let textColor = "text-green-400";
  let StatusIcon = Info;

  if (riskData.totalScore >= 75) {
    scoreColor = "bg-red-500";
    textColor = "text-red-400";
    StatusIcon = AlertOctagon;
  } else if (riskData.totalScore >= 50) {
    scoreColor = "bg-yellow-500";
    textColor = "text-yellow-400";
    StatusIcon = AlertTriangle;
  }

  return (
    <div className="w-full bg-[#111] border border-white/10 rounded-2xl p-5 mb-6 shadow-lg relative overflow-hidden">
      {/* Background glow based on risk */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 ${scoreColor} pointer-events-none`}></div>
      
      <div className="flex items-center gap-2 mb-4">
        <StatusIcon className={`w-5 h-5 ${textColor}`} />
        <h3 className="font-bold text-lg text-white">AI 숨은 위험 감지 (대차/신용잔고)</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gauge Section */}
        <div className="flex flex-col">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-gray-400">종합 위험 스코어</span>
            <span className={`text-2xl font-bold ${textColor}`}>{riskData.totalScore} <span className="text-sm text-gray-500">/ 100</span></span>
          </div>
          
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden relative">
            {/* Risk thresholds markers */}
            <div className="absolute top-0 left-[50%] w-px h-full bg-white/20 z-10"></div>
            <div className="absolute top-0 left-[75%] w-px h-full bg-white/20 z-10"></div>
            
            <div 
              className={`h-full ${scoreColor} transition-all duration-1000 ease-out`}
              style={{ width: `${riskData.totalScore}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>안전 (0)</span>
            <span className="pl-6">주의 (50)</span>
            <span>위험 (75+)</span>
          </div>
        </div>

        {/* Details Section */}
        <div className="flex flex-col justify-center space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-sm text-gray-300">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>신용잔고율</span>
            </div>
            <span className="font-mono font-semibold">{riskData.creditRate}%</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-sm text-gray-300">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span>대차잔고 증가 추이</span>
            </div>
            <span className="font-mono font-semibold">{riskData.shortingTrend > 0 ? '+' : ''}{riskData.shortingTrend}%</span>
          </div>
        </div>
      </div>

      {/* AI Comment */}
      <div className="mt-4 pt-4 border-t border-white/10 text-sm leading-relaxed text-gray-300">
        <span className="text-purple-400 font-semibold mr-2">AI 진단:</span> 
        {riskData.aiComment}
      </div>
    </div>
  );
}
