"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Newspaper, BookOpen, Layers, ShieldCheck, ChevronRight, GraduationCap, LayoutGrid } from 'lucide-react';

interface EditorialArchiveHubProps {
  featuredBlogPosts: any[];
  latestEconomicsPosts?: any[];
  latestTheoryPosts: any[];
  investmentGuides: { href: string; title: string; desc: string }[];
  sectorResearchLinks: { href: string; title: string; desc: string }[];
  faqs: { q: string; a: string }[];
}

export default function EditorialArchiveHub({
  featuredBlogPosts,
  latestEconomicsPosts = [],
  latestTheoryPosts,
  investmentGuides,
  sectorResearchLinks,
  faqs,
}: EditorialArchiveHubProps) {
  // 기본값을 'all'로 두어 검색엔진 크롤러와 첫 방문자 모두에게 모든 핵심 에디토리얼 콘텐츠가 SSR 초기 HTML에 온전히 노출되도록 보장
  const [activeTab, setActiveTab] = useState<'all' | 'columns' | 'economics' | 'guides' | 'academy' | 'faq'>('all');

  const show = (section: 'columns' | 'economics' | 'guides' | 'academy' | 'faq') =>
    activeTab === 'all' || activeTab === section;

  return (
    <div className="space-y-10">
      {/* 1. 에디토리얼 상단 헤더 & 필터 칩 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-black">
              RESEARCH JOURNAL &amp; KNOWLEDGE HUB
            </span>
            <span className="text-xs text-gray-400">
              편집책임자 윤희원 · 공공데이터 검증 금융 교육 아카이브
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            금융 리서치 &amp; 주식 투자 지식 아카이브
          </h2>
        </div>

        {/* 섹션 필터 버튼 */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-white/10 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>전체 보기</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('columns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'columns'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>심층 칼럼 ({featuredBlogPosts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('economics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'economics'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>1일 1경제학</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'guides'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>용어 백과 (46선)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('academy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'academy'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>차트·밸류체인</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>리서치 FAQ</span>
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {/* [섹션 1] 심층 금융 리서치 칼럼 */}
        {show('columns') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span className="text-blue-400">📰</span>
                  <span>최신 거시경제 &amp; 증시 심층 리서치 칼럼</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  글로벌 통화정책, 국내외 실적 시즌, 업종별 수급 구조를 깊이 있게 분석한 오리지널 칼럼입니다.
                </p>
              </div>
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
                  .slice(0, 110);
                const postSlug = post.slug || post.id;
                return (
                  <Link
                    key={postSlug}
                    href={`/blog/${encodeURIComponent(postSlug)}`}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3 group"
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
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                        {plainDesc}...
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                      칼럼 전문 읽기 →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* [섹션 2] 매일 1일 1경제학 공부방 */}
        {show('economics') && latestEconomicsPosts.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span className="text-amber-400">🎓</span>
                  <span>매일 1일 1경제학 공부방 (180일 왕초보 커리큘럼)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  주제가 중복되지 않게 매일 하나씩 일상 비유·숫자 비교·3지선다 복습 퀴즈로 배우는 경제학 강의입니다.
                </p>
              </div>
              <Link
                href="/economics"
                className="text-xs font-bold text-amber-200 hover:text-white bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0"
              >
                <span>공부방 전체보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {latestEconomicsPosts.map((lesson: any) => {
                const slug = lesson.slug || lesson.id;
                return (
                  <Link
                    key={slug}
                    href={`/economics/${encodeURIComponent(slug)}`}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-amber-500/15 hover:border-amber-400/45 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Day {lesson.dayNumber || 1}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate">
                          {lesson.categoryLabel || '기초 경제학'}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                        {lesson.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                        {lesson.oneLineDef || lesson.summary || '일상 비유와 그림으로 5분 만에 이해하는 생활 경제학 강의입니다.'}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400">강의 &amp; 퀴즈 풀기 →</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* [섹션 3] 46대 필수 주식 용어 백과사전 */}
        {show('guides') && (
          <section className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span className="text-purple-400">📚</span>
                  <span>46대 필수 주식 용어 백과사전 (재무·밸류에이션·공시)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  PER·PBR·ROE 기업 가치평가부터 DART 전자공시 독해, FOMC 금리 정책까지 계산 공식과 실전 사례로 정리했습니다.
                </p>
              </div>
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
                  className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-purple-500/40 transition-all group block"
                >
                  <h4 className="text-white text-xs sm:text-[13px] font-bold group-hover:text-purple-300 transition-colors truncate">
                    {title}
                  </h4>
                  <p className="text-gray-400 text-[11px] mt-1 leading-snug line-clamp-2">
                    {desc}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* [섹션 4] 차트 아카데미 & 산업 밸류체인 */}
        {show('academy') && (
          <section className="space-y-6 pt-6 border-t border-white/10">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <span className="text-emerald-400">📘</span>
                  <span>차트·보조지표 &amp; 재무 분석 실전 아카데미</span>
                </h3>
                <Link
                  href="/theory"
                  className="text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0"
                >
                  <span>강의 전체보기</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {latestTheoryPosts.slice(0, 6).map((post: any) => {
                  const slug = post.slug || post.id;
                  return (
                    <Link
                      key={slug}
                      href={`/theory/${encodeURIComponent(slug)}`}
                      className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-2 group"
                    >
                      <div className="space-y-1">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          투자 이론 스터디
                        </span>
                        <h4 className="text-xs sm:text-[13px] font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                          {post.title}
                        </h4>
                        {post.summary && (
                          <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                            {post.summary}...
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400">강의 읽기 →</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                <span className="text-amber-400">⚡</span>
                <span>20대 핵심 산업·섹터 밸류체인 심층 리서치</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {sectorResearchLinks.map(({ href, title, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-amber-500/40 transition-all group block"
                  >
                    <h4 className="text-white text-xs sm:text-[13px] font-bold group-hover:text-amber-300 transition-colors truncate">
                      {title}
                    </h4>
                    <p className="text-gray-400 text-[11px] mt-1 leading-snug line-clamp-2">
                      {desc}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* [섹션 5] 자주 묻는 질문 FAQ & 편집 원칙 */}
        {show('faq') && (
          <section className="space-y-4 pt-6 border-t border-white/10">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span className="text-sky-400">🛡️</span>
                <span>스마트 투자 비서 편집 기준 &amp; 자주 묻는 질문 (FAQ)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                공공데이터 수집 원칙, 팩트체크 기준 및 자본시장법 준수 안내입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {faqs.map(({ q, a }, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
                  <h4 className="text-white text-xs sm:text-sm font-bold flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black shrink-0">
                      Q
                    </span>
                    <span>{q}</span>
                  </h4>
                  <p className="text-gray-300 text-xs leading-relaxed pl-6">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
