import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '대표이사 전용 집무실 (보안 구역) | 스마트 투자 비서',
    description: '대표이사 전용 기밀 전자결재 및 임원 보고 보안 구역입니다.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
        },
    },
};

export default function CeoOfficeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
