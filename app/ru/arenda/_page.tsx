// Shared rental list shell + metadata for /ru/arenda and /en/rental.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadFreshRental } from '@/lib/rental'
import { RentalCatalog } from './_catalog'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

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
  id: {
    title: 'Sewa bulanan vila dan apartemen di Bali | Balinsky',
    description: 'Vila, apartemen, dan rumah untuk sewa jangka panjang di Bali — Canggu, Ubud, Seminyak, Bukit, dan area lainnya. Diperbarui setiap hari.',
    h1: 'Sewa bulanan',
    sub: 'Vila dan apartemen untuk sewa jangka panjang — diperbarui otomatis',
    loading: 'Memuat…',
  },
  fr: {
    title: 'Location mensuelle de villas et appartements à Bali | Balinsky',
    description: 'Villas, appartements et maisons en location longue durée à Bali — Canggu, Ubud, Seminyak, Bukit et autres quartiers. Mis à jour quotidiennement.',
    h1: 'Location longue durée',
    sub: 'Villas et appartements en location longue durée — mise à jour automatique',
    loading: 'Chargement…',
  },
  de: {
    title: 'Langzeitmiete von Villen und Apartments auf Bali | Balinsky',
    description: 'Villen, Apartments und Häuser zur Langzeitmiete auf Bali — Canggu, Ubud, Seminyak, Bukit und weitere Gebiete. Täglich aktualisiert.',
    h1: 'Langzeitmiete',
    sub: 'Villen und Apartments zur Langzeitmiete — automatisch aktualisiert',
    loading: 'Wird geladen…',
  },
  zh: {
    title: '巴厘岛别墅和公寓长租 | Balinsky',
    description: '巴厘岛长租别墅、公寓和房屋——Canggu、Ubud、Seminyak、Bukit 及其他地区。每日更新。',
    h1: '长租',
    sub: '长租别墅和公寓——自动更新',
    loading: '加载中…',
  },
  nl: {
    title: 'Langdurige verhuur van villa\'s en appartementen op Bali | Balinsky',
    description: 'Villa\'s, appartementen en huizen voor langdurige verhuur op Bali — Canggu, Ubud, Seminyak, Bukit en andere gebieden. Dagelijks bijgewerkt.',
    h1: 'Langdurige verhuur',
    sub: 'Villa\'s en appartementen voor langdurige verhuur — automatisch bijgewerkt',
    loading: 'Laden…',
  },
  ban: {
    title: 'Séwa jangka panjang vila lan apartemen ring Bali | Balinsky',
    description: 'Vila, apartemen, lan umah kanggo séwa jangka panjang ring Bali — Canggu, Ubud, Seminyak, Bukit lan wewidangan lianan. Kaanyarin nyabran rahina.',
    h1: 'Séwa jangka panjang',
    sub: 'Vila lan apartemen kanggo séwa jangka panjang — kaanyarin otomatis',
    loading: 'Ngemuat…',
  },
} as const

export function generateRentalListMetadata(lang: Lang): Metadata {
  const c = pickCopy(COPY, lang)
  const ruPath = '/ru/arenda'
  const enPath = '/en/rental'
  const path = switchLangPath(ruPath, lang)
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
  const c = pickCopy(COPY, lang)
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
