import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '고객센터 및 제휴 문의 | 스마트 투자 비서',
  description: '스마트 투자 비서 서비스 이용 중 건의사항, 제휴 및 데이터 문의를 남겨주세요.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: '고객센터 및 제휴 문의 | 스마트 투자 비서',
    description: '스마트 투자 비서 고객센터 및 제휴 문의 페이지입니다.',
    url: 'https://stock-trend-program.co.kr/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
