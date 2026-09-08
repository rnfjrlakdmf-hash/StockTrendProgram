import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '내 주식 포트폴리오 정밀 진단 & 리스크 관리 | 스마트 투자 비서',
  description: '보유 종목의 섹터 분산도, 변동성, 배당 수익률을 종합 진단하고 최적의 리밸런싱을 제안합니다.',
  alternates: {
    canonical: '/portfolio',
  },
  openGraph: {
    title: '내 주식 포트폴리오 정밀 진단 & 리스크 관리 | 스마트 투자 비서',
    description: '보유 종목의 섹터 분산도, 변동성, 배당 수익률을 종합 진단하고 최적의 리밸런싱을 제안합니다.',
    url: 'https://stock-trend-program.co.kr/portfolio',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
