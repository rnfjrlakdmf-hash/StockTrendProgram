
import Link from "next/link";
import { LayoutDashboard, Newspaper, Compass, Settings, Bell, MessageSquare } from "lucide-react";

const navigation = [
    { name: "대시보드", href: "/", icon: LayoutDashboard },
    { name: "AI 브리핑", href: "/briefing", icon: Newspaper },
    { name: "종목 발굴", href: "/discovery", icon: Compass },
    { name: "상담 챗봇", href: "/chat", icon: MessageSquare },
    { name: "포트폴리오", href: "/portfolio", icon: Compass },
    { name: "가격 알림", href: "/alerts", icon: Bell },
    { name: "설정", href: "/settings", icon: Settings },
];

export default function Sidebar() {
    return (
        <div className="flex h-screen w-64 flex-col justify-between border-r border-white/10 bg-black/40 backdrop-blur-md text-white p-4 hidden md:flex">
            <div>
                <div className="flex items-center gap-2 px-2 py-4 mb-8">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 animate-pulse" />
                    <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        STOCK AI
                    </span>
                </div>

                <nav className="space-y-2">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition-all hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 group"
                        >
                            <item.icon className="h-5 w-5 transition-colors group-hover:text-blue-400" />
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-4 border border-white/5">
                <p className="text-xs font-semibold text-blue-200 mb-1">PRO 요금제</p>
                <p className="text-[10px] text-gray-400 mb-3">고급 AI 인사이트를 받아보세요</p>
                <button className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors">
                    업그레이드
                </button>
            </div>
        </div>
    );
}
