import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ClosingBanner from "@/components/ClosingBanner";
import GlobalProgressWatcher from "@/components/GlobalProgressWatcher";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "AI Stock Analyst",
  description: "AI-powered stock analysis platform",
};




import FCMTokenManager from "@/components/FCMTokenManager";

// ... imports

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // [Deploy Trigger] Force Vercel Re-deploy
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#050505] text-white" suppressHydrationWarning>
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 relative overflow-hidden bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#111] text-foreground">

              {/* [Debug/Fix] Force Notification Banner */}
              <div className="bg-blue-600 text-white text-center py-2 px-4 font-bold relative z-[99999] flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  🔔 알림이 안 보이시나요? 여기서 켜주세요! (v1.5)
                </span>
                <button
                  onClick={() => {
                    const permission = Notification.permission;
                    if (permission === 'denied') {
                      alert('알림이 차단되어 있습니다. 주소창 자물쇠 버튼을 눌러 허용해주세요.');
                    } else {
                      // Trigger FCM Manager logic via event
                      window.dispatchEvent(new CustomEvent('OPEN_FCM_REQUEST'));
                    }
                  }}
                  className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  알림 켜기
                </button>
              </div>
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


