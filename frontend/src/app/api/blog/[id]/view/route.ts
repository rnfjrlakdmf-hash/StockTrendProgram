import { db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const decodedId = decodeURIComponent(resolvedParams.id);
        const docRef = doc(db, "blog_posts", decodedId);
        await updateDoc(docRef, {
            viewCount: increment(1)
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("View count update error:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
