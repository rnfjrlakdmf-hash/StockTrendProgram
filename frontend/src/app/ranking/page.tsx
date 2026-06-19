"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Target, TrendingUp, Share2 } from 'lucide-react';
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
                setTop100(data.top_100);
                setMyRank(data.my_rank);
                setTotalUsers(data.total_ranked_users);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getMedalColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-400';
        if (rank === 2) return 'text-gray-300';
        if (rank === 3) return 'text-amber-600';
        return 'text-blue-400';
    };

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

    const myPercentile = myRank && totalUsers > 0 
        ? Math.max(1, Math.round((myRank.rank / totalUsers) * 100))
        : null;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
            {/* Header */}
            <div className="bg-gradient-to-b from-purple-900/40 to-transparent pt-12 pb-8 px-4 text-center">
                <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                <h1 className="text-3xl font-black mb-2">이번 주 주식 고수 랭킹</h1>
                <p className="text-gray-400 text-sm">
                    관심종목 수익률을 기준으로 매일 업데이트 됩니다.
                </p>
            </div>

            <div className="max-w-2xl mx-auto px-4 space-y-6 -mt-4 relative z-10">
                {/* My Rank Card */}
                {myRank ? (
                    <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <h2 className="text-purple-300 font-bold mb-1">내 랭킹 현황</h2>
                                <div className="text-4xl font-black flex items-end gap-2">
                                    {myRank.rank}위
                                    <span className="text-sm font-normal text-gray-400 mb-1">/ 상위 {myPercentile}%</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-400 mb-1">포트폴리오 수익률</div>
                                <div className={`text-2xl font-bold ${myRank.score > 0 ? 'text-red-400' : myRank.score < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {myRank.score > 0 ? '+' : ''}{myRank.score.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        {myPercentile && myPercentile <= 10 && (
                            <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mb-4">
                                <Star className="w-4 h-4 fill-yellow-400" />
                                당신은 상위 10% 이내의 주식 고수입니다!
                            </div>
                        )}

                        <KakaoShareButton 
                            title={`🏆 전국 주식 고수 랭킹 상위 ${myPercentile}% 인증!`}
                            description={`제 관심종목 평균 수익률은 ${myRank.score > 0 ? '+' : ''}${myRank.score.toFixed(2)}% 입니다. 스톡 트렌드 프로그램에서 당신의 실력도 확인해보세요!`}
                            url={`${API_BASE_URL === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/ranking`}
                            buttonText="내 랭킹 확인하기"
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/20"
                            customIcon={<Share2 className="w-5 h-5" />}
                        />
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                        <Target className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <h3 className="font-bold mb-2">관심종목을 등록하고 랭킹에 도전하세요!</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            관심종목에 종목과 매수단가를 입력하면 자동으로 랭킹에 참여됩니다.
                        </p>
                    </div>
                )}

                {/* Leaderboard */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
                        <h2 className="font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            TOP 100 리더보드
                        </h2>
                        <span className="text-xs text-gray-500">총 {totalUsers.toLocaleString()}명 참여 중</span>
                    </div>
                    
                    <div className="divide-y divide-white/5">
                        {top100.map((user, idx) => (
                            <div key={user.user_id} className={`p-4 flex items-center gap-4 ${myRank?.user_id === user.user_id ? 'bg-purple-500/10' : 'hover:bg-white/5'}`}>
                                <div className={`w-8 text-center font-bold text-lg ${getMedalColor(user.rank)}`}>
                                    {user.rank <= 3 ? <Medal className="w-6 h-6 mx-auto" /> : user.rank}
                                </div>
                                <div className="flex-1 font-bold">
                                    {user.nickname}
                                </div>
                                <div className={`font-mono font-bold ${user.score > 0 ? 'text-red-400' : user.score < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {user.score > 0 ? '+' : ''}{user.score.toFixed(2)}%
                                </div>
                            </div>
                        ))}
                        {top100.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                아직 랭킹 데이터가 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
