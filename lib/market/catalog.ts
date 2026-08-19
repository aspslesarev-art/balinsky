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
