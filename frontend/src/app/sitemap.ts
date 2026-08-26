import { MetadataRoute } from 'next';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://stock-trend-program.co.kr';
    
    const routes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
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
            url: `${baseUrl}/pattern`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/etf-analysis`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
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
            priority: 0.8,
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
            url: `${baseUrl}/guide`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
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
            url: `${baseUrl}/disclaimer`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.6,
        },
    ];

    // 46대 주식 교육 전문 가이드 색인 추가 (애드센스 고품질 콘텐츠 심사 핵심)
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
            priority: 0.85,
        });
    });

    // Add static high-quality SEO posts
    STATIC_POSTS.forEach((post) => {
        routes.push({
            url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
            lastModified: new Date(post.createdAt),
            changeFrequency: 'daily',
            priority: 1.0, // Highest priority for SEO content
        });
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://13.209.99.170:8000';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(`${apiUrl}/api/seo/stocks`, { next: { revalidate: 86400 }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && data.data && Array.isArray(data.data)) {
                data.data.forEach((stock: any) => {
                    routes.push({
                        url: `${baseUrl}/stock/${stock.ticker}`,
                        lastModified: new Date(),
                        changeFrequency: 'weekly',
                        priority: 0.6,
                    });
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate stock sitemap:", e);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(`${apiUrl}/api/seo/themes`, { next: { revalidate: 86400 }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && data.data && Array.isArray(data.data)) {
                data.data.forEach((theme: any) => {
                    routes.push({
                        url: `${baseUrl}/theme/${theme.slug}`,
                        lastModified: new Date(),
                        changeFrequency: 'weekly',
                        priority: 0.8,
                    });
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate theme sitemap:", e);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(`${apiUrl}/api/blog/posts?page=1&limit=1000`, { next: { revalidate: 3600 }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                data.posts.forEach((post: any) => {
                    const slug = post.slug || post.id;
                    routes.push({
                        url: `${baseUrl}/blog/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt),
                        changeFrequency: 'daily',
                        priority: 0.9, // High priority for news/blog
                    });
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate blog sitemap:", e);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(`${apiUrl}/api/theory/posts?page=1&limit=1000`, { next: { revalidate: 3600 }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                data.posts.forEach((post: any) => {
                    const slug = post.slug || post.id;
                    routes.push({
                        url: `${baseUrl}/theory/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt),
                        changeFrequency: 'daily',
                        priority: 0.9,
                    });
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate theory sitemap:", e);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        // SEO posts limit is set high to capture all hot issue posts
        const res = await fetch(`${apiUrl}/api/seo_posts?page=1&limit=5000`, { next: { revalidate: 3600 }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                data.posts.forEach((post: any) => {
                    const slug = post.slug || post.id;
                    routes.push({
                        url: `${baseUrl}/post/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt),
                        changeFrequency: 'daily',
                        priority: 0.9,
                    });
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate seo posts sitemap:", e);
    }

    return routes;
}
