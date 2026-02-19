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
import DebugBanner from "@/components/DebugBanner";

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
              {/* [Debug] Emergency Banner Hidden */}
              {/* <DebugBanner /> */}
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


