import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 주식 투자 코칭 & 1:1 종목 Q&A | 스마트 투자 비서',
  description: '초보자도 알기 쉽게 설명해주는 인공지능 투자 코치와 함께 종목 진단 및 매매 전략을 세워보세요.',
  alternates: {
    canonical: '/coach',
  },
  openGraph: {
    title: 'AI 주식 투자 코칭 & 1:1 종목 Q&A | 스마트 투자 비서',
    description: '초보자도 알기 쉽게 설명해주는 인공지능 투자 코치와 함께 종목 진단 및 매매 전략을 세워보세요.',
    url: 'https://stock-trend-program.co.kr/coach',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
