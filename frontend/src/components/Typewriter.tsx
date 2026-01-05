"use client";

import { useEffect, useState } from "react";

interface TypewriterProps {
    text: string;
    speed?: number;
    delay?: number;
    onComplete?: () => void;
}

export default function Typewriter({ text, speed = 10, delay = 0, onComplete }: TypewriterProps) {
    const [displayedText, setDisplayedText] = useState("");
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setStarted(true);
        }, delay);
        return () => clearTimeout(timeout);
    }, [delay]);

    useEffect(() => {
        if (!started) return;

        setDisplayedText(""); // Start fresh
        let i = 0;

        const timer = setInterval(() => {
            if (i >= text.length) {
                clearInterval(timer);
                if (onComplete) onComplete();
                return;
            }

            // i를 1씩 증가시키며 slice로 잘라서 보여줌 (한글 깨짐/중복 방지)
            setDisplayedText(text.slice(0, i + 1));
            i++;
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed, started, onComplete]);

    // 텍스트가 변경되면 초기화
    useEffect(() => {
        setDisplayedText("");
        setStarted(false);
        const timeout = setTimeout(() => {
            setStarted(true);
        }, delay);
        return () => clearTimeout(timeout);
    }, [text, delay]);

    return <span>{displayedText}</span>;
}
