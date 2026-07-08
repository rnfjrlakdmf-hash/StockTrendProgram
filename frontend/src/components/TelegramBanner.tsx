"use client";

import { useState, useEffect } from "react";
import { X, Send, Users, Bell, ChevronRight, Star, Zap, TrendingUp } from "lucide-react";

const TELEGRAM_URL = "https://t.me/stocktrend_live";
const DISMISS_KEY = "tg_banner_dismissed_v2";
const POPUP_KEY = "tg_popup_dismissed_v2";
const POPUP_DELAY_MS = 20000; // 20초 후 팝업

export default function TelegramBanner() {
  const [showStrip, setShowStrip] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // 스트립 배너: 5초 후 표시
    const stripTimer = setTimeout(() => {
      if (!localStorage.getItem(DISMISS_KEY)) {
        setShowStrip(true);
        setIsAnimating(true);
      }
    }, 5000);

    // 팝업: 20초 후 표시 (스트립 무시한 유저 타겟)
    const popupTimer = setTimeout(() => {
      if (!localStorage.getItem(POPUP_KEY) && !localStorage.getItem(DISMISS_KEY)) {
        setShowPopup(true);
      }
    }, POPUP_DELAY_MS);

    return () => {
      clearTimeout(stripTimer);
      clearTimeout(popupTimer);
    };
  }, []);

  const dismissStrip = () => {
    setIsAnimating(false);
    setTimeout(() => setShowStrip(false), 300);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const dismissPopup = () => {
    setShowPopup(false);
    localStorage.setItem(POPUP_KEY, Date.now().toString());
  };

  const handleJoin = () => {
    window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
    dismissStrip();
    dismissPopup();
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    localStorage.setItem(POPUP_KEY, Date.now().toString());
  };

  return (
    <>
      {/* ── 하단 고정 슬라이드업 배너 (모바일 우선) ── */}
      {showStrip && (
        <div
          className={`fixed bottom-[50px] sm:bottom-4 left-0 right-0 z-[1400] px-3 transition-all duration-500 ease-out ${
            isAnimating ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
        >
          <div className="max-w-xl mx-auto bg-gradient-to-r from-[#0088cc] via-[#006fa6] to-[#00b2ff] rounded-2xl shadow-2xl shadow-blue-500/30 border border-blue-400/30 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              {/* 텔레그램 아이콘 */}
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">
                  📢 실시간 속보 텔레그램 채널
                </p>
                <p className="text-blue-100 text-xs mt-0.5 truncate">
                  세력 포착 · 상한가 알림 · 수급 속보 1초 전달
                </p>
              </div>

              <button
                onClick={handleJoin}
                className="shrink-0 bg-white text-[#0088cc] font-black text-xs px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                구독 →
              </button>

              <button
                onClick={dismissStrip}
                className="shrink-0 text-white/60 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 중앙 팝업 모달 ── */}
      {showPopup && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative bg-[#0d1117] border border-[#0088cc]/40 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl shadow-blue-500/20">
            
            {/* 배경 그라디언트 */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0088cc]/10 via-transparent to-transparent pointer-events-none" />
            
            {/* 닫기 버튼 */}
            <button
              onClick={dismissPopup}
              className="absolute right-4 top-4 z-10 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 헤더 */}
            <div className="relative bg-gradient-to-br from-[#0088cc] to-[#005f8f] px-6 pt-8 pb-6 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-xl">
                <Send className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">
                텔레그램 무료 구독
              </h2>
              <p className="text-blue-100 text-sm">
                정보 격차가 수익의 차이를 만듭니다
              </p>
            </div>

            {/* 혜택 목록 */}
            <div className="px-6 py-5 space-y-3">
              {[
                { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10", text: "세력 포착 즉시 알림 (1초 이내)" },
                { icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10", text: "상한가 · 급등주 실시간 속보" },
                { icon: Bell, color: "text-blue-400", bg: "bg-blue-400/10", text: "외국인 순매수 1위 자동 포착" },
                { icon: Star, color: "text-purple-400", bg: "bg-purple-400/10", text: "매일 AI 아침 브리핑 전달" },
              ].map(({ icon: Icon, color, bg, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className="text-gray-300 text-sm font-medium">{text}</p>
                </div>
              ))}

              {/* 구독자 수 뱃지 */}
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 mt-2">
                <Users className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-gray-400 text-xs">
                  <span className="text-white font-bold">지금 바로</span> 무료로 참여하고 시장 선점 정보를 받으세요
                </p>
              </div>
            </div>

            {/* CTA 버튼 */}
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={handleJoin}
                className="w-full bg-gradient-to-r from-[#0088cc] to-[#00b2ff] hover:from-[#006fa6] hover:to-[#0088cc] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/30 text-base"
              >
                <Send className="w-5 h-5" />
                텔레그램 채널 무료 구독하기
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={dismissPopup}
                className="w-full text-gray-500 text-sm hover:text-gray-400 transition-colors py-2"
              >
                나중에 볼게요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
