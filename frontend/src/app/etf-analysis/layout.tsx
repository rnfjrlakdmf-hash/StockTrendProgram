import { Metadata } from "next";

export const metadata: Metadata = {
    title: "국내 ETF 수익률 순위 및 테마별 분석 (TIGER, KODEX) | 스마트 투자 비서",
    description: "KODEX, TIGER 등 국내 상장된 주요 ETF들의 수익률 순위, 거래대금, 배당수익률을 한눈에 비교 분석합니다. 2차전지, 반도체, 고배당 ETF 트렌드를 실시간으로 확인하세요.",
};

export default function EtfLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
