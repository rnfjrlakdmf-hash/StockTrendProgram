import { Metadata } from "next";
import StockHealthChecker from "@/components/StockHealthChecker";

export const metadata: Metadata = {
  title: "5대 안전벨트 종목 건전성 자가진단기 | 초보자 주식 안목 진단",
  description: "매수 버튼 누르기 전 필수 5대 팩트 체크(실적, 밸류에이션, 메이저 수급, 기술적 과열도, 부채비율)를 100점 만점으로 자가 진단합니다. 자본시장법 준수 객관적 공공 팩트 기반 무료 도구.",
  keywords: [
    "주식 초보 추천 종목 고르는 법",
    "종목 건전성 진단",
    "5대 안전벨트 진단기",
    "재무제표 보는법",
    "DART 전자공시",
    "주식 팩트 체크"
  ],
  openGraph: {
    title: "🛡️ 내 종목 매수 전 5대 안전벨트 자가진단기",
    description: "적자 기업이나 꼭대기 상투에 물리지 않는 5대 필수 팩트 체크! 100점 만점 무료 진단",
    images: ["/og-image.png"],
  }
};

export default function StockSafetyPage() {
  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <StockHealthChecker initialTicker="005930" />
    </div>
  );
}
