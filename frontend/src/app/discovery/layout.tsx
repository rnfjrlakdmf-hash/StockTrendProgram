import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 유망 종목 발굴 및 퀀트 스크리닝 | 스마트 투자 비서',
  description: '저평가 가치주, 실적 턴어라운드, 수급 집중 우량주를 AI 퀀트 알고리즘으로 정밀 발굴합니다.',
  alternates: {
    canonical: '/discovery',
  },
  openGraph: {
    title: 'AI 유망 종목 발굴 및 퀀트 스크리닝 | 스마트 투자 비서',
    description: '저평가 가치주, 실적 턴어라운드, 수급 집중 우량주를 AI 퀀트 알고리즘으로 정밀 발굴합니다.',
    url: 'https://stock-trend-program.co.kr/discovery',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
