"use client";

import { useState, useEffect } from "react";
import { X, Play, Loader2, Coins, Zap } from "lucide-react";

interface AdModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReward: () => void;
    featureName: string;
}

export default function AdRewardModal({ isOpen, onClose, onReward, featureName }: AdModalProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5); // 5초 광고 시뮬레이션

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPlaying && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (isPlaying && timeLeft === 0) {
            // 광고 끝
            setTimeout(() => {
                onReward();
                setIsPlaying(false);
                setTimeLeft(5);
            }, 500);
        }
        return () => clearInterval(timer);
    }, [isPlaying, timeLeft, onReward]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            {isPlaying ? (
                // 광고 재생 화면 (Simulation)
                <div className="bg-white text-black w-full max-w-sm aspect-[9/16] rounded-xl relative overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Ad : {timeLeft}s
                    </div>

                    <div className="text-center p-6 space-y-4 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-blue-500 rounded-xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl">
                            A
                        </div>
                        <h3 className="text-xl font-bold">Best App Ever!</h3>
                        <p className="text-gray-500 text-sm">Download now and get free bonus.</p>
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold w-full animate-pulse">
                            Install Now
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                        <div
                            className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
                            style={{ width: `${((5 - timeLeft) / 5) * 100}%` }}
                        />
                    </div>
                </div>
            ) : (
                // 광고 유도 팝업
                <div className="bg-gray-900 border border-white/10 w-full max-w-sm rounded-[2rem] p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-300">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
                            <Coins className="w-10 h-10 text-white fill-white/20" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-white mb-2">
                        Unlock <span className="text-yellow-400">{featureName}</span>
                    </h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        고급 AI 분석에는 많은 비용이 듭니다.<br />
                        짧은 광고를 보고 무료로 이용하시겠습니까?
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => setIsPlaying(true)}
                            className="w-full py-4 bg-white text-black rounded-xl font-black text-lg hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl"
                        >
                            <Play className="w-5 h-5 fill-current" /> 광고 보고 무료 사용
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-gray-500 font-bold hover:text-white transition-colors text-sm"
                        >
                            다음에 할게요
                        </button>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-center items-center gap-2 text-xs text-gray-500">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span>Premium 회원은 광고가 없습니다.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
