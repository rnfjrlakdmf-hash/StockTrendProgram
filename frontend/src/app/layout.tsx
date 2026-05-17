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

// [TurboQuant V4.1 Final Luxury Fix Trigger]
export const metadata: Metadata = {
  title: "AI Stock Analyst - 실시간 주식 시세 분석",
  description: "AI 기반 실시간 주식 시장 데이터 분석 서비스. 본 정보는 투자 참고용이며 투자 권유가 아닙니다.",
  metadataBase: new URL('https://stock-trend-program.co.kr'),
  openGraph: {
    title: "AI Stock Analyst",
    description: "인공지능 기반 실시간 주식 시장 데이터 분석 서비스",
    url: 'https://stock-trend-program.co.kr',
    siteName: 'AI Stock Analyst',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Stock Analyst Dashboard Preview',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "AI Stock Analyst - 실시간 주식 분석",
    description: "실시간 주식 시세 분석 서비스",
    images: ['/og-image.png'],
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
        {/* Google AdSense 게시자 ID 메타 힌트 */}
        <meta name="google-adsense-account" content="ca-pub-9471404163603833" />
        {/* [v5.2.9] Universal Google AdSense TagError Silencer */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message && (e.message.indexOf('TagError') !== -1 || e.message.indexOf('adsbygoogle') !== -1)) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && (e.reason.message.indexOf('TagError') !== -1 || e.reason.message.indexOf('adsbygoogle') !== -1)) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);
            `
          }}
        />
      </head>
      <body className="antialiased bg-[#050505] text-white" suppressHydrationWarning>
        {/* Google AdSense - Next.js Script 컴포넌트 */}
        <Script
          id="adsense-init"
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9471404163603833"
          crossOrigin="anonymous"
        />
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

              {/* Site Footer - AdSense 정책 준수 필수 링크 */}
              <footer className="border-t border-white/5 mt-8 px-6 py-6 text-center">
                <p className="text-gray-600 text-xs mb-2">
                  ⚠️ 본 서비스에서 제공하는 정보는 투자 참고용이며 투자 권유가 아닙니다. 투자의 최종 책임은 본인에게 있습니다.
                </p>
                <div className="flex justify-center gap-4 text-xs text-gray-600">
                  <a href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</a>
                  <span>|</span>
                  <a href="/terms" className="hover:text-gray-400 transition-colors">이용약관</a>
                  <span>|</span>
                  <span>© 2025 AI Stock Analyst</span>
                </div>
              </footer>

              {/* Global Progress Watcher */}
              <GlobalProgressWatcher />
            </main>

            {/* Global FCM Token Manager (Client-Only Wrapper) */}
            <FCMWrapper />
          </div>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
