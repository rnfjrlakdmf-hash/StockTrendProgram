import KakaoRevenueAd from "@/components/KakaoRevenueAd";
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, BookOpen, Layers, Sparkles, X, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface TermItem {
  slug: string;
  title: string;
  emoji: string;
  category: string;
  desc: string;
}

const terms: TermItem[] = [
  { slug: 'rsi', title: 'RSI (상대강도지수)', emoji: '📊', category: '기술적 지표', desc: '과매수·과매도 상태를 0~100으로 나타내는 대표 모멘텀 지표' },
  { slug: 'macd', title: 'MACD', emoji: '📈', category: '기술적 지표', desc: '단기·장기 이동평균 차이로 추세 전환과 매매 타이밍을 포착하는 지표' },
  { slug: 'bollinger-band', title: '볼린저 밴드', emoji: '📉', category: '기술적 지표', desc: '이동평균 중심의 표준편차 밴드로 가격 변동성과 상하한선을 분석' },
  { slug: 'moving-average', title: '이동평균선', emoji: '📏', category: '기술적 지표', desc: '일정 기간 주가 평균을 연결한 추세 분석의 기본 지표' },
  { slug: 'golden-cross', title: '골든크로스', emoji: '✨', category: '기술적 지표', desc: '단기선이 장기선을 상향 돌파하는 강력한 주가 상승 신호' },
  { slug: 'dead-cross', title: '데드크로스', emoji: '⚠️', category: '기술적 지표', desc: '단기선이 장기선을 하향 돌파하는 주가 하락 경고 신호' },
  { slug: 'volume', title: '거래량', emoji: '🔊', category: '기술적 지표', desc: '시장 관심도와 가격 추세 강도를 나타내는 필수 보조 지표' },
  { slug: 'per', title: 'PER (주가수익비율)', emoji: '💵', category: '가치평가 지표', desc: '주가를 주당순이익(EPS)으로 나눈 기업 가치 평가의 핵심 지표' },
  { slug: 'pbr', title: 'PBR (주가순자산비율)', emoji: '🏦', category: '가치평가 지표', desc: '주가를 순자산으로 나눈 자산 가치 대비 저평가 판단 지표' },
  { slug: 'roe', title: 'ROE (자기자본이익률)', emoji: '💎', category: '가치평가 지표', desc: '기업이 자기자본을 얼마나 효율적으로 굴려 이익을 냈는지 측정' },
  { slug: 'eps', title: 'EPS (주당순이익)', emoji: '💰', category: '가치평가 지표', desc: '기업이 발행한 주식 1주당 벌어들인 순이익 크기' },
  { slug: 'market-cap', title: '시가총액', emoji: '🏛️', category: '가치평가 지표', desc: '현재 시장에서 평가받는 기업의 전체 몸값과 규모' },
  { slug: 'ebitda', title: 'EBITDA', emoji: '💹', category: '가치평가 지표', desc: '이자·세금·감가상각 차감 전 순수 영업 현금 창출 능력' },
  { slug: 'book-value', title: '장부가치 (BPS)', emoji: '📒', category: '가치평가 지표', desc: '총자산에서 총부채를 제외한 주당 순자산 가치' },
  { slug: 'dividend', title: '배당금', emoji: '🎁', category: '배당 투자', desc: '기업이 영업활동으로 벌어들인 이익의 일부를 주주에게 분배' },
  { slug: 'dividend-yield', title: '배당수익률', emoji: '🏆', category: '배당 투자', desc: '현재 주가 대비 연간 배당금의 비율로 배당 매력도 측정' },
  { slug: 'ex-dividend-date', title: '배당락일', emoji: '📅', category: '배당 투자', desc: '해당 날짜 이후 매수 시 배당 권리를 받을 수 없는 기준일' },
  { slug: 'revenue', title: '매출액', emoji: '📊', category: '재무 분석', desc: '기업이 영업활동을 통해 달성한 총 외형 실적' },
  { slug: 'operating-profit', title: '영업이익', emoji: '⚙️', category: '재무 분석', desc: '매출액에서 원가와 판관비를 뺀 본업의 순수 수익성' },
  { slug: 'net-profit', title: '당기순이익', emoji: '✅', category: '재무 분석', desc: '영업외 손익과 법인세까지 모두 제하고 남은 최종 이익' },
  { slug: 'short-selling', title: '공매도', emoji: '🔻', category: '투자 전략', desc: '주가 하락을 예상하여 주식을 빌려 매도한 뒤 차익을 노리는 기법' },
  { slug: 'stop-loss', title: '손절매 (Stop-Loss)', emoji: '🛑', category: '투자 전략', desc: '원칙에 따라 손실을 제한하고 자본을 보호하는 매도 전략' },
  { slug: 'averaging-down', title: '물타기', emoji: '💧', category: '투자 전략', desc: '주가 하락 구간에서 추가 매수하여 매수 단가를 낮추는 전략' },
  { slug: 'value-investing', title: '가치투자', emoji: '🧠', category: '투자 전략', desc: '내재가치 대비 저평가된 우량 기업을 발굴해 장기 보유하는 철학' },
  { slug: 'growth-investing', title: '성장주 투자', emoji: '🚀', category: '투자 전략', desc: '폭발적인 매출·이익 성장 잠재력을 가진 기업에 선제적 투자' },
  { slug: 'momentum', title: '모멘텀 투자', emoji: '⚡', category: '투자 전략', desc: '상승 추세를 타고 있는 강세 종목의 탄력을 활용하는 전략' },
  { slug: 'sector-rotation', title: '섹터 로테이션', emoji: '🔄', category: '투자 전략', desc: '경기 순환 사이클에 맞춰 주도 업종으로 비중을 옮겨가는 전략' },
  { slug: 'portfolio', title: '포트폴리오', emoji: '🗂️', category: '리스크 관리', desc: '안정적인 수익과 위험 분산을 위해 구성한 복수 자산의 바스켓' },
  { slug: 'diversification', title: '분산투자', emoji: '🌐', category: '리스크 관리', desc: '다양한 자산군과 섹터에 투자금을 배분하여 개별 리스크 헷지' },
  { slug: 'rebalancing', title: '리밸런싱', emoji: '⚖️', category: '리스크 관리', desc: '시장 등락으로 왜곡된 포트폴리오 비중을 원래 목표치로 재조정' },
  { slug: 'beta', title: '베타 (Beta)', emoji: '📐', category: '리스크 관리', desc: '시장 지수(KOSPI/S&P500) 대비 개별 종목의 주가 변동 민감도' },
  { slug: 'etf', title: 'ETF (상장지수펀드)', emoji: '📦', category: '금융 상품', desc: '지수나 테마를 추종하며 주식처럼 실시간 매매 가능한 펀드' },
  { slug: 'kospi', title: '코스피 (KOSPI)', emoji: '🇰🇷', category: '시장 기초', desc: '대한민국 유가증권시장의 대표 대형 우량 기업 종합 지수' },
  { slug: 'kosdaq', title: '코스닥 (KOSDAQ)', emoji: '💡', category: '시장 기초', desc: 'IT·바이오·2차전지 등 혁신 성장 벤처기업 중심의 시장' },
  { slug: 'market-order', title: '시장가 주문', emoji: '⚡', category: '주문 방식', desc: '가격 지정 없이 현재 호가에 즉시 전량 체결시키는 주문 방식' },
  { slug: 'limit-order', title: '지정가 주문', emoji: '🎯', category: '주문 방식', desc: '투자자가 원하는 매수가/매도가를 직접 지정하여 내는 주문' },
  { slug: 'dart', title: 'DART (전자공시시스템)', emoji: '📋', category: '공시·규제', desc: '금융감독원이 운영하는 국내 상장기업 공시 열람 공식 포털' },
  { slug: 'disclosure', title: '공시 제도', emoji: '📢', category: '공시·규제', desc: '기업의 주요 경영 사항과 실적을 모든 투자자에게 평등하게 공개' },
  { slug: 'fundamental-analysis', title: '기본적 분석', emoji: '🔬', category: '분석 방법', desc: '재무제표와 산업 성장성, 밸류에이션으로 기업 본질 가치를 분석' },
  { slug: 'technical-analysis', title: '기술적 분석', emoji: '📈', category: '분석 방법', desc: '과거 주가 차트와 거래량 패턴을 토대로 미래 주가 흐름을 예측' },
  { slug: 'inflation', title: '인플레이션', emoji: '💸', category: '거시경제', desc: '화폐 가치 하락과 전반적인 물가 상승이 자산 시장에 미치는 영향' },
  { slug: 'interest-rate', title: '금리', emoji: '🏦', category: '거시경제', desc: '중앙은행의 기준금리 정책과 주식·채권 가격의 상관관계' },
  { slug: 'fomc', title: 'FOMC (연방공개시장위원회)', emoji: '🌐', category: '거시경제', desc: '미국 연준(Fed)의 기준금리와 통화정책을 결정하는 핵심 회의' },
];

export default function GuidePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // Categories list
  const categories = useMemo(() => {
    return ['전체', ...Array.from(new Set(terms.map(t => t.category)))];
  }, []);

  // Filtered terms
  const filteredTerms = useMemo(() => {
    return terms.filter(term => {
      const matchCat = selectedCategory === '전체' || term.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch = !query || 
        term.title.toLowerCase().includes(query) || 
        term.desc.toLowerCase().includes(query) || 
        term.category.toLowerCase().includes(query) ||
        term.slug.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
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

        {/* Search & Category Filter Container */}
        <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="찾으시는 주식 용어, 지표 또는 키워드를 검색하세요 (예: RSI, PER, 골든크로스, 배당...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-white/15 rounded-2xl pl-12 pr-10 py-3.5 text-sm sm:text-base outline-none focus:border-blue-500 font-bold text-white shadow-inner transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                title="검색어 지우기"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            {categories.map(cat => {
              const count = cat === '전체' ? terms.length : terms.filter(t => t.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-gray-400 hover:text-white border border-white/5 hover:border-white/15'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex justify-between items-center px-1 mb-6">
          <div className="text-xs font-bold text-gray-400 flex items-center gap-2">
            <span>검색 결과:</span>
            <span className="text-blue-400 font-black text-sm">{filteredTerms.length}</span>개의 용어
            {selectedCategory !== '전체' && (
              <span className="bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/20 text-[10px]">
                {selectedCategory}
              </span>
            )}
          </div>
          {(selectedCategory !== '전체' || searchQuery) && (
            <button
              onClick={() => { setSelectedCategory('전체'); setSearchQuery(''); }}
              className="text-xs font-bold text-gray-400 hover:text-white underline underline-offset-4 transition-colors"
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* Cards Grid */}
        {filteredTerms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTerms.map(term => (
              <Link
                key={term.slug}
                href={`/guide/${term.slug}`}
                className="bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 hover:border-blue-500/40 rounded-2xl p-5 transition-all duration-300 shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 flex flex-col justify-between group h-full"
              >
                <div>
                  {/* Top Bar: Icon + Category Badge */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-all duration-300">
                      {term.emoji}
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                      {term.category}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-black text-white text-sm sm:text-base group-hover:text-blue-300 transition-colors tracking-tight">
                    {term.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-2 line-clamp-2">
                    {term.desc}
                  </p>
                </div>

                {/* Bottom Action */}
                <div className="flex items-center justify-between pt-3 mt-4 border-t border-white/5 text-xs font-bold text-gray-500 group-hover:text-blue-400 transition-colors">
                  <span>핵심 가이드 읽기</span>
                  <div className="p-1 rounded-lg group-hover:bg-blue-500/10 transition-colors">
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-white/10 p-8">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">일치하는 용어를 찾을 수 없습니다</h3>
            <p className="text-xs text-gray-400 mb-6">
              검색어 철자를 확인하거나 다른 검색어를 입력해 보세요.
            </p>
            <button
              onClick={() => { setSelectedCategory('전체'); setSearchQuery(''); }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg transition-all"
            >
              전체 용어 보기
            </button>
          </div>
        )}

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
          <Link href="/discovery" className="hover:text-white transition-colors">종목 진단</Link>
          <Link href="/etf-analysis" className="hover:text-white transition-colors">ETF 분석</Link>
          <Link href="/pattern" className="hover:text-white transition-colors">차트 패턴 분석</Link>
          <Link href="/privacy-policy" className="hover:text-white transition-colors">개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
