import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { Clock, TrendingUp, ChevronRight } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "마켓 뷰 (Blog) | StockTrendProgram",
    description: "AI가 매일 분석하는 국내/미국 증시 시황과 핵심 주도 테마 요약 리포트",
};

export const revalidate = 60; // 60초마다 ISR (캐시 갱신)

async function getBlogPosts() {
    try {
        const q = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"), limit(20));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || "제목 없음",
                content: data.content || "",
                createdAt: data.createdAt?.toDate?.() || new Date(),
                tags: data.tags || [],
                slug: data.slug || doc.id
            };
        });
    } catch (error) {
        console.error("블로그 포스트 로딩 에러:", error);
        return [];
    }
}

export default async function BlogListPage() {
    const posts = await getBlogPosts();

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
                <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight flex items-center justify-center gap-3 relative z-10">
                    <TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-blue-500" />
                    Market View
                </h1>
                <p className="text-lg md:text-xl text-gray-400 font-medium relative z-10">
                    상위 1% 투자자들을 위한 AI 증시 요약 리포트
                </p>
            </div>

            <div className="grid gap-6">
                {posts.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                        <p className="text-gray-400">아직 작성된 리포트가 없습니다.</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <Link href={`/blog/${post.slug}`} key={post.id} className="block group">
                            <article className="bg-black/40 border border-white/10 hover:border-blue-500/50 rounded-3xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 relative overflow-hidden flex flex-col md:flex-row gap-6 md:items-center">
                                {/* Glow Effect on Hover */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/0 group-hover:bg-blue-500/10 blur-3xl transition-colors duration-500 rounded-full" />
                                
                                <div className="flex-1 min-w-0 z-10">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {post.tags.map((tag: string, idx: number) => (
                                            <span key={idx} className="text-[10px] md:text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-blue-300 transition-colors mb-3 line-clamp-2">
                                        {post.title}
                                    </h2>
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                                        {post.content.replace(/[#*>]/g, '').slice(0, 150)}...
                                    </p>
                                    <div className="flex items-center text-xs text-gray-500 font-medium">
                                        <Clock className="w-3.5 h-3.5 mr-1" />
                                        {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>
                                <div className="hidden md:flex shrink-0 items-center justify-center w-12 h-12 rounded-full bg-white/5 group-hover:bg-blue-600 transition-colors z-10">
                                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                                </div>
                            </article>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
