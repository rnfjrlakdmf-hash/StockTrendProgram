import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주식 투자 용어 사전 & 기초 가이드 46선 | 스마트 투자 비서',
  description: 'PER, PBR, ROE, RSI, MACD, 볼린저 밴드 등 주식 초보자를 위한 46가지 핵심 필수 용어와 실전 투자 지표를 정리한 주식 백과사전입니다.',
  alternates: {
    canonical: '/guide',
  },
  openGraph: {
    title: '주식 투자 용어 사전 & 기초 가이드 46선 | 스마트 투자 비서',
    description: '주식 초보자를 위한 필수 투자 용어 및 기초 지표를 정리한 백과사전입니다.',
    url: 'https://stock-trend-program.co.kr/guide',
  },
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
