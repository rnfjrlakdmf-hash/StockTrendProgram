"use client";

import { useState } from "react";
import { Copy, Check, Share2, Sparkles, Send, Flame, Sun, Moon, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ViralBriefingCardProps {
    isAdmin?: boolean;
}

export default function ViralBriefingCard({ isAdmin = false }: ViralBriefingCardProps) {
    const [activeType, setActiveType] = useState<"closing" | "morning" | "themes" | "whales">("closing");
    const [copied, setCopied] = useState(false);

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

    // 템플릿 정의
    const templates = {
        closing: `📊 [${dateStr} 증시 마감 & 외국인 수급 요약]

🇰🇷 코스피 2,580.4 (+0.62%) | 코스닥 735.1 (+0.85%)
💵 원/달러 환율: 1,385.2원

🔥 오늘 외국인·기관 집중 순매수 TOP:
1️⃣ 삼성전자 (반도체 외인 대량 유입)
2️⃣ SK하이닉스 (HBM 주도주 강세)
3️⃣ 현대차 (수출 호조 실적 기대)

🚀 오늘 시장 주도 급등 테마:
• AI 반도체 & 온디바이스 AI (+4.5%)
• 로봇 / 스마트팩토리 (+3.8%)
• 전력설비 / 변압기 (+2.6%)

💡 내일 장 시작 전 필수 체크 & 실시간 시그널 보기:
👉 https://stock-trend-program.co.kr/signals
(무료 주가 급등락/공시 알림 확인 가능)`,

        morning: `☀️ [${dateStr} 모닝 브리핑 - 오늘 장 핵심 관전포인트]

🇺🇸 뉴욕 증시 마감:
• S&P 500: 5,630.2 (+0.45%)
• 나스닥(NASDAQ): 17,850.1 (+0.78%)
• 엔비디아(NVDA) 강세 & 빅테크 수급 견조

🛢️ 국제 유가(WTI): $75.2 (-0.3%)
💵 환율: 1,385원선 안정화

⚡ 오늘 장 시작 전 주목해야 할 핵심 3대 테마:
1. 엔비디아 실적 대기 AI 반도체 밸류체인
2. 정부 기업 밸류업 프로그램 및 금융/지주사
3. K-방산 & K-조선 글로벌 수주 모멘텀

📈 오늘 아침 장초반 실시간 매수 시그널 포착:
👉 https://stock-trend-program.co.kr/discovery`,

        themes: `🔥 [${dateStr} 실시간 급상승 주도 테마 & 대장주]

1️⃣ AI 반도체 / HBM 관련주
• 핵심 모멘텀: 빅테크 AI 인프라 투자 확대
• 수급 집중: 외인/기관 동반 양매수

2️⃣ 휴머노이드 로봇 & 스마트팩토리
• 핵심 모멘텀: 대기업 로봇 사업 본격 양산
• 거래대금 급증 & 기술적 골든크로스 발생

3️⃣ 전력망 / 초고압 변압기
• 핵심 모멘텀: 북미 노후 전력망 교체 및 AI 전력 수요

🔍 50대 테마별 실시간 대장주 & 목표가 진단:
👉 https://stock-trend-program.co.kr/theme`,

        whales: `👑 [${dateStr} 세력/외국인 연속 순매집 TOP 포착]

최근 3일~5일간 외국인과 기관이 바닥권에서 조용히 쓸어담고 있는 수급 유망주 리스트:

💎 외인 연속 순매수:
• 대형 반도체 & AI 하드웨어
• 저PBR 밸류업 지주사 & 금융주

💎 기관 연속 순매수:
• 바이오/헬스케어 신약 모멘텀
• 2차전지 핵심 소재 저가 매수세

📊 실시간 외국인/기관 수급 레이더 및 포트폴리오 진단:
👉 https://stock-trend-program.co.kr/premium`
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
                                1초 시황 브리핑 생성기
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    무료 바이럴
                                </span>
                            </h3>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            버튼 한 번으로 카톡 단톡방, 텔레그램, 네이버 종토방에 공유할 수 있는 깔끔한 요약글을 복사합니다.
                        </p>
                    </div>
                </div>

                {/* 복사 버튼 */}
                <button
                    onClick={copyToClipboard}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-xl text-xs md:text-sm shadow-xl active:scale-95 transition-all cursor-pointer shrink-0"
                >
                    {copied ? <Check className="w-4 h-4 text-black stroke-[3]" /> : <Copy className="w-4 h-4 text-black" />}
                    {copied ? "클립보드에 복사됨!" : "📋 카톡/종토방용 1초 복사"}
                </button>
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
                    <span>세력/외인 매집주</span>
                </button>
            </div>

            {/* 실시간 미리보기 창 (카카오톡 말풍선 스타일) */}
            <div className="relative bg-zinc-950/90 border border-white/10 rounded-2xl p-4 md:p-5 font-mono text-xs md:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-[280px] overflow-y-auto custom-scrollbar select-text shadow-inner">
                {currentText}
            </div>

            {/* 꿀팁 가이드 */}
            <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                    💡 <strong>꿀팁:</strong> 주식 카톡 오픈채팅방이나 네이버 종목토론방에 1일 1회만 공유해도 유입이 폭증합니다!
                </span>
                <span className="text-gray-500 font-mono">
                    자동 서명: stock-trend-program.co.kr
                </span>
            </div>
        </div>
    );
}
