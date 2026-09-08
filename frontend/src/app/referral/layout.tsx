import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '친구 초대 리워드 프로그램 | 스마트 투자 비서',
  description: '친구를 초대하고 함께 프리미엄 AI 주식 분석 혜택을 무료로 이용해보세요.',
  alternates: {
    canonical: '/referral',
  },
  openGraph: {
    title: '친구 초대 리워드 프로그램 | 스마트 투자 비서',
    description: '친구를 초대하고 함께 프리미엄 AI 주식 분석 혜택을 무료로 이용해보세요.',
    url: 'https://stock-trend-program.co.kr/referral',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
