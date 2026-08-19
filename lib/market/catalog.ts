// Связь трекера с каталогом сайта.
//
// Прайсы знают цену и статус, но ничего не знают о районе и стадии
// стройки — это лежит в raw_complexes. Комплексы сопоставлены таблицей
// market_catalog_links (85 связей по названию и застройщику, 3 по одному
// названию), и здесь мы просто подтягиваем то, что каталог знает.

import type { SupabaseClient } from '@supabase/supabase-js'

export type CatalogInfo = {
  catalogId: string
  district: string | null
  location: string | null
  buildStatus: string | null
  landUse: string | null
  slug: string | null
  confidence: string
}

// Ключ — `${developer}|||${complex}`: та же пара, что и в связке.
export type CatalogMap = Map<string, CatalogInfo>

export function catalogKey(developer: string, complex: string): string {
  return `${developer}|||${complex}`
}

export async function loadCatalogMap(sb: SupabaseClient): Promise<CatalogMap> {
  const { data: links } = await sb
    .from('market_catalog_links')
    .select('developer, complex, catalog_id, confidence')
  if (!links?.length) return new Map()

  const ids = [...new Set(links.map(l => String(l.catalog_id)))]
  const byId = new Map<string, Record<string, unknown>>()

  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb
      .from('raw_complexes')
      .select('airtable_id, data')
      .in('airtable_id', ids.slice(i, i + 200))
    for (const row of data ?? []) {
      byId.set(String(row.airtable_id), (row.data ?? {}) as Record<string, unknown>)
    }
  }

  const out: CatalogMap = new Map()
  for (const l of links) {
    const d = byId.get(String(l.catalog_id))
    if (!d) continue
    out.set(catalogKey(String(l.developer), String(l.complex)), {
      catalogId: String(l.catalog_id),
      district: str(d['Location 2']),
      location: str(d['Location']),
      buildStatus: str(d['Статус']),
      landUse: str(d['Назначение земли']),
      slug: str(d['SEO:Slug']),
      confidence: String(l.confidence),
    })
  }
  return out
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

// Сопоставление новых комплексов трекера с каталогом сайта.
//
// Без связи юниты в базу попадают, но в аналитику (market_core) — нет:
// там нужен район и стадия стройки, а их знает только каталог. Раньше
// связки заводились разово руками, и каждый новый прайс молча выпадал из
// всех срезов, хотя данные по нему собирались.
//
// Уже существующие связки не трогаем: среди них есть ручные, и
// автосопоставление не должно их перебивать.
export type LinkResult = { linked: number; unmatched: string[] }

export async function linkCatalog(sb: SupabaseClient): Promise<LinkResult> {
  const { data: sources, error } = await sb
    .from('market_sources')
    .select('developer, complex')
    .eq('active', true)
  if (error) throw new Error(`чтение market_sources: ${error.message}`)

  const { data: existing } = await sb.from('market_catalog_links').select('developer, complex')
  const linked = new Set((existing ?? []).map(l => catalogKey(String(l.developer), String(l.complex))))

  const pairs = new Map<string, { developer: string; complex: string }>()
  for (const s of sources ?? []) {
    const developer = String(s.developer ?? '')
    const complex = String(s.complex ?? '')
    if (!developer || !complex) continue
    const key = catalogKey(developer, complex)
    if (!linked.has(key)) pairs.set(key, { developer, complex })
  }
  if (!pairs.size) return { linked: 0, unmatched: [] }

  const catalog = await loadCatalogRows(sb)
  const rows: Array<Record<string, unknown>> = []
  const unmatched: string[] = []

  for (const { developer, complex } of pairs.values()) {
    const byName = catalog.filter(c => c.name === norm(complex))
    // Название вместе с застройщиком — надёжное совпадение. Одно только
    // название берём, лишь когда оно в каталоге единственное: «Bloom» у
    // двух разных застройщиков связать вслепую нельзя.
    const exact = byName.find(c => c.developer === norm(developer))
    const chosen = exact ?? (byName.length === 1 ? byName[0] : null)
    if (!chosen) { unmatched.push(`${developer} / ${complex}`); continue }
    rows.push({
      developer,
      complex,
      catalog_id: chosen.id,
      confidence: exact ? 'name_and_developer' : 'name_only',
    })
  }

  if (rows.length) {
    const { error: writeErr } = await sb
      .from('market_catalog_links')
      .upsert(rows, { onConflict: 'developer,complex', ignoreDuplicates: true })
    if (writeErr) throw new Error(`запись market_catalog_links: ${writeErr.message}`)
  }
  return { linked: rows.length, unmatched }
}

type CatalogRow = { id: string; name: string; developer: string }

async function loadCatalogRows(sb: SupabaseClient): Promise<CatalogRow[]> {
  const out: CatalogRow[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await sb
      .from('raw_complexes')
      .select('airtable_id, data')
      .range(from, from + 499)
    if (error) throw new Error(`чтение raw_complexes: ${error.message}`)
    if (!data?.length) break
    for (const row of data) {
      const d = (row.data ?? {}) as Record<string, unknown>
      const name = norm(d['Project'])
      if (name) out.push({ id: String(row.airtable_id), name, developer: norm(d['Developer']) })
    }
    if (data.length < 500) break
  }
  return out
}

// Названия в двух системах пишут по-разному: регистр, точки, дефисы,
// хвостовые пробелы. Сравниваем только буквы и цифры.
function norm(v: unknown): string {
  return String(v ?? '').toLowerCase().replace(/[^a-z\u0430-\u044f0-9]/gi, '')
}
