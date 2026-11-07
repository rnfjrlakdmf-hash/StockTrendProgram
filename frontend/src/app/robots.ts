import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stock-trend-program.co.kr';
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/ceo-office',
                    '/private/',
                    '/api/analysis/',
                    '/api/market/ceo-office',
                    '/login',
                    '/auth/',
                    '/watchlist',
                    '/portfolio',
                    '/alerts',
                    '/settings',
                ],
            },
            {
                userAgent: ['Mediapartners-Google', 'AdsBot-Google', 'AdsBot-Google-Mobile'],
                allow: '/',
            },
            {
                userAgent: ['Googlebot', 'Yeti', 'Bingbot'],
                allow: '/',
                disallow: [
                    '/admin/',
                    '/ceo-office',
                    '/private/',
                    '/login',
                    '/auth/',
                    '/watchlist',
                    '/portfolio',
                    '/alerts',
                    '/settings',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
