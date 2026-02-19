import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ClosingBanner from "@/components/ClosingBanner";
import GlobalProgressWatcher from "@/components/GlobalProgressWatcher";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";
import FCMTokenManager from "@/components/FCMTokenManager";

export const metadata: Metadata = {
  title: "AI Stock Analyst - 실시간 주식 세 및 급등주 포착",
  description: "AI가 분석하는 실시간 주식 시장 트렌드. 급등 신호 포착 알림을 무료로 받아보세요.",
  metadataBase: new URL('https://stock-trend-program.vercel.app'),
  openGraph: {
    title: "AI Stock Analyst",
    description: "인공지능 기반 주식 분석 및 실시간 급등 신호 알림 서비스",
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
    description: "AI 급등주 포착 알림을 받아보세요.",
    images: ['/og-image.png'],
    creator: '@StockTrendAI',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#050505] text-white" suppressHydrationWarning>
        <AuthProvider>
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

            {/* Global FCM Token Manager (Fixed Widget) - Moved outside main to avoid overflow clipping */}
            <FCMTokenManager />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
