import { NextRequest, NextResponse } from 'next/server';

// ✅ Vercel 타임아웃 60초 설정
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BACKEND_URL = 'http://13.209.99.170.nip.io';


async function proxyRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }, method: string) {
    const params = await context.params;
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[API-Proxy] ${method} ${targetUrl}`);

    const proxyHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    
    // 포워딩할 헤더 목록
    const headersToForward = ['x-admin-key', 'authorization', 'x-user-id'];
    for (const h of headersToForward) {
        const val = request.headers.get(h);
        if (val) proxyHeaders[h] = val;
    }
    console.log(`[API-Proxy] Forwarded X-User-ID:`, proxyHeaders['x-user-id'] || 'None');

    try {
        let body = undefined;
        if (method !== 'GET' && method !== 'HEAD') {
            body = await request.text().catch(() => null);
        }

        const response = await fetch(targetUrl, {
            method,
            headers: proxyHeaders,
            body: body || undefined,
            signal: AbortSignal.timeout(55000),
            cache: 'no-store',
        });

        const data = await response.json().catch(() => null);
        return NextResponse.json(data || {}, {
            status: response.status,
            headers: {
                'Cache-Control': 'no-store, no-cache',
                'X-Proxy-By': 'next-api-route-60s',
            },
        });
    } catch (error: any) {
        console.error(`[API-Proxy] ${method} Error for ${targetUrl}:`, error?.message);
        return NextResponse.json(
            { status: 'error', message: `서버 연결 실패: ${error?.message}` },
            { status: 503 }
        );
    }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, ctx, 'GET');
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, ctx, 'POST');
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, ctx, 'DELETE');
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, ctx, 'PUT');
}
