import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stocktrend-production.up.railway.app';
    
    return [
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
}
