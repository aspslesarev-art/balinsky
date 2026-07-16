// Compact "about the district" card shown on listing detail pages
// (villa / apartment / complex). Gives the visitor a short orientation
// on the surrounding district and a link into the full district hub
// (/ru/villy/<slug> etc.), which carries the rich guide + all listings.
// Pure presentation — copy comes from getDistrictCopy(), the href is
// pre-built by the caller from a DISTRICT_TO_SLUG-validated slug.

import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
import type { DistrictCopy } from '@/lib/districts'
import { pickCopy, type Lang } from '@/lib/i18n'

type Kind = 'villa' | 'apartment' | 'complex'

const LABELS = {
  ru: {
    eyebrow: 'О районе',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Все виллы в районе ${name}`
      : kind === 'apartment' ? `Все апартаменты в районе ${name}`
      : `Все комплексы в районе ${name}`,
  },
  en: {
    eyebrow: 'About the district',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `All villas in ${name}`
      : kind === 'apartment' ? `All apartments in ${name}`
      : `All complexes in ${name}`,
  },
} as const

export function DistrictAboutCard({
  copy,
  lang,
  kind,
  hubHref,
}: {
  copy: DistrictCopy
  lang: Lang
  kind: Kind
  hubHref: string
}) {
  const L = pickCopy(LABELS, lang)
  return (
    <section className="mb-10">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          <MapPin size={14} className="text-[var(--color-primary)]" /> {L.eyebrow} · {copy.name}
        </div>
        <p className="text-[15px] md:text-[16px] text-[#1f2937] leading-relaxed mb-3">{copy.hero}</p>
        {copy.paragraphs[0] && (
          <p className="text-[14px] text-[var(--color-text-muted)] leading-[1.7] mb-4">{copy.paragraphs[0]}</p>
        )}
        {copy.bestFor.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {copy.bestFor.map(t => (
              <span key={t} className="text-[12px] text-[var(--color-text-muted)] bg-[var(--color-search-bg)] rounded-full px-3 py-1">
                {t}
              </span>
            ))}
          </div>
        )}
        <Link
          href={hubHref}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] no-underline hover:gap-2.5 transition-all"
        >
          {L.cta(kind, copy.name)} <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}
