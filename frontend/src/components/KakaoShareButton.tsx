"use client";

import { Share2 } from "lucide-react";

interface KakaoShareButtonProps {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  buttonText?: string;
  className?: string;
}

export default function KakaoShareButton({ 
  title, 
  description, 
  url, 
  imageUrl = "https://stock-trend-program.co.kr/og-image.png",
  buttonText = "결과 확인하기",
  className = "p-2 bg-[#FEE500] hover:bg-[#FEE500]/80 text-[#191919] rounded-full transition-colors flex items-center justify-center gap-2 font-bold text-sm"
}: KakaoShareButtonProps) {
  
  const handleShare = () => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      // 카카오 SDK 로드 전이거나 실패한 경우 일반 공유(Web Share API) 폴백
      if (navigator.share) {
        navigator.share({
          title,
          text: description,
          url,
        }).catch(console.error);
      } else {
        alert("카카오톡 공유를 준비 중입니다. 잠시 후 다시 시도해주세요.");
      }
      return;
    }

    // 카카오톡 공유 API 호출
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
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
          title: buttonText,
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
      ],
    });
  };

  return (
    <button onClick={handleShare} className={className} title="카카오톡으로 공유하기">
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">카톡 공유</span>
    </button>
  );
}
