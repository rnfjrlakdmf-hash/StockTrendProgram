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

// 게임 종목 풀 (이 중에서 매일 4개를 랜덤하게 픽)
const STOCK_POOL = [
  { id: "KOSPI", name: "코스피", symbol: "KOSPI", type: "index" },
  { id: "KOSDAQ", name: "코스닥", symbol: "KOSDAQ", type: "index" },
  { id: "SPX", name: "S&P 500", symbol: "SPX", type: "index" },
  { id: "NDX", name: "나스닥 100", symbol: "NDX", type: "index" },
  { id: "005930", name: "삼성전자", symbol: "005930.KS", type: "stock" },
  { id: "000660", name: "SK하이닉스", symbol: "000660.KS", type: "stock" },
  { id: "035420", name: "NAVER", symbol: "035420.KS", type: "stock" },
  { id: "035720", name: "카카오", symbol: "035720.KS", type: "stock" },
  { id: "NVDA", name: "엔비디아", symbol: "NVDA", type: "stock" },
  { id: "TSLA", name: "테슬라", symbol: "TSLA", type: "stock" },
  { id: "AAPL", name: "애플", symbol: "AAPL", type: "stock" },
  { id: "MSFT", name: "마이크로소프트", symbol: "MSFT", type: "stock" },
  { id: "MSTR", name: "마이크로스트래티지", symbol: "MSTR", type: "stock" },
  { id: "BTC", name: "비트코인", symbol: "BTC-USD", type: "crypto" },
  { id: "ETH", name: "이더리움", symbol: "ETH-USD", type: "crypto" },
  { id: "SOL", name: "솔라나", symbol: "SOL-USD", type: "crypto" },
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

// 특정 날짜에 고정된 4개의 종목을 뽑는 함수
const getDailyStocks = (dateStr: string) => {
  const shuffled = [...STOCK_POOL].sort((a, b) => pseudoRandom(`${dateStr}_${a.id}`) - 0.5);
  return shuffled.slice(0, 4);
};

// 어제 날짜 구하기 (KST 기준)
const getYesterday = () => {
  const d = new Date();
  // UTC에서 한국시간(UTC+9)으로 맞춘 뒤 하루를 뺌
  d.setHours(d.getHours() + 9);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export default function UpDownGamePage() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [votesData, setVotesData] = useState<Record<string, { up: number, down: number }>>({});
  const [myVotes, setMyVotes] = useState<Record<string, "up" | "down">>(({}));
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // User Gamification Stats
  const [myStreak, setMyStreak] = useState<number>(0);
  const [myScore, setMyScore] = useState<number>(0);
  const [myWins, setMyWins] = useState<number>(0);
  const [myTotal, setMyTotal] = useState<number>(0);

  // Get today's date in YYYY-MM-DD KST format
  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '-').replace('.', '');

  useEffect(() => {
    if (user) {
      const loadUserVotes = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.daily_votes && data.daily_votes[today]) {
            setMyVotes(data.daily_votes[today]);
          }
          setMyStreak(data.streak || 0);
          setMyScore(data.score || 0);
          setMyWins(data.game_wins || 0);
          setMyTotal(data.game_total || 0);
        }
      };
      loadUserVotes();
    } else {
      setMyVotes({});
      setMyStreak(0);
      setMyScore(0);
      setMyWins(0);
      setMyTotal(0);
    }

    const dailyStocks = getDailyStocks(today);
    const unsubscribes = dailyStocks.map(stock => {
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

    const loadLeaderboard = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("score", "desc"), limit(10));
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

      // 2. 개인 투표 기록 및 연속 출석(Streak) 업데이트
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      
      let newStreak = userData.streak || 0;
      let newScore = userData.score || 0;
      const lastVoteDate = userData.last_vote_date;
      const yesterday = getYesterday().replace(/-/g, ''); // today format matched
      
      // 하루 첫 투표 시에만 출석 로직 계산
      const isFirstVoteToday = lastVoteDate !== today;
      if (isFirstVoteToday) {
        if (lastVoteDate === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
        // 첫 출석 시 기본 10점 + 연속 출석 뱃지당 추가 보너스
        newScore += 10 + (newStreak * 2);
        setMyStreak(newStreak);
      } else {
        // 이미 오늘 투표를 한 번 이상 한 경우 추가 투표 보너스 (5점)
        newScore += 5;
      }
      setMyScore(newScore);

      await setDoc(userRef, {
        daily_votes: {
          [today]: {
            [stockId]: type
          }
        },
        game_total: increment(1),
        streak: newStreak,
        score: newScore,
        last_vote_date: today,
        displayName: user.name || "익명 개미"
      }, { merge: true });

    } catch (error) {
      console.error("Error saving vote:", error);
    }
  };

  const getAIPrediction = (stockId: string) => {
    const seed = `${today}_${stockId}_AI_PREDICT`;
    const rand = pseudoRandom(seed);
    return Math.floor(45 + (rand * 40));
  };

  const dailyStocks = getDailyStocks(today);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center gap-2 bg-indigo-500/10 text-indigo-400 font-bold px-5 py-2 rounded-full text-sm mb-6 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <BrainCircuit className="w-4 h-4" />
            AI vs 인간 - 내일의 주가 예측 리그
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
            내일 주가, <span className="text-red-500">오를까</span> <span className="text-blue-500">내릴까?</span>
          </h1>
          <p className="text-gray-400 text-lg">
            AI의 예측을 이겨보세요! 누적 포인트로 명예의 전당에 오르세요.
          </p>
        </div>

        {/* Gamification Stats Bar (If logged in) */}
        {user && (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between mb-8 shadow-xl animate-fade-in-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white/10 shadow-lg">
                <span className="font-black text-xl">{user.name?.charAt(0) || "나"}</span>
              </div>
              <div>
                <div className="text-sm text-gray-400">내 예측 점수</div>
                <div className="text-2xl font-black text-white">{myScore.toLocaleString()} <span className="text-sm font-medium text-indigo-400">PTS</span></div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 mt-4 sm:mt-0">
              {myStreak > 0 && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold mb-1 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                    <Flame className="w-3.5 h-3.5 fill-red-500" />
                    {myStreak}일 연속 출석 중!
                  </div>
                  <span className="text-[10px] text-gray-500">보너스 점수 적용됨</span>
                </div>
              )}
              <div className="text-right">
                <div className="text-sm text-gray-400">내 적중률</div>
                <div className="text-lg font-bold text-white">
                  {myTotal > 0 ? Math.round((myWins / myTotal) * 100) : 0}% <span className="text-xs font-normal text-gray-500">({myWins}/{myTotal})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Cards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {dailyStocks.map((stock, index) => {
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
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>적중 {leader.game_wins || 0}회</span>
                      {leader.streak > 0 && <span className="text-red-400">🔥 {leader.streak}일 연속</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                    {leader.score ? leader.score.toLocaleString() : 0} PTS
                  </div>
                  <div className="text-xs text-gray-500">종합 점수</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                아직 기록된 랭킹이 없습니다. 첫 번째 랭커에 도전하세요!
              </div>
            )}
          </div>
        </div>

        {/* Share Section (Viral Loop) */}
        <div className="text-center mb-8">
          <KakaoShareButton 
            title={myScore > 0 ? `[내 점수 자랑하기] 현재 내 예측 점수: ${myScore}점!` : `AI vs 인간 - 주가 예측 리그`}
            description={myStreak > 0 ? `🔥 ${myStreak}일 연속 출석 중! 과연 당신은 나의 주식 예측 실력을 이길 수 있을까? 지금 도전하세요.` : `삼성전자, 엔비디아 내일은 오를까 내릴까? AI의 예측을 확인하고 집단 지성에 투표하세요!`}
            url={`https://stock-trend-program.co.kr/game`}
            imageUrl="https://stock-trend-program.co.kr/api/og?title=AI%20vs%20인간&subtitle=주가%20예측%20리그%20시즌1&theme=이벤트"
            className="inline-flex bg-[#FEE500] hover:bg-[#FEE500]/90 text-black py-4 px-8 rounded-2xl text-lg font-bold items-center justify-center gap-3 transition-colors shadow-lg shadow-[#FEE500]/10 hover:scale-105 active:scale-95 duration-200"
            buttonText={myScore > 0 ? "🔥 카카오톡으로 내 점수 자랑하기" : "카카오톡으로 친구 초대하기"}
          />
        </div>

      </main>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
