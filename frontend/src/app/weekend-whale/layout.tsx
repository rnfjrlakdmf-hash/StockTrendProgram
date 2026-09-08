import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '외국인 & 기관 대량 순매수 세력 포착 (웨일 알림) | 스마트 투자 비서',
  description: '시장 큰손인 외국인과 기관이 바닥권에서 집중 매집한 대량 수급 유입 종목을 추적합니다.',
  alternates: {
    canonical: '/weekend-whale',
  },
  openGraph: {
    title: '외국인 & 기관 대량 순매수 세력 포착 (웨일 알림) | 스마트 투자 비서',
    description: '시장 큰손인 외국인과 기관이 바닥권에서 집중 매집한 대량 수급 유입 종목을 추적합니다.',
    url: 'https://stock-trend-program.co.kr/weekend-whale',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
