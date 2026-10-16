// /llms-full.txt — the complete, always-current catalogue corpus for LLMs.
//
// One machine-readable text file listing EVERY published villa / apartment /
// complex / developer / rental (plus district guides) with its investor
// summary and links to the live page + its clean `.md` full-text view.
//
// Список объектов — из тех же загрузчиков, что каталог и карта сайта
// (lib/llm/catalog.ts): только опубликованное, без скрытых застройщиков, со
// slug реальных страниц. assistant_kb даёт лишь текст описания; из него
// вырезаются заявленная застройщиком доходность и чужие контакты, а
// доходность пишется своя — из listing_yields.
import { createClient } from '@supabase/supabase-js'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'
import { loadKbSummaryCache } from '@/lib/kb-summary-i18n'
import { LANGS, switchLangPath, type Lang } from '@/lib/i18n'
import { loadAiCatalog, sanitizeAiText, factsLine, yieldLine, type AiEntry, type AiKind } from '@/lib/llm/catalog'
import { isHiddenDeveloper } from '@/lib/hidden-developers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Row = { ref_id: string; kind: string; slug: string | null; title: string | null; summary: string | null; meta: Record<string, unknown> | null }

type SectionKind = AiKind | 'district' | 'market'
const ORDER: SectionKind[] = ['villa', 'apartment', 'complex', 'developer', 'rental', 'district', 'market']

const SECTION_TITLE: Record<string, Record<SectionKind, string>> = {
  ru: { villa: 'Виллы', apartment: 'Апартаменты', complex: 'Жилые комплексы', developer: 'Застройщики', rental: 'Долгосрочная аренда', district: 'Районы', market: 'Обзор рынка' },
  en: { villa: 'Villas', apartment: 'Apartments', complex: 'Residential complexes', developer: 'Developers', rental: 'Long-term rentals', district: 'District guides', market: 'Market overview' },
  id: { villa: 'Vila', apartment: 'Apartemen', complex: 'Kompleks hunian', developer: 'Pengembang', rental: 'Sewa jangka panjang', district: 'Panduan area', market: 'Ikhtisar pasar' },
  fr: { villa: 'Villas', apartment: 'Appartements', complex: 'Résidences', developer: 'Promoteurs', rental: 'Locations longue durée', district: 'Guides des quartiers', market: 'Aperçu du marché' },
  de: { villa: 'Villen', apartment: 'Apartments', complex: 'Wohnanlagen', developer: 'Bauträger', rental: 'Langzeitmiete', district: 'Gebietsführer', market: 'Marktüberblick' },
  zh: { villa: '别墅', apartment: '公寓', complex: '住宅区', developer: '开发商', rental: '长租', district: '区域指南', market: '市场概览' },
  nl: { villa: "Villa's", apartment: 'Appartementen', complex: 'Wooncomplexen', developer: 'Ontwikkelaars', rental: 'Langetermijnhuur', district: 'Gebiedsgidsen', market: 'Marktoverzicht' },
  pl: { villa: 'Wille', apartment: 'Apartamenty', complex: 'Osiedla', developer: 'Deweloperzy', rental: 'Wynajem długoterminowy', district: 'Przewodniki po dzielnicach', market: 'Przegląd rynku' },
  uk: { villa: 'Вілли', apartment: 'Апартаменти', complex: 'Житлові комплекси', developer: 'Забудовники', rental: 'Довгострокова оренда', district: 'Райони', market: 'Огляд ринку' },
}

async function loadKb(): Promise<Row[]> {
  const out: Row[] = []
  let from = 0
  const page = 1000
  for (;;) {
    const { data, error } = await sb
      .from('assistant_kb')
      .select('ref_id, kind, slug, title, summary, meta')
      .not('summary', 'is', null)
      .order('kind', { ascending: true })
      .order('ref_id', { ascending: true })
      .range(from, from + page - 1)
    // Ошибка базы — не «пустой корпус»: пусть запрос упадёт, CDN отдаст
    // прошлую версию (stale-while-revalidate), а не обрубок.
    if (error) throw new Error(`assistant_kb: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...(data as Row[]))
    if (data.length < page) break
    from += page
  }
  return out
}

function parseLang(raw: string | null): Lang {
  const l = (raw || 'en').toLowerCase()
  return (LANGS as readonly string[]).includes(l) ? (l as Lang) : 'en'
}

export async function GET(req: Request) {
  const lang = parseLang(new URL(req.url).searchParams.get('lang'))
  const [kbRows, catalog, tr] = await Promise.all([
    loadKb(),
    loadAiCatalog(),
    lang === 'ru' ? Promise.resolve({} as Record<string, { title?: string; summary?: string }>) : loadKbSummaryCache(lang),
  ])
  const deCyr = (s: string) => (lang !== 'ru' && lang !== 'uk' && hasCyrillic(s) ? translitPreserveCase(s) : s)
  const titles = SECTION_TITLE[lang] ?? SECTION_TITLE.en
  const ru = lang === 'ru'

  // Текст из assistant_kb — по id записи, запасной ключ — slug.
  const kbById = new Map<string, Row>()
  const kbBySlug = new Map<string, Row>()
  for (const r of kbRows) {
    kbById.set(`${r.kind}:${r.ref_id}`, r)
    if (r.slug) kbBySlug.set(`${r.kind}:${r.slug}`, r)
  }

  const lines: string[] = []
  if (ru) {
    lines.push('# Balinsky — полный каталог для AI')
    lines.push('')
    lines.push('> Все опубликованные объекты balinsky.info (недвижимость Бали): короткое описание, факты,')
    lines.push('> доходность по расчёту Balinsky, ссылка на страницу и на её текстовую `.md`-версию.')
    lines.push('> Balinsky — информационно-аналитический сайт: объекты не продаёт и в сделках не участвует.')
    lines.push('> Доходность — собственный расчёт Balinsky по аренде похожих объектов рядом (до налогов и для')
    lines.push('> нерезидента). Цифры застройщиков приведены только с пометкой «застройщик заявляет».')
    lines.push(`> Язык: ${lang}. Другие языки: ?lang=${LANGS.join('|')}.`)
  } else {
    lines.push('# Balinsky — full catalogue corpus for AI')
    lines.push('')
    lines.push('> Every published listing on balinsky.info (Bali real estate): a short summary, key facts,')
    lines.push("> Balinsky's own yield estimate, a link to the page and to its clean full-text `.md` view.")
    lines.push('> Balinsky is an information and analytics site: it does not sell property or take part in deals.')
    lines.push("> Yields are Balinsky's own calculation from comparable rentals nearby (before tax and for a")
    lines.push('> non-resident). Developer figures appear only labelled "the developer claims".')
    lines.push(`> Language: ${lang}. Other languages: append ?lang=${LANGS.join('|')}.`)
  }
  if (ru) {
    lines.push('> Смысловой поиск по каталогу: ' + SITE + '/api/llm/search?q=<запрос>&lang=ru')
    lines.push('> Структурированные данные страницы: добавьте `.json` к любому адресу. Оглавление: ' + SITE + '/llms.txt')
  } else {
    lines.push('> Semantic search over this corpus: ' + SITE + '/api/llm/search?q=<your+query>&lang=' + lang)
    lines.push('> Per-page structured data: append `.json` to any URL. Index: ' + SITE + '/llms.txt')
  }
  lines.push('')

  const byKind = new Map<AiKind, AiEntry[]>()
  for (const e of catalog) {
    if (!byKind.has(e.kind)) byKind.set(e.kind, [])
    byKind.get(e.kind)!.push(e)
  }

  for (const kind of ORDER) {
    if (kind === 'district' || kind === 'market') {
      const list = kbRows.filter(r => r.kind === kind)
      // Текст района упоминает объекты — скрытых застройщиков не называем.
      const visible = list.filter(r => !isHiddenDeveloper(String(r.meta?.developer ?? '')))
      if (!visible.length) continue
      lines.push(`## ${titles[kind]} (${visible.length})`)
      lines.push('')
      for (const r of visible) {
        const t = tr[r.ref_id]
        lines.push(`### ${deCyr((t?.title || r.title || '').trim() || r.ref_id)}`)
        const summary = sanitizeAiText(deCyr((t?.summary || r.summary || '').replace(/\s+/g, ' ').trim()))
        if (summary) lines.push(summary)
        lines.push('')
      }
      continue
    }
    const list = byKind.get(kind)
    if (!list || list.length === 0) continue
    lines.push(`## ${titles[kind]} (${list.length})`)
    lines.push('')
    for (const e of list) {
      const kb = kbById.get(`${kind}:${e.id}`) ?? kbBySlug.get(`${kind}:${e.slug}`) ?? null
      const t = kb ? tr[kb.ref_id] : undefined
      const rawTitle = (t?.title || (ru ? kb?.title || e.name : e.nameEn || kb?.title || e.name) || '').trim() || e.slug
      const path = switchLangPath(e.ruPath, lang)
      lines.push(`### ${deCyr(rawTitle.replace(/\s*\|\s*Balinsky\s*$/i, ''))}`)
      lines.push(ru
        ? `${SITE}${path} · текст: ${SITE}${path}.md`
        : `${SITE}${path} · full text: ${SITE}${path}.md`)
      const facts = factsLine(e, lang)
      if (facts) lines.push(deCyr(facts))
      const y = yieldLine(e, lang)
      if (y) lines.push(y)
      const summary = sanitizeAiText(deCyr((t?.summary || kb?.summary || '').replace(/\s+/g, ' ').trim()))
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
