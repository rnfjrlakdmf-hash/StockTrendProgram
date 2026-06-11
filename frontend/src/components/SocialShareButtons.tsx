"use client";

import { Send, MessageCircle } from "lucide-react";

interface SocialShareButtonsProps {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}

export default function SocialShareButtons({
  title,
  description,
  url,
  imageUrl = "https://stock-trend-program.co.kr/api/og",
}: SocialShareButtonsProps) {

  // 텔레그램 공유
  const handleTelegramShare = () => {
    const text = `${title}\n\n${description}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, "_blank", "noopener,noreferrer");
  };

  // 트위터 (X) 공유
  const handleTwitterShare = () => {
    const text = `${title}\n\n`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  // 카카오톡 공유
  const handleKakaoShare = () => {
    if (typeof window !== "undefined" && window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        // Fallback for native mobile share if Kakao is not ready
        if (navigator.share) {
          navigator.share({ title, text: description, url }).catch(console.error);
        } else {
          alert("카카오톡 공유를 준비 중입니다. 잠시 후 다시 시도해주세요.");
        }
        return;
      }
      
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: title,
          description: description,
          imageUrl: imageUrl,
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
        buttons: [
          {
            title: "리포트 보기",
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
        ],
      });
    } else {
      if (navigator.share) {
        navigator.share({ title, text: description, url }).catch(console.error);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 카카오톡 */}
      <button
        onClick={handleKakaoShare}
        className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black px-3 py-2 md:px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-[#FEE500]/10"
        title="카카오톡으로 공유하기"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">카톡 공유</span>
      </button>

      {/* 텔레그램 */}
      <button
        onClick={handleTelegramShare}
        className="bg-[#24A1DE] hover:bg-[#24A1DE]/90 text-white px-3 py-2 md:px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-[#24A1DE]/20"
        title="텔레그램으로 공유하기"
      >
        <Send className="w-4 h-4" />
        <span className="hidden sm:inline">텔레그램</span>
      </button>

      {/* X (트위터) */}
      <button
        onClick={handleTwitterShare}
        className="bg-black hover:bg-gray-800 text-white border border-gray-700 px-3 py-2 md:px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-white/5"
        title="X (트위터)로 공유하기"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current">
            <g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g>
        </svg>
        <span className="hidden sm:inline">X 공유</span>
      </button>
    </div>
  );
}
