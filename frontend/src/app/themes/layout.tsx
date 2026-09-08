import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '실시간 시장 주도 테마 및 관련주 순위 | 스마트 투자 비서',
  description: '오늘 시장에서 가장 강한 자금이 쏠리는 테마와 1등 대장주 목록을 실시간으로 확인하세요.',
  alternates: {
    canonical: '/themes',
  },
  openGraph: {
    title: '실시간 시장 주도 테마 및 관련주 순위 | 스마트 투자 비서',
    description: '오늘 시장에서 가장 강한 자금이 쏠리는 테마와 1등 대장주 목록을 실시간으로 확인하세요.',
    url: 'https://stock-trend-program.co.kr/themes',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
