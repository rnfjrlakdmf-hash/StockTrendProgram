import { Metadata } from "next";
import ClientPage from "./ClientPage";

// Dynamic metadata generation for OGP (Growth Hacking)
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
    const params = await searchParams;
    const query = params.q?.toUpperCase() || "";

    if (!query) {
        return {
            title: "Global Supply Chain Map",
            description: "전 세계 기업들의 공급망, 라이벌, 고객사를 한눈에 파악하세요.",
            openGraph: {
                title: "Global Supply Chain Map",
                description: "전 세계 기업들의 공급망을 한눈에 파악하세요.",
                images: ["/og-default.jpg"], // Ensure you have a default OG image
            }
        };
    }

    // You can fetch API here to get actual risk score or themes if needed for the title
    // But for speed, we generate a dynamic API call to our own OG route
    const ogUrl = `https://stocktrend-production.up.railway.app/api/og?symbol=${query}`; // Will update to relative or actual domain

    return {
        title: `${query} 글로벌 공급망 레이더`,
        description: `🚨 ${query} 집중 분석! 숨겨진 수혜주와 핵심 경쟁사를 확인하세요.`,
        openGraph: {
            title: `🚨 ${query} 글로벌 공급망 완벽 해부`,
            description: `이 기업과 엮인 나비효과 수혜주 3가지는? 지금 바로 확인하세요.`,
            images: [
                {
                    url: ogUrl,
                    width: 1200,
                    height: 630,
                    alt: `${query} Supply Chain Map`,
                }
            ],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: `🚨 ${query} 글로벌 공급망 완벽 해부`,
            description: `이 기업과 엮인 나비효과 수혜주 3가지는? 지금 바로 확인하세요.`,
            images: [ogUrl],
        }
    };
}

export default async function SupplyChainServerPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const params = await searchParams;
    const initialQuery = params.q || "";

    return (
        <ClientPage initialQuery={initialQuery} />
    );
}
