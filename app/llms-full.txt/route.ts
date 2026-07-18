// /llms-full.txt — the complete, always-current catalogue corpus for LLMs.
//
// One machine-readable text file listing EVERY villa / apartment / complex /
// developer / district (and rental) with its investor summary and links to the
// live page + its clean `.md` full-text view. Generated from assistant_kb (the
// same embedded knowledge base that powers Balisa + /api/llm/search), so it
// stays in sync as listings change. This is the "train on our whole catalogue"
// surface: an AI can ingest this index, then fetch each `.md` for full text or
// hit /api/llm/search for semantic lookup.
import { createClient } from '@supabase/supabase-js'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'
import { loadKbSummaryCache } from '@/lib/kb-summary-i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Row = { ref_id: string; kind: string; slug: string | null; title: string | null; summary: string | null }

function pagePath(kind: string, slug: string): string | null {
  switch (kind) {
    case 'villa': return `/en/villas/o/${slug}`
    case 'apartment': return `/en/apartments/o/${slug}`
    case 'complex': return `/en/complexes/o/${slug}`
    case 'developer': return `/en/developers/${slug}`
    case 'rental': return `/en/rental/o/${slug}`
    default: return null
  }
}

const SECTION_TITLE: Record<string, string> = {
  villa: 'Villas', apartment: 'Apartments', complex: 'Residential complexes',
  developer: 'Developers', district: 'District guides', market: 'Market overview', rental: 'Long-term rentals',
}
const ORDER = ['villa', 'apartment', 'complex', 'developer', 'rental', 'district', 'market']

async function loadAll(): Promise<Row[]> {
  const out: Row[] = []
  let from = 0
  const page = 1000
  for (;;) {
    const { data, error } = await sb
      .from('assistant_kb')
      .select('ref_id, kind, slug, title, summary')
      .not('summary', 'is', null)
      .order('kind', { ascending: true })
      .range(from, from + page - 1)
    if (error) break
    if (!data || data.length === 0) break
    out.push(...(data as Row[]))
    if (data.length < page) break
    from += page
  }
  return out
}

export async function GET(req: Request) {
  const lang = (new URL(req.url).searchParams.get('lang') || 'en').toLowerCase()
  const [rows, tr] = await Promise.all([
    loadAll(),
    lang === 'ru' ? Promise.resolve({} as Record<string, { title?: string; summary?: string }>) : loadKbSummaryCache(lang),
  ])
  const deCyr = (s: string) => (lang !== 'ru' && hasCyrillic(s) ? translitPreserveCase(s) : s)
  const byKind = new Map<string, Row[]>()
  for (const r of rows) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, [])
    byKind.get(r.kind)!.push(r)
  }

  const lines: string[] = []
  lines.push('# Balinsky — full catalogue corpus for AI')
  lines.push('')
  lines.push('> Every listing on balinsky.info (Bali real estate) with a short investor summary,')
  lines.push('> a link to the page, and a link to its clean full-text `.md` view. Always current.')
  lines.push(`> Language: ${lang}. Other languages: append ?lang=en|de|fr|id|zh|nl|ru.`)
  lines.push('> Semantic search over this corpus: ' + SITE + '/api/llm/search?q=<your+query>&lang=' + lang)
  lines.push('> Per-page structured data: append `.json` to any URL. Index: ' + SITE + '/llms.txt')
  lines.push('')

  for (const kind of ORDER) {
    const list = byKind.get(kind)
    if (!list || list.length === 0) continue
    lines.push(`## ${SECTION_TITLE[kind] ?? kind} (${list.length})`)
    lines.push('')
    for (const r of list) {
      const trById = tr[r.ref_id]
      const rawTitle = (trById?.title || r.title || '').trim() || r.slug || '(untitled)'
      const title = deCyr(rawTitle)
      const path = r.slug ? pagePath(kind, r.slug) : null
      const rawSummary = (trById?.summary || r.summary || '').replace(/\s+/g, ' ').trim()
      const summary = deCyr(rawSummary)
      if (path) {
        lines.push(`### ${title}`)
        lines.push(`${SITE}${path} · full text: ${SITE}${path}.md`)
      } else {
        lines.push(`### ${title}`)
      }
      if (summary) lines.push(summary)
      lines.push('')
    }
  }

  const body = lines.join('\n')
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
