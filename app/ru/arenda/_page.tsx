// Shared rental list shell + metadata for /ru/arenda and /en/rental.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadFreshRental } from '@/lib/rental'
import { RentalCatalog } from './_catalog'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    title: 'Помесячная аренда вилл и апартаментов на Бали | Balinsky',
    description: 'Виллы, апартаменты и дома в долгосрочную аренду на Бали — Чангу, Убуд, Семиньяк, Букит и другие районы. Подборка обновляется ежедневно.',
    h1: 'Помесячная аренда',
    sub: 'Виллы и апартаменты в долгосрочную аренду — обновляется автоматически',
    loading: 'Загрузка…',
  },
  en: {
    title: 'Long-term villa and apartment rental in Bali | Balinsky',
    description: 'Villas, apartments and houses for long-term rent in Bali — Canggu, Ubud, Seminyak, Bukit and other districts. Updated daily.',
    h1: 'Long-term rental',
    sub: 'Villas and apartments for long-term rent — updates automatically',
    loading: 'Loading…',
  },
} as const

export function generateRentalListMetadata(lang: Lang): Metadata {
  const c = COPY[lang]
  const ruPath = '/ru/arenda'
  const enPath = '/en/rental'
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: path,
      languages: {
        ru: `https://balinsky.info${ruPath}`,
        en: `https://balinsky.info${enPath}`,
        'x-default': `https://balinsky.info${ruPath}`,
      },
    },
  }
}

export type RentalSP = Record<string, string | string[] | undefined>
export function parseRentalSP(sp: RentalSP) {
  const list = (v: string | string[] | undefined) => v == null
    ? []
    : (Array.isArray(v) ? v : [v]).flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
  const num = (v: string | string[] | undefined): number | null => {
    const s = Array.isArray(v) ? v[0] : v
    if (!s) return null
    const n = Number(s.replace(/[^\d]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return {
    districts: list(sp.location),
    bedrooms: list(sp.bedrooms),
    priceMin: num(sp.priceMin),
    priceMax: num(sp.priceMax),
  }
}

export async function RentalListShell({ initial, lang }: {
  initial: ReturnType<typeof parseRentalSP>
  lang: Lang
}) {
  const items = await loadFreshRental(lang)
  const c = COPY[lang]
  return (
    <>
      <Header active="arenda" />
      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          {c.h1}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">{c.sub}</div>

        <Suspense fallback={<div className="text-[14px] text-[var(--color-text-muted)]">{c.loading}</div>}>
          <RentalCatalog items={items} initial={initial} lang={lang} />
        </Suspense>

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
