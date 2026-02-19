"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck, Lock, Activity, Info } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface RiskItem {
    type: string;
    date: string;
    message: string;
    severity: "High" | "Medium" | "Low";
    symbol: string;
}

interface RiskAlertProps {
    symbols: string[];
}

export default function RiskAlert({ symbols }: RiskAlertProps) {
    const [risks, setRisks] = useState<RiskItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (symbols.length > 0) {
            checkRisks();
        } else {
            setRisks([]);
            setScanned(false);
        }
    }, [symbols]);

    const checkRisks = async () => {
        setLoading(true);
        try {
            // Construct allocation list for API
            const allocation = symbols.map(s => ({ symbol: s, weight: 0 })); // Weight not needed for risk check

            const res = await fetch(`${API_BASE_URL}/api/portfolio/risk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allocation })
            });
            const json = await res.json();

            if (json.status === "success") {
                setRisks(json.risks || []);
            }
        } catch (e) {
            console.error("Risk Fetch Error", e);
        } finally {
            setLoading(false);
            setScanned(true);
        }
    };

    if (!scanned && !loading) return null;

    // Severity Order
    const sortedRisks = [...risks].sort((a, b) => {
        const score = { High: 3, Medium: 2, Low: 1 };
        return score[b.severity] - score[a.severity];
    });

    return (
        <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 flex-1 min-h-[200px] flex flex-col relative overflow-hidden">
            <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center justify-between z-10 relative">
                <span className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${risks.length > 0 ? 'text-red-400' : 'text-green-400'}`} />
                    리스크 레이더 (SEIBRO)
                </span>
                {loading && <Activity className="w-3 h-3 animate-spin text-blue-400" />}
            </h4>

            {/* Background Effect */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 z-0 pointer-events-none 
                ${risks.length > 0 ? 'bg-red-500' : 'bg-green-500'}`} />

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 z-10 relative">
                {loading ? (
                    <div className="text-center py-8 text-xs text-gray-500 animate-pulse">
                        정밀 스캔 중... (보호예수/CB)
                    </div>
                ) : risks.length > 0 ? (
                    sortedRisks.map((risk, i) => (
                        <div key={i} className={`p-3 rounded-xl border flex items-start gap-3 backdrop-blur-sm
                            ${risk.severity === 'High'
                                ? 'bg-red-950/30 border-red-500/30'
                                : 'bg-yellow-900/20 border-yellow-500/20'}`}>

                            <div className={`mt-0.5 p-1 rounded-full shrink-0 
                                ${risk.severity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {risk.type.includes("Lock-up") ? <Lock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-bold ${risk.severity === 'High' ? 'text-red-300' : 'text-yellow-300'}`}>
                                        {risk.symbol} {risk.type}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono">{risk.date}</span>
                                </div>
                                <p className="text-xs text-gray-300 leading-snug">
                                    {risk.message}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-500 gap-2 h-full">
                        <ShieldCheck className="w-10 h-10 opacity-20 text-green-500" />
                        <div className="text-center">
                            <p className="text-sm font-bold text-gray-400">감지된 리스크 없음</p>
                            <p className="text-[10px] text-gray-600">보호예수 및 CB/BW 클린</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Source */}
            <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center z-10 relative">
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Info className="w-3 h-3" /> 본 정보는 한국거래소(KRX) 및 한국예탁결제원(KSD)의 데이터를 활용하였습니다.
                </span>
            </div>
        </div>
    );
}
