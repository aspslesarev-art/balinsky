// Per-complex legal due-diligence, shown on the complex page as two collapsible
// blocks: "что в порядке" (public) and "вопросы / что запросить" (lead-gated).
// Authored by hand in /admin/data as two plain-text fields — ONE ITEM PER LINE.
// The visible headline of each row is the lead of the line (up to the first
// sentence break); the rest expands. So an editor can paste what they already
// wrote, no markup. This module is import-safe on both server and client — keep
// it free of server-only deps.

// JSONB keys on raw_complexes. Colons in keys are fine (cf. the existing
// "SEO:Title"), and admin reads/writes them through the generic field engine.
export const LEGAL_OK_FIELD = 'Юр-проверка: в порядке'
export const LEGAL_QUESTIONS_FIELD = 'Юр-проверка: вопросы'

export type AuditItem = { headline: string; body: string }

// The lead ends at the first sentence break. `. ` and `: ` (plus their CJK
// counterparts) split a headline from its detail; a bare period inside a date
// or number ("16.07.2024", "3602.7 м2") has no following space, so it's never
// mistaken for a break.
const SEPARATORS = ['. ', ': ', '。', '：']

/** Split one authored line into a visible headline and an expandable body. */
export function parseAuditItem(line: string): AuditItem {
  const s = line.trim()
  if (!s) return { headline: '', body: '' }
  let at = -1
  let sepLen = 0
  for (const sep of SEPARATORS) {
    const i = s.indexOf(sep)
    if (i > 0 && (at === -1 || i < at)) {
      at = i
      sepLen = sep.length
    }
  }
  if (at === -1) return { headline: s, body: '' }
  return { headline: s.slice(0, at).trim(), body: s.slice(at + sepLen).trim() }
}

/** Parse a whole field (one item per line) into audit rows. */
export function parseAuditItems(raw: string | null | undefined): AuditItem[] {
  if (!raw) return []
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(parseAuditItem)
}

/** First string out of a JSONB value that may be a string, array, or {value}. */
export function firstAuditString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return firstAuditString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstAuditString((v as { value: unknown }).value)
  return null
}
