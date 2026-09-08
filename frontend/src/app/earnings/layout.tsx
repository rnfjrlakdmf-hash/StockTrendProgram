import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주요 기업 실적 발표 캘린더 (어닝 서프라이즈) | 스마트 투자 비서',
  description: '국내 및 미국 주요 상장 기업의 실적 발표 일정과 예상 EPS, 어닝 서프라이즈 종목을 실시간으로 추적합니다.',
  alternates: {
    canonical: '/earnings',
  },
  openGraph: {
    title: '주요 기업 실적 발표 캘린더 (어닝 서프라이즈) | 스마트 투자 비서',
    description: '국내 및 미국 주요 상장 기업의 실적 발표 일정과 예상 EPS, 어닝 서프라이즈 종목을 실시간으로 추적합니다.',
    url: 'https://stock-trend-program.co.kr/earnings',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
