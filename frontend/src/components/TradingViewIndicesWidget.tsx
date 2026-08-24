"use client";

import React from 'react';

export default function TradingViewIndicesWidget() {
    // We use an iframe with srcDoc to completely isolate the TradingView script from React's lifecycle.
    // This is the most bulletproof way to prevent the blank screen/script injection issues in Next.js.
    const iframeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <base target="_blank" />
            <style>
                body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
                .tradingview-widget-container { width: 100%; height: 100%; }
            </style>
        </head>
        <body>
            <div class="tradingview-widget-container">
                <div class="tradingview-widget-container__widget"></div>
                <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js" async>
                {
                    "colorTheme": "dark",
                    "dateRange": "12M",
                    "showChart": true,
                    "locale": "en",
                    "largeChartUrl": "",
                    "isTransparent": true,
                    "showSymbolLogo": true,
                    "showFloatingTooltip": false,
                    "width": "100%",
                    "height": "500",
                    "tabs": [
                        {
                            "title": "글로벌 지수",
                            "symbols": [
                                { "s": "FOREXCOM:SPXUSD", "d": "S&P 500 (미국 대형주 500)" },
                                { "s": "FOREXCOM:NSXUSD", "d": "나스닥 100 (미국 기술주)" },
                                { "s": "FOREXCOM:DJI", "d": "다우 존스 30 (미국 우량 30)" },
                                { "s": "INDEX:NKY", "d": "닛케이 225 (일본 증시)" },
                                { "s": "INDEX:DEU40", "d": "독일 DAX (유럽 증시)" }
                            ]
                        }
                    ]
                }
                </script>
            </div>
        </body>
        </html>
    `;

    return (
        <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-full">
            <div className="bg-zinc-950/80 border-b border-white/10 px-5 py-3.5 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                            <polyline points="16 7 22 7 22 13" />
                        </svg>
                    </div>
                    <span className="font-black text-white text-sm tracking-tight">글로벌 지수 실시간 차트</span>
                </div>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-black border border-blue-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                    LIVE CHART
                </span>
            </div>
            <div className="p-0 bg-black/20 w-full flex-1 min-h-[500px]">
                <iframe
                    srcDoc={iframeHtml}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="TradingView Global Indices"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                />
            </div>
        </div>
    );
}
