// Синхронизация реестра источников с мастер-таблицей.
//
// Реестр руками не ведётся: добавили строку в мастер-таблицу — источник
// сам появится в трекере на следующем прогоне, убрали — станет
// неактивным (но история по нему сохранится).

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchMaster, type MasterRow } from './master-sheet'
import { linkCatalog } from './catalog'

export type SyncResult = {
  total: number
  added: number
  deactivated: number
  skipped: number
  // Комплексы, сопоставленные с каталогом сайта этим прогоном, и те,
  // которым пары не нашлось — без связи юнит не виден аналитике.
  linked: number
  unlinked: string[]
}

export async function syncSources(sb: SupabaseClient): Promise<SyncResult> {
  const { rows, skipped } = await fetchMaster()
  if (!rows.length) throw new Error('мастер-таблица не дала ни одного источника')

  const { data: before, error: readErr } = await sb.from('market_sources').select('source_key, active')
  if (readErr) throw new Error(`чтение market_sources: ${readErr.message}`)
  const known = new Set((before ?? []).map(r => String(r.source_key)))

  const payload = rows.map(toRow)
  for (let i = 0; i < payload.length; i += 200) {
    const { error } = await sb.from('market_sources').upsert(payload.slice(i, i + 200), { onConflict: 'source_key' })
    if (error) throw new Error(`запись market_sources: ${error.message}`)
  }

  // Источник исчез из мастер-таблицы — перестаём его опрашивать, но
  // строки и историю не трогаем.
  const live = new Set(rows.map(r => r.sourceKey))
  const stale = (before ?? []).filter(r => r.active && !live.has(String(r.source_key))).map(r => String(r.source_key))
  if (stale.length) {
    const { error } = await sb.from('market_sources').update({ active: false, updated_at: new Date().toISOString() }).in('source_key', stale)
    if (error) throw new Error(`деактивация market_sources: ${error.message}`)
  }

  const links = await linkCatalog(sb)

  return {
    total: rows.length,
    added: rows.filter(r => !known.has(r.sourceKey)).length,
    deactivated: stale.length,
    skipped: skipped.length,
    linked: links.linked,
    unlinked: links.unmatched,
  }
}

function toRow(r: MasterRow): Record<string, unknown> {
  return {
    source_key: r.sourceKey,
    source_kind: r.kind,
    source_url: r.url,
    spreadsheet_id: r.spreadsheetId,
    gid: r.gid,
    row_no: r.rowNo,
    developer: r.developer,
    complex: r.complex,
    unit_types: r.unitTypes,
    active: true,
    updated_at: new Date().toISOString(),
  }
}
