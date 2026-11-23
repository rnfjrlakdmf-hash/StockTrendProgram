import { MetadataRoute } from 'next';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { FALLBACK_ECONOMICS_POSTS } from '@/lib/economicsFallback';
import { API_BASE_URL } from '@/lib/config';

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

async function fetchJsonSafe(url: string): Promise<any | null> {
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { next: { revalidate: 3600 }, signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://stock-trend-program.co.kr';
    const apiBase = API_BASE_URL || 'http://127.0.0.1:8000';
    const now = new Date();

    // 1. 핵심 에디토리얼·금융 아카데미·신뢰성 정책 페이지 (100% SSR 고품질 콘텐츠)
    const routes: MetadataRoute.Sitemap = [
        { url: `${baseUrl}`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/economics`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
        { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
        { url: `${baseUrl}/theory`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
        { url: `${baseUrl}/guide`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
        { url: `${baseUrl}/calculator`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
        { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
        { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
        { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
        { url: `${baseUrl}/disclaimer`, lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    ];

    // 2. 46대 주식 투자 필수 금융 백과사전 가이드 (전 종목 심층 SSR 콘텐츠)
    ALL_GUIDE_SLUGS.forEach((slug) => {
        routes.push({
            url: `${baseUrl}/guide/${slug}`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.9,
        });
    });

    // 3. 20대 핵심 산업·섹터 밸류체인 리서치 페이지
    ALL_THEME_SLUGS.forEach((slug) => {
        routes.push({
            url: `${baseUrl}/theme/${slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.88,
        });
    });

    // 4. 정적 오리지널 칼럼 분할 등록 (/blog: 0~12, /theory: 13~끝 — 중복 0%)
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

    // 5. 동적 발행 에디토리얼 글 (1일 1경제학, 최신 마켓 리서치 칼럼, 차트 스터디) 자동 반영
    const [econData, blogData, theoryData] = await Promise.all([
        fetchJsonSafe(`${apiBase}/api/economics/posts?page=1&limit=100`),
        fetchJsonSafe(`${apiBase}/api/blog/posts?page=1&limit=60`),
        fetchJsonSafe(`${apiBase}/api/theory/posts?page=1&limit=60`),
    ]);

    // 5-1. 매일 1일 1경제학 공부방 (전편 포함)
    const econList = (econData?.status === 'ok' && Array.isArray(econData.posts) && econData.posts.length > 0)
        ? econData.posts
        : FALLBACK_ECONOMICS_POSTS;
    econList.forEach((p: any) => {
        const slug = String(p.slug || p.id || '').trim();
        if (!slug) return;
        routes.push({
            url: `${baseUrl}/economics/${encodeURIComponent(slug)}`,
            lastModified: p.createdAt ? new Date(p.createdAt) : now,
            changeFrequency: 'monthly',
            priority: 0.92,
        });
    });

    // 5-2. 최신 마켓 리서치 칼럼 (제목 앞 20자 기준 중복 제거, 최대 40편)
    if (blogData?.status === 'ok' && Array.isArray(blogData.posts)) {
        const seenBlogTitles = new Set<string>();
        let added = 0;
        for (const p of blogData.posts) {
            if (added >= 40) break;
            const slug = String(p.slug || p.id || '').trim();
            const title = String(p.title || '').trim();
            if (!slug || !title) continue;
            if (slug.includes('daily-research') || slug.includes('mass-') || slug.includes('seo-')) continue;
            const titleKey = title.replace(/\s+/g, '').slice(0, 22);
            if (seenBlogTitles.has(titleKey)) continue;
            seenBlogTitles.add(titleKey);
            routes.push({
                url: `${baseUrl}/blog/${encodeURIComponent(slug)}`,
                lastModified: p.createdAt ? new Date(p.createdAt) : now,
                changeFrequency: 'weekly',
                priority: 0.85,
            });
            added += 1;
        }
    }

    // 5-3. 최신 차트·재무 아카데미 강의 (중복 제거, 최대 40편)
    if (theoryData?.status === 'ok' && Array.isArray(theoryData.posts)) {
        const seenTheoryTitles = new Set<string>();
        let added = 0;
        for (const p of theoryData.posts) {
            if (added >= 40) break;
            const slug = String(p.slug || p.id || '').trim();
            const title = String(p.title || '').trim();
            if (!slug || !title) continue;
            const titleKey = title.replace(/\s+/g, '').slice(0, 22);
            if (seenTheoryTitles.has(titleKey)) continue;
            seenTheoryTitles.add(titleKey);
            routes.push({
                url: `${baseUrl}/theory/${encodeURIComponent(slug)}`,
                lastModified: p.createdAt ? new Date(p.createdAt) : now,
                changeFrequency: 'monthly',
                priority: 0.85,
            });
            added += 1;
        }
    }

    // 최종 URL 중복 제거
    const seenUrls = new Set<string>();
    return routes.filter((r) => {
        if (seenUrls.has(r.url)) return false;
        seenUrls.add(r.url);
        return true;
    });
}
