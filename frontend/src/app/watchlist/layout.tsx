import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '관심종목 실시간 시세 및 AI 브리핑 | 스마트 투자 비서',
  description: '내가 찜한 관심종목의 실시간 호가, 목표가 도달 알림 및 핵심 뉴스를 한눈에 확인하세요.',
  alternates: {
    canonical: '/watchlist',
  },
  openGraph: {
    title: '관심종목 실시간 시세 및 AI 브리핑 | 스마트 투자 비서',
    description: '내가 찜한 관심종목의 실시간 호가, 목표가 도달 알림 및 핵심 뉴스를 한눈에 확인하세요.',
    url: 'https://stock-trend-program.co.kr/watchlist',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
