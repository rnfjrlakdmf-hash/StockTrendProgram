"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, increment, getDoc } from "firebase/firestore";
import { TrendingUp, TrendingDown, Users } from "lucide-react";

interface StockVotingBoardProps {
  ticker: string;
  stockName: string;
}

export default function StockVotingBoard({ ticker, stockName }: StockVotingBoardProps) {
  const [upVotes, setUpVotes] = useState(0);
  const [downVotes, setDownVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedType, setVotedType] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    // 로컬 스토리지에서 투표 여부 확인
    const voted = localStorage.getItem(`vote_${ticker}`);
    if (voted) {
      setHasVoted(true);
      setVotedType(voted as "up" | "down");
    }

    // 실시간 데이터 구독
    const docRef = doc(db, "stock_votes", ticker);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUpVotes(data.up || 0);
        setDownVotes(data.down || 0);
      }
    });

    return () => unsubscribe();
  }, [ticker]);

  const handleVote = async (type: "up" | "down") => {
    if (hasVoted) return;

    // 로컬 상태 즉시 업데이트 (낙관적 UI)
    setHasVoted(true);
    setVotedType(type);
    if (type === "up") setUpVotes(prev => prev + 1);
    else setDownVotes(prev => prev + 1);
    
    localStorage.setItem(`vote_${ticker}`, type);

    try {
      const docRef = doc(db, "stock_votes", ticker);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          up: type === "up" ? 1 : 0,
          down: type === "down" ? 1 : 0,
          stockName: stockName
        });
      } else {
        await updateDoc(docRef, {
          [type]: increment(1)
        });
      }
    } catch (error) {
      console.error("투표 처리 중 오류 발생:", error);
    }
  };

  const totalVotes = upVotes + downVotes;
  const upPercent = totalVotes === 0 ? 50 : Math.round((upVotes / totalVotes) * 100);
  const downPercent = 100 - upPercent;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          군중 심리 예측
        </h3>
        <p className="text-slate-400 text-sm mb-6">
          내일 <span className="text-white font-semibold">{stockName}</span> 주가는 어떻게 될까요?
        </p>

        {!hasVoted ? (
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleVote("up")}
              className="flex flex-col items-center justify-center p-4 bg-slate-800/50 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/50 rounded-xl transition-colors group"
            >
              <TrendingUp className="w-8 h-8 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold">오를 것 같다</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleVote("down")}
              className="flex flex-col items-center justify-center p-4 bg-slate-800/50 hover:bg-blue-500/10 border border-slate-700 hover:border-blue-500/50 rounded-xl transition-colors group"
            >
              <TrendingDown className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold">내릴 것 같다</span>
            </motion.button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-end mb-2">
              <div className="text-red-500 font-bold text-lg flex items-center gap-1">
                <TrendingUp className="w-5 h-5" /> 상승 예측 {upPercent}%
              </div>
              <div className="text-blue-500 font-bold text-lg flex items-center gap-1">
                하락 예측 {downPercent}% <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            {/* 게이지 바 */}
            <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden flex relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${upPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-red-600 to-red-500"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${downPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-l from-blue-600 to-blue-500"
              />
              
              {/* 중앙 구분선 */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-900/50 -translate-x-1/2 z-10" />
            </div>

            <p className="text-center text-slate-400 text-sm mt-4">
              총 <span className="text-white font-bold">{totalVotes.toLocaleString()}</span>명이 투표에 참여했습니다.<br/>
              {votedType === "up" ? 
                "상승에 베팅하셨군요! 내일 장이 기대됩니다 🚀" : 
                "하락에 베팅하셨군요! 조심스럽게 접근하시네요 📉"}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
