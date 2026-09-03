"use client";

import KakaoRevenueAd from '@/components/KakaoRevenueAd';
import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Star, Target, TrendingUp, Share2, Crown, Sparkles, 
  Flame, Award, ShieldCheck, ArrowUpRight, Zap, Users
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import KakaoShareButton from '@/components/KakaoShareButton';

interface RankUser {
  user_id: string;
  nickname: string;
  score: number;
  rank: number;
}

export default function RankingPage() {
  const [top100, setTop100] = useState<RankUser[]>([]);
  const [myRank, setMyRank] = useState<RankUser | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const uid = localStorage.getItem('uuid');
      const res = await fetch(`${API_BASE_URL}/api/ranking`, {
        headers: uid ? { 'x-user-id': uid } : {}
      });
      const data = await res.json();
      
      if (res.ok) {
        setTop100(data.top_100 || []);
        setMyRank(data.my_rank);
        setTotalUsers(data.total_ranked_users || (data.top_100 ? data.top_100.length : 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const myPercentile = myRank && totalUsers > 0 
    ? Math.max(1, Math.round((myRank.rank / totalUsers) * 100))
    : null;

  const top1 = top100.find(u => u.rank === 1);
  const top2 = top100.find(u => u.rank === 2);
  const top3 = top100.find(u => u.rank === 3);

  return (
    <div className="min-h-screen bg-[#07080a] text-white pb-24 text-left">
      {/* Top Banner Ad Slot */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <KakaoRevenueAd type="banner" />
      </div>

      {/* 럭셔리 VIP 헤더 */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-950/40 via-zinc-950 to-transparent pt-12 pb-10 px-4 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-black shadow-lg shadow-amber-500/5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>2026 대한민국 주식 고수 마스터 랭킹</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            전국 주식 고수 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-purple-400">VIP 리더보드</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            실시간 포트폴리오 수익률과 계량 퀀트 진단 점수를 종합하여 매일 엄격하게 산출되는 명예의 전당입니다.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-10 relative z-10">

        {/* 🏆 TOP 3 VIP 포디엄 (Podium) 쇼케이스 */}
        {top100.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 pb-2">
            {/* 2등 실버 */}
            {top2 && (
              <div className="bg-gradient-to-t from-zinc-900/90 via-zinc-900/60 to-slate-900/80 border border-slate-400/30 rounded-3xl p-4 sm:p-6 text-center space-y-2 relative shadow-xl backdrop-blur-md h-[210px] sm:h-[240px] flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-400/20 border border-slate-300/40 text-slate-300 flex items-center justify-center font-black mx-auto text-sm sm:text-base shadow-md">
                    🥈 2위
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-white truncate">{top2.nickname}</h3>
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-black font-mono text-emerald-400">
                    {top2.score > 0 ? '+' : ''}{top2.score.toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium block">실버 마스터</span>
                </div>
              </div>
            )}

            {/* 1등 골드 (가장 높고 화려함) */}
            {top1 && (
              <div className="bg-gradient-to-t from-amber-950/70 via-zinc-900/90 to-yellow-950/60 border border-amber-400/50 rounded-3xl p-4 sm:p-6 text-center space-y-3 relative shadow-2xl shadow-amber-500/20 backdrop-blur-md h-[250px] sm:h-[290px] flex flex-col justify-between -mt-6 ring-2 ring-amber-400/30">
                <div className="space-y-1.5">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-black mx-auto text-lg sm:text-2xl shadow-xl ring-4 ring-amber-400/20">
                    👑 1위
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3 text-amber-300" /> 그랜드 챔피언
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-white truncate">{top1.nickname}</h3>
                </div>
                <div className="pb-1">
                  <div className="text-lg sm:text-2xl font-black font-mono text-amber-300 tracking-tight">
                    {top1.score > 0 ? '+' : ''}{top1.score.toFixed(2)}%
                  </div>
                  <span className="text-[11px] text-amber-400/70 font-bold block">전국 1위 주식 고수</span>
                </div>
              </div>
            )}

            {/* 3등 브론즈 */}
            {top3 && (
              <div className="bg-gradient-to-t from-zinc-900/90 via-zinc-900/60 to-amber-950/40 border border-amber-700/30 rounded-3xl p-4 sm:p-6 text-center space-y-2 relative shadow-xl backdrop-blur-md h-[190px] sm:h-[220px] flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-800/20 border border-amber-600/40 text-amber-500 flex items-center justify-center font-black mx-auto text-sm sm:text-base shadow-md">
                    🥉 3위
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-white truncate">{top3.nickname}</h3>
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-black font-mono text-emerald-400">
                    {top3.score > 0 ? '+' : ''}{top3.score.toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium block">브론즈 마스터</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 내 랭킹 현황 VIP 카드 */}
        {myRank ? (
          <div className="bg-gradient-to-br from-indigo-950/60 via-zinc-900/90 to-purple-950/60 border border-purple-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 mb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">MY RANKING STATUS</span>
                  {myPercentile && myPercentile <= 10 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-300" /> 상위 10% 슈퍼개미
                    </span>
                  )}
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white flex items-baseline gap-2">
                  <span>{myRank.rank}위</span>
                  <span className="text-xs sm:text-sm font-normal text-zinc-400">/ 상위 {myPercentile}% (총 {totalUsers}명 중)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 sm:text-right space-y-1">
                <span className="text-xs text-zinc-400 font-medium block">내 포트폴리오 수익률</span>
                <div className={`text-2xl sm:text-3xl font-black font-mono ${myRank.score > 0 ? 'text-rose-400' : myRank.score < 0 ? 'text-sky-400' : 'text-zinc-400'}`}>
                  {myRank.score > 0 ? '+' : ''}{myRank.score.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* 원클릭 카카오톡 랭킹 자랑하기 */}
            <KakaoShareButton 
              title={`🏆 전국 주식 고수 랭킹 상위 ${myPercentile}% 달성!`}
              description={`내 관심종목 평균 수익률은 ${myRank.score > 0 ? '+' : ''}${myRank.score.toFixed(2)}% 입니다. 스마트 투자 비서에서 당신의 실력도 확인해보세요!`}
              url={`${API_BASE_URL === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/ranking`}
              buttonText="내 주식 고수 랭킹 인증하기"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-500/25 text-sm sm:text-base border border-purple-400/30 active:scale-[0.99]"
              customIcon={<Share2 className="w-5 h-5" />}
            />
          </div>
        ) : (
          <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <Target className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">관심종목을 등록하고 랭킹에 도전하세요!</h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                관심종목 탭에서 종목과 매수 단가를 입력하시면 매일 자동으로 전국 고수들과 수익률이 겨뤄집니다.
              </p>
            </div>
          </div>
        )}

        {/* 📊 TOP 100 마스터 리더보드 테이블 */}
        <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">TOP 100 명예의 전당</h2>
                <p className="text-xs text-zinc-400">당일 실시간 시장 수익률 랭킹</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              총 {totalUsers.toLocaleString()}명 참여 중
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {top100.map((user) => {
              const isTop1 = user.rank === 1;
              const isTop2 = user.rank === 2;
              const isTop3 = user.rank === 3;
              const isMe = myRank?.user_id === user.user_id;

              return (
                <div 
                  key={user.user_id} 
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-all ${
                    isMe 
                      ? 'bg-purple-500/15 border-l-4 border-purple-500 font-bold' 
                      : isTop1 
                      ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-8 text-center shrink-0">
                      {isTop1 ? <span className="text-xl">🥇</span> :
                       isTop2 ? <span className="text-xl">🥈</span> :
                       isTop3 ? <span className="text-xl">🥉</span> :
                       <span className="text-sm font-mono font-bold text-zinc-400">{user.rank}</span>}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-white truncate">{user.nickname}</span>
                        {isMe && (
                          <span className="text-[10px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full">
                            MY
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        포트폴리오 고수 · Rank #{user.rank}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-base sm:text-lg font-black font-mono ${user.score > 0 ? 'text-rose-400' : user.score < 0 ? 'text-sky-400' : 'text-zinc-400'}`}>
                      {user.score > 0 ? '+' : ''}{user.score.toFixed(2)}%
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium block">수익률</span>
                  </div>
                </div>
              );
            })}

            {top100.length === 0 && !loading && (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-sm font-medium">아직 등록된 랭킹 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
