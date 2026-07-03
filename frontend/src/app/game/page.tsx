"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, increment, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { TrendingUp, TrendingDown, Flame, Trophy, Crown, Share2, BrainCircuit, Activity } from "lucide-react";
import KakaoShareButton from "@/components/KakaoShareButton";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "@/components/LoginModal";
import Image from "next/image";

// 게임 종목 정의
const GAME_STOCKS = [
  { id: "KOSPI", name: "코스피", symbol: "KOSPI", type: "index" },
  { id: "005930", name: "삼성전자", symbol: "005930.KS", type: "stock" },
  { id: "NVDA", name: "엔비디아", symbol: "NVDA", type: "stock" },
  { id: "BTC", name: "비트코인", symbol: "BTC-USD", type: "crypto" },
];

// 간단한 의사난수 생성기 (종목과 날짜에 종속적인 고정 난수 생성)
const pseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
};

export default function UpDownGamePage() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [votesData, setVotesData] = useState<Record<string, { up: number, down: number }>>({});
  const [myVotes, setMyVotes] = useState<Record<string, "up" | "down">>(({}));
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Get today's date in YYYY-MM-DD KST format
  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '-').replace('.', '');

  useEffect(() => {
    // 1. 유저의 오늘 투표 내역 로드 (Firebase 또는 로컬)
    // 실제 운영 환경에서는 Firestore의 user_predictions 컬렉션에서 가져와야 함.
    // 여기서는 로컬과 동기화.
    if (user) {
      const loadUserVotes = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.daily_votes && data.daily_votes[today]) {
            setMyVotes(data.daily_votes[today]);
          }
        }
      };
      loadUserVotes();
    } else {
      setMyVotes({}); // 비로그인 시 초기화
    }

    // 2. 종목별 라이브 투표율 구독
    const unsubscribes = GAME_STOCKS.map(stock => {
      const docRef = doc(db, "daily_market_votes", `${today}_${stock.id}`);
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setVotesData(prev => ({
            ...prev,
            [stock.id]: { up: data.up || 0, down: data.down || 0 }
          }));
        } else {
          setVotesData(prev => ({
            ...prev,
            [stock.id]: { up: 0, down: 0 }
          }));
        }
      });
    });

    // 3. 리더보드 로드 (적중 횟수 기준 상위 5명)
    const loadLeaderboard = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("game_wins", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        const leaders: any[] = [];
        querySnapshot.forEach((doc) => {
          leaders.push({ id: doc.id, ...doc.data() });
        });
        setLeaderboard(leaders);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      }
    };
    loadLeaderboard();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [today, user]);

  const handleVote = async (stockId: string, type: "up" | "down") => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    if (myVotes[stockId]) {
      alert("이미 투표를 완료하셨습니다!");
      return;
    }

    // Optimistic UI update
    setMyVotes(prev => ({ ...prev, [stockId]: type }));
    setVotesData(prev => ({
      ...prev,
      [stockId]: {
        up: (prev[stockId]?.up || 0) + (type === "up" ? 1 : 0),
        down: (prev[stockId]?.down || 0) + (type === "down" ? 1 : 0),
      }
    }));

    try {
      // 1. 전체 통계 DB 업데이트
      const voteRef = doc(db, "daily_market_votes", `${today}_${stockId}`);
      const voteSnap = await getDoc(voteRef);
      if (!voteSnap.exists()) {
        await setDoc(voteRef, {
          up: type === "up" ? 1 : 0,
          down: type === "down" ? 1 : 0,
          date: today,
          stockId
        });
      } else {
        await updateDoc(voteRef, {
          [type]: increment(1)
        });
      }

      // 2. 개인 투표 기록 업데이트
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        daily_votes: {
          [today]: {
            [stockId]: type
          }
        },
        game_total: increment(1) // 참여 횟수 증가
      }, { merge: true });

    } catch (error) {
      console.error("Error saving vote:", error);
    }
  };

  const getAIPrediction = (stockId: string) => {
    // 날짜 + 종목ID를 시드로 사용하여 매일 고정된 %를 출력
    const seed = `${today}_${stockId}_AI_PREDICT`;
    const rand = pseudoRandom(seed);
    const prob = Math.floor(45 + (rand * 40)); // 45% ~ 85% 사이
    return prob;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center gap-2 bg-indigo-500/10 text-indigo-400 font-bold px-5 py-2 rounded-full text-sm mb-6 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <BrainCircuit className="w-4 h-4" />
            AI vs 인간 - 내일의 주가 예측 리그
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
            내일 주가, <span className="text-red-500">오를까</span> <span className="text-blue-500">내릴까?</span>
          </h1>
          <p className="text-gray-400 text-lg">
            AI의 예측을 이겨보세요! 개미들의 집단 지성 테스트
          </p>
        </div>

        {/* Game Cards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {GAME_STOCKS.map((stock, index) => {
            const vData = votesData[stock.id] || { up: 0, down: 0 };
            const totalVotes = vData.up + vData.down;
            const upPercent = totalVotes === 0 ? 50 : Math.round((vData.up / totalVotes) * 100);
            const downPercent = 100 - upPercent;
            const hasVoted = !!myVotes[stock.id];
            const aiProb = getAIPrediction(stock.id);
            const aiChoice = aiProb > 50 ? 'up' : 'down';

            return (
              <div 
                key={stock.id} 
                className="bg-[#111] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* AI Prediction Badge */}
                <div className="absolute top-4 right-4 flex flex-col items-end">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-lg backdrop-blur-md ${aiChoice === 'up' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    <BrainCircuit className="w-3.5 h-3.5" />
                    AI 예측: 상승확률 {aiProb}%
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-8 mt-2">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <Activity className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{stock.name}</h2>
                    <p className="text-sm text-gray-500">{stock.symbol}</p>
                  </div>
                </div>

                {!hasVoted ? (
                  <div className="grid grid-cols-2 gap-3 h-32">
                    <button
                      onClick={() => handleVote(stock.id, "up")}
                      className="relative flex flex-col items-center justify-center bg-white/[0.02] hover:bg-red-500/10 border border-white/5 hover:border-red-500/50 rounded-2xl transition-all group/btn"
                    >
                      <TrendingUp className="w-8 h-8 text-red-500 mb-2 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-sm font-bold text-gray-300 group-hover/btn:text-red-400">상승 예측</span>
                    </button>

                    <button
                      onClick={() => handleVote(stock.id, "down")}
                      className="relative flex flex-col items-center justify-center bg-white/[0.02] hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/50 rounded-2xl transition-all group/btn"
                    >
                      <TrendingDown className="w-8 h-8 text-blue-500 mb-2 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-sm font-bold text-gray-300 group-hover/btn:text-blue-400">하락 예측</span>
                    </button>
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in duration-500 pt-2 pb-4">
                    <h3 className="text-center text-sm font-bold mb-4 text-gray-400">
                      투표 완료! (총 {totalVotes.toLocaleString()}명 참여)
                    </h3>
                    
                    <div className="h-10 w-full flex rounded-xl overflow-hidden mb-4 relative ring-1 ring-white/10">
                      <div 
                        className="bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-start px-3 transition-all duration-1000 ease-out"
                        style={{ width: `${upPercent}%` }}
                      >
                        <span className="font-black text-white text-sm">{upPercent}%</span>
                      </div>
                      <div 
                        className="bg-gradient-to-l from-blue-600 to-blue-500 flex items-center justify-end px-3 transition-all duration-1000 ease-out"
                        style={{ width: `${downPercent}%` }}
                      >
                        <span className="font-black text-white text-sm">{downPercent}%</span>
                      </div>
                      
                      {/* VS Badge */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#111] rounded-full border border-white/20 flex items-center justify-center shadow-lg">
                        <span className="text-[10px] font-black italic text-gray-400">VS</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs font-bold px-1">
                      <span className="text-red-400">개미 상승 ({vData.up.toLocaleString()})</span>
                      <span className="text-blue-400">개미 하락 ({vData.down.toLocaleString()})</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Leaderboard Section */}
        <div className="bg-[#111] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-12">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500"></div>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">명예의 전당</h2>
              <p className="text-sm text-gray-500">최고의 적중률을 자랑하는 고수들</p>
            </div>
          </div>

          <div className="space-y-3">
            {leaderboard.length > 0 ? leaderboard.map((leader, idx) => (
              <div key={leader.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 
                    idx === 1 ? 'bg-gray-300 text-black' : 
                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-gray-200">{leader.displayName || "익명 개미"}</div>
                    <div className="text-xs text-gray-500">총 {leader.game_total || 0}회 참여</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                    {leader.game_wins || 0}승
                  </div>
                  <div className="text-xs text-gray-500">적중 횟수</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                아직 기록된 랭킹이 없습니다. 첫 번째 랭커에 도전하세요!
              </div>
            )}
          </div>
        </div>

        {/* Share Section */}
        <div className="text-center">
          <KakaoShareButton 
            title={`AI vs 인간 - 주가 예측 리그`}
            description={`삼성전자, 엔비디아 내일은 오를까 내릴까? AI의 예측을 확인하고 집단 지성에 투표하세요!`}
            url={`https://stock-trend-program.co.kr/game`}
            imageUrl="https://stock-trend-program.co.kr/api/og?title=AI%20vs%20인간&subtitle=주가%20예측%20리그%20시즌1&theme=이벤트"
            className="inline-flex bg-[#FEE500] hover:bg-[#FEE500]/90 text-black py-4 px-8 rounded-2xl text-lg font-bold items-center justify-center gap-3 transition-colors shadow-lg shadow-[#FEE500]/10"
            buttonText="카카오톡으로 친구 초대하기"
          />
        </div>

      </main>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
