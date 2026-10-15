"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { TermItem } from '@/lib/guideTerms';

interface GuideSearchFilterProps {
  terms: TermItem[];
  categories: string[];
}

export default function GuideSearchFilter({ terms, categories }: GuideSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

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
  }, [terms, selectedCategory, searchQuery]);

  return (
    <>
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
    </>
  );
}
