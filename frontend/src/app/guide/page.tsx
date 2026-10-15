import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import GuideSearchFilter from './GuideSearchFilter';
import { GUIDE_TERMS } from '@/lib/guideTerms';

export const metadata: Metadata = {
  title: '주식 투자 용어 사전 & 필수 기초 가이드 46선 | 스마트 투자 비서',
  description: 'PER, PBR, ROE, RSI, MACD, 볼린저 밴드, 공매도, DART 등 주식 초보자를 위한 46가지 핵심 필수 용어와 실전 투자 지표를 정리한 무료 주식 백과사전입니다.',
  keywords: [
    '주식 용어 사전', '주식 기초 가이드', 'PER', 'PBR', 'ROE', 'RSI', 'MACD', 
    '볼린저밴드', '공매도', 'DART 전자공시', '배당수익률', '주식 초보 가이드'
  ],
  alternates: {
    canonical: '/guide',
  },
  openGraph: {
    title: '주식 투자 용어 사전 & 필수 기초 가이드 46선 | 스마트 투자 비서',
    description: '초보 투자자를 위한 46대 필수 주식 용어 및 실전 가치평가 지표 완벽 해설 백과사전.',
    url: 'https://stock-trend-program.co.kr/guide',
    siteName: '스마트 투자 비서',
    images: ['/og-image.png'],
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function GuidePage() {
  const terms = GUIDE_TERMS;
  const categories = ['전체', ...Array.from(new Set(terms.map(t => t.category)))];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": "https://stock-trend-program.co.kr/guide#terms",
    "name": "스마트 투자 비서 주식 용어 사전 46선",
    "description": "국내외 주식 초보자를 위한 46가지 핵심 금융 지표 및 실전 용어 가이드",
    "url": "https://stock-trend-program.co.kr/guide",
    "hasDefinedTerm": terms.map(t => ({
      "@type": "DefinedTerm",
      "name": t.title,
      "description": t.desc,
      "url": `https://stock-trend-program.co.kr/guide/${t.slug}`,
      "inDefinedTermSet": "https://stock-trend-program.co.kr/guide#terms"
    }))
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        
        {/* Hero Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black px-4 py-2 rounded-full mb-5 shadow-sm">
            <BookOpen className="w-3.5 h-3.5" />
            <span>무료 주식 투자 용어 사전 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
            주식 투자 용어 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">완전 정복</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-2xl mx-auto">
            RSI, PER, 볼린저밴드부터 공매도, 리밸런싱, FOMC까지 —<br className="hidden sm:inline" /> 
            주식 투자에 꼭 필요한 <strong className="text-white font-bold">{terms.length}가지 핵심 용어</strong>를 쉽고 명쾌하게 정리했습니다.
          </p>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap justify-center items-center gap-3 mt-6">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs font-bold text-gray-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>총 {terms.length}개 핵심 용어</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs font-bold text-gray-300">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>{categories.length - 1}개 전문 카테고리</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% 무료 가이드</span>
            </div>
          </div>
        </div>

        {/* Interactive Search & Filter with SSR Backing */}
        <GuideSearchFilter terms={terms} categories={categories} />

        {/* Disclaimer Card */}
        <div className="mt-16 bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 text-sm text-gray-300 flex items-start gap-4">
          <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 mt-0.5 text-lg">
            ⚠️
          </div>
          <div>
            <strong className="text-amber-300 font-bold block mb-1 text-sm">투자 정보 및 용어 해설 면책 고지</strong>
            <p className="text-xs text-gray-400 leading-relaxed">
              본 가이드에서 제공하는 모든 내용은 주식 투자 용어에 대한 이해와 학습을 돕기 위한 교육용 자료입니다. 
              특정 금융 상품의 매수·매도를 추천하거나 권유하지 않으며, 모든 투자의 최종 판단과 손익에 대한 책임은 투자자 본인에게 있습니다.
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-xs flex flex-wrap justify-center gap-6">
          <Link href="/" className="hover:text-white transition-colors">홈으로</Link>
          <Link href="/blog" className="hover:text-white transition-colors">마켓 리포트</Link>
          <Link href="/theory" className="hover:text-white transition-colors">차트 스터디</Link>
          <Link href="/calculator" className="hover:text-white transition-colors">주식 계산기</Link>
          <Link href="/privacy-policy" className="hover:text-white transition-colors">개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
