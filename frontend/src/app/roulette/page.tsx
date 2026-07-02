"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Crown, XCircle, Coins, LogIn, Check } from "lucide-react";
import LoginModal from "@/components/LoginModal";
import confetti from "canvas-confetti";

export default function RoulettePage() {
    const { user, token } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [resultModal, setResultModal] = useState<{show: boolean, type: string, message: string} | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [currentAngle, setCurrentAngle] = useState(0);

    const spinAudioRef = useRef<HTMLAudioElement | null>(null);

    // Hyper-Detailed 3D Segments
    const segments = [
        { id: "pro_1h", label: "1시간 PRO", color: "rgba(15, 23, 42, 0.95)", textColor: "#fde047", icon: Crown }, 
        { id: "point_10", label: "10 포인트", color: "rgba(30, 41, 59, 0.95)", textColor: "#e2e8f0", icon: Coins },
        { id: "none", label: "다음 기회에", color: "rgba(15, 23, 42, 0.95)", textColor: "#64748b", icon: XCircle },
        { id: "point_50", label: "50 포인트", color: "rgba(30, 41, 59, 0.95)", textColor: "#a78bfa", icon: Coins },
        { id: "point_10", label: "10 포인트", color: "rgba(15, 23, 42, 0.95)", textColor: "#e2e8f0", icon: Coins },
        { id: "none", label: "다음 기회에", color: "rgba(30, 41, 59, 0.95)", textColor: "#64748b", icon: XCircle },
    ];

    const fireConfetti = () => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    };

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
                
                const offset = Math.floor(Math.random() * (segmentAngle - 10)) - (segmentAngle / 2 - 5);
                const spinRotations = 8;
                const finalAngle = 360 * spinRotations + (360 - targetAngle) + offset;
                
                setRotation(prev => prev + finalAngle);

                // Update simulated current angle for pointer ticking
                const startAngle = rotation;
                const endAngle = rotation + finalAngle;
                const duration = 6000;
                const startTime = performance.now();

                const animateTick = (time: number) => {
                    const elapsed = time - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    // easeOutCubic
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    setCurrentAngle(startAngle + easeOut * finalAngle);
                    if (progress < 1) {
                        requestAnimationFrame(animateTick);
                    }
                };
                requestAnimationFrame(animateTick);

                const updatedUser = { 
                    ...user, 
                    points: data.new_points,
                    free_trial_count: data.new_trial_count
                };
                localStorage.setItem("stock_user", JSON.stringify(updatedUser));

                setTimeout(() => {
                    setIsSpinning(false);
                    let message = "";
                    if (rewardType === "pro_1h") {
                        message = "👑 VIP 전용 1시간 PRO 이용권 발급 완료";
                        fireConfetti();
                    }
                    else if (rewardType === "point_50" || rewardType === "point_10") {
                        message = `💎 ${rewardType === "point_50" ? "50" : "10"} 포인트가 적립되었습니다`;
                        fireConfetti();
                    }
                    else {
                        message = "아쉽네요. 다음 기회에 도전해 주세요.";
                    }
                    
                    setResultModal({ show: true, type: rewardType, message });
                }, duration + 500); // Wait a tiny bit after spin stops
            }
        } catch (error) {
            setErrorMsg("네트워크 오류가 발생했습니다.");
        }
    };

    // Calculate if pointer is hitting a peg (every 60 degrees)
    const isHittingPeg = (currentAngle % 60 < 2 || currentAngle % 60 > 58) && isSpinning;

    return (
        <div className="flex h-[calc(100vh-80px)] w-full bg-[#020617] text-slate-200 font-sans selection:bg-amber-500/30 overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide flex flex-col items-center justify-center w-full">
                
                {/* VIP Ambient Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/30 via-[#020617] to-[#020617] pointer-events-none z-0"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none z-0"></div>
                
                {/* Moving Mesh Gradient */}
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[100px] animate-pulse pointer-events-none z-0"></div>
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] bg-amber-900/10 rounded-full blur-[100px] animate-pulse pointer-events-none z-0 delay-1000"></div>

                <div className="w-full max-w-5xl mx-auto p-4 md:p-10 flex flex-col items-center justify-center min-h-full relative z-10 pb-20 overflow-x-hidden">
                    
                    {/* Header: Refined & Elegant */}
                    <div className="text-center mb-10 mt-4 relative">
                        <div className="inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full bg-slate-900/80 border border-slate-700/50 shadow-[0_0_20px_rgba(251,191,36,0.15)] backdrop-blur-xl">
                            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                            <span className="text-amber-400 text-xs font-black tracking-[0.25em] uppercase">Premium Reward</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 mb-6 tracking-tight drop-shadow-lg">
                            VIP 스마트 룰렛
                        </h1>
                        <p className="text-slate-400 text-base md:text-xl max-w-xl mx-auto leading-relaxed font-light tracking-wide">
                            최고급 카지노 라운지에 오신 것을 환영합니다.<br className="hidden md:block" />
                            <span className="text-amber-400/90 font-medium border-b border-amber-400/30 pb-0.5">VIP PRO 이용권</span>을 향해 휠을 돌려보세요.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-950/80 border border-red-900/80 text-red-300 px-6 py-4 rounded-2xl mb-8 font-medium text-sm flex items-center gap-3 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
                            <XCircle className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">{errorMsg}</span>
                        </div>
                    )}

                    {/* Hyper-Detailed Roulette Wheel */}
                    <div className="relative w-[340px] h-[340px] md:w-[500px] md:h-[500px] mb-12 perspective-1000">
                        
                        {/* Majestic Outer Glow */}
                        <div className={`absolute inset-[-60px] rounded-full bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-amber-600/10 blur-[60px] transition-opacity duration-1000 ${isSpinning ? 'opacity-100' : 'opacity-50'}`}></div>

                        {/* Metallic Platinum Outer Ring Base */}
                        <div className="absolute inset-[-16px] rounded-full bg-gradient-to-br from-slate-600 via-slate-300 to-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_4px_10px_rgba(255,255,255,0.4)] z-0 p-[4px]">
                            
                            {/* Inner Dark Track */}
                            <div className="w-full h-full rounded-full bg-[#020617] shadow-[inset_0_0_30px_rgba(0,0,0,1)] relative">
                                {/* Casino Glowing Bulbs Array */}
                                {[...Array(24)].map((_, i) => (
                                    <div 
                                        key={`bulb-${i}`}
                                        className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                                        style={{ 
                                            transform: `rotate(${i * 15}deg) translateY(6px)`, 
                                            transformOrigin: "0 236px", // approx half of 480px inner ring
                                            backgroundColor: isSpinning ? (i % 2 === 0 ? '#fbbf24' : '#60a5fa') : '#334155',
                                            boxShadow: isSpinning ? `0 0 10px ${i % 2 === 0 ? '#fbbf24' : '#60a5fa'}` : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                                            animation: isSpinning ? `pulse 0.5s infinite alternate ${i * 0.05}s` : 'none'
                                        }}
                                    ></div>
                                ))}
                            </div>
                        </div>

                        {/* Animated Ticker Pointer */}
                        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 z-40 drop-shadow-[0_15px_15px_rgba(0,0,0,0.9)] flex flex-col items-center transition-transform duration-75 ${isHittingPeg ? '-translate-y-2 rotate-3' : 'translate-y-0 rotate-0'}`}>
                            {/* Pointer body */}
                            <div className="w-12 h-16 bg-gradient-to-b from-amber-100 via-yellow-400 to-amber-700 custom-clip-triangle shadow-inner relative">
                                <div className="absolute inset-[2px] bg-gradient-to-b from-white via-amber-300 to-amber-600 custom-clip-triangle"></div>
                                {/* Highlight reflection */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-white/50 blur-[1px]"></div>
                            </div>
                            {/* Hinge Pin */}
                            <div className="w-4 h-4 bg-gradient-to-br from-slate-300 to-slate-700 rounded-full -mt-3 border-[2px] border-slate-900 shadow-[0_5px_10px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
                            </div>
                        </div>

                        {/* The Wheel */}
                        <div className="absolute inset-0 rounded-full border-[6px] border-[#0a0f1c] shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] overflow-hidden z-10 bg-[#020617]">
                            <div 
                                className="w-full h-full rounded-full relative"
                                style={{ 
                                    transition: "transform 6s cubic-bezier(0.15, 0.85, 0.15, 1)", 
                                    transform: `rotate(${rotation}deg)`
                                }}
                            >
                                {/* Base Gradient */}
                                <div className="absolute inset-0" style={{
                                    background: `conic-gradient(from -30deg, 
                                        ${segments[0].color} 0 60deg, 
                                        ${segments[1].color} 60deg 120deg, 
                                        ${segments[2].color} 120deg 180deg, 
                                        ${segments[3].color} 180deg 240deg, 
                                        ${segments[4].color} 240deg 300deg, 
                                        ${segments[5].color} 300deg 360deg)`
                                }}></div>

                                {/* Radial shading for 3D cone effect */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.8)_100%)] mix-blend-overlay"></div>
                                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(255,255,255,0.1)_0deg,transparent_60deg,rgba(255,255,255,0.1)_120deg,transparent_180deg,rgba(255,255,255,0.1)_240deg,transparent_300deg,rgba(255,255,255,0.1)_360deg)] mix-blend-overlay"></div>

                                {/* Hardware Details: Seams and Pegs */}
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <React.Fragment key={`seam-${i}`}>
                                        {/* Golden/Metallic Seams */}
                                        <div 
                                            className="absolute top-0 left-1/2 -translate-x-1/2 w-[3px] h-full bg-gradient-to-b from-slate-400 via-slate-800 to-slate-400 opacity-50 shadow-[0_0_5px_rgba(0,0,0,1)]" 
                                            style={{ transform: `rotate(${i * 60 + 30}deg)` }}
                                        ></div>
                                        {/* Physical Pegs (Ticking pins) */}
                                        <div 
                                            className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-slate-300 to-slate-700 shadow-[0_4px_4px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-slate-900 z-20"
                                            style={{ 
                                                transform: `rotate(${i * 60 + 30}deg) translateY(0px)`, 
                                                transformOrigin: "0 240px" // half of 480 approx inner height
                                            }}
                                        ></div>
                                    </React.Fragment>
                                ))}

                                {/* Text & Icons */}
                                {segments.map((segment, index) => {
                                    const angle = index * 60;
                                    const isPro = segment.id === "pro_1h";
                                    return (
                                        <div 
                                            key={`text-${index}`}
                                            className="absolute top-0 left-0 w-full h-full"
                                            style={{ transform: `rotate(${angle}deg)` }}
                                        >
                                            <div className="absolute top-10 md:top-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                {/* Glowing Icon Container */}
                                                <div className={`p-3 rounded-2xl mb-4 border relative overflow-hidden group ${isPro ? 'bg-amber-500/20 border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'bg-slate-800/80 border-slate-600/50 shadow-inner'}`}>
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                                    <segment.icon 
                                                        className={`w-7 h-7 md:w-10 md:h-10 ${isPro ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,1)]' : 'text-slate-300 opacity-80'}`} 
                                                        strokeWidth={isPro ? 2 : 1.5}
                                                    />
                                                </div>
                                                
                                                <span 
                                                    className={`font-black text-[14px] md:text-[17px] tracking-[0.1em] text-center uppercase ${isPro ? 'text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 drop-shadow-[0_2px_5px_rgba(0,0,0,1)]' : 'drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'}`}
                                                    style={{ color: isPro ? undefined : segment.textColor }}
                                                >
                                                    {segment.label}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        
                        {/* Center Pin (Hyper-Realistic Hub) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-slate-500 via-slate-700 to-slate-900 shadow-[0_15px_30px_rgba(0,0,0,0.9),inset_0_3px_5px_rgba(255,255,255,0.4)] p-[3px] z-30">
                            <div className="w-full h-full rounded-full bg-gradient-to-bl from-[#0f172a] to-[#020617] border-4 border-slate-950 shadow-[inset_0_10px_20px_rgba(0,0,0,1)] flex items-center justify-center relative overflow-hidden">
                                {/* Inner metal gear detail */}
                                <div className="absolute inset-0 bg-[repeating-conic-gradient(rgba(255,255,255,0.05)_0_15deg,transparent_15deg_30deg)]"></div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-700 shadow-[0_5px_10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.6)] relative z-10 flex items-center justify-center">
                                    <div className="w-3 h-3 bg-slate-900 rounded-full shadow-inner"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* VIP Action Button Area */}
                    <div className="flex flex-col items-center gap-6 w-full max-w-sm mt-4">
                        <button
                            onClick={handleSpin}
                            disabled={isSpinning || (!user && isSpinning)}
                            className={`group relative w-full py-5 md:py-6 rounded-3xl font-black text-xl md:text-2xl tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden ${
                                isSpinning
                                ? "bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed shadow-none backdrop-blur-sm" 
                                : "bg-gradient-to-b from-blue-600 via-indigo-600 to-blue-800 text-white border-t border-blue-400/50 border-b-4 border-b-blue-950 shadow-[0_20px_40px_rgba(37,99,235,0.4)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.6)] hover:-translate-y-1 active:translate-y-1 active:border-b-0"
                            }`}
                        >
                            {!isSpinning && (
                                <>
                                    {/* Glass reflection */}
                                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-3xl pointer-events-none"></div>
                                    {/* Scanline reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none skew-x-12"></div>
                                </>
                            )}
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {isSpinning ? "추첨 진행 중..." : (
                                    <>
                                        <Sparkles className="w-6 h-6 text-blue-200" />
                                        START SPIN
                                    </>
                                )}
                            </div>
                        </button>
                        
                        {!user && (
                            <button 
                                onClick={() => setIsLoginModalOpen(true)}
                                className="text-slate-500 text-sm hover:text-white transition-colors flex items-center gap-2 group bg-slate-900/50 px-5 py-2.5 rounded-full border border-slate-800/50 backdrop-blur-sm"
                            >
                                <div className="p-1 rounded-full bg-slate-800 group-hover:bg-blue-600 transition-colors">
                                    <LogIn className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                                </div>
                                <span className="tracking-wide">로그인 후 참여 가능합니다</span>
                            </button>
                        )}
                    </div>

                    {/* Elite Result Modal */}
                    {resultModal?.show && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-300 perspective-1000">
                            <div className="bg-gradient-to-b from-[#0f172a] to-[#020617] p-12 md:p-14 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] max-w-md w-full mx-4 border border-slate-800/80 relative overflow-hidden transform animate-in zoom-in-95 duration-500">
                                
                                {/* Modal Inner Ambient Glow */}
                                {resultModal.type === "pro_1h" && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[80%] bg-gradient-to-b from-amber-500/20 to-transparent blur-[60px] pointer-events-none"></div>
                                )}
                                {(resultModal.type === "point_50" || resultModal.type === "point_10") && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[80%] bg-gradient-to-b from-blue-500/20 to-transparent blur-[60px] pointer-events-none"></div>
                                )}
                                
                                <div className="mb-10 flex justify-center relative">
                                    <div className={`relative p-8 rounded-[2rem] bg-[#020617] border border-slate-800 shadow-[inset_0_10px_30px_rgba(0,0,0,1),0_20px_40px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-300`}>
                                        {resultModal.type === "pro_1h" ? (
                                            <Crown className="w-20 h-20 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse" strokeWidth={1.5} />
                                        ) : resultModal.type.startsWith("point") ? (
                                            <Coins className="w-20 h-20 text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.6)] animate-bounce" strokeWidth={1.5} />
                                        ) : (
                                            <XCircle className="w-20 h-20 text-slate-600" strokeWidth={1.5} />
                                        )}
                                    </div>
                                </div>
                                
                                <div className="text-center mb-12 relative z-10">
                                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight leading-snug">
                                        {resultModal.message.split(' ').map((word, i) => (
                                            <span key={i} className={word.includes('VIP') || word.includes('PRO') ? 'text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-500 drop-shadow-sm' : word.includes('포인트') ? 'text-transparent bg-clip-text bg-gradient-to-br from-blue-200 to-blue-500' : ''}>
                                                {word}{' '}
                                            </span>
                                        ))}
                                    </h3>
                                    <p className="text-slate-400 text-sm md:text-base font-light tracking-wide">
                                        {resultModal.type === "none" ? "내일 다시 특별한 혜택에 도전하세요." : "VIP 보상이 계정으로 안전하게 지급되었습니다."}
                                    </p>
                                </div>
                                
                                <button
                                    onClick={() => setResultModal(null)}
                                    className="relative w-full py-5 bg-gradient-to-br from-slate-100 to-slate-300 text-slate-900 rounded-2xl font-black text-lg tracking-[0.1em] hover:from-white hover:to-slate-200 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-white/40 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 rounded-2xl pointer-events-none"></div>
                                    <Check className="w-6 h-6" strokeWidth={3} />
                                    <span>확인 완료</span>
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <style dangerouslySetInnerHTML={{__html: `
                        .custom-clip-triangle {
                            clip-path: polygon(50% 100%, 0 0, 100% 0);
                        }
                        .perspective-1000 {
                            perspective: 1000px;
                        }
                    `}} />
                </div>
            </div>
            {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} />}
        </div>
    );
}
