import { db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const decodedId = decodeURIComponent(params.id);
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
