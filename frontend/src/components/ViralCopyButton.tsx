"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ViralCopyButtonProps {
    stockName: string;
    ticker: string;
    price?: number | string;
    per?: number | string;
    pbr?: number | string;
    operatingProfit?: string;
    url?: string;
    className?: string;
}

export default function ViralCopyButton({
    stockName,
    ticker,
    price,
    per,
    pbr,
    operatingProfit,
    url,
    className
}: ViralCopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const targetUrl = url || (typeof window !== "undefined" ? window.location.href : `https://stock-trend-program.co.kr/stock/${ticker}`);
        const formattedPrice = price ? (typeof price === 'number' ? price.toLocaleString() : price) : '-';
        
        let copyText = `📊 [스마트 투자 비서] ${stockName} (${ticker}) 핵심 진단\n`;
        copyText += `• 현재가: ${formattedPrice}원\n`;
        if (per && per !== '-') copyText += `• PER: ${per}배\n`;
        if (pbr && pbr !== '-') copyText += `• PBR: ${pbr}배\n`;
        if (operatingProfit && operatingProfit !== '-') copyText += `• 최근 영업이익: ${operatingProfit}\n`;
        copyText += `\n💡 AI 5단계 정밀 진단 및 실시간 D-Day 일정 전체보기:\n👉 ${targetUrl}`;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(copyText);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = copyText;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand("copy");
                textArea.remove();
            }

            setCopied(true);
            toast.success("📋 종목 요약이 복사되었습니다!", {
                description: "네이버 종목토론방이나 카톡 단톡방에 바로 붙여넣어 공유하세요.",
                duration: 4000,
            });

            setTimeout(() => {
                setCopied(false);
            }, 2500);
        } catch (err) {
            console.error("복사 실패:", err);
            toast.error("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={className || "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 w-full"}
            title="네이버 종토방·카톡 공유용 요약 텍스트 복사"
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>복사 완료! 종토방에 붙여넣기</span>
                </>
            ) : (
                <>
                    <Copy className="w-4 h-4" />
                    <span>📋 종토방·단톡방 1초 요약 복사</span>
                </>
            )}
        </button>
    );
}
