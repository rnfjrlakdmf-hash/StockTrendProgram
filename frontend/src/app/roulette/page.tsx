"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Gift, Crown, XCircle, Coins, LogIn } from "lucide-react";
import LoginModal from "@/components/LoginModal";

export default function RoulettePage() {
    const { user, token } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [resultModal, setResultModal] = useState<{show: boolean, type: string, message: string} | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Segments mapping
    const segments = [
        { id: "pro_1h", label: "1시간 PRO", color: "#f59e0b", icon: Crown },
        { id: "point_10", label: "10 포인트", color: "#3b82f6", icon: Coins },
        { id: "none", label: "꽝", color: "#374151", icon: XCircle },
        { id: "point_50", label: "50 포인트", color: "#8b5cf6", icon: Coins },
        { id: "point_10", label: "10 포인트", color: "#3b82f6", icon: Coins },
        { id: "none", label: "꽝", color: "#374151", icon: XCircle },
    ];

    const handleSpin = async () => {
        if (!user) {
            setIsLoginModalOpen(true);
            return;
        }
        if (isSpinning) return;
        
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
                const matchingIndices = segments.map((s, i) => s.id === rewardType ? i : -1).filter(i => i !== -1);
                const targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
                
                const segmentAngle = 360 / segments.length;
                const targetAngle = targetIndex * segmentAngle;
                
                // Random offset within the segment to make it look realistic (avoid hitting dead center)
                const offset = Math.floor(Math.random() * (segmentAngle - 14)) - (segmentAngle / 2 - 7);
                
                // Spin 7 times + target angle
                const finalAngle = 360 * 7 + (360 - targetAngle) + offset;
                
                setRotation(prev => prev + finalAngle);

                // Optimistic UI update
                const updatedUser = { 
                    ...user, 
                    points: data.new_points,
                    free_trial_count: data.new_trial_count
                };
                localStorage.setItem("stock_user", JSON.stringify(updatedUser));

                setTimeout(() => {
                    setIsSpinning(false);
                    let message = "";
                    if (rewardType === "pro_1h") message = "축하합니다! 👑 1시간 PRO 자유이용권 당첨!";
                    else if (rewardType === "point_50") message = "축하합니다! 💰 50 포인트 당첨!";
                    else if (rewardType === "point_10") message = "축하합니다! 💰 10 포인트 당첨!";
                    else message = "아쉽네요... 다음 기회에 도전해주세요!";
                    
                    setResultModal({ show: true, type: rewardType, message });
                }, 5000); // 5 seconds spin animation
            }

        } catch (error) {
            console.error("Roulette Error", error);
            setErrorMsg("서버 통신 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden font-sans">
            <Sidebar />
            <div className="flex-1 overflow-y-auto relative">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none blur-3xl"></div>
                
                <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-full relative z-10">
                    <div className="text-center mb-12 mt-8">
                        <div className="inline-block relative">
                            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-600 mb-4 flex items-center justify-center gap-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                                <Gift className="w-12 h-12 text-yellow-400 animate-bounce" />
                                행운의 출석 룰렛
                                <Sparkles className="w-12 h-12 text-amber-400 animate-pulse" />
                            </h1>
                        </div>
                        <p className="text-gray-400 text-lg md:text-xl font-medium mt-2">
                            하루 2번 (국내장/미국장 오픈 전), 룰렛을 돌려 <span className="text-yellow-400 font-bold">👑PRO 자유이용권</span>의 행운을 잡아보세요!
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-900/40 border border-red-500/50 text-red-200 px-8 py-4 rounded-2xl mb-8 font-bold shadow-lg flex items-center gap-3">
                            <XCircle className="w-6 h-6 text-red-400" />
                            {errorMsg}
                        </div>
                    )}

                    {/* Premium Roulette Wheel Container */}
                    <div className="relative w-80 h-80 md:w-[450px] md:h-[450px] my-10">
                        {/* Outer Glow Ring */}
                        <div className="absolute inset-[-20px] rounded-full bg-yellow-500/20 blur-xl"></div>
                        
                        {/* Casino Lights Border */}
                        <div className="absolute inset-[-15px] rounded-full border-[10px] border-gray-900 shadow-[0_0_30px_#f59e0b_inset,0_0_40px_#f59e0b] z-0 flex items-center justify-center">
                            <div className="w-full h-full rounded-full border-[4px] border-dashed border-yellow-500/50 animate-[spin_20s_linear_infinite]"></div>
                        </div>

                        {/* Pointer */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_0_15px_rgba(239,68,68,1)]">
                            <div className="w-12 h-16 bg-gradient-to-b from-red-400 to-red-700 custom-clip-triangle flex items-center justify-center">
                                <div className="w-8 h-10 bg-gradient-to-b from-red-300 to-red-600 custom-clip-triangle -mt-2"></div>
                            </div>
                        </div>

                        {/* Wheel */}
                        <div 
                            className="w-full h-full rounded-full border-[8px] border-gray-800 relative overflow-hidden shadow-2xl"
                            style={{ 
                                transition: "transform 5s cubic-bezier(0.2, 0.8, 0.1, 1)",
                                transform: `rotate(${rotation}deg)`,
                                background: `conic-gradient(from -30deg, 
                                    ${segments[0].color} 0 60deg, 
                                    ${segments[1].color} 60deg 120deg, 
                                    ${segments[2].color} 120deg 180deg, 
                                    ${segments[3].color} 180deg 240deg, 
                                    ${segments[4].color} 240deg 300deg, 
                                    ${segments[5].color} 300deg 360deg)`
                            }}
                        >
                            {/* Separator Lines */}
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div 
                                    key={`sep-${i}`} 
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-white/20" 
                                    style={{ transform: `rotate(${i * 60 + 30}deg)` }}
                                ></div>
                            ))}

                            {/* Text & Icons */}
                            {segments.map((segment, index) => {
                                const angle = index * 60;
                                return (
                                    <div 
                                        key={index}
                                        className="absolute top-0 left-0 w-full h-full"
                                        style={{ transform: `rotate(${angle}deg)` }}
                                    >
                                        <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                            <segment.icon className="w-8 h-8 md:w-10 md:h-10 mb-2 opacity-95 text-white" />
                                            <span className="font-extrabold text-sm md:text-xl tracking-wider text-center leading-tight">
                                                {segment.label.split(' ').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {/* Center Pin */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gray-900 rounded-full border-4 border-gray-700 shadow-[0_0_20px_rgba(0,0,0,1)_inset] flex items-center justify-center z-20">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-800 rounded-full shadow-lg"></div>
                        </div>
                    </div>

                    {/* Action Button Area */}
                    <div className="mt-12 flex flex-col items-center gap-4">
                        <button
                            onClick={handleSpin}
                            disabled={isSpinning || (!user && isSpinning)} // Only disable if spinning when not logged in, to allow click -> modal
                            className={`group relative px-20 py-6 rounded-full font-black text-3xl md:text-4xl uppercase tracking-widest shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all overflow-hidden ${
                                isSpinning
                                ? "bg-gray-800 text-gray-500 cursor-not-allowed shadow-none" 
                                : "bg-gradient-to-b from-emerald-400 to-emerald-700 text-white hover:scale-105 hover:shadow-[0_0_60px_rgba(16,185,129,0.8)] border border-emerald-300"
                            }`}
                        >
                            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full -translate-x-full transition-transform duration-700 skew-x-12"></div>
                            {isSpinning ? "회전 중..." : "START SPIN"}
                        </button>
                        
                        {!user && (
                            <p className="text-yellow-400 font-medium flex items-center gap-2 bg-yellow-400/10 px-4 py-2 rounded-full">
                                <LogIn className="w-5 h-5" />
                                로그인 후 룰렛 이벤트에 참여하실 수 있습니다.
                            </p>
                        )}
                    </div>

                    {/* Result Modal */}
                    {resultModal?.show && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                            <div className="bg-gray-900 p-10 rounded-3xl shadow-[0_0_100px_rgba(250,204,21,0.2)] max-w-md w-full mx-4 border border-gray-700 text-center relative overflow-hidden">
                                {resultModal.type !== "none" && (
                                    <>
                                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl"></div>
                                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
                                    </>
                                )}
                                
                                <div className="mb-8 flex justify-center transform hover:scale-110 transition-transform">
                                    {resultModal.type === "pro_1h" ? (
                                        <Crown className="w-32 h-32 text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]" />
                                    ) : resultModal.type.startsWith("point") ? (
                                        <Coins className="w-32 h-32 text-blue-400 drop-shadow-[0_0_25px_rgba(96,165,250,0.6)]" />
                                    ) : (
                                        <XCircle className="w-32 h-32 text-gray-500" />
                                    )}
                                </div>
                                
                                <h3 className="text-3xl font-black text-white mb-8 leading-relaxed">
                                    {resultModal.message.split(' ').map((word, i) => (
                                        <span key={i} className={word.includes('당첨') || word.includes('PRO') || word.includes('포인트') ? 'text-yellow-400' : ''}>
                                            {word}{' '}
                                        </span>
                                    ))}
                                </h3>
                                
                                <button
                                    onClick={() => setResultModal(null)}
                                    className="w-full py-4 bg-gradient-to-r from-gray-100 to-white text-gray-900 rounded-2xl font-bold text-xl hover:bg-gray-200 hover:scale-105 transition-all shadow-xl"
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
            {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} />}
        </div>
    );
}
