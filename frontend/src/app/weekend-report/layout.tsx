import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주간 증시 결산 및 다음 주 증시 전망 리포트 | 스마트 투자 비서',
  description: '한 주간의 시장 핵심 요약과 다음 주 주목해야 할 테마 및 리스크 요인을 정리한 주간 마켓 리포트입니다.',
  alternates: {
    canonical: '/weekend-report',
  },
  openGraph: {
    title: '주간 증시 결산 및 다음 주 증시 전망 리포트 | 스마트 투자 비서',
    description: '한 주간의 시장 핵심 요약과 다음 주 주목해야 할 테마 및 리스크 요인을 정리한 주간 마켓 리포트입니다.',
    url: 'https://stock-trend-program.co.kr/weekend-report',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
