import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공매도 잔고 및 대차잔고 추이 분석 | 스마트 투자 비서',
  description: '종목별 공매도 거래대금 비중, 잔고 수량 및 숏커버링 가능성 지표를 실시간으로 모니터링합니다.',
  alternates: {
    canonical: '/short-selling',
  },
  openGraph: {
    title: '공매도 잔고 및 대차잔고 추이 분석 | 스마트 투자 비서',
    description: '종목별 공매도 거래대금 비중, 잔고 수량 및 숏커버링 가능성 지표를 실시간으로 모니터링합니다.',
    url: 'https://stock-trend-program.co.kr/short-selling',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
