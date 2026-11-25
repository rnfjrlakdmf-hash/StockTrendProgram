import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 영구 리다이렉트(301) 대상 레거시·중복 경로 -> 정규 에디토리얼 경로로 일관 통합 (모든 방문자·크롤러 동일 처리, 클로킹 없음)
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

// 검색엔진 색인 제외(noindex) 대상: 실시간 인터랙티브 도구 · 개인화 대시보드 · 관리자 전용 페이지
// 모든 사용자와 검색 봇에게 동일한 콘텐츠를 제공하되, X-Robots-Tag 헤더로 색인 대상만 정석 분리합니다.
const NOINDEX_PREFIXES = [
    '/admin',
    '/ceo-office',
    '/login',
    '/auth',
    '/watchlist',
    '/portfolio',
    '/alerts',
    '/settings',
    '/signals',
    '/discovery',
    '/pattern',
    '/analysis',
    '/supply-chain',
    '/etf',
    '/emerging',
    '/premium',
    '/weekend-report',
    '/weekend-whale',
    '/research',
    '/ranking',
    '/stock',
];

function shouldNoIndex(pathname: string): boolean {
    if (pathname === '/theme') return true;
    return NOINDEX_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. 정적 에셋 및 API 요청은 즉시 통과
    if (pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // 2. 레거시·중복 경로는 모든 방문자 및 검색엔진에 동일하게 301 영구 리다이렉트
    if (pathname === '/post' || pathname.startsWith('/post/')) {
        return NextResponse.redirect(new URL('/blog', request.url), 301);
    }
    if (pathname.startsWith('/widget/') || pathname.startsWith('/_community/')) {
        return NextResponse.redirect(new URL('/guide', request.url), 301);
    }
    if (PERMANENT_REDIRECT_MAP[pathname]) {
        return NextResponse.redirect(new URL(PERMANENT_REDIRECT_MAP[pathname], request.url), 301);
    }

    // 3. 인터랙티브 데이터 도구·개인화·관리자 경로에는 표준 X-Robots-Tag: noindex, nofollow 헤더만 부여
    //    (User-Agent별 리다이렉트/클로킹 완전 제거 — 모든 에디토리얼 경로 /economics, /blog, /theory, /guide, /theme/* 는 정상 200 응답)
    const response = NextResponse.next();
    if (shouldNoIndex(pathname)) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icon.png|ads.txt|manifest.json).*)',
    ],
};
