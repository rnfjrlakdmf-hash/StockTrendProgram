import { MetadataRoute } from 'next';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { API_BASE_URL } from '@/lib/config';

export const revalidate = 3600; // 1시간마다 ISR 재생성 및 CDN 캐싱

// 한국 및 미국 검색량 최상위 대표 종목 (구글/네이버 종목 검색 유입 핵심 타겟)
const CORE_SEO_TICKERS = [
    // 국내 대표 대형주 · 인기 검색주
    '005930', '000660', '034020', '010140', '042660', '329180', '003490', '012450',
    '047810', '079550', '373220', '006400', '051910', '086520', '247540', '003670',
    '035420', '035720', '005380', '000270', '012330', '207940', '068270', '196170',
    '028300', '042700', '001440', '009830', '010120', '267260', '003550', '055550',
    '105560', '086790', '316140', '028050', '012630', '306200', '014830', '460870',
    '004020', '010130', '011200', '352820', '259960', '036570', '097950', '003230',
    // 미국 빅테크 · AI · 배당 인기 검색주
    'NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AVGO', 'AMD', 'PLTR',
    'ARM', 'ASML', 'TSM', 'NFLX', 'COST', 'BRK-B', 'LLY', 'UNH', 'JPM', 'V',
    'QQQ', 'SPY', 'SOXL', 'TQQQ', 'SCHD', 'JEPI'
];

const ALL_THEME_SLUGS = [
    'ai', 'secondary-battery', 'robot', 'semiconductor', 'superconductor',
    'low-pbr', 'defense', 'entertainment', 'bio', 'ecommerce',
    'shipbuilding', 'metaverse', 'nuclear', 'cloud', 'gaming',
    'webtoon', 'beauty', 'healthcare', 'aviation', 'food'
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://stock-trend-program.co.kr';
    const now = new Date();
    
    // 1. 핵심 서비스 및 리서치 페이지 (구글 최우선 색인 대상)
    const routes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}`,
            lastModified: now,
            changeFrequency: 'hourly',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/research`,
            lastModified: now,
            changeFrequency: 'hourly',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/directory`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/guide`,
            lastModified: now,
            changeFrequency: 'daily',
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
            url: `${baseUrl}/post`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/theme`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/signals`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/discovery`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/analysis`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/etf`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/emerging`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/calculator`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/ranking`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/calendar`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/earnings`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/supply-chain`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/disclaimer`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.6,
        },
    ];

    // 2. 20대 핵심 주식 테마 대장주·수혜주 분석 페이지
    ALL_THEME_SLUGS.forEach((slug) => {
        routes.push({
            url: `${baseUrl}/theme/${slug}`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        });
    });

    // 3. 검색 유입 최상위 국내·미국 대표 종목 상세 분석 페이지 (/stock/[ticker])
    CORE_SEO_TICKERS.forEach((ticker) => {
        routes.push({
            url: `${baseUrl}/stock/${encodeURIComponent(ticker)}`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.92,
        });
    });

    // 4. 46대 주식 교육 전문 가이드
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
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.9,
        });
    });

    // 5. 고품질 정적 SEO 블로그 포스트
    STATIC_POSTS.forEach((post) => {
        routes.push({
            url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
            lastModified: new Date(post.createdAt),
            changeFrequency: 'weekly',
            priority: 0.9,
        });
    });

    const frontendApiUrl = baseUrl;

    // 6. 실시간 블로그·이론·SEO 칼럼 및 오늘의 증권사 리포트 기안 종목 동적 추가
    try {
        const fetchWithFastTimeout = async (url: string, timeoutMs: number = 5000) => {
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

        const [blogData, theoryData, seoData] = await Promise.all([
            fetchWithFastTimeout(`${frontendApiUrl}/api/blog/posts?page=1&limit=50`),
            fetchWithFastTimeout(`${frontendApiUrl}/api/theory/posts?page=1&limit=70`),
            fetchWithFastTimeout(`${frontendApiUrl}/api/seo_posts?page=1&limit=100`),
        ]);

        if (blogData?.status === 'ok' && Array.isArray(blogData.posts)) {
            const seenBlogSlugs = new Set<string>();
            blogData.posts.forEach((post: any) => {
                const slug = String(post.slug || post.id || '');
                if (slug && seenBlogSlugs.size < 45 && !seenBlogSlugs.has(slug)) {
                    seenBlogSlugs.add(slug);
                    routes.push({
                        url: `${baseUrl}/blog/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt || Date.now()),
                        changeFrequency: 'daily',
                        priority: 0.9,
                    });
                }
            });
        }

        if (theoryData?.status === 'ok' && Array.isArray(theoryData.posts)) {
            theoryData.posts.slice(0, 60).forEach((post: any) => {
                const slug = post.slug || post.id;
                if (slug) {
                    routes.push({
                        url: `${baseUrl}/theory/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt || Date.now()),
                        changeFrequency: 'daily',
                        priority: 0.9,
                    });
                }
            });
        }

        if (seoData?.status === 'ok' && Array.isArray(seoData.posts)) {
            seoData.posts.slice(0, 60).forEach((post: any) => {
                const slug = post.slug || post.id;
                if (slug) {
                    routes.push({
                        url: `${baseUrl}/post/${encodeURIComponent(slug)}`,
                        lastModified: new Date(post.createdAt || Date.now()),
                        changeFrequency: 'daily',
                        priority: 0.85,
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
