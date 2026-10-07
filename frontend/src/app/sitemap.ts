import { MetadataRoute } from 'next';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { API_BASE_URL } from '@/lib/config';

export const revalidate = 3600; // 1시간마다 ISR 재생성 및 CDN 캐싱

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://stock-trend-program.co.kr';
    
    // 1. 핵심 서비스 및 분석 대시보드 페이지
    const routes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/guide`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/theory`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/signals`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/analysis`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/ranking`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/calculator`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/pattern`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/etf-analysis`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/portfolio`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/weekend-report`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/watchlist`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/supply-chain`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/discovery`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/calendar`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/earnings`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        // 애드센스 및 검색엔진 필수 5대 정책/신뢰성 페이지
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/disclaimer`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
    ];

    // 2. 46대 주식 교육 전문 가이드 (구글 애드센스 고품질 텍스트 심사 핵심 자산)
    const ALL_GUIDE_SLUGS = [
        "ai-investing", "averaging-down", "beta", "bollinger-band", "book-value", 
        "dart", "dead-cross", "disclosure", "diversification", "dividend", 
        "dividend-yield", "ebitda", "eps", "etf", "ex-dividend-date", 
        "fomc", "fundamental-analysis", "golden-cross", "growth-investing", 
        "inflation", "interest-rate", "kosdaq", "kospi", "limit-order", 
        "macd", "market-cap", "market-order", "momentum", "moving-average", 
        "net-profit", "operating-profit", "pbr", "per", "portfolio", 
        "rebalancing", "revenue", "risk-management", "roe", "rsi", 
        "sector-rotation", "short-selling", "stop-loss", "supply-chain-analysis", 
        "technical-analysis", "value-investing", "volume"
    ];

    ALL_GUIDE_SLUGS.forEach((slug) => {
        routes.push({
            url: `${baseUrl}/guide/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.95, // 구글 크롤러에게 최우선 수집 요청
        });
    });

    // 3. 고품질 정적 SEO 블로그 포스트 (1,500자 이상 전문가 칼럼)
    STATIC_POSTS.forEach((post) => {
        routes.push({
            url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
            lastModified: new Date(post.createdAt),
            changeFrequency: 'weekly',
            priority: 0.95,
        });
    });

    const backendApiUrl = API_BASE_URL || 'http://127.0.0.1:8000';
    const frontendApiUrl = baseUrl;

    // 4~7. 동적 포스트들을 Promise.allSettled로 병렬 수집 (최대 타임아웃 1.2초로 제한하여 검색봇 타임아웃 절대 방지)
    try {
        const fetchWithFastTimeout = async (url: string, timeoutMs: number = 1200) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetch(url, { next: { revalidate: 3600 }, signal: controller.signal });
                clearTimeout(id);
                return res.ok ? await res.json() : null;
            } catch {
                clearTimeout(id);
                return null;
            }
        };

        const [themeData, blogData, theoryData, seoData] = await Promise.all([
            fetchWithFastTimeout(`${backendApiUrl}/api/seo/themes`),
            fetchWithFastTimeout(`${frontendApiUrl}/api/blog/posts?page=1&limit=100`),
            fetchWithFastTimeout(`${frontendApiUrl}/api/theory/posts?page=1&limit=100`),
            fetchWithFastTimeout(`${frontendApiUrl}/api/seo_posts?page=1&limit=200`),
        ]);

        // 테마 페이지
        if (themeData?.data && Array.isArray(themeData.data)) {
            themeData.data.forEach((theme: any) => {
                routes.push({
                    url: `${baseUrl}/theme/${theme.slug}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly',
                    priority: 0.8,
                });
            });
        }

        // 블로그 포스트
        if (blogData?.status === 'ok' && Array.isArray(blogData.posts)) {
            blogData.posts.forEach((post: any) => {
                const slug = post.slug || post.id;
                routes.push({
                    url: `${baseUrl}/blog/${encodeURIComponent(slug)}`,
                    lastModified: new Date(post.createdAt || Date.now()),
                    changeFrequency: 'daily',
                    priority: 0.9,
                });
            });
        }

        // 이론 포스트
        if (theoryData?.status === 'ok' && Array.isArray(theoryData.posts)) {
            theoryData.posts.forEach((post: any) => {
                const slug = post.slug || post.id;
                routes.push({
                    url: `${baseUrl}/theory/${encodeURIComponent(slug)}`,
                    lastModified: new Date(post.createdAt || Date.now()),
                    changeFrequency: 'daily',
                    priority: 0.95,
                });
            });
        }

        // 실시간 SEO 포스트
        if (seoData?.status === 'ok' && Array.isArray(seoData.posts)) {
            seoData.posts.forEach((post: any) => {
                const slug = post.slug || post.id;
                routes.push({
                    url: `${baseUrl}/post/${encodeURIComponent(slug)}`,
                    lastModified: new Date(post.createdAt || Date.now()),
                    changeFrequency: 'daily',
                    priority: 0.85,
                });
            });
        }
    } catch (e) {
        console.error("Fast sitemap extra fetch failed safely:", e);
    }

    // 중복 URL 제거 (Set 기반)
    const seenUrls = new Set<string>();
    const uniqueRoutes = routes.filter((r) => {
        if (seenUrls.has(r.url)) return false;
        seenUrls.add(r.url);
        return true;
    });

    return uniqueRoutes;
}
