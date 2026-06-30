import { Metadata } from "next";

export const metadata: Metadata = {
    title: "AI 포트폴리오 위험 관리 (Risk Guard) | 스마트 투자 비서",
    description: "현재 내 포트폴리오의 변동성과 위험(Risk) 요소를 실시간으로 분석하고 관리하세요. 급락 위험 종목 및 증시 과열 경고를 AI가 제공합니다.",
};

export default function RiskLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
