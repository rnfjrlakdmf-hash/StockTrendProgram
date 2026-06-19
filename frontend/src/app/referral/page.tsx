"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Copy, Check, Gift, Infinity as InfinityIcon, ShieldAlert } from 'lucide-react';
import { getApiBaseUrl } from '@/config/api';

export default function ReferralPage() {
    const router = useRouter();
    const [referralCode, setReferralCode] = useState<string>('');
    const [isUnlimited, setIsUnlimited] = useState<boolean>(false);
    const [dailyCount, setDailyCount] = useState<number>(0);
    const [inputCode, setInputCode] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

    useEffect(() => {
        fetchReferralInfo();
    }, []);

    const fetchReferralInfo = async () => {
        try {
            const uid = localStorage.getItem('uuid');
            if (!uid) {
                router.push('/');
                return;
            }
            
            const res = await fetch(`${getApiBaseUrl()}/api/referral/me`, {
                headers: { 'x-user-id': uid }
            });
            const data = await res.json();
            
            if (res.ok) {
                setReferralCode(data.referral_code);
                setIsUnlimited(data.is_unlimited_alerts);
                setDailyCount(data.daily_alert_count);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        if (!window.Kakao || !window.Kakao.isInitialized()) {
            if (navigator.share) {
                navigator.share({
                    title: '스톡 트렌드 프로그램 초대',
                    text: `프리미엄 주식 알림앱! 제 추천인 코드 [${referralCode}] 입력하고 평생 무료 알림 받으세요!`,
                    url: window.location.href,
                }).catch(console.error);
            } else {
                alert("카카오톡이 설치되어 있지 않거나 지원하지 않는 브라우저입니다.");
            }
            return;
        }

        window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: '프리미엄 주식 정보앱 초대',
                description: `추천인 코드 [${referralCode}] 입력하고 세력 포착, 상한가 알림 평생 무료로 받으세요!`,
                imageUrl: 'https://stock-trend-program.co.kr/og-image.png',
                link: {
                    mobileWebUrl: window.location.href,
                    webUrl: window.location.href,
                },
            },
            buttons: [
                {
                    title: '앱 열기',
                    link: {
                        mobileWebUrl: window.location.href,
                        webUrl: window.location.href,
                    },
                },
            ],
        });
    };

    const handleSubmit = async () => {
        if (!inputCode.trim()) return;
        
        try {
            const uid = localStorage.getItem('uuid');
            const res = await fetch(`${getApiBaseUrl()}/api/referral/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': uid || 'guest'
                },
                body: JSON.stringify({ referral_code: inputCode })
            });
            const data = await res.json();
            
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setIsUnlimited(true);
            } else {
                setMessage({ type: 'error', text: data.detail || '오류가 발생했습니다.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' });
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
            {/* Header */}
            <div className="bg-gradient-to-b from-blue-900/40 to-transparent pt-12 pb-8 px-4 text-center">
                <Gift className="w-16 h-16 mx-auto text-blue-400 mb-4 animate-bounce" />
                <h1 className="text-3xl font-black mb-2">친구 초대하고<br/>평생 무제한 혜택받기</h1>
                <p className="text-gray-400 text-sm">
                    초대한 사람도, 받은 사람도 모두 프리미엄 알림 평생 무료!
                </p>
            </div>

            <div className="max-w-md mx-auto px-4 space-y-6 -mt-4 relative z-10">
                {/* Status Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg">내 알림 상태</h2>
                        {isUnlimited ? (
                            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <InfinityIcon className="w-3 h-3" /> 무제한 적용됨
                            </span>
                        ) : (
                            <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> 일일 {3 - dailyCount}회 남음
                            </span>
                        )}
                    </div>
                    
                    {!isUnlimited && (
                        <div className="w-full bg-gray-800 rounded-full h-2.5 mb-2">
                            <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${(dailyCount/3)*100}%` }}></div>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 text-center">
                        {isUnlimited ? '모든 프리미엄 알림을 제한 없이 받을 수 있습니다.' : '친구를 초대하면 알림 횟수 제한이 영구적으로 사라집니다.'}
                    </p>
                </div>

                {/* Invite Card */}
                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                    
                    <h2 className="font-bold text-lg mb-2">내 초대 코드</h2>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex-1 text-center font-mono text-2xl tracking-widest font-bold text-blue-400">
                            {referralCode}
                        </div>
                        <button 
                            onClick={handleCopy}
                            className="bg-white/10 p-4 rounded-xl hover:bg-white/20 transition-colors"
                        >
                            {copied ? <Check className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6" />}
                        </button>
                    </div>

                    <button 
                        onClick={handleShare}
                        className="w-full bg-[#FEE500] text-[#191919] font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 hover:scale-[1.02] transition-transform"
                    >
                        <Share2 className="w-5 h-5" />
                        카카오톡으로 초대장 보내기
                    </button>
                </div>

                {/* Submit Code Card */}
                {!isUnlimited && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="font-bold text-lg mb-2">초대 코드 입력</h2>
                        <p className="text-xs text-gray-400 mb-4">친구에게 받은 코드가 있다면 입력해주세요.</p>
                        
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                placeholder="8자리 코드 입력"
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 font-mono uppercase focus:outline-none focus:border-blue-500"
                            />
                            <button 
                                onClick={handleSubmit}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                            >
                                등록
                            </button>
                        </div>
                        
                        {message && (
                            <p className={`mt-3 text-sm text-center font-bold ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {message.text}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
