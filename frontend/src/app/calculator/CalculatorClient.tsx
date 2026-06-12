"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, RefreshCw, AlertTriangle, TrendingUp, Skull, Droplet, HeartPulse } from "lucide-react";
import SocialShareButtons from "@/components/SocialShareButtons";

export default function CalculatorClient() {
  const [avgPrice, setAvgPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<string>("");
  const [addAmount, setAddAmount] = useState<string>(""); // 물탈 금액 (원)

  const [result, setResult] = useState<{
    newAvg: number;
    addQty: number;
    totalCost: number;
    totalQty: number;
    lossPercentBefore: number;
    lossPercentAfter: number;
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

    setResult({
      newAvg,
      addQty,
      totalCost: newTotalCost,
      totalQty: newTotalQty,
      lossPercentBefore: lossBefore,
      lossPercentAfter: lossAfter
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

  const getMemeMessage = (loss: number) => {
    if (loss > 0) return { icon: <TrendingUp className="w-6 h-6 text-red-400" />, msg: "어라? 수익중인데 물타기를 왜 하죠? 기만자 컷! 🤬", color: "text-red-400" };
    if (loss > -5) return { icon: <RefreshCw className="w-6 h-6 text-green-400" />, msg: "응애 나 아기개미 🐜 귀여운 수준의 손실이네요. 금방 구조대 갑니다!", color: "text-green-400" };
    if (loss > -15) return { icon: <AlertTriangle className="w-6 h-6 text-yellow-400" />, msg: "살짝 물렸네요 😅 컵라면 하나 덜 먹고 물타면 구조 가능합니다!", color: "text-yellow-400" };
    if (loss > -30) return { icon: <Droplet className="w-6 h-6 text-blue-400" />, msg: "🚨 삐빅! 계좌에 파란불이 가득합니다! 영차영차 물 더 타셔야겠어요 💦", color: "text-blue-400" };
    if (loss > -50) return { icon: <HeartPulse className="w-6 h-6 text-purple-400" />, msg: "숨... 숨이 안 쉬어져요... 😱 한강물 아직 차갑죠? 월급 털어 넣으세요!", color: "text-purple-400" };
    return { icon: <Skull className="w-6 h-6 text-gray-400" />, msg: "💀 (시스템) 이 계좌는 이미 죽어있습니다. 다음 생을 기약하세요...", color: "text-gray-400" };
  };

  return (
    <div className="space-y-6">
      {/* 입력 섹션 */}
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-md">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          내 계좌 입력
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">내 평단가 (원)</label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-lg"
              placeholder="예: 80,000"
              value={avgPrice}
              onChange={(e) => setAvgPrice(formatNumber(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">보유 수량 (주)</label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-lg"
              placeholder="예: 100"
              value={quantity}
              onChange={(e) => setQuantity(formatNumber(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-blue-400 font-medium">현재 주가 (원)</label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full bg-blue-900/10 border border-blue-900/50 rounded-xl px-4 py-3 text-blue-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-lg"
              placeholder="예: 60,000"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(formatNumber(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-purple-400 font-medium">물탈 자금 (원)</label>
            <input 
              type="text" 
              inputMode="numeric"
              className="w-full bg-purple-900/10 border border-purple-900/50 rounded-xl px-4 py-3 text-purple-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-lg"
              placeholder="예: 2,000,000"
              value={addAmount}
              onChange={(e) => setAddAmount(formatNumber(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* 결과 섹션 */}
      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* 밈 출력 */}
            <div className={`p-5 rounded-2xl border ${result.lossPercentBefore <= -30 ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-800/50 border-gray-700'} flex items-start gap-4`}>
              <div className="mt-1">{getMemeMessage(result.lossPercentBefore).icon}</div>
              <div>
                <p className={`font-bold ${getMemeMessage(result.lossPercentBefore).color} mb-1`}>
                  현재 수익률: {result.lossPercentBefore.toFixed(2)}%
                </p>
                <p className="text-gray-300 leading-snug">
                  {getMemeMessage(result.lossPercentBefore).msg}
                </p>
              </div>
            </div>

            {/* 계산 결과 */}
            <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
              
              <h3 className="text-gray-300 text-sm font-medium mb-2">물타기 후 예상 평단가</h3>
              <div className="flex items-baseline gap-3 mb-6">
                <motion.span 
                  key={result.newAvg}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl md:text-5xl font-black text-white"
                >
                  {result.newAvg.toLocaleString()}원
                </motion.span>
                <span className={`font-bold ${result.lossPercentAfter >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  (예상 수익률 {result.lossPercentAfter.toFixed(2)}%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">추가 확보 주식수</p>
                  <p className="text-lg font-bold text-gray-200">{result.addQty.toLocaleString()}주</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">최종 보유 수량</p>
                  <p className="text-lg font-bold text-gray-200">{result.totalQty.toLocaleString()}주</p>
                </div>
              </div>
            </div>

            {/* 카톡 공유 버튼 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-gray-300 font-medium">
                😂 내 눈물나는 계좌 상황, 단톡방에 자랑(?)하기
              </p>
              <SocialShareButtons 
                title="🚨 주식 구조대 물타기 계산기"
                description={`[내 계좌 현황]\n현재 수익률: ${result.lossPercentBefore.toFixed(1)}%\n물타기 후: ${result.lossPercentAfter.toFixed(1)}%\n\n구조대 올 수 있을까? 너도 계산해봐! 💦`}
                url="https://stock-trend-program.co.kr/calculator"
              />
            </div>
            
            {/* AdSense 슬롯 (결과 바로 밑 체류시간 활용) */}
            <div className="mt-8 text-center min-h-[100px] bg-[#111] rounded-xl flex items-center justify-center border border-gray-800">
              <ins className="adsbygoogle"
                  style={{ display: 'block' }}
                  data-ad-client="ca-pub-9471404163603833"
                  data-ad-slot="1234567890" // 여기에 실제 슬롯 ID 입력 필요
                  data-ad-format="auto"
                  data-full-width-responsive="true"></ins>
              <script dangerouslySetInnerHTML={{
                __html: `(adsbygoogle = window.adsbygoogle || []).push({});`
              }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
