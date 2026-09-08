import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주식 투자 성향 MBTI 테스트 | 스마트 투자 비서',
  description: '나의 투자 심리와 매매 스타일을 분석하고 딱 맞는 최적의 투자 전략을 진단해보세요.',
  alternates: {
    canonical: '/mbti',
  },
  openGraph: {
    title: '주식 투자 성향 MBTI 테스트 | 스마트 투자 비서',
    description: '나의 투자 심리와 매매 스타일을 분석하고 딱 맞는 최적의 투자 전략을 진단해보세요.',
    url: 'https://stock-trend-program.co.kr/mbti',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
