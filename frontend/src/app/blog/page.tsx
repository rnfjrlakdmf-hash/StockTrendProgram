import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, getCountFromServer } from "firebase/firestore";

export const revalidate = 60; // 60초마다 ISR (캐시 갱신)

async function getBlogPosts(page: number, limitPerPage: number) {
    try {
        const collRef = collection(db, "blog_posts");
        
        // 전체 포스트 수 계산
        const countSnap = await getCountFromServer(collRef);
        const totalPosts = countSnap.data().count;
        
        if (totalPosts === 0) {
            const staticSliced = STATIC_POSTS.slice((page - 1) * limitPerPage, page * limitPerPage);
            return { posts: staticSliced, totalPages: Math.ceil(STATIC_POSTS.length / limitPerPage) };
        }

        const totalPages = Math.ceil(totalPosts / limitPerPage);

        // 지정된 페이지까지 모두 가져와서 자르기 (Firebase 페이징 단순화)
        const q = query(collRef, orderBy("createdAt", "desc"), limit(page * limitPerPage));
        const snapshot = await getDocs(q);
        
        const dbPosts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || "제목 없음",
                content: data.content || "",
                createdAt: data.createdAt?.toDate?.() || new Date(),
                tags: data.tags || [],
                slug: data.slug || doc.id,
                viewCount: data.viewCount || 0
            };
        });

        // 현재 페이지에 해당하는 데이터만 잘라서 반환
        const startIndex = (page - 1) * limitPerPage;
        const posts = dbPosts.slice(startIndex, startIndex + limitPerPage);

        return { posts, totalPages };
    } catch (error) {
        console.error("블로그 포스트 로딩 에러:", error);
        const staticSliced = STATIC_POSTS.slice((page - 1) * limitPerPage, page * limitPerPage);
        return { posts: staticSliced, totalPages: Math.ceil(STATIC_POSTS.length / limitPerPage) };
    }
}

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function BlogListPage(props: Props) {
    const searchParams = await props.searchParams;
    const page = parseInt((searchParams.page as string) || "1", 10);
    const limitPerPage = 10;
    
    const { posts, totalPages } = await getBlogPosts(page, limitPerPage);

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
                <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight flex items-center justify-center gap-3 relative z-10">
                    <TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-blue-500" />
                    Market View
                </h1>
                <p className="text-lg md:text-xl text-gray-400 font-medium relative z-10">
                    상위 1% 투자자들을 위한 전문가 증시 요약 리포트
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
                                        {post.content.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim().slice(0, 150)}...
                                    </p>
                                    <div className="flex items-center text-xs text-gray-500 font-medium">
                                        <Clock className="w-3.5 h-3.5 mr-1" />
                                        {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                        <Eye className="w-3.5 h-3.5 ml-4 mr-1 text-gray-500" />
                                        <span>{post.viewCount}</span>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-16 pb-8">
                    {page > 1 && (
                        <Link href={`/blog?page=${page - 1}`} className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </Link>
                    )}
                    
                    {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        // 현재 페이지 근처 2개씩만 표시하거나, 처음/끝 페이지만 표시 (심플 버전은 전체 표시)
                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                            return (
                                <Link 
                                    key={pageNum} 
                                    href={`/blog?page=${pageNum}`}
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl font-medium transition-all ${
                                        page === pageNum 
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 border border-blue-400/50' 
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
                        <Link href={`/blog?page=${page + 1}`} className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
