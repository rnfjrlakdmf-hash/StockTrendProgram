import { db } from "@/lib/firebase";
import Link from "next/link";
import { Clock, BookOpen, ChevronRight, Eye } from "lucide-react";
import { Metadata } from "next";
import KakaoAdFit from "@/components/KakaoAdFit";

export const metadata: Metadata = {
    title: "매일 차트 스터디 | 주식이론방",
    description: "초보자를 위한 매일매일 올라오는 알기 쉬운 주식 이론과 차트 분석 강의",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getTheoryPosts(page: number, limitPerPage: number) {
    try {
        const apiUrl = `https://stock-trend-program.co.kr/api/theory/posts?page=${page}&limit=${limitPerPage}`;
        const res = await fetch(apiUrl, { cache: 'no-store' });
        
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        
        const data = await res.json();
        
        if (data.status !== "ok" || !data.posts?.length) {
            throw new Error("No posts from API");
        }

        const posts = data.posts.map((p: any) => ({
            id: p.id,
            title: p.title,
            content: p.content,
            createdAt: new Date(p.createdAt),
            tags: p.tags || [],
            slug: p.slug || p.id,
            viewCount: p.viewCount || 0,
        }));

        return { posts, totalPages: data.totalPages || 1 };
    } catch (error) {
        console.error("이론 포스트 로딩 에러:", error);
        return { posts: [], totalPages: 1 };
    }
}
type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function TheoryListPage(props: Props) {
    const searchParams = await props.searchParams;
    const page = parseInt((searchParams.page as string) || "1", 10);
    const limitPerPage = 10;
    
    const { posts, totalPages } = await getTheoryPosts(page, limitPerPage);

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/10 blur-3xl rounded-full pointer-events-none" />
                <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight flex items-center justify-center gap-3 relative z-10">
                    <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-green-500" />
                    매일 차트 스터디
                </h1>
                <p className="text-lg md:text-xl text-gray-400 font-medium relative z-10">
                    초보자를 위한 1타 강사의 아주 쉬운 주식 이론 강의
                </p>
            </div>

            <div className="grid gap-6">
                {posts.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                        <p className="text-gray-400">아직 작성된 강의가 없습니다.</p>
                    </div>
                ) : (
                    posts.map((post: any, index: number) => (
                        <div key={post.id}>
                            <Link href={`/theory/${post.slug}`} className="block group">
                                <article className="bg-black/40 border border-white/10 hover:border-green-500/50 rounded-3xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 relative overflow-hidden flex flex-col md:flex-row gap-6 md:items-center">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/0 group-hover:bg-green-500/10 blur-3xl transition-colors duration-500 rounded-full" />
                                    
                                    <div className="flex-1 min-w-0 z-10">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {post.tags.map((tag: string, idx: number) => (
                                                <span key={idx} className="text-[10px] md:text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-green-300 transition-colors mb-3 line-clamp-2">
                                            {post.title}
                                        </h2>
                                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                                            {post.content.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim().slice(0, 150)}...
                                        </p>
                                        <div className="flex items-center text-xs text-gray-500 font-medium">
                                            <Clock className="w-3.5 h-3.5 mr-1" />
                                            {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                timeZone: 'Asia/Seoul'
                                            })}
                                            <Eye className="w-3.5 h-3.5 ml-4 mr-1 text-gray-500" />
                                            <span>{post.viewCount} 읽음</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-400 font-bold whitespace-nowrap z-10 bg-green-500/10 px-4 py-2 rounded-xl group-hover:bg-green-500/20 transition-colors self-start md:self-auto">
                                        강의 보기
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </article>
                            </Link>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-16 pb-8">
                    {page > 1 && (
                        <Link href={`/theory?page=${page - 1}`} className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </Link>
                    )}
                    
                    {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                            return (
                                <Link 
                                    key={pageNum} 
                                    href={`/theory?page=${pageNum}`}
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl font-medium transition-all ${
                                        page === pageNum 
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 border border-green-400/50' 
                                            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {pageNum}
                                </Link>
                            );
                        } else if (pageNum === page - 2 || pageNum === page + 2) {
                            return <span key={pageNum} className="text-gray-600 px-1">...</span>;
                        }
                        return null;
                    })}

                    {page < totalPages && (
                        <Link href={`/theory?page=${page + 1}`} className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            )}
            
            <div className="w-full flex justify-center mt-12 mb-4">
                <KakaoAdFit adUnit="DAN-b9cY6ogHFZTTD0Sl" adWidth="320" adHeight="50" />
            </div>
            {/* 하단 직사각형 배너 광고 (320x100) */}
            <div className="w-full flex justify-center mb-8">
                <KakaoAdFit adUnit="DAN-8TxTsrWjI6Q4SOt0" adWidth="320" adHeight="100" />
            </div>
        </div>
    );
}
