"use client";

interface KakaoRevenueAdProps {
  type?: "feed" | "banner" | "box" | "bottom" | "sticky";
  className?: string;
  autoRefreshInterval?: number;
}

/**
 * Google AdSense 심사 및 정책 준수를 위해 외부 서드파티 광고(Kakao AdFit) 배너 렌더링을 비활성화합니다.
 * 상단 H1 제목 밀림(Above-the-Fold 레이아웃 침해) 및 저품질 광고 중복 노출 판정을 원천 차단합니다.
 */
export default function KakaoRevenueAd(_props: KakaoRevenueAdProps) {
  return null;
}
