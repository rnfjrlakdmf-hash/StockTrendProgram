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
                disallow: ['/admin/', '/ceo-office', '/login', '/auth/'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
