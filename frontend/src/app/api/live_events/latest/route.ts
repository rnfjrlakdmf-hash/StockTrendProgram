import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        if (!admin.apps.length) {
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
