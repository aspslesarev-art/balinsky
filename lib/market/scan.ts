// Обход источников: берём порцию тех, кого дольше всех не опрашивали,
// собираем свежий срез и сводим его с историей.
//
// Порциями, а не всё разом: один прогон должен укладываться в лимит
// времени функции, а cron всё равно тикает часто и за окно обходит всех.

import type { SupabaseClient } from '@supabase/supabase-js'
import { scrapeSource } from './scrape'
import { applyScrape, today } from './apply'
import type { MarketSource } from './types'

export type SourceOutcome = {
  source_key: string
  developer: string
  complex: string
  status: 'ok' | 'error'
  units?: number
  created?: number
  events?: number
  gone?: number
  warnings?: string[]
  error?: string
}

export type ScanResult = {
  runId: number | null
  processed: number
  ok: number
  failed: number
  // Источники из выборки, до которых тик не успел дойти.
  skipped: number
  units: number
  events: number
  outcomes: SourceOutcome[]
}

// Сколько ждём, прежде чем опрашивать источник снова. Прайсы меняются
// не чаще раза в день, чаще дёргать чужие таблицы незачем.
const DEFAULT_STALE_HOURS = 20

// Сколько тик готов работать, прежде чем оставит остальных следующему.
// Первый обход источника дорогой (модель строит конфиг), дальше он идёт
// по сохранённому конфигу и укладывается в пару секунд. Дедлайн держим
// заметно ниже maxDuration, чтобы успеть закрыть журнал прогона: проверка
// стоит ПЕРЕД источником, поэтому в худшем случае тик длится бюджет плюс
// один самый долгий источник (прайс-картинка, до 120 с).
const DEFAULT_BUDGET_MS = 150_000

// Виды источников, под которые есть разбор. Остальные лежат в реестре и
// ждут своего адаптера, но в очередь обхода не попадают.
const SCANNABLE_KINDS = ['google', 'unitbox', 'notion', 'site', 'pdf']

export async function scanBatch(
  sb: SupabaseClient,
  opts: { limit?: number; staleHours?: number; sourceKey?: string; budgetMs?: number; note?: string } = {},
): Promise<ScanResult> {
  const limit = opts.limit ?? 10
  const staleHours = opts.staleHours ?? DEFAULT_STALE_HOURS
  const deadline = Date.now() + (opts.budgetMs ?? DEFAULT_BUDGET_MS)
  const sources = await pickSources(sb, limit, staleHours, opts.sourceKey)

  if (!sources.length) {
    return { runId: null, processed: 0, ok: 0, failed: 0, skipped: 0, units: 0, events: 0, outcomes: [] }
  }

  // Пометка запуска попадает в журнал: по ней видно, ночной это тик
  // или кто-то прогнал трекер руками.
  const { data: run } = await sb.from('market_scan_runs').insert({ note: opts.note ?? null }).select('id').single()
  const runId = run ? Number(run.id) : null

  const outcomes: SourceOutcome[] = []
  let units = 0
  let events = 0
  let skipped = 0

  for (const source of sources) {
    // Источник, до которого не дошли, просто останется первым в очереди
    // на следующем тике — расписание само его подхватит.
    if (Date.now() > deadline) { skipped++; continue }
    const label = { source_key: source.source_key, developer: source.developer, complex: source.complex }
    try {
      const prevScanDay = source.last_scan_at ? String(source.last_scan_at).slice(0, 10) : null
      const scraped = await scrapeSource(source)
      const applied = await applyScrape(sb, source, scraped.units, { day: today(), prevScanDay })

      units += applied.units
      events += applied.events
      await markScanned(sb, source, {
        status: 'ok',
        units: applied.units,
        error: scraped.warnings.length ? scraped.warnings.join('; ').slice(0, 900) : null,
        layout: scraped.layout,
        fingerprint: scraped.fingerprint,
      })
      outcomes.push({ ...label, status: 'ok', ...applied, warnings: scraped.warnings })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await markScanned(sb, source, { status: 'error', units: null, error: message.slice(0, 900) })
      outcomes.push({ ...label, status: 'error', error: message })
    }
  }

  const ok = outcomes.filter(o => o.status === 'ok').length
  if (runId !== null) {
    await sb.from('market_scan_runs').update({
      finished_at: new Date().toISOString(),
      sources_ok: ok,
      sources_failed: outcomes.length - ok,
      sources_skipped: skipped,
      units_seen: units,
      events_written: events,
    }).eq('id', runId)
  }

  return { runId, processed: outcomes.length, ok, failed: outcomes.length - ok, skipped, units, events, outcomes }
}

type SourceRow = MarketSource & { last_scan_at: string | null }

async function pickSources(
  sb: SupabaseClient,
  limit: number,
  staleHours: number,
  sourceKey?: string,
): Promise<SourceRow[]> {
  const select = 'id, source_key, source_kind, source_url, spreadsheet_id, gid, row_no, developer, complex, unit_types, active, layout, layout_fingerprint, last_scan_at'

  if (sourceKey) {
    const { data, error } = await sb.from('market_sources').select(select).eq('source_key', sourceKey).limit(1)
    if (error) throw new Error(`выбор источника: ${error.message}`)
    return (data ?? []) as SourceRow[]
  }

  const cutoff = new Date(Date.now() - staleHours * 3600_000).toISOString()
  const { data, error } = await sb
    .from('market_sources')
    .select(select)
    .eq('active', true)
    .in('source_kind', SCANNABLE_KINDS)
    .or(`last_scan_at.is.null,last_scan_at.lt.${cutoff}`)
    .order('last_scan_at', { ascending: true, nullsFirst: true })
    .limit(limit)
  if (error) throw new Error(`выбор источников: ${error.message}`)
  return (data ?? []) as SourceRow[]
}

async function markScanned(
  sb: SupabaseClient,
  source: MarketSource,
  r: { status: 'ok' | 'error'; units: number | null; error: string | null; layout?: unknown; fingerprint?: string },
): Promise<void> {
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    last_scan_at: now,
    last_status: r.status,
    last_units: r.units,
    last_error: r.error,
    updated_at: now,
  }
  // Дата последнего удачного разбора остаётся нетронутой на ошибках —
  // по ней потом видно, когда именно прайс перестал читаться.
  if (r.status === 'ok') patch.last_ok_at = now
  // Конфиг сохраняем только когда он реально пересобирался — иначе
  // затрём рабочий пустыми значениями.
  if (r.layout && r.fingerprint) {
    patch.layout = r.layout
    patch.layout_fingerprint = r.fingerprint
    patch.layout_built_at = new Date().toISOString()
  }
  const { error } = await sb.from('market_sources').update(patch).eq('id', source.id)
  if (error) throw new Error(`обновление market_sources: ${error.message}`)
}
