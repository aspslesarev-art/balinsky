// White-label developer page on presentation.estate.
//
// Reuses the same raw_developers + raw_complexes data the main site
// renders, but in a stripped layout with the presentation.estate
// brand instead of Balinsky chrome (no main header, no chat widget,
// no Balinsky footer). The developer just shares
// `presentation.estate/<slug>` with their leads.
//
// No auth, no editor: we (Balinsky) maintain the database, the
// developer gets a clean shareable page out of it. Future iteration
// can add a magic-link editor if they ask for one.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { Building2, MapPin, Calendar, Users, ExternalLink } from 'lucide-react'
import { tField, type Lang } from '@/lib/i18n'
import { listLayers, listHotspots } from '@/lib/complex-visualizations'
import { ComplexVisualizationViewer } from '@/components/ComplexVisualizationViewer'

export const dynamic = 'force-dynamic'
export const revalidate = 300

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type DevRow = { airtable_id: string; data: Record<string, unknown>; logo_url: string | null }

const _loadDevelopers = unstable_cache(
  async (): Promise<DevRow[]> => {
    const { data, error } = await sb.from('raw_developers').select('airtable_id, data, logo_url').limit(200)
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const rows = (data ?? []) as DevRow[]
    if (rows.length === 0) throw new Error('raw_developers empty — refusing to cache')
    return rows
  },
  ['presentation-developers-v1'],
  { revalidate: 600 },
)

type ComplexRow = { airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }

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
    if (rows.length === 0) throw new Error('raw_complexes empty — refusing to cache')
    return rows
  },
  ['presentation-complexes-v1'],
  { revalidate: 600 },
)

function fs(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return fs((v as Record<string, unknown>).value)
  return null
}

function parseBullets(s: string | null): string[] {
  if (!s) return []
  return s.split('\n').map(l => l.replace(/^[\s•\-–—·]+/, '').trim()).filter(Boolean)
}

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const devs = await _loadDevelopers().catch(() => [])
  const dev = devs.find(d => fs(d.data['SEO:Slug']) === slug)
  if (!dev) return { title: 'Застройщик · presentation.estate' }
  const name = fs(dev.data['Developer']) ?? slug
  const desc = fs(dev.data['SEO Text']) ?? `Жилые комплексы и проекты застройщика ${name} на Бали`
  return {
    title: `${name} · presentation.estate`,
    description: desc.slice(0, 160),
    robots: { index: true, follow: true },
  }
}

export default async function PresentationPage({ params }: { params: Params }) {
  const { slug } = await params
  const lang: Lang = 'ru' // single-locale for v1; can flip to ?lang= later

  const devs = await _loadDevelopers().catch(() => [])
  const dev = devs.find(d => fs(d.data['SEO:Slug']) === slug)
  if (!dev) notFound()

  const name = fs(dev.data['Developer']) ?? slug
  const logo = dev.logo_url
  const aiDesc = tField(dev.data, 'SEO Text', lang) ?? fs(dev.data['AI Описание'])

  const dimensions = [
    { title: 'Строительство и недвижимость', bullets: parseBullets(tField(dev.data, 'Строительство и недвижимость', lang)), Icon: Building2 },
    { title: 'Репутация и опыт',             bullets: parseBullets(tField(dev.data, 'Репутация и опыт',           lang)), Icon: Users },
    { title: 'Техника и производство',       bullets: parseBullets(tField(dev.data, 'Техника и производство',     lang)), Icon: Calendar },
  ].filter(d => d.bullets.length > 0)

  // Developer's complexes — match by name appearing in Developer1 / search variants
  const allComplexes = await _loadComplexes().catch(() => [])
  const lowerName = name.toLowerCase()
  const complexes = allComplexes.filter(c => {
    const dev1 = fs(c.data['Developer1']) ?? fs(c.data['Варианты поиска застройщика'])
    return dev1 && dev1.toLowerCase().includes(lowerName)
  })

  // Pre-load interactive plans for each complex (parallel).
  const complexesWithViz = await Promise.all(complexes.map(async c => {
    const layers = await listLayers(c.airtable_id).catch(() => [])
    const hotspots = layers.length > 0 ? await listHotspots(layers.map(l => l.id)).catch(() => []) : []
    return { complex: c, layers, hotspots }
  }))

  const totalProjects = complexes.length

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111827]">
      {/* Sticky brand bar — presentation.estate, not Balinsky */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#E5E7EB]">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between gap-3">
          <div className="text-[14px] font-semibold tracking-tight">
            <span className="text-[#1F8B5F]">presentation</span>.estate
          </div>
          <div className="text-[12px] text-[#6B7280] truncate max-w-[60%]">{name}</div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Hero — logo + name + 1-line tagline */}
        <section className="flex items-start gap-6 mb-10 flex-wrap">
          {logo && (
            <div className="shrink-0 w-[120px] h-[120px] rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={name} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wide text-[#6B7280] mb-1">Застройщик на Бали</div>
            <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-semibold tracking-tight leading-[1.1] mb-3">{name}</h1>
            <div className="text-[14px] text-[#4B5563] flex items-center gap-4 flex-wrap">
              {totalProjects > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={14} /> {totalProjects} {totalProjects === 1 ? 'проект' : totalProjects < 5 ? 'проекта' : 'проектов'}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} /> Бали, Индонезия
              </span>
            </div>
          </div>
        </section>

        {/* About */}
        {aiDesc && (
          <section className="mb-10">
            <h2 className="text-[22px] font-semibold tracking-tight mb-3">О компании</h2>
            <div className="prose max-w-3xl text-[15px] leading-relaxed whitespace-pre-line text-[#1F2937]">{aiDesc}</div>
          </section>
        )}

        {/* Dimensions — opyt / reputation / technika */}
        {dimensions.length > 0 && (
          <section className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {dimensions.map(({ title, bullets, Icon }) => (
              <div key={title} className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
                <div className="inline-flex items-center gap-2 text-[#1F8B5F] mb-2">
                  <Icon size={16} />
                  <span className="text-[13px] font-semibold">{title}</span>
                </div>
                <ul className="space-y-1.5 text-[13.5px] text-[#374151]">
                  {bullets.slice(0, 6).map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#1F8B5F] mt-1">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* Projects with interactive plans where present */}
        {complexesWithViz.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] font-semibold tracking-tight mb-4">Проекты</h2>
            <div className="space-y-8">
              {complexesWithViz.map(({ complex, layers, hotspots }) => {
                const projectName = fs(complex.data['Project']) ?? complex.slug ?? ''
                const district = fs(complex.data['Location 2']) ?? fs(complex.data['Location'])
                const year = fs(complex.data['Year of completion ']) ?? fs(complex.data['Year of completion'])
                const status = fs(complex.data['Статус'])
                return (
                  <article key={complex.airtable_id} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
                    {complex.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={complex.cover_url} alt={projectName} className="w-full h-[200px] sm:h-[260px] object-cover" />
                    )}
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                        <h3 className="text-[20px] sm:text-[24px] font-semibold tracking-tight">{projectName}</h3>
                        <div className="text-[12.5px] text-[#6B7280] flex items-center gap-3 flex-wrap">
                          {district && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {district}</span>}
                          {year && <span>· сдача {year}</span>}
                          {status && <span>· {status}</span>}
                        </div>
                      </div>
                      {/* Interactive plan if the admin has built one */}
                      {layers.length > 0 && (
                        <ComplexVisualizationViewer
                          layers={layers.map(l => ({ id: l.id, parentLayerId: l.parentLayerId, title: l.title, photoUrl: l.photoUrl }))}
                          hotspots={hotspots}
                          unitsBySlug={{}}
                          lang={lang}
                        />
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {/* Footer with credit + back to main site */}
        <footer className="mt-16 pt-6 border-t border-[#E5E7EB] text-[12px] text-[#6B7280] flex items-center justify-between flex-wrap gap-3">
          <div>
            Страница и данные поддерживаются командой{' '}
            <Link href="https://balinsky.info" className="text-[#1F8B5F] hover:underline" target="_blank">balinsky.info</Link>
            {' · '}<span className="text-[#9CA3AF]">presentation.estate</span>
          </div>
          <Link href={`https://balinsky.info/ru/zastrojshhiki/${slug}`} target="_blank" className="inline-flex items-center gap-1 text-[#1F8B5F] hover:underline">
            <ExternalLink size={11} /> Открыть на balinsky.info
          </Link>
        </footer>
      </main>
    </div>
  )
}
