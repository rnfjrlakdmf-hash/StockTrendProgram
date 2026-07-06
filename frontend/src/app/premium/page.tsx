"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Unlock, Gem, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PremiumPage() {
    const { user } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        const fetchReport = async () => {
            if (!user) return;
            try {
                const userId = (user as any).uid || (user as any).id;
                const res = await fetch(`${API_BASE_URL}/api/reports/premium?user_id=${userId}`);
                const data = await res.json();
                if (data.status === "success") {
                    setReport(data);
                }
            } catch (err) {
                console.error("Failed to fetch premium report", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchReport();
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const handleUnlock = async () => {
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        const confirmUnlock = window.confirm("50 코인을 사용하여 리포트를 잠금 해제하시겠습니까?");
        if (!confirmUnlock) return;

        setIsUnlocking(true);
        try {
            const userId = (user as any).uid || (user as any).id;
            const res = await fetch(`${API_BASE_URL}/api/reports/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    report_date: report?.data?.report_date
                })
            });
            const data = await res.json();

            if (data.status === "success") {
                // Trigger confetti
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
                
                // Fetch unlocked report
                const res2 = await fetch(`${API_BASE_URL}/api/reports/premium?user_id=${userId}`);
                const data2 = await res2.json();
                if (data2.status === "success") {
                    setReport(data2);
                }
                alert("🎉 " + data.message);
                // 코인 헤더 강제 새로고침
                const fetchProfile = async () => {
                    const res3 = await fetch(`${API_BASE_URL}/api/user/${userId}/profile`);
                    const json3 = await res3.json();
                    if (json3.status === "success") {
                        // Custom event to update header coins
                        window.dispatchEvent(new CustomEvent("coins_updated", { detail: json3.user.coins }));
                    }
                };
                fetchProfile();
            } else {
                alert("❌ 오류: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("잠금 해제 중 오류가 발생했습니다.");
        } finally {
            setIsUnlocking(false);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
                <Gem className="w-16 h-16 text-yellow-500 mb-4 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">프리미엄 블라인드 리포트</h1>
                <p className="text-gray-400 mb-6">기관/외국인 수급과 핵심 테마 트렌드를 열람하려면 로그인이 필요합니다.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen relative">
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                    <div className="text-6xl animate-bounce">🎉💰✨🚀</div>
                </div>
            )}

            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg shadow-yellow-500/20">
                    <Gem className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">VIP 트렌드 리포트</h1>
                    <p className="text-sm text-gray-400">매일 장 마감 후 업데이트되는 고급 수급 정보</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                </div>
            ) : report && report.data ? (
                <div className="bg-[#1a1d24] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-[#1a1d24] p-6 border-b border-white/5 relative">
                        {report.locked && (
                            <div className="absolute top-0 right-0 p-4">
                                <div className="bg-red-500/10 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/20 flex items-center gap-1.5">
                                    <Lock className="w-3 h-3" />
                                    잠금됨
                                </div>
                            </div>
                        )}
                        {!report.locked && (
                            <div className="absolute top-0 right-0 p-4">
                                <div className="bg-green-500/10 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/20 flex items-center gap-1.5">
                                    <Unlock className="w-3 h-3" />
                                    열람 가능
                                </div>
                            </div>
                        )}
                        <h2 className="text-xl md:text-2xl font-bold text-white mt-2 pr-24">
                            {report.data.title}
                        </h2>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 md:p-8 relative">
                        {report.locked ? (
                            <>
                                {/* Preview Text (Clear) */}
                                <div className="prose prose-invert max-w-none text-gray-300 mb-6">
                                    <p className="text-lg leading-relaxed border-l-4 border-yellow-500 pl-4 bg-yellow-500/5 py-2">
                                        {report.data.preview}
                                    </p>
                                </div>

                                {/* Blurred Text */}
                                <div className="relative">
                                    <div className="prose prose-invert max-w-none opacity-40 blur-[6px] select-none pointer-events-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {report.data.content}
                                        </ReactMarkdown>
                                    </div>
                                    
                                    {/* Overlay Action Area */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-[#1a1d24] via-[#1a1d24]/80 to-transparent">
                                        <div className="bg-black/60 backdrop-blur-md border border-yellow-500/30 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full mx-4 transform transition-all hover:scale-105">
                                            <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                                            <h3 className="text-xl font-bold text-white mb-2">프리미엄 데이터 잠금</h3>
                                            <p className="text-gray-400 text-sm mb-6">
                                                외국인과 기관의 쌍끌이 매수 종목 및<br />내일의 핵심 공략 테마를 확인하세요.
                                            </p>
                                            <button
                                                onClick={handleUnlock}
                                                disabled={isUnlocking}
                                                className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isUnlocking ? (
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                ) : (
                                                    <>
                                                        <span className="text-xl">🪙</span>
                                                        50 코인으로 잠금 해제
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                출석체크로 모은 코인으로 결제 가능합니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Unlocked Text */
                            <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {report.data.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 py-12 bg-[#1a1d24] rounded-2xl border border-white/5">
                    리포트 데이터를 불러올 수 없습니다.
                </div>
            )}
        </div>
    );
}
