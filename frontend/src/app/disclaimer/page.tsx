import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "면책 조항 (Disclaimer) | StockTrend",
    description: "StockTrend의 투자 정보 및 데이터 사용에 관한 법적 면책 조항 안내입니다.",
};

export default function DisclaimerPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-gray-200">
            <div className="max-w-4xl mx-auto px-6 py-16 animate-in fade-in duration-500">
                <h1 className="text-3xl font-black text-white mb-2">면책 조항 (Disclaimer)</h1>
                <p className="text-gray-500 text-sm mb-12">최종 업데이트: 2026년 6월 15일</p>

                <div className="space-y-10 text-gray-300 leading-relaxed">
                    
                    <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
                            <span>⚠️</span> 핵심 면책 사항
                        </h2>
                        <p className="font-medium text-gray-200 mb-3">
                            본 웹사이트(StockTrend)에서 제공하는 모든 데이터, AI 분석 결과, 뉴스, 시황 리포트 및 각종 지표는 <strong>오직 투자 참고용(단순 정보 제공 목적)</strong>으로만 제공됩니다.
                        </p>
                        <p className="font-medium text-gray-200">
                            어떠한 경우에도 당사가 제공하는 정보가 특정 주식, 채권, 파생상품 등의 매수 또는 매도를 권유하는 <strong>투자 자문(Investment Advice)으로 해석될 수 없으며</strong>, 개별 투자자의 투자 목적, 재무 상태, 또는 위험 회피 성향을 고려하지 않은 일반적인 정보입니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">1. 데이터의 정확성 및 신뢰성 한계</h2>
                        <ul className="list-disc ml-6 space-y-2 text-gray-400">
                            <li>본 서비스는 증권사 API, 금융 데이터 제공업체, 뉴스 크롤러, 그리고 인공지능(AI) 알고리즘을 활용하여 데이터를 가공 및 제공합니다.</li>
                            <li>시스템 상의 지연, 데이터 제공업체의 오류, 통신 장애 등의 이유로 <strong>실제 시장 데이터(주가, 재무제표 등)와 차이가 발생할 수 있으며</strong>, 정보의 정확성, 완전성, 적시성을 보증하지 않습니다.</li>
                            <li>이용자는 본 서비스의 데이터를 바탕으로 의사결정을 내리기 전에 반드시 해당 거래소, 공시 시스템(DART/EDGAR 등) 및 기타 공식적인 출처를 통해 사실 여부를 확인해야 합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">2. AI 분석 결과에 대한 책임 제한</h2>
                        <ul className="list-disc ml-6 space-y-2 text-gray-400">
                            <li>StockTrend에서 제공하는 '투자 매력도 점수', '시황 브리핑', '테마 분석' 등은 AI 알고리즘(언어 모델 및 통계 모델)이 과거 데이터와 텍스트를 분석하여 산출한 결과입니다.</li>
                            <li>AI의 판단은 완벽하지 않으며 <strong>미래의 수익을 보장하거나 주가 하락을 방어해주지 못합니다.</strong> 예측 불가한 거시 경제의 변화, 지정학적 리스크, 혹은 개별 기업의 횡령/배임 등은 알고리즘이 예측할 수 없습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">3. 투자 손실에 대한 책임 소재</h2>
                        <p className="mb-3 text-gray-400">
                            주식 투자 및 파생상품 투자는 원금을 100% 잃을 수 있는 매우 위험한 행위이며, 경우에 따라 원금을 초과하는 손실이 발생할 수 있습니다.
                        </p>
                        <p className="text-gray-400">
                            이용자가 본 서비스에서 제공하는 정보를 이용하여 행한 <strong>모든 투자의 최종 판단과 그에 따른 재산상의 손실 책임은 전적으로 투자자 본인에게 있습니다.</strong> 당사(운영자, 개발자, 파트너사 포함)는 직·간접적인 투자 손실에 대해 어떠한 법적, 도의적 책임도 지지 않습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-3">4. 제3자 웹사이트 및 링크</h2>
                        <p className="text-gray-400">
                            본 서비스에는 외부 웹사이트, 기사, 파트너사 또는 구글 애드센스(Google AdSense)와 같은 광고 네트워크로 연결되는 하이퍼링크가 포함될 수 있습니다. 당사는 해당 외부 사이트가 제공하는 정보, 제품, 서비스 또는 개인정보보호 정책에 대해 어떠한 통제권도 없으며 책임을 지지 않습니다. 광고를 클릭하여 발생하는 제3자와의 거래 결과 역시 당사와 무관합니다.
                        </p>
                    </section>
                </div>

                {/* 하단 네비게이션 */}
                <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-600 text-sm">
                    <p className="mb-4">본 면책 조항을 충분히 이해하고 동의하는 경우에만 서비스를 이용하시기 바랍니다.</p>
                    <div className="flex justify-center flex-wrap gap-4 md:gap-6 mt-3">
                        <Link href="/" className="hover:text-gray-400 transition-colors font-medium">홈으로</Link>
                        <Link href="/terms" className="hover:text-gray-400 transition-colors font-medium">이용약관</Link>
                        <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors font-medium">개인정보처리방침</Link>
                        <Link href="/contact" className="hover:text-gray-400 transition-colors font-medium">문의하기</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
