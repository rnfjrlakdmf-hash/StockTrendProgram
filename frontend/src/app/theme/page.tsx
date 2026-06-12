import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';

// 6시간(21600초)마다 재검증 (ISR)
export const revalidate = 21600;

export default async function ThemeIndexPage() {
    let themes = [];
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/themes`, { next: { revalidate: 21600 } });
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
                themes = data.data;
            }
        }
    } catch (e) {
        console.error("Failed to fetch themes", e);
    }

    return (
        <div className="min-h-screen bg-black pb-20">
            <div className="max-w-7xl mx-auto px-6 pt-24">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                        주식 테마 <span className="text-cyan-400">총람</span>
                    </h1>
                    <p className="text-gray-400 text-lg">
                        현재 시장을 주도하는 핵심 테마와 관련 대장주를 한눈에 파악하세요.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {themes.map((theme: any) => (
                        <Link href={`/theme/${theme.slug}`} key={theme.slug} className="block group">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-300 h-full flex flex-col justify-center">
                                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                    {theme.name}
                                </h2>
                                <p className="text-gray-500 text-sm font-medium flex items-center gap-2 mt-4">
                                    <span className="w-8 h-[1px] bg-cyan-500/30"></span> 
                                    테마 상세 분석 보기
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
