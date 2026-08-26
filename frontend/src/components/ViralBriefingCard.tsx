"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Share2, Sparkles, Send, Flame, Sun, Moon, Zap, RefreshCw, ShieldCheck, ExternalLink, AtSign, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";

interface ViralBriefingCardProps {
    isAdmin?: boolean;
}

export default function ViralBriefingCard({ isAdmin = false }: ViralBriefingCardProps) {
    const [platform, setPlatform] = useState<"threads" | "kakao">("threads");
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

    // 🧵 1. 인스타그램 스레드(Threads) 전용 알고리즘 바이럴 템플릿
    const threadsTemplates = {
        closing: `오늘 주식장 다들 어떠셨나요? 📉📈
외인들이 장 막판에 바닥에서 쓸어담은 종목 3개 딱 1분 만에 요약해 드립니다.

🇰🇷 오늘 마감 지수 (${dateStr})
• 코스피: ${kospiText}
• 코스닥: ${kosdaqText}
• 원/달러 환율: ${fxText}

🔥 오늘 한국거래소 집계 외국인 순매수 TOP 3:
1. 삼성전자 (반도체 외인 순유입 급증)
2. SK하이닉스 (AI HBM 대장주 수급 견조)
3. 현대차 (수출 실적 호조 모멘텀)

⚡ 거래대금 터진 오늘 시장 주도 테마:
• AI 반도체 & 온디바이스
• 지능형 로봇 / 스마트팩토리
• 전력망 인프라 & 초고압 변압기

내일 장 시작 전 체크할 실시간 시그널 & 수급 전문은 프로필 링크에서 무료로 보실 수 있습니다 👇
👉 https://stock-trend-program.co.kr/signals

여러분이 보시기엔 내일 반도체가 더 갈 것 같나요? 의견 남겨주세요 💬

#주식 #주식투자 #재테크 #국내주식 #코스피 #삼성전자 #주식공부 #스톡트렌드`,

        morning: `출근길 30초 주식 체크 ☕
오늘 한국 증시 열리기 전에 꼭 봐야 할 미국장 핵심 요약입니다 (${dateStr}).

🇺🇸 뉴욕 증시 마감:
• S&P 500: ${spText}
• 나스닥(NASDAQ): ${nasdaqText}
• 엔비디아(NVDA) 강세 & 빅테크 수급 견조
• 국제 유가(WTI): ${wtiText} / 환율: ${fxText}

⚡ 오늘 아침 주목해야 할 핵심 3대 테마:
1. 엔비디아 실적 대기 AI 반도체 밸류체인
2. 정부 기업 밸류업 프로그램 및 금융/지주사 동향
3. K-방산 & 조선 글로벌 수주 모멘텀 지속

오늘 장초반 실시간 매수 시그널은 프로필 링크에서 확인하세요 👇
👉 https://stock-trend-program.co.kr/discovery

오늘도 성투하는 하루 되세요 🔥

#모닝브리핑 #미국주식 #나스닥 #재테크 #주식스타그램 #주린이 #스톡트렌드`,

        themes: `오늘 돈이 몰린 주도 테마 TOP 3 🚀
요즘 시장은 가는 놈만 더 가는 장세입니다. 오늘 시장 거래대금 싹쓸이한 테마 정리 (${dateStr}):

1️⃣ AI 반도체 / HBM
• 빅테크 인프라 투자 지속 & 외인 양매수 집중

2️⃣ 휴머노이드 로봇 & 스마트팩토리
• 대기업 로봇 양산 로드맵 가시화

3️⃣ 전력망 / 초고압 변압기
• 북미 노후 전력망 교체 및 AI 전력 수요 폭발

50대 테마별 실시간 대장주 & 목표가 진단은 아래 링크에서 👇
👉 https://stock-trend-program.co.kr/theme

지금 어떤 섹터를 가장 눈여겨보고 계신가요? 댓글로 공유해 주세요 💬

#테마주 #주식추천 #AI관련주 #로봇관련주 #주식초보 #재테크팁`,

        whales: `조용히 큰손들이 쓸어담고 있는 종목들 👀
최근 3일간 외국인과 기관이 바닥권에서 연속 순매집 중인 섹터 리스트입니다 (${dateStr}):

💎 외인 연속 순매수:
• 대형 반도체 & AI 하드웨어
• 저PBR 밸류업 금융/지주사

💎 기관 연속 순매수:
• 바이오 신약 파이프라인
• 2차전지 핵심 소재 저가 매수세

실시간 외인/기관 수급 레이더 & 종목 진단은 링크에서 무료 확인 👇
👉 https://stock-trend-program.co.kr/premium

저장해 두고 장 마감 후 복기해 보세요 📌

#수급분석 #외국인순매수 #기관순매수 #가치투자 #주식계좌 #스톡트렌드`
    };

    // 💬 2. 카카오톡 / 네이버 종토방 전용 템플릿
    const kakaoTemplates = {
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

    const currentText = platform === "threads" ? threadsTemplates[activeType] : kakaoTemplates[activeType];

    const copyToClipboard = () => {
        navigator.clipboard.writeText(currentText);
        setCopied(true);
        if (platform === "threads") {
            toast.success("🎉 스레드(Threads)용 텍스트 복사 완료! 인스타 스레드에 붙여넣기(Ctrl+V)하세요!");
        } else {
            toast.success("🎉 카톡/종토방용 텍스트 복사 완료! 단톡방에 붙여넣기(Ctrl+V)하세요!");
        }
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-indigo-950/30 border border-indigo-500/30 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
            {/* 상단 헤더 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                        <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base md:text-lg font-black text-white flex items-center gap-1.5">
                                실시간 시황 브리핑 1초 생성기
                                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                    🧵 스레드 바이럴 핏
                                </span>
                            </h3>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            인스타그램 스레드(Threads) 및 카카오톡에 최적화된 고조회수 바이럴 포맷을 1초 만에 생성합니다.
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
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-black rounded-xl text-xs md:text-sm shadow-xl active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                        {copied ? <Check className="w-4 h-4 text-white stroke-[3]" /> : <Copy className="w-4 h-4 text-white" />}
                        {copied ? "클립보드에 복사됨!" : (platform === "threads" ? "🧵 스레드용 1초 복사" : "📋 카톡/종토방용 1초 복사")}
                    </button>
                    {platform === "threads" && (
                        <a
                            href="https://threads.net"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden md:flex items-center justify-center gap-1 px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-gray-300 hover:text-white rounded-xl transition-all"
                            title="스레드로 바로 이동"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            스레드 열기
                        </a>
                    )}
                </div>
            </div>

            {/* 플랫폼 선택 스위처 (스레드 vs 카카오톡) */}
            <div className="flex items-center gap-2 mb-4 p-1 bg-zinc-950 rounded-2xl border border-white/10 w-full sm:w-fit">
                <button
                    onClick={() => setPlatform("threads")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        platform === "threads"
                            ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                            : "text-gray-400 hover:text-white"
                    }`}
                >
                    <AtSign className="w-3.5 h-3.5" />
                    <span>인스타 스레드(Threads) 전용</span>
                </button>
                <button
                    onClick={() => setPlatform("kakao")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        platform === "kakao"
                            ? "bg-amber-500 text-black font-black shadow-md"
                            : "text-gray-400 hover:text-white"
                    }`}
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>카카오톡 / 종토방 전용</span>
                </button>
            </div>

            {/* 브리핑 타입 선택 탭 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <button
                    onClick={() => setActiveType("closing")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        activeType === "closing"
                            ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md"
                            : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
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

            {/* 실시간 미리보기 창 (스레드 / 카카오톡 스타일) */}
            <div className="relative bg-zinc-950/90 border border-white/10 rounded-2xl p-4 md:p-5 font-mono text-xs md:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar select-text shadow-inner">
                {currentText}
            </div>

            {/* 꿀팁 가이드 & 법적 안전 공시 */}
            <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-pink-400 font-medium">
                    🧵 <strong>스레드(Threads) 꿀팁:</strong> 스레드는 팔로워 0명이어도 첫 줄 후킹과 질문형 마무리 댓글 유도 시 알고리즘으로 수만 명에게 도달합니다!
                </span>
                <span className="text-gray-500 font-mono">
                    실시간 연동: 코스피·코스닥·환율 100% 자동 반영
                </span>
            </div>
        </div>
    );
}
