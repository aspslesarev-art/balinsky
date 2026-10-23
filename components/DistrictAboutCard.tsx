// Compact "about the district" card shown on listing detail pages
// (villa / apartment / complex). Gives the visitor a short orientation
// on the surrounding district and a link into the full district hub
// (/ru/villy/<slug> etc.), which carries the rich guide + all listings.
// Pure presentation — copy comes from getDistrictCopy(), the href is
// pre-built by the caller from a DISTRICT_TO_SLUG-validated slug.

import { ListingMap } from './ListingMap'
import { LazyMount } from './LazyMount'
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
import type { DistrictCopy } from '@/lib/districts'
import { pickCopy, type Lang } from '@/lib/i18n'

type Kind = 'villa' | 'apartment' | 'complex'

const LABELS = {
  ru: {
    eyebrow: 'О районе',
    aerialCaption: 'Спутник Esri, Maxar · вид под углом',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Все виллы в районе ${name}`
      : kind === 'apartment' ? `Все апартаменты в районе ${name}`
      : `Все комплексы в районе ${name}`,
  },
  en: {
    eyebrow: 'About the district',
    aerialCaption: 'Esri, Maxar satellite · angled view',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `All villas in ${name}`
      : kind === 'apartment' ? `All apartments in ${name}`
      : `All complexes in ${name}`,
  },
  id: {
    eyebrow: 'Tentang wilayah',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Semua vila di ${name}`
      : kind === 'apartment' ? `Semua apartemen di ${name}`
      : `Semua kompleks hunian di ${name}`,
  },
  fr: {
    eyebrow: 'À propos du quartier',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Toutes les villas à ${name}`
      : kind === 'apartment' ? `Tous les appartements à ${name}`
      : `Toutes les résidences à ${name}`,
  },
  de: {
    eyebrow: 'Über die Lage',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Alle Villen in ${name}`
      : kind === 'apartment' ? `Alle Apartments in ${name}`
      : `Alle Wohnanlagen in ${name}`,
  },
  zh: {
    eyebrow: '关于区域',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `${name}的所有别墅`
      : kind === 'apartment' ? `${name}的所有公寓`
      : `${name}的所有住宅区`,
  },
  nl: {
    eyebrow: 'Over de wijk',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Alle villa's in ${name}`
      : kind === 'apartment' ? `Alle appartementen in ${name}`
      : `Alle wooncomplexen in ${name}`,
  },
  ban: {
    eyebrow: 'Indik wewidangan',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Sami vila ring ${name}`
      : kind === 'apartment' ? `Sami apartemen ring ${name}`
      : `Sami kompleks ring ${name}`,
  },
  pl: {
    eyebrow: 'O rejonie',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Wszystkie wille w ${name}`
      : kind === 'apartment' ? `Wszystkie apartamenty w ${name}`
      : `Wszystkie kompleksy w ${name}`,
  },
  uk: {
    eyebrow: 'Про район',
    cta: (kind: Kind, name: string) =>
      kind === 'villa' ? `Усі вілли в ${name}`
      : kind === 'apartment' ? `Усі апартаменти в ${name}`
      : `Усі комплекси в ${name}`,
  },
} as const

export function DistrictAboutCard({
  copy,
  lang,
  kind,
  hubHref,
  aerial,
}: {
  copy: DistrictCopy
  lang: Lang
  kind: Kind
  hubHref: string
  /** Вид района «как с дрона» справа от текста (макет «О районе», B — 23.10.2026). */
  aerial?: { lat: number; lng: number } | null
}) {
  const L = pickCopy(LABELS, lang)
  return (
    <section className="mb-10">
      <div className={`rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6 ${aerial ? 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center lg:gap-8' : ''}`}>
        <div className="min-w-0">
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
        {aerial && (
          <div className="flex flex-col gap-1.5">
            <LazyMount fallback={<div className="h-[300px] rounded-xl bg-[var(--color-search-bg)]" />}>
              <ListingMap lat={aerial.lat} lng={aerial.lng} name={copy.name} aerial className="h-[300px]" />
            </LazyMount>
            <span className="text-[12px] text-[var(--color-text-muted)]">{L.aerialCaption}</span>
          </div>
        )}
      </div>
    </section>
  )
}
