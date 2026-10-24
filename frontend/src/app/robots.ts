import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stock-trend-program.co.kr';
    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/ceo-office',
                    '/stock/',
                    '/theme/',
                    '/directory',
                    '/research',
                    '/blog/',
                    '/guide/',
                    '/theory/',
                    '/post/',
                ],
                disallow: [
                    '/admin/',
                    '/private/',
                    '/api/analysis/',
                    '/login',
                    '/auth/',
                    '/disclosure/redirect',
                    '/news-redirect',
                    '/widget/',
                    '/receipt',
                ],
            },
            {
                userAgent: 'Mediapartners-Google',
                allow: '/',
                disallow: ['/admin/', '/login', '/auth/'],
            },
            {
                userAgent: ['Googlebot', 'Yeti', 'Bingbot'],
                allow: '/',
                disallow: ['/admin/', '/private/', '/login', '/auth/'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
