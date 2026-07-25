"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Star, Menu } from "lucide-react";

export default function BottomTabBar() {
    const pathname = usePathname();
    
    const tabs = [
        { name: "홈", href: "/", icon: LayoutDashboard },
        { name: "종목발굴", href: "/discovery", icon: Search },
        { name: "관심종목", href: "/watchlist", icon: Star },
    ];

    const openSidebar = () => {
        window.dispatchEvent(new Event('open-mobile-sidebar'));
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 w-full z-[990] bg-black/80 backdrop-blur-xl border-t border-white/10 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-around px-2 py-1.5">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    return (
                        <Link 
                            key={tab.name}
                            href={tab.href}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <tab.icon className={`h-5 w-5 mb-1 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] text-blue-400' : ''} transition-transform`} />
                            <span className="text-[10px] font-bold">{tab.name}</span>
                        </Link>
                    )
                })}
                <button 
                    onClick={openSidebar}
                    className="flex flex-col items-center justify-center p-2 rounded-xl text-gray-500 hover:text-gray-300 transition-all"
                >
                    <Menu className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-bold">메뉴</span>
                </button>
            </div>
        </div>
    );
}
