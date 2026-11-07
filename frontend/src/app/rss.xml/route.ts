import { API_BASE_URL } from '@/lib/config';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';

export const revalidate = 1800; // 30분마다 최신 시황 칼럼 반영

export async function GET() {
    let dynamicPosts: any[] = [];

    try {
        const blogRes = await fetch(`${API_BASE_URL}/api/blog/posts?page=1&limit=25`, {
            next: { revalidate: 1800 },
            signal: AbortSignal.timeout(3000)
        }).catch(() => null);

        if (blogRes && blogRes.ok) {
            const data = await blogRes.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                dynamicPosts = data.posts.filter((p: any) => {
                    const slug = String(p.slug || p.id || '');
                    const content = String(p.content || '');
                    return !slug.includes('daily-research') && content.length >= 2000;
                });
            }
        }
    } catch (e) {
        console.error("Failed to fetch data for RSS:", e);
    }

    const postMap = new Map<string, any>();
    dynamicPosts.forEach((p) => postMap.set(String(p.slug || p.id), p));
    STATIC_POSTS.forEach((p) => {
        const slug = String(p.slug || p.id);
        if (!postMap.has(slug)) {
            postMap.set(slug, p);
        }
    });

    const posts = Array.from(postMap.values());
    const baseUrl = 'https://stock-trend-program.co.kr';
    const nowUtc = new Date().toUTCString();

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>스마트 투자 비서 | 거시경제 시황 리서치 &amp; 재무제표·차트 아카데미</title>
    <link>${baseUrl}</link>
    <description>한국거래소(KRX)·금융감독원 DART·미국 SEC 공시 데이터를 기반으로 한 심층 시황 칼럼, 46대 금융 지식 백과사전 및 투자 교육 아카데미</description>
    <language>ko-KR</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${nowUtc}</lastBuildDate>`;

    posts.forEach((post: any, idx: number) => {
        const slug = post.slug || post.id;
        const isTheory = idx >= 13 && STATIC_POSTS.slice(13).some((sp) => sp.slug === slug);
        const postUrl = `${baseUrl}/${isTheory ? 'theory' : 'blog'}/${encodeURIComponent(slug)}`;
        const cleanDesc = String(post.content || '')
            .replace(/<[^>]*>?/gm, '')
            .replace(/&nbsp;/g, ' ')
            .trim()
            .substring(0, 500);
        rss += `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${new Date(post.createdAt || Date.now()).toUTCString()}</pubDate>
      <description><![CDATA[${cleanDesc}...]]></description>
    </item>`;
    });

    rss += `
  </channel>
</rss>`;

    return new Response(rss, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 's-maxage=1800, stale-while-revalidate',
        },
    });
}
