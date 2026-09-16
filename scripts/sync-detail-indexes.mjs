// Build lightweight slug→id+district indexes for villa/apt/complex detail pages.
// Avoids the 21MB raw_villas full-row query that hits Postgres statement timeout.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = 'feeds'
// --dry: собрать индексы и показать сводку, ничего не заливая. Нужно,
// когда меняется правило слагов: сначала смотрим, не уедут ли уже
// проиндексированные адреса, и только потом пишем в storage.
const DRY = process.argv.includes('--dry')

// Slug normalisation, mirrored from lib/slug-normalize.ts. Editors paste
// look-alike characters (cyrillic 'с' for latin 'c', parens, mixed case)
// into Airtable's SEO:Slug, which then leak into URLs and crash GSC's
// crawl path. Normalising here means the index — and therefore every
// outbound link in the catalog — uses the canonical form. The
// alias map below preserves the original ("dirty") slug pointing at
// the same id, so old GSC-cached URLs 301 to the canonical instead
// of 404'ing.
const CYRILLIC_LATIN_LOOKALIKES = {
  'а':'a','А':'a','е':'e','Е':'e','о':'o','О':'o','р':'p','Р':'p',
  'с':'c','С':'c','у':'y','У':'y','х':'x','Х':'x','к':'k','К':'k',
  'м':'m','М':'m','т':'t','Т':'t','в':'b','В':'b','н':'h','Н':'h',
  'і':'i','І':'i','ё':'e','Ё':'e',
}
const RU_TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shh',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function normalizeSlug(raw) {
  if (!raw) return ''
  let s = ''
  for (const ch of raw) s += CYRILLIC_LATIN_LOOKALIKES[ch] ?? ch
  s = s.toLowerCase()
  let t = ''
  for (const ch of s) t += RU_TRANSLIT[ch] ?? ch
  return t.replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

function fs1(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in v) return fs1(v.value)
  return null
}

async function paginated(table) {
  const out = []
  let from = 0
  const STEP = 100
  for (let i = 0; i < 50; i++) {
    const t = Date.now()
    const { data, error } = await sb.from(table).select('airtable_id, data').range(from, from + STEP - 1)
    console.log(`  ${table} ${from}..${from + STEP - 1}: ${data?.length ?? 0} rows, ${Date.now() - t}ms${error ? ` err=${error.message}` : ''}`)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < STEP) break
    from += STEP
  }
  return out
}

// Build the published index: each entry is keyed by the canonical
// (normalised) slug and points to its id + district. We also collect
// any "alias" slugs — the dirty originals that GSC has indexed —
// pointing to the same id, so the detail page can 301 from old to new.
function buildEntry(rawSlug, id, district) {
  const canonical = normalizeSlug(rawSlug)
  if (!canonical || canonical.startsWith('-')) return null
  const aliases = []
  if (rawSlug && rawSlug !== canonical) aliases.push(rawSlug)
  return { id, slug: canonical, district, ...(aliases.length ? { aliases } : {}) }
}

// Зеркало lib/villa-slug.ts assignVillaSlugs — держать в синхроне.
// Слаг виллы («проект + площадь + спальни») не уникален: шесть одинаковых
// по планировке юнитов одного проекта делят один адрес, и пять из шести
// остаются без страницы. Первый в группе (по Name) оставляет голый слаг —
// он уже проиндексирован, — остальные получают -2, -3.
function assignVillaSlugs(rows) {
  const groups = new Map()
  for (const r of rows) {
    const base = normalizeSlug(r.slug ?? '')
    if (!base || base.startsWith('-')) continue
    const g = groups.get(base)
    if (g) g.push(r); else groups.set(base, [r])
  }
  const taken = new Set(groups.keys())
  const out = new Map()
  for (const [base, group] of [...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (group.length === 1) { out.set(group[0].id, base); continue }
    const ordered = [...group].sort((a, b) =>
      String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    out.set(ordered[0].id, base)
    let n = 2
    for (const r of ordered.slice(1)) {
      let candidate = `${base}-${n}`
      while (taken.has(candidate)) candidate = `${base}-${++n}`
      taken.add(candidate)
      out.set(r.id, candidate)
      n++
    }
  }
  return out
}

async function buildVillaIndex() {
  console.log('▶ villas')
  const rows = await paginated('raw_villas')
  const published = rows.filter(r => r.data?.['Опубликовать'] === true)
  const slugById = assignVillaSlugs(published.map(r => ({
    id: r.airtable_id, slug: fs1(r.data['SEO:Slug']), name: fs1(r.data['Name']),
  })))
  const out = []
  let dirtied = 0
  let suffixed = 0
  for (const r of published) {
    const slug = slugById.get(r.airtable_id)
    if (!slug) continue
    const raw = fs1(r.data['SEO:Slug'])
    const e = buildEntry(raw, r.airtable_id, fs1(r.data['Location 2']) ?? fs1(r.data['Location']))
    if (!e) continue
    if (e.slug === slug) {
      // Голый слаг остался за этим юнитом: «грязный» оригинал из Airtable
      // по-прежнему ведёт сюда 301-м.
      if (e.aliases) dirtied++
    } else {
      // Юнит разведён суффиксом. Алиас на сырой слаг отдавать нельзя —
      // он принадлежит первому юниту группы, и один адрес резолвился бы
      // в два разных объекта в зависимости от порядка поиска.
      e.slug = slug
      delete e.aliases
      suffixed++
    }
    out.push(e)
  }
  console.log(`  published with slug: ${out.length} (normalised ${dirtied}, разведено суффиксом ${suffixed})`)
  return out
}

async function buildApartmentIndex() {
  console.log('▶ apartments')
  const rows = await paginated('raw_apartments')
  const out = []
  let dirtied = 0
  let aliased = 0
  for (const r of rows) {
    if (r.data?.['Опубликовать'] !== true) continue
    const slug = fs1(r.data['SEO:Slug'])
    if (!slug) continue
    const e = buildEntry(slug, r.airtable_id, fs1(r.data['Location filter']))
    if (!e) continue
    if (e.aliases) dirtied++
    // sync-apartments-data appends -N to every slug; the previous
    // un-suffixed slug lives in `_slug_alias`. Push it as an alias so
    // any inbound link to the old URL 301-redirects via the detail
    // page's resolveApartment alias lookup.
    const alias = fs1(r.data['_slug_alias'])
    if (alias && alias !== e.slug) {
      e.aliases = [...(e.aliases ?? []), alias]
      aliased++
    }
    out.push(e)
  }
  console.log(`  published with slug: ${out.length} (normalised ${dirtied}, with -N alias ${aliased})`)
  return out
}

async function buildComplexIndex() {
  console.log('▶ complexes')
  const { data, error } = await sb.from('raw_complexes').select('airtable_id, slug, data').limit(500)
  if (error) throw error
  const out = []
  let dirtied = 0
  for (const r of (data ?? [])) {
    if (!r.slug) continue
    const e = buildEntry(r.slug, r.airtable_id, fs1(r.data?.['Location 2']) ?? fs1(r.data?.['Location']))
    if (!e) continue
    if (e.aliases) dirtied++
    out.push(e)
  }
  console.log(`  with slug: ${out.length} (normalised ${dirtied})`)
  return out
}

const villas = await buildVillaIndex()
const apartments = await buildApartmentIndex()
const complexes = await buildComplexIndex()

for (const [name, items] of [['villas', villas], ['apartments', apartments], ['complexes', complexes]]) {
  const body = JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })
  const key = `_${name}-index.json`
  if (DRY) {
    const slugs = items.map(i => i.slug)
    const uniq = new Set(slugs)
    console.log(`· ${key}: ${items.length} записей, ${uniq.size} уникальных адресов${slugs.length === uniq.size ? '' : ' ← ДУБЛИ'} (${(body.length / 1024).toFixed(1)} KB, не залито)`)
    continue
  }
  const { error } = await sb.storage.from(BUCKET).upload(key, body, { contentType: 'application/json', upsert: true })
  if (error) throw error
  console.log(`✓ uploaded ${BUCKET}/${key} (${(body.length / 1024).toFixed(1)} KB)`)
}
