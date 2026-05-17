"use client";

import { useEffect } from "react";

interface AdBannerProps {
    adClient?: string;
    adSlot: string;
    adFormat?: "auto" | "fluid" | "rectangle";
    fullWidthResponsive?: boolean;
}

/**
 * [v1.0.0] Universal Google AdSense Banner Component
 * Usage: <AdBanner adSlot="YOUR_AD_SLOT_ID" />
 */
export default function AdBanner({ 
    adClient = "ca-pub-9471404163603833", 
    adSlot, 
    adFormat = "auto", 
    fullWidthResponsive = true 
}: AdBannerProps) {
    useEffect(() => {
        // [v1.0.1] Bulletproof dynamic SPA initialization
        // Prevents React Strict Mode double-push mismatch (TagError)
        try {
            const uninitialized = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])');
            if (uninitialized.length > 0) {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (err) {
            console.warn("AdSense push warning (safe fallback):", err);
        }
    }, [adSlot]);

    return (
        <div className="w-full my-6 overflow-hidden rounded-xl bg-white/5 border border-white/10 p-2 text-center">
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-2">Sponsorship</p>
            <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client={adClient}
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidthResponsive.toString()}
            ></ins>
        </div>
    );
}
