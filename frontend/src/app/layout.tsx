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
import GlobalBroadcastListener from "@/components/GlobalBroadcastListener";
import CookieConsent from "@/components/CookieConsent";
import BottomTabBar from "@/components/BottomTabBar";
import KakaoStickyBottomAd from "@/components/KakaoStickyBottomAd";
import FloatingQuickMenu from "@/components/FloatingQuickMenu";
import { Toaster } from "sonner";
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ? [process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION] : [],
      'google-adsense-account': ['ca-pub-9471404163603833'],
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
        
        {/* 프리텐다드 폰트 */}
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body className="antialiased bg-dark-900 text-white selection:bg-primary-500/30" suppressHydrationWarning>
        <KakaoScript />
        
        {/* Microsoft Clarity */}
        <Script id="clarity-script" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "xjjng5pl71");
          `}
        </Script>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://stock-trend-program.co.kr/#website",
                  "url": "https://stock-trend-program.co.kr",
                  "name": "스마트 투자 비서",
                  "alternateName": ["StockTrend", "스톡트렌드", "AI 주식 비서"],
                  "description": "국내외 실시간 주식 시세, 퀀트 재무 분석, 외인·기관 수급 레이더 및 무료 주식 투자 가이드",
                  "inLanguage": "ko-KR",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://stock-trend-program.co.kr/discovery?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": "https://stock-trend-program.co.kr/#organization",
                  "name": "스마트 투자 비서",
                  "url": "https://stock-trend-program.co.kr",
                  "logo": "https://stock-trend-program.co.kr/icon.png",
                  "founder": {
                    "@type": "Person",
                    "name": "윤희원"
                  },
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "rnfjrlakdmf@gmail.com",
                    "contactType": "customer service"
                  }
                },
                {
                  "@type": "SoftwareApplication",
                  "@id": "https://stock-trend-program.co.kr/#app",
                  "name": "스마트 투자 비서",
                  "applicationCategory": "FinanceApplication",
                  "operatingSystem": "Web, iOS, Android",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "KRW"
                  },
                  "description": "인공지능이 매일 아침 전해주는 주식 브리핑과 주가 급등락, DART 공시 속보 알림 서비스",
                  "url": "https://stock-trend-program.co.kr"
                }
              ]
            })
          }}
        />
        {/* [v4] isPro 강제 삭제 - 결제 기능 완전 폐지로 인한 캐시 초기화 */}
        <script dangerouslySetInnerHTML={{ __html: `try { localStorage.removeItem('isPro'); localStorage.removeItem('proExpiry'); } catch(e) {}` }} />
        <AuthProvider>
          <Toaster theme="dark" position="bottom-right" richColors />
          <AnalyticsTracker />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 relative overflow-hidden pb-16 md:pb-0 bg-dark-900 text-foreground">
              {/* Premium Background Mesh Glow Effects */}
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-900/20 blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
              <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none -z-10 mix-blend-screen" />

              {children}

              {/* Closing Report Banner */}
              <ClosingBanner />
              <AppInstallBanner />
              <LeadGenerationPopup />
              <FomoWidget />
              <WhaleSiren />

              {/* Site Footer - AdSense 및 YMYL 정책 준수 완벽 푸터 */}
              <footer className="border-t border-white/10 mt-16 bg-black/80 px-6 py-12 text-center relative z-10">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 mb-8 text-left text-xs md:text-sm text-gray-400 leading-relaxed shadow-lg">
                    <strong className="text-gray-200 flex items-center gap-2 mb-2 font-bold">
                      <span className="text-amber-400">⚠️</span> 금융 면책 조항 및 투자 유의사항 (Disclaimer)
                    </strong>
                    본 웹사이트(&quot;스마트 투자 비서&quot;)에서 제공하는 모든 금융 정보, 주식 차트 분석, 시황 브리핑 및 알고리즘 데이터는 투자 판단을 돕기 위한 <strong>단순 참고용 정보</strong>입니다. 
                    본 서비스는 금융투자업상 유사투자자문 또는 투자일임이 아니며, 어떠한 경우에도 특정 주식의 매수·매도를 권유하지 않습니다. 
                    모든 투자의 최종 결정과 수익/손실에 대한 법적 책임은 투자자 본인에게 있습니다.
                  </div>
                  
                  <div className="flex justify-center gap-4 text-xs md:text-sm text-gray-400 flex-wrap mb-4 font-medium">
                    <a href="/about" className="hover:text-white transition-colors">서비스 소개</a>
                    <span className="text-gray-700">|</span>
                    <a href="/guide" className="hover:text-white transition-colors font-bold text-blue-400">주식 투자 가이드</a>
                    <span className="text-gray-700">|</span>
                    <a href="/blog" className="hover:text-white transition-colors">마켓 리포트</a>
                    <span className="text-gray-700">|</span>
                    <a href="/contact" className="hover:text-white transition-colors">문의하기</a>
                    <span className="text-gray-700">|</span>
                    <a href="/privacy-policy" className="hover:text-white transition-colors">개인정보처리방침</a>
                    <span className="text-gray-700">|</span>
                    <a href="/terms" className="hover:text-white transition-colors">이용약관</a>
                    <span className="text-gray-700">|</span>
                    <a href="/disclaimer" className="hover:text-white transition-colors">면책조항</a>
                  </div>

                  <div className="text-[11px] text-gray-500 space-y-1 mb-2">
                    <p>서비스명: 스마트 투자 비서 (StockTrend) | 운영 및 콘텐츠 책임: 윤희원 | 문의: rnfjrlakdmf@gmail.com</p>
                    <p>데이터 출처: 한국거래소(KRX), 금융감독원 DART 전자공시시스템, 미국 증권거래위원회(SEC EDGAR)</p>
                  </div>
                  <p className="text-gray-600 text-xs mt-3">© 2026 StockTrend Team. All rights reserved.</p>
                </div>
              </footer>

              {/* Global Progress Watcher */}
              <GlobalProgressWatcher />
            </main>

            {/* 우측 사이드바 세로형 광고 (160x600) - 데스크톱 전용 */}
            <aside className="hidden xl:flex w-[180px] flex-col items-center pt-24 shrink-0 sticky top-0 h-screen overflow-hidden border-l border-white/5 glass-panel">
              <KakaoAdFit adUnit="DAN-jbSl6i4k3YO3nNSl" adWidth="160" adHeight="600" />
            </aside>

            {/* Global FCM Token Manager (Client-Only Wrapper) */}
            <FCMWrapper />
            
            {/* Mobile Bottom Tab Bar */}
            <KakaoStickyBottomAd />
            <BottomTabBar />

            {/* Smart Floating Quick Menu */}
            <FloatingQuickMenu />

            {/* Global Broadcast Popup (Kakao Style) */}
            <GlobalBroadcastListener />

            <CookieConsent />
          </div>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
