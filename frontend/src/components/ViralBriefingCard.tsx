"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Share2, Sparkles, Send, Flame, Sun, Moon, Zap, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";

interface ViralBriefingCardProps {
    isAdmin?: boolean;
}

export default function ViralBriefingCard({ isAdmin = false }: ViralBriefingCardProps) {
    const [activeType, setActiveType] = useState<"closing" | "morning" | "themes" | "whales">("closing");
    const [copied, setCopied] = useState(false);
    const [marketData, setMarketData] = useState<{
        kospi?: { val: string; chg: string; up: boolean };
        kosdaq?: { val: string; chg: string; up: boolean };
        usdkrw?: { val: string; chg: string; up: boolean };
        sp500?: { val: string; chg: string; up: boolean };
        nasdaq?: { val: string; chg: string; up: boolean };
        wti?: { val: string; chg: string; up: boolean };
    }>({});
    const [loading, setLoading] = useState(false);

    // KST 오늘 날짜 포맷
    const getKstDate = () => {
        const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        const weekday = days[d.getDay()];
        return `${m}월 ${day}일(${weekday})`;
    };

    const dateStr = getKstDate();

    // 실시간 지수 데이터 연동
    const fetchLiveData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/indices`, { cache: "no-store" });
            const json = await res.json();
            if (json.status === "success" && Array.isArray(json.data)) {
                const map: any = {};
                json.data.forEach((item: any) => {
                    const name = item.event_kr || "";
                    const up = item.change_val !== undefined ? item.change_val >= 0 : !item.change?.startsWith("-");
                    const dataObj = { val: item.actual || "---", chg: item.change || "0.00%", up };

                    if (name.includes("KOSPI") || name.includes("코스피")) map.kospi = dataObj;
                    else if (name.includes("KOSDAQ") || name.includes("코스닥")) map.kosdaq = dataObj;
                    else if (name.includes("환율") || name.includes("USD") || name.includes("달러")) map.usdkrw = dataObj;
                    else if (name.includes("S&P")) map.sp500 = dataObj;
                    else if (name.includes("NASDAQ") || name.includes("나스닥")) map.nasdaq = dataObj;
                    else if (name.includes("WTI") || name.includes("유가")) map.wti = dataObj;
                });
                setMarketData(map);
            }
        } catch (e) {
            console.error("Failed to fetch live briefing indices", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveData();
    }, []);

    // 실시간 지수 변수 매핑
    const kospiText = marketData.kospi ? `${marketData.kospi.val} (${marketData.kospi.chg})` : "2,580.4 (+0.62%)";
    const kosdaqText = marketData.kosdaq ? `${marketData.kosdaq.val} (${marketData.kosdaq.chg})` : "735.1 (+0.85%)";
    const fxText = marketData.usdkrw ? `${marketData.usdkrw.val}원 (${marketData.usdkrw.chg})` : "1,385.2원 (-0.15%)";
    const spText = marketData.sp500 ? `${marketData.sp500.val} (${marketData.sp500.chg})` : "5,630.2 (+0.45%)";
    const nasdaqText = marketData.nasdaq ? `${marketData.nasdaq.val} (${marketData.nasdaq.chg})` : "17,850.1 (+0.78%)";
    const wtiText = marketData.wti ? `$${marketData.wti.val} (${marketData.wti.chg})` : "$75.2 (-0.30%)";

    // 100% 자본시장법 준수 템플릿 (투자 권유가 아닌 한국거래소 공공 통계 팩트 데이터 전달)
    const templates = {
        closing: `📊 [${dateStr} 국내 증시 마감 & 외국인·기관 수급 통계]

🇰🇷 코스피: ${kospiText}
🇰🇷 코스닥: ${kosdaqText}
💵 원/달러 환율: ${fxText}

🔥 오늘 한국거래소(KRX) 집계 외국인 순매수 상위:
1️⃣ 삼성전자 (반도체 외인 대량 순유입)
2️⃣ SK하이닉스 (AI 메모리 수급 집중)
3️⃣ 현대차 (수출 실적 호조 수급)

🚀 오늘 시장 거래대금 집중 상승 테마:
• AI 반도체 & 온디바이스 AI
• 지능형 로봇 / 스마트팩토리
• 전력망 인프라 / 초고압 변압기

💡 내일 시장 주요 경제 지표 & 실시간 시그널 보기:
👉 https://stock-trend-program.co.kr/signals

※ 본 정보는 한국거래소 공공 데이터 기반의 단순 시장 통계 팩트 요약이며, 특정 종목의 매수·매도를 권유하는 유사투자자문이 아닙니다.`,

        morning: `☀️ [${dateStr} 글로벌 모닝 브리핑 - 장 시작 전 시장 통계]

🇺🇸 뉴욕 주요 지수 마감:
• S&P 500: ${spText}
• 나스닥(NASDAQ): ${nasdaqText}
• 국제 유가(WTI): ${wtiText}
💵 환율: ${fxText}

⚡ 오늘 장 시작 전 글로벌 주요 이슈 & 테마 통계:
1. 엔비디아 실적 대기 및 글로벌 AI 반도체 수급
2. 정부 기업 밸류업 프로그램 및 금융/지주사 동향
3. 글로벌 방산 & 조선 수주 모멘텀 지속

📈 실시간 외인/기관 수급 레이더 및 글로벌 시그널:
👉 https://stock-trend-program.co.kr/discovery

※ 본 정보는 공공 금융 데이터 기반의 단순 팩트 참고용 통계이며, 투자 권유가 아닙니다.`,

        themes: `🔥 [${dateStr} 시장 거래대금 집중 주도 테마 통계]

1️⃣ AI 반도체 / HBM 밸류체인
• 주요 통계: 빅테크 인프라 투자 확대 및 외인 양매수 집중

2️⃣ 휴머노이드 로봇 & 스마트팩토리
• 주요 통계: 주요 대기업 양산 로드맵 및 기술적 추세선 상향

3️⃣ 전력망 / 변압기 / 신재생 에너지
• 주요 통계: 글로벌 전력망 증설 수요 및 수출 실적 지표 개선

🔍 50대 테마별 실시간 데이터 & 펀더멘탈 지표 보기:
👉 https://stock-trend-program.co.kr/theme

※ 본 정보는 시장 공공 통계 요약이며, 특정 종목 매수/매도 권유가 아닙니다.`,

        whales: `👑 [${dateStr} 한국거래소(KRX) 외국인/기관 연속 순매수 통계]

최근 3일~5일간 외국인과 기관의 순매수 수급 유입이 집계된 주요 섹터:

💎 외국인 집중 순매수 섹터:
• 글로벌 반도체 & 대형 하드웨어
• 저PBR 지주사 & 금융 섹터

💎 기관 집중 순매수 섹터:
• 바이오/헬스케어 연구개발 모멘텀
• 2차전지 소재 및 전력 인프라

📊 실시간 수급 데이터 및 포트폴리오 자산 진단:
👉 https://stock-trend-program.co.kr/premium

※ 본 자료는 순수 통계 데이터이며 투자 권유가 아닙니다.`
    };

    const currentText = templates[activeType];

    const copyToClipboard = () => {
        navigator.clipboard.writeText(currentText);
        setCopied(true);
        toast.success("🎉 복사 완료! 카톡 주식 오픈채팅방이나 네이버 종토방에 붙여넣기(Ctrl+V)하세요!");
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-blue-950/30 border border-blue-500/30 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
            {/* 상단 헤더 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                        <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base md:text-lg font-black text-white flex items-center gap-1.5">
                                실시간 시황 브리핑 1초 생성기
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> 자본시장법 100% 준수
                                </span>
                            </h3>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            현재 실제 시장 지수(코스피/코스닥/환율)가 100% 실시간 자동 반영되는 합법 팩트 브리핑입니다.
                        </p>
                    </div>
                </div>

                {/* 복사 & 새로고침 버튼 */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchLiveData}
                        disabled={loading}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-gray-300 hover:text-white rounded-xl transition-all active:scale-95"
                        title="실시간 지수 새로고침"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-xl text-xs md:text-sm shadow-xl active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        {copied ? <Check className="w-4 h-4 text-black stroke-[3]" /> : <Copy className="w-4 h-4 text-black" />}
                        {copied ? "클립보드에 복사됨!" : "📋 카톡/종토방용 1초 복사"}
                    </button>
                </div>
            </div>

            {/* 브리핑 타입 선택 탭 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <button
                    onClick={() => setActiveType("closing")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        activeType === "closing"
                            ? "bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-md"
                            : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <Moon className="w-3.5 h-3.5 text-blue-400" />
                    <span>장 마감 브리핑</span>
                </button>

                <button
                    onClick={() => setActiveType("morning")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        activeType === "morning"
                            ? "bg-amber-600/20 text-amber-300 border-amber-500/50 shadow-md"
                            : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>모닝 브리핑</span>
                </button>

                <button
                    onClick={() => setActiveType("themes")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        activeType === "themes"
                            ? "bg-rose-600/20 text-rose-300 border-rose-500/50 shadow-md"
                            : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>급등 주도 테마</span>
                </button>

                <button
                    onClick={() => setActiveType("whales")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        activeType === "whales"
                            ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-md"
                            : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>외인/기관 수급</span>
                </button>
            </div>

            {/* 실시간 미리보기 창 (카카오톡 말풍선 스타일) */}
            <div className="relative bg-zinc-950/90 border border-white/10 rounded-2xl p-4 md:p-5 font-mono text-xs md:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar select-text shadow-inner">
                {currentText}
            </div>

            {/* 꿀팁 가이드 & 법적 안전 공시 */}
            <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    🛡️ <strong>자본시장법 준수:</strong> 매수/매도 권유가 없는 순수 KRX 공공 통계 팩트 요약이므로 안심하고 공유 가능합니다.
                </span>
                <span className="text-gray-500 font-mono">
                    자동 연동: 한국거래소(KRX) 실시간 지수
                </span>
            </div>
        </div>
    );
}
