import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '국내외 주식 시장 휴장일 및 주요 일정 | 스마트 투자 비서',
  description: '한국거래소(KRX) 및 뉴욕증시(NYSE) 휴장일, 선물옵션 만기일 일정을 확인하세요.',
  alternates: {
    canonical: '/schedule',
  },
  openGraph: {
    title: '국내외 주식 시장 휴장일 및 주요 일정 | 스마트 투자 비서',
    description: '한국거래소(KRX) 및 뉴욕증시(NYSE) 휴장일, 선물옵션 만기일 일정을 확인하세요.',
    url: 'https://stock-trend-program.co.kr/schedule',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
