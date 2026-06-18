import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        if (!getApps().length) {
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}'
            );
            initializeApp({
                credential: cert(serviceAccount),
            });
        }

        const db = getFirestore();
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
