import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '실시간 주가 급등락 & DART 공시 속보 알림 | 스마트 투자 비서',
  description: '외국인·기관 대량 수급, 주가 급변동, 전자공시 속보를 실시간으로 가장 빠르게 받아보세요.',
  alternates: {
    canonical: '/alerts',
  },
  openGraph: {
    title: '실시간 주가 급등락 & DART 공시 속보 알림 | 스마트 투자 비서',
    description: '외국인·기관 대량 수급, 주가 급변동, 전자공시 속보를 실시간으로 가장 빠르게 받아보세요.',
    url: 'https://stock-trend-program.co.kr/alerts',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
