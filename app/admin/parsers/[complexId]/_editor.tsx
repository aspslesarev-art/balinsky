'use client'

import { useState } from 'react'
import { Play, Save, Trash2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ParserConfig, ParserType } from '@/lib/complex-parsers'

const PARSER_TYPES: Array<{ value: ParserType; label: string; hint: string }> = [
  { value: 'bali_baza', label: 'BALI BAZA (Google Sheets)', hint: 'Прайс-лист BALI BAZA с колонками Section / Type / Bedroom / Villa size / Total / Price / Land / Status' },
  { value: 'generic_gsheet', label: 'Generic Google Sheets (скоро)', hint: 'Любой Google Sheets — пока не реализовано' },
  { value: 'manual_csv', label: 'Ручной CSV (скоро)', hint: 'Загрузить CSV-файл руками — пока не реализовано' },
]

type RunResult =
  | { ok: true; unitsCount: number; warnings: string[] }
  | { ok: false; error: string; detail?: string }

export function ParserEditor({ complexId, complexName, initial }: {
  complexId: string
  complexName: string
  initial: ParserConfig | null
}) {
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? '')
  const [parserType, setParserType] = useState<ParserType>(initial?.parser_type ?? 'bali_baza')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [savedAt, setSavedAt] = useState<string | null>(initial?.updated_at ?? null)
  const [lastRun, setLastRun] = useState<RunResult | null>(null)
  const [busy, setBusy] = useState<null | 'save' | 'run' | 'delete'>(null)
  const [err, setErr] = useState<string | null>(null)

  const typeMeta = PARSER_TYPES.find(t => t.value === parserType)!

  async function save() {
    if (!sourceUrl.trim()) { setErr('Укажи source URL'); return }
    setBusy('save'); setErr(null)
    try {
      const r = await fetch(`/api/admin/parsers/${encodeURIComponent(complexId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: sourceUrl.trim(), parser_type: parserType, notes }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'save_failed')
      setSavedAt(j.parser?.updated_at ?? new Date().toISOString())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'save_failed')
    } finally { setBusy(null) }
  }

  async function run() {
    setBusy('run'); setErr(null); setLastRun(null)
    try {
      // Save first to ensure DB has the latest URL/type
      await save()
      const r = await fetch(`/api/admin/parsers/${encodeURIComponent(complexId)}/run`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) setLastRun({ ok: false, error: j.error || 'run_failed', detail: j.detail })
      else setLastRun({ ok: true, unitsCount: j.unitsCount, warnings: j.warnings ?? [] })
    } catch (e) {
      setLastRun({ ok: false, error: e instanceof Error ? e.message : 'run_failed' })
    } finally { setBusy(null) }
  }

  async function remove() {
    if (!confirm(`Удалить настройки парсера для «${complexName}»?`)) return
    setBusy('delete'); setErr(null)
    try {
      const r = await fetch(`/api/admin/parsers/${encodeURIComponent(complexId)}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('delete_failed')
      setSavedAt(null); setSourceUrl(''); setNotes('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'delete_failed')
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-5">
      {/* Config form */}
      <section className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-5 space-y-4">
        <div>
          <label className="block text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1.5">Тип парсера</label>
          <select
            value={parserType}
            onChange={e => setParserType(e.target.value as ParserType)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[14px] text-[var(--ax-fg)]"
          >
            {PARSER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="mt-1 text-[12px] text-[var(--ax-fg-faint)]">{typeMeta.hint}</div>
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1.5">Source URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=NNN"
            className="w-full px-3 py-2 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[14px] font-mono text-[var(--ax-fg)]"
          />
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-[var(--color-primary)] no-underline">
              открыть источник <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div>
          <label className="block text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1.5">Заметки</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Кто прислал ссылку, формат, нюансы…"
            className="w-full px-3 py-2 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)] resize-none"
          />
        </div>

        {err && <div className="text-[12px] text-rose-500">⚠️ {err}</div>}

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--ax-border-soft)]">
          <button
            type="button"
            onClick={save}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] font-medium text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] disabled:opacity-50"
          >
            <Save size={14} /> Сохранить
          </button>
          <button
            type="button"
            onClick={run}
            disabled={busy != null || !sourceUrl.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-[13px] font-medium hover:bg-[var(--color-primary-pressed)] disabled:opacity-50"
          >
            <Play size={14} /> {busy === 'run' ? 'Парсим…' : 'Запустить сейчас'}
          </button>
          {savedAt && (
            <button
              type="button"
              onClick={remove}
              disabled={busy != null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-rose-500 hover:bg-rose-500/10 ml-auto"
            >
              <Trash2 size={13} /> Удалить настройки
            </button>
          )}
          {savedAt && (
            <div className="text-[11.5px] text-[var(--ax-fg-faint)] ml-auto">
              сохранено · {new Date(savedAt).toLocaleString('ru-RU')}
            </div>
          )}
        </div>
      </section>

      {/* Last run results */}
      {lastRun && (
        <section className={`rounded-2xl border p-4 ${lastRun.ok ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
          <div className="flex items-center gap-2 text-[14px] font-semibold mb-2 text-[var(--ax-fg)]">
            {lastRun.ok ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-rose-500" />}
            {lastRun.ok ? `Парсер отработал — ${lastRun.unitsCount} юнитов` : `Ошибка: ${lastRun.error}`}
          </div>
          {lastRun.ok && lastRun.warnings.length > 0 && (
            <ul className="text-[12px] text-[var(--ax-fg-muted)] list-disc pl-5 space-y-0.5">
              {lastRun.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          {!lastRun.ok && lastRun.detail && (
            <pre className="text-[11.5px] text-[var(--ax-fg-muted)] whitespace-pre-wrap break-words font-mono">{lastRun.detail}</pre>
          )}
        </section>
      )}

      {/* Last sync info from DB */}
      {initial?.last_run_at && (
        <section className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-4 text-[12.5px] text-[var(--ax-fg-soft)] space-y-1">
          <div>Предыдущий запуск: <span className="text-[var(--ax-fg)]">{new Date(initial.last_run_at).toLocaleString('ru-RU')}</span></div>
          <div>Статус: <span className={initial.last_status === 'ok' ? 'text-emerald-500' : 'text-rose-500'}>{initial.last_status ?? '—'}</span></div>
          {initial.last_units_count != null && <div>Юнитов: <span className="text-[var(--ax-fg)] tabular-nums">{initial.last_units_count}</span></div>}
          {initial.last_error && <div className="text-rose-500 break-words">⚠️ {initial.last_error}</div>}
        </section>
      )}
    </div>
  )
}
