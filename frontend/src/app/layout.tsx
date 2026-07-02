import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ClosingBanner from "@/components/ClosingBanner";
import GlobalProgressWatcher from "@/components/GlobalProgressWatcher";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";
import FCMWrapper from "@/components/FCMWrapper";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import KakaoScript from "@/components/KakaoScript";
import AppInstallBanner from "@/components/AppInstallBanner";
import FomoWidget from "@/components/FomoWidget";
import WhaleSiren from "@/components/WhaleSiren";
import KakaoAdFit from "@/components/KakaoAdFit";
import LeadGenerationPopup from "@/components/LeadGenerationPopup";
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
// [TurboQuant V4.1 Final Luxury Fix Trigger]
export const metadata: Metadata = {
  title: "스마트 투자 비서 | AI 주식 분석 및 무료 알림",
  description: "인공지능이 분석하는 주식 브리핑과 실시간 주가 급등락, 속보 알림 서비스를 무료로 만나보세요.",
  keywords: ["스마트 투자 비서", "AI 주식 분석", "무료 주가 알림", "주식 속보 알림", "장 마감 미국주식 시세", "테슬라 주가 분석", "엔비디아 주가 분석", "AI 모닝 브리핑", "주식 포트폴리오 진단", "미국주식 알림", "국내주식 알림"],
  metadataBase: new URL('https://stock-trend-program.co.kr'),
  alternates: {
    canonical: 'https://stock-trend-program.co.kr',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ? [process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION] : [],
    },
  },
  openGraph: {
    title: "스마트 투자 비서 - 실시간 주가 알림 및 AI 분석",
    description: "인공지능이 매일 아침 전해주는 주식 브리핑과 주가 급등락, 속보 알림 서비스를 무료로 이용해 보세요.",
    url: 'https://stock-trend-program.co.kr',
    siteName: '스마트 투자 비서 (AI Stock Analyst)',
    images: [
      {
        url: 'https://stock-trend-program.co.kr/api/og?title=%EC%8A%A4%EB%A7%88%ED%8A%B8%20%ED%88%AC%EC%9E%90%20%EB%B9%84%EC%84%9C&subtitle=%EC%8B%A4%EC%8B%9C%EA%B0%84%20%EB%A7%A4%EC%88%98%20%EC%8B%9C%EA%B7%B8%EB%84%90%20%ED%8F%AC%EC%B0%A9&theme=%EC%8A%A4%ED%86%A1%20%ED%8A%B8%EB%A0%8C%EB%93%9C',
        width: 1200,
        height: 630,
        alt: '스마트 투자 비서 대시보드',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "스마트 투자 비서 - 실시간 주가 알림 및 AI 분석",
    description: "인공지능이 매일 아침 전해주는 주식 브리핑과 주가 급등락, 속보 알림 서비스를 무료로 이용해 보세요.",
    images: ['https://stock-trend-program.co.kr/api/og?title=%EC%8A%A4%EB%A7%88%ED%8A%B8%20%ED%88%AC%EC%9E%90%20%EB%B9%84%EC%84%9C&subtitle=%EC%8B%A4%EC%8B%9C%EA%B0%84%20%EB%A7%A4%EC%88%98%20%EC%8B%9C%EA%B7%B8%EB%84%90%20%ED%8F%AC%EC%B0%A9&theme=%EC%8A%A4%ED%86%A1%20%ED%8A%B8%EB%A0%8C%EB%93%9C'],
    creator: '@StockTrendAI',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
    <head>
        {/* Google AdSense 공식 스크립트 */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9471404163603833" crossOrigin="anonymous"></script>
        <meta name="google-adsense-account" content="ca-pub-9471404163603833" />
        {/* ✅ iOS PWA 필수 메타태그 - 홈 화면 추가 후 알림 활성화 지원 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI Stock Analyst" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="apple-touch-startup-image" href="/icon.png" />
      </head>
      <body className="antialiased bg-[#050505] text-white" suppressHydrationWarning>
        <KakaoScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "스마트 투자 비서",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web, Android",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "KRW"
              },
              "description": "인공지능이 매일 아침 전해주는 주식 브리핑과 주가 급등락, 속보 알림 서비스",
              "url": "https://stock-trend-program.co.kr"
            })
          }}
        />
        {/* [v4] isPro 강제 삭제 - 결제 기능 완전 폐지로 인한 캐시 초기화 */}
        <script dangerouslySetInnerHTML={{ __html: `try { localStorage.removeItem('isPro'); localStorage.removeItem('proExpiry'); } catch(e) {}` }} />
        <AuthProvider>
          <AnalyticsTracker />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 relative overflow-hidden bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#111] text-foreground">
              {/* Background Glow Effects */}
              <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

              {children}

              {/* Closing Report Banner */}
              <ClosingBanner />
              <AppInstallBanner />
              <LeadGenerationPopup />
              <FomoWidget />
              <WhaleSiren />

              {/* Site Footer - AdSense 정책 준수 필수 링크 */}
              <footer className="border-t border-white/5 mt-8 px-6 py-6 text-center">
                <p className="text-gray-600 text-xs mb-2">
                  ⚠️ 본 서비스에서 제공하는 정보는 투자 참고용이며 투자 권유가 아닙니다. 투자의 최종 책임은 본인에게 있습니다.
                </p>
                <div className="flex justify-center gap-4 text-xs text-gray-600 flex-wrap">
                  <a href="/about" className="hover:text-gray-400 transition-colors">서비스 소개</a>
                  <span>|</span>
                  <a href="/contact" className="hover:text-gray-400 transition-colors">문의하기</a>
                  <span>|</span>
                  <a href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</a>
                  <span>|</span>
                  <a href="/terms" className="hover:text-gray-400 transition-colors">이용약관</a>
                  <span>|</span>
                  <a href="/disclaimer" className="hover:text-gray-400 transition-colors">면책 조항(Disclaimer)</a>
                  <span>|</span>
                  <span>© 2026 StockTrend</span>
                </div>
              </footer>

              {/* Global Progress Watcher */}
              <GlobalProgressWatcher />
            </main>

            {/* 우측 사이드바 세로형 광고 (160x600) - 데스크톱 전용 */}
            <aside className="hidden xl:flex w-[180px] flex-col items-center pt-24 shrink-0 sticky top-0 h-screen overflow-hidden border-l border-white/5 bg-[#050505]/50">
              <KakaoAdFit adUnit="DAN-jbSl6i4k3YO3nNSl" adWidth="160" adHeight="600" />
            </aside>

            {/* Global FCM Token Manager (Client-Only Wrapper) */}
            <FCMWrapper />
            <WhaleSiren />
            <FomoWidget />
            
            {/* Mobile Sticky Ad Banner */}
            <div className="fixed bottom-0 left-0 w-full z-[999] bg-[#0a0a0a] border-t border-white/10 flex justify-center pb-safe sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.8)]">
              <KakaoAdFit adUnit="DAN-g3wzyZlZ4hBiYyRA" adWidth="320" adHeight="50" />
            </div>
          </div>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
