// White-label developer page on presentation.estate — agent
// workflow, not SEO. Goal: agent lands here, gets every material
// they need to push a project to a client in <30 sec.
//
// What lives on the page (in order):
//   1. Hero with logo + name + concrete facts (projects built /
//      in progress / locations / unit count). No marketing prose.
//   2. Per-complex block:
//      • cover + name + status + completion year + district
//      • Resource toolbar: Презентация, Рендеры, Мастер-план,
//        3D-тур, Видео, Booking, Airbnb, Google Maps
//      • Шахматка юнитов — flat grid of all published villa /
//        apartment slugs inside the project with photo / BR /
//        area / floor / price + link to the unit page
//      • "Скопировать пост" — clipboard-ready Telegram snippet
//      • Interactive plan if the admin built one
//
// No auth, no chat widget, no Balinsky chrome. We maintain the
// data; the developer just shares presentation.estate/<short-slug>.

import { notFound, permanentRedirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import {
  Building2, MapPin, Calendar, Users, ExternalLink, FileText, Image as ImageIcon,
  Map as MapIcon, Film, Box, BedDouble,
} from 'lucide-react'
import { listLayers, listHotspots } from '@/lib/complex-visualizations'
import { CopyPostButton } from './_copy-button'
import { CollapsibleViewer } from './_collapsible-viewer'
import { DevTabs } from './_dev-tabs'
import { AllUnitsView, type UnitForFilter } from './_all-units'
import { LinkMenu } from './_link-menu'

// Public origin used to build shareable unit URLs for the clipboard
// "copy link" action. The URL must be the public one, not the internal
// /presentation/ rewrite target.
const PUBLIC_ORIGIN = 'https://presentation.estate'

export const dynamic = 'force-dynamic'
export const revalidate = 300

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type DevRow = { airtable_id: string; data: Record<string, unknown>; logo_url: string | null }
type ComplexRow = { airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }
type UnitRow = { airtable_id: string; data: Record<string, unknown> }

const _loadDevelopers = unstable_cache(
  async (): Promise<DevRow[]> => {
    const { data, error } = await sb.from('raw_developers').select('airtable_id, data, logo_url').limit(200)
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const rows = (data ?? []) as DevRow[]
    if (rows.length === 0) throw new Error('raw_developers empty')
    return rows
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
    if (rows.length === 0) throw new Error('raw_complexes empty')
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

type Unit = {
  kind: 'villa' | 'apartment'
  id: string
  slug: string
  title: string
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
  floor: string | null
  photo: string | null
  status: string | null
  commissionPct: number | null
  commissionUsd: number | null
}

function unitFromRow(r: UnitRow, kind: 'villa' | 'apartment', photos: Record<string, string[]>): Unit | null {
  if (r.data['Опубликовать'] !== true) return null
  const slug = fs(r.data['SEO:Slug'])
  if (!slug || slug.startsWith('-')) return null
  const title = (fs(r.data['SEO:Title']) ?? fs(r.data['Name']) ?? '').replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
  const priceUsd = kind === 'villa'
    ? (num(r.data['price']) ?? num(r.data['Цена']))
    : (num(r.data['price_usd']) ?? num(r.data['Цена']))
  // `Комиссия` on a unit is a fraction (0.08 = 8%); occasionally stored
  // as an integer percent (5 = 5%). Treat <1 as fraction, ≥1 as percent.
  const commissionRaw = num(r.data['Комиссия'])
  const commissionPct = commissionRaw == null ? null
    : commissionRaw < 1 ? Math.round(commissionRaw * 1000) / 10
    : Math.round(commissionRaw * 10) / 10
  // Prefer the precomputed agent-amount column when present; fall back
  // to price × pct.
  const commissionUsd = num(r.data['Комиссия агента $'])
    ?? (priceUsd != null && commissionPct != null ? Math.round(priceUsd * commissionPct / 100) : null)
  return {
    kind, id: r.airtable_id, slug, title,
    bedrooms: num(r.data['Комнаты']) ?? num(r.data['Спальни']),
    area: num(r.data['Площадь']),
    priceUsd,
    floor: fs(r.data['Этаж']),
    photo: photos[r.airtable_id]?.[0] ?? null,
    status: fs(r.data['Статус']),
    commissionPct,
    commissionUsd,
  }
}

type Params = Promise<{ slug: string }>

function findDev(devs: DevRow[], slug: string): DevRow | undefined {
  const exact = devs.find(d => fs(d.data['SEO:Slug']) === slug)
  if (exact) return exact
  return devs.find(d => {
    const s = fs(d.data['SEO:Slug'])
    return s != null && s.startsWith(slug + '-')
  })
}

// Canonical short slug for an developer URL — drop the redundant
// "-bali-developer" / "-developer" suffix that originally came from
// Wix SEO templates. Whatever slug Airtable stores, this is the form
// agents share and the page redirects long forms onto.
function canonicalDevSlug(seoSlug: string): string {
  return seoSlug
    .replace(/-bali-developer$/i, '')
    .replace(/-developer$/i, '')
    .replace(/-+$/, '')
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const devs = await _loadDevelopers().catch(() => [])
  const dev = findDev(devs, slug)
  if (!dev) return { title: 'Застройщик · presentation.estate' }
  const name = fs(dev.data['Developer']) ?? slug
  // Closed agent portal — no indexing, no following, no archive.
  return {
    title: `${name} · presentation.estate`,
    robots: {
      index: false, follow: false, nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  }
}

export default async function PresentationPage({ params }: { params: Params }) {
  const { slug } = await params

  const devs = await _loadDevelopers().catch(() => [])
  const dev = findDev(devs, slug)
  if (!dev) notFound()
  const seoSlug = fs(dev.data['SEO:Slug']) ?? slug
  const fullSlug = canonicalDevSlug(seoSlug)
  // Permanent-redirect every non-canonical hit (the long Wix-era slug
  // ending in -bali-developer, or any other prefix variant) onto the
  // canonical short form so shared links stay tidy.
  if (slug !== fullSlug) permanentRedirect(`/${fullSlug}`)

  const name = fs(dev.data['Developer']) ?? slug
  const logo = dev.logo_url

  // All complexes by this developer. Match is fuzzy in both
  // directions because raw_developers' Developer field often has a
  // parenthetical brand qualifier ("LB Group (LOYO&BONDAR)") that
  // doesn't appear in the complex row's Developer1 ("LB Group").
  // Strip parentheticals + split to take the longest common phrase.
  const baseName = name.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
  const lowerName = name.toLowerCase()
  const allComplexes = await _loadComplexes().catch(() => [])
  const complexes = allComplexes.filter(c => {
    const dev1 = (fs(c.data['Developer1']) ?? fs(c.data['Варианты поиска застройщика']) ?? '').toLowerCase()
    if (!dev1) return false
    return dev1.includes(baseName) || dev1.includes(lowerName)
      || baseName.includes(dev1) || lowerName.includes(dev1)
  })

  // All units across this developer's complexes. We match by
  // complex name appearing in the unit's title (same heuristic
  // the public complex page uses).
  const [allApts, allVillas, aptPhotos, villaPhotos] = await Promise.all([
    _loadApartments().catch(() => []),
    _loadVillas().catch(() => []),
    loadPhotoManifest('apartment-photos'),
    loadPhotoManifest('villa-photos'),
  ])

  // Build a name → projectName lookup so we can attribute each unit
  // to its parent complex.
  const projectNames = complexes
    .map(c => fs(c.data['Project']))
    .filter((x): x is string => x != null)
    .map(s => s.trim())

  const unitsByProject = new Map<string, Unit[]>()
  function tryAttribute(unit: Unit) {
    const lowerTitle = unit.title.toLowerCase()
    for (const p of projectNames) {
      if (lowerTitle.includes(p.toLowerCase())) {
        const arr = unitsByProject.get(p) ?? []
        arr.push(unit)
        unitsByProject.set(p, arr)
        return
      }
    }
  }
  for (const r of allApts) {
    const u = unitFromRow(r, 'apartment', aptPhotos); if (u) tryAttribute(u)
  }
  for (const r of allVillas) {
    const u = unitFromRow(r, 'villa', villaPhotos); if (u) tryAttribute(u)
  }

  // Pre-load interactive plans for each complex.
  const complexesEnriched = await Promise.all(complexes.map(async c => {
    const layers = await listLayers(c.airtable_id).catch(() => [])
    const hotspots = layers.length > 0 ? await listHotspots(layers.map(l => l.id)).catch(() => []) : []
    return { row: c, layers, hotspots }
  }))

  // Aggregate facts for the header strip.
  const totalProjects = complexes.length
  const built = complexes.filter(c => (fs(c.data['Статус']) ?? '').toLowerCase().includes('постро')).length
  const building = totalProjects - built
  const districts = Array.from(new Set(
    complexes.map(c => fs(c.data['Location 2']) ?? fs(c.data['Location'])).filter((x): x is string => !!x),
  ))
  const totalUnits = Array.from(unitsByProject.values()).reduce((s, arr) => s + arr.length, 0)

  // Build a flat "all units" array for the second tab. Each unit
  // carries its parent project name and district so the filter view
  // can show them without re-joining server-side.
  const projectDistrict = new Map<string, string | null>()
  for (const c of complexes) {
    const p = fs(c.data['Project'])
    if (p) projectDistrict.set(p, fs(c.data['Location 2']) ?? fs(c.data['Location']))
  }
  const flatUnits: UnitForFilter[] = []
  for (const [p, arr] of unitsByProject.entries()) {
    for (const u of arr) {
      flatUnits.push({
        id: u.id, slug: u.slug, kind: u.kind, title: u.title,
        bedrooms: u.bedrooms, area: u.area, priceUsd: u.priceUsd,
        floor: u.floor, photo: u.photo,
        project: p, district: projectDistrict.get(p) ?? null,
        commissionPct: u.commissionPct,
        commissionUsd: u.commissionUsd,
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111827]">
      <main className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* HERO — agent-grade summary */}
        <section className="flex items-start gap-6 mb-8 flex-wrap">
          {logo && (
            <div className="shrink-0 w-[100px] h-[100px] rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={name} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-1">Застройщик на Бали</div>
            <h1 className="text-[26px] sm:text-[34px] md:text-[40px] font-semibold tracking-tight leading-[1.1] mb-2">{name}</h1>
            <div className="text-[13px] text-[#4B5563] flex flex-wrap gap-x-5 gap-y-1">
              {totalProjects > 0 && <span>{totalProjects} {totalProjects === 1 ? 'проект' : totalProjects < 5 ? 'проекта' : 'проектов'}</span>}
              {built > 0 && <span>· сдано: <b>{built}</b></span>}
              {building > 0 && <span>· в стройке: <b>{building}</b></span>}
              {totalUnits > 0 && <span>· юнитов в каталоге: <b>{totalUnits}</b></span>}
              {districts.length > 0 && (
                <span>· районы: <b>{districts.slice(0, 5).join(', ')}{districts.length > 5 ? ` +${districts.length - 5}` : ''}</b></span>
              )}
            </div>
          </div>
        </section>

        {/* Per-complex blocks — the meat of the page */}
        {complexesEnriched.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center text-[14px] text-[#6B7280]">
            У этого застройщика пока нет опубликованных проектов в каталоге.
          </div>
        ) : (
          <DevTabs
            unitCount={flatUnits.length}
            allUnits={<AllUnitsView units={flatUnits} />}
            byProjects={
          <div className="space-y-8">
            {complexesEnriched.map(({ row: c, layers, hotspots }) => {
              const project = fs(c.data['Project']) ?? c.slug ?? ''
              const district = fs(c.data['Location 2']) ?? fs(c.data['Location'])
              const year = fs(c.data['Year of completion ']) ?? fs(c.data['Year of completion'])
              const status = fs(c.data['Статус'])
              const lease = fs(c.data['Leasehold']) ?? fs(c.data['Leashold'])
              const permit = fs(c.data['Разрешительные документы'])
              const totalProjUnits = num(c.data['Total quantity of units'])

              const resources: { label: string; url: string; Icon: typeof Box }[] = []
              const presentations = fs(c.data['Презентации'])
              const renders = fs(c.data['Renders'])
              const masterplan = fs(c.data['Мастерплан'])
              const tour3d = fs(c.data['3D tours'])
              const video = fs(c.data['Video'])
              const booking = fs(c.data['Booking'])
              const airbnb = fs(c.data['AirBNB'])
              const gmap = fs(c.data['Link from Google maps on location']) ?? fs(c.data['Google maps']) ?? fs(c.data['Google map'])
              if (presentations) resources.push({ label: 'Презентация', url: presentations, Icon: FileText })
              if (renders)       resources.push({ label: 'Рендеры',     url: renders,       Icon: ImageIcon })
              if (masterplan)    resources.push({ label: 'Мастер-план', url: masterplan,    Icon: MapIcon })
              if (tour3d)        resources.push({ label: '3D-тур',      url: tour3d,        Icon: Box })
              if (video)         resources.push({ label: 'Видео',       url: video,         Icon: Film })
              if (gmap)          resources.push({ label: 'Google Maps', url: gmap,          Icon: MapIcon })
              if (booking)       resources.push({ label: 'Booking',     url: booking,       Icon: ExternalLink })
              if (airbnb)        resources.push({ label: 'AirBnB',      url: airbnb,        Icon: ExternalLink })

              const units = (unitsByProject.get(project) ?? []).sort((a, b) => {
                if (a.bedrooms !== b.bedrooms) return (a.bedrooms ?? 99) - (b.bedrooms ?? 99)
                return (a.priceUsd ?? 0) - (b.priceUsd ?? 0)
              })
              const minPrice = units.reduce<number | null>((m, u) => u.priceUsd != null && (m == null || u.priceUsd < m) ? u.priceUsd : m, null)

              // Telegram-ready snippet for agents. No URL — the
              // agent attaches their own contact / lead form.
              const postText = [
                `🏠 ${project}${district ? ` · ${district}` : ''}`,
                [
                  status,
                  year && !status?.toLowerCase().includes('постро') ? `сдача ${year}` : null,
                  lease ? `лизхолд ${lease}л` : null,
                  permit && permit.toLowerCase() !== 'нет' ? permit : null,
                ].filter(Boolean).join(' · '),
                totalProjUnits ? `Юнитов в проекте: ${totalProjUnits}` : null,
                minPrice ? `Цена от $${minPrice.toLocaleString('en-US')}` : null,
              ].filter(Boolean).join('\n')

              return (
                <article key={c.airtable_id} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
                  {c.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt={project} className="w-full h-[180px] sm:h-[240px] object-cover" />
                  )}
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                      <div className="min-w-0">
                        <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-tight">{project}</h2>
                        <div className="text-[12.5px] text-[#6B7280] flex items-center gap-3 flex-wrap mt-1">
                          {district && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {district}</span>}
                          {status && <span>· {status}</span>}
                          {year && !status?.toLowerCase().includes('постро') && <span>· сдача {year}</span>}
                          {lease && <span>· лизхолд {lease}л</span>}
                          {totalProjUnits != null && <span>· {totalProjUnits} юнитов</span>}
                          {permit && permit.toLowerCase() !== 'нет' && <span>· {permit}</span>}
                          {minPrice != null && <span className="text-[#16A34A] font-medium">· от ${minPrice.toLocaleString('en-US')}</span>}
                        </div>
                      </div>
                      <CopyPostButton text={postText} />
                    </div>

                    {/* Resource toolbar — each chip opens a context menu
                        with «Открыть» / «Скопировать ссылку». */}
                    {resources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {resources.map(({ label, url, Icon }) => (
                          <LinkMenu
                            key={label}
                            url={url}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[12.5px] text-[#111827] border border-transparent hover:border-[#1F8B5F]"
                          >
                            <Icon size={12} className="text-[#1F8B5F]" />
                            {label}
                          </LinkMenu>
                        ))}
                      </div>
                    )}

                    {/* Interactive plan if drawn — collapsed by default. */}
                    {layers.length > 0 && (
                      <CollapsibleViewer
                        layers={layers.map(l => ({ id: l.id, parentLayerId: l.parentLayerId, title: l.title, photoUrl: l.photoUrl }))}
                        hotspots={hotspots}
                        unitsBySlug={{}}
                        lang="ru"
                      />
                    )}

                    {/* Шахматка юнитов */}
                    {units.length > 0 && (
                      <div>
                        <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-2">
                          Юниты ({units.length}{totalProjUnits ? ` из ${totalProjUnits}` : ''})
                        </div>
                        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {units.map(u => (
                            <li key={u.id}>
                              <LinkMenu
                                url={`${PUBLIC_ORIGIN}/unit/${u.id}`}
                                className="block w-full text-left bg-[#FAFAF8] hover:bg-white border border-[#E5E7EB] hover:border-[#1F8B5F] rounded-xl overflow-hidden text-[#111827]"
                              >
                                {u.photo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={u.photo} alt={u.title} className="w-full h-20 object-cover" />
                                ) : (
                                  <div className="w-full h-20 bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF]">
                                    <BedDouble size={20} />
                                  </div>
                                )}
                                <div className="p-2">
                                  <div className="text-[11.5px] text-[#6B7280] mb-0.5 flex items-center gap-1">
                                    {u.bedrooms != null && <span>{u.bedrooms} BR</span>}
                                    {u.area != null && <span>· {u.area} м²</span>}
                                    {u.floor && <span>· эт. {u.floor}</span>}
                                  </div>
                                  {u.priceUsd != null && (
                                    <div className="text-[12.5px] font-semibold text-[#16A34A]">
                                      ${u.priceUsd.toLocaleString('en-US')}
                                    </div>
                                  )}
                                  {(u.commissionPct != null || u.commissionUsd != null) && (
                                    <div className="text-[10.5px] text-[#6B7280] mt-0.5">
                                      Комиссия{u.commissionPct != null && ` ${u.commissionPct}%`}
                                      {u.commissionUsd != null && <> · <span className="font-semibold text-[#1F8B5F]">${u.commissionUsd.toLocaleString('en-US')}</span></>}
                                    </div>
                                  )}
                                </div>
                              </LinkMenu>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
            }
          />
        )}

        <footer className="mt-16 pt-6 border-t border-[#E5E7EB] text-[11.5px] text-[#9CA3AF]">
          Закрытый портал для агентов · presentation.estate
        </footer>
      </main>
    </div>
  )
}
