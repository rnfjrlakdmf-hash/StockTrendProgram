"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, RefreshCw, AlertTriangle, TrendingUp, Skull, Droplet, 
  HeartPulse, Sparkles, ArrowRight, ShieldCheck, Zap, Share2, DollarSign
} from "lucide-react";
import KakaoShareButton from "@/components/KakaoShareButton";
import SocialShareButtons from "@/components/SocialShareButtons";

export default function CalculatorClient() {
  const [avgPrice, setAvgPrice] = useState<string>("75,000");
  const [quantity, setQuantity] = useState<string>("100");
  const [currentPrice, setCurrentPrice] = useState<string>("60,000");
  const [addAmount, setAddAmount] = useState<string>("2,000,000");

  const [result, setResult] = useState<{
    newAvg: number;
    addQty: number;
    totalCost: number;
    totalQty: number;
    lossPercentBefore: number;
    lossPercentAfter: number;
    avgReductionPercent: number;
    requiredRiseToBreakEven: number;
  } | null>(null);

  const calculate = () => {
    const pAvg = Number(avgPrice.replace(/,/g, ""));
    const pQty = Number(quantity.replace(/,/g, ""));
    const pCurr = Number(currentPrice.replace(/,/g, ""));
    const pAddAmt = Number(addAmount.replace(/,/g, ""));

    if (!pAvg || !pQty || !pCurr || !pAddAmt) return;

    const addQty = Math.floor(pAddAmt / pCurr);
    if (addQty <= 0) return;

    const currentTotalCost = pAvg * pQty;
    const additionalCost = addQty * pCurr;
    const newTotalCost = currentTotalCost + additionalCost;
    const newTotalQty = pQty + addQty;
    
    const newAvg = Math.floor(newTotalCost / newTotalQty);

    const lossBefore = ((pCurr - pAvg) / pAvg) * 100;
    const lossAfter = ((pCurr - newAvg) / newAvg) * 100;
    const avgReduction = ((pAvg - newAvg) / pAvg) * 100;
    const riseToBreakEven = ((newAvg - pCurr) / pCurr) * 100;

    setResult({
      newAvg,
      addQty,
      totalCost: newTotalCost,
      totalQty: newTotalQty,
      lossPercentBefore: lossBefore,
      lossPercentAfter: lossAfter,
      avgReductionPercent: avgReduction,
      requiredRiseToBreakEven: riseToBreakEven
    });
  };

  useEffect(() => {
    calculate();
  }, [avgPrice, quantity, currentPrice, addAmount]);

  const formatNumber = (val: string) => {
    const num = val.replace(/[^0-9]/g, "");
    if (!num) return "";
    return Number(num).toLocaleString();
  };

  const handleQuickAdd = (amt: number) => {
    const currentAmt = Number(addAmount.replace(/,/g, "")) || 0;
    setAddAmount((currentAmt + amt).toLocaleString());
  };

  const getMemeMessage = (loss: number) => {
    if (loss > 0) return { icon: <TrendingUp className="w-6 h-6 text-rose-400" />, title: "수익 중입니다!", msg: "이미 수익권인데 물타기를? 불타기(수익 극대화) 타이밍인지 확인해 보세요! 🚀", color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10" };
    if (loss > -5) return { icon: <RefreshCw className="w-6 h-6 text-emerald-400" />, title: "경미한 조정 구간", msg: "귀여운 수준의 손실입니다. 1~2회 분할 매수로 즉시 탈출 및 익절 전환 가능! ✅", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" };
    if (loss > -15) return { icon: <AlertTriangle className="w-6 h-6 text-amber-400" />, title: "적정 물타기 타점", msg: "의미 있는 평단가 인하 효과를 볼 수 있는 구간입니다. 계획된 분할 자금을 투입하세요! 🎯", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" };
    if (loss > -30) return { icon: <Droplet className="w-6 h-6 text-blue-400" />, title: "집중 구조대 파견 필요", msg: "계좌에 파란불이 깊습니다. 확실한 지지선 확인 후 비중을 조절하여 평단가를 크게 낮춰야 합니다. 💧", color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/10" };
    if (loss > -50) return { icon: <HeartPulse className="w-6 h-6 text-purple-400" />, title: "심폐소생술 시급", msg: "원금 대비 반토막 구간입니다. 섣부른 몰빵보다는 기업의 펀더멘털을 재점검하고 장기 분할로 접근하세요! 🏥", color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10" };
    return { icon: <Skull className="w-6 h-6 text-zinc-400" />, title: "존버 혹은 리밸런싱", msg: "극단적 과매도 상태입니다. 다른 주도 섹터로 교체 매매할지 장기 보유할지 냉정한 결단이 필요합니다. 💀", color: "text-zinc-400", border: "border-zinc-500/30", bg: "bg-zinc-500/10" };
  };

  return (
    <div className="space-y-8 text-left">
      {/* 럭셔리 입력 패널 */}
      <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md space-y-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white">내 보유 계좌 정보 입력</h2>
              <p className="text-xs text-zinc-400">현재 평단가와 수량을 입력하면 탈출 시나리오를 계산합니다.</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            실시간 연산
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span>내 매수 평단가</span>
              <span className="text-zinc-500 font-normal">(원)</span>
            </label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-2xl px-4 py-3.5 text-white font-mono font-bold text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
              placeholder="예: 75,000"
              value={avgPrice}
              onChange={(e) => setAvgPrice(formatNumber(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span>현재 보유 수량</span>
              <span className="text-zinc-500 font-normal">(주)</span>
            </label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-2xl px-4 py-3.5 text-white font-mono font-bold text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
              placeholder="예: 100"
              value={quantity}
              onChange={(e) => setQuantity(formatNumber(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <span>현재 시장 가격</span>
              <span className="text-zinc-500 font-normal">(원)</span>
            </label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full bg-sky-950/20 border border-sky-500/30 rounded-2xl px-4 py-3.5 text-sky-300 font-mono font-bold text-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all shadow-inner"
              placeholder="예: 60,000"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(formatNumber(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <span>추가 물탈 자금</span>
              <span className="text-zinc-500 font-normal">(원)</span>
            </label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full bg-purple-950/20 border border-purple-500/30 rounded-2xl px-4 py-3.5 text-purple-300 font-mono font-bold text-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all shadow-inner"
              placeholder="예: 2,000,000"
              value={addAmount}
              onChange={(e) => setAddAmount(formatNumber(e.target.value))}
            />
          </div>
        </div>

        {/* 퀵 프리셋 버튼 */}
        <div className="pt-2">
          <div className="text-[11px] text-zinc-400 font-bold mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 빠른 자금 추가
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "+50만", val: 500000 },
              { label: "+100만", val: 1000000 },
              { label: "+300만", val: 3000000 },
              { label: "+500만", val: 5000000 },
              { label: "+1,000만", val: 10000000 },
              { label: "초기화", val: 0, reset: true },
            ].map((btn, bIdx) => (
              <button
                key={bIdx}
                type="button"
                onClick={() => btn.reset ? setAddAmount("0") : handleQuickAdd(btn.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                  btn.reset 
                    ? "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 border-white/5" 
                    : "bg-zinc-800/50 hover:bg-purple-600/30 text-purple-300 hover:text-white border-purple-500/20 hover:border-purple-500/40"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 럭셔리 결과 리포트 섹션 */}
      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* 상태 뱃지 카드 */}
            {(() => {
              const meme = getMemeMessage(result.lossPercentBefore);
              return (
                <div className={`p-6 rounded-3xl border ${meme.border} ${meme.bg} flex items-start gap-4 shadow-xl backdrop-blur-md`}>
                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 shrink-0">
                    {meme.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm md:text-base font-black ${meme.color}`}>{meme.title}</span>
                      <span className="text-xs font-mono font-bold text-zinc-400">
                        (현재 수익률: {result.lossPercentBefore.toFixed(2)}%)
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                      {meme.msg}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 핵심 탈출 시뮬레이션 인포그래픽 카드 */}
            <div className="bg-gradient-to-br from-blue-950/50 via-zinc-900/90 to-purple-950/50 border border-blue-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute -right-16 -top-16 w-60 h-60 bg-blue-500/15 blur-3xl rounded-full pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-white/10">
                <div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">
                    BREAK-EVEN SIMULATION
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white">물타기 후 예상 평단가 & 수익률</h3>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                  <span>평단가 {result.avgReductionPercent.toFixed(1)}% 인하 성공</span>
                </div>
              </div>

              {/* 비포 vs 애프터 비교 박스 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
                  <span className="text-xs font-bold text-zinc-400 block">물타기 전 (기존 계좌)</span>
                  <div className="text-2xl md:text-3xl font-black font-mono text-zinc-300">
                    {Number(avgPrice.replace(/,/g, "")).toLocaleString()}원
                  </div>
                  <div className="text-xs font-bold font-mono text-blue-400">
                    손실률 {result.lossPercentBefore.toFixed(2)}%
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/40 space-y-2 shadow-lg">
                  <span className="text-xs font-bold text-blue-300 block flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 물타기 후 (새로운 평단가)
                  </span>
                  <div className="text-2xl md:text-3xl font-black font-mono text-white">
                    {result.newAvg.toLocaleString()}원
                  </div>
                  <div className="text-xs font-bold font-mono text-emerald-400">
                    손실률 {result.lossPercentAfter.toFixed(2)}% (원금 회복까지 +{result.requiredRiseToBreakEven.toFixed(2)}% 상승 필요)
                  </div>
                </div>
              </div>

              {/* 세부 수량 & 매수 내역 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-zinc-400 block mb-1">추가 매수 주수</span>
                  <strong className="text-white font-mono text-base">+{result.addQty.toLocaleString()}주</strong>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-zinc-400 block mb-1">최종 보유 주수</span>
                  <strong className="text-white font-mono text-base">{result.totalQty.toLocaleString()}주</strong>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-zinc-400 block mb-1">추가 투입 금액</span>
                  <strong className="text-purple-300 font-mono text-base">{Number(addAmount.replace(/,/g, "")).toLocaleString()}원</strong>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-zinc-400 block mb-1">총 누적 매입금</span>
                  <strong className="text-amber-300 font-mono text-base">{result.totalCost.toLocaleString()}원</strong>
                </div>
              </div>
            </div>

            {/* 원클릭 카카오톡 공유 리포트 박스 */}
            <div className="bg-gradient-to-r from-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="space-y-1">
                <h4 className="text-base font-black text-white flex items-center justify-center sm:justify-start gap-2">
                  <Share2 className="w-4 h-4 text-amber-400" /> 내 물타기 시뮬레이션 결과 공유하기
                </h4>
                <p className="text-xs text-zinc-400">
                  단톡방이나 지인들에게 현재 계좌 상황과 구조대 평단가를 손쉽게 공유하세요.
                </p>
              </div>

              <div className="w-full sm:w-auto shrink-0">
                <SocialShareButtons 
                  title="🚨 주식 구조대 물타기 계산기"
                  description={`[물타기 탈출 시뮬레이션 결과]\n• 기존 평단가: ${avgPrice}원 (${result.lossPercentBefore.toFixed(1)}%)\n• 물타기 후: ${result.newAvg.toLocaleString()}원 (${result.lossPercentAfter.toFixed(1)}%)\n• 평단가 인하: -${result.avgReductionPercent.toFixed(1)}% 절감\n\n너도 계좌 탈출 견적 뽑아봐! 💦`}
                  url="https://stock-trend-program.co.kr/calculator"
                />
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
