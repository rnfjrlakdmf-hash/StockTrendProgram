"use client";

import React, { useEffect, useRef } from 'react';

export default function TradingViewIndicesWidget() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up previous script elements to avoid duplicate rendering on hot reload
        containerRef.current.innerHTML = '';

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
        script.type = "text/javascript";
        script.async = true;
        
        const widgetConfig = {
            "colorTheme": "dark",
            "dateRange": "12M",
            "showChart": true,
            "locale": "ko",
            "largeChartUrl": "",
            "isTransparent": true,
            "showSymbolLogo": true,
            "showFloatingTooltip": false,
            "width": "100%",
            "height": 280,
            "tabs": [
                {
                    "title": "글로벌 지수",
                    "symbols": [
                        {
                            "proName": "FOREXCOM:SPXUSD",
                            "title": "S&P 500"
                        },
                        {
                            "proName": "FOREXCOM:NSXUSD",
                            "title": "Nasdaq 100"
                        },
                        {
                            "proName": "FOREXCOM:DJI",
                            "title": "Dow 30"
                        },
                        {
                            "proName": "INDEX:NKY",
                            "title": "Nikkei 225"
                        },
                        {
                            "proName": "INDEX:DEU40",
                            "title": "DAX Index"
                        }
                    ]
                }
            ]
        };

        script.innerHTML = JSON.stringify(widgetConfig);
        containerRef.current.appendChild(script);
    }, []);

    return (
        <div className="bg-[#1c1c1e]/40 backdrop-blur-md rounded-2xl border border-white/5 flex flex-col h-full overflow-hidden transition-all hover:border-white/10 shadow-lg min-h-[330px]">
            <div className="flex justify-between items-center p-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                        <polyline points="16 7 22 7 22 13" />
                    </svg>
                    <span className="tracking-tight">글로벌 지수 (TradingView)</span>
                </h4>
                <span className="text-[7px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-sm font-black border border-blue-500/30 animate-pulse">
                    LIVE CHART
                </span>
            </div>
            <div className="flex-1 p-2 bg-black/10">
                <div className="tradingview-widget-container w-full h-full" ref={containerRef}>
                    <div className="tradingview-widget-container__widget w-full h-full"></div>
                </div>
            </div>
        </div>
    );
}
