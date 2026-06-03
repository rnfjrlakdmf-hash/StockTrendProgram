"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Send, UserCheck, AlertOctagon, CheckCircle2, ShieldX, Loader2, Download, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import AdRewardModal from "@/components/AdRewardModal";

import { isFreeModeEnabled } from "@/lib/adminMode";
import { checkReward } from "@/lib/reward";

export default function CoachPage() {
    const [logText, setLogText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [showAdModal, setShowAdModal] = useState(false);
    const [hasPaid, setHasPaid] = useState(false);

    const handleRequest = () => {
        if (!logText.trim()) return;

        // Check for Pro Mode (Admin Bypass)
        if (hasPaid || isFreeModeEnabled() || checkReward()) {
            handleSubmit();
        } else {
            setShowAdModal(true);
        }
    };

    const handleAdReward = () => {
        setHasPaid(true);
        setShowAdModal(false);
        setTimeout(handleSubmit, 100);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/coach`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ log_text: logText })
            });
            const json = await res.json();
            if (json.status === "success") {
                setResult(json.data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleDownloadImage = async () => {
        const captureEl = document.getElementById("capture-area");
        if (!captureEl) return;

        try {
            // 버튼들(클래스에 hide-on-capture 추가) 숨기기 위해 잠시 처리
            const buttons = captureEl.querySelectorAll('.hide-on-capture');
            buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

            const canvas = await html2canvas(captureEl, {
                backgroundColor: "#000000",
                scale: 2,
                logging: false,
                useCORS: true
            });

            buttons.forEach(btn => (btn as HTMLElement).style.display = ''); // 복구

            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = "ai_trading_coach_result.png";
            link.href = url;
            link.click();
        } catch (e) {
            console.error(e);
            alert("이미지 저장에 실패했습니다.");
        }
    };


    return (
        <div className="min-h-screen pb-10">
            <Header />

            <AdRewardModal
                isOpen={showAdModal}
                onClose={() => setShowAdModal(false)}
                onReward={handleAdReward}
                featureName="AI Trading Coach"
            />

            <div className="p-6 max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-white flex items-center justify-center gap-2">
                        <UserCheck className="w-8 h-8 text-orange-500" />
                        AI Trading Coach
                    </h1>
                    <p className="text-gray-400">
                        잘못된 매매 습관, AI 코치에게 교정 받으세요. (팩폭 주의 🦴)
                    </p>
                </div>

                {/* Input Area */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 focus-within:ring-2 ring-orange-500/50 transition-all">
                    <textarea
                        value={logText}
                        onChange={(e) => setLogText(e.target.value)}
                        placeholder="예: 오늘 테슬라가 급등하길래 참지 못하고 추격 매수했는데 물리감... 손절해야 하나?"
                        className="w-full h-32 bg-transparent text-white resize-none outline-none placeholder-gray-500"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={handleRequest}
                            disabled={loading || !logText.trim()}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            상담 요청
                        </button>
                    </div>
                </div>

                {/* Feedback Area */}
                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                        {/* Capture Area */}
                        <div id="capture-area" className="bg-[#0a0a0a] rounded-3xl p-6 space-y-6 border border-white/5 shadow-2xl relative">
                            
                            {/* Score & Alert */}
                            <div className="flex gap-4">
                                <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
                                    <span className="text-gray-400 text-xs uppercase mb-1">Mental Score</span>
                                    <span className={`text-5xl font-black ${result.score > 70 ? 'text-green-500' : result.score > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {result.score}
                                    </span>
                                </div>
                                <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                                    <span className="text-gray-400 text-xs uppercase mb-1">Diagnosis</span>
                                    <span className="text-xl font-bold text-white break-words">{result.psychology}</span>
                                </div>
                            </div>

                            {/* Coach's Advice */}
                            <div className="bg-gradient-to-br from-orange-900/20 to-black border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                                <AlertOctagon className="absolute top-4 right-4 text-orange-500/20 w-24 h-24" />
                                <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2 relative z-10">
                                    <ShieldX className="w-5 h-5" /> Coach's Feedback
                                </h3>
                                <p className="text-white text-lg font-medium leading-relaxed relative z-10">
                                    "{result.advice}"
                                </p>
                            </div>

                            {/* Action Plan */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-gray-300 font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" /> Action Plan
                                </h3>
                                <div className="space-y-3">
                                    {result.action_plan.map((step: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-3 text-gray-200">
                                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <span>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Viral Watermark (Included in capture) */}
                            <div className="pt-4 border-t border-white/10 flex justify-between items-center text-gray-500 text-xs font-medium">
                                <span>AI 주식 비서 - 팩폭 맞으러 가기 👉</span>
                                <span className="font-bold text-orange-500/70">stock-trend-program.co.kr</span>
                            </div>
                        </div>

                        {/* Viral Sharing Buttons */}
                        <div className="flex gap-3 justify-end hide-on-capture">
                            <button
                                onClick={handleDownloadImage}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                이미지로 저장하기
                            </button>
                            <button
                                onClick={() => {
                                    alert("카카오톡 공유 기능은 준비 중입니다. 이미지를 저장하여 카카오톡에 올려보세요!");
                                }}
                                className="flex-1 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <Share2 className="w-4 h-4" />
                                카카오톡 자랑하기
                            </button>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
