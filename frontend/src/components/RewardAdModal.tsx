"use client";

import { useState, useEffect } from "react";
import { Play, X, Clock, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

interface RewardAdModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function RewardAdModal({ onClose, onSuccess }: RewardAdModalProps) {
    const { user, login } = useAuth();
    const [step, setStep] = useState<'intro' | 'watching' | 'completed'>('intro');
    const [timeLeft, setTimeLeft] = useState(5); // 시뮬레이션을 위해 5초로 설정
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let timer: any;
        if (step === 'watching' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (step === 'watching' && timeLeft === 0) {
            handleComplete();
        }
        return () => clearInterval(timer);
    }, [step, timeLeft]);

    const handleComplete = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/activate-trial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id || (user as any).uid })
            });
            const data = await res.json();
            if (data.status === 'success') {
                // Update local auth state to reflect Pro status
                if (login) {
                    await login({
                        id: user.id || (user as any).uid,
                        email: user.email || "",
                        name: user.name || "",
                        picture: user.picture || ""
                    });
                }
                setStep('completed');
            }
        } catch (error) {
            console.error(error);
            alert("처리 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {step === 'intro' && (
                    <div className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-blue-600/10">
                            <Sparkles className="w-10 h-10 text-blue-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">Pro 기능 1시간 무료체험</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                짧은 광고 한 편을 시청하시면<br />
                                1시간 동안 모든 스나이퍼 모드와 알림 기능을<br />
                                무제한으로 이용하실 수 있습니다!
                            </p>
                        </div>
                        <div className="pt-4 space-y-3">
                            <button
                                onClick={() => setStep('watching')}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                광고 시청하고 해제하기
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-2xl transition-all"
                            >
                                다음에 하기
                            </button>
                        </div>
                    </div>
                )}

                {step === 'watching' && (
                    <div className="p-12 text-center space-y-8 min-h-[300px] flex flex-col justify-center">
                        <div className="relative w-24 h-24 mx-auto">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="48" cy="48" r="40"
                                    stroke="currentColor" strokeWidth="8" fill="transparent"
                                    className="text-white/5"
                                />
                                <circle
                                    cx="48" cy="48" r="40"
                                    stroke="currentColor" strokeWidth="8" fill="transparent"
                                    strokeDasharray={251.2}
                                    strokeDashoffset={251.2 * (timeLeft / 5)}
                                    className="text-blue-500 transition-all duration-1000 ease-linear"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white">
                                {timeLeft}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg font-bold text-white">광고 시청 중...</p>
                            <p className="text-xs text-gray-500">잠시만 기다려 주시면 선물이 지급됩니다.</p>
                        </div>
                    </div>
                )}

                {step === 'completed' && (
                    <div className="p-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">잠금 해제 완료!</h3>
                            <p className="text-gray-400 text-sm">
                                지금부터 1시간 동안<br />
                                <span className="text-emerald-400 font-bold">Premium Pro 멤버십</span> 혜택이 적용됩니다.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                onSuccess();
                                onClose();
                            }}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                        >
                            기능 사용하러 가기
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                            <p className="text-white font-bold">권한 활성화 중...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
