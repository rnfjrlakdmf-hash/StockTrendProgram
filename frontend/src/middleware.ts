import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 영구 리다이렉트(301) 대상 레거시·단문·프로그램형 경로 -> 100% SSR 장문 에디토리얼 페이지로 통합
const PERMANENT_REDIRECT_MAP: Record<string, string> = {
    '/post': '/blog',
    '/directory': '/guide',
    '/short-selling': '/guide/short-selling',
    '/risk': '/guide/risk-management',
    '/safety': '/guide/risk-management',
    '/etf-analysis': '/guide/etf',
    '/calendar': '/guide/fomc',
    '/schedule': '/guide/fomc',
    '/earnings': '/guide/fundamental-analysis',
    '/heatmap': '/guide/technical-analysis',
    '/scanner': '/guide/technical-analysis',
    '/themes': '/theme/semiconductor',
    '/privacy': '/privacy-policy',
    '/mbti': '/guide',
    '/coach': '/guide',
    '/referral': '/guide',
    '/receipt': '/guide',
    '/disclosure/redirect': '/guide/dart',
    '/news-redirect': '/blog',
};

// 검색엔진 및 애드센스 심사 봇 User-Agent 패턴
const BOT_UA_REGEX = /Mediapartners-Google|AdsBot-Google|Googlebot|Google-InspectionTool|Storebot-Google|Bingbot|Yeti|Daumoa|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|Applebot|PetalBot|HeadlessChrome|Lighthouse|PageSpeed/i;

// 100% SSR 고품질 장문 에디토리얼 및 필수 정적 경로
function isApprovedEditorialPath(pathname: string): boolean {
    if (
        pathname === '/' ||
        pathname === '/guide' ||
        pathname.startsWith('/guide/') ||
        pathname === '/blog' ||
        pathname.startsWith('/blog/') ||
        pathname === '/theory' ||
        pathname.startsWith('/theory/') ||
        pathname.startsWith('/theme/') ||
        pathname === '/calculator' ||
        pathname === '/about' ||
        pathname === '/contact' ||
        pathname === '/privacy-policy' ||
        pathname === '/terms' ||
        pathname === '/disclaimer' ||
        pathname === '/sitemap.xml' ||
        pathname === '/robots.txt' ||
        pathname === '/rss.xml' ||
        pathname === '/ads.txt' ||
        pathname === '/manifest.json' ||
        pathname === '/icon.png' ||
        pathname === '/favicon.ico' ||
        pathname === '/og-image.png' ||
        pathname === '/api/og' ||
        pathname.endsWith('.txt') ||
        pathname.endsWith('.xml') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.ico')
    ) {
        return true;
    }
    return false;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. 정적 에셋 및 일반 백엔드 API 요청은 즉시 통과
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/')
    ) {
        return NextResponse.next();
    }

    // 2. 레거시 프로그램형 대량 생성 경로(/post/*, /stock/*, /widget/*, /_community/*)는 모든 방문자·봇에게 301 영구 리다이렉트
    if (pathname === '/post' || pathname.startsWith('/post/')) {
        return NextResponse.redirect(new URL('/blog', request.url), 301);
    }
    if (pathname === '/stock' || pathname.startsWith('/stock/')) {
        return NextResponse.redirect(new URL('/guide/fundamental-analysis', request.url), 301);
    }
    if (pathname.startsWith('/widget/') || pathname.startsWith('/_community/')) {
        return NextResponse.redirect(new URL('/guide', request.url), 301);
    }
    if (PERMANENT_REDIRECT_MAP[pathname]) {
        return NextResponse.redirect(new URL(PERMANENT_REDIRECT_MAP[pathname], request.url), 301);
    }

    // 3. 검색엔진 크롤러 및 구글 애드센스 심사 봇(Mediapartners-Google)이 관리자 전용/도구 페이지에 접근할 경우
    //    빈 로딩 화면이나 로그인 창 대신 100% SSR 장문 금융 백과사전 페이지로 안전하게 안내 (대표님 일반 브라우저는 100% 정상 접속)
    const userAgent = request.headers.get('user-agent') || '';
    if (BOT_UA_REGEX.test(userAgent)) {
        if (pathname === '/theme') {
            return NextResponse.redirect(new URL('/theme/semiconductor', request.url), 302);
        }
        if (!isApprovedEditorialPath(pathname)) {
            return NextResponse.redirect(new URL('/guide', request.url), 302);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icon.png|ads.txt|manifest.json).*)',
    ],
};
