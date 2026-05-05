import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ClosingBanner from "@/components/ClosingBanner";
import GlobalProgressWatcher from "@/components/GlobalProgressWatcher";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";


import FCMWrapper from "@/components/FCMWrapper";





// [TurboQuant V4.1 Final Luxury Fix Trigger]
export const metadata: Metadata = {
  title: "AI Stock Analyst - 실시간 주식 시세 분석",
  description: "AI 기반 실시간 주식 시장 데이터 분석 서비스. 본 정보는 투자 참고용이며 투자 권유가 아닙니다.",
  metadataBase: new URL('https://stock-trend-program.vercel.app'),
  openGraph: {
    title: "AI Stock Analyst",
    description: "인공지능 기반 실시간 주식 시장 데이터 분석 서비스",
    url: 'https://stock-trend-program.vercel.app',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google AdSense - 회원님의 ID로 나중에 교체 필요 */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9471404163603833"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased bg-[#050505] text-white" suppressHydrationWarning>
        <AuthProvider>
          {/* EMERGENCY DEPLOYMENT VERIFIER */}
          <div className="fixed top-0 left-0 w-full bg-yellow-500 text-black text-[10px] font-black text-center py-1 z-[999999] pointer-events-none uppercase tracking-widest">
            LIVE UPDATE v3.7.25-FINAL-BOOST ACTIVE
          </div>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 relative overflow-hidden bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#111] text-foreground">
              {/* Background Glow Effects */}
              <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

              {children}

              {/* Closing Report Banner */}
              <ClosingBanner />


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
