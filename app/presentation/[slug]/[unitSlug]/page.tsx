// Per-unit page on presentation.estate — agent grade.
// Shows photos, key facts, description and a ready-made share post.
// Linked from the dev page's chessboard / "Все юниты" filter view.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { ChevronLeft, MapPin, BedDouble, Maximize2, Building2 } from 'lucide-react'
import { CopyPostButton } from '../_copy-button'

export const dynamic = 'force-dynamic'
export const revalidate = 300

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type DevRow = { airtable_id: string; data: Record<string, unknown>; logo_url: string | null }
type ComplexRow = { airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }
type UnitRow = { airtable_id: string; data: Record<string, unknown> }

// Shared cache keys with the dev page — both files reference the same
// cached payload, so re-rendering the unit page after the dev page is
// effectively free.
const _loadDevelopers = unstable_cache(
  async (): Promise<DevRow[]> => {
    const { data, error } = await sb.from('raw_developers').select('airtable_id, data, logo_url').limit(200)
    if (error) throw new Error(`raw_developers: ${error.message}`)
    return (data ?? []) as DevRow[]
  },
  ['presentation-developers-v2'],
  { revalidate: 600 },
)

const _loadComplexes = unstable_cache(
  async (): Promise<ComplexRow[]> => {
    const rows: ComplexRow[] = []
    for (let from = 0; from < 1000; from += 200) {
      const { data, error } = await sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').range(from, from + 199)
      if (error) throw new Error(`raw_complexes: ${error.message}`)
      if (!data || data.length === 0) break
      rows.push(...(data as ComplexRow[]))
      if (data.length < 200) break
    }
    return rows
  },
  ['presentation-complexes-v2'],
  { revalidate: 600 },
)

const _loadApartments = unstable_cache(
  async (): Promise<UnitRow[]> => {
    const rows: UnitRow[] = []
    for (let from = 0; from < 4000; from += 200) {
      const { data, error } = await sb.from('raw_apartments').select('airtable_id, data').range(from, from + 199)
      if (error) throw new Error(`raw_apartments: ${error.message}`)
      if (!data || data.length === 0) break
      rows.push(...(data as UnitRow[]))
      if (data.length < 200) break
    }
    return rows
  },
  ['presentation-apartments-v2'],
  { revalidate: 600 },
)

const _loadVillas = unstable_cache(
  async (): Promise<UnitRow[]> => {
    const rows: UnitRow[] = []
    for (let from = 0; from < 4000; from += 200) {
      const { data, error } = await sb.from('raw_villas').select('airtable_id, data').range(from, from + 199)
      if (error) throw new Error(`raw_villas: ${error.message}`)
      if (!data || data.length === 0) break
      rows.push(...(data as UnitRow[]))
      if (data.length < 200) break
    }
    return rows
  },
  ['presentation-villas-v2'],
  { revalidate: 600 },
)

const PHOTO_MANIFEST_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`
async function loadPhotoManifest(bucket: string): Promise<Record<string, string[]>> {
  try {
    const r = await fetch(`${PHOTO_MANIFEST_BASE}/${bucket}/_manifest.json`, { next: { revalidate: 600 } })
    if (!r.ok) return {}
    return await r.json() as Record<string, string[]>
  } catch { return {} }
}

function fs(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return fs((v as Record<string, unknown>).value)
  return null
}
function num(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.\-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function findDev(devs: DevRow[], slug: string): DevRow | undefined {
  const exact = devs.find(d => fs(d.data['SEO:Slug']) === slug)
  if (exact) return exact
  return devs.find(d => {
    const s = fs(d.data['SEO:Slug'])
    return s != null && s.startsWith(slug + '-')
  })
}

type Params = Promise<{ slug: string; unitSlug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { unitSlug } = await params
  return {
    title: `${unitSlug} · presentation.estate`,
    robots: {
      index: false, follow: false, nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  }
}

export default async function UnitPage({ params }: { params: Params }) {
  const { slug, unitSlug } = await params

  const [devs, allVillas, allApts, villaPhotos, aptPhotos] = await Promise.all([
    _loadDevelopers().catch(() => [] as DevRow[]),
    _loadVillas().catch(() => [] as UnitRow[]),
    _loadApartments().catch(() => [] as UnitRow[]),
    loadPhotoManifest('villa-photos'),
    loadPhotoManifest('apartment-photos'),
  ])

  const dev = findDev(devs, slug)
  if (!dev) notFound()
  const devName = fs(dev.data['Developer']) ?? slug
  const fullSlug = fs(dev.data['SEO:Slug']) ?? slug

  let kind: 'villa' | 'apartment' | null = null
  let row: UnitRow | undefined
  let photos: string[] = []
  for (const r of allVillas) {
    if (r.data['Опубликовать'] !== true) continue
    if (fs(r.data['SEO:Slug']) === unitSlug) { row = r; kind = 'villa'; photos = villaPhotos[r.airtable_id] ?? []; break }
  }
  if (!row) {
    for (const r of allApts) {
      if (r.data['Опубликовать'] !== true) continue
      if (fs(r.data['SEO:Slug']) === unitSlug) { row = r; kind = 'apartment'; photos = aptPhotos[r.airtable_id] ?? []; break }
    }
  }
  if (!row || !kind) notFound()

  const d = row.data
  const title = (fs(d['SEO:Title']) ?? fs(d['Name']) ?? unitSlug).replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
  const bedrooms = num(d['Комнаты']) ?? num(d['Спальни'])
  const bathrooms = num(d['Санузлы']) ?? num(d['Bathrooms'])
  const area = num(d['Площадь'])
  const land = num(d['Земля'])
  const floor = fs(d['Этаж'])
  const status = fs(d['Статус'])
  const priceUsd = kind === 'villa'
    ? (num(d['price']) ?? num(d['Цена']))
    : (num(d['price_usd']) ?? num(d['Цена']))
  const district = fs(d['Location 2']) ?? fs(d['Location'])
  const projectName = fs(d['Project'])
  const description = fs(d['SEO Text']) ?? fs(d['Notes']) ?? fs(d['ИИ описание'])
  const view = fs(d['Вид']) ?? fs(d['View'])

  const postText = [
    `🏠 ${title}`,
    projectName ? `Проект: ${projectName}${district ? ` · ${district}` : ''}` : (district ? district : null),
    [
      bedrooms != null ? `${bedrooms} BR` : null,
      area != null ? `${area} м²` : null,
      land != null ? `земля ${land} м²` : null,
      floor ? `этаж ${floor}` : null,
    ].filter(Boolean).join(' · '),
    status,
    priceUsd != null ? `$${priceUsd.toLocaleString('en-US')}` : null,
  ].filter(Boolean).join('\n')

  const hero = photos[0] ?? null
  const rest = photos.slice(1, 9)

  const statusBadge = status ? (() => {
    const s = status.toLowerCase()
    if (s.includes('постро')) return { text: status, cls: 'bg-[#16A34A]' }
    if (s.includes('строит')) return { text: status, cls: 'bg-[#F59E0B]' }
    return { text: status, cls: 'bg-[#6B7280]' }
  })() : null

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111827]">
      <main className="max-w-[1180px] mx-auto px-5 sm:px-8 py-6 sm:py-8">
        <div className="mb-4">
          <Link
            href={`/${fullSlug}`}
            className="inline-flex items-center gap-1 text-[12.5px] text-[#6B7280] hover:text-[#1F8B5F] no-underline"
          >
            <ChevronLeft size={14} /> {devName}
          </Link>
        </div>

        <article className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={title} className="w-full h-[260px] sm:h-[420px] object-cover" />
          )}

          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div className="min-w-0">
                <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-1 flex items-center gap-2">
                  {kind === 'villa' ? 'Вилла' : 'Апартамент'}
                  {statusBadge && (
                    <span className={`text-white px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide ${statusBadge.cls}`}>
                      {statusBadge.text}
                    </span>
                  )}
                </div>
                <h1 className="text-[24px] sm:text-[30px] font-semibold tracking-tight leading-[1.15] mb-2">{title}</h1>
                <div className="text-[13px] text-[#4B5563] flex flex-wrap gap-x-4 gap-y-1">
                  {projectName && <span className="inline-flex items-center gap-1"><Building2 size={12} /> {projectName}</span>}
                  {district && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {district}</span>}
                </div>
              </div>
              {priceUsd != null && (
                <div className="text-right shrink-0">
                  <div className="text-[11.5px] uppercase tracking-wide text-[#6B7280]">Цена</div>
                  <div className="text-[24px] sm:text-[28px] font-semibold text-[#16A34A] leading-none mt-0.5">
                    ${priceUsd.toLocaleString('en-US')}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {bedrooms != null && <Fact icon={BedDouble} label="Спальни" value={String(bedrooms)} />}
              {bathrooms != null && <Fact icon={BedDouble} label="Санузлы" value={String(bathrooms)} />}
              {area != null && <Fact icon={Maximize2} label="Площадь" value={`${area} м²`} />}
              {land != null && <Fact icon={Maximize2} label="Земля" value={`${land} м²`} />}
              {floor && <Fact icon={Building2} label="Этаж" value={floor} />}
              {view && <Fact icon={MapPin} label="Вид" value={view} />}
            </div>

            <div className="mb-5">
              <CopyPostButton text={postText} />
            </div>

            {description && (
              <div className="mb-5">
                <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-2">Описание</div>
                <div className="text-[14px] leading-[1.7] text-[#374151] whitespace-pre-wrap">
                  {description}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-2">Ещё фото</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {rest.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className="w-full h-32 sm:h-40 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>

        <footer className="mt-10 pt-6 border-t border-[#E5E7EB] text-[11.5px] text-[#9CA3AF] text-center">
          Закрытый портал для агентов · presentation.estate
        </footer>
      </main>
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-3">
      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] mb-1 flex items-center gap-1">
        <Icon size={11} /> {label}
      </div>
      <div className="text-[14px] font-medium text-[#111827]">{value}</div>
    </div>
  )
}
