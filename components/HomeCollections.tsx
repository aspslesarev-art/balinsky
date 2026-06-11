'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BedDouble, Square, ArrowRight } from 'lucide-react'
import type { CollTier, CollItem } from '@/lib/home-collections'
import type { Lang } from '@/lib/i18n'

function fmtPrice(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1000) return `$${Math.round(n / 1000)}k`
  return `$${n}`
}

function tierLabel(t: CollTier, lang: Lang): string {
  const max = `$${Math.round(t.max / 1000)}k`
  if (t.type === 'villa') return lang === 'en' ? `Villas up to ${max}` : `Виллы до ${max}`
  return lang === 'en' ? `Apartments up to ${max}` : `Апартаменты до ${max}`
}

function chip(active: boolean): string {
  return (
    'shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ' +
    (active
      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
      : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]')
  )
}

function CollCard({ it, href }: { it: CollItem; href: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="relative w-full aspect-[4/3] bg-[var(--color-search-bg)]">
        {it.cover ? (
          <Image src={it.cover} alt={it.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
        )}
        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/65 text-white text-[13px] font-semibold backdrop-blur-sm">
          {fmtPrice(it.priceUsd)}
        </div>
      </div>
      <div className="p-3">
        <div className="text-[13.5px] font-medium leading-snug line-clamp-2 min-h-[2.6em]">{it.title}</div>
        <div className="mt-1.5 flex items-center gap-3 text-[12px] text-[var(--color-text-muted)]">
          {it.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble size={13} /> {it.bedrooms}</span>}
          {it.area != null && <span className="inline-flex items-center gap-1"><Square size={12} /> {it.area} м²</span>}
        </div>
      </div>
    </Link>
  )
}

export function HomeCollections({ tiers, lang = 'ru' }: { tiers: CollTier[]; lang?: Lang }) {
  const [ti, setTi] = useState(0)
  const [dslug, setDslug] = useState(tiers[0]?.districts[0]?.slug ?? '')

  if (!tiers.length) return null
  const tier = tiers[Math.min(ti, tiers.length - 1)]
  const district = tier.districts.find(d => d.slug === dslug) ?? tier.districts[0]

  const root = tier.type === 'villa'
    ? (lang === 'en' ? '/en/villas' : '/ru/villy')
    : (lang === 'en' ? '/en/apartments' : '/ru/apartamenty')
  const seeAllHref = `${root}?price_max=${tier.max}`

  return (
    <div>
      {/* Budget-tier chips */}
      <div className="flex gap-2 overflow-x-auto -mx-6 px-6 max-w-none md:mx-0 md:px-0 md:flex-wrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tiers.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTi(i); setDslug(t.districts[0]?.slug ?? '') }}
            className={chip(i === ti)}
          >
            {tierLabel(t, lang)}
          </button>
        ))}
      </div>

      {/* District chips */}
      <div className="mt-3 flex gap-2 overflow-x-auto -mx-6 px-6 max-w-none md:mx-0 md:px-0 md:flex-wrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tier.districts.map(d => (
          <button
            key={d.slug}
            type="button"
            onClick={() => setDslug(d.slug)}
            className={chip(d.slug === district.slug)}
          >
            {d.name}
            <span className={d.slug === district.slug ? 'opacity-90' : 'text-[var(--color-text-muted)]'}>· {d.items.length}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* slug is NOT unique — multiple physical units of one project share a
            slug — so include the index, else duplicate keys break React's
            reconciliation and the cards don't refresh on district switch. */}
        {district.items.map((it, i) => (
          <CollCard key={`${tier.key}:${district.slug}:${it.slug}:${i}`} it={it} href={`${root}/o/${it.slug}`} />
        ))}
      </div>

      <div className="mt-5">
        <Link href={seeAllHref} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] hover:gap-2.5 transition-all no-underline">
          {lang === 'en' ? `All ${tierLabel(tier, lang).toLowerCase()}` : `Все ${tierLabel(tier, lang).toLowerCase()}`}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
