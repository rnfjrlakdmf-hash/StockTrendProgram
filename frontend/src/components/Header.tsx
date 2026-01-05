"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, User, BarChart2, ShieldAlert, Sparkles, LineChart, UserCheck, Users } from "lucide-react";

interface HeaderProps {
    title?: string;
    subtitle?: string;
    onSearch?: (term: string) => void;
}

export default function Header({ title = "대시보드", subtitle = "환영합니다, 투자자님", onSearch }: HeaderProps) {
    const pathname = usePathname();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(e.currentTarget.value);
        }
    };

    return (
        <header className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50 transition-all duration-200">
            <div className="flex items-center gap-8 w-full md:w-auto mb-4 md:mb-0">
                <div>
                    <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        ANTIGRAVITY
                    </h1>
                    <p className="text-xs text-gray-400 font-mono tracking-widest uppercase">AI Stock Analyst</p>
                </div>

                {/* Navigation Links - Scrollable on Desktop/Tablet */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium ml-4 overflow-x-auto no-scrollbar mask-linear-fade max-w-[60vw] whitespace-nowrap pr-4">
                    <Link href="/" className={`hover:text-white transition-colors flex items-center gap-1.5 ${pathname === '/' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                        <Sparkles className="w-4 h-4" /> 대시보드
                    </Link>
                    <Link href="/discovery" className={`hover:text-white transition-colors flex items-center gap-1.5 ${pathname === '/discovery' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                        <BarChart2 className="w-4 h-4" /> 종목 발굴
                    </Link>
                    <Link href="/chat" className={`hover:text-white transition-colors flex items-center gap-1.5 ${pathname === '/chat' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                        <Users className="w-4 h-4" /> 챗봇 상담
                    </Link>
                    <Link href="/portfolio" className={`hover:text-white transition-colors flex items-center gap-1.5 ${pathname === '/portfolio' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                        <ShieldAlert className="w-4 h-4" /> 포트폴리오
                    </Link>
                    <Link href="/theme" className={`hover:text-white transition-colors flex items-center gap-1.5 ${pathname === '/theme' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                        <Sparkles className="w-4 h-4 text-yellow-400" /> 이슈 테마 <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded ml-0.5">HOT</span>
                    </Link>
                    <Link href="/pattern" className={`hover:text-white transition-colors flex items-center gap-1.5 ${pathname === '/pattern' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                        <LineChart className="w-4 h-4 text-emerald-500" /> 차트 분석
                    </Link>
                    <Link href="/coach" className={`hover:text-white transition-colors flex items-center gap-1.5 ${pathname === '/coach' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                        <UserCheck className="w-4 h-4 text-orange-500" /> AI 코치
                    </Link>
                </nav>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative group w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="종목 검색 (예: AAPL)..."
                        onKeyDown={handleKeyDown}
                        className="h-10 w-full md:w-64 rounded-xl bg-white/5 pl-10 pr-4 text-sm outline-none ring-1 ring-white/10 transition-all focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 text-gray-200 placeholder-gray-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button className="relative rounded-xl bg-white/5 p-2.5 transition-colors hover:bg-white/10 hover:text-blue-400 border border-white/5">
                        <Bell className="h-5 w-5 text-gray-400" />
                        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 animate-pulse ring-2 ring-black" />
                    </button>
                    <button className="rounded-xl border border-white/5 bg-white/5 p-1 flex items-center gap-2 pr-3 hover:bg-white/10 transition-colors">
                        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-1.5">
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-300 hidden md:block">투자자</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
