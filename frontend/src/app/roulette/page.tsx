"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Crown, XCircle, Coins, LogIn, ChevronDown, Check } from "lucide-react";
import LoginModal from "@/components/LoginModal";

export default function RoulettePage() {
    const { user, token } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [resultModal, setResultModal] = useState<{show: boolean, type: string, message: string} | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Hyper-Premium VIP Segments
    const segments = [
        { id: "pro_1h", label: "1시간 PRO", color: "rgba(15, 23, 42, 0.95)", textColor: "#fde047", icon: Crown, border: "rgba(250, 204, 21, 0.5)" }, 
        { id: "point_10", label: "10 포인트", color: "rgba(30, 41, 59, 0.95)", textColor: "#e2e8f0", icon: Coins, border: "rgba(148, 163, 184, 0.2)" },
        { id: "none", label: "다음 기회에", color: "rgba(15, 23, 42, 0.95)", textColor: "#64748b", icon: XCircle, border: "rgba(148, 163, 184, 0.2)" },
        { id: "point_50", label: "50 포인트", color: "rgba(30, 41, 59, 0.95)", textColor: "#a78bfa", icon: Coins, border: "rgba(167, 139, 250, 0.3)" },
        { id: "point_10", label: "10 포인트", color: "rgba(15, 23, 42, 0.95)", textColor: "#e2e8f0", icon: Coins, border: "rgba(148, 163, 184, 0.2)" },
        { id: "none", label: "다음 기회에", color: "rgba(30, 41, 59, 0.95)", textColor: "#64748b", icon: XCircle, border: "rgba(148, 163, 184, 0.2)" },
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
                
                const offset = Math.floor(Math.random() * (segmentAngle - 10)) - (segmentAngle / 2 - 5);
                const finalAngle = 360 * 8 + (360 - targetAngle) + offset; // Spin 8 times for drama
                
                setRotation(prev => prev + finalAngle);

                const updatedUser = { 
                    ...user, 
                    points: data.new_points,
                    free_trial_count: data.new_trial_count
                };
                localStorage.setItem("stock_user", JSON.stringify(updatedUser));

                setTimeout(() => {
                    setIsSpinning(false);
                    let message = "";
                    if (rewardType === "pro_1h") message = "👑 VIP 전용 1시간 PRO 이용권 발급 완료";
                    else if (rewardType === "point_50") message = "💎 50 포인트가 적립되었습니다";
                    else if (rewardType === "point_10") message = "💎 10 포인트가 적립되었습니다";
                    else message = "아쉽네요. 다음 기회에 도전해 주세요.";
                    
                    setResultModal({ show: true, type: rewardType, message });
                }, 6000); // 6 sec spin
            }
        } catch (error) {
            setErrorMsg("네트워크 오류가 발생했습니다.");
        }
    };

    return (
        <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-amber-500/30">
            <Sidebar />
            <div className="flex-1 overflow-y-auto relative scrollbar-hide">
                
                {/* VIP Ambient Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/40 via-[#020617] to-[#020617] pointer-events-none"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen pointer-events-none"></div>

                <div className="max-w-4xl mx-auto p-6 md:p-12 flex flex-col items-center justify-center min-h-full relative z-10">
                    
                    {/* Header: Refined & Elegant */}
                    <div className="text-center mb-16 mt-4">
                        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)] backdrop-blur-md">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400/90 text-xs font-bold tracking-[0.2em] uppercase">Premium Reward</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 mb-6 tracking-tight drop-shadow-sm">
                            스마트 투자 비서 출석 룰렛
                        </h1>
                        <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed font-light tracking-wide">
                            매일 장 시작 전 접속하고, <br className="hidden md:block" />
                            <span className="text-amber-400/90 font-medium border-b border-amber-400/30 pb-0.5">VIP PRO 이용권</span>의 특별한 혜택을 누려보세요.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-950/50 border border-red-900/50 text-red-300 px-6 py-3 rounded-xl mb-10 font-medium text-sm flex items-center gap-3 backdrop-blur-md shadow-2xl">
                            <XCircle className="w-5 h-5" />
                            {errorMsg}
                        </div>
                    )}

                    {/* Hyper-Detailed Roulette Wheel */}
                    <div className="relative w-[340px] h-[340px] md:w-[480px] md:h-[480px] mb-16 perspective-1000">
                        
                        {/* Majestic Outer Glow */}
                        <div className="absolute inset-[-40px] rounded-full bg-amber-500/5 blur-[50px]"></div>

                        {/* Metallic Platinum/Gold Outer Ring */}
                        <div className="absolute inset-[-12px] rounded-full bg-gradient-to-br from-slate-700 via-slate-400 to-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.3)] z-0 p-[2px]">
                            <div className="w-full h-full rounded-full bg-[#020617] shadow-[inset_0_0_20px_rgba(0,0,0,1)]"></div>
                        </div>

                        {/* Elegant Pointer */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-40 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] flex flex-col items-center">
                            <div className="w-10 h-14 bg-gradient-to-b from-amber-200 via-yellow-500 to-amber-700 custom-clip-triangle shadow-inner relative">
                                <div className="absolute inset-[2px] bg-gradient-to-b from-amber-100 via-yellow-400 to-amber-600 custom-clip-triangle"></div>
                            </div>
                            <div className="w-3 h-3 bg-slate-800 rounded-full -mt-2 border-[1.5px] border-amber-500/50 shadow-lg z-10"></div>
                        </div>

                        {/* The Wheel */}
                        <div 
                            className="w-full h-full rounded-full relative overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] border-[4px] border-[#0f172a]"
                            style={{ 
                                transition: "transform 6s cubic-bezier(0.15, 0.85, 0.15, 1)", // Smoother, longer ease
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
                            {/* Glassmorphic Overlay for Depth */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>

                            {/* Separator Lines (Metallic) */}
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div 
                                    key={`sep-${i}`} 
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-gradient-to-b from-transparent via-slate-600/40 to-transparent" 
                                    style={{ transform: `rotate(${i * 60 + 30}deg)` }}
                                ></div>
                            ))}

                            {/* Text & Icons */}
                            {segments.map((segment, index) => {
                                const angle = index * 60;
                                const isPro = segment.id === "pro_1h";
                                return (
                                    <div 
                                        key={index}
                                        className="absolute top-0 left-0 w-full h-full"
                                        style={{ transform: `rotate(${angle}deg)` }}
                                    >
                                        <div className="absolute top-8 md:top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                            {/* Icon with refined styling */}
                                            <div className={`p-2.5 rounded-xl mb-3 ${isPro ? 'bg-amber-500/10 shadow-[0_0_15px_rgba(251,191,36,0.15)]' : 'bg-slate-800/50'} border border-white/5`}>
                                                <segment.icon 
                                                    className={`w-6 h-6 md:w-8 md:h-8 ${isPro ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'opacity-70'}`} 
                                                    color={segment.textColor}
                                                    strokeWidth={1.5}
                                                />
                                            </div>
                                            
                                            <span 
                                                className={`font-semibold text-[13px] md:text-[15px] tracking-[0.05em] text-center uppercase ${isPro ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : ''}`}
                                                style={{ color: segment.textColor }}
                                            >
                                                {segment.label}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {/* Center Pin (Titanium Look) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-slate-600 via-slate-800 to-slate-900 shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] p-[2px] z-30">
                            <div className="w-full h-full rounded-full bg-[#0b1120] border-4 border-slate-900 shadow-[inset_0_5px_15px_rgba(0,0,0,1)] flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 shadow-inner"></div>
                            </div>
                        </div>
                    </div>

                    {/* VIP Action Button Area */}
                    <div className="flex flex-col items-center gap-5 w-full max-w-sm">
                        <button
                            onClick={handleSpin}
                            disabled={isSpinning || (!user && isSpinning)}
                            className={`group relative w-full py-4 md:py-5 rounded-2xl font-bold text-lg md:text-xl tracking-[0.1em] transition-all duration-500 overflow-hidden ${
                                isSpinning
                                ? "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed shadow-none" 
                                : "bg-gradient-to-r from-slate-800 to-slate-900 text-white border border-slate-700 hover:border-slate-500 shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                            }`}
                        >
                            {!isSpinning && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></div>
                            )}
                            <div className="relative z-10 flex items-center justify-center gap-2">
                                {isSpinning ? "추첨 진행 중..." : (
                                    <>
                                        <Sparkles className="w-5 h-5 text-amber-400/80" />
                                        룰렛 돌리기
                                    </>
                                )}
                            </div>
                        </button>
                        
                        {!user && (
                            <button 
                                onClick={() => setIsLoginModalOpen(true)}
                                className="text-slate-500 text-sm hover:text-slate-300 transition-colors flex items-center gap-2 group"
                            >
                                <div className="p-1.5 rounded-full bg-slate-800/50 group-hover:bg-slate-700/50 transition-colors">
                                    <LogIn className="w-3.5 h-3.5" />
                                </div>
                                로그인 후 참여 가능합니다
                            </button>
                        )}
                    </div>

                    {/* Elite Result Modal */}
                    {resultModal?.show && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-[#0b1120] p-10 md:p-12 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-md w-full mx-4 border border-slate-800 relative overflow-hidden">
                                
                                {/* Modal Inner Ambient Glow */}
                                {resultModal.type === "pro_1h" && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-amber-500/10 blur-[50px] pointer-events-none"></div>
                                )}
                                
                                <div className="mb-8 flex justify-center relative">
                                    <div className={`relative p-5 rounded-3xl bg-[#020617] border border-slate-800 shadow-inner`}>
                                        {resultModal.type === "pro_1h" ? (
                                            <Crown className="w-14 h-14 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" strokeWidth={1.5} />
                                        ) : resultModal.type.startsWith("point") ? (
                                            <Coins className="w-14 h-14 text-purple-400 drop-shadow-[0_0_15px_rgba(167,139,250,0.4)]" strokeWidth={1.5} />
                                        ) : (
                                            <XCircle className="w-14 h-14 text-slate-600" strokeWidth={1.5} />
                                        )}
                                    </div>
                                </div>
                                
                                <div className="text-center mb-10">
                                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight">
                                        {resultModal.message.split(' ').map((word, i) => (
                                            <span key={i} className={word.includes('VIP') || word.includes('PRO') || word.includes('포인트') ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500' : ''}>
                                                {word}{' '}
                                            </span>
                                        ))}
                                    </h3>
                                    <p className="text-slate-500 text-sm font-light">
                                        {resultModal.type === "none" ? "내일 다시 혜택에 도전하세요." : "보상이 계정으로 지급되었습니다."}
                                    </p>
                                </div>
                                
                                <button
                                    onClick={() => setResultModal(null)}
                                    className="w-full py-4 bg-slate-100 text-slate-900 rounded-xl font-bold text-base hover:bg-white transition-colors shadow-[0_5px_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                                >
                                    <Check className="w-5 h-5" />
                                    확인
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
