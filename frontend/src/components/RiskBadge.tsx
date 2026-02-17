"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Shield, AlertCircle, CheckCircle, TrendingDown, FileText, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface RiskFactor {
    type: string;
    severity: string;
    description: string;
}

interface RiskData {
    symbol: string;
    company_name: string;
    risk_score: number;
    risk_level: string;
    risk_factors: RiskFactor[];
    recommendation: string;
    analyzed_at: string;
}

interface DetailedReport {
    risk_analysis: RiskData;
    news_risk: {
        factors: RiskFactor[];
        score: number;
    };
    total_risk_score: number;
    detailed_report: string;
    ai_analysis: string;
    recent_news: any[];
}

interface RiskBadgeProps {
    symbol: string;
    autoLoad?: boolean;
}

export default function RiskBadge({ symbol, autoLoad = true }: RiskBadgeProps) {
    const [riskData, setRiskData] = useState<RiskData | null>(null);
    const [detailedReport, setDetailedReport] = useState<DetailedReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (autoLoad && symbol) {
            loadRiskData();
        }
    }, [symbol, autoLoad]);

    const loadRiskData = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/risk/${symbol}`);
            const data = await res.json();

            if (data.status === "success") {
                setRiskData(data.data);
            } else {
                setError(data.message || "위험도 분석 실패");
            }
        } catch (e) {
            setError("서버 연결 실패");
        } finally {
            setLoading(false);
        }
    };

    const loadDetailedReport = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/risk/${symbol}/report`);
            const data = await res.json();

            if (data.status === "success") {
                setDetailedReport(data.data);
                setShowModal(true);
            } else {
                setError(data.message || "상세 리포트 로드 실패");
            }
        } catch (e) {
            setError("서버 연결 실패");
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level: string) => {
        const colors: Record<string, string> = {
            "안전": "bg-green-500/20 border-green-500/50 text-green-400",
            "주의": "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
            "위험": "bg-orange-500/20 border-orange-500/50 text-orange-400",
            "매우 위험": "bg-red-500/20 border-red-500/50 text-red-400"
        };
        return colors[level] || "bg-gray-500/20 border-gray-500/50 text-gray-400";
    };

    const getRiskIcon = (level: string) => {
        if (level === "안전") return <CheckCircle className="w-5 h-5" />;
        if (level === "주의") return <AlertCircle className="w-5 h-5" />;
        if (level === "위험") return <AlertTriangle className="w-5 h-5" />;
        return <AlertTriangle className="w-5 h-5" />;
    };

    const getRiskEmoji = (level: string) => {
        const emojis: Record<string, string> = {
            "안전": "🟢",
            "주의": "🟡",
            "위험": "🟠",
            "매우 위험": "🔴"
        };
        return emojis[level] || "⚪";
    };

    const getSeverityColor = (severity: string) => {
        if (severity === "고") return "text-red-400";
        if (severity === "중") return "text-yellow-400";
        return "text-gray-400";
    };

    if (loading && !riskData) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-sm text-gray-400">위험도 분석 중...</span>
            </div>
        );
    }

    if (error && !riskData) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
            </div>
        );
    }

    if (!riskData) return null;

    return (
        <>
            {/* Risk Badge */}
            <div className={`border rounded-xl p-4 ${getRiskColor(riskData.risk_level)}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {getRiskIcon(riskData.risk_level)}
                        <span className="font-bold text-lg">
                            {getRiskEmoji(riskData.risk_level)} {riskData.risk_level}
                        </span>
                    </div>
                    <div className="text-2xl font-bold font-mono">
                        {riskData.risk_score}/100
                    </div>
                </div>

                <p className="text-sm mb-3">{riskData.recommendation}</p>

                {/* Risk Factors Preview */}
                {riskData.risk_factors.length > 0 && (
                    <div className="space-y-1 mb-3">
                        <p className="text-xs font-bold opacity-70">주요 위험 요인:</p>
                        {riskData.risk_factors.slice(0, 3).map((factor, idx) => (
                            <div key={idx} className="text-xs flex items-start gap-2">
                                <span className={getSeverityColor(factor.severity)}>•</span>
                                <span className="opacity-80">{factor.description}</span>
                            </div>
                        ))}
                        {riskData.risk_factors.length > 3 && (
                            <p className="text-xs opacity-60">외 {riskData.risk_factors.length - 3}개</p>
                        )}
                    </div>
                )}

                {/* Detailed Report Button */}
                <button
                    onClick={loadDetailedReport}
                    disabled={loading}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-4 py-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            로딩 중...
                        </>
                    ) : (
                        <>
                            <FileText className="w-4 h-4" />
                            정밀 진단 리포트 보기
                        </>
                    )}
                </button>
            </div>

            {/* Detailed Report Modal */}
            {showModal && detailedReport && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <Shield className="w-6 h-6 text-blue-400" />
                                <h2 className="text-2xl font-bold text-white">정밀 진단 리포트</h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-all"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Total Risk Score */}
                            <div className={`border rounded-xl p-6 ${getRiskColor(detailedReport.risk_analysis.risk_level)}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">
                                            {getRiskEmoji(detailedReport.risk_analysis.risk_level)} 종합 위험도
                                        </h3>
                                        <p className="text-sm opacity-80">{detailedReport.risk_analysis.company_name}</p>
                                    </div>
                                    <div className="text-5xl font-bold font-mono">
                                        {detailedReport.total_risk_score}
                                    </div>
                                </div>
                            </div>

                            {/* AI Analysis */}
                            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <TrendingDown className="w-5 h-5 text-purple-400" />
                                    AI 분석
                                </h3>
                                <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                                    {detailedReport.ai_analysis}
                                </div>
                            </div>

                            {/* Risk Factors */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h3 className="text-white font-bold mb-4">위험 요인 상세</h3>
                                <div className="space-y-3">
                                    {detailedReport.risk_analysis.risk_factors.map((factor, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-black/30 rounded-lg">
                                            <span className={`text-lg ${getSeverityColor(factor.severity)}`}>
                                                {factor.severity === "고" ? "🔴" : factor.severity === "중" ? "🟡" : "🟢"}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">{factor.type}</p>
                                                <p className="text-white">{factor.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent News */}
                            {detailedReport.recent_news && detailedReport.recent_news.length > 0 && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <h3 className="text-white font-bold mb-4">최근 뉴스</h3>
                                    <div className="space-y-2">
                                        {detailedReport.recent_news.map((news, idx) => (
                                            <a
                                                key={idx}
                                                href={news.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-all"
                                            >
                                                <p className="text-white text-sm">{news.title}</p>
                                                <p className="text-gray-400 text-xs mt-1">{news.source}</p>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
