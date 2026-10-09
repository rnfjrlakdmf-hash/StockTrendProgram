"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, Sparkles, TrendingUp, Calendar, ShieldCheck, 
  HelpCircle, Coffee, Share2, Layers, PiggyBank, RefreshCw, ChevronRight, Check
} from "lucide-react";
import SocialShareButtons from "@/components/SocialShareButtons";

interface DividendPreset {
  name: string;
  ticker: string;
  country: "KR" | "US";
  price: number;
  yieldPct: number;
  frequency: "monthly" | "quarterly" | "semi_annual" | "annual";
  badge: string;
}

const PRESETS: DividendPreset[] = [
  { name: "맥쿼리인프라", ticker: "088980", country: "KR", price: 12500, yieldPct: 6.8, frequency: "semi_annual", badge: "국내대표 고배당" },
  { name: "삼성전자(우)", ticker: "005935", country: "KR", price: 54000, yieldPct: 2.8, frequency: "quarterly", badge: "분기배당 우량주" },
  { name: "현대차2우B", ticker: "005387", country: "KR", price: 145000, yieldPct: 6.2, frequency: "quarterly", badge: "밸류업 수혜" },
  { name: "KT&G", ticker: "033780", country: "KR", price: 108000, yieldPct: 5.4, frequency: "quarterly", badge: "전통 배당강자" },
  { name: "SCHD (슈드)", ticker: "SCHD", country: "US", price: 39500, yieldPct: 3.5, frequency: "quarterly", badge: "배당성장 1위" },
  { name: "JEPI (제피)", ticker: "JEPI", country: "US", price: 78000, yieldPct: 7.6, frequency: "monthly", badge: "초인기 월배당" },
  { name: "리얼티인컴", ticker: "O", country: "US", price: 74000, yieldPct: 5.3, frequency: "monthly", badge: "월배당 리츠" },
];

export default function DividendCalculator() {
  const [stockName, setStockName] = useState<string>("맥쿼리인프라");
  const [calcMode, setCalcMode] = useState<"amount" | "shares">("amount");
  const [investAmount, setInvestAmount] = useState<string>("10,000,000"); // 1천만원
  const [shareCount, setShareCount] = useState<string>("800");
  const [stockPrice, setStockPrice] = useState<string>("12,500");
  const [dividendYield, setDividendYield] = useState<string>("6.8");
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "semi_annual" | "annual">("semi_annual");
  const [taxMode, setTaxMode] = useState<"standard" | "isa" | "pension">("standard");
  const [reinvestGrowthRate, setReinvestGrowthRate] = useState<number>(3.0); // 주가 연평균 상승률 가정

  const selectPreset = (p: DividendPreset) => {
    setStockName(p.name);
    setStockPrice(p.price.toLocaleString());
    setDividendYield(p.yieldPct.toString());
    setFrequency(p.frequency);

    const currentAmt = Number(investAmount.replace(/,/g, "")) || 10000000;
    const computedShares = Math.floor(currentAmt / p.price);
    setShareCount(computedShares.toLocaleString());
  };

  // 실시간 계산
  const numPrice = Number(stockPrice.replace(/,/g, "")) || 0;
  const numYield = Number(dividendYield) || 0;
  
  let totalInvest = 0;
  let totalShares = 0;

  if (calcMode === "amount") {
    totalInvest = Number(investAmount.replace(/,/g, "")) || 0;
    totalShares = numPrice > 0 ? Math.floor(totalInvest / numPrice) : 0;
  } else {
    totalShares = Number(shareCount.replace(/,/g, "")) || 0;
    totalInvest = totalShares * numPrice;
  }

  // 연간 세전 배당금
  const annualGrossDividend = Math.round(totalInvest * (numYield / 100));

  // 세금 계산
  let taxRate = 0.154; // 일반 15.4%
  let taxName = "일반 배당소득세 (15.4%)";
  let taxAmount = Math.round(annualGrossDividend * taxRate);
  let savedTax = 0;

  if (taxMode === "isa") {
    // ISA: 200만원 비과세, 초과 9.9%
    const standardTax = Math.round(annualGrossDividend * 0.154);
    if (annualGrossDividend <= 2000000) {
      taxAmount = 0;
      taxName = "ISA 비과세 혜택 (세금 0원)";
    } else {
      const taxable = annualGrossDividend - 2000000;
      taxAmount = Math.round(taxable * 0.099);
      taxName = "ISA 200만원 비과세 + 9.9% 분리과세";
    }
    savedTax = Math.max(0, standardTax - taxAmount);
  } else if (taxMode === "pension") {
    // 연금계좌: 0원 (수령 시 연금소득세 3.3~5.5% 과세이연)
    const standardTax = Math.round(annualGrossDividend * 0.154);
    taxAmount = 0;
    taxName = "연금저축/IRP 과세이연 (운용 중 세금 0원)";
    savedTax = standardTax;
  }

  const annualNetDividend = Math.max(0, annualGrossDividend - taxAmount);

  // 주기별 배당 실수령액
  const monthlyNet = Math.round(annualNetDividend / 12);
  const quarterlyNet = Math.round(annualNetDividend / 4);
  const semiAnnualNet = Math.round(annualNetDividend / 2);

  let currentPeriodLabel = "월 환산 실수령액";
  let currentPeriodAmount = monthlyNet;
  if (frequency === "quarterly") {
    currentPeriodLabel = "분기별 실수령액 (연 4회)";
    currentPeriodAmount = quarterlyNet;
  } else if (frequency === "semi_annual") {
    currentPeriodLabel = "반기별 실수령액 (연 2회)";
    currentPeriodAmount = semiAnnualNet;
  } else if (frequency === "annual") {
    currentPeriodLabel = "연 1회 일괄 수령액";
    currentPeriodAmount = annualNetDividend;
  }

  // 일상 체감 환산
  const coffeeCount = Math.floor(monthlyNet / 4500); // 스타벅스 아메리카노 4500원
  const chickenCount = Math.floor(monthlyNet / 22000); // 치킨 22000원

  // 배당 재투자 복리 시뮬레이션 (배당금 전액 재투자 + 연 3% 주가 상승 가정)
  const calcCompound = (years: number) => {
    let balance = totalInvest;
    const r = (numYield + reinvestGrowthRate) / 100;
    for (let i = 0; i < years; i++) {
      balance = balance * (1 + r);
    }
    return Math.round(balance);
  };

  const asset5Years = calcCompound(5);
  const asset10Years = calcCompound(10);
  const profit5Years = asset5Years - totalInvest;
  const profit10Years = asset10Years - totalInvest;

  return (
    <div className="space-y-6">
      {/* 1. 상단 인기 배당주 프리셋 빠른 선택 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-bold flex items-center gap-1.5 text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 인기 배당주 1초 자동 세팅
          </span>
          <span className="text-[11px] text-zinc-500">클릭 시 현재가·배당률 자동 입력</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {PRESETS.map((p) => {
            const isSelected = stockName === p.name;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => selectPreset(p)}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5 ${
                  isSelected 
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10" 
                    : "bg-zinc-900/80 text-zinc-300 border-white/10 hover:border-white/20 hover:bg-zinc-800"
                }`}
              >
                <span>{p.country === "KR" ? "🇰🇷" : "🇺🇸"}</span>
                <span>{p.name}</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-400">
                  {p.yieldPct}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 입력 폼 카드 */}
      <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/80 border border-white/10 space-y-6 shadow-2xl backdrop-blur-xl">
        {/* 종목명 & 계산 기준 탭 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex-1">
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">종목명 / 티커</label>
            <input 
              type="text"
              value={stockName}
              onChange={(e) => setStockName(e.target.value)}
              placeholder="예: 맥쿼리인프라, SCHD"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="shrink-0">
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">계산 기준 방식</label>
            <div className="flex p-1 rounded-xl bg-zinc-950 border border-white/10">
              <button
                type="button"
                onClick={() => setCalcMode("amount")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  calcMode === "amount" ? "bg-amber-500 text-black shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                총 투자금액 기준
              </button>
              <button
                type="button"
                onClick={() => setCalcMode("shares")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  calcMode === "shares" ? "bg-amber-500 text-black shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                보유 주수 기준
              </button>
            </div>
          </div>
        </div>

        {/* 금액 / 주수 / 주가 / 배당률 입력 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {calcMode === "amount" ? (
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                총 투자금액 (원)
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={investAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setInvestAmount(val ? Number(val).toLocaleString() : "");
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-base font-black font-mono text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="10,000,000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">원</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[5000000, 10000000, 30000000, 50000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInvestAmount(amt.toLocaleString())}
                    className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    +{(amt / 10000).toLocaleString()}만원
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                보유 주수 (주)
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={shareCount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setShareCount(val ? Number(val).toLocaleString() : "");
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-base font-black font-mono text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">주</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              1주당 주가 (현재가)
            </label>
            <div className="relative">
              <input 
                type="text"
                value={stockPrice}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setStockPrice(val ? Number(val).toLocaleString() : "");
                }}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-base font-black font-mono text-white focus:outline-none focus:border-amber-500/50"
                placeholder="12,500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">원</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              연간 예상 배당수익률 (%)
            </label>
            <div className="relative">
              <input 
                type="number"
                step="0.1"
                value={dividendYield}
                onChange={(e) => setDividendYield(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-base font-black font-mono text-amber-300 focus:outline-none focus:border-amber-500/50"
                placeholder="6.5"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              배당 주기
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="monthly">📅 매월 지급 (월배당 ETF·리츠)</option>
              <option value="quarterly">🌸 분기별 지급 (3·6·9·12월 연 4회)</option>
              <option value="semi_annual">🌾 반기별 지급 (연 2회)</option>
              <option value="annual">❄️ 연 1회 지급 (연말 결산배당)</option>
            </select>
          </div>
        </div>

        {/* 절세 계좌 선택 (일반 vs ISA vs 연금저축) */}
        <div className="pt-2 border-t border-white/10">
          <label className="block text-xs font-bold text-zinc-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 과세 방식 선택 (절세 시뮬레이션)
            </span>
            <span className="text-[11px] text-emerald-400 font-normal">절세 계좌 활용 시 수익률 상승</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: "standard", label: "일반 주식계좌", sub: "15.4% 배당소득세 원천징수" },
              { id: "isa", label: "ISA 만능통장", sub: "200만원 비과세 + 9.9% 분리과세" },
              { id: "pension", label: "연금저축 / IRP", sub: "운용 중 비과세 (과세이연)" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTaxMode(t.id as any)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  taxMode === t.id
                    ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm"
                    : "bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="text-xs font-black flex items-center justify-between">
                  <span>{t.label}</span>
                  {taxMode === t.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 시뮬레이션 결과 대시보드 */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 border border-amber-500/30 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase mb-1">
              DIVIDEND CASH FLOW
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              💰 {stockName} 배당 캐시플로우 리포트
            </h3>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            총 투자원금: <strong className="text-white">{totalInvest.toLocaleString()}원</strong> ({totalShares.toLocaleString()}주)
          </div>
        </div>

        {/* 핵심 2대 결과 카드 (연간 실수령액 & 월 환산 제2의 월급) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2">
            <span className="text-xs font-bold text-zinc-400 block">
              1년 총 배당금 (세후 실수령액)
            </span>
            <div className="text-3xl font-black font-mono text-amber-400">
              {annualNetDividend.toLocaleString()}원
            </div>
            <div className="text-xs text-zinc-400 flex items-center justify-between pt-1">
              <span>세전 배당: {annualGrossDividend.toLocaleString()}원</span>
              <span className="text-rose-400 font-mono">-세금 {taxAmount.toLocaleString()}원</span>
            </div>
            {savedTax > 0 && (
              <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                💡 절세 계좌로 세금 {savedTax.toLocaleString()}원 절약 완료!
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-400/40 space-y-2">
            <span className="text-xs font-bold text-amber-300 block flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5" /> 매달 꼬박꼬박 꽂히는 제2의 월급
            </span>
            <div className="text-3xl font-black font-mono text-white">
              {monthlyNet.toLocaleString()}원 <span className="text-sm font-normal text-zinc-300">/ 월</span>
            </div>
            <div className="text-xs text-zinc-300 leading-relaxed pt-1">
              {frequency === "quarterly" && `(분기당 ${quarterlyNet.toLocaleString()}원 수령)`}
              {frequency === "semi_annual" && `(반기당 ${semiAnnualNet.toLocaleString()}원 수령)`}
              {frequency === "monthly" && `(매월 통장에 입금)`}
              {frequency === "annual" && `(연말 결산 시 한 번에 수령)`}
            </div>
            <div className="text-[11px] text-amber-200/90 font-medium">
              ☕ 스타벅스 아메리카노 <strong>약 {coffeeCount}잔</strong> / 🍗 치킨 <strong>약 {chickenCount}마리</strong> 분량
            </div>
          </div>
        </div>

        {/* 4. 배당 재투자 복리의 마법 (5년 / 10년 후) */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <PiggyBank className="w-4 h-4 text-emerald-400" /> 배당금 재투자 시 복리 성장 (DRIP 시뮬레이션)
            </h4>
            <span className="text-[10px] text-zinc-500">배당 재투자 + 주가상승 연 3% 가정</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-zinc-400 block text-[11px]">5년 후 예상 총 자산</span>
              <div className="text-lg font-black font-mono text-emerald-400">
                {asset5Years.toLocaleString()}원
              </div>
              <span className="text-[10px] text-zinc-500">
                원금 대비 +{profit5Years.toLocaleString()}원 (+{((profit5Years / (totalInvest || 1)) * 100).toFixed(1)}%)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-zinc-400 block text-[11px]">10년 후 예상 총 자산 (스노우볼)</span>
              <div className="text-lg font-black font-mono text-purple-300">
                {asset10Years.toLocaleString()}원
              </div>
              <span className="text-[10px] text-zinc-500">
                원금 대비 +{profit10Years.toLocaleString()}원 (+{((profit10Years / (totalInvest || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* 5. 금융소득종합과세(2,000만원) 안전도 바 */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> 금융소득종합과세 (연 2,000만 원 한도) 안전도
            </span>
            <span className="font-mono text-white font-bold">
              {annualGrossDividend >= 20000000 ? (
                <span className="text-rose-400 font-black">⚠️ 종합과세 대상 (초과)</span>
              ) : (
                <span className="text-emerald-400 font-black">
                  ✅ 안전 (잔여 {(20000000 - annualGrossDividend).toLocaleString()}원)
                </span>
              )}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                annualGrossDividend >= 20000000 ? "bg-rose-500" : "bg-emerald-400"
              }`}
              style={{ width: `${Math.min(100, (annualGrossDividend / 20000000) * 100)}%` }}
            />
          </div>
        </div>

        {/* 6. 카카오톡 & SNS 공유 카드 */}
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-0.5">
            <h4 className="text-sm font-black text-white flex items-center justify-center sm:justify-start gap-1.5">
              <Share2 className="w-4 h-4 text-amber-400" /> 내 배당금 월급 시뮬레이션 공유하기
            </h4>
            <p className="text-xs text-zinc-400">
              친구들과 지인들에게 내 배당주 월급 견적을 카카오톡으로 손쉽게 공유해보세요.
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <SocialShareButtons 
              title="💰 주식 배당금 & 월배당 시뮬레이터"
              description={`[${stockName} 배당금 시뮬레이션 결과]\n• 총 투자금: ${totalInvest.toLocaleString()}원\n• 연간 세후 배당금: ${annualNetDividend.toLocaleString()}원\n• 매월 환산 월급: 약 ${monthlyNet.toLocaleString()}원 (☕ 커피 ${coffeeCount}잔!)\n\n너도 배당금 월급 견적 뽑아봐! 💸`}
              url="https://stock-trend-program.co.kr/calculator?tab=dividend"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
