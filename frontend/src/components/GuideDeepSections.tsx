import Link from 'next/link';
import { GUIDE_DEEP_CONTENT } from '@/lib/guideDeepContent';
import { GUIDE_TERMS } from '@/lib/guideTerms';

interface GuideDeepSectionsProps {
  slug: string;
}

export default function GuideDeepSections({ slug }: GuideDeepSectionsProps) {
  const deep = GUIDE_DEEP_CONTENT[slug];
  if (!deep) return null;

  const termMeta = GUIDE_TERMS.find((t) => t.slug === slug);
  const relatedTerms = deep.relatedSlugs
    .map((s) => GUIDE_TERMS.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: deep.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* 1. 핵심 공식 & 구간별 해석 기준표 */}
      <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-7 md:p-8 space-y-5">
        <h2 className="text-xl md:text-2xl font-bold text-white">{deep.formulaTitle}</h2>
        <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4 md:p-5 text-center">
          <p className="text-blue-200 font-mono text-sm md:text-base font-bold break-keep">
            {deep.formulaText}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {deep.benchmarks.map((b, idx) => (
            <div key={idx} className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-1.5">
              <div className="text-xs font-black text-blue-300">{b.level}</div>
              <div className="text-xs font-bold text-amber-300">{b.range}</div>
              <p className="text-xs text-gray-300 leading-relaxed break-keep">{b.meaning}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 실전 숫자 시뮬레이션 사례 */}
      <section className="bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-7 md:p-8 space-y-3">
        <h2 className="text-xl md:text-2xl font-bold text-emerald-300">{deep.simulationTitle}</h2>
        <p className="text-base text-gray-200 leading-loose break-keep">{deep.simulationBody}</p>
      </section>

      {/* 3. 실전 분석 시 반드시 확인할 체크포인트 3가지 */}
      <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-7 md:p-8 space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-white">
          실전 분석 체크포인트 3가지
        </h2>
        <ol className="space-y-4">
          {deep.checkpoints.map((cp, idx) => (
            <li key={idx} className="rounded-2xl bg-black/35 border border-white/5 p-4 md:p-5 space-y-1.5">
              <div className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black shrink-0">
                  {idx + 1}
                </span>
                <span>{cp.title}</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed pl-8 break-keep">{cp.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4. 자주 묻는 질문 (FAQ) */}
      <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-7 md:p-8 space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-white">
          {termMeta ? `${termMeta.title} 자주 묻는 질문 (FAQ)` : '자주 묻는 질문 (FAQ)'}
        </h2>
        <div className="space-y-3.5">
          {deep.faqs.map((faq, idx) => (
            <div key={idx} className="rounded-2xl bg-zinc-900/70 border border-white/10 p-5 space-y-2">
              <h3 className="text-sm md:text-base font-bold text-white flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black shrink-0">
                  Q
                </span>
                <span className="break-keep">{faq.q}</span>
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed pl-7 break-keep">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 함께 공부하면 좋은 연관 용어 & 아카데미 연결 */}
      {relatedTerms.length > 0 && (
        <section className="bg-indigo-950/20 border border-indigo-500/20 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg md:text-xl font-bold text-white">함께 읽으면 이해가 2배 빨라지는 연관 용어</h2>
            <Link href="/economics" className="text-xs font-bold text-amber-300 hover:underline">
              매일 1일 1경제학 공부방 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedTerms.map((rt) => (
              <Link
                key={rt.slug}
                href={`/guide/${rt.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-blue-400/50 transition-all block group"
              >
                <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  {rt.emoji} {rt.title}
                </div>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed break-keep">{rt.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
