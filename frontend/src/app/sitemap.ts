import { MetadataRoute } from 'next';

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
            url: `${baseUrl}/supply-chain`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/portfolio`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/guide/ai-investing`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/guide/supply-chain-analysis`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/guide/risk-management`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
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
            url: `${baseUrl}/privacy-policy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
    ];

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://13.209.99.170:8000';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
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
        const timeoutId = setTimeout(() => controller.abort(), 5000);
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

    return routes;
}
