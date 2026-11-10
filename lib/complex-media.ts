import 'server-only'
// Что из медиа комплекса показывать на странице его виллы или квартиры:
// slug комплекса (по нему — солнце и 3D-карта) и встраиваемый 3D-тур.
import { createClient } from '@supabase/supabase-js'
import { embeddableTourUrl } from './tour3d'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function loadComplexMedia(complexAirtableId: string | null, complexName?: string | null): Promise<{ id: string | null; slug: string | null; tourUrl: string | null; data: Record<string, unknown> | null }> {
  const none = { id: null, slug: null, tourUrl: null, data: null }
  // Ссылка «Комплекс» у части старых объявлений указывает на запись, которой
  // в raw_complexes нет; тогда ищем комплекс по названию («Комплекс 1»).
  let row: { airtable_id: unknown; slug: unknown; data: unknown } | null = null
  if (complexAirtableId) {
    const { data } = await sb.from('raw_complexes').select('airtable_id, slug, data').eq('airtable_id', complexAirtableId).maybeSingle()
    row = data
  }
  const name = complexName?.trim()
  if (!row && name && name.length > 2) {
    const { data } = await sb.from('raw_complexes').select('airtable_id, slug, data').ilike('data->>Project', name).limit(1)
    row = data?.[0] ?? null
  }
  if (!row) return none
  const d = (row.data ?? {}) as Record<string, unknown>
  return {
    id: typeof row.airtable_id === 'string' ? row.airtable_id : null,
    slug: typeof row.slug === 'string' ? row.slug : null,
    tourUrl: embeddableTourUrl(d['3D tours']),
    data: d,
  }
}
