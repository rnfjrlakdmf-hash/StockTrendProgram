import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '지정가 주문 (Limit Order) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '투자자가 직접 희망 가격을 지정하여 해당 가격에서만 체결되도록 하는 주문. 주식 초보자도 쉽게 이해할 수 있는 지정가 주문 (Limit Order) 완벽 가이드.',
  keywords: ['지정가 주문 (Limit Order)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideLimitOrderPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">지정가 주문 (Limit Order)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">지정가 주문 (Limit Order)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">투자자가 직접 희망 가격을 지정하여 해당 가격에서만 체결되도록 하는 주문</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">지정가 주문 (Limit Order)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">지정가 주문은 투자자가 원하는 가격을 직접 지정하여 그 가격 이하(매수) 또는 이상(매도)에서만 체결되도록 하는 주문 방식입니다. 원하는 가격에 체결되지 않으면 주문이 미체결로 남습니다. 가격을 정밀하게 조절할 수 있어 단기 트레이더나 가격 민감도가 높은 투자자에게 적합합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">삼성전자를 70,000원 지정가로 매수 주문하면, 주가가 70,000원 이하로 내려올 때만 체결됩니다. 현재 주가가 70,200원이라면 주문은 대기 상태로 남아 있다가, 나중에 70,000원이 되면 체결됩니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">지정가 주문은 원하는 가격에 안전하게 거래할 수 있지만, 주가가 해당 가격에 도달하지 않으면 기회를 놓칠 수 있습니다. 빠르게 움직이는 시장에서는 적극적인 상황에 맞게 주문가를 조정할 필요가 있습니다.</p>
          </section>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-sm text-gray-500">
            <strong className="text-gray-400 block mb-2">면책 조항</strong>
            본 가이드는 주식 투자 용어를 이해하기 쉽게 설명하기 위한 교육 목적의 정보입니다. 특정 종목의 매수·매도를 권유하는 내용이 아니며, 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm text-gray-600">
          <Link href="/guide" className="hover:text-gray-400">용어 가이드 목록</Link>
          <Link href="/" className="hover:text-gray-400">홈으로</Link>
          <Link href="/discovery" className="hover:text-gray-400">종목 분석하기</Link>
        </div>
      </div>
    </div>
  );
}
