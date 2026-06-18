import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel 서버사이드에서 Firestore Admin SDK로 직접 live_events를 읽어 반환
export async function GET() {
    try {
        // Firebase Admin 동적 임포트 (서버사이드 전용)
        const admin = await import('firebase-admin');
        
        if (!admin.apps.length) {
            // 환경변수에서 서비스 계정 정보 파싱
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}'
            );
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }

        const db = admin.firestore();
        const snapshot = await db
            .collection('live_events')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ status: 'success', data: null });
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        const ts = data.timestamp;
        const tsMillis = ts && ts.toMillis ? ts.toMillis() : null;

        return NextResponse.json({
            status: 'success',
            data: {
                id: doc.id,
                corp: data.corp,
                title: data.title,
                code: data.code,
                timestamp: tsMillis,
            },
        });
    } catch (e: any) {
        console.error('[live_events/latest] Error:', e);
        return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
    }
}
