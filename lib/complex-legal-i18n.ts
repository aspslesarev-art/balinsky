// Per-language translations of the complex legal-audit fields. RU is the source
// (raw_complexes.data); scripts/translate-complex-legal.mjs renders each item
// into en/de/id/fr/zh/nl/pl/uk and stores them per language in Supabase Storage
// as feeds/_complex-legal-<lang>.json = { [complexId]: { ok: [...], questions: [...] } },
// one translated string per authored line. Read at runtime with an in-memory +
// fetch cache (same shape as lib/kb-summary-i18n). When a translation isn't
// generated yet we fall back to the RU source so the block still renders.
import { parseAuditItem, parseAuditItems, type AuditItem } from '@/lib/legal-audit'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export type LegalEntry = { ok?: string[]; questions?: string[] }
type Cache = Record<string, LegalEntry>

const _cache = new Map<string, { ts: number; data: Cache }>()
const TTL_MS = 5 * 60 * 1000

// Langs with a generated cache. RU is the source. ban (UI-scaffold only) has no
// legal translation of its own → serve the English one.
const SUPPORTED = new Set(['en', 'de', 'id', 'fr', 'zh', 'nl', 'pl', 'uk'])

export function legalLang(lang: string): string | null {
  if (lang === 'ban') return 'en'
  return SUPPORTED.has(lang) ? lang : null
}

export async function loadComplexLegalCache(lang: string): Promise<Cache> {
  const key = legalLang(lang)
  if (!key || !SUPABASE_URL) return {}
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data
  try {
    const r = await fetch(
      `${SUPABASE_URL}/storage/v1/object/public/feeds/_complex-legal-${key}.json`,
      { next: { revalidate: 300 } },
    )
    if (!r.ok) {
      _cache.set(key, { ts: Date.now(), data: {} })
      return {}
    }
    const data = (await r.json()) as Cache
    _cache.set(key, { ts: Date.now(), data })
    return data
  } catch {
    return _cache.get(key)?.data ?? {}
  }
}

// Turn a translated string[] (or nothing) into audit rows, falling back to the
// RU source text when the translation for this field/complex isn't ready yet.
export function resolveAuditItems(translated: string[] | undefined, ruRaw: string | null): AuditItem[] {
  if (translated && translated.length > 0) {
    return translated.map(parseAuditItem).filter(it => it.headline)
  }
  return parseAuditItems(ruRaw)
}

// Both audit fields for one complex in the requested language. `ru*Raw` are the
// authored source strings from raw_complexes.data.
export async function loadComplexAudit(
  complexId: string,
  lang: string,
  ruOkRaw: string | null,
  ruQuestionsRaw: string | null,
): Promise<{ ok: AuditItem[]; questions: AuditItem[] }> {
  if (lang === 'ru') {
    return { ok: parseAuditItems(ruOkRaw), questions: parseAuditItems(ruQuestionsRaw) }
  }
  const cache = await loadComplexLegalCache(lang)
  const entry = cache[complexId]
  return {
    ok: resolveAuditItems(entry?.ok, ruOkRaw),
    questions: resolveAuditItems(entry?.questions, ruQuestionsRaw),
  }
}
