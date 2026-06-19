"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, increment, getDoc } from "firebase/firestore";
import { TrendingUp, TrendingDown, Flame, Trophy, Share2, CalendarCheck2 } from "lucide-react";
import KakaoShareButton from "@/components/KakaoShareButton";

export default function UpDownGamePage() {
  const [upVotes, setUpVotes] = useState(0);
  const [downVotes, setDownVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedType, setVotedType] = useState<"up" | "down" | null>(null);
  const [streak, setStreak] = useState(0);

  // Get today's date in YYYY-MM-DD KST format
  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '-').replace('.', '');

  useEffect(() => {
    // 1. Check if voted today
    const voted = localStorage.getItem(`daily_vote_${today}`);
    if (voted) {
      setHasVoted(true);
      setVotedType(voted as "up" | "down");
    }

    // 2. Load streak
    const currentStreak = parseInt(localStorage.getItem('vote_streak') || '0', 10);
    setStreak(currentStreak);

    // 3. Connect to Firebase for live results
    const docRef = doc(db, "daily_market_votes", today);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUpVotes(data.up || 0);
        setDownVotes(data.down || 0);
      }
    });

    return () => unsubscribe();
  }, [today]);

  const handleVote = async (type: "up" | "down") => {
    if (hasVoted) return;

    // Optimistic UI update
    setHasVoted(true);
    setVotedType(type);
    if (type === "up") setUpVotes(prev => prev + 1);
    else setDownVotes(prev => prev + 1);
    
    // Save to local storage
    localStorage.setItem(`daily_vote_${today}`, type);
    
    // Update Streak
    const newStreak = streak + 1;
    setStreak(newStreak);
    localStorage.setItem('vote_streak', newStreak.toString());

    // Firebase update
    try {
      const docRef = doc(db, "daily_market_votes", today);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          up: type === "up" ? 1 : 0,
          down: type === "down" ? 1 : 0,
          date: today
        });
      } else {
        await updateDoc(docRef, {
          [type]: increment(1)
        });
      }
    } catch (error) {
      console.error("Error saving vote:", error);
    }
  };

  const totalVotes = upVotes + downVotes;
  const upPercent = totalVotes === 0 ? 50 : Math.round((upVotes / totalVotes) * 100);
  const downPercent = 100 - upPercent;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12">
        
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-block bg-indigo-500/20 text-indigo-300 font-bold px-4 py-1.5 rounded-full text-sm mb-4 border border-indigo-500/30">
            매일 아침 8시 리셋! 출석체크 미니게임
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            오늘 코스피, <span className="text-red-400">오를까</span> <span className="text-blue-400">내릴까?</span>
          </h1>
          <p className="text-slate-400 text-lg">
            대한민국 100만 개미들의 직감을 모아보는 집단 지성 테스트!
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden mb-8 animate-fade-in-up delay-100">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500"></div>
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">현재 시장 심리 투표</h2>
            <div className="text-slate-400 text-sm">{today} 기준</div>
          </div>

          {!hasVoted ? (
            <div className="grid grid-cols-2 gap-4 h-48">
              <button
                onClick={() => handleVote("up")}
                className="group relative flex flex-col items-center justify-center bg-slate-800/50 hover:bg-red-500/20 border-2 border-transparent hover:border-red-500/50 rounded-2xl transition-all"
              >
                <TrendingUp className="w-16 h-16 text-red-500 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xl font-bold text-red-100 group-hover:text-white">불장 (상승)</span>
                <div className="absolute inset-0 bg-red-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              <button
                onClick={() => handleVote("down")}
                className="group relative flex flex-col items-center justify-center bg-slate-800/50 hover:bg-blue-500/20 border-2 border-transparent hover:border-blue-500/50 rounded-2xl transition-all"
              >
                <TrendingDown className="w-16 h-16 text-blue-500 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xl font-bold text-blue-100 group-hover:text-white">물장 (하락)</span>
                <div className="absolute inset-0 bg-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in duration-500">
              <h3 className="text-center text-xl font-bold mb-6 text-slate-300">투표가 완료되었습니다! (총 {totalVotes.toLocaleString()}명 참여)</h3>
              
              <div className="h-12 w-full flex rounded-xl overflow-hidden mb-6 relative">
                <div 
                  className="bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-start px-4 transition-all duration-1000 ease-out"
                  style={{ width: `${upPercent}%` }}
                >
                  <span className="font-black text-white text-lg">{upPercent}%</span>
                </div>
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-end px-4 transition-all duration-1000 ease-out"
                  style={{ width: `${downPercent}%` }}
                >
                  <span className="font-black text-white text-lg">{downPercent}%</span>
                </div>
                
                {/* VS Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-900 rounded-full border-2 border-slate-800 flex items-center justify-center shadow-lg">
                  <span className="text-xs font-black italic">VS</span>
                </div>
              </div>

              <div className="flex justify-between text-sm font-bold">
                <span className="text-red-400">상승 예측 ({upVotes.toLocaleString()}명)</span>
                <span className="text-blue-400">하락 예측 ({downVotes.toLocaleString()}명)</span>
              </div>
            </div>
          )}
        </div>

        {/* Gamification / Streak Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-lg">
            <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">나의 연속 투표(출석)</div>
              <div className="text-2xl font-black">{streak}일째 연속!</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-lg relative overflow-hidden group cursor-pointer hover:border-yellow-500/50 transition-colors">
            <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-colors"></div>
            <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 relative z-10">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="relative z-10">
              <div className="text-slate-400 text-sm mb-1">VIP 혜택 잠금 해제까지</div>
              {streak >= 5 ? (
                 <div className="text-yellow-400 font-bold">VIP 권한 획득 완료! 🎉</div>
              ) : (
                 <div className="text-lg font-bold">앞으로 {5 - streak}일 남음</div>
              )}
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="text-center">
          <KakaoShareButton 
            title={`오늘 코스피, 오를까 내릴까?`}
            description={`대한민국 100만 개미들의 직감을 모아보는 집단 지성 테스트! 현재 ${totalVotes}명이 투표했습니다.`}
            url={`https://stock-trend-program.co.kr/game`}
            imageUrl="https://stock-trend-program.co.kr/api/og?title=코스피%20UP%20&%20DOWN&subtitle=개미들의%20집단지성%20테스트&theme=이벤트"
            className="inline-flex bg-[#FEE500] hover:bg-[#FEE500]/90 text-black py-3 px-8 rounded-xl text-lg font-bold items-center justify-center gap-2 transition-colors shadow-lg shadow-[#FEE500]/10"
            buttonText="친구에게 투표 현황 공유하기"
          />
        </div>

      </main>
    </div>
  );
}
