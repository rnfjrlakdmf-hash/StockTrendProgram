import { API_BASE_URL } from '@/lib/config';

export const revalidate = 3600; // 1 hour caching for RSS

export async function GET() {
    let posts = [];
    try {
        const res = await fetch(`${API_BASE_URL}/api/blog/posts?page=1&limit=20`, { next: { revalidate: 3600 } });
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                posts = data.posts;
            }
        }
    } catch (e) {
        console.error("Failed to fetch posts for RSS:", e);
    }

    const baseUrl = 'https://stock-trend-program.co.kr';

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>스마트 투자 비서 | AI 마켓 리포트</title>
    <link>${baseUrl}</link>
    <description>매일 아침 배달되는 국내 및 미국 증시 AI 시황 리포트와 주가 급등락 분석</description>
    <language>ko-KR</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

    posts.forEach((post: any) => {
        const slug = post.slug || post.id;
        const postUrl = `${baseUrl}/blog/${encodeURIComponent(slug)}`;
        // Strip HTML tags for description if needed, or put them in CDATA.
        // We'll just put the raw content inside CDATA for content:encoded if we want full HTML,
        // but for a standard description, stripping is safer or just use CDATA.
        
        rss += `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
      <description><![CDATA[${post.content.substring(0, 500)}...]]></description>
    </item>`;
    });

    rss += `
  </channel>
</rss>`;

    return new Response(rss, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
    });
}
