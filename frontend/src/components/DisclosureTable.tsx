"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";

// Disclosure Table Component
function DisclosureTable({ symbol }: { symbol: string }) {
    const [disclosures, setDisclosures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDisclosures = async () => {
            console.log('[DisclosureTable] Starting fetch for symbol:', symbol);
            try {
                // Extract clean code (remove .KS, .KQ suffixes)
                const cleanSymbol = symbol.replace('.KS', '').replace('.KQ', '');
                console.log('[DisclosureTable] Clean symbol:', cleanSymbol);

                const url = `${API_BASE_URL}/api/stock/${encodeURIComponent(cleanSymbol)}/disclosures`;
                console.log('[DisclosureTable] Fetching URL:', url);
                console.log('[DisclosureTable] API_BASE_URL:', API_BASE_URL);

                const res = await fetch(url);
                console.log('[DisclosureTable] Response status:', res.status);

                const json = await res.json();
                console.log('[DisclosureTable] Response JSON:', json);

                if (json.status === "success" && json.data) {
                    console.log('[DisclosureTable] ✅ Setting disclosures, count:', json.data.length);
                    setDisclosures(json.data);
                } else {
                    console.warn('[DisclosureTable] ⚠️ No data or failed status:', json);
                    setDisclosures([]);
                }
            } catch (err) {
                console.error("[DisclosureTable] ❌ Fetch error:", err);
                setDisclosures([]);
            } finally {
                setLoading(false);
            }
        };

        if (symbol) {
            console.log('[DisclosureTable] Symbol provided, fetching...');
            fetchDisclosures();
        } else {
            console.log('[DisclosureTable] No symbol provided');
            setDisclosures([]);
            setLoading(false);
        }
    }, [symbol]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">공시 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                📝 최근 공시 내역 (DART)
            </h3>

            {disclosures && disclosures.length > 0 ? (
                <div className="space-y-3">
                    {disclosures.map((disclosure: any, idx: number) => (
                        <a
                            key={idx}
                            href={disclosure.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-xl p-4 transition-all"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                                        {disclosure.title}
                                    </h4>
                                    {disclosure.submitter && (
                                        <p className="text-sm text-gray-400 mb-1">
                                            제출인: {disclosure.submitter}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{disclosure.date}</span>
                                        {disclosure.type && (
                                            <>
                                                <span>•</span>
                                                <span className="text-blue-400">{disclosure.type}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-gray-400">최근 공시 내역이 없습니다.</p>
                    <p className="text-sm text-gray-500 mt-2">
                        한국 주식의 경우 DART 공시 정보가 표시됩니다.
                    </p>
                </div>
            )}
        </div>
    );
}

export default DisclosureTable;
