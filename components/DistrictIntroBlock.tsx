// Renders the rich SEO intro shown above the property grid on
// single-district filter pages (`/ru/villy/canggu`, `/en/villas/uluwatu`
// etc.). Only mounts when getDistrictCopy returns a payload; the
// catalog falls back to its default header otherwise.

import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import type { DistrictCopy } from '@/lib/districts'
import type { Lang } from '@/lib/i18n'

export function DistrictIntroBlock({
  copy,
  lang,
  totalCount,
}: {
  copy: DistrictCopy
  lang: Lang
  totalCount: number
  sectionRoot: string
}) {
  const pillarHref = lang === 'en' ? '/en/bali-property-investment' : '/ru/investicii-v-nedvizhimost-bali'
  return (
    <section className="mt-2 mb-8 max-w-4xl">
      <p className="text-[16px] md:text-[17px] text-[var(--color-text-muted)] leading-relaxed mb-5">
        {copy.hero}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {copy.highlights.map(h => (
          <div key={h.label} className="rounded-xl border border-[var(--color-border)] p-3 bg-white">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{h.label}</div>
            <div className="text-[16px] font-semibold text-[#111827]">{h.value}</div>
          </div>
        ))}
      </div>

      <details className="rounded-2xl border border-[var(--color-border)] p-4 bg-white mb-6 [&[open]>summary]:mb-3">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-[15px] font-semibold text-[#111827]">
          <span>{lang === 'en' ? `About ${copy.name} — district guide` : `О районе ${copy.name} — гид инвестора`}</span>
          <ChevronRight size={18} className="shrink-0 transition-transform [details[open]_&]:rotate-90" />
        </summary>
        <div className="space-y-3 text-[14px] leading-[1.7] text-[#1f2937]">
          {copy.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {copy.bestFor.map(tag => (
            <span key={tag} className="inline-block text-[12px] text-[var(--color-text-muted)] bg-[var(--color-search-bg)] rounded-full px-3 py-1">{tag}</span>
          ))}
        </div>
        <div className="mt-4 text-[13px]">
          <Link href={pillarHref} className="inline-flex items-center gap-1 text-[var(--color-primary)] no-underline hover:underline">
            <TrendingUp size={14} />
            {lang === 'en' ? 'Full Bali investment guide' : 'Полный гайд по инвестициям на Бали'}
          </Link>
        </div>
      </details>

      <p className="text-[14px] text-[var(--color-text-muted)]">
        {lang === 'en'
          ? `Currently ${totalCount} properties available in ${copy.name}. Each listing passed our editorial QA — PBG, SLF, developer registration and on-the-ground verification.`
          : `Сейчас в каталоге ${totalCount} объектов в районе ${copy.name}. Каждый прошёл редакторский QA — PBG, SLF, регистрация застройщика и проверка на месте.`}
      </p>
    </section>
  )
}
