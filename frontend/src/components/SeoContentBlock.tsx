interface SeoContentProps {
    pageTitle?: string;
    pageDescription?: string;
    variant?: 'home' | 'subpage';
}

export default function SeoContentBlock({ pageTitle, pageDescription }: SeoContentProps) {
    if (!pageTitle && !pageDescription) {
        return null;
    }

    return (
        <section
            aria-label="페이지 안내"
            className="w-full max-w-5xl mx-auto px-4 py-6 mt-6 border-t border-white/10 text-gray-400"
        >
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
                {pageTitle && (
                    <h2 className="text-base md:text-lg font-bold text-white mb-1.5">
                        {pageTitle}
                    </h2>
                )}
                {pageDescription && (
                    <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                        {pageDescription}
                    </p>
                )}
                <p className="text-[11px] text-gray-500 mt-3 pt-2.5 border-t border-white/5">
                    ※ 본 페이지의 모든 정보는 금융감독원 전자공시시스템(DART), 한국거래소(KRX), 미국 증권거래위원회(SEC) 등의 공개 데이터를 기반으로 작성된 금융 교육 및 통계 리서치 자료이며, 특정 종목에 대한 매수·매도 권유가 아닙니다.
                </p>
            </div>
        </section>
    );
}
