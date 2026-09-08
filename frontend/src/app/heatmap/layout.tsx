import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '국내 및 글로벌 증시 시장 지도 히트맵 | 스마트 투자 비서',
  description: '코스피, 코스닥 및 미국 주요 섹터별 등락률을 한눈에 파악하는 실시간 시장 지도(Heatmap)입니다.',
  alternates: {
    canonical: '/heatmap',
  },
  openGraph: {
    title: '국내 및 글로벌 증시 시장 지도 히트맵 | 스마트 투자 비서',
    description: '코스피, 코스닥 및 미국 주요 섹터별 등락률을 한눈에 파악하는 실시간 시장 지도(Heatmap)입니다.',
    url: 'https://stock-trend-program.co.kr/heatmap',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
