import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '글로벌 경제 캘린더 및 주요 증시 일정 | 스마트 투자 비서',
  description: 'FOMC 금리 결정, 미국 CPI 발표, 선물옵션 만기일 등 국내외 주요 증시 경제 지표 일정을 확인하세요.',
  alternates: {
    canonical: '/calendar',
  },
  openGraph: {
    title: '글로벌 경제 캘린더 및 주요 증시 일정 | 스마트 투자 비서',
    description: 'FOMC 금리 결정, 미국 CPI 발표, 선물옵션 만기일 등 국내외 주요 증시 경제 지표 일정을 확인하세요.',
    url: 'https://stock-trend-program.co.kr/calendar',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
