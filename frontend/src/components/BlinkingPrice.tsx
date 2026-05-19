import React, { useEffect, useState, useRef } from 'react';

interface BlinkingPriceProps {
    price: string | number;
    color?: string;
    className?: string;
    prefix?: string;   // [v3] 통화 기호 (예: '$', '¥')
}

export default function BlinkingPrice({ price, color, className = "", prefix = "" }: BlinkingPriceProps) {
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    const prevPriceRef = useRef<string | number>(price);
    const displayPrice = typeof price === 'number' ? price.toLocaleString() : price;

    useEffect(() => {
        const currentRef = prevPriceRef.current;

        const cleanCurrent = parseFloat(String(currentRef).replace(/,/g, ''));
        const cleanNew = parseFloat(String(price).replace(/,/g, ''));

        if (cleanNew > cleanCurrent) {
            setFlash('up');
        } else if (cleanNew < cleanCurrent) {
            setFlash('down');
        }

        prevPriceRef.current = price;

        const timer = setTimeout(() => {
            setFlash(null);
        }, 800);

        return () => clearTimeout(timer);
    }, [price]);

    let flashBufferClass = "";
    if (flash === 'up') flashBufferClass = "animate-flash-red text-red-400 bg-red-400/20";
    if (flash === 'down') flashBufferClass = "animate-flash-blue text-blue-400 bg-blue-400/20";

    return (
        <span
            className={`transition-colors duration-300 px-1.5 py-0.5 rounded ${flashBufferClass} ${className}`}
        >
            {prefix && <span className="opacity-70 text-[0.8em] mr-0.5">{prefix}</span>}
            {displayPrice}
        </span>
    );
}
