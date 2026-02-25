"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShortSellingRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace("/signals"); }, [router]);
    return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 text-sm">공매도 페이지로 이동 중...</div>;
}
