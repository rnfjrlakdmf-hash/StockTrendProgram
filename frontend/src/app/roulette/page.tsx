"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Gift, Crown, XCircle, Coins } from "lucide-react";

export default function RoulettePage() {
    const { user, token } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [resultModal, setResultModal] = useState<{show: boolean, type: string, message: string} | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    // Segments mapping
    const segments = [
        { id: "pro_1h", label: "1시간 PRO", color: "from-yellow-400 to-amber-600", icon: Crown },
        { id: "point_10", label: "10 포인트", color: "from-blue-400 to-blue-600", icon: Coins },
        { id: "none", label: "꽝", color: "from-gray-500 to-gray-700", icon: XCircle },
        { id: "point_50", label: "50 포인트", color: "from-purple-400 to-purple-600", icon: Coins },
        { id: "point_10", label: "10 포인트", color: "from-blue-400 to-blue-600", icon: Coins },
        { id: "none", label: "꽝", color: "from-gray-500 to-gray-700", icon: XCircle },
    ];

    const handleSpin = async () => {
        if (!user || isSpinning) return;
        setErrorMsg("");

        try {
            const res = await fetch(`${API_BASE_URL}/api/event/roulette/spin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": user.id,
                },
            });
            const data = await res.json();

            if (data.status === "error") {
                setErrorMsg(data.message);
                return;
            }

            if (data.status === "success") {
                setIsSpinning(true);
                
                const rewardType = data.reward;
                // Find matching segments
                const matchingIndices = segments.map((s, i) => s.id === rewardType ? i : -1).filter(i => i !== -1);
                // Pick one randomly if multiple
                const targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
                
                const segmentAngle = 360 / segments.length;
                const targetAngle = targetIndex * segmentAngle;
                
                // Random offset within the segment
                const offset = Math.floor(Math.random() * (segmentAngle - 10)) - (segmentAngle / 2 - 5);
                
                // Total rotation: 5 full spins (1800 deg) + target
                const finalAngle = 360 * 5 + (360 - targetAngle) + offset;
                
                setRotation(prev => prev + finalAngle);

                // Update local storage user profile optimistic
                const updatedUser = { 
                    ...user, 
                    points: data.new_points,
                    free_trial_count: data.new_trial_count
                };
                localStorage.setItem("stock_user", JSON.stringify(updatedUser));

                setTimeout(() => {
                    setIsSpinning(false);
                    let message = "";
                    if (rewardType === "pro_1h") message = "축하합니다! 👑 1시간 PRO 자유이용권에 당첨되셨습니다!";
                    else if (rewardType === "point_50") message = "축하합니다! 💰 50 포인트에 당첨되셨습니다!";
                    else if (rewardType === "point_10") message = "축하합니다! 💰 10 포인트에 당첨되셨습니다!";
                    else message = "아쉽네요... 다음 기회에 도전해주세요!";
                    
                    setResultModal({ show: true, type: rewardType, message });
                }, 4000); // Wait for CSS animation
            }

        } catch (error) {
            console.error("Roulette Error", error);
            setErrorMsg("서버 통신 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-full">
                    <div className="text-center mb-8 mt-12">
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 mb-4 flex items-center justify-center gap-3">
                            <Gift className="w-10 h-10 text-yellow-400" />
                            행운의 출석 룰렛
                            <Sparkles className="w-10 h-10 text-amber-500" />
                        </h1>
                        <p className="text-gray-300 text-lg">
                            하루 2번 (국내장/미국장 오픈 전), 룰렛을 돌려 👑PRO 자유이용권의 행운을 잡아보세요!
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-3 rounded-xl mb-8 font-medium">
                            {errorMsg}
                        </div>
                    )}

                    {/* Roulette Wheel */}
                    <div className="relative w-80 h-80 md:w-96 md:h-96 my-8">
                        {/* Pointer */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
                            <div className="w-8 h-12 bg-red-500 custom-clip-triangle shadow-xl border-2 border-red-700"></div>
                        </div>

                        {/* Wheel */}
                        <div 
                            className="w-full h-full rounded-full border-4 border-gray-700 shadow-2xl relative overflow-hidden"
                            style={{ 
                                transition: "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)",
                                transform: `rotate(${rotation}deg)` 
                            }}
                        >
                            {segments.map((segment, index) => {
                                const angle = index * (360 / segments.length);
                                const skew = 90 - (360 / segments.length);
                                return (
                                    <div 
                                        key={index}
                                        className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left border border-white/20"
                                        style={{
                                            transform: `rotate(${angle}deg) skewY(-${skew}deg)`,
                                            background: `linear-gradient(135deg, ${segment.color === 'from-yellow-400 to-amber-600' ? '#facc15, #d97706' : segment.color === 'from-blue-400 to-blue-600' ? '#60a5fa, #2563eb' : segment.color === 'from-purple-400 to-purple-600' ? '#c084fc, #9333ea' : '#6b7280, #374151'})`
                                        }}
                                    >
                                        <div 
                                            className="absolute bottom-0 left-0 text-center w-full pb-16 pl-6"
                                            style={{
                                                transform: `skewY(${skew}deg) rotate(${360/segments.length/2}deg)`,
                                            }}
                                        >
                                            <span className="text-white font-bold text-sm md:text-base drop-shadow-md">
                                                {segment.label}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {/* Center dot */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-800 rounded-full border-4 border-gray-600 z-10 flex items-center justify-center shadow-inner">
                            <div className="w-6 h-6 bg-gray-900 rounded-full"></div>
                        </div>
                    </div>

                    <button
                        onClick={handleSpin}
                        disabled={isSpinning || !user}
                        className={`px-12 py-4 rounded-full font-bold text-xl shadow-xl transition-all ${
                            isSpinning || !user 
                            ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                            : "bg-gradient-to-r from-green-400 to-emerald-600 text-white hover:scale-105 hover:shadow-emerald-500/50"
                        }`}
                    >
                        {isSpinning ? "회전 중..." : "START"}
                    </button>

                    {/* Result Modal */}
                    {resultModal?.show && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 border border-gray-700 text-center relative overflow-hidden">
                                {resultModal.type !== "none" && (
                                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl"></div>
                                )}
                                
                                <div className="mb-6 flex justify-center">
                                    {resultModal.type === "pro_1h" ? (
                                        <Crown className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                                    ) : resultModal.type.startsWith("point") ? (
                                        <Coins className="w-24 h-24 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                                    ) : (
                                        <XCircle className="w-24 h-24 text-gray-500" />
                                    )}
                                </div>
                                
                                <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                                    {resultModal.message}
                                </h3>
                                
                                <button
                                    onClick={() => setResultModal(null)}
                                    className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <style dangerouslySetInnerHTML={{__html: `
                        .custom-clip-triangle {
                            clip-path: polygon(50% 100%, 0 0, 100% 0);
                        }
                    `}} />
                </div>
            </div>
        </div>
    );
}
