import { API_BASE_URL } from '@/lib/config';

export const revalidate = 1800; // 30분마다 최신 시황 칼럼 반영

export async function GET() {
    let posts: any[] = [];

    try {
        const blogRes = await fetch(`${API_BASE_URL}/api/blog/posts?page=1&limit=25`, {
            next: { revalidate: 1800 },
            signal: AbortSignal.timeout(4000)
        }).catch(() => null);

        if (blogRes && blogRes.ok) {
            const data = await blogRes.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                posts = data.posts;
            }
        }
    } catch (e) {
        console.error("Failed to fetch data for RSS:", e);
    }

    const baseUrl = 'https://stock-trend-program.co.kr';
    const nowUtc = new Date().toUTCString();

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>스마트 투자 비서 | AI 주식 시황 리포트 &amp; 외국인·기관 수급 분석</title>
    <link>${baseUrl}</link>
    <description>매일 업데이트되는 국내 및 미국 증시 AI 시황 리포트, 외국인·기관 수급 분석 및 투자 교육 칼럼</description>
    <language>ko-KR</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${nowUtc}</lastBuildDate>`;

    posts.forEach((post: any) => {
        const slug = post.slug || post.id;
        // 기안서 요약글이 혹시 있더라도 제외
        if (String(slug).includes('daily-research-target-price-report')) return;
        const postUrl = `${baseUrl}/blog/${encodeURIComponent(slug)}`;
        rss += `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${new Date(post.createdAt || Date.now()).toUTCString()}</pubDate>
      <description><![CDATA[${(post.content || '').substring(0, 500)}...]]></description>
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
