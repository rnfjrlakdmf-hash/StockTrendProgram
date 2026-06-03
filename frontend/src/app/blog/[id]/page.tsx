import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import Link from "next/link";
import { Clock, ArrowLeft, Share2 } from "lucide-react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import KakaoShareButton from "@/components/KakaoShareButton";

export const revalidate = 60; // 60초마다 갱신 (ISR)

async function getBlogPost(slug: string) {
    try {
        const docRef = doc(db, "blog_posts", slug);
        const snapshot = await getDoc(docRef);
        
        if (!snapshot.exists()) {
            return null;
        }

        const data = snapshot.data();
        return {
            id: snapshot.id,
            title: data.title || "제목 없음",
            content: data.content || "",
            createdAt: data.createdAt?.toDate?.() || new Date(),
            tags: data.tags || [],
            author: data.author || "AI 퀀트봇",
            slug: data.slug || snapshot.id
        };
    } catch (error) {
        console.error("블로그 포스트 상세 로딩 에러:", error);
        return null;
    }
}

// 동적 메타데이터 생성 (SEO 핵심)
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const post = await getBlogPost(params.id);
    
    if (!post) {
        return { title: "포스트를 찾을 수 없습니다" };
    }

    return {
        title: `${post.title} | StockTrendProgram`,
        description: post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
        openGraph: {
            title: post.title,
            description: post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
            type: "article",
            publishedTime: post.createdAt.toISOString(),
            authors: [post.author]
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
        }
    };
}

export default async function BlogPostPage({ params }: { params: { id: string } }) {
    const post = await getBlogPost(params.id);

    if (!post) {
        notFound();
    }

    // 조회수 증가 로직 (서버 사이드에서 실행)
    try {
        const docRef = doc(db, "blog_posts", params.id);
        await updateDoc(docRef, {
            viewCount: increment(1)
        });
    } catch (e) {
        console.error("조회수 증가 실패:", e);
    }

    return (
        <article className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-4xl mx-auto animate-in fade-in duration-500">
            {/* Header / Back */}
            <div className="mb-8 flex justify-between items-center">
                <Link 
                    href="/blog" 
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors font-medium text-sm border border-white/10"
                >
                    <ArrowLeft className="w-4 h-4" />
                    목록으로 돌아가기
                </Link>
                
                <KakaoShareButton 
                    title={post.title}
                    description={post.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + "..."}
                    url={`https://stock-trend-program.co.kr/blog/${post.slug}`}
                    buttonText="리포트 보기"
                    className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 md:gap-2 transition-colors shadow-lg shadow-[#FEE500]/10"
                />
            </div>

            {/* Title Section */}
            <header className="mb-12 border-b border-white/10 pb-8">
                <div className="flex flex-wrap gap-2 mb-6">
                    {post.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="text-xs md:text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                            #{tag}
                        </span>
                    ))}
                </div>
                
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
                    {post.title}
                </h1>
                
                <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            AI
                        </div>
                        <span className="text-gray-300">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <time dateTime={post.createdAt.toISOString()}>
                            {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                            })}
                        </time>
                    </div>
                </div>
            </header>

            {/* Content Section (HTML Rendered) */}
            <div 
                className="blog-content leading-loose"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* Global Styles specific to Blog Content */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .blog-content {
                    font-size: 1.125rem;
                    color: #d1d5db;
                }
                .blog-content h2 {
                    font-size: 2rem;
                    font-weight: 900;
                    color: white;
                    margin-top: 2.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 0.5rem;
                }
                .blog-content h3 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    color: #93c5fd;
                }
                .blog-content p {
                    margin-bottom: 1.25rem;
                }
                .blog-content ul {
                    list-style-type: none;
                    padding-left: 0;
                    margin-bottom: 1.5rem;
                }
                .blog-content li {
                    margin-bottom: 0.75rem;
                }
                .blog-content a {
                    color: #60a5fa;
                    text-decoration: underline;
                    text-underline-offset: 4px;
                }
                `
            }} />
        </article>
    );
}
