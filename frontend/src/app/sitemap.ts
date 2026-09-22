import { MetadataRoute } from 'next';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { API_BASE_URL } from '@/lib/config';

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

    const apiUrl = API_BASE_URL || 'http://127.0.0.1:8000';

    // 4. 테마별 산업 및 시장 분석 (고품질 테마 분석 콘텐츠)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
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

    // 5. 전문가 마켓 리포트 & 실시간 브리핑 포스트
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${apiUrl}/api/blog/posts?page=1&limit=200`, { next: { revalidate: 3600 }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                data.posts.forEach((post: any) => {
                    const slug = post.slug || post.id;
                    routes.push({
                        url: `${baseUrl}/blog/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt || Date.now()),
                        changeFrequency: 'daily',
                        priority: 0.9,
                    });
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate blog sitemap:", e);
    }

    // 6. 차트 및 기술적 분석 투자 이론 포스트
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${apiUrl}/api/theory/posts?page=1&limit=200`, { next: { revalidate: 3600 }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                data.posts.forEach((post: any) => {
                    const slug = post.slug || post.id;
                    routes.push({
                        url: `${baseUrl}/theory/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt || Date.now()),
                        changeFrequency: 'daily',
                        priority: 0.9,
                    });
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate theory sitemap:", e);
    }

    // 7. 실시간 핫이슈 & 시장 분석 포스트
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${apiUrl}/api/seo_posts?page=1&limit=500`, { next: { revalidate: 3600 }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                data.posts.forEach((post: any) => {
                    const slug = post.slug || post.id;
                    routes.push({
                        url: `${baseUrl}/post/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt || Date.now()),
                        changeFrequency: 'daily',
                        priority: 0.85,
                    });
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate seo posts sitemap:", e);
    }

    // [중요] 8,000개 이상의 자동생성된 빈약한 종목 상세 페이지(/stock/XXXXXX)는
    // 구글 애드센스 심사 봇이 "가치 없는 콘텐츠(Thin Content)"로 오인하는 주원인이므로
    // 사이트맵에서 배제하고, 위와 같이 100% 읽을거리가 풍부한 고품질 교육·분석 페이지로만 집중 등록합니다.

    return routes;
}
