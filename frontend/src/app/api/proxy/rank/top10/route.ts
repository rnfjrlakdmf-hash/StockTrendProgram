import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config';

// 30초 동안 Vercel Edge Cache에 응답을 저장 (빠른 변동성 반영)
export const revalidate = 30;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const market = searchParams.get('market') || 'KR';
        
        const res = await fetch(`${API_BASE_URL}/api/market/rank/top10/${market}`);
        
        if (!res.ok) {
            return NextResponse.json({ status: 'error', message: 'Failed to fetch from backend' }, { status: res.status });
        }
        
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
