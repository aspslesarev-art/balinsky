// CRUD над таблицей complex_parsers + типы для UI/API.
// Сам код парсеров — в lib/parsers/<slug>.ts, маппинг complex_id →
// парсер — в lib/parsers/_registry.ts. Тут чисто инфраструктура.

import { createClient } from '@supabase/supabase-js'
import { getParserModule } from './parsers/_registry'

export type ParserStatus = 'ok' | 'error' | null

export type ParserConfig = {
  complex_id: string
  source_url: string
  parser_type: string                 // ключ из реестра (audit), не выбирается в UI
  interval_minutes: number | null
  last_run_at: string | null
  last_status: ParserStatus
  last_error: string | null
  last_units_count: number | null
  last_warning_count: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Цветовое состояние строки в админке:
//  - green  → ok без warnings
//  - yellow → ok с warnings (например юниты без планировки в Виллах)
//  - red    → ошибка на последнем прогоне
//  - idle   → ещё не запускался
export type ParserHealth = 'green' | 'yellow' | 'red' | 'idle'

export function parserHealth(p: ParserConfig | null): ParserHealth {
  if (!p || !p.last_status) return 'idle'
  if (p.last_status === 'error') return 'red'
  if ((p.last_warning_count ?? 0) > 0) return 'yellow'
  return 'green'
}

export type ComplexListEntry = {
  airtable_id: string
  name: string
  slug: string | null
  district: string | null
  developer: string | null
  parser: ParserConfig | null
  // Реализован ли парсер в коде для этого ЖК. Если нет — редактор
  // покажет «парсер не написан» вместо формы.
  parser_label: string | null
}

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

function fs1(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return fs1(v[0])
  if (typeof v === 'object' && 'value' in v) return fs1((v as { value: unknown }).value)
  return null
}

// Сортировка: настроенные парсеры наверху (по last_run_at desc), ниже —
// «есть реализация, но не настроен», в самом низу — «парсер не написан».
export async function listComplexesWithParserStatus(): Promise<ComplexListEntry[]> {
  const c = sb()
  const [{ data: complexRows, error: cErr }, { data: parserRows, error: pErr }] = await Promise.all([
    c.from('raw_complexes').select('airtable_id, slug, data').limit(500),
    c.from('complex_parsers').select('*'),
  ])
  if (cErr) throw cErr
  const parserById = new Map<string, ParserConfig>()
  if (!pErr && parserRows) {
    for (const r of parserRows as ParserConfig[]) parserById.set(r.complex_id, r)
  }
  const out: ComplexListEntry[] = []
  for (const r of (complexRows ?? []) as Array<{ airtable_id: string; slug: string | null; data: Record<string, unknown> }>) {
    const name = fs1(r.data['Project']) ?? r.airtable_id
    const mod = getParserModule(r.airtable_id)
    out.push({
      airtable_id: r.airtable_id,
      name,
      slug: r.slug,
      district: fs1(r.data['Location 2']) ?? fs1(r.data['Location']),
      developer: fs1(r.data['Developer1']) ?? fs1(r.data['Варианты поиска застройщика']),
      parser: parserById.get(r.airtable_id) ?? null,
      parser_label: mod ? mod.label : null,
    })
  }
  out.sort((a, b) => {
    // 1. С настроенным парсером — наверху
    const aHas = a.parser ? 1 : 0
    const bHas = b.parser ? 1 : 0
    if (aHas !== bHas) return bHas - aHas
    if (aHas && bHas) {
      const at = a.parser?.last_run_at ?? ''
      const bt = b.parser?.last_run_at ?? ''
      if (at !== bt) return bt.localeCompare(at)
    }
    // 2. Реализованные, но не настроенные — выше «не написанных»
    const aImpl = a.parser_label ? 1 : 0
    const bImpl = b.parser_label ? 1 : 0
    if (aImpl !== bImpl) return bImpl - aImpl
    return a.name.localeCompare(b.name)
  })
  return out
}

export async function getParser(complexId: string): Promise<ParserConfig | null> {
  const c = sb()
  const { data, error } = await c.from('complex_parsers').select('*').eq('complex_id', complexId).maybeSingle()
  if (error) return null
  return (data as ParserConfig) ?? null
}

export async function upsertParser(input: {
  complex_id: string
  source_url: string
  interval_minutes?: number | null
  notes?: string | null
}): Promise<ParserConfig> {
  const mod = getParserModule(input.complex_id)
  if (!mod) throw new Error('parser_not_implemented')
  const c = sb()
  const { data, error } = await c
    .from('complex_parsers')
    .upsert({
      complex_id: input.complex_id,
      source_url: input.source_url,
      parser_type: mod.key,
      interval_minutes: input.interval_minutes ?? null,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'complex_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as ParserConfig
}

export async function deleteParser(complexId: string): Promise<void> {
  const c = sb()
  const { error } = await c.from('complex_parsers').delete().eq('complex_id', complexId)
  if (error) throw error
}

export async function recordRun(complexId: string, status: 'ok' | 'error', unitsCount: number, errorMsg: string | null = null, warningCount = 0): Promise<void> {
  const c = sb()
  await c.from('complex_parsers').update({
    last_run_at: new Date().toISOString(),
    last_status: status,
    last_error: errorMsg,
    last_units_count: unitsCount,
    last_warning_count: warningCount,
    updated_at: new Date().toISOString(),
  }).eq('complex_id', complexId)
}

// Возвращает парсеры с истёкшим интервалом. Используется cron-хуком.
export async function listDueParsers(now = new Date()): Promise<ParserConfig[]> {
  const c = sb()
  const { data, error } = await c
    .from('complex_parsers')
    .select('*')
    .not('interval_minutes', 'is', null)
  if (error) return []
  const rows = (data ?? []) as ParserConfig[]
  return rows.filter(r => {
    const mins = r.interval_minutes ?? 0
    if (mins <= 0) return false
    if (!r.last_run_at) return true
    const elapsedMs = now.getTime() - new Date(r.last_run_at).getTime()
    return elapsedMs >= mins * 60_000
  })
}
