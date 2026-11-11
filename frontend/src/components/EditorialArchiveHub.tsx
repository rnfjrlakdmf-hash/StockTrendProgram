"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Newspaper, BookOpen, Layers, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react';

interface EditorialArchiveHubProps {
  featuredBlogPosts: any[];
  latestTheoryPosts: any[];
  investmentGuides: { href: string; title: string; desc: string }[];
  sectorResearchLinks: { href: string; title: string; desc: string }[];
  faqs: { q: string; a: string }[];
}

export default function EditorialArchiveHub({
  featuredBlogPosts,
  latestTheoryPosts,
  investmentGuides,
  sectorResearchLinks,
  faqs,
}: EditorialArchiveHubProps) {
  const [activeTab, setActiveTab] = useState<'columns' | 'guides' | 'academy' | 'faq'>('columns');

  return (
    <div className="space-y-6">
      {/* 1. 에디토리얼 상단 헤더 & 탭 셀렉터 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-black">
              RESEARCH JOURNAL &amp; KNOWLEDGE HUB
            </span>
            <span className="text-xs text-gray-400">
              공식 공공데이터 기반 리서치 &amp; 금융 교육
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>금융 리서치 &amp; 주식 투자 지식 아카이브</span>
          </h2>
        </div>

        {/* 탭 전환 버튼 모음 (깔끔한 필터 칩 스타일) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-white/10 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('columns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'columns'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>심층 칼럼 ({featuredBlogPosts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('guides')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'guides'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>용어 백과 (46선)</span>
          </button>
          <button
            onClick={() => setActiveTab('academy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'academy'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>차트·산업 밸류체인</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>리서치 FAQ</span>
          </button>
        </div>
      </div>

      {/* 2. 탭별 컨텐츠 렌더링 (단정하고 깔끔한 그리드) */}
      <div className="transition-all duration-300">
        {/* [탭 1] 심층 금융 리서치 칼럼 */}
        {activeTab === 'columns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                글로벌 거시경제, 기업 실적 분석, 수급 동향을 다루는 심층 칼럼 리포트입니다.
              </p>
              <Link
                href="/blog"
                className="text-xs font-bold text-blue-300 hover:text-white bg-blue-500/15 border border-blue-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0"
              >
                <span>칼럼 전체보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {featuredBlogPosts.map((post) => {
                const plainDesc = String((post as any).excerpt || post.content || '')
                  .replace(/<[^>]*>?/gm, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 95);
                const postSlug = post.slug || post.id;
                return (
                  <Link
                    key={postSlug}
                    href={`/blog/${encodeURIComponent(postSlug)}`}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3 group shadow-sm hover:shadow-blue-500/5 hover:-translate-y-0.5"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25">
                          {(post as any).category || '금융 리서치'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ko-KR') : '최신 리포트'}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                        {plainDesc}...
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                      칼럼 읽기 →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* [탭 2] 46대 필수 주식 용어 백과사전 */}
        {activeTab === 'guides' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                초보자부터 실전 투자자까지 반드시 알아야 할 46대 핵심 지표·재무 용어 가이드입니다.
              </p>
              <Link
                href="/guide"
                className="text-xs font-bold text-purple-300 hover:text-white bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0"
              >
                <span>46개 백과 전체보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {investmentGuides.map(({ href, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-purple-500/40 transition-all group block shadow-xs hover:-translate-y-0.5"
                >
                  <h4 className="text-white text-xs sm:text-[13px] font-bold group-hover:text-purple-300 transition-colors truncate">
                    {title}
                  </h4>
                  <p className="text-gray-400 text-[10.5px] mt-1 leading-snug line-clamp-2">
                    {desc}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* [탭 3] 차트 아카데미 & 산업 테마 밸류체인 */}
        {activeTab === 'academy' && (
          <div className="space-y-6">
            {/* 차트 아카데미 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span className="text-emerald-400">📘</span>
                  <span>1타 강사 차트·보조지표 실전 아카데미</span>
                </h3>
                <Link
                  href="/theory"
                  className="text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg transition-all flex items-center gap-1"
                >
                  <span>강의 전체보기</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {latestTheoryPosts.slice(0, 4).map((post: any) => {
                  const slug = post.slug || post.id;
                  return (
                    <Link
                      key={slug}
                      href={`/theory/${encodeURIComponent(slug)}`}
                      className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="space-y-1">
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          차트 스터디
                        </span>
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                          {post.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        강의 읽기 →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 산업 밸류체인 */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="text-amber-400">⚡</span>
                <span>주요 산업·테마 밸류체인 심층 리서치</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {sectorResearchLinks.map(({ href, title, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-amber-500/40 transition-all group block"
                  >
                    <h4 className="text-white text-xs font-bold group-hover:text-amber-300 transition-colors truncate">
                      {title}
                    </h4>
                    <p className="text-gray-400 text-[10px] mt-0.5 truncate">
                      {desc}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* [탭 4] 자주 묻는 질문 FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              스마트 투자 비서의 데이터 수집 원칙, 공공데이터 출처 및 법적 기준 안내입니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {faqs.map(({ q, a }, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
                  <h4 className="text-white text-xs sm:text-[13px] font-bold flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black shrink-0">
                      Q
                    </span>
                    <span>{q}</span>
                  </h4>
                  <p className="text-gray-300 text-[11px] leading-relaxed pl-6">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
