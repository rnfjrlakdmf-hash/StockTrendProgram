import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '실시간 AI 매수·매도 시그널 | 스마트 투자 비서',
  description: '골든크로스, 볼린저 밴드 돌파, 대량 수급 유입 등 AI가 실시간으로 포착한 매수 매도 시그널을 확인하세요.',
  alternates: {
    canonical: '/signals',
  },
  openGraph: {
    title: '실시간 AI 매수·매도 시그널 | 스마트 투자 비서',
    description: '골든크로스, 볼린저 밴드 돌파, 대량 수급 유입 등 AI가 실시간으로 포착한 매수 매도 시그널을 확인하세요.',
    url: 'https://stock-trend-program.co.kr/signals',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
