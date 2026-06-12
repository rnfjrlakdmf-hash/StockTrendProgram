import { Metadata } from "next";
import CalculatorClient from "./CalculatorClient";

export const metadata: Metadata = {
  title: "주식 구조대 물타기 계산기 | 생존 확률 분석기",
  description: "물타기하면 내 평단가는 얼마가 될까? 지금 바로 내 계좌의 생존 확률과 필요한 구조대 투입 자금을 재미있게 계산해보세요.",
  keywords: ["주식 물타기 계산기", "평단가 계산기", "주식 구조대", "수익률 계산기", "주식 밈"],
  openGraph: {
    title: "🚨 주식 구조대 물타기 계산기",
    description: "내 불쌍한 계좌 살려낼 물타기 금액은? 너도 계산해봐! 💦",
    images: ["/og-image.png"],
  }
};

export default function CalculatorPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8 text-center space-y-4">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-2">
          💸 무한 물타기 생존 시뮬레이터
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          🚨 구조대 호출 <span className="text-blue-500">물타기 계산기</span>
        </h1>
        <p className="text-gray-400 text-sm">
          "물린다 싶으면 타라, 그것이 주식이다." - 워렌 밈핏
        </p>
      </div>

      <CalculatorClient />
    </div>
  );
}
