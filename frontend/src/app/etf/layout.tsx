import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '테마별 ETF 수익률 및 포트폴리오 분석 | 스마트 투자 비서',
  description: 'KODEX, TIGER 등 국내외 테마별 ETF의 실시간 수익률 순위와 핵심 편입 종목을 비교 분석합니다.',
  alternates: {
    canonical: '/etf',
  },
  openGraph: {
    title: '테마별 ETF 수익률 및 포트폴리오 분석 | 스마트 투자 비서',
    description: 'KODEX, TIGER 등 국내외 테마별 ETF의 실시간 수익률 순위와 핵심 편입 종목을 비교 분석합니다.',
    url: 'https://stock-trend-program.co.kr/etf',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
