"use client";

import { useState, useEffect } from "react";
import { X, Play, Loader2, Coins, Zap, Timer, CheckCircle2 } from "lucide-react";
import { requestPayment } from "@/lib/payment";
import { API_BASE_URL } from "@/lib/config";
import { grantReward } from "@/lib/reward";
import { AdMob, RewardAdOptions, AdLoadInfo, RewardAdPluginEvents, AdMobRewardItem } from '@capacitor-community/admob';

interface AdModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReward: () => void;
    featureName: string;
}

export default function AdRewardModal({ isOpen, onClose, onReward, featureName }: AdModalProps) {
    const [isLoadingAd, setIsLoadingAd] = useState(false);
    const [progress, setProgress] = useState(0); // 현재 시청 횟수
    const targetCount = 5; // 목표 시청 횟수 (고정)
    const targetRewardTime = 30; // 보상 시간 (30분)
    const [exchangeRate, setExchangeRate] = useState<number>(1450);

    // 실제 애드몹 광고 단위 ID
    const AD_UNIT_ID = "ca-app-pub-7277484268448269/6753236218";

    useEffect(() => {
        if (isOpen) {
            setProgress(0);
            setIsLoadingAd(false);

            // AdMob 초기화 (옵션은 capacitor.config.ts에서 관리)
            AdMob.initialize({}).catch(err => console.error("AdMob Init Fail:", err));

            // 리스너 설정
            const setupListeners = async () => {
                await (AdMob as any).removeAllListeners().catch(() => { });

                await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
                    console.log('User rewarded:', reward);
                });

                await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                    console.log('Ad dismissed');
                    setIsLoadingAd(false);

                    setProgress(prev => {
                        const next = prev + 1;
                        handleAdDismissed(next);
                        return next;
                    });
                });

                await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error: any) => {
                    console.error('Ad failed to load:', error);
                    setIsLoadingAd(false);
                    alert("광고 로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
                });
            };

            setupListeners();

            fetch(`${API_BASE_URL}/api/market/status`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === "success" && data.data.details?.usd) {
                        const rate = parseFloat(data.data.details.usd.replace(/,/g, ''));
                        if (!isNaN(rate)) setExchangeRate(rate);
                    }
                })
                .catch(err => console.error(err));
        }

        // Cleanup listeners on close/unmount
        return () => {
            (AdMob as any).removeAllListeners().catch(() => { });
        };
    }, [isOpen]);

    const handleAdDismissed = (currentProgress: number) => {
        if (currentProgress >= targetCount) {
            // 목표 달성 (시간 충전 시도)
            const result = grantReward(targetRewardTime);
            onReward();
            onClose();

            if (result.success) {
                alert(result.isFull
                    ? `${targetRewardTime}분 지급 완료! (최대 한도 10시간에 도달했습니다)`
                    : `${targetRewardTime}분 무료 이용권이 지급되었습니다!`
                );
            } else {
                alert(result.message); // "최대 충전 한도에 도달했습니다"
            }
        } else {
            // 다음 광고 안내
            if (confirm(`광고 ${currentProgress}/${targetCount} 시청 완료! 다음 광고를 보시겠습니까?`)) {
                showAd(); // 연속 재생
            }
        }
    };

    const showAd = async () => {
        try {
            setIsLoadingAd(true);

            // 2. 광고 로드
            const options: RewardAdOptions = {
                adId: AD_UNIT_ID,
                isTesting: false
                // npa: true
            };

            await AdMob.prepareRewardVideoAd(options);

            // 3. 광고 표시
            await AdMob.showRewardVideoAd();

        } catch (error) {
            console.error("Ad Show Error:", error);
            setIsLoadingAd(false);
            alert("광고를 불러오는 중 오류가 발생했습니다.");
        }
    };

    const startAdLoop = () => {
        // 첫 광고 시작
        if (confirm(`총 ${targetCount}번의 광고를 시청하면 ${targetRewardTime}분 이용권이 지급됩니다. 시작하시겠습니까?`)) {
            showAd();
        }
    };

    const proPriceUsd = 3.5;
    const proPriceKrw = Math.floor(proPriceUsd * exchangeRate / 10) * 10;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-[2rem] p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
                    <X className="w-6 h-6" />
                </button>

                <div className="mb-4 flex justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
                        <Timer className="w-10 h-10 text-white" />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-1">
                    Get Free 30 Mins
                </h2>
                <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                    광고 {targetCount}편 시청하고 <span className="text-yellow-400 font-bold">30분 무료 이용권</span>을 충전하세요!<br />
                    (현재 진행: {progress}/{targetCount})
                </p>

                {isLoadingAd ? (
                    <div className="w-full bg-gray-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3 mb-6">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <span className="text-gray-300 text-sm">광고를 불러오는 중입니다...</span>
                    </div>
                ) : (
                    <button
                        onClick={startAdLoop}
                        className="w-full relative group overflow-hidden bg-white hover:bg-gray-100 rounded-xl p-5 transition-all active:scale-95 shadow-lg shadow-white/10 mb-6"
                    >
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <div className="font-black text-black text-lg">
                                    {progress > 0 ? "다음 광고 보기" : "30분 충전하기"}
                                </div>
                                <div className="text-xs text-gray-500">
                                    남은 광고: {targetCount - progress}개
                                </div>
                            </div>
                            <div className="bg-black text-white p-3 rounded-full group-hover:bg-blue-600 transition-colors">
                                <Play className="w-6 h-6 fill-current" />
                            </div>
                        </div>
                    </button>
                )}

                <div className="pt-6 border-t border-white/5 space-y-3">
                    <button
                        onClick={() => {
                            requestPayment(() => {
                                localStorage.setItem("isPro", "true");
                                alert("결제가 완료되었습니다! 프로 기능이 활성화됩니다.");
                                window.location.reload();
                            });
                        }}
                        className="w-full py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 rounded-xl font-bold text-sm hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Zap className="w-4 h-4" /> 귀찮으신가요? 평생 소장하기 (${proPriceUsd})
                    </button>
                </div>
            </div>
        </div>
    );
}
