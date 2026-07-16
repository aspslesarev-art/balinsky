// Reader-facing on-page content (unique write-up + listing-specific FAQ)
// generated into assistant_kb (migrations 040 + 042) by
// scripts/kb-page-content.mjs. Detail pages prefer this over the thin/
// duplicate Airtable "SEO Text" + templated FAQ.

import { createClient } from '@supabase/supabase-js'
import type { Lang } from '@/lib/i18n'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type KbFaq = { q: string; a: string }
export type KbPageContent = { body: string | null; faq: KbFaq[] }

// kind: villa | apartment | complex | developer. airtableId = the row's
// airtable_id (= assistant_kb.ref_id). Returns null when nothing generated yet
// so callers fall back to their existing content.
export async function loadKbPageContent(
  kind: string,
  airtableId: string | null | undefined,
  lang: Lang,
): Promise<KbPageContent | null> {
  if (!airtableId) return null
  const { data, error } = await sb
    .from('assistant_kb')
    .select('page_body, page_body_en, faq, faq_en')
    .eq('kind', kind)
    .eq('ref_id', airtableId)
    .maybeSingle()
  if (error || !data) return null
  const body = ((lang === 'ru' ? data.page_body : data.page_body_en) as string | null) ?? null
  const faqRaw = (lang === 'ru' ? data.faq : data.faq_en) as unknown
  const faq: KbFaq[] = Array.isArray(faqRaw)
    ? faqRaw
        .filter((x): x is { q: unknown; a: unknown } => !!x && typeof x === 'object' && 'q' in x && 'a' in x)
        .map(x => ({ q: String(x.q), a: String(x.a) }))
        .filter(x => x.q && x.a)
    : []
  if (!body && faq.length === 0) return null
  return { body, faq }
}
