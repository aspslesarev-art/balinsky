// Which admin fields get an "✨ AI" button, keyed purely by field name so it
// works across every collection and even for fields added ad-hoc. Pure &
// client-safe (no server imports) — the panel imports this to decide whether
// to show the button; the server prompt library imports aiTaskFor to pick the
// right prompt.

export type AiTask =
  | 'seo_title'
  | 'seo_desc'
  | 'description'
  | 'headline'
  | 'yield'
  | 'team'
  | 'reputation'

/** Map a field key to an AI task, or null if this field has no generator. */
export function aiTaskFor(field: string): AiTask | null {
  const k = field.trim().toLowerCase()
  if (!k) return null
  // SEO title first — it also contains "заголовок", so it must win over headline.
  if (k === 'seo:title' || k === 'seo title' || k === 'seotitle' || k === 'заголовок') return 'seo_title'
  if (k === 'seodescription' || (k.includes('seo') && (k.includes('desc') || k.includes('описан')))) return 'seo_desc'
  if (k === 'доходность' || k === 'заявленная доходность') return 'yield'
  if (k === 'команда') return 'team'
  if (k.includes('репутац')) return 'reputation'
  // Headline for editorial items (news/promo/events manifest field is `title`).
  if (k === 'title' || k === 'название материала') return 'headline'
  // Long descriptive text (villa/apt/complex descriptions, developer AI text,
  // news/promo/event body, knowledge body, generic "Описание"/"SEO Text").
  if (
    k === 'body' ||
    k === 'seo text' ||
    k.includes('описан') ||
    k.includes('ии описан') ||
    k.includes('текст')
  ) return 'description'
  return null
}

export function hasAi(field: string): boolean {
  return aiTaskFor(field) !== null
}
