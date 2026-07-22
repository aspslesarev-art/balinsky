// Per-section translation cache stored as JSON in Supabase Storage.
// Each section+language file is shaped as:
//   { [airtable_id]: { [field_name]: "translation" } }
// Filenames: EN keeps the historic suffix-less name; other languages add
// a `-<lang>` suffix (matches scripts/translate-missing.mjs output):
//   en → feeds/_translations-<section>.json
//   id → feeds/_translations-<section>-id.json
//   fr → feeds/_translations-<section>-fr.json
//
// The catalog loaders call `mergeTranslations` on each row's data blob
// (for the active language) before handing it to consumers — the tField()
// lookup then sees `<field> EN|ID|FR` populated and renders the translation
// without any caller-side changes.
//
// Cached in-process for TTL_MS; transient Supabase blips fall back to the
// last good copy so we never strip translations off a page mid-flight.

import type { Lang } from '@/lib/i18n'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const TTL_MS = 5 * 60 * 1000

export type Section =
  | 'villas'
  | 'apartments'
  | 'complexes'
  | 'developers'
  | 'news'
  | 'promo'
  | 'events'
  | 'knowledge'
  | 'rental'

type SectionCache = Record<string, Record<string, string>>

// Filename suffix + Airtable field suffix per language. RU is the source
// (never translated) and has no cache file.
const FILE_SUFFIX: Record<Exclude<Lang, 'ru'>, string> = {
  en: '', id: '-id', fr: '-fr', de: '-de', zh: '-zh', nl: '-nl', ban: '-ban', pl: '-pl', uk: '-uk',
}
const FIELD_SUFFIX: Record<Exclude<Lang, 'ru'>, string> = {
  en: ' EN', id: ' ID', fr: ' FR', de: ' DE', zh: ' ZH', nl: ' NL', ban: ' BAN', pl: ' PL', uk: ' UK',
}

/**
 * Manifest-style sections (news / promo / events / knowledge / rental)
 * surface fields as flat properties on the item (item.title, item.body, ...)
 * rather than Airtable's `data['<field> EN']` shape. This helper rewrites
 * those properties in-place when a translation exists in the (already
 * language-specific) cache. Returns a new object — callers shouldn't
 * mutate the manifest cache.
 */
export function applyManifestTranslation<T extends { id: string }>(
  item: T,
  cache: SectionCache,
  fields: readonly (keyof T)[],
): T {
  // This helper only runs for non-RU languages, so any Cyrillic that survives
  // (no cache entry, or a field the cache didn't cover) is an untranslated
  // leak — transliterate it to Latin so no Russian text reaches the page.
  const tr = cache[item.id]
  let out = item
  for (const f of fields) {
    const key = f as string
    const v = tr?.[key]
    let next: string | undefined
    if (typeof v === 'string' && v.trim()) {
      next = v
    } else {
      const cur = (item as Record<string, unknown>)[key]
      if (typeof cur === 'string' && hasCyrillic(cur)) next = translitPreserveCase(cur)
    }
    if (next !== undefined && next !== (item as Record<string, unknown>)[key]) {
      if (out === item) out = { ...item }
      ;(out as Record<string, unknown>)[key] = next
    }
  }
  return out
}

const _cache: Map<string, { ts: number; data: SectionCache }> = new Map()
const _inflight: Map<string, Promise<SectionCache>> = new Map()

function publicUrl(section: Section, lang: Exclude<Lang, 'ru'>): string {
  return `${SUPABASE_URL}/storage/v1/object/public/feeds/_translations-${section}${FILE_SUFFIX[lang]}.json`
}

async function fetchOnce(section: Section, lang: Exclude<Lang, 'ru'>, key: string): Promise<SectionCache> {
  try {
    const r = await fetch(publicUrl(section, lang), {
      // Section cache files are small (sub-MB) and only change when
      // we re-run translate-missing — give Next.js room to ISR them.
      next: { revalidate: 300, tags: [`translations:${section}`, `translations:${section}:${lang}`] },
    })
    if (!r.ok) return _cache.get(key)?.data ?? {}
    const j = (await r.json()) as SectionCache
    _cache.set(key, { ts: Date.now(), data: j })
    return j
  } catch {
    return _cache.get(key)?.data ?? {}
  }
}

/** Load the translation cache for a section in the given language. */
export async function loadTranslations(section: Section, lang: Lang): Promise<SectionCache> {
  if (lang === 'ru') return {}
  const key = `${section}:${lang}`
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data
  let p = _inflight.get(key)
  if (!p) {
    p = fetchOnce(section, lang, key).finally(() => _inflight.delete(key))
    _inflight.set(key, p)
  }
  return p
}

/** Back-compat: EN cache loader. */
export function loadEnTranslations(section: Section): Promise<SectionCache> {
  return loadTranslations(section, 'en')
}

/**
 * Merge a translation cache into a row's data blob for `lang`. Keys are
 * written as `<field> EN|ID|FR` (matching the Airtable convention tField
 * recognises) and only set when the slot is empty — Airtable's own
 * translated column always wins over the cache.
 */
export function mergeTranslations(
  data: Record<string, unknown>,
  airtableId: string,
  cache: SectionCache,
  lang: Lang,
): Record<string, unknown> {
  if (lang === 'ru') return data
  const tr = cache[airtableId]
  if (!tr) return data
  const suffix = FIELD_SUFFIX[lang]
  const out = { ...data }
  for (const [field, val] of Object.entries(tr)) {
    if (!val) continue
    const slot = `${field}${suffix}`
    const existing = out[slot]
    if (typeof existing === 'string' && existing.trim()) continue
    if (existing && typeof existing === 'object' && 'value' in (existing as { value?: unknown })) {
      const v = (existing as { value: unknown }).value
      if (typeof v === 'string' && v.trim()) continue
    }
    out[slot] = val
  }
  return out
}

/** Back-compat: merge EN cache as `<field> EN`. */
export function mergeEnTranslations(
  data: Record<string, unknown>,
  airtableId: string,
  cache: SectionCache,
): Record<string, unknown> {
  return mergeTranslations(data, airtableId, cache, 'en')
}

// All non-RU translation caches for a section, loaded together. The catalog
// loaders build one lang-agnostic dataset (cached once) with every language's
// slots populated, so tField() can resolve any active language off it.
export type AllTranslations = {
  en: SectionCache
  id: SectionCache
  fr: SectionCache
  de: SectionCache
  zh: SectionCache
  nl: SectionCache
  pl: SectionCache
  uk: SectionCache
}

export async function loadAllTranslations(section: Section): Promise<AllTranslations> {
  const [en, id, fr, de, zh, nl, pl, uk] = await Promise.all([
    loadTranslations(section, 'en'),
    loadTranslations(section, 'id'),
    loadTranslations(section, 'fr'),
    loadTranslations(section, 'de'),
    loadTranslations(section, 'zh'),
    loadTranslations(section, 'nl'),
    loadTranslations(section, 'pl'),
    loadTranslations(section, 'uk'),
  ])
  return { en, id, fr, de, zh, nl, pl, uk }
}

/** Merge EN+ID+FR+DE+ZH+NL+PL+UK translation slots into a row's data blob. */
export function mergeAllTranslations(
  data: Record<string, unknown>,
  airtableId: string,
  all: AllTranslations,
): Record<string, unknown> {
  let out = mergeTranslations(data, airtableId, all.en, 'en')
  out = mergeTranslations(out, airtableId, all.id, 'id')
  out = mergeTranslations(out, airtableId, all.fr, 'fr')
  out = mergeTranslations(out, airtableId, all.de, 'de')
  out = mergeTranslations(out, airtableId, all.zh, 'zh')
  out = mergeTranslations(out, airtableId, all.nl, 'nl')
  out = mergeTranslations(out, airtableId, all.pl, 'pl')
  out = mergeTranslations(out, airtableId, all.uk, 'uk')
  return out
}
