import { API_BASE_URL } from '@/lib/config';

export const revalidate = 1800; // 30분마다 최신 리서치·시황 반영

export async function GET() {
    let posts: any[] = [];
    let ceoApprovals: any[] = [];

    try {
        const [blogRes, ceoRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/blog/posts?page=1&limit=20`, {
                next: { revalidate: 1800 },
                signal: AbortSignal.timeout(4000)
            }).catch(() => null),
            fetch(`${API_BASE_URL}/api/market/ceo-office`, {
                next: { revalidate: 1800 },
                signal: AbortSignal.timeout(4000)
            }).catch(() => null),
        ]);

        if (blogRes && blogRes.ok) {
            const data = await blogRes.json();
            if (data && data.status === 'ok' && Array.isArray(data.posts)) {
                posts = data.posts;
            }
        }
        if (ceoRes && ceoRes.ok) {
            const ceoData = await ceoRes.json();
            if (ceoData && Array.isArray(ceoData.auto_approvals)) {
                ceoApprovals = ceoData.auto_approvals;
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
    <title>스마트 투자 비서 | 증권사 목표주가 리포트 &amp; 외국인·기관 수급 브리핑</title>
    <link>${baseUrl}</link>
    <description>매일 24시간 업데이트되는 국내 증권사 목표주가 컨센서스, 외국인·기관 수급, 미국 빅테크 및 나스닥 선물·환율 브리핑</description>
    <language>ko-KR</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${nowUtc}</lastBuildDate>`;

    // 1. 오늘의 증권사 리포트 & 수급 분석 기안서 항목들을 RSS 최상단에 자동 피드로 송출
    ceoApprovals.forEach((doc: any) => {
        const code = String(doc.stock_code || '').trim();
        const itemUrl = (code && code !== 'SYSTEM' && !code.includes('='))
            ? `${baseUrl}/stock/${encodeURIComponent(code)}`
            : `${baseUrl}/ceo-office`;
        const title = `[오늘의 리포트] ${doc.stock_name} ${doc.target_price ? `목표주가 ${doc.target_price} (${doc.upside_pct || ''})` : ''} - ${doc.title}`;
        const desc = `${doc.easy_headline || ''} ${doc.research_opinion || ''} ${doc.quant_opinion || ''}`.trim();

        rss += `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${itemUrl}</link>
      <guid isPermaLink="false">ceo-${doc.doc_id}-${new Date().toISOString().slice(0, 10)}</guid>
      <pubDate>${nowUtc}</pubDate>
      <description><![CDATA[${desc}]]></description>
    </item>`;
    });

    // 2. 블로그 마켓 리포트 포스트
    posts.forEach((post: any) => {
        const slug = post.slug || post.id;
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
