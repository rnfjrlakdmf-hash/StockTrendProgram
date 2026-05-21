import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config';

// 60초 동안 Vercel Edge Cache에 응답을 저장 (ISR)
export const revalidate = 60;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const market = searchParams.get('market') || 'KOSPI';
        const category = searchParams.get('category') || 'trading_volume';
        
        // 백엔드(EC2)에서 데이터 가져오기
        const res = await fetch(`${API_BASE_URL}/api/market/rank/global?market=${market}&category=${category}`);
        
        if (!res.ok) {
            return NextResponse.json({ status: 'error', message: 'Failed to fetch from backend' }, { status: res.status });
        }
        
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
