// Цена внутри текстов объявления: описание, SEO, посты, FAQ, база знаний
// Балины и переводы на все языки. Ночной крон меняет числовую цену, а
// тексты писались один раз — без этой правки на странице висело
// «стоимость 750 000 долларов» рядом с карточкой «$650 000».
//
// Старую цену ищем по русскому тексту (число рядом с «долл»/USD/$, не в
// контексте аренды и цены за м²) плюс по meta.price_usd в базе знаний,
// и заменяем её во всех текстах объекта, сохраняя разделитель разрядов
// («750 000», «750,000», «750000» — так её записали переводы).

import fs from 'node:fs'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ListingKind = 'villa' | 'apartment'

const TABLE: Record<ListingKind, string> = { villa: 'raw_villas', apartment: 'raw_apartments' }
const SECTION: Record<ListingKind, string> = { villa: 'villas', apartment: 'apartments' }
// Файлы переводов в Storage `feeds/_translations-<section><suffix>.json`.
// У балийского файла нет (Storage отдаёт 400) — он берёт тексты из EN.
const TRANSLATION_SUFFIXES = ['', '-id', '-fr', '-de', '-zh', '-nl', '-pl', '-uk']

// Поля-идентификаторы: в них цена — часть ссылки или ключа поста, их не трогаем.
const SKIP_FIELDS = new Set(['Post ID', 'Post link', 'Задать вопрос', 'Забронировать', 'slug'])
const SKIP_FIELD_RE = /url|link|photo|фото|image/i

const SEP = "[ \\u00a0\\u202f,.'’]"
const AMOUNT = `\\d{1,3}(?:${SEP}\\d{3})+|\\d{5,7}`
// Сумма в долларах: «750 000 долларов», «USD 750,000», «$750,000».
const USD_AMOUNT_RE = new RegExp(`(?:(?:\\$|USD)\\s?(${AMOUNT}))|(?:(${AMOUNT})\\s?(?:долл|USD|\\$|dollars))`, 'gi')
// Сумма рядом с этими словами — доход, аренда или цена за метр, а не цена объекта.
const NOT_PRICE_BEFORE = /(доход|аренд|в год|в месяц|ежемесяч|взнос|депозит|бронь|брони|рассрочк|м²|за м|за квадрат|income|rent|per|deposit)[^.]{0,40}$/i
const NOT_PRICE_AFTER = /^\s?(?:долл\S*\s?(?:США\s?)?|USD\s?|dollars\s?)?(?:в год|в месяц|в сутки|за ночь|за м|\/|per|a year|a month|за квадрат)/i

const digits = (s: string) => Number(s.replace(/\D/g, ''))

/** Цены в долларах, упомянутые в тексте как цена объекта. */
export function usdPricesInText(text: string): number[] {
  const out: number[] = []
  for (const m of text.matchAll(USD_AMOUNT_RE)) {
    const raw = m[1] ?? m[2]
    if (!raw) continue
    const at = m.index ?? 0
    const numEnd = at + m[0].indexOf(raw) + raw.length
    if (NOT_PRICE_BEFORE.test(text.slice(Math.max(0, at - 60), at))) continue
    if (NOT_PRICE_AFTER.test(text.slice(numEnd, numEnd + 40))) continue
    out.push(digits(raw))
  }
  return out
}

/** Похоже на прежнюю цену этого объекта: того же порядка, но не текущая. */
function isStaleCandidate(value: number, price: number): boolean {
  if (!Number.isFinite(value) || value < 10_000) return false
  const ratio = value / price
  if (ratio < 1 / 3 || ratio > 3) return false
  return Math.abs(value - price) / price > 0.005
}

export function stalePrices(texts: Array<string | null | undefined>, price: number, extra: Array<number | null | undefined> = []): number[] {
  const found = new Set<number>()
  for (const t of texts) if (t) for (const v of usdPricesInText(t)) if (isStaleCandidate(v, price)) found.add(v)
  for (const v of extra) if (v != null && isStaleCandidate(Number(v), price)) found.add(Number(v))
  return [...found]
}

function groups(n: number): string[] {
  const s = String(Math.round(n))
  const head = s.length % 3 || 3
  const out = [s.slice(0, head)]
  for (let i = head; i < s.length; i += 3) out.push(s.slice(i, i + 3))
  return out
}

/** Заменить сумму `from` на `to` в любом написании, сохраняя разделитель разрядов. */
export function replacePrice(text: string, from: number, to: number): string {
  const g = groups(from)
  // Разделитель между группами один и тот же (\1); перед и после — не цифры,
  // чтобы 750 000 не совпало внутри 1 750 000 или 750 000,5.
  const body = g.length === 1 ? g[0] : g[0] + `(${SEP}?)` + g.slice(1).join('(?:\\1)')
  const re = new RegExp(`(?<!\\d${SEP}?)${body}(?!\\d|[.,]\\d)`, 'g')
  const ng = groups(to)
  return text.replace(re, (_m, sep?: string) => ng.join(sep ?? ''))
}

function replaceAll(text: string, olds: number[], to: number): string {
  let out = text
  for (const o of olds) out = replacePrice(out, o, to)
  return out
}

export type TextPriceTarget = { kind: ListingKind; id: string; price: number; oldPrices?: number[] }
export type TextPriceChange = { kind: ListingKind; id: string; from: number[]; to: number; fields: string[] }

type KbRow = { id: number; summary: string | null; embedding_text: string | null; page_body: string | null; page_body_en: string | null; faq: unknown; faq_en: unknown; meta: Record<string, unknown> | null }

/**
 * Привести цену в текстах объектов к текущей. Пишет `raw_*`, `assistant_kb`
 * и файлы переводов; сброс кэшей страниц — на вызывающем.
 */
export async function fixTextPrices(
  sb: SupabaseClient,
  targets: TextPriceTarget[],
  opts: { dry?: boolean; backupDir?: string; log?: (s: string) => void } = {},
): Promise<TextPriceChange[]> {
  const log = opts.log ?? (() => {})
  const changes: TextPriceChange[] = []

  for (const t of targets) {
    const { data: row, error } = await sb.from(TABLE[t.kind]).select('data').eq('airtable_id', t.id).maybeSingle()
    if (error) throw new Error(`чтение ${TABLE[t.kind]} ${t.id}: ${error.message}`)
    if (!row) continue
    const data = (row.data ?? {}) as Record<string, unknown>
    const { data: kbRows, error: kbErr } = await sb.from('assistant_kb')
      .select('id, summary, embedding_text, page_body, page_body_en, faq, faq_en, meta')
      .eq('ref_id', t.id)
    if (kbErr) throw new Error(`чтение assistant_kb ${t.id}: ${kbErr.message}`)
    const kb = (kbRows ?? []) as KbRow[]

    const olds = new Set(t.oldPrices?.filter(o => isStaleCandidate(o, t.price)) ?? [])
    for (const o of stalePrices(
      [str(data['SEO Text']), str(data['Post Text Clean']), str(data['SEO:Description']), ...kb.flatMap(k => [k.page_body, k.summary, JSON.stringify(k.faq ?? '')])],
      t.price,
      kb.map(k => numberOrNull(k.meta?.price_usd)),
    )) olds.add(o)
    if (!olds.size) continue
    const from = [...olds]

    const fields: string[] = []
    const next: Record<string, unknown> = { ...data }
    for (const [key, value] of Object.entries(data)) {
      if (SKIP_FIELDS.has(key.trim()) || SKIP_FIELD_RE.test(key)) continue
      if (typeof value === 'string') {
        const fixed = replaceAll(value, from, t.price)
        if (fixed !== value) { next[key] = fixed; fields.push(key) }
      } else if (value && typeof value === 'object' && typeof (value as { value?: unknown }).value === 'string') {
        const v = (value as { value: string }).value
        const fixed = replaceAll(v, from, t.price)
        if (fixed !== v) { next[key] = { ...(value as object), value: fixed }; fields.push(key) }
      }
    }

    const kbUpdates: Array<{ id: number; patch: Record<string, unknown> }> = []
    for (const k of kb) {
      const patch: Record<string, unknown> = {}
      for (const col of ['summary', 'embedding_text', 'page_body', 'page_body_en'] as const) {
        const v = k[col]
        if (typeof v === 'string') { const f = replaceAll(v, from, t.price); if (f !== v) patch[col] = f }
      }
      for (const col of ['faq', 'faq_en'] as const) {
        if (k[col] == null) continue
        const s = JSON.stringify(k[col])
        const f = replaceAll(s, from, t.price)
        if (f !== s) patch[col] = JSON.parse(f)
      }
      const meta = k.meta ?? {}
      if (numberOrNull(meta.price_usd) !== t.price) {
        const area = numberOrNull(data['Площадь'])
        patch.meta = { ...meta, price_usd: t.price, ...(area && meta.price_per_sqm_usd != null ? { price_per_sqm_usd: Math.round(t.price / area) } : {}) }
      }
      if (Object.keys(patch).length) { kbUpdates.push({ id: k.id, patch }); fields.push(...Object.keys(patch).map(c => 'kb.' + c)) }
    }

    if (!fields.length) continue
    changes.push({ kind: t.kind, id: t.id, from, to: t.price, fields })
    log(`${t.kind} ${t.id}: ${from.join('/')} → ${t.price} · ${fields.join(', ')}`)
    if (opts.dry) continue

    if (fields.some(f => !f.startsWith('kb.'))) {
      const { error: wErr } = await sb.from(TABLE[t.kind]).update({ data: next }).eq('airtable_id', t.id)
      if (wErr) throw new Error(`запись ${TABLE[t.kind]} ${t.id}: ${wErr.message}`)
    }
    for (const u of kbUpdates) {
      const { error: kErr } = await sb.from('assistant_kb').update(u.patch).eq('id', u.id)
      if (kErr) throw new Error(`запись assistant_kb ${u.id}: ${kErr.message}`)
    }
  }

  if (changes.length) await fixTranslations(sb, changes, opts, log)
  return changes
}

async function fixTranslations(
  sb: SupabaseClient,
  changes: TextPriceChange[],
  opts: { dry?: boolean; backupDir?: string },
  log: (s: string) => void,
): Promise<void> {
  for (const kind of ['villa', 'apartment'] as const) {
    const mine = changes.filter(c => c.kind === kind)
    if (!mine.length) continue
    for (const suffix of TRANSLATION_SUFFIXES) {
      const file = `_translations-${SECTION[kind]}${suffix}.json`
      const { data: blob, error } = await sb.storage.from('feeds').download(file)
      if (error || !blob) { log(`перевод ${file}: не скачался (${error?.message ?? 'пусто'}), пропуск`); continue }
      const raw = await blob.text()
      const cache = JSON.parse(raw) as Record<string, Record<string, string>>
      let touched = 0
      for (const c of mine) {
        const entry = cache[c.id]
        if (!entry) continue
        for (const [field, val] of Object.entries(entry)) {
          if (typeof val !== 'string' || SKIP_FIELDS.has(field.trim()) || SKIP_FIELD_RE.test(field)) continue
          const fixed = replaceAll(val, c.from, c.to)
          if (fixed !== val) { entry[field] = fixed; touched++ }
        }
      }
      if (!touched) continue
      log(`перевод ${file}: поправлено полей ${touched}`)
      if (opts.dry) continue
      if (opts.backupDir) {
        fs.mkdirSync(opts.backupDir, { recursive: true })
        fs.writeFileSync(path.join(opts.backupDir, file), raw)
      }
      const { error: upErr } = await sb.storage.from('feeds').upload(file, JSON.stringify(cache), { contentType: 'application/json', upsert: true })
      if (upErr) throw new Error(`запись ${file}: ${upErr.message}`)
    }
  }
}

function str(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && typeof (v as { value?: unknown }).value === 'string') return (v as { value: string }).value
  return null
}

function numberOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}
