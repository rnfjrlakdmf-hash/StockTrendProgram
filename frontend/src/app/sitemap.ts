import { MetadataRoute } from 'next';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';

export const revalidate = 3600; // 1시간마다 ISR 재생성 및 CDN 캐싱

const ALL_THEME_SLUGS = [
    'ai', 'secondary-battery', 'robot', 'semiconductor', 'superconductor',
    'low-pbr', 'defense', 'entertainment', 'bio', 'ecommerce',
    'shipbuilding', 'metaverse', 'nuclear', 'cloud', 'gaming',
    'webtoon', 'beauty', 'healthcare', 'aviation', 'food'
];

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://stock-trend-program.co.kr';
    const now = new Date();
    
    // 1. 핵심 에디토리얼·금융 아카데미·신뢰성 정책 페이지 (구글 애드센스 고품질 콘텐츠 전용)
    const routes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/guide`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/theory`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/theme`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/research`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/disclaimer`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.7,
        },
    ];

    // 2. 46대 주식 투자 필수 금융 백과사전 가이드 (100% 장문 오리지널 콘텐츠)
    ALL_GUIDE_SLUGS.forEach((slug) => {
        routes.push({
            url: `${baseUrl}/guide/${slug}`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.92,
        });
    });

    // 3. 20대 핵심 산업·섹터 리서치 페이지
    ALL_THEME_SLUGS.forEach((slug) => {
        routes.push({
            url: `${baseUrl}/theme/${slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.88,
        });
    });

    // 4. 정적 오리지널 칼럼 분할 등록 (/blog 와 /theory 간 중복 원천 차단)
    const blogStaticPosts = STATIC_POSTS.slice(0, 13);
    const theoryStaticPosts = STATIC_POSTS.slice(13);

    blogStaticPosts.forEach((post) => {
        routes.push({
            url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
            lastModified: new Date(post.createdAt),
            changeFrequency: 'monthly',
            priority: 0.9,
        });
    });

    theoryStaticPosts.forEach((post) => {
        routes.push({
            url: `${baseUrl}/theory/${encodeURIComponent(post.slug)}`,
            lastModified: new Date(post.createdAt),
            changeFrequency: 'monthly',
            priority: 0.9,
        });
    });

    // 5. 백엔드 발간 오리지널 마켓 리포트(/blog) 및 차트 아카데미(/theory) 칼럼 추가
    try {
        const fetchWithFastTimeout = async (url: string, timeoutMs: number = 4000) => {
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

        const [blogData, theoryData] = await Promise.all([
            fetchWithFastTimeout(`${baseUrl}/api/blog/posts?page=1&limit=40`),
            fetchWithFastTimeout(`${baseUrl}/api/theory/posts?page=1&limit=50`),
        ]);

        const staticSlugs = new Set(STATIC_POSTS.map(p => p.slug));

        if (blogData?.status === 'ok' && Array.isArray(blogData.posts)) {
            const seenBlogSlugs = new Set<string>();
            blogData.posts.forEach((post: any) => {
                const slug = String(post.slug || post.id || '');
                if (slug && !staticSlugs.has(slug) && seenBlogSlugs.size < 35 && !seenBlogSlugs.has(slug)) {
                    seenBlogSlugs.add(slug);
                    routes.push({
                        url: `${baseUrl}/blog/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt || Date.now()),
                        changeFrequency: 'weekly',
                        priority: 0.88,
                    });
                }
            });
        }

        if (theoryData?.status === 'ok' && Array.isArray(theoryData.posts)) {
            const seenTheorySlugs = new Set<string>();
            theoryData.posts.forEach((post: any) => {
                const slug = String(post.slug || post.id || '');
                if (slug && !staticSlugs.has(slug) && seenTheorySlugs.size < 45 && !seenTheorySlugs.has(slug)) {
                    seenTheorySlugs.add(slug);
                    routes.push({
                        url: `${baseUrl}/theory/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt || Date.now()),
                        changeFrequency: 'weekly',
                        priority: 0.88,
                    });
                }
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
