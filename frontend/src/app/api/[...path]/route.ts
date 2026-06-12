import { NextRequest, NextResponse } from 'next/server';

// ✅ Vercel 타임아웃 60초 설정
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BACKEND_URL = 'http://13.209.99.170.nip.io';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[API-Proxy] GET ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(55000),
            cache: 'no-store',
        });

        const data = await response.json();
        return NextResponse.json(data, {
            status: response.status,
            headers: {
                'Cache-Control': 'no-store, no-cache',
                'X-Proxy-By': 'next-api-route-60s',
            },
        });
    } catch (error: any) {
        console.error(`[API-Proxy] Error for ${targetUrl}:`, error?.message);
        return NextResponse.json(
            { status: 'error', message: `서버 연결 실패: ${error?.message}` },
            { status: 503 }
        );
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;
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
            cache: 'no-store',
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error(`[API-Proxy] POST Error for ${targetUrl}:`, error?.message);
        return NextResponse.json(
            { status: 'error', message: `서버 연결 실패: ${error?.message}` },
            { status: 503 }
        );
    }
}
