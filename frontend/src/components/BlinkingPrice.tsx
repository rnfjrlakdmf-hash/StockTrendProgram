import React, { useEffect, useState, useRef } from 'react';

interface BlinkingPriceProps {
    price: string | number;
    color?: string; // Optional override
    className?: string; // Additional classes
}

export default function BlinkingPrice({ price, color, className = "" }: BlinkingPriceProps) {
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    const prevPriceRef = useRef<string | number>(price);
    const displayPrice = typeof price === 'number' ? price.toLocaleString() : price;

    useEffect(() => {
        const currentRef = prevPriceRef.current;

        // Clean and compare
        const cleanCurrent = parseFloat(String(currentRef).replace(/,/g, ''));
        const cleanNew = parseFloat(String(price).replace(/,/g, ''));

        if (cleanNew > cleanCurrent) {
            setFlash('up');
        } else if (cleanNew < cleanCurrent) {
            setFlash('down');
        } else {
            // No change or Init
            // setFlash(null); // Don't reset eagerly to let animation play
        }

        prevPriceRef.current = price;

        // Auto reset flash after animation duration (e.g. 500ms)
        const timer = setTimeout(() => {
            setFlash(null);
        }, 800);

        return () => clearTimeout(timer);
    }, [price]);

    // Construct class name
    // If flash is active, add background color
    let flashBufferClass = "";
    if (flash === 'up') flashBufferClass = "animate-flash-red text-red-400 bg-red-400/20";
    if (flash === 'down') flashBufferClass = "animate-flash-blue text-blue-400 bg-blue-400/20";

    // Default connection color if no flash, or maintain text color during flash
    // If 'color' prop provided, use it, else deduce from flash or default to white
    // Actually, usually we want the text to stay Red/Blue depending on daily change, 
    // and the BACKGROUND to flash.

    // Combining passed className with flash logic
    // We assume className handles the static text color (e.g. text-red-400)
    // Flash adds background and possibly forces text color if needed.

    return (
        <span
            className={`transition-colors duration-300 px-1.5 py-0.5 rounded ${flashBufferClass} ${className}`}
        >
            {displayPrice}
        </span>
    );
}
