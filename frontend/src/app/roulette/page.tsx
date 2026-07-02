"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Gift, Crown, XCircle, Coins, LogIn, ChevronDown } from "lucide-react";
import LoginModal from "@/components/LoginModal";

export default function RoulettePage() {
    const { user, token } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [resultModal, setResultModal] = useState<{show: boolean, type: string, message: string} | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Sleek FinTech Segments mapping
    const segments = [
        { id: "pro_1h", label: "1시간 PRO", color: "#281900", textColor: "#fbbf24", icon: Crown }, // Subtle dark gold
        { id: "point_10", label: "10 포인트", color: "#0f172a", textColor: "#60a5fa", icon: Coins }, // Slate 900
        { id: "none", label: "다음 기회에", color: "#1e293b", textColor: "#94a3b8", icon: XCircle }, // Slate 800
        { id: "point_50", label: "50 포인트", color: "#1e1b4b", textColor: "#c084fc", icon: Coins }, // Deep indigo
        { id: "point_10", label: "10 포인트", color: "#0f172a", textColor: "#60a5fa", icon: Coins },
        { id: "none", label: "다음 기회에", color: "#1e293b", textColor: "#94a3b8", icon: XCircle },
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
                
                // Random offset within the segment to make it look realistic
                const offset = Math.floor(Math.random() * (segmentAngle - 10)) - (segmentAngle / 2 - 5);
                
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
                    if (rewardType === "pro_1h") message = "👑 1시간 PRO 이용권에 당첨되었습니다.";
                    else if (rewardType === "point_50") message = "💰 50 포인트가 적립되었습니다.";
                    else if (rewardType === "point_10") message = "💰 10 포인트가 적립되었습니다.";
                    else message = "아쉽네요. 다음 기회에 도전해 주세요.";
                    
                    setResultModal({ show: true, type: rewardType, message });
                }, 5000);
            }

        } catch (error) {
            console.error("Roulette Error", error);
            setErrorMsg("서버 통신 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="flex h-screen bg-[#0b1120] text-slate-300 overflow-hidden font-sans selection:bg-blue-500/30">
            <Sidebar />
            <div className="flex-1 overflow-y-auto relative scrollbar-hide">
                
                {/* Subtle Ambient Background Gradient matching site vibe */}
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-900/10 via-slate-900/5 to-transparent pointer-events-none"></div>

                <div className="max-w-3xl mx-auto p-8 flex flex-col items-center justify-center min-h-full relative z-10">
                    
                    {/* Header Section */}
                    <div className="text-center mb-10 mt-4">
                        <div className="inline-flex items-center justify-center gap-3 mb-4 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold tracking-wide">
                            <Sparkles className="w-4 h-4" />
                            <span>DAILY REWARD</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                            스마트 투자 비서 출석 룰렛
                        </h1>
                        <p className="text-slate-400 text-base md:text-lg max-w-lg mx-auto leading-relaxed font-light">
                            매일 국내장/미국장 오픈 전 접속하고, <br className="hidden md:block" />
                            <span className="text-amber-400 font-medium">1시간 PRO 프리미엄 이용권</span>과 포인트를 획득하세요.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-3 rounded-xl mb-8 font-medium text-sm flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            {errorMsg}
                        </div>
                    )}

                    {/* Minimalist Roulette Container */}
                    <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px] mb-12 mt-4">
                        
                        {/* Soft Outer Shadow */}
                        <div className="absolute inset-[-10px] rounded-full bg-blue-500/5 blur-2xl"></div>

                        {/* Outer Sleek Ring */}
                        <div className="absolute inset-[-8px] rounded-full border border-slate-700/50 bg-[#0f172a] shadow-[0_0_20px_rgba(0,0,0,0.5)] z-0"></div>

                        {/* Pointer Arrow */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 drop-shadow-lg">
                            <ChevronDown className="w-12 h-12 text-blue-500" strokeWidth={2.5} />
                        </div>

                        {/* The Wheel */}
                        <div 
                            className="w-full h-full rounded-full relative overflow-hidden shadow-inner border border-slate-700/80"
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
                            {/* Thin Separator Lines */}
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div 
                                    key={`sep-${i}`} 
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-slate-700/50" 
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
                                        <div className="absolute top-6 md:top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                            <segment.icon 
                                                className="w-6 h-6 md:w-7 md:h-7 mb-2 opacity-80" 
                                                color={segment.textColor}
                                            />
                                            <span 
                                                className="font-medium text-xs md:text-sm tracking-wide text-center"
                                                style={{ color: segment.textColor }}
                                            >
                                                {segment.label}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {/* Center Pin */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#0f172a] rounded-full border border-slate-700 shadow-md flex items-center justify-center z-20">
                            <div className="w-6 h-6 bg-slate-800 rounded-full shadow-inner border border-slate-600/50"></div>
                        </div>
                    </div>

                    {/* Modern Action Button */}
                    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                        <button
                            onClick={handleSpin}
                            disabled={isSpinning || (!user && isSpinning)}
                            className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 shadow-lg border ${
                                isSpinning
                                ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed shadow-none" 
                                : "bg-blue-600 text-white border-blue-500 hover:bg-blue-500 hover:shadow-blue-500/25"
                            }`}
                        >
                            {isSpinning ? "추첨 진행 중..." : "룰렛 돌리기"}
                        </button>
                        
                        {!user && (
                            <button 
                                onClick={() => setIsLoginModalOpen(true)}
                                className="text-slate-400 text-sm hover:text-white transition-colors flex items-center gap-1.5 mt-2"
                            >
                                <LogIn className="w-4 h-4" />
                                로그인이 필요합니다
                            </button>
                        )}
                    </div>

                    {/* Sleek Result Modal */}
                    {resultModal?.show && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1120]/80 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-[#0f172a] p-8 md:p-10 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-slate-700 text-center relative">
                                
                                <div className="mb-6 flex justify-center">
                                    <div className={`p-4 rounded-full bg-slate-800/50 border border-slate-700`}>
                                        {resultModal.type === "pro_1h" ? (
                                            <Crown className="w-12 h-12 text-amber-400" />
                                        ) : resultModal.type.startsWith("point") ? (
                                            <Coins className="w-12 h-12 text-blue-400" />
                                        ) : (
                                            <XCircle className="w-12 h-12 text-slate-500" />
                                        )}
                                    </div>
                                </div>
                                
                                <h3 className="text-lg md:text-xl font-semibold text-white mb-8">
                                    {resultModal.message.split(' ').map((word, i) => (
                                        <span key={i} className={word.includes('당첨') || word.includes('PRO') || word.includes('포인트') || word.includes('적립') ? 'text-blue-400' : ''}>
                                            {word}{' '}
                                        </span>
                                    ))}
                                </h3>
                                
                                <button
                                    onClick={() => setResultModal(null)}
                                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-500 transition-colors border border-blue-500"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} />}
        </div>
    );
}
