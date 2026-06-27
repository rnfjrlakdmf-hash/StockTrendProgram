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
        <div className="bg-[#1c1c1e]/40 backdrop-blur-md rounded-2xl border border-white/5 flex flex-col overflow-hidden transition-all hover:border-white/10 shadow-lg h-full">
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
            <div className="p-0 bg-black/10 w-full flex-1 min-h-[500px]">
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
