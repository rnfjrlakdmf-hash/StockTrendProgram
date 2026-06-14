import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { Clock, ArrowLeft, Share2, UserCheck, Eye } from "lucide-react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import SocialShareButtons from "@/components/SocialShareButtons";
import BlogViewTracker from "@/components/BlogViewTracker";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { STATIC_POSTS } from "@/lib/staticBlogPosts";

export const revalidate = 60; // 60초마다 갱신 (ISR)

async function getBlogPost(slug: string) {
    try {
        const decodedSlug = decodeURIComponent(slug);
        const docRef = doc(db, "blog_posts", decodedSlug);
        const snapshot = await getDoc(docRef);
        
        if (!snapshot.exists()) {
            const staticPost = STATIC_POSTS.find(p => p.slug === decodedSlug);
            if (staticPost) return staticPost;
            return null;
        }

        const data = snapshot.data();
        return {
            id: snapshot.id,
            title: data.title || "제목 없음",
            content: data.content || "",
            createdAt: data.createdAt?.toDate?.() || new Date(),
            tags: data.tags || [],
            author: data.author || "관리자",
            slug: data.slug || snapshot.id,
            viewCount: data.viewCount || 0
        };
    } catch (error) {
        console.error("블로그 포스트 상세 로딩 에러:", error);
        return null;
    }
}

// 동적 메타데이터 생성 (SEO 핵심)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const post = await getBlogPost(resolvedParams.id);
    
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
            authors: [post.author],
            images: [
                {
                    url: `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 배달되는 AI 주식 시황 리포트')}&tag=${encodeURIComponent('시황 리포트')}`,
                    width: 1200,
                    height: 630,
                    alt: post.title,
                }
            ]
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
            images: [`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 배달되는 AI 주식 시황 리포트')}&tag=${encodeURIComponent('시황 리포트')}`]
        }
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const post = await getBlogPost(resolvedParams.id);

    if (!post) {
        notFound();
    }

    return (
        <article className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-4xl mx-auto animate-in fade-in duration-500">
            <BlogViewTracker id={post.slug} />
            {/* Header / Back */}
            <div className="mb-8 flex justify-between items-center">
                <Link 
                    href="/blog" 
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors font-medium text-sm border border-white/10"
                >
                    <ArrowLeft className="w-4 h-4" />
                    목록으로 돌아가기
                </Link>
                
                <SocialShareButtons 
                    title={post.title}
                    description={post.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + "..."}
                    url={`https://stock-trend-program.co.kr/blog/${post.slug}`}
                    imageUrl={`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 배달되는 AI 주식 시황 리포트')}&tag=${encodeURIComponent('시황 리포트')}`}
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
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                            <UserCheck className="w-4 h-4" />
                        </div>
                        <span className="text-gray-300 font-bold">{post.author}</span>
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
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>{post.viewCount} 읽음</span>
                    </div>
                </div>
            </header>

            {/* Content Section (HTML Rendered) */}
            <div 
                className="blog-content leading-loose"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* 푸시 알림 구독 버튼 (본문 끝난 후) */}
            <div className="mt-16 mb-8">
                <PushSubscribeButton />
            </div>
            
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
