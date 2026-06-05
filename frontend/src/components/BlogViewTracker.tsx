"use client";

import { useEffect, useRef } from "react";

export default function BlogViewTracker({ id }: { id: string }) {
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!hasFetched.current) {
            hasFetched.current = true;
            // API 호출로 서버/DB의 조회수 1 증가 (ISR 캐시 우회)
            fetch(`/api/blog/${id}/view`, { method: "POST" })
                .catch(err => console.error("조회수 증가 호출 실패:", err));
        }
    }, [id]);

    return null;
}
