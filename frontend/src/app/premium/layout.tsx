import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '스마트 투자 비서 프리미엄 멤버십 안내 | 스마트 투자 비서',
  description: '실시간 VIP 매매 시그널, 전 종목 무제한 AI 심층 분석 및 비공개 리포트 혜택을 확인하세요.',
  alternates: {
    canonical: '/premium',
  },
  openGraph: {
    title: '스마트 투자 비서 프리미엄 멤버십 안내 | 스마트 투자 비서',
    description: '실시간 VIP 매매 시그널, 전 종목 무제한 AI 심층 분석 및 비공개 리포트 혜택을 확인하세요.',
    url: 'https://stock-trend-program.co.kr/premium',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
