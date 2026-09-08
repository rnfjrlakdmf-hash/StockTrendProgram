import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '실시간 거래대금 & 급등락 주식 랭킹 | 스마트 투자 비서',
  description: '국내 및 미국 증시의 실시간 거래대금 상위, 상승률 1위 급등주 및 시장 주도주 랭킹을 확인하세요.',
  alternates: {
    canonical: '/ranking',
  },
  openGraph: {
    title: '실시간 거래대금 & 급등락 주식 랭킹 | 스마트 투자 비서',
    description: '국내 및 미국 증시의 실시간 거래대금 상위, 상승률 1위 급등주 및 시장 주도주 랭킹을 확인하세요.',
    url: 'https://stock-trend-program.co.kr/ranking',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
