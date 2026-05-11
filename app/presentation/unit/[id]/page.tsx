// Anonymous unit page. URL: presentation.estate/unit/<airtable_id>.
// Designed to be shared with end-clients: shows photos, facts and
// the unit description but NEVER mentions the developer name, the
// complex name or anything that lets a client work backwards to the
// dev page. The agent's identity stays private.

import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MapPin, BedDouble, Maximize2, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 300

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type UnitRow = { airtable_id: string; data: Record<string, unknown> }

// Direct id lookup — cheap. No need to paginate all rows.
async function loadRowById(table: 'raw_villas' | 'raw_apartments', id: string): Promise<UnitRow | null> {
  const { data, error } = await sb
    .from(table)
    .select('airtable_id, data')
    .eq('airtable_id', id)
    .maybeSingle()
  if (error) return null
  return (data as UnitRow | null) ?? null
}

const PHOTO_MANIFEST_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`
const _photoManifestCache: Record<string, { ts: number; data: Record<string, string[]> }> = {}
async function loadPhotoManifest(bucket: string): Promise<Record<string, string[]>> {
  const cached = _photoManifestCache[bucket]
  if (cached && Date.now() - cached.ts < 10 * 60 * 1000) return cached.data
  try {
    const r = await fetch(`${PHOTO_MANIFEST_BASE}/${bucket}/_manifest.json`, { next: { revalidate: 600 } })
    if (!r.ok) return cached?.data ?? {}
    const j = await r.json() as Record<string, string[]>
    _photoManifestCache[bucket] = { ts: Date.now(), data: j }
    return j
  } catch { return cached?.data ?? {} }
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Strip every brand-name leak from free-form text. Airtable already
// stores comma-separated typo variants of the complex / developer
// name in two utility fields ("Название комплекса с ошибками",
// "Название застройщика с ошибками") — we use those plus the
// canonical names as the scrub list.
function scrubBrandLeaks(text: string, leaks: Array<string | null>): string {
  const variants = new Set<string>()
  for (const raw of leaks) {
    if (!raw) continue
    for (const piece of raw.split(/[,\n]/)) {
      const t = piece.trim()
      if (t.length >= 3) variants.add(t)
    }
  }
  // Longest-first so "Loyo Villas Ubud" is removed before "Loyo".
  const sorted = Array.from(variants).sort((a, b) => b.length - a.length)
  let out = text
  for (const v of sorted) {
    out = out.replace(new RegExp(escapeRegex(v), 'gi'), '')
  }
  // Tidy: collapse leftover punctuation+whitespace artefacts.
  return out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/[—–-]\s*[—–-]/g, '—')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }) {
  await params
  return {
    title: 'Объект · presentation.estate',
    robots: {
      index: false, follow: false, nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  }
}

export default async function UnitAnonPage({ params }: { params: Params }) {
  const { id } = await params
  if (!/^rec[a-zA-Z0-9]{8,}$/.test(id)) notFound()

  // Try villa first, then apartment.
  const [villa, apt, villaPhotos, aptPhotos] = await Promise.all([
    loadRowById('raw_villas', id),
    loadRowById('raw_apartments', id),
    loadPhotoManifest('villa-photos'),
    loadPhotoManifest('apartment-photos'),
  ])
  let kind: 'villa' | 'apartment'
  let row: UnitRow
  let photos: string[]
  if (villa && villa.data['Опубликовать'] === true) {
    kind = 'villa'; row = villa; photos = villaPhotos[id] ?? []
  } else if (apt && apt.data['Опубликовать'] === true) {
    kind = 'apartment'; row = apt; photos = aptPhotos[id] ?? []
  } else {
    notFound()
  }

  const d = row.data
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
  const view = fs(d['Вид']) ?? fs(d['View'])

  // Brand-leak scrub list — explicit names + typo variants Airtable
  // already keeps. Used to clean description text below; never
  // rendered as-is, never echoed back to the client.
  const leakNames: Array<string | null> = [
    fs(d['Комплекс 1']),
    fs(d['Developer1']),
    fs(d['Название комплекса с ошибками']),
    fs(d['Название застройщика с ошибками']),
    fs(d['SEO:Title']),
    fs(d['Name']),
  ]
  // Description sources, in priority order. Each is scrubbed before
  // we pick the first non-empty result.
  const rawDescCandidates = [
    fs(d['SEO Text']),
    fs(d['Notes']),
    fs(d['ИИ описание']),
  ].filter((x): x is string => !!x)
  let description: string | null = null
  for (const raw of rawDescCandidates) {
    const cleaned = scrubBrandLeaks(raw, leakNames)
    if (cleaned.length >= 30) { description = cleaned; break }
  }

  // Anonymised lead-in: type + district only. Never the project name
  // or developer; we explicitly do NOT render `d['Project']` or
  // `d['Developer']` here.
  const heading = kind === 'villa' ? 'Вилла' : 'Апартамент'
  const subline = [
    bedrooms != null ? `${bedrooms} спальни` : null,
    area != null ? `${area} м²` : null,
    district ? district : null,
  ].filter(Boolean).join(' · ')

  const hero = photos[0] ?? null
  const rest = photos.slice(1, 12)

  const statusBadge = status ? (() => {
    const s = status.toLowerCase()
    if (s.includes('постро')) return { text: status, cls: 'bg-[#16A34A]' }
    if (s.includes('строит')) return { text: status, cls: 'bg-[#F59E0B]' }
    return { text: status, cls: 'bg-[#6B7280]' }
  })() : null

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111827]">
      <main className="max-w-[1180px] mx-auto px-5 sm:px-8 py-6 sm:py-10">
        <article className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={heading} className="w-full h-[280px] sm:h-[460px] object-cover" />
          )}

          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="min-w-0">
                <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-1 flex items-center gap-2">
                  {heading}
                  {statusBadge && (
                    <span className={`text-white px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide ${statusBadge.cls}`}>
                      {statusBadge.text}
                    </span>
                  )}
                </div>
                <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-[1.15] mb-2">
                  {heading} {district ? `на ${district}` : ''}
                </h1>
                {subline && <div className="text-[13px] text-[#4B5563]">{subline}</div>}
              </div>
              {priceUsd != null && (
                <div className="text-right shrink-0">
                  <div className="text-[11.5px] uppercase tracking-wide text-[#6B7280]">Цена</div>
                  <div className="text-[24px] sm:text-[30px] font-semibold text-[#16A34A] leading-none mt-0.5">
                    ${priceUsd.toLocaleString('en-US')}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {bedrooms != null && <Fact icon={BedDouble} label="Спальни" value={String(bedrooms)} />}
              {bathrooms != null && <Fact icon={BedDouble} label="Санузлы" value={String(bathrooms)} />}
              {area != null && <Fact icon={Maximize2} label="Площадь" value={`${area} м²`} />}
              {land != null && <Fact icon={Maximize2} label="Земля" value={`${land} м²`} />}
              {floor && <Fact icon={Building2} label="Этаж" value={floor} />}
              {view && <Fact icon={MapPin} label="Вид" value={view} />}
            </div>

            {description && (
              <div className="mb-2">
                <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-2">Описание</div>
                <div className="text-[14px] leading-[1.7] text-[#374151] whitespace-pre-wrap">
                  {description}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="mt-6">
                <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-2">Ещё фото</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {rest.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className="w-full h-32 sm:h-44 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
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
