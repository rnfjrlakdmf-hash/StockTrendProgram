import { NextRequest, NextResponse } from 'next/server';

// ✅ Vercel 타임아웃을 60초로 늘림 (기본 10초 → 60초)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const BACKEND_URL = 'http://13.209.99.170.nip.io';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'Content-Type': 'application/json',
            },
            // 서버사이드에서 호출하므로 CORS 문제 없음, 55초 타임아웃
            signal: AbortSignal.timeout(55000),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error(`[API-Proxy] Error for ${targetUrl}:`, error);
        return NextResponse.json(
            { status: 'error', message: '서버 연결에 실패했습니다.' },
            { status: 503 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

    try {
        const body = await request.json().catch(() => null);
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(55000),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error(`[API-Proxy] POST Error for ${targetUrl}:`, error);
        return NextResponse.json(
            { status: 'error', message: '서버 연결에 실패했습니다.' },
            { status: 503 }
        );
    }
}
