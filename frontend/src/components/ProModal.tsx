"use client";

import React from "react";
import { X, Crown, Zap, LineChart, Newspaper } from "lucide-react";
import { requestPayment } from "@/lib/payment";

interface ProModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProModal({ isOpen, onClose }: ProModalProps) {
    if (!isOpen) return null;

    const exchangeRate = 1450; // Fallback or pass via props
    const proPriceUsd = 3.5;
    const proPriceKrw = Math.floor(proPriceUsd * exchangeRate / 10) * 10;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative bg-[#111] border border-white/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/20 to-transparent" />

                <div className="p-8 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center mb-6">
                        <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-black px-3 py-1 rounded-full mb-4 animate-bounce">
                            🚀 GRAND LAUNCH SPECIAL
                        </div>
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/30">
                            <Crown className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">PRO 멤버십 혜택</h2>
                        <p className="text-gray-400 text-sm">일일 제한 없이 AI 투자 비서를 무제한 고용하세요.</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <BenefitItem
                            icon={<Zap className="w-5 h-5 text-yellow-400" />}
                            title="무제한 AI 채팅 & 분석"
                            desc="하루 3회 제한 없이, 언제든 종목 상담을 받을 수 있습니다."
                        />
                        <BenefitItem
                            icon={<LineChart className="w-5 h-5 text-green-400" />}
                            title="실시간 스나이퍼 알림"
                            desc="RSI 과매도, 골든크로스 등 매수 타이밍을 놓치지 마세요."
                        />
                        <BenefitItem
                            icon={<Newspaper className="w-5 h-5 text-blue-400" />}
                            title="심층 리포트 & 공급망 분석"
                            desc="기업의 숨겨진 리스크와 공급망 관계를 한눈에 파악하세요."
                        />
                    </div>

                    <button
                        onClick={async () => {
                            try {
                                await requestPayment(() => {
                                    localStorage.setItem("isPro", "true");
                                    alert("결제가 완료되었습니다! 프로 기능이 활성화됩니다.");
                                    onClose();
                                    window.location.reload();
                                });
                            } catch (e: any) {
                                alert("결제 요청 실패: " + e.message);
                            }
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-[1.02] shadow-lg shadow-blue-600/30 flex flex-col items-center justify-center gap-1"
                    >
                        <span className="text-blue-200 text-xs font-normal line-through">$10.00/mo</span>
                        <span>월 ${proPriceUsd} (약 ₩{proPriceKrw.toLocaleString()})으로 시작하기</span>
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-4">
                        * 언제든 해지 가능합니다.
                    </p>
                </div>
            </div>
        </div>
    );
}

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="mt-1">{icon}</div>
            <div>
                <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
