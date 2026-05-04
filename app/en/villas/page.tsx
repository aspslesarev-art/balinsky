// English-language villa catalog (pilot — slim).
//
// No filter sidebar, no map, no district sub-pages yet. Just a grid of
// cards in EN labels, linking to /en/villas/o/<slug>. The full
// filter/sort UI from the RU catalog will be ported once the page-type
// chrome stabilises.

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { tField, t } from '@/lib/i18n'

export const revalidate = 600
export const metadata = {
  title: 'Villas in Bali — Balinsky',
  description: 'Curated catalogue of villas for sale in Bali, Indonesia.',
  alternates: {
    canonical: 'https://balinsky.info/en/villas',
    languages: {
      ru: 'https://balinsky.info/ru/villy',
      en: 'https://balinsky.info/en/villas',
    },
  },
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Row = { airtable_id: string; data: Record<string, unknown> }

function unwrap(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v)) { for (const x of v) { const s = unwrap(x); if (s) return s } return null }
  if (typeof v === 'object' && 'value' in (v as object)) return unwrap((v as { value: unknown }).value)
  return null
}
function numberOrNull(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = unwrap(v); if (!s) return null
  const n = Number(s.replace(/\s+/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const _loadCatalog = unstable_cache(
  async () => {
    const [{ data: rows }, manifestResp] = await Promise.all([
      sb.from('raw_villas').select('airtable_id, data').limit(5000),
      fetch(PHOTO_MANIFEST_URL, { next: { revalidate: 600 } }),
    ])
    const manifest: Record<string, string[]> =
      manifestResp.ok ? await manifestResp.json() : {}

    type Card = {
      id: string
      slug: string
      title: string
      district: string | null
      bedrooms: number | null
      area: number | null
      priceUsd: number | null
      photo: string | null
    }
    const out: Card[] = []
    for (const r of (rows ?? []) as Row[]) {
      // Match the RU catalog's filter: published only.
      if (r.data['Опубликовать'] !== true) continue
      const slug = unwrap(r.data['SEO:Slug']); if (!slug) continue
      const title =
        tField(r.data, 'ИИ Имя', 'en') ??
        tField(r.data, 'SEO:Title', 'en') ??
        slug
      const district = unwrap(r.data['Location 2']) ?? unwrap(r.data['Location'])
      const photo = (manifest[r.airtable_id] ?? [])[0] ?? null
      out.push({
        id: r.airtable_id,
        slug,
        title,
        district,
        bedrooms: numberOrNull(r.data['Комнаты']),
        area: numberOrNull(r.data['Площадь']),
        priceUsd: numberOrNull(r.data['price'] ?? r.data['Цена']),
        photo,
      })
    }
    // Cheap sort: priced first, descending; missing-price at the end.
    out.sort((a, b) => {
      if (a.priceUsd != null && b.priceUsd == null) return -1
      if (a.priceUsd == null && b.priceUsd != null) return 1
      return (b.priceUsd ?? 0) - (a.priceUsd ?? 0)
    })
    return out.slice(0, 60)
  },
  ['en-villa-catalog'],
  { revalidate: 600 },
)

export default async function EnVillasCatalog() {
  const items = await _loadCatalog()

  return (
    <>
      <Header active="villy" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: t('breadcrumbs.home',   'en'), href: '/en' },
          { label: t('breadcrumbs.villas', 'en') },
        ]} />

        <h1 className="pt-4 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          Villas in Bali
        </h1>
        <p className="text-[14px] text-[var(--color-text-muted)] mb-6">
          {items.length} listings · prices in USD
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(it => (
            <li key={it.id}>
              <Link
                href={`/en/villas/o/${it.slug}`}
                className="block rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden hover:border-[var(--color-text-muted)] transition-colors no-underline"
              >
                <div className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
                  {it.photo && (
                    <Image
                      src={it.photo}
                      alt={it.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-[16px] font-semibold text-[#111827] leading-snug mb-1 line-clamp-2">
                    {it.title}
                  </h2>
                  <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)] mb-2">
                    {it.district && <span>{it.district}</span>}
                    {it.bedrooms != null && <span>· {it.bedrooms} {t('facts.bedrooms', 'en').toLowerCase()}</span>}
                    {it.area != null && <span>· {it.area} m²</span>}
                  </div>
                  {it.priceUsd != null && (
                    <div className="text-[18px] font-semibold text-[#111827]">
                      ${Math.round(it.priceUsd).toLocaleString('en-US')}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-10 text-center text-[13px] text-[var(--color-text-muted)]">
            {t('misc.empty', 'en')}
          </div>
        )}

        <p className="text-[13px] text-[var(--color-text-muted)] my-10">
          Russian catalogue:{' '}
          <Link href="/ru/villy" className="underline hover:text-[#1A1F1C]">
            balinsky.info/ru/villy
          </Link>
        </p>
      </PageContainer>
    </>
  )
}
