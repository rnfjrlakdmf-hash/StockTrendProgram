import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 차트 패턴 분석 및 기술적 매매 시그널 | 스마트 투자 비서',
  description: '쌍바닥, 헤드앤숄더, 삼각수렴 등 8대 핵심 차트 패턴을 AI가 자동으로 인식하여 매매 타점을 제시합니다.',
  alternates: {
    canonical: '/pattern',
  },
  openGraph: {
    title: 'AI 차트 패턴 분석 및 기술적 매매 시그널 | 스마트 투자 비서',
    description: '쌍바닥, 헤드앤숄더, 삼각수렴 등 8대 핵심 차트 패턴을 AI가 자동으로 인식하여 매매 타점을 제시합니다.',
    url: 'https://stock-trend-program.co.kr/pattern',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
