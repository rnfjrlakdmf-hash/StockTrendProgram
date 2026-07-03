'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

interface ReportDownloadButtonProps {
    targetId: string;
    fileName: string;
}

export default function ReportDownloadButton({ targetId, fileName }: ReportDownloadButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        const element = document.getElementById(targetId);
        if (!element) return;

        try {
            setIsDownloading(true);
            
            // Add a temporary watermark
            const watermark = document.createElement('div');
            watermark.innerHTML = '🔥 스마트 투자 비서 (stock-trend-program.co.kr) 🔥 AI 무료 분석 리포트';
            watermark.className = 'absolute bottom-2 right-4 text-xs font-bold text-white/50 bg-black/50 px-3 py-1 rounded-full z-50';
            element.appendChild(watermark);

            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                backgroundColor: '#020617', // Match slate-950
                useCORS: true,
                logging: false,
            });

            // Remove watermark after capturing
            if (element.contains(watermark)) {
                element.removeChild(watermark);
            }

            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = `${fileName}_AI리포트.png`;
            link.click();
        } catch (error) {
            console.error('Failed to download image', error);
            alert('이미지 저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 w-full md:w-auto"
        >
            <Download size={16} />
            {isDownloading ? '저장 중...' : '이미지로 저장 (커뮤니티 공유)'}
        </button>
    );
}
